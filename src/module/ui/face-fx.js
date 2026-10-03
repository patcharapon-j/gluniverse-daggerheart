/* Vendored from design/face-fx.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/face-fx.js and re-run `node scripts/port-design-js.mjs`. */
// The card's imperative behaviours, ported from gluvtt's `tilt.ts`,
// `sweep.ts` and the two fitting hooks inside `CardFace.tsx` and
// `CompactCard.tsx`. Four things, and they are all the same shape: measure or
// read the pointer, write a custom property or a data attribute, let CSS do
// the rest. Nothing here owns state, nothing here renders, and nothing here
// knows what a card is beyond a class name.
//
// gluvtt held each of these in a React hook bound to a ref, so a re-render
// re-bound them and an unmount cleaned them up. This runs inside Foundry,
// where a sheet re-render replaces the window's innerHTML wholesale and
// every listener bound to an element inside it goes with it. So the pointer
// behaviours are **delegated from a scope root** instead — bind once per
// application, survive every re-render — and the measuring behaviours are
// plain functions the sheet calls after each render, which is the same thing
// `fit()` in card.js already is.
//
// ── THE FOUNDRY POINTER PROBLEM ─────────────────────────────────────
// gluvtt's tilt reads `getBoundingClientRect()` and `event.clientX/Y`. Both
// are viewport space and both already include every ancestor transform, so
// the fraction `(x - rect.left) / rect.width` is correct under a scaled
// window, a scrolled list and a dragged window with no adaptation at all —
// that part of the maths was never the fragile bit. Three other things are,
// and all three bite harder in Foundry than in the web app:
//
//  1. **Measuring the box that is turning.** A rotated element's rect is its
//     axis-aligned *bounding* box: wider than the element, and offset. So
//     reading the rect of the thing the tilt transform lands on feeds the
//     turn back into the reading, and the card hunts. The markup keeps the
//     transform on an inner element (`.dh-face-tilt`) and this measures the
//     flat host (`.dh-face`), which is also why the compact card's listener
//     is on `.dh-cc` and not on `.dh-cc-face` as gluvtt binds it —
//     `.dh-cc-face` is what `:hover` and `:active` translate and scale.
//     One departure, and it is the fix, not a regression.
//  2. **Foundry's own scaling.** Window content can sit under a CSS
//     `transform: scale()` (the UI scale, and the sheet's own zoom). A
//     *fraction* of a rect is scale-invariant, so the turn and the glare
//     stay right; what is not scale-invariant is anything measured in layout
//     pixels and compared against a viewport number, which is why no number
//     below mixes the two.
//  3. **Re-renders and windows that go away.** A sheet re-render throws the
//     element out mid-hover, so `pointerleave` never fires and the custom
//     properties are never cleared — harmless on a dead element, except the
//     replacement arrives with no `data-touched` and the CSS transition
//     snaps it from a stale angle. Delegation sidesteps it: the properties
//     live on elements that come and go, the listener does not, and a fresh
//     element starts clean.
//
// ── the behaviours ──────────────────────────────────────────────────

/* The only motion gate. Read per event rather than cached: Foundry sessions
   are long and the OS setting can change inside one. */
const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;

/** The most a card turns toward the pointer, in degrees. */
export const MAX_TILT = 6;

/** The elements that turn. Both are the flat host, never the box that moves. */
const TILTS = '.dh-face, .dh-cc';

const TILT_VARS = ['--dh-rx', '--dh-ry', '--dh-px', '--dh-py'];

/**
 * The turn and glare for a pointer at (x, y) over `rect`: −1 to 1 across and
 * down. Clamped, because a pointer can be a pixel outside the box on the
 * event that leaves it and a card should not overshoot on its way to flat.
 */
export function tiltAt(rect, x, y) {
  const across = Math.max(-1, Math.min(1, ((x - rect.left) / rect.width) * 2 - 1));
  const down = Math.max(-1, Math.min(1, ((y - rect.top) / rect.height) * 2 - 1));
  return {rotateX: -down * MAX_TILT, rotateY: across * MAX_TILT, across, down};
}

/**
 * A card under the hand turns toward the pointer, up to 6°, with the painting
 * sliding behind the glass and a light glare following. Nothing moves until
 * it is touched, and under reduced motion it never turns.
 *
 * Returns a function that unbinds it.
 *
 * No requestAnimationFrame and no state, and that is the design rather than
 * a shortcut. The four numbers are written straight to custom properties, so
 * a moving pointer costs a style recalculation on one element and nothing
 * else — no render, no diff, no frame to be late for. Batching into a rAF
 * would add a frame of lag to the one effect on the card whose whole job is
 * to feel attached to the hand, to save work that the compositor is already
 * doing off the main thread. The transforms are on `transform` and `opacity`
 * alone for the same reason.
 */
