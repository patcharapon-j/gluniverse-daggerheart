/**
 * The mark and gem drivers restart their animations with one forced layout,
 * not one per box.
 *
 * Re-firing a CSS animation means taking the class off, flushing style, and
 * putting it back — and the flush is a read of `offsetWidth`, which is a
 * forced synchronous layout of the whole document. Both drivers used to do
 * that inside their diff loop, so a Severe hit (four boxes) or the Hope
 * action (three pips) paid for three or four full layouts on the frame a
 * press has to feel instant.
 *
 * The flush is only required to sit *between* a class coming off and going
 * back on, so one serves every box that moved. This asserts both halves of
 * that: the count of flushes, which is the point, and the resulting classes,
 * which is what must not have changed. The second is the one that matters —
 * a driver that is fast and leaves a spent Hope lit is the bug `settle.js`
 * was written about, and it fails in the direction that looks like nothing
 * is wrong.
 *
 * A hand-rolled DOM, because this needs exactly four things — `classList`,
 * `dataset`, an `offsetWidth` it can count, and a `getAnimations` that says
 * nothing is playing — and a real one would be a dependency for that.
 */

import assert from "node:assert/strict";
import { setMarks } from "../design/mark.js";
import { setPool } from "../design/gem.js";

/** Reads of `offsetWidth`, across every element in a tree. */
let flushes = 0;

class El {
  constructor(cls = "") {
    this.classes = new Set(cls.split(" ").filter(Boolean));
    this.dataset = {};
    this.children = [];
    this.style = { setProperty: () => {} };
    this.classList = {
      add: (...c) => c.forEach((x) => this.classes.add(x)),
      remove: (...c) => c.forEach((x) => this.classes.delete(x)),
      contains: (c) => this.classes.has(c),
      toggle: (c, on) => (on ? this.classes.add(c) : this.classes.delete(c)),
    };
  }
  get offsetWidth() {
    flushes++;
    return 1;
  }
  /** Nothing is playing, so `settled()` resolves at once. */
  getAnimations() {
    return [];
  }
  addEventListener() {}
  removeEventListener() {}
  /** Only ever asked for the one selector each driver uses. */
  querySelectorAll() {
    return this.children;
  }
  querySelector() {
    return null;
  }
}

const row = (n, cls, marked = 0) => {
  const r = new El();
  r.children = Array.from({ length: n }, (_, i) => new El(i < marked ? cls : ""));
  return r;
};

const lit = (r) => r.children.map((b) => (b.classes.has("on") ? 1 : 0)).join("");

/* ── marks ────────────────────────────────────────────────────────────
   A Severe hit on an empty track: four boxes move, and the flush is one. */
{
  const mk = row(7, "on");
  flushes = 0;
  setMarks(mk, 4);
  assert.equal(flushes, 1, "a four-box hit forces one layout, not four");
  assert.equal(lit(mk), "1111000");
  for (const b of mk.children.slice(0, 4)) {
    assert.ok(b.classes.has("hit"), "every box that landed plays its strike");
    assert.equal(b.dataset.seq, "1", "and carries the token that cancels it");
  }
  assert.ok(!mk.children[4].classes.has("hit"), "a box that did not move is untouched");
}

/* Clearing the whole track on a rest — the other direction, same rule. */
{
  const mk = row(7, "on", 7);
  flushes = 0;
  setMarks(mk, 0);
  assert.equal(flushes, 1, "clearing seven boxes forces one layout, not seven");
  assert.equal(lit(mk), "0000000");
  assert.ok(mk.children.every((b) => b.classes.has("clr")));
}

/* Nothing moved: no flush at all, because there is nothing to restart. */
{
  const mk = row(7, "on", 3);
  flushes = 0;
  setMarks(mk, 3);
  assert.equal(flushes, 0, "a no-op forces no layout");
}

/* A box already carrying a spent strike restarts rather than resuming — the
   class is off before the flush and back on after it. */
{
  const mk = row(7, "on", 2);
  mk.children[2].classes.add("clr");
  setMarks(mk, 3);
  assert.ok(mk.children[2].classes.has("on"));
  assert.ok(mk.children[2].classes.has("hit"));
  assert.ok(!mk.children[2].classes.has("clr"), "the stale strike came off");
}

/* ── gems ─────────────────────────────────────────────────────────────
   The Hope action spends three at once. */
{
  const pool = row(6, "on", 6);
  pool.children.forEach((g) => g.classes.add("gem"));
  flushes = 0;
  setPool(pool, 3);
  assert.equal(flushes, 1, "spending three pips forces one layout, not three");
  for (const g of pool.children.slice(3)) {
    assert.ok(g.classes.has("spend"), "a spent pip collapses");
    assert.ok(g.classes.has("on"), "and keeps `on` until it has");
  }
}

/* A scarred pip is not a pip this may touch, however the count moves. */
{
  const pool = row(6, "on", 6);
  pool.children.forEach((g) => g.classes.add("gem"));
  pool.children[5].classes.add("scar");
  setPool(pool, 2);
  assert.ok(!pool.children[5].classes.has("spend"), "a scar is never spent");
  assert.ok(pool.children[5].classes.has("on"), "and is left exactly as it was");
}

/* A pip mid-spend still carries `on`, and must not read as "no change" when
   it is re-gained inside the collapse. */
{
  const pool = row(6, "on", 6);
  pool.children.forEach((g) => g.classes.add("gem"));
  pool.children[4].classes.add("spend");
  flushes = 0;
  setPool(pool, 6);
  assert.equal(flushes, 1, "the one pip that moved forces the one layout");
  assert.ok(pool.children[4].classes.has("gain"), "re-gaining inside a spend re-fires");
  assert.ok(!pool.children[4].classes.has("spend"), "and cancels the collapse");
}

console.log("mark and gem drivers: one forced layout per change, whatever moved");
