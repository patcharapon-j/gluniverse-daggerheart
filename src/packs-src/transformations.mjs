/**
 * The six transformations — *Daggerheart: Hope and Fear*, chapter 1.
 *
 * A transformation is a heritage card, and the book says so directly: "add the
 * card to your loadout as if it were part of your character's heritage", and
 * like ancestry and community it does not count against the domain card limit.
 * So it ships in the heritage pack beside them, and `TransformationData` sits
 * beside `AncestryData` in `data/items.ts`.
 *
 * **A PC can have only one.** That is the printed rule, in its own one-line
 * paragraph, and it is the one thing that makes this subtype behave unlike an
 * ancestry — mixed ancestry is two of those by design. `TRANSFORMATION_LIMIT`
 * in `config.ts` is the constant and the character sheet is what enforces it.
 *
 * ── two features, and this file does not say which is which ───────────
 * Every transformation prints a benefit and a drawback; the book's own framing
 * is "taking on the burden to reap the benefit", and it recommends you remind
 * your GM of the burden when it is relevant. That is a real pairing and it is
 * deliberately *not* modelled as two named fields, because which half a feature
 * is depends on the state of the game rather than on the card. The Vampire's
 * Feed is a benefit right up until the last token comes off and every roll you
 * make goes to disadvantage. Reanimated's Won't Stay Dead is a drawback that is
 * also the only reason you get up. Labelling them would be this file
 * adjudicating something the page leaves open.
 *
 * So `features` is a flat run in printed order, exactly as a subclass rank is,
 * and the card reads out what the card reads out.
 *
 * `questions` is the card's "Transformation Questions" list. Prose the sheet
 * offers rather than a rule the sheet applies — the same kind of thing as a
 * class's `backgroundQuestions`, stored the same way.
 */

import { cardArt, feat, transformationItem } from "./_helpers.mjs";

/* The painting, stamped once — see the same note in `hf-heritage.mjs`. */
const transformation = (o) => transformationItem({ ...o, art: cardArt("transformation", o.name) });

