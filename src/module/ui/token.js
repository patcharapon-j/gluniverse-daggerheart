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
// out: three slots is 39° of arc, six is 78°. The arc's length is the
// capacity, which a full ring can never say.
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
const PITCH = 13;            // Armor's fixed angular slot
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
    const a = i * PITCH, b = a + PITCH - 4;
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

/* ── Vulnerable ───────────────────────────────────────────────────
   Not a fourth ring. Three concentric arcs already say "track", and a
   condition drawn as a fourth one would be a track you cannot count —
   so this goes INWARD instead, where nothing else lives.

   It is mark.js's own VULN_RUN, bent round a circle. The sheet answers
   this condition with a scrolling strip of terms because it is read at a
   glance, out of the corner of an eye, while the GM is describing
   something; a token has no room for the rules but every room for the
   word. Repeating it round the inside of the creature is the same
   gesture at the same reading distance.

   `textLength` is what makes it seamless. A repeated string almost never
   comes out to the exact circumference and the leftover shows as a gap
   travelling round with the text; forcing the run to the path's own
   length with `lengthAdjust="spacing"` closes it without touching a
   glyph. The radius is stated twice — in the path data and in the
   length — so both are derived from one constant here. */
const VR = 37;                                   // the word ring's radius
const RUN = 'VULNERABLE ◆ ';
let uid = 0;

const vulnerable = () => {
  const id = `tkv${++uid}`;
  const len = (2 * Math.PI * VR).toFixed(2);
  const reps = Math.max(3, Math.round(len / 46));
  return `<div class="tkvuln">
    <div class="vig"></div>
    <svg class="tkwr" viewBox="0 0 100 100" aria-hidden="true">
      <defs><path id="${id}" fill="none"
        d="M50 ${50 - VR} a${VR} ${VR} 0 1 1 -.01 0"/></defs>
      <text><textPath href="#${id}" textLength="${len}"
        lengthAdjust="spacing">${RUN.repeat(reps)}</textPath></text>
    </svg>
    <div class="sweep"></div>
  </div>`;
};

/**
 * Build a chip.
 *
 * `difficulty` is the GM's and is passed only when the GM is looking; it
 * is what the GM rolls against and the players are not supposed to have
 * it. Vulnerable is drawn always and revealed by a class, because
 * toggling it must not rebuild markup.
 */
export const TOKEN_CHIP = (s = {}) =>
  `<div class="dh tok${s.vuln ? ' vuln' : ''}" data-t="near">
  ${vulnerable()}
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

  if ('vuln' in s) el.classList.toggle('vuln', !!s.vuln);
  if ('hidden' in s) el.classList.toggle('hidden', !!s.hidden);
  if ('defeated' in s) el.classList.toggle('defeated', !!s.defeated);
}
