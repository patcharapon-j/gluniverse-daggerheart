/**
 * Who a damage card says it lands on.
 *
 * The card named nobody. It stated a number and offered to apply it, and the
 * one question anybody asks between those two things — to whom? — was
 * answered only by pressing the button and reading the toast afterwards.
 *
 * What is ratcheted:
 *
 * **It names the people the button would actually hit.** `damageRecipients`
 * is the press's own resolver and this calls it, so the forecast and the
 * press cannot disagree about who they mean. For a GM that is selection; for
 * a player it is their assigned character, which is the half of that function
 * that exists because reading the attack reticle applied damage to the wrong
 * side of the exchange.
 *
 * **It claims nothing else.** No severity, no Hit Points. `design/plate.js`
 * records that a damage plate stops at the number because thresholds, armour,
 * resistance and immunity do not live on it — and three of those four are
 * chosen in the dialog the button opens, after the card was drawn. A severity
 * printed here would be the pre-armour one.
 *
 * **Two names, then a count**, and nothing at all when there is nobody.
 */

import assert from "node:assert/strict";

globalThis.Math.clamp ??= (value, min, max) => Math.min(max, Math.max(min, value));
globalThis.CONST = { CHAT_MESSAGE_STYLES: { OTHER: 0 } };
globalThis.Hooks = { callAll: () => {} };

let controlled = [];
let character = null;
let isGM = true;

globalThis.game = {
  settings: { get: (_s, key) => (key === "diceSoNice" ? false : 0), set: async () => {} },
  get user() {
    return { isGM, name: "Tester", targets: new Set(), character };
  },
  i18n: { format: (key) => key },
};
globalThis.canvas = { get tokens() { return { controlled }; } };
globalThis.foundry = {
  utils: {
    getRoute: (path) => `/${path}`,
    escapeHTML: (value) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;"),
  },
};
globalThis.ChatMessage = {
  getSpeaker: () => ({}),
  create: async (data) => data,
  getWhisperRecipients: () => [],
};

class TestRoll {
  constructor(formula) {
    this.formula = formula;
    this.total = 14;
    this.dice = [{ faces: 8, results: [{ result: 6 }, { result: 5 }], options: {} }];
  }
  async evaluate() { return this; }
}
globalThis.Roll = TestRoll;

const { rollDamage } = await import("../src/module/dice/rolls.ts");

const token = (name, i) => ({ actor: { name, uuid: `Actor.${i}`, isOwner: true } });
const select = (...names) => void (controlled = names.map(token));

const roll = () =>
  rollDamage({ actor: { name: "Tabby" }, label: "Hammer", count: 2, die: "d8", damageType: "physical" });

const plateOf = (r) => r.message.flags["gluniverse-daggerheart"].plate;
const line = (r) => r.message.content.match(/<div class="dmg-tgt">.*?<\/div>/s)?.[0] ?? "";

/* ── a GM names what they selected ───────────────────────────────────── */

select("Bramblewolf");
let r = await roll();
assert.deepEqual(plateOf(r).tgt, [{ n: "Bramblewolf" }], "one selected token was not named");
assert.match(line(r), /Bramblewolf/);

select("Bramblewolf", "Jagged Knife");
r = await roll();
assert.equal(plateOf(r).tgt.length, 2);
assert.match(line(r), /Bramblewolf/);
assert.match(line(r), /Jagged Knife/);
assert.doesNotMatch(line(r), /\+\d/, "two names should not also carry a count");

/* ── two names, then a count ─────────────────────────────────────────── */

select("Bramblewolf", "Jagged Knife", "Ribbet Bandit", "Cliff", "Tabby");
r = await roll();
assert.equal(plateOf(r).tgt.length, 5, "the plate records everyone, and the line is what abbreviates");
assert.match(line(r), /\+3<\/s>/, "five recipients did not summarise as two and a count");
assert.doesNotMatch(line(r), /Ribbet Bandit/, "a third name was drawn, which only fits by ellipsing all three");

/* ── nobody ──────────────────────────────────────────────────────────── */

select();
r = await roll();
assert.equal(plateOf(r).tgt, undefined, "an empty list was stored rather than left absent");
assert.equal(line(r), "", "a card with nobody to hit drew the line anyway");

/* ── a player gets their own character, not the reticle ──────────────── */

isGM = false;
character = { name: "Tabby", uuid: "Actor.tabby", isOwner: true };
select("Bramblewolf");
r = await roll();
assert.deepEqual(
  plateOf(r).tgt,
  [{ n: "Tabby" }],
  "a player's damage card named the thing they had selected instead of their own character",
);
isGM = true;
character = null;

/* ── and the card still claims nothing about what the number becomes ─── */

select("Bramblewolf");
r = await roll();
for (const word of ["minor", "major", "severe", "massive", "hit point"]) {
  assert.doesNotMatch(
    r.message.content.toLowerCase(),
    new RegExp(word),
    `the card forecast "${word}", which it cannot know before the dialog spends armour`,
  );
}

/* ── names are escaped, like every other name on a plate ─────────────── */

select('Bramble<script>"wolf"');
r = await roll();
assert.doesNotMatch(line(r), /<script>/, "a token name went into the card unescaped");

console.log(
  "damage card: it names the recipients the button would hit, two then a count, and forecasts nothing about them",
);
