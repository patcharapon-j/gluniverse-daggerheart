/**
 * The bottom HUD's two pure halves: what counts as a redraw, and where a card
 * lands when it moves.
 *
 * Both fail invisibly. A value mistaken for shape is a rail that rebuilds on
 * every mark, so every box's landing animation replays and the GM's foe cards
 * flash under the pointer. A shape mistaken for value is a number that never
 * moves: a levelled character keeps last level's Hit Point count. Neither
 * throws and both draw something plausible, so the boundary is asserted here
 * rather than trusted. The adversary-ordering bug — `placeables` is z-order,
 * so controlling a token re-sorted the foe list and every HP change read as a
 * shape change — was caught in a live Foundry, and the last block below is
 * that finding held as arithmetic.
 *
 * `planPlace` moved out of `CharacterSheet.svelte` when the HUD became its
 * second caller, so the sheet's rules about a loadout's order are asserted
 * once, on the module both of them now call.
 */

import assert from "node:assert/strict";
import { liveOf, shapeOf, tookHit, canAct, pressBox } from "../src/module/bottom-hud-shape.ts";
import { planPlace, canPayRecall } from "../src/module/loadout.ts";

let n = 0;
const ok = (name, fn) => {
  fn();
  n++;
  console.log(`  ✓ ${name}`);
};
const clone = (o) => JSON.parse(JSON.stringify(o));

const player = () => ({
  role: "player",
  plinth: { name: "Bex", sub: "Rogue 1", hope: 4, hopeLit: 4 },
  vitals: { hope: [4, 6, 0], hp: [2, 6], st: [5, 7], ar: [0, 3] },
  features: { hope: 4, rows: [{ id: "a", name: "Rogue's Dodge", hope: 3 }] },
  hand: [{ id: "c1" }, { id: "c2" }],
  stack: [{ id: "o", name: "Orrin", hp: [1, 7], st: [0, 6], ar: [0, 4], hope: [3, 6, 0] }],
});

const gm = () => ({
  role: "gm",
  adversary: { difficulty: 13, hp: [1, 3], st: [0, 2] },
  foes: { selected: "t1", foes: [{ id: "t1", hp: [1, 3] }, { id: "t2", hp: [0, 5] }] },
  stack: [],
});

console.log("shape and value");

ok("a mark moving is a value, not a shape", () => {
  const a = player();
  const b = clone(a);
  b.vitals.hp[0] = 4;
  b.vitals.st[0] = 7;
  b.vitals.ar[0] = 2;
  b.vitals.hope[0] = 1;
  b.plinth.hope = 1;
  b.plinth.hopeLit = 1;
  b.features.hope = 1;
  b.stack[0].hp[0] = 5;
  b.stack[0].hope[0] = 0;
  assert.equal(shapeOf(a), shapeOf(b));
});

ok("a maximum moving is a shape", () => {
  for (const edit of [
    (o) => (o.vitals.hp[1] = 7),
    (o) => (o.vitals.hope[1] = 5),
    (o) => (o.vitals.hope[2] = 1),
    (o) => (o.stack[0].st[1] = 7),
    (o) => o.hand.push({ id: "c3" }),
    (o) => (o.plinth.sub = "Rogue 2"),
  ]) {
    const a = player();
    const b = clone(a);
    edit(b);
    assert.notEqual(shapeOf(a), shapeOf(b));
  }
});

ok("an adversary's and a foe card's HP are values", () => {
  const a = gm();
  const b = clone(a);
  b.adversary.hp[0] = 3;
  b.adversary.st[0] = 2;
  b.foes.foes[1].hp[0] = 4;
  assert.equal(shapeOf(a), shapeOf(b));
});

ok("the foe order is shape — which is why it must be stable", () => {
  const a = gm();
  const b = clone(a);
  b.foes.foes.reverse();
  assert.notEqual(shapeOf(a), shapeOf(b));
});

ok("shapeOf does not mutate its input", () => {
  const a = player();
  const before = JSON.stringify(a);
  shapeOf(a);
  assert.equal(JSON.stringify(a), before);
});

ok("liveOf reads what the setters move", () => {
  const l = liveOf(player());
  assert.equal(l.hope, 4);
  assert.deepEqual(l.hp, [2, 6]);
  assert.deepEqual(l.seats.o.hope, [3, 6, 0]);
  const g = liveOf(gm());
  assert.deepEqual(g.hp, [1, 3]);
  assert.deepEqual(g.foes.t2, [0, 5]);
});

