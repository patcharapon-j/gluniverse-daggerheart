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
import { watchChatCard } from "../apps/chat-card-fit.ts";
import { frameArt } from "../apps/fit-cards.ts";
import { loadSigils } from "../sheets/cards.ts";
import { useOrnaments } from "../sheets/card-style.ts";
import { bindFaceFx, stillCards } from "../ui/face-fx.js";
import { cardWrapper, type CardAction } from "../sheets/post-card.ts";
import { refreshedValue } from "../data/resources.ts";
import { rollAdversaryDamage, rollWeaponDamage } from "./actions.ts";
import { foeCrit } from "./plate.ts";
import { canReroll, rerollDie } from "./reroll.ts";
import { applyFearClaim, rollDamage } from "./rolls.ts";
import { hold, play } from "./arrival.ts";
import { waitFor3dDice } from "./dsn.ts";

/**
 * Whether this client has asked for stillness.
 *
 * Read per render rather than cached: the preference can change mid-session
 * from the operating system, and a cached answer would keep animating for a
 * reader who just turned it off — or keep a card frozen for one who turned
 * it back on. `matchMedia` is optional only so the node harnesses, which
 * assemble the handful of globals these functions touch, do not have to
 * carry a media-query implementation to render a card.
 */
const still = (): boolean =>
  globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

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
  Hooks.on("createChatMessage", (message: any) => {
    void applyFear(message);
  });

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

    const dice = waitFor3dDice(message.id);

    /* A reader who asked for stillness is handed the settled card. The veil
       block in `plate.css` has always described this as what happens to
       them, and nothing did it — they got the full tumble, the sweep and a
       card that spent four hundred milliseconds in graphite. The result was
       never at stake: it is in the markup before any of this runs. */
    if (still()) {
      plate.classList.add("land");
      return;
    }

    // A fresh roll gets the full arrival. A reroll only holds its changed
    // result until the new 3D die lands, since replaying the whole card would
    // announce the same message twice. Other re-renders land immediately.
    if (arriving(message)) play(plate, dice);
    else if (dice) hold(plate, dice);
    else plate.classList.add("land");
  });
}

/**
 * A Fear outcome hands the GM a Fear. That is not a choice, so it is not a
 * press.
 *
 * It runs on creation rather than on render because every client renders a
 * message, several times, and exactly one client creates it. And on the
 * active GM alone, because only a GM may write a world setting and two of
 * them would otherwise both write it — the guard `syncVulnerable` already
 * uses for the same reason.
 *
 * The claim is written before the pool and read back by `bindActions`, so
 * the row draws spent from its first frame on every client. The card states
 * what has already happened rather than offering it, which is what it had
 * always said it did.
 */
async function applyFear(message: any): Promise<void> {
  if (game.users?.activeGM !== game.user) return;
  if (message.getFlag(SYSTEM_ID, "kind") !== "duality") return;

  /* A reaction has no Hope and no Fear, and a critical is its own rung with
     its own two claims. `claims` in `plate.ts` draws exactly this line. */
  const plate = message.getFlag(SYSTEM_ID, "plate");
  if (plate?.out !== "fear" || plate.rxn) return;

  if (message.getFlag(SYSTEM_ID, "claimed.fear")) return;
  await message.setFlag(SYSTEM_ID, "claimed.fear", true);
  await applyFearClaim(1);
}

/* ── the pointer, bound once ───────────────────────────────────────────
   `bindFaceFx` delegates the tilt from a scope root, and `face-fx.js` says
   why: a re-render replaces a message outright, so a listener bound to
   anything inside one goes with it, and the replacement arrives with no
   `data-touched` and snaps from a stale angle. The right scope is therefore
   not the card and not the message — it is the container Foundry keeps, and
   there are two of them, the log and the notification stack that floats over
   the board. Fifty messages must not mean fifty bindings, and a WeakSet is
   all the bookkeeping that needs: the teardown is discarded because the roots
   outlive the session, and a root that somehow does not is collected with its
   entry. */
const tilted = new WeakSet<Node>();

