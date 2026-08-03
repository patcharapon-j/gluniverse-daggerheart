/**
 * The classes pack: the corebook's nine classes and eighteen subclasses, plus
 * *Hope and Fear*'s four and eight from `hf-classes.mjs`.
 *
 * Everything below this header is the corebook's. The other book's content is
 * a separate module for a reason that is about provenance rather than tidiness
 * — see the import.
 *
 * Class data — Evasion, Hit Points, the Hope feature, the questions — follows
 * *Daggerheart Core Rulebook*, chapter 1. Subclass feature text follows the
 * printed cards, as the official Daggerheart Card Creator publishes them;
 * `tools/check-cards.mjs` re-checks every one against `official-cards.json`.
 *
 * There is no class *card* in the printed set — a class is a page in the book,
 * not a thing you hold — so the class entry is the one place here with no
 * upstream to check against. Its `description` is therefore held to the same
 * rule the real cards keep to: **the chapter's first sentence and nothing
 * else**, and every other line on the card is a rule. Evasion, Hit Points, the
 * Hope feature and the class features are what a class actually *is* at the
 * table, and they are what the card should be mostly made of. The book writes
 * each class in pairs — an opener saying what it is, then a sentence
 * elaborating — and the elaboration is the chapter talking, not the card;
 * `FLAVOUR_SENTENCES` in `tools/check-cards.mjs` is what keeps it out.
 *
 * A subclass expands into three cards — Foundation, Specialization, Mastery —
 * because that is how you actually acquire it: one card now, one several
 * levels from now, one you may never see. `subclassCards` does the expansion
 * so the source stays one entry per subclass, the way the book reads.
 *
 * Where the book heads a section CLASS FEATURES (plural), the schema still
 * holds one block, so the block is named for the heading and each feature
 * leads with its own name in bold — which is how the page prints them.
 */

import { classItem, feat, subclassCards } from "./_helpers.mjs";
/* *Hope and Fear*'s four classes, in their own module because they are a
   different book with a different provenance — nothing upstream publishes them,
   so `tools/check-cards.mjs` has to be able to tell them apart from these nine.
   Importing the module is how it tells: what that file exports is, by
   definition, what has no official card. They land at the end of this pack's
   list rather than merged alphabetically, so the compendium's folder order says
   which nine arrived together. */
import HOPE_AND_FEAR from "./hf-classes.mjs";
import { withDice } from "./card-resources.mjs";

/* ══════════════════════════════════════════════════════════════════════
   THE CHAPTER OPENERS

   Each class's opening paragraph, whole, from chapter 1. It lands in
   `system.flavor` and is drawn in exactly one place: the class row in the
   character-creation window, which is the one screen where you are choosing
   between all nine at once and the numbers alone cannot tell you what it is
   like to play one.

   It is deliberately **not** `description`. That field is what a card prints,
   it is held to the chapter's first sentence, and `FLAVOUR_SENTENCES` in
   `tools/check-cards.mjs` fails the build if it grows back — because it did
   grow once, and five sentences of lore sat above the Evasion and Hit Points
   the card exists to state. Two fields, two jobs, and the rule the check
   protects is untouched.

   The first sentence of each is therefore the same sentence as that class's
   `description`, by construction. `tools/check-cards.mjs` asserts it, so the
   two cannot drift into disagreeing about what a class is.
   ══════════════════════════════════════════════════════════════════════ */

const FLAVOUR = {
  bard: `
    Bards are the most charismatic people in all the realms. Members of this class are masters of
    captivation and specialize in a variety of performance types, including singing, playing musical
    instruments, weaving tales, or telling jokes. Whether performing for an audience or speaking to
    an individual, bards thrive in social situations. Members of this profession bond and train at
    schools or guilds, but a current of egotism runs through those of the bardic persuasion. While
    they may be the most likely class to bring people together, a bard of ill temper can just as
    easily tear a party apart.`,

  druid: `
    Becoming a druid is more than an occupation; it's a calling for those who wish to learn from and
    protect the magic of the wilderness. While one might underestimate a gentle druid who practices
    the often-quiet work of cultivating flora, druids who channel the untamed forces of nature are
    terrifying to behold. Druids cultivate their abilities in small groups, often connected by a
    specific ethos or locale, but some choose to work alone. Through years of study and dedication,
    druids can learn to transform into beasts and shape nature itself.`,

  guardian: `
    The title of guardian represents an array of martial professions, speaking more to their moral
    compass and unshakeable fortitude than the means by which they fight. While many guardians join
    groups of militants for either a country or cause, they're more likely to follow those few they
    truly care for, majority be damned. Guardians are known for fighting with remarkable ferocity
    even against overwhelming odds, defending their cohort above all else. Woe betide those who harm
    the ally of a guardian, as the guardian will answer this injury in kind.`,

  ranger: `
    Rangers are highly skilled hunters who, despite their martial abilities, rarely lend their
    skills to an army. Through mastery of the body and a deep understanding of the wilderness,
    rangers become sly tacticians, pursuing their quarry with cunning and patience. Many rangers
    track and fight alongside an animal companion with whom they've forged a powerful spiritual
    bond. By honing their skills in the wild, rangers become expert trackers, as likely to ensnare
    their foes in a trap as they are to assail them head-on.`,

  rogue: `
    Rogues are scoundrels, often in both attitude and practice. Broadly known as liars and thieves,
    the best among this class move through the world anonymously. Utilizing their sharp wits and
    blades, rogues trick their foes through social manipulation as easily as breaking locks,
    climbing through windows, or dealing underhanded blows. These masters of magical craft
    manipulate shadow and movement, adding an array of useful and deadly tools to their repertoire.
    Rogues frequently establish guilds to meet future accomplices, hire out jobs, and hone secret
    skills, proving that there's honor among thieves for those who know where to look.`,

  seraph: `
    Seraphs are divine fighters and healers imbued with sacred purpose. A wide array of deities
    exist within the realms, and thus numerous kinds of seraphs are appointed by these gods. Their
    ethos traditionally aligns with the domain or goals of their god, such as defending the weak,
    exacting vengeance, protecting a land or artifact, or upholding a particular faith. Some seraphs
    ally themselves with an army or locale, much to the satisfaction of their rulers, but other
    crusaders fight in opposition to the follies of the Mortal Realm. It is better to be a seraph's
    ally than their enemy, as they are terrifying foes to those who defy their purpose.`,

  sorcerer: `
    Not all innate magic users choose to hone their craft, but those who do can become powerful
    sorcerers. The gifts of these wielders are passed down through families, even if the family is
    unaware of or reluctant to practice them. A sorcerer's abilities can range from the elemental to
    the illusionary and beyond, and many practitioners band together into collectives based on their
    talents. The act of becoming a formidable sorcerer is not the practice of acquiring power, but
    learning to cultivate and control the power one already possesses. The magic of a misguided or
    undisciplined sorcerer is a dangerous force indeed.`,

  warrior: `
    Becoming a warrior requires years, often a lifetime, of training and dedication to the mastery
    of weapons and violence. While many who seek to fight hone only their strength, warriors
    understand the importance of an agile body and mind, making them some of the most sought-after
    fighters across the realms. Frequently, warriors find employment within an army, a band of
    mercenaries, or even a royal guard, but their potential is wasted in any position where they
    cannot continue to improve and expand their skills. Warriors are known to have a favored weapon;
    to come between them and their blade would be a grievous mistake.`,

  wizard: `
    Whether through an institution or individual study, those known as wizards acquire and hone
    immense magical power over years of learning using a variety of tools, including books, stones,
    potions, and herbs. Some wizards dedicate their lives to mastering a particular school of magic,
    while others learn from a wide variety of disciplines. Many wizards become wise and powerful
    figures in their communities, advising rulers, providing medicines and healing, and even leading
    war councils. While these mages all work toward the common goal of collecting magical knowledge,
    wizards often have the most conflict within their own ranks, as the acquisition, keeping, and
    sharing of powerful secrets is a topic of intense debate that has resulted in innumerable
    deaths.`,
};


