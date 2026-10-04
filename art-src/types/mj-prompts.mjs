/* Prints the Midjourney prompt for each item mark, one per line, ready to paste.
 *
 * The subject is the only thing that varies between marks; the tail below is
 * the same for every one of them, and it is what makes the set read as one
 * family with the class sigils and the domain marks. Change it here and every
 * mark has to be regenerated, or the set splits in two.
 *
 * Run against Midjourney v8.2, square, with --raw. Save the variant named in
 * subjects.tsv's Pick column as generated/<name>.png, then trace:
 *
 *   node art-src/types/mj-prompts.mjs            # every mark
 *   node art-src/types/mj-prompts.mjs loot gear  # just these
 *   node tools/make-type-marks.mjs
 */
import { readFileSync } from "node:fs";

export const STYLE =
  "abstract symbol, no people, no creature, bold heavy solid silhouette with thick tapering limbs, " +
  "flat white vector art on black background, centered, no border, game design assets, " +
  "modern clean high fantasy aesthetics, high complexity --raw";

const rows = readFileSync(new URL("subjects.tsv", import.meta.url), "utf8")
  .split(/\r?\n/)
  .filter((l) => l.trim() && !l.startsWith("#"))
  .map((l) => l.split("\t").map((c) => c.trim()));

const want = new Set(process.argv.slice(2));
for (const [name, subject] of rows)
  if (!want.size || want.has(name)) console.log(`${name}\tan icon of ${subject}, ${STYLE}`);
