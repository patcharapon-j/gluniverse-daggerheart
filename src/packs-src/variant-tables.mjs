/**
 * The supplemental campaign variants' equipment tables, transcribed.
 *
 * SRD 2.0's chapter of optional mechanics (pages 190–205) prints gear in three
 * of its ten sections and nowhere else: **Everyday Hero** starting equipment,
 * **Western**'s weapons and loot, and **Monster Hunting**'s hunting kit. This
 * is those three tables and nothing else in the chapter, in the same shape and
 * for the same reasons as `equipment-tables.mjs` — read that file's header
 * first; this one records only what is different.
 *
 * Like it, this is a **snapshot** with no upstream. The official Card Creator
 * publishes cards, and a Butcher's Axe is not a card, so nothing fetches these
 * and nothing can. They are typed in, once, here, and `tools/check-variants.mjs`
 * is what stops them rotting.
 *
 * ── the fourth section that has no table ──────────────────────────────
 * **Tech-Based ships no gear**, and that is a finding rather than an omission.
 * Its weapon is the *Iconic Weapon*, and the SRD prints three of its five
 * columns as player choices — "make selections about trait, range, and damage"
 * — with the stat line recorded on the character's own sheet. What is printed
 * is a burden (two-handed) and a feature (*Bonded:* gain a bonus to your damage
 * rolls equal to your level, which the corebook's Fusion Gloves already carry).
 * A row missing one cell is the arcane-frame wheelchair, and that ships with a
 * plausible value and the truth in its description. A row missing three cells
 * is not a row, and shipping one would be this file inventing a weapon. The
 * Upgrade list — the other thing a tech character equips — is not in the SRD at
 * all; it lives on the Motherboard Module sheet. So the Tech-Based folder
 * `VARIANT_FOLDERS` declares stays empty until somebody publishes a table.
 *
 * ── the features are restated, not imported ───────────────────────────
 * These tables reuse the corebook's feature *names* freely, and several reuse
 * its exact sentence: Reliable, Heavy, Very Heavy, Flexible, Massive, Quick,
 * Cumbersome, Powerful, Startling, Paired, Protective, Barrier and Versatile
 * are all printed here word for word as chapter 2 prints them.
 *
 * They are still declared again here rather than imported, which is
 * `hf-equipment-tables.mjs`'s decision arriving at a third book and taken for
 * its reason: importing would make this file's correctness depend on chapter
 * 2's wording never changing, and the two are separate printings that happen to
 * agree today. A copy-editing pass on the corebook that reworded Heavy would
 * silently reword a Butcher's Axe, and nothing in either file would say so.
 * (It is also not available: `equipment-tables.mjs` exports its four tables and
 * its staple list, never its vocabulary, which is the right boundary for a file
 * whose job is to be checkable against one chapter.)
 *
 * What that buys is visible immediately, because three of the reused names do
 * **not** reuse the sentence, and a shared constant would have hidden all
 * three. This is `PAINFUL_W`/`PAINFUL_A`'s rule — deduplicate identical printed
 * text, never a meaning — with more instances than the corebook has:
 *
 * - **Hooked** is two sentences. The Towline Hook pulls the target "into Melee
 *   range **with you**"; the Chain Whip and the corebook's Grappler pull it
 *   "into Melee range". One moves the wielder and one does not.
 * - **Paired** is two rules. The corebook and Everyday Hero print a flat number
 *   ("+2 to primary weapon damage"); the Wooden Stake prints "a bonus equal to
 *   **1 + your tier**", which climbs.
 * - **Quiet** is two sentences that mean the same thing — "Gain a +2 bonus"
 *   against the corebook's "You gain a +2 bonus". Identical in force and not
 *   identical in print, so it is a second constant, because the moment this
 *   file starts normalising away a word it is no longer a transcription.
 *
 * ── damage carries its printed type ───────────────────────────────────
 * Chapter 2's rows get physical-or-magic from the *heading* of the table they
 * sit in, which is why `equipment.mjs` passes `magic` per group. These do not.
 * Monster Hunting prints **one** primary table holding two magic weapons and a
 * physical one — Blessed Brass Knuckles deal magic damage off Strength — and
 * its secondary table is likewise mixed. So the suffix stays on the string, as
 * `"d8+1 mag"`, because that is the cell: the book puts the type on the row
 * here, so the row is where it goes. The builder splits it, exactly as it
 * splits the die off the bonus.
 *
 * ── a tier ladder in one cell ─────────────────────────────────────────
 * Everyday Hero prints one stat line per weapon; Western and Monster Hunting
 * print four, stacked in a single cell as "Tier 1: d8+1 phy / Tier 2: d8+4 phy
 * / …". So `damage` is a **map keyed by tier** in every table here, and
 * Everyday Hero's simply has one key. One shape rather than two: a reader who
 * has to test whether a cell is a string or a ladder is a reader the check tool
 * has to test for too, and "which tiers does this row print" is a question
 * worth asking of every row.
 *
 * Monster Hunting's armour ladders **three** columns — both thresholds and the
 * base score — so those are maps as well.
 *
 * ── the one invention in this file ────────────────────────────────────
 * A tier ladder becomes four documents, and the three above tier 1 wear names
 * that are **ours**: Improved / Advanced / Legendary, the prefixes chapter 2
 * uses for its own tiered reprints. The numbers are the book's; the names at
 * tiers 2–4 are not printed anywhere.
 *
 * The alternative was one document per printed row carrying tier 1's stat line,
 * with the ladder in its description — and that is wrong in this system for a
 * concrete reason rather than an aesthetic one. Every surface that handles gear
 * reads `tier` and `damage` as one pair: the creation window's equipment table
 * groups by tier, the compendium browser filters on it, the gear tile prints
 * the damage, and `takeWeapon` grants what the document says. A single Revolver
 * would be right at tier 1 and silently wrong at the other three, on the damage
 * bonus, which is the one field nobody re-reads once it is on the sheet.
 * Four documents is also how a table already *plays* these: you carry a
 * Revolver, you reach tier 2, your Revolver hits harder — which is
 * indistinguishable from swapping a Broadsword for an Improved Broadsword,
 * because that is what the corebook makes you do.
 *
 * So the prefix is chapter 2's convention applied to a compact table, and
 * borrowing a convention is not the same as borrowing a sentence — which is why
 * `TIER_PREFIX` is restated below and the features are too, for one reason
 * each.
 *
 * ── two cells that are readings ───────────────────────────────────────
 * Exploding Potions' feature and the Leather Apron's feature are **blank in
 * every extraction of the page**, and each is recorded here as "no feature"
 * with the reasoning written at the row. Neither is a transcription and both
 * say so where they sit, because a reading that is only recorded in a header is
 * a reading nobody reads.
 *
 * ── two rules this system cannot hold ─────────────────────────────────
 * Stated at their rows, both carried as printed text and neither given a
 * modifier that would implement half of it: the Enchanted Kite's **Versatile**
 * and Silverweave Armor's **Warded**. See the notes there.
 */

