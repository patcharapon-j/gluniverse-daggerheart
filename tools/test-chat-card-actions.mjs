/* Regression coverage for posted-card actions. This drives the real
 * postCard() boundary and inspects the message flags consumed by chat.ts. */

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

const elf = item("elf", "ancestry");
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

/* Cover every feature-bearing full-card shape. Multiple feature blocks are
 * deliberate: that is the shape which caused ancestry to diverge. */
for (const type of ["CLASS", "SUBCLASS", "COMMUNITY", "TRANSFORMATION"]) {
  const id = type.toLowerCase();
  const held = item(id, id === "community" ? "community" : id);
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

const domainCard = item("domain", "domainCard");
const domainActions = await actionsFor({
  id: domainCard.id,
  type: "DOMAIN CARD",
  name: "Domain",
  text: "**Mark an Armor Slot** to use this card.",
}, [domainCard]);
if (!hasCost(domainActions, "armor", 1)) {
  throw new Error(`Domain card has no Armor action: ${JSON.stringify(domainActions)}`);
}

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

const armor = item("armor", "armor");
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

const counterCard = item("counter", "domainCard", {
  resources: [
    { name: "Uses", value: 1, max: { kind: "fixed", n: 1, floor: 0 } },
    { name: "Tokens", value: 0, max: { kind: "fixed", n: 3, floor: 0 } },
  ],
});
const counterActions = await actionsFor({ id: counterCard.id, type: "DOMAIN CARD", name: "Counters" }, [counterCard]);
if (!counterActions.some((action) => action.kind === "move-resource" && action.by === -1) ||
    !counterActions.some((action) => action.kind === "move-resource" && action.by === 1)) {
  throw new Error(`Counter spend/mark actions incomplete: ${JSON.stringify(counterActions)}`);
}

console.log(
  "chat card actions: all 11 Item subtypes plus costs, counters, quantities and damage covered",
);