/* ══════════════════════════════════════════════════════════════════════
   BARD — Grace & Codex
   ══════════════════════════════════════════════════════════════════════ */

const bard = classItem({
  name: "Bard",
  flavor: FLAVOUR.bard,
  domains: ["grace", "codex"],
  evasion: 10,
  hitPoints: 5,
  items: "A romance novel or a letter never opened",
  description: "Bards are the most charismatic people in all the realms.",
  hopeFeature: feat(
    "Make a Scene",
    `
    Spend 3 Hope to temporarily Distract a target within Close range, giving them a -2 penalty to
    their Difficulty.`,
  ),
  features: feat(
    "Rally",
    `
    Once per session, describe how you rally the party and give yourself and each of your allies a
    Rally Die. At level 1, your Rally Die is a d6. A PC can spend their Rally Die to roll it,
    adding the result to their action roll, reaction roll, damage roll, or to clear a number of
    Stress equal to the result. At the end of each session, clear all unspent Rally Dice.

    At level 5, your Rally Die increases to a d8.`,
  ),
  background: [
    "Who from your community taught you to have such confidence in yourself?",
    "You were in love once. Who did you adore, and how did they hurt you?",
    "You’ve always looked up to another bard. Who are they, and why do you idolize them?",
  ],
  connections: [
    "What made you realize we were going to be such good friends?",
    "What do I do that annoys you?",
    "Why do you grab my hand at night?",
  ],
});

const troubadour = subclassCards({
  name: "Troubadour",
  className: "Bard",
  spellcastTrait: "presence",
  description: "Play the Troubadour if you want to play music to bolster your allies.",
  ranks: {
    foundation: [
      feat(
        "Gifted Performer",
        `
        Describe how you perform for others. You can play each song once per long rest:
        - **_Relaxing Song:_** You and all allies within Close range clear a Hit Point.
        - **_Epic Song:_** Make a target within Close range temporarily _Vulnerable_.
        - **_Heartbreaking Song:_** You and all allies within Close range gain a Hope.`,
      ),
    ],
    specialization: [
      feat(
        "Maestro",
        `
        Your rallying songs steel the courage of those who listen. When you give a Rally Die to an
        ally, they can immediately gain a Hope or clear a Stress.`,
      ),
    ],
    mastery: [
      feat(
        "Virtuoso",
        `
        You are among the greatest of your craft and your skill is boundless. You can perform each
        of your “Gifted Performer” feature’s songs twice instead of once per long rest.`,
      ),
    ],
  },
});

const wordsmith = subclassCards({
  name: "Wordsmith",
  className: "Bard",
  spellcastTrait: "presence",
  description: "Play the Wordsmith if you want to use clever wordplay and captivate crowds.",
  ranks: {
    foundation: [
      feat(
        "Rousing Speech",
        `
        Once per long rest, you can give a heartfelt, inspiring speech. All allies within Far
        range clear 2 Stress.`,
      ),
      feat(
        "Heart of a Poet",
        `
        After you make an action roll to impress, persuade, or offend someone, you can **spend a
        Hope** to add a **d4** to the roll.`,
      ),
    ],
    specialization: [
      feat(
        "Eloquent",
        `
        Your moving words can boost morale. Once per session, when you encourage an ally, you can
        do one of the following:
        - Allow them to find a mundane object or tool they need.
        - Help an Ally without spending Hope.
        - Give them an additional downtime move during their next rest.`,
      ),
    ],
    mastery: [
      feat(
        "Epic Poetry",
        `
        Your Rally Die increases to a **d10**. Additionally, when you Help an Ally, you can
        narrate the moment as if you were writing the tale of their heroism in a memoir. When you
        do, roll a **d10** as your advantage die.`,
      ),
    ],
  },
});

/* ══════════════════════════════════════════════════════════════════════
   DRUID — Sage & Arcana
   ══════════════════════════════════════════════════════════════════════ */

