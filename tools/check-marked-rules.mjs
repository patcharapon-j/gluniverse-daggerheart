/**
 * What stops *The Twilight Marked*'s rules journal rotting.
 *
 *     node --disable-warning=ExperimentalWarning --experimental-strip-types tools/check-marked-rules.mjs
 *
 * `tools/check-variant-rules.mjs` has the harder half of this job and is
 * honest about losing it: sixteen pages of SRD prose have no regularities to
 * assert, and a paragraph transcribed from page 197 and a paragraph somebody
 * paraphrased look identical to a program. It checks structure and says so.
 *
 * This one gets a better hand, because the thing it is checking prose *about*
 * is in this repo. `src/module/marked.ts` is the frame's four rules as
 * arithmetic and `src/packs-src/marked-cards.mjs` is the forty-two cards, so
 * every number the journal states and every card it lists has a source that
 * can be made to answer. The failure this file exists to catch is the one the
 * campaign vault's note already made once: a deck retuned in the module and a
 * document still quoting the old figures, with nothing on either side to say
 * they had parted company.
 *
 * ── 1. the numbers are run, not transcribed ───────────────────────────
 * The rules are **imported and executed** against a stub actor. `markPrice`
 * says what a use costs at an empty pool, at a full one, while *Surging* and
 * on the two cards that buy an extra action; `rollOffMark` is driven to a
 * success and to a failure to get the Difficulty formula, the buy-down rate
 * and the Stress a failure keeps; the loadout toll is charged by firing the
 * same `updateItem` hook `registerMarked` registers. Every figure the prose
 * states is then looked for in the rendered HTML as a string built from what
 * the code just did.
 *
 * That is the point of doing it this way round. A list of expected numbers
 * typed into this file would be a *third* copy — the code, the journal and the
 * checker — and the checker's copy is the worst of the three, because it is
 * the one nobody reads and the one that makes the other two agree with it
 * rather than with each other.
 *
 * `rollOffMark` posts a duality plate, so getting it to run at all needs a
 * `Roll` whose total this file chooses. That is a stub of the dice and not of
 * the rule: the Difficulty, the clamp, the Mark clearing and the Stress are
 * all `marked.ts`'s own, computed here for real.
 *
 * ── 2. the deck listings are the deck ─────────────────────────────────
 * Both tables are checked against `marked-cards.mjs` in both directions, which
 * is `check-resources.mjs`'s ratchet in a new place: a card missing from a
 * listing fails, and a row naming something that is not a card fails too. The
 * second half is what catches the edit that actually happens — a card renamed
 * in the module while the journal keeps the old name, which leaves a document
 * that looks complete and names a card nobody can find.
 *
 * Each row's level, thread, type and recall are compared cell by cell, and the
 * text cell is compared to the card's own text with the markup taken off both
 * sides. That last one is the strongest assertion in this file and it is worth
 * saying what it does and does not catch: it proves the journal is printing
 * the card's words, so a paraphrase or a stale damage expression fails. It
 * proves nothing about whether the card is any good.
 *
 * ── 3. what it cannot check ───────────────────────────────────────────
 * That the prose is *right*. Nothing here can know whether "Void reads and
 * spends the Fear pool" is still a fair description of the deck, whether the
 * table procedure matches what a player actually experiences, or whether the
 * four rules are explained in an order that helps. Those are readings, and the
 * only honest provenance for them is that somebody sat down with the code and
 * wrote them.
 *
 * What it does check about the prose is every claim in it that a program can
 * falsify: the numbers, the card lists, the two Spellcast traits, the
 * conditions it names, the action kinds it explains, and the one promise the
 * document makes about itself — that the scope statement on page one is there
 * at all, because a GM who believes nothing is automated will charge the
 * loadout toll twice.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const problems = [];
const bad = (what) => problems.push(what);

/* ── the Foundry a rule needs to run ──────────────────────────────────
   `marked.ts` imports the roll engine, which evaluates Dice So Nice's texture
   table at module scope, so it cannot be imported into a bare node at all —
   CLAUDE.md names this as the reason the Spellcast lookup moved to
   `config.ts`. The stubs are `test-fear-claim.mjs`'s, one module further on:
   enough globals that the import succeeds and the arithmetic is the real
   arithmetic.

   `fear` is a plain let because `getFear()` reads a world setting, and the
   whole question "what does a use cost at a full pool" is a question about
   that number. */

let fear = 0;
const me = { id: "u1", active: true, isGM: true };