/* ── features ───────────────────────────────────────────────────────── */

/**
 * A named feature block plus the numbers it moves.
 *
 * Same helper as `equipment-tables.mjs` — a passive number rides on the feature
 * as a structured modifier rather than being parsed out of its sentence,
 * because this system parses English rules text in exactly one bounded place
 * and a table we are typing in ourselves is the last place that would be
 * needed.
 */
const f = (name, description, mods = {}) => {
  const modifiers = [...(mods.modifiers ?? [])];
  if (mods.ev) modifiers.push({ target: "evasion", value: mods.ev });
  if (mods.as) modifiers.push({ target: "armorScore", value: mods.as });
  for (const [trait, value] of Object.entries(mods.traits ?? {})) {
    modifiers.push({ target: "trait", trait, value });
  }
  return { name, description, ...mods, modifiers };
};

/* Weapon features whose sentence chapter 2 also prints, word for word.
   Restated rather than imported — see the header. */
const CUMBERSOME = f("Cumbersome", "−1 to Finesse", { traits: { finesse: -1 } });
const HEAVY = f("Heavy", "−1 to Evasion", { ev: -1 });
const MASSIVE = f(
  "Massive",
  "−1 to Evasion; on a successful attack, roll an additional damage die and discard the lowest result.",
  { ev: -1 },
);
const POWERFUL = f("Powerful", "On a successful attack, roll an additional damage die and discard the lowest result.");
const QUICK = f("Quick", "When you make an attack, you can mark a Stress to target another creature within range.");
const RELIABLE = f("Reliable", "+1 to attack rolls", { modifiers: [{ target: "ownAttack", value: 1 }] });
const STARTLING = f(
  "Startling",
  "Mark a Stress to crack the whip and force all adversaries within Melee range back to Close range.",
);

