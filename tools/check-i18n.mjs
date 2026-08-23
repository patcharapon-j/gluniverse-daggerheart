/**
 * Does every key this system names resolve against `lang/en.json`?
 *
 * This is `check-item-sheet.mjs`'s ratchet pointed at the string table. There
 * the gap is a schema field with no control; here it is a key that is spelled
 * one way in the code and another way in the dictionary — and Foundry answers
 * a miss by returning the key itself, so the failure ships as a notification
 * reading `DAGGERHEART.Warn.OneTransformation` where a sentence should be.
 *
 * That is invisible by construction in the way this repo keeps meeting.
 * Nothing typechecks a string, the key is *plausible* — `Warn` for a warning —
 * and the path that draws it is the one nobody walks twice: you have to hold a
 * transformation and then drop a second one to ever see it. It sat in
 * `svelte-sheets.ts` beside eleven call sites that all said `Warning.`
 *
 * **The sweep is the literal, not the call site**, and that is the load-bearing
 * decision. A key reaches Foundry by more routes than `i18n.localize` — a
 * DialogV2 `window.title`, a button label, `system.json`'s own settings blocks,
 * a helper that takes the key and localizes it a file away — so a tool that
 * matched `i18n.format(` would have proved nothing about the majority of them.
 * What is checkable instead is the shape: a string beginning `DAGGERHEART.` is
 * ours by construction and is a key wherever it is written. Foundry's own keys
 * (`Confirm`, `COMMON.Delete`, `TYPES.Item.*`) are deliberately out of scope —
 * they resolve against a dictionary this repo does not own, and asserting them
 * would be this tool failing when Foundry renames something.
 *
 * A key built by interpolation — `DAGGERHEART.Severity.${sev}` — cannot be
 * resolved without knowing the tail, so what is asserted is the **static
 * prefix**: that `DAGGERHEART.Severity` exists and is a block. That is the
 * honest half. A missing block is the failure that takes every value with it;
 * a missing leaf under a block that exists is one value, and the closed sets
 * feeding these tails are `config.ts`'s own.
 *
 *     node tools/check-i18n.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const dict = JSON.parse(readFileSync(join(root, "lang/en.json"), "utf8"));

/** The value at a dotted path, or undefined. */
const at = (key) =>
  key.split(".").reduce((o, p) => (o && typeof o === "object" ? o[p] : undefined), dict);

/* ── what to read ────────────────────────────────────────────────────────
   Every source file the system is built from, plus the manifest: `system.json`
   names keys too, and a settings block whose `name` does not resolve is the
   same bug wearing the configuration menu. */

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|svelte|js|mjs|json)$/.test(entry)) files.push(path);
  }
})(join(root, "src"));
files.push(join(root, "system.json"));

/* ── the sweep ───────────────────────────────────────────────────────────
   A quoted run beginning `DAGGERHEART.` in any of the three quote characters.
   The interpolation is allowed *inside* the match rather than terminating it,
   so a template literal is caught and reported as a prefix rather than being
   skipped for not looking like a plain string. */

const KEY = /["'`](DAGGERHEART\.[A-Za-z0-9_.$]*(?:\$\{[^}]*\})?[A-Za-z0-9_.]*)["'`]/g;

const fail = [];
let keys = 0;
let prefixes = 0;

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const where = (index) => `${relative(root, file)}:${src.slice(0, index).split("\n").length}`;

  for (const m of src.matchAll(KEY)) {
    const key = m[1];

    if (key.includes("${")) {
      /* Built at runtime. The static head is what a tool can speak to, and a
         trailing dot is not part of it. */
      const prefix = key.slice(0, key.indexOf("${")).replace(/\.$/, "");
      prefixes++;
      if (typeof at(prefix) !== "object") {
        fail.push(`${where(m.index)}  ${key}\n      no block at ${prefix}`);
      }
      continue;
    }

    keys++;
    if (at(key) === undefined) fail.push(`${where(m.index)}  ${key}`);
  }
}

/* ── report ──────────────────────────────────────────────────────────── */

if (fail.length) {
  const one = fail.length === 1;
  console.error(`i18n: ${fail.length} key${one ? "" : "s"} that do${one ? "es" : ""} not resolve\n`);
  for (const f of fail) console.error(`  ${f}`);
  console.error(`\nFoundry answers a miss with the key itself, so each of these`);
  console.error(`reaches the table as its own name rather than as a sentence.`);
  process.exit(1);
}

console.log(
  `i18n: ${keys} keys and ${prefixes} interpolated prefixes across ${files.length} files, all resolve.`,
);
