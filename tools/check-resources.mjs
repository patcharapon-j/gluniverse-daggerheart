/**
 * Keeps `card-resources.mjs` honest against the cards it reads.
 *
 * That file is the one *interpretation* in this repo — every other body of
 * content is either transcribed from the book or generated from the official
 * snapshot, and both of those can be compared against their source word for
 * word. A reading cannot. So this checks the three things a reading can be
 * wrong about, and refuses to claim the fourth.
 *
 *   1. **Rot.** An annotation naming a card that does not exist. Renaming a
 *      card already breaks a player's link to it (see `stableId` in
 *      `build-packs.mjs`); it should not also silently drop the card's rules.
 *
 *   2. **Drift.** An annotation whose `said` — the exact phrase the reading
 *      was taken from — is no longer on the card. Upstream fixing a typo and
 *      upstream rewriting the rule look identical from here, and only one of
 *      them leaves the ceiling correct. This is `fetch-cards.mjs`'s argument
 *      about `TYPOS`, one layer up.
 *
 *   3. **Coverage.** A card whose text matches the resource sweep and which
 *      is neither annotated nor named in `DECLINED`. This is the weakest of
 *      the three and is deliberately shaped as a *ratchet* rather than as
 *      proof: the regex has known false positives — "until your next long
 *      rest" is a duration thirty-six times and a use limit twice — so it can
 *      only ever say "look at this one", and `DECLINED` is where the looking
 *      is recorded.
 *
 * What it does **not** do is assert that every resource-bearing card was
 * found. Nothing can: a card that states a limit in words the sweep does not
 * know is invisible to the sweep by definition. Claiming otherwise would be
 * the check's own false confidence, which is worse than the gap.
 *
 *     node tools/check-resources.mjs
 *
 * Offline and deterministic — it reads the pack sources, never the network.
 * `npm run build:packs` runs it alongside the other two.
 */

import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src", "packs-src");

const load = async (f) => (await import(pathToFileURL(join(SRC, f)).href)).default;
const mod = async (f) => await import(pathToFileURL(join(SRC, f)).href);

const PACKS = ["classes.mjs", "heritage.mjs", "domains.mjs", "equipment.mjs", "variants.mjs"];

/** Rules text with markup and entities flattened, the way a reader sees it. */
const plain = (s) =>
  String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Every block of rules text on a document, with the feature name it sits on.
 *
 * `text` carries the feature's **name as well as its description**, because a
 * name is printed on the card in bold and a reader sweeping for "does this
 * count anything" reads it. Three of the four cards mentioning a charge do so
 * only in a feature's title — the Firbolg's Charge, the Powered Gauntlet's
 * Charged — and a sweep blind to names would call those clean and leave the
 * one real Charged state in the same silence.
 */
function blocks(entry) {
  const s = entry.system ?? {};
  const out = [];
  const feat = (f) => {
    if (f?.description) {
      out.push({ feature: f.name ?? "", text: plain(`${f.name ?? ""} ${f.description}`) });
    }
  };
  if (s.description) out.push({ feature: "", text: plain(s.description) });
  feat(s.topFeature);
  feat(s.bottomFeature);
  feat(s.feature);
  feat(s.hopeFeature);
  for (const f of s.features ?? []) feat(f);
  for (const f of s.classFeatures ?? []) feat(f);
  return out;
}

/**
 * The sweep. Deliberately broad and deliberately not trusted — everything it
 * finds must be dispositioned, and being found is not evidence of anything.
 */
const SWEEP = [
  /\bonce per (long |short )?(rest|session|scene)\b/i,
  /\b(twice|three times|\d+ times) per (long |short )?rest\b/i,
  /\btokens?\b/i,
  /\bcharges?\b|\bcharged\b/i,
  /* Kept dice. Narrower than the four above and for a reason: `d\d+` on its
     own matches every damage die in the corpus, which is most of it. What
     names a *kept* die is either a proper noun ending in Die or Dice, or a
     sentence about placing one on a card — and both of those are things
     somebody wrote deliberately. It still over-matches (a Rally Die is
     mentioned on three subclass cards that hold none of their own) and that
     is the point: over-matching is what `DECLINED` is for, and the reverse
     failure is silent. */
  /\b[A-Z]\w+ D(?:ie|ice)\b/,
  /\b(?:place|put) (?:a |an |the )?d\d+\b/i,
];

/**
 * Dice that are the roll rather than something kept.
 *
 * Removed from the text *before* the sweep rather than declined afterwards,
 * and the difference matters. `DECLINED` is for a card somebody read and
 * judged; this is a refinement of what the sweep is looking for. The Hope
 * Die, the Fear Die, the pair together and the advantage die are the roll
 * engine's own — you do not place them, hold them or spend them, and no
 * amount of reading a card will ever make one of them a tray. Declining them
 * one card at a time would mean a line of prose per card asserting the same
 * thing, and a new card that says "reroll your Hope Die" would fail a build
 * for it.
 *
 * Everything else that names a die by a proper noun stays in, including the
 * ones that turn out to live on another card — *which* card holds a Rally
 * Die genuinely is a reading, and readings belong in `DECLINED`.
 */
const NOT_KEPT = /\b(Hope|Fear|Duality|Advantage|Disadvantage) D(?:ie|ice)\b/g;

/* Straight and curly apostrophes are the same character to a reader and two
   different ones to a comparison. The snapshot uses curly; a phrase typed by
   hand into the annotation file will not reliably. */
