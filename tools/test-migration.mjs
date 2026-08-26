/**
 * The world migration, and the things about it that fail silently.
 *
 * A migration is the one piece of a system that runs once, unattended, on
 * somebody else's data, with nobody watching — so every one of its failure
 * modes is invisible at the moment it happens and expensive afterwards.
 * These are the ones worth ratcheting:
 *
 * **Who writes.** `ready` fires on every connected client. Four clients
 * agreeing to rewrite the same forty cards is four writes and a race, which
 * is `applyFear`'s and `syncVulnerable`'s argument arriving a fourth time.
 *
 * **Idempotence.** The stamp is what normally stops a second run, but a GM
 * can force one, a restored backup can arrive stamped low, and a step that
 * throws leaves the stamp behind deliberately. So running twice must be
 * indistinguishable from running once — and the shape that breaks it is an
 * *appending* erratum whose search fragment is a prefix of its own
 * replacement, which appends the sentence again every time.
 *
 * **That an edited document is left alone.** A GM who rewrote a card for
 * their table must keep their rewrite. There is no provenance field on an
 * Item to consult, so the old text is the only evidence that nobody has
 * touched it — and a migration that clobbers homebrew is unrecoverable in a
 * way one that skips a card is not.
 *
 * **That a shared feature name is told apart by its parent.** "Relentless (2)"
 * is printed on dozens of stat blocks and only one of them has the doubled
 * word SRD 2.0 corrects. The old-text gate keeps the others from being
 * rewritten; without the parent's name they are all *reported* as edited
 * documents, which is a migration telling a GM that forty of their
 * adversaries have been touched when none has.
 *
 * **That arrays are never addressed by index.** Foundry reads a dotted index
 * in an update key as a path into an *object*, which is the trap the adjust
 * tab learned about Experiences and `moveResource` learned about pools. Rules
 * text lives in `classFeatures[]` and `features[]` as readily as in
 * `description`, so this is not hypothetical.
 *
 * **That a failure does not stamp.** A half-finished migration that recorded
 * itself as finished is unrecoverable without somebody knowing to force it.
 *
 * Run: node --experimental-strip-types tools/test-migration.mjs
 */

import assert from "node:assert/strict";

/* ── a Foundry, in the shape these functions actually use ─────────────── */

const store = new Map([["gluniverse-daggerheart.dataVersion", 0]]);

const settings = {
  get: (ns, key) => store.get(`${ns}.${key}`),
  set: async (ns, key, value) => {
    store.set(`${ns}.${key}`, value);
    return value;
  },
};

const gm = { id: "gm", isGM: true };
const player = { id: "player", isGM: false };

/** Every update key any write was handed, so the index test can inspect them. */
let writtenKeys = [];
/** Set to a message to make the next write throw, for the failure test. */
let breakWrites = null;

const setPath = (obj, path, value) => {
  const parts = path.split(".");
  let node = obj;
  for (const p of parts.slice(0, -1)) node = node[p] ??= {};
  node[parts.at(-1)] = value;
};

const applyUpdates = (items, updates) => {
  if (breakWrites) throw new Error(breakWrites);
  for (const u of updates) {
    const item = items.find((i) => i.id === u._id);
    for (const [k, v] of Object.entries(u)) {
      if (k === "_id") continue;
      writtenKeys.push(k);
      setPath(item, k, v);
    }
  }
};

const item = (id, type, name, system) => ({ id, type, name, system });

const actor = (name, items) => {
  const a = {
    name,
    items,
    updateEmbeddedDocuments: async (_type, updates) => applyUpdates(items, updates),
  };
  /* Foundry gives an embedded document a `parent`, and the migration reads
     `item.parent?.name` to tell one adversary's "Relentless (2)" from another
     thirty. A stub without it would pass the disambiguation test by accident. */
  for (const i of items) i.parent = a;
  return a;
};

globalThis.Item = { updateDocuments: async (updates) => applyUpdates(worldItems, updates) };

let worldItems = [];
let actors = [];
let scenes = [];

globalThis.ui = { notifications: { info: () => {}, warn: () => {}, error: () => {} } };

globalThis.foundry = {
  utils: {
    getProperty: (obj, path) =>
      path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj),
  },
};

globalThis.game = {
  settings,
  user: gm,
  users: { activeGM: gm },
  system: { version: "1.11.0" },
  i18n: { localize: (k) => k, format: (k, d) => `${k}:${JSON.stringify(d)}` },
  get items() {
    return new Set(worldItems);
  },
  get actors() {
    return new Set(actors);
  },
  get scenes() {
    return new Set(scenes);
  },
};

