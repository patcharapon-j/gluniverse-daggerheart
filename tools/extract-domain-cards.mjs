/**
 * Extracts the domain card set from the rules markdown in `docs/rules/`.
 *
 *     node tools/extract-domain-cards.mjs
 *
 * Writes `src/packs-src/domain-cards.mjs`, which `domains.mjs` turns into
 * documents. Re-run it rather than editing the output.
 *
 * The appendix arrives two ways and the extractor has to handle both. Most
 * pages are `extract:layout` — three columns of fixed-width text, where the
 * columns are only recoverable by finding the gutters. A few are
 * `extract:flow`, already linearised, one paragraph per line. Both shapes
 * carry the same card head (TITLE / `Level N Domain Type` / `Recall Cost: N`),
 * which is what finds the card boundaries.
 *
 * Seven cards need the OVERRIDES table at the bottom. In each one the PDF's
 * own text layer glued a closing paragraph onto the final bullet of a list,
 * and there is no rule that separates those from the many bullets that
 * legitimately run to two sentences. They are corrected by hand, in full, so
 * the correction is reviewable next to the thing it corrects.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = [
  "docs/rules/corebook/49-appendix-domain-card-reference-part1.md",
  "docs/rules/corebook/50-appendix-domain-card-reference-part2.md",
];
const OUT = join(ROOT, "src", "packs-src", "domain-cards.mjs");

/** The cards run to PDF page 343. After it the appendix is sheets and tables. */
const LAST_CARD_PAGE = 343;

/* ── 1. de-column ────────────────────────────────────────────────────── */

/**
 * Where one line's columns actually part, given the page's nominal gutter.
 *
 * The page-wide gutter is only approximate, and it is approximate in both
 * directions: a body line's longest words bleed to the right of it, and a
 * card title — indented a few spaces further than its own body — starts to
 * the left of it. Cutting every line at the same position shears one or the
 * other ("all targets" → "all target", "CLOAKING BLAST" → "OAKING BLAST").
 *
 * So each line is cut at its own whitespace: the blank run nearest the
 * nominal gutter is the real gap between that line's two columns.
 */
function part(line, [s, e]) {
  const mid = (s + e) / 2;
  let best = null;
  for (let c = Math.max(0, s - 8); c <= e + 8; c++) {
    if ((line[c] ?? " ") !== " ") continue;
    let b = c;
    while ((line[b] ?? " ") === " " && b <= e + 8) b++;
    const dist = Math.abs((c + b) / 2 - mid);
    if (b - c >= 2 && (!best || dist < best.dist)) best = { a: c, b, dist };
    c = b;
  }
  return best ?? { a: e, b: e };
}

/**
 * Splits a layout page's fixed-width block back into single columns.
 *
 * A gutter is a run of character positions blank on ~every line, so finding
 * the gutters finds the columns and no column width has to be guessed. The
 * test is 90%, not 100%: one line per page reliably bleeds a character across
 * the gutter, and a strict test then finds no gutters at all.
 */
function columns(block) {
  const lines = block.split("\n").map((l) => l.replace(/\s+$/, ""));
  const width = Math.max(...lines.map((l) => l.length));
  const solid = lines.filter((l) => l.trim());

  const gutters = [];
  let run = 0;
  for (let c = 0; c <= width; c++) {
    const blank = solid.reduce((n, l) => n + ((l[c] ?? " ") === " " ? 1 : 0), 0);
    if (c < width && blank / solid.length >= 0.9) run++;
    else {
      if (run >= 3 && c - run > 0) gutters.push([c - run, c]);
      run = 0;
    }
  }

  const cols = Array.from({ length: gutters.length + 1 }, () => []);
  for (const line of lines) {
    let from = 0;
    gutters.forEach((g, i) => {
      const { a, b } = part(line, g);
      cols[i].push(line.slice(from, a).trim());
      from = b;
    });
    cols[gutters.length].push(line.slice(from).trim());
  }

  return cols
    .map((col) => col.join("\n").replace(/\n{3,}/g, "\n\n").trim())
    .filter(Boolean);
}

