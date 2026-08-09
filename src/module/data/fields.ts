/**
 * Thin wrappers over `foundry.data.fields` so schema definitions read as
 * schemas rather than as constructor calls. Foundry's field classes are
 * untyped here (see foundry-shim.d.ts); these return `any` and are consumed
 * only inside DataModel schemas.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  DIE_MODES,
  DIE_ON_REFRESH,
  RESOURCE_MAX,
  RESOURCE_ON_REFRESH,
  RESOURCE_REFRESH,
  RESOURCE_TRAITS,
} from "../config.ts";
/* The one place this module reaches into `src/packs-src/`. It is content and
   it is authored as `.mjs`, so there is nothing for `tsc` to resolve — see
   `fillCardDamage` for why the table has to be readable at runtime at all. */
// @ts-expect-error - content module, deliberately untyped
import CARD_DAMAGE from "../../packs-src/card-damage.mjs";

const F = () => foundry.data.fields;

export const int = (initial = 0, opts: Record<string, unknown> = {}): any =>
  new (F().NumberField)({ required: true, nullable: false, integer: true, initial, ...opts });

export const num = (initial = 0, opts: Record<string, unknown> = {}): any =>
  new (F().NumberField)({ required: true, nullable: false, initial, ...opts });

export const str = (initial = "", opts: Record<string, unknown> = {}): any =>
  new (F().StringField)({ required: true, blank: true, initial, ...opts });

export const choice = (
  choices: readonly string[],
  initial: string,
  opts: Record<string, unknown> = {},
): any =>
  new (F().StringField)({ required: true, blank: false, choices: [...choices], initial, ...opts });

/** A choice that is allowed to be unset — an unassigned domain, an empty slot. */
export const maybeChoice = (choices: readonly string[], opts: Record<string, unknown> = {}): any =>
  new (F().StringField)({ required: true, blank: true, choices: ["", ...choices], initial: "", ...opts });

export const bool = (initial = false): any => new (F().BooleanField)({ required: true, initial });

export const html = (initial = ""): any =>
  new (F().HTMLField)({ required: true, blank: true, initial });

export const schema = (fields: Record<string, any>, opts: Record<string, unknown> = {}): any =>
  new (F().SchemaField)(fields, opts);

export const arr = (element: any, opts: Record<string, unknown> = {}): any =>
  new (F().ArrayField)(element, opts);

export const uuid = (): any =>
  new (F().DocumentUUIDField)({ required: true, nullable: true, initial: null });

/**
 * A free-form record.
 *
 * Used where the *keys* are the data — advancement marks are keyed by
 * `tier.option`, and declaring a SchemaField per option would bake the
 * rules table into the schema, so adding a row to it would need a migration
 * to store what the player had already chosen.
 */
export const obj = (initial: Record<string, unknown> = {}): any =>
  new (F().ObjectField)({ required: true, initial });

/* ── shared shapes ───────────────────────────────────────────────────── */

/**
 * A track you mark rather than spend down: Hit Points, Stress, Armor Slots.
 * `marked` is what the sheet writes, because that is what a player does —
 * they cross a box. `value` is derived as `max - marked` purely so Foundry's
 * token bars, which assume a resource counts *down*, read the right way.
 */
export const markTrack = (max = 6): any =>
  schema({
    marked: int(0, { min: 0 }),
    max: int(max, { min: 0 }),
  });

/**
 * How a picture is placed inside a frame it does not fit.
 *
 * `x` and `y` are percentages of the frame, not of the image, so a framing
 * survives the window being resized — and they are unbounded on purpose:
 * pushing the subject past an edge is a thing people do, and a clamp here
 * would be this file deciding what a good crop looks like.
 *
 * `scale` has a floor rather than starting at one. Below 1 the picture sits
 * *inside* the frame with the panel's own colour around it, which is right
 * for a full-body drawing and wrong to forbid; the floor only stops it
 * being dragged down to nothing you could grab again.
 */
export const frame = (): any =>
  schema({
    x: num(0),
    y: num(0),
    scale: num(1, { min: 0.1, max: 8 }),
  });

/** A pool you spend from and gain into: Hope, and Fear on the GM side. */
export const pool = (max = 6): any =>
  schema({
    value: int(0, { min: 0 }),
    max: int(max, { min: 0 }),
  });

