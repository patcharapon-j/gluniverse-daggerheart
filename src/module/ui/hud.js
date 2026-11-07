/* Vendored from design/hud.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/hud.js and re-run `node scripts/port-design-js.mjs`. */
// The bottom HUD — play without the sheet.
//
// One rail along the bottom edge, 96px and never taller, in Ink and Signal's
// frame (black plates, inset hairlines, the bottom-right cut) carrying this
// system's own objects. Left to right for a player:
//
//   plinth    the portrait, standing ON the rail and rising above it
//   vitals    Hope first and loudest, then three 5px track strips and the
//             threshold line
//   actions   six traits over both weapons
//   features  the Hope feature first, then every class feature, each with
//             its price or its readout printed on the row
//   hand      the loadout as compact cards held up out of the rail; it takes
//             whatever width the rest leaves and overlaps to fit
//   drawers   six tiles: vault, cards, bag, experiences, rest, sheet
//
// The GM's rail swaps vitals + actions + features + hand for the adversary
// panel and a hand of the adversaries in play — the same compact card, so
// the two rails hold one kind of object. On both rails the party is the
// stack of ringed seats above the plinth: a column of the other characters
// for a player, all of them in a 2×2 block for the GM.
//
// Every builder returns markup and every setter diffs, so a host renders the
// rail once and drives it afterwards — the contract setMarks, setPool and
// setRail already keep. Nothing in here knows what a press does; gestures
// attach to the data-* handles: [data-trait], [data-weapon], [data-ability],
// [data-strip], [data-card], [data-drawer], [data-seat], [data-act].
import { GEMS, GEM } from './gem.js';
import { SEAT } from './seat.js';
import { COMPACT } from './compact.js';

/* ── icons ────────────────────────────────────────────────────────
   Authored, one stroke weight (1.6 on a 16 grid), drawn for this rail. The
   item-type glyphs in assets/types/ are filled silhouettes made for 48px
   card plates; at 15px beside a count they read as blots. */
const I = (d, extra = '') => `<svg class="bh-ic" viewBox="0 0 16 16" aria-hidden="true"${extra}>${d}</svg>`;
export const ICON = {
  vault: I('<path d="M2.5 5.5h11v8h-11z"/><path d="M1.8 3h12.4v2.5H1.8z"/><path d="M6.5 8.3h3"/>'),
  cards: I('<path d="M5.5 2.5h7v10h-7z"/><path d="M3.5 4.5v9h6"/>'),
  bag: I('<path d="M5.5 4.5 4.2 2.4h7.6L10.5 4.5"/><path d="M5.5 4.5h5c2.4 1.5 3.5 3.7 3.5 6 0 2-1.5 3-3.5 3h-5c-2 0-3.5-1-3.5-3 0-2.3 1.1-4.5 3.5-6z"/>'),
  experiences: I('<path d="M8 1.8 9.6 6l4.4.3-3.4 2.8 1.1 4.3L8 11 4.3 13.4 5.4 9.1 2 6.3 6.4 6z"/>'),
  rest: I('<path d="M10.8 2.2a5.6 5.6 0 1 0 3 8.6 5 5 0 0 1-3-8.6z"/>'),
  sheet: I('<path d="M3.5 1.8h6.2l2.8 2.8v9.6h-9z"/><path d="M9.5 1.8v3h3"/><path d="M5.6 8h4.8M5.6 10.8h4.8"/>'),
  hit: I('<path d="M3 13 12.5 3.5"/><path d="M10 2.5l3.5 3.5"/><path d="M2 10.5l3.5 3.5"/>'),
  swap: I('<path d="M3 5.5h9.5l-2.5-2.5"/><path d="M13 10.5H3.5L6 13"/>'),
  fold: I('<path d="M4 6.5 8 10.5l4-4"/>'),
};

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sign = n => n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0';

