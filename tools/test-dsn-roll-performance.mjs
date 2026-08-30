/* Regression coverage for the custom Dice So Nice render path.
 *
 * Dice So Nice 6.2.x enables its full-screen bloom compositor whenever a
 * visible material has a non-black `emissive` colour. That adds extra scene
 * traversals and render passes to every animation frame. Hope and Fear still
 * need their illuminated labels and cuts, but they must provide that light in
 * their own material shader instead of opting the whole scene into bloom. */

const hooks = new Map();
globalThis.Hooks = {
  once: (name, fn) => hooks.set(name, fn),
  on: (name, fn) => hooks.set(name, fn),
};
globalThis.game = { settings: { get: () => true } };
globalThis.foundry = { utils: { getRoute: (path) => `/${path}` } };
globalThis.document = { fonts: { load: async () => {} } };
globalThis.Image = class {
  set src(value) { this.currentSrc = value; }
  async decode() {}
};

const { registerDice } = await import("../src/module/dice/dsn.ts");
registerDice();

const colorsets = [];
const dice3d = {
  addTexture: async () => {},
  addColorset: async (set) => colorsets.push(set),
};
hooks.get("diceSoNiceReady")(dice3d);

for (let i = 0; i < 30 && colorsets.length < 14; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const hope = colorsets.find((set) => set.name === "dh-hope-d12");
const fear = colorsets.find((set) => set.name === "dh-fear-d12");
if (!hope || !fear) throw new Error("Hope/Fear d12 colorsets did not register");

for (const set of [hope, fear]) {
  if (set.material !== "frosted" || !set.texture || !set.background || !set.foreground) {
    throw new Error(`${set.name} lost its visual finish: ${JSON.stringify(set)}`);
  }
  if (set.emissiveLabels) {
    throw new Error(`${set.name} still enables Dice So Nice's per-frame global bloom compositor`);
  }
}

let baseShaderApplied = false;
const black = {
  value: 0xffffff,
  setHex(value) { this.value = value; },
};
const material = {
  userData: { materialData: { texture: { name: "dh-cut-hope-d12" } } },
  emissive: black,
  emissiveMap: {
    image: {
      width: 512,
      height: 512,
      getContext: () => ({
        save() {},
        restore() {},
        drawImage() {},
        set globalCompositeOperation(_value) {},
      }),
    },
  },
  onBeforeCompile: () => { baseShaderApplied = true; },
};

hooks.get("diceSoNiceOnMaterialReady")(material);

if (material.emissive.value !== 0x000000) {
  throw new Error("Custom material still advertises a global emissive colour to Dice So Nice");
}

const shader = {
  uniforms: {},
  fragmentShader: "void main() {\n#include <emissivemap_fragment>\n}",
};
material.onBeforeCompile(shader, {});

if (!baseShaderApplied) throw new Error("Dice So Nice's base shader customization was not preserved");
if (!shader.fragmentShader.includes("dhLocalEmissiveIntensity")) {
  throw new Error("Custom label/cut glow was not restored inside the dice material shader");
}
if (shader.uniforms.dhLocalEmissiveIntensity?.value !== 1) {
  throw new Error("Custom material glow intensity changed");
}

console.log("dsn performance: one-pass local glow with the full frosted Hope/Fear finish preserved");
