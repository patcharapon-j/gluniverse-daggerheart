/**
 * The supplemental campaign variants, as rules text you can open at the table.
 *
 * SRD 2.0 pages 190–205 are sixteen pages of optional mechanics, and every one
 * of them is *reference*: a thing the GM reads and adjudicates. `variants.mjs`
 * holds the half of that chapter which is gear — Items a character equips,
 * which belong beside the other Items — and this file holds everything else.
 * A JournalEntry is what a virtual tabletop has for rules text nobody equips,
 * and the alternative is the state this chapter was in before: a PDF open on
 * somebody's second monitor, scrolled to page 197 while the table waits.
 *
 * ── ten entries, and the folder is the join ───────────────────────────
 * One JournalEntry per variant, filed under the folder `VARIANT_FOLDERS` in
 * `src/module/variants.ts` names for it. That is the *only* thing binding a
 * document to a switch, so the strings have to agree exactly and
 * `tools/check-variant-rules.mjs` is what says so — a folder name typed one
 * character off produces a folder Foundry mounts, containing rules nothing
 * will ever offer, and there is nothing on screen to say which of the two
 * spellings is the live one.
 *
 * `sourceKey` is the **variant id** rather than the entry's name, which is the
 * one place this file departs from every other pack source. `build-packs.mjs`
 * derives a stable `_id` from `pack:type:sourceKey ?? name`, and CLAUDE.md's
 * rule is that renaming a card breaks its links and that this is the honest
 * outcome. It is honest for a card, because a card's name is the card. It is
 * not honest here: these ten entries are *the switch's content*, the switch is
 * keyed on `everydayHero` and not on the words "Everyday Hero", and a GM
 * retitling an entry to "Everyday Hero (house rules)" has not made it a
 * different variant. So the id follows the id.
 *
 * ── two sections of the chapter are not here, and cannot be ───────────
 * **Faction Tracking** (p. 190) and **Building Villains Collaboratively**
 * (p. 200) belong to no variant. They are chapter-level GM procedure printed
 * between the frames, `VARIANTS` has no id for either, and inventing one to
 * give them a home would be this file asserting an eleventh switch that
 * `variants.ts` does not have. They are named here so that "why is Faction
 * Tracking missing" has an answer that is not "somebody forgot".
 *
 * ── what is a table, and what is prose ────────────────────────────────
 * Every table the SRD prints is reproduced as an HTML `<table>` carrying a
 * `<caption>`, and the caption is the handle the check tool counts rows
 * against — see `PRINTED_ROWS` in `tools/check-variant-rules.mjs`, which is
 * the SRD's own row counts transcribed rather than re-derived from the markup
 * below. A count taken off the thing being checked is not a check.
 *
 * Three of those tables are printed as **prose** in the book and are tabulated
 * here anyway, which is worth stating out loud rather than leaving as a
 * silent liberty: the Tech-Based gold→Credits conversion (three bullets), the
 * Floating Magic School's six traits for flight (six bold-lead paragraphs) and
 * Western's Dynamite (one bold-lead paragraph). Each is a set of parallel
 * facts with a column structure the prose is already carrying, and each is
 * read at a table by looking one up rather than by reading the run — which is
 * the whole argument this repo makes for a table over a tile in the creation
 * window's equipment step. The wording inside the cells is untouched.
 *
 * ── the text is transcribed, not summarised ───────────────────────────
 * Including the mistakes. The SRD says "Each **nation** can have no more than
 * one major objective countdown" in a section about factions, writes "The
 * dish's name name", "can only harvested", "2 Shard", "using quantum", "see
 * XX" and a doubled full stop, and names one die both "Siphoning Die" and
 * "Siphon Die". None of that is corrected here. `tools/fetch-cards.mjs` keeps
 * a `TYPOS` list for exactly this reason — upstream having fixed a typo and
 * upstream having rewritten the rule around it look identical from here — and
 * a reference document that quietly improves the rule it is quoting is a
 * document you cannot check a ruling against. Where a slip would read as our
 * error rather than the book's, it is marked with an editorial `[sic]` in a
 * `<em class="sic">`, which says the same thing without changing a word.
 *
 * ── one table is a reading and says so on itself ──────────────────────
 * The Tech-Based **Scrap Table**'s column spans are inferred, not seen. See
 * the note built into that page by `scrapInference()` below, and the long
 * version in the research extraction. It is flagged in the document rather
 * than only in this comment because the person who needs the warning is the GM
 * reading the page, not the person reading the pack source.
 */

/* ── the two constructors ─────────────────────────────────────────────
   `_helpers.mjs` has one constructor per Item subtype and nothing for a
   journal, because until now nothing here was one. These live at the top of
   this file rather than joining that one: they are the first of their kind,
   the only caller is below, and a helper with one caller in the file that
   calls it is easier to read than a helper two directories away. If a second
   pack ever ships journals, that is the moment to move them.

   The shape is Foundry v13's `JournalEntryPage`: `text.format` is 1 for HTML
   and 2 for Markdown, and `title.show` is whether the page prints its own
   heading above the content — true everywhere here, because a page in a
   sixteen-page reference is found by its name. */

/** One page of a journal entry. HTML, headed by its own name. */
const journalPage = (name, content, { level = 1, show = true } = {}) => ({
  name,
  type: "text",
  title: { show, level },
  text: { format: 1, content },
});

/**
 * One journal entry — a variant's whole reference.
 *
 * `folder` must be the string `VARIANT_FOLDERS` declares; `sourceKey` is the
 * variant id, for the reason in this file's header.
 */
const journalEntry = (sourceKey, name, folder, pages) => ({
  sourceKey,
  name,
  folder,
  pages,
});

/* ── the standing disclaimer ──────────────────────────────────────────
   Every entry opens with one, and it is not boilerplate politeness — it is
   this system's actual position, stated where somebody will read it.
   `apps/rules.ts` prints a feature verbatim and refuses to parse English into
   behaviour, because parsing English is how a system starts quietly getting
   rules wrong; `variants.ts` says a switch gates availability and never
   enforcement. A supplemental frame is the last place to start automating,
   and a GM who assumes the Endurance Countdown is ticking itself will find
   out at the worst possible moment.

   `provides` is the honest short list of what the system *does* do for this
   variant, and for most of them it is one item long. Overstating it is the
   failure mode that matters: "the system handles this" is a sentence somebody
   plans a session around. */
const notAutomated = (provides) => `
<section class="dh-variant-scope">
<p><strong>These are reference rules. The system does not resolve them for
you.</strong> Everything on the pages that follow is transcribed from the SRD
so it can be read at the table; nothing here is wired into a roll, a track, a
rest or a sheet. If a rule says to tick a countdown, roll a pool of mixed dice
or reduce a damage severity, that is the GM's to do.</p>
<p>What the system does provide for this variant:</p>
<ul>${provides.map((p) => `<li>${p}</li>`).join("")}</ul>
<p>The switch in <em>Configure Settings → Daggerheart</em> gates
<em>availability</em> — it decides whether this variant's content is offered by
the compendium browser and the character creation window. It never changes how
anything resolves.</p>
</section>`;

/** The line every variant can honestly claim, because it is the switch itself. */
const THE_SWITCH =
  "These rules pages, gated by this variant's own switch, so a table not running it is not offered them.";

/** True for the three variants whose gear ships as Items in `variants.mjs`. */
const THE_GEAR =
  "The weapons, armor and consumables printed below also ship as Item documents in the <strong>Variant Equipment</strong> compendium, gated by the same switch — so they can be dragged onto a sheet rather than typed in. The stat lines are the same ones; the features on them are printed text and are not applied for you.";

/* ── the Scrap Table's provenance note ────────────────────────────────
   The one place in this chapter where the extraction is a reading rather than
   a transcription, and the reason it gets a visible note instead of a code
   comment is `card-resources.mjs`'s `said` rule turned outward: an annotation
   that records *what it was read from* lets the next person re-take the
   reading. Here the next person is a GM with the printed page, and the only
   place they will see the warning is on the page itself.

   Every printed *word* was recovered. What is inferred is which columns each
   word spans, measured off character x-offsets in the PDF's content stream
   because the page could not be rendered. Two things support the reading and
   one qualifies it, and all three are in the note, because "this is inferred"
   with no reasoning attached is not something a reader can act on. */
const scrapInference = `
<aside class="dh-variant-note">
<p><strong>Note — the column spans in this table are inferred, not
transcribed.</strong> The SRD's page 196 content stream yields every printed
word of this table but not its cell boundaries: the Metals row emits eight
words for ten columns and the Components row emits six. The spans shown here
(Metals 1–2 / 3–4 / 5 / 6 / 7 / 8 / 9–10, Components 1–2 / 3–5 / 6–7 / 8 / 9 /
10) were derived by measuring each word's horizontal offset against the header
row.</p>
<p>Two things support that reading. The table uses an explicit <em>n/a</em> for
out-of-range results, so Metals carrying <em>n/a</em> at only 9–10 asserts that
1–8 are covered and Components carrying none asserts that 1–10 are — neither
row can simply be short. And both readings put the values in ascending order
(Aluminum → Gold, Fuse → Battery), which is what the rule "a piece of Scrap is
worth a number of Credits equal to the value rolled to acquire it" wants.</p>
<p>What qualifies it: the page was never rendered, so the merges are deduced
rather than seen, and the Components spans are uneven (2, 3, 2, 1, 1, 1).
<strong>Check this table against the printed page 196 before you rely on
it</strong>, the Components row in particular.</p>
</aside>`;

/* ═══════════════════════════════════════════════════════════════════════
   1 · EVERYDAY HERO (SRD pp. 191–192)
   ═══════════════════════════════════════════════════════════════════════ */

