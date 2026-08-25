/**
 * The effects container contract.
 *
 * `registerTokenBars` replaces Foundry's `Token#_drawEffects` so our actor
 * types draw no status icons — the condition material says it better. The
 * trap is that `_drawEffects` is not only a drawing. It is where core
 * establishes an invariant the rest of `Token` reads without ever checking:
 *
 *     this.effects.bg      a live PIXI.Graphics, zIndex -1
 *     this.effects.overlay null, or the overlay icon
 *
 * `Token#_refreshEffects` opens with `this.effects.bg.clear()` and no guard.
 * `drawEffects` raises `refreshEffects` the moment `_drawEffects` returns,
 * and `refreshSize`/`refreshShape` propagate to it as well — so an override
 * that empties the container and walks away throws on the next draw, move or
 * resize, and a throw inside the token refresh takes the canvas with it.
 *
 * That is not a hypothetical. It is the bug this file exists to keep fixed,
 * and it is invisible to `tsc`: destroying a child is perfectly well typed.
 * So the assertion is not "did we skip the icons" but "did we leave core the
 * container it is about to reach into".
 */

import assert from "node:assert/strict";

/* ── the smallest Foundry that can hold the question ──────────────── */
class FakeGraphics {
  destroyed = false;
  zIndex = 0;
  clear() {
    /* Core calls this unguarded. A destroyed Graphics must never reach it. */
    if (this.destroyed) throw new Error("cleared a destroyed Graphics");
    return this;
  }
  beginFill() { return this; }
  lineStyle() { return this; }
  drawRoundedRect() { return this; }
  destroy() { this.destroyed = true; }
}

class FakeContainer {
  children = [];
  renderable = true;
  bg = null;
  overlay = null;
  addChild(child) { this.children.push(child); return child; }
  removeChildren() { const out = this.children; this.children = []; return out; }
}

/** Core's `_drawEffects`, reduced to the part that sets the contract. */
class FakeToken {
  constructor(type) {
    this.actor = { type, appliedEffects: [] };
    this.effects = new FakeContainer();
    this.barsDrawn = false;
  }
  drawBars() { this.barsDrawn = true; }
  async _drawEffects() {
    this.effects.renderable = false;
    this.effects.removeChildren().forEach((c) => c.destroy());
    this.effects.bg = this.effects.addChild(new FakeGraphics());
    this.effects.bg.zIndex = -1;
    this.effects.overlay = null;
    this.effects.addChild({ isIcon: true, destroy() {} });   // an icon we must not draw
  }
  /** Core's `_refreshEffects`, reduced to the line that punishes us. */
  _refreshEffects() { this.effects.bg.clear().beginFill().lineStyle(); }
}

globalThis.PIXI = { Graphics: FakeGraphics };
globalThis.CONFIG = { Token: { objectClass: FakeToken } };
globalThis.Hooks = { on() {}, once() {}, callAll() {} };

const { registerTokenBars } = await import("../src/module/token-hud.ts");
registerTokenBars();
const Token = CONFIG.Token.objectClass;
assert.notEqual(Token, FakeToken, "registerTokenBars must install its subclass");

/* ── ours: no icons, but the contract survives ─────────────────────── */
for (const type of ["character", "adversary", "companion", "environment"]) {
  const token = new Token(type);
  await token._drawEffects();

  assert.equal(token.effects.renderable, false, `${type}: the icon container must not render`);
  assert.ok(token.effects.bg instanceof FakeGraphics, `${type}: effects.bg must exist`);
  assert.equal(token.effects.bg.destroyed, false, `${type}: effects.bg must be live, not destroyed`);
  assert.equal(token.effects.bg.zIndex, -1, `${type}: effects.bg sits under the icons`);
  assert.equal(token.effects.overlay, null, `${type}: effects.overlay must be reset`);
  assert.equal(token.effects.children.filter((c) => c.isIcon).length, 0, `${type}: no status icon is drawn`);

  /* The line that used to throw. This is the whole point of the file. */
  assert.doesNotThrow(() => token._refreshEffects(), `${type}: core's _refreshEffects must survive our override`);

  /* Redrawing must not leave a destroyed bg behind either. */
  await token._drawEffects();
  assert.doesNotThrow(() => token._refreshEffects(), `${type}: and must survive a redraw`);

  token.drawBars();
  assert.equal(token.barsDrawn, false, `${type}: bars stay suppressed`);
}

/* ── not ours: core is left entirely alone ─────────────────────────── */
const other = new Token("npc");
await other._drawEffects();
assert.equal(other.effects.children.filter((c) => c.isIcon).length, 1, "a foreign type keeps core's icons");
assert.doesNotThrow(() => other._refreshEffects(), "a foreign type keeps core's contract");
other.drawBars();
assert.equal(other.barsDrawn, true, "a foreign type keeps its bars");

console.log("token effects: icons suppressed, effects.bg contract kept, _refreshEffects survives draw and redraw");