export function tilt(scope = document) {
  /* `pointermove` and `pointerout` rather than enter/leave: those two do not
     bubble, and delegation needs events that do. `pointerout` also fires on
     every move between children, so the relatedTarget check is what makes it
     mean "left the card" instead of "left the pennant". */
  const move = (event) => {
    const card = event.target.closest?.(TILTS);
    if (!card) return;
    if (reduced() || event.pointerType === 'touch') return;
    const rect = card.getBoundingClientRect();
    /* A card inside a collapsed window or a `display:none` tab measures
       zero, and dividing by it writes NaN into the properties — which CSS
       then ignores, leaving the previous angle stuck on. */
    if (rect.width <= 0 || rect.height <= 0) return;
    const {rotateX, rotateY, across, down} = tiltAt(rect, event.clientX, event.clientY);
    card.style.setProperty('--dh-rx', `${rotateX.toFixed(2)}deg`);
    card.style.setProperty('--dh-ry', `${rotateY.toFixed(2)}deg`);
    card.style.setProperty('--dh-px', across.toFixed(3));
    card.style.setProperty('--dh-py', down.toFixed(3));
    card.dataset.touched = '';
  };
  const out = (event) => {
    const card = event.target.closest?.(TILTS);
    if (!card || (event.relatedTarget && card.contains(event.relatedTarget))) return;
    for (const name of TILT_VARS) card.style.removeProperty(name);
    delete card.dataset.touched;
  };
  /* Capture phase: a card's own press handler may stop propagation, and the
     card going flat is not the press's business. */
  scope.addEventListener('pointermove', move, true);
  scope.addEventListener('pointerout', out, true);
  /* A drag that leaves the window, a pointer the OS takes away, a window
     closing under the cursor — all end the hover without a `pointerout` on
     the card. Cancelling clears whichever card is still lit. */
  const drop = () => { for (const c of scope.querySelectorAll(`${TILTS}[data-touched]`)) {
    for (const name of TILT_VARS) c.style.removeProperty(name);
    delete c.dataset.touched;
  } };
  scope.addEventListener('pointercancel', drop, true);
  return () => {
    scope.removeEventListener('pointermove', move, true);
    scope.removeEventListener('pointerout', out, true);
    scope.removeEventListener('pointercancel', drop, true);
    drop();
  };
}

/* ── fit ──────────────────────────────────────────────────────────
   [the painting's height, the type's scale] to try in turn until the rules
   fit. Eleven steps, in one order, and the order is the whole idea: the
   painting gives way first, through six steps and thirty-one points of card
   height, because a shorter painting costs the composition nothing and costs
   the prose nothing at all. Only once the painting is down to 47 — a
   letterbox, and still a painting — does the type start stepping, and it
   steps five times to 0.72 rather than solving for a size, because wrapped
   height against type scale is not a relationship a formula gets right and
   overshooting costs legibility you cannot buy back.

   A card that still does not fit clips, rather than lying about it. This is
   the same bargain `fit()` in card.js makes with --plate and --u; the
   numbers differ because the two cards are different cards. */
export const FIT = [
  [78, 1], [72, 1], [66, 1], [60, 1], [54, 1], [47, 1],
  [47, 0.93], [47, 0.87], [47, 0.81], [47, 0.76], [47, 0.72],
];

/**
 * Fits the rules on the plate for every full card in `scope`: the painting
 * gives way first, then the type steps down.
 *
 * `scrollHeight` and `clientHeight` are both layout pixels, so the
 * comparison is unaffected by whatever scale Foundry's window is under —
 * which is the reason the ladder is expressed as unitless custom properties
 * the stylesheet turns into lengths, rather than as pixels measured here.
 *
 * Call it after each render, and it calls itself again once fonts resolve:
 * metrics measured against a fallback face are wrong by enough to cost a
 * line, and in Foundry the first render of a sheet almost always beats the
 * webfont. The second pass is guarded on the element still being in the
 * document, because by then the sheet may have re-rendered twice.
 */
