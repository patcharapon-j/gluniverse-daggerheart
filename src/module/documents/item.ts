/**
 * The Item document.
 *
 * Mostly a home for the operations that have to be atomic against the rest of
 * the actor: equipping, which has to unequip whatever it displaces, moving a
 * domain card between the loadout and the vault, which has to respect the
 * five-card limit, and spending a tracked resource, which has to clamp
 * against a ceiling only the actor knows.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { LOADOUT_LIMIT } from "../config.ts";
import {
  liveResources,
  refreshedValue,
  resourceMax,
  restRefreshes,
  type LiveResource,
} from "../data/resources.ts";
import {
  liveDicePools,
  poolCapacity,
  refreshedDice,
  restRefreshesDice,
  type LiveDicePool,
} from "../data/dice-pools.ts";

export class DaggerheartItem extends (Item as any) {
  /**
   * Equip this weapon or armor, unequipping whatever it replaces.
   *
   * The slot rules are the whole reason this is not a checkbox: one armor,
   * one primary, one secondary — and no secondary at all while the primary
   * needs both hands.
   */
  async toggleEquipped(): Promise<void> {
    const actor = this.actor;
    if (!actor) return;
    const next = !this.system.equipped;

    if (!next) {
      await this.update({ "system.equipped": false });
      return;
    }

    const conflicts: string[] = [];
    if (this.type === "armor") {
      conflicts.push(
        ...actor.items
          .filter((i: any) => i.type === "armor" && i.system.equipped && i.id !== this.id)
          .map((i: any) => i.id),
      );
    } else if (this.type === "weapon") {
      const slot = this.system.slot;
      conflicts.push(
        ...actor.items
          .filter(
            (i: any) =>
              i.type === "weapon" && i.system.equipped && i.system.slot === slot && i.id !== this.id,
          )
          .map((i: any) => i.id),
      );
      // Taking up a two-handed primary drops whatever is in the off hand.
      if (slot === "primary" && this.system.burden === "twoHanded") {
        conflicts.push(
          ...actor.items
            .filter((i: any) => i.type === "weapon" && i.system.equipped && i.system.slot === "secondary")
            .map((i: any) => i.id),
        );
      }
      // And you cannot pick up an off-hand while both hands are busy.
      if (slot === "secondary" && actor.secondaryBlocked) {
        ui.notifications?.warn(
          game.i18n.localize("DAGGERHEART.Warning.SecondaryBlocked"),
        );
        return;
      }
    }

    const updates: any[] = conflicts.map((id) => ({ _id: id, "system.equipped": false }));
    updates.push({ _id: this.id, "system.equipped": true });
    await actor.updateEmbeddedDocuments("Item", updates);
  }

  /**
   * Move a domain card between the loadout and the vault.
   *
   * @returns false when the loadout is already full — the card does not move
   *          and the caller gets to say so.
   */
  async toggleLoadout(): Promise<boolean> {
    if (this.type !== "domainCard") return false;
    const actor = this.actor;
    const next = !this.system.inLoadout;

    if (next && actor) {
      const held = actor.items.filter(
        (i: any) => i.type === "domainCard" && i.system.inLoadout,
      ).length;
      if (held >= LOADOUT_LIMIT) {
        ui.notifications?.warn(
          game.i18n.format("DAGGERHEART.Warning.LoadoutFull", { max: LOADOUT_LIMIT }),
        );
        return false;
      }
    }

    await this.update({ "system.inLoadout": next });
    return true;
  }

  /** The hue this item is drawn in — its domain, or graphite for no domain. */
  get accent(): string | null {
    return this.type === "domainCard" ? this.system.domain || null : null;
  }

  /* ── tracked resources ───────────────────────────────────────────────── */

  /** Every resource on this Item with its ceiling resolved. */
  get liveResources(): LiveResource[] {
    return liveResources(this);
  }

  /**
   * Move one resource by a signed amount.
   *
   * **The whole array is written, not a path into it.** `system.resources` is
   * an ArrayField, and Foundry reads a dotted index in an update key as a path
   * into an *object* — `"system.resources.0.value"` writes a shape the reader
   * does not expect. The adjust tab learned this about Experiences and scars;
   * it is the same field type and the same trap.
   *
   * @returns false when the pool cannot move that far — the caller gets to
   *          make the row flinch, which is this system's answer to a refusal
   *          everywhere else.
   */
  async moveResource(index: number, by: number): Promise<boolean> {
    const list: any[] = this.system?.resources ?? [];
    const res = list[index];
    if (!res || !by) return false;

    const max = resourceMax(res, this.actor);
    const want = (res.value ?? 0) + by;
    if (want < 0) return false;
    if (max !== null && want > max) return false;

    const next = list.map((r: any, i: number) =>
      i === index ? { ...r, value: want } : { ...r },
    );
    await this.update({ "system.resources": next });
    return true;
  }

  /**
   * Set one resource outright. The GM's route, and the refresh's.
   *
   * Clamped rather than refused, because the callers are the ones that have
   * already decided — a refresh knows what it wants the number to be, and a
   * clamp there is arithmetic rather than a ruling.
   */
  async setResource(index: number, value: number): Promise<void> {
    const list: any[] = this.system?.resources ?? [];
    const res = list[index];
    if (!res) return;
    const max = resourceMax(res, this.actor);
    const v = Math.max(0, max === null ? value : Math.min(value, max));
    if (v === res.value) return;
    await this.update({
      "system.resources": list.map((r: any, i: number) =>
        i === index ? { ...r, value: v } : { ...r },
      ),
    });
  }

  /* ── kept dice ───────────────────────────────────────────────────────── */

  /** Every die pool on this Item with its capacity resolved. */
  get liveDicePools(): LiveDicePool[] {
    return liveDicePools(this);
  }

  /**
   * Write one pool's tray outright.
   *
   * The whole array, for `moveResource`'s reason: `system.dice` is an
   * ArrayField and Foundry reads a dotted index in an update key as a path
   * into an object. Every gesture below funnels through here, so there is
   * one place that knows how a tray is written.
   */
  async setTray(index: number, dice: number[]): Promise<void> {
    const list: any[] = this.system?.dice ?? [];
    if (!list[index]) return;
    const next = list.map((p: any, i: number) =>
      i === index ? { ...p, dice: [...dice] } : { ...p },
    );
    await this.update({ "system.dice": next });
  }

  /**
   * Put a die on the card.
   *
   * A climbing die arrives showing 1 — every card that has one says so, in
   * those words — and a bag's arrives blank, because Slayer Dice and the
   * Sigil's d8s are placed and rolled later. Prayer Dice are the exception
   * and do not use this: they arrive by a `reroll` refresh at the start of a
   * session, already rolled, which is what the card says happens.
   *
   * @returns false when the tray is full, so the row can flinch.
   */
  async placeDie(index: number): Promise<boolean> {
    const pool: any = (this.system?.dice ?? [])[index];
    if (!pool) return false;
    const held: number[] = pool.dice ?? [];
    const max = poolCapacity(pool, this.actor);
    if (max !== null && held.length >= max) return false;

    /* A climbing die is placed showing 1, which the three cards that use one
       all print. Everything else is placed blank — Slayer Dice are rolled
       when they are *spent*, so a face at this moment would be an answer the
       card has not given yet.

       Except where the card rolls them on arrival. `onRefresh: "reroll"` is
       already the record of that — "roll a number of d4s equal to your
       Spellcast trait and place them on this card" is one act, not two — and
       those trays deliberately carry no roll button, because rerolling is
       offering to change an answer the session already gave. Placing a blank
       into one would therefore be a die that can never have a face, which is
       the row offering a dead end. So the placement is the roll. */
    const face =
      pool.mode === "climb" ? 1
      : pool.onRefresh === "reroll" ? await this.#rollOne(pool.faces ?? 6)
      : 0;
    await this.setTray(index, [...held, face]);
    return true;
  }

  /** One die, through Foundry's own roller so it reaches the dice log. */
  async #rollOne(faces: number): Promise<number> {
    const r = await new (foundry as any).dice.Roll(`1d${faces}`).evaluate();
    return Number(r.dice[0].results[0]?.result ?? 1);
  }

  /** Take one die off the card. `at` is its position in the tray. */
  async spendDie(index: number, at: number): Promise<boolean> {
    const pool: any = (this.system?.dice ?? [])[index];
    const held: number[] = pool?.dice ?? [];
    if (!held.length || at < 0 || at >= held.length) return false;
    await this.setTray(index, held.filter((_, k) => k !== at));
    return true;
  }

  /**
   * Advance a climbing die by one.
   *
   * **Refuses at the top rather than clearing itself**, and that refusal is
   * the card's whole bargain. "When the die's value would exceed its maximum
   * value... remove the die and drop out of Unstoppable" — but Wild Surge
   * charges a Stress on the way out and Unstoppable does not, and Zone of
   * Protection simply ends. Three different consequences behind one
   * arithmetic condition is exactly the shape this system declines to guess
   * at: the row says no, the rule is printed on the card, and the person who
   * read it takes the die off.
   */
  async stepDie(index: number): Promise<boolean> {
    const pool: any = (this.system?.dice ?? [])[index];
    const held: number[] = pool?.dice ?? [];
    const at = held[0] ?? 0;
    if (!at || at >= (pool.faces ?? 6)) return false;
    await this.setTray(index, [at + 1, ...held.slice(1)]);
    return true;
  }

  /**
   * Roll the tray, or one die in it.
   *
   * Through Foundry's own `Roll` rather than `Math.random`, so a table with
   * a fairness module, a dice-log module or a shared RNG gets what it
   * installed — and so the numbers are auditable, which is the difference
   * between a die and a number the sheet made up.
   *
   * `only` names a single position. Pressing an unrolled die rolls that one,
   * which is the commonest Slayer gesture: roll the one you are about to
   * add rather than the whole tray you are not spending.
   *
   * @returns the faces rolled, so the caller can post them.
   */
  async rollTray(index: number, only?: number): Promise<number[]> {
    const pool: any = (this.system?.dice ?? [])[index];
    if (!pool) return [];
    const faces = pool.faces ?? 6;
    const held: number[] = pool.dice ?? [];

    /* `roll` mode holds nothing between presses, so the tray it rolls is the
       one die the card names. Everything else rolls what is standing on it. */
    const targets =
      pool.mode === "roll" ? [0]
      : only !== undefined ? [only]
      : held.map((_, k) => k);
    if (!targets.length) return [];

    const r = await new (foundry as any).dice.Roll(`${targets.length}d${faces}`).evaluate();
    const results: number[] = r.dice[0].results.map((d: any) => d.result);

    const next = pool.mode === "roll" ? [...results] : [...held];
    if (pool.mode !== "roll") targets.forEach((t, k) => (next[t] = results[k] ?? 1));
    await this.setTray(index, next);
    return results;
  }
}

