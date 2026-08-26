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

const PALETTE = [
  "#9b72e4", "#7590a6", "#aeb8c4", "#7388aa",
  "#ef4c5c", "#76d8d1", "#c467e8", "#a8dbe7",
  "#e78ba7", "#9bc45b", "#f2c85c", "#55bff5",
  "#7785a1", "#8d55b8", "#86a7c9", "#f0783f",
] as const;

export const CONDITION_MATERIALS: readonly ConditionMaterialDef[] = CONDITIONS.map((condition, i) => ({
  id: condition.id,
  color: rgb(PALETTE[i] ?? "#d8e2ec"),
  hex: PALETTE[i] ?? "#d8e2ec",
}));

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
const MARK = Symbol("daggerheartConditionMaterial");
const filters = new Map<any, any>();
let FilterClass: any;
let registered = false;
let warned = false;

/** GLSL 1 so the same program runs on Foundry's PixiJS 7 WebGL pipeline. */
export const TOKEN_CONDITION_FRAGMENT = `
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

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0,0.0)), f.x),
             mix(hash21(i + vec2(0.0,1.0)), hash21(i + vec2(1.0,1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = .5;
  mat2 turn = mat2(.8, -.6, .6, .8);
  for (int i = 0; i < 5; i++) {
    value += amp * noise2(p);
    p = turn * p * 2.03 + 17.17;
    amp *= .5;
  }
  return value;
}

float voronoiEdge(vec2 x) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  float first = 8.0;
  float second = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = vec2(hash21(n + g), hash21(n + g + 31.7));
      vec2 r = g + .16 + .68 * o - f;
      float d = dot(r, r);
      if (d < first) { second = first; first = d; }
      else if (d < second) { second = d; }
    }
  }
  return sqrt(second) - sqrt(first);
}

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

float conditionPattern(float id, vec2 p, float t) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float n = fbm(p * 3.0 + vec2(t * .07, -t * .05));
  if (id < .5) {
    float cracks = 1.0 - smoothstep(.018, .095, voronoiEdge(p * 4.3 + vec2(sin(t*.21),cos(t*.17))*.12));
    return clamp(cracks * (.58 + .42 * noise2(p * 12.0)) + band(r,.67+.035*sin(t*1.3),.045)*.52,0.0,1.0);
  }
  if (id < 1.5) {
    float smoke = smoothstep(.38,.75,fbm(p*2.4+vec2(t*.11,-t*.06)));
    float veil = smoothstep(-.7,.55,p.y+.22*sin(p.x*4.0+t*.35));
    return clamp(smoke*.78+veil*.28,0.0,1.0);
  }
  if (id < 2.5) {
    float rings = pow(.5+.5*cos((r*8.0-t*.22)*PI*2.0),13.0);
    float brush = pow(.5+.5*sin(a*46.0+n*4.0),18.0);
    return clamp(rings*.76+brush*.38,0.0,1.0);
  }
  if (id < 3.5) {
    vec2 q=p; q.x += .2*sin(q.y*4.7+t*.42);
    float folds=pow(.5+.5*sin(q.x*12.0+fbm(q*2.0)*7.0),8.0);
    return clamp(folds*.62+band(fbm(q*2.7+t*.03),.54,.08)*.52,0.0,1.0);
  }
  if (id < 4.5) {
    float lock=pow(max(0.0,cos(a*4.0)),22.0)*band(r,.66,.08);
    return clamp(lock+band(r,.38+.13*sin(t*1.4),.035)*.72,0.0,1.0);
  }
  if (id < 5.5) {
    float scan=pow(.5+.5*sin((p.y+n*.12-t*.16)*72.0),14.0);
    return clamp(scan*.36+smoothstep(.48,.75,fbm(p*3.1+vec2(t*.08,0.0)))*.88,0.0,1.0);
  }
  if (id < 6.5) {
    float sigil=pow(max(0.0,cos(a*6.0+r*19.0-t*.43)),15.0);
    return clamp(sigil*.8+band(fract(r*4.5-t*.04),.5,.055)*.48,0.0,1.0);
  }
  if (id < 7.5) {
    float caustic=pow(1.0-abs(sin((n*2.2+r*5.0-t*.12)*PI*2.0)),5.0);
    float prism=pow(.5+.5*sin(a*3.0+p.x*8.0-t*.31),12.0);
    return clamp(caustic*.86+prism*.42,0.0,1.0);
  }
  if (id < 8.5) {
    float fibers=pow(.5+.5*cos(a*34.0+n*5.0),14.0);
    return clamp(fibers*(1.0-r*.35)*.74+band(r,.44+.035*sin(t*.85),.09)*.66,0.0,1.0);
  }
  if (id < 9.5) {
    float cells=smoothstep(.54,.71,fbm(p*5.6+vec2(t*.035,0.0)));
    float pits=1.0-smoothstep(.04,.13,voronoiEdge(p*7.0));
    return clamp(cells*.72+pits*.48,0.0,1.0);
  }
  if (id < 10.5) {
    float shock=band(r,fract(t*.28)*.95,.045);
    float spokes=pow(max(0.0,cos(a*12.0)),26.0)*(1.0-r*.35);
    return clamp(shock*.82+spokes*.68,0.0,1.0);
  }
  if (id < 11.5) {
    float arcNoise=fbm(vec2(a*2.7,r*8.0-t*.8));
    float arcs=pow(1.0-abs(sin(a*5.0+arcNoise*7.0)),16.0);
    float flash=pow(.5+.5*sin(t*4.2+n*8.0),18.0);
    return clamp(arcs*.88+flash*.48,0.0,1.0);
  }
  if (id < 12.5) {
    float sink=smoothstep(-.6,.82,-p.y+.16*sin(p.x*5.0+t*.3));
    float trails=pow(.5+.5*sin(p.x*38.0+n*3.0),18.0);
    return clamp(sink*.64+trails*.28,0.0,1.0);
  }
  if (id < 13.5) {
    float tendrils=pow(.5+.5*cos(a*17.0+n*7.0-t*.34),9.0);
    float clench=smoothstep(.86,.3,r+.09*sin(a*9.0+t));
    return clamp(tendrils*clench*.76+band(r,.7,.06)*.42,0.0,1.0);
  }
  if (id < 14.5) {
    float wave=pow(.5+.5*cos((r*8.0+t*.35)*PI*2.0),18.0);
    return clamp(wave*smoothstep(1.0,.1,r)*(.55+.45*n),0.0,1.0);
  }
  vec2 flameP=vec2(p.x*2.5,p.y*2.8-t*.65);
  float flameNoise=fbm(flameP+vec2(0.0,sin(p.x*5.0+t)*.22));
  float flame=smoothstep(.36,.78,flameNoise+(p.y+1.0)*.27);
  return clamp(flame*.84+pow(.5+.5*sin(p.x*18.0+flameNoise*10.0),10.0)*flame*.42,0.0,1.0);
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
  if(id<2.5)return mix(vec3(.16,.2,.25),vec3(.92,.96,1.0),value*.78);
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

/* -- token space, not filter space --------------------------------
   PIXI does NOT hand a filter a 0..1 coordinate over its object. Its
   vertex shader writes

       vTextureCoord = aVertexPosition * (outputFrame.zw * inputSize.zw)

   so the coordinate spans only outputFrame/inputSize of a POOLED texture.
   outputFrame.zw is the token's size in screen pixels and moves with the
   camera; inputSize.xy comes from a pool that snaps to discrete sizes. The
   ratio therefore changes as you zoom -- and reading vTextureCoord * 2 - 1
   as if it were the token would rescale every frequency below with it,
   which is a texture that swims under the creature instead of belonging
   to it.

   tokenUv divides that ratio back out, so 0..1 is the token at every zoom;
   sampleArt is its inverse and clamps to the frame, because sampling past
   inputClamp reads whatever else the pool is holding. */
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

  vec4 original=sampleArt(uv);
  float circle=1.0-smoothstep(.94,1.0,length(p));
  vec3 colorSum=vec3(0.0); vec3 accentSum=vec3(0.0); vec2 warp=vec2(0.0);
  float survival=1.0; float peak=0.0; float darkness=0.0;
  for(int i=0;i<5;i++){
    if(float(i)>=uCount)break;
    float id=idAt(i); float localTime=uTime+float(i)*1.73;
    float value=conditionPattern(id,p,localTime);
    colorSum+=colorAt(i); accentSum+=conditionAccent(id,colorAt(i),p,localTime,value);
    warp+=conditionWarp(id,p,localTime,value); survival*=1.0-value*.72; peak=max(peak,value);
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
  float tint=clamp(.18+field*.44+min(uCount-1.0,2.0)*.015,.18,.59);
  vec3 color=mix(warped.rgb,colorized,tint);
  color*=1.0-clamp(darkness/count,0.0,1.0)*.38;
  float edge=smoothstep(.48,.98,length(p));
  float glass=pow(max(0.0,1.0-distance(uv,vec2(.36,.27))*1.9),6.0);
  vec3 emissive=mix(accent,vec3(1.0),.52);
  color+=emissive*pow(peak,3.4)*.3+material*edge*.12+vec3(.72,.83,1.0)*glass*.1;
  color+=(noise2(uv*118.0+uTime*.03)-.5)*.035*(field+.18);
  color=clamp((color-.5)*1.08+.5,0.0,1.0);
  gl_FragColor=vec4(mix(original.rgb,color,circle),original.a);
}`;

