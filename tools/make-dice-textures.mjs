/**
 * The duality dice, given a surface — one cut per hue, per shape.
 *
 * Dice So Nice takes a *texture* and a *bump* per theme: the first multiplies
 * into the die's colour, the second is a height field it derives a normal map
 * from. Every one it ships is a picture of something — clouds, marble, skulls,
 * a leopard — and this system draws nothing like that anywhere. Its whole
 * surface vocabulary is chamfers, hairlines and paper, and a d12 wearing
 * stained glass next to a chat plate made of two flat colours is the plate
 * losing an argument it did not enter.
 *
 * So the textures are generated rather than chosen, and they are generated to
 * be almost nothing: the colour map never darkens the die by more than about
 * eight percent, and everything that makes the surface *feel* like a material
 * is in the bump, where it costs the hue nothing.
 *
 * ── the figure follows the face ───────────────────────────────────────
 * This file used to draw one octagon and hand it to every die, because Dice So
 * Nice lays a single texture over every face of every shape and an octagon was
 * the best compromise between a d6's square and a d12's pentagon. The
 * compromise had a price, stated at length in the version of this header that
 * is now history: on a d20 a third of the figure fell outside the face and was
 * never sampled, and the d4, d8 and d10 were never considered at all because
 * nothing in this system rolled one of ours.
 *
 * The Hope Die is no longer always a d12 — *Signature Move*, *Rise to the
 * Challenge* and *Reliable Backup* all hand you a d20, and the roll popover now
 * lets you say so — which retires the compromise rather than complicating it.
 * A colorset is per *term*, so a shape that is known at the moment the die is
 * painted can have a texture of its own. There are six of them per hue and the
 * figure is derived from **the face's own polygon** in each.
 *
 * The polygons are not guessed. Dice So Nice draws the texture once per face,
 * scaled to fill a 256px square tile (`createTextMaterial`), and the face's
 * baked UVs map its polygon onto that square — so reading the UVs out of the
 * module's own `DiceModels.js` and binning the triangles by atlas tile gives
 * the polygon exactly. `FACES` below is that measurement, averaged across every
 * face of each die (they agree to about half a pixel at 256):
 *
 *     d6    the square, corner to corner — the face *is* the tile
 *     d12   a regular pentagon, apex up, inradius 0.418
 *     d20   a triangle, apex up, inradius 0.287 about its own incentre
 *     d4    a triangle, inradius 0.284      d8   0.269
 *     d10   a kite — tangential, like every kite, so it has an incircle too
 *
 * Everything below is built out of one function: `insetOf(p)`, the distance
 * from `p` **inward** from the nearest edge of the face. For a convex polygon
 * that is exactly `-max_i dot(p - a_i, n_i)` over the outward edge normals, so
 * a rule at a given inset is a level set of it and needs no centre, no radius
 * and no per-shape arithmetic. The kite gets the same treatment as the square.
 *
 * Rule *positions* are fractions of each face's own inradius and rule *widths*
 * are absolute. A bevel is proportional to the face it runs around — that is
 * what makes a d20's read as the same object as a d6's — but a cut is a cut,
 * and these dice are all about the same size in the hand.
 *
 * ── Hope and Fear are two cuts, and now two figures ───────────────────
 * They shared a texture once, and the only thing on the table telling them
 * apart was the hue. That is one axis for a question — *which of these two came
 * up higher* — that the whole roll turns on, and a hue is the axis that fails
 * first: in shadow, at an angle, behind another die, on a colour-blind reader's
 * screen. So the cut is the second axis.
 *
 * The first answer to that was Hope keeping the octagon's straight runs and
 * Fear keeping the whole ring, which is a real difference and too fine a one:
 * both were three concentric rules and a bare corner is not something you can
 * see across a table. The two figures are now **orthogonal in direction**,
 * which is the largest difference two line cuts can have and survives any
 * rotation, any distance and any light:
 *
 *   **fear** — *the closed cut.* Three rules following the face all the way
 *              round, insets 0.10 / 0.20 / 0.30 of the inradius, the weight
 *              falling as they step inward, which is how this design draws a
 *              border everywhere else. A diamond — the mark — is cut **into**
 *              the innermost rule at every corner, so mark and rule fuse into
 *              one figure. Concentric, layered, closed. Fear is not yours and
 *              does not leave.
 *
 *   **hope** — *the open cut.* One rule, on the innermost of Fear's three, and
 *              **broken at every corner**; the mark stands free in the break
 *              rather than set into the line. And at the middle of every side a
 *              **fan of three rays leaves that rule and runs outward**, across
 *              the band Fear fills with rings, splaying as it goes and stopping
 *              just short of the face edge. Radial where Fear is concentric.
 *              Hope is the one thing on this sheet you hold in order to spend —
 *              the rail's whole gesture for it is letting it go — and a figure
 *              whose every line is leaving is the surface saying so.
 *
 * Neither invents a shape the other does not have: the same rule, the same
 * inset, the same diamond, the same groove profile. What differs is whether the
 * line goes round or goes out.
 *
 * Both are derived from **the same discriminator**, and it is the one piece of
 * the octagon that was worth keeping. Take the two largest of the half-plane
 * distances, `m1` and `m2`. Near the middle of a side one edge dominates and
 * `m1 - m2` is large; at a corner two edges tie and it falls to zero. So the
 * difference *names the run a point stands on* — Fear ignores it, Hope opens
 * its rule where it is small and puts a ray where it is largest. One number,
 * two readings, and it works on a triangle, a square, a pentagon and a kite
 * without being told which it is.
 *
 * ── the glow ──────────────────────────────────────────────────────────
 * A third map, and only Hope and Fear have one. Dice So Nice has no emissive
 * slot on a texture — `addTexture` loads exactly `source` and `bump` — so this
 * one is composited into the module's own emissive canvas after it is built;
 * `src/module/dice/dsn.ts` has the whole argument and the file-and-line for it.
 * What matters here is what it carries: **the mark at 150 and the groove floor
 * at 70, on black.** The numeral Dice So Nice writes into that canvas is 153,
 * so the mark is lit to just under the number and the cut to a little under
 * half of it. Nothing on the die may out-glow the number, which is the one
 * thing on it anybody is trying to read.
 *
 * ── the bump is not only the bump ─────────────────────────────────────
 * On `frosted`, which is what Hope and Fear are, Dice So Nice hands the bump
 * canvas to the material a **second** time as its `transmissionMap` — see
 * `usesTransmissionMask` in `DiceFactory.js`. White is fully transmissive and
 * the default with no texture is a white fill, so the flat level is not free:
 * it decides how much of the die you can see through. That is why the field is
 * 228 rather than the 176 an earlier draft wrote — 176 was quietly making the
 * frosted dice a third less transmissive than a frosted die with no texture at
 * all, which is a change to the *material* smuggled in under a change to its
 * finish.
 *
 * It also means the groove gets the effect for free and in the right direction:
 * less transmission is more scattering, so the cut reads as a solid line of the
 * die's own colour through a body you can otherwise see into. The gold line is
 * lit from the front and the gold around it from behind. Only the gradient of
 * this map reaches the normal map, so the flat level costs the relief nothing.
 *
 * **Parity is on the flat level and not on the mean, and that matters more now
 * than it did.** Every texture here writes the same flat 228 and the same
 * groove floor 124, so two duality dice are equally see-through through the
 * body, which is what a fair comparison needs. Their *means* no longer agree
 * closely, and cannot: three closed rules cut away more of a face than one
 * broken rule and a few rays do, and that difference is the whole point of
 * having two figures. The script prints every mean so the divergence stays a
 * number somebody decided rather than a number nobody looked at.
 *
 * ── what still gets cropped, and why that is fine ─────────────────────
 * Nothing, now, on the faces we paint. The figure is derived from the polygon,
 * so every rule, ray and mark lands inside it by construction on all six.
 *
 * What *is* still overdrawn is the numeral: Dice So Nice writes the label into
 * all three canvases after the texture, at the tile's centre, so a rule passing
 * under a "20" is covered by it rather than competing with it. That is why the
 * innermost rule is allowed as far in as 0.30 of the inradius on a d20, where
 * it would otherwise be crowding the number.
 *
 * The d4 is the one shape whose labels are not at the centre: the module draws
 * three of them and rotates the canvas 120° about the *tile* centre between
 * each, so they land near the three corners. A figure derived from an
 * equilateral face is three-fold symmetric about its own incentre, which is not
 * quite the tile centre — the offset is under a pixel and a half at 256, and
 * the alternative is drawing the d4's bevel off its own face to chase it.
 *
 * Deterministic — there is no randomness in here at all — so re-running this
 * produces byte-identical files and the repo does not churn.
 *
 *     node tools/make-dice-textures.mjs
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "dice");
const N = 512;

/* ── a PNG, by hand ────────────────────────────────────────────────────
   Eight-bit greyscale, one filter byte per row, one IDAT. There is no image
   library in this repo and adding one to write thirty-eight flat greyscales
   would be the dependency outweighing the artefact. */

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function greyPng(pixels, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  // Rows carry a leading filter byte; 1 is "sub", which is what a field of
  // long flat runs broken by a few soft lines wants — most of every row is
  // identical to its neighbour and deflates to nothing.
  const raw = Buffer.alloc((size + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size + 1)] = 1;
    for (let x = 0; x < size; x++) {
      const v = pixels[y * size + x];
      const left = x === 0 ? 0 : pixels[y * size + x - 1];
      raw[y * (size + 1) + 1 + x] = (v - left) & 0xff;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ── the faces ─────────────────────────────────────────────────────────

   In *tile* units: 0..1 across one face, y down, wound clockwise on screen.
   Measured off `DICE_MODELS` in Dice So Nice 6.2.4 and averaged over every
   face of each die. See the header. */

const FACES = {
  d4: [
    [0.5002, 0.0],
    [0.9916, 0.851],
    [0.0089, 0.851],
  ],
  d6: [
    [0.0128, 0.0128],
    [0.9897, 0.0128],
    [0.9897, 0.9897],
    [0.0128, 0.9897],
  ],
  d8: [
    [0.5031, 0.0025],
    [0.9682, 0.8082],
    [0.038, 0.8082],
  ],
  d10: [
    [0.5031, 0.003],
    [0.8671, 0.774],
    [0.5031, 0.955],
    [0.1391, 0.774],
  ],
  d12: [
    [0.5005, 0.0036],
    [0.9918, 0.3606],
    [0.8041, 0.9383],
    [0.1968, 0.9383],
    [0.0091, 0.3606],
  ],
  d20: [
    [0.5006, 0.001],
    [0.9985, 0.8635],
    [0.0026, 0.8635],
  ],
};

export const SHAPES = Object.keys(FACES);

/**
 * A face, pre-chewed: outward unit normals, edge midpoints and tangents, the
 * miter direction at every corner, and the inradius.
 *
 * `inset(p)` is the whole geometry engine. For a convex polygon the signed
 * distance to the boundary is `max_i dot(p - a_i, n_i)` over the outward edge
 * normals — exact inside, and inside is the only place we draw — so negating it
 * gives the distance *inward* from the nearest edge. Every rule below is a
 * level set of that one number, which is why a kite needs no special case.
 *
 * `m1 - m2`, the gap between the largest and second-largest half-plane, is the
 * run discriminator: large in the middle of a side, zero at a corner. Both cuts
 * are built from it.
 */
function prepare(poly) {
  const n = poly.length;
  // Wind consistently, so every normal points out rather than half of them in.
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const pts = area > 0 ? poly : poly.slice().reverse();

  const edges = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len = Math.hypot(ex, ey);
    const tx = ex / len;
    const ty = ey / len;
    // Clockwise on screen (y down) with positive shoelace: the outward normal
    // is the tangent turned a quarter the other way.
    edges.push({ a, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], nx: ty, ny: -tx, tx, ty, half: len / 2 });
  }

  const inset = (x, y) => {
    let m1 = -Infinity;
    let m2 = -Infinity;
    let k = 0;
    for (let i = 0; i < n; i++) {
      const e = edges[i];
      const d = (x - e.a[0]) * e.nx + (y - e.a[1]) * e.ny;
      if (d > m1) {
        m2 = m1;
        m1 = d;
        k = i;
      } else if (d > m2) m2 = d;
    }
    return { t: -m1, run: m1 - m2, edge: k };
  };

  // The incentre, by the same function: the deepest point of the face. A
  // handful of Newton-free descent steps on a convex field is enough at this
  // resolution, and it is exact for every shape here but the kite, where it
  // converges in about a dozen.
  let cx = pts.reduce((s, p) => s + p[0], 0) / n;
  let cy = pts.reduce((s, p) => s + p[1], 0) / n;
  let step = 0.05;
  for (let iter = 0; iter < 400; iter++) {
    const here = inset(cx, cy).t;
    let best = null;
    for (const [dx, dy] of [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
    ]) {
      const t = inset(cx + dx, cy + dy).t;
      if (t > here && (!best || t > best.t)) best = { t, dx, dy };
    }
    if (best) {
      cx += best.dx;
      cy += best.dy;
    } else step *= 0.5;
  }
  const inradius = inset(cx, cy).t;

  // Where the inset rule turns each corner: the miter, so a mark placed here
  // sits exactly on the rule rather than near it.
  const corners = pts.map((v, i) => {
    const a = edges[(i - 1 + n) % n];
    const b = edges[i];
    const dot = a.nx * b.nx + a.ny * b.ny;
    const s = 1 + dot;
    return { v, mx: (a.nx + b.nx) / s, my: (a.ny + b.ny) / s };
  });

  return { pts, edges, corners, inset, inradius, centre: [cx, cy] };
}

