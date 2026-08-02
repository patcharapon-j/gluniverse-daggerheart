/**
 * The Dread deck — *Daggerheart: Hope and Fear*, twenty-one cards.
 *
 * ── why this is hand-authored and `domain-cards.mjs` is not ───────────
 * `domain-cards.mjs` is generated because something upstream writes it: the
 * official Card Creator publishes the 189 corebook cards with their text, art,
 * artist and printed number, and `tools/fetch-cards.mjs` copies them down. It
 * publishes **nothing** from Hope and Fear — the API returns nine domains, and
 * Dread is not one of them — so there is no snapshot to generate from and no
 * errata channel to re-fetch. This is chapter's appendix, typed in, the same
 * way `equipment-tables.mjs` is chapter 2 typed in and for the same reason.
 *
 * Two consequences, both deliberate:
 *
 * - **Art, but no artist and no card number.** The paintings are in the book
 *   and `tools/import-hf-art.mjs` files them under `assets/cards/domains/dread/`,
 *   so the path is *derived* from the name here rather than listed anywhere —
 *   one copy of the fact, nothing to drift, which is the argument
 *   `equipment.mjs` makes about not generating what nothing upstream writes.
 *   The other two fields are genuinely empty: there is no printed set, so there
 *   is no card number, and the expansion credits its artists collectively on
 *   page 2 without attributing a single painting. See `assets/cards/CREDITS.md`.
 * - **`tools/check-cards.mjs` cannot audit these**, because auditing means
 *   comparing against the snapshot and there is no row in it to compare to. It
 *   skips them by construction rather than by a hardcoded name list: anything
 *   this module exports is, by definition, a card with no upstream.
 *
 * ── deck shape ────────────────────────────────────────────────────────
 * Three cards at level 1 and two at every level after, which is the same shape
 * as all nine corebook decks. `tools/check-cards.mjs` asserts it, so a card
 * lost in transcription fails the build rather than shipping as a short deck.
 *
 * Order is by level, then alphabetical within a level — the same rule the
 * generator uses, and for the same reason: the appendix prints in reading-order
 * columns rather than in deck order, so a "printed order" taken off the page
 * would be a fact about the page's layout and not about the deck.
 */

/** Where `tools/import-hf-art.mjs` puts a painting. It has to agree with that
    tool's `slug()`, which is upstream's own: lower case, apostrophes dropped,
    everything else collapsed to one hyphen. `Dread-Touched` and
    `Savor the Anguish` are the two that exercise it. */
const art = (name) =>
  "systems/gluniverse-daggerheart/assets/cards/domains/dread/" +
  `${name.toLowerCase().replace(/['’ʼ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.webp`;

/** One card. `type` is the word under the title: every Dread card is a Spell
    except Dread-Touched, which is an Ability. */
const card = (name, level, type, recall, text) => ({
  name,
  domain: "dread",
  level,
  cardType: type,
  recall,
  art: art(name),
  artist: "",
  cardId: "",
  text,
});

const spell = (name, level, recall, text) => card(name, level, "spell", recall, text);
const ability = (name, level, recall, text) => card(name, level, "ability", recall, text);

