/**
 * Hope sits on the rails' circle, is gem.js's own gem, and the sentence
 * stays readable on it.
 *
 * All three have been lost once, and the third is why this file grew. The
 * gems were specified as "placed by angle on the tracks' own circle and
 * tilting with it" and the concept port quietly shipped them as a flex
 * row. And they were specified as GEMs — by name, in this component's own
 * comments and in CLAUDE.md — and shipped as a hand-written diamond with
 * its own gain and its own spend, for as long as the chip has existed.
 *
 * Neither is visible in a screenshot. A flex row of six diamonds still
 * looks like six diamonds, and at six pixels a gold diamond looks like a
 * gold diamond however it was built. So the geometry is asserted here
 * rather than described, and so is the OBJECT: a claim a component makes
 * about which component it is using is a claim something has to check,
 * because the failure is a second Hope nobody can see is second.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { TOKEN_CHIP } from "../src/module/ui/token.js";

const chip = (max, value = 0, extra = {}) =>
  TOKEN_CHIP({ hp: { max: 6, marked: 0 }, hope: { value, max }, ...extra });

const gemsOf = (html) => [...html.matchAll(/<i class="er-gem" style="--a:(-?[\d.]+)deg">/g)]
  .map((m) => Number(m[1]));

const varOf = (html, name) => {
  const m = html.match(new RegExp(`--${name}:([^;"]+)`));
  return m ? m[1] : null;
};

/* The first number in a property value. --hope-r is a calc() now, because
   it scales with the subject, and Number.parseFloat("calc(43.4cqw...") is
   NaN — which the geometry check reported as "the chip carries no
   geometry", a true-sounding message about the wrong thing. */
const numOf = (html, name) => {
  const raw = varOf(html, name);
  const m = raw?.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : Number.NaN;
};

/* ── the opening ──────────────────────────────────────────────────
   The rails run 210° -> 150° clockwise, so the gems own the 60° at six
   o'clock and nothing else. Half of that is 30°, and the assertion is
   against 27 rather than 30 so a gem's own body clears the rail terminal
   it sits beside rather than merely having its centre inside. */
const HALF_OPENING = 27;

for (const max of [1, 2, 3, 4, 5, 6, 7, 9, 12]) {
  const html = chip(max, Math.min(2, max));
  const angles = gemsOf(html);

  assert.equal(angles.length, max, `${max} Hope must place ${max} gems`);

  for (const a of angles)
    assert.ok(Math.abs(a) <= HALF_OPENING,
      `${max} Hope: gem at ${a}deg leaves the opening the rails left it`);

  /* Symmetric about six o'clock, because the opening is. An off-centre
     run reads as a track that has slipped rather than as a count. */
  const mirrored = [...angles].reverse().map((a) => -a);
  angles.forEach((a, i) =>
    assert.ok(Math.abs(a - mirrored[i]) < 1e-9,
      `${max} Hope: the run is not centred on six o'clock`));

  /* Descending, so gem 0 is the lower-LEFT end and Hope fills the way the
     rails run. */
  for (let i = 1; i < angles.length; i++)
    assert.ok(angles[i] < angles[i - 1], `${max} Hope: gems are out of order`);

  /* And they must not touch. What a gem occupies along the circle is its
     own BOX, and that is the one arithmetic consequence of these becoming
     GEMs: the old <i> was a square turned 45 degrees, so its DIAGONAL sat
     on the arc and the box had to be divided by sqrt(2) to fit. A GEM is a
     diamond clipped out of an upright box, so there is nothing to divide.
     Keeping the sqrt(2) would go on passing while reserving 41% more arc
     than a gem occupies, which is a check that has stopped measuring the
     thing it names. */
  if (max > 1) {
    const r = numOf(html, "hope-r");
    const w = numOf(html, "sz");
    assert.ok(r > 0 && w > 0, `${max} Hope: the chip must carry its own geometry`);
    const step = Math.abs(angles[1] - angles[0]) * (Math.PI / 180) * r;
    assert.ok(step > w,
      `${max} Hope: gems overlap — ${step.toFixed(2)}px of arc for a ${w.toFixed(2)}px gem`);
  }
}

/* A companion with two Hope and a character with six must be drawn at the
   same spacing, or the two are not comparable across the board. */