/* ── the cut ───────────────────────────────────────────────────────────

   Widths are in tile units and the file is 512px, so every one quoted here is
   doubled relative to what lands on the die's 256px atlas tile. */

/** The three rules, as fractions of the face's own inradius, and their weight.
    Fear draws all three; Hope draws the innermost and nothing else. */
const BEVEL = [
  { f: 0.1, w: 0.0065 },
  { f: 0.2, w: 0.0045 },
  { f: 0.3, w: 0.003 },
];

/** The mark's half-diagonal. Absolute: the diamond is the system's mark and it
    is the same mark on every die, and both cuts put it in the same place. */
const BEAD = 0.021;

/**
 * Hope's burst: what leaves each mark. Three grooves — one straight out along
 * the corner's own bisector and two set off from it — because one line is a
 * spur and three is light. `a` is the angle off the bisector in degrees, `r`
 * how much of the available run it takes, and `in`/`out` how much of that it
 * spends fading in at the mark and running out at the tip. A cut that runs out
 * is what a real chamfer does at the end of a run; one that stopped dead would
 * read as a dash.
 */
const BURST = [
  { a: 0, w: 0.005, r: 1, in: 0.08, out: 0.34 },
  { a: 21, w: 0.0034, r: 0.58, in: 0.12, out: 0.42 },
  { a: -21, w: 0.0034, r: 0.58, in: 0.12, out: 0.42 },
];

