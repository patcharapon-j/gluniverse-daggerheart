/* Vendored from design/ember.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/ember.js and re-run `node scripts/port-design-js.mjs`. */
// Embers — the Fear pool's traffic with the board.
//
// The strip is docked above the map and the map is where Fear comes from and
// where it goes. A GM gains Fear because something happened down there — a
// player rolled with Fear, a rest let the dark in — and spends it to make
// something happen down there. Until now the pool changed in place, a pip
// lighting at the far end of a 500px object, and the table had to be told
// that the two were connected. This draws the connection: on a gain, embers
// rise off the board and are pulled into the new socket; on a spend, the pip
// cracks and what was in it falls back into the board as smoke.
//
// ── what it is and is not ─────────────────────────────────────────────
//
// A Canvas 2D layer hung off the strip, click-through, drawn ONLY while a
// particle is alive. There is no loop at rest and no WebGL: the spotlight
// already owns one context beside PIXI's, and a third shader on Windows is
// the ANGLE compile freeze CLAUDE.md records. Thirty additive dots and a few
// soft puffs a second are the whole budget, so this is cheap by construction
// rather than by tuning.
//
// It is presentation only. The pool's number is written by `setFearHud`
// immediately — `data-cur` is the record — and the only thing embers move is
// *when the strip draws it*: a gain lands on impact, about half a second
// after the press, because a pip that lights before the light reaches it is
// the effect arriving after its own cause. The press is still answered at
// 0ms, by the embers leaving the board.
//
// Reduced motion, or a client with no 2D canvas, gets none of this and the
// strip changes in place exactly as it did before. That fallback is the
// component, not a degraded copy of it.

/** How long a gain's embers take to reach the socket. The pip lands then. */
export const ARRIVE = 520;

/* The canvas overhangs the strip: a little either side so a converging path
   can bow outward, and a long way below because that is where the board is.
   Above is Foundry's top edge and there is nothing up there to come from. */
const PAD_X = 90, PAD_TOP = 26, BELOW = 320;
const SPRITE = 96;   // glow sprite radius in pixels; a radial falloff has no detail to lose when a big shock stretches it

const still = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const rand = (a, b) => a + Math.random() * (b - a);
const ease = t => t * t * (2.2 - 1.2 * t);   // accelerates into the socket, settles the last few px

