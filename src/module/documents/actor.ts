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

import {
  FOCUS_DIE,
  FOCUS_TRAIT,
  SEVERITY_COST,
  SYSTEM_ID,
  reduceSeverity,
  type Severity,
} from "../config.ts";
import { massiveDamage } from "../settings.ts";

/**
 * Marks the Vulnerable effect as one the Stress track applied, so that the
 * track is allowed to take it back and a hand-applied one is not touched.
 * See {@link DaggerheartActor.syncVulnerable}.
 */
const FROM_STRESS = "fromStress";

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

/**
 * What a refocus did, which is not what it was asked for.
 *
 * `DamagePlan`'s discipline: the caller asked for one thing and the document
 * clamped it, so what comes back is the record rather than the request.
 * `highest` is what the dice said and `value` is what the track now holds —
 * they differ only when the printed six is reached, and keeping both is what
 * lets a caller say "you rolled a 6 and were already at 6" honestly. `cleared`
 * is what the move cost, and it is the number nothing else can recover once
 * the write has landed.
 */
export interface RefocusResult {
  /** How many d6 were thrown — your Instinct, which is the whole of the roll. */
  dice: number;
  /** The highest face rolled, before the cap. */
  highest: number;
  /** What the track held before it was cleared. */
  cleared: number;
  /** What it holds now. */
  value: number;
  /** The evaluated roll, already posted. */
  roll: any;
}

export class DaggerheartActor extends (Actor as any) {
  /**
   * What a new actor's token ships with.
   *
   * `displayBars: NONE` because the token chip draws the tracks and a bar
   * beside it is a second answer in a borrowed grammar — see the argument in
   * `token-hud.ts`. It is a **default and not a rule**: the attribute bars
   * stay declared and a table that wants one can turn it back on.
   *
   * Only ever applied to a token being created, and only where nothing has
   * said otherwise, so a duplicated actor keeps whatever its original had.
   */
  async _preCreate(data: any, options: any, user: any): Promise<any> {
    const out = await super._preCreate(data, options, user);
    if (out === false) return out;
    if (data?.prototypeToken?.displayBars === undefined) {
      this.updateSource({
        "prototypeToken.displayBars": CONST.TOKEN_DISPLAY_MODES.NONE,
      });
    }
    return out;
  }

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

  /* ── focus ────────────────────────────────────────────────────────────
     The Martial Artist's pool, and the only currency in this game that
     belongs to one subclass.

     **This is the currency and not the thing it buys.** Sixteen Martial
     Stances are `feature` Items in the compendium and shifting into one is
     "spend a Focus" — but *which* stance you are in, whether you may hold
     more than one, and what dropping out of one costs are rules about the
     stance sheet rather than about the pool, and none of them is implemented
     here or anywhere. What a reader will look for below and not find is
     `shiftStance`. `spendFocus` is what a stance would call when somebody
     builds it, which is why the refusal is a boolean rather than a throw. */

  /**
   * Spend Focus. Nothing is written when the purse is short.
   *
   * `spendHope`'s shape exactly, including the refusal: **the pool is what
   * cannot pay, so the pool is what says no**. There is no dialog and no
   * notification, because the number that refused is already on screen —
   * `refusePool` in `CharacterSheet.svelte` flinches the row, the same answer
   * the Stress track gives a recall it cannot afford.
   *
   * @returns false when the character could not afford it — nothing is spent.
   */
  async spendFocus(amount = 1): Promise<boolean> {
    const focus = this.system?.resources?.focus;
    if (!focus || amount <= 0 || focus.value < amount) return false;
    await this.update({ "system.resources.focus.value": focus.value - amount });
    return true;
  }

