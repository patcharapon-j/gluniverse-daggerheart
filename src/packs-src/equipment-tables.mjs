/**
 * The printed equipment tables, transcribed.
 *
 * This is a **snapshot**, in the sense `official-cards.json` is one: the source
 * of truth for what a weapon does, committed so the build never touches the
 * network. It is not fetched, and there is no tool that could fetch it —
 * the official Card Creator publishes *cards*, and a longsword is not a card.
 * Chapter 2 of the corebook is the only place these numbers exist, so they are
 * typed in, once, here, and `tools/check-equipment.mjs` is what stops them
 * rotting.
 *
 * ── the shape ─────────────────────────────────────────────────────────
 * A row reads like the row it came from: name, trait, range, damage, burden,
 * feature. Damage is written the way the table prints it — `"d10+3"` — and
 * split by the builder, because a transcription that has already been parsed
 * is a transcription you cannot check against the page.
 *
 * ── why the features are constants ────────────────────────────────────
 * *Reliable: +1 to attack rolls* is printed identically on eleven weapons
 * across four tiers. Repeating the string eleven times is eleven chances to
 * typo one of them, and a typo in the eighth copy is invisible — it looks
 * exactly like the other ten until somebody reads all eleven. So the recurring
 * features are named once and the varying ones take their number as an
 * argument. What is deduplicated here is *identical printed text*, never a
 * meaning: `PAINFUL_W` and `PAINFUL_A` are two different sentences that happen
 * to share a name on the page, and they stay two constants.
 *
 * ── the numbers a feature moves ───────────────────────────────────────
 * Every passive number rides on the feature as structured `modifiers`, rather
 * than being parsed out of its sentence. The legacy `ev` and `as` values stay
 * on Evasion and Armor Score features so characters holding older embedded
 * copies still resolve correctly. The same structure now covers traits,
 * thresholds and weapon-roll modifiers without rewriting the chosen base stat.
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

/* Weapon features, alphabetical within their kind. */
const BRUTAL = f("Brutal", "When you roll the maximum value on a damage die, roll an additional damage die.");
const CUMBERSOME = f("Cumbersome", "−1 to Finesse", { traits: { finesse: -1 } });
const DEADLY = f("Deadly", "When you deal Severe damage, the target must mark an additional HP.");
const HEAVY = f("Heavy", "−1 to Evasion", { ev: -1 });
const MASSIVE = f(
  "Massive",
  "−1 to Evasion; on a successful attack, roll an additional damage die and discard the lowest result.",
  { ev: -1 },
);
const PAINFUL_W = f("Painful", "Each time you make a successful attack, you must mark a Stress.");
const POWERFUL = f("Powerful", "On a successful attack, roll an additional damage die and discard the lowest result.");
const QUICK = f("Quick", "When you make an attack, you can mark a Stress to target another creature within range.");
const RELIABLE = f("Reliable", "+1 to attack rolls", { modifiers: [{ target: "ownAttack", value: 1 }] });
const RELOADING = f(
  "Reloading",
  "After you make an attack, roll a d6. On a result of 1, you must mark a Stress to reload this weapon before you can fire it again.",
);
const RETURNING = f(
  "Returning",
  "When this weapon is thrown within its range, it appears in your hand immediately after the attack.",
);
const SCARY = f("Scary", "On a successful attack, the target must mark a Stress.");
const TIMEBENDING = f("Timebending", "You choose the target of your attack after making your attack roll.");

/* The ones whose number changes by tier. */
const versatile = (stats) => f("Versatile", `This weapon can also be used with these statistics—${stats}`);
const paired = (n) => f("Paired", `+${n} to primary weapon damage to targets within Melee range`, {
  modifiers: [{ target: "primaryDamage", value: n, condition: "meleeWeapon" }],
});
const protective = (n) => f("Protective", `+${n} to Armor Score`, { as: n });
const barrier = (n) => f("Barrier", `+${n} to Armor Score; −1 to Evasion`, { as: n, ev: -1 });

/* Armor features. */
const FLEXIBLE = f("Flexible", "+1 to Evasion", { ev: 1 });
const VERY_HEAVY = f("Very Heavy", "−2 to Evasion; −1 to Agility", { ev: -2, traits: { agility: -1 } });
const PAINFUL_A = f("Painful", "Each time you mark an Armor Slot, you must mark a Stress.");
const RESILIENT = f(
  "Resilient",
  "Before you mark your last Armor Slot, roll a d6. On a result of 6, reduce the severity by one threshold without marking an Armor Slot.",
);

/* ── rows ─────────────────────────────────────────────────────────────
   `w` is one weapon line. Tier and physical/magic come from the group it
   sits in, exactly as the printed table gets them from its heading. */

