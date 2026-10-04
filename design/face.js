// The Illuminated card face, ported from gluvtt's `CardFace.tsx`.
//
// Every card is the same height, 140 hundredths of its width. The painting
// bleeds to the rim at the top, about half the card, giving way to long rules
// down to a third; after that the type steps down, and the card never grows.
// The level and domain hang on a pennant top left, the recall cost sits top
// right, the name on the painting's foot and the rules on a clean light
// plate. With no painting the domain's field shows its sigil cut from light.
// A slot face (`size:'slot'`) keeps the painting and the name and leaves the
// rules for the peek.
//
// This is the same card as `card.js`'s CARD(), drawn the way the web app
// draws it, and it is a second builder rather than a flag on the first one
// for one reason: the two do not share a single class name. `.card/.plate/
// .lvl/.rc` and `.dh-face/.dh-art/.dh-pennant/.dh-recall` are two complete
// stylesheets, and a builder that emitted either would be a builder whose
// every line carried an `if`. They share the *option object* instead, which
// is the thing that actually has to stay in step — see the shape below.
//
// gluvtt is React; this is the house idiom, a pure function from data to an
// HTML string. So everything React held in a hook or a ref is either an
// option (a motif, a stamp, pre-rendered counters) or lives in `face-fx.js`
// (tilt, fit, sweep), which is the only file here that touches the DOM.
//
// ── the option object ───────────────────────────────────────────────
// Deliberately the same vocabulary as CARD()/TILE()/SPINE(), so `cardOf()`
// in src/module/sheets/cards.ts feeds all five from one definition:
//
//   d, d2        domain definitions — {slug, name, light, dark, ramp}
//   lvl, pre     the numeral and its unit prefix ('T' for a tier)
//   rc           recall cost in Stress; 0 is free and prints as free
//   type         the kind word: 'Spell', 'Class', 'Weapon'
//   name         the card's name
//   foot         the kind line's second word; defaults to d.name
//   text         rules prose; blank lines separate paragraphs
//   flavour      the italic line above the rules
//   feats        [{n, t}] named blocks of rules
//   stats        [{k, v}] the labelled numbers
//   sig, sig2    inline <svg> for the first and second domain's sigil
//   fbsig        inline <svg> drawn large where there is no painting
//   glyph        data-glyph's value: 'weapon', 'ancestry', 'passive', …
//   tier         1–4; data-tier, which silvers at 3 and golds at 4
//   doms         how many domains data-domains should say (see below)
//   motif        the ornament family; data-motif on the corners and seam
//   size         'full' or 'slot'
//   state        'rest' | 'within-reach' | 'out-of-reach' | 'used'
//   art          the painting's URL
//   w            its width in px; without one it fills its container
//   homebrew     made at the table, which the kind line and the foot say
//   code         the printed card number, 'DH106'
//   artist       who painted it
//   cover        raw HTML over the painting, under the furniture
//   uses, dice   raw HTML for the charge lights and counting dice
//   cls          extra classes on the article
//
// `fbname` is accepted and ignored: CARD()'s fallback plate carries a
// wordmark under its mark and this face does not — the no-art field is the
// sigil alone, with the name already printed on the painting's foot. It
// stays in the signature so one option object can feed both builders without
// `cardOf()` having to know which fields each one reads.
import { rich } from './terms.js';

/* ── marks ────────────────────────────────────────────────────────
   The two marks drawn here rather than loaded: the recall bolt and the
   Homebrew quill. Everything else — domain sigils, class marks, kind glyphs
   — arrives as inline markup in `sig`/`sig2`/`fbsig`, because this system
   already has a loader for them and a second one would be a second place
   for the assets to drift. See the SIGILS note below.

   This is *not* card.js's BOLT, and the duplication is on purpose: that one
   is a 10×14 glyph sized for the `.rc` chip, this one is the 16×16 path
   `.dh-recall-bolt` is written against, down to which way the stroke leans.
   Two stylesheets, two bolts. */
export const DH_BOLT =
  '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
  '<path d="M9.6.8 2.6 9.3h4.3l-1 5.9 7.5-9H9l.6-5.4Z" fill="currentColor"/></svg>';

/* The quill a Homebrew card wears, so it never passes for Library content.
   Labelled rather than hidden — it is the only thing on the card that says
   where the card came from. */
export const DH_QUILL =
  '<svg viewBox="0 0 16 16" role="img" aria-label="Homebrew">' +
  '<path d="M14.6 1.2C9.4 1.6 5.6 4.6 4 9.6l-.9 2.9-1.6 2.2.7.5 1.6-2.2 2.8-.9c2.5-.8 4.2-2.2 5.2-4.1L9.6 8l2.6-1.4c1.1-1.6 1.9-3.4 2.4-5.4Z" fill="currentColor"/></svg>';

