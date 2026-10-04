// What a card keeps, drawn on the card. The counter port: gluvtt's
// ChargeLights, CountingDie and CounterRail, which `compact.css` and
// `face.css` were ported with and nothing ever built.
//
// A card keeps three kinds of number, and each has its own picture because
// each is asked a different question:
//
//   uses   a budget — "once per long rest". Diamond lights, lit while there
//          is one to spend. Asked: can I still do this?
//   pile   tokens you place and spend — Dark Army's eight fiends. A counting
//          die showing how many. Asked: how many have I got?
//   pool   kept dice — Prayer Dice, an Unstoppable Die. Bone dice showing
//          their faces. Asked: what does each one say?
//
// Two hosts and they are two different jobs. RAIL() is the compact card's
// right edge, under the recall chip, and it is a *control*: the card you are
// holding is where you spend from it. FACE_COUNTERS() is the full face's
// header strip — the peek and the chat card — and it is a *readout*: a peek
// is pointer-events:none and a posted card is a record, and a row of live
// buttons three hours later is an invitation to spend the same use twice.
//
// The rail is rendered once and driven afterwards through setRail(), which is
// the contract Marks, Gems and Chits keep: a spent light dims in place and a
// placed token tumbles the die that is already there, rather than the whole
// rail being swapped for a stranger that has already arrived.
//
// ── a group ──────────────────────────────────────────────────────────
//   kind     'uses' | 'pile' | 'pool'
//   key      what the host calls it, handed back on data-key. Never read here.
//   name     what one of them is called — 'Use', 'Tokens', 'Prayer Dice'
//   value    uses and pile: how many are there now
//   max      the ceiling, or null for an open pile
//   refresh  uses: when it comes back — rest, longRest, scene, session, …
//   mode     pool: bag | climb | roll
//   faces    pool: the die's size right now
//   dice     pool: the faces held, 0 for a die placed and not yet rolled
import { PER_PATHS } from './terms.js';

/* How many lights a rail may draw before it says the number instead. Four
   18px boxes is 72px of a 140px card's edge, which is what is left under the
   recall chip once the name has its two lines. */
export const RAIL_LIGHTS = 4;

/* And how many kept dice before the rest become "+n". */
export const RAIL_DICE = 3;

