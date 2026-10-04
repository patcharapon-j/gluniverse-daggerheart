/*
 * Regenerates the deck listing and the audit table inside the campaign vault's
 * `References/Root and Void Domains.md` from `src/packs-src/marked-cards.mjs`.
 *
 *     node tools/sync-marked-note.mjs
 *     node tools/sync-marked-note.mjs --check   # fail instead of writing
 *
 * ── why this exists ───────────────────────────────────────────────────
 * The vault note is where the Root and Void decks are *argued for* — the Mark
 * economy, the long-rest roll, the two rules taken off the printed corpus, the
 * threads each domain owns. All of that is prose a tool cannot write. But the
 * note also carried all forty-two cards typed out underneath that prose, and a
 * hand-typed deck is a second source of truth for something that already has
 * one. Nothing in the repo read the note, so nothing could notice when the two
 * disagreed, and they did: a card retuned in the module stayed at its old
 * numbers in the note for as long as nobody happened to reread the page.
 *
 * The note already claimed the region between its `decks:start` and
 * `decks:end` markers was machine-written. This is the machine. The module is
 * the source, the note's region is the view, and `--check` is how CI says the
 * view is behind.
 *
 * ── what is derived and what is authored ──────────────────────────────
 * Everything inside the region comes from the card array except four strings:
 * the two domain flavour blurbs, the two Spellcast lines, and the paragraph
 * that closes the audit, and the one line explaining the lead tables' arrow.
 * Those sit in `PROSE` below and nowhere else. If a sixth piece of prose ever
 * wants to live inside the markers, it belongs there too — the rule is that
 * reading `PROSE` tells you everything in the region a human wrote.
 *
 * The audit table holds no typed-in numbers at all, which was the other half
 * of the drift: a count of gated cards is exactly the kind of fact that is
 * true when written and quietly false a month later. The two limiter
 * predicates it needs are the ones `tools/check-marked.mjs` already measures
 * the decks with, so the note and the check agree on what "gated" means.
 *
 * The per-card balance argument comes from `src/packs-src/marked-leads.mjs`
 * and is rendered here only. That module is the single copy: the check reads
 * it to fail a card with no entry, this renders it for a reader, and neither
 * owns it. Which is why the section below is a view and not a summary — a
 * summary would be a third version of the argument, and the third version is
 * always the one nobody updates.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");

/* ── where the note lives ─────────────────────────────────────────────
   The vault is a Google Drive folder outside this repo, so the path is an
   absolute default that `TM_VAULT` overrides — the same shape the vault's own
   helpers use. Every segment of it has spaces in it, which is why this joins
   path segments and never builds a shell string: nothing here goes through a
   shell, so nothing needs quoting. */

const VAULT =
  process.env.TM_VAULT ||
  "/Users/frostnoxia/Library/CloudStorage/GoogleDrive-p.joksamut@gmail.com/My Drive/Obsidian Vaults/The Twilight Marked/The Twilight Marked";
const NOTE = join(VAULT, "References", "Root and Void Domains.md");

const START = "<!-- decks:start -->";
const END = "<!-- decks:end -->";

const SOURCE = "src/packs-src/marked-cards.mjs + marked-leads.mjs";

const load = async (f) => (await import(pathToFileURL(join(ROOT, "src", "packs-src", f)).href)).default;

const CARDS = await load("marked-cards.mjs");
const LEADS = await load("marked-leads.mjs");

/** The 210 printed cards, so a lead can name one and get its level and domain. */
const PRINTED = [...(await load("domain-cards.mjs")), ...(await load("dread-cards.mjs"))];
const printedByName = new Map(PRINTED.map((c) => [c.name, c]));

/* ── the only authored prose in the generated region ──────────────────
   Lifted verbatim from the note, line breaks included, because the note is
   hard-wrapped at 78 and a rewrapped paragraph is a diff nobody asked for.
   Nothing derives these and nothing should: they are the two domains' voices,
   the frame's own note to its reader, and the one glyph the lead tables use. */

