/**
 * The Gunslinger — this system's own homebrew class, its one subclass and the
 * Flint deck.
 *
 * Hand-authored, for the reason `gluniverse-heritage.mjs` is: nobody publishes
 * these, so there is no snapshot to generate from and `tools/check-cards.mjs`
 * skips every name this module exports. The design record — the Homebrew Kit
 * budgets, the comparison against every printed card and three rounds of
 * balance testing — is `homebrew/gunslinger/`, and this file is the rules text
 * that came out of it, word for word.
 *
 * It replaces the 0.1 playtest package (Bone and Artifice, the Drifter and the
 * Sharpshooter, twenty-eight workshop firearms), which lived in packs of its
 * own behind a setting of its own. This one is filed where the books are: the
 * class and Corsair in `classes`, Flint in `domains`, all of it stamped
 * `gluniverse` so the content library switches it with Rattin and Avori.
 *
 * It names no weapon. The class is built around SRD 2.0's Western Campaigns
 * guns (the Revolver, its Six Shot ammunition already tracked in `variants`)
 * and every feature says "ranged weapon", so the corebook's firearms work too.
 */

import { classItem, domainCardItem, feat, subclassCards } from "./_helpers.mjs";
import { withActions } from "./card-actions.mjs";

/* ══════════════════════════════════════════════════════════════════════
   CLASS
   ══════════════════════════════════════════════════════════════════════ */

const gunslinger = classItem({
  name: "Gunslinger",
  description:
    "Gunslingers are duelists of the long shot and the steady hand, who win fights by calling where the bullet goes before it leaves the barrel.",
  flavor: `
    Gunslingers are duelists of the long shot and the steady hand, who win fights by calling where
    the bullet goes before it leaves the barrel. Some learned on the decks of raiding ships, some on
    frontier roads with a price on their heads, and some in the drilled ranks of an army they later
    walked away from. What they share is nerve: the willingness to take the harder shot because the
    easier one doesn’t end the fight. A gunslinger’s reputation tends to arrive a little before they
    do, and they rarely do much to correct it.`,
  domains: ["flint", "bone"],
  evasion: 11,
  hitPoints: 6,
  items:
    "The spent casing from the first shot you ever fired or a wanted poster with a face that’s almost yours",
  suggestedTraits: "Agility +1, Strength −1, Finesse +2, Instinct +1, Presence 0, Knowledge 0",
  hopeFeature: feat(
    "Quickdraw",
    `
    When an adversary within range of your active ranged weapon makes an attack against you or an
    ally, you can **spend 3 Hope** to make an attack against them with that weapon before their
    attack roll is made. Their attack is made with disadvantage. On a success, deal damage, and if
    this defeats them, their attack doesn’t happen. If their attack has several targets, it’s made
    with disadvantage against each of them. This attack can be a called shot and generates Hope or
    Fear as normal. Afterward, the GM’s turn continues.`,
  ),
  features: [
    feat(
      "Call Your Shot",
      `
      Before you make an attack with a ranged weapon, you can call your shot against one target.
      Choose one of the following options and describe the shot that would make it happen. The
      attack’s Difficulty increases by 2. On a success, deal damage with a +1 bonus to your
      Proficiency and apply the option you chose.

      - **Rattle:** The target must mark a Stress.
      - **Disarm:** The target’s next attack is made with disadvantage.
      - **Expose:** **Mark a Stress** to make the target temporarily _Vulnerable_.
      - **Pin:** **Mark a Stress** to make the target temporarily _Restrained_. A flying target
        that becomes Restrained lands.

      When a called shot succeeds, you don’t roll for your weapon’s Reloading feature, and if you
      spent an Ammo token to make the attack, regain it. If the attack has more than one target,
      the option and the Proficiency bonus apply only to the target you called.`,
    ),
  ],
  background: [
    "Who taught you to shoot, and what did they make you promise before they put a gun in your hand?",
    "What did you lose the one time you hesitated?",
    "Someone is still looking for you over a shot you fired. Who are they, and were you in the right?",
  ],
  connections: [
    "Why do I trust you to stand where I’m aiming?",
    "What did you see me do that you still haven’t forgiven?",
    "What tune do I whistle while I clean my guns, and do you know where I learned it?",
  ],
});

/* One subclass, and that is a decision rather than a gap: it is Kass's, from
   the Tide of Destiny campaign. The design notes say what a second one should
   cover. No painting yet, so the three cards wear the class mark. */
