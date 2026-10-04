/**
 * Does every hand-marked focus point still point at a painting?
 *
 * `assets/cards/card-focus.json` is the one file in this repo that holds pure
 * judgement. Every other fact about a card is derivable or printed upstream —
 * `_helpers.mjs` *derives* the painting's path from the card's name, and
 * `check-cards.mjs` proves the derivation lands on disk. A focus point cannot
 * be derived from anything: somebody looked at 291 paintings and marked, by
 * hand, the share across and the share down where the subject's face is, so
 * that `design/framing.js` can cut a wide landscape into a narrow plate without
 * taking the head off. Re-marking one is a minute with the art open. Re-marking
 * all of them is an afternoon.
 *
 * Which makes the file's failure mode the expensive kind: it is keyed by path,
 * and a path is the one thing about a painting that moves. Rename a card and
 * `cardArt` renames its file with it — that is the point of deriving — and the
 * focus entry stays behind, keyed to a file nobody serves. Nothing breaks. The
 * painting still draws, because `framing.js` falls back to the whole image when
 * it has no focus, and the whole image is what the plate showed before any of
 * this existed. So the only symptom is that one card's crop quietly goes back
 * to centred, on one surface a reviewer probably is not looking at, and the
 * marking is lost without a single error anywhere.
 *
 * Four assertions, which is all the file can be wrong in:
 *
 *   1. it parses, and parses to an object. A JSON file edited by hand at 291
 *      entries is one trailing comma from being a file that imports as
 *      `undefined`, and `Object.hasOwn(undefined, path)` throws inside a card
 *      builder rather than here;
 *   2. every key resolves to a file that exists under `assets/cards/`. This is
 *      the orphan above — the whole reason the check exists;
 *   3. every painting under `assets/cards/` has a key. The reverse gap, and the
 *      cheaper one: a new painting arrives unmarked and draws centred. It is
 *      still a failure, because the centred crop is the bug `framing.js` was
 *      written to end, and "the art looks wrong on compact cards" is a report
 *      nobody files;
 *   4. the values are in range and are the shape `framedRegion` spends — two
 *      numbers in 0..1, and an optional `scale` no smaller than `SMALLEST_CROP`.
 *      `scale` is a divisor in there: a zero is an infinite magnification and a
 *      typo'd `0.02` is a dozen pixels across a whole card.
 *
 * Keys are the full `systems/gluniverse-daggerheart/...` path, not a path
 * relative to this folder, so that a lookup is the document's own `img` and
 * nothing in between does string surgery on it. The web app's copy of this file
 * strips that prefix because it serves the paintings from somewhere else; here
 * the prefix is the truth and stripping it would be the surgery.
 *
 *     node tools/check-focus-points.mjs
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, posix, relative, sep } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The prefix every key carries: what Foundry serves this system's files under. */
const SYSTEM = "systems/gluniverse-daggerheart/";
const CARDS = "assets/cards";

/** The smallest close-up a marking may ask for — `design/framing.js`'s floor. */
const SMALLEST_CROP = 0.05;

/** What counts as a painting. CREDITS.md and this file itself are not. */
const PAINTING = /\.(webp|png|jpe?g|avif)$/i;

const fail = [];
const want = (ok, why) => ok || fail.push(why);

/* ── 1. it parses, and parses to a map ──────────────────────────────── */

const file = join(CARDS, "card-focus.json");
let focus;
try {
  focus = JSON.parse(readFileSync(join(root, file), "utf8"));
} catch (error) {
  console.error(`focus points: ${file} does not parse\n\n  ${error.message}\n`);
  console.error(
    "291 markings are an afternoon with the art open. A trailing comma here\n" +
      "imports as undefined and throws inside a card builder instead.",
  );
  process.exit(1);
}

if (!focus || typeof focus !== "object" || Array.isArray(focus)) {
  console.error(`focus points: ${file} is not an object of path to focus point.`);
  process.exit(1);
}

const marked = Object.keys(focus);

/* ── the paintings actually on disk ─────────────────────────────────── */

/** Every painting under `assets/cards/`, as the key it would be filed under. */
const paintings = (function walk(dir) {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(join(dir, entry.name))
      : PAINTING.test(entry.name)
        ? [SYSTEM + relative(root, join(root, dir, entry.name)).split(sep).join(posix.sep)]
        : [],
  );
})(CARDS);

/* ── 2. every marking points at a painting ──────────────────────────── */

const onDisk = new Set(paintings);
const orphans = marked.filter((key) => !onDisk.has(key));
for (const key of orphans) {
  want(
    false,
    `${key} is marked and is not there. A renamed card takes its painting with ` +
      "it and leaves the marking behind, and the card then draws centred with " +
      "no error anywhere",
  );
}

/* Caught separately because it is a different mistake with the same symptom:
   the key is a real painting written the wrong way round, so the marking is
   present, correct and unreachable. */
for (const key of orphans) {
  const tail = key.slice(key.lastIndexOf("/") + 1);
  const near = paintings.filter((p) => p.endsWith(`/${tail}`));
  if (near.length) {
    want(false, `  ...though ${tail} does exist, at ${near.join(" and ")}`);
  }
}

/* ── 3. every painting is marked ────────────────────────────────────── */

const unmarked = paintings.filter((key) => !Object.hasOwn(focus, key));
for (const key of unmarked) {
  want(
    false,
    `${key} has no focus point. It will draw from the middle of the frame, ` +
      "which is the crop the whole file exists to replace — and it looks " +
      "right at card size and takes the face off at compact size",
  );
}

/* ── 4. the values are what framedRegion spends ─────────────────────── */

const share = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

for (const [key, point] of Object.entries(focus)) {
  if (!point || typeof point !== "object" || Array.isArray(point)) {
    want(false, `${key} is marked with ${JSON.stringify(point)}, not a focus point`);
    continue;
  }
  for (const axis of ["x", "y"]) {
    want(
      share(point[axis]),
      `${key} has ${axis} of ${JSON.stringify(point[axis])}. A focus point is ` +
        "a share of the painting, across and down, so both axes sit in 0..1",
    );
  }
  if (Object.hasOwn(point, "scale")) {
    want(
      share(point.scale) && point.scale >= SMALLEST_CROP,
      `${key} asks for a scale of ${JSON.stringify(point.scale)}. The close-up ` +
        `divides by it, so it sits between ${SMALLEST_CROP} and 1 — below that ` +
        "it is a handful of pixels blown across a whole card",
    );
  }
  for (const extra of Object.keys(point)) {
    want(
      ["x", "y", "scale"].includes(extra),
      `${key} carries a "${extra}". framedRegion reads x, y and scale and ` +
        "nothing else, so anything more is a marking that does not apply",
    );
  }
}

/* ── report ─────────────────────────────────────────────────────────── */

if (fail.length) {
  const one = fail.length === 1;
  console.error(`focus points: ${fail.length} marking${one ? "" : "s"} adrift\n`);
  for (const f of fail) console.error(`  ${f}`);
  console.error(
    "\nEvery one of these is a judgement somebody made with the art open, and\n" +
      "a lost one costs an afternoon rather than a rebuild. The card keeps\n" +
      "drawing either way, which is why nothing else catches it.",
  );
  process.exit(1);
}

console.log(
  `focus points: ${marked.length} paintings, every one marked, every marking on disk.`,
);
