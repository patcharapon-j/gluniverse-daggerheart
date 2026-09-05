/**
 * Fitting cards without re-solving the ones already on screen.
 *
 * `fit()` measures *wrapped prose*. It resets a card to its opening type
 * scale, writes a scale, reads `scrollHeight`, and steps until the panel
 * stops overflowing — so every step is a forced synchronous layout, and a
 * card is a container-query root, so the layout it forces is its own. Run
 * over a scope it is not an idempotent tidy-up pass, it is the whole solve
 * redone for every card in that scope.
 *
 * The browse window learned this against 189 domain cards and answered it
 * two ways. **A card that has been fitted wears `data-fit` and is not fitted
 * again**, so a change pays only for the cards it actually brought; and the
 * cards that did arrive are fitted **a few per frame**, so what is left lands
 * across paints instead of on one. This is that answer, lifted out when the
 * second and third callers turned up.
 *
 * They turned up as a bug rather than as a request. Both the character sheet
 * and the creation window called `fit(root)` from an effect keyed on
 * something that changes on *every* document sync — the peek layer's rows,
 * whose array identity is rebuilt each pass, and `snap.rev`, which is bumped
 * by definition. So marking a Stress box re-solved every peeked card in the
 * sheet, and placing a trait chip re-solved every card in the creation
 * window: several hundred forced layouts on the frame after a gesture whose
 * own work was writing one number. Neither surface looked wrong afterwards,
 * which is why it survived — the cost is entirely in the frame you dropped.
 *
 * Two things invalidate a solve and both mean throwing every mark away.
 * **Fonts**, because metrics measured against a fallback face are wrong by
 * enough to cost a line — the vendored `fit()` says so at the top — and this
 * is handled here, since every caller wants it and two of the three had
 * spelt it out differently. And **width**, because a card solved at one
 * width is not solved at another; that one stays with the caller, because
 * only the caller knows whether its cards can change width at all. The peek
 * layer's cannot: a `.pkc` is a fixed 262px.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "../config.ts";
import { fit } from "../ui/card.js";

/** Cards solved per frame. Six is about a frame's worth at card size. */
const CHUNK = 6;

export interface CardFitter {
  /** Solve every card in scope that has not been solved yet. */
  run(): void;
  /** Every solve on screen is stale: drop the marks and start again. */
  reset(): void;
  /** Abandon a pass still walking — for a component being torn down. */
  stop(): void;
}

/**
 * `fit()` takes a *scope* and does exactly one thing with it:
 * `scope.querySelectorAll('.card')`. So the way to solve a single card is to
 * hand it a scope that answers with that card and nothing else, which is
 * both narrower and safer than passing the card's parent — a wrapper holding
 * two cards would silently re-solve the sibling, and the wrapper differs on
 * every surface that draws one.
 *
 * `ui/card.js` is vendored from `design/`, so widening `fit()` itself to
 * accept an element is not available here: it would mean changing the design
 * system to serve a Foundry-side concern. The adapter lives on this side of
 * the port instead.
 */
const only = (card: Element) => ({ querySelectorAll: () => [card] }) as any;

/**
 * @param scope  the root to search, read fresh each pass — a `bind:this`
 *               target is undefined until the component mounts.
 * @param select which cards this fitter owns. Defaults to every card in
 *               scope; the browse window narrows it to the grid's own.
 */
export function cardFitter(
  scope: () => HTMLElement | null | undefined,
  select = ".card",
): CardFitter {
  /** Supersedes any pass still walking, so a change abandons the old one
      rather than racing it. */
  let pass = 0;
  /** Whether a font-driven invalidation is still owed. Once only: the faces
      land once per session, and re-arming would re-solve on every run. */
  let awaitingFonts = true;

  const run = (): void => {
    const root = scope();
    if (!root) return;

    /* The faces this is about to measure against may not be the faces it
       will be read in. A sheet opened by hand is long past that; a window
       opened during load is not, and neither knows which it is. */
    if (awaitingFonts && document.fonts?.status === "loading") {
      awaitingFonts = false;
      void document.fonts.ready.then(() => reset()).catch(() => {});
    }

    /* The work first, and the supersede only if there is any — which is the
       other way round from how this reads, and the way round it has to be.
       Bumping `pass` on a run with nothing to do would cancel a pass still
       walking, and the cards it had not reached yet would stay unsolved
       until something unrelated happened to ask again. A change that only
       *removes* cards is exactly that run, and it is a filter narrowing or a
       tab losing a row rather than anything exotic.

       Superseding is safe when there is work, because `todo` is everything
       still unmarked — including whatever the abandoned pass had left. */
    const todo = [...root.querySelectorAll(`${select}:not([data-fit])`)];
    if (!todo.length) return;
    const mine = ++pass;

    let i = 0;
    const step = (): void => {
      if (mine !== pass) return;
      for (const end = Math.min(i + CHUNK, todo.length); i < end; i++) {
        const card = todo[i]!;
        fit(only(card));
        (card as HTMLElement).dataset.fit = "1";
      }
      if (i < todo.length) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const reset = (): void => {
    const root = scope();
    if (!root) return;
    for (const el of root.querySelectorAll<HTMLElement>(`${select}[data-fit]`)) {
      delete el.dataset.fit;
    }
    run();
  };

  return { run, reset, stop: () => void ++pass };
}

/* ── one card, when the frame can afford it ────────────────────────────
   A chat card has no scope to sweep and no siblings to page: it is one card,
   drawn once, by a hook that fires per message. So it wants the *other* half
   of the answer above — the spreading, without the marking.

   It wants it badly, because the hook does not fire once. Opening the log,
   popping the sidebar out and reconnecting all draw the backlog in one go,
   and every card in it scheduled its own solve into the same double-`rAF`
   callback: fifty messages meant fifty full solves on one frame, each one a
   run of forced synchronous layouts. That is the stall on opening chat, and
   nothing about it is visible afterwards — the cards are correct, they simply
   all arrived through a dropped second.

   One queue, a few per frame, in the order they were asked for. `done` runs
   immediately after its own card is solved rather than at the end of the
   batch, because it is what puts the arrival on a freshly landed card and a
   card that has to wait for forty-nine strangers has stopped arriving. */

const queue: { card: Element; done?: () => void }[] = [];
let draining = false;

function drain(): void {
  for (let n = 0; n < CHUNK && queue.length; n++) {
    const { card, done } = queue.shift()!;
    // A message can be removed between the ask and the frame.
    if (!card.isConnected || !(card as HTMLElement).clientWidth) continue;
    /* One card's failure is one card's. This queue is module-level and
       shared by every message in the log, so an exception escaping here
       would leave `draining` true with a queue that never empties — every
       card posted afterwards silently unfitted, for the rest of the
       session. */
    try {
      fit(only(card));
      done?.();
    } catch (err) {
      console.error(`${SYSTEM_ID} | could not fit a card`, err);
    }
  }
  if (queue.length) requestAnimationFrame(drain);
  else draining = false;
}

/** Solve one card on some frame soon, sharing the budget with every other. */
export function fitSoon(card: Element | null | undefined, done?: () => void): void {
  if (!card) {
    done?.();
    return;
  }
  queue.push({ card, done });
  if (draining) return;
  draining = true;
  requestAnimationFrame(drain);
}
