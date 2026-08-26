/**
 * Keeps `card-damage.mjs` honest against the cards it reads.
 *
 * `tools/check-resources.mjs` is this tool's twin and the argument is the same
 * one: both files are *readings* of rules text rather than transcriptions of
 * it, and a reading cannot be compared to its source word for word the way
 * `check-cards.mjs` compares a class to the snapshot. So this checks what a
 * reading can be wrong about and declines to claim the thing it cannot prove.
 *
 *   1. **Rot.** An annotation naming a card that does not exist. Renaming a
 *      card already breaks a player's link to it (`stableId` in
 *      `build-packs.mjs`); it should not also silently drop the card's dice.
 *
 *   2. **Drift.** An annotation whose `said` — the exact phrase the reading
 *      was taken from — is no longer on the card. Upstream fixing a typo and
 *      upstream rewriting the rule look identical from here, and only one of
 *      them leaves the expression correct.
 *
 *   3. **Agreement.** The dice the annotation records must be dice the quoted
 *      phrase actually prints. Drift catches the card changing under the
 *      reading; this catches the reading never having matched the card in the
 *      first place — an entry claiming `3d10+8` beside a `said` that reads
 *      3d10+6. That is the failure that actually happens when seventy-seven
 *      expressions are typed in by hand, and it is invisible to every other
 *      check here, because both halves of the entry are perfectly well formed.
 *
 *   4. **Closed sets.** Every `type` is one `config.ts` names or the blank
 *      that Ground Pound earns, every `dice` is a die this system rolls, and
 *      `count` and `bonus` are whole and non-negative. A printed expression
 *      has no negative half.
 *
 *   5. **Coverage.** A card whose text matches the damage sweep and which is
 *      neither annotated nor named in `DECLINED`. This is the weakest of the
 *      five and is deliberately a *ratchet* rather than proof: a card that
 *      rolls damage in words the sweep does not know is invisible to the sweep
 *      by definition, and claiming otherwise would be this tool's own false
 *      confidence, which is worse than the gap. What it can say is "look at
 *      this one", and `DECLINED` is where the looking is recorded.
 *
 * **Where it parts from the twin, and why.** `check-resources.mjs` fails a
 * decline that no longer matches its sweep, because its `DECLINED` values are
 * bare strings — there is no phrase to check, so the sweep is the only handle
 * it has on whether the reading is still about the card in front of it. Every
 * decline here carries a `said`, so the phrase is checked instead, and that is
 * strictly the better test: a reading stands or falls on the words it was
 * taken from, whether or not a deliberately broad regex happens to fire on
 * them. Seven of the Versatile weapons are declined and swept by nothing —
 * somebody read further than the sweep reaches, which is the direction this
 * should fail in.
 *
 * It also does **not** fail a card that is annotated *and* declined. That is
 * one card, Hungry Fire, and `card-damage.mjs` argues it out loud: the d8+2 is
 * what casting it deals and the extra 1d8 fires on the target's next
 * spotlight. Two clauses, two readings, one document.
 *
 *     node tools/check-card-damage.mjs
 *
 * Offline and deterministic — it reads the pack sources, never the network.
 * `npm run build:packs` runs it alongside the others.
 */

import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src", "packs-src");

const load = async (f) => (await import(pathToFileURL(join(SRC, f)).href)).default;
const mod = async (f) => await import(pathToFileURL(join(SRC, f)).href);

/* The four Item packs, which is where a *card* is. The adversary and
   environment packs are Actors and their dice are a stat line — the reading
   `DECLINED` already names for Versatile and for Devastating, one document
   type along. */
const PACKS = ["classes.mjs", "heritage.mjs", "domains.mjs", "equipment.mjs", "variants.mjs"];

/* The closed sets, restated rather than imported. Reaching `config.ts` would
   mean running TypeScript in a plain node script; these are eight words and a
   mismatch here is a schema change that should be noticed. `""` is a legal
   `type` and is Ground Pound's — the one card that prints damage and names no
   kind of it — so the blank is a reading and not a field somebody forgot. */
const DAMAGE_TYPES = ["", "physical", "magic"];
const DAMAGE_DICE = ["d4", "d6", "d8", "d10", "d12", "d20"];

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
 * Lifted from `check-resources.mjs` unchanged, including the reason it carries
 * the feature's **name** as well as its description: a name is printed on the
 * card in bold and a reader sweeping it reads it. Blighting Strike prints its
 * two expressions under "On a success:" and the Poisoners Guild prints one
 * under "Leech Weed:", both of which are names doing a sentence's work.
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
 * One printed die expression, wherever it appears: `2d8+4`, `d12+4`, `3d10`.
 *
 * A missing count is one — the corpus writes `d8+2` and `1d8+2` for the same
 * thing, and which it writes turns on whether Proficiency is multiplying the
 * count, which is a fact about the card rather than about the notation.
 */