const PROSE = {
  void: {
    blurb:
      "*The domain of the void between stars. Those who bear the Star Shard do not\n" +
      "persuade, threaten or overpower — they calculate, and then they remove. Void\n" +
      "offers its wielders the cold certainty that anything which exists can be made\n" +
      "not to.*",
    spellcast: "**Spellcast: Knowledge**",
  },
  root: {
    blurb:
      "*The domain of the sleeping thing below. Those who bear the Root Scar do not\n" +
      "learn their power — it remembers through them. Root offers its wielders the\n" +
      "strength of something that was here first, and asks only that they stop\n" +
      "thinking.*",
    spellcast: "**Spellcast: Instinct**",
  },
  footer:
    "Every number in this table is generated from `src/packs-src/marked-cards.mjs`\n" +
    "in the Foundry system repo, which is where the cards now live. Nothing here is\n" +
    "typed in twice.",
  leadLegend:
    "A ↑ marks a card that beats something printed *above* its own level. Those are\n" +
    "the deck's strongest claims.",
};

/** Void first, because the note reads Void then Root and the mark came first. */
const DOMAINS = ["root", "void"];

/* ── limiters ─────────────────────────────────────────────────────────
   `check-marked.mjs`'s `gated`, widened by the two tolls this frame added
   after it was written (a token spend, and a scene-long limit). The audit
   quotes the same predicate the check enforces, so "20 of 21 gated" in the
   note and a passing check are the same claim.

   `ONCE_PER` is the usage limit and `COSTED` is the toll, and they are counted
   apart rather than together because the single combined predicate hid the one
   distinction these decks turn on. A card limited to one use per rest and a
   card you can fire all night for a Stress apiece are both "gated" and they
   are nothing alike at the table: one is a moment you spend, the other is a
   tap you open. Printed as two counts, a rebalance that moves cards from one
   column to the other shows up in the note — which is exactly what the last
   one did, and the conflated row said almost nothing had changed.

   A card can carry both, so the repeatable count is the cards that carry only
   the toll. The damage-scoped version of the same question — a card that deals
   damage and is not `once per` must scale with Proficiency — stays in
   `check-marked.mjs` where it is enforced, rather than being restated here in
   a second, slightly different form.

   `TOKEN` finds the deck's token card. `check-marked.mjs` holds each deck to
   exactly one, so that row prints a name rather than a count. */

const ONCE_PER = /once per (long |short )?(rest|session|scene)/i;
const COSTED =
  /spend (a|\d+|any number of|up to \d+) hope|mark (a|\d+|any number of|2 or more) stress|spend a token|spend (a|any number of) tokens?/i;
const TOKEN = /place a number of tokens|place a token/i;

/** Rules text with our emphasis removed, so a regex reads words. */
const plain = (c) => String(c.text).replace(/\*\*|__|\*|_/g, "").replace(/\s+/g, " ");

const hasUsageLimit = (c) => ONCE_PER.test(plain(c));
const isRepeatableCosted = (c) => !hasUsageLimit(c) && COSTED.test(plain(c));
const isTokenCard = (c) => TOKEN.test(plain(c));

/* ── rendering a card ─────────────────────────────────────────────────── */

const titleCase = (s) => s[0].toUpperCase() + s.slice(1);

/**
 * `**Name** · Thread · Type · Recall N`.
 *
 * The `-Touched` pair carries `thread: "both"`, and a card that is on both
 * threads is on neither in a way worth printing, so the segment drops out
 * rather than printing the word.
 */
const headerLine = (c) =>
  [`**${c.name}**`, c.thread === "both" ? null : c.thread, titleCase(c.cardType), `Recall ${c.recall}`]
    .filter(Boolean)
    .join(" · ");

/**
 * Card text as a blockquote.
 *
 * Paragraphs are separated by a bare `>` so the quote stays one block in
 * Obsidian; lines *inside* a paragraph keep their own `> ` because that is how
 * the `-Touched` bullet lists are written in the module.
 */
