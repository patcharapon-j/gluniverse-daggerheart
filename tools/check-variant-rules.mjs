/**
 * What stops the variant rules pack rotting.
 *
 *     node --experimental-strip-types tools/check-variant-rules.mjs
 *
 * `tools/check-cards.mjs` has the easiest job in this repo: there is a fetched
 * snapshot of what every card should say, so it can re-derive the hand-authored
 * copy and compare meaning. `check-equipment.mjs` has the hard version of the
 * job — chapter 2 has no upstream at all — and answers it by asserting the
 * book's own regularities instead. This is the same problem a third time, and
 * it is worse than either: sixteen pages of prose have no regularities to
 * assert. A paragraph transcribed from page 197 and a paragraph somebody
 * paraphrased look identical to a program.
 *
 * So this checks the two things that *are* falsifiable, and is honest that it
 * does not check the third.
 *
 * ── 1. the join to the switch ─────────────────────────────────────────
 * Ten entries, one per variant, each filed under the folder
 * `VARIANT_FOLDERS` in `src/module/variants.ts` names. That string is the only
 * thing binding a document to a switch, and a folder name typed one character
 * off fails **silently**: Foundry mounts the folder, the rules sit in it, and
 * nothing will ever offer them. There is nothing on screen to say which of the
 * two spellings is the live one. So the folder is checked against the
 * TypeScript rather than against a copy of it — imported directly under
 * `--experimental-strip-types`, which is what `check-marked.mjs` and half a
 * dozen tools here already do, because a second list of ten strings maintained
 * by hand is the exact failure this check exists to catch.
 *
 * ── 2. the tables ─────────────────────────────────────────────────────
 * Every table's row count is asserted against `PRINTED_ROWS` below, which is
 * the SRD's **own** row-count summary transcribed — not re-derived from the
 * markup being checked, because a count taken off the thing being checked is
 * not a check. It is a ratchet in both directions, `check-resources.mjs`'s
 * shape: a table whose caption is not in the list fails as an unannotated
 * addition, and an entry in the list with no table fails as a table that has
 * gone missing. Losing a row off the bottom of a twenty-row d20 table is the
 * thing that actually happens when tables are pasted by hand, and it is
 * invisible afterwards — a nineteen-row d20 table looks exactly like a d20
 * table.
 *
 * Column consistency is checked per table with `colspan` summed, which is not
 * pedantry: the Tech-Based Scrap Table's spans are a *reading* of the printed
 * page rather than a transcription of it, and the arithmetic that has to hold
 * for that reading to be possible at all — every row totalling eleven columns —
 * is the one part of the inference a program can hold onto.
 *
 * ── 3. what it cannot check ───────────────────────────────────────────
 * That the prose is verbatim. Nothing here can know that, and pretending
 * otherwise by hashing the strings would only assert that nobody has edited
 * them since — which is a different and much weaker claim wearing the same
 * name. The provenance for the text is the extraction it was transcribed from;
 * this file checks structure, and says so.
 *
 * What it does check about the prose is the one claim the documents make about
 * *this system* rather than about the rules: every entry's first page carries
 * the "these are reference rules, the system does not resolve them" scope
 * statement, and the Scrap Table page carries its inference note. Both are
 * promises to a reader, and a promise that can be deleted without anything
 * noticing is a promise this repo does not make — see `apps/rules.ts` for the
 * house position those two paragraphs are an extension of.
 */

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const entries = (
  await import(pathToFileURL(join(ROOT, "src", "packs-src", "variant-rules.mjs")).href)
).default;

const { VARIANTS, VARIANT_FOLDERS } = await import(
  pathToFileURL(join(ROOT, "src", "module", "variants.ts")).href
);

const problems = [];
const bad = (what) => problems.push(what);

/* ── the SRD's own row counts ─────────────────────────────────────────
   Transcribed from the row-count summary of the page-190–205 extraction, keyed
   by variant id and then by the table's `<caption>`. The caption is the handle
   because it is the one thing a table carries that a reader also sees: a check
   keyed on document order would pass a table that had been moved and pass a
   table that had been replaced by a different one of the same height.

   Twenty-six tables. The SRD's summary lists twenty-seven; the twenty-seventh
   is the Faction Tracking relationship ranks, and Faction Tracking belongs to
   no variant — it is chapter-level GM procedure printed between the frames and
   `VARIANTS` has no id for it. See the header of `variant-rules.mjs`. */
