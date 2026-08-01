/* Vendored from design/tile.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/tile.js and re-run `node scripts/port-design-js.mjs`. */
// Landscape builders — the sheet's two densities. Both take the same option
// object as CARD(), so one item definition drives the card, the tile and the
// spine with nothing restated.
import { BOLT, rich } from './card.js';

const vars = (d, d2) => `--dom:${d.light};--dom-dk:${d.dark}` +
  (d2 ? `;--dom-2:${d2.light};--dom-2-dk:${d2.dark}` : '');

/* ── spine ────────────────────────────────────────────────────────
   Identity only. Level, sigil, name, domain, recall, tier — everything
   needed to find the card, nothing needed to read it. */
/* `pre` is a unit put in front of the numeral, at 58% of its size — "T" for a
   weapon's tier, where a domain card's bare number is its level. The cell is
   the same cell in the same place because it is the same *kind* of number, the
   one you sort and shop by; without the prefix it would be the same number,
   which it is not. Same idea as the rail's "Lv 3". */
/* `aside` is anything the row needs to carry that is neither identity nor art
   — today, a consumable's charges. It goes at the end of the meta line rather
   than in the recall chip's corner, because the corner sits over the artwork
   and five boxes on a portrait is five boxes you cannot read. The meta line
   already ends in slack on every row we draw. */
export const SPINE = (o) => {
  const {d, d2, lvl, pre, rc, type, name, sig, sig2, foot, aside} = o;
  // Same rule as MINI: a kind with ramp:false has no domain hue, so tinting
  // its art would invent one. Matters now that ancestry, community, class and
  // subclass are all drawn as spines.
  const ramp = o.ramp ?? (d.ramp !== false);
  return `
<div class="spine${d2 ? ' duo' : ''}" style="${vars(d, d2)}">
  <div class="cap${d2 ? ' duo' : ''}${lvl == null ? ' solo' : ''}">
    ${lvl == null ? '' : `<span class="v"><span class="n">${
      pre ? `<i>${pre}</i>` : ''}${lvl}</span></span>`}
    <i class="sg">${sig}</i>
    ${sig2 ? `<i class="sg">${sig2}</i>` : ''}
  </div>
  <!-- A long name gets a smaller face and a third line. Domain cards are named
       in three short words and never needed it; loot is named "Improved
       Grindletooth Venom", and long *words* are the real problem — GRINDLETOOTH
       alone claims a line, so a name that merely looks short enough still
       breaks three ways. Measured on the name rather than on the box, because
       the box is a container query away from knowing anything. -->
  <div class="mid${name.length > 20 ? ' long' : ''}">
    <h4 class="nm">${name}</h4>
    <div class="meta"><em>${type}</em><span>${foot ?? d.name}</span>${aside ?? ''}</div>
  </div>
  <div class="thumb">
    <div class="img"></div>${ramp ? '<div class="ramp"></div>' : ''}
    <div class="fb">${sig}</div>
  </div>
  ${rc == null ? '' : `<div class="rc"><span class="blt">${BOLT}</span><span class="n">${rc}</span></div>`}
  <div class="tbar"></div>
</div>`;
};

/* ── mini ─────────────────────────────────────────────────────────
   The card with its body deleted and nothing else changed: same portrait,
   same corners, same seam, same badge. Art gets the space the prose used
   to hold. `scrim:true` drops the paper panel too and puts the name on the
   art under a gradient. */
export const MINI = (o) => {
  const {d, d2, lvl, pre, rc, type, name, sig, sig2, foot, scrim} = o;
  const ramp = o.ramp ?? (d.ramp !== false);
  return `
<div class="mini${d2 ? ' duo' : ''}${scrim ? ' scrim' : ''}" style="${vars(d, d2)}">
  <div class="plate">
    <div class="img"></div><div class="top"></div>${ramp ? '<div class="ramp"></div>' : ''}
    <div class="fb">${sig}</div>
  </div>
  <div class="lvl${d2 ? ' duo' : ''}${lvl == null ? ' solo' : ''}">
    ${lvl == null ? '' : `<span class="v"><span class="n">${
      pre ? `<i>${pre}</i>` : ''}${lvl}</span></span>`}
    <i class="sg">${sig}</i>${sig2 ? `<i class="sg">${sig2}</i>` : ''}
  </div>
  ${rc == null ? '' : `<div class="rc"><span class="blt">${BOLT}</span><span class="n">${rc}</span></div>`}
  <div class="foot">
    ${scrim ? '' : `<div class="seam"><i></i><div class="tb"><em>${type}</em></div></div>`}
    <h4 class="nm">${name}</h4>
    <span class="mi">${scrim ? `<b>${type}</b>` : ''}${foot ?? d.name}</span>
  </div>
  <div class="tbar"></div>
</div>`;
};

/* ── tile ─────────────────────────────────────────────────────────
   Enough to use the thing without opening it: name, the numbers, and the
   first three lines of what it does. Also the shape weapons, armour and
   items get — the data strip is why, it holds trait/range/damage/burden
   as readily as tier/spellcast. */
export const TILE = (o) => {
  const {d, d2, lvl, pre, rc, type, name, text, feats, stats, sig, sig2, foot} = o;
  // a grimoire has no single body paragraph — lead with its first spell
  const body = text ?? (feats?.length ? `**${feats[0].n}.** ${feats[0].t}` : '');
  const ramp = o.ramp ?? (d.ramp !== false);
  return `
<div class="tile${d2 ? ' duo' : ''}" style="${vars(d, d2)}">
  <div class="plate">
    <div class="img"></div>${ramp ? '<div class="ramp"></div>' : ''}
    <div class="fb">${sig}</div>
  </div>
  <div class="cap${d2 ? ' duo' : ''}">
    ${lvl == null ? '' : `<span class="v"><span class="n">${
      pre ? `<i>${pre}</i>` : ''}${lvl}</span></span>`}
    <i class="sg">${sig}</i>
    ${sig2 ? `<i class="sg">${sig2}</i>` : ''}
  </div>
  <div class="body">
    <div class="hd">
      <h4 class="nm">${name}</h4>
      ${rc == null ? '' : `<div class="rc"><span class="blt">${BOLT}</span><span class="n">${rc}</span></div>`}
    </div>
    ${stats ? `<div class="stats">${stats.map(s =>
      `<div><span class="k">${s.k}</span><span class="v">${s.v}</span></div>`).join('')}</div>` : ''}
    ${body ? `<p class="tx">${rich(body)}</p>` : ''}
    <div class="ft"><span class="tb">${type}</span><span class="mi">${foot ?? d.name}</span></div>
  </div>
  <div class="tbar"></div>
</div>`;
};
