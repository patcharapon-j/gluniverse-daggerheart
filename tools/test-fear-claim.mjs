/**
 * The Fear a Fear outcome owes the pool, and the three ways it went missing.
 *
 * **That it is applied at all.** `CLAUDE.md` described `applyFear` on
 * `createChatMessage` as built, and five other subsystems cite it as the
 * precedent for their own active-GM write — and there was no
 * `createChatMessage` hook anywhere in the system. Every Fear outcome in
 * every session relied on a GM noticing a button. This is the regression
 * that ratchet exists for: it asserts the hook is registered, not merely
 * that a function with the right shape exists.
 *
 * **Who writes it.** The pool is a world setting, so only the active GM may
 * write it. Get it wrong in one direction and a table with two GMs banks two
 * Fear per roll; in the other, a player's client writes nothing and silently
 * believes it did.
 *
 * **Once.** The claim flag is the record, so a message that already carries
 * it is a message whose Fear has been banked — on reload, on a re-created
 * message, on anything that fires the hook twice.
 *
 * And which outcomes owe it: a reaction has no Hope and no Fear, and a
 * critical is its own rung with its own two claims. `claims` in `plate.ts`
 * draws that line and this holds it.
 *
 * Related, and deliberately not tested here: `rollOffMark` in `marked.ts`
 * used to gain a Fear by hand on a failed Mark roll, which is now this
 * hook's job. Two writers for one roll was two Fear.
 */

import assert from "node:assert/strict";

/* ── a Foundry, in the shape these functions actually use ─────────────── */

const SYS = "gluniverse-daggerheart";
const store = new Map([[`${SYS}.fear`, 0]]);

const gm = { id: "gm", isGM: true };
const otherGm = { id: "gm2", isGM: true };
const player = { id: "player", isGM: false };

globalThis.game = {
  settings: {
    get: (ns, key) => store.get(`${ns}.${key}`),
    set: async (ns, key, value) => void store.set(`${ns}.${key}`, value),
  },
  user: gm,
  users: { activeGM: gm },
  i18n: { lang: "en", localize: (k) => k, format: (k, d) => `${k}:${JSON.stringify(d)}` },
};

Math.clamp ??= (n, lo, hi) => Math.min(Math.max(n, lo), hi);

globalThis.CONST = { CHAT_MESSAGE_STYLES: { OTHER: 0 } };
globalThis.foundry = {
  utils: {
    escapeHTML: (s) => String(s),
    randomID: () => "id",
    getRoute: (p) => p,
    mergeObject: (a, b) => ({ ...a, ...b }),
  },
  applications: { api: {} },
};

/* The hook table, captured rather than stubbed: the bug was a handler that
   was never registered, so the registration is the thing under test. */
const hooks = new Map();
globalThis.Hooks = {
  on: (name, fn) => void hooks.set(name, [...(hooks.get(name) ?? []), fn]),
  once: () => {},
  callAll: () => {},
};

/** A chat message with flags that read and write by dotted path. */
const messageOf = (flags) => {
  const own = structuredClone(flags);
  return {
    id: "msg",
    flags: { [SYS]: own },
    getFlag: (ns, path) =>
      ns === SYS ? path.split(".").reduce((o, k) => o?.[k], own) : undefined,
    setFlag: async (ns, path, value) => {
      const keys = path.split(".");
      const last = keys.pop();
      let at = own;
      for (const k of keys) at = at[k] ??= {};
      at[last] = value;
    },
  };
};

const duality = (out, extra = {}) => ({ kind: "duality", plate: { out, ...extra } });

const { registerChat } = await import("../src/module/dice/chat.ts");

registerChat();

/* ── the hook exists ─────────────────────────────────────────────────── */

const created = hooks.get("createChatMessage") ?? [];
assert.equal(
  created.length,
  1,
  "no createChatMessage handler — a Fear outcome banks nothing, which is the bug this file was written for",
);
const applyFear = created[0];

/** Run the hook to completion and report the pool and the claim. */
const fire = async (message) => {
  await applyFear(message);
  // The handler is registered as a void call, so give its promise a turn.
  await new Promise((done) => setTimeout(done, 0));
  return { pool: store.get(`${SYS}.fear`), claimed: message.getFlag(SYS, "claimed.fear") };
};

const reset = () => void store.set(`${SYS}.fear`, 0);

/* ── a Fear outcome banks one, and says so ───────────────────────────── */

reset();
let r = await fire(messageOf(duality("fear")));
assert.equal(r.pool, 1, "a Fear outcome did not bank a Fear");
assert.equal(r.claimed, true, "the claim was not recorded, so the row still offers it");

/* ── and only once ───────────────────────────────────────────────────── */

reset();
const twice = messageOf(duality("fear"));
await fire(twice);
r = await fire(twice);
assert.equal(r.pool, 1, "the hook firing twice banked two Fear for one roll");

reset();
r = await fire(messageOf({ ...duality("fear"), claimed: { fear: true } }));
assert.equal(r.pool, 0, "a message that already carried the claim banked another Fear");

/* ── only the active GM writes ───────────────────────────────────────── */

for (const [who, label] of [
  [player, "a player's client"],
  [otherGm, "a second GM"],
]) {
  reset();
  game.user = who;
  r = await fire(messageOf(duality("fear")));
  assert.equal(r.pool, 0, `${label} wrote the pool`);
  assert.equal(r.claimed, undefined, `${label} recorded the claim`);
  game.user = gm;
}

/* ── which outcomes owe a Fear at all ────────────────────────────────── */

for (const [flags, why] of [
  [duality("hope"), "a Hope outcome"],
  [duality("crit"), "a critical, which has its own two claims"],
  [duality("fear", { rxn: true }), "a reaction, which has no Hope and no Fear"],
  [{ kind: "damage", plate: { out: "fear" } }, "a damage card"],
  [{ kind: "adversary", plate: { out: "fear" } }, "an adversary card"],
  [{ kind: "duality" }, "a message with no plate"],
]) {
  reset();
  r = await fire(messageOf(flags));
  assert.equal(r.pool, 0, `${why} banked a Fear`);
}

console.log(
  "fear claim: the createChatMessage hook is registered, the active GM alone banks it, once per message, and only a non-reaction Fear outcome owes one",
);
