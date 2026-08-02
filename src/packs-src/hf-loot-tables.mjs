/**
 * *Hope and Fear*'s loot and consumable tables, transcribed.
 *
 * Two more d12-rolled tables of sixty, printed in chapter 2 of the second book.
 * Same shape and same rules as `loot-tables.mjs` — read that header first.
 *
 * ── the roll number is not unique any more, and that is fine ──────────
 * `source` carries the printed roll number because that *is* how the rules
 * refer to a row: "roll 3d12 and take the item that matches that value". Both
 * books number their tables 1–60, so "Item 34" now names two different objects
 * and a GM has to know which table they are rolling on. That is true at the
 * table with the two books open and it would be dishonest to paper over it by
 * renumbering — the number printed on the page is the number stored.
 *
 * What the field does carry is which table it came from, so the two are
 * distinguishable when they are sitting in one compendium: `Item 34 · Hope and
 * Fear` against the corebook's bare `Item 34`. The corebook's rows are left
 * unqualified deliberately, because relabelling two hundred existing documents
 * to say "· Core" would change what every character already holding one is
 * carrying, to fix an ambiguity that only exists for the new rows.
 *
 * **Names do not collide**, which is the thing that actually matters: a pack's
 * document ids are derived from type and name, so two rows called the same
 * thing would be a build error rather than a subtle mess. `npm run build:packs`
 * is what proves it.
 */

/** One row: the printed roll number, its name, and its text. */
const row = (roll, name, description) => ({ roll, name, description, book: "Hope and Fear" });

/* ══════════════════════════════════════════════════════════════════════
   ITEMS
   ══════════════════════════════════════════════════════════════════════ */

