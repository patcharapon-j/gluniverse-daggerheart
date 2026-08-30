/**
 * Does the item sheet reach every field an Item holds?
 *
 * This is `check-resources.mjs`'s ratchet pointed at a different kind of gap.
 * There, the risk was a card whose rules text asks you to count something and
 * whose entry never said so; here it is a schema field that exists, is
 * written by the compendium or by a migration, and has no control anywhere on
 * the sheet — so a GM can read it and cannot change it, and nothing on screen
 * says the field is there at all.
 *
 * That failure is invisible by construction, which is why it needs a tool.
 * Four subtypes had no panel whatsoever and the other seven were each missing
 * between two and seven fields, and the sheet looked *finished* the whole
 * time: a panel with four controls on it reads as a complete panel.
 *
 * **What it can prove and what it cannot.** It reads `data/items.ts` for the
 * fields each subtype declares and `sheets/ItemSheet.svelte` for the paths and
 * keys the sheet names, and fails when a declared field is named nowhere. It
 * does *not* prove the control was drawn under the right subtype — that would
 * mean parsing the template's branches, and it is the mistake you see the
 * instant you open the sheet, where a missing field is the one you never see.
 * Coverage is the ratchet; placement is the reader's.
 *
 *     node tools/check-item-sheet.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const ITEMS = read("src/module/data/items.ts");
const CONFIG = read("src/module/config.ts");
const SHEET = read("src/module/sheets/ItemSheet.svelte");

const fail = [];

/* ── what a subtype holds ────────────────────────────────────────────────
   The schema is a DataModel and cannot be instantiated outside Foundry, so
   the source is read rather than the class. Brace-counting from the literal
   rather than a line-indent rule, because `domains: schema({primary, …})`
   nests and only the outer key is a field of the subtype.

   Comments come out first, and that is not tidiness. This file is more
   commentary than code by volume, the commentary is English, and English has
   colons in it — the first run of this tool reported `class.once`,
   `weapon.Protective` and `feature.from` as missing fields, all of them words
   lifted out of a paragraph explaining a field that was present. */

/** The source with every comment blanked, strings left alone. */
function decomment(src) {
  let out = "";
  for (let i = 0; i < src.length; i++) {
    const two = src.slice(i, i + 2);
    if (two === "/*") {
      const end = src.indexOf("*/", i + 2);
      i = (end === -1 ? src.length : end + 1);
      continue;
    }
    if (two === "//") {
      const end = src.indexOf("\n", i);
      i = (end === -1 ? src.length : end - 1);
      continue;
    }
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      // Copied whole so a `//` or an apostrophe inside one cannot open a
      // comment that never closes.
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === "\\" ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j;
      continue;
    }
    out += c;
  }
  return out;
}

/**
 * Top-level keys of the object literal a `defineSchema` returns.
 *
 * **The bracket counter has to run after the flush, not before it**, and that
 * ordering was a live bug rather than a nicety. `...tracked()` is a token at
 * depth zero followed immediately by `(` — and incrementing on the paren
 * first meant the very next branch was the depth-above-zero one, which resets
 * the token. So the spread was never recognised, `keys.push("resources")` was
 * unreachable, and every field the spread carries — `resources`, `dice`,
 * `cardDamage`, `modifiers` — has been invisible to this tool for as long as
 * it has existed.
 *
 * That is exactly the failure this file was written to prevent, in this file:
 * a check reporting "every field reachable" while not looking at four of
 * them. It reported the same sentence before and after the spread was taught
 * to it, which is why nothing caught it.
 */
function schemaKeys(body) {
  const keys = [];
  let depth = 0;
  let token = "";
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (depth === 0) {
      if (/[\w.]/.test(c)) {
        token += c;
      } else {
        if (c === ":" && token) keys.push(token);
        else if (token === "...tracked") keys.push(...trackedKeys());
        token = "";
      }
    } else {
      token = "";
    }
    if (c === "{" || c === "(" || c === "[") depth++;
    else if (c === "}" || c === ")" || c === "]") depth--;
  }
  return keys;
}

