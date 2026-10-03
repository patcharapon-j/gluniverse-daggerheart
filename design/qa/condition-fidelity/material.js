/**
 * CONDITION MATERIAL — the notes behind what now ships.
 *
 * The shader itself is src/module/token-conditions.ts and is imported from
 * there by the gate, not copied. What is left here is the row copy the gate
 * page is built from and the reasoning that produced it, which is worth
 * keeping and is not worth carrying inside a fragment shader.
 *
 * baseline.js holds the shipped shader, frozen, as the comparison.
 *
 * This is NOT a redesign. An earlier proposal replaced the composite with a
 * physical material model — absorb, emit, relief, a key light — and it was
 * rejected on sight, correctly: it darkened the portrait, embossed
 * everything, and traded the shipped shader's best quality, which is that
 * the material reads as FUSED INTO the artwork rather than laid over it,
 * for something that looked like plastic wrap. The composite is right. It
 * stays exactly as it is.
 *
 * What is actually limiting the shipped shader is resolution, in three
 * specific ways, and none of them is the composite:
 *
 *   1. VALUE NOISE. `hash21` interpolated bilinearly is blobby and carries
 *      a visible axis-aligned lattice. Every fbm-driven condition inherits
 *      it — smoke, fire, corrosion and fog most of all, because those are
 *      exactly the subjects where a grid reads as wrong. Gradient noise
 *      costs one dot product more per corner and removes it. The output is
 *      rescaled to value noise's own standard deviation so every threshold
 *      already tuned against it stays tuned.
 *
 *   2. NO DETAIL BUDGET. The patterns are written at one frequency band and
 *      that band is chosen for a token at playing zoom. Zoom in and there is
 *      nothing more to see; the material gets bigger rather than sharper.
 *      Adding octaves unconditionally is worse, not better — the extra
 *      frequencies alias into a crawling shimmer the moment the token is
 *      small. So detail is BOUGHT WITH PIXELS: `outputFrame.z` is the
 *      token's size on screen, and every fine octave and every high
 *      frequency below is scaled by it. A zoomed-in creature gains a second
 *      register of structure; a creature at 40px loses it before it can
 *      alias.
 *
 *   3. NO HOT CORE. The shipped emissive is `pow(peak, 3.4) * .3` over the
 *      whole pattern, which lifts everything a little and nothing a lot.
 *      Bright things in the world are not uniformly bright: fire has a
 *      white base, an arc has a filament inside its glow, a crossing of two
 *      lattices is brighter than either. So each condition now returns a
 *      second, much narrower field — the part of itself that is genuinely
 *      incandescent — and that gets its own near-white additive pass. It is
 *      the cheapest thing on this page and it does the most.
 *
 * The additive total is soft-clipped rather than clamped. A clamp maps
 * everything above 1 to the same white, so the hottest part of any effect
 * loses its colour precisely where the effect is most itself.
 *
 * ── PASS THREE ────────────────────────────────────────────────────────
 * The first pass fixed the fidelity. What it did not fix, and what the
 * note back was about, is that the patterns were still written at the
 * wrong SIZE and half of them barely moved:
 *
 *   FEATURE SIZE. Almost every frequency here has come down, most by
 *   about a third. The test that matters is not this page at 160px, it is
 *   the 40px column: a feature narrower than about a fortieth of the
 *   token cannot be drawn at all, so it contributes nothing but a slight
 *   uniform lift — which is exactly the wash that made sixteen conditions
 *   look like one. Charged was the worst of these and was called out by
 *   name: an arc drawn as pow(curve, 14) is a filament one pixel wide at
 *   any size you would actually play at. Bolts are now a thick channel
 *   with a filament riding inside it.
 *
 *   MOTION. Every condition now has a loop you can watch, and several had
 *   none. Restrained had no `t` in it anywhere — it was a decal of rope,
 *   printed on. Corroded and Cloaked drifted at .03 and .09, which over a
 *   turn of play is indistinguishable from static. A material that holds
 *   still reads as a sticker on the token; a material that changes reads
 *   as something happening to the creature, and that difference costs
 *   almost nothing to buy.
 *
 *   Invisible is reworked outright and Enraptured's motes are gone. Both
 *   were drawing the wrong subject; the reasons are at their branches.
 *
 *   Dead is the one state that replaces the creature rather than dressing
 *   it, so it is the one that has to hold up as a picture on its own. It
 *   gets separation, thickness and a world — see `shattered`.
 *
 * ── PASS FOUR ─────────────────────────────────────────────────────────
 * Four rows came back and none of the four was a tuning note.
 *
 *   Dead was drawing OUTSIDE the creature. The shard edge test was on the
 *   displaced coordinate and only on that, which is p pulled inward by the
 *   escape push — so a fragment a push outside the token read as inside the
 *   artwork and drew, and the only thing out there to stop it was the
 *   filter's own square frame. A disc inflated until it met four straight
 *   edges. The creature's circle is a fact about p and is now asked as one.
 *
 *   Corroded had its weights inverted. Its accent ramps dark green to acid
 *   green with the field, so whatever holds the high value is what turns
 *   bright, and the pit interiors held it: a photograph of rust with the
 *   exposure reversed, which arrives as an even wash and reads as nothing.
 *
 *   Charged was still a stripe. pow 5 is about a fortieth of the token
 *   across, which is one pixel at the size that matters, and a smooth
 *   stripe is not electricity at any width. It gets a thicker channel,
 *   forks that come and go along it, and charge that travels.
 *
 *   Invisible was displacing the face by nearly a tenth of the creature.
 *   What reads as invisible is something you can still identify, seen
 *   through something else; past that it is a thing melting.
 */

