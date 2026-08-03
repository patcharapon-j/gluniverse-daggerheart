/* ══════════════════════════════════════════════════════════════════
   DH LEDGER — what happened to a sheet while nobody posted anything

   Every other thing this system puts in the log is an event somebody
   chose: a roll, a card shown, a rest taken, a character finished. This
   is the opposite. A player marks three Stress and the GM, looking at
   the map, has no idea; a card is recalled out of the vault and the only
   witness is the sheet it happened on. The rules ask a table to keep
   these numbers where everyone can see them, and until now the only
   place any of them existed was the sheet of the person holding it.

   ── net, not keystrokes ───────────────────────────────────────────
   The unit is the change, not the write. Applying damage is four writes
   — armour, stress, hope, hit points — and one event. Fixing a miscount
   is three writes in two seconds and one correction. So entries are
   coalesced and what lands in the log is the net, never "+1, +1, −1,
   +2". Which also means a net of zero posts nothing at all, and marking
   a box by mistake and taking it back is not something the table has to
   watch happen.

   ── one line, and no numerals ─────────────────────────────────────
   It is a **note in the margin of the log**, not an object in it. A
   plate is 300px of card because a roll is the thing you are all
   looking at; this arrives while somebody is describing a room, and
   four of them between two rolls must not push the roll off screen. So
   a change is one line — and the line is a picture rather than a
   sentence, because there is nothing here a sentence says better:

     the label   which track
     the strip   the track as it now stands, at one box per point

   That is the total, the current value **and** the delta, in the one
   object, read without arithmetic:

     .on     marked before this entry, and receding — settled history
     .up     marked BY this entry: full strength, and lit
     .dn     given back by this entry: the ghost of the mark it left
     (bare)  never marked

   A run of dim marks ending in bright ones is a hit. A run ending in
   ghosts is a heal. Neither needs a number, and a number is what the
   old card led with — a 22px numeral and the word MARKED, above a
   strip that had already said it. Say it once, in the form that does
   not have to be read.

   ── the mark is the sheet's mark ──────────────────────────────────
   Crossing a box off has a look in this system and it is not a generic
   filled square: a wound is a tear that bows off the diagonal, a strain
   is a fine scored line, a plate is a chisel blow. That is `mark.js`'s
   whole argument — the tracks are told apart by *substance* first and
   hue second — and a log that drew three identical squares in three
   colours would be throwing away the half of it that survives being
   small.

   So these are the same arms, off the same point lists, via
   `armPolygon`. **Not the same `<svg>`**, and that distinction is the
   one constraint this card is built around: Foundry's sanitiser takes
   every `<svg>` out of stored message content on the way into the
   database. A posted card survives that by being redrawn from a flag on
   render; a mark track cannot, because a marked box that loses its X
   does not look broken, it looks **unmarked**, which is a lie rather
   than a degradation.

   Three of the four arms are pure point lists, so a `clip-path` is
   exactly the same shape and not an approximation of one. Every mark
   here is therefore an empty element with a hole cut in it, `GEMS` and
   `CHITS` are already `<i>`/`<b>`, and the whole message survives
   storage exactly as posted. No flag, no redraw, no render hook. A
   client without this system gets unstyled but truthful markup.
   ══════════════════════════════════════════════════════════════════ */

import { GEM } from './gem.js';
import { CHITS } from './chit.js';

const LABEL = {
  hitPoints: 'Hit Points',
  stress: 'Stress',
  armorSlots: 'Armor Slots',
  hope: 'Hope',
};

/* ── the range that moved ─────────────────────────────────────────
   Every row shape needs the same two indices — where the change starts
   and where it ends — and which way it went. Positions below `lo` are
   settled, positions in `[lo, hi)` are the delta, above `hi` is empty.
   One rule, four drawings of it. */
const span = (e) => ({
  lo: Math.min(e.from, e.to),
  hi: Math.max(e.from, e.to),
  up: e.to > e.from,
});

/* ── the fact, in words ───────────────────────────────────────────
   Every row on this card is a picture, and a picture reaches two
   readers badly: somebody using a screen reader, for whom a strip of
   empty elements is nothing at all, and a client that never got the
   stylesheet, for whom it is empty boxes. Both are handed the sentence
   instead — out of flow, one pixel, clipped away.

   This is the storage argument's other half rather than a second
   thought. The reason nothing here is `<svg>` is that a stripped mark
   *lies*; dropping the numerals costs the same reader a fact rather
   than telling them a falsehood, which is the better failure and still
   a failure. One element per row fixes it, and it is the same element
   assistive technology needed anyway. */
const said = (from, to, max) =>
  `<span class="sr">${from} to ${to}${max ? ` of ${max}` : ''}</span>`;

/* ── the strip ────────────────────────────────────────────────────
   `--n` sizes the box rather than the row, for MARKS's own reason: Hit
   Points and Stress sit one above the other and boxes sized
   independently are two different objects in one glance. The ledger
   passes the widest track in the *message*, so three rows stacked are
   three lengths of the same thing.

   `<u>` is the recess and the two arms are the box's own pseudo-
   elements, exactly as `mark.js` splits them — the recess carries the
   chamfer, and a clipped element clips its descendants, so the mark has
   to be a sibling of the thing it crosses out rather than a child. */
const strip = (e, n) => {
  const { lo, hi, up } = span(e);
  const len = Math.max(e.max, hi, 1);
  return `<div class="st" style="--n:${n ?? len}">${
    Array.from({ length: len }, (_, i) => {
      const cls = i < lo ? 'on' : i < hi ? (up ? 'up' : 'dn') : '';
      return `<i class="${cls}"><u></u></i>`;
    }).join('')}</div>`;
};

