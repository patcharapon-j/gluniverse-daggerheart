/* Regression coverage for posted-card actions. This drives the real
 * postCard() boundary and inspects the message flags consumed by chat.ts.
 *
 * ── what this file used to be
 *
 * Every assertion here was a *parse* assertion: hand a card the prose
 * "**Spend 2 Hope** to use this feature" and check that a Hope cost came back.
 * That is how the buttons were decided, so that is what had to be covered —
 * and the coverage was per-subtype because ancestry had once diverged from the
 * others by carrying its rules in two blocks rather than one.
 *
 * The prose is not read any more. Costs, rolls and damage are authored per
 * document in `src/packs-src/card-actions.mjs`, and `test-authored-actions.mjs`
 * is what ratchets that path. So the subtype sweep is rebuilt on authored
 * input — the divergence it was written for is a property of the *shape* of a
 * document, not of how its buttons were derived, and it is still worth
 * covering.
 *
 * What survives unchanged is everything that was never a parse: the Marked
 * deck's toll, a consumable's quantity, a weapon's damage, and the `feature`
 * subtype's own `stressCost`/`fearCost` — which are authored fields somebody
 * typed into the item sheet and are the one cost that predates `actions`.
 */

globalThis.CONST = { CHAT_MESSAGE_STYLES: { OTHER: 0 } };
globalThis.ChatMessage = {
  getSpeaker: () => ({}),
  create: async (data) => data,
};

const { postCard } = await import("../src/module/sheets/post-card.ts");
const SYSTEM_ID = "gluniverse-daggerheart";
const domain = {
  slug: "test",
  name: "Test",
  light: "#aaa",
  dark: "#333",
  ramp: false,
};

const item = (id, type, system = {}) => ({
  id,
  type,
  name: id,
  system: { resources: [], ...system },
});

const actionsFor = async (card, held) => {
  const items = held ?? [];
  const actor = {
    uuid: "Actor.test",
    items: {
      get: (id) => items.find((it) => it.id === id) ?? null,
      find: (fn) => items.find(fn),
    },
  };
  const message = await postCard({ d: domain, sig: "", ...card }, actor);
  return message.flags[SYSTEM_ID].cardActions;
};

const hasCost = (actions, field, amount) =>
  actions.some((action) => action.kind === "pay-cost" && action[field] === amount);

/** One authored `pay`, in the shape the compendium stores. */
const pays = (amount, said) => ({ kind: "pay", amount, said });

/* ── every feature-bearing full-card shape ────────────────────────────────
   Two blocks on purpose: that is the shape which caused ancestry to diverge,
   and it is also the shape that makes a per-block binding matter — an action
   on one rule must not arrive on the other's row.

   `feats` on the card and `topFeature`/`bottomFeature` on the Item are the
   two halves of the same document. The card is what gets drawn; the Item is
   where the actions live, because an action is printed on a rule and travels
   with it. */

const elf = item("elf", "ancestry", {
  topFeature: {
    name: "Quick Reactions",
    description: "**Mark a Stress** to gain advantage on a reaction roll.",
    actions: [pays({ stress: 1 }, "Mark a Stress")],
  },
  bottomFeature: { name: "Celestial Trance", description: "During a rest, choose an additional downtime move.", actions: [] },
});
const ancestryActions = await actionsFor({
  id: elf.id,
  type: "ANCESTRY",
  name: "Elf",
  feats: [
    { n: "Quick Reactions", t: "**Mark a Stress** to gain advantage on a reaction roll." },
    { n: "Celestial Trance", t: "During a rest, choose an additional downtime move." },
  ],
}, [elf]);
if (!hasCost(ancestryActions, "stress", 1)) {
  throw new Error(`Elf ancestry has no Stress action: ${JSON.stringify(ancestryActions)}`);
}
if (ancestryActions.length !== 1) {
  throw new Error(`the free feature must contribute nothing: ${JSON.stringify(ancestryActions)}`);
}

