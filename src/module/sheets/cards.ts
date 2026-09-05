/**
 * Foundry Item → the option object the design's card builders take.
 *
 * `CARD`, `TILE` and `SPINE` all accept the same shape, which is the whole
 * point of them: one item definition drives the full card in the peek layer,
 * the tile in a gear slot and the spine in a list row, and none of the three
 * can drift from the other two. Nothing in `design/` knows what a Foundry
 * Item is, and nothing here draws anything — this file is the only place the
 * two vocabularies meet.
 *
 * The colours come from the *vendored* `ui/domains.js` rather than from
 * `config.ts`'s `DOMAIN_CONFIG`, even though the two hold the same nine
 * hues. `d` is handed straight to the builders, which read `light`/`dark`/
 * `ramp` off it; sourcing it anywhere but the module the builders were
 * written against is an invitation for the two tables to disagree after an
 * edit to one of them.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ItemSnapshot } from "../apps/sheet-state.svelte.ts";
import {
  BURDEN_LABELS,
  CARD_TYPE_LABELS,
  DOMAINS,
  FEATURE_KIND_LABELS,
  MARKED_SET,
  RESOURCE_REFRESH_LABELS,
  isMarkedDomain,
  rangeLabel,
  traitLabel,
} from "../config.ts";
import { cssUrl } from "../assets.ts";
import { damageDice } from "../data/damage.ts";
import { resourceMax, type Resource } from "../data/resources.ts";
import { poolCapacity, type DiePool } from "../data/dice-pools.ts";
import { CHITS } from "../ui/chit.js";
import { KEEP } from "../ui/keep.js";
import { CLASSES, KINDS, byslug } from "../ui/domains.js";
import { clazz, glyph, icon } from "../ui/domains.js";

/* ── sigils ───────────────────────────────────────────────────────────
   `icon()` and `glyph()` fetch an SVG and recentre it against its own ink
   bounds, which needs the document — so they are async and cannot be called
   from a render. Everything the character sheet can possibly draw is
   preloaded once instead, and the sheet renders spines only after the map
   resolves. There are twenty-five files — nine domain sigils, seven type
   glyphs and nine class marks — and `domains.js` caches them, so this costs
   one round of fetches per session and nothing thereafter.

   A failed fetch yields an empty string rather than rejecting. A missing
   glyph should cost you one mark, not the whole sheet. */

/** Type glyphs, keyed under `@name` so they cannot collide with a domain. */
export const GLYPHS = [
  "ancestry",
  "community",
  "transformation",
  "primary",
  "secondary",
  "armor",
  "gear",
  "consumable",
] as const;

export type Sigils = Record<string, string>;

/**
 * A class mark's key. `#` for the same reason `@` marks a type glyph — three
 * families share one map and a class named for a domain would otherwise
 * overwrite it.
 */
export const classKey = (name?: string): string | undefined => {
  const slug = String(name ?? "").toLowerCase();
  // Membership, not just a lowercase — a homebrew class has no mark on disk,
  // and a key pointing at a fetch that 404'd is worse than no key at all.
  return CLASSES.includes(slug) ? `#${slug}` : undefined;
};

let pending: Promise<Sigils> | null = null;

export function loadSigils(): Promise<Sigils> {
  pending ??= (async () => {
    const out: Sigils = {};
    const safe = async (key: string, get: () => Promise<string>) => {
      try {
        out[key] = await get();
      } catch {
        out[key] = "";
      }
    };
    await Promise.all([
      ...DOMAINS.map((s) => safe(s, () => icon(s))),
      ...GLYPHS.map((g) => safe(`@${g}`, () => glyph(g))),
      ...CLASSES.map((c) => safe(`#${c}`, () => clazz(c))),
    ]);
    return out;
  })();
  return pending;
}

/* ── the mapping ──────────────────────────────────────────────────── */

/** Character-level facts a card cannot read off itself. */
export interface CardContext {
  /** The class's two domains, for the class and subclass cards. */
  domains?: { primary?: string; secondary?: string };
  /**
   * Every class's *own* pair, keyed by lowercase class name.
   *
   * A subclass card has no domains and inherits its class's — which was read
   * off the character, and the character has one `domains` field. That is
   * correct until somebody multiclasses, at which point the second class's
   * subclass cards wear the first class's colours and say its domains in
   * their footer. The card is then wrong about the only two facts it
   * borrowed. So a subclass looks up the class it names and falls back to
   * the character's only when it cannot find one.
   */
  classDomains?: Record<string, { primary?: string; secondary?: string }>;
  /** Armor slots marked, so an armor tile can print "3 / 4". */
  armorMarked?: number;
  armorSlots?: number;
  /**
   * The character holding the card, for the ceilings that come off them.
   *
   * A pool "equal to your Spellcast trait" or "equal to your level" has no
   * number until somebody is holding it, which is exactly why the schema
   * stores where the ceiling comes from rather than what it is. Absent — the
   * compendium browser, the creation window's grids — every such ceiling
   * resolves to its floor, and a card belonging to nobody stating no capacity
   * is the honest reading rather than a gap.
   */
  actor?: any;
}