/* ── the plinth ───────────────────────────────────────────────────
   The character stands on the rail. The plate is the rail's height; the
   picture is taller than the plate and is allowed out of the top of it,
   faded into the map where it leaves, so a rectangular painting has no hard
   edge above the bar. A cut-out (`cutout`) replaces the painting and needs
   no fade — that is the field that makes it look like a figure rather than
   a crop.

   `--bh-hope` is the signature: the pool's fullness, 0–1, as a halo behind
   the figure's head and shoulders. Gaining Hope lights a gem and the halo
   with it; spending one dims both, a step per Hope. */
export const PLINTH = (o) => `
<section class="bh-plinth${o.cutout ? ' is-cut' : ''}" data-plinth style="--bh-hope:${(o.hopeLit ?? 0).toFixed(3)};${
    o.frame ? `--bh-fx:${o.frame.x ?? 50}%;--bh-fy:${o.frame.y ?? 22}%;--bh-fz:${o.frame.z ?? 1}` : ''}">
  <span class="bh-plate"></span>
  <span class="bh-glow" aria-hidden="true"></span>
  <span class="bh-fig" aria-hidden="true" style="background-image:url('${esc(o.cutout || o.img)}')"></span>
  ${o.conds?.length ? `<ul class="bh-conds">${o.conds.map(c => `
    <li class="bh-cond" data-cond="${c.id}"${c.tone ? ` data-tone="${c.tone}"` : ''} title="${esc(c.name)}">
      <img src="${esc(c.icon)}" alt=""><span>${esc(c.name)}</span></li>`).join('')}</ul>` : ''}
  ${o.hope != null ? `<span class="bh-ph" data-pool-n><b>${o.hope}</b><span class="bh-sr"> Hope</span></span>` : ''}
  <span class="bh-nameplate">
    <b>${esc(o.name)}</b>
    <span>${o.sub ?? ''}</span>
  </span>
  ${o.fold === false ? '' : `<button type="button" class="bh-fold" data-act="fold" aria-label="${o.folded ? 'Show the whole HUD' : 'Fold the HUD'}" aria-expanded="${!o.folded}">${ICON.fold}</button>`}
</section>`;

/* ── a track strip ────────────────────────────────────────────────
   Five pixels of boxes and a count. The box count already says how much
   there is; the strip only has to say how much of it is gone. The row is
   the hit target, not the strip — thirteen pixels tall for a five-pixel
   mark, because a press on a strip is a press under time pressure. */
const STRIP_KEY = { hp: 'HP', st: 'ST', ar: 'AR' };
const STRIP_NAME = { hp: 'Hit Points', st: 'Stress', ar: 'Armor Slots' };
export const stripLit = (kind, marked, max) =>
  Array.from({ length: max }, (_, i) => kind === 'ar' ? i < max - marked : i < marked);

export const STRIP = (kind, [m, max]) => { const marked = Math.max(0, Math.min(max, m)); return `
<div class="bh-strip" data-strip="${kind}" data-max="${max}"${kind !== 'ar' && max && marked >= max - 1 ? ' data-full' : ''}>
  <span class="bh-sk" aria-hidden="true">${STRIP_KEY[kind]}</span>
  <span class="bh-seg" role="meter" aria-label="${STRIP_NAME[kind]}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${kind === 'ar' ? max - marked : marked}">${
    stripLit(kind, marked, max).map((on, i) => `<button type="button" class="bh-box${on ? ' on' : ''}" data-i="${i}" tabindex="-1" aria-hidden="true"></button>`).join('')}</span>
  <span class="bh-sn"><b>${kind === 'ar' ? max - marked : marked}</b>/${max}</span>
</div>`; };

export function setStrip(strip, m) {
  const kind = strip.dataset.strip;
  const boxes = [...strip.querySelectorAll('.bh-box')];
  const marked = Math.max(0, Math.min(boxes.length, m));
  const lit = stripLit(kind, marked, boxes.length);
  const moving = [];
  boxes.forEach((b, i) => {
    if (b.classList.contains('on') === lit[i]) return;
    b.classList.remove('land', 'drop');
    moving.push([b, lit[i]]);
  });
  if (moving.length) void strip.offsetWidth;
  moving.forEach(([b, on]) => { b.classList.toggle('on', on); b.classList.add(on ? 'land' : 'drop'); });
  const shown = kind === 'ar' ? boxes.length - marked : marked;
  strip.toggleAttribute('data-full', kind !== 'ar' && marked >= boxes.length - 1);
  strip.querySelector('.bh-sn b').textContent = shown;
  strip.querySelector('.bh-seg').setAttribute('aria-valuenow', shown);
}