const pitch = (max) => { const a = gemsOf(chip(max)); return Math.abs(a[1] - a[0]); };
assert.ok(Math.abs(pitch(2) - pitch(6)) < 1e-9,
  "the pitch is fixed: two Hope and six Hope are spaced alike");
assert.ok(pitch(12) < pitch(6),
  "a max the opening cannot hold at full spacing has to compress");

/* ── the sentence ─────────────────────────────────────────────────
   The tint reaches a style attribute, so it is a hex or it is nothing. */
assert.match(TOKEN_CHIP({ conditions: ["Ablaze"], tint: "#f0783f" }), /style="--tkc:#f0783f"/);
assert.doesNotMatch(TOKEN_CHIP({ conditions: ["Ablaze"], tint: 'red" onload="x' }), /onload/,
  "the tint is interpolated into an attribute and must reject anything but a hex");
assert.doesNotMatch(TOKEN_CHIP({ conditions: ["Ablaze"] }), /--tkc/,
  "no condition colour, no custom property");

/* ── it is the gem, not a picture of one ──────────────────────────
   The assertion this file did not have. Every member below is one GEM()
   emits and token.css draws none of: the bloom's own wrapper, the clipped
   face, the refraction band, the rim, and the transient layer the gain
   ring and the spend streak ride. A chip that has gone back to drawing its
   own diamond fails here rather than in somebody's session. */
const one = chip(6, 4, { scars: 1 });
for (const part of ["gem", "lamp", "pit", "edge", "rim", "fx"])
  assert.match(one, new RegExp(`class="[^"]*\\b${part}\\b`),
    `the Hope gems must be gem.js's GEM — no .${part} in the markup`);
assert.match(one, /class="gem scar"/, "a scarred slot is GEM's own scar, not a recolour");

/* ── the readout sits on the creature ────────────────────────────
   Obsidian orbit moved the rails INSIDE the creature, which swapped which
   scale they belong to, and nobody moved them: --tkr went on being written
   and read by one element, --tkv written and read by none, and every rail
   sat at a fixed percentage of the grid CELL. Grid fit stops the subject at
   .9218 of the cell and a .6-scale sprite at .6, so the gauge floated
   around a creature that was nowhere near it — drawn perfectly, every
   time. */
