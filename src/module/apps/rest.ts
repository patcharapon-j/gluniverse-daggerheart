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
 * **A move is a card.** It used to be a list row with the word "take" on the
 * right, which is correct and reads as a form field — the one thing this
 * dialog spent its redesign not being. Everything else a player picks up in
 * this system is drawn in one card vocabulary, and a downtime move is the same
 * kind of object: a thing you choose, spend and can choose again. So it takes
 * the landscape card's shape — art plate, gold seam, display name, rule,
 * footer, tier bar — as a sibling of `.tile` rather than as an instance of it,
 * because a tile is built from a domain, a sigil and a level and a downtime
 * move has none of the three. See `.dtm .dt` in `design/dlg.css`.
 *
 * **The die rolls in the card that was pressed**, in the panel where that card
 * would carry its artwork. One tray at the foot of the dialog was a die thrown
 * somewhere else about something you did up here, and over three rolls the
 * answer to "what did *that* one give me" was always in the same box as the
 * answer to the last one. And it lands as the chat card's own `.die` — the
 * silhouette of the die with the numeral on its front face — because that is
 * where this table already reads a rolled number. The die shows the *face* and
 * the caption shows the total: a d4 reading 6 would be a d4 lying about what
 * it is.
 *
 * With Dice So Nice installed the tumble is that module's, thrown into the
 * tray — see `dice/inplace.ts` — and without it, ours. Either way it is a real
 * `Roll`: the dice log and the seeded randomness stay honest and only the
 * *place* changes.
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
 * **Nothing else is guessed.** Anything on this character that mentions a rest
 * is listed underneath, verbatim, and as the card it is printed on. See
 * `rules.ts` and `rule-cards.ts`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "../config.ts";
import { DIE } from "../dice/plate.ts";
import { canRollInPlace, disposeInPlace, rollInPlace } from "../dice/inplace.ts";
import { REST_RX, type Rule, rulesAbout, rulesOf } from "./rules.ts";
import { type RuleCard, merge, ruleCardsPanel } from "./rule-cards.ts";
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

/* ── the die, ours, when it is not theirs ──────────────────────────────
   Six faces of noise and then the answer. The cycling is what makes it a
   *roll* rather than a number appearing — the value has to be seen to be
   unsettled before it settles, or the animation is decoration over a result
   that was decided before it started.

   The result *is* decided before it started. That is fine and it is how every
   die in this system works: `rollDuality` evaluates and then the plate
   animates. What must not happen is the final face showing during the tumble,
   which is why the noise is drawn from the wrong range on purpose. */
const TUMBLE_MS = 620;

/** How big the settled die is drawn in the card's plate. */
const DIE_PX = 46;

/**
 * The gap between the die settling and the track moving.
 *
 * The two used to happen in the same frame, which meant the number and its
 * consequence arrived together and neither was read — you saw the ledger line
 * and went back for the number. Short enough not to feel like waiting, long
 * enough that the die is a thing that landed rather than a thing that flashed.
 */
const RESOLVE_MS = 300;

const beat = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

function tumble(cell: HTMLElement, faces: number, final: number): Promise<void> {
  return new Promise((done) => {
    cell.classList.remove("roll");
    void cell.offsetWidth;
    cell.classList.add("roll");

    const started = performance.now();
    const tick = () => {
      const t = performance.now() - started;
      if (t >= TUMBLE_MS) {
        cell.textContent = String(final);
        cell.classList.remove("roll");
        done();
        return;
      }
      cell.textContent = String(1 + Math.floor(Math.random() * faces));
      // Slowing as it lands, so the last few faces are readable and the die
      // looks like it is losing energy rather than being switched off.
      setTimeout(tick, 34 + (t / TUMBLE_MS) * 90);
    };
    tick();
  });
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
  /** The die's own face, which is what the die is drawn showing. */
  face?: number;
  /** What the sheet was able to change, which is not always what was asked. */
  did: string;
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
        id, move, n: roll,
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
        id, move, n: roll,
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
        id, move, n: roll,
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
        id, move,
        did: got ? "gained 1 Hope" : "already at full Hope",
        applied: { hope: got },
      };
    }
    default:
      return { id, move, did: "noted", applied: {} };
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
  const updates = [...(actor.items ?? [])]
    .filter((i: any) => i.system?.uses?.max > 0 && i.system.uses.value < i.system.uses.max)
    .map((i: any) => ({ _id: i.id, "system.uses.value": i.system.uses.max }));
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  return updates.length;
}

/* ── the card ──────────────────────────────────────────────────────────── */

