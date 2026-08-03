/**
 * *Hope and Fear*'s equipment tables, transcribed.
 *
 * Chapter 2 of the second book, in the same shape and for the same reasons as
 * `equipment-tables.mjs` — read that file's header first; this one only records
 * what is different. Nothing fetches these either, so `equipment.mjs` derives
 * the documents from them at import time and there is no second copy to drift.
 *
 * ── the staples are a different six ───────────────────────────────────
 * The corebook reprints fifteen physical primaries, ten magic primaries, seven
 * secondaries and four armours across all four tiers. This book reprints its
 * own set — six, six, six and four — and they are *different* weapons, not a
 * continuation of the corebook's. A Katana is tier 1 here and has no corebook
 * printing at all. So this is its own table with its own staple list rather
 * than rows appended to the corebook's tiers, and `tools/check-equipment.mjs`
 * asserts the two sets separately: merging them would mean one check that could
 * be satisfied by either book's rows covering for the other's gap.
 *
 * ── the features are its own constants ────────────────────────────────
 * Recurring text is deduplicated here exactly as it is there — identical
 * printed text, never a meaning. Several names collide across the two books and
 * *do not* share a sentence, so they stay separate constants in separate files:
 *
 * - **Quick** is the same sentence in both. It is still redeclared here rather
 *   than imported, because importing it would make this file's correctness
 *   depend on the corebook's wording never changing, and the two books are two
 *   printings that happen to agree today.
 * - **Piercing** here is "treats the target's Major threshold as having a −2
 *   penalty"; the corebook has no Piercing at all.
 * - **Burning** here is "when you roll the *maximum* result on a damage die";
 *   the corebook's Firestaff prints "when you roll a 6", which is the same rule
 *   only because that weapon rolls d6s.
 * - **Versatile**, **Protective**, **Paired** and **Padded** are the same
 *   shapes with different numbers, so they take theirs as an argument.
 *
 * ── a choice the schema cannot hold, and why that is not a defect ─────
 * **The Shadowblade line deals "d8 phy/mag".** A weapon's damage carries one
 * type, and the reason this is fine is that the choice is not a property of the
 * weapon — it is the Otherworldly feature, printed on the same row, saying you
 * pick at the moment you hit. The row is filed magic because it is in the magic
 * table and requires a Spellcast trait; the feature is what states the option.
 * Passive trait penalties are structured modifiers. They change the derived
 * total while equipped and leave the player's chosen base value untouched.
 */

/* ── features ───────────────────────────────────────────────────────── */

const f = (name, description, mods = {}) => {
  const modifiers = [...(mods.modifiers ?? [])];
  if (mods.ev) modifiers.push({ target: "evasion", value: mods.ev });
  if (mods.as) modifiers.push({ target: "armorScore", value: mods.as });
  for (const [trait, value] of Object.entries(mods.traits ?? {})) {
    modifiers.push({ target: "trait", trait, value });
  }
  return { name, description, ...mods, modifiers };
};

/* Recurring across tiers — the staples' own features. */
const QUICK = f("Quick", "When you make an attack, you can mark a Stress to target another creature within range.");
const PIERCING = f("Piercing", "Damage dealt with this weapon treats the target’s Major threshold as having a −2 penalty.");
const OTHERWORLDLY = f("Otherworldly", "On a successful attack, you can deal physical or magic damage.");
const RICOCHET = f(
  "Ricochet",
  "When you throw this weapon, it returns to your hand. When you make an attack, you can mark a Stress to target another creature within Very Close range of the first target with that attack.",
);
const RELOADING = f(
  "Reloading",
  "After you make an attack, roll a d6. On a result of 1, you must mark a Stress to reload this weapon before you can fire it again.",
);
const AIMED = f(
  "Aimed",
  "Your attack has disadvantage if the target is within Very Close range of you or within Melee range of one of your allies. You can mark a Stress to ignore this penalty.",
);
const FOLLOW_UP = f(
  "Follow-Up",
  "On a successful attack with your primary weapon within Melee range, you can mark a Stress to gain a +1 bonus to your Proficiency for this attack.",
);
const STOCKPILED_S = f(
  "Stockpiled",
  "You can throw this weapon within Close range by making an attack roll using Finesse. You don’t have to retrieve it, as you always have another on hand.",
);
const FOCUSED = f("Focused", "+1 to primary weapon damage to targets within Very Close range", {
  modifiers: [{ target: "primaryDamage", value: 1, condition: "veryCloseWeapon" }],
});