/**
 * An Experience: a phrase and the bonus it grants. `marked` is the level-up
 * bookkeeping — an Experience raised this tier cannot be raised again until
 * the next one.
 */
export const experienceField = (): any =>
  schema({
    name: str(),
    modifier: int(2),
    marked: bool(false),
  });

/**
 * A passive rule that changes a number on its owning character.
 *
 * These are authored data, never parsed out of rules prose at runtime. `source`
 * names the actor value multiplied by `scale`; `value` is then added. Most
 * modifiers are simply `{target, value}`. The wider shape covers rules such as
 * “thresholds equal to your Proficiency” and “half your Agility” without a
 * bespoke field for every printed card.
 */
export const modifierField = (): any =>
  schema({
    target: str(),
    value: num(0),
    source: str("fixed"),
    trait: str(),
    scale: num(1),
    condition: str("always"),
    minimum: int(0, { min: 0 }),
  });

/**
 * A named block of rules text. Ancestries, communities, classes, subclasses
 * and stat blocks are all mostly made of these, and none of them are worth
 * being their own document.
 */
export const featureField = (): any =>
  schema({
    name: str(),
    description: html(),
    modifiers: arr(modifierField()),
  });

/**
 * Where a card was printed, and who painted it.
 *
 * Only the four subtypes that exist as a physical card carry this — ancestry,
 * community, subclass and domain card. It is not decoration: we ship the
 * publisher's header art with the compendium, and art you ship is art you
 * credit. `code` is the number printed in the card's own footer ("DH106"),
 * which until now the design filled with a hardcoded placeholder.
 */
export const printingField = (): any =>
  schema({
    artist: str(),
    code: str(),
  });

/**
 * A number a card asks you to keep.
 *
 * See `RESOURCE_MAX` and friends in `config.ts` for what the members mean and
 * why each set is closed. Four things about the shape here.
 *
 * **`max` is a source, not an integer.** "Place a number of tokens equal to
 * your Spellcast trait" is a ceiling that moves when you multiclass, level or
 * change subclass, and a compendium entry cannot know it — the card is the
 * same card for every character who holds it. So the entry states where the
 * number comes from and the actor resolves it.
 *
 * **`floor` is not a minimum the schema invents.** Flight prints "(minimum
 * 1)" because Agility can be −1 at level 1, so a trait-sourced ceiling can
 * legitimately be negative and the card says what to do about it. It is the
 * card's own parenthesis and nothing else sets it.
 *
 * **`feature` binds this to one rule on a document that has several.** The
 * Hedge's Foundation card prints Herbal Remedies and Enchanted Talisman, and
 * only the second one takes tokens. The Features panel draws a row per rule,
 * so a resource that could not name its rule would have to be drawn on all of
 * them or on none. Blank means the document itself, which is the common case.
 *
 * **`onEmpty` is authored prose, printed verbatim.** The Vampire's Feed says
 * what happens when the pile runs out and that is the whole bargain of the
 * card; it is stored as a sentence rather than as a mechanism because this
 * system parses English rules text in exactly one place and this is not it.
 */
export const resourceField = (): any =>
  schema({
    name: str("Tokens"),
    value: int(0, { min: 0 }),
    max: schema({
      kind: choice(RESOURCE_MAX, "fixed"),
      /** The ceiling when `kind` is `fixed`; ignored otherwise. */
      n: int(1, { min: 0 }),
      /** Which trait, when `kind` is `trait`. `spellcast` points at one of six. */
      trait: maybeChoice(RESOURCE_TRAITS),
      /** The card's own printed minimum, when it prints one. */
      floor: int(0),
    }),
    refresh: choice(RESOURCE_REFRESH, "manual"),
    onRefresh: choice(RESOURCE_ON_REFRESH, "fill"),
    /** The `name` of the feature block this belongs to. Blank = the document. */
    feature: str(),
    /** What the card says happens at zero. */
    onEmpty: str(),
  });