export const ITEMS = [
  row(1, "Caltrops", "You can spread these caltrops in a Very Close area around you. A creature hastening through that area must mark a Stress."),
  row(2, "Grapnel", "You gain advantage on action rolls to climb sheer surfaces."),
  row(3, "Ball Bearings", "This pouch contains perfectly smooth metal spheres."),
  row(4, "Box of Dragon Dust", "This snuffbox is filled with combustible powder."),
  row(5, "Nighthawker’s Ring", "Spend a Hope to activate the gemstone in this ring until the end of the scene. While active, the gemstone changes color to indicate the wearer’s proximity to hidden treasure: warm colors for near, cool colors for far."),
  row(6, "Elven Spyglass", "You can use this spyglass to magnify your vision a hundredfold."),
  row(7, "Gourmet Granules", "This savory powder makes any food it’s sprinkled on delicious and healthy, no matter how bland or rotten it is."),
  row(8, "Collapsible Pole", "You can break down this 18-foot pole into six interlinked 3-foot segments."),
  row(9, "Blackwing Quill", "This writing quill never runs out of ink or needs to be sharpened."),
  row(10, "Silee’s Folding Knife", "This 3-inch blade has an edge that easily cuts through anything except the handle it’s stored in."),
  row(11, "Windup Toy", "This small mechanical device is shaped like a strixwolf pup and can be programmed to perform simple tricks."),
  row(12, "Loaded Dice", "You can choose what result this set of weighted dice rolls with a successful **Finesse Roll (14)**. If you roll with Fear, anyone watching knows the dice are loaded."),
  row(13, "Hollowbark Horn", "You can blow this horn to summon a small woodland creature to perform a simple task."),
  row(14, "Self-Tying Rope", "You can command this rope to tie or untie itself."),
  row(15, "Thief’s Compass", "This compass points the way toward the nearest exit while indoors and the closest entrance while outdoors."),
  row(16, "Traveler’s Bell", "Once per long rest, you can ring this bell to magically open the shortest safe path through rough terrain for 1 hour."),
  row(17, "Mandragorian Torch", "This torch gives off light only the bearer can see."),
  row(18, "Boots of Supple Mystique", "While wearing these boots, you don’t leave tracks or footprints."),
  row(19, "Zephyr’s Jar", "You can open this empty jar during inclement weather to capture the storm and leave behind clear skies. The storm remains inside until unleashed by reopening the jar."),
  row(20, "Returning Ring", "When you throw your primary weapon while wearing this ring, the weapon appears in your hand immediately after the attack."),
  row(21, "Kingfisher’s Net", "Once per long rest, you can use this net to scoop one live fish out of any amount of water, no matter how unlikely it is for that water to have fish in it."),
  row(22, "Titan’s Girdle", "Once per scene, you can activate this girdle to gain a +1 bonus to your Proficiency for your next attack."),
  row(23, "Iron Veil", "This chain-link head covering renders the wearer invisible to fey creatures."),
  row(24, "Furball Bag", "Once per rest, you can produce **2d20** harmless, cat-sized fur creatures of indeterminate origin and species from this bag."),
  row(25, "Whisperstep Anklet", "This anklet makes your steps silent as long as you don’t move faster than walking speed."),
  row(26, "Enchanter’s Loupe", "You can use this loupe to see through illusions and enchantments."),
  row(27, "Escher’s Mirrorball", "Once per long rest, you can command this fist-sized silver orb to capture an omnidirectional image of its surroundings on its surface. This image lasts until your next long rest."),
  row(28, "Cheater’s Coin", "When you flip this coin, you can **spend a Hope** to determine which side it lands on."),
  row(29, "Gravewarden’s Bell", "This bell rings when a ghost or undead creature moves within Far range of it."),
  row(30, "Reliquary of the Sightless Saint", "You gain a +1 bonus to your Hope Die when you make the Risk It All death move."),
  row(31, "Map of Revelation", "You can attune this map to one creature at a time. The map always shows the attuned creature’s location."),
  row(32, "Dagginae’s Obsidian Slate", "This wafer-thin sheet of volcanic glass is used by archivists to keep notes. Any information etched onto its surface disappears but can be recalled via a command you set."),
  row(33, "Gadiman’s Backpack", "Once per rest, you can **spend a Hope** to conjure a mundane item up to a cubic foot in size inside this satchel."),
  row(34, "Eclipse Coin", "Once per rest, flip a coin. On heads, you gain a +1 bonus to attack rolls until your next successful attack. On tails, you gain +1 to your Evasion until an attack fails against you."),
  row(35, "Sorcerer’s Hat", "This conical blue hat is covered in silver stars. Once per rest, you can cast a spell from your vault with a Recall Cost equal to or less than your tier. This doesn’t work for permanently vaulted cards."),
  row(36, "Ghoulskin Gloves", "When you attack with a physical weapon while wearing these gloves, the damage is considered both physical and magic."),
  row(37, "Gloves of Alacrity", "When you would mark a Stress to reload a weapon, you don’t mark it."),
  row(38, "Insomniac’s Periapt", "When you take a rest without clearing Hit Points or Stress, you gain a +2 bonus to attack and damage rolls until your next rest."),
  row(39, "Wildrider’s Saddle", "This saddle grants any animal it’s strapped onto the ability to understand their rider’s commands."),
  row(40, "Soul-Twin Circlets", "Two creatures can wear this pair of circlets. You can **spend a Hope** to switch places with whoever is wearing the other circlet."),
  row(41, "Namer’s Oracle", "Once per session, you can roll this set of runic dice to reveal the full name of the last person you touched."),
  row(42, "Crucible Frames", "These eyeglasses reveal weak points in objects and creatures. Three times per rest, you can **spend a Hope** to gain advantage on an attack roll."),
  row(43, "Two-Faced Aegis Brooch", "Once per rest, flip a coin. On heads, you become immune to the next physical damage you take. On tails, you become immune to the next magic damage you take."),
  row(44, "Knockback Bracelets", "On a successful weapon attack, you can knock your target back up to Close range from their location."),
  row(45, "Force Disc", "This shimmering two-dimensional disc of magical force has a 4-foot diameter and is magically tethered to a pebble. The disc always floats 3 feet north of, and at the same elevation as, the pebble. The pebble has a mass equal to one-hundredth of the total mass carried by the disc."),
  row(46, "Molepaw Mittens", "**Spend a Hope** to swim through earth as if it were water for the next 10 minutes."),
  row(47, "Timekeeper’s Pendant", "You can choose an additional downtime move each rest."),
  row(48, "Iron Dagger Pendant", "Once per long rest, you can **spend a Hope** to tell the pendant a creature’s name. The pendant gently pulls you toward that creature’s current location until your next long rest."),
  row(49, "Collar of Ascendancy", "An animal who wears this collar gains the ability to speak and understand common speech."),
  row(50, "Temporal Sanctuary", "A PC who takes a rest in the temporal sanctuary can choose an additional downtime move."),
  row(51, "Hero’s Helm", "When you critically succeed on an attack, all allies within Close range gain a Hope."),
  row(52, "Rings of Friendship", "Two creatures can wear this pair of rings shaped like coiled snakes. You can spend the Hope of whoever is wearing the other ring (with their permission) as if it were your own."),
  row(53, "Rings of Camaraderie", "Two creatures can wear this pair of wooden rings. You can mark the Stress of whoever is wearing the other ring (with their permission) as if it were your own."),
  row(54, "Rings of Alliance", "Two creatures can wear this pair of rose gold rings. Once per session, you can initiate a Tag Team Roll with whoever is wearing the other ring without spending Hope or counting against your session limit for Tag Team Rolls."),
  row(55, "Phobophage’s Circlet", "When the GM spends a Fear, roll a **d4**. Once per scene on a result of 4, you clear a Stress."),
  row(56, "Quillshawl", "If an adversary attacks you within Melee range, they must succeed on a **Reaction Roll (12)** or mark a Hit Point."),
  row(57, "Warp Pendant", "Once per rest, **mark a Stress** to teleport to a location you can clearly see."),
  row(58, "Portal Frames", "This pair of small ornate frames, one red and one blue, are connected. Anything that passes into one exits from the other."),
  row(59, "Communion Relic", "Once per rest, you can **spend a Hope** to use an ally’s Experience as if it were your own. You can carry only one relic."),
  row(60, "Augur’s Relic", "Once per long rest, you can activate your Hope feature without spending Hope. You can carry only one relic."),
];

