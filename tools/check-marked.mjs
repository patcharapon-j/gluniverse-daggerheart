/*
 * Audits the Root and Void decks against the printed corpus's own regularities.
 *
 *     node tools/check-marked.mjs
 *     node tools/check-marked.mjs --report   # print the measurements too
 *
 * ── why this exists ───────────────────────────────────────────────────
 * `tools/check-cards.mjs` audits a hand-authored card by re-deriving what it
 * *should* say from the official snapshot. That is the strongest check in this
 * repo and it cannot be pointed here: nobody published these cards, so there is
 * no row to compare a line to. `check-equipment.mjs` had the same problem with
 * chapter 2 and answered it the same way — when there is no upstream, the thing
 * worth asserting is that the content obeys the rules the *published* content
 * obeys. There it was "every tier reprints the same fifteen physical
 * primaries"; here it is the four regularities below.
 *
 * They are **measured off the 210 printed cards rather than asserted**, and the
 * measurement is in this file (`PRINTED`) so that a claim about the corpus can
 * be re-taken rather than believed. Everything the check enforces was derived
 * by running these same passes over `domain-cards.mjs` + `dread-cards.mjs`.
 *
 * ── the four ──────────────────────────────────────────────────────────
 * 1. **A repeatable damage card scales with Proficiency.** Every printed card
 *    that deals flat dice pays for it — once per rest, a Hope, or Stress — and
 *    every printed card castable again and again for nothing writes its damage
 *    `dN+M using your Proficiency`. This is the one that keeps a homebrew deck
 *    from quietly becoming the party's whole damage output.
 * 2. **Area damage above level 4 takes a Reaction Roll and halves.** The
 *    low-level idiom is "Spellcast Roll against all targets"; from Chain
 *    Lightning upward it is always a save-for-half. Using the low template with
 *    high numbers is how an area card ends up doing double what the printed one
 *    at its level does.
 * 3. **The damage band holds, or somebody says why.** See `AHEAD` below.
 * 4. **Recall 3 and 4 sit no lower than print puts them.**
 *
 * Plus the flat rules: closed sets, deck shape, no name collides with a printed
 * card, every condition named is one `config.ts` registers, and **no card
 * refers to a player's turn** — Daggerheart has a spotlight and the printed
 * corpus says "your turn" exactly zero times in 210 cards. It says "the GM
 * spends a Fear on their turn", which is a different thing and is allowed.
 */

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT = process.argv.includes("--report");

const load = async (f) =>
  (await import(pathToFileURL(join(ROOT, "src", "packs-src", f)).href)).default;

const MARKED = await load("marked-cards.mjs");
const PRINTED = [...(await load("domain-cards.mjs")), ...(await load("dread-cards.mjs"))];

const CONDITIONS = (
  await import(pathToFileURL(join(ROOT, "src", "module", "config.ts")).href)
).CONDITIONS;

const findings = [];
const fail = (card, what) => findings.push(`${card.name} (${card.domain} L${card.level}) — ${what}`);
const note = (what) => findings.push(`deck — ${what}`);

/** Rules text with our emphasis removed, so a regex reads words. */
const plain = (c) => String(c.text).replace(/\*\*|__|\*|_/g, "").replace(/\s+/g, " ");

/* ── the measurements ─────────────────────────────────────────────────
   Each returns the printed answer, so the constant the check uses is visibly
   derived rather than typed in. Run with --report to see them. */

/** Every `NdM+K … damage` in a card, with its average and whether it scales. */
const damages = (c) => {
  const t = plain(c);
  const out = [];
  for (const m of t.matchAll(/(\d*)d(\d+)(?:\s*\+\s*(\d+))?\s*(?:magic|physical)?\s*damage/gi)) {
    const n = +(m[1] || 1);
    const f = +m[2];
    const b = +(m[3] || 0);
    out.push({ expr: `${m[1] || ""}d${f}${b ? `+${b}` : ""}`, avg: n * (f + 1) / 2 + b });
  }
  return out;
};

