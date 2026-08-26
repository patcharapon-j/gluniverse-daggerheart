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
   move. Two files, one seam, and the seam is a number of degrees.

   ── Obsidian orbit ────────────────────────────────────────────────
   The locked concept from Preview Gate 01. The angular language is the
   one this component always had — a gauge opening at lower-left, 300°
   of sweep, 60° left clear at six o'clock — and what changed is WHERE
   it is drawn and WHAT it is made of.

   The tracks used to hang outside the creature, which bought the artwork
   back at the price of a footprint: the outer edge sat at 64.6 where the
   grid cell's is 50, so a chip reached a seventh of a cell into each
   neighbour and two adjacent Armor arcs could cross. Obsidian orbit
   brings them IN, as rails inside the token's own circle. Nothing of a
   creature's readout now touches its neighbour, and the cost is paid on
   the portrait instead — which is the trade the gate chose. */
export const ORIGIN = 210;   // lower-left, so the sweep reads as a gauge
export const SWEEP  = 300;   // leaving 60° open at six o'clock
const OPEN  = 360 - SWEEP;   // the southern gap Hope and Difficulty share

/* ── the level-of-detail ladder ───────────────────────────────────
   Obsidian orbit's own thresholds, which are not the old tier ladder:
   a rail inside the creature survives further down the zoom than a
   track hung outside it, because it is not competing with a neighbour
   for the same pixels. Written alongside `data-t`, which the range
   ruler and the existing tests still read. */
export const LOD_PX = { close: 96, mid: 64, far: 36 };

export const lodFor = (px) =>
  px >= LOD_PX.close ? 'close' : px >= LOD_PX.mid ? 'mid' : px >= LOD_PX.far ? 'far' : 'min';

/* ── a rail, in five layers ───────────────────────────────────────
   The shipped track was three layers and read as a coloured arc. This
   is a machined instrument, and each layer is a separate claim:

     seat      the cut the rail sits in — near-black, scaled a hair
               proud so it reads as a recess rather than a border
     channel   every slot the track HAS, in a recessed tint. This is
               what says "fourteen" when only six are marked
     fill      what is marked, carrying the glow
     facet     one specular pass across the whole rail, so the segments
               look turned rather than printed
     anchors   a hairline every fifth slot
     impact    the landing — a wedge covering only what just moved

   The fifth-slot rhythm is the answer to Q19: with numbers excluded, a
   fourteen-slot track stops being countable somewhere around seven. A
   wider gap every fifth slot plus an anchor hairline gives the eye a
   place to count FROM without introducing numeric UI. */
const SLOT_GAP = 2.2;
const FIFTH_GAP = 4.1;

const railGradient = (max, active, colour, { solid = false } = {}) => {
  if (!max) return 'none';
  const slot = SWEEP / max;
  const stops = [];
  for (let i = 0; i < max; i++) {
    const fifth = (i + 1) % 5 === 0 && i + 1 < max;
    const gap = Math.min(fifth ? FIFTH_GAP : SLOT_GAP, slot * (fifth ? 0.24 : 0.14));
    const a = i * slot + gap * 0.5;
    const b = (i + 1) * slot - gap * 0.5;
    const paint = solid ? colour : i < active ? colour : 'transparent';
    stops.push(`transparent ${i * slot}deg ${a.toFixed(3)}deg`);
    stops.push(`${paint} ${a.toFixed(3)}deg ${b.toFixed(3)}deg`);
    stops.push(`transparent ${b.toFixed(3)}deg ${((i + 1) * slot).toFixed(3)}deg`);
  }
  return `conic-gradient(from ${ORIGIN}deg,${stops.join(',')},transparent ${SWEEP}deg 360deg)`;
};

/* Only from six slots up. Below that the track is already countable and
   a hairline every fifth would be marking one boundary in a row of five,
   which reads as damage rather than as a ruler. */
