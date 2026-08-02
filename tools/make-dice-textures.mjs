/**
 * The four dice, given a surface.
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
 * ── what it draws ─────────────────────────────────────────────────────
 * A **chamfered bevel**: three concentric octagonal rules, cut from a heavy
 * line down to a hairline as they step inward, with **four small diamonds** —
 * the mark — set among them.
 *
 * The octagon is a square with all four corners cut, which is the one edge
 * treatment this system already owns — every panel and every card in `design/`
 * is chamfered at the corner, and `--chamfer` is a token. On a d6 the four
 * straight runs sit parallel to the four edges of the face and the four short
 * ones cut the corners, so the groove genuinely runs *along* the edge; the
 * three of them stepping inward at falling weight is a bevel, which is what a
 * cut edge looks like. Four corners cut rather than the design's one, because
 * a die turns and an asymmetry that means "bottom right" on a card means
 * nothing on a face that arrives at any rotation.
 *
 * The four diamonds are the mark: `polygon(50% 0,100% 50%,50% 100%,0 50%)` in
 * `design/chat.css` is the wound, the domain pip and the claim diamond, and it
 * is the one closed shape this system owns.
 *
 * The **colour map is where the line is, and the line is the die's own hue**.
 * The field sits at 244 — a four percent muting, invisible as a pattern — and
 * the groove floor is 255, which is no multiplication at all: the base colour
 * comes through the cut at full strength while everything around it is very
 * slightly held back. A narrow halo just outside each groove drops to 236,
 * which is the deepest this file goes, and the whole of the "gold line" or
 * "violet line" is that difference. Nothing here paints a second hue; there is
 * nothing in these files but grey.
 *
 * The **bump is where the depth is**: flat at 228, cut to 124 in the groove
 * floor with a raised lip at the shoulder, because a cut groove throws one up
 * and it is what makes the normal map read as an edge rather than a stain.
 *
 * ── Hope and Fear are two cuts, not one ───────────────────────────────
 * They used to share a texture, and the only thing on the table telling them
 * apart was the hue. That is one axis for a question — *which of these two
 * came up higher* — that the whole roll turns on, and a hue is the axis that
 * fails first: in shadow, at an angle, behind another die, on a colour-blind
 * reader's screen. So the cut is the second axis, and the two cuts are halves
 * of the one figure rather than two ideas.
 *
 *   **hope** — *the open cut.* The three rules are kept only where the
 *              **square** dominates: four straight runs, one lying along each
 *              edge of the face, tapering out before the corners, which are
 *              left bare. The four marks stand free inside them, on the axes.
 *              The figure never closes. Hope is the one thing on this sheet
 *              you hold in order to *spend* — the rail's whole gesture for it
 *              is letting it go — and a frame with a way out on every side is
 *              the surface saying so.
 *
 *   **fear**  — *the closed cut.* The same three rules taken all the way
 *              round, corners and all, which is the one thing Hope's are not.
 *              And the mark moves into the corner it just closed: four
 *              diamonds on the diagonals, cut **into** the innermost rule at
 *              exactly the point Hope's runs have run out, so Fear's mark is
 *              set in the frame rather than standing loose inside it. Fear is
 *              not yours and does not leave.
 *
 * One figure, two readings: Hope keeps the square's four sides and puts the
 * mark on the axes; Fear keeps the whole octagon and puts the mark on the
 * diagonals. Neither invents a shape the other does not have.
 *
 * The gate is exact rather than drawn. An octagon is the intersection of a
 * square and a diamond and `octagon()` below is `max` of the two standoffs, so
 * *which term is larger already names the run the point is nearest* — larger
 * square term, straight run; larger diamond term, chamfer. Hope multiplies its
 * grooves by that difference, softened over a twelve-thousandth of a tile, and
 * the softening is not only anti-aliasing: a cut that runs out is what a real
 * chamfer does at the end of a run, and one that stopped dead would read as a
 * dash rather than as a bevel that ended.
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
 * 228 and not the 176 this file used to write — 176 was quietly making the
 * frosted dice a third less transmissive than a frosted die with no texture at
 * all, which is a change to the *material* smuggled in under a change to its
 * finish.
 *
 * It also means the groove gets the effect for free and in the right
 * direction: less transmission is more scattering, so the cut reads as a
 * solid line of the die's own colour through a body you can otherwise see
 * into. The gold line is lit from the front and the gold around it from
 * behind. Only the gradient of this map reaches the normal map, so the flat
 * level costs the relief nothing.
 *
 * It is also why Hope and Fear keep the **same** flat level, the same groove
 * floor and the same profile, and differ only in where the cut goes. Two dice
 * you are asked to compare must be equally see-through, or the comparison is
 * being made for you before you make it. Fear cuts more of its face away than
 * Hope does — a closed ring is longer than four dashes — so the two are not
 * identical: the mean of Hope's bump is 226.32 and Fear's 224.82, six tenths
 * of one percent apart, against a flat of 228 on both and a floor of 124 on
 * both. The flat is what the eye integrates over a face, and it is the same
 * number. This script prints those two means every run, which is the only
 * reason it prints a mean at all.
 *
 * ── why an octagon, and why it is cropped on a d20 ────────────────────
 * This was the whole problem. Dice So Nice builds one atlas per die and draws
 * the texture **once per face, scaled to fill a 256px square tile**
 * (`createTextMaterial`, `drawImage(... x, y, ts, ts)`); the face's baked UVs
 * then map its polygon onto that square. Reading the UVs straight out of
 * `DiceModels.js` and binning the triangles by atlas tile gives the polygons,
 * in tile coordinates:
 *
 *     d6    the square, corner to corner — the face *is* the tile
 *     d12   a pentagon, apex up, inscribed, inradius 0.42
 *     d20   a triangle, apex up, inradius 0.29 about its own centroid
 *     d4    a triangle, inradius 0.28      d8  0.27      d10  a kite
 *
 * So a rectangular border — the obvious way to draw "a line along the edge" —
 * follows the face on a d6 and on nothing else: on a d12 three quarters of it
 * falls outside the pentagon and is never sampled. Anything aligned to the
 * tile's four sides has the same fate. What survives is a shape centred on the
 * face, and the only question left is how big.
 *
 * Three shapes can wear one of our colorsets, and only three: `rolls.ts`
 * paints the duality **d12**s, the advantage **d6**, and the adversary
 * **d20**. Damage dice are never painted and keep whatever the player chose.
 * Measured against those three faces — the fraction of each feature's ink,
 * weighted by how deeply it is cut, that lands inside the polygon:
 *
 *                            d6      d12          d20
 *     rule 1  r=0.352       100%    100%    45.7% Hope  38.8% Fear
 *     rule 2  r=0.312       100%    100%    59.7% Hope  60.0% Fear
 *     rule 3  r=0.272       100%    100%     100%        100%
 *     the four marks        100%    100%     100%        100%
 *     ─────────────────────────────────────────────────────────
 *     everything cut        100%    100%    63.8% Hope  56.1% Fear
 *
 * There is no size that fixes the d20 without giving up the first two columns:
 * a closed rule stays whole on a d20 only below inradius 0.233, and at 0.233
 * it is a collar around the numeral on a d6 rather than a line near its edge.
 * That is the trade, taken deliberately in favour of the two dice the
 * colorsets exist for.
 *
 * What makes the crop survivable is that there are **three** rules and not
 * one. A lone arc cut out of a closed emblem reads as debris; three nested
 * arcs running parallel near each corner read as a bevel passing under the
 * edge, which is what a bevel does. And **the marks are whole on all three
 * faces in both cuts** — which is why Fear's sit at 0.272 on the diagonals
 * rather than out on the outer rule where the argument would have preferred
 * them: on the outer rule they land only half on a d20, and a mark is the one
 * element here that must never arrive as a fragment.
 *
 * A circle would have cropped even more gracefully. It is not here because a
 * circle is not a shape this system draws, and a die is not the place to start.
 *
 * ── three families ────────────────────────────────────────────────────
 *
 *   hope        The open cut, and
 *   fear        the closed one. Both read under `frosted` — a real
 *               transmissive material, so the cut carries through the body of
 *               the die and not merely across its face. Deep groove, bright
 *               line, identical levels, and a glow map apiece.
 *   mark-faint  The advantage pair, read under `velvet` — opaque, matte, with
 *               a sheen along the edge. The closed cut at half the depth and
 *               with almost no line, because these two are read as a *number*
 *               and should sit back behind the two carrying the question.
 *               Velvet takes no transmission mask, so its flat level is free,
 *               and it has no `emissiveLabels`, so a glow map would be dropped
 *               on the floor — see the material branch in `DiceFactory.js`.
 *
 * Deterministic — there is no randomness in here at all — so re-running this
 * produces byte-identical files and the repo does not churn.
 *
 *     node tools/make-dice-textures.mjs
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "dice");
const N = 512;

/* ── a PNG, by hand ────────────────────────────────────────────────────
   Eight-bit greyscale, one filter byte per row, one IDAT. There is no image
   library in this repo and adding one to write six flat greyscales would be
   the dependency outweighing the artefact. */

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

