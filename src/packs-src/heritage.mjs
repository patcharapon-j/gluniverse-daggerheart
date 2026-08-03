/**
 * The heritage pack: the corebook's eighteen ancestries and nine communities,
 * plus *Hope and Fear*'s six and six from `hf-heritage.mjs` and its six
 * transformations from `transformations.mjs`.
 *
 * Everything below this header is the corebook's. The other book is separate
 * modules for a reason that is about provenance rather than tidiness — see
 * the imports.
 *
 * Text follows the printed cards, as the official Daggerheart Card Creator
 * publishes them — not the rulebook's chapter on heritage. The two differ, and
 * the difference is the point: the chapter runs a paragraph of anatomy and
 * lifespan per ancestry, and the card prints one sentence. A card is what you
 * hold at the table and one sentence is what fits on it, so one sentence is
 * what this compendium carries. `tools/check-cards.mjs` re-checks every line
 * below against `official-cards.json` and will say so if one drifts.
 *
 * One pack, not two: heritage is one line on the character sheet and one
 * choice at the table — "wildborne faun" — and splitting it across two
 * compendiums would make you open two windows to fill in one field. They are
 * still two Item subtypes, so nothing about the data is blurred.
 *
 * An ancestry's two features are `top` and `bottom`, named for where they sit
 * on the card rather than for what they do, because that position is the
 * rule: mixed ancestry takes the top of one and the bottom of another.
 *
 * Header art, artist and card number are not written here — `ancestryItem` and
 * `communityItem` look them up by name in the generated `card-printings.mjs`.
 */

import { ancestryItem, communityItem, feat } from "./_helpers.mjs";
/* Nothing upstream publishes either of these, so `tools/check-cards.mjs` needs
   to tell them apart from the twenty-seven below. Importing the modules is how
   it tells: what they export is, by definition, what has no official card. */
import HOPE_AND_FEAR from "./hf-heritage.mjs";
import TRANSFORMATIONS from "./transformations.mjs";
import { withDice } from "./card-resources.mjs";

/* ══════════════════════════════════════════════════════════════════════
   ANCESTRIES
   ══════════════════════════════════════════════════════════════════════ */

