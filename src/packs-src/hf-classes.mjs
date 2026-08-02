/**
 * The four *Hope and Fear* classes and their eight subclasses.
 *
 * Same shape as `classes.mjs` and the same rules apply — a class's
 * `description` is the chapter's first sentence and nothing else, `flavor` is
 * the opening paragraph whole, and a subclass expands into three cards because
 * that is how you acquire it. Read that file's header for the argument; this
 * one only records what is different.
 *
 * **Nothing here has an upstream.** The official Card Creator publishes the
 * corebook and only the corebook, so unlike the eighteen subclasses in
 * `classes.mjs` these cannot be re-checked against `official-cards.json`.
 * `tools/check-cards.mjs` skips them by construction: it imports this module
 * and treats every name it exports as "no upstream exists", rather than
 * carrying a hardcoded list that would go stale the moment a name changed.
 *
 * ── the Martial Stances are `feature` Items ───────────────────────────
 * The Martial Artist's foundation card says "take the Martial Stances sheet",
 * and that sheet is sixteen separate rules you acquire one per level. They are
 * not on the card — the card is four lines and a pointer — so putting all
 * sixteen into its text would be this file printing a sheet onto a card that
 * deliberately does not carry it, at about eight times the length of any other
 * foundation feature in the compendium.
 *
 * They are `feature` Items instead, which is the subtype for exactly this: a
 * character feature that did not arrive attached to a card. The sheet already
 * draws those as pressable rows in the Features panel with their rule printed
 * on them, which is what a stance sheet *is* — a list of rules you own, one of
 * which is active. A Martial Artist drags in the two they start with and one
 * more per level, and the panel is their stance sheet. See STANCES below.
 */

import { cardArt, classItem, feat, subclassCards, featureItem } from "./_helpers.mjs";

/* One painting per subclass, shared by its three cards — see the same note in
   `hf-heritage.mjs`. A class has no painting anywhere in this system and none
   here either, so `classItem` is untouched. */
const subclass = (o) => subclassCards({ ...o, art: cardArt("subclass", o.name) });

/* ══════════════════════════════════════════════════════════════════════
   THE CHAPTER OPENERS

   As in `classes.mjs`: the whole opening paragraph, landing in
   `system.flavor` and drawn only by the creation window's class row. The
   first sentence of each is that class's `description` by construction, and
   `tools/check-cards.mjs` asserts it.
   ══════════════════════════════════════════════════════════════════════ */

const FLAVOUR = {
  assassin: `
    Assassins are masters at inflicting deadly injuries with precise strikes. Unlike those who wield
    violence as only a means to an end, assassins approach death as a profession. Many members of
    this class believe theirs is a worthy, if not sacred, trade, and some join guilds to hone their
    craft, define their beliefs, and earn money. People from all walks of life hire assassins for
    their skills: powerful rulers looking to avoid all-out war, business leaders seeking to eliminate
    the competition, and even average people hoping to settle a grudge. Often, an assassin is the
    last resort for killing those previously believed to be unkillable. While some of these deadly
    professionals will destroy anyone in their path for the right reasons or the right price, others
    hold strict moral codes or personal rules that dictate their targets. Those who end up the target
    of an assassin should count themselves among the dead.`,

  brawler: `
    Experts in unarmed combat, brawlers hone their bodies into lethal weapons. Whether they learned
    from formal training, studied with a mentor, or picked up their skills one fight at a time, the
    process is always rigorous as brawlers develop their body and mind to work as one. Brawlers are
    valued for their power and versatility and typically join a party or a cause when the need or
    desire arises. Because a brawler’s body is their strongest weapon, they typically seek out new
    challenges or consistent sparring partners so they can maintain their skills and add new
    techniques to their repertoire. Though they might appear unassuming to those accustomed to foes
    who are armed to the teeth, brawlers often accomplish more with bare knuckles than an average
    soldier with a sword.`,

  warlock: `
    Those who’ve traded their lives—or perhaps even their souls—to an otherworldly patron in exchange
    for incredible power are known as warlocks. Often, these mortals have reached a point of
    desperation that leads them to make this sacrifice: they hope to protect themselves or a loved
    one, aid their community, seek vengeance, increase their status, or otherwise further their
    ambitions. The powerful entities they entreat are as varied as the warlocks themselves: gods,
    spirits, demons, or other beings unknown to even the mortal who makes the pact. The entities each
    have their own sphere of influence that defines their otherworldly power, and those that collect
    souls are rarely known for their benevolence. Thus, a warlock’s power is defined by the
    relationship they maintain with their benefactor. Despite their terrifying magic, warlocks might
    find that someone or something else is pulling their strings.`,

  witch: `
    Witches are magical practitioners who commune with the forces of nature and entities from realms
    beyond. These spellcasters call forth power through craft, combining the tangible and ephemeral
    by casting spells, murmuring incantations, creating talismans, weaving illusions, and maintaining
    other personalized practices. They can protect their allies and harm their enemies by invoking
    powerful forces beyond themselves—supernatural beings such as ancestors, deities, or aspects of
    nature. Often, their magical knowledge is passed down from these entities or through many
    generations of practitioners who gather in small groups known as covens. Witches are frequently
    feared and misunderstood, as their methods can appear mysterious, strange, and even macabre to
    the uninitiated. Whichever path they walk, a witch treads the boundary between light and shadow
    without fear.`,
};

