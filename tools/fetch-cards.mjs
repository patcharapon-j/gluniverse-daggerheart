/*
 * Pulls the official card set from the Daggerheart Card Creator and lands it
 * in this repo: a committed JSON snapshot, the generated domain-card module,
 * and the card header art.
 *
 *     node tools/fetch-cards.mjs            # text + any art not yet present
 *     node tools/fetch-cards.mjs --no-art   # text only
 *     node tools/fetch-cards.mjs --force    # re-download every image
 *
 * Why this and not the book. `tools/extract-domain-cards.mjs` used to read the
 * Domain Card Reference appendix out of the corebook PDF text, and it worked,
 * but it was reading a *printing*. The card creator is first-party and carries
 * errata — Splintering Strike here is the September 2025 wording, and the
 * corebook's is not. It also carries the three things the appendix has no way
 * to give: the header art, the artist credit, and the printed card number.
 *
 * The snapshot is committed on purpose. A build that reaches the network is a
 * build that fails when somebody else's site is down, and a data change that
 * arrives without a diff is a data change nobody reviewed. Re-run this, read
 * the diff, commit it.
 *
 * Upstream is not clean, and this does not pretend otherwise: TYPOS below is
 * the complete list of what we decline to copy, each with the reason. Anything
 * not in that table is taken verbatim, including wording we might have
 * preferred to phrase differently.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://cardcreator.daggerheart.com/api/templates";
const ART = "https://pub-cdae2c597d234591b04eed47a98f233c.r2.dev";

const SNAPSHOT = join(ROOT, "src", "packs-src", "official-cards.json");
const GENERATED = join(ROOT, "src", "packs-src", "domain-cards.mjs");
const PRINTINGS = join(ROOT, "src", "packs-src", "card-printings.mjs");
const ART_DIR = join(ROOT, "assets", "cards");
const CREDITS = join(ROOT, "assets", "cards", "CREDITS.md");

const argv = process.argv.slice(2);
const NO_ART = argv.includes("--no-art");
const FORCE = argv.includes("--force");

/* ── the upstream defect table ────────────────────────────────────────
   Keyed `<kind>/<card name>` — or `<kind>/<card name>/<rank>` for a
   subclass. `find` is matched literally, once. If a `find` stops matching
   the tool fails rather than silently dropping the fix, because upstream
   having repaired it and upstream having rewritten the card around it look
   identical from here and only one of them is fine. */
const TYPOS = [
  // Doubled article.
  { at: "domain/Book of Grynn", find: "create a a wall", to: "create a wall" },
  // Sentence runs off the end of the card.
  {
    at: "domain/Transcendent Union",
    find: "choose who marks it",
    to: "choose who marks it.",
  },
  {
    at: "domain/Towering Stalk",
    find: "damage using your Proficiency",
    to: "damage using your Proficiency.",
  },
  {
    at: "domain/Shield Aura",
    find: "on one creature at a time",
    to: "on one creature at a time.",
  },
  {
    at: "subclass/Divine Wielder/foundation",
    find: "2 Stress from them",
    to: "2 Stress from them.",
  },
  // The card prints its element list dot-separated; the API leaves the dots
  // as undecoded entities, which our text is not HTML and cannot render.
  {
    at: "subclass/Elemental Origin/foundation",
    find: "Air &#8729; Earth &#8729; Fire &#8729; Lightning &#8729; Water",
    to: "Air ∙ Earth ∙ Fire ∙ Lightning ∙ Water",
  },
];

/* ── shape guards ─────────────────────────────────────────────────────
   Nine decks, three cards at level 1 and two at every level after; eighteen
   ancestries, nine communities, eighteen subclasses. That is what the book
   contains, so a fetch that produces anything else is a fetch that went
   wrong, and writing it would be worse than failing. */
const EXPECT = { ancestry: 18, community: 9, subclass: 18, domain: 189 };
const DECK = { 1: 3, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2 };

const DOMAIN_ORDER = [
  "arcana",
  "blade",
  "bone",
  "codex",
  "grace",
  "midnight",
  "sage",
  "splendor",
  "valor",
];

const die = (msg) => {
  console.error(`fetch-cards: ${msg}`);
  process.exit(1);
};

/* ── text normalising ─────────────────────────────────────────────────
   Upstream is typewriter-quoted and loosely whitespaced. The rest of the
   compendium is typeset — curly apostrophes, no stray runs of space — so the
   incoming text is brought to the same standard. This is the only rewriting
   that happens outside TYPOS, and it changes no word. */
