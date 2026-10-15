/* ══════════════════════════════════════════════════════════════════
   DH LIBRARY — the GM's content library

   Three builders and no state. The panel is drawn once and a press
   changes one row's `aria-pressed` in place, so the host never
   rebuilds the list under the pointer that just pressed it.

   Every string arrives ready to print, localised and escaped by the
   caller, for activity.js's reason.
   ══════════════════════════════════════════════════════════════════ */

/* ── one source ───────────────────────────────────────────────────
   A switch, not a checkbox: the whole row is the press, and the state
   lives in `aria-pressed`, which is the accessible name for exactly
   this and the styling hook at once. `from` names the package a
   homebrew pack came from, because two packs called "Monsters" from
   two modules are told apart by nothing else. `parts` is what the
   source holds, by kind, so "Hope and Fear" says what turning it off
   actually takes away. */
export const LIBRARY_ROW = ({ id = '', name = '', hint = '', from = '', on = true, count = '', parts = [] }) => `
<button type="button" class="cl-row" data-src="${id}" aria-pressed="${on ? 'true' : 'false'}">
  <i class="cl-pip"></i>
  <span class="cl-tx">
    <b>${name}</b>${from ? `<em>${from}</em>` : ''}
    ${hint ? `<span>${hint}</span>` : ''}
  </span>
  <span class="cl-ct">
    <b>${count}</b>
    ${parts.map(([label, n]) => `<s>${label}<u>${n}</u></s>`).join('')}
  </span>
</button>`;

/* ── one shelf ────────────────────────────────────────────────────
   Rulebooks, campaign frames, homebrew: three kinds of decision, and
   a table makes them in that order. An empty shelf says why it is
   empty rather than vanishing, because "no homebrew installed" and
   "the window forgot homebrew" look identical otherwise. */
export const LIBRARY_GROUP = ({ id = '', title = '', note = '', rows = [], empty = '' }) => `
<section class="cl-grp" data-grp="${id}">
  <h3 class="cl-gh"><b>${title}</b>${note ? `<s>${note}</s>` : ''}</h3>
  ${rows.length ? rows.map(LIBRARY_ROW).join('') : `<p class="cl-nil">${empty}</p>`}
</section>`;

/* ── the whole window ─────────────────────────────────────────────
   The summary is its own element so the host can rewrite it after a
   press without touching anything else. */
export const LIBRARY = ({ title = 'Content library', summary = '', groups = [], note = '' }) => `
<div class="cnl">
  <header class="cl-hd"><b>${title}</b><s class="cl-sum">${summary}</s></header>
  <div class="cl-bd">
    ${groups.map(LIBRARY_GROUP).join('')}
    ${note ? `<p class="cl-note">${note}</p>` : ''}
  </div>
</div>`;

/** Flip one row in place. Returns false when nothing moved. */
export function setLibraryRow(row, on) {
  const want = on ? 'true' : 'false';
  if (!row || row.getAttribute('aria-pressed') === want) return false;
  row.setAttribute('aria-pressed', want);
  return true;
}
