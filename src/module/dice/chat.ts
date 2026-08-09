/**
 * The chat plate, once it is in the log.
 *
 * Two jobs: play the arrival on a message that has just landed and wire its
 * one-shot actions. Hope, Fear, costs and counters are all claimed by a hand;
 * none of them fire merely because a client rendered the message.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "../config.ts";
import { askRoll } from "../apps/ask-roll.ts";
import { takeDamage } from "../apps/damage.ts";
import { damageRecipients, noRecipientKey } from "../apps/targets.ts";
import { getFear, setFear } from "../settings.ts";
import { payMark } from "../marked.ts";
import { fit } from "../ui/card.js";
import { loadSigils } from "../sheets/cards.ts";
import { cardWrapper, type CardAction } from "../sheets/post-card.ts";
import { rollWeaponDamage } from "./actions.ts";
import { rollDamage } from "./rolls.ts";
import { play } from "./arrival.ts";

/** When each message was first announced on this client. */
const played = new Map<string, number>();

/** How old a message may be and still count as having just landed. */
const FRESH = 5000;

/**
 * How long after the first drawing of a message a second drawing of the
 * *same* message is still part of the same arrival.
 *
 * Foundry draws every message twice — once into the chat log and once as
 * the notification that floats over the board — from two separate calls,
 * about three milliseconds apart. They are two presentations of one event,
 * not an event and a redraw, and both of them should announce it.
 *
 * This was the whole of "the roll does not animate": the first drawing got
 * the arrival and the second was told the message had already been seen, so
 * whichever of the two you happened to be looking at was a coin flip. With
 * the outcome now veiled until landing, the losing copy would not merely
 * skip the tumble — it would flash grey and snap to the answer.
 *
 * Wide enough for a slow frame between the two, and far short of anything
 * that writes to a message later — which now means only the claim buttons,
 * and those are pressed by a hand.
 */
const TWIN = 250;

/**
 * Whether this drawing of a message is an *arrival* rather than a redraw.
 *
 * A message is re-rendered for all sorts of reasons that have nothing to do
 * with it being new — a flag written to it, the sidebar popped out, a
 * reconnect replaying the last fifty. Those must land outright: replaying a
 * tumble on a result the reader has already read would be the sheet hiding
 * something they have seen.
 */
const arriving = (message: any): boolean => {
  const now = Date.now();
  if (now - (message.timestamp ?? 0) >= FRESH) return false;
  const first = played.get(message.id);
  if (first === undefined) {
    // Cheap sweep, on the only path that grows the map.
    for (const [id, t] of played) if (now - t > FRESH) played.delete(id);
    played.set(message.id, now);
    return true;
  }
  return now - first < TWIN;
};

export function registerChat(): void {
  Hooks.on("renderChatMessageHTML", (message: any, html: HTMLElement) => {
    const host = html.querySelector<HTMLElement>(".dh-card");
    if (!host) return;
    void drawCard(message, host, arriving(message));
  });

  Hooks.on("renderChatMessageHTML", (message: any, html: HTMLElement) => {
    const plate = html.querySelector<HTMLElement>(".dh-plate > .pl");
    if (!plate) return;

    bindActions(message, plate);

    // Only the arrival, not every re-render. A message that was already in
    // the log when the client connected has nothing to announce — and it
    // must land outright rather than roll, or it would spend a second
    // hiding a result the reader has already been told.
    if (arriving(message)) play(plate);
    else plate.classList.add("land");
  });
}

