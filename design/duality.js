/* Five roll results, one roll. Each renderer takes the same object and
   answers the same question — "what is a duality roll result?" — a
   different way. See duality.css for what each one is betting on. */

const sign = n => (n < 0 ? '−' : '+');

/* The stone. Same construction as gem.css, carrying a numeral: the Hope
   Die and the Fear Die *are* Hope and Fear, so they are the pieces of
   lit glass already on the sheet rather than a d12 icon. */
export const DIE = (v, cls, sz) =>
  `<i class="dd ${cls}"${sz ? ` style="--sz:${sz}px"` : ''}>
     <b class="lamp"></b><em>${v}</em></i>`;

const DICE = (r, sz) =>
  DIE(r.h, 'h' + (r.out === 'fear' ? '' : ' win'), sz) +
  DIE(r.f, 'f' + (r.out === 'hope' ? '' : ' win'), sz) +
  (r.adv ? DIE(sign(r.adv.v) + Math.abs(r.adv.v), 'a' + (r.adv.v < 0 ? ' neg' : ''), sz) : '');

/* The operator carries the sign and the term never does, or a
   disadvantage die renders as "+ −3" — two symbols for one idea, in the
   one line whose entire job is being checkable. */
export const ARITH = r => {
  const t = [{k:'dice', v:r.h + r.f},
             ...(r.adv ? [{k: r.adv.v < 0 ? 'disadvantage' : 'advantage', v:r.adv.v}] : []),
             ...r.mods];
  return `<div class="rc-arith">${t.map((x, i) =>
    `${i ? `<u>${x.v < 0 ? '−' : '+'}</u>` : ''}<i class="${x.spent ? 'sp' : ''}"><b>${
      Math.abs(x.v)}</b> ${x.k}</i>`).join('')}</div>`;
};

export const VERDICT = r => {
  if(r.out === 'crit') return 'critical success';
  const side = r.out === 'hope' ? 'with Hope' : 'with Fear';
  return r.dc == null ? side : `${r.hit ? 'success' : 'failure'} ${side}`;
};

const claims = r => r.out === 'crit'
  ? [{t:'+1 Hope', mine:true}, {t:'Clear 1 Stress', mine:true}]
  : r.out === 'hope' ? [{t:'+1 Hope', mine:true}]
  : [{t:'GM gains a Fear', mine:false}];

const ACT = (r, next) => `
  <div class="rc-act">
    ${claims(r).map(c => c.mine
      ? `<button class="rc-b"><i></i>${c.t}</button>`
      : `<span class="rc-b theirs"><i></i>${c.t}</span>`).join('')}
    ${next ? `<button class="rc-b go"><i></i>${next}</button>` : ''}
  </div>`;

/* A critical gets material the other outcomes do not have — foil, lit
   shards, and a struck seal. Not a brighter version of the same card. */
const CRIT = r => r.out === 'crit'
  ? `<span class="shards"></span><span class="foil"></span>
     <span class="seal"><i></i><b>Critical</b></span>` : '';

const VS = r => `vs ${r.dc ?? '?'}`;
const SCALE = 30;   // the gauge's ceiling: 2d12 plus a realistic modifier
const pct = n => Math.max(0, Math.min(100, n / SCALE * 100)).toFixed(1);

/* ── V1 · verdict plate ───────────────────────────────────────────*/
export const V1 = (r, next) => `
<div class="rc v1 ${r.out}">
  ${CRIT(r)}
  <div class="p">
    <span class="shards sh"></span>
    <span class="gh">${r.out === 'crit' ? 'CRITICAL' : r.out === 'hope' ? 'HOPE' : 'FEAR'}</span>
    <span class="rc-eye">// ${r.label}</span>
    <span class="vv"><b class="v-word">${VERDICT(r)}</b><u class="rc-big">${r.total}</u></span>
  </div>
  <div class="st">${DICE(r, 34)}${ARITH(r)}</div>
  <div class="vs"><span>${r.who}</span><s>${VS(r)}</s></div>
  ${ACT(r, next)}
</div>`;

/* ── V2 · duality beam ────────────────────────────────────────────*/
export const V2 = (r, next) => {
  const hp = (r.h / (r.h + r.f) * 100).toFixed(1);
  return `
<div class="rc v2 ${r.out}">
  ${CRIT(r)}
  <div class="hd"><span class="rc-eye">// ${r.who}</span><em>${r.label}</em></div>
  <div class="bm">
    ${DIE(r.h, 'h' + (r.out === 'fear' ? '' : ' win'), 34)}
    <span class="beam" style="--hp:${hp};--fp:${(100 - hp).toFixed(1)}">
      <i class="fh"></i><i class="ff"></i><i class="sm"></i></span>
    ${DIE(r.f, 'f' + (r.out === 'hope' ? '' : ' win'), 34)}
  </div>
  <div class="lb"><i class="a">Hope ${r.h}</i><i class="b">Fear ${r.f}</i></div>
  <div class="tt"><b class="rc-big">${r.total}</b>${ARITH(r)}</div>
  <div class="vv"><b class="v-word">${VERDICT(r)}</b><s>${VS(r)}</s></div>
  ${ACT(r, next)}
</div>`;
};

