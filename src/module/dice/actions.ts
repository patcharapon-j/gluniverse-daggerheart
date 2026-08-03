/**
 * The rolls a sheet actually offers.
 *
 * Thin wrappers that assemble the terms from the actor and hand them to the
 * engine. Their whole job is to do the two sums players get wrong: an attack
 * is `2d12 + trait` *plus whatever the weapon's feature adds*, and damage is
 * **Proficiency copies of the die**, not one die. The sheet already knows the
 * Proficiency, so there is no excuse for making anyone multiply it.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { traitLabel, type Trait } from "../config.ts";
import { modifierTotal, rollModifierTerms, weaponModifierTerms } from "../data/modifiers.ts";
import { plain } from "../sheets/cards.ts";
import { getFear, setFear } from "../settings.ts";
import { rollDamage, rollDuality, rollFoe } from "./rolls.ts";
import type { Note, Term } from "./types.ts";

interface Common {
  advantage?: number;
  dc?: number | null;
  /** Experiences the player is spending a Hope to bring in. */
  experiences?: { name: string; modifier: number }[];
  /** Any other flat modifier, already labelled. */
  extra?: Term[];
  /**
   * The duality pair, as notation, when something moved it off the printed
   * 2d12 — several cards upgrade the Hope Die to a d20. Passed straight
   * through: which dice were rolled is the engine's business and none of
   * these wrappers', whose whole job is the two sums players get wrong.
   */
  hopeDie?: string;
  fearDie?: string;
}

/** Experiences cost a Hope, so they are drawn in the currency that paid. */
const experienceTerms = (list: Common["experiences"]): Term[] =>
  (list ?? []).map((e) => ({ k: e.name || "experience", v: e.modifier, spent: true }));

/**
 * Charge for the Experiences, and refuse the roll if the purse is short.
 *
 * The `spent: true` above has been on every Experience term since the card
 * was written — it is what draws them in gold, the currency that paid — and
 * nothing ever took the Hope. So an Experience was free and the card said it
 * was not, which is the worse half of the bug this popover exists to close.
 *
 * Charged *before* the dice, not after. A roll is a thing you commit to, and
 * a payment that landed on the result would let you read the outcome and
 * then discover you could not afford the roll that produced it. It also
 * means the popover's own affordability check and this one agree: both ask
 * the same question of the same number, a moment apart.
 *
 * Returns false when it could not pay, and the caller returns null rather
 * than rolling — quietly rolling a cheaper version of what was asked for
 * would be the system deciding which Experiences you meant.
 */
async function payFor(actor: any, list: Common["experiences"]): Promise<boolean> {
  const n = list?.length ?? 0;
  if (!n) return true;
  if (await actor?.spendHope?.(n)) return true;
  ui.notifications?.warn(
    game.i18n.format("DAGGERHEART.Warning.NotEnoughHope", { need: n }),
  );
  return false;
}

/* ── a plain trait roll ──────────────────────────────────────────────── */

export async function rollTrait(actor: any, trait: Trait, opts: Common & { reaction?: boolean } = {}) {
  if (!(await payFor(actor, opts.experiences))) return null;
  const mods: Term[] = [
    { k: traitLabel(trait).toLowerCase(), v: actor.traitMod(trait) },
    ...rollModifierTerms(actor, opts.reaction ? "reactionRoll" : "actionRoll"),
    ...(trait === actor.system?.spellcastTrait
      ? rollModifierTerms(actor, "spellcastRoll")
      : []),
    ...experienceTerms(opts.experiences),
    ...(opts.extra ?? []),
  ];
  return rollDuality({
    actor,
    label: traitLabel(trait),
    kind: opts.reaction ? "reaction roll" : `${traitLabel(trait).toLowerCase()} roll`,
    mods,
    advantage: opts.advantage,
    hopeDie: opts.hopeDie,
    fearDie: opts.fearDie,
    dc: opts.dc ?? null,
    reaction: opts.reaction,
  });
}

/* ── an attack ───────────────────────────────────────────────────────── */

/**
 * The weapon's own rule, in the shape the plate draws notes in.
 *
 * Most weapons have none and get nothing. The ones that do carry the thing
 * that makes them worth wielding — Whirlwind hits every adjacent target,
 * Brutal upgrades a maximum die — and the card announcing the swing was
 * naming the weapon and stopping there. The roller has the weapon on their
 * sheet; everyone else at the table has this card, so for four people out of
 * five the rule was simply not in the room.
 *
 * The description goes through `plain`, which is what turns Foundry's stored
 * HTML into the dialect the card builders read. That is the same conversion
 * the weapon's own card does, so the two cannot say it differently.
 *
 * `name || "Feature"`: a description with no name is a real state — the item
 * sheet lets you write one without the other — and an unlabelled band would
 * read as a stray paragraph.
 */
const weaponNote = (weapon: any): Note | undefined => {
  const f = weapon?.system?.feature;
  const t = plain(f?.description);
  return t ? { n: f.name || "Feature", t } : undefined;
};

/**
 * The attack half. Damage is a separate message on purpose: the target's
 * thresholds decide what the number means, and the attack card should not
 * pretend to know them.
 */