const everydayHero = journalEntry("everydayHero", "Everyday Hero", "Everyday Hero", [
  journalPage(
    "Everyday Hero Starting Equipment",
    `${notAutomated([THE_SWITCH, THE_GEAR])}
<p>PCs without access to standard weapons and armor can choose from the
following tables.</p>
<p>These four tables are tier-1 stat lines — the SRD prints no tier ladder for
them — and they stand in for the core tier-1 equipment tables one row at a
time.</p>`,
  ),

  /* 15 rows. */
  journalPage(
    "Primary Physical Weapons",
    `<table>
<caption>Primary Physical Weapons</caption>
<thead><tr><th>Name</th><th>Trait</th><th>Range</th><th>Damage</th><th>Burden</th><th>Feature</th></tr></thead>
<tbody>
<tr><td>Cleaver</td><td>Agility</td><td>Melee</td><td>d8 phy</td><td>One-Handed</td><td>Reliable: +1 to attack rolls</td></tr>
<tr><td>Sharpened Rake</td><td>Agility</td><td>Melee</td><td>d8+3 phy</td><td>Two-Handed</td><td>—</td></tr>
<tr><td>Butcher's Axe</td><td>Strength</td><td>Melee</td><td>d12+3 phy</td><td>Two-Handed</td><td>Heavy: -1 to Evasion</td></tr>
<tr><td>Iron Skillet</td><td>Strength</td><td>Melee</td><td>d8+1 phy</td><td>One-Handed</td><td>—</td></tr>
<tr><td>Pitchfork</td><td>Strength</td><td>Melee</td><td>d10+3 phy</td><td>Two-Handed</td><td>—</td></tr>
<tr><td>Sledgehammer</td><td>Strength</td><td>Melee</td><td>d10+3 phy</td><td>Two-Handed</td><td>Massive: -1 to Evasion; on a successful attack, roll an additional damage die and discard the lowest result.</td></tr>
<tr><td>Cooking Knife</td><td>Finesse</td><td>Melee</td><td>d8+1 phy</td><td>One-Handed</td><td>—</td></tr>
<tr><td>Walking Staff</td><td>Instinct</td><td>Melee</td><td>d10+3 phy</td><td>Two-Handed</td><td>—</td></tr>
<tr><td>Rolling Pin</td><td>Presence</td><td>Melee</td><td>d8+1 phy</td><td>One-Handed</td><td>—</td></tr>
<tr><td>Sickle</td><td>Presence</td><td>Melee</td><td>d8 phy</td><td>One-Handed</td><td>Quick: When you make an attack, you can mark a Stress to target another creature within range.</td></tr>
<tr><td>Forge Poker</td><td>Strength</td><td>Very Close</td><td>d8+2 phy</td><td>Two-Handed</td><td>—</td></tr>
<tr><td>Crop Scythe</td><td>Finesse</td><td>Very Close</td><td>d8+2 phy</td><td>Two-Handed</td><td>—</td></tr>
<tr><td>Fishing Rod</td><td>Agility</td><td>Far</td><td>d6+3 phy</td><td>Two-Handed</td><td>—</td></tr>
<tr><td>Slingshot</td><td>Finesse</td><td>Far</td><td>d6+3 phy</td><td>Two-Handed</td><td>—</td></tr>
<tr><td>Firework Launcher</td><td>Agility</td><td>Very Far</td><td>d6+3 phy</td><td>Two-Handed</td><td>Cumbersome: -1 to Finesse</td></tr>
</tbody>
</table>`,
  ),

  /* 10 rows. */
  journalPage(
    "Primary Magic Weapons",
    `<p><em>All magic weapons require a Spellcast trait.</em></p>
<table>
<caption>Primary Magic Weapons</caption>
<thead><tr><th>Name</th><th>Trait</th><th>Range</th><th>Damage</th><th>Burden</th><th>Feature</th></tr></thead>
<tbody>
<tr><td>Enchanted Hammer</td><td>Strength</td><td>Melee</td><td>d10+1 mag</td><td>One-Handed</td><td>—</td></tr>
<tr><td>Enchanted Mop</td><td>Strength</td><td>Melee</td><td>d10+3 mag</td><td>Two-Handed</td><td>—</td></tr>
<tr><td>Enchanted Scissors</td><td>Finesse</td><td>Very Close</td><td>d10 mag</td><td>One-Handed</td><td>—</td></tr>
<tr><td>Enchanted Broomstick</td><td>Instinct</td><td>Very Close</td><td>d10+2 mag</td><td>Two-Handed</td><td>—</td></tr>
<tr><td>Exploding Potions</td><td>Finesse</td><td>Close</td><td>d8 mag</td><td>One-Handed</td><td>—</td></tr>
<tr><td>Enchanted Forge Lighter</td><td>Instinct</td><td>Close</td><td>d8 mag</td><td>One-Handed</td><td>—</td></tr>
<tr><td>Enchanted Boomerang</td><td>Instinct</td><td>Far</td><td>d6+3 mag</td><td>Two-Handed</td><td>—</td></tr>
<tr><td>Enchanted Kite</td><td>Presence</td><td>Far</td><td>d6 mag</td><td>Two-Handed</td><td>Versatile: This weapon can also be used with these statistics—Presence, Melee, d10.</td></tr>
<tr><td>Whisk Wand</td><td>Knowledge</td><td>Far</td><td>d6+1 mag</td><td>One-Handed</td><td>—</td></tr>
<tr><td>Sparkling Staff</td><td>Knowledge</td><td>Very Far</td><td>d6 mag</td><td>Two-Handed</td><td>Powerful: On a successful attack, roll an additional damage die and discard the lowest result.</td></tr>
</tbody>
</table>
<aside class="dh-variant-note">
<p><strong>Note.</strong> Exploding Potions' Feature cell is emitted blank by
every extraction of the printed page. It is recorded here as <em>no
feature</em>, which is what a blank cell means everywhere else in this table
and what the row visibly is — but it is a reading of an empty cell rather than
a transcription of a dash.</p>
</aside>`,
  ),

  /* 7 rows. */
  journalPage(
    "Secondary Weapons",
    `<table>
<caption>Secondary Weapons</caption>
<thead><tr><th>Name</th><th>Trait</th><th>Range</th><th>Damage</th><th>Burden</th><th>Feature</th></tr></thead>
<tbody>
<tr><td>Large Fork</td><td>Agility</td><td>Melee</td><td>d8 phy</td><td>One-Handed</td><td>Paired: +2 to primary weapon damage to targets within Melee range</td></tr>
<tr><td>Barrel Lid Shield</td><td>Strength</td><td>Melee</td><td>d4 phy</td><td>One-Handed</td><td>Protective: +1 to Armor Score</td></tr>
<tr><td>Table Shield</td><td>Strength</td><td>Melee</td><td>d6 phy</td><td>One-Handed</td><td>Barrier: +2 to Armor Score; -1 to Evasion</td></tr>
<tr><td>Paring Knife</td><td>Finesse</td><td>Melee</td><td>d8 phy</td><td>One-Handed</td><td>Paired: +2 to primary weapon damage to targets within Melee range</td></tr>
<tr><td>Festival Whip</td><td>Presence</td><td>Very Close</td><td>d6 phy</td><td>One-Handed</td><td>Startling: Mark a Stress to crack the whip and force all adversaries within Melee range back to Close range.</td></tr>
<tr><td>Towline Hook</td><td>Finesse</td><td>Close</td><td>d6 phy</td><td>One-Handed</td><td>Hooked: On a successful attack, you can pull the target into Melee range with you.</td></tr>
<tr><td>Flare Launcher</td><td>Finesse</td><td>Far</td><td>d6+1 phy</td><td>One-Handed</td><td>Bright: This weapon temporarily lights up the area the flare lands in.</td></tr>
</tbody>
</table>`,
  ),

  /* 4 rows. */
  journalPage(
    "Armor",
    `<table>
<caption>Armor</caption>
<thead><tr><th>Name</th><th>Base Thresholds</th><th>Base Score</th><th>Feature</th></tr></thead>
<tbody>
<tr><td>Quilted Clothing</td><td>5 / 11</td><td>3</td><td>Flexible: +1 to Evasion</td></tr>
<tr><td>Leather Apron</td><td>6 / 13</td><td>3</td><td>—</td></tr>
<tr><td>Tree Bark Armor</td><td>7 / 15</td><td>4</td><td>Heavy: -1 to Evasion</td></tr>
<tr><td>Baking Tray Breastplate</td><td>8 / 17</td><td>4</td><td>Very Heavy: -2 to Evasion; -1 to Agility</td></tr>
</tbody>
</table>
<aside class="dh-variant-note">
<p><strong>Note.</strong> As with Exploding Potions on the previous page, the
Leather Apron's Feature cell is emitted blank by every extraction of the
printed page and is recorded here as <em>no feature</em>.</p>
</aside>`,
  ),
]);

/* ═══════════════════════════════════════════════════════════════════════
   2 · FEASTS (SRD pp. 192–194)
   ═══════════════════════════════════════════════════════════════════════ */

