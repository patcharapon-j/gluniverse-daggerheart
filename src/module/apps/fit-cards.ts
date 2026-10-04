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
 * layer's cannot: a peeked `.dh-face` is a fixed 264px.
 *
 * ── two ladders, one scheduler ────────────────────────────────────────
 * There are two cards in this system now and each brought its own ladder.
 * `ui/card.js`'s `fit()` steps `--plate` against the old `.card`; `face-fx.js`
 * has the ported pair — eleven steps of painting height and type scale against
 * `.dh-face-plate`, and five steps of name scale on a compact card's heading.
 * The *ladders* differ; everything above — don't re-solve, spread the solves,
 * throw them all away once the fonts land — is the same problem either way, so
 * this dispatches on the element rather than forking the scheduler per builder.
 * `fitOne` is the whole of that seam.
 *
 * ── and the measured crop, for the same reason ────────────────────────
 * `frameArt` is here too, and it is here because it is the same *kind* of
 * work: the thing a card can only be given once it has a box. `framing.js`
 * says it outright — a region computed on first paint is wrong by the time
 * anybody looks at it — so a surface that wants the measured crop wants a
 * ResizeObserver and an image load, which is a second thing to tear down per
 * card. Two surfaces want it, a chat card and the peek layer, and neither is
 * the other's business; so the shared answer lives where the other shared
 * after-layout answer already lives.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "../config.ts";
import { fit } from "../ui/card.js";
import { fit as faceFit, nameFit as faceNameFit } from "../ui/face-fx.js";
import {
  type Box,
  coverCss,
  type Focus,
  followSize,
  framedRegion,
  regionCss,
} from "../ui/framing.js";

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
 * Solve one card, whichever card it is.
 *
 * The new builders draw `.dh-face` and `.dh-cc` and the old one draws `.card`,
 * and the three ladders live in two vendored modules that know nothing about
 * each other. The element says which it is, so nothing above has to.
 *
 * `.dh-cc` is handed the element *itself* as the scope while the other two go
 * through `only()`, and the asymmetry is real rather than sloppy: `nameFit`
 * looks for `.dh-cc-foot h3` **inside** the scope, so a scope that answers
 * every query with the card would hand it the card as its own heading. The two
 * plate ladders look for the card, which is exactly what `only()` is for.
 *
 * It also quietly suppresses `face-fx`'s own second pass after the fonts land:
 * `only()`'s scope has no `ownerDocument` and is not `document`, so the guard
 * there declines. That is wanted. The font invalidation belongs to the fitter
 * below, which throws every mark away and re-solves rather than re-solving one
 * card eleven steps deep on a frame nobody asked it to.
 */
function fitOne(card: Element): void {
  const el = card as HTMLElement;
  if (el.matches?.(".dh-cc")) faceNameFit(el);
  else if (el.matches?.(".dh-face")) faceFit(only(card));
  else fit(only(card));
}

/**
 * @param scope  the root to search, read fresh each pass — a `bind:this`
 *               target is undefined until the component mounts.
 * @param select which cards this fitter owns. Defaults to either card this
 *               system draws; the browse window narrows it to the grid's own,
 *               and the peek layer to `.dh-face` because the dialog around it
 *               has no business being swept for cards.
 */
