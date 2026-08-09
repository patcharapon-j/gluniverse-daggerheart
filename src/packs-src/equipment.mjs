/**
 * The equipment pack: every weapon, armor, consumable and item in the book.
 *
 * Unlike `domain-cards.mjs` this file is **not generated**, and that is a
 * deliberate difference rather than an inconsistency. A generated file exists
 * when something upstream writes it — `tools/fetch-cards.mjs` writes the domain
 * cards from a snapshot it fetched — and the generated copy is then a second
 * place the same facts live, which is why the build has to keep checking that
 * the two still agree.
 *
 * Nothing fetches equipment. `equipment-tables.mjs` and `loot-tables.mjs` are
 * the source, typed in from chapter 2, and this file derives the documents
 * from them at import time. There is no second copy, so there is nothing that
 * can drift, and the check tool is free to spend all of its attention on the
 * question that actually matters: **did a line get lost on the way in?**
 * See `tools/check-equipment.mjs`.
 *
 * ── folders ──────────────────────────────────────────────────────────
 * By kind rather than by tier. A tier is a shopping filter — you want to see
 * every shield at once and compare them, not every unrelated thing that
 * happens to be tier 3 — and the tier is on the row and in the card's own
 * numeral cell, so nothing is lost by not foldering on it.
 */

import { armorItem, lootItem, weaponItem } from "./_helpers.mjs";
import {
  ARMOR,
  PRIMARY_MAGIC,
  PRIMARY_PHYSICAL,
  SECONDARY,
  WHEELCHAIRS,
} from "./equipment-tables.mjs";
import { CONSUMABLES, ITEMS } from "./loot-tables.mjs";
/* *Hope and Fear*'s chapter 2. Its own tables rather than rows appended to the
   corebook's, because it reprints its *own* six staples across four tiers and a
   merged table would let either book's rows cover for a gap in the other's —
   see `hf-equipment-tables.mjs`. They land in the same folders, because the
   foldering is by kind and a Katana is a primary weapon whichever book printed
   it. */
import {
  ARMOR as HF_ARMOR,
  PRIMARY_MAGIC as HF_PRIMARY_MAGIC,
  PRIMARY_PHYSICAL as HF_PRIMARY_PHYSICAL,
  SECONDARY as HF_SECONDARY,
} from "./hf-equipment-tables.mjs";
import { CONSUMABLES as HF_CONSUMABLES, ITEMS as HF_ITEMS } from "./hf-loot-tables.mjs";
import { withDice } from "./card-resources.mjs";
import { withDamage } from "./card-damage.mjs";

const TIERS = [1, 2, 3, 4];

/** Every row of one tiered table, tagged with the tier its heading gave it. */
const tiered = (table, fn) => TIERS.flatMap((tier) => (table[tier] ?? []).map((r) => fn(r, tier)));

const primary = (magic) => (row, tier) =>
  weaponItem({ ...row, tier, slot: "primary", magic });

export default withDamage(withDice([
  ...tiered(PRIMARY_PHYSICAL, primary(false)),
  ...tiered(PRIMARY_MAGIC, primary(true)),

  /* The wheelchairs' tiers run down their tables rather than across, so they
     arrive already carrying one. They are primary weapons and are foldered
     with them — a separate folder would be this system deciding they are a
     different kind of thing, which is the opposite of what the ruleset says. */
  ...WHEELCHAIRS.map((row) => weaponItem({ ...row, slot: "primary" })),

  ...tiered(SECONDARY, (row, tier) => weaponItem({ ...row, tier, slot: "secondary" })),
  ...tiered(ARMOR, (row, tier) => armorItem({ ...row, tier })),

  ...CONSUMABLES.map((row) => lootItem({ ...row, consumable: true })),
  ...ITEMS.map((row) => lootItem({ ...row, consumable: false })),

  /* Hope and Fear. Same mappers, same folders — the only difference is which
     table the row was read off, and `lootItem` records that in `source`
     because both books number their loot 1–60. */
  ...tiered(HF_PRIMARY_PHYSICAL, primary(false)),
  ...tiered(HF_PRIMARY_MAGIC, primary(true)),
  ...tiered(HF_SECONDARY, (row, tier) => weaponItem({ ...row, tier, slot: "secondary" })),
  ...tiered(HF_ARMOR, (row, tier) => armorItem({ ...row, tier })),

  ...HF_CONSUMABLES.map((row) => lootItem({ ...row, consumable: true })),
  ...HF_ITEMS.map((row) => lootItem({ ...row, consumable: false })),
]));
