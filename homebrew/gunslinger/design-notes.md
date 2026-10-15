# Gunslinger v2 design notes

Draft 4 replaces the v0.1 package (Bone + Artifice, the Drifter and the Sharpshooter, 28 workshop firearms) entirely.

## In the system

These Markdown files are the design record. The rules text ships from `src/packs-src/gluniverse-gunslinger.mjs`, word for word, and the two are kept in step by hand.

- **Where it lives:** the class and Corsair in the `classes` pack, Flint in `domains`. Everything is stamped with the `gluniverse` content source, so the GM's content library switches it together with Rattin and Avori. The v0.1 packs, their setting and the sync script are gone. Artifice stays registered as a domain so cards a character already holds still load.
- **Marks:** `design/assets/domains/flint.svg` and `design/assets/classes/gunslinger.svg`, generated with the Codex CLI's image tool and traced with potrace. Flint's hue is `#c0462a`. No card art yet.
- **Presses** (`card-actions.mjs`): Quickdraw pays 3 Hope. Expose and Pin each pay a Stress and put Vulnerable or Restrained on the GM's selected targets. Covering Fire applies the new **Suppressed** condition. Infamy rolls Presence (15) and takes a Fear on a success. Every other card that costs something has its pay, roll or clear button. What has no kind (attack rolls, the target's Stress, one-roll bonuses, the swapped Hope Die) is declined with a reason.
- **Tracking** (`card-resources.mjs`): eleven once-per budgets, each spent by the press it limits. Grit is a token pile capped at Proficiency that a long rest clears. The Revolver's six Ammo tokens were already tracked on the weapon.
- **Passive:** Flint-Touched gives +1 Finesse with four Flint cards in the loadout.
- **Checks:** `tools/check-gunslinger.mjs` asserts the shape, the wiring and the presses. The coverage ratchets (`check-actions`, `check-resources`, `check-card-damage`, `check-passives`) read every rule unit like any printed card.

## Sources