const feasts = journalEntry("feasts", "Feasts", "Feasts", [
  journalPage(
    "Feasts",
    `${notAutomated([
      THE_SWITCH,
      "Nothing else. The ingredient inventory, the flavor pool, the Prep and Cooking Rolls, the Meal Rating and the cookbook's tokens are all kept by hand — this system has no ingredient Item, no mixed-size dice pool and no Make a Feast downtime move.",
      "In particular, note that a feast-based campaign <em>removes</em> three downtime moves the rest dialog still offers: clear Stress, clear Hit Points and gain Hope. The dialog does not know that and will go on offering them.",
    ])}
<p>You can use the following mechanics for campaigns in which the PCs harvest
ingredients throughout play and use them to cook meals during downtime.</p>`,
  ),

  /* 6 rows (flavors) and 8 rows (example ingredients). */
  journalPage(
    "Ingredients & Flavors",
    `<p>Every ingredient is denoted by a name and a flavor profile comprising 1–3
flavors with their relative strengths. For example, "Mushroom caps: Bitter (1),
Savory (2)."</p>
<p>There are six flavors, each of which is represented by an associated die
size: Sweet (d4), Salty (d6), Bitter (d8), Sour (d10), Savory (d12), and Weird
(d20). A flavor's strength is represented by a value between 1 and 3.</p>
<table>
<caption>Flavors and Die Sizes</caption>
<thead><tr><th>Flavor</th><th>Die</th></tr></thead>
<tbody>
<tr><td>Sweet</td><td>d4</td></tr>
<tr><td>Salty</td><td>d6</td></tr>
<tr><td>Bitter</td><td>d8</td></tr>
<tr><td>Sour</td><td>d10</td></tr>
<tr><td>Savory</td><td>d12</td></tr>
<tr><td>Weird</td><td>d20</td></tr>
</tbody>
</table>
<p>The following list provides examples of ingredients and their flavor
profiles:</p>
<table>
<caption>Example Ingredients</caption>
<thead><tr><th>Ingredient</th><th>Flavor profile</th></tr></thead>
<tbody>
<tr><td>Mushroom caps</td><td>Bitter (1), Savory (2)</td></tr>
<tr><td>Wyvern tongue</td><td>Sour (1), Savory (1), Weird (1)</td></tr>
<tr><td>Ooze marrow</td><td>Sweet (1), Bitter (2)</td></tr>
<tr><td>Direbear meat</td><td>Savory (3)</td></tr>
<tr><td>Acid dragon saliva</td><td>Sour (2)</td></tr>
<tr><td>Cave boar milk</td><td>Salty (1), Savory (1)</td></tr>
<tr><td>Rileroot</td><td>Bitter (1)</td></tr>
<tr><td>Ogre kidney stone</td><td>Sweet (1), Weird (1)</td></tr>
</tbody>
</table>
<p>When a PC acquires an ingredient, they add it to their inventory. The
maximum number of ingredients a PC can hold in their inventory is equal to
their highest trait.</p>
<p>When the PCs cook with an ingredient, they roll a number of dice (of the
flavor's associated die size) equal to the strength of the flavor.</p>`,
  ),

  /* 4 rows (Hit Points guide) and 6 rows (environmental guide). */
  journalPage(
    "Harvesting Ingredients",
    `<p>Ingredients can be acquired from defeated adversaries or the party's
surroundings.</p>
<p>When an edible animal is defeated, the PCs can harvest ingredients from it.
The number of ingredients that can be harvested is determined by the defeated
animal's maximum Hit Points, according to the following table:</p>
<table>
<caption>Hit Points to Ingredients Guide</caption>
<thead><tr><th>maximum hit points</th><th>number of ingredients</th></tr></thead>
<tbody>
<tr><td>1–4</td><td>1</td></tr>
<tr><td>5–7</td><td>2</td></tr>
<tr><td>8–10</td><td>3</td></tr>
<tr><td>12+</td><td>4</td></tr>
</tbody>
</table>
<p class="dh-variant-aside">The gap at 11 is the SRD's own — the printed table
runs 1–4 / 5–7 / 8–10 / 12+.</p>
<p>The GM determines the ingredients gained based on the details of the
narrative. Usually, less powerful adversaries have predominantly Sweet, Salty,
and Bitter flavor profiles, whereas more powerful adversaries tend to be more
Sour, Savory, and Weird.</p>
<p>The PCs can also obtain ingredients by harvesting edible plants and fungi.
Once per rest, each PC can spend a Hope to gather ingredients from their
environment. The GM determines what ingredients they acquire based on the
fiction or by having them roll their Hope Die, then, based on the result, gain
an ingredient with the following flavor profile:</p>
<table>
<caption>Environmental Ingredients Guide</caption>
<thead><tr><th>hope die result</th><th>flavor profiles</th></tr></thead>
<tbody>
<tr><td>1–2</td><td>Sweet (1)</td></tr>
<tr><td>3–4</td><td>Salty (1)</td></tr>
<tr><td>5–6</td><td>Bitter (1)</td></tr>
<tr><td>7–8</td><td>Sour (1)</td></tr>
<tr><td>9–10</td><td>Savory (1)</td></tr>
<tr><td>11–12</td><td>Weird (1)</td></tr>
</tbody>
</table>`,
  ),

  journalPage(
    "Make a Feast",
    `<p>In a feast-based campaign, players can't choose downtime moves to clear
Stress, clear Hit Points, or gain Hope. Instead, they have a new downtime move:
Make a Feast. Each PC who chooses this move can remove ingredients from their
inventory and contribute them to the party's collective meal to gain the
benefits of the resulting feast.</p>

<h2>Preparing the Dish</h2>
<p>To begin cooking, the party designates one PC to be the chef. The chef
combines each contributed ingredient's flavor dice into a flavor pool. For
example, a party might decide to make a steak dinner with the following recipe:
1 serving of direbear meat (3d12), 1 serving of mushroom caps (2d12 and 1d8),
and 1 serving of ooze marrow (2d8 and 1d4). This gives the party 5d12, 3d8, and
1d4 altogether.</p>
<p>The chef makes a Prep Roll by rolling all the dice in the flavor pool and
setting aside any matching values. If there are no matching values, the chef
instead discards a die of their choice. The chef continues making Cooking Rolls
until only one die remains in the flavor pool or all dice have been discarded
or set aside.</p>

<h2>Determining a Meal's Rating</h2>
<p>Once preparation is complete, the chef calculates the resulting Meal Rating.
Each matching set of dice is worth a number of points equal to its matched
value. For example, a d6 and a d8 that rolled matching 3s would be worth 3
points, a d10 and a d12 that rolled matching 4s would be worth 4 points, and a
d8 and a d20 that rolled matching 4s on a different roll would also be worth 4
points. The chef adds the point totals together to determine the meal's Rating.
In this example, the party's meal would have a Rating of 11 (3 + 4 + 4 =
11).</p>

<h2>Eating the Meal</h2>
<p>Each PC who partakes in the meal can clear a number of Hit Points, clear a
number of Stress, and gain a number of Hope such that the total of all three
numbers is equal to or less than the Meal Rating. For example, if the dish has
a Meal Rating of 11, a PC could choose to clear 6 Hit Points, clear 3 Stress,
and gain 2 Hope, and a different PC could choose to clear 5 Hit Points, clear 2
Stress, and gain 4 Hope.</p>
<p class="dh-variant-aside">The SRD prints no table of meal effects. The Meal
Rating above is the whole of it — a budget spent freely across the three
tracks.</p>

<h2>Recording the Recipe</h2>
<p>For a feast-based campaign, the players should choose a small shared
notebook, decorated however they like, to be their cookbook and record the
recipe for each dish they make in it. A recipe includes the following
details:</p>
<ul>
<li>The dish's name name <em class="sic">[sic]</em>, description, and preparation method as invented by the players</li>
<li>The ingredients used to make it</li>
<li>The resulting Meal Rating</li>
</ul>
<p>When the party cooks a dish with the same flavor profile as a recipe in
their cookbook, add a number of tokens equal to the party's tier to the dish's
flavor pool. When the chef would be forced to discard a die from the Flavor
Pool, they can choose to remove a token instead.</p>
<p>As a result, the more practice the characters get making meals with the same
flavor profile, the easier that combination is to prepare.</p>`,
  ),

  /* 20 rows and 20 rows. */
  journalPage(
    "Quick Ingredient Generator",
    `<p>When the PCs harvest an ingredient, roll a d20 for each of the following
tables and use the combination to inspire what they gather. If one of the
options doesn't fit the scenario, choose another that does.</p>
<table>
<caption>What kind of ingredient is it?</caption>
<thead><tr><th>result</th><th>animal</th><th>PLANT/FUNGI</th></tr></thead>
<tbody>
<tr><td>1</td><td>Feet</td><td>Flower</td></tr>
<tr><td>2</td><td>Powder</td><td>Roots</td></tr>
<tr><td>3</td><td>Limb</td><td>Stems</td></tr>
<tr><td>4</td><td>Belly</td><td>Leaves</td></tr>
<tr><td>5</td><td>Fat</td><td>Bulbs</td></tr>
<tr><td>6</td><td>Eggs</td><td>Nuts</td></tr>
<tr><td>7</td><td>Marrow</td><td>Seeds</td></tr>
<tr><td>8</td><td>Tongue</td><td>Bark</td></tr>
<tr><td>9</td><td>Brain</td><td>Berries</td></tr>
<tr><td>10</td><td>Ribs</td><td>Fruit</td></tr>
<tr><td>11</td><td>Organ</td><td>Sap</td></tr>
<tr><td>12</td><td>Flesh</td><td>Pollen</td></tr>
<tr><td>13</td><td>Stones</td><td>Fungi</td></tr>
<tr><td>14</td><td>Eyes</td><td>Nectar</td></tr>
<tr><td>15</td><td>Jelly</td><td>Pods</td></tr>
<tr><td>16</td><td>Horn</td><td>Herbs</td></tr>
<tr><td>17</td><td>Meat</td><td>Algae</td></tr>
<tr><td>18</td><td>Scales</td><td>Moss</td></tr>
<tr><td>19</td><td>Wings</td><td>Grain</td></tr>
<tr><td>20</td><td>Secretion</td><td>Rind</td></tr>
</tbody>
</table>
<p class="dh-variant-aside">The column headings are as printed — lowercase
<em>animal</em>, uppercase <em>PLANT/FUNGI</em>.</p>
<table>
<caption>What's interesting about it?</caption>
<thead><tr><th>result</th><th>Detail</th></tr></thead>
<tbody>
<tr><td>1</td><td>It's particularly tender.</td></tr>
<tr><td>2</td><td>It's still wriggling.</td></tr>
<tr><td>3</td><td>It looks like something it isn't</td></tr>
<tr><td>4</td><td>It has a pungent smell.</td></tr>
<tr><td>5</td><td>It's brightly colored.</td></tr>
<tr><td>6</td><td>It's completely translucent.</td></tr>
<tr><td>7</td><td>It's an odd size or shape.</td></tr>
<tr><td>8</td><td>It has unique markings.</td></tr>
<tr><td>9</td><td>It recoils from the light.</td></tr>
<tr><td>10</td><td>It withers in the dark.</td></tr>
<tr><td>11</td><td>It smells unbelievably good.</td></tr>
<tr><td>12</td><td>It has an unexpected texture.</td></tr>
<tr><td>13</td><td>It's encased in something.</td></tr>
<tr><td>14</td><td>It's filled with something.</td></tr>
<tr><td>15</td><td>It's emitting a colorful gas.</td></tr>
<tr><td>16</td><td>It comes apart in layers.</td></tr>
<tr><td>17</td><td>It must be prepared in a strange way.</td></tr>
<tr><td>18</td><td>It's leathery or cartilaginous.</td></tr>
<tr><td>19</td><td>It's brittle.</td></tr>
<tr><td>20</td><td>It's deadly when consumed raw.</td></tr>
</tbody>
</table>
<p class="dh-variant-aside">Result 3 has no terminal full stop in the SRD and
is reproduced as printed.</p>`,
  ),

  /* 4 rows. */
  journalPage(
    "Advanced Feasting",
    `<p>Once your table is comfortable with basic feasting mechanics, you can give
the PCs opportunities to locate and acquire specific ingredients based on what
they've learned about the world. You might also create special ingredients that
have features. These are rarer than typical ingredients, and can only harvested
<em class="sic">[sic]</em> from Leader or Solo adversaries.</p>
<table>
<caption>Example Special Ingredients</caption>
<thead><tr><th>NAME</th><th>FLAVOR PROFILE</th><th>FEATURE</th></tr></thead>
<tbody>
<tr><td>Diregazelle Skull Marrow</td><td>Sweet (1), Salty (1), Sour (1)</td><td>Built for Speed: +1 bonus to Agility until your next rest</td></tr>
<tr><td>Holy Cow's Milk</td><td>Weird (1)</td><td>Last Drop: When you prepare a dish with this ingredient and there's only one remaining die in the flavor pool, roll it and add the result to the dish's Meal Rating.</td></tr>
<tr><td>Ghost Scorpion Venom</td><td>Sour (1), Savory (1)</td><td>Spicy: If any matching sets from a dish prepared with this ingredient are worth 8 or more points, you can't clear Stress from consuming the resulting dish.</td></tr>
<tr><td>Deathflower</td><td>Bitter (2)</td><td>Risky: If you finish preparing a dish with this ingredient and have no matching sets of flavor dice, you clear all Hit Points and Stress and gain 3 Hope. Otherwise, the dish's Meal Rating is 0 and you must make a death move.</td></tr>
</tbody>
</table>
<p class="dh-variant-aside">"Built for Speed" has no terminal full stop in the
SRD and is reproduced as printed.</p>`,
  ),

  journalPage(
    "Restaurants",
    `<p>A PC can spend up to 2 handfuls of gold during downtime to order food from
a nearby restaurant and choose one of the following downtime moves for each
handful of gold spent: clear Stress, clear Hit Points, or gain Hope.</p>`,
  ),
]);

