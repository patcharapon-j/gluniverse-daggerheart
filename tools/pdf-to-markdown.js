/*
 * Daggerheart PDF -> structured Markdown.
 *
 * pdftotext gives two imperfect views of each page:
 *   reading-order mode : correct multi-column prose flow, but transposes tables
 *   -layout mode       : preserves table grids, but interleaves prose columns
 * We extract both and pick per page based on how table-like the layout view is.
 *
 * Usage: node convert.js <extract-dir> <out-dir> [--dry]
 */
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2];
const OUT_ROOT = process.argv[3];
const DRY = process.argv.includes('--dry');

const readPages = f => fs.readFileSync(path.join(SRC, f), 'utf8').split('\f');

// ---------------------------------------------------------------- running head

// Real running heads in these books are exactly one of:
//   "Chapter 4: Tier 1 Adversaries" | "Appendix: Index" | "Introduction" | "Index"
// Anything else matching "<text> <number>" is body text and must be rejected,
// or it corrupts the page numbering. The section name may contain digits
// ("Tier 1 Adversaries") but must not END in a stray number, which is what
// distinguishes a real head from near-misses like "Core GM Mechanics 11551".
const SECTION = "(?!.*\\s\\d+$)[A-Za-z][A-Za-z0-9 ,&'’:-]{1,40}";
const HEAD_RE = new RegExp(`^(?:Chapter\\s+\\d+:\\s+${SECTION}|Appendix:\\s+${SECTION}|Introduction|Index)$`);

function parseHead(pageText) {
  const lines = pageText.split('\n').map(s => s.trim()).filter(Boolean);
  for (const l of [...lines.slice(-3), ...lines.slice(0, 2)]) {
    let m = l.match(/^(\d{1,3})\s+(.+)$/);
    if (m && HEAD_RE.test(m[2])) return { printed: +m[1], label: m[2], raw: l };
    m = l.match(/^(.+?)\s+(\d{1,3})$/);
    if (m && HEAD_RE.test(m[1])) return { printed: +m[2], label: m[1], raw: l };
  }
  return null;
}

const chapterOf = label => {
  const m = (label || '').match(/^(Chapter\s+\d+|Appendix|Introduction|Index)/);
  return m ? m[1] : 'Front Matter';
};

// ------------------------------------------------------------ table detection

// An aligned table row shows up in layout mode as cells separated by runs of
// 2+ spaces. Two-column prose produces one such gap, so require 2+ gaps
// (3+ cells) before calling a line tabular.
function isTablePage(layoutText) {
  const lines = layoutText.split('\n').filter(l => l.trim().length >= 12);
  if (lines.length < 4) return false;
  const tabular = lines.filter(l => (l.trim().match(/ {2,}/g) || []).length >= 2).length;
  return tabular / lines.length >= 0.35;
}

// -------------------------------------------------------------------- cleanup

