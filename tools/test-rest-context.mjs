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

/* And the second one, on the same plinth and by the same argument: a range
   ruler is drawn from a *selection*, which only ever exists on one screen, so
   there is no permission question and therefore no world setting. Asserted
   beside the first rather than folded into it, because the two settings are
   independent and the failure that matters is one press moving both. */
assert.match(FEAR_HUD({ gm: false }), /data-ruler/, "players get the ruler switch too");
assert.match(gmHud, /data-ruler/, "and so does the GM");

/* Each carries a state, and the state is `aria-pressed` in both directions —
   the accessible name and the styling hook at once, which is only one source
   of truth if the builder actually writes both values. */
assert.match(FEAR_HUD({ chips: true }), /data-chip aria-pressed="true"/s);
assert.match(FEAR_HUD({ chips: false }), /data-chip aria-pressed="false"/s);
assert.match(FEAR_HUD({ ruler: true }), /data-ruler aria-pressed="true"/s);
assert.match(FEAR_HUD({ ruler: false }), /data-ruler aria-pressed="false"/s);

/* The two do not move together. `chips:false, ruler:true` has to draw one off
   and one on — which is the whole reason they are two settings, and exactly
   what a shared `on` parameter or a single delegated handler keyed on the
   wrong attribute would silently break. */
const mixed = FEAR_HUD({ chips: false, ruler: true });
assert.match(mixed, /data-chip aria-pressed="false"/s, "the chips switch reads its own value");
assert.match(mixed, /data-ruler aria-pressed="true"/s, "and so does the ruler switch");

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
/* Two switches on one plinth need a gap, or they read as one wide control
   with a word in the middle of it. */
assert.match(poolCss, /\.dh\.hud \.vis\{[^}]*gap:3px/s);

/* The ruler's stylesheet has to be *registered*, and that is the failure this
   repo has shipped before: Foundry reads the `styles` array once at server
   start, so a component whose CSS is ported and unlisted lands unstyled and
   looks like a broken component rather than a missing line. */
const manifest = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
assert.ok(manifest.styles.includes("styles/ruler.css"), "system.json declares the ruler stylesheet");

/* The port rewrites the ruler's root to a compound, exactly as it does the
   chip's — it is drawn on the board, outside every `.dh` root. And the root is
   spelled in full rather than shortened, because the rewrite list is global
   and the short form is a substring of card.css's own rules block: this
   asserts the collateral damage did not happen. */
const rulerCss = readFileSync(new URL("../styles/ruler.css", import.meta.url), "utf8");
assert.match(rulerCss, /\.dh\.ruler\{/, "the ruler root is a compound");
assert.match(rulerCss, /\.dh\.ruler-layer\{/, "and so is its layer");
const cardCss = readFileSync(new URL("../styles/card.css", import.meta.url), "utf8");
assert.doesNotMatch(cardCss, /\.dh\.rules/, "the rewrite did not reach card.css");

console.log(
  "rest context: top-level cards, mitigation filters, refresh scopes, " +
    "the two view switches and GM HUD controls covered",
);
