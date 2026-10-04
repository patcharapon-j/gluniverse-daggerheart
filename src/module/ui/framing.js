/* Vendored from design/framing.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/framing.js and re-run `node scripts/port-design-js.mjs`. */
// Where a painting is cut when the frame is not the painting's shape.
//
// Every card painting here is a wide landscape and every frame that shows one
// is not: the printed plate is a letterbox the fitter moves between 30% and
// 70cqw of the card, the compact card's plate is narrower still, and a chat
// card's is narrower again. So something always has to be thrown away, and the
// only question is which part.
//
// `background-size:cover` and `object-fit:cover` answer it the same way —
// throw away the outside, keep the middle. That is the wrong answer for these
// paintings, and wrong in the one way nobody forgives: a figure's head sits in
// the upper third of almost every one of them, so a centred crop of a wide
// painting into a narrow frame takes the face off. It looks fine at card size,
// where the plate is wide enough that the middle still contains the subject,
// and it falls apart at the compact and chat sizes — which is exactly backwards
// from where the art matters most, because a compact card is often all a player
// sees of it.
//
// So each painting carries a hand-marked focus point in
// `assets/cards/card-focus.json` — a share of the painting's width and height,
// the spot a human decided the frame should hold — and this module is the
// arithmetic that turns that point plus two measured boxes into the part of the
// painting to show. The marking is a judgement and cannot be derived; the
// framing is arithmetic and must not be a judgement, or two surfaces showing
// one painting will cut it two different ways.
//
// Ported from the web app's `art/framing.ts`, where the same focus points drive
// the same crop. The two have to agree: a focus point judged against one of
// them and spent by the other is the `check-portrait-framing.mjs` bug again,
// one picture framed by two rules.
//
// NO IMPORTS, ON PURPOSE. `scripts/port-design-js.mjs` copies design modules
// into `src/module/ui/` verbatim and rewrites no import paths, and this runs in
// a plain browser on the study pages as well. Everything it needs is numbers
// the caller already measured.

/* The whole painting, as the region shape below: what an unmeasured frame or an
   unloaded image gets. Shown rather than hidden, because a painting with the
   wrong crop for one frame is still the painting, and nothing at all is a hole
   in the composition. */
const WHOLE = { x: 0, y: 0, width: 1, height: 1 };

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/* ── the crop ─────────────────────────────────────────────────────
   A `focus` is `{x, y}` in 0..1 — the share across and the share down the
   painting that the frame should hold — and may carry a `scale`: how much of
   the painting's *shorter* side should span the frame's shorter side, which is
   how a portrait's face crop closes in. Without one the frame shows as much of
   the painting as its own shape allows, which for these landscapes is the
   tallest full-width band that fits, slid onto the marked point.

   Sizes are `{width, height}` in whatever unit the caller measured in, as long
   as both are the same unit; the answer is shares of the painting, so it is
   unitless and a frame that resizes does not need the image re-measured.

   Two invariants hold whatever is passed in, and both exist because the
   alternative is a visible hole:

     1. the region never reaches outside the painting — it is centred on the
        focus only as far as the edges allow, and slides rather than shrinks
        when the focus sits near one. A painting whose focus is marked at
        `y: 0.1` still fills its frame;
     2. the region is never smaller than the frame needs — `fit` refuses a
        close-up wider than the painting can cover. A `scale` small enough to
        ask for more magnification than the pixels hold opens the frame instead
        of stretching the art.

   Degenerate boxes return the whole painting rather than dividing by zero: a
   frame measures 0×0 for one layout pass before the ResizeObserver reports,
   and an image is 0×0 until it loads. */
export function framedRegion(art, frame, focus) {
  if (!(art.width > 0 && art.height > 0 && frame.width > 0 && frame.height > 0)) return WHOLE;

  const aspect = frame.width / frame.height;

  // The largest part of the painting with the frame's shape: what a plain
  // cover crop would show, and the ceiling on how wide this one may reach.
  const cover = art.width / art.height > aspect
    ? { width: art.height * aspect, height: art.height }
    : { width: art.width, height: art.width / aspect };

  // The close-up the focus asks for, in the painting's own pixels: its circle
  // spans the frame's shorter side, so which side that is decides the shape.
  const span = (focus.scale ?? 1) * Math.min(art.width, art.height);
  const closed = aspect >= 1
    ? { width: span * aspect, height: span }
    : { width: span, height: span / aspect };

  const fit = Math.min(1, cover.width / closed.width);
  const width = closed.width * fit;
  const height = closed.height * fit;
  const left = clamp(focus.x * art.width - width / 2, 0, art.width - width);
  const top = clamp(focus.y * art.height - height / 2, 0, art.height - height);

  return {
    x: left / art.width,
    y: top / art.height,
    width: width / art.width,
    height: height / art.height,
  };
}

