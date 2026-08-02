/**
 * Making a character: the half that is not drawing.
 *
 * Progress is **derived**, and that is the design rather than an optimisation.
 * A class Item on the actor means step 1 happened. An ancestry and a community
 * mean step 2. Two Experiences mean step 7. Nothing stores a cursor, so nothing
 * can be stale — delete your class from the gear tab and the window says so on
 * the next open, because the window was never holding a second opinion.
 *
 * It is the same argument `data/actors.ts` makes about the advancement marks,
 * and it is worth restating because it is easy to lose: *the marks are the
 * record, and the two can never disagree because there is only one of them.*
 * A stored step cursor would be a second record of a fact the sheet already
 * holds, and the two would drift the first time anyone touched the sheet from
 * anywhere else.
 *
 * Exactly two things are written down, because exactly two cannot be derived —
 * see the note on `system.creation` in `data/actors.ts`. `finished`, because
 * done is a decision and not a fact. And `granted`, because undoing a choice
 * has to know which documents this flow put here and which ones a player
 * dragged in.
 *
 * ── what this file will not do ────────────────────────────────────────
 * It does not hand out advancement. A table starting at level 5 does creation
 * at level 1 and then spends four levels on the advancement tab, which already
 * works and already asks the right questions. Above level 1 this window opens
 * in review-and-edit: the steps say what you have, the constraints relax to
 * your actual level, and nothing here tries to catch you up.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  CREATION_STEPS,
  DEFAULT_STRESS_MAX,
  LOADOUT_LIMIT,
  STARTING_DOMAIN_CARDS,
  STARTING_EXPERIENCES,
  STARTING_EXPERIENCE_MODIFIER,
  STARTING_GOLD_HANDFULS,
  STARTING_HOPE,
  STARTING_TRAIT_SPREAD,
  SYSTEM_ID,
  TRAITS,
  type CreationStep,
} from "../config.ts";

/* ══════════════════════════════════════════════════════════════════════
   THE COMPENDIUMS

   Four packs, and the window reads whole documents rather than the index,
   because every step shows rules text and the index carries none of it. They
   are loaded once per window and cached on it — `getDocuments()` on the domain
   pack is 189 documents, and a step that re-fetched them on every keystroke
   would be a search box with a database behind it.
   ══════════════════════════════════════════════════════════════════════ */

export const PACK = {
  classes: `${SYSTEM_ID}.classes`,
  heritage: `${SYSTEM_ID}.heritage`,
  domains: `${SYSTEM_ID}.domains`,
  equipment: `${SYSTEM_ID}.equipment`,
} as const;

/**
 * Every document of one subtype, from one pack.
 *
 * A missing pack is a real state — a world can disable a compendium — and it
 * yields an empty list rather than throwing, so one absent pack costs one
 * empty step rather than a window that will not open. The step says it is
 * empty; see `stepsOf`.
 */
export async function fromPack(key: keyof typeof PACK, type?: string): Promise<any[]> {
  const pack = game.packs?.get(PACK[key]);
  if (!pack) return [];
  const docs = await pack.getDocuments();
  return type ? docs.filter((d: any) => d.type === type) : [...docs];
}

/* ══════════════════════════════════════════════════════════════════════
   WHAT IS DONE

   One predicate per step, all of them reading the actor and nothing else.
   ══════════════════════════════════════════════════════════════════════ */

const of = (actor: any, type: string): any[] =>
  actor.items?.filter?.((i: any) => i.type === type) ?? [];

/** The class Item, and the subclass cards belonging to it. */
export const classOf = (actor: any): any => of(actor, "class")[0] ?? null;

export const subclassOf = (actor: any): any =>
  of(actor, "subclass").find((i: any) => i.system?.rank === "foundation") ??
  of(actor, "subclass")[0] ??
  null;

/**
 * Has the trait spread been placed?
 *
 * At level 1 the answer is exact: the six values sorted are `2,1,1,0,0,−1` and
 * anything else is a spread half-placed or a sheet somebody typed into. Above
 * level 1 that test is simply wrong — advancement raises two traits per option
 * taken, so a level-6 character's six values legitimately do not match the
 * starting spread and never will again. There the question is only whether
 * they were ever assigned at all, which the total answers: the spread sums to
 * 3 and advancement only ever adds.
 */
