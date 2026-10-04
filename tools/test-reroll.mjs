import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* The real lang file. The plate builders resolve every visible string through
   `DAGGERHEART.Plate.*`, and `rebuild` runs them — so a harness that echoed
   the key would rebuild a card made of keys. */
const en = JSON.parse(readFileSync(new URL("../lang/en.json", import.meta.url), "utf8"));
const localize = (key) => key.split(".").reduce((o, k) => o?.[k], en) ?? key;
const format = (key, data = {}) =>
  String(localize(key)).replace(/\{(\w+)\}/g, (_, name) => data[name] ?? "");

const SYSTEM_ID = "gluniverse-daggerheart";
const hooks = new Map();
globalThis.Hooks = {
  once: (name, fn) => hooks.set(name, fn),
  on: (name, fn) => hooks.set(name, fn),
};
globalThis.foundry = {
  utils: { deepClone: structuredClone, getRoute: (path) => `/${path}`, escapeHTML: (value) => String(value) },
};
globalThis.ui = { notifications: { warn() {} } };
let enabled = true;
let animations = [];
globalThis.game = {
  user: { id: "roller" },
  i18n: { localize, format },
  settings: { get: () => enabled },
  messages: new Map(),
  dice3d: { showForRoll: async (roll) => { animations.push(roll); } },
};
globalThis.Roll = class {
  constructor(formula) {
    this.formula = formula;
    this.dice = [{ faces: Number(formula.slice(2)), options: {}, results: [{ result: 5 }] }];
  }
  async evaluate() { return this; }
};

const { rerollDie } = await import("../src/module/dice/reroll.ts");
const { registerDice } = await import("../src/module/dice/dsn.ts");
registerDice();

const cases = [
  ["duality", "h", { h: 2, f: 3, out: "fear", dc: null, hit: false }, 8],
  ["damage", "dmg:0:0", { n: 2, die: "d6", rolls: [2, 3], dtype: "physical" }, 8],
  ["adversary", "d20:0", { d20: [2], dc: null, hit: false }, 5],
];

for (const setting of [true, false]) {
  enabled = setting;
  for (const [kind, key, dice, total] of cases) {
    animations = [];
    const original = new Roll("1d6");
    const flags = { kind, plate: { who: "Tester", label: "Test", mods: [], total: 5, ...structuredClone(dice) } };
    const message = {
      id: "test", rolls: [original], updates: 0,
      canUserModify: () => true,
      getFlag: (_system, key) => flags[key],
      async update(data) {
        this.updates++;
        // Model DSN's update integration: only appended rolls are animated.
        const appended = data.rolls.slice(this.rolls.length);
        this.rolls = data.rolls;
        flags.plate = data[`flags.${SYSTEM_ID}.plate`];
        this.content = data.content;
        const ctx = { willTrigger3DRoll: true };
        hooks.get("diceSoNiceMessagePreProcess")(this.id, ctx);
        if (ctx.willTrigger3DRoll) {
          for (const roll of appended) await game.dice3d.showForRoll(roll);
        }
      },
    };
    game.messages.set(message.id, message);
    assert.equal(await rerollDie(message, key), true);
    assert.equal(animations.length, enabled ? 1 : 0, `${kind}: one animation per reroll when enabled`);
    assert.equal(message.updates, 1);
    assert.equal(message.rolls.length, 2);
    assert.equal(message.rolls[0], original);
    assert.deepEqual(flags.plate.rr[key], [2]);
    assert.equal(flags.plate.total, total);
    assert.match(message.content, /data-rr=/);
    if (enabled) assert.equal(animations[0], message.rolls[1]);

    assert.equal(await rerollDie(message, key), true);
    assert.equal(animations.length, enabled ? 2 : 0);
    assert.deepEqual(flags.plate.rr[key], [2, 5]);
    assert.equal(message.rolls.length, 3);

    flags.claimed = { damage: true };
    assert.equal(await rerollDie(message, key), false);
    assert.equal(message.updates, 2);
  }
}

/* The adversary rail, which a reroll can now move.
 *
 * `settle` has always recomputed the foe plate's `hit`, and it was
 * unobservable while every adversary attack carried `dc: null` — the card had
 * one appearance and nothing could change it. Now `hit` is what lights the
 * rail, so a d20 rerolled across the target's Evasion has to redraw the card
 * as the other outcome, and a reroll that stays on the same side of it must
 * not. */
const railCase = async (dc, { hit, cls }) => {
  const flags = {
    kind: "adversary",
    plate: { who: "Jagged Knife", label: "Slash", mods: [], total: 2, d20: [2], dc, hit: false },
  };
  const message = {
    id: "rail", rolls: [new Roll("1d20")],
    canUserModify: () => true,
    getFlag: (_system, key) => flags[key],
    async update(data) {
      this.rolls = data.rolls;
      flags.plate = data[`flags.${SYSTEM_ID}.plate`];
      this.content = data.content;
    },
  };
  game.messages.set(message.id, message);
  assert.equal(await rerollDie(message, "d20:0"), true);
  // The mock die always lands on 5, so the reroll takes the d20 from 2 to 5.
  assert.equal(flags.plate.total, 5);
  assert.equal(flags.plate.hit, hit, `vs ${dc}: the reroll did not resettle the verdict`);
  assert.match(message.content, new RegExp(`class="pl g1 ${cls} o1"`), `vs ${dc}: the rail did not redraw`);
};

await railCase(4, { hit: true, cls: "hit" });
await railCase(9, { hit: false, cls: "cold" });
await railCase(null, { hit: false, cls: "cold" });

console.log(
  "reroll: one animation per appended die, settings and roll history preserved, and the adversary rail resettles across the target number",
);
