/*
 * Audits the gear marks against the names that have to reach them.
 *
 *     node tools/check-item-kinds.mjs
 *     node tools/check-item-kinds.mjs --report   # print the coverage too
 *
 * ── why this exists ───────────────────────────────────────────────────
 * `src/module/ui/item-kind.js` reads a weapon's kind off its name, because
 * nothing in `WeaponData` records whether a thing is a bow or a hammer. That
 * makes two failures possible that nothing else in the repo would catch, and
 * both of them are silent.
 *
 * The first is a key with no art. `kindOf` returns "crossbow" and the sheet
 * asks for `assets/types/crossbow.svg`; a missing file resolves to an empty
 * string and the card draws an *empty* gem rather than a wrong one. The pack
 * build is worse: it writes the path into 428 weapon documents, and a broken
 * image is what every gear row shows from then on.
 *
 * The second is art with no key. A mark that nothing in the compendium can
 * name is a file that ships and never renders, and the way that happens is a
 * pattern edited in `item-kind.js` without the drawing being removed.
 *
 * So: every name in the tables has a file, every file is reachable, and no
 * mark is reachable by fewer than MIN names. The last one is the one that
 * catches a pattern narrowed by accident, which neither of the others would.
 *
 * Coverage itself is deliberately *not* asserted as a percentage. A Bellamoi
 * Fine Armor says nothing about what kind of armor it is and is supposed to
 * floor; demanding a number here would only invite a regex that matches
 * everything.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const report = process.argv.includes("--report");

const { KIND_GLYPHS, kindOf } = await import(pathToFileURL(join(root, "src/module/ui/item-kind.js")).href);

/* The floors, which are `GLYPHS` members and are checked for a file too: a
   name the tables cannot read is far more common than one they can. */
const FLOORS = ["primary", "secondary", "armor", "consumable", "loot"];

/** A mark reachable by fewer names than this is almost certainly a typo. */
const MIN = 2;

const tables = await Promise.all(
  [
    "equipment-tables.mjs",
    "hf-equipment-tables.mjs",
    "loot-tables.mjs",
    "hf-loot-tables.mjs",
  ].map((f) => import(pathToFileURL(join(root, "src/packs-src", f)).href)),
);

/* The four files nest their rows differently and none of them exports a flat
   list of names, so pull every string that sits where a name sits. An extra
   string here costs nothing: it either classifies or it floors. */
const names = (v, out = []) => {
  if (Array.isArray(v)) {
    if (typeof v[0] === "string" && typeof v[1] !== "object") out.push(v[0]);
    for (const x of v) names(x, out);
  } else if (v && typeof v === "object") {
    if (typeof v.name === "string") out.push(v.name);
    for (const x of Object.values(v)) names(x, out);
  }
  return out;
};

const [eq, hf, lt, hl] = tables;
const corpus = {
  weapon: names([eq.PRIMARY_PHYSICAL, eq.PRIMARY_MAGIC, eq.SECONDARY, eq.WHEELCHAIRS,
                 hf.PRIMARY_PHYSICAL, hf.PRIMARY_MAGIC, hf.SECONDARY]),
  armor: names([eq.ARMOR, hf.ARMOR]),
  consumable: names([lt.CONSUMABLES, hl.CONSUMABLES]),
  loot: names([lt.ITEMS, hl.ITEMS]),
};

const fails = [];
const reach = Object.fromEntries(KIND_GLYPHS.map((k) => [k, 0]));

for (const [type, list] of Object.entries(corpus)) {
  for (const name of new Set(list)) {
    const kind = kindOf(type, name);
    if (kind) reach[kind] += 1;
  }
}

for (const kind of [...KIND_GLYPHS, ...FLOORS]) {
  const file = join(root, "design/assets/types", `${kind}.svg`);
  if (!existsSync(file)) fails.push(`no art for "${kind}": design/assets/types/${kind}.svg is missing`);
}

for (const [kind, n] of Object.entries(reach)) {
  if (n < MIN) fails.push(`"${kind}" is reachable by ${n} name${n === 1 ? "" : "s"}, under the floor of ${MIN}`);
}

if (report) {
  for (const [type, list] of Object.entries(corpus)) {
    const uniq = [...new Set(list)];
    const hit = uniq.filter((n) => kindOf(type, n)).length;
    console.log(`${type}: ${hit}/${uniq.length} named, the rest floor`);
  }
  console.log(
    Object.entries(reach).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`).join("  "),
  );
}

if (fails.length) {
  console.error(fails.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}

console.log(`item kinds ok: ${KIND_GLYPHS.length} marks, all drawn and all reachable`);
