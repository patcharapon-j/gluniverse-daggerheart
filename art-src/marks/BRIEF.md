> **Superseded.** The marks are now generated with Midjourney and traced; see
> `../types/README.md`. The floor and the failure-to-watch-for below still
> describe what a good pick looks like.

# How an item mark is drawn

The thirteen domain sigils and the fourteen class sigils in `design/assets` are
traced from painted masters: organic silhouettes with tapering limbs, pointed
tips and carved negative space. The item marks beside them were flat polygons,
one path each, no taper and no second read, and on a sheet that puts a weapon
chip next to a domain chip the difference was the first thing you saw.

These are drawn rather than traced, so this is the construction they share. It
supersedes `../types/GRID.md`, whose rules were written for the polygons.

## The frame

- `viewBox="0 0 250 250"`, `fill="currentColor"`, nothing else on the `<svg>`.
- No `stroke`, no `style`, no `id`, no gradient, no `<g>` wrapper, no transform.
  A mark is paths and a fill colour, because a sigil is recoloured by the card
  it lands on and anything else here would survive that recolouring.
- Live area 18..232 on both axes. Fill it. A mark that sits inside 60..190
  reads as a smaller mark, not a lighter one.

## The drawing

- **Curves are the point.** `C`, `S` and `Q` wherever the subject has a sweep.
  The polygons' no-radius rule is what made them read as UI glyphs; the domain
  marks are nearly all curve, and these have to sit on the same row.
- **Taper every limb.** A limb that leaves at 34 units and lands at a point is
  the move the domain set makes everywhere: look at `blade`, `splendor`,
  `root`, `void`. A constant-width band reads as a diagram.
- **Carve, do not outline.** Interior detail is negative space knocked out of
  a filled shape with `fill-rule="evenodd"`, never a stroked line. A stroke
  thin enough to look right at 250 fills in solid at 14px, every time.
- **Symmetry about x=125** wherever the subject allows it. Most of the domain
  set is mirror-symmetric and the eye reads the row as a set because of it.
  Break it only when the subject is genuinely handed, like a drawn bow.
- **Three to seven top-level paths.** Enough for a second read at full size,
  few enough that the silhouette still resolves at 14px.

## The failure to watch for

Every first pass lands in the same place: a correct, symmetrical, flat object
drawn with bands of constant width. A chest with three even straps. A torso
with three even grooves. It is a better icon than what it replaced and it
still does not belong on a row with the domain marks, because what gives
those their character is not detail, it is **taper and point**. Pick the two
or three limbs that carry the silhouette and drive them from wide to a tip.
Let the shape be a little asymmetric, a little off-axis, a little sharp. A
mark that could be a toolbar button is not finished.

## The floor

Judge every mark at **14px** and **24px**, not at 250. That is the chip on a
corner plate and the mark in a card's kind line, and they are where a mark
earns its place.

- No readable feature narrower than **7 units**. Below that it closes up.
- No gap between shapes narrower than **9 units**, or a pair blurs into one.
- Squint at 14px: the silhouette has to say which item this is before any of
  the interior detail arrives.

## Discrimination

Silhouette first, count second. No two marks in the set share an archetype, and
where count is the cue, both are drawn at the same weight rather than one
scaled down against the other. A size difference only reads when two marks are
on screen together, and on a card only one ever is.

## Weight

A finished mark lands between 1.5 KB and 6 KB. Under that it is still a
polygon; over it, it is tracing noise rather than drawing.

Every file opens with a comment saying what the mark is and which decision in
it was not obvious.
