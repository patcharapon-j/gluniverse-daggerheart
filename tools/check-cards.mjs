/*
 * Audits the compendium against the official card snapshot.
 *
 *     node tools/check-cards.mjs          # report, exit 1 on any finding
 *     node tools/check-cards.mjs --full   # print the full text of each finding
 *
 * `domain-cards.mjs` is generated and cannot drift — except where
 * `card-errata.mjs` deliberately corrects it, which this reads and applies to
 * the *official* side before comparing, so a card carrying an erratum is still
 * audited against everything else upstream says about it. Everything else here is
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
 * The snapshot stops being the authority the moment somebody publishes a
 * correction to it. `ERRATA` below is the list of sentences the System
 * Reference Document prints differently from the Card Creator's copy, each
 * with the reason and each a ratchet — see the block for the argument.
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
import CARD_ERRATA from "../src/packs-src/card-errata.mjs";

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

/* ── errata newer than the snapshot ───────────────────────────────────
   The snapshot is the authority for wording right up to the moment
   somebody publishes a correction to it, and then it is a photograph of
   what the card *used to say*. The System Reference Document 2.0 of
   2026-08-25 is that case: two of the cards it prints differ from the
   Card Creator's copy, and the pack now carries the SRD's wording — so
   without this block the check would be holding the compendium to a
   version the rules have moved past.

   It is `fetch-cards.mjs`'s `TYPOS` in a second place and deliberately
   the same shape: keyed `<where>` — the string this file already builds
   for a card — with `find` matched literally, once, against the official
   side before the comparison. And it is a ratchet in the same way. A
   `find` that stops matching **fails**, because upstream having adopted
   the erratum and upstream having rewritten the card around it look
   identical from here and only one of them means this entry can go. So
   a re-fetch that catches up with the SRD sends somebody to delete the
   line rather than leaving a substitution nobody can still justify.

   Two entries, and neither is a preference: each is a printed sentence
   in a document newer than the one being compared against. */
const ERRATA = [
  {
    at: "community/Seaborne",
    find: "place a token on this card",
    to: "place a token on your community card",
    why: "SRD 2.0 names the card, because a community feature that says " +
      "'this card' is ambiguous the moment it is read off anything else.",
  },
  {
    at: "subclass/Winged Sentinel: Mastery",
    find: "1d8 with your",
    to: "1d8 from your",
    why: "SRD 2.0. The damage comes from the other feature; it is not " +
      "dealt alongside it.",
  },
];

/**
 * Bring the official side up to the newest printed wording.
 *
 * Two sources, and the split between them is whether the pack has to *carry*
 * the correction. `ERRATA` above is wording the compendium already has right —
 * the entries are hand-authored, somebody typed the SRD's sentence, and all
 * this needs is to stop calling it a difference. `src/packs-src/card-errata.mjs`
 * is the other case: those cards are **generated** from the snapshot, so the
 * pack cannot simply have them right, and there is a live overlay shipping the
 * SRD's wording into the built documents. Reading that overlay here rather than
 * copying its four sentences into the table above is the whole point — a second
 * copy maintained by hand is exactly what the two files would drift on, and it
 * would drift into this check quietly agreeing with a pack that had changed.
 */
function errata(where, theirs) {
  let out = String(theirs ?? "");
  for (const e of ERRATA) {
    if (e.at !== where || !out.includes(e.find)) continue;
    out = out.replace(e.find, e.to);
    e.applied = true;
  }
  return packErrata(where, out);
}