  /**
   * The refill: clear the track, roll Instinct d6s, take the highest.
   *
   * **It rolls a real `Roll` and posts it**, which is `dice/reroll.ts`'s rule
   * and not politeness. Writing `Math.max(...)` of some `Math.random()` calls
   * into a field would produce the right number and quietly drop all three of
   * the things a roll is: the dice log, Foundry's seeded randomness, and
   * whatever 3D-dice module the table paid for. A pool that refills without
   * dice on the table is a pool nobody watched refill.
   *
   * **`Nd6kh` rather than N separate d6s.** Keep-highest is Foundry's own
   * modifier, so the total *is* the highest face and the tooltip already draws
   * exactly the reading the card asks for — every die that was thrown, with
   * the ones that did not count struck out. That is the same `dim` claim the
   * chat plate makes about a discarded advantage die, arriving for free.
   *
   * **It posts Foundry's own roll card rather than a plate**, and that is a
   * boundary rather than a shortcut. The three plates in this system —
   * duality, damage, adversary — each exist because the dice mean something a
   * total cannot say. A refocus is a keep-highest and nothing else, and
   * `styles/frame.css` deliberately leaves Foundry's message frame standing
   * around anything that is not one of our finished objects. A fourth plate
   * with one caller would be a card grammar the table meets once a rest and
   * nowhere else.
   *
   * **The roll is posted before the pool moves.** The dice are the reason the
   * number is what it is, so they reach the table first; the rest dialog buys
   * the same beat with `RESOLVE_MS`, and here the message doing the arriving
   * is the beat.
   *
   * ── Instinct at +0 or lower ─────────────────────────────────────────
   * The SRD's own note about a Spellcast trait is "if it is +0 or lower, you
   * don't roll anything", and read literally the move would still happen: the
   * track clears, no dice are thrown, and you gain nothing. That is a rule
   * that charges you your whole pool for nothing, once per rest, on a press
   * that cannot be taken back.
   *
   * So it **refuses instead, and writes nothing.** Clearing is the cost half
   * of one act whose benefit half is arithmetically zero, and this system's
   * standing answer to a move that cannot pay off is the surface flinching
   * rather than the document being spent — see `spendFocus` above. A Brawler
   * who has genuinely put a −1 in Instinct is not being told a rule; they are
   * being stopped from throwing away four Focus for it. `null` and not
   * `false`, so a caller can tell "refused" from a result, and the sheet says
   * why in the press's own title rather than in a notification.
   *
   * @returns null when there was nothing to roll — nothing is written.
   */
  async refocus(): Promise<RefocusResult | null> {
    const focus = this.system?.resources?.focus;
    if (!focus) return null;

    const dice = this.traitMod(FOCUS_TRAIT);
    if (dice <= 0) return null;

    const roll = new Roll(`${dice}${FOCUS_DIE}kh`);
    await roll.evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("DAGGERHEART.Focus.RollFlavor", {
        n: dice,
        die: FOCUS_DIE,
      }),
    });

    const highest = Math.max(0, Number(roll.total ?? 0));
    const cleared = focus.value;
    const value = Math.clamp(highest, 0, focus.max);
    await this.update({ "system.resources.focus.value": value });
    return { dice, highest, cleared, value, roll };
  }

  /* ── damage ───────────────────────────────────────────────────────── */

  /**
   * Which rung a raw damage total lands on. Thresholds are inclusive from
   * below: damage *at* the Major threshold is Major.
   *
   * Minions print no thresholds at all — any damage marks their one Hit
   * Point — which is why the absent case is checked before the numbers.
   * A stat block printing "4/None" has a Major rung and no Severe one, so
   * the top two rungs are skipped rather than measured against a zero.
   *
   * **Massive is the SRD's optional rule and is asked for rather than
   * assumed.** It has been applied unconditionally since the damage band was
   * drawn, which is why the setting defaults on — see `settings.ts`. The
   * important part is that this is the *only* place the rung is decided:
   * the dialog reads its ceiling off this method and the band draws its
   * fifth zone from the same switch, so the two cannot offer a zone the
   * document will never return.
   */
  severityFor(amount: number): Severity {
    if (amount <= 0) return "none";
    const t = this.system?.thresholds;
    if (!t || t.none) return "minor";
    if (!t.severeNone && massiveDamage() && amount >= t.severe * 2) return "massive";
    if (!t.severeNone && amount >= t.severe) return "severe";
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
     toggling is what stops that being a loop.

     ── it may only take back what it put on ────────────────────────────
     Vulnerable arrives two ways and this method knew about one of them. A
     full Stress track is the derived route; the other is a hand — a card
     that inflicts it, a GM ruling, a duration nothing here models — and
     the printed condition is the same condition either way, so the two are
     indistinguishable once applied.

     The old test was a straight comparison, so *every* write to the actor
     re-asserted the derived answer over the hand-applied one: a GM marks a
     creature Vulnerable, the player marks a Hope, and the effect silently
     disappears. It reads as the condition not sticking, which is the worst
     shape of bug — the cause is a hook the reader has no reason to suspect
     and the symptom appears on somebody else's screen.

     So the effect this method creates is *flagged as its own*, and only a
     flagged one is ever removed. That is `creation.granted`'s provenance
     argument arriving at a condition, and it fails in the right direction:
     the unknown case is an effect nobody claimed, and leaving it alone is
     always recoverable while deleting it is not. */

  async syncVulnerable(): Promise<void> {
    const stress = this.system?.resources?.stress;
    const should = !!stress && stress.max > 0 && stress.marked >= stress.max;
    if (!!this.statuses?.has("vulnerable") === should) return;

    if (should) {
      await this.toggleStatusEffect("vulnerable", { active: true });
      /* Looked up rather than taken from the return value, because what
         `toggleStatusEffect` hands back has changed shape across versions
         and this needs the document either way. */
      await this.vulnerableEffect()?.setFlag(SYSTEM_ID, FROM_STRESS, true);
      return;
    }

    if (this.vulnerableEffect()?.getFlag?.(SYSTEM_ID, FROM_STRESS) === true) {
      await this.toggleStatusEffect("vulnerable", { active: false });
    }
  }

  /** The Vulnerable effect currently on this actor, whoever put it there. */
  private vulnerableEffect(): any {
    return this.effects?.find((e: any) => e.statuses?.has?.("vulnerable"));
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