async function postRest(actor: any, kind: RestKind, done: Outcome[], refreshed: number) {
  const lines = done
    .map(
      (o) => `<div class="r">
        <span class="hd"><b>${esc(o.move.name)}</b>${
          o.n === undefined ? "" : `<s>1d4+Tier = ${o.n}</s>`
        }</span>
        <p>${esc(o.did)}</p>
      </div>`,
    )
    .join("");

  return ChatMessage.create({
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="dh dh-rest"><div class="rest">
      <div class="k">${esc(KIND_LABEL[kind])}<s>${esc(actor.name)}</s></div>
      ${lines || '<p class="ach">No downtime moves taken.</p>'}
      ${
        refreshed
          ? `<p class="ach">${refreshed} card${refreshed === 1 ? "" : "s"} regained their uses.</p>`
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

  /* One panel, not two. The dialog has two overlapping questions about the
     same shelf — what changes how many moves I get, and what mentions resting
     at all — and Celestial Trance answers both. `merge` keeps it to one tile
     with a note saying which of the two it is here for. */
  const why: RuleCard[] = allow.why.map((rule) => ({
    rule,
    note: game.i18n.localize("DAGGERHEART.Rest.Grants"),
  }));
  const panel = await ruleCardsPanel(
    actor,
    merge(why, rulesAbout(actor, REST_RX)),
    game.i18n.localize("DAGGERHEART.Rest.Relevant"),
  );

  /** Everything taken, in order. Filled by the dialog, read after it closes. */
  const done: Outcome[] = [];

  const notation = `1d4 + ${tier}`;

  /* The plate a card opens with: an unlit die waiting for a number, or the
     number the move already knows. */
  const plate = (m: Move) =>
    m.roll
      ? `<span class="cast">${DIE("", "d4", DIE_PX)}</span><span class="nt">${notation}</span>`
      : `<span class="cast"><span class="fx">${esc(m.fx ?? "—")}</span></span>` +
        `<span class="nt">${esc(m.cap ?? "")}</span>`;

  const take = esc(game.i18n.localize("DAGGERHEART.Rest.Take"));
  const badge = esc(game.i18n.localize("DAGGERHEART.Rest.Move"));

  const deck = moves
    .map(
      (m) => `<button type="button" class="dt" data-move="${m.id}">
        <span class="tray">${plate(m)}</span>
        <span class="bd">
          <span class="hd"><b>${esc(m.name)}</b>${m.roll ? `<s>${notation}</s>` : ""}</span>
          <span class="tx">${esc(m.text)}</span>
          <span class="ft">
            <span class="tb">${badge}</span>
            <span class="ct"></span>
            <span class="go">${take}</span>
          </span>
        </span>
        <span class="tbar"></span>
      </button>`,
    )
    .join("");

  /* The hint says where the number came from when it is not the printed one.
     "Three" with no explanation reads as a bug in the sheet; "three, and here
     is the card" reads as the card working — and the card itself is now drawn
     in the panel below rather than only named here. */
  const hint =
    allow.n === REST_MOVES
      ? game.i18n.format(
          kind === "short" ? "DAGGERHEART.Rest.ShortHint" : "DAGGERHEART.Rest.LongHint",
          { n: allow.n },
        )
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
      <div class="moves">${deck}</div>
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

      const tally = root.querySelector<HTMLElement>(".tally");
      const log = root.querySelector<HTMLElement>(".log");
      const cards = [...root.querySelectorAll<HTMLButtonElement>(".dt")];

      // Real dice go in the tray and our own tumble goes in the cell, so only
      // one of the two is ever on screen.
      root.querySelector(".dtm")?.classList.toggle("dsn", canRollInPlace());

      const undoLabel = esc(game.i18n.localize("DAGGERHEART.Rest.Undo"));

      /** Put a card's plate back to waiting — an unlit die, the notation. */
      const idle = (card: HTMLElement) => {
        const m = moves.find((x) => x.id === card.dataset.move);
        if (!m) return;
        const cast = card.querySelector<HTMLElement>(".cast");
        const nt = card.querySelector<HTMLElement>(".nt");
        if (cast) {
          cast.innerHTML = m.roll
            ? DIE("", "d4", DIE_PX)
            : `<span class="fx">${esc(m.fx ?? "—")}</span>`;
        }
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
          const cast = card.querySelector<HTMLElement>(".cast");
          const nt = card.querySelector<HTMLElement>(".nt");
          try {
            let n = 0;
            let face = 0;
            if (move.roll) {
              const roll = new Roll(`1d4 + ${tier}`);
              await roll.evaluate();
              n = roll.total;
              face = roll.dice[0]?.results?.[0]?.result ?? 1;
              // The 3D die is the module's business and lands on its own; ours
              // shows the face tumbling in the same box. Either way the plate
              // ends holding the *face*, and the caption holds the total —
              // showing a total on a d4 would spoil a d4 with a +3 on it and
              // would also be a d4 claiming a number it does not have.
              if (cast) cast.innerHTML = '<span class="tmb">—</span>';
              const tray = card.querySelector<HTMLElement>(".tray");
              if (!(tray && (await rollInPlace(roll, tray)))) {
                const cell = cast?.querySelector<HTMLElement>(".tmb");
                if (cell) await tumble(cell, 4, face);
              }
              if (cast) cast.innerHTML = DIE(face, "d4 lit", DIE_PX);
              if (nt) nt.innerHTML = `= <b>${n}</b>`;
            }
            card.classList.remove("rolling");
            card.classList.add("done");
            // Let the die be read before the track moves under it.
            if (move.roll) await beat(RESOLVE_MS);
            const outcome = await applyMove(actor, move, kind, n);
            outcome.face = move.roll ? face : undefined;
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

  /* The tray's canvas belongs to a dialog that is now being destroyed, and
     the scene behind it is holding a mesh and a running animation frame. It
     comes down here rather than in the dialog's own close handler because
     this is the one place both outcomes pass through — and *before* the
     early return below, or a rest where nothing was taken leaves the whole
     apparatus parented to an element that no longer exists. */
  disposeInPlace();

  /* Applied as you went, so there is nothing to commit here — only something
     to say. A rest with no moves in it is somebody who opened the dialog and
     changed their mind, or took two and put both back, and it gets no card
     and refreshes nothing. */
  if (!done.length) return;
  const refreshed = await refreshUses(actor);
  await postRest(actor, kind, done, refreshed);
}