const blockquote = (text) =>
  String(text)
    .trim()
    .split(/\n{2,}/)
    .map((para) => para.split("\n").map((line) => `> ${line}`).join("\n"))
    .join("\n>\n");

/** Level, then alphabetical within a level — the order every printed deck uses. */
const deckOrder = (a, b) => a.level - b.level || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

const deckOf = (domain) => CARDS.filter((c) => c.domain === domain).sort(deckOrder);

const renderDeck = (domain) => {
  const deck = deckOf(domain);
  const out = [`# ${domain.toUpperCase()}`, "", PROSE[domain].blurb, "", PROSE[domain].spellcast];
  let level = 0;
  for (const c of deck) {
    if (c.level !== level) {
      level = c.level;
      out.push("", `## Level ${level}`);
    }
    out.push("", headerLine(c), blockquote(c.text));
  }
  return out.join("\n");
};

/* ── the audit ────────────────────────────────────────────────────────
   One function per row, each taking a deck and returning the cell. Nothing
   below holds a number that was not counted off the array. */

/** `21 (3 at L1, 2 at L2–10)` — run-length encoded, so an uneven deck says so. */
const shape = (deck) => {
  const top = Math.max(...deck.map((c) => c.level));
  const runs = [];
  for (let L = 1; L <= top; L++) {
    const n = deck.filter((c) => c.level === L).length;
    const last = runs.at(-1);
    if (last && last.n === n) last.hi = L;
    else runs.push({ n, lo: L, hi: L });
  }
  const span = (r) => (r.hi > r.lo ? `L${r.lo}–${r.hi}` : `L${r.lo}`);
  return `${deck.length} (${runs.map((r) => `${r.n} at ${span(r)}`).join(", ")})`;
};

/**
 * `10 Unmaking / 10 Calculation / 1 both`.
 *
 * Thread order is first appearance in the deck rather than a list typed here,
 * which is both one fewer thing to keep in step and the order a reader meets
 * them in. `both` is appended rather than discovered so it stays last however
 * low a `-Touched` card is ever printed.
 */
const threadSplit = (deck) => {
  const order = [];
  for (const c of deck) if (c.thread !== "both" && !order.includes(c.thread)) order.push(c.thread);
  if (deck.some((c) => c.thread === "both")) order.push("both");
  return order.map((t) => `${deck.filter((c) => c.thread === t).length} ${t}`).join(" / ");
};

const limitedCell = (deck) => `${deck.filter(hasUsageLimit).length} of ${deck.length}`;

const repeatableCell = (deck) => `${deck.filter(isRepeatableCosted).length} of ${deck.length}`;

/**
 * The deck's token card, by name.
 *
 * A count would be a worse row: the check already holds each deck to exactly
 * one, so the only number this could ever print is 1. Naming it is the fact a
 * reader wants, and if the check ever stops holding — or the detection drifts
 * off the wording — the cell says `—` or lists two instead of quietly
 * reporting a number that is right by construction.
 */
const tokenCell = (deck) => deck.filter(isTokenCard).map((c) => c.name).join(", ") || "—";

/** `R0×1 R1×8 R2×8 R3×2 R4×2`, listing only the costs the deck actually uses. */
const recallSpread = (deck) => {
  const n = new Map();
  for (const c of deck) n.set(c.recall, (n.get(c.recall) ?? 0) + 1);
  return [...n.keys()]
    .sort((a, b) => a - b)
    .map((r) => `R${r}×${n.get(r)}`)
    .join(" ");
};

const averageRecall = (deck) => (deck.reduce((a, c) => a + c.recall, 0) / deck.length).toFixed(2);

const typeSplit = (deck) =>
  `${deck.filter((c) => c.cardType === "ability").length} / ${deck.filter((c) => c.cardType === "spell").length}`;