function bindTilt(host: HTMLElement): void {
  const root = host.closest("#chat-notifications, #chat-log, .chat-log, #chat") ??
    host.ownerDocument.body;
  if (tilted.has(root)) return;
  tilted.add(root);
  bindFaceFx(root);
}

/**
 * The card's arrival: it rises a little and settles, once.
 *
 * `card.css` writes this for the old `.card` as `@keyframes card-in`, and the
 * note above it is the argument — a card is a static object being handed to
 * you, so one motion and nothing inside it moving on its own. The same
 * distance, curve and duration, driven from here because `.dh-face` has no
 * rule of its own yet; the class goes on as well, so a stylesheet that grows
 * one takes over without this changing.
 *
 * Not ported with it: `.card.arrive .plate::after`, the sheen across the
 * artwork. It names the old builder's `.plate`, which no face has at any size
 * — the ported card's is `.dh-face-plate` — and the new card already has its
 * own light in `.dh-glare` and `.dh-sweep`, so a second band crossing the
 * painting would be two greetings. That holds now that a posted card is the
 * full face and does have a plate of its own to put one on.
 */
const RISE_MS = 340;

function rise(face: HTMLElement): void {
  face.classList.add("arrive");
  /* `stillCards`, not `still` above and not `matchMedia` again. This is the
     card's own motion and it answers to the Card motion setting along with
     the tilt, the sweep and the peek; `still()` is the duality plate's and
     reads the OS alone, which is what its own ratchet asserts. */
  if (stillCards()) return;
  face.animate(
    [{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "none" }],
    { duration: RISE_MS, easing: "cubic-bezier(.2,.8,.28,1)", fill: "both" },
  );
}

/**
 * Draw a posted card from its options rather than from its stored HTML.
 *
 * The stored HTML has had every `<svg>` removed by Foundry's own sanitiser
 * on the way into the database — see `sheets/post-card.ts`. So the sigils on
 * the pennant and the seam, the recall bolt, the charge lights and the whole
 * no-art field are missing from it, and no amount of styling brings them
 * back. The options survived in a flag; the sigils are local files. Redraw.
 *
 * Two more things the flag carries have to be *re-resolved* rather than
 * merely read, because each of them is a rule in the poster's document and a
 * document is not a thing a message carries:
 *
 *   `motif` back through `useOrnaments`, which puts the corner and seam masks
 *   in this reader's document and hands the same name back. Idempotent on a
 *   motif, so the stored name is both the key and the answer.
 *
 *   `focus` into `frameArt`, which is the *measured* crop — the painting's
 *   natural size against the frame's own box — rather than the cover crop
 *   `useArtFocus` can state without measuring. A chat card is one of the two
 *   surfaces that has laid the frame out, so it is one of the two that can
 *   take the better answer.
 *
 * Then fit, in the same pass: the ladder steps the painting's height and then
 * the type scale down until the body stops overflowing, which means measuring
 * a laid-out box. And after the fonts, which the sheet gets for free and this
 * does not — a sheet is opened by hand, long after the client finished
 * loading; a chat card is very often drawn during it, and a fit measured
 * against a fallback face is measuring the wrong text. It runs exactly once,
 * because nothing re-fits a message.
 *
 * The redraw is guarded for the same reason it always was. The fit and the
 * crop are what make the card readable and the sigils are decoration; a fetch
 * that fails should not be able to take the layout with it, and
 * `void drawCard(…)` at the call site would swallow the rejection in silence.
 *
 * The arrival goes on last, after the measurement, because a card that
 * started animating before it was measured would be animating one shape into
 * another mid-flight.
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
        // The name is the key; the call is for its side effect on this
        // reader's document. A card posted without one simply has no motif.
        motif: card.motif ? useOrnaments(card.motif) : undefined,
      });
      const next = document.createRange().createContextualFragment(drawn)
        .firstElementChild as HTMLElement | null;
      if (next) {
        // The wrapper is the element we are standing in, so take the redrawn
        // one's children rather than nesting a second wrapper inside the
        // first, and its class with them.
        host.className = next.className;
        host.style.cssText = next.style.cssText;
        host.replaceChildren(...next.childNodes);
      }
    } catch (err) {
      console.error(`${SYSTEM_ID} | could not redraw a posted card`, err);
    }
  }
  bindActions(message, host);
  bindTilt(host);
  await document.fonts?.ready?.catch(() => {});
  // Observe width because the hook can run while chat is hidden. The shared
  // fitting queue still spreads a backlog across frames, and the arrival waits
  // until the card has actually been measured. `frameArt`'s observer is handed
  // over with it, so the one answer to "has this card been detached" releases
  // both — see `apps/chat-card-fit.ts`.
  requestAnimationFrame(() => {
    const face = host.querySelector<HTMLElement>(".dh-face");
    if (!face) return;
    const unframe = frameArt(face, card?.focus);
    watchChatCard(face, () => { if (fresh) rise(face); }, unframe);
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
  /* The same claim as the player's, because the key names what changed
     hands — this attack's damage has been rolled — and not which button
     did it. Two GMs pressing it is one attack dealing damage twice. */
  "roll-foe-damage": "damage",
  "apply-damage": "applied",
  "gain-fear": "fear",
};