/* ── the cut ───────────────────────────────────────────────────────────

   Everything below is in *tile* units: 0..1 across one face. The atlas tile is
   256px and this file is 512px, so one unit here is 512 pixels and every width
   quoted in the constants is doubled relative to what lands on the die. */

/** Where the face is. Halfway between the d6 square's centre and the d12
    pentagon's, which is the compromise that clears both by the most. */
const CX = 0.5;
const CY = 0.508;

/**
 * The bevel: three chamfered rules stepping inward, the weight falling as they
 * go, which is how this design draws a border everywhere else — a rule, then a
 * hairline under it. Shared by both cuts; what differs is how much of each one
 * is kept.
 */
const BEVEL = [
  { r: 0.352, w: 0.0065 },
  { r: 0.312, w: 0.0045 },
  { r: 0.272, w: 0.003 },
];

/** Hope's marks: free of every rule, on the axes. `s` is their L1 radius. */
const HOPE_BEAD = { r: 0.233, s: 0.022 };

/**
 * Fear's marks: on the diagonals, at the radius of the innermost rule — which
 * is where that rule's chamfer *is*, since a regular octagon stands off its
 * centre by the same `r` on all eight sides. So the diamond does not sit near
 * the rule, it is cut into it, and `max()` fuses the two into one figure.
 */
