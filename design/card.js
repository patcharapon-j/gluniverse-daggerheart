// Shared card builder. One component, four content shapes: a domain card is a
// single paragraph with a level and a recall cost; ancestry, community and
// subclass are a flavour line plus named feature runs, with the corner slots
// collapsing to whatever they actually carry.

/* ── game-term marking ──────────────────────────────────────────
   Longest-first so "Very Close" wins over "Close" and "Very Far" over "Far". */
const COLOURED = { Hope:'t-hope', Fear:'t-fear' };
export const TERMS = ['Spellcast Roll','Reaction Roll','Attack Roll','Action Roll','Damage Roll','Duality Dice',
  'Armor Slots','Armor Slot','Armor Score','Agility Roll','Hit Points','Very Close','Very Far','Proficiency',
  'Difficulty','Disadvantage','Restrained','Vulnerable','Advantage','Rally Die','Evasion','Cloaked','Stress',
  'Hidden','Melee','Close','Hope','Fear','Far','HP']
  .sort((a,b)=>b.length-a.length);
const RX = new RegExp('\\b(' + TERMS.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|') + ')\\b','g');
export const mark = s => s.replace(RX, m => `<b class="${COLOURED[m]||''}">${m}</b>`);

export const BOLT = '<svg viewBox="0 0 10 14" fill="currentColor"><path d="M5.9.4 0 8.3h3.5L2.8 13.6 10 5.5H6.1z"/></svg>';

/* ── corners ──────────────────────────────────────────────────────
   Slots, not fixtures. A level numeral only appears if there is one; a
   second sigil plate only if the card belongs to two domains; the recall
   chip only if the card has a cost. Ancestry and Community therefore get
   a bare plate holding their type glyph and nothing on the right.

   The numeral's label is a slot too. A domain card's number is its LEVEL and
   a weapon's is its TIER; they are the same kind of number — the one you sort
   and shop by — so they take the same cell, but they are not the same number
   and the plate has room to say which. The compact builders have no room for
   a word and take a `pre` prefix instead. */
export const chips = ({lvl, unit, rc, sig, sig2}) => `
  <div class="lvl${sig2 ? ' duo' : ''}">
    ${lvl == null ? '' :
      `<span class="v"><span class="k">${unit ?? 'LEVEL'}</span><span class="n">${lvl}</span></span>`}
    <i class="sg">${sig}</i>
    ${sig2 ? `<i class="sg two">${sig2}</i>` : ''}
  </div>
  ${rc == null ? '' : `<div class="rc"><span class="blt">${BOLT}</span><span class="n">${rc}</span></div>`}`;

/* `**bold**` and `*italic*`, then game-term marking on top. */
export const rich = s => mark(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\*(.+?)\*/g,'<i>$1</i>');

/* A feature gets a header band: marker, index, name in caps, hairline to the
   edge, then its body at full width. It costs a whole line per feature over
   the run-in alternative and is worth it — the band is what makes a grimoire
   skimmable rather than three paragraphs to read.
   `runin:true` swaps in the cheap form; nothing uses it by default, it exists
   because a card type may yet turn up that cannot afford the bands. */
const feature = (f, i, n, runin) => runin
  ? `<div class="feat ri"><p><b class="rn">${f.n}</b>${rich(f.t)}</p></div>`
  : `<div class="feat">
      <div class="fh"><i></i>${n > 1
        ? `<span class="ix">${String(i+1).padStart(2,'0')}</span>` : ''}<b>${f.n}</b></div>
      <p>${rich(f.t)}</p></div>`;

