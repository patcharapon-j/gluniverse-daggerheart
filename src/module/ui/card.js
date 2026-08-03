/* Vendored from design/card.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/card.js and re-run `node scripts/port-design-js.mjs`. */
// Shared card builder. One component, four content shapes: a domain card is a
// single paragraph with a level and a recall cost; ancestry, community and
// subclass are a flavour line plus named feature runs, with the corner slots
// collapsing to whatever they actually carry.
//
// `code` is the number printed in the footer's right cell — the card's own
// identity in the set it was printed in, "DH106" or "DH Core 056/270". A card
// that has no such number keeps the study's placeholder, because the cell is
// part of the composition and an empty one reads as a mistake rather than as
// an absence.
//
// `fbsig` and `fbname` are the *fallback* plate's mark and wordmark — what a
// card with no artwork puts where the artwork would be. They default to the
// corner sigil and the domain name, which is right for every card that has one
// domain and wrong for the one that has two. A class card's corners already
// carry Grace and Codex; drawing Grace a third time, at plate size, under the
// word "Grace", says nothing the card has not said twice. The class mark says
// something — see `clazz()` in domains.js, which exists for exactly this and
// for the sidebar row.

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
         sig, sig2, foot, code, fbsig, fbname, corners, cls, chits} = o;
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
      <div class="mark">${fbsig || sig}<div class="wordmark">${fbname || d.name}</div></div>
    </div>
  </div>
  ${corners(o)}
  <!-- Counters, on the plate. A direct child of the card because that is what
       the positioning measures against: the anchor is the plate's own bottom
       edge, which is a percentage the fitter moves, so it has to be read from
       inside the card's box. A stack and not the row itself, because a card
       can carry two pools — a budget it spends and a pile it builds — and one
       absolute offset would put them on top of each other. See the ON A CARD
       block in chit.css. No code quotes in here: a backtick would close this
       template literal. -->
  ${chits ? `<div class="chitstack">${chits}</div>` : ''}
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
        <span class="mi">${code || `DH·${d.slug.slice(0,3).toUpperCase()}·004`}</span>
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

   Both floors were set against the cards that existed when this was written,
   and the class card — nine of which are pure rules text with no artwork at
   all — walked straight through them: at 40% and .8 it still overflowed by a
   fifth of its panel and clipped a feature mid-sentence.

   The plate floor moved first and moved further, because it is the cheap
   one. 30% is still a plate — a letterbox rather than a half-card, and only
   ever reached by a card that asked for it — and it buys back height at no
   cost to a single word. The type floor moved from .8 to .76, which is the
   least that closes the remainder; below that the prose starts losing to the
   footer micro-text and the honest answer becomes cutting words, not points.
   A card that still does not fit clips, rather than lying about it.

   Call after fonts resolve — metrics measured against a fallback face are
   wrong by enough to cost a line. */
const PLATE_MAX = 50, PLATE_MIN = 30, U_MAX = .94, U_MIN = .72;

export function fit(scope = document){
  for(const card of scope.querySelectorAll('.card')){
    const cnt = card.querySelector('.cnt');
    if(!cnt) continue;
    const over = () => cnt.scrollHeight - cnt.clientHeight;

    let plate = PLATE_MAX, u = U_MAX;
    card.style.setProperty('--plate', PLATE_MAX + '%');
    card.style.setProperty('--u', U_MAX + 'cqw');

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
