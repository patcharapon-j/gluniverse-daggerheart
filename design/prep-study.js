// The three roll-prep candidates that lost, kept as the argument for the
// one that won. Never ported — see prep-study.css for why.
//
// These are static renderers over a fixed state, not working popovers.
// They were drawn to be compared, and comparing them is all they do.

import { GEMS } from './gem.js';

/* One Ranger, three Experiences, four Hope of six — the same character the
   sheet study uses, so a change here is comparable to a change there. */
export const CH = {
  label: 'Agility',
  kind: 'agility roll',
  trait: 2,
  hopeMax: 6,
  xp: [
    { n: 'Grew up on the streets', v: 2 },
    { n: 'Silver tongue', v: 2 },
    { n: 'Hunted by the Order', v: 3 },
  ],
};

/* The three states every candidate had to survive, and the middle one
   decided it. `bare` is a level-1 character with no Experiences and
   nothing granting advantage — the most common roll in the game, and the
   one the popover now stands in front of. */
export const STATES = {
  loaded: { label: 'loaded', hope: 4, pick: [0], adv: { a: 1, d: 0, help: 1 }, mod: 1, modName: 'high ground', rxn: false },
  bare:   { label: 'bare',   hope: 2, pick: [], adv: { a: 0, d: 0, help: 0 }, mod: 0, modName: '', rxn: false, noxp: true },
  broke:  { label: 'broke',  hope: 0, pick: [], adv: { a: 0, d: 1, help: 0 }, mod: 0, modName: '', rxn: false },
};

const xpOf = (s) => (s.noxp ? [] : CH.xp);
const netAdv = (s) => s.adv.a - s.adv.d + s.adv.help;
const cost = (s) => s.pick.length;
const affordable = (s, i) => s.pick.includes(i) || cost(s) < s.hope;
const total = (s) => CH.trait + s.mod + s.pick.reduce((n, i) => n + xpOf(s)[i].v, 0);
const sign = (n) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);

const advText = (n) =>
  !n ? ['—', 'no advantage die']
     : [`${Math.abs(n)}d6`, n > 0 ? 'keep highest, added' : 'keep highest, subtracted'];

const formula = (s) => {
  const n = netAdv(s);
  return `2d12${n ? ` ${n > 0 ? '+' : '−'} ${Math.abs(n)}d6` : ''} ${sign(total(s))}`;
};

/* ── the shared pieces ────────────────────────────────────────────
   Held in common so the candidates differed in arrangement and emphasis
   rather than in content. Each returns '' when it has nothing to say and
   the flex `gap` closes behind it — which is how the bare state got short
   without anybody measuring it. */

const SRCS = (s) => {
  const n = netAdv(s);
  const [dice, note] = advText(n);
  const chip = (k, on, neg, val) =>
    `<button class="src${on ? ' on' : ''}${neg ? ' neg' : ''}" type="button">
       <i></i>${k}${val ? `<em>×${val}</em>` : ''}</button>`;
  return `<div class="sec">
    <s>advantage</s>
    <div class="srcs">
      ${chip('adv', s.adv.a > 0, false, 0)}
      ${chip('disadv', s.adv.d > 0, true, 0)}
      ${chip('help', s.adv.help > 0, false, s.adv.help > 1 ? s.adv.help : 0)}
    </div>
    <div class="net${n === 0 ? ' nil' : n < 0 ? ' neg' : ''}"><b>${dice}</b><s>${note}</s></div>
  </div>`;
};

const XPS = (s) => {
  const list = xpOf(s);
  if (!list.length)
    return `<div class="sec"><p class="nil">No Experiences yet — they appear here at level 2,
      and each one costs a Hope to bring in.</p></div>`;
  const rows = list.map((x, i) => {
    const on = s.pick.includes(i);
    const can = affordable(s, i);
    return `<button class="xr${on ? ' on' : ''}" type="button"${can ? '' : ' disabled'}>
      <i></i><b>${x.n}</b>
      <span class="cost">${can ? '−1 hope' : 'no hope'}</span>
      <em>${sign(x.v)}</em></button>`;
  }).join('');
  return `<div class="sec">
    <s>experience · 1 hope each</s>
    <div class="xps">${rows}</div>
  </div>`;
};

