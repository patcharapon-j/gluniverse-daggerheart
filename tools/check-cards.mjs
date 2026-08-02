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
 * official class card, so nothing can validate a class description — and what
 * got pasted into one was the rulebook's chapter opener, which is not a card's
 * flavour and never was. CLASS_FLAVOUR is the rule: a class has none.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { splitFeatures } from "./fetch-cards.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FULL = process.argv.includes("--full");

/**
 * A class card carries **no flavour at all**.
 *
 * This started at two sentences, then one, and one was still one too many.
 * Every candidate sentence came from the same place — the rulebook's chapter
 * opener — and a chapter opener is written to introduce twelve pages, not to
 * sit above a stat block. There is no printed class card, so there is no
 * printed flavour either, and inventing some to fill the slot is the whole
 * mistake restated smaller.
 *
 * What a class *is* at the table is Evasion, Hit Points, a Hope feature and a
 * class feature. The card is those things now, and the `.fl` slot simply does
 * not appear.
 */
const CLASS_FLAVOUR = "";

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

/* Cards are matched by name, and the two sides punctuate names differently:
   the compendium is typeset ("Reaper’s Strike"), the API is typewritten
   ("Reaper's Strike"). Same card. The key ignores the difference; the report
   still prints whichever name it was handed. */
const key = (name) => String(name).replace(/[‘’ʼ]/g, "'").toLowerCase();
const index = (arr) => new Map(arr.map((x) => [key(x.name), x]));

/* ancestries */
{
  const off = index(official.ancestry);
  for (const a of pick(heritage, "ancestry")) {
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

/* classes — no upstream, so the only rule is the one the cards keep */
for (const c of pick(classes, "class")) {
  const text = norm(c.system.description);
  if (text !== CLASS_FLAVOUR)
    fail(
      `class/${c.name}`,
      "a class card carries no flavour; this one has some",
      `${text.slice(0, 90)}${text.length > 90 ? "…" : ""}`,
      "(nothing)",
    );
  if (!c.system.classFeature?.name && !c.system.classFeature?.length)
    fail(`class/${c.name}`, "no class feature", "—", "—");
  if (!c.system.hopeFeature?.name) fail(`class/${c.name}`, "no Hope feature", "—", "—");
}

/** Every card we ship art for should also credit it. */
function checkPrinting(where, doc, o) {
  const p = doc.system.printing ?? {};
  if (doc.img?.includes("/assets/cards/") && !p.artist)
    fail(where, "ships art with no artist credit", doc.img, "—");
  const code = o.cardId || o.artId || "";
  if (code && p.code !== code) fail(where, "card number differs", p.code || "(none)", code);
}

/* ── report ───────────────────────────────────────────────────────────── */

if (!findings.length) {
  console.log("check-cards: no findings — the compendium matches the official cards.");
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
