/**
 * "Roll this trait, for this actor, beside this element."
 *
 * The roll popover is the only surface in this system that is a *sentence you
 * are still composing* — advantage and its sources, a flat modifier, the
 * Experiences you are bringing in and the Hope they cost — and until now the
 * only place that sentence could be started was the character sheet. A card in
 * the chat log that says "Make a Spellcast Roll" is asking for exactly the same
 * sentence, and the log is where a player is looking when the card is the thing
 * they just played.
 *
 * So this is the seam, and it is deliberately thin. `dice/chat.ts` is the
 * *message* layer: it knows which flag a claim spends and how a `<li>` is
 * dressed, and it has no business knowing that a popover exists, where it is
 * anchored or how a base modifier is summed. `CharacterSheet.svelte` already
 * owns that knowledge and cannot lend it — a Svelte component is not something
 * chat can import. One call, two callers, no second copy of the arithmetic.
 *
 * Three things are the caller's and everything else is derived here:
 *
 * - **the anchor**, because only the caller knows what was pressed. `prep`
 *   places itself beside whatever rect it is handed and flips left when it
 *   would overflow, which is what a 300px chat sidebar needs and what a trait
 *   plate on a sheet needs for the opposite reason.
 * - **the Difficulty**, because it is nearly always nobody's. The popover
 *   deliberately does not offer one — a target number is the GM's to set and
 *   the player usually does not know it — and the single exception is a card
 *   that *prints* it: "Make a Spellcast Roll (15)" is a Difficulty the table
 *   can already read off the object in front of them.
 * - **the wording**, when the caller has a better name for the roll than the
 *   trait does. A marked domain card casts with Instinct and says "Spellcast
 *   Roll"; the popover heading should say what the card says and the meta line
 *   should say which trait is actually going into the dice.
 *
 * `null` on every way out, exactly as `prep` resolves null on every way out.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { traitLabel, type Trait } from "../config.ts";
import { rollModifierTerms } from "../data/modifiers.ts";
import { rollTrait } from "../dice/actions.ts";
import { prep } from "../ui/prep.js";

export interface AskRollOptions {
  /**
   * A Difficulty the caller can *see printed*. Absent or null leaves the card
   * honestly saying there was no target number, which is the common case.
   */
  dc?: number | null;
  /** What is being rolled, when the caller's own name for it is better. */
  label?: string;
  /** The meta line. Defaults to the trait's own — "instinct roll". */
  kind?: string;
  reaction?: boolean | "only";
}

const sumTerms = (terms: { v: number }[]): number => terms.reduce((n, t) => n + t.v, 0);

/**
 * The modifier already in the roll, which is what the popover shows before you
 * have added anything to it.
 *
 * The three terms are `rollTrait`'s own three, read a second time rather than
 * returned by it — the popover has to state the number *before* the roll is
 * committed to, and the roll is what `rollTrait` is. They agree because both
 * ask `rollModifierTerms` the same question with the same arguments; a term
 * added to one is added to the other by construction.
 */
export function rollBase(actor: any, trait: Trait, reaction: boolean | "only" = false): number {
  return (
    (actor?.traitMod?.(trait) ?? 0) +
    sumTerms(rollModifierTerms(actor, reaction === "only" ? "reactionRoll" : "actionRoll")) +
    (trait === actor?.system?.spellcastTrait
      ? sumTerms(rollModifierTerms(actor, "spellcastRoll"))
      : 0)
  );
}

/**
 * Open the popover beside `anchor` and, if it resolves, make the roll.
 *
 * @returns the roll's outcome, or `null` if the popover was dismissed — every
 * way out of it is free, and a caller that treats `null` as "nothing happened"
 * is correct.
 */
export async function askRoll(
  actor: any,
  trait: Trait,
  anchor: Element,
  o: AskRollOptions = {},
): Promise<any> {
  const reaction = o.reaction ?? false;
  const chosen = await prep(anchor, {
    kind: o.kind ?? (reaction === "only" ? "reaction roll" : `${traitLabel(trait).toLowerCase()} roll`),
    label: o.label ?? traitLabel(trait),
    base: rollBase(actor, trait, reaction),
    experiences: (actor?.system?.experiences ?? []).map((x: any) => ({
      name: x.name,
      modifier: x.modifier,
    })),
    purse: actor?.system?.resources?.hope?.value ?? 0,
    reaction,
  });
  if (!chosen) return null;

  return rollTrait(actor, trait, {
    advantage: chosen.advantage,
    experiences: chosen.experiences,
    extra: chosen.extra,
    reaction: chosen.reaction,
    hopeDie: chosen.hope,
    fearDie: chosen.fear,
    dc: o.dc ?? null,
  });
}