/* ── SIGILS: the seam ─────────────────────────────────────────────
   gluvtt fetches `/daggerheart/domains/<slug>.svg` and uses it as a
   mask-image over a square of `currentColor`, because the web app's copies
   are flat silhouettes. This system's copies are the official 250×250 files
   authored with `fill="currentColor"`, and `ui/domains.js` already fetches,
   caches and recentres them against their own ink bounds — `icon()`,
   `glyph()`, `clazz()` — while `sheets/cards.ts` preloads all twenty-five
   once per session into one map and hands the markup to the builders as
   `sig`/`sig2`/`fbsig`. Those are the same strings CARD() already receives.

   So the seam is: **the mark arrives resolved, and this file only places
   it.** No fetch here, no mask, no second asset path. A mark is wrapped in
   a `.dh-sigil` span carrying gluvtt's own class so the CSS port keeps its
   selectors, with one consequence the CSS has to know about: `.dh-sigil` is
   a *box* here, not the `<svg>` itself. It wants a size and a `color`, and
   `.dh-sigil > svg { width:100%; height:100%; fill:currentColor }` — not
   `mask-image: var(--dh-sigil)`, which has nothing to mask.

   A missing mark yields an empty box rather than a broken one. `loadSigils`
   already resolves a failed fetch to '' for the same reason: a missing
   glyph should cost you one mark, not the whole card. */
const sigil = (markup, cls) =>
  `<span class="dh-sigil${cls ? ' ' + cls : ''}" aria-hidden="true">${markup || ''}</span>`;

/* ── words ────────────────────────────────────────────────────────
   The kind line is "what it is and where it belongs", said once: a Spell of
   Midnight is `Spell · Midnight`, and a Spell whose foot is also "Spell" is
   just `Spell`. The de-duplication is case-insensitive because the two
   fields come from different tables and one of them capitalises. */
export const kindWords = ({type, foot, d, homebrew}) => {
  const words = [type, foot ?? d?.name].filter(Boolean);
  const kind = words.filter((w, i) =>
    words.findIndex(o => o.toLowerCase() === w.toLowerCase()) === i);
  return homebrew ? [...kind, 'Homebrew'] : kind;
};

/* The words a state puts on the painting. Only two states speak: a used card
   says so, and a vaulted card out of reach says what it would cost. A card
   within reach says nothing — the recall chip is already lit, and a second
   label over the artwork would be the price stated twice. */
export const stateWords = ({rc, state}) =>
  state === 'used' ? 'Used' :
  state === 'out-of-reach' ? `Recall needs ${rc ?? 0} Stress` : undefined;

/* What a card says when named aloud. The face is one `aria-label` and its
   furniture is all `aria-hidden`, because a screen reader reading a card as
   nine unrelated fragments — "3", "Spell", "2", "Used" — is worse than not
   reading it at all. */
export const cardLabel = (o) => {
  const lvl = o.lvl == null ? '' : `, ${o.pre === 'T' ? 'tier' : 'level'} ${o.lvl}`;
  const rc = o.rc == null ? '' : `, ${o.rc === 0 ? 'recall free' : `recall ${o.rc} Stress`}`;
  const stamp = stateWords(o);
  return `${o.name}. ${kindWords(o).join(', ')}${lvl}${rc}${stamp ? `. ${stamp}` : ''}`;
};

/* ── how many domains ─────────────────────────────────────────────
   `data-domains` drives the pennant's shape and the whole no-art field, and
   it is not the same question as "is `d` set". Every card in this system
   has a `d`, because a weapon is drawn in graphite rather than in nothing —
   and graphite is exactly what `data-domains="0"` means. The tell is
   already on the token: `KINDS` entries carry `ramp:false` precisely
   because they have no domain hue to ramp. So that is the default, and
   `doms` overrides it for the card that is an exception to its own token. */
const domainCount = (o) =>
  o.doms ?? (o.d2 ? 2 : (o.d && o.d.ramp !== false ? 1 : 0));

/* ── custom properties ───────────────────────────────────────────
   The hues, the painting and the drawn width, as the variables cards.css
   reads. `--dh-art` is a `url()` rather than a plain string so the CSS can
   drop it straight into `background-image`. */
const vars = (o) => [
  o.d && `--dh-dom:${o.d.light}`,
  o.d && `--dh-dom-dk:${o.d.dark}`,
  o.d2 && `--dh-dom-2:${o.d2.light}`,
  o.d2 && `--dh-dom-2-dk:${o.d2.dark}`,
  o.art && `--dh-art:url('${o.art.replaceAll("'", "%27")}')`,
  o.w && `--dh-w:${o.w}px`,
].filter(Boolean).join(';');

