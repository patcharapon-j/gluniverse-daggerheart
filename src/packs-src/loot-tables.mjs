/**
 * The loot and consumable tables, transcribed.
 *
 * Two d12-rolled tables of sixty, printed in chapter 2. The roll number is
 * kept because it *is* the row's identity — the rules tell a GM to "roll 3d12
 * and take the item that matches that value", so 34 is how a table refers to
 * Box of Many Goods, and `ConsumableData.source` exists to hold exactly that.
 *
 * **Rarity is deliberately not stored.** The book bands these by how many dice
 * you roll rather than by a column on the row — Common is 1d12 *or* 2d12,
 * Uncommon is 2d12 *or* 3d12 — so the bands overlap and no single row has one
 * rarity. Deriving a tidy Common/Uncommon/Rare/Legendary column would be this
 * file inventing a fact the page does not state, which is the thing
 * `check-cards.mjs` exists to prevent elsewhere.
 *
 * Only two of these are reachable from character creation: Minor Health Potion
 * and Minor Stamina Potion, which every character chooses between. The other
 * hundred and eighteen are here because the tables are the tables, and a GM
 * rolling loot mid-session should not have to type the result in by hand.
 */

/** One row: the printed roll number, its name, and its text. */
const row = (roll, name, description) => ({ roll, name, description });

/* ══════════════════════════════════════════════════════════════════════
   ITEMS

   "Loot that can be kept and used repeatedly until you choose to get rid of
   them." These become `loot` Items.
   ══════════════════════════════════════════════════════════════════════ */

