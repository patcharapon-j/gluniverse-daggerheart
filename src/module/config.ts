/**
 * System constants.
 *
 * Everything here is a closed set the rules define — traits, domains, tiers,
 * ranges — kept in one place so the data models, the sheets and the roll
 * engine all agree on the same spellings. Anything a table can extend
 * (classes, ancestries, communities) is content, not config, and lives in
 * compendium Items instead.
 */

export const SYSTEM_ID = "gluniverse-daggerheart";

/** Where the system's own files resolve from inside Foundry. */
export const SYSTEM_PATH = `systems/${SYSTEM_ID}`;

/* ── traits ──────────────────────────────────────────────────────────
   Order is the order they appear on the sheet, which is the order the
   book prints them. Not alphabetical, deliberately: players reach for
   them positionally. */

export const TRAITS = ["agility", "strength", "finesse", "instinct", "presence", "knowledge"] as const;
export type Trait = (typeof TRAITS)[number];

export const TRAIT_LABELS: Record<string, string> = {
  agility: "Agility",
  strength: "Strength",
  finesse: "Finesse",
  instinct: "Instinct",
  presence: "Presence",
  knowledge: "Knowledge",
};

/* The three actions printed under each trait on the official sheet. Kept as
   three strings rather than one comma'd line because the sheet stacks them,
   and a caller that wants the line can join it — a caller that wants the
   three cannot un-join it without guessing at the separator. */
export const TRAIT_VERBS: Record<string, readonly [string, string, string]> = {
  agility: ["Sprint", "Leap", "Maneuver"],
  strength: ["Lift", "Smash", "Grapple"],
  finesse: ["Control", "Hide", "Tinker"],
  instinct: ["Perceive", "Sense", "Navigate"],
  presence: ["Charm", "Perform", "Deceive"],
  knowledge: ["Recall", "Analyze", "Comprehend"],
};

/** Trait spread handed out at character creation: one each. */
export const STARTING_TRAIT_SPREAD = [2, 1, 1, 0, 0, -1] as const;

/* ── domains ─────────────────────────────────────────────────────────
   Colours are the official values from daggerheart.org, with one
   deliberate departure: Bone ships as #868686, saturation 0, which is the
   same family this system spends on "no domain" graphite. Every other
   domain is separated from that graphite by hue; Bone was separated by
   value alone, and value is the one axis a colour ramp over artwork
   erodes. Same value, warmed to old ivory. */

export const DOMAINS = [
  "arcana",
  "blade",
  "bone",
  "codex",
  "grace",
  "midnight",
  "sage",
  "splendor",
  "valor",
] as const;
export type Domain = (typeof DOMAINS)[number];

export interface DomainDef {
  label: string;
  /** The lit hue — used on paper and for text that has to carry itself. */
  light: string;
  /** The shadowed hue — used for the deep end of a ramp over artwork. */
  dark: string;
  /** Recentred mark, relative to the system root. */
  icon: string;
  blurb: string;
}

export const DOMAIN_CONFIG: Record<string, DomainDef> = {
  arcana: {
    label: "Arcana",
    light: "#75509f",
    dark: "#4a3067",
    icon: `${SYSTEM_PATH}/assets/domains/arcana.svg`,
    blurb: "Innate and instinctual magic. Volatile power, potent when correctly channeled.",
  },
  blade: {
    label: "Blade",
    light: "#8e1f13",
    dark: "#5c0e06",
    icon: `${SYSTEM_PATH}/assets/domains/blade.svg`,
    blurb: "Weapon mastery. Inexorable power over death.",
  },
  bone: {
    label: "Bone",
    light: "#8f8578",
    dark: "#6b6357",
    icon: `${SYSTEM_PATH}/assets/domains/bone.svg`,
    blurb: "Tactics and the body. Unparalleled understanding of movement.",
  },
  codex: {
    label: "Codex",
    light: "#3262a2",
    dark: "#203f6a",
    icon: `${SYSTEM_PATH}/assets/domains/codex.svg`,
    blurb: "Intensive magical study. Commanding, versatile understanding of magic.",
  },
  grace: {
    label: "Grace",
    light: "#9f365d",
    dark: "#7c163c",
    icon: `${SYSTEM_PATH}/assets/domains/grace.svg`,
    blurb: "Charisma. Raw magnetism and mastery over language.",
  },
  midnight: {
    label: "Midnight",
    light: "#1b686f",
    dark: "#0b494f",
    icon: `${SYSTEM_PATH}/assets/domains/midnight.svg`,
    blurb: "Shadows and secrecy. The power to control and create enigmas.",
  },
  sage: {
    label: "Sage",
    light: "#52822b",
    dark: "#346011",
    icon: `${SYSTEM_PATH}/assets/domains/sage.svg`,
    blurb: "The natural world. The vitality of a bloom, the ferocity of a predator.",
  },
  splendor: {
    label: "Splendor",
    light: "#9b8d1a",
    dark: "#6a600c",
    icon: `${SYSTEM_PATH}/assets/domains/splendor.svg`,
    blurb: "Life. The magnificent ability to both give and end it.",
  },
  valor: {
    label: "Valor",
    light: "#df903c",
    dark: "#9c6020",
    icon: `${SYSTEM_PATH}/assets/domains/valor.svg`,
    blurb: "Protection. Formidable strength raised in defense of others.",
  },
};