const corsair = subclassCards({
  name: "Corsair",
  className: "Gunslinger",
  description:
    "Play the Corsair if you want to fight with a blade in one hand and a pistol in the other, and stand between your crew and anyone who would hurt them.",
  ranks: {
    foundation: [
      feat(
        "Steel and Shot",
        `
        While you have a Melee weapon and a ranged weapon active, when you succeed on an attack with
        one of them, your next attack with the other against the same target gains a +2 bonus.`,
      ),
      feat(
        "Unshackled",
        `
        You have advantage on rolls to escape bindings or restraints. Once per rest, you can clear
        the _Restrained_ condition from yourself or an ally within Very Close range.`,
      ),
    ],
    specialization: [
      feat(
        "Answer for It",
        `
        Once per GM turn, when an adversary within range of your active ranged weapon succeeds on an
        attack against one or more allies, you can **mark a Stress** to make an attack against them
        with that weapon. On a success, they must mark a Hit Point. This attack generates Hope or
        Fear as normal. Afterward, the GM’s turn continues.`,
      ),
      feat(
        "All Hands",
        `
        Once per long rest, when you and your allies face a danger together, call out your orders.
        You and each ally who can hear you can clear 2 Stress or gain a Hope.`,
      ),
    ],
    mastery: [
      feat(
        "Two Birds",
        `
        When you call your shot, you can choose two different options instead of one. The Difficulty
        still increases by only 2, and you pay the cost of each option you choose.`,
      ),
      feat(
        "Infamy",
        `
        Once per long rest, when you reveal yourself to your enemies, describe the story they’ve
        heard about you and make a **Presence Roll (15)**. On a success, the GM loses a Fear and
        each adversary who can hear you must mark a Stress.`,
      ),
    ],
  },
});

/* ══════════════════════════════════════════════════════════════════════
   FLINT

   Twenty-one abilities, three at level 1 and two at every level after —
   the printed decks' shape, which `tools/check-gunslinger.mjs` asserts. Two
   threads: Aim (what happens to the target) and Nerve (what you stake, and
   what holds when it goes wrong). Flint never moves you; that is Bone's.
   ══════════════════════════════════════════════════════════════════════ */

const ability = (name, level, recall, text) =>
  domainCardItem({ name, domain: "flint", level, cardType: "ability", recall, text });