- **Daggerheart SRD 2.0** (2026-08-25): class shape, wording, Western Campaigns weapons (p. 197), temporary tags.
- **Homebrew Kit v1.0** (2025-07-31): class and domain budgets, Recall Cost norms, the one-token-card guidance, wording order.
- **The 189 printed domain cards** in `src/packs-src/official-cards.json`: the comparison set below.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Domains | Flint (new, primary) + Bone | Bone is all abilities, so the class has no Spellcast trait (the Brawler's arrangement). Bone moves you and Flint aims you. |
| Evasion / HP | 11 / 6 = 17 | One over the Kit's 16 baseline, the same total as the Warrior and Assassin. The class feature costs no resource unless it is Expose or Pin. |
| Hope feature | Quickdraw, 3 Hope | SRD 2.0 defines the Hope feature as a 3-Hope class feature. Compare Bone-Touched's 3-Hope "that attack fails": Quickdraw is weaker against the incoming attack (disadvantage, not failure) but adds your own attack. |
| Class feature | Call Your Shot | A risk-for-reward wager no printed class does. |
| Arsenal | SRD 2.0 Western guns | Covers the missing tier-1 firearm. Features say "ranged weapon", so core guns work too. |
| Subclass | Corsair only | The single reference character is Kass. A second subclass is noted below. |

## Call Your Shot calibration

+2 Difficulty costs 11–15 points of hit chance (2d12 + trait, criticals counted):

| Trait | D11 | D13 | D15 | D17 |
| --- | --- | --- | --- | --- |
| +1 | 78% → 65% | 65% → 50% | 50% → 36% | 36% → 25% |
| +2 | 83% → 72% | 72% → 58% | 58% → 43% | 43% → 31% |
| +3 | 88% → 78% | 78% → 65% | 65% → 50% | 50% → 36% |

A successful called shot deals damage with +1 Proficiency. That pays back the lost hit chance at tiers 1–3 and breaks even at tier 4, so the option is the profit and the wager is real against high-Difficulty solos. Expected HP per attack (simulated, Revolver, median adversaries): uncalled 1.17 / 1.20 / 0.94 / 0.53 at levels 1 / 4 / 7 / 10, called about 1.43 / 1.07 / 0.86 / 0.51. Warrior is 1.64 / 1.51 / 1.28 / 0.92.

Expose and Pin cost a **Stress**, not a Hope. Hope is reserved for Quickdraw and Flint, which is where round-1 play ran dry. Vulnerable on two allied attacks is worth about 0.34 HP at tier 1. That is in line with *Forceful Push* (a Hope) and well under *Square Up* (3 Hope, no roll).

## Flint, card by card

Recall average by level: L1 0.33, L2 1, L3 1, L4 1, L5 1.5, L6 1.5, L7 1, L8 1.5, L9 2, L10 2.5. That is on or a little above the printed curve. The only 3 is Last Word, which vaults itself.

| Card | Nearest printed | Reading |
| --- | --- | --- |
| Draw a Bead (1) | Ranger's Focus; *Deadly Focus* | About 1.1 HP per Hope over three attacks at tier 1, on the printed rate. Reactions don't break the bead. |
| Under Fire (1) | *Signature Move* (Bone 5) | Nerve: the hit you take buys a d20 Hope Die. Not printed at level 1, and gated on Major damage. |
| Cold Read (1) | *Know Thy Enemy* | Social, once per rest, no combat stats. |
| Long Shot (2) | *Menacing Reach* (Warlock) | The one card that rewards distance. Permanent and Far-only, plus a d6 at Very Far. Filler for Corsair; it belongs to the future long-range subclass. |
| Name the Stakes (2) | *Inevitable* (Valor 6) | Advantage now, 2 Stress if it fails. |
| Covering Fire (3) | *Goad Them On* | A lasting temporary state, distinct from Disarm's single attack. |
| Grit (3) | *Know the Tide* (Seaborne), deliberately avoided | The token card. It feeds on failing with Fear and pays in damage dice, not roll bonuses. |
| Trick Shot (4) | Western *Dynamite*; *Whirlwind* | A Hope per use against an object at Difficulty 12. Adversaries only. About 2.5 HP per Hope, level with Whirlwind. |
| Stare Down (4) | *Goad Them On* | Social and combat, once per rest. |
| Pick Your Spot (5) | *Cruel Precision*, *Rain of Blades* | +16% over Cruel Precision while active. The condition must already be on the target. |
| All In (5) | *Full Surge* | Once per long rest, Stress per Hope if it fails. |
| Shoot It Out of Their Hand (6) | none | Disables one Action feature until the GM pays a Fear. |
| Nothing Left to Lose (6) | *Adrenaline* (Nightwalker) | Advantage only. The damage half was cut. |
| Flint-Touched (7) | *Bone-Touched*, *Stealth Expertise* | The printed template. |
| Steady Hand (7) | none | Ranged disadvantage immunity. Long Shot no longer overlaps it. |
| Killshot (8) | *Breaking Blow*, *Ruthless Predator* | Paid after a hit: about 0.3 HP per Stress. Recall 2, and it ignores resistance, so it isn't a trap against resistant solos. |
| Poker Face (8) | *Deft Deceiver* | Belief until disproved, never compulsion. Stakes 2 Stress. |
| Through and Through (9) | *Hold Them Off*, *Splintering Strike* | Once per rest, so it stays under the Ranger's Hope feature. |
| Parley (9) | none | Once per session, with clear end conditions. |
| Deadeye (10) | *Reaper's Strike* | The single long shot: advantage, an automatic critical, +2 HP. About 2.7 HP, 26% over Reaper's Strike a level lower. |
| Last Word (10) | *Unbreakable* | Always saves you, but heals less: 2 HP on a hit and 1 on a miss, against Unbreakable's d6 (3.5 on average). In exchange you get a maximum-damage shot. A different trade, not a better card. |

Social-nerve cards are Cold Read, Stare Down, Poker Face and Parley. All four are usage-limited, and two stake Stress.

## Testing log

### Round 1 (draft 2)

Three reviewers ran: a balance Monte Carlo (200k trials per cell), a uniqueness and theme pass against all printed cards, subclasses and SRD 2.0, and three dice-rolled play scenes at levels 1, 5 and 9. All three said NEEDS WORK; fun was 7/10. What changed:

- **Answer for It** dealt full weapon damage for 1 Stress with no roll and fired about five times a fight, roughly a free kill each fight. It now needs an attack roll and deals 1 HP.
- **Hope starvation:** Expose and Pin moved from Hope to Stress.
- **Drive** did nothing at range, so it became **Rattle**. Called shots gained +1 Proficiency, because the base damage ran 25–42% under the Warrior.
- **Quickdraw** now always imposes disadvantage, with damage only on a hit. It states timing, Hope and Fear generation, and the spotlight.
- **Duplicates replaced:** Steel Nerves copied Seaborne's *Know the Tide* and became **Grit**. Ricochet was Returning Blade's feature and became **Trick Shot**. Double Tap was the *Quick* stance and became **Shoot It Out of Their Hand**. Clear Line was made dead by Steady Hand and became **Long Shot**.
- Through and Through is now once per rest. Killshot is paid after the hit. Deadeye is a single long shot. Last Word always saves. Nothing Left to Lose lost its damage half.
- Poker Face no longer compels belief, and Parley got clear end conditions.
- **Corsair:** Sea Legs became Unshackled (Kass the ex-slave). Steel and Shot dropped its no-op Finesse clause. All Hands clears 2 Stress. Infamy rolls against a flat 15.

### Round 2 (draft 3)

Balance said GOOD. Corsair's damage per fight is level with the Warrior (9.2 / 9.4 / 7.8 / 4.9 HP at levels 1 / 4 / 7 / 10, against the Warrior's 9.4 / 8.4 / 7.1 / 5.0), behind the Ranger and ahead of the Brawler, Assassin and Rogue. Quickdraw comes to 1.3–2.2 HP dealt plus prevented, under Hold Them Off. Corsair wants about twice the Stress it has, which makes the spend a real choice; going Vulnerable is paid back by Nothing Left to Lose.

