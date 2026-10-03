// The Compact card, ported from gluvtt's `CompactCard.tsx` — the small form
// every card a sheet lists takes, at 100×140 (S: cards, features, heritage,
// class) or 124×174 (L: gear).
//
// Its painting fills it and fades to ink at the foot; level or tier and
// domain hang on a pennant top left, the recall cost sits top right with the
// counter rail down the edge under it, and the foot carries a stamp, the name
// (fitted to two lines by `nameFit` in face-fx.js) and "Kind · Domain". With
// no painting it draws a designed field: gear tinted by kind and tier, a
// large sigil centred above the title, and Homebrew hatched, dashed and
// quilled.
//
// It is a `<li>` holding a `<button>`, which is gluvtt's shape and worth
// keeping: the whole painting is one press, so a card is reachable by Tab and
// actionable by Return without a single `role` or `tabindex` written by hand.
// What that press *does* is not this file's business — the gestures (Post,
// Peek, the right-click menu) are an application concern and they attach in
// `face-fx.js` or in the sheet, against `[data-card]` and `[data-face]`,
// which is why those two attributes are here even though nothing in the
// stylesheet reads them.
//
// ── the option object ───────────────────────────────────────────────
// The same vocabulary as FACE() and CARD(), so `cardOf()` feeds all of them:
//
//   d, d2        domain definitions — {slug, name, light, dark, ramp}
//   lvl, pre     the numeral and its unit prefix ('T' for a tier)
//   rc           recall cost in Stress; 0 is free and prints as free
//   type         the kind word: 'Spell', 'Class', 'Weapon'
//   name         the card's name
//   foot         the kind line's second word; defaults to d.name.
//                '×3' is read as a stack's count and moves to the corner
//   sig, sig2    inline <svg> for the first and second domain's sigil
//   fbsig        inline <svg> drawn large where there is no painting
//   glyph        data-glyph's value: 'weapon', 'ancestry', 'passive', …
//   tier         1–4; data-tier, which silvers at 3 and golds at 4
//   doms         how many domains data-domains should say
//   size         's' (cards, features, heritage, class) or 'l' (gear)
//   state        'rest' | 'used' | 'within-reach' | 'out-of-reach' |
//                'disabled' | 'drag' | 'socket'
//   art          the painting's URL
//   homebrew     made at the table, which the kind line and the quill say
//   id           the Item it is printed on; data-card, for the gestures
//   posted       'all' | 'gm' — says "Posted" for a moment after a post
//   rail         the counter rail's *contents* — the pips, counts and pool
//                dice. The `.dh-cc-rail` box itself is drawn here, so the
//                counter port never has to know it is on a compact card
//   controls     raw HTML under the card, such as its one action chip
//   cls          extra classes on the li
//
// `text`, `flavour`, `feats`, `stats`, `code`, `artist`, `motif` and `fbname`
// are accepted and ignored — a compact card has no room for any of them.
// Taking the whole object and reading part of it is the point: a caller that
// has to strip fields per builder is a caller that will strip the wrong one.
import { DH_BOLT, DH_QUILL, cardLabel, kindWords } from './face.js';

/* Gear is L, everything else S. The test is "no domain and one of the four
   gear glyphs", not "no domain" — heritage and stat-block features have no
   domain either and they are not gear. */
const GEAR_GLYPHS = new Set(['weapon', 'armor', 'consumable', 'loot', 'gear']);
export const compactSize = (o) =>
  !(o.d2 || (o.d && o.d.ramp !== false)) && GEAR_GLYPHS.has(o.glyph) ? 'l' : 's';

/* ── the stamp ────────────────────────────────────────────────────
   Shorter than the full face's, because the foot is 100px wide: "Needs 2
   Stress" where the face says "Recall needs 2 Stress". Same two states
   speak, for the same reason — see `stateWords` in face.js. */
export const compactStamp = ({rc, state}) =>
  state === 'used' ? 'Used' :
  state === 'out-of-reach' ? `Needs ${rc ?? 0} Stress` : undefined;

