/**
 * A chip is built once per creature, and a gesture is not a creature.
 *
 * Both bugs this ratchets were invisible by construction, and that is the
 * whole reason it exists: a chip that replays its arrival is drawn perfectly
 * every frame of the replay, and a chip that is rebuilt when a maximum moves
 * is correct about every number on it. Nothing on screen says which of
 * "arriving" and "arriving again" you are looking at.
 *
 * What it asserts:
 *
 *   1. A drag leaves the chip ELEMENT identical. Foundry's drag ghost is
 *      `document.clone({keepId: true})`, so it answers to the creature's own
 *      document id — which is how `destroyToken` for the ghost came to delete
 *      the live chip, on a drop and on a cancel alike.
 *   2. The chip rides the ghost, and the real token's own refreshes do not
 *      pull it back. Both placeables were writing one element every frame.
 *   3. A shape change rebuilds and does NOT animate. The design note above
 *      `retire` has always said so; the code inferred the flag from "there
 *      was no chip a moment ago", which is true of a rebuild too.
 *   4. A creature coming out of the fog DOES animate, which is the positive
 *      control for 3 — a ratchet that only ever asserts silence passes just
 *      as well on a component that has stopped animating at all.
 *
 * A hand-rolled DOM, in `test-mark-restarts.mjs`'s idiom and for its reason:
 * this needs elements that can be appended, removed, counted and compared by
 * identity, and `setChip` is tolerant of a `querySelector` that finds nothing
 * — the rails are somebody else's test. A real DOM would be a dependency for
 * that.
 */

import assert from "node:assert/strict";

/* ══ the DOM, such as it is ══════════════════════════════════════════ */

/** Every `classList.add`, by class, so an arrival is counted and not guessed. */
const added = new Map();

class El {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.dataset = {};
    this.className = "";
    this.classes = new Set();
    this.style = {
      setProperty() {},
      removeProperty() {},
      get cssText() { return ""; },
      set cssText(_v) {},
    };
    this.classList = {
      add: (...c) => c.forEach((x) => {
        added.set(x, (added.get(x) ?? 0) + 1);
        this.classes.add(x);
      }),
      remove: (...c) => c.forEach((x) => this.classes.delete(x)),
      contains: (c) => this.classes.has(c),
      toggle: (c, on) => (on ? this.classList.add(c) : this.classes.delete(c)),
    };
  }

  /* `sync` parses one chip out of a host div and takes `firstElementChild`.
     What the markup says is `ui/token.js`'s business and tested there; all
     this has to produce is one element that can be told apart from the next
     one by identity. */
  set innerHTML(html) {
    this._html = String(html);
    const root = new El("div");
    root.className = (this._html.match(/class="([^"]*)"/) ?? [, ""])[1];
    for (const cls of root.className.split(/\s+/).filter(Boolean)) root.classes.add(cls);
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
  prepend(child) {
    child.parentElement?.removeChild?.(child);
    this.children.unshift(child);
    child.parentElement = this;
    return child;
  }
  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    if (child.parentElement === this) child.parentElement = null;
    return child;
  }
  remove() { this.parentElement?.removeChild(this); }

  /* `setChip` guards every one of these, so finding nothing makes it a
     near-no-op — which is what this file wants from it. */
  querySelector() { return null; }
  querySelectorAll() { return []; }
  getAnimations() { return []; }
  get offsetWidth() { return 1; }
}

globalThis.HTMLElement = El;
globalThis.document = {
  createElement: (tag) => new El(tag),
  querySelector: () => null,
};

/** Deferred work, run when the test says so rather than when Node feels like it. */
const timers = [];
globalThis.window = {
  setTimeout: (fn) => { timers.push(fn); return timers.length; },
  clearTimeout: () => {},
};
const flush = () => {
  while (timers.length) timers.shift()();
};

/* ══ the Foundry this file actually uses ═════════════════════════════ */

const hooks = new Map();
globalThis.Hooks = {
  on: (name, fn) => {
    if (!hooks.has(name)) hooks.set(name, []);
    hooks.get(name).push(fn);
  },
  callAll: () => {},
};
const fire = (name, ...args) => (hooks.get(name) ?? []).forEach((fn) => fn(...args));

const SETTINGS = { tokenChip: true, adversaryChip: "none" };
globalThis.game = {
  user: { isGM: true },
  settings: { get: (_system, key) => SETTINGS[key] },
};
globalThis.CONFIG = { specialStatusEffects: { DEFEATED: "dead" }, Token: {} };

