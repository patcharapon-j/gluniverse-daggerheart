/**
 * The chat plate, once it is in the log.
 *
 * Two jobs: play the arrival on a message that has just landed and wire its
 * one-shot actions. Hope, Fear, costs and counters are all claimed by a hand;
 * none of them fire merely because a client rendered the message.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { CONDITIONS, SYSTEM_ID } from "../config.ts";
import { askRoll } from "../apps/ask-roll.ts";
import { takeDamage } from "../apps/damage.ts";
import { damageRecipients, noRecipientKey } from "../apps/targets.ts";
import { getFear, setFear } from "../settings.ts";
import { payMark } from "../marked.ts";
import { fitSoon } from "../apps/fit-cards.ts";
import { loadSigils } from "../sheets/cards.ts";
import { cardWrapper, type CardAction } from "../sheets/post-card.ts";
import { refreshedValue } from "../data/resources.ts";
import { rollWeaponDamage } from "./actions.ts";
import { canReroll, rerollDie } from "./reroll.ts";
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
    bindRerolls(message, plate);

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
  /* Queued rather than solved here, and the queue is shared with every other
     card the same paint is drawing — see `fitSoon` in `apps/fit-cards.ts`.
     One card is one card; fifty of them landing together, which is what
     opening the log or reconnecting does, was fifty solves on one frame.

     The arrival still goes on after the fit and not before, because `fit`
     steps the plate's height and a card that started animating first would
     be animating one shape into another mid-flight. */
  requestAnimationFrame(() => {
    const card = host.querySelector(".card");
    fitSoon(card, () => {
      if (fresh) card?.classList.add("arrive");
    });
  });
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

/**
 * Make every die on the plate pressable, or none of them.
 *
 * The markup states which die each one *is* — `data-rr`, written by the
 * builders — and this decides whether anybody may press it, which is exactly
 * the division `data-dh-act` and `CLAIM_OF` already draw one function above.
 * A builder that asked who was looking would be a card that renders
 * differently per reader, and a plate is stored as its options precisely so
 * that it cannot.
 *
 * The class is added here rather than in the builder for the same reason: it
 * is the *affordance*, and a card in somebody else's log has nothing to
 * afford. That also means a settled card's dice carry no hover at all, which
 * is the honest answer to a roll that can no longer change — rather than a
 * pointer that lifts a die and then refuses it.
 */