/** The engine for one strip, made on first use and kept on the element. */
function engine(strip) {
  if (strip.__ember) return strip.__ember;
  const cv = document.createElement('canvas');
  cv.className = 'hember';
  cv.setAttribute('aria-hidden', 'true');
  const g = cv.getContext('2d');
  if (!g) return (strip.__ember = null);
  strip.append(cv);

  const parts = [];
  let raf = 0, last = 0, w = 0, h = 0, dpr = 1;

  /* Sized on every burst rather than once: the strip's width moves with the
     players' build and with a font arriving late, and a canvas measured on
     the first frame would clip a path that needed the extra pixels. */
  const fit = () => {
    dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    w = strip.offsetWidth + PAD_X * 2;
    h = strip.offsetHeight + PAD_TOP + BELOW;
    const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (cv.width !== pw || cv.height !== ph) {
      cv.width = pw; cv.height = ph;
      cv.style.width = `${w}px`; cv.style.height = `${h}px`;
    }
  };

  /** A pip's centre in canvas pixels. */
  const at = gem => {
    const r = gem.getBoundingClientRect(), s = strip.getBoundingClientRect();
    return { x: r.left - s.left + r.width / 2 + PAD_X, y: r.top - s.top + r.height / 2 + PAD_TOP };
  };

  /* A glow is a radial gradient, and building one per particle per frame
     was most of what a burst cost: forty embers with trails is several
     hundred gradient objects a second, each allocated and thrown away. Every
     stop here is linear in alpha, so one sprite per colour pair, drawn at
     the particle's size with globalAlpha, is the same pixels for a drawImage.
     Most glows are smaller than the sprite; the few that are larger (a heavy
     spend's shock) are a smooth falloff, which stretches without banding. */
  const sprites = new Map();
  const sprite = (key, stops) => {
    let s = sprites.get(key);
    if (s) return s;
    s = document.createElement('canvas');
    s.width = s.height = SPRITE * 2;
    const sg = s.getContext('2d');
    const grd = sg.createRadialGradient(SPRITE, SPRITE, 0, SPRITE, SPRITE, SPRITE);
    for (const [at, c] of stops) grd.addColorStop(at, c);
    sg.fillStyle = grd; sg.fillRect(0, 0, SPRITE * 2, SPRITE * 2);
    sprites.set(key, s);
    return s;
  };
  const blit = (img, x, y, r, a) => {
    if (a <= 0 || r <= 0) return;
    g.globalAlpha = Math.min(1, a);
    g.drawImage(img, x - r, y - r, r * 2, r * 2);
    g.globalAlpha = 1;
  };
  const glow = (x, y, r, core, rim, a) =>
    blit(sprite(core + rim, [[0, `rgb(${core})`], [.35, `rgba(${rim},.7)`], [1, `rgba(${rim},0)`]]), x, y, r, a);

  const frame = now => {
    /* Clamped, because a tab that stopped painting mid-burst comes back with
       a dt of minutes and every particle would skip straight to its end. */
    const dt = Math.min(.05, (now - last) / 1000 || 0);
    last = now;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k];
      p.age += dt;
      if (p.age < 0) continue;                       // staggered, not yet born
      if (p.age >= p.life) { parts.splice(k, 1); continue; }
      p.kind === 'rise' ? rise(p) : p.kind === 'smoke' ? smoke(p, dt) : p.kind === 'ring' ? ring(p) : p.kind === 'shard' ? shard(p, dt)
        : p.kind === 'shock' ? shock(p) : spark(p, dt);
    }
    if (parts.length) raf = requestAnimationFrame(frame);
    else { raf = 0; g.clearRect(0, 0, w, h); }
  };

  /* A gain's ember: a quadratic path from the board to the socket, eased so
     it is pulled in rather than thrown. It carries a short trail of its own
     past positions, which is the streak that reads as speed. */
  function rise(p) {
    const t = ease(Math.min(1, p.age / p.life));
    const u = 1 - t;
    const x = u * u * p.x0 + 2 * u * t * p.cx + t * t * p.x1;
    const y = u * u * p.y0 + 2 * u * t * p.cy + t * t * p.y1;
    p.trail.push(x, y); if (p.trail.length > 14) p.trail.splice(0, 2);
    g.globalCompositeOperation = 'lighter';
    const a = Math.min(1, p.age / .12) * (.55 + .45 * t);
    g.lineCap = 'round';
    for (let i = 2; i < p.trail.length; i += 2) {
      g.strokeStyle = `rgba(184,146,250,${(i / p.trail.length) * a * .8})`;
      g.lineWidth = p.r * (i / p.trail.length) * 2.2;
      g.beginPath(); g.moveTo(p.trail[i - 2], p.trail[i - 1]); g.lineTo(p.trail[i], p.trail[i + 1]); g.stroke();
    }
    glow(x, y, p.r * (4.2 + 2.6 * t), '250,246,255', '156,108,240', a);
  }

  /* The socket being struck: one ring that widens and thins as it goes.
     The only thing here drawn as a stroke rather than a glow, because an
     impact has an edge and a spark does not. */
  function ring(p) {
    const k = p.age / p.life, e = 1 - (1 - k) ** 3;
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(214,190,255,${(1 - k) * .9})`;
    g.lineWidth = 3 * (1 - k) + .5;
    g.beginPath(); g.arc(p.x, p.y, 6 + 26 * e, 0, Math.PI * 2); g.stroke();
    glow(p.x, p.y, 22 * (1 - k * .5), '255,250,255', '150,104,235', (1 - k) ** 2 * .9);
  }

  /* ── the shatter ──────────────────────────────────────────────────
     A GM spending Fear is the moment the table has been dreading, and the
     pip does not go out — it breaks. Each one is cut into shards of its own
     glass: a lit violet face with a hot edge that catches the light as it
     turns, thrown down across the board under gravity and spinning, so the
     Fear the GM just spent visibly lands *on the map*, which is where it is
     about to happen. Drawn as polygons rather than glows because a shard has
     an edge and an ember does not, and the edge is what reads as broken. */
  function shard(p, dt) {
    p.vx *= 1 - 1.1 * dt; p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
    /* The canvas ends somewhere over the map and nothing may be seen to hit
       that line: a shard fades as it nears any edge, so it reads as falling
       out of the light rather than being cut off by a box nobody can see. */
    const edge = Math.max(0, Math.min(1, (h - 16 - p.y) / 90, p.x / 50, (w - p.x) / 50));
    const k = p.age / p.life, a = (1 - k ** 3) * p.a * edge;
    const c = Math.cos(p.rot), sn = Math.sin(p.rot);
    g.globalCompositeOperation = 'source-over';
    g.beginPath();
    for (let i = 0; i < p.pts.length; i += 2) {
      const px = p.pts[i] * p.s, py = p.pts[i + 1] * p.s;
      const X = p.x + px * c - py * sn, Y = p.y + px * sn + py * c;
      i ? g.lineTo(X, Y) : g.moveTo(X, Y);
    }
    g.closePath();
    /* The face darkens as it falls — the light was the pool's, and this has
       left it — while the edge glints on the half-turn it faces upward. */
    const lit = .5 + .5 * Math.abs(Math.sin(p.rot * 1.3));
    g.fillStyle = `rgba(${Math.round(150 - 70 * k)},${Math.round(104 - 50 * k)},${Math.round(232 - 90 * k)},${a})`;
    g.fill();
    g.strokeStyle = `rgba(238,226,255,${a * (.35 + .65 * lit) * (1 - k * .6)})`;
    g.lineWidth = 1;
    g.stroke();
  }

  /* The strike. One wide, flattened ring off the broken pips — wider for a
     bigger spend, and for three or more it spans the whole strip, because
     the whole pool took the blow. Additive and fast: it is the crack you
     hear, and it is gone before the shards have finished falling. */
  function shock(p) {
    const k = p.age / p.life, e = 1 - (1 - k) ** 3;
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(196,160,255,${(1 - k) ** 1.5 * .85})`;
    g.lineWidth = 2 + 5 * (1 - k);
    g.beginPath();
    g.ellipse(p.x, p.y, 10 + p.rx * e, 6 + p.ry * e, 0, 0, Math.PI * 2);
    g.stroke();
    glow(p.x, p.y, (14 + p.rx * .45) * (1 - k * .4), '255,248,255', '130,80,220', (1 - k) ** 2 * .7);
  }

  /* Loose sparks: the burst at a socket a gain lands in, the scatter of a
     cracked pip, the occasional shed of a full pool. Gravity pulls them down
     toward the board, drag keeps them from leaving the frame. */
  function spark(p, dt) {
    p.vx *= 1 - 2.2 * dt; p.vy = p.vy * (1 - 1.6 * dt) + p.grav * dt;
    p.x += p.vx * dt + Math.sin(p.age * p.sw + p.ph) * p.sway * dt; p.y += p.vy * dt;
    const k = p.age / p.life;
    g.globalCompositeOperation = 'lighter';
    glow(p.x, p.y, p.r * (3.4 - 1.2 * k), '246,238,255', '146,98,234', (1 - k * k) * p.a);
  }

  /* What a spent pip leaves: soft violet-grey that widens as it sinks. Normal
     compositing rather than additive — smoke takes light away, which is the
     whole difference between a spend and a gain. */
  function smoke(p, dt) {
    p.x += p.vx * dt + Math.sin(p.age * 2.1 + p.ph) * 6 * dt; p.y += p.vy * dt; p.vy *= 1 - .6 * dt;
    const k = p.age / p.life;
    g.globalCompositeOperation = 'source-over';
    const r = p.r * (1 + 2.8 * k);
    const a = Math.sin(Math.PI * Math.min(1, k * 1.15)) * p.a;
    blit(sprite('smoke', [[0, 'rgb(128,108,168)'], [.55, 'rgba(84,68,120,.5)'], [1, 'rgba(40,30,60,0)']]), p.x, p.y, r, a);
  }

  const run = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  const burst = (x, y, n, up) => {
    for (let i = 0; i < n; i++) {
      const ang = rand(0, Math.PI * 2), sp = rand(70, up ? 190 : 130);
      parts.push({ kind: 'spark', age: -rand(0, .04), life: rand(.45, .8), x, y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - (up ? 40 : 0), grav: up ? 90 : 170,
        r: rand(1.3, 2.3), a: 1, sway: 0, sw: 0, ph: 0 });
    }
  };

  return strip.__ember = {
    /** Embers off the board into each of these pips. */
    gain(gems) {
      if (!gems.length) return;
      fit();
      const per = Math.max(5, Math.round(20 / gems.length));
      for (const [n, gem] of gems.entries()) {
        const { x: x1, y: y1 } = at(gem);
        for (let i = 0; i < per; i++) {
          const x0 = rand(PAD_X * .5, w - PAD_X * .5);
          const y0 = rand(h - BELOW * .82, h - 18);
          const life = rand(.4, .52);
          /* Delay + life never exceeds ARRIVE for the first of each pip, so
             the socket is lit by the time the bulk of its embers land in it,
             and the stragglers read as the pip still being fed. */
          parts.push({ kind: 'rise', age: -(n * .05 + rand(0, .16)), life,
            x0, y0, x1, y1, cx: (x0 + x1) / 2 + rand(-110, 110), cy: Math.min(y0, y1) + rand(10, 90),
            r: rand(1.5, 2.6), trail: [] });
        }
      }
      run();
    },
    /** The flash at a socket the embers have just reached. */
    land(gems) {
      if (!gems.length) return;
      fit();
      for (const gem of gems) {
        const { x, y } = at(gem);
        parts.push({ kind: 'ring', age: 0, life: .5, x, y });
        burst(x, y, 12, true);
      }
      run();
    },
    /** A pip cracks: a scatter, then smoke and one ember falling into the board. */
    spend(gems) {
      if (!gems.length) return;
      fit();
      /* How hard the pool was struck: one Fear is a jolt, three or more is
         an event. Everything below scales on it — shard count and speed,
         the shock's span — so the size of the moment is the size of the
         spend, and a GM paying one Fear for a reaction does not shake the
         table the way four for a boss's ultimate does. */
      const heft = Math.min(1, gems.length / 3);
      const pts = gems.map(at);
      const cx = pts.reduce((v, q) => v + q.x, 0) / pts.length;
      const sy = pts[0].y;
      const span = (pts[pts.length - 1].x - pts[0].x) / 2;
      parts.push({ kind: 'shock', age: 0, life: .42 + .22 * heft, x: cx, y: sy,
        rx: 60 + span + 220 * heft * heft, ry: 22 + 26 * heft });
      for (const [n, { x, y }] of pts.entries()) {
        const many = Math.round(8 + 6 * heft);
        for (let i = 0; i < many; i++) {
          /* A shard is a sliver of the diamond: three or four points on a
             unit diamond, jittered, so no two pieces are the same cut. */
          const sides = Math.random() < .6 ? 3 : 4, pts2 = [];
          const a0 = rand(0, Math.PI * 2);
          for (let j = 0; j < sides; j++) {
            const ang = a0 + (j / sides) * Math.PI * 2 + rand(-.5, .5), rr = rand(.45, 1);
            pts2.push(Math.cos(ang) * rr, Math.sin(ang) * rr);
          }
          /* Thrown mostly down and out — toward the board — with a few kicked
             up off the top edge, because a struck pane does not break politely. */
          const ang = Math.random() < .2 ? rand(-Math.PI * .9, -Math.PI * .1) : rand(Math.PI * .08, Math.PI * .92);
          const sp = rand(90, 200) * (1 + .5 * heft);
          parts.push({ kind: 'shard', age: -(n * .03 + rand(0, .03)), life: rand(.9, 1.4) + .25 * heft,
            x: x + rand(-4, 4), y: y + rand(-4, 4), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
            rot: rand(0, 6.3), spin: rand(-14, 14), s: rand(2.6, 5.4) * (1 + .3 * heft), pts: pts2, a: rand(.75, 1) });
        }
        burst(x, y, 8, false);
        parts.push({ kind: 'spark', age: 0, life: rand(1.5, 1.9), x, y, vx: rand(-14, 14), vy: rand(-60, -40),
          grav: 130, r: 3.4, a: 1, sway: 26, sw: rand(3, 4.5), ph: rand(0, 6) });
        for (let i = 0; i < 6; i++) {
          parts.push({ kind: 'smoke', age: -i * .07, life: rand(1.2, 1.7), x: x + rand(-5, 5), y: y + rand(0, 6),
            vx: rand(-16, 16), vy: rand(36, 70), r: rand(6, 10), a: rand(.34, .46), ph: rand(0, 6) });
        }
      }
      run();
    },
    /** One or two sparks off a full pool. Not a loop — `shed` schedules it. */
    shed(gems) {
      if (!gems.length) return;
      fit();
      const n = Math.random() < .35 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const { x, y } = at(gems[Math.floor(Math.random() * gems.length)]);
        parts.push({ kind: 'spark', age: -i * .3, life: rand(1.6, 2.3), x: x + rand(-5, 5), y: y + 6,
          vx: rand(-8, 8), vy: rand(4, 14), grav: 36, r: rand(1.8, 2.6), a: .95, sway: 16, sw: rand(2, 3), ph: rand(0, 6) });
      }
      run();
    },
  };
}