/* ── the kind line ────────────────────────────────────────────────
   "Kind · Domain", as small as it reads whole, with two cards saying less:
   a class's domains are already on its pennant, and a heritage card's kind
   already says it is heritage, so both say their kind alone rather than
   repeating what the reader can see. A stack's count is dropped here
   because it goes to the corner instead. */
const kindLine = (o) =>
  (o.type === 'Class' || o.foot === 'Heritage'
    ? [o.type, ...(o.homebrew ? ['Homebrew'] : [])]
    : kindWords(o).filter(w => !w.startsWith('×'))
  ).join(' · ');

/* How many a stack of gear holds, as its foot prints it (×3), when more than
   one. The foot is the carrier because that is where `cardOf()` already puts
   it; reading it back here is cheaper than a second field that means the
   same thing and can disagree with the first. */
const quantityOf = (o) => {
  const counted = /^×(\d+)$/.exec(String(o.foot ?? ''));
  return counted ? Number(counted[1]) : undefined;
};

const domainCount = (o) =>
  o.doms ?? (o.d2 ? 2 : (o.d && o.d.ramp !== false ? 1 : 0));

const vars = (o) => [
  o.d && `--dh-dom:${o.d.light}`,
  o.d && `--dh-dom-dk:${o.d.dark}`,
  o.d2 && `--dh-dom-2:${o.d2.light}`,
  o.d2 && `--dh-dom-2-dk:${o.d2.dark}`,
  o.art && `--dh-art:url('${o.art.replaceAll("'", "%27")}')`,
].filter(Boolean).join(';');

const sigil = (markup, cls) =>
  `<span class="dh-sigil${cls ? ' ' + cls : ''}" aria-hidden="true">${markup || ''}</span>`;

/* The pennant, smaller. The second sigil only draws at S, which looks
   backwards and is not: only a class card carries two domains and a class
   card is never gear, so L's pennant has no second mark to draw and the
   check is there to say so rather than to suppress anything. */
const pennant = (o, size) => {
  const doms = domainCount(o);
  return `
      <span class="dh-cc-pennant${o.d2 ? ' is-two' : ''}${doms ? '' : ' is-plain'}" aria-hidden="true">
        ${o.lvl == null ? '' : `<span class="dh-cc-level">${
          o.pre === 'T' ? '<small>Tier</small>' : ''}<b>${o.lvl}</b></span>`}
        ${sigil(o.sig, 'dh-cc-pennant-mark')}
        ${o.sig2 && size === 's' ? sigil(o.sig2, 'dh-cc-pennant-mark') : ''}
      </span>`;
};

