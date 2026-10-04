# The item type marks

Every mark in `design/assets/types` (the kind marks and the finer weapon,
armour, consumable and loot categories, 47 in all) is generated with
Midjourney and traced, so a type mark beside a class sigil or a domain plate
reads as one family.

    node art-src/types/mj-prompts.mjs          # the prompts, one per mark
    # run each in Midjourney (v8.2, square); save the variant named in
    # subjects.tsv's Pick column as generated/<name>.png
    node tools/make-type-marks.mjs              # trace into design/assets/types
    node scripts/port-design-css.mjs            # copy into assets/

`subjects.tsv` holds the subject each mark is generated from, which variant was
picked and the Midjourney job it came from, so a mark can be regenerated or its
art fetched again. `mj-prompts.mjs` holds the style tail every prompt shares.
The subject is the only thing that varies. Change the tail and the whole set
has to be regenerated, or it splits into two families.

`generated/` is not committed. The job id is the record, and the PNGs are
about 200KB each.

## Why Midjourney

The set before this was drawn by hand to `../marks/BRIEF.md`. It got close,
but side by side with the sigils it was still the flatter family: taper and
point built from geometry rather than carved. A head-to-head on nine subjects,
Midjourney traced against hand-written SVG, was not close on fidelity. What
the hand-drawn side kept was control of the subject: Midjourney twice drew
community as a flame and dropped the three shields, and it took a third,
blunter prompt to get them. So:

- **Re-prompt rather than accept a near miss.** A mark whose subject is wrong
  is wrong at every size.
- **Judge the pick at 14px and 24px**, where the corner plate and the kind line
  render it. Fine detail (a whip's braid, a bomb's rivets) is allowed to drop
  out there; the silhouette is not.

## What the trace guarantees

`tools/make-type-marks.mjs` reads the art's brightness (Midjourney draws white
on black, with no alpha), keeps potrace's curve verbatim and recomputes only
the wrapping transform, so the shape is the one potrace emitted or the file
does not build. The output is a 250 box, `fill="currentColor"`, long axis
refitted to 234 units and centred: where grace (236), splendor (231) and valor
(218) already sit, so a type mark carries the same optical weight as a domain
mark next to it.

potrace is not bundled. The tool runs `potrace` from `PATH`, or the binary
named in `POTRACE`.