/**
 * Refresh every resource on an actor whose scope this event satisfies.
 *
 * One write per Item, all of them in one `updateEmbeddedDocuments`, which is
 * what keeps a long rest from re-rendering the sheet thirty times.
 *
 * `scopes` rather than a single scope because a rest satisfies two — a long
 * rest gives back both `longRest` and the unqualified `rest`, and asking the
 * caller to spell that out would put the printed rule in the caller.
 *
 * @returns the resources that actually moved, so the rest card can say what
 *          it gave back rather than claiming it gave back everything.
 */
export async function refreshResources(
  actor: any,
  scopes: readonly string[],
): Promise<{ item: any; name: string; from: number; to: number }[]> {
  const moved: { item: any; name: string; from: number; to: number }[] = [];
  const updates: any[] = [];

  for (const item of actor?.items ?? []) {
    const list: any[] = item.system?.resources ?? [];
    if (!list.length) continue;

    let touched = false;
    const next = list.map((res: any) => {
      if (!scopes.includes(res.refresh)) return { ...res };
      const to = refreshedValue(res, resourceMax(res, actor));
      if (to === (res.value ?? 0)) return { ...res };
      touched = true;
      moved.push({ item, name: res.name, from: res.value ?? 0, to });
      return { ...res, value: to };
    });

    if (touched) updates.push({ _id: item.id, "system.resources": next });
  }

  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  return moved;
}

