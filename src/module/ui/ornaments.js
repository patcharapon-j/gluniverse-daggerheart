/* Vendored from design/ornaments.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/ornaments.js and re-run `node scripts/port-design-js.mjs`. */
// Ported from gluniverse-vtt (apps/web/src/rulesets/daggerheart/cards/ornaments.ts).
// The only change is the removal of TypeScript's type syntax; every number, curve and
// comment is the original's. The port was checked by generating all ten motifs from both
// files and diffing the path data, which matched exactly, so a difference in a corner or
// a seam here is a difference from gluvtt and not a transcription slip.
//
// Kept in design/ rather than written in Svelte because it is arithmetic: the pen widths,
// the cubic sampling and the mirroring are the drawing, and re-deriving them by hand is
// the kind of thing make-marked-motifs.mjs exists to stop happening again.

/*
 * Each domain's ornament set, which the full card wears in its corners and on the seam
 * between its painting and its rules. Every piece is built from a few calligraphic
 * primitives (tapered strokes, leaves, crescents, spirals, rays), so a line swells and
 * thins as a pen's would, and each corebook domain has its own motif:
 *   Arcana orbits and runes · Blade fullers and notches · Bone vertebrae and ribs ·
 *   Codex binding corners and clasps · Grace filigree scrolls · Midnight moons, stars and
 *   smoke · Sage vines and leaves · Splendor a sunburst · Valor laurel and a shield boss.
 * Dread, Root and Void are this repo's additions, drawn from the same primitives;
 * the domains past those wear a plain set of a bracket and diamonds.
 *
 * A corner is drawn once, for the top left of a 48-unit square with its point at 0,0, and
 * mirrored into place. The seam is drawn as its left half (0 to 88 of a 200 × 24 band,
 * centred on y = 12) and mirrored about the gem in its middle. Both are handed out as SVG
 * images for a CSS mask, so a card carries no path data of its own.
 */


const round = (n) => Math.round(n * 100) / 100
const at = ([x, y]) => `${round(x)} ${round(y)}`
const lerp = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
]

function cubic(p0, p1, p2, p3, steps = 26) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const u = 1 - t
    const point = (k) =>
      u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]
    return [point(0), point(1)]
  })
}

const polygon = (points) => `M${points.map(at).join('L')}Z`

/** A stroke along `points` whose half-width runs from `start` through `middle` to `end`. */
function tapered(points, start, middle, end) {
  const left = []
  const right = []
  const last = points.length - 1
  points.forEach(([x, y], i) => {
    const t = i / last
    const [ax, ay] = points[Math.max(0, i - 1)]
    const [bx, by] = points[Math.min(last, i + 1)]
    const length = Math.hypot(bx - ax, by - ay) || 1
    const [dx, dy] = [(bx - ax) / length, (by - ay) / length]
    const width = (1 - t) * (1 - t) * start + 2 * t * (1 - t) * middle + t * t * end
    left.push([x - dy * width, y + dx * width])
    right.push([x + dy * width, y - dx * width])
  })
  return polygon([...left, ...right.reverse()])
}

/** A swash along a cubic curve. */
const swash = (p0, p1, p2, p3, w0, w1, w2) =>
  tapered(cubic(p0, p1, p2, p3), w0, w1, w2)

/** A straight tapered stroke. */
const stroke = (a, b, w0, w1, w2) =>
  swash(a, lerp(a, b, 1 / 3), lerp(a, b, 2 / 3), b, w0, w1, w2)

const circle = (cx, cy, r) =>
  `M${round(cx - r)} ${round(cy)}a${round(r)} ${round(r)} 0 1 0 ${round(2 * r)} 0a${round(r)} ${round(r)} 0 1 0 ${round(-2 * r)} 0Z`

/** A circle wound the other way, so under nonzero fill it cuts a hole in what it overlaps. */
const hole = (cx, cy, r) =>
  `M${round(cx - r)} ${round(cy)}a${round(r)} ${round(r)} 0 1 1 ${round(2 * r)} 0a${round(r)} ${round(r)} 0 1 1 ${round(-2 * r)} 0Z`

const ring = (cx, cy, r, width) =>
  circle(cx, cy, r) + hole(cx, cy, r - width)

