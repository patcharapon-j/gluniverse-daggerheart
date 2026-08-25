/* Vendored from design/token.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/token.js and re-run `node scripts/port-design-js.mjs`. */
// The token chip — a creature's tracks, on the creature.
//
// Three readings were drawn and one won. `marks` — the sheet's row with
// its empty boxes removed — read lopsided, because a centred row filled
// from the left puts 5-of-12 visibly off-centre, and it sat on the
// artwork after all: the circle is inscribed in the square, so the bottom
// band at *centre* is still the painting and only the corners are free.
// `rule` was tidy and read as a health bar, which is the one thing this
// component exists not to be.
//
// The ring won because the circumference is about three times the width,
// so a fourteen-unit track finally has room to be fourteen things, and
// because it is the shape a token actually is.
//
// ── the gauge ────────────────────────────────────────────────────
// Every track shares one origin and one direction: they start at 210°,
// lower-left, and run clockwise up over the top to lower-right. That
// leaves a 60° opening at six o'clock which is not waste — it is the slot
// where Hope sits on a character and Difficulty on an adversary. The
// rings open for the thing the creature spends.
//
// Radially, outermost first: Armor, then Hit Points, then Stress. That
// order is the rule — armour is what stands between a hit and your Hit
// Points, so it stands outside them.
//
// ── Armor is not a ring ──────────────────────────────────────────
// It is two or three slots on most characters and can be six, and a full
// circle divided into two is not a track, it is a pie chart. So Armor
// runs along the circle at a FIXED angular pitch and stops when it runs
// out: three slots is 51° of arc, six is 102°. The arc's length is the
// capacity, which a full ring can never say.
//
// The pitch was 13° and is 17°, which is the same correction as Armor's
// band going from the narrowest of the three to the widest. A slot here
// is not one of twelve on a full ring, it is one of three on a run that
// stops -- so it is both the shortest mark on the chip and the only one
// whose LENGTH is carrying information. Nine degrees of arc could not
// do that job.
//
// ── Hope is gems ─────────────────────────────────────────────────
// Not a ring and not a variant of one. Hope is gold diamonds everywhere
// else in this system and a token is not where that gets re-taught, so
// it is gem.js's own GEM — but placed by ANGLE on the tracks' own circle,
// tilting with it, filling the 60° the rings leave open at six o'clock. A
// straight row under a ring is a caption below a gauge, and Hope is not a
// caption: it is the fourth thing the creature carries.
//
// ── Armor reads the other way round ──────────────────────────────
// Hit Points and Stress are things that happen TO you and the lit run is
// the damage. Armor is a purse, so it lights what is LEFT and goes dark as
// it is spent — see litOf.
//
// The markup is rendered ONCE and every later change is diffed into it.
// Nothing here holds a copy of a number.

import { GEM, setPool } from './gem.js';

/* ══ the ring, and the room it takes ═════════════════════════
   Every radius in token.css is written against one assumption: the
   creature ends at the grid cell's own circle. A dynamic token ring
   breaks it, and so does a token whose artwork is scaled, and when it
   breaks the chip is drawn ON the painting it exists to stay off.

   The arithmetic is here because it is arithmetic. Which of the two fit
   modes is on, and what this token's scales are, is a question about
   Foundry and belongs to token-hud.ts; what those answers MEAN in radii
   is a question about this component and belongs beside the radii. The
   study page calls the same function with numbers it makes up, which is
   the only way a study page can see any of this at all.

   ── the two numbers, and where they come from ──────────────
   Not measured and not guessed. Foundry PUBLISHES the ring texture's
   own proportions, in the spritesheet beside the artwork:

       rings-steel.json  defaultColorBand: {startRadius: .666,
                                            endRadius: .7225}

   startRadius is where the subject's hole ends and the visible band
   begins; endRadius is where the band stops. (The .666 is the same
   number TokenRing carries as its default subject thickness, which is
   the check that these two readings are one reading.)

   The two fit modes are then two normalisations of that one texture,
   which is why one constant answers both and they are reciprocals:

     subject fit  the hole is matched to the cell, so the band's rim
                  lands .7225/.666 = 1.0848 cells out. The readout has
                  to start beyond THAT, not beyond the cell -- and 1.0848
                  of 50 is 54.2, which is very nearly exactly where the
                  chip's innermost track used to begin. The two were
                  drawn on top of each other.
     grid fit     the rim is matched to the cell, so the hole stops at
                  .666/.7225 = .9218 of it. Nothing of Foundry's reaches
                  past the cell, so the readout needs no push at all --
                  and the creature is SMALLER than the cell.

   ── what subject scale does ─────────────────────────
   A per-token dial on the token config, default 1, and it says how large
   the subject sits inside its ring -- so it divides in one mode and
   multiplies in the other, and both are the same sentence read from
   different ends. It is the least certain thing here: it reaches the
   shader as a UV correction rather than as a radius, and a UV expanded
   about its centre draws its texture SMALLER, which is the direction
   taken here. If it is backwards at a real table the dial is the answer,
   which is a good part of why the dial exists.

   ── the floor ────────────────────────────────────
   The readout never comes inside the grid cell, however small the art
   is. Following a .6-scale sprite inward would draw its Stress track at
   .6 the size of the creature beside it, and the whole of what these
   tracks are for is being countable across a fight at a glance. The
   creature gets a gap; the reading stays comparable. The condition material
   follows the PIXI mesh instead of this HTML radius calculation. */

