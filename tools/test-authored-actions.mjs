/**
 * The authored-action path, end to end, against a stub Foundry.
 *
 * `test-activity-log.mjs`'s idiom: a fake in the shape these functions
 * actually use, rather than a mock of everything Foundry has. What is
 * ratcheted here is the set of things that fail **silently** — a chain that
 * takes half a payment, a claim spent on a refusal, a button that quietly
 * never appears — because every one of those renders perfectly and shows up
 * three hours later as a track that has not moved all session.
 *
 *     node --experimental-strip-types tools/test-authored-actions.mjs
 */

import assert from "node:assert/strict";

/* ── the stub ─────────────────────────────────────────────────────────── */

globalThis.CONST = { CHAT_MESSAGE_STYLES: { OTHER: 0 } };
globalThis.ChatMessage = { getSpeaker: () => ({}), create: async (d) => d };

const SYSTEM_ID = "gluniverse-daggerheart";
const domain = { slug: "test", name: "Test", light: "#aaa", dark: "#333", ramp: false };

const { postCard } = await import("../src/module/sheets/post-card.ts");
const { suggestActions } = await import("../src/module/sheets/suggest.ts");

const action = (patch = {}) => ({
  kind: "pay",
  label: "",
  subject: "self",
  amount: { hope: 0, stress: 0, hitPoints: 0, armorSlots: 0, fear: 0 },
  resource: "",
  by: 0,
  op: "place",
  trait: "",
  dc: 0,
  damageName: "",
  formula: "",
  condition: "",
  effect: { name: "", duration: "temporary", modifiers: [] },
  mark: 1,
  said: "",
  when: "",
  steps: [],
  ...patch,
});

const item = (id, type, system = {}) => ({
  id,
  type,
  name: id,
  system: { resources: [], dice: [], cardDamage: [], actions: [], ...system },
});

const actorWith = (items) => ({
  uuid: "Actor.test",
  name: "Test",
  isOwner: true,
  system: { proficiency: 2, spellcastTrait: "knowledge" },
  items: {
    get: (id) => items.find((it) => it.id === id) ?? null,
    find: (fn) => items.find(fn),
    [Symbol.iterator]: () => items[Symbol.iterator](),
  },
});

const actionsOf = async (card, items, options = {}) => {
  const message = await postCard({ d: domain, sig: "", ...card }, actorWith(items), options);
  return message.flags[SYSTEM_ID].cardActions;
};

/* ── authored beats parsed, wholly ────────────────────────────────────────
   A parse cannot be partly retired. A card whose price was authored and whose
   roll was still swept would be charging the reader's answer and guessing at
   the rest, which is the worst of both and impossible to review. */

const rune = item("rune", "domainCard", {
  actions: [action({ amount: { hope: 0, stress: 1, hitPoints: 0, armorSlots: 0, fear: 0 }, said: "Mark a Stress" })],
});
const authored = await actionsOf(
  {
    id: "rune",
    type: "DOMAIN CARD",
    name: "Rune Ward",
    // Prose the old parser would also have found a roll in. It must not.
    text: "**Mark a Stress** to ward an ally. Make a Spellcast Roll (13).",
  },
  [rune],
);
assert.equal(authored.length, 1, "an annotated card's row is its reading and nothing else");
assert.equal(authored[0].kind, "pay-cost");
assert.equal(authored[0].stress, 1);
assert.equal(authored[0].said, "Mark a Stress", "said travels onto the message");

/* And a card with no reading gets NOTHING, which is the posture now that
   every rule unit in the packs is read: `check-actions.mjs` will not let one
   through unannotated and undeclined, so a document reaching this point has
   genuinely nothing authored. A guess here would be the retired parser back
   under another name, and the failure it made — charging a Stress nobody owes
   — is the one this whole change exists to make impossible.

   The GM's route is the item sheet's "suggest" press, where the same patterns
   produce editable rows somebody looks at first. */
const bare = item("bare", "domainCard");
const parsed = await actionsOf(
  { id: "bare", type: "DOMAIN CARD", name: "Rune Ward", text: "**Mark a Stress** to ward an ally." },
  [bare],
);
assert.equal(parsed.length, 0,
  "an unannotated card gets no automation at all — the runtime never guesses");

/* ── the structural two survive the authored path ─────────────────────── */

const potion = item("potion", "consumable", {
  quantity: 2,
  actions: [action({ kind: "clear", amount: { hope: 0, stress: 0, hitPoints: 2, armorSlots: 0, fear: 0 }, said: "Clear 2 Hit Points" })],
});
const potionRow = await actionsOf(
  { id: "potion", type: "CONSUMABLE", name: "Minor Health Potion", text: "Clear 2 Hit Points." },
  [potion],
);
assert.deepEqual(potionRow.map((a) => a.kind), ["clear", "use-item"],
  "use-item is a fact about the object and is added even to an annotated card");

const rootCard = item("root", "domainCard", {
  domain: "root",
  actions: [action({ kind: "roll-trait", trait: "spellcast", said: "Make a Spellcast Roll" })],
});
const rootRow = await actionsOf(
  { id: "root", type: "DOMAIN CARD", name: "Rootbound", text: "Make a **Spellcast Roll**." },
  [rootCard],
);
assert.equal(rootRow[0].kind, "mark-use", "the Marked toll is not optional, so it goes first");
assert.equal(rootRow[1].trait, "instinct", "Root casts with Instinct — the frame's own table, on the card");

