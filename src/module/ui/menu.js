/* Vendored from design/menu.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/menu.js and re-run `node scripts/port-design-js.mjs`. */
/**
 * The right-click menu.
 *
 * One at a time, on <body>, closed by anything that means "not that".
 *
 * The API is a plain array of rows and a callback, rather than a class you
 * instantiate and keep: a context menu has no state worth owning between
 * openings, and every menu in this system is built fresh from the thing that
 * was right-clicked. Handing it a list means the caller can decide what is
 * on it *at the moment it opens*, which is the only moment the answer is
 * knowable — a menu registered once at mount would be describing a row that
 * has since been equipped, shelved or spent.
 *
 *   menu(event, [
 *     { k: 'Open', run: () => …             },
 *     { sep: true                           },
 *     { k: 'Delete', warn: true, run: () => …, off: 'You do not own this' },
 *   ], 'Broadsword')
 *
 *   k     the label
 *   run   what pressing it does
 *   warn  destructive — drawn in the wound's ink
 *   off   a reason it cannot be pressed; its presence disables the row
 *   sep   a rule instead of a row
 */

let live = null;

/** Close the open menu, if there is one. Safe to call at any time. */
export function closeMenu() {
  if (!live) return;
  const { el, teardown } = live;
  live = null;
  teardown();
  el.remove();
}

/**
 * Open a menu at the pointer.
 *
 * Positioned after insertion rather than before, because where it goes
 * depends on how big it turned out to be, and how big it turned out to be
 * depends on the longest label in a list the caller just built. It is placed
 * off-screen for one frame, measured, then moved — one reflow, no flicker.
 *
 * It flips rather than slides when it will not fit. Sliding keeps a corner
 * under the pointer and puts an arbitrary row under it; flipping keeps the
 * *first* row under the pointer, which is the one the menu was opened to
 * reach.
 */
export function menu(event, rows, title) {
  closeMenu();
  event.preventDefault();

  const el = document.createElement('div');
  el.className = 'dh ctxm';
  el.style.left = '-9999px';
  el.style.top = '0';
  el.innerHTML =
    (title ? `<span class="hd">${esc(title)}</span>` : '') +
    rows
      .map((r, i) =>
        r.sep
          ? '<span class="sep"></span>'
          : `<button type="button" class="mi${r.warn ? ' warn' : ''}" data-i="${i}"` +
            `${r.off ? ` disabled title="${esc(r.off)}"` : ''}><i></i>${esc(r.k)}</button>`,
      )
      .join('');
  document.body.appendChild(el);

  const pad = 6;
  const box = el.getBoundingClientRect();
  const x = event.clientX + box.width + pad > innerWidth
    ? Math.max(pad, event.clientX - box.width)
    : event.clientX;
  const y = event.clientY + box.height + pad > innerHeight
    ? Math.max(pad, event.clientY - box.height)
    : event.clientY;
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;

  el.addEventListener('click', (e) => {
    const b = e.target.closest('.mi');
    if (!b || b.disabled) return;
    const row = rows[Number(b.dataset.i)];
    // Closed before the action runs, not after: an action that opens a
    // window or a dialog would otherwise leave the menu sitting on top of
    // the thing it just summoned.
    closeMenu();
    row?.run?.();
  });

  /* Every way out. `capture` on the pointer listeners so a click on a
     control underneath closes the menu *and* reaches the control — a menu
     that ate the first click after it would cost a second one every time.
     `pointerdown` rather than `click` for the same reason a menu closes on
     press: by the time a click completes, the thing under it has already
     been decided.

     Scroll is a close rather than a reposition. The menu is anchored to a
     point in the viewport and the row it is about is anchored to the
     document; the moment those disagree the menu is pointing at something
     it does not mean. */
  const away = (e) => { if (!el.contains(e.target)) closeMenu(); };
  const key = (e) => { if (e.key === 'Escape') closeMenu(); };
  addEventListener('pointerdown', away, true);
  addEventListener('keydown', key, true);
  addEventListener('scroll', closeMenu, true);
  addEventListener('resize', closeMenu, true);
  addEventListener('blur', closeMenu);

  live = {
    el,
    teardown() {
      removeEventListener('pointerdown', away, true);
      removeEventListener('keydown', key, true);
      removeEventListener('scroll', closeMenu, true);
      removeEventListener('resize', closeMenu, true);
      removeEventListener('blur', closeMenu);
    },
  };
  return el;
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