const PER_WORDS = {
  rest: 'rest', shortRest: 'short rest', longRest: 'long rest',
  session: 'session', scene: 'scene', manual: 'use',
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

const one = (name) => String(name || 'token').replace(/s$/i, '').toLowerCase();

/* ── the die ──────────────────────────────────────────────────────
   One drawing for both kinds of die, because the difference between a
   counting die and a kept die is colour and not shape: a token die wears the
   card's domain and a kept die is bone, which `compact.css` says on
   `.dh-cc-pool-die`. Pips to six, because a die showing three pips *is*
   three, and a numeral past that, because nobody counts eleven dots.

   A kept die's face can run to twenty, so it is always a numeral — and a die
   placed and not yet rolled shows its size instead, which is the one thing
   true about it. */
const PIPS = {
  1: [[12, 12]],
  2: [[8, 8], [16, 16]],
  3: [[7, 7], [12, 12], [17, 17]],
  4: [[8, 8], [16, 8], [8, 16], [16, 16]],
  5: [[7, 7], [17, 7], [12, 12], [7, 17], [17, 17]],
  6: [[8, 6.5], [16, 6.5], [8, 12], [16, 12], [8, 17.5], [16, 17.5]],
};

export const DIE_SVG = (n, {numeral = false, label = ''} = {}) => {
  const v = Number(n) || 0;
  const body = '<rect class="dh-cc-die-body" x="2" y="2" width="20" height="20" rx="5"/>';
  const face = !label && !numeral && v >= 1 && v <= 6
    ? PIPS[v].map(([x, y]) => `<circle class="dh-cc-die-pip" cx="${x}" cy="${y}" r="1.9"/>`).join('')
    : `<text class="dh-cc-die-number" x="12" y="12.5" text-anchor="middle" dominant-baseline="central"${
      String(label || v).length > 2 ? ' textLength="17" lengthAdjust="spacingAndGlyphs"' : ''}>${
      esc(label || v)}</text>`;
  return `<svg class="dh-cc-die" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}${face}</svg>`;
};

const perMark = (refresh) =>
  `<svg viewBox="0 0 16 16" class="dh-term-mark" aria-hidden="true" focusable="false"><path d="${
    PER_PATHS[refresh] ?? PER_PATHS.rest}" fill="currentColor" fill-rule="evenodd"/></svg>`;

/* ── what each group says out loud ─────────────────────────────────── */

export const usesSaid = (g) => {
  const max = Math.max(0, Number(g.max) || 0);
  const left = Math.max(0, Math.min(max, Number(g.value) || 0));
  return `${g.name || 'Uses'}: ${left} of ${max} left, back each ${PER_WORDS[g.refresh] ?? 'rest'}`;
};

export const pileSaid = (g) =>
  `${g.name || 'Tokens'}: ${Number(g.value) || 0}${g.max != null ? ` of ${g.max}` : ''}`;

export const poolSaid = (g) => {
  const held = (g.dice ?? []).map(Number);
  if (g.mode === 'roll') return `${g.name || 'Die'}: d${g.faces}`;
  return `${g.name || 'Dice'}: ${held.length ? held.map((d) => d || `d${g.faces}`).join(', ') : 'none'}` +
    (g.max ? ` (holds ${g.max})` : '');
};

/* ══════════════════════════════════════════════════════════════════
   THE RAIL — a compact card's own edge, live
   ══════════════════════════════════════════════════════════════════ */

const usesRail = (g, live) => {
  const max = Math.max(0, Number(g.max) || 0);
  const left = Math.max(0, Math.min(max, Number(g.value) || 0));
  const tag = live ? 'button type="button"' : 'span';
  const close = live ? 'button' : 'span';
  /* Past four, a column of lights is a ruler: the count goes on a chip that
     spends one on a press and gives one back on a right-click. */
  if (max > RAIL_LIGHTS) {
    return `<${tag} class="dh-cc-count${left === 0 ? ' is-out' : ''}" data-spend title="${
      esc(usesSaid(g))}${live ? ' — click to spend one, right-click to restore one' : ''}">${left}/${max}</${close}>`;
  }
  /* Lit lights first, then the spent ones, so the column empties from the
     bottom up and the light under your pointer is always the next to go. */
  const lights = Array.from({length: max}, (_, i) =>
    `<${tag} class="dh-cc-pip${i < left ? ' is-lit' : ''}" data-light="${i}" title="${
      esc(usesSaid(g))}${live ? (i < left ? ' — click to spend one' : ' — click to restore one') : ''}"></${close}>`)
    .join('');
  return `<span class="dh-cc-pips">${lights}</span>`;
};

const pileRail = (g, live) => {
  const v = Math.max(0, Number(g.value) || 0);
  const tag = live ? 'button type="button"' : 'span';
  const close = live ? 'button' : 'span';
  const said = esc(pileSaid(g)) + (live ? ` — click to place a ${one(g.name)}, right-click to spend one` : '');
  return `<${tag} class="dh-cc-token${v === 0 ? ' is-out' : ''}" data-place title="${said}">${
    DIE_SVG(v)}</${close}>` +
    (g.max != null ? `<span class="dh-cc-tally">${v}/${g.max}</span>` : '');
};

const poolDie = (d, faces, i, name, live, mode) => {
  const tag = live ? 'button type="button"' : 'span';
  const close = live ? 'button' : 'span';
  const title = mode === 'climb'
    ? `${name} showing ${d}${live ? ' — click to step it up, right-click to remove it' : ''}`
    : d ? `${name} showing ${d}${live ? ' — click to spend it' : ''}`
      : `${name}, not yet rolled${live ? ' — click to roll it' : ''}`;
  return `<${tag} class="dh-cc-pool-die${d ? '' : ' is-blank'}" data-at="${i}" title="${esc(title)}">${
    DIE_SVG(d, {numeral: true, label: d ? '' : `d${faces}`})}</${close}>`;
};

const poolRail = (g, live) => {
  const faces = Number(g.faces) || 6;
  const name = g.name || 'Die';
  if (g.mode === 'roll') {
    /* Nothing is held: the card names a die whose size grows. The rail shows
       the size and the press rolls it. */
    return `<${live ? 'button type="button"' : 'span'} class="dh-cc-pool-die is-blank" data-roll title="${
      esc(`${name}: d${faces}`)}${live ? ' — click to roll it' : ''}">${
      DIE_SVG(0, {label: `d${faces}`})}</${live ? 'button' : 'span'}>`;
  }
  const held = (g.dice ?? []).map((d) => Math.max(0, Number(d) || 0));
  const shown = held.slice(0, RAIL_DICE).map((d, i) => poolDie(d, faces, i, name, live, g.mode)).join('');
  const more = held.length > RAIL_DICE ? `<span class="dh-cc-more">+${held.length - RAIL_DICE}</span>` : '';
  const room = g.mode === 'climb' ? held.length === 0 : !(g.max && held.length >= g.max);
  const add = live && room
    ? `<button type="button" class="dh-cc-pool-add" data-put title="${
      esc(`Place a ${one(name)}`)}">+</button>`
    : '';
  return shown + more + add;
};

const RAIL_PARTS = {uses: usesRail, pile: pileRail, pool: poolRail};

const groupRail = (g, live) =>
  `<span class="dh-cc-ctr dh-cc-${g.kind === 'pool' ? 'pool' : g.kind}" data-ctr="${g.kind}"${
    g.key ? ` data-key="${esc(g.key)}"` : ''} data-sig="${esc(signature(g))}" role="group" aria-label="${
    esc(g.kind === 'uses' ? usesSaid(g) : g.kind === 'pile' ? pileSaid(g) : poolSaid(g))}">${
    RAIL_PARTS[g.kind]?.(g, live) ?? ''}</span>`;

/** The contents of `.dh-cc-rail`. `live` false draws the same thing inert. */
export const RAIL = (groups = [], {live = true} = {}) =>
  groups.map((g) => groupRail(g, live)).join('');

/* What a group *is*, as opposed to what it holds. A change of shape — a
   ceiling that moved, a die that grew, a pool emptied of its last die — is
   redrawn; a change of value inside the same shape is animated in place. */
const shape = (g) => g.kind === 'pool'
  ? `${g.kind}|${g.mode}|${g.faces}|${g.max}|${(g.dice ?? []).length}`
  : `${g.kind}|${g.max}`;
const signature = (g) => g.kind === 'pool'
  ? `${shape(g)}|${(g.dice ?? []).join(',')}`
  : `${shape(g)}|${g.value}`;

const restart = (el, cls) => {
  el.classList.remove(cls);
  void el.offsetWidth;                    // restart, not resume
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), {once: true});
};