function clean(text, headRaw, mode) {
  let lines = text.split(/\r?\n/);
  if (headRaw) lines = lines.filter(l => l.trim() !== headRaw);

  if (mode === 'flow') {
    // Reading-order mode packs consecutive bullets onto one line; split them
    // back apart so lists survive as lists.
    lines = lines.flatMap(l =>
      (l.match(/[•▪]/g) || []).length < 2 ? [l] : l.split(/\s+(?=[•▪]\s)/).map(s => s.trim())
    );
  }

  return lines.join('\n').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

// A short standalone ALL-CAPS line is a heading in these books.
function promoteHeadings(text) {
  return text.split('\n').map(l => {
    const t = l.trim();
    if (l !== t || t.length < 3 || t.length > 60) return l;
    if (/^\d+$/.test(t)) return l;
    if (!/[A-Z]{2}/.test(t)) return l;
    if (!/^[A-Z0-9][A-Z0-9 '’\-:&(),.!?]+$/.test(t)) return l;
    return '### ' + t;
  }).join('\n');
}

// ------------------------------------------------------------------ build one

function build(book) {
  const raw = readPages(path.basename(book.rawFile));
  const lay = readPages(path.basename(book.layFile));
  const n = Math.min(raw.length, lay.length);

  const pages = [];
  let label = null, printed = null;

  for (let i = 0; i < n; i++) {
    const head = parseHead(raw[i]) || parseHead(lay[i]);
    if (head) { label = head.label; printed = head.printed; }
    else if (printed != null) printed++;   // interpolate across unlabelled pages

    const table = isTablePage(lay[i]);
    const mode = table ? 'layout' : 'flow';
    let body = clean(table ? lay[i] : raw[i], head && head.raw, mode);
    if (mode === 'flow') body = promoteHeadings(body);

    pages.push({
      pdfPage: i + 1,
      printed: head ? head.printed : printed,
      exact: !!head,
      label: label || 'Front Matter',
      chapter: chapterOf(label),
      mode: body.trim() ? mode : 'image-only',
      body,
    });
  }

  // Group by running head — these are the book's own section boundaries, which
  // makes each output file a semantically coherent unit.
  const raw_groups = [];
  for (const p of pages) {
    const last = raw_groups[raw_groups.length - 1];
    if (last && last.label === p.label) last.pages.push(p);
    else raw_groups.push({ label: p.label, chapter: p.chapter, pages: [p] });
  }

  // A few sections (the appendices, which absorb the untitled back matter) run
  // very long. Split them on page boundaries so no single file is unwieldy.
  const CAP = 120 * 1024;
  const groups = [];
  for (const g of raw_groups) {
    const size = g.pages.reduce((a, p) => a + p.body.length, 0);
    if (size <= CAP) { groups.push(g); continue; }
    const parts = Math.ceil(size / CAP);
    const per = Math.ceil(g.pages.length / parts);
    for (let i = 0; i < parts; i++) {
      const slice = g.pages.slice(i * per, (i + 1) * per);
      if (slice.length) groups.push({ ...g, pages: slice, part: i + 1, parts });
    }
  }
  return { pages, groups };
}

// ---------------------------------------------------------------------- books

const BOOKS = [
  { slug: 'corebook', title: 'Daggerheart Core Rulebook',
    rawFile: 'core_raw.txt', layFile: 'core_lay.txt', source: 'Daggerheart_Corebook.pdf' },
  { slug: 'hope-and-fear', title: 'Daggerheart: Hope and Fear',
    rawFile: 'hf_raw.txt', layFile: 'hf_lay.txt', source: 'Daggerheart_Hope_and_Fear_Interactive_Book.pdf' },
];

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const results = BOOKS.map(book => ({ book, ...build(book) }));

for (const { book, pages, groups } of results) {
  const img = pages.filter(p => p.mode === 'image-only').length;
  const tbl = pages.filter(p => p.mode === 'layout').length;
  console.log(`\n=== ${book.title}: ${pages.length} pages (${tbl} table, ${img} image-only) -> ${groups.length} files`);
  groups.forEach((g, i) => {
    const f = g.pages[0], l = g.pages[g.pages.length - 1];
    const kb = Math.round(g.pages.reduce((a, p) => a + p.body.length, 0) / 1024);
    console.log(`${String(i + 1).padStart(2)}. ${String(kb).padStart(4)}KB  pdf ${String(f.pdfPage).padStart(3)}-${String(l.pdfPage).padEnd(3)} printed ${String(f.printed).padStart(3)}-${String(l.printed).padEnd(3)}  ${g.label}`);
  });
}

if (DRY) process.exit(0);

// ---------------------------------------------------------------------- write

fs.rmSync(OUT_ROOT, { recursive: true, force: true });
fs.mkdirSync(OUT_ROOT, { recursive: true });
const toc = [];

for (const { book, pages, groups } of results) {
  const dir = path.join(OUT_ROOT, book.slug);
  fs.mkdirSync(dir, { recursive: true });

  toc.push(
    `### ${book.title}`, '',
    `Source \`${book.source}\` — ${pages.length} PDF pages.`, '',
    '| File | Section | Printed pages |', '| --- | --- | --- |'
  );

  groups.forEach((g, i) => {
    const first = g.pages[0], last = g.pages[g.pages.length - 1];
    const suffix = g.parts ? ` (part ${g.part} of ${g.parts})` : '';
    const title = g.label + suffix;
    const name = `${String(i + 1).padStart(2, '0')}-${slugify(g.label)}${g.parts ? `-part${g.part}` : ''}.md`;
    const pp = p => (p == null ? '?' : p);

    const out = [
      '---',
      `book: ${book.title}`,
      `source_pdf: ${book.source}`,
      `chapter: ${g.chapter}`,
      `section: ${g.label}`,
      `pdf_pages: ${first.pdfPage}-${last.pdfPage}`,
      `printed_pages: ${pp(first.printed)}-${pp(last.printed)}`,
      '---', '',
      `# ${title}`, '',
      `*${book.title}, printed pages ${pp(first.printed)}–${pp(last.printed)}.*`, '',
    ];

    for (const p of g.pages) {
      out.push(`<!-- pdf-page:${p.pdfPage} printed-page:${p.printed} extract:${p.mode} -->`, '');
      if (p.mode === 'image-only') {
        out.push('*(No text layer on this page — artwork, map, or print-and-cut sheet.)*', '');
      } else {
        if (p.mode === 'layout') out.push('```text', p.body, '```', '');
        else out.push(p.body, '');
      }
    }

    fs.writeFileSync(path.join(dir, name), out.join('\n'), 'utf8');
    toc.push(`| [\`${name}\`](${book.slug}/${name}) | ${title} | ${pp(first.printed)}–${pp(last.printed)} |`);
  });

  toc.push('');
}

fs.writeFileSync(path.join(OUT_ROOT, 'README.md'), [
  '# Daggerheart rules text (machine-readable)',
  '',
  'Markdown extracted from the source PDFs in the repo root, for reference while',
  'building this Foundry VTT system. Generated by `tools/pdf-to-markdown.ps1` —',
  'regenerate rather than hand-editing.',
  '',
  '## Page markers',
  '',
  'Every page starts with an HTML comment:',
  '',
  '```',
  '<!-- pdf-page:31 printed-page:30 extract:flow -->',
  '```',
  '',
  '| Field | Meaning |',
  '| --- | --- |',
  '| `pdf-page` | 1-based page in the PDF file |',
  '| `printed-page` | number printed on the page — this is what the book\'s own index and cross-references cite |',
  '| `extract` | how the text was recovered (below) |',
  '',
  '### Extraction modes',
  '',
  '- **`flow`** — reading-order text. Multi-column prose is correctly linearised.',
  '  Short ALL-CAPS lines are promoted to `###` headings.',
  '- **`layout`** — space-aligned text, wrapped in a ```` ```text ```` fence. Used for',
  '  pages that are mostly tables or stat blocks, where column alignment carries the',
  '  meaning. Read these as fixed-width; do not reflow them.',
  '- **`image-only`** — the page has no text layer at all.',
  '',
  '## Known gaps',
  '',
  'These pages are graphics with no recoverable text:',
  '',
  '- **Corebook PDF pages 355–363** (printed 357–365) — campaign frame maps.',
  '- **Corebook PDF pages 386–415** — the print-and-cut domain card sheets. Only the',
  '  `DOMAIN LEVEL n` banner is text. **The card rules text is not lost**: it is fully',
  '  present as real text in `corebook/` under *Appendix: Domain Card Reference*',
  '  (printed pages 328–342). Use that appendix as the authoritative card data.',
  '- Character and campaign sheets in the back matter are fillable forms, so they',
  '  extract as field labels only.',
  '',
  '## Contents',
  '',
  ...toc,
].join('\n'), 'utf8');

console.log('\nWrote ' + OUT_ROOT);