assert.match(one, /--hope-r:calc\([\d.]+cqw \* var\(--tkv/,
  "the Hope arc's radius must follow the subject, not the grid cell");

const css = readFileSync(new URL("../styles/token.css", import.meta.url), "utf8");
/* The builder is read as text for the one number that is a radius rather
   than markup: the sentence's path is drawn in `token.js` beside the
   arithmetic that puts it there, and a check on the markup cannot see it. */
const chipJs = readFileSync(new URL("../src/module/ui/token.js", import.meta.url), "utf8");
for (const rail of ["armor", "hp", "stress"])
  assert.match(css, new RegExp(`\\.er-ring\\.${rail}\\s*\\{inset:calc\\(50% - [\\d.]+%\\s*\\*\\s*var\\(--tkv`),
    `the ${rail} rail must follow the subject, not the grid cell`);
assert.match(css, /\.er-shell\{[^}]*clip-path:circle\(calc\([\d.]+%\s*\*\s*var\(--tkv/s,
  "the clip is a promise about the creature, so it follows the subject too");
/* The condition sentence was the last thing reading the OUTWARD CLEARANCE,
   and that is the same finding wearing the other hat: a caption set against
   the rim stood 1.0848 cells out at Foundry's default fit while the rails it
   captions had come in onto the artwork, and further out again on a subject
   scale under 1, where the clearance divides. Drawn perfectly, every time. */
assert.match(css, /\.dh\.tok \.tkcond\{[^}]*transform:scale\(var\(--tkv/s,
  "the sentence is a caption on the creature's rim and follows the subject");
/* Which leaves --tkr with no consumer, so it is retired rather than left
   declared for the next reader to trace — the same end --tk0 came to when
   the tracks moved inside. A stylesheet that still reads it has put
   something back outside the creature without saying so. */
assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ""), /var\(--tkr/,
  "--tkr has no consumer since the readout moved onto the creature");

/* And the baseline is the rim. Text on a circular path grows OUTWARD from
   its baseline, so this is the one radius that may sit ON the creature: any
   further out is the moat above, and any further in sets the sentence
   across the Armor rail it captions — whose outer edge is radius 48. */
const CR = Number(chipJs.match(/const CR = ([\d.]+);/)?.[1]);
assert.ok(CR > 48 && CR <= 49.2,
  `the sentence's baseline sits between the Armor rail and the rim — got ${CR}`);
/* Radii only. A band's width is a thing you count and keeps its size at
   every setting — the range ruler's rule arriving here. An inset is
   measured from the EDGE and a radius from the centre, which is why every
   one of those is written 50% minus a scaled radius rather than a scaled
   inset: scaling the inset moves a rail the wrong way. */
assert.doesNotMatch(css, /--rail:calc\(/,
  "a rail's WIDTH must not scale — only its radius");
assert.doesNotMatch(css, /\.er-hope\{[^}]*--sz:calc\(/s,
  "a gem is a thing you count and keeps its size at every setting");
assert.match(css, /\.er-hope \.er-gem\{[^}]*transform:rotate\(var\(--a,0deg\)\) translateY\(var\(--hope-r\)\)/s,
  "the gems are placed by angle on the circle, not laid out in a row");
assert.doesNotMatch(css, /\.er-hope\{[^}]*display:flex/s,
  "a flex row is the one thing the 60 degree opening is not");
/* The placement carries the gem and must not turn it. A GEM is already a
   diamond; the trailing rotate(45deg) is what the old square needed, and
   it would now put the scar's two strokes and the spend's streak on the
   diagonal — a shape that still reads as a gem and no longer reads as
   crossed out. */
assert.doesNotMatch(css, /\.er-hope \.er-gem\{[^}]*rotate\(45deg\)/s,
  "a GEM is already a diamond and must not be turned again");
assert.doesNotMatch(css, /tkHopeIn|tkHopeOut/,
  "the hand-written gain and spend belong to gem.js now");

/* ── arriving and leaving ─────────────────────────────────────────
   A chip had neither: appendChild and remove, so a creature arriving on
   the board and a corpse being deleted both happened between one frame and
   the next, on the one surface in this system drawn over somebody's
   artwork and therefore with nothing to establish it.

   The stagger is asserted as an ORDER and not as three numbers, because
   what it means is the ladder run backwards — the rails cull outside-in,
   so they assemble inside-out — and three numbers would go on passing
   while somebody retuned them into the wrong sequence. */
const delayOf = (name) => {
  const m = css.match(new RegExp(`\\.er-ring\\.${name}\\{animation:tkRingIn[^}]*\\}`));
  assert.ok(m, `the ${name} rail has no arrival`);
  const delay = m[0].match(/\)\s+([\d.]+)s\s+backwards/);
  return delay ? Number.parseFloat(delay[1]) : 0;
};
const [stress, hp, armor] = ["stress", "hp", "armor"].map(delayOf);
assert.ok(stress < hp && hp < armor,
  `the rails assemble inside-out — got stress ${stress}, hp ${hp}, armor ${armor}`);
assert.match(css, /\.tok\.arrive\{animation:tkChipIn/, "a chip with no arrival pops onto the board");
assert.match(css, /\.tok\.leaving\{animation:tkChipOut/, "a chip with no departure vanishes");

/* An arrival that wrote opacity on a rail would spend its whole length
   overruling data-lod, and a chip arriving at a pulled-back camera would
   show the Armor rail the zoom had already culled. Transforms only. */
assert.doesNotMatch(css, /@keyframes tkRingIn\{[^}]*opacity/s,
  "the rails' arrival must not touch opacity — the ladder owns it");

/* Filling the root forwards would pin opacity at 1 and beat .tok.hidden,
   which is a GM-invisible token quietly becoming visible on the frame its
   chip finished arriving. */
assert.doesNotMatch(css, /\.tok\.arrive\{animation:tkChipIn[^}]*(forwards|both)/,
  "the chip's arrival must not fill forwards — .tok.hidden has to win afterwards");
assert.match(css, /\.dh\.tok \.tkcond \.tkwr text\{[^}]*paint-order:stroke fill/s,
  "the sentence needs its stroke painted UNDER the fill or it loses half its weight");
assert.match(css, /\.dh\.tok \.tkcond \.tkwr text\{[^}]*fill:color-mix\(in srgb,var\(--tkc/s,
  "the sentence carries the condition's own material colour");

console.log(
  "token hope: real GEMs on the circle at a fixed pitch, no overlap, " +
  "chip arrives inside-out and leaves, sentence armoured and tinted",
);
