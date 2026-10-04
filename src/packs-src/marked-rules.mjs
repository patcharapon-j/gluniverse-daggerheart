/**
 * *The Twilight Marked*, as the page a GM opens at the table.
 *
 * `src/module/marked.ts` is the frame's four rules in the form a program can
 * run them, `src/packs-src/marked-cards.mjs` is the forty-two cards, and
 * CLAUDE.md argues both to whoever is about to change them. None of those
 * three is a thing you can hand a table. A frame nobody published has no
 * rulebook, so the rules exist in this repo in exactly two places that a GM
 * can read mid-session — the cards themselves and this — and the cards cannot
 * say what a Mark is.
 *
 * ── why this is not a second copy of CLAUDE.md ────────────────────────
 * CLAUDE.md's Root and Void section and this entry hold the same four rules
 * and are not duplicates of each other, because they answer different
 * questions. CLAUDE.md answers *why the code is shaped like this* — why the
 * Fear is written by the active GM's client, why the toll is observed through
 * one `updateItem` hook rather than instrumented at five call sites, why the
 * Spellcast override is stated and not substituted. Every one of those is a
 * sentence about a design decision, and a GM adjudicating a card at 10pm does
 * not need any of them. This answers *what happens when somebody uses a card*,
 * and it is the only one of the two that has to be legible to a reader with no
 * checkout of the repo.
 *
 * The honest cost of two documents is that they can disagree, and the half of
 * that worth defending is the numbers. `tools/check-marked-rules.mjs` holds
 * them: it imports `marked.ts` and `settings.ts`, runs `markPrice`,
 * `rollOffMark` and the toll's own hook against a stub actor, and fails when
 * the prose below states a cost the code does not charge. The prose is prose
 * and nothing can check that it is *good*; what it cannot do any more is be
 * numerically wrong.
 *
 * ── one entry, six pages ──────────────────────────────────────────────
 * `variant-rules.mjs` is ten entries because there are ten switches and the
 * folder is the join. There is no switch here — the frame is a campaign
 * someone is running or is not, and `system.mark` defaults to zero on every
 * character in a world that never heard of it — so there is nothing for a
 * second entry to be keyed on, and a GM looking for "the Mark rules" wants one
 * document with pages in it rather than six documents in a folder.
 *
 * `sourceKey` is `"marked"` and not the entry's name, which is
 * `variant-rules.mjs`'s departure for its own reason. CLAUDE.md's rule is that
 * renaming a card breaks its links and that this is the honest outcome, and it
 * is honest for a card, because a card's name *is* the card. It is not honest
 * for a reference document a GM may well retitle to "The Twilight Marked
 * (house rules)" the first week they house-rule one of the four.
 *
 * ── what is derived, and why those two things and not the others ──────
 * The deck listings and the automation inventory are **generated from the
 * data**. Everything else on these pages is written.
 *
 * The forty-two cards were rebalanced once already, and the thing that made
 * that expensive was not the cards: it was `References/Root and Void Domains.md`
 * in the campaign vault, which carried all forty-two typed out underneath the
 * prose and went quietly stale the moment a number moved. Nothing read the
 * note, so nothing could notice. `tools/sync-marked-note.mjs` exists because
 * of that, and it is the same lesson arriving one document later: a deck
 * listing a human types is a second source of truth for something that already
 * has one, and the drift is invisible — a card at its old damage reads exactly
 * like a card at its new damage.
 *
 * The automation inventory is derived for a sharper version of the same
 * reason. It is a promise about behaviour: *this card offers you a button and
 * that one does not*. A hand-written list of which cards roll their own damage
 * is a promise that comes apart the first time somebody annotates a card in
 * `card-actions.mjs` and does not think of this file — and the GM who finds
 * out is the one who planned a scene around a press that is not there. So the
 * inventory reads the three automation registries and reports what is actually
 * in them. It cannot be ahead of the data and it cannot be behind it.
 *
 * What is **not** derived is the bucket each card falls into and what the
 * buckets mean. Those are readings, in the sense `card-resources.mjs` uses the
 * word: a program can see that Deep Dreaming carries a counter whose ceiling
 * is a trait, and only a person can say that this makes it a pile you place
 * rather than a budget you spend.
 */

import MARKED from "./marked-cards.mjs";
import PRINTED_CARDS from "./domain-cards.mjs";
import DREAD_CARDS from "./dread-cards.mjs";
import ACTIONS from "./card-actions.mjs";
import DAMAGE from "./card-damage.mjs";
import RESOURCES from "./card-resources.mjs";

