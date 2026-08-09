/**
 * *I Am the Weapon* — the Brawler's bare hands, as a weapon that exists.
 *
 * The feature reads: "You have a primary weapon called Brawler's Strike
 * equipped while you have no other Active Weapons. It uses a trait of your
 * choice, has Melee range, and deals **d8+d6** physical damage using your
 * Proficiency (both the **d8** and the **d6** scale off your Proficiency).
 * While this weapon is active, you gain a +1 bonus to your Evasion."
 *
 * Half of that shipped. `legacyFeatureModifiers` has carried the +1 Evasion
 * since *Hope and Fear*'s classes arrived, and the sentence it is attached to
 * — the weapon itself — did not exist anywhere in the system. So a Brawler
 * had a primary slot with nothing in it, no attack button, no damage, and an
 * Evasion bonus for a weapon that was never drawn. The one class in the book
 * built around having no gear was the one class that could not attack.
 *
 * **The weapon is a real Item, and that is the whole design.** Every surface
 * that matters already works off `actor.items` — the gear tab's slots, the
 * attack and damage buttons, `weaponModifierTerms`, the item sheet, a macro —
 * so a *derived* or *virtual* weapon would mean teaching every one of them
 * about a second kind of thing that is a weapon except when it is not. A
 * document costs one creation and is then indistinguishable from a longsword,
 * which is what the rule says it is.
 *
 * **It is observed rather than instrumented**, which is `ledger.ts`'s argument
 * and `marked.ts`'s: a weapon becomes active or inactive by at least five
 * routes — the gear tab, the item sheet's checkbox, a drag off the compendium
 * browser, a delete, somebody's macro — and a hand-off written into each is
 * one that is wrong the first time a sixth is added. One pass over the actor,
 * fired by the ordinary embedded-document hooks, catches all of them.
 *
 * **It is found back by a flag and not by its name.** A player may rename
 * their fists, and matching on the string would be the objection this system
 * already states about reading a number off "the resource named Mark on the
 * Item named Marked". The *feature* is matched by name, because that is the
 * established idiom here — `legacyFeatureModifiers` is an exact-name registry
 * and `resourcesFor` binds a pool to a feature the same way.
 *
 * **`firstOwner` picks the client that writes.** Unlike Fear this is not the
 * GM's to author — a player owns their own sheet — and two connected owners
 * both creating a Brawler's Strike is two Brawler's Strikes.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "./config.ts";

/** The feature that says you have one. */
export const STRIKE_FEATURE = "I Am the Weapon";

/** What the feature calls it. A rename does not unmake it — see the flag. */
const STRIKE_NAME = "Brawler's Strike";

/** The flag that says this document is the feature's weapon and not a fist
    somebody built by hand and would very much like to keep. */
const STRIKE_FLAG = "brawlerStrike";

const SYSTEM_PATH = `systems/${SYSTEM_ID}`;

/** Whether an Item is the weapon this module manages. */
export const isBrawlerStrike = (item: any): boolean =>
  item?.type === "weapon" && item?.getFlag?.(SYSTEM_ID, STRIKE_FLAG) === true;

/**
 * Whether this actor's class carries the feature.
 *
 * Every class Item is asked, not only the first: multiclassing into Brawler is
 * a legal advancement and the fists arrive with it.
 */
const hasFeature = (actor: any): boolean =>
  [...(actor?.items ?? [])].some(
    (i: any) =>
      i.type === "class" &&
      [...(i.system?.classFeatures ?? [])].some((f: any) => f?.name === STRIKE_FEATURE),
  );

/**
 * The weapon, as the feature prints it.
 *
 * The trait is "of your choice", so the schema's own default stands and the
 * item sheet is where it is changed — the same answer the arcane-frame
 * wheelchair gets, one step earlier. A choice this system cannot make is one
 * it should not pretend to have made, so the description says so out loud
 * rather than leaving a plausible trait sitting there unexplained.
 *
 * `d8+d6` is one expression with two die *sizes* in it, which is what
 * `damageField`'s `extra` was added to hold. Both groups take Proficiency,
 * because the weapon path multiplies the whole expression — see
 * `rollWeaponDamage`.
 */
