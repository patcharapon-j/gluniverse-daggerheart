/**
 * Actor DataModels.
 *
 * Derivation lives here rather than on the Actor subclass, because these are
 * the numbers the schema owns: everything a sheet reads and nothing a sheet
 * writes. The Actor document owns *behaviour* — marking damage, spending
 * Hope, rolling — and calls into nothing here.
 *
 * One rule runs through all four: a track the player marks is stored as
 * `marked`, and `value` is derived as `max - marked`. Players cross boxes;
 * Foundry's token bars count down. Storing the first and deriving the second
 * keeps both honest, and means a bar can never disagree with the sheet.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ADVERSARY_TYPES,
  DEFAULT_HOPE_MAX,
  DEFAULT_STRESS_MAX,
  DOMAINS,
  ENVIRONMENT_TYPES,
  LOADOUT_LIMIT,
  MAX_LEVEL,
  RANGES,
  TRAITS,
  baseProficiency,
  tierOf,
} from "../config.ts";
import {
  arr,
  bool,
  choice,
  damageField,
  experienceField,
  featureField,
  frame,
  html,
  int,
  markTrack,
  maybeChoice,
  obj,
  pool,
  schema,
  str,
  uuid,
} from "./fields.ts";

const TypeDataModel = () => foundry.abstract.TypeDataModel;

/** `max - marked`, floored at zero, written back onto the track. */
function deriveTrack(track: { marked: number; max: number; value?: number }): void {
  track.value = Math.max(0, track.max - track.marked);
}

/* ══════════════════════════════════════════════════════════════════════
   CHARACTER
   ══════════════════════════════════════════════════════════════════════ */