/**
 * The shipped palette, read from the shipped palette.
 *
 * This was a second copy of twenty-four hex strings, which is a palette that
 * disagrees with itself the first time somebody tunes a hue — and it would
 * disagree silently, on the one page whose entire job is showing you the
 * colours before you decide about them. The shader is imported from src for
 * exactly this reason and so is the colour now.
 */
import { ADHOC_CONDITION_ID, CONDITION_MATERIALS } from '../../../src/module/token-conditions.ts';

export const PALETTE = CONDITION_MATERIALS.map((material) => material.hex);

/** id, label, and what this pass changed. Order IS the shader branch order.
    The last entry is the shader's fall-through and is not in CONDITIONS in
    `config.ts`: it is the material for every condition a GM types. */
export const CONDITIONS = [
  ['vulnerable',    'Vulnerable',      'Crazing now lives inside its own shard, in that shard\'s frame and at a scale the shard sets, instead of being a second unrelated voronoi sprinkled over the whole face. The splits radiate without a protractor: each has its own width and reach, and some are not there at all.'],
  ['hidden',        'Hidden',          'One register through two passes of domain warp, where it was three registers of the same noise scrolling past in straight lines. Parallax of fog is a backdrop behind glass; nothing in it turns over, so two seconds was all of it. The warp curls the smoke into itself, and warping the warp stops the curl reading as a regular swirl.'],
  ['restrained',    'Restrained',      'The turns bow across the body and stop at the silhouette, and each has its own width, pitch and bite. Infinite parallel stripes at one global pitch running off both edges of the creature is not a binding, whatever colour it is.'],
  ['cloaked',       'Cloaked',         'The lattice is displaced on the beat, so the panels are cut differently each time rather than holding one outline and changing brightness. What breaks up a silhouette is the edges moving. The grain sits inside the panel\'s own frame and moves with the cut.'],
  ['markedForDeath','Marked for Death','Aimed. The mark sits off centre over the upper body and drifts as though somebody is keeping it there, and everything in it is built in that frame, so the symmetry is about the mark and not about the token. Centred on p it was radially symmetric and therefore the same picture over any creature. The cross is cut in the middle, the ticks are not eight identical ones, and the widths are in pixels so the ring survives being small.'],
  ['spectral',      'Spectral',        'Eighteen lines, with the second register an interference at a slightly different pitch rather than a finer copy. Thirty jittered lines was one and a third pixels each at 40px, which is the textbook crawl, and eighty-eight was never resolvable at any size. A beat between two close carriers is coarse while both carriers are fine.'],
  ['hexed',         'Hexed',           'One lattice stays polar because a hex is cast at something; the other is now a straight grid turning in its own plane. Two polar lattices interfere into a rosette about the token centre, which is a star in a glow and the same star on every creature. Two geometries also means the beat never settles into a repeat.'],
  ['invisible',     'Invisible',       'The budget still goes to the refracting shell and the wipe that hands the outline back. The displacement is a third of what it was: at the old amplitude the creature stopped being identifiable, and a creature you cannot identify is not invisible, it is melting.'],
  ['enraptured',    'Enraptured',      'Each rising light belongs to a cell and climbs at its own rate from its own place. The lanes were six narrow stripes in screen x all rising on one phase, which is the polka-dot mistake this branch\'s own note diagnosed, one dimension down.'],
  ['corroded',      'Corroded',        'Structurally separated from Destroyed, which was the same thresholded edge net at the same two scales. Here the two scales are a mask and a texture; there the fine net is drawn inside each fragment. Also stopped asking the nine-cell search the same question twice per pixel.'],
  ['stunned',       'Stunned',         'Two fronts half a period apart so there is always one crossing, over five thick spokes instead of seven thin ones.'],
  ['charged',       'Charged',         'The route is reseeded on every strike, so each flash finds a different way down. The bolt followed one path from one fixed origin for the whole fight and only its brightness pulsed, which is a neon tube with a flicker.'],
  ['drained',       'Drained',         'A handful of channels, each wandering by its own seed and falling at its own rate, with the fine run inside its own channel. Fourteen identical evenly spaced vertical stripes in screen x bore no relation to the creature, and the thirty-eight on top of them were sub-pixel.'],
  ['horrified',     'Horrified',       'A deeper breath over a wider reach, so the edge advances across a real distance rather than trembling in place.'],
  ['silenced',      'Silenced',        'Rings half as frequent and twice as thick, with the node spacing itself breathing so a standing wave still has somewhere to go.'],
  ['ablaze',        'Ablaze',          'Fire with seats. lift was noise plus a linear gradient in p.y, uniform across x, so the flame began everywhere along the bottom edge at once and rose as a sheet. It now catches in two places, each with its own flicker, and climbs from them.'],
  ['roped',         'Roped',           'The cord sags under its own tension, carries two counter-laid strands, and throws a shadow on one side. One perfectly straight line of constant width with a sine for texture is a painted stripe; the shadow is the cheapest thing that puts one surface above another.'],
  ['frostbitten',   'Frostbitten',     'Every needle belongs to a cell and points the way its own cell points, and the front advances early or late per cell so the edge of the ice is ragged. Thirteen identical evenly spaced rays from the creature\'s navel was the same construction as five other conditions with a different integer in it.'],
  ['nauseated',     'Nauseated',       'Separated from Hidden structurally rather than by one line. Nausea is rotational and has a centre inside the body, so the churn is drawn in a frame that turns about that point and the motion is angular rather than translational. The radial vignette pulsing on a sine is replaced by the churn\'s own drag toward that centre.'],
  ['cursed',        'Cursed',          'A spiral that does not arrive anywhere, over glyphs turning the other way. Every other bind in the set has a printed exit and is drawn as a shape you can see the end of; this one resists an ordinary clear. Told apart from Hexed by being one continuous arm rather than two grids, so you read a direction instead of an interference.'],
  ['unstoppable',   'Unstoppable',     'Each chevron has its own index, so they are not all one width and do not all arrive at one rate, and the heat is carried ahead of the leading edge rather than washed over the lower half. One V repeated to infinity over a vertical gradient is a decal of an arrow.'],
  ['broken',        'Broken',          'The trunk still works, and now it branches: each limb leans its own way, reaches its own distance, and some are not there. A single line with noise on it is Restrained\'s construction with a different constant.'],
  ['destroyed',     'Destroyed',       'The fine net is drawn inside each coarse fragment, in that fragment\'s own frame, so a piece is breaking up rather than the whole surface being equally crazed. Each fragment also opens on its own clock: the shipped swing was below the threshold of noticing, and a piece letting go while you watch is the subject.'],
  ['adhoc',         'Named by the GM', 'Each tally has its own index, so the marks differ in width, lean and where they sit. One sine raised to a power is a ruler, and the point of this condition is that a person noted something. The wash is carried by the sash\'s own breath instead of by a vignette, which is the one thing this shader can draw that looks identical over every creature.'],
];