/**
 * The members of `tracked()`, read out of its own arrow body.
 *
 * Cached because every subtype spreads it and the answer cannot change
 * within one run.
 */
let trackedCache = null;
function trackedKeys() {
  if (trackedCache) return trackedCache;
  const src = decomment(ITEMS);
  const at = src.indexOf("const tracked = () => ({");
  if (at < 0) {
    throw new Error(
      "check-item-sheet: `tracked()` is not where this tool expects it in data/items.ts.\n" +
        "  Rename it back or teach this function the new shape — a silent zero here\n" +
        "  would report every spread field reachable without checking one of them.",
    );
  }
  const open = src.indexOf("{", src.indexOf("({", at));
  let depth = 0;
  let end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) { end = i; break; }
  }
  trackedCache = [...src.slice(open + 1, end).matchAll(/^\s{2}([A-Za-z][\w]*):/gm)].map((m) => m[1]);
  return trackedCache;
}

/** The body of the object literal in `return { … };`, balanced. */
function returnBody(src, from) {
  const open = src.indexOf("{", src.indexOf("return", from));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(open + 1, i);
  }
  return "";
}

/** `DomainCardData` → `domainCard`. */
const typeOf = (cls) => cls.replace(/Data$/, "").replace(/^./, (c) => c.toLowerCase());

const SRC = decomment(ITEMS);

const schemas = new Map();
for (const m of SRC.matchAll(/export class (\w+Data) extends[\s\S]*?static defineSchema\(\)/g)) {
  const body = returnBody(SRC, m.index + m[0].length);
  schemas.set(typeOf(m[1]), schemaKeys(body));
}

const TYPES = (CONFIG.match(/export const ITEM_TYPES = \[([\s\S]*?)\] as const;/)?.[1] ?? "")
  .match(/"([^"]+)"/g)
  ?.map((s) => s.slice(1, -1)) ?? [];

if (!TYPES.length) fail.push("could not read ITEM_TYPES out of config.ts");

for (const t of TYPES) {
  if (!schemas.has(t)) fail.push(`${t}: declared in ITEM_TYPES with no DataModel in data/items.ts`);
}
for (const t of schemas.keys()) {
  if (!TYPES.includes(t)) fail.push(`${t}: has a DataModel and is not in ITEM_TYPES`);
}

/* ── what the sheet reaches ──────────────────────────────────────────────
   Two shapes, because the sheet writes two ways and has to. A dotted path is
   how a SchemaField is written; a bare quoted key is how an ArrayField is,
   since Foundry reads a dotted index as a path into an object and the whole
   array is rewritten instead. Both count as a control. */
const reached = (field) =>
  SHEET.includes(`system.${field}`) ||
  new RegExp(`["'\`]${field}["'\`]`).test(SHEET) ||
  new RegExp(`\\bsys\\.${field}\\b`).test(SHEET);

for (const [type, fields] of schemas) {
  for (const f of fields) {
    if (!reached(f)) fail.push(`${type}.${f}: no control on the item sheet`);
  }
}

/* ── and the subtype itself ──────────────────────────────────────────────
   A subtype the sheet never names falls through every branch to a header and
   a rules field, which is exactly the state four of them were in. `feature`
   blocks and printing credits are named in the sheet's own tables rather than
   in a branch, so the test is the type appearing at all. */
for (const t of TYPES) {
  if (!new RegExp(`["']${t}["']`).test(SHEET)) fail.push(`${t}: the item sheet never names it`);
}

/* ── report ──────────────────────────────────────────────────────────── */

if (fail.length) {
  console.error(`item sheet: ${fail.length} gap${fail.length === 1 ? "" : "s"}\n`);
  for (const f of fail) console.error(`  ${f}`);
  process.exit(1);
}

const total = [...schemas.values()].reduce((n, f) => n + f.length, 0);
console.log(`item sheet: ${schemas.size} subtypes, ${total} fields, every one reachable.`);
