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
 */

export const PALETTE = [
  '#9b72e4', '#7590a6', '#aeb8c4', '#7388aa',
  '#ef4c5c', '#76d8d1', '#c467e8', '#a8dbe7',
  '#e78ba7', '#9bc45b', '#f2c85c', '#55bff5',
  '#7785a1', '#8d55b8', '#86a7c9', '#f0783f',
];

/** id, label, and what the extra resolution actually bought. */
export const CONDITIONS = [
  ['vulnerable',    'Vulnerable',      'It broke from a point off centre. Shards radiate from the impact and the crazing only appears near a real seam.'],
  ['hidden',        'Hidden',          'Three smoke registers and a tide that engulfs from below, rather than fog hanging evenly over a face.'],
  ['restrained',    'Restrained',      'Angled iron bands with lashings across them. A knot is where a lashing crosses a band, and a knot catches light.'],
  ['cloaked',       'Cloaked',         'Dazzle: flat panels at three values with hard boundaries. An outline drawn on a shape still shows the shape.'],
  ['markedForDeath','Marked for Death','A reticle, sparse and mechanical, with a sweep running through it. The one condition somebody else put there.'],
  ['spectral',      'Spectral',        'One bright band sweeping down through standing scan lines, so the motion has a direction.'],
  ['hexed',         'Hexed',           'Two lattices turning against each other. The script is the moire where they interfere, so it moves on its own.'],
  ['invisible',     'Invisible',       'Two caustic families at different rates. Where they cross is the only genuinely bright thing, which is how water behaves.'],
  ['enraptured',    'Enraptured',      'A bloom with petals over it and motes drifting through, each mote carrying its own focus.'],
  ['corroded',      'Corroded',        'It eats in patches. Corrosion everywhere at once is a colour; corrosion with clean metal beside it is a material.'],
  ['stunned',       'Stunned',         'One front, expanding and dying, with chips coming off the spokes behind it.'],
  ['charged',       'Charged',         'It branches from a source off centre, and the filament is the same curve as the arc at a much higher power.'],
  ['drained',       'Drained',         'It runs downward and it has a leading edge, with finer runs inside the trails.'],
  ['horrified',     'Horrified',       'The edge advances on a breath, and the front of it is lit.'],
  ['silenced',      'Silenced',        'Two waves of equal frequency travelling opposite ways. The bright rings are the nodes where both peak.'],
  ['ablaze',        'Ablaze',          'Domain-warped, so the flame turns over itself instead of scrolling upward as a sheet, over a white-hot base.'],
];

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
   Motes and pits are interiors; crazing and crust are edges. Asking for a
   dot and being handed a web is how Enraptured ended up drawing Corroded. */
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

/* x = the material field, exactly the quantity the shipped shader called
   the value and composited on. y = the incandescent part of it, which is new
   and is always a SUBSET of x rather than another layer over it — that is
   what keeps a hot core inside its own effect instead of floating on top. */
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
   conditions drawing rings is four conditions nobody can tell apart. */