/* ══════════════════════════════════════════════════════════════════════
   ASSASSIN — Blade & Midnight
   ══════════════════════════════════════════════════════════════════════ */

const assassin = classItem({
  name: "Assassin",
  flavor: FLAVOUR.assassin,
  domains: ["blade", "midnight"],
  evasion: 12,
  hitPoints: 5,
  items: "A list of names with several marked off or a rusted blade inscribed with an insignia",
  description: "Assassins are masters at inflicting deadly injuries with precise strikes.",
  hopeFeature: feat("Deadly Determination", "**Spend 3 Hope** to clear 2 Stress."),
  features: [
    feat(
      "Marked for Death",
      `
      On a successful weapon attack, you can **mark a Stress** to make the target _Marked for
      Death_. When you deal damage to a target you’ve _Marked for Death_, add a number of **d4s**
      equal to your tier to the damage roll.

      You can have only one adversary _Marked for Death_ at a time. This condition lasts until you
      take a rest, the current adversary _Marked for Death_ is defeated, or the GM spends a number
      of Fear equal to your tier to clear it.`,
    ),
    feat(
      "Get In & Get Out",
      `
      **Spend a Hope** to ask the GM for a quick or inconspicuous way into or out of a place you can
      see. The next roll you make that acts on this information has advantage.`,
    ),
  ],
  background: [
    "You once killed someone you were close to. What happened, and how did it change you?",
    "What organization trained you in the art of killing, and how did you become a member?",
    "Throughout your career, one target has eluded you. Who are they, and how have they slipped through your fingers?",
  ],
  connections: [
    "I’ve killed someone for you. Who were they?",
    "How did you save me when I was on the brink of death? What have I promised you as repayment?",
    "What secret about myself did I tell you, and how did it change your view of me?",
  ],
});

const executionersGuild = subclass({
  name: "Executioners Guild",
  className: "Assassin",
  spellcastTrait: "agility",
  description:
    "Play the Executioners Guild if you want to strike down your targets with lethal precision.",
  ranks: {
    foundation: [
      feat(
        "First Strike",
        "The first time in a scene you succeed on an attack, you deal double damage.",
      ),
      feat("Ambush", "Your “Marked for Death” feature uses **d6s** instead of **d4s**."),
    ],
    specialization: [
      feat(
        "Death Strike",
        `
        When you deal Severe damage to a creature, you can **mark a Stress** to force them to mark
        an additional Hit Point.`,
      ),
      feat(
        "Scorpion’s Poise",
        `
        You gain a +2 bonus to your Evasion against attacks made by a creature you’ve _Marked for
        Death_.`,
      ),
    ],
    mastery: [
      feat(
        "True Strike",
        `
        Once per long rest when you fail an attack, you can **spend a Hope** to make it a success
        instead.`,
      ),
      feat("Backstab", "Your “Marked for Death” feature uses **d8s** instead of **d6s**."),
    ],
  },
});