export async function rollAttack(actor: any, weapon: any, opts: Common & { reaction?: boolean } = {}) {
  if (!(await payFor(actor, opts.experiences))) return null;
  const trait = (weapon?.system?.trait ?? "agility") as Trait;
  const mods: Term[] = [
    { k: traitLabel(trait).toLowerCase(), v: actor.traitMod(trait) },
    ...rollModifierTerms(actor, opts.reaction ? "reactionRoll" : "actionRoll", weapon),
    ...rollModifierTerms(actor, "attackRoll", weapon),
    ...weaponModifierTerms(actor, weapon, "attack"),
    ...experienceTerms(opts.experiences),
    ...(opts.extra ?? []),
  ];

  const result = await rollDuality({
    actor,
    label: weapon?.name ?? "Attack",
    kind: "attack roll",
    mods,
    advantage: opts.advantage,
    hopeDie: opts.hopeDie,
    fearDie: opts.fearDie,
    dc: opts.dc ?? null,
    next: "Roll damage",
    nextAct: "roll-damage",
    weaponId: weapon?.id,
    note: weaponNote(weapon),
  });

  return result;
}

/**
 * Proficiency copies of the weapon's die. On a critical the maximum of those
 * dice is awarded *and* they are rolled — both halves show on the card.
 */
export async function rollWeaponDamage(actor: any, weapon: any, { critical = false } = {}) {
  const dmg = weapon?.system?.damage ?? { dice: "d6", bonus: 0, type: "physical" };
  const proficiency =
    (actor.system?.proficiency ?? 1) + modifierTotal(actor, "damageProficiency");
  const mods: Term[] = [
    ...(dmg.bonus ? [{ k: "weapon", v: dmg.bonus }] : []),
    ...rollModifierTerms(actor, "damageRoll", weapon),
    ...weaponModifierTerms(actor, weapon, "damage"),
  ];

  return rollDamage({
    actor,
    label: weapon?.name ?? "Damage",
    count: proficiency * Math.max(1, dmg.count ?? 1),
    die: dmg.dice,
    mods,
    damageType: dmg.type,
    critical,
  });
}

/* ── the GM's side ───────────────────────────────────────────────────── */

/**
 * The GM's purse, and the same rule as the player's.
 *
 * Fear is a world setting rather than a field on the actor, so it is spent
 * here rather than through a document method — and only a GM may write it,
 * which is fine because only a GM rolls an adversary.
 */
async function payFearFor(list: Common["experiences"]): Promise<boolean> {
  const n = list?.length ?? 0;
  if (!n) return true;
  const pool = getFear();
  if (pool < n) {
    /* The strip flinches instead of a toast explaining itself over the top of
       the number that already said no — the Hope pool's answer, on the GM's
       side of the table. It is a hook rather than a call so that the roll path
       does not reach into a UI module: `fear-hud.ts` is listening, and on a
       client with no strip drawn this is silent, which is correct because
       there is nothing there to have refused.

       Only a GM rolls an adversary, so the flinch always lands on the screen
       that pressed the button. */
    Hooks.callAll("daggerheart.fearRefused", n, pool);
    return false;
  }
  await setFear(pool - n);
  return true;
}

export async function rollAdversaryAttack(
  actor: any,
  opts: {
    advantage?: number;
    target?: any;
    experiences?: { name: string; modifier: number }[];
    extra?: Term[];
  } = {},
) {
  if (!(await payFearFor(opts.experiences))) return null;
  const attack = actor.system?.attack ?? { name: "Attack", modifier: 0 };
  // Fear buys Experience on this side the way Hope does on the other, so
  // the term is drawn in violet rather than gold.
  const mods: Term[] = [
    { k: "attack modifier", v: attack.modifier },
    ...(opts.experiences ?? []).map((e) => ({ k: e.name || "experience", v: e.modifier, fear: true })),
    ...(opts.extra ?? []),
  ];

  const targetActor = opts.target?.actor ?? opts.target ?? null;
  return rollFoe({
    actor,
    label: attack.name || "Attack",
    mods,
    advantage: opts.advantage,
    dc: targetActor?.system?.evasion?.value ?? null,
    target: targetActor?.name ?? "",
  });
}

export async function rollAdversaryDamage(actor: any, { critical = false } = {}) {
  const dmg = actor.system?.attack?.damage ?? { count: 1, dice: "d6", bonus: 0, type: "physical" };
  const mods: Term[] = dmg.bonus ? [{ k: "modifier", v: dmg.bonus }] : [];
  return rollDamage({
    actor,
    label: actor.system?.attack?.name ?? "Damage",
    count: Math.max(1, dmg.count ?? 1),
    die: dmg.dice,
    mods,
    damageType: dmg.type,
    critical,
  });
}

/** A d20 reaction roll: no critical benefit, and nothing passes hands. */
export async function rollAdversaryReaction(actor: any, dc: number | null = null, advantage = 0) {
  return rollFoe({
    actor,
    label: "Reaction",
    kind: "adversary reaction",
    mods: [],
    advantage,
    dc,
    reaction: true,
  });
}
