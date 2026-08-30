/**
 * Every rule unit in the packs is read, or declined with a reason.
 *
 * This is `check-resources.mjs`'s ratchet pointed at the largest reading this
 * repo has ever taken, and it replaces `check-cards.mjs`'s `PRICED` block —
 * 275 documents and 843 quoted strings whose whole job was policing a parser
 * that no longer decides anything at runtime.
 *
 * The two ask opposite questions, and the new one is strictly stronger.
 * `PRICED` asked *did the pattern start charging something nobody read*, and
 * it said so in its own comments that it could never prove a price was
 * **missed** — a card stating a cost in words the regex did not know was
 * invisible to it by construction. This asks *is there a rule unit nobody has
 * read*, which is answerable, because the corpus is closed.
 *
 * ── what it checks
 *
 *   COVERAGE   every unit matching `SWEEP` is annotated in `card-actions.mjs`
 *              or declined there with a reason. A unit matching nothing needs
 *              neither: about a fifth of the corpus is fiction, and demanding
 *              a decline for "you know somebody who owes you a favor" would
 *              be noise that buries the declines that matter.
 *   SAID       every `said` is a verbatim substring of the card it was read
 *              from. Upstream fixing a typo and upstream rewriting a rule
 *              around its cost look identical from here, and only one of them
 *              is fine.
 *   CLOSED     every `kind`, `trait`, `condition`, `duration`, `op`,
 *              `subject`, `modifier.target/source/condition` is in the closed
 *              set `config.ts` declares. Lifted from that file as text rather
 *              than restated, which is `check-item-sheet.mjs`'s move for the
 *              same reason: a `.mjs` tool cannot import TypeScript, and a
 *              second copy maintained by hand is the thing these lists exist
 *              to prevent.
 *   REACHABLE  every `resource` names a counter or die pool the document
 *              carries, and every `damageName` names one of its printed
 *              expressions. Neither emits a button otherwise — silently.
 *   SHAPE      no authored `use-item` or `mark-use` (the system adds both),
 *              no step carrying `steps` or `when` — depth is structural and a
 *              precondition on one link of a press is a label that press
 *              cannot honour — no key naming a document that does not exist,
 *              no feature naming a block that does not exist.
 *
 * ── what it cannot check
 *
 * Whether the reading is *right*. A `pay` of one Stress on a card that says
 * "mark a Stress" and a `pay` of one Stress on a card where the TARGET marks
 * it are indistinguishable to this tool — both quote real words off a real
 * card. That is the reader's job and the audit pass's, and it is why `said`
 * exists at all: a human can check 989 readings against their own quotations
 * in an afternoon and cannot check them against 1,136 documents ever.
 *
 *     node tools/check-actions.mjs            fail on anything wrong
 *     node tools/check-actions.mjs --report   also print what is unread
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src", "packs-src");
const REPORT = process.argv.includes("--report");

const fail = [];
const bad = (where, what, saw = "", want = "") =>
  fail.push({ where, what, saw, want });

/* ── the closed sets, lifted from config.ts ───────────────────────────── */

const CONFIG = readFileSync(join(ROOT, "src", "module", "config.ts"), "utf8");

