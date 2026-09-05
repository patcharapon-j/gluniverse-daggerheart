/**
 * What the compendium browser browses.
 *
 * Three things live here and the window draws them: the **kinds**, which are
 * the subtypes a pack can hold and the one question this window asks before it
 * can ask anything else; the **axes**, which are the filters a kind offers; and
 * the **index**, which is every document in every mounted Daggerheart pack read
 * once and kept.
 *
 * ── why an axis is a closed set and never a tag ────────────────────────
 * Every filter in here is one of `config.ts`'s closed sets — domain, tier,
 * level, trait, range, burden, card type, adversary role — plus two derived
 * ones that are closed by arithmetic rather than by declaration (Recall Cost is
 * 0–4 because that is what is printed, subclass rank is the three cards you
 * acquire). Nothing is harvested from the corpus.
 *
 * That is a deliberate refusal rather than an omission. A filter built by
 * sweeping the values that happen to be present describes *this world's packs*
 * and changes shape when a module is installed, so a chip can appear, be
 * pressed, and vanish on the next load; and it cannot say that a value exists
 * and is empty, which is the whole of what `dlg.css`'s dead-not-hidden rule is
 * for. A closed set is the system's own claim about what the axis can be, and
 * that claim is either true or a bug worth having.
 *
 * ── why the whole document and not the index ──────────────────────────
 * `pack.getIndex({fields})` is cheaper and was the obvious reach. It is also
 * a promise about which paths a caller will want, and this window wants
 * `system` entire — every axis reads one field, the search reads the rules
 * text, and the card grid hands the whole thing to `cardOf`. So it is
 * `getDocuments`, which is what `fromPack` in `creation.ts` already does for
 * four of these packs at once, and it is paid once per pack per session.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ADVERSARY_TYPES,
  ADVERSARY_TYPE_LABELS,
  BURDENS,
  BURDEN_LABELS,
  CARD_TYPES,
  CARD_TYPE_LABELS,
  DAMAGE_TYPES,
  DAMAGE_TYPE_LABELS,
  DOMAINS,
  DOMAIN_CONFIG,
  ENVIRONMENT_TYPES,
  ENVIRONMENT_TYPE_LABELS,
  FEATURE_KINDS,
  FEATURE_KIND_LABELS,
  MAX_LEVEL,
  RANGES,
  RANGE_LABELS,
  SYSTEM_ID,
  TRAITS,
  TRAIT_LABELS,
  WEAPON_SLOTS,
} from "../config.ts";
import { contentPackAllowed, gunslingerEnabled } from "../gunslinger.ts";
import { activeVariants } from "../variants.ts";
import { SUBCLASS_RANKS } from "../data/items.ts";
import { plain } from "../sheets/cards.ts";

/* ══════════════════════════════════════════════════════════════════════
   AN ENTRY

   One document, flattened to what the window needs. The document itself
   rides along as `doc`, because a click opens its sheet and a drag hands
   Foundry its uuid, and re-fetching it for either would be asking the pack
   for something we are already holding.
   ══════════════════════════════════════════════════════════════════════ */

export interface Entry {
  uuid: string;
  id: string;
  name: string;
  img: string;
  /** The subtype — `domainCard`, `weapon`, `adversary`. */
  type: string;
  /** `Item` or `Actor`, which is what a drag payload has to say. */
  docName: string;
  /** Pack id, and the label a human reads. */
  pack: string;
  packLabel: string;
  system: any;
  /** The pack's own order, which for the domain deck is deck order. */
  sort: number;
  /**
   * Everything printed on it, lowercased, for the search — built on the
   * first search that asks and kept afterwards.
   *
   * Lazily, because it is the one field on an entry that costs anything: it
   * walks a dozen paths and runs `plain` over each, which is ten regex passes
   * a string, and building it eagerly means paying for a thousand documents'
   * rules text to open a window most of whose visits never type a word. The
   * search is the only reader, and the first keystroke pays for exactly what
   * it needs.
   */
  hay?: string;
  doc: any;
}