function bindRerolls(message: any, plate: HTMLElement): void {
  if (!canReroll(message)) return;
  const hint = game.i18n.localize("DAGGERHEART.Chat.Reroll");

  for (const el of plate.querySelectorAll<HTMLElement>("[data-rr]")) {
    const key = el.dataset.rr;
    if (!key) continue;
    el.classList.add("rr");
    el.title = hint;

    el.addEventListener("click", async (event) => {
      event.preventDefault();
      /* The plate itself carries no click handler today, but the sheet's
         `data-pk` rows do and this markup is drawn into a peek layer as well —
         a die that also posted the card it is drawn on would be one press
         doing two things. `chitClicks` stops at the row for the same reason. */
      event.stopPropagation();
      // A second press while the first is still rolling is one die rerolled
      // twice, which is not what a double-click means.
      if (el.dataset.rolling) return;
      el.dataset.rolling = "1";
      el.classList.remove("rr");
      try {
        await rerollDie(message, key);
      } finally {
        delete el.dataset.rolling;
      }
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

/* ── running one press ────────────────────────────────────────────────────
   A press is a **chain**, always, and a chain of one is the common case. See
   `actionField` in `data/fields.ts` for why chains exist at all: "Spend a Hope
   and make an attack" is one act at the table, and two buttons for one
   sentence lets somebody take the second without paying for the first.

   So the shape of this function is: settle every currency the whole chain
   moves **first**, refuse the whole chain if any part of it cannot be paid,
   then do the things that are not currency in the order they were written.
   That is `payFor`'s rule — charge before the dice — applied to a list rather
   than to one roll, and it is the only arrangement in which "aborts whole"
   means anything.

   Currency is summed rather than applied step by step for the same reason it
   is checked up front: a chain costing a Hope and a Stress must not take the
   Hope and then discover the Stress track is full. One check, one write.
*/

interface Purse {
  hope: number;
  stress: number;
  hitPoints: number;
  armor: number;
  fear: number;
}

const EMPTY: Purse = { hope: 0, stress: 0, hitPoints: 0, armor: 0, fear: 0 };

const sum = (chain: CardAction[], kind: string): Purse =>
  chain.filter((a) => a.kind === kind).reduce<Purse>((p, a) => ({
    hope: p.hope + (a.hope ?? 0),
    stress: p.stress + (a.stress ?? 0),
    hitPoints: p.hitPoints + (a.hitPoints ?? 0),
    armor: p.armor + (a.armor ?? 0),
    fear: p.fear + (a.fear ?? 0),
  }), { ...EMPTY });

const any = (p: Purse): boolean => !!(p.hope || p.stress || p.hitPoints || p.armor || p.fear);

/**
 * Which kinds spend a claim.
 *
 * A claim exists because a Hope leaves a purse and cannot leave it twice, so
 * anything that moves a resource, a counter or a condition takes one. Rolls
 * do not: a roll leaves nothing, you will genuinely roll the same card again
 * next round, and a button that burned itself on the first press would send
 * the reader back to their own sheet for every press after it. Ownership is
 * the whole gate there.
 *
 * `roll-damage` and `roll-card-damage` are the exception among rolls and were
 * claim-once before any of this: damage completes an attack, and two clients
 * pressing it is one attack dealing damage twice.
 */
const CLAIMS = new Set([
  "pay-cost", "gain", "clear", "move-resource", "die-pool", "refresh",
  "use-item", "mark-use", "roll-damage", "roll-card-damage",
  "apply-condition", "grant-effect",
]);

async function runCardAction(
  action: CardAction,
  index: number,
  ctx: ActionContext,
): Promise<void> {
  const { actor, message, el } = ctx;
  const key = `card-action-${index}`;
  const chain: CardAction[] = [action, ...(action.steps ?? [])];

  const cost = sum(chain, "pay-cost");
  const gain = sum(chain, "gain");
  const clear = sum(chain, "clear");

  /* Fear is the GM's, and it is the one currency a player's client may not
     write — it is a world setting rather than a field on anybody's actor. A
     chain that moves it is a GM's chain entirely, because taking half of it
     and leaving the Fear would be worse than refusing. */
  if ((cost.fear || gain.fear) && !game.user?.isGM) return warn("GMOnly");
  if (cost.fear && getFear() < cost.fear) return warn("CannotPay");

  /* Everything that is not purely the GM's Fear needs the actor. A pure Fear
     press has no actor at all — the GM posted somebody else's card — which is
     why this is not an unconditional ownership gate. */
  const needsActor = chain.some((a) => a.kind !== "pay-cost" || a.hope || a.stress || a.hitPoints || a.armor);
  if (needsActor && !actor?.isOwner) return warn("NotYours");

  if (actor && any(cost) && !canPay(actor, cost)) return warn("CannotPay");

  const claims = chain.some((a) => CLAIMS.has(a.kind));
  if (claims && !(await claimOnce(message, key))) return;

  /* One write for every track the chain touches, in both directions. A chain
     that pays a Stress and clears a Hit Point is two changes to one document,
     and two updates would be two entries in the change log for one press. */
  if (actor && (any(cost) || any(gain) || any(clear))) {
    await actor.update(currencyUpdate(actor, cost, gain, clear));
  }
  if (cost.fear) await setFear(getFear() - cost.fear);
  if (gain.fear) await setFear(getFear() + gain.fear);

  for (const step of chain) {
    if (!(await runEffect(step, ctx))) return;
  }

  if (claims) finish(el);
}

/** Can this actor afford every currency the chain asks for at once? */
function canPay(actor: any, cost: Purse): boolean {
  const r = actor.system?.resources ?? {};
  const left = (track: any): number => (track?.max ?? 0) - (track?.marked ?? 0);
  return cost.hope <= (r.hope?.value ?? 0)
    && cost.stress <= left(r.stress)
    && cost.hitPoints <= left(r.hitPoints)
    && cost.armor <= left(r.armorSlots);
}

/**
 * The three verbs over one block of tracks.
 *
 * `pay` marks or spends, `gain` adds, `clear` gives back — and they are three
 * kinds rather than one signed kind because the sign was never the difference:
 * paying can be *refused* when the purse is short, gaining cannot, and
 * clearing is bounded by what is marked rather than by what is left. Every one
 * of those bounds is applied here, so a chain that clears two Hit Points on a
 * character with one marked gives back one and does not go negative.
 */
function currencyUpdate(actor: any, cost: Purse, gain: Purse, clear: Purse): Record<string, number> {
  const r = actor.system?.resources ?? {};
  const out: Record<string, number> = {};
  const track = (path: string, live: any, marked: number, cleared: number) => {
    if (!marked && !cleared) return;
    const now = Number(live?.marked ?? 0);
    const max = Number(live?.max ?? 0);
    out[`system.resources.${path}.marked`] = Math.max(0, Math.min(max, now + marked - cleared));
  };
  if (cost.hope || gain.hope || clear.hope) {
    const now = Number(r.hope?.value ?? 0);
    const max = Number(r.hope?.max ?? 0);
    // Clearing Hope is not a thing any card says, so it folds into gaining.
    out["system.resources.hope.value"] =
      Math.max(0, Math.min(max, now - cost.hope + gain.hope + clear.hope));
  }
  track("stress", r.stress, cost.stress, clear.stress);
  track("hitPoints", r.hitPoints, cost.hitPoints, clear.hitPoints);
  track("armorSlots", r.armorSlots, cost.armor, clear.armor);
  return out;
}

/**
 * The half of a step that is not currency.
 *
 * @returns false when the chain must stop — a step that could not find its
 * subject. The currency has already been written by then, deliberately: it was
 * checked before anything ran, so the only way here is a document that changed
 * under the press, and refusing to *also* roll the dice is the recoverable
 * half of that.
 */
async function runEffect(action: CardAction, ctx: ActionContext): Promise<boolean> {
  const { actor, message } = ctx;
  const item = action.itemId ? actor?.items?.get?.(action.itemId) : null;

  switch (action.kind) {
    case "pay-cost":
    case "gain":
    case "clear":
      return true;

    /* The popover rather than a raw roll, because a card asking for a
       Spellcast Roll is the start of a sentence you are still composing — the
       advantage, the flat modifier, the Experiences and the Hope they cost.
       It anchors on the button that was pressed: `prep` flips left when it
       would overflow, and a 300px sidebar is where that matters most. */
    case "roll-trait":
      if (!action.trait) return true;
      await askRoll(actor, action.trait, ctx.el, {
        label: action.label,
        dc: action.dc ?? null,
      });
      return true;

    case "roll-card-damage":
      await rollDamage({
        actor,
        label: action.damageName || (message.getFlag(SYSTEM_ID, "card")?.name ?? "Damage"),
        count: action.count ?? 1,
        die: action.die ?? "d6",
        mods: action.bonus ? [{ k: "card", v: action.bonus }] : [],
        damageType: action.damageType,
      });
      return true;

    case "roll-damage": {
      const weapon = action.weaponId ? actor?.items?.get?.(action.weaponId) : null;
      if (!weapon) {
        warn("NoWeapon");
        return false;
      }
      await rollWeaponDamage(actor, weapon);
      return true;
    }

    /* A formula that is not damage — "roll a d4; on a 4, …". Fifty rule units
       in the corpus ask for one and not one of them had a button, because the
       only two roll paths this system had were a duality roll and damage, and
       this is neither. Foundry's own roll card rather than a plate, for
       `refocus`'s reason: the three plates here each exist because the dice
       mean something a total cannot say, and this one does not. */
    case "roll-dice": {
      if (!action.formula) return true;
      const roll = await new Roll(action.formula, actor?.getRollData?.() ?? {}).evaluate();
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: action.label,
      });
      return true;
    }

    case "move-resource": {
      const live = item?.liveResources?.[action.resourceIndex ?? -1];
      const want = Number(live?.res?.value ?? 0) + Number(action.by ?? 0);
      if (!live || want < 0 || (live.max !== null && want > live.max)) {
        warn("CannotPay");
        return false;
      }
      return !!(await item.moveResource(action.resourceIndex ?? -1, action.by ?? 0));
    }

    case "die-pool": {
      const at = action.resourceIndex ?? -1;
      if (!item || at < 0) return true;
      if (action.op === "step") return !!(await item.stepDie(at));
      if (action.op === "clear") {
        const pools = [...(item.system?.dice ?? [])];
        if (!pools[at]) return true;
        pools[at] = { ...pools[at], dice: [] };
        await item.update({ "system.dice": pools });
        return true;
      }
      /* `place` and `roll` are one call: `placeDie` puts a die down and rolls
         it where the card says the tray arrives rolled, which is the
         distinction `onRefresh: "reroll"` already draws for Prayer Dice. */
      return !!(await item.placeDie(at));
    }

    /* Through `refreshedValue`, not by filling. A refresh is not always a
       refill: a card that says "place tokens" *clears* on one and the
       Vampire's Feed removes exactly one, which is what `onRefresh` records
       and what `refreshResources` already honours on a rest. Filling all three
       here would have been a second, wrong answer to a question this system
       had already settled — and wrong in the direction that hands somebody a
       full pool the card never gives back. */
    case "refresh": {
      if (!item) return true;
      const at = poolNamed(item.system?.resources ?? [], action.resource);
      if (at < 0) return true;
      const pools = [...(item.system?.resources ?? [])];
      const live = item.liveResources?.[at];
      pools[at] = { ...pools[at], value: refreshedValue(pools[at], live?.max ?? null) };
      await item.update({ "system.resources": pools });
      return true;
    }

    case "use-item":
      if (!item || Number(item.system?.quantity ?? 0) < 1) {
        warn("CannotPay");
        return false;
      }
      await item.update({ "system.quantity": Number(item.system.quantity) - 1 });
      return true;

    /* The card names the condition; a press puts it somewhere. Never
       automatic, and that is the rule rather than an omission: applying a
       condition is adjudication, and the sheet is not where adjudication
       happens. `damageRecipients` is the same rule damage already uses — a GM
       means the tokens they have selected, a player means their own character
       — so one button is correct on both sides of the screen. */
    case "apply-condition": {
      const id = action.condition;
      if (!id) return true;
      const targets = action.subject === "targets" ? damageRecipients() : [actor].filter(Boolean);
      if (!targets.length) {
        warn(noRecipientKey());
        return false;
      }
      for (const target of targets) await applyCondition(target, id);
      ui.notifications?.info(
        `${action.label} · ${targets.map((t: any) => t.name).join(", ")}`,
      );
      return true;
    }

    /* A real ActiveEffect, because a modifier with a duration is exactly what
       one is for: it shows on the sheet, a GM can lift it by hand, and it
       survives a reload. The duration is ours rather than Foundry's — see
       `ACTION_DURATIONS` — because Foundry counts seconds, rounds and turns
       and Daggerheart has none of the three. */
    case "grant-effect": {
      const effect = action.effect;
      if (!effect) return true;
      const targets = action.subject === "targets" ? damageRecipients() : [actor].filter(Boolean);
      if (!targets.length) {
        warn(noRecipientKey());
        return false;
      }
      for (const target of targets) await grantEffect(target, effect);
      return true;
    }

    case "mark-use": {
      /* The one action whose cost is not fully known until it is pressed: how
         much of it lands as Fear and how much as Stress depends on the GM's
         pool at this moment, and a label written when the card was posted
         would state a price that has since changed. `payMark` decides and the
         notification says which it was — the button cannot. */
      const price = await payMark(actor, message, action.mark ?? 1);
      if (!price) {
        warn("CannotPay");
        return false;
      }
      ui.notifications?.info(
        `${actor.name} gains ${price.mark} Mark` +
          (price.fear ? ` · the GM gains ${price.fear} Fear` : "") +
          (price.stress ? ` · ${price.stress} Stress (the pool is full)` : ""),
      );
      return true;
    }

    default:
      return true;
  }
}

/** A counter's index by the name the card prints on it. */
const poolNamed = (list: any[], name?: string): number =>
  list.findIndex((r: any) => String(r?.name ?? "").toLowerCase() === String(name ?? "").toLowerCase());

/**
 * A condition, applied by hand.
 *
 * Idempotent, because pressing twice is something people do and a second copy
 * of one condition is two rows in the token HUD saying the same word. It goes
 * on as a status rather than as a named effect for the reason
 * `adhoc-conditions.ts` gives: the status id is what the token chip, the
 * effect ring and the combat tracker all read.
 */
async function applyCondition(actor: any, id: string): Promise<void> {
  if ((actor.effects ?? []).some((e: any) => e.statuses?.has?.(id))) return;
  const condition = CONDITIONS.find((c) => c.id === id);
  if (!condition) return;
  await actor.createEmbeddedDocuments("ActiveEffect", [
    { name: condition.name, img: condition.img, statuses: [id] },
  ]);
}

/**
 * A temporary effect, with the duration written where this system can sweep it.
 *
 * The scope goes in a flag rather than in Foundry's `duration`, and that is
 * the whole design: `duration` counts seconds, rounds and turns, and "until
 * your next long rest" is none of them. `refreshResources`' four call sites —
 * both rests, `endScene()` and `endSession()` — are what expire these, which
 * means one seam rather than a timer nobody can see.
 *
 * `temporary` never expires on its own. Thirty-seven of the eighty-seven
 * temporary rules in the corpus say only that word, which the rules define as
 * a state a roll clears; putting a timer on it would be inventing a rule.
 */
async function grantEffect(
  actor: any,
  effect: { name: string; duration: string; modifiers: any[] },
): Promise<void> {
  await actor.createEmbeddedDocuments("ActiveEffect", [
    {
      name: effect.name,
      img: `systems/${SYSTEM_ID}/assets/conditions/adhoc.svg`,
      flags: { [SYSTEM_ID]: { duration: effect.duration, modifiers: effect.modifiers } },
    },
  ]);
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