const druid = classItem({
  name: "Druid",
  flavor: FLAVOUR.druid,
  domains: ["sage", "arcana"],
  evasion: 10,
  hitPoints: 6,
  items: "A small bag of rocks and bones or a strange pendant found in the dirt",
  description: `
  Becoming a druid is more than an occupation; it’s a calling for those who wish to learn from and
  protect the magic of the wilderness.`,
  hopeFeature: feat(
    "Evolution",
    `
    Spend 3 Hope to transform into a Beastform without marking a Stress. When you do, choose one
    trait to raise by +1 until you drop out of that Beastform.`,
  ),
  features: [
    feat(
      "Beastform",
      `
      Mark a Stress to magically transform into a creature of your tier or lower from
the Beastform list. You can drop out of this form at any time. While transformed, you can’t
use weapons or cast spells from domain cards, but you can still use other features or
abilities you have access to. Spells you cast before you transform stay active and last for
their normal duration, and you can talk and communicate as normal. Additionally, you gain the
Beastform’s features, add their Evasion bonus to your Evasion, and use the trait specified in
their statistics for your attack. While you’re in a Beastform, your armor becomes part of your
body and you mark Armor Slots as usual; when you drop out of a Beastform, those marked Armor
Slots remain marked. If you mark your last Hit Point, you automatically drop out of this form.`,
    ),
    feat(
      "Wildtouch",
      `
      You can perform harmless, subtle effects that involve nature—such as causing a
flower to rapidly grow, summoning a slight gust of wind, or starting a campfire—at will.`,
    ),
  ],
  background: [
    "Why was the community you grew up in so reliant on nature and its creatures?",
    "Who was the first wild animal you bonded with? Why did your bond end?",
    "Who has been trying to hunt you down? What do they want from you?",
  ],
  connections: [
    "What did you confide in me that makes me leap into danger for you every time?",
    "What animal do I say you remind me of?",
    "What affectionate nickname have you given me?",
  ],
});

const wardenOfTheElements = subclassCards({
  name: "Warden of the Elements",
  className: "Druid",
  spellcastTrait: "instinct",
  description: `
  Play the Warden of the Elements if you want to embody the natural elements of the wild.`,
  ranks: {
    foundation: [
      feat(
        "Elemental Incarnation",
        `
        **Mark a Stress** to _Channel_ one of the following elements until you take Severe damage
        or until your next rest.
        - **_Fire:_** When an adversary within Melee range deals damage to you, they take **1d10**
          magic damage.
        - **_Earth:_** Gain a bonus to your damage thresholds equal to your Proficiency.
        - **_Water:_** When you deal damage to an adversary within Melee range, all other
          adversaries within Very Close range must mark a Stress.
        - **_Air:_** You can hover, gaining advantage on Agility Rolls.`,
      ),
    ],
    specialization: [
      feat(
        "Elemental Aura",
        `
        Once per rest while _Channeling_, you can assume an aura matching your element. The aura
        affects targets within Close range until your _Channeling_ ends.

        - **_Fire:_** When an adversary marks 1 or more Hit Points, they must also mark a Stress.
        - **_Earth:_** Your allies gain a +1 bonus to Strength.
        - **_Water:_** When an adversary deals damage to you, you can **mark a Stress** to move them
          anywhere within Very Close range of where they are.
        - **_Air:_** When you or an ally takes damage from an attack beyond Melee range, reduce the
          damage by **1d8**.`,
      ),
    ],
    mastery: [
      feat(
        "Elemental Dominion",
        `
        You further embody your element. While _Channeling_, you gain the following benefit:
        - ***Fire:*** You gain a +1 bonus to your Proficiency for attacks and spells that deal
          damage.
        - ***Earth:*** When you would mark Hit Points, roll a **d6** per Hit Point marked. For each
          result of 6, reduce the number of Hit Points you mark by 1.
        - ***Water:*** When an attack against you succeeds, you can **mark a Stress** to make the
          attacker temporarily _Vulnerable_.
        - ***Air:*** You gain a +1 bonus to your Evasion and can fly.`,
      ),
    ],
  },
});

const wardenOfRenewal = subclassCards({
  name: "Warden of Renewal",
  className: "Druid",
  spellcastTrait: "instinct",
  description: "Play the Warden of Renewal if you want to use powerful magic to heal your party.",
  ranks: {
    foundation: [
      feat(
        "Clarity of Nature",
        `
        Once per long rest, you can create a space of natural serenity within Close range. When
        you spend a few minutes resting within the space, clear Stress equal to your Instinct,
        distributed as you choose between you and your allies.`,
      ),
      feat(
        "Regeneration",
        `
        Touch a creature and **spend 3 Hope**. That creature clears **1d4** Hit Points.`,
      ),
    ],
    specialization: [
      feat(
        "Regenerative Reach",
        `
        You can target creatures within Very Close range with your “Regeneration” feature.`,
      ),
      feat(
        "Warden’s Protection",
        `
        Once per long rest, **spend 2 Hope** to clear 2 Hit Points on **1d4** allies within Close
        range.`,
      ),
    ],
    mastery: [
      feat(
        "Defender",
        `
        Your animal transformation embodies a healing guardian spirit. When you’re in Beastform
        and an ally within Close range marks 2 or more Hit Points, you can **mark a Stress** to
        reduce the number of Hit Points they mark by 1.`,
      ),
    ],
  },
});

/* ══════════════════════════════════════════════════════════════════════
   GUARDIAN — Valor & Blade
   ══════════════════════════════════════════════════════════════════════ */

