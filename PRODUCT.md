# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A GM and three to five players at one Foundry VTT table, playing Daggerheart
live on desktop (1080p to 1440p). Sessions are often streamed, so what a
player or the GM reads mid-scene must also read on a 1080p broadcast capture.

- **Players** run one character (sometimes a companion too) and want to act
  without opening their sheet: roll, spend Hope, mark tracks, play cards.
- **The GM** runs adversaries and needs to see every PC's state at a glance.

## Product Purpose

GLUniverse — Daggerheart is an unofficial Foundry VTT game system for
Daggerheart. It draws the rules as objects a table can press: cards, tracks,
pools, plates. The bottom HUD exists so the whole of *play* happens without
the character sheet; the sheet stays the place a character is authored.

## Positioning

The rules are printed and pressed, not parsed and automated. Every action a
card offers is an authored, reviewable reading with the words it came from
(`said`), and the system declines out loud what it cannot represent honestly.

## Operating Context

- Foundry VTT v13 and v14, rendered inside somebody else's application: our
  styles live in the `system` cascade layer and every rule is scoped to `.dh`.
- The map is the shared focus of the table. Chrome sits at the screen edges:
  the Fear strip docked top, the chat sidebar right, the token chips on the
  board.
- Companion tools: the GLUniverse Suite module (`gluniverse-foundry-modules`)
  and the GLUniverse stream kit, which draws the party for the broadcast.

## Capabilities and Constraints

- Svelte 5 sheets; the design system in `design/` is authored as standalone
  study pages and ported into `styles/` and `src/module/ui/` by scripts.
- Foundry sizes every `<button>` to 28px in its `elements` layer; every control
  must state its own metrics.
- Foundry's chat sanitiser strips `<svg>` and `url()` from stored messages.
- Terminology follows the rulebook: Hope, Fear, Stress, Hit Points, Armor
  Slots, Evasion, thresholds (Minor/Major/Severe), domain cards, loadout and
  vault, Experiences, Difficulty.

## Brand Commitments

- The suite's design language is Ink and Signal
  (`/home/frostnoxia/gluniverse-foundry-modules/DESIGN.md`). This system hosts
  its own objects inside that frame; Daggerheart's own hues (Hope gold, Fear
  violet, the nine domain hues, wound/strain/plate) act as its signals.
- Rules text and card art are Darrington Press's; see
  `assets/cards/CREDITS.md`. Equipment has no art and draws type glyphs.

## Evidence on Hand

- Card art and credits: `assets/cards/`. Condition marks: `assets/conditions/`.
- Compendium content: `src/packs-src/`.
- No user research, testimonials or usage metrics exist; do not invent any.

## Product Principles

1. **Play without the sheet.** Everything a player does in play is reachable
   from the HUD; the sheet is for authoring.
2. **Never cover the map.** The HUD stays compact and at the screen's edge; the
   map is what everybody is looking at.
3. **One implementation.** The HUD, the sheet and the chat card call the same
   code for every action, so they can never disagree.
4. **Rules print, never guessed.** Rules are shown verbatim and act on a press;
   nothing is automated from parsed prose.

## Accessibility & Inclusion

Nothing under 11px (Ink and Signal's floor). Respect the system's motion
setting and `prefers-reduced-motion`. Picture-only readouts carry a sentence
for assistive technology.