export default [
  /* ── level 1 ─────────────────────────────────────────────────────── */

  spell(
    "Blighting Strike",
    1,
    1,
    "Make a **Spellcast Roll** against a target within Far range. On a success:\n" +
      "\n" +
      "- On a roll with Hope, deal **d6+1** magic damage using your Proficiency. " +
      "On a roll with Fear, deal **d10+1** magic damage using your Proficiency.\n" +
      "- The target’s next successful attack deals half damage.\n" +
      "\n" +
      "On a failure, you must **spend a Hope** or **mark a Stress**.",
  ),

  spell(
    "Umbral Veil",
    1,
    1,
    "Once per rest, you can **mark a Stress** to encase yourself in shadowy energy. " +
      "When you do, place a number of tokens on this card equal to the number of Fear " +
      "in the GM’s pool. After an attack roll is made against you, you can spend any " +
      "number of tokens to give the result a −1 penalty per token spent.\n" +
      "\n" +
      "At the end of the scene, clear all unspent tokens.",
  ),

  spell(
    "Voice of Dread",
    1,
    0,
    "You can magically speak to a creature you can see, tormenting them with your words. " +
      "Make a **Spellcast Roll** against them. On a success, they must **mark a Stress** " +
      "and are frozen with terror, making them temporarily _Restrained_.",
  ),

  /* ── level 2 ─────────────────────────────────────────────────────── */

  spell(
    "Hideous Retribution",
    2,
    2,
    "When an ally within Close range takes damage from a target you can see, you can make " +
      "a reaction roll against the target using your Spellcast trait. On a success, " +
      "**mark a Stress** to deal **d6** magic damage using your Proficiency.",
  ),

  spell(
    "Siphon Essence",
    2,
    1,
    "Make a **Spellcast Roll** against a target within Very Close range. Once per long rest " +
      "on a success, the target takes **d12+4** magic damage using your Proficiency. On a " +
      "success with Fear, you gain a +1 bonus to your Proficiency for this attack.\n" +
      "\n" +
      "You clear a number of Hit Points equal to the number of Hit Points the target marked " +
      "from this attack.",
  ),

  /* ── level 3 ─────────────────────────────────────────────────────── */

  spell(
    "Shared Trauma",
    3,
    1,
    "You can transfer suffering from one creature to another. Once per rest, mark any number " +
      "of Hit Points on a willing creature within Melee range to clear an equal number of " +
      "Hit Points on another willing creature within Melee range.",
  ),

  spell(
    "Terrify",
    3,
    1,
    "Make a **Spellcast Roll** against a target within Close range. On a success, the target " +
      "marks **1d4** Stress, and you can make the target flee one range away from you (such as " +
      "Very Close to Close or Close to Far). On a success with Fear, the target also becomes " +
      "temporarily _Vulnerable_.",
  ),

  /* ── level 4 ─────────────────────────────────────────────────────── */

  spell(
    "Chains of Affliction",
    4,
    2,
    "**Mark 2 Stress** to temporarily _Chain_ a target within Close range. When a _Chained_ " +
      "creature deals damage, the target of their attack marks one fewer Hit Point than they " +
      "normally would. You can’t have more than one creature _Chained_ at a time.",
  ),

  spell(
    "Summon Horror",
    4,
    2,
    "**Mark a Stress** to summon an otherworldly creature that deals **d8+1** magic damage " +
      "using your Spellcast trait to a target within Far range. If the target marks any Hit " +
      "Points from this attack, they must succeed on a **Reaction Roll (12)** to steel " +
      "themselves against the horror or mark an equal number of Stress.\n" +
      "\n" +
      "After making the attack, the creature dissipates.",
  ),

  /* ── level 5 ─────────────────────────────────────────────────────── */

  spell(
    "Dire Strike",
    5,
    2,
    "When a target marks any number of Hit Points from an attack you make, you can " +
      "**spend a Hope** to drain power from them. The GM loses a Fear.",
  ),

  spell(
    "Spectral Mist",
    5,
    0,
    "**Spend 2 Hope** to conjure an eerie mist that turns you and allies of your choice within " +
      "Close range momentarily incorporeal. While a creature is incorporeal, they can move " +
      "through solid objects and are immune to physical damage. They become corporeal again " +
      "after they pass through a solid object or make an action roll. Otherwise, this effect " +
      "lasts until the end of the scene.",
  ),

  /* ── level 6 ─────────────────────────────────────────────────────── */

  spell(
    "Darkfire",
    6,
    2,
    "Spend any number of Hope to target an equal number of adversaries within Close range. " +
      "Each target makes a **Reaction Roll (15)**. Targets who fail take **d8+6** magic damage " +
      "using your Spellcast trait as they are engulfed in dark fire. Targets who succeed take " +
      "half damage.",
  ),

  spell(
    "Jump Scare",
    6,
    1,
    "When you deal magic damage to a target, you can **mark a Stress** to teleport into Melee " +
      "range with them. When you do, they are _Vulnerable_ until they mark 1 or more Hit Points.",
  ),

  /* ── level 7 ─────────────────────────────────────────────────────── */

  ability(
    "Dread-Touched",
    7,
    2,
    "When 4 or more of the domain cards in your loadout are from the Dread domain, gain the " +
      "following benefits:\n" +
      "\n" +
      "- When you succeed with Fear, you can **mark 2 Stress** to prevent the GM from gaining a Fear.\n" +
      "- Once per rest when making an action roll, you can gain a bonus to the roll equal to the " +
      "number of Fear in the GM’s pool.",
  ),

  spell(
    "Wall of Hunger",
    7,
    2,
    "Make a **Spellcast Roll (10)**. On a success, you can **spend a Hope** to create a visible " +
      "wall of writhing necrotic energy between two points within Far range. The wall lasts until " +
      "you mark a Hit Point or cast this spell again. A creature inside the wall when it appears " +
      "or that passes through it must **mark 2 Stress**.",
  ),

  /* ── level 8 ─────────────────────────────────────────────────────── */

  spell(
    "Dark Army",
    8,
    2,
    "Make a **Spellcast Roll (14)**. Once per long rest on a success, you can summon fiends that " +
      "surround and move with you. Place 8 tokens on this card. When you deal damage to a target " +
      "within Very Close range, you can spend any number of tokens to add **1d8** for each token " +
      "spent to your damage roll. Additionally, when you take damage, you can spend any number of " +
      "tokens to reduce the damage by **1d8** for each token spent. Each time you spend a token, " +
      "a fiend acts on your behalf, then disappears.\n" +
      "\n" +
      "When you take a rest, clear all unspent tokens.",
  ),

  spell(
    "Eldritch Flesh",
    8,
    1,
    "Gain a +1 bonus to your damage thresholds for each Stress you have marked.\n" +
      "\n" +
      "Additionally, when you roll with Fear, you can **spend 2 Hope** to clear an Armor Slot.",
  ),

  /* ── level 9 ─────────────────────────────────────────────────────── */

  spell(
    "Damnation",
    9,
    2,
    "Make a **Spellcast Roll** against a target within Far range. On a success, mark any number " +
      "of Stress to roll an equal number of **d20s**, dealing magic damage equal to the total " +
      "result. If this attack defeats the target, all adversaries within Far range of the target " +
      "must **mark a Stress**.",
  ),

  spell(
    "Savor the Anguish",
    9,
    1,
    "When an adversary within Close range takes Severe damage, you can clear a Stress.",
  ),

  /* ── level 10 ────────────────────────────────────────────────────── */

  spell(
    "Avatar of Terror",
    10,
    2,
    "**Mark a Stress** to transform into a creature fueled by fear. While in this form, you gain " +
      "a **1d6** bonus to your damage rolls for each Fear in the GM’s pool. Additionally, you gain " +
      "a Hope when the GM spends a Fear to spotlight an adversary within Very Close range.\n" +
      "\n" +
      "Before you make an action roll, you must **spend a Hope**. If you can’t, you revert to your " +
      "normal form.",
  ),

  spell(
    "Invoke Torment",
    10,
    2,
    "You deal double damage to targets that have all their Stress marked.\n" +
      "\n" +
      "Additionally, when an adversary within Close range is defeated with all its Stress marked, " +
      "you gain a Hope.",
  ),
];
