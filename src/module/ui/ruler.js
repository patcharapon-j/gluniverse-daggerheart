/* Vendored from design/ruler.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/ruler.js and re-run `node scripts/port-design-js.mjs`. */
// The range ruler — how far is that, drawn on the map.
//
// Daggerheart's ranges are fiction-first and the book is explicit about
// it: Melee, Very Close, Close, Far and Very Far are agreements at the
// table, and the feet beside them are the book's own approximations
// rather than a conversion. That is exactly why the ruler is worth
// drawing. An approximation nobody can see is not an agreement, it is
// four people each holding a different one, and the argument happens
// after somebody has already committed to a move.
//
// -- it is not a fourth arc on the chip -------------------------------
// The chip is a readout OF a creature: what it has, what it has lost.
// This is a measurement FROM one, it belongs to the map rather than to
// the creature, and the two differ in every dimension that matters:
// lifetime (the chip exists while the token does, this exists while the
// token is selected), size (0.63 of a grid cell against twelve of them)
// and subject. So it is its own layer under the chips, and a ring never
// crosses an arc.
//
// -- the ruler has no hue, and that is a rule rather than a gap -------
// Every colour on a token in this system means a resource: wound is Hit
// Points, strain is Stress, plate is Armor, gold is Hope, violet is
// Fear. A ruler measures none of those. It measures the ground, so it is
// drawn in the map's own ink and takes its legibility from contrast and
// contour instead. A saturated ruler would be a sixth meaning for a hue
// that already has one, on the one surface where all five are in play.
//
// -- certainty is the line style --------------------------------------
// A surveyor's convention, and a real reading here: the near bands are
// solid because "within arm's reach" is a thing you can be sure of, and
// the outer ones break into dashes because Close and Far are the two the
// book leaves most to the table. The line says how much the line means.
//
// -- the rings scale with the map and the type does not ---------------
// A ring is a distance ON the ground, so it is drawn in scene pixels and
// rides the camera exactly as the grid does. The lettering is chrome
// ABOUT a ring, which is the same distinction this system draws
// everywhere between an object and its caption, so it counter-scales
// through --k and holds one size on screen at every zoom. A legend that
// shrinks with the map is a legend twice.
//
// The markup is built ONCE per selection. The camera writes --k, which
// rings have become too small to be worth drawing, and how many legends
// each ring now has room for.

/* -- the geometry -----------------------------------------------------
   One seam with the host and it is a number of scene pixels. The host
   owns the closed set of ranges and the scene's own grid; this owns what
   a ring looks like once somebody has said how big it is. */

/**
 * A range's radius in scene pixels, measured from the token's EDGE.
 *
 * From the edge rather than from the centre, because reach is what the
 * rule means: a three-by-three dragon threatens a square beyond its own
 * body, and measuring from its centre would put half of Melee inside the
 * dragon. It costs nothing on a one-by-one, where the two differ by the
 * token's own radius, and it is the difference between right and roughly
 * right on everything larger.
 *
 * In SQUARES rather than in feet, and that is the one arithmetic
 * decision in this component. The obvious build divides the book's feet
 * by the scene's own `grid.distance`, which is right on every imperial
 * scene and quietly wrong on every other one: a table at 1.5 metres to
 * the square would get Melee at three and a third squares, because that
 * arithmetic reads a number labelled *metres* as though it were feet.
 * The squares are the invariant — the book's own five feet to one — so
 * the ring comes off the grid and only the printed distance comes off
 * the scene's units.
 */
export const radiusOf = (squares, gridPx, tokenR) =>
  (squares || 0) * (gridPx || 100) + (tokenR || 0);

/* Wider as it goes out, and that is legibility rather than emphasis.
   The ring you are reading at any given zoom is the one that fits on the
   screen, so the big ones are the ones whose stroke has to survive being
   multiplied by a small camera scale. */
const strokeOf = (i, n) => 2.4 + (n > 1 ? (i / (n - 1)) * 2.0 : 0);

/* The dash is an ARC LENGTH, not an angle. A fixed angular period would
   make Far's dashes eight times longer than Melee's and the two rings
   would stop reading as one instrument. */
const dashOf = (r, onPx, offPx) => {
  const per = ((onPx + offPx) / (2 * Math.PI * r)) * 360;
  return { per, on: (onPx / (onPx + offPx)) * per };
};

/* Solid near, broken far. The dash pair is in scene pixels of arc. */
const STYLE = [
  { a: 0.92, dash: null },
  { a: 0.82, dash: null },
  { a: 0.66, dash: [26, 12] },
  { a: 0.52, dash: [15, 17] },
  { a: 0.4, dash: [9, 20] },
];

