/**
 * Resting.
 *
 * A rest is the one part of this game that is entirely bookkeeping and
 * entirely forgotten: two downtime moves each, a die per move on a short rest,
 * armour repaired, Stress cleared, and a vault swap that is free while it
 * lasts. Until recently the whole of it on this sheet was a checkbox on the
 * vault tab that changed the price of a swap — which is to say the sheet knew
 * a rest was happening and did none of it.
 *
 * Six things about the shape here are decisions rather than defaults.
 *
 * **A move is taken, not ticked.** This was a form: check the moves, press OK,
 * everything happens at once. That is the wrong model for downtime and it was
 * wrong in a way you only notice at a table — *Tend to Wounds rolls a die*,
 * and what you do next depends on what it gave you. Clearing two Hit Points
 * when you needed five is exactly the moment you decide to spend your second
 * move on wounds again rather than on armour, and a form that resolves
 * everything on OK makes that decision blind. So each move is pressed, it
 * rolls and applies the instant it is pressed, and the sheet underneath moves
 * while you are still deciding.
 *
 * That also makes **the same move twice** free rather than a special case. A
 * checkbox can only be on or off; a button can be pressed again, which is what
 * the rules allow and what the table does.
 *
 * **A move is a square.** It was a landscape card — art plate, gold seam,
 * display name, rule, footer, tier bar — as a sibling of `.tile` rather than
 * an instance of it, because a tile is built from a domain, a sigil and a
 * level and a downtime move has none of the three. That argument still holds
 * and the *shape* was still wrong: four cards at 104px, stacked, is four
 * hundred and fifty pixels of dialog spent before the first press, and
 * everything a rest is actually about — the ledger, the tally, the cards that
 * change the rest — was under the fold behind it. So the deck is a row of
 * squares, one track per move, and costs about what one card did. The rule
 * swaps in over the name on hover, because a square this wide can hold either
 * at a readable size but not both. See `.dtm .dt` in `design/dlg.css`.
 *
 * **The value rolls in the plate**, where the card carried its artwork. It
 * used to be a die: `plate.css`'s silhouette carrying the face, and with Dice
 * So Nice installed a real three-dimensional one, posed and spun in the tray
 * by a second `DiceBox` over a second `DiceFactory` with a generated table of
 * face normals behind it. The square retired both. A die small enough to sit
 * in a hundred-pixel tile is a chip with a numeral on it — the geometry that
 * made it a die is below the resolution of the box — and a WebGL context is a
 * great deal of machinery to put behind a numeral nobody watches land.
 *
 * So the number itself moves: a reel of candidates scrolling to a stop, which
 * is what a number looks like before it settles. That also dissolves the
 * face-versus-total rule rather than answering it — a die showing 6 on a d4 is
 * a die lying about what it is, and a reel is not a d4 and claims nothing, so
 * it lands on the *total* and the caption says where the total came from. It
 * is still a real `Roll`: the dice log and the seeded randomness are unchanged
 * and only the drawing is ours.
 *
 * **Every move can be taken back.** Applying on the press is what makes the
 * second move an informed choice; it is also what makes a misclick a fact
 * about your character. So each ledger entry carries what it actually did —
 * the Hit Points that were really cleared, not the ones the die asked for —
 * and an undo that gives back exactly that. Per entry rather than "undo the
 * last", because a rest is two or three moves and the one you want back is not
 * reliably the newest. Nothing has been posted at that point: "Done" writes
 * one card for the whole rest, so an undo has only actor state and this
 * dialog's own ledger to reverse.
 *
 * **Two is a suggestion, and the sheet works out whose suggestion.** The rules
 * say two moves; a Celestial Trance says three. `restAllowance` reads that off
 * the cards this character is holding, the panel underneath *draws* those
 * cards, and nothing anywhere enforces the number — a campaign frame, a GM
 * ruling and a long-term project all move it, and a dialog that refused a
 * third move would send the table to do the whole rest by hand.
 *
 * **Nothing else is guessed, and it is said in two voices.** Anything on this
 * character that mentions a rest is listed underneath, verbatim. But two
 * different facts were wearing that one shape: Celestial Trance *changes the
 * rest* and you have to read it to use it, while Deft Maneuvers says "once per
 * rest", which only means the rest gives it back. Both mention resting; one is
 * a decision and the other is a receipt. So the first keeps the card and the
 * second gets a line with the rule a hover away — `refreshing` below, and the
 * `.rf` lane in `rule-cards.ts`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "../config.ts";
import { DIE } from "../dice/plate.ts";
import { REST_RX, type Rule, rechargeOnly, rulesAbout, rulesOf } from "./rules.ts";
import {
  type RefreshRow,
  type RuleCard,
  merge,
  ruleCardsPanel,
  wireRulePeeks,
} from "./rule-cards.ts";
import { plain } from "../sheets/cards.ts";
import { dhDialog } from "./dialog.ts";

const esc = (s: string) => foundry.utils.escapeHTML(s);

export type RestKind = "short" | "long";

interface Move {
  id: string;
  name: string;
  /** What it does, in one line. */
  text: string;
  /** A short rest's moves roll `1d4 + Tier`; a long rest's are absolute. */
  roll?: boolean;
  /**
   * What the card's plate shows when there is no die to roll, and the caption
   * under it. A long rest clears everything and Prepare gives one Hope: those
   * are known before you press, so the plate states them. The plate is the
   * move's value either way — rolling is only how an unknown one becomes
   * known.
   */
  fx?: string;
  cap?: string;
}