/** The printed corpus, which is what any claim about "print" is measured on. */
const PRINTED = [...PRINTED_CARDS, ...DREAD_CARDS];

/* ── the two constructors ─────────────────────────────────────────────
   `variant-rules.mjs`'s pair, and they are copied here rather than moved
   somewhere shared for the reason that file gives for keeping them local: a
   helper with one caller in the file that calls it is easier to read than a
   helper two directories away. Two pack sources is not yet the moment —
   `gunslinger-rules.mjs` is generated and builds its own. If a fourth journal
   ships, that is when these belong in `_helpers.mjs`.

   `text.format` is 1 for HTML. `title.show` is true everywhere, because a
   page in a six-page reference is found by its name. */

/** One page of a journal entry. HTML, headed by its own name. */
const journalPage = (name, content, { level = 1, show = true } = {}) => ({
  name,
  type: "text",
  title: { show, level },
  text: { format: 1, content },
});

/** One journal entry. `sourceKey` rather than the name, for the reason above. */
const journalEntry = (sourceKey, name, pages) => ({ sourceKey, name, pages });

/* ── rendering a card's own text ──────────────────────────────────────
   The cards are authored in the small markdown the whole repo writes rules
   text in — `**` for the numbers and the named rolls, `_` for a condition,
   a blank line for a paragraph, `- ` for the two cards that print a list —
   and a journal page is HTML. So this is the one translation in the file.

   Escaped first and unconditionally. No card currently contains `&`, `<` or
   `>`, which is exactly the situation in which an unescaped renderer looks
   correct forever and then breaks the page the week somebody writes "damage
   > your thresholds". Nothing downstream of here validates this markup —
   `compilePack` writes whatever string it is handed — so the escape is the
   only thing standing between a card's text and the document around it.

   Every `_italic_` in all forty-two cards is a condition name, and
   `check-marked.mjs` is what keeps that true: it fails a card naming one
   `config.ts` does not register. So the emphasis carries `dh-condition`,
   which makes the claim visible to a reader and checkable here — see
   `tools/check-marked-rules.mjs`, which reads every one of these spans back
   against the registered set. */

const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const inline = (s) =>
  escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, '<em class="dh-condition">$1</em>');

/** A card's rules text as HTML: paragraphs, and lists where it prints one. */
function cardText(text) {
  const blocks = String(text)
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim());
      if (lines.every((l) => l.startsWith("- "))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join("")}</ul>`;
      }
      return `<p>${inline(lines.join(" "))}</p>`;
    })
    .join("");
}

/* ── the deck listings ────────────────────────────────────────────────
   One table per deck, in the module's own order — by level, then alphabetical
   within a level, which is what all eleven other decks do. The level is a
   column rather than a row of sub-headings because a GM reads this looking for
   one card, and a flat table is one Ctrl-F.

   `thread` is the only column here that is not on the printed face of a card.
   It is the campaign's own axis, it is why the two decks do not read as
   recoloured printed domains, and it is a fact about the card that the card
   itself does not state — which makes a listing the one place it can be
   read. */
function deckTable(domain) {
  const cards = MARKED.filter((c) => c.domain === domain);
  const rows = cards
    .map(
      (c) =>
        `<tr><td>${c.level}</td><td><strong>${escapeHtml(c.name)}</strong></td>` +
        `<td>${escapeHtml(c.thread)}</td><td>${escapeHtml(c.cardType)}</td>` +
        `<td>${c.recall}</td><td>${cardText(c.text)}</td></tr>`,
    )
    .join("\n");

  const label = domain[0].toUpperCase() + domain.slice(1);
  return `<table>