const hud = new El("div");
hud.id = "hud";

const actor = {
  type: "character",
  isOwner: true,
  statuses: new Set(),
  appliedEffects: [],
  system: {
    resources: {
      hitPoints: { marked: 0, max: 6 },
      stress: { marked: 0, max: 6 },
      armorSlots: { marked: 0, max: 3 },
      hope: { value: 2, max: 6 },
    },
    scars: [],
  },
};

/** The real placeable. */
const token = {
  id: "tok1",
  document: { id: "tok1", hidden: false, width: 1, height: 1, x: 0, y: 0 },
  actor,
  isVisible: true,
  visible: true,
  controlled: false,
  isTargeted: false,
  w: 100, h: 100, x: 0, y: 0,
  mesh: null,
  /* Foundry's own pair: `_previewType` is the field and `isPreview` is the
     getter over it, and the module asks the getter. */
  _previewType: null,
  get isPreview() { return this._previewType !== null; },
  _preview: undefined,
  _original: undefined,
};

globalThis.canvas = {
  ready: true,
  grid: { size: 100 },
  stage: { scale: { x: 1 } },
  tokens: { placeables: [token] },
  hud: { element: hud },
  app: { ticker: { add() {}, remove() {} } },
};

const { registerTokenChips } = await import("../src/module/token-hud.ts");

/* ══ up and running ══════════════════════════════════════════════════ */

registerTokenChips();
flush();

/** The chip layer, found the way the module hangs it. */
const layerOf = () => {
  const stack = hud.children.find((c) => c.className?.includes("dh-board-stack"));
  return stack?.children.find((c) => c.className?.includes("tok-layer")) ?? null;
};
const chipOf = () => layerOf()?.children[0] ?? null;

const first = chipOf();
assert.ok(first, "a visible creature gets a chip");
assert.equal(added.get("arrive"), 1, "a creature appearing animates, exactly once");

/* ══ 1 + 2 — a drag is not an arrival ════════════════════════════════
   The ghost carries the real document id, is created `visible = false` and
   turned on a frame later, and is destroyed on a drop and on a cancel
   alike. Every one of those was a separate way to lose the chip. */

const ghost = {
  ...token,
  document: { ...token.document },
  isVisible: false,
  visible: false,
  _previewType: "dragging",
  get isPreview() { return this._previewType !== null; },
  _original: token,
  x: 300, y: 200,
};
token._preview = ghost;

fire("drawToken", ghost);
for (let i = 0; i < 3; i++) {
  ghost.x += 25;
  ghost.y += 25;
  fire("refreshToken", ghost);
  /* Foundry keeps refreshing the real token too, for its dimmed drag state. */
  fire("refreshToken", token);
}

assert.equal(chipOf(), first, "a drag must not replace the chip element");
assert.equal(added.get("arrive"), 1, "a drag is not an arrival");
assert.equal(first.style.left, `${ghost.x}px`,
  "the chip rides the ghost; the real token's own refreshes must not pull it back");

/* The cancel, which raises no `updateToken` at all — so `destroyToken` is
   the only hook that can hand the chip back to the real creature. */
token._preview = undefined;
fire("destroyToken", ghost);
flush();

assert.equal(chipOf(), first, "a cancelled drag must not delete the live chip");
assert.equal(added.get("arrive"), 1, "a cancelled drag is not an arrival either");
assert.equal(first.style.left, `${token.x}px`, "the chip comes back to the creature");

/* ══ 3 — a maximum moving is a rebuild, and a rebuild is silent ══════ */

actor.system.resources.hitPoints.max = 7;
fire("updateToken", { object: token });
flush();

const levelled = chipOf();
assert.ok(levelled, "a levelled creature still has a chip");
assert.notEqual(levelled, first, "a shape change rebuilds the markup");
assert.equal(added.get("arrive"), 1,
  "a shape change must not animate: the readout would blink every time a maximum moved");

/* ══ 4 — out of the fog is an appearance ═════════════════════════════
   The positive control. Without it this file passes just as happily on a
   component that has stopped animating altogether. */

game.user.isGM = false;
token.isVisible = false;
fire("sightRefresh");
flush();
assert.equal(chipOf(), null, "a creature this client cannot see gets no chip at all");

token.isVisible = true;
fire("sightRefresh");
flush();

const returned = chipOf();
assert.ok(returned, "a creature back in view gets a chip again");
assert.equal(added.get("arrive"), 2, "coming out of the fog is an appearance and animates");

console.log("token chip lifecycle: a drag, a rebuild and a return all behave");