const poisonersGuild = subclass({
  name: "Poisoners Guild",
  className: "Assassin",
  spellcastTrait: "knowledge",
  description:
    "Play the Poisoners Guild if you want to debilitate your targets with punishing afflictions.",
  ranks: {
    foundation: [
      feat(
        "Toxic Concoctions",
        `
        **Mark a Stress** to place **1d4+1** tokens on this card. When you make a successful weapon
        attack, you can spend a token to afflict the target with a poison. You know these poisons:

        - **_Ghost Petal:_** The target becomes temporarily _Vulnerable_.
        - **_Grave Spore:_** The target must also mark a Stress.
        - **_Leech Weed:_** You deal an extra **1d6** damage on this attack.

        When you take a long rest, clear all unspent tokens.`,
      ),
    ],
    specialization: [
      feat(
        "Poison Compendium",
        `
        You also know these poisons:

        - **_Midnight Vine:_** The target has disadvantage on attack rolls until it marks a Stress
        to clear this condition.
        - **_Gorgon Root:_** The target becomes temporarily _Restrained_.`,
      ),
      feat(
        "Twin Fang",
        `
        When you afflict a target _Marked for Death_ with a poison you know, you can spend an
        additional token to also inflict the effect of a second poison you know.`,
      ),
    ],
    mastery: [
      feat(
        "Venomancer",
        `
        You also know these poisons:

        - **_Blight Seed:_** The target gains a −3 penalty to their damage thresholds until the end
        of the scene. This effect can’t stack.
        - **_Fear Leaf:_** You deal extra damage equal to the result of your Fear Die on this attack.
        - **_Corpse Thorn:_** The target gains disadvantage on reaction rolls until the end of the
        scene.`,
      ),
      feat("Adder’s Blessing", "You are immune to poisons and other toxins."),
    ],
  },
});

/* ══════════════════════════════════════════════════════════════════════
   BRAWLER — Valor & Bone
   ══════════════════════════════════════════════════════════════════════ */

const brawler = classItem({
  name: "Brawler",
  flavor: FLAVOUR.brawler,
  domains: ["valor", "bone"],
  evasion: 10,
  hitPoints: 6,
  items: "Hand wraps from a mentor or a book about your secret hobby",
  description: "Experts in unarmed combat, brawlers hone their bodies into lethal weapons.",
  hopeFeature: feat(
    "Square Up",
    "**Spend 3 Hope** to intimidate a target within Close range, making them temporarily _Vulnerable_.",
  ),
  features: [
    feat(
      "I Am the Weapon",
      `
      Your barehanded attacks are as strong as any blade. You have a primary weapon called Brawler’s
      Strike equipped while you have no other Active Weapons. It uses a trait of your choice, has
      Melee range, and deals **d8+d6** physical damage using your Proficiency (both the **d8** and
      **d6** scale off your Proficiency). While this weapon is active, you gain a +1 bonus to your
      Evasion.`,
    ),
    feat(
      "Combo Strike",
      `
      After rolling damage on a successful attack with a Melee weapon, you can **mark a Stress** to
      start a combo strike. When you do, roll your Combo Die and note the result, then continue
      rolling your Combo Die until the result of your latest roll is lower than the roll that
      preceded it. You deal extra damage equal to the total of all rolled Combo Die results on this
      attack. The results can’t be modified by any means.

      Your Combo Die starts as a **d4**. Once per tier, you can increase your Combo Die by one step
      as a level advancement option.`,
    ),
  ],
  background: [
    "Where did you spend time during your formative years that taught you, directly or indirectly, how to fight in the style you use?",
    "What organization has vowed to kill you on sight, and what did you do to invoke their ire?",
    "Who did you recently lose a fight to that you’re desperate for a rematch against?",
  ],
  connections: [
    "What is one thing we’re both afraid of?",
    "What do I rely on you for during our travels? How do you feel about it?",
    "I still haven’t forgiven you for something you said to me. What was it, and why did you say it?",
  ],
});