/* ═══════════════════════════════════════════════════════════════════════
   3 · GRIMDARK (SRD p. 195)
   ═══════════════════════════════════════════════════════════════════════ */

const grimdark = journalEntry("grimdark", "Grimdark", "Grimdark", [
  journalPage(
    "Grimdark Campaigns",
    `${notAutomated([
      THE_SWITCH,
      "Nothing else. Shadow-Touched is not a flag the roll engine reads, so an adversary's 19–20 critical range is the GM's to apply; the PC's scar-count damage bonus is not derived; and the corruption clause replaces a death move, which this system does not implement at all.",
    ])}
<p>You can use the following mechanics when the party explores a vast and grim
world of magical corrupting Shadow punctuated by scattered sanctuaries built
around Sacred Bonfires that emit a halo of safety-providing light.</p>`,
  ),

  journalPage(
    "Shadow-Touched",
    `<p>Adversaries in this campaign can have a feature called Shadow-Touched:</p>
<p><strong>Shadow-Touched — Passive.</strong> This Adversary critically
succeeds on attack rolls of 19–20.</p>
<p>When you introduce a Shadow-Touched adversary, describe how magic has warped
their essence and form.</p>
<p>PCs can also become Shadow-Touched when corrupted by dark magic. A
Shadow-Touched PC gains a damage bonus equal to the number of scars they have
marked. When a Shadow-Touched PC marks their last Hope slot with a scar, they
succumb to corruption and charge into the darkness instead of making a death
move.</p>`,
  ),

  journalPage(
    "Sacred Bonfires & Torches",
    `<p>Sacred Bonfires are vibrant magical pyres lit by the flames of rare and
magical Sacred Torches, each of which carries a fragment of divine power.
Sacred Bonfires burn out unless continuously provided with a bit of kindling,
and can't be reignited without a Sacred Torch. When a Sacred Bonfire is relit,
each PC present gains 3 Hope. A Sacred Bonfire's light repels all but the most
powerful monsters from its immediate vicinity.</p>`,
  ),
]);

/* ═══════════════════════════════════════════════════════════════════════
   4 · TECH-BASED (SRD pp. 195–196)
   ═══════════════════════════════════════════════════════════════════════ */

const tech = journalEntry("tech", "Tech-Based", "Tech-Based", [
  journalPage(
    "Tech-Based Campaigns",
    `${notAutomated([
      THE_SWITCH,
      "Nothing else. Credits do not replace the gold track, Scrap has no inventory, an Iconic Weapon's Upgrade slots are not a pool the sheet counts, and Bonded's level-sized damage bonus is not derived.",
      "The Iconic Weapon itself needs no support beyond what already exists: it is a single weapon Item whose trait, range, damage, burden and features the item sheet already edits, so a player can build theirs there and equip it in the Primary Weapon slot.",
    ])}
<p>You can use the following mechanics for a campaign in which magic has been
supplanted by technology.</p>`,
  ),

  journalPage(
    "Tech Damage",
    `<p>Tech damage is a replacement for magic damage in campaigns where damage is
caused by technomancy. You can reflavor magic attacks as sonic blasts, blinding
flashes of light, swarming nanobots, plasma beams, or any other product of
advanced technology.</p>`,
  ),

  journalPage(
    "Iconic Weapons & Other Tools",
    `<p>The following sections detail how weapons, armor, and other items might
work in a tech-based campaign.</p>

<h2>Iconic Weapons</h2>
<p>Characters don't have access to Daggerheart's normal selection of primary
and secondary weapons during a tech-based campaign. Instead, each character
receives an Iconic Weapon that begins as a simple rod of metal but can be
incrementally modified to suit the wielder's needs.</p>
<p>A player designs their character's Iconic Weapon using an Iconic Weapon
Sheet. For inspiration, see the Motherboard Module sheet in Daggerheart Core or
available online at daggerheart.com/downloads. Each player should take a copy
of the module and complete the following steps:</p>
<ol>
<li>Slide the Iconic Weapon Sheet under the right side of their character sheet so only the fillable section is visible</li>
<li>Make selections about trait, range, and damage</li>
<li>Make up a name and description</li>
<li>Record the weapon's details in the Primary Weapon slot of their character sheet</li>
</ol>
<p>Iconic Weapons are considered two-handed weapons and start with the Bonded
feature:</p>
<p><strong>Bonded:</strong> Gain a bonus to your damage rolls equal to your
level.</p>

<h2>Upgrades</h2>
<p>A character's Iconic Weapon starts with two Upgrade slots at Tier 1 to
indicate that it has evolved from its most basic form. An Iconic Weapon gains
an additional Upgrade slot at each subsequent tier. An Upgrade can be crafted
as a downtime move when a PC has the Parts to do so. See the upcoming "Crafting
&amp; Trading" section for more information.</p>
<p>Each Iconic Weapon begins without any installed Upgrades. A character can
build as many Upgrades as they wish but can't install more Upgrades than the
number of Upgrade slots their Iconic Weapon has. An installed Upgrade is
treated as a weapon feature. During downtime, a PC can freely swap Upgrades
they've already crafted or otherwise acquired.</p>
<p>The Iconic Weapon Sheet includes a selection of basic Upgrades. GMs are
encouraged to make more, using the provided options as a template, and offer
them to the players as appropriate.</p>
<p class="dh-variant-aside">The SRD prints no list of Upgrades. They live on
the Motherboard Module sheet, which is not part of the SRD, so there is nothing
here to reproduce and nothing for this system to ship.</p>`,
  ),

  journalPage(
    "Tech Link",
    `<p>Each tech-based campaign setting includes a worldwide data and energy
network that a PC must connect to in order to perform downtime moves. The
primary way most PCs connect to this network is via a Tech Link, which looks
like a data cable with a hook on one end, that each PC gains at character
creation.</p>`,
  ),

  /* 3 rows — the SRD prints this conversion as three bullets; tabulated here.
     See this file's header for why the three prose-printed tables are
     tabulated at all. */
  journalPage(
    "Crafting & Trading",
    `<p>Gold is not used as a currency in tech-based campaign frames. Instead, PCs
gather Scrap to trade for a currency known as Credits. The Iconic Weapon Sheet
includes areas for tracking both Scrap and Credits. All PCs start with 5
Credits.</p>

<h2>Converting Gold to Credits</h2>
<p>Use the following conversion for Daggerheart when pricing other goods and
services using quantum <em class="sic">[sic]</em>:</p>
<table>
<caption>Gold to Credits</caption>
<thead><tr><th>Credits</th><th>Gold</th></tr></thead>
<tbody>
<tr><td>10 Credits</td><td>1 handful of gold</td></tr>
<tr><td>100 Credits</td><td>1 bag of gold</td></tr>
<tr><td>1000 Credits</td><td>1 chest of gold</td></tr>
</tbody>
</table>
<p class="dh-variant-aside">"using quantum" is the SRD's own text — apparently
a leftover from another frame's currency name.</p>

<h2>Gathering Scrap</h2>
<p>PCs can collect Scrap from defeated tech-based adversaries outside of
combat. Each category of Scrap is represented by a die size. When the PCs
collect Scrap, the GM determines how many of each category they find, which in
turn determines the total dice pool each player rolls. Compare the results of
each player's roll against your campaign's Scrap table to determine the number
of each type they acquire. PCs can also obtain specific pieces of Scrap by
completing NPC contracts, hunting particular adversaries, exploring certain
areas, or purchasing them from special merchants.</p>`,
  ),

  /* 3 rows × 10 result columns. Column spans are a reading — see
     `scrapInference` above, which is printed on the page itself. */
  journalPage(
    "Scrap Table",
    `<p>The table below lists generic outcomes you can replace as needed to suit
your campaign.</p>
<table>
<caption>Scrap Table</caption>
<thead><tr><th>result</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th></tr></thead>
<tbody>
<tr><th scope="row">Shards (d6)</th><td>Gear</td><td>Coil</td><td>Wire</td><td>Trigger</td><td>Lens</td><td>Crystal</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td></tr>
<tr><th scope="row">Metals (d8)</th><td colspan="2">Aluminum</td><td colspan="2">Copper</td><td>Cobalt</td><td>Silver</td><td>Platinum</td><td>Gold</td><td colspan="2">n/a</td></tr>
<tr><th scope="row">Components (d10)</th><td colspan="2">Fuse</td><td colspan="3">Circuit</td><td colspan="2">Disc</td><td>Relay</td><td>Capacitor</td><td>Battery</td></tr>
</tbody>
</table>
${scrapInference}`,
  ),

  /* 3 rows × 4 fight columns. */
  journalPage(
    "Parts Reward Table",
    `<p>Use the following table as general guidance for Scrap rewards after
encounters:</p>
<table>
<caption>Parts Reward Table</caption>
<thead><tr><th>ADVERSARIES</th><th>EASY FIGHT</th><th>STANDARD FIGHT</th><th>DIFFICULT FIGHT</th><th>VERY DIFFICULT FIGHT</th></tr></thead>
<tbody>
<tr><th scope="row">Mostly non-tech-based</th><td>2 Shards</td><td>2 Shards, 1 Metal</td><td>2 Shards, 1 Metal, 1 Component</td><td>2 Shard, 2 Metals, 1 Component</td></tr>
<tr><th scope="row">Mostly tech-based</th><td>2 Shards, 1 Metal</td><td>2 Shards, 2 Metals, 1 Component</td><td>3 Shards, 2 Metals, 1 Component</td><td>3 Shards, 3 Metals, 2 Components</td></tr>
<tr><th scope="row">All tech-based</th><td>2 Shards, 1 Metal, 1 Component</td><td>3 Shards, 2 Metals, 2 Components</td><td>3 Shards, 3 Metals, 2 Components</td><td>4 Shards, 3 Metals, 3 Components</td></tr>
</tbody>
</table>
<p class="dh-variant-aside">"2 Shard" in the top-right cell is the SRD's own
singular and is reproduced as printed. The table is headed <em>Parts</em>
Reward Table although every cell names Scrap; "Parts" is also the word used in
the Upgrades section.</p>`,
  ),

  journalPage(
    "Relics, Crafting, and Trade",
    `<h2>Relics</h2>
<p>Relics are unique pieces of Scrap only found on specific tech-based
adversaries. When the PCs defeat a particularly important or powerful
tech-based adversary, the GM can grant them each a Relic in addition to Scrap
from the table above. Relics should be customized to reflect the adversary from
which they were obtained. Relics are worth 20 Credits and can be used to craft
powerful Upgrades.</p>

<h2>Crafting with Scrap</h2>
<p>PCs can use a downtime move and spend the appropriate Scrap or Relics to
craft Upgrades for their Iconic Weapons or other items. A PC can't craft an
Upgrade until they satisfy its Prerequisites. An Upgrade can always be broken
back into its constituents to reacquire the Scrap used in its creation.</p>

<h2>Buying and Selling Scrap</h2>
<p>By default, a piece of Scrap is worth a number of Credits equal to the value
rolled to acquire it on the table above. This value is unaffected by whether
the party intends to buy or sell it.</p>
<p>Merchants have a limited amount and variety of Scrap for sale, usually 1d10
of each Shard, 1d8 of each Metal, and 1d6 of each Component. When a PC wants to
buy a specific piece of Scrap from a particular merchant, the GM can roll to
determine how many are in stock, subject to the GM's discretion.</p>`,
  ),
]);

