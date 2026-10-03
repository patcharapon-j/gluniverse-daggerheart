/**
 * Procedural condition materials for canvas tokens.
 *
 * One filter composites every active condition before it touches the portrait.
 * That ordering is the important part: red plus blue becomes a saturated purple
 * material; it never becomes two translucent films bleaching the art. The HTML
 * HUD owns the joined condition sentence. This file owns only pixels inside the
 * token mesh.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { CONDITIONS } from "./config.ts";

export interface ConditionMaterialDef {
  id: string;
  color: readonly [number, number, number];
  /** The same colour as CSS, for the HUD sentence that names this condition. */
  hex: string;
}

const rgb = (hex: string): readonly [number, number, number] => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};

/**
 * One hue per condition, positional against `CONDITIONS`.
 *
 * The last seven are the optional chapters' and the Guardian's, and finding
 * hues for them is where this palette started to strain — which the shader's
 * own notes predicted: at this count "the only thing separating them is hue,
 * which is the actual complaint". So the seven lean on the accent ramps below
 * to do the telling apart, and the hex only has to be legible in the HUD
 * sentence and not confusable at a glance.
 *
 * Two of them are deliberately a pair rather than two colours. Broken and
 * Destroyed are one step apart in the rules — a segment that cannot act, then
 * one that cannot do anything — so they are one hue at two values, and the
 * palette says the same thing the two marks do.
 */
const PALETTE = [
  "#9b72e4", "#7590a6", "#aeb8c4", "#7388aa",
  "#ef4c5c", "#76d8d1", "#c467e8", "#a8dbe7",
  "#e78ba7", "#9bc45b", "#f2c85c", "#55bff5",
  "#7785a1", "#8d55b8", "#86a7c9", "#f0783f",
  /* roped: hemp. frostbitten: rime. nauseated: bile. cursed: wine.
     unstoppable: hot bronze. broken / destroyed: one stone, two values. */
  "#c9a06a", "#bfe6f2", "#6f8f5e", "#a03a6e",
  "#c9922e", "#8c8378", "#5e5952",
] as const;

/**
 * The material every condition this system does not name is drawn in.
 *
 * A GM can type a condition. There is exactly one material for all of them
 * and there deliberately is not one each: the named ones are drawn as what they
 * ARE, and nothing here knows what "Waterlogged" is. Giving a typed name a
 * texture picked by hashing it would be this shader inventing a subject,
 * which is worse than admitting it has none — a creature would be wearing
 * fire because of how its condition happened to spell.
 *
 * It is still a material rather than nothing, and the reason is the ladder
 * in `token.css`: the sentence naming the condition leaves at 36px and the
 * material outlives it. A condition whose only expression is the sentence
 * stops existing the moment you zoom out to look at the fight.
 */
export const ADHOC_CONDITION_ID = "adhoc";
const ADHOC_HEX = "#c8b39a";

export const CONDITION_MATERIALS: readonly ConditionMaterialDef[] = [
  ...CONDITIONS.map((condition, i) => ({
    id: condition.id,
    color: rgb(PALETTE[i] ?? "#d8e2ec"),
    hex: PALETTE[i] ?? "#d8e2ec",
  })),
  { id: ADHOC_CONDITION_ID, color: rgb(ADHOC_HEX), hex: ADHOC_HEX },
];

/**
 * The material colour a condition is drawn in, for the HUD.
 *
 * The sentence on the chip and the texture on the mesh are one statement
 * about one creature, so they are one number. Exported from here rather
 * than duplicated in the stylesheet for the ordinary reason: a palette
 * kept in two places is a palette that disagrees with itself the first
 * time somebody adds a condition.
 */
export function conditionTint(id: string | undefined): string | undefined {
  return id ? BY_ID.get(id)?.hex : undefined;
}

const BY_ID = new Map(CONDITION_MATERIALS.map((material, index) => [material.id, { ...material, index }]));

/** As many as the composite has slots for. */
export const CONDITION_SLOTS = 5;

/**
 * The materials a set of active status ids is drawn with.
 *
 * Total by construction: an id this file does not know is a condition
 * somebody typed, and every one of those shares the unnamed material. That
 * rule lives here rather than at the call site so a caller cannot silently
 * lose a condition by handing over an id that is not one this system names —
 * the old `map(get).filter(Boolean)` did exactly that, and did it invisibly.
 *
 * Deduped for a reason the named ones never needed. Five typed conditions are
 * one texture, and without this they would take every slot the composite has
 * to say the same thing five times over.
 */
export function conditionMaterialsFor(
  ids: readonly string[],
): Array<ConditionMaterialDef & { index: number }> {
  const seen = new Set<string>();
  const out: Array<ConditionMaterialDef & { index: number }> = [];
  for (const id of ids) {
    const key = BY_ID.has(id) ? id : ADHOC_CONDITION_ID;
    if (seen.has(key)) continue;
    seen.add(key);
    const material = BY_ID.get(key);
    if (material) out.push(material);
    if (out.length === CONDITION_SLOTS) break;
  }
  return out;
}
const MARK = Symbol("daggerheartConditionMaterial");
/* When each condition in each slot started being drawn, and which slot holds
   which, so `tick` can advance the onset without re-deriving any of it. Held
   on the filter rather than in a second map keyed by token, because the
   filter is already the per-token object this module owns and `detach`
   already throws it away. */
const AGES = Symbol("daggerheartConditionAges");
const SLOTS = Symbol("daggerheartConditionSlots");
/** Long enough that smoothstep is saturated: a condition that is just there. */
const ARRIVED = 99;

/**
 * A stable per-token phase offset.
 *
 * Every pattern in the shader runs off one clock, so without this two
 * creatures carrying the same condition animate in exact phase — a rank of
 * identical adversaries pulsing together, which reads as one effect applied
 * to a group rather than as a condition each of them has. Derived from the
 * id so it survives a redraw, a scene reload and the token moving; a seed
 * taken from anything on screen would reseat the phase every time the view
 * panned.
 *
 * Spread over a minute because the slowest thing in the set loops on about
 * twenty seconds, so a minute's worth of offsets puts two tokens somewhere
 * genuinely different in every pattern rather than a third of the way into
 * the same one.
 */
function tokenSeed(token: any): number {
  const id = String(token?.document?.id ?? token?.id ?? "");
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 4294967296) * 60;
}

const filters = new Map<any, any>();
let FilterClass: any;
let registered = false;
let warned = false;

/**
 * GLSL 1 so the same program runs on Foundry's PixiJS 7 WebGL pipeline.
 *
 * Three properties are load-bearing and none of them is obvious from the code:
 *
 *   Detail is bought with pixels. Every fine octave is scaled by the token's
 *   width on screen, because a frequency that cannot be resolved does not
 *   arrive as detail, it arrives as a crawling shimmer on a small token and as
 *   a uniform lift on a still one. The governing size is 40 pixels, not the
 *   one on a design page.
 *
 *   The field does two jobs. It is both how much material is present and how
 *   brightly that material burns, so a condition covering area with dark
 *   matter has to claim a LOW field and put its light in the second component.
 *   Getting this backwards is what turns iron bands into white tape.
 *
 *   Every branch moves. A material that holds still is a sticker on the token
 *   no matter how good the texture is. Checked by tools/build-condition-gate.
 *
 * design/qa/condition-fidelity/ holds the gate this was accepted through and
 * a frozen copy of the shader it replaced.
 */
