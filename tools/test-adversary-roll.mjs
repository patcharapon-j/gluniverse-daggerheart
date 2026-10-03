/**
 * What an attack is measured against, and the card that says whether it
 * landed.
 *
 * This file used to assert the opposite. It held that an adversary attack
 * captured no target and rendered no verdict, with a legacy target passed in
 * "to prove it cannot reactivate evaluation" — so the ratchet guarding this
 * behaviour was guarding a regression. `design/plate.js`, which `CLAUDE.md`
 * names as the source of truth for the look, has always drawn `hit <target>`
 * and `missed <target>` with no unresolved branch at all, and the commit that
 * imported the stat blocks deleted the three lines that read the target's
 * Evasion. The rail is the whole of the GM card's outcome signal and it was
 * stuck in its cold state on every roll in the system.
 *
 * So what is ratcheted now:
 *
 * **The number belongs to the thing being hit.** A character and a companion
 * are found by Evasion, an adversary by Difficulty. `attackTarget` reads
 * whichever the target has rather than being told which side is attacking,
 * which is also what makes a PC attack resolve — the same resolver, reading
 * an adversary's Difficulty.
 *
 * **An absent number stays absent.** No target, two targets, an Environment
 * whose Difficulty is printed as special, or anything that is none of the
 * above: `null`, and the card draws the unresolved rail it has always drawn.
 * Two targets is the interesting one — one card carries one verdict, and
 * "hit" against two different Evasions is two different answers, so both are
 * named and neither is resolved.
 *
 * **A reaction is whispered.** Its Difficulty is a number the GM invented and
 * `FOE_META` prints it. A plate is one stored string replicated to every
 * client, so the only way not to leak it is not to send it.
 */

import assert from "node:assert/strict";

globalThis.Math.clamp ??= (value, min, max) => Math.min(max, Math.max(min, value));
globalThis.CONST = { CHAT_MESSAGE_STYLES: { OTHER: 0 } };
globalThis.Hooks = { callAll: () => {} };

/** The reticle, which is the handle an attack is already aimed with. */
let targets = new Set();

globalThis.game = {
  settings: {
    get: (_system, key) => (key === "diceSoNice" ? false : 0),
    set: async () => {},
  },
  get user() {
    return { isGM: true, targets };
  },
  i18n: { format: (key) => key },
};
globalThis.canvas = { tokens: { controlled: [] } };
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
  getWhisperRecipients: (role) => (role === "GM" ? [{ id: "gm" }] : []),
};

class TestRoll {
  constructor(formula) {
    this.formula = formula;
    this.total = 12;
    this.dice = [{ faces: 20, results: [{ result: 12 }], options: {} }];
  }
  async evaluate() { return this; }
}
globalThis.Roll = TestRoll;

const { attackTarget } = await import("../src/module/apps/targets.ts");
const { rollAdversaryAttack, rollAdversaryReaction } = await import("../src/module/dice/actions.ts");

/* ── the actors an attack can be aimed at ────────────────────────────── */

const token = (actor) => ({ actor });
const ranger = { name: "Ranger", uuid: "Actor.ranger", type: "character", system: { evasion: { value: 14 } } };
const bard = { name: "Bard", uuid: "Actor.bard", type: "character", system: { evasion: { value: 12 } } };
const wolf = { name: "Wolf", uuid: "Actor.wolf", type: "companion", system: { evasion: { value: 11 } } };
const foe = { name: "Jagged Knife", uuid: "Actor.foe", type: "adversary", system: { difficulty: 16 } };
const cliff = { name: "Cliff", uuid: "Actor.cliff", type: "environment", system: { difficulty: 18, difficultySpecial: false } };
const odd = { name: "Storm", uuid: "Actor.storm", type: "environment", system: { difficulty: 18, difficultySpecial: true } };
const alien = { name: "Thing", uuid: "Actor.thing", type: "vehicle", system: { difficulty: 7 } };

const aim = (...actors) => void (targets = new Set(actors.map(token)));

/* ── the resolver ────────────────────────────────────────────────────── */

aim(ranger);
assert.deepEqual(attackTarget(), { name: "Ranger", dc: 14 }, "a character is found by Evasion");

aim(wolf);
assert.equal(attackTarget().dc, 11, "a companion is found by Evasion");

aim(foe);
assert.equal(attackTarget().dc, 16, "an adversary is found by Difficulty — which is what a PC attack resolves against");

aim(cliff);
assert.equal(attackTarget().dc, 18, "an Environment is found by Difficulty");

aim(odd);
assert.deepEqual(
  attackTarget(),
  { name: "Storm", dc: null },
  "an Environment whose Difficulty is printed as special has no number, and is still named",
);