/**
 * Drive a rendered rail to new groups.
 *
 * A light that changed state keeps its element, so its background transition
 * plays; a pile keeps its die and tumbles it; anything whose shape moved is
 * redrawn. Groups are matched by key, so a counter added or removed on the
 * item sheet redraws the rail rather than shifting every group by one.
 */
export function setRail(rail, groups = [], {live = true} = {}) {
  const now = [...rail.querySelectorAll(':scope > [data-ctr]')];
  const sameSet = now.length === groups.length &&
    groups.every((g, i) => now[i].dataset.key === (g.key ?? '') && now[i].dataset.ctr === g.kind);
  if (!sameSet) {
    rail.innerHTML = RAIL(groups, {live});
    return;
  }
  groups.forEach((g, i) => {
    const el = now[i];
    const sig = signature(g);
    if (el.dataset.sig === sig) return;
    const was = el.dataset.sig.split('|');
    el.dataset.sig = sig;
    el.setAttribute('aria-label',
      g.kind === 'uses' ? usesSaid(g) : g.kind === 'pile' ? pileSaid(g) : poolSaid(g));
    const sameShape = was.slice(0, shape(g).split('|').length).join('|') === shape(g);

    const chip = g.kind === 'uses' && sameShape ? el.querySelector('.dh-cc-count') : null;
    if (chip) {
      const max = Math.max(0, Number(g.max) || 0);
      const left = Math.max(0, Math.min(max, Number(g.value) || 0));
      chip.textContent = `${left}/${max}`;
      chip.classList.toggle('is-out', left === 0);
      chip.title = `${usesSaid(g)}${live ? ' — click to spend one, right-click to restore one' : ''}`;
      restart(chip, 'is-tumbling');
      return;
    }
    if (g.kind === 'uses' && sameShape && el.querySelector('.dh-cc-pip')) {
      const left = Math.max(0, Math.min(Number(g.max) || 0, Number(g.value) || 0));
      el.querySelectorAll('.dh-cc-pip').forEach((p, k) => {
        const lit = k < left;
        if (p.classList.contains('is-lit') !== lit) {
          p.classList.toggle('is-lit', lit);
          p.title = `${usesSaid(g)}${live ? (lit ? ' — click to spend one' : ' — click to restore one') : ''}`;
          restart(p, lit ? 'is-back' : 'is-spent');
        }
      });
      return;
    }
    if (g.kind === 'pile' && sameShape) {
      const token = el.querySelector('.dh-cc-token');
      if (token) {
        const v = Math.max(0, Number(g.value) || 0);
        token.innerHTML = DIE_SVG(v);
        token.classList.toggle('is-out', v === 0);
        token.title = `${pileSaid(g)}${live ? ` — click to place a ${one(g.name)}, right-click to spend one` : ''}`;
        const tally = el.querySelector('.dh-cc-tally');
        if (tally) tally.textContent = `${v}/${g.max}`;
        restart(token, 'is-tumbling');
        return;
      }
    }
    el.innerHTML = RAIL_PARTS[g.kind]?.(g, live) ?? '';
    const die = el.querySelector('.dh-cc-pool-die, .dh-cc-token');
    if (die) restart(die, 'is-tumbling');
  });
}