const scales = (c) => /using your Proficiency/i.test(plain(c));
/** A card is *gated* when using it costs something or is limited per rest. */
const gated = (c) =>
  /once per (long |short )?(rest|session|scene)|spend (a|\d+|any number of) hope|mark (a|\d+|any number of|2 or more) stress/i.test(
    plain(c),
  );
const area = (c) =>
  /all (targets|adversaries|creatures)|each target|up to \w+ targets|all creatures within/i.test(plain(c));
const reaction = (c) => /Reaction Roll/i.test(plain(c));

/**
 * The largest flat damage average print reaches **at or below a level**, for a
 * card of the same kind — one that offers a save for half, or one that does not.
 *
 * Three decisions in that sentence and each is load-bearing.
 *
 * **Flat only.** A `dN+M using your Proficiency` card's average depends on the
 * character, so it is not a number this can compare; the Proficiency rule above
 * is what governs those instead.
 *
 * **At or below**, because a level 5 card is competing with everything a level
 * 5 character can already hold, not only with the two cards printed at 5.
 *
 * **Split by save**, because that is the same distinction rule 2 draws, and
 * mixing them makes the band meaningless: Stunning Sunlight's 4d20+5 averages
 * 47 and every target gets a Reaction Roll, so a single global maximum would be
 * 47 and would permit anything.
 */
const band = (() => {
  const pts = [];
  for (const c of PRINTED) {
    if (scales(c)) continue;
    for (const d of damages(c)) pts.push({ lvl: c.level, avg: d.avg, save: reaction(c), name: c.name, expr: d.expr });
  }
  return (level, save) => {
    const r = pts.filter((p) => p.lvl <= level && p.save === save);
    return r.length ? r.reduce((a, b) => (b.avg > a.avg ? b : a)) : null;
  };
})();

/**
 * Cards that sit above their band on purpose, and the reading that put them
 * there.
 *
 * `check-resources.mjs`'s pattern, because the problem is the same shape: a
 * measurement cannot make this call and a reader can. What it is for here is
 * the **hole in the middle of the printed corpus** — there is no save-for-half
 * area card printed between levels 4 and 7 at all, so the band at level 7 is
 * still quoting a level 3 grimoire and would refuse anything honest.
 *
 * The ratchet runs both ways, exactly as `TYPOS` and `DECLINED` do. A card over
 * its band and not listed here fails; a card listed here that is no longer over
 * its band fails too, because a justification for a number that has since
 * changed is a justification nobody has read since.
 */
const AHEAD = {
  "Null Grip":
    "9 against a level 1 band of 7, which is Book of Tyfar — a grimoire area attack " +
    "with no limiter at all. This is single-target, once per rest, and the deck's " +
    "one statement of force at level 1. The margin is the frame's stated tier of " +
    "headroom and it is the smallest one in either deck.",
  Wildfire:
    "20.5 against a band still quoting Book of Korvax at level 3, because print has " +
    "no save-for-half area card between levels 4 and 7. The honest peer is Earthquake " +
    "— level 9, once per rest, 24.5 — and this is under it, once per LONG rest, " +
    "behind a Difficulty 15 roll that has to land first.",
  Bloom:
    "23 against the same stale level 3 band. Its real peers are Ground Pound (level 8, " +
    "30, repeatable for 2 Hope) and Earthquake (level 9, 24.5, once per rest). Bloom is " +
    "level 7, once per rest, 23 — below both, and it has to beat Difficulty 16 first.",
};

/** Levels at which a printed card carries Recall 3 or 4. */
const HIGH_RECALL_FLOOR = Math.min(...PRINTED.filter((c) => c.recall >= 3).map((c) => c.level));

/** Difficulties printed inside a `Roll (N)`. */
const DIFFICULTIES = [
  ...new Set(PRINTED.flatMap((c) => [...plain(c).matchAll(/Roll \((\d+)\)/g)].map((m) => +m[1]))),
].sort((a, b) => a - b);

/* ── 1. closed sets and deck shape ────────────────────────────────────
   Three at level 1 and two at every level after, per domain, which is what
   all eleven other decks do. A count and not a name list, because unlike the
   equipment tables there is no repeated structure to name — but the check is
   still per level rather than per deck, so a card lost at level 6 and one
   added at level 7 does not cancel out. */