/**
 * What a card with no domain is drawn in. In this system a saturated hue
 * means "domain", so ancestry, community and equipment read graphite.
 */
export const NO_DOMAIN: DomainDef = {
  label: "—",
  light: "#5c636d",
  dark: "#31363c",
  icon: "",
  blurb: "",
};

/**
 * Look-ups rather than raw indexing.
 *
 * The label maps are keyed by strings that arrive from the database, so
 * indexing them is `string | undefined` and every call site would otherwise
 * carry its own fallback — which is how five different renderings of a
 * missing domain end up on one sheet. There is one fallback and it is here.
 */
export const domainDef = (d: string): DomainDef => DOMAIN_CONFIG[d] ?? NO_DOMAIN;
export const traitLabel = (t: string): string => TRAIT_LABELS[t] ?? t;
export const rangeLabel = (r: string): string => RANGE_LABELS[r] ?? r;

/* ── cards ───────────────────────────────────────────────────────────── */

export const CARD_TYPES = ["ability", "spell", "grimoire"] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const CARD_TYPE_LABELS: Record<string, string> = {
  ability: "Ability",
  spell: "Spell",
  grimoire: "Grimoire",
};

/** A character may hold five domain cards active; the rest sit in the vault. */
export const LOADOUT_LIMIT = 5;

/* ── ranges ──────────────────────────────────────────────────────────── */

export const RANGES = ["melee", "veryClose", "close", "far", "veryFar"] as const;
export type Range = (typeof RANGES)[number];

export const RANGE_LABELS: Record<string, string> = {
  melee: "Melee",
  veryClose: "Very Close",
  close: "Close",
  far: "Far",
  veryFar: "Very Far",
};

/**
 * Rough distances for tables playing on a grid. The rules are explicitly
 * fiction-first about this — these are the book's own approximations, not a
 * conversion table, and nothing in the system does arithmetic with them.
 */
export const RANGE_FEET: Record<string, number> = {
  melee: 5,
  veryClose: 10,
  close: 30,
  far: 60,
  veryFar: 120,
};

/* ── damage ──────────────────────────────────────────────────────────── */

export const DAMAGE_TYPES = ["physical", "magic"] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const DAMAGE_TYPE_LABELS: Record<string, string> = {
  physical: "Physical",
  magic: "Magic",
};

/** Short forms, as the stat blocks print them. */
export const DAMAGE_TYPE_SHORT: Record<string, string> = {
  physical: "phy",
  magic: "mag",
};

export const DAMAGE_DICE = ["d4", "d6", "d8", "d10", "d12", "d20"] as const;
export type DamageDie = (typeof DAMAGE_DICE)[number];

/**
 * The severity rungs, in the order the damage band draws them. `none` is a
 * real outcome (below the Major threshold) and not an absence of one.
 */
export const SEVERITY = ["none", "minor", "major", "severe", "massive"] as const;
export type Severity = (typeof SEVERITY)[number];

/** How many Hit Points each rung costs. */
export const SEVERITY_COST: Record<string, number> = {
  none: 0,
  minor: 1,
  major: 2,
  severe: 3,
  massive: 4,
};