/** The ring texture's own two radii, from Foundry's spritesheet. */
export const RING_HOLE = 0.666;
export const RING_RIM = 0.7225;

/** Subject fit: how far past the cell the visible band reaches. */
export const RING_OUT = RING_RIM / RING_HOLE;
/** Grid fit: how far short of the cell the subject stops. */
export const RING_IN = RING_HOLE / RING_RIM;

/**
 * The chip's two scales, from what the token is actually wearing.
 *
 * @param {object} [t]
 * @param {boolean} [t.ring]     this token draws a dynamic ring
 * @param {boolean} [t.gridFit]  CONFIG.Token.ring.isGridFitMode
 * @param {number}  [t.subject]  token.document.ring.subject.scale
 * @param {number}  [t.art]      the larger of the texture's two scales
 * @param {number}  [t.manual]   the table's own multiplier
 * @returns {{readout:number, subject:number}}
 */
export function chipScale(t = {}) {
  const ring = !!t.ring;
  const grid = !!t.gridFit;
  const subj = Math.max(0.5, Number(t.subject) || 1);
  const art = Math.max(0.1, Math.abs(Number(t.art) || 1));
  const dial = Math.max(0.1, Number(t.manual) || 1);

  /* What the creature plus its ring now occupies, in cells. */
  const out = ring && !grid ? Math.max(art, RING_OUT / subj) : art;
  /* Where the artwork itself ends. */
  const inn = ring && grid ? RING_IN * subj * art : art;

  return {
    readout: round(Math.max(1, out) * dial),
    subject: round(inn * dial),
  };
}

const round = (n) => Math.round(n * 1e4) / 1e4;

/* ── the ladder ───────────────────────────────────────────────────
   Thresholds in *screen* pixels of token footprint, not camera scale: a
   2x2 token is legible at half the scale of a 1x1 one, and asking in
   footprint answers for both without a second table. */
export const TIER_PX = { near: 110, mid: 55, far: 28 };

export const tierFor = (px) =>
  px >= TIER_PX.near ? 'near' :
  px >= TIER_PX.mid  ? 'mid'  :
  px >= TIER_PX.far  ? 'far'  : 'min';

/* ── the geometry ─────────────────────────────────────────────────
   Shared by every gradient below. It lives here rather than in the
   stylesheet because the stop list IS the state and only JS can build
   one; the stylesheet owns the radii, which are the part that does not
   move. Two files, one seam, and the seam is a number of degrees. */
export const ORIGIN = 210;   // lower-left, so the sweep reads as a gauge
export const SWEEP  = 300;   // leaving 60° open at six o'clock
const PITCH = 17;            // Armor's fixed angular slot
const OPEN  = 360 - SWEEP;   // the southern gap Hope and Difficulty share

const wedge = (a, b, c) => `${c} ${a}deg ${b}deg`;
const clear = (a, b) => `transparent ${a}deg ${b}deg`;

/** A full-circumference track divided into `n`, filled to `marked`. */
const trackArc = (n, from, to, ink) => {
  if (!n) return 'none';
  const seg = SWEEP / n;
  const gap = Math.min(2.4, seg * 0.18);
  const stops = [];
  for (let i = 0; i < n; i++) {
    const a = i * seg, b = a + seg - gap;
    stops.push(i >= from && i < to ? wedge(a, b, ink) : clear(a, b));
    stops.push(clear(b, a + seg));
  }
  stops.push(clear(SWEEP, 360));
  return `conic-gradient(from ${ORIGIN}deg,${stops.join(',')})`;
};

