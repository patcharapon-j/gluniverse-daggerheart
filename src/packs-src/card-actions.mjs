/**
 * What every printed rule asks you to *do*, read once and written down.
 *
 * This file is the reading that replaced the parsers. Until it existed, a
 * card's buttons were swept out of its own prose at render time by three
 * regular expressions — `featurePrice` for a cost, `rollCall` for a roll, and
 * a sniff for the literal words "damage roll" — and the corpus is what shows
 * why that could not be made to work:
 *
 *   over-match  Three weapons named Scary say "the target must mark a Stress"
 *               and the sheet charged the *wielder* for it. Four suits of
 *               Banded Armor charged Severe damage's Armor Slot on a press
 *               rather than on the damage.
 *   under-match Unleash Chaos printed "Mark Stress" where the pattern wanted
 *               "Mark a Stress", so a card that has always charged a Stress
 *               charged nothing at all until SRD 2.0 added the article.
 *
 * Neither is visible afterwards. A card with a button too many and a card
 * with a button too few both render perfectly, and the only witness is the
 * player who paid. That is the whole argument for reading them by hand.
 *
 * ── the shape ────────────────────────────────────────────────────────────
 *
 * Keyed `type:name`, one entry per document:
 *
 *     "domainCard:Rune Ward": {
 *       actions: [ { kind: "pay", amount: { stress: 1 }, said: "Mark a Stress" } ],
 *       features: { "Ward": [ … ] },
 *     }
 *
 * `actions` land on `system.actions`; `features` land on the named block's own
 * `actions`, because an action is printed on a rule and has to travel with it
 * when mixed ancestry copies the block. See `actionField` in
 * `src/module/data/fields.ts` for every member and why it is there.
 *
 * ── said, and why every entry carries one ────────────────────────────────
 *
 * `said` is the words the action was read from, quoted off the card. It is
 * `card-resources.mjs`'s provenance promoted out of a checker's table into the
 * data itself, and it does three jobs no other field can. It makes a thousand
 * readings reviewable by a human. It fails the build when the words leave the
 * card — because upstream fixing a typo and upstream rewriting a rule around
 * its cost look identical from here, and only one of them is fine. And it is
 * what a GM reads in the Automation editor to understand why a button exists.
 *
 * ── declining, out loud ──────────────────────────────────────────────────
 *
 * `DECLINED` is every phrase that looks like an action and is not one, with
 * the reading that disqualified it. Values are **arrays**, as
 * `card-damage.mjs`'s are, because one document declines for unrelated
 * reasons more than once — and a document may be annotated *and* declined,
 * where part of its text is a press and part of it is somebody else's.
 *
 * A decline is not an omission. `tools/check-actions.mjs` walks every rule
 * unit in the four packs and fails on one that is neither annotated nor
 * declined, so the only way past it is to have read the card.
 *
 * ── two deliveries, one reading ──────────────────────────────────────────
 *
 * `withActions()` writes these into the built compendium document, and
 * `fillCardActions` in `data/fields.ts` writes them onto every construction of
 * an *embedded copy* — because a domain card on a character sheet is a
 * duplicate made months ago and a pack rebuild never reaches it. Neither ever
 * overwrites a non-empty array: that is somebody's homebrew, and it wins.
 */

/* ── entries ─────────────────────────────────────────────────────────────
   Populated per population — see `tools/check-actions.mjs` for what is still
   unread. Each population lands as its own commit with its own ratchet
   turning green, so an empty region here is work not yet done rather than a
   claim that those cards ask for nothing. */

export const CARD_ACTIONS = {};

/* ── declined ────────────────────────────────────────────────────────────
   One entry per phrase a reader looked at and judged not to be a press by the
   holder of this card, with the reason. */

export const DECLINED = {};

export default CARD_ACTIONS;

/**
 * Attach the reading to a pack's documents, at its own `export default`.
 *
 * Beside `withDice` and `withDamage` and for their reason: no generator emits
 * this call, because a generated file is an *ingredient* and the wrap is
 * hand-written downstream where the next `cards:fetch` cannot revert it.
 */
export const withActions = (docs) =>
  docs.map((d) => {
    const entry = CARD_ACTIONS[`${d.type}:${d.name}`];
    if (!entry) return d;
    const system = { ...d.system };
    if (entry.actions?.length) system.actions = entry.actions;
    for (const [name, actions] of Object.entries(entry.features ?? {})) {
      for (const key of ["classFeatures", "features"]) {
        if (Array.isArray(system[key])) {
          system[key] = system[key].map((b) => (b?.name === name ? { ...b, actions } : b));
        }
      }
      for (const key of ["hopeFeature", "topFeature", "bottomFeature", "feature"]) {
        if (system[key]?.name === name) system[key] = { ...system[key], actions };
      }
    }
    return { ...d, system };
  });
