/**
 * Item DataModels.
 *
 * Ten subtypes, in two families. Five of them are *cards* — ancestry,
 * community, class, subclass, domain card — and are drawn as cards because
 * that is what they are at the table. The rest are gear and features, drawn
 * as rows.
 *
 * Rules text is stored as blocks of `{name, description}` rather than as
 * child documents, because Foundry Items cannot nest and because none of
 * these blocks is ever referenced from anywhere except its own card.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  BURDENS,
  CARD_TYPES,
  DAMAGE_TYPES,
  DOMAINS,
  FEATURE_KINDS,
  MAX_LEVEL,
  RANGES,
  TRAITS,
  WEAPON_SLOTS,
} from "../config.ts";
import {
  arr,
  bool,
  choice,
  damageField,
  featureField,
  html,
  int,
  maybeChoice,
  migrateUses,
  modifierField,
  printingField,
  diePoolField,
  resourceField,
  schema,
  str,
} from "./fields.ts";

const TypeDataModel = () => foundry.abstract.TypeDataModel;

/**
 * Numbers this document asks you to keep — see `resourceField`.
 *
 * Spread into every subtype, and that breadth is a finding rather than
 * laziness. `uses` lived on domain cards and features on the assumption that
 * those were the two kinds of thing with a budget; a sweep of all four packs
 * found resource-bearing text on ten subtypes, including thirty pieces of
 * loot, twenty-three consumables and seven suits of armour. Dragonscale
 * Armor is once per short rest and the Titan's Girdle is once per scene, and
 * neither had anywhere to record it.
 *
 * The alternative was a base class, and a spread reads better here: this file
 * states each subtype's schema in one literal, and a reader who wants to know
 * what a weapon holds should not have to go up an inheritance chain to find
 * out that it also holds this.
 */
/**
 * `dice` rides alongside for the same reason and on the same subtypes. It is
 * a second array rather than a `kind` on the first, because a resource holds
 * one integer and a die pool holds a list of faces: folding them together
 * would give every reader of either a branch to take and every writer a
 * shape to guess. Seven documents in the corpus carry both — the Guardian's
 * Unstoppable is a once-per-long-rest *use* and a die that climbs, and those
 * are two different records of two different things.
 */
const tracked = () => ({
  resources: arr(resourceField()),
  dice: arr(diePoolField()),
  /** Always-on self modifiers; activation follows the owning Item subtype. */
  modifiers: arr(modifierField()),
});

/* ══════════════════════════════════════════════════════════════════════
   HERITAGE
   ══════════════════════════════════════════════════════════════════════ */

/**
 * An ancestry ships two features and they are not interchangeable: mixed
 * ancestry takes the *top* feature of one and the *bottom* of another. So
 * they are named for their position on the card, not for their importance.
 */
export class AncestryData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      description: html(),
      topFeature: featureField(),
      bottomFeature: featureField(),
      /** Set when this row came from a different ancestry than the card. */
      mixedFrom: str(),
      printing: printingField(),
      ...tracked(),
    };
  }
}

export class CommunityData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      description: html(),
      feature: featureField(),
      printing: printingField(),
      ...tracked(),
    };
  }
}

/**
 * A transformation — *Hope and Fear*'s third heritage card.
 *
 * It is filed here, beside ancestry and community, because that is what the
 * book says it is: "add the card to your loadout as if it were part of your
 * character's heritage", and like those two it does not count against the
 * domain card limit. So it is heritage in every way that reaches this system —
 * one card, drawn on the heritage row, arriving by drag like the other two.
 *
 * Two things make it its own subtype rather than a second ancestry.
 *
 * **A transformation is a bargain, and the schema says so.** Every one of the
 * six prints a benefit and a cost, and taking the card means taking both — the
 * book's own framing is "taking on the burden to reap the benefit". `features`
 * is a flat run in printed order because that is how the card reads it out and
 * because splitting them into `benefit`/`drawback` would need this file to
 * adjudicate which is which: the Vampire's Feed is a benefit that becomes a
 * drawback the moment the tokens run out, and Reanimated's Won't Stay Dead is a
 * drawback that is also the only reason you survive the roll.
 *
 * **And you may have exactly one.** See {@link TRANSFORMATION_LIMIT}. An
 * ancestry has no such rule — mixed ancestry is two of them by design — so
 * putting transformations in `AncestryData` would have meant one subtype with
 * two contradictory arity rules and a flag to tell them apart.
 *
 * `questions` is the card's own prompt list. It is the same kind of thing as a
 * class's `backgroundQuestions` and is stored the same way: prose the sheet
 * offers rather than a rule the sheet applies.
 */