const juggernaut = subclass({
  name: "Juggernaut",
  className: "Brawler",
  description: "Play the Juggernaut if you want to pulverize your opponents with crushing blows.",
  ranks: {
    foundation: [
      feat("Rugged", "Gain a permanent +3 bonus to your Severe damage threshold."),
      feat(
        "Overwhelm",
        `
        When you succeed on an attack against a target, you can **spend a Hope** to throw the target
        within Close range or to force them to mark a Stress.`,
      ),
    ],
    specialization: [
      feat(
        "Surrounded",
        `
        When you make an attack with a Melee weapon, you can spend any number of Hope to target an
        equal number of additional creatures within Melee range.`,
      ),
      feat(
        "Eye for an Eye",
        `
        Once per rest when an adversary within Melee range forces you to mark any number of Hit
        Points, you can **mark a Stress** to force them to mark the same number of Hit Points.`,
      ),
    ],
    mastery: [
      feat(
        "Pummeljoy",
        `
        When you critically succeed on a Melee weapon attack, you gain an additional Hope, clear an
        additional Stress, and gain a +1 bonus to your Proficiency for that attack.`,
      ),
      feat("Not Done Yet", "When you take Severe damage, you can gain a Hope or clear a Stress."),
    ],
  },
});

const martialArtist = subclass({
  name: "Martial Artist",
  className: "Brawler",
  description:
    "Play the Martial Artist if you want to use a variety of fighting styles to eliminate your foes.",
  ranks: {
    foundation: [
      feat(
        "Stance Fighter",
        `
        You can channel your inner resolve to shift into martial stances that grant you special
        benefits in combat.

        Take the Martial Stances sheet and choose two martial stances from Tier 1. Each time you
        level up your character, choose an additional stance from your tier or lower.`,
      ),
    ],
    specialization: [
      feat(
        "Keen Defenses",
        `
        When you’re targeted by an attack, you can spend a Focus to gain a bonus to your Evasion
        equal to your tier against the attack.`,
      ),
      feat(
        "Focus Cannon",
        `
        Spend a Focus to make an **Instinct Roll** against an adversary within Far range. On a
        success, deal **d20+3** magic damage using your Proficiency.`,
      ),
    ],
    mastery: [
      feat(
        "Limit Breaker",
        `
        Once per rest, you can perform an unbelievable feat of athletic prowess, such as running
        across water, leaping between distant rooftops, or scaling a building without needing to
        roll. When you do, gain a Hope and clear a Stress.`,
      ),
      feat(
        "Flow State",
        `
        You can **mark a Stress** instead of spending a Focus to shift into a different stance.
        Additionally, you can spend a Focus instead of marking a Stress to start a combo strike.`,
      ),
    ],
  },
});

/* ══════════════════════════════════════════════════════════════════════
   MARTIAL STANCES

   The sheet the Martial Artist's foundation card sends you to fetch, as
   sixteen `feature` Items — four per tier, and you own the ones you have
   marked rather than all of them. See this file's header for why these are
   Items rather than card text.

   `origin` carries the tier, because the tier *is* the rule that governs
   them: you may only take a stance from your tier or lower, and that is the
   one fact about a stance the rules text on it never states. The Focus
   economy itself lives on the subclass card, not here — a stance is a thing
   you shift into, and how Focus is gained and spent is the same for all
   sixteen.
   ══════════════════════════════════════════════════════════════════════ */

const stance = (tier, name, text) =>
  featureItem({
    name,
    kind: "passive",
    origin: `Martial Stance · Tier ${tier}`,
    folder: "Brawler",
    text,
  });

