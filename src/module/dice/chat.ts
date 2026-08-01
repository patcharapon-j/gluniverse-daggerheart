/**
 * The chat plate, once it is in the log.
 *
 * Two jobs: play the arrival on a message that has just landed, and wire the
 * claim row. The buttons are deliberately not fired automatically — a roll
 * *offers* a Hope, and the player takes it. The one exception is the GM's
 * Fear, which is stated on the player's card and applied on the GM's client
 * because only a GM may write the pool.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "../config.ts";
import { getFear, setFear } from "../settings.ts";
import { fit } from "../ui/card.js";
import { loadSigils } from "../sheets/cards.ts";
import { cardWrapper } from "../sheets/post-card.ts";
import { rollWeaponDamage } from "./actions.ts";
import { play } from "./arrival.ts";

/** When each message was first announced on this client. */
const played = new Map<string, number>();

/**
 * The whole arrival, from the first tumble to the last thing that moves.
 *
 * `arrival.ts` tumbles for TUMBLE and then lands, and the longest thing the
 * landing starts is the sweep — 640ms after a 40ms delay, which puts the end
 * of the card at about 1090ms. This was 900, sized for a landing whose
 * longest part was the numeral; the sweep became the *reveal* and got longer,
 * and nothing here noticed. Writing to a message re-renders it, and a
 * re-render replaces the element mid-flight, so the one roll that writes to
 * its own message was also the one roll whose sweep stopped half way across.
 */
const ARRIVAL = 1200;

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
 * that writes to a message later: the GM's Fear lands at {@link ARRIVAL},
 * and a claim button is pressed by a hand.
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
 * The arrival goes on last, after the fit, for the same reason: `fit` steps
 * the plate's height, and a card that started animating before it was
 * measured would be animating one shape into another mid-flight.
 */
async function drawCard(message: any, host: HTMLElement, fresh: boolean): Promise<void> {
  const card = message.getFlag(SYSTEM_ID, "card");
  if (card) {
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
  }
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      fit(host);
      if (fresh) host.querySelector(".card")?.classList.add("arrive");
    }),
  );
}

function bindActions(message: any, plate: HTMLElement): void {
  for (const el of plate.querySelectorAll<HTMLElement>("[data-dh-act]")) {
    const act = el.dataset.dhAct;
    if (!act) continue;

    // The GM's claim is a <span>, not a <button>: it is not the player's to
    // press. The GM's own client picks it up below.
    if (el.tagName !== "BUTTON") continue;

    el.addEventListener("click", async (event) => {
      event.preventDefault();
      const actor = await resolveActor(message);
      await runAction(act, { message, actor, el });
    });
  }

  /* "GM gains a Fear" applies itself once, on the GM's client only.
     After the arrival, though, and that delay is load-bearing rather than
     polite. Writing the flag updates the message, updating the message
     re-renders it, and re-rendering replaces the very element the tumble is
     animating — so the dice froze, `played` already held the id, and the
     replacement got `.land` with nothing to land from. That is the whole of
     "a roll with Fear does not animate": it was the only outcome that wrote
     to its own message while its own animation was still running. */
  const fearClaim = plate.querySelector<HTMLElement>('[data-dh-act="gain-fear"]');
  if (!fearClaim) return;
  if (message.getFlag(SYSTEM_ID, "fearApplied")) {
    fearClaim.classList.add("done");
    return;
  }
  if (!game.user?.isGM) return;
  setTimeout(
    () => {
      void (async () => {
        if (message.getFlag(SYSTEM_ID, "fearApplied")) return;
        await setFear(getFear() + 1);
        await message.setFlag(SYSTEM_ID, "fearApplied", true);
      })();
    },
    // Past the tumble and its landing, so the card is finished being a card
    // before it is a database write.
    ARRIVAL,
  );
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
        el.classList.add("done");
      }
      return;
    }
    case "clear-stress": {
      if (!actor?.isOwner) return warn("NotYours");
      if (await claimOnce(message, "stress")) {
        await actor.clearTrack("stress", 1);
        el.classList.add("done");
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
      el.classList.add("done");
      return;
    }
    case "apply-damage": {
      const plate = message.getFlag(SYSTEM_ID, "plate");
      await applyDamageToTargets(plate?.total ?? 0);
      el.classList.add("done");
      return;
    }
    default:
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
 * Damage lands on whoever is targeted, and the card said nothing about who
 * that is on purpose — how many Hit Points a number becomes depends on
 * thresholds and armour the roller does not own.
 */
async function applyDamageToTargets(amount: number): Promise<void> {
  const targets = [...(game.user?.targets ?? [])];
  if (!targets.length) return warn("NoTarget");

  for (const token of targets) {
    const actor = token.actor;
    if (!actor?.isOwner) continue;
    const result = await actor.applyDamage(amount);
    ui.notifications?.info(
      game.i18n.format("DAGGERHEART.Info.DamageApplied", {
        name: actor.name,
        severity: game.i18n.localize(`DAGGERHEART.Severity.${result.severity}`),
        marked: result.marked,
      }),
    );
  }
}

const warn = (key: string): void => {
  ui.notifications?.warn(game.i18n.localize(`DAGGERHEART.Warning.${key}`));
};
