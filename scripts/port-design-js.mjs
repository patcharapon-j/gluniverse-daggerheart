/**
 * Vendors the design prototypes' presentation modules into `src/module/ui/`.
 *
 * These are the components themselves — the mark, the gem, the card, the
 * spine — and they are already correct. Re-authoring them in Svelte would
 * mean re-deriving the arm geometry, the facet ramp and the 1.21% numeral
 * offset from scratch, and every one of those is a place to get it subtly
 * wrong. So they stay as they are: pure functions from data to markup, with
 * no page dependencies, called from Svelte with `{@html}`.
 *
 * The only edits are asset URLs. Anything with prototype *data* in it
 * (sheet.js's PC and KIT, roll.js's own RNG) is not vendored — the system
 * has an actor for that.
 *
 * Re-runnable: design/ stays the source of truth.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SRC = resolve("design");
const OUT = resolve("src/module/ui");

/** Pure presentation. No demo data, no page globals. */
const MODULES = [
  "settle.js",
  "mark.js",
  "gem.js",
  "pool.js",
  "card.js",
  "tile.js",
  "domains.js",
  "peek.js",
  "track.js",
  "swap.js",
  "menu.js",
  "prep.js",
  "make.js",
];

mkdirSync(OUT, { recursive: true });

for (const name of MODULES) {
  let js = readFileSync(join(SRC, name), "utf8");
  js = js.replaceAll("/design/assets/", "systems/gluniverse-daggerheart/assets/");

  const header =
    `/* Vendored from design/${name} by scripts/port-design-js.mjs — do not edit here.\n` +
    `   Edit design/${name} and re-run \`node scripts/port-design-js.mjs\`. */\n`;

  writeFileSync(join(OUT, name), header + js);
  console.log(`${name.padEnd(12)} ${js.length} bytes`);
}