function star(cx, cy, r, points = 4, inner = 0.3) {
  return polygon(
    Array.from({ length: points * 2 }, (_, i) => {
      const angle = -Math.PI / 2 + (i * Math.PI) / points
      const radius = i % 2 ? r * inner : r
      return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]
    }),
  )
}

const diamond = (cx, cy, rx, ry) =>
  polygon([
    [cx, cy - ry],
    [cx + rx, cy],
    [cx, cy + ry],
    [cx - rx, cy],
  ])

/** A leaf from its base at (x, y), pointing at `angle` radians. */
function leaf(x, y, angle, length, width) {
  const [dx, dy] = [Math.cos(angle), Math.sin(angle)]
  const tip = [x + dx * length, y + dy * length]
  const side = (sign) => [
    x + dx * length * 0.45 - dy * width * sign,
    y + dy * length * 0.45 + dx * width * sign,
  ]
  return `M${at([x, y])}Q${at(side(1))} ${at(tip)}Q${at(side(-1))} ${at([x, y])}Z`
}

/** A crescent of radius `r` whose dark side faces `angle`. */
function crescent(cx, cy, r, angle, thickness = 0.42) {
  const steps = 28
  const arc = (i) => angle + Math.PI * 0.18 + (i / steps) * Math.PI * 1.64
  const outer = Array.from({ length: steps + 1 }, (_, i) => [
    cx + Math.cos(arc(i)) * r,
    cy + Math.sin(arc(i)) * r,
  ])
  const [ox, oy] = [cx + Math.cos(angle) * r * thickness, cy + Math.sin(angle) * r * thickness]
  const inner = Array.from({ length: steps + 1 }, (_, n) => {
    const i = steps - n
    const radius = r * (0.98 - 0.05 * Math.sin((i / steps) * Math.PI))
    return [ox + Math.cos(arc(i)) * radius, oy + Math.sin(arc(i)) * radius]
  })
  return polygon([...outer, ...inner])
}

function spiral(
  cx,
  cy,
  r0,
  turns,
  start,
  w,
  dir = 1,
) {
  const points = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40
    const angle = start + dir * t * turns * Math.PI * 2
    const r = r0 * (1 - t * 0.82)
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]
  })
  return tapered(points, w, w * 0.8, w * 0.25)
}

/** A wisp of smoke from `a` to `b`, waving `waves` times. */
function wisp(a, b, amplitude, waves, w) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
  const length = Math.hypot(dx, dy)
  const [nx, ny] = [-dy / length, dx / length]
  const points = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40
    const s = Math.sin(t * Math.PI * 2 * waves) * amplitude * Math.sin(t * Math.PI)
    return [a[0] + dx * t + nx * s, a[1] + dy * t + ny * s]
  })
  return tapered(points, w * 0.3, w, w * 0.15)
}

/** A squarish bead, like a vertebra. */
function bead(cx, cy, w, h) {
  return polygon(
    Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2
      const [c, s] = [Math.cos(angle), Math.sin(angle)]
      return [
        cx + Math.sign(c) * Math.abs(c) ** 0.6 * w,
        cy + Math.sign(s) * Math.abs(s) ** 0.6 * h,
      ]
    }),
  )
}

const ray = (cx, cy, angle, r0, r1, w) =>
  stroke(
    [cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0],
    [cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1],
    w,
    w * 0.7,
    0.05,
  )

function shield(cx, cy, s) {
  return `M${at([cx - s, cy - s * 0.9])}L${at([cx + s, cy - s * 0.9])}L${at([cx + s, cy])}Q${at([cx + s, cy + s * 0.8])} ${at([cx, cy + s * 1.25])}Q${at([cx - s, cy + s * 0.8])} ${at([cx - s, cy])}Z`
}

/* ── corners: a tapered bracket the motif grows out of ─────────────────── */

const bracket = (reach = 44, w = 1.25) => [
  stroke([2, 2], [reach, 2], w, w * 0.75, 0.12),
  stroke([2, 2], [2, reach], w, w * 0.75, 0.12),
]

/** The domains with a motif of their own; the rest wear the plain set. */

