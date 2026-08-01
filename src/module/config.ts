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
export interface AdvancementOption {
  /** The printed text of the option. */
  label: string;
  /** How many times it may be taken across the tier. */
  slots: number;
  /** Costs both of the level's choices. */
  pair?: boolean;
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
  { label: "Gain a +1 bonus to two unmarked character traits and mark them", slots: 3 },
  { label: "Permanently gain one Hit Point slot", slots: 2 },
  { label: "Permanently gain one Stress slot", slots: 2 },
  { label: "Permanently gain a +1 bonus to two Experiences", slots: 1 },
  { label: `Choose an additional domain card of your level or lower${cardCap}`, slots: 1 },
  { label: "Permanently gain a +1 bonus to your Evasion", slots: 1 },
];

const UPGRADE_OPTIONS: AdvancementOption[] = [
  {
    label: "Take an upgraded subclass card, then cross out the multiclass option for this tier",
    slots: 1,
  },
  { label: "Increase your Proficiency by +1", slots: 2, pair: true },
  {
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

/* ── resources ───────────────────────────────────────────────────────── */

/** Every character starts with six Stress and six Hope. */
export const DEFAULT_STRESS_MAX = 6;
export const DEFAULT_HOPE_MAX = 6;

/** Experiences start at +2 and are bought up from there. */
export const STARTING_EXPERIENCE_MODIFIER = 2;

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