vec2 conditionPattern(float id, vec2 p, float t, float d) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float n = fbmD(p * 3.0 + vec2(t * .07, -t * .05), d);

  /* Vulnerable — it broke from somewhere. Shards are voronoi in the
     impact's own polar frame, so they radiate the way glass actually
     fails, and the crazing is gated on nearness to a real seam instead of
     sprinkled over the whole face. */
  if (id < .5) {
    vec2 q = p - vec2(-.26, -.18);
    float rr = length(q), qa = atan(q.y, q.x);
    float seam = voronoiEdge(vec2(qa * 1.35, rr * 2.6) * 1.5);
    float shard = 1.0 - smoothstep(.020, .130, seam);
    float craze = (1.0 - smoothstep(.03, .15, voronoiEdge(p * 13.0))) * d
                * smoothstep(.38, .0, seam);
    float splits = pow(max(0.0, cos(qa * 7.0 + rr * 3.0)), 30.0) * smoothstep(1.7, .08, rr);
    return vec2(clamp(shard * .92 + craze * .6 + splits * .7, 0.0, 1.0),
                (1.0 - smoothstep(.0, .034, seam)) * (.62 + .38 * sin(t * 2.1)) + splits * .5);
  }

  /* Hidden — three smoke registers and a tide. It engulfs from below
     rather than hanging as fog, which is the difference between a
     creature hiding and a creature behind a filter. */
  if (id < 1.5) {
    float base = fbmD(p * 1.5 + vec2(t * .050, -t * .035), d);
    float mid  = fbmD(p * 3.6 - vec2(t * .100,  t * .060) + 11.0, d);
    float fine = fbmD(p * 8.2 + vec2(-t * .170, t * .090) + 27.0, d) * d;
    float tide = smoothstep(1.0, -.55, p.y);
    return vec2(clamp(smoothstep(.46, .74, base * .62 + mid * .30 + fine * .22 + tide * .40),
                      0.0, 1.0), 0.0);
  }

  /* Restrained — angled bands, hard-edged, with lashings across them.
     A knot is where a lashing crosses a band, and a knot catches light. */
  if (id < 2.5) {
    float axis = p.y * 1.9 + p.x * .78;
    float u = abs(fract(axis * 1.25 + .5) - .5);
    float bands = 1.0 - smoothstep(.150, .215, u);
    float lash  = pow(max(0.0, sin((p.x * 2.4 - p.y * 1.1) * 7.0)), 12.0);
    float rivet = (1.0 - smoothstep(.06, .20, voronoiEdge(vec2(axis * 2.2, p.x * 3.4) * 1.8)))
                * d * bands;
    return vec2(clamp(bands * .60 + lash * .26 + rivet * .40, 0.0, 1.0),
                bands * lash * 1.9 + rivet * .70 + bands * pow(1.0 - u * 5.0, 8.0) * .35);
  }

  /* Cloaked — dazzle. Flat panels at three values with hard boundaries
     between them, which is what actually defeats a silhouette: an outline
     drawn on a shape still shows the shape. The first version of this drew
     glowing cell seams and was indistinguishable from Vulnerable, because
     it was the same primitive pointed at the same subject. Two conditions
     may not share a primitive; that is most of what uniqueness is here. */
  if (id < 3.5) {
    vec3 v = voronoi3(p * 2.1 + vec2(sin(t * .09), cos(t * .07)) * .10);
    float panels = floor(fract(v.z * 7.13) * 3.0) * .5;
    float seam = 1.0 - smoothstep(.02, .080, v.y);
    float grain = smoothstep(.34, .06, voronoiCell(p * 7.4)) * d;
    return vec2(clamp(panels * .80 + seam * .28 + grain * .22, 0.0, 1.0), seam * .45);
  }

  /* Marked for Death — a reticle, which is mechanical and sparse. It is
     the one condition on the token that somebody else put there. */
  if (id < 4.5) {
    float ring  = band(r, .70, .020);
    float outer = band(r, .79, .008);
    float cross = (band(abs(p.x), 0.0, .011) + band(abs(p.y), 0.0, .011))
                * smoothstep(.24, .42, r) * smoothstep(1.0, .82, r);
    float ticks = pow(max(0.0, cos(a * 16.0)), 50.0) * band(r, .70, .055);
    float sweep = band(r, .28 + .18 * fract(t * .22), .020);
    float lock  = pow(max(0.0, cos(a * 4.0)), 18.0) * band(r, .70, .105);
    return vec2(clamp(ring * .9 + outer * .6 + cross * .8 + ticks * .7 + sweep * .7 + lock * .5,
                      0.0, 1.0),
                (ring * .85 + cross * .65 + sweep * .9) * (.55 + .45 * sin(t * 2.4)));
  }

  /* Spectral — one bright band sweeping down through standing scan lines,
     so the motion has a direction instead of shimmering in place. */
  if (id < 5.5) {
    float drift = p.y + n * .14 - t * .20;
    float scan  = pow(.5 + .5 * sin(drift * 54.0), 10.0);
    float fine  = pow(.5 + .5 * sin(drift * 150.0), 8.0) * d;
    float fog   = smoothstep(.44, .78, fbmD(p * 2.6 + vec2(t * .07, 0.0), d));
    float sweep = band(fract(drift * .55), .5, .050);
    return vec2(clamp(scan * .54 + fine * .26 + fog * .44 + sweep * .5, 0.0, 1.0),
                sweep * (.4 + .6 * fog) * 1.5);
  }

  /* Hexed — two lattices turning against each other. The script is the
     moire where they interfere, which is a place rather than a texture,
     so it moves without either lattice moving much. */
  if (id < 6.5) {
    float l1 = pow(max(0.0, cos(a *  7.0 + r * 17.0 - t * .50)), 12.0);
    float l2 = pow(max(0.0, cos(a * 11.0 - r * 13.0 + t * .34)), 14.0);
    float rings = band(fract(r * 3.6 - t * .05), .5, .06) * .5;
    return vec2(clamp(l1 * .70 + l2 * .60 + rings, 0.0, 1.0), l1 * l2 * 3.2);
  }

  /* Invisible — two caustic families at different rates. Where they cross
     is the only genuinely bright thing, which is how water behaves. */
  if (id < 7.5) {
    float w  = fbmD(p * 2.4 + vec2(t * .09, -t * .07), d);
    float c1 = pow(1.0 - abs(sin((w * 3.0 + r * 4.5 - t * .14) * PI * 2.0)), 6.0);
    float c2 = pow(1.0 - abs(sin((w * 4.2 - r * 8.0 + t * .22) * PI * 2.0)), 10.0) * d;
    float prism = pow(.5 + .5 * sin(a * 3.0 + p.x * 7.0 - t * .30), 10.0);
    return vec2(clamp(c1 * .80 + c2 * .50 + prism * .36, 0.0, 1.0), c1 * c2 * 2.6 + prism * .18);
  }

  /* Enraptured — a bloom with things drifting through it. */
  if (id < 8.5) {
    float fibers = pow(.5 + .5 * cos(a * 28.0 + n * 5.0), 12.0);
    float petals = pow(max(0.0, cos(a * 5.0 + t * .22)), 4.0) * band(r, .56 + .07 * sin(t * .70), .20);
    float halo   = band(r, .40 + .04 * sin(t * .85), .12);
    float motes  = smoothstep(.30, .04, voronoiCell(p * 4.4 + vec2(sin(t * .2) * .25, -t * .13)));
    motes *= .35 + .65 * d;
    return vec2(clamp(fibers * (1.0 - r * .30) * .44 + petals * .55 + halo * .50 + motes * .60,
                      0.0, 1.0),
                motes * motes * 1.5 + petals * petals * .45);
  }

  /* Corroded — it eats in PATCHES. Corrosion everywhere at once is a
     colour; corrosion with clean metal beside it is a material. */
  if (id < 9.5) {
    float patch = smoothstep(.42, .70, fbmD(p * 2.2 + vec2(t * .03, 0.0), d));
    float e     = voronoiEdge(p * 6.2);
    float pits  = smoothstep(.42, .10, voronoiCell(p * 6.2));
    float crust = band(e, .24, .07);
    float fine  = (1.0 - smoothstep(.04, .15, voronoiEdge(p * 15.0))) * d;
    return vec2(clamp(patch * (pits * .82 + crust * .50 + fine * .35), 0.0, 1.0),
                patch * crust * .95);
  }

  /* Stunned — one front, expanding and dying, with chips off the spokes. */
  if (id < 10.5) {
    float ph = fract(t * .30);
    float ring  = band(r, ph * 1.05, .050) * (1.0 - ph * .6);
    float front = band(r, ph * 1.05, .010) * (1.0 - ph);
    float bearing = cos(a * 7.0 + .4 * sin(t));
    float spokes = pow(max(0.0, bearing), 16.0) * smoothstep(1.0, .15, r);
    float chips  = pow(max(0.0, bearing), 90.0) * smoothstep(1.0, .15, r) * d;
    return vec2(clamp(ring * .78 + spokes * .58 + chips * .50, 0.0, 1.0),
                front * 2.0 + chips * .85 + spokes * spokes * .30);
  }

  /* Charged — it comes from somewhere, and the filament is the same curve
     as the arc taken to a much higher power, so it sits INSIDE the glow. */
  if (id < 11.5) {
    vec2 q = p - vec2(.30, -.42);
    float qa = atan(q.y, q.x), rr = length(q);
    float branch = fbmD(vec2(qa * 2.2, rr * 5.0 - t * 1.1), d);
    float curve = sin(qa * 4.0 + branch * 8.0);
    float reach = smoothstep(1.9, .08, rr);
    float arcs = pow(1.0 - abs(curve), 14.0) * reach;
    float fil  = pow(1.0 - abs(curve), 60.0) * reach;
    float flash = pow(.5 + .5 * sin(t * 5.1 + n * 7.0), 12.0);
    return vec2(clamp(arcs * 1.05 + flash * .18, 0.0, 1.0),
                (fil + arcs * arcs * .6) * (.40 + .60 * flash));
  }

  /* Drained — it runs downward and it has a leading edge. */
  if (id < 12.5) {
    float sink   = smoothstep(-.55, .88, -p.y + .18 * sin(p.x * 4.2 + t * .28));
    float trails = pow(.5 + .5 * sin(p.x * 26.0 + n * 3.5), 12.0);
    float runs   = pow(.5 + .5 * sin(p.x * 70.0 + n * 5.0), 20.0) * d;
    float drop   = band(fract(-p.y * 1.6 + t * .35 + noise2(vec2(p.x * 7.0, 0.0)) * .9), .5, .05) * trails;
    return vec2(clamp(sink * .72 + trails * sink * .42 + runs * sink * .30 + drop * .5, 0.0, 1.0),
                drop * 1.5 + trails * sink * .22);
  }

  /* Horrified — the edge advances on a breath, and the front of it is lit. */
  if (id < 13.5) {
    float breath = .5 + .5 * sin(t * .75);
    float reach = .46 + .13 * breath;
    float tend = fbmD(vec2(a * 2.6, r * 3.0 - t * .20), d);
    float mask = smoothstep(reach, 1.05, r + (tend - .5) * .55);
    float hairs = pow(.5 + .5 * cos(a * 23.0 + tend * 9.0 - t * .30), 10.0) * mask;
    return vec2(clamp(mask * .92 + hairs * .40, 0.0, 1.0), band(mask, .22, .10) * .95);
  }

  /* Silenced — two waves of equal frequency travelling opposite ways. The
     bright rings are the nodes where both peak at once, which is what a
     standing wave is and is why they do not travel. */
  if (id < 14.5) {
    float w1 = pow(.5 + .5 * cos((r * 7.0 + t * .32) * PI * 2.0), 14.0);
    float w2 = pow(.5 + .5 * cos((r * 7.0 - t * .32) * PI * 2.0), 14.0);
    float fine = pow(.5 + .5 * cos(r * 17.0 * PI * 2.0), 20.0) * d;
    float fall = smoothstep(1.05, .05, r);
    return vec2(clamp((w1 + w2) * .5 * fall * .95 + fine * fall * .35, 0.0, 1.0),
                w1 * w2 * fall * 2.8);
  }

  /* Ablaze — the domain warp is what makes a flame turn over itself
     instead of scrolling upward as a sheet, and fire is the subject where
     the extra octaves matter most, because fire is all detail. */
  vec2 flameP = vec2(p.x * 2.3, p.y * 2.6 - t * .72);
  vec2 curl = vec2(gnoise(flameP * .70 + t * .40), gnoise(flameP * .70 + 7.0 - t * .30))
            * .62 * (.35 + .65 * d);
  float flameNoise = fbmD(flameP + vec2(0.0, sin(p.x * 4.4 + t) * .24) + curl, d);
  float lift = flameNoise + (p.y + 1.0) * .30;
  float flame = smoothstep(.40, .80, lift);
  float tongues = pow(.5 + .5 * sin(p.x * 14.0 + flameNoise * 9.0), 8.0) * flame;
  return vec2(clamp(flame * .86 + tongues * .32, 0.0, 1.0), smoothstep(.78, 1.04, lift) * 1.05);
}