export function spreadPlaced(actor: any): boolean {
  const values = TRAITS.map((t) => Number(actor.system?.traits?.[t]?.value ?? 0));
  const total = values.reduce((n, v) => n + v, 0);
  const want: number[] = [...STARTING_TRAIT_SPREAD].sort((x, y) => y - x);

  if ((actor.system?.level ?? 1) > 1) return total >= want.reduce((n, v) => n + v, 0);
  return values.sort((x, y) => y - x).every((v, i) => v === want[i]);
}

/** An Experience with a name on it. A blank row is a row, not an Experience. */
export const namedExperiences = (actor: any): any[] =>
  (actor.system?.experiences ?? []).filter((x: any) => String(x?.name ?? "").trim());

export const equippedPrimary = (actor: any): any =>
  of(actor, "weapon").find((i: any) => i.system?.equipped && i.system?.slot === "primary") ?? null;

export const equippedSecondary = (actor: any): any =>
  of(actor, "weapon").find((i: any) => i.system?.equipped && i.system?.slot === "secondary") ?? null;

export const equippedArmor = (actor: any): any =>
  of(actor, "armor").find((i: any) => i.system?.equipped) ?? null;

export interface StepState extends CreationStep {
  done: boolean;
  /** Why this step cannot be attempted yet. Its presence disables it. */
  blocked?: string;
  /** What has been chosen, for the rail — or what is still outstanding. */
  detail: string;
}

/**
 * Every step, with its state, computed fresh.
 *
 * The only ordering constraint in the whole flow is that **domain cards need a
 * class**, because the class is what decides which cards are legal. Everything
 * else is genuinely independent and is left unlocked: the book itself says you
 * may fill these in whatever order suits you, and a flow that forced heritage
 * before traits would be inventing a rule to look organised.
 */
export function stepsOf(actor: any): StepState[] {
  const cls = classOf(actor);
  const sub = subclassOf(actor);
  const anc = of(actor, "ancestry");
  const com = of(actor, "community");
  const xp = namedExperiences(actor);
  const cards = of(actor, "domainCard");
  const primary = equippedPrimary(actor);
  const armor = equippedArmor(actor);

  const say = (parts: (string | false | null | undefined)[]) =>
    parts.filter(Boolean).join(" · ") || "—";

  return CREATION_STEPS.map((step): StepState => {
    switch (step.id) {
      case "class":
        return {
          ...step,
          done: !!cls && !!sub,
          detail: say([cls?.name, sub?.system?.subclassName]),
        };

      case "heritage":
        return {
          ...step,
          done: anc.length > 0 && com.length > 0,
          detail: say([com[0]?.name, anc[0]?.name]),
        };

      case "traits":
        return {
          ...step,
          done: spreadPlaced(actor),
          detail: spreadPlaced(actor) ? "placed" : "not yet placed",
        };

      case "equipment":
        return {
          ...step,
          done: !!primary && !!armor,
          detail: say([primary?.name, armor?.name]),
        };

      case "experiences":
        return {
          ...step,
          done: xp.length >= STARTING_EXPERIENCES,
          detail: xp.length ? xp.map((x: any) => x.name).join(" · ") : "none yet",
        };

      case "domains":
        return {
          ...step,
          done: cards.length >= STARTING_DOMAIN_CARDS,
          // Named rather than counted. "needs a class" tells you what to go
          // and do; a dead row with no reason is the window knowing something
          // and not saying it.
          blocked: cls ? undefined : "needs a class",
          detail: cards.length ? cards.map((c: any) => c.name).join(" · ") : "none yet",
        };
    }
  });
}

/**
 * Whether this character should be treated as already made.
 *
 * Called once, on the first open of a character that predates any of this, and
 * the point is that nobody's year-old level-6 Guardian is greeted by a progress
 * bar reading 0 of 6. The test is deliberately generous — a class, a heritage
 * and two Experiences — because the cost of guessing wrong in this direction is
 * a player pressing a button, and the cost of guessing wrong the other way is
 * telling somebody their finished character is unfinished.
 */
export const inferFinished = (actor: any): boolean =>
  !!classOf(actor) &&
  of(actor, "ancestry").length > 0 &&
  namedExperiences(actor).length >= STARTING_EXPERIENCES;

/* ══════════════════════════════════════════════════════════════════════
   PROVENANCE

   Everything this flow creates is recorded, so that changing your mind can
   remove exactly what it put there. The longsword you looted in session three
   was not put here by this flow and is therefore never a candidate.
   ══════════════════════════════════════════════════════════════════════ */

const granted = (actor: any): string[] => [...(actor.system?.creation?.granted ?? [])];