/* ══════════════════════════════════════════════════════════════════════
   CONSUMABLES
   ══════════════════════════════════════════════════════════════════════ */

export const CONSUMABLES = [
  row(1, "Warding Candle", "You can light this candle to fill an area within Close range with a halo of light. A creature outside the halo can’t enter it if they have ill intent toward a creature within it. The candle burns for an hour."),
  row(2, "Iridian Dust", "This multicolored powder sticks to everything and prevents creatures covered in it from becoming _Hidden_."),
  row(3, "Verglasian Seed", "You can use this ice shard to instantly freeze an area of water up to Close range."),
  row(4, "Cupbearer’s Bezoar", "You can swallow this bezoar to become immune to poisons until your next long rest."),
  row(5, "Mossmantle Potion", "You can drink this tea to perfectly blend into natural environments until your next rest."),
  row(6, "Lyrebird Lozenge", "You can dissolve this lozenge in your mouth to perfectly mimic any voice you’ve heard until the end of the scene."),
  row(7, "Vial of Featherfall", "You can drink this potion to ignore damage from falling for the next 10 minutes."),
  row(8, "Chimeric Saliva", "You can apply this saliva to a weapon that deals physical damage to change its damage type to magic until your next rest."),
  row(9, "Packet of Space Dust", "This dust causes anything it covers to become lighter than air. One packet contains enough dust to cover the contents of a picnic basket, and the effects last for an hour."),
  row(10, "Pipeweed", "When you choose the Clear Stress downtime move during a short rest, you can smoke this non-intoxicating leaf to clear an additional Stress. Any other PCs who chose the Clear Stress downtime move also gain this benefit."),
  row(11, "Deathseer’s Powder", "You can sprinkle this powder over a recently deceased corpse to conjure a spectral reprise of their final minute of life."),
  row(12, "Slayer’s Salt", "You can spread this salt in a line along windowsills or thresholds to create a magical barrier that undead creatures can’t cross until the line is broken."),
  row(13, "Yakamel Milk", "After consuming this milk, the next time you clear 1 or more Hit Points, you clear an additional Hit Point."),
  row(14, "Glowmoss Mushroom", "You can break this mushroom into pieces, causing it to glow bright blue until your next long rest."),
  row(15, "Red Ooze Oil", "You can coat your weapon in this oil. The next successful attack you make with this weapon deals an extra **1d8** magic damage and temporarily _Ignites_ the target. While _Ignited_, the target takes **1d4** magic damage when they take the spotlight."),
  row(16, "Instant Camp", "You can unfold this small mechanical box into a camping tent large enough to safely house six people. The tent collapses at the end of your next long rest."),
  row(17, "Bundle of Spiderlegs", "You can eat these spiderlegs to walk on walls until your next rest."),
  row(18, "Ciscan Fog Bottle", "You can break this jar to fill the area within Close range with magical mist. A creature who enters the mist clears a Stress and becomes _Hidden_."),
  row(19, "Snapthorn Seed", "You can throw this seed at a point you can see. It explodes into a tangle of binding vines that temporarily _Restrains_ all creatures within Close range of that point."),
  row(20, "Sprite Bottle", "When you mark your last Hit Point, this bottle shatters to release the Sprite inside. The Sprite clears all your Hit Points before fading from the Mortal Realm."),
  row(21, "Gravity Bomb", "You can throw this peach-sized mechanical orb at a point within Far range. It implodes and pulls all creatures and objects within Close range of that point into Melee range with it."),
  row(22, "Gossip Flower", "You can plant this seed in soil. It instantly grows into a small flower that records everything it hears for up to one week. When plucked, the flower recites what it recorded in real time, then withers."),
  row(23, "Displacement Token", "You can swallow this token to conjure two illusions of yourself that you can control. Each illusion lasts until it takes damage or until your next rest."),
  row(24, "Night Hag’s Dust", "You can blow this dust in an adversary’s face to prevent them from clearing Stress until your next long rest."),
  row(25, "Self-Sewing Thread", "You can use this thread to clear either a Hit Point or 2 Armor Slots."),
  row(26, "Stonemason’s Fortune", "When you throw this gray brick on the ground, it immediately grows into a 6-foot-tall, 10-foot-wide, and 2-foot-deep wall of solid stone."),
  row(27, "Mnemonic Potion", "You can drink this potion to Utilize an Experience without spending a Hope."),
  row(28, "Salamander Salve", "You can apply this salve to your skin to make yourself immune to heat until your next rest."),
  row(29, "Green Ooze Oil", "You can coat your weapon in this oil. The next successful attack you make with this weapon deals an extra **1d8** magic damage and temporarily _Corrodes_ the target. While _Corroded_, the target gains a −2 penalty to their damage thresholds."),
  row(30, "Sunlight Orb", "You can shatter this orb to make the area within Very Far range appear as though it’s sunlit daytime for the next 24 hours."),
  row(31, "Moonlight Orb", "You can shatter this orb to make the area within Very Far range appear as though it’s moonlit nighttime for the next 24 hours."),
  row(32, "Midas Flask", "You can pour this small flask of alchemical liquid over a mundane item to instantly transmute it into a handful of gold."),
  row(33, "Staff of Reversal", "You can break this staff against the ground to reverse one magical transformation or effect within Far range."),
  row(34, "Berserker’s Brew", "When you drink this dram of liquid, you gain a bonus to your Strength and a penalty to your Finesse and Knowledge equal to your Instinct (minimum 1). This effect lasts until you make a death move or until your next rest."),
  row(35, "Emberite Shard", "Choose a point within Far range. All targets within Close range of that point must succeed on a **Reaction Roll (16)** or take **3d6** magic damage and become temporarily _Ablaze_. While _Ablaze_, a creature must roll a **d4** whenever they make an action roll. On a result of 1, they mark a Hit Point. On a result of 4, they clear the _Ablaze_ condition."),
  row(36, "Arcticite Shard", "Choose a point within Far range. All targets within Close range of that point must succeed on a **Reaction Roll (16)** or take **3d6** magic damage and become temporarily _Restrained_ by ice."),
  row(37, "Fulgurite Shard", "Choose a point within Far range. All targets within Close range of that point must succeed on a **Reaction Roll (16)** or take **3d6** magic damage and mark **1d4** Stress as lightning crackles through the area."),
  row(38, "Demiurge’s Draught", "You can drink this draught to gain a +1 bonus to your Proficiency for your next successful attack roll."),
  row(39, "Cockerel Claw Tea", "You can drink this tea to refresh your features as if you had taken a long rest."),
  row(40, "Potion of Vigilance", "You can drink this potion to gain a +1 bonus to your Evasion until you mark a Hit Point."),
  row(41, "Cacophonous Concoction", "When you drink this potion, anything you say or do in the next hour becomes impossible for a witness to recount. Any attempts they make to communicate what they saw, heard, or otherwise sensed comes out garbled or nonsensical."),
  row(42, "Nightmare Mead", "You can drink this potion to discover the deepest fear of the next person you make eye contact with. When you do, the GM gains a Fear."),
  row(43, "Stake of Abjuration", "You can hammer this stake into the ground and make a proclamation. Until your next rest, a creature within Far range of the stake who transgresses that proclamation must mark a Stress. The stake lasts until your next rest, then it shatters."),
  row(44, "Psychopomp’s Shroud", "You can place this shroud over the corpse of a recently deceased creature. The creature’s spirit enters the shroud and becomes your spectral assistant until the next sunrise, when they pass through the veil of death and take the shroud with them."),
  row(45, "Phial of Deep Ink", "You can drink this bottle of ink to transform into a cephalopod of roughly your size for the next hour. You gain rubbery skin, soft bones, the ability to breathe underwater, and new limbs until you have eight total."),
  row(46, "Mesmer’s Tonic", "When you drink this tonic, the only thing you can hear until your next rest are the surface thoughts of creatures within Very Close range."),
  row(47, "Invisibility Potion", "You are _Hidden_ until you deal damage to another creature or until your next rest."),
  row(48, "Formoid Serum", "You can drink this potion to become a swarm of 16 million ants until the end of the scene. You keep and have access to all equipment, loot, and features."),
  row(49, "Steelskin Salve", "You can apply this salve to your skin to gain a bonus to your damage thresholds equal to your tier until the end of the scene."),
  row(50, "Godling’s Pomelo", "You can eat this citrus fruit to clear all Hit Points and Stress."),
  row(51, "Snakeskin Spirit", "You can drink this potion to slough off your outer layer of skin and heal a scar."),
  row(52, "Magic-User’s Malison", "When you release this spellcaster’s trapped soul, you can cast one spell from a card in your vault as if it were in your loadout. This doesn’t work for permanently vaulted cards."),
  row(53, "Quintessential Severant", "You can use this magic blade to cut one magical or metaphysical bond, such as an enchantment, contract, magical tether, or divine oath. When you do, the blade shatters."),
  row(54, "Mask of the Echoed Self", "You can wear this mask during your next level up to swap the values of any of your traits. When you do, the mask becomes your permanent face."),
  row(55, "Necroprancer’s Bell", "You can break this rusted, clapperless bell against the ground to summon a skeletal steed that climbs out of the earth and serves you until the next sunrise."),
  row(56, "Drakemantle", "You can use this enchanted ancient dragon hide to gain draconic characteristics until the end of the scene, when the hide falls aways in tatters. Until then, you can fly and gain a +5 bonus to your damage thresholds and a +1 bonus to your Proficiency."),
  row(57, "Gambler’s Fallacy", "You can spend any number of handfuls of gold by placing them into this slotted ceramic jar shaped like a pig. When you throw the jar at a point within Far range, it explodes and deals **1d20** magic damage for each handful of gold spent to all creatures within Close range of that point. All gold within the jar is destroyed."),
  row(58, "Lionheart Tonic", "You can drink this tonic to gain a +1 bonus to your Proficiency until you roll with Fear."),
  row(59, "Tears of the Undying Hero", "When you drink this potion, death can’t touch you until your next long rest. When you would mark your last Hit Point, instead of making a death move, you make one final action roll before falling into a dreamless slumber until an ally chooses the Tend to Wounds downtime move to clear your Hit Points."),
  row(60, "Featherstep Potion", "You can drink this potion to sprout small wings from your ankles that give you a bonus to your Evasion equal to your tier until your next rest."),
];