/* ═══════════════════════════════════════════════════════════════════════
   5 · WESTERN (SRD p. 197)
   ═══════════════════════════════════════════════════════════════════════ */

const western = journalEntry("western", "Western", "Western", [
  journalPage(
    "Western Campaigns",
    `${notAutomated([
      THE_SWITCH,
      THE_GEAR,
      "Six Shot's six Ammo tokens are not a pool the sheet keeps and do not gate an attack, and Dynamite's Reaction Roll (14) and its doubled damage against objects are the GM's to resolve. Roped is a registered condition with a token mark, applied by a press on the card rather than automatically.",
    ])}
<p>You can use the following mechanics in a western-themed campaign.</p>
<p>The section below is printed under the heading <em>Weapons &amp;
Loot</em>.</p>`,
  ),

  /* 3 rows. */
  journalPage(
    "Primary Weapons",
    `<table>
<caption>Primary Weapons</caption>
<thead><tr><th>Name</th><th>Trait</th><th>Range</th><th>Damage</th><th>Burden</th><th>Feature</th></tr></thead>
<tbody>
<tr><td>Revolver</td><td>Finesse</td><td>Far</td><td>Tier 1: d8+1 phy<br>Tier 2: d8+4 phy<br>Tier 3: d8+7 phy<br>Tier 4: d8+10 phy</td><td>One-Handed</td><td>Six Shot: Place 6 Ammo tokens on your character sheet. Spend 1 Ammo token to make an attack. You can mark a Stress to regain spent Ammo tokens.</td></tr>
<tr><td>Rifle</td><td>Agility</td><td>Very Far</td><td>Tier 1: d8+2 phy<br>Tier 2: d8+5 phy<br>Tier 3: d8+8 phy<br>Tier 4: d8+11 phy</td><td>Two-Handed</td><td>Sightline: Spend 2 Hope to gain advantage on an attack roll.</td></tr>
<tr><td>Shotgun</td><td>Strength</td><td>Very Close</td><td>Tier 1: d6+2 phy<br>Tier 2: d6+5 phy<br>Tier 3: d6+8 phy<br>Tier 4: d6+11 phy</td><td>Two-Handed</td><td>Scattershot: When you make an attack, target all creatures in front of you within range.</td></tr>
</tbody>
</table>`,
  ),

  /* 2 rows. */
  journalPage(
    "Secondary Weapons",
    `<table>
<caption>Secondary Weapons</caption>
<thead><tr><th>Name</th><th>Trait</th><th>Range</th><th>Damage</th><th>Burden</th><th>Feature</th></tr></thead>
<tbody>
<tr><td>Lasso</td><td>Agility</td><td>Very Close</td><td>Tier 1: d4 phy<br>Tier 2: d4+3 phy<br>Tier 3: d4+6 phy<br>Tier 4: d4+9 phy</td><td>One-Handed</td><td>Roped: On a successful attack, you can temporarily Rope the target instead of dealing damage. While Roped, the target is Restrained and Vulnerable, but you must remain within Very Close range of the target. When the target would clear this condition, you can make a Strength Reaction Roll. On a success, they remain Roped.</td></tr>
<tr><td>Small Revolver</td><td>Finesse</td><td>Far</td><td>Tier 1: d6 phy<br>Tier 2: d6+3 phy<br>Tier 3: d6+6 phy<br>Tier 4: d6+9 phy</td><td>One-Handed</td><td>Quick Shot: Spend 2 Hope to gain a +4 bonus to primary weapon damage.</td></tr>
</tbody>
</table>`,
  ),

  /* 1 row — the SRD prints Dynamite as one bold-lead paragraph rather than a
     table; tabulated here for the reason in this file's header, with the
     lead-in sentence kept above it. */
  journalPage(
    "Loot",
    `<p>You can also make the following consumable available in a western-themed
campaign:</p>
<table>
<caption>Consumables</caption>
<thead><tr><th>Name</th><th>Type</th><th>Effect</th></tr></thead>
<tbody>
<tr><td>Dynamite</td><td>Consumable</td><td>You can light this dynamite and toss it within Close range. All creatures within Very Close range of where the dynamite lands must make a Reaction Roll (14). Targets who fail take 1d20+5 physical damage. Targets who succeed must mark a Stress. Dynamite deals double damage to inanimate objects or structures.</td></tr>
</tbody>
</table>`,
  ),
]);

/* ═══════════════════════════════════════════════════════════════════════
   6 · COLOSSAL ADVERSARIES (SRD pp. 198–199)
   ═══════════════════════════════════════════════════════════════════════ */

const colossal = journalEntry("colossal", "Colossal Adversaries", "Colossal Adversaries", [
  journalPage(
    "Colossal Adversaries",
    `${notAutomated([
      THE_SWITCH,
      "Nothing else, and this variant is the furthest from anything the system can hold: a colossus is one creature whose Hit Points and Difficulty live per-segment while its thresholds, Stress and Experiences live on a shared framework, which the adversary schema cannot express. Run each segment as its own adversary Actor and keep the framework's numbers by hand.",
      "Broken and Destroyed are registered conditions with token marks of their own, applied by a press. Neither is derived from a segment's Hit Point track \u2014 what breaks a segment is on the colossus, not on its wounds.",
    ])}
<p>"Colossus" is a special adversary type that uses multiple adversary stat
blocks called segments to represent the body parts of an extremely large
creature. Information and features that apply to the colossus in its entirety
are contained in a separate stat block called the framework:</p>
<ul>
<li>Name</li>
<li>Tier</li>
<li>Description</li>
<li>Motives &amp; Tactics</li>
<li>Size</li>
<li>Segments</li>
<li>Damage Thresholds</li>
<li>Stress</li>
<li>Experiences</li>
<li>Features that apply to all segments</li>
</ul>
<p>Each segment of a colossus has its own stat block, which lists the
following:</p>
<ul>
<li>Name of segment</li>
<li>Adjacent segments</li>
<li>Difficulty</li>
<li>HP</li>
<li>Standard attack</li>
<li>Features</li>
</ul>
<p>Some segments can be Broken. A Broken segment can't use actions or reactions
until the condition is cleared. When a segment marks its last Hit Point, it's
considered Destroyed. A Destroyed segment can't use any of its features. A
colossus is defeated when all its segments are Destroyed, however a colossus's
stat block often details alternative ways to defeat it. By default, a Destroyed
segment is not gone or detached, it's simply non-working.</p>
<p>For example Colossus adversaries and Colossus features, see the "Colossus of
the Drylands" campaign frame.</p>`,
  ),

  journalPage(
    "Segments",
    `<h2>Segment vs. Colossus Effects</h2>
<p>When a feature refers to a segment's name, such as "the Head," it refers
only to that specific part of the colossus. For example, the Head might be
immune to physical attacks or more difficult to climb. When a feature refers to
the colossus's name, it applies to the adversary as a whole. For example, a
reaction feature might trigger an attack after the colossus marks 2 or more Hit
Points from a single attack. This would mean that when any segment marks 2 or
more Hit Points from a single attack, the reaction is triggered.</p>

<h2>Adjacent Segments</h2>
<p>A colossus's stat blocks should indicate which segments are adjacent to one
another. By default, a PC can move from one segment to another only if those
segments are adjacent (see the upcoming "Moving PCs Around a Colossus"
section).</p>`,
  ),

  journalPage(
    "Running Colossus Fights",
    `<p>Battles against colossi have unique rules.</p>

<h2>Scale</h2>
<p>Unlike normal range in Daggerheart, we use a standard form of measurement
when talking about a colossus's scale. (In our case, we use feet—but you should
use whatever you find easiest.) Normal range bands still apply when taking
actions and are at GM discretion as usual, but expressing the height or width
of a creature through recognizable sizes helps the table to understand the
scale of the colossus they're facing.</p>

<h2>Moving PCs Around a Colossus</h2>
<p>During an encounter with a colossus, use the following movement
mechanics:</p>
<ul>
<li>A PC can climb onto a colossus segment unless its stat block indicates otherwise.</li>
<li>Once on a segment, a PC can usually move around and within it without making additional rolls.</li>
<li>To move to an adjacent segment, a PC must make an appropriate action roll (usually Agility or Strength) to leap onto it.</li>
</ul>

<h2>Teamwork</h2>
<p>While fighting a colossus, a PC can initiate any number of Tag Team Rolls in
a single session.</p>

<h2>Using a Colossus in Battle</h2>
<p>Treat each segment of a colossus as a separate adversary when moving the
spotlight. You can spotlight a segment as a GM move, then spend a Fear to
spotlight an additional segment as you would during a fight with regular
adversaries. Some colossi also have actions in their colossus framework; you
can spotlight the framework to use this action as you would spotlight a
segment, but you should highlight the colossus as a whole in the narrative. You
can still spotlight additional segments on your turn.</p>
<p>While a PC is on a segment of the colossus:</p>
<ul>
<li>They have advantage on attacks targeting that segment.</li>
<li>The segment's standard attack cannot be used on that PC.</li>
</ul>
<p>Any features that would pull or push normal adversaries can't move a
colossus; instead, the feature pulls or pushes the PC making the attack. For
example, using a grappler against a colossus can't pull it toward you, but
instead pulls you toward them.</p>
<p>When an effect targets a specific segment, use the Difficulty of that
segment. If an effect targets a colossus as a whole, use the highest Difficulty
amongst all the segments. If a PC's feature targets multiple adversaries, it
can target multiple segments.</p>
<p>If your table uses maps and minis for combat encounters, you can use
notecards to represent the basic shape of a colossus and the layout of its
segments. When a PC climbs onto a segment of the colossus, place their
miniature directly on the notecard.</p>`,
  ),

  journalPage(
    "Leveling Up",
    `<p>By default, the PCs levels up when they defeat a colossus. After defeating
nine colossi, the party will be at level 10 and ready to take on a Final
Colossus. The power of the final colossus is partially determined by the number
of rests the party takes throughout the campaign.</p>
<p>During the campaign, track the increasing power of the final colossus with a
d10 Siphoning Die that starts at 1 and a d100 Power Die that starts at 0. Tick
the Power Die up by one when the PCs take a short rest and by two when they
take a long rest. When the party defeats a colossus, roll a number of d12s
equal to the value of the Siphon Die, and tick up the Power Die by the highest
rolled result, then reset the Siphon Die to 1.</p>
<p>Once nine colossi have been defeated or the Power Die reaches 100, the final
colossus reveals itself. Build it as a Colossus adversary with a Severe
threshold equal to the value of Power Die and a Major threshold equal to half
that value (rounded up).</p>
<aside class="dh-variant-note">
<p><strong>Note — a gap in the printed rule.</strong> The SRD names the same die
both "Siphoning Die" and "Siphon Die", and it never states what
<em>increases</em> the Siphoning Die from 1 — only that defeating a colossus
resets it to 1. Both readings are reproduced as printed rather than
reconciled; the missing trigger is the book's, not this transcription's, and
your table will have to decide it.</p>
</aside>`,
  ),
]);