const guardian = classItem({
  name: "Guardian",
  flavor: FLAVOUR.guardian,
  domains: ["valor", "blade"],
  evasion: 9,
  hitPoints: 7,
  items: "A totem from your mentor or a secret key",
  description: `
  The title of guardian represents an array of martial professions, speaking more to their moral
  compass and unshakeable fortitude than the means by which they fight.`,
  hopeFeature: feat("Frontline Tank", "Spend 3 Hope to clear 2 Armor Slots."),
  features: feat(
    "Unstoppable",
    `
    Once per long rest, you can become Unstoppable. You gain an Unstoppable Die. At level 1, your
    Unstoppable Die is a d4. Place it on your character sheet in the space provided, starting with
    the 1 value facing up. After you make a damage roll that deals 1 or more Hit Points to a
    target, increase the Unstoppable Die value by one. When the die’s value would exceed its
    maximum value or when the scene ends, remove the die and drop out of Unstoppable. At level 5,
    your Unstoppable Die increases to a d6.

    While Unstoppable, you gain the following benefits:

    - You reduce the severity of physical damage by one threshold (Severe to Major, Major to Minor,
      Minor to None).
    - You add the current value of the Unstoppable Die to your damage roll.
    - You can’t be Restrained or Vulnerable.`,
  ),
  background: [
    "Who from your community did you fail to protect, and why do you still think of them?",
    "You’ve been tasked with protecting something important and delivering it somewhere dangerous. What is it, and where does it need to go?",
    "You consider an aspect of yourself to be a weakness. What is it, and how has it affected you?",
  ],
  connections: [
    "How did I save your life the first time we met?",
    "What small gift did you give me that you notice I always carry with me?",
    "What lie have you told me about yourself that I absolutely believe?",
  ],
});

const stalwart = subclassCards({
  name: "Stalwart",
  className: "Guardian",
  description: "Play the Stalwart if you want to take heavy blows and keep fighting.",
  ranks: {
    foundation: [
      feat("Unwavering", "Gain a permanent +1 bonus to your damage thresholds."),
      feat(
        "Iron Will",
        `
        When you take physical damage, you can **mark an additional Armor Slot** to reduce the
        severity.`,
      ),
    ],
    specialization: [
      feat("Unrelenting", "Gain a permanent +2 bonus to your damage thresholds."),
      feat(
        "Partners in Arms",
        `
        When an ally within Very Close range takes damage, you can **mark an Armor Slot** to
        reduce the severity by one threshold.`,
      ),
    ],
    mastery: [
      feat("Undaunted", "Gain a permanent +3 bonus to your damage thresholds."),
      feat(
        "Loyal Protector",
        `
        When an ally within Close range has 2 or fewer Hit Points and would take damage, you can
        **mark a Stress** to sprint to their side and take the damage instead.`,
      ),
    ],
  },
});

const vengeance = subclassCards({
  name: "Vengeance",
  className: "Guardian",
  description: "Play the Vengeance if you want to strike down enemies who harm you or your allies.",
  ranks: {
    foundation: [
      feat("At Ease", "Gain an additional Stress slot."),
      feat(
        "Revenge",
        `
        When an adversary within Melee range succeeds on an attack against you, you can **mark 2
        Stress** to force the attacker to mark a Hit Point.`,
      ),
    ],
    specialization: [
      feat(
        "Act of Reprisal",
        `
        When an adversary damages an ally within Melee range, you gain a +1 bonus to your
        Proficiency for the next successful attack you make against that adversary.`,
      ),
    ],
    mastery: [
      feat(
        "Nemesis",
        `
        **Spend 2 Hope** to _Prioritize_ an adversary until your next rest. When you make an
        attack against your _Prioritized_ adversary, you can swap the results of your Hope and
        Fear Dice. You can only _Prioritize_ one adversary at a time.`,
      ),
    ],
  },
});

/* ══════════════════════════════════════════════════════════════════════
   RANGER — Bone & Sage
   ══════════════════════════════════════════════════════════════════════ */

const ranger = classItem({
  name: "Ranger",
  flavor: FLAVOUR.ranger,
  domains: ["bone", "sage"],
  evasion: 12,
  hitPoints: 6,
  items: "A trophy from your first kill or a seemingly broken compass",
  description: `
  Rangers are highly skilled hunters who, despite their martial abilities, rarely lend their
  skills to an army.`,
  hopeFeature: feat(
    "Hold Them Off",
    `
    Spend 3 Hope when you succeed on an attack with a weapon to use that same roll against two
    additional adversaries within range of the attack.`,
  ),
  features: feat(
    "Ranger’s Focus",
    `
    Spend a Hope and make an attack against a target. On a success, deal your attack’s normal
    damage and temporarily make the attack’s target your Focus. Until this feature ends or you
    make a different creature your Focus, you gain the following benefits against your Focus:

    - You know precisely what direction they are in.
    - When you deal damage to them, they must mark a Stress.
    - When you fail an attack against them, you can end your Ranger’s Focus feature to reroll your
      Duality Dice.`,
  ),
  background: [
    "A terrible creature hurt your community, and you’ve vowed to hunt them down. What are they, and what unique trail or sign do they leave behind?",
    "Your first kill almost killed you, too. What was it, and what part of you was never the same after that event?",
    "You’ve traveled many dangerous lands, but what is the one place you refuse to go?",
  ],
  connections: [
    "What friendly competition do we have?",
    "Why do you act differently when we’re alone than when others are around?",
    "What threat have you asked me to watch for, and why are you worried about it?",
  ],
});

const beastbound = subclassCards({
  name: "Beastbound",
  className: "Ranger",
  spellcastTrait: "agility",
  description: "Play the Beastbound if you want to form a deep bond with an animal ally.",
  ranks: {
    foundation: [
      feat(
        "Companion",
        `
        You have an animal companion of your choice *(at the GM’s discretion)*. They stay by your
        side unless you tell them otherwise. Take the Ranger Companion sheet. When you level up
        your character, choose a level-up option for your companion from this sheet as well.`,
      ),
    ],
    specialization: [
      feat("Expert Training", "Choose an additional level-up option for your companion."),
      feat(
        "Battle-Bonded",
        `
        When an adversary attacks you while they’re within your companion’s Melee range, you gain
        a +2 bonus to your Evasion against the attack.`,
      ),
    ],
    mastery: [
      feat("Advanced Training", "Choose two additional level-up options for your companion."),
      feat(
        "Loyal Friend",
        `
        Once per long rest, when the damage from an attack would mark your companion’s last Stress
        or your last Hit Point and you’re within Close range of each other, you or your companion
        can rush to the other’s side and take that damage instead.`,
      ),
    ],
  },
});

