/**
 * The Martial Artist's stances and the Brawler's Combo Strike, as behaviour.
 *
 * `test-activity-log.mjs`'s idiom: a stub Foundry in the shape these functions
 * actually use. What it ratchets is the set of things that fail silently —
 * every one of them renders a perfectly good sheet while being wrong:
 *
 *   1. a stance's modifiers are live only while it is the active stance, and a
 *      legacy copy with no authored modifiers gets them through the same gate;
 *   2. a feature that merely *shares* a stance's name gets nothing;
 *   3. shifting pays Focus first, Stress only under Flow State, refuses when
 *      neither can pay, and writes the payment and the stance in one update;
 *   4. Severe damage, the last Hit Point and the scene end each drop it;
 *   5. the combo chain stops on the first *lower* roll, ties continue, and the
 *      lower die counts;
 *   6. the combo is offered only on Melee, adds to the plate's total, draws its
 *      dice with no reroll handle, and refuses once the damage is applied;
 *   7. Focus is a currency card actions can charge.
 *
 * Negative-controlled: making `passiveItemActive` answer true for every stance
 * fails (1); dropping the `face < previous` break fails (5).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const en = JSON.parse(readFileSync(new URL("../lang/en.json", import.meta.url), "utf8"));
const localize = (key) => key.split(".").reduce((o, k) => o?.[k], en) ?? key;
const format = (key, data = {}) =>
  String(localize(key)).replace(/\{(\w+)\}/g, (_, name) => data[name] ?? "");

const SYSTEM_ID = "gluniverse-daggerheart";
const hooks = new Map();
globalThis.Hooks = {
  once: (name, fn) => hooks.set(name, fn),
  on: (name, fn) => hooks.set(name, fn),
  callAll() {},
};
globalThis.foundry = {
  utils: { deepClone: structuredClone, getRoute: (path) => `/${path}`, escapeHTML: (v) => String(v) },
};
const notes = [];
globalThis.ui = { notifications: { warn: (m) => notes.push(m), info: (m) => notes.push(m) } };
const me = { id: "u1", active: true };
globalThis.game = {
  user: me,
  users: [me],
  i18n: { localize, format },
  settings: { get: () => true },
  messages: new Map(),
};

/* A Roll whose faces come off a queue, so a chain can be scripted. */
let faces = [];
globalThis.Roll = class {
  constructor(formula) {
    this.formula = formula;
    const f = faces.length ? faces.shift() : 1;
    this.total = f;
    this.dice = [{ faces: Number(String(formula).replace(/^\d*d/, "")), options: {}, results: [{ result: f }] }];
  }
  async evaluate() { return this; }
};

const { activeModifiers, modifierTotal } = await import("../src/module/data/modifiers.ts");
const stances = await import("../src/module/stances.ts");
stances.registerStances();
const { comboOffer, comboDieOf, rollComboChain, strikeCombo } = await import("../src/module/combo.ts");
const { damagePlate } = await import("../src/module/dice/plate.ts");
const { rewritePlate } = await import("../src/module/dice/reroll.ts");
const { ACTION_AMOUNTS } = await import("../src/module/config.ts");

/* ── a stub character ─────────────────────────────────────────────────── */