/* Armour staples. */
const ENCHANTED_A = f("Enchanted", "Gain a bonus to your damage thresholds equal to your Spellcast trait.", {
  modifiers: [{ target: "thresholds", source: "spellcastTrait" }],
});
const LINED = f("Lined", "Mark a Stress to negate Minor damage.");
const CUMBERSOME = f("Cumbersome", "−1 to Finesse", { traits: { finesse: -1 } });
const BULKY = f(
  "Bulky",
  "−1 to Evasion; when you take Severe damage, you must mark a Stress.",
  { ev: -1 },
);

/* One-offs that happen to appear twice. */
const SCARY = f("Scary", "On a successful attack, the target must mark a Stress.");
const BOUNCING = f("Bouncing", "Mark any number of Stress to target that many additional creatures in range of the attack.");
const PARRY = f(
  "Parry",
  "When you are attacked, roll this weapon’s damage dice. If any of the attacker’s damage dice rolled the same value as your dice, the matching results are discarded from the attacker’s damage dice before the damage you take is totaled.",
);

/* The ones whose number changes by tier. */
const versatile = (stats) => f("Versatile", `This weapon can also be used with these statistics—${stats}`);
const paired = (n) => f("Paired", `+${n} to primary weapon damage to targets within Melee range`, {
  modifiers: [{ target: "primaryDamage", value: n, condition: "meleeWeapon" }],
});
const padded = (n) => f("Padded", `+${n} to damage thresholds`, {
  modifiers: [{ target: "thresholds", value: n }],
});
const protective = (n) => f("Protective", `+${n} to Armor Score`, { as: n });

/* ── rows ─────────────────────────────────────────────────────────────
   `w` is one physical weapon line, `wm` one magic line. Tier comes from the
   group it sits in; the physical/magic split comes from the group for primary
   weapons and from the row for secondaries, because the book prints the
   secondaries as one table with a mixed Damage column. */

const w = (name, trait, range, damage, burden, feature = null) => ({
  name,
  trait,
  range,
  damage,
  burden,
  feature,
});

const wm = (name, trait, range, damage, burden, feature = null) => ({
  ...w(name, trait, range, damage, burden, feature),
  magic: true,
});

const a = (name, major, severe, score, feature = null) => ({ name, major, severe, score, feature });

/* ══════════════════════════════════════════════════════════════════════
   PRIMARY WEAPONS — PHYSICAL

   Six staples per tier — Katana, Brass Knuckles, Scimitar, Twisted Dagger,
   Whipsword, Rope Dart — then the tier's own additions. Tier 1 is the six and
   nothing else, which is the book's own shape: a level-1 character buys from a
   short list.
   ══════════════════════════════════════════════════════════════════════ */