export interface CardOptions {
  d: any;
  d2?: any;
  sig: string;
  sig2?: string;
  /**
   * Which sigil `sig` is, by name, so it can be looked up again.
   *
   * `sig` is an inline `<svg>`, and Foundry strips `<svg>` out of anything
   * stored as chat message content — so a card posted to the log arrives
   * with empty corner plates and a blank art fallback. The key is what
   * survives the round trip: the card is stored as its options and drawn
   * again on render, against the recipient's own copy of the assets.
   */
  sigKey?: string;
  sig2Key?: string;
  /**
   * The mark and wordmark the *fallback* plate shows in place of artwork.
   *
   * The builders default both to the corner sigil and the domain name, which
   * is right for a card with one domain and wrong for the two that have two.
   * A class card has no artwork at all — there is no printed class card to
   * take any from — so its fallback plate is the plate you always see, and it
   * was drawing Grace under the word "Grace" while Grace and Codex sat in the
   * corners above it. The class mark is the one thing on a class card that is
   * about the class rather than about its domains.
   *
   * `fbsigKey` travels for the same reason `sigKey` does: `<svg>` does not
   * survive being stored as chat content.
   */
  fbsig?: string;
  fbsigKey?: string;
  fbname?: string;
  lvl?: number | null;
  pre?: string;
  rc?: number | null;
  type: string;
  name: string;
  foot?: string;
  /**
   * The number printed in the card's own footer — "DH106", "DH Core 056/270".
   *
   * Only the four subtypes that exist as a physical card have one, and only
   * because `tools/fetch-cards.mjs` brings it back with the art. Everything
   * else leaves it unset and keeps the builders' placeholder.
   */
  code?: string;
  text?: string;
  flavour?: string;
  feats?: { n: string; t: string }[];
  stats?: { k: string; v: string | number }[];
  ramp?: boolean;
  /** The item this was built from, so a row can act on it. */
  id?: string;
  /** Stable identity for the swap's FLIP — never the index, which a swap changes. */
  k?: string;
  /**
   * An inline `--art` declaration for the row wrapper.
   *
   * The builders draw `<div class="img">` and read `--art` off it, so the
   * variable is set on the wrapper and inherits in — which is also the only
   * way to vary it per card without editing `design/`. `tokens.css` ships a
   * sample image as the default, and inheriting *that* is the bug this
   * closes: every card on the sheet wearing one stock photograph.
   */
  art?: string;
  /**
   * No artwork, so the builders' own fallback plate — the domain sigil at
   * plate size — stands in for it. A class rather than a consequence of
   * `--art:none`, because CSS cannot branch on a custom property's value.
   */
  noart?: boolean;
  /**
   * Counter rows, already drawn, for the plate's lower left.
   *
   * A **readout** everywhere this appears, and the two places it appears are
   * why. A peeked card lives in `.peeklayer`, which is `pointer-events:none`,
   * so nothing on it could take a press; a posted card is a record, and the
   * log's whole argument is that a row of live buttons three hours later is
   * an invitation to spend the same use twice. Where the pool is a *control*
   * — a features row, a loadout spine — the row is a `Chits` component and
   * not this, because a control has to survive being driven.
   *
   * It travels with the options rather than being rebuilt on render for the
   * reason `sigKey` exists: a posted card is stored as its options, and what
   * a card said when it was posted is what it should go on saying.
   */
  chits?: string;
  /**
   * Extra classes for the card's own root, which `CARD` joins onto `.card`.
   *
   * **Read by `CARD` and by neither `TILE` nor `SPINE`**, which is the
   * boundary that decides what may go in here: a class naming a *frame* is
   * a claim about the card as a printed object, and a tile and a spine are
   * handles for one rather than smaller copies of it. Today one thing sets
   * it — see `marked` below.
   */
  cls?: string;
}

const dom = (slug?: string) => (slug && byslug[slug]) || KINDS.gear;

/* ── the campaign frame ───────────────────────────────────────────────
   Root and Void are one campaign frame's domains and have to be tellable
   from the ten the books print. `design/marked.css` is the whole of that
   argument and this is the whole of the wiring: four classes and a set
   mark, off the domain slug.

   The four are `design/marked.html`'s section F — the trim in silver
   rather than Hope's gold, the second chamfer, the bounded edge, and the
   motif behind the panel's prose. `mk-stock`, the fifth, is deliberately
   not stamped: it is the largest of the signals and the one most likely
   to be somebody's taste rather than the system's, and it is one class
   away for a table that wants it.

   **The marque is not among them, and the reason is a finding rather than
   a preference.** `mk-marque` prints the frame's name in the footer's left
   cell in place of the domain's, and marked.css says so — but the cell's
   *content* is `foot`, and `foot` is read by `TILE` and `SPINE` as well.
   So renaming it would rename the deck in every loadout row and gear tile
   too, where there is no silver and no edge to explain the word and the
   domain name is the one fact the row is carrying. The frame therefore
   says which box it came out of in `code`, the footer's right cell, which
   `CARD` alone draws — and the deck goes on being named where it always
   was. */