vec2 conditionWarp(float id, vec2 p, float t, float value) {
  float r=length(p); float a=atan(p.y,p.x); vec2 radial=r>.001?p/r:vec2(0.0);
  if(id<.5)return vec2(sin(p.y*31.0+t),cos(p.x*27.0-t*.7))*value*.009;
  if(id<1.5)return vec2(fbm(p*2.1+t*.05)-.5,fbm(p*2.3-t*.04+9.0)-.5)*.022;
  if(id<2.5)return -radial*value*.018;
  if(id<3.5)return vec2(sin(p.y*8.0+t*.6),cos(p.x*5.0-t*.3))*.014;
  if(id<4.5)return radial*sin(t*1.6+r*12.0)*value*.012;
  if(id<5.5)return vec2(.018*sin(t*.7),-.01*cos(t*.5))*value;
  if(id<6.5)return vec2(-p.y,p.x)*value*.012;
  if(id<7.5)return vec2(sin((p.y+value)*19.0+t),cos((p.x-value)*17.0-t))*.019;
  if(id<8.5)return -radial*value*.014;
  if(id<9.5)return radial*(fbm(p*6.0+t*.03)-.5)*.024;
  if(id<10.5)return radial*sin(r*27.0-t*2.4)*value*.018;
  if(id<11.5)return vec2(sin(a*9.0+t*4.0),cos(a*7.0-t*3.0))*value*.014;
  if(id<12.5)return vec2(0.0,value*.025);
  if(id<13.5)return -radial*value*.021;
  if(id<14.5)return radial*sin(r*34.0+t*1.3)*value*.013;
  return vec2(sin(p.y*13.0+t*2.0),value*-.8)*value*.015;
}