/**
 * The printed downtime moves.
 *
 * Tend to Wounds names *a* creature rather than you, because it may be spent
 * on an ally — the sheet applies it here and the card says who, which is the
 * honest half of a move whose target is a conversation.
 */
const MOVES: Record<RestKind, Move[]> = {
  short: [
    { id: "wounds", name: "Tend to Wounds", text: "Clear 1d4 + Tier Hit Points.", roll: true },
    { id: "stress", name: "Clear Stress", text: "Clear 1d4 + Tier Stress.", roll: true },
    { id: "armor", name: "Repair Armor", text: "Clear 1d4 + Tier Armor Slots.", roll: true },
    {
      id: "prepare",
      name: "Prepare",
      text: "Gain a Hope. With one or more party members, gain 2 Hope each.",
      fx: "+1",
      cap: "hope",
    },
  ],
  long: [
    { id: "wounds", name: "Tend to All Wounds", text: "Clear all Hit Points.", fx: "all", cap: "hit points" },
    { id: "stress", name: "Clear All Stress", text: "Clear all Stress.", fx: "all", cap: "stress" },
    { id: "armor", name: "Repair All Armor", text: "Clear all Armor Slots.", fx: "all", cap: "armor slots" },
    {
      id: "prepare",
      name: "Prepare",
      text: "Gain a Hope. With one or more party members, gain 2 Hope each.",
      fx: "+1",
      cap: "hope",
    },
    {
      id: "project",
      name: "Work on a Project",
      text: "Start or continue a long-term project with the GM.",
      fx: "—",
      cap: "with the GM",
    },
  ],
};

const KIND_LABEL: Record<RestKind, string> = { short: "Short Rest", long: "Long Rest" };

/* ── how many moves ────────────────────────────────────────────────────
   Two, until one of your own cards says otherwise.

   This is the one piece of rules-reading in the file and it is deliberately
   shallow: it looks for the two shapes the printed cards actually use and
   ignores everything else. A miss costs the *number in a hint line* — the
   dialog does not enforce it and the rule is printed verbatim underneath
   either way — which is the whole reason it is safe to guess at all. Parsing
   English into behaviour is how a system starts quietly getting rules wrong;
   parsing English into a suggestion is a different bet with a different price.

   Celestial Trance is the case it exists for: "you can drop into a trance to
   choose an additional downtime move." */

/** The printed number. */
export const REST_MOVES = 2;

const WORD: Record<string, number> = {
  a: 1, an: 1, one: 1, another: 1, two: 2, three: 3, four: 4, five: 5,
};

const count = (w: string): number => WORD[w.toLowerCase()] ?? (Number(w) || 0);

