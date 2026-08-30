/**
 * CONDITION MATERIAL — the notes behind what now ships.
 *
 * The shader itself is src/module/token-conditions.ts and is imported from
 * there by the gate, not copied. What is left here is the row copy the gate
 * page is built from and the reasoning that produced it, which is worth
 * keeping and is not worth carrying inside a fragment shader.
 *
 * baseline.js holds the shader this replaced, frozen, as the comparison.
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

export const PALETTE = [
  '#9b72e4', '#7590a6', '#aeb8c4', '#7388aa',
  '#ef4c5c', '#76d8d1', '#c467e8', '#a8dbe7',
  '#e78ba7', '#9bc45b', '#f2c85c', '#55bff5',
  '#7785a1', '#8d55b8', '#86a7c9', '#f0783f',
  /* The optional chapters' seven, and the Guardian's stance. Broken and
     Destroyed are one hue at two values on purpose: the rules put them one
     step apart, so the palette does too. */
  '#c9a06a', '#bfe6f2', '#6f8f5e', '#a03a6e',
  '#c9922e', '#8c8378', '#5e5952',
  /* The last, and the only warm neutral: whatever the GM typed. */
  '#c8b39a',
];

/** id, label, and what this pass changed. Order IS the shader branch order.
    The last entry is the shader's fall-through and is not in CONDITIONS in
    `config.ts`: it is the material for every condition a GM types. */
export const CONDITIONS = [
  ['vulnerable',    'Vulnerable',      'Bigger shards, and a stress front running out from the impact, so the fracture is something that happened rather than something that is.'],
  ['hidden',        'Hidden',          'Three smoke registers at roughly double the speed, over a tide that surges instead of sitting at a fixed line.'],
  ['restrained',    'Restrained',      'It had no time in it at all. The bands now cinch on a haul and a strain highlight runs their length.'],
  ['cloaked',       'Cloaked',         'The dazzle re-deals on a beat. Camouflage that holds still is a paint job.'],
  ['markedForDeath','Marked for Death','The reticle turns, the sweep runs twice as fast, and the whole mark pulses on a lock rhythm.'],
  ['spectral',      'Spectral',        'Scan lines a third as fine, so they survive 40px as lines rather than aliasing into grey, and the sweep moves twice as fast through them.'],
  ['hexed',         'Hexed',           'Coarser lattices counter-rotating at nearly double the rate. The moire is now the fastest thing on the token.'],
  ['invisible',     'Invisible',       'The budget still goes to the refracting shell and the wipe that hands the outline back. The displacement is a third of what it was: at the old amplitude the creature stopped being identifiable, and a creature you cannot identify is not invisible, it is melting.'],
  ['enraptured',    'Enraptured',      'The motes are gone. Round, evenly spaced, identical dots read as polka dots on a face. This is rising light, drawn as rising light.'],
  ['corroded',      'Corroded',        'The weights are the other way round. Corroded ramps dark green to acid green with the field, so whatever holds the high value is what turns bright, and the pit interiors held it: corrosion with the exposure inverted. The seam network is the bright part of rust and now takes it.'],
  ['stunned',       'Stunned',         'Two fronts half a period apart so there is always one crossing, over five thick spokes instead of seven thin ones.'],
  ['charged',       'Charged',         'Half the exponent again, so the channel is thick enough to survive 40px, with forks that come and go along it and charge that crawls rather than pulsing in place. A smooth stripe is not electricity whatever colour it is.'],
  ['drained',       'Drained',         'Wider runs, a level that actually falls over the loop, and drops at nearly double the rate.'],
  ['horrified',     'Horrified',       'A deeper breath over a wider reach, so the edge advances across a real distance rather than trembling in place.'],
  ['silenced',      'Silenced',        'Rings half as frequent and twice as thick, with the node spacing itself breathing so a standing wave still has somewhere to go.'],
  ['ablaze',        'Ablaze',          'Larger tongues, a faster rise, and a stronger curl, because a fire at 40px is a shape before it is a texture. No longer the fall-through, because the fall-through has a better tenant.'],
  ['roped',         'Roped',           'One cord under tension with a loop at one end, not Restrained\'s several lashed bands \u2014 the rule is that whoever threw it must stay within Very Close, so the mark has to say somebody is holding the other end. The haul travels away from the creature.'],
  ['frostbitten',   'Frostbitten',     'Rime creeping inward from the rim, leaving facets behind it. Needles rather than a wash: pale blue spread evenly over a token at 40px is a colour cast and reads as lighting. Repeats where Stunned is irregular, because frost grows the same way in every direction and a blow does not.'],
  ['nauseated',     'Nauseated',       'A churn, which is the one motion here that turns over rather than travelling. Hidden is the other fbm branch and it rises; this rolls, because the rule describes something already inside rather than something arriving. The domain warp is what makes it turn over itself \u2014 without it the same noise scrolls, and a scroll is a current.'],
  ['cursed',        'Cursed',          'A spiral that does not arrive anywhere, over glyphs turning the other way. Every other bind in the set has a printed exit and is drawn as a shape you can see the end of; this one resists an ordinary clear. Told apart from Hexed by being one continuous arm rather than two grids, so you read a direction instead of an interference.'],
  ['unstoppable',   'Unstoppable',     'Chevrons climbing, and the heat behind them. Momentum with a ceiling on it, so nothing wavers, counter-rotates or breathes \u2014 anything that could read as hesitating is the wrong claim. Ablaze is the other warm branch and curls; this does not, because fire turns over itself and a thing being driven does not.'],
  ['broken',        'Broken',          'One fracture, and the two sides working against each other. The grind is the whole of the time in it: a Broken segment is part of a creature that has stopped, attached to one that has not, so something has to move or the mark is Vulnerable\'s shatter without the event.'],
  ['destroyed',     'Destroyed',       'The same fracture, everywhere, and opening \u2014 on a period slow enough to notice between rounds rather than watch. Deliberately not the shattered branch a defeated token gets: that one throws shards off the creature because the creature is gone, and a Destroyed segment is still standing there.'],
  ['adhoc',         'Named by the GM', 'The one whose subject is unknown. Everything above draws a thing; this cannot, because nobody told it what is happening, and inventing a subject would put the texture of something else on the creature. A ring of marks turning at the rim over a wash that breathes: it says the creature is noted, at the size where the sentence naming it has already gone.'],
];

/** Not a condition: a separate branch of the shader, and its own row. */
export const DEAD = ['dead', 'Dead',
  'Nine shards on a spiral, opening on a settle, each with a lit lip and a shadowed one. Dust falls through it and a cold glint crosses it on a twenty-second loop. Clipped to the creature\'s own circle: the shard edge test was on the displaced coordinate alone, so a fragment a push outside the token still drew, and what it drew was the filter\'s square frame.'];