/** Create Items and remember that we did. */
export async function grantItems(actor: any, sources: any[]): Promise<any[]> {
  if (!sources.length) return [];
  const made = (await actor.createEmbeddedDocuments("Item", sources)) ?? [];
  const ids = made.map((i: any) => i.id);
  if (ids.length) {
    await actor.update({ "system.creation.granted": [...granted(actor), ...ids] });
  }
  return made;
}

/**
 * Delete Items this flow granted, and forget them.
 *
 * Ids that are not ours are dropped rather than deleted, which is the guard
 * that makes the cascade safe: a caller that computes the wrong set can only
 * ever fail to remove something.
 */
export async function removeGranted(actor: any, ids: string[]): Promise<void> {
  const mine = new Set(granted(actor));
  const kill = ids.filter((id) => mine.has(id) && actor.items.get(id));
  if (!kill.length) return;
  await actor.deleteEmbeddedDocuments("Item", kill);
  await actor.update({
    "system.creation.granted": granted(actor).filter((id) => !kill.includes(id)),
  });
}

/**
 * What changing to `nextClass` would take with it.
 *
 * Three kinds of thing, and the third is the one that needs the care:
 *
 *   - the class Item itself;
 *   - every subclass card, because a School of War card on a Rogue is not a
 *     legal object and not a recoverable one either;
 *   - domain cards whose domain the new class does not have — and **only** the
 *     ones this flow granted. A card dragged off the compendium by hand stays,
 *     even when it becomes illegal, because removing it would be this window
 *     deleting somebody's document over a rule it was not asked to police.
 *     The window marks it instead.
 *
 * Returns documents rather than ids so the confirm can name them. A cascade
 * that says "3 items will be removed" is a cascade nobody can consent to.
 */