const ancestries = [
  ancestryItem({
    name: "Clank",
    description: `
    Clanks are sentient mechanical beings built from a variety of materials, including metal,
    wood, and stone.`,
    top: feat(
      "Purposeful Design",
      `
      Decide who made you and for what purpose. At character creation, choose one of your
      Experiences that best aligns with this purpose and gain a permanent +1 bonus to it.`,
    ),
    bottom: feat(
      "Efficient",
      `
      When you take a short rest, you can choose a long rest move instead of a short rest move.`,
    ),
  }),

  ancestryItem({
    name: "Drakona",
    description: `
    Drakona resemble wingless dragons in humanoid form and possess a powerful elemental breath.`,
    top: feat(
      "Scales",
      `
      Your scales act as natural protection. When you would take Severe damage, you can **mark a
      Stress** to mark 1 fewer Hit Points.`,
    ),
    bottom: feat(
      "Elemental Breath",
      `
      Choose an element for your breath (such as electricity, fire, or ice). You can use this
      breath against a target or group of targets within Very Close range, treating it as an
      Instinct weapon that deals **d8** magic damage using your Proficiency.`,
    ),
  }),

  ancestryItem({
    name: "Dwarf",
    description: `
    Dwarves are most easily recognized as short humanoids with square frames, dense musculature,
    and thick hair.`,
    top: feat(
      "Thick Skin",
      `
      When you take Minor damage, you can **mark 2 Stress** instead of marking a Hit Point.`,
    ),
    bottom: feat("Increased Fortitude", "**Spend 3 Hope** to halve incoming physical damage."),
  }),

  ancestryItem({
    name: "Elf",
    description: `
    Elves are typically tall humanoids with pointed ears and acutely attuned senses.`,
    top: feat("Quick Reactions", "**Mark a Stress** to gain advantage on a reaction roll."),
    bottom: feat(
      "Celestial Trance",
      `
      During a rest, you can drop into a trance to choose an additional downtime move.`,
    ),
  }),

  ancestryItem({
    name: "Faerie",
    description: "Faeries are winged humanoid creatures with insectile features.",
    top: feat(
      "Luckbender",
      `
      Once per session, after you or a willing ally within Close range makes an action roll, you
      can **spend 3 Hope** to reroll the Duality Dice.`,
    ),
    bottom: feat(
      "Wings",
      `
      You can fly. While flying, you can **mark a Stress** after an adversary makes an attack
      against you to gain a +2 bonus to your Evasion against that attack.`,
    ),
  }),

  ancestryItem({
    name: "Faun",
    description: `
    Fauns resemble humanoid goats with curving horns, square pupils, and cloven hooves.`,
    top: feat(
      "Caprine Leap",
      `
      You can leap anywhere within Close range as though you were using normal movement,
      allowing you to vault obstacles, jump across gaps, or scale barriers with ease.`,
    ),
    bottom: feat(
      "Kick",
      `
      When you succeed on an attack against a target within Melee range, you can **mark a
      Stress** to kick yourself off them, dealing an extra **2d6** damage and knocking back
      either yourself or the target to Very Close range.`,
    ),
  }),

  ancestryItem({
    name: "Firbolg",
    description: `
    Firbolgs are bovine humanoids typically recognized by their broad noses and long, drooping
    ears.`,
    top: feat(
      "Charge",
      `
      When you succeed on an Agility Roll to move from Far or Very Far range into Melee range
      with one or more targets, you can **mark a Stress** to deal **1d12** physical damage to
      all targets within Melee range.`,
    ),
    bottom: feat(
      "Unshakable",
      `
      When you would mark a Stress, roll a **d6**. On a result of 6, don’t mark it.`,
    ),
  }),

  ancestryItem({
    name: "Fungril",
    description: "Fungril resemble humanoid mushrooms.",
    top: feat(
      "Fungril Network",
      `
      Make an **Instinct Roll (12)** to use your mycelial array to speak with others of your
      ancestry. On a success, you can communicate across any distance.`,
    ),
    bottom: feat(
      "Death Connection",
      `
      While touching a corpse that died recently, you can **mark a Stress** to extract one
      memory from the corpse related to a specific emotion or sensation of your choice.`,
    ),
  }),

  ancestryItem({
    name: "Galapa",
    description: `
    Galapa resemble anthropomorphic turtles with large, domed shells into which they can
    retract.`,
    top: feat("Shell", "Gain a bonus to your damage thresholds equal to your Proficiency.", [
      { target: "thresholds", source: "proficiency" },
    ]),
    bottom: feat(
      "Retract",
      `
      **Mark a Stress** to retract into your shell. While in your shell, you have resistance to
      physical damage, you have disadvantage on action rolls, and you can’t move.`,
    ),
  }),

  ancestryItem({
    name: "Giant",
    description: `
    Giants are towering humanoids with broad shoulders, long arms, and one to three eyes.`,
    top: feat("Endurance", "Gain an additional Hit Point slot at character creation.", [
      { target: "hitPoints", value: 1 },
    ]),
    bottom: feat(
      "Reach",
      `
      Treat any weapon, ability, spell, or other feature that has a Melee range as though it has
      a Very Close range instead.`,
    ),
  }),

  ancestryItem({
    name: "Goblin",
    description: `
    Goblins are small humanoids easily recognizable by their large eyes and massive membranous
    ears.`,
    top: feat("Surefooted", "You ignore disadvantage on Agility Rolls."),
    bottom: feat(
      "Danger Sense",
      `
      Once per rest, **mark a Stress** to force an adversary to reroll an attack against you or
      an ally within Very Close range.`,
    ),
  }),

  ancestryItem({
    name: "Halfling",
    description: "Halflings are small humanoids with large hairy feet and prominent rounded ears.",
    top: feat("Luckbringer", "At the start of each session, everyone in your party gains a Hope."),
    bottom: feat("Internal Compass", "When you roll a 1 on your Hope Die, you can reroll it."),
  }),

  ancestryItem({
    name: "Human",
    description: `
    Humans are most easily recognized by their dexterous hands, rounded ears, and bodies built
    for endurance.`,
    top: feat("High Stamina", "Gain an additional Stress slot at character creation.", [
      { target: "stress", value: 1 },
    ]),
    bottom: feat(
      "Adaptability",
      `
      When you fail a roll that utilized one of your Experiences, you can **mark a Stress** to
      reroll.`,
    ),
  }),

  ancestryItem({
    name: "Infernis",
    description: `
    Infernis are humanoids who possess sharp canine teeth, pointed ears, and horns. They are the
    descendants of demons from the Circles Below.`,
    top: feat(
      "Fearless",
      `
      When you roll with Fear, you can **mark 2 Stress** to change it into a roll with Hope
      instead.`,
    ),
    bottom: feat("Dread Visage", "You have advantage on rolls to intimidate hostile creatures."),
  }),

  ancestryItem({
    name: "Katari",
    description: `
    Katari are feline humanoids with retractable claws, vertically slit pupils, and high,
    triangular ears.`,
    top: feat(
      "Feline Instincts",
      `
      When you make an Agility Roll, you can **spend 2 Hope** to reroll your Hope Die.`,
    ),
    bottom: feat(
      "Retracting Claws",
      `
      Make an **Agility Roll** to scratch a target within Melee range. On a success, they become
      temporarily _Vulnerable_.`,
    ),
  }),

  ancestryItem({
    name: "Orc",
    description: `
    Orcs are humanoids most easily recognized by their square features and boar-like tusks that
    protrude from their lower jaw.`,
    top: feat("Sturdy", "When you have 1 Hit Point remaining, attacks against you have disadvantage."),
    bottom: feat(
      "Tusks",
      `
      When you succeed on an attack against a target within Melee range, you can **spend a
      Hope** to gore the target with your tusks, dealing an extra **1d6** damage.`,
    ),
  }),

  ancestryItem({
    name: "Ribbet",
    description: `
    Ribbets resemble anthropomorphic frogs with protruding eyes and webbed hands and feet.`,
    top: feat("Amphibious", "You can breathe and move naturally underwater."),
    bottom: feat(
      "Long Tongue",
      `
      You can use your long tongue to grab onto things within Close range. **Mark a Stress** to
      use your tongue as a Finesse Close weapon that deals **d12** physical damage using your
      Proficiency.`,
    ),
  }),

  ancestryItem({
    name: "Simiah",
    description: `
    Simiah resemble anthropomorphic monkeys and apes with long limbs and prehensile feet.`,
    top: feat(
      "Natural Climber",
      `
      You have advantage on Agility Rolls that involve balancing and climbing.`,
    ),
    bottom: feat("Nimble", "Gain a permanent +1 bonus to your Evasion at character creation.", [
      { target: "evasion", value: 1 },
    ]),
  }),
];