export class TransformationData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      description: html(),
      features: arr(featureField()),
      /** The card's "Transformation Questions" — prompts, not rules. */
      questions: arr(str()),
      printing: printingField(),
      ...tracked(),
    };
  }
}

/* ══════════════════════════════════════════════════════════════════════
   CLASS AND SUBCLASS
   ══════════════════════════════════════════════════════════════════════ */

export class ClassData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      description: html(),

      /* The book's opening paragraph, and a second field rather than a longer
       * `description` — because the two are read in different places for
       * different reasons and only one of them has a rule about its length.
       *
       * `description` is what a *card* prints, and it is held to a single
       * sentence by `tools/check-cards.mjs` for a reason that has already
       * gone wrong once: the chapter opener got pasted in whole, and five
       * sentences of lore sat above the Evasion and Hit Points the card
       * exists to state. That check stays exactly as it is.
       *
       * This is what the creation window's class row prints, and there the
       * paragraph is the point. You are choosing one of nine, once, and the
       * numbers alone do not tell you what it is like to play one. Nothing
       * else in the system draws it — not the card, not the Features panel,
       * not chat — so it cannot leak back into the place the rule protects.
       *
       * Empty is fine and falls back to `description`: a homebrew class with
       * one sentence should read as a short class, not a broken one. */
      flavor: html(),

      domains: schema({
        primary: maybeChoice(DOMAINS),
        secondary: maybeChoice(DOMAINS),
      }),

      startingEvasion: int(10),
      startingHitPoints: int(6),

      /* Plural, and it had to become plural.
       *
       * This held one `featureField`, and five of the nine classes print more
       * than one: the Rogue is Cloaked *and* Sneak Attack, the Sorcerer has
       * three. The compendium had been joining them into a single block named
       * "Class Features" — the book's own section heading — which was an
       * honest compromise while the class was drawn as a card, because a card
       * shows one feature run and the heading is what the book puts above it.
       *
       * It stopped being honest when the class stopped being a card. The
       * Features panel lists one row per rule and names each one, so those
       * five classes had a row called "Class Features" carrying two or three
       * unrelated rules concatenated — which is exactly the thing the panel
       * was built to stop. It also broke the price parser downstream: a
       * feature's cost is read from its *opening clause*, and the opening
       * clause of a joined block belongs to whichever feature happened to be
       * first.
       *
       * The stats were never wrong. Every class's Evasion, Hit Points, domain
       * pair and Hope feature checks out against the SRD; this was the one
       * defect, and it was a shape rather than a misreading. */
      classFeatures: arr(featureField()),
      hopeFeature: featureField(),

      startingInventory: html(),
      backgroundQuestions: arr(str()),
      connectionQuestions: arr(str()),

      /** The book's recommended spread, for the creation flow to offer. */
      suggestedTraits: html(),
      ...tracked(),
    };
  }

  /**
   * `classFeature` became `classFeatures`, and a character already holding a
   * class Item has the old key.
   *
   * `migrateData` rather than a world migration script, because the problem is
   * not confined to the compendium: the class on a character sheet is an
   * *embedded copy* made when it was dragged in, so rebuilding the packs fixes
   * every future drag and none of the ones already on a sheet. This runs on
   * every load of every source object, embedded or not, so a character created
   * last week keeps their class feature without anyone being told to re-drag
   * anything — which is the kind of instruction nobody reads and everybody
   * discovers by finding a blank panel.
   */
  static migrateData(source: any) {
    if (source?.classFeature && !source.classFeatures?.length) {
      source.classFeatures = [source.classFeature];
      delete source.classFeature;
    }
    return (super.migrateData as any)(source);
  }
}

/**
 * One subclass *card*, not one subclass. A subclass arrives in three cards —
 * Foundation, Specialization, Mastery — earned at different levels, and a
 * character can be holding one, two or all three. Modelling the card is the
 * only shape that lets the sheet show what you actually have.
 */
export const SUBCLASS_RANKS = ["foundation", "specialization", "mastery"] as const;

export class SubclassData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      description: html(),
      /** The subclass this card belongs to, e.g. "School of War". */
      subclassName: str(),
      /** The class that subclass belongs to, e.g. "Wizard". */
      className: str(),
      rank: choice(SUBCLASS_RANKS, "foundation"),
      /** Blank unless this subclass casts. */
      spellcastTrait: maybeChoice(TRAITS),
      features: arr(featureField()),
      printing: printingField(),
      ...tracked(),
    };
  }
}