const wayfinder = subclassCards({
  name: "Wayfinder",
  className: "Ranger",
  spellcastTrait: "agility",
  description: "Play the Wayfinder if you want to hunt your prey and strike with deadly force.",
  ranks: {
    foundation: [
      feat(
        "Ruthless Predator",
        `
        When you make a damage roll, you can **mark a Stress** to gain a +1 bonus to your
        Proficiency. Additionally, when you deal Severe damage to an adversary, they must mark a
        Stress.`,
      ),
      feat(
        "Path Forward",
        `
        When you’re traveling to a place you’ve previously visited or you carry an object that has
        been at the location before, you can identify the shortest, most direct path to your
        destination.`,
      ),
    ],
    specialization: [
      feat(
        "Elusive Predator",
        `
        When your *Focus* makes an attack against you, you gain a +2 bonus to your Evasion against
        the attack.`,
      ),
    ],
    mastery: [
      feat(
        "Apex Predator",
        `
        Before you make an attack roll against your _Focus_, you can **spend a Hope**. On a
        successful attack, you remove a Fear from the GM’s Fear pool.`,
      ),
    ],
  },
});

/* ══════════════════════════════════════════════════════════════════════
   ROGUE — Midnight & Grace
   ══════════════════════════════════════════════════════════════════════ */

const rogue = classItem({
  name: "Rogue",
  flavor: FLAVOUR.rogue,
  domains: ["midnight", "grace"],
  evasion: 12,
  hitPoints: 6,
  items: "A set of forgery tools or a grappling hook",
  description: "Rogues are scoundrels, often in both attitude and practice.",
  hopeFeature: feat(
    "Rogue’s Dodge",
    `
    Spend 3 Hope to gain a +2 bonus to your Evasion until the next time an attack succeeds against
    you. Otherwise, this bonus lasts until your next rest.`,
  ),
  features: [
    feat(
      "Cloaked",
      `
      Any time you would be Hidden, you are instead Cloaked. In addition to the
benefits of the Hidden condition, while Cloaked you remain unseen if you are stationary when
an adversary moves to where they would normally see you. After you make an attack or end a
move within line of sight of an adversary, you are no longer Cloaked.`,
    ),
    feat(
      "Sneak Attack",
      `
      When you succeed on an attack while Cloaked or while an ally is within Melee
range of your target, add a number of d6s equal to your tier to your damage roll.`,
    ),
  ],
  background: [
    "What did you get caught doing that got you exile from your home community?",
    "You used to have a different life, but you’ve tried to leave it behind. Who from your past is still chasing you?",
    "Who from your past were you most sad to say goodbye to?",
  ],
  connections: [
    "What did I recently convince you to do that got us both in trouble?",
    "What have I discovered about your past that I hold secret from the others?",
    "Who do you know from my past, and how have they influenced your feelings about me?",
  ],
});

const nightwalker = subclassCards({
  name: "Nightwalker",
  className: "Rogue",
  spellcastTrait: "finesse",
  description: `
  Play the Nightwalker if you want to manipulate shadows to maneuver through the environment.`,
  ranks: {
    foundation: [
      feat(
        "Shadow Stepper",
        `
        You can move from shadow to shadow. When you move into an area of darkness or a shadow
        cast by another creature or object, you can **mark a Stress** to disappear from where you
        are and reappear inside another shadow within Far range. When you reappear, you are
        _Cloaked_.`,
      ),
    ],
    specialization: [
      feat(
        "Dark Cloud",
        `
        Make a **Spellcast Roll (15)**. On a success, create a temporary dark cloud that covers
        any area within Close range. Anyone in this cloud can’t see outside of it, and anyone
        outside of it can’t see in. You’re considered _Cloaked_ from any adversary for whom the
        cloud blocks line of sight.`,
      ),
      feat("Adrenaline", "While you’re _Vulnerable_, add your level to your damage rolls."),
    ],
    mastery: [
      feat(
        "Fleeting Shadow",
        `
        Gain a permanent +1 bonus to your Evasion. You can use your “Shadow Stepper” feature to
        move within Very Far range.`,
      ),
      feat(
        "Vanishing Act",
        `
        **Mark a Stress** to become _Cloaked_ at any time. When _Cloaked_ from this feature, you
        automatically clear the _Restrained_ condition if you have it. You remain _Cloaked_ in
        this way until you roll with Fear or until your next rest.`,
      ),
    ],
  },
});

const syndicate = subclassCards({
  name: "Syndicate",
  className: "Rogue",
  spellcastTrait: "finesse",
  description: "Play the Syndicate if you want to have a web of contacts everywhere you go.",
  ranks: {
    foundation: [
      feat(
        "Well-Connected",
        `
        When you arrive in a prominent town or environment, you know somebody who calls this place
        home. Give them a name, note how you think they could be useful, and choose one fact from
        the following list:
        - They owe me a favor, but they’ll be hard to find.
        - They’re going to ask for something in exchange.
        - They’re always in a great deal of trouble.
        - We used to be together. It’s a long story
        - We didn’t part on great terms.`,
      ),
    ],
    specialization: [
      feat(
        "Contacts Everywhere",
        `
        Once per session, you can briefly call on a shady contact. Choose one of the following
        benefits and describe what brought them here to help you in this moment:
        - They provide 1 handful of gold, a unique tool, or a mundane object that the situation
          requires.
        - On your next action roll, their help provides a +3 bonus to the result of your Hope or
          Fear Die.
        - The next time you deal damage, they snipe from the shadows, adding **2d8** to your damage
          roll.`,
      ),
    ],
    mastery: [
      feat(
        "Reliable Backup",
        `
        You can use your “Contacts Everywhere” feature three times per session. The following
        options are added to the list of benefits you can choose from when you use that feature:
        - When you mark 1 or more Hit Points, they can rush out to shield you, reducing the Hit
          Points marked by 1.
        - When you make a Presence Roll in conversation, they back you up. You can roll a **d20** as
          your Hope Die.`,
      ),
    ],
  },
});