/* Damage is felt the way Hope is: when Hit Points land, the figure takes
   the hit — a short recoil and a red pass up from its foot — so a mark on
   a 5px strip is also an event at the size of the character. */
export function flinch(plinth) {
  plinth.classList.remove('is-hit'); void plinth.offsetWidth; plinth.classList.add('is-hit');
}

/* The threshold line. The damage band's three zones at one line's height,
   the numbers standing on the borders between them where the sheet's own
   band puts its tick marks. Massive is not drawn, for the sheet's reason. */
const THRESHOLDS = ([major, severe]) => `
<div class="bh-thr"><span class="bh-sr">Damage thresholds: </span>
  <span class="z">Minor</span><b>${major}</b><span class="z">Major</span><b>${severe}</b><span class="z">Severe</span>
</div>`;

export const VITALS = (o) => {
  const [cur, max, scars = 0] = o.hope;
  return `
<section class="bh-pl bh-vitals" data-vitals>
  <div class="bh-hope" data-pool="hope">
    ${GEMS({ cur, max, scars, sz: 17, gap: 8 })}
    <span class="bh-hn"><b>${cur}</b><s>/${max - scars}</s><span class="bh-sr"> Hope</span></span>
  </div>
  <div class="bh-strips">
    ${STRIP('hp', o.hp)}${STRIP('st', o.st)}${STRIP('ar', o.ar)}
  </div>
  <div class="bh-foot">
    ${THRESHOLDS(o.thresholds)}
    <button type="button" class="bh-hit" data-act="damage" title="Take damage">${ICON.hit}<span>Hit</span></button>
  </div>
</section>`;
};

/* ── actions ──────────────────────────────────────────────────────
   Six traits in one row and both weapons under them. A trait tile is the
   label and the modifier and nothing else: the action verbs the sheet prints
   under a trait are something to find, and the HUD is for doing. Both
   weapons are rows rather than one row and a swap, because a Rogue with a
   dagger and a small dagger attacks with either and a swap is a press spent
   on finding the thing you meant to press. */
const TRAIT_ORDER = [['agility', 'Agi'], ['strength', 'Str'], ['finesse', 'Fin'],
  ['instinct', 'Ins'], ['presence', 'Pre'], ['knowledge', 'Kno']];

const WEAPON = (w, slot) => `
  <button type="button" class="bh-wpn" data-weapon="${slot}" data-act="attack" title="Attack with ${esc(w.name)}">
    <b>${esc(w.name)}</b><span>${esc(w.meta)}</span><em>${esc(w.dmg)}</em>
  </button>`;

export const ACTIONS = (o) => `
<section class="bh-pl bh-actions">
  <div class="bh-traits">${TRAIT_ORDER.map(([k, short]) => `
    <button type="button" class="bh-trait${o.marked?.includes(k) ? ' is-marked' : ''}" data-trait="${k}" title="Roll ${k[0].toUpperCase() + k.slice(1)}${o.marked?.includes(k) ? ' · marked this tier' : ''}">
      <span>${short}</span><b>${sign(o.traits[k] ?? 0)}</b></button>`).join('')}
  </div>
  <div class="bh-weapons">${o.weapon ? WEAPON(o.weapon, 'primary') : '<span class="bh-wpn is-none">No weapon equipped</span>'}${o.secondary ? WEAPON(o.secondary, 'secondary') : ''}</div>
</section>`;