/**
 * Hooked, twice, and the difference is who moves.
 *
 * The Towline Hook drags the target to *you*; the Chain Whip and the corebook's
 * Grappler drag it to Melee range and leave the wielder where they stood. Same
 * name, two rules, so two constants — which is the whole of why identical
 * printed text is what gets deduplicated here and never a meaning.
 */
const HOOKED = f("Hooked", "On a successful attack, you can pull the target into Melee range.");
const HOOKED_TO_YOU = f("Hooked", "On a successful attack, you can pull the target into Melee range with you.");

/* Everyday Hero's own, printed nowhere else. */
const BRIGHT = f("Bright", "This weapon temporarily lights up the area the flare lands in.");

/**
 * Versatile, which is still the second stat line this schema cannot hold.
 *
 * "This weapon can also be used with these statistics—Presence, Melee, d10" is
 * a whole alternate weapon — its own trait, range and die, *chosen between* at
 * the moment you swing — and `WeaponData.damage` is one stat line rather than a
 * list of them. CLAUDE.md records the gap for the corebook's seven Versatile
 * weapons and `card-damage.mjs` declines all seven under "somebody else's stat
 * line"; the Enchanted Kite is the eighth and nothing here changes that.
 *
 * So it does exactly what chapter 2 does: carries the printed sentence and
 * **nothing structural**. Not `damageField.extra`, which would be the wrong
 * lesson — `extra` adds die groups rolled *together* inside one expression
 * (the Brawler's `d8+d6`), and this is two expressions you pick between.
 */
const versatile = (stats) => f("Versatile", `This weapon can also be used with these statistics—${stats}`);

/* The shapes whose number the table supplies. */
const paired = (n) =>
  f("Paired", `+${n} to primary weapon damage to targets within Melee range`, {
    modifiers: [{ target: "primaryDamage", value: n, condition: "meleeWeapon" }],
  });
const protective = (n) => f("Protective", `+${n} to Armor Score`, { as: n });
const barrier = (n) => f("Barrier", `+${n} to Armor Score; −1 to Evasion`, { as: n, ev: -1 });

/* Armor features chapter 2 also prints word for word. */
const FLEXIBLE = f("Flexible", "+1 to Evasion", { ev: 1 });
const VERY_HEAVY = f("Very Heavy", "−2 to Evasion; −1 to Agility", { ev: -2, traits: { agility: -1 } });

/* ── Western ────────────────────────────────────────────────────────── */

/**
 * Six Shot is a **counter**, and this file is not where a counter is authored.
 *
 * "Place 6 Ammo tokens on your character sheet" is a fixed pool of six spent
 * one per attack and refilled by marking a Stress, which is exactly
 * `resourceField` with `max: {kind: "fixed", n: 6}`. It is not attached here
 * for the reason `card-resources.mjs` states about every other counter in the
 * system: compendium documents ship without counter annotations, and a player
 * adds the ones they want once the Item is on a character.
 *
 * Worth knowing that nothing is currently watching for it. `check-resources.mjs`
 * has an explicit `PACKS` list — classes, heritage, domains, equipment — and
 * this pack is not on it, so the ratchet that would demand an annotation for
 * this sentence never sees it. That is a gap in the coverage rather than in the
 * content, and it belongs to whoever wires the variants pack into that sweep.
 */