/* ── spending it ──────────────────────────────────────────────────
   A region is shares of the painting; a stylesheet wants shares of the frame.
   The image is laid out bigger than the frame and pulled up and left, so that
   exactly `region` of it covers the frame, which clips the rest. The frame
   needs `position:relative` and `overflow:hidden`, the image `position:
   absolute` — that is `.img`'s job in card.css, not this module's.

   Four decimal places because these are percentages of a container that is
   itself a percentage of a card: a browser rounds the result to device pixels
   anyway, and the full float serialises to a 17-digit string in markup that
   ships inside chat messages. */
const percent = (v) => `${Number((v * 100).toFixed(4))}%`;

export const regionStyle = (region) => ({
  width: percent(1 / region.width),
  height: percent(1 / region.height),
  left: percent(-region.x / region.width),
  top: percent(-region.y / region.height),
});

/* The same thing as a declaration string, for the template-literal builders —
   `style="${regionCss(r)}"` in a card's `.img`. */
export const regionCss = (region) => {
  const s = regionStyle(region);
  return `width:${s.width};height:${s.height};left:${s.left};top:${s.top}`;
};

/* ── before it is measured ────────────────────────────────────────
   The crop above needs the painting's natural size and the frame's box, and
   neither is known at the moment the markup is built: the image has not loaded
   and the frame has not been laid out. A first paint with no framing at all
   would show a centred cover crop — the decapitating one this module exists to
   avoid — so the fallback is the nearest thing CSS can state on its own: cover,
   but anchored on the focus point.

   `object-position` is not the same crop. It positions the cover box inside the
   frame and so cannot close in, and it clamps differently near an edge. It is
   close enough that the switch to the measured region is not a visible jump,
   which is the whole requirement for one paint. */
export const coverCss = (focus) =>
  `width:100%;height:100%;object-fit:cover;` +
  `object-position:${percent(focus.x)} ${percent(focus.y)}`;

/* ── close-ups ────────────────────────────────────────────────────
   The smallest circle a face crop may ask for, as a share of the painting's
   shorter side. A floor rather than a free number because `scale` is a divisor
   in everything above: at zero the close-up is infinitely magnified, and at a
   few thousandths it is a handful of pixels blown across a card. 5% is already
   past the point where any of these paintings holds detail. */
export const SMALLEST_CROP = 0.05;

/* A focus kept inside the painting, for a value that came from a control, a
   drag or a hand-edited file rather than from here. `framedRegion` clamps the
   region it returns whatever it is given, so this is about the *stored* value
   being sane — an x of 1.4 frames the right edge and then reads back as a
   marking nobody made. */
export const focusOnArt = ({ x, y, scale }) => ({
  x: clamp(x, 0, 1),
  y: clamp(y, 0, 1),
  ...(scale === undefined ? {} : { scale: clamp(scale, SMALLEST_CROP, 1) }),
});

/* ── measuring the frame ──────────────────────────────────────────
   The one function here that touches the DOM, and it is here rather than in a
   caller because every surface needs the same answer and the subtlety is not
   obvious: the frame's size is not knowable once. `card.js`'s fitter moves
   `--plate` *after* layout, a sheet's rail resizes, and a chat card is built at
   one width and read at another — so a region computed on first paint is wrong
   by the time anyone looks at it.

   The identity guard matters: ResizeObserver fires for sub-pixel changes and
   for the write this very callback causes, and re-cropping on an unchanged box
   is how a frame ends up in a layout loop. Returns the teardown, which a caller
   on a surface that is rebuilt — chat, a sheet re-render — has to call. */
export function followSize(frame, onSize) {
  let last = null;
  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const { width, height } = entry.contentRect;
    if (last && last.width === width && last.height === height) return;
    last = { width, height };
    onSize(last);
  });
  observer.observe(frame);
  return () => observer.disconnect();
}
