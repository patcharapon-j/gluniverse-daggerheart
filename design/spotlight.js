/* The spotlight — who is acting right now, said to the whole table.

   Daggerheart has no initiative. The spotlight moves on a GM move or a failed
   roll, and at a real table that hand-off is a thing everybody feels and
   nobody can see. This is the seeing: one press, Player or GM, and the top
   of the screen says so — loudly once, then quietly for as long as it holds.

   It speaks the system's only two colours for "whose turn": Hope's gold for
   the party and Fear's violet for the GM. Not a new blue and red, because a
   hue here already means something and these two already mean exactly this.

   Two halves, and they are two different promises:

   - **The announcement** (about 1.5s) is the satisfying half. The glow drops
     to a quarter of the screen, the headline resolves inside it, and then it
     all draws back up into the band.
   - **The band** (40px, for as long as the spotlight holds) is the readout. A
     perfectly still band reads as a border, so both breathe — Hope as a slow
     shimmer, Fear as a restless creep — and differ in kind, not just hue.

   The light is a WebGL2 shader rather than CSS, on purpose: god-rays, domain-
   warped ink, a chromatic tear and a burning front between the two sides are
   not things gradients can do. The *type* is HTML, so it stays crisp at any
   render scale and is read out by assistive technology.

   Nothing here is pressable. The canvas covers the board, and the board owns
   click, drag and box-select. */

export const WORDS = {hope: 'Player Spotlight', fear: 'GM Spotlight'};

export const SPOTLIGHT = () => `
<div class="dh spl" data-side="off">
  <canvas class="sl-cv"></canvas>
  <div class="sl-head" aria-hidden="true"><b></b></div>
  <div class="sl-tag" role="status" aria-live="polite"><i></i><span></span></div>
</div>`;

/* Timing, in ms. The CSS headline keyframes are written against the same
   numbers — change one, change both. */
export const T = {
  rise: 650,      // glow falls to its peak
  hold: 1500,     // when it starts drawing back up
  settle: 800,    // how long drawing back up takes
  handoff: 950,   // an outgoing side fading under the incoming one
  retract: 340,   // Off: the band pulls up and out
  tag: 1650,      // the band's label arrives
};

const SETTLED = 40;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const outExpo = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const inOut = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const inCubic = x => x * x * x;
const bump = (e, a, b) => e <= a || e >= b ? 0 : Math.sin(Math.PI * (e - a) / (b - a));

/* ---- shared noise, so the overlay and the map shimmer agree ------------- */

export const NOISE_GLSL = `
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec2 h22(vec2 p){float n=h21(p);return vec2(n,h21(p+n));}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}
`;

/* The heat-shimmer, as a function of a UV with y running down. Foundry's half
   wraps this same function in a PIXI filter on the board for about half a
   second, then takes the filter off again. The study page runs it over a
   painted map so the two can be judged side by side. */
export const SHIMMER_GLSL = `
vec2 dhShimmer(vec2 uv, vec2 res, float t, float amt){
  float fall = 1. - smoothstep(0., .62, uv.y);
  vec2 p = uv * res / vec2(64., 22.);
  float a = vnoise(p + vec2(0., t * 3.2)) - .5;
  float b = vnoise(p * 1.7 - vec2(t * 1.1, t * 4.3)) - .5;
  return uv + vec2(a, b * .55) * amt * fall * 16. / res;
}
`;

const VERT = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes;      // canvas pixels
uniform float uScale;   // canvas pixels per CSS pixel
uniform float uTime;
uniform float uMotion;  // 0 under reduced motion: the light holds still
uniform int uOct;
uniform vec4 uH;        // hope: amount, reach (css px), boost, flare
uniform vec4 uF;        // fear: amount, reach (css px), boost, tear (-1 = none)
uniform float uFearTop; // which side came last, and therefore eats the other
uniform float uHeadY;   // headline centre, css px
${NOISE_GLSL}
float fbm3(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*vnoise(p);p=p*2.03+17.1;a*=.5;}return s/.875;}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<6;i++){if(i>=uOct)break;s+=a*vnoise(p);p=p*2.03+17.1;a*=.5;}return s;}

