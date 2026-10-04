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
 * obeys.
 *
 * Everything this file enforces is **measured off the 210 printed cards rather
 * than asserted**, and the measurement is in this file so that a claim about
 * the corpus can be re-taken rather than believed. Run with `--report`.
 *
 * ── what changed, and why the old version had it backwards ────────────
 * This check used to enforce a **ceiling only**, and two of the four rules it
 * enforced were false. It asserted that *every* printed flat-damage card is
 * gated; `Cinder Grasp` (Arcana 2, `1d20+3`, no limiter at all) and `Tempest`
 * (Sage 10) say otherwise. It asserted that area damage above level 4 *always*
 * offers a save; `Falling Sky` and `Tempest` say otherwise. Both false rules
 * pushed this deck's damage *down*, and a ceiling-only check could never
 * notice, because the decks' problem was never that they were too strong.
 *
 * These decks charge the GM a Fear on **every** use. A card that merely matches
 * a printed card of the same level is therefore a card nobody should take. So
 * the check that matters is a **floor**: every card has to beat a printed card
 * at or below its own level, on a named axis, and `LEADS` records which. That
 * makes the balance audit a build artifact instead of a document that rots.
 *
 * ── the rules ─────────────────────────────────────────────────────────
 *  1. Closed sets, deck shape, unique names, legal conditions, printed
 *     difficulty range, no reference to a player's turn, and the two decks'
 *     order in the built compendium against `config.ts`'s `MARKED_DOMAINS`.
 *  2. **A damage card carries a usage limit or a cost**, because 25 of print's
 *     29 damage cards do, and **single-target damage scales; area damage may be
 *     flat.** 10 of print's 15 single-target damage cards write `using your
 *     Proficiency` or `using your Spellcast trait`; of the 5 flat ones, 4 are
 *     costed and exactly one is unlimited. So an unlimited flat single-target
 *     damage card fails here.
 *
 *     The figure is over print's *damage* cards and not over all 210, which is
 *     worth stating because the wider claim is false: 154 of the 210 carry a
 *     limit or a cost, so a majority of the corpus is cards this rule has
 *     nothing to say about. The rule is about what print charges for **dice**.
 *  3. **Area damage above level 4 offers a Reaction Roll and halves.** Two
 *     printed exceptions, both level 10. Enforced anyway: they are the top of
 *     the book and we are not.
 *  4. **The ceiling.** No flat damage average exceeds print's maximum for its
 *     shape and save class. Measured: single/no-save 13.5, area/no-save 29,
 *     area/save-for-half 47.
 *  5. **The floor.** Every card names, in `LEADS`, a printed card it beats and
 *     the axis it beats it on — or claims `novel`, meaning print has no card
 *     that does this at any level. A `damage` claim is checked arithmetically
 *     against the named card. Naming a card above our own level is the
 *     stronger claim and the report counts those separately. Naming one more
 *     than two levels *below* us is too weak a claim and fails.
 *  6. **The gating cap.** Print gates 31% of its cards once per rest, long
 *     rest or session. A deck that also charges a Fear per use may not exceed
 *     50%.
 *  7. **No Fear engine.** A card that takes Fear out of the GM's pool is
 *     gated, so no loop can pay for itself faster than it costs. The Homebrew
 *     Kit warns about this shape for adversaries; it is worse on a PC card.
 *  8. **Recall 3 and 4 sit no lower than print puts them.**
 */

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT = process.argv.includes("--report");

const load = async (f) =>
  (await import(pathToFileURL(join(ROOT, "src", "packs-src", f)).href)).default;

const MARKED = await load("marked-cards.mjs");
const LEADS = await load("marked-leads.mjs");
const PRINTED = [...(await load("domain-cards.mjs")), ...(await load("dread-cards.mjs"))];

const { CONDITIONS, MARKED_DOMAINS } = await import(
  pathToFileURL(join(ROOT, "src", "module", "config.ts")).href
);

/* The built pack, for the one assertion that is about the compendium rather
   than about a card. Imported last because it pulls the damage and resource
   annotators in behind it. */
const BUILT = await load("domains.mjs");

const findings = [];
const fail = (card, what) => findings.push(`${card.name} (${card.domain} L${card.level}) — ${what}`);
const note = (what) => findings.push(`deck — ${what}`);

/** Rules text with our emphasis removed, so a regex reads words. */
const plain = (c) => String(c.text).replace(/\*\*|__|\*|_/g, "").replace(/\s+/g, " ");

/* ── the measurements ─────────────────────────────────────────────────
   Each returns the printed answer, so every constant the check uses is
   visibly derived rather than typed in. */

/** Every `NdM+K … damage` in a card, with its average. */
const damages = (c) => {
  const t = plain(c);
  const out = [];
  for (const m of t.matchAll(/(\d*)d(\d+)(?:\s*\+\s*(\d+))?\s*(?:magic|physical)?\s*damage/gi)) {
    const n = +(m[1] || 1);
    const f = +m[2];
    const b = +(m[3] || 0);
    out.push({ expr: `${m[1] || ""}d${f}${b ? `+${b}` : ""}`, avg: (n * (f + 1)) / 2 + b });
  }
  return out;
};

const worst = (c) => damages(c).reduce((a, x) => (x.avg > a.avg ? x : a), { avg: 0, expr: "—" });

const scales = (c) => /using your (Proficiency|Spellcast trait)/i.test(plain(c));
const perRest = (c) => /once per (long |short )?(rest|session|scene)/i.test(plain(c));
const costed = (c) =>
  /spend (a|\d+|any number of|up to \d+) hope|mark (a|\d+|any number of|2 or more) stress|mark an armor slot|spend (a|two|any number of) tokens?|spend a token/i.test(
    plain(c),
  );
/** Gated means limited per rest *or* paid for — print's two main levers. */
const gated = (c) => perRest(c) || costed(c);
const area = (c) =>
  /all (targets|adversaries|creatures)|each target|up to \w+ targets|all other targets/i.test(plain(c));
const reaction = (c) => /Reaction Roll/i.test(plain(c));
const takesFear = (c) => /(GM|Fear Pool) loses? a Fear|remove a Fear|steal a number of Fear|doesn't gain a Fear/i.test(plain(c));

/**
 * The largest flat damage average print reaches **at or below a level**, for a
 * card of the same *shape* and the same *save class*.
 *
 * Four decisions and each is load-bearing.
 *
 * **Flat only**, because a `dN+M using your Proficiency` card's average depends
 * on the character, so it is not a number this can compare; rule 2 governs
 * those instead.
 *
 * **At or below**, because a level 5 card competes with everything a level 5
 * character can already hold, not only with the two printed at 5.
 *
 * **Split by save**, because mixing them makes the band meaningless:
 * `Stunning Sunlight`'s 4d20+5 averages 47 behind a Reaction Roll, and a single
 * global maximum of 47 would permit anything.
 *
 * **Split by shape**, which the old version missed and which is the whole
 * reason it mis-banded this deck. Print puts flat dice on area cards and
 * Proficiency scaling on single-target cards, so a single global band compares
 * a single-target spell against a grimoire's wall of flame. The split makes
 * `Book of Grynn` stop being Crush's peer.
 */
const band = (() => {
  const pts = [];
  for (const c of PRINTED) {
    if (scales(c)) continue;
    for (const d of damages(c))
      pts.push({ lvl: c.level, avg: d.avg, save: reaction(c), area: area(c), name: c.name, expr: d.expr });
  }
  const pick = (r) => (r.length ? r.reduce((a, b) => (b.avg > a.avg ? b : a)) : null);
  const at = (level, save, ar) => pick(pts.filter((p) => p.lvl <= level && p.save === save && p.area === ar));
  at.ceiling = (save, ar) => pick(pts.filter((p) => p.save === save && p.area === ar));
  return at;
})();

/** Levels at which a printed card carries Recall 3 or 4. */
const HIGH_RECALL_FLOOR = Math.min(...PRINTED.filter((c) => c.recall >= 3).map((c) => c.level));

/** Difficulties printed inside a `Roll (N)`. */
const DIFFICULTIES = [
  ...new Set(PRINTED.flatMap((c) => [...plain(c).matchAll(/Roll \((\d+)\)/g)].map((m) => +m[1]))),
].sort((a, b) => a - b);

/** Share of printed cards carrying a usage limit. */
const PRINTED_GATE_RATE = PRINTED.filter(perRest).length / PRINTED.length;
/** How far past print's rate a Fear-taxed deck may go. One authored number. */
const GATE_CAP = 0.5;

/* ── the floor ───────────────────────────────────────────────────────── */

/* One entry per card, in `src/packs-src/marked-leads.mjs` — the printed card
   it beats and the axis it beats it on. That is the balance audit, and it is
   data rather than a comment because `sync-marked-note.mjs` renders it into
   the vault note as well, and an argument kept in two places drifts. */

/* ── 1. closed sets and deck shape ────────────────────────────────────
   Three at level 1 and two at every level after, per domain, which is what
   all eleven other decks do. Per level rather than per deck, so a card lost
   at level 6 and one added at 7 does not cancel out. */

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

/* The decks' order in the compendium, which is the one thing here that is
   about the pack rather than about a card.

   It was wrong and silently so. `marked-cards.mjs` authors Void first, and
   `src/packs-src/domains.mjs` used to concatenate it as authored, so the built
   folder list read "…Dread, Void, Root" while `config.ts`'s `MARKED_DOMAINS`,
   this file's own `DOMAINS` and `domains.mjs`'s own comment all said root then
   void. Nothing on screen says which of two orders is the intended one, which
   is `check-variant-rules.mjs`'s folder-name problem in a new place: a reader
   sees a list and has no way to know it is the wrong list.

   So both halves are asserted. `DOMAINS` here has to match `config.ts`, or
   this file is checking the decks against a closed set the system does not
   have; and the built pack's folder sequence has to match it too, or the
   constant is right and the compendium still is not. */
if (DOMAINS.join() !== MARKED_DOMAINS.join()) {
  note(
    `the deck order here is ${DOMAINS.join(", ")} and config.ts's MARKED_DOMAINS ` +
      `is ${MARKED_DOMAINS.join(", ")} — one of the two is wrong`,
  );
}