/* Order IS the shader's branch order, and the branch cutoffs are the index in
   CONDITION_MATERIALS — so the row copy below, the palette above and the
   `if (id < N.5)` ladder in the shader are one sequence. Nothing about a
   mismatch is visible on the page: the rows would simply describe the wrong
   material, in the right colour, and read as a design problem. */
const EXPECTED = CONDITION_MATERIALS.map((material) => material.id);
const ACTUAL = CONDITIONS.map(([id]) => id);
if (ACTUAL.length !== EXPECTED.length || ACTUAL.some((id, i) => id !== EXPECTED[i]))
  throw new Error(
    `condition-fidelity: row copy is out of step with CONDITION_MATERIALS\n` +
      `  shader: ${EXPECTED.join(', ')}\n  rows:   ${ACTUAL.join(', ')}`,
  );
if (ACTUAL[ACTUAL.length - 1] !== ADHOC_CONDITION_ID)
  throw new Error('condition-fidelity: the fall-through row must be last');

/** Not a condition: a separate branch of the shader, and its own row. */
export const DEAD = ['dead', 'Dead',
  'Rebuilt. It was nine shards on a fixed golden-angle spiral, which meant every corpse on the board '
  + 'broke the same way, into nine convex blobs of one size, all breathing together on a twenty-second '
  + 'sine \u2014 out, back, out, back. A corpse that re-assembles every ten seconds is the one thing a '
  + 'corpse must not do. There is now an impact point placed from the token\'s own seed, so no two '
  + 'creatures shatter alike; the fragments are graded small at the blow and large away from it by '
  + 'scaling a cartesian frame, which keeps them irregular; radial cracks cut across the pieces rather '
  + 'than being drawn over them; each piece catches the light at its own angle, turns its own way and '
  + 'falls; and the settle is 1 - exp(-age), so it happens once and stops, with only the dust still '
  + 'moving afterwards. A log-polar frame was tried first and graded correctly but came out as '
  + 'concentric rings of wedges, which read as a flower.'];