const PRINTED_ROWS = {
  everydayHero: {
    "Primary Physical Weapons": 15,
    "Primary Magic Weapons": 10,
    "Secondary Weapons": 7,
    Armor: 4,
  },
  feasts: {
    "Flavors and Die Sizes": 6,
    "Example Ingredients": 8,
    "Hit Points to Ingredients Guide": 4,
    "Environmental Ingredients Guide": 6,
    "What kind of ingredient is it?": 20,
    "What's interesting about it?": 20,
    "Example Special Ingredients": 4,
  },
  grimdark: {},
  tech: {
    "Gold to Credits": 3,
    "Scrap Table": 3,
    "Parts Reward Table": 3,
  },
  western: {
    "Primary Weapons": 3,
    "Secondary Weapons": 2,
    Consumables: 1,
  },
  colossal: {},
  magicSchool: {
    "Traits for Flight": 6,
  },
  fairyTale: {},
  monsterHunting: {
    "Primary Weapons": 3,
    "Secondary Weapons": 3,
    Armor: 3,
  },
  hexCrawl: {
    "Habitat (d20)": 12,
    "Encounter (d8+d6)": 13,
    "Terrain (d4)": 4,
    "Ocean Weather (d4)": 4,
    "Enviromancer Habitat Effects": 7,
  },
};

/* The two tables whose *width* is load-bearing rather than incidental. The
   Scrap Table's eleven columns are the whole of what makes its inferred spans
   arithmetically possible — drop one and the reading recorded on the page
   stops being a reading of anything. The Parts Reward Table is here beside it
   because a four-fight ladder that quietly became three is the same failure
   with no note to catch it. */
const PRINTED_COLS = { "Scrap Table": 11, "Parts Reward Table": 5 };

/* ── a very small HTML reader ─────────────────────────────────────────
   Not a parser and not trying to be, exactly as `port-design-css.mjs` counts
   comment delimiters rather than parsing CSS: it catches the mistake that
   actually happens when this markup is edited by hand, which is a `</td>` that
   never arrived and a row that is therefore one cell short. */

/** Elements that legitimately stand alone in this content. */
const VOID = new Set(["br", "hr", "img", "wbr"]);

/** Every `<table>…</table>` in a page, as raw strings. */
const tablesIn = (html) => [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map((m) => m[1]);

const captionOf = (table) => {
  const m = table.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : null;
};

/** Rows, split by whether they are inside `<tbody>` — those are the count. */
function rowsOf(table) {
  const body = table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);
  const head = table.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i);
  const rows = (s) => (s ? [...s.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]) : []);
  return { head: rows(head?.[1]), body: rows(body?.[1]) };
}

/** A row's width, `colspan` summed — which is what a merged cell means. */
function widthOf(row) {
  let width = 0;
  for (const cell of row.matchAll(/<(td|th)\b([^>]*)>/gi)) {
    const span = cell[2].match(/\bcolspan\s*=\s*"?(\d+)"?/i);
    width += span ? Number(span[1]) : 1;
  }
  return width;
}

/**
 * Tag balance over the container elements this content uses.
 *
 * An unbalanced `<td>` is the CSS port's unbalanced comment in a new place:
 * the browser recovers, the page renders, and one cell has quietly swallowed
 * the rest of the row. Nothing else in this pipeline looks at this markup —
 * not `tsc`, not the build, not `compilePack`, which writes whatever string it
 * is handed — so if this does not catch it, a table ships wrong and looks
 * merely odd.
 */
function unbalanced(html) {
  const stack = [];
  for (const tag of html.matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*?(\/?)>/gi)) {
    const [, closing, rawName, selfClosing] = tag;
    const name = rawName.toLowerCase();
    if (VOID.has(name) || selfClosing) continue;
    if (!closing) stack.push(name);
    else if (stack.pop() !== name) return `</${name}> does not close the open element`;
  }
  return stack.length ? `${stack.length} element(s) left open: ${stack.join(", ")}` : null;
}

/* ── the join to the switch ───────────────────────────────────────────── */

if (entries.length !== VARIANTS.length) {
  bad(`the pack has ${entries.length} entries and there are ${VARIANTS.length} variants`);
}

const byKey = new Map();
for (const entry of entries) {
  if (!entry.sourceKey) bad(`"${entry.name}" has no sourceKey, so its id would ride on its name`);
  else if (!VARIANTS.includes(entry.sourceKey)) {
    bad(`"${entry.name}" has sourceKey "${entry.sourceKey}", which is not a variant id`);
  } else if (byKey.has(entry.sourceKey)) {
    bad(`two entries claim the variant "${entry.sourceKey}"`);
  } else byKey.set(entry.sourceKey, entry);

  if (!entry.name) bad(`an entry has no name`);
  if (!entry.folder) bad(`"${entry.name}" is not in a folder`);

  const want = VARIANT_FOLDERS[entry.sourceKey];
  if (want && entry.folder !== want) {
    bad(
      `"${entry.name}" is filed under "${entry.folder}" but variants.ts files ` +
        `${entry.sourceKey} under "${want}" — nothing would ever offer it`,
    );
  }
}

for (const id of VARIANTS) {
  if (!byKey.has(id)) bad(`the variant "${id}" (${VARIANT_FOLDERS[id]}) has no rules entry`);
}

