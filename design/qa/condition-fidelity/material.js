/**
 * CONDITION MATERIAL — the shipped look, at higher fidelity.
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
 */

export const PALETTE = [
  '#9b72e4', '#7590a6', '#aeb8c4', '#7388aa',
  '#ef4c5c', '#76d8d1', '#c467e8', '#a8dbe7',
  '#e78ba7', '#9bc45b', '#f2c85c', '#55bff5',
  '#7785a1', '#8d55b8', '#86a7c9', '#f0783f',
];

/** id, label, and what this pass changed. Order IS the shader branch order. */
export const CONDITIONS = [
  ['vulnerable',    'Vulnerable',      'Bigger shards, and a stress front running out from the impact, so the fracture is something that happened rather than something that is.'],
  ['hidden',        'Hidden',          'Three smoke registers at roughly double the speed, over a tide that surges instead of sitting at a fixed line.'],
  ['restrained',    'Restrained',      'It had no time in it at all. The bands now cinch on a haul and a strain highlight runs their length.'],
  ['cloaked',       'Cloaked',         'The dazzle re-deals on a beat. Camouflage that holds still is a paint job.'],
  ['markedForDeath','Marked for Death','The reticle turns, the sweep runs twice as fast, and the whole mark pulses on a lock rhythm.'],
  ['spectral',      'Spectral',        'Scan lines a third as fine, so they survive 40px as lines rather than aliasing into grey, and the sweep moves twice as fast through them.'],
  ['hexed',         'Hexed',           'Coarser lattices counter-rotating at nearly double the rate. The moire is now the fastest thing on the token.'],
  ['invisible',     'Invisible',       'Reworked. The body is left almost untinted and heavily displaced; the whole budget goes to the refracting shell and a wipe that hands the outline back.'],
  ['enraptured',    'Enraptured',      'The motes are gone. Round, evenly spaced, identical dots read as polka dots on a face. This is rising light, drawn as rising light.'],
  ['corroded',      'Corroded',        'Patches nearly twice the size, and the threshold is walked rather than fixed, so the boundary is somewhere it was not a moment ago.'],
  ['stunned',       'Stunned',         'Two fronts half a period apart so there is always one crossing, over five thick spokes instead of seven thin ones.'],
  ['charged',       'Charged',         'The one called out for being too small. A thick channel with the filament inside it, three bolts instead of a hedge, gated on a discharge beat.'],
  ['drained',       'Drained',         'Wider runs, a level that actually falls over the loop, and drops at nearly double the rate.'],
  ['horrified',     'Horrified',       'A deeper breath over a wider reach, so the edge advances across a real distance rather than trembling in place.'],
  ['silenced',      'Silenced',        'Rings half as frequent and twice as thick, with the node spacing itself breathing so a standing wave still has somewhere to go.'],
  ['ablaze',        'Ablaze',          'Larger tongues, a faster rise, and a stronger curl, because a fire at 40px is a shape before it is a texture.'],
];

/** Not a condition: a separate branch of the shader, and its own row. */
export const DEAD = ['dead', 'Dead',
  'Nine shards on a spiral, opening on a settle, each with a lit lip and a shadowed one. Dust falls through it and a cold glint crosses it on a twenty-second loop.'];