/* ══════════════════════════════════════════════════════════════════════
   THE KINDS

   Ordered the way somebody looking for something would look for it: the
   things a character is made of, then the things a character carries, then
   the things on the other side of the screen. Not alphabetical, and not
   `ITEM_TYPES` order, which is the schema's.

   `shape` is the claim this window makes about the subtype, and it is the
   creation window's argument arriving with nothing to choose. `cards` is for
   a thing that is genuinely *printed as a card*, because a text summary of
   one lies by omission about the domain (which is the hue and the corner
   sigils) and the level and Recall Cost (which are the corner blocks). Every
   other kind is a table, because what you compare across two hundred of them
   is columns of the same facts.

   `feature` is a table and not a card, and that is `cardOf` returning null
   for the subtype: a feature has never had a card in this system, which is
   why the character sheet draws it as a pressable row of rules text.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * `b`-prefixed because a shape is also a CSS class on the table, and
 * `browse.css` names everything `b` for the reason `make.css` names everything
 * `f`: `.ftr` is already the creation window's own table row, both load into
 * the same `.dh` root where scoping does nothing, and the collision that
 * renamed `.die.win` has been paid for four times.
 */
export type Shape = "cards" | "bwpn" | "barm" | "bcon" | "bfea" | "badv" | "benv";

export interface Kind {
  id: string;
  /** The subtype as the document stores it. */
  type: string;
  docName: "Item" | "Actor";
  label: string;
  shape: Shape;
}

export const KINDS: Kind[] = [
  { id: "domainCard", type: "domainCard", docName: "Item", label: "Domain cards", shape: "cards" },
  { id: "class", type: "class", docName: "Item", label: "Classes", shape: "cards" },
  { id: "subclass", type: "subclass", docName: "Item", label: "Subclasses", shape: "cards" },
  { id: "ancestry", type: "ancestry", docName: "Item", label: "Ancestries", shape: "cards" },
  { id: "community", type: "community", docName: "Item", label: "Communities", shape: "cards" },
  {
    id: "transformation",
    type: "transformation",
    docName: "Item",
    label: "Transformations",
    shape: "cards",
  },
  { id: "weapon", type: "weapon", docName: "Item", label: "Weapons", shape: "bwpn" },
  { id: "armor", type: "armor", docName: "Item", label: "Armor", shape: "barm" },
  { id: "consumable", type: "consumable", docName: "Item", label: "Consumables", shape: "bcon" },
  { id: "loot", type: "loot", docName: "Item", label: "Loot", shape: "bcon" },
  { id: "feature", type: "feature", docName: "Item", label: "Features", shape: "bfea" },
  { id: "adversary", type: "adversary", docName: "Actor", label: "Adversaries", shape: "badv" },
  { id: "environment", type: "environment", docName: "Actor", label: "Environments", shape: "benv" },
];

export const kindOf = (id: string): Kind => KINDS.find((k) => k.id === id) ?? KINDS[0]!;

/* ══════════════════════════════════════════════════════════════════════
   THE AXES

   An axis is a closed set and a way of asking an entry which of its values
   it has. `read` returns a list rather than a value because two axes are
   genuinely multi-valued — a class carries two domains, and a weapon's
   feature may be worth filtering on under more than one word — and a reader
   that returned a scalar would have to be special-cased at both of them.

   Within an axis the selected values are OR and across axes they are AND,
   which is the only combination anybody means: "Grace or Midnight, at level
   1 or 2" is one question and "Grace and Midnight" is not a card.
   ══════════════════════════════════════════════════════════════════════ */

export interface AxisValue {
  v: string;
  label: string;
  /** A domain's own colour, for the pip. Nothing else sets it. */
  hue?: string;
}

export interface Axis {
  id: string;
  label: string;
  values: AxisValue[];
  read(e: Entry): string[];
}

/** A closed set of strings with a label map, in the set's own order. */
const setAxis = (
  id: string,
  label: string,
  keys: readonly string[],
  labels: Record<string, string>,
  read: (s: any) => any,
): Axis => ({
  id,
  label,
  values: keys.map((v) => ({ v, label: labels[v] ?? v })),
  read: (e) => {
    const v = read(e.system);
    return v == null || v === "" ? [] : [String(v)];
  },
});