const MARKED_CLASSES = ["mk-trim", "mk-cut", "mk-edge", "mk-motif"] as const;

/** `mk mk-root mk-trim …`, or nothing at all for the printed ten. */
const marked = (domain?: string): string | undefined =>
  isMarkedDomain(domain) ? ["mk", `mk-${domain}`, ...MARKED_CLASSES].join(" ") : undefined;

/**
 * The set mark for the footer's right cell — `TM·ROOT`.
 *
 * `code` is the number printed on a physical card, and these have no
 * printing: left unset, `CARD` falls through to its own `DH·ROO·004`
 * placeholder, which is a Darrington Press card number for a card
 * Darrington Press never printed. A set and a deck is what is actually
 * true about one of these, so that is what it says.
 */
const markedCode = (domain?: string): string | undefined =>
  isMarkedDomain(domain) ? `${MARKED_SET}·${String(domain).toUpperCase()}` : undefined;

/**
 * Two kinds of image are *not* artwork.
 *
 * Foundry hands every Item a placeholder from its own `icons/` set when
 * nothing else is set; those are flat mono glyphs meant for a 32px list row,
 * and stretched to `cover` behind a card they are a grey smear.
 *
 * And our own compendium entries carry a mark as their `img` — a domain sigil,
 * a type glyph or a class mark — so that a card dragged to a hotbar or listed
 * in a sidebar is identifiable. Those are marks, not photographs: the card
 * already draws one in its corner plate, and blowing a mark up as a background
 * is drawing the same idea twice, once badly.
 *
 * In both cases the honest answer is the builders' own fallback plate, which
 * is that sigil at plate size on a domain-tinted ground. So a card with no
 * real photograph is `noart`, not a card with a bad one.
 */
const STOCK = [
  /^icons\//,
  /^systems\/gluniverse-daggerheart\/assets\/(domains|types|classes)\//,
];

const hasArt = (img?: string): boolean => !!img && !STOCK.some((rx) => rx.test(img));
const art = (img?: string): string => `--art:${hasArt(img) ? cssUrl(img) : "none"}`;

/**
 * The three subtypes whose card has a domain, and therefore a hue.
 *
 * `CHITS` takes this as a statement rather than sniffing `--dom`, because a
 * `var()` fallback asks whether the property is set anywhere up the tree and
 * `tokens.css` sets it at `:root` — so the answer is always yes and every
 * counter on an ancestry card would come out teal. Only the thing drawing the
 * card knows, and this is where that is known.
 */
const DOMAIN_KINDS = new Set(["domainCard", "class", "subclass"]);

/** Whether an Item's card carries a domain, and therefore a hue for its chits. */
export const hasDomainHue = (type: string): boolean => DOMAIN_KINDS.has(type);

/**
 * Every pool on a card, drawn as a readout for the plate's lower left.
 *
 * All of them, feature-bound or not: a resource bound to a named feature is
 * bound to a feature block printed on this same card, so the card is where it
 * belongs either way. The row that has to know *which* feature is the one on
 * the Features panel, which is a different surface with a different question.
 */
export function cardChits(it: ItemSnapshot, actor?: any): string | undefined {
  const list: Resource[] = it.system?.resources ?? [];
  const trays: DiePool[] = it.system?.dice ?? [];
  if (!list.length && !trays.length) return undefined;
  const domain = DOMAIN_KINDS.has(it.type);
  const rows = list.map((res) =>
    CHITS({
      value: res.value ?? 0,
      max: resourceMax(res, actor) ?? 0,
      name: (res.name || "tokens").toLowerCase(),
      dom: domain,
      add: false,
    }),
  );
  /* And the kept dice, in the same stack and after the counters, which is
     the sheet's own order — a use you spent, then a die you are holding.
     `roll` mode is skipped outright: it holds nothing, so on a card it
     would be a lone silhouette and the word `d8` making a claim about a
     control that is not there. It belongs where it can be pressed. */
  for (const pool of trays) {
    if (pool.mode === "roll") continue;
    rows.push(
      KEEP({
        mode: pool.mode,
        faces: pool.faces ?? 6,
        dice: pool.dice ?? [],
        max: poolCapacity(pool, actor) ?? 0,
        name: (pool.name || "dice").toLowerCase(),
        dom: domain,
        add: false,
      }),
    );
  }
  return rows.join("");
}
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ── prose ────────────────────────────────────────────────────────────
   The builders take *text*, not markup: `CARD` renders a body as
   `<p class="tx">${rich(text)}</p>` and a feature as `<p>${rich(f.t)}</p>`,
   and `rich` is `**bold**`, `*italic*` and game-term marking.

   Foundry stores rules text as HTML. Handing that straight in nests a `<p>`
   inside a `<p>`, which no browser tolerates — the parser closes the outer
   one and re-parents the inner, so `.tx` ends up empty and the real prose
   becomes an unstyled sibling that no longer clamps to three lines and
   overflows the tile it was measured for. It looks like a layout bug and it
   is a parsing one.

   So the HTML is translated back into the dialect the builders were written
   against. Emphasis becomes `**`/`*` so `rich` still owns how it is drawn;
   paragraph and list breaks become `<br>`, which *is* legal inside the one
   `<p>` we are given and is the only way to keep the author's breaks. */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

