/**
 * The sheet's peek, inside a dialog.
 *
 * `peek.js` does this for the character sheet and is not reusable here, for a
 * reason that is structural rather than stylistic: it positions and clamps
 * against the sheet *window*, which is the one boundary a peek on a sheet must
 * not cross. A dialog is 500px of chrome floating over a board — a card clamped
 * inside that would have nowhere to go, and the dialog's own scroller would clip
 * it besides, which is the exact bug that put the sheet's cards in a layer to
 * begin with, arriving from the other direction.
 *
 * So the frame is the **viewport**, and everything else is the same gesture:
 * right of the row and flipped when there is no room, centred on the row and
 * clamped, hover to show. A player who learned that on a spine has learned it
 * here.
 *
 * ── what it draws now, and its timings ────────────────────────────────
 * The card is `FACE` at full size in gluvtt's own `.dh-peek`, which is where
 * `face.css` already gives a peeked face its 264px outright — the one host in
 * the system that needs no `container-type`, because it states `--dh-w` itself.
 * Three numbers come with it from `pins.tsx`, and they are the feel rather than
 * an implementation detail of the window manager that file is mostly about:
 *
 *   `PEEK_REST_MS` 140 — the rest before a card peeks at all. Long enough that
 *   sweeping the pointer down a list of forty opens nothing, short enough that
 *   stopping on one feels like it opened immediately. Once something *is*
 *   peeked the next row opens at once, which is gluvtt's rule and the right
 *   one: the rest is there to stop a sweep, and a sweep is already over.
 *
 *   `PEEK_GRACE_MS` 250 — the grace after the pointer leaves. In gluvtt it
 *   exists so the peek can be reached, since its own counters and Pin take
 *   presses. Here the layer is `pointer-events:none` and there is nothing on
 *   the card to reach, so what the grace buys is steadiness: a pointer
 *   crossing the gap between two rows, or clipping a row's edge on its way
 *   down, no longer flickers the layer shut and open again.
 *
 *   240ms, `motion.ts`'s `base`, for the growth itself. It is not a face-fx
 *   export — `REVEAL_MS` is the sweep's, not the peek's — so it is written out
 *   here with the curve beside it.
 *
 * The growth is `pins.tsx`'s verbatim: the card comes out of the row it
 * belongs to, from the row's side, at the row's own scale.
 *
 * ── why this is its own file ──────────────────────────────────────────
 * It lived inside `rule-cards.ts` while there was one caller, and the name it
 * had — `wireRulePeeks` — was honest about that. There are two now, and the
 * second is not about rules at all: the domain-card picker offers cards as rows
 * of text, and a row of text is the one thing a card is not. Nothing in the
 * mechanism ever knew what the rows meant. What it needs is a root to delegate
 * on, a layer to draw into and a selector naming which rows peek.
 *
 * `rule-cards.ts` keeps `wireRulePeeks` as one line on top of this, because its
 * callers should go on asking for the thing they want rather than for the
 * machinery underneath it.
 *
 * The one thing the second caller genuinely needed differently is `pin` — see
 * below. It turns on a *gesture*, not a look, and the distinction it draws is
 * whether the row is something you read or something you press.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { PEEK_GRACE_MS, PEEK_REST_MS, bindFaceFx, stillCards } from "../ui/face-fx.js";
import { cardFitter, focusFrom, frameArt } from "./fit-cards.ts";

export interface DialogPeekOptions {
  /** The dialog, where the rows live and every listener is delegated. */
  root: HTMLElement;
  /** The layer holding the cards. Moved onto `<body>`; see below. */
  layer: HTMLElement;
  /** Which rows peek. `closest` is run against it, so it may be compound. */
  rows: string;
  /**
   * Whether clicking a row pins its card open. Default true.
   *
   * True where the row is *inert* — the rules panel's lines, which exist to be
   * read — because a hover peek dies the moment you move toward it, which is
   * fine for "which card is this" and useless for "read this card".
   *
   * False where the row is **the control**. In the domain-card picker a click
   * chooses the card, and a click that both chose a card and parked a 264px
   * copy of it over the list would be one gesture doing two things, one of
   * them in the way. Hover answers "which card is this", which is the whole
   * question a list of names raises; the answer to wanting to read it for
   * longer is to keep the pointer still.
   *
   * It also governs the Escape key. A pinned card is a thing Escape should
   * dismiss before the dialog; a hovered one is dismissed by moving, so
   * swallowing Escape for it would take the dialog's own way out away.
   */
  pin?: boolean;
}

/** Space kept from the row, and from the edges of the screen. */
const GAP = 14;
const EDGE = 12;

/** How wide a peeked face is — `face.css`'s own `--dh-w` for `.dh-peek`. */
const PEEK_WIDTH = 264;

/** `motion.ts`'s `base` and `out`: how the card comes out of its row. */
const GROW_MS = 240;
const GROW_EASE = "cubic-bezier(.16,1,.3,1)";