export const ITEMS = [
  row(1, "Premium Bedroll", "During downtime, you automatically clear a Stress."),
  row(2, "Piper Whistle", "This handcrafted whistle has a distinctive sound. When you blow this whistle, its piercing tone can be heard within a 1-mile radius."),
  row(3, "Charging Quiver", "When you succeed on an attack with an arrow stored in this quiver, gain a bonus to the damage roll equal to your current tier."),
  row(4, "Alistair’s Torch", "You can light this magic torch at will. The flame’s light fills a much larger space than it should, enough to illuminate a cave bright as day."),
  row(5, "Speaking Orbs", "This pair of orbs allows any creatures holding them to communicate with each other across any distance."),
  row(6, "Manacles", "This pair of locking cuffs comes with a key."),
  row(7, "Arcane Cloak", "A creature with a Spellcast trait wearing this cloak can adjust its color, texture, and size at will."),
  row(8, "Woven Net", "You can make a Finesse Roll using this net to trap a small creature. A trapped target can break free with a successful Attack Roll (16)."),
  row(9, "Fire Jar", "You can pour out the strange liquid contents of this jar to instantly produce fire. The contents regenerate when you take a long rest."),
  row(10, "Suspended Rod", "This flat rod is inscribed with runes. When you activate the rod, it is immediately suspended in place. Until the rod is deactivated, it can’t move, doesn’t abide by the rules of gravity, and remains in place."),
  row(11, "Glamour Stone", "Activate this pebble-sized stone to memorize the appearance of someone you can see. Spend a Hope to magically recreate this guise on yourself as an illusion."),
  row(12, "Empty Chest", "This magical chest appears empty. When you speak a specific trigger word or action and open the chest, you can see the items stored within it."),
  row(13, "Companion Case", "This case can fit a small animal companion. While the companion is inside, the animal and case are immune to all damage and harmful effects."),
  row(14, "Piercing Arrows", "Three times per rest when you succeed on an attack with one of these arrows, you can add your Proficiency to the damage roll."),
  row(15, "Valorstone", "You can attach this stone to armor that doesn’t already have a feature. The armor gains the following feature. **Resilient:** Before you mark your last Armor Slot, roll a d6. On a result of 6, reduce the severity by one threshold without marking an Armor Slot."),
  row(16, "Skeleton Key", "When you use this key to open a locked door, you gain advantage on the Finesse Roll."),
  row(17, "Arcane Prism", "Position this prism in a location of your choosing and activate it. All allies within Close range of it gain a +1 bonus to their Spellcast Rolls. While activated, the prism can’t be moved. Once the prism is deactivated, it can’t be activated again until your next long rest."),
  row(18, "Minor Stamina Potion Recipe", "As a downtime move, you can use the bone of a creature to craft a Minor Stamina Potion."),
  row(19, "Minor Health Potion Recipe", "As a downtime move, you can use a vial of blood to craft a Minor Health Potion."),
  row(20, "Homing Compasses", "These two compasses point toward each other no matter how far apart they are."),
  row(21, "Corrector Sprite", "This tiny sprite sits in the curve of your ear canal and whispers helpful advice during combat. Once per short rest, you can gain advantage on an attack roll."),
  row(22, "Gecko Gloves", "You can climb up vertical surfaces and across ceilings."),
  row(23, "Lorekeeper", "You can store the name and details of up to three hostile creatures inside this book. You gain a +1 bonus to action rolls against those creatures."),
  row(24, "Vial of Darksmoke Recipe", "As a downtime move, you can mark a Stress to craft a Vial of Darksmoke."),
  row(25, "Bloodstone", "You can attach this stone to a weapon that doesn’t already have a feature. The weapon gains the following feature. **Brutal:** When you roll the maximum value on a damage die, roll an additional damage die."),
  row(26, "Greatstone", "You can attach this stone to a weapon that doesn’t already have a feature. The weapon gains the following feature. **Powerful:** On a successful attack, roll an additional damage die and discard the lowest result."),
  row(27, "Glider", "While falling, you can mark a Stress to deploy this small parachute and glide safely to the ground."),
  row(28, "Ring of Silence", "Spend a Hope to activate this ring. Your footsteps are silent until your next rest."),
  row(29, "Calming Pendant", "When you would mark your last Stress, roll a d6. On a result of 5 or higher, don’t mark it."),
  row(30, "Dual Flask", "This flask can hold two different liquids. You can swap between them by flipping a small switch on the flask’s side."),
  row(31, "Bag of Ficklesand", "You can convince this small bag of sand to be much heavier or lighter with a successful Presence Roll (10). Additionally, on a successful Finesse Roll (10), you can blow a bit of sand into a target’s face to make them temporarily _Vulnerable_."),
  row(32, "Ring of Resistance", "Once per long rest, you can activate this ring after a successful attack against you to halve the damage."),
  row(33, "Phoenix Feather", "If you have at least one Phoenix Feather on you when you fall unconscious, you gain a +1 bonus to the roll you make to determine whether you gain a scar."),
  row(34, "Box of Many Goods", "Once per long rest, you can open this small box and roll a d12. On a result of 1–6, it’s empty. On a result of 7–10, it contains one random common consumable. On a result of 11–12, it contains two random common consumables."),
  row(35, "Airblade Charm", "You can attach this charm to a weapon with a Melee range. Three times per rest, you can activate the charm and attack a target within Close range."),
  row(36, "Portal Seed", "You can plant this seed in the ground to grow a portal in that spot. The portal is ready to use in 24 hours. You can use this portal to travel to any other location where you planted a portal seed. A portal can be destroyed by dealing any amount of magic damage to it."),
  row(37, "Paragon’s Chain", "As a downtime move, you can meditate on an ideal or principle you hold dear and focus your will into this chain. Once per long rest, you can spend a Hope to roll a d20 as your Hope Die for rolls that directly align with that principle."),
  row(38, "Elusive Amulet", "Once per long rest, you can activate this amulet to become _Hidden_ until you move. While Hidden in this way, you remain unseen even if an adversary moves to where they would normally see you."),
  row(39, "Hopekeeper Locket", "During a long rest, if you have 6 Hope, you can spend a Hope to imbue this locket with your bountiful resolve. When you have 0 Hope, you can use the locket to immediately gain a Hope. The locket must be re-imbued before it can be used this way again."),
  row(40, "Infinite Bag", "When you store items in this bag, they are kept in a pocket dimension that never runs out of space. You can retrieve an item at any time."),
  row(41, "Stride Relic", "You gain a +1 bonus to your Agility. You can only carry one relic."),
  row(42, "Bolster Relic", "You gain a +1 bonus to your Strength. You can only carry one relic."),
  row(43, "Control Relic", "You gain a +1 bonus to your Finesse. You can only carry one relic."),
  row(44, "Attune Relic", "You gain a +1 bonus to your Instinct. You can only carry one relic."),
  row(45, "Charm Relic", "You gain a +1 bonus to your Presence. You can only carry one relic."),
  row(46, "Enlighten Relic", "You gain a +1 bonus to your Knowledge. You can only carry one relic."),
  row(47, "Honing Relic", "You gain a +1 bonus to an Experience of your choice. You can only carry one relic."),
  row(48, "Flickerfly Pendant", "While you carry this pendant, your weapons with a Melee range that deal physical damage have a gossamer sheen and can attack targets within Very Close range."),
  row(49, "Lakestrider Boots", "You can walk on the surface of water as if it were soft ground."),
  row(50, "Clay Companion", "When you sculpt this ball of clay into a clay animal companion, it behaves as that animal. For example, a clay spider can spin clay webs, while a clay bird can fly. The clay companion retains memory and identity across different shapes, but they can adopt new mannerisms with each form."),
  row(51, "Mythic Dust Recipe", "As a downtime move, you can use a handful of fine gold dust to craft Mythic Dust."),
  row(52, "Shard of Memory", "Once per long rest, you can spend 2 Hope to recall a domain card from your vault instead of paying its Recall Cost."),
  row(53, "Gem of Alacrity", "You can attach this gem to a weapon, allowing you to use your Agility when making an attack with that weapon."),
  row(54, "Gem of Might", "You can attach this gem to a weapon, allowing you to use your Strength when making an attack with that weapon."),
  row(55, "Gem of Precision", "You can attach this gem to a weapon, allowing you to use your Finesse when making an attack with that weapon."),
  row(56, "Gem of Insight", "You can attach this gem to a weapon, allowing you to use your Instinct when making an attack with that weapon."),
  row(57, "Gem of Audacity", "You can attach this gem to a weapon, allowing you to use your Presence when making an attack with that weapon."),
  row(58, "Gem of Sagacity", "You can attach this gem to a weapon, allowing you to use your Knowledge when making an attack with that weapon."),
  row(59, "Ring of Unbreakable Resolve", "Once per session, when the GM spends a Fear, you can spend 4 Hope to cancel the effects of that spent Fear."),
  row(60, "Belt of Unity", "Once per session, you can spend 5 Hope to lead a Tag Team Roll with three PCs instead of two."),
];