/** Every chunk of card text, in reading order, tagged with its shape. */
function chunks() {
  const out = [];
  for (const file of SOURCES) {
    const pages = readFileSync(join(ROOT, file), "utf8").split(/<!-- (pdf-page:[^>]*?) -->/);
    for (let i = 1; i < pages.length; i += 2) {
      const marker = pages[i];
      const body = pages[i + 1] ?? "";
      if (Number(marker.match(/pdf-page:(\d+)/)?.[1]) > LAST_CARD_PAGE) continue;

      if (marker.includes("extract:flow")) {
        const text = body.replace(/^### /gm, "").trim();
        if (text) out.push({ wrapped: false, text });
      } else if (marker.includes("extract:layout")) {
        const block = body.match(/```text\n([\s\S]*?)```/);
        if (block) for (const col of columns(block[1])) out.push({ wrapped: true, text: col });
      }
    }
  }
  return out;
}

/* ── 2. find the cards ───────────────────────────────────────────────── */

/* Layout pages keep the card's own line breaks, so the Recall Cost is its own
   line; flow pages were linearised and put the whole head on one. */
const HEAD = /^Level (\d+) ([A-Z][a-z]+) (Spell|Ability|Grimoire)(?: Recall Cost: (\d+))?$/;
const RECALL = /^Recall Cost: (\d+)$/;
/* U+2011 non-breaking hyphen is what the PDF uses in BLADE‑TOUCHED. */
const TITLE = /^[A-Z][A-Z’'‑\- ]*[A-Z]$/;
/* Appendix front matter, sliced by a column cut and landing inside whichever
   card happened to be open at the time. */
const FURNITURE = /^(APPENDIX|Domain Card reference|.*section contains additional information.*|nd reference sheets\.)$/i;

function parse() {
  const cards = [];
  let open = null;
  let title = null;

  for (const chunk of chunks()) {
    for (const raw of chunk.text.split("\n")) {
      const line = raw.trim();
      if (!line) {
        open?.body.push("");
        continue;
      }
      if (FURNITURE.test(line)) continue;

      const head = line.match(HEAD);
      if (head) {
        open = {
          name: title ?? "(untitled)",
          domain: head[2].toLowerCase(),
          level: Number(head[1]),
          cardType: head[3].toLowerCase(),
          recall: head[4] === undefined ? null : Number(head[4]),
          body: [],
        };
        cards.push(open);
        title = null;
        continue;
      }

      const recall = line.match(RECALL);
      if (recall && open && open.recall === null && !open.body.some(Boolean)) {
        open.recall = Number(recall[1]);
        continue;
      }

      if (line.length > 2 && TITLE.test(line)) {
        title = line;
        continue;
      }

      open?.body.push(chunk.wrapped ? { wrap: line } : { line });
    }
    if (open) open.body.push("");
  }
  return cards;
}

/* ── 3. reflow ───────────────────────────────────────────────────────── */

function reflow(body) {
  const out = [];
  let buf = null;
  const flush = () => {
    if (buf) out.push(buf);
    buf = null;
  };

  for (const entry of body) {
    if (!entry) {
      flush();
      out.push("");
      continue;
    }
    const text = entry.wrap ?? entry.line;
    const bullet = /^[•·]\s*/.test(text);
    // A column chunk hard-wraps mid-sentence, so consecutive wrapped lines
    // are one paragraph. A flow chunk already has one paragraph per line.
    if (bullet || entry.line !== undefined) {
      flush();
      buf = bullet ? text.replace(/^[•·]\s*/, "- ") : text;
    } else {
      buf = buf ? `${buf} ${text}` : text;
    }
  }
  flush();

  /* The flow extractor sometimes breaks one sentence across two of its
     "paragraphs", leaving the tail starting in lowercase — often with a blank
     line between, so the merge has to reach back past blanks. Nothing in the
     book begins a paragraph with a lowercase letter or a bare numeral. */
  const merged = [];
  for (const p of out) {
    const last = merged.findLastIndex(Boolean);
    if (p && /^[a-z0-9]/.test(p) && last >= 0) {
      merged[last] += ` ${p}`;
      merged.length = last + 1;
    } else merged.push(p);
  }

  return merged.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ── 3a. grimoires ───────────────────────────────────────────────────── */

/**
 * A grimoire is not one effect, it is three or four named spells on one card,
 * and the page distinguishes them by setting the name in bold. That
 * distinction is the first thing the text layer loses: some grimoires keep a
 * blank line between spells and some run them straight on, so `Book of Ava`
 * arrives as a single paragraph containing three separate spells.
 *
 * The name is recoverable — it is a short title-case phrase ending in a colon,
 * at the start of a paragraph or straight after a full stop. Restoring the
 * break and the bold restores the card.
 */
/* Capitalised words, but a connective inside the name stays lowercase —
   `Wall of Flame`, `Zone of Protection`. */
const SPELL_NAME = "[A-Z][A-Za-z’'\\-]*(?: (?:of|the|and|[A-Z][A-Za-z’'\\-]*)){0,3}";

const splitGrimoire = (text) =>
  text
    .replace(new RegExp(`([.!?]) (${SPELL_NAME}): `, "g"), "$1\n\n$2: ")
    .split("\n")
    .map((line) => line.replace(new RegExp(`^(${SPELL_NAME}): `), "<b>$1:</b> "))
    .join("\n");

/* ── 4. names ────────────────────────────────────────────────────────── */

const MINOR = new Set(["of", "the", "a", "an", "and", "or", "in", "to", "on", "with", "from", "by"]);

/** ALL CAPS on the page; title case everywhere a person reads it. */
const titleCase = (name) => {
  const words = name.replace(/‑/g, "-").toLowerCase().split(" ");
  return words
    .map((word, i) => {
      // First and last words are always capitalised — "Goad Them On", not
      // "Goad Them on" — and hyphenated compounds capitalise both halves.
      const small = i > 0 && i < words.length - 1;
      return word
        .split("-")
        .map((part) => (small && MINOR.has(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join("-");
    })
    .join(" ");
};

/* ── 5. the seven ────────────────────────────────────────────────────── */

/**
 * Cards whose final bullet swallowed the paragraph after it. Keyed by the
 * extracted (upper-case) name; the value is the whole corrected body, because
 * a diff against the wrong text is harder to check than the right text is.
 */
const OVERRIDES = {
  "CHAMPION’S EDGE": `When you critically succeed on an attack, you can spend up to 3 Hope and choose one of the following options for each Hope spent:

- You clear a Hit Point.
- You clear an Armor Slot.
- The target must mark an additional Hit Point.

You can’t choose the same option more than once.`,

  VITALITY: `When you choose this card, permanently gain two of the following benefits:

- One Stress slot
- One Hit Point slot
- +2 bonus to your damage thresholds

Then place this card in your vault permanently.`,

  "STRATEGIC APPROACH": `After a long rest, place a number of tokens equal to your Knowledge on this card (minimum 1). The first time you move within Close range of an adversary and make an attack against them, you can spend one token to choose one of the following options:

- You make the attack with advantage.
- You clear a Stress on an ally within Melee range of the adversary.
- You add a d8 to your damage roll.

When you take a long rest, clear all unspent tokens.`,

  "KNOW THY ENEMY": `When observing a creature, you can make an Instinct Roll against them. On a success, spend a Hope and ask the GM for one set of information about the target from the following options:

- Their unmarked Hit Points and Stress.
- Their Difficulty and damage thresholds.
- Their tactics and standard attack damage dice.
- Their features and Experiences.

Additionally on a success, you can mark a Stress to remove a Fear from the GM’s Fear Pool.`,

  "INSPIRATIONAL WORDS": `Your speech is imbued with power. After a long rest, place a number of tokens on this card equal to your Presence. When you speak with an ally, you can spend a token from this card to give them one benefit from the following options:

- Your ally clears a Stress.
- Your ally clears a Hit Point.
- Your ally gains a Hope.

When you take a long rest, clear all unspent tokens.`,

  "FORCE OF NATURE": `Mark a Stress to transform into a hulking nature spirit, gaining the following benefits:

- When you succeed on an attack or Spellcast Roll, gain a +10 bonus to the damage roll.
- When you deal enough damage to defeat a creature within Close range, you absorb them and clear an Armor Slot.
- You can’t be Restrained.

Before you make an action roll, you must spend a Hope. If you can’t, you revert to your normal form.`,

  "GIFTED TRACKER": `When you’re tracking a specific creature or group of creatures based on signs of their passage, you can spend any number of Hope and ask the GM that many questions from the following list.

- What direction did they go?
- How long ago did they pass through?
- What were they doing in this location?
- How many of them were here?

When you encounter creatures you’ve tracked in this way, gain a +1 bonus to your Evasion against them.`,
};

/**
 * Not corrections to the rules — neither of these is a word, and neither is
 * on the printed page. They are in the PDF's text layer, which is what we
 * read, so they are fixed here where the fix can be seen.
 */
const TYPOS = [
  ["temporararily", "temporarily"],
  ["create a a wall", "create a wall"],
];

/* ── 6. write ────────────────────────────────────────────────────────── */

const cards = parse().map((c) => {
  let text = OVERRIDES[c.name] ?? reflow(c.body);
  if (c.cardType === "grimoire") text = splitGrimoire(text);
  for (const [wrong, right] of TYPOS) text = text.replaceAll(wrong, right);
  return {
    name: titleCase(c.name),
    domain: c.domain,
    level: c.level,
    cardType: c.cardType,
    recall: c.recall ?? 0,
    text,
  };
});

/* What the book actually contains, and therefore what a good extraction has
   to produce: nine domains, three cards at level 1 and two at every level
   after it. Anything else means a page was missed or a head misread. */
const problems = [];
const byDomain = new Map();
for (const c of cards) {
  if (!byDomain.has(c.domain)) byDomain.set(c.domain, []);
  byDomain.get(c.domain).push(c.level);
  if (c.name.includes("Untitled")) problems.push(`untitled card in ${c.domain}`);
  if (!c.text) problems.push(`${c.name} has no text`);
}
const EXPECTED = [1, 1, 1, ...Array.from({ length: 9 }, (_, i) => [i + 2, i + 2]).flat()].join(",");
if (byDomain.size !== 9) problems.push(`${byDomain.size} domains, expected 9`);
for (const [domain, levels] of byDomain) {
  const got = levels.slice().sort((a, b) => a - b).join(",");
  if (got !== EXPECTED) problems.push(`${domain}: levels ${got}`);
}
if (problems.length) {
  console.error("Extraction is not sound:");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const body = cards
  .map(
    (c) =>
      `  {\n` +
      `    name: ${JSON.stringify(c.name)},\n` +
      `    domain: ${JSON.stringify(c.domain)},\n` +
      `    level: ${c.level},\n` +
      `    cardType: ${JSON.stringify(c.cardType)},\n` +
      `    recall: ${c.recall},\n` +
      `    text: ${JSON.stringify(c.text)},\n` +
      `  },`,
  )
  .join("\n");

writeFileSync(
  OUT,
  `/**\n` +
    ` * GENERATED — do not edit here.\n` +
    ` *\n` +
    ` * The ${cards.length} corebook domain cards, extracted from\n` +
    ` * docs/rules/corebook/ by tools/extract-domain-cards.mjs. Fix the\n` +
    ` * extractor (or its OVERRIDES table) and re-run it:\n` +
    ` *\n` +
    ` *     node tools/extract-domain-cards.mjs\n` +
    ` */\n\n` +
    `export default [\n${body}\n];\n`,
);

console.log(`${cards.length} domain cards → src/packs-src/domain-cards.mjs`);
for (const [domain, levels] of [...byDomain].sort()) {
  console.log(`  ${domain.padEnd(9)} ${levels.length}`);
}