/** Shoulder width. A groove with a vertical wall aliases; this is the fillet. */
const FILLET = 0.0035;

/** How far outside a groove its halo reaches. */
const HALO = 0.01;

/** How wide the break at a corner is, measured in the discriminator's own
    units. Also how far a ray takes to reach full depth from its outer tip —
    a cut that runs out is what a real chamfer does at the end of a run, and one
    that stopped dead would read as a dash rather than as a bevel that ended. */
const RUNOUT = 0.014;

/**
 * A groove, across the centreline: flat at the floor, cosine up the shoulder,
 * nothing beyond. The cosine is the anti-aliasing — it reaches zero with zero
 * slope, so there is no step anywhere for the sampler to find.
 */
function groove(e, w) {
  const a = Math.abs(e);
  if (a >= w) return 0;
  const s = Math.min(FILLET, w);
  if (a <= w - s) return 1;
  return 0.5 + 0.5 * Math.cos((Math.PI * (a - (w - s))) / s);
}

/** The lip just outside it. Zero at both ends, so it never introduces an edge. */
function halo(e, w) {
  const a = Math.abs(e);
  if (a <= w || a >= w + HALO) return 0;
  return Math.sin(Math.PI * ((a - w) / HALO));
}

/** A filled shape from the same signed distance: solid inside, cosine out. */
function fill(e) {
  if (e >= 0) return 0;
  if (e <= -FILLET) return 1;
  return 0.5 + 0.5 * Math.cos((Math.PI * (e + FILLET)) / FILLET);
}

