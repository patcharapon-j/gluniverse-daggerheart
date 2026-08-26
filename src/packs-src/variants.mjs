/**
 * The variants pack: the gear the supplemental campaign chapter prints.
 *
 * `equipment.mjs`'s argument, applied to a second chapter — read that file's
 * header first. Nothing upstream writes these, so this file is **not
 * generated**: `variant-tables.mjs` is the transcription and this derives the
 * documents from it at import time. One copy, nothing to drift, and
 * `tools/check-variants.mjs` free to spend its whole attention on the question
 * that actually matters, which is whether a line got lost on the way in.
 *
 * ── why it is not the equipment pack ──────────────────────────────────
 * `scripts/build-packs.mjs` states this at the pack declaration and it is worth
 * repeating from the content side: every one of these documents belongs to a
 * campaign nobody may be running. Everyday Hero alone is thirty-six more
 * weapons in a compendium search for tier-1 primaries, and a Pitchfork arriving
 * in that search is a variant leaking into a game that never switched it on. A
 * pack is the coarsest gate this system has and it is the right grain here,
 * because the chapter is optional all at once.
 *
 * ── the folders are by variant, not by kind ───────────────────────────
 * Which is the opposite of `equipment.mjs`, and the difference is what a reader
 * of *this* pack is asking. There, foldering by kind is right because the pack
 * is one book's complete armoury and you want every shield at once. Here the
 * first question is always **which frame is this for** — a Cleaver and a
 * Revolver have nothing to do with each other and are never on the same table —
 * and a "Primary Weapons" folder holding both would be the pack answering a
 * question nobody asked while hiding the one they did.
 *
 * So the three constructors' own `folder` is overwritten on the way out. That
 * is a deliberate override rather than a shortcoming of the helpers: they
 * folder by kind because the equipment pack does, and a `folder` argument on
 * `weaponItem` would put the choice at three hundred and fifty-eight call sites
 * to serve ninety-three.
 *
 * The names come from `src/module/variants.ts`'s `VARIANT_FOLDERS` and are
 * restated below because a `.mjs` pack source cannot import TypeScript.
 * `tools/check-variants.mjs` reads that file as text and asserts the two agree,
 * which is `tools/check-item-sheet.mjs`'s move for the same reason: a second
 * copy maintained by hand is the thing a check exists to prevent, so the check
 * is what makes the second copy safe.
 *
 * ── counters and damage, and the order the wrapping had to happen in ──
 * `card-resources.mjs` and `card-damage.mjs` are keyed `type:name` and attached
 * by `withDice`/`withDamage` at the pack's own export, exactly as `equipment.mjs`
 * does it. Both sweeps' `PACKS` lists now include this pack, so this is
 * genuine coverage rather than a wrap that implies it.
 *
 * The sweep found exactly the two documents the transcription flagged, and
 * they land differently — which is the existing split rather than an
 * inconsistency here.
 *
 * **Dynamite's `1d20+5 physical` rides on the document.** A printed damage
 * expression is on the card whether anybody wants it or not, so `withDamage`
 * attaches it and the posted card grows its own "Roll 1d20+5" button.
 *
 * **The Revolver's six Ammo tokens do not.** `withDice` attaches the *die*
 * annotations and never the counter ones, because a counter is something a
 * player decides to keep: compendium documents ship without them and the
 * player adds the ones they want once the Item is on a character. So the
 * Revolver's entry in `card-resources.mjs` is checker evidence for the
 * reading — six, arriving full, filled by hand — and the item sheet's counter
 * panel is where it becomes a tray. That is `PILES`'s own arrangement and
 * nothing about this pack changes it.
 *
 * The Revolver is four entries because a tier ladder is four weapons, and its
 * Ammo is `refresh: "manual"`: it comes back when you mark a Stress, which is
 * a price rather than a scope, and no refresh kind means that.
 */

import { armorItem, lootItem, weaponItem } from "./_helpers.mjs";
import { TIER_PREFIX, VARIANT_GEAR, splitPrinted } from "./variant-tables.mjs";
import { withDice } from "./card-resources.mjs";
import { withDamage } from "./card-damage.mjs";

/**
 * The compendium folder each variant's content is filed under.
 *
 * Kept identical to `VARIANT_FOLDERS` in `src/module/variants.ts` — see the
 * header. Only the three variants that print gear appear here; the other seven
 * folders exist for the rules pack and for whatever a later chapter ships.
 */
const FOLDER = {
  everydayHero: "Everyday Hero",
  western: "Western",
  monsterHunting: "Monster Hunting",
};

/**
 * Which constructor each printed table's rows go through.
 *
 * Keyed by the group name `variant-tables.mjs` uses, which is the heading the
 * SRD prints above the table. Everyday Hero splits its primaries into two
 * tables and the other two variants print one, so three keys land on the same
 * primary slot — `slot` is which *table* a weapon came from rather than
 * anything about the weapon, exactly as it is in the corebook.
 */
const GROUPS = {
  primaryPhysical: { kind: "weapon", slot: "primary" },
  primaryMagic: { kind: "weapon", slot: "primary" },
  primary: { kind: "weapon", slot: "primary" },
  secondary: { kind: "weapon", slot: "secondary" },
  armor: { kind: "armor" },
  consumables: { kind: "consumable" },
};

/**
 * A laddered row's name at a given tier.
 *
 * Tier 1 is what the page calls it. Tiers 2–4 wear chapter 2's Improved /
 * Advanced / Legendary prefixes, which are **ours** — see "the one invention"
 * in `variant-tables.mjs`. A row that prints only tier 1, which is every
 * Everyday Hero row, never reaches the prefix at all.
 */
const tierName = (name, tier) => (TIER_PREFIX[tier] ? `${TIER_PREFIX[tier]} ${name}` : name);

/** Every tier a row's damage cell names, as numbers, in printed order. */
const tiersOf = (map) => Object.keys(map).map(Number).sort((x, y) => x - y);

const weaponDocs = (row, { slot }) =>
  tiersOf(row.damage).map((tier) => {
    const { damage, magic } = splitPrinted(row.damage[tier]);
    return weaponItem({
      name: tierName(row.name, tier),
      tier,
      slot,
      trait: row.trait,
      range: row.range,
      damage,
      burden: row.burden,
      feature: row.feature,
      magic,
    });
  });

const armorDocs = (row) =>
  tiersOf(row.thresholds).map((tier) => {
    const [major, severe] = row.thresholds[tier];
    return armorItem({
      name: tierName(row.name, tier),
      tier,
      major,
      severe,
      score: row.score[tier],
      feature: row.feature,
    });
  });

/* A variant's Loot heading is prose rather than a rolled table, so no `roll`
   goes in and `source` comes out empty. See the note at Western's own rows. */
const lootDocs = (row) => [lootItem({ name: row.name, description: row.description, consumable: true })];

const BUILD = { weapon: weaponDocs, armor: armorDocs, consumable: lootDocs };

export default withDamage(
  withDice(
    Object.entries(VARIANT_GEAR).flatMap(([variant, tables]) =>
      Object.entries(tables).flatMap(([group, rows]) => {
        const spec = GROUPS[group];
        if (!spec) throw new Error(`variants: no builder for the "${group}" table of ${variant}`);
        return rows
          .flatMap((row) => BUILD[spec.kind](row, spec))
          .map((doc) => ({ ...doc, folder: FOLDER[variant] }));
      }),
    ),
  ),
);
