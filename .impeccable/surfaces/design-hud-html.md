---
version: 1
slug: "design-hud-html"
primary_target: "design/hud.html"
related_targets: ["design/seat.html"]
---

# Surface: the bottom HUD (player and GM)

Mode: Operate. Code-led (Operate surface; no image generation in this session).
Scope: `design/seat.*` (the ringed party seat) and `design/hud.*` (the bottom HUD), study pages first; Foundry wiring follows in later PRs.

## Brief
- Audience: players running one character, and the GM running adversaries, mid-scene, often on stream.
- Job: play without the sheet. Read every PC's state at a glance; act (roll, spend, mark, play a card) from the bar.
- Constraints: 96px bar, never taller; nothing under 11px; every button states its own metrics (Foundry's 28px floor); scoped to `.dh`; reuse GEM/setPool, COMPACT, the peek, the roll popover.
- Pinned by the user: Ink and Signal frame hosting Daggerheart's objects; portrait breaks out above the bar (Sims-style); Hope more prominent than HP/Stress/Armor; tracks as compact strips; party as stream-kit partial rings; drawers 2x3; peek with action strip.

## Direction contract
THESIS: The HUD is a single dark instrument rail on the bottom edge where the character stands *on* it, not inside a frame. It refuses the MMO action-bar arrangement of equal slot squares; every region has the shape of the thing it holds.
OWN-WORLD: Ink and Signal plates (ink-1 ground, 1px inset hairlines, bottom-right cut) carrying Daggerheart's own signals only: Hope gold gems, wound red / strain cyan / plate steel strips, Fear violet, domain hues on cards. Google Sans Flex type at 11/12/13/15/22, tabular numerals.
STORY: A player glances down and knows in one look how much Hope they have and how hurt they are; they press a trait, a weapon or a card without opening a window. The GM sees the party as a row of rings and an adversary as a Difficulty diamond with its moves.
FIRST VIEWPORT: Bottom-left, a 150px plinth with the portrait rising ~75px above the bar; right of it the vitals plate led by a row of six large Hope gems and its numeral, then three 5px strips and the threshold line; then the six trait tiles over the weapon row and the Hope ability; then the hand of five compact cards fanned; drawer tiles at the right end. Ringed party seats stack above the plinth.
FORM: Instrument rail (user-pinned layout, first on the ordered list). seed: rolled 763279d51158727fe1256bd19751332e (dealt 4,3,2), not taken — the composition was fixed by the user in the grilling round (rail, plinth breakout, hand, drawers, party stack, GM panel), so there was no structural choice left to deal.
SIGNATURE: Hope as light. Gaining Hope lights a gem and a halo behind the figure's head and shoulders; spending one dims both, linearly, one step per Hope. The figure's backlight is the Hope pool. (Revised during build: light at the portrait base either vanished under the nameplate shade or bleached the face.)
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