<caption>The ${label} Deck</caption>
<thead><tr><th>Lvl</th><th>Card</th><th>Thread</th><th>Type</th><th>Recall</th><th>Text</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`;
}

/* ── the automation inventory ─────────────────────────────────────────
   Four questions asked of the three registries, one card at a time.

   The keys are `domainCard:<name>` in all three, which is the one thing that
   makes this derivation possible at all: a card's name is its join to its
   automation, so a card renamed in `marked-cards.mjs` without its annotations
   following loses them, and this page says so by showing the card with nothing
   against it.

   `RESOURCES` needs the reading rather than the lookup. Almost every marked
   entry in it is a **use budget** — `once("longRest")`, derived from the words
   on the card — and exactly two are **token piles**, which is a different
   thing at the table: a budget arrives full and you spend it down, a pile
   arrives empty and you place tokens on it. `card-resources.mjs` draws that
   line with `onRefresh` and with the counter's own name, and the name is what
   is read here because it is the word the sheet prints beside the boxes. */

const key = (c) => `domainCard:${c.name}`;
const counters = (c) => RESOURCES[key(c)] ?? [];
const isPile = (r) => !["Use", "Uses"].includes(r.name);

const presses = (c) => {
  const entry = ACTIONS[key(c)];
  if (!entry) return [];
  const own = entry.actions ?? [];
  const onFeatures = Object.values(entry.features ?? {}).flat();
  return [...new Set([...own, ...onFeatures].map((a) => a.kind))].sort();
};

const inventoryRow = (c) => {
  const kinds = presses(c);
  const pile = counters(c).find(isPile);
  const budget = counters(c).find((r) => !isPile(r));
  return (
    `<tr><td>${escapeHtml(c.name)}</td><td>${c.domain === "root" ? "Root" : "Void"} ${c.level}</td>` +
    `<td>${kinds.length ? kinds.map((k) => `<code>${k}</code>`).join(" ") : "—"}</td>` +
    `<td>${DAMAGE[key(c)] ? "yes" : "—"}</td>` +
    `<td>${pile ? `pile · ${escapeHtml(pile.said)}` : budget ? escapeHtml(budget.said) : "—"}</td></tr>`
  );
};

/* Root then Void, which is `config.ts`'s `MARKED_DOMAINS`, the compendium's
   folder order and this entry's own page order. `MARKED` itself arrives Void
   first because that is how `marked-cards.mjs` is authored, and `domains.mjs`
   is where that is reordered for the pack — so it is reordered here too, or
   this table would be the one surface in the system still reading the other
   way round. */
const inDeckOrder = ["root", "void"].flatMap((d) => MARKED.filter((c) => c.domain === d));

const inventoryTable = () => `<table>
<caption>What Each Card's Posted Card Offers</caption>
<thead><tr><th>Card</th><th>Deck</th><th>Presses</th><th>Damage</th><th>Counter</th></tr></thead>
<tbody>
${inDeckOrder.map(inventoryRow).join("\n")}
</tbody>
</table>`;

/** The cards whose posted card offers nothing but the Use press. */
const adjudicationOnly = () =>
  MARKED.filter((c) => !presses(c).length && !DAMAGE[key(c)]);

/** The two piles, named, because they are the two the sheet draws boxes for. */
const piles = () => MARKED.filter((c) => counters(c).some(isPile));

/** Cards offering one named press. Counted rather than typed, for the reason
    the whole page is derived: "four cards apply a condition" is exactly the
    sentence that is true when written and quietly false a month later. */
const offering = (kind) => MARKED.filter((c) => presses(c).includes(kind));

const nameList = (cards) =>
  cards.map((c) => `<strong>${escapeHtml(c.name)}</strong>`).join(", ");

/* ── Void's signature, measured on both sides of the comparison ───────
   The Void page's claim is comparative — the deck reaches into the GM's Fear
   pool far more often than print does — and a comparative claim has one
   failure mode worth engineering against: counting one thing on our side and
   a different thing on print's. A sentence saying "four printed cards" where
   four means the movers, beside "four Void cards" where four means the
   readers, makes a density ratio out of nothing, and it reads perfectly.

   So the predicate is one list applied to both corpora, and it is **exported**
   so that `tools/check-marked-rules.mjs` can hold the set it selects as a
   named two-way ratchet rather than re-deriving it with a second copy of these
   regexes. That is `check-marked.mjs`'s `AHEAD` shape: a card entering or
   leaving the set fails the build, because the only thing that can decide
   whether a new card belongs in a reading is a person.

   "Engages the pool" means the pool as a **quantity**: takes Fear out of it,
   puts Fear into it, stops a gain reaching it, or reads its size. The two
   idioms it deliberately excludes are the ones that make the word "Fear"
   common without the pool being touched — the duality dice ("roll with Fear",
   "your Fear Die"), and the duration idiom ("until the GM spends a Fear on
   their turn"), which is the GM's own move and sits on a dozen printed
   cards. */
/** Takes Fear *out* of the pool. The narrowest and least arguable reading,
    and the one `check-marked.mjs` already enforces as `takesFear`. */
const OUT_PHRASES = [/\b(?:remove|steal|loses?)\s+(?:a|\d+|any number of|a number of)\s+Fear/i];

/** Engages the pool at all: takes out, puts in, blocks a gain, reads its size. */
const POOL_PHRASES = [
  ...OUT_PHRASES,
  /GM (?:gains?|would gain) (?:a|\d+) Fear/i,
  /(?:doesn[’']t|does not|prevent the GM from) gain(?:ing)? a Fear/i,
  /number of Fear in the GM[’']s (?:pool|Fear Pool)/i,
  /for each Fear in the GM[’']s pool/i,
];

/** Rules text with our emphasis off, so a regex reads words. */
const spoken = (c) => String(c.text).replace(/\*\*|__|\*|_/g, "").replace(/\s+/g, " ");

const matching = (phrases) => (cards) =>
  cards.filter((c) => phrases.some((r) => r.test(spoken(c))));

/** Exported so the check can ratchet the sets rather than copy the regexes. */
export const takesFear = matching(OUT_PHRASES);
export const poolCards = matching(POOL_PHRASES);

const voidCards = MARKED.filter((c) => c.domain === "void");

/** Both readings, applied to both corpora. Nothing here is typed in. */
export const POOL_COUNTS = {
  printedOut: takesFear(PRINTED).length,
  printedAny: poolCards(PRINTED).length,
  printedOf: PRINTED.length,
  voidOut: takesFear(voidCards).length,
  voidAny: poolCards(voidCards).length,
  voidOf: voidCards.length,
};

/* What a refresh scope is called in a sentence. A label table and therefore a
   reading, in the sense this file's header draws the line: `card-resources.mjs`
   keys the scope as `longRest` and only a person can decide that the English
   for it, in the middle of a sentence about a pile, is "every long rest". */
const REFRESH_WORDS = {
  session: "every session",
  scene: "every scene",
  rest: "every rest",
  shortRest: "every short rest",
  longRest: "every long rest",
  manual: "only by hand",
};

/** One pile, with the words it was read from and what happens to it at a rest. */
function pileLine(card) {
  const pile = counters(card).find(isPile);
  const when = REFRESH_WORDS[pile.refresh] ?? pile.refresh;
  return (
    `<li><strong>${escapeHtml(card.name)}</strong> — ${escapeHtml(pile.said)}. ` +
    `${pile.onRefresh === "fill" ? "Refilled" : "Emptied"} ${when}.</li>`
  );
}

/* ── the scope statement ──────────────────────────────────────────────
   `variant-rules.mjs` opens every entry with one and it says the same thing
   ten times: none of this is wired up, it is all yours. This frame cannot
   borrow that sentence, because half of it *is* wired up — the Mark, the
   Fear, the toll and the long-rest roll all write to sheets without being
   asked — and a scope statement that understates what runs is as misleading as
   one that overstates it. A GM who believes the toll is theirs to track will
   charge it twice.

   So this one is a split rather than a disclaimer, and it points at the page
   that holds the full inventory instead of summarising it here, because a
   summary of a derived list is an underived copy of it. */
const SCOPE = `
<section class="dh-marked-scope">
<p><strong>Some of this frame runs itself and some of it is yours.</strong>
The Mark, the Fear a use costs, the Stress for holding both decks and the
long-rest roll are all applied by the system — you do not track them, and you
should not charge them a second time by hand. Everything a card's own text
asks for beyond that is adjudication: conditions, durations, terrain, what a
successful Spellcast Roll actually accomplishes in the fiction.</p>
<p>The page <em>What Runs and What You Adjudicate</em> is the full inventory,
card by card, and it is generated from the system's own automation data rather
than written down — so it is what the build actually ships, not a description
of it.</p>
</section>`;

/* ═══════════════════════════════════════════════════════════════════════
   THE PAGES
   ═══════════════════════════════════════════════════════════════════════ */

const theFrame = journalPage(
  "The Frame",
  `${SCOPE}