/**
 * Draw a posted card from its options rather than from its stored HTML.
 *
 * The stored HTML has had every `<svg>` removed by Foundry's own sanitiser
 * on the way into the database — see `sheets/post-card.ts`. So the two
 * corner sigils, the recall bolt and the art fallback's technical plate are
 * all missing from it, and no amount of styling brings them back. The
 * options survived in a flag; the sigils are local files. Redraw.
 *
 * Then fit, in the same pass: `fit` steps the type scale down until the body
 * stops overflowing, which means measuring a laid-out box. Two frames,
 * because the first is before the chat log has given the message its width
 * and the card's container query has nothing to resolve against yet.
 *
 * And after the fonts, which the sheet gets for free and this does not. A
 * sheet is opened by hand, long after the client finished loading; a chat
 * card is very often drawn during it, and `fit` measured against a fallback
 * face is measuring the wrong text. It runs exactly once — nothing re-fits a
 * message — so a card that measured early stays wrong for the session, which
 * is the difference the peek layer never shows.
 *
 * The redraw is guarded for the same reason. `fit` is what makes a long card
 * readable and the sigils are decoration; a fetch that fails should not be
 * able to take the layout with it, and `void drawCard(…)` at the call site
 * would swallow the rejection without a word.
 *
 * The arrival goes on last, after the fit: `fit` steps the plate's height,
 * and a card that started animating before it was measured would be
 * animating one shape into another mid-flight.
 */
async function drawCard(message: any, host: HTMLElement, fresh: boolean): Promise<void> {
  const card = message.getFlag(SYSTEM_ID, "card");
  if (card) {
    try {
      const sigils = await loadSigils();
      const drawn = cardWrapper({
        ...card,
        sig: sigils[card.sigKey] ?? "",
        sig2: card.sig2Key ? (sigils[card.sig2Key] ?? "") : undefined,
        fbsig: card.fbsigKey ? (sigils[card.fbsigKey] ?? "") : undefined,
      });
      const next = document.createRange().createContextualFragment(drawn)
        .firstElementChild as HTMLElement | null;
      if (next) {
        // The wrapper is the element we are standing in, so take the redrawn
        // one's children rather than nesting a second wrapper inside the first
        // — and take its class and `--art` too. Those are the wrapper's own two
        // facts and they do not survive storage either: Foundry's sanitiser
        // drops a `style` carrying a `url()`, so a card with real artwork
        // arrived wearing whatever `--art` it inherited, which is the sample
        // photograph in `tokens.css`. Every framed card, one stock image.
        host.className = next.className;
        host.style.cssText = next.style.cssText;
        host.replaceChildren(...next.childNodes);
      }
    } catch (err) {
      console.error(`${SYSTEM_ID} | could not redraw a posted card`, err);
    }
  }
  bindActions(message, host);
  await document.fonts?.ready?.catch(() => {});
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      fit(host);
      if (fresh) host.querySelector(".card")?.classList.add("arrive");
    }),
  );
}

/**
 * Which claim flag each action spends.
 *
 * The flag is the truth and the class is only its picture. A claim taken on
 * one client has to look taken on every other one, and it has to still look
 * taken after a reload — the log is a record of what changed hands, and a row
 * of live buttons three hours later is an invitation to collect the same Hope
 * again. `runAction` writes these; `bindActions` reads them back.
 */
const CLAIM_OF: Record<string, string> = {
  "gain-hope": "hope",
  "clear-stress": "stress",
  "roll-damage": "damage",
  "apply-damage": "applied",
  "gain-fear": "fear",
};

function bindActions(message: any, plate: HTMLElement): void {
  const taken = message.getFlag(SYSTEM_ID, "claimed") ?? {};

  for (const el of plate.querySelectorAll<HTMLElement>("[data-dh-act]")) {
    const act = el.dataset.dhAct;
    if (!act) continue;

    if (el.tagName !== "BUTTON") continue;

    const key = act.startsWith("card-action:") ? act.replace(":", "-") : CLAIM_OF[act];
    if (key && taken[key]) {
      el.classList.add("done");
      (el as HTMLButtonElement).disabled = true;
      continue;
    }

    el.addEventListener("click", async (event) => {
      event.preventDefault();
      const actor = await resolveActor(message);
      await runAction(act, { message, actor, el });
    });
  }
}

