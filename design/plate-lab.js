/* PLATE LAB — five candidate remakes of the roll card, PC and GM, drawn
   beside the card that ships. Nothing here is vendored; it is a study page's
   builder and exists to be chosen from. Every candidate is built out of the
   same parts the shipping plate is — `DIE`, the eyebrow, the shards, the
   ghost word, the critical's material, the chamfer — so what differs between
   them is arrangement and finish, not vocabulary.

   Same constraint the real card lives under: no `<svg>` anywhere in the
   markup, because Foundry's sanitiser strips it from stored message content.
   Every mark is an element and a stylesheet rule. */

import { DIE, VERDICT, advDie, advVal, d20Keep, foeCrit, A, FOE, O, FOE_O } from '/design/plate.js';

/* ── shared parts ─────────────────────────────────────────────────── */
const EYE = r => `<span class="pl-eye"><b>${r.who}</b><u>//</u><i>${r.label}</i></span>`;
const POR = (r, cls = '') => r.img
  ? `<span class="por ${cls}" style="--pic:url('${r.img}')"><i><u></u><b></b></i></span>` : '';
const CRIT = on => on
  ? `<span class="embers"><i></i><i></i><i></i><i></i><i></i><i></i></span>
     <span class="foil"></span><span class="seal"><i></i><b>Critical</b></span>` : '';
const GHOST = r => r.out === 'crit' ? 'CRITICAL' : r.out === 'hope' ? 'HOPE' : 'FEAR';

const claims = r => r.out === 'crit'
  ? [{t:'+1 Hope', mine:true}, {t:'Clear 1 Stress', mine:true}]
  : r.out === 'hope' ? [{t:'+1 Hope', mine:true}]
  : [{t:'GM gains a Fear', mine:false}];

const ACT = (list, next) => !list.length && !next ? '' : `
  <div class="pl-act">
    ${list.map(c => c.mine
      ? `<button class="pl-b"><i></i>${c.t}</button>`
      : `<span class="pl-b theirs"><i></i>${c.t}</span>`).join('')}
    ${next ? `<button class="pl-b go"><i></i>${next}</button>` : ''}
  </div>`;

const lit = (r, s) => s === 'h' ? (r.out === 'fear' ? '' : ' lit') : (r.out === 'hope' ? '' : ' lit');
const HD = (r, sz) => DIE(r.h, `h d12${lit(r, 'h')}`, sz, 12);
const FD = (r, sz) => DIE(r.f, `f d12${lit(r, 'f')}`, sz, 12);
const ADV = (r, sz) => !r.adv ? '' : r.adv.dice.map((v, i) =>
  DIE(v, `sq a${r.adv.neg ? ' neg' : ''}${i === r.adv.dice.indexOf(advDie(r)) ? '' : ' dim'}`, sz, 6)).join('');

/* Every term carries a key class, so a candidate can colour-code the
   equation against whatever else it draws (the gauge's segments, mostly). */
const terms = r => [
  {k:'hope', v:r.h, c:'kh'}, {k:'fear', v:r.f, c:'kf'},
  ...(r.adv ? [{k:(r.adv.neg ? 'disadvantage' : 'advantage') +
    (r.adv.dice.length > 1 ? ` · best of ${r.adv.dice.length}` : ''), v:advVal(r), c:'ka'}] : []),
  ...r.mods.map(m => ({k:m.k, v:m.v, c:m.spent ? 'ksp' : m.fear ? 'kfe' : 'km'}))];

const foeTerms = r => [
  {k:r.d20.length > 1 ? `d20 · ${r.neg ? 'low' : 'high'} of ${r.d20.length}` : 'd20', v:d20Keep(r), c:'kd'},
  ...r.mods.map(m => ({k:m.k, v:m.v, c:m.fear ? 'kfe' : 'km'}))];

const EQ = (t, total, cls = '') => `<div class="pl-arith lx-eq ${cls}">${t.map((x, i) =>
  `${i ? `<u>${x.v < 0 ? '−' : '+'}</u>` : ''}<i class="${x.c}"><b>${Math.abs(x.v)}</b> ${x.k}</i>`
).join('')}${total != null ? `<u class="eq">=</u><i class="tot"><b>${total}</b></i>` : ''}</div>`;

const margin = r => r.dc == null ? null : r.total - r.dc;
const MARGIN = r => {
  const m = margin(r);
  return m == null ? '' : `<em class="lx-mg ${m >= 0 ? 'up' : 'dn'}">${m >= 0 ? '+' : '−'}${Math.abs(m)}</em>`;
};

