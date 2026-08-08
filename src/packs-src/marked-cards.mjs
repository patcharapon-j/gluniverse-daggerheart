/**
 * The Root and Void decks — *The Twilight Marked*, forty-two cards.
 *
 * ── what these are ────────────────────────────────────────────────────
 * A **campaign frame's** two domains, not the game's. Nobody's class carries
 * them: every Batch 47 PC has both decks in their vault from session one, on
 * top of the two their class gives them. The mark is the casting organ, so a
 * Root card casts with Instinct and a Void card with Knowledge regardless of
 * what the character's own Spellcast trait is — or whether they have one.
 *
 * The frame's rules — Mark, the Fear a use costs, the long-rest roll, the toll
 * for holding both decks — are in `src/module/marked.ts`. This module is the
 * cards.
 *
 * ── why it is hand-authored ───────────────────────────────────────────
 * `dread-cards.mjs`'s reason, one step further out. Dread has no upstream
 * because the Card Creator publishes the corebook and Dread is *Hope and
 * Fear*'s; these have no upstream because nobody published them at all. So
 * `tools/check-cards.mjs` cannot audit the text — it skips anything this
 * module exports, by construction rather than by a name list — and what
 * replaces that audit is `tools/check-marked.mjs`, which asserts the
 * regularities the *printed* corpus keeps. That is `check-equipment.mjs`'s
 * argument arriving at a deck: when there is nothing to compare a line to, the
 * thing worth checking is whether the line obeys the rules every printed line
 * obeys.
 *
 * ── the balance rule these decks are held to ──────────────────────────
 * Measured off the 231 printed cards rather than asserted:
 *
 * **A repeatable damage card scales with Proficiency; a flat-dice damage card
 * is gated.** Every printed card that deals flat dice pays for it — once per
 * rest (Earthquake), a Hope (Conjure Swarm, Ground Pound), Stress (Chain
 * Lightning, Falling Sky) — and every printed card that can be cast again and
 * again for nothing writes its damage as `dN+M using your Proficiency` (Rain
 * of Blades, Corrosive Projectile, Blighting Strike, Fireball). Two cards here
 * broke it and are fixed: Hungry Fire and Crush now scale.
 *
 * **High-level area damage takes a Reaction Roll and halves on a success.**
 * Below about level 5 the printed idiom is "make a Spellcast Roll against all
 * targets; targets you succeed against take damage" (Shadowbind, Conjure
 * Swarm). At the top it is always a save-for-half (Ground Pound, Earthquake,
 * Stunning Sunlight, Fireball, Wall of Flame). Four cards here were using the
 * low-level template with top-of-the-book numbers.
 *
 * **The level 10 ceiling holds.** The largest area damage in print is 30
 * average (Ground Pound, level 8) and the largest at level 10 is 29. Nothing
 * here exceeds it: The Undergrowth Wakes went from 34 to 27.5.
 *
 * *Ahead by one tier, through capability rather than through arithmetic* is
 * still the brief. It is spent on doing things no printed card does — ending
 * an effect at level 1, unmaking an object, taking a second action — and not
 * on bigger dice.
 *
 * ── deck shape ────────────────────────────────────────────────────────
 * Three cards at level 1 and two at every level after, which is what all
 * eleven other decks do. Order is by level, then alphabetical within a level.
 */

import { domainIcon } from "./_helpers.mjs";

/**
 * One card.
 *
 * No `art`, and that is the equipment tables' finding rather than a shortcut:
 * nobody painted these, so every one falls through to its domain sigil exactly
 * as a weapon falls through to its type glyph. `img` is per document, so art
 * drops in later with nothing else changing. `artist` and `cardId` are empty
 * because there is no printed set — the *frame* is named on the card instead,
 * by `sheets/cards.ts`, which writes `TM·ROOT` into the footer's right cell.
 *
 * `thread` is the campaign's own axis and is deliberately not in `system`: the
 * schema's closed sets are the game's, a thread is two words of authorial
 * intent, and `tools/check-marked.mjs` is the only thing that reads it.
 */
const card = (name, domain, thread, level, type, recall, text) => ({
  name,
  domain,
  thread,
  level,
  cardType: type,
  recall,
  art: "",
  artist: "",
  cardId: "",
  text,
});