/** `export const NAME = [ "a", "b" ] as const;` → ["a","b"]. */
function liftList(name) {
  const at = CONFIG.indexOf(`export const ${name} = [`);
  if (at < 0) {
    throw new Error(
      `check-actions: config.ts has no \`${name}\`.\n` +
        "  This tool reads the closed sets out of that file rather than restating\n" +
        "  them. A rename stops the tool rather than leaving it checking a set the\n" +
        "  system no longer uses — fix the name here and in config.ts together.",
    );
  }
  const body = CONFIG.slice(at, CONFIG.indexOf("]", at));
  return [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** Ids out of the `CONDITIONS` array literal. */
function liftConditionIds() {
  const at = CONFIG.indexOf("export const CONDITIONS: ConditionDef[] = [");
  const body = CONFIG.slice(at, CONFIG.indexOf("\n];", at));
  return [...body.matchAll(/id: "(\w+)"/g)].map((m) => m[1]);
}

const KINDS = new Set(liftList("ACTION_KINDS"));
const DURATIONS = new Set(liftList("ACTION_DURATIONS"));
const SUBJECTS = new Set(liftList("ACTION_SUBJECTS"));
const OPS = new Set(liftList("DIE_POOL_OPS"));
const TRAITS = new Set([...liftList("TRAITS"), "spellcast", ""]);
const CONDITION_IDS = new Set(liftConditionIds());
const AMOUNTS = new Set(liftList("ACTION_AMOUNTS"));

const MODIFIERS = readFileSync(join(ROOT, "src", "module", "data", "modifiers.ts"), "utf8");
const liftModList = (name) => {
  const at = MODIFIERS.indexOf(`export const ${name} = [`);
  if (at < 0) throw new Error(`check-actions: data/modifiers.ts has no \`${name}\``);
  const body = MODIFIERS.slice(at, MODIFIERS.indexOf("]", at));
  return [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
};
const M_TARGETS = new Set(liftModList("MODIFIER_TARGETS"));
const M_SOURCES = new Set(liftModList("MODIFIER_SOURCES"));
const M_CONDITIONS = new Set(liftModList("MODIFIER_CONDITIONS"));

/* ── the corpus ───────────────────────────────────────────────────────── */

const PACKS = [
  "domains.mjs", "classes.mjs", "heritage.mjs",
  "transformations.mjs", "equipment.mjs", "variants.mjs",
];

const docs = [];
for (const m of PACKS) {
  const mod = await import(pathToFileURL(join(SRC, m)).href);
  for (const d of mod.default ?? []) docs.push(d);
}

/**
 * Every rule unit: the document's own text, and each named feature block.
 *
 * Deliberately the same walk `fillCardActions` does, in the same order, so a
 * block this tool can see is a block that annotation can reach. A block named
 * here and unreachable there would be a check that passes on data the game
 * never loads.
 */
const BLOCK_KEYS = [
  ["classFeatures", true], ["features", true],
  ["hopeFeature", false], ["topFeature", false], ["bottomFeature", false], ["feature", false],
];

const units = [];
const byKey = new Map();
for (const d of docs) {
  const s = d.system ?? {};
  const key = `${d.type}:${d.name}`;
  const entry = { key, doc: d, features: new Set(), pools: new Set(), damage: new Set() };
  for (const r of s.resources ?? []) entry.pools.add(String(r.name ?? ""));
  for (const r of s.dice ?? []) entry.pools.add(String(r.name ?? ""));
  for (const r of s.cardDamage ?? []) entry.damage.add(String(r.name ?? ""));
  byKey.set(key, entry);

  const text = String(s.description ?? "").trim();
  if (text) units.push({ key, feature: "", text });
  for (const [field, many] of BLOCK_KEYS) {
    const blocks = many ? (s[field] ?? []) : [s[field]].filter(Boolean);
    for (const b of blocks) {
      if (!b) continue;
      if (b.name) entry.features.add(String(b.name));
      const t = String(b.description ?? "").trim();
      if (t) units.push({ key, feature: String(b.name ?? ""), text: t });
    }
  }
}

/* ── the sweep ────────────────────────────────────────────────────────────
   Deliberately broad. This decides what must be *dispositioned*, not what is
   an action — a false positive costs one line in `DECLINED` and a false
   negative is a card that silently loses its buttons with nothing to say so.
   `check-resources.mjs` draws the same line and for the same reason. */

const SWEEP = [
  /\b(?:spend|mark|pay)\b[^.]{0,30}\b(?:hope|stress|armor slot|fear|hit point)/i,
  /\b(?:gain|clear|regain|recover)\b[^.]{0,30}\b(?:hope|stress|armor slot|fear|hit point)/i,
  /\bmake\b[^.]{0,20}\broll\b/i,
  /\b\d*d(?:4|6|8|10|12|20)\b/i,
  /\b(?:roll|reroll)\b/i,
  /\bonce per\b/i,
  /\b(?:token|counter|die|dice)s?\b/i,
  /\btemporaril|\buntil\b[^.]{0,40}\b(?:rest|scene|session)\b/i,
  new RegExp(`\\b(?:${[...CONDITION_IDS].join("|")})\\b`, "i"),
  /\b(?:Vulnerable|Hidden|Restrained|Cloaked|Marked for Death|Hexed|Ablaze|Roped)\b/,
];
const swept = (text) => SWEEP.some((rx) => rx.test(text));

/* ── the reading ──────────────────────────────────────────────────────── */

const { CARD_ACTIONS, DECLINED } = await import(
  pathToFileURL(join(SRC, "card-actions.mjs")).href
);

/** Everything the reading says about one unit. */
const readingFor = (key, feature) => {
  const entry = CARD_ACTIONS[key];
  if (!entry) return [];
  return feature ? (entry.features?.[feature] ?? []) : (entry.actions ?? []);
};

/* Every key mentioned anywhere must name a real document, and every feature a
   real block on it. A typo here is an annotation that is simply never applied,
   which looks from the game exactly like nobody having read the card. */
for (const [key, entry] of Object.entries(CARD_ACTIONS)) {
  const doc = byKey.get(key);
  if (!doc) {
    bad(key, "names no document in the packs", key, "type:name of a real entry");
    continue;
  }
  for (const feature of Object.keys(entry.features ?? {})) {
    if (!doc.features.has(feature)) {
      bad(key, "names a feature block this document does not have", feature,
        [...doc.features].join(" | ") || "(it has none)");
    }
  }
}
for (const key of Object.keys(DECLINED)) {
  if (!byKey.get(key)) bad(key, "declined, but names no document in the packs");
  if (!Array.isArray(DECLINED[key])) {
    bad(key, "declined with a string; values are arrays — a document declines more than once");
  }
}

/* ── every authored action ────────────────────────────────────────────── */

const checkAction = (where, a, doc, isStep) => {
  if (!KINDS.has(a.kind)) bad(where, "unknown kind", a.kind, [...KINDS].join(" "));
  if (a.kind === "use-item" || a.kind === "mark-use") {
    bad(where, `\`${a.kind}\` is added by the system and must not be authored`);
  }
  if (a.subject && !SUBJECTS.has(a.subject)) bad(where, "unknown subject", a.subject);
  if (a.trait !== undefined && !TRAITS.has(a.trait)) bad(where, "unknown trait", a.trait);
  if (a.op && !OPS.has(a.op)) bad(where, "unknown die-pool op", a.op);
  if (a.condition && !CONDITION_IDS.has(a.condition)) {
    bad(where, "names a condition config.ts does not register", a.condition,
      "one of the registered ids, or a DECLINED entry saying why not");
  }
  for (const k of Object.keys(a.amount ?? {})) {
    if (!AMOUNTS.has(k)) bad(where, "unknown amount", k, [...AMOUNTS].join(" "));
  }
  if (a.effect?.duration && !DURATIONS.has(a.effect.duration)) {
    bad(where, "unknown duration", a.effect.duration, [...DURATIONS].join(" "));
  }
  for (const m of a.effect?.modifiers ?? []) {
    if (m.target && !M_TARGETS.has(m.target)) bad(where, "unknown modifier target", m.target);
    if (m.source && !M_SOURCES.has(m.source)) bad(where, "unknown modifier source", m.source);
    if (m.condition && !M_CONDITIONS.has(m.condition)) bad(where, "unknown modifier condition", m.condition);
  }
  if (a.resource && doc && !doc.pools.has(a.resource)) {
    bad(where, "names a counter or die pool this document does not carry", a.resource,
      [...doc.pools].join(" | ") || "(it carries none)");
  }
  if (a.kind === "roll-card-damage" && doc && !doc.damage.has(a.damageName ?? "")) {
    bad(where, "names a printed damage mode this document does not have", a.damageName ?? "",
      [...doc.damage].join(" | ") || "(it prints none)");
  }
  if (isStep) {
    /* Depth is the structural rule and `when` is the semantic one: a step runs
       inside one press, so a precondition on it alone would be a label the
       press cannot honour. `said` it keeps — provenance is not a nesting
       concern, and a chain's second half needs its own quotation. */
    for (const f of ["steps", "when"]) {
      if (a[f] !== undefined) bad(where, `a step may not carry \`${f}\` — chains are one level deep`);
    }
  } else {
    if (!String(a.said ?? "").trim()) {
      bad(where, "no `said` — every action records the words it was read from");
    }
    for (const step of a.steps ?? []) checkAction(`${where} → step`, step, doc, true);
  }
};

/* `said` has to still be on the card. Compared against the raw stored text
   with markdown emphasis and line breaks flattened both sides, because a
   reader quoting "Mark a Stress" off "**Mark a Stress**" is quoting correctly
   and a check that said otherwise would be pedantry with a build gate on it. */
const flatten = (s) =>
  String(s).replace(/<br\s*\/?>/gi, " ").replace(/[*_`]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

let annotated = 0;
let unread = [];
let declinedUnits = 0;

for (const u of units) {
  const actions = readingFor(u.key, u.feature);
  const doc = byKey.get(u.key);
  const where = `${u.key}${u.feature ? ` · ${u.feature}` : ""}`;

  for (const a of actions) {
    checkAction(where, a, doc, false);
    const said = String(a.said ?? "").trim();
    if (said && !flatten(u.text).includes(flatten(said))) {
      bad(where, "`said` is no longer on this card", said, "a verbatim phrase from its rules text");
    }
  }

  if (actions.length) annotated += 1;
  const declined = (DECLINED[u.key] ?? []).length > 0;
  if (declined) declinedUnits += 1;
  if (!actions.length && !declined && swept(u.text)) {
    unread.push({ where, text: u.text.replace(/\s+/g, " ").slice(0, 96) });
  }
}

/* ── the report ───────────────────────────────────────────────────────── */

if (REPORT && unread.length) {
  console.log(`\n${unread.length} rule units matched the sweep and nobody has read them:\n`);
  for (const u of unread.slice(0, 60)) console.log(`  ${u.where}\n    ${u.text}`);
  if (unread.length > 60) console.log(`  … and ${unread.length - 60} more`);
  console.log("");
}

if (unread.length) {
  bad(
    "coverage",
    `${unread.length} of ${units.length} rule units match the sweep and are neither annotated nor declined`,
    `${annotated} annotated, ${declinedUnits} declined`,
    "every swept unit read, in src/packs-src/card-actions.mjs — run with --report to list them",
  );
}

if (fail.length) {
  console.error(`\ncheck-actions: ${fail.length} problem${fail.length === 1 ? "" : "s"}\n`);
  for (const f of fail.slice(0, 40)) {
    console.error(`  ${f.where}: ${f.what}`);
    if (f.saw) console.error(`    saw:  ${f.saw}`);
    if (f.want) console.error(`    want: ${f.want}`);
  }
  if (fail.length > 40) console.error(`  … and ${fail.length - 40} more`);
  console.error("");
  process.exit(1);
}

console.log(
  `check-actions: ${units.length} rule units on ${byKey.size} documents; ` +
    `${annotated} carry authored actions, ${declinedUnits} declined, nothing unread.`,
);