/** A closed run of integers — level 1–10, tier 1–4, Recall Cost 0–4. */
const rangeAxis = (
  id: string,
  label: string,
  from: number,
  to: number,
  read: (s: any) => any,
  fmt: (n: number) => string = String,
): Axis => ({
  id,
  label,
  values: Array.from({ length: to - from + 1 }, (_, i) => ({
    v: String(from + i),
    label: fmt(from + i),
  })),
  read: (e) => {
    const v = read(e.system);
    return v == null ? [] : [String(Number(v))];
  },
});

const domainAxis = (read: (s: any) => any[]): Axis => ({
  id: "domain",
  label: "Domain",
  values: DOMAINS.filter(d => d !== "artifice" || gunslingerEnabled()).map((d) => ({
    v: d,
    label: DOMAIN_CONFIG[d]?.label ?? d,
    hue: DOMAIN_CONFIG[d]?.light,
  })),
  read: (e) => read(e.system).filter(Boolean).map(String),
});

const TIER = (read: (s: any) => any = (s) => s.tier) =>
  rangeAxis("tier", "Tier", 1, 4, read, (n) => `Tier ${n}`);

/**
 * Whether a weapon or a piece of armour is magic.
 *
 * Two values rather than a toggle, and that is not pedantry: a toggle can say
 * "magic only" and has no way to say "physical only", so the moment you want
 * the other half you are asked to invert a control that does not invert. The
 * book prints two tables per tier for exactly this reason.
 */
const magicAxis: Axis = {
  id: "magical",
  label: "Make",
  values: [
    { v: "false", label: "Physical" },
    { v: "true", label: "Magic" },
  ],
  read: (e) => [String(!!e.system?.magical)],
};

export function axesFor(kind: string): Axis[] {
  switch (kind) {
    case "domainCard":
      return [
        domainAxis((s) => [s.domain]),
        rangeAxis("level", "Level", 1, MAX_LEVEL, (s) => s.level),
        rangeAxis("recallCost", "Recall cost", 0, 4, (s) => s.recallCost),
        setAxis("cardType", "Card type", CARD_TYPES, CARD_TYPE_LABELS, (s) => s.cardType),
      ];

    /* A class has two domains and the axis takes both, so asking for Bone
       finds the Ranger and the Warrior — which is what somebody asking a
       class list about a domain means. */
    case "class":
      return [domainAxis((s) => [s.domains?.primary, s.domains?.secondary])];

    /* A subclass's domains belong to its class and the card resolves them by
       name, so the axis a subclass has of its own is the two facts printed on
       it: which of the three cards this is, and what it casts with. */
    case "subclass":
      return [
        setAxis(
          "rank",
          "Card",
          SUBCLASS_RANKS,
          { foundation: "Foundation", specialization: "Specialization", mastery: "Mastery" },
          (s) => s.rank,
        ),
        {
          ...setAxis("spellcastTrait", "Spellcast", TRAITS, TRAIT_LABELS, (s) => s.spellcastTrait),
          /* "Casts nothing" is a real answer and a great many subclasses give
             it, so it is a value rather than the absence of one. */
          values: [
            ...TRAITS.map((t) => ({ v: t, label: TRAIT_LABELS[t] ?? t })),
            { v: "", label: "None" },
          ],
          read: (e: Entry) => [String(e.system?.spellcastTrait ?? "")],
        },
      ];

    case "weapon":
      return [
        TIER(),
        setAxis("slot", "Slot", WEAPON_SLOTS, { primary: "Primary", secondary: "Secondary" }, (s) => s.slot),
        magicAxis,
        setAxis("trait", "Trait", TRAITS, TRAIT_LABELS, (s) => s.trait),
        setAxis("range", "Range", RANGES, RANGE_LABELS, (s) => s.range),
        setAxis("burden", "Burden", BURDENS, BURDEN_LABELS, (s) => s.burden),
        setAxis(
          "damageType",
          "Damage",
          DAMAGE_TYPES,
          DAMAGE_TYPE_LABELS,
          (s) => s.damage?.type,
        ),
      ];

    case "armor":
      return [TIER(), magicAxis];

    case "feature":
      return [setAxis("kind", "Kind", FEATURE_KINDS, FEATURE_KIND_LABELS, (s) => s.kind)];

    case "adversary":
      return [
        TIER(),
        setAxis("role", "Role", ADVERSARY_TYPES, ADVERSARY_TYPE_LABELS, (s) => s.role),
      ];

    case "environment":
      return [
        TIER(),
        setAxis("kind", "Kind", ENVIRONMENT_TYPES, ENVIRONMENT_TYPE_LABELS, (s) => s.kind),
      ];

    /* Ancestry, community, transformation, consumable and loot. Each is a
       flat list of things distinguished only by what they say, and inventing
       an axis for one would be a filter over somebody's typing. The search
       field is the honest answer there. */
    default:
      return [];
  }
}

