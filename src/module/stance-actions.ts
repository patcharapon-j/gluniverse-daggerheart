/**
 * Shifting into a stance — the press, as opposed to the rule.
 *
 * `stances.ts` is the rule and imports nothing, because `data/modifiers.ts`
 * reads it during every derivation pass and a data model must not drag the
 * chat renderer in behind it. This file is the act: pay, write, post. The
 * sheet's stance row, the bottom HUD and `game.daggerheart.stance.shift` all
 * call {@link shiftStance}, so there is one implementation of "spend a Focus
 * and shift" however it was pressed.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { postCard } from "./sheets/post-card.ts";
import { cardOf, loadSigils } from "./sheets/cards.ts";
import {
  activeStance,
  dropStance,
  isStance,
  knownStances,
  stancePayer,
  type StancePayer,
} from "./stances.ts";

export interface ShiftResult {
  stance: any;
  paid: StancePayer;
}

/**
 * Spend a Focus (or, under Flow State, mark a Stress) and shift into a stance.
 *
 * **One write.** The payment and the stance land in the same update, so the
 * change log records one act and no client can ever observe the Focus gone
 * and the stance not taken. **The stance card is posted**, because shifting is
 * a thing the table should see happen — the GM's next move turns on whether
 * the Brawler is Anchored — and the card is what says what that means.
 *
 * @returns null when nothing happened: the item is not a stance this
 * character holds, it is already the active one, or nobody can pay. The caller
 * flinches the Focus row; there is no dialog, for `spendFocus`'s reason.
 */
export async function shiftStance(
  actor: any,
  itemId: string,
  { pay = "auto" as StancePayer | "auto", post = true } = {},
): Promise<ShiftResult | null> {
  const stance = actor?.items?.get?.(itemId);
  if (!actor?.isOwner || !isStance(stance)) return null;
  if (activeStance(actor)?.id === stance.id) return null;

  const paid = stancePayer(actor, pay);
  if (!paid) return null;

  const r = actor.system.resources;
  await actor.update({
    "system.stance": stance.id,
    ...(paid === "focus"
      ? { "system.resources.focus.value": Number(r.focus.value) - 1 }
      : { "system.resources.stress.marked": Number(r.stress.marked) + 1 }),
  });

  if (post) {
    const card = cardOf(stance as any, await loadSigils(), { actor });
    if (card) {
      await postCard(card, actor, {
        flavor: game.i18n.format(
          paid === "focus" ? "DAGGERHEART.Stance.ShiftFocus" : "DAGGERHEART.Stance.ShiftStress",
          { actor: actor.name, stance: stance.name },
        ),
      });
    }
  }
  return { stance, paid };
}

/** The console and macro surface, `game.daggerheart.stance`. */
export const stanceApi = {
  active: activeStance,
  known: knownStances,
  payer: stancePayer,
  shift: shiftStance,
  drop: (actor: any) => dropStance(actor, "manual"),
};
