/**
 * Does the content library reach every document, and does it say no correctly?
 *
 * A source with no switch is invisible from the table: its documents simply
 * go on being offered after their book was turned off, and nothing on screen
 * says why. So this asserts the three places a source has to agree:
 *
 *   1. `SOURCES` in `src/module/content.ts` and `CONTENT_SOURCES` in
 *      `scripts/build-packs.mjs` name the same ids. The build script runs on
 *      bare node and cannot import TypeScript, so it restates them; read here
 *      as text, because importing it would build the packs.
 *   2. Every document in a pack that holds more than one source carries its
 *      own stamp. A single-source pack may lean on its pack default.
 *   3. Every source's label and hint resolve in `lang/en.json`.
 *
 * Then the behaviour, against a stub Foundry: a disabled book stops being
 * offered and an owned copy of it does not; a variant and the Gunslinger
 * still read and write their own settings; a homebrew pack is its own source;
 * a mixed pack stays while anything in it is on; and only a GM writes.
 *
 *     node --experimental-strip-types tools/check-content.mjs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import CLASSES from "../src/packs-src/classes.mjs";
import HERITAGE from "../src/packs-src/heritage.mjs";
import DOMAINS from "../src/packs-src/domains.mjs";
import EQUIPMENT from "../src/packs-src/equipment.mjs";
import ADVERSARIES from "../src/packs-src/adversaries.mjs";
import ENVIRONMENTS from "../src/packs-src/environments.mjs";
import VARIANTS_PACK from "../src/packs-src/variants.mjs";

const content = await import("../src/module/content.ts");
const {
  SOURCES, sourceOf, sourceEnabled, contentChoiceAllowed, contentPackAllowed,
  domainAvailable, setSourceEnabled, DISABLED_SOURCES, DISABLED_PACKS, GUNSLINGER_SETTING,
} = content;

const SYSTEM_ID = "gluniverse-daggerheart";

/* ── 1. the two lists agree ───────────────────────────────────────── */
const build = readFileSync("scripts/build-packs.mjs", "utf8");
const block = /export const CONTENT_SOURCES = \[([\s\S]*?)\n\];/.exec(build)?.[1];
assert.ok(block, "CONTENT_SOURCES not found in build-packs.mjs");
const [direct, inner = ""] = block.split("...[");
const quoted = (s) => [...s.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const built = [...quoted(direct), ...quoted(inner.split("]")[0]).map((v) => `variant:${v}`)];
assert.deepEqual(
  [...built].sort(),
  SOURCES.map((s) => s.id).sort(),
  "build-packs.mjs CONTENT_SOURCES and content.ts SOURCES disagree",
);

/* ── 2. every document in a mixed pack is stamped ─────────────────── */
const MIXED = { classes: CLASSES, heritage: HERITAGE, domains: DOMAINS, equipment: EQUIPMENT,
  adversaries: ADVERSARIES, environments: ENVIRONMENTS, variants: VARIANTS_PACK };
const tally = {};
for (const [pack, docs] of Object.entries(MIXED)) {
  for (const d of docs) {
    const s = d.flags?.[SYSTEM_ID]?.source;
    assert.ok(built.includes(s), `${pack}: "${d.name}" carries source ${JSON.stringify(s)}`);
    tally[s] = (tally[s] ?? 0) + 1;
  }
}
/* The shape of the corpus, so a stamp moved onto the wrong run fails here
   rather than quietly switching a book's documents with another book. */
assert.equal(DOMAINS.filter((d) => d.flags[SYSTEM_ID].source === "core").length, 189);
assert.equal(DOMAINS.filter((d) => d.flags[SYSTEM_ID].source === "hopeAndFear").length, 21);
assert.equal(DOMAINS.filter((d) => d.flags[SYSTEM_ID].source === "twilightMarked").length, 42);
assert.ok(CLASSES.some((d) => d.name === "Assassin" && d.flags[SYSTEM_ID].source === "hopeAndFear"));
assert.ok(CLASSES.some((d) => d.name === "Wizard" && d.flags[SYSTEM_ID].source === "core"));
assert.ok(VARIANTS_PACK.every((d) => d.flags[SYSTEM_ID].source.startsWith("variant:")));

/* ── 3. every label resolves ──────────────────────────────────────── */
const lang = JSON.parse(readFileSync("lang/en.json", "utf8"));
const resolve = (key) => key.split(".").reduce((o, k) => o?.[k], lang);
for (const s of SOURCES) {
  assert.equal(typeof resolve(s.label), "string", `missing ${s.label}`);
  assert.equal(typeof resolve(s.hint), "string", `missing ${s.hint}`);
}

/* ── behaviour ────────────────────────────────────────────────────── */
const store = { [DISABLED_SOURCES]: [], [DISABLED_PACKS]: [], [GUNSLINGER_SETTING]: false, grimdark: false };
let isGM = true;
const writes = [];
const packs = new Map();
packs[Symbol.iterator] = function* () { yield* this.values(); };
globalThis.game = {
  user: { get isGM() { return isGM; } },
  packs,
  settings: {
    get: (_id, key) => store[key],
    set: async (_id, key, value) => { writes.push(key); store[key] = value; },
  },
};
const stamp = (source, extra = {}) => ({ flags: { [SYSTEM_ID]: { source } }, ...extra });
const pack = (collection, entries) => packs.set(collection, { collection, index: entries });

// A book switched off stops being offered; an owned copy keeps working.
const dread = stamp("hopeAndFear", { pack: `${SYSTEM_ID}.domains` });
assert.equal(contentChoiceAllowed(dread), true);
await setSourceEnabled("hopeAndFear", false);
assert.deepEqual(store[DISABLED_SOURCES], ["hopeAndFear"]);
assert.equal(contentChoiceAllowed(dread), false);
assert.equal(contentChoiceAllowed({ ...dread, parent: { documentName: "Actor" } }), true, "owned copies are never refused");
assert.equal(domainAvailable("dread"), false);
assert.equal(domainAvailable("grace"), true);

// A mixed pack stays while anything in it is on, and goes when nothing is.
pack(`${SYSTEM_ID}.domains`, [stamp("core"), stamp("hopeAndFear")]);
assert.equal(contentPackAllowed(`${SYSTEM_ID}.domains`), true);
await setSourceEnabled("core", false);
assert.equal(contentPackAllowed(`${SYSTEM_ID}.domains`), false);
await setSourceEnabled("core", true);
await setSourceEnabled("hopeAndFear", true);
assert.deepEqual(store[DISABLED_SOURCES], [], "switching back on empties the list");

// The old switches keep their own settings, and the library writes them.
assert.equal(sourceEnabled("variant:grimdark"), false);
await setSourceEnabled("variant:grimdark", true);
assert.equal(store.grimdark, true);
assert.equal(sourceEnabled("variant:grimdark"), true);
assert.equal(sourceEnabled("gunslinger"), false);
assert.equal(sourceOf({ flags: { [SYSTEM_ID]: { contentPackage: "gunslinger" } } }), "gunslinger", "older Gunslinger marker");
await setSourceEnabled("gunslinger", true);
assert.equal(store[GUNSLINGER_SETTING], true);

// Somebody else's pack is its own source, including a world copy imported from it.
const foreign = { pack: "world.bestiary" };
assert.equal(sourceOf(foreign), "pack:world.bestiary");
assert.equal(sourceOf({ _stats: { compendiumSource: "Compendium.world.bestiary.Actor.abc" } }), "pack:world.bestiary");
await setSourceEnabled("pack:world.bestiary", false);
assert.equal(contentChoiceAllowed(foreign), false);
assert.equal(contentPackAllowed("world.bestiary"), false);

// A document a GM made in the world belongs to no source and is always offered.
assert.equal(sourceOf({ name: "Homebrew blade" }), null);
assert.equal(contentChoiceAllowed({ name: "Homebrew blade" }), true);

// An index carrying the flag flattened, which is one way Foundry hands it over.
assert.equal(sourceOf({ [`flags.${SYSTEM_ID}.source`]: "twilightMarked" }), "twilightMarked");

// Only a GM writes.
isGM = false;
const before = writes.length;
await setSourceEnabled("core", false);
assert.equal(writes.length, before, "a player's press writes nothing");

// Settings not registered yet read as everything on.
globalThis.game.settings.get = () => { throw new Error("not registered"); };
assert.equal(sourceEnabled("core"), true);

console.log(
  `Content library: ${SOURCES.length} sources agree with the build; ` +
    Object.entries(tally).map(([s, n]) => `${s} ${n}`).join(", ") +
    "; gating, owned copies, homebrew packs and GM-only writes checked.",
);