/**
 * Refuse, on the group that said no. The thing that cannot pay is the thing
 * that should answer — the Stress track's flinch, arriving on a card's edge.
 */
export function refuseRail(group) {
  restart(group, 'is-denied');
}

/**
 * Every gesture a rail has, delegated once from a root.
 *
 * `on(group, act, at)` receives the group element (whose `data-key` names the
 * subject) and one of:
 *   spend    take one use or one token
 *   restore  give one use back
 *   place    put one token down
 *   put      place a kept die
 *   take     remove kept die `at`
 *   roll     roll kept die `at`, or a roll-mode die when `at` is undefined
 *   step     step a climbing die up
 *
 * **The press stops at the rail.** Every card it sits on is itself a press —
 * click posts it, right-click opens its menu — and spending a use must not
 * also post the card. Both events end here.
 */
export function railClicks(root, on) {
  const handle = (e, alt) => {
    const group = e.target.closest?.('.dh-cc-rail [data-ctr]');
    if (!group) return;
    e.stopPropagation();
    e.preventDefault();
    const kind = group.dataset.ctr;
    const alternate = alt || e.shiftKey;

    if (kind === 'uses') {
      const pip = e.target.closest('.dh-cc-pip');
      if (pip) return on(group, pip.classList.contains('is-lit') ? 'spend' : 'restore');
      if (e.target.closest('[data-spend]')) return on(group, alternate ? 'restore' : 'spend');
      return;
    }
    if (kind === 'pile') {
      if (e.target.closest('[data-place]')) return on(group, alternate ? 'spend' : 'place');
      return;
    }
    if (e.target.closest('[data-put]')) return on(group, 'put');
    if (e.target.closest('[data-roll]')) return on(group, 'roll');
    const die = e.target.closest('.dh-cc-pool-die');
    if (!die) return;
    const at = Number(die.dataset.at);
    const mode = group.dataset.sig?.split('|')[1];
    if (mode === 'climb') return on(group, alternate ? 'take' : 'step', at);
    if (die.classList.contains('is-blank')) return on(group, 'roll', at);
    return on(group, 'take', at);
  };
  root.addEventListener('click', (e) => handle(e, false));
  root.addEventListener('contextmenu', (e) => {
    if (e.target.closest?.('.dh-cc-rail [data-ctr]')) handle(e, true);
  }, true);
}

/* ══════════════════════════════════════════════════════════════════
   THE FACE — a peek's and a chat card's header strip, a readout
   ══════════════════════════════════════════════════════════════════ */

const lights = (g) => {
  const max = Math.max(0, Number(g.max) || 0);
  const left = Math.max(0, Math.min(max, Number(g.value) || 0));
  if (max > 6) return `<b class="dh-charge-tally">${left}/${max}</b>`;
  return `<span class="dh-charge-lights">${Array.from({length: max}, (_, i) =>
    `<i class="dh-charge-light${i < left ? ' is-lit' : ''}"></i>`).join('')}</span>`;
};

const faceGroup = (g) => {
  if (g.kind === 'uses') {
    const left = Math.max(0, Math.min(Number(g.max) || 0, Number(g.value) || 0));
    return `<span class="dh-charge${left === 0 ? ' is-spent' : ''}" role="group" aria-label="${
      esc(usesSaid(g))}">${perMark(g.refresh)}<span class="dh-charge-name">${esc(g.name || 'Uses')}</span>${
      lights(g)}</span>`;
  }
  if (g.kind === 'pile') {
    const v = Math.max(0, Number(g.value) || 0);
    return `<span class="dh-charge dh-charge-pile${v === 0 ? ' is-spent' : ''}" role="group" aria-label="${
      esc(pileSaid(g))}"><span class="dh-charge-name">${esc(g.name || 'Tokens')}</span>` +
      `<span class="dh-charge-die">${DIE_SVG(v)}</span>${
        g.max != null ? `<b class="dh-charge-tally">${v}/${g.max}</b>` : ''}</span>`;
  }
  const faces = Number(g.faces) || 6;
  const held = g.mode === 'roll' ? [0] : (g.dice ?? []).map((d) => Math.max(0, Number(d) || 0));
  const dice = held.length
    ? held.map((d) => `<span class="dh-charge-die is-bone">${
      DIE_SVG(d, {numeral: true, label: d ? '' : `d${faces}`})}</span>`).join('')
    : `<b class="dh-charge-tally">none</b>`;
  return `<span class="dh-charge dh-charge-pool" role="group" aria-label="${esc(poolSaid(g))}">` +
    `<span class="dh-charge-name">${esc(g.name || 'Dice')}</span>${dice}</span>`;
};

/** A full face's header strip: every counter, as a readout. */
export const FACE_COUNTERS = (groups = []) => groups.map(faceGroup).join('');