/* ══════════════════════════════════════════════════════════════════════
   COMMUNITIES
   ══════════════════════════════════════════════════════════════════════ */

const communities = [
  communityItem({
    name: "Highborne",
    description: `
    Being part of a highborne community means you’re accustomed to a life of elegance, opulence,
    and prestige within the upper echelons of society.`,
    feature: feat(
      "Privilege",
      `
      You have advantage on rolls to consort with nobles, negotiate prices, or leverage your
      reputation to get what you want.`,
    ),
  }),

  communityItem({
    name: "Loreborne",
    description: `
    Being part of a loreborne community means you’re from a society that favors strong academic
    or political prowess.`,
    feature: feat(
      "Well-Read",
      `
      You have advantage on rolls that involve the history, culture, or politics of a prominent
      person or place.`,
    ),
  }),

  communityItem({
    name: "Orderborne",
    description: `
    Being part of an orderborne community means you’re from a collective that focuses on
    discipline or faith, and you uphold a set of principles that reflect your experience there.`,
    feature: feat(
      "Dedicated",
      `
      Record three sayings or values your upbringing instilled in you. Once per rest, when you
      describe how you’re embodying one of these principles through your current action, you can
      roll a **d20** as your Hope Die.`,
    ),
  }),

  communityItem({
    name: "Ridgeborne",
    description: `
    Being part of a ridgeborne community means you’ve called the rocky peaks and sharp cliffs of
    the mountainside home.`,
    feature: feat(
      "Steady",
      `
      You have advantage on rolls to traverse dangerous cliffs and ledges, navigate harsh
      environments, and use your survival knowledge.`,
    ),
  }),

  communityItem({
    name: "Seaborne",
    description: `
    Being part of a seaborne community means you lived on or near a large body of water.`,
    feature: feat(
      "Know the Tide",
      `
      You can sense the ebb and flow of life. When you roll with Fear, place a token on this
      card. You can hold a number of tokens equal to your level. Before you make an action roll,
      you can spend any number of these tokens to gain a +1 bonus to the roll for each token
      spent. At the end of each session, clear all unspent tokens.`,
    ),
  }),

  communityItem({
    name: "Slyborne",
    description: `
    Being part of a slyborne community means you come from a group that operates outside the
    law, including all manner of criminals, grifters, and con artists.`,
    feature: feat(
      "Scoundrel",
      `
      You have advantage on rolls to negotiate with criminals, detect lies, or find a safe place
      to hide.`,
    ),
  }),

  communityItem({
    name: "Underborne",
    description: "Being part of an underborne community means you’re from a subterranean society.",
    feature: feat(
      "Low-Light Living",
      `
      When you’re in an area with low light or heavy shadow, you have advantage on rolls to
      hide, investigate, or perceive details within that area.`,
    ),
  }),

  communityItem({
    name: "Wanderborne",
    description: `
    Being part of a wanderborne community means you’ve lived as a nomad, forgoing a permanent
    home and experiencing a wide variety of cultures.`,
    feature: feat(
      "Nomadic Pack",
      `
      Add a Nomadic Pack to your inventory. Once per session, you can **spend a Hope** to reach
      into this pack and pull out a mundane item that’s useful to your situation. Work with the
      GM to figure out what item you take out.`,
    ),
  }),

  communityItem({
    name: "Wildborne",
    description: "Being part of a wildborne community means you lived deep within the forest.",
    feature: feat(
      "Lightfoot",
      `
      Your movement is naturally silent. You have advantage on rolls to move without being
      heard.`,
    ),
  }),
];

/* Order is corebook first, then the later book, then the transformations —
   which is a grouping rather than a sort. The pack has no folders (one choice
   at the table, one line on the sheet: see above), so insertion order is the
   only grouping there is, and "the eighteen you know, then the six that are
   new" is the one a reader can use. */
export default withDice([
  ...ancestries,
  ...communities,
  ...HOPE_AND_FEAR,
  ...TRANSFORMATIONS,
]);