export default [
  transformation({
    name: "Demigod",
    description: `
    Demigods are mortal creatures whose veins flow with the blood of the gods.`,
    features: [
      feat("Gifted", "You gain a +1 bonus to action, reaction, and damage rolls."),
      feat(
        "Weight of Divinity",
        "When you fail a roll, you must **mark a Stress** or the GM gains a Fear.",
      ),
    ],
    questions: [
      "Your divinity has affected an aspect of your appearance. In what way do you look different from others?",
      "Who bestowed demigod status upon you, and what trial did you complete to earn this gift?",
      "You were made fun of as a child for your divine parentage. Why?",
      "Why was the knowledge that you are a demigod kept from you for many years? Who kept this secret?",
      "You have an obligation you must fulfill due to the immortal blood that runs in your veins. What is this duty?",
      "In what way did your divinity initially manifest? Why did it surprise you?",
    ],
  }),

  transformation({
    name: "Ghost",
    description: `
    Ghosts are the spirits of the once-living who are bound to the Mortal Realm.`,
    features: [
      feat(
        "Unfinished Business",
        `
        Work with your GM to decide what purpose or desire keeps you bound to the Mortal Realm. When
        you fulfill it, you cross through the veil of death.`,
      ),
      feat(
        "Ephemeral",
        `
        Your body wavers in and out of being corporeal. You are resistant to physical damage, take
        double magic damage, and can **mark 2 Stress** to momentarily pass through a solid object.`,
      ),
    ],
    questions: [
      "How did you die, and what fear has your death instilled in you?",
      "What brought you back from beyond the veil of death?",
      "In life, you loved someone dearly. Why do you need to find them again?",
      "What must you accomplish now that you’ve returned to the Mortal Realm? How will you meet your goal?",
      "Who harmed you in your first life? How do you plan to deal with them now that you’ve returned?",
      "You had to sacrifice something dear to you in order to come back to the Mortal Realm. What did you give up, and who did you give it to?",
    ],
  }),

  transformation({
    name: "Reanimated",
    description: "Reanimated are corpses who have been brought back to life.",
    features: [
      feat(
        "Corpse",
        `
        During a rest, you can clear Hit Points only if you have access to remains from a recently
        deceased creature. Describe how you use these materials to maintain your corpse.`,
      ),
      feat(
        "Won’t Stay Dead",
        `
        When you choose the Risk It All death move and fail, you can permanently mark a Hit Point to
        succeed instead. When you do, you still use the Hope Die’s value to clear Hit Points and
        Stress. When you permanently mark your last Hit Point, you pass through the veil of death.`,
      ),
    ],
    questions: [
      "How did you first die, and how has that death affected your view on life?",
      "A fragment of memory from your first life haunts you. What is the memory, and why do you think it’s important?",
      "You had a dream for your life that you now believe you can never reach. What was your dream, and why do you think being reanimated makes it impossible to fulfill?",
      "How were you brought back from the dead, and how did the process change your body?",
      "Someone brought you back from death. Who were they, and how do you feel about this person and what they did to you?",
      "In the brief time you passed through the veil of death, you saw something that changed you forever. What was it?",
    ],
  }),

  transformation({
    name: "Shapeshifter",
    description: "Shapeshifters are creatures who can change their physical form.",
    features: [
      feat(
        "Change Shape",
        `
        During a rest, you can use a downtime move to swap your current ancestry with another. When
        you do, describe how your appearance changes.`,
      ),
      feat(
        "Only Skin Deep",
        `
        You gain the benefit of only one of your chosen ancestry’s features, which you select when
        you choose the ancestry. You can use a downtime move to choose a different feature from that
        ancestry.`,
      ),
    ],
    questions: [
      "You believe you have a “true form,” but you haven’t seen it. What do you think it is, and how do you know it’s there?",
      "What trick have you developed to identify other shapeshifters?",
      "Someone you loved dearly abandoned you when they found out about your ability to change shape. Who was it, and what happened?",
      "What is one form you’ve vowed to never take, and why?",
      "Which ancestry do you live as more than others? Why do you spend so much time in this form?",
      "Someone you know can instantly recognize you, no matter your form. How do they claim to identify you and what does their familiarity mean to you?",
    ],
  }),

  transformation({
    name: "Vampire",
    description: `
    Vampires are undead creatures with sharp fangs who feed on the blood of the living.`,
    features: [
      feat(
        "Fangs",
        `
        Make an attack using a trait of your choice to bite a target within Melee range. On a
        success, deal **d6** physical damage using your Proficiency.`,
      ),
      feat(
        "Feed",
        `
        On a successful “Fangs” attack against a creature that can bleed, you can **mark a Stress**
        to feed. Place a number of tokens on this card equal to the number of Hit Points the target
        marks. You can hold up to 6 tokens at a time. Before you make an action roll, you can spend
        a token to make your Fear Die a **d20**. When you take a long rest, remove a token. While
        there are no tokens on this card, you make action and reaction rolls with disadvantage.`,
      ),
    ],
    questions: [
      "Who did you have to leave behind when you became a vampire, and why was it so hard to let them go?",
      "You once killed an innocent for their blood. What characteristic of theirs do you notice most in others?",
      "What does your vampirism make you particularly vulnerable to?",
      "Who were you able to save using your vampiric power? What happened, and how do they feel about you now?",
      "How does your hunger for blood change you?",
      "The vampire who sired you still has a hold over you. What’s their name, and what do they want you to do for them?",
    ],
  }),

  transformation({
    name: "Werewolf",
    description: "Werewolves are creatures who transform into large supernatural wolves.",
    features: [
      feat(
        "Wolf Form",
        `
        When you mark 1 or more Hit Points, you can **mark a Stress** to enter your Wolf Form. While
        in this form, you gain a **1d10** bonus to attack and damage rolls. When you gain a Hope
        while in Wolf Form, you must also mark a Stress. Your Wolf Form lasts until you go into your
        “Howling Rampage” or take a rest.`,
      ),
      feat(
        "Howling Rampage",
        `
        When you mark your last Stress while in Wolf Form, you go into a rampage. Roll a number of
        **d20s** equal to your tier and deal that much physical damage to all creatures within Very
        Close range, then drop out of Wolf Form.`,
      ),
    ],
    questions: [
      "Someone is hunting you. Who is it, and why do they want you dead?",
      "What were you afraid of before you became a werewolf, and how has your new power changed that fear?",
      "You hear your wolf form in your head as if it were another entity. What lie does it tell you about yourself, and why are you beginning to believe it?",
      "What led you to kill someone you love during your rampage?",
      "Who cursed you to become a werewolf?",
      "You were once entreated to join a pack of other werewolves. How did you respond?",
    ],
  }),
];
