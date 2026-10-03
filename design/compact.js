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
   A vaulted card is the same compact card in one of two states, and the two
   states are the whole vault: a card you can afford to recall, and one you
   cannot. `reach` is the only thing a caller has to decide, because it is
   the only thing the caller knows — whether the holder has the Stress.

   `within-reach` lights the recall chip and the press ring and says nothing
   over the artwork; the price is already on the chip and saying it twice on
   a 100px card is saying it nowhere. `out-of-reach` greys and hatches the
   painting, dims the chip and stamps what the recall needs — the one case
   where the number has to be read rather than glanced at, because it is the
   number telling you no.

   This is a wrapper and not a flag on COMPACT() because the states are not
   the row's only difference in practice: a vault list is where the recall
   price has to be present on every row, so `rc` defaulting to 0 rather than
   to absent is the right default *here* and the wrong one everywhere else.
   A card with no recall cost at all cannot be vaulted. */
export const VAULT_ROW = (opts) => COMPACT({
  rc: 0,
  ...opts,
  state: opts.state ?? (opts.reach === false ? 'out-of-reach' : 'within-reach'),
});