/* ══════════════════════════════════════════════════════════════════════
   SERAPH — Splendor & Valor
   ══════════════════════════════════════════════════════════════════════ */

const seraph = classItem({
  name: "Seraph",
  flavor: FLAVOUR.seraph,
  domains: ["splendor", "valor"],
  evasion: 9,
  hitPoints: 7,
  items: "A bundle of offerings or a sigil of your god",
  description: "Seraphs are divine fighters and healers imbued with sacred purpose.",
  hopeFeature: feat("Life Support", "Spend 3 Hope to clear a Hit Point on an ally within Close range."),
  features: feat(
    "Prayer Dice",
    `
    At the beginning of each session, roll a number of d4s equal to your subclass’s Spellcast
    trait and place them on your character sheet in the space provided. These are your Prayer
    Dice. You can spend any number of Prayer Dice to aid yourself or an ally within Far range. You
    can use a spent die’s value to reduce incoming damage, add to a roll’s result after the roll
    is made, or gain Hope equal to the result. At the end of each session, clear all unspent
    Prayer Dice.`,
  ),
  background: [
    "Which god did you devote yourself to? What incredible feat did they perform for you in a moment of desperation?",
    "How did your appearance change after taking your oath?",
    "In what strange or unique way do you communicate with your god?",
  ],
  connections: [
    "What promise did you make me agree to, should you die on the battlefield?",
    "Why do you ask me so many questions about my god?",
    "You’ve told me to protect one member of our party above all others, even yourself. Who are they and why?",
  ],
});

const divineWielder = subclassCards({
  name: "Divine Wielder",
  className: "Seraph",
  spellcastTrait: "strength",
  description: `
  Play the Divine Wielder if you want to dominate the battlefield with a legendary weapon.`,
  ranks: {
    foundation: [
      feat(
        "Spirit Weapon",
        `
        When you have an equipped weapon with a range of Melee or Very Close, it can fly from your
        hand to attack an adversary within Close range and then return to you. You can **mark a
        Stress** to target an additional adversary within range with the same attack roll.`,
      ),
      feat(
        "Sparing Touch",
        `
        Once per long rest, touch a creature and clear 2 Hit Points or 2 Stress from them.`,
      ),
    ],
    specialization: [
      feat(
        "Devout",
        `
        When you roll your Prayer Dice, you can roll an additional die and discard the lowest
        result. Additionally, you can use your “Sparing Touch” feature twice instead of once per
        long rest.`,
      ),
    ],
    mastery: [
      feat(
        "Sacred Resonance",
        `
        When you roll damage for your “Spirit Weapon” feature, if any of the die results match,
        double the value of each matching die. For example, if you roll two 5s, they count as two
        10s.`,
      ),
    ],
  },
});

const wingedSentinel = subclassCards({
  name: "Winged Sentinel",
  className: "Seraph",
  spellcastTrait: "strength",
  description: `
  Play the Winged Sentinel if you want to take flight and strike crushing blows from the sky.`,
  ranks: {
    foundation: [
      feat(
        "Wings of Light",
        `
        You can fly. While flying, you can do the following:
        - **Mark a Stress** to pick up and carry another willing creature approximately your size or
          smaller.
        - **Spend a Hope** to deal an extra **1d8** damage on a successful attack.`,
      ),
    ],
    specialization: [
      feat(
        "Ethereal Visage",
        `
        Your supernatural visage strikes awe and fear. While flying, you have advantage on
        Presence Rolls. When you succeed with Hope on a Presence Roll, you can remove a Fear from
        the GM’s Fear pool instead of gaining Hope.`,
      ),
    ],
    mastery: [
      feat("Ascendant", "Gain a permanent +4 bonus to your Severe damage threshold."),
      feat(
        "Power of the Gods",
        `
        While flying, you deal an extra **1d12** damage instead of 1d8 with your “Wings of Light”
        feature.`,
      ),
    ],
  },
});

/* ══════════════════════════════════════════════════════════════════════
   SORCERER — Arcana & Midnight
   ══════════════════════════════════════════════════════════════════════ */

const sorcerer = classItem({
  name: "Sorcerer",
  flavor: FLAVOUR.sorcerer,
  domains: ["arcana", "midnight"],
  evasion: 10,
  hitPoints: 6,
  items: "A whispering orb or a family heirloom",
  description: `
  Not all innate magic users choose to hone their craft, but those who do can become powerful
  sorcerers.`,
  hopeFeature: feat(
    "Volatile Magic",
    `
    Spend 3 Hope to reroll any number of your damage dice on an attack that deals magic damage.`,
  ),
  features: [
    feat(
      "Arcane Sense",
      `
      You can sense the presence of magical people and objects within Close range.`,
    ),
    feat(
      "Minor Illusion",
      `
      Make a Spellcast Roll (10). On a success, you create a minor visual
illusion no larger than yourself within Close range. This illusion is convincing to anyone at
Close range or farther.`,
    ),
    feat(
      "Channel Raw Power",
      `
      Once per long rest, you can place a domain card from your loadout into
your vault and choose to either:

- Gain Hope equal to the level of the card.
- Enhance a spell that deals damage, gaining a bonus to your damage roll equal to twice the
  level of the card.`,
    ),
  ],
  background: [
    "What did you do that made the people in your community wary of you?",
    "What mentor taught you to control your untamed magic, and why are they no longer able to guide you?",
    "You have a deep fear you hide from everyone. What is it, and why does it scare you?",
  ],
  connections: [
    "Why do you trust me so deeply?",
    "What did I do that makes you cautious around me?",
    "Why do we keep our shared past a secret?",
  ],
});