export function restAllowance(actor: any): { n: number; why: Rule[] } {
  const why: Rule[] = [];
  let n = REST_MOVES;

  for (const r of rulesOf(actor)) {
    if (!/downtime\s+moves?/i.test(r.text)) continue;

    // "…choose an additional downtime move", "…take two additional downtime moves"
    const more = /\b(a|an|one|another|two|three|four|five|\d+)\s+additional\s+downtime\s+moves?/i
      .exec(r.text);
    if (more) {
      n += count(more[1] as string);
      why.push(r);
      continue;
    }

    // "…choose three downtime moves" — an outright replacement, and only ever
    // upward. A card that *reduced* your moves would be one to read, not one
    // to have applied silently by a regex.
    const flat = /\b(?:choose|take|make)\s+(one|two|three|four|five|\d+)\s+downtime\s+moves?/i
      .exec(r.text);
    if (flat) {
      const v = count(flat[1] as string);
      if (v > n) {
        n = v;
        why.push(r);
      }
    }
  }
  return { n, why };
}

/* ── the reel ──────────────────────────────────────────────────────────
   A strip of candidate totals scrolled to a stop on the real one.

   The result is decided before the reel starts, which is fine and is how
   every die in this system works — `rollDuality` evaluates and then the plate
   animates. What matters is that the value is *seen* unsettled first, or the
   motion is decoration over an answer that was already given. So the strip is
   drawn from the same range the roll could have produced, `tier + 1` through
   `tier + 4`, and never shows the answer until it arrives at it: a candidate
   equal to the final one, one cell short of the end, would read as a reel
   that stopped and then moved again.

   The travel is a plain transform transition rather than a frame loop. One
   declaration, the browser's own easing, and nothing to cancel if the dialog
   closes underneath it. */

/** Cells above the answer. Long enough to read as a reel, short enough to wait for. */
const REEL_CELLS = 9;

/** Must match `.dtm .dt .reel i` in `design/dlg.css` — the strip is stepped in whole cells. */
const REEL_PX = 26;

const REEL_MS = 780;

/**
 * The gap between the value settling and the track moving.
 *
 * The two used to happen in the same frame, which meant the number and its
 * consequence arrived together and neither was read — you saw the ledger line
 * and went back for the number. Short enough not to feel like waiting, long
 * enough that the total is a thing that landed rather than a thing that
 * flashed.
 */
const RESOLVE_MS = 300;

const beat = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

const reduced = (): boolean => {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  } catch {
    return false;
  }
};

/**
 * Spin `cast` through candidates in `[lo, hi]` and stop on `final`.
 *
 * @returns when the strip has come to rest, so the caller can apply.
 */
function reel(cast: HTMLElement, lo: number, hi: number, final: number): Promise<void> {
  // Nothing to spin through: a tier so high that every face gives the same
  // total, or a reader who has asked for less motion. Either way the answer
  // is the whole of it.
  if (hi <= lo || reduced()) {
    cast.innerHTML = `<span class="fx">${final}</span>`;
    return Promise.resolve();
  }

  const cells: number[] = [];
  for (let i = 0; i < REEL_CELLS; i++) {
    let v = final;
    // Anything but the answer, so the only cell showing it is the last one.
    while (v === final) v = lo + Math.floor(Math.random() * (hi - lo + 1));
    cells.push(v);
  }
  cells.push(final);

  cast.innerHTML = `<span class="slot"><span class="reel">${cells
    .map((v) => `<i>${v}</i>`)
    .join("")}</span></span>`;
  const strip = cast.querySelector<HTMLElement>(".reel");
  if (!strip) {
    cast.innerHTML = `<span class="fx">${final}</span>`;
    return Promise.resolve();
  }

  /* The start value has to be in the browser's hands before the end value is,
     or there is nothing to transition *from* and the strip jumps. `offsetHeight`
     is what flushes it — and it is deliberately not a `requestAnimationFrame`,
     which is the obvious reach and is the wrong tool twice over: rAF does not
     fire at all in a tab that is not painting, so a rest opened on a background
     window would sit on a reel that never lands and never applies, and the
     resolve would be lost with it. A reflow is unconditional and synchronous.
     The same argument as `.lift` on the swap, pointing the other way. */
  strip.style.transform = "translateY(0)";
  void strip.offsetHeight;
  strip.style.transition = `transform ${REEL_MS}ms cubic-bezier(.16,.72,.24,1)`;
  strip.style.transform = `translateY(-${REEL_CELLS * REEL_PX}px)`;
  return beat(REEL_MS);
}