function makeActor({ flow = false, focus = 2, stress = 0, hp = 0 } = {}) {
  const items = [];
  const actor = {
    type: "character",
    name: "Bex",
    documentName: "Actor",
    isOwner: true,
    testUserPermission: () => true,
    updates: [],
    system: {
      stance: "",
      tier: 1,
      resources: {
        focus: { value: focus, max: 6 },
        stress: { marked: stress, max: 6 },
        hitPoints: { marked: hp, max: 6 },
        hope: { value: 2, max: 6 },
      },
    },
    items: Object.assign(items, { get: (id) => items.find((i) => i.id === id) }),
    async update(data) {
      this.updates.push(data);
      for (const [k, v] of Object.entries(data)) {
        const path = k.replace(/^system\./, "").split(".");
        let o = this.system;
        while (path.length > 1) o = o[path.shift()];
        o[path[0]] = v;
      }
    },
  };
  const stance = (id, name, modifiers = []) => ({
    id, name, type: "feature", parent: actor,
    system: { origin: "Martial Stance · Tier 1", modifiers, description: "" },
  });
  items.push(
    stance("rel", "Reliable", [{ target: "attackRoll", value: 1, source: "fixed", condition: "always" }]),
    stance("anc", "Anchored"), // a legacy copy: no authored modifiers
    { id: "agg", name: "Aggressive", type: "feature", parent: actor, system: { origin: "Adversary", modifiers: [] } },
    {
      id: "cls", name: "Brawler", type: "class", parent: actor,
      system: {
        classFeatures: [{ name: "Combo Strike" }],
        dice: [{ name: "Combo Die", faces: 6, dice: [] }],
      },
    },
  );
  if (flow) {
    items.push({ id: "mas", name: "Martial Artist: Mastery", type: "subclass", parent: actor,
      system: { features: [{ name: "Flow State" }] } });
  }
  return actor;
}

/* ── 1 & 2: the gate ──────────────────────────────────────────────────── */
{
  const a = makeActor();
  assert.equal(modifierTotal(a, "attackRoll"), 0, "no stance, no Reliable");
  assert.equal(modifierTotal(a, "thresholds"), 0, "no stance, no Anchored");
  a.system.stance = "rel";
  assert.equal(modifierTotal(a, "attackRoll"), 1, "Reliable live while in it");
  assert.equal(modifierTotal(a, "thresholds"), 0, "only one stance at a time");
  a.system.stance = "anc";
  assert.equal(modifierTotal(a, "attackRoll"), 0, "Reliable off once shifted away");
  assert.equal(modifierTotal(a, "thresholds"), 2, "legacy Anchored copy gets +2 through the gate");
  assert.equal(modifierTotal(a, "evasion"), 0, "an adversary feature called Aggressive is not a stance");
  assert.ok(!activeModifiers(a).some((m) => m.item.id === "agg"));
}

/* ── 3: shifting ──────────────────────────────────────────────────────── */
{
  const a = makeActor({ focus: 1 });
  assert.equal(stances.stancePayer(a), "focus");
  a.system.resources.focus.value = 0;
  assert.equal(stances.stancePayer(a), null, "no Focus and no Flow State: nobody pays");
  const f = makeActor({ focus: 0, flow: true });
  assert.equal(stances.stancePayer(f), "stress", "Flow State: Stress pays when Focus is out");
  f.system.resources.stress.marked = 6;
  assert.equal(stances.stancePayer(f), null, "a full Stress track cannot pay either");
  const g = makeActor({ focus: 3, flow: true });
  assert.equal(stances.stancePayer(g, "stress"), "stress", "shift-click asks for the Stress");
  assert.deepEqual(stances.knownStances(g).map((s) => s.id).sort(), ["anc", "rel"]);
}

/* ── 4: dropping ──────────────────────────────────────────────────────── */
{
  const a = makeActor();
  a.system.stance = "rel";
  hooks.get("updateActor")(a, { system: { resources: { hitPoints: { marked: 3 } } } });
  await new Promise((r) => setTimeout(r));
  assert.equal(a.system.stance, "rel", "a Hit Point that is not the last keeps the stance");
  a.system.resources.hitPoints.marked = 6;
  hooks.get("updateActor")(a, { system: { resources: { hitPoints: { marked: 6 } } } });
  await new Promise((r) => setTimeout(r));
  assert.equal(a.system.stance, "", "the last Hit Point drops it");

  a.system.stance = "anc";
  assert.equal((await stances.dropStance(a, "severe"))?.id, "anc");
  assert.equal(a.system.stance, "");
  assert.equal(await stances.dropStance(a, "scene"), null, "nothing to drop is a no-op");
}