<p><em>The Twilight Marked</em> adds two domains to Daggerheart: <strong>Root</strong>
and <strong>Void</strong>. Twenty-one cards each, forty-two in all, shaped like
printed domain cards and found in the <strong>Domain Cards</strong> compendium
beside the ten the book publishes.</p>
<p><strong>Nobody's class carries them.</strong> That is the whole of what makes
them different as objects. A Guardian gets Valor and Blade; a Wizard gets Codex
and Splendor; and every Batch 47 character gets Root and Void <em>on top of</em>
the two their class gives them, in their vault, from session one. There is no
subclass to take and no advancement to spend. You have both decks because of
what was done to you.</p>
<p>What that costs is the rest of this document. The short version: the printed
domains are free to use and these are not. Every single use of a Root or Void
card gains you a Mark and hands the GM a Fear, and the Mark is cleared by a roll
you make at the end of every long rest and may well fail.</p>
<h2>Where everything is</h2>
<ul>
<li><strong>The cards</strong> — the <em>Domain Cards</em> compendium, in the
<em>Root</em> and <em>Void</em> folders, after the ten printed decks. They carry
<code>TM·ROOT</code> and <code>TM·VOID</code> in the footer where a printed card
carries its card number, because nobody printed these and a card number would be
a lie.</li>
<li><strong>Mark and Surging</strong> — two fields on a character, and the only
campaign-frame state on the sheet. Both are zero and false on a character who
has never touched a marked card, which is every character at a table not running
this frame.</li>
<li><strong>The rules</strong> — the next page, and the one after it is how they
reach the table in Foundry.</li>
</ul>
<h2>What a Mark is, in the fiction</h2>
<p>Mark is not a resource you spend. It is how much of the thing that marked you
is currently awake, it only ever goes up during a session, and the only thing
that brings it down is the roll at the end of a long rest. Nothing in the system
caps it. A character who spends a whole session reaching for both decks arrives
at that roll with a Difficulty nobody beats, and that is the frame working
rather than the frame being unfair — it is the cost of the power showing up on
the schedule the frame promised it would.</p>`,
);

const theFourRules = journalPage(
  "The Four Rules",
  `<p>Four, and they are short enough to read out at session zero.</p>
