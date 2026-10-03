/**
 * Draws the two campaign decks' foil weaves: one seamlessly tileable SVG mask
 * each, into design/assets/foil/.
 *
 * Same bargain as tools/make-marked-motifs.mjs, and the same reason for it.
 * A seamless tile is arithmetic a person is bad at twice over: every shape
 * that crosses an edge has to exist again on the opposite edge at exactly the
 * tile's pitch, and a tapered filament is a polygon offset along a curve's own
 * normals. Hand-plotting either one gives you a pattern with a visible grid of
 * seams in it, which is the one failure a tiled texture cannot survive.
 *
 * Seamlessness is bought by construction rather than by care: the drawing is
 * emitted once into <defs> and stamped nine times at (-P, 0, +P)², and the
 * viewBox clips. So a filament running off the right edge is the same filament
 * arriving on the left, by identity rather than by matching two curves up.
 *
 * Both files are masks — white only, opacity is the drawing — so design/foil.css
 * supplies the metal, the hue and the light, exactly as marked.css does for the
 * motifs. One drawing therefore serves the dark art, the light plate, the
 * compact card and the vault strip.
 *
 * NO DENSITY GRADIENT, in either tile, and it is worth stating because the
 * first draft of Root had one. A tile whose ink thickens toward its lower edge
 * tiles into horizontal bands at the pitch, and the bands read as a defect in
 * the card rather than as a texture on it. Where the foil needs to be brighter
 * in one place than another, the stylesheet's falloff mask does it — over the
 * whole card, where there is no pitch to beat against.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const P = 120; // the tile's pitch, in its own units
const OUT = process.argv[2] ?? ".";

/* A seeded generator, so a re-run produces the same two files. mulberry32. */
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r2 = (n) => Math.round(n * 100) / 100;
const at = ([x, y]) => `${r2(x)} ${r2(y)}`;
const polygon = (pts) => `M${pts.map(at).join("L")}Z`;

function cubic(p0, p1, p2, p3, steps = 20) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    const k = (j) =>
      u * u * u * p0[j] + 3 * u * u * t * p1[j] + 3 * u * t * t * p2[j] + t * t * t * p3[j];
    return [k(0), k(1)];
  });
}

/** A stroke along `points` whose half-width runs start → middle → end. */
function tapered(points, start, middle, end) {
  const left = [];
  const right = [];
  const last = points.length - 1;
  points.forEach(([x, y], i) => {
    const t = i / last;
    const [ax, ay] = points[Math.max(0, i - 1)];
    const [bx, by] = points[Math.min(last, i + 1)];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const [dx, dy] = [(bx - ax) / len, (by - ay) / len];
    const w = (1 - t) * (1 - t) * start + 2 * t * (1 - t) * middle + t * t * end;
    left.push([x - dy * w, y + dx * w]);
    right.push([x + dy * w, y - dx * w]);
  });
  return polygon([...left, ...right.reverse()]);
}

const circle = (cx, cy, rad) =>
  `M${r2(cx - rad)} ${r2(cy)}a${r2(rad)} ${r2(rad)} 0 1 0 ${r2(2 * rad)} 0a${r2(rad)} ${r2(rad)} 0 1 0 ${r2(-2 * rad)} 0Z`;

function star(cx, cy, rad, points, inner) {
  return polygon(
    Array.from({ length: points * 2 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / points;
      const d = i % 2 ? rad * inner : rad;
      return [cx + Math.cos(a) * d, cy + Math.sin(a) * d];
    }),
  );
}

/* ── ROOT · hunger and the dreaming root ──────────────────────────────
   Tapered filaments that fork and curl back on themselves, with a closed bud
   at each fork. The curl is the whole character of it: a root that only
   branched would read as a circuit diagram, and the thing the blurb is about
   is growth that keeps reaching rather than growth that arrives.

   Isotropic on purpose, and placed off a seeded jitter rather than off a
   lattice — a lattice of organic shapes is the worst of both, because the eye
   finds the grid first and then the shapes look like they are failing to be
   one. */
/**
 * A filament that grows and curls: stepped forward one short pace at a time,
 * turning a little harder on each pace and stepping a little shorter.
 *
 * It is written as an integration rather than as a cubic, and that is the
 * drawing rather than a preference. A root's shape is that its curvature
 * *increases* toward the tip, so the tip closes into a crozier; a cubic's
 * curvature is whatever its four points happened to imply, and the first
 * version of this file used one and produced a tile of hockey sticks.
 */
function filament(x, y, dir, steps, pace, turn, sign) {
  const pts = [[x, y]];
  let a = dir;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    a += sign * turn * Math.pow(t, 1.4);
    const p = pace * (1 - 0.45 * t);
    const [px, py] = pts[i - 1];
    pts.push([px + Math.cos(a) * p, py + Math.sin(a) * p]);
  }
  return pts;
}