const anchorGradient = (max) => {
  if (!max || max < 6) return 'none';
  const slot = SWEEP / max;
  const stops = ['transparent 0deg'];
  for (let mark = 5; mark < max; mark += 5) {
    const at = mark * slot;
    stops.push(
      `transparent ${Math.max(0, at - 0.8).toFixed(3)}deg`,
      `rgba(238,244,250,.78) ${Math.max(0, at - 0.45).toFixed(3)}deg ${(at + 0.45).toFixed(3)}deg`,
      `transparent ${(at + 0.8).toFixed(3)}deg`,
    );
  }
  stops.push('transparent 360deg');
  return `conic-gradient(from ${ORIGIN}deg,${stops.join(',')})`;
};

/** One slot, lit. The landing covers what moved and nothing else. */
const impactGradient = (max, index, colour) => {
  if (!max || index < 0 || index >= max) return 'none';
  const slot = SWEEP / max;
  const gap = Math.min((index + 1) % 5 === 0 ? FIFTH_GAP : SLOT_GAP, slot * 0.18);
  const a = index * slot + gap * 0.5;
  const b = (index + 1) * slot - gap * 0.5;
  return `conic-gradient(from ${ORIGIN}deg,transparent 0deg ${a.toFixed(3)}deg,`
    + `${colour} ${a.toFixed(3)}deg ${b.toFixed(3)}deg,transparent ${b.toFixed(3)}deg 360deg)`;
};

const RAIL = {
  hp:     { channel: '#240d13', fill: '#e2545e', impact: '#ffb5b8' },
  stress: { channel: '#0c252d', fill: '#70cddd', impact: '#d7fbff' },
  armor:  { channel: '#171d24', fill: '#cad3dd', impact: '#ffe2a0' },
};

/* ── Armor reads the other way round, and it is the only one ──────
   Hit Points and Stress are things that happen TO you: the mark is the
   damage, the lit run grows as the fight goes badly, and an empty ring is
   a creature that is fine. Armor is not damage. It is a purse — slots you
   still have to spend, which is the number anybody actually asks at the
   table ("can you take this one?"), and it is the number the damage
   dialog counts down while you decide.

   So Armor lights what is LEFT and goes dark as it is spent. Drawing it
   like the damage tracks would have a fresh character wearing a bright
   band meaning nothing and a spent one wearing nothing at all, which is
   exactly backwards. */
export const activeOf = (kind, t) => {
  const m = Math.max(0, Math.min(t.max, t.marked ?? 0));
  return kind === 'armor' ? t.max - m : m;
};

const ringOf = (kind, t) => {
  if (!t?.max) return '';
  const c = RAIL[kind];
  const active = activeOf(kind, t);
  return `<div class="er-ring ${kind}" data-m="${Math.max(0, Math.min(t.max, t.marked ?? 0))}">
    <i class="seat" style="background-image:${railGradient(t.max, t.max, '#030508', { solid: true })}"></i>
    <i class="channel" style="background-image:${railGradient(t.max, t.max, c.channel, { solid: true })}"></i>
    <i class="fill" style="background-image:${railGradient(t.max, active, c.fill)}"></i>
    <i class="facet"></i>
    <i class="anchors" style="background-image:${anchorGradient(t.max)}"></i>
    <i class="impact"></i>
  </div>`;
};

/* ── the opening at six o'clock ───────────────────────────────────
   One slot, two occupants, and never both: a character spends Hope and
   an adversary makes you beat a Difficulty. Neither is a track and
   neither belongs on a rail.

   Obsidian orbit seats both INSIDE the circle with the rails, so the
   whole readout is now contained by the creature.

   ── Hope is on the circle, not under it ─────────────────────────
   The first port of this concept laid the gems out as a flat row across
   the bottom, and a flat row is the one thing the 60° opening is not.
   Everything else on this chip is polar — three rails, a crown, a
   reticle, a sentence — so a straight strip of six diamonds reads as a
   different component that happens to be nearby, and worse, its ends
   drift INWARD off the rails' own circle exactly where they meet the
   rail terminals they are supposed to continue.

   So the gems are placed by angle on that circle and tilt with it, which
   is what makes the opening read as part of the gauge rather than a hole
   in it. It is also what the component was specified to do before the
   concept port flattened it.

   The pitch is FIXED, which is Armor's argument arriving at the gems: a
   character with three Hope and one with six must have their Hope drawn
   at the same spacing or the two are not comparable, and the arc's own
   length is then the capacity. It only compresses when a max large
   enough to overrun the opening asks it to — the opening is a hard
   boundary because the rails own the degrees on either side of it. */
