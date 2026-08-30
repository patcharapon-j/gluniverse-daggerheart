/**
 * The parsers, demoted.
 *
 * Three regular expressions used to decide a card's buttons at render time —
 * `featurePrice` for a cost, `rollCall` for a roll, and a sniff for the literal
 * words "damage roll". Each was carefully bounded and each was wrong somewhere
 * nobody could see, because a card with a button too many and a card with a
 * button too few both render perfectly and the only witness is the player who
 * paid.
 *
 * They are not deleted, and the reason is the other half of the ask: a GM
 * writing a homebrew card should not have to fill in eight fields by hand to
 * get a Stress button. So the same patterns run **once, on a press**, and their
 * guess arrives as ordinary editable rows in the Automation panel. Somebody
 * looks at it before it can charge anybody anything.
 *
 * That is the whole distinction and it is worth stating plainly: **a guess you
 * can see and edit is a different object from a guess that acts.** Nothing here
 * is on a render path, nothing here writes without a press, and everything here
 * produces data a human then owns.
 *
 * It is deliberately *generous* where the runtime version had to be careful.
 * An over-suggestion costs one click to delete; the failure that mattered was
 * an over-*charge*, and this cannot make one.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { TRAITS } from "../config.ts";
import { isFree, plain, type Price } from "./cards.ts";

/* ── the price parse, moved here whole ────────────────────────────────────
   This lived in `sheets/cards.ts` and decided what every feature on the
   character sheet charged. It decides nothing now — `authoredPrice` reads the
   answer off the document — and it is here rather than deleted because it is
   still the best first guess anybody has about a sentence nobody has read yet.

   Its own argument is preserved below unedited, because the reasoning is what
   makes the suggestion trustworthy enough to offer: the discriminator is *who
   is paying*, an offer or a bare imperative at the head of a clause, and
   everything else in the paragraph belongs to somebody else. Ranger's Focus is
   still the case that settles it.

   What changed is only the consequence of being wrong. An over-match used to
   take a Stress off somebody; it now puts a row on a form that a GM deletes. */

const AMOUNTS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
};

const amount = (w: string): number => AMOUNTS[w.toLowerCase()] ?? (Number(w) || 0);

/**
 * Emphasis and whitespace, together, anywhere the two can meet.
 *
 * `plain` leaves markdown behind rather than markup — a card that prints
 * "you can **mark a Stress**" arrives with the asterisks still in it, and
 * they land in the middle of the phrase rather than around it. Every junction
 * in the pattern therefore has to allow them.
 */
const MK = "[\\s*]";

/**
 * What may stand immediately before the verb: a clause head, or an offer.
 *
 * These are the two ways the holder's own price is written. Everything else
 * that could precede "mark a Stress" — "must", "would", "they", "the target",
 * a bare "when you" — is a consequence or somebody else's bill, and is left
 * unreachable on purpose. See the argument above.
 *
 * `•` is here because `plain` renders a list item as one, so a bulleted price
 * is a price at the head of a clause with no punctuation in front of it.
 */
const PAYER = "(?:^|<br>|•|[.!?:;,]|\\band\\b|\\bthen\\b|\\byou can\\b|\\byou may\\b)";

/**
 * The clause itself, kept separate from the number so the ratchet can quote it.
 *
 * `tools/check-cards.mjs` cannot import this — it is a `.mjs` tool and this is
 * TypeScript — so it lifts these three declarations out of the file as *text*,
 * which is `check-item-sheet.mjs`'s move for the same reason. That is what
 * keeps there from being a second copy of the pattern maintained by hand, and
 * it is why the three are named constants rather than one inlined literal.
 */
const priceClause = (text: string, unit: string): RegExpExecArray | null =>
  new RegExp(
    `${PAYER}${MK}*(?:spend|mark|pay)${MK}+(a|an|one|two|three|four|five|six|\\d+)${MK}+${unit}\\b`,
    "i",
  ).exec(text);

