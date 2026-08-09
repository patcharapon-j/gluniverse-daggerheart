/*
 * Audits the compendium against the official card snapshot.
 *
 *     node tools/check-cards.mjs          # report, exit 1 on any finding
 *     node tools/check-cards.mjs --full   # print the full text of each finding
 *
 * `domain-cards.mjs` is generated and cannot drift. Everything else here is
 * hand-authored — ancestries, communities, and the eighteen subclasses — and
 * this is what stops it drifting: it re-derives what each entry *should* say
 * from `official-cards.json` and complains when it doesn't.
 *
 * It compares meaning, not typesetting. Emphasis, curly quotes, bullet markers
 * and the HTML the entries are stored as are all normalised away, so a finding
 * is always a difference in wording, a missing feature, or a card that exists
 * on one side and not the other. That is deliberate: this should be quiet
 * enough that its output is worth reading.
 *
 * The one thing it checks that is *not* wording: class flavour. There is no
 * official class card, so nothing can validate a class description — but the
 * printed cards keep their flavour to a sentence and the rulebook's chapter
 * opener runs to a paragraph, and it was the chapter opener that got pasted in.
 * FLAVOUR_SENTENCES is the rule the cards keep and the classes now keep too.
 *
 * And one thing it checks that is not the compendium at all: **what the sheet
 * reads off these cards as a price.** `priceOf` in `src/module/sheets/cards.ts`
 * is the one parse of English rules text this system allows, and the section at
 * the foot of this file is the ratchet that keeps it bounded — see the argument
 * there.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { splitFeatures } from "./fetch-cards.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/** The route Foundry mounts this folder at, which is what every `img` is
    written as. Stripping it turns a document's path back into a repo path. */
const SYSTEM_PATH = "systems/gluniverse-daggerheart";
const FULL = process.argv.includes("--full");

/**
 * A class card is flavour plus rules, and **one sentence** is the flavour's
 * whole share.
 *
 * Two was the first guess and it was too many. The rulebook writes its classes
 * in pairs — an opener that says what the class *is*, then a second sentence
 * elaborating — and keeping both put a full paragraph above the stats on a card
 * whose job is Evasion, Hit Points and two feature runs. The opener alone is
 * the sentence that does the work; everything after it is the chapter talking,
 * not the card. So the rule is the chapter's first sentence, verbatim, and
 * nothing else.
 */
const FLAVOUR_SENTENCES = 1;

const load = async (f) =>
  (await import(pathToFileURL(join(ROOT, "src", "packs-src", f)).href)).default;

const official = JSON.parse(
  readFileSync(join(ROOT, "src", "packs-src", "official-cards.json"), "utf8"),
);

/* ── normalising ──────────────────────────────────────────────────────
   Down to words. Everything that is a decision about *presentation* — our
   HTML, upstream's markdown, either side's quote style, the bullet character
   — is removed, so what is left is what the card says. */