/**
 * What an Armor Slot buys: **one rung down the ladder**, not a subtraction.
 *
 * This is the rule and it is worth being blunt about, because the obvious
 * reading of "Armor Score" is a number you take off the damage and that is
 * not what it is. Armor Score is *how many Armor Slots you have*; a slot,
 * once marked, reduces the severity of one instance of damage by one
 * threshold. Severe becomes Major, Major becomes Minor.
 *
 * **And Minor becomes nothing.** That is the printed rule, in the printed
 * parenthesis — "(Severe to Major, Major to Minor, Minor to Nothing)" — and
 * this floored at Minor instead, on the reasoning that armour should not make
 * a hit that landed not have landed. That reasoning is mine and the rule is
 * theirs, and the cost of the invention was not a rounding error: against a
 * Minor hit the dialog computed a ceiling of zero slots, greyed out the
 * stepper, and printed "spending a slot would not help" — so the one case
 * where armour completely negates a hit was the one case the sheet refused to
 * let you spend on.
 */
export function reduceSeverity(severity: Severity, rungs = 1): Severity {
  const i = SEVERITY.indexOf(severity);
  if (i <= 0) return severity;
  return SEVERITY[Math.max(0, i - Math.max(0, rungs))] ?? severity;
}

/* ── gear ────────────────────────────────────────────────────────────── */

export const BURDENS = ["oneHanded", "twoHanded"] as const;
export type Burden = (typeof BURDENS)[number];

export const BURDEN_LABELS: Record<string, string> = {
  oneHanded: "One-Handed",
  twoHanded: "Two-Handed",
};

export const WEAPON_SLOTS = ["primary", "secondary"] as const;
export type WeaponSlot = (typeof WEAPON_SLOTS)[number];

/* ── adversaries ─────────────────────────────────────────────────────── */

export const ADVERSARY_TYPES = [
  "bruiser",
  "horde",
  "leader",
  "minion",
  "ranged",
  "skulk",
  "social",
  "solo",
  "standard",
  "support",
] as const;
export type AdversaryType = (typeof ADVERSARY_TYPES)[number];

export const ADVERSARY_TYPE_LABELS: Record<string, string> = {
  bruiser: "Bruiser",
  horde: "Horde",
  leader: "Leader",
  minion: "Minion",
  ranged: "Ranged",
  skulk: "Skulk",
  social: "Social",
  solo: "Solo",
  standard: "Standard",
  support: "Support",
};

export const ENVIRONMENT_TYPES = ["exploration", "social", "traversal", "event"] as const;
export type EnvironmentType = (typeof ENVIRONMENT_TYPES)[number];

export const ENVIRONMENT_TYPE_LABELS: Record<string, string> = {
  exploration: "Exploration",
  social: "Social",
  traversal: "Traversal",
  event: "Event",
};

/* ── features ────────────────────────────────────────────────────────── */

/**
 * When a feature fires. Adversary and environment stat blocks print exactly
 * these three; character features reuse `passive` and `action`.
 */
export const FEATURE_KINDS = ["passive", "action", "reaction"] as const;
export type FeatureKind = (typeof FEATURE_KINDS)[number];

export const FEATURE_KIND_LABELS: Record<string, string> = {
  passive: "Passive",
  action: "Action",
  reaction: "Reaction",
};

/* ── conditions ──────────────────────────────────────────────────────────
   The three the rules name, and they are genuinely all three: Daggerheart
   has no poisoned, no prone, no blinded. Everything else a fiction produces
   is described rather than tracked, which is a deliberate choice by the game
   and not a gap for a system to fill in.

   They are here because a condition that lives only in somebody's memory is
   a condition that stops applying halfway through a fight. Foundry already
   has the surface — the token HUD, the effect ring, the combat tracker — and
   until now this system registered nothing into it, so a table using tokens
   had Foundry's own generic list (blinded, deaf, paralysis) and none of the
   three words the rules actually use.

   `vulnerable` is also *derived*: marking your last Stress makes you
   Vulnerable until you clear one, which is the one condition the sheet can
   know on its own. See `syncVulnerable` in documents/actor.ts. The other two
   are applied by a hand, because only the fiction knows.
   ─────────────────────────────────────────────────────────────────────── */

export interface ConditionDef {
  id: string;
  name: string;
  img: string;
  /** What it does, for the HUD tooltip. */
  rule: string;
}