const STANCES = [
  stance(1, "Favored", "Gain a bonus to damage rolls equal to a trait of your choice."),
  stance(1, "Invigorating", "On a successful attack, roll a **d4**. On a result of 4, gain a Focus."),
  stance(
    1,
    "Quick",
    `
    When you make an attack, you can spend a Focus or **mark a Stress** to target another creature
    within range with that attack.`,
  ),
  stance(1, "Reliable", "Gain a +1 bonus to your attack rolls."),

  stance(
    2,
    "Aggressive",
    `
    Gain a −1 penalty to your Evasion. On a successful attack, roll an additional damage die and
    discard the lowest result.`,
  ),
  stance(
    2,
    "Anchored",
    `
    Gain a +2 bonus to your damage thresholds. While in this stance, you can’t be moved against your
    will.`,
  ),
  stance(
    2,
    "Defensive",
    `
    Attack rolls targeting you from within Melee range have disadvantage unless the attacker marks a
    Stress to negate the disadvantage.`,
  ),
  stance(
    2,
    "Otherworldly",
    "On a successful attack, you can deal physical or magic damage.",
  ),

  stance(
    3,
    "Grappling",
    `
    On a successful attack within Melee range, you can spend a Focus or **mark a Stress** to
    temporarily _Restrain_ the target or throw the target up to Close range.`,
  ),
  stance(3, "Scary", "On a successful attack, the target must mark a Stress."),
  stance(3, "Stable", "You can spend a Focus instead of an Armor Slot to reduce damage."),
  stance(
    3,
    "Vigilant",
    `
    When you are targeted by an attack, you can **mark a Stress** to gain a **d6** bonus to your
    Evasion against the attack.`,
  ),

  stance(
    4,
    "Crushing",
    `
    When you deal Severe damage, you can **spend a Hope** to force the target to mark an additional
    Hit Point.`,
  ),
  stance(
    4,
    "Exacting",
    "When you roll a 1 on a damage die, you can treat it as the highest value on the die instead.",
  ),
  stance(
    4,
    "Honed",
    `
    Spend a Focus before you make an attack roll to gain a +1 bonus to your Proficiency for that
    attack.`,
  ),
  stance(
    4,
    "Isolating",
    `
    Gain advantage on attack rolls when there are no other creatures within Very Close range of you
    or your target.`,
  ),
];

/* ══════════════════════════════════════════════════════════════════════
   WARLOCK — Dread & Grace
   ══════════════════════════════════════════════════════════════════════ */

const warlock = classItem({
  name: "Warlock",
  flavor: FLAVOUR.warlock,
  domains: ["dread", "grace"],
  evasion: 11,
  hitPoints: 5,
  items: "A carving that symbolizes your patron or a ring you can’t remove",
  description:
    "Those who’ve traded their lives—or perhaps even their souls—to an otherworldly patron in exchange for incredible power are known as warlocks.",
  hopeFeature: feat(
    "Patron’s Boon",
    "When you fail a roll, you can **spend 3 Hope** to reroll with advantage.",
  ),
  features: [
    feat(
      "Patron’s Pact",
      `
      You have committed yourself to a supernatural entity—such as a god, fae, or demon—in exchange
      for power. Write their name on your character sheet, then work with your GM to determine their
      sphere of influence (such as Nature, Chaos, Wisdom, Mischief, Love, War, Justice, or Death).
      Before making an action roll that relates to your patron’s sphere of influence, you can spend a
      Favor to call upon their aid, rolling your Patron Die and adding its result to the total. Your
      Patron Die starts at a **d6** and increases to a **d8** at level 5.`,
    ),
    feat(
      "Favor",
      `
      You start with 3 Favor. You can use a downtime move to show tribute to your patron. Describe
      how and gain Favor equal to your Spellcast trait. Additionally, when you succeed on an action
      roll with Hope, you can choose to gain a Favor instead of a Hope.`,
    ),
  ],
  background: [
    "Who from your community shunned you after you made a pact with your patron?",
    "What desperate situation led you to pledge your life to your patron?",
    "Your patron has given you one task you must accomplish above all else. What is it, and why does it worry you?",
  ],
  connections: [
    "Why do you think I confide in you about what my patron says and does?",
    "Our relationship has changed since you saw me show tribute to my patron. What did you see, and how has it affected you?",
    "I once did something very foolish, and you’ve never let me live it down. What was it?",
  ],
});

