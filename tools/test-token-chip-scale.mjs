/**
 * The token chip's two scales.
 *
 * `tools/verify/` checks these too, and in one respect better: it is the
 * only place that can prove the *stylesheet reads them*. It is also a page
 * a person has to open, and this is arithmetic — the shape of thing that
 * can be silently wrong for a month and looks perfectly fine on screen the
 * whole time, because a chip drawn at the wrong radius is still a chip.
 * So the numbers are asserted here, where `npm run typecheck` runs them
 * and the release workflow runs them before it spends a version.
 *
 * What is worth checking is not the multiplication. It is the four
 * decisions the multiplication encodes, and every one of them is a thing
 * somebody could reasonably rewrite the other way:
 *
 *   - the two fit modes are ONE texture read two ways, so the constants
 *     are reciprocals and editing one without the other is a bug
 *   - the readout is FLOORED at the grid cell and Vulnerable is not
 *   - subject scale moves the ring in opposite directions in the two
 *     modes, which is the same sentence read from either end
 *   - the dial multiplies both
 */

import assert from "node:assert/strict";

import { RING_HOLE, RING_IN, RING_OUT, RING_RIM, chipScale } from "../src/module/ui/token.js";

const near = (a, b, why) => assert.ok(Math.abs(a - b) < 5e-4, `${why}: ${a} vs ${b}`);

/* ── the constants are Foundry's, not ours ─────────────────────────
   rings-steel.json publishes `defaultColorBand: {startRadius: .666,
   endRadius: .7225}` — the edge of the subject's hole and the edge of the
   visible band. Every number below is those two and nothing else, which
   is what makes this a derivation rather than a fitted constant. */
near(RING_HOLE, 0.666, "the subject hole");
near(RING_RIM, 0.7225, "the band's rim");
near(RING_OUT, RING_RIM / RING_HOLE, "subject fit is the rim over the hole");
near(RING_IN, RING_HOLE / RING_RIM, "grid fit is the hole over the rim");
near(RING_OUT * RING_IN, 1, "the two fit modes are one texture read two ways");

/* ── a plain token is unchanged ────────────────────────────────────
   The default has to be exactly 1 and not 0.999: every radius in
   token.css multiplies by it, so a chip on a table running none of this
   must land precisely where it landed before any of it existed. */
assert.deepEqual(chipScale(), { readout: 1, subject: 1 });
assert.deepEqual(chipScale({}), { readout: 1, subject: 1 });

/* ── subject fit: the collision this exists for ────────────────────
   The hole is matched to the cell, so the rim lands 1.0848 cells out —
   54.2 in the chip's own units, where the innermost track used to BEGIN
   at 50.2. The two were drawn on top of each other. */
const subjectFit = chipScale({ ring: true });
near(subjectFit.readout, RING_OUT, "subject fit pushes the readout out");
near(subjectFit.subject, 1, "and leaves the creature filling its cell");
assert.ok(50.2 * subjectFit.readout > 50 * RING_OUT, "the pushed track clears the rim");

/* ── grid fit: the opposite arrangement, and the reason for two scales ──
   The rim is matched to the cell, so nothing of Foundry's reaches past
   it and the readout needs no push at all. What moves instead is the
   creature, which is now SMALLER than its cell — and Vulnerable is drawn
   on the creature. A build that used one number for both would pass
   every other assertion in this file and draw VULNERABLE across the
   tracks on every ringed token at the table. */
const gridFit = chipScale({ ring: true, gridFit: true });
near(gridFit.readout, 1, "grid fit needs no push");
near(gridFit.subject, RING_IN, "grid fit pulls Vulnerable in with the artwork");
assert.notEqual(gridFit.readout, gridFit.subject, "the two scales are two claims");

/* ── the floor, which is a decision rather than a clamp ────────────
   A 0.6-scale sprite does not get 0.6-scale tracks. Being countable
   across a whole fight at a glance is the entire job, and two creatures'
   Stress drawn at two sizes for a reason about somebody's PNG is exactly
   what following the art inward would cost. Vulnerable is the exception,
   because it is a claim about the creature rather than a reading off it. */
const small = chipScale({ art: 0.6 });
assert.equal(small.readout, 1, "the readout never comes inside the cell");
near(small.subject, 0.6, "Vulnerable follows the artwork in");

const big = chipScale({ art: 1.5 });
near(big.readout, 1.5, "and it does follow the artwork out");
near(big.subject, 1.5, "so does Vulnerable");

/* A mirrored token carries a negative scale and is the same size. */
near(chipScale({ art: -1.4 }).readout, 1.4, "a mirrored sprite is not a small one");

/* ── subject scale, the one input read rather than measured ────────
   It reaches Foundry's shader as a UV correction, and a UV expanded
   about its centre draws its texture smaller — so a larger subject means
   a relatively smaller ring. That is one sentence, and the two fit modes
   read it from opposite ends: in subject fit it shrinks the rim toward
   the cell, in grid fit it grows the hole toward it. If this turns out to
   be backwards at a real table, `tokenChipScale` is the answer and these
   two assertions are where the correction goes. */
near(chipScale({ ring: true, subject: 1.2 }).readout, 1, "a large subject needs no push");
assert.ok(
  chipScale({ ring: true, subject: 0.5 }).readout > subjectFit.readout,
  "a small subject means a ring that reaches further out",
);
near(
  chipScale({ ring: true, gridFit: true, subject: 1.2 }).subject,
  RING_IN * 1.2,
  "in grid fit a large subject fills more of its cell",
);

/* ── the dial ──────────────────────────────────────────────────────
   World-scoped, a multiplier over the derived answer and never a
   replacement for it, and it moves BOTH — the ask was that it affect
   everything globally, and a dial that pushed the tracks out while
   leaving the word ring where it was would be half a correction. */
const dialled = chipScale({ ring: true, manual: 1.2 });
near(dialled.readout, RING_OUT * 1.2, "the dial multiplies the readout");
near(dialled.subject, 1.2, "and Vulnerable with it");
near(chipScale({ manual: 0.9 }).readout, 0.9, "and it may pull in below the cell");

/* Rubbish in does not become NaN out. Every one of these reaches a
   radius in a stylesheet, and a NaN there is a chip with no tracks at
   all rather than a chip in the wrong place — silent in the worst way. */
for (const bad of [null, undefined, NaN, 0, "", "x"]) {
  const k = chipScale({ ring: true, subject: bad, art: bad, manual: bad });
  assert.ok(Number.isFinite(k.readout) && k.readout > 0, `subject/art/manual ${bad}`);
  assert.ok(Number.isFinite(k.subject) && k.subject > 0, `subject/art/manual ${bad}`);
}

console.log(
  "token chip scale: both fit modes, the floor, subject and art scales, " +
    "the dial and the junk cases covered",
);