export const CONDITIONS: ConditionDef[] = [
  {
    id: "vulnerable",
    name: "Vulnerable",
    img: `${SYSTEM_PATH}/assets/conditions/vulnerable.svg`,
    rule: "Rolls against a Vulnerable creature have advantage.",
  },
  {
    id: "hidden",
    name: "Hidden",
    img: `${SYSTEM_PATH}/assets/conditions/hidden.svg`,
    rule:
      "Rolls against a Hidden creature have disadvantage. You stop being Hidden " +
      "once an adversary sees you, or you move into their line of sight.",
  },
  {
    id: "restrained",
    name: "Restrained",
    img: `${SYSTEM_PATH}/assets/conditions/restrained.svg`,
    rule: "A Restrained creature can't move, but can still act.",
  },
];

/* ── advancement ─────────────────────────────────────────────────────── */

export const MAX_LEVEL = 10;

/**
 * Tier from level: 1 is its own tier, then 2–4, 5–7, 8–10. Tier drives
 * adversary selection, gear availability, and the tier-up trait unmark.
 */
export function tierOf(level: number): 1 | 2 | 3 | 4 {
  if (level >= 8) return 4;
  if (level >= 5) return 3;
  if (level >= 2) return 2;
  return 1;
}

/**
 * Proficiency granted automatically by level — one at creation, then one
 * more at each tier entry (2, 5, 8). Advancement options can buy more on
 * top; that surcharge lives on the actor as `proficiencyBonus`.
 */
export function baseProficiency(level: number): number {
  return tierOf(level);
}

/**
 * The advancement table, straight off the printed character guide, slot
 * counts included — because the slot count *is* the rule: an option with
 * three boxes can be taken three times over its tier and no more.
 *
 * `pair` marks the two options the printed sheet draws in a heavier frame.
 * That box means the option consumes *both* of the level's two choices
 * rather than one, which is a rule that lives nowhere else on the sheet.
 *
 * Tier 1 is not here. It is character creation, and it has no options.
 */
/**
 * What an advancement *is*, as against where it sits.
 *
 * Storage is keyed by index and stays that way — a character who marked
 * "2.1" marked the second option of tier 2 and must go on meaning that. But
 * an index cannot tell the derivation which box raises Evasion, and the
 * printed label is prose. So each row also carries an id, and the two upper
 * tiers reuse the same six ids as the first because they are the same six
 * options offered again.
 */
export type AdvancementId =
  | "traits"
  | "hitPoints"
  | "stress"
  | "experiences"
  | "domainCard"
  | "evasion"
  | "subclass"
  | "proficiency"
  | "multiclass";

export interface AdvancementOption {
  id: AdvancementId;
  /** The printed text of the option. */
  label: string;
  /** How many times it may be taken across the tier. */
  slots: number;
  /** Costs both of the level's choices. */
  pair?: boolean;
  /**
   * A number the sheet can apply on its own, and how much of it per mark.
   *
   * Only the options that are purely arithmetic have one. Two traits, two
   * Experiences, a domain card, a subclass card and a whole second class are
   * all *choices* — the sheet cannot know which, and a system that guessed
   * would be worse than one that asked. Those are handled in `apps/advance.ts`,
   * which asks; these are derived straight off the marks in `data/actors.ts`,
   * which is why marking one of them moves the rail immediately and
   * unmarking it moves it back.
   */
  grants?: 1;
}

export interface AdvancementTier {
  tier: 2 | 3 | 4;
  /** The levels this tier covers, as the sheet prints them. */
  levels: string;
  /** The level at which the tier opens. */
  at: number;
  /** What you are given on entering the tier, before any choices. */
  achievement: string;
  options: AdvancementOption[];
}

const TIER_OPTIONS = (cardCap: string): AdvancementOption[] => [
  { id: "traits", label: "Gain a +1 bonus to two unmarked character traits and mark them", slots: 3 },
  { id: "hitPoints", label: "Permanently gain one Hit Point slot", slots: 2, grants: 1 },
  { id: "stress", label: "Permanently gain one Stress slot", slots: 2, grants: 1 },
  { id: "experiences", label: "Permanently gain a +1 bonus to two Experiences", slots: 1 },
  { id: "domainCard", label: `Choose an additional domain card of your level or lower${cardCap}`, slots: 1 },
  { id: "evasion", label: "Permanently gain a +1 bonus to your Evasion", slots: 1, grants: 1 },
];

const UPGRADE_OPTIONS: AdvancementOption[] = [
  {
    id: "subclass",
    label: "Take an upgraded subclass card, then cross out the multiclass option for this tier",
    slots: 1,
  },
  { id: "proficiency", label: "Increase your Proficiency by +1", slots: 2, pair: true, grants: 1 },
  {
    id: "multiclass",
    label:
      "Multiclass — choose an additional class, then cross out an unused subclass upgrade and the other multiclass option",
    slots: 2,
    pair: true,
  },
];

