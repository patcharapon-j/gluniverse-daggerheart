/**
 * Hope sits on the rails' circle, and the sentence stays readable on it.
 *
 * Both of these have already been lost once. The gems were specified as
 * "placed by angle on the tracks' own circle and tilting with it" and the
 * concept port quietly shipped them as a flex row, which nothing caught
 * because a flex row of six diamonds still looks like six diamonds in a
 * screenshot. So the geometry is asserted here rather than described: the
 * opening is a hard boundary the rails own the far side of, and two gems
 * that overlap are one Hope drawn twice.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { TOKEN_CHIP } from "../src/module/ui/token.js";

const chip = (max, value = 0, extra = {}) =>
  TOKEN_CHIP({ hp: { max: 6, marked: 0 }, hope: { value, max }, ...extra });

const gemsOf = (html) => [...html.matchAll(/<i class="[^"]*" style="--a:(-?[\d.]+)deg"><\/i>/g)]
  .map((m) => Number(m[1]));

const varOf = (html, name) => {
  const m = html.match(new RegExp(`--${name}:([^;"]+)`));
  return m ? m[1] : null;
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
     DIAGONAL — it is a square turned 45° and turned again with the arc —
     so the check is against width * sqrt(2), not width. */
  if (max > 1) {
    const r = Number.parseFloat(varOf(html, "hope-r"));
    const w = Number.parseFloat(varOf(html, "hope-w"));
    assert.ok(r > 0 && w > 0, `${max} Hope: the chip must carry its own geometry`);
    const step = Math.abs(angles[1] - angles[0]) * (Math.PI / 180) * r;
    assert.ok(step > w * Math.SQRT2,
      `${max} Hope: gems overlap — ${step.toFixed(2)}px of arc for a ${(w * Math.SQRT2).toFixed(2)}px diamond`);
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

const css = readFileSync(new URL("../styles/token.css", import.meta.url), "utf8");
assert.match(css, /\.er-hope i\{[^}]*transform:rotate\(var\(--a,0deg\)\) translateY\(var\(--hope-r\)\) rotate\(45deg\)/s,
  "the gems are placed by angle on the circle, not laid out in a row");
assert.doesNotMatch(css, /\.er-hope\{[^}]*display:flex/s,
  "a flex row is the one thing the 60 degree opening is not");
assert.match(css, /\.er-hope i\.spend::after\{animation:tkHopeOut/);
assert.match(css, /\.er-hope i\.gain::after\{animation:tkHopeIn/);
assert.match(css, /\.dh\.tok \.tkcond \.tkwr text\{[^}]*paint-order:stroke fill/s,
  "the sentence needs its stroke painted UNDER the fill or it loses half its weight");
assert.match(css, /\.dh\.tok \.tkcond \.tkwr text\{[^}]*fill:color-mix\(in srgb,var\(--tkc/s,
  "the sentence carries the condition's own material colour");

console.log("token hope: gems on the circle at a fixed pitch, no overlap, sentence armoured and tinted");
