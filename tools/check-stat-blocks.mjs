import { ADVERSARIES, ENVIRONMENTS } from "../src/packs-src/stat-blocks.mjs";

const EXPECTED = { adversaries: 290, environments: 47 };
const fail = (message) => {
  console.error(`Stat-block check failed: ${message}`);
  process.exitCode = 1;
};

if (ADVERSARIES.length !== EXPECTED.adversaries) {
  fail(`expected ${EXPECTED.adversaries} adversaries, got ${ADVERSARIES.length}`);
}
if (ENVIRONMENTS.length !== EXPECTED.environments) {
  fail(`expected ${EXPECTED.environments} environments, got ${ENVIRONMENTS.length}`);
}

for (const entry of [...ADVERSARIES, ...ENVIRONMENTS]) {
  if (!entry.name || !entry.folder || !entry.sourceKey) fail(`missing identity on ${entry.name || "unnamed entry"}`);
  if (!entry.system.description) fail(`${entry.name} has no description`);
  if (!entry.items.length) fail(`${entry.name} has no embedded features`);
  for (const feature of entry.items) {
    if (!feature.name || !feature.system.description) fail(`${entry.name} has an incomplete feature`);
  }
}

for (const entry of ADVERSARIES) {
  const attack = entry.system.attack;
  if (!attack.name || !Number.isFinite(attack.modifier)) fail(`${entry.name} has an invalid attack`);
  if (entry.system.role === "horde" && !entry.system.hordeDamage) fail(`${entry.name} has no horde damage`);
}

const abomination = ADVERSARIES.find((entry) => entry.name === "Outer Realms Abomination");
if (abomination?.system.attack.modifierDice !== "2d4") {
  fail("Outer Realms Abomination must retain its rolled 2d4 attack modifier");
}
const enforcer = ADVERSARIES.find((entry) => entry.name === "Temporal Enforcer");
if (!enforcer?.system.attack.damage.direct || enforcer.system.attack.damage.bonus !== 40) {
  fail("Temporal Enforcer must retain its 40 direct physical damage");
}
const colossi = ADVERSARIES.filter((entry) => entry.system.role === "colossus");
if (colossi.length !== 23) fail(`expected 23 colossus frameworks/segments, got ${colossi.length}`);
if (!ADVERSARIES.some((entry) => entry.name === "Forlorne Lykona · Dragon Form")) {
  fail("Forlorne Lykona's Dragon Form was not imported");
}
if (!ADVERSARIES.some((entry) => entry.name === "Weredrake")) {
  fail("Weredrake was not imported");
}
if (![...ADVERSARIES, ...ENVIRONMENTS].some((entry) =>
  entry.items.some((feature) => feature.system.kind === "evolution"))) {
  fail("no Evolution features were imported");
}

for (const entry of ENVIRONMENTS) {
  if (!entry.system.potentialAdversaries) fail(`${entry.name} has no potential adversaries`);
}

const duplicateKeys = (entries) => {
  const seen = new Set();
  return entries.filter((entry) => seen.size === seen.add(entry.sourceKey).size).map((entry) => entry.sourceKey);
};
const duplicates = [...duplicateKeys(ADVERSARIES), ...duplicateKeys(ENVIRONMENTS)];
if (duplicates.length) fail(`duplicate source keys: ${duplicates.join(", ")}`);

if (!process.exitCode) {
  const features = [...ADVERSARIES, ...ENVIRONMENTS].reduce((sum, entry) => sum + entry.items.length, 0);
  console.log(`Stat blocks: ${ADVERSARIES.length} adversaries, ${ENVIRONMENTS.length} environments, ${features} embedded features.`);
}