const FEAR_BEAD = { r: 0.272, s: 0.02 };

/** Shoulder width. A groove with a vertical wall aliases; this is the fillet. */
const FILLET = 0.0035;

/** How far outside a groove its halo reaches. */
const HALO = 0.01;

/** How long Hope's runs take to fade out, measured in the same distance the
    octagon's two terms are measured in. See the header. */
const RUNOUT = 0.012;

/**
 * Distance to a regular octagon of inradius `a`, signed, negative inside, and
 * which of the two figures it came from.
 *
 * An octagon is the intersection of a square and a diamond, and for a *regular*
 * one both stand off the centre by the same `a`: `max(|u|,|v|)` is the exact
 * distance to the square's sides and `(|u|+|v|)/√2` the exact distance to the
 * diamond's, so the larger of the two is the exact distance to whichever side
 * is nearest — and saying which of them was larger says which side that was.
 * Circumradius is `a / cos(22.5°)`, about `1.082 a`.
 */
function octagon(du, dv, a) {
  const u = Math.abs(du);
  const v = Math.abs(dv);
  const square = Math.max(u, v);
  const diamond = (u + v) / Math.SQRT2;
  return { e: Math.max(square, diamond) - a, run: square - diamond };
}

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

/** How much of a rule survives at a point whose run-discriminant is `run`.
    One on the straight runs, nothing on the chamfers, cosine between. */