export const TOKEN_CONDITION_FRAGMENT = `
precision highp float;
varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform float uTime;
uniform float uCount;
uniform float uDead;
/* Where the creature ENDS, as a fraction of the filter frame. 1.0 means the
   frame is the creature, which is the plain-token case and the default. It
   is not derived in here on purpose: what the frame contains is a question
   about Foundry's mesh, and this shader is deliberately blind to everything
   but its own two frames. See subjectInFrame in token-hud.ts. */
uniform float uSubject;
uniform vec4 inputSize;    // xy = pooled texture size, zw = 1/size
uniform vec4 outputFrame;  // xy = frame origin, zw = frame size in screen px
uniform vec4 inputClamp;   // xy = min uv, zw = max uv, both in texture space
uniform float uId0; uniform float uId1; uniform float uId2; uniform float uId3; uniform float uId4;
uniform vec3 uColor0; uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uColor3; uniform vec3 uColor4;
/* A hash of the token id, constant for the token's life. Every pattern in
   here runs off one clock, so two creatures with the same condition were in
   exact phase with each other: a line of goblins pulsing in time is the one
   artifact that reads as a shader rather than as a condition. Hashed in JS
   rather than derived from the frame, because anything derived from where the
   token is on screen jumps phase the moment it moves or the view pans. */
uniform float uSeed;
/* Seconds since each condition was applied, so a material can arrive rather
   than appear. There is no counterpart for removal: fading out needs the slot
   held open after the condition is gone, which means a dying condition
   competing for a slot with a live one, and the limit is five. Onset is the
   half that is visible. */
uniform float uAge0; uniform float uAge1; uniform float uAge2; uniform float uAge3; uniform float uAge4;

#define PI 3.141592653589793

/* How wide one screen pixel is in p, the creature's own space.

   Set once in main, from the single camera read this shader is allowed, and
   it is a global rather than a parameter because the alternative is threading
   one number nobody varies through four signatures and every call site in the
   ladder.

   Every edge in here was a fixed width in token space, which means a feature
   specified at a fortieth of the creature is a quarter of a pixel on a 40px
   token and sixteen pixels on a close-up. That is the whole of why fine
   detail crawls: not that it is too fine, but that nothing in this shader
   ever knew how fine a pixel is. The default is the close-up case, so a
   harness that forgets to set it gets the old behaviour. */
float gPixel = .004;

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
   a retune of every condition. */
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
   exactly as before, so at a small token this is the old field.

   The break is not a micro-optimisation, it is the difference between the
   budget being real and being decorative. Weighting the last two octaves by
   detail and adding them anyway means every fbm in this shader evaluates
   two octaves it has already decided are worth nothing — twenty-nine percent
   of the most expensive call in the file, spent to multiply by zero, at
   exactly the token size where the frame budget is tightest. detail is a
   uniform scalar per draw, so this branch is coherent across the whole
   token and costs nothing to take. */
float fbmD(vec2 p, float detail) {
  float value = 0.0;
  float amp = .5;
  mat2 turn = mat2(.8, -.6, .6, .8);
  for (int i = 0; i < 7; i++) {
    if (i >= 5 && detail < .001) break;
    float w = (i >= 5) ? detail : 1.0;
    value += amp * w * noise2(p);
    p = turn * p * 2.03 + 17.17;
    amp *= .5;
  }
  return value;
}

/* Five octaves, now actually five: the break above means passing zero detail
   stops the loop rather than running it twice more for nothing. The two
   callers of this are both in conditionWarp, which asks for a smooth
   displacement and never wanted the fine registers. */
float fbm(vec2 p) { return fbmD(p, 0.0); }

/* Domain warp, written once. Three branches and two warp cases hand-roll
   exactly this pair of gnoise lookups, and a shared one is what makes the
   second-order form below affordable. */
vec2 warp1(vec2 p, float t, float amp) {
  return p + vec2(gnoise(p + vec2(t, 0.0)), gnoise(p.yx - vec2(0.0, t))) * amp;
}

/* Warp the warp. One pass of domain warping turns straight noise into
   something that curls; two passes are what stop the curl itself reading as
   a regular swirl, which is the difference between smoke and a marbling
   filter. Cheap relative to the fbm it feeds. */
vec2 warp2(vec2 p, float t, float amp) {
  return warp1(warp1(p, t * .7, amp * .6), -t * .5, amp);
}

/* F1 and the seam, because a cell's INSIDE and a cell's EDGE are two
   different subjects and the shipped helper only ever offered the edge.
   Pits are interiors; crazing and crust are edges. Asking for a dot and
   being handed a web is how Enraptured ended up drawing Corroded. */
/* The same nine-cell search, plus the thing it was throwing away: WHERE the
   winning cell is.

   Without the site, a cellular pattern can only be a web — you know how far
   you are from a seam and nothing else. With it, every cell has a local
   origin, so a feature can be drawn relative to its own cell: a facet with
   its own orientation, a needle of its own length, a shard turned its own
   way. That is the mechanical fix for the comb. Everything repeated in this
   shader is currently produced by pow(cos(a * N), M) or fract(x * k), and
   both of those generate instances that are identical and evenly spaced,
   which is what reads as polka dots on a face rather than as a material.

   hash21(site) is then a stable random per cell, so orientation, scale and
   phase can all vary without a second noise lookup. */
vec4 voronoiSite(vec2 x) {
  vec2 ip = floor(x);
  vec2 fp = fract(x);
  float f1 = 8.0;
  vec2 best = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 cell = ip + g;
      vec2 o = vec2(hash21(cell), hash21(cell + 31.7));
      vec2 site = g + .16 + .68 * o;
      float dist = distance(fp, site);
      if (dist < f1) { f1 = dist; best = cell + .16 + .68 * o; }
    }
  }
  return vec4(f1, 0.0, best);
}

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

/* The transition is at least one pixel wide, and otherwise exactly what it
   was: at a size where the feature resolves, max() picks the authored width
   and the falloff is the same .8 ratio this shipped with. It only does
   anything once a band is thin enough that its own edge is narrower than the
   screen can draw, which is the case that aliases. */
float band(float value, float center, float width) {
  float w = max(width, gPixel * .75);
  float falloff = max(w * .8, gPixel);
  return 1.0 - smoothstep(w, w + falloff, abs(value - center));
}

/* A threshold that knows how wide a pixel is. The shader is full of
   smoothstep(lo, hi, x) with lo and hi chosen by eye on a design page, which
   is a transition authored for one zoom level and wrong at every other. */
float aastep(float edge, float value) {
  return smoothstep(edge - gPixel, edge + gPixel, value);
}

float idAt(int i) {
  if (i == 0) return uId0; if (i == 1) return uId1; if (i == 2) return uId2;
  if (i == 3) return uId3; return uId4;
}

vec3 colorAt(int i) {
  if (i == 0) return uColor0; if (i == 1) return uColor1; if (i == 2) return uColor2;
  if (i == 3) return uColor3; return uColor4;
}

float ageAt(int i) {
  if (i == 0) return uAge0; if (i == 1) return uAge1; if (i == 2) return uAge2;
  if (i == 3) return uAge3; return uAge4;
}

/* x = the material field, exactly the quantity the shipped shader
   composited on. y = the incandescent part of it, always a SUBSET of x
   rather than a layer over it — that is what keeps a hot core inside its
   own effect instead of floating on top of it.

   ── what changed, and why it is not a redesign ──────────────────
   Every condition keeps the primitive it shipped with. What they did not
   have was SCALE HIERARCHY or a COMPOSITION, and without those a pattern
   is a texture: one frequency, spread evenly, radially symmetric, filling
   the disc. Two dozen textures at one frequency are two dozen hazes, and the
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
  /* There was a shared fbm here, computed before the ladder and therefore on
     every pixel of every condition. Three branches used it. The other
     twenty-one paid seven octaves of gradient noise — the single most
     expensive call in this shader — for a number they never read. It now
     lives in the three branches that want it, which is most of the budget
     this pass spends on structure. */

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
    float n = fbmD(p * 2.2 + vec2(t * .14, -t * .10), d);
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
    float n = fbmD(p * 2.2 + vec2(t * .14, -t * .10), d);
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
     was not a moment ago.

     It came back as almost invisible, and the cause is contrast rather
     than amount. Every term was gated on patch and then summed, so the
     eaten area arrived as one even value — and the composite turns an even
     value into an even tint, which over a portrait is a wash you have to
     be told about. Rust is not even: there is a dark eaten floor, a pale
     raised rim standing around every pit, and clean metal beside it. The
     rim is the term that was missing and it is now the one worth the most.

     The frequency also came down. Pitting at 4.0 is a feature about a
     thirtieth of the token across, which at 40px is the wash again by
     another route. */
  if (id < 9.5) {
    float eat = .50 - .12 * sin(t * .30);
    float patch = smoothstep(eat, eat + .13, fbmD(p * 1.5 + vec2(t * .085, -t * .050), d));
    /* One call, both answers. voronoi3 returns the cell and the seam together
       and this asked for them separately on the identical coordinate, which
       is a nine-cell search run twice per pixel for one result. */
    vec3 v = voronoi3(p * 3.2);
    float e = v.y;
    float pits = smoothstep(.46, .07, v.x);
    float rim = 1.0 - smoothstep(.03, .15, e);
    float lip = 1.0 - smoothstep(.008, .055, e);
    float fine = smoothstep(.26, .05, voronoiCell(p * 7.4)) * (.40 + .60 * d);
    float bloom = band(fract(length(p - vec2(.20, .30)) * .80 - t * .16), .5, .16);
    /* The weights are the whole of it, and they are the opposite way round
       from how this shipped. Corroded's accent ramps dark green to acid
       green with the field, so whatever is given the HIGH value is what
       turns bright — and the pit interiors had it. That is a photograph of
       corrosion with the exposure inverted: bright holes in dull metal.
       The rim is the bright part of rust and the floor of a pit is the dark
       part, so the seam network takes the value and the interiors keep just
       enough to stay green rather than going to bare artwork. */
    return vec2(clamp(patch * (rim * .82 + lip * .34 + fine * .34 + pits * .26), 0.0, 1.0),
                patch * lip * (.34 + .62 * bloom));
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
    /* Half the exponent again. pow 5 was still a stripe about a fortieth of
       the token across, which is one pixel at the size this has to survive,
       and the filament at 26 was a hairline at any size at all. A bolt is
       thick where the current is and thin only at its own core, so the
       channel is drawn wide and the filament rides inside it. */
    float channel = pow(1.0 - abs(curve), 2.6) * reach;
    float fil = pow(1.0 - abs(curve), 11.0) * reach;
    /* Forks, and the reason they are worth their four lines: a single
       smooth channel reads as a painted stripe whatever it is coloured,
       because nothing in the world is a smooth stripe. Electricity is a
       path that keeps splitting and most of the splits going nowhere. The
       fbm gate is what makes them come and go along the bolt rather than
       standing there as a second bolt. */
    float fq = sin(qa * 5.3 - branch * 3.4 + 1.7);
    float fork = pow(1.0 - abs(fq), 6.0) * smoothstep(1.5, .16, rr)
               * smoothstep(.18, .58, branch);
    /* And it crawls. Charge on a conductor travels along it; a bolt whose
       brightness only pulses in place is a neon tube of the same shape. */
    float crawl = pow(.5 + .5 * sin(rr * 19.0 - t * 8.5 + branch * 6.0), 3.0);
    float beat = pow(.5 + .5 * sin(t * 2.70), 3.0);
    float strike = pow(.5 + .5 * sin(t * 5.30 + branch * 4.0), 8.0);
    float halo = smoothstep(.95, .0, rr) * (.25 + .75 * beat);
    float live = .42 + .58 * beat;
    return vec2(clamp(channel * live * 1.05 + fork * live * .62 + halo * .34, 0.0, 1.0),
                fil * live * (.45 + .95 * crawl) * (.55 + 1.05 * strike)
              + fork * fork * live * .55
              + channel * channel * 1.15 * beat + halo * halo * .45);
  }

  /* Drained — it runs downward and it has a leading edge. The level it
     runs to now falls over the loop, so the creature is being emptied
     rather than standing in a puddle at a fixed height. */
  if (id < 12.5) {
    float level = .18 * sin(p.x * 2.6 + t * .40) + .26 * sin(t * .33);
    float sink = smoothstep(-.62, .92, -p.y + level);
    float n = fbmD(p * 2.2 + vec2(t * .14, -t * .10), d);
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
     texture, and the shape is the part that has to survive.

     It used to be the fall-through and is an explicit branch now, because
     the fall-through has a better tenant: whatever this shader was handed
     that it does not recognise. */
  if (id < 15.5) {
    vec2 flameP = vec2(p.x * 1.70, p.y * 1.90 - t * 1.05);
    vec2 curl = vec2(gnoise(flameP * .55 + t * .55), gnoise(flameP * .55 + 7.0 - t * .42))
              * .72 * (.35 + .65 * d);
    float flameNoise = fbmD(flameP + vec2(0.0, sin(p.x * 3.0 + t * 1.30) * .30) + curl, d);
    float lift = flameNoise + (p.y + 1.0) * .30;
    float flame = smoothstep(.38, .78, lift);
    float tongues = pow(.5 + .5 * sin(p.x * 8.0 + flameNoise * 7.0 + t * .50), 6.0) * flame;
    return vec2(clamp(flame * .90 + tongues * .34, 0.0, 1.0), smoothstep(.80, 1.08, lift) * .82);
  }

  /* Roped — one cord, and that is the entire difference from Restrained.
     That one is a binding: several bands, lashed, tightening on the body.
     This is a single line with tension along it and a loop at one end, and
     the tension travels *away* — because the rule is that whoever threw it
     "must remain within Very Close range", so the thing the mark has to say
     is that somebody is holding the other end. A haul on a slow period, and
     the lay of the fibre running along the cord so it is rope rather than a
     drawn stripe. */
  if (id < 16.5) {
    float across = p.x * .55 + p.y * .84;
    float along  = p.x * .84 - p.y * .55;
    float haul   = .055 * sin(t * .70);
    float cord   = band(across, haul, .165);
    float lay    = pow(max(0.0, sin(along * 12.0 - t * 1.15)), 3.0);
    float loop   = band(abs(length(p - vec2(.36, .32)) - .29), 0.0, .080);
    float strain = band(fract(along * .42 - t * .32), .5, .16);
    return vec2(clamp(cord * (.60 + .40 * lay) + loop * .76, 0.0, 1.0),
                cord * lay * .44 + loop * (.24 + .46 * strain));
  }

  /* Frostbitten — rime, and it grows inward from the rim. Frost does not
     appear evenly over a surface; it takes the edges first and creeps, so
     the creep front is the animation and the facets are what it leaves
     behind. Needles rather than a wash, because a wash of pale blue at 40px
     is a colour cast and reads as lighting rather than as a condition.

     Deliberately not Stunned's radial burst even though both are spiky: that
     one is irregular because a blow is, and this one repeats because frost
     grows the same way in every direction. Same argument as the mark. */
  if (id < 17.5) {
    float facet   = 1.0 - smoothstep(.030, .155, voronoiEdge(p * 5.2 + 3.0));
    float needles = pow(max(0.0, cos(a * 13.0 + fbmD(p * 3.0, d) * 3.0)), 6.0)
                  * smoothstep(.28, 1.05, r);
    float creep   = smoothstep(.34 + .17 * sin(t * .30), 1.06, r);
    float glint   = band(fract(a / (PI * 2.0) - t * .07), .5, .055);
    return vec2(clamp((facet * .55 + needles * .68) * creep, 0.0, 1.0),
                facet * creep * (.28 + .55 * glint));
  }

  /* Nauseated — a churn, which is the one motion in the set that turns over
     rather than travelling. Hidden is the other fbm-and-tide branch and it
     RISES: smoke engulfing from below, going one way. This rolls, because
     what the rule describes is not something arriving, it is something
     already inside and moving. The domain warp is what makes it turn over
     itself; without it the same noise scrolls, and a scroll is a current. */
  if (id < 18.5) {
    vec2 swirl  = vec2(gnoise(p * .90 + t * .17), gnoise(p * .90 + 19.0 - t * .13)) * .80;
    float churn = fbmD(p * 1.70 + swirl + vec2(0.0, sin(t * .33) * .32), d);
    float roll  = band(fract(churn * 1.6 - t * .21), .5, .19);
    float gut   = smoothstep(.86, .08, r) * (.30 + .30 * sin(t * .55));
    return vec2(clamp(smoothstep(.34, .74, churn) * .80 + roll * .38 + gut * .24, 0.0, 1.0),
                roll * .46);
  }

  /* Cursed — a spiral that does not arrive anywhere, over glyphs that turn
     the other way. Every other bind here has a printed exit and is drawn as
     a shape you can see the end of; this one "resists an ordinary clear",
     so the figure winds inward forever.

     Hexed is the branch it has to be told apart from, and both are lattices
     in a violet. Hexed counter-rotates two *grids* and its whole character
     is the moire; this is one continuous arm, so what you read is a
     direction rather than an interference. The grip pulse is slow enough to
     be felt and not watched — a curse is not an event. */
  if (id < 19.5) {
    float turn   = a / (PI * 2.0);
    float spiral = band(fract(turn + r * 1.90 - t * .11), .5, .17);
    float second = band(fract(turn - r * 1.35 + t * .07), .5, .11);
    float glyph  = pow(max(0.0, sin(a * 9.0 + r * 5.0 - t * .22)), 12.0)
                 * smoothstep(1.02, .18, r);
    float grip   = smoothstep(1.04, .30, r) * (.55 + .45 * sin(t * .26));
    return vec2(clamp(spiral * .76 + second * .42 + glyph * .58, 0.0, 1.0),
                spiral * grip * .50 + glyph * .68);
  }

  /* Unstoppable — chevrons climbing, and the heat behind them. The stance
     is momentum with a ceiling on it, so the pattern travels one way and
     never wavers: no breath, no counter-rotation, nothing that could read as
     hesitating. Ablaze is the other warm branch and curls; this does not,
     because fire turns over itself and a thing being driven does not. */
  if (id < 20.5) {
    float up    = p.y * .92 + abs(p.x) * .38;
    float chev  = band(fract(up * 2.30 - t * .62), .5, .195);
    float grain = fbmD(p * 3.40 + vec2(0.0, -t * .45), d) * d;
    float rise  = smoothstep(-1.0, .85, p.y);
    float forge = smoothstep(.30, .95, grain * .50 + rise * .70);
    return vec2(clamp(chev * .80 + forge * .44, 0.0, 1.0),
                chev * rise * .72 + forge * .28);
  }

  /* Broken — one fracture, and the two sides still working against each
     other. That grind is the whole of the time in it: a Broken segment is
     part of a creature that has stopped, attached to one that has not, so
     something has to be moving or the mark is Vulnerable's shatter without
     the event. Dust sits in the seam and drifts, which is the other half of
     "this is load-bearing and it has gone". */
  if (id < 21.5) {
    float across = p.x * .32 + p.y * .95;
    float jag    = fbmD(vec2(p.x * 2.6, p.y * .6) + 5.0, d) * .30;
    float work   = .045 * sin(t * .48);
    float gap    = across + jag - work;
    float seam   = band(gap, 0.0, .075);
    float lip    = band(abs(gap), .075, .035);
    float dust   = smoothstep(.55, 0.0, abs(gap))
                 * fbmD(p * 6.0 + vec2(t * .10, -t * .30), d) * d;
    return vec2(clamp(seam * .92 + lip * .54 + dust * .38, 0.0, 1.0),
                lip * (.42 + .38 * sin(t * .48 + 1.6)) + seam * .18);
  }

  /* Destroyed — the same fracture, everywhere, and opening. One seam that
     works is a break; a field of them that widens is a thing that has come
     apart, and the widening is on a period slow enough that you notice it
     between rounds rather than watching it happen.

     Deliberately not the shattered branch a defeated token gets: that
     one throws shards off the creature and clips to its circle, because the
     creature is gone. A Destroyed segment is still standing there. */
  if (id < 22.5) {
    float open  = .045 + .020 * sin(t * .22);
    float seams = 1.0 - smoothstep(open, open + .10, voronoiEdge(p * 3.10 + 13.0));
    float fine  = (1.0 - smoothstep(.030, .130, voronoiEdge(p * 7.40 + 29.0))) * d;
    float fall  = band(fract(p.y * .90 + t * .26), .5, .22)
                * fbmD(p * 4.20 + vec2(0.0, -t * .55), d) * d;
    return vec2(clamp(seams * .90 + fine * .46 + fall * .32, 0.0, 1.0),
                seams * .22 + fall * .30);
  }

  /* The seventeenth, and the only one whose subject is unknown: a condition
     a GM typed the name of. Everything above draws a THING — fire, rot,
     rope, a lattice — and this one may not, because it has not been told
     what is happening. Inventing a subject would be worse than having
     none: a creature the GM has marked Waterlogged should not be wearing
     the texture of something else.

     What it does have to say is that the creature is marked at all, and it
     has to say it at 40px, where the sentence naming the thing is already
     gone and this is the whole of what is left. So: a ring of marks
     turning at the rim, which is where a small token has any pixels to
     spend, over a wash that breathes. Nothing else in the set turns
     steadily, so it does not read as any of them, and a mark is the one
     shape that means "noted" without meaning anything in particular.

     It is a sash across the body rather than a ring at the rim, and that is
     not a style choice. The rim already has a tenant: the chip's rotating
     sentence is a band of lettering at exactly that radius, and the named ones
     that live out there — the reticle, the standing waves — are named
     things the sentence is naming with them. A seventeenth ring competing
     with the words for the same pixels would read as a rendering fault. */
  float across = p.x * .78 + p.y * .62;
  float along = p.x * .62 - p.y * .78;
  float drift = .11 * sin(t * .42);
  float ribbon = band(across, drift, .26);
  float hem = band(abs(across - drift), .26, .040);
  /* Tally marks, going along it. A blank sash is a colour swatch; the marks
     are what make it a thing somebody wrote on, and they are the part that
     tells you it is the same condition you saw last round. */
  float tally = pow(max(0.0, sin(along * 8.5 + t * .60)), 10.0) * ribbon;
  float wash = (.24 + .32 * smoothstep(.30, .82, fbmD(p * 1.2 + vec2(t * .06, -t * .05), d)))
             * smoothstep(1.05, .14, r);
  float breath = .5 + .5 * sin(t * .90);
  float fade = smoothstep(1.02, .26, r);
  /* The hems carry most of the field and little of the heat. They were the
     other way round for a build and the sash arrived as two white tapes:
     hot is near-white by construction, so anything long and thin given a
     high one stops being the colour it was drawn in. */
  return vec2(clamp(wash * .42 + ribbon * fade * .72 + hem * fade * .92 + tally * fade * .60,
                    0.0, 1.0),
              hem * fade * (.20 + .30 * breath) + tally * fade * .58);
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
     away whether or not anything is lit over it.

     Down by two thirds from where it shipped, and the swing narrowed with
     it. At .055 plus a .036 pull the face was displaced by nearly a tenth
     of the creature and the whole of it moved on one slow breath, which
     stopped being a thing refracting and became a thing melting. What
     reads as invisible is a creature you can still identify, seen through
     something. Ungated by value still, for the reason above. */
  if(id<7.5)return (vec2(sin(p.y*6.5+t*1.10),cos(p.x*5.5-t*.85))*.019-radial*.012)
                   *(.62+.38*sin(t*.70));
  if(id<8.5)return -radial*value*.020;
  if(id<9.5)return radial*(fbm(p*4.0+t*.09)-.5)*.030;
  if(id<10.5)return radial*sin(r*16.0-t*3.2)*value*.024;
  if(id<11.5)return vec2(sin(a*6.0+t*5.0),cos(a*5.0-t*4.0))*value*.020;
  if(id<12.5)return vec2(0.0,value*.032);
  if(id<13.5)return -radial*value*.028;
  if(id<14.5)return radial*sin(r*20.0+t*2.0)*value*.017;
  if(id<15.5)return vec2(sin(p.y*9.0+t*2.6),value*-.8)*value*.020;
  /* Roped hauls the artwork toward the cord's own normal rather than toward
     the centre: a rope pulls in the direction it is pulled, and a radial
     drag would be a binding tightening, which is Restrained's. */
  if(id<16.5)return vec2(.55,.84)*sin(t*.70)*value*.020;
  /* Frostbitten stiffens rather than moves. The smallest displacement in
     the set on purpose — frost sets a surface, and a face that swims under
     ice is a face under water. */
  if(id<17.5)return radial*value*.006;
  /* Nauseated is the churn reaching the artwork, and it is the one warp
     that does not settle: the two components run at unrelated rates so the
     motion never returns to where it started. */
  if(id<18.5)return vec2(sin(p.y*3.1+t*.62),cos(p.x*2.7-t*.47))*value*.026;
  /* Cursed turns the artwork slowly about the creature's own centre, which
     is the spiral's motion arriving on the picture. Tangential, and it never
     reverses. */
  if(id<19.5)return vec2(-p.y,p.x)*value*.014;
  /* Unstoppable pushes upward, and only upward. Nothing lateral, because a
     wobble on this one would be exactly the wrong claim. */
  if(id<20.5)return vec2(0.0,.020)*value*(.6+.4*sin(t*1.3));
  /* Broken shears: the two sides of the seam offset against each other on
     the grind, so the displacement is a step across the fracture rather than
     a wave along it. */
  if(id<21.5)return vec2(.95,-.32)*sign(p.x*.32+p.y*.95)*sin(t*.48)*value*.016;
  /* Destroyed pushes every fragment away from the centre as the seams open,
     on the same slow period the pattern widens on. */
  if(id<22.5)return radial*(.55+.45*sin(t*.22))*value*.022;
  /* The unnamed one barely moves the artwork. It is a mark ON a creature
     rather than something happening TO one, and a displacement is the most
     literal claim in this shader about a subject it has not been told. */
  return radial*sin(t*.80)*value*.010;
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
  if(id<15.5)return mix(vec3(.62,.045,.008),vec3(1.0,.86,.27),clamp(value+p.y*.16,0.0,1.0));
  /* Hemp. A cord is one of the few subjects here that is genuinely matte, so
     this is the flattest ramp in the set on purpose — the fibre is in the
     pattern and putting a sheen on it as well would make it wet rope. */
  if(id<16.5)return mix(vec3(.20,.13,.06),vec3(.86,.70,.44),value*.78);
  /* Rime. Ice is the one material where the bright end has to go past the
     hue entirely: frost on a surface is white, and a ramp that stopped at
     pale blue would read as a wash rather than as something crystalline. */
  if(id<17.5)return mix(vec3(.055,.14,.20),vec3(.88,.97,1.0),pow(value,1.3));
  /* Bile. Kept dark at the low end and well short of Corroded's acid green at
     the high one: those two are the only greens in the set and the ramps are
     what separate them, since the hues cannot. */
  if(id<18.5)return mix(vec3(.055,.10,.045),vec3(.60,.76,.38),value*.72);
  /* Wine. The set is already crowded with violets, so this one goes red
     rather than purple as it lights — Cursed beside Hexed has to be a
     different *direction* of travel and not a different shade at rest. */
  if(id<19.5)return mix(vec3(.10,.015,.055),vec3(.86,.28,.54),value*.80);
  /* Hot bronze. Ablaze is the other warm ramp and reaches yellow-white; this
     stops at bronze, because a stance is metal being driven rather than
     something burning. */
  if(id<20.5)return mix(vec3(.16,.085,.02),vec3(1.0,.76,.34),value*.84);
  /* Dry stone, and the exponent is the point. Broken is a fracture in
     something that still holds together, so the brightness stays in the break
     and off the face — pow keeps the body dark at every value below the very
     top of the range. */
  if(id<21.5)return mix(vec3(.09,.085,.08),vec3(.62,.58,.52),pow(value,1.6));
  /* The same stone, one step down and one step darker, which is what the
     rules say Destroyed is. A second hue here would have made the pair two
     unrelated states a reader has to learn the order of. */
  if(id<22.5)return mix(vec3(.05,.048,.045),vec3(.40,.37,.34),pow(value,2.0));
  /* Parchment, and deliberately the only warm neutral in the set. Every
     other ramp names a substance; this one names a note somebody wrote. */
  return mix(vec3(.13,.11,.09),vec3(.96,.89,.76),value*.80);
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
  /* Two circles, and shipping only the first is what let the break grow out
     of the token into a square.

     circle is the edge of the ARTWORK, and it has to be measured on
     source, because a shard that has travelled carries its own edge with
     it and clipping its art on p would shave the piece rather than move it.
     But source is p pulled back INWARD by the escape push, so a fragment
     sitting a full push outside the creature reads as inside the art and
     draws — and since the only thing out there to stop it is the filter's
     own frame, what it drew was the frame: a disc inflated until it met
     four straight edges and four cut corners.

     cell is the creature's own circle, which is a fact about p and about
     nothing the shards do. It is the same threshold the living branch
     uses, so a corpse ends exactly where the creature it replaces did. */
  float circle = 1.0 - smoothstep(.93, .995, length(source));
  float cell = 1.0 - smoothstep(.94, 1.0, length(p));
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
  /* PREMULTIPLIED, and the clipping above is worth nothing without it.
     PIXI composites a filter's output with ONE / ONE_MINUS_SRC_ALPHA, which
     adds the colour at full strength whatever the alpha says — so a fragment
     that returns a lit shard face and an alpha of zero draws the lit shard
     face. That is what the square was: not a clipping failure at all, but
     every clipped fragment painting its colour anyway, out to the edges of
     the filter's own frame, in whatever the artwork was there. On a dark
     portrait it read as a slightly wrong edge; on a pale one it was a
     bright square around the corpse.

     Three passes of the design gate could not show it, because that page
     asked for premultipliedAlpha:false and drew with blending off, where an
     alpha of zero really does mean nothing appears. It composites the way
     PIXI does now. */
  float alpha = art.a * solid * circle * cell;
  return vec4(clamp(cold, 0.0, 1.0) * alpha, alpha);
}

void main() {
  vec2 uv=tokenUv(vTextureCoord);
  /* ── the material sits on the creature, not on the quad ────────────
     One division, and it is the whole of respecting token scale.

     Every pattern in this file, the rim, the edge roll-off and the break's
     shard cuts are written in p, where length(p) == 1 is "the edge". That
     was the mesh's own edge, which is the creature only when the mesh
     holds nothing else. It very often does: a dynamic ring's texture is
     half again the cell in subject fit, so a ringed creature had its
     material drawn a comfortable margin outside itself, over the ring and
     onto the map. A sprite scaled down inside its square is the same
     failure with a different cause.

     uv is NOT divided, and that is the half that matters. uv is where the
     artwork is sampled from; moving it would drag the creature's own
     picture around under the material. The material scales onto the
     creature and the creature stays where it is. */
  vec2 p=(uv*2.0-1.0)/max(uSubject,.05);

  /* Detail is bought with pixels. outputFrame.z is the token's width on
     screen, so a creature filling the viewport gets its second register of
     structure and one at 40px never renders the frequencies that would
     crawl. Nothing else in this shader is allowed to know about the
     camera — see tokenUv — and this is the deliberate exception, because
     the question "how much detail can be resolved" is a question about
     pixels by definition. */
  /* Scaled by uSubject for the same reason the question is asked at all:
       this is "how many pixels has the thing being dressed got", and the
       thing being dressed is the creature rather than the quad around it.
       A ringed token at 60px was claiming half again the detail it could
       resolve, which is the frequency that crawls. */
  /* One read of the camera, two things derived from it, and the rule it was
     guarding is unchanged: nothing else in this shader is allowed to know
     where the viewport is. It used to produce only the detail budget, which
     answers "how much structure can be resolved" and throws away the more
     useful half of the same measurement -- how big a pixel is. A budget can
     only fade an under-resolved feature out; a pixel size lets an edge be
     drawn at the width the screen can actually show. */
  float frame = outputFrame.z * uSubject;
  float detail = smoothstep(44.0, 104.0, frame);
  /* p spans -1..1 across the creature, so a pixel is two over the frame. The
     floor is a creature too small for any of this to mean anything, and it
     exists so the division cannot produce an edge wider than the token. */
  gPixel = 2.0 / max(frame, 12.0);

  if(uDead>.5){gl_FragColor=shattered(uv,p,uTime,detail);return;}

  vec4 original=sampleArt(uv);
  float circle=1.0-smoothstep(.94,1.0,length(p));
  float count=max(uCount,1.0);

  /* ── each condition keeps its own colour where it is the one present ──
     The loop below already knows, per pixel, how much of each condition is
     there. That number used to be spent only on coverage: the colour was the
     plain mean of the active hues, applied at full strength over the whole
     creature, so a token that was Vulnerable and Charged was one purple wash
     everywhere, including the pixels where only the fracture existed and no
     bolt did. Two hues opposite each other averaged to something naming
     neither, which the chroma restore below was added to rescue, and
     rescuing a mean is not the same as not taking one.

     So the colour is weighted by presence instead. A pixel inside only the
     fracture is the fracture's purple; a pixel inside only the bolt is the
     bolt's blue; the two mix where they actually overlap, and nowhere else.
     That is the whole change. The composite underneath it is untouched, and
     deliberately: the material still reads as fused into the artwork rather
     than laid over it, which is the best thing about it.

     The weight is value^2.5 rather than value. At the first power the
     gradients between two conditions are wide enough that most of the token
     is still a mixture, which is the wash again with extra steps. The
     exponent narrows the hand-over so each condition holds its territory and
     the seam becomes a feature you can see rather than the default state. */
  vec3 colorSum=vec3(0.0); vec3 accentSum=vec3(0.0); vec2 warp=vec2(0.0);
  vec3 colorMean=vec3(0.0); vec3 accentMean=vec3(0.0);
  float weightSum=0.0; float topWeight=0.0;
  vec3 rimSum=vec3(0.0); float rimWeight=0.0;
  float survival=1.0; float peak=0.0; float hot=0.0; float darkness=0.0;

  /* The rim is partitioned by angle, and the reason is size. At 40px a token
     is a disc with a colour on it: the interior patterns are below what the
     screen can resolve and the ring of material around the edge is the only
     part of any of this that still reads. Weighting that ring by presence
     does not help, because the ring is a geometric band and the patterns are
     not reliably in it — the honest answer there is the mean, which is the
     mud, in the one place that matters most. So each active condition owns an
     arc instead. Five conditions are five arcs of five colours; one is one
     arc all the way round, which is what ships today. */
  float arc=atan(p.y,p.x)/(2.0*PI)+.5;
  float seg=arc*count;

  for(int i=0;i<5;i++){
    if(float(i)>=uCount)break;
    /* Per-slot so two instances of a pattern do not lockstep, and per-token
       so two creatures with the same condition do not either. uSeed is a
       hash of the token id: a line of goblins pulsing in time is the most
       obvious tell in here, and it was free to fix. */
    float id=idAt(i); float localTime=uTime+float(i)*1.73+uSeed;
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
       every branch because it is one claim about all of them. */
    float value=clamp(field.x*1.16-.055,0.0,1.0);
    value=value*value*(3.0-2.0*value);

    /* Onset. A condition used to arrive by existing: one frame without, the
       next frame with it at full strength, which reads as the sprite changing
       rather than as something happening to the creature. uAge is seconds
       since this condition was applied, so the material grows in over a third
       of a second. There is no matching fade on removal on purpose; see the
       note on uAge in the uniform block. */
    float arrival=smoothstep(0.0,.35,ageAt(i));
    value*=arrival;

    float weight=pow(value,2.5);
    colorSum+=colorAt(i)*weight; colorMean+=colorAt(i);
    vec3 slotAccent=conditionAccent(id,colorAt(i),p,localTime,value);
    accentSum+=slotAccent*weight; accentMean+=slotAccent;
    weightSum+=weight; topWeight=max(topWeight,weight);

    /* This slot's arc of the rim, with a soft hand-over either side. The two
       ends of the ring meet inside one window and average there, which is
       what keeps the seam from being a cut. */
    float own=smoothstep(float(i)-.12,float(i)+.12,seg)
             *(1.0-smoothstep(float(i)+.88,float(i)+1.12,seg));
    rimSum+=colorAt(i)*own; rimWeight+=own;

    /* Displacements compound rather than average: two distortions of one
       surface genuinely add, and dividing by the count was quietly taking
       Invisible's refraction down to a third of itself the moment anything
       else was on the creature. Clamped as a vector further down, because
       what compounding needs is a ceiling, not a divisor. */
    warp+=conditionWarp(id,p,localTime,value); survival*=1.0-value*.72;
    peak=max(peak,value); hot=max(hot,clamp(field.y,0.0,1.0)*arrival);
    if((id>.5&&id<1.5)||(id>11.5&&id<13.5))darkness+=value;
  }

  /* Where no condition is present the weights are all zero and there is no
     ownership to read, so the colour falls back to the mean it always was.
     Nothing is drawn there; this only has to be defined. */
  vec3 material=weightSum>1e-4?colorSum/weightSum:colorMean/count;

  /* How much of the presence at this pixel is NOT the dominant condition.
     Zero for one condition anywhere, and zero inside a single condition's
     own territory however many others are active. Doubled so an even
     two-way collision counts as a full seam. */
  float seam=weightSum>1e-4?clamp((1.0-topWeight/weightSum)*2.0,0.0,1.0):0.0;

  /* The chroma restore, now applied only where two hues actually meet. It
     exists because opposite hues average to a grey that names neither, which
     is a statement about the seam and was being applied to the whole token:
     every multi-condition creature had its colours pushed to full saturation
     everywhere, including the large areas where exactly one condition was
     present and nothing needed rescuing. */
  if(uCount>1.0&&seam>.001){
    float low=min(material.r,min(material.g,material.b)); vec3 chroma=material-vec3(low);
    float high=max(chroma.r,max(chroma.g,chroma.b)); if(high>.001)chroma/=high;
    material=clamp(mix(material,chroma,.68*seam),0.0,1.0);
  }
  float field=clamp(1.0-survival,0.0,1.0);

  /* The ceiling is just above the largest single displacement in the set,
     which is Invisible's. A stack can therefore push the artwork further than
     any one condition does, which is the point, but not so far that the
     creature stops being identifiable: past that it is not refracting, it is
     melting. One condition never reaches the cap, so a single condition's
     warp is exactly what it was. */
  float warpLength=length(warp);
  if(warpLength>.048)warp*=.048/warpLength;
  vec4 warped=sampleArt(uv+warp);

  /* The accent ramps are what give each condition its own dark-to-bright
     shading, and with two or more conditions every one of them used to be
     discarded for the averaged base colour. That is most of why a token
     wearing two conditions read flatter than the same token wearing one. They
     are weighted by presence like the colour, and only pulled toward the
     mixed material inside the seam, where there genuinely is no single
     condition's shading to show. */
  vec3 accent=weightSum>1e-4?accentSum/weightSum:accentMean/count;
  accent=mix(accent,material,.55*seam);

  /* The ring, by arc. Falls back to the body colour before the first slot's
     window opens, which cannot happen while uCount is at least one. */
  vec3 rim=rimWeight>1e-4?rimSum/rimWeight:material;
  float luminance=dot(warped.rgb,vec3(.2126,.7152,.0722));
  vec3 colorized=accent*(.16+luminance*1.24);
  float tint=clamp(.20+field*.56+min(uCount-1.0,2.0)*.020,.20,.70);
  vec3 color=mix(warped.rgb,colorized,tint);
  /* Not divided by the count any more. Darkness is the dark conditions' own
     coverage at this pixel and it is already spatial, so dividing it was
     making Hidden stop darkening the creature because something bright had
     been added elsewhere on it. */
  color*=1.0-clamp(darkness,0.0,1.0)*.38;

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
  /* The emissive terms are divided down as conditions accumulate, and the
     reason is the thing this pass is for. peak and hot are maxima over
     the active set, so five conditions put a high value almost everywhere on
     the creature simply by covering it, and the glow built from them clipped
     the rim to pure white in three of sixteen samples — losing the colour in
     the exact place the arcs were added to preserve it. A creature with five
     conditions on it is one creature with five things on it, not five times
     the light. Exactly 1.0 at one condition, so a single condition is
     untouched. */
  float crowd = 1.0 + (count - 1.0) * .18;
  vec3 glow = emissive*pow(peak,3.4)*(.42/crowd)
            + rim*edge*.30
            + vec3(.72,.83,1.0)*glass*.1
            + mix(accent,vec3(1.0),.72)*pow(hot,1.6)*(.80/crowd);
  color += glow / (1.0 + glow * .68);

  /* The grain is a hundred and eighteen cycles across the token, animated,
     and it was the one term in here that ran at full strength in every state
     at every size. At 40px that is per-frame white noise on a disc forty
     pixels wide: the only term in this shader guaranteed to crawl on every
     token on the board, including tokens with nothing wrong with them. It is
     film grain, which is a statement about a close-up, so it is bought with
     pixels like every other fine register. */
  color+=(noise2(uv*118.0+uTime*.03)-.5)*.035*(field+.18)*(.18+.82*detail);
  color=clamp((color-.5)*1.14+.5,0.0,1.0);
  /* The material is premultiplied by the artwork's own alpha for the reason
     the break is: PIXI adds a filter's colour at full strength whatever the
     alpha channel says, so a glow written over a transparent part of a
     token's texture is a glow drawn on the map. The artwork term is left
     alone because it arrives premultiplied already, and where the art is
     opaque this is multiplying by one and changes nothing at all. */
  gl_FragColor=vec4(mix(original.rgb,color*original.a,circle),original.a);
}`;

