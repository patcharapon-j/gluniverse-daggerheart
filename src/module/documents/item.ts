/**
 * The Item document.
 *
 * Mostly a home for the two operations that have to be atomic against the
 * rest of the actor: equipping, which has to unequip whatever it displaces,
 * and moving a domain card between the loadout and the vault, which has to
 * respect the five-card limit.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { LOADOUT_LIMIT } from "../config.ts";

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
}