const FLINT_CARDS = [
  /* ── level 1 ─────────────────────────────────────────────────────── */
  ability("Draw a Bead", 1, 0, `
    **Spend a Hope** to draw a bead on a target you can see within Far range. Until you choose to
    attack a different creature, the target is defeated, or it leaves your sight, your attacks
    against it gain a +1 bonus and you add a **d4** to your damage rolls against it. Attacks you
    make in response to an adversary’s action don’t end the bead.`),
  ability("Under Fire", 1, 1, `
    When you take Major or greater damage, you can **mark a Stress**. On your next action roll, you
    can roll a **d20** as your Hope Die.`),
  ability("Cold Read", 1, 0, `
    Once per rest, when you size someone up in a tense conversation, make an **Instinct Roll**
    against them. On a success, ask the GM one of the following questions, which they answer
    truthfully, and gain advantage on your next action roll against that person:

    - What do they want right now?
    - What are they afraid of?
    - What are they hiding from me?`),

  /* ── level 2 ─────────────────────────────────────────────────────── */
  ability("Long Shot", 2, 1, `
    Increase the range of your ranged weapons with a range of Far to Very Far. When you succeed on
    an attack against a target at Very Far range, add a **d6** to your damage roll.`),
  ability("Name the Stakes", 2, 1, `
    Once per rest, before you make an action roll, name what you stand to lose if it fails. Gain
    advantage on the roll. If the roll fails, **mark 2 Stress**.`),

  /* ── level 3 ─────────────────────────────────────────────────────── */
  ability("Covering Fire", 3, 1, `
    **Spend a Hope** and make an attack with a ranged weapon against a target within range. On a
    success, deal damage, and the target becomes temporarily _Suppressed_. While Suppressed, its
    attacks against anyone other than you are made with disadvantage.`),
  ability("Grit", 3, 1, `
    When you fail a roll with Fear, place a token on this card, up to a maximum equal to your
    Proficiency. When you deal damage, you can spend any number of tokens from this card to add a
    **d6** to the damage roll for each token spent. When you take a long rest, clear all tokens
    from this card.`),

  /* ── level 4 ─────────────────────────────────────────────────────── */
  ability("Trick Shot", 4, 1, `
    **Spend a Hope** to make an attack with a ranged weapon against an object within range that
    hasn’t been used this way this scene (Difficulty 12), such as a rope, a keg or a beam, and
    describe what the shot sets off. On a success, each adversary within Very Close range of the
    object must make a **Reaction Roll (15)**. Those who fail take your weapon’s damage and are
    temporarily _Restrained_.`),
  ability("Stare Down", 4, 1, `
    Once per rest, when you face down a creature in a tense standoff, make a **Presence Roll**
    against them. On a success, they must choose one: back down and not attack you for the rest of
    the scene unless you attack them first, or **mark 2 Stress** and make their next attack against
    you with disadvantage.`),

  /* ── level 5 ─────────────────────────────────────────────────────── */
  ability("Pick Your Spot", 5, 1, `
    When you succeed on an attack against a target that was _Vulnerable_ or _Restrained_ before you
    attacked, add a **d10** to your damage roll.`),
  ability("All In", 5, 2, `
    Once per long rest, before you make an action roll, spend any number of Hope. Gain a +2 bonus
    to the roll for each Hope spent. If the roll fails, **mark a Stress** for each Hope you spent.`),

  /* ── level 6 ─────────────────────────────────────────────────────── */
  ability("Shoot It Out of Their Hand", 6, 2, `
    When you succeed on an attack with a ranged weapon, you can **spend a Hope** to name one of the
    target’s Action features. They can’t use it until the GM spends a Fear to restore it. A target
    can have only one feature disabled this way at a time.`),
  ability("Nothing Left to Lose", 6, 1, `
    While all of your Stress slots are marked, your attack rolls have advantage.`),

  /* ── level 7 ─────────────────────────────────────────────────────── */
  ability("Flint-Touched", 7, 1, `
    When 4 or more of the domain cards in your loadout are from the Flint domain, gain the
    following benefits:

    - +1 bonus to Finesse
    - Once per rest, when you make an attack with a ranged weapon that rolls with Fear, you can
      **mark a Stress** to make it roll with Hope instead.`),
  ability("Steady Hand", 7, 1, `
    Your attacks with ranged weapons can’t be made with disadvantage. When an effect would give you
    disadvantage on one, gain a +1 bonus to the roll instead.`),

  /* ── level 8 ─────────────────────────────────────────────────────── */
  ability("Killshot", 8, 2, `
    When you succeed on an attack with a ranged weapon, you can **mark 2 Stress** to roll its damage
    with a +2 bonus to your Proficiency. The target’s resistance doesn’t apply, and it can’t reduce
    this damage.`),
  ability("Poker Face", 8, 1, `
    Once per session, when someone calls your bluff, you can double down. Make a **Presence Roll**
    with advantage against them. On a success, they believe you until they see clear proof
    otherwise. On a failure, **mark 2 Stress**.`),

  /* ── level 9 ─────────────────────────────────────────────────────── */
  ability("Through and Through", 9, 2, `
    Once per rest, when you succeed on an attack with a ranged weapon, you can **spend 2 Hope** to
    send the shot through the target. Use the same attack roll against up to two other targets
    within Very Close range of the first, and deal your full damage to each of them you succeed
    against.`),
  ability("Parley", 9, 2, `
    Once per session, during a fight, call for a parley, **mark a Stress**, and make a **Presence
    Roll** against the leader of your enemies. On a success, adversaries who can hear you won’t
    attack until you or an ally acts against them, or until the GM spends a Fear to end it.`),

  /* ── level 10 ────────────────────────────────────────────────────── */
  ability("Deadeye", 10, 2, `
    Once per long rest, **spend 2 Hope** to make an attack with a ranged weapon, with advantage,
    against a target you can see, ignoring your weapon’s range. On a success, treat it as a
    critical success, and the target must mark 2 additional Hit Points.`),
  ability("Last Word", 10, 3, `
    When you mark your last Hit Point, before you make a death move, you can make an attack with a
    weapon against a target within your weapon’s range. On a success, deal maximum damage, clear 2
    Hit Points, and don’t make a death move. On a failure, clear a Hit Point and don’t make a death
    move. Either way, place this card in your vault.`),
];

/** The class and its subclass, for `classes.mjs`. */
export const GUNSLINGER_CLASSES = withActions([gunslinger, ...corsair]);

/** The Flint deck, in deck order, for `domains.mjs`. */
export const FLINT = withActions(FLINT_CARDS);

/** Everything, which is what `tools/check-cards.mjs` reads as "no upstream". */
export default [...GUNSLINGER_CLASSES, ...FLINT];