const strikeData = (): Record<string, unknown> => ({
  name: STRIKE_NAME,
  type: "weapon",
  img: `${SYSTEM_PATH}/assets/classes/brawler.svg`,
  system: {
    description:
      "<p>Your barehanded attacks are as strong as any blade. This weapon is equipped while " +
      "you have no other Active Weapons, and it uses <strong>a trait of your choice</strong> " +
      "&mdash; set it on this sheet.</p>",
    tier: 1,
    slot: "primary",
    equipped: false,
    range: "melee",
    burden: "oneHanded",
    damage: {
      count: 1,
      dice: "d8",
      extra: [{ count: 1, dice: "d6" }],
      bonus: 0,
      type: "physical",
    },
  },
  flags: { [SYSTEM_ID]: { [STRIKE_FLAG]: true } },
});

/**
 * Bring one actor into line with the feature.
 *
 * Idempotent by construction, and that is load-bearing rather than tidy: every
 * write below fires the same hooks that called this, so a pass that wrote
 * unconditionally would be a pass that never stopped.
 */
export async function syncBrawlerStrike(actor: any): Promise<void> {
  if (actor?.type !== "character") return;

  const strikes = [...(actor.items ?? [])].filter(isBrawlerStrike);

  /* No feature, no fists. Only ours are removed — a weapon a GM built by hand
     and called Brawler's Strike carries no flag and is somebody's document.
     `cascadeOf`'s rule, in a smaller place. */
  if (!hasFeature(actor)) {
    if (strikes.length) {
      await actor.deleteEmbeddedDocuments("Item", strikes.map((i: any) => i.id));
    }
    return;
  }

  if (!strikes.length) {
    await actor.createEmbeddedDocuments("Item", [strikeData()]);
    return;
  }

  /* A second copy is a bug that has already happened — two clients, or a
     duplicate made by hand off the first. Keep the oldest, because it is the
     one anything else may already be pointing at. */
  const [strike, ...spares] = strikes;
  if (spares.length) {
    await actor.deleteEmbeddedDocuments("Item", spares.map((i: any) => i.id));
  }

  /* "Equipped while you have no other Active Weapons." Active is this system's
     `equipped`, and *other* is the word doing the work: the strike being
     equipped must not be what deactivates it. */
  const armed = [...(actor.items ?? [])].some(
    (i: any) => i.type === "weapon" && i.system?.equipped && i.id !== strike.id,
  );
  if (!!strike.system?.equipped !== !armed) {
    await strike.update({ "system.equipped": !armed });
  }
}

/**
 * Which client writes. `game.users` is ordered the same everywhere, so the
 * first connected owner is a stable choice across clients rather than a race
 * whoever happens to answer first.
 */
const firstOwner = (actor: any): any =>
  game.users?.find?.((u: any) => u.active && actor.testUserPermission?.(u, "OWNER")) ?? null;

const mine = (actor: any): boolean =>
  !!actor?.isOwner && game.user === firstOwner(actor);

export function registerBrawler(): void {
  /* Three hooks and one sweep, and each covers something the others cannot.
     `createItem` is the class arriving and a weapon being dragged in;
     `deleteItem` is the last weapon leaving; `updateItem` is the gear tab and
     the item sheet's checkbox. */
  for (const hook of ["createItem", "deleteItem"] as const) {
    Hooks.on(hook, (item: any) => {
      const actor = item?.parent;
      if (actor?.documentName !== "Actor" || !mine(actor)) return;
      if (item.type !== "class" && item.type !== "weapon") return;
      // Our own creation fires this; the pass it triggers finds nothing to do.
      void syncBrawlerStrike(actor);
    });
  }

  Hooks.on("updateItem", (item: any, changed: any) => {
    if (item?.type !== "weapon" || changed?.system?.equipped === undefined) return;
    const actor = item.parent;
    if (actor?.documentName !== "Actor" || !mine(actor)) return;
    void syncBrawlerStrike(actor);
  });

  /* And once at load, for every character that predates this file. Nothing
     else would ever reach them: the hooks above fire on a *change*, so a
     Brawler who has been sitting finished since session one would have waited
     for the next time they touched an item to be handed the feature they have
     had all along. */
  Hooks.once("ready", () => {
    for (const actor of game.actors ?? []) {
      if ((actor as any).type === "character" && mine(actor)) void syncBrawlerStrike(actor);
    }
  });
}
