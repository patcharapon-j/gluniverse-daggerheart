/**
 * Resolving a tracked resource against the character holding it.
 *
 * The schema stores where a ceiling *comes from* and this works out what it
 * currently is — see `resourceField` in `fields.ts` for why those are two
 * different things. Derivation lives in `data/`; the mutations that spend and
 * refresh live on the Item document, so the sheet and the chat card share one
 * implementation.
 *
 * **A note on the name.** `actor.system.resources` is the character's four
 * printed tracks — Hit Points, Stress, Armor Slots, Hope — and
 * `item.system.resources` is this. Two different things wearing one word, and
 * they are only safe because the prefix always disambiguates them: they are
 * fields on two different documents and never meet in one expression. It is
 * the data-model version of the clash that renamed `.die.win`, and the reason
 * it survives where that one did not is that there is no shared namespace for
 * them to collide in.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { REFRESHED_BY, type ResourceRefresh } from "../config.ts";

export interface Resource {
  name: string;
  value: number;
  max: { kind: string; n: number; trait: string; floor: number };
  refresh: ResourceRefresh;
  onRefresh: string;
  feature: string;
  onEmpty: string;
}

/** A resource with its ceiling worked out, and where it sits on its Item. */
export interface LiveResource {
  res: Resource;
  /** Index into `item.system.resources` — the write key. */
  i: number;
  /** The ceiling right now, or null when the card states none. */
  max: number | null;
  /** Whether the pile is at its ceiling. False for an open pool, always. */
  full: boolean;
  /** The Item it belongs to. Set when the list spans more than one. */
  item?: any;
}

/**
 * What a trait is worth on this actor, with `spellcast` resolved.
 *
 * Spellcast is a pointer rather than a seventh trait, and it points at a
 * subclass the character may not have — a Wizard has one, a Warrior does not.
 * An unresolvable pointer gives 0 rather than throwing, because the card is
 * still a legal card to be holding: a Warrior who somehow acquires Unleash
 * Chaos gets a ceiling of zero and a pool they cannot fill, which is the
 * honest reading of "equal to your Spellcast trait" for somebody who has none.
 */
export function traitValue(actor: any, trait: string): number {
  const t = trait === "spellcast" ? actor?.system?.spellcastTrait : trait;
  if (!t) return 0;
  return Number(actor?.system?.traits?.[t]?.total ?? actor?.system?.traits?.[t]?.value ?? 0);
}

/**
 * The GM's Fear, or zero before the setting exists.
 *
 * Read through a guard rather than imported from `settings.ts`, and the
 * reason is the direction of the dependency: `data/` is the schema and
 * `settings.ts` is the world, so a resolver reaching up into the application
 * would make a DataModel unloadable outside a running game — which is exactly
 * what `tools/check-item-sheet.mjs` relies on not being true. `game` is
 * already `any` in this file's environment, so the guard costs one line and
 * keeps the arrow pointing the way it does everywhere else in `data/`.
 */
function fearValue(): number {
  try {
    return Number((globalThis as any).game?.settings?.get?.("daggerheart", "fear") ?? 0);
  } catch {
    return 0;
  }
}

/**
 * The ceiling, now. Null means the card states none — see `open` in
 * `RESOURCE_MAX`.
 *
 * The floor is applied to every kind rather than only to `trait`, because a
 * card that prints a minimum prints it about the result and not about the
 * source. It costs nothing on a `fixed` ceiling, which never goes below its
 * own number anyway.
 *
 * `proficiency` and `tier` read the actor's *derived* values rather than
 * recomputing them from level, so an advancement option that bought a point
 * of Proficiency raises the Slayer's dice pool with it — which is the whole
 * reason the card says Proficiency instead of naming a number.
 *
 * `fear` is the one kind that does not read the actor at all. That is honest
 * rather than sloppy: Umbral Veil's ceiling genuinely belongs to the table
 * rather than to the character holding the card, and two players holding one
 * each see the same number because there is only one.
 */
export function resourceMax(res: Resource, actor: any): number | null {
  const m = res?.max;
  if (!m || m.kind === "open") return null;
  const raw =
    m.kind === "fixed" ? m.n
    : m.kind === "level" ? Number(actor?.system?.level ?? 1)
    : m.kind === "proficiency" ? Number(actor?.system?.proficiency ?? 0)
    : m.kind === "tier" ? Number(actor?.system?.tier ?? 1)
    : m.kind === "fear" ? fearValue()
    : m.kind === "trait" ? traitValue(actor, m.trait)
    : 0;
  return Math.max(m.floor ?? 0, raw);
}

/**
 * Every resource on an Item, resolved against its owner.
 *
 * Takes the Item rather than the array so the actor comes from the same place
 * the resource does. A compendium Item has no actor, and every trait- and
 * level-sourced ceiling on one resolves to its floor — which is right: the
 * card in the compendium belongs to nobody, so there is no number to state.
 *
 * `owner` is for the callers whose "item" is the sheet's snapshot rather than
 * the document — a value with no `actor` on it. Passing it is what keeps one
 * implementation serving both.
 */
export function liveResources(item: any, owner?: any): LiveResource[] {
  const list: Resource[] = item?.system?.resources ?? [];
  const actor = owner ?? item?.actor ?? null;
  return list.map((res, i) => {
    const max = resourceMax(res, actor);
    return { res, i, max, full: max !== null && res.value >= max };
  });
}

/** The resources belonging to one named feature block. Blank = the document's own. */
export const resourcesFor = (item: any, feature = "", owner?: any): LiveResource[] =>
  liveResources(item, owner).filter((r) => (r.res.feature || "") === feature);

/** True when a rest of this kind gives this resource back. */
export const restRefreshes = (res: Resource, kind: "short" | "long"): boolean =>
  REFRESHED_BY[kind].includes(res?.refresh as ResourceRefresh);

/**
 * What a refresh sets a resource to.
 *
 * The budget/pile split, and the one card that is neither. `fill` needs a
 * ceiling to fill to, so an open pool with `fill` — which no annotation
 * writes and homebrew might — is left exactly where it is rather than being
 * given a number this file made up.
 */
export function refreshedValue(res: Resource, max: number | null): number {
  switch (res?.onRefresh) {
    case "clear":
      return 0;
    case "decrement":
      return Math.max(0, (res.value ?? 0) - 1);
    case "fill":
    default:
      return max === null ? (res.value ?? 0) : max;
  }
}