const SIX_SHOT = f(
  "Six Shot",
  "Place 6 Ammo tokens on your character sheet. Spend 1 Ammo token to make an attack. You can mark a Stress to regain spent Ammo tokens.",
);
const SIGHTLINE = f("Sightline", "Spend 2 Hope to gain advantage on an attack roll.");
const SCATTERSHOT = f("Scattershot", "When you make an attack, target all creatures in front of you within range.");
const QUICK_SHOT = f("Quick Shot", "Spend 2 Hope to gain a +4 bonus to primary weapon damage.");

/**
 * Roped names a condition this system does not register, and holds one target.
 *
 * `CONDITIONS` admits a state a card defines and then refers back to with
 * "While X", which this passes cleanly — but it is also the shape CLAUDE.md
 * records as having nowhere to live: an effect held on exactly one creature,
 * contingent on the wielder's own position, with a contested clear. The two
 * conditions it *applies* are both registered already, so the text is left to
 * say so and no seventeenth condition is invented on a weapon's behalf.
 */
const ROPED = f(
  "Roped",
  "On a successful attack, you can temporarily Rope the target instead of dealing damage. While Roped, the target is _Restrained_ and _Vulnerable_, but you must remain within Very Close range of the target. When the target would clear this condition, you can make a Strength Reaction Roll. On a success, they remain Roped.",
);

/* ── Monster Hunting ────────────────────────────────────────────────── */

/**
 * Paired, the climbing one.
 *
 * The corebook's Paired is a flat printed number and takes it as an argument;
 * the Wooden Stake's is "a bonus equal to **1 + your tier**", which moves every
 * time the character advances a tier. That is `n = source × scale + value` with
 * `source: "tier"` and `value: 1` — the same arithmetic the Attuned armour
 * feature already uses — so the number rides on the feature here too rather
 * than being read out of the sentence at damage time.
 */
const PAIRED_TIER = f(
  "Paired",
  "Gain a bonus equal to 1 + your tier to primary weapon damage to targets within Melee range.",
  { modifiers: [{ target: "primaryDamage", value: 1, source: "tier", condition: "meleeWeapon" }] },
);

const RESONANT = f(
  "Resonant",
  "When you critically succeed on a primary weapon attack, you gain an additional Hope.",
);

/**
 * Splintering is a threshold bonus that moves **during a fight**.
 *
 * "Equal to your unmarked Armor Slots" is the reverse direction of
 * `WeaponData.armorScoreModifier`: a live read of the Armor Slot track feeding
 * both damage thresholds, recomputed every time a slot is spent — which means
 * `apps/damage.ts` would have to re-measure the band it is drawing while you
 * are deciding whether to spend a slot on it. The modifier vocabulary has no
 * source for it (`proficiency`, `tier`, `level`, `markedStress`, a trait,
 * the Spellcast trait) and inventing one to serve one armour would reach the
 * derivation every character on the table runs.
 *
 * So the text and nothing else. A half-implemented Splintering — a static
 * bonus off the armour's *capacity* rather than its unmarked slots — would be
 * right on a fresh character and wrong from the first hit, which is worse than
 * a rule the table reads off the card.
 */
const SPLINTERING = f("Splintering", "Gain a bonus to your damage thresholds equal to your unmarked Armor Slots.");

/**
 * Quiet, the second sentence of that name.
 *
 * The corebook's Tyris Soft Armor prints "**You** gain a +2 bonus to rolls you
 * make to move silently"; this prints the same rule with the subject dropped.
 * Identical in force, not identical in print, so it is its own constant — the
 * moment a transcription starts normalising away a word it has stopped being
 * one. Neither carries a modifier: "rolls you make to move silently" is not a
 * class of roll anything can identify, so it is a number the player brings in
 * the roll popover, which is what the corebook's copy already does.
 */
