/**
 * The *Hope and Fear* card art, filed and converted.
 *
 *     node tools/import-hf-art.mjs
 *     node tools/import-hf-art.mjs --check    # match only, write nothing
 *
 * `fetch-cards.mjs` cannot reach any of this. The Card Creator API publishes
 * the corebook and nothing else, and there are no print-and-cut card sheets in
 * the expansion PDF — pages 188–192 look like them and are campaign-frame maps.
 * So the paintings come out of the book by hand, and this tool is the second
 * half of that: it takes the folder of crops, works out which card each one
 * belongs to, and converts them into the same shape the corebook art is in.
 *
 * **It cannot run on a fresh clone**, and that is not a defect. Its input lives
 * under `docs/`, which `.gitignore` excludes for the reason stated there — the
 * scans are somebody else's work and are not needed to build. What *is*
 * committed is the output, exactly as it is for the corebook: `assets/cards/`
 * is the one folder of somebody else's work in this history, and the line is
 * whether the build reads it. It does.
 *
 * Two things the book does not give, so two fields stay empty:
 *
 * - **The card number.** There is no printed set, so there is no number. The
 *   corebook's `DH Core 056/270` has nothing to be here.
 * - **The artist.** The expansion credits its artists in one list on page 2 and
 *   attributes no painting to anybody. `assets/cards/CREDITS.md` carries that
 *   list, because a collective credit is the credit that exists; putting a
 *   guess in `printing.artist` would be this repo inventing an attribution.
 *
 * Matching is by name and it is **strict**: every card that should have art
 * must find exactly one file and every file must be claimed, or the tool
 * refuses to write. The crops are named by hand and four of them are misspelt
 * — `dread-touced`, `jump scapre`, `siphone essence`, `wall of huinger` — so a
 * loose match is needed and a loose match that silently picks the wrong card is
 * the failure worth preventing. Edit distance decides, a gap to the runner-up
 * is required, and anything unresolved is printed rather than guessed.
 */

import { readdirSync, mkdirSync, existsSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "docs/rules/PDF/hope-and-fear-images-curated");
const ART = join(ROOT, "assets/cards");
const CHECK = process.argv.includes("--check");

/* The book's own artist list, page 2. Collective, in its printed order. */
const ARTISTS = [
  "Juan Salvador Almencion", "Eliot Baum", "Cybercatbug", "Luisa Costa",
  "Daarken", "Bear Frymire", "Letícia Freitas", "Laura Galli",
  "Kristina Gehrmann", "Arturo Gutiérrez González", "Wesley Griffith",
  "Katerina Ladon", "Richard Luong", "Morgane Magloire", "Dominik Mayer",
  "Reiko Murakami", "Tamara Osborn", "Ilya Royz", "Chris Seaman",
  "Crystal Sully", "Jenny Tan", "Brian Valeza", "Richard Whitters",
  "Mat Wilma", "Maciej Wojtala", "Zuzanna Wuzyk",
];

/* ── what wants art ──────────────────────────────────────────────────── */

const { default: DREAD } = await import("../src/packs-src/dread-cards.mjs");
const { default: HERITAGE } = await import("../src/packs-src/hf-heritage.mjs");
const { default: TRANSFORMATIONS } = await import("../src/packs-src/transformations.mjs");
const { default: CLASSES } = await import("../src/packs-src/hf-classes.mjs");

/** The slug upstream uses, and therefore the one `slug()` in the pack sources
    has to agree with: lower case, apostrophes dropped, runs of anything else
    collapsed to one hyphen. */