const corners = {
  arcana: () => [
    ...bracket(42),
    ring(9, 9, 5.2, 1.1),
    circle(9, 9, 1.5),
    swash([24, 3.5], [20, 12], [12, 20], [3.5, 24], 0.2, 0.9, 0.2),
    star(22, 13, 3, 4, 0.22),
    star(13, 22, 3, 4, 0.22),
    star(29, 9, 1.6, 4, 0.3),
    star(9, 29, 1.6, 4, 0.3),
    diamond(34, 2, 1.3, 2.4),
    diamond(2, 34, 2.4, 1.3),
  ],
  blade: () => [
    ...bracket(46, 1.4),
    stroke([7, 7], [40, 7], 0.6, 0.45, 0.05),
    stroke([7, 7], [7, 40], 0.6, 0.45, 0.05),
    polygon([
      [2.5, 2.5],
      [17, 11],
      [11, 17],
    ]),
    polygon([
      [24, 2.5],
      [27, 7.5],
      [30, 2.5],
    ]),
    polygon([
      [2.5, 24],
      [7.5, 27],
      [2.5, 30],
    ]),
    diamond(7, 7, 1.6, 1.6),
  ],
  bone: () => {
    const spine = [10.5, 15.5, 20, 24, 27.5, 30.6]
    return [
      ...bracket(44, 0.9),
      circle(6, 6, 3.6),
      ...spine.map((x, i) => bead(x, 2.2, 1.9 - i * 0.2, 1.7 - i * 0.18)),
      ...spine.map((y, i) => bead(2.2, y, 1.7 - i * 0.18, 1.9 - i * 0.2)),
      swash([20, 6], [17, 12], [12, 17], [6, 20], 0.15, 0.85, 0.15),
      swash([28, 7], [24, 17], [17, 24], [7, 28], 0.12, 0.6, 0.12),
    ]
  },
  codex: () => [
    polygon([
      [0, 0],
      [17, 0],
      [0, 17],
    ]),
    stroke([2, 21], [21, 2], 0.5, 0.5, 0.5),
    stroke([20, 2], [44, 2], 0.9, 0.6, 0.1),
    stroke([2, 20], [2, 44], 0.9, 0.6, 0.1),
    stroke([20, 5.2], [36, 5.2], 0.4, 0.3, 0.05),
    stroke([5.2, 20], [5.2, 36], 0.4, 0.3, 0.05),
    polygon([
      [24, 0.5],
      [30, 0.5],
      [30, 4.5],
      [27, 7],
      [24, 4.5],
    ]),
    polygon([
      [0.5, 24],
      [0.5, 30],
      [4.5, 30],
      [7, 27],
      [4.5, 24],
    ]),
  ],
  grace: () => [
    swash([2, 2], [16, 1], [26, 8], [24, 13], 1.2, 0.9, 0.5),
    spiral(21, 10.5, 3.6, 0.85, 0.3, 0.55),
    swash([2, 2], [1, 16], [8, 26], [13, 24], 1.2, 0.9, 0.5),
    spiral(10.5, 21, 3.6, 0.85, 1.2, 0.55, -1),
    swash([26, 2.5], [32, 1.5], [38, 3], [44, 2], 0.6, 0.5, 0.1),
    swash([2.5, 26], [1.5, 32], [3, 38], [2, 44], 0.6, 0.5, 0.1),
    leaf(5, 5, Math.PI / 4, 8, 2.6),
    circle(33, 6, 0.9),
    circle(6, 33, 0.9),
  ],
  midnight: () => [
    ...bracket(40, 0.85),
    crescent(10, 10, 6, Math.PI * 1.25, 0.5),
    star(25, 6.5, 2.8, 4, 0.22),
    star(6.5, 25, 2.8, 4, 0.22),
    star(20, 19, 1.4, 4, 0.3),
    wisp([14, 2.2], [46, 3], 1.6, 1.5, 0.9),
    wisp([2.2, 14], [3, 46], 1.6, 1.5, 0.9),
  ],
  sage: () => [
    swash([2, 2], [16, 3], [30, 1], [46, 2.5], 1.1, 0.8, 0.1),
    swash([2, 2], [3, 16], [1, 30], [2.5, 46], 1.1, 0.8, 0.1),
    leaf(4, 4, Math.PI / 4, 13, 3.4),
    leaf(4, 4, Math.PI / 4 - 0.55, 10, 2.6),
    leaf(4, 4, Math.PI / 4 + 0.55, 10, 2.6),
    leaf(18, 2.3, -0.9, 7, 2),
    leaf(26, 2.1, 0.75, 6, 1.8),
    leaf(34, 2.2, -0.8, 5, 1.5),
    leaf(2.3, 18, Math.PI / 2 + 0.9, 7, 2),
    leaf(2.1, 26, Math.PI / 2 - 0.75, 6, 1.8),
    leaf(2.2, 34, Math.PI / 2 + 0.8, 5, 1.5),
  ],
  splendor: () => [
    ...bracket(44, 0.9),
    ring(4, 4, 5, 1),
    circle(4, 4, 2.6),
    ...[0.12, 0.3, 0.5, 0.7, 0.88].map((k, i) =>
      ray(4, 4, (k * Math.PI) / 2, 7.5, i % 2 ? 15 : 21, i % 2 ? 0.7 : 1),
    ),
    star(30, 7, 1.8, 4, 0.25),
    star(7, 30, 1.8, 4, 0.25),
    circle(38, 2, 0.8),
    circle(2, 38, 0.8),
  ],
  valor: () => {
    const laurel = [16, 22, 28, 34]
    const size = (i) => [6 - i * 0.7, 1.7 - i * 0.2]
    return [
      ...bracket(44, 1.1),
      shield(9, 8.5, 4.6),
      ...laurel.flatMap((x, i) => [
        leaf(x, 2.2, -0.55, ...size(i)),
        leaf(x, 2.2, 0.55, ...size(i)),
      ]),
      ...laurel.flatMap((y, i) => [
        leaf(2.2, y, Math.PI / 2 - 0.55, ...size(i)),
        leaf(2.2, y, Math.PI / 2 + 0.55, ...size(i)),
      ]),
      circle(40, 2.2, 1),
      circle(2.2, 40, 1),
    ]
  },
  /* ── past the corebook ─────────────────────────────────────────
     gluvtt stops at the printed ten and lets everything else wear the plain
     set. Three of those are not stand-ins here: Dread is a printed domain
     with its own cards, and Root and Void are the Twilight Marked's pair. A
     plain bracket beside nine motifs reads as a card that has not been
     finished, so they get their own. Artifice stays plain: it is one homebrew
     domain behind a setting, and inventing heraldry for it is further than
     the evidence goes. */

  dread: () => [
    swash([2, 2], [18, 2.6], [32, 1.2], [46, 3], 1.2, 0.7, 0.08),
    swash([2, 2], [2.6, 18], [1.2, 32], [3, 46], 1.2, 0.7, 0.08),
    swash([16, 3], [19, 7], [16, 10], [12, 9], 0.9, 0.5, 0.06),
    swash([3, 16], [7, 19], [10, 16], [9, 12], 0.9, 0.5, 0.06),
    swash([28, 2.2], [31, 6], [28, 8.4], [25, 7.4], 0.7, 0.4, 0.05),
    swash([2.2, 28], [6, 31], [8.4, 28], [7.4, 25], 0.7, 0.4, 0.05),
    crescent(8.6, 8.6, 4.4, -Math.PI / 4, 0.3),
    crescent(8.6, 8.6, 4.4, Math.PI * 0.75, 0.3),
    diamond(8.6, 8.6, 1.5, 1.1),
  ],
  root: () => [
    swash([2, 2], [14, 5], [28, 3], [46, 4], 1.3, 0.75, 0.08),
    swash([2, 2], [5, 14], [3, 28], [4, 46], 1.3, 0.75, 0.08),
    // Three roots feeling their way out of the elbow. The control points pull
    // hard sideways before they turn down: a root that leaves straight reads as
    // wire, and the first pass at this did exactly that.
    swash([5, 5], [17, 8], [16, 19], [24, 28], 1, 0.45, 0.05),
    swash([5, 5], [8, 17], [19, 16], [28, 24], 1, 0.45, 0.05),
    swash([5, 5], [14, 12], [18, 10], [30, 15], 0.8, 0.32, 0.04),
    swash([5, 5], [12, 14], [10, 18], [15, 30], 0.8, 0.32, 0.04),
    swash([14.5, 12.5], [19, 9.5], [23, 11], [27, 8.5], 0.4, 0.2, 0.03),
    swash([12.5, 14.5], [9.5, 19], [11, 23], [8.5, 27], 0.4, 0.2, 0.03),
    circle(24.4, 28.4, 1.35),
    circle(28.4, 24.4, 1.35),
    circle(3.6, 3.6, 2),
  ],
  void: () => [
    ...bracket(40, 1.05),
    ring(11.5, 11.5, 6.2, 0.95),
    crescent(11.5, 11.5, 4.5, -Math.PI / 4, 0.5),
    circle(26, 2.9, 1.1),
    circle(2.9, 26, 1.1),
    circle(34, 2.2, 0.7),
    circle(2.2, 34, 0.7),
    star(20, 20, 1.4, 4, 0.22),
  ],
  plain: () => [
    ...bracket(42, 1),
    diamond(8, 8, 2.6, 2.6),
    diamond(24, 2, 1.2, 2),
    diamond(2, 24, 2, 1.2),
    circle(34, 2, 0.8),
    circle(2, 34, 0.8),
  ],
}

