/**
 * The Brawler's Combo Strike, struck from the damage card it belongs to.
 *
 *   "After rolling damage on a successful attack with a Melee weapon, you can
 *    mark a Stress to start a combo strike. When you do, roll your Combo Die
 *    and note the result, then continue rolling your Combo Die until the
 *    result of your latest roll is lower than the roll that preceded it. You
 *    deal extra damage equal to the total of all rolled Combo Die results on
 *    this attack. The results can't be modified by any means."
 *
 * It used to be a press on the class card that marked a Stress and rolled the
 * Combo Die *once*, into a tray, beside a damage card that went on saying the
 * old number. Every part of that was the wrong place. The rule's subject is a
 * damage roll that has already happened, so **the damage card is the control**:
 * a Melee weapon's damage plate offers "Combo strike · d4" as a claim, the
 * press pays, rolls the chain as real dice, and the plate's total grows by
 * exactly what the chain rolled — so "Apply to target" applies the combo too.
 *
 * Four rules, each enforced where it can be:
 *
 * - **Melee and owned.** Offered only on a Melee weapon's damage, rolled by a
 *   character holding Combo Strike. Decided at roll time and stored on the
 *   plate, because the card is one string every reader sees.
 * - **Once, and before it lands.** A claim (`combo`) spends it on every client,
 *   and a card whose damage has been applied refuses — the extra damage would
 *   otherwise be on the card and never on the creature.
 * - **The chain is a real `Roll` per die**, for `reroll.ts`'s reason: the
 *   dice log, seeded randomness and the table's 3D dice stay honest. Ties
 *   continue; only a *lower* result ends it, and that last die counts.
 * - **One die at a time.** The whole point of a combo is the next throw: will
 *   it climb or break? So each die is written to the card on its own, and the
 *   next one waits until the last has landed — Dice So Nice's animation where
 *   the table runs it, a short beat where it does not. The chain rolled all at
 *   once, which answered the question before anybody had asked it. While it
 *   runs the combo is `live`, and Apply refuses, or a hit could land on the
 *   chain's first two dice and never its third.
 * - **Can't be modified.** The combo dice are drawn with no `data-rr`, so the
 *   reroll press cannot reach them — and the claim settles the whole card,
 *   which is `canReroll`'s rule already.
 *
 * Flow State's second half — "spend a Focus instead of marking a Stress to
 * start a combo strike" — is the second button, offered when the feature is
 * held. Both share the one claim.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "./config.ts";
import { COMBO_FEATURE, hasFlowState, holdsFeature } from "./stances.ts";

/** The Combo Die's pool name, as `card-resources.mjs` annotates it. */
export const COMBO_DIE = "Combo Die";

/** Ties and climbs continue; this is the backstop against a broken die. */
const CHAIN_CAP = 40;

/**
 * The character's Combo Die, as a notation — `d4` until an advancement steps
 * it. Read off the tray the class card carries, because that is where the
 * item sheet edits its size; a Brawler whose copy predates the tray rolls the
 * printed d4.
 */
export function comboDieOf(actor: any): string | null {
  if (!holdsFeature(actor, COMBO_FEATURE)) return null;
  for (const item of actor?.items ?? []) {
    const pool = (item.system?.dice ?? []).find((d: any) => d?.name === COMBO_DIE);
    if (pool) return `d${Math.max(2, Number(pool.faces) || 4)}`;
  }
  return "d4";
}

/** What a weapon's damage card should offer, or null. */
export function comboOffer(actor: any, weapon: any): { die: string; focus: boolean } | null {
  if (actor?.type !== "character" || weapon?.system?.range !== "melee") return null;
  const die = comboDieOf(actor);
  return die ? { die, focus: hasFlowState(actor) } : null;
}

/** Whether this die ends the chain: lower than the one before, or the cap. */
export function chainEnds(faces: number[]): boolean {
  const n = faces.length;
  return n >= CHAIN_CAP || (n > 1 && faces[n - 1]! < faces[n - 2]!);
}

/**
 * Roll the chain: until the latest is lower than the one before it.
 *
 * `onDie` is awaited after every die, before the next is rolled, which is
 * what lets the card show the chain one throw at a time.
 */
export async function rollComboChain(
  die: string,
  onDie?: (roll: any, faces: number[]) => Promise<void>,
): Promise<{ rolls: any[]; faces: number[] }> {
  const rolls: any[] = [];
  const faces: number[] = [];
  for (;;) {
    const roll = new Roll(`1${die}`);
    await roll.evaluate();
    const face = Number(roll.dice[0]?.results?.[0]?.result ?? roll.total ?? 0);
    rolls.push(roll);
    faces.push(face);
    if (onDie) await onDie(roll, [...faces]);
    if (chainEnds(faces)) break;
  }
  return { rolls, faces };
}

/**
 * Strike the combo on a damage message.
 *
 * @returns why it refused, or null when it struck. The caller warns.
 */
export async function strikeCombo(
  message: any,
  actor: any,
  payer: "stress" | "focus",
  claim: (key: string) => Promise<boolean>,
  rewrite: (plate: any, rolls: any[]) => Promise<void>,
  /** Waits for the die just written to land, before the next is thrown. */
  pace: () => Promise<void> = async () => {},
): Promise<string | null> {
  const plate = foundry.utils.deepClone(message.getFlag(SYSTEM_ID, "plate") ?? null);
  if (!plate?.cmb || plate.combo) return "AlreadyClaimed";
  if (!actor?.isOwner) return "NotYours";
  if (message.getFlag(SYSTEM_ID, "claimed")?.applied) return "RollSettled";

  const r = actor.system?.resources ?? {};
  const pay =
    payer === "focus"
      ? hasFlowState(actor) && Number(r.focus?.value ?? 0) >= 1
        ? { "system.resources.focus.value": Number(r.focus.value) - 1 }
        : null
      : Number(r.stress?.marked ?? 0) < Number(r.stress?.max ?? 0)
        ? { "system.resources.stress.marked": Number(r.stress.marked) + 1 }
        : null;
  if (!pay) return "CannotPay";

  if (!(await claim("combo"))) return null;
  await actor.update(pay);

  const die = plate.cmb as string;
  await rollComboChain(die, async (roll, sofar) => {
    const done = chainEnds(sofar);
    /* `live: false` and not an omitted key: Foundry merges a flag object
       into the stored one, so a missing `live` would keep the last `true`. */
    plate.combo = { die, rolls: sofar, live: !done };
    await rewrite(plate, [roll]);
    if (!done) await pace();
  });
  return null;
}