const QUIET = f("Quiet", "Gain a +2 bonus to rolls you make to move silently.");

/**
 * Warded is a **per-armour exception to the printed damage rule**, and it is
 * carried as text on purpose.
 *
 * `apps/damage.ts` states the rule it breaks in its own comments: an Armor Slot
 * moves the hit one rung down the ladder — Severe to Major, Major to Minor,
 * Minor to nothing — and it deliberately does **not** subtract Armor Score from
 * the number, because subtracting is the reading that makes heavy armour absurd
 * against small hits and useless against large ones. Warded says to subtract,
 * for magic damage only, *before* the number meets the thresholds at all.
 *
 * That is a second resolution order living beside the first, and the dialog has
 * one. Nothing here half-implements it: an `armorScore` modifier would raise
 * the purse rather than change the arithmetic, which is a different rule
 * wearing this one's name, and it would be wrong in the direction that looks
 * like it is working. The corebook's Elundrian Chain Armor prints the same
 * sentence and is carried the same way, so this is not a new gap — it is the
 * same one, stated twice.
 */
const WARDED = f(
  "Warded",
  "You reduce incoming magic damage by your Armor Score before applying it to your damage thresholds.",
);

/* ── rows ─────────────────────────────────────────────────────────────
   `w` is one weapon line and `a` is one armour line, read left to right off
   the page. `damage` is a map from the tier the cell names to that tier's
   printed cell, suffix included; a table with no ladder has one key. */

const w = (name, trait, range, damage, burden, feature = null) => ({
  name,
  trait,
  range,
  damage,
  burden,
  feature,
});

/** `thresholds` is `{tier: [major, severe]}` and `score` is `{tier: n}`. */
const a = (name, thresholds, score, feature = null) => ({ name, thresholds, score, feature });

/** A consumable off a variant's Loot heading — no d12 roll number, because
    these are printed as prose rather than as a row of a rolled table. */
const c = (name, description) => ({ name, description });

/* ══════════════════════════════════════════════════════════════════════
   EVERYDAY HERO STARTING EQUIPMENT (pp. 191–192)

   "PCs without access to standard weapons and armor can choose from the
   following tables." Four tables, and every one of them is **tier 1** — the
   section prints no tier ladder at all, and the stat lines map one for one onto
   chapter 2's tier-1 tables, which is what the section is: a reskin of the
   starting kit for a character who owns a kitchen rather than an armoury. The
   fifteen / ten / seven / four shape is chapter 2's shape exactly, and
   `check-variants.mjs` asserts those counts for that reason.
   ══════════════════════════════════════════════════════════════════════ */

