import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  REDUCE_RX,
  REST_RX,
  rechargeOnly,
  rulesAbout,
  rulesAtTopLevel,
} from "../src/module/apps/rules.ts";
import { FEAR_HUD } from "../src/module/ui/pool.js";

globalThis.Item = class {};
const { restScopes, restWillRefreshDice } = await import("../src/module/documents/item.ts");

const item = (id, type, name, system = {}) => ({ id, type, name, system });

const elf = item("elf", "ancestry", "Elf", {
  topFeature: {
    name: "Quick Reactions",
    description: "When you would take damage, mark a Stress to reduce the damage by 1d8.",
  },
  bottomFeature: {
    name: "Celestial Trance",
    description: "During a rest, choose an additional downtime move.",
  },
});
const actor = { items: [elf] };

const damage = rulesAtTopLevel(actor, rulesAbout(actor, REDUCE_RX));
assert.equal(damage.length, 1, "a matching child feature should produce one owning card");
assert.equal(damage[0].name, "Elf");
assert.equal(damage[0].itemId, "elf");

const resting = rulesAtTopLevel(actor, rulesAbout(actor, REST_RX));
assert.equal(resting.length, 1, "a multi-feature item should appear once in the rest dialog");
assert.equal(resting[0].name, "Elf");

assert.equal(REDUCE_RX.test("Gain a +1 bonus to your Armor Score."), false);
assert.equal(REDUCE_RX.test("Your damage thresholds are equal to your level."), false);
assert.equal(REDUCE_RX.test("Reduce damage thresholds by 1."), false);
assert.equal(REDUCE_RX.test("When you deal damage, gain a Hope."), false);
assert.equal(REDUCE_RX.test("Reduce the damage by 1d8."), true);
assert.equal(REDUCE_RX.test("When you take physical damage, you may mark a Stress instead."), true);

assert.equal(rechargeOnly("Once per rest, mark a Stress to sprint."), true);
assert.equal(rechargeOnly("This lasts until your next rest."), true);
assert.equal(rechargeOnly("During a rest, choose an additional downtime move."), false);

const many = {
  items: [item("heritage", "transformation", "Vampire", {
    features: [
      { name: "Mist", description: "Once per rest, become mist." },
      { name: "Bite", description: "Twice per rest, empower your bite." },
    ],
  })],
};
const rechargeCards = rulesAtTopLevel(
  many,
  rulesAbout(many, REST_RX).filter((rule) => rechargeOnly(rule.text)),
);
assert.equal(rechargeCards.length, 1, "recharge receipts should show one owning card");
assert.equal(rechargeCards[0].name, "Vampire");

assert.deepEqual(restScopes("short"), ["rest", "shortRest"]);
assert.deepEqual(restScopes("long"), ["rest", "longRest"]);

const pool = (name, dice) => ({
  name,
  mode: "bag",
  faces: 6,
  dice,
  max: { kind: "fixed", n: 3, trait: "", floor: 0 },
  refresh: "rest",
  onRefresh: "clear",
});
const poolsActor = {
  items: [item("pools", "domainCard", "Pools", { dice: [pool("Empty", []), pool("Spent", [4])] })],
};
assert.deepEqual(
  restWillRefreshDice(poolsActor, "short").map((entry) => entry.pool.name),
  ["Spent"],
  "the rest preview should include only die pools that will change",
);

const gmHud = FEAR_HUD({ gm: true });
assert.match(gmHud, /data-refresh="scene"/);
assert.match(gmHud, /data-refresh="session"/);
assert.doesNotMatch(FEAR_HUD({ gm: false }), /data-refresh=/);

/* The view switch, and what it asserts is the division rather than the markup.
   The two refresh scopes reach every character at the table, so they are the
   GM's; the switch is what THIS screen draws, backed by a client-scoped
   setting, so it is on the players' strip too. Getting that backwards is not
   a visible bug — a player simply never discovers the control exists and
   assumes the rings are compulsory — so it is asserted rather than left to
   whoever next edits the `gm` ternary they both sit near. */
assert.match(FEAR_HUD({ gm: false }), /data-chip/, "players get the view switch");
assert.match(gmHud, /data-chip/, "and so does the GM");

/* It carries a state, and the state is `aria-pressed` in both directions —
   the accessible name and the styling hook at once, which is only one source
   of truth if the builder actually writes both values. */
assert.match(FEAR_HUD({ chips: true }), /data-chip aria-pressed="true"/s);
assert.match(FEAR_HUD({ chips: false }), /data-chip aria-pressed="false"/s);

const poolCss = readFileSync(new URL("../styles/pool.css", import.meta.url), "utf8");
assert.doesNotMatch(poolCss, /\.dh\.hud\.gm\{padding-bottom/);
assert.match(poolCss, /\.dh\.hud \.cyc\{[^}]*bottom:-21px/s);
/* Both plinths on the same line, and on opposite sides. They are two groups
   telling the reader whose the controls are, which only works if they do not
   drift apart or collide. */
assert.match(poolCss, /\.dh\.hud \.vis\{[^}]*left:12px;bottom:-21px/s);
assert.match(poolCss, /\.dh\.hud \.cyc\{[^}]*right:12px;bottom:-21px/s);
/* And the button floor, which this strip has now paid for twice. */
assert.match(poolCss, /\.dh\.hud \.vis button\{[^}]*min-height:14px/s);

console.log(
  "rest context: top-level cards, mitigation filters, refresh scopes, " +
    "the view switch and GM HUD controls covered",
);