/* ═══════════════════════════════════════════════════════════════════════
   7 · FLOATING MAGIC SCHOOL (SRD p. 199)
   ═══════════════════════════════════════════════════════════════════════ */

const magicSchool = journalEntry(
  "magicSchool",
  "Floating Magic School",
  "Floating Magic School",
  [
    journalPage(
      "Floating Magic School Campaigns",
      `${notAutomated([
        THE_SWITCH,
        "Nothing else, and unusually little is missing: this variant is almost entirely adjudication. There is no movement resolution in this system for flight to change, the flying artifact is player-authored prose with no stats, and the interruptions are explicitly at the GM's discretion.",
        "Less Lethal Campaigns replaces the outcome of a death move, and this system implements no death moves at all.",
      ])}
<p>You can use the following mechanics for a campaign set at a floating magic
school.</p>`,
    ),

    journalPage(
      "Flight",
      `<p>During character creation, each player creates a magic artifact they can
use to fly. Flying PCs use the normal movement rules and can fly within Close
range as part of an action roll, but they must make an appropriate trait roll
to move beyond Close range or if movement is their primary action. At the GM's
discretion, some threats, such as gaining the Restrained or Vulnerable
conditions, losing their magic artifact, or taking Severe damage, can
temporarily interrupt a PC's ability to fly.</p>`,
    ),

    /* 6 rows — the SRD prints these as six bold-lead paragraphs rather than a
       table; tabulated here for the reason in this file's header. */
    journalPage(
      "Using Traits for Flight",
      `<p>A PC can use any appropriate trait (not just Agility) to move while
flying. The following are some examples of how each trait might be used:</p>
<table>
<caption>Traits for Flight</caption>
<thead><tr><th>Trait</th><th>Examples</th></tr></thead>
<tbody>
<tr><td>Agility</td><td>Swift acrobatics, speed-boosting off an adversary's wake, maintaining an aerodynamic posture, or angling past a winged threat</td></tr>
<tr><td>Finesse</td><td>Focused, subtle, and well-timed adjustments, threading the needle, precision flying, operating finely tuned controls, or deftly weaving between obstacles</td></tr>
<tr><td>Strength</td><td>Blasting through floating debris, holding fast in shifting weather, or slamming into a racing rival</td></tr>
<tr><td>Instinct</td><td>Navigating by sheer intuition, keenly spotting a shortcut, following a migratory current, or sensing hidden danger in the clouds.</td></tr>
<tr><td>Presence</td><td>Flying with natural grace and effortless style, commanding attention, causing a distraction, creating a spectacle</td></tr>
<tr><td>Knowledge</td><td>Charting efficient flight plans, plotting rotational momentum, or deducing the exact timing of a foe's wingbeats</td></tr>
</tbody>
</table>
<p class="dh-variant-aside">The terminal full stops are inconsistent in the SRD
and are reproduced as printed — only the Instinct entry carries one.</p>`,
    ),

    journalPage(
      "Less Lethal Campaigns",
      `<p>In a less lethal campaign, any death move that would normally lead to a
character's demise instead puts them in the infirmary for a few weeks or sends
them home for an extended period of time. While they recover, the PC is
unplayable but not dead.</p>`,
    ),
  ],
);

/* ═══════════════════════════════════════════════════════════════════════
   8 · FAIRY TALE (SRD p. 200)
   ═══════════════════════════════════════════════════════════════════════ */

const fairyTale = journalEntry("fairyTale", "Fairy Tale", "Fairy Tale", [
  journalPage(
    "Fairy Tale Campaigns",
    `${notAutomated([
      THE_SWITCH,
      "Cursed is a registered condition with a token mark of its own. Nothing enforces that it resists an ordinary clear \u2014 what lifts a particular curse is written on that curse, and this system prints the rule rather than adjudicating it.",
      "Transform needs an adversary Actor holding several stat blocks with a pointer to the active one, which the adversary schema cannot express — the workable answer today is one Actor per form with Hit Points and Stress kept on the primary.",
    ])}
<p>You can use the following mechanics in campaigns that center on curses,
queens, and oracles.</p>`,
  ),

  journalPage(
    "Curses",
    `<p>A creature afflicted with a magical curse gains the Cursed condition. The
Cursed condition can only be cleared by magic from a spell, ritual, magic item,
location, supernatural occurrence, higher power, or some combination of these
options. Discovering how to end a curse often requires research, which might
prompt the PCs to undergo a quest for additional information or help from an
NPC.</p>`,
  ),

  journalPage(
    "Transforming Adversaries",
    `<p>"Transform" is a special action that enables an adversary to shift between
multiple stat blocks. By default, the adversary has a primary stat block that
includes stats and features available to the adversary regardless of their
active form. While in a particular form, the adversary has access to the stats
and features contained in that form's stat block and their primary stat block.
Unless noted otherwise, the adversary tracks HP and Stress on their primary
stat block regardless of their active form.</p>`,
  ),
]);

/* ═══════════════════════════════════════════════════════════════════════
   9 · MONSTER HUNTING (SRD pp. 201–202)
   ═══════════════════════════════════════════════════════════════════════ */