const pactOfTheEndless = subclass({
  name: "Pact of the Endless",
  className: "Warlock",
  spellcastTrait: "presence",
  description:
    "Play the Pact of the Endless if you want to stand strong against enemies and avoid death.",
  ranks: {
    foundation: [
      feat(
        "Patron’s Mantle",
        `
        Spend a Favor to cloak yourself in a terrifying aspect of your Patron that lasts until you
        take Severe damage or the scene ends. While this effect is active, you gain a bonus to your
        damage thresholds equal to your tier and have advantage on action rolls to intimidate a
        target.`,
      ),
      feat(
        "Deathless Embrace",
        `
        Once per rest, spend any number of Favor to roll an equal number of Patron Dice. For each
        result of 4 or higher, clear a Hit Point.`,
      ),
    ],
    specialization: [
      feat(
        "Harrowing Invocation",
        `
        When an adversary targets you or an ally within Very Close range with an attack, you can
        spend a Favor to give them disadvantage on the roll. If the adversary fails the roll, they
        must also mark a Stress.`,
      ),
      feat("Damage Sink", "Once per rest, you can spend a Favor to halve incoming damage."),
    ],
    mastery: [
      feat(
        "Dark Aegis",
        `
        Once per long rest when you would take damage, you can spend a Favor instead of marking Hit
        Points.`,
      ),
      feat(
        "Draining Bane",
        `
        When an adversary targets you or an ally within Very Close range with an attack, you can
        spend a Favor to _Drain_ them. When you do, they must mark a Stress, and you can clear a
        Stress. While _Drained_, the target uses a **d12** instead of a **d20** for attack rolls
        (including for advantage or disadvantage) until they fail a roll.`,
      ),
    ],
  },
});

const pactOfTheWrathful = subclass({
  name: "Pact of the Wrathful",
  className: "Warlock",
  spellcastTrait: "presence",
  description: "Play the Pact of the Wrathful if you want to destroy those who act against you.",
  ranks: {
    foundation: [
      feat(
        "Patron’s Fury",
        `
        Spend a Favor to imbue your attacks with your Patron’s power until you deal Severe damage or
        the scene ends. When you roll damage while this effect is active, you also roll a number of
        Patron Dice equal to your tier and add their total to the damage dealt.`,
      ),
      feat(
        "Deadly Vengeance",
        `
        When you mark any number of Hit Points from an attack, you can spend a Favor to roll an equal
        number of Patron Dice. For each result of 4 or higher, the attacker marks a Hit Point.`,
      ),
    ],
    specialization: [
      feat(
        "Menacing Reach",
        `
        Spend a Favor to increase the range of your primary weapon by one step (such as Melee to Very
        Close or Very Close to Close) to a maximum of Very Far range. This effect ends when you make
        a successful attack with that weapon.`,
      ),
      feat(
        "Diminish My Foes",
        `
        When you succeed with Hope on an action roll against a target, you can spend any number of
        Favor to force the target to mark an equal number of Stress.`,
      ),
    ],
    mastery: [
      feat(
        "Fearsome Attack",
        `
        Spend a Favor to reroll any number of your damage dice. You can continue spending Favor to
        use this feature on the same damage roll.`,
      ),
      feat(
        "Otherworldly Ire",
        `
        Once per rest when you take damage, you can spend any number of Favor to roll that many
        Patron Dice and target a number of creatures within Close range equal to the highest result.
        Each target must mark a Hit Point.`,
      ),
    ],
  },
});

/* ══════════════════════════════════════════════════════════════════════
   WITCH — Sage & Dread
   ══════════════════════════════════════════════════════════════════════ */

const witch = classItem({
  name: "Witch",
  flavor: FLAVOUR.witch,
  domains: ["sage", "dread"],
  evasion: 10,
  hitPoints: 6,
  items: "A small, harmless pet or a scrying stone",
  description:
    "Witches are magical practitioners who commune with the forces of nature and entities from realms beyond.",
  hopeFeature: feat(
    "Witch’s Charm",
    `
    When you or an ally within Far range fails an action roll, you can **spend 3 Hope** to change it
    into a success with Fear instead.`,
  ),
  features: [
    feat(
      "Hex",
      `
      **Mark a Stress** to temporarily _Hex_ a target within Far range. While _Hexed_, the target
      gains a penalty to their damage rolls and Difficulty equal to your tier. The maximum number of
      creatures you can _Hex_ at one time is equal to your Spellcast trait.`,
    ),
    feat(
      "Commune",
      `
      Once per long rest during a moment of calm, you can commune with an ancestor, a deity, a
      spirit, or an otherworldly being. Ask them a question, then roll a number of **d6s** equal to
      your Spellcast trait. Choose one of the results and reference the chart below for the effect.

      - **1–3:** You taste a flavor, smell a scent, or feel a sensation relevant to the answer.
      - **4–5:** You hear sounds or see a vision relevant to the answer.
      - **6:** You psychically experience a scene relevant to the answer as if you were there.`,
    ),
  ],
  background: [
    "Who from your community feared your magical craft? What rumor did they spread about you, and what truth did it contain?",
    "You once used your power to help someone in a dire situation. Who were they, and why did they come to you?",
    "Your magic once opened a door best left closed. Who or what was on the other side?",
  ],
  connections: [
    "What unique ritual or practice have I taught you that we now perform together?",
    "I once appeared to you in a dream and shared a vision of the future. What did I tell you?",
    "What do you typically come to me for advice about?",
  ],
});