const decode = (s: string): string =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

export function plain(html?: string): string {
  if (!html) return "";
  return decode(
    String(html)
      .replace(/<\s*(br)\s*\/?>/gi, "\n")
      .replace(/<\s*\/\s*(p|div|ul|ol|h[1-6])\s*>/gi, "\n\n")
      // A bullet keeps its own line and says it is a bullet. The builders
      // have no list styling, so the marker has to be a character.
      .replace(/<\s*li[^>]*>/gi, "\n• ")
      .replace(/<\s*(strong|b)\s*>/gi, "**")
      .replace(/<\s*\/\s*(strong|b)\s*>/gi, "**")
      .replace(/<\s*(em|i)\s*>/gi, "*")
      .replace(/<\s*\/\s*(em|i)\s*>/gi, "*")
      .replace(/<[^>]*>/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  ).replace(/\n/g, "<br>");
}

/** A `{name, description}` block in the `{n, t}` shape the builders take. */
const feat = (f: any): { n: string; t: string } | null =>
  f?.name || f?.description ? { n: f.name || "Feature", t: plain(f.description) } : null;

const feats = (list: any[]): { n: string; t: string }[] =>
  list.map(feat).filter(Boolean) as { n: string; t: string }[];

/** The slot label a weapon or armor prints in its footer. */
const SLOT_LABEL: Record<string, string> = {
  primary: "Primary",
  secondary: "Secondary",
  armor: "Armor",
};

/**
 * One item, drawn as whatever the caller asks for.
 *
 * Returns `null` for a subtype that has no card — `feature` items are stat
 * block entries, and drawing one as a card would claim it is something you
 * hold.
 */
export function cardOf(
  it: ItemSnapshot,
  sig: Sigils,
  ctx: CardContext = {},
): CardOptions | null {
  const s = it.system ?? {};
  const base = {
    id: it.id,
    k: it.id,
    art: art(it.img),
    noart: !hasArt(it.img),
    code: s.printing?.code || undefined,
    chits: cardChits(it, ctx.actor),
  };

  switch (it.type) {
    /* A domain card is the shape everything else is a variation on: one
       paragraph, a level, and a recall cost. */
    case "domainCard":
      return {
        ...base,
        // The frame, if this is one of the campaign's two. `code` overrides
        // `base`'s, which is a printing this card does not have.
        cls: marked(s.domain),
        code: base.code ?? markedCode(s.domain),
        d: dom(s.domain),
        sig: sig[s.domain] ?? "", sigKey: s.domain,
        lvl: s.level ?? 1,
        rc: s.recallCost ?? 0,
        type: (CARD_TYPE_LABELS[s.cardType] ?? "Ability").toUpperCase(),
        name: it.name,
        foot: dom(s.domain).name,
        text: plain(s.description),
      };

    /* Class and subclass carry *both* of the class's domains, because that
       is what a class is — Ranger is Bone and Sage, and the duo treatment
       says so without a word. The subclass has no domains of its own; it
       inherits the ones the character's class set. */
    case "class": {
      const p = s.domains?.primary;
      const q = s.domains?.secondary;
      // The class's own mark, not the first of its two domains'. A class card
      // never has artwork, so this plate is not a fallback in practice — it is
      // the picture, every time.
      const ck = classKey(it.name);
      return {
        ...base,
        // Trick Shot's five effects need the existing expandable card treatment.
        cls: it.name === "Gunslinger" ? "grow" : undefined,
        d: dom(p),
        d2: q ? dom(q) : undefined,
        sig: sig[p] ?? "", sigKey: p,
        sig2: q ? (sig[q] ?? "") : undefined, sig2Key: q,
        fbsig: ck ? sig[ck] : undefined, fbsigKey: ck, fbname: ck ? it.name : undefined,
        type: "CLASS",
        name: it.name,
        foot: [dom(p).name, q && dom(q).name].filter(Boolean).join(" · "),
        stats: [
          { k: "Evasion", v: s.startingEvasion ?? 10 },
          { k: "Hit Points", v: s.startingHitPoints ?? 6 },
        ],
        /* The class feature, and *not* the Hope feature.

           They are two different kinds of thing wearing one shape. The class
           feature is a passive fact about what you are — it is true whether
           or not you look at it. The Hope feature is a move you make, it
           costs three Hope, and the only moment it matters is the moment you
           are deciding whether to spend them. That decision is taken against
           a number that lives in the rail, eighteen inches from here, and it
           was being read off a card you had to hover to see.

           So it moved to the rail, under the gems it spends — which is where
           the printed sheet puts it, for the same reason. See `hopeCard`
           below for the card it posts when pressed: it is still a card, it
           is just not one that has to be found first.

           No flavour either. A class card is Evasion, Hit Points and its
           feature run, and the one-sentence opener the book gives it is the
           only line on the card that is not a rule — which is exactly the
           line the card can spare. `system.description` still holds it, and
           `tools/check-cards.mjs` still keeps it to one sentence; the card is
           simply not where it gets read. */
        feats: feats(s.classFeatures ?? []),
      };
    }

    case "subclass": {
      // Its own class's pair when we can find one, the character's otherwise.
      // See `classDomains` above for why the difference matters.
      const own = ctx.classDomains?.[String(s.className ?? "").toLowerCase()] ??
        (s.className === "Gunslinger" ? { primary: "bone", secondary: "artifice" } : undefined);
      const p = own?.primary ?? ctx.domains?.primary;
      const q = own?.secondary ?? ctx.domains?.secondary;
      // Same rule as the class, and it fires far less often — a subclass has
      // real artwork, so this is only what a card whose fetch never landed
      // falls back to. It falls back to its class rather than to half its
      // class's domain pair.
      const ck = classKey(s.className);
      return {
        ...base,
        d: dom(p),
        d2: q ? dom(q) : undefined,
        sig: sig[p as string] ?? "", sigKey: p,
        sig2: q ? (sig[q] ?? "") : undefined, sig2Key: q,
        fbsig: ck ? sig[ck] : undefined, fbsigKey: ck, fbname: ck ? s.className : undefined,
        type: "SUBCLASS",
        // The rank *is* the fact you want off this row: which of the three
        // cards of this subclass you are holding.
        name: s.subclassName || it.name,
        foot: capitalise(s.rank ?? "foundation"),
        stats: s.spellcastTrait
          ? [{ k: "Spellcast", v: traitLabel(s.spellcastTrait) }]
          : undefined,
        feats: feats(s.features ?? []),
        /* No flavour, for the reason the class has none. "Play the Troubadour
           if you want to play music to bolster your allies" is advice about
           picking the subclass, and it is read once, at character creation,
           from the book — not from a card you are holding three levels later
           to check what your Specialization does. */
      };
    }

    /* Neither carries a domain mark. In this system a saturated hue means
       domain and a heritage has none, so they stay graphite and take the
       design's own type glyphs — and `ramp:false` on KINDS keeps the colour
       ramp off their artwork for the same reason. */
    case "ancestry":
      return {
        ...base,
        d: KINDS.ancestry,
        sig: sig["@ancestry"] ?? "", sigKey: "@ancestry",
        type: "ANCESTRY",
        name: it.name,
        foot: "Heritage",
        flavour: plain(s.description) || undefined,
        // Named for where they sit on the card rather than for what they do,
        // because the position *is* the rule: mixed ancestry takes the top of
        // one and the bottom of another.
        feats: feats([s.topFeature, s.bottomFeature]),
      };

    case "community":
      return {
        ...base,
        d: KINDS.community,
        sig: sig["@community"] ?? "", sigKey: "@community",
        type: "COMMUNITY",
        name: it.name,
        foot: "Heritage",
        flavour: plain(s.description) || undefined,
        feats: feats([s.feature]),
      };

    /* A transformation draws as heritage because the book says it *is* one:
       "add the card to your loadout as if it were part of your character's
       heritage". So it takes the same graphite, the same `foot`, and its
       features run flat — the card does not label which of the two is the
       benefit and which is the cost, and neither does this.

       The questions are not on the card. They are six prompts for building the
       character, read once and answered in prose, and printing them here would
       put a page of interview questions under two rules on a 300px plate. They
       live in `system.questions` for whatever wants to offer them. */
    case "transformation":
      return {
        ...base,
        d: KINDS.transformation,
        sig: sig["@transformation"] ?? "", sigKey: "@transformation",
        type: "TRANSFORMATION",
        name: it.name,
        foot: "Heritage",
        flavour: plain(s.description) || undefined,
        feats: feats(s.features ?? []),
      };

    /* Gear. The numeral cell carries the tier, prefixed with a T — it is the
       same *kind* of number as a domain card's level, the one you sort and
       shop by, so it takes the same cell; it is not the same number, so it
       says which. */
    case "weapon":
      return {
        ...base,
        d: KINDS.gear,
        sig: sig[`@${s.slot ?? "primary"}`] ?? sig["@gear"] ?? "",
        sigKey: `@${s.slot ?? "primary"}`,
        lvl: s.tier ?? 1,
        pre: "T",
        type: "WEAPON",
        name: it.name,
        foot: SLOT_LABEL[s.slot] ?? "Weapon",
        stats: [
          { k: "Trait", v: traitLabel(s.trait) },
          { k: "Range", v: rangeLabel(s.range) },
          // The *printed* damage. The rolled dice are Proficiency copies of
          // this, and they appear only in the attack bar where Proficiency
          // is in scope.
          { k: "Damage", v: `${damageDice(s.damage)}${s.damage?.bonus ? `+${s.damage.bonus}` : ""}` },
          { k: "Burden", v: BURDEN_LABELS[s.burden] ?? "One-Handed" },
        ],
        text: plain(s.feature?.description || s.description) || undefined,
      };

    case "armor":
      return {
        ...base,
        d: KINDS.gear,
        sig: sig["@armor"] ?? "", sigKey: "@armor",
        lvl: s.tier ?? 1,
        pre: "T",
        type: "ARMOR",
        name: it.name,
        foot: "Armor",
        stats: [
          { k: "Base", v: s.baseScore ?? 0 },
          // Printed thresholds, without your level in them — the rail shows
          // those plus level, and the two disagreeing is this line's fault.
          { k: "Major", v: s.baseThresholds?.major ?? 0 },
          { k: "Severe", v: s.baseThresholds?.severe ?? 0 },
          {
            k: "Slots",
            v: `${Math.max(0, (ctx.armorSlots ?? 0) - (ctx.armorMarked ?? 0))} / ${ctx.armorSlots ?? 0}`,
          },
        ],
        text: plain(s.feature?.description || s.description) || undefined,
      };

    case "consumable":
      return {
        ...base,
        d: KINDS.gear,
        sig: sig["@consumable"] ?? "", sigKey: "@consumable",
        type: "CONSUMABLE",
        name: it.name,
        foot: s.quantity > 1 ? `×${s.quantity}` : "Consumable",
        text: plain(s.description) || undefined,
      };

    case "loot":
      return {
        ...base,
        d: KINDS.gear,
        sig: sig["@gear"] ?? "", sigKey: "@gear",
        type: "ITEM",
        name: it.name,
        foot: s.quantity > 1 ? `×${s.quantity}` : "Item",
        text: plain(s.description) || undefined,
      };

    /* The catch-all subtype, and it used to return null — which meant a
       `feature` Item was invisible. Not "drawn plainly": *absent*. It had no
       card, so no peek, no chat post, no `data-pk`, and therefore no
       right-click and no way to delete it. The gear tab's "+ new" menu
       offered Feature as one of five things you could make, and making one
       put a document on the character that nothing on the character would
       ever draw again.

       The old comment said a feature is a stat-block entry and drawing one as
       a card would claim it is something you hold. That is true of the
       adversary's — an adversary sheet lists its own and does not use this —
       and it was never true of the other half: a class feature granted by a
       campaign frame, a boon from a session, a homebrew knack. Those are
       exactly what this subtype is for, and they belong on the feature list
       with the class's own. `kind` is the word the stat block prints, so it
       is the type line. */
    case "feature":
      return {
        ...base,
        d: KINDS.gear,
        sig: sig["@gear"] ?? "", sigKey: "@gear",
        type: (FEATURE_KIND_LABELS[s.kind] ?? "Feature").toUpperCase(),
        name: it.name,
        foot: s.origin || "Feature",
        stats: featureCosts(s),
        text: plain(s.description) || undefined,
      };

    default:
      return null;
  }
}

/**
 * What a feature costs to use, as footer stats — and nothing at all when it
 * costs nothing, which is most of them. An empty stat row is a line of
 * furniture claiming there is something to read.
 */
function featureCosts(s: any): { k: string; v: string | number }[] | undefined {
  const out: { k: string; v: string | number }[] = [];
  if (s.stressCost) out.push({ k: "Stress", v: s.stressCost });
  if (s.fearCost) out.push({ k: "Fear", v: s.fearCost });
  /* A tracked resource is drawn as chits on the card itself, not as a stat —
     see `.chits` in `design/chit.css`. What the footer still states is the
     *scope*, which the chits cannot show: five counters look the same whether
     they come back at dawn or at the end of the session. A fixed ceiling is
     printed with them because it is a fact about the card; a trait- or
     level-sourced one is not, since only the character holding it knows. */
  for (const r of s.resources ?? []) {
    const when = RESOURCE_REFRESH_LABELS[r.refresh];
    if (when && r.refresh !== "manual") out.push({ k: r.name || "Tokens", v: when });
  }
  return out.length ? out : undefined;
}

/* ══════════════════════════════════════════════════════════════════════
   ONE FEATURE, SAID OUT LOUD

   A class is not a card on this sheet any more — it is a list of its
   features, drawn as rows, with the rule printed on each one. See the
   `.abl` block in `design/sheet.css` for that argument.

   But "what does this do" is still a table question as often as a private
   one, and the answer still wants to be a card. So each row posts *itself*:
   one feature, its rule, and the two domains and class mark of whatever it
   arrived on. Not the class card — that would answer "what does Ranger's
   Focus do" by making four other people read past Evasion, Hit Points and a
   second feature to find the sentence.

   None of these have artwork. There is no printed card for a page in a book,
   which is why the class card was `noart` too, and why the plate they all
   fall back to is the class mark rather than the first of two domain sigils.
   ══════════════════════════════════════════════════════════════════════ */

export interface FeatureCardOptions {
  /** The Item the feature arrived on. Gives the card its id and its `k`. */
  item: ItemSnapshot;
  /** A `{name, description}` block — a `featureField`, or an Item's system. */
  feature: any;
  /** The type line: "CLASS FEATURE", "FOUNDATION", "HOPE FEATURE". */
  type: string;
  /** The footer: which class or subclass said it. */
  foot?: string;
  /** The class pair to wear in the corners, when there is one. */
  domains?: { primary?: string; secondary?: string };
  /** The class whose mark fills the plate in place of artwork. */
  className?: string;
  stats?: { k: string; v: string | number }[];
  /**
   * Which feature of its Item this is. A class carries two and a subclass
   * carries several, so the id alone is not a key — and `k` is what the
   * swap's FLIP and the peek layer look each other up by.
   */
  slot?: string;
}

export function featureCard(sig: Sigils, o: FeatureCardOptions): CardOptions | null {
  const f = o.feature;
  if (!f?.name && !f?.description) return null;

  const p = o.domains?.primary;
  const q = o.domains?.secondary;
  const ck = classKey(o.className);

  return {
    id: o.item.id,
    k: `${o.item.id}:${o.slot ?? "feature"}`,
    art: "--art:none",
    noart: true,
    d: dom(p),
    d2: q ? dom(q) : undefined,
    sig: (p && sig[p]) || "", sigKey: p,
    sig2: q ? (sig[q] ?? "") : undefined, sig2Key: q,
    fbsig: ck ? sig[ck] : undefined, fbsigKey: ck, fbname: ck ? o.className : undefined,
    type: o.type,
    name: f.name || "Feature",
    foot: o.foot,
    stats: o.stats,
    text: plain(f.description),
  };
}

/* ══════════════════════════════════════════════════════════════════════
   THE HOPE ACTION

   The one thing on a character sheet that is a move rather than a record.
   Every class has exactly one, it is bought with Hope, and it has no Item of
   its own — it is a `{name, description}` block on the class, like the class
   feature beside it.

   It gets a card for the reason above, and it keeps its own function because
   it is the one feature with a *price* the sheet has to read.
   ══════════════════════════════════════════════════════════════════════ */

/** What a Hope feature costs when its own text does not say. */
export const HOPE_ACTION_COST = 3;

/* ── what a feature costs to use ───────────────────────────────────────
   Every price in this game is written into the rule rather than stored
   beside it — "Spend 3 Hope to…", "Mark a Stress to…" — so a sheet that
   wants to charge for a feature has to read the feature.

   That is a parse of English rules text, which is the thing this system
   refuses to do everywhere else, so it is worth being exact about why it is
   allowed here and how it is kept honest.

   It is allowed because the alternative is worse in a specific way: the
   player presses the feature, then goes and marks the Stress by hand, and
   the commonest failure at a real table is the second half not happening.
   The sheet is *already* doing this for the Hope action and has been since
   that moved to the rail.

   It is kept honest by a bound, and the bound is **grammatical rather than
   positional**. That is a correction: it used to be a run of at most 64
   characters from the start of the text, stopped dead at the first `.`, on
   the reasoning that Daggerheart states a price the way an invoice does —
   first thing, imperative. It does, on the cards that have one thing to say.
   It does not on the ones that name a trigger first, and there are a great
   many of those:

       Shadow Stepper — "You can move from shadow to shadow. While in shadow,
       you can mark a Stress to disappear…"          killed by the '.' at 34
       Wings of Light — "You can fly. While flying… • Mark a Stress to pick
       up and carry another willing creature…"       killed by the '.' at 12
       Heart of a Poet — "After you make an action roll to impress, persuade,
       or offend someone, you can spend a Hope…"     lead-in runs to 78

   A hundred and eleven feature blocks across the four packs stated a cost the
   sheet could not see, which is the failure this parse exists to prevent
   arriving from the other side: the player presses the row, nothing is
   charged, and nothing on screen says a price went unpaid.

   So the position is dropped and what replaces it is **who is paying**. A
   price is the holder's, and the holder's price is written one of two ways:
   an offer — "you can spend", "you may mark" — or a bare imperative at the
   head of a clause, which is the same sentence with the subject left out.
   Anything else in the paragraph belongs to somebody else or is a
   consequence rather than a purchase, and the counter-example is still the
   one that settles it:

       Ranger's Focus — "Spend a Hope and make an attack against a target.
       … When you deal damage to them, they must mark a Stress."

   The first is your price. The second is the *target's*, and a regex that
   reads the whole paragraph without asking who is paying charges you for it.
   "they must mark" is neither an offer nor the head of a clause, so it is not
   reached — and the same test takes twenty-nine clauses the old anchored run
   *was* already charging, every one of them a trigger, a consequence or
   somebody else's bill. Three weapons named Scary say "the target must mark a
   Stress" and the sheet was charging that Stress to the wielder; four suits of
   Banded Armor say Severe damage costs you one, and were charging it on a
   press rather than on the damage.

   One of the twenty-nine is a genuine price written as an obligation — the
   Ethereal Zweihänder's "You must mark a Stress to conjure this weapon" — and
   it is given up deliberately. "must" is how this book writes a consequence
   far more often than a price, and nothing in the sentence tells them apart.

   Two bounds remain, and both are worth stating because neither is obvious:

   - **The first such clause per currency, and no more.** A card that prices
     two different uses gets charged for both, one per unit, which is the
     one-price-per-feature model showing its edge rather than a parse error.
   - **Only the four currencies this sheet can spend.** Nothing here reads a
     cost it has no track to take it from.

   `tools/check-cards.mjs` is what keeps the widening honest: every clause
   this prices across the four packs is listed there with the words it was
   read from, so a new over-match fails a build rather than quietly charging
   somebody a Stress.

   An authored `stressCost`/`fearCost` on a `feature` Item always wins over
   the text, because somebody typed it deliberately. */

export interface Price {
  hope: number;
  stress: number;
  fear: number;
  armor: number;
}

export const isFree = (p: Price): boolean => !p.hope && !p.stress && !p.fear && !p.armor;

/**
 * @param system the Item's own `system`, when the feature *is* an Item — its
 * authored cost fields outrank anything read out of the prose.
 */
/**
 * What a rule costs, read off its authored actions.
 *
 * This used to sweep the prose. See **A card's buttons are data too** in
 * CLAUDE.md for why it does not any more; what is left here is the reduction
 * from a block's `pay` actions to the one `Price` the sheet's row prints and
 * the Hope action charges.
 *
 * **Summed across every `pay` on the block, and that is a change of meaning
 * rather than of implementation.** The parse could only ever find the *first*
 * clause per currency, because a regex has no way to know whether a second
 * "mark a Stress" is a second price or the same one restated. A reading knows,
 * so a card that genuinely prices two different uses now prices both — and a
 * card that mentions a Stress twice for one use has one entry, because
 * somebody read it.
 *
 * A chain's steps are included: the whole point of a chain is that it is one
 * act with one bill.
 */
export function authoredPrice(actions: any[] = []): Price {
  const out: Price = { hope: 0, stress: 0, fear: 0, armor: 0 };
  const take = (a: any) => {
    if (a?.kind !== "pay") return;
    out.hope += Number(a.amount?.hope) || 0;
    out.stress += Number(a.amount?.stress) || 0;
    out.fear += Number(a.amount?.fear) || 0;
    out.armor += Number(a.amount?.armorSlots) || 0;
  };
  for (const a of actions ?? []) {
    take(a);
    for (const step of a?.steps ?? []) take(step);
  }
  return out;
}

/** "3 Hope · 1 Stress", or nothing at all — which is most of them. */
export const priceLabel = (p: Price): string | undefined =>
  [
    p.hope && `${p.hope} Hope`,
    p.stress && `${p.stress} Stress`,
    p.armor && `${p.armor} Armor`,
    p.fear && `${p.fear} Fear`,
  ]
    .filter(Boolean)
    .join(" · ") || undefined;

/**
 * The Hope action's own price, off its authored actions rather than assumed.
 *
 * Almost every Hope feature in the book opens "Spend 3 Hope to …", and the few
 * that do not say a different number in the same sentence — so the sheet
 * charges what the card says instead of what the common case says, which
 * matters exactly once per campaign on the one class that is different.
 *
 * This one keeps a **default** where {@link authoredPrice} returns zero,
 * and that is the one place in this file where silence is not the answer: a
 * Hope feature is definitionally bought, so a price nobody has authored is a
 * price nobody has authored rather than a feature that is free.
 */
export function hopeCost(feature: any): number {
  const n = authoredPrice(feature?.actions).hope;
  return n > 0 ? n : HOPE_ACTION_COST;
}

/**
 * The Hope action as a card, for the chat log.
 *
 * Built from the *class* Item, so it wears the class's two domains in its
 * corners and the class mark on its plate — the same treatment every other
 * feature off that class gets, because it is the same class saying it.
 *
 * `id` is the class's, which means the posted card is still traceable back to
 * the Item it came from even though the action is not an Item.
 */
export const hopeCard = (cls: ItemSnapshot, sig: Sigils): CardOptions | null =>
  featureCard(sig, {
    item: cls,
    feature: cls.system?.hopeFeature,
    slot: "hope",
    type: "HOPE FEATURE",
    foot: cls.name,
    domains: cls.system?.domains,
    className: cls.name,
    stats: [{ k: "Cost", v: `${hopeCost(cls.system?.hopeFeature)} Hope` }],
  });

/** `cardOf` over a list, dropping the subtypes that have no card. */
export const cardsOf = (
  items: ItemSnapshot[],
  sig: Sigils,
  ctx: CardContext = {},
): CardOptions[] => items.map((i) => cardOf(i, sig, ctx)).filter(Boolean) as CardOptions[];
