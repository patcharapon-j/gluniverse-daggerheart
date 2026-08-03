/* Vendored from design/ledger.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/ledger.js and re-run `node scripts/port-design-js.mjs`. */
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
   coalesced and what lands in the log is the **net**: 3 → 5 Hit Points,
   never "+1, +1, −1, +2". Which also means a net of zero posts nothing
   at all, and marking a box by mistake and taking it back is not
   something the table has to watch happen.

   ── the strip is the point ────────────────────────────────────────
   A delta with no total is half a fact. "Marked 2 Stress" does not say
   whether she is one box from Vulnerable, and that is the only thing
   anybody wanted to know. So a row carries the track *as it now stands*
   and says which part of it just moved:

     .b        a box in the strip
     .b.on     marked before this entry, and receding — settled history
     .b.up     marked BY this entry, at full strength
     .b.dn     given back by this entry: the hollow ring it left

   That is the damage dialog's rule — incoming outweighs existing — in
   the past tense. A run of dim boxes ending in bright ones is a hit; a
   run of dim boxes ending in rings is a heal, read at a glance and
   without a number.

   ── drawn, not stripped ───────────────────────────────────────────
   This is deliberately **not** the sheet's `MARKS` row, and the reason
   is not size. That row is a control — twenty pixels of box you click,
   with the wound arms and the armour break drawn in `<svg>`, and
   Foundry's sanitiser takes every `<svg>` out of stored message content
   on the way into the database. A card survives that by being redrawn
   from a flag on render; a mark track cannot, because a marked box that
   loses its X does not look broken, it looks **unmarked**, which is a
   lie rather than a degradation.

   So every mark here is CSS on an empty element, `GEMS` and `CHITS` are
   already `<i>`/`<b>` and no `<svg>`, and the whole message survives
   storage exactly as posted. No flag, no redraw, no render hook. A
   client without this system gets unstyled but truthful markup.
   ══════════════════════════════════════════════════════════════════ */

import { GEMS } from './gem.js';
import { CHITS } from './chit.js';

/* The verb is the rules' own word, and which one depends on the
   direction. Armour is *repaired* rather than cleared because that is
   what the downtime move is called; a counter is *placed* rather than
   marked because a chit is a thing you put down. */
const VERB = {
  hitPoints:  ['marked', 'cleared'],
  stress:     ['marked', 'cleared'],
  armorSlots: ['marked', 'repaired'],
  hope:       ['gained', 'spent'],
  pool:       ['placed', 'spent'],
};

const LABEL = {
  hitPoints: 'Hit Points',
  stress: 'Stress',
  armorSlots: 'Armor Slots',
  hope: 'Hope',
};

/* ── the strip ────────────────────────────────────────────────────
   `--n` sizes the row rather than the box, for MARKS's own reason: Hit
   Points and Stress sit one above the other and boxes sized
   independently are two different objects in one glance. Here they are
   also stacked, so the ledger passes the widest count in the message
   and every strip in it is drawn to the same box. */
const strip = (from, to, max, span) => {
  const lo = Math.min(from, to), hi = Math.max(from, to);
  const up = to > from;
  const n = Math.max(max, hi, 1);
  return `<div class="st" style="--n:${span ?? n}">${
    Array.from({ length: n }, (_, i) => {
      const cls = i < lo ? (i < to ? 'on' : '') // settled, still marked
                : i < hi ? (up ? 'up' : 'dn')   // the part that moved
                : '';
      return `<i class="${cls}"></i>`;
    }).join('')}</div>`;
};

/* ── a row ────────────────────────────────────────────────────────
   The heading names the track and the numeral says how far it went, at
   display size, with the direction spelled underneath — the rest card's
   grammar, and for the same reason: what anybody scrolls back for is
   *how many*, and in a sentence that is a number at body size in the
   middle of a clause.

   The count on the right of the strip is the other half. `5 / 6` is the
   sheet's own readout and it is what makes the row a state rather than
   a receipt. */
const head = (label, e, verbs) => `
  <div class="hd">
    <span class="k">${label}</span>
    <span class="v"><b>${Math.abs(e.to - e.from)}</b><em>${verbs[e.to > e.from ? 0 : 1]}</em></span>
  </div>`;

/* The count comes *after* the strip in the markup and not with the
   heading it reads with. Both live on the grid's second row, and
   auto-placement never moves backwards — a `grid-column:2` item written
   before a `grid-column:1` one pushes the latter onto a third row. */
const count = (to, max) => `<span class="ct">${to}${max ? `<s> / ${max}</s>` : ''}</span>`;

const track = (e) => `<div class="r" data-t="${e.kind}">
  ${head(LABEL[e.kind], e, VERB[e.kind])}
  ${strip(e.from, e.to, e.max, e.span)}
  ${count(e.to, e.max)}
</div>`;

/* Hope is gems and not boxes, everywhere, and the log is not the place
   to introduce a second drawing of it.

   `scars` rides along because a scarred slot is not an empty one — it is
   a socket that can never be filled again, and the sheet draws it as
   one. The pool's live ceiling is already the printed six *minus* the
   scars, so the row is `max + scars` pips wide and the count says the
   ceiling: two of four, drawn as two lit, two dark and two dead. A
   ledger that drew four would be quietly dropping the permanent half of
   what happened to this character. */
const hope = (e) => `<div class="r" data-t="hope">
  ${head('Hope', e, VERB.hope)}
  <div class="gm">${GEMS({ cur: e.to, max: e.max + (e.scars ?? 0), scars: e.scars ?? 0,
                           sz: 13, gap: 4, ground: 'paper' })}</div>
  ${count(e.to, e.max)}
</div>`;

/* A pool is the card's own counters at the card's own size — the same
   row the loadout draws, as a readout. `add:false` because there is
   nothing to press here: the log is a record, and a control in it would
   be offering to change a number three hours after it changed. */
const pool = (e) => `<div class="r pl" data-t="pool"${
    e.dom ? ` style="--dom:${e.dom.light};--dom-dk:${e.dom.dark}"` : ''}>
  ${head(e.label, e, VERB.pool)}
  <div class="ch">${CHITS({ value: e.to, max: e.max ?? 0, name: e.name ?? 'tokens',
                            add: false, dom: !!e.dom })}</div>
  ${count(e.to, e.max)}
</div>`;

/* A card crossing between the loadout and the vault has no quantity, so
   it takes no numeral — the row is a name and a direction. It is drawn
   in the card's own domain hue, which is the one thing on this card that
   is not a track's material, and it is right here for the reason it is
   right everywhere else: the hue *is* how you know which card. */
const move = (e) => `<div class="r mv"${
    e.dom ? ` style="--dom:${e.dom.light};--dom-dk:${e.dom.dark}"` : ''}>
  <i class="pip"></i>
  <span class="bd"><b>${e.label}</b><s>${e.into ? 'recalled' : 'shelved'}</s></span>
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
  // Every strip in one message shares a box size, so three tracks stacked
  // read as three lengths of the same thing rather than three objects.
  const span = Math.max(1, ...entries.filter(e => ROW[e.kind] === track)
                                     .map(e => Math.max(e.max, e.from, e.to)));
  return `
<div class="ldg">
  <div class="k">Changes<s>${who}</s></div>
  ${entries.map(e => (ROW[e.kind] ?? move)({ ...e, span })).join('')}
</div>`;
};