/* -- the lettering ----------------------------------------------------
   The name follows the ring, and that is what the ring is *for*: a band
   you can identify from wherever you happen to be looking at the board,
   rather than one you have to trace back to a tag somewhere on it.
   `token.js` already bends VULNERABLE round a circle for this reason and
   the argument is unchanged — a token has no room for a caption and
   every room for a word.

   ── two arcs, not one, and it is the whole of the readability ──
   One circular path is the obvious build and it puts the bottom third of
   every ring upside down. So there are two half-arcs: the upper runs
   left-to-right over the top, the lower runs left-to-right *under* the
   bottom, and text on each is therefore upright. That is the map-maker's
   own answer to labelling a contour and it costs one extra path.

   ── discrete runs, not a filled band ──────────────────────────
   The chip fills its circle exactly, with `textLength` forcing the
   repeat to the path's own length so no gap travels round with the
   words. That does not survive being asked of a ring twelve grid squares
   across: filling Far at a readable size is about ninety repeats and a
   thousand glyphs, and capping the repeat *while* forcing the length
   spreads eleven letters over half a circle. The two are the same
   mechanism failing from either end.

   So the legends are placed instead of poured — N of them per half arc,
   evenly spaced, each at its natural width. `startOffset` is where, the
   count comes off the arc's length ON SCREEN, and the ring gets more of
   them as the camera comes in rather than larger ones.

   The offsets are (m + ½)/N, which is a fence-post rule doing real work:
   it keeps every legend clear of the two seams at three and nine
   o'clock, where the arcs meet and a run anchored to the end of one
   would hang off it. */
const SPACING = 250; // screen px of arc between neighbouring legends
const MOST = 5; // per half arc

const runOf = (ring) => `${ring.label} · ${ring.dist}`.toUpperCase();

let uid = 0;

const wordsOf = (ring) => {
  const d = (ring.r * 2).toFixed(2);
  const c = ring.r.toFixed(2);
  const id = `rng${++uid}`;
  return `<svg class="rngt" viewBox="0 0 ${d} ${d}" data-id="${id}"
    data-run="${runOf(ring)}" aria-hidden="true">
    <defs>
      <path id="${id}t" fill="none" d="M 0,${c} A ${c},${c} 0 0 1 ${d},${c}"/>
      <path id="${id}b" fill="none" d="M 0,${c} A ${c},${c} 0 0 0 ${d},${c}"/>
    </defs>
    <g></g>
  </svg>`;
};

/** The legends for one ring at one camera scale. Rewritten only when N moves. */
function lettering(svg, per) {
  const id = svg.dataset.id;
  const run = svg.dataset.run;
  let out = "";
  for (const half of ["t", "b"]) {
    for (let m = 0; m < per; m++) {
      const at = (((m + 0.5) / per) * 100).toFixed(3);
      out +=
        `<text><textPath href="#${id}${half}" startOffset="${at}%" ` +
        `text-anchor="middle" dominant-baseline="middle">${run}</textPath></text>`;
    }
  }
  svg.querySelector("g").innerHTML = out;
}

/* -- a band -----------------------------------------------------------
   Five layers, and each is a claim rather than a different opacity of
   one — which is `token.css`'s rule about the chip's arcs, arriving on a
   component that has more room for it.

     rngb  the bevel: light bleeding INWARD off the line and shadow
           falling outward, so the ring sits in the ground rather than
           on it. Not a fill — a wash over the whole disc would tint the
           map, which is the thing the reader came to look at.
     rngn  the line itself, solid or dashed, and the only layer that
           carries the band's certainty.
     rngh  a finer companion rule just outside it. A doubled rule is how
           this design draws a border everywhere else, and it is what
           stops a single stroke reading as a fence.
     rngt  the lettering.

   The bevel is one gradient rather than two elements because light
   inside and shadow outside are one claim about one edge. */
const ringOf = (ring, i, n) => {
  const w = strokeOf(i, n).toFixed(2);
  const st = STYLE[Math.min(i, STYLE.length - 1)];
  let face = "#fff";
  if (st.dash) {
    const d = dashOf(ring.r, st.dash[0], st.dash[1]);
    face =
      "repeating-conic-gradient(from -90deg,#fff 0 " +
      d.on.toFixed(3) +
      "deg,transparent " +
      d.on.toFixed(3) +
      "deg " +
      d.per.toFixed(3) +
      "deg)";
  }
  return `<div class="rngr" data-r="${ring.key}"
    style="--r:${ring.r.toFixed(1)}px;--w:${w}px;--a:${st.a};--d:${i * 62}ms">
    <b class="rngb"></b><b class="rngn" style="background:${face}"></b>
    <b class="rngh"></b>${wordsOf(ring)}
  </div>`;
};