/**
 * Dice a card asks you to keep.
 *
 * A resource counts; this counts *and says what each one is showing*. See
 * `DIE_MODES` in `config.ts` for why there are three modes and
 * `design/keep.js` for the object they draw.
 *
 * **`dice` is a list of faces, and `0` is a die with no face.** Slayer Dice
 * and the Sigil's d8s are placed and rolled later, so a die genuinely can be
 * on the card without showing anything; the array's *length* is the count,
 * which is why this is not a number and a flag. A `climb` pool holds at most
 * one, and an empty array is the effect not running rather than a die at
 * zero — the same distinction `open` draws for a ceiling.
 *
 * **`max` is the resource's own block, reused verbatim.** A ceiling is a
 * ceiling and both fields want the same sources: the Slayer stores dice
 * equal to their Proficiency and the Sigil holds d8s equal to their level.
 * Sharing the shape is what lets `resourceMax` serve both, so a new source
 * added for one is available to the other by construction.
 *
 * **`faces` is a plain number and `grow` is the prose that moves it.** The
 * Rally Die becomes a d8 at level 5 and a d10 at Wordsmith Mastery; the
 * Unstoppable Die becomes a d6 at level 5; the Combo Die grows by an
 * *advancement option*. Those triggers live on three different documents and
 * two of them are cards this Item has never heard of, so the size is a
 * number the table sets and `grow` is the card's own sentence printed
 * beside it. This system parses English rules text in exactly one place and
 * this is not going to be the second.
 */
export const diePoolField = (): any =>
  schema({
    name: str("Dice"),
    mode: choice(DIE_MODES, "bag"),
    /** The die's size, now. 4, 6, 8, 10 or 12. */
    faces: int(6, { min: 2 }),
    /** The faces currently on the card. 0 is placed and not yet rolled. */
    dice: arr(int(0, { min: 0 })),
    max: schema({
      kind: choice(RESOURCE_MAX, "fixed"),
      n: int(1, { min: 0 }),
      trait: maybeChoice(RESOURCE_TRAITS),
      floor: int(0),
    }),
    refresh: choice(RESOURCE_REFRESH, "manual"),
    onRefresh: choice(DIE_ON_REFRESH, "clear"),
    /** The `name` of the feature block this belongs to. Blank = the document. */
    feature: str(),
    /** The card's own sentence about when the die grows. Printed, never read. */
    grow: str(),
    /** What the card says happens when the tray empties or the die tops out. */
    onEmpty: str(),
  });

/**
 * `uses` was a `pool` on domain cards and features, and it is now one member
 * of `resources`.
 *
 * Shared by both `migrateData` implementations rather than written twice. It
 * is deliberately generous about what it will convert and silent when there
 * is nothing to convert: no compendium entry ever authored a `uses` pool, so
 * in practice this fires only for a homebrew card somebody filled in by hand,
 * and that is precisely the data that would otherwise vanish without anyone
 * being told.
 *
 * The old pool had no refresh scope, and `refreshUses` refilled it on either
 * kind of rest — so `rest` is not a guess about what the author meant, it is
 * what the field actually did.
 */
export const migrateUses = (source: any): void => {
  const u = source?.uses;
  if (!u) return;
  delete source.uses;
  if (!(u.max > 0) || source.resources?.length) return;
  source.resources = [
    {
      name: "Uses",
      value: u.value ?? u.max,
      max: { kind: "fixed", n: u.max, trait: "", floor: 0 },
      refresh: "rest",
      onRefresh: "fill",
      feature: "",
      onEmpty: "",
    },
  ];
};