/* ══════════════════════════════════════════════════════════════════════
   SORTING

   Every kind gets its pack order first, because for the one collection where
   order is a fact somebody decided — the domain deck — the pack is in it.
   Name is always offered. A kind with a number worth ordering by offers that
   number, and no kind offers a sort over a field it does not have.
   ══════════════════════════════════════════════════════════════════════ */

export interface Sort {
  id: string;
  label: string;
  cmp(a: Entry, b: Entry): number;
}

const byName = (a: Entry, b: Entry) => a.name.localeCompare(b.name);

const numeric = (id: string, label: string, read: (s: any) => any): Sort => ({
  id,
  label,
  cmp: (a, b) => (Number(read(a.system) ?? 0) - Number(read(b.system) ?? 0)) || byName(a, b),
});

export function sortsFor(kind: string): Sort[] {
  const packOrder: Sort = {
    id: "pack",
    label: "Pack order",
    cmp: (a, b) => a.sort - b.sort || byName(a, b),
  };
  const name: Sort = { id: "name", label: "Name", cmp: byName };

  switch (kind) {
    case "domainCard":
      return [packOrder, name, numeric("level", "Level", (s) => s.level),
        numeric("recallCost", "Recall cost", (s) => s.recallCost)];
    case "weapon":
    case "armor":
    case "adversary":
    case "environment":
      return [packOrder, name, numeric("tier", "Tier", (s) => s.tier)];
    default:
      return [packOrder, name];
  }
}

/* ══════════════════════════════════════════════════════════════════════
   READING THE PACKS

   Every mounted pack whose documents are ours, which is deliberately wider
   than the six this system ships. A world with a homebrew domain pack or a
   third-party bestiary installed has those documents in the same collection
   the sheet drags from, and a browser that showed only our own would be a
   browser that is wrong about what is available — the one thing it exists to
   answer.

   `system` on the pack metadata is what says a pack is ours. A pack of the
   right document type belonging to another system holds documents whose
   `system` object means something else entirely, and reading a `tier` off one
   is reading a coincidence.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * One promise per pack, kept for the session.
 *
 * Reading six packs is about six hundred documents and a real wait; reopening
 * the window is a thing people do several times an evening. The cache is
 * dropped per pack when something in it changes, which is the only way it can
 * go stale — a GM editing a compendium document, or unlocking a pack and
 * importing into it.
 */
const cache = new Map<string, Promise<Entry[]>>();

export function dropPack(pack?: string): void {
  if (pack) cache.delete(pack);
  else cache.clear();
}

/**
 * The one pack this window reads conditionally, and the reason it is by name.
 *
 * `variants` holds the supplemental campaign chapter's gear — 36 Everyday
 * Hero documents alone — and a table not running any of it should not meet a
 * Pitchfork while searching tier-1 primaries. That is a claim about *this
 * pack* rather than about a property its documents carry, so it is matched on
 * the pack's own name: a document has no field saying which optional chapter
 * printed it, and inventing one would put it on all 633 equipment documents
 * to serve 60.
 *
 * A world compendium of somebody's own is unaffected — this only ever
 * suppresses the pack this system ships.
 */
const VARIANT_PACK = `${SYSTEM_ID}.variants`;