/**
 * Build a ruler.
 *
 * `rings` is ordered inward-out and each is `{key, label, dist, r}`. The
 * host has already turned the closed set of ranges and the scene's grid
 * into scene pixels, because both of those are the game's and neither is
 * this component's to know.
 */
export const RANGE_RULER = (rings = []) =>
  `<div class="dh ruler" style="--k:1;--r0:${(rings[0]?.r ?? 0).toFixed(1)}px;--far:${(rings.at(-1)?.r ?? 0).toFixed(1)}px">
  <b class="rngs"></b>
  <div class="rngrs">${rings.map((r, i) => ringOf(r, i, rings.length)).join("")}</div>
  <b class="rngw"></b>
</div>`;

/* -- the camera -------------------------------------------------------
   Three writes and they all land on the root or on a handful of children
   of it, which is what makes this affordable during a live zoom: there
   is one ruler on the board, because there is one selection.

   --k is the reciprocal of the camera scale and is what holds the
   lettering at a constant size on screen. The rings do not take it: they
   are distances on the ground and must move with the ground.

   A ring below FLOOR screen pixels across is not a small ring, it is a
   dot inside the creature. Its own stroke is wider than the gap to its
   neighbour and it says nothing the ring outside it does not say better.
   So it leaves, exactly as a track leaves the chip's ladder, and for the
   same reason rather than a similar one.

   The lettering needs a ladder of its own and it is a *different*
   question. Two bands a hundred scene pixels apart are a hundred pixels
   apart on the ground forever; on screen that gap shrinks with the
   camera while the type does not, so below some zoom Melee's words are
   printed through Very Close's however far apart the circles are. That
   is a middling-zoom failure, which is the worst kind — correct at the
   zoom anybody builds it at and wrong at the one they play at.

   Walked from the OUTSIDE in, which is the half that matters. The
   outermost band is the one still worth reading at the zoom where the
   type is crowding, and keeping the innermost instead would answer a
   pulled-back camera with the word MELEE. So the outermost is never
   dropped and each one inward survives only if it clears the last kept.
   Lettering whose ring has already left goes with it.

   `lettering` is rewritten only when the count actually changes, which
   is `setTier`'s discipline rather than a similar one: a smooth zoom
   across four rings rewrites a handful of nodes in total instead of four
   subtrees a frame. */
const FLOOR = 52; // a ring, in screen px across
const APART = 26; // two bands' radii, in screen px

export function setRulerZoom(el, k) {
  if (!el || !(k > 0)) return false;
  if (+el.dataset.k === k) return false;
  el.dataset.k = String(k);
  el.style.setProperty("--k", (1 / k).toFixed(4));

  const rings = [...el.querySelectorAll(".rngr")];
  let kept = null;

  for (let i = rings.length - 1; i >= 0; i--) {
    const ring = rings[i];
    const r = parseFloat(ring.style.getPropertyValue("--r")) || 0;
    const small = r * 2 * k < FLOOR;
    ring.toggleAttribute("data-lo", small);

    const svg = ring.querySelector(".rngt");
    if (!svg) continue;
    const crowded = kept !== null && (kept - r) * k < APART;
    const gone = small || crowded;
    svg.toggleAttribute("data-lo", gone);
    if (gone) continue;
    kept = r;

    /* One legend every SPACING of arc, per half. Sized off the arc the
       reader can actually see rather than off the ring's own radius,
       which is the only reason the count moves with the camera at all. */
    const per = Math.max(1, Math.min(MOST, Math.round((Math.PI * r * k) / SPACING)));
    if (+svg.dataset.per !== per) {
      svg.dataset.per = String(per);
      lettering(svg, per);
    }
  }
  return true;
}

/* -- going away -------------------------------------------------------
   A ruler is dismissed rather than deleted, because the collapse is the
   half of the gesture that says the measurement is over: a ring that
   simply stops existing reads as a redraw. The host removes the element
   once the class's own animation has run, and TTL is that duration
   stated once so the stylesheet and the host cannot disagree. */
export const TTL = 240;

export function closeRuler(el, done) {
  if (!el) return;
  el.classList.add("out");
  setTimeout(() => {
    el.remove();
    done?.();
  }, TTL);
}
