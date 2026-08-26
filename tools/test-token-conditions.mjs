import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CONDITIONS } from "../src/module/config.ts";
import {
  ADHOC_CONDITION_ID,
  CONDITION_MATERIALS,
  CONDITION_SLOTS,
  TOKEN_CONDITION_FRAGMENT,
  conditionMaterialsFor,
} from "../src/module/token-conditions.ts";
import {
  addAdhocCondition,
  adhocConditions,
  adhocName,
  adhocStatusId,
  isAdhocStatus,
} from "../src/module/adhoc-conditions.ts";
import { TOKEN_CHIP, conditionRun, conditionSegments } from "../src/module/ui/token.js";

/* Sixteen named conditions, plus the one every typed condition shares. */
assert.equal(CONDITION_MATERIALS.length, CONDITIONS.length + 1,
  "every registered condition needs a material, and the unnamed one needs the last");
assert.equal(new Set(CONDITION_MATERIALS.map((entry) => entry.id)).size, CONDITION_MATERIALS.length,
  "material ids must be unique");
assert.equal(CONDITION_MATERIALS.at(-1).id, ADHOC_CONDITION_ID);
assert.ok(!CONDITIONS.some((condition) => condition.id === ADHOC_CONDITION_ID),
  "the unnamed material's id may never be a condition this system names");

/* ── conditions the GM types ────────────────────────────────────────────
   The id is derived from the name so that naming the same thing twice is the
   same condition, and it may never come back empty for a name that is not
   empty — a GM typing a condition in a script with no ASCII in it would
   otherwise have it silently dropped. */
assert.equal(adhocStatusId("On Fire"), adhocStatusId("on-fire"));
assert.equal(adhocStatusId("  On   Fire  "), adhocStatusId("On Fire"));
assert.ok(isAdhocStatus(adhocStatusId("On Fire")));
assert.equal(adhocStatusId(""), "");
assert.ok(isAdhocStatus(adhocStatusId("\u6c34\u6d78\u3057")),
  "a name with no ASCII in it still needs an id");
assert.notEqual(adhocStatusId("\u6c34\u6d78\u3057"), adhocStatusId("\u708e\u4e0a"));
assert.equal(adhocName("  a   lot   of   space  "), "a lot of space");
assert.equal(adhocName("x".repeat(200)).length, 32, "a condition is a name, not a paragraph");

/* An id nothing recognises is a condition somebody typed, not a condition to
   drop. This is the rule the old `map(get).filter(Boolean)` broke silently. */
assert.deepEqual(conditionMaterialsFor(["ablaze"]).map((m) => m.id), ["ablaze"]);
assert.deepEqual(conditionMaterialsFor(["dh-adhoc-waterlogged"]).map((m) => m.id),
  [ADHOC_CONDITION_ID]);
assert.deepEqual(
  conditionMaterialsFor(["dh-adhoc-a", "ablaze", "dh-adhoc-b"]).map((m) => m.id),
  [ADHOC_CONDITION_ID, "ablaze"],
  "typed conditions share one material and may not each take a slot");
assert.equal(conditionMaterialsFor(CONDITIONS.map((c) => c.id)).length, CONDITION_SLOTS);

/* Off appliedEffects, so a disabled effect is not a condition the creature
   has — the same rule every other read in this system follows. */
const actor = {
  appliedEffects: [
    { name: "Waterlogged", statuses: new Set(["dh-adhoc-waterlogged"]) },
    { name: "Ablaze", statuses: new Set(["ablaze"]) },
    { name: "Waterlogged", statuses: new Set(["dh-adhoc-waterlogged"]) },
  ],
  statuses: new Set(["dh-adhoc-waterlogged", "ablaze"]),
};
assert.deepEqual(adhocConditions(actor), [{ id: "dh-adhoc-waterlogged", name: "Waterlogged" }],
  "one condition, however many effects carry it");
assert.equal(await addAdhocCondition(actor, "Waterlogged"), false,
  "a condition the creature already has is not a change");
assert.equal(await addAdhocCondition(actor, "   "), false);

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
/* PREMULTIPLIED, both branches. PIXI composites a filter's output with
   ONE / ONE_MINUS_SRC_ALPHA, which adds the colour at full strength whatever
   the alpha channel says — so a fragment that clips itself to zero alpha and
   returns a colour anyway draws that colour, out to the edges of the filter's
   own square frame. That is what put a square around a dead token, and it
   survived three passes of the design gate because that page asked for
   premultipliedAlpha:false, where an alpha of zero really does mean nothing
   appears. Neither of these is decoration. */
assert.match(code, /mix\(original\.rgb,color\*original\.a,circle\)/,
  "the living material has to be premultiplied by the artwork's own alpha");

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
assert.match(shatter, /return vec4\(clamp\(cold, 0\.0, 1\.0\) \* alpha, alpha\);/,
  "and the colour has to be premultiplied by it, or the clipping does nothing");

/* The gate has to composite the way PIXI does, or it cannot show either of
   the two above going wrong. It could not, for three passes. */
const gate = readFileSync(new URL("../tools/build-condition-gate.mjs", import.meta.url), "utf8");
assert.match(gate, /premultipliedAlpha: true/);
assert.match(gate, /gl\.blendFunc\(gl\.ONE, gl\.ONE_MINUS_SRC_ALPHA\)/);
assert.match(gate, /UNPACK_PREMULTIPLY_ALPHA_WEBGL/);

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

console.log("token conditions: 16 named materials plus the one a GM types, all animated, "
  + "a premultiplied break clipped to the cell, a colour per condition in one sentence, "
  + "icon-free terminal override");
