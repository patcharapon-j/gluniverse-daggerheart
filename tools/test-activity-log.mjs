/**
 * The activity log's store, and the two things about it that fail silently.
 *
 * **Who writes.** The record is a world setting, so only the active GM may
 * append; every other client has to return having done nothing. Get that
 * wrong in one direction and a table with two GMs keeps every entry twice, in
 * the other and a player's client throws on every change they make.
 *
 * **That an append is a read and then a write.** The ledger buffers per actor,
 * so an area attack on three characters closes three windows in one tick.
 * Without a queue two of the three read the store before the first has written
 * it and are lost — and only when the most is going on, which is the worst
 * time for a record to be quietly short. It is the shape of bug that never
 * shows up in a test somebody ran by hand.
 *
 * And the escaping, which is the one thing the move out of chat took away: a
 * posted card went through Foundry's sanitiser on the way into the database
 * and this draws into our own window instead.
 */

import assert from "node:assert/strict";

/* ── a Foundry, in the shape these functions actually use ─────────────── */

const store = new Map([
  ["gluniverse-daggerheart.activity", []],
  ["gluniverse-daggerheart.changeLog", true],
]);

/* Deliberately slow, and by a real turn of the event loop rather than a
   resolved promise: the failure being ratcheted is two appends interleaving
   across an await, and a `set` that resolves immediately cannot interleave. */
const settings = {
  get: (ns, key) => store.get(`${ns}.${key}`),
  set: async (ns, key, value) => {
    await new Promise((done) => setTimeout(done, 1));
    store.set(`${ns}.${key}`, value);
    return value;
  },
};

const gm = { id: "gm", isGM: true };
const player = { id: "player", isGM: false };

globalThis.game = {
  settings,
  user: gm,
  users: { activeGM: gm },
  i18n: {
    lang: "en",
    localize: (k) => k,
    format: (k, data) => `${k}:${JSON.stringify(data)}`,
  },
};

let ids = 0;
globalThis.foundry = {
  utils: {
    randomID: () => `id${++ids}`,
    escapeHTML: (s) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;"),
  },
};

const { activityLog, panel, recordActivity } = await import("../src/module/activity-log.ts");

const hp = (from, to) => [{ kind: "hitPoints", from, to, max: 6 }];
const reset = () => store.set("gluniverse-daggerheart.activity", []);

/* ── who writes ───────────────────────────────────────────────────────── */

game.user = player;
await recordActivity("Kaelen Vos", hp(1, 2));
assert.equal(activityLog().length, 0, "a player's client must record nothing");

game.user = { id: "gm2", isGM: true };
await recordActivity("Kaelen Vos", hp(1, 2));
assert.equal(activityLog().length, 0, "a second GM must not append beside the active one");

game.user = gm;
await recordActivity("Kaelen Vos", hp(1, 2));
assert.equal(activityLog().length, 1, "the active GM keeps the record");
assert.equal(activityLog()[0].who, "Kaelen Vos");
assert.equal(activityLog()[0].entries.length, 1);
assert.ok(activityLog()[0].id, "every entry is identified, because the window diffs on it");
assert.ok(activityLog()[0].at > 0, "and timed, because a record says when");

/* Nothing that settled to nothing. `flush` already drops a net of zero, and
   an empty entry list reaching here would be a row with no rows in it. */
reset();
await recordActivity("Kaelen Vos", []);
assert.equal(activityLog().length, 0, "an empty window is not an event");

/* ── an append is a read and then a write ─────────────────────────────── */

reset();
await Promise.all([
  recordActivity("Kaelen Vos", hp(1, 2)),
  recordActivity("Sena Wrenlow", hp(3, 4)),
  recordActivity("Orin Hale", hp(5, 6)),
]);
assert.deepEqual(
  activityLog().map((e) => e.who),
  ["Kaelen Vos", "Sena Wrenlow", "Orin Hale"],
  "three windows closing in one tick are three entries, in the order they closed",
);

/* ── the cap ──────────────────────────────────────────────────────────── */

reset();
for (let i = 0; i < 105; i++) await recordActivity(`Who ${i}`, hp(0, 1));
const capped = activityLog();
assert.equal(capped.length, 100, "the log keeps a hundred");
assert.equal(capped[0].who, "Who 5", "and it is the hundred most recent");
assert.equal(capped.at(-1).who, "Who 104");

/* ── what reaches the markup ──────────────────────────────────────────── */

reset();
await recordActivity('<img src=x onerror="boom">', [
  { kind: "pool", label: "<b>Twilight</b> Toll", name: '"tokens"', from: 1, to: 2, max: 3 },
]);
const html = panel();
assert.ok(!html.includes("<img src=x"), "a character's name is text, not markup");
assert.ok(!html.includes("<b>Twilight</b>"), "and so is a card's");
assert.ok(html.includes("&lt;img src=x"), "both arrive escaped rather than dropped");
assert.ok(html.includes("&quot;tokens&quot;"), "including what a counter is called");

/* The head says how many, the body says what. Both are drawn from the store
   rather than counted anywhere else, which is what stops the two disagreeing. */
assert.ok(html.includes("DAGGERHEART.Activity.Count"), "the head carries the count");
assert.ok(!html.includes("acnil"), "and no empty state, because there is an entry");
assert.ok(!html.includes("acoff"), "and no banner, because it is watching");

reset();
const empty = panel();
assert.ok(empty.includes("acnil"), "an empty log says so");
assert.ok(empty.includes("DAGGERHEART.Activity.None"), "and says none rather than nothing");

store.set("gluniverse-daggerheart.changeLog", false);
const paused = panel();
assert.ok(paused.includes("acoff"), "a paused log says that instead");
assert.ok(
  paused.includes('aria-pressed="false"'),
  "and the press it is about says it twice, because an empty window cannot",
);

console.log(
  "activity log: the active GM writes, appends serialise, the cap holds and names arrive as text",
);