/* ── what a rest actually does ─────────────────────────────────────────── */

/**
 * What a taken move actually changed, in the units it changed them in.
 *
 * Not what the move *should* have done. A 1d4+3 that asks for four Hit Points
 * off a track with two marked cleared two, and an undo that gave back four
 * would mark two boxes that were never marked. `applyMove` already computes
 * the real numbers — this is where they are kept so undo can reverse exactly
 * them.
 */
interface Applied {
  track?: "hitPoints" | "stress" | "armorSlots";
  cleared?: number;
  hope?: number;
}

interface Outcome {
  /** Identity for the ledger row and the card's plate, since a move repeats. */
  id: string;
  move: Move;
  /** The rolled total, for a short rest's moves. */
  n?: number;
  /**
   * The die's own face, kept only for the card.
   *
   * The dialog's reel does not need it — a reel is not a d4 and lands on the
   * total. The chat card draws the die, and a die drawn showing 6 on a d4 is
   * the lie `data-mx` exists to stop, so the card gets the face and the row's
   * big numeral carries what it was worth.
   */
  face?: number;
  /** What the sheet was able to change, which is not always what was asked. */
  did: string;
  /** The same thing in one word, for the card, where the amount is its own cell. */
  verb: string;
  applied: Applied;
}

let seq = 0;
const nextId = () => `o${++seq}`;

async function applyMove(actor: any, move: Move, kind: RestKind, n: number): Promise<Outcome> {
  const sys = actor.system ?? {};
  const roll = kind === "short" ? n : undefined;
  const id = nextId();
  switch (move.id) {
    case "wounds": {
      const cleared = await actor.clearTrack(
        "hitPoints",
        kind === "long" ? (sys.resources?.hitPoints?.marked ?? 0) : n,
      );
      return {
        id, move, n: roll, verb: "cleared",
        did: said(cleared, "Hit Point", "Hit Points", "clear"),
        applied: { track: "hitPoints", cleared },
      };
    }
    case "stress": {
      const cleared = await actor.clearTrack(
        "stress",
        kind === "long" ? (sys.resources?.stress?.marked ?? 0) : n,
      );
      // "Stress" is already plural, hence the explicit pair rather than an `s`.
      return {
        id, move, n: roll, verb: "cleared",
        did: said(cleared, "Stress", "Stress", "clear"),
        applied: { track: "stress", cleared },
      };
    }
    case "armor": {
      const cleared = await actor.clearTrack(
        "armorSlots",
        kind === "long" ? (sys.resources?.armorSlots?.marked ?? 0) : n,
      );
      return {
        id, move, n: roll, verb: "repaired",
        did: said(cleared, "Armor Slot", "Armor Slots", "repair"),
        applied: { track: "armorSlots", cleared },
      };
    }
    case "prepare": {
      // One Hope, not two. The second is for preparing *with* somebody, which
      // is a fact about the table rather than about this sheet — so the sheet
      // gives what it can be sure of and the card says the rest out loud.
      const got = await actor.gainHope(1);
      return {
        id, move, verb: "gained",
        did: got ? "gained 1 Hope" : "already at full Hope",
        applied: { hope: got },
      };
    }
    default:
      return { id, move, verb: "with the GM", did: "noted", applied: {} };
  }
}

/**
 * Give back precisely what was taken.
 *
 * Every case here is the inverse of one write in `applyMove`, against the
 * numbers that write actually produced. `markTrack` and `gainHope` both clamp
 * and both return what they managed, so an undo that cannot be completed —
 * because the track moved underneath it — fails the same quiet way the apply
 * would have.
 *
 * Domain-card uses are not here, and that is not an omission: both rests
 * refresh them, and that happens once, on Done, after this dialog is gone.
 */
