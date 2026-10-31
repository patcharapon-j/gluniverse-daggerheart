/**
 * An adversary can draw no tracks, for anybody, and still keep its chip.
 *
 * Improvised creatures have no stat block, so their arcs count schema
 * defaults. `adversaryTracks` hides them world-wide and a per-token flag
 * overrides it either way. What this asserts:
 *
 *   1. By default an adversary's chip carries its tracks (positive control).
 *   2. The world setting hides tracks AND Difficulty from the GM, while the
 *      chip itself survives for its crown, reticle and conditions.
 *   3. A token flag of "shown" beats a hidden world default.
 *   4. A token flag of "hidden" beats a shown world default.
 *   5. A character ignores the world setting.
 *
 * The chip's `data-shape` is the readout: it is the list of track maxima
 * and the Difficulty, so all zeros and a dash means nothing numeric drawn.
 * Same hand-rolled DOM as `test-token-chip-lifecycle.mjs`, cut down.
 */

import assert from "node:assert/strict";

class El {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.dataset = {};
    this.className = "";
    this.classes = new Set();
    this.style = { setProperty() {}, removeProperty() {} };
    this.classList = {
      add: (...c) => c.forEach((x) => this.classes.add(x)),
      remove: (...c) => c.forEach((x) => this.classes.delete(x)),
      contains: (c) => this.classes.has(c),
      toggle: (c, on) => (on ? this.classes.add(c) : this.classes.delete(c)),
    };
  }
  set innerHTML(html) {
    this._html = String(html);
    const root = new El("div");
    root._markup = this._html;
    root.className = (this._html.match(/class="([^"]*)"/) ?? [, ""])[1];
    root.parentElement = this;
    this.children = [root];
  }
  get innerHTML() { return this._html ?? ""; }
  get firstElementChild() { return this.children[0] ?? null; }
  appendChild(child) {
    child.parentElement?.removeChild?.(child);
    this.children.push(child);
    child.parentElement = this;
    return child;
  }
  prepend(child) { return this.appendChild(child); }
  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    if (child.parentElement === this) child.parentElement = null;
    return child;
  }
  remove() { this.parentElement?.removeChild(this); }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  getAnimations() { return []; }
  get offsetWidth() { return 1; }
}

globalThis.HTMLElement = El;
globalThis.document = { createElement: (tag) => new El(tag), querySelector: () => null };
const timers = [];
globalThis.window = { setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout: () => {} };
const flush = () => { while (timers.length) timers.shift()(); };

const hooks = new Map();
globalThis.Hooks = {
  on: (name, fn) => { if (!hooks.has(name)) hooks.set(name, []); hooks.get(name).push(fn); },
  callAll: () => {},
};
const fire = (name, ...args) => (hooks.get(name) ?? []).forEach((fn) => fn(...args));

const SETTINGS = { tokenChip: true, adversaryChip: "none", adversaryTracks: "shown" };
globalThis.game = { user: { isGM: true }, settings: { get: (_s, key) => SETTINGS[key] } };
globalThis.CONFIG = { specialStatusEffects: { DEFEATED: "dead" }, Token: {} };

const hud = new El("div");
hud.id = "hud";

const actorOf = (type) => ({
  type,
  isOwner: true,
  statuses: new Set(),
  appliedEffects: [],
  system: {
    difficulty: type === "adversary" ? 14 : undefined,
    resources: {
      hitPoints: { marked: 1, max: 6 },
      stress: { marked: 0, max: 4 },
      armorSlots: { marked: 0, max: 2 },
      hope: type === "character" ? { value: 2, max: 6 } : undefined,
    },
    scars: [],
  },
});

const tokenOf = (id, actor) => {
  const flags = {};
  const document = {
    id, hidden: false, width: 1, height: 1, x: 0, y: 0, actor,
    getFlag: (_s, key) => flags[key],
    flags,
  };
  return {
    id, document, actor,
    isVisible: true, visible: true, controlled: true, isTargeted: false,
    w: 100, h: 100, x: 0, y: 0, mesh: null,
    _previewType: null, get isPreview() { return this._previewType !== null; },
  };
};

const ogre = tokenOf("ogre", actorOf("adversary"));
const hero = tokenOf("hero", actorOf("character"));