/**
 * Packs this window is willing to read.
 *
 * Deliberately wider than the eight this system ships: a world with a
 * homebrew domain pack has those cards in the collection the sheet drags
 * from, and a browser that showed only ours would be wrong about the one
 * thing it exists to answer. `metadata.system` is what says a pack is ours.
 *
 * The variant gear is the single exception, and it is a **content gate rather
 * than a permission**: nothing is hidden from anybody, the pack is still in
 * the compendium sidebar, and a GM who wants a Pitchfork can open it. What
 * the switch buys is that a search for "axe" in a game nobody switched a
 * variant on for answers with the axes that game has.
 */
export function ourPacks(): any[] {
  const variants = activeVariants().length > 0;
  return [...(game.packs ?? [])].filter(
    (p: any) =>
      p.metadata?.system === SYSTEM_ID &&
      contentPackAllowed(p.collection) &&
      (p.metadata?.type === "Item" || p.metadata?.type === "Actor") &&
      (variants || p.collection !== VARIANT_PACK),
  );
}

/**
 * Everything printed on a document, lowercased.
 *
 * Rules text is in it and that is the point: a domain card's identity is its
 * paragraph, and a search that read names alone could not find "the one that
 * lets me reroll a damage die". `plain` is the same stripper the card builder
 * uses, so what is searched is what is printed rather than the markup around
 * it.
 *
 * Feature blocks are walked because five of the nine classes print more than
 * one, and an ancestry's two features are the whole of what distinguishes it.
 */
function haystackOf(doc: any): string {
  const s = doc.system ?? {};
  const bits: string[] = [doc.name ?? ""];

  const say = (v: any): void => {
    if (!v) return;
    if (typeof v === "string") bits.push(plain(v));
    else if (Array.isArray(v)) v.forEach(say);
    else if (typeof v === "object") {
      if (v.name) bits.push(String(v.name));
      if (v.description) bits.push(plain(String(v.description)));
    }
  };

  say(s.description);
  say(s.flavor);
  say(s.motives);
  say(s.impulses);
  say(s.notes);
  say(s.feature);
  say(s.features);
  say(s.classFeatures);
  say(s.hopeFeature);
  say(s.topFeature);
  say(s.bottomFeature);
  say(s.subclassName);
  say(s.className);
  say(s.source);

  return bits.join(" • ").toLowerCase();
}

async function readPack(pack: any): Promise<Entry[]> {
  const docs = await pack.getDocuments();
  const label = pack.metadata?.label ?? pack.title ?? pack.collection;
  return docs.map(
    (d: any, i: number): Entry => ({
      uuid: d.uuid,
      id: d.id,
      name: d.name,
      img: d.img,
      type: d.type,
      docName: pack.metadata?.type ?? d.documentName,
      pack: pack.collection,
      packLabel: label,
      system: d.system,
      /* `sort` is zero on every compendium document this system builds — the
         packs are written in order and `build-packs.mjs` never sets it — so
         the pack's own iteration order is the order, and the index is what
         records it. Falling back the other way would put the domain deck in
         one undifferentiated heap. */
      sort: Number(d.sort) || i,
      doc: d,
    }),
  );
}

function readCached(p: any): Promise<Entry[]> {
  let job = cache.get(p.collection);
  if (!job) {
    /* A pack that throws is one pack missing, not an empty window. A module
       can ship a pack this build cannot read and the other five are still
       worth showing. */
    job = readPack(p).catch((err) => {
      console.error(`${SYSTEM_ID} | could not read ${p.collection}`, err);
      return [];
    });
    cache.set(p.collection, job);
  }
  return job;
}

/* ══════════════════════════════════════════════════════════════════════
   WHAT IS IN THERE, BEFORE READING ANY OF IT

   The first build read every mounted pack on open — about a thousand
   documents, every one of them constructed with its DataModel and its
   embedded documents prepared — and it did it before the window could draw
   a single thing, because the rail's counts needed all of it. In a real
   world that is not a wait, it is Foundry stopping.

   And it was never necessary, because Foundry has already read the part
   that answers the rail. A pack's **index** is in memory at world load and
   carries `_id`, `name`, `img` and `type` for every document in it — which
   is exactly the question the rail asks and no more. So the counts come
   from the index, the window opens on the frame it is asked for, and
   documents are read one subtype at a time when something is going to be
   drawn with them.

   That is also why the index cannot serve the rest of it: an index is a
   promise about which paths a caller will want, and every axis reads a
   `system` field, the search reads rules text and the grid hands the whole
   thing to `cardOf`. `indexFields` could be made to carry a few of those
   and never all of them. So the split is honest — the index answers *what
   is there*, and `getDocuments` answers *what it says*.
   ══════════════════════════════════════════════════════════════════════ */

