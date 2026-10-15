/**
 * The Gunslinger, Corsair and the Flint deck, as they ship.
 *
 * Nothing upstream publishes these, so `check-cards.mjs` skips them and the
 * coverage ratchets (`check-actions`, `check-resources`, `check-card-damage`,
 * `check-passives`) only prove every rule unit was *read*. This asserts the
 * things a reading cannot: the shape the design in `homebrew/gunslinger/`
 * settled on, that the deck is wired as a domain everywhere a domain has to
 * be, and that the presses a table leans on are the ones it gets.
 *
 *     node --experimental-strip-types tools/check-gunslinger.mjs
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import ALL, { FLINT, GUNSLINGER_CLASSES } from "../src/packs-src/gluniverse-gunslinger.mjs";
import CLASSES from "../src/packs-src/classes.mjs";
import DOMAINS_PACK from "../src/packs-src/domains.mjs";
import { CONDITIONS, DOMAINS, DOMAIN_CONFIG, SYSTEM_ID } from "../src/module/config.ts";
import { byslug, CLASSES as CLASS_MARKS } from "../src/module/ui/domains.js";
import { SOURCES } from "../src/module/content.ts";
import { traitPassiveTotal } from "../src/module/data/modifiers.ts";

globalThis.foundry = { abstract: { TypeDataModel: class {} }, utils: { getRoute: (path) => path } };
const { cardOf } = await import("../src/module/sheets/cards.ts");

const SOURCE = (d) => d.flags?.[SYSTEM_ID]?.source;
const named = (name) => ALL.find((d) => d.name === name);
const block = (doc, name) =>
  [...(doc.system.classFeatures ?? []), doc.system.hopeFeature, ...(doc.system.features ?? [])]
    .find((b) => b?.name === name);
const shipped = (name) => [...CLASSES, ...DOMAINS_PACK].find((d) => d.name === name);

/* ── the class ────────────────────────────────────────────────────── */
const cls = named("Gunslinger");
assert.equal(cls.type, "class");
assert.deepEqual(cls.system.domains, { primary: "flint", secondary: "bone" });
assert.equal(cls.system.startingEvasion, 11);
assert.equal(cls.system.startingHitPoints, 6);
assert.equal(cls.system.hopeFeature.name, "Quickdraw");
assert.deepEqual(cls.system.classFeatures.map((f) => f.name), ["Call Your Shot"]);
assert.equal(cls.system.backgroundQuestions.length, 3);
assert.equal(cls.system.connectionQuestions.length, 3);
assert.match(cls.system.suggestedTraits, /Finesse \+2/);
assert.equal(cardOf(cls, {}).cls, "grow", "Call Your Shot's four options need the expandable card");

/* ── the subclass ─────────────────────────────────────────────────── */
const corsair = GUNSLINGER_CLASSES.filter((d) => d.type === "subclass");
assert.deepEqual(corsair.map((d) => d.system.rank), ["foundation", "specialization", "mastery"]);
for (const card of corsair) {
  assert.equal(card.system.subclassName, "Corsair");
  assert.equal(card.system.className, "Gunslinger");
  assert.equal(card.system.spellcastTrait, "", "the Gunslinger casts nothing");
  assert.equal(card.system.features.length, 2);
}
const sub = cardOf(corsair[0], {});
assert.equal(sub.d.slug, "flint");
assert.equal(sub.d2.slug, "bone");

/* ── the deck ─────────────────────────────────────────────────────── */
assert.equal(FLINT.length, 21);
for (let level = 1; level <= 10; level++) {
  assert.equal(FLINT.filter((c) => c.system.level === level).length, level === 1 ? 3 : 2, `level ${level}`);
}
const RECALL = {
  "Draw a Bead": 0, "Under Fire": 1, "Cold Read": 0, "Long Shot": 1, "Name the Stakes": 1,
  "Covering Fire": 1, "Grit": 1, "Trick Shot": 1, "Stare Down": 1, "Pick Your Spot": 1,
  "All In": 2, "Shoot It Out of Their Hand": 2, "Nothing Left to Lose": 1, "Flint-Touched": 1,
  "Steady Hand": 1, "Killshot": 2, "Poker Face": 1, "Through and Through": 2, "Parley": 2,
  "Deadeye": 2, "Last Word": 3,
};
assert.deepEqual(Object.fromEntries(FLINT.map((c) => [c.name, c.system.recallCost])), RECALL);
for (const card of FLINT) {
  assert.equal(card.system.domain, "flint");
  assert.equal(card.system.cardType, "ability", "Flint is all abilities");
  assert.equal(card.folder, "Flint");
}
/* One token card per domain, as the Homebrew Kit asks. */
const piles = FLINT.filter((c) => /\btokens?\b/i.test(c.system.description));
assert.deepEqual(piles.map((c) => c.name), ["Grit"]);