vec3 conditionAccent(float id, vec3 base, vec2 p, float t, float value) {
  float r=length(p); float a=atan(p.y,p.x);
  if(id<.5)return mix(base,vec3(.92,.82,1.0),value*.7);
  if(id<1.5)return mix(vec3(.025,.045,.065),base,.42+value*.25);
  /* The one accent this proposal changes, and it is changed because the
     structure under it changed. The old ramp went to near-white across the
     whole of its range, which was right for a hairline ring and turns a
     thick band into white tape. Cubing it keeps the band dark iron and
     spends the brightness only on its lit edge. */
  if(id<2.5)return mix(vec3(.085,.10,.13),vec3(.88,.93,1.0),pow(value,4.5));
  if(id<3.5)return mix(base*.42,vec3(.78,.88,1.0),value*.62);
  if(id<4.5)return mix(vec3(.34,.015,.035),vec3(1.0,.52,.58),value*.76);
  if(id<5.5)return mix(base,vec3(.76,1.0,.96),value*.7);
  if(id<6.5)return mix(vec3(.22,.015,.32),vec3(.94,.51,1.0),value*.82);
  if(id<7.5)return .58+.42*cos(vec3(0.0,2.1,4.2)+a*2.0+r*12.0-t*.7);
  if(id<8.5)return mix(vec3(.38,.02,.16),vec3(1.0,.78,.88),value*.76);
  if(id<9.5)return mix(vec3(.1,.2,.025),vec3(.82,1.0,.34),value*.78);
  if(id<10.5)return mix(base,vec3(1.0,.96,.58),value*.82);
  if(id<11.5)return mix(vec3(.03,.24,.48),vec3(.72,.96,1.0),value*.86);
  if(id<12.5)return mix(vec3(.025,.035,.065),base*.72,value*.35);
  if(id<13.5)return mix(vec3(.035,.005,.055),vec3(.68,.23,.82),value*.7);
  if(id<14.5)return mix(vec3(.1,.2,.31),vec3(.78,.91,1.0),value*.72);
  return mix(vec3(.62,.045,.008),vec3(1.0,.86,.27),clamp(value+p.y*.16,0.0,1.0));
}

