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
  advancementTally,
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
import { activeModifiers, modifierTotal, traitPassiveTotal } from "./modifiers.ts";

const TypeDataModel = () => foundry.abstract.TypeDataModel;

/**
 * `max - marked`, floored at zero, written back onto the track.
 *
 * The marks are clamped to the maximum on the way, because the maximum can
 * *shrink* — unmarking a "permanently gain one Stress slot" takes a box away,
 * and a track drawing six marks in five boxes is a track lying about both
 * numbers. Clamping here rather than writing back keeps it a display fact:
 * put the box back and the mark is still there, which is what someone who
 * unmarked an advancement by mistake would expect.
 */
function deriveTrack(track: { marked: number; max: number; value?: number }): void {
  track.marked = Math.min(track.marked, track.max);
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

      /* Evasion and Armor Score are two numbers, not one. Armor Score is also
         the capacity of the Armor Slot track, so a shield raises the score
         and adds the matching markable box. `bonus` is everything that is
         not the equipped armor or an owned Item. */
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

      /* Five, until a GM says otherwise. This was a constant in `config.ts`
         and it is a rules default rather than a rule: subclasses, campaign
         frames and one-shot house rules all move it, and a number the table
         can change has to live on the character rather than in the code.
         `LOADOUT_LIMIT` stays as the default so nothing has to be migrated. */
      loadoutLimit: int(LOADOUT_LIMIT, { min: 0 }),

      /* *The Twilight Marked*'s two fields, and the only campaign-frame state
         in this schema. They are here rather than on a "Marked" feature Item
         holding an open counter — which is what the machinery would otherwise
         allow — for one reason: `src/module/marked.ts` has to *read* them, and
         reading a number off "the resource named Mark on the Item named
         Marked" is string-matching a document a player can rename.

         `mark` is uncapped during play and cleared by the long-rest roll, so
         it has a floor and no ceiling: a pool with no limit and a pool with a
         limit of zero are opposite things, which is `resourceField`'s own
         argument about `open`. `surging` is what a failed roll leaves behind,
         and it clears at the next long rest.

         Both default to zero and false, so a character who has never been
         marked carries two fields that say nothing — which is what a frame
         nobody at this table is running should look like. */
      mark: int(0, { min: 0 }),
      surging: bool(false),

      /* Which advancement slots are filled, keyed `"<tier>.<option>"` against
         the count taken — so `{"2.0": 2}` is "the trait option, twice, in
         tier 2". Keyed rather than a field per option because the option
         list is a rules table in `config.ts`: adding a row to it must not
         require a migration to keep what a player already chose. */
      advancement: obj(),

      /* What the choice-bearing advancements actually chose, so unmarking one
         can put it back. Keyed `"<tier>:<option>:<n>"` — colons rather than
         dots because a dot in a Foundry update key is a *path*, and the whole
         reason this is a flat map is that it is written whole.

         An advancement you can take, you must be able to give back. "Gain a
         +1 to two unmarked traits" raises two of six numbers and marks them,
         and a box that could not say which two would leave the player to
         work out by hand what the sheet had done to them. */
      advancementChoices: obj(),

      /* Which tier achievements have been handed out. Not derived from level,
         because the grants are *events*: entering tier 3 gives you an
         Experience and clears your trait marks, and a character who dropped
         to level 4 and came back should not collect a second Experience or
         have their marks cleared twice. Reaching a tier is a thing that
         happened once. */
      tiersEntered: obj(),

      /* The domain card every level hands over, keyed by the level that handed
         it over. Step 4 of the printed level-up, and *not* the advancement
         option beside it — "choose an **additional** domain card" is additional
         to this one, which is why there are two of them and why this system
         having neither was two rules missing rather than one.

         An event, for `tiersEntered`'s reason: a level typed down to 4 and back
         up to 5 has not reached level 5 twice. And three-valued on purpose —
         **absent** is a level reached before this record existed and is owed
         nothing, **null** is a level reached and not yet spent, and a card is
         the answer. Which is what lets an old character level up and be asked
         about that level alone, rather than handed a bill for every level they
         have ever gained. */
      levelCards: obj(),

      experiences: arr(experienceField()),

      /* ── what character creation wrote down ──────────────────────────
         Almost nothing, and that is the design.

         Whether a creation step is *done* is derived from the sheet on every
         open — a class Item means you chose a class, an ancestry and a
         community mean you chose a heritage — for the reason the advancement
         marks are derived: there is then only one record, so it cannot
         disagree with itself. A stored cursor would go stale the first time
         somebody deleted their class from the gear tab.

         Two things genuinely cannot be re-derived, so they are the only two
         written here.

         `finished` — because **done is a decision, not a fact**. A player
         whose GM said "no armour, you're a monk" satisfies no armour check
         and must still be able to say they have finished. And the derivation
         *rots as the character advances*: at level 2 you gain a third
         Experience and at level 5 your traits no longer match the starting
         spread, so a level-6 character with nothing stored would open the
         window and be told their sheet is wrong. It is inferred on first
         contact for characters made before any of this existed — see
         `inferFinished` in `apps/creation.ts` — so nobody's year-old
         character is greeted by a progress bar reading 0 of 6.

         `granted` — the ids of documents the flow itself created. Changing
         your mind about class has to remove the subclass card that class gave
         you and the domain cards that are no longer legal, and it must not
         remove the longsword you looted in session three. Provenance is the
         only thing that tells those apart, and nothing else on an Item
         records it. */
      creation: schema({
        finished: bool(false),
        /** Item ids this flow created, so a cascade removes only its own. */
        granted: arr(str()),
      }),

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

  declare traits: Record<string, { value: number; total?: number; marked: boolean }>;
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
  /** Every domain this character has access to, across every class. */
  declare domainList: string[];
  /** How many of each advancement option has been taken, across every tier. */
  declare advancementTally: Record<string, number>;
  declare advancement: any;
  declare experiences: any[];

  prepareBaseData(): void {
    this.tier = tierOf(this.level);

    /* ── what the advancement boxes are worth ────────────────────────────
       Four of the nine printed options are pure arithmetic — a Hit Point
       slot, a Stress slot, +1 Evasion, +1 Proficiency — and those are
       *derived from the marks* rather than written when a box is pressed.

       That is the difference between a sheet that automates level-up and one
       that merely reacts to it. A write-on-press design cannot be undone: a
       box unmarked by mistake leaves the Stress slot behind, the two numbers
       drift, and the only way back is for someone to work out by hand what
       the sheet did. Derived, the marks *are* the record — mark and the box
       appears, unmark and it goes, and the number can never disagree with
       the panel it came from because there is only one of them.

       The other five need a choice the sheet cannot make (which two traits,
       which two Experiences, which card, which class). Those are asked for
       and stored as the answer; see `apps/advance.ts`. The split is not
       arbitrary — it is exactly the line between an option that is a number
       and an option that is a decision. */
    this.advancementTally = advancementTally(this.advancement);
    const adv = this.advancementTally;

    this.proficiency =
      baseProficiency(this.level) + this.proficiencyBonus + (adv.proficiency ?? 0);

    // Seeded before Active Effects run so `system.evasion.value | ADD | 2`
    // has a number to add to rather than producing NaN.
    this.evasion.value = this.evasion.base + this.evasion.bonus + (adv.evasion ?? 0);
    this.armorScore.value = this.armorScore.bonus;

    /* The stored maximum is the *base* — what the class hands you and what
       the adjust tab sets. Advancement is added on top here, the same way an
       equipped armour overwrites `armorSlots.max` below: the schema holds
       what was chosen and the model holds what is true. */
    this.resources.hitPoints.max += adv.hitPoints ?? 0;
    this.resources.stress.max += adv.stress ?? 0;
    for (const trait of TRAITS) {
      const score = this.traits[trait];
      if (score) score.total = score.value;
    }
  }

  prepareDerivedData(): void {
    const items = this.parent?.items ?? [];

    /* ── class and subclass tell us the domains and the casting trait ──
       Classes, plural. Multiclassing is a printed advancement option in two
       of the three tiers, and it hands you a second class with domains of
       its own — so a character can legitimately have access to three or four
       rather than two, and `find` was quietly answering for the first one.

       `domains.primary`/`secondary` stay the *first* class's, because that
       is the pair the corner plates and the footer of a card are built from
       and a card has two corners. The full set is `domainList`, which is
       what the sheet draws and what anything asking "may I take this card?"
       should ask. A subclass card resolves its own class by name rather than
       reading either — see `classDomains` in sheets/cards.ts. */
    const classes = items.filter?.((i: any) => i.type === "class") ?? [];
    const [cls] = classes;
    if (cls) {
      this.domains.primary = cls.system.domains?.primary || this.domains.primary;
      this.domains.secondary = cls.system.domains?.secondary || this.domains.secondary;
    }
    this.domainList = [
      ...new Set(
        classes
          .flatMap((c: any) => [c.system.domains?.primary, c.system.domains?.secondary])
          .filter(Boolean),
      ),
    ] as string[];

    const caster = items.find?.((i: any) => i.type === "subclass" && i.system.spellcastTrait);
    if (caster) this.spellcastTrait = caster.system.spellcastTrait;

    /* Passive self-modifiers are authored data carried by the Item or its
       feature block. Domain cards are live in the loadout, gear while
       equipped, and assigned heritage/class/subclass features while owned. */
    // Tracks go first because conditions such as Voice of Reason compare the
    // marked Stress against the final maximum, including Human/advancement.
    this.resources.hitPoints.max += modifierTotal(this.parent, "hitPoints");
    this.resources.stress.max += modifierTotal(this.parent, "stress");
    for (const trait of TRAITS) {
      const score = this.traits[trait];
      if (score) score.total = score.value + traitPassiveTotal(this.parent, trait);
    }
    this.proficiency += modifierTotal(this.parent, "proficiency");
    this.loadoutLimit = Math.max(0, this.loadoutLimit + modifierTotal(this.parent, "loadoutLimit"));

    /* ── equipped armor sets Score, Slots and both thresholds ────────── */
    const armor = items.find?.((i: any) => i.type === "armor" && i.system.equipped);

    /* Equipped gear carries flat modifiers to both of the numbers a shield
       touches, and for a long time only one of them arrived.

       Evasion always worked. Armor Score did not — it was read off the equipped
       *armor* alone, so a Round Shield's "Protective: +1 to Armor Score" went
       nowhere, and a Tower Shield charged you its −1 Evasion and withheld the
       +2 it was charging for. They are summed the same way over the same list
       now, because they are the same kind of fact: a thing you are wearing
       moving a number on the rail.

       Armor Score is the number of slots available, so every bonus must move
       both the crest and the track. */
    const worn =
      items.filter?.(
        (i: any) => (i.type === "armor" || i.type === "weapon") && i.system.equipped,
      ) ?? [];
    const legacyGear = (key: string, target: string) =>
      worn.reduce((n: number, i: any) => {
        const structured = (i.system?.feature?.modifiers ?? []).some(
          (m: any) => m.target === target,
        );
        return n + (structured ? 0 : (i.system[key] ?? 0));
      }, 0);

    const passives = activeModifiers(this.parent);
    const bareBones = passives.some((m) => m.target === "bareBones");
    const bareThresholds: Record<number, { major: number; severe: number }> = {
      1: { major: 9, severe: 19 },
      2: { major: 11, severe: 24 },
      3: { major: 13, severe: 31 },
      4: { major: 15, severe: 38 },
    };
    const baseArmorScore = bareBones
      ? 3 + Number(this.traits.strength?.total ?? this.traits.strength?.value ?? 0)
      : Number(armor?.system.baseScore ?? 0);

    this.armorScore.value =
      baseArmorScore +
      this.armorScore.bonus +
      legacyGear("armorScoreModifier", "armorScore") +
      modifierTotal(this.parent, "armorScore");
    this.resources.armorSlots.max = Math.max(0, this.armorScore.value);

    this.evasion.value =
      this.evasion.base +
      this.evasion.bonus +
      (this.advancementTally?.evasion ?? 0) +
      legacyGear("evasionModifier", "evasion") +
      modifierTotal(this.parent, "evasion");

    if (!this.thresholds.override) {
      // Add your level to both of the armor's printed values. With no armor
      // equipped there is no printed value, so the thresholds are your level
      // alone and every hit lands at least Major — which is the rule.
      const base = bareBones
        ? bareThresholds[this.tier] ?? bareThresholds[1]
        : armor?.system.baseThresholds ?? { major: 0, severe: 0 };
      const both = modifierTotal(this.parent, "thresholds");
      this.thresholds.major =
        base.major + this.level + this.thresholds.bonusMajor + both +
        modifierTotal(this.parent, "majorThreshold");
      this.thresholds.severe =
        base.severe + this.level + this.thresholds.bonusSevere + both +
        modifierTotal(this.parent, "severeThreshold");
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
  declare creation: { finished: boolean; granted: string[] };
  declare biography: any;
  declare gold: any;
  declare loadoutLimit: number;
  declare mark: number;
  declare surging: boolean;
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
         so it gets its own flag rather than a sentinel value.

         `severeNone` is the same argument one rung down. The Tiny Oozes and
         the Phantom print "4/None": two Hit Points, so a Severe rung could
         never do anything a Major one has not already done. A zero severe
         would make every hit Massive, which is why it is a flag too. */
      thresholds: schema({
        none: bool(false),
        major: int(0),
        severe: int(0),
        severeNone: bool(false),
      }),

      resources: schema({
        hitPoints: markTrack(3),
        stress: markTrack(3),
      }),

      attack: schema({
        name: str("Attack"),
        modifier: int(0),
        /** A rare stat block rolls its attack modifier instead of adding a flat value. */
        modifierDice: str(),
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
