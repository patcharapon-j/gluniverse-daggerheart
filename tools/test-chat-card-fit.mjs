import assert from "node:assert/strict";
import { watchChatCard } from "../src/module/apps/chat-card-fit.ts";

const frames = [];
globalThis.requestAnimationFrame = (fn) => frames.push(fn);
globalThis.document = { body: {} };
let sizes, removals;
globalThis.ResizeObserver = class {
  targets = new Set();
  constructor(fn) { this.fn = fn; sizes = this; }
  observe(card) { this.targets.add(card); }
  unobserve(card) { this.targets.delete(card); }
  disconnect() { this.targets.clear(); }
  send(card, width) {
    card.clientWidth = width;
    this.fn([{ target: card, contentRect: { width } }]);
  }
};
globalThis.MutationObserver = class {
  constructor(fn) { this.fn = fn; removals = this; }
  observe() {}
  disconnect() { this.disconnected = true; }
};

// Model the layout boundary: hidden elements report zero, while this long
// card requires 200cqw of paper and art. Use the production fit() algorithm.
function longCard() {
  const card = {
    isConnected: true, clientWidth: 0, dataset: {},
    style: { aspectRatio: "5 / 7", setProperty() {} },
    classList: { contains: () => true },
    getBoundingClientRect: () => ({ width: card.clientWidth }),
    querySelector: () => ({
      get scrollHeight() { return card.clientWidth ? card.clientWidth * 2 : 0; },
      get clientHeight() {
        const [w, h] = card.style.aspectRatio.split("/").map(Number);
        return card.clientWidth * h / w;
      },
    }),
  };
  return card;
}
const flush = () => { while (frames.length) frames.shift()(); };
const card = longCard();
let arrivals = 0;
watchChatCard(card, () => arrivals++);
sizes.send(card, 0);
flush();
assert.equal(arrivals, 0, "hidden cards must wait for layout");
sizes.send(card, 300);
flush();
assert.equal(arrivals, 1);
assert.ok(card.querySelector().clientHeight >= card.querySelector().scrollHeight,
  "revealing a long card must grow it enough to expose all text");
sizes.send(card, 300);
assert.equal(frames.length, 0, "height changes from fitting must not cause a loop");
sizes.send(card, 240);
assert.equal(frames.length, 1, "a sidebar width change must schedule another fit");
flush();
assert.equal(arrivals, 1, "resizing must not replay arrival");

const late = longCard();
watchChatCard(late, () => arrivals++);
sizes.send(late, 300);
sizes.send(late, 0);
flush();
assert.equal(arrivals, 1, "hiding before the queued fit must preserve arrival");
sizes.send(late, 300);
flush();
assert.equal(arrivals, 2);
card.isConnected = late.isConnected = false;
removals.fn([{ removedNodes: [card, late] }]);
assert.equal(sizes.targets.size, 0, "deleted and replaced cards must be released");
assert.ok(removals.disconnected);
console.log("Chat card fitting: hidden/revealed, resized, queued hide, and cleanup passed.");
