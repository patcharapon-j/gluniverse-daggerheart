# The item type marks

One mark per Foundry Item subtype, drawn the way the class sigils and the
Artifice, Root and Void domain marks were: generated with the Codex CLI's image
tool, then traced.

    ./gen-type-marks.sh --all -n 3     # art into generated/, three a subject
    # pick one per name, rename <name>-vN.png to <name>.png, delete the rest
    node ../../tools/make-type-marks.mjs

`subjects.tsv` holds the subject line each mark is generated from, so a
regeneration matches, and `gen-type-marks.sh` holds the style paragraph — which
is gluniverse-vtt's `art-src/daggerheart/gen-icon.sh` word for word. That
paragraph was written from the domain sigils the cards already wear, and
sharing it is the whole reason a class sigil and a domain plate read as one
family. Keep the two files in step.

## What the trace guarantees

`tools/make-type-marks.mjs` keeps potrace's curve verbatim and recomputes only
the wrapping transform, so the shape is the one potrace emitted or the file does
not build. The output is a 250 box, `fill="currentColor"`, long axis refitted to
234 units and centred — where grace (236), splendor (231) and valor (218)
already sit, so a type mark carries the same optical weight as a domain mark
next to it.

## What the art has to do

The corner plate renders these at about 14px, and the style paragraph's "few
large shapes, clearly readable at 24 pixels" is what holds there. Two further
rules the subjects enforce rather than the prompt:

- **One archetype each.** No two marks share a silhouette, because at 14px the
  silhouette is all that survives.
- **Count is the second cue.** One spearhead against two, two lozenges against
  three shields. Where count is the difference it is the *only* difference, and
  both are drawn at the same weight rather than one scaled down against the
  other — a size difference only reads when both marks are on screen at once,
  and on a card only one ever is.
