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
import { rollDamage, rollDuality, rollFoe } from "./rolls.ts";
import type { Term } from "./types.ts";

interface Common {
  advantage?: number;
  dc?: number | null;
  /** Experiences the player is spending a Hope to bring in. */
  experiences?: { name: string; modifier: number }[];
  /** Any other flat modifier, already labelled. */
  extra?: Term[];
}

/** Experiences cost a Hope, so they are drawn in the currency that paid. */
const experienceTerms = (list: Common["experiences"]): Term[] =>
  (list ?? []).map((e) => ({ k: e.name || "experience", v: e.modifier, spent: true }));

/* ── a plain trait roll ──────────────────────────────────────────────── */

export async function rollTrait(actor: any, trait: Trait, opts: Common & { reaction?: boolean } = {}) {
  const mods: Term[] = [
    { k: traitLabel(trait).toLowerCase(), v: actor.traitMod(trait) },
    ...experienceTerms(opts.experiences),
    ...(opts.extra ?? []),
  ];
  return rollDuality({
    actor,
    label: traitLabel(trait),
    kind: opts.reaction ? "reaction roll" : `${traitLabel(trait).toLowerCase()} roll`,
    mods,
    advantage: opts.advantage,
    dc: opts.dc ?? null,
    reaction: opts.reaction,
  });
}

/* ── an attack ───────────────────────────────────────────────────────── */

/**
 * The attack half. Damage is a separate message on purpose: the target's
 * thresholds decide what the number means, and the attack card should not
 * pretend to know them.
 */
export async function rollAttack(actor: any, weapon: any, opts: Common = {}) {
  const trait = (weapon?.system?.trait ?? "agility") as Trait;
  const mods: Term[] = [
    { k: traitLabel(trait).toLowerCase(), v: actor.traitMod(trait) },
    ...experienceTerms(opts.experiences),
    ...(opts.extra ?? []),
  ];

  const result = await rollDuality({
    actor,
    label: weapon?.name ?? "Attack",
    kind: "attack roll",
    mods,
    advantage: opts.advantage,
    dc: opts.dc ?? null,
    next: "Roll damage",
    nextAct: "roll-damage",
    weaponId: weapon?.id,
  });

  return result;
}

/**
 * Proficiency copies of the weapon's die. On a critical the maximum of those
 * dice is awarded *and* they are rolled — both halves show on the card.
 */
export async function rollWeaponDamage(actor: any, weapon: any, { critical = false } = {}) {
  const dmg = weapon?.system?.damage ?? { dice: "d6", bonus: 0, type: "physical" };
  const proficiency = actor.system?.proficiency ?? 1;
  const mods: Term[] = dmg.bonus ? [{ k: "weapon", v: dmg.bonus }] : [];

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

export async function rollAdversaryAttack(
  actor: any,
  opts: { advantage?: number; target?: any; experiences?: { name: string; modifier: number }[] } = {},
) {
  const attack = actor.system?.attack ?? { name: "Attack", modifier: 0 };
  // Fear buys Experience on this side the way Hope does on the other, so
  // the term is drawn in violet rather than gold.
  const mods: Term[] = [
    { k: "attack modifier", v: attack.modifier },
    ...(opts.experiences ?? []).map((e) => ({ k: e.name || "experience", v: e.modifier, fear: true })),
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
