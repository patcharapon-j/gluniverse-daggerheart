import assert from "node:assert/strict";
import CLASSES from "../src/packs-src/classes.mjs";
import DOMAINS from "../src/packs-src/domains.mjs";
import EQUIPMENT from "../src/packs-src/equipment.mjs";
import HERITAGE from "../src/packs-src/heritage.mjs";
import {
  activeModifiers,
  modifierTotal,
  traitPassiveTotal,
  weaponModifierTerms,
} from "../src/module/data/modifiers.ts";

let id = 0;
const own = (entry, patch = {}) => {
  const copy = structuredClone(entry);
  copy.id = `test-${++id}`;
  Object.assign(copy.system, patch);
  return copy;
};
const find = (list, name) => list.find((e) => e.name === name);
const system = {
  level: 6,
  tier: 2,
  proficiency: 2,
  spellcastTrait: "knowledge",
  traits: {
    agility: { value: 2, total: 2 }, strength: { value: 1, total: 1 },
    finesse: { value: 0, total: 0 }, instinct: { value: -1, total: -1 },
    presence: { value: 1, total: 1 }, knowledge: { value: 2, total: 2 },
  },
  resources: { stress: { marked: 2, max: 6 }, hope: { value: 2 } },
};

const bladeCards = DOMAINS.filter((e) => e.system.domain === "blade").slice(0, 3).map((e) => own(e, { inLoadout: true }));
const bladeTouched = own(find(DOMAINS, "Blade-Touched"), { inLoadout: true });
const actor = { system: structuredClone(system), items: [...bladeCards, bladeTouched] };
assert.equal(modifierTotal(actor, "attackRoll"), 2, "four Blade cards activate Blade-Touched");
assert.equal(modifierTotal(actor, "severeThreshold"), 4);
actor.items.pop();
assert.equal(modifierTotal(actor, "attackRoll"), 0, "a vaulted/removed fourth card deactivates it");

const bareBones = own(find(DOMAINS, "Bare Bones"), { inLoadout: true });
const bareActor = { system: structuredClone(system), items: [bareBones] };
assert.equal(modifierTotal(bareActor, "bareBones"), 1);
bareActor.items.push(own(find(EQUIPMENT, "Gambeson Armor"), { equipped: true }));
assert.equal(modifierTotal(bareActor, "bareBones"), 0, "equipped armor deactivates Bare Bones");

const human = own(find(HERITAGE, "Human"));
const earthkin = own(find(HERITAGE, "Earthkin"));
const heritageActor = { system: structuredClone(system), items: [human, earthkin] };
assert.equal(modifierTotal(heritageActor, "stress"), 1);
assert.equal(modifierTotal(heritageActor, "armorScore"), 1);
assert.equal(modifierTotal(heritageActor, "thresholds"), 1);

const voice = own(find(DOMAINS, "Voice of Reason"), { inLoadout: true });
const stressedActor = { system: structuredClone(system), items: [human, voice] };
stressedActor.system.resources.stress = { marked: 6, max: 7 };
assert.equal(modifierTotal(stressedActor, "damageProficiency"), 0,
  "full Stress checks the final maximum including heritage slots");
stressedActor.system.resources.stress.marked = 7;
assert.equal(modifierTotal(stressedActor, "damageProficiency"), 1);

const primary = own(find(EQUIPMENT, "Broadsword"), { equipped: true });
const paired = own(find(EQUIPMENT, "Shortsword"), { equipped: true });
const gearActor = { system: structuredClone(system), items: [primary, paired] };
assert.deepEqual(weaponModifierTerms(gearActor, primary, "attack").map((t) => t.v), [1]);
assert.deepEqual(weaponModifierTerms(gearActor, primary, "damage").map((t) => t.v), [2]);

const fullPlate = own(find(EQUIPMENT, "Full Plate Armor"), { equipped: true });
const armorActor = { system: structuredClone(system), items: [fullPlate] };
assert.equal(traitPassiveTotal(armorActor, "agility"), -1);
assert.equal(modifierTotal(armorActor, "evasion"), -2);

// An old embedded copy has no structured modifiers; exact-name compatibility
// must give it the same result without asking the player to re-drag it.
delete fullPlate.system.feature.modifiers;
assert.equal(traitPassiveTotal(armorActor, "agility"), -1);
assert.equal(activeModifiers(armorActor).filter((m) => m.target === "evasion").length, 0,
  "legacy Evasion remains on the old evasionModifier field and is not doubled");

const potionActor = {
  system: structuredClone(system),
  items: [own(find(EQUIPMENT, "Major Stride Potion"))],
};
assert.equal(traitPassiveTotal(potionActor, "agility"), 0,
  "carrying a consumable is not evidence that its timed effect is active");

const stanceActor = { system: structuredClone(system), items: [own(find(CLASSES, "Reliable"))] };
assert.equal(modifierTotal(stanceActor, "attackRoll"), 0,
  "owning a Martial Stance is not evidence that it is the current stance");

console.log("passive modifier runtime: activation, scaling, gear, heritage, stateful exclusions and legacy copies check out.");