/** Armor: a fixed pitch that stops when the slots do. */
const armorArc = (n, from, to, ink) => {
  if (!n) return 'none';
  const stops = [];
  for (let i = 0; i < n; i++) {
    const a = i * PITCH, b = a + PITCH - 4.5;
    stops.push(i >= from && i < to ? wedge(a, b, ink) : clear(a, b));
    stops.push(clear(b, a + PITCH));
  }
  stops.push(clear(n * PITCH, 360));
  return `conic-gradient(from ${ORIGIN}deg,${stops.join(',')})`;
};

const ARC = {
  hp:     { fn: trackArc, lit: 'var(--wound)',  ch: 'color-mix(in srgb,var(--wound) 17%,rgba(4,5,7,.82))' },
  stress: { fn: trackArc, lit: 'var(--strain)', ch: 'color-mix(in srgb,var(--strain) 15%,rgba(4,5,7,.82))' },
  armor:  { fn: armorArc, lit: 'var(--plate)',  ch: 'color-mix(in srgb,var(--plate) 14%,rgba(4,5,7,.86))' },
};

/* ── Armor reads the other way round, and it is the only one ──────
   Hit Points and Stress are things that happen TO you: the mark is the
   damage, the lit run grows as the fight goes badly, and an empty ring is
   a creature that is fine. Armor is not damage. It is a purse — slots you
   still have to spend, which is the number anybody actually asks at the
   table ("can you take this one?"), and it is the number the damage
   dialog counts down while you decide.

   So Armor lights what is LEFT and goes dark as it is spent, and the two
   readings do not collide because they are radially separated and one of
   them is not even a full ring. Drawing it like the damage tracks would
   have a fresh character wearing a bright band meaning nothing and a
   spent one wearing nothing at all, which is exactly backwards. */
const litOf = (kind, t) => {
  const m = Math.max(0, Math.min(t.max, t.marked ?? 0));
  return kind === 'armor' ? [0, t.max - m] : [0, m];
};

/* Three layers per track and each is a different claim.

     .ch   the channel — every slot the track HAS, in a recessed tint.
           This is what says "fourteen" when only six are marked, and it
           is why an unmarked slot can be fully transparent on .lit
           rather than a washed-out copy of a marked one.
     .lit  what is marked. Carries the glow and, for Stress, the scoring.
     .fx   the landing. A wedge covering only what just changed, faded
           out on its own — which is how a conic gradient gets setMarks'
           arrival back without an element per segment. */
const arcOf = (kind, t) => {
  if (!t?.max) return '';
  const { fn, lit, ch } = ARC[kind];
  const [a, b] = litOf(kind, t);
  return `<div class="tkarc ${kind}">
    <div class="ch"  style="background-image:${fn(t.max, 0, t.max, ch)}"></div>
    <div class="lit" style="background-image:${fn(t.max, a, b, lit)}"></div>
    <div class="fx"></div>
  </div>`;
};

/* ── the opening at six o'clock ───────────────────────────────────
   One slot, two occupants, and never both: a character spends Hope and
   an adversary makes you beat a Difficulty. Neither is a track and
   neither belongs on a ring. */
const bottomOf = (s) => {
  if (s.hope?.max) {
    /* The gems sit ON the circle rather than under it, so what places one
       is an angle. The pitch is the opening divided by the count, capped
       so a three-Hope character does not get three gems spread over sixty
       degrees — the row is centred on six o'clock and takes only the arc
       it needs, exactly as Armor takes only the arc its slots need. */
    const n = s.hope.max;
    const pitch = Math.min(11, (OPEN - 2) / n);
    return `<div class="tkhope"><div class="gems">${
      Array.from({ length: n }, (_, i) => {
        const a = ((n - 1) / 2 - i) * pitch;   // CSS rotates clockwise
        return `<b class="tkg" style="--a:${a.toFixed(2)}deg">${
          GEM({ on: i < (s.hope.value ?? 0),
                scar: i >= n - (s.scars ?? 0), sz: 6.6 })}</b>`;
      }).join('')
    }</div></div>`;
  }
  return s.difficulty != null
    ? `<div class="tkdiff"><i>dif</i><b>${s.difficulty}</b></div>`
    : '';
};

/* ── conditions ───────────────────────────────────────────────────
   The material lives on the PIXI token; this layer carries the sentence.
   It stays one sentence however many states are active, so two conditions
   read "ABLAZE · VULNERABLE ·" rather than becoming two competing rings.

   The path sits almost flush to the token rim and, unlike the old inward
   Vulnerable treatment, follows the readout scale. That keeps it beside the
   resource tracks when a dynamic token ring pushes those tracks outward.

   `textLength` is what makes the repeat seamless. A run almost never lands
   on the exact circumference by itself; spacing it to the path closes the
   join without stretching the glyphs. */
const CR = 51.8;
let uid = 0;

