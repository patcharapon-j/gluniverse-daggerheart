/* Vendored from design/seat.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/seat.js and re-run `node scripts/port-design-js.mjs`. */
// The ringed seat — one character at a glance.
//
// A round portrait with its three tracks bent round it as partial rings,
// outermost first: Armor, then Hit Points, then Stress. The geometry is the
// GLUniverse stream kit's (`VitalRings.tsx`): every ring runs from 110° to
// 300° clockwise from three o'clock, so it rises from below the portrait,
// round its left and over the top, and stops short of the name on its right.
// The same object on the broadcast and at the table is the point — a player
// who has watched the stream already knows how to read the party stack.
//
// Two departures from the stream kit, both this system's own rules rather
// than taste:
//   - Armor is the OUTER ring, not the inner. Armour is what stands between a
//     hit and your Hit Points, so it stands outside them — the token chip's
//     radial order, argued in CLAUDE.md "The gauge".
//   - Armor lights what is LEFT and goes dark as it is spent. Hit Points and
//     Stress are things that happen to you; Armor is a purse. `litOf` in
//     token.js makes the same split.
//
// Boxes still open sit at the ring's start; marked ones gather at its far
// end, so a ring drains back towards where it began as it is marked — the
// stream kit's direction, kept, because the far end is over the top of the
// portrait where the eye already is.
//
// Rendered once and driven afterwards through `setSeat`, the contract
// `setMarks` and `setPool` keep: a box that changes plays its landing and
// nothing else on the seat moves.
//
// ── the option object ───────────────────────────────────────────────
//   id          the actor it stands for; data-seat, for the gestures
//   name, sub   the two lines beside the ring. `sub` is the class, or a
//               condition when one is the most important fact
//   img         portrait URL (cover-cropped into the disc)
//   hp, st, ar  [marked, max] — ar is [spent, max]
//   hope        [cur, max, scars] or null for a creature with no Hope
//   state       'vulnerable' | 'down' | undefined
//   self        this is the viewer's own seat (a quiet paper edge)
//   size        the ring box in px; 64 by default
import { GEMS, setPool } from './gem.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const SEAT_FROM = 110;
export const SEAT_TO = 300;

/* Radii as fractions of the box, from the stream kit's 184px box
   (74 / 66 / 58), with the order turned round for Armor-outside. The disc is
   the stream kit's stone, which sits just inside the innermost ring. */
const RING = { ar: 74 / 184, hp: 66 / 184, st: 58 / 184 };
const DISC = 47 / 184;
/* The gap between two boxes, as an arc length, so every ring's notches read
   as the same notch whatever its radius. Measured off the stream kit's 3.4px
   at 184 and scaled. */
const GAP = 3.4 / 184;
/* Stroke widths, as fractions of the box. The band is the dark channel every
   box sits in; it is a little wider than a box so the ring reads as cut into
   the map rather than painted on it. */
const W_BOX = 5.2 / 184;
const W_BAND = 7.4 / 184;

