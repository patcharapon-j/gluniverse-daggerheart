// The hover peek — the full card, one gesture away from its spine.
//
// This exists as its own file because of a bug that has no CSS answer. The
// peek used to be an absolutely positioned child of the row it belonged to,
// and the row lives inside the tab pane, and the tab pane is the scroller.
// An absolutely positioned element is clipped by any ancestor that scrolls,
// so the card was being cut off wherever the pane's box ended — under the
// trait strip at the top, under the window's edge at the bottom. No z-index
// fixes that; it is not a stacking problem, it is a clipping one. Setting
// the pane to overflow:visible while a peek is open would fix the clip and
// break the scrolling, which is worse.
//
// So the cards do not live in the rows. They are rendered once into a layer
// that is a child of the window — outside every scroller, inside the window's
// own clip, which is the one boundary a card genuinely must not cross — and
// positioned by hand against the row that owns them. Rendered once, not on
// demand, so fit() measures them with everything else and a peek never costs
// a layout on hover.

/* Space kept between the card and the row, and between the card and the
   window's edges. The edge margin is larger than it looks like it needs to
   be because the window's bottom-right corner is chamfered. */
const GAP = 14, EDGE = 12;

/* Escape is bound once, at module scope. peeks() runs on every repaint and a
   listener added there would be a listener added per repaint — the leak class
   the delegation above exists to avoid, quietly reintroduced by the one
   listener that cannot live on an element that gets replaced.

   Keyed by window rather than kept as one handle, because two sheets can be
   open at once and the handle would have been whichever of them repainted
   last. Re-mounting the same window replaces its entry; a window that has
   left the document drops out on the next call, which is the only cleanup
   this needs — the closure is small and the map is at most one per sheet. */
const closers = new Map();

/** Shut every open peek. Escape does this; so does anything that is about
    to put something else on top of the sheet — see `closePeeks` below. */
export const closePeeks = () => {
  for(const [win, close] of closers){
    if(win.isConnected) close(true); else closers.delete(win);
  }
};
document.addEventListener('keydown', e => { if(e.key === 'Escape') closePeeks(); });

export function peeks(win){
  const layer = win.querySelector('.peeklayer');
  if(!layer) return;
  let open = null, pinned = false;

  /* The pin outlives the repaint, and it has to. Spending a charge repaints
     the pane, which replaces .win and every card in it — so the state cannot
     live in this closure, which is replaced along with them. It is parked on
     the *parent*, the one node that survives, and re-applied below.
     Without this, reading a card and then touching anything closed the card. */
  const host = win.parentElement;

  /* Hover shows, click pins. A hover peek dies the moment you move toward it,
     which is fine for "which card is this" and useless for "read this card" —
     a full card is three paragraphs and you cannot read three paragraphs while
     holding a mouse still. Pinning is the same gesture doubled rather than a
     new affordance: click the row you are already pointing at.
     Only `close(true)` clears a pin, so pointer traffic cannot dismiss one. */
  const close = (force) => {
    if(pinned && !force) return;
    if(open){ open.classList.remove('on', 'pin'); open = null; }
    pinned = false;
    delete host.dataset.pin;
  };

  const show = (pk, pin) => {
    // a card hovering over the board while another one is in your hand is a
    // card you cannot see past
    // …and the flag is on the surface being dragged, not on <body>: two
    // sheets can be open and only one of them has a card in the hand.
    if(host.closest('.dragging')) return;
    const card = layer.querySelector(`[data-peek="${pk.dataset.pk}"]`);
    if(!card) return;
    if(card === open){
      if(pin){ pinned = true; card.classList.add('pin'); host.dataset.pin = pk.dataset.pk; }
      return;
    }
    close(true);

    /* The layer, not the window, is the frame: it spans the sheet body, so
       clamping against it keeps a peek off the title bar without anyone
       having to know how tall the title bar is. */
    const wr = layer.getBoundingClientRect(), r = pk.getBoundingClientRect();
    const w = card.offsetWidth, h = card.offsetHeight;

    // Right of the row by default. Flipped rather than squeezed: at a narrow
    // window the card opens back over the rail, which reads fine — a peek is
    // transient and the rail is still there when it closes.
    let left = r.right - wr.left + GAP, side = 'left';
    if(left + w > wr.width - EDGE){ left = r.left - wr.left - GAP - w; side = 'right'; }
    if(left < EDGE){ left = Math.max(EDGE, (wr.width - w) / 2); side = 'center'; }

    // Centred on its row, then clamped into the window. A card that opens
    // half off the top is worse than one that is not quite level with the
    // row it came from.
    const mid = r.top + r.height / 2 - wr.top - h / 2;
    const top = Math.min(Math.max(EDGE, mid), Math.max(EDGE, wr.height - h - EDGE));

    card.style.left = Math.round(left) + 'px';
    card.style.top  = Math.round(top) + 'px';
    // grows out of the row it belongs to, so the direction of the flip is
    // legible rather than arbitrary
    card.style.transformOrigin = side === 'center' ? 'center center' : `${side} center`;
    card.classList.add('on');
    if(pin){ card.classList.add('pin'); host.dataset.pin = pk.dataset.pk; }
    open = card;
    pinned = !!pin;
  };

  /* Delegated on the window, not bound per row: the pane is rebuilt on every
     tab change and every resize, and a listener per row would have to be
     re-attached each time — or leak. pointerover rather than pointerenter
     because only a delegating listener can be one listener. */
  win.addEventListener('pointerover', e => {
    const t = e.target instanceof Element ? e.target : null;
    if(!t) return;
    const pk = t.closest('[data-pk]');
    if(pk) show(pk);
    // the layer itself is pointer-events:none, so this only fires for real
    // sheet content — moving onto anything that is not a row closes the peek
    else if(!t.closest('.peeklayer')) close();
  });

  /* Click pins, and clicking the pinned row again unpins. Bound here rather
     than in the sheet's own click delegation because the peek owns the state:
     the sheet has no business knowing which card is open. Capture phase, so
     the decision is made before the sheet repaints out from under it.

     Two rules, and the boundary between them is the row:
       outside a row  — always close, buttons included. Pressing an attack
                        button should not leave a card hovering over the
                        readout it just produced.
       inside a row   — a control is a control first. Spending a charge lives
                        on the row precisely so it does not need the card
                        open, and pinning on top of the box you just clicked
                        would undo that. */
  win.addEventListener('click', e => {
    const t = e.target instanceof Element ? e.target : null;
    if(!t) return;
    const pk = t.closest('[data-pk]');
    if(!pk){ close(true); return; }
    if(t.closest('button,input,select,textarea,[data-act]')) return;
    /* In the vault tab a click on a row means "move this card", so the pin
       stands down there — hover still opens the card, which is the gesture
       that tab is actually for. Two meanings for one click on one row is
       the kind of thing that is fine until the day it is not. */
    if(pk.hasAttribute('data-swap')) return;
    const card = layer.querySelector(`[data-peek="${pk.dataset.pk}"]`);
    if(pinned && card === open) close(true);
    else show(pk, true);
  }, true);
  closers.set(win, close);

  win.addEventListener('pointerleave', () => close());
  // a scroll under an open peek would leave it pointing at the wrong row
  win.addEventListener('scroll', () => close(true), true);

  /* Re-apply a pin that survived the repaint. If its row is gone — a tab
     change, an item spent to nothing — the pin goes with it rather than
     hanging over a sheet that no longer contains what it describes. */
  const key = host.dataset.pin;
  if(key){
    const pk = win.querySelector(`[data-pk="${key}"]`);
    if(pk) show(pk, true); else delete host.dataset.pin;
  }
}
