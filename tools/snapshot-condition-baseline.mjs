/**
 * Freeze the shipped condition shader as the gate's comparison column.
 *
 * The gate answers one question — is this better than what users have — and it
 * can only answer it against what users actually have. The baseline was taken
 * once, by hand, at the commit before a port, so by the next pass it was
 * answering "better than two revisions ago" instead, which is a question
 * nobody asked. Run this on the commit you are about to work from.
 *
 *   node --experimental-strip-types tools/snapshot-condition-baseline.mjs
 *
 * It writes design/qa/condition-fidelity/baseline.js from src and records the
 * commit it came from, so the column can always be traced back to a tree.
 */
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { TOKEN_CONDITION_FRAGMENT } from "../src/module/token-conditions.ts";
import { stripGlslComments } from "./lib/glsl.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "design/qa/condition-fidelity/baseline.js");

const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const head = git("rev-parse", "--short", "HEAD");
const subject = git("log", "-1", "--format=%s");
const dirty = git("status", "--porcelain", "--", "src/module/token-conditions.ts") !== "";

if (dirty) {
  console.error(
    "refusing to snapshot: src/module/token-conditions.ts has uncommitted changes.\n" +
      "A baseline taken from a dirty tree cannot be traced to anything, and the\n" +
      "whole point of the column is that it is what shipped.",
  );
  process.exit(1);
}

/* The shader is a template literal containing backticks nowhere and ${} nowhere,
   which is checked rather than assumed: either would make the emitted file
   interpolate instead of quote. */
if (TOKEN_CONDITION_FRAGMENT.includes("`") || TOKEN_CONDITION_FRAGMENT.includes("${"))
  throw new Error("shader source contains a backtick or an interpolation; the snapshot would not survive quoting");

/* Comments go at the embedding boundary; see tools/lib/glsl.mjs for why. */
const frozen = stripGlslComments(TOKEN_CONDITION_FRAGMENT.replace(/^\n/, ""));

const nonAscii = frozen.match(/[^\x00-\x7F]/);
if (nonAscii)
  throw new Error(`shader source has non-ASCII ${JSON.stringify(nonAscii[0])} outside a comment; the gate page refuses it`);

writeFileSync(
  out,
  `/**
 * The condition material as it ships, frozen.
 *
 * GENERATED — do not edit. Regenerate with:
 *   node --experimental-strip-types tools/snapshot-condition-baseline.mjs
 *
 * The gate needs something to compare against, and the only thing worth
 * comparing against is what is on the table right now. The live shader beside
 * it is imported from src rather than copied, because two copies of four
 * hundred lines of GLSL are two shaders that disagree the first time somebody
 * tunes one branch — and this copy is allowed to exist only because it is
 * machine-written from a clean tree and never touched by hand.
 *
 * Snapshot taken at ${head} (${subject}).
 */

export const CONDITION_MATERIAL_BASELINE_REF = ${JSON.stringify(head)};

export const CONDITION_MATERIAL_BASELINE = \`${frozen}\`;
`,
  "utf8",
);

console.log(`baseline: ${out.replace(root + "/", "")} ← ${head} (${subject})`);