/* ── the pages ────────────────────────────────────────────────────────── */

let pageCount = 0;
let tableCount = 0;

for (const entry of entries) {
  const where = entry.name;
  if (!Array.isArray(entry.pages) || !entry.pages.length) {
    bad(`"${where}" has no pages`);
    continue;
  }

  const names = new Set();
  const found = new Map();

  entry.pages.forEach((page, i) => {
    pageCount += 1;
    const at = `${where} page ${i + 1}`;

    if (!page.name?.trim()) bad(`${at} has no name`);
    else if (names.has(page.name)) bad(`${where} has two pages called "${page.name}"`);
    else names.add(page.name);

    if (page.type !== "text") bad(`${at} is type "${page.type}", and only text pages are built here`);
    if (page.text?.format !== 1) bad(`${at} declares text.format ${page.text?.format}, not 1 (HTML)`);
    if (!page.title || typeof page.title.show !== "boolean") bad(`${at} has no title.show`);

    const html = page.text?.content ?? "";
    /* Stripped of markup, a page has to have words on it. An empty page reads
       as a section somebody has not written yet rather than as a bug. */
    if (html.replace(/<[^>]+>/g, "").trim().length < 40) {
      bad(`${at} ("${page.name}") has essentially no content`);
    }

    const broken = unbalanced(html);
    if (broken) bad(`${at} ("${page.name}") is malformed HTML: ${broken}`);

    /* The scope statement, on page one and only page one. It is the sentence
       that keeps a GM from planning a session around automation that is not
       there, so it is checked like a rule rather than like a comment. */
    const scopes = (html.match(/dh-variant-scope/g) ?? []).length;
    if (i === 0 && scopes !== 1) {
      bad(`${where}'s first page carries ${scopes} scope statements, and it must carry exactly 1`);
    }
    if (i > 0 && scopes) bad(`${at} carries a scope statement, which belongs on the first page`);

    for (const table of tablesIn(html)) {
      tableCount += 1;
      const caption = captionOf(table);
      if (!caption) {
        bad(`${at} has a table with no caption, so nothing can count its rows`);
        continue;
      }
      if (found.has(caption)) bad(`${where} has two tables captioned "${caption}"`);
      found.set(caption, table);

      const { head, body } = rowsOf(table);
      if (!head.length) bad(`${where} / "${caption}" has no <thead> row`);
      if (!body.length) bad(`${where} / "${caption}" has no <tbody> rows`);

      const widths = [...head, ...body].map(widthOf);
      const width = widths[0];
      if (widths.some((w) => w !== width)) {
        bad(
          `${where} / "${caption}" has ragged rows — widths ${widths.join(", ")} ` +
            `(colspan summed); every row must be ${width} columns wide`,
        );
      }
      if (PRINTED_COLS[caption] && width !== PRINTED_COLS[caption]) {
        bad(
          `${where} / "${caption}" is ${width} columns wide and the printed table is ` +
            `${PRINTED_COLS[caption]}`,
        );
      }

      const want = PRINTED_ROWS[entry.sourceKey]?.[caption];
      if (want === undefined) {
        bad(
          `${where} / "${caption}" is a table PRINTED_ROWS does not know about — ` +
            `add it with the row count the SRD prints, or it is unchecked`,
        );
      } else if (body.length !== want) {
        bad(`${where} / "${caption}" has ${body.length} rows and the SRD prints ${want}`);
      }
    }
  });

  for (const caption of Object.keys(PRINTED_ROWS[entry.sourceKey] ?? {})) {
    if (!found.has(caption)) bad(`${where} no longer has a table captioned "${caption}"`);
  }
}

/* ── the one reading in the chapter, and its note ─────────────────────
   The Scrap Table's column spans were inferred from character offsets because
   the page could not be rendered. A table that presents an inference as a
   transcription is precisely what this repo's `said`-provenance annotations
   exist to prevent, so the warning is a checked feature of the document and
   not a courtesy. Deleting the note has to fail. */

const scrap = byKey
  .get("tech")
  ?.pages.find((p) => (p.text?.content ?? "").includes("<caption>Scrap Table</caption>"));

if (!scrap) bad(`the Tech-Based entry has no page carrying the Scrap Table`);
else {
  const html = scrap.text.content;
  if (!/dh-variant-note/.test(html) || !/inferred, not\s+transcribed/i.test(html)) {
    bad(
      `the Scrap Table page has lost its inference note — its column spans are a ` +
        `reading of page 196 and the page has to say so`,
    );
  }
}

/* ── report ───────────────────────────────────────────────────────────── */

if (problems.length) {
  console.error(`Variant rules have ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}

console.log("Variant rules check out.");
console.log(
  `  ${entries.length} entries, ${pageCount} pages, ${tableCount} tables — ` +
    entries.map((e) => `${e.sourceKey} ${e.pages.length}p`).join(", "),
);