/* ── a domain everywhere a domain has to be ───────────────────────── */
assert.ok(DOMAINS.includes("flint"));
assert.ok(DOMAINS.includes("artifice"), "the retired deck stays registered so held cards still load");
assert.equal(DOMAIN_CONFIG.flint.light, byslug.flint.light);
assert.equal(DOMAIN_CONFIG.flint.dark, byslug.flint.dark);
assert.ok(CLASS_MARKS.includes("gunslinger"));
for (const path of [
  "design/assets/domains/flint.svg", "assets/domains/flint.svg",
  "design/assets/classes/gunslinger.svg", "assets/classes/gunslinger.svg",
]) {
  assert.ok(existsSync(path), `${path} is missing`);
  assert.match(readFileSync(path, "utf8"), /fill="currentColor"/, `${path} must take its colour`);
}

/* ── filed with the books, switched with our homebrew ─────────────── */
for (const d of ALL) assert.equal(SOURCE(shipped(d.name)), "gluniverse", `${d.name} is not stamped`);
assert.deepEqual(SOURCES.find((s) => s.id === "gluniverse").domains, ["flint"]);
assert.ok(!SOURCES.some((s) => s.id === "gunslinger"), "the 0.1 package's switch is retired");
const manifest = JSON.parse(readFileSync("system.json", "utf8"));
assert.ok(!manifest.packs.some((p) => p.name.startsWith("gunslinger")), "the 0.1 packs are retired");

/* ── the presses a table leans on ─────────────────────────────────── */
const built = (name) => shipped(name);
const quick = block(built("Gunslinger"), "Quickdraw").actions;
assert.deepEqual(quick.map((a) => [a.kind, a.amount?.hope]), [["pay", 3]]);
const called = block(built("Gunslinger"), "Call Your Shot").actions;
assert.deepEqual(
  called.map((a) => [a.kind, a.amount.stress, a.steps[0].condition]),
  [["pay", 1, "vulnerable"], ["pay", 1, "restrained"]],
  "Expose and Pin each cost a Stress and put their condition on the target",
);
const suppress = built("Covering Fire").system.actions.find((a) => a.kind === "apply-condition");
assert.equal(suppress.condition, "suppressed");
assert.ok(CONDITIONS.some((c) => c.id === "suppressed"), "Suppressed is a registered condition");

const grit = built("Grit").system.resources;
assert.equal(grit.length, 1);
assert.deepEqual(
  [grit[0].max.kind, grit[0].refresh, grit[0].onRefresh, grit[0].value],
  ["proficiency", "longRest", "clear", 0],
);

/* Every "once per" in the deck and the subclass is a budget a press spends. */
const BUDGETED = {
  "Cold Read": "rest", "Name the Stakes": "rest", "Stare Down": "rest", "All In": "longRest",
  "Flint-Touched": "rest", "Poker Face": "session", "Through and Through": "rest",
  "Parley": "session", "Deadeye": "longRest",
};
for (const [name, scope] of Object.entries(BUDGETED)) {
  const doc = built(name);
  const use = doc.system.resources?.find((r) => r.name === "Use");
  assert.equal(use?.refresh, scope, `${name} budget`);
  assert.ok(
    doc.system.actions.some((a) => a.kind === "move-resource" && a.resource === "Use" ||
      a.steps?.some((s) => s.kind === "move-resource" && s.resource === "Use")),
    `${name}: no press spends its use`,
  );
}
const corsairBudgets = corsair.map((c) => built(c.name).system.resources.map((r) => [r.feature, r.refresh]));
assert.deepEqual(corsairBudgets, [[["Unshackled", "rest"]], [["All Hands", "longRest"]], [["Infamy", "longRest"]]]);

/* Flint-Touched's +1 Finesse holds with four Flint cards in the loadout and not three. */
const own = (item) => ({ ...structuredClone(item), id: item.name, system: { ...structuredClone(item.system), inLoadout: true } });
const touched = own(built("Flint-Touched"));
const actor = { items: [touched, ...FLINT.slice(0, 3).map(own)] };
assert.equal(traitPassiveTotal(actor, "finesse"), 1);
actor.items.pop();
assert.equal(traitPassiveTotal(actor, "finesse"), 0);

console.log(
  `Gunslinger: the class, Corsair's ${corsair.length} cards and Flint's ${FLINT.length} are shaped, ` +
    "registered, stamped gluniverse and carry their presses, budgets, pile and passive.",
);