globalThis.foundry = {
  utils: {
    getRoute: (p) => p,
    escapeHTML: (s) => String(s),
    mergeObject: (a, b) => ({ ...a, ...b }),
    randomID: () => "id",
    hasProperty: (o, p) => p.split(".").reduce((x, k) => x?.[k], o) !== undefined,
  },
  applications: { api: {} },
};
globalThis.CONST = { CHAT_MESSAGE_STYLES: { OTHER: 0 } };
globalThis.Hooks = { on: () => {}, once: () => {}, callAll: () => {} };
globalThis.ui = { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.game = {
  settings: { get: () => fear, set: async (_n, _k, v) => void (fear = v) },
  user: me,
  users: Object.assign([me], { activeGM: me, find: (f) => [me].find(f) }),
  i18n: { lang: "en", localize: (k) => k, format: (k) => k },
};
Math.clamp ??= (n, lo, hi) => Math.min(Math.max(n, lo), hi);
globalThis.renderTemplate = async () => "";
globalThis.ChatMessage = {
  create: async (d) => ({ id: "msg", ...d, getFlag: () => undefined, setFlag: async () => {}, unsetFlag: async () => {} }),
  applyRollMode: () => {},
  getSpeaker: () => ({}),
};

/**
 * A `Roll` whose total this file picks.
 *
 * The dice are the only thing stubbed. `rollDuality` reads two d12 faces off
 * the terms to decide Hope or Fear and compares `total` to the Difficulty to
 * decide the hit, and both of those have to be *chosen* rather than rolled or
 * the failure branch would be reached one run in three.
 */
let rollTotal = 99;
const face = (f, r) => ({ faces: f, options: {}, results: [{ result: r, active: true }] });
globalThis.Roll = class {
  constructor(formula) {
    this.formula = formula;
    this.dice = [face(12, 8), face(12, 5)];
    this.total = rollTotal;
  }
  async evaluate() {
    return this;
  }
  toJSON() {
    return {};
  }
};

/* ── the sources ──────────────────────────────────────────────────────── */

const entries = (
  await import(pathToFileURL(join(ROOT, "src", "packs-src", "marked-rules.mjs")).href)
).default;

const CARDS = (await import(pathToFileURL(join(ROOT, "src", "packs-src", "marked-cards.mjs")).href))
  .default;
const ACTIONS = (await import(pathToFileURL(join(ROOT, "src", "packs-src", "card-actions.mjs")).href))
  .default;
const DAMAGE = (await import(pathToFileURL(join(ROOT, "src", "packs-src", "card-damage.mjs")).href))
  .default;
const RESOURCES = (
  await import(pathToFileURL(join(ROOT, "src", "packs-src", "card-resources.mjs")).href)
).default;

const { CONDITIONS, ACTION_KINDS, MARKED_SPELLCAST, MARKED_DOMAINS } = await import(
  pathToFileURL(join(ROOT, "src", "module", "config.ts")).href
);
const { FEAR_MAX } = await import(pathToFileURL(join(ROOT, "src", "module", "settings.ts")).href);
const MARKED = await import(pathToFileURL(join(ROOT, "src", "module", "marked.ts")).href);

/**
 * `build-packs.mjs`'s `PACKS` table, read as **text**.
 *
 * It exports the table, so importing it would be the obvious move and is the
 * wrong one: the script calls `main()` at module scope, so importing it
 * compiles every pack in the repo as a side effect of asking it a question.
 * A check that writes `dist/` is a check nobody can run twice with confidence.
 *
 * So the table is sliced out of the source and read field by field. That is
 * weaker than an import and the weakness is bounded: what it can miss is a
 * pack declared by something other than a string literal, and every entry in
 * that table has been a string literal since the table existed.
 */
function declaredPacks() {
  const src = readFileSync(join(ROOT, "scripts", "build-packs.mjs"), "utf8");
  const start = src.indexOf("export const PACKS = [");
  if (start < 0) return null;
  const table = src.slice(start, src.indexOf("\n];", start));
  const field = (o, k) => o.match(new RegExp(`\\b${k}:\\s*"([^"]*)"`))?.[1];
  return [...table.matchAll(/\{([^{}]*)\}/g)]
    .map((m) => m[1])
    .map((o) => ({
      name: field(o, "name"),
      module: field(o, "module"),
      label: field(o, "label"),
      collection: field(o, "collection"),
      docType: field(o, "docType"),
    }))
    .filter((p) => p.name);
}

const PACKS = declaredPacks();
if (!PACKS) bad(`build-packs.mjs no longer declares a PACKS table where this check looks for it`);

/* ── a very small HTML reader ─────────────────────────────────────────
   `check-variant-rules.mjs`'s, and not a parser for the same reason: what it
   has to catch is the `</td>` that never arrived and the row that is therefore
   one cell short, which renders fine and reads merely odd. */

const VOID_TAGS = new Set(["br", "hr", "img", "wbr"]);

const tablesIn = (html) =>
  [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map((m) => m[1]);

const captionOf = (table) => {
  const m = table.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : null;
};

function rowsOf(table) {
  const body = table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);
  const head = table.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i);
  const rows = (s) => (s ? [...s.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]) : []);
  return { head: rows(head?.[1]), body: rows(body?.[1]) };
}