/* How a card sits while nothing is peeking it, and it is `visibility` rather
   than `display` for the reason `sheet.css` gave for the layer it replaces:
   the fitter has to measure these, and a card with no box measures zero height
   and every step of the ladder "overflows". Off to the side as well, because a
   `.dh-peek` is `position:fixed` and an unplaced one would otherwise sit over
   the top left of the screen taking the layer's drop shadow with it. */
const PARKED = "left:-9999px;top:0;visibility:hidden;opacity:0";

/* The card's own reading, shared with the tilt, the sweep and the chat
   card's arrival, so a person who chose Off gets a peek that appears rather
   than one that grows while the card under it holds still. */
const reduced = (): boolean => stillCards();

export function dialogPeeks({ root, layer, rows, pin = true }: DialogPeekOptions): void {
  /* Onto <body>, and it is not optional. `position:fixed` was the obvious
     answer and it does not work: Foundry gives every `.window-content` a
     `backdrop-filter`, and a filtered element is the containing block for its
     fixed descendants — so a layer that says `fixed` inside a dialog is still
     framed by the dialog, and the card flies to coordinates that were right
     for a frame it does not have. It fails *quietly*: the layer reports
     `fixed` and the dialog's own box.

     The host carries `dh` for the palette; the layer stays a descendant of it,
     so every rule `sheet.css` writes for `.peeklayer` and `face.css` for
     `.dh-peek` lands untouched. That is the difference between hosting the
     sheet's peek and restyling a copy of it. */
  const host = document.createElement("div");
  host.className = "dh peekhost";
  host.append(layer);
  document.body.append(host);

  /* The host outlives the dialog unless something takes it away, and nothing
     will: it is not a child of the window Foundry removes. Watching `body` for
     that removal is cheaper than a close hook and does not care which of the
     several ways out the user took. */
  const gone = new MutationObserver(() => {
    if (root.isConnected) return;
    host.remove();
    gone.disconnect();
  });
  gone.observe(document.body, { childList: true, subtree: true });

  /* A few per frame rather than all of them on the one that opened the
     dialog. The rules panel holds a handful and this was fine; the domain
     card picker holds every card legal at your level, which is forty or more
     at tier 3, and forty solves is forty runs of forced layout landing on the
     frame the window appears — the stall reads as the dialog being slow to
     open rather than as anything to do with cards.

     Nothing measures these but the peek that shows one, and the earliest a
     peek can happen is a hover after the dialog is on screen. The fitter also
     owns the font pass that used to be spelt out here: metrics taken against
     a fallback face are wrong by enough to cost a line. See
     `apps/fit-cards.ts`.

     `.dh-face` rather than the default list, and narrowly: the layer holds
     nothing else, and naming it is what picks the ported eleven-step ladder
     against `.dh-face-plate` over the old card's. */
  cardFitter(() => layer, ".dh-face").run();

  /* The pointer tilt, bound once on the layer. It is delegated from a scope
     root for `face-fx.js`'s own reason, and the layer is the right root here:
     it outlives every peek inside it and goes with the host. */
  bindFaceFx(layer);

  /* Every card parked, and every painting cropped onto its marked point. The
     measured crop is available here for the reason it is available to a chat
     card and nowhere else: this surface has laid the frame out. `data-focus`
     is how the point reaches a file that deliberately does not know what the
     rows mean — see `focusAttr`. */
  for (const card of layer.querySelectorAll<HTMLElement>(".dh-peek")) {
    card.style.cssText = PARKED;
    const face = card.querySelector<HTMLElement>(".dh-face");
    if (face) frameArt(face, focusFrom(card));
  }

  let open: HTMLElement | null = null;
  let pinned = false;
  /* The rest before a peek opens and the grace before it closes. One timer
     each, and any new intention cancels both: a pointer that reaches a second
     row while the first is still resting must not open the first one 140ms
     later over the second one's card. */
  let resting: number | undefined;
  let closing: number | undefined;
  const hold = (): void => {
    window.clearTimeout(resting);
    window.clearTimeout(closing);
  };

  const cardFor = (row: HTMLElement) =>
    layer.querySelector<HTMLElement>(`.dh-peek[data-peek="${row.dataset.peek}"]`);

  /* Only `close(true)` clears a pin, so pointer traffic cannot dismiss one. */
  /* A pinned card has to *look* pinned or it reads as a hover that forgot
     to close. The class is the whole of it: `face.css` carries `.dh-peek.pin`
     — the deeper shadow and the gold rule — the way `sheet.css` carried
     `.pkc.pin` for the peek this one replaces. */
  const markPinned = (card: HTMLElement): void => {
    card.classList.add("pin");
    pinned = true;
  };

  const close = (force?: boolean): void => {
    if (pinned && !force) return;
    if (open) {
      open.classList.remove("pin");
      open.style.cssText = PARKED;
    }
    open = null;
    pinned = false;
  };

  /**
   * The card comes out of the row it belongs to, from the row's side.
   *
   * `pins.tsx`'s own `fromTo`, with the one clamp its anchors never needed:
   * there the anchor is a compact card about 100px wide, so `width / 264` is
   * always a fraction. Here the anchor is a line of text that can be wider
   * than the card it opens, and a start scale above 1 would be the card
   * shrinking into place, which is not what growing out of something looks
   * like.
   */
  const grow = (card: HTMLElement, from: DOMRect, side: string): void => {
    card.style.transformOrigin = side === "center" ? "center center" : `${side} center`;
    if (reduced()) return;
    const scale = Math.min(1, Math.max(0.35, from.width / PEEK_WIDTH));
    const shift = side === "right" ? 30 : -30;
    card.animate(
      [
        { opacity: 0.2, transform: `translateX(${shift}px) scale(${scale})` },
        { opacity: 1, transform: "translateX(0) scale(1)" },
      ],
      { duration: GROW_MS, easing: GROW_EASE },
    );
  };

  const place = (row: HTMLElement, card: HTMLElement, pinning?: boolean): void => {
    const r = row.getBoundingClientRect();
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Right of the row by default, flipped rather than squeezed.
    let left = r.right + GAP;
    let side = "left";
    if (left + w > vw - EDGE) {
      left = r.left - GAP - w;
      side = "right";
    }
    if (left < EDGE) {
      left = Math.max(EDGE, (vw - w) / 2);
      side = "center";
    }

    // Centred on its row, then clamped: a card half off the top of the screen
    // is worse than one not quite level with the row it came from.
    const mid = r.top + r.height / 2 - h / 2;
    const top = Math.min(Math.max(EDGE, mid), Math.max(EDGE, vh - h - EDGE));

    /* `data-from` is what `face.css` reads to put a peek's controls on the
       side away from its card. There are none in a dialog, but it is the
       card's own statement about which way it opened and the growth reads the
       same answer. */
    card.dataset.from = side === "right" ? "right" : "left";
    card.style.cssText =
      `left:${Math.round(left)}px;top:${Math.round(top)}px;visibility:visible;opacity:1`;
    if (pinning) markPinned(card);

    grow(card, r, side);
  };

  const show = (row: HTMLElement, pinning?: boolean): void => {
    const card = cardFor(row);
    if (!card) return;
    hold();
    if (card === open) {
      if (pinning) markPinned(card);
      return;
    }
    /* A rest, so sweeping a list of forty opens nothing — unless something is
       already peeked, in which case the sweep is over and the next row the
       pointer reaches opens at once. A pin is a deliberate press and never
       waits. A row gone by the time its rest is up peeks nothing. */
    const run = (): void => {
      if (!row.isConnected) return;
      close(true);
      open = card;
      place(row, card, pinning);
    };
    if (pinning || open) run();
    else resting = window.setTimeout(run, PEEK_REST_MS);
  };

  /** Let it go after its grace, unless the pointer reaches something first. */
  const leave = (): void => {
    hold();
    closing = window.setTimeout(() => close(), PEEK_GRACE_MS);
  };

  /* Delegated, and `pointerover` rather than `pointerenter`, because only a
     delegating listener can be one listener. The layer is
     `pointer-events:none`, so moving onto anything that is not a row leaves. */
  root.addEventListener("pointerover", (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const row = t.closest<HTMLElement>(rows);
    if (row) show(row);
    else leave();
  });

  /* And leaving the dialog outright, which `pointerover` cannot see: there is
     no row under the pointer to report, and no event on this root at all. The
     peek used to stay up until something else in the dialog was hovered —
     survivable while a peek closed on any stray move, and not once there is a
     grace, because a grace with nothing to end it is a card parked over the
     board. `pointerleave` does not bubble, which is exactly right here: it is
     bound on the root and fires for the root. */
  root.addEventListener("pointerleave", () => leave());

  /* Hover shows, click pins — where the row has nothing else for a click to
     mean. A hover peek dies the moment you move toward it, which is fine for
     "which card is this" and useless for "read this card", and reading it is
     most of why a list of names needs cards at all. Clicking the pinned row
     again unpins; clicking anywhere else in the dialog closes, so a card
     cannot sit over the control you just reached for.

     Both listeners are absent rather than inert when the row *is* a control.
     Escape especially: with nothing pinnable there is nothing for it to
     dismiss, and swallowing it would take away the dialog's own way out. */
  if (pin) {
    root.addEventListener("click", (e) => {
      const t = e.target instanceof Element ? e.target : null;
      const row = t?.closest<HTMLElement>(rows);
      if (!row) {
        close(true);
        return;
      }
      if (pinned && cardFor(row) === open) close(true);
      else show(row, true);
    });

    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && open) {
        e.stopPropagation();
        hold();
        close(true);
      }
    });
  }
  // A scroll under an open peek leaves it pointing at the wrong row. Both of
  // these cancel a rest as well: a card about to open at coordinates taken
  // before the scroll would open in the wrong place.
  root.addEventListener("scroll", () => { hold(); close(true); }, true);
  window.addEventListener("resize", () => { hold(); close(true); });
}