/* ══════════════════════════════════════════════════════════════════════
   DOMAIN CARD
   ══════════════════════════════════════════════════════════════════════ */

export class DomainCardData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      domain: maybeChoice(DOMAINS),
      level: int(1, { min: 1, max: MAX_LEVEL }),
      cardType: choice(CARD_TYPES, "ability"),
      /** Stress paid to pull this back out of the vault mid-session. */
      recallCost: int(0, { min: 0 }),
      description: html(),

      /* The one piece of *character* state a card carries. Loadout versus
         vault is a property of this card in this character's hands, and
         there is nowhere else to put it that survives a drag between
         actors — which is exactly what should reset it. */
      inLoadout: bool(false),

      printing: printingField(),
      ...tracked(),
    };
  }

  static migrateData(source: any) {
    migrateUses(source);
    return (super.migrateData as any)(source);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   GEAR
   ══════════════════════════════════════════════════════════════════════ */

export class WeaponData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      description: html(),
      tier: int(1, { min: 1, max: 4 }),
      slot: choice(WEAPON_SLOTS, "primary"),
      equipped: bool(false),

      /** The trait its attack rolls with. */
      trait: choice(TRAITS, "agility"),
      range: choice(RANGES, "melee"),
      burden: choice(BURDENS, "oneHanded"),

      /* Count is the *printed* count, almost always 1. The number of dice
         actually rolled is Proficiency copies of this — the single most
         missed rule in the game, and the reason the sheet does the sum. */
      damage: damageField("d8", 1, 0),

      feature: featureField(),
      /** Some weapons and shields move Evasion; most do not. */
      evasionModifier: int(0),

      /* And some move Armor Score, which had nowhere to go.
       *
       * A Round Shield is *Protective: +1 to Armor Score* and a Tower Shield is
       * *Barrier: +2 to Armor Score; −1 to Evasion* — the second half of the
       * Tower Shield worked and the first half silently did not, because
       * `CharacterData` read Armor Score off the equipped **armor** alone. So
       * a character could equip a shield, watch their Evasion drop by one, and
       * receive nothing in exchange for it.
       *
       * The pair had already split once for this reason: Score and Slots are
       * two numbers because a shield raises the Score and leaves the Slots
       * alone. This is the other end of that same argument, and it was missing.
       */
      armorScoreModifier: int(0),
      magical: bool(false),
      ...tracked(),
    };
  }
}

export class ArmorData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      description: html(),
      tier: int(1, { min: 1, max: 4 }),
      equipped: bool(false),

      /* Printed on the card without your level in them. The character adds
         their level to both — see CharacterData#prepareDerivedData. */
      baseThresholds: schema({ major: int(0), severe: int(0) }),
      /** Also the number of Armor Slots the armor provides. */
      baseScore: int(0, { min: 0 }),

      feature: featureField(),
      evasionModifier: int(0),
      magical: bool(false),
      ...tracked(),
    };
  }
}

export class ConsumableData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      description: html(),
      quantity: int(1, { min: 0 }),
      /** Roll table result that produced it, when generated. */
      source: str(),
      ...tracked(),
    };
  }
}

export class LootData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      description: html(),
      quantity: int(1, { min: 0 }),
      source: str(),
      ...tracked(),
    };
  }
}

/* ══════════════════════════════════════════════════════════════════════
   FEATURE

   The catch-all: adversary and environment stat-block entries, and any
   character feature that did not arrive attached to a card. `kind` is the
   word the stat block prints in bold — Passive, Action, Reaction.
   ══════════════════════════════════════════════════════════════════════ */

export class FeatureData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      kind: choice(FEATURE_KINDS, "passive"),
      description: html(),
      /** Fear the GM must spend to use it, if any. */
      fearCost: int(0, { min: 0 }),
      /** Stress the owner must mark to use it, if any. */
      stressCost: int(0, { min: 0 }),
      /** Where it came from: a class, an ancestry, the stat block itself. */
      origin: str(),
      ...tracked(),
    };
  }

  static migrateData(source: any) {
    migrateUses(source);
    return (super.migrateData as any)(source);
  }
}

/* Kept exported so the sheets can offer the same choices the schema does. */
export { DAMAGE_TYPES };