const D20 = (r, sz) => {
  const keep = r.d20.indexOf(d20Keep(r));
  return r.d20.map((v, i) => DIE(v,
    'd20' + (i === keep ? (v === 20 && !r.rxn ? ' nat' : ' w') + ' lit' : ' dim'), sz, 20)).join('');
};
const FOE_V = r => foeCrit(r) ? `critical hit ${r.target}` : r.hit ? `hit ${r.target}` : `missed ${r.target}`;
const foeState = r => foeCrit(r) ? 'hot mat' : (r.dc != null && r.hit) ? 'hit' : 'cold';
const mat = r => r.out === 'crit' ? ' mat' : '';

/* ══ 0 · CURRENT ═══════════════════════════════════════════════════ */
const CURRENT = {
  name:'A', tag:'what shipped before',
  pc:(r, n) => A(r, n), gm:(r, n) => FOE(r, n),
};

/* ══ 1 · LACQUER ═══════════════════════════════════════════════════
   A, finished to print. Nothing moves; everything gets a second pass. */
const LAC = {
  name:'Lacquer', tag:'A, finished to print',
  pc:(r, next) => `
<div class="pl a1 lx lx-lac ${r.out}${mat(r)}" data-total="${r.total}">
  ${CRIT(r.out === 'crit')}
  <div class="p">
    ${POR(r)}
    <span class="shards"></span><span class="lx-grain"></span><span class="lx-lip"></span>
    <span class="pl-gh">${GHOST(r)}</span>
    ${EYE(r)}
    <span class="row"><b class="pl-vb">${VERDICT(r)}</b><u class="pl-num">${r.total}</u></span>
  </div>
  <span class="lx-rule"></span>
  <div class="pl-st lx-tray">${HD(r, 38)}${FD(r, 38)}${ADV(r, 28)}${EQ(terms(r), r.total)}</div>
  <div class="pl-meta"><span>${r.kind ?? 'duality roll'}</span>${
    r.dc == null ? '' : `<s>vs ${r.dc}${MARGIN(r)}</s>`}</div>
  ${ACT(claims(r), next)}
</div>`,
  gm:(r, next) => `
<div class="pl g1 lx lx-lac lx-g ${foeState(r)}" data-total="${r.total}">
  ${CRIT(foeCrit(r))}
  <span class="rail"></span>
  <div class="p">
    <span class="lx-grain"></span><span class="lx-bloom"></span>
    ${EYE(r)}
    <span class="row"><b class="pl-vb">${FOE_V(r)}</b><u class="pl-num">${r.total}</u></span>
  </div>
  <div class="pl-st lx-tray">${D20(r, 32)}${EQ(foeTerms(r), r.total)}</div>
  <div class="pl-meta"><span>${r.kind}</span><s>vs evasion ${r.dc}${MARGIN(r)}</s></div>
  ${ACT([], next)}
</div>`,
};

/* ══ 2 · DUEL ══════════════════════════════════════════════════════
   The duality axis drawn as what it is: gold against violet, and the seam
   between them lands where the dice put it. */
const seamOf = (a, b) => Math.round(30 + 40 * a / Math.max(1, a + b));
const DUEL = {
  name:'Duel', tag:'the axis, drawn literally',
  pc:(r, next) => {
    const crit = r.out === 'crit';
    const s = crit ? 50 : seamOf(r.h, r.f);
    return `
<div class="pl lx lx-duel ${r.out}${mat(r)}" style="--seam-to:${s}%" data-total="${r.total}">
  ${CRIT(crit)}
  <div class="lx-hd">${EYE(r)}</div>
  <div class="lx-arena">
    <span class="lx-half h${r.out !== 'fear' ? ' win' : ''}"></span>
    <span class="lx-half f${r.out !== 'hope' ? ' win' : ''}"></span>
    ${POR(r, 'lx-por')}
    <span class="shards"></span>
    <span class="lx-blade"></span>
    <span class="pl-gh">${GHOST(r)}</span>
    <span class="lx-side h">${HD(r, 46)}<s>hope</s></span>
    <span class="lx-side f"><s>fear</s>${FD(r, 46)}</span>
    <span class="lx-needle"><u class="pl-num">${r.total}</u></span>
  </div>
  <div class="lx-vrow"><b class="pl-vb">${VERDICT(r)}</b>${
    r.dc == null ? '' : `<s>vs ${r.dc}${MARGIN(r)}</s>`}</div>
  <div class="pl-st">${ADV(r, 26)}${EQ(terms(r))}</div>
  ${ACT(claims(r), next)}
</div>`;
  },
  gm:(r, next) => {
    const crit = foeCrit(r), st = foeState(r);
    const s = seamOf(r.total, r.dc);
    return `
<div class="pl g1 lx lx-duel lx-g ${st}" style="--seam-to:${s}%" data-total="${r.total}">
  ${CRIT(crit)}
  <div class="lx-hd">${EYE(r)}</div>
  <div class="lx-arena">
    <span class="lx-half a${r.hit ? ' win' : ''}"></span>
    <span class="lx-half e${r.hit ? '' : ' win'}"></span>
    <span class="lx-blade"></span>
    <span class="lx-side h">${D20(r, 44)}<s>attack</s></span>
    <span class="lx-side f"><s>${r.target}</s><b class="lx-ev"><i>evasion</i>${r.dc}</b></span>
    <span class="lx-needle"><u class="pl-num">${r.total}</u></span>
  </div>
  <div class="lx-vrow"><b class="pl-vb">${FOE_V(r)}</b><s>${MARGIN(r)}</s></div>
  <div class="pl-st">${EQ(foeTerms(r))}</div>
  ${ACT([], next)}
</div>`;
  },
};

