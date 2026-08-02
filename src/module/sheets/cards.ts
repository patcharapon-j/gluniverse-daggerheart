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
  rangeLabel,
  traitLabel,
} from "../config.ts";
import { cssUrl } from "../assets.ts";
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
  /** Armor slots marked, so an armor tile can print "3 / 4". */
  armorMarked?: number;
  armorSlots?: number;
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
}

const dom = (slug?: string) => (slug && byslug[slug]) || KINDS.gear;

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
  };

  switch (it.type) {
    /* A domain card is the shape everything else is a variation on: one
       paragraph, a level, and a recall cost. */
    case "domainCard":
      return {
        ...base,
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
        feats: feats([s.classFeature, s.hopeFeature]),
        // Flavour, not body text — and our nine classes carry none, so this
        // is `undefined` and the slot does not appear. It stays wired up
        // because a homebrew class may well want a line, and if it has one it
        // belongs in `.fl` rather than in `.tx` where it would read as a rule.
        // See the class flavour rule in `tools/check-cards.mjs`.
        flavour: plain(s.description) || undefined,
      };
    }

    case "subclass": {
      const p = ctx.domains?.primary;
      const q = ctx.domains?.secondary;
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
        // "Play the Troubadour if you want to play music to bolster your
        // allies" is advice about the subclass, not a rule of it — the same
        // slot an ancestry's one line of flavour takes, for the same reason.
        flavour: plain(s.description) || undefined,
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
          { k: "Damage", v: `${s.damage?.dice ?? "d6"}${s.damage?.bonus ? `+${s.damage.bonus}` : ""}` },
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

    default:
      return null;
  }
}

/** `cardOf` over a list, dropping the subtypes that have no card. */
export const cardsOf = (
  items: ItemSnapshot[],
  sig: Sigils,
  ctx: CardContext = {},
): CardOptions[] => items.map((i) => cardOf(i, sig, ctx)).filter(Boolean) as CardOptions[];
