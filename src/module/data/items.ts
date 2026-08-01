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
  pool,
  printingField,
  schema,
  str,
} from "./fields.ts";

const TypeDataModel = () => foundry.abstract.TypeDataModel;

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
    };
  }
}

export class CommunityData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      description: html(),
      feature: featureField(),
      printing: printingField(),
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

      domains: schema({
        primary: maybeChoice(DOMAINS),
        secondary: maybeChoice(DOMAINS),
      }),

      startingEvasion: int(10),
      startingHitPoints: int(6),

      classFeature: featureField(),
      hopeFeature: featureField(),

      startingInventory: html(),
      backgroundQuestions: arr(str()),
      connectionQuestions: arr(str()),

      /** The book's recommended spread, for the creation flow to offer. */
      suggestedTraits: html(),
    };
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

      /** Cards with a limited number of uses per rest track them here. */
      uses: pool(0),

      printing: printingField(),
    };
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
      magical: bool(false),
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
    };
  }
}

export class LootData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      description: html(),
      quantity: int(1, { min: 0 }),
      source: str(),
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
      uses: pool(0),
      /** Where it came from: a class, an ancestry, the stat block itself. */
      origin: str(),
    };
  }
}

/* Kept exported so the sheets can offer the same choices the schema does. */
export { DAMAGE_TYPES };
