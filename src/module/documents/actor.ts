/**
 * The Actor document.
 *
 * Behaviour only — every derived number lives in the DataModel. What is here
 * is the set of operations the sheet and the chat card both need to perform
 * identically: mark a track, take damage, spend Hope. Doing them in one place
 * is the difference between "the sheet marks 2 HP" and "the sheet marks 2 HP
 * and the chat card marks 3".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SEVERITY_COST, type Severity } from "../config.ts";

export class DaggerheartActor extends (Actor as any) {
  /* ── tracks ───────────────────────────────────────────────────────────
     Every one of these clamps. A track that can go past its max or below
     zero produces a sheet that draws boxes that are not there, and the
     clamp belongs next to the write rather than in every caller. */

  /** @returns how many were actually marked, which is not always what was asked. */
  async markTrack(path: "hitPoints" | "stress" | "armorSlots", amount = 1): Promise<number> {
    const track = this.system?.resources?.[path];
    if (!track) return 0;
    const next = Math.clamp(track.marked + amount, 0, track.max);
    const delta = next - track.marked;
    if (delta === 0) return 0;
    await this.update({ [`system.resources.${path}.marked`]: next });
    return delta;
  }

  async clearTrack(path: "hitPoints" | "stress" | "armorSlots", amount = 1): Promise<number> {
    return -(await this.markTrack(path, -amount));
  }

  /* ── hope ─────────────────────────────────────────────────────────── */

  async gainHope(amount = 1): Promise<number> {
    const hope = this.system?.resources?.hope;
    if (!hope) return 0;
    const next = Math.clamp(hope.value + amount, 0, hope.max);
    const delta = next - hope.value;
    if (delta === 0) return 0;
    await this.update({ "system.resources.hope.value": next });
    return delta;
  }

  /** @returns false when the character could not afford it — nothing is spent. */
  async spendHope(amount = 1): Promise<boolean> {
    const hope = this.system?.resources?.hope;
    if (!hope || hope.value < amount) return false;
    await this.update({ "system.resources.hope.value": hope.value - amount });
    return true;
  }

  /* ── damage ───────────────────────────────────────────────────────── */

  /**
   * Which rung a raw damage total lands on. Thresholds are inclusive from
   * below: damage *at* the Major threshold is Major.
   *
   * Minions print no thresholds at all — any damage marks their one Hit
   * Point — which is why the absent case is checked before the numbers.
   */
  severityFor(amount: number): Severity {
    if (amount <= 0) return "none";
    const t = this.system?.thresholds;
    if (!t || t.none) return "minor";
    if (amount >= t.severe * 2) return "massive";
    if (amount >= t.severe) return "severe";
    if (amount >= t.major) return "major";
    return "minor";
  }

  /**
   * Apply a damage total: reduce by Armor Score if an Armor Slot is being
   * spent, resolve the severity, mark that many Hit Points.
   *
   * `useArmor` is a decision the player makes *after* seeing the number, so
   * it is a parameter rather than something inferred here.
   */
  async applyDamage(
    amount: number,
    { useArmor = false }: { useArmor?: boolean } = {},
  ): Promise<{ severity: Severity; marked: number; reduced: number; armorUsed: boolean }> {
    let reduced = amount;
    let armorUsed = false;

    const slots = this.system?.resources?.armorSlots;
    if (useArmor && slots && slots.marked < slots.max) {
      reduced = Math.max(0, amount - (this.system.armorScore?.value ?? 0));
      await this.markTrack("armorSlots", 1);
      armorUsed = true;
    }

    const severity = this.severityFor(reduced);
    const marked = await this.markTrack("hitPoints", SEVERITY_COST[severity]);
    return { severity, marked, reduced, armorUsed };
  }

  /* ── rests ────────────────────────────────────────────────────────── */

  /**
   * Clears the level-up marks on traits and Experiences. Called on tier
   * entry, not on a rest — but it lives here because it is a write to this
   * actor and nothing else needs to know how the marks are stored.
   */
  async clearAdvancementMarks(): Promise<void> {
    const traits = foundry.utils.deepClone(this.system.traits ?? {});
    for (const key of Object.keys(traits)) traits[key].marked = false;
    const experiences = (this.system.experiences ?? []).map((e: any) => ({ ...e, marked: false }));
    await this.update({ "system.traits": traits, "system.experiences": experiences });
  }

  /* ── convenience ──────────────────────────────────────────────────── */

  /** The trait modifier used by a roll, by trait key. */
  traitMod(trait: string): number {
    return this.system?.traits?.[trait]?.value ?? 0;
  }

  get isCharacter(): boolean {
    return this.type === "character";
  }

  get equippedArmor(): any {
    return this.items.find((i: any) => i.type === "armor" && i.system.equipped) ?? null;
  }

  weaponInSlot(slot: "primary" | "secondary"): any {
    return (
      this.items.find(
        (i: any) => i.type === "weapon" && i.system.equipped && i.system.slot === slot,
      ) ?? null
    );
  }

  /**
   * A two-handed primary occupies the secondary slot too. The sheet draws
   * that slot as *blocked* rather than empty, because it is a rule acting on
   * you and not a choice you have not made yet.
   */
  get secondaryBlocked(): boolean {
    return this.weaponInSlot("primary")?.system.burden === "twoHanded";
  }
}