async function undoMove(actor: any, o: Outcome): Promise<void> {
  const { track, cleared, hope } = o.applied;
  if (track && cleared) await actor.markTrack(track, cleared);
  if (hope) await actor.gainHope(-hope);
}

/**
 * What actually changed, which is the interesting half of a rest.
 *
 * A 1d4+3 that clears four Hit Points off a track with one marked cleared
 * *one*, and saying "cleared 4" there is the sheet reporting the die rather
 * than the effect. Nothing to clear is a real and common outcome — you took
 * the move because the die is free — and it should read as such.
 */
const said = (n: number, one: string, many: string, verb: string): string =>
  n === 0 ? `nothing to ${verb}` : `${verb}ed ${n} ${n === 1 ? one : many}`;

/**
 * Domain cards with a limited number of uses get them back.
 *
 * Both rests do this and the rules are explicit about it, and it is exactly
 * the sort of thing nobody remembers — a card you spent in the first fight of
 * the session stays spent all night unless something says otherwise.
 */
async function refreshUses(actor: any): Promise<number> {
  const updates = spent(actor).map((i: any) => ({
    _id: i.id,
    "system.uses.value": i.system.uses.max,
  }));
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  return updates.length;
}

/** Every Item this rest will hand a use back to. */
const spent = (actor: any): any[] =>
  [...(actor?.items ?? [])].filter(
    (i: any) => i.system?.uses?.max > 0 && i.system.uses.value < i.system.uses.max,
  );

/**
 * The other lane: what this rest gives back rather than what it asks of you.
 *
 * Two sources, and they are two different kinds of knowing. The first is a
 * *fact* — an Item with a `uses` pool that `refreshUses` is about to fill, so
 * the row can print the count and be exactly right. The second is a *reading*:
 * a rule saying "once per rest" whose card tracks no pool, which is most of
 * the printed deck. Those get a row with no count, because there is no count
 * to be honest about.
 *
 * Deduplicated by name, since a card with a pool that also says "once per
 * rest" is one card and would otherwise be two lines saying the same thing.
 */
function refreshing(actor: any): RefreshRow[] {
  const rows: RefreshRow[] = [];
  const seen = new Set<string>();
  const add = (r: RefreshRow) => {
    const key = r.name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(r);
  };

  for (const it of spent(actor)) {
    const u = it.system.uses;
    add({
      name: it.name,
      source: it.system?.origin || it.system?.domain || it.type,
      text: plain(it.system?.description) || "",
      uses: `${u.value ?? 0} / ${u.max}`,
      itemId: it.id,
    });
  }
  for (const r of rulesOf(actor)) {
    if (rechargeOnly(r.text)) add({ name: r.name, source: r.source, text: r.text });
  }
  return rows;
}

/* ── the card ────────────────────────────────────────────────────────────
   Three statements of one fact is what this was: a name, a small gold
   "1d4+Tier = 5", and the sentence "cleared 5 Hit Points". None of them loud,
   and the one anybody scrolls back for — *how many* — was the middle number
   of the sentence at body size.

   So a row is the plate's own grammar: the die that produced it, the name,
   and the amount at display size with its unit under it, all in the track's
   own material. The die shows the *face* and the numeral shows what it was
   worth — the distinction the dialog's reel is allowed to dissolve and a card
   with a die drawn on it is not.

   `DIE` builds `<i>`/`<b>`/`<em>` and no `<svg>`, so unlike a card this
   survives being stored as chat content and needs no redraw on render. The
   size is set in the stylesheet rather than inline for the same reason: an
   inline `style` is exactly the sort of thing that sanitiser takes. */

/** What each track is called on the card. Stress is already plural. */
const UNIT: Record<string, [one: string, many: string]> = {
  hitPoints: ["Hit Point", "Hit Points"],
  stress: ["Stress", "Stress"],
  armorSlots: ["Armor Slot", "Armor Slots"],
  hope: ["Hope", "Hope"],
};