/* ══ 3 · GAUGE ═════════════════════════════════════════════════════
   The total as a measured length: a bar built from the terms that made it,
   against a ruler, with the Difficulty notched into it. */
const scaleMax = r => Math.max(25, Math.ceil((Math.max(r.total, r.dc ?? 0) + 3) / 5) * 5);
const GAUGE_BAR = (r, list) => {
  const mx = scaleMax(r), pct = v => `${(100 * v / mx).toFixed(2)}%`;
  const pos = list.filter(t => t.v > 0);
  return `
  <div class="lx-gg" style="--max:${mx}"><div class="lx-trk">
    <div class="lx-scale">${[0, 5, 10, 15, 20, 25, 30, 35, 40].filter(n => n <= mx)
      .map(n => `<i style="--at:${pct(n)}">${n}</i>`).join('')}</div>
    <div class="lx-bar">${pos.map((t, i) =>
      `<i class="${t.c}" style="--w:${pct(t.v)};--n:${i}"></i>`).join('')}</div>
    <span class="lx-tip" style="--at:${pct(r.total)};--n:${pos.length}"></span>
    ${r.dc == null ? '' : `<span class="lx-dc ${r.total >= r.dc ? 'met' : ''}" style="--at:${pct(r.dc)}"><b>${
      r.ev ? 'evasion ' : 'dc '}${r.dc}</b></span>`}
  </div></div>`;
};
const GAUGE = {
  name:'Gauge', tag:'the margin, measured',
  pc:(r, next) => `
<div class="pl a1 lx lx-gauge ${r.out}${mat(r)}" data-total="${r.total}">
  ${CRIT(r.out === 'crit')}
  <div class="p">
    ${POR(r)}
    <span class="shards"></span>
    <span class="pl-gh">${GHOST(r)}</span>
    ${EYE(r)}
    <span class="row"><b class="pl-vb">${VERDICT(r)}${MARGIN(r)}</b><u class="pl-num">${r.total}</u></span>
  </div>
  ${GAUGE_BAR(r, terms(r))}
  <div class="pl-st">${HD(r, 30)}${FD(r, 30)}${ADV(r, 23)}${EQ(terms(r), null, 'keyed')}</div>
  <div class="pl-meta"><span>${r.kind ?? 'duality roll'}</span></div>
  ${ACT(claims(r), next)}
</div>`,
  gm:(r, next) => `
<div class="pl g1 lx lx-gauge lx-g ${foeState(r)}" data-total="${r.total}">
  ${CRIT(foeCrit(r))}
  <span class="rail"></span>
  <div class="p">
    ${EYE(r)}
    <span class="row"><b class="pl-vb">${FOE_V(r)}${MARGIN(r)}</b><u class="pl-num">${r.total}</u></span>
  </div>
  ${GAUGE_BAR({...r, ev:true}, foeTerms(r))}
  <div class="pl-st">${D20(r, 28)}${EQ(foeTerms(r), null, 'keyed')}</div>
  <div class="pl-meta"><span>${r.kind}</span></div>
  ${ACT([], next)}
</div>`,
};

/* ══ 4 · OBSIDIAN ══════════════════════════════════════════════════
   Chosen. It lives in plate.js and plate.css now as `O` / `FOE_O`, so the
   lab draws the shipping builder rather than a copy of it. */
const OBS = {name:"Obsidian", tag:"chosen · light, not paint", pc:O, gm:FOE_O};

/* ══ 5 · HEADLINE ══════════════════════════════════════════════════
   A result screen. The verdict on the width axis Google Sans Flex has and
   the rest of the system never spends, the total in condensed figures. */