for (const type of ["CLASS", "SUBCLASS", "COMMUNITY", "TRANSFORMATION"]) {
  const id = type.toLowerCase();
  const kind = id === "community" ? "community" : id;
  /* Where a subtype keeps its rules differs — a class has `classFeatures`, a
     subclass and a transformation have `features`, a community has one
     `feature` — and `authoredBlocks` has to reach all of them. A subtype it
     could not walk would be a document whose buttons silently never appear. */
  const paid = { name: "Paid", description: "**Spend 2 Hope** to use this feature.", actions: [pays({ hope: 2 }, "Spend 2 Hope")] };
  const free = { name: "Free", description: "This feature has no cost.", actions: [] };
  const system = kind === "class" ? { classFeatures: [free, paid] }
    : kind === "community" ? { feature: paid }
    : { features: [free, paid] };
  const held = item(id, kind, system);
  const actions = await actionsFor({
    id,
    type,
    name: type,
    feats: [
      { n: "Free", t: "This feature has no cost." },
      { n: "Paid", t: "**Spend 2 Hope** to use this feature." },
    ],
  }, [held]);
  if (!hasCost(actions, "hope", 2)) {
    throw new Error(`${type} has no Hope action: ${JSON.stringify(actions)}`);
  }
}

const domainCard = item("domain", "domainCard", {
  actions: [pays({ armorSlots: 1 }, "Mark an Armor Slot")],
});
const domainActions = await actionsFor({
  id: domainCard.id,
  type: "DOMAIN CARD",
  name: "Domain",
  text: "**Mark an Armor Slot** to use this card.",
}, [domainCard]);
if (!hasCost(domainActions, "armor", 1)) {
  throw new Error(`Domain card has no Armor action: ${JSON.stringify(domainActions)}`);
}

/* The one cost that predates `actions` and is not a parse: somebody typed it
   into the item sheet. A homebrew feature built through those two fields has
   to go on charging what it was told to. */
const feature = item("feature", "feature", { stressCost: 2 });
const featureActions = await actionsFor({
  id: feature.id,
  type: "ACTION",
  name: "Feature",
  text: "This authored feature has a cost stored on its Item.",
}, [feature]);
if (!hasCost(featureActions, "stress", 2)) {
  throw new Error(`Feature Item ignored its authored cost: ${JSON.stringify(featureActions)}`);
}

const weapon = item("weapon", "weapon", {
  equipped: true,
  slot: "primary",
  damage: { dice: "d8", count: 1, bonus: 0, type: "physical" },
  actions: [{ kind: "roll-damage", said: "A weapon." }],
});
const weaponActions = await actionsFor({
  id: weapon.id,
  type: "WEAPON",
  name: "Sword",
  text: "A weapon.",
}, [weapon]);
if (!weaponActions.some((action) => action.kind === "roll-damage" && action.weaponId === weapon.id)) {
  throw new Error(`Weapon has no damage roll: ${JSON.stringify(weaponActions)}`);
}

const armor = item("armor", "armor", {
  feature: { name: "Warded", description: "**Spend a Hope** to activate this armor.", actions: [pays({ hope: 1 }, "Spend a Hope")] },
});
const armorActions = await actionsFor({
  id: armor.id,
  type: "ARMOR",
  name: "Armor",
  text: "**Spend a Hope** to activate this armor.",
}, [armor]);
if (!hasCost(armorActions, "hope", 1)) {
  throw new Error(`Armor has no Hope action: ${JSON.stringify(armorActions)}`);
}

for (const type of ["consumable", "loot"]) {
  const held = item(type, type, { quantity: 2 });
  const actions = await actionsFor({ id: held.id, type: type.toUpperCase(), name: type }, [held]);
  if (!actions.some((action) => action.kind === "use-item" && action.itemId === held.id)) {
    throw new Error(`${type} has no quantity action: ${JSON.stringify(actions)}`);
  }
}

