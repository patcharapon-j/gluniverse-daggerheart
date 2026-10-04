/**
 * The spotlight, in the game.
 *
 * `design/spotlight.js` draws it and studies it; this is the half a study page
 * cannot have. Three things, and each is a different owner's answer:
 *
 * - **Who has it** is the world setting `spotlight`, written by a GM and read
 *   everywhere. The overlay never holds a copy: the setting's own `onChange`
 *   raises `daggerheart.spotlightChanged` on every client, and that hook is the
 *   only thing that ever moves the light — so the plinth, the keys and a macro
 *   cannot disagree about it. A client that loads mid-fight arrives settled,
 *   because nothing just happened on its screen.
 * - **Where it is drawn** is a body-level layer between the board (z 0) and
 *   Foundry's interface (z 60), so the light falls on the map and the Fear
 *   strip and sidebar stand in front of it. Click-through throughout: the board
 *   owns click, drag and box-select over every pixel this covers.
 * - **The map shimmer** is the one effect an overlay cannot draw, because it
 *   has to warp what is underneath. It is a PIXI filter on the stage for the
 *   half second the shimmer runs, and it is taken off again the moment the
 *   envelope reaches zero — so at rest nothing of ours is in Foundry's render
 *   path at all. Same `dhShimmer` GLSL the study page runs over its painted map.
 */

import { SYSTEM_ID } from "./config.ts";
import { getSpotlight, spotlightLite, toggleSpotlight } from "./settings.ts";
import { NOISE_GLSL, SHIMMER_GLSL, SPOTLIGHT, spotlight, type SpotlightController } from "./ui/spotlight.js";

let root: HTMLElement | null = null;
let ctl: SpotlightController | null = null;

/* ── the keys ─────────────────────────────────────────────────────────────
   Two, one per side, and pressing the lit side again clears it: a cycling key
   would have the GM counting presses mid-fight. Unbound by default so they
   collide with nothing, and `restricted` so only a GM is offered them.
   Keybindings must be registered during `init`. */
export function registerSpotlightKeys(): void {
  const key = (side: "hope" | "fear", name: string) =>
    game.keybindings.register(SYSTEM_ID, name, {
      name: `DAGGERHEART.Spotlight.${name === "spotlightPlayer" ? "KeyPlayer" : "KeyGm"}`,
      hint: `DAGGERHEART.Spotlight.${name === "spotlightPlayer" ? "KeyPlayerHint" : "KeyGmHint"}`,
      editable: [],
      restricted: true,
      onDown: () => {
        void toggleSpotlight(side);
        return true;
      },
    });
  key("hope", "spotlightPlayer");
  key("fear", "spotlightGm");
}

/* The system's own motion dial, then the OS: either asking for less gets the
   still band and the short fade. */
const reduced = (): boolean => {
  let choice = "full";
  try {
    choice = String(game.settings?.get(SYSTEM_ID, "motion") ?? "full");
  } catch {
    /* before init */
  }
  return choice !== "full" || matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export function registerSpotlight(): void {
  root?.remove();
  ctl?.destroy();

  const host = document.createElement("div");
  host.innerHTML = SPOTLIGHT();
  root = host.firstElementChild as HTMLElement | null;
  if (!root) return;
  /* Before the interface rather than after it, so the stacking order and the
     document order say the same thing. */
  const ui = document.getElementById("interface");
  if (ui) document.body.insertBefore(root, ui);
  else document.body.append(root);

  ctl = spotlight(root, {
    reduced: reduced(),
    quality: spotlightLite() ? "low" : "high",
    anchor: () => document.querySelector("#ui-top .hud"),
    onShimmer: shimmer,
  });
  ctl.set(getSpotlight(), { settled: true });

  Hooks.on("daggerheart.spotlightChanged", () => {
    ctl?.configure({ reduced: reduced() });
    ctl?.set(getSpotlight());
  });
  Hooks.on("daggerheart.spotlightLiteChanged", () =>
    ctl?.configure({ quality: spotlightLite() ? "low" : "high" }),
  );
  /* The anchor moves when Foundry reflows its chrome — the sidebar collapsing,
     the scene navigation changing height. A resize of the window is the one
     signal that reliably follows all of them. */
  addEventListener("resize", () => ctl?.place());
}

/* ── the shimmer ──────────────────────────────────────────────────────────
   GLSL 1, for PixiJS 7. `outputFrame` is the frame in screen pixels and
   `inputSize` the pooled texture, so the screen position of a texel is the
   frame origin plus the coordinate times the texture size — which is what lets
   the shimmer fall off from the top of the *screen* rather than of the scene. */
const SHIMMER_FRAGMENT = `
precision highp float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec4 inputSize;
uniform vec4 outputFrame;
uniform vec2 uScreen;
uniform float uTime;
uniform float uAmt;
${NOISE_GLSL}
${SHIMMER_GLSL}
void main(){
  vec2 px = outputFrame.xy + vTextureCoord * inputSize.xy;
  vec2 uv = px / uScreen;
  vec2 o = (dhShimmer(uv, uScreen, uTime, uAmt) - uv) * uScreen * inputSize.zw;
  vec2 lim = outputFrame.zw * inputSize.zw;
  vec4 c = texture2D(uSampler, clamp(vTextureCoord + o, vec2(0.), lim));
  float r = texture2D(uSampler, clamp(vTextureCoord + o * 1.6, vec2(0.), lim)).r;
  float b = texture2D(uSampler, clamp(vTextureCoord + o * .4, vec2(0.), lim)).b;
  gl_FragColor = vec4(r, c.g, b, c.a);
}`;

let FilterClass: any = null;
let filter: any = null;
let warned = false;

function shimmerFilter(): any {
  if (filter) return filter;
  if (!FilterClass) {
    const Base = (globalThis as any).foundry?.canvas?.rendering?.filters?.AbstractBaseFilter;
    if (!Base) return null;
    FilterClass = class DaggerheartSpotlightShimmer extends Base {
      static defaultUniforms = { uTime: 0, uAmt: 0, uScreen: [1, 1] };
      static _createFragmentShader(): string {
        return SHIMMER_FRAGMENT;
      }
    };
  }
  try {
    filter = FilterClass.create();
  } catch (err) {
    /* Loud once. The banner still plays; only the map stays still. */
    if (!warned) console.error(`${SYSTEM_ID} | spotlight shimmer filter failed`, err);
    warned = true;
    filter = null;
  }
  return filter;
}

function shimmer(amount: number): void {
  const stage = (canvas as any)?.stage;
  if (!stage) return;
  if (amount <= 0) {
    if (filter && stage.filters?.includes(filter)) {
      stage.filters = stage.filters.filter((f: any) => f !== filter);
    }
    return;
  }
  const f = shimmerFilter();
  if (!f) return;
  const screen = (canvas as any)?.app?.renderer?.screen;
  f.uniforms.uAmt = amount;
  f.uniforms.uTime = (performance.now() / 1000) % 3600;
  f.uniforms.uScreen = [screen?.width ?? innerWidth, screen?.height ?? innerHeight];
  if (!stage.filters?.includes(f)) stage.filters = [...(stage.filters ?? []), f];
}