const DOMAINS = ["root", "void"];
const THREADS = {
  void: ["Unmaking", "Calculation"],
  root: ["Hunger", "The Dreaming Root"],
};

for (const c of MARKED) {
  if (!DOMAINS.includes(c.domain)) fail(c, `domain "${c.domain}" is not root or void`);
  if (!["ability", "spell"].includes(c.cardType)) fail(c, `card type "${c.cardType}" — no grimoires`);
  if (!Number.isInteger(c.level) || c.level < 1 || c.level > 10) fail(c, `level ${c.level}`);
  if (!Number.isInteger(c.recall) || c.recall < 0 || c.recall > 4) fail(c, `Recall ${c.recall}`);
  if (!c.text?.trim()) fail(c, "has no rules text");

  const legal = [...(THREADS[c.domain] ?? []), "both"];
  if (!legal.includes(c.thread)) fail(c, `thread "${c.thread}" is not one of ${legal.join(", ")}`);
}

for (const d of DOMAINS) {
  const deck = MARKED.filter((c) => c.domain === d);
  if (deck.length !== 21) note(`${d} has ${deck.length} cards, not 21`);
  for (let L = 1; L <= 10; L++) {
    const want = L === 1 ? 3 : 2;
    const got = deck.filter((c) => c.level === L).length;
    if (got !== want) note(`${d} level ${L} has ${got} cards, not ${want}`);
  }
  const both = deck.filter((c) => c.thread === "both");
  if (both.length !== 1) note(`${d} has ${both.length} cards on both threads, not 1`);
}

/* ── 2. names ─────────────────────────────────────────────────────────
   Unique within the deck, and distinct from every printed card — not for
   tidiness but because `build-packs.mjs` derives a document's `_id` from
   `pack:type:name`, and these land in the same `domains` pack. Two cards
   called Crush would be one document, silently. */

const seen = new Map();
for (const c of MARKED) {
  const k = c.name.toLowerCase();
  if (seen.has(k)) note(`two cards named "${c.name}"`);
  seen.set(k, c);
}
for (const p of PRINTED) {
  const c = seen.get(p.name.toLowerCase());
  if (c) fail(c, `collides with the printed ${p.domain} card of the same name — same pack, same _id`);
}

/* ── 3. rules language ────────────────────────────────────────────────
   A player's turn does not exist in this game. The GM's does, and the printed
   corpus uses it for exactly one thing — "until the GM spends a Fear on their
   turn" — so that phrase is allowed through and everything else is not. */

for (const c of MARKED) {
  const t = plain(c);
  const turns = [...t.matchAll(/[^.]*\bturns?\b[^.]*/gi)].map((m) => m[0].trim());
  for (const s of turns) {
    if (/GM spends a Fear on their turn/i.test(s)) continue;
    fail(c, `refers to a turn — this game has a spotlight: "${s}"`);
  }

  /* Every condition named in italics has to be one the system registers, or
     the token can never wear it and the card is describing something that
     does not exist. Matched off our own emphasis, which is why this reads the
     raw text rather than `plain`. */
  for (const m of String(c.text).matchAll(/_([A-Z][A-Za-z ]+)_/g)) {
    const name = m[1].trim();
    if (!CONDITIONS.some((x) => x.name.toLowerCase() === name.toLowerCase())) {
      fail(c, `names the condition "${name}", which config.ts does not register`);
    }
  }

  for (const m of t.matchAll(/Roll \((\d+)\)/g)) {
    const n = +m[1];
    if (n < DIFFICULTIES[0] || n > DIFFICULTIES.at(-1)) {
      fail(c, `Difficulty ${n} is outside the printed range ${DIFFICULTIES[0]}–${DIFFICULTIES.at(-1)}`);
    }
  }
}

/* ── 4. the four regularities ─────────────────────────────────────────── */