<h2>1 · Using a card costs</h2>
<p>When you use a Root or Void card, you gain <strong>1 Mark and the GM gains
1 Fear</strong>. Neither half is optional and neither is a choice you make after
seeing the result.</p>
<p>Three cases the rule calls out, because they are the three people argue
about:</p>
<ul>
<li><strong>A reaction counts.</strong> Using a card outside your spotlight is
still using it.</li>
<li><strong>A second activation counts.</strong> Two uses in one scene is two
Marks and two Fear.</li>
<li><strong>A use that failed counts.</strong> You reached for it. The roll
missing is the card's problem and not the mark's.</li>
</ul>
<p><strong>The Fear pool caps at 12, and a full pool does not make the deck
free.</strong> Fear the pool has no room for lands on you as Stress instead, one
for one. So a use at a full pool costs 1 Mark and 1 Stress, and if you cannot
pay that Stress the use is refused rather than half-applied.</p>
<p><strong>Two cards cost triple.</strong> <em>The Answer</em> and <em>No More
Waiting</em> buy you an additional action, and they charge <strong>3 Mark and 3
Fear</strong> rather than 1. They are the strongest thing either deck can do and
charging them a single Fear would make the biggest effect in the frame the
cheapest per unit of what it does. The same overflow rule applies: three Fear
against a pool with one space is 1 Fear and 2 Stress.</p>
<p><strong>While <em>Surging</em>, the Fear doubles.</strong> Not the Mark — the
Fear. A use costs 1 Mark and 2 Fear, and one of those level 10 cards costs 3 Mark
and 6 Fear. See rule 2 for where <em>Surging</em> comes from.</p>
<h2>2 · The Mark is rolled off at every long rest</h2>
<p>At the end of every long rest, a character with any Mark at all rolls it off.
It is a duality roll against <strong>Difficulty 8 + your Mark</strong>, with
<strong>no trait</strong> — resisting your own mark is not something anybody is
good at.</p>
<p>Before the dice, you may <strong>lower the Difficulty by 2 for each Stress
you mark</strong>. That decision is made at the table and the Stress is spent
either way: you bought better odds, not a result. The buy-down is clamped to the
Stress you actually have free rather than refused, so a rest never ends in an
argument about whether you could afford it.</p>
<p><strong>The Mark clears either way, win or lose.</strong> This is per-session
pressure and not a death spiral. What the two outcomes differ by is what you
keep:</p>
<ul>
<li><strong>Success</strong> — Mark to zero, and nothing else.</li>
<li><strong>Failure</strong> — Mark to zero, it costs you 2 Stress <em>that this
rest does not clear</em>, and you are <em>Surging</em> until your next long rest,
which doubles the Fear every marked card costs.</li>
</ul>
<p>The roll is a duality roll like any other, so a Fear result on it gives the GM
a Fear through the ordinary route, on top of whatever the cards cost during the
session that led to it.</p>
<h2>3 · The two marks fight</h2>
<p>Holding a Root card and a Void card in the <strong>same loadout</strong>
costs 1 Stress on arrival — charged when the second of the two lands, not on
every marked card after it — and 1 more Stress at the end of every long rest for
as long as the pair is still there.</p>
<p>It is a toll on <em>holding</em> both, so a third or fourth card joining a
loadout that already holds one of each changes nothing. Moving a card out of the
loadout and back in charges again, because you were not holding the pair in
between.</p>
<p>Both decks in your vault is free. The vault is not the loadout.</p>
<h2>4 · The mark is the casting organ</h2>
<p>A <strong>Root card casts with Instinct</strong> and a <strong>Void card
casts with Knowledge</strong>, whatever the character's own Spellcast trait is —
or whether they have one at all. A Warrior with no spellcasting subclass casts
these cards exactly as well as a Wizard does, because it is not their training
doing it.</p>
<p>This one is stated rather than enforced, and the distinction matters in play:
if you roll a Spellcast Roll for a marked card from the trait plates on your own
sheet, nothing stops you rolling the wrong trait. The roll button on the posted
card itself does use the right one. See the next page.</p>`,
);

const inFoundry = journalPage(
  "Using the Deck in Foundry",
  `<p>What a player presses, and what a GM sees when they press it.</p>