/* ══════════════════════════════════════════════════════════════════════
   CONSUMABLES

   "Loot that can only be used once. You can hold up to five of each
   consumable at a time." Five is also `CHARGES` on the character sheet's
   inventory row, which is why a consumable's quantity is drawn as five boxes
   rather than as a number.
   ══════════════════════════════════════════════════════════════════════ */

export const CONSUMABLES = [
  row(1, "Stride Potion", "You gain a +1 bonus to your next Agility Roll."),
  row(2, "Bolster Potion", "You gain a +1 bonus to your next Strength Roll."),
  row(3, "Control Potion", "You gain a +1 bonus to your next Finesse Roll."),
  row(4, "Attune Potion", "You gain a +1 bonus to your next Instinct Roll."),
  row(5, "Charm Potion", "You gain a +1 bonus to your next Presence Roll."),
  row(6, "Enlighten Potion", "You gain a +1 bonus to your next Knowledge Roll."),
  row(7, "Minor Health Potion", "Clear 1d4 HP."),
  row(8, "Minor Stamina Potion", "Clear 1d4 Stress."),
  row(9, "Grindletooth Venom", "You can apply this venom to a weapon that deals physical damage to add a **d6** to your next damage roll with that weapon."),
  row(10, "Varik Leaves", "You can eat these paired leaves to immediately gain 2 Hope."),
  row(11, "Vial of Moondrip", "When you drink the contents of this vial, you can see in total darkness until your next rest."),
  row(12, "Unstable Arcane Shard", "You can make a Finesse Roll to throw this shard at a group of adversaries within Far range. Targets you succeed against take 1d20 magic damage."),
  row(13, "Potion of Stability", "You can drink this potion to choose one additional downtime move."),
  row(14, "Improved Grindletooth Venom", "You can apply this venom to a weapon that deals physical damage to add a **d8** to your next damage roll with that weapon."),
  row(15, "Morphing Clay", "You can spend a Hope to use this clay, altering your face enough to make you unrecognizable until your next rest."),
  row(16, "Vial of Darksmoke", "When an adversary attacks you, use this vial and roll a number of d6s equal to your Agility. Add the highest result to your Evasion against the attack."),
  row(17, "Jumping Root", "Eat this root to leap up to Far range once without needing to roll."),
  row(18, "Snap Powder", "Mark a Stress and clear a HP."),
  row(19, "Health Potion", "Clear 1d4+1 HP."),
  row(20, "Stamina Potion", "Clear 1d4+1 Stress."),
  row(21, "Armor Stitcher", "You can use this stitcher to spend any number of Hope and clear that many Armor Slots."),
  row(22, "Gill Salve", "You can apply this salve to your neck to breathe underwater for a number of minutes equal to your level."),
  row(23, "Replication Parchment", "By touching this piece of parchment to another, you can perfectly copy the second parchment’s contents. Once used, this parchment becomes mundane paper."),
  row(24, "Improved Arcane Shard", "You can make a Finesse Roll to throw this shard at a group of adversaries within Far range. Targets you succeed against take 2d20 magic damage."),
  row(25, "Major Stride Potion", "You gain a +1 bonus to your Agility until your next rest."),
  row(26, "Major Bolster Potion", "You gain a +1 bonus to your Strength until your next rest."),
  row(27, "Major Control Potion", "You gain a +1 bonus to your Finesse until your next rest."),
  row(28, "Major Attune Potion", "You gain a +1 bonus to your Instinct until your next rest."),
  row(29, "Major Charm Potion", "You gain a +1 bonus to your Presence until your next rest."),
  row(30, "Major Enlighten Potion", "You gain a +1 bonus to your Knowledge until your next rest."),
  row(31, "Blood of the Yorgi", "You can drink this blood to disappear from where you are and immediately reappear at a point you can see within Very Far range."),
  row(32, "Homet’s Secret Potion", "After drinking this potion, the next successful attack you make critically succeeds."),
  row(33, "Redthorn Saliva", "You can apply this saliva to a weapon that deals physical damage to add a **d12** to your next damage roll with that weapon."),
  row(34, "Channelstone", "You can use this stone to take a spell or grimoire from your vault, use it once, and return it to your vault."),
  row(35, "Mythic Dust", "You can apply this dust to a weapon that deals magic damage to add a **d12** to your next damage roll with that weapon."),
  row(36, "Acidpaste", "This paste eats away walls and other surfaces in bright flashes."),
  row(37, "Hopehold Flare", "When you use this flare, allies within Close range roll a d6 when they spend a Hope. On a result of 6, they gain the effect of that Hope without spending it. The flare lasts until the end of the scene."),
  row(38, "Major Arcane Shard", "You can make a Finesse Roll to throw this shard at a group of adversaries within Far range. Targets you succeed against take 4d20 magic damage."),
  row(39, "Featherbone", "You can use this bone to control your falling speed for a number of minutes equal to your level."),
  row(40, "Circle of the Void", "Mark a Stress to create a void that extends up to Far range. No magic can be cast inside the void, and creatures within the void are immune to magic damage."),
  row(41, "Sun Tree Sap", "Consume this sap to roll a d6. On a result of 5–6, clear 2 HP. On a result of 2–4, clear 3 Stress. On a result of 1, see through the veil of death and return changed, gaining one scar."),
  row(42, "Dripfang Poison", "A creature who consumes this poison takes 8d10 direct magic damage."),
  row(43, "Major Health Potion", "Clear 1d4+2 HP."),
  row(44, "Major Stamina Potion", "Clear 1d4+2 Stress."),
  row(45, "Ogre Musk", "You can use this musk to prevent anyone from tracking you by mundane or magical means until your next rest."),
  row(46, "Wingsprout", "You gain magic wings that allow you to fly for a number of minutes equal to your level."),
  row(47, "Jar of Lost Voices", "You can open this jar to release a deafening echo of voices for a number of minutes equal to your Instinct. Creatures within Far range unprepared for the sound take 6d8 magic damage."),
  row(48, "Dragonbloom Tea", "You can drink this tea to unleash a fiery breath attack. Make an Instinct Roll against all adversaries in front of you within Close range. Targets you succeed against take d20 physical damage using your Proficiency."),
  row(49, "Bridge Seed", "Thick vines grow from your location to a point of your choice within Far range, allowing you to climb up or across them. The vines dissipate on your next short rest."),
  row(50, "Sleeping Sap", "You can drink this potion to fall asleep for a full night’s rest. You clear all Stress upon waking."),
  row(51, "Feast of Xuria", "You can eat this meal to clear all HP and Stress and gain 1d4 Hope."),
  row(52, "Bonding Honey", "This honey can be used to glue two objects together permanently."),
  row(53, "Shrinking Potion", "You can drink this potion to halve your size until you choose to drop this form or your next rest. While in this form, you have a +2 bonus to Agility and a −1 penalty to your Proficiency."),
  row(54, "Growing Potion", "You can drink this potion to double your size until you choose to drop this form or your next rest. While in this form, you have a +2 bonus to Strength and a +1 bonus to your Proficiency."),
  row(55, "Knowledge Stone", "If you die while holding this stone, an ally can take a card from your loadout to place in their loadout or vault. After they take this knowledge, the stone crumbles."),
  row(56, "Sweet Moss", "You can consume this moss during a rest to clear 1d10 HP or 1d10 Stress."),
  row(57, "Blinding Orb", "You can activate this orb to create a flash of bright light. All targets within Close range become _Vulnerable_ until they mark HP."),
  row(58, "Death Tea", "After you drink this tea, you instantly kill your target when you critically succeed on an attack. If you don’t critically succeed on an attack before your next long rest, you die."),
  row(59, "Mirror of Marigold", "When you take damage, you can spend a Hope to negate that damage, after which the mirror shatters."),
  row(60, "Stardrop", "You can use this stardrop to summon a hailstorm of comets that deals 8d20 physical damage to all targets within Very Far range."),
];

/**
 * The two consumables character creation offers a choice between, by their
 * roll number above.
 *
 * The rest of the starting inventory — torch, rope, basic supplies — is not a
 * table row and lives in `config.ts` with the other closed sets the rules
 * define. These two are here because they genuinely are rows 7 and 8 of the
 * consumable table, and `tools/check-equipment.mjs` uses these numbers to
 * assert that creation still has something to offer.
 */
export const STARTING_POTIONS = [7, 8];
