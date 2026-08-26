/**
 * What stops the variant equipment tables rotting.
 *
 * `tools/check-equipment.mjs` is the model and its header is the argument:
 * there is no upstream for a chapter of equipment — the Card Creator publishes
 * cards, and a Butcher's Axe is not a card — so there is nothing to compare a
 * transcription against, and a check that tried would be checking the
 * transcription against itself. So it checks the thing a transcription actually
 * gets wrong: **structure**. Every regularity the printed table obeys is a
 * statement that can be falsified.
 *
 *     node tools/check-variants.mjs
 *
 * Offline and deterministic — it imports the source and reads one TypeScript
 * file as text, and nothing else.
 *
 * ── the regularities are not chapter 2's ──────────────────────────────
 * The corebook's tables are regular in one particular way: every tier reprints
 * the same fifteen physical primaries, ten magic primaries, seven secondaries
 * and four armours under a tier prefix. That is why `check-equipment.mjs`
 * **names** its staples rather than counting them — a count catches a deleted
 * line, and the failure that actually happens when you copy a table by hand is
 * transcribing one row twice and its neighbour not at all, where the count is
 * right and the table is wrong.
 *
 * These tables have no reprint to check, because they do not reprint: a tier
 * ladder here lives in **one cell** of one row, and `variants.mjs` is what
 * expands it. So the duplicate-row failure has a different shape and needs
 * different statements:
 *
 *   - a row transcribed twice is a **repeated name inside one table**, which is
 *     directly detectable and is checked;
 *   - a row lost is a **row count**, which the extraction states per table and
 *     is checked against;
 *   - and the failure the corebook cannot have at all is a **rung lost off a
 *     ladder** — a four-tier cell transcribed with three tiers, or the second
 *     tier's bonus mistyped. That is the interesting one, and it is caught by
 *     the ladders' own arithmetic rather than by a count: within a row, the die
 *     never changes, the damage type never changes, and the bonus climbs by a
 *     **constant step**. All eleven laddered rows in the chapter obey all
 *     three. A transposed digit breaks the step; a dropped rung breaks the tier
 *     set, which every row of a table must agree on.
 *
 * It also asserts what the pack owes the rest of the system: every trait,
 * range, burden and die is a value the closed sets contain; every secondary is
 * One-Handed; every document lands in a folder `src/module/variants.ts`
 * declares; and **no document name collides with one already in the equipment
 * pack**, because two different weapons answering one compendium search is a
 * content mistake nothing else in the build would notice — `build-packs.mjs`
 * derives an id from `pack:type:name` and would happily give a Chain Whip in
 * one pack and a Whip in another two perfectly good ids.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (f) => pathToFileURL(join(ROOT, "src", "packs-src", f)).href;

const { VARIANT_GEAR, TIER_PREFIX, splitPrinted } = await import(src("variant-tables.mjs"));
const variants = (await import(src("variants.mjs"))).default;
const equipment = (await import(src("equipment.mjs"))).default;

/* The closed sets, restated. Importing them from `config.ts` would mean running
   TypeScript in a plain node script; they are six words and they have not moved
   since the system was written. A mismatch here is a schema change that should
   be noticed, which is the point — `check-equipment.mjs` says the same. */
const TRAITS = ["agility", "strength", "finesse", "instinct", "presence", "knowledge"];
const RANGES = ["melee", "veryClose", "close", "far", "veryFar"];
const BURDENS = ["oneHanded", "twoHanded"];
const DICE = ["d4", "d6", "d8", "d10", "d12", "d20"];

const problems = [];
const bad = (msg) => problems.push(msg);

/* ── the folders ──────────────────────────────────────────────────────
   `variants.mjs` restates `VARIANT_FOLDERS` because a `.mjs` pack source
   cannot import TypeScript, and this is what makes the restatement safe. Read
   as **text** rather than instantiated, which is `check-item-sheet.mjs`'s move
   and for its reason: the module imports `config.ts` and a plain node script
   cannot run it. A regex over one object literal is not a parser and is not
   trying to be — it catches the mistake that actually happens here, which is a
   folder renamed on one side of the wire. */

const variantsTs = readFileSync(join(ROOT, "src", "module", "variants.ts"), "utf8");
const foldersBlock = /VARIANT_FOLDERS[^=]*=\s*\{([\s\S]*?)\n\}/.exec(variantsTs);

const DECLARED = new Set();
if (!foldersBlock) {
  bad("src/module/variants.ts: could not find the VARIANT_FOLDERS literal — has it been renamed?");
} else {
  for (const [, name] of foldersBlock[1].matchAll(/:\s*"([^"]+)"/g)) DECLARED.add(name);
  if (!DECLARED.size) bad("src/module/variants.ts: VARIANT_FOLDERS declares no folder names");
}

/* ── the row counts the extraction states ─────────────────────────────
   Per printed table, from the SRD 2.0 pages this chapter occupies. A count
   cannot prove a table is right and it is the only thing that catches a table
   silently shrinking, so it is here beside the statements that can. */

