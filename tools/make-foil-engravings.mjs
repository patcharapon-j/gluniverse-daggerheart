/**
 * Draws the two campaign decks' foil engravings into design/assets/foil/.
 *
 *     node tools/make-foil-engravings.mjs design/assets/foil
 *
 * One drawing per deck, composed for the painting's own box (100 × 78, the
 * face's art region in `--u`) and centred on where the sigil sits. NOT a
 * tile. The first foil tiled a small drawing across the card and it read as
 * wallpaper however good the drawing was, because repetition is what a
 * printed pattern does and the one thing an engraved plate never does. An
 * engraving is a single composition with a centre.
 *
 * Both files are masks — white only, opacity is the drawing — and
 * design/foil.css supplies the metal and decides where light falls on them.
 *
 *   ROOT  wood grain. Lines flow up the card and part around the sigil the
 *         way grain parts around a knot, with growth rings in the knot. It
 *         is the streamlines of flow past a cylinder, ψ = x·(1 − R²/r²),
 *         which is why the parting looks grown rather than drawn: every line
 *         bends exactly as much as its distance from the knot says it must.
 *   VOID  a construction drawing. Rings, an inscribed hexagram and square,
 *         a ticked bezel and ruled axes, all from one centre — the kind of
 *         figure that can only be made with a compass and a straight edge,
 *         which is precisely what makes it read as made by something else.
 *
 * Seeded, so a re-run writes the same two files.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] ?? ".";
const W = 100;
const H = 78;
const C = [50, 39]; // the sigil's centre in the art box

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r2 = (n) => Math.round(n * 100) / 100;
const at = ([x, y]) => `${r2(x)} ${r2(y)}`;
const polygon = (pts) => `M${pts.map(at).join("L")}Z`;

/** A filled stroke along `points` whose half-width is `width(t)`. */
function tapered(points, width) {
  const left = [];
  const right = [];
  const last = points.length - 1;
  points.forEach(([x, y], i) => {
    const [ax, ay] = points[Math.max(0, i - 1)];
    const [bx, by] = points[Math.min(last, i + 1)];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const [dx, dy] = [(bx - ax) / len, (by - ay) / len];
    const w = width(i / last);
    left.push([x - dy * w, y + dx * w]);
    right.push([x + dy * w, y - dx * w]);
  });
  return polygon([...left, ...right.reverse()]);
}

/* ── ROOT · grain round a knot ─────────────────────────────────────── */
function root() {
  const rand = rng(0x2007);
  const R = 17; // the knot
  const out = [];

  /* For a streamline ψ, solve x at height y by bisection on
     ψ(x) = (x − cx)·(1 − R²/r²). Outside the knot ψ is monotonic in x on
     each side, so a bisection between the knot's edge and the box edge is
     always well posed. */
  const xAt = (psi, y) => {
    const dy = y - C[1];
    const f = (x) => {
      const dx = x - C[0];
      const r = dx * dx + dy * dy;
      return dx * (1 - (R * R) / Math.max(r, 1e-6)) - psi;
    };
    const side = Math.sign(psi) || 1;
    const inner = C[0] + side * Math.sqrt(Math.max(R * R - dy * dy, 0) + 0.01);
    let a = inner;
    let b = C[0] + side * 80;
    for (let i = 0; i < 40; i++) {
      const m = (a + b) / 2;
      if (Math.sign(f(m)) === Math.sign(f(a))) a = m;
      else b = m;
    }
    return (a + b) / 2;
  };

  for (let psi = -46; psi <= 46; psi += 2.3) {
    if (Math.abs(psi) < 0.6) continue;
    const phase = rand() * Math.PI * 2;
    const amp = 0.5 + rand() * 0.6;
    /* Not every line runs the whole height: grain starts and stops, and a
       field of unbroken parallels reads as ruled rather than grown. */
    const y0 = rand() < 0.35 ? rand() * 30 : -2;
    const y1 = rand() < 0.35 ? H - rand() * 30 : H + 2;
    const pts = [];
    for (let y = y1; y >= y0; y -= 1.2) {
      const x = xAt(psi, y) + Math.sin(y * 0.11 + phase) * amp;
      pts.push([x, y]);
    }
    if (pts.length < 6) continue;
    /* Thick in the middle and hair-thin at both ends — the swell of a
       graver's cut, which is what separates an engraving from a plot. */
    const peak = 0.22 + rand() * 0.16;
    out.push(tapered(pts, (t) => 0.05 + peak * Math.sin(Math.PI * t)));
  }

  /* Growth rings in the knot, never quite round and never quite closed. */
  for (let i = 0; i < 4; i++) {
    const rr = R - 3.4 - i * 3.1;
    if (rr < 3) break;
    const gap = rand() * Math.PI * 2;
    const pts = [];
    for (let a = 0; a <= Math.PI * 1.82; a += 0.08) {
      const ang = gap + a;
      const wob = 1 + 0.06 * Math.sin(ang * 3 + i);
      pts.push([C[0] + Math.cos(ang) * rr * wob * 1.06, C[1] + Math.sin(ang) * rr * wob]);
    }
    out.push(tapered(pts, (t) => 0.04 + 0.2 * Math.sin(Math.PI * t)));
  }
  return { fill: out.join(""), stroke: "" };
}

