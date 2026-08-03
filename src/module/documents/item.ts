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