async function resolveActor(message: any): Promise<any> {
  const uuid = message.getFlag(SYSTEM_ID, "actorUuid");
  if (uuid) {
    const doc = await fromUuid(uuid);
    if (doc) return doc.actor ?? doc;
  }
  return ChatMessage.getSpeakerActor?.(message.speaker) ?? null;
}

interface ActionContext {
  message: any;
  actor: any;
  el: HTMLElement;
}

async function runAction(act: string, ctx: ActionContext): Promise<void> {
  const { actor, el, message } = ctx;

  switch (act) {
    case "gain-hope": {
      if (!actor?.isOwner) return warn("NotYours");
      if (await claimOnce(message, "hope")) {
        await actor.gainHope(1);
        finish(el);
      }
      return;
    }
    case "clear-stress": {
      if (!actor?.isOwner) return warn("NotYours");
      if (await claimOnce(message, "stress")) {
        await actor.clearTrack("stress", 1);
        finish(el);
      }
      return;
    }
    case "gain-fear": {
      if (!game.user?.isGM) return warn("GMOnly");
      if (await claimOnce(message, "fear")) {
        await setFear(getFear() + 1);
        finish(el);
      }
      return;
    }
    /* The attack card offers this, and until now nothing answered it — the
       button existed, the action string was emitted, and the switch fell
       through to `default`.

       The weapon is read back off the attack message rather than off the
       actor's current loadout: by the time anyone presses this the player may
       have swapped weapons, and the damage owed is the damage of the thing
       that hit. A critical carries across for the same reason — it is a fact
       about the attack, not about the roll you are making now. */
    case "roll-damage": {
      if (!actor?.isOwner) return warn("NotYours");
      const weaponId = message.getFlag(SYSTEM_ID, "weaponId");
      const weapon = weaponId ? actor.items.get(weaponId) : null;
      if (!weapon) return warn("NoWeapon");
      if (!(await claimOnce(message, "damage"))) return;
      const critical = message.getFlag(SYSTEM_ID, "plate")?.out === "crit";
      await rollWeaponDamage(actor, weapon, { critical });
      finish(el);
      return;
    }
    /* The one claim with no owner: damage lands on whoever is *targeted*,
       which is a choice made after the card was posted and by someone who
       may not be the roller.

       It used to mark itself done unconditionally, including on the press
       that found no target and warned about it — so the commonest mistake
       with this button (press first, target second) burned the button and
       left the damage unapplied with no way back. Now nothing is claimed
       unless something was actually hit. */
    case "apply-damage": {
      const plate = message.getFlag(SYSTEM_ID, "plate");
      if (!(await applyDamageToTargets(plate?.total ?? 0, plate?.dtype))) return;
      if (await claimOnce(message, "applied")) finish(el);
      return;
    }
    default:
      if (act.startsWith("card-action:")) {
        const index = Number(act.split(":")[1]);
        const actions: CardAction[] = message.getFlag(SYSTEM_ID, "cardActions") ?? [];
        const action = actions[index];
        if (action) await runCardAction(action, index, ctx);
      }
      return;
  }
}

const finish = (el: HTMLElement): void => {
  el.classList.add("done");
  if (el instanceof HTMLButtonElement) el.disabled = true;
};