const monsterHunting = journalEntry("monsterHunting", "Monster Hunting", "Monster Hunting", [
  journalPage(
    "Monster Hunting Campaigns",
    `${notAutomated([
      THE_SWITCH,
      THE_GEAR,
      "Nothing else. Splintering's live read of your unmarked Armor Slots into both thresholds, Warded's flat subtraction of Armor Score from incoming magic damage — which is a per-armor exception to the core damage rule, where an Armor Slot steps a severity down rather than subtracting — and the Lycanthropy Countdown's rest-driven tick are all kept and applied by hand.",
      "Reanimated moves the loadout limit to 1, and that number <em>is</em> a field the sheet reads: set it on the adjust tab and raise it by one per downtime move, up to five.",
    ])}
<p>You can use the following mechanics for monster hunting campaigns.</p>
<p>The equipment below is printed under the heading <em>Monster Hunting
Equipment</em>, introduced with: "You can make the following weapons and items
available to your players."</p>`,
  ),

  /* 3 rows. */
  journalPage(
    "Primary Weapons",
    `<table>
<caption>Primary Weapons</caption>
<thead><tr><th>Name</th><th>Trait</th><th>Range</th><th>Damage</th><th>Burden</th><th>Feature</th></tr></thead>
<tbody>
<tr><td>Blessed Brass Knuckles</td><td>Strength</td><td>Melee</td><td>Tier 1: d8+1 mag<br>Tier 2: d8+4 mag<br>Tier 3: d8+7 mag<br>Tier 4: d8+10 mag</td><td>One-Handed</td><td>—</td></tr>
<tr><td>Holy Shotgun</td><td>Agility</td><td>Very Close</td><td>Tier 1: d6+2 mag<br>Tier 2: d6+5 mag<br>Tier 3: d6+8 mag<br>Tier 4: d6+11 mag</td><td>Two-Handed</td><td>Scattershot: When you make an attack, target all creatures in front of you within range.</td></tr>
<tr><td>Repeating Crossbow</td><td>Finesse</td><td>Far</td><td>Tier 1: d6+2 phy<br>Tier 2: d6+5 phy<br>Tier 3: d6+8 phy<br>Tier 4: d6+11 phy</td><td>Two-Handed</td><td>Quick: When you make an attack, you can mark a Stress to target another creature within range.</td></tr>
</tbody>
</table>
<p class="dh-variant-aside">Blessed Brass Knuckles and Holy Shotgun deal
<em>magic</em> damage from Strength and Agility rather than from a Spellcast
trait, which is a combination the core equipment tables do not print. It is as
printed.</p>`,
  ),

  /* 3 rows. */
  journalPage(
    "Secondary Weapons",
    `<table>
<caption>Secondary Weapons</caption>
<thead><tr><th>Name</th><th>Trait</th><th>Range</th><th>Damage</th><th>Burden</th><th>Feature</th></tr></thead>
<tbody>
<tr><td>Wooden Stake</td><td>Strength</td><td>Melee</td><td>Tier 1: d8 phy<br>Tier 2: d8+2 phy<br>Tier 3: d8+4 phy<br>Tier 4: d8+6 phy</td><td>One-Handed</td><td>Paired: Gain a bonus equal to 1 + your tier to primary weapon damage to targets within Melee range.</td></tr>
<tr><td>Hallowed Shield</td><td>Instinct</td><td>Melee</td><td>Tier 1: d4 mag<br>Tier 2: d4+2 mag<br>Tier 3: d4+4 mag<br>Tier 4: d4+6 mag</td><td>One-Handed</td><td>Resonant: When you critically succeed on a primary weapon attack, you gain an additional Hope.</td></tr>
<tr><td>Chain Whip</td><td>Presence</td><td>Very Close</td><td>Tier 1: d6+1 phy<br>Tier 2: d6+3 phy<br>Tier 3: d6+5 phy<br>Tier 4: d6+7 phy</td><td>One-Handed</td><td>Hooked: On a successful attack, you can pull the target into Melee range.</td></tr>
</tbody>
</table>`,
  ),

  /* 3 rows. */
  journalPage(
    "Armor",
    `<table>
<caption>Armor</caption>
<thead><tr><th>Name</th><th>Base Thresholds</th><th>Base Score</th><th>Feature</th></tr></thead>
<tbody>
<tr><td>Coffinwood Armor</td><td>Tier 1: 4/10<br>Tier 2: 6/15<br>Tier 3: 8/22<br>Tier 4: 10/31</td><td>Tier 1: 3<br>Tier 2: 4<br>Tier 3: 5<br>Tier 4: 6</td><td>Splintering: Gain a bonus to your damage thresholds equal to your unmarked Armor Slots.</td></tr>
<tr><td>Leather Longcoat</td><td>Tier 1: 5/12<br>Tier 2: 8/18<br>Tier 3: 10/25<br>Tier 4: 12/34</td><td>Tier 1: 3<br>Tier 2: 4<br>Tier 3: 5<br>Tier 4: 6</td><td>Quiet: Gain a +2 bonus to rolls you make to move silently.</td></tr>
<tr><td>Silverweave Armor</td><td>Tier 1: 5/11<br>Tier 2: 7/16<br>Tier 3: 9/23<br>Tier 4: 11/32</td><td>Tier 1: 3<br>Tier 2: 4<br>Tier 3: 5<br>Tier 4: 6</td><td>Warded: You reduce incoming magic damage by your Armor Score before applying it to your damage thresholds.</td></tr>
</tbody>
</table>`,
  ),

  journalPage(
    "Transformations",
    `<p>You can use the following mechanics for introducing the Reanimated,
Vampire, and Werewolf transformations to your campaign.</p>

<h2>Reanimated</h2>
<p>When a character gains the Reanimated transformation, their maximum loadout
is reduced to one. During a rest, they can use a downtime move to raise their
maximum loadout by one until they reach the normal maximum loadout of five.</p>

<h2>Vampire</h2>
<p>You can add the following feature to a prominent vampire adversary's stat
block:</p>
<p><strong>Vampire's Curse — Action.</strong> Make an attack roll against a
target within Melee range. On a success, you can spend a Fear to have this
adversary sink their teeth into the target's neck and try to turn them into a
vampire. Roll a number of d8s equal to this adversary's tier and deal that much
physical damage to the target. Then roll a d6. If the rolled result matches any
of the damage dice results, the target marks all their Stress and gains the
Vampire transformation.</p>
<p>If the player wishes for their character to become a vampire, the attack
roll succeeds automatically. The PC takes the damage, marks all their Stress,
and gains the transformation.</p>

<h2>Werewolf</h2>
<p>You can add the following feature to a prominent werewolf adversary's stat
block:</p>
<p><strong>Wolf's Curse — Action.</strong> Make an attack roll against a target
within Melee range. On a success, you can spend a Fear to have this adversary
viciously bite the target. Roll a number of d20s equal to this adversary's tier
and deal that much physical damage to the target. If the target takes Major or
greater damage from this attack, activate a long-term Lycanthropy Countdown
(6). It ticks down each time the PC takes a rest without using a downtime move
to halt their lycanthropy's progression. When it triggers, the PC gains the
Werewolf transformation.</p>
<p>If the player wishes for their character to become a werewolf, the attack
roll succeeds automatically. The PC takes the damage and activates a long-term
Lycanthropy Countdown (6) regardless of how many HP they marked as a result of
the attack. When the countdown triggers, the PC gains the transformation.</p>`,
  ),

  journalPage(
    "The Hunt",
    `<p>The Hunt is a procedure for preparing and running monsters. The basic
structure of the Hunt comprises five beats (although you can deviate from this
basic structure as appropriate):</p>
<ol>
<li><strong>Arrival:</strong> The PCs are hooked into the adventure with a strange event that implies monster activity.</li>
<li><strong>Investigation:</strong> The PCs follow leads and gather clues to discover the truth of the monster.</li>
<li><strong>Escalation:</strong> The PCs bring together what they've discovered about the monster and develop a plan of action for finding and defeating it.</li>
<li><strong>Confrontation:</strong> The PCs attempt to banish, bind, or destroy the monster using what they've previously learned.</li>
<li><strong>Epilogue:</strong> The PCs wrap up loose ends and move on to their next mission.</li>
</ol>`,
  ),

  journalPage(
    "Making a Monster",
    `<p>To create a creature altered by evil energy and driven to destroy, consume,
or corrupt, answer four questions:</p>
<ul>
<li>What is it?</li>
<li>What does it want?</li>
<li>Where can you find it?</li>
<li>How can you defeat it?</li>
</ul>
<p>Optionally, you can ask: What else should you worry about? The answer to
this question might involve underlings that serve the monster, important
bystanders the monster might endanger, or events and location that might
highlight the monster's strengths, weaknesses, and motivations.</p>`,
  ),

  journalPage(
    "Liminal Clues",
    `<p>A Liminal Clue is a piece of evidence or information that exists in
potential until it manifests through the party's discovery of it. Before a
session begins, the GM should devise 4–6 pieces of information that each point
the party toward answering at least one of the questions asked in "Making a
Monster."</p>
<p>Write each Liminal Clue on a notecard and keep them on hand during the
session. Whenever the PCs delve into danger or explore the mystery in a way
that could reveal the answer to one of the questions, you can refer to your
collection of Liminal Clues. If a clue fits the tone and place, it manifests in
that moment, and you describe how the clue is revealed.</p>
<p>Liminal Clues indicate what manifests, not how or where; they are not bound
to a particular place method of discovery <em class="sic">[sic]</em>. Once
revealed, a Liminal Clue solidifies; record it as an undeniable discovery
that's become part of the world's reality.</p>`,
  ),
]);

/* ═══════════════════════════════════════════════════════════════════════
   10 · HEX CRAWL (SRD pp. 203–205)
   ═══════════════════════════════════════════════════════════════════════ */