export const PRIMARY_PHYSICAL = {
  1: [
    w("Katana", "agility", "melee", "d10+3", "twoHanded", QUICK),
    w("Brass Knuckles", "strength", "melee", "d8+1", "oneHanded"),
    w("Scimitar", "presence", "melee", "d8+1", "oneHanded"),
    w("Twisted Dagger", "knowledge", "melee", "d8", "oneHanded", PIERCING),
    w("Whipsword", "finesse", "veryClose", "d8", "oneHanded", versatile("Finesse, Melee, d10.")),
    w("Rope Dart", "instinct", "close", "d6+1", "twoHanded"),
  ],
  2: [
    w("Improved Katana", "agility", "melee", "d10+6", "twoHanded", QUICK),
    w("Improved Brass Knuckles", "strength", "melee", "d8+4", "oneHanded"),
    w("Improved Scimitar", "presence", "melee", "d8+4", "oneHanded"),
    w("Improved Twisted Dagger", "knowledge", "melee", "d8+3", "oneHanded", PIERCING),
    w("Improved Whipsword", "finesse", "veryClose", "d8+3", "oneHanded", versatile("Finesse, Melee, d10+3.")),
    w("Improved Rope Dart", "instinct", "close", "d6+4", "twoHanded"),
    w("War Pick", "strength", "melee", "d8+3", "oneHanded",
      f("Deadly", "When you deal Severe damage, the target must mark an additional HP.")),
    w("Cane Sword", "finesse", "melee", "d8+4", "oneHanded",
      f("Retractable", "The blade can be hidden in the cane to avoid detection.")),
    w("Bladed Fan", "presence", "melee", "d8+3", "oneHanded", PARRY),
    w("Cyrurgien’s Scalpel", "knowledge", "melee", "d8+3", "oneHanded", SCARY),
    w("Lance", "instinct", "veryClose", "d10+5", "twoHanded", CUMBERSOME),
    w("Javelins", "agility", "veryClose", "d6+6", "oneHanded",
      f("Stockpiled", "You can throw this weapon at a target within Far range by making an attack roll using Agility without having to retrieve it, as you always have another one on hand.")),
  ],
  3: [
    w("Advanced Katana", "agility", "melee", "d10+9", "twoHanded", QUICK),
    w("Advanced Brass Knuckles", "strength", "melee", "d8+7", "oneHanded"),
    w("Advanced Scimitar", "presence", "melee", "d8+7", "oneHanded"),
    w("Advanced Twisted Dagger", "knowledge", "melee", "d8+6", "oneHanded", PIERCING),
    w("Advanced Whipsword", "finesse", "veryClose", "d8+6", "oneHanded", versatile("Finesse, Melee, d10+6.")),
    w("Advanced Rope Dart", "instinct", "close", "d6+7", "twoHanded"),
    w("Blitz Hammer", "strength", "melee", "d10+7", "twoHanded",
      f("Accelerator", "Once per scene, mark a Stress to move to Far range then make an attack. Gain a +1 bonus to your Proficiency on this attack.")),
    w("Platinum Estoc", "finesse", "melee", "d8+7", "oneHanded", PIERCING),
    w("Soldier’s Pike", "agility", "veryClose", "d10+5", "twoHanded",
      f("Braced", "When an adversary within this weapon’s range deals damage to you, you can mark 2 Stress to force them to mark a Hit Point.")),
    w("Chained Scythe", "instinct", "veryClose", "d10+5", "twoHanded", QUICK),
    w("Singing Sword", "presence", "veryClose", "d8+5", "oneHanded",
      f("Bolstering", "When you critically succeed on an attack, all PCs within Close range gain a Hope.")),
    w("Bladed Star", "knowledge", "close", "d8+7", "oneHanded",
      f("Rebounding", "When you throw this weapon, it returns to your hand. On a failed attack, you can reroll your attack with disadvantage.")),
  ],
  4: [
    w("Legendary Katana", "agility", "melee", "d10+12", "twoHanded", QUICK),
    w("Legendary Brass Knuckles", "strength", "melee", "d8+10", "oneHanded"),
    w("Legendary Scimitar", "presence", "melee", "d8+10", "oneHanded"),
    w("Legendary Twisted Dagger", "knowledge", "melee", "d8+9", "oneHanded", PIERCING),
    w("Legendary Whipsword", "finesse", "veryClose", "d8+9", "oneHanded", versatile("Finesse, Melee, d10+9.")),
    w("Legendary Rope Dart", "instinct", "close", "d6+10", "twoHanded"),
    w("Severed Dragon Claw", "instinct", "melee", "d10+11", "oneHanded",
      f("Destructive", "−1 to Agility; on a successful attack, all adversaries within Very Close range must mark a Stress.", { traits: { agility: -1 } })),
    w("Infinite Staff", "presence", "melee", "d10+9", "twoHanded",
      f("Extending", "You can increase the range of this weapon up to Very Far. You gain a −1 penalty to attack rolls for each step you increase the range by (such as Melee to Very Close, Very Close to Close, or Close to Far).")),
    w("Bec de Corbin", "agility", "veryClose", "d10+9", "twoHanded",
      f("Devastating", "Before you make an attack roll, you can mark a Stress to use a d20 as your damage die.")),
    w("Black Powder Serpentine", "strength", "far", "d8+12", "twoHanded",
      f("Incendiary", "−1 to Agility; on a successful attack, all creatures within Very Close range of the target must mark a Hit Point.", { traits: { agility: -1 } })),
    w("Clockwork Crossbow", "finesse", "far", "d6+11", "oneHanded", QUICK),
    w("Arquebus", "knowledge", "far", "d8+10", "twoHanded", RELOADING),
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   PRIMARY WEAPONS — MAGIC

   All require a Spellcast trait. The staples are Brightsword, Shadowblade,
   Enchanted Chakram, Casting Dagger, Runelock Pistol and Arcane Rifle.
   ══════════════════════════════════════════════════════════════════════ */

export const PRIMARY_MAGIC = {
  1: [
    w("Brightsword", "strength", "melee", "d10+3", "twoHanded"),
    w("Shadowblade", "presence", "melee", "d8", "oneHanded", OTHERWORLDLY),
    w("Enchanted Chakram", "finesse", "close", "d6+1", "oneHanded", RICOCHET),
    w("Casting Dagger", "instinct", "close", "d6", "oneHanded", versatile("Instinct, Melee, d8.")),
    w("Runelock Pistol", "knowledge", "far", "d6+3", "oneHanded", RELOADING),
    w("Arcane Rifle", "agility", "veryFar", "d10+3", "twoHanded", AIMED),
  ],
  2: [
    w("Improved Brightsword", "strength", "melee", "d10+6", "twoHanded"),
    w("Improved Shadowblade", "presence", "melee", "d8+3", "oneHanded", OTHERWORLDLY),
    w("Improved Enchanted Chakram", "finesse", "close", "d6+4", "oneHanded", RICOCHET),
    w("Improved Casting Dagger", "instinct", "close", "d6+3", "oneHanded", versatile("Instinct, Melee, d8+3.")),
    w("Improved Runelock Pistol", "knowledge", "far", "d6+6", "oneHanded", RELOADING),
    w("Improved Arcane Rifle", "agility", "veryFar", "d10+6", "twoHanded", AIMED),
    w("Enchanted Shillelagh", "strength", "melee", "d8+3", "oneHanded",
      f("Protective", "+1 to your Armor Score", { as: 1 })),
    w("Displacement Razor", "finesse", "melee", "d8+3", "twoHanded",
      f("Omnipresent", "You can make attacks against targets within Very Far range, but must do so with disadvantage.")),
    w("Spellbound Bangles", "knowledge", "melee", "d10+6", "twoHanded"),
    w("Fury Gem", "instinct", "close", "d8+3", "oneHanded",
      f("Burning", "When you roll the maximum result on a damage die, the target must mark a Stress.")),
    w("Enchanted Lute", "presence", "close", "d8+3", "twoHanded",
      f("Invigorating", "On a successful attack, roll a d4. On a result of 4, clear a Stress.")),
    w("Splintershaft Bow", "agility", "far", "d6+6", "twoHanded",
      f("Volleyed", "Spend a Hope to target a group of creatures within range. Targets you succeed against take half damage.")),
  ],
  3: [
    w("Advanced Brightsword", "strength", "melee", "d10+9", "twoHanded"),
    w("Advanced Shadowblade", "presence", "melee", "d8+6", "oneHanded", OTHERWORLDLY),
    w("Advanced Enchanted Chakram", "finesse", "close", "d6+7", "oneHanded", RICOCHET),
    w("Advanced Casting Dagger", "instinct", "close", "d6+6", "oneHanded", versatile("Instinct, Melee, d8+6.")),
    w("Advanced Runelock Pistol", "knowledge", "far", "d6+9", "oneHanded", RELOADING),
    w("Advanced Arcane Rifle", "agility", "veryFar", "d10+9", "twoHanded", AIMED),
    w("Rocket Maul", "strength", "melee", "d10+7", "twoHanded",
      f("Concussive", "On a successful attack, you can spend a Hope to knock the target back to Far range.")),
    w("Crystal Spear", "finesse", "veryClose", "d10+6", "oneHanded", PIERCING),
    w("Arc Wand", "presence", "close", "d8+6", "oneHanded", BOUNCING),
    w("Rime Scepter", "knowledge", "close", "d8+6", "oneHanded",
      f("Freezing", "When an attack from this weapon causes a target to mark 2 or more HP, they become temporarily Restrained.")),
    w("Gunblade", "agility", "far", "d6+6", "oneHanded", versatile("Agility, Melee, d8+6 phy.")),
    w("Staff of Augma", "instinct", "far", "d6+7", "oneHanded",
      f("Catalytic", "On a successful attack, you can mark a Stress to give an ally within Close range a +3 bonus to their next attack roll.")),
  ],
  4: [
    w("Legendary Brightsword", "strength", "melee", "d10+12", "twoHanded"),
    w("Legendary Shadowblade", "presence", "melee", "d8+9", "oneHanded", OTHERWORLDLY),
    w("Legendary Enchanted Chakram", "finesse", "close", "d6+10", "oneHanded", RICOCHET),
    w("Legendary Casting Dagger", "instinct", "close", "d6+9", "oneHanded", versatile("Instinct, Melee, d8+9.")),
    w("Legendary Runelock Pistol", "knowledge", "far", "d6+12", "oneHanded", RELOADING),
    w("Legendary Arcane Rifle", "agility", "veryFar", "d10+12", "twoHanded", AIMED),
    w("Starmetal Blade", "agility", "melee", "d8+10", "oneHanded",
      f("Serrated", "When you roll a 1 on a damage die, it deals 8 damage instead.")),
    w("Adder’s Fang", "finesse", "melee", "d8+9", "oneHanded",
      f("Venomous", "When you deal Major or greater damage with this weapon, the target becomes temporarily Vulnerable.")),
    w("Demon’s Edge", "presence", "melee", "d8+10", "oneHanded",
      f("Disturbing", "When you defeat a creature with this weapon, all adversaries within Close range must mark a Stress.")),
    w("Storm God’s Greataxe", "strength", "veryClose", "d10+9", "twoHanded", BOUNCING),
    w("Ethereal Zweihänder", "instinct", "veryClose", "d10+9", "twoHanded",
      f("Ethereal", "You must mark a Stress to conjure this weapon. It lasts until the end of the scene.")),
    w("Gravity Arbalest", "knowledge", "far", "d8+6", "twoHanded",
      f("Magnetic", "When you make an attack with this weapon, you can spend a Hope to force all adversaries within Very Close range of the target to make a Reaction Roll (16). Creatures who fail must mark a Stress and are pulled into Melee range of the target.")),
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   SECONDARY WEAPONS

   Every one is One-Handed, as in the corebook. Unlike the corebook's, this
   book's secondary table has a mixed Damage column — Rune Shield and Focus
   Runes deal magic damage at every tier — so the physical/magic split is per
   row here rather than per table. `wm` is that.
   ══════════════════════════════════════════════════════════════════════ */

export const SECONDARY = {
  1: [
    w("Hatchet", "agility", "melee", "d8", "oneHanded", FOLLOW_UP),
    w("Offhand Brass Knuckles", "strength", "melee", "d8", "oneHanded", paired(2)),
    w("Throwing Knives", "finesse", "melee", "d8", "oneHanded", STOCKPILED_S),
    w("Fighting Cloak", "presence", "melee", "d4", "oneHanded", padded(2)),
    wm("Rune Shield", "knowledge", "melee", "d4", "oneHanded", protective(1)),
    wm("Focus Runes", "instinct", "veryClose", "d6", "oneHanded", FOCUSED),
  ],
  2: [
    w("Improved Hatchet", "agility", "melee", "d8+2", "oneHanded", FOLLOW_UP),
    w("Improved Offhand Brass Knuckles", "strength", "melee", "d8+2", "oneHanded", paired(3)),
    w("Improved Throwing Knives", "finesse", "melee", "d8+2", "oneHanded", STOCKPILED_S),
    w("Improved Fighting Cloak", "presence", "melee", "d4+2", "oneHanded", padded(3)),
    wm("Improved Rune Shield", "knowledge", "melee", "d4+2", "oneHanded", protective(2)),
    wm("Improved Focus Runes", "instinct", "veryClose", "d6+2", "oneHanded", FOCUSED),
    w("Collapsible Baton", "strength", "melee", "d8", "oneHanded",
      f("Nonlethal", "When a target would mark any number of Hit Points from an attack with this weapon, they mark an equal number of Stress instead.")),
    wm("Eldritch Vambrace", "instinct", "melee", "d8", "oneHanded",
      f("Deflecting", "When you are attacked, you can mark an Armor Slot to gain a bonus to your Evasion equal to your Armor Score against the attack.")),
    w("Segmented Staff", "agility", "veryClose", "d6+4", "oneHanded",
      f("Double Duty", "+1 to Armor Score; +1 to primary weapon damage within Melee range", {
        as: 1, modifiers: [{ target: "primaryDamage", value: 1, condition: "meleeWeapon" }],
      })),
    w("Razor Wire", "finesse", "veryClose", "d6+3", "oneHanded",
      f("Entangling", "On a successful attack with your primary weapon against a target within Very Close range, you can spend a Hope to make the target temporarily Vulnerable.")),
  ],
  3: [
    w("Advanced Hatchet", "agility", "melee", "d8+4", "oneHanded", FOLLOW_UP),
    w("Advanced Offhand Brass Knuckles", "strength", "melee", "d8+4", "oneHanded", paired(4)),
    w("Advanced Throwing Knives", "finesse", "melee", "d8+4", "oneHanded", STOCKPILED_S),
    w("Advanced Fighting Cloak", "presence", "melee", "d4+4", "oneHanded", padded(4)),
    wm("Advanced Rune Shield", "knowledge", "melee", "d4+4", "oneHanded", protective(3)),
    wm("Advanced Focus Runes", "instinct", "veryClose", "d6+4", "oneHanded", FOCUSED),
    w("Tinker’s Hammer", "strength", "melee", "d8+4", "oneHanded",
      f("Trusty", "+1 to attack rolls made with your primary weapon", {
        modifiers: [{ target: "primaryAttack", value: 1 }],
      })),
    wm("Vorpal Shard", "knowledge", "melee", "d4", "oneHanded",
      f("Targeted", "When you fail a weapon attack, you can spend a Hope to succeed on your next weapon attack.")),
    wm("Soul Chain", "presence", "veryClose", "d6+5", "oneHanded",
      f("Draining", "On a successful attack, you can spend a Hope to force the target to mark a Stress. If they do, you clear a Stress.")),
    w("War Dart", "agility", "far", "d6+5", "oneHanded", versatile("Agility, Melee, d8+5.")),
  ],
  4: [
    w("Legendary Hatchet", "agility", "melee", "d8+6", "oneHanded", FOLLOW_UP),
    w("Legendary Offhand Brass Knuckles", "strength", "melee", "d8+6", "oneHanded", paired(5)),
    w("Legendary Throwing Knives", "finesse", "melee", "d8+6", "oneHanded", STOCKPILED_S),
    w("Legendary Fighting Cloak", "presence", "melee", "d4+6", "oneHanded", padded(5)),
    wm("Legendary Rune Shield", "knowledge", "melee", "d4+6", "oneHanded", protective(4)),
    wm("Legendary Focus Runes", "instinct", "veryClose", "d6+6", "oneHanded", FOCUSED),
    w("Void Needle", "finesse", "melee", "d4+6", "oneHanded",
      f("Inverted", "When you roll a weapon attack with Fear, you gain a Hope.")),
    wm("Echo Blade", "presence", "melee", "d4+6", "oneHanded",
      f("Doubled Up", "When you succeed on an attack with your primary weapon, you can deal damage to another target within Melee range.")),
    wm("Möbius Orb", "knowledge", "melee", "d8+6", "oneHanded",
      f("Recursive", "When you roll the maximum value on a damage die, roll an additional damage die and add the result to the total damage. This feature can trigger repeatedly.")),
    wm("Blackblood Tendril", "instinct", "close", "d6+8", "oneHanded",
      f("Poisonous", "When a target marks any number of Hit Points from an attack you rolled with Fear, they mark an equal number of Stress.")),
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   ARMOR

   Four staples per tier — Mage Robes, Brigandine, Scale Mail, Banded — then
   the tier's own. Tier 1 is the four and nothing else.
   ══════════════════════════════════════════════════════════════════════ */

export const ARMOR = {
  1: [
    a("Mage Robes", 4, 10, 2, ENCHANTED_A),
    a("Brigandine Armor", 6, 12, 3, LINED),
    a("Scale Mail Armor", 7, 14, 3, CUMBERSOME),
    a("Banded Armor", 8, 16, 4, BULKY),
  ],
  2: [
    a("Improved Mage Robes", 6, 15, 3, ENCHANTED_A),
    a("Improved Brigandine Armor", 9, 19, 4, LINED),
    a("Improved Scale Mail Armor", 11, 23, 4, CUMBERSOME),
    a("Improved Banded Armor", 13, 27, 5, BULKY),
    a("Enchanter’s Robes", 9, 20, 4,
      f("Mnemonic", "Once per scene, you can recall a domain card from your vault without paying its Recall Cost.")),
    a("Hawkguard’s Mantle", 9, 20, 4,
      f("Gliding", "You can glide up to Far range and are immune to damage from falling.")),
    a("Spidersilk Tunic", 9, 20, 4,
      f("Wall-Crawling", "+1 Evasion; you can walk on walls as easily as on the ground.", { ev: 1 })),
    a("Stormthread Habit", 9, 20, 4,
      f("Absorbing", "Once per scene when you take magic damage, you can clear an Armor Slot.")),
    a("Wyrdwood Splint Armor", 10, 21, 5,
      f("Quick-Striding", "You can’t be Restrained and can move up to Far range as part of an action roll.")),
    a("Trollhide Cuirass", 11, 23, 5,
      f("Self-Healing", "When you take a rest, clear an Armor Slot.")),
    a("Gilded Sunplate", 12, 26, 5,
      f("Resplendent", "Once per scene when you spend Hope, you can clear an Armor Slot.")),
  ],
  3: [
    a("Advanced Mage Robes", 8, 22, 4, ENCHANTED_A),
    a("Advanced Brigandine Armor", 11, 26, 5, LINED),
    a("Advanced Scale Mail Armor", 13, 30, 5, CUMBERSOME),
    a("Advanced Banded Armor", 15, 34, 6, BULKY),
    /* The only armour in either book whose Armor Score is a *rule* rather than
       a number: Granminster's is 2 plus your Presence. `baseScore` holds the
       printed 2 and the feature states the rest, which is the same treatment
       Mage Robes' Enchanted gets for thresholds — a modifier that reads off a
       trait has nowhere in the schema to live, and inventing a field for two
       items would mean the sheet deriving a number the player would then have
       to check against the card anyway. */
    a("Granminster’s Finery", 11, 27, 2,
      f("Magnificent", "Gain a bonus to your Armor Score equal to your Presence.", {
        modifiers: [{ target: "armorScore", source: "trait", trait: "presence" }],
      })),
    a("Astral Raiment", 11, 27, 5,
      f("Stellar", "Mark a Stress to gain advantage on a Spellcast roll.")),
    a("Cloverweave Cloak", 11, 27, 5,
      f("Fortune-Favored", "Once per scene, you can change a failure with Hope into a success with Fear.")),
    a("Skywarden’s Lamellar", 11, 27, 5, f("Vigilant", "+2 to Evasion", { ev: 2 })),
    a("Bloodstone Plate Armor", 13, 35, 6,
      f("Bloodthirsty", "When you critically succeed on a weapon attack within Melee range, clear a Hit Point.")),
    a("Deep-Forged Coral Armor", 13, 35, 6,
      f("Aquatic", "You can breathe underwater and gain advantage on Agility Rolls while submerged.")),
  ],
  4: [
    a("Legendary Mage Robes", 10, 31, 5, ENCHANTED_A),
    a("Legendary Brigandine Armor", 13, 35, 6, LINED),
    a("Legendary Scale Mail Armor", 15, 39, 6, CUMBERSOME),
    a("Legendary Banded Armor", 17, 43, 7, BULKY),
    a("Darkweave Shroud", 13, 36, 5,
      f("Ghostwalker", "Once per rest, mark a Stress to move up to Close range through solid objects.")),
    a("Godbound Laminar", 13, 36, 6, f("Divine", "When you mark an Armor Slot, gain a Hope.")),
    a("Circle-Forged Dreadplate", 14, 38, 6,
      f("Accursed", "When you mark any number of Hit Points from an attack, roll a d4. On a result of 4, the attacker must mark an equal number of Stress.")),
    /* The one piece of gear in either book that moves `loadoutLimit`, which is
       exactly why that stopped being a constant and became a field the sheet
       reads — see the adjust tab. Nothing here applies it: the number is on the
       actor and the card says to change it. */
    a("Rune-Forged Exosuit", 12, 39, 7,
      f("Attuned", "The maximum number of domain cards in your loadout is reduced by one, but you gain a bonus to your damage thresholds equal to your tier.", {
        modifiers: [
          { target: "loadoutLimit", value: -1 },
          { target: "thresholds", source: "tier" },
        ],
      })),
    a("Hallowed Heroplate", 13, 35, 7,
      f("Blessed", "Once per long rest, you can spend any number of Hope before you make the Risk It All death move. You gain a bonus to the result of your Hope Die equal to the number of Hope spent.")),
    a("Resonant Harness", 15, 40, 7,
      f("Vitreous", "When you would take Severe or greater damage, you can mark 2 Armor Slots to negate that damage. If you do, you gain a −5 penalty to your damage thresholds until you choose to repair your armor as a downtime move.")),
  ],
};

/* The staples, named rather than counted, for `tools/check-equipment.mjs`.
   A count catches a deleted row; what actually happens when a table is copied
   by hand is that one row gets transcribed twice and its neighbour not at all,
   where the count is right and the table is wrong. See the corebook check for
   the same argument at length. */
export const STAPLES = {
  primaryPhysical: ["Katana", "Brass Knuckles", "Scimitar", "Twisted Dagger", "Whipsword", "Rope Dart"],
  primaryMagic: ["Brightsword", "Shadowblade", "Enchanted Chakram", "Casting Dagger", "Runelock Pistol", "Arcane Rifle"],
  secondary: ["Hatchet", "Offhand Brass Knuckles", "Throwing Knives", "Fighting Cloak", "Rune Shield", "Focus Runes"],
  armor: ["Mage Robes", "Brigandine Armor", "Scale Mail Armor", "Banded Armor"],
};