/* ── the pennant ──────────────────────────────────────────────────
   The level and the domains, hung top left; at full size rimmed, with a gem,
   in tier metal at 3 and 4. `is-plain` is the no-domain form — a kind glyph
   on bare graphite rather than a sigil on a domain field — and `is-two` is
   the class card's, which is the only card that carries two.

   The gem is a full-size fixture and it only appears where there is a
   numeral: it is the stop between the number and the mark, and a stop
   between nothing and a mark is a bead of metal sitting on its own. */
const pennant = (o, full) => {
  const doms = domainCount(o);
  return `
    <span class="dh-pennant${o.d2 ? ' is-two' : ''}${doms ? '' : ' is-plain'}" aria-hidden="true">
      ${o.lvl == null ? '' : `<span class="dh-pennant-level">${
        o.pre === 'T' ? '<small>Tier</small>' : ''}<b>${o.lvl}</b></span>`}
      ${full && o.lvl != null ? '<i class="dh-pennant-gem"></i>' : ''}
      ${sigil(o.sig, 'dh-pennant-mark')}
      ${o.sig2 ? sigil(o.sig2, 'dh-pennant-mark') : ''}
    </span>`;
};

/* The recall cost. `is-free` is a zero, which is a real and common value —
   a card you can take back for nothing — and reads as the chip with its
   bolt dimmed rather than as an absent chip. A card with no recall at all
   (a weapon, a class) has no chip. */
const recall = (rc) => rc == null ? '' : `
    <span class="dh-recall${rc === 0 ? ' is-free' : ''}" title="Recall: ${rc} Stress">
      <b>${rc}</b><span class="dh-recall-bolt">${DH_BOLT}</span>
    </span>`;

/* ── illuminated furniture ───────────────────────────────────────
   Ported from `illuminated.tsx`. None of it moves under the pointer; only
   the painting does.

   `motif` arrives as an option rather than being derived here. gluvtt gets
   it from `ornaments.ts`, which generates the corner and seam images as
   data URLs and injects one CSS rule per motif — that file is not part of
   this port, and inventing a second table of motifs here would be a second
   thing to keep in step with the first. So the face states the motif it
   belongs to and the stylesheet decides what that means, which is where
   the decision was always going to end up. Without a motif the corners and
   flourish simply do not draw; the frame, the wear and the gem still do. */
const frame = (o) => `
    <span class="dh-frame" aria-hidden="true"></span>
    <span class="dh-wear" aria-hidden="true"></span>
    ${o.motif ? `<span class="dh-corners" data-motif="${o.motif}" aria-hidden="true">
      <i class="dh-corner is-bl"></i><i class="dh-corner is-br"></i>
    </span>` : ''}`;

/* The seam between painting and rules: the domain's flourish either side of
   a small gem, and the gem holds the card's own mark. */
const seam = (o) => `
    <span class="dh-seam"${o.motif ? ` data-motif="${o.motif}"` : ''} aria-hidden="true">
      ${o.motif ? '<i class="dh-seam-flourish"></i>' : ''}
      <span class="dh-seam-gem">${sigil(o.sig)}</span>
    </span>`;

/* The printed foot: what the printing records, or Homebrew for a card that
   has no printing to record anything. */
/* A card's own number, or the word for a card that has none.

   `code` first, and `homebrew` only when there is no code, because the two
   are not the alternatives they look like. `homebrew()` in `cards.ts`
   answers "no Darrington printing", and a campaign-frame card has none —
   but it *does* come out of a box, and `markedCode()` names which:
   `TM·ROOT`. With the word first, every Root and Void card printed
   "Homebrew" over a set mark the builder had already been handed, which
   made nonsense of the whole argument in `marked.css` that the footer's
   right cell is where a frame says where it came from.

   So: a card that knows its set says its set, and the word is what is left
   for a card that genuinely came from nowhere but this table. */
const printedFoot = (o) => `
    <footer class="dh-foot">${o.code
      ? `<b>${o.code}</b>${o.artist ? `<span>Art: ${o.artist}</span>` : ''}`
      : o.homebrew ? '<b>Homebrew</b>'
      : `${o.artist ? `<span>Art: ${o.artist}</span>` : ''}`}
    </footer>`;

/* ── rules text ──────────────────────────────────────────────────
   Paragraphs from blank lines, and the body of each through terms.js —
   the port of gluvtt's `terms.ts` + the marking half of `RulesText.tsx`.
   It handles `**bold**`, `*italic*`, and every game term the rules name,
   each in its resource's colour with its own mark in front of it.

   This used to go through card.js's `rich()` instead, on the argument that
   one term list is safer than two. The treatment that bought was two
   coloured words out of thirty, no marks, and — because card.js puts its
   styling on a bare `<b>` — the same small caps and print colour on every
   `**bold**` in a card's prose. terms.js emits `<b class="dh-term"
   data-term="…">` for a term and `<strong>`/`<em>` for emphasis, so the CSS
   can tell the two apart and the `.dh-term[data-term]` colour set has
   something to match. card.js keeps its own minimal marker for tile.js.

   The two lists are kept honest by pointing at one source rather than by
   there being one list: terms.js transcribes this system's CONDITIONS from
   src/module/config.ts and says so. */