async function runCardAction(
  action: CardAction,
  index: number,
  ctx: ActionContext,
): Promise<void> {
  const { actor, message, el } = ctx;
  const key = `card-action-${index}`;

  if (action.kind === "pay-cost") {
    if (action.fear) {
      if (!game.user?.isGM) return warn("GMOnly");
      if (getFear() < action.fear) return warn("CannotPay");
      if (!(await claimOnce(message, key))) return;
      await setFear(getFear() - action.fear);
      finish(el);
      return;
    }
    if (!actor?.isOwner) return warn("NotYours");
    const hope = actor.system?.resources?.hope;
    const stress = actor.system?.resources?.stress;
    const armor = actor.system?.resources?.armorSlots;
    if ((action.hope ?? 0) > (hope?.value ?? 0)) return warn("CannotPay");
    if ((action.stress ?? 0) > (stress?.max ?? 0) - (stress?.marked ?? 0)) return warn("CannotPay");
    if ((action.armor ?? 0) > (armor?.max ?? 0) - (armor?.marked ?? 0)) return warn("CannotPay");
    if (!(await claimOnce(message, key))) return;
    const update: Record<string, number> = {};
    if (action.hope) update["system.resources.hope.value"] = hope.value - action.hope;
    if (action.stress) update["system.resources.stress.marked"] = stress.marked + action.stress;
    if (action.armor) update["system.resources.armorSlots.marked"] = armor.marked + action.armor;
    await actor.update(update);
    finish(el);
    return;
  }

  if (!actor?.isOwner) return warn("NotYours");

  /* The two presses the card itself answers, and they are above the item
     lookup because neither needs one: both were resolved against the card at
     the moment it was posted and carry their own answer in the flag.

     `roll-trait` takes **no claim at all**, which is the one departure from
     everything else in this switch. A claim exists because a Hope leaves a
     purse and cannot leave it twice; a roll leaves nothing. You will roll this
     card again next round, and a button that burned itself on the first press
     would send you back to the sheet for every press after it. Ownership is
     the whole gate.

     It is also its own press, independent of the price above it. Rolling and
     paying are two decisions the card states separately — several cards let
     you pay *after* seeing whether you needed to — so folding them into one
     button would be this file deciding the order for the table.

     The popover opens beside the button that was pressed, which is what the
     seam takes an anchor for: `prep` flips left when it would overflow, and a
     300px sidebar is where that matters most. `askRoll` resolves null on every
     way out, and every way out is free — so a dismissed popover leaves the row
     exactly as it found it. */
  if (action.kind === "roll-trait") {
    // Narrowing rather than a check: a call with no trait it could resolve
    // emits no button, so the only way here is a hand-edited flag.
    if (!action.trait) return;
    await askRoll(actor, action.trait, el, {
      label: action.label,
      dc: action.dc ?? null,
    });
    return;
  }

  /* Card damage **is** claimed, and the distinction from the roll above is
     what the two things are. A duality roll is a question and you may ask it
     as often as you like; damage completes an attack, and the plate's own
     `roll-damage` has been claim-once since it was written for exactly that
     reason. Two clients pressing this is one attack dealing damage twice.

     No critical is read. See the block in `sheets/post-card.ts` — a posted
     card has no honest link to the roll that critted. */
  if (action.kind === "roll-card-damage") {
    if (!(await claimOnce(message, key))) return;
    await rollDamage({
      actor,
      /* The plate is named after the *object*, exactly as a weapon's is — the
         button says the dice because it sits next to another button that also
         rolls damage, and a plate has no such neighbour to be told apart from. */
      label: action.damageName || (message.getFlag(SYSTEM_ID, "card")?.name ?? "Damage"),
      count: action.count ?? 1,
      die: action.die ?? "d6",
      mods: action.bonus ? [{ k: "card", v: action.bonus }] : [],
      damageType: action.damageType,
    });
    finish(el);
    return;
  }

  const item = action.itemId ? actor.items?.get?.(action.itemId) : null;
  if (action.kind === "move-resource") {
    const live = item?.liveResources?.[action.resourceIndex ?? -1];
    const want = Number(live?.res?.value ?? 0) + Number(action.by ?? 0);
    if (!live || want < 0 || (live.max !== null && want > live.max)) return warn("CannotPay");
    if (!(await claimOnce(message, key))) return;
    if (!(await item.moveResource(action.resourceIndex ?? -1, action.by ?? 0))) return;
    finish(el);
    return;
  } else if (action.kind === "use-item") {
    if (!item || Number(item.system?.quantity ?? 0) < 1) return warn("CannotPay");
    if (!(await claimOnce(message, key))) return;
    await item.update({ "system.quantity": Number(item.system.quantity) - 1 });
    finish(el);
    return;
  } else if (action.kind === "mark-use") {
    /* The one action whose cost is not fully known until it is pressed: how
       much of it lands as Fear and how much as Stress depends on the GM's pool
       at this moment, and a label written when the card was posted would be
       stating a price that has since changed. So `payMark` decides and the
       notification says which it was — the button cannot.

       Claimed *after* the payment rather than before, unlike the rest of this
       switch, because `payMark` is the thing that knows whether the Stress can
       be afforded. A claim spent on a refusal is a card that can never be
       used. */
    const price = await payMark(actor, message, action.mark ?? 1);
    if (!price) return warn("CannotPay");
    if (!(await claimOnce(message, key))) return;
    ui.notifications?.info(
      `${actor.name} gains ${price.mark} Mark` +
        (price.fear ? ` · the GM gains ${price.fear} Fear` : "") +
        (price.stress ? ` · ${price.stress} Stress (the pool is full)` : ""),
    );
    finish(el);
    return;
  } else if (action.kind === "roll-damage") {
    const weapon = action.weaponId ? actor.items?.get?.(action.weaponId) : null;
    if (!weapon) return warn("NoWeapon");
    if (!(await claimOnce(message, key))) return;
    await rollWeaponDamage(actor, weapon);
    finish(el);
    return;
  }
}