const hexCrawl = journalEntry("hexCrawl", "Hex Crawl", "Hex Crawl", [
  journalPage(
    "Hex Crawl Campaigns",
    `${notAutomated([
      THE_SWITCH,
      "Nothing else. There is no hex map object here, so terrain ratings, Travel Days and the river's ±1 adjustment have nowhere to live; the rest dialog does not know that a long rest is barred outside a sanctuary or that three short rests in a row force one; and the Endurance Countdown is not a countdown the system keeps.",
      "Two of this section's rules do at least land on things that exist: an Endurance Countdown that triggers makes a PC <em>Vulnerable</em>, which is a registered condition you can apply to the token by hand, and the Encounter Roll's fallback is a Fear spend, which the Fear strip above the map already does.",
    ])}
<p>You can use the following mechanics for a hex crawl campaign.</p>`,
  ),

  journalPage(
    "The Hex Crawl",
    `<p>Your table can use a map divided into hexagons, or "hex map," to track the
party's movement across a large area, such as a continent. The party moves one
hex at a time in a style of travel called a "hex crawl." Each hex on the map
represents roughly 24 miles of land from one side to another, although
narrative always supersedes literal representation in Daggerheart.</p>
<p>By default, the party travels through the wilderness between sanctuaries or
settlements and resolves encounters along the way. A party can take up to three
short rests while traveling through the wilderness but is restricted from
taking long rests outside a sanctuary.</p>

<h2>Hex Maps</h2>
<p>A Daggerheart hex crawl uses two copies of the same campaign map: a GM's key
map and a player-facing map. The GM fills out the key map beforehand with
important information about each hex the party is likely to encounter in the
next few sessions. This information includes the hex's habitat, terrain, and
potential points of interest or encounters. Meanwhile, the players fill out
their map as the party enters each hex and the GM reveals what it holds, using
the key map as a reference.</p>

<h2>Preparing the GM's Key Map</h2>
<p>To fill out the key map, the GM can choose the contents of each hex,
procedurally generate them, or use a combination of both methods. What follows
is one potential method, in which the GM rolls a set of polyhedral dice to
procedurally generate one multi-hex region at a time.</p>`,
  ),

  /* 12 rows (habitat, covering d20 results 1–20), 13 rows (encounter, results
     2–14) and 4 rows (terrain). */
  journalPage(
    "Filling Wilderness Hexes",
    `<p>Start in any hex and fill out the key map one region at a time by doing the
following:</p>
<p><strong>Roll a d20 to determine the region's habitat:</strong></p>
<table>
<caption>Habitat (d20)</caption>
<thead><tr><th>d20</th><th>Habitat</th></tr></thead>
<tbody>
<tr><td>1</td><td>Blighted by Dark Magic. Roll again to determine which kind of habitat has been blighted. If you roll another 1, the entire region is so corrupted that it's become nigh impossible to traverse.</td></tr>
<tr><td>2</td><td>Underground</td></tr>
<tr><td>3–4</td><td>Aquatic</td></tr>
<tr><td>5–6</td><td>Wetland</td></tr>
<tr><td>7–8</td><td>Grassland</td></tr>
<tr><td>9–10</td><td>Tropical</td></tr>
<tr><td>11–12</td><td>Forest</td></tr>
<tr><td>13–14</td><td>Drylands</td></tr>
<tr><td>15–16</td><td>Rolling</td></tr>
<tr><td>17–18</td><td>Mountain</td></tr>
<tr><td>19</td><td>Frozen</td></tr>
<tr><td>20</td><td>Badlands</td></tr>
</tbody>
</table>
<p>Roll a d12 to determine the region's size (how many contiguous hexes the
region covers). The region's shape can be whatever you want, as long as you
don't encircle empty hexes.</p>
<p><strong>Roll and add the results of a d8 and d6 to determine one type of
encounter the party might face while traveling through the region:</strong></p>
<table>
<caption>Encounter (d8+d6)</caption>
<thead><tr><th>d8+d6</th><th>Encounter</th></tr></thead>
<tbody>
<tr><td>2</td><td>Roll twice and combine the resulting entries.</td></tr>
<tr><td>3</td><td>Fellow travelers</td></tr>
<tr><td>4</td><td>Temporary setback</td></tr>
<tr><td>5</td><td>Powerful adversaries</td></tr>
<tr><td>6</td><td>Extreme weather</td></tr>
<tr><td>7</td><td>Potential adversaries</td></tr>
<tr><td>8</td><td>Territorial beast or pack of creatures</td></tr>
<tr><td>9</td><td>Environmental hazard or obstacle</td></tr>
<tr><td>10</td><td>Enemy NPCs</td></tr>
<tr><td>11</td><td>Wondrous or dangerous site</td></tr>
<tr><td>12</td><td>Lucky break</td></tr>
<tr><td>13</td><td>Settlement or outpost</td></tr>
<tr><td>14</td><td>Loot or treasure</td></tr>
</tbody>
</table>
<p><strong>Roll a d4 to determine the terrain of the region, which determines
how many Travel Days it takes the party to travel into the hex:</strong></p>
<table>
<caption>Terrain (d4)</caption>
<thead><tr><th>d4</th><th>Terrain</th></tr></thead>
<tbody>
<tr><td>1</td><td>Optimal (1 full day of traveling)</td></tr>
<tr><td>2</td><td>Fair (2 full days of traveling)</td></tr>
<tr><td>3</td><td>Rough (3 full days of traveling)</td></tr>
<tr><td>4</td><td>Extreme (4 full days of traveling)</td></tr>
</tbody>
</table>
<p>Roll a d100 to determine a rumor that the party might hear about this region
referencing the result against the Rumors table from the "Journey to Horizon"
campaign frame or a list of 100 rumors you create on your own.. You decide how
true the rumor is and whether the PCs learn it.</p>
<p class="dh-variant-aside">The doubled full stop is the SRD's. The Rumors
table itself is not printed in this chapter — it belongs to the <em>Journey to
Horizon</em> campaign frame — so there is nothing here to reproduce.</p>`,
  ),

  journalPage(
    "Tracking the Party's Location",
    `<p>The party tracks its movement with the player-facing map using the
following procedure. This procedure assumes the PCs are capable wayfinders and
trailblazers, so they know the contents of the hex they are in (their "current
hex") and any hex adjacent to it. If an adjacent hex contains a non-hidden
point of interest, such as a tower, the PCs are usually aware of it as well.
Together, this gives the players enough information to decide which way to
proceed. As always, the GM decides how much information they convey to the
players.</p>

<h2>Travel Days</h2>
<p>This system assumes that, on a full day of traveling, the PCs complete the
following tasks:</p>
<ol>
<li>Break camp, eat breakfast, and pack up shortly before sunrise</li>
<li>Travel overland for about 6–8 hours</li>
<li>Take a short break at midday to eat and get their bearings</li>
<li>Travel overland for another 6–8 hours until about sundown</li>
<li>Make camp, prepare and eat dinner, set a watch, and bed down for the night</li>
</ol>
<p>As needed, various party members scout ahead, forage and hunt, refill
waterskins, repair gear, and keep watch. If you like, you can narrate or even
roleplay these activities, but you don't need to spend valuable table time
describing or tracking these events if your group doesn't find them interesting
or engaging.</p>`,
  ),

  journalPage(
    "Resources & Resting",
    `<p>This procedure doesn't meticulously track rations or other supplies. Travel
moves at the pace of the story, and the party's resources are tracked via
rests. Outside a safe place, such as a sanctuary or permanent settlement, the
party can only take short rests, each of which represents an entire day spent
in one location. Inside a safe place, the party can take a long rest, which
represents multiple days recovering from hard travel and rough sleeping.</p>
<p>Remember that the term "rest" has a specific mechanical meaning in
Daggerheart. Within the fiction, the party still rests (in the colloquial
sense) most nights spent in the wilderness, but they don't gain the mechanical
benefits of a short rest every time they go to sleep. When the party takes
three short rests in a row, their next rest must be a long rest (see XX).</p>
<p class="dh-variant-aside">"see XX" is an unresolved cross-reference in the
published SRD and is reproduced as printed.</p>`,
  ),

  journalPage(
    "Encounter Rolls",
    `<p>When the party enters a hex, roll a number of d6s equal to the hex's
terrain rating. If any of the dice show a result of 1, activate an encounter
you designed during region creation. Otherwise, you can spend Fear to activate
an encounter. You can also change the size of the dice you roll to reflect more
dangerous (d4) or safer (d8) areas.</p>
<p>The party can trigger more than one encounter in a single region. If this
happens, either roll on the Encounter table to generate a new encounter in the
moment or shift an encounter from a region that the party seems unlikely to
pass through, then modify or reflavor it to suit the current situation.</p>`,
  ),

  journalPage(
    "Endurance Countdowns (Optional)",
    `<p>You can heighten the tension of wilderness travel by giving each PC an
Endurance Countdown (6) at the end of a rest. When the party enters a
wilderness hex, each player rolls their Hope Die. If the result is equal to or
lower than the value of their PC's Endurance Countdown, they mark a Stress.
Otherwise, they tick down their Endurance Countdown. When a PC's Endurance
Countdown triggers, they become Vulnerable until their next rest. At the start
of a rest, all PCs' Endurance Countdowns end.</p>`,
  ),

  /* 4 rows. */
  journalPage(
    "Traveling Over Water",
    `<p>For travel on rivers and oceans, use the standard travel mechanics with the
following changes and clarifications:</p>
<ul>
<li><strong>Rivers.</strong> The party can travel across overland hexes with navigable rivers if they acquire passage on an appropriate vehicle (usually a boat). Moving downstream reduces the terrain rating of the hex the party enters by 1. For example, entering a hex with rough terrain would take two days instead of three. Traveling upstream increases the terrain rating of the next hex by 1.</li>
<li><strong>Ocean.</strong> The party can travel through ocean hexes if they acquire passage on an appropriate vehicle (usually a ship). When the party enters an ocean hex, roll a d4 to determine the weather they encounter:</li>
</ul>
<table>
<caption>Ocean Weather (d4)</caption>
<thead><tr><th>d4</th><th>Ocean weather</th></tr></thead>
<tbody>
<tr><td>1</td><td>The party gets a tailwind, and entering the hex takes a day.</td></tr>
<tr><td>2</td><td>The party enjoys fair weather, and entering the hex takes two days.</td></tr>
<tr><td>3</td><td>The party encounters rough waters, and entering the hex takes three days.</td></tr>
<tr><td>4</td><td>The party encounters extreme weather, and entering the hex takes four days.</td></tr>
</tbody>
</table>`,
  ),

  journalPage(
    "Doom Tracks",
    `<p>You can use a Doom Track to represent the growing disasters that might
befall your group's setting if the party acts too slowly. You can make your own
Doom Track using the example track available in Hope &amp; Fear or at
daggerheart.com/downloads for inspiration.</p>
<p>To use a Doom Track, mark a box in the party's tier or below at the end of
each session. You can't mark a nested box until you mark the box it's nested
under. As your table's story develops, you can adjust how many boxes you mark
at the end of a session.</p>
<p class="dh-variant-aside">The example track lives in <em>Hope &amp; Fear</em>
and is not printed in the SRD, so there is nothing here to reproduce.</p>`,
  ),

  /* 7 rows. */
  journalPage(
    "Habitat-Based Features",
    `<p>You can add the following habitat-based features to an adversary:</p>
<ul>
<li><strong>Blighted — Passive.</strong> This adversary is corrupted by magic. When encountered within a similarly affected area, this adversary critically succeeds on attacks with a die roll of 18–20.</li>
<li><strong>Enviromancer <em class="sic">[sic]</em> — Passive.</strong> This adversary can draw upon the wild magic of their surroundings to fuel magical effects. Mark a Stress to activate an effect based on the habitat of their current location (if an effect's damage roll uses the adversary's tier, roll the damage die a number of times equal to their tier and total the results):</li>
</ul>
<table>
<caption>Enviromancer Habitat Effects</caption>
<thead><tr><th>Effect</th><th>Habitats</th><th>Text</th></tr></thead>
<tbody>
<tr><td>Heat Spell</td><td>Desert, Salt Flats, Volcano</td><td>The adversary exudes oppressive supernatural heat. Each target within Very Close range must succeed on an Instinct Reaction Roll. Targets who fail must mark a Stress and take d6 direct magic damage using this adversary's tier.</td></tr>
<tr><td>Overgrowth Spell</td><td>Forest, Jungle</td><td>This adversary unleashes a burst of branches, brambles, or vines in all directions. Each target within Close range must make an Agility Reaction Roll. Targets who fail take d8 physical damage using this adversary's tier and are Restrained until they break free with a successful Strength Roll.</td></tr>
<tr><td>Wind Spell</td><td>Cliffs, Plains, Steppe</td><td>A tornado surrounds this adversary. Each target within Close range must make a Strength Reaction Roll. Targets who fail take d8 magic damage using this adversary's tier and are pushed up to Far range. Until this adversary takes damage, attack rolls against them have disadvantage.</td></tr>
<tr><td>Ice Spell</td><td>Alpine, Glacier, Tundra</td><td>This adversary unleashes daggers of ice. Make an attack against each PC in front of this adversary within Close range. Targets they succeed against take d10 magic damage using this adversary's tier and are Frostbitten until they spend a Hope to clear the condition. While Frostbitten, a PC gains a -1 penalty to their Proficiency.</td></tr>
<tr><td>Poison Spell</td><td>Moor, Swamp, Wetlands</td><td>A cloud of toxic spores explodes from this adversary. Each PC within Close range must succeed on a Strength Reaction Roll or take d6 direct damage using this adversary's tier and become Nauseated until they clear a HP. While Nauseated, a PC can't gain Hope.</td></tr>
<tr><td>Stone Spell</td><td>Canyon, Mountain, Badlands</td><td>This adversary gains a bonus to their damage thresholds equal to their tier until they take Severe damage or use this feature again.</td></tr>
<tr><td>Water Spell</td><td>Riverlands, Sea</td><td>This adversary unleashes a geyser or tidal wave. Make an attack against all targets within Very Close range. Targets they succeed against are pushed to Close range of where they were and mark a number of Stress equal to this adversary's tier.</td></tr>
</tbody>
</table>
<p class="dh-variant-aside">"Enviromancer" is the SRD's spelling. <em>Frostbitten</em>
and <em>Nauseated</em> are both registered conditions with token marks of their
own — a press on the card applies one, and nothing applies it for you.</p>`,
  ),
]);

export default [
  everydayHero,
  feasts,
  grimdark,
  tech,
  western,
  colossal,
  magicSchool,
  fairyTale,
  monsterHunting,
  hexCrawl,
];