const ROWS = {
  everydayHero: { primaryPhysical: 15, primaryMagic: 10, secondary: 7, armor: 4 },
  western: { primary: 3, secondary: 2, consumables: 1 },
  monsterHunting: { primary: 3, secondary: 3, armor: 3 },
};

/**
 * How many tiers each variant's tables print, and it is a per-variant fact.
 *
 * Everyday Hero prints **no tier ladder at all** — its four tables are a
 * one-for-one reskin of chapter 2's tier-1 kit, for a character who owns a
 * kitchen rather than an armoury — so every row is tier 1 and only tier 1.
 * Western and Monster Hunting print all four in one cell. A row that disagrees
 * with its own variant is a rung gained or lost.
 */
const TIERS_OF = { everydayHero: [1], western: [1, 2, 3, 4], monsterHunting: [1, 2, 3, 4] };

const sameSet = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/* ── the tables ───────────────────────────────────────────────────────── */

for (const [variant, tables] of Object.entries(VARIANT_GEAR)) {
  const want = ROWS[variant];
  if (!want) {
    bad(`${variant}: a table set with no expected row counts — add it to ROWS`);
    continue;
  }

  for (const group of Object.keys(want)) {
    if (!tables[group]) bad(`${variant}: the "${group}" table is missing entirely`);
  }

  for (const [group, rows] of Object.entries(tables)) {
    const label = `${variant}/${group}`;

    if (want[group] === undefined) bad(`${label}: an unexpected table — add its printed row count to ROWS`);
    else if (rows.length !== want[group]) bad(`${label}: ${rows.length} rows, the page prints ${want[group]}`);

    const seen = new Set();
    for (const row of rows) {
      if (seen.has(row.name)) bad(`${label}: "${row.name}" appears twice`);
      seen.add(row.name);
      if (row.feature && !row.feature.name) bad(`${label}: ${row.name} — a feature with no name`);
    }

    if (group === "consumables") {
      for (const row of rows) {
        if (!String(row.description ?? "").trim()) bad(`${label}: "${row.name}" has no text`);
      }
      continue;
    }

    if (group === "armor") armor(label, rows, TIERS_OF[variant]);
    else weapons(label, rows, TIERS_OF[variant], { secondary: group === "secondary" });
  }
}

/**
 * One weapon table.
 *
 * The ladder checks are the load-bearing half. A weapon's four printed cells
 * differ in exactly one way — the bonus — and they differ by a constant amount,
 * so a mistyped digit is visible without anything to compare against.
 */
function weapons(label, rows, tiers, { secondary }) {
  for (const row of rows) {
    const at = `${label}: ${row.name}`;

    if (!TRAITS.includes(row.trait)) bad(`${at} — trait "${row.trait}"`);
    if (!RANGES.includes(row.range)) bad(`${at} — range "${row.range}"`);
    if (!BURDENS.includes(row.burden)) bad(`${at} — burden "${row.burden}"`);

    // The one structural fact about a secondary table. A two-handed secondary
    // would mean a character holding three hands' worth of weapon, with the
    // creation flow's burden arithmetic silently letting them.
    if (secondary && row.burden !== "oneHanded") bad(`${at} — a secondary weapon must be One-Handed`);

    const printed = Object.keys(row.damage).map(Number).sort((x, y) => x - y);
    if (!sameSet(printed, tiers)) {
      bad(`${at} — prints tiers ${printed.join("/") || "none"}, and this table's rows print ${tiers.join("/")}`);
      continue;
    }

    let die = null;
    let type = null;
    let step = null;
    let prev = null;

    for (const tier of tiers) {
      let cell;
      try {
        cell = splitPrinted(row.damage[tier]);
      } catch (e) {
        bad(`${at} tier ${tier} — ${e.message}`);
        continue;
      }

      const m = /^(d\d+)(?:\+(\d+))?$/.exec(cell.damage);
      const [, d, bonusText] = m;
      const bonus = Number(bonusText ?? 0);

      if (!DICE.includes(d)) bad(`${at} tier ${tier} — die "${d}"`);

      // A ladder is one weapon getting better, so the die and the damage type
      // are the same weapon's at every rung. Either changing is a cell copied
      // off the wrong row.
      if (die === null) die = d;
      else if (d !== die) bad(`${at} — die changes from ${die} to ${d} at tier ${tier}`);

      if (type === null) type = cell.magic;
      else if (cell.magic !== type) bad(`${at} — damage type changes at tier ${tier}`);

      // And the bonus climbs by a constant. Every laddered row in the chapter
      // does, which makes a transposed digit falsifiable with nothing to
      // compare it against.
      if (prev !== null) {
        const d1 = bonus - prev;
        if (step === null) step = d1;
        else if (d1 !== step) {
          bad(`${at} — the bonus climbs by ${step} and then by ${d1} at tier ${tier}`);
        }
        if (d1 <= 0) bad(`${at} — the bonus does not climb at tier ${tier} (${prev} → ${bonus})`);
      }
      prev = bonus;
    }
  }
}

/** One armour table. Monster Hunting's is the only one that ladders three
    columns; Everyday Hero's has one rung and skips the climb checks by
    construction, since there is nothing to climb from. */