const w = (name, trait, range, damage, burden, feature = null) => ({
  name,
  trait,
  range,
  damage,
  burden,
  feature,
});

const a = (name, major, severe, score, feature = null) => ({ name, major, severe, score, feature });

/* ══════════════════════════════════════════════════════════════════════
   PRIMARY WEAPONS — PHYSICAL

   The first fifteen of every tier are the same fifteen weapons, reprinted
   with a heavier bonus and an Improved/Advanced/Legendary prefix. That is
   the book's own structure and `check-equipment.mjs` asserts it: a tier
   missing one of the fifteen is a transcription that lost a line.
   ══════════════════════════════════════════════════════════════════════ */

export const PRIMARY_PHYSICAL = {
  1: [
    w("Broadsword", "agility", "melee", "d8", "oneHanded", RELIABLE),
    w("Longsword", "agility", "melee", "d10+3", "twoHanded"),
    w("Battleaxe", "strength", "melee", "d10+3", "twoHanded"),
    w("Greatsword", "strength", "melee", "d10+3", "twoHanded", MASSIVE),
    w("Mace", "strength", "melee", "d8+1", "oneHanded"),
    w("Warhammer", "strength", "melee", "d12+3", "twoHanded", HEAVY),
    w("Dagger", "finesse", "melee", "d8+1", "oneHanded"),
    w("Quarterstaff", "instinct", "melee", "d10+3", "twoHanded"),
    w("Cutlass", "presence", "melee", "d8+1", "oneHanded"),
    w("Rapier", "presence", "melee", "d8", "oneHanded", QUICK),
    w("Halberd", "strength", "veryClose", "d10+2", "twoHanded", CUMBERSOME),
    w("Spear", "finesse", "veryClose", "d8+3", "twoHanded"),
    w("Shortbow", "agility", "far", "d6+3", "twoHanded"),
    w("Crossbow", "finesse", "far", "d6+1", "oneHanded"),
    w("Longbow", "agility", "veryFar", "d8+3", "twoHanded", CUMBERSOME),
  ],
  2: [
    w("Improved Broadsword", "agility", "melee", "d8+3", "oneHanded", RELIABLE),
    w("Improved Longsword", "agility", "melee", "d10+6", "twoHanded"),
    w("Improved Battleaxe", "strength", "melee", "d10+6", "twoHanded"),
    w("Improved Greatsword", "strength", "melee", "d10+6", "twoHanded", MASSIVE),
    w("Improved Mace", "strength", "melee", "d8+4", "oneHanded"),
    w("Improved Warhammer", "strength", "melee", "d12+6", "twoHanded", HEAVY),
    w("Improved Dagger", "finesse", "melee", "d8+4", "oneHanded"),
    w("Improved Quarterstaff", "instinct", "melee", "d10+6", "twoHanded"),
    w("Improved Cutlass", "presence", "melee", "d8+4", "oneHanded"),
    w("Improved Rapier", "presence", "melee", "d8+3", "oneHanded", QUICK),
    w("Improved Halberd", "strength", "veryClose", "d10+5", "twoHanded", CUMBERSOME),
    w("Improved Spear", "finesse", "veryClose", "d8+6", "twoHanded"),
    w("Improved Shortbow", "agility", "far", "d6+6", "twoHanded"),
    w("Improved Crossbow", "finesse", "far", "d6+4", "oneHanded"),
    w("Improved Longbow", "agility", "veryFar", "d8+6", "twoHanded", CUMBERSOME),
    w("Gilded Falchion", "strength", "melee", "d10+4", "oneHanded", POWERFUL),
    w("Knuckle Blades", "strength", "melee", "d10+6", "twoHanded", BRUTAL),
    w("Urok Broadsword", "finesse", "melee", "d8+3", "oneHanded", DEADLY),
    w("Bladed Whip", "agility", "veryClose", "d8+3", "oneHanded", QUICK),
    w("Steelforged Halberd", "strength", "veryClose", "d8+4", "twoHanded", SCARY),
    w("War Scythe", "finesse", "veryClose", "d8+5", "twoHanded", RELIABLE),
    w("Blunderbuss", "finesse", "close", "d8+6", "twoHanded", RELOADING),
    w("Greatbow", "strength", "far", "d6+6", "twoHanded", POWERFUL),
    w("Finehair Bow", "agility", "veryFar", "d6+5", "twoHanded", RELIABLE),
  ],
  3: [
    w("Advanced Broadsword", "agility", "melee", "d8+6", "oneHanded", RELIABLE),
    w("Advanced Longsword", "agility", "melee", "d10+9", "twoHanded"),
    w("Advanced Battleaxe", "strength", "melee", "d10+9", "twoHanded"),
    w("Advanced Greatsword", "strength", "melee", "d10+9", "twoHanded", MASSIVE),
    w("Advanced Mace", "strength", "melee", "d8+7", "oneHanded"),
    w("Advanced Warhammer", "strength", "melee", "d12+9", "twoHanded", HEAVY),
    w("Advanced Dagger", "finesse", "melee", "d8+7", "oneHanded"),
    w("Advanced Quarterstaff", "instinct", "melee", "d10+9", "twoHanded"),
    w("Advanced Cutlass", "presence", "melee", "d8+7", "oneHanded"),
    w("Advanced Rapier", "presence", "melee", "d8+6", "oneHanded", QUICK),
    w("Advanced Halberd", "strength", "veryClose", "d10+8", "twoHanded", CUMBERSOME),
    w("Advanced Spear", "finesse", "veryClose", "d8+9", "twoHanded"),
    w("Advanced Shortbow", "agility", "far", "d6+9", "twoHanded"),
    w("Advanced Crossbow", "finesse", "far", "d6+7", "oneHanded"),
    w("Advanced Longbow", "agility", "veryFar", "d8+9", "twoHanded", CUMBERSOME),
    w("Flickerfly Blade", "agility", "melee", "d8+5", "oneHanded",
      f("Sharpwing", "Gain a bonus to your damage rolls equal to your Agility.", {
        modifiers: [{ target: "ownDamage", source: "trait", trait: "agility" }],
      })),
    w("Bravesword", "strength", "melee", "d12+7", "twoHanded",
      f("Brave", "−1 to Evasion; +3 to Severe damage threshold", {
        ev: -1, modifiers: [{ target: "severeThreshold", value: 3 }],
      })),
    w("Hammer of Wrath", "strength", "melee", "d10+7", "twoHanded",
      f("Devastating", "Before you make an attack roll, you can mark a Stress to use a d20 as your damage die.")),
    w("Labrys Axe", "strength", "melee", "d10+7", "twoHanded", protective(1)),
    w("Meridian Cutlass", "presence", "melee", "d10+5", "oneHanded",
      f("Dueling", "When there are no other creatures within Close range of the target, gain advantage on your attack roll against them.")),
    w("Retractable Saber", "presence", "melee", "d10+7", "oneHanded",
      f("Retractable", "The blade can be hidden in the hilt to avoid detection.")),
    w("Double Flail", "agility", "veryClose", "d10+8", "twoHanded", POWERFUL),
    w("Talon Blades", "finesse", "close", "d10+7", "twoHanded", BRUTAL),
    w("Black Powder Revolver", "finesse", "far", "d6+8", "oneHanded", RELOADING),
    w("Spiked Bow", "agility", "veryFar", "d6+7", "twoHanded", versatile("Agility, Melee, d10+5.")),
  ],
  4: [
    w("Legendary Broadsword", "agility", "melee", "d8+9", "oneHanded", RELIABLE),
    w("Legendary Longsword", "agility", "melee", "d10+12", "twoHanded"),
    w("Legendary Battleaxe", "strength", "melee", "d10+12", "twoHanded"),
    w("Legendary Greatsword", "strength", "melee", "d10+12", "twoHanded", MASSIVE),
    w("Legendary Mace", "strength", "melee", "d8+10", "oneHanded"),
    w("Legendary Warhammer", "strength", "melee", "d12+12", "twoHanded", HEAVY),
    w("Legendary Dagger", "finesse", "melee", "d8+10", "oneHanded"),
    w("Legendary Quarterstaff", "instinct", "melee", "d10+12", "twoHanded"),
    w("Legendary Cutlass", "presence", "melee", "d8+10", "oneHanded"),
    w("Legendary Rapier", "presence", "melee", "d8+9", "oneHanded", QUICK),
    w("Legendary Halberd", "strength", "veryClose", "d10+11", "twoHanded", CUMBERSOME),
    w("Legendary Spear", "finesse", "veryClose", "d8+12", "twoHanded"),
    w("Legendary Shortbow", "agility", "far", "d6+12", "twoHanded"),
    w("Legendary Crossbow", "finesse", "far", "d6+10", "oneHanded"),
    w("Legendary Longbow", "agility", "veryFar", "d8+12", "twoHanded", CUMBERSOME),
    w("Dual-Ended Sword", "agility", "melee", "d10+9", "twoHanded", QUICK),
    w("Impact Gauntlet", "strength", "melee", "d10+11", "oneHanded",
      f("Concussive", "On a successful attack, you can spend a Hope to knock the target back to Far range.")),
    w("Sledge Axe", "strength", "melee", "d12+13", "twoHanded",
      f("Destructive", "−1 to Agility; on a successful attack, all adversaries within Very Close range must mark a Stress.", { traits: { agility: -1 } })),
    w("Curved Dagger", "finesse", "melee", "d8+9", "oneHanded",
      f("Serrated", "When you roll a 1 on a damage die, it deals 8 damage instead.")),
    w("Extended Polearm", "finesse", "veryClose", "d8+10", "twoHanded",
      f("Long", "This weapon’s attack targets all adversaries in a line within range.")),
    w("Swinging Ropeblade", "presence", "close", "d8+9", "twoHanded",
      f("Grappling", "On a successful attack, you can spend a Hope to Restrain the target or pull them into Melee range with you.")),
    w("Ricochet Axes", "agility", "far", "d6+11", "twoHanded",
      f("Bouncing", "Mark 1 or more Stress to hit that many targets in range of the attack.")),
    w("Aantari Bow", "finesse", "far", "d6+11", "twoHanded", RELIABLE),
    w("Hand Cannon", "finesse", "veryFar", "d6+12", "oneHanded", RELOADING),
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   PRIMARY WEAPONS — MAGIC

   "All magic weapons require a Spellcast trait", says the table heading, and
   that is the only reason this is a separate list rather than a column: the
   creation flow has to be able to say *why* a Wand is not offered to a
   Warrior, and a boolean on the row is a worse answer than the group it is in.
   ══════════════════════════════════════════════════════════════════════ */

export const PRIMARY_MAGIC = {
  1: [
    w("Arcane Gauntlets", "strength", "melee", "d10+3", "twoHanded"),
    w("Hallowed Axe", "strength", "melee", "d8+1", "oneHanded"),
    w("Glowing Rings", "agility", "veryClose", "d10+2", "twoHanded"),
    w("Hand Runes", "instinct", "veryClose", "d10", "oneHanded"),
    w("Returning Blade", "finesse", "close", "d8", "oneHanded", RETURNING),
    w("Shortstaff", "instinct", "close", "d8+1", "oneHanded"),
    w("Dualstaff", "instinct", "far", "d6+3", "twoHanded"),
    w("Scepter", "presence", "far", "d6", "twoHanded", versatile("Presence, Melee, d8.")),
    w("Wand", "knowledge", "far", "d6+1", "oneHanded"),
    w("Greatstaff", "knowledge", "veryFar", "d6", "twoHanded", POWERFUL),
  ],
  2: [
    w("Improved Arcane Gauntlets", "strength", "melee", "d10+6", "twoHanded"),
    w("Improved Hallowed Axe", "strength", "melee", "d8+4", "oneHanded"),
    w("Improved Glowing Rings", "agility", "veryClose", "d10+5", "twoHanded"),
    w("Improved Hand Runes", "instinct", "veryClose", "d10+3", "oneHanded"),
    w("Improved Returning Blade", "finesse", "close", "d8+3", "oneHanded", RETURNING),
    w("Improved Shortstaff", "instinct", "close", "d8+4", "oneHanded"),
    w("Improved Dualstaff", "instinct", "far", "d6+6", "twoHanded"),
    w("Improved Scepter", "presence", "far", "d6+3", "twoHanded", versatile("Presence, Melee, d8+3.")),
    w("Improved Wand", "knowledge", "far", "d6+4", "oneHanded"),
    w("Improved Greatstaff", "knowledge", "veryFar", "d6+3", "twoHanded", POWERFUL),
    w("Ego Blade", "agility", "melee", "d12+4", "oneHanded",
      f("Pompous", "You must have a Presence of 0 or lower to use this weapon.")),
    w("Casting Sword", "strength", "melee", "d10+4", "twoHanded", versatile("Knowledge, Far, d6+3.")),
    w("Devouring Dagger", "finesse", "melee", "d8+4", "oneHanded", SCARY),
    w("Hammer of Exota", "instinct", "melee", "d8+6", "twoHanded",
      f("Eruptive", "On a successful attack against a target within Melee range, all other adversaries within Very Close range must succeed on a reaction roll (14) or take half damage.")),
    w("Yutari Bloodbow", "finesse", "far", "d6+4", "twoHanded", BRUTAL),
    w("Elder Bow", "instinct", "far", "d6+4", "twoHanded", POWERFUL),
    w("Scepter of Elias", "presence", "far", "d6+3", "oneHanded",
      f("Invigorating", "On a successful attack, roll a d4. On a result of 4, clear a Stress.")),
    w("Wand of Enthrallment", "presence", "far", "d6+4", "oneHanded",
      f("Persuasive", "Before you make a Presence Roll, you can mark a Stress to gain a +2 bonus to the result.")),
    w("Keeper’s Staff", "knowledge", "far", "d6+4", "twoHanded", RELIABLE),
  ],
  3: [
    w("Advanced Arcane Gauntlets", "strength", "melee", "d10+9", "twoHanded"),
    w("Advanced Hallowed Axe", "strength", "melee", "d8+7", "oneHanded"),
    w("Advanced Glowing Rings", "agility", "veryClose", "d10+8", "twoHanded"),
    w("Advanced Hand Runes", "instinct", "veryClose", "d10+6", "oneHanded"),
    w("Advanced Returning Blade", "finesse", "close", "d8+6", "oneHanded", RETURNING),
    w("Advanced Shortstaff", "instinct", "close", "d8+7", "oneHanded"),
    w("Advanced Dualstaff", "instinct", "far", "d6+9", "twoHanded"),
    w("Advanced Scepter", "presence", "far", "d6+6", "twoHanded", versatile("Presence, Melee, d8+4.")),
    w("Advanced Wand", "knowledge", "far", "d6+7", "oneHanded"),
    w("Advanced Greatstaff", "knowledge", "veryFar", "d6+6", "twoHanded", POWERFUL),
    w("Axe of Fortunis", "strength", "melee", "d10+8", "twoHanded",
      f("Lucky", "On a failed attack, you can mark a Stress to reroll your attack.")),
    w("Blessed Anlace", "instinct", "melee", "d10+6", "oneHanded",
      f("Healing", "During downtime, automatically clear a Hit Point.")),
    /* The one weapon in the book whose damage type is a choice. `type` is a
       single string on the schema, so it is stored as magic — the weapon it
       is closest to — and the feature text is what tells you the other half.
       Inventing a third damage type for one card would reach every damage
       roll in the system. */
    w("Ghostblade", "presence", "melee", "d10+7", "oneHanded",
      f("Otherworldly", "On a successful attack, you can deal physical or magic damage.")),
    w("Runes of Ruination", "knowledge", "veryClose", "d20+4", "oneHanded", PAINFUL_W),
    w("Widogast Pendant", "knowledge", "close", "d10+5", "oneHanded", TIMEBENDING),
    w("Gilded Bow", "finesse", "far", "d6+7", "twoHanded",
      f("Self-Correcting", "When you roll a 1 on a damage die, it deals 6 damage instead.")),
    w("Firestaff", "instinct", "far", "d6+7", "twoHanded",
      f("Burning", "When you roll a 6 on a damage die, the target must mark a Stress.")),
    w("Mage Orb", "knowledge", "far", "d6+7", "oneHanded", POWERFUL),
    w("Ilmari’s Rifle", "finesse", "veryFar", "d6+6", "oneHanded", RELOADING),
  ],
  4: [
    w("Legendary Arcane Gauntlets", "strength", "melee", "d10+12", "twoHanded"),
    w("Legendary Hallowed Axe", "strength", "melee", "d8+10", "oneHanded"),
    w("Legendary Glowing Rings", "agility", "veryClose", "d10+11", "twoHanded"),
    w("Legendary Hand Runes", "instinct", "veryClose", "d10+9", "oneHanded"),
    w("Legendary Returning Blade", "finesse", "close", "d8+9", "oneHanded", RETURNING),
    w("Legendary Shortstaff", "instinct", "close", "d8+10", "oneHanded"),
    w("Legendary Dualstaff", "instinct", "far", "d8+12", "twoHanded"),
    w("Legendary Scepter", "presence", "far", "d6+9", "twoHanded", versatile("Presence, Melee, d8+6.")),
    w("Legendary Wand", "knowledge", "far", "d6+10", "oneHanded"),
    w("Legendary Greatstaff", "knowledge", "veryFar", "d6+9", "twoHanded", POWERFUL),
    w("Sword of Light & Flame", "strength", "melee", "d10+11", "twoHanded",
      f("Hot", "This weapon cuts through solid material.")),
    w("Siphoning Gauntlets", "presence", "melee", "d10+9", "twoHanded",
      f("Lifestealing", "On a successful attack, roll a d6. On a result of 6, clear a Hit Point or clear a Stress.")),
    w("Midas Scythe", "knowledge", "melee", "d10+9", "twoHanded",
      f("Greedy", "Spend a handful of gold to gain a +1 bonus to your Proficiency on a damage roll.")),
    w("Floating Bladeshards", "instinct", "close", "d8+9", "oneHanded", POWERFUL),
    w("Bloodstaff", "instinct", "far", "d20+7", "twoHanded", PAINFUL_W),
    w("Thistlebow", "instinct", "far", "d6+13", "twoHanded", RELIABLE),
    w("Wand of Essek", "knowledge", "far", "d8+13", "oneHanded", TIMEBENDING),
    w("Magus Revolver", "finesse", "veryFar", "d6+13", "oneHanded", RELOADING),
    w("Fusion Gloves", "knowledge", "veryFar", "d6+9", "twoHanded",
      f("Bonded", "Gain a bonus to your damage rolls equal to your level.", {
        modifiers: [{ target: "ownDamage", source: "level" }],
      })),
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   COMBAT WHEELCHAIRS

   A published ruleset by Mark Thompson, printed in the same chapter and
   equipped as primary weapons. They are their own group because their tiers
   run down the table rather than across it — one model, four tiers — and
   because the arcane frame is the only weapon in the book that names no trait
   at all: it uses whatever your subclass's Spellcast trait is.

   `spellcast: true` is that fact. The system stores a weapon's trait as one of
   the six, so the arcane frame is stored against the trait its owner casts
   with, resolved when it is granted, and the flag is what tells the creation
   flow to do the resolving rather than to print "Spellcast" as if it were a
   seventh trait.
   ══════════════════════════════════════════════════════════════════════ */

const QUICK_CHAIR = QUICK;

export const WHEELCHAIRS = [
  { name: "Light-Frame Wheelchair", tier: 1, trait: "agility", range: "melee", damage: "d8", burden: "oneHanded", feature: QUICK_CHAIR, magic: false },
  { name: "Improved Light-Frame Wheelchair", tier: 2, trait: "agility", range: "melee", damage: "d8+3", burden: "oneHanded", feature: QUICK_CHAIR, magic: false },
  { name: "Advanced Light-Frame Wheelchair", tier: 3, trait: "agility", range: "melee", damage: "d8+6", burden: "oneHanded", feature: QUICK_CHAIR, magic: false },
  { name: "Legendary Light-Frame Wheelchair", tier: 4, trait: "agility", range: "melee", damage: "d8+9", burden: "oneHanded", feature: QUICK_CHAIR, magic: false },

  { name: "Heavy-Frame Wheelchair", tier: 1, trait: "strength", range: "melee", damage: "d12+3", burden: "twoHanded", feature: HEAVY, magic: false },
  { name: "Improved Heavy-Frame Wheelchair", tier: 2, trait: "strength", range: "melee", damage: "d12+6", burden: "twoHanded", feature: HEAVY, magic: false },
  { name: "Advanced Heavy-Frame Wheelchair", tier: 3, trait: "strength", range: "melee", damage: "d12+9", burden: "twoHanded", feature: HEAVY, magic: false },
  { name: "Legendary Heavy-Frame Wheelchair", tier: 4, trait: "strength", range: "melee", damage: "d12+12", burden: "twoHanded", feature: HEAVY, magic: false },

  { name: "Arcane-Frame Wheelchair", tier: 1, trait: "instinct", spellcast: true, range: "far", damage: "d6", burden: "oneHanded", feature: RELIABLE, magic: true },
  { name: "Improved Arcane-Frame Wheelchair", tier: 2, trait: "instinct", spellcast: true, range: "far", damage: "d6+3", burden: "oneHanded", feature: RELIABLE, magic: true },
  { name: "Advanced Arcane-Frame Wheelchair", tier: 3, trait: "instinct", spellcast: true, range: "far", damage: "d6+6", burden: "oneHanded", feature: RELIABLE, magic: true },
  { name: "Legendary Arcane-Frame Wheelchair", tier: 4, trait: "instinct", spellcast: true, range: "far", damage: "d6+9", burden: "oneHanded", feature: RELIABLE, magic: true },
];

/* ══════════════════════════════════════════════════════════════════════
   SECONDARY WEAPONS

   Every one is One-Handed, because that is what makes it a secondary — the
   burden column is printed anyway and is transcribed anyway, so the check can
   assert it rather than this comment having to be believed.
   ══════════════════════════════════════════════════════════════════════ */

export const SECONDARY = {
  1: [
    w("Shortsword", "agility", "melee", "d8", "oneHanded", paired(2)),
    w("Round Shield", "strength", "melee", "d4", "oneHanded", protective(1)),
    w("Tower Shield", "strength", "melee", "d6", "oneHanded", barrier(2)),
    w("Small Dagger", "finesse", "melee", "d8", "oneHanded", paired(2)),
    w("Whip", "presence", "veryClose", "d6", "oneHanded",
      f("Startling", "Mark a Stress to crack the whip and force all adversaries within Melee range back to Close range.")),
    w("Grappler", "finesse", "close", "d6", "oneHanded",
      f("Hooked", "On a successful attack, you can pull the target into Melee range.")),
    w("Hand Crossbow", "finesse", "far", "d6+1", "oneHanded"),
  ],
  2: [
    w("Improved Shortsword", "agility", "melee", "d8+2", "oneHanded", paired(3)),
    w("Improved Round Shield", "strength", "melee", "d4+2", "oneHanded", protective(2)),
    w("Improved Tower Shield", "strength", "melee", "d6+2", "oneHanded", barrier(3)),
    w("Improved Small Dagger", "finesse", "melee", "d8+2", "oneHanded", paired(3)),
    w("Improved Whip", "presence", "veryClose", "d6+2", "oneHanded",
      f("Startling", "Mark a Stress to crack the whip and force all adversaries within Melee range back to Close range.")),
    w("Improved Grappler", "finesse", "close", "d6+2", "oneHanded",
      f("Hooked", "On a successful attack, you can pull the target into Melee range.")),
    w("Improved Hand Crossbow", "finesse", "far", "d6+3", "oneHanded"),
    w("Spiked Shield", "strength", "melee", "d6+2", "oneHanded",
      f("Double Duty", "+1 to Armor Score; +1 to primary weapon damage within Melee range", {
        as: 1, modifiers: [{ target: "primaryDamage", value: 1, condition: "meleeWeapon" }],
      })),
    w("Parrying Dagger", "finesse", "melee", "d6+2", "oneHanded",
      f("Parry", "When you are attacked, roll this weapon’s damage dice. If any of the attacker’s damage dice rolled the same value as your dice, the matching results are discarded from the attacker’s damage dice before the damage you take is totaled.")),
    w("Returning Axe", "agility", "close", "d6+4", "oneHanded", RETURNING),
  ],
  3: [
    w("Advanced Shortsword", "agility", "melee", "d8+4", "oneHanded", paired(4)),
    w("Advanced Round Shield", "strength", "melee", "d4+4", "oneHanded", protective(3)),
    w("Advanced Tower Shield", "strength", "melee", "d6+4", "oneHanded", barrier(4)),
    w("Advanced Small Dagger", "finesse", "melee", "d8+4", "oneHanded", paired(4)),
    w("Advanced Whip", "presence", "veryClose", "d6+4", "oneHanded",
      f("Startling", "Mark a Stress to crack the whip and force all adversaries within Melee range back to Close range.")),
    w("Advanced Grappler", "finesse", "close", "d6+4", "oneHanded",
      f("Hooked", "On a successful attack, you can pull the target into Melee range.")),
    w("Advanced Hand Crossbow", "finesse", "far", "d6+5", "oneHanded"),
    w("Buckler", "agility", "melee", "d4+4", "oneHanded",
      f("Deflecting", "When you are attacked, you can mark an Armor Slot to gain a bonus to your Evasion equal to your available Armor Slots against the attack.")),
    w("Powered Gauntlet", "knowledge", "close", "d6+4", "oneHanded",
      f("Charged", "Mark a Stress to gain a +1 bonus to your Proficiency on a primary weapon attack.")),
    w("Hand Sling", "finesse", "veryFar", "d6+4", "oneHanded", versatile("Finesse, Close, d8+4.")),
  ],
  4: [
    w("Legendary Shortsword", "agility", "melee", "d8+6", "oneHanded", paired(5)),
    w("Legendary Round Shield", "strength", "melee", "d4+6", "oneHanded", protective(4)),
    w("Legendary Tower Shield", "strength", "melee", "d6+6", "oneHanded", barrier(5)),
    w("Legendary Small Dagger", "finesse", "melee", "d8+6", "oneHanded", paired(5)),
    w("Legendary Whip", "presence", "veryClose", "d6+6", "oneHanded",
      f("Startling", "Mark a Stress to crack the whip and force all adversaries within Melee range back to Close range.")),
    w("Legendary Grappler", "finesse", "close", "d6+6", "oneHanded",
      f("Hooked", "On a successful attack, you can pull the target into Melee range.")),
    w("Legendary Hand Crossbow", "finesse", "far", "d6+7", "oneHanded"),
    w("Braveshield", "agility", "melee", "d4+6", "oneHanded",
      f("Sheltering", "When you mark an Armor Slot, it reduces damage for you and all allies within Melee range of you who took the same damage.")),
    w("Knuckle Claws", "strength", "melee", "d6+8", "oneHanded",
      f("Doubled Up", "When you make an attack with your primary weapon, you can deal damage to another target within Melee range.")),
    w("Primer Shard", "instinct", "veryClose", "d4", "oneHanded",
      f("Locked On", "On a successful attack, your next attack against the same target with your primary weapon automatically succeeds.")),
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   ARMOR

   Thresholds are the *base* pair, without your level in them — the character
   adds their level to both, in `CharacterData#prepareDerivedData`. Storing
   the printed number is what keeps the two from disagreeing when somebody
   levels up.
   ══════════════════════════════════════════════════════════════════════ */

export const ARMOR = {
  1: [
    a("Gambeson Armor", 5, 11, 3, FLEXIBLE),
    a("Leather Armor", 6, 13, 3),
    a("Chainmail Armor", 7, 15, 4, HEAVY),
    a("Full Plate Armor", 8, 17, 4, VERY_HEAVY),
  ],
  2: [
    a("Improved Gambeson Armor", 7, 16, 4, FLEXIBLE),
    a("Improved Leather Armor", 9, 20, 4),
    a("Improved Chainmail Armor", 11, 24, 5, HEAVY),
    a("Improved Full Plate Armor", 13, 28, 5, VERY_HEAVY),
    a("Elundrian Chain Armor", 9, 21, 4,
      f("Warded", "You reduce incoming magic damage by your Armor Score before applying it to your damage thresholds.")),
    a("Harrowbone Armor", 9, 21, 4, RESILIENT),
    a("Irontree Breastplate Armor", 9, 20, 4,
      f("Reinforced", "When you mark your last Armor Slot, increase your damage thresholds by +2 until you clear at least 1 Armor Slot.")),
    a("Runetan Floating Armor", 9, 20, 4,
      f("Shifting", "When you are targeted for an attack, you can mark an Armor Slot to give the attack roll against you disadvantage.")),
    a("Tyris Soft Armor", 8, 18, 5,
      f("Quiet", "You gain a +2 bonus to rolls you make to move silently.")),
    a("Rosewild Armor", 11, 23, 5,
      f("Hopeful", "When you would spend a Hope, you can mark an Armor Slot instead.")),
  ],
  3: [
    a("Advanced Gambeson Armor", 9, 23, 5, FLEXIBLE),
    a("Advanced Leather Armor", 11, 27, 5),
    a("Advanced Chainmail Armor", 13, 31, 6, HEAVY),
    a("Advanced Full Plate Armor", 15, 35, 6, VERY_HEAVY),
    a("Bellamoi Fine Armor", 11, 27, 5, f("Gilded", "+1 to Presence", { traits: { presence: 1 } })),
    a("Dragonscale Armor", 11, 27, 5,
      f("Impenetrable", "Once per short rest, when you would mark your last Hit Point, you can instead mark a Stress.")),
    a("Spiked Plate Armor", 10, 25, 5,
      f("Sharp", "On a successful attack against a target within Melee range, add a d4 to the damage roll.")),
    a("Bladefare Armor", 16, 39, 6,
      f("Physical", "You can’t mark an Armor Slot to reduce magic damage.")),
    a("Monett’s Cloak", 16, 39, 6,
      f("Magic", "You can’t mark an Armor Slot to reduce physical damage.")),
    a("Runes of Fortification", 17, 43, 6, PAINFUL_A),
  ],
  4: [
    a("Legendary Gambeson Armor", 11, 32, 6, FLEXIBLE),
    a("Legendary Leather Armor", 13, 36, 6),
    a("Legendary Chainmail Armor", 15, 40, 7, HEAVY),
    a("Legendary Full Plate Armor", 17, 44, 7, VERY_HEAVY),
    a("Dunamis Silkchain", 13, 36, 7,
      f("Timeslowing", "Mark an Armor Slot to roll a d4 and add its result as a bonus to your Evasion against an incoming attack.")),
    a("Channeling Armor", 13, 36, 5, f("Channeling", "+1 to Spellcast Rolls", {
      modifiers: [{ target: "spellcastRoll", value: 1 }],
    })),
    a("Emberwoven Armor", 13, 36, 6,
      f("Burning", "When an adversary attacks you within Melee range, they mark a Stress.")),
    a("Full Fortified Armor", 15, 40, 4,
      f("Fortified", "When you mark an Armor Slot, you reduce the severity of an attack by two thresholds instead of one.")),
    a("Veritas Opal Armor", 13, 36, 6,
      f("Truthseeking", "This armor glows when another creature within Close range tells a lie.")),
    a("Savior Chainmail", 18, 48, 8,
      f("Difficult", "−1 to all character traits and Evasion", {
        ev: -1, modifiers: [{ target: "trait", value: -1 }],
      })),
  ],
};

/**
 * The fifteen physical and ten magic primaries every tier reprints, and the
 * seven secondaries and four armors likewise — by their tier-1 name.
 *
 * This is what makes `check-equipment.mjs` able to say a line went missing.
 * Counting rows only catches a *deletion*; naming them catches the case where
 * a row was transcribed twice and another not at all, which is what actually
 * happens when you are copying a table by hand.
 */
export const STAPLES = {
  primaryPhysical: PRIMARY_PHYSICAL[1].map((x) => x.name),
  primaryMagic: PRIMARY_MAGIC[1].map((x) => x.name),
  secondary: SECONDARY[1].map((x) => x.name),
  armor: ARMOR[1].map((x) => x.name),
};

/** The prefix each tier above 1 puts in front of a staple's name. */
export const TIER_PREFIX = { 2: "Improved", 3: "Advanced", 4: "Legendary" };