const norm = (s) =>
  String(s ?? "")
    .replace(/<li[^>]*>/gi, " • ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\*\*|__|\*|_/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#39;|&rsquo;|[‘’ʼ]/g, "'")
    .replace(/&quot;|[“”]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/^\s*[-•∙]\s*/gm, " ")
    .replace(/[-•∙]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*:\s*/g, ": ")
    .trim()
    .toLowerCase();

const findings = [];
const fail = (where, what, ours, theirs) => findings.push({ where, what, ours, theirs });

/** Compare two pieces of prose; report the first word that differs. */
function same(where, what, ours, theirs) {
  const a = norm(ours);
  const b = norm(theirs);
  if (a === b) return true;
  const A = a.split(" ");
  const B = b.split(" ");
  let i = 0;
  while (i < A.length && i < B.length && A[i] === B[i]) i++;
  const ctx = (arr) => (FULL ? arr.join(" ") : `…${arr.slice(Math.max(0, i - 5), i + 12).join(" ")}…`);
  fail(where, `${what} differs at word ${i + 1}`, ctx(A), ctx(B));
  return false;
}

/** Compare a run of named features against the official split of one card. */
function sameFeatures(where, ours, content) {
  const theirs = splitFeatures(content);
  if (ours.length !== theirs.length) {
    fail(
      where,
      `${ours.length} feature(s), official card has ${theirs.length}`,
      ours.map((f) => f.name).join(" / "),
      theirs.map((f) => f.name).join(" / "),
    );
    return;
  }
  ours.forEach((f, i) => {
    if (norm(f.name) !== norm(theirs[i].name))
      fail(where, `feature ${i + 1} is named differently`, f.name, theirs[i].name);
    same(where, `feature ${i + 1} (${theirs[i].name})`, f.description, theirs[i].text);
  });
}

/* ── run ──────────────────────────────────────────────────────────────── */

const heritage = await load("heritage.mjs");
const classes = await load("classes.mjs");
const domains = await load("domains.mjs");

const pick = (arr, type) => arr.filter((d) => d.type === type);

/* ── what has no upstream ─────────────────────────────────────────────
   The Card Creator publishes the corebook and only the corebook. Everything
   from *Hope and Fear* is therefore transcribed from the page, and comparing
   it against `official-cards.json` would produce one finding per card saying
   the API has never heard of it — which is true, expected, and would drown
   the findings that matter.

   The exclusion is derived rather than listed. A hardcoded set of names is a
   second copy of the pack's contents that goes stale the moment a card is
   renamed, and it goes stale *silently*: the card starts being audited against
   an upstream that does not have it, and the finding reads like a
   transcription error. So the modules are imported and what they export is,
   by definition, what has no official card. Rename a card and this follows it.

   `NO_UPSTREAM` is keyed the same way the official index is — see `key` — so a
   typeset apostrophe on our side matches a typewritten one on theirs. */
const noUpstream = async (f, get = (d) => d.name) =>
  (await load(f)).map(get).map((n) => key(n));

const key = (name) => String(name).replace(/[‘’ʼ]/g, "'").toLowerCase();

const NO_UPSTREAM = new Set([
  ...(await noUpstream("hf-heritage.mjs")),
  ...(await noUpstream("transformations.mjs")),
  ...(await noUpstream("dread-cards.mjs")),
  /* Root and Void go further than Dread does: Dread has no upstream because
     the Card Creator publishes the corebook only, and these have none because
     nobody published them at all. What replaces the audit is
     `tools/check-marked.mjs`, which asserts the regularities the printed
     corpus keeps rather than comparing text to a snapshot that has no row. */
  ...(await noUpstream("marked-cards.mjs")),
  /* A subclass is three documents wearing one name, and it is the *subclass*
     name the official index is keyed by — so this collects that rather than
     the document's "Hedge: Foundation". Classes and the Martial Stances come
     through the same list and are harmless: nothing looks them up here. */
  ...(await noUpstream("hf-classes.mjs", (d) => d.system?.subclassName ?? d.name)),
]);

/** Skip an entry that has no official card to be checked against. */
const transcribed = (name) => NO_UPSTREAM.has(key(name));

/* Cards are matched by name, and the two sides punctuate names differently:
   the compendium is typeset ("Reaper’s Strike"), the API is typewritten
   ("Reaper's Strike"). Same card. The key ignores the difference; the report
   still prints whichever name it was handed. `key` itself is declared above,
   because the no-upstream set needs it too. */
const index = (arr) => new Map(arr.map((x) => [key(x.name), x]));

/* ancestries */
{
  const off = index(official.ancestry);
  for (const a of pick(heritage, "ancestry")) {
    if (transcribed(a.name)) continue;
    const o = off.get(key(a.name));
    if (!o) {
      fail(`ancestry/${a.name}`, "no official card of this name", a.name, "—");
      continue;
    }
    off.delete(key(a.name));
    same(`ancestry/${a.name}`, "flavour", a.system.description, o.description);
    sameFeatures(`ancestry/${a.name}`, [a.system.topFeature, a.system.bottomFeature], o.content);
    checkPrinting(`ancestry/${a.name}`, a, o);
  }
  for (const name of off.keys()) fail(`ancestry/${name}`, "official card is not in the pack", "—", name);
}

/* communities */
{
  const off = index(official.community);
  for (const c of pick(heritage, "community")) {
    if (transcribed(c.name)) continue;
    const o = off.get(key(c.name));
    if (!o) {
      fail(`community/${c.name}`, "no official card of this name", c.name, "—");
      continue;
    }
    off.delete(key(c.name));
    same(`community/${c.name}`, "flavour", c.system.description, o.description);
    sameFeatures(`community/${c.name}`, [c.system.feature], o.content);
    checkPrinting(`community/${c.name}`, c, o);
  }
  for (const name of off.keys()) fail(`community/${name}`, "official card is not in the pack", "—", name);
}

/* subclasses — three of ours per one of theirs */
{
  const off = index(official.subclass);
  const seen = new Set();
  for (const s of pick(classes, "subclass")) {
    if (transcribed(s.system.subclassName)) continue;
    const o = off.get(key(s.system.subclassName));
    const at = `subclass/${s.name}`;
    if (!o) {
      fail(at, "no official card of this name", s.system.subclassName, "—");
      continue;
    }
    seen.add(key(s.system.subclassName));
    const content = o.content[s.system.rank];
    if (!content) {
      fail(at, `official card has no ${s.system.rank} rank`, s.system.rank, "—");
      continue;
    }
    sameFeatures(at, s.system.features, content);
    if (s.system.className !== o.parentClass)
      fail(at, "class differs", s.system.className, o.parentClass);
    const trait = (o.spellcastTrait || "").toLowerCase();
    if ((s.system.spellcastTrait || "") !== trait)
      fail(at, "Spellcast trait differs", s.system.spellcastTrait || "(none)", trait || "(none)");
    checkPrinting(at, s, o);
  }
  for (const name of off.keys())
    if (!seen.has(key(name))) fail(`subclass/${name}`, "official card is not in the pack", "—", name);
}

/* domain cards — generated, so this only guards the mapping into documents */
{
  const off = index(official.domain);
  const TYPE = { SPELL: "spell", ABILITY: "ability", GRIMOIRE: "grimoire" };
  for (const c of pick(domains, "domainCard")) {
    if (transcribed(c.name)) continue;
    const o = off.get(key(c.name));
    const at = `domain/${c.name}`;
    if (!o) {
      fail(at, "no official card of this name", c.name, "—");
      continue;
    }
    off.delete(key(c.name));
    same(at, "text", c.system.description, o.content);
    const meta = [
      ["domain", c.system.domain, o.primaryDomain.toLowerCase()],
      ["level", c.system.level, o.level],
      ["Recall Cost", c.system.recallCost, o.recallCost],
      ["card type", c.system.cardType, TYPE[o.domainType]],
    ];
    for (const [what, ours, theirs] of meta)
      if (String(ours) !== String(theirs)) fail(at, `${what} differs`, ours, theirs);
    checkPrinting(at, c, o);
  }
  for (const name of off.keys()) fail(`domain/${name}`, "official card is not in the pack", "—", name);
}

/* ── the transcribed decks ────────────────────────────────────────────
   Nothing above touched these, because there is no official card to compare
   them to. What *can* be checked is shape, and shape is what a transcription
   actually loses: a card skipped while typing out a two-column appendix leaves
   a deck that is short by one and looks completely normal.

   Every corebook deck is three cards at level 1 and two at every level after —
   the same rule `tools/fetch-cards.mjs` refuses to write without — so a deck
   that is not that shape is a deck with a card missing from it. */
{
  const DECK = { 1: 3, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2 };
  const transcribedCards = pick(domains, "domainCard").filter((c) => transcribed(c.name));
  const decks = new Map();
  for (const c of transcribedCards) {
    if (!decks.has(c.system.domain)) decks.set(c.system.domain, []);
    decks.get(c.system.domain).push(c);
  }
  for (const [domain, deck] of decks) {
    for (const [lvl, n] of Object.entries(DECK)) {
      const got = deck.filter((c) => c.system.level === Number(lvl)).length;
      if (got !== n)
        fail(`domain/${domain}`, `level ${lvl} has ${got} card(s), a deck has ${n}`, got, n);
    }
  }
}

/* Transformations. No upstream either, and the rule worth asserting is the one
   the subtype exists for: a transformation is a *bargain*, so a card with one
   feature has lost half of itself in transcription. Every one of the six prints
   exactly two, and each is named. */
for (const t of pick(heritage, "transformation")) {
  const at = `transformation/${t.name}`;
  const feats = t.system.features ?? [];
  if (feats.length !== 2)
    fail(at, `${feats.length} feature(s); a transformation prints a benefit and a cost`, feats.length, 2);
  for (const [i, f] of feats.entries())
    if (!f?.name) fail(at, `feature ${i + 1} has no name of its own`, "—", "the printed name");
  if (!t.system.description) fail(at, "no flavour", "—", "—");
}

/* classes — no upstream, so the only rule is the one the cards keep */
for (const c of pick(classes, "class")) {
  const text = norm(c.system.description);
  const sentences = (text.match(/[.!?](?:\s|$)/g) ?? []).length;
  if (sentences > FLAVOUR_SENTENCES)
    fail(
      `class/${c.name}`,
      `flavour runs to ${sentences} sentences; a card's flavour is ${FLAVOUR_SENTENCES} at most`,
      `${text.slice(0, 90)}…`,
      "—",
    );
  /* And the paragraph the creation window prints has to *open* with that same
     sentence.

     `flavor` exists because the class row in the creation window is the one
     screen where the chapter opener belongs — you are choosing between all
     nine at once and two numbers cannot say what a class is like to play. The
     risk in a second prose field is obvious and is the reason this check
     exists: two descriptions of one class, edited months apart, quietly
     disagreeing. Anchoring the paragraph's first sentence to the card's only
     sentence makes them one fact stated at two lengths. It also catches the
     likelier accident, which is a `flavor` pasted against the wrong class. */
  const flavour = norm(c.system.flavor);
  if (flavour && !flavour.startsWith(text.replace(/\s+$/, "")))
    fail(
      `class/${c.name}`,
      "flavour paragraph does not open with the card's sentence",
      `${flavour.slice(0, 90)}…`,
      text,
    );
  /* Plural, and every one of them named. Five of the nine classes print more
     than one feature, and they used to arrive joined under the book's section
     heading — so a check for "is there a feature" passed while the sheet drew
     a row called "Class Features" carrying three unrelated rules. Naming each
     one is the thing that was actually missing, so that is what is checked. */
  const feats = c.system.classFeatures ?? [];
  if (!feats.length) fail(`class/${c.name}`, "no class feature", "—", "—");
  for (const [i, f] of feats.entries()) {
    if (!f?.name || /^class features$/i.test(f.name)) {
      fail(
        `class/${c.name}`,
        `class feature ${i + 1} has no name of its own`,
        f?.name || "—",
        "the feature's printed name",
      );
    }
  }
  if (!c.system.hopeFeature?.name) fail(`class/${c.name}`, "no Hope feature", "—", "—");
}

/* ── what the sheet charges for a feature ─────────────────────────────
   `priceOf` in `src/module/sheets/cards.ts` reads a cost out of a card's own
   prose, and `useAbility` charges it before the card is posted. That is the
   one parse of English rules text this system permits, and the reason it is
   permitted is that the alternative fails in the direction nobody notices —
   the player presses the row and marks the Stress by hand, or forgets to.

   What makes a parse like that safe is not the pattern, it is the corpus.
   Two shapes of mistake are possible and they are opposite:

     over-match — a clause that is somebody *else's* bill gets charged to the
       holder. Ranger's Focus ends "they must mark a Stress"; charging that is
       the sheet silently taking a Stress the rules never asked you for.
     under-match — a real price the pattern cannot reach. This is the quieter
       one, and it is what the widening of `priceOf` was for: ninety-odd
       features stated a cost after a trigger clause or on a bullet and the
       old anchored run stopped at the first full stop.

   Neither can be settled by reading the regex, so this settles it by reading
   the cards. `PRICED` is every clause the pattern charges across the four
   packs, with the words it was read from — `card-resources.mjs`'s `said`
   provenance, pointed at a different reading — and `DECLINED` is the handful
   the pattern reaches that are not a price of using the feature. Anything
   priced and on neither list is a **new over-match** and fails, and a `said`
   the card no longer says fails too, because upstream fixing a typo and
   upstream rewriting a rule around its price look identical from here.

   It is the same ratchet `tools/check-resources.mjs` runs, and it makes the
   same refusal: it cannot prove a price was *found*. A card stating a cost in
   words the pattern does not know is invisible to it by construction. What it
   proves is that nothing new started being charged without somebody reading
   it.

   The pattern is **lifted out of `cards.ts` as text** rather than copied. A
   second regex maintained by hand is precisely the thing this section exists
   to prevent, and a `.mjs` tool cannot import TypeScript — so the three
   declarations are read out of the file, and a rename in `cards.ts` stops
   this tool rather than quietly checking a pattern the sheet no longer uses.
   `check-item-sheet.mjs` reads `data/items.ts` the same way and for the same
   reason. */

const CARDS_TS = join(ROOT, "src", "module", "sheets", "cards.ts");

/** One `const NAME = "…";` out of `cards.ts`, unescaped. */
function liftString(src, name) {
  const m = new RegExp(`\\bconst ${name} = "((?:[^"\\\\]|\\\\.)*)";`).exec(src);
  if (!m) throw new Error(`cards.ts no longer declares ${name}; check-cards.mjs reads it`);
  return JSON.parse(`"${m[1]}"`);
}

const priceClause = (() => {
  const src = readFileSync(CARDS_TS, "utf8");
  const MK = liftString(src, "MK");
  const PAYER = liftString(src, "PAYER");
  const tpl = /new RegExp\(\s*`([^`]*)`/.exec(src.slice(src.indexOf("const priceClause")));
  if (!tpl) throw new Error("cards.ts no longer builds priceClause from a template literal");
  const pattern = JSON.parse(`"${tpl[1]}"`);
  return (text, unit) =>
    new RegExp(
      pattern.replace(/\$\{PAYER\}/g, PAYER).replace(/\$\{MK\}/g, MK).replace(/\$\{unit\}/g, unit),
      "i",
    ).exec(text);
})();

/* `plain` is copied rather than lifted, because it is a function and not a
   string and this is a check tool, not a bundler. It matters only that the
   two agree about the three things the pattern can see: a list item becomes a
   bullet, emphasis becomes asterisks that land *inside* the phrase, and every
   break becomes a space — which is what `featurePrice` does to `<br>` before
   it reads anything. */
const PRICE_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”",
};
const priceText = (html) =>
  !html
    ? ""
    : String(html)
        .replace(/<\s*(br)\s*\/?>/gi, "\n")
        .replace(/<\s*\/\s*(p|div|ul|ol|h[1-6])\s*>/gi, "\n\n")
        .replace(/<\s*li[^>]*>/gi, "\n• ")
        .replace(/<\s*\/?\s*(strong|b)\s*>/gi, "**")
        .replace(/<\s*\/?\s*(em|i)\s*>/gi, "*")
        .replace(/<[^>]*>/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
        .replace(/&([a-z]+);/gi, (m, n) => PRICE_ENTITIES[n.toLowerCase()] ?? m)
        .replace(/\s+/g, " ")
        .trim();

/** Every block the sheet prices separately: the document's own text, and each
    named feature on it. The same split `featureCard` and `post-card.ts` make. */
function priceBlocks(entry) {
  const s = entry.system ?? {};
  const out = [];
  const feat = (f) => {
    if (f?.name || f?.description) out.push({ feature: f.name ?? "", text: priceText(f.description) });
  };
  if (s.description) out.push({ feature: "", text: priceText(s.description) });
  feat(s.topFeature);
  feat(s.bottomFeature);
  feat(s.feature);
  feat(s.hopeFeature);
  for (const f of s.features ?? []) feat(f);
  for (const f of s.classFeatures ?? []) feat(f);
  return out;
}

/* The four currencies a character can be charged. `featurePrice` sweeps armour
   twice — "armor slot" and "armor slots" — and takes the larger; they are
   disjoint, so the alternation here reaches the same clauses, and the walk
   below asserts no block states both, which is the only case where "the larger
   of two" and "the first of one" could disagree. */
const PRICE_UNITS = { hope: "hope", stress: "stress", fear: "fear", armor: "armor slots?" };

/** The clause as it is quoted below: emphasis and the leading boundary gone. */
const clauseOf = (m) =>
  m[0].replace(/\*/g, "").replace(/^[\s.,;:!?•]+|\s+$/g, "").replace(/\s+/g, " ");

/** What a priced clause is keyed by. Three fields, and a card is called
    "Book of Ava" while a feature is called "Get In & Get Out", so the joiner
    has to be a character neither of them can contain. */
const priceId = (k, feature, unit) => `${k}§${feature}§${unit}`;

/** Filled in by the walk below and printed by the report at the foot. */
const priceCounts = { clauses: 0, docs: 0, declined: 0 };

/**
 * Every clause the pattern charges, and the words it was read from.
 *
 * 283 of them across 274 documents. Keyed `type:name` like
 * `card-resources.mjs`, one entry per feature block per currency, and the
 * currency *is* the key — an entry says which purse it reaches into and quotes
 * the sentence that says so, which is the whole of what a reading can be
 * wrong about.
 */
const PRICED = {
  "ancestry:Aetheris": [{ feature: "Celestial Wings", hope: "you can spend a Hope" }],
  "ancestry:Drakona": [{ feature: "Scales", stress: "you can mark a Stress" }],
  "ancestry:Dwarf": [
    { feature: "Thick Skin", stress: "you can mark 2 Stress" },
    { feature: "Increased Fortitude", hope: "Spend 3 Hope" },
  ],
  "ancestry:Elf": [{ feature: "Quick Reactions", stress: "Mark a Stress" }],
  "ancestry:Emberkin": [{ feature: "Ignition", stress: "Mark a Stress" }],
  "ancestry:Faerie": [
    { feature: "Luckbender", hope: "you can spend 3 Hope" },
    { feature: "Wings", stress: "you can mark a Stress" },
  ],
  "ancestry:Faun": [{ feature: "Kick", stress: "you can mark a Stress" }],
  "ancestry:Firbolg": [{ feature: "Charge", stress: "you can mark a Stress" }],
  "ancestry:Fungril": [{ feature: "Death Connection", stress: "you can mark a Stress" }],
  "ancestry:Galapa": [{ feature: "Retract", stress: "Mark a Stress" }],
  "ancestry:Gnome": [{ feature: "Nimble Fingers", hope: "you can spend 2 Hope" }],
  "ancestry:Goblin": [{ feature: "Danger Sense", stress: "mark a Stress" }],
  "ancestry:Human": [{ feature: "Adaptability", stress: "you can mark a Stress" }],
  "ancestry:Infernis": [{ feature: "Fearless", stress: "you can mark 2 Stress" }],
  "ancestry:Katari": [{ feature: "Feline Instincts", hope: "you can spend 2 Hope" }],
  "ancestry:Orc": [{ feature: "Tusks", hope: "you can spend a Hope" }],
  "ancestry:Ribbet": [{ feature: "Long Tongue", stress: "Mark a Stress" }],
  "ancestry:Skykin": [
    { feature: "Gale Force", stress: "Mark a Stress" },
    { feature: "Eye of the Storm", hope: "Spend 2 Hope" },
  ],
  "ancestry:Tidekin": [{ feature: "Lifespring", stress: "you can mark a Stress" }],
  "armor:Advanced Brigandine Armor": [{ feature: "Lined", stress: "Mark a Stress" }],
  "armor:Astral Raiment": [{ feature: "Stellar", stress: "Mark a Stress" }],
  "armor:Brigandine Armor": [{ feature: "Lined", stress: "Mark a Stress" }],
  "armor:Darkweave Shroud": [{ feature: "Ghostwalker", stress: "mark a Stress" }],
  "armor:Dunamis Silkchain": [{ feature: "Timeslowing", armor: "Mark an Armor Slot" }],
  "armor:Improved Brigandine Armor": [{ feature: "Lined", stress: "Mark a Stress" }],
  "armor:Legendary Brigandine Armor": [{ feature: "Lined", stress: "Mark a Stress" }],
  "armor:Resonant Harness": [{ feature: "Vitreous", armor: "you can mark 2 Armor Slots" }],
  "armor:Rosewild Armor": [{ feature: "Hopeful", armor: "you can mark an Armor Slot" }],
  "armor:Runetan Floating Armor": [{ feature: "Shifting", armor: "you can mark an Armor Slot" }],
  "class:Assassin": [
    { feature: "Deadly Determination", hope: "Spend 3 Hope" },
    { feature: "Marked for Death", stress: "you can mark a Stress" },
    { feature: "Get In & Get Out", hope: "Spend a Hope" },
  ],
  "class:Bard": [{ feature: "Make a Scene", hope: "Spend 3 Hope" }],
  "class:Brawler": [
    { feature: "Square Up", hope: "Spend 3 Hope" },
    { feature: "Combo Strike", stress: "you can mark a Stress" },
  ],
  "class:Druid": [
    { feature: "Evolution", hope: "Spend 3 Hope" },
    { feature: "Beastform", stress: "Mark a Stress" },
  ],
  "class:Guardian": [{ feature: "Frontline Tank", hope: "Spend 3 Hope" }],
  "class:Ranger": [
    { feature: "Hold Them Off", hope: "Spend 3 Hope" },
    { feature: "Ranger’s Focus", hope: "Spend a Hope" },
  ],
  "class:Rogue": [{ feature: "Rogue’s Dodge", hope: "Spend 3 Hope" }],
  "class:Seraph": [{ feature: "Life Support", hope: "Spend 3 Hope" }],
  "class:Sorcerer": [{ feature: "Volatile Magic", hope: "Spend 3 Hope" }],
  "class:Warlock": [{ feature: "Patron’s Boon", hope: "you can spend 3 Hope" }],
  "class:Warrior": [{ feature: "No Mercy", hope: "Spend 3 Hope" }],
  "class:Witch": [
    { feature: "Witch’s Charm", hope: "you can spend 3 Hope" },
    { feature: "Hex", stress: "Mark a Stress" },
  ],
  "class:Wizard": [{ feature: "Not This Time", hope: "Spend 3 Hope" }],
  "community:Reborne": [{ feature: "Found Family", hope: "you can spend a Hope" }],
  "community:Wanderborne": [{ feature: "Nomadic Pack", hope: "you can spend a Hope" }],
  "community:Warborne": [{ feature: "Brave Face", hope: "you can spend a Hope" }],
  "consumable:Circle of the Void": [{ feature: "", stress: "Mark a Stress" }],
  "consumable:Mirror of Marigold": [{ feature: "", hope: "you can spend a Hope" }],
  "consumable:Morphing Clay": [{ feature: "", hope: "You can spend a Hope" }],
  "consumable:Snap Powder": [{ feature: "", stress: "Mark a Stress" }],
  "domainCard:Adjust Reality": [{ feature: "", hope: "you can spend 5 Hope" }],
  "domainCard:Alpha": [{ feature: "", stress: "mark a Stress" }],
  "domainCard:Apex": [{ feature: "", stress: "mark 2 Stress" }],
  "domainCard:Astral Projection": [{ feature: "", stress: "mark a Stress" }],
  "domainCard:Avatar of Terror": [{ feature: "", stress: "Mark a Stress" }],
  "domainCard:Barkskin": [{ feature: "", stress: "mark a Stress" }],
  "domainCard:Battle Monster": [{ feature: "", stress: "you can mark 4 Stress" }],
  "domainCard:Battle-Hardened": [{ feature: "", hope: "you can spend a Hope" }],
  "domainCard:Blink Out": [{ feature: "", hope: "spend a Hope" }],
  "domainCard:Bold Presence": [{ feature: "", hope: "you can spend a Hope" }],
  "domainCard:Bolt Beacon": [{ feature: "", hope: "spend a Hope" }],
  "domainCard:Bone-Touched": [{ feature: "", hope: "you can spend 3 Hope" }],
  "domainCard:Book of Ava": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Book of Exota": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Book of Grynn": [{ feature: "", hope: "spend a Hope" }],
  "domainCard:Book of Illiat": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Book of Korvax": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Book of Sitil": [{ feature: "", hope: "Spend 2 Hope" }],
  "domainCard:Book of Vagras": [{ feature: "", hope: "spend a Hope" }],
  "domainCard:Book of Vyola": [{ feature: "", hope: "spend a Hope" }],
  "domainCard:Book of Yarrow": [{ feature: "", hope: "Spend 5 Hope" }],
  "domainCard:Boost": [{ feature: "", stress: "Mark a Stress" }],
  "domainCard:Brace": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Breaking Blow": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Chain Lightning": [{ feature: "", stress: "Mark 2 Stress" }],
  "domainCard:Chains of Affliction": [{ feature: "", stress: "Mark 2 Stress" }],
  "domainCard:Chariot of Thought": [{ feature: "", hope: "spend a Hope" }],
  "domainCard:Chokehold": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Cloaking Blast": [{ feature: "", hope: "you can spend a Hope" }],
  "domainCard:Codex-Touched": [{ feature: "", stress: "You can mark a Stress" }],
  "domainCard:Cold Solution": [{ feature: "", stress: "You can mark a Stress" }],
  "domainCard:Conjure Swarm": [{ feature: "", stress: "Mark a Stress" }],
  "domainCard:Crush": [{ feature: "", stress: "You can mark a Stress" }],
  "domainCard:Dark Whispers": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Deathrun": [{ feature: "", hope: "Spend 3 Hope" }],
  "domainCard:Deft Deceiver": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Deft Maneuvers": [{ feature: "", stress: "mark a Stress" }],
  "domainCard:Dire Strike": [{ feature: "", hope: "you can spend a Hope" }],
  "domainCard:Disintegration Wave": [{ feature: "", stress: "Mark a Stress" }],
  "domainCard:Divination": [{ feature: "", hope: "spend 3 Hope" }],
  "domainCard:Dread-Touched": [{ feature: "", stress: "you can mark 2 Stress" }],
  "domainCard:Eldritch Flesh": [{ feature: "", hope: "you can spend 2 Hope" }],
  "domainCard:Endless Charisma": [{ feature: "", hope: "you can spend a Hope" }],
  "domainCard:Enrapture": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Feed": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Ferocity": [{ feature: "", hope: "you can spend 2 Hope" }],
  "domainCard:Floating Eye": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Fold": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Force of Nature": [{ feature: "", stress: "Mark a Stress" }],
  "domainCard:Forceful Push": [{ feature: "", hope: "you can spend a Hope" }],
  "domainCard:Full Surge": [{ feature: "", stress: "mark 3 Stress" }],
  "domainCard:Get Back Up": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Glancing Blow": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Glimpse the Hunt": [{ feature: "", stress: "Mark a Stress" }],
  "domainCard:Glyph of Nightfall": [{ feature: "", hope: "spend a Hope" }],
  "domainCard:Grace-Touched": [{ feature: "", armor: "You can mark an Armor Slot" }],
  "domainCard:Ground Pound": [{ feature: "", hope: "Spend 2 Hope" }],
  "domainCard:Healing Field": [{ feature: "", hope: "Spend 2 Hope" }],
  "domainCard:Healing Hands": [{ feature: "", stress: "mark a Stress" }],
  "domainCard:Healing Strike": [{ feature: "", hope: "you can spend 2 Hope" }],
  "domainCard:Hideous Retribution": [{ feature: "", stress: "mark a Stress" }],
  "domainCard:Hold the Line": [{ feature: "", hope: "and spend a Hope" }],
  "domainCard:Hush": [{ feature: "", hope: "spend a Hope" }],
  "domainCard:I Am Your Shield": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:I See it Coming": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Invisibility": [{ feature: "", stress: "mark a Stress" }],
  "domainCard:Jump Scare": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Know Thy Enemy": [{ feature: "", hope: "spend a Hope" }],
  "domainCard:Lead By Example": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Life Ward": [{ feature: "", hope: "Spend 3 Hope" }],
  "domainCard:Manifest Wall": [{ feature: "", hope: "spend a Hope" }],
  "domainCard:Mass Disguise": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Mass Enrapture": [{ feature: "", stress: "Mark a Stress" }],
  "domainCard:Mending Touch": [{ feature: "", hope: "you can spend 2 Hope" }],
  "domainCard:Midnight Spirit": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Midnight-Touched": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Natural Familiar": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Nature’s Tongue": [{ feature: "", hope: "you can spend a Hope" }],
  "domainCard:Never Upstaged": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Notorious": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Onslaught": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Overwhelming Aura": [{ feature: "", hope: "spend 2 Hope" }],
  "domainCard:Phantom Retreat": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Rage Up": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Rain of Blades": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Rapid Riposte": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Reaper’s Strike": [{ feature: "", hope: "spend a Hope" }],
  "domainCard:Reckless": [{ feature: "", stress: "Mark a Stress" }],
  "domainCard:Reckoning": [{ feature: "", stress: "Mark a Stress" }],
  "domainCard:Recovery": [{ feature: "", hope: "You can spend a Hope" }],
  "domainCard:Redirect": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Rend": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Safe Haven": [{ feature: "", hope: "you can spend 2 Hope" }],
  "domainCard:Shape Material": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Shield Aura": [{ feature: "", stress: "Mark a Stress" }],
  "domainCard:Shrug It Off": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Smite": [{ feature: "", hope: "spend 3 Hope" }],
  "domainCard:Specter of the Dark": [{ feature: "", stress: "Mark a Stress" }],
  "domainCard:Spectral Mist": [{ feature: "", hope: "Spend 2 Hope" }],
  "domainCard:Splintering Strike": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Stealth Expertise": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Summon Horror": [{ feature: "", stress: "Mark a Stress" }],
  "domainCard:Support Tank": [{ feature: "", hope: "you can spend 2 Hope" }],
  "domainCard:The Beast": [{ feature: "", stress: "mark a Stress" }],
  "domainCard:The Pack Knows": [{ feature: "", hope: "you can spend a Hope" }],
  "domainCard:Thorn Skin": [{ feature: "", hope: "spend a Hope" }],
  "domainCard:Thought Delver": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Towering Stalk": [{ feature: "", stress: "Mark a Stress" }],
  "domainCard:Transcendent Union": [{ feature: "", hope: "spend 5 Hope" }],
  "domainCard:Umbral Veil": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Uncanny Disguise": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Vanishing Dodge": [{ feature: "", hope: "you can spend a Hope" }],
  "domainCard:Vector": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Versatile Fighter": [{ feature: "", stress: "you can mark a Stress" }],
  "domainCard:Vicious Entangle": [{ feature: "", hope: "you can spend a Hope" }],
  "domainCard:Wall Walk": [{ feature: "", hope: "Spend a Hope" }],
  "domainCard:Wall of Hunger": [{ feature: "", hope: "you can spend a Hope" }],
  "domainCard:Whirlwind": [{ feature: "", hope: "you can spend a Hope" }],
  "domainCard:Wild Fortress": [{ feature: "", hope: "spend 2 Hope" }],
  "domainCard:Wild Surge": [{ feature: "", stress: "mark a Stress" }],
  "domainCard:Wrangle": [{ feature: "", hope: "Spend a Hope" }],
  "feature:Crushing": [{ feature: "", hope: "you can spend a Hope" }],
  "feature:Vigilant": [{ feature: "", stress: "you can mark a Stress" }],
  "loot:Belt of Unity": [{ feature: "", hope: "you can spend 5 Hope" }],
  "loot:Cheater’s Coin": [{ feature: "", hope: "you can spend a Hope" }],
  "loot:Communion Relic": [{ feature: "", hope: "you can spend a Hope" }],
  "loot:Crucible Frames": [{ feature: "", hope: "you can spend a Hope" }],
  "loot:Gadiman’s Backpack": [{ feature: "", hope: "you can spend a Hope" }],
  "loot:Glamour Stone": [{ feature: "", hope: "Spend a Hope" }],
  "loot:Glider": [{ feature: "", stress: "you can mark a Stress" }],
  "loot:Hopekeeper Locket": [{ feature: "", hope: "you can spend a Hope" }],
  "loot:Iron Dagger Pendant": [{ feature: "", hope: "you can spend a Hope" }],
  "loot:Molepaw Mittens": [{ feature: "", hope: "Spend a Hope" }],
  "loot:Nighthawker’s Ring": [{ feature: "", hope: "Spend a Hope" }],
  "loot:Paragon’s Chain": [{ feature: "", hope: "you can spend a Hope" }],
  "loot:Ring of Silence": [{ feature: "", hope: "Spend a Hope" }],
  "loot:Ring of Unbreakable Resolve": [{ feature: "", hope: "you can spend 4 Hope" }],
  "loot:Shard of Memory": [{ feature: "", hope: "you can spend 2 Hope" }],
  "loot:Soul-Twin Circlets": [{ feature: "", hope: "You can spend a Hope" }],
  "loot:Vial of Darksmoke Recipe": [{ feature: "", stress: "you can mark a Stress" }],
  "loot:Warp Pendant": [{ feature: "", stress: "mark a Stress" }],
  "subclass:Call of the Slayer: Specialization": [
    { feature: "Weapon Specialist", hope: "you can spend a Hope" },
  ],
  "subclass:Divine Wielder: Foundation": [
    { feature: "Spirit Weapon", stress: "You can mark a Stress" },
  ],
  "subclass:Elemental Origin: Foundation": [{ feature: "Elementalist", hope: "spend a Hope" }],
  "subclass:Elemental Origin: Specialization": [
    { feature: "Natural Evasion", stress: "you can mark a Stress" },
  ],
  "subclass:Executioners Guild: Mastery": [
    { feature: "True Strike", hope: "you can spend a Hope" },
  ],
  "subclass:Executioners Guild: Specialization": [
    { feature: "Death Strike", stress: "you can mark a Stress" },
  ],
  "subclass:Hedge: Specialization": [
    { feature: "Walk Between Worlds", stress: "you can mark a Stress" },
  ],
  "subclass:Juggernaut: Foundation": [{ feature: "Overwhelm", hope: "you can spend a Hope" }],
  "subclass:Juggernaut: Specialization": [
    { feature: "Eye for an Eye", stress: "you can mark a Stress" },
  ],
  "subclass:Martial Artist: Mastery": [
    { feature: "Flow State", stress: "You can mark a Stress" },
  ],
  "subclass:Moon: Mastery": [{ feature: "Lunar Phases", hope: "Spend a Hope" }],
  "subclass:Nightwalker: Foundation": [
    { feature: "Shadow Stepper", stress: "you can mark a Stress" },
  ],
  "subclass:Nightwalker: Mastery": [{ feature: "Vanishing Act", stress: "Mark a Stress" }],
  "subclass:Poisoners Guild: Foundation": [
    { feature: "Toxic Concoctions", stress: "Mark a Stress" },
  ],
  "subclass:Primal Origin: Foundation": [
    { feature: "Manipulate Magic", stress: "you can mark a Stress" },
  ],
  "subclass:Primal Origin: Mastery": [{ feature: "Arcane Charge", hope: "you can spend 2 Hope" }],
  "subclass:School of Knowledge: Foundation": [
    { feature: "Adept", stress: "you can mark a Stress" },
  ],
  "subclass:School of War: Mastery": [
    { feature: "Thrive in Chaos", stress: "you can mark a Stress" },
  ],
  "subclass:Stalwart: Mastery": [{ feature: "Loyal Protector", stress: "you can mark a Stress" }],
  "subclass:Stalwart: Specialization": [
    { feature: "Partners in Arms", armor: "you can mark an Armor Slot" },
  ],
  "subclass:Vengeance: Foundation": [{ feature: "Revenge", stress: "you can mark 2 Stress" }],
  "subclass:Vengeance: Mastery": [{ feature: "Nemesis", hope: "Spend 2 Hope" }],
  "subclass:Warden of Renewal: Foundation": [
    { feature: "Regeneration", hope: "and spend 3 Hope" },
  ],
  "subclass:Warden of Renewal: Mastery": [
    { feature: "Defender", stress: "you can mark a Stress" },
  ],
  "subclass:Warden of Renewal: Specialization": [
    { feature: "Warden’s Protection", hope: "spend 2 Hope" },
  ],
  "subclass:Warden of the Elements: Foundation": [
    { feature: "Elemental Incarnation", stress: "Mark a Stress" },
  ],
  "subclass:Warden of the Elements: Mastery": [
    { feature: "Elemental Dominion", stress: "you can mark a Stress" },
  ],
  "subclass:Warden of the Elements: Specialization": [
    { feature: "Elemental Aura", stress: "you can mark a Stress" },
  ],
  "subclass:Wayfinder: Foundation": [
    { feature: "Ruthless Predator", stress: "you can mark a Stress" },
  ],
  "subclass:Wayfinder: Mastery": [{ feature: "Apex Predator", hope: "you can spend a Hope" }],
  "subclass:Winged Sentinel: Foundation": [
    { feature: "Wings of Light", stress: "Mark a Stress" },
  ],
  "subclass:Wordsmith: Foundation": [
    { feature: "Heart of a Poet", hope: "you can spend a Hope" },
  ],
  "transformation:Vampire": [{ feature: "Feed", stress: "you can mark a Stress" }],
  "transformation:Werewolf": [{ feature: "Wolf Form", stress: "you can mark a Stress" }],
  "weapon:Advanced Arcane Rifle": [{ feature: "Aimed", stress: "You can mark a Stress" }],
  "weapon:Advanced Enchanted Chakram": [{ feature: "Ricochet", stress: "you can mark a Stress" }],
  "weapon:Advanced Hatchet": [{ feature: "Follow-Up", stress: "you can mark a Stress" }],
  "weapon:Advanced Katana": [{ feature: "Quick", stress: "you can mark a Stress" }],
  "weapon:Advanced Light-Frame Wheelchair": [
    { feature: "Quick", stress: "you can mark a Stress" },
  ],
  "weapon:Advanced Rapier": [{ feature: "Quick", stress: "you can mark a Stress" }],
  "weapon:Advanced Whip": [{ feature: "Startling", stress: "Mark a Stress" }],
  "weapon:Arcane Rifle": [{ feature: "Aimed", stress: "You can mark a Stress" }],
  "weapon:Axe of Fortunis": [{ feature: "Lucky", stress: "you can mark a Stress" }],
  "weapon:Bec de Corbin": [{ feature: "Devastating", stress: "you can mark a Stress" }],
  "weapon:Bladed Whip": [{ feature: "Quick", stress: "you can mark a Stress" }],
  "weapon:Blitz Hammer": [{ feature: "Accelerator", stress: "mark a Stress" }],
  "weapon:Buckler": [{ feature: "Deflecting", armor: "you can mark an Armor Slot" }],
  "weapon:Chained Scythe": [{ feature: "Quick", stress: "you can mark a Stress" }],
  "weapon:Clockwork Crossbow": [{ feature: "Quick", stress: "you can mark a Stress" }],
  "weapon:Dual-Ended Sword": [{ feature: "Quick", stress: "you can mark a Stress" }],
  "weapon:Eldritch Vambrace": [{ feature: "Deflecting", armor: "you can mark an Armor Slot" }],
  "weapon:Enchanted Chakram": [{ feature: "Ricochet", stress: "you can mark a Stress" }],
  "weapon:Gravity Arbalest": [{ feature: "Magnetic", hope: "you can spend a Hope" }],
  "weapon:Hammer of Wrath": [{ feature: "Devastating", stress: "you can mark a Stress" }],
  "weapon:Hatchet": [{ feature: "Follow-Up", stress: "you can mark a Stress" }],
  "weapon:Impact Gauntlet": [{ feature: "Concussive", hope: "you can spend a Hope" }],
  "weapon:Improved Arcane Rifle": [{ feature: "Aimed", stress: "You can mark a Stress" }],
  "weapon:Improved Enchanted Chakram": [{ feature: "Ricochet", stress: "you can mark a Stress" }],
  "weapon:Improved Hatchet": [{ feature: "Follow-Up", stress: "you can mark a Stress" }],
  "weapon:Improved Katana": [{ feature: "Quick", stress: "you can mark a Stress" }],
  "weapon:Improved Light-Frame Wheelchair": [
    { feature: "Quick", stress: "you can mark a Stress" },
  ],
  "weapon:Improved Rapier": [{ feature: "Quick", stress: "you can mark a Stress" }],
  "weapon:Improved Whip": [{ feature: "Startling", stress: "Mark a Stress" }],
  "weapon:Katana": [{ feature: "Quick", stress: "you can mark a Stress" }],
  "weapon:Legendary Arcane Rifle": [{ feature: "Aimed", stress: "You can mark a Stress" }],
  "weapon:Legendary Enchanted Chakram": [
    { feature: "Ricochet", stress: "you can mark a Stress" },
  ],
  "weapon:Legendary Hatchet": [{ feature: "Follow-Up", stress: "you can mark a Stress" }],
  "weapon:Legendary Katana": [{ feature: "Quick", stress: "you can mark a Stress" }],
  "weapon:Legendary Light-Frame Wheelchair": [
    { feature: "Quick", stress: "you can mark a Stress" },
  ],
  "weapon:Legendary Rapier": [{ feature: "Quick", stress: "you can mark a Stress" }],
  "weapon:Legendary Whip": [{ feature: "Startling", stress: "Mark a Stress" }],
  "weapon:Light-Frame Wheelchair": [{ feature: "Quick", stress: "you can mark a Stress" }],
  "weapon:Powered Gauntlet": [{ feature: "Charged", stress: "Mark a Stress" }],
  "weapon:Rapier": [{ feature: "Quick", stress: "you can mark a Stress" }],
  "weapon:Razor Wire": [{ feature: "Entangling", hope: "you can spend a Hope" }],
  "weapon:Rocket Maul": [{ feature: "Concussive", hope: "you can spend a Hope" }],
  "weapon:Soldier’s Pike": [{ feature: "Braced", stress: "you can mark 2 Stress" }],
  "weapon:Soul Chain": [{ feature: "Draining", hope: "you can spend a Hope" }],
  "weapon:Splintershaft Bow": [{ feature: "Volleyed", hope: "Spend a Hope" }],
  "weapon:Staff of Augma": [{ feature: "Catalytic", stress: "you can mark a Stress" }],
  "weapon:Swinging Ropeblade": [{ feature: "Grappling", hope: "you can spend a Hope" }],
  "weapon:Vorpal Shard": [{ feature: "Targeted", hope: "you can spend a Hope" }],
  "weapon:Wand of Enthrallment": [{ feature: "Persuasive", stress: "you can mark a Stress" }],
  "weapon:Whip": [{ feature: "Startling", stress: "Mark a Stress" }],
};

/**
 * What the pattern reaches that is not a price of using the feature.
 *
 * All five are the same finding, and it is the one the widening could not
 * avoid: **a feature that states two different currencies**. `featurePrice`
 * calls `priceOf` once per currency, so a card offering a Hope for one thing
 * and a Stress for another is charged both — and nobody ever pays both. What
 * the second currency buys is either something the first already gave you, or
 * a different spell on the same grimoire, or the other half of an either/or.
 *
 * So the invariant this block records is that **no feature prices two
 * currencies**, and a new one that does lands here rather than silently
 * double-charging somebody. The later-stated clause is the declined one,
 * because the earlier is the one that reads as the card's own price.
 */
const DECLINED = {
  "subclass:Winged Sentinel: Foundation": [
    {
      feature: "Wings of Light",
      hope: "Spend a Hope",
      why:
        "the second of two bulleted uses of flight — the Stress carries a " +
        "creature and this deals extra damage, and you pay one of them",
    },
  ],
  "domainCard:Know Thy Enemy": [
    {
      feature: "",
      stress: "you can mark a Stress",
      why:
        "bought after the Instinct Roll the card's Hope already paid for — " +
        "the card's own words are 'Additionally on a success'",
    },
  ],
  "domainCard:Book of Korvax": [
    {
      feature: "",
      stress: "Mark a Stress",
      why:
        "Rune Circle's price, on a grimoire of four spells; Recant's Hope is " +
        "the one the sweep reaches first",
    },
  ],
  "domainCard:Conjure Swarm": [
    {
      feature: "",
      hope: "You can spend a Hope",
      why: "keeps beetles the card's Stress already conjured, after they have taken the damage",
    },
  ],
  "domainCard:Natural Familiar": [
    {
      feature: "",
      stress: "and mark a Stress",
      why: "sees through the eyes of a familiar the card's Hope already summoned",
    },
  ],
};

/* ── the walk ─────────────────────────────────────────────────────────── */
{
  const equipment = await load("equipment.mjs");
  const docs = new Map();
  for (const list of [classes, heritage, domains, equipment])
    for (const d of list) docs.set(`${d.type}:${d.name}`, d);

  /* what the pattern charges today */
  const charged = new Map();
  for (const [k, doc] of docs) {
    for (const b of priceBlocks(doc)) {
      for (const [unit, pattern] of Object.entries(PRICE_UNITS)) {
        const m = priceClause(b.text, pattern);
        if (m) charged.set(priceId(k, b.feature, unit), clauseOf(m));
      }
      if (priceClause(b.text, "armor slot") && priceClause(b.text, "armor slots"))
        fail(`price/${k}`, "states an Armor Slot price in both singular and plural", b.feature || k, "one");
    }
  }

  /* what somebody has read */
  const read = new Map();
  for (const [table, listed] of [[PRICED, "PRICED"], [DECLINED, "DECLINED"]]) {
    for (const [k, list] of Object.entries(table)) {
      const at = `price/${k}`;
      const doc = docs.get(k);
      if (!doc) {
        fail(at, `${listed} names a card that is not in the packs`, k, "—");
        continue;
      }
      const features = priceBlocks(doc).map((b) => b.feature);
      for (const e of list) {
        const unit = Object.keys(PRICE_UNITS).find((u) => u in e);
        if (!unit) {
          fail(at, `${listed} entry names no currency`, JSON.stringify(e), "hope / stress / fear / armor");
          continue;
        }
        if (!features.includes(e.feature))
          fail(
            at,
            `${listed} names a feature this card does not have`,
            e.feature || "(the card's own text)",
            features.join(" / ") || "none",
          );
        if (listed === "DECLINED" && !e.why?.trim())
          fail(at, "DECLINED with no reason given", e.feature || k, "—");
        const id = priceId(k, e.feature, unit);
        if (read.has(id)) {
          fail(at, "is read twice for the same currency", `${e.feature || "(the card)"} · ${unit}`, "once");
          continue;
        }
        read.set(id, e);
        const now = charged.get(id);
        if (now === undefined)
          fail(at, "is no longer priced, so the reading is stale", e[unit], "—");
        else if (norm(now) !== norm(e[unit]))
          fail(at, "prices a different clause than the one it was read from", e[unit], now);
      }
    }
  }

  /* and the ratchet */
  for (const [id, said] of charged) {
    if (read.has(id)) continue;
    const [k, feature, unit] = id.split("§");
    fail(
      `price/${k}`,
      `charges ${unit} for a clause nobody has read`,
      `${feature || "(the card's own text)"}: “${said}”`,
      "an entry in PRICED, or in DECLINED with the reason it is not a price",
    );
  }

  priceCounts.clauses = charged.size;
  priceCounts.docs = new Set([...charged.keys()].map((id) => id.split("§")[0])).size;
  priceCounts.declined = Object.values(DECLINED).reduce((a, l) => a + l.length, 0);
}

/** Every card we ship art for should also credit it. */
function checkPrinting(where, doc, o) {
  const p = doc.system.printing ?? {};
  if (doc.img?.includes("/assets/cards/") && !p.artist)
    fail(where, "ships art with no artist credit", doc.img, "—");
  const code = o.cardId || o.artId || "";
  if (code && p.code !== code) fail(where, "card number differs", p.code || "(none)", code);
}

/**
 * Every path a card claims for its art resolves to a file.
 *
 * This is what makes *deriving* the Hope and Fear paths safe. The corebook's
 * are listed in `card-printings.mjs` because they cannot be derived — upstream
 * files Halfling under `halflings.webp` — and a listed path that goes stale
 * falls back to the sigil plate, which looks like a card with no art rather
 * than like a mistake. A *derived* path cannot miss quietly in the same way: it
 * is always produced, so a renamed card or a painting that never landed shows
 * up as a broken image in a chat log. Checking the file exists is cheaper than
 * either failure and catches both.
 *
 * Every pack, not just the new ones, because the question is the same one for
 * all of them and the corebook has 234 answers to it.
 */
async function checkArtResolves() {
  const seen = new Set();
  for (const f of ["domains.mjs", "heritage.mjs", "classes.mjs", "equipment.mjs"]) {
    for (const doc of await load(f)) {
      const img = doc.img ?? "";
      if (!img.startsWith(`${SYSTEM_PATH}/`) || seen.has(img)) continue;
      seen.add(img);
      const rel = img.slice(SYSTEM_PATH.length + 1);
      if (!existsSync(join(ROOT, rel)))
        fail(`${doc.type}/${doc.name}`, "art path resolves to nothing", img, "a file on disk");
    }
  }
  return seen.size;
}
const artPaths = await checkArtResolves();

/* ── report ───────────────────────────────────────────────────────────── */

/* The prices are counted out loud, because a ratchet that quietly stopped
   sweeping would report exactly the same "no findings" as one that swept
   everything and found nothing wrong. */
const prices =
  `${priceCounts.clauses} priced clauses on ${priceCounts.docs} cards ` +
  `(${priceCounts.declined} declined)`;

if (!findings.length) {
  console.log(
    `check-cards: no findings — the compendium matches the official cards, ` +
      `${prices}, and all ${artPaths} art paths resolve.`,
  );
  process.exit(0);
}

const groups = new Map();
for (const f of findings) {
  if (!groups.has(f.where)) groups.set(f.where, []);
  groups.get(f.where).push(f);
}
for (const [where, fs] of groups) {
  console.log(`\n${where}`);
  for (const f of fs) {
    console.log(`  ${f.what}`);
    console.log(`    ours:     ${f.ours}`);
    console.log(`    official: ${f.theirs}`);
  }
}
console.log(`\ncheck-cards: ${findings.length} finding(s) across ${groups.size} card(s).`);
process.exit(1);