function restRow(o: Outcome): string {
  const track = o.applied.track ?? (o.applied.hope === undefined ? null : "hope");
  const n = o.applied.track ? (o.applied.cleared ?? 0) : (o.applied.hope ?? 0);
  const unit = track ? UNIT[track] : undefined;
  return `<div class="r${n === 0 ? " zero" : ""}"${track ? ` data-t="${track}"` : ""}>
    ${o.face === undefined ? "" : `<span class="dc">${DIE(o.face, "d4 lit")}</span>`}
    <span class="bd"><b>${esc(o.move.name)}</b><s>${esc(o.verb)}</s></span>
    ${unit ? `<span class="v"><b>${n}</b><em>${esc(n === 1 ? unit[0] : unit[1])}</em></span>` : ""}
  </div>`;
}

async function postRest(actor: any, kind: RestKind, done: Outcome[], refreshed: number) {
  const lines = done.map(restRow).join("");

  return ChatMessage.create({
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="dh dh-rest"><div class="rest">
      <div class="k">${esc(KIND_LABEL[kind])}<s>${esc(actor.name)}</s></div>
      ${lines || `<p class="ach">${esc(game.i18n.localize("DAGGERHEART.Rest.NoMoves"))}</p>`}
      ${
        refreshed
          ? `<p class="ach">${esc(
              refreshed === 1
                ? game.i18n.localize("DAGGERHEART.Rest.RefreshedOne")
                : game.i18n.format("DAGGERHEART.Rest.Refreshed", { n: refreshed }),
            )}</p>`
          : ""
      }
    </div></div>`,
    flags: { [SYSTEM_ID]: { kind: "rest", rest: kind } },
  });
}

/* ── the dialog ────────────────────────────────────────────────────────── */

export async function rest(actor: any, kind: RestKind): Promise<void> {
  const tier = actor.system?.tier ?? 1;
  const moves = MOVES[kind];
  const allow = restAllowance(actor);

  /* One panel, two lanes. The dialog has two overlapping questions about the
     same shelf — what changes how many moves I get, and what mentions resting
     at all — and Celestial Trance answers both. `merge` keeps it to one tile
     with a note saying which of the two it is here for.

     What it does *not* keep is a card that only recharges. "Once per rest" is
     the rest talking to the card rather than the card talking to the rest, so
     those drop into the `.rf` lane below the tiles and are named there once,
     with their rule a hover away. */
  const why: RuleCard[] = allow.why.map((rule) => ({
    rule,
    note: game.i18n.localize("DAGGERHEART.Rest.Grants"),
  }));
  const back = refreshing(actor);
  const named = new Set(back.map((r) => r.name.toLowerCase()));
  const bears = merge(why, rulesAbout(actor, REST_RX)).filter(
    // A card that grants a downtime move stays a card even if it also
    // recharges: the note above it is the reason it is here.
    (e) => !!e.note || (!named.has(e.rule.name.toLowerCase()) && !rechargeOnly(e.rule.text)),
  );
  const panel = await ruleCardsPanel(
    actor,
    bears,
    game.i18n.localize("DAGGERHEART.Rest.Relevant"),
    { heading: game.i18n.localize("DAGGERHEART.Rest.Refreshes"), rows: back },
  );

  /** Everything taken, in order. Filled by the dialog, read after it closes. */
  const done: Outcome[] = [];

  const notation = `1d4 + ${tier}`;

  /* The plate a square opens with: a waiting dash under the notation, or the
     value the move already knows. */
  const plate = (m: Move) =>
    m.roll
      ? `<span class="cast"><span class="fx">—</span></span><span class="nt">${notation}</span>`
      : `<span class="cast"><span class="fx">${esc(m.fx ?? "—")}</span></span>` +
        `<span class="nt">${esc(m.cap ?? "")}</span>`;

  /* `title` as well as the hover panel: the rule is behind a pointer gesture
     and not everybody has one. */
  const deck = moves
    .map(
      (m) => `<button type="button" class="dt" data-move="${m.id}" title="${esc(m.text)}">
        <span class="plate">${plate(m)}</span>
        <span class="bd">
          <b>${esc(m.name)}</b>
          <span class="tx">${esc(m.text)}</span>
        </span>
        <span class="ct"></span>
        <span class="tbar"></span>
      </button>`,
    )
    .join("");

  /* The hint names the card when the number is not the printed one. "Three"
     on its own reads as a bug in the sheet; "three — Celestial Trance" reads
     as the card working, and the card itself is drawn in the panel below. */
  const hint =
    allow.n === REST_MOVES
      ? game.i18n.format("DAGGERHEART.Rest.Hint", { n: allow.n })
      : game.i18n.format("DAGGERHEART.Rest.Granted", {
          n: allow.n,
          from: allow.why.map((r) => r.name).join(", "),
        });

  await dhDialog<true>({
    title: game.i18n.format("DAGGERHEART.Rest.Title", { kind: KIND_LABEL[kind] }),
    ok: game.i18n.localize("DAGGERHEART.Rest.Done"),
    // Nothing to cancel. Every move here has already happened by the time you
    // could press it, and a button labelled Cancel next to a track you just
    // cleared is a promise the dialog cannot keep. Taking one *back* is a
    // different offer and it is on the ledger row that knows what it did.
    cancel: false,
    width: 540,
    content: `<div class="dtm">
      <p class="ach">${esc(hint)}</p>
      <div class="moves" style="--cols:${moves.length}">${deck}</div>
      <div class="log"></div>
      <p class="tally"></p>
      <!-- Filled in "wire": the card tiles carry inline <svg> sigils, and
           Foundry strips SVG out of a dialog's "content" exactly as it does
           out of stored chat content. -->
      <div class="rules-host"></div>
    </div>`,

    wire: (root) => {
      const host = root.querySelector<HTMLElement>(".rules-host");
      if (host) host.innerHTML = panel;
      wireRulePeeks(root);

      const tally = root.querySelector<HTMLElement>(".tally");
      const log = root.querySelector<HTMLElement>(".log");
      const cards = [...root.querySelectorAll<HTMLButtonElement>(".dt")];

      const undoLabel = esc(game.i18n.localize("DAGGERHEART.Rest.Undo"));

      /** Put a square's plate back to waiting — a dash, and the notation. */
      const idle = (card: HTMLElement) => {
        const m = moves.find((x) => x.id === card.dataset.move);
        if (!m) return;
        const cast = card.querySelector<HTMLElement>(".cast");
        const nt = card.querySelector<HTMLElement>(".nt");
        if (cast) cast.innerHTML = `<span class="fx">${esc(m.roll ? "—" : (m.fx ?? "—"))}</span>`;
        if (nt) nt.textContent = m.roll ? notation : (m.cap ?? "");
        delete card.dataset.shown;
      };

      const sync = () => {
        if (tally) {
          tally.textContent = game.i18n.format("DAGGERHEART.Rest.Taken", {
            n: done.length,
            of: allow.n,
          });
          tally.classList.toggle("over", done.length > allow.n);
        }
        for (const card of cards) {
          const n = done.filter((o) => o.move.id === card.dataset.move).length;
          const ct = card.querySelector<HTMLElement>(".ct");
          if (ct) ct.textContent = n > 1 ? `×${n}` : "";
          // `.took` is "this move has been made"; `.done` is "this card is
          // showing a result". They come apart the moment a move is taken
          // twice and the *second* one is undone: the move still happened,
          // and the number on the plate did not.
          card.classList.toggle("took", n > 0);
          if (card.dataset.shown && !done.some((o) => o.id === card.dataset.shown)) idle(card);
          card.classList.toggle("done", !!card.dataset.shown);
        }
      };

      const note = (o: Outcome) => {
        if (!log) return;
        const line = document.createElement("div");
        line.className = "ln";
        line.dataset.entry = o.id;
        line.innerHTML =
          `<b>${esc(o.move.name)}</b>${o.n === undefined ? "" : `<s>${o.n}</s>`}` +
          `<em>${esc(o.did)}</em>` +
          `<button type="button" class="un" data-undo="${o.id}">${undoLabel}</button>`;
        log.append(line);
        // The newest line is the one you are waiting for, and the log grows
        // downward past the fold on a fourth move.
        line.scrollIntoView({ block: "nearest" });
      };

      let busy = false;
      const lock = (on: boolean) => {
        busy = on;
        for (const c of cards) c.disabled = on;
        for (const u of root.querySelectorAll<HTMLButtonElement>(".log .un")) u.disabled = on;
      };

      /** Restart one of the two sweeps, which are the same element twice. */
      const flash = (card: HTMLElement, cls: "lands" | "undone") => {
        card.classList.remove("lands", "undone");
        void card.offsetWidth;
        card.classList.add(cls);
      };

      for (const card of cards) {
        card.addEventListener("click", async (e) => {
          e.preventDefault();
          if (busy) return;
          const move = moves.find((m) => m.id === card.dataset.move);
          if (!move) return;
          lock(true);
          card.classList.remove("done", "lands", "undone");
          card.classList.add("rolling");
          // The caption does not move: it said `1d4 + Tier` before the press
          // and the total it produced is now sitting in the cell above it, so
          // it goes on saying where that number came from.
          const cast = card.querySelector<HTMLElement>(".cast");
          try {
            let n = 0;
            // Kept for the card, which draws the die; the reel does not use it.
            let face: number | undefined;
            if (move.roll) {
              const roll = new Roll(`1d4 + ${tier}`);
              await roll.evaluate();
              n = roll.total;
              face = roll.dice[0]?.results?.[0]?.result ?? 1;
              /* The reel runs over the totals the roll could have given —
                 `tier + 1` through `tier + 4` — and stops on the one it did.
                 It lands on the total rather than the die's own face because
                 there is no die here to be lied about: the old silhouette had
                 to show the face or a d4 would have been claiming a 6, and a
                 reel of numerals claims nothing but the number it stops on. */
              if (cast) await reel(cast, tier + 1, tier + 4, n);
            }
            card.classList.remove("rolling");
            card.classList.add("done");
            // The reel's own last cell *is* the answer, so the settled value
            // replaces the strip rather than being animated into place again.
            if (move.roll && cast) cast.innerHTML = `<span class="fx">${n}</span>`;
            // Let the number be read before the track moves under it.
            if (move.roll) await beat(RESOLVE_MS);
            const outcome = await applyMove(actor, move, kind, n);
            outcome.face = face;
            done.push(outcome);
            card.dataset.shown = outcome.id;
            flash(card, "lands");
            note(outcome);
            sync();
          } finally {
            card.classList.remove("rolling");
            lock(false);
          }
        });
      }

      /* Undo, delegated off the ledger because the rows are made as they
         happen. Reverses the actor, drops the row, and hands the allowance
         back; the roll is not kept, so re-taking the move rolls again. That is
         the honest behaviour — undo is "that did not happen", not "let me keep
         the number and change my mind". */
      log?.addEventListener("click", async (e) => {
        const btn = (e.target as Element | null)?.closest?.<HTMLElement>("[data-undo]");
        if (!btn || busy) return;
        e.preventDefault();
        const id = btn.dataset.undo;
        const i = done.findIndex((o) => o.id === id);
        if (i < 0) return;
        lock(true);
        try {
          const [o] = done.splice(i, 1) as [Outcome];
          await undoMove(actor, o);
          const line = log.querySelector<HTMLElement>(`[data-entry="${id}"]`);
          if (line) {
            line.classList.add("out");
            setTimeout(() => line.remove(), 200);
          }
          const card = cards.find((c) => c.dataset.move === o.move.id);
          if (card) flash(card, "undone");
          sync();
        } finally {
          lock(false);
        }
      });

      sync();
    },
  });

  /* Applied as you went, so there is nothing to commit here — only something
     to say. A rest with no moves in it is somebody who opened the dialog and
     changed their mind, or took two and put both back, and it gets no card
     and refreshes nothing. */
  if (!done.length) return;
  const refreshed = await refreshUses(actor);
  await postRest(actor, kind, done, refreshed);
}