/**
 * Relabel a row in place, leaving its diamond where it is.
 *
 * The `<i>` is the marker every `.pl-b` carries and `.done` restyles; only
 * the words after it change, so the text node is replaced rather than the
 * element's contents.
 */
const state = (el: HTMLElement, text: string): void => {
  for (const node of [...el.childNodes]) if (node.nodeType === 3) node.remove();
  el.append(text);
};

/** The same row, saying the same thing, with nothing to press. */
const statement = (el: HTMLElement): HTMLSpanElement => {
  const span = document.createElement("span");
  span.className = `${el.className} theirs`;
  span.dataset.dhAct = el.dataset.dhAct ?? "";
  span.innerHTML = el.innerHTML;
  return span;
};

function bindActions(message: any, plate: HTMLElement): void {
  const taken = message.getFlag(SYSTEM_ID, "claimed") ?? {};

  for (const el of plate.querySelectorAll<HTMLElement>("[data-dh-act]")) {
    const act = el.dataset.dhAct;
    if (!act) continue;

    /* The Fear claim is a statement to anyone who cannot write the pool, and
       `setFear` silently refuses a non-GM. The builder cannot make this call
       — a plate is stored as one string for every reader — so it emits the
       button and the downgrade happens here, among the other per-reader
       decisions. */
    if (act === "gain-fear" && !game.user?.isGM) {
      el.replaceWith(statement(el));
      continue;
    }

    /* The GM's damage roll is not offered to a player at all. The Fear claim
       above survives as a statement because it is *about* them; this is not,
       and there is nothing to read in a button nobody at this screen may
       press. The row goes with it when it was the only thing in it. */
    if (act === "roll-foe-damage" && !game.user?.isGM) {
      const row = el.closest<HTMLElement>(".pl-act");
      el.remove();
      if (row && !row.children.length) row.remove();
      continue;
    }

    if (el.tagName !== "BUTTON") continue;

    const key = act.startsWith("card-action:") ? act.replace(":", "-") : CLAIM_OF[act];
    if (key && taken[key]) {
      el.classList.add("done");
      (el as HTMLButtonElement).disabled = true;
      /* A spent Hope says "+1 Hope" and that is the whole story. Damage is
         the one claim whose outcome nobody can reconstruct from the card, so
         it is the one that reports back. */
      if (act === "apply-damage") {
        const applied: Applied[] = message.getFlag(SYSTEM_ID, "applied") ?? [];
        if (applied.length) state(el, appliedLabel(applied));
      }
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
    /* The GM's half of the same offer. The weapon lookup above has no
       counterpart here — an adversary's damage is one expression on its own
       stat block — and the critical carries across off the d20 the way the
       player's carries off the duality pair. */
    case "roll-foe-damage": {
      if (!game.user?.isGM) return warn("AdversaryGMOnly");
      if (!actor) return;
      if (!(await claimOnce(message, "damage"))) return;
      const plate = message.getFlag(SYSTEM_ID, "plate");
      await rollAdversaryDamage(actor, { critical: plate ? foeCrit(plate) : false });
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
      const applied = await applyDamageToTargets(plate?.total ?? 0, plate?.dtype);
      if (!applied.length) return;
      if (!(await claimOnce(message, "applied"))) return;
      /* After the claim, so a second client that lost the race leaves the
         first one's record alone rather than overwriting it with its own
         empty one. */
      await message.setFlag(SYSTEM_ID, "applied", applied);
      finish(el);
      state(el, appliedLabel(applied));
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
  /* Every `mark-use` on a message is one toll with up to two payers — the GM,
     or the holder under a live `-Touched` card — so they share one claim and
     pressing either spends both. A message posted before there could be two
     claimed its toll under the per-index key, and that claim still counts. */
  const key = action.kind === "mark-use" ? "card-action-mark" : `card-action-${index}`;
  if (action.kind === "mark-use" && message?.getFlag?.(SYSTEM_ID, `claimed.card-action-${index}`)) {
    return warn("AlreadyClaimed");
  }
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
      const price = await payMark(actor, message, action.mark ?? 1, action.payer);
      if (!price) {
        warn("CannotPay");
        return false;
      }
      const instead = " instead of the GM's Fear";
      ui.notifications?.info(
        `${actor.name} gains ${price.mark} Mark` +
          (price.fear ? ` · the GM gains ${price.fear} Fear` : "") +
          (price.stress ? ` · ${price.stress} Stress${action.payer ? instead : " (the pool is full)"}` : "") +
          (price.hitPoints ? ` · ${price.hitPoints} Hit Point${price.hitPoints === 1 ? "" : "s"}${instead}` : ""),
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
async function applyDamageToTargets(amount: number, damageType?: string): Promise<Applied[]> {
  const recipients = damageRecipients();
  if (!recipients.length) {
    warn(noRecipientKey());
    return [];
  }

  let owned = 0;
  const applied: Applied[] = [];
  for (const actor of recipients) {
    if (!actor?.isOwner) continue;
    owned++;
    const result = await takeDamage(actor, amount, { damageType });
    if (!result) continue;
    applied.push({ n: actor.name, sev: result.severity, hp: result.marked });
    ui.notifications?.info(
      game.i18n.format("DAGGERHEART.Info.DamageApplied", {
        name: actor.name,
        severity: game.i18n.localize(`DAGGERHEART.Severity.${result.severity}`),
        marked: result.marked,
      }),
    );
  }
  if (!owned) warn("NotYours");
  return applied;
}

/** One line of what actually happened, kept so the card can state it. */
interface Applied {
  n: string;
  sev: string;
  hp: number;
}

/**
 * What the spent row says once the damage has landed.
 *
 * The toast above says this already and then it is gone, which is the wrong
 * lifetime for it: the question "what did that do" is asked minutes later,
 * by someone scrolling back. So the record goes on the message and the row
 * becomes the answer — the same slot, in its second state.
 *
 * Written here rather than by the builder for the reason the builder cannot:
 * the stored content is a pure rendering of the plate, and this is not a fact
 * about the roll. `bindActions` already owns everything the card knows only
 * at render time.
 */
const appliedLabel = (list: Applied[]): string => {
  const hp = list.reduce((n, a) => n + (a.hp ?? 0), 0);
  const one = list.length === 1 ? list[0] : undefined;
  return one
    ? game.i18n.format("DAGGERHEART.Plate.AppliedOne", {
        name: one.n,
        severity: game.i18n.localize(`DAGGERHEART.Severity.${one.sev}`),
        hp: one.hp ?? 0,
      })
    : game.i18n.format("DAGGERHEART.Plate.AppliedMany", { count: list.length, hp });
};

const warn = (key: string): void => {
  ui.notifications?.warn(game.i18n.localize(`DAGGERHEART.Warning.${key}`));
};