/* ── 5: the chain ─────────────────────────────────────────────────────── */
{
  faces = [2, 2, 4, 1, 6];
  const { faces: got } = await rollComboChain("d4");
  assert.deepEqual(got, [2, 2, 4, 1], "ties continue, a lower roll ends it and counts");
  faces = [3, 1];
  assert.deepEqual((await rollComboChain("d4")).faces, [3, 1]);
}

/* ── 6: the plate ─────────────────────────────────────────────────────── */
{
  const a = makeActor({ flow: true });
  assert.equal(comboDieOf(a), "d6", "the tray's size, as the item sheet set it");
  assert.equal(comboOffer(a, { system: { range: "far" } }), null, "not offered at range");
  assert.deepEqual(comboOffer(a, { system: { range: "melee" } }), { die: "d6", focus: true });

  const flags = {
    kind: "damage",
    claimed: {},
    plate: { who: "Bex", label: "Fists", mods: [], n: 2, die: "d8", rolls: [3, 5], total: 8, dtype: "physical", cmb: "d6" },
  };
  const message = {
    rolls: [],
    getFlag: (_s, k) => flags[k],
    async update(data) {
      this.rolls = data.rolls;
      this.content = data.content;
      flags.plate = data[`flags.${SYSTEM_ID}.plate`];
    },
  };
  const html = damagePlate(flags.plate);
  assert.match(html, /data-dh-act="combo-strike"/, "offered on the card");
  assert.doesNotMatch(html, /combo-strike-focus/, "no Focus button without Flow State on the plate");

  const claim = async (k) => (flags.claimed[k] ? false : (flags.claimed[k] = true));
  faces = [4, 5, 2];
  /* One die at a time: every write carries exactly one new die, and the
     chain waits (`pace`) between throws but not after the one that broke. */
  const writes = [];
  let paced = 0;
  const refused = await strikeCombo(
    message, a, "stress", claim,
    async (p, r) => {
      writes.push({ dice: r.length, rolls: [...p.combo.rolls], live: !!p.combo.live, paced });
      await rewritePlate(message, p, r);
    },
    async () => { paced++; },
  );
  assert.equal(refused, null);
  assert.deepEqual(
    writes,
    [
      { dice: 1, rolls: [4], live: true, paced: 0 },
      { dice: 1, rolls: [4, 5], live: true, paced: 1 },
      { dice: 1, rolls: [4, 5, 2], live: false, paced: 2 },
    ],
    "the chain is written die by die, live until it breaks",
  );
  assert.equal(paced, 2, "no wait after the die that broke the chain");
  assert.equal(a.system.resources.stress.marked, 1, "a Stress marked");
  assert.deepEqual(flags.plate.combo, { die: "d6", rolls: [4, 5, 2] });
  assert.equal(flags.plate.total, 8 + 11, "the combo adds to the total Apply lands");
  assert.equal(message.rolls.length, 3, "one real Roll per combo die");
  const combo = message.content.slice(message.content.lastIndexOf('<span class="op">+</span>'));
  assert.doesNotMatch(combo, /data-rr/, "combo dice carry no reroll handle");

  assert.equal(await strikeCombo(message, a, "stress", claim, async () => {}), "AlreadyClaimed", "once");

  const b = makeActor();
  const settled = { ...flags, claimed: { applied: true }, plate: { ...flags.plate, combo: undefined } };
  const m2 = { getFlag: (_s, k) => settled[k] };
  assert.equal(await strikeCombo(m2, b, "stress", claim, async () => {}), "RollSettled", "too late once applied");
  const nf = { ...flags, claimed: {}, plate: { ...flags.plate, combo: undefined } };
  const m3 = { getFlag: (_s, k) => nf[k] };
  assert.equal(await strikeCombo(m3, b, "focus", claim, async () => {}), "CannotPay", "Focus needs Flow State");
}

/* ── 7: the currency ──────────────────────────────────────────────────── */
assert.ok(ACTION_AMOUNTS.includes("focus"), "Focus is an action currency");

console.log("stances: gated passives, shifting, three drops, the combo chain and its plate, Focus as a currency.");