const AUDIT_ROWS = [
  ["Cards", shape],
  ["Thread split", threadSplit],
  ["Gated — usage limit", limitedCell],
  ["Repeatable — costed, no usage limit", repeatableCell],
  ["Token card", tokenCell],
  ["Recall", recallSpread],
  ["Average Recall", averageRecall],
  ["Abilities / Spells", typeSplit],
];

/**
 * Where Recall 3+ starts, measured rather than asserted.
 *
 * The sentence used to name levels 8–10 flat, which is a claim about the decks
 * printed in a note about the decks — true when written and silently wrong the
 * first time a Recall 3 card moves. Both ends are counted now.
 */
const highRecallSentence = () => {
  const high = CARDS.filter((c) => c.recall >= 3).map((c) => c.level);
  if (!high.length) return "No card in either deck carries Recall 3 or 4.";
  const lo = Math.min(...high);
  const hi = Math.max(...high);
  const span = lo === hi ? `level ${lo}` : `levels ${lo}–${hi}`;
  return `Recall 3 and 4 appear only at ${span}, which matches the printed corpus.`;
};

const renderAudit = () => {
  const decks = DOMAINS.map(deckOf);
  const header = DOMAINS.map(titleCase);
  const lines = [
    "## Deck audit",
    "",
    `| | ${header.join(" | ")} |`,
    `| ${Array(header.length + 1).fill("---").join(" | ")} |`,
    ...AUDIT_ROWS.map(([label, cell]) => `| ${label} | ${decks.map(cell).join(" | ")} |`),
    "",
    highRecallSentence(),
    "",
    PROSE.footer,
  ];
  return lines.join("\n");
};

/* ── the leads ────────────────────────────────────────────────────────
   `marked-leads.mjs` says, per card, what printed card it beats and on which
   axis. This renders it and nothing else does: the note is the only place the
   reasoning is readable, and it regenerates, so there is no second copy to go
   stale the way the hand-typed deck did.

   `check-marked.mjs` already fails the build when a card has no entry and when
   an entry names a card print does not have, so nothing here defends against
   either — a missing lead should be a loud crash, not a quiet dash. */

/** `Vicious Entangle · Sage 2 ↑`, the arrow meaning print puts it above us. */
const beatsCell = (card, lead) => {
  if (!lead.over) return "—";
  const printed = printedByName.get(lead.over);
  const ahead = printed.level > card.level ? " ↑" : "";
  return `${lead.over} · ${titleCase(printed.domain)} ${printed.level}${ahead}`;
};

/**
 * One domain's lead table, then its readings.
 *
 * The `damage` axis is skipped in the prose list on purpose: its claim is
 * arithmetic that `check-marked.mjs` verifies and the deck audit above already
 * shows, so a sentence restating it would be a sentence that can be wrong.
 */
const renderLeads = (domain) => {
  const deck = deckOf(domain);
  const reading = (c) => `- **${c.name}** — ${LEADS[c.name].why}`;
  return [
    `### ${titleCase(domain)}`,
    "",
    "| Level | Card | Axis | Beats |",
    "| --- | --- | --- | --- |",
    ...deck.map((c) => {
      const lead = LEADS[c.name];
      return `| ${c.level} | ${c.name} | ${titleCase(lead.axis)} | ${beatsCell(c, lead)} |`;
    }),
    "",
    ...deck.filter((c) => LEADS[c.name].axis !== "damage").map(reading),
  ].join("\n");
};

const renderLeadSection = () =>
  [
    "## Why each card is worth its level",
    "",
    PROSE.leadLegend,
    "",
    DOMAINS.map(renderLeads).join("\n\n"),
  ].join("\n");

/* ── the region ───────────────────────────────────────────────────────── */

/** Everything between the markers, blank-line padding included. */
const renderRegion = () =>
  `\n\n${[...DOMAINS.map(renderDeck), renderAudit(), renderLeadSection()].join("\n\n---\n\n")}\n\n`;