/* ── seams: the left half, 0 to 88, centred on y = 12 ─────────────────── */

const seamRule = (w = 0.9) => stroke([88, 12], [0, 12], w, w * 0.7, 0.08)

const seams = {
  arcana: () => [
    seamRule(0.7),
    swash([86, 6], [76, 2], [62, 4], [56, 12], 0.15, 0.7, 0.2),
    swash([86, 18], [76, 22], [62, 20], [56, 12], 0.15, 0.7, 0.2),
    ring(48, 12, 3.2, 0.8),
    star(36, 12, 2.6, 4, 0.22),
    star(26, 8.5, 1.3, 4, 0.3),
    star(22, 15.5, 1.1, 4, 0.3),
    diamond(14, 12, 1.1, 1.6),
  ],
  blade: () => [
    polygon([
      [88, 10.6],
      [12, 11.8],
      [4, 12],
      [12, 12.2],
      [88, 13.4],
    ]),
    stroke([84, 12], [20, 12], 0.25, 0.2, 0.05),
    swash([86, 12], [84, 4], [78, 3], [74, 6], 0.9, 0.6, 0.2),
    swash([86, 12], [84, 20], [78, 21], [74, 18], 0.9, 0.6, 0.2),
    diamond(60, 12, 3, 3),
  ],
  bone: () => [
    seamRule(0.5),
    ...[82, 74.5, 67.8, 61.8, 56.4, 51.6, 47.3, 43.5].map((x, i) =>
      bead(x, 12, 3 - i * 0.28, 2.6 - i * 0.24),
    ),
    swash([80, 6], [70, 3], [58, 5], [50, 8], 0.1, 0.5, 0.1),
    swash([80, 18], [70, 21], [58, 19], [50, 16], 0.1, 0.5, 0.1),
  ],
  codex: () => [
    stroke([88, 10.4], [6, 10.4], 0.45, 0.4, 0.05),
    stroke([88, 13.6], [6, 13.6], 0.45, 0.4, 0.05),
    polygon([
      [78, 8],
      [84, 8],
      [84, 16],
      [78, 16],
    ]),
    polygon([
      [79.4, 9.4],
      [79.4, 14.6],
      [82.6, 14.6],
      [82.6, 9.4],
    ]),
    polygon([
      [66, 13.6],
      [70, 13.6],
      [70, 22.5],
      [68, 20.5],
      [66, 22.5],
    ]),
    diamond(50, 12, 2.2, 2.2),
    diamond(30, 12, 1.4, 1.4),
  ],
  grace: () => [
    seamRule(0.6),
    swash([86, 12], [78, 2], [64, 3], [64, 9], 0.6, 0.8, 0.4),
    spiral(60.5, 8.5, 3.6, 0.85, 0.2, 0.5),
    swash([86, 12], [78, 22], [64, 21], [64, 15], 0.6, 0.8, 0.4),
    spiral(60.5, 15.5, 3.6, 0.85, -0.2, 0.5, -1),
    swash([56, 12], [48, 5], [40, 6], [36, 10], 0.4, 0.5, 0.2),
    swash([56, 12], [48, 19], [40, 18], [36, 14], 0.4, 0.5, 0.2),
    circle(28, 12, 1.1),
    circle(20, 12, 0.7),
  ],
  midnight: () => [
    wisp([88, 12], [4, 12], 1.6, 2.5, 0.85),
    circle(78, 12, 2.8),
    crescent(67, 12, 2.8, Math.PI, 0.35),
    crescent(57, 12, 2.6, Math.PI, 0.55),
    crescent(48, 12, 2.3, Math.PI, 0.75),
    star(36, 6.5, 1.8, 4, 0.24),
    star(30, 17, 1.3, 4, 0.3),
    star(20, 8, 1, 4, 0.3),
  ],
  sage: () => [
    swash([88, 12], [64, 6], [40, 18], [4, 12], 0.95, 0.75, 0.08),
    leaf(78, 10.2, -2.5, 8, 2.4),
    leaf(70, 9.5, 2.3, 7, 2.2),
    leaf(60, 11.5, -2.6, 7, 2),
    leaf(50, 13.5, 2.6, 6, 1.8),
    leaf(40, 14.5, -2.4, 5, 1.5),
    leaf(30, 14, 2.5, 4, 1.2),
    circle(84, 6.5, 0.9),
    circle(84, 17.5, 0.9),
  ],
  splendor: () => [
    seamRule(0.6),
    ...[-0.5, -0.3, -0.12, 0.12, 0.3, 0.5].map((k, i) =>
      ray(100, 12, Math.PI + k, 14, i % 2 ? 46 : 64, i % 2 ? 0.55 : 0.8),
    ),
    ray(100, 12, Math.PI, 14, 96, 0.9),
    circle(26, 12, 1.2),
    star(18, 12, 2.2, 4, 0.25),
  ],
  valor: () => [
    seamRule(0.8),
    ...[80, 72, 64, 56, 48, 40].flatMap((x, i) => [
      leaf(x, 12, Math.PI - 0.55, 8 - i * 0.6, 2.2 - i * 0.18),
      leaf(x, 12, Math.PI + 0.55, 8 - i * 0.6, 2.2 - i * 0.18),
    ]),
    diamond(86, 12, 2, 6),
    circle(30, 12, 1.2),
  ],
  dread: () => [
    seamRule(0.55),
    crescent(78, 12, 3.2, -Math.PI / 2, 0.3),
    crescent(78, 12, 3.2, Math.PI / 2, 0.3),
    diamond(78, 12, 1.2, 0.9),
    ...[66, 58, 51, 45].map((x, i) => bead(x, 12, 2.4 - i * 0.3, 2.1 - i * 0.26)),
    swash([70, 7], [62, 4.5], [54, 6], [48, 9], 0.1, 0.45, 0.08),
    swash([70, 17], [62, 19.5], [54, 18], [48, 15], 0.1, 0.45, 0.08),
    star(34, 12, 1.6, 4, 0.26),
  ],
  root: () => [
    wisp([88, 12], [6, 12], 1.2, 2, 0.8),
    ...[80, 70, 61, 53].map((x, i) => bead(x, 12, 2.2 - i * 0.28, 2 - i * 0.24)),
    leaf(44, 12, -0.7, 8, 2.2),
    leaf(44, 12, 0.7, 8, 2.2),
    leaf(32, 12, -0.5, 6, 1.7),
    leaf(32, 12, 0.5, 6, 1.7),
  ],
  void: () => [
    seamRule(0.45),
    ring(78, 12, 4, 0.8),
    crescent(78, 12, 2.8, -Math.PI / 2, 0.5),
    circle(64, 12, 1.4),
    circle(54, 12, 1),
    circle(45, 12, 0.7),
    star(34, 8, 1.2, 4, 0.24),
    star(28, 16, 0.9, 4, 0.24),
  ],
  plain: () => [seamRule(0.7), diamond(70, 12, 2, 2), diamond(48, 12, 1.4, 1.4), circle(28, 12, 1)],
}

const motifs = new Set(Object.keys(corners))

/** The motif `domain` wears: its own set, or the plain one past the corebook. */
export const motifOf = (domain) => (motifs.has(domain) ? domain : 'plain')

const svg = (viewBox, body) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="none">${body}</svg>`)}")`

/**
 * A motif's corner and seam as images for a CSS mask: the corner for the top left of a
 * 48-unit square, which its element mirrors into place, and the whole seam band.
 */
export function ornamentImages(motif) {
  const corner = corners[motif]().join('')
  const seam = seams[motif]().join('')
  return {
    corner: svg('0 0 48 48', `<path d="${corner}"/>`),
    seam: svg(
      '0 0 200 24',
      `<path d="${seam}"/><path d="${seam}" transform="translate(200 0) scale(-1 1)"/>`,
    ),
  }
}
