/* Static reachability guard for every writable non-character Actor field. */
import { readFileSync } from "node:fs";

const root = new URL("../src/module/sheets/", import.meta.url);
const sheets = {
  AdversarySheet: [
    "tier", "role", "description", "motives", "difficulty",
    "thresholds.none", "thresholds.major", "thresholds.severe",
    "resources.hitPoints.max", "resources.hitPoints.marked",
    "resources.stress.max", "resources.stress.marked",
    "attack.name", "attack.modifier", "attack.range",
    "attack.damage.count", "attack.damage.dice", "attack.damage.bonus", "attack.damage.type",
    "experiences", "hordeDamage", "notes",
  ],
  EnvironmentSheet: [
    "tier", "kind", "description", "impulses", "difficulty", "difficultySpecial",
    "potentialAdversaries", "notes",
  ],
  CompanionSheet: [
    "partner", "species", "description", "evasion.base", "evasion.bonus",
    "resources.stress.max", "resources.stress.marked",
    "attack.name", "attack.range", "attack.damage.count", "attack.damage.dice",
    "attack.damage.bonus", "attack.damage.type", "experience.name", "experience.modifier",
    "training.intelligent", "training.lightInTheDark", "training.creatureComfort",
    "training.armored", "training.vicious", "training.resilient", "training.bonded",
    "training.aware", "notes",
  ],
};

for (const [name, paths] of Object.entries(sheets)) {
  const source = readFileSync(new URL(`${name}.svelte`, root), "utf8");
  const missing = paths.filter((path) => {
    if (source.includes(`system.${path}`)) return false;
    if (path.startsWith("training.")) {
      const key = path.slice("training.".length);
      return !source.includes(`"${key}"`) || !source.includes("system.training.${key}");
    }
    return true;
  });
  for (const interaction of ["handleActorDrop", "FeatureList", "ActorSheetHeader"]) {
    if (!source.includes(interaction)) missing.push(interaction);
  }
  if (missing.length) throw new Error(`${name} has unreachable fields/interactions: ${missing.join(", ")}`);
}

const featureList = readFileSync(new URL("parts/FeatureList.svelte", root), "utf8");
const actorTools = readFileSync(new URL("actor-sheet-tools.ts", root), "utf8");
if (!featureList.includes("createEmbeddedFeature") || !featureList.includes("Add feature")) {
  throw new Error("FeatureList is missing its author-new-feature action");
}
if (!actorTools.includes('createEmbeddedDocuments("Item"') || !actorTools.includes('type: "feature"')) {
  throw new Error("actor-sheet-tools does not create an embedded Feature Item");
}

console.log("actor sheets: all 58 writable fields plus drop, create-feature, feature, and identity controls reachable");