const elementalOrigin = subclassCards({
  name: "Elemental Origin",
  className: "Sorcerer",
  spellcastTrait: "instinct",
  description: `
  Play the Elemental Origin if you want to channel raw magic to take the shape of a particular
  element.`,
  ranks: {
    foundation: [
      feat(
        "Elementalist",
        `
        Choose one of the following elements at character creation:

        Air ∙ Earth ∙ Fire ∙ Lightning ∙ Water

        You can shape this element into harmless effects. Additionally, **spend a Hope** and
        describe how your control over this element helps an action roll you’re about to make,
        then either gain a +2 bonus to the roll or a +3 bonus to the roll’s damage.`,
      ),
    ],
    specialization: [
      feat(
        "Natural Evasion",
        `
        You can call forth your element to protect you from harm. When an attack roll against you
        succeeds, you can **mark a Stress** and describe how you use your element to defend you.
        When you do, roll a **d6** and add its result to your Evasion against the attack.`,
      ),
    ],
    mastery: [
      feat(
        "Transcendence",
        `
        Once per long rest, you can transform into a physical manifestation of your element. When
        you do, describe your transformation and choose two of the following benefits to gain
        until your next rest:
        - +4 bonus to your Severe threshold
        - +1 bonus to a character trait of your choice
        - +1 bonus to your Proficiency
        - +2 bonus to your Evasion`,
      ),
    ],
  },
});

const primalOrigin = subclassCards({
  name: "Primal Origin",
  className: "Sorcerer",
  spellcastTrait: "instinct",
  description: `
  Play the Primal Origin if you want to extend the versatility of your spells in powerful ways.`,
  ranks: {
    foundation: [
      feat(
        "Manipulate Magic",
        `
        Your primal origin allows you to modify the essence of magic itself. After you cast a
        spell or make an attack using a weapon that deals magic damage, you can **mark a Stress**
        to do one of the following:
        - Extend the spell or attack’s reach by one range
        - Gain a +2 bonus to the action roll’s result
        - Double a damage die of your choice
        - Hit an additional target within range`,
      ),
    ],
    specialization: [
      feat(
        "Enchanted Aid",
        `
        You can enhance the magic of others with your essence. When you Help an Ally with a
        Spellcast Roll, you can roll a **d8** as your advantage die. Once per long rest, after an
        ally has made a Spellcast Roll with your help, you can swap the results of their Duality
        Dice.`,
      ),
    ],
    mastery: [
      feat(
        "Arcane Charge",
        `
        You can gather magical energy to enhance your capabilities. When you take magic damage,
        you become _Charged_. Alternatively, you can **spend 2 Hope** to become _Charged_. When
        you successfully make an attack that deals magic damage while _Charged_, you can clear
        your _Charge_ to either gain a +10 bonus to the damage roll or gain a +3 bonus to the
        Difficulty of a reaction roll the spell causes the target to make.

        You stop being _Charged_ at your next long rest.`,
      ),
    ],
  },
});

/* ══════════════════════════════════════════════════════════════════════
   WARRIOR — Blade & Bone
   ══════════════════════════════════════════════════════════════════════ */

const warrior = classItem({
  name: "Warrior",
  flavor: FLAVOUR.warrior,
  domains: ["blade", "bone"],
  evasion: 11,
  hitPoints: 6,
  items: "The drawing of a lover or a sharpening stone",
  description: `
  Becoming a warrior requires years, often a lifetime, of training and dedication to the mastery
  of weapons and violence.`,
  hopeFeature: feat("No Mercy", "Spend 3 Hope to gain a +1 bonus to your attack rolls until your next rest."),
  features: [
    feat(
      "Attack of Opportunity",
      `
      If an adversary within Melee range attempts to leave that range,
make a reaction roll using a trait of your choice against their Difficulty. Choose one effect
on a success, or two if you critically succeed:

- They can’t move from where they are.
- You deal damage to them equal to your primary weapon’s damage.
- You move with them.`,
    ),
    feat(
      "Combat Training",
      `
      You ignore burden when equipping weapons. When you deal physical damage,
you gain a bonus to your damage roll equal to your level.`,
    ),
  ],
  background: [
    "Who taught you to fight, and why did they stay behind when you left home?",
    "Somebody defeated you in battle years ago and left you to die. Who was it, and how did they betray you?",
    "What legendary place have you always wanted to visit, and why is it so special?",
  ],
  connections: [
    "We knew each other long before this party came together. How?",
    "What mundane task do you usually help me with off the battlefield?",
    "What fear am I helping you overcome?",
  ],
});

const callOfTheBrave = subclassCards({
  name: "Call of the Brave",
  className: "Warrior",
  description: `
  Play the Call of the Brave if you want to use the might of your enemies to fuel your own power.`,
  ranks: {
    foundation: [
      feat("Courage", "When you fail a roll with Fear, you gain a Hope."),
      feat(
        "Battle Ritual",
        `
        Once per long rest, before you attempt something incredibly dangerous or face off against
        a foe who clearly outmatches you, describe what ritual you perform or preparations you
        make. When you do, clear 2 Stress and gain 2 Hope.`,
      ),
    ],
    specialization: [
      feat(
        "Rise to the Challenge",
        `
        You are vigilant in the face of mounting danger. While you have 2 or fewer Hit Points
        unmarked, you can roll a **d20** as your Hope Die.`,
      ),
    ],
    mastery: [
      feat(
        "Camaraderie",
        `
        Your unwavering bravery is a rallying point for your allies. You can initiate a Tag Team
        Roll one additional time per session. Additionally, when an ally initiates a Tag Team Roll
        with you, they only need to spend 2 Hope to do so.`,
      ),
    ],
  },
});