/** And its lip, which a filled cut throws up on the *outside* only. */
function rim(e) {
  if (e <= 0 || e >= HALO) return 0;
  return Math.sin(Math.PI * (e / HALO));
}

/** Nothing below `lo`, everything above `hi`, cosine between. */
function ramp(x, lo, hi) {
  if (x <= lo) return 0;
  if (x >= hi) return 1;
  return 0.5 - 0.5 * Math.cos((Math.PI * (x - lo)) / (hi - lo));
}

/**
 * The field, at one point: how deep the cut is (`g`), how high the lip beside
 * it (`h`), and how much of the cut is the mark rather than a rule (`b`) —
 * which only the glow map cares about, because only the glow map draws the two
 * at different strengths.
 */
function fieldFor(face, open) {
  const { edges, corners, inset, inradius } = face;
  const rules = BEVEL.map((b) => ({ t: b.f * inradius, w: b.w }));
  const inner = rules[rules.length - 1];
  // Hope's beams stop short of the face edge — a groove that ran into it would
  // break the silhouette rather than lie inside it.
  const BEAM_OUT = Math.min(0.024, inradius * 0.1);

  /* Every corner, pre-solved. `o` is where the innermost rule turns that
     corner, which is where the mark goes on both cuts; `u` is the outward
     bisector as a unit vector, and `depth` is how far along it the mark sits.
     Along the miter the inset falls by exactly one per unit of the *unmitred*
     vector, which is what makes a beam's parameter and the rule's inset the
     same number without any solving. */
  const spurs = corners.map((c) => {
    const ml = Math.hypot(c.mx, c.my);
    const ux = c.mx / ml;
    const uy = c.my / ml;
    const run = (inner.t - BEAM_OUT) * ml;
    return {
      o: [c.v[0] - inner.t * c.mx, c.v[1] - inner.t * c.my],
      /* The flanks are rotated off the bisector, and their run is shortened by
         the cosine as well as by their own `r`: a ray leaving at an angle meets
         the face edge sooner than one going straight out, and a burst whose
         arms all stopped at the same length would put the outer two through it. */
      rays: BURST.map((b) => {
        const th = (b.a * Math.PI) / 180;
        const cos = Math.cos(th);
        const sin = Math.sin(th);
        return {
          ...b,
          ux: ux * cos - uy * sin,
          uy: ux * sin + uy * cos,
          run: run * b.r * cos,
        };
      }),
    };
  });

  return (x, y) => {
    const { t, run } = inset(x, y);

    let g = 0;
    let h = 0;

    if (open) {
      // One rule, and it is let go of where two edges compete for it — which
      // is exactly where a corner is.
      const keep = ramp(run, 0, RUNOUT);
      if (keep > 0) {
        g = Math.max(g, keep * groove(t - inner.t, inner.w));
        h = Math.max(h, keep * halo(t - inner.t, inner.w));
      }

      // And out of every break, a burst: from the mark, through the two rules
      // Fear would have closed, and away.
      for (const s of spurs) {
        const dx = x - s.o[0];
        const dy = y - s.o[1];
        for (const r of s.rays) {
          const along = dx * r.ux + dy * r.uy;
          if (along < 0 || along > r.run) continue;
          const across = Math.abs(dx * r.uy - dy * r.ux);
          const f = along / r.run;
          const lit = ramp(f, 0, r.in) * (1 - ramp(f, 1 - r.out, 1));
          g = Math.max(g, lit * groove(across, r.w));
          h = Math.max(h, lit * halo(across, r.w));
        }
      }
    } else {
      for (const rule of rules) {
        g = Math.max(g, groove(t - rule.t, rule.w));
        h = Math.max(h, halo(t - rule.t, rule.w));
      }
    }

    // The mark, once at every corner and in the same place on both cuts. Fear
    // closes the rule through it, so `max()` fuses the two into one figure;
    // Hope has let the rule go there, so the same diamond stands alone in the
    // gap with the beam leaving it.
    let b = 0;
    for (const s of spurs) {
      const e = Math.abs(x - s.o[0]) + Math.abs(y - s.o[1]) - BEAD;
      b = Math.max(b, fill(e));
      h = Math.max(h, rim(e));
    }
    g = Math.max(g, b);

    return { g, h: h * (1 - g), b };
  };
}