/* ── features ─────────────────────────────────────────────────────
   The class is not a card (CLAUDE.md, "the class is not a card on the sheet
   at all"): you cannot spend it, move it or lose it, and the one question
   anybody asks of it is what a feature says. So it is a list of rules, the
   sheet's Features panel at the rail's height — the Hope feature first,
   because it is the one that is a move, then the class features in the
   book's order. A row prints what pressing it costs or what it adds:

     hope   gold gems, the price          uses   diamonds, lit = left
     stress cyan count                     cond   the condition's mark
     dice   the dice it adds               —      nothing: it is a rule

   Four rows is what 96px holds at a 19px press. A class with more says how
   many more on the fourth row, which opens the drawer that lists them all.
   Hover peeks the rule whole; the row never truncates a rule because it
   never prints one. */
const SR = t => `<span class="bh-sr">${t}</span>`;
const FEAT_READ = (f) =>
  f.hope ? `<span class="bh-fr">${Array.from({ length: f.hope }, () => GEM({ sz: 8 })).join('')}${SR(`, costs ${f.hope} Hope`)}</span>` :
  f.stress ? `<span class="bh-fr is-st">${f.stress} Stress</span>` :
  f.uses ? `<span class="bh-fr bh-uses">${
    Array.from({ length: f.uses[1] }, (_, i) => `<i class="${i < f.uses[0] ? 'on' : ''}"></i>`).join('')}${SR(`, ${f.uses[0]} of ${f.uses[1]} uses left`)}</span>` :
  f.cond ? `<span class="bh-fr"><img src="${esc(f.cond)}" alt="">${SR(`, ${f.condName ?? 'condition'}`)}</span>` :
  f.dice ? `<span class="bh-fr is-dice">${esc(f.dice)}</span>` : '';

/* A feature whose price the purse cannot pay is drawn short before it is
   pressed, rather than refused after: the row stays, dims, and says why. */
export const FEATURES = ({ list, hope = Infinity, max = 4 }) => {
  const shown = list.length > max ? list.slice(0, max - 1) : list;
  const more = list.length - shown.length;
  return `
<section class="bh-pl bh-feats" aria-label="Features">${shown.map(f => {
    const short = f.hope > hope;
    return `
  <button type="button" class="bh-feat${f.hope ? ' is-hope' : ''}${f.spent ? ' is-spent' : ''}" data-feature="${esc(f.name)}"${f.hope ? ` data-hope="${f.hope}"` : ''}${
      short ? ` aria-disabled="true" title="Needs ${f.hope} Hope"` : ''}>
    <b>${esc(f.name)}</b>${f.spent ? SR(', spent until it refreshes') : ''}${FEAT_READ(f)}</button>`; }).join('')}${more ? `
  <button type="button" class="bh-feat is-more" data-drawer="feats"><b>${more} more</b><span class="bh-fr">${ICON.cards}</span></button>` : ''}
</section>`;
};

/* ── the stance ───────────────────────────────────────────────────
   A Martial Artist's second currency and what it buys, on one plate after
   the features. Focus is a pool like Hope, so it is the same gems, smaller;
   the stance you are in is the one rule switched on right now, so it is a
   row you can peek; every other stance you know is one press away in the
   Stances drawer, because a shift is a decision made between turns and
   sixteen names do not fit at the rail's height. Drawn only for a character
   holding the subclass, exactly as the sheet draws its Focus row. */
export const STANCE = ({ focus: [cur, max], active, known = 0 }) => `
<section class="bh-pl bh-stance" aria-label="Stance">
  <div class="bh-focus" data-pool="focus">
    ${GEMS({ cur, max, sz: 11, gap: 5 })}
    <span class="bh-fn"><b>${cur}</b><span class="bh-sr"> Focus</span></span>
  </div>
  ${active
    ? `<button type="button" class="bh-feat bh-stn" data-stance="${esc(active.id)}" title="${esc(active.name)}, in stance"><b>${esc(active.name)}</b><span class="bh-fr is-dice">T${active.tier}</span></button>`
    : `<span class="bh-stn is-none">No stance</span>`}
  <button type="button" class="bh-feat is-more" data-drawer="stances"${known ? '' : ' aria-disabled="true"'}><b>Shift</b><span class="bh-fr is-dice">${known}</span></button>
</section>`;

