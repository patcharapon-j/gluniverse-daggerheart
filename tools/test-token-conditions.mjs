import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CONDITION_MATERIALS, TOKEN_CONDITION_FRAGMENT } from "../src/module/token-conditions.ts";
import { TOKEN_CHIP, conditionRun, conditionSegments } from "../src/module/ui/token.js";

assert.equal(CONDITION_MATERIALS.length, 16, "every registered condition needs a material");
assert.equal(new Set(CONDITION_MATERIALS.map((entry) => entry.id)).size, 16, "material ids must be unique");

const joined = conditionRun(["Ablaze", "Vulnerable"]);
assert.match(joined, /^ABLAZE · VULNERABLE · ABLAZE · VULNERABLE · /);

/* The sentence is still one sentence and still repeats to cover the path.
   It is now cut into pieces so each condition can carry its own colour, and
   the two have to keep agreeing: a segment list that says something other
   than the run is a sentence that reads differently from the one every
   other part of this system was argued about. */
const segments = conditionSegments(["Ablaze", "Vulnerable"], ["#f0783f", "#9b72e4"]);
assert.equal(segments.map(([text]) => text).join(""), joined,
  "the coloured sentence and the plain one must be the same sentence");
assert.deepEqual(segments.slice(0, 4),
  [["ABLAZE", "#f0783f"], [" · ", ""], ["VULNERABLE", "#9b72e4"], [" · ", ""]]);

/* A colour per condition, and not one that leaks onto the separators —
   they are the key colour, which is the first condition's, so a sentence
   with a missing tint still reads as one statement rather than as a word
   in a different hue with nothing to explain it. */
assert.deepEqual(conditionSegments(["Ablaze"], ["not a colour"]).slice(0, 2),
  [["ABLAZE", ""], [" · ", ""]], "only a hex may reach a style attribute");

const living = TOKEN_CHIP({ conditions: ["Ablaze", "Vulnerable"], tints: ["#f0783f", "#9b72e4"] });
assert.match(living, /class="dh tok conditioned"/);
assert.match(living, /<tspan class="tkw" style="--tkw:#f0783f">ABLAZE<\/tspan>/);
assert.match(living, /<tspan class="tkw" style="--tkw:#9b72e4">VULNERABLE<\/tspan>/);
assert.match(living, /<tspan> · <\/tspan>/);
assert.doesNotMatch(living, /<img|tkvuln|condition-icon/);

/* And a caller that knows the names and not the colours still gets a
   sentence, in the key colour, rather than an empty ring. */
const untinted = TOKEN_CHIP({ conditions: ["Ablaze"] });
assert.match(untinted, /<tspan>ABLAZE<\/tspan>/);
assert.doesNotMatch(untinted, /--tkw/);

const dead = TOKEN_CHIP({ conditions: ["Ablaze"], tints: ["#f0783f"], defeated: true });
assert.match(dead, /class="dh tok defeated"/);
assert.doesNotMatch(dead, /ABLAZE/);
assert.doesNotMatch(dead, /<img|death-glyph|skull/);