/**
 * Two-by-two per pixel. The profiles above are already smooth, but a chamfer
 * and a diamond both run at an angle to the grid, and a diagonal edge is where
 * an analytic profile still shows its stairs.
 */
const build = (size, fn) => {
  const px = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          sum += fn((x + 0.25 + sx * 0.5) / size, (y + 0.25 + sy * 0.5) / size);
        }
      }
      px[y * size + x] = Math.max(0, Math.min(255, Math.round(sum / 4)));
    }
  }
  return px;
};

/* Hope and Fear share every level and differ only in where the cut goes — see
   the transmission note in the header for why that is not a stylistic choice.
   236..255 in colour, so at most a seven and a half percent darkening and the
   groove floor is not darkened at all. */
const duality = (field) => ({
  source: (u, v) => {
    const { g, h } = field(u, v);
    return 244 + 11 * g - 8 * h;
  },
  bump: (u, v) => {
    const { g, h } = field(u, v);
    return 228 - 104 * g + 14 * h;
  },
  /* Black everywhere the die is not cut, because everything in this map is
     added to a canvas that is already carrying the numeral. */
  glow: (u, v) => {
    const { g, b } = field(u, v);
    return 70 * g + 80 * b;
  },
});

/* The advantage pair, and the only texture left that is not per shape: these
   two are always a d6 and always will be, because advantage in this game is a
   d6 and nothing else. Fear's closed cut on the square face at half the depth,
   and barely a line at all — 246..255, under three and a half percent. It takes
   the closed one because these two are not in the comparison the other pair is
   in: nothing is being asked of the advantage die except its number, so it gets
   the plain figure and Hope's open one stays Hope's. Velvet has its own sheen
   and does not need help finding an edge, and takes no transmission mask. */