{
  const folders = [...new Set(BUILT.map((d) => d.folder))];
  const theirs = folders.filter((f) => MARKED_DOMAINS.some((d) => f?.toLowerCase() === d));
  const want = MARKED_DOMAINS.map((d) => d[0].toUpperCase() + d.slice(1));
  if (theirs.join() !== want.join()) {
    note(
      `the built domains pack folders the marked decks ${theirs.join(", ") || "nowhere"} ` +
        `and config.ts puts them ${want.join(", ")} — see the deck ordering in domains.mjs`,
    );
  }
  /* Order is the check above; this one is only about *position*, so it
     compares the last two as a set. Otherwise one wrong order reports twice
     and the second message reads as a separate defect. */
  if ([...folders.slice(-2)].sort().join() !== [...want].sort().join()) {
    note(
      `the built domains pack ends ${folders.slice(-3).join(", ")} — the two marked ` +
        `decks go last, after Dread`,
    );
  }
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

  /* The Homebrew Kit allows one token card per domain, to keep the
     bookkeeping down. Exactly one, because the decks used to have none and
     that cost them a whole balancing lever. */
  const tok = deck.filter((c) => /place a number of tokens|place a token/i.test(plain(c)));
  if (tok.length !== 1) {
    note(`${d} has ${tok.length} token cards, not 1 (${tok.map((c) => c.name).join(", ") || "none"})`);
  }
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
  for (const s of [...t.matchAll(/[^.]*\bturns?\b[^.]*/gi)].map((m) => m[0].trim())) {
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

  /* The Homebrew Kit's asymmetry rule: a PC's offensive feature calls for a
     reaction roll with no trait, because adversaries have no traits. */
  for (const m of t.matchAll(/Reaction Roll \w+/gi)) {
    if (!/Reaction Roll \(/.test(m[0])) fail(c, `"${m[0]}" — a PC card's reaction rolls take no trait`);
  }
}

/* ── 4. the damage conventions ────────────────────────────────────────── */

for (const c of MARKED) {
  if (!damages(c).length) continue;

  /* Four of print's 29 damage cards carry neither a limit nor a cost, and two
     of those four — Preservation Blast and Telekinesis — pay for it by scaling
     with a trait instead. That leaves `Cinder Grasp` and `Tempest` dealing flat
     dice for free and without limit, two cards out of 210. So a damage card
     here carries a usage limit or a resource cost, and this is the rule that
     catches a card whose limit was lifted without a cost replacing it. Five
     cards failed it the first time, which is why it exists. */
  if (!gated(c)) {
    fail(
      c,
      "deals damage with no usage limit and no cost — 25 of print's 29 damage " +
        "cards carry one or the other, so put the price on the rider the way Bolt " +
        "Beacon and Vicious Entangle do",
    );
  }

  if (!area(c) && !scales(c) && !gated(c)) {
    fail(
      c,
      "deals flat dice at a single target and is repeatable for nothing — 10 of print's " +
        "15 single-target damage cards scale with Proficiency, and 4 of the other 5 are costed",
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

  const w = worst(c);
  const cap = band.ceiling(reaction(c), area(c));
  if (!cap) {
    fail(
      c,
      `is flat ${area(c) ? "area" : "single-target"} ${reaction(c) ? "save-for-half" : "no-save"} ` +
        "damage, a shape print never prints — there is no ceiling to measure it against",
    );
  } else if (w.avg > cap.avg) {
    fail(
      c,
      `${w.expr} averages ${w.avg}, over print's ceiling of ${cap.avg} ` +
        `(${cap.expr}, ${cap.name} L${cap.lvl}) for a flat ${area(c) ? "area" : "single-target"} ` +
        `${reaction(c) ? "save-for-half" : "no-save"} card`,
    );
  }
}

/* ── 5. the floor ─────────────────────────────────────────────────────── */

const printedByName = new Map(PRINTED.map((p) => [p.name, p]));

for (const c of MARKED) {
  const lead = LEADS[c.name];
  if (!lead) {
    fail(c, "has no LEADS entry — every card has to beat a printed card at or below its level, and say which");
    continue;
  }

  if (lead.axis === "novel") {
    if (lead.over) fail(c, 'is marked "novel" but still names a card it beats — pick one');
    if (!lead.why?.trim()) fail(c, 'is marked "novel" with no reading attached');
    continue;
  }

  const p = printedByName.get(lead.over);
  if (!p) {
    fail(c, `LEADS names "${lead.over}", which is not a printed card`);
    continue;
  }
  /* Naming a printed card *above* your own level is allowed, and it is the
     frame's brief met visibly — "ahead by one tier" is exactly this claim. It
     is harder to make, not easier, so it is counted in the report rather than
     failed. What would be a cheat is claiming a lead you do not have, and the
     damage axis below is the half of that a measurement can settle. */

  /* Naming a peer several levels *below* us proves little: a level 9 card that
     only beats a level 3 grimoire line has not shown it is worth level 9. Two
     levels of slack, because print's own tiers are three levels wide and a
     card genuinely competes with the tier below it. Past that, find a real
     peer or claim `novel` — which is the honest answer when print has no card
     at our level that does this at all. Damage is exempt because the
     arithmetic already settles it. */
  const gap = c.level - p.level;
  if (lead.axis !== "damage" && gap > 2) {
    fail(
      c,
      `claims the "${lead.axis}" axis over ${p.name} (L${p.level}), ${gap} levels below it — ` +
        "beating a card that far down does not show this is worth its own level. Name a " +
        'peer at or near our tier, or claim "novel" if print has none',
    );
  }

  if (lead.axis === "damage") {
    const mine = worst(c);
    const theirs = worst(p);
    if (!mine.avg) fail(c, 'claims the damage axis but deals none');
    else if (mine.avg <= theirs.avg) {
      fail(
        c,
        `claims the damage axis over ${p.name} (L${p.level}) but ${mine.expr}=${mine.avg} ` +
          `does not beat ${theirs.expr}=${theirs.avg} — pick another axis or raise the dice`,
      );
    }
  } else if (!lead.why?.trim()) {
    fail(c, `claims the "${lead.axis}" axis with no reading attached`);
  }
}

for (const name of Object.keys(LEADS)) {
  if (!MARKED.some((c) => c.name === name)) note(`LEADS names "${name}", which is not a card in either deck`);
}

/* ── 6. the gating cap ────────────────────────────────────────────────── */

const gateRate = MARKED.filter(perRest).length / MARKED.length;
if (gateRate > GATE_CAP) {
  note(
    `${MARKED.filter(perRest).length} of ${MARKED.length} cards carry a usage limit ` +
      `(${(gateRate * 100).toFixed(0)}%), over the ${(GATE_CAP * 100).toFixed(0)}% cap. Print gates ` +
      `${(PRINTED_GATE_RATE * 100).toFixed(0)}% and does not also charge a Fear per use — stacking ` +
      "both is double-charging, and it strangles the Fear economy the frame runs on",
  );
}

/* ── 7. no Fear engine ───────────────────────────────────────────────────
   A card that takes Fear out of the pool has to be gated, or the deck can pay
   for its own cost in a loop. The Kit warns about this shape on adversaries;
   on a PC card it is worse, because the PC chooses when to fire it. */

for (const c of MARKED) {
  if (takesFear(c) && !gated(c)) {
    fail(c, "takes Fear out of the GM's pool and is repeatable for nothing — that is a Fear engine");
  }
}

/* ── 8. recall ──────────────────────────────────────────────────────────
   Recall 3 and 4 sit no lower than print puts them, on every card rather than
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
  stat("carrying a usage limit", `${PRINTED.filter(perRest).length} (${(PRINTED_GATE_RATE * 100).toFixed(0)}%)`);
  stat("lowest level carrying Recall 3+", HIGH_RECALL_FLOOR);
  stat("printed Roll (N) difficulties", DIFFICULTIES.join(" "));
  console.log("  flat-damage ceiling, by shape and save class");
  for (const [ar, sv] of [[false, false], [false, true], [true, false], [true, true]]) {
    const x = band.ceiling(sv, ar);
    stat(
      `    ${ar ? "area  " : "single"} ${sv ? "save-for-half" : "no-save      "}`,
      x ? `${x.avg} (${x.expr}, ${x.name} L${x.lvl})` : "print has none",
    );
  }
  console.log("  flat-damage band at or below level");
  console.log("    lvl  single no-save          area no-save           area save-for-half");
  for (let L = 1; L <= 10; L++) {
    const show = (x) => (x ? `${x.avg} ${x.expr} ${x.name.slice(0, 11)}` : "—");
    console.log(
      `    ${String(L).padStart(3)}  ${show(band(L, false, false)).padEnd(23)}${show(band(L, false, true)).padEnd(23)}${show(band(L, true, true))}`,
    );
  }

  for (const d of DOMAINS) {
    const deck = MARKED.filter((c) => c.domain === d);
    const tally = (f) => {
      const o = {};
      deck.forEach((c) => (o[f(c)] = (o[f(c)] || 0) + 1));
      return o;
    };
    const rc = tally((c) => c.recall);
    console.log(`\n${d.toUpperCase()} — ${deck.length} cards`);
    stat("recall", Object.keys(rc).sort().map((k) => `R${k}×${rc[k]}`).join(" "));
    stat("average recall", (deck.reduce((a, c) => a + c.recall, 0) / deck.length).toFixed(2));
    stat("threads", Object.entries(tally((c) => c.thread)).map(([k, v]) => `${k} ${v}`).join(" · "));
    stat(
      "abilities / spells",
      `${deck.filter((c) => c.cardType === "ability").length} / ${deck.filter((c) => c.cardType === "spell").length}`,
    );
    stat("usage-limited", `${deck.filter(perRest).length} of ${deck.length}`);
    stat("costed but repeatable", `${deck.filter((c) => !perRest(c) && costed(c)).length} of ${deck.length}`);
    stat("token card", deck.filter((c) => /place a number of tokens|place a token/i.test(plain(c))).map((c) => c.name).join(", ") || "—");
    stat("touches the Fear pool", deck.filter(takesFear).map((c) => c.name).join(", ") || "—");
    stat("leads on damage", deck.filter((c) => LEADS[c.name]?.axis === "damage").map((c) => c.name).join(", ") || "—");
    stat("leads on something print lacks", deck.filter((c) => LEADS[c.name]?.axis === "novel").map((c) => c.name).join(", ") || "—");
    stat(
      "beats a card above its own level",
      deck
        .filter((c) => {
          const o = LEADS[c.name]?.over;
          return o && printedByName.get(o)?.level > c.level;
        })
        .map((c) => `${c.name}→${LEADS[c.name].over}`)
        .join(", ") || "—",
    );
    const dmg = {};
    for (const c of deck) for (const x of damages(c)) (dmg[c.level] ??= []).push(`${x.expr}=${x.avg}${scales(c) ? "*" : ""}`);
    for (const L of Object.keys(dmg).sort((a, b) => a - b)) stat(`damage L${L}`, dmg[L].join(" "));
  }
  console.log("\n  * scales with Proficiency\n");
}

if (findings.length) {
  console.error(`\ncheck-marked: ${findings.length} finding${findings.length === 1 ? "" : "s"}\n`);
  for (const f of findings) console.error(`  ✗ ${f}`);
  console.error("");
  process.exit(1);
}
console.log(`check-marked: ${MARKED.length} cards, clean.`);
