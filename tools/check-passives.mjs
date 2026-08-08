/** Audit every compendium rule that can change its owning PC's sheet. */

import CLASSES from "../src/packs-src/classes.mjs";
import HERITAGE from "../src/packs-src/heritage.mjs";
import DOMAINS from "../src/packs-src/domains.mjs";
import EQUIPMENT from "../src/packs-src/equipment.mjs";

const entries = [...CLASSES, ...HERITAGE, ...DOMAINS, ...EQUIPMENT];
const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const STAT = /armor score|armor slots?|damage thresholds?|major (?:damage )?threshold|severe (?:damage )?threshold|hit point slots?|stress slots?|proficiency|evasion|experiences?|\b(?:agility|strength|finesse|instinct|presence|knowledge)\b|attack rolls?|action rolls?|reaction rolls?|damage rolls?|primary weapon damage|spellcast rolls?|loadout/i;
const EFFECT = /(?:gain|take|receive|have|add|reduce|increase|decrease|double|make|use|roll)[^.]{0,100}(?:bonus|penalty|additional|extra|equal to|instead of|damage die|damage dice|threshold|slot|proficiency|evasion|trait|roll)|[+−-]\d+[^.]{0,80}(?:roll|threshold|evasion|proficiency|trait)|doesn(?:’|')t count against your loadout/i;

/** Ownership/loadout/equipped state alone cannot truthfully activate these. */
const DECLINED = {
  "subclass:Winged Sentinel: Specialization:Ethereal Visage": "Only while flying.",
  "subclass:Call of the Slayer: Foundation:Slayer": "Optional spendable Slayer Dice.",
  "feature:Favored": "Requires a selected trait the Item does not record.",
  "feature:Isolating": "Depends on owner and target positions.",
  "ancestry:Simiah:Natural Climber": "Only balancing and climbing rolls.",
  "community:Ridgeborne:Steady": "Only narrative circumstances.",
  "ancestry:Aetheris:Celestial Wings": "Optional spend while flying.",
  "domainCard:Codex-Touched": "Optional Stress spend on one roll.",
  "domainCard:Inspirational Words": "A tracked token spent on an ally.",
  "domainCard:Grace-Touched": "Changes an optional payment and target outcome.",
  "domainCard:Midnight-Touched": "Optional Stress spend after an attack.",
  "domainCard:Shadowhunter": "Requires low light or darkness.",
  "domainCard:Sage-Touched": "Requires a natural environment or per-roll choice.",
  "domainCard:Dread-Touched": "Once-per-rest choice using the world Fear pool.",
  "domainCard:Vitality": "Choose two benefits; the card does not record which two.",
  "consumable:Stride Potion": "One-use next-roll effect.",
  "consumable:Bolster Potion": "One-use next-roll effect.",
  "consumable:Control Potion": "One-use next-roll effect.",
  "consumable:Attune Potion": "One-use next-roll effect.",
  "consumable:Charm Potion": "One-use next-roll effect.",
  "consumable:Enlighten Potion": "One-use next-roll effect.",
  "consumable:Major Stride Potion": "Timed effect begins only after use.",
  "consumable:Major Bolster Potion": "Timed effect begins only after use.",
  "consumable:Major Control Potion": "Timed effect begins only after use.",
  "consumable:Major Attune Potion": "Timed effect begins only after use.",
  "consumable:Major Charm Potion": "Timed effect begins only after use.",
  "consumable:Major Enlighten Potion": "Timed effect begins only after use.",
};

/*
 * Exact review manifest for rules that mention a self-facing sheet/roll
 * change but cannot be activated from ownership, loadout or equipped state.
 * They require a spend, token/die, chosen trait/Experience, transformation,
 * stance, target, environment, or other momentary state. Keeping the keys
 * exact means a renamed/new rule fails this audit instead of being silently
 * waved through by a broad prose heuristic.
 */
/*
 * Root and Void's thirty-one are at the foot of the list below, and they are
 * worth a word because they arrive as one block rather than one at a time.
 *
 * Two of the forty-two *are* automated and are therefore absent: Root-Touched
 * and Void-Touched each carry a `spellcastRoll` modifier in
 * `passive-modifiers.mjs`, which is what the printed `-Touched` cards do and
 * the only thing on either deck that ownership alone can truthfully activate.
 *
 * The rest fail the candidate test for two reasons and neither is a passive.
 * Most are the STAT/EFFECT pair firing on the words "make a Spellcast Roll",
 * which every spell in the game says — the same over-match that put a hundred
 * and thirty-three printed domain cards on this list. The handful that really
 * do move a number move it either on a *target* (Crush, Rend, Thorn Spray) or
 * only after you have spent something to turn them on (Barkskin, The Beast,
 * Alpha, Apex), and an activated state is exactly what the note above DECLINED
 * says ownership cannot stand in for.
 */
const REVIEWED_MANUAL = new Set([
  ...Object.keys(DECLINED),
  ...`class:Druid:Beastform
subclass:Warden of the Elements: Foundation:Elemental Incarnation
subclass:Warden of the Elements: Specialization:Elemental Aura
subclass:Warden of the Elements: Mastery:Elemental Dominion
class:Guardian:Unstoppable
subclass:Vengeance: Specialization:Act of Reprisal
subclass:Beastbound: Specialization:Battle-Bonded
subclass:Wayfinder: Foundation:Ruthless Predator
subclass:Wayfinder: Specialization:Elusive Predator
class:Rogue:Sneak Attack
class:Rogue:Rogue’s Dodge
subclass:Nightwalker: Specialization:Adrenaline
subclass:Syndicate: Specialization:Contacts Everywhere
subclass:Elemental Origin: Foundation:Elementalist
subclass:Elemental Origin: Specialization:Natural Evasion
subclass:Elemental Origin: Mastery:Transcendence
subclass:Primal Origin: Foundation:Manipulate Magic
subclass:Primal Origin: Mastery:Arcane Charge
class:Warrior:No Mercy
subclass:School of Knowledge: Foundation:Prepared
subclass:School of Knowledge: Specialization:Accomplished
subclass:School of Knowledge: Mastery:Brilliant
class:Assassin:Marked for Death
subclass:Executioners Guild: Specialization:Scorpion’s Poise
subclass:Poisoners Guild: Foundation:Toxic Concoctions
subclass:Juggernaut: Mastery:Pummeljoy
subclass:Martial Artist: Specialization:Keen Defenses
feature:Favored
feature:Reliable
feature:Aggressive
feature:Anchored
feature:Honed
subclass:Pact of the Endless: Foundation:Patron’s Mantle
subclass:Pact of the Wrathful: Foundation:Patron’s Fury
subclass:Hedge: Mastery:Circle of Power
subclass:Moon: Specialization:Moonbeam
subclass:Moon: Mastery:Lunar Phases
ancestry:Clank:Purposeful Design
ancestry:Faerie:Wings
community:Seaborne:Know the Tide
ancestry:Skykin:Eye of the Storm
domainCard:Cinder Grasp
domainCard:Deadly Focus
domainCard:Vitality
domainCard:Rage Up
domainCard:Frenzy
domainCard:Gore and Glory
domainCard:Deft Maneuvers
domainCard:I See it Coming
domainCard:Strategic Approach
domainCard:Boost
domainCard:Splintering Strike
domainCard:Deathrun
domainCard:Book of Ava
domainCard:Teleport
domainCard:Sigil of Retribution
domainCard:Words of Discord
domainCard:Never Upstaged
domainCard:Master of the Craft
domainCard:Notorious
domainCard:Rain of Blades
domainCard:Midnight-Touched
domainCard:Shadowhunter
domainCard:Spellcharge
domainCard:Twilight Toll
domainCard:Gifted Tracker
domainCard:Nature’s Tongue
domainCard:Natural Familiar
domainCard:Conjured Steeds
domainCard:Forager
domainCard:Sage-Touched
domainCard:Forest Sprites
domainCard:Fane of the Wilds
domainCard:Force of Nature
domainCard:Overwhelming Aura
domainCard:Forceful Push
domainCard:Full Surge
domainCard:Siphon Essence
domainCard:Dread-Touched
weapon:Wand of Enthrallment:Persuasive
weapon:Midas Scythe:Greedy
weapon:Buckler:Deflecting
weapon:Powered Gauntlet:Charged
armor:Tyris Soft Armor:Quiet
armor:Spiked Plate Armor:Sharp
armor:Dunamis Silkchain:Timeslowing
consumable:Stride Potion
consumable:Bolster Potion
consumable:Control Potion
consumable:Attune Potion
consumable:Charm Potion
consumable:Enlighten Potion
consumable:Vial of Darksmoke
consumable:Major Stride Potion
consumable:Major Bolster Potion
consumable:Major Control Potion
consumable:Major Attune Potion
consumable:Major Charm Potion
consumable:Major Enlighten Potion
consumable:Shrinking Potion
consumable:Growing Potion
loot:Charging Quiver
loot:Piercing Arrows
loot:Arcane Prism
loot:Lorekeeper
loot:Phoenix Feather
loot:Honing Relic
weapon:Blitz Hammer:Accelerator
weapon:Infinite Staff:Extending
weapon:Staff of Augma:Catalytic
weapon:Hatchet:Follow-Up
weapon:Improved Hatchet:Follow-Up
weapon:Eldritch Vambrace:Deflecting
weapon:Advanced Hatchet:Follow-Up
weapon:Legendary Hatchet:Follow-Up
armor:Hallowed Heroplate:Blessed
armor:Resonant Harness:Vitreous
consumable:Berserker’s Brew
consumable:Demiurge’s Draught
consumable:Potion of Vigilance
consumable:Steelskin Salve
consumable:Drakemantle
consumable:Lionheart Tonic
loot:Titan’s Girdle
loot:Reliquary of the Sightless Saint
loot:Eclipse Coin
loot:Insomniac’s Periapt
class:Bard:Rally
subclass:Wordsmith: Foundation:Heart of a Poet
subclass:Stalwart: Foundation:Iron Will
subclass:Stalwart: Specialization:Partners in Arms
subclass:Wayfinder: Mastery:Apex Predator
subclass:Nightwalker: Specialization:Dark Cloud
subclass:Syndicate: Mastery:Reliable Backup
subclass:Divine Wielder: Foundation:Spirit Weapon
class:Sorcerer:Minor Illusion
class:Sorcerer:Channel Raw Power
subclass:Primal Origin: Specialization:Enchanted Aid
class:Warrior:Attack of Opportunity
subclass:Call of the Slayer: Specialization:Weapon Specialist
subclass:Call of the Slayer: Mastery:Martial Preparation
class:Wizard:Not This Time
subclass:School of Knowledge: Foundation:Adept
subclass:School of Knowledge: Mastery:Honed Expertise
subclass:School of War: Foundation:Face Your Fear
subclass:Poisoners Guild: Mastery:Venomancer
subclass:Martial Artist: Specialization:Focus Cannon
feature:Vigilant
class:Warlock:Patron’s Pact
class:Warlock:Favor
subclass:Pact of the Endless: Mastery:Draining Bane
subclass:Pact of the Wrathful: Mastery:Fearsome Attack
class:Witch:Hex
class:Witch:Commune
subclass:Hedge: Specialization:Walk Between Worlds
subclass:Moon: Foundation:Night’s Glamour
ancestry:Elf:Quick Reactions
ancestry:Faerie:Luckbender
ancestry:Fungril:Fungril Network
ancestry:Galapa:Retract
ancestry:Human:Adaptability
ancestry:Katari:Feline Instincts
ancestry:Katari:Retracting Claws
ancestry:Ribbet:Long Tongue
ancestry:Emberkin:Ignition
ancestry:Gnome:Nimble Fingers
transformation:Vampire:Fangs
transformation:Vampire:Feed
transformation:Werewolf:Wolf Form
domainCard:Unleash Chaos
domainCard:Counterspell
domainCard:Flight
domainCard:Blink Out
domainCard:Preservation Blast
domainCard:Chain Lightning
domainCard:Rift Walker
domainCard:Telekinesis
domainCard:Cloaking Blast
domainCard:Confusing Aura
domainCard:Earthquake
domainCard:Sensory Projection
domainCard:Falling Sky
domainCard:Battle Cry
domainCard:Reaper’s Strike
domainCard:Onslaught
domainCard:Ferocity
domainCard:Brace
domainCard:Tactician
domainCard:Redirect
domainCard:Know Thy Enemy
domainCard:Wrangle
domainCard:Book of Illiat
domainCard:Book of Tyfar
domainCard:Book of Sitil
domainCard:Book of Vagras
domainCard:Book of Korvax
domainCard:Book of Norai
domainCard:Book of Exota
domainCard:Book of Grynn
domainCard:Manifest Wall
domainCard:Banish
domainCard:Book of Homet
domainCard:Book of Vyola
domainCard:Book of Ronin
domainCard:Disintegration Wave
domainCard:Book of Yarrow
domainCard:Enrapture
domainCard:Tell No Lies
domainCard:Troublemaker
domainCard:Hypnotic Shimmer
domainCard:Invisibility
domainCard:Thought Delver
domainCard:Endless Charisma
domainCard:Mass Enrapture
domainCard:Encore
domainCard:Pick and Pull
domainCard:Uncanny Disguise
domainCard:Midnight Spirit
domainCard:Shadowbind
domainCard:Veil of Night
domainCard:Glyph of Nightfall
domainCard:Hush
domainCard:Dark Whispers
domainCard:Vanishing Dodge
domainCard:Night Terror
domainCard:Eclipse
domainCard:Specter of the Dark
domainCard:Vicious Entangle
domainCard:Conjure Swarm
domainCard:Corrosive Projectile
domainCard:Towering Stalk
domainCard:Death Grip
domainCard:Wild Fortress
domainCard:Wild Surge
domainCard:Rejuvenation Barrier
domainCard:Plant Dominion
domainCard:Tempest
domainCard:Bolt Beacon
domainCard:Final Words
domainCard:Healing Hands
domainCard:Smite
domainCard:Zone of Protection
domainCard:Shield Aura
domainCard:Stunning Sunlight
domainCard:Salvation Beam
domainCard:Resurrection
domainCard:I Am Your Shield
domainCard:Bold Presence
domainCard:Goad Them On
domainCard:Inevitable
domainCard:Ground Pound
domainCard:Unyielding Armor
domainCard:Blighting Strike
domainCard:Umbral Veil
domainCard:Voice of Dread
domainCard:Hideous Retribution
domainCard:Terrify
domainCard:Summon Horror
domainCard:Spectral Mist
domainCard:Darkfire
domainCard:Wall of Hunger
domainCard:Dark Army
domainCard:Damnation
domainCard:Avatar of Terror
weapon:Hammer of Wrath:Devastating
weapon:Meridian Cutlass:Dueling
armor:Elundrian Chain Armor:Warded
armor:Harrowbone Armor:Resilient
armor:Irontree Breastplate Armor:Reinforced
armor:Full Fortified Armor:Fortified
consumable:Grindletooth Venom
consumable:Unstable Arcane Shard
consumable:Improved Grindletooth Venom
consumable:Armor Stitcher
consumable:Improved Arcane Shard
consumable:Redthorn Saliva
consumable:Mythic Dust
consumable:Major Arcane Shard
consumable:Dragonbloom Tea
loot:Woven Net
loot:Valorstone
loot:Skeleton Key
loot:Corrector Sprite
loot:Bag of Ficklesand
weapon:Bec de Corbin:Devastating
weapon:Gravity Arbalest:Magnetic
armor:Stormthread Habit:Absorbing
armor:Trollhide Cuirass:Self-Healing
armor:Astral Raiment:Stellar
armor:Deep-Forged Coral Armor:Aquatic
consumable:Self-Sewing Thread
consumable:Green Ooze Oil
consumable:Emberite Shard
consumable:Tears of the Undying Hero
loot:Grapnel
loot:Loaded Dice
loot:Crucible Frames
domainCard:Excise
domainCard:Null Grip
domainCard:Fold
domainCard:Weight of the Void
domainCard:Silence the Song
domainCard:Vector
domainCard:Unmake
domainCard:Crush
domainCard:The Hollow Note
domainCard:Elsewhere
domainCard:Solve
domainCard:Erasure
domainCard:Geometry of Ruin
domainCard:Sever
domainCard:Disjunction
domainCard:Second Silence
domainCard:Barkskin
domainCard:Hungry Fire
domainCard:The Pack Knows
domainCard:Thorn Spray
domainCard:Amber
domainCard:The Beast
domainCard:Rend
domainCard:Regrow
domainCard:Wildfire
domainCard:Alpha
domainCard:Deep Dreaming
domainCard:Bloom
domainCard:The Long Memory
domainCard:The Undergrowth Wakes
domainCard:The World Tree`.split("\n"),
]);

const TARGETS = new Set([
  "actionRoll", "reactionRoll", "attackRoll", "damageRoll", "spellcastRoll",
  "ownAttack", "ownDamage", "primaryAttack", "primaryDamage", "damageProficiency",
  "trait", "evasion", "armorScore", "thresholds", "majorThreshold", "severeThreshold",
  "hitPoints", "stress", "proficiency", "loadoutLimit", "bareBones",
]);
const SOURCES = new Set(["fixed", "proficiency", "tier", "level", "markedStress", "trait", "spellcastTrait", "maxAgilityFinesse"]);
const CONDITIONS = new Set(["always", "armor", "noArmor", "noPrimary", "noWeapons", "hope", "stressFull", "domain", "weapon", "physicalWeapon", "meleeWeapon", "veryCloseWeapon"]);

const blocksOf = (e) => {
  const s = e.system ?? {};
  const out = [];
  const add = (v, own = false) => {
    if (!v) return;
    if (Array.isArray(v)) return v.forEach((x) => add(x));
    if (typeof v === "string") out.push({ name: "", text: v, modifiers: own ? (s.modifiers ?? []) : [] });
    else if (v.description) out.push({ name: v.name ?? "", text: v.description, modifiers: v.modifiers ?? [] });
  };
  if (["domainCard", "feature", "loot", "consumable"].includes(e.type)) add(s.description, true);
  add(s.topFeature); add(s.bottomFeature); add(s.feature); add(s.features); add(s.classFeatures); add(s.hopeFeature);
  return out;
};

const keyOf = (e, b) => `${e.type}:${e.name}${b.name ? `:${b.name}` : ""}`;
const failures = [];
let candidates = 0;
let automatic = 0;
const knownBlocks = new Set();
const automaticBlocks = new Set();
const reviewedCandidates = new Set();

for (const e of entries) {
  for (const b of blocksOf(e)) {
    const key = keyOf(e, b);
    knownBlocks.add(key);
    for (const m of b.modifiers) {
      if (!TARGETS.has(m.target)) failures.push(`${e.type}:${e.name} has unknown target ${m.target}`);
      if (!SOURCES.has(m.source ?? "fixed")) failures.push(`${e.type}:${e.name} has unknown source ${m.source}`);
      if (!CONDITIONS.has(m.condition ?? "always")) failures.push(`${e.type}:${e.name} has unknown condition ${m.condition}`);
    }
    const text = plain(b.text);
    if (b.modifiers.length) automaticBlocks.add(key);
    if (!(STAT.test(text) && EFFECT.test(text))) continue;
    candidates++;
    if (b.modifiers.length) { automatic++; continue; }
    if (REVIEWED_MANUAL.has(key)) reviewedCandidates.add(key);
    else failures.push(`Unclassified passive candidate: ${key}\n  ${text}`);
  }
}

for (const key of REVIEWED_MANUAL) {
  if (!knownBlocks.has(key)) failures.push(`Stale reviewed manual rule: ${key}`);
}

if (failures.length) {
  console.error(`check-passives: ${failures.length} finding(s)\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`check-passives: ${entries.length} documents swept; ${automaticBlocks.size} automatic rule blocks and ${REVIEWED_MANUAL.size} explicitly reviewed stateful, chosen, targeted or situational rules.`);
}