/* ── VOID · a construction drawing ─────────────────────────────────── */
function voidPlate() {
  const [cx, cy] = C;
  const s = [];
  const ring = (r, w, o = 1) =>
    s.push(`<circle cx="${cx}" cy="${cy}" r="${r2(r)}" stroke-width="${w}" stroke-opacity="${o}"/>`);
  const line = (a, b, w, o = 1) =>
    s.push(
      `<path d="M${at(a)}L${at(b)}" stroke-width="${w}" stroke-opacity="${o}"/>`,
    );
  const poly = (n, r, rot, w, o = 1) => {
    const pts = Array.from({ length: n }, (_, i) => {
      const a = rot + (i * 2 * Math.PI) / n;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    });
    s.push(`<path d="${polygon(pts)}" stroke-width="${w}" stroke-opacity="${o}"/>`);
    return pts;
  };

  ring(13, 0.3);
  ring(21, 0.22, 0.8);
  ring(29, 0.34);
  ring(29.9, 0.12, 0.6);

  /* The hexagram inscribed in the outer ring, as two triangles, and a
     square in the middle ring turned to its diagonal. */
  const up = poly(3, 29, -Math.PI / 2, 0.26);
  poly(3, 29, Math.PI / 2, 0.26);
  poly(4, 21, Math.PI / 4, 0.2, 0.8);

  /* Nodes where the construction meets itself. */
  for (const [x, y] of up.concat(
    Array.from({ length: 3 }, (_, i) => {
      const a = Math.PI / 2 + (i * 2 * Math.PI) / 3;
      return [cx + Math.cos(a) * 29, cy + Math.sin(a) * 29];
    }),
  )) {
    s.push(`<circle cx="${r2(x)}" cy="${r2(y)}" r="0.7" fill="#fff" stroke="none"/>`);
  }

  /* The bezel: 72 ticks, every sixth long — an instrument's dial. */
  for (let i = 0; i < 72; i++) {
    const a = (i * Math.PI * 2) / 72;
    const long = i % 6 === 0;
    const r0 = 33;
    const r1 = long ? 36.4 : 34.4;
    line(
      [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0],
      [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1],
      long ? 0.3 : 0.18,
    );
  }

  /* Ruled axes at 0°, 60° and 120°, running out to the plate's edge and
     fainter than the figure, the way construction lines are left in. */
  for (const deg of [0, 60, 120]) {
    const a = (deg * Math.PI) / 180;
    const d = 90;
    line(
      [cx - Math.cos(a) * d, cy - Math.sin(a) * d],
      [cx + Math.cos(a) * d, cy + Math.sin(a) * d],
      0.14,
      0.55,
    );
  }
  return { fill: "", stroke: s.join("") };
}

const sheet = (name, { fill, stroke }, note) =>
  `<!-- GENERATED by tools/make-foil-engravings.mjs — do not edit by hand.\n` +
  `     ${note}\n` +
  `     A ${W}×${H} mask composed for the painting's box and centred on the\n` +
  `     sigil: white only, opacity is the drawing. design/foil.css supplies\n` +
  `     the metal and decides where the light falls. -->\n` +
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">\n` +
  (fill ? `  <path fill="#fff" d="${fill}"/>\n` : "") +
  (stroke ? `  <g fill="none" stroke="#fff" stroke-linecap="round">${stroke}</g>\n` : "") +
  `</svg>\n`;

mkdirSync(OUT, { recursive: true });
const files = {
  "root-engraving.svg": sheet("root", root(), "Root · wood grain parting round a knot, growth rings within."),
  "void-engraving.svg": sheet("void", voidPlate(), "Void · a compass-and-straightedge construction round one centre."),
};
for (const [name, text] of Object.entries(files)) {
  writeFileSync(join(OUT, name), text);
  console.log(`${name.padEnd(20)} ${Buffer.byteLength(text)} bytes`);
}