export const ADVANCEMENT: AdvancementTier[] = [
  {
    tier: 2,
    levels: "2–4",
    at: 2,
    achievement:
      "At level 2, gain an additional Experience at +2 and a +1 bonus to your Proficiency.",
    options: TIER_OPTIONS(" (up to level 4)"),
  },
  {
    tier: 3,
    levels: "5–7",
    at: 5,
    achievement:
      "At level 5, gain an additional Experience at +2 and clear all marks on character traits. Then gain a +1 bonus to your Proficiency.",
    options: [...TIER_OPTIONS(" (up to level 7)"), ...UPGRADE_OPTIONS],
  },
  {
    tier: 4,
    levels: "8–10",
    at: 8,
    achievement:
      "At level 8, gain an additional Experience at +2 and clear all marks on character traits. Then gain a +1 bonus to your Proficiency.",
    options: [...TIER_OPTIONS(""), ...UPGRADE_OPTIONS],
  },
];

/**
 * Every level from 2 up buys two advancement choices. Not two *marks* —
 * see {@link choicesSpent}.
 */
export const CHOICES_PER_LEVEL = 2;

/** How many levels a tier covers, and therefore how many it can be paid for. */
const TIER_SPAN = 3;

/**
 * The choices a character's level entitles them to *within one tier*.
 *
 * Advancement is spent tier by tier and each tier only opens the levels it
 * covers, so a level-6 character has all six of tier 2's choices and four of
 * tier 3's — not ten in a pile. `t.at - 1` is the last level below the tier,
 * so the difference is how many of the tier's own levels have been reached,
 * and it is clamped at both ends: below the tier there is nothing, above it
 * the tier is finished and closed.
 */
export function choicesDue(level: number, tier: AdvancementTier): number {
  return CHOICES_PER_LEVEL * Math.min(TIER_SPAN, Math.max(0, level - (tier.at - 1)));
}

/**
 * What has been spent in one tier, counted in choices rather than in marks.
 *
 * They are different numbers, and the difference is the whole reason this is
 * a function. The two options the printed sheet draws in a heavier frame cost
 * *both* of the level's picks for a single mark — so a character who took
 * Proficiency has one box filled and two choices spent, and a panel that
 * counted boxes would tell them they were a choice behind when they were
 * exactly level.
 *
 * `taken` is the raw `system.advancement[tier]` object: option index against
 * how many times it was taken.
 */
export function choicesSpent(taken: Record<string, unknown>, tier: AdvancementTier): number {
  return tier.options.reduce(
    (n, o, i) => n + Number(taken?.[i] ?? 0) * (o.pair ? CHOICES_PER_LEVEL : 1),
    0,
  );
}

/**
 * How many times each option has been taken, summed across every tier.
 *
 * The same six options are offered again in tiers 3 and 4, so "how many Hit
 * Point slots has this character bought" is a question about the whole
 * advancement record rather than about one panel of it. This is what the
 * DataModel derives the numbers from — see `prepareBaseData` — which is why
 * marking a box moves the rail without anything having to write to the rail.
 *
 * `advancement` is the raw `system.advancement`: tier, then option index,
 * then the count.
 */
export function advancementTally(advancement: any): Partial<Record<AdvancementId, number>> {
  const out: Partial<Record<AdvancementId, number>> = {};
  for (const tier of ADVANCEMENT) {
    const row = advancement?.[tier.tier] ?? {};
    tier.options.forEach((o, i) => {
      const n = Number(row?.[i] ?? 0);
      if (n > 0) out[o.id] = (out[o.id] ?? 0) + n;
    });
  }
  return out;
}

/* ── resources ───────────────────────────────────────────────────────── */

/** Every character starts with six Stress and six Hope. */
export const DEFAULT_STRESS_MAX = 6;
export const DEFAULT_HOPE_MAX = 6;

/**
 * And with **two** Hope in the pool, which is not the same number.
 *
 * "You start with 2 Hope; mark these in the Hope field" — step 4. The pool's
 * schema default is zero, because zero is what you have after spending, and
 * nothing had ever put the opening two in. A character sheet made by hand has
 * been starting empty-handed since this system was written.
 */
export const STARTING_HOPE = 2;

