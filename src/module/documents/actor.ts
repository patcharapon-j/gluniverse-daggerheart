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

import { SEVERITY_COST, reduceSeverity, type Severity } from "../config.ts";

/**
 * What is being spent against one hit, and how far it pushes the damage down.
 *
 * `rungs` defaults to `armor`, which is the printed rule and the only one the
 * system knows on its own. Anything else here is a card's price and the card's
 * business; see {@link DaggerheartActor.previewDamage}.
 */
export interface DamageSpend {
  rungs?: number;
  armor?: number;
  stress?: number;
  hope?: number;
}

export interface DamagePlan extends Required<DamageSpend> {
  /** Where the raw number landed before anything was spent. */
  base: Severity;
  /** Where it landed after. */
  severity: Severity;
  /** Hit Points marked — the *actual* count, which a full track can shorten. */
  marked: number;
}

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

  /** How many Armor Slots are left to spend. */
  get armorLeft(): number {
    const slots = this.system?.resources?.armorSlots;
    return slots ? Math.max(0, slots.max - slots.marked) : 0;
  }

  /** How much Stress there is room to mark. */
  get stressLeft(): number {
    const s = this.system?.resources?.stress;
    return s ? Math.max(0, s.max - s.marked) : 0;
  }

  get hopeLeft(): number {
    return this.system?.resources?.hope?.value ?? 0;
  }

  /**
   * What a damage total *would* do, without doing any of it.
   *
   * Split out because the dialog needs to answer "and what if I mark one?"
   * for several values of one, live, before anything is written. Nothing here
   * touches the document; {@link applyDamage} is the half that does.
   *
   * `rungs` and the payment are two separate facts and have to be, because
   * only one rule in the book ties them together. **An Armor Slot buys one
   * threshold** — that is printed, and it is the default here. Everything else
   * that lowers a hit is a card, and cards charge whatever they like: a Stress,
   * two Hope, a use off something in your loadout. So the dialog says how far
   * the damage fell and, separately, what left your sheet to do it — and the
   * two agreeing is the *card's* promise rather than this function's.
   */
  previewDamage(amount: number, opts: DamageSpend = {}): DamagePlan {
    const base = this.severityFor(amount);
    const armor = Math.min(Math.max(0, opts.armor ?? 0), this.armorLeft);
    const stress = Math.min(Math.max(0, opts.stress ?? 0), this.stressLeft);
    const hope = Math.min(Math.max(0, opts.hope ?? 0), this.hopeLeft);
    // Armour is the rung by default; anything else has to say so, because
    // nothing else reduces severity on its own authority.
    const rungs = Math.max(0, opts.rungs ?? armor);
    const severity = reduceSeverity(base, rungs);
    return {
      base,
      severity,
      marked: SEVERITY_COST[severity] ?? 0,
      rungs,
      armor,
      stress,
      hope,
    };
  }

  /**
   * Apply a damage total: spend what is being spent, resolve the severity it
   * bought, mark that many Hit Points.
   *
   * **An Armor Slot moves the damage one rung down the ladder** — Severe to
   * Major, Major to Minor, Minor to nothing — rather than subtracting the
   * Armor Score from the number. That is the printed rule, and it is not the
   * obvious one: Armor Score is how many slots you *have*, not how much damage
   * each one eats. This used to subtract, which made heavy armour absurd
   * against small hits and useless against large ones, in both cases silently.
   *
   * None of it is inferred. Every one of these is a decision the player makes
   * *after* seeing the number — which is the whole reason armour is a slot and
   * not a stat — so they arrive as arguments and the dialog is where they are
   * chosen.
   */
  async applyDamage(amount: number, spend: DamageSpend = {}): Promise<DamagePlan> {
    const plan = this.previewDamage(amount, spend);
    if (plan.armor) await this.markTrack("armorSlots", plan.armor);
    if (plan.stress) await this.markTrack("stress", plan.stress);
    if (plan.hope) await this.spendHope(plan.hope);
    const marked = await this.markTrack("hitPoints", SEVERITY_COST[plan.severity] ?? 0);
    return { ...plan, marked };
  }

  /* ── conditions ───────────────────────────────────────────────────────
     Two of the three are applied by a hand, because only the fiction knows
     whether you are Hidden. Vulnerable is the exception: marking your last
     Stress makes you Vulnerable until you clear one, and that is a fact the
     sheet already holds — the track is right there and has been drawing the
     violet strip since it filled.

     Idempotent on purpose. It is called from an `updateActor` hook, so it
     runs on every write to this actor including its own; comparing before
     toggling is what stops that being a loop. */

  async syncVulnerable(): Promise<void> {
    const stress = this.system?.resources?.stress;
    const should = !!stress && stress.max > 0 && stress.marked >= stress.max;
    if (this.statuses?.has("vulnerable") === should) return;
    await this.toggleStatusEffect("vulnerable", { active: should });
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
    const score = this.system?.traits?.[trait];
    return score?.total ?? score?.value ?? 0;
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