export const CONDITION_MATERIAL_REFINED = `
precision highp float;
varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform float uTime;
uniform float uCount;
uniform float uDead;
uniform vec4 inputSize;    // xy = pooled texture size, zw = 1/size
uniform vec4 outputFrame;  // xy = frame origin, zw = frame size in screen px
uniform vec4 inputClamp;   // xy = min uv, zw = max uv, both in texture space
uniform float uId0; uniform float uId1; uniform float uId2; uniform float uId3; uniform float uId4;
uniform vec3 uColor0; uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uColor3; uniform vec3 uColor4;

#define PI 3.141592653589793

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

/* -- noise -------------------------------------------------------
   Gradient noise in place of the bilinear value noise this shader was
   written on. The scale factor is not a taste dial: value noise is uniform
   on [0,1] with standard deviation .289 and gradient noise is bell-shaped
   with about .22, so an unscaled swap would quietly flatten every
   smoothstep already tuned against the old field. 1.3 matches the two
   distributions, which is what lets this be a fidelity change rather than
   a retune of sixteen conditions. */
vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
}

float gnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(dot(hash22(i),             f),
                 dot(hash22(i + vec2(1,0)), f - vec2(1,0)), u.x),
             mix(dot(hash22(i + vec2(0,1)), f - vec2(0,1)),
                 dot(hash22(i + vec2(1,1)), f - vec2(1,1)), u.x), u.y);
}

float noise2(vec2 p) { return clamp(gnoise(p) * 1.3 + 0.5, 0.0, 1.0); }

/* Two octaves past where the shipped fbm stops, and both are bought with
   pixels rather than spent unconditionally. The first five accumulate
   exactly as before, so at a small token this is the old field. */
float fbmD(vec2 p, float detail) {
  float value = 0.0;
  float amp = .5;
  mat2 turn = mat2(.8, -.6, .6, .8);
  for (int i = 0; i < 7; i++) {
    float w = (i >= 5) ? detail : 1.0;
    value += amp * w * noise2(p);
    p = turn * p * 2.03 + 17.17;
    amp *= .5;
  }
  return value;
}

float fbm(vec2 p) { return fbmD(p, 0.0); }

/* F1 and the seam, because a cell's INSIDE and a cell's EDGE are two
   different subjects and the shipped helper only ever offered the edge.
   Pits are interiors; crazing and crust are edges. Asking for a dot and
   being handed a web is how Enraptured ended up drawing Corroded. */
vec3 voronoi3(vec2 x) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  float first = 8.0;
  float second = 8.0;
  float cell = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = vec2(hash21(n + g), hash21(n + g + 31.7));
      vec2 r = g + .16 + .68 * o - f;
      float d = dot(r, r);
      if (d < first) { second = first; first = d; cell = hash21(n + g + 7.13); }
      else if (d < second) { second = d; }
    }
  }
  return vec3(sqrt(first), sqrt(second) - sqrt(first), cell);
}

float voronoiEdge(vec2 x) { return voronoi3(x).y; }
float voronoiCell(vec2 x) { return voronoi3(x).x; }

float band(float value, float center, float width) {
  return 1.0 - smoothstep(width, width * 1.8, abs(value - center));
}

float idAt(int i) {
  if (i == 0) return uId0; if (i == 1) return uId1; if (i == 2) return uId2;
  if (i == 3) return uId3; return uId4;
}

vec3 colorAt(int i) {
  if (i == 0) return uColor0; if (i == 1) return uColor1; if (i == 2) return uColor2;
  if (i == 3) return uColor3; return uColor4;
}

/* x = the material field, exactly the quantity the shipped shader
   composited on. y = the incandescent part of it, always a SUBSET of x
   rather than a layer over it — that is what keeps a hot core inside its
   own effect instead of floating on top of it.

   ── what changed, and why it is not a redesign ──────────────────
   Every condition keeps the primitive it shipped with. What they did not
   have was SCALE HIERARCHY or a COMPOSITION, and without those a pattern
   is a texture: one frequency, spread evenly, radially symmetric, filling
   the disc. Sixteen textures at one frequency are sixteen hazes, and the
   only thing separating them is hue — which is the actual complaint.

   So each one now has a large structure, a medium one, and a fine register
   that only exists when there are pixels for it, and each has somewhere it
   comes FROM. Vulnerable breaks from a point off centre rather than
   cracking uniformly. Charged branches from a source rather than radiating.
   Corroded eats in patches rather than everywhere at once. Restrained is
   angled bands rather than a fourth set of concentric rings — it shared
   that primitive with Silenced, Stunned and Marked for Death, and four
   conditions drawing rings is four conditions nobody can tell apart.

   ── and what pass three changed on top of that ──────────────────
   Size and motion, on every branch. The governing number is the 40px
   column: a feature thinner than a fortieth of the token cannot be drawn,
   so it lands as a uniform lift, and a uniform lift is the wash. Every
   frequency here is now chosen so the LARGEST structure survives at that
   size and the rest is detail on top of it. And every branch has a loop
   with a period between about one and four seconds, because a material
   that never changes is a sticker on the token no matter how good the
   texture is. */
vec2 conditionPattern(float id, vec2 p, float t, float d) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float n = fbmD(p * 2.2 + vec2(t * .14, -t * .10), d);

  /* Vulnerable — it broke from somewhere. Shards are voronoi in the
     impact's own polar frame, so they radiate the way glass actually
     fails, and the crazing is gated on nearness to a real seam instead of
     sprinkled over the whole face. The stress front is what makes it an
     event rather than a result: the seams light in a wave running outward
     from the impact, so you are watching the break travel. */
  if (id < .5) {
    vec2 q = p - vec2(-.26, -.18);
    float rr = length(q), qa = atan(q.y, q.x);
    float seam = voronoiEdge(vec2(qa * 1.15, rr * 1.9) * 1.05);
    float shard = 1.0 - smoothstep(.028, .175, seam);
    float craze = (1.0 - smoothstep(.04, .19, voronoiEdge(p * 8.5))) * d
                * smoothstep(.42, .0, seam);
    float splits = pow(max(0.0, cos(qa * 5.0 + rr * 2.2)), 18.0) * smoothstep(1.9, .06, rr);
    float front = band(fract(rr * .55 - t * .34), .5, .13);
    return vec2(clamp(shard * .95 + craze * .60 + splits * .80, 0.0, 1.0),
                (1.0 - smoothstep(.0, .048, seam)) * (.35 + .85 * front)
                + splits * .55 * (.40 + .60 * front));
  }

  /* Hidden — three smoke registers and a tide. It engulfs from below
     rather than hanging as fog, which is the difference between a
     creature hiding and a creature behind a filter. The tide line itself
     now rises and falls, so the concealment is something the creature is
     doing rather than a level somebody set. */
  if (id < 1.5) {
    float base = fbmD(p * 1.15 + vec2(t * .105, -t * .075), d);
    float mid  = fbmD(p * 2.60 - vec2(t * .200,  t * .130) + 11.0, d);
    float fine = fbmD(p * 5.60 + vec2(-t * .330, t * .190) + 27.0, d) * d;
    float tide = smoothstep(.95 + .34 * sin(t * .42), -.62, p.y);
    return vec2(clamp(smoothstep(.44, .70, base * .62 + mid * .30 + fine * .22 + tide * .44),
                      0.0, 1.0), 0.0);
  }

  /* Restrained — angled bands, hard-edged, with lashings across them.
     A knot is where a lashing crosses a band, and a knot catches light.

     This branch had no t in it anywhere, which made it the only material
     in the set that was genuinely a decal: rope printed onto the token. A
     binding is a thing under tension, so it hauls — the bands narrow and
     widen on a cinch, the lashings work against them, and a strain
     highlight travels the length of the binding. Half as many bands as
     before and each nearly twice as wide, because at 40px the old pitch
     was four grey lines. */
  if (id < 2.5) {
    float cinch = .5 + .5 * sin(t * .62);
    float axis = p.y * 1.9 + p.x * .78;
    float u = abs(fract(axis * .82 + .5) - .5);
    float bands = 1.0 - smoothstep(.175 - .030 * cinch, .255 - .030 * cinch, u);
    float lash = pow(max(0.0, sin((p.x * 2.4 - p.y * 1.1) * 4.4 + .35 * sin(t * .50))), 20.0);
    float along = p.x * 1.9 - p.y * .78;
    float strain = band(fract(along * .55 - t * .30), .5, .075);
    float rivet = (1.0 - smoothstep(.08, .26, voronoiEdge(vec2(axis * 1.5, p.x * 2.3) * 1.25)))
                * d * bands;
    return vec2(clamp(bands * .44 + lash * .18 + rivet * .30 + bands * strain * .30, 0.0, 1.0),
                bands * lash * (.55 + .55 * cinch) + rivet * .35 + bands * strain * .75);
  }

  /* Cloaked — dazzle. Flat panels at three values with hard boundaries
     between them, which is what actually defeats a silhouette: an outline
     drawn on a shape still shows the shape. The first version of this drew
     glowing cell seams and was indistinguishable from Vulnerable, because
     it was the same primitive pointed at the same subject. Two conditions
     may not share a primitive; that is most of what uniqueness is here.

     And it re-deals. The reason dazzle works is that the panels stop
     agreeing with the shape from one moment to the next, so the value
     assignment steps on a beat instead of drifting — drifting is a
     pattern sliding across a face, which reads as a texture bug. */
  if (id < 3.5) {
    float beat = fract(floor(t * 1.7) * .618);
    vec3 v = voronoi3(p * 1.45 + vec2(sin(t * .11), cos(t * .09)) * .16);
    float panels = floor(fract(v.z * 7.13 + beat * 3.0) * 3.0) * .5;
    float seam = 1.0 - smoothstep(.030, .105, v.y);
    float grain = smoothstep(.42, .08, voronoiCell(p * 4.8)) * d;
    return vec2(clamp(panels * .62 + seam * .18 + grain * .18, 0.0, 1.0),
                seam * (.10 + .30 * beat));
  }

  /* Marked for Death — a reticle, which is mechanical and sparse. It is
     the one condition on the token that somebody else put there, so it is
     also the one that should behave like equipment: the ticks orbit, the
     range sweep runs, and the whole mark pulses on a lock rhythm. */
  if (id < 4.5) {
    float spin = t * .55;
    float pulse = .45 + .55 * pow(.5 + .5 * sin(t * 3.2), 3.0);
    float ring = band(r, .70, .028);
    float outer = band(r, .82, .012);
    float cross = (band(abs(p.x), 0.0, .016) + band(abs(p.y), 0.0, .016))
                * smoothstep(.20, .40, r) * smoothstep(1.02, .84, r);
    float ticks = pow(max(0.0, cos((a + spin) * 8.0)), 26.0) * band(r, .76, .085);
    float sweep = band(r, .18 + .58 * fract(t * .42), .026);
    float lock = pow(max(0.0, cos((a - spin * .40) * 4.0)), 10.0) * band(r, .70, .155);
    return vec2(clamp(ring * .95 + outer * .70 + cross * .85 + ticks * .80
                      + sweep * .75 + lock * .55, 0.0, 1.0),
                (ring * .90 + cross * .70 + sweep * 1.0 + ticks * .80) * pulse);
  }

  /* Spectral — one bright band sweeping down through standing scan lines,
     so the motion has a direction instead of shimmering in place. The
     lines were at 54 per token width, which is finer than a 40px token can
     draw: they aliased into grey. At 30 they are lines. */
  if (id < 5.5) {
    float drift = p.y + n * .18 - t * .42;
    float scan = pow(.5 + .5 * sin(drift * 30.0), 7.0);
    float fine = pow(.5 + .5 * sin(drift * 88.0), 7.0) * d;
    float fog = smoothstep(.44, .76, fbmD(p * 1.9 + vec2(t * .13, 0.0), d));
    float sweep = band(fract(drift * .38), .5, .045);
    return vec2(clamp(scan * .56 + fine * .26 + fog * .44 + sweep * .62, 0.0, 1.0),
                sweep * (.35 + .65 * fog) * 1.1 + scan * sweep * .70);
  }

  /* Hexed — two lattices turning against each other. The script is the
     moire where they interfere, which is a place rather than a texture, so
     it moves without either lattice moving much. Coarser and much faster:
     interference between two slow fine gratings is a shimmer, while
     between two quick coarse ones it is a figure crawling over the
     creature, and the figure is the subject. */
  if (id < 6.5) {
    float l1 = pow(max(0.0, cos(a * 5.0 + r * 11.0 - t * .95)), 7.0);
    float l2 = pow(max(0.0, cos(a * 8.0 - r *  8.0 + t * .68)), 8.0);
    float rings = band(fract(r * 2.2 - t * .22), .5, .085) * .55;
    return vec2(clamp(l1 * .72 + l2 * .62 + rings, 0.0, 1.0), l1 * l2 * 3.0);
  }

  /* Invisible — reworked, because caustics are a description of water and
     the subject is a creature you cannot see. Nothing drawn ON a token can
     read as invisibility; a texture over the face is the opposite of the
     claim. What reads is the artwork being carried away, and the only
     thing left being the disturbance where it used to be.

     So the field is close to nothing across the body — which is the point,
     because the field is what drives the tint, and a tinted body is a
     visible body — and the whole budget goes to the edge: a refracting
     shell at the silhouette, a bloom running round it, and one wipe
     travelling down that briefly hands the outline back. The warp for this
     id is the largest in the set and is deliberately not gated on the
     value, so the body smears whether or not anything is lit on it.

     Two earlier attempts got this wrong the same way and the reason is
     worth keeping: this composite turns the field into BOTH the tint and
     the glow, so a condition that fills the disc with a high value is a
     condition that lights the whole token up. A veil over the body drew a
     glowing bubble. Invisible cannot afford a full-disc field at all, and
     everything it has to say has to be said at the silhouette. */
  if (id < 7.5) {
    float shell = band(r, .94, .022);
    float ripple = pow(.5 + .5 * sin((r * 5.0 - t * 1.35) * PI), 6.0) * smoothstep(1.0, .35, r);
    float wipe = band(fract(p.y * .42 - t * .26), .5, .060);
    float veil = .26 + smoothstep(.34, .70, fbmD(p * 1.6 + vec2(-t * .14, t * .10), d)) * .30;
    return vec2(clamp(veil + shell * .70 + wipe * .30 + ripple * .24, 0.0, 1.0),
                shell * .55 + wipe * ripple * 1.6);
  }

  /* Enraptured — the motes are gone. They were voronoi cell interiors,
     which are round, evenly spaced and all one size, and a field of those
     does not read as anything drifting: it reads as polka dots on a face.
     The subject is rising light, so it is drawn as rising light — lanes
     that are uneven along x, a climbing phase, and a fade as they go —
     under a bloom that opens and closes and ribbons that turn through it. */
  if (id < 8.5) {
    float bloom = band(r, .34 + .12 * sin(t * .80), .30);
    float petals = pow(max(0.0, cos(a * 5.0 + t * .50)), 8.0) * band(r, .52, .34);
    float swirl = pow(.5 + .5 * cos(a * 3.0 - r * 4.5 + t * .95), 10.0) * smoothstep(1.05, .20, r);
    float lane = pow(.5 + .5 * sin(p.x * 6.0 + n * 3.0), 20.0);
    float climb = fract(-p.y * .60 + t * .30 + noise2(vec2(p.x * 3.0, 0.0)));
    float sparks = lane * band(climb, .5, .14) * smoothstep(1.0, .10, r) * (.45 + .55 * d);
    return vec2(clamp(bloom * .58 + petals * .34 + swirl * .32 + sparks * .62, 0.0, 1.0),
                sparks * sparks * 1.20 + petals * bloom * .55);
  }

  /* Corroded — it eats in PATCHES. Corrosion everywhere at once is a
     colour; corrosion with clean metal beside it is a material. And it has
     to creep: corrosion that holds its outline is a stain, so the
     threshold is walked rather than fixed and the boundary is somewhere it
     was not a moment ago. */
  if (id < 9.5) {
    float eat = .57 - .09 * sin(t * .30);
    float patch = smoothstep(eat, eat + .17, fbmD(p * 1.5 + vec2(t * .085, -t * .050), d));
    float e = voronoiEdge(p * 4.0);
    float pits = smoothstep(.50, .12, voronoiCell(p * 4.0));
    float crust = band(e, .30, .105);
    float fine = (1.0 - smoothstep(.05, .19, voronoiEdge(p * 9.0))) * d;
    float bloom = band(fract(length(p - vec2(.20, .30)) * .80 - t * .16), .5, .16);
    return vec2(clamp(patch * (pits * .88 + crust * .55 + fine * .35), 0.0, 1.0),
                patch * crust * (.55 + .85 * bloom));
  }

  /* Stunned — a front, expanding and dying, with chips off the spokes. Two
     of them now, half a period apart, because with one there is a dead
     beat every cycle where the token is only spokes, and a dead beat is
     where the eye decides nothing is happening. */
  if (id < 10.5) {
    float ph1 = fract(t * .46);
    float ph2 = fract(t * .46 + .5);
    float ring1 = band(r, ph1 * 1.15, .080) * (1.0 - ph1 * .55);
    float ring2 = band(r, ph2 * 1.15, .060) * (1.0 - ph2 * .70);
    float front = band(r, ph1 * 1.15, .016) * (1.0 - ph1);
    float bearing = cos(a * 5.0 + .55 * sin(t * .90));
    float spokes = pow(max(0.0, bearing), 9.0) * smoothstep(1.05, .10, r);
    float chips = pow(max(0.0, bearing), 50.0) * smoothstep(1.05, .10, r) * d;
    return vec2(clamp(ring1 * .85 + ring2 * .55 + spokes * .62 + chips * .50, 0.0, 1.0),
                front * 1.7 + chips * .70 + spokes * spokes * .30);
  }

  /* Charged — the one that came back as too small to see, and the cause is
     a modelling mistake rather than a tuning one. The arc was drawn as
     pow(1 - |curve|, 14), which is a filament: at 160px it is a hairline
     and at 40px it is nothing, so all it ever contributed was a faint even
     lift. A bolt at reading distance is a THICK bright channel with a
     filament inside it, so the channel is now drawn wide at a low power,
     the filament rides the same curve at a high one, and there are about
     three of them across the token instead of a hedge of thin ones.

     Then it strikes. A discharge you can watch continuously is a neon
     sign; gating the whole thing on a beat is what makes it electrical. */
  if (id < 11.5) {
    vec2 q = p - vec2(.34, -.52);
    float qa = atan(q.y, q.x), rr = length(q);
    float branch = fbmD(vec2(qa * 1.3, rr * 2.6 - t * 1.6), d);
    float curve = sin(qa * 2.1 + branch * 5.0);
    float reach = smoothstep(2.1, .04, rr);
    float channel = pow(1.0 - abs(curve), 5.0) * reach;
    float fil = pow(1.0 - abs(curve), 26.0) * reach;
    float beat = pow(.5 + .5 * sin(t * 2.70), 3.0);
    float strike = pow(.5 + .5 * sin(t * 5.30 + branch * 4.0), 8.0);
    float halo = smoothstep(.95, .0, rr) * (.25 + .75 * beat);
    return vec2(clamp(channel * (.55 + .85 * beat) + halo * .40, 0.0, 1.0),
                fil * (.50 + 1.30 * strike) + channel * channel * 1.1 * beat + halo * halo * .50);
  }

  /* Drained — it runs downward and it has a leading edge. The level it
     runs to now falls over the loop, so the creature is being emptied
     rather than standing in a puddle at a fixed height. */
  if (id < 12.5) {
    float level = .18 * sin(p.x * 2.6 + t * .40) + .26 * sin(t * .33);
    float sink = smoothstep(-.62, .92, -p.y + level);
    float trails = pow(.5 + .5 * sin(p.x * 14.0 + n * 3.0), 8.0);
    float runs = pow(.5 + .5 * sin(p.x * 38.0 + n * 4.5), 14.0) * d;
    float drop = band(fract(-p.y * 1.05 + t * .62 + noise2(vec2(p.x * 4.0, 0.0)) * .90), .5, .085)
               * trails;
    return vec2(clamp(sink * .76 + trails * sink * .46 + runs * sink * .30 + drop * .60, 0.0, 1.0),
                drop * 1.0 + trails * sink * .20);
  }

  /* Horrified — the edge advances on a breath, and the front of it is lit.
     A deeper breath over a wider reach, because the old amplitude moved
     the boundary by about a twentieth of the token, which at any playable
     size is a tremble rather than an advance. */
  if (id < 13.5) {
    float breath = .5 + .5 * sin(t * .95);
    float reach = .40 + .26 * breath;
    float tend = fbmD(vec2(a * 1.8, r * 2.0 - t * .38), d);
    float mask = smoothstep(reach, 1.10, r + (tend - .5) * .80);
    float hairs = pow(.5 + .5 * cos(a * 14.0 + tend * 7.0 - t * .55), 7.0) * mask;
    return vec2(clamp(mask * .96 + hairs * .44, 0.0, 1.0),
                band(mask, .20, .13) * (.50 + .35 * breath));
  }

  /* Silenced — two waves of equal frequency travelling opposite ways. The
     bright rings are the nodes where both peak at once, which is what a
     standing wave is and is why they do not travel. Which is also the
     problem: a standing wave is by definition stationary, so the node
     SPACING breathes instead, and the pattern expands and contracts
     without either wave stopping being what it is. */
  if (id < 14.5) {
    float k = 4.4 + .55 * sin(t * .38);
    float w1 = pow(.5 + .5 * cos((r * k + t * .55) * PI * 2.0), 8.0);
    float w2 = pow(.5 + .5 * cos((r * k - t * .55) * PI * 2.0), 8.0);
    float fine = pow(.5 + .5 * cos(r * 11.0 * PI * 2.0), 12.0) * d;
    float fall = smoothstep(1.08, .04, r);
    return vec2(clamp((w1 + w2) * .5 * fall * 1.05 + fine * fall * .35, 0.0, 1.0),
                w1 * w2 * fall * 2.6);
  }

  /* Ablaze — the domain warp is what makes a flame turn over itself
     instead of scrolling upward as a sheet, and fire is the subject where
     the extra octaves matter most, because fire is all detail. Larger
     tongues and a faster rise: at 40px a fire is a SHAPE before it is a
     texture, and the shape is the part that has to survive. */
  vec2 flameP = vec2(p.x * 1.70, p.y * 1.90 - t * 1.05);
  vec2 curl = vec2(gnoise(flameP * .55 + t * .55), gnoise(flameP * .55 + 7.0 - t * .42))
            * .72 * (.35 + .65 * d);
  float flameNoise = fbmD(flameP + vec2(0.0, sin(p.x * 3.0 + t * 1.30) * .30) + curl, d);
  float lift = flameNoise + (p.y + 1.0) * .30;
  float flame = smoothstep(.38, .78, lift);
  float tongues = pow(.5 + .5 * sin(p.x * 8.0 + flameNoise * 7.0 + t * .50), 6.0) * flame;
  return vec2(clamp(flame * .90 + tongues * .34, 0.0, 1.0), smoothstep(.80, 1.08, lift) * .82);
}

vec2 conditionWarp(float id, vec2 p, float t, float value) {
  float r=length(p); float a=atan(p.y,p.x); vec2 radial=r>.001?p/r:vec2(0.0);
  if(id<.5)return vec2(sin(p.y*18.0+t*1.4),cos(p.x*16.0-t*1.1))*value*.014;
  if(id<1.5)return vec2(fbm(p*2.1+t*.11)-.5,fbm(p*2.3-t*.09+9.0)-.5)*.030;
  if(id<2.5)return -radial*value*.024;
  if(id<3.5)return vec2(sin(p.y*5.0+t*1.1),cos(p.x*4.0-t*.8))*.020;
  if(id<4.5)return radial*sin(t*2.2+r*8.0)*value*.016;
  if(id<5.5)return vec2(.024*sin(t*1.1),-.014*cos(t*.8))*value;
  if(id<6.5)return vec2(-p.y,p.x)*value*.020;
  /* The largest displacement in the set, and the only one not multiplied
     by its own value. Invisible spends nothing on colouring the body, so
     on the body the warp IS the condition: the artwork has to be carried
     away whether or not anything is lit over it. */
  if(id<7.5)return (vec2(sin(p.y*6.5+t*1.10),cos(p.x*5.5-t*.85))*.055-radial*.036)
                   *(.55+.45*sin(t*.70));
  if(id<8.5)return -radial*value*.020;
  if(id<9.5)return radial*(fbm(p*4.0+t*.09)-.5)*.030;
  if(id<10.5)return radial*sin(r*16.0-t*3.2)*value*.024;
  if(id<11.5)return vec2(sin(a*6.0+t*5.0),cos(a*5.0-t*4.0))*value*.020;
  if(id<12.5)return vec2(0.0,value*.032);
  if(id<13.5)return -radial*value*.028;
  if(id<14.5)return radial*sin(r*20.0+t*2.0)*value*.017;
  return vec2(sin(p.y*9.0+t*2.6),value*-.8)*value*.020;
}

vec3 conditionAccent(float id, vec3 base, vec2 p, float t, float value) {
  float r=length(p); float a=atan(p.y,p.x);
  if(id<.5)return mix(base,vec3(.92,.82,1.0),value*.7);
  if(id<1.5)return mix(vec3(.025,.045,.065),base,.42+value*.25);
  /* The old ramp went to near-white across the whole of its range, which
     was right for a hairline ring and turns a thick band into white tape.
     Cubing it keeps the band dark iron and spends the brightness only on
     its lit edge. */
  if(id<2.5)return mix(vec3(.075,.085,.11),vec3(.44,.50,.60),pow(value,2.0));
  if(id<3.5)return mix(base*.26,base*1.35,value);
  if(id<4.5)return mix(vec3(.34,.015,.035),vec3(1.0,.52,.58),value*.76);
  if(id<5.5)return mix(base,vec3(.76,1.0,.96),value*.7);
  if(id<6.5)return mix(vec3(.22,.015,.32),vec3(.94,.51,1.0),value*.82);
  /* Invisible: neutral cold glass in the body so the tint has nothing to
     say there, and the chromatic split kept for the rim only, which is
     exactly where a refracting edge would show one. */
  if(id<7.5)return mix(vec3(.44,.50,.57),.62+.38*cos(vec3(0.0,2.1,4.2)+r*9.0-t*.9),
                       smoothstep(.80,.97,r)*pow(value,1.5));
  if(id<8.5)return mix(vec3(.38,.02,.16),vec3(1.0,.78,.88),value*.76);
  if(id<9.5)return mix(vec3(.1,.2,.025),vec3(.82,1.0,.34),value*.78);
  if(id<10.5)return mix(base,vec3(1.0,.96,.58),value*.82);
  if(id<11.5)return mix(vec3(.03,.24,.48),vec3(.72,.96,1.0),value*.86);
  if(id<12.5)return mix(vec3(.025,.035,.065),base*.72,value*.35);
  if(id<13.5)return mix(vec3(.035,.005,.055),vec3(.68,.23,.82),value*.7);
  if(id<14.5)return mix(vec3(.1,.2,.31),vec3(.78,.91,1.0),value*.72);
  return mix(vec3(.62,.045,.008),vec3(1.0,.86,.27),clamp(value+p.y*.16,0.0,1.0));
}

vec2 turn(vec2 p,float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*p;}

/* Nine sites on a golden-angle spiral rather than seven placed by hand.
   The spiral is not decoration: hand-placed sites drift into pairs, and a
   pair of close sites makes a long thin sliver, which is the one shard
   shape that reads as a mistake rather than as glass. The spiral cannot
   produce one, and it stays deterministic, so the break is the same break
   every time a token dies. */
vec2 shardSite(float i) {
  float a = i * 2.39996 + .70;
  return vec2(cos(a), sin(a)) * (.14 + .30 * sqrt(i));
}
float shardSpin(float i) { return (hash21(vec2(i, 5.51)) - .5) * .17; }
float shardPush(float i) { return .030 + .055 * hash21(vec2(i, 17.3)); }

vec2 tokenUv(vec2 tex){ return tex * inputSize.xy / outputFrame.zw; }

vec4 sampleArt(vec2 local){
  vec2 tex = clamp(local, 0.0, 1.0) * outputFrame.zw * inputSize.zw;
  return texture2D(uSampler, clamp(tex, inputClamp.xy, inputClamp.zw));
}

/* -- the break ---------------------------------------------------------
   Dead is the only state in this shader that REPLACES the creature rather
   than dressing it, so it is the one that has to hold up as a picture on
   its own terms. Three things it did not have:

   SEPARATION. The pieces used to be re-cut in place: each shard sampled
   the artwork from a hand-written offset, and the gap between shards was a
   constant. Each shard now carries its art along its own escape vector,
   outward from the centre, and the gap opens on a long settle — so the
   token is a thing that came apart, and is still coming apart while you
   look at it.

   THICKNESS. Glass has an edge, and an edge has a side facing the light
   and a side facing away. The direction across a seam is the vector
   between the two nearest sites, so one dot product against a fixed key
   gives every shard a lit lip on one side and a shadowed one on the other.
   That single term is most of the difference between cut paper and a
   broken pane.

   A WORLD. Dust falls through it and a cold glint crosses the faces on a
   twenty-second loop, so a dead token is still an object in a scene rather
   than a decal of one. The loop is deliberately far slower than anything a
   living condition does: it should register as stillness that happens to
   be lit, not as an effect running. */
vec4 shattered(vec2 uv, vec2 p, float t, float d) {
  float first = 99.0, second = 99.0, sid = 0.0;
  vec2 nearSite = vec2(0.0), nextSite = vec2(0.0);
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    vec2 site = shardSite(fi);
    float rough = (noise2(p * 3.2 + vec2(fi * 7.1, fi * 3.3)) - .5) * .11;
    float dist = distance(p, site) + rough;
    if (dist < first) {
      second = first; nextSite = nearSite;
      first = dist; nearSite = site; sid = fi;
    } else if (dist < second) { second = dist; nextSite = site; }
  }
  float seam = second - first;

  float settle = .5 + .5 * sin(t * .16);
  float solid = smoothstep(.026 + .024 * settle, .094 + .024 * settle, seam);

  vec2 escape = normalize(nearSite + vec2(.0001));
  vec2 source = turn(p - escape * shardPush(sid) * (.55 + .45 * settle), -shardSpin(sid));
  float circle = 1.0 - smoothstep(.93, .995, length(source));
  vec4 art = sampleArt(source * .5 + .5);
  float lum = dot(art.rgb, vec3(.2126, .7152, .0722));

  vec2 across = normalize(nextSite - nearSite + vec2(.0001));
  float bevel = (1.0 - smoothstep(.0, .085, seam)) * dot(across, normalize(vec2(-.45, -.89)));

  float craze = (1.0 - smoothstep(.02, .10, voronoiEdge(p * 7.5)))
              * smoothstep(.07, .26, seam) * d;
  float grain = noise2(source * 82.0) - .5;
  float glint = band(fract(p.x * .62 + p.y * .38 - t * .052), .5, .075);
  float dust = smoothstep(.10, .015, voronoiCell(vec2(p.x * 5.5 + sin(t * .20),
                                                      p.y * 5.5 + t * .16)));

  vec3 cold = mix(vec3(lum), vec3(.62, .72, .88) * lum, .62);
  cold *= .66 + .34 * smoothstep(-.95, .85, -source.y);
  cold += vec3(.80, .86, .94) * max(bevel, 0.0) * (.34 + .58 * glint);
  cold *= 1.0 - max(-bevel, 0.0) * .55;
  cold += vec3(.70, .78, .90) * craze * .30;
  cold += vec3(.66, .74, .86) * dust * .22;
  cold += grain * .05;
  return vec4(clamp(cold, 0.0, 1.0), art.a * solid * circle);
}

void main() {
  vec2 uv=tokenUv(vTextureCoord);
  vec2 p=uv*2.0-1.0;

  /* Detail is bought with pixels. outputFrame.z is the token's width on
     screen, so a creature filling the viewport gets its second register of
     structure and one at 40px never renders the frequencies that would
     crawl. Nothing else in this shader is allowed to know about the
     camera — see tokenUv — and this is the deliberate exception, because
     the question "how much detail can be resolved" is a question about
     pixels by definition. */
  float detail = smoothstep(44.0, 104.0, outputFrame.z);

  if(uDead>.5){gl_FragColor=shattered(uv,p,uTime,detail);return;}

  vec4 original=sampleArt(uv);
  float circle=1.0-smoothstep(.94,1.0,length(p));
  vec3 colorSum=vec3(0.0); vec3 accentSum=vec3(0.0); vec2 warp=vec2(0.0);
  float survival=1.0; float peak=0.0; float hot=0.0; float darkness=0.0;
  for(int i=0;i<5;i++){
    if(float(i)>=uCount)break;
    float id=idAt(i); float localTime=uTime+float(i)*1.73;
    vec2 field=conditionPattern(id,p,localTime,detail);

    /* One contrast curve over every condition's field, and it is the single
       cheapest thing on this page that makes a material read as bold rather
       than as a wash. The shipped patterns spend most of their area in the
       middle of the range, which is exactly where a tint applied over a
       portrait disappears into it: a value of .45 across half the token is
       a haze, and two hazes of different hues are the same haze. The gain
       widens the range first and the smoothstep curve then fixes both ends
       and pushes everything between them outward, so a condition has
       places it IS and places it is not. Applied here rather than in
       sixteen branches because it is one claim about all of them. */
    float value=clamp(field.x*1.16-.055,0.0,1.0);
    value=value*value*(3.0-2.0*value);
    colorSum+=colorAt(i); accentSum+=conditionAccent(id,colorAt(i),p,localTime,value);
    warp+=conditionWarp(id,p,localTime,value); survival*=1.0-value*.72;
    peak=max(peak,value); hot=max(hot,clamp(field.y,0.0,1.0));
    if((id>.5&&id<1.5)||(id>11.5&&id<13.5))darkness+=value;
  }
  float count=max(uCount,1.0);
  vec3 material=colorSum/count;
  if(uCount>1.0){
    float low=min(material.r,min(material.g,material.b)); vec3 chroma=material-vec3(low);
    float high=max(chroma.r,max(chroma.g,chroma.b)); if(high>.001)chroma/=high;
    material=clamp(mix(material,chroma,.68),0.0,1.0);
  }
  float field=clamp(1.0-survival,0.0,1.0); warp/=count;
  vec4 warped=sampleArt(uv+warp);
  vec3 accent=uCount>1.0?material:accentSum/count;
  float luminance=dot(warped.rgb,vec3(.2126,.7152,.0722));
  vec3 colorized=accent*(.16+luminance*1.24);
  float tint=clamp(.20+field*.56+min(uCount-1.0,2.0)*.020,.20,.70);
  vec3 color=mix(warped.rgb,colorized,tint);
  color*=1.0-clamp(darkness/count,0.0,1.0)*.38;

  /* Everything added to the picture is gathered first and rolled off
     together. Adding each term straight onto that accumulator and clamping
     at the end is what turns a bright effect white: the clamp maps every
     value above 1 to the same place, so a hot core and a merely bright glow
     arrive at the screen identical. */
  float edge=smoothstep(.48,.98,length(p));
  float glass=pow(max(0.0,1.0-distance(uv,vec2(.36,.27))*1.9),6.0);
  vec3 emissive=mix(accent,vec3(1.0),.52);
  /* The rim is doing a job the rest cannot: at 40px a token is a disc with
     a colour, and the ring of material around its edge is the only part of
     any of this that still reads. It is worth more than the interior at
     that size, so it is weighted for that size rather than for this page. */
  vec3 glow = emissive*pow(peak,3.4)*.42
            + material*edge*.30
            + vec3(.72,.83,1.0)*glass*.1
            + mix(accent,vec3(1.0),.72)*pow(hot,1.6)*.80;
  color += glow / (1.0 + glow * .68);

  color+=(noise2(uv*118.0+uTime*.03)-.5)*.035*(field+.18);
  color=clamp((color-.5)*1.14+.5,0.0,1.0);
  gl_FragColor=vec4(mix(original.rgb,color,circle),original.a);
}`;