export const rulesText = (text, cls) => `
    <div class="dh-rules-text${cls ? ' ' + cls : ''}">${
      String(text).split(/\n{2,}/).map(p => `<p>${rich(p)}</p>`).join('')}</div>`;

/* A named block of rules. `uses` is pre-rendered HTML for the charge lights
   that belong to this feature rather than to the card — the counter widgets
   (ChargeLights, CountingDie, CounterRail) are their own port and this file
   only leaves them a hole of the right shape in the right place. */
const feat = (f) => `
      <section class="dh-feat">
        <h4>${f.n}${f.uses ? `<span class="dh-uses">${f.uses}</span>` : ''}</h4>
        ${f.t ? rulesText(f.t) : ''}
      </section>`;

export const FACE = (opts) => {
  const o = {size: 'full', state: 'rest', type: 'Spell', name: 'Rain of Blades', ...opts};
  const full = o.size === 'full';

  /* Whether there is a plate at all. A card with nothing but a painting and
     a name — a class portrait, a piece of loot — gets `no-body`, which lets
     the painting take the whole face instead of leaving an empty light
     panel under it. The slot face never gets a plate: its rules are the
     peek's job. */
  const body = full && Boolean(o.text || o.flavour || o.feats?.length || o.stats?.length);

  const classes = ['dh-face', o.art ? 'has-art' : 'no-art', body ? '' : 'no-body',
    o.homebrew ? 'is-homebrew' : '', o.cls].filter(Boolean).join(' ');
  const stamp = stateWords(o);
  const doms = domainCount(o);

  return `
<article class="${classes}" data-size="${o.size}" data-state="${o.state}"
  data-domains="${doms}"${o.tier ? ` data-tier="${o.tier}"` : ''}${
    o.glyph ? ` data-glyph="${o.glyph}"` : ''}
  aria-label="${cardLabel(o).replace(/"/g, '&quot;')}" style="${vars(o)}">
  <!-- Everything inside .dh-face-tilt and nothing outside it. The tilt
       transform lands on this element, which is why the pointer maths in
       face-fx.js measures the article instead: a rotated box's rect is its
       bounding box, so measuring the thing that turns feeds its own turn
       back into the reading. Keeping the host flat keeps the maths honest
       under Foundry's scaled, scrolling, draggable windows too. -->
  <div class="dh-face-tilt">
    <div class="dh-art">
      <!-- The painting is the --dh-art variable as this box's background,
           cover from centre top, and the parallax slides it behind the
           glass. gluvtt can also hand this span a FramedArt, which crops to
           a Focus point the art record carries; that component is the web
           app's and a Focus point is not a thing a Foundry Item has, so
           every card here takes the plain crop — the one gluvtt itself falls
           back to for a painting with no point marked. -->
      <span class="dh-art-paint"></span>
      ${o.art ? '' : sigil(o.fbsig || o.sig, 'dh-art-sigil')}
      <span class="dh-glare"></span>
    </div>
    ${full ? frame(o) : ''}
    ${o.cover ?? ''}
    ${pennant(o, full)}
    ${recall(o.rc)}
    ${o.dice ? `<span class="dh-face-die">${o.dice}</span>` : ''}
    <header class="dh-name">
      ${stamp ? `<span class="dh-stamp">${stamp}</span>` : ''}
      <h3>${o.name}</h3>
      <span class="dh-kind">
        ${full && doms ? sigil(o.sig, 'dh-kind-mark') : ''}${kindWords(o).join(' · ')}
      </span>
      ${o.uses ? `<span class="dh-uses">${o.uses}</span>` : ''}
    </header>
    ${body ? `
    <div class="dh-face-plate">
      ${doms ? sigil(o.sig, 'dh-watermark') : ''}
      ${o.flavour ? `<p class="dh-flavour">${o.flavour}</p>` : ''}
      ${o.stats?.length ? `<dl class="dh-stats">${o.stats.map(s =>
        `<div><dt>${s.k}</dt><dd>${s.v}</dd></div>`).join('')}</dl>` : ''}
      ${o.text ? rulesText(o.text) : ''}
      ${(o.feats ?? []).map(feat).join('')}
    </div>
    ${seam(o)}` : ''}
    ${full ? printedFoot(o) : ''}
    <span class="dh-sweep" aria-hidden="true"></span>
  </div>
</article>`;
};