const EXPR = /(\d*)d(\d+)\s*(?:([+-])\s*(\d+))?/g;

/** Every expression in a phrase, normalised to what an annotation records. */
function expressions(text) {
  const out = [];
  for (const m of String(text).matchAll(EXPR)) {
    out.push({
      count: m[1] === "" ? 1 : Number(m[1]),
      dice: `d${m[2]}`,
      bonus: m[3] ? (m[3] === "-" ? -Number(m[4]) : Number(m[4])) : 0,
    });
  }
  return out;
}

/**
 * The sweep. Deliberately broad, deliberately not trusted, and two branches
 * because the corpus states damage in two grammars.
 *
 * **Dice and the word.** A sentence carrying a die expression *and* the word
 * damage. That is the ordinary form — "Targets who fail take 3d10+8 physical
 * damage" — and it is per **sentence** rather than per card, because a card
 * that mentions damage in one clause and a Prayer Die in another is not a card
 * that rolls damage, and sweeping the whole paragraph would say it is.
 *
 * **A verb and no word.** Deal, deals, take, takes, followed closely by dice
 * and *not* saying damage. Gambler's Fallacy and the Ooze Oils show why the
 * first branch is not enough on its own: the corpus is perfectly willing to
 * write "deals 8d20 to all targets" and leave the noun to the reader. Bounded
 * to sixty characters, because a verb at the top of a paragraph and dice at
 * the bottom are two sentences that a missing full stop joined.
 *
 * Both over-match, and that is the point — over-matching is what `DECLINED`
 * is for, and the reverse failure is silent.
 */
const SWEEP_DICE = /\b\d*d\d+/;
const SWEEP_WORD = /\bdamage\b/i;
const SWEEP_VERB = /\b(?:deals?|takes?)\b[^.!?]{0,60}?\b\d*d\d+/i;

/** Sentences, as far as a flattened paragraph has them. */
const sentences = (t) => t.split(/(?<=[.!?])\s+/);

const swept = (text) =>
  sentences(text).some(
    (s) => (SWEEP_DICE.test(s) && SWEEP_WORD.test(s)) || (SWEEP_VERB.test(s) && !SWEEP_WORD.test(s)),
  );

/* Straight and curly apostrophes are the same character to a reader and two
   different ones to a comparison. The snapshot uses curly; a phrase typed by
   hand into the annotation file will not reliably. */