/* A counter no longer produces a button on its own, and that is the change
   rather than a gap. `actionsFor` used to add one per counter and decide
   spend-versus-mark by testing the counter's *name* against `/^uses?$/i` — a
   guess about English on data whose author already knew the answer. An
   authored `move-resource` states the sign and names the pool. */
const counterCard = item("counter", "domainCard", {
  resources: [
    { name: "Uses", value: 1, max: { kind: "fixed", n: 1, floor: 0 } },
    { name: "Tokens", value: 0, max: { kind: "fixed", n: 3, floor: 0 } },
  ],
  actions: [
    { kind: "move-resource", resource: "Uses", by: -1, said: "spend a use" },
    { kind: "move-resource", resource: "Tokens", by: 1, said: "place a token" },
  ],
});
const counterActions = await actionsFor({ id: counterCard.id, type: "DOMAIN CARD", name: "Counters" }, [counterCard]);
if (!counterActions.some((action) => action.kind === "move-resource" && action.by === -1) ||
    !counterActions.some((action) => action.kind === "move-resource" && action.by === 1)) {
  throw new Error(`Counter spend/mark actions incomplete: ${JSON.stringify(counterActions)}`);
}
const unnamed = item("unnamed", "domainCard", {
  resources: [{ name: "Tokens", value: 0, max: { kind: "fixed", n: 3, floor: 0 } }],
});
const unnamedActions = await actionsFor({ id: unnamed.id, type: "DOMAIN CARD", name: "Unnamed" }, [unnamed]);
if (unnamedActions.some((a) => a.kind === "move-resource")) {
  throw new Error(`a counter nobody authored a press for must draw none: ${JSON.stringify(unnamedActions)}`);
}

/* *The Twilight Marked*. Three things worth asserting and each has a way of
   going quietly wrong.

   That the toll appears at all on a Root or Void card — it is the one action
   in the row that is not optional, so a card posted without it is a card that
   costs nothing and looks complete.

   That it is **first**. `unshift` rather than `push` is a one-character
   difference nothing else would catch, and a compulsory cost drawn after two
   optional ones reads as the least important thing on the row.

   And that the two level 10 cards cost 3, read off the words the frame uses
   rather than off a list of their names. That last one is the single prose
   read left in `post-card.ts`, and it survives because its subject is the
   frame rather than the card. */
const markedCard = item("marked", "domainCard", {
  domain: "void",
  actions: [pays({ stress: 1 }, "mark a Stress")],
});
const markedActions = await actionsFor({
  id: markedCard.id,
  type: "DOMAIN CARD",
  name: "Null Grip",
  text: "Once per rest, **mark a Stress** and make a **Spellcast Roll**.",
}, [markedCard]);
if (markedActions[0]?.kind !== "mark-use" || markedActions[0]?.mark !== 1) {
  throw new Error(`Marked card's toll is missing or not first: ${JSON.stringify(markedActions)}`);
}
if (!hasCost(markedActions, "stress", 1)) {
  throw new Error(`Marked card lost its own printed cost: ${JSON.stringify(markedActions)}`);
}

const answerCard = item("answer", "domainCard", { domain: "root" });
const answerActions = await actionsFor({
  id: answerCard.id,
  type: "DOMAIN CARD",
  name: "No More Waiting",
  text: "Once per long rest, you can take an additional action. When you do, you gain **3 Mark** instead of 1.",
}, [answerCard]);
if (answerActions[0]?.mark !== 3) {
  throw new Error(`The extra-action card should cost 3 Mark: ${JSON.stringify(answerActions)}`);
}

const plainCard = item("plain", "domainCard", { domain: "grace" });
const plainActions = await actionsFor({ id: plainCard.id, type: "DOMAIN CARD", name: "Plain" }, [plainCard]);
if (plainActions.some((a) => a.kind === "mark-use")) {
  throw new Error(`A printed domain card must not carry the frame's toll: ${JSON.stringify(plainActions)}`);
}

console.log(
  "chat card actions: all 11 Item subtypes reached by the block walk, plus authored costs, "
    + "counters, quantities, damage, the feature subtype's own cost fields and the Mark toll",
);