Play scored 8/10 and said GOOD once Answer for It was capped. Every call option got used: Rattle is the default, Disarm is for heavy hitters, Expose and Pin decide fights. Quickdraw fired twice as often as in round 1.

Uniqueness said NEEDS WORK, for Last Word alone: it had become a strictly better *Unbreakable*.

What changed:

- **Answer for It:** once per GM turn, and it states Hope and Fear generation and what happens to the turn.
- **Quickdraw:** covers multi-target attacks and states the GM's turn continues. The disadvantage still lands even when your shot misses. Balance and play both wanted that; it stays under *Hold Them Off*.
- **Pin:** grounds a flying target.
- **Two Birds:** stays at +2 Difficulty. At +3 it hit about 15% against tier-4 solos and was never chosen.
- **Trick Shot:** a Hope per use, Difficulty 12 object, adversaries only.
- **Killshot:** Recall 2, ignores resistance. **Deadeye:** +2 HP and "ignoring your weapon's range". **Last Word:** saves only on a hit.
- **Wording:** Long Shot uses the printed range-step phrasing, Pick Your Spot is clearer, and Parley stakes a Stress.

Known soft spot: a flying, physically resistant tier-4 solo frustrates any gun build. Killshot's resistance clause and Pin's grounding are the answers in the kit.

### Round 3 (draft 4)

Both the uniqueness and balance reviewers said GOOD, with no regressions. Final changes:

- **Last Word:** clears 1 HP on a miss rather than falling back to a death move. Hit-only saving came to 0.86 HP per use, too weak; always-save at 1–2 HP still heals less than Unbreakable.
- **Trick Shot:** each object works once per scene.
- **Deadeye:** "treat it as a critical success", so the Hope and the cleared Stress are intended.
- **Killshot:** names resistance.

The answer-capped Corsair comes to 10.7 / 9.1 / 6.5 HP per fight (its own damage plus ally HP saved) at levels 4 / 7 / 10. Its own damage stays within about 12% of the Warrior.

**Watch in playtest:** Two Birds at +2 Difficulty is about 1.5× a printed Mastery, and almost all of that is support. If Corsair's called shots carry tier-4 tables, raise it to +3.

## The missing second subclass

A second subclass should cover what Corsair does not: **long range and patience**. That means a rifle at Very Far range, rewarded for not moving and for setting up the shot (the old v0.1 Sharpshooter's territory). The class has been balanced with only Corsair in mind and should be re-checked when the second arrives.

## Kass

Kass's pronouns are inconsistent in the Ourolyn vault. These notes use they/them until Kass's player confirms.