assert.match(TOKEN_CONDITION_FRAGMENT, /vec4 shattered\(/);
assert.match(TOKEN_CONDITION_FRAGMENT, /for \(int i = 0; i < 9; i\+\+\)/);
assert.match(TOKEN_CONDITION_FRAGMENT, /if\(uDead>\.5\)/);

/* Detail is bought with pixels, and outputFrame.z is the only place in this
   shader allowed to know about the camera. If a frequency ever stops being
   gated on it, small tokens get a crawling shimmer that nobody reproduces on
   a design page, because a design page is 160 pixels wide. */
const code = TOKEN_CONDITION_FRAGMENT.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
assert.match(code, /float detail = smoothstep\(44\.0, 104\.0, outputFrame\.z\);/);
assert.equal((code.match(/outputFrame\.z[^w]/g) ?? []).length, 1,
  "only the detail budget may read the token's size on screen");

/* Every condition has to move. Restrained shipped once with no time in it at
   all and survived two review passes, because a still texture looks correct in
   a screenshot and only looks wrong on a table. */
const patterns = code.slice(code.indexOf("vec2 conditionPattern"),
                            code.indexOf("vec2 conditionWarp"));
const cuts = [...patterns.matchAll(/if \(id < [\d.]+\) \{/g)].map((m) => m.index);
const tailAt = patterns.lastIndexOf("\n  }\n") + 4;
const branches = [...cuts.map((cut, i) => patterns.slice(cut, cuts[i + 1] ?? tailAt)),
                  patterns.slice(tailAt)];
assert.equal(branches.length, CONDITION_MATERIALS.length,
  "one pattern branch per registered condition");
branches.forEach((branch, i) => {
  assert.match(branch, /[^A-Za-z0-9_]t[^A-Za-z0-9_]/,
    `${CONDITION_MATERIALS[i].id} has no time in it, so it is a decal`);
});
assert.match(TOKEN_CONDITION_FRAGMENT, /material=clamp\(mix\(material,chroma,\.68\)/);
assert.match(TOKEN_CONDITION_FRAGMENT, /mix\(original\.rgb,color,circle\)/);

/* Token space, not filter space. PIXI's vTextureCoord spans outputFrame/inputSize
   of a pooled texture, a ratio that moves with the camera, so a shader that reads
   it as 0..1 rescales every frequency when you zoom. Every sample must go through
   sampleArt, and nothing may touch texture2D directly. */
assert.match(TOKEN_CONDITION_FRAGMENT, /vec2 tokenUv\(vec2 tex\)\{ return tex \* inputSize\.xy \/ outputFrame\.zw; \}/);
assert.match(TOKEN_CONDITION_FRAGMENT, /uv=tokenUv\(vTextureCoord\)/);
assert.equal((TOKEN_CONDITION_FRAGMENT.match(/texture2D\(/g) ?? []).length, 1,
  "every art read goes through sampleArt, which clamps to inputClamp");

/* The break may not leave the creature's own circle. It shipped clipped on
   `source` alone, which is p pulled inward by the shard's escape push, so a
   fragment a push outside the token still read as inside the artwork and
   drew — and the only thing out there to stop it was the filter's square
   frame, which is what the break grew into. The cell test is on p and there
   is nothing clever about it; the bug was that it was missing. */
const shatter = code.slice(code.indexOf("vec4 shattered("), code.indexOf("void main()"));
assert.match(shatter, /float cell = 1\.0 - smoothstep\(\.94, 1\.0, length\(p\)\);/,
  "the break needs the creature's own circle, measured on p");
assert.match(shatter, /art\.a \* solid \* circle \* cell/,
  "and it has to reach the alpha, or it is a local nobody reads");

/* Both board layers hang in a stack of ours rather than in `#hud` itself.
   A layer that is a direct child of `#hud` competes with Foundry's own
   furniture — the Token HUD's buttons, #measurement, the chat bubbles —
   none of which carries a z-index, so any positive one of ours wins and a
   chip draws over the buttons you opened to act on that creature. */
for (const file of ["token-hud.ts", "range-ruler.ts"]) {
  const source = readFileSync(new URL(`../src/module/${file}`, import.meta.url), "utf8");
  assert.match(source, /boardStack\(\)/, `${file} must hang its layer in the board stack`);
  assert.doesNotMatch(source, /^\s*(?:const|let)\s+host\s*=\s*hudElement\(\)/m,
    `${file} may not hang a layer directly on #hud`);
}

const css = readFileSync(new URL("../styles/token.css", import.meta.url), "utf8");
assert.match(css, /\.dh\.tok\.defeated \.tkcond/);
assert.match(css, /\.dh\.tok\.defeated \.er-shell > \.er-ring/);
assert.match(css, /\.dh\.tok \.tkcond\{[^}]*pointer-events:none/s);
assert.doesNotMatch(css, /\.tkvuln/);
assert.doesNotMatch(css, /\.tkarc|\.tkhope|\.tkdiff/,
  "Obsidian orbit replaced the outboard tracks; no legacy selector may survive");

console.log("token conditions: 16 materials, all animated, nine-shard break clipped to the "
  + "cell, a colour per condition in one sentence, icon-free terminal override");
