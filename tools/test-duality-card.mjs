/**
 * What the duality card says, in words.
 *
 * Nothing in `tools/` had ever driven the duality builder, which is how every
 * visible string on it stayed an English literal that `check-i18n.mjs` could
 * not see, and how `VERDICT` came to read "with Hope" on every attack in the
 * system — `rollAttack` passed no Difficulty, so the resolved branch of that
 * sentence was unreachable and nothing noticed.
 *
 * So this pins the sentence itself, per state:
 *
 * **The verdict.** Resolved rolls say what happened and how it felt; an
 * unresolved one says only how it felt, because with no Difficulty there is
 * nothing true to say about success. A reaction has no Hope and no Fear and
 * says nothing at all without a Difficulty — quiet rather than narrating its
 * own ignorance.
 *
 * **What changes hands.** Hope on a Hope result, Hope and Stress on a
 * critical, the GM's Fear on a Fear result, and nothing on a reaction unless
 * it crits.
 *
 * **That the words are the lang file's.** Every string is resolved through
 * `DAGGERHEART.Plate.*`, so a card is checked against `lang/en.json` rather
 * than against a copy of it written here, and a key that does not exist shows
 * up as itself on the card.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const en = JSON.parse(readFileSync(new URL("../lang/en.json", import.meta.url), "utf8"));
const localize = (key) => key.split(".").reduce((o, k) => o?.[k], en) ?? key;
const format = (key, data = {}) =>
  String(localize(key)).replace(/\{(\w+)\}/g, (_, name) => data[name] ?? "");

globalThis.game = { i18n: { localize, format } };
globalThis.foundry = {
  utils: {
    getRoute: (p) => p,
    escapeHTML: (v) =>
      String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
  },
};

const { dualityPlate } = await import("../src/module/dice/plate.ts");

const base = { who: "Tabby", label: "Hammer", total: 17, mods: [{ k: "agility", v: 2 }], h: 9, f: 6 };
const card = (over) => dualityPlate({ ...base, ...over });

const ghost = (html) => html.match(/<span class="pl-gh">(.*?)<\/span>/)?.[1] ?? "";
/* The words are the lang file's; the markup around them is the card's. The
   result is wrapped so the stylesheet can set it apart from the rest of the
   sentence, and that wrapping is asserted on its own below. */
const verdictHTML = (html) => html.match(/<b class="pl-vb">(.*?)<\/b>/)?.[1] ?? "";
const verdict = (html) => verdictHTML(html).replace(/<[^>]+>/g, "");
const claims = (html) =>
  [...html.matchAll(/class="pl-b[^"]*"[^>]*><i><\/i>([^<]*)/g)].map((m) => m[1]);
const terms = (html) => [...html.matchAll(/<i[^>]*><b>[^<]*<\/b>\s*([^<]*)<\/i>/g)].map((m) => m[1].trim());

/* ── the verdict, per state ──────────────────────────────────────────── */

const states = [
  ["hope, unresolved", { out: "hope", dc: null, hit: false }, "HOPE", "with Hope", ["+1 Hope"]],
  ["fear, unresolved", { out: "fear", h: 6, f: 9, dc: null, hit: false }, "FEAR", "with Fear", ["GM gains a Fear"]],
  ["success with Fear", { out: "fear", h: 6, f: 9, dc: 15, hit: true }, "FEAR", "success with Fear", ["GM gains a Fear"]],
  ["failure with Fear", { out: "fear", h: 6, f: 9, dc: 20, hit: false }, "FEAR", "failure with Fear", ["GM gains a Fear"]],
  ["success with Hope", { out: "hope", dc: 15, hit: true }, "HOPE", "success with Hope", ["+1 Hope"]],
  ["critical", { out: "crit", h: 9, f: 9, dc: 12, hit: true }, "CRITICAL", "critical success", ["+1 Hope", "Clear 1 Stress"]],
  ["reaction, resolved", { out: "hope", rxn: true, dc: 14, hit: true }, "REACTION", "success", []],
  ["reaction, failed", { out: "hope", rxn: true, dc: 14, hit: false }, "REACTION", "failure", []],
  ["reaction, unresolved", { out: "hope", rxn: true, dc: null, hit: false }, "REACTION", "", []],
  ["reaction, critical", { out: "crit", h: 9, f: 9, rxn: true, dc: null, hit: true }, "CRITICAL", "critical success", ["Ignore the effect"]],
];

for (const [name, over, wantGhost, wantVerdict, wantClaims] of states) {
  const html = card(over);
  assert.equal(ghost(html), wantGhost, `${name}: ghost word`);
  assert.equal(verdict(html), wantVerdict, `${name}: verdict`);
  assert.deepEqual(claims(html), wantClaims, `${name}: what changes hands`);
  assert.doesNotMatch(html, /DAGGERHEART\./, `${name}: a key reached the card unresolved`);
}

/* ── a card with no Difficulty prints no chip at all ─────────────────── */

assert.doesNotMatch(card({ out: "hope", dc: null, hit: false }), /pl-meta[^>]*>.*<s>/s, "an unresolved roll drew a chip");
/* The chip carries the margin: 17 against 15 is +2, and 17 against 20 is −3.
   The table used to do that subtraction itself. */
assert.match(card({ out: "hope", dc: 15, hit: true }), /<s>vs 15<em class="pl-mg up">\+2<\/em><\/s>/,
  "a resolved roll lost its chip or its margin");
assert.match(card({ out: "fear", h: 6, f: 9, dc: 20, hit: false }), /<em class="pl-mg dn">−3<\/em>/,
  "a missed Difficulty did not say by how much");

/* ── the result is marked by the builder, not found by the stylesheet ──
   "The first word" is an English assumption and the sentence is localised,
   so the result arrives wrapped: success/failure inside the Outcome
   sentence, and the whole of a verdict that is only one thing. */
assert.equal(verdictHTML(card({ out: "hope", dc: 15, hit: true })), "<em>success</em> with Hope",
  "the result inside an Outcome sentence was not marked");
assert.equal(verdictHTML(card({ out: "crit", h: 9, f: 9, dc: 12, hit: true })), "<em>critical success</em>",
  "a critical's verdict was not marked whole");

/* ── the arithmetic names both dice, and an upgraded one says so ────── */
assert.deepEqual(terms(card({ out: "hope", dc: null, hit: false })).slice(0, 2), ["hope", "fear"],
  "the pair was summed rather than named");
assert.deepEqual(terms(card({ out: "hope", dc: null, hit: false, hd: "d20", h: 17 })).slice(0, 2),
  ["hope · d20", "fear"], "an upgraded Hope Die did not say which die it became");

/* ── advantage names itself, and says how many when there were several ─ */

assert.ok(
  terms(card({ out: "hope", dc: null, hit: false, adv: { dice: [4], neg: false } })).includes("advantage"),
  "a single advantage die was not named",
);
assert.ok(
  terms(card({ out: "hope", dc: null, hit: false, adv: { dice: [4, 6], neg: false } }))
    .includes("advantage · highest of 2"),
  "Help an Ally did not say how many dice it was the highest of",
);
assert.ok(
  terms(card({ out: "fear", dc: null, hit: false, adv: { dice: [3], neg: true } })).includes("disadvantage"),
  "disadvantage was drawn as advantage",
);

console.log(
  "duality card: every state's verdict, ghost word and claims are the lang file's words, and an unresolved roll stays quiet",
);
