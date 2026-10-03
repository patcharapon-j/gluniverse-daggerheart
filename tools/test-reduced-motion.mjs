/**
 * What a reader who asked for stillness is shown.
 *
 * `plate.css`'s veil block has always described this case — "a client that
 * never runs the arrival ... a reader on reduced motion ... never wears the
 * veil at all and sees the finished card immediately" — and nothing
 * implemented it. The single `prefers-reduced-motion` block in the stylesheet
 * turned off one thing, the reroll die's hover transform, while nine
 * animations and a four hundred millisecond tumble ran regardless.
 *
 * The tumble is the half that CSS cannot reach: it is written into the
 * markup by `arrival.ts`, so a card on a still client has to be landed
 * rather than merely un-animated. This holds that, and holds that everyone
 * else still gets the arrival.
 */

import assert from "node:assert/strict";

const SYSTEM_ID = "gluniverse-daggerheart";

let reduce = false;
globalThis.matchMedia = (q) => ({ matches: reduce && /reduce/.test(q) });

/** Only what the render hook and the arrival actually touch. */
const classList = (set) => ({
  add: (...names) => names.forEach((n) => set.add(n)),
  remove: (...names) => names.forEach((n) => set.delete(n)),
  contains: (n) => set.has(n),
  has: (n) => set.has(n),
});

class El {
  constructor() {
    this.classes = new Set();
    this.classList = classList(this.classes);
    this.dataset = {};
    this.offsetWidth = 1;
  }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  insertAdjacentHTML() {}
}

const hooks = new Map();
globalThis.Hooks = {
  on: (name, fn) => void hooks.set(name, [...(hooks.get(name) ?? []), fn]),
  once: () => {},
  callAll: () => {},
};
globalThis.game = {
  settings: { get: () => 0, set: async () => {} },
  user: { isGM: true },
  users: {},
  i18n: { localize: (k) => k, format: (k) => k },
};
globalThis.CONST = { CHAT_MESSAGE_STYLES: { OTHER: 0 } };
globalThis.foundry = {
  utils: { escapeHTML: (s) => String(s), randomID: () => "x", getRoute: (p) => p, mergeObject: (a, b) => ({ ...a, ...b }) },
  applications: { api: {} },
};
globalThis.ui = { notifications: { warn() {}, info() {} } };

const { registerChat } = await import("../src/module/dice/chat.ts");
registerChat();

/* The plate hook is the second `renderChatMessageHTML` handler: the first
   draws posted cards, which are not plates. */
const render = hooks.get("renderChatMessageHTML")[1];

const draw = () => {
  const plate = new El();
  const html = { querySelector: (sel) => (sel.includes(".pl") ? plate : null) };
  const message = {
    id: `m${Math.random()}`,
    timestamp: Date.now(),
    canUserModify: () => false,
    getFlag: () => undefined,
  };
  render(message, html);
  return plate;
};

/* ── stillness: the settled card, immediately ────────────────────────── */

reduce = true;
let plate = draw();
assert.ok(plate.classes.has("land"), "a still client was not handed the landed card");
assert.ok(!plate.classes.has("veil"), "a still client was shown the veil");
assert.ok(!plate.classes.has("play"), "a still client was given the arrival");
assert.ok(!plate.classes.has("rolling"), "a still client was given the tumble");

/* ── and everybody else still gets it ────────────────────────────────── */

reduce = false;
plate = draw();
assert.ok(plate.classes.has("play"), "the arrival stopped playing for everyone");
assert.ok(plate.classes.has("veil"), "the card arrived already wearing its answer");

/* ── read per render, not cached once at load ────────────────────────── */

reduce = true;
assert.ok(draw().classes.has("land"), "the preference was cached, so turning it on mid-session did nothing");
reduce = false;
assert.ok(draw().classes.has("play"), "the preference was cached, so turning it off mid-session did nothing");

console.log("reduced motion: a still client is handed the settled card, everyone else keeps the arrival, and the preference is read every time");
