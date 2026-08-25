import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CONDITION_MATERIALS, TOKEN_CONDITION_FRAGMENT } from "../src/module/token-conditions.ts";
import { TOKEN_CHIP, conditionRun } from "../src/module/ui/token.js";

assert.equal(CONDITION_MATERIALS.length, 16, "every registered condition needs a material");
assert.equal(new Set(CONDITION_MATERIALS.map((entry) => entry.id)).size, 16, "material ids must be unique");

const joined = conditionRun(["Ablaze", "Vulnerable"]);
assert.match(joined, /^ABLAZE · VULNERABLE · ABLAZE · VULNERABLE · /);

const living = TOKEN_CHIP({ conditions: ["Ablaze", "Vulnerable"] });
assert.match(living, /class="dh tok conditioned"/);
assert.match(living, /ABLAZE · VULNERABLE ·/);
assert.doesNotMatch(living, /<img|tkvuln|condition-icon/);

const dead = TOKEN_CHIP({ conditions: ["Ablaze"], defeated: true });
assert.match(dead, /class="dh tok defeated"/);
assert.doesNotMatch(dead, /ABLAZE/);
assert.doesNotMatch(dead, /<img|death-glyph|skull/);

assert.match(TOKEN_CONDITION_FRAGMENT, /vec4 shattered\(/);
assert.match(TOKEN_CONDITION_FRAGMENT, /for\(int i=0;i<7;i\+\+\)/);
assert.match(TOKEN_CONDITION_FRAGMENT, /if\(uDead>\.5\)/);
assert.match(TOKEN_CONDITION_FRAGMENT, /material=clamp\(mix\(material,chroma,\.68\)/);
assert.match(TOKEN_CONDITION_FRAGMENT, /mix\(original\.rgb,color,circle\)/);

const css = readFileSync(new URL("../styles/token.css", import.meta.url), "utf8");
assert.match(css, /\.dh\.tok\.defeated \.tkcond/);
assert.match(css, /\.dh\.tok\.defeated \.tkarcs/);
assert.match(css, /\.dh\.tok \.tkcond\{[^}]*pointer-events:none/s);
assert.doesNotMatch(css, /\.tkvuln/);

console.log("token conditions: 16 materials, joined sentence, icon-free terminal override");
