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
 * So the frame is the **viewport**, and everything else is the same: `CARD`,
 * `.peeklayer`, `.pkc`, the 262px 5:7 card, right of the row and flipped when
 * there is no room, centred on the row and clamped, hover to show. A player who
 * learned that gesture on a spine has learned it here.
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

import { cardFitter } from "./fit-cards.ts";

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
   * chooses the card, and a click that both chose a card and parked a 262px
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

export function dialogPeeks({ root, layer, rows, pin = true }: DialogPeekOptions): void {
  /* Onto <body>, and it is not optional. `position:fixed` was the obvious
     answer and it does not work: Foundry gives every `.window-content` a
     `backdrop-filter`, and a filtered element is the containing block for its
     fixed descendants — so a layer that says `fixed` inside a dialog is still
     framed by the dialog, and the card flies to coordinates that were right
     for a frame it does not have. It fails *quietly*: the layer reports
     `fixed` and the dialog's own box.

     The host carries `dh` for the palette; the layer stays a descendant of it,
     so every rule `sheet.css` writes for `.peeklayer` and `.pkc` lands
     untouched. That is the difference between hosting the sheet's peek and
     restyling a copy of it. */
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
     `apps/fit-cards.ts`. */
  cardFitter(() => layer).run();

  let open: HTMLElement | null = null;
  let pinned = false;

  const cardFor = (row: HTMLElement) =>
    layer.querySelector<HTMLElement>(`.pkc[data-peek="${row.dataset.peek}"]`);

  /* Only `close(true)` clears a pin, so pointer traffic cannot dismiss one. */
  const close = (force?: boolean): void => {
    if (pinned && !force) return;
    open?.classList.remove("on", "pin");
    open = null;
    pinned = false;
  };

  const show = (row: HTMLElement, hold?: boolean): void => {
    const card = cardFor(row);
    if (!card) return;
    if (card === open) {
      if (hold) {
        pinned = true;
        card.classList.add("pin");
      }
      return;
    }
    close(true);

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

    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
    // Grows out of the row it belongs to, so the flip reads as a flip.
    card.style.transformOrigin = side === "center" ? "center center" : `${side} center`;
    card.classList.add("on");
    if (hold) card.classList.add("pin");
    open = card;
    pinned = !!hold;
  };

  /* Delegated, and `pointerover` rather than `pointerenter`, because only a
     delegating listener can be one listener. The layer is
     `pointer-events:none`, so moving onto anything that is not a row closes. */
  root.addEventListener("pointerover", (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const row = t.closest<HTMLElement>(rows);
    if (row) show(row);
    else close();
  });

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
        close(true);
      }
    });
  }
  // A scroll under an open peek leaves it pointing at the wrong row.
  root.addEventListener("scroll", () => close(true), true);
  window.addEventListener("resize", () => close(true));
}