/* ── a feature post is that feature's row ─────────────────────────────────
   A class row for Cloaked must not arrive carrying Sneak Attack's press. */

const rogue = item("rogue", "class", {
  classFeatures: [
    { name: "Cloaked", description: "You are Cloaked.", actions: [action({ kind: "apply-condition", condition: "cloaked", said: "You are Cloaked" })] },
    { name: "Sneak Attack", description: "Mark a Stress.", actions: [action({ amount: { hope: 0, stress: 1, hitPoints: 0, armorSlots: 0, fear: 0 }, said: "Mark a Stress" })] },
  ],
});
const cloaked = await actionsOf({ id: "rogue", type: "CLASS", name: "Rogue" }, [rogue], { feature: "Cloaked" });
assert.equal(cloaked.length, 1, "one rule, one row");
assert.equal(cloaked[0].kind, "apply-condition");

const wholeClass = await actionsOf({ id: "rogue", type: "CLASS", name: "Rogue" }, [rogue]);
assert.equal(wholeClass.length, 2, "the whole document carries every block's actions");

/* ── returning nothing is a real answer ───────────────────────────────────
   A `spellcast` pointer that resolves to nothing emits NO button, because a
   row that answered it by rolling Finesse is worse than silence. */

const noCaster = {
  uuid: "Actor.x", name: "X", isOwner: true, system: {}, items: {
    get: () => casterless, find: () => null, [Symbol.iterator]: () => [casterless][Symbol.iterator](),
  },
};
const casterless = item("nc", "domainCard", {
  actions: [action({ kind: "roll-trait", trait: "spellcast", said: "Make a Spellcast Roll" })],
});
const silent = (await postCard({ d: domain, sig: "", id: "nc", type: "DOMAIN CARD", name: "X" }, noCaster))
  .flags[SYSTEM_ID].cardActions;
assert.equal(silent.length, 0, "no Spellcast trait and no mark means no button, not a guessed one");

/* A counter the document does not carry is the same shape: named, unreachable,
   and therefore not drawn. The alternative is a button that does nothing. */
const ghost = item("ghost", "domainCard", {
  actions: [action({ kind: "move-resource", resource: "Tokens", by: -1, said: "spend a token" })],
});
const ghostRow = await actionsOf({ id: "ghost", type: "DOMAIN CARD", name: "Ghost" }, [ghost]);
assert.equal(ghostRow.length, 0, "an action naming a pool that is not there draws nothing");

const real = item("real", "domainCard", {
  resources: [{ name: "Tokens", value: 3, max: { kind: "fixed", n: 3, floor: 0 } }],
  actions: [action({ kind: "move-resource", resource: "Tokens", by: -1, said: "spend a token" })],
});
const realRow = await actionsOf({ id: "real", type: "DOMAIN CARD", name: "Real" }, [real]);
assert.equal(realRow[0].resourceIndex, 0, "the name is resolved to an index at the post");
assert.equal(realRow[0].by, -1, "the sign is authored, not sniffed off the counter's name");
assert.match(realRow[0].label, /^Spend Token/, "and the verb follows the sign");

/* ── chains resolve one level and no further ──────────────────────────── */

const chained = item("chain", "domainCard", {
  actions: [action({
    amount: { hope: 1, stress: 0, hitPoints: 0, armorSlots: 0, fear: 0 },
    said: "Spend a Hope",
    steps: [action({ kind: "roll-damage" })],
  })],
});
const chainRow = await actionsOf(
  { id: "chain", type: "DOMAIN CARD", name: "Chain", text: "Spend a Hope and make an attack." },
  [chained, item("sword", "weapon", { equipped: true, slot: "primary" })],
);
assert.equal(chainRow.length, 1, "a chain is ONE press — two buttons let somebody skip the payment");
assert.equal(chainRow[0].steps.length, 1);
assert.equal(chainRow[0].steps[0].kind, "roll-damage");
assert.equal(chainRow[0].steps[0].weaponId, "sword", "the step resolves against the character too");

/* ── the suggest engine ───────────────────────────────────────────────────
   It may produce anything at all; what it may not do is produce something a
   human cannot then check. Every suggestion carries the words it came from. */

const suggested = suggestActions("**Mark a Stress** and make an **Instinct Roll** (14).");
assert.ok(suggested.length >= 2, "a cost and a roll are both suggested");
for (const a of suggested) {
  assert.ok(String(a.said).trim(), `${a.kind} suggested with no said — nothing to check it against`);
}
const pay = suggested.find((a) => a.kind === "pay");
assert.equal(pay.amount.stress, 1);
assert.match(pay.said.toLowerCase(), /mark a stress/);
const roll = suggested.find((a) => a.kind === "roll-trait");
assert.equal(roll.trait, "instinct");
assert.equal(roll.dc, 14, "a printed Difficulty travels; an unprinted one never does");

/* A suggestion may only ever name a pool the document actually carries. One
   that named a missing pool would draw no button and give the GM nothing on
   screen to explain why. */
const scoped = suggestActions("Spend a Ward token.", undefined, { resources: ["Ward"] });
assert.ok(scoped.some((a) => a.kind === "move-resource" && a.resource === "Ward" && a.by === -1));
assert.ok(!suggestActions("Spend a Ward token.").some((a) => a.kind === "move-resource"),
  "with no pools declared, nothing names one");

console.log(
  "authored actions: the reading wins whole, structural presses survive, a feature post is one rule, " +
    "unresolvable actions draw nothing, chains are one press, and every suggestion carries its words",
);
