/* Vendored from design/swap.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/swap.js and re-run `node scripts/port-design-js.mjs`. */
// Moving a card between the loadout and the vault — the gesture, and the
// motion it produces.
//
// Two paths to the same move, on purpose. Click-to-arm then click-to-land is
// the one that always works: it survives touch, it survives a keyboard, and
// it survives a hand that cannot hold a button down for 400ms. Drag is the
// one that feels like handling a card, and it is what anyone who has used a
// deckbuilder will try first. Neither is the "real" one — they commit through
// the same call and produce the same animation, so there is nothing to learn
// twice and nothing that can drift.
//
// The animation is a FLIP, and it has to be: committing a swap repaints the
// pane, which destroys every row and builds new ones. Nothing survives to be
// transitioned. So the rects are measured *before* the repaint, re-measured
// after, and the difference is played backwards — the row appears to travel
// from where it was to where it now is, while never actually having moved.
// Every other row in both lists reflows around it and is flipped too, at a
// shorter duration, so the list closes over the gap rather than snapping.
//
// The drop case has one extra wrinkle worth naming. On a drag the card is
// already under the pointer when it commits, not back in its old slot — so
// flipping it from its captured rect would send it back up the screen and
// then down again. The proxy's live rect is passed in as an override for
// exactly that one row: it flies from the hand, and everything else flies
// from where it was.

import { settled } from './settle.js';

/* Decisive, with the smallest possible settle and no overshoot. A card being
   filed is not a spring. */
const EASE  = 'cubic-bezier(.22,.9,.24,1)';
const MOVE  = 420;   // the card that changed hands
const SHIFT = 300;   // everything that reflowed around it
const FLY   = 200;   // proxy → its landing rect, and proxy → home on a cancel
const LIFT  = 6;     // px of travel before a press becomes a drag

/* ── FLIP ─────────────────────────────────────────────────────────*/

/* Called immediately before the repaint. `data-fk` is the card's own key
   rather than its index, because an index is exactly the thing a swap
   changes — flipping by index would animate every row into its neighbour.

   Every travel still in flight is cancelled on the way past, and that is
   not tidiness. `getBoundingClientRect()` reports the *animated* box, so a
   second swap begun while the first is still moving would measure a row
   halfway through its journey and fly the next card from a place it has
   never been. Cancelling first puts every row back where the layout says
   it is; the interrupted travel snaps, which is the honest report of two
   things asked for at once. Nothing sticks, because no travel is filled —
   see flip(). */
export const capture = win => {
  const m = new Map();
  win.querySelectorAll('[data-fk]').forEach(el => {
    el.getAnimations().forEach(a => a.cancel());
    m.set(el.dataset.fk, el.getBoundingClientRect());
  });
  return m;
};

/* `mode` names the arrival the moved row wears — or is null for a move
   that should travel and nothing more. Equipping a weapon is one: the item
   really does cross the gear tab from the carried list into its slot, so
   the travel is true, but a recall's sweep and brackets say "this card is
   in your hand now" and a breastplate has not joined a loadout. */
export function flip(win, before, {moved = null, from = null, mode = 'recall'} = {}){
  win.querySelectorAll('[data-fk]').forEach(el => {
    const k = el.dataset.fk;
    const b = (k === moved && from) ? from : before.get(k);
    if(!b) return;                                  // a card that was not on screen before
    const a = el.getBoundingClientRect();
    const dx = b.left - a.left, dy = b.top - a.top;
    if(k !== moved && Math.abs(dx) < .5 && Math.abs(dy) < .5) return;
    /* No `fill`. Every travel ends on the element's own `transform:none`,
       so a superseded or cancelled one leaves nothing behind — which is
       the whole guarantee that a row cannot be stranded mid-flight by a
       second swap landing on top of the first. */
    el.animate([{transform:`translate(${dx}px,${dy}px)`}, {transform:'none'}],
               {duration: k === moved ? MOVE : SHIFT, easing: EASE});
  });

  if(!moved || !mode) return;
  const el = win.querySelector(`[data-fk="${CSS.escape(moved)}"]`);
  if(!el) return;
  /* The arrival, which is a *class* rather than more script: it is the sweep,
     the brackets and the saturation ramp, and all three belong in CSS where
     their timings can be read next to each other. settled() takes them off
     again — see settle.js for why `animation.finished` cannot. */
  const cls = mode === 'shelve' ? 'shelved' : 'recalled';
  el.classList.add(cls);
  settled(el).then(() => el.classList.remove(cls));
}