globalThis.canvas = {
  ready: true,
  grid: { size: 100 },
  stage: { scale: { x: 1 } },
  tokens: { placeables: [ogre, hero] },
  hud: { element: hud },
  app: { ticker: { add() {}, remove() {} } },
};

const { registerTokenChips } = await import("../src/module/token-hud.ts");
registerTokenChips();
flush();

const layer = () =>
  hud.children.find((c) => c.className?.includes("dh-board-stack"))
    ?.children.find((c) => c.className?.includes("tok-layer"));
const chipFor = (token) =>
  layer()?.children.find((c) => c.parentElement && c._markup && c.dataset.shape !== undefined && c._for === token.id)
  ?? null;

/* Tag each chip with the token it was built for, since the stub DOM has no
   other way to tell two chips apart. */
const resync = () => {
  for (const t of [ogre, hero]) {
    const before = new Set(layer()?.children ?? []);
    fire("updateToken", { object: t });
    flush();
    for (const c of layer()?.children ?? []) if (!before.has(c)) c._for = t.id;
  }
};
for (const c of layer()?.children ?? []) c._for = c === layer().children[0] ? "ogre" : "hero";

const EMPTY = "0/0/0/0/0/-";

/* 1 — default: tracks drawn. */
resync();
assert.equal(chipFor(ogre)?.dataset.shape, "6/4/2/0/0/14", "an adversary draws its tracks and Difficulty by default");
assert.match(chipFor(ogre)._markup, /er-ring/, "the default chip carries rails");

/* 2 — world hides. */
SETTINGS.adversaryTracks = "hidden";
resync();
const hidden = chipFor(ogre);
assert.ok(hidden, "a hidden-tracks adversary still has a chip for its chrome");
assert.equal(hidden.dataset.shape, EMPTY, "no tracks and no Difficulty, even for the GM");
assert.doesNotMatch(hidden._markup, /er-ring|er-bed|er-diff/, "nothing numeric is drawn");
assert.match(hidden._markup, /is-selected/, "the selection crown survives");

/* 5 — characters ignore the world switch. */
assert.equal(chipFor(hero)?.dataset.shape, "6/4/2/6/0/-", "a character keeps its tracks");

/* 3 — token says shown. */
ogre.document.flags.tracks = "shown";
resync();
assert.equal(chipFor(ogre)?.dataset.shape, "6/4/2/0/0/14", "a token flag of shown beats the hidden world default");

/* 4 — token says hidden under a shown world. */
SETTINGS.adversaryTracks = "shown";
ogre.document.flags.tracks = "hidden";
resync();
assert.equal(chipFor(ogre)?.dataset.shape, EMPTY, "a token flag of hidden beats the shown world default");

/* 6 — the Token HUD press writes the opposite of what is on screen. */
game.i18n = { localize: (k) => k };
const { registerTrackVisibility } = await import("../src/module/track-visibility.ts");
registerTrackVisibility();

const pressFor = (token, isGM = true) => {
  game.user.isGM = isGM;
  const col = new El("div");
  col.querySelectorAll = () => col.children.filter((c) => "dhTracks" in c.dataset);
  const root = new El("div");
  root.querySelector = (sel) => (sel === ".col.right" ? col : null);
  let rendered = 0;
  fire("renderTokenHUD", { object: token, render: () => rendered++ }, root);
  game.user.isGM = true;
  return { press: col.children[0], col, rendered: () => rendered };
};
El.prototype.addEventListener = function (type, fn) { (this.listeners ??= {})[type] = fn; };
const writes = [];
ogre.document.setFlag = async (_s, key, value) => { writes.push(value); ogre.document.flags[key] = value; };

const { press, rendered } = pressFor(ogre);
assert.ok(press, "a GM gets the press on an adversary");
assert.ok(press.className.includes("active"), "the press reads as on while tracks are hidden");
await press.listeners.click({ preventDefault() {}, stopPropagation() {} });
assert.deepEqual(writes, ["shown"], "pressing on a hidden token shows it");
assert.equal(rendered(), 1, "the HUD redraws to show the new state");
assert.equal(pressFor(ogre, false).press, undefined, "a player gets no press");
assert.equal(pressFor(hero).press, undefined, "a character gets no press");

console.log("track visibility: 6 cases hold");