/* ── the hand ─────────────────────────────────────────────────────
   The loadout is held, not filed, so it is drawn the way a hand of cards is
   held: true-size compact cards, fanned, standing up out of the rail the
   way the figure does. They are not shrunk to fit 96px — a compact card's
   name is 13px and a hand at 60% would set it at 8, under the floor. What
   the rail gives up is the 52px above it, which is the same trade the
   portrait made and for the same reason: the two things on this rail that
   are objects rather than readouts stand on it.

   The hand is the one plate with no fixed width. It takes what the plates
   either side of it leave and the fan closes up to fit — a card's advance
   is that width shared out, capped at a card's width — so a 1920 screen
   holds the hand side by side and a 1080 one holds it overlapped, and nothing else on the
   rail has to give anything up. Hover lifts a card out whole.

   An empty slot under the limit is a socket, so 4/5 is a picture and not a
   number. */
const FAN = (items, label, cls = '') => {
  const mid = (items.length - 1) / 2;
  return `
<section class="bh-pl bh-hand${cls}" style="--n:${items.length}" aria-label="${label}">
  <div class="bh-fan">${items.map((html, i) =>
    `<div class="bh-held${html.sel ? ' is-sel' : ''}${html.socket ? ' is-socket' : ''}" style="--t:${(i - mid).toFixed(2)};--z:${i + 1}">${html.html ?? html}</div>`).join('')}</div>
</section>`;
};

export const HAND = ({ cards, limit = 5 }) => {
  const n = Math.max(cards.length, Math.min(limit, cards.length + 1));
  const slots = [...cards, ...Array.from({ length: n - cards.length }, () => ({ state: 'socket', name: 'Empty', type: 'Spell' }))];
  return FAN(slots.map(c => ({ socket: c.state === 'socket', html: `<ul class="bh-cc1">${COMPACT({ size: 's', ...c })}</ul>` })), `Loadout, ${cards.length} of ${limit}`);
};

/* The GM's hand is the adversaries in play, as the same compact card: the
   token's painting, the tier on the pennant, the role as the kind line. A
   Hit Point strip rides the top edge of each, so the hand is also the answer to
   "who is nearly down" without selecting anybody. The one on the plinth is
   lifted and underlined; pressing another puts it there.

   Adversaries come in groups that share a name — the Jagged Knife
   Lieutenant, Bandit and Sniper — and on a fanned 100px card the shared
   words are exactly the part that shows and the part that differs is
   under the next card. So when every card in the hand opens with the same
   words, the cards drop them: the group is on the plinth, the hand says
   which one. */
const sharedHead = (names) => {
  if (names.length < 2) return 0;
  const split = names.map(n => n.split(' '));
  let k = 0;
  while (split.every(w => w.length > k + 1 && w[k] === split[0][k])) k++;
  return k;
};
/* Four Bandits are four cards, and with the group dropped they would all
   say BANDIT. A name the hand holds more than once is numbered, in the
   order the GM sees them. */
const shortNames = (foes) => {
  const k = sharedHead(foes.map(f => f.name));
  const base = foes.map(f => f.name.split(' ').slice(k).join(' '));
  const total = {}, seen = {};
  for (const b of base) total[b] = (total[b] ?? 0) + 1;
  return base.map(b => total[b] > 1 ? `${b} ${(seen[b] = (seen[b] ?? 0) + 1)}` : b);
};
export const FOES = ({ foes, selected }) => {
  const names = shortNames(foes);
  return FAN(foes.map((f, i) => ({
  sel: f.id === selected,
  html: `<ul class="bh-cc1">${COMPACT({ size: 's', glyph: 'adversary', pre: 'T', lvl: f.tier, type: f.role, foot: '',
    name: names[i], art: f.img, id: f.id, cls: 'bh-foe' })}</ul>
    <span class="bh-mini" role="meter" aria-label="${esc(f.name)}, ${f.hp[0]} of ${f.hp[1]} Hit Points marked" aria-valuemin="0" aria-valuemax="${f.hp[1]}" aria-valuenow="${f.hp[0]}">${
      Array.from({ length: f.hp[1] }, (_, i) => `<i class="${i < f.hp[0] ? 'on' : ''}"></i>`).join('')}</span>`,
  })), `Adversaries in play, ${foes.length}`, ' bh-foes');
};