export const COMPACT = (opts) => {
  const o = {state: 'rest', type: 'Spell', name: 'Rain of Blades', ...opts};
  const size = o.size ?? compactSize(o);
  const classes = ['dh-cc', o.art ? 'has-art' : 'no-art',
    o.homebrew ? 'is-homebrew' : '', o.cls].filter(Boolean).join(' ');

  /* A socket is a hollow — the shape a card left when a drag picked it up.
     It takes no gestures and gets no rail, because there is nothing there to
     act on. A disabled card is different and still gets both: it is a real
     card you may not pick *now*, and you can still peek it to find out why. */
  const inert = o.state === 'socket';
  const stamp = compactStamp(o);
  const qty = quantityOf(o);

  /* The label says `rest` for every state but the two that change what the
     card *is* to a reader. Being mid-drag or momentarily not pickable is a
     fact about the list, not about the card, and announcing it would make
     every drag re-read every row. */
  const spoken = o.state === 'out-of-reach' || o.state === 'used' ? o.state : 'rest';

  return `
<li class="${classes}"${o.id ? ` data-card="${o.id}"` : ''} data-size="${size}"
  data-state="${o.state}" data-domains="${domainCount(o)}"${
    o.tier ? ` data-tier="${o.tier}"` : ''}${o.glyph ? ` data-glyph="${o.glyph}"` : ''}${
    o.posted ? ` data-posted="${o.posted}"` : ''}
  style="${vars(o)}">
  <!-- The tilt listens on the li and writes --dh-rx/--dh-ry here, not on the
       button: the button is what hover and :active transform, and measuring
       a box that is already moving is how the parallax starts chasing
       itself. One deliberate departure from gluvtt, which binds the button;
       see the note in face-fx.js. -->
  <button type="button" class="dh-cc-face" data-face
    aria-label="${cardLabel({...o, state: spoken}).replace(/"/g, '&quot;')}"${
      inert || o.state === 'disabled' ? ' aria-disabled="true"' : ''}>
    <span class="dh-cc-art" aria-hidden="true">
      ${o.art ? '' : sigil(o.fbsig || o.sig, 'dh-cc-sigil')}
    </span>
    <span class="dh-cc-fade" aria-hidden="true"></span>
    <span class="dh-cc-static" aria-hidden="true"></span>
    ${pennant(o, size)}
    ${o.rc == null ? '' : `<span class="dh-cc-recall${
      o.rc === 0 ? ' is-free' : ''}" aria-hidden="true"><b>${o.rc}</b>${DH_BOLT}</span>`}
    ${o.homebrew ? `<span class="dh-cc-quill">${DH_QUILL}</span>` : ''}
    <span class="dh-cc-foot">
      ${stamp ? `<span class="dh-cc-stamp">${stamp}</span>` : ''}
      <h3>${o.name}</h3>
      <!-- The posted acknowledgement takes the kind line's place rather than
           appearing next to it. There is one line of room; a card that says
           what it is and that it was just posted at the same time says
           neither legibly. -->
      <span class="dh-cc-kind">${
        o.posted ? (o.posted === 'gm' ? '✓ To the GM' : '✓ Posted') : kindLine(o)}</span>
    </span>
    ${qty == null ? '' : `<span class="dh-cc-quantity">×${qty}</span>`}
    <span class="dh-cc-glare" aria-hidden="true"></span>
    <span class="dh-sweep" aria-hidden="true"></span>
  </button>
  ${inert || !o.rail ? '' : `<span class="dh-cc-rail">${o.rail}</span>`}
  ${o.controls ? `<div class="dh-cc-controls">${o.controls}</div>` : ''}