<h2>Posting a card is not using it</h2>
<p>Clicking a Root or Void card on your sheet <strong>posts</strong> it to chat.
That is all it does. You show a card to argue about what it says at least as
often as you play it, so posting charges nothing.</p>
<p>The posted card carries a button at the head of its action row:
<strong>Use · Mark</strong>, or <strong>Use · 3 Mark</strong> on the two cards
that cost triple. <em>That</em> is the use. It sits first in the row because it
is the one action there that is not optional.</p>
<p>Pressing it does three things:</p>
<ul>
<li>Writes the Mark onto your sheet.</li>
<li>Leaves the Fear for the GM — see below.</li>
<li>Marks any Stress the Fear pool had no room for, and refuses the whole press
if you cannot pay it. Nothing is half-applied.</li>
</ul>
<p>The notification afterwards says which it was, because the button cannot: how
much of the cost lands as Fear and how much as Stress depends on the pool at the
moment of the press, and a label written when the card was posted would be
quoting a price that has since moved.</p>
<p><strong>One press per posted card.</strong> The button claims itself. A use
taken on one player's client is taken on every other client and stays taken
after a reload, so the same posted message cannot be used twice by two people
who both thought it was theirs. Use the card again and you post it again — which
is correct, because a second activation is a second Mark and a second Fear.</p>
<h2>Who writes the Fear</h2>
<p>The GM's client does. A player cannot write a world setting, so the press
leaves a note on the chat message and the <strong>active GM's</strong> client
answers it the moment the note lands. One nominated writer, so a table of five
does not add five Fear for one press.</p>
<p><strong>With no GM connected, the Fear is not paid.</strong> The note is
answered as it arrives rather than looked for later, so a use pressed while
nobody is GMing leaves a Mark on the player and nothing in the pool. It is the
honest behaviour — nothing is going to invent a Fear on a client that has no
right to write one — but it is worth knowing if your GM's connection drops
mid-fight. Add it by hand afterwards.</p>
<p>From the GM's side there is nothing to do: the pool moves on its own and the
player's notification already said what it was going to cost. The only thing
worth watching is the Stress line — a player paying Stress instead of Fear is
telling you the pool is full.</p>
<h2>The loadout toll</h2>
<p>Nothing to press. Move a card into your loadout by any route — the recall
button, dragging it between the two lists, dragging it in from the compendium,
the item sheet's own checkbox, a macro — and if that card completes a Root/Void
pair, the Stress is marked. One of your clients does it, not all of them, so an
actor two people have open is still charged once.</p>
<p>If you have no free Stress the toll is <em>not</em> charged and you get a
warning saying so. The card still moves. That is a ruling the table has to make
rather than a thing the system decides for you.</p>
<h2>The long rest</h2>
<p>Both long-rest rules run when you finish a long rest, after the rest's own
card has posted and after it has finished giving Stress and Hit Points back —
which is deliberate, because the Stress these two charge is Stress the rest is
explicitly not clearing.</p>
<ul>
<li><strong>The upkeep</strong> is charged silently if your loadout still holds
both decks.</li>
<li><strong>The roll</strong> posts a duality plate of its own, labelled
<em>The Mark</em>, against its Difficulty and with no trait on it.</li>
</ul>
<p>Neither is offered as a downtime move, because neither is a choice. They do
not appear at all for a character with no Mark and no marked cards, which is
every character at a table not running this frame.</p>
<p><strong>The buy-down has no control on the sheet yet.</strong> The rest
dialog does not ask, so the roll it runs is the roll at full Difficulty. A table
that wants rule 2's buy-down makes it in a macro:</p>
<p><code>game.daggerheart.marked.roll(actor, 2)</code> — roll off the Mark
having marked 2 Stress to lower the Difficulty by 4.</p>
<p>The same object holds the rest of the frame's seams, for a GM who needs to
mark somebody mid-session or take a mark back off:</p>
<ul>
<li><code>game.daggerheart.marked.is(actor)</code> — is this character carrying
either deck at all.</li>
<li><code>game.daggerheart.marked.upkeep(actor)</code> — charge the loadout
upkeep by hand.</li>
<li><code>game.daggerheart.marked.clear(actor)</code> — Mark to zero and
<em>Surging</em> off, with no roll.</li>
<li><code>game.daggerheart.marked.spellcast("root")</code> — which trait a deck
casts with.</li>
</ul>
<h2>Rolling a marked card's Spellcast Roll</h2>
<p>Press the roll button <strong>on the posted card</strong> and you get the
right trait: Instinct for Root, Knowledge for Void, whatever your sheet says
your Spellcast trait is. The card you are looking at is the thing naming the
trait, so reading your sheet instead would be the system overruling the card in
your hand.</p>
<p>Roll from a trait plate on your own sheet and you get that trait, because
that is the plate you pressed. The system does not reach into a roll you started
somewhere else and silently swap the trait under it — the first time it got that
wrong, nobody would be able to see why. Rule 4 is yours to apply.</p>`,
);

const whatRuns = journalPage(
  "What Runs and What You Adjudicate",
  `<p><strong>This page is generated from the system's own automation data.</strong>
