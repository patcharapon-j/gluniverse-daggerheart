/**
 * What stops the equipment tables rotting.
 *
 * `tools/check-cards.mjs` has an easy job by comparison: there is a fetched
 * snapshot of what every card *should* say, so it can re-derive the
 * hand-authored copy and compare meaning. Equipment has no upstream — chapter 2
 * is the only place these numbers exist and they are typed in by hand — so
 * there is nothing to compare against and a check that tried would be checking
 * the transcription against itself.
 *
 * So it checks the thing a transcription actually gets wrong: **structure**.
 * The book's equipment tables are extremely regular, and every one of those
 * regularities is a statement that can be falsified:
 *
 *   - every tier reprints the same fifteen physical primaries, ten magic
 *     primaries, seven secondaries and four armors, under a tier prefix;
 *   - every secondary is One-Handed, which is what makes it a secondary;
 *   - both d12 tables run 1 to 60 with no gaps and no repeats;
 *   - every trait, range, burden and damage die is a value the system's own
 *     closed sets contain.
 *
 * Naming the staples rather than counting them is the load-bearing choice.
 * A count catches a deleted line; it does not catch the failure that actually
 * happens when you copy a table by hand, which is transcribing one row twice
 * and its neighbour not at all. The count is right and the table is wrong.
 *
 * It also asserts the handful of facts **character creation depends on**, so
 * that a change to the tables cannot quietly empty a step of the creation
 * flow: there is at least one tier-1 two-handed weapon, at least one tier-1
 * one-handed primary and one secondary, at least one tier-1 armor, and both
 * starting potions exist under the names the flow asks for.
 *
 *     node tools/check-equipment.mjs
 *
 * Offline and deterministic — it imports the source and nothing else. Wired
 * into `npm run build:packs` ahead of the build, so a bad edit fails rather
 * than ships.
 */

import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (f) => pathToFileURL(join(ROOT, "src", "packs-src", f)).href;

const {
  ARMOR,
  PRIMARY_MAGIC,
  PRIMARY_PHYSICAL,
  SECONDARY,
  STAPLES,
  TIER_PREFIX,
  WHEELCHAIRS,
} = await import(src("equipment-tables.mjs"));
const { CONSUMABLES, ITEMS, STARTING_POTIONS } = await import(src("loot-tables.mjs"));
const equipment = (await import(src("equipment.mjs"))).default;

/* The closed sets, restated. Importing them from `config.ts` would mean
   running TypeScript in a plain node script; they are six words and they have
   not changed since the system was written. A mismatch here is a schema change
   that should be noticed, which is the point. */
const TRAITS = ["agility", "strength", "finesse", "instinct", "presence", "knowledge"];
const RANGES = ["melee", "veryClose", "close", "far", "veryFar"];
const BURDENS = ["oneHanded", "twoHanded"];
const DICE = ["d4", "d6", "d8", "d10", "d12", "d20"];
const TIERS = [1, 2, 3, 4];

const problems = [];
const bad = (msg) => problems.push(msg);

/* ── the staples ──────────────────────────────────────────────────────
   Tier 1 defines the list; tiers 2–4 must reprint it under their prefix.
   Extras are fine and expected — every tier above 1 adds unique weapons —
   so this is a subset test, not an equality one. */

function staples(label, table, names) {
  for (const tier of TIERS) {
    const rows = table[tier] ?? [];
    const have = new Set(rows.map((r) => r.name));
    const prefix = TIER_PREFIX[tier];

    for (const base of names) {
      const want = prefix ? `${prefix} ${base}` : base;
      if (!have.has(want)) bad(`${label} tier ${tier}: missing "${want}"`);
    }

    const seen = new Set();
    for (const r of rows) {
      if (seen.has(r.name)) bad(`${label} tier ${tier}: "${r.name}" appears twice`);
      seen.add(r.name);
    }
  }
}

staples("primary physical", PRIMARY_PHYSICAL, STAPLES.primaryPhysical);
staples("primary magic", PRIMARY_MAGIC, STAPLES.primaryMagic);
staples("secondary", SECONDARY, STAPLES.secondary);
staples("armor", ARMOR, STAPLES.armor);

/* ── the values ───────────────────────────────────────────────────────
   Every one of these lands in a `choice()` field, which throws on an unknown
   value — at *load* time, inside Foundry, on a pack that has already shipped.
   Catching it here costs nothing. */

const damageRx = /^d\d+(\+\d+)?$/;

function weapons(label, rows, { secondary = false } = {}) {
  for (const r of rows) {
    const at = `${label}: ${r.name}`;
    if (!TRAITS.includes(r.trait)) bad(`${at} — trait "${r.trait}"`);
    if (!RANGES.includes(r.range)) bad(`${at} — range "${r.range}"`);
    if (!BURDENS.includes(r.burden)) bad(`${at} — burden "${r.burden}"`);
    if (!damageRx.test(r.damage)) bad(`${at} — damage "${r.damage}"`);
    else if (!DICE.includes(/^d\d+/.exec(r.damage)[0])) bad(`${at} — die "${r.damage}"`);
    // The one structural fact about the secondary table. A two-handed
    // secondary would mean a character holding three hands' worth of weapon
    // and the creation flow's burden arithmetic silently letting them.
    if (secondary && r.burden !== "oneHanded") bad(`${at} — a secondary weapon must be One-Handed`);
    if (r.feature && !r.feature.name) bad(`${at} — a feature with no name`);
  }
}