const vec3 GOLD = vec3(.831,.655,.173);
const vec3 GOLD_HOT = vec3(1.,.94,.74);
const vec3 VIO = vec3(.482,.310,.753);
const vec3 VIO_HOT = vec3(.80,.66,1.);
const vec3 INK = vec3(.055,.027,.094);

/* A ragged front descending with the reach: what a side occupies, and what it
   takes away from the other one during a hand-off. */
float frontOf(float d, float n){ return 1. - smoothstep(.72, 1.28, d + (n - .5) * .55); }

vec4 hope(vec2 p, float W, float t, out float m){
  m = 0.;
  if(uH.x < .002) return vec4(0);
  float R = max(uH.y, 1.), d = p.y / R, boost = uH.z;
  if(d > 3.2 && abs(p.y - uHeadY) > 60.) return vec4(0);

  float cx = p.x / W - .5;
  float wash = exp(-d * 1.55) * (1. - .55 * cx * cx);

  vec2 v = p - vec2(W * .5, -W * .6);
  float ang = atan(v.x, v.y);
  float r1 = vnoise(vec2(ang * 22., t * .06));
  float r2 = vnoise(vec2(ang * 61. + 3., -t * .09));
  float rays = pow(smoothstep(.38, .92, r1), 1.6) * .8 + pow(smoothstep(.55, .95, r2), 2.) * .45;
  rays *= exp(-d * .85) * (.55 + .45 * smoothstep(0., .25, d));

  float mo = 0.;
  for(int i = 0; i < 3; i++){
    float fi = float(i), sc = 30. + fi * 21.;
    vec2 q = p / sc;
    q.y -= t * (.09 + .05 * fi);
    q.x += sin(t * .17 + fi * 2.1) * .35;
    vec2 c = floor(q), f = fract(q) - .5;
    vec2 h = h22(c + fi * 19.7);
    float rr = length(f - (h - .5) * .66);
    float tw = .55 + .45 * sin(t * (1.3 + h.x * 2.4) + h.y * 6.283);
    mo += smoothstep(.05 + .05 * h.y, 0., rr) * tw * step(.6, h.x);
  }
  mo *= exp(-d * 1.05);

  float fy = p.y - uHeadY, fx = (p.x - W * .5) / W;
  float streak = exp(-fy * fy / 3.) * exp(-abs(fx) * 4.5) * .7 + exp(-fy * fy / 90.) * exp(-abs(fx) * 9.) * .18;
  float flare = streak * uH.w;

  float n = vnoise(vec2(p.x / 90., t * .15));
  m = frontOf(d, n) * uH.x;
  float rim = m * (1. - m) * 4. * clamp(boost - 1., 0., 1.);
  float edge = smoothstep(2.5, 0., p.y);

  vec3 col = GOLD * (wash * .55 + rays * .32) + GOLD_HOT * (pow(wash, 6.) * .35 + mo * .7 + rim * .35 + edge * .8)
           + GOLD_HOT * flare * .9;
  float I = uH.x * boost;
  col *= I;
  float a = clamp((wash * .18 + rays * .05) * I, 0., .6);
  return vec4(col, a);
}