function runout(run) {
  if (run <= 0) return 0;
  if (run >= RUNOUT) return 1;
  return 0.5 - 0.5 * Math.cos((Math.PI * run) / RUNOUT);
}

/**
 * The field, at one point: how deep the cut is (`g`), how high the lip beside
 * it (`h`), and how much of the cut is the mark rather than a rule (`b`) —
 * which only the glow map cares about, because only the glow map draws the two
 * at different strengths.
 *
 * `open` keeps the rules on the straight runs alone. The halo is held out of
 * any groove it happens to reach into, so a mark sitting on a rule does not
 * raise a lip in its floor.
 */
function fieldFor(open, bead, diagonal) {
  return (u, v) => {
    const du = u - CX;
    const dv = v - CY;

    let g = 0;
    let h = 0;
    for (const { r, w } of BEVEL) {
      const { e, run } = octagon(du, dv, r);
      const keep = open ? runout(run) : 1;
      if (keep <= 0) continue;
      g = Math.max(g, keep * groove(e, w));
      h = Math.max(h, keep * halo(e, w));
    }

    // The four marks. A diamond is |du| + |dv| = s about its own centre.
    const d = bead.r / Math.SQRT2;
    const offsets = diagonal
      ? [
          [d, d],
          [-d, d],
          [d, -d],
          [-d, -d],
        ]
      : [
          [bead.r, 0],
          [-bead.r, 0],
          [0, bead.r],
          [0, -bead.r],
        ];
    let b = 0;
    for (const [ox, oy] of offsets) {
      const e = Math.abs(du - ox) + Math.abs(dv - oy) - bead.s;
      b = Math.max(b, fill(e));
      h = Math.max(h, rim(e));
    }
    g = Math.max(g, b);

    return { g, h: h * (1 - g), b };
  };
}

const HOPE_FIELD = fieldFor(true, HOPE_BEAD, false);
const FEAR_FIELD = fieldFor(false, FEAR_BEAD, true);

/**
 * Two-by-two per pixel. The profiles above are already smooth, but the
 * chamfers and the diamonds run at forty-five degrees and a diagonal edge is
 * where an analytic profile still shows its stairs.
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

const FAMILIES = {
  hope: duality(HOPE_FIELD),
  fear: duality(FEAR_FIELD),
  /* The advantage pair. Fear's closed cut at half the depth, and barely a line
     at all — 246..255, under three and a half percent. It takes the closed one
     because these two are not in the comparison the other pair is in: nothing
     is being asked of the advantage d6 except its number, so it gets the plain
     figure and Hope's open one stays Hope's. Velvet has its own sheen and does
     not need help finding an edge, and takes no transmission mask. */
  "mark-faint": {
    source: (u, v) => {
      const { g, h } = FEAR_FIELD(u, v);
      return 250 + 5 * g - 4 * h;
    },
    bump: (u, v) => {
      const { g, h } = FEAR_FIELD(u, v);
      return 172 - 52 * g + 7 * h;
    },
  },
};

const SUFFIX = { source: "", bump: "-bump", glow: "-glow" };

mkdirSync(OUT, { recursive: true });

for (const [name, family] of Object.entries(FAMILIES)) {
  for (const [part, fn] of Object.entries(family)) {
    const px = build(N, fn);
    const file = join(OUT, `${name}${SUFFIX[part]}.png`);
    writeFileSync(file, greyPng(px, N));
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
        : // The bump doubles as the transmission mask on `frosted`, so its mean
          // is the number that has to agree between Hope and Fear.
          part === "bump"
          ? `  (mean ${mean.toFixed(2)})`
          : "";
    console.log(`wrote ${file}  min ${lo}  max ${hi}${note}`);
  }
}
