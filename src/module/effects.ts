/**
 * Temporary effects, and the one thing Foundry cannot say about them.
 *
 * An ActiveEffect is exactly the right document for a rule with a duration —
 * it shows on the sheet, a GM can lift it by hand, it survives a reload, and
 * `data/modifiers.ts` already has a vocabulary for what it changes. What it
 * cannot carry is *how long*: Foundry's own `duration` counts seconds, rounds
 * and turns, and Daggerheart has none of the three. Its durations are "until
 * your next long rest", "until the end of the scene", and — thirty-seven times
 * across the corpus — the bare word "temporarily".
 *
 * So the scope rides in a flag and this file is the sweep. It hangs off the
 * four call sites that already reach `refreshResources`: both rests, and
 * `game.daggerheart.endScene()` / `endSession()`. One seam rather than a timer
 * nobody can see, and the same seam a counter's own refresh uses — so a card
 * that gives you a bonus and a use until your next long rest has both halves
 * expire together by construction rather than by two mechanisms agreeing.
 *
 * **`temporary` is never swept**, and that is a rule rather than an omission.
 * "Temporarily" is the rules' own keyword for a state a roll clears, which is
 * GM-adjudicated; putting a timer on it would be this system inventing one.
 * It gets a real, visible, hand-dismissable effect and no expiry.
 *
 * **The active GM writes**, which is `applyFear`'s and `syncVulnerable`'s
 * arrangement a fifth time: a rest fires on the client that took it, but a
 * scene ending fires on every connected client, and four clients agreeing to
 * delete the same effect is four writes and a race.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "./config.ts";

/** The scope an effect was granted under, or nothing if it is not one of ours. */
export const effectScope = (effect: any): string =>
  String(effect?.flags?.[SYSTEM_ID]?.duration ?? "");

/**
 * Delete every effect on this actor whose duration one of these scopes ends.
 *
 * Takes the scopes rather than the rest kind, exactly as `refreshResources`
 * does, so `restScopes("long")` answers for both and there is no second table
 * saying which rest satisfies which duration.
 *
 * @returns the names of what was removed, for the rest card to print. A rest
 * that quietly dropped four bonuses is a rest whose sheet changed for reasons
 * nobody was told.
 */
export async function expireEffects(actor: any, scopes: string[]): Promise<string[]> {
  const wanted = new Set(scopes);
  const doomed = (actor?.effects ?? []).filter((e: any) => wanted.has(effectScope(e)));
  if (!doomed.length) return [];
  await actor.deleteEmbeddedDocuments("ActiveEffect", doomed.map((e: any) => e.id));
  return doomed.map((e: any) => String(e.name ?? "Effect"));
}

/**
 * What an effect's flag says it modifies, for `activeModifiers` to fold in.
 *
 * Kept as our own `modifiers` rather than as Foundry `changes`, and the reason
 * is the conditions: half the interesting passives in this corpus are gated on
 * loadout composition or a track's state — four cards of one domain, no
 * weapons equipped, a full Stress track — and an AE `change` is unconditional
 * by construction. An effect that was always on would be silently wrong
 * exactly where the rule is most specific.
 */
export const effectModifiers = (effect: any): any[] =>
  (effect?.flags?.[SYSTEM_ID]?.modifiers ?? []) as any[];

/** Every live temporary modifier on this actor, with its effect as the label. */
export function temporaryModifiers(actor: any): any[] {
  const out: any[] = [];
  for (const effect of actor?.effects ?? []) {
    if (effect.disabled) continue;
    for (const m of effectModifiers(effect)) {
      out.push({ ...m, item: effect, label: String(effect.name ?? "Effect") });
    }
  }
  return out;
}

/* There is deliberately no table here saying which rest ends which duration.
   `restScopes` in `documents/item.ts` already answers that for counters, the
   answer is the same one, and a second copy is a second opinion — which is
   exactly the bug `restScopes` was itself written to fix, when `refreshUses`
   refilled a once-per-long-rest card on a short rest. Callers pass the scopes
   they already have. */
