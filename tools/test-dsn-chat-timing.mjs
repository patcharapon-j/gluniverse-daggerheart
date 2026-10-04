import assert from "node:assert/strict";

const hooks = new Map();
globalThis.Hooks = {
  once: (name, fn) => hooks.set(name, [...(hooks.get(name) ?? []), fn]),
  on: (name, fn) => hooks.set(name, [...(hooks.get(name) ?? []), fn]),
};
const fire = (name, ...args) => {
  for (const fn of hooks.get(name) ?? []) fn(...args);
};

const message = {
  getFlag: (system, key) => system === "gluniverse-daggerheart" && key === "kind" ? "duality" : null,
};
globalThis.game = {
  settings: { get: () => true },
  messages: new Map([["roll", message]]),
};
globalThis.foundry = { utils: { getRoute: (path) => `/${path}` } };

const { registerDice, waitFor3dDice } = await import("../src/module/dice/dsn.ts");
const { hold } = await import("../src/module/dice/arrival.ts");
registerDice();

assert.equal(waitFor3dDice("roll"), null, "a message Dice So Nice declined must not wait");
fire("diceSoNiceMessageProcessed", "roll", { willTrigger3DRoll: true });
const settled = waitFor3dDice("roll");
assert.ok(settled instanceof Promise, "an accepted 3D roll must expose its completion");

const classes = new Set();
const classList = {
  add: (...names) => names.forEach((name) => classes.add(name)),
  remove: (...names) => names.forEach((name) => classes.delete(name)),
};
const face = { textContent: "9", parentElement: { dataset: { mx: "12" } } };
const total = { textContent: "17" };
const plate = {
  dataset: {},
  classList,
  offsetWidth: 100,
  querySelector: (selector) => selector === ".pl-num" ? total : null,
  querySelectorAll: () => [face],
  insertAdjacentHTML() {},
};

/* `spin` picks a face at random inside the die's own range, so "the face was
   scrambled" cannot be asserted as "the face is not 9": one run in twelve
   scrambles a d12 to the number it already showed and the gate fails for no
   reason. Pinning Math.random keeps the assertion the one that was meant —
   spin ran, and it rewrote the face — without weakening it to a range check,
   which "9" would pass even if spin never ran at all. */
const random = Math.random;
Math.random = () => 0;

hold(plate, settled);
assert.ok(classes.has("veil"), "the chat result must be veiled while 3D dice roll");
assert.ok(classes.has("rolling"));
assert.equal(face.textContent, "1", "the die must tumble inside its own range while it rolls");
Math.random = random;
assert.equal(total.textContent, "·");
assert.ok(!classes.has("play"), "a reroll must not replay the whole card arrival");

fire("diceSoNiceRollComplete", "another-message");
await Promise.resolve();
assert.ok(classes.has("veil"), "another message's dice must not reveal this result");

fire("diceSoNiceRollComplete", "roll");
await settled;
await Promise.resolve();
assert.equal(face.textContent, "9");
assert.equal(total.textContent, "17");
assert.ok(classes.has("land"));
assert.ok(!classes.has("veil"));
assert.equal(waitFor3dDice("roll"), null);

console.log("dsn chat timing: card results land on the matching 3D roll completion");