const FAINT_FIELD = fieldFor(prepare(FACES.d6), false);

/**
 * Nothing may be cut outside the face.
 *
 * This is the check the octagon could never have passed and the whole reason
 * the figure is derived from the polygon now. It is cheap — one evaluation of a
 * field we are about to evaluate anyway — and it is the only assertion here
 * that catches the failure that actually happens when these constants are
 * tuned: a ray lengthened by a tenth on the shape with the most room, landing
 * off the edge of the shape with the least.
 */
function assertInside(name, face, field) {
  const S = 512;
  let worst = Infinity;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = (x + 0.5) / S;
      const v = (y + 0.5) / S;
      if (field(u, v).g < 0.02) continue;
      const { t } = face.inset(u, v);
      if (t < worst) worst = t;
    }
  }
  if (worst <= 0) throw new Error(`${name}: the cut leaves the face by ${(-worst).toFixed(4)}`);
  return worst;
}

const CLEARANCE = [];
const FAMILIES = {};
for (const shape of SHAPES) {
  const face = prepare(FACES[shape]);
  for (const [hue, open] of [
    ["hope", true],
    ["fear", false],
  ]) {
    const field = fieldFor(face, open);
    CLEARANCE.push(`${hue}-${shape} ${assertInside(`${hue}-${shape}`, face, field).toFixed(4)}`);
    FAMILIES[`${hue}-${shape}`] = duality(field);
  }
}
FAMILIES["mark-faint"] = {
  source: (u, v) => {
    const { g, h } = FAINT_FIELD(u, v);
    return 250 + 5 * g - 4 * h;
  },
  bump: (u, v) => {
    const { g, h } = FAINT_FIELD(u, v);
    return 172 - 52 * g + 7 * h;
  },
};

const SUFFIX = { source: "", bump: "-bump", glow: "-glow" };

mkdirSync(OUT, { recursive: true });

/* The set is derived from `FACES` now, so a shape leaving the list has to take
   its files with it — a stale `hope.png` from the one-octagon era is a texture
   nothing names and everything still ships. */
const written = new Set();
for (const [name, family] of Object.entries(FAMILIES)) {
  for (const [part, fn] of Object.entries(family)) {
    const file = `${name}${SUFFIX[part]}.png`;
    const px = build(N, fn);
    writeFileSync(join(OUT, file), greyPng(px, N));
    written.add(file);
    let lo = 255;
    let hi = 0;
    let sum = 0;
    for (const v of px) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
      sum += v;
    }
    const mean = sum / px.length;
    const note =
      part === "source"
        ? `  (darkens by at most ${(100 * (1 - lo / 255)).toFixed(1)}%)`
        : // The bump doubles as the transmission mask on `frosted`, so its flat
          // level is what has to agree between Hope and Fear. The mean is
          // printed because the two figures cut different amounts away and
          // somebody should be looking at by how much.
          part === "bump"
            ? `  (mean ${mean.toFixed(2)})`
            : "";
    console.log(`wrote ${file.padEnd(22)} min ${String(lo).padStart(3)}  max ${hi}${note}`);
  }
}

console.log(`\nclearance, closest cut to the face edge in tile units:\n  ${CLEARANCE.join("\n  ")}`);

for (const file of readdirSync(OUT)) {
  if (file.endsWith(".png") && !written.has(file)) {
    unlinkSync(join(OUT, file));
    console.log(`removed ${file}  (no longer named by any colorset)`);
  }
}
