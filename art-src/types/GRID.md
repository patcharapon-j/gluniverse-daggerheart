# The grid the drawn marks are on

The thirteen marks in `design/assets/types` are hand-drawn geometry, and this
is the construction they share. `README.md` next to this file describes the
generated art that is meant to replace them, drawn to the class sigils' own
style paragraph; until that art exists these are what the sheet renders, so
they are held to one grid rather than left as thirteen separate decisions.

- **Frame.** `viewBox="0 0 250 250"`, `fill="currentColor"`, no stroke and no
  curve anywhere. Nothing in the set is drawn with a radius.
- **Live area.** 24..226 on both axes, centred on 125. Every mark fills it and
  keeps the same 24-unit margin, so none reads heavier than its neighbours on
  a row of chips.
- **Chamfer.** 22 units on every outer corner that is not a point. It is the
  card's own corner language, which is why it is here and not a radius.
- **Limbs.** 30 units minimum for any band, arm or stem. At the ~14px a corner
  plate renders, 30/250 is 1.7px, the floor for a shape that still has a
  middle.
- **Gutters.** 22 units between separate shapes, so a pair or a trio stays a
  pair or a trio instead of blobbing into one silhouette.
- **Interiors.** One `evenodd` path wherever something has to knock through. A
  stroked outline fills in solid at 14px, every time.
- **Discrimination.** Silhouette first, count second. No two marks share an
  archetype, and where count is the cue — one spearhead against two — both are
  drawn at the same weight rather than one scaled down against the other.

The last rule is the one the old set broke. `secondary` used to sit at 56% of
`primary` so the two would differ in size as well as in count, which only reads
when both are on screen at once, and on a card only one ever is.