/* ── diffing ──────────────────────────────────────────────────────────
   A unified-ish view of what the sync would change, because "the note is out
   of date" is not actionable and the whole point of the tool is that nobody
   is reading the note closely. Line-level LCS: the region is a few hundred
   lines, so the table costs nothing and the output stays readable. */

const diffOps = (a, b) => {
  const t = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push([" ", a[i]]);
      i++;
      j++;
    } else if (t[i + 1][j] >= t[i][j + 1]) ops.push(["-", a[i++]]);
    else ops.push(["+", b[j++]]);
  }
  while (i < a.length) ops.push(["-", a[i++]]);
  while (j < b.length) ops.push(["+", b[j++]]);
  return ops;
};

/** Changed lines plus `CONTEXT` either side, coalesced into hunks. */
const CONTEXT = 2;

const hunksOf = (ops) => {
  let an = 1;
  let bn = 1;
  const rows = ops.map(([tag, line]) => {
    const row = { tag, line, a: an, b: bn };
    if (tag !== "+") an++;
    if (tag !== "-") bn++;
    return row;
  });

  const hunks = [];
  for (let k = 0; k < rows.length; k++) {
    if (rows[k].tag === " ") continue;
    const from = Math.max(0, k - CONTEXT);
    let to = k;
    for (;;) {
      let next = to + 1;
      while (next < rows.length && rows[next].tag === " ") next++;
      if (next < rows.length && next - to <= CONTEXT * 2) to = next;
      else break;
    }
    to = Math.min(rows.length - 1, to + CONTEXT);
    hunks.push(rows.slice(from, to + 1));
    k = to;
  }
  return hunks;
};

const printDiff = (before, after) => {
  const hunks = hunksOf(diffOps(before.split("\n"), after.split("\n")));
  console.log(`--- ${NOTE}`);
  console.log(`+++ generated from ${SOURCE}`);
  for (const h of hunks) {
    const olds = h.filter((r) => r.tag !== "+");
    const news = h.filter((r) => r.tag !== "-");
    const range = (rows, side) => `${rows.length ? rows[0][side] : 0},${rows.length}`;
    console.log(`@@ -${range(olds, "a")} +${range(news, "b")} @@`);
    for (const r of h) console.log(`${r.tag}${r.line}`);
  }
  return hunks.length;
};

/* ── main ─────────────────────────────────────────────────────────────── */

const note = await readFile(NOTE, "utf8").catch((err) => {
  console.error(`sync-marked-note: cannot read ${NOTE}\n  ${err.message}`);
  console.error("  set TM_VAULT to the vault root if it has moved.");
  process.exit(1);
});

const opens = note.indexOf(START);
const closes = note.indexOf(END);

if (opens < 0 || closes < 0 || closes < opens) {
  const missing = [opens < 0 && START, closes < 0 && END].filter(Boolean).join(" and ");
  console.error(
    `sync-marked-note: ${NOTE}\n` +
      `  is missing ${missing || `a well-ordered ${START} … ${END} pair`}.\n` +
      "  Nothing was written. The markers delimit the generated region and the\n" +
      "  script will not guess where it starts.",
  );
  process.exit(1);
}

const before = note.slice(opens + START.length, closes);
const after = renderRegion();
const cards = `${CARDS.length} card${CARDS.length === 1 ? "" : "s"}`;

if (before === after) {
  console.log(`sync-marked-note: up to date, ${cards}.`);
  process.exit(0);
}

const changed = printDiff(before, after);
const hunks = `${changed} hunk${changed === 1 ? "" : "s"}`;

if (CHECK) {
  console.error(`\nsync-marked-note: out of date, ${hunks} — run node tools/sync-marked-note.mjs`);
  process.exit(1);
}

await writeFile(NOTE, note.slice(0, opens + START.length) + after + note.slice(closes), "utf8");
console.log(`\nsync-marked-note: updated, ${cards}, ${hunks}.`);