const MOD = (s) => `<div class="sec">
  <s>modifier</s>
  <div class="mod">
    <input type="text" value="${s.modName}" placeholder="what for?">
    <div class="stp"><button type="button">−</button><b>${sign(s.mod)}</b><button type="button">+</button></div>
  </div>
</div>`;

const RXN = (s) => `<label class="rxn${s.rxn ? ' on' : ''}"><i></i>reaction roll</label>`;

const FOOT = (s, extra = '') => `<div class="ft">
  <button class="go" type="button">
    <span class="dd"><i class="h"></i><i class="f"></i></span>
    <s>roll</s>${extra}<em>${formula(s)}</em>
  </button>
  <button class="esc" type="button">esc</button>
</div>`;

const HEAD = () => `<div class="hd">
  <div class="id"><s>// ${CH.kind}</s><b>${CH.label}</b></div>
  <div class="v">${sign(CH.trait)}</div>
</div>`;

/* ── v1 · the unrolled plate ──────────────────────────────────────
   The chat card before it happens: the plate's head, two empty dice slots
   where the result will land, and the plate's own arithmetic strip being
   assembled a term at a time. What you build is what gets posted. */
export const V1 = (s) => {
  const n = netAdv(s);
  const terms = [
    `<div class="tm"><s>${CH.label.toLowerCase()}</s><b>${sign(CH.trait)}</b></div>`,
    ...s.pick.map((i) => `<div class="tm gold"><s>${xpOf(s)[i].n}</s><b>${sign(xpOf(s)[i].v)}</b></div>`),
    ...(s.mod ? [`<div class="tm"><s>${s.modName || 'modifier'}</s><b>${sign(s.mod)}</b></div>`] : []),
    `<div class="tm sum"><s>before the dice</s><b>${sign(total(s))}</b></div>`,
  ].join('');
  return `<div class="prep v1">
    ${HEAD()}
    <div class="slots">
      <i class="st h"></i><i class="st f"></i>
      ${n ? '<i class="st d6"></i>'.repeat(Math.min(Math.abs(n), 3)) : ''}
      <span class="pend">not yet rolled</span>
    </div>
    <div class="bd">
      ${SRCS(s)}
      ${XPS(s)}
      ${MOD(s)}
      <div class="sec"><s>the strip</s><div class="strip">${terms}</div></div>
      ${RXN(s)}
    </div>
    ${FOOT(s)}
  </div>`;
};

/* ── v2 · the unfolded row ────────────────────────────────────────
   No head. The row you pressed is still on screen an inch above, and
   repeating its name would be the popover introducing you to something you
   are already looking at. Sunk material, the row's own corner. */
export const V2 = (s) => `<div class="prep v2">
  <div class="bd">
    ${SRCS(s)}
    ${XPS(s)}
    ${MOD(s)}
    ${RXN(s)}
  </div>
  ${FOOT(s)}
</div>`;

/* ── v4 · the ledger ──────────────────────────────────────────────
   The price first. Pips this roll is about to spend are drawn already
   spent, so you watch the cost before you agree to it — and the cost
   travels onto the button, because "roll · 1 hope" is a different promise
   from "roll". */
export const V4 = (s) => {
  const c = cost(s);
  const pips = GEMS({ cur: s.hope, max: CH.hopeMax, sz: 13, gap: 4, ground: 'paper' });
  return `<div class="prep v4">
    ${HEAD()}
    <div class="price"><s>hope</s>${markGoing(pips, s.hope, c)}</div>
    <div class="bd">
      ${SRCS(s)}
      ${XPS(s)}
      ${MOD(s)}
      ${RXN(s)}
      <div class="tally${c ? '' : ' nil'}">
        <b>${c ? '−1 hope' : '—'}</b>
        <s>${c ? `${s.hope} → ${s.hope - c} remaining` : 'this roll costs nothing'}</s>
      </div>
    </div>
    ${FOOT(s, c ? `<span class="pay">· ${c} hope</span>` : '')}
  </div>`;
};

/* Mark the top `c` lit pips as about to be spent. String surgery on the
   gem markup rather than a flag through GEMS, because "about to be spent"
   was this candidate's idea and not the gem's — the pool study has no
   concept of a pending spend and should not have grown one for it. */
function markGoing(html, lit, c) {
  if (!c) return html;
  let seen = 0;
  return html.replace(/<i class="gem on"/g, (m) => {
    seen += 1;
    return seen > lit - c ? '<i class="gem on going"' : m;
  });
}
