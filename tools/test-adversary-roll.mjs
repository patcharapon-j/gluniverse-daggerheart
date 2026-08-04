/* Regression coverage for unresolved adversary attacks. This drives the
 * public sheet action through the real roll and plate builders. */

globalThis.Math.clamp ??= (value, min, max) => Math.min(max, Math.max(min, value));
globalThis.CONST = { CHAT_MESSAGE_STYLES: { OTHER: 0 } };
globalThis.Hooks = { callAll: () => {} };
globalThis.game = {
  settings: {
    get: (_system, key) => key === "diceSoNice" ? false : 0,
    set: async () => {},
  },
  user: { isGM: true },
  i18n: { format: (key) => key },
};
globalThis.foundry = {
  utils: {
    getRoute: (path) => `/${path}`,
    escapeHTML: (value) => String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;"),
  },
};
globalThis.ChatMessage = {
  getSpeaker: () => ({}),
  create: async (data) => data,
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

const { rollAdversaryAttack } = await import("../src/module/dice/actions.ts");
const actor = {
  name: "Jagged Knife",
  uuid: "Actor.foe",
  system: { attack: { name: "Slash", modifier: 2 } },
};
// Keep a legacy target in the call to prove it cannot reactivate evaluation.
const target = { actor: { name: "Ranger", system: { evasion: { value: 99 } } } };
const result = await rollAdversaryAttack(actor, { target });
const plate = result.message.flags["gluniverse-daggerheart"].plate;

if (plate.dc !== null || plate.target) {
  throw new Error(`Adversary attack still captured a target: ${JSON.stringify(plate)}`);
}
if (/\b(?:hit|miss(?:ed)?)\b/i.test(result.message.content)) {
  throw new Error(`Adversary attack still rendered a verdict: ${result.message.content}`);
}

console.log("adversary attack: unresolved d20 roll with no evasion or hit/miss verdict");