export function fit(scope = document) {
  const run = () => {
    for (const card of scope.querySelectorAll('.dh-face')) {
      const plate = card.querySelector('.dh-face-plate');
      if (!plate) continue;
      /* A plate in a collapsed window or an inactive tab has no height, and
         every step of the ladder "overflows". Walking it to the floor there
         leaves the card at 47/0.72 when the window opens — tiny type on a
         card with three lines of rules. Better to leave it alone and be
         called again. */
      if (plate.clientHeight <= 0) continue;
      for (const [art, scale] of FIT) {
        card.style.setProperty('--dh-art-h', String(art));
        card.style.setProperty('--dh-fs', String(scale));
        if (plate.scrollHeight <= plate.clientHeight + 1) break;
      }
    }
  };
  run();
  const root = scope.ownerDocument ?? scope;
  void document.fonts?.ready.then(() => {
    if (root.contains?.(scope) || scope === document) run();
  });
}

/**
 * Fits each compact card's name in two lines: full size at first, then
 * smaller, five steps to 0.72. Both axes are checked — a name can overflow
 * by height on three words or by width on one long one, and "Grindletooth"
 * alone claims a line.
 */
export const NAME_FIT = [1, 0.92, 0.84, 0.78, 0.72];

export function nameFit(scope = document) {
  const run = () => {
    for (const heading of scope.querySelectorAll('.dh-cc-foot h3')) {
      if (heading.clientHeight <= 0) continue;
      for (const step of NAME_FIT) {
        heading.style.setProperty('--dh-cc-fit', String(step));
        if (heading.scrollHeight <= heading.clientHeight + 1 &&
            heading.scrollWidth <= heading.clientWidth + 1) break;
      }
    }
  };
  run();
  const root = scope.ownerDocument ?? scope;
  void document.fonts?.ready.then(() => {
    if (root.contains?.(scope) || scope === document) run();
  });
}

/* ── sweep ────────────────────────────────────────────────────────
   Marking a card used: a line of the domain's light falls down it and drains
   it to grey behind it; unmarking climbs back up. The grey is CSS on the
   card's `data-state`; this lights the line only while it moves, so a card
   at rest carries no line.

   620 is gluvtt's `reveal` motion token and 2.2 is how cards.css times the
   line against it. Both are written out because this file cannot import the
   web app's token table, and the number is one the CSS port has to match
   exactly — the attribute has to outlast the animation or the line vanishes
   mid-fall. */
export const REVEAL_MS = 620;
export const SWEEP_MS = REVEAL_MS * 2.2;

/**
 * Runs the sweep over `card`. Call it when the card *changes* to or from
 * used, never on render — a sheet that swept on every render would relight
 * every used card every time anything on the sheet moved.
 */
export function sweep(card) {
  if (!card || reduced()) return;
  card.dataset.sweeping = '';
  const done = window.setTimeout(() => delete card.dataset.sweeping, SWEEP_MS);
  return () => { window.clearTimeout(done); delete card.dataset.sweeping; };
}

/**
 * Sweeps every card in `scope` whose state no longer matches the last one
 * seen, which is the form a re-rendering sheet can actually use: it has the
 * new markup and no memory of the old. The memory lives on the element, as
 * `data-swept`, so it is thrown away with the element — a card that arrives
 * already used (a sheet opening, a tab switching to it) has no previous
 * state to differ from and correctly does not sweep.
 */
export function sweepChanged(scope = document) {
  for (const card of scope.querySelectorAll('.dh-face, .dh-cc')) {
    const now = card.dataset.state === 'used' ? 'used' : 'rest';
    const was = card.dataset.swept;
    card.dataset.swept = now;
    if (was !== undefined && was !== now) sweep(card);
  }
}

/* ── peek growth ──────────────────────────────────────────────────
   The two timings the Peek is built on, ported ahead of the Peek itself.
   `pins.tsx`'s card-window is out of scope for this port, but these two
   numbers are not an implementation detail of it — they are the feel, and
   they belong with the card.

   140ms is the rest before a card peeks: long enough that sweeping the
   pointer across a loadout of five cards opens nothing, short enough that
   stopping on one feels like it opened immediately.

   250ms is the grace after the pointer and focus leave, and it exists so the
   peek is reachable: the peek appears *beside* the card, so getting to it
   means leaving the card, and a peek that closed the moment you left could
   never be clicked. */
export const PEEK_REST_MS = 140;
export const PEEK_GRACE_MS = 250;

/**
 * Binds every pointer behaviour over `scope` and returns a function that
 * unbinds them. The measuring passes are not here because they are not
 * bindings — call `fit` and `nameFit` after each render.
 */
export function bindFaceFx(scope = document) {
  return tilt(scope);
}
