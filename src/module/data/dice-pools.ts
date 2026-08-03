/**
 * Resolving a pool of kept dice against the character holding it.
 *
 * `resources.ts`'s twin, and deliberately thin: the ceiling machinery is
 * shared outright — `diePoolField`'s `max` is `resourceField`'s `max`, so
 * `resourceMax` answers for both and a source added for one is available to
 * the other by construction. What lives here is the arithmetic a *list of
 * faces* needs and an integer does not.
 *
 * Derivation only. The mutations that place, spend, step and roll live on the
 * Item document, so the sheet, the chat card and the rest dialog share one
 * implementation — which is `resources.ts`'s rule and the reason the roll is
 * not in here: rolling is a side effect with an RNG in it, and this file has
 * to be callable from a check tool outside a running game.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { REFRESHED_BY, type ResourceRefresh } from "../config.ts";
import { resourceMax, type Resource } from "./resources.ts";

export interface DiePool {
  name: string;
  mode: "bag" | "climb" | "roll";
  faces: number;
  dice: number[];
  max: { kind: string; n: number; trait: string; floor: number };
  refresh: ResourceRefresh;
  onRefresh: string;
  feature: string;
  grow: string;
  onEmpty: string;
}

/** A pool with its ceiling worked out, and where it sits on its Item. */
export interface LiveDicePool {
  pool: DiePool;
  /** Index into `item.system.dice` — the write key. */
  i: number;
  /** How many dice may be held, or null when the card states no ceiling. */
  max: number | null;
  /** Whether the tray is at that ceiling. False for an open pool, always. */
  full: boolean;
  /** True when every die held is showing a face. */
  rolled: boolean;
  /** The Item it belongs to. Set when the list spans more than one. */
  item?: any;
}

/**
 * How many dice this pool may hold.
 *
 * `climb` and `roll` have a ceiling of one and zero regardless of what the
 * `max` block says, because those are facts about the *mode* rather than
 * about the card: an Unstoppable Die is one die by definition, and a Combo
 * Die is not held at all. Leaving the block free to say something else would
 * make an authoring mistake render as a tray with four Unstoppable Dice in
 * it, which is not a state the rules have.
 */
export function poolCapacity(pool: DiePool, actor: any): number | null {
  if (pool?.mode === "climb") return 1;
  if (pool?.mode === "roll") return 0;
  return resourceMax(pool as unknown as Resource, actor);
}

/** Every die pool on an Item, resolved against its owner. */
export function liveDicePools(item: any, owner?: any): LiveDicePool[] {
  const list: DiePool[] = item?.system?.dice ?? [];
  const actor = owner ?? item?.actor ?? null;
  return list.map((pool, i) => {
    const max = poolCapacity(pool, actor);
    const dice = pool.dice ?? [];
    return {
      pool,
      i,
      max,
      full: max !== null && dice.length >= max,
      rolled: dice.length > 0 && dice.every((d) => d > 0),
    };
  });
}

/** The pools belonging to one named feature block. Blank = the document's own. */
export const dicePoolsFor = (item: any, feature = "", owner?: any): LiveDicePool[] =>
  liveDicePools(item, owner).filter((p) => (p.pool.feature || "") === feature);

/** True when a rest of this kind acts on this pool. */
export const restRefreshesDice = (pool: DiePool, kind: "short" | "long"): boolean =>
  REFRESHED_BY[kind].includes(pool?.refresh as ResourceRefresh);

/**
 * What a refresh leaves in the tray.
 *
 * `roll` is a *function* rather than a value because `reroll` needs an RNG
 * and this file may not have one — `tools/` imports it and there is no
 * `Roll` class out there. The caller passes what it has, which on the Item
 * document is Foundry's own and in a test is anything deterministic.
 *
 * An open `fill` is left exactly where it is rather than handed a number
 * this file made up, which is `refreshedValue`'s answer to the same question
 * one field along.
 */
export function refreshedDice(
  pool: DiePool,
  max: number | null,
  roll: (faces: number) => number,
): number[] {
  const held = pool?.dice ?? [];
  switch (pool?.onRefresh) {
    case "fill":
      if (max === null) return [...held];
      return [...held, ...Array<number>(Math.max(0, max - held.length)).fill(0)];
    case "reroll":
      if (max === null) return held.map((d) => (d > 0 ? d : roll(pool.faces)));
      return Array.from({ length: max }, () => roll(pool.faces));
    case "clear":
    default:
      return [];
  }
}

/**
 * What a tray is worth if you spent all of it.
 *
 * Unrolled dice count for nothing, which is the honest answer rather than an
 * average: a Slayer Die on the card has no value until it is rolled, and a
 * total that guessed at one would be the sheet answering a question the
 * table has not asked yet.
 */
export const trayTotal = (pool: DiePool): number =>
  (pool?.dice ?? []).reduce((n, d) => n + (d > 0 ? d : 0), 0);

/** Notation, for a card or a chat line. */
export const dieNotation = (pool: DiePool): string => `d${pool?.faces ?? 6}`;