const HOPE_R = 43.4;      // cqw — between the Hit Points rail and Stress
const HOPE_PITCH = 10;    // degrees between gems, held for every character
const HOPE_SPAN = 51;     // of the 60° opening, leaving the rail ends clear
const HOPE_W = 4.6;       // px across the flats
const HOPE_GAP = 1.1;     // px of arc that must survive between neighbours

/* Gem 0 sits at the lower-LEFT end of the opening, so Hope fills the way
   the rails run and the way the sentence above it reads. A positive CSS
   rotation takes the six-o'clock vector clockwise, which is leftward.

   The size is solved WITH the pitch rather than set beside it, and the
   reason is that a diamond is not as wide as its box: the gem is a square
   turned 45° and turned again with the arc, so what it actually occupies
   along the circle is its diagonal, √2 times the number in the
   stylesheet. Six 5.6px gems at the first pitch this was written with
   needed 47px of arc and had 38 — they fused into a gold band with a
   scalloped edge, which is one Hope drawn six times.

   So: hold the pitch, and if the pitch has had to compress to fit a max
   the opening cannot hold at full spacing, let the gems come down with
   it. A smaller gem is still a count. Overlapping gems are not. */
const hopeGeometry = (n) => {
  const pitch = n > 1 ? Math.min(HOPE_PITCH, HOPE_SPAN / (n - 1)) : 0;
  const arc = pitch * (Math.PI / 180) * HOPE_R;
  const width = n > 1 ? Math.min(HOPE_W, (arc - HOPE_GAP) / Math.SQRT2) : HOPE_W;
  return {
    width: Math.max(2.4, width),
    angles: Array.from({ length: n }, (_, i) => (((n - 1) / 2) - i) * pitch),
  };
};

const bottomOf = (s) => {
  if (s.hope?.max) {
    const n = s.hope.max;
    const scars = s.scars ?? 0;
    const { width, angles } = hopeGeometry(n);
    /* Radius and width are written here rather than in the stylesheet so
       the circle, the gems on it and the spacing between them cannot drift
       apart — they are one solution, not three settings. */
    return `<div class="er-hope" style="--hope-r:${HOPE_R}cqw;--hope-w:${width.toFixed(2)}px">${
      Array.from({ length: n }, (_, i) => {
        const scar = i >= n - scars;
        return `<i class="${i < (s.hope.value ?? 0) && !scar ? 'on' : ''}${scar ? ' scar' : ''}"`
          + ` style="--a:${angles[i].toFixed(2)}deg"></i>`;
      }).join('')
    }</div>`;
  }
  return s.difficulty != null ? `<b class="er-diff">${s.difficulty}</b>` : '';
};

/* ── conditions ───────────────────────────────────────────────────
   The material lives on the PIXI token; this layer carries the sentence.
   It stays one sentence however many states are active, so two conditions
   read "ABLAZE · VULNERABLE ·" rather than becoming two competing rings.

   The path sits against the token rim and, unlike the old inward Vulnerable
   treatment, follows the readout scale. That keeps it beside the resource
   tracks when a dynamic token ring pushes those tracks outward.

   ── where 50.2 comes from ─────────────────────────────────────────
   Text on a circular path grows OUTWARD from its baseline: the arc is
   drawn clockwise from twelve o'clock, so a glyph's ascent points away
   from the centre. The creature ends at `.er-shell`'s clip, radius 49.2,
   and the outermost rail is inside that. So a baseline at 51.8 was not
   almost flush, it was a two-and-a-half unit moat with the whole of the
   type on the far side of it, and the way to close a moat is to bring the
   BASELINE in — which costs the artwork nothing, because everything above
   it was already outside the creature. 50.2 leaves the round dot of the
   separator sitting on the rim and puts the type immediately outside it.

   Bringing the radius in and the size up at the same time is not a
   coincidence either. The circumference falls by 3% and the run grows by
   12%, and both of those close the same gap: at 4.3px on a 51.8 circle a
   sixty-eight character sentence covered barely half the path and arrived
   as widely spaced debris rather than as a band of lettering.

   `textLength` is what makes the repeat seamless. A run almost never lands
   on the exact circumference by itself; spacing it to the path closes the
   join without stretching the glyphs. */