const cellsOf = (row) => [...row.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((m) => m[1]);

function unbalanced(html) {
  const stack = [];
  for (const tag of html.matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*?(\/?)>/gi)) {
    const [, closing, rawName, selfClosing] = tag;
    const name = rawName.toLowerCase();
    if (VOID_TAGS.has(name) || selfClosing) continue;
    if (!closing) stack.push(name);
    else if (stack.pop() !== name) return `</${name}> does not close the open element`;
  }
  return stack.length ? `${stack.length} element(s) left open: ${stack.join(", ")}` : null;
}

/* Block tags become a space and inline tags become nothing, which is the one
   distinction `words` has to draw to be comparable to a card's own text:
   collapsing every tag to a space turns `<strong>d8+2</strong>.` into
   "d8+2 ." and a comparison against the card fails on punctuation rather than
   on meaning, while collapsing every tag to nothing runs the end of one
   paragraph into the start of the next. */
const BLOCK =
  /<\/?(?:p|li|ul|ol|h[1-6]|td|th|tr|table|thead|tbody|caption|div|section|aside|br|hr)\b[^>]*>/gi;

/** Markup off, entities back, whitespace collapsed — what a reader sees. */
const words = (html) =>
  String(html)
    .replace(BLOCK, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

/** A card's own text with its markdown off, for comparison against a cell. */
const cardWords = (text) =>
  String(text)
    .replace(/\*\*|__|\*|_/g, "")
    .replace(/^- /gm, "")
    .replace(/\s+/g, " ")
    .trim();

/* ── the entry and its pages ──────────────────────────────────────────── */

if (entries.length !== 1) {
  bad(`the pack has ${entries.length} entries and the frame is one document`);
}

const entry = entries[0];
if (entry?.sourceKey !== "marked") {
  bad(`the entry's sourceKey is "${entry?.sourceKey}" and not "marked", so its id rides on its name`);
}
if (entry?.name !== "The Twilight Marked") {
  bad(`the entry is named "${entry?.name}" and the frame is "The Twilight Marked"`);
}

const pages = entry?.pages ?? [];
if (!pages.length) bad(`the entry has no pages`);

const byName = new Map();
pages.forEach((page, i) => {
  const at = `page ${i + 1}`;
  if (!page.name?.trim()) bad(`${at} has no name`);
  else if (byName.has(page.name)) bad(`two pages are called "${page.name}"`);
  else byName.set(page.name, page);

  if (page.type !== "text") bad(`${at} is type "${page.type}", and only text pages are built here`);
  if (page.text?.format !== 1) bad(`${at} declares text.format ${page.text?.format}, not 1 (HTML)`);
  if (!page.title || typeof page.title.show !== "boolean") bad(`${at} has no title.show`);

  const html = page.text?.content ?? "";
  if (words(html).length < 40) bad(`${at} ("${page.name}") has essentially no content`);

  const broken = unbalanced(html);
  if (broken) bad(`${at} ("${page.name}") is malformed HTML: ${broken}`);

  /* The scope statement, on page one and only page one. It is the sentence
     that stops a GM charging the loadout toll by hand on top of the one the
     system already charged, so it is checked like a rule. */
  const scopes = (html.match(/dh-marked-scope/g) ?? []).length;
  if (i === 0 && scopes !== 1) {
    bad(`the first page carries ${scopes} scope statements and must carry exactly 1`);
  }
  if (i > 0 && scopes) bad(`${at} carries a scope statement, which belongs on the first page`);
});

/** A page by name, or a problem saying it is gone. Every assertion below is
    scoped to a page, because "3 Mark and 3 Fear" is a sentence on the rules
    page and also two bold spans inside a card's own text. */
function page(name) {
  const found = byName.get(name);
  if (!found) bad(`there is no page called "${name}", so what it was holding is unchecked`);
  return found ? words(found.text.content) : "";
}

const RULES_PAGE = "The Four Rules";
const FOUNDRY_PAGE = "Using the Deck in Foundry";
const INVENTORY_PAGE = "What Runs and What You Adjudicate";

const rulesText = page(RULES_PAGE);
const foundryText = page(FOUNDRY_PAGE);
const inventoryText = page(INVENTORY_PAGE);

/** Assert a page states a figure, with the figure built from what the code did. */
const states = (where, text, phrase, why) => {
  if (!text.includes(phrase)) bad(`"${where}" does not state ${why} — expected the words "${phrase}"`);
};

/* ── the numbers, run out of the code ─────────────────────────────────── */

const stubActor = (over = {}) => ({
  documentName: "Actor",
  type: "character",
  name: "Stub",
  isOwner: true,
  system: {
    mark: 0,
    surging: false,
    resources: { stress: { max: 12, marked: 0 } },
    ...over,
  },
  items: Object.assign([], { some: Array.prototype.some }),
  testUserPermission: () => true,
  update: async function (u) {
    for (const [path, value] of Object.entries(u)) {
      const keys = path.split(".");
      const last = keys.pop();
      keys.reduce((o, k) => o[k], this)[last] = value;
    }
  },
});

/* 1 · what a use costs. */
fear = 0;
const plain = MARKED.markPrice(stubActor(), 1);
states(
  RULES_PAGE,
  rulesText,
  `${plain.mark} Mark and the GM gains ${plain.fear} Fear`,
  "what one use costs",
);

/* The two cards that buy an extra action. Which two is read off the cards
   rather than listed — `post-card.ts` reads the same words off the same text
   to decide the price, so the deck is the authority on which they are. */
const triple = CARDS.filter((c) => /gain \*\*3 Mark/i.test(String(c.text)));
if (triple.length !== 2) {
  bad(`${triple.length} cards charge 3 Mark and the journal says two do`);
}
const n = 3;
const big = MARKED.markPrice(stubActor(), n);
states(RULES_PAGE, rulesText, `${big.mark} Mark and ${big.fear} Fear`, `the ${n}-Mark price`);
for (const card of triple) {
  states(RULES_PAGE, rulesText, card.name, `that ${card.name} is one of the cards charging ${n}`);
  if (card.level !== 10) bad(`${card.name} charges ${n} Mark and is level ${card.level}, not 10`);
}

/* 2 · the cap, and what happens past it. */
fear = FEAR_MAX;
const full = MARKED.markPrice(stubActor(), 1);
if (full.fear !== 0 || full.stress !== 1) {
  bad(`at a full pool a use costs ${JSON.stringify(full)} and the journal describes 1 Mark, 1 Stress`);
}
states(RULES_PAGE, rulesText, `caps at ${FEAR_MAX}`, "the Fear cap");
states(RULES_PAGE, rulesText, `${full.mark} Mark and ${full.stress} Stress`, "the cost at a full pool");

/* 3 · Surging doubles the Fear and not the Mark. */
fear = 0;
const surging = MARKED.markPrice(stubActor({ surging: true }), 1);
if (surging.mark !== plain.mark) bad(`Surging changes the Mark from ${plain.mark} to ${surging.mark}`);
if (surging.fear !== plain.fear * 2) {
  bad(`Surging multiplies the Fear by ${surging.fear / plain.fear} and the journal says it doubles`);
}
states(RULES_PAGE, rulesText, "the Fear doubles", "that Surging doubles the Fear");
states(
  RULES_PAGE,
  rulesText,
  `${surging.mark} Mark and ${surging.fear} Fear`,
  "what a use costs while Surging",
);

/* 3b · the -Touched second payer. The whole toll moves, Surging included, and
   the Mark stays — "who pays, never whether". */
fear = 0;
const viaStress = MARKED.markPrice(stubActor(), 1, "stress");
if (viaStress.fear !== 0 || viaStress.stress !== 1 || viaStress.mark !== 1) {
  bad(`paying in Stress costs ${JSON.stringify(viaStress)} and the journal describes 1 Mark, 1 Stress, no Fear`);
}
const viaBody = MARKED.markPrice(stubActor({ surging: true }), 3, "hitPoints");
if (viaBody.fear !== 0 || viaBody.hitPoints !== 6 || viaBody.mark !== 3) {
  bad(`a Surging 3-Mark use paid in Hit Points costs ${JSON.stringify(viaBody)}, not 3 Mark and 6 Hit Points`);
}
states(RULES_PAGE, rulesText, "change who pays, never whether", "the -Touched second payer");

/* 4 · the long-rest roll. Driven twice, because the two outcomes differ and
   the difference is the whole of what the page promises. */
const rollOff = async (mark, bought, total) => {
  rollTotal = total;
  const actor = stubActor({ mark });
  const out = await MARKED.rollOffMark(actor, bought);
  return { out, actor };
};

const won = await rollOff(5, 0, 99);
const base = won.out.difficulty - 5;
states(RULES_PAGE, rulesText, `Difficulty ${base} + your Mark`, "the long-rest Difficulty");
if (won.actor.system.mark !== 0) bad(`a successful roll leaves ${won.actor.system.mark} Mark, not 0`);
if (won.actor.system.resources.stress.marked !== 0) {
  bad(`a successful roll with no buy-down costs ${won.actor.system.resources.stress.marked} Stress`);
}
if (won.actor.system.surging) bad(`a successful roll leaves the character Surging`);

const boughtOne = await rollOff(5, 1, 99);
const rate = won.out.difficulty - boughtOne.out.difficulty;
states(
  RULES_PAGE,
  rulesText,
  `lower the Difficulty by ${rate} for each Stress`,
  "the buy-down rate",
);
if (boughtOne.actor.system.resources.stress.marked !== 1) {
  bad(
    `buying one Stress of Difficulty down costs ` +
      `${boughtOne.actor.system.resources.stress.marked} Stress, and the journal says it is spent either way`,
  );
}

const lost = await rollOff(5, 0, 1);
if (lost.actor.system.mark !== 0) bad(`a failed roll leaves ${lost.actor.system.mark} Mark, not 0`);
if (!lost.actor.system.surging) bad(`a failed roll does not leave the character Surging`);
const kept = lost.actor.system.resources.stress.marked;
states(RULES_PAGE, rulesText, `costs you ${kept} Stress`, "what a failed roll keeps");
states(RULES_PAGE, rulesText, "clears either way", "that the Mark clears win or lose");

/* 5 · the toll, charged by its own hook rather than by calling the private
   function — the hook *is* the rule, and a payment that no longer fires on an
   arriving card is exactly the regression worth catching. */
const hooks = new Map();
globalThis.Hooks = {
  on: (name, fn) => void hooks.set(name, [...(hooks.get(name) ?? []), fn]),
  once: () => {},
  callAll: () => {},
};
MARKED.registerMarked();

const pair = stubActor();
const inLoadout = (id, domain) => ({ id, type: "domainCard", parent: pair, system: { domain, inLoadout: true } });
pair.items.push(inLoadout("r", "root"), inLoadout("v", "void"));
for (const fn of hooks.get("updateItem") ?? []) {
  await fn(pair.items[1], { system: { inLoadout: true } });
}
const toll = pair.items.length ? pair.system.resources.stress.marked : 0;
if (!toll) bad(`the arriving-card toll charged nothing, so the hook no longer fires`);
states(RULES_PAGE, rulesText, `costs ${toll} Stress on arrival`, "the arrival toll");

const resting = stubActor();
resting.items.push(inLoadout("r", "root"), inLoadout("v", "void"));
await MARKED.payUpkeep(resting);
const upkeep = resting.system.resources.stress.marked;
states(
  RULES_PAGE,
  rulesText,
  `${upkeep} more Stress at the end of every long rest`,
  "the long-rest upkeep",
);

const single = stubActor();
single.items.push(inLoadout("r", "root"));
if (await MARKED.payUpkeep(single)) bad(`a single-domain loadout pays upkeep, which the journal denies`);

/* 6 · the Spellcast override, against `config.ts`'s own table. */
const traitLabel = (t) => t[0].toUpperCase() + t.slice(1);
for (const domain of MARKED_DOMAINS) {
  const trait = traitLabel(MARKED_SPELLCAST[domain]);
  const deck = traitLabel(domain);
  states(RULES_PAGE, rulesText, `${deck} card casts with ${trait}`, `${deck}'s Spellcast trait`);
  const deckPage = page(deck);
  states(deck, deckPage, `Spellcast trait: ${trait}`, `${deck}'s Spellcast trait`);
}

/* ── the two classes the frame page uses as the contrast ──────────────
   "A Guardian gets Valor and Blade" is the sentence that makes "nobody's class
   carries these" concrete, and it is also the one line on these pages that
   quotes a fact about the *printed* game. It went in wrong the first time —
   the Wizard got Midnight rather than Splendor — which is exactly the mistake
   nobody rereads a reference document to find. So the sentence is parsed back
   out of its own page and checked against `classes.mjs`.

   Any class named in that shape is checked, so a third example costs nothing
   and a renamed domain fails. */

const CLASSES = (await import(pathToFileURL(join(ROOT, "src", "packs-src", "classes.mjs")).href))
  .default.filter((d) => d.type === "class");

const framePage = page("The Frame");
let classClaims = 0;
for (const m of framePage.matchAll(/\b[Aa] (\w+) gets ([A-Z][a-z]+) and ([A-Z][a-z]+)\b/g)) {
  const [, name, first, second] = m;
  classClaims += 1;
  const cls = CLASSES.find((c) => c.name === name);
  if (!cls) {
    bad(`"The Frame" names a ${name}, which is not a class in classes.mjs`);
    continue;
  }
  const want = [cls.system.domains.primary, cls.system.domains.secondary].sort();
  const said = [first.toLowerCase(), second.toLowerCase()].sort();
  if (want.join() !== said.join()) {
    bad(`"The Frame" gives the ${name} ${first} and ${second}, and its domains are ${want.join(" and ")}`);
  }
}
if (!classClaims) {
  bad(`"The Frame" no longer names a class's two domains, so the contrast it draws is unchecked`);
}

/* ── Void's comparative claim ─────────────────────────────────────────
   The Void page says the deck reaches into the GM's Fear pool far more often
   than print does, and gives four numbers for it. A comparative claim fails in
   a way a flat one cannot: count the movers on one side and the readers on the
   other and the ratio is fiction while every individual number is defensible.
   This is what stops that, and it is here because that exact mistake was in
   the paragraph twice before it was caught.

   The page's counts are interpolated from `marked-rules.mjs`'s own predicate,
   so asserting the numbers against the predicate would prove nothing. What is
   checked is the **set** the predicate selects, against the names below —
   `check-marked.mjs`'s `AHEAD` shape, failing in both directions. A card
   joining the set fails as an unannotated addition and a name here with no
   card fails as a reading nobody re-took, which is right: whether a newly
   worded card belongs in "engages the pool" is not a thing a regex decides.

   Read off the 210 printed cards and the 21 Void cards, one phrase at a time.
   `Umbral Veil` and `Avatar of Terror` size something off the pool without
   moving it; `Dread-Touched` and `Midnight-Touched` stop a gain reaching it;
   `Sigil of Retribution` and `The Answer` are the only two on either side that
   put Fear *in*. What is excluded is the duality dice and the "until the GM
   spends a Fear on their turn" duration, which between them account for every
   other printed mention of the word. */
const POOL_SETS = {
  printedOut: ["Know Thy Enemy", "Dire Strike", "Night Terror"],
  printedAny: [
    "Know Thy Enemy",
    "Sigil of Retribution",
    "Midnight-Touched",
    "Night Terror",
    "Umbral Veil",
    "Dire Strike",
    "Dread-Touched",
    "Avatar of Terror",
  ],
  voidOut: ["Reckoning", "Geometry of Ruin"],
  voidAny: ["Reckoning", "Cold Solution", "Geometry of Ruin", "The Answer"],
};

const { takesFear, poolCards, POOL_COUNTS } = await import(
  pathToFileURL(join(ROOT, "src", "packs-src", "marked-rules.mjs")).href
);

const PRINTED_CORPUS = [
  ...(await import(pathToFileURL(join(ROOT, "src", "packs-src", "domain-cards.mjs")).href)).default,
  ...(await import(pathToFileURL(join(ROOT, "src", "packs-src", "dread-cards.mjs")).href)).default,
];
const VOID_CARDS = CARDS.filter((c) => c.domain === "void");

const ratchet = (label, got, want) => {
  const names = got.map((c) => c.name);
  for (const name of names) {
    if (!want.includes(name)) {
      bad(`${name} now counts as "${label}" and POOL_SETS does not list it — somebody has to read it`);
    }
  }
  for (const name of want) {
    if (!names.includes(name)) {
      bad(`POOL_SETS lists ${name} under "${label}" and it no longer counts — the reading is stale`);
    }
  }
};

ratchet("printedOut", takesFear(PRINTED_CORPUS), POOL_SETS.printedOut);
ratchet("printedAny", poolCards(PRINTED_CORPUS), POOL_SETS.printedAny);
ratchet("voidOut", takesFear(VOID_CARDS), POOL_SETS.voidOut);
ratchet("voidAny", poolCards(VOID_CARDS), POOL_SETS.voidAny);

if (POOL_COUNTS.printedOf !== PRINTED_CORPUS.length) {
  bad(
    `the Void page measures print as ${POOL_COUNTS.printedOf} cards and there are ` +
      `${PRINTED_CORPUS.length}`,
  );
}

/* And that the page still prints them, rather than having had the sentence
   rewritten around a different pair of numbers. */
const voidText = page("Void");
states(
  "Void",
  voidText,
  `${POOL_COUNTS.voidOut} cards of ${POOL_COUNTS.voidOf} take Fear out of the pool`,
  "how often Void takes Fear out",
);
states(
  "Void",
  voidText,
  `${POOL_COUNTS.printedOut} of ${POOL_COUNTS.printedOf}`,
  "how often print takes Fear out",
);
states(
  "Void",
  voidText,
  `${POOL_COUNTS.voidAny} of ${POOL_COUNTS.voidOf} against ${POOL_COUNTS.printedAny} of ${POOL_COUNTS.printedOf}`,
  "the wider comparison",
);

/* ── the deck listings ────────────────────────────────────────────────── */

const DECK_COLUMNS = 6;
let listed = 0;

for (const domain of MARKED_DOMAINS) {
  const deck = traitLabel(domain);
  const entryPage = byName.get(deck);
  if (!entryPage) continue;

  const html = entryPage.text.content;
  const tables = tablesIn(html);
  if (tables.length !== 1) {
    bad(`the ${deck} page holds ${tables.length} tables and the listing is one`);
    continue;
  }
  const table = tables[0];
  const caption = captionOf(table);
  if (caption !== `The ${deck} Deck`) {
    bad(`the ${deck} listing is captioned "${caption}" rather than "The ${deck} Deck"`);
  }

  const { head, body } = rowsOf(table);
  if (!head.length) bad(`the ${deck} listing has no <thead> row`);

  const want = CARDS.filter((c) => c.domain === domain);
  const seen = new Map();

  for (const row of body) {
    const cells = cellsOf(row);
    if (cells.length !== DECK_COLUMNS) {
      bad(`a row of the ${deck} listing has ${cells.length} cells and the table is ${DECK_COLUMNS} wide`);
      continue;
    }
    const [level, name, thread, type, recall, text] = cells.map(words);
    listed += 1;

    const card = want.find((c) => c.name === name);
    if (!card) {
      bad(`the ${deck} listing has a row for "${name}", which is not a card in that deck`);
      continue;
    }
    if (seen.has(name)) bad(`the ${deck} listing names "${name}" twice`);
    seen.set(name, true);

    if (level !== String(card.level)) bad(`${name} is listed at level ${level} and is level ${card.level}`);
    if (thread !== card.thread) bad(`${name} is listed under "${thread}" and its thread is "${card.thread}"`);
    if (type !== card.cardType) bad(`${name} is listed as a ${type} and is an ${card.cardType}`);
    if (recall !== String(card.recall)) bad(`${name} is listed at recall ${recall} and its recall is ${card.recall}`);

    /* The strongest line in this file. Markup off both sides, so the
       comparison is of words — which proves the journal is printing the
       card's own text and not a paraphrase or a stale damage expression. */
    if (text !== cardWords(card.text)) {
      bad(
        `${name}'s text in the ${deck} listing is not the card's text\n` +
          `      listed: ${text}\n` +
          `      card:   ${cardWords(card.text)}`,
      );
    }
  }

  for (const card of want) {
    if (!seen.has(card.name)) bad(`the ${deck} listing has no row for ${card.name}`);
  }
}

if (listed !== CARDS.length) {
  bad(`the listings hold ${listed} rows and there are ${CARDS.length} cards`);
}

/* ── the automation inventory ─────────────────────────────────────────── */

const key = (c) => `domainCard:${c.name}`;
const kindsOf = (c) => {
  const annotated = ACTIONS[key(c)];
  if (!annotated) return [];
  const all = [...(annotated.actions ?? []), ...Object.values(annotated.features ?? {}).flat()];
  return [...new Set(all.map((a) => a.kind))];
};

const inventory = byName.get(INVENTORY_PAGE);
if (inventory) {
  const tables = tablesIn(inventory.text.content);
  if (tables.length !== 1) bad(`the inventory page holds ${tables.length} tables and the readout is one`);
  else {
    const rows = rowsOf(tables[0]).body.map((r) => cellsOf(r).map(words));
    if (rows.length !== CARDS.length) {
      bad(`the inventory lists ${rows.length} cards and there are ${CARDS.length}`);
    }
    const inRow = new Map(rows.map((r) => [r[0], r]));
    for (const card of CARDS) {
      const row = inRow.get(card.name);
      if (!row) {
        bad(`the inventory has no row for ${card.name}`);
        continue;
      }
      /* The derivation re-run. The page claims to be a readout of the three
         registries, so the claim is testable: whether a card rolls its own
         damage is a yes/no that `card-damage.mjs` answers. */
      const hasDamage = Boolean(DAMAGE[key(card)]);
      if ((row[3] === "yes") !== hasDamage) {
        bad(`the inventory says ${card.name} ${row[3] === "yes" ? "rolls" : "does not roll"} its own damage and card-damage.mjs disagrees`);
      }
      for (const kind of kindsOf(card)) {
        if (!row[2].includes(kind)) bad(`the inventory omits ${card.name}'s "${kind}" press`);
      }
      const counters = RESOURCES[key(card)] ?? [];
      if (!counters.length && row[4] !== "—") {
        bad(`the inventory gives ${card.name} a counter and card-resources.mjs has none`);
      }
      if (counters.length && row[4] === "—") {
        bad(`the inventory gives ${card.name} no counter and card-resources.mjs has one`);
      }
    }
    for (const name of inRow.keys()) {
      if (!CARDS.some((c) => c.name === name)) bad(`the inventory has a row for "${name}", which is not a card`);
    }
  }

  /* Every action kind that actually occurs on a marked card has to be
     explained somewhere on the page, because the column prints the raw kind
     and a GM reading `move-resource` with nothing to read it against is being
     shown the inside of the data. A kind the page explains that no card has is
     fine — it is a legend, not an index. */
  const occurring = [...new Set(CARDS.flatMap(kindsOf))].sort();
  for (const kind of occurring) {
    if (!ACTION_KINDS.includes(kind)) bad(`a marked card carries the kind "${kind}", which config.ts does not list`);
    if (!inventoryText.includes(kind)) bad(`the inventory page does not explain the "${kind}" press`);
  }

  /* The counts the page states about itself. Both are interpolated from the
     same derivation today, which is exactly why they are checked: the failure
     is somebody later typing the number in to fix a sentence. */
  const applying = CARDS.filter((c) => kindsOf(c).includes("apply-condition"));
  states(
    INVENTORY_PAGE,
    inventoryText,
    `${applying.length} cards offer a press that puts one on somebody`,
    "how many cards offer to apply a condition",
  );

  const quiet = CARDS.filter((c) => !kindsOf(c).length && !DAMAGE[key(c)]);
  states(
    INVENTORY_PAGE,
    inventoryText,
    `${quiet.length} of the ${CARDS.length}`,
    "how many cards offer no press",
  );
  for (const card of quiet) {
    if (!inventoryText.includes(card.name)) bad(`the inventory page does not name ${card.name} among the cards with no press`);
  }

  const pilesWanted = CARDS.filter((c) =>
    (RESOURCES[key(c)] ?? []).some((r) => !["Use", "Uses"].includes(r.name)),
  );
  for (const card of pilesWanted) {
    if (!inventoryText.includes(card.name)) bad(`the inventory page does not name ${card.name} among the token piles`);
  }
  const pileCount = (inventoryText.match(/token piles/g) ?? []).length;
  if (pilesWanted.length !== 2 && pileCount) {
    bad(`${pilesWanted.length} cards carry a token pile and the page calls them "the two token piles"`);
  }
}

/* ── the conditions it names ──────────────────────────────────────────── */

const registered = CONDITIONS.map((c) => c.name);
const allHtml = pages.map((p) => p.text?.content ?? "").join("\n");

for (const m of allHtml.matchAll(/<em class="dh-condition">([\s\S]*?)<\/em>/g)) {
  const name = words(m[1]);
  if (!registered.some((r) => r.toLowerCase() === name.toLowerCase())) {
    bad(`the journal names the condition "${name}", which config.ts does not register`);
  }
}

/* The other direction, so the class cannot simply be forgotten: a registered
   condition set in plain emphasis is a condition the document is naming
   without saying it is one, and the next reader cannot tell it apart from a
   book title. */
for (const m of allHtml.matchAll(/<em(?! class="dh-condition")[^>]*>([\s\S]*?)<\/em>/g)) {
  const name = words(m[1]);
  if (registered.some((r) => r.toLowerCase() === name.toLowerCase())) {
    bad(`"${name}" is a registered condition and is set in plain emphasis — it wants class="dh-condition"`);
  }
}

/* ── the pack is declared, in both places, with one label ─────────────── */

const declared = (PACKS ?? []).find((p) => p.name === "marked-rules");
if (!declared) bad(`build-packs.mjs has no "marked-rules" pack, so none of this is compiled`);
else {
  if (declared.module !== "marked-rules.mjs") bad(`the pack builds "${declared.module}"`);
  if (declared.docType !== "JournalEntry") bad(`the pack's docType is "${declared.docType}"`);
  if (declared.collection !== "journal") bad(`the pack's collection is "${declared.collection}"`);
}

const manifest = JSON.parse(readFileSync(join(ROOT, "system.json"), "utf8"));
const mounted = (manifest.packs ?? []).find((p) => p.name === "marked-rules");
if (!mounted) bad(`system.json does not declare "marked-rules", so Foundry would never mount it`);
else {
  if (mounted.type !== "JournalEntry") bad(`system.json has the pack as type "${mounted.type}"`);
  if (mounted.path !== "packs/marked-rules") bad(`system.json points the pack at "${mounted.path}"`);
  if (mounted.system !== manifest.id) bad(`system.json has the pack under system "${mounted.system}"`);
  if (declared && mounted.label !== declared.label) {
    bad(
      `the pack is labelled "${declared.label}" in build-packs.mjs and "${mounted.label}" in ` +
        `system.json — the compendium sidebar reads the second and nothing says so`,
    );
  }
}

/* ── report ───────────────────────────────────────────────────────────── */

if (problems.length) {
  console.error(`The Twilight Marked's rules have ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}

console.log("The Twilight Marked's rules check out.");
console.log(
  `  1 entry, ${pages.length} pages, ${listed} cards listed — ` +
    `use ${plain.mark} Mark / ${plain.fear} Fear, Fear caps at ${FEAR_MAX}, ` +
    `long rest at ${base} + Mark bought down ${rate} per Stress, ` +
    `${toll} Stress toll, ${triple.length} cards at ${n}`,
);