export const EVERYDAY_HERO = {
  /* Primary Physical Weapons — 15 rows. */
  primaryPhysical: [
    w("Cleaver", "agility", "melee", { 1: "d8 phy" }, "oneHanded", RELIABLE),
    w("Sharpened Rake", "agility", "melee", { 1: "d8+3 phy" }, "twoHanded"),
    w("Butcher’s Axe", "strength", "melee", { 1: "d12+3 phy" }, "twoHanded", HEAVY),
    w("Iron Skillet", "strength", "melee", { 1: "d8+1 phy" }, "oneHanded"),
    w("Pitchfork", "strength", "melee", { 1: "d10+3 phy" }, "twoHanded"),
    w("Sledgehammer", "strength", "melee", { 1: "d10+3 phy" }, "twoHanded", MASSIVE),
    w("Cooking Knife", "finesse", "melee", { 1: "d8+1 phy" }, "oneHanded"),
    w("Walking Staff", "instinct", "melee", { 1: "d10+3 phy" }, "twoHanded"),
    w("Rolling Pin", "presence", "melee", { 1: "d8+1 phy" }, "oneHanded"),
    w("Sickle", "presence", "melee", { 1: "d8 phy" }, "oneHanded", QUICK),
    w("Forge Poker", "strength", "veryClose", { 1: "d8+2 phy" }, "twoHanded"),
    w("Crop Scythe", "finesse", "veryClose", { 1: "d8+2 phy" }, "twoHanded"),
    w("Fishing Rod", "agility", "far", { 1: "d6+3 phy" }, "twoHanded"),
    w("Slingshot", "finesse", "far", { 1: "d6+3 phy" }, "twoHanded"),
    w("Firework Launcher", "agility", "veryFar", { 1: "d6+3 phy" }, "twoHanded", CUMBERSOME),
  ],

  /* Primary Magic Weapons — 10 rows. The table is headed "All magic weapons
     require a Spellcast trait", which is the only reason this is a separate
     list rather than a column: it is what lets the creation flow say *why* a
     Whisk Wand is not offered to a character with no Spellcast trait. */
  primaryMagic: [
    w("Enchanted Hammer", "strength", "melee", { 1: "d10+1 mag" }, "oneHanded"),
    w("Enchanted Mop", "strength", "melee", { 1: "d10+3 mag" }, "twoHanded"),
    w("Enchanted Scissors", "finesse", "veryClose", { 1: "d10 mag" }, "oneHanded"),
    w("Enchanted Broomstick", "instinct", "veryClose", { 1: "d10+2 mag" }, "twoHanded"),

    /* ── a READING, not a transcription ──────────────────────────────
       This row's Feature cell is **blank in every extraction of page 191**.
       The column yields nine tokens for ten rows and this is the row that gets
       none, while the two named features land against burdens 8 and 10 by
       column position — so what is missing is a token, and what is on the page
       is an empty cell rendering beside nine that render.

       Recorded as no feature, which is what a blank Feature cell means on every
       other row of this table. That is the weaker of the two available claims
       and it is still a claim: "we read an empty cell" is not the same as "we
       could not read this cell", and only the first one licenses shipping a
       Feature-less weapon. **Unverified against the printed page.** Anybody
       with the PDF open should eyeball page 191 and delete this note. */
    w("Exploding Potions", "finesse", "close", { 1: "d8 mag" }, "oneHanded"),

    w("Enchanted Forge Lighter", "instinct", "close", { 1: "d8 mag" }, "oneHanded"),
    w("Enchanted Boomerang", "instinct", "far", { 1: "d6+3 mag" }, "twoHanded"),
    /* The eighth Versatile weapon and the eighth second stat line with nowhere
       to go — see the note on `versatile` above. */
    w("Enchanted Kite", "presence", "far", { 1: "d6 mag" }, "twoHanded", versatile("Presence, Melee, d10.")),
    w("Whisk Wand", "knowledge", "far", { 1: "d6+1 mag" }, "oneHanded"),
    w("Sparkling Staff", "knowledge", "veryFar", { 1: "d6 mag" }, "twoHanded", POWERFUL),
  ],

  /* Secondary Weapons — 7 rows, every one One-Handed, which is what makes it a
     secondary. The burden column is printed anyway and transcribed anyway, so
     the check can assert it rather than this comment having to be believed. */
  secondary: [
    w("Large Fork", "agility", "melee", { 1: "d8 phy" }, "oneHanded", paired(2)),
    w("Barrel Lid Shield", "strength", "melee", { 1: "d4 phy" }, "oneHanded", protective(1)),
    w("Table Shield", "strength", "melee", { 1: "d6 phy" }, "oneHanded", barrier(2)),
    w("Paring Knife", "finesse", "melee", { 1: "d8 phy" }, "oneHanded", paired(2)),
    w("Festival Whip", "presence", "veryClose", { 1: "d6 phy" }, "oneHanded", STARTLING),
    w("Towline Hook", "finesse", "close", { 1: "d6 phy" }, "oneHanded", HOOKED_TO_YOU),
    w("Flare Launcher", "finesse", "far", { 1: "d6+1 phy" }, "oneHanded", BRIGHT),
  ],

  /* Armor — 4 rows. Thresholds are the *base* pair, without the character's
     level in them, exactly as chapter 2's are: the level is added in
     `CharacterData#prepareDerivedData`, and storing the printed number is what
     keeps the two from disagreeing when somebody levels up. */
  armor: [
    a("Quilted Clothing", { 1: [5, 11] }, { 1: 3 }, FLEXIBLE),

    /* ── a READING, not a transcription ──────────────────────────────
       Same footing as Exploding Potions above, and found the same way: the
       Feature column of page 192's armour table emits three tokens for four
       rows, and this is the row with none — Quilted Clothing/Flexible, Leather
       Apron/blank, Tree Bark/Heavy, Baking Tray/Very Heavy on four aligned
       rows. Recorded as no feature. **Unverified against the printed page.** */
    a("Leather Apron", { 1: [6, 13] }, { 1: 3 }),

    a("Tree Bark Armor", { 1: [7, 15] }, { 1: 4 }, HEAVY),
    a("Baking Tray Breastplate", { 1: [8, 17] }, { 1: 4 }, VERY_HEAVY),
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   WESTERN — WEAPONS & LOOT (p. 197)

   Three primaries, two secondaries and one consumable, and the two weapon
   tables print their damage as a four-tier ladder in a single cell. Both
   primary and secondary tables are mixed-range and entirely physical.
   ══════════════════════════════════════════════════════════════════════ */

export const WESTERN = {
  /* Primary Weapons — 3 rows × 4 tiers. */
  primary: [
    w("Revolver", "finesse", "far",
      { 1: "d8+1 phy", 2: "d8+4 phy", 3: "d8+7 phy", 4: "d8+10 phy" },
      "oneHanded", SIX_SHOT),
    w("Rifle", "agility", "veryFar",
      { 1: "d8+2 phy", 2: "d8+5 phy", 3: "d8+8 phy", 4: "d8+11 phy" },
      "twoHanded", SIGHTLINE),
    w("Shotgun", "strength", "veryClose",
      { 1: "d6+2 phy", 2: "d6+5 phy", 3: "d6+8 phy", 4: "d6+11 phy" },
      "twoHanded", SCATTERSHOT),
  ],

  /* Secondary Weapons — 2 rows × 4 tiers. */
  secondary: [
    w("Lasso", "agility", "veryClose",
      { 1: "d4 phy", 2: "d4+3 phy", 3: "d4+6 phy", 4: "d4+9 phy" },
      "oneHanded", ROPED),
    w("Small Revolver", "finesse", "far",
      { 1: "d6 phy", 2: "d6+3 phy", 3: "d6+6 phy", 4: "d6+9 phy" },
      "oneHanded", QUICK_SHOT),
  ],

  /**
   * Loot — 1 consumable.
   *
   * Printed as a paragraph under a "Loot" heading rather than as a row of a
   * d12 table, so it carries **no roll number**: `ConsumableData.source` exists
   * to hold "Consumable 07", the way the rules refer to a rolled row, and there
   * is no number here to hold. Giving it one would be this file inventing a
   * position on a table it is not on.
   *
   * Its resolution is beyond what the document can carry — a Reaction Roll (14)
   * against everyone within Very Close of the landing point, save-for-Stress
   * rather than save-for-half, and double damage to inanimate objects, which is
   * a target category this system has no representation for. All of that is
   * printed text and read at the table, which is `apps/rules.ts`'s standing
   * position on rules this system declines to parse.
   */
  consumables: [
    c(
      "Dynamite",
      "You can light this dynamite and toss it within Close range. All creatures within Very Close range of where the dynamite lands must make a Reaction Roll (14). Targets who fail take 1d20+5 physical damage. Targets who succeed must mark a Stress. Dynamite deals double damage to inanimate objects or structures.",
    ),
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   MONSTER HUNTING EQUIPMENT (pp. 201–202)

   Three primaries, three secondaries and three armours, all laddered across
   four tiers.

   Its primary table is **one table holding both damage types**, which chapter 2
   never prints: Blessed Brass Knuckles deal magic damage off Strength and the
   Holy Shotgun off Agility, with no Spellcast requirement stated anywhere on
   the section. The secondary table is mixed the same way. That is why the type
   suffix rides on each damage cell here rather than on the group — see the
   header.
   ══════════════════════════════════════════════════════════════════════ */

export const MONSTER_HUNTING = {
  /* Primary Weapons — 3 rows × 4 tiers. */
  primary: [
    w("Blessed Brass Knuckles", "strength", "melee",
      { 1: "d8+1 mag", 2: "d8+4 mag", 3: "d8+7 mag", 4: "d8+10 mag" },
      "oneHanded"),
    w("Holy Shotgun", "agility", "veryClose",
      { 1: "d6+2 mag", 2: "d6+5 mag", 3: "d6+8 mag", 4: "d6+11 mag" },
      "twoHanded", SCATTERSHOT),
    w("Repeating Crossbow", "finesse", "far",
      { 1: "d6+2 phy", 2: "d6+5 phy", 3: "d6+8 phy", 4: "d6+11 phy" },
      "twoHanded", QUICK),
  ],

  /* Secondary Weapons — 3 rows × 4 tiers. */
  secondary: [
    w("Wooden Stake", "strength", "melee",
      { 1: "d8 phy", 2: "d8+2 phy", 3: "d8+4 phy", 4: "d8+6 phy" },
      "oneHanded", PAIRED_TIER),
    w("Hallowed Shield", "instinct", "melee",
      { 1: "d4 mag", 2: "d4+2 mag", 3: "d4+4 mag", 4: "d4+6 mag" },
      "oneHanded", RESONANT),
    w("Chain Whip", "presence", "veryClose",
      { 1: "d6+1 phy", 2: "d6+3 phy", 3: "d6+5 phy", 4: "d6+7 phy" },
      "oneHanded", HOOKED),
  ],

  /* Armor — 3 rows × 4 tiers, and the only table in this chapter that ladders
     three columns: both base thresholds and the base score climb. */
  armor: [
    a("Coffinwood Armor",
      { 1: [4, 10], 2: [6, 15], 3: [8, 22], 4: [10, 31] },
      { 1: 3, 2: 4, 3: 5, 4: 6 },
      SPLINTERING),
    a("Leather Longcoat",
      { 1: [5, 12], 2: [8, 18], 3: [10, 25], 4: [12, 34] },
      { 1: 3, 2: 4, 3: 5, 4: 6 },
      QUIET),
    a("Silverweave Armor",
      { 1: [5, 11], 2: [7, 16], 3: [9, 23], 4: [11, 32] },
      { 1: 3, 2: 4, 3: 5, 4: 6 },
      WARDED),
  ],
};

/**
 * The prefix each tier above 1 puts in front of a laddered row's name.
 *
 * Chapter 2's own convention, restated here rather than imported for the
 * reason the features are — except that this one is a convention rather than a
 * sentence, and it is the only thing in this file that is not printed on the
 * page it transcribes. See "the one invention" in the header.
 */
export const TIER_PREFIX = { 2: "Improved", 3: "Advanced", 4: "Legendary" };

/** `"d10+3 phy"` → `{damage: "d10+3", magic: false}`. */
export function splitPrinted(cell) {
  const m = /^(d\d+(?:\+\d+)?)\s+(phy|mag)$/.exec(String(cell).trim());
  if (!m) throw new Error(`Unreadable damage cell "${cell}" — expected "d8 phy" or "d10+3 mag"`);
  return { damage: m[1], magic: m[2] === "mag" };
}

/**
 * Every table in this file, by the variant that prints it.
 *
 * One structure so `variants.mjs` and `check-variants.mjs` walk the same thing
 * rather than each keeping its own list of what exists — the failure a second
 * list produces is a table that got added and checked by nobody, which is
 * exactly the failure this file's check tool is for.
 *
 * The keys are the variant ids `src/module/variants.ts` declares, so the folder
 * a document lands in is looked up rather than typed twice.
 */
export const VARIANT_GEAR = {
  everydayHero: EVERYDAY_HERO,
  western: WESTERN,
  monsterHunting: MONSTER_HUNTING,
};
