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
 * ── the one thing that makes these decks different ────────────────────
 * **Every use costs the GM a Fear, so a usage limit is double-charging.**
 * That is the whole design. The printed corpus gates 31% of its 210 cards
 * once per rest, long rest or session; a Fear-taxed deck that also gated four
 * cards in five — which these did, at 81% — ends up *weaker* than print while
 * also strangling the Fear economy the frame is built on. Nineteen of the 42
 * are gated now, and every one of them is a card whose effect reshapes a whole
 * scene. Everything else is repeatable and priced in Fear.
 *
 * So the shape of a Root or Void card is: **no usage limit, a real resource
 * cost, and a lead over the best printed card at or below its level.** That
 * lead is the brief — *ahead by one tier, through capability rather than
 * arithmetic* — and `check-marked.mjs`'s `LEADS` block records it per card and
 * fails the build when a card cannot name one.
 *
 * ── what each deck owns mechanically ──────────────────────────────────
 * Threads are the thematic axis; these are the mechanical ones, and they are
 * the reason the decks do not read as recoloured printed domains.
 *
 * **Void takes Fear out of the GM's pool.** Reckoning buys one back for a
 * Stress and Geometry of Ruin takes one out for every target that fails — two
 * cards in 21, where print does it on three in 210 (Know Thy Enemy, Dire
 * Strike, Night Terror). Cold Solution reads the pool on top of that, sizing
 * its tokens off whatever is left in it.
 *
 * Widen it to every card that engages the pool as a quantity and it is five in
 * 21 against eight in 210. Both figures come from **one predicate applied to
 * both corpora**, which `marked-rules.mjs` exports and
 * `tools/check-marked-rules.mjs` ratchets as a set in both directions. That
 * machinery exists because this paragraph was written wrong three times the
 * same way: counting print's movers against our readers, which invents a
 * density ratio out of two defensible numbers. The duality dice and the
 * "until the GM spends a Fear on their turn" duration are out on both sides.
 *
 * Two cards that look like they belong in that count are outside it on
 * purpose. The Answer gives the GM three Fear, but that is the frame's own
 * cost tripled rather than the card reaching into the pool, and No More
 * Waiting does the same on the other deck. Void-Touched refuses to feed the
 * pool, and so does Root-Touched in the same words, so that is the `-Touched`
 * pattern rather than this deck's. What is left is the operation print itself
 * treats as rare: reading or removing what is in the pool.
 *
 * **Root converts harm into fuel.** Feed turns a Melee hit into a cleared Hit
 * Point and a Hope, Apex pays a Hit Point per kill, Barkskin and The Beast buy
 * scene-long force with Stress up front, and the World Tree empties the whole
 * party's sheet once. The Dreaming Root pays Stress for the Undergrowth's
 * memory and keeps that memory on a card as tokens.
 *
 * ── what the printed corpus actually does, measured ───────────────────
 * All four of these were re-measured off the 210 printed cards, and two of
 * them overturned a rule this module used to assert.
 *
 * **Single-target damage scales; area damage is flat.** Of the 15 printed
 * single-target damage cards, 10 write `using your Proficiency` or `using your
 * Spellcast trait`; of the 5 flat ones, 4 are costed and exactly one —
 * `Cinder Grasp`, Arcana level 2, `1d20+3` — is unlimited. Area cards are the
 * opposite: flat dice are the norm. The old rule here said *every* printed
 * flat-damage card is gated, which is false, and it is what pushed Hungry Fire
 * and Crush onto Proficiency scaling and then pinned them to the printed
 * baseline instead of a tier above it. They still scale, because that is the
 * real convention for single-target damage, but they lead on their riders now.
 *
 * **The flat-damage ceiling, by shape and save class.** Single-target no-save
 * tops out at 13.5 and never rises past level 2, because every higher
 * single-target card scales. Area no-save tops out at 29 (`Tempest`, level
 * 10). Area save-for-half tops out at 47 (`Stunning Sunlight`, level 8). The
 * old note here read the area ceiling as 30 off `Ground Pound` and pulled The
 * Undergrowth Wakes down from 34 to 27.5 for nothing; 34 is restored.
 *
 * **Area damage above level 4 offers a Reaction Roll and halves** — with two
 * printed exceptions, both at level 10 (`Falling Sky`, `Tempest`). Treated as
 * a rule here anyway: the exceptions are the top of the book and we are not.
 *
 * **Recall 3 and 4 sit no lower than level 4 in print.** Here they sit no
 * lower than 8.
 *
 * ── two levers print uses that these decks used to skip ───────────────
 * **Tokens.** The Homebrew Kit allows one token card per domain and the
 * printed domains lean on them hard (Unleash Chaos, Strategic Approach,
 * Inspirational Words, Zone of Protection, Dark Army, Fane of the Wilds). The
 * decks had none. Now each has exactly one: Cold Solution for Void, Deep
 * Dreaming for Root.
 *
 * **"Place this card in your vault."** Print's lever for its biggest effects.
 * Disjunction uses it as the price of overreaching.
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
const touched = (domain) => {
  const Name = domain[0].toUpperCase() + domain.slice(1);
  return card(
    `${Name}-Touched`,
    domain,
    "both",
    7,
    "ability",
    2,
    `When 4 or more of the domain cards in your loadout are from the ${Name} domain, ` +
      "gain the following benefits:\n" +
      "\n" +
      "- **+1** bonus to your Spellcast Rolls.\n" +
      `- Once per rest, when you use a ${Name} card, the GM doesn't gain a Fear and you ` +
      "don't gain a Mark.",
  );
};