/** Compare two pieces of prose; report the first word that differs. */
function same(where, what, ours, theirs) {
  const a = norm(ours);
  const b = norm(errata(where, theirs));
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

/**
 * The pack's own errata overlay, applied to the official side.
 *
 * `src/packs-src/card-errata.mjs` corrects four *generated* cards against the
 * SRD, so those four deliberately no longer say what the snapshot says. There
 * were three ways to keep this check quiet about that and two of them are worse.
 * Skipping an errata'd card altogether would take *everything else* the audit
 * says about it with it — its domain, its level, its Recall Cost and the whole
 * rest of its prose stop being compared, on exactly the four cards somebody has
 * most recently had their hands on. Loosening the comparison would do the same
 * thing less visibly. So the patch is applied to the official side instead: the
 * card is audited against upstream-plus-the-erratum, which is what we actually
 * claim it should say, and any *other* difference still fails.
 *
 * `where` is the string this file already builds for a card — `domain/Whirlwind`
 * — and the overlay is keyed `domainCard:Whirlwind`, the `type:name` its three
 * sibling annotation files use. The translation lives here rather than in either
 * table, because both keys are right in their own file and neither is a fact
 * about the other.
 *
 * The substitution runs on `norm`ed text rather than on the raw content, and
 * that is not laziness — the overlay's `find` is written against the generated
 * corpus, which has been through `tidy()`, while the content here is what the
 * API sent: typewriter apostrophes, upstream's own whitespace, and in one case a
 * `TYPOS` fix that has not been applied yet. `norm` is the one form in which the
 * two are the same words, and it is what both sides get compared through anyway.
 * It is idempotent, so `same` norming the result again costs nothing.
 *
 * A patch whose `find` is not there **fails** rather than being skipped, which
 * is `ERRATA`'s own ratchet and `withErrata`'s own throw arriving a third time:
 * an overlay correcting a sentence the official card no longer contains is a
 * reading that has stopped being true, and every copy of that claim has to go
 * stale together.
 */
function packErrata(where, content) {
  const [kind, ...rest] = String(where).split("/");
  if (kind !== "domain") return content;
  const patches = CARD_ERRATA[`domainCard:${rest.join("/")}`];
  if (!patches) return content;
  let t = norm(content);
  for (const p of patches) {
    const from = norm(p.find);
    if (!t.includes(from)) {
      fail(where, "card-errata corrects a sentence the official card does not have", p.find, "—");
      continue;
    }
    t = t.replace(from, norm(p.to));
  }
  return t;
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

/* ── what the sheet charges for a feature, and why that is gone ────────
   This file used to carry `PRICED` — 275 documents and 843 quoted clauses,
   every cost `featurePrice` charged across the four packs, with the words it
   was read from. It existed because the sheet decided a card's buttons by
   sweeping its prose at render time, and the only way to make that safe was
   to have somebody read every clause the pattern reached.

   The sheet does not do that any more. Costs are authored in
   `src/packs-src/card-actions.mjs` and `tools/check-actions.mjs` is the
   ratchet on them, and it asks the opposite question — not *did the pattern
   start charging something nobody read*, but *is there a rule unit nobody has
   read*. That is strictly stronger, and this file said so in its own words
   while `PRICED` was still here: it could not prove a price was **missed**,
   because a card stating a cost in words the regex did not know was invisible
   to it by construction. Coverage over a closed corpus can.

   So the block is deleted rather than left standing. A ratchet policing a
   pattern nothing runs is a check that goes green on a system it no longer
   describes, which is worse than no check: the next reader would trust it.

   `featurePrice` itself survives, in `src/module/sheets/suggest.ts`, as the
   engine behind the item sheet's "suggest" press. Nothing it produces reaches
   a player without somebody having looked at it first, which is exactly the
   guarantee `PRICED` was buying by hand. */

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

/* The errata ratchet. An entry that matched nothing this run is one whose
   sentence has left the snapshot, and the two ways that happens — upstream
   adopted the correction, or upstream rewrote the card — are indistinguishable
   from here. Say so rather than going on quietly substituting. */
for (const e of ERRATA)
  if (!e.applied)
    fail(e.at, "errata entry no longer matches the snapshot", e.find, "not on the official card");

/* ── report ───────────────────────────────────────────────────────────── */

if (!findings.length) {
  console.log(
    `check-cards: no findings — the compendium matches the official cards, ` +
      `and all ${artPaths} art paths resolve.`,
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