function getFilterClass(): any {
  if (FilterClass) return FilterClass;
  const Base = (globalThis as any).foundry?.canvas?.rendering?.filters?.AbstractBaseFilter;
  if (!Base) return null;
  FilterClass = class DaggerheartConditionFilter extends Base {
    static defaultUniforms = {
      uTime: 1.75, uCount: 0, uDead: 0, uSubject: 1, uSeed: 0,
      uId0: 0, uId1: 0, uId2: 0, uId3: 0, uId4: 0,
      uColor0: [0,0,0], uColor1: [0,0,0], uColor2: [0,0,0],
      uColor3: [0,0,0], uColor4: [0,0,0],
      /* Arrived, not arriving. A slot whose age has never been written is a
         slot nothing is in, and defaulting those to zero would make every
         unused slot permanently mid-onset — harmless while uCount excludes
         them, and a flash the first frame if it ever does not. */
      uAge0: ARRIVED, uAge1: ARRIVED, uAge2: ARRIVED, uAge3: ARRIVED, uAge4: ARRIVED,
    };
    static _createFragmentShader(): string { return TOKEN_CONDITION_FRAGMENT; }
  };
  return FilterClass;
}

function detach(token: any): void {
  const mesh = token?.mesh;
  const filter = filters.get(token);
  if (mesh && filter) mesh.filters = (mesh.filters ?? []).filter((candidate: any) => candidate !== filter);
  filter?.destroy?.();
  filters.delete(token);
}

