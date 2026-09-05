# Design references and playtest notes

Version 0.1 · Written review completed; table play pending

## Decisions carried into the draft

This package was agreed through the design interview. It creates a broadly usable Gunslinger, rather than converting every feat on Kass's sheet into a class feature. Its central choice is damage or control. Its 3-Hope feature attempts both. Drifter rewards close sword-and-pistol sequences; Sharpshooter rewards position and precision. Artifice is a full nonmagical second domain, and the firearm collection uses narrative reloading.

The package now includes Foundry compendium documents and an Artifice domain registration behind the Gunslinger homebrew package world setting. The switch defaults off. Owned items remain usable when disabled. Recoil and Artifice-Touched have passive automation; situational features use table adjudication. Full artwork, a published print layout, and table testing remain future work. Existing core, additional-class, and campaign content remains in its own compendiums.

## Reference scope

The comparison covers the **13 classes and 26 subclasses currently present in the two local class source files**. Their headers group nine as core and four as Hope and Fear. That describes the repository's organization; it is not a claim that those files contain every class published anywhere as of this date.

| Reference | Use in this package |
| --- | --- |
| [Supplied Homebrew Kit](F:/Download%20Alt/Daggerheart-Homebrew-Kit-v1.0-July-31-2025_5.pdf), PDF pages 3–5 | Simplicity, tactile play, asymmetry, action and reaction terminology |
| Same kit, pages 7–9 | 21-card domain structure, thematic threads, class-neutral abilities, loadout bonus |
| Same kit, pages 11–14 | Domain pairing, Evasion and HP budget, frequent class feature, Hope expenditure, three subclass stages |
| Same kit, pages 20–23 | Equipment comparisons, short weapon features, resource and damage tradeoffs |
| [Official SRD, September 2025 file](https://www.daggerheart.com/wp-content/uploads/2025/09/Daggerheart-SRD-9-09-25.pdf) | Rules terminology, advancement, range, equipment, and condition checks; a specifically dated baseline |
| [Core classes](../../src/packs-src/classes.mjs) | Nine class loops and eighteen subclass progressions |
| [Additional classes](../../src/packs-src/hf-classes.mjs) | Assassin, Brawler, Warlock, Witch and their eight subclasses |
| [Core domain cards](../../src/packs-src/domain-cards.mjs) | Bone, Blade, Valor, and other card comparisons |
| [Core equipment tables](../../src/packs-src/equipment-tables.mjs) | Weapon baselines, armor values, tier progressions, Paired |
| [Additional equipment](../../src/packs-src/hf-equipment-tables.mjs) and [variant equipment](../../src/packs-src/variant-tables.mjs) | Existing firearm models, offhand pistol, and control-weapon precedents |
| [Advancement definitions](../../src/module/config.ts) and [advancement flow](../../src/module/apps/advance.ts) | Reproducible level-five Kass ledger |
| [Heritage source](../../src/packs-src/heritage.mjs) | Katari and Seaborne compatibility |
| [Kass export](F:/Download%20Alt/fvtt-Actor-kass-seVanpv9N01KCpkq.json) | Selected PF2e class, ancestry, feats, lore, and equipment |

The source documents are references, not instructions to change the design process or the user's project. Existing rule names in the tables below identify comparison points. New rules in this package are original homebrew; no new card claims to be an official printing.

## Class and subclass comparison

This matrix records how each existing class informed the draft. It includes every local subclass, not only the martial neighbors.

| Existing class and domains | Subclasses and their distinct play | Relevance and design response |
| --- | --- | --- |
| **Bard: Grace/Codex** | **Troubadour:** selectable songs and party support. **Wordsmith:** persuasion, encouragement, and stronger assistance. | Artifice has one interpersonal repair card. Gunslinger does not gain a party dice pool or broad social expertise merely from swagger. |
| **Druid: Sage/Arcana** | **Warden of the Elements:** elemental manifestations and auras. **Warden of Renewal:** healing and protection. | Artifice devices stay physical, temporary, and limited in function. They do not form a second transformation catalogue or broad healing engine. |
| **Guardian: Valor/Blade** | **Stalwart:** armor and protection. **Vengeance:** retaliation and focus on an attacker. | Gunslinger begins at 6 HP and Evasion 10. Its late defensive tools have positioning, cost, and use limits. Drifter gets no universal retaliation loop. |
| **Ranger: Bone/Sage** | **Beastbound:** an advancing companion. **Wayfinder:** quarry pressure, navigation, and precision. | Sharpshooter does not maintain a marked quarry, gain a companion, or replace navigation expertise. Its angle-based foundation depends on the scene. |
| **Rogue: Midnight/Grace** | **Nightwalker:** concealment and shadow travel. **Syndicate:** contacts and narrative support. | Smoke supplies partial cover, not Cloaked or teleportation. Kass's contacts are an Experience suggestion, not a guaranteed Syndicate-style contact network. |
| **Seraph: Splendor/Valor** | **Divine Wielder:** a spirit weapon and support. **Winged Sentinel:** flight and aerial pressure. | Physical rigging needs anchors and routes; it does not grant general flight. The class has no Prayer Dice, healing pool, or spirit weapon. |
| **Sorcerer: Arcana/Midnight** | **Elemental Origin:** an element's identity and power. **Primal Origin:** altering magical effects. | Gunslinger cannot freely alter a shot's range, targets, and damage together. Against the Odds is still one attack and one target. |
| **Warrior: Blade/Bone** | **Call of the Brave:** courage, danger, and teamwork. **Call of the Slayer:** stored dice and multiple-weapon damage. | Bone/Artifice avoids repeating its domain pair. No Grit Dice recreate Slayer Dice. Drifter rolls one chosen weapon profile and never gains Warrior's blanket burden exemption or level-to-damage bonus. |
| **Wizard: Codex/Splendor** | **School of Knowledge:** card and Experience breadth. **School of War:** combat spell power and protection. | Artifice uses ability cards, not multi-effect grimoires. No chosen-number Hope engine or general card-capacity expansion is added. |
| **Assassin: Blade/Midnight** | **Executioners Guild:** opening burst and finishing a victim. **Poisoners Guild:** purchased on-hit afflictions. | Trick Shot normally replaces damage. It has no poison-like token pool or persistent victim mark. Against the Odds permits a limited combination for a large Hope payment. |
| **Brawler: Valor/Bone** | **Juggernaut:** physical force and resilience. **Martial Artist:** learned stances. | Drifter's narrated sequence grants one attack, not a chain of accumulating combo rolls. Neither subclass introduces a stance sheet. |
| **Warlock: Dread/Grace** | **Pact of the Endless:** survival and suppression. **Pact of the Wrathful:** aggression and reprisal. | No patron, Favor economy, or general failure reroll is attached to the word "luck." Gunslinger remains nonmagical. |
| **Witch: Sage/Dread** | **Hedge:** preparations, remedies, and protective work. **Moon:** lunar magic and control. | Artifice devices overlap in preparation fantasy, but use mundane tools and avoid generating a stash of tradable magical consumables. Its class does not convert arbitrary failures into successes. |

## Closer mechanical benchmarks

| Benchmark | Risk it revealed | Response in v0.1 |
| --- | --- | --- |
| Slayer Dice and Weapon Specialist | Renaming an existing resource or duplicating free secondary damage | No class pool; choose one weapon profile; normal Paired remains a legal equipment bonus |
| Ranger's Focus; Assassin's marked target | Sharpshooter becoming another persistent-mark specialist | Position and visible angle, with no stored aim or quarry |
| Poisoners Guild | Trick shots becoming another paid menu added to every damaging hit | Normal trick shots give up all damage; damage-plus-control costs 3 Hope in advance |
| Western Lasso's control-for-damage trade | Existing variant-equipment precedent for a weapon attack applying control instead of damage | Single effect, Hope cost, range and fiction restrictions; compare impact rather than invent a new condition |
| Forceful Push, Valor 1 | Low-level melee attacks already combine damage and movement | Gunslinger pays for ranged reliability and broader choices; monitor whether it is too costly |
| Whirlwind; existing shotgun features | One shot's control silently multiplying across a crowd | Trick Shot, Against the Odds, and Nothing Wasted exclude added targets and Tag Team rolls |
| Deft Maneuvers; Boost | A subclass granting more free travel than movement cards | Foundation repositioning stays within Melee; longer specialization movement costs Hope |
| Rapid Riposte; Blade's Glancing Blow | Miss recovery stealing spotlight or duplicating free attacks | Finish the Job is once per rest, costs Stress, deals fixed tier dice, and leaves failure consequences intact |
| Bone's Breaking Blow and Wrangle | A basic shot outclassing late teamwork or mass movement | Expose uses normal Vulnerable; Herd moves only one target a short, safe distance |
| Nightwalker's cover and movement | Smoke becoming a low-level invisibility or teleportation substitute | Partial cover only; source can be dispersed; no Cloaked, Hidden, or shadow travel |
| Secondary Shortsword and Small Dagger | Sword/pistol equipment accidentally gaining two full damage rolls | Sleeve Flintlock uses a comparable Paired ladder and smaller die; no extra attack |
| Core firearm Reloading; variant Six Shot | Class relies on waiving a penalty some weapons never had | New collection uses its own reduced, complete profiles with narrative reloads; old profiles remain unchanged |
| Gloves of Alacrity | Reload refunds producing unintended free resources | No Gunslinger feature pays, refunds, or generates resources from reloads |

These comparisons establish useful limits, not proof of equal power. In particular, a temporary condition can be more valuable than several damage dice when it changes which objectives an adversary can pursue.

## Artifice progression rationale

| Thread | Early cards | Later expression | What should remain useful |
| --- | --- | --- | --- |
| Understanding and repair | Fieldwork, Fault Finder, Something Worth Keeping | Running Repairs, Rework, Master Mechanic | Tools, physical insight, and meaningful objects outside combat |
| Devices and sabotage | Make Do, Catch Line, Tripwire | Flash Charge, Breaching Charge, Chain Reaction | Manipulating a fight through prepared or improvised physical means |
| Routes and protection | Smoke Pot, Field Patch | Safety Line, Prepared Ground, Rigged Rescue, Escape Route | Helping the party survive and reach objectives |

Artifice-Touched follows the normal level-seven concentrated-loadout pattern. Impossible Apparatus is an ambitious utility capstone. The domain contains no spells or grimoires, and no card requires a Gunslinger feature. It includes a few fixed Knowledge rolls, but a Finesse-oriented character has choices at every tier.

The domain's scene-long devices remain an area to watch. Too much simultaneous deployed equipment could undermine the low-bookkeeping goal even without a token pool. Keep a deployed card visible, and record how many distinct effects each player actually tracks.

## Initial balance hypotheses

1. **Ranged control might dominate repeat encounters.** Expose and Pin can consume an adversary's attention or improve several allied actions. Test enemies with ranged options and objective-driven behavior; don't automatically spend every spotlight clearing a condition.
2. **Gunslinger might deal too little damage.** It gives up Warrior's permanent damage growth and does not have Blade. Track meaningful HP marks and objective progress, not just damage totals. If it is weak, first tune the frequency or value of its own features before adding a universal damage bonus.
3. **Against the Odds might be too risky.** Three Hope paid before an attack is a real loss on failure. Record activations and failures. A later revision could change payment timing, but v0.1 keeps the agreed up-front expenditure.
4. **Sharpshooter depends on encounter layout.** Open fields devalue its cover feature; firing galleries exaggerate it. Compare open ground, cluttered decks, and vertical terrain before changing the subclass.
5. **Artifice may over-rely on convenient materials.** Track times a card is unusable because of the setting. The tool-kit convention should cover ordinary supplies without producing structures from nothing.
6. **The late protection cards can compound armor.** Test Rigged Rescue with a Stalwart and Impossible Apparatus with several allies behind cover. Their resource costs and setup may or may not offset shared protection.
7. **Nonmagical firearm specialization has a campaign-dependent weakness.** Gunslinger has no Spellcast trait, so the normal restriction on magic-damage weapons still matters. Test adversaries with physical resistance rather than assuming access to existing magic revolvers.
8. **Kass already has another way to expose enemies.** Katari's Retracting Claws can inflict temporary Vulnerable through a melee Agility roll without spending Hope. Compare that option with the firearm's range and Drifter synergies before concluding that Expose is worth its price.

## Interaction checks

| Situation | Required result in this draft |
| --- | --- |
| Trick Shot succeeds with Hope while the PC has no stored Hope | The newly earned Hope can pay its cost; no damage occurs |
| Trick Shot fails | No 1-Hope payment; resolve the ordinary failure and Duality outcome |
| Declared ordinary Trick Shot succeeds but player declines its cost | Normal attack resolves; the declared control does not occur |
| Against the Odds fails | Lose the 3 Hope already spent; this feature itself deals no damage or control. Finish the Job remains available on an eligible Drifter failure |
| Damage-replacing Trick Shot critically succeeds | Normal critical Hope/Stress recovery, but no damage, extra HP mark, or offensive rider |
| Against the Odds critically succeeds | Normal critical damage and the declared control; no extra targets |
| Paired, Rework, or an eligible damage reroll modifies Against the Odds | Apply it normally; these modify its permitted damage |
| A damage-replacing Trick Shot would receive a damage bonus | No damage roll and no bonus damage |
| A weapon normally forces Stress or adds a condition on a hit | Suppress that additional offensive rider when applying Trick Shot or Against the Odds |
| Deck Blunderbuss uses Spread | It cannot also use Trick Shot on that attack |
| A Gunslinger gains Whirlwind through multiclassing | It cannot spread Trick Shot or Against the Odds to additional targets |
| Repeated Expose hits | Vulnerable does not stack; resolve its ordinary duration and clearing |
| An enemy is Pinned | They can still attack or take another action that does not require movement |
| Herd would send someone into a known harmful trap | Ineligible route; choose another route or a different action before rolling |
| Manipulate attacks a rope beside an adversary | Target the rope's GM-set Difficulty; it is not a cheap attack against the adversary |
| Drifter misses and uses Finish the Job | Fixed tier d6 damage once per rest; the original failure still stands; no recursive trigger |
| Thread the Needle targets a complex combination lock | It cannot operate the entire sequence with one shot |
| Smoke Pot is moved to the vault | Its maintained smoke ends; it cannot remain as free off-loadout cover |
| Field Patch or Master Mechanic is moved to the vault after completion | Cleared Armor Slots or lasting mundane repairs are not undone |
| Running Repairs is vaulted | Its temporary repair stops functioning; this is a maintained benefit |
| A critical attack starts Chain Reaction | Copy half its complete damage before the first target's mitigation, including critical damage and bonuses; apply the second target's own mitigation |
| Breaching Charge cannot reach enemies without crossing allies' positions | Use a different point or action; its selective clear-path attack is unavailable there |

These cases were checked against the written rules, not simulated in Foundry. The matrix is also a script for table adjudication tests.

## Playtest procedure

### Characters and equipment

Run the first comparison at levels **1, 5, and 8**. Use the same advancement and equipment budget for each character. Include Drifter, Sharpshooter, Slayer Warrior, and Wayfinder Ranger; then add Poisoners Guild Assassin for a control comparison. Bring in the other classes when testing a relevant interaction, such as armor rescue with Stalwart or damage modifiers from multiclassing.

Use at least one Bone-heavy loadout, one mixed loadout, and an Artifice-heavy loadout at levels where enough cards exist. A character need not pick the same cards for every scene. Follow ordinary swap and recall rules, and charge the relevant Stress when swapping under pressure.

### Scenes

1. **Boarding action:** a crowded deck, rigging, captives, and a moving objective. Test melee sequences, Expose, Disarm, and the difference between winning a fight and completing the rescue.
2. **Open pursuit:** little cover, mobile enemies, and no helpful machinery. Test whether Sharpshooter and Artifice still contribute without specially prepared scenery.
3. **Fortified approach:** partial cover, exposed mechanisms, mixed ranged and melee threats, and one dangerous hazard. Test cover rules, object Difficulties, Herd boundaries, and spreading effects.
4. **Failure under pressure:** a damaged escape vehicle and scarce rest opportunities. Test Knowledge-dependent tools, improvisation, physical materials, and the cost of repeated failed rolls.

Do not set an adversary's Difficulty lower simply because a player describes a clever shot. Establish the actual target and fiction first. A defenseless cord and an armed foe are different targets; they should also produce different consequences.

### Record after each scene

- Attacks attempted, hits, HP marked, and adversaries meaningfully affected by control.
- Hope and Stress spent on each feature, including failed up-front payments.
- Objectives advanced by tools, repairs, movement, or social features.
- Adversary spotlights spent responding to control, and what alternatives they had.
- Number of simultaneously maintained effects and rules lookups per player.
- Features never chosen and situations where a player felt a choice was automatic.
- Exact ambiguous wording, if any, with the table's ruling.

A useful first session is not a balance verdict. Repeat scenes with changed terrain and different players before making broad adjustments. Change one major cost or benefit at a time so the next test can identify what mattered.

## Playtest log

| Session / version | Party and level | Scene | Observation | Proposed change | Retest result |
| --- | --- | --- | --- | --- | --- |
| Pending / 0.1 |: |: | No table sessions run |: |: |

## Review record

- Confirmed the local comparison includes 13 classes and 26 subclasses.
- Confirmed all 21 Artifice cards have levels, Ability type, recall costs, and rules text, with the expected distribution.
- Confirmed six subclass stages and 28 firearm profiles are present.
- Reviewed resource timing, control clearing, multi-target exclusion, physical-device limits, and duplicated effects.
- Revised Against the Odds to distinguish allowed damage modifiers from prohibited additional offensive riders.
- Removed a redundant Sharpshooter cover upgrade; clarified smoke expiry, lasting repairs, and Chain Reaction damage.
- The final structural and arithmetic check results are recorded in `validation.json` beside this document.

Still unverified: table balance, actual printed card fit, artwork, Foundry automation, and play across every possible multiclass combination.