for (const c of MARKED) {
  const dmg = damages(c);
  if (!dmg.length) continue;

  if (!scales(c) && !gated(c)) {
    fail(
      c,
      "deals flat dice and is repeatable for nothing — every printed card that " +
        "does this writes its damage `using your Proficiency`",
    );
  }

  if (area(c) && c.level > 4 && !reaction(c)) {
    fail(
      c,
      `is area damage at level ${c.level} with no Reaction Roll — the printed idiom ` +
        "above level 4 is a save for half",
    );
  }

  if (scales(c)) continue;
  const b = band(c.level, reaction(c));
  const worst = dmg.reduce((a, x) => (x.avg > a.avg ? x : a));
  const over = b && worst.avg > b.avg;

  if (over && !(c.name in AHEAD)) {
    fail(
      c,
      `${worst.expr} averages ${worst.avg}, over the level ${c.level} ` +
        `${reaction(c) ? "save-for-half" : "no-save"} band of ${b.avg} ` +
        `(${b.expr}, ${b.name} L${b.lvl}) — put it in band or say why in AHEAD`,
    );
  }
  if (!over && c.name in AHEAD) {
    fail(c, "is listed in AHEAD but is inside its band now — the reading is stale");
  }
}

for (const name of Object.keys(AHEAD)) {
  if (!MARKED.some((c) => c.name === name)) note(`AHEAD names "${name}", which is not a card in either deck`);
}

/* Recall 3 and 4 sit no lower than print puts them, on every card rather than
   only the ones that deal damage. */
for (const c of MARKED) {
  if (c.recall >= 3 && c.level < HIGH_RECALL_FLOOR) {
    fail(c, `Recall ${c.recall} at level ${c.level} — print puts Recall 3+ no lower than ${HIGH_RECALL_FLOOR}`);
  }
}

/* ── report ───────────────────────────────────────────────────────────── */

if (REPORT) {
  const stat = (label, v) => console.log(`  ${label.padEnd(38)}${v}`);
  console.log("\nMEASURED OFF THE PRINTED CORPUS");
  stat("cards", PRINTED.length);
  stat("lowest level carrying Recall 3+", HIGH_RECALL_FLOOR);
  stat("printed Roll (N) difficulties", DIFFICULTIES.join(" "));
  console.log("  flat-damage band at or below level");
  console.log("    lvl  no-save                        save for half");
  for (let L = 1; L <= 10; L++) {
    const a = band(L, false);
    const b = band(L, true);
    const show = (x) => (x ? `${x.avg} ${x.expr} ${x.name}(L${x.lvl})` : "—");
    console.log(`    ${String(L).padStart(3)}  ${show(a).padEnd(31)}${show(b)}`);
  }

  for (const d of DOMAINS) {
    const deck = MARKED.filter((c) => c.domain === d);
    const rc = {};
    deck.forEach((c) => (rc[c.recall] = (rc[c.recall] || 0) + 1));
    const th = {};
    deck.forEach((c) => (th[c.thread] = (th[c.thread] || 0) + 1));
    console.log(`\n${d.toUpperCase()} — ${deck.length} cards`);
    stat("recall", Object.keys(rc).sort().map((k) => `R${k}×${rc[k]}`).join(" "));
    stat("average recall", (deck.reduce((a, c) => a + c.recall, 0) / deck.length).toFixed(2));
    stat("threads", Object.entries(th).map(([k, v]) => `${k} ${v}`).join(" · "));
    stat("abilities / spells", `${deck.filter((c) => c.cardType === "ability").length} / ${deck.filter((c) => c.cardType === "spell").length}`);
    stat("gated (per rest or costed)", `${deck.filter(gated).length} of ${deck.length}`);
    stat("repeatable, Proficiency-scaled", deck.filter((c) => damages(c).length && scales(c)).map((c) => c.name).join(", ") || "—");
    const band = {};
    for (const c of deck) for (const x of damages(c)) (band[c.level] ??= []).push(`${x.expr}=${x.avg}`);
    for (const L of Object.keys(band).sort((a, b) => a - b)) stat(`damage L${L}`, band[L].join(" "));
  }
  console.log("");
}

if (findings.length) {
  console.error(`\ncheck-marked: ${findings.length} finding${findings.length === 1 ? "" : "s"}\n`);
  for (const f of findings) console.error(`  ✗ ${f}`);
  console.error("");
  process.exit(1);
}
console.log(`check-marked: ${MARKED.length} cards, clean.`);