export interface Survey {
  /** How many of each subtype exist across every mounted pack. */
  counts: Record<string, number>;
  /** Which packs hold a given subtype, so only those are ever read. */
  packs: Record<string, string[]>;
}

export async function survey(): Promise<Survey> {
  const packs = ourPacks();
  /* Only for a pack whose index has not been built. Foundry builds one at
     world load, so this is normally six no-ops — but it costs an index and
     never a document, and a rail that silently reported zero because a
     pack had not got round to it would be worse than the call. */
  await Promise.all(packs.map((p) => (p.index?.size ? null : p.getIndex())));

  const counts: Record<string, number> = {};
  const holders: Record<string, string[]> = {};
  for (const p of packs) {
    const seen = new Set<string>();
    for (const e of p.index ?? []) {
      const t = (e as any)?.type;
      if (!t) continue;
      counts[t] = (counts[t] ?? 0) + 1;
      if (!seen.has(t)) {
        seen.add(t);
        (holders[t] ??= []).push(p.collection);
      }
    }
  }
  return { counts, packs: holders };
}

/**
 * Read the packs that hold one subtype, and return that subtype.
 *
 * A pack is read whole and cached whole — the equipment pack holds weapons,
 * armour, consumables and loot, and reading it four times to serve four kinds
 * would be four copies of three hundred and fifty-eight documents. What is
 * *returned* is one kind, because that is what the caller is about to draw.
 */
export async function loadType(type: string, from: Survey): Promise<Entry[]> {
  const want = new Set(from.packs[type] ?? []);
  const lists = await Promise.all(
    ourPacks().filter((p) => want.has(p.collection)).map(readCached),
  );
  return lists.flat().filter((e) => e.type === type);
}

/** How many documents this kind is about to cost, for the loading line. */
export function pending(type: string, from: Survey): number {
  return ourPacks()
    .filter((p) => (from.packs[type] ?? []).includes(p.collection) && !cache.has(p.collection))
    .reduce((n, p) => n + (p.index?.size ?? 0), 0);
}

/* ══════════════════════════════════════════════════════════════════════
   NARROWING

   Search first, because it is the cheapest test and throws away the most.
   Every term must match, anywhere — "grace stress" finds the Grace cards
   that mention Stress, which is how anybody types a search and is not what a
   single-substring match does.
   ══════════════════════════════════════════════════════════════════════ */

export type Filters = Record<string, Set<string>>;

export const terms = (q: string): string[] =>
  q.toLowerCase().split(/\s+/).filter(Boolean);

export const matches = (e: Entry, ts: string[]): boolean => {
  const hay = (e.hay ??= haystackOf(e.doc));
  return ts.every((t) => hay.includes(t));
};

/** Does this entry satisfy every axis but `skip`? */
export function passes(e: Entry, axes: Axis[], filters: Filters, skip?: string): boolean {
  for (const axis of axes) {
    if (axis.id === skip) continue;
    const want = filters[axis.id];
    if (!want?.size) continue;
    const has = axis.read(e);
    if (!has.some((v) => want.has(v))) return false;
  }
  return true;
}

/**
 * What each chip would leave behind.
 *
 * Counted against every *other* axis, which is the only reading that answers
 * the question a chip raises. Counting against its own axis too would give
 * every unselected chip in a narrowed axis a zero — press Grace and the other
 * eight domains read 0, which says they are empty when what is true is that
 * you asked for Grace.
 */
export function countsFor(
  pool: Entry[],
  axes: Axis[],
  filters: Filters,
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const axis of axes) {
    const tally: Record<string, number> = {};
    for (const value of axis.values) tally[value.v] = 0;
    for (const e of pool) {
      if (!passes(e, axes, filters, axis.id)) continue;
      for (const v of axis.read(e)) if (v in tally) tally[v] = (tally[v] ?? 0) + 1;
    }
    out[axis.id] = tally;
  }
  return out;
}