function tidy(s) {
  return String(s)
    .replace(/\r\n?/g, "\n")
    // Apostrophes and quotes. The apostrophe rule runs first so that the
    // closing-quote rule cannot claim a word-internal tick.
    .replace(/(\w)'(\w)/g, "$1’$2")
    .replace(/'(?=\w)/g, "‘")
    .replace(/'/g, "’")
    .replace(/"(?=\S)/g, "“")
    .replace(/"/g, "”")
    // Whitespace: no trailing space, no run of spaces, no indented line.
    .replace(/[ \t]+/g, " ")
    .replace(/^[ \t]+/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    // Bullets. Upstream writes most lists with `- ` and three with `* `, which
    // is the same list and also the emphasis character. `_helpers.mjs` reads
    // one marker, so they arrive as one. The space is what makes this safe:
    // a bold run opens `**`, never `* `.
    .replace(/^\* /gm, "- ")
    .trim();
}

/**
 * A feature header, in all four shapes upstream writes it.
 *
 *     **_Purposeful Design:_**     the usual one
 *     **_Heart of a Poet_:**       colon outside the italics
 *     _**Path Forward:**_          italics outside the bold
 *     **Power of the Gods**.       a full stop where the colon should be
 *
 * The separator must contain a `:` or a `.`, which is the whole reason this
 * can tell a header from a line that merely opens on a bold cost —
 * `**Mark a Stress** to …` is not a feature and must not become one.
 */
const FEATURE_HEAD = /^[*_]{2,3}\s*([^*_:\n]+?)\s*(?:[*_]{1,3}[:.]|[:.][*_]{1,3})[*_]{0,2}\s+/;

/**
 * Split a card body into its named features.
 *
 * Ancestries carry two, communities and most subclass ranks carry one, and a
 * few subclass ranks carry two or three. They are separated by a blank line
 * and each opens with its own header, so the split is on the header and the
 * pieces come back in printed order — which for an ancestry *is* the rule,
 * top feature and bottom feature. A block with no header is a continuation of
 * the feature above it, not a new one.
 */
export function splitFeatures(content) {
  const out = [];
  for (const block of tidy(content).split(/\n{2,}/)) {
    const m = block.match(FEATURE_HEAD);
    if (m) out.push({ name: m[1], text: block.slice(m[0].length) });
    else if (out.length) out[out.length - 1].text += `\n\n${block}`;
    else out.push({ name: "", text: block });
  }
  return out;
}

/* ── fetch ────────────────────────────────────────────────────────────── */

async function main() {
  console.log(`fetch-cards: GET ${API}`);
  const res = await fetch(API);
  if (!res.ok) die(`${API} → ${res.status}`);
  const data = await res.json();

  for (const [k, n] of Object.entries(EXPECT)) {
    const got = data[k]?.length ?? 0;
    if (got !== n) die(`expected ${n} ${k} entries, got ${got}`);
  }

  /* deck shape */
  for (const slug of DOMAIN_ORDER) {
    const deck = data.domain.filter((c) => c.primaryDomain.toLowerCase() === slug);
    for (const [lvl, n] of Object.entries(DECK)) {
      const got = deck.filter((c) => c.level === Number(lvl)).length;
      if (got !== n) die(`${slug} level ${lvl}: expected ${n} cards, got ${got}`);
    }
  }
  const unknown = data.domain
    .map((c) => c.primaryDomain.toLowerCase())
    .filter((d) => !DOMAIN_ORDER.includes(d));
  if (unknown.length) die(`unknown domains: ${[...new Set(unknown)].join(", ")}`);

  /* apply the defect table, and insist every entry still bites */
  const key = (kind, name, rank) => `${kind}/${name}${rank ? `/${rank}` : ""}`;
  const used = new Set();
  const fix = (kind, name, rank, text) => {
    let out = text;
    for (const t of TYPOS) {
      if (t.at !== key(kind, name, rank)) continue;
      if (!out.includes(t.find)) continue;
      out = out.replace(t.find, t.to);
      used.add(t.at + t.find);
    }
    return out;
  };

  for (const c of data.domain) c.content = tidy(fix("domain", c.name, null, c.content));
  for (const kind of ["ancestry", "community"]) {
    for (const c of data[kind]) {
      c.description = tidy(fix(`${kind}.description`, c.name, null, c.description));
      c.content = tidy(fix(kind, c.name, null, c.content));
    }
  }
  for (const s of data.subclass) {
    for (const rank of ["foundation", "specialization", "mastery"]) {
      if (s.content[rank] == null) continue;
      s.content[rank] = tidy(fix("subclass", s.name, rank, s.content[rank]));
    }
  }

  const stale = TYPOS.filter((t) => !used.has(t.at + t.find));
  if (stale.length)
    die(
      `TYPOS entries no longer match upstream — re-read the card before ` +
        `deleting them:\n  ${stale.map((t) => `${t.at}: ${JSON.stringify(t.find)}`).join("\n  ")}`,
    );

  /* ── write the snapshot ───────────────────────────────────────────── */
  writeFileSync(SNAPSHOT, `${JSON.stringify(data, null, 1)}\n`);
  console.log(`fetch-cards: wrote ${rel(SNAPSHOT)}`);

  writeGenerated(data);
  writePrintings(data);
  writeCredits(data);

  if (!NO_ART) await fetchArt(data);
}

const rel = (p) => p.slice(ROOT.length + 1).replace(/\\/g, "/");

/* ── the generated module ─────────────────────────────────────────────── */

const CARD_TYPE = { SPELL: "spell", ABILITY: "ability", GRIMOIRE: "grimoire" };

/** The art file a card's `img` points at, mirroring upstream's own layout. */
export const artPath = (image) =>
  image ? `systems/gluniverse-daggerheart/assets/cards${image.replace("/v1/card-header-images", "")}` : "";

function writeGenerated(data) {
  const cards = data.domain
    .slice()
    .sort((a, b) => {
      const d =
        DOMAIN_ORDER.indexOf(a.primaryDomain.toLowerCase()) -
        DOMAIN_ORDER.indexOf(b.primaryDomain.toLowerCase());
      if (d) return d;
      if (a.level !== b.level) return a.level - b.level;
      return a.name.localeCompare(b.name);
    })
    .map((c) => ({
      name: tidy(c.name),
      domain: c.primaryDomain.toLowerCase(),
      level: c.level,
      cardType: CARD_TYPE[c.domainType] ?? "ability",
      recall: c.recallCost ?? 0,
      art: artPath(c.image),
      artist: c.artist ?? "",
      cardId: c.cardId || c.artId || "",
      text: c.content,
    }));

  const body = cards
    .map(
      (c) =>
        `  {\n${Object.entries(c)
          .map(([k, v]) => `    ${k}: ${JSON.stringify(v)},`)
          .join("\n")}\n  },`,
    )
    .join("\n");

  writeFileSync(
    GENERATED,
    `/**\n` +
      ` * GENERATED — do not edit here.\n` +
      ` *\n` +
      ` * The 189 corebook domain cards, as the official Daggerheart Card Creator\n` +
      ` * publishes them. Re-run the fetcher and commit the diff:\n` +
      ` *\n` +
      ` *     node tools/fetch-cards.mjs\n` +
      ` *\n` +
      ` * Deck order — by domain as the book introduces them, then by level. Within\n` +
      ` * a level the two (or three) cards are alphabetical, because the API does not\n` +
      ` * publish the printed order and inventing one would be a lie about the deck.\n` +
      ` */\n\n` +
      `export default [\n${body}\n];\n`,
  );
  console.log(`fetch-cards: wrote ${rel(GENERATED)} (${cards.length} cards)`);
}

/**
 * The lookup the hand-authored packs use.
 *
 * Ancestries, communities and subclasses are written by hand — they carry
 * things no API publishes, like a class's starting Evasion or the split of an
 * ancestry's two features into top and bottom — so their art cannot ride along
 * in the entry the way a domain card's does. It also cannot be derived from
 * the name: upstream files Halfling under `halflings.webp`. So it is a
 * generated map, keyed by the card name, and `_helpers.mjs` reads it.
 */
function writePrintings(data) {
  const of = (c) => ({ art: artPath(c.image), artist: c.artist ?? "", code: c.cardId || c.artId || "" });
  const out = {};
  for (const kind of ["ancestry", "community", "subclass"]) {
    out[kind] = {};
    for (const c of data[kind].slice().sort((a, b) => a.name.localeCompare(b.name)))
      out[kind][tidy(c.name)] = of(c);
  }

  const block = (kind) =>
    `  ${kind}: {\n` +
    Object.entries(out[kind])
      .map(([name, p]) => `    ${JSON.stringify(name)}: ${JSON.stringify(p)},`)
      .join("\n") +
    `\n  },`;

  writeFileSync(
    PRINTINGS,
    `/**\n` +
      ` * GENERATED — do not edit here. Run \`node tools/fetch-cards.mjs\`.\n` +
      ` *\n` +
      ` * Header art, artist and printed card number for the three card kinds whose\n` +
      ` * entries are hand-authored. Domain cards carry their own, in\n` +
      ` * \`domain-cards.mjs\`, because that whole module is generated.\n` +
      ` */\n\n` +
      `export default {\n${["ancestry", "community", "subclass"].map(block).join("\n")}\n};\n`,
  );
  console.log(`fetch-cards: wrote ${rel(PRINTINGS)}`);
}

/**
 * The credit file.
 *
 * We ship the publisher's header art inside the system, so the artists are
 * named where somebody unpacking the folder will find them, not only inside a
 * Foundry data model.
 */
function writeCredits(data) {
  const rows = [];
  for (const kind of ["ancestry", "community", "subclass", "domain"])
    for (const c of data[kind])
      if (c.image) rows.push({ kind, name: tidy(c.name), artist: c.artist ?? "—", code: c.cardId || c.artId || "—" });

  const byArtist = new Map();
  for (const r of rows) byArtist.set(r.artist, (byArtist.get(r.artist) ?? 0) + 1);

  mkdirSync(dirname(CREDITS), { recursive: true });
  writeFileSync(
    CREDITS,
    `# Card art credits\n\n` +
      `The images in this folder are the official Daggerheart card header art,\n` +
      `fetched from the Daggerheart Card Creator by \`tools/fetch-cards.mjs\`.\n` +
      `They are the property of Darrington Press and are **not** covered by the\n` +
      `Darrington Press Community Gaming License, which grants the rules text\n` +
      `only. They are included here for local play; do not redistribute them.\n\n` +
      `Regenerate this file with \`node tools/fetch-cards.mjs\`.\n\n` +
      `## Artists\n\n` +
      [...byArtist.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([a, n]) => `- ${a} — ${n} card${n === 1 ? "" : "s"}`)
        .join("\n") +
      `\n\n## Cards\n\n| Card | Kind | Artist | No. |\n| --- | --- | --- | --- |\n` +
      rows
        .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
        .map((r) => `| ${r.name} | ${r.kind} | ${r.artist} | ${r.code} |`)
        .join("\n") +
      `\n`,
  );
  console.log(`fetch-cards: wrote ${rel(CREDITS)} (${rows.length} cards)`);
}

/* ── art ──────────────────────────────────────────────────────────────
   Header art only, at the size the creator serves it — 640px on the long
   edge, which is a shade over 2× the 300px plate the design draws it into.
   Every file keeps upstream's own path so a card's `image` field and the file
   on disk cannot drift apart. */

async function fetchArt(data) {
  const wanted = new Set();
  for (const kind of ["ancestry", "community", "subclass", "domain"])
    for (const c of data[kind]) if (c.image) wanted.add(c.image);

  let got = 0;
  let skipped = 0;
  const failed = [];

  for (const image of wanted) {
    const dest = join(ART_DIR, image.replace("/v1/card-header-images/", "").replace(/\//g, "/"));
    if (!FORCE && existsSync(dest)) {
      skipped++;
      continue;
    }
    mkdirSync(dirname(dest), { recursive: true });
    const res = await fetch(`${ART}${image}`);
    if (!res.ok) {
      failed.push(`${image} → ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    // A CDN miss comes back as an HTML error page with a 200 more often than
    // it should. A WebP starts RIFF....WEBP; anything else is not one.
    if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") {
      failed.push(`${image} → not a WebP (${buf.length} bytes)`);
      continue;
    }
    writeFileSync(dest, buf);
    got++;
  }

  console.log(`fetch-cards: art — ${got} downloaded, ${skipped} already present`);
  if (failed.length) die(`art downloads failed:\n  ${failed.join("\n  ")}`);
}

/** Read the committed snapshot. The audit tool and the packs both want it. */
export function snapshot() {
  if (!existsSync(SNAPSHOT))
    die(`${rel(SNAPSHOT)} is missing — run \`node tools/fetch-cards.mjs\``);
  return JSON.parse(readFileSync(SNAPSHOT, "utf8"));
}

/* Importable for its snapshot and its path helper; only the direct run fetches. */
if (process.argv[1]?.replace(/\\/g, "/").endsWith("tools/fetch-cards.mjs")) await main();
