/** Structured passive modifiers carried by owned Items and feature blocks. */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { isBrawlerStrike } from "../brawler.ts";
import { TRAITS, type Trait } from "../config.ts";
import { temporaryModifiers } from "../effects.ts";

export interface PassiveModifier {
  target: string;
  value?: number;
  source?: string;
  trait?: string;
  scale?: number;
  condition?: string;
  minimum?: number;
}

export interface ActiveModifier extends PassiveModifier {
  item: any;
  label: string;
}

const featureBlocks = (item: any): any[] => {
  const s = item?.system ?? {};
  switch (item?.type) {
    case "class": return [...(s.classFeatures ?? []), s.hopeFeature];
    case "subclass":
    case "transformation": return s.features ?? [];
    case "ancestry": return [s.topFeature, s.bottomFeature];
    case "community":
    case "weapon":
    case "armor": return [s.feature];
    default: return [];
  }
};

const m = (target: string, value = 0, extra: Partial<PassiveModifier> = {}): PassiveModifier =>
  ({ target, value, ...extra });

/**
 * Embedded Items copied before structured modifiers existed cannot be fixed by
 * rebuilding a compendium. This exact-name registry gives those copies the
 * same authored facts. It is a compatibility table, not prose parsing.
 */
function legacyItemModifiers(item: any): PassiveModifier[] {
  const key = `${item?.type}:${item?.name}`;
  const domain = (target: string, value: number, extra = {}) =>
    m(target, value, { condition: "domain", minimum: 4, ...extra });
  const byKey: Record<string, PassiveModifier[]> = {
    "domainCard:Arcana-Touched": [domain("spellcastRoll", 1)],
    "domainCard:Blade-Touched": [domain("attackRoll", 2), domain("severeThreshold", 4)],
    "domainCard:Bone-Touched": [domain("trait", 1, { trait: "agility" })],
    "domainCard:Splendor-Touched": [domain("severeThreshold", 3)],
    "domainCard:Valor-Touched": [domain("armorScore", 1)],
    "domainCard:Fortified Armor": [m("thresholds", 2, { condition: "armor" })],
    "domainCard:Untouchable": [m("evasion", 0, { source: "trait", trait: "agility", scale: 0.5 })],
    "domainCard:Bare Bones": [m("bareBones", 1, { condition: "noArmor" })],
    "domainCard:Armorer": [m("armorScore", 1, { condition: "armor" })],
    "domainCard:Rise Up": [m("severeThreshold", 0, { source: "proficiency" })],
    "domainCard:Eldritch Flesh": [m("thresholds", 0, { source: "markedStress" })],
    "domainCard:Voice of Reason": [m("damageProficiency", 1, { condition: "stressFull" })],
    "domainCard:Body Basher": [m("damageRoll", 0, { source: "trait", trait: "strength", condition: "meleeWeapon" })],
    "domainCard:Cruel Precision": [m("damageRoll", 0, { source: "maxAgilityFinesse", condition: "weapon" })],
    "loot:Stride Relic": [m("trait", 1, { trait: "agility" })],
    "loot:Bolster Relic": [m("trait", 1, { trait: "strength" })],
    "loot:Control Relic": [m("trait", 1, { trait: "finesse" })],
    "loot:Attune Relic": [m("trait", 1, { trait: "instinct" })],
    "loot:Charm Relic": [m("trait", 1, { trait: "presence" })],
    "loot:Enlighten Relic": [m("trait", 1, { trait: "knowledge" })],
  };
  return byKey[key] ?? [];
}

