/**
 * Moving a domain card between the loadout and the vault, or within either.
 *
 * This was the body of `place()` in `CharacterSheet.svelte`, and it moved here
 * when a second surface needed it: the bottom HUD recalls from its vault drawer
 * and shelves from a card's peek, and those are the sheet's own two gestures.
 * The sheet's argument for one handler — vault into loadout is a recall and
 * costs Stress, loadout into vault is a shelve and costs nothing, either list
 * onto itself is a reorder, and three handlers would be three places for the
 * payment and the sort to drift apart — is an argument for one *module* the
 * moment there are two callers. See "The order of a loadout" in CLAUDE.md.
 *
 * The plan is pure and the write is separate, because the sheet has to start a
 * FLIP between the two (`travels()` measures before the write lands) and the HUD
 * does not. A caller that wants both just calls `placeCard`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Zone = "loadout" | "vault";

/** The parts of a domain card the arithmetic reads. A snapshot and an Item both have them. */
export interface PlaceCard {
  id: string;
  sort?: number;
  system: { inLoadout?: boolean; recallCost?: number };
}

export interface PlaceInput {
  /** Every domain card the character holds, in their current order. */
  cards: PlaceCard[];
  limit: number;
  stress: { marked: number; max: number };
  /** The sheet's Resting switch: recalls are free while it is on. */
  resting?: boolean;
}

export type PlacePlan =
  /** The Stress track cannot pay the Recall Cost; the caller makes it flinch. */
  | { refuse: "stress" }
  | {
      /** Only what moved — empty when the card was dropped back where it was. */
      updates: Record<string, unknown>[];
      /** Stress to mark for the recall, already checked against the track. */
      cost: number;
      /** What the travel animation should say: a recall, a shelve, or just a move. */
      mode: "recall" | "shelve" | null;
    };

export const recallCostOf = (card: PlaceCard | null | undefined, resting = false): number =>
  resting ? 0 : Number(card?.system?.recallCost ?? 0);

export function canPayRecall(input: PlaceInput, card: PlaceCard | null | undefined): boolean {
  const cost = recallCostOf(card, input.resting);
  return cost === 0 || input.stress.marked + cost <= input.stress.max;
}

/**
 * Plan putting card `id` into `to`, beside `target` (after it when `after`).
 *
 * @returns null when there is nothing to do — no such card, or a full loadout
 * with nothing named to trade out — and `{refuse: "stress"}` when the track
 * cannot pay. A full loadout is not a refusal: the only card that can name
 * itself as the one leaving is the one you dropped on top of, so landing in the
 * gutter at 5/5 does nothing at all rather than evicting whichever card the
 * arithmetic reached first.
 */
export function planPlace(
  input: PlaceInput,
  id: string,
  to: Zone,
  target: string | null = null,
  after = false,
): PlacePlan | null {
  const { cards } = input;
  const card = cards.find((c) => c.id === id);
  if (!card) return null;
  const loadout = cards.filter((c) => c.system.inLoadout);
  const vault = cards.filter((c) => !c.system.inLoadout);
  const from: Zone = card.system.inLoadout ? "loadout" : "vault";

  let traded: string | null = null;
  if (from === "vault" && to === "loadout") {
    if (!canPayRecall(input, card)) return { refuse: "stress" };
    if (loadout.length >= input.limit) {
      if (!target || !loadout.some((c) => c.id === target)) return null;
      traded = target;
    }
  }

  const l = loadout.map((c) => c.id).filter((x) => x !== id && x !== traded);
  const v = vault.map((c) => c.id).filter((x) => x !== id);
  /* The traded card goes to the head of the vault, not its tail. It is the
     thing you just made a decision about; burying it under twenty cards you
     did not touch is the sheet hiding its own answer. */
  if (traded) v.unshift(traded);

  const dest = to === "loadout" ? l : v;
  let at = dest.length;
  if (traded) at = loadout.findIndex((c) => c.id === traded);
  else if (target) {
    const i = dest.indexOf(target);
    if (i >= 0) at = after ? i + 1 : i;
  } else if (from !== to && to === "vault") {
    /* Anything leaving the loadout surfaces at the top of the vault — the card
       you have just made a decision about, and the commonest next thought is
       that you would like it back. A card reordered *within* the vault still
       goes where you put it. */
    at = 0;
  }
  dest.splice(Math.max(0, at), 0, id);

  /* Only what moved. A card dropped back where it started writes nothing,
     which is what makes it a true no-op — no update, no re-render, no travel. */
  const order = [...l, ...v];
  const updates = order.flatMap((x, i) => {
    const cur = cards.find((c) => c.id === x);
    const wants = i < l.length;
    const u: Record<string, unknown> = {};
    if (cur?.sort !== (i + 1) * 100) u.sort = (i + 1) * 100;
    if (!!cur?.system.inLoadout !== wants) u["system.inLoadout"] = wants;
    return Object.keys(u).length ? [{ _id: x, ...u }] : [];
  });

  return {
    updates,
    cost: from === "vault" && to === "loadout" ? recallCostOf(card, input.resting) : 0,
    mode: from === to ? null : to === "loadout" ? "recall" : "shelve",
  };
}

/** Write a plan: the order and `inLoadout` in one update, then the Stress it cost. */
export async function commitPlace(actor: any, plan: PlacePlan): Promise<void> {
  if ("refuse" in plan || !plan.updates.length) return;
  await actor.updateEmbeddedDocuments("Item", plan.updates);
  if (plan.cost) {
    await actor.update({
      "system.resources.stress.marked": (actor.system?.resources?.stress?.marked ?? 0) + plan.cost,
    });
  }
}

/** The input a live character gives, for a caller that is not holding a snapshot. */
export function placeInputOf(actor: any, limit: number): PlaceInput {
  const cards = [...(actor?.items ?? [])]
    .filter((i: any) => i.type === "domainCard")
    .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((i: any) => ({ id: i.id, sort: i.sort, system: i.system }));
  const st = actor?.system?.resources?.stress ?? {};
  return { cards, limit, stress: { marked: st.marked ?? 0, max: st.max ?? 6 } };
}

/** Plan and write in one call. Returns the plan so a caller can answer a refusal. */
export async function placeCard(
  actor: any,
  limit: number,
  id: string,
  to: Zone,
  target: string | null = null,
  after = false,
): Promise<PlacePlan | null> {
  const plan = planPlace(placeInputOf(actor, limit), id, to, target, after);
  if (plan) await commitPlace(actor, plan);
  return plan;
}