for (const tier of TIERS) {
  weapons(`primary physical tier ${tier}`, PRIMARY_PHYSICAL[tier] ?? []);
  weapons(`primary magic tier ${tier}`, PRIMARY_MAGIC[tier] ?? []);
  weapons(`secondary tier ${tier}`, SECONDARY[tier] ?? [], { secondary: true });

  for (const r of ARMOR[tier] ?? []) {
    const at = `armor tier ${tier}: ${r.name}`;
    if (!(r.major > 0) || !(r.severe > r.major)) {
      bad(`${at} — thresholds ${r.major}/${r.severe} (severe must exceed major)`);
    }
    if (!(r.score > 0)) bad(`${at} — base score ${r.score}`);
  }
}

weapons("wheelchairs", WHEELCHAIRS);
for (const r of WHEELCHAIRS) {
  if (!TIERS.includes(r.tier)) bad(`wheelchairs: ${r.name} — tier ${r.tier}`);
}

/* ── the two d12 tables ───────────────────────────────────────────────
   1 to 60, each exactly once. A gap or a repeat means a GM rolling that
   number gets nothing or gets an ambiguity, and neither says so. */

function table(label, rows) {
  const byRoll = new Map();
  for (const r of rows) {
    if (byRoll.has(r.roll)) bad(`${label}: roll ${r.roll} is both "${byRoll.get(r.roll)}" and "${r.name}"`);
    byRoll.set(r.roll, r.name);
    if (!String(r.description ?? "").trim()) bad(`${label}: "${r.name}" has no text`);
  }
  for (let n = 1; n <= 60; n++) if (!byRoll.has(n)) bad(`${label}: no row for roll ${n}`);
  if (rows.length !== 60) bad(`${label}: ${rows.length} rows, expected 60`);
}

table("items", ITEMS);
table("consumables", CONSUMABLES);

/* ── what character creation needs ────────────────────────────────────
   Every one of these is a step of `apps/creation.ts` that would silently
   offer an empty list if the tables changed underneath it. A creation flow
   with nothing to choose from looks like a bug in the window. */

const t1primary = [...(PRIMARY_PHYSICAL[1] ?? []), ...(PRIMARY_MAGIC[1] ?? [])];

if (!t1primary.some((r) => r.burden === "twoHanded")) {
  bad("creation: no tier 1 two-handed primary weapon");
}
if (!t1primary.some((r) => r.burden === "oneHanded")) {
  bad("creation: no tier 1 one-handed primary weapon");
}
if (!(SECONDARY[1] ?? []).length) bad("creation: no tier 1 secondary weapons");
if (!(ARMOR[1] ?? []).length) bad("creation: no tier 1 armor");
if (!PRIMARY_MAGIC[1]?.length) bad("creation: no tier 1 magic weapons for a spellcaster to take");

/* The window looks these two up **by name**, because a name is what it draws
   and a roll number is not. So the check has to hold both ends: the row is
   still at the number, and the row at that number is still called what the
   window will go looking for. Either half moving on its own is a step that
   silently offers nothing. */
const POTION_NAMES = ["Minor Health Potion", "Minor Stamina Potion"];
for (const roll of STARTING_POTIONS) {
  const row = CONSUMABLES.find((c) => c.roll === roll);
  if (!row) bad(`creation: starting potion roll ${roll} is not in the consumable table`);
  else if (!POTION_NAMES.includes(row.name)) {
    bad(`creation: consumable ${roll} is "${row.name}", and the creation flow asks for one of ${POTION_NAMES.join(" / ")}`);
  }
}

/* ── the documents ────────────────────────────────────────────────────
   One last pass over what the pack will actually contain. `build-packs.mjs`
   derives an id from type + name and throws on a collision, which is the same
   check from the other end — but it throws *during a build*, and a name
   collision between a tier-2 weapon and a loot item is a content mistake worth
   hearing about before then. */

const byKey = new Map();
for (const doc of equipment) {
  const key = `${doc.type}:${doc.name}`;
  if (byKey.has(key)) bad(`two documents share type and name: ${key}`);
  byKey.set(key, doc);
  if (!doc.img) bad(`${doc.name} has no img`);
  if (!doc.folder) bad(`${doc.name} is not in a folder`);
}

/* ── report ───────────────────────────────────────────────────────────── */

const counts = equipment.reduce((m, d) => ((m[d.type] = (m[d.type] ?? 0) + 1), m), {});

if (problems.length) {
  console.error(`Equipment tables have ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}

console.log("Equipment tables check out.");
console.log(
  `  ${equipment.length} documents — ` +
    Object.entries(counts)
      .sort()
      .map(([k, n]) => `${n} ${k}`)
      .join(", "),
);