function legacyFeatureModifiers(item: any, feature: any): PassiveModifier[] {
  const name = feature?.name;
  const tier = Number(item?.system?.tier ?? 1);
  const exact: Record<string, PassiveModifier[]> = {
    Shell: [m("thresholds", 0, { source: "proficiency" })],
    Endurance: [m("hitPoints", 1)],
    "High Stamina": [m("stress", 1)],
    Nimble: [m("evasion", 1)],
    Stoneskin: [m("armorScore", 1), m("thresholds", 1)],
    Gifted: [m("actionRoll", 1), m("reactionRoll", 1), m("damageRoll", 1)],
    Unwavering: [m("thresholds", 1)],
    Unrelenting: [m("thresholds", 2)],
    Undaunted: [m("thresholds", 3)],
    "At Ease": [m("stress", 1)],
    "Fleeting Shadow": [m("evasion", 1)],
    Ascendant: [m("severeThreshold", 4)],
    Rugged: [m("severeThreshold", 3)],
    Battlemage: [m("hitPoints", 1)],
    "Conjure Shield": [m("evasion", 0, { source: "proficiency", condition: "hope", minimum: 2 })],
    "Combat Training": [m("damageRoll", 0, { source: "level", condition: "physicalWeapon" })],
    "I Am the Weapon": [m("evasion", 1, { condition: "noWeapons" })],
  };
  if (exact[name]) return exact[name];
  if (item?.type === "weapon" && name === "Reliable") return [m("ownAttack", 1)];
  if (name === "Cumbersome") return [m("trait", -1, { trait: "finesse" })];
  if (name === "Very Heavy") return [m("trait", -1, { trait: "agility" })];
  if (name === "Paired") return [m("primaryDamage", tier + 1, { condition: "meleeWeapon" })];
  if (name === "Padded") return [m("thresholds", tier + 1)];
  if (name === "Focused") return [m("primaryDamage", 1, { condition: "veryCloseWeapon" })];
  if (name === "Double Duty") return [m("primaryDamage", 1, { condition: "meleeWeapon" })];
  if (name === "Sharpwing") return [m("ownDamage", 0, { source: "trait", trait: "agility" })];
  if (name === "Brave") return [m("severeThreshold", 3)];
  if (name === "Destructive" || name === "Incendiary") return [m("trait", -1, { trait: "agility" })];
  if (name === "Gilded") return [m("trait", 1, { trait: "presence" })];
  if (name === "Channeling") return [m("spellcastRoll", 1)];
  if (name === "Difficult") return [m("trait", -1)];
  if (name === "Bonded") return [m("ownDamage", 0, { source: "level" })];
  if (name === "Enchanted") return [m("thresholds", 0, { source: "spellcastTrait" })];
  if (name === "Trusty") return [m("primaryAttack", 1)];
  if (name === "Magnificent") return [m("armorScore", 0, { source: "trait", trait: "presence" })];
  if (name === "Attuned") return [m("loadoutLimit", -1), m("thresholds", 0, { source: "tier" })];
  return [];
}

/** A document is passive only while it is in the rules state that makes it live. */
export const passiveItemActive = (item: any): boolean => {
  if (item?.type === "domainCard") return !!item.system?.inLoadout;
  if (item?.type === "weapon" || item?.type === "armor") return !!item.system?.equipped;
  // Consumables describe an effect after use. Merely carrying one is never
  // evidence that the timed effect is running.
  if (item?.type === "consumable") return false;
  if (item?.type === "loot") return Number(item.system?.quantity ?? 1) > 0;
  return true;
};

const conditionMet = (actor: any, item: any, m: PassiveModifier): boolean => {
  const items = [...(actor?.items ?? [])];
  const armor = items.some((i: any) => i.type === "armor" && i.system?.equipped);
  switch (m.condition ?? "always") {
    case "armor": return armor;
    case "noArmor": return !armor;
    case "noPrimary":
      return !items.some((i: any) => i.type === "weapon" && i.system?.equipped && i.system?.slot === "primary");
    /* "While this weapon is active" — the Brawler's, and the only user of
       this condition. It excludes the Brawler's Strike itself, because the
       strike *is* what being active means: counted as an ordinary weapon it
       would switch off the Evasion bonus it is the condition for, and the
       feature would pay out only in the moment before it took effect. */
    case "noWeapons":
      return !items.some(
        (i: any) => i.type === "weapon" && i.system?.equipped && !isBrawlerStrike(i),
      );
    case "hope": return Number(actor.system?.resources?.hope?.value ?? 0) >= Number(m.minimum ?? 0);
    case "stressFull": {
      const stress = actor.system?.resources?.stress;
      return !!stress && stress.max > 0 && stress.marked >= stress.max;
    }
    case "domain": {
      const domain = item.system?.domain;
      return items.filter((i: any) => i.type === "domainCard" && i.system?.inLoadout && i.system?.domain === domain).length >= Number(m.minimum ?? 4);
    }
    default: return true;
  }
};

export function activeModifiers(actor: any): ActiveModifier[] {
  const out: ActiveModifier[] = [];

  /* Temporary effects first, and they are a genuinely different population
     from everything below: an Item is a passive because you are *holding* it,
     and an effect is a passive because somebody granted it and it has not
     expired yet. `grant-effect` is what creates them and `effects.ts` is what
     sweeps them at the rest and scene seams.

     They carry our own `modifiers` rather than Foundry `changes`, and the
     reason is the `condition` field: half the interesting passives in this
     corpus are gated on loadout composition or a track's state, and an AE
     change is unconditional by construction. An always-on version of "while
     you have 4+ Grace cards in your loadout" is silently wrong exactly where
     the rule is most specific. */
  for (const m of temporaryModifiers(actor)) {
    if (conditionMet(actor, m.item, m)) out.push(m as ActiveModifier);
  }

  for (const item of [...(actor?.items ?? [])]) {
    if (!passiveItemActive(item)) continue;
    const own = item.system?.modifiers?.length
      ? item.system.modifiers
      : legacyItemModifiers(item);
    for (const m of own) if (conditionMet(actor, item, m)) out.push({ ...m, item, label: item.name });
    for (const f of featureBlocks(item)) {
      const featureModifiers = f?.modifiers?.length
        ? f.modifiers
        : legacyFeatureModifiers(item, f);
      for (const m of featureModifiers) {
        if (conditionMet(actor, item, m)) out.push({ ...m, item, label: f.name || item.name });
      }
    }
  }
  return out;
}