const CR = 50.2;
let uid = 0;

const safe = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** How many repeats of `unit` it takes to cover the path. */
const repeatsFor = (length) => Math.max(1, Math.ceil(68 / length));

export function conditionRun(names = []) {
  const one = names.map((name) => String(name).trim().toUpperCase()).filter(Boolean).join(' · ');
  if (!one) return '';
  const unit = `${one} · `;
  return unit.repeat(repeatsFor(unit.length));
}

/**
 * The same sentence, cut into pieces that can each carry a colour.
 *
 * A token wearing two conditions used to get one hue for the whole run —
 * the first condition's, chosen because averaging two opposite hues gives a
 * grey that names neither and because the material under the sentence does
 * not average either. Both of those are still true; what was wrong was
 * treating "cannot be averaged" as "must be one of them". Naming each
 * condition in its own colour says the same thing the material says, once
 * per condition, and costs a tspan.
 *
 * `tints` is parallel to `names`. A missing or malformed one falls through
 * to `--tkc` in the stylesheet, which is the sentence's own key colour, so
 * a caller that knows the names and not the colours still gets a sentence.
 */
export function conditionSegments(names = [], tints = []) {
  const words = names
    .map((name, i) => [String(name).trim().toUpperCase(), tintOf(tints[i])])
    .filter(([word]) => word);
  if (!words.length) return [];
  const unit = words.flatMap(([word, tint]) => [[word, tint], [' · ', '']]);
  const length = words.reduce((n, [word]) => n + word.length + 3, 0);
  const out = [];
  for (let i = repeatsFor(length); i > 0; i--) out.push(...unit);
  return out;
}

/* Only a word that has a colour of its own gets the class, so the
   separators keep inheriting `text`'s fill and there is exactly one place
   that decides what an uncoloured sentence looks like. */
const runMarkup = (segments) => segments
  .map(([text, tint]) => (tint
    ? `<tspan class="tkw" style="--tkw:${tint}">${safe(text)}</tspan>`
    : `<tspan>${safe(text)}</tspan>`))
  .join('');

/* The sentence is lettering ON somebody's artwork, and the artwork is
   arbitrary: a pale robe and a dark cloak are the same component's
   background. So readability is built rather than assumed — a dark stroke
   under the glyphs via paint-order, then a tight black shadow for contact
   and a wider tinted one for lift.

   The tint is the ACTIVE condition's own material colour, which is the
   same number the PIXI filter is running on the mesh underneath. That is
   the point of carrying it: the sentence and the texture it is describing
   are then visibly the same statement, and a token wearing two conditions
   is not a white sentence over a purple creature for no reason. Only a
   hex is accepted, because this is interpolated into a style attribute. */
const TINT = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
export const tintOf = (value) => (TINT.test(String(value ?? '')) ? String(value) : '');

const conditions = (names = [], tints = []) => {
  const id = `tkc${++uid}`;
  const len = (2 * Math.PI * CR).toFixed(2);
  return `<div class="tkcond">
    <svg class="tkwr" viewBox="-6 -6 112 112" aria-hidden="true">
      <defs><path id="${id}" fill="none"
        d="M50 ${50 - CR} a${CR} ${CR} 0 1 1 -.01 0"/></defs>
      <text><textPath href="#${id}" textLength="${len}"
        lengthAdjust="spacing">${runMarkup(conditionSegments(names, tints))}</textPath></text>
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
  `<div class="dh tok${s.conditions?.length && !s.defeated ? ' conditioned' : ''}${s.defeated ? ' defeated' : ''}${
    s.selected ? ' is-selected' : ''}${s.targeted ? ' is-targeted' : ''}" data-t="near" data-lod="close" data-actor="${
    s.actor ?? 'character'}"${tintOf(s.tint) ? ` style="--tkc:${tintOf(s.tint)}"` : ''}>
  ${conditions(s.defeated ? [] : s.conditions, s.defeated ? [] : s.tints)}
  <div class="er-bloom"></div>
  <div class="er-shell">
    <i class="er-identity"></i>
    ${ringOf('armor', s.armor)}${ringOf('hp', s.hp)}${ringOf('stress', s.stress)}
    ${bottomOf(s)}
    <i class="er-crown"></i>
    <i class="er-reticle"></i>
  </div>