const callOfTheSlayer = subclassCards({
  name: "Call of the Slayer",
  className: "Warrior",
  description: `
  Play the Call of the Slayer if you want to strike down adversaries with immense force.`,
  ranks: {
    foundation: [
      feat(
        "Slayer",
        `
        You gain a pool of dice called Slayer Dice. On a roll with Hope, you can place a **d6** on
        this card instead of gaining a Hope, adding the die to the pool. You can store a number of
        Slayer Dice equal to your Proficiency. When you make an attack roll or damage roll, you
        can spend any number of these Slayer Dice, rolling them and adding their result to the
        roll.

        At the end of each session, clear any unspent Slayer Dice on this card and gain a Hope per
        die cleared.`,
      ),
    ],
    specialization: [
      feat(
        "Weapon Specialist",
        `
        You can wield multiple weapons with dangerous ease. When you succeed on an attack, you can
        **spend a Hope** to add one of the damage dice from your secondary weapon to the damage
        roll.

        Additionally, once per long rest when you roll your Slayer Dice, reroll any 1s.`,
      ),
    ],
    mastery: [
      feat(
        "Martial Preparation",
        `
        You’re an inspirational warrior to all who travel with you. Your party gains access to the
        Martial Preparation downtime move. To use this move during a rest, describe how you
        instruct and train with your party. You and each ally who chooses this downtime move gain
        a **d6** Slayer Die. A PC with a Slayer Die can spend it to roll the die and add the
        result to an attack or damage roll of their choice.`,
      ),
    ],
  },
});

/* ══════════════════════════════════════════════════════════════════════
   WIZARD — Codex & Splendor
   ══════════════════════════════════════════════════════════════════════ */

const wizard = classItem({
  name: "Wizard",
  flavor: FLAVOUR.wizard,
  domains: ["codex", "splendor"],
  evasion: 11,
  hitPoints: 5,
  items: "A book you’re trying to translate or a tiny, harmless elemental pet",
  description: `
  Whether through an institution or individual study, those known as wizards acquire and hone
  immense magical power over years of learning using a variety of tools, including books, stones,
  potions, and herbs.`,
  hopeFeature: feat(
    "Not This Time",
    `
    Spend 3 Hope to force an adversary within Far range to reroll an attack or damage roll.`,
  ),
  features: [
    feat(
      "Prestidigitation",
      `
      You can perform harmless, subtle magical effects at will. For example,
you can change an object’s color, create a smell, light a candle, cause a tiny object to
float, illuminate a room, or repair a small object.`,
    ),
    feat(
      "Strange Patterns",
      `
      Choose a number between 1 and 12. When you roll that number on a Duality
Die, gain a Hope or clear a Stress. You can change this number when you take a long rest.`,
    ),
  ],
  background: [
    "What responsibilities did your community once count on you for? How did you let them down?",
    "You’ve spent your life searching for a book or object of great significance. What is it, and why is it so important to you?",
    "You have a powerful rival. Who are they, and why are you so determined to defeat them?",
  ],
  connections: [
    "What favor have I asked of you that you’re not sure you can fulfill?",
    "What weird hobby or strange fascination do we both share?",
    "What secret about yourself have you entrusted only to me?",
  ],
});

const schoolOfKnowledge = subclassCards({
  name: "School of Knowledge",
  className: "Wizard",
  spellcastTrait: "knowledge",
  description: `
  Play the School of Knowledge if you want a keen understanding of the world around you.`,
  ranks: {
    foundation: [
      feat(
        "Prepared",
        `
        Take an additional domain card of your level or lower from a domain you have access to.`,
      ),
      feat(
        "Adept",
        `
        When you Utilize an Experience, you can **mark a Stress** instead of spending a Hope. If
        you do, double your Experience modifier for that roll.`,
      ),
    ],
    specialization: [
      feat(
        "Accomplished",
        `
        Take an additional domain card of your level or lower from a domain you have access to.`,
      ),
      feat(
        "Perfect Recall",
        `
        Once per rest, when you recall a domain card in your vault, you can reduce its Recall Cost
        by 1.`,
      ),
    ],
    mastery: [
      feat(
        "Brilliant",
        `
        Take an additional domain card of your level or lower from a domain you have access to.`,
      ),
      feat(
        "Honed Expertise",
        `
        When you use an Experience, roll a **d6**. On a result of 5 or higher, you can use it
        without spending Hope.`,
      ),
    ],
  },
});

const schoolOfWar = subclassCards({
  name: "School of War",
  className: "Wizard",
  spellcastTrait: "knowledge",
  description: "Play the School of War if you want to utilize trained magic for violence.",
  ranks: {
    foundation: [
      feat(
        "Battlemage",
        `
        You’ve focused your studies on becoming an unconquerable force on the battlefield. Gain an
        additional Hit Point slot.`,
      ),
      feat(
        "Face Your Fear",
        `
        When you succeed with Fear on an attack roll, you deal an extra **1d10** magic damage.`,
      ),
    ],
    specialization: [
      feat(
        "Conjure Shield",
        `
        You can maintain a protective barrier of magic. While you have at least 2 Hope, you add
        your Proficiency to your Evasion.`,
      ),
      feat(
        "Fueled by Fear",
        `
        The extra magic damage from your “Face Your Fear” feature increases to **2d10**.`,
      ),
    ],
    mastery: [
      feat(
        "Thrive in Chaos",
        `
        When you succeed on an attack, you can **mark a Stress** after rolling damage to force the
        target to mark an additional Hit Point.`,
      ),
      feat(
        "Have No Fear",
        `
        The extra magic damage from your “Face Your Fear” feature increases to **3d10**.`,
      ),
    ],
  },
});

/* ══════════════════════════════════════════════════════════════════════
   THE PACK

   Class first, then its subclasses, so the compendium's folder for a class
   reads the way the book's chapter does.
   ══════════════════════════════════════════════════════════════════════ */

export default withDice([
  bard,
  ...troubadour,
  ...wordsmith,
  druid,
  ...wardenOfTheElements,
  ...wardenOfRenewal,
  guardian,
  ...stalwart,
  ...vengeance,
  ranger,
  ...beastbound,
  ...wayfinder,
  rogue,
  ...nightwalker,
  ...syndicate,
  seraph,
  ...divineWielder,
  ...wingedSentinel,
  sorcerer,
  ...elementalOrigin,
  ...primalOrigin,
  warrior,
  ...callOfTheBrave,
  ...callOfTheSlayer,
  wizard,
  ...schoolOfKnowledge,
  ...schoolOfWar,

  ...HOPE_AND_FEAR,
]);