/** Experiences start at +2 and are bought up from there. */
export const STARTING_EXPERIENCE_MODIFIER = 2;

/** Two Experiences at creation, two level-1 domain cards, one handful of gold. */
export const STARTING_EXPERIENCES = 2;
export const STARTING_DOMAIN_CARDS = 2;
export const STARTING_GOLD_HANDFULS = 1;

/**
 * The starting inventory everyone gets, whatever they are.
 *
 * A closed set the rules define, so it lives here rather than in the pack
 * source — these are not loot-table rows, they are a bulleted list in step 5,
 * and nothing rolls for them. The gold on that same list is a *number* rather
 * than an item and goes to `system.gold.handfuls`; the potion is a choice
 * between two rows of the consumable table; and the last line is the class's
 * own "X or Y", which every class stores on itself.
 */
export const STARTING_KIT: { name: string; description: string }[] = [
  { name: "Torch", description: "Useful for illuminating a dark room." },
  { name: "50 Feet of Rope", description: "Useful for climbing a wall or rappelling down a cliff." },
  { name: "Basic Supplies", description: "Tent, bedroll, tinderbox, rations, and the like." },
];

/** The two the book offers a choice between, by name. */
export const STARTING_POTIONS = ["Minor Health Potion", "Minor Stamina Potion"] as const;

/* ── character creation ──────────────────────────────────────────────────
   The book's nine steps, less the four this system does not walk you through.

   Steps 6 and 9 — background and connections — are prose, and prose belongs
   on the bio tab where you can take as long over it as you like rather than
   in a flow with a Next button. Step 4 is not a step at all: "Record
   Additional Character Information" is Evasion off your class, Hit Points off
   your class, Stress 6, Hope 2 and thresholds off your armour, every one of
   them a consequence of a step you already took. It is the creation window's
   rail, filling in as you choose, for the same reason the advancement marks
   *are* the record: a number and the panel it came from can never disagree if
   there is only one of them.

   The remaining six are numbered as the book numbers them where they line up,
   which is why `experiences` is 7 and `domains` is 8. A player holding the
   book open should not have to translate. */

export interface CreationStep {
  id: "class" | "heritage" | "traits" | "equipment" | "experiences" | "domains";
  /** The book's own step number. */
  printed: number;
  label: string;
  /** The one-line statement of what the step asks for. */
  hint: string;
}

export const CREATION_STEPS: CreationStep[] = [
  {
    id: "class",
    printed: 1,
    label: "Class",
    hint: "Choose a class, then a subclass. Its foundation card comes with it.",
  },
  {
    id: "heritage",
    printed: 2,
    label: "Heritage",
    hint: "An ancestry and a community. Mixed ancestry takes the top feature of one and the bottom of another.",
  },
  {
    id: "traits",
    printed: 3,
    label: "Traits",
    hint: "Place +2, +1, +1, 0, 0 and −1 across the six traits, in any order you like.",
  },
  {
    id: "equipment",
    printed: 5,
    label: "Equipment",
    hint: "A two-handed primary weapon, or a one-handed primary and a secondary. One set of armour, and your pack.",
  },
  {
    id: "experiences",
    printed: 7,
    label: "Experiences",
    hint: "Two words or phrases that say what your character has done. Both start at +2.",
  },
  {
    id: "domains",
    printed: 8,
    label: "Domain Cards",
    hint: "Two level 1 cards from your class's two domains — one from each, or two from one.",
  },
];

/* ── item types ──────────────────────────────────────────────────────── */

export const ITEM_TYPES = [
  "ancestry",
  "community",
  "class",
  "subclass",
  "domainCard",
  "weapon",
  "armor",
  "consumable",
  "loot",
  "feature",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

/** The Item subtypes that are drawn as cards rather than as list rows. */
export const CARD_ITEM_TYPES = ["ancestry", "community", "class", "subclass", "domainCard"] as const;

/** The Item subtypes a character carries in their inventory. */
export const GEAR_ITEM_TYPES = ["weapon", "armor", "consumable", "loot"] as const;

export const ACTOR_TYPES = ["character", "adversary", "environment", "companion"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

/* ── gold ────────────────────────────────────────────────────────────── */

/**
 * Gold is counted in handfuls, bags and chests, and the sheet has nine slots
 * for the first two because ten of a thing is one of the next thing up.
 */
export const GOLD_PER_TIER = 10;
export const GOLD_SLOTS = 9;