/* ── the gesture ──────────────────────────────────────────────────
   Bound ONCE, on the layer that holds the window rather than on the window
   — and unlike peeks(), which is re-bound on every paint. That difference
   is not a style choice, it is the only arrangement that works: picking a
   card up arms it, arming repaints, and a repaint replaces .win and every
   row inside it. A drag bound to the window would spend the rest of its
   life talking to a detached tree — the proxy followed the pointer, the
   hit test found nothing because `win.contains()` was asking a document
   fragment, and the drop silently did nothing.
   So the window is looked up per call, never captured, and the pointer is
   captured on the layer, which is the one node here that outlives a paint.

   The caller owns the data and the repaint; this owns the pointer and the
   DOM.

   api: {
     armed()        → index of the armed vault card, or null
     arm(i)         → arm / disarm vault card i
     recall(vi, li) → vault[vi] into loadout slot li (li < 0 = an empty slot)
     shelve(li)     → loadout[li] back to the vault
     can(vi)        → is the recall payable right now
   }
   Every one of them repaints; none of them animate. The animation is this
   file's job and is driven off capture()/flip() at the call site, so a swap
   committed by drag and a swap committed by click cannot look different. */
export function swaps(root, api){
  const win = () => root.querySelector('.win');
  let noclick = false;   // a drag ends in a click event; that click is not a click

  root.addEventListener('click', e => {
    if(noclick) return;
    const t = e.target;
    /* Shelve is checked before the control bail, not after: it *is* a
       button, and the bail exists to keep other people's controls out of
       the swap, not to keep the swap out of its own. */
    const sh = t.closest('[data-shelve]');
    if(sh){ api.shelve(+sh.dataset.shelve); return; }
    if(t.closest('button,input,[data-act]')) return;

    const vt = t.closest('[data-vt]');
    if(vt){ api.arm(+vt.dataset.vt); return; }

    const ld = t.closest('[data-ld]');
    if(ld && api.armed() != null){ api.recall(api.armed(), +ld.dataset.ld); return; }

    // anywhere else inside the tab disarms, the same way clicking off a
    // pinned peek drops it — an armed card is a held thought, not a mode
    if(api.armed() != null && t.closest('.pnl')) api.arm(api.armed());
  });

  root.addEventListener('pointerdown', e => {
    if(e.button) return;
    const row = e.target.closest('[data-drag]');
    if(!row || e.target.closest('button,input,[data-act]')) return;

    const x0 = e.clientX, y0 = e.clientY;
    const vi = row.dataset.vt != null ? +row.dataset.vt : null;
    const li = row.dataset.ld != null ? +row.dataset.ld : null;
    const sel = vi != null ? `[data-vt="${vi}"]` : `[data-ld="${li}"]`;

    let live = false, proxy = null, home = null, over = null;

    const at = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const w = win();
      if(!el || !w || !w.contains(el)) return null;
      // a vault card lands on a loadout row or an empty slot; a loadout card
      // lands anywhere in the vault panel, because the vault has no order and
      // therefore no slot to be precise about
      return vi != null ? el.closest('[data-ld]') : el.closest('.pnl.vaultp');
    };

    const start = () => {
      live = true;
      /* On the layer, not on <body>. Dragging is a state of the surface you
         are dragging on — with two sheets open, only one of them is being
         dragged on — and a flag on <body> cannot say which. It also has to
         be inside our own root for the rule that reads it to reach it. */
      root.classList.add('dragging');
      // arming on lift means the loadout lights up as targets and the cost
      // strip prices the move — the drag and the click share one state, so
      // there is no second "being dragged" mode to keep in sync. It also
      // repaints, which is why the row is looked up again afterwards: the
      // one this handler was entered on no longer exists.
      if(vi != null && api.armed() !== vi) api.arm(vi);
      const src = win()?.querySelector(sel);
      if(!src) return stop();
      home = src.getBoundingClientRect();
      src.classList.add('lift');

      proxy = document.createElement('div');
      /* `dh` because this is the one node we draw outside our own root: it
         goes on <body> so the scroller it came out of cannot clip it, which
         also puts it outside the element carrying the palette. */
      proxy.className = 'dh dragproxy';
      proxy.style.width = home.width + 'px';
      proxy.style.height = home.height + 'px';
      const inner = document.createElement('div');
      inner.className = 'in';
      inner.append(src.querySelector('.spine').cloneNode(true));
      proxy.append(inner);
      document.body.append(proxy);
    };

    const put = (x, y) => {
      proxy.style.transform =
        `translate3d(${x - x0 + home.left}px,${y - y0 + home.top}px,0)`;
    };

    const stop = () => {
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerup', done);
      root.removeEventListener('pointercancel', cancel);
      root.classList.remove('dragging');
      over?.classList.remove('over');
      over = null;
    };

    const move = ev => {
      if(!live){
        if(Math.hypot(ev.clientX - x0, ev.clientY - y0) < LIFT) return;
        // captured on the layer, not the row: arming has already replaced
        // the row, and a capture on a detached node is a capture that never
        // reports another move
        try { root.setPointerCapture(ev.pointerId); } catch { /* no capture */ }
        start();
        if(!live) return;
      }
      put(ev.clientX, ev.clientY);
      const t = at(ev.clientX, ev.clientY);
      if(t === over) return;
      over?.classList.remove('over');
      over = t;
      over?.classList.add('over');
    };

    const done = ev => {
      const was = live;
      const drop = was ? at(ev.clientX, ev.clientY) : null;
      stop();
      if(!was) return;
      noclick = true; setTimeout(() => { noclick = false; }, 0);

      const ok = drop && (vi != null
        ? drop.dataset.ld != null && api.can(vi)
        : drop.classList.contains('vaultp'));

      if(!ok) return bounce(!!drop && vi != null && !api.can(vi));

      /* The proxy's rect is the override handed to flip(): this card is
         already in the hand, so it must fly from the hand. Flipping it from
         its old slot instead would send it back up the screen first. */
      const r = proxy.getBoundingClientRect();
      proxy.remove(); proxy = null;
      if(vi != null) api.recall(vi, +drop.dataset.ld, r);
      else           api.shelve(li, r);
    };

    /* Nothing happened, or something happened the rules refuse. Either way
       the card goes back where it came from rather than vanishing — a card
       that disappears on a bad drop reads as a card you lost. */
    const bounce = (refused) => {
      const p = proxy; proxy = null;
      if(!p) return;
      const back = p.animate(
        [{transform: p.style.transform}, {transform:`translate3d(${home.left}px,${home.top}px,0)`}],
        {duration: FLY, easing: EASE, fill:'forwards'});
      let landed = false;
      const land = () => {
        if(landed) return;
        landed = true;
        p.remove();
        win()?.querySelector('.lift')?.classList.remove('lift');
        if(refused) api.refuse?.();
      };
      back.onfinish = land;
      setTimeout(land, FLY + 80);        // an occluded window never finishes
    };

    const cancel = () => { const was = live; stop(); if(was) bounce(false); };

    root.addEventListener('pointermove', move);
    root.addEventListener('pointerup', done);
    root.addEventListener('pointercancel', cancel);
  });
}