export function cardFitter(
  scope: () => HTMLElement | null | undefined,
  select = ".card, .dh-face",
): CardFitter {
  /** Supersedes any pass still walking, so a change abandons the old one
      rather than racing it. */
  let pass = 0;
  /** Whether a font-driven invalidation is still owed. Once only: the faces
      land once per session, and re-arming would re-solve on every run. */
  let awaitingFonts = true;

  /* A qualifier onto *every* alternative in `select`, not onto the last one.
     `select` is a selector list now that the default names two cards, and
     `".card, .dh-face:not([data-fit])"` is a list whose first half matches
     every card it has already solved — so the pass never terminates and the
     log fills with the same six cards being re-fitted a frame apart. */
  const each = (suffix: string): string =>
    select.split(",").map((one) => `${one.trim()}${suffix}`).join(",");

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
    const todo = [...root.querySelectorAll(each(":not([data-fit])"))];
    if (!todo.length) return;
    const mine = ++pass;

    let i = 0;
    const step = (): void => {
      if (mine !== pass) return;
      for (const end = Math.min(i + CHUNK, todo.length); i < end; i++) {
        const card = todo[i]!;
        fitOne(card);
        (card as HTMLElement).dataset.fit = "1";
      }
      if (i < todo.length) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const reset = (): void => {
    const root = scope();
    if (!root) return;
    for (const el of root.querySelectorAll<HTMLElement>(each("[data-fit]"))) {
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
      fitOne(card);
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

/* ── the measured crop ─────────────────────────────────────────────────
   Every painting in the corpus is a wide landscape and no frame that shows
   one is, so something is always thrown away; `assets/cards/card-focus.json`
   is a human's answer to *which part*, and `framing.js` is the arithmetic
   that spends it. There are two ways to spend it and the difference is
   whether anything has been measured.

   `card-style.ts`'s `useArtFocus` takes the cheap one at build time: a
   generated rule that moves `.dh-art-paint`'s cover crop onto the point
   instead of onto the middle. It is one rule per painting, it needs nothing
   laid out, and it cannot close in — `background-position` slides a cover
   crop, it does not magnify one, so a marking that carries a `scale` is
   honoured only as far as cover.

   This is the other one, and it is the port of gluvtt's `FramedArt`: the
   painting as an `<img>` inside `.dh-art-paint`, laid out larger than the
   frame and pulled up and left so exactly the marked region covers it. It
   needs the painting's natural size and the frame's box, which is why it is
   not available to a builder returning a string, and it is the only form in
   which a close-up happens at all.

   **An `<img>` over the background rather than instead of it.** gluvtt drops
   `--dh-art` when it frames, because it controls both ends. Here `face.css`
   is an authored file and `--dh-art` is how `FACE` states that there is a
   painting at all, so the background stays and the image covers it — which
   also means a painting that fails to load falls back to the crop it would
   have had rather than to a hole. `.dh-art-paint` is already
   `position:absolute`, so it is the image's containing block; `.dh-art` is
   what clips the overflow, exactly as it clips the background's own 3u bleed.

   The URL is read back off `--dh-art` rather than passed in, for the reason
   `useArtFocus` keys its rule on the same string: that property is where the
   painting is, by construction, and a second channel for it is a second
   thing that can disagree with the card. */

/** A painting's URL as `FACE` wrote it into `--dh-art`, or nothing. */
const paintingOf = (face: HTMLElement): string | undefined =>
  /^\s*url\((["']?)(.*)\1\)\s*$/.exec(face.style.getPropertyValue("--dh-art"))?.[2] || undefined;

/**
 * A focus point as an attribute, for a card whose crop is taken by a surface
 * that did not build it.
 *
 * The peek layer is that surface: `dialog-peek.ts` is handed a layer and a
 * selector and deliberately knows nothing about what the rows mean, so the
 * point has to travel on the markup rather than alongside it. Three numbers
 * and a comma, because the alternative is JSON in an attribute.
 */
export const focusAttr = (focus?: Focus): string => {
  if (!focus) return "";
  const parts = [focus.x, focus.y, ...(focus.scale === undefined ? [] : [focus.scale])];
  return ` data-focus="${parts.join(",")}"`;
};

/** The point back off the attribute, or nothing where nobody marked one. */
export function focusFrom(el: HTMLElement | null | undefined): Focus | undefined {
  const parts = el?.dataset.focus?.split(",").map(Number);
  if (!parts || parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return undefined;
  const [x, y, scale] = parts as [number, number, number?];
  return scale === undefined ? { x, y } : { x, y, scale };
}

/**
 * Frames `face`'s painting on its marked point, measured.
 *
 * Returns the teardown, and the caller owes it: this holds a ResizeObserver on
 * an element inside a surface that gets replaced wholesale — a message
 * redrawn, a dialog closed — and an observer on a detached node is a retained
 * card. A face with no painting or no marking gets nothing at all and keeps
 * the crop `useArtFocus` already gave it.
 */
export function frameArt(face: HTMLElement, focus?: Focus): () => void {
  const paint = face.querySelector<HTMLElement>(".dh-art-paint");
  const painting = paintingOf(face);
  if (!focus || !paint || !painting) return () => {};

  const img = document.createElement("img");
  img.alt = "";
  img.draggable = false;
  img.setAttribute("aria-hidden", "true");

  let art: Box | undefined;
  let frame: Box | undefined;
  /* Until both are known, `framing.js`'s own pre-measurement answer: cover,
     anchored on the point. It is close enough to the measured region that the
     switch is not a visible jump, which is the whole requirement for the one
     paint it covers. */
  const place = (): void => {
    img.style.cssText = `position:absolute;${
      art && frame ? regionCss(framedRegion(art, frame, focus)) : `left:0;top:0;${coverCss(focus)}`
    }`;
  };
  place();
  img.addEventListener("load", () => {
    art = { width: img.naturalWidth, height: img.naturalHeight };
    place();
  });
  img.src = painting;
  paint.append(img);

  const unfollow = followSize(paint, (size) => {
    frame = size;
    place();
  });
  return () => {
    unfollow();
    img.remove();
  };
}