/**
 * Damage as the stat blocks print it: `2d6+3 phy`.
 *
 * Two of the members are here for damage printed on a *card* rather than on a
 * weapon or a stat block, and both exist because the corpus has cards the
 * other five cannot describe.
 *
 * **`proficiency` is the difference between a card that scales and one that
 * does not.** Sixteen of the seventy-seven entries that print their own dice
 * say "using your Proficiency" and sixty-one do not, and the two are not
 * interchangeable — it is the rule the marked decks were measured against: a
 * card you can cast again for nothing scales with Proficiency, and a card
 * dealing flat dice is gated behind a Hope, a Stress or a rest. So it is a
 * flag rather than a number, because the multiplier belongs to the character
 * and not to the card. The weapon path has always rolled Proficiency copies
 * of `count`; this is what lets a card ask for the same treatment or decline
 * it.
 *
 * **`name` is which mode.** A card can print several expressions — Tempest
 * prints Sandstorm and two siblings, each with its own dice — and a button
 * offering "Roll damage" three times has said nothing about which is which.
 * Blank is the common case and the only case for a weapon or a stat block,
 * both of which print exactly one.
 *
 * **`extra` is the second die *size* in one expression, and it is not the
 * Versatile problem wearing a different hat.** Versatile prints a whole
 * alternate stat line — its own trait, range and die — and asks which one you
 * are swinging; that is still a list of stat lines this schema does not hold.
 * This is one stat line whose printed dice are not all the same shape. The
 * Brawler's Strike deals `d8+d6` and both halves scale off Proficiency, so it
 * is a single expression with two groups in it, rolled together, applied
 * together, and never chosen between.
 *
 * A list rather than one more pair of fields, because two is the count the
 * corpus happens to print and not a rule anybody wrote down — and because a
 * `dice2` that is blank on three hundred and fifty-eight documents is a field
 * every reader has to test before it can be trusted. An empty array is the
 * common case and needs no test at all.
 *
 * It inherits `proficiency` rather than restating it. "Both the d8 and the d6
 * scale off your Proficiency" is one claim about the expression; a group that
 * could opt out would be inventing a printed form nobody has.
 */
export const damageField = (dice = "d6", count = 1, bonus = 0): any =>
  schema({
    /** Which printed mode this is. Blank = the document has only one. */
    name: str(),
    count: int(count, { min: 0 }),
    dice: str(dice),
    bonus: int(bonus),
    /** Further die groups in the *same* expression — see above. */
    extra: arr(schema({ count: int(1, { min: 0 }), dice: str("d6") })),
    /** Roll Proficiency copies of `count` rather than `count` flat. */
    proficiency: bool(false),
    type: str("physical"),
    direct: bool(false),
  });

/**
 * Damage a card prints, arriving on a card somebody is already holding.
 *
 * `src/packs-src/card-damage.mjs` is the reading — one entry per printed
 * expression, keyed `type:name` — and rebuilding the packs puts it on every
 * future drag and on none of the copies already sitting in a loadout. That is
 * `ClassData.migrateData`'s argument unchanged: the card on a character sheet
 * is an *embedded copy* made when it was dragged in.
 *
 * It is **not** a `migrateData`, and that is a finding rather than a taste.
 * Foundry hands `migrateData` the `system` object and nothing else —
 * `migrateDataSafe` takes `(source, options)` and drops the cleaning state
 * before it calls, so the document's own `name` and `type` are not reachable
 * from there — and a table keyed by name cannot be read without them.
 * `prepareBaseData` is the documented place that can, via `this.parent`, so
 * the fill is a preparation step instead: it runs on every construction,
 * embedded or compendium, exactly where a migration would have, and stores
 * nothing.
 *
 * Storing nothing is what makes the guard matter, in both directions. A
 * non-empty array is *somebody's own* — a homebrew card a GM filled in by hand
 * — and an annotation about a card of the same name must never win over it.
 * The cost of the same rule read backwards is that an array somebody emptied
 * is indistinguishable from one that was never filled, so the annotation comes
 * back. Renaming the card is what says "this is not that card", which is the
 * answer `build-packs.mjs` already gives about a stable `_id`.
 *
 * Entries are copied rather than shared, and completed against the schema's
 * own defaults: two characters holding the same card must not hold the same
 * object, and a consumer reading `proficiency` off an annotation that did not
 * bother to state it should read `false` rather than `undefined`.
 */
export const fillCardDamage = (system: any, type?: string, name?: string): void => {
  if (!type || !name || system?.cardDamage?.length) return;
  /* Optional on the table itself, not on the lookup: this runs on the
     construction of every Item in the world, so a malformed content module
     must fail as a card with no damage rather than as a world that will not
     open. */
  const printed = (CARD_DAMAGE as Record<string, any[]> | undefined)?.[`${type}:${name}`];
  if (!printed?.length) return;
  system.cardDamage = printed.map((d: any) => ({
    name: "",
    count: 1,
    dice: "d6",
    bonus: 0,
    extra: [],
    proficiency: false,
    type: "physical",
    direct: false,
    ...d,
  }));
};