const point = (c, r, deg) => {
  const a = deg * Math.PI / 180;
  return `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
};
const arc = (c, r, from, to) =>
  `M${point(c, r, from)}A${r.toFixed(2)} ${r.toFixed(2)} 0 ${to - from > 180 ? 1 : 0} 1 ${point(c, r, to)}`;

/** Which boxes are lit, in ring order. Marked tracks light the far end;
    Armor lights what is left, from the start. */
export const litOf = (kind, marked, max) =>
  Array.from({ length: max }, (_, b) => kind === 'ar' ? b < max - marked : b >= max - marked);

const ringOf = (kind, [marked, max], size) => {
  if (!max) return '';
  const c = size / 2, r = RING[kind] * size;
  const gap = (GAP * size / r) * 180 / Math.PI;
  const step = (SEAT_TO - SEAT_FROM) / max;
  const lit = litOf(kind, marked, max);
  const boxes = lit.map((on, b) =>
    `<path class="vs-b${on ? ' on' : ''}" d="${arc(c, r, SEAT_FROM + step * b + gap / 2, SEAT_FROM + step * (b + 1) - gap / 2)}"/>`).join('');
  return `<g class="vs-r" data-k="${kind}" data-max="${max}" style="--w:${(W_BOX * size).toFixed(2)}px;--wb:${(W_BAND * size).toFixed(2)}px">
    <path class="vs-band" d="${arc(c, r, SEAT_FROM - 2, SEAT_TO + 2)}"/>${boxes}</g>`;
};

/* The sentence a screen reader gets instead of a picture of arcs. */
const said = (o) => [
  o.name,
  o.hp?.[1] ? `${o.hp[0]} of ${o.hp[1]} Hit Points marked` : '',
  o.st?.[1] ? `${o.st[0]} of ${o.st[1]} Stress marked` : '',
  o.ar?.[1] ? `${o.ar[1] - o.ar[0]} of ${o.ar[1]} Armor Slots left` : '',
  o.hope ? `${o.hope[0]} Hope` : '',
  o.state === 'vulnerable' ? 'Vulnerable' : o.state === 'down' ? 'down' : '',
].filter(Boolean).join(', ');

export const SEAT = (opts) => {
  const o = { size: 64, hp: [0, 0], st: [0, 0], ar: [0, 0], ...opts };
  const s = o.size, c = s / 2, d = DISC * s;
  const clip = `vsc-${o.id ?? Math.random().toString(36).slice(2, 8)}`;
  return `
<div class="vseat${o.self ? ' is-self' : ''}"${o.id ? ` data-seat="${o.id}"` : ''}${
    o.state ? ` data-state="${o.state}"` : ''} data-name="${esc(o.name)}" style="--vs:${s}px" role="img" aria-label="${esc(said(o))}">
  <svg class="vs-ring" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" aria-hidden="true">
    <defs><clipPath id="${clip}"><circle cx="${c}" cy="${c}" r="${d.toFixed(2)}"/></clipPath></defs>
    <circle class="vs-well" cx="${c}" cy="${c}" r="${(d + 1.5).toFixed(2)}"/>
    ${o.img ? `<image href="${esc(o.img)}" x="${(c - d).toFixed(2)}" y="${(c - d).toFixed(2)}" width="${(2 * d).toFixed(2)}" height="${(2 * d).toFixed(2)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>` : ''}
    <circle class="vs-lip" cx="${c}" cy="${c}" r="${d.toFixed(2)}"/>
    ${ringOf('ar', o.ar, s)}${ringOf('hp', o.hp, s)}${ringOf('st', o.st, s)}
  </svg>${o.hope ? `
  <b class="vs-hn" aria-hidden="true">${o.hope[0]}</b>` : ''}
  <span class="vs-id">
    <b class="vs-name">${esc(o.name)}</b>
    <span class="vs-sub">${esc(o.sub)}</span>
    ${o.hope ? `<span class="vs-hope">${GEMS({ cur: o.hope[0], max: o.hope[1], scars: o.hope[2] ?? 0, sz: 10, gap: 3 })}</span>` : ''}
  </span>
</div>`;
};

/** Drive a seat to new values. Only boxes whose state changes are touched,
    and each of those plays `.land` once. Restarting an animation costs a
    forced layout, so every box that moved shares one flush — setMarks's
    two-pass shape, for its reason. */
export function setSeat(seat, { hp, st, ar, hope } = {}) {
  const moving = [];
  if (hope) {
    const hn = seat.querySelector('.vs-hn'); if (hn) hn.textContent = hope[0];
    const gems = seat.querySelector('.vs-hope .gems'); if (gems) setPool(gems, hope[0]);
  }
  for (const [kind, v] of [['hp', hp], ['st', st], ['ar', ar]]) {
    if (!v) continue;
    const g = seat.querySelector(`.vs-r[data-k="${kind}"]`);
    if (!g) continue;
    const boxes = [...g.querySelectorAll('.vs-b')];
    const lit = litOf(kind, v[0], boxes.length);
    boxes.forEach((b, i) => {
      if (b.classList.contains('on') === lit[i]) return;
      b.classList.remove('land', 'drop');
      moving.push([b, lit[i]]);
    });
  }
  if (moving.length) void seat.getBoundingClientRect();
  for (const [b, on] of moving) {
    b.classList.toggle('on', on);
    b.classList.add(on ? 'land' : 'drop');
  }
  /* The sentence is the seat for anybody not looking at it, so it moves
     with the rings: read back off what is now drawn, not off the call. */
  const count = (k, lit) => { const g = seat.querySelector(`.vs-r[data-k="${k}"]`); if (!g) return [0, 0];
    const b = [...g.querySelectorAll('.vs-b')]; const on = b.filter(x => x.classList.contains('on')).length;
    return [lit ? b.length - on : on, b.length]; };
  const hn = seat.querySelector('.vs-hn');
  seat.setAttribute('aria-label', said({ name: seat.dataset.name, hp: count('hp'), st: count('st'),
    ar: count('ar', true), hope: hn ? [+hn.textContent] : null, state: seat.dataset.state }));
}