const { migrateWorld, migrateOnReady, LATEST_DATA_VERSION } = await import(
  "../src/module/migration/index.ts"
);

const version = () => store.get("gluniverse-daggerheart.dataVersion");
const reset = (v = 0) => {
  store.set("gluniverse-daggerheart.dataVersion", v);
  writtenKeys = [];
  breakWrites = null;
  worldItems = [];
  actors = [];
  scenes = [];
};

/* The pre-errata text, exactly as `rt()` rendered it before SRD 2.0. Anything
   that stops matching here is the corpus moving, which is
   `check-migration-errata.mjs`'s job to catch against the real packs; this
   file's job is the behaviour around it. */
const OLD_WHIRLWIND =
  "<p>When you make a successful attack against a target within Very Close range, " +
  "you can <b>spend a Hope</b> to use the attack against all other targets " +
  "within Very Close range.</p>";
const NEW_TAIL = "All additional adversaries you succeed against with this ability take half damage.";

const whirlwind = (id = "w1") =>
  item(id, "domainCard", "Whirlwind", { domain: "blade", level: 1, description: OLD_WHIRLWIND });

const savor = (id = "s1") =>
  item(id, "domainCard", "Savor the Anguish", {
    domain: "dread",
    cardType: "spell",
    description: "<p>When an adversary within Close range takes Severe damage, you can clear a Stress.</p>",
  });

/* ── who writes ───────────────────────────────────────────────────────── */

reset();
const kesh = actor("Kesh", [whirlwind()]);
actors = [kesh];

game.user = player;
await migrateOnReady();
assert.equal(version(), 0, "a player's client must migrate nothing");
assert.ok(kesh.items[0].system.description.includes("</p>"), "and must not write");
assert.ok(!kesh.items[0].system.description.includes(NEW_TAIL));

game.user = { id: "gm2", isGM: true };
await migrateOnReady();
assert.equal(version(), 0, "a second GM must not migrate beside the active one");

game.user = gm;
await migrateOnReady();
assert.equal(version(), LATEST_DATA_VERSION, "the active GM migrates and stamps");
assert.ok(
  kesh.items[0].system.description.includes(NEW_TAIL),
  "Whirlwind gains the sentence SRD 2.0 added",
);

/* ── idempotence, which is the whole reason the fragment is anchored ──── */

const once = kesh.items[0].system.description;
await migrateWorld({ force: true });
assert.equal(
  kesh.items[0].system.description,
  once,
  "a forced second run must be a no-op — an appending erratum must not append twice",
);
const twice = kesh.items[0].system.description;
await migrateWorld({ force: true });
assert.equal(kesh.items[0].system.description, twice, "and a third");
assert.equal(
  (once.match(/take half damage/g) ?? []).length,
  1,
  "the sentence appears exactly once however many times the migration runs",
);

/* ── an edited document is left alone and named ───────────────────────── */

reset();
const homebrew = "<p>Whirlwind, but the way our table plays it.</p>";
const bex = actor("Bex", [item("w2", "domainCard", "Whirlwind", { description: homebrew })]);
actors = [bex];

let report = await migrateWorld();
assert.equal(bex.items[0].system.description, homebrew, "somebody's rewrite is not clobbered");
assert.equal(report.changed, 0);
assert.equal(report.skipped.length, 1, "and the skip is reported rather than swallowed");
assert.ok(report.skipped[0].includes("Whirlwind"), "named, so a GM can act on it");
assert.ok(report.skipped[0].includes("Bex"), "and located");

/* A card that has ALREADY been corrected is not a skip — it is simply done,
   and reporting it would tell every GM that forty documents were "edited". */
reset();
const done = actor("Done", [
  item("w3", "domainCard", "Whirlwind", {
    description: OLD_WHIRLWIND.replace("</p>", ` ${NEW_TAIL}</p>`),
  }),
]);
actors = [done];
report = await migrateWorld();
assert.equal(report.changed, 0, "an already-corrected card is not rewritten");
assert.equal(report.skipped.length, 0, "and is not reported as edited");

/* ── the field fix is gated on the superseded value ───────────────────── */

reset();
const dread = actor("Dread", [savor(), item("s2", "domainCard", "Savor the Anguish", {
  cardType: "grimoire",
  description: "<p>Rewritten by the GM.</p>",
})]);
actors = [dread];
report = await migrateWorld();
assert.equal(dread.items[0].system.cardType, "ability", "a Spell becomes an Ability");
assert.equal(
  dread.items[1].system.cardType,
  "grimoire",
  "a card type somebody else set is left where it is",
);
assert.equal(report.skipped.length, 1, "and that one is reported");

/* ── arrays are rebuilt whole, never addressed by index ───────────────── */