It is not a description of what the cards do — it is a readout of what is
actually in the build, so it cannot be ahead of the cards or behind them.</p>
<h2>What always runs, on every card in both decks</h2>
<ul>
<li>The <strong>Use</strong> press, and everything rule 1 charges: the Mark, the
Fear, the Stress overflow at a full pool, the doubling while
<em>Surging</em>.</li>
<li>The <strong>loadout toll</strong>, on arrival and at every long rest.</li>
<li>The <strong>long-rest roll</strong>, including clearing the Mark and setting
<em>Surging</em> on a failure.</li>
</ul>
<p>None of those three is annotated per card. They are the frame rather than
anything printed on a card, which is why they are there on all forty-two whether
a card has been read for automation or not.</p>
<h2>What never runs, on any card</h2>
<ul>
<li><strong>Applying a condition.</strong> ${offering("apply-condition").length}
cards offer a press that puts one on somebody, and it is a press — never
automatic. A card naming <em class="dh-condition">Restrained</em> does not
restrain anything until a hand decides it does.</li>
<li><strong>Rule 4 away from the card.</strong> See the previous page.</li>
<li><strong>Anything a card's text describes rather than counts.</strong>
Terrain that stays changed, a zone where magic stops working, what a creature
remembers. Those are the cards doing their job and there is nothing to
automate.</li>
</ul>
<h2>Card by card</h2>
<p>The <em>Presses</em> column names the action kinds the posted card carries,
in the system's own vocabulary — the kinds the Automation editor on a card's
own sheet edits. <code>roll-trait</code> asks for a roll,
<code>roll-card-damage</code> throws the damage the card prints, <code>pay</code>
charges a cost the card names, <code>apply-condition</code> offers a condition,
<code>gain</code> and <code>clear</code> move Hope or marks. A dash means the
posted card offers nothing but the Use press.</p>
<p>The <em>Counter</em> column is either a use limit the card prints or, on the
two cards that have one, a pile of tokens you place.</p>
${inventoryTable()}
<h2>The two token piles</h2>
<p>Two cards carry tokens you place rather than a use you spend, and they are
the only two in either deck:</p>
<ul>
${piles().map(pileLine).join("\n")}
</ul>
<p>Neither ceiling is a number this system can work out in advance — one is the
size of the GM's Fear pool at the moment the session starts and the other is a
trait — so the sheet draws the boxes and counts them down, and the rest is
yours. What a token <em>buys</em> is on the card.</p>
<h2>The cards that are entirely yours</h2>
<p>${adjudicationOnly().length} of the 42 offer no press at all beyond the Use
button: ${nameList(adjudicationOnly())}. Each is a standing rule rather than an
act — a loadout condition, a passive, an extra action the frame prices and the
table adjudicates. There is nothing missing here; there is nothing a button
could usefully do.</p>`,
);

const rootDeck = journalPage(
  "Root",
  `<p><em>The domain of the sleeping thing below.</em></p>
