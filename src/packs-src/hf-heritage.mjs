/**
 * *Hope and Fear*'s six ancestries and six communities.
 *
 * Same rules as `heritage.mjs` — one sentence of flavour, two features named
 * for their position on the card because that position is the mixed-ancestry
 * rule — with one difference that governs everything here.
 *
 * **There is no printed card to follow.** `heritage.mjs` takes its text from
 * the official Card Creator, which publishes the corebook only, so for these
 * twelve the chapter is the only source there is. The corebook cards turn out
 * to print their chapter's *opening sentence* verbatim — Clank's card and
 * Clank's chapter open identically — so that is the rule applied here too:
 * the first sentence, and the rest of the anatomy-and-lifespan paragraph left
 * on the page where it belongs. It is the same rule `tools/check-cards.mjs`
 * already enforces on a class's `description`, for the same reason.
 *
 * `tools/check-cards.mjs` skips these by construction rather than by a name
 * list: it imports this module, and what it exports is what has no upstream.
 *
 * ── the four elemental kin ────────────────────────────────────────────
 * Earthkin, Emberkin, Skykin and Tidekin share a chapter lead-in explaining
 * that they are all descended from elementals. That lead-in is **not** an
 * ancestry — it has no features and nothing can choose it — so there is no
 * document for it, and each of the four carries only its own sentence. The
 * shared lineage is real and is recorded here rather than smuggled into four
 * descriptions that would then all say the same thing in the space the card
 * gives to saying what makes them different.
 */

import { ancestryItem, cardArt, communityItem, feat } from "./_helpers.mjs";

/* Every card in this module has a painting, lifted from the book by
   `tools/import-hf-art.mjs`, so the path is stamped once here rather than
   repeated on twelve entries. It is passed as the *fallback* to the upstream
   lookup rather than as an override — see `printed()` — so the day the Card
   Creator publishes this content the fetched art takes over with no edit. */
const ancestry = (o) => ancestryItem({ ...o, art: cardArt("ancestry", o.name) });
const community = (o) => communityItem({ ...o, art: cardArt("community", o.name) });

/* ══════════════════════════════════════════════════════════════════════
   ANCESTRIES
   ══════════════════════════════════════════════════════════════════════ */

const ancestries = [
  ancestry({
    name: "Aetheris",
    description: `
    Aetheris are humanoids most easily recognized by their wings and sacred markings.`,
    top: feat(
      "Hallowed Aura",
      `
      Once per long rest when an ally within Close range rolls with Fear, you can change it into a
      roll with Hope instead.`,
    ),
    bottom: feat(
      "Celestial Wings",
      `
      You have wings that allow you to fly. Once per scene while flying, you can **spend a Hope**
      instead of marking an Armor Slot.`,
    ),
  }),

  ancestry({
    name: "Earthkin",
    description: `
    Earthkin are humanoids whose bodies are made of flesh and earth.`,
    top: feat(
      "Stoneskin",
      `
      Gain a permanent +1 bonus to your Armor Score and damage thresholds at character creation.`,
    ),
    bottom: feat(
      "Immovable",
      "While you’re touching the ground, you can’t be lifted or moved against your will.",
    ),
  }),

  ancestry({
    name: "Emberkin",
    description: `
    Emberkin are humanoids whose bodies are made of flesh and fire.`,
    top: feat("Fireproof", "You are immune to damage from magical or mundane flame."),
    bottom: feat(
      "Ignition",
      `
      **Mark a Stress** to wreathe your primary weapon in flame until the end of the scene. While
      the weapon is ablaze, it gives off a bright light, and you gain a **1d6** bonus to damage
      rolls with that weapon.`,
    ),
  }),

  ancestry({
    name: "Skykin",
    description: `
    Skykin are humanoids whose bodies are made of flesh and air.`,
    top: feat(
      "Gale Force",
      `
      **Mark a Stress** to conjure a gust of wind that carries you or a Very Close ally up to Very
      Far range. Additionally, you can always control the speed at which you fall.`,
    ),
    bottom: feat(
      "Eye of the Storm",
      `
      **Spend 2 Hope** to grant you or an ally within Melee range a +1 bonus to Evasion until you
      take Severe damage or you use this feature again.`,
    ),
  }),

  ancestry({
    name: "Tidekin",
    description: `
    Tidekin are humanoids whose bodies are made of flesh and water.`,
    top: feat("Amphibious", "You can breathe and move naturally underwater."),
    bottom: feat(
      "Lifespring",
      `
      Once per rest when you have access to a small amount of water, you can **mark a Stress** to
      clear a Hit Point on yourself or an ally within Very Close range.`,
    ),
  }),

  ancestry({
    name: "Gnome",
    description: `
    Gnomes are typically small humanoids with conical heads and the ability to teleport short
    distances.`,
    top: feat(
      "Nimble Fingers",
      "When you make a **Finesse Roll**, you can **spend 2 Hope** to reroll your Hope Die.",
    ),
    bottom: feat(
      "Flicker Step",
      "Once per scene, you can teleport to another point you can see within Far range.",
    ),
  }),
];

/* ══════════════════════════════════════════════════════════════════════
   COMMUNITIES
   ══════════════════════════════════════════════════════════════════════ */

const communities = [
  community({
    name: "Duneborne",
    description: `
    Being part of a duneborne community means you’ve made a home among the shifting sands and arid
    climate of the desert.`,
    feature: feat(
      "Oasis",
      `
      During a short rest, you or an ally can reroll a die used for a downtime move and take the
      higher result.`,
    ),
  }),

  community({
    name: "Freeborne",
    description: `
    Being part of a freeborne community means you’re from a collective that once lived under
    tyrannical rule but is now liberated.`,
    feature: feat(
      "Unbound",
      "Once per session when you roll with Fear, you can change it into a roll with Hope instead.",
    ),
  }),

  community({
    name: "Frostborne",
    description: `
    Being part of a frostborne community means you come from a place of snow and ice.`,
    feature: feat("Hardy", "When you take a rest, you clear a Hit Point."),
  }),

  community({
    name: "Hearthborne",
    description: `
    Being part of a hearthborne community means you come from humble origins, having lived in a
    modest village or quaint countryside.`,
    feature: feat(
      "Close-Knit",
      `
      Once per long rest, you can spend any number of Hope to grant an ally within Far range an
      equal number of Hope.`,
    ),
  }),

  community({
    name: "Reborne",
    description: `
    You were once a member of a different community that you’re no longer part of.`,
    feature: feat(
      "Found Family",
      `
      Once per rest, you can **spend a Hope** to use an ally’s Experience as if it were your own.
      When you do so, describe how your time with that ally prepared you for this moment.

      When you join a new community or rediscover your old one, you can permanently trade this card
      for that one instead.`,
    ),
  }),

  community({
    name: "Warborne",
    description: `
    Being part of a warborne community means you come from a place that is, or was, ravaged by war.`,
    feature: feat(
      "Brave Face",
      `
      Once per session when you would be forced to mark a Stress, you can **spend a Hope** instead.`,
    ),
  }),
];

export default [...ancestries, ...communities];