export class CharacterData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      /* Traits. `marked` is level-up bookkeeping: a trait raised this tier
         cannot be raised again until the next tier clears the marks. */
      traits: schema(
        Object.fromEntries(
          TRAITS.map((t) => [t, schema({ value: int(0), marked: bool(false) })]),
        ),
      ),

      resources: schema({
        hitPoints: markTrack(6),
        stress: markTrack(DEFAULT_STRESS_MAX),
        armorSlots: markTrack(0),
        hope: pool(DEFAULT_HOPE_MAX),
      }),

      /* Evasion and Armor Score are two numbers, not one. A shield raises
         the Score and leaves the Slots alone; the sheet had them fused once
         and it was wrong in exactly that case. `bonus` is everything that is
         not the class base or the equipped armor. */
      evasion: schema({ base: int(10), bonus: int(0) }),
      armorScore: schema({ bonus: int(0) }),

      /* Thresholds come off the equipped armor plus your level. `override`
         exists because adversary-facing homebrew and a few class features
         set them outright, and a system that cannot express that forces the
         GM to lie to the sheet. */
      thresholds: schema({
        bonusMajor: int(0),
        bonusSevere: int(0),
        override: bool(false),
        major: int(0),
        severe: int(0),
      }),

      level: int(1, { min: 1, max: MAX_LEVEL }),
      /** Proficiency bought through advancement, on top of the tier grant. */
      proficiencyBonus: int(0),

      /* Which advancement slots are filled, keyed `"<tier>.<option>"` against
         the count taken — so `{"2.0": 2}` is "the trait option, twice, in
         tier 2". Keyed rather than a field per option because the option
         list is a rules table in `config.ts`: adding a row to it must not
         require a migration to keep what a player already chose. */
      advancement: obj(),

      experiences: arr(experienceField()),

      gold: schema({
        handfuls: int(1, { min: 0 }),
        bags: int(0, { min: 0 }),
        chests: int(0, { min: 0 }),
      }),

      /* Denormalised from the equipped class Item so the sheet, the roll
         engine and the vault filter do not each have to go find it. Rewritten
         in prepareDerivedData whenever a class is present. */
      domains: schema({
        primary: maybeChoice(DOMAINS),
        secondary: maybeChoice(DOMAINS),
      }),

      /** The trait a subclass casts with, if it casts. */
      spellcastTrait: maybeChoice(TRAITS),

      /* How the actor's own image is framed, twice.
         `img` is one picture, and the two places it is shown are not the
         same shape: the sheet's diorama is a wide band across the top of
         the rail, the roll plate's portrait is a narrower panel behind the
         verdict. One crop cannot serve both — a headshot framed to fill the
         band is a chin on the plate. So the framing is per surface.

         Offsets are percentages of the frame and are deliberately
         unbounded: the whole point of freeform is that you may push the
         subject to an edge or off it. Scale goes below 1 for the same
         reason — a full-body drawing that should sit *inside* the band
         rather than fill it is a legitimate thing to want, and the band has
         a colour underneath it for exactly that case. */
      portrait: schema({
        sheet: frame(),
        plate: frame(),
      }),

      biography: schema({
        pronouns: str(),
        heritage: str(),
        description: html(),
        background: html(),
        connections: html(),
      }),

      /* Death moves leave scars; a scar is permanent and costs a Hope slot,
         so the maximum is stored rather than recomputed from the list. */
      scars: arr(schema({ name: str(), description: html() })),

      notes: html(),
    };
  }

  declare traits: Record<string, { value: number; marked: boolean }>;
  declare resources: any;
  declare evasion: any;
  declare armorScore: any;
  declare thresholds: any;
  declare level: number;
  declare proficiencyBonus: number;
  declare domains: any;
  declare parent: any;

  /* Derived, not stored. */
  declare tier: number;
  declare proficiency: number;

  prepareBaseData(): void {
    this.tier = tierOf(this.level);
    this.proficiency = baseProficiency(this.level) + this.proficiencyBonus;
    // Seeded before Active Effects run so `system.evasion.value | ADD | 2`
    // has a number to add to rather than producing NaN.
    this.evasion.value = this.evasion.base + this.evasion.bonus;
    this.armorScore.value = this.armorScore.bonus;
  }

  prepareDerivedData(): void {
    const items = this.parent?.items ?? [];

    /* ── class and subclass tell us the domains and the casting trait ── */
    const cls = items.find?.((i: any) => i.type === "class");
    if (cls) {
      this.domains.primary = cls.system.domains?.primary || this.domains.primary;
      this.domains.secondary = cls.system.domains?.secondary || this.domains.secondary;
    }
    const caster = items.find?.((i: any) => i.type === "subclass" && i.system.spellcastTrait);
    if (caster) this.spellcastTrait = caster.system.spellcastTrait;

    /* ── equipped armor sets Score, Slots and both thresholds ────────── */
    const armor = items.find?.((i: any) => i.type === "armor" && i.system.equipped);
    if (armor) {
      this.armorScore.value = armor.system.baseScore + this.armorScore.bonus;
      this.resources.armorSlots.max = armor.system.baseScore;
    }

    /* Equipped gear can carry a flat Evasion modifier — most armor does,
       and a shield's is the reason Score and Slots had to split. */
    const gearEvasion = items
      .filter?.((i: any) => (i.type === "armor" || i.type === "weapon") && i.system.equipped)
      .reduce((sum: number, i: any) => sum + (i.system.evasionModifier ?? 0), 0) ?? 0;
    this.evasion.value = this.evasion.base + this.evasion.bonus + gearEvasion;

    if (!this.thresholds.override) {
      // Add your level to both of the armor's printed values. With no armor
      // equipped there is no printed value, so the thresholds are your level
      // alone and every hit lands at least Major — which is the rule.
      const base = armor?.system.baseThresholds ?? { major: 0, severe: 0 };
      this.thresholds.major = base.major + this.level + this.thresholds.bonusMajor;
      this.thresholds.severe = base.severe + this.level + this.thresholds.bonusSevere;
    }

    /* ── the tracks ──────────────────────────────────────────────────── */
    deriveTrack(this.resources.hitPoints);
    deriveTrack(this.resources.stress);
    deriveTrack(this.resources.armorSlots);

    // A scar costs a Hope slot permanently. Floor at 1 so a character with
    // five scars still has somewhere to put the Hope they are handed.
    this.resources.hope.max = Math.max(1, DEFAULT_HOPE_MAX - (this.scars?.length ?? 0));
    this.resources.hope.value = Math.min(this.resources.hope.value, this.resources.hope.max);

    /* The loadout/vault split is deliberately *not* cached here. It would be
       a list of Item documents hanging off `system`, and the sheet snapshot
       deep-clones `system` on every render — which would clone every card,
       every render, to save one filter. The sheet does the filter. */
  }

  declare scars: any[];
  declare spellcastTrait: string;
}