reset();
const nested = actor("Nested", [
  item("n1", "domainCard", "Whirlwind", {
    description: "<p>unrelated</p>",
    features: [{ name: "a", description: "<p>nothing</p>" }, { name: "b", description: OLD_WHIRLWIND }],
  }),
]);
actors = [nested];
await migrateWorld();
assert.ok(
  nested.items[0].system.features[1].description.includes(NEW_TAIL),
  "text inside an array is reached",
);
assert.ok(
  nested.items[0].system.features[0].description === "<p>nothing</p>",
  "and its siblings are carried through untouched",
);
assert.ok(
  writtenKeys.every((k) => !/\.\d+(\.|$)/.test(k)),
  `no update key may address an array by index — got ${JSON.stringify(writtenKeys)}`,
);
assert.ok(
  writtenKeys.includes("system.features"),
  "the array is written whole, at its own path",
);

/* ── a shared feature name is told apart by its parent ────────────────
   "Relentless (2)" is printed on dozens of stat blocks and only the Battle
   Box's copy has the doubled word. The old-text gate alone would keep the
   others from being *rewritten* — but every one of them would be reported as
   an edited document, which is a migration telling a GM that forty of their
   adversaries have been touched when none has. */

reset();
const relentless = (parentName, text) =>
  actor(parentName, [item(`r-${parentName}`, "feature", "Relentless (2)", { description: text })]);

const box = relentless("Battle Box", "<p>The Box can be spotlighted up to two times times per GM turn.</p>");
const other = relentless("Chaos Weaver", "<p>Spotlight this adversary up to three times per GM turn.</p>");
actors = [box, other];

report = await migrateWorld();
assert.ok(
  box.items[0].system.description.includes("up to two times per GM turn"),
  "the Battle Box's doubled word is fixed",
);
assert.ok(
  !box.items[0].system.description.includes("times times"),
  "and the duplicate is gone",
);
assert.equal(
  other.items[0].system.description,
  "<p>Spotlight this adversary up to three times per GM turn.</p>",
  "another adversary's Relentless (2) is untouched",
);
assert.equal(
  report.skipped.length,
  0,
  "and is NOT reported as edited — the parent name is what tells them apart",
);

/* ── every population is reached ──────────────────────────────────────── */

reset();
worldItems = [whirlwind("world1")];
const linked = { name: "Linked", isLinked: true, actor: actor("Linked", [whirlwind("l1")]) };
const loose = { name: "Loose", isLinked: false, actor: actor("Loose", [whirlwind("u1")]) };
scenes = [{ name: "Cave", tokens: [linked, loose] }];
actors = [actor("Sheet", [whirlwind("a1")])];

report = await migrateWorld();
assert.equal(worldItems[0].system.description.includes(NEW_TAIL), true, "a world Item is reached");
assert.equal(
  actors[0].items[0].system.description.includes(NEW_TAIL),
  true,
  "an Item on an Actor is reached",
);
assert.equal(
  loose.actor.items[0].system.description.includes(NEW_TAIL),
  true,
  "and an Item on an UNLINKED token, which game.actors cannot see",
);
assert.equal(
  linked.actor.items[0].system.description.includes(NEW_TAIL),
  false,
  "a linked token is skipped — its Actor was already walked, and writing twice is a race",
);

/* ── a failure keeps the stamp where it was ───────────────────────────── */

reset();
actors = [actor("Doomed", [whirlwind()])];
breakWrites = "the database said no";
report = await migrateWorld();
assert.ok(report.failed.length, "a write that throws is recorded as a failure");
assert.equal(version(), 0, "and the stamp does NOT move, so the next launch retries");

/* ── a new world is stamped rather than walked ────────────────────────── */

reset();
report = await migrateWorld();
assert.equal(version(), LATEST_DATA_VERSION, "an empty world is stamped");
assert.equal(report.inspected, 0, "without walking anything");
assert.ok(
  report.notes.join(" ").includes("New world"),
  "and says which of the two it was, because a future step must not fire for a " +
    "world created after the shape it fixes stopped existing",
);

/* ── a dry run reports without writing ────────────────────────────────── */

reset();
const dry = actor("Dry", [whirlwind()]);
actors = [dry];
report = await migrateWorld({ dryRun: true });
assert.equal(report.changed, 1, "a dry run counts what it would do");
assert.ok(!dry.items[0].system.description.includes(NEW_TAIL), "and writes nothing");
assert.equal(version(), 0, "and does not stamp");

console.log(
  `test-migration: ${LATEST_DATA_VERSION} step(s) — who writes, idempotence, homebrew, ` +
    `shared feature names, array paths, all three populations, failure, empty world, ` +
    `dry run.`,
);