export default [
  /* ══ VOID ═══════════════════════════════════════════════════════════
     *The domain of the void between stars.* Two threads: **Unmaking** ends,
     suppresses, erases and folds space — ground no printed domain holds, and
     deliberately kept off Dread's, which frightens you where this solves you.
     **Calculation** treats force and minds as systems to be acted on from a
     distance, and it is where the deck reaches into the Fear pool. */

  /* ── level 1 ─────────────────────────────────────────────────────── */

  V(
    "Excise",
    "Unmaking",
    1,
    "spell",
    1,
    "Make a **Spellcast Roll (13)**. On a success, end one temporary condition or " +
      "temporary effect on a target within Far range.\n" +
      "\n" +
      "**Mark a Stress** to instead end an effect that would otherwise be cleared only " +
      "by meeting a specific requirement. Excise can't end a permanent condition or a " +
      "Mark.",
  ),

  V(
    "Null Grip",
    "Calculation",
    1,
    "spell",
    1,
    "Make a **Spellcast Roll** against a target within Far range. On a success, they " +
      "take **d10+3** magic damage using your Proficiency.\n" +
      "\n" +
      "**Spend a Hope** to also lock geometric force around them, leaving them " +
      "temporarily _Restrained_.",
  ),

  V(
    "Reckoning",
    "Calculation",
    1,
    "ability",
    0,
    "Solve a target within Far range. Ask the GM two of the following about them: " +
      "their Difficulty, their damage thresholds, their unmarked Hit Points, or their " +
      "standard attack damage dice.\n" +
      "\n" +
      "**Mark a Stress** to remove a Fear from the GM's Fear Pool.",
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
    "**Spend a Hope** and make a **Spellcast Roll** against all targets within Close " +
      "range. Targets you succeed against take **2d8+5** magic damage and are pulled into " +
      "Very Close range of you.",
  ),

  /* ── level 3 ─────────────────────────────────────────────────────── */

  V(
    "Silence the Song",
    "Unmaking",
    3,
    "spell",
    1,
    "**Spend a Hope** and make a **Spellcast Roll** against a target within Close " +
      "range. On a success, they're temporarily _Silenced_. While _Silenced_, they can't " +
      "make noise and can't cast spells.",
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

  /* Void's one token card, and the pool is the tokens. `Umbral Veil` (Dread
     level 1) is the printed precedent for reading the Fear pool's size into
     tokens; this spends them on the party's dice instead of its own defence,
     which is the whole difference between Dread and Void. */
  V(
    "Cold Solution",
    "Calculation",
    4,
    "ability",
    1,
    "At the beginning of a session, place a number of tokens on this card equal to the " +
      "number of Fear in the GM's Fear Pool (minimum 1).\n" +
      "\n" +
      "When an ally within Far range fails an action roll, you can spend a token from " +
      "this card to state the error aloud. They reroll their Fear Die. Spend two tokens " +
      "to let them reroll both dice instead.\n" +
      "\n" +
      "**Mark a Stress** to place a token on this card. At the end of each session, clear " +
      "all unspent tokens.",
  ),

  V(
    "Unmake",
    "Unmaking",
    4,
    "spell",
    2,
    "**Mark a Stress** and make a **Spellcast Roll (15)**. On a success, an object " +
      "within Far range that isn't held or worn ceases to exist. If it was holding " +
      "something up, the GM describes what falls.",
  ),

  /* ── level 5 ─────────────────────────────────────────────────────── */

  V(
    "Crush",
    "Calculation",
    5,
    "spell",
    1,
    "Make a **Spellcast Roll** against a target within Far range. On a success, they " +
      "take **d12+4** magic damage using your Proficiency and temporarily gain a **−2** " +
      "penalty to their damage thresholds. You can **mark a Stress** to make that penalty " +
      "last until your next rest instead.",
  ),

  V(
    "The Hollow Note",
    "Unmaking",
    5,
    "spell",
    2,
    "Once per long rest, make a **Spellcast Roll (15)**. On a success, everything " +
      "within Very Close range of a point within Far range becomes a stationary zone " +
      "where magic doesn't function. Spells and magical features fail inside it, " +
      "including yours. It lasts until your next rest.",
  ),

  /* ── level 6 ─────────────────────────────────────────────────────── */

  V(
    "Elsewhere",
    "Unmaking",
    6,
    "spell",
    2,
    "Make a **Spellcast Roll** against up to three targets within Close range. Targets " +
      "you succeed against are teleported to a point within Far range you can see.\n" +
      "\n" +
      "**Spend a Hope** to leave them temporarily _Vulnerable_ where they land.",
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
    "Once per long rest, make a **Spellcast Roll (16)** against all targets within " +
      "Close range. Targets you succeed against lose the last minute entirely, including " +
      "any memory that you were there. The next time each of them is spotlighted, they " +
      "can't target you.\n" +
      "\n" +
      "This fails against a target who has marked Hit Points from you this scene.",
  ),

  touched("void"),

  /* ── level 8 ─────────────────────────────────────────────────────── */

  V(
    "Geometry of Ruin",
    "Calculation",
    8,
    "spell",
    3,
    "Once per long rest, make a **Spellcast Roll** against all targets within Far " +
      "range. Targets you succeed against must make a **Reaction Roll (16)**. Targets who " +
      "fail take **4d12+8** magic damage. Targets who succeed take half damage.\n" +
      "\n" +
      "The GM loses a Fear for each target that fails.",
  ),

  V(
    "Sever",
    "Unmaking",
    8,
    "spell",
    2,
    "Once per rest, make a **Spellcast Roll (16)**. On a success, name a feature " +
      "you've seen an adversary within Far range use. They can't use it until your next " +
      "rest.",
  ),

  /* ── level 9 ─────────────────────────────────────────────────────── */

  V(
    "Chariot of Thought",
    "Calculation",
    9,
    "spell",
    2,
    "**Spend a Hope** to conjure a disk of crystalline force. You and up to five " +
      "creatures on it can fly anywhere within Very Far range until the scene ends.\n" +
      "\n" +
      "Attacks made against a creature on the disk from beyond Close range have " +
      "disadvantage.",
  ),

  V(
    "Disjunction",
    "Unmaking",
    9,
    "spell",
    4,
    "Once per long rest, make a **Spellcast Roll (18)**. On a success, choose an " +
      "adversary within Far range whose Difficulty is 20 or lower and **mark 2 Stress**. " +
      "It's unmade and can't be returned by any means.\n" +
      "\n" +
      "If the adversary's Difficulty is higher than 20, the spell fails and you place " +
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
      "benefit from magical effects. This includes you.\n" +
      "\n" +
      "An ally within Far range can **mark 2 Stress** to be exempt.",
  ),

  /* The pair of extra-action capstones is the one thing no printed card does
     anywhere in 210, so both decks get one — but not the same one. Void's
     fires off a success, because Calculation already knew. Root's fires off
     damage dealt, because Hunger does not stop. */
  V(
    "The Answer",
    "Calculation",
    10,
    "ability",
    4,
    "Once per long rest, immediately after you succeed on an action roll, you can take " +
      "an additional action. When you do, you gain **3 Mark** instead of 1 and the GM " +
      "gains **3 Fear** instead of 1.",
  ),

  /* ══ ROOT ═══════════════════════════════════════════════════════════
     *The domain of the sleeping thing below.* Two threads: **Hunger** is
     claws, bark and fire that hunts — one appetite in three shapes, and where
     the deck turns harm into fuel. **The Dreaming Root** is the Undergrowth's
     memory leaking up, unclaimed by any printed domain. */

  /* ── level 1 ─────────────────────────────────────────────────────── */

  R(
    "Barkskin",
    "Hunger",
    1,
    "ability",
    1,
    "**Mark a Stress** to harden. Until your next rest, gain a **+2** bonus to your " +
      "damage thresholds, and your unarmed attacks deal **d8+1** physical damage using " +
      "your Proficiency.",
  ),

  R(
    "Glimpse the Hunt",
    "The Dreaming Root",
    1,
    "spell",
    0,
    "Ask the Undergrowth one question about something that happened where you stand. " +
      "The GM answers truthfully, but the answer arrives as an image rather than a " +
      "sentence.\n" +
      "\n" +
      "**Mark a Stress** to ask a second question.",
  ),

  R(
    "Hungry Fire",
    "Hunger",
    1,
    "spell",
    1,
    "Make a **Spellcast Roll** against a target within Close range. On a success, they " +
      "take **d8+2** magic damage using your Proficiency.\n" +
      "\n" +
      "**Spend a Hope** to set the fire in them, leaving them temporarily _Ablaze_. An " +
      "_Ablaze_ creature takes an extra **2d6** magic damage each time it's spotlighted.",
  ),

  /* ── level 2 ─────────────────────────────────────────────────────── */

  R(
    "The Pack Knows",
    "The Dreaming Root",
    2,
    "ability",
    1,
    "When an ally within Far range makes an action roll, you can **spend a Hope** to " +
      "add your Instinct to their roll. You don't need to be able to see or hear them.",
  ),

  /* Deliberately not Weight of the Void with different dice. That one gathers
     the room into one place; this one leaves something behind, because Root
     grows and Void subtracts. */
  R(
    "Thorn Spray",
    "Hunger",
    2,
    "spell",
    1,
    "**Mark a Stress** and make a **Spellcast Roll** against all targets within Very " +
      "Close range. Targets you succeed against take **2d8+3** physical damage.\n" +
      "\n" +
      "The thorns remain until your next rest. A creature that enters or acts within " +
      "Very Close range of you takes **1d8** physical damage.",
  ),

  /* ── level 3 ─────────────────────────────────────────────────────── */

  R(
    "Amber",
    "The Dreaming Root",
    3,
    "spell",
    2,
    "Once per rest, make a **Spellcast Roll (14)** against a target within Close " +
      "range. On a success, they're held outside of time — they can't act and can't be " +
      "damaged. This lasts until you release them, you take Major damage, or the GM " +
      "spends a Fear on their turn to end it.",
  ),

  R(
    "The Beast",
    "Hunger",
    3,
    "ability",
    1,
    "**Mark a Stress** to give in. Until the scene ends, gain a **+1** bonus to your " +
      "attack rolls and a **d6** bonus to your damage rolls, and you can't willingly move " +
      "away from the nearest adversary.",
  ),

  /* ── level 4 ─────────────────────────────────────────────────────── */

  R(
    "Rend",
    "Hunger",
    4,
    "ability",
    1,
    "**Spend a Hope.** Your next successful attack this scene deals an extra " +
      "**1d12+3** damage, and the target temporarily gains a **−1** penalty to their " +
      "damage thresholds.",
  ),

  R(
    "The Root Remembers",
    "The Dreaming Root",
    4,
    "ability",
    2,
    "Once per long rest, immediately after the GM makes a move in response to a roll " +
      "you made, you can say the Undergrowth had already shown you this. The GM's move is " +
      "rescinded as though it never happened, and they make a different one instead.",
  ),

  /* ── level 5 ─────────────────────────────────────────────────────── */

  R(
    "Regrow",
    "The Dreaming Root",
    5,
    "spell",
    1,
    "Make a **Spellcast Roll (14)**. On a success, **mark a Stress** to clear **2 Hit " +
      "Points** on yourself or an ally within Close range, and that target clears one " +
      "temporary condition.",
  ),

  R(
    "Wildfire",
    "Hunger",
    5,
    "spell",
    2,
    "Once per long rest, make a **Spellcast Roll (15)**. On a success, fire takes hold " +
      "at a point within Far range. All targets within Close range of it must make a " +
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
    "**Mark a Stress** and roar. Until the scene ends, allies within Far range gain a " +
      "**+1** bonus to attack rolls and can't be _Horrified_, and adversaries within " +
      "Close range of you when you roar gain a **−1** penalty to their Difficulty until " +
      "the scene ends.",
  ),

  /* Root's one token card. The tokens are how much the Undergrowth still
     remembers; Stress is what it costs to make it remember more. */
  R(
    "Deep Dreaming",
    "The Dreaming Root",
    6,
    "spell",
    2,
    "After a long rest, place a number of tokens on this card equal to your Instinct " +
      "(minimum 1).\n" +
      "\n" +
      "Spend a token and make a **Spellcast Roll (15)**. On a success, you sleep for a " +
      "minute and wake knowing the answer to one question about a person, place, or thing " +
      "that has stood on soil. The Undergrowth's memory is long and does not know the " +
      "present.\n" +
      "\n" +
      "**Mark 2 Stress** to place a token on this card. When you take a long rest, clear " +
      "all unspent tokens.",
  ),

  /* ── level 7 ─────────────────────────────────────────────────────── */

  R(
    "Bloom",
    "Hunger",
    7,
    "spell",
    2,
    "Once per rest, make a **Spellcast Roll (16)** against all targets within Far " +
      "range. Targets you succeed against must make a **Reaction Roll (15)**. Targets who " +
      "fail take **4d8+5** physical damage. Targets who succeed take half damage.\n" +
      "\n" +
      "All terrain within Far range becomes difficult to move through until your next " +
      "rest.",
  ),

  touched("root"),

  /* ── level 8 ─────────────────────────────────────────────────────── */

  R(
    "Feed",
    "Hunger",
    8,
    "ability",
    2,
    "When you deal damage to a target within Melee range, you can **mark a Stress** to " +
      "clear a Hit Point. If that damage defeated the target, gain a Hope as well.",
  ),

  R(
    "The Long Memory",
    "The Dreaming Root",
    8,
    "spell",
    3,
    "Once per long rest, make a **Spellcast Roll** against a target within Far range. " +
      "On a success, they experience every death they've caused and must make a " +
      "**Reaction Roll (16)**. On a failure, they mark **4 Hit Points** and are " +
      "permanently _Horrified_. On a success, they mark **2 Hit Points** and are " +
      "temporarily _Horrified_.",
  ),

  /* ── level 9 ─────────────────────────────────────────────────────── */

  R(
    "Apex",
    "Hunger",
    9,
    "ability",
    3,
    "Once per long rest, **mark 2 Stress** to become what it wants. Until the scene " +
      "ends, your attacks deal an extra **d12** damage, you clear a Hit Point whenever " +
      "you defeat an adversary, and you can't use features that require speech.",
  ),

  R(
    "The Undergrowth Wakes",
    "The Dreaming Root",
    9,
    "spell",
    3,
    "Once per long rest, make a **Spellcast Roll (18)**. On a success, the ground opens " +
      "within Very Far range. All targets in the area must make a **Reaction Roll (18)**. " +
      "Targets who fail take **4d12+8** physical damage and are temporarily _Restrained_. " +
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
    "Once per long rest, immediately after you deal damage to an adversary, you can " +
      "take an additional action. When you do, you gain **3 Mark** instead of 1 and the " +
      "GM gains **3 Fear** instead of 1.",
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