vec4 fear(vec2 p, float W, float t, out float m){
  m = 0.;
  bool tearOn = uF.w >= 0.;
  if(uF.x < .002 && !tearOn) return vec4(0);
  float R = max(uF.y, 1.), d = p.y / R, boost = uF.z;
  vec4 acc = vec4(0);

  if(uF.x >= .002 && d < 2.6){
    vec2 q = p / 190.;
    vec2 w1 = vec2(fbm(q + vec2(0., t * .11)), fbm(q + vec2(5.2, 1.3) - vec2(t * .07, t * .09)));
    vec2 w2 = vec2(fbm(q + 3. * w1 + vec2(1.7, 9.2) + t * .04), fbm(q + 3. * w1 + vec2(8.3, 2.8) - t * .03));
    float n = fbm(q + 2.6 * w2);

    // drips: the boundary noise is stretched tall, so the edge hangs in
    // tendrils rather than tearing sideways like a spark
    float ns = fbm3(vec2(p.x / 120., p.y / 420. - t * .05) + 1.6 * w1);
    float field = 1.22 - d + (mix(ns, n, .3) - .5) * 1.9;
    float ink = smoothstep(0., .38, field);
    float rim = smoothstep(-.09, 0., field) * (1. - smoothstep(0., .12, field));
    float halo = exp(-abs(field) / .16) * .32;
    float smoke = (.5 + .5 * sin(n * 9. + w2.x * 6.)) * ink * smoothstep(1.4, .2, field);
    float core = smoothstep(-.025, 0., field) * (1. - smoothstep(0., .03, field));
    float haze = exp(-max(-field, 0.) * 4.) * .16 * (1. - ink);
    float veins = pow(clamp(n * 1.2, 0., 1.), 6.) * ink;
    float edge = smoothstep(2.5, 0., p.y);

    float scan = 1. + .22 * sin(p.y * 1.7 + t * 38.) * clamp(boost - 1., 0., 1.);
    vec3 em = (VIO * (haze + halo + smoke * .2 + veins * .55 + exp(-p.y / 10.) * .45 + rim * .85) + VIO_HOT * (core * .9 + edge * .7)) * scan;
    float I = uF.x * boost;
    em *= I;
    // embers: sparks shed by the burning edge, drifting up and guttering
    float emb = 0.;
    for(int i = 0; i < 2; i++){
      float fi = float(i), sc = 26. + fi * 18.;
      vec2 eq = p / sc;
      eq.y += t * (.55 + .3 * fi);
      eq.x += sin(eq.y * .9 + fi * 3.) * .35;
      vec2 c = floor(eq), f = fract(eq) - .5;
      vec2 hh = h22(c + 41.3 * fi);
      float life = fract(hh.x * 7.1 + t * (.6 + hh.y * .5));
      float rr = length(f - (hh - .5) * .6);
      emb += smoothstep(.07, 0., rr) * step(.72, hh.y) * (1. - life) * life * 4.;
    }
    emb *= smoothstep(-.6, -.05, field) * (1. - smoothstep(.1, .5, field)) * uF.x;
    em += (VIO_HOT * emb * 1.1) * (.6 + .4 * clamp(boost - 1., 0., 1.) / .45);
    float inkA = ink * .86 * uF.x;
    acc = vec4(INK * inkA + em, clamp(inkA + haze * .2 * uF.x, 0., .92));
    m = clamp(ink * 1.4 + rim, 0., 1.) * uF.x;
  }
  if(uF.x >= .002){
    float H = uRes.y / uScale;
    float ex = min(p.x, W - p.x) / W;
    float vg = smoothstep(.22, 0., ex) * (1. - smoothstep(.0, 1., p.y / H) * .55);
    float pulse = clamp((boost - 1.) / .45, 0., 1.);
    float va = vg * .5 * pulse * uF.x;
    acc.rgb = acc.rgb * (1. - va) + INK * va + VIO * va * .18;
    acc.a = acc.a + va * (1. - acc.a);
  }

  if(tearOn){
    float H = uRes.y / uScale;
    float ty = mix(-20., H + 20., uF.w);
    float blk = step(.62, h21(vec2(floor(p.x / 46.), floor(t * 24.))));
    float jit = (h21(vec2(floor(p.y / 3.), floor(t * 40.))) - .5) * 10. * blk;
    float dy = p.y - ty;
    float r = exp(-pow((dy - 3.) / 1.2, 2.)), g = exp(-pow(dy / 1.1, 2.)), b = exp(-pow((dy + 3.) / 1.2, 2.));
    float band = exp(-pow(dy / 16., 2.)) * blk * .35;
    float fade = sin(3.1416 * uF.w);
    vec3 tc = (vec3(r * .9, g * .55, b) * 1.4 + VIO_HOT * band) * fade;
    tc *= .6 + .4 * h21(vec2(floor((p.x + jit) / 7.), floor(t * 50.)));
    acc.rgb += tc;
    acc.a = clamp(acc.a + band * .3 * fade, 0., .95);
  }
  return acc;
}

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;
  float W = uRes.x / uScale, t = uTime * uMotion;
  float hm, fm;
  vec4 Hc = hope(p, W, t, hm);
  vec4 Fc = fear(p, W, t, fm);
  if(uFearTop > .5){ Hc *= 1. - fm; o = Fc + Hc * (1. - Fc.a); }
  else { Fc *= 1. - hm; o = Hc + Fc * (1. - Hc.a); }
}`;

function program(gl){
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

/* A side's life, worked out from two timestamps rather than stepped frame by
   frame — so flipping six times in a second is the same arithmetic as once,
   and nothing can be left half-way. */
function layerAt(L, now, peak, reduced){
  if (!L) return null;
  const e = now - L.t0;
  let reach, boost, amt;
  if (reduced){
    amt = clamp(e / 200); reach = SETTLED; boost = 1;
  } else {
    const rise = outExpo(clamp(e / T.rise));
    const back = inOut(clamp((e - T.hold) / T.settle));
    reach = (peak * rise) * (1 - back) + SETTLED * back;
    if (e < T.hold) reach = Math.max(reach, SETTLED * rise);
    boost = 1 + .45 * bump(e, 0, T.hold + T.settle * .5);
    amt = clamp(e / 110);
  }
  if (L.t1 != null){
    const x = now - L.t1;
    if (L.end === 'off'){
      const k = clamp(x / (reduced ? 200 : T.retract));
      reach *= 1 - inCubic(k); amt *= 1 - k;
    } else {
      amt *= 1 - clamp(x / (reduced ? 200 : T.handoff));
    }
  }
  return {amt, reach, boost, e};
}

/* `anchor` names the element the band's label sits beside and the headline
   hangs under — the Fear strip, wherever this Foundry generation docks it. */
export function spotlight(root, {reduced = false, quality = 'high', onShimmer, onHit, anchor, clock = () => performance.now()} = {}){
  const cv = root.querySelector('.sl-cv');
  const head = root.querySelector('.sl-head b');
  const tag = root.querySelector('.sl-tag');
  const gl = cv.getContext('webgl2', {premultipliedAlpha: true, alpha: true, antialias: false});
  if (!gl) { root.dataset.nogl = ''; }

  let prog, U = {};
  if (gl){
    prog = program(gl);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['uRes','uScale','uTime','uMotion','uOct','uH','uF','uFearTop','uHeadY'])
      U[n] = gl.getUniformLocation(prog, n);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  let side = 'off', L = {hope: null, fear: null}, raf = 0, last = 0, scale = 1;
  const t00 = clock();

  /* The label sits just left of the anchor, centred on it, and the headline
     clears it; with no anchor both fall back to the stylesheet. */
  const place = () => {
    const a = anchor?.();
    const r = a?.getBoundingClientRect();
    if (!r || !r.width) return;
    const rr = root.getBoundingClientRect();
    root.style.setProperty('--sl-tag-x', `${Math.max(12, Math.round(r.left - rr.left - tag.offsetWidth - 18))}px`);
    root.style.setProperty('--sl-tag-y', `${Math.round(r.top - rr.top + (r.height - 40) / 2)}px`);
    root.style.setProperty('--sl-head-y', `${Math.round(Math.max(118, r.bottom - rr.top + 68))}px`);
  };

  const resize = () => {
    const r = root.getBoundingClientRect();
    scale = Math.min(devicePixelRatio || 1, 1.5) * (quality === 'low' ? .38 : .62);
    cv.width = Math.max(1, Math.round(r.width * scale));
    cv.height = Math.max(1, Math.round(r.height * scale));
    place();
    wake();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(root);

  function frame(){
    raf = 0;
    const now = clock();
    const H = root.clientHeight;
    const peak = Math.max(150, H * .25);
    // a side that has finished leaving is forgotten before anything reads it
    for (const k of ['hope', 'fear']){
      const x = L[k] && layerAt(L[k], now, peak, reduced);
      if (x && L[k].t1 != null && x.amt <= 0) L[k] = null;
    }
    const h = layerAt(L.hope, now, peak, reduced);
    const f = layerAt(L.fear, now, peak, reduced);

    const busy = (x, Lx) => x && (x.e < T.hold + T.settle + 100 || Lx.t1 != null);
    const animating = busy(h, L.hope) || busy(f, L.fear);
    const idle = (h && h.amt > 0) || (f && f.amt > 0);

    // a settled band breathes at thirty frames a second, not sixty
    if (!animating && idle && now - last < 33){ raf = requestAnimationFrame(frame); return; }
    last = now;

    const flare = h && !reduced ? bump(h.e, 180, 1150) : 0;
    const tear = f && !reduced && f.e > 160 && f.e < 760 && L.fear.t1 == null ? (f.e - 160) / 600 : -1;
    const shimmer = f && !reduced && L.fear.t1 == null ? bump(f.e, 110, 820) : 0;
    onShimmer?.(shimmer, now);
    const cur = side === 'hope' ? h : side === 'fear' ? f : null;
    root.classList.toggle('sl-tagged', !!cur && cur.e >= (reduced ? 120 : T.tag));

    if (gl){
      const hr = head.getBoundingClientRect(), rr = root.getBoundingClientRect();
      gl.viewport(0, 0, cv.width, cv.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.uRes, cv.width, cv.height);
      gl.uniform1f(U.uScale, scale);
      gl.uniform1f(U.uTime, (now - t00) / 1000);
      gl.uniform1f(U.uMotion, reduced ? 0 : 1);
      gl.uniform1i(U.uOct, quality === 'low' ? 3 : 5);
      gl.uniform4f(U.uH, h ? h.amt : 0, h ? h.reach : 0, h ? h.boost : 1, flare);
      gl.uniform4f(U.uF, f ? f.amt : 0, f ? f.reach : 0, f ? f.boost : 1, tear);
      gl.uniform1f(U.uFearTop, (L.fear?.t0 ?? -1) > (L.hope?.t0 ?? -1) ? 1 : 0);
      gl.uniform1f(U.uHeadY, hr.top + hr.height / 2 - rr.top);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    if (animating || idle || tear >= 0) raf = requestAnimationFrame(frame);
  }
  function wake(){ if (!raf) raf = requestAnimationFrame(frame); }

  /* `settled` arrives already in the band, with no announcement: what a
     client that reloads mid-fight should see, since nothing just happened. */
  function set(next, {settled = false} = {}){
    if (next === side) return;
    const now = clock();
    const prev = side;
    if (prev !== 'off' && L[prev]){ L[prev].t1 = now; L[prev].end = next === 'off' ? 'off' : 'handoff'; }
    side = next;
    root.dataset.side = next;
    root.classList.remove('sl-tagged');

    if (next === 'off'){
      root.classList.remove('sl-play');
      wake();
      return;
    }
    L[next] = {t0: settled ? now - T.tag - 1 : now, t1: null, end: null};

    const words = WORDS[next];
    head.textContent = words;
    head.dataset.t = words;
    tag.querySelector('span').textContent = words;
    place();
    if (settled){ root.classList.remove('sl-play'); root.classList.add('sl-tagged'); wake(); return; }

    // restart the headline: off, flush, on — one flush for the whole change
    root.classList.remove('sl-play');
    void root.offsetWidth;
    root.classList.add('sl-play');
    if (next === 'fear') onHit?.();
    wake();
  }

  resize();
  return {
    set,
    place,
    get side(){ return side; },
    configure(o = {}){
      if ('reduced' in o){ reduced = !!o.reduced; root.classList.toggle('sl-reduced', reduced); }
      if ('quality' in o){ quality = o.quality; resize(); }
      wake();
    },
    destroy(){ ro.disconnect(); cancelAnimationFrame(raf); },
  };
}