export function clearTokenConditionMaterial(token: any): void { detach(token); }

/**
 * @param subject where the creature ends as a fraction of the filter frame;
 *   1 is a plain token, and the caller measures it because the answer is a
 *   fact about Foundry's mesh rather than about conditions.
 */
export function syncTokenConditionMaterial(
  token: any,
  ids: readonly string[],
  dead = false,
  subject = 1,
): void {
  const mesh = token?.mesh;
  if (!mesh || (!dead && ids.length === 0)) { detach(token); return; }
  const Klass = getFilterClass();
  if (!Klass) return;

  let filter = filters.get(token);
  if (!filter) {
    /* `sync` is called straight out of `drawToken`. A shader that fails to
       compile, or an `AbstractBaseFilter` that moves in a later Foundry,
       would throw from here into the hook and take the token's draw — and
       the canvas behind it — down with it. A condition material is worth
       less than a canvas, so it fails alone and says so once. */
    try {
      filter = Klass.create();
    } catch (error) {
      if (!warned) {
        warned = true;
        console.error("Daggerheart | condition material unavailable; tokens render unfiltered", error);
      }
      return;
    }
    filter[MARK] = true;
    filter.padding = 0;
    /* autoFit shrinks outputFrame to the visible intersection, which would
       move token space the moment a creature touches the viewport edge. The
       frame has to stay the object's own bounds for `tokenUv` to be stable. */
    filter.autoFit = false;
    filter.uniforms.uSeed = tokenSeed(token);
    filter[AGES] = new Map<string, number>();
    filter[SLOTS] = [] as string[];
    filters.set(token, filter);
  }

  const materials = conditionMaterialsFor(ids);

  /* When each of these started being drawn. `sync` runs on every refresh of
     every token, so "first seen" has to be remembered rather than recomputed:
     a condition that has been on a creature for a minute must not restart its
     onset because somebody panned the canvas. Keyed by the material id, which
     is what a slot actually holds — all the ad-hoc conditions share one. */
  const now = clock();
  const ages: Map<string, number> = filter[AGES] ?? (filter[AGES] = new Map());
  const live = new Set(materials.map((material) => material.id));
  for (const key of [...ages.keys()]) if (!live.has(key)) ages.delete(key);
  for (const material of materials) if (!ages.has(material.id)) ages.set(material.id, now);
  filter[SLOTS] = materials.map((material) => material.id);
  /* Clamped rather than trusted. Above 1 the material would be asked to
     cover more than the frame holds, which it cannot — there is nothing
     out there to sample — and a bad read collapsing it to a dot is the
     one failure that would look deliberate. */
  filter.uniforms.uSubject = Math.min(1, Math.max(0.2, Number(subject) || 1));
  filter.uniforms.uCount = dead ? 0 : materials.length;
  filter.uniforms.uDead = dead ? 1 : 0;
  materials.forEach((material, i) => {
    filter.uniforms[`uId${i}`] = material.index;
    filter.uniforms[`uColor${i}`] = [...material.color];
  });
  writeAges(filter, now);

  const others = (mesh.filters ?? []).filter((candidate: any) => candidate !== filter && !candidate?.[MARK]);
  mesh.filters = [...others, filter];
}