const norm = (s) => plain(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"');

const problems = [];
const fail = (what, detail) => problems.push({ what, detail });

/* ── load everything ─────────────────────────────────────────────────── */

const DMG = await mod("card-damage.mjs");
const DAMAGE = DMG.default ?? {};
const DECLINED = DMG.DECLINED ?? {};

/** Every document, by `type:name`. */
const docs = new Map();
for (const f of PACKS) {
  for (const e of await load(f)) docs.set(`${e.type}:${e.name}`, e);
}

/* ── 1. rot: every key resolves ──────────────────────────────────────── */

for (const key of Object.keys(DAMAGE)) {
  if (!docs.has(key)) fail("names a card that does not exist", key);
}
for (const key of Object.keys(DECLINED)) {
  if (!docs.has(key)) fail("DECLINED names a card that does not exist", key);
}

/* ── 2–4. drift, agreement, closed sets ──────────────────────────────── */

for (const [key, list] of Object.entries(DAMAGE)) {
  const entry = docs.get(key);
  if (!entry) continue;
  const whole = norm(blocks(entry).map((b) => b.text).join(" "));

  for (const d of list) {
    const where = `${key}${d.name ? ` → ${d.name}` : ""}`;

    /* drift */
    if (!d.said) {
      fail("has no `said` to check against", where);
    } else if (!whole.includes(norm(d.said))) {
      fail("says something the card no longer says", `${where} → "${d.said}"`);
    }

    /* closed sets, before agreement — an entry with a die this system does not
       roll has nothing worth comparing to a phrase. */
    let sound = true;
    if (!DAMAGE_DICE.includes(d.dice)) {
      fail(`rolls a die this system does not have: "${d.dice}"`, where);
      sound = false;
    }
    if (!DAMAGE_TYPES.includes(d.type)) {
      fail(`names a damage type this system does not have: "${d.type}"`, where);
    }
    if (!Number.isInteger(d.count) || d.count < 0) {
      fail(`has a count that is not a whole number of dice: ${d.count}`, where);
      sound = false;
    }
    if (!Number.isInteger(d.bonus) || d.bonus < 0) {
      fail(`has a bonus that is not a whole non-negative number: ${d.bonus}`, where);
      sound = false;
    }
    if (typeof d.proficiency !== "boolean") fail("has a `proficiency` that is not a flag", where);
    if (typeof d.direct !== "boolean") fail("has a `direct` that is not a flag", where);

    /* agreement */
    if (sound && d.said) {
      const printed = expressions(d.said);
      const match = printed.some(
        (p) => p.count === d.count && p.dice === d.dice && p.bonus === d.bonus,
      );
      if (!match) {
        const asked = `${d.count}${d.dice}${d.bonus ? `+${d.bonus}` : ""}`;
        const found = printed.length
          ? printed.map((p) => `${p.count}${p.dice}${p.bonus ? `+${p.bonus}` : ""}`).join(", ")
          : "no dice at all";
        fail(`records ${asked}, but the phrase it was read from prints ${found}`, where);
      }
    }
  }

  /* Two expressions on one document must be distinguishable, because the card
     draws them as two buttons and a player has to know which is which. Same
     name twice is two identical presses — and two *blank* names is the same
     complaint, which is why this needs no separate rule about the modal
     block: a document printing several modes and naming none of them fails
     here. */
  const seen = new Set();
  for (const d of list) {
    if (seen.has(d.name)) {
      fail("has two damage expressions with the same name", `${key} → "${d.name}"`);
    }
    seen.add(d.name);
  }
}

/* ── 6. DECLINED is live ─────────────────────────────────────────────── */

for (const [key, list] of Object.entries(DECLINED)) {
  const entry = docs.get(key);
  if (!entry) continue;
  const whole = norm(blocks(entry).map((b) => b.text).join(" "));

  if (!Array.isArray(list)) {
    fail("is declined with something other than a list of readings", key);
    continue;
  }
  for (const d of list) {
    if (!d?.why?.trim()) fail("is declined with no reason given", `${key} → "${d?.said ?? ""}"`);
    if (!d?.said?.trim()) {
      fail("is declined with no phrase to check against", key);
      continue;
    }
    if (!whole.includes(norm(d.said))) {
      fail(
        "is declined for something the card no longer says — the reading is stale",
        `${key} → "${d.said}"`,
      );
    }
  }
}

/* ── 5. coverage ─────────────────────────────────────────────────────── */

const missed = [];
for (const [key, entry] of docs) {
  /* `in` and not a truthiness test: a card declined with an empty list is a
     card somebody looked at, and reporting it as *undispositioned* sends the
     next reader to re-read a card that has already been read. The empty list
     is its own complaint, above. */
  if (key in DAMAGE || key in DECLINED) continue;
  const hit = blocks(entry).find((b) => swept(b.text));
  if (hit) missed.push({ key, why: sentences(hit.text).filter(swept).join(" ") });
}

/* ── say so ──────────────────────────────────────────────────────────── */

if (missed.length) {
  console.error(
    `\n${missed.length} card${missed.length === 1 ? " matches" : "s match"} the damage sweep and ${missed.length === 1 ? "is" : "are"} neither annotated nor declined:\n`,
  );
  for (const m of missed) console.error(`  ${m.key}\n    ${m.why}`);
  console.error(
    "\nAdd it to card-damage.mjs, or to DECLINED with the phrase and the reason its dice\n" +
      "are not this card's own roll.\n",
  );
}

if (problems.length) {
  console.error(
    `\n${problems.length} problem${problems.length === 1 ? "" : "s"} in card-damage.mjs:\n`,
  );
  for (const p of problems) console.error(`  ${p.detail}\n    ${p.what}`);
  console.error("");
}

if (problems.length || missed.length) process.exit(1);

const modes = Object.values(DAMAGE).reduce((a, l) => a + l.length, 0);
const declined = Object.values(DECLINED).reduce((a, l) => a + l.length, 0);

console.log(
  `check-card-damage: ${modes} printed expressions on ${Object.keys(DAMAGE).length} cards, ` +
    `${declined} phrases declined on ${Object.keys(DECLINED).length}, ${docs.size} documents swept.`,
);