const norm = (s) => plain(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"');

const problems = [];
const fail = (what, detail) => problems.push({ what, detail });

/* ── load everything ─────────────────────────────────────────────────── */

const RES = await mod("card-resources.mjs");
const RESOURCES = RES.default;
const DICE = RES.DICE ?? {};
const DECLINED = RES.DECLINED ?? {};

/* Both annotation blocks go through the same three checks, because they are
   the same *kind* of claim about the same cards — a reading, taken from a
   phrase, bound to a feature. What differs is only the shape of what they
   store, and none of the checks look at that. Merged for the walk rather
   than checked twice, so a card carrying a counter *and* a die has its
   names compared across both: "Unstoppable" as a use and "Unstoppable Die"
   as a tray are two rows on one card, and two rows called the same thing
   would be two identical trays a player cannot tell apart. */
const ANNOTATED = {};
for (const [k, list] of Object.entries(RESOURCES)) ANNOTATED[k] = [...list];
for (const [k, list] of Object.entries(DICE)) ANNOTATED[k] = [...(ANNOTATED[k] ?? []), ...list];

/** Every document, by `type:name`. */
const docs = new Map();
for (const f of PACKS) {
  for (const e of await load(f)) docs.set(`${e.type}:${e.name}`, e);
}

/* ── 1. rot ──────────────────────────────────────────────────────────── */

for (const key of Object.keys(ANNOTATED)) {
  if (!docs.has(key)) fail("names a card that does not exist", key);
}
for (const key of Object.keys(DECLINED)) {
  if (!docs.has(key)) fail("DECLINED names a card that does not exist", key);
}

/* ── 2. drift ────────────────────────────────────────────────────────── */

for (const [key, list] of Object.entries(ANNOTATED)) {
  const entry = docs.get(key);
  if (!entry) continue;
  const bs = blocks(entry);
  const whole = norm(bs.map((b) => b.text).join(" "));

  for (const r of list) {
    if (!r.said) {
      fail("has no `said` to check against", `${key} → ${r.name}`);
      continue;
    }
    if (!whole.includes(norm(r.said))) {
      fail("says something the card no longer says", `${key} → "${r.said}"`);
    }

    /* A resource bound to a feature must name one the document has. This is
       what stops a rename inside a card leaving the counters drawn on every
       row of a class instead of on the one that earns them. */
    if (r.feature && !bs.some((b) => b.feature === r.feature)) {
      fail(
        "names a feature this card does not have",
        `${key} → "${r.feature}" (has: ${bs.map((b) => b.feature).filter(Boolean).join(", ") || "none"})`,
      );
    }
  }

  /* Two resources on one document must be distinguishable, because the sheet
     draws them as two rows of counters and a player has to know which is
     which. Same name on the same feature is two identical rows. */
  const seen = new Set();
  for (const r of list) {
    const k = `${r.feature} ${r.name}`;
    if (seen.has(k)) fail("has two resources with the same name on one feature", `${key} → ${r.name}`);
    seen.add(k);
  }
}

/* ── DECLINED must still be declinable ───────────────────────────────── */

for (const [key, why] of Object.entries(DECLINED)) {
  const entry = docs.get(key);
  if (!entry) continue;
  if (!why?.trim()) fail("is declined with no reason given", key);
  const whole = blocks(entry).map((b) => b.text).join(" ").replace(NOT_KEPT, " ");
  if (!SWEEP.some((rx) => rx.test(whole))) {
    fail(
      "is declined but no longer matches the sweep — the card has changed, so the reading is stale",
      key,
    );
  }
  if (ANNOTATED[key]) fail("is both annotated and declined", key);
}

/* ── 3. coverage ─────────────────────────────────────────────────────── */

const missed = [];
for (const [key, entry] of docs) {
  /* `in` and not a truthiness test: a card declined with an empty reason is a
     card somebody looked at, and reporting it as *undispositioned* sends the
     next reader to re-read a card that has already been read. The empty
     reason is its own complaint, above. */
  if (key in ANNOTATED || key in DECLINED) continue;
  const whole = blocks(entry).map((b) => b.text).join(" ").replace(NOT_KEPT, " ");
  if (SWEEP.some((rx) => rx.test(whole))) missed.push(key);
}

/* ── say so ──────────────────────────────────────────────────────────── */

const n = Object.values(RESOURCES).reduce((a, l) => a + l.length, 0);
const d = Object.values(DICE).reduce((a, l) => a + l.length, 0);

if (missed.length) {
  console.error(
    `\n${missed.length} card${missed.length === 1 ? " matches" : "s match"} the resource sweep and ${missed.length === 1 ? "is" : "are"} neither annotated nor declined:\n`,
  );
  for (const k of missed) console.error(`  ${k}`);
  console.error(
    "\nAdd it to card-resources.mjs, or to DECLINED with the reason it carries nothing.\n",
  );
}

if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length === 1 ? "" : "s"} in card-resources.mjs:\n`);
  for (const p of problems) console.error(`  ${p.detail}\n    ${p.what}`);
  console.error("");
}

if (problems.length || missed.length) process.exit(1);

console.log(
  `check-resources: ${n} resources and ${d} die pools on ` +
    `${Object.keys(ANNOTATED).length} cards, ` +
    `${Object.keys(DECLINED).length} declined, ${docs.size} documents swept.`,
);