</li>`;
};

/* ── the vault row ────────────────────────────────────────────────
   Ported from gluvtt's `VaultRow` in sheets/character/VaultTab.tsx. Styles
   in design/vault.css, which carries the long version of why the vault gets
   its own form at all; the short version is that a loadout holds five cards
   and a vault holds dozens, and a wall of thirty 100×140 paintings is a
   thing you search rather than read. So the row turns the card on its side
   and changes what it spends its pixels on: the name gets a whole line at
   the row's own size, and the painting shrinks to a 60px strip at the left
   that fades out under the type rather than ending at a seam.

   This is a different builder and not a mode of COMPACT() because almost
   nothing survives the change of form. There is no pennant, no counter
   rail, no tier metal, no glare and no tilt — all five are things you do to
   a picture of a card, and a row is not one. What it keeps is the option
   object, verbatim, so `cardOf()` still feeds every builder in the system
   from one shape and no caller has to know which form its card will take.

   ── the two states, which are the whole vault ──────────────────────
   A card you can afford to recall, and one you cannot. `reach` is the only
   thing a caller has to decide, because it is the only thing the caller
   knows — whether the holder has the Stress.

   `within-reach` lights the cost chip and says nothing in words; the price
   is already on the chip, and a row that announced "you can afford this" on
   every affordable row of thirty would be announcing nothing.
   `out-of-reach` drains the lens, steps the name back and stamps what the
   recall needs — the one case where the number has to be read rather than
   glanced at, because it is the number telling you no.

   `rc` defaults to 0 rather than to absent, which it does nowhere else: a
   vault list is where the price has to be present on every row, and a card
   with no recall cost at all cannot be vaulted.

   ── the option object ───────────────────────────────────────────────
   The same vocabulary as COMPACT(), FACE() and CARD(). What a row reads:

     d, d2        domain definitions. `d.light` colours the mark and the
                  lens's wash, `d.dark` the ink under it
     lvl          the numeral. `pre` is accepted and deliberately not
                  printed — see .dh-vrow-level in vault.css
     rc           recall cost in Stress, defaulted to 0 here
     type, foot,
     homebrew     the kind line, through `kindWords()`
     name         the card's name, which gets the flexible column
     sig          the domain's mark, and the lens's fallback mark when
                  there is no painting. `fbsig` is preferred for the
                  latter when a caller resolved one
     art          the painting
     state        'within-reach' | 'out-of-reach' | 'used' | 'socket' |
                  'rest' | 'disabled' | 'drag'. An explicit state wins
                  over `reach`
     id           the Item it is printed on; data-card, for the gestures
     controls     raw HTML beside the press — the recall press, which
                  says the price itself and so suppresses the cost chip
     cls          extra classes on the li

   `pre`, `glyph`, `tier`, `doms`, `size`, `posted`, `rail`, `text`,
   `flavour`, `feats`, `stats`, `code`, `artist`, `motif` and `fbname` are
   accepted and ignored. Taking the whole object and reading part of it is
   the point, the same as it is for COMPACT(): a caller that has to strip
   fields per builder is a caller that will strip the wrong one. */
export const VAULT_ROW = (opts) => {
  const o = {rc: 0, type: 'Spell', name: 'Rain of Blades', ...opts};
  const state = o.state ?? (o.reach === false ? 'out-of-reach' : 'within-reach');

  /* A socket is a hollow — the shape a row left when a drag picked it up.
     Nothing in it is actionable, so it takes no press and no chip. */
  const inert = state === 'socket';

  /* The label says `rest` for every state but the two that change what the
     card *is* to a reader, exactly as COMPACT() does and for the same
     reason: being mid-drag or momentarily unaffordable is a fact about the
     list, not about the card. */
  const spoken = state === 'out-of-reach' || state === 'used' ? state : 'rest';

  /* The cost chip and the host's press are the same message, so the chip
     stands down when the press is there. `.dh-recall-price` inside
     `controls` is what says the price in that case. */
  const chip = !inert && !o.controls && o.rc != null;

  return `
<li class="dh-vrow ${o.art ? 'has-art' : 'no-art'}${o.cls ? ' ' + o.cls : ''}"${
    o.id ? ` data-card="${o.id}"` : ''} data-state="${state}"
  style="${vars(o)}">
  <button type="button" class="dh-vrow-face"
    aria-label="${cardLabel({...o, state: spoken}).replace(/"/g, '&quot;')}"${
      inert || state === 'disabled' ? ' aria-disabled="true"' : ''}>
    <!-- data-face is on the lens and not on the button, which is gluvtt's
         own split and worth keeping: Peek opens against the painting, and
         anchoring it to the full width of a row would float it off the end
         of the name rather than off the card. -->
    <span class="dh-vrow-lens" data-face aria-hidden="true">
      ${o.art ? '' : sigil(o.fbsig || o.sig, 'dh-vrow-sigil')}
    </span>
    <span class="dh-vrow-level" aria-hidden="true">${o.lvl ?? ''}</span>
    ${sigil(o.sig, 'dh-vrow-mark')}
    <b class="dh-vrow-name">${o.name}</b>
    ${state === 'out-of-reach'
      ? `<span class="dh-vrow-stamp">Needs ${o.rc ?? 0} Stress</span>` : ''}
    <small class="dh-vrow-kind">${kindWords(o).join(' · ')}</small>
    ${chip ? `<span class="dh-vrow-cost" aria-hidden="true"><b>${o.rc}</b>${DH_BOLT}</span>` : ''}
  </button>
  ${inert || !o.controls ? '' : o.controls}
</li>`;
};