/* Asked once. `matchMedia` allocates a MediaQueryList per call and `tick`
   runs on every canvas frame, so the query is built here and only read
   there; a MediaQueryList keeps itself current without being rebuilt. */
const REDUCED = typeof matchMedia === "function"
  ? matchMedia("(prefers-reduced-motion: reduce)")
  : null;

/* uTime is a float32 uniform. `performance.now()` climbs without bound, and
   past roughly twelve hours the mantissa can no longer resolve a 16ms frame
   step at that magnitude — every pattern here is a sin/fbm of t, so the
   animation quantises into judder on a session somebody left open overnight.
   Wrapping keeps the argument small. The seam is a phase reseat once an hour,
   which is a moment against a night of stutter. */
const CLOCK_WRAP = 3600;

/** The one clock. Wrapped, for the reason above. */
const clock = (): number => (performance.now() / 1000) % CLOCK_WRAP;

/**
 * Seconds since each slot's condition arrived, as the shader's uniforms.
 *
 * Written from `tick` as well as from `sync`, because an onset has to advance
 * on its own: `sync` runs when something about the token changes and a
 * condition appearing is exactly the moment nothing else is going to.
 *
 * The clock wraps once an hour and a start time recorded before a wrap is
 * larger than the time after it, which would read as a negative age and send
 * a settled condition back through its own onset. Adding the period back is
 * the same correction the wrap itself is: a condition that straddles it is
 * reported as nearly an hour old, which is true enough for a smoothstep that
 * saturates in a third of a second.
 */