export const CARD = (opts) => {
  const o = {type:'SPELL', name:'Rain of Blades', corners:chips, cls:'', ...opts};
  const {d, d2, lvl, rc, type, name, text, flavour, feats, stats, tags,
         sig, sig2, foot, corners, cls} = o;
  const runin = o.runin ?? false;

  // Ancestry and Community opt out via their token; everything domain-derived
  // keeps the ramp. An explicit `ramp` on the card still wins.
  const ramp = o.ramp ?? (d.ramp !== false);

  const vars = `--dom:${d.light};--dom-dk:${d.dark}` +
               (d2 ? `;--dom-2:${d2.light};--dom-2-dk:${d2.dark}` : '');

  return `
<div class="card ${cls}${d2 ? ' duo' : ''}" style="${vars}">
  <div class="plate">
    <div class="img"></div><div class="top"></div>${ramp ? '<div class="ramp"></div>' : ''}
    <div class="fb">
      <svg class="tech" viewBox="0 0 300 240" preserveAspectRatio="xMidYMid slice">
        <defs><pattern id="pd-${d.slug}" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".85" fill="currentColor" opacity=".5"/></pattern></defs>
        <rect width="300" height="240" fill="url(#pd-${d.slug})"/>
        <g stroke="currentColor" fill="none" opacity=".75">
          <circle cx="232" cy="62" r="122" stroke-width="1"/>
          <circle cx="232" cy="62" r="92" stroke-width=".8" stroke-dasharray="3 5"/></g>
        <g fill="currentColor"><path d="M16 222l6 5-6 5z"/><path d="M26 222l6 5-6 5z"/><path d="M36 222l6 5-6 5z"/></g>
      </svg>
      <div class="mark">${sig}<div class="wordmark">${d.name}</div></div>
    </div>
  </div>
  ${corners(o)}
  <div class="lower">
    <div class="body">
      <div class="seam"><i></i><div class="tb"><em>${type}</em></div><i></i></div>
      <div class="cnt">
        <h3 class="nm">${name}</h3>
        ${tags ? `<div class="tags">${tags.map(t => `<span>${t}</span>`).join('')}</div>` : ''}
        ${stats ? `<div class="stats">${stats.map(s =>
          `<div><span class="k">${s.k}</span><span class="v">${s.v}</span></div>`).join('')}</div>` : ''}
        ${flavour ? `<p class="fl">${flavour}</p>` : ''}
        ${text ? `<p class="tx">${rich(text)}</p>` : ''}
        ${feats ? feats.map((f, i) => feature(f, i, feats.length, runin)).join('') : ''}
      </div>
      <div class="ft">
        <span class="mi">${foot ?? d.name}</span>
        <div class="tk">${'<i></i>'.repeat(9)}</div>
        <span class="mi">DH·${d.slug.slice(0,3).toUpperCase()}·004</span>
      </div>
    </div>
  </div>
  <div class="bar4"></div>
</div>`;
};

/* ── fit ──────────────────────────────────────────────────────────
   The card is a fixed 5:7 box holding text of unknown length. Authors will
   write long features, and a layout that only works for the text I happened
   to test with is not a layout. So the panel measures itself: .cnt is the
   one box allowed to clip, and the card gives ground in a fixed order.

   1. The art plate, from 50% down to 40%. Cheap — the composition survives
      it and the prose does not change at all. Taken in one step, not
      iteratively: the plate is flex 0 0, so a pixel off the plate is a pixel
      onto the panel, exactly.
   2. Only then the type scale. Wrapped text falls off with roughly the
      *square* of --u — a smaller size gives both shorter lines and fewer of
      them — so a 12% cut buys ~23% of height.

   The floor is .8. Below it the prose would be smaller than the footer
   micro-text, which is the point where the answer is to cut words, not
   points; the card clips instead of lying about it.

   Call after fonts resolve — metrics measured against a fallback face are
   wrong by enough to cost a line. */
const PLATE_MAX = 50, PLATE_MIN = 40, U_MIN = .8;

export function fit(scope = document){
  for(const card of scope.querySelectorAll('.card')){
    const cnt = card.querySelector('.cnt');
    if(!cnt) continue;
    const over = () => cnt.scrollHeight - cnt.clientHeight;

    let plate = PLATE_MAX, u = 1;
    card.style.setProperty('--plate', PLATE_MAX + '%');
    card.style.setProperty('--u', '1cqw');

    const short = over();
    if(short > 0){
      // +1: the plate percentage rounds to device pixels, and rounding the
      // wrong way costs a whole line to the type scale to recover one pixel.
      plate = Math.max(PLATE_MIN, PLATE_MAX - (short + 1) / card.clientHeight * 100);
      card.style.setProperty('--plate', plate.toFixed(2) + '%');
    }
    // Stepped, not solved: the relationship between --u and wrapped height is
    // not one a formula gets right, and overshooting costs legibility.
    while(over() > 0 && u > U_MIN){
      u = Math.round((u - .02) * 100) / 100;
      card.style.setProperty('--u', u + 'cqw');
    }
    card.dataset.u = u.toFixed(2);
    card.dataset.plate = plate.toFixed(1);
  }
}

export const T_SPELL ='Spend a Hope to make a Spellcast Roll and conjure throwing blades that strike out at all targets within Very Close range.';
export const T_TERMS = 'Mark a Stress to make an Attack Roll against a target within Close range. On a success, spend a Hope to gain Advantage. When the GM spends a Fear, mark an Armor Slot or become Vulnerable.';