vec2 shardCenter(float id) {
  if(id<.5)return vec2(-.52,-.58); if(id<1.5)return vec2(.34,-.60);
  if(id<2.5)return vec2(-.68,-.04); if(id<3.5)return vec2(-.10,-.13);
  if(id<4.5)return vec2(.56,-.01); if(id<5.5)return vec2(-.43,.55);
  return vec2(.33,.58);
}
vec2 shardOffset(float id) {
  if(id<.5)return vec2(-.112,-.082); if(id<1.5)return vec2(-.018,-.114);
  if(id<2.5)return vec2(.112,-.069); if(id<3.5)return vec2(-.123,.018);
  if(id<4.5)return vec2(-.012,.009); if(id<5.5)return vec2(.124,.039);
  return vec2(.027,.123);
}
float shardAngle(float id) {
  if(id<.5)return -.065; if(id<1.5)return .035; if(id<2.5)return .082;
  if(id<3.5)return .055; if(id<4.5)return -.025; if(id<5.5)return -.072;
  return .047;
}
vec2 turn(vec2 p,float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*p;}

vec2 tokenUv(vec2 tex){ return tex * inputSize.xy / outputFrame.zw; }

vec4 sampleArt(vec2 local){
  vec2 tex = clamp(local, 0.0, 1.0) * outputFrame.zw * inputSize.zw;
  return texture2D(uSampler, clamp(tex, inputClamp.xy, inputClamp.zw));
}