export function cascadeOf(actor: any, nextClass: any): any[] {
  const mine = new Set(granted(actor));
  const keep = new Set(
    [nextClass?.system?.domains?.primary, nextClass?.system?.domains?.secondary].filter(Boolean),
  );

  /* Multiclassing is real and this must not eat the other class's cards, so
     the surviving domains are every class's except the one being replaced. */
  for (const c of of(actor, "class")) {
    if (c.id === classOf(actor)?.id) continue;
    for (const d of [c.system?.domains?.primary, c.system?.domains?.secondary]) {
      if (d) keep.add(d);
    }
  }

  const out: any[] = [];
  for (const item of actor.items ?? []) {
    if (!mine.has(item.id)) continue;
    if (item.type === "class" && item.id === classOf(actor)?.id) out.push(item);
    else if (item.type === "subclass") out.push(item);
    else if (item.type === "domainCard" && !keep.has(item.system?.domain)) out.push(item);
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════════
   WHAT IS LEGAL

   The offer is constrained rather than the answer validated — `pickTwo`'s
   rule, and the reason every one of these returns a *reason* rather than a
   boolean. An option you may not take stays on screen wearing the sentence
   that explains it, which is how a player learns the rule exists.

   `loose` is the GM's unrestricted switch. It does not change what these
   functions know; it changes whether the window listens.
   ══════════════════════════════════════════════════════════════════════ */

/** Why this domain card may not be taken, or nothing. */
export function cardRefusal(actor: any, card: any, domains: string[]): string | undefined {
  const level = Number(actor.system?.level ?? 1);
  if (!domains.includes(card.system?.domain)) {
    const name = String(card.system?.domain ?? "—");
    return `${name} · not one of your domains`;
  }
  if ((card.system?.level ?? 1) > level) return `Level ${card.system?.level} · above your level`;
  if (actor.items.some((i: any) => i.type === "domainCard" && i.name === card.name)) {
    return "already taken";
  }
  return undefined;
}

/**
 * Why this weapon may not be taken.
 *
 * Two rules, and the second is the one people get wrong at a real table: a
 * magic weapon needs a Spellcast trait, which comes from your subclass, so
 * more than half the classes may not take one at all.
 */
export function weaponRefusal(actor: any, weapon: any, opts: { secondary?: boolean } = {}): string | undefined {
  const tier = Number(weapon.system?.tier ?? 1);
  const want = tierFor(actor);
  if (tier > want) return `Tier ${tier} · above your tier`;
  if (weapon.system?.magical && !actor.system?.spellcastTrait) {
    return "needs a Spellcast trait";
  }
  if (opts.secondary && twoHanded(actor)) return "your primary weapon is two-handed";
  return undefined;
}

export const armorRefusal = (actor: any, armor: any): string | undefined => {
  const tier = Number(armor.system?.tier ?? 1);
  return tier > tierFor(actor) ? `Tier ${tier} · above your tier` : undefined;
};

/** Creation buys tier 1; a character above level 1 shops at their own tier. */
const tierFor = (actor: any): number => Number(actor.system?.tier ?? 1);

const twoHanded = (actor: any): boolean =>
  equippedPrimary(actor)?.system?.burden === "twoHanded";

/* ══════════════════════════════════════════════════════════════════════
   APPLYING

   Every one of these writes immediately. There is no held state and no commit,
   which is what makes closing the window safe and reopening it honest — and it
   is the same call `rest.ts` made about a downtime move: a move is taken, not
   ticked.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Take a class, with a subclass, and everything that follows from it.
 *
 * The cascade has already been consented to by the caller — see `cascadeOf`
 * and the confirm in `CreationWindow.svelte`. This is the write.
 *
 * Hope is set here and only here, and only when the character has none. "You
 * start with 2 Hope" is step 4, the pool's schema default is zero, and nothing
 * in this system had ever put the opening two in. Guarding on the current
 * value rather than on some first-time flag is what stops a player who changes
 * class in session four being handed two Hope for it.
 */
export async function takeClass(actor: any, cls: any, sub: any): Promise<void> {
  const doomed = cascadeOf(actor, cls);
  if (doomed.length) await removeGranted(actor, doomed.map((d) => d.id));

  await grantItems(actor, [cls.toObject(), ...(sub ? [sub.toObject()] : [])]);

  const update: Record<string, unknown> = {
    "system.evasion.base": cls.system?.startingEvasion ?? 10,
    "system.resources.hitPoints.max": cls.system?.startingHitPoints ?? 6,
    "system.resources.stress.max": DEFAULT_STRESS_MAX,
  };
  if (!(actor.system?.resources?.hope?.value > 0)) {
    update["system.resources.hope.value"] = STARTING_HOPE;
  }
  if (!(actor.system?.gold?.handfuls > 0)) {
    update["system.gold.handfuls"] = STARTING_GOLD_HANDFULS;
  }
  await actor.update(update);
}

/**
 * Swap the subclass, and only the subclass.
 *
 * Deliberately **not** `takeClass` with a different second argument, which is
 * what this was. That routed a subclass change through the class cascade: the
 * class Item was destroyed and rebuilt to change the card beside it, so its id
 * moved, and a chat card posted from it a minute earlier pointed at a document
 * that no longer existed. The two operations look alike and are not — changing
 * your class invalidates what hangs off it, and changing which of its two
 * subclasses you took invalidates nothing but the subclass.
 *
 * Every subclass card goes, not just the foundation: Specialization and Mastery
 * belong to the subclass you are leaving, and a Vengeance Mastery on a Stalwart
 * is the same nonsense as a School of War card on a Rogue.
 */
export async function takeSubclass(actor: any, sub: any): Promise<void> {
  const held = of(actor, "subclass");
  if (held.some((h: any) => h.system?.subclassName === sub.system?.subclassName)) return;
  await removeGranted(actor, held.map((h: any) => h.id));

  /* Anything left is a subclass card the flow did not grant — dragged in by
     hand. Removing it is not this window's call, but leaving it would mean two
     subclasses on one sheet, so it is unequipped from the decision rather than
     deleted: the player is told, and the document is theirs to keep or bin. */
  const stubborn = of(actor, "subclass").filter(
    (h: any) => h.system?.subclassName !== sub.system?.subclassName,
  );
  if (stubborn.length) {
    ui.notifications?.warn(
      game.i18n.format("DAGGERHEART.Warning.OtherSubclass", {
        names: stubborn.map((s: any) => s.name).join(", "),
      }),
    );
  }
  await grantItems(actor, [sub.toObject()]);
}

/**
 * Take an ancestry, optionally mixed.
 *
 * Mixed ancestry is the top feature of one and the bottom of another, and the
 * position *is* the rule — which is why `AncestryData` names its two features
 * for where they sit on the card rather than for what they do. A goblin-orc
 * can be Surefooted or Sturdy and never both.
 *
 * It lands as **one** Item wearing the first ancestry's name and the second's
 * bottom feature, with `mixedFrom` recording where the bottom half came from.
 * One Item rather than two, because the character has one ancestry: two would
 * put two cards on the heritage row and hand the sheet four features to draw
 * where the rules give two.
 */
export async function takeAncestry(actor: any, top: any, bottom: any = null): Promise<void> {
  await removeGranted(actor, of(actor, "ancestry").map((i: any) => i.id));

  const source = top.toObject();
  if (bottom && bottom.id !== top.id) {
    source.system.bottomFeature = foundry.utils.deepClone(bottom.system.bottomFeature);
    source.system.mixedFrom = bottom.name;
    source.name = `${top.name} / ${bottom.name}`;
  }
  await grantItems(actor, [source]);
}

export async function takeCommunity(actor: any, community: any): Promise<void> {
  await removeGranted(actor, of(actor, "community").map((i: any) => i.id));
  await grantItems(actor, [community.toObject()]);
}

/** Write the six trait values whole. Marks are advancement's and stay untouched. */
export async function takeTraits(actor: any, values: Record<string, number | null>): Promise<void> {
  const next = foundry.utils.deepClone(actor.system.traits ?? {});
  for (const t of TRAITS) {
    next[t] = { ...(next[t] ?? {}), value: Number(values[t] ?? 0) };
  }
  await actor.update({ "system.traits": next });
}

/**
 * Equip a weapon into its slot, replacing whatever was there.
 *
 * The burden rule is enforced by *unequipping*, not by refusing: taking a
 * two-handed primary puts your secondary away rather than telling you that you
 * cannot. You made a choice about your primary hand and the consequence for
 * the other one is arithmetic, not a decision to be interrupted for.
 */
export async function takeWeapon(actor: any, weapon: any, slot: "primary" | "secondary"): Promise<void> {
  const held = of(actor, "weapon").filter((i: any) => i.system?.equipped && i.system?.slot === slot);
  await removeGranted(actor, held.map((i: any) => i.id));

  const source = weapon.toObject();
  source.system.slot = slot;
  source.system.equipped = true;

  /* The arcane-frame wheelchair, and only it: the one weapon whose trait is
     "whatever your subclass casts with". Resolved at the moment of granting,
     which is the first moment the answer exists. */
  if (source.system.magical && actor.system?.spellcastTrait && isSpellcastWeapon(source)) {
    source.system.trait = actor.system.spellcastTrait;
  }

  await grantItems(actor, [source]);

  if (slot === "primary" && source.system.burden === "twoHanded") {
    const off = equippedSecondary(actor);
    if (off) await off.update({ "system.equipped": false });
  }
}

/** A weapon whose printed trait is "Spellcast" rather than one of the six. */
const isSpellcastWeapon = (source: any): boolean =>
  /Spellcast trait your subclass/i.test(String(source.system?.description ?? ""));

export async function takeArmor(actor: any, armor: any): Promise<void> {
  const held = of(actor, "armor").filter((i: any) => i.system?.equipped);
  await removeGranted(actor, held.map((i: any) => i.id));

  const source = armor.toObject();
  source.system.equipped = true;
  await grantItems(actor, [source]);
}

/** The pack, the potion, and the class's own either/or — all as loot. */
export async function takeKit(actor: any, sources: any[]): Promise<void> {
  await grantItems(actor, sources);
}

export async function takeExperiences(actor: any, names: string[]): Promise<void> {
  const kept = (actor.system?.experiences ?? []).slice(STARTING_EXPERIENCES);
  const made = names.map((name) => ({
    name: name.trim(),
    modifier: STARTING_EXPERIENCE_MODIFIER,
    marked: false,
  }));
  await actor.update({ "system.experiences": [...made, ...kept] });
}

/**
 * Take a domain card into the loadout.
 *
 * Into the *loadout*, because two is under the limit and because a card you
 * chose at creation is a card you are holding — putting it in the vault would
 * charge you Stress to recall a card you have never used. Same call
 * `handleActorDrop` makes for a card dragged in.
 */
export async function takeCard(actor: any, card: any): Promise<void> {
  const limit = actor.system?.loadoutLimit ?? LOADOUT_LIMIT;
  const held = of(actor, "domainCard").filter((c: any) => c.system?.inLoadout).length;
  const source = card.toObject();
  source.system.inLoadout = held < limit;
  await grantItems(actor, [source]);
}

export async function dropCard(actor: any, id: string): Promise<void> {
  await removeGranted(actor, [id]);
}

/** Done is a decision. See the note on `system.creation`. */
export const setFinished = (actor: any, finished: boolean): Promise<any> =>
  actor.update({ "system.creation.finished": finished });