/* ── drawers ──────────────────────────────────────────────────────
   Two columns of three. A tile is an icon and a count; the word is its
   title, because six words in 80px is six ellipses. */
const DRAWERS_ORDER = [['vault', 'Vault'], ['cards', 'Subclass and heritage'], ['bag', 'Bag'],
  ['experiences', 'Experiences'], ['rest', 'Rest'], ['sheet', 'Open the sheet']];

export const DRAWERS = ({ open, counts = {} }) => `
<nav class="bh-pl bh-drawers" aria-label="Drawers">${DRAWERS_ORDER.map(([k, label]) => `
  <button type="button" class="bh-dw${open === k ? ' on' : ''}" data-drawer="${k}" title="${label}" aria-label="${label}${counts[k] != null ? `, ${counts[k]}` : ''}"${
    k === 'sheet' ? '' : ` aria-expanded="${open === k}"`}>
    ${ICON[k]}${counts[k] != null ? `<b>${counts[k]}</b>` : ''}</button>`).join('')}
</nav>`;

/* A drawer is a plate that rises above the rail, pinned to its right end
   so it never covers the figure. One at a time. */
export const DRAWER = ({ title, note, body }) => `
<section class="bh-drawer" role="dialog" aria-label="${esc(title)}">
  <header><b>${esc(title)}</b>${note ? `<span>${note}</span>` : ''}</header>
  <div class="bh-dbody">${body}</div>
</section>`;

/* A drawer that holds rows rather than cards — the bag, the Experiences.
   A row is a name and what it says about itself, and a row with `act` is a
   press: the bag's items post to chat, an Experience is a readout. The
   count or the modifier sits at the right edge, where the eye goes down a
   column of numbers. */
export const DLIST = ({ rows, empty = 'Nothing here.' }) => rows.length ? `
<ul class="bh-dlist">${rows.map(r => `
  <li>${r.act ? `<button type="button" class="bh-drow" data-row="${esc(r.key)}"${r.title ? ` title="${esc(r.title)}"` : ''}>` : '<div class="bh-drow is-read">'}
    <b>${esc(r.name)}</b>${r.meta ? `<span>${esc(r.meta)}</span>` : ''}${r.n != null ? `<em>${esc(r.n)}</em>` : ''}
  ${r.act ? '</button>' : '</div>'}</li>`).join('')}
</ul>` : `<p class="bh-dnone">${esc(empty)}</p>`;

/* The rest drawer is the two rests and nothing else: which one is a
   decision, and the dialog each opens is where the moves are taken. */
export const REST = () => `
<div class="bh-rest">
  <button type="button" class="bh-rb" data-rest="short"><b>Short rest</b><span>Two moves · a few minutes</span></button>
  <button type="button" class="bh-rb" data-rest="long"><b>Long rest</b><span>Two moves · several hours</span></button>
</div>`;

/* ── the peek ─────────────────────────────────────────────────────
   The full card, above the hand, with the card's own authored actions in a
   strip under it — the same presses the chat card offers, so a card can be
   played without posting it first. The strip is outside the card, not over
   its prose: the card is the printed object and stays whole. */
export const PEEK = ({ face, actions = [], rule = false }) => `
<div class="bh-peek${rule ? ' is-rule' : ''}">
  <div class="bh-pface">${face}</div>
  ${actions.length ? `<div class="bh-pacts">${actions.map(a => `
    <button type="button" class="bh-pa"${a.id ? ` data-pa="${esc(a.id)}"` : ''} data-tone="${a.tone ?? ''}" title="${esc(a.short || a.said || '')}"${a.short ? ' aria-disabled="true"' : ''}>${
      a.cost ? `<span class="bh-pc">${a.cost}</span>` : ''}<b>${esc(a.label)}</b></button>`).join('')}</div>` : ''}
</div>`;

