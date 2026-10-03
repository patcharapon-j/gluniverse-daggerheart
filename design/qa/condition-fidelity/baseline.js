/**
 * The condition material as it ships, frozen.
 *
 * GENERATED — do not edit. Regenerate with:
 *   node --experimental-strip-types tools/snapshot-condition-baseline.mjs
 *
 * The gate needs something to compare against, and the only thing worth
 * comparing against is what is on the table right now. The live shader beside
 * it is imported from src rather than copied, because two copies of four
 * hundred lines of GLSL are two shaders that disagree the first time somebody
 * tunes one branch — and this copy is allowed to exist only because it is
 * machine-written from a clean tree and never touched by hand.
 *
 * Snapshot taken at 9836129 (Release v1.15.2).
 */

export const CONDITION_MATERIAL_BASELINE_REF = "9836129";

export const CONDITION_MATERIAL_BASELINE = `precision highp float;
varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform float uTime;
uniform float uCount;
uniform float uDead;

uniform float uSubject;
uniform vec4 inputSize;
uniform vec4 outputFrame;
uniform vec4 inputClamp;
uniform float uId0; uniform float uId1; uniform float uId2; uniform float uId3; uniform float uId4;
uniform vec3 uColor0; uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uColor3; uniform vec3 uColor4;

#define PI 3.141592653589793

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

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

vec2 conditionPattern(float id, vec2 p, float t, float d) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float n = fbmD(p * 2.2 + vec2(t * .14, -t * .10), d);

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

  if (id < 1.5) {
    float base = fbmD(p * 1.15 + vec2(t * .105, -t * .075), d);
    float mid  = fbmD(p * 2.60 - vec2(t * .200,  t * .130) + 11.0, d);
    float fine = fbmD(p * 5.60 + vec2(-t * .330, t * .190) + 27.0, d) * d;
    float tide = smoothstep(.95 + .34 * sin(t * .42), -.62, p.y);
    return vec2(clamp(smoothstep(.44, .70, base * .62 + mid * .30 + fine * .22 + tide * .44),
                      0.0, 1.0), 0.0);
  }

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

  if (id < 3.5) {
    float beat = fract(floor(t * 1.7) * .618);
    vec3 v = voronoi3(p * 1.45 + vec2(sin(t * .11), cos(t * .09)) * .16);
    float panels = floor(fract(v.z * 7.13 + beat * 3.0) * 3.0) * .5;
    float seam = 1.0 - smoothstep(.030, .105, v.y);
    float grain = smoothstep(.42, .08, voronoiCell(p * 4.8)) * d;
    return vec2(clamp(panels * .62 + seam * .18 + grain * .18, 0.0, 1.0),
                seam * (.10 + .30 * beat));
  }

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

  if (id < 5.5) {
    float drift = p.y + n * .18 - t * .42;
    float scan = pow(.5 + .5 * sin(drift * 30.0), 7.0);
    float fine = pow(.5 + .5 * sin(drift * 88.0), 7.0) * d;
    float fog = smoothstep(.44, .76, fbmD(p * 1.9 + vec2(t * .13, 0.0), d));
    float sweep = band(fract(drift * .38), .5, .045);
    return vec2(clamp(scan * .56 + fine * .26 + fog * .44 + sweep * .62, 0.0, 1.0),
                sweep * (.35 + .65 * fog) * 1.1 + scan * sweep * .70);
  }

  if (id < 6.5) {
    float l1 = pow(max(0.0, cos(a * 5.0 + r * 11.0 - t * .95)), 7.0);
    float l2 = pow(max(0.0, cos(a * 8.0 - r *  8.0 + t * .68)), 8.0);
    float rings = band(fract(r * 2.2 - t * .22), .5, .085) * .55;
    return vec2(clamp(l1 * .72 + l2 * .62 + rings, 0.0, 1.0), l1 * l2 * 3.0);
  }

  if (id < 7.5) {
    float shell = band(r, .94, .022);
    float ripple = pow(.5 + .5 * sin((r * 5.0 - t * 1.35) * PI), 6.0) * smoothstep(1.0, .35, r);
    float wipe = band(fract(p.y * .42 - t * .26), .5, .060);
    float veil = .26 + smoothstep(.34, .70, fbmD(p * 1.6 + vec2(-t * .14, t * .10), d)) * .30;
    return vec2(clamp(veil + shell * .70 + wipe * .30 + ripple * .24, 0.0, 1.0),
                shell * .55 + wipe * ripple * 1.6);
  }

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

  if (id < 9.5) {
    float eat = .50 - .12 * sin(t * .30);
    float patch = smoothstep(eat, eat + .13, fbmD(p * 1.5 + vec2(t * .085, -t * .050), d));
    float e = voronoiEdge(p * 3.2);
    float pits = smoothstep(.46, .07, voronoiCell(p * 3.2));
    float rim = 1.0 - smoothstep(.03, .15, e);
    float lip = 1.0 - smoothstep(.008, .055, e);
    float fine = smoothstep(.26, .05, voronoiCell(p * 7.4)) * (.40 + .60 * d);
    float bloom = band(fract(length(p - vec2(.20, .30)) * .80 - t * .16), .5, .16);

    return vec2(clamp(patch * (rim * .82 + lip * .34 + fine * .34 + pits * .26), 0.0, 1.0),
                patch * lip * (.34 + .62 * bloom));
  }

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

  if (id < 11.5) {
    vec2 q = p - vec2(.34, -.52);
    float qa = atan(q.y, q.x), rr = length(q);
    float branch = fbmD(vec2(qa * 1.3, rr * 2.6 - t * 1.6), d);
    float curve = sin(qa * 2.1 + branch * 5.0);
    float reach = smoothstep(2.1, .04, rr);

    float channel = pow(1.0 - abs(curve), 2.6) * reach;
    float fil = pow(1.0 - abs(curve), 11.0) * reach;

    float fq = sin(qa * 5.3 - branch * 3.4 + 1.7);
    float fork = pow(1.0 - abs(fq), 6.0) * smoothstep(1.5, .16, rr)
               * smoothstep(.18, .58, branch);

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

  if (id < 13.5) {
    float breath = .5 + .5 * sin(t * .95);
    float reach = .40 + .26 * breath;
    float tend = fbmD(vec2(a * 1.8, r * 2.0 - t * .38), d);
    float mask = smoothstep(reach, 1.10, r + (tend - .5) * .80);
    float hairs = pow(.5 + .5 * cos(a * 14.0 + tend * 7.0 - t * .55), 7.0) * mask;
    return vec2(clamp(mask * .96 + hairs * .44, 0.0, 1.0),
                band(mask, .20, .13) * (.50 + .35 * breath));
  }

  if (id < 14.5) {
    float k = 4.4 + .55 * sin(t * .38);
    float w1 = pow(.5 + .5 * cos((r * k + t * .55) * PI * 2.0), 8.0);
    float w2 = pow(.5 + .5 * cos((r * k - t * .55) * PI * 2.0), 8.0);
    float fine = pow(.5 + .5 * cos(r * 11.0 * PI * 2.0), 12.0) * d;
    float fall = smoothstep(1.08, .04, r);
    return vec2(clamp((w1 + w2) * .5 * fall * 1.05 + fine * fall * .35, 0.0, 1.0),
                w1 * w2 * fall * 2.6);
  }

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

  if (id < 17.5) {
    float facet   = 1.0 - smoothstep(.030, .155, voronoiEdge(p * 5.2 + 3.0));
    float needles = pow(max(0.0, cos(a * 13.0 + fbmD(p * 3.0, d) * 3.0)), 6.0)
                  * smoothstep(.28, 1.05, r);
    float creep   = smoothstep(.34 + .17 * sin(t * .30), 1.06, r);
    float glint   = band(fract(a / (PI * 2.0) - t * .07), .5, .055);
    return vec2(clamp((facet * .55 + needles * .68) * creep, 0.0, 1.0),
                facet * creep * (.28 + .55 * glint));
  }

  if (id < 18.5) {
    vec2 swirl  = vec2(gnoise(p * .90 + t * .17), gnoise(p * .90 + 19.0 - t * .13)) * .80;
    float churn = fbmD(p * 1.70 + swirl + vec2(0.0, sin(t * .33) * .32), d);
    float roll  = band(fract(churn * 1.6 - t * .21), .5, .19);
    float gut   = smoothstep(.86, .08, r) * (.30 + .30 * sin(t * .55));
    return vec2(clamp(smoothstep(.34, .74, churn) * .80 + roll * .38 + gut * .24, 0.0, 1.0),
                roll * .46);
  }

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

  if (id < 20.5) {
    float up    = p.y * .92 + abs(p.x) * .38;
    float chev  = band(fract(up * 2.30 - t * .62), .5, .195);
    float grain = fbmD(p * 3.40 + vec2(0.0, -t * .45), d) * d;
    float rise  = smoothstep(-1.0, .85, p.y);
    float forge = smoothstep(.30, .95, grain * .50 + rise * .70);
    return vec2(clamp(chev * .80 + forge * .44, 0.0, 1.0),
                chev * rise * .72 + forge * .28);
  }

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

  if (id < 22.5) {
    float open  = .045 + .020 * sin(t * .22);
    float seams = 1.0 - smoothstep(open, open + .10, voronoiEdge(p * 3.10 + 13.0));
    float fine  = (1.0 - smoothstep(.030, .130, voronoiEdge(p * 7.40 + 29.0))) * d;
    float fall  = band(fract(p.y * .90 + t * .26), .5, .22)
                * fbmD(p * 4.20 + vec2(0.0, -t * .55), d) * d;
    return vec2(clamp(seams * .90 + fine * .46 + fall * .32, 0.0, 1.0),
                seams * .22 + fall * .30);
  }

  float across = p.x * .78 + p.y * .62;
  float along = p.x * .62 - p.y * .78;
  float drift = .11 * sin(t * .42);
  float ribbon = band(across, drift, .26);
  float hem = band(abs(across - drift), .26, .040);

  float tally = pow(max(0.0, sin(along * 8.5 + t * .60)), 10.0) * ribbon;
  float wash = (.24 + .32 * smoothstep(.30, .82, fbmD(p * 1.2 + vec2(t * .06, -t * .05), d)))
             * smoothstep(1.05, .14, r);
  float breath = .5 + .5 * sin(t * .90);
  float fade = smoothstep(1.02, .26, r);

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

  if(id<16.5)return vec2(.55,.84)*sin(t*.70)*value*.020;

  if(id<17.5)return radial*value*.006;

  if(id<18.5)return vec2(sin(p.y*3.1+t*.62),cos(p.x*2.7-t*.47))*value*.026;

  if(id<19.5)return vec2(-p.y,p.x)*value*.014;

  if(id<20.5)return vec2(0.0,.020)*value*(.6+.4*sin(t*1.3));

  if(id<21.5)return vec2(.95,-.32)*sign(p.x*.32+p.y*.95)*sin(t*.48)*value*.016;

  if(id<22.5)return radial*(.55+.45*sin(t*.22))*value*.022;

  return radial*sin(t*.80)*value*.010;
}

vec3 conditionAccent(float id, vec3 base, vec2 p, float t, float value) {
  float r=length(p); float a=atan(p.y,p.x);
  if(id<.5)return mix(base,vec3(.92,.82,1.0),value*.7);
  if(id<1.5)return mix(vec3(.025,.045,.065),base,.42+value*.25);

  if(id<2.5)return mix(vec3(.075,.085,.11),vec3(.44,.50,.60),pow(value,2.0));
  if(id<3.5)return mix(base*.26,base*1.35,value);
  if(id<4.5)return mix(vec3(.34,.015,.035),vec3(1.0,.52,.58),value*.76);
  if(id<5.5)return mix(base,vec3(.76,1.0,.96),value*.7);
  if(id<6.5)return mix(vec3(.22,.015,.32),vec3(.94,.51,1.0),value*.82);

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

  if(id<16.5)return mix(vec3(.20,.13,.06),vec3(.86,.70,.44),value*.78);

  if(id<17.5)return mix(vec3(.055,.14,.20),vec3(.88,.97,1.0),pow(value,1.3));

  if(id<18.5)return mix(vec3(.055,.10,.045),vec3(.60,.76,.38),value*.72);

  if(id<19.5)return mix(vec3(.10,.015,.055),vec3(.86,.28,.54),value*.80);

  if(id<20.5)return mix(vec3(.16,.085,.02),vec3(1.0,.76,.34),value*.84);

  if(id<21.5)return mix(vec3(.09,.085,.08),vec3(.62,.58,.52),pow(value,1.6));

  if(id<22.5)return mix(vec3(.05,.048,.045),vec3(.40,.37,.34),pow(value,2.0));

  return mix(vec3(.13,.11,.09),vec3(.96,.89,.76),value*.80);
}

vec2 turn(vec2 p,float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*p;}

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

  float alpha = art.a * solid * circle * cell;
  return vec4(clamp(cold, 0.0, 1.0) * alpha, alpha);
}

void main() {
  vec2 uv=tokenUv(vTextureCoord);

  vec2 p=(uv*2.0-1.0)/max(uSubject,.05);

  float detail = smoothstep(44.0, 104.0, outputFrame.z * uSubject);

  if(uDead>.5){gl_FragColor=shattered(uv,p,uTime,detail);return;}

  vec4 original=sampleArt(uv);
  float circle=1.0-smoothstep(.94,1.0,length(p));
  vec3 colorSum=vec3(0.0); vec3 accentSum=vec3(0.0); vec2 warp=vec2(0.0);
  float survival=1.0; float peak=0.0; float hot=0.0; float darkness=0.0;
  for(int i=0;i<5;i++){
    if(float(i)>=uCount)break;
    float id=idAt(i); float localTime=uTime+float(i)*1.73;
    vec2 field=conditionPattern(id,p,localTime,detail);

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

  float edge=smoothstep(.48,.98,length(p));
  float glass=pow(max(0.0,1.0-distance(uv,vec2(.36,.27))*1.9),6.0);
  vec3 emissive=mix(accent,vec3(1.0),.52);

  vec3 glow = emissive*pow(peak,3.4)*.42
            + material*edge*.30
            + vec3(.72,.83,1.0)*glass*.1
            + mix(accent,vec3(1.0),.72)*pow(hot,1.6)*.80;
  color += glow / (1.0 + glow * .68);

  color+=(noise2(uv*118.0+uTime*.03)-.5)*.035*(field+.18);
  color=clamp((color-.5)*1.14+.5,0.0,1.0);

  gl_FragColor=vec4(mix(original.rgb,color*original.a,circle),original.a);
}`;