function writeAges(filter: any, time: number): void {
  const ages: Map<string, number> | undefined = filter[AGES];
  const slots: string[] = filter[SLOTS] ?? [];
  for (let i = 0; i < CONDITION_SLOTS; i++) {
    const key = slots[i];
    const started = key === undefined ? undefined : ages?.get(key);
    if (started === undefined) { filter.uniforms[`uAge${i}`] = ARRIVED; continue; }
    const age = time - started;
    filter.uniforms[`uAge${i}`] = age < 0 ? age + CLOCK_WRAP : age;
  }
}

function tick(): void {
  if (REDUCED?.matches) {
    /* Reduced motion stops the clock, so an onset driven off it would stop
       halfway and leave the material at a fraction of itself forever. Every
       condition is simply there, which is what this setting asks for. */
    for (const filter of filters.values())
      for (let i = 0; i < CONDITION_SLOTS; i++) filter.uniforms[`uAge${i}`] = ARRIVED;
    return;
  }
  const time = clock();
  /* The break used to be held at a fixed time because it was a still image
     and advancing it would only have burned a uniform write. It is not still
     any more: the shards separate on a settle, dust falls through the gaps and
     a glint crosses the faces on a twenty-second loop, all of them far slower
     than any living condition so a corpse reads as stillness that happens to
     be lit rather than as an effect running. */
  for (const filter of filters.values()) {
    filter.uniforms.uTime = time;
    writeAges(filter, time);
  }
}

export function registerTokenConditionMaterials(): void {
  if (registered) return;
  registered = true;
  Hooks.on("canvasReady", () => (canvas as any)?.app?.ticker?.add?.(tick));
  Hooks.on("canvasTearDown", () => {
    (canvas as any)?.app?.ticker?.remove?.(tick);
    for (const token of [...filters.keys()]) detach(token);
  });
  if ((canvas as any)?.ready) (canvas as any)?.app?.ticker?.add?.(tick);
}