/* ══════════════════════════════════════════════════════════════════════
   ADVERSARY

   Deliberately not a character with the player parts removed. There are no
   traits, no domains and no Hope: an adversary has a Difficulty others roll
   against, one attack modifier, and features that fire when the GM spends
   the spotlight on it.
   ══════════════════════════════════════════════════════════════════════ */

export class AdversaryData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      tier: int(1, { min: 1, max: 4 }),
      role: choice(ADVERSARY_TYPES, "standard"),
      description: str(),
      motives: str(),

      difficulty: int(10, { min: 0 }),

      /* Minions print "None" for thresholds — they mark their one Hit Point
         from any damage at all. That is an absent threshold, not a zero one,
         so it gets its own flag rather than a sentinel value. */
      thresholds: schema({
        none: bool(false),
        major: int(0),
        severe: int(0),
      }),

      resources: schema({
        hitPoints: markTrack(3),
        stress: markTrack(3),
      }),

      attack: schema({
        name: str("Attack"),
        modifier: int(0),
        range: choice(RANGES, "melee"),
        damage: damageField("d6", 1, 0),
      }),

      experiences: arr(experienceField()),

      /** Horde adversaries print a reduced damage expression for when they
          are half dead; storing it beats making the GM remember it. */
      hordeDamage: str(),

      notes: html(),
    };
  }

  declare resources: any;
  declare tier: number;
  declare parent: any;

  prepareDerivedData(): void {
    deriveTrack(this.resources.hitPoints);
    deriveTrack(this.resources.stress);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   ENVIRONMENT

   A stat block for a place. It has a Difficulty and features, and that is
   most of it — the rest is prompts for the GM.
   ══════════════════════════════════════════════════════════════════════ */

export class EnvironmentData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      tier: int(1, { min: 1, max: 4 }),
      kind: choice(ENVIRONMENT_TYPES, "exploration"),
      description: str(),
      impulses: str(),

      /* A few environments print "Special" instead of a number. Same shape
         as the minion threshold problem and the same answer. */
      difficulty: int(10, { min: 0 }),
      difficultySpecial: bool(false),

      potentialAdversaries: html(),
      notes: html(),
    };
  }
}

/* ══════════════════════════════════════════════════════════════════════
   COMPANION

   The Ranger's companion. It has an Evasion, a Stress track, one attack and
   one Experience, and it levels by spending the Ranger's own level-ups —
   so it points back at its partner rather than owning a level of its own.
   ══════════════════════════════════════════════════════════════════════ */

export class CompanionData extends (TypeDataModel() as any) {
  static defineSchema() {
    return {
      partner: uuid(),
      species: str(),
      description: html(),

      evasion: schema({ base: int(10), bonus: int(0) }),
      resources: schema({ stress: markTrack(3) }),

      attack: schema({
        name: str("Attack"),
        range: choice(RANGES, "veryClose"),
        damage: damageField("d6", 1, 0),
      }),

      experience: experienceField(),

      /** Which of the companion's advancement rows have been taken. */
      training: schema({
        intelligent: int(0, { min: 0, max: 3 }),
        lightInTheDark: int(0, { min: 0, max: 3 }),
        creatureComfort: int(0, { min: 0, max: 1 }),
        armored: int(0, { min: 0, max: 1 }),
        vicious: int(0, { min: 0, max: 3 }),
        resilient: int(0, { min: 0, max: 3 }),
        bonded: int(0, { min: 0, max: 1 }),
        aware: int(0, { min: 0, max: 3 }),
      }),

      notes: html(),
    };
  }

  declare evasion: any;
  declare resources: any;

  prepareBaseData(): void {
    this.evasion.value = this.evasion.base + this.evasion.bonus;
  }

  prepareDerivedData(): void {
    deriveTrack(this.resources.stress);
  }
}