/** The first clause in which *you* are asked to pay this currency, if any. */
const priceOf = (text: string, unit: string): number => {
  const m = priceClause(text, unit);
  return m ? amount(m[1] as string) : 0;
};

/**
 * What the pattern reads out of a block's prose.
 *
 * @param system the Item's own `system`, when the block *is* the Item — an
 * authored `stressCost`/`fearCost` outranks the text, because somebody typed
 * it deliberately.
 */
export function featurePrice(feature: any, system?: any): Price {
  const text = plain(feature?.description).replace(/<br>/g, " ");
  return {
    hope: priceOf(text, "hope"),
    stress: Number(system?.stressCost) || priceOf(text, "stress"),
    fear: Number(system?.fearCost) || priceOf(text, "fear"),
    armor: Math.max(priceOf(text, "armor slot"), priceOf(text, "armor slots")),
  };
}

/* ── the roll call ────────────────────────────────────────────────────────
   Lifted here from `post-card.ts` when the runtime stopped using it. The
   discipline it was built with still applies and is worth keeping: the verb
   must be `make`, imperative, at the head of a clause or inside an offer.
   "When you would make a Spellcast Roll" names a roll being made somewhere
   else; "+1 to Spellcast Rolls" describes a bonus to one.

   No Reaction Rolls, which falls out of the shape rather than needing a rule:
   the trait word has to sit immediately against `Roll`, so "make an Agility
   Reaction Roll" is unreachable. That is what keeps the *target's* rolls out
   of a suggestion for the holder's card. */

const ROLL_MK = "[\\s*_]";
const ROLL_CALLER =
  "(?:^|<br>|•|[.!?:;,]|\\band\\b|\\bthen\\b|\\byou can\\b|\\byou may\\b|\\bto\\b)";
const ROLL_WORDS = [...TRAITS, "spellcast"].join("|");
const ROLL_RX = new RegExp(
  `${ROLL_CALLER}${ROLL_MK}*make${ROLL_MK}+an?${ROLL_MK}+(${ROLL_WORDS})` +
    `${ROLL_MK}+roll\\b${ROLL_MK}*(?:\\(${ROLL_MK}*(\\d+)${ROLL_MK}*\\))?`,
  "i",
);

/** The first roll a block asks for, and only the first. */
export const rollCall = (text: string): { word: string; dc: number | null } | null => {
  const m = ROLL_RX.exec(text);
  return m ? { word: String(m[1]).toLowerCase(), dc: m[2] ? Number(m[2]) : null } : null;
};

/**
 * The shortest phrase in `text` that a pattern matched, for `said`.
 *
 * `said` is the load-bearing field on an authored action — it is what a build
 * check tests against the card and what a GM reads to understand why a button
 * exists — so a suggestion that left it blank would be handing somebody a row
 * they have to justify from memory. Trimmed to the match itself rather than
 * the sentence around it, because the check wants the shortest true quotation.
 */
const quote = (text: string, rx: RegExp): string => {
  const m = rx.exec(text);
  if (!m) return "";
  return String(m[0]).replace(/^[\s.,;:!?•]+/, "").trim();
};

const COST_RX = {
  hope: /(?:spend|pay)\s+\**(?:a|an|one|two|three|four|five|six|\d+)\**\s+\**Hope/i,
  stress: /mark\s+\**(?:a|an|one|two|three|four|five|six|\d+)\**\s+\**Stress/i,
  armorSlots: /mark\s+\**(?:a|an|one|two|three|four|five|six|\d+)\**\s+\**Armor Slot/i,
  fear: /(?:spend|pay)\s+\**(?:a|an|one|two|three|four|five|six|\d+)\**\s+\**Fear/i,
} as const;