function getFilterClass(): any {
  if (FilterClass) return FilterClass;
  const Base = (globalThis as any).foundry?.canvas?.rendering?.filters?.AbstractBaseFilter;
  if (!Base) return null;
  FilterClass = class DaggerheartConditionFilter extends Base {
    static defaultUniforms = {
      uTime: 1.75, uCount: 0, uDead: 0,
      uId0: 0, uId1: 0, uId2: 0, uId3: 0, uId4: 0,
      uColor0: [0,0,0], uColor1: [0,0,0], uColor2: [0,0,0],
      uColor3: [0,0,0], uColor4: [0,0,0],
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

export function syncTokenConditionMaterial(token: any, ids: readonly string[], dead = false): void {
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
    filters.set(token, filter);
  }

  const materials = ids.map((id) => BY_ID.get(id)).filter(Boolean).slice(0, 5) as Array<ConditionMaterialDef & { index: number }>;
  filter.uniforms.uCount = dead ? 0 : materials.length;
  filter.uniforms.uDead = dead ? 1 : 0;
  materials.forEach((material, i) => {
    filter.uniforms[`uId${i}`] = material.index;
    filter.uniforms[`uColor${i}`] = [...material.color];
  });

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

function tick(): void {
  if (REDUCED?.matches) return;
  const time = (performance.now() / 1000) % CLOCK_WRAP;
  for (const filter of filters.values()) {
    if (filter.uniforms.uDead < .5) filter.uniforms.uTime = time;
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