const hedge = subclass({
  name: "Hedge",
  className: "Witch",
  spellcastTrait: "knowledge",
  description: "Play the Hedge if you want to use your craft to empower yourself and your party.",
  ranks: {
    foundation: [
      feat(
        "Herbal Remedies",
        `
        When you or an ally in the scene clears 1 or more Hit Points or Stress as the result of using
        a consumable, increase the number cleared by 1.`,
      ),
      feat(
        "Enchanted Talisman",
        `
        Once per rest, you can imbue a small item with your protective essence. Spend any number of
        Hope to place an equal number of tokens on this card. When the person holding the talisman
        takes damage, spend a token to reduce the number of Hit Points they mark by one. Clear all
        tokens from this card when you take a rest.`,
      ),
    ],
    specialization: [
      feat(
        "Walk Between Worlds",
        `
        During a moment of calm, make a **Spellcast Roll (13)**. Once per rest on a success, you can
        **mark a Stress** to step beyond the veil of death and converse with any nearby spirits.
        Place a number of tokens equal to your Spellcast trait on this card and remove one each time
        a spirit answers a question. When the last token is removed or at the end of the scene, you
        return to the Mortal Realm in the same spot you left it.`,
      ),
      feat("Vexing Malison", "You have advantage on attacks against _Hexed_ creatures."),
    ],
    mastery: [
      feat(
        "Circle of Power",
        `
        Once per rest, mark a circle on the ground outlining a Very Close area around you, and place
        a number of tokens equal to your Spellcast trait on this card. While within this circle, you
        and your allies gain a +2 bonus to damage thresholds, attack rolls, and Evasion. Remove a
        token each time you or an ally within the circle makes an action roll or evades an attack.
        This spell lasts until the last token is removed or you exit the circle.`,
      ),
    ],
  },
});

const moon = subclass({
  name: "Moon",
  className: "Witch",
  spellcastTrait: "instinct",
  description: "Play the Moon if you want to embody celestial power to amplify your magic.",
  ranks: {
    foundation: [
      feat(
        "Night’s Glamour",
        `
        Make a **Spellcast Roll (13)** to _Glamour_ yourself in a bewitching facade. While
        _Glamoured_, you have advantage on rolls that leverage your illusory appearance.
        Additionally, adversaries within Close range must mark a Stress to attack you.

        Unless you **mark a Stress** to maintain your _Glamour_, it drops when you mark a Hit Point
        or deal damage.`,
      ),
    ],
    specialization: [
      feat(
        "Moonbeam",
        `
        Once per session, you can conjure a column of moonlight that illuminates the area within
        Close range until the end of the scene. While bathed in this moonlight, you and your allies
        gain a +1 bonus to Spellcast Rolls and can see through illusions.`,
      ),
      feat(
        "Ire of Pale Light",
        "When a _Hexed_ creature within Very Far range fails an attack, they must mark a Stress.",
      ),
    ],
    mastery: [
      feat(
        "Lunar Phases",
        `
        At the beginning of each session, roll a **d6** and place it on this card. You gain the
        matching effect until the end of session.

        - **1 — New:** **Spend a Hope** to negate Minor damage.
        - **2–3 — Waxing:** +2 to damage rolls
        - **4 — Full:** +3 to damage thresholds
        - **5–6 — Waning:** +1 to Evasion

        Once per rest, you can **spend a Hope** to increase the value of this die by one. If you
        increase the value of a 6, it becomes a 1.`,
      ),
    ],
  },
});

export default [
  assassin,
  ...executionersGuild,
  ...poisonersGuild,
  brawler,
  ...juggernaut,
  ...martialArtist,
  ...STANCES,
  warlock,
  ...pactOfTheEndless,
  ...pactOfTheWrathful,
  witch,
  ...hedge,
  ...moon,
];