/** Whether this client draws embers at all. Asked on every change, never cached. */
export const embersOn = strip =>
  !still() && typeof document !== 'undefined' && !!engine(strip);

const gemsOf = strip => [...strip.querySelectorAll('.gems .gem')];

export const emberGain = (strip, from, to) => engine(strip)?.gain(gemsOf(strip).slice(from, to));
export const emberLand = (strip, from, to) => engine(strip)?.land(gemsOf(strip).slice(from, to));
export const emberSpend = (strip, from, to) => engine(strip)?.spend(gemsOf(strip).slice(from, to));

/* ── a full pool smoulders ────────────────────────────────────────────
   At twelve, and only at twelve, the strip drops a spark every few seconds.
   The pool has nowhere left to go, so it spills — which is the one idle
   motion here, and it earns it the way the Fear pips' breath does: dread
   sitting in the room between the moments anybody touches it. A timer
   rather than a loop, so the canvas is still idle between sparks, and it
   stops itself the moment the strip leaves the document or the pool drops. */
export function smoulder(strip, max) {
  if (strip.__smoulder) return;
  const tick = () => {
    strip.__smoulder = 0;
    if (!strip.isConnected || Number(strip.dataset.shown) !== max || still()) return;
    if (!document.hidden) engine(strip)?.shed(gemsOf(strip));
    strip.__smoulder = setTimeout(tick, rand(2600, 5200));
  };
  strip.__smoulder = setTimeout(tick, rand(900, 1800));
}