function armor(label, rows, tiers) {
  for (const row of rows) {
    const at = `${label}: ${row.name}`;

    const thresholds = Object.keys(row.thresholds).map(Number).sort((x, y) => x - y);
    const scores = Object.keys(row.score).map(Number).sort((x, y) => x - y);

    if (!sameSet(thresholds, tiers)) {
      bad(`${at} — thresholds print tiers ${thresholds.join("/") || "none"}, expected ${tiers.join("/")}`);
      continue;
    }
    // The two numeric columns are laddered independently on the page, so they
    // are two chances to lose a rung and they are checked separately.
    if (!sameSet(scores, tiers)) {
      bad(`${at} — base score prints tiers ${scores.join("/") || "none"}, expected ${tiers.join("/")}`);
      continue;
    }

    let prevMajor = null;
    let prevSevere = null;
    let prevScore = null;

    for (const tier of tiers) {
      const pair = row.thresholds[tier];
      if (!Array.isArray(pair) || pair.length !== 2) {
        bad(`${at} tier ${tier} — thresholds are not a [major, severe] pair`);
        continue;
      }
      const [major, severe] = pair;
      const score = row.score[tier];

      if (!(major > 0) || !(severe > major)) {
        bad(`${at} tier ${tier} — thresholds ${major}/${severe} (severe must exceed major)`);
      }
      if (!(score > 0)) bad(`${at} tier ${tier} — base score ${score}`);

      // Armour gets better with the tier in all three columns. A pair copied
      // from the row above lands here rather than on somebody's sheet.
      if (prevMajor !== null && major <= prevMajor) bad(`${at} — Major does not climb at tier ${tier}`);
      if (prevSevere !== null && severe <= prevSevere) bad(`${at} — Severe does not climb at tier ${tier}`);
      if (prevScore !== null && score < prevScore) bad(`${at} — base score falls at tier ${tier}`);

      prevMajor = major;
      prevSevere = severe;
      prevScore = score;
    }
  }
}

/* ── the tier prefixes ────────────────────────────────────────────────
   The one thing in this pack that is not printed on the page, so the check
   holds it to being exactly the corebook's three words and nothing wittier. */

for (const [tier, word] of Object.entries({ 2: "Improved", 3: "Advanced", 4: "Legendary" })) {
  if (TIER_PREFIX[tier] !== word) bad(`tier ${tier}'s prefix is "${TIER_PREFIX[tier]}", chapter 2 says "${word}"`);
}

/* ── the documents ────────────────────────────────────────────────────── */

const byKey = new Map();
for (const doc of variants) {
  const key = `${doc.type}:${doc.name}`;
  if (byKey.has(key)) bad(`two documents share type and name: ${key}`);
  byKey.set(key, doc);

  if (!doc.img) bad(`${doc.name} has no img`);
  if (!doc.folder) bad(`${doc.name} is not in a folder`);
  else if (DECLARED.size && !DECLARED.has(doc.folder)) {
    bad(`${doc.name} is filed under "${doc.folder}", which VARIANT_FOLDERS does not declare`);
  }
}

/* The collision check, and it is the one thing here that reaches outside this
   pack. Two documents of the same subtype and name in two mounted compendiums
   are two different objects answering one search, with nothing on either to
   tell them apart — and neither pack's own uniqueness check can see it, because
   each is right about itself. */
const owned = new Set(equipment.map((d) => `${d.type}:${d.name}`));
for (const key of byKey.keys()) {
  if (owned.has(key)) bad(`"${key.split(":").slice(1).join(":")}" is already a ${key.split(":")[0]} in the equipment pack`);
}

/* ── what the tables promise the pack ─────────────────────────────────
   The expansion is arithmetic — rows × the tiers they print — so a builder
   that silently dropped a tier, or a group `variants.mjs` has no case for,
   shows up as a document count that disagrees with the tables. */

let expected = 0;
for (const [variant, tables] of Object.entries(VARIANT_GEAR)) {
  const n = TIERS_OF[variant]?.length ?? 0;
  for (const [group, rows] of Object.entries(tables)) {
    expected += rows.length * (group === "consumables" ? 1 : n);
  }
}
if (variants.length !== expected) {
  bad(`the pack builds ${variants.length} documents, the tables describe ${expected}`);
}

/* ── report ───────────────────────────────────────────────────────────── */

const counts = variants.reduce((m, d) => ((m[d.type] = (m[d.type] ?? 0) + 1), m), {});
const folders = variants.reduce((m, d) => ((m[d.folder] = (m[d.folder] ?? 0) + 1), m), {});

if (problems.length) {
  console.error(`Variant equipment tables have ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}

console.log("Variant equipment tables check out.");
console.log(
  `  ${variants.length} documents — ` +
    Object.entries(counts)
      .sort()
      .map(([k, n]) => `${n} ${k}`)
      .join(", "),
);
console.log(
  "  " +
    Object.entries(folders)
      .sort()
      .map(([k, n]) => `${k}: ${n}`)
      .join(", "),
);