/** Resolve the authored source against the actor's current derived values. */
export function modifierValue(actor: any, m: PassiveModifier): number {
  const s = actor.system ?? {};
  let source = 0;
  switch (m.source ?? "fixed") {
    case "fixed": source = 0; break;
    case "proficiency": source = Number(s.proficiency ?? 0); break;
    case "tier": source = Number(s.tier ?? 1); break;
    case "level": source = Number(s.level ?? 1); break;
    case "markedStress": source = Number(s.resources?.stress?.marked ?? 0); break;
    case "trait": source = Number(s.traits?.[m.trait ?? ""]?.total ?? s.traits?.[m.trait ?? ""]?.value ?? 0); break;
    case "spellcastTrait": {
      const trait = s.spellcastTrait;
      source = Number(s.traits?.[trait]?.total ?? s.traits?.[trait]?.value ?? 0);
      break;
    }
    case "maxAgilityFinesse":
      source = Math.max(
        Number(s.traits?.agility?.total ?? s.traits?.agility?.value ?? 0),
        Number(s.traits?.finesse?.total ?? s.traits?.finesse?.value ?? 0),
      );
      break;
    default: source = 0;
  }
  const n = source * Number(m.scale ?? 1) + Number(m.value ?? 0);
  // Daggerheart rounds fractional derived values up.
  return Number.isFinite(n) ? Math.ceil(n) : 0;
}

export const modifierTotal = (actor: any, target: string): number =>
  activeModifiers(actor)
    .filter((m) => m.target === target)
    .reduce((n, m) => n + modifierValue(actor, m), 0);

export function traitPassiveTotal(actor: any, trait: Trait): number {
  return activeModifiers(actor)
    .filter((m) => m.target === "trait" && (!m.trait || m.trait === trait))
    .reduce((n, m) => n + modifierValue(actor, m), 0);
}

/** Modifiers belonging to the weapon itself, plus effects aimed at its slot. */
export function weaponModifierTerms(actor: any, weapon: any, kind: "attack" | "damage") {
  const slotTarget = weapon?.system?.slot === "primary" ? `primary${kind === "attack" ? "Attack" : "Damage"}` : "";
  const ownTarget = kind === "attack" ? "ownAttack" : "ownDamage";
  return activeModifiers(actor)
    .filter((m) =>
      (m.item?.id === weapon?.id && m.target === ownTarget) ||
      (!!slotTarget && m.target === slotTarget),
    )
    .filter((m) => weaponCondition(m, weapon))
    .map((m) => ({ k: m.label.toLowerCase(), v: modifierValue(actor, m) }))
    .filter((m) => m.v !== 0);
}

const rangeRank: Record<string, number> = { melee: 0, veryClose: 1, close: 2, far: 3, veryFar: 4 };

function weaponCondition(m: PassiveModifier, weapon: any): boolean {
  switch (m.condition) {
    case "weapon": return !!weapon;
    case "physicalWeapon": return weapon?.system?.damage?.type === "physical";
    case "meleeWeapon": return rangeRank[weapon?.system?.range] === 0;
    case "veryCloseWeapon": return (rangeRank[weapon?.system?.range] ?? Infinity) <= 1;
    default: return true;
  }
}

export function rollModifierTerms(actor: any, target: string, weapon: any = null) {
  return activeModifiers(actor)
    .filter((m) => m.target === target && weaponCondition(m, weapon))
    .map((m) => ({ k: m.label.toLowerCase(), v: modifierValue(actor, m) }))
    .filter((m) => m.v !== 0);
}

/** Targets that are useful to consumers outside the DataModel derivation. */
export const ROLL_TARGETS = new Set([
  "actionRoll", "reactionRoll", "attackRoll", "damageRoll", "spellcastRoll",
  "ownAttack", "ownDamage", "primaryAttack", "primaryDamage",
]);

export const isTrait = (value: string): value is Trait => (TRAITS as readonly string[]).includes(value);