/**
 * A claim is taken once. The flag lives on the message rather than in memory
 * so a second click from a second client — or from the same client after a
 * reload — cannot hand out the same Hope twice.
 */
async function claimOnce(message: any, key: string): Promise<boolean> {
  const taken = message.getFlag(SYSTEM_ID, `claimed.${key}`);
  if (taken) {
    warn("AlreadyClaimed");
    return false;
  }
  await message.setFlag(SYSTEM_ID, `claimed.${key}`, true);
  return true;
}

/**
 * Damage lands on whoever is on the receiving end, and the card said nothing
 * about who that is on purpose — how many Hit Points a number becomes depends
 * on thresholds and armour the roller does not own.
 *
 * *Who* that is comes from `damageRecipients`, and it is not the target
 * reticle any more: a GM means the tokens they have selected, a player means
 * their own character. The reticle is what both of them point at the person
 * they are about to *attack*, so reading damage off it hit the wrong side of
 * the exchange for everybody. See `apps/targets.ts`.
 *
 * Each is asked separately, because the answer is theirs. What to spend is the
 * real decision in taking damage and it is made after seeing the number; two
 * targets of one blast have different armour, different thresholds and
 * different opinions about whether this is the hit worth paying for.
 * Sequentially, therefore, and not in parallel — three dialogs stacked on top
 * of each other would be three answers given in an order nobody chose.
 *
 * @returns whether anything was actually damaged. Nobody to hit, nothing
 * owned and every dialog dismissed all mean the press did not land, and the
 * caller uses that to decide whether to spend the claim — so backing out of
 * the dialog leaves the button live rather than burning it.
 */
async function applyDamageToTargets(amount: number, damageType?: string): Promise<boolean> {
  const recipients = damageRecipients();
  if (!recipients.length) {
    warn(noRecipientKey());
    return false;
  }

  let owned = 0;
  let hit = 0;
  for (const actor of recipients) {
    if (!actor?.isOwner) continue;
    owned++;
    const result = await takeDamage(actor, amount, { damageType });
    if (!result) continue;
    hit++;
    ui.notifications?.info(
      game.i18n.format("DAGGERHEART.Info.DamageApplied", {
        name: actor.name,
        severity: game.i18n.localize(`DAGGERHEART.Severity.${result.severity}`),
        marked: result.marked,
      }),
    );
  }
  if (!owned) warn("NotYours");
  return hit > 0;
}

const warn = (key: string): void => {
  ui.notifications?.warn(game.i18n.localize(`DAGGERHEART.Warning.${key}`));
};