/**
 * Refresh every die pool on an actor whose scope this event satisfies.
 *
 * `refreshResources`'s twin, and separate rather than folded in for the
 * reason the two fields are separate: what comes back is a *list* here and a
 * number there, so a caller that wanted to say what a rest gave back would
 * have had to branch on the shape of every entry. The rest card asks each of
 * them and prints two kinds of row, which is honest — "Prayer Dice: four d4s
 * rolled" and "Grace: 1 → 3" are not the same sentence.
 *
 * One `Roll` per rerolled pool rather than one per die, so a Seraph's four
 * d4s are one entry in a dice log rather than four.
 *
 * @returns the pools that actually moved, with what was there and what is
 *          now, so nothing has to be re-derived to report it.
 */
export async function refreshDicePools(
  actor: any,
  scopes: readonly string[],
): Promise<{ item: any; name: string; faces: number; from: number[]; to: number[] }[]> {
  const moved: { item: any; name: string; faces: number; from: number[]; to: number[] }[] = [];
  const updates: any[] = [];

  for (const item of actor?.items ?? []) {
    const list: any[] = item.system?.dice ?? [];
    if (!list.length) continue;

    let touched = false;
    const next: any[] = [];
    for (const pool of list) {
      if (!scopes.includes(pool.refresh)) {
        next.push({ ...pool });
        continue;
      }
      const max = poolCapacity(pool, actor);
      /* The RNG is passed in rather than reached for, because `refreshedDice`
         lives in `data/` and `data/` has to stay loadable outside a running
         game. Here there is one, so here is where it is named. */
      const rolled: number[] = [];
      if (pool.onRefresh === "reroll") {
        const want = max === null ? (pool.dice ?? []).filter((d: number) => !d).length : max;
        if (want > 0) {
          const r = await new (foundry as any).dice.Roll(`${want}d${pool.faces ?? 6}`).evaluate();
          rolled.push(...r.dice[0].results.map((d: any) => d.result));
        }
      }
      let k = 0;
      const to = refreshedDice(pool, max, () => rolled[k++] ?? 1);
      const from: number[] = pool.dice ?? [];
      if (to.length === from.length && to.every((d, j) => d === from[j])) {
        next.push({ ...pool });
        continue;
      }
      touched = true;
      moved.push({ item, name: pool.name, faces: pool.faces ?? 6, from: [...from], to });
      next.push({ ...pool, dice: to });
    }

    if (touched) updates.push({ _id: item.id, "system.dice": next });
  }

  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  return moved;
}

/** Every die pool on this actor that a rest of this kind will act on. */
export function restWillRefreshDice(actor: any, kind: "short" | "long"): LiveDicePool[] {
  const out: LiveDicePool[] = [];
  for (const item of actor?.items ?? []) {
    for (const lp of liveDicePools(item)) {
      if (!restRefreshesDice(lp.pool, kind)) continue;
      out.push({ ...lp, item });
    }
  }
  return out;
}

/** The scopes a rest of this kind satisfies, as `refreshResources` wants them. */
export const restScopes = (kind: "short" | "long"): readonly string[] =>
  kind === "long" ? ["rest", "longRest"] : ["rest", "shortRest"];

/** Every resource on this actor that a rest of this kind will move. */
export function restWillRefresh(actor: any, kind: "short" | "long"): LiveResource[] {
  const out: LiveResource[] = [];
  for (const item of actor?.items ?? []) {
    for (const lr of liveResources(item)) {
      if (!restRefreshes(lr.res, kind)) continue;
      if (refreshedValue(lr.res, lr.max) === lr.res.value) continue;
      out.push({ ...lr, item });
    }
  }
  return out;
}
