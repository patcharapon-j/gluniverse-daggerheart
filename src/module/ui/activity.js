/* Vendored from design/activity.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/activity.js and re-run `node scripts/port-design-js.mjs`. */
/* ══════════════════════════════════════════════════════════════════
   DH ACTIVITY — the change log's own window

   Two builders and no state, which is the same contract every module
   in here keeps: a pure function from data to markup, called once for
   the whole panel and once per entry after that.

   Once for the panel and once per entry is the point rather than a
   convenience. This window is driven the way the sheet's mark rows and
   the Fear strip are driven — rendered once, and every later change
   made *to what is already standing* — because an entry arrives with an
   animation on it, and a panel rebuilt at its new length has already
   arrived. So the host builds the panel, and then prepends one entry at
   a time as they land.

   ── every string arrives ready to print ───────────────────────────
   No text in here is localised and none of it is escaped, and both are
   the caller's job for the same reason: this module has no idea what
   language the table plays in, and no idea whether a character called
   their sword something with a less-than sign in it. The system side
   passes text it has already put through Foundry, exactly as it does
   for every other builder here.
   ══════════════════════════════════════════════════════════════════ */

import { LEDGER } from './ledger.js';

/* ── one entry ────────────────────────────────────────────────────
   The time, and the card. Nothing else: the card already names the
   character in its own heading, so a second name on the line above it
   would be the window answering one question twice.

   The id rides on the element because the host diffs against it — a
   change to the store is almost always one new entry, and finding out
   which one it is by comparing ids is what lets the other twenty stay
   exactly as they are. */
export const ACTIVITY_ENTRY = ({ id = '', when = '', who, entries = [] }) => `
<div class="ace" data-ace="${id}">
  <div class="acw"><time>${when}</time></div>
  ${LEDGER({ who, entries })}
</div>`;

/* ── nothing yet ──────────────────────────────────────────────────
   Two lines: what the window is, and why it is empty. The second is
   worth printing because an empty log is ambiguous in a way an empty
   list is not — it means either that nothing has happened or that
   nothing is being watched, and only the banner above knows which. */
export const ACTIVITY_EMPTY = ({ title = 'Nothing yet', note = '' }) =>
  `<div class="acnil"><b>${title}</b><span>${note}</span></div>`;

/**
 * The whole panel, drawn once.
 *
 * `events` are newest first, which is the order they are drawn in and
 * the order the host prepends into. See activity.css for why this log
 * runs the opposite way round to the chat log it came out of.
 */
export const ACTIVITY = ({
  title = 'Activity',
  count = '',
  watching = true,
  watchLabel = 'Watching',
  clearLabel = 'Clear',
  off = '',
  empty = {},
  events = [],
} = {}) => `
<div class="aclog">
  <div class="achd">
    <b>${title}</b><s>${count}</s>
    <button type="button" class="acbt" data-ac="watch"
      aria-pressed="${watching ? 'true' : 'false'}">${watchLabel}</button>
    <button type="button" class="acbt" data-ac="clear">${clearLabel}</button>
  </div>
  ${watching ? '' : `<div class="acoff">${off}</div>`}
  <div class="acbd">${
    events.length ? events.map(ACTIVITY_ENTRY).join('') : ACTIVITY_EMPTY(empty)
  }</div>
</div>`;