function root() {
  const rand = rng(0x526f6f74);
  const out = [];
  const span = (a, b) => a + rand() * (b - a);

  /* Thirteen filaments. Each starts anywhere in the tile, so most cross an
     edge and get stitched by the nine stamps — and they are long enough
     relative to the pitch that they overlap each other, which is the
     difference between a tangle and a scatter. */
  for (let i = 0; i < 13; i++) {
    const x = span(0, P);
    const y = span(0, P);
    const dir = span(0, Math.PI * 2);
    const sign = rand() < 0.5 ? 1 : -1;
    const stem = filament(x, y, dir, 16, span(3.4, 4.4), span(0.17, 0.26), sign);
    out.push(tapered(stem, 1.9, 1.2, 0.26));

    /* Two rootlets off the stem, each curling the *other* way, so the three
       of them close a cell between them instead of fanning apart. */
    for (const [frac, side] of [[0.3, -sign], [0.55, sign]]) {
      const k = Math.round(stem.length * frac);
      const [fx, fy] = stem[k];
      const [bx, by] = stem[k - 1];
      const base = Math.atan2(fy - by, fx - bx);
      const child = filament(fx, fy, base + side * span(0.7, 1.1), 10,
        span(2.4, 3.2), span(0.22, 0.34), side);
      out.push(tapered(child, 0.95, 0.65, 0.18));
      /* A closed bud at the fork. The blurb's root is hungry rather than
         flowering, so these stay shut. */
      out.push(circle(fx, fy, span(1.2, 1.9)));
    }
  }
  return out.join("");
}

/* ── VOID · unmaking and cold arithmetic ─────────────────────────────
   The opposite idea drawn with the same pen. An exact 6 × 6 lattice of needle
   rays between nodes, a four-pointed star at each node — and a seeded quarter
   of the lattice simply deleted, nodes and the rays that reached them, so the
   pattern reads as a calculation with terms removed rather than as a grid with
   holes punched in it.

   The deletion is what makes this Void and not a graticule. A regular lattice
   is cold but it is not *subtractive*; the absences are the drawing, and they
   have to be absences of whole terms (a node and everything that joined it)
   or they read as damage. */
function voidTile() {
  const rand = rng(0x566f6964);
  const N = 5;
  const step = P / N;
  const out = [];

  /* Which nodes survive. Indexed modulo N, so the decision is the same on both
     sides of every edge and the lattice meets itself. */
  const alive = [];
  for (let i = 0; i < N; i++) {
    alive[i] = [];
    for (let j = 0; j < N; j++) alive[i][j] = rand() > 0.26;
  }
  const on = (i, j) => alive[((i % N) + N) % N][((j % N) + N) % N];

  for (let i = -1; i <= N; i++) {
    for (let j = -1; j <= N; j++) {
      if (!on(i, j)) continue;
      const cx = i * step;
      const cy = j * step;
      out.push(star(cx, cy, 5.4, 4, 0.22));
      /* A ray to the neighbour east and the neighbour south, and only where
         both terms survive: a ray into a deleted node is a line to nowhere. */
      if (on(i + 1, j)) {
        out.push(tapered(
          [[cx + 6, cy], [cx + step / 2, cy], [cx + step - 6, cy]], 0.3, 0.8, 0.3));
      }
      if (on(i, j + 1)) {
        out.push(tapered(
          [[cx, cy + 6], [cx, cy + step / 2], [cx, cy + step - 6]], 0.3, 0.8, 0.3));
      }
      /* The node's own absence, inside it: a pinprick the ring of the star
         does not fill, so even a surviving term has something taken out. */
      out.push(circle(cx, cy, 1.05));
    }
  }
  return out.join("");
}

/* The nine stamps. `use` rather than nine copies of the path data, which
   is the difference between a 6KB file and a 54KB one. */
const sheet = (name, body, note) => {
  const uses = [];
  for (const dx of [-P, 0, P]) {
    for (const dy of [-P, 0, P]) {
      uses.push(`<use href="#t" x="${dx}" y="${dy}"/>`);
    }
  }
  return (
    `<!-- GENERATED by tools/make-foil-tiles.mjs — do not edit by hand.\n` +
    `     ${note}\n` +
    `     A seamless ${P}×${P} tile and a mask: white only, opacity is the\n` +
    `     drawing, and design/foil.css supplies the metal, the hue and the\n` +
    `     light. Emitted once in <defs> and stamped nine times at the tile's\n` +
    `     own pitch, so the edges meet by identity rather than by matching. -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${P} ${P}" fill="#fff">\n` +
    `  <defs><path id="t" d="${body}"/></defs>\n  ` +
    uses.join("") +
    `\n</svg>\n`
  );
};

mkdirSync(OUT, { recursive: true });
const files = {
  "root.svg": sheet("root", root(), "Root · a tangle of tapered filaments, forking and curling back."),
  "void.svg": sheet("void", voidTile(), "Void · an exact lattice of needle rays with a quarter of its terms deleted."),
};
for (const [name, text] of Object.entries(files)) {
  writeFileSync(join(OUT, name), text);
  console.log(`${name.padEnd(10)} ${Buffer.byteLength(text)} bytes`);
}