const track = (e, n) => `<div class="r" data-t="${e.kind}">
  <span class="k">${LABEL[e.kind]}</span>${said(e.from, e.to, e.max)}
  ${strip(e, n)}
</div>`;

/* ── Hope ─────────────────────────────────────────────────────────
   Gems, because gems are what the sheet draws and a log is not the
   place to introduce a second drawing of Hope. Built a pip at a time
   rather than through `GEMS`, so the three states the strip has are the
   three the pool has: a gained gem is lit and flagged, a spent one is
   the socket it left, and neither is a thing `GEMS` has any reason to
   know about — it draws a pool, and this draws what happened to one.

   `scars` rides along because a scarred slot is not an empty one — it
   is a socket that can never be filled again, and the sheet draws it as
   one. The live ceiling is already the printed six *minus* the scars,
   so the row is `max + scars` wide. A ledger that drew only the live
   half would be quietly dropping the permanent part of what happened to
   this character. */
const hope = (e) => {
  const { lo, hi, up } = span(e);
  const scars = e.scars ?? 0;
  const max = e.max + scars;
  const live = max - scars;
  return `<div class="r" data-t="hope">
  <span class="k">Hope</span>${said(e.from, e.to, e.max)}
  <div class="gm">${Array.from({ length: max }, (_, i) => {
    const scar = i >= live;
    const d = !scar && i >= lo && i < hi ? (up ? ' up' : ' dn') : '';
    return `<span class="g${d}">${GEM({ on: i < e.to, scar, sz: 11 })}</span>`;
  }).join('')}</div>
</div>`;
};

/* ── a card's counters ────────────────────────────────────────────
   The same row the loadout draws, as a readout — `add:false`, because a
   control in a record would be offering to change a number that changed
   three hours ago.

   The delta is then marked onto the row that came back, and the walk is
   the strip's rule again: chits and sockets in document order are the
   pool's positions in order, so `[lo, hi)` is the part that moved
   whichever way it went. A place lights the trailing chits; a spend
   lights the sockets they vacated, which stand in exactly the same
   places. It is a rewrite of markup generated one line above rather
   than a parse of somebody's HTML, and it is the only way to say this
   without `CHITS` learning what a ledger is. */
const RUN = /<(button|span) class="(chit|sk)"/g;

const deltaChits = (html, lo, hi, up) => {
  let i = 0;
  return html.replace(RUN, (m, tag, cls) => {
    const k = i++;
    return k >= lo && k < hi ? `<${tag} class="${cls} ${up ? 'nu' : 'gone'}"` : m;
  });
};

const pool = (e) => {
  const { lo, hi, up } = span(e);
  const max = e.max ?? 0;
  let row = CHITS({ value: e.to, max, name: e.name ?? 'tokens', add: false, dom: !!e.dom });
  /* An open pool has no sockets, so a spend has nothing standing where
     the chits were. It gets them: the pool ends at its last chit on a
     card because there is no capacity to draw, and here there is
     something better to say — this many were here a moment ago. */
  if (!up && !max) {
    row = row.replace(/<\/div>$/, '') +
      '<span class="sk gone"></span>'.repeat(hi - lo) + '</div>';
  }
  /* No class of its own, and that is the fix rather than the shape. It was
     `.r.pl`, and `.pl` is the **chat plate** — `plate.css` owns it, both
     load into the same `.dh` root where scoping does nothing, and a pool
     row was quietly taking the plate's paper ground, its overflow clip and
     its arrival animation. Fourth instance of the bug that renamed
     `.die.win` and `.dfn .pl`, and the honest answer here is that there was
     never anything for the class to say: `data-t` already names every row
     and the attribute cannot collide with a class. */
  return `<div class="r" data-t="pool"${
      e.dom ? ` style="--dom:${e.dom.light};--dom-dk:${e.dom.dark}"` : ''}>
  <span class="k">${e.label}</span>${said(e.from, e.to, max)}
  <div class="ch">${deltaChits(row, lo, hi, up)}</div>
</div>`;
};

/* ── a card crossing ──────────────────────────────────────────────
   No quantity, so nothing to draw a strip of: the row is a name and a
   direction, and the direction is the arrow rather than the word. The
   pip is the card's domain, which is the one hue on this card that is
   not a track's material, and it is right here for the reason it is
   right everywhere else — the colour *is* how you know which card. */
const move = (e) => `<div class="r" data-t="move"${e.into ? ' data-into' : ''}${
    e.dom ? ` style="--dom:${e.dom.light};--dom-dk:${e.dom.dark}"` : ''}>
  <i class="pip"></i>
  <span class="k nm">${e.label}</span>
  <span class="sr">${e.into ? 'recalled to the' : 'shelved in the'}</span>
  <span class="wh">${e.into ? 'loadout' : 'vault'}</span>
</div>`;

const ROW = { hitPoints: track, stress: track, armorSlots: track, hope, pool, move };

/**
 * One message for everything that settled in one window.
 *
 * `who` is named on the card itself rather than left to the message
 * header, for the plate's reason: a module that suppresses Foundry's
 * header must not be able to take the subject of the sentence with it.
 */
export const LEDGER = ({ who = 'Someone', entries = [] }) => {
  // Every strip in one message shares a box size, so three tracks
  // stacked read as three lengths of the same thing rather than as
  // three objects that happen to be near each other.
  const n = Math.max(1, ...entries.filter(e => ROW[e.kind] === track)
                                  .map(e => Math.max(e.max, e.from, e.to)));
  return `
<div class="ldg">
  <div class="hd">Changes<s>${who}</s></div>
  ${entries.map(e => (ROW[e.kind] ?? move)(e, n)).join('')}
</div>`;
};
