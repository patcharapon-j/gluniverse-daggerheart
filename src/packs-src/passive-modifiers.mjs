/**
 * Item-level passive self modifiers.
 *
 * Feature-level modifiers live beside their feature in the authored tables so
 * mixed ancestry and copied feature blocks carry the rule with them. These are
 * the exceptions whose rules text is the Item itself (domain cards and loot).
 */

const fixed = (target, value, extra = {}) => ({ target, value, ...extra });
const from = (target, source, extra = {}) => ({ target, source, ...extra });
const domain = (target, value, extra = {}) => fixed(target, value, { condition: "domain", minimum: 4, ...extra });

export const ITEM_MODIFIERS = {
  "domainCard:Arcana-Touched": [domain("spellcastRoll", 1)],
  "domainCard:Blade-Touched": [domain("attackRoll", 2), domain("severeThreshold", 4)],
  "domainCard:Bone-Touched": [domain("trait", 1, { trait: "agility" })],
  "domainCard:Splendor-Touched": [domain("severeThreshold", 3)],
  "domainCard:Valor-Touched": [domain("armorScore", 1)],

  /* The campaign frame's two. Only the Spellcast half is a modifier — the
     other bullet is "once per rest you don't gain a Mark", which is a budget
     and lives in `card-resources.mjs` where the other budgets live. */
  "domainCard:Root-Touched": [domain("spellcastRoll", 1)],
  "domainCard:Void-Touched": [domain("spellcastRoll", 1)],

  "domainCard:Fortified Armor": [fixed("thresholds", 2, { condition: "armor" })],
  "domainCard:Untouchable": [from("evasion", "trait", { trait: "agility", scale: 0.5 })],
  "domainCard:Bare Bones": [fixed("bareBones", 1, { condition: "noArmor" })],
  "domainCard:Armorer": [fixed("armorScore", 1, { condition: "armor" })],
  "domainCard:Rise Up": [from("severeThreshold", "proficiency")],
  "domainCard:Eldritch Flesh": [from("thresholds", "markedStress")],
  "domainCard:Voice of Reason": [fixed("damageProficiency", 1, { condition: "stressFull" })],
  "domainCard:Body Basher": [from("damageRoll", "trait", { trait: "strength", condition: "meleeWeapon" })],
  "domainCard:Cruel Precision": [from("damageRoll", "maxAgilityFinesse", { condition: "weapon" })],

  // Relics are passive while carried. Consumables are intentionally absent:
  // ownership cannot tell whether a potion's timed effect is currently live.
  "loot:Stride Relic": [fixed("trait", 1, { trait: "agility" })],
  "loot:Bolster Relic": [fixed("trait", 1, { trait: "strength" })],
  "loot:Control Relic": [fixed("trait", 1, { trait: "finesse" })],
  "loot:Attune Relic": [fixed("trait", 1, { trait: "instinct" })],
  "loot:Charm Relic": [fixed("trait", 1, { trait: "presence" })],
  "loot:Enlighten Relic": [fixed("trait", 1, { trait: "knowledge" })],

};

export const modifiersFor = (type, name) =>
  (ITEM_MODIFIERS[`${type}:${name}`] ?? []).map((m) => ({ source: "fixed", scale: 1, condition: "always", minimum: 0, value: 0, trait: "", ...m }));