ok("only a worse HP is a hit", () => {
  const a = liveOf(player());
  const worse = liveOf({ ...player(), vitals: { ...player().vitals, hp: [3, 6] } });
  const better = liveOf({ ...player(), vitals: { ...player().vitals, hp: [1, 6] } });
  assert.equal(tookHit(a, worse), true);
  assert.equal(tookHit(a, better), false);
  assert.equal(tookHit(null, worse), false);
  assert.equal(tookHit(liveOf(gm()), worse), false, "a role swap is not a hit");
});

console.log("who may press");

ok("a player rail acts only for an owner", () => {
  const actor = { testUserPermission: (u, lvl) => lvl === "OWNER" && u.id === "me" };
  assert.equal(canAct("player", { id: "me" }, actor), true);
  assert.equal(canAct("player", { id: "them" }, actor), false);
  assert.equal(canAct("player", { id: "me" }, null), false);
});

ok("the GM rail is the GM's", () => {
  assert.equal(canAct("gm", { isGM: true }, null), true);
  assert.equal(canAct("gm", { isGM: false }, null), false);
});

console.log("pressing a box");

ok("the box at the edge of the run toggles; any other marks up to it", () => {
  assert.equal(pressBox("hp", 2, 2, 6), 3);
  assert.equal(pressBox("hp", 2, 3, 6), 2);
  assert.equal(pressBox("hp", 0, 4, 6), 1);
});

ok("armour lights what is left, so the press mirrors", () => {
  /* 3 slots, none marked: all three lit. Pressing the last lit one spends it. */
  assert.equal(pressBox("ar", 2, 0, 3), 1);
  assert.equal(pressBox("ar", 0, 0, 3), 2);
  /* One left lit; pressing it again lights it back. */
  assert.equal(pressBox("ar", 0, 2, 3), 3);
});

ok("never past the track", () => {
  assert.equal(pressBox("st", 9, 0, 6), 6);
  assert.equal(pressBox("ar", 9, 0, 3), 0);
});

console.log("moving a card");

const deck = (inL, inV, cost = 1) => ({
  cards: [
    ...inL.map((id, i) => ({ id, sort: (i + 1) * 100, system: { inLoadout: true, recallCost: cost } })),
    ...inV.map((id, i) => ({ id, sort: (inL.length + i + 1) * 100, system: { inLoadout: false, recallCost: cost } })),
  ],
  limit: 5,
  stress: { marked: 0, max: 6 },
});

ok("a recall into room costs its Recall Cost and lands at the end", () => {
  const p = planPlace(deck(["a", "b"], ["v"]), "v", "loadout");
  assert.equal(p.cost, 1);
  assert.equal(p.mode, "recall");
  assert.deepEqual(
    p.updates.find((u) => u._id === "v"),
    { _id: "v", "system.inLoadout": true },
  );
});

ok("a recall the Stress track cannot pay is refused before anything moves", () => {
  const d = deck(["a"], ["v"], 2);
  d.stress = { marked: 5, max: 6 };
  assert.equal(canPayRecall(d, d.cards[1]), false);
  assert.deepEqual(planPlace(d, "v", "loadout"), { refuse: "stress" });
});

ok("resting makes a recall free", () => {
  const d = deck(["a"], ["v"], 2);
  d.stress = { marked: 6, max: 6 };
  d.resting = true;
  assert.equal(planPlace(d, "v", "loadout").cost, 0);
});

ok("into a full loadout with nothing named, nothing happens", () => {
  assert.equal(planPlace(deck(["a", "b", "c", "d", "e"], ["v"]), "v", "loadout"), null);
});

ok("onto a card in a full loadout, that card trades out to the head of the vault", () => {
  const p = planPlace(deck(["a", "b", "c", "d", "e"], ["v", "w"]), "v", "loadout", "c");
  const c = p.updates.find((u) => u._id === "c");
  assert.equal(c["system.inLoadout"], false);
  /* v takes c's slot (third), c is first in the vault (sixth overall). */
  assert.equal(p.updates.find((u) => u._id === "v").sort, 300);
  assert.equal(c.sort, 600);
});

ok("a shelve is free and surfaces at the head of the vault", () => {
  const p = planPlace(deck(["a", "b"], ["v"]), "a", "vault");
  assert.equal(p.cost, 0);
  assert.equal(p.mode, "shelve");
  const order = ["b", "a", "v"];
  for (const u of p.updates) assert.equal(u.sort, (order.indexOf(u._id) + 1) * 100);
});

ok("a card dropped back where it was writes nothing", () => {
  const p = planPlace(deck(["a", "b"], ["v"]), "b", "loadout");
  assert.deepEqual(p.updates, []);
  assert.equal(p.mode, null);
});

ok("an unknown card is not a plan", () => {
  assert.equal(planPlace(deck(["a"], []), "zz", "vault"), null);
});

console.log(`\nbottom HUD: ${n} checks passed`);
