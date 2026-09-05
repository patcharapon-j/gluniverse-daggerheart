# Gunslinger playtest package

Version 0.1 · 5 September 2026 · Original, unofficial homebrew · Not yet table-tested

Gunslingers change a fight with a shot: a blade knocked aside, a route opened, a dangerous enemy driven out of position. Their Bone and Artifice domains combine physical skill with practical ingenuity. The Drifter fights with blade and pistol; the Sharpshooter finds the angle everyone else missed.

This is the editable playtest package agreed during the design interview. It contains complete rules for table play and ships in the Foundry system as optional content.

## Enable in Foundry

The GM can open **Game Settings → Configure Settings → GLUniverse — Daggerheart** and enable **Gunslinger homebrew package**. It is off by default. The switch adds Gunslinger, Drifter and Sharpshooter, all 21 Artifice cards, 28 firearm profiles, and the Gunslinger Playtest Rules journal.

The content appears in character creation, the domain-card picker, and the compendium browser. Its two dedicated compendiums also appear in the sidebar. Changing the switch closes open creation and browse windows so they can load the current choices. Disabling the package hides new choices; existing character items, loadouts, and their passive bonuses remain usable.

Weapon traits, ranges, damage dice, tier, burden, equipping, and card loadouts use the normal system controls. Recoil's Evasion penalty and Artifice-Touched's conditional Finesse bonus apply automatically. Situational costs, limited uses, advantage, Blade and Powder, Paired, trick-shot conditions, movement, and Artifice devices require the normal roll controls and table adjudication. There is no automated ammunition or reload counter. When using the Sleeve Flintlock's Paired feature, enter its bonus once in the primary weapon's damage roll against a target within Melee range.

The editable rules below generate the two compendium sources. After editing them, run `npm run gunslinger:sync`, then `npm run build`. `npm run gunslinger:check` verifies the generated content, availability switch, and supported passive bonuses. This integration has automated checks; it still needs a live Foundry playtest.

## Read and play

1. [Class and subclasses](class.md): class features, all six subclass cards, character prompts, and adjudication examples.
2. [Artifice](artifice.md): the full 21-card domain, levels 1–10, including recall costs.
3. [Firearms](weapons.md): six primary firearm families across four tiers, plus a secondary pistol option and equipment guidance.
4. [Kass](kass.md): a level-one starting build and a level-five conversion example, with the assumptions identified.
5. [Design and playtest notes](design-notes.md): references, comparison against all 13 local classes and 26 subclasses, interaction checks, and a playtest procedure.

Use the regular Daggerheart character creation, advancement, loadout, rest, damage, range, and spotlight rules except where this package explicitly provides a feature. Artifice cards use the normal domain-card rules. Its card type is **Ability** throughout; Gunslinger has no Spellcast trait.

## Package conventions

- **Tier 1:** level 1. **Tier 2:** levels 2–4. **Tier 3:** levels 5–7. **Tier 4:** levels 8–10.
- Weapon damage such as **d6+1** means roll a number of d6s equal to Proficiency, then add 1 once. A fixed card expression such as **2d8** is exactly two d8s; it does not scale with Proficiency.
- **Once per rest** refreshes after a short or long rest. **Once per long rest** refreshes only after a long rest. A use is consumed when you activate the feature, unless it explicitly triggers on success.
- **Temporary** uses the game's normal temporary-effect rules. An adversary can normally use its spotlight to clear a temporary condition. Restrained limits movement; it does not stop attacks or other actions.
- A feature that moves a character without a roll does not teleport them or bypass a physical barrier. The required route must exist. Movement can still trigger other features unless the rule explicitly says otherwise.
- A roll's Fear and normal failure consequences still apply when a feature grants a follow-up benefit. Additional damage rolls, tool descriptions, and narrated weapon sequences do not grant extra action rolls or extra spotlight.
- Tools and devices are physical. Characters carry ordinary working tools and use available materials. A feature gives only its stated benefit; it does not produce valuable materials, ammunition stocks, or additional consumable items.

## What the prototype is testing

The central hypothesis is that choosing control instead of damage creates enough value to support a martial class without a permanent damage bonus. The largest open balance questions are ranged condition repetition, the value of Sharpshooter's cover advantage, and whether Artifice is useful enough outside scenes full of machinery.

The first draft deliberately adds no grit pool, ammunition counter, aiming counter, or reload state. The ordinary Hope, Stress, loadout, and rest limits carry the costs. Individual deployed Artifice cards can sit on the table to identify their active device.

Changes after play should be recorded in [the playtest log](design-notes.md#playtest-log). Version 0.1 is a starting point for that work, not a claim of established balance.