<p><strong>Spellcast trait: Instinct.</strong> Every card on this page casts
with Instinct, whatever your sheet says.</p>
<h2>What the deck owns</h2>
<p><strong>Root converts harm into fuel.</strong> That is the mechanical
signature, and it is the thing to look for when you are deciding whether a Root
card is working. Feed turns a Melee hit into a cleared Hit Point and a Hope;
Apex pays a Hit Point per kill; Barkskin and The Beast buy scene-long force with
Stress up front; the World Tree empties the whole party's sheet once. Where a
printed domain would charge you for power, Root takes damage already done and
gives it back as something else.</p>
<h2>The two threads</h2>
<ul>
<li><strong>Hunger</strong> — claws, bark and fire that hunts. One appetite in
three shapes, and where the deck turns harm into fuel.</li>
<li><strong>The Dreaming Root</strong> — the Undergrowth's memory leaking up.
Unclaimed by any printed domain: nothing in the book reads the land's
recollection of what happened on it.</li>
</ul>
<h2>The deck</h2>
${deckTable("root")}`,
);

const voidDeck = journalPage(
  "Void",
  `<p><em>The domain of the void between stars.</em></p>
<p><strong>Spellcast trait: Knowledge.</strong> Every card on this page casts
with Knowledge, whatever your sheet says.</p>
<h2>What the deck owns</h2>
<p><strong>Void takes Fear out of the GM's pool.</strong> Reckoning buys one
back for a Stress, Geometry of Ruin takes one out for every target that fails,
and Cold Solution sizes its tokens off whatever is left in it.
${POOL_COUNTS.voidOut} cards of ${POOL_COUNTS.voidOf} take Fear out of the pool
where the printed corpus does it on ${POOL_COUNTS.printedOut} of
${POOL_COUNTS.printedOf}. Widen it to every card that engages the pool at all —
takes from it, adds to it, blocks a gain, or reads its size — and it is
${POOL_COUNTS.voidAny} of ${POOL_COUNTS.voidOf} against
${POOL_COUNTS.printedAny} of ${POOL_COUNTS.printedOf}.</p>
<p>Both numbers are counted the same way on both sides, which is the only thing
that makes the comparison mean anything: cards that merely say "roll with Fear"
or that wait for the GM to spend one on their turn are in neither figure, on
either side. That is what it means to say a Void player is making decisions
about the GM's economy and not only their own — you will be watching the Fear
counter the way other players watch their own Hope.</p>
<h2>The two threads</h2>
<ul>
<li><strong>Unmaking</strong> — ends, suppresses, erases and folds space. Ground
no printed domain holds, and deliberately kept off Dread's: Dread frightens you
where this solves you.</li>
<li><strong>Calculation</strong> — force and minds as systems to be acted on
from a distance, and where the deck reaches into the Fear pool.</li>
</ul>
<h2>The deck</h2>
${deckTable("void")}`,
);

export default [
  journalEntry("marked", "The Twilight Marked", [
    theFrame,
    theFourRules,
    inFoundry,
    whatRuns,
    /* Root before Void, which is `config.ts`'s `MARKED_DOMAINS` order, the
       compendium's folder order, the campaign vault note's order and the
       campaign's own name. Those four used to disagree with the built pack,
       because `marked-cards.mjs` authors Void first and `domains.mjs` merely
       concatenated it; `domains.mjs` orders the decks now, so there is one
       order and a GM reading this page is looking at the same sequence in the
       folder list on the other side of the screen. */
    rootDeck,
    voidDeck,
  ]),
];