export const slug = (s) =>
  String(s).toLowerCase().replace(/['’ʼ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const subclasses = [...new Set(CLASSES.filter((d) => d.type === "subclass").map((d) => d.system.subclassName))];

const WANTED = [
  ...DREAD.map((c) => ({ kind: "domains/dread", name: c.name })),
  ...HERITAGE.filter((d) => d.type === "ancestry").map((d) => ({ kind: "ancestry", name: d.name })),
  ...HERITAGE.filter((d) => d.type === "community").map((d) => ({ kind: "community", name: d.name })),
  ...TRANSFORMATIONS.map((d) => ({ kind: "transformation", name: d.name })),
  ...subclasses.map((n) => ({ kind: "subclass", name: n })),
];

/* ── matching ────────────────────────────────────────────────────────── */

/** A filename reduced to the part that names a card: the level suffix the
    Dread crops carry (`voice of dread - 1`) is not part of any name, and
    neither is the upscaler's trail of tool arguments. */
const key = (s) =>
  s
    .replace(/\.png$/i, "")
    .replace(/_upscayl.*$/i, "")
    .replace(/[-\s]+\d+$/, "")
    .toLowerCase()
    .replace(/['’ʼ]/g, "")
    .replace(/[^a-z0-9]+/g, "");

const distance = (a, b) => {
  const m = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = m[0];
    m[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = m[j];
      m[j] = Math.min(m[j] + 1, m[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = t;
    }
  }
  return m[b.length];
};

/* Everything in the folder that is a card painting. The two that are not are
   named for what they are rather than for a card, and are used elsewhere:
   the banner is where `DOMAIN_CONFIG.dread`'s hue was measured and the icon is
   what `assets/domains/dread.svg` was traced from. */
const NOT_ART = /^banner-color|^dread domain icon/i;
const files = readdirSync(SRC).filter((f) => /\.png$/i.test(f) && !NOT_ART.test(f));

const problems = [];
const claimed = new Map();
const plan = [];

for (const want of WANTED) {
  const k = key(want.name);
  const ranked = files
    .map((f) => ({ f, d: distance(k, key(f)) }))
    .sort((a, b) => a.d - b.d);
  const [best, next] = ranked;

  /* A misspelling is one or two characters; a different card is many. The gap
     to the runner-up is the real guard — "dire strike" and "blighting strike"
     are four apart, so absolute distance alone would not tell them apart. */
  if (best.d > 4 || (next && next.d - best.d < 2 && best.d > 0)) {
    problems.push(
      `${want.name}: no confident match — closest ${ranked.slice(0, 3).map((r) => `${r.f} (${r.d})`).join(", ")}`,
    );
    continue;
  }
  if (claimed.has(best.f)) {
    problems.push(`${best.f}: claimed by both ${claimed.get(best.f)} and ${want.name}`);
    continue;
  }
  claimed.set(best.f, want.name);
  plan.push({ ...want, file: best.f, fuzzy: best.d });
}

for (const f of files) if (!claimed.has(f)) problems.push(`${f}: matches no card`);

if (problems.length) {
  console.error(`import-hf-art: ${problems.length} unresolved, writing nothing\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const fuzzy = plan.filter((p) => p.fuzzy > 0);
if (fuzzy.length) {
  console.log(`matched ${plan.length} paintings, ${fuzzy.length} through a misspelt filename:`);
  for (const p of fuzzy) console.log(`  ${p.file}  →  ${p.name}`);
} else {
  console.log(`matched ${plan.length} paintings, all exactly`);
}

if (CHECK) process.exit(0);

/* ── convert ─────────────────────────────────────────────────────────── */

/* No reprojection. `.card .plate .img` is `var(--art) 44% 22%/cover`, so the
   plate crops to fill whatever it is handed, and these crops run from 1.11 to
   1.51 against the corebook's uniform 5:4. Forcing them to that ratio would
   either stretch the painting or throw away a hand-chosen crop to match a
   number nothing reads. Nor is anything upscaled: 481px wide is already above
   the 300px a chat plate draws and the 262px a peek does, and inventing
   pixels to reach 640 would only make the file bigger. */
const q = 82;
let bytes = 0;

for (const p of plan) {
  const dir = join(ART, p.kind);
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, `${slug(p.name)}.webp`);
  execFileSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-i", join(SRC, p.file), "-c:v", "libwebp", "-quality", String(q), dest],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
  bytes += statSync(dest).size;
}

console.log(`\nwrote ${plan.length} webp, ${(bytes / 1024).toFixed(0)} KB total, ${(bytes / plan.length / 1024).toFixed(1)} KB average`);

/* ── credits ─────────────────────────────────────────────────────────── */

const CREDITS = join(ART, "CREDITS.md");
const existing = existsSync(CREDITS) ? (await import("node:fs")).readFileSync(CREDITS, "utf8") : "";
const MARK = "\n## Hope and Fear\n";
const section =
  MARK +
  `\nThe ${plan.length} paintings under \`domains/dread/\`, \`transformation/\` and the ` +
  `*Hope and Fear* entries in the other folders were taken from the expansion PDF\n` +
  `by hand and converted by \`tools/import-hf-art.mjs\`. They are the property of\n` +
  `Darrington Press on the same terms as everything else in this folder.\n\n` +
  `The expansion credits its artists **collectively**, on page 2, and attributes no\n` +
  `painting to anybody. So there is no per-card artist here and \`printing.artist\`\n` +
  `is empty on every one of these cards — a collective credit is the credit that\n` +
  `exists, and a guess would be this repository inventing an attribution.\n\n` +
  ARTISTS.map((a) => `- ${a}`).join("\n") +
  "\n";

const before = existing.includes(MARK) ? existing.slice(0, existing.indexOf(MARK)) : existing.replace(/\s+$/, "") + "\n";
writeFileSync(CREDITS, before + section);
console.log(`credits: ${ARTISTS.length} artists recorded collectively in assets/cards/CREDITS.md`);