const V = (name, thread, level, type, recall, text) =>
  card(name, "void", thread, level, type, recall, text);
const R = (name, thread, level, type, recall, text) =>
  card(name, "root", thread, level, type, recall, text);

/** The `-Touched` pair. One card, two decks, one argument — so it is written
    once. Both printed `-Touched` cards give a loadout-conditional bonus and
    one small economy break; ours breaks the frame's own economy instead of the
    game's, which is the only thing a campaign domain has that is worth
    breaking. */
const touched = (domain) =>
  card(
    `${domain[0].toUpperCase()}${domain.slice(1)}-Touched`,
    domain,
    "both",
    7,
    "ability",
    2,
    `When 4 or more of the domain cards in your loadout are from the ${
      domain[0].toUpperCase() + domain.slice(1)
    } domain, gain the following benefits:\n` +
      "\n" +
      "- **+1** bonus to your Spellcast Rolls.\n" +
      `- Once per rest, when you use a ${
        domain[0].toUpperCase() + domain.slice(1)
      } card, you don't gain a Mark and the GM doesn't gain a Fear.`,
  );

export default [
  /* ══ VOID ═══════════════════════════════════════════════════════════
     *The domain of the void between stars.* Two threads: **Unmaking** ends,
     suppresses, erases and folds space — ground no printed domain holds, and
     deliberately kept off Dread's, which frightens you where this solves you.
     **Calculation** treats force and minds as systems to be acted on from a
     distance. */

  /* ── level 1 ─────────────────────────────────────────────────────── */

  V(
    "Excise",
    "Unmaking",
    1,
    "spell",
    1,
    "Once per rest, make a **Spellcast Roll (13)**. On a success, end one temporary " +
      "condition or ongoing magical effect on a target within Far range, regardless of " +
      "what created it.",
  ),

  V(
    "Null Grip",
    "Calculation",
    1,
    "spell",
    1,
    "Once per rest, make a **Spellcast Roll** against a target within Close range. On a " +
      "success, they take **2d8** magic damage and are temporarily _Restrained_ as " +
      "geometric force locks around them.",
  ),

  V(
    "Reckoning",
    "Calculation",
    1,
    "ability",
    0,
    "**Mark a Stress** to solve a target within Far range. Ask the GM one of the " +
      "following about them: their Difficulty, their damage thresholds, or their " +
      "unmarked Hit Points.",
  ),

  /* ── level 2 ─────────────────────────────────────────────────────── */

  V(
    "Fold",
    "Unmaking",
    2,
    "spell",
    1,
    "**Spend a Hope** and make a **Spellcast Roll (13)**. On a success, you and any " +
      "willing creatures you're touching teleport to a point within Far range you can see.",
  ),

  V(
    "Weight of the Void",
    "Calculation",
    2,
    "spell",
    1,
    "Once per rest, make a **Spellcast Roll** against all targets within Close range. " +
      "Targets you succeed against take **2d8+4** magic damage and are pulled into Very " +
      "Close range of you.",
  ),

  /* ── level 3 ─────────────────────────────────────────────────────── */

  V(
    "Silence the Song",
    "Unmaking",
    3,
    "spell",
    1,
    "Once per rest, make a **Spellcast Roll** against a target within Close range. On a " +
      "success, they're temporarily _Silenced_. While _Silenced_, they can't make noise " +
      "and can't cast spells.",
  ),

  V(
    "Vector",
    "Calculation",
    3,
    "spell",
    1,
    "**Spend a Hope** and make a **Spellcast Roll** against a target within Far range. " +
      "On a success, move them up to Close range in any direction, including up. If they " +
      "end that movement in the air, they fall and take **1d10** physical damage for each " +
      "range increment fallen.",
  ),

  /* ── level 4 ─────────────────────────────────────────────────────── */

  V(
    "Cold Solution",
    "Calculation",
    4,
    "ability",
    1,
    "Once per rest, when an ally within Far range fails an action roll, you can state " +
      "the error aloud. They reroll their Fear Die. You can **mark a Stress** to let them " +
      "reroll both dice instead.",
  ),

  V(
    "Unmake",
    "Unmaking",
    4,
    "spell",
    2,
    "Once per long rest, make a **Spellcast Roll (15)**. On a success, an object within " +
      "Far range that isn't held or worn ceases to exist. If it was holding something up, " +
      "the GM describes what falls.",
  ),

  /* ── level 5 ─────────────────────────────────────────────────────── */

  V(
    "Crush",
    "Calculation",
    5,
    "spell",
    1,
    "Make a **Spellcast Roll** against a target within Far range. On a success, they " +
      "take **d12+4** magic damage using your Proficiency. You can **mark a Stress** to " +
      "also give them a **−2** penalty to their damage thresholds until your next rest.",
  ),

  V(
    "The Hollow Note",
    "Unmaking",
    5,
    "spell",
    2,
    "Once per long rest, make a **Spellcast Roll (15)**. On a success, everything within " +
      "Very Close range of a point within Far range becomes a stationary zone where magic " +
      "doesn't function. Spells and magical features fail inside it, including yours. It " +
      "lasts until your next rest.",
  ),

  /* ── level 6 ─────────────────────────────────────────────────────── */

  V(
    "Elsewhere",
    "Unmaking",
    6,
    "spell",
    2,
    "Once per rest, make a **Spellcast Roll** against up to three targets within Close " +
      "range. Targets you succeed against are teleported to a point within Far range you " +
      "can see and are temporarily _Vulnerable_.",
  ),

  V(
    "Solve",
    "Calculation",
    6,
    "ability",
    2,
    "Once per long rest, before you make an action roll, declare that you've already " +
      "worked it out. Treat your Hope Die as though it rolled a 12.",
  ),

  /* ── level 7 ─────────────────────────────────────────────────────── */

  V(
    "Erasure",
    "Unmaking",
    7,
    "spell",
    2,
    "Once per long rest, make a **Spellcast Roll (16)** against a target within Far " +
      "range. On a success, they lose the last minute entirely, including any memory that " +
      "you were there. This fails against a target who has marked Hit Points from you " +
      "this scene.",
  ),

  touched("void"),

  /* ── level 8 ─────────────────────────────────────────────────────── */

  V(
    "Geometry of Ruin",
    "Calculation",
    8,
    "spell",
    3,
    "Once per long rest, make a **Spellcast Roll** against all targets within Far range. " +
      "Targets you succeed against must make a **Reaction Roll (16)**. Targets who fail " +
      "take **4d10+6** magic damage. Targets who succeed take half damage.\n" +
      "\n" +
      "The GM loses a Fear for each target that fails.",
  ),

  V(
    "Sever",
    "Unmaking",
    8,
    "spell",
    2,
    "Once per rest, make a **Spellcast Roll (16)**. On a success, name a feature you've " +
      "seen an adversary within Far range use. They can't use it until your next rest.",
  ),

  /* ── level 9 ─────────────────────────────────────────────────────── */

  V(
    "Chariot of Thought",
    "Calculation",
    9,
    "spell",
    2,
    "Once per rest, **spend a Hope** to conjure a disk of crystalline force. You and up " +
      "to five creatures on it can fly anywhere within Very Far range until the scene ends.",
  ),

  V(
    "Disjunction",
    "Unmaking",
    9,
    "spell",
    4,
    "Once per long rest, make a **Spellcast Roll (18)**. On a success, choose an " +
      "adversary within Far range whose Difficulty is 16 or lower. It's unmade and can't " +
      "be returned by any means.\n" +
      "\n" +
      "If the adversary's Difficulty is higher than 16, the spell fails and you place " +
      "this card in your vault.",
  ),

  /* ── level 10 ────────────────────────────────────────────────────── */

  V(
    "Second Silence",
    "Unmaking",
    10,
    "spell",
    3,
    "Once per long rest, make a **Spellcast Roll (18)**. On a success, until the scene " +
      "ends, nothing within Far range of you can cast spells, use magical features, or " +
      "benefit from magical effects. Including you. Including your allies.",
  ),

  V(
    "The Answer",
    "Calculation",
    10,
    "ability",
    4,
    "Once per long rest, immediately after you resolve an action, you can take an " +
      "additional action. When you do, you gain **3 Mark** instead of 1 and the GM gains " +
      "**3 Fear** instead of 1.",
  ),

  /* ══ ROOT ═══════════════════════════════════════════════════════════
     *The domain of the sleeping thing below.* Two threads: **Hunger** is claws,
     bark and fire that follows — one appetite in three shapes, which is what
     keeps it off Sage's ground, since Sage grows things and this eats. **The
     Dreaming Root** is the Undergrowth's memory leaking up, and no printed
     domain claims it. */

  /* ── level 1 ─────────────────────────────────────────────────────── */

  R(
    "Barkskin",
    "Hunger",
    1,
    "ability",
    1,
    "Once per rest, **mark a Stress** to harden. Until your next rest, gain a **+2** " +
      "bonus to your damage thresholds, and your unarmed attacks deal **d8+1** physical " +
      "damage using your Proficiency.",
  ),

  R(
    "Glimpse the Hunt",
    "The Dreaming Root",
    1,
    "spell",
    0,
    "**Mark a Stress** to ask the Undergrowth one question about something that happened " +
      "where you stand. The GM answers truthfully, but the answer arrives as an image " +
      "rather than a sentence.",
  ),

  R(
    "Hungry Fire",
    "Hunger",
    1,
    "spell",
    1,
    "Make a **Spellcast Roll** against a target within Close range. On a success, they " +
      "take **d8+2** magic damage using your Proficiency and are temporarily _Ablaze_.\n" +
      "\n" +
      "An _Ablaze_ creature takes an extra **1d8** magic damage the first time it's " +
      "spotlighted in a scene.",
  ),

  /* ── level 2 ─────────────────────────────────────────────────────── */

  R(
    "The Pack Knows",
    "The Dreaming Root",
    2,
    "ability",
    1,
    "When an ally within Far range makes an action roll, you can **spend a Hope** to add " +
      "your Instinct to their roll. You don't need to be able to see or hear them.",
  ),

  R(
    "Thorn Spray",
    "Hunger",
    2,
    "spell",
    1,
    "Once per rest, make a **Spellcast Roll** against all targets within Very Close " +
      "range. Targets you succeed against take **2d8+4** physical damage and temporarily " +
      "gain a **−1** penalty to their Difficulty.",
  ),

  /* ── level 3 ─────────────────────────────────────────────────────── */

  R(
    "Amber",
    "The Dreaming Root",
    3,
    "spell",
    2,
    "Once per rest, make a **Spellcast Roll (14)** against a target within Close range. " +
      "On a success, they're held outside of time — they can't act and can't be damaged. " +
      "This lasts until you release them, you take Major damage, or the GM spends a Fear " +
      "on their turn to end it.",
  ),

  R(
    "The Beast",
    "Hunger",
    3,
    "ability",
    1,
    "Once per rest, **mark a Stress** to give in. Until the scene ends, gain a **+1** " +
      "bonus to your attack rolls and a **d6** bonus to your damage rolls, and you can't " +
      "willingly move away from the nearest adversary.",
  ),

  /* ── level 4 ─────────────────────────────────────────────────────── */

  R(
    "Rend",
    "Hunger",
    4,
    "ability",
    1,
    "**Spend a Hope.** Your next successful attack this scene deals an extra **1d12+3** " +
      "damage, and the target temporarily gains a **−1** penalty to their damage thresholds.",
  ),

  R(
    "The Root Remembers",
    "The Dreaming Root",
    4,
    "ability",
    2,
    "Once per long rest, immediately after the GM makes a move in response to a roll you " +
      "made, you can say the Undergrowth had already shown you this. The GM's move is " +
      "rescinded as though it never happened, and they make a different one instead.",
  ),

  /* ── level 5 ─────────────────────────────────────────────────────── */

  R(
    "Regrow",
    "The Dreaming Root",
    5,
    "spell",
    1,
    "Once per rest, make a **Spellcast Roll (14)**. On a success, clear **2 Hit Points** " +
      "on yourself or an ally within Close range, and that target clears one temporary " +
      "condition.",
  ),

  R(
    "Wildfire",
    "Hunger",
    5,
    "spell",
    2,
    "Once per long rest, make a **Spellcast Roll (15)**. On a success, fire takes hold at " +
      "a point within Far range. All targets within Close range of it must make a " +
      "**Reaction Roll (15)**. Targets who fail take **3d10+4** magic damage and are " +
      "temporarily _Ablaze_. Targets who succeed take half damage.\n" +
      "\n" +
      "The fire hunts. Each time you're spotlighted, it moves Very Close toward the " +
      "nearest creature.",
  ),

  /* ── level 6 ─────────────────────────────────────────────────────── */

  R(
    "Alpha",
    "Hunger",
    6,
    "ability",
    2,
    "Once per rest, **mark a Stress** and roar. Until the scene ends, allies within Far " +
      "range gain a **+1** bonus to attack rolls and can't be _Horrified_, and adversaries " +
      "within Close range of you when you roar gain a **−1** penalty to their Difficulty " +
      "until the scene ends.",
  ),

  R(
    "Deep Dreaming",
    "The Dreaming Root",
    6,
    "spell",
    2,
    "Once per long rest, make a **Spellcast Roll (15)**. On a success, you sleep for a " +
      "minute and wake knowing the answer to one question about a person, place, or thing " +
      "that has stood on soil. The Undergrowth's memory is long and does not know the " +
      "present.",
  ),

  /* ── level 7 ─────────────────────────────────────────────────────── */

  R(
    "Bloom",
    "Hunger",
    7,
    "spell",
    2,
    "Once per rest, make a **Spellcast Roll (16)** against all targets within Far range. " +
      "Targets you succeed against must make a **Reaction Roll (15)**. Targets who fail " +
      "take **4d8+5** physical damage. Targets who succeed take half damage.\n" +
      "\n" +
      "All terrain within Far range becomes difficult to move through until your next rest.",
  ),

  touched("root"),

  /* ── level 8 ─────────────────────────────────────────────────────── */

  R(
    "Feed",
    "Hunger",
    8,
    "ability",
    2,
    "Once per rest, when you deal damage to a target within Melee range, you can **mark " +
      "a Stress** to clear a Hit Point and gain a Hope.",
  ),

  R(
    "The Long Memory",
    "The Dreaming Root",
    8,
    "spell",
    3,
    "Once per long rest, make a **Spellcast Roll** against a target within Far range. On " +
      "a success, they experience every death they've caused and must make a **Reaction " +
      "Roll (16)**. On a failure, they mark **4 Hit Points** and are permanently " +
      "_Horrified_. On a success, they mark **2 Hit Points** and are temporarily " +
      "_Horrified_.",
  ),

  /* ── level 9 ─────────────────────────────────────────────────────── */

  R(
    "Apex",
    "Hunger",
    9,
    "ability",
    3,
    "Once per long rest, **mark 2 Stress** to become what it wants. Until the scene ends, " +
      "your attacks deal an extra **d12** damage, you clear a Hit Point whenever you " +
      "defeat an adversary, and you can't use features that require speech.",
  ),

  R(
    "The Undergrowth Wakes",
    "The Dreaming Root",
    9,
    "spell",
    4,
    "Once per long rest, make a **Spellcast Roll (18)**. On a success, the ground opens " +
      "within Very Far range. All targets in the area must make a **Reaction Roll (18)**. " +
      "Targets who fail take **3d12+8** physical damage and are temporarily _Restrained_. " +
      "Targets who succeed take half damage.\n" +
      "\n" +
      "The terrain is permanently changed.",
  ),

  /* ── level 10 ────────────────────────────────────────────────────── */

  R(
    "No More Waiting",
    "Hunger",
    10,
    "ability",
    4,
    "Once per long rest, immediately after you resolve an action, you can take an " +
      "additional action. When you do, you gain **3 Mark** instead of 1 and the GM gains " +
      "**3 Fear** instead of 1.",
  ),

  R(
    "The World Tree",
    "The Dreaming Root",
    10,
    "spell",
    3,
    "Once per long rest, make a **Spellcast Roll (18)**. On a success, a tree erupts " +
      "within Far range and stands until it's felled. Any creature that touches it clears " +
      "all their Hit Points and Stress. A creature can benefit from the World Tree only " +
      "once.",
  ),
].map((c) => ({ ...c, art: c.art || domainIcon(c.domain) }));
