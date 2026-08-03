import assert from "node:assert/strict";
import { setChits } from "../src/module/ui/chit.js";

const classes = new Set(["chits", "capped", "dom"]);
const row = {
  dataset: { v: "1", max: "2", cap: "5", key: "focus" },
  classList: {
    contains: (name) => classes.has(name),
    toggle(name, on) {
      if (on) classes.add(name);
      else classes.delete(name);
    },
  },
  querySelector: (selector) => selector === "[data-place]" ? {} : null,
  innerHTML: "unchanged",
};

// The held count stays at one while a derived ceiling grows from two to four.
// The renderer must still redraw the capacity sockets.
setChits(row, 1, 4, "focus");

assert.equal(row.dataset.v, "1");
assert.equal(row.dataset.max, "4");
assert.equal((row.innerHTML.match(/class="sk"/g) ?? []).length, 3);
assert.match(row.innerHTML, /Spend one focus/);
assert.equal(classes.has("dom"), true);

console.log("counter pools: changing a derived ceiling redraws capacity sockets");