/* A feature's peek is the rule, whole, in the same place and with the same
   action strip — but not drawn as a card, because it is not one. A plate of
   rules text with its name and where it comes from. */
export const RULE_PEEK = ({ name, from, text, actions = [] }) => PEEK({ actions, rule: true, face: `
  <article class="bh-rule">
    <header><b>${esc(name)}</b><span>${from}</span></header>
    <p>${text}</p>
  </article>` });

/* ── the GM's adversary panel ─────────────────────────────────────
   Difficulty is the one numeral the panel leads with, set in the rules' own
   shape: a diamond, the family's mark, at display size. Then the tracks the
   GM marks, the two thresholds, and every move as a chip the GM presses. A
   move that spends Fear wears violet; nothing else does. */
/* The attack on its own row, then two rows of two: that is what the panel holds. A solo with eight features
   says how many more on its last chip — the features plate's answer — and
   never loses one silently under the panel's edge. */
const MOVES = 4;
const moveChip = f => `<button type="button" class="bh-move" data-feature="${esc(f.name)}"${f.fear ? ' data-tone="fear"' : ''} title="${esc(f.kind)} · ${esc(f.text)}">
      <b>${esc(f.name)}</b>${f.fear ? `<span>${f.fear} Fear</span>` : ''}</button>`;
export const ADVERSARY = (o) => `
<section class="bh-pl bh-adv">
  <div class="bh-diff" role="img" aria-label="Difficulty ${o.difficulty}"><span>${o.difficulty}</span></div>
  <div class="bh-advt">
    ${STRIP('hp', o.hp)}${STRIP('st', o.st)}
    <div class="bh-thr2">${THRESHOLDS(o.thresholds)}</div>
  </div>
  <div class="bh-moves">
    <button type="button" class="bh-move is-attack" data-act="attack" title="${esc(o.attack.range)} · ${esc(o.attack.dmg)}"><b>${esc(o.attack.name)} <i>${sign(o.attack.mod)}</i></b><span>${esc(o.attack.dmg)}</span></button>
    ${o.features.length > MOVES
      ? o.features.slice(0, MOVES - 1).map(moveChip).join('') + `<button type="button" class="bh-move is-more" data-act="moves"><b>${o.features.length - MOVES + 1} more</b></button>`
      : o.features.map(moveChip).join('')}
  </div>
</section>`;


/* A GM with nothing on the scene to run. The rail stays — the party is
   still above it — and says what would fill it, rather than vanishing and
   leaving the table to wonder whether the HUD broke. */
const EMPTY = (note = 'No adversaries on this scene') => `
<section class="bh-pl bh-empty"><b>${esc(note)}</b><span>Place an adversary token, or select one, to run it from here.</span></section>`;

/* ── the whole rail ───────────────────────────────────────────────── */
export const HUD = (o) => `
<div class="bhud" data-role="${o.role}"${o.folded ? ' data-folded' : ''}${o.drawer ? ` data-drawer="${o.drawers?.open ?? ''}"` : ''}>
  ${o.stack?.length ? `<div class="bh-stack" role="group" aria-label="The party">${o.stack.map(s => SEAT({ size: 60, ...s })).join('')}</div>` : ''}
  <div class="bh-rail">
    ${PLINTH(o.plinth)}
    <div class="bh-body">${o.role === 'gm'
      ? o.adversary ? ADVERSARY(o.adversary) + (o.foes?.foes?.length ? FOES(o.foes) : '') : EMPTY(o.empty)
      : VITALS(o.vitals) + ACTIONS(o.actions) + FEATURES(o.features) + (o.stance ? STANCE(o.stance) : '') + HAND(o.hand) + DRAWERS(o.drawers ?? {})}</div>
  </div>
  ${o.drawer ?? ''}
  ${o.peek ?? ''}
</div>`;