</div>`;

/* ── the tier ─────────────────────────────────────────────────────
   Written per chip and only when it CHANGES, so the per-frame cost of
   the whole layer stays one transform on one node however many tokens
   are out. */
export function setTier(el, footprintPx) {
  const t = tierFor(footprintPx);
  const lod = lodFor(footprintPx);
  if (el.dataset.t === t && el.dataset.lod === lod) return false;
  el.dataset.t = t;
  el.dataset.lod = lod;
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
    const ring = el.querySelector(`.er-ring.${kind}`);
    if (!t?.max || !ring) continue;

    const was = +ring.dataset.m || 0;
    const now = Math.max(0, Math.min(t.max, t.marked ?? 0));
    if (now === was) continue;
    ring.dataset.m = now;

    const c = RAIL[kind];
    const active = activeOf(kind, { ...t, marked: now });
    ring.querySelector('.fill').style.backgroundImage = railGradient(t.max, active, c.fill);

    /* The landing lights the slot that changed. Armor counts from the
       other end, so the slot it just spent is the one it no longer has —
       `active` itself — where a damage track's is the one it just took. */
    const slot = kind === 'armor' ? active : Math.max(0, active - 1);
    const impact = ring.querySelector('.impact');
    impact.style.backgroundImage = impactGradient(t.max, slot, c.impact);

    /* Class off, one forced flush for the whole chip, class on. A Severe
       hit moves three rails at once and three restarts is three layouts. */
    ring.classList.remove('go');
    if (!flushed) { void el.offsetWidth; flushed = true; }
    ring.classList.add('go');

    ring.classList.toggle('max', active >= t.max);
  }

  /* Hope arrives and leaves one gem at a time and both readings matter, so
     each is given its own direction rather than a shared blink: spending
     throws light OUTWARD off the gem, gaining draws it INWARD onto it.
     That is the crown-and-reticle grammar from the chrome above, reused
     here because it already means "yours" versus "spent" on this chip.

     The same restart discipline as the rails, and the same flush: a Rest
     hands back four Hope at once, and four separate reflows for one event
     is the thing `flushed` exists to stop. A gem that did not change is
     not touched, so re-reading a chip never sparkles. */
  if (s.hope?.max) {
    const gems = el.querySelectorAll('.er-hope i');
    const scars = s.scars ?? 0;
    const value = s.hope.value ?? 0;
    gems.forEach((gem, i) => {
      const scar = i >= gems.length - scars;
      const on = i < value && !scar;
      const was = gem.classList.contains('on');
      gem.classList.toggle('scar', scar);
      gem.classList.toggle('on', on);
      if (on === was) return;

      gem.classList.remove('gain', 'spend');
      if (!flushed) { void el.offsetWidth; flushed = true; }
      gem.classList.add(on ? 'gain' : 'spend');
    });
  }

  if ('conditions' in s) {
    const names = Array.isArray(s.conditions) ? s.conditions : [];
    const tints = Array.isArray(s.tints) ? s.tints : [];
    const defeated = !!s.defeated;
    el.classList.toggle('conditioned', names.length > 0 && !defeated);
    const run = el.querySelector('.tkcond textPath');
    /* Was `textContent`, which a coloured sentence cannot be: the colours
       are per word and a word is an element. Still the same diff-in-place
       as before — the chip is not rebuilt, only the run inside it. */
    if (run) run.innerHTML = runMarkup(conditionSegments(names, tints));
  }
  if ('tint' in s) {
    const tint = tintOf(s.tint);
    if (tint) el.style.setProperty('--tkc', tint);
    else el.style.removeProperty('--tkc');
  }
  if ('selected' in s) el.classList.toggle('is-selected', !!s.selected);
  if ('targeted' in s) el.classList.toggle('is-targeted', !!s.targeted);
  if ('hidden' in s) el.classList.toggle('hidden', !!s.hidden);
  if ('defeated' in s) {
    el.classList.toggle('defeated', !!s.defeated);
    if (s.defeated) el.classList.remove('conditioned');
  }
}