aim(alien);
assert.equal(attackTarget().dc, null, "an actor with neither number resolves to none");

aim();
assert.deepEqual(attackTarget(), { name: "", dc: null }, "no target resolves to nothing");

aim(ranger, bard);
assert.deepEqual(
  attackTarget(),
  { name: "Ranger · Bard", dc: null },
  "two targets name both and resolve neither",
);

targets = new Set([token(ranger), token(ranger)]);
assert.equal(attackTarget().dc, 14, "one actor with two tokens out is one target");

/* ── the adversary attack card ───────────────────────────────────────── */

const adversary = {
  name: "Jagged Knife",
  uuid: "Actor.foe",
  type: "adversary",
  system: { attack: { name: "Slash", modifier: 2 } },
};

const plateOf = (message) => message.flags["gluniverse-daggerheart"].plate;

aim({ ...ranger, system: { evasion: { value: 10 } } });
let result = await rollAdversaryAttack(adversary);
assert.equal(plateOf(result.message).dc, 10, "the attack did not read the target's Evasion");
assert.equal(plateOf(result.message).target, "Ranger");
assert.equal(plateOf(result.message).hit, true, "12 against an Evasion of 10 is a hit");
assert.match(result.message.content, /hit Ranger/, "the card did not say it landed");
assert.match(result.message.content, /class="pl g1 hit"/, "the rail stayed cold on a hit");

aim({ ...ranger, system: { evasion: { value: 99 } } });
result = await rollAdversaryAttack(adversary);
assert.equal(plateOf(result.message).hit, false);
assert.match(result.message.content, /missed Ranger/, "the card did not say it missed");
assert.match(result.message.content, /class="pl g1 cold"/);

aim();
result = await rollAdversaryAttack(adversary);
assert.equal(plateOf(result.message).dc, null, "an untargeted attack invented a number");
assert.equal(plateOf(result.message).target, "");
assert.doesNotMatch(
  result.message.content,
  /\b(?:hit|miss(?:ed)?)\b/i,
  "an unresolved attack rendered a verdict anyway",
);
assert.match(result.message.content, /class="pl g1 cold"/);

aim(ranger, bard);
result = await rollAdversaryAttack(adversary);
assert.equal(plateOf(result.message).dc, null, "two targets resolved one of them");
assert.equal(plateOf(result.message).target, "Ranger · Bard");

/* ── the claim row, offered only by a roll that landed ───────────────── */

const armed = {
  ...adversary,
  system: { attack: { name: "Slash", modifier: 2, damage: { count: 2, dice: "d8", bonus: 2, type: "physical" } } },
};
const row = (message) => /<div class="pl-act">/.test(message.content);

aim({ ...ranger, system: { evasion: { value: 10 } } });
result = await rollAdversaryAttack(armed);
assert.equal(row(result.message), true, "a hit offered the GM nothing");
assert.match(result.message.content, /data-dh-act="roll-foe-damage"/);
assert.match(
  result.message.content,
  /DAGGERHEART\.Plate\.DealDamage/,
  "the offer is not a keyed string",
);
assert.equal(
  result.message.flags["gluniverse-daggerheart"].nextAct,
  "roll-foe-damage",
  "the offer was rendered but not recorded, so a reroll would eat it",
);

aim({ ...ranger, system: { evasion: { value: 99 } } });
result = await rollAdversaryAttack(armed);
assert.equal(row(result.message), false, "a miss offered damage anyway");
// postPlate stores a withheld offer as an explicit null, not a hole.
assert.equal(result.message.flags["gluniverse-daggerheart"].nextAct, null);

aim();
result = await rollAdversaryAttack(armed);
assert.equal(row(result.message), false, "an unresolved attack offered damage — no hit is being claimed");

/* ── and the reaction, which is whispered ────────────────────────────── */

aim();
result = await rollAdversaryReaction(adversary, 15);
assert.deepEqual(result.message.whisper, ["gm"], "the reaction's Difficulty went to the whole table");
assert.equal(plateOf(result.message).dc, 15, "the Difficulty the GM named was not carried");
assert.equal(plateOf(result.message).rxn, true);

result = await rollAdversaryAttack(adversary);
assert.equal(result.message.whisper, undefined, "an attack was whispered, and it has no secret to keep");

aim();
result = await rollAdversaryReaction(armed, 13);
assert.equal(row(result.message), false, "a reaction offered damage — nothing passes hands on one");

console.log(
  "adversary attack: the target's own number resolves the rail, only a landed roll offers damage, and a reaction is whispered",
);