/**
 * What this rules text appears to ask for, as authored actions.
 *
 * @param text the block's rules text, as stored (markdown, `<br>` breaks).
 * @param system the Item's own `system`, when the block *is* the Item — an
 *   authored `stressCost`/`fearCost` outranks the prose, because somebody
 *   typed it deliberately.
 * @param has what the document actually carries, so a suggestion can only ever
 *   name a counter, die pool or damage expression that exists. A suggestion
 *   naming one that does not is a button that silently never appears.
 */
export function suggestActions(
  text: string,
  system?: any,
  has: { resources?: string[]; dice?: string[]; damage?: string[] } = {},
): any[] {
  const flat = plain(text ?? "").replace(/<br>/g, " ");
  const out: any[] = [];

  const blank = () => ({
    kind: "pay",
    label: "",
    subject: "self",
    amount: { hope: 0, stress: 0, hitPoints: 0, armorSlots: 0, fear: 0 },
    resource: "",
    by: 0,
    op: "place",
    trait: "",
    dc: 0,
    damageName: "",
    formula: "",
    condition: "",
    effect: { name: "", duration: "temporary", modifiers: [] },
    mark: 1,
    said: "",
    when: "",
    steps: [],
  });

  /* The price, through the same `featurePrice` the runtime used to charge with
     — one call, so a suggestion and the old behaviour cannot disagree about
     what the pattern reads. `said` is quoted per currency rather than once for
     the whole price, because a card asking for a Hope and a Stress states them
     in two different places and one quotation would be wrong about one. */
  const price = featurePrice({ description: text }, system);
  if (!isFree(price)) {
    const pay = blank();
    pay.amount = {
      hope: price.hope,
      stress: price.stress,
      hitPoints: 0,
      armorSlots: price.armor,
      fear: price.fear,
    };
    pay.said = [
      price.hope && quote(flat, COST_RX.hope),
      price.stress && quote(flat, COST_RX.stress),
      price.armor && quote(flat, COST_RX.armorSlots),
      price.fear && quote(flat, COST_RX.fear),
    ].filter(Boolean).join(" · ");
    out.push(pay);
  }

  const call = rollCall(flat);
  if (call) {
    const roll = blank();
    roll.kind = "roll-trait";
    roll.trait = call.word;
    roll.dc = call.dc ?? 0;
    roll.said = quote(flat, ROLL_RX);
    out.push(roll);
  }

  /* One press per printed expression this document already carries. Suggested
     rather than derived at render, which is the whole change: `cardDamage` is
     itself an annotation somebody read, and a button for it is a second
     reading that belongs beside the first. */
  for (const name of has.damage ?? []) {
    const dmg = blank();
    dmg.kind = "roll-card-damage";
    dmg.damageName = name;
    dmg.said = name || quote(flat, /\d*d(?:4|6|8|10|12|20)(?:\s*\+\s*\d+)?/i);
    out.push(dmg);
  }

  /* The weapon's own damage, on the phrase the old sniff fired on. Kept
     because the phrase is genuinely a good signal — fifty rule units say
     "damage roll" and the clause is nearly always about the weapon in your
     hand — and demoted because "nearly always" is not a thing that should
     charge anybody. */
  if (/\bdamage roll\b/i.test(flat)) {
    const weapon = blank();
    weapon.kind = "roll-damage";
    weapon.said = quote(flat, /[^.!?]*\bdamage roll\b/i);
    out.push(weapon);
  }

  /* A counter this document carries and this rule mentions by name. The old
     runtime added a button for *every* counter on the item and guessed the
     sign by testing the counter's name against `/^uses?$/i`; this names the
     one the sentence actually mentions and states the sign from the verb. */
  for (const name of has.resources ?? []) {
    if (!name) continue;
    const rx = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (!rx.test(flat)) continue;
    const spends = /\b(?:spend|remove|lose|clear)\b/i.test(flat);
    const move = blank();
    move.kind = "move-resource";
    move.resource = name;
    move.by = spends ? -1 : 1;
    move.said = quote(flat, rx);
    out.push(move);
  }

  return out;
}