const safe = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function conditionRun(names = []) {
  const one = names.map((name) => String(name).trim().toUpperCase()).filter(Boolean).join(' · ');
  if (!one) return '';
  const unit = `${one} · `;
  const reps = Math.max(1, Math.ceil(68 / unit.length));
  return unit.repeat(reps);
}

const conditions = (names = []) => {
  const id = `tkc${++uid}`;
  const len = (2 * Math.PI * CR).toFixed(2);
  return `<div class="tkcond">
    <svg class="tkwr" viewBox="-6 -6 112 112" aria-hidden="true">
      <defs><path id="${id}" fill="none"
        d="M50 ${50 - CR} a${CR} ${CR} 0 1 1 -.01 0"/></defs>
      <text><textPath href="#${id}" textLength="${len}"
        lengthAdjust="spacing">${safe(conditionRun(names))}</textPath></text>
    </svg>
  </div>`;
};

/**
 * Build a chip.
 *
 * `difficulty` is the GM's and is passed only when the GM is looking; it
 * is what the GM rolls against and the players are not supposed to have
 * it. The condition sentence is drawn once and diffed in place, because a
 * status changing must not rebuild the resource tracks or cut off an arrival.
 */
export const TOKEN_CHIP = (s = {}) =>
  `<div class="dh tok${s.conditions?.length && !s.defeated ? ' conditioned' : ''}${s.defeated ? ' defeated' : ''}" data-t="near">
  ${conditions(s.defeated ? [] : s.conditions)}
  <div class="tkarcs">
    ${arcOf('armor', s.armor)}${arcOf('hp', s.hp)}${arcOf('stress', s.stress)}
  </div>
  ${bottomOf(s)}
</div>`;

/* ── the tier ─────────────────────────────────────────────────────
   Written per chip and only when it CHANGES, so the per-frame cost of
   the whole layer stays one transform on one node however many tokens
   are out. */
export function setTier(el, footprintPx) {
  const t = tierFor(footprintPx);
  if (el.dataset.t === t) return false;
  el.dataset.t = t;
  return true;
}

/* ── the driver ───────────────────────────────────────────────────
   The arrival, which a conic gradient does not get for free. `.fx` is
   handed a wedge covering exactly the slots that moved and is then
   restarted — class off, one forced flush, class on, which is setMarks'
   own two-pass shape and for its reason: a Severe hit moves four slots
   at once and four restarts is four layouts.

   Nothing animates when nothing moved, and a chip that is merely being
   re-read does not flash. There is no arrival on the chip itself for the
   same reason dice/chat.ts draws that line: a chip is created and
   destroyed every time a token is drawn, and a flourish on each of those
   is twelve tokens flourishing for no event. */
export function setChip(el, s = {}) {
  let flushed = false;

  for (const kind of ['armor', 'hp', 'stress']) {
    const t = s[kind];
    const box = el.querySelector(`.tkarc.${kind}`);
    if (!t?.max || !box) continue;

    const was = +box.dataset.m || 0;
    const now = Math.max(0, Math.min(t.max, t.marked ?? 0));
    if (now === was) continue;
    box.dataset.m = now;

    const { fn, lit } = ARC[kind];
    const [a, b] = litOf(kind, { ...t, marked: now });
    box.querySelector('.lit').style.backgroundImage = fn(t.max, a, b, lit);

    /* The flash covers the slots that moved, which for Armor are counted
       from the other end — it is the run between the two *edges*, and the
       edge is `b` under both readings. */
    const wasEnd = litOf(kind, { ...t, marked: was })[1];
    const fx = box.querySelector('.fx');
    fx.style.backgroundImage =
      fn(t.max, Math.min(wasEnd, b), Math.max(wasEnd, b), lit);
    fx.classList.remove('go');
    if (!flushed) { void el.offsetWidth; flushed = true; }
    fx.classList.add('go');

    box.classList.toggle('max', now >= t.max);
  }

  if (s.hope) {
    const g = el.querySelector('.tkhope .gems');
    if (g) setPool(g, s.hope.value ?? 0);
  }

  if ('conditions' in s) {
    const names = Array.isArray(s.conditions) ? s.conditions : [];
    const defeated = !!s.defeated;
    el.classList.toggle('conditioned', names.length > 0 && !defeated);
    const run = el.querySelector('.tkcond textPath');
    if (run) run.textContent = conditionRun(names);
  }
  if ('hidden' in s) el.classList.toggle('hidden', !!s.hidden);
  if ('defeated' in s) {
    el.classList.toggle('defeated', !!s.defeated);
    if (s.defeated) el.classList.remove('conditioned');
  }
}