const split = r => {
  if(r.out === 'crit') return ['Critical', 'success · with Hope'];
  const v = VERDICT(r);
  /* "HOPE" alone reads as a Hope counter — plate.js says the same of D's
     chip — so with no Difficulty the whole sentence is the headline and the
     caption carries the kind of roll. */
  if(r.dc == null) return [v, r.kind ?? 'duality roll'];
  const i = v.indexOf(' ');
  return [v.slice(0, i), v.slice(i + 1)];
};
const foeSplit = r => foeCrit(r) ? ['Critical', `hit · ${r.target}`]
  : r.hit ? ['Hit', r.target] : ['Miss', r.target];
const HEAD = {
  name:'Headline', tag:'a result screen',
  pc:(r, next) => {
    const [w1, w2] = split(r);
    return `
<div class="pl a1 lx lx-head ${r.out}${mat(r)}" data-total="${r.total}">
  ${CRIT(r.out === 'crit')}
  <div class="p">
    ${POR(r)}
    <span class="shards"></span>
    <span class="lx-crop"></span>
    <span class="pl-gh">${GHOST(r)}</span>
    ${EYE(r)}
    <span class="lx-hl"><span class="pl-vb"><b${r.dc == null && r.out !== 'crit' ? ' class="sm"' : ''}>${
      w1}</b><s>${w2}</s></span><u class="pl-num">${r.total}</u></span>
    <span class="lx-hz"></span>
  </div>
  <div class="pl-st">${HD(r, 34)}${FD(r, 34)}${ADV(r, 26)}${EQ(terms(r))}</div>
  <div class="pl-meta"><span>${r.kind ?? 'duality roll'}</span>${
    r.dc == null ? '' : `<s>vs ${r.dc}${MARGIN(r)}</s>`}</div>
  ${ACT(claims(r), next)}
</div>`;
  },
  gm:(r, next) => {
    const [w1, w2] = foeSplit(r);
    return `
<div class="pl g1 lx lx-head lx-g ${foeState(r)}" data-total="${r.total}">
  ${CRIT(foeCrit(r))}
  <span class="rail"></span>
  <div class="p">
    <span class="lx-crop"></span>
    ${EYE(r)}
    <span class="lx-hl"><span class="pl-vb"><b>${w1}</b><s>${w2}</s></span><u class="pl-num">${r.total}</u></span>
    <span class="lx-hz"></span>
  </div>
  <div class="pl-st">${D20(r, 30)}${EQ(foeTerms(r))}</div>
  <div class="pl-meta"><span>${r.kind}</span><s>vs evasion ${r.dc}${MARGIN(r)}</s></div>
  ${ACT([], next)}
</div>`;
  },
};

export const VARIANTS = {current:CURRENT, lac:LAC, duel:DUEL, gauge:GAUGE, obs:OBS, head:HEAD};

/* ══ arrival ═══════════════════════════════════════════════════════
   The shipping arrival — veil, tumble at 58ms steps, land — plus each
   candidate's own beat on landing. The veil is applied here as it is in
   `dice/arrival.ts`, so a card rolls in graphite and the answer arrives on
   the land. */
const TUMBLE = 520, STEP = 58;

/* An odometer: each digit is a reel that scrolls to its value. Built on
   landing and torn down once settled, so the markup at rest is the plain
   numeral it always was. */
const odometer = (el, value) => {
  const s = String(value);
  el.innerHTML = [...s].map((d, i) =>
    `<span class="lx-reel" style="--d:${d};--i:${i}"><span>${
      '0123456789'.split('').map(n => `<b>${n}</b>`).join('')}</span></span>`).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('go')));
  setTimeout(() => { el.classList.remove('go'); el.textContent = s; }, 900);
};

export function play(el){
  clearTimeout(+el.dataset.tk || 0);
  el.classList.remove('play', 'land', 'rolling', 'veil');
  void el.offsetWidth;
  el.querySelector(':scope > .swp')?.remove();
  el.insertAdjacentHTML('afterbegin', '<span class="swp"></span>');
  el.classList.add('play', 'rolling', 'veil');

  const nums = [...el.querySelectorAll('.die[data-mx] em')];
  const mx = nums.map(n => +n.parentElement.dataset.mx);
  const real = nums.map(n => n.textContent);
  const big = el.querySelector('.pl-num');
  const total = el.dataset.total ?? big?.textContent;
  const t0 = Date.now();
  const step = () => {
    if(Date.now() - t0 >= TUMBLE - STEP / 2){
      nums.forEach((n, i) => n.textContent = real[i]);
      el.classList.remove('rolling', 'veil');
      el.classList.add('land');
      if(big){
        if(el.classList.contains('lx-lac')) odometer(big, total);
        else big.textContent = total;
      }
      return;
    }
    nums.forEach((n, i) => n.textContent = 1 + Math.floor(Math.random() * mx[i]));
    if(big) big.textContent = '·';
    el.dataset.tk = setTimeout(step, STEP);
  };
  el.dataset.tk = setTimeout(step, STEP);
}