/* ── V3 · monument ────────────────────────────────────────────────*/
export const V3 = (r, next) => `
<div class="rc v3 ${r.out}">
  ${CRIT(r)}
  <div class="rail"><span class="v-word">${VERDICT(r)}</span></div>
  <div class="bd">
    <div class="top">
      <span class="who"><b>${r.label}</b><s>${r.who} · ${VS(r)}</s></span>
      <span class="dice">${DICE(r, 30)}</span>
    </div>
    <div class="num"><b class="rc-big">${r.total}</b><s>total</s></div>
    <div class="ft">${ARITH(r)}</div>
    ${ACT(r, next)}
  </div>
</div>`;

/* ── V4 · gauge ───────────────────────────────────────────────────*/
export const V4 = (r, next) => `
<div class="rc v4 ${r.out}">
  ${CRIT(r)}
  <div class="hd"><span class="rc-eye">// ${r.who}</span><em>${r.label}</em></div>
  <div class="gg" style="--pc:${pct(r.total)}">
    <span class="ndl rc-big"><b>${r.total}</b></span>
    <span class="trk"><i class="fl"></i></span>
    ${r.dc != null ? `<span class="dcm" style="--dc:${pct(r.dc)}"><s>${r.dc}</s></span>` : ''}
  </div>
  <div class="st">${DICE(r, 32)}${ARITH(r)}</div>
  <div class="vv"><b class="v-word">${VERDICT(r)}</b><s>${VS(r)}</s></div>
  ${ACT(r, next)}
</div>`;

/* ── V5 · deckmate ────────────────────────────────────────────────*/
export const V5 = (r, next) => `
<div class="rc v5w ${r.out}">
  ${CRIT(r)}
  <div class="v5">
    <div class="cap">
      <span class="n"><b class="rc-big">${r.total}</b></span>
      <span class="sg">${DIE(r.out === 'fear' ? r.f : r.h,
        (r.out === 'fear' ? 'f' : 'h') + ' win', 22)}</span>
    </div>
    <div class="bd">
      <div class="tb"><b class="v-word">${VERDICT(r)}</b><s>${VS(r)}</s></div>
      <div class="mid"><b>${r.label}</b>${ARITH(r)}</div>
      <span class="dice">${DIE(r.h, 'h' + (r.out === 'fear' ? '' : ' win'), 24)}${
        DIE(r.f, 'f' + (r.out === 'hope' ? '' : ' win'), 24)}</span>
    </div>
  </div>
  ${ACT(r, next)}
</div>`;

export const RENDER = {V1, V2, V3, V4, V5};

/* ── arrival ──────────────────────────────────────────────────────
   Stepped at 58ms, not per frame: at 60fps the numerals blur into a grey
   average and the dice stop reading as dice. Timers rather than rAF,
   because rAF does not fire in a window that is not painting and a chat
   log is very often exactly that — a timer is throttled in the
   background rather than stopped, so the tumble degrades to a couple of
   steps and the result still lands. */
const TUMBLE = 430, STEP = 58;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function play(el, r){
  clearTimeout(+el.dataset.tk || 0);
  el.classList.remove('play', 'land', 'rolling');
  void el.offsetWidth;
  el.classList.add('play');
  if(REDUCED) return;

  const nums = [...el.querySelectorAll('.dd:not(.a) em')];
  const bigs = [...el.querySelectorAll('.rc-big, .rc-big b')].filter(n => /^\d+$/.test(n.textContent));
  const real = nums.map(n => n.textContent);
  const totals = bigs.map(n => n.textContent);

  el.classList.add('rolling');
  const t0 = Date.now();
  const step = () => {
    if(Date.now() - t0 >= TUMBLE - STEP / 2){
      nums.forEach((n, i) => n.textContent = real[i]);
      bigs.forEach((n, i) => n.textContent = totals[i]);
      el.classList.remove('rolling');
      el.classList.add('land');
      return;
    }
    nums.forEach(n => n.textContent = 1 + Math.floor(Math.random() * 12));
    bigs.forEach(n => n.textContent = '·');
    el.dataset.tk = setTimeout(step, STEP);
  };
  el.dataset.tk = setTimeout(step, STEP);
}