vec4 shattered(vec2 uv, vec2 p) {
  float first=99.0; float second=99.0; float sid=0.0;
  for(int i=0;i<7;i++){
    float fi=float(i);
    float rough=(noise2(p*4.0+vec2(fi*7.1,fi*3.3))-.5)*.09;
    float d=distance(p,shardCenter(fi))+rough;
    if(d<first){second=first;first=d;sid=fi;} else if(d<second){second=d;}
  }
  float seam=second-first;
  float solid=smoothstep(.052,.112,seam);
  vec2 source=turn(p-shardOffset(sid),-shardAngle(sid));
  float circle=1.0-smoothstep(.93,.985,length(source));
  vec2 suv=source*.5+.5;
  vec4 art=sampleArt(suv);
  float lum=dot(art.rgb,vec3(.2126,.7152,.0722));
  float grain=noise2(source*92.0)-.5;
  float innerEdge=band(seam,.128,.022);
  float rim=band(length(source),.91,.022);
  vec3 cold=vec3(lum*.72+grain*.045);
  cold=mix(cold,vec3(.76,.81,.84),innerEdge*.42+rim*.36);
  cold*=.7+.3*smoothstep(-.9,.8,-source.y);
  return vec4(clamp(cold,0.0,1.0),art.a*solid*circle);
}

void main() {
  vec2 uv=tokenUv(vTextureCoord);
  vec2 p=uv*2.0-1.0;
  if(uDead>.5){gl_FragColor=shattered(uv,p);return;}

  /* Detail is bought with pixels. outputFrame.z is the token's width on
     screen, so a creature filling the viewport gets its second register of
     structure and one at 40px never renders the frequencies that would
     crawl. Nothing else in this shader is allowed to know about the
     camera — see tokenUv — and this is the deliberate exception, because
     the question "how much detail can be resolved" is a question about
     pixels by definition. */
  float detail = smoothstep(44.0, 104.0, outputFrame.z);

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
       a haze, and two hazes of different hues are the same haze. The
       smoothstep curve fixes 0 and 1 and pushes everything between them
       toward one end, so a condition ends up with places it IS and places
       it is not. Applied here rather than in sixteen branches because it is
       one claim about all of them. */
    float value=field.x;
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
  float tint=clamp(.19+field*.52+min(uCount-1.0,2.0)*.018,.19,.66);
  vec3 color=mix(warped.rgb,colorized,tint);
  color*=1.0-clamp(darkness/count,0.0,1.0)*.38;

  /* Everything added to the picture is gathered first and rolled off
     together. Adding each term straight onto that accumulator and clamping at the
     end is what turns a bright effect white: the clamp maps every value
     above 1 to the same place, so a hot core and a merely bright glow
     arrive at the screen identical. */
  float edge=smoothstep(.48,.98,length(p));
  float glass=pow(max(0.0,1.0-distance(uv,vec2(.36,.27))*1.9),6.0);
  vec3 emissive=mix(accent,vec3(1.0),.52);
  /* The rim is doing a job the rest cannot: at 40px a token is a disc with
     a colour, and the ring of material around its edge is the only part of
     any of this that still reads. It is worth more than the interior at
     that size, so it is weighted for that size rather than for this page. */
  vec3 glow = emissive*pow(peak,2.6)*.46
            + material*edge*.22
            + vec3(.72,.83,1.0)*glass*.1
            + mix(accent,vec3(1.0),.80)*pow(hot,1.6)*.78;
  color += glow / (1.0 + glow * .55);

  color+=(noise2(uv*118.0+uTime*.03)-.5)*.035*(field+.18);
  color=clamp((color-.5)*1.08+.5,0.0,1.0);
  gl_FragColor=vec4(mix(original.rgb,color,circle),original.a);
}`;
