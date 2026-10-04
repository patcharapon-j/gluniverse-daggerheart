# The item marks

`design/assets/types` holds every mark an Item can wear. `BRIEF.md` next to
this file is how they are drawn; this is what they are and how they are
reached.

## Two sets

**The kinds.** One mark per Item subtype: `ancestry`, `community`,
`transformation`, `primary`, `secondary`, `armor`, `gear`, `consumable`,
`loot`, `feature`, plus `class`, `subclass` and `domain-card`, which a card
wears only when it names a domain this system has no art for. These are
listed in `GLYPHS` in `src/module/sheets/cards.ts`.

**The categories.** The finer marks, listed in `src/module/ui/item-kind.js`,
which reads a weapon's kind off its name because nothing in `WeaponData`
records it. Fifteen weapons, five armors, seven consumables and seven loot.
That file's header explains the tradeoff; the short version is that an item
whose name says nothing falls back to the kind mark above, which is the mark
it wore before any of this existed.

## Keeping the two in step

`tools/check-item-kinds.mjs` runs in `npm run typecheck` and asserts three
things, each of which fails silently otherwise:

- every category the tables can name has a file on disk, because a missing
  file draws an empty gem rather than a wrong one, and because the pack build
  writes that path into four hundred weapon documents;
- every file is reachable by at least one name, so a drawing is not shipped
  that nothing can render;
- no category is reachable by fewer than two names, which is what catches a
  pattern narrowed by a typo.

Run it with `--report` to see the coverage per subtype and the reach per
mark.

## Drawing a new one

1. Add the pattern to the right table in `src/module/ui/item-kind.js`. Order
   matters inside a table; the file says why.
2. Draw `design/assets/types/<name>.svg` to `BRIEF.md`.
3. `node scripts/port-design-css.mjs` copies `design/assets` to `assets`.
4. `npm run item-kinds:check --report` and look at the reach.

Nothing preloads by hand: `KIND_GLYPHS` is derived from the tables and
`loadSigils()` fetches whatever is in it.

## What this replaced

The thirteen kind marks used to be single flat polygons drawn to
`../types/GRID.md`, which forbade curves. They sat on sheets beside the
domain and class sigils, which are traced from painted masters, and the gap
was the first thing you saw. `GRID.md` is kept for the record; `BRIEF.md`
supersedes it.
