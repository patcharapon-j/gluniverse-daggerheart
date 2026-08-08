/**
 * *The Twilight Marked* — the frame around the Root and Void decks.
 *
 * The cards are content and live in `src/packs-src/marked-cards.mjs`. This is
 * the mechanic they hang off, and it is four rules:
 *
 * - **Using a card costs.** You gain 1 Mark and the GM gains 1 Fear. Neither
 *   is optional. Reactions count, a second activation counts, and it fires
 *   even when the roll fails — you still reached for it.
 * - **Mark is cleared by a roll at every long rest**, against a Difficulty of
 *   8 + your Mark, with no trait. Failing costs 2 Stress and leaves you
 *   *Surging*.
 * - **The two marks fight.** Holding a Root card and a Void card in the same
 *   loadout costs 1 Stress on arrival and 1 more at the end of every long rest.
 * - **The mark is the casting organ.** Root casts with Instinct and Void with
 *   Knowledge, whatever the character's own Spellcast trait is — or whether
 *   they have one at all.
 *
 * ── two of the four are automated and two are not, on purpose ─────────
 * The toll and the roll are arithmetic on numbers this system owns, so they
 * run. The Spellcast override is **stated and not substituted**: a marked card
 * says which trait it casts with, and the player rolls that trait from the
 * plate they already use. Silently swapping the trait under a roll the player
 * initiated somewhere else would be this module reaching into the roll engine
 * to enforce a campaign rule, and the first time it was wrong nobody would be
 * able to see why.
 *
 * ── the cost is a press, not a side effect ────────────────────────────
 * Clicking a card on the sheet **posts** it, and posting is not using — you
 * show a card to argue about what it says at least as often as you play it.
 * So the posted card carries a claim button, exactly as a duality plate
 * carries "Gain a Hope", and it spends the same one-per-message flag: a use
 * taken on one client is taken on every other one and stays taken after a
 * reload. That also answers the three cases the printed rule calls out —
 * a reaction, a second activation, and a use that failed are all *a press*.
 *
 * ── who writes the Fear ───────────────────────────────────────────────
 * Not the player, because only a GM may write a world setting. The press
 * writes a flag on the message and the **active GM's** client applies the
 * Fear when it sees the flag land. That is `applyFear`'s own arrangement one
 * step along, and it is gated on `game.users.activeGM` for the reason
 * `syncVulnerable` is: the hook fires on every connected client, and three
 * clients agreeing to add the same Fear is three writes and a race.
 *
 * **The pool being full does not make the card free.** Fear caps at twelve and
 * anything past it is lost, so at a full pool a marked deck would cost nothing
 * exactly when the table is in the most trouble. The cost lands on the player
 * instead: a Stress apiece, decided on the pressing client, which is the only
 * one that knows whether the press was theirs.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID, isMarkedDomain } from "./config.ts";
import { FEAR_MAX, gainFear, getFear } from "./settings.ts";
import { rollDuality } from "./dice/rolls.ts";

/** The mark is the casting organ, so the deck names the trait and not the class. */
export const MARKED_SPELLCAST: Record<string, string> = {
  root: "instinct",
  void: "knowledge",
};

export const markedSpellcast = (domain?: string): string | undefined =>
  MARKED_SPELLCAST[String(domain)];

/** The flag a press leaves for the GM's client to answer. */
const FEAR_OWED = "markedFear";

const marked = (actor: any): boolean => actor?.type === "character";
const markOf = (actor: any): number => Number(actor?.system?.mark ?? 0);

/* ── using a card ─────────────────────────────────────────────────────── */

/**
 * What one use of a Root or Void card costs, before anything is spent.
 *
 * Returned rather than applied so the button can say what it is about to do —
 * "Use · 1 Mark, 1 Fear" reads differently from "Use · 1 Mark, 1 Stress", and
 * the second is the one that happens at a full pool. The label is built from
 * this so the two can never disagree.
 *
 * `n` is 3 for the two level 10 cards that buy an extra action, and the Fear
 * scales with it: those are the strongest cards in either deck and charging
 * them one Fear would make the biggest thing you can do the cheapest per unit
 * of what it does.
 */
export function markPrice(actor: any, n = 1): { mark: number; fear: number; stress: number } {
  /* Surging doubles the Fear rather than adding a rule of its own. A failed
     long-rest roll used to leave a state with no mechanical teeth at all —
     "you can't hide that you're Marked" — and the honest teeth are the ones
     the frame already has: the mark is louder, so it costs the table more. */
  const want = actor?.system?.surging ? n * 2 : n;
  const room = Math.max(0, FEAR_MAX - getFear());
  const fear = Math.min(want, room);
  return { mark: n, fear, stress: want - fear };
}

/**
 * Spend it.
 *
 * Writes the Mark and any Stress on the actor, and leaves the Fear as a flag
 * for the GM. Returns false without writing anything when the Stress cannot be
 * paid, so the caller can refuse the press rather than half-applying it.
 */
export async function payMark(
  actor: any,
  message: any,
  n = 1,
): Promise<false | { mark: number; fear: number; stress: number }> {
  if (!marked(actor)) return false;
  const price = markPrice(actor, n);

  const stress = actor.system?.resources?.stress;
  const free = Number(stress?.max ?? 0) - Number(stress?.marked ?? 0);
  if (price.stress > free) return false;

  const update: Record<string, number> = { "system.mark": markOf(actor) + price.mark };
  if (price.stress) update["system.resources.stress.marked"] = Number(stress.marked) + price.stress;
  await actor.update(update);

  /* The flag rather than the setting, because a player cannot write a world
     setting and this press is nearly always theirs. Set even when it is a GM
     pressing it: one path, and the GM's own client answers its own flag on the
     next tick exactly as it would answer anybody's. */
  if (price.fear && message) await message.setFlag(SYSTEM_ID, FEAR_OWED, price.fear);
  return price;
}

/**
 * The GM's half. One nominated writer, so a table of five does not add five.
 *
 * Registered on `updateChatMessage` rather than on the press, because the press
 * happens on somebody else's client. The flag is deleted as it is answered, so
 * a re-render — or a second GM connecting — cannot pay it twice.
 */
export function registerMarked(): void {
  Hooks.on("updateChatMessage", async (message: any, changed: any) => {
    if (game.users?.activeGM !== game.user) return;
    if (!foundry.utils.hasProperty(changed, `flags.${SYSTEM_ID}.${FEAR_OWED}`)) return;
    const owed = Number(message.getFlag(SYSTEM_ID, FEAR_OWED) ?? 0);
    if (!owed) return;
    await message.unsetFlag(SYSTEM_ID, FEAR_OWED);
    await gainFear(owed);
  });

  /* The toll, observed rather than instrumented.

     A card reaches the loadout by at least five routes — the recall button, a
     drag between the two lists, a drag in from the compendium browser, the
     item sheet's own checkbox, somebody's macro — and a payment written into
     each of them is a payment that is wrong the first time a sixth is added.
     `ledger.ts` settled this argument already: the document is the record, so
     read the record. One hook catches every route including the ones that do
     not exist yet. */
  Hooks.on("updateItem", async (item: any, changed: any) => {
    if (item?.type !== "domainCard") return;
    if (changed?.system?.inLoadout !== true) return;
    const actor = item.parent;
    if (actor?.documentName !== "Actor" || !marked(actor)) return;
    if (!actor.isOwner || game.user !== firstOwner(actor)) return;
    await payToll(actor, item);
  });
}

/**
 * Which client pays. An actor with two owners connected would otherwise mark
 * the Stress twice, and unlike the Fear this is not the GM's to write — a
 * player owns their own sheet. So the *first* connected user who owns it does
 * it, which is stable across clients because `game.users` is ordered the same
 * everywhere.
 */
const firstOwner = (actor: any): any =>
  game.users?.find?.((u: any) => u.active && actor.testUserPermission?.(u, "OWNER")) ?? null;

/**
 * Root and Void in one loadout costs a Stress, and it costs it **on arrival**.
 *
 * Charged when the card that completes the pair lands, not on every card after
 * it: the rule is a toll on holding both, and a second Void card joining a
 * loadout that already holds Root and Void has not changed what you are
 * holding. So the test is that this card's domain is one of the two and the
 * *other* one is now present — and that it was not already, which is what
 * `others` excludes this item to find out.
 */
async function payToll(actor: any, arriving: any): Promise<void> {
  const mine = arriving.system?.domain;
  if (!isMarkedDomain(mine)) return;
  const other = mine === "root" ? "void" : "root";

  const held = (domain: string, skip?: string) =>
    actor.items.some(
      (i: any) =>
        i.type === "domainCard" && i.system?.inLoadout && i.system?.domain === domain && i.id !== skip,
    );

  if (!held(other)) return;
  // Already paired before this card arrived: nothing changed hands.
  if (held(mine, arriving.id)) return;

  await markStress(actor, 1, "the toll for holding Root and Void together");
}

/** Mark Stress, or say why it could not be. Returns whether it landed. */
async function markStress(actor: any, n: number, why: string): Promise<boolean> {
  const stress = actor.system?.resources?.stress;
  const free = Number(stress?.max ?? 0) - Number(stress?.marked ?? 0);
  if (n > free) {
    ui.notifications?.warn(
      `${actor.name} cannot pay ${why} — ${n} Stress, and there ${free === 1 ? "is" : "are"} ${free} left.`,
    );
    return false;
  }
  await actor.update({ "system.resources.stress.marked": Number(stress.marked) + n });
  return true;
}

/* ── the long-rest roll ───────────────────────────────────────────────── */

export interface MarkRollOutcome {
  mark: number;
  difficulty: number;
  bought: number;
  success: boolean;
  hope: boolean;
  surging: boolean;
}

/**
 * At the end of a long rest, if you have any Mark, you roll it off.
 *
 * **No trait**, because resisting your own mark is not something you are good
 * at — which also means the roll is 2d12 against 8 + Mark and stops being a
 * roll somewhere around Mark 8. That tail was the frame's real bug: a
 * Difficulty of 16 against an average of 13 is not a decision, it is a tax
 * with dice on it.
 *
 * So the Difficulty can be **bought down**, two points per Stress, before the
 * dice. It turns the tax back into a choice, and it charges the currency the
 * decks are already burning — which is the point of the whole frame. Nothing
 * is spent if the buy-down cannot be afforded; `bought` is clamped to what is
 * free rather than refused, because a rest that ends in an error dialog is a
 * rest nobody finishes.
 *
 * **Mark always clears, win or lose.** This is per-session pressure and not a
 * spiral: the difference between the two outcomes is 2 Stress you keep and a
 * *Surging* that makes the next session's cards cost double.
 */
export async function rollOffMark(actor: any, bought = 0): Promise<MarkRollOutcome | null> {
  const mark = markOf(actor);
  if (!marked(actor) || mark <= 0) return null;

  const stress = actor.system?.resources?.stress;
  const free = Number(stress?.max ?? 0) - Number(stress?.marked ?? 0);
  const spend = Math.max(0, Math.min(Math.round(bought), free));
  const difficulty = Math.max(1, 8 + mark - spend * 2);

  /* No trait, and no `mods` carrying a zero to say so — a term worth nothing
     on the arithmetic strip is a line the reader has to check and discard. The
     label is where it is said, because this is the one roll in the system that
     is genuinely untrained and the card should state that rather than look
     like a roll whose modifier went missing. */
  const { plate } = await rollDuality({
    actor,
    label: spend ? `The Mark · bought down ${spend * 2}` : "The Mark",
    kind: "untrained roll",
    dc: difficulty,
  });

  const success = Boolean(plate.hit);
  const hope = plate.out !== "fear";
  const surging = !success;

  const update: Record<string, unknown> = { "system.mark": 0, "system.surging": surging };
  /* Two Stress *this rest does not clear*, which is why they are marked after
     the rest has finished refreshing rather than before it. Plus whatever the
     buy-down cost, which is spent either way — you paid for the better odds,
     not for the result. */
  const owed = spend + (success ? 0 : 2);
  if (owed) {
    update["system.resources.stress.marked"] = Math.min(
      Number(stress.max ?? 0),
      Number(stress.marked ?? 0) + owed,
    );
  }
  await actor.update(update);

  /* A failure with Fear also feeds the pool, which is the frame's grammar
     everywhere else: the mark's every move is the GM's gain. */
  if (!success && !hope) await gainFear(1);

  return { mark, difficulty, bought: spend, success, hope, surging };
}

/**
 * The upkeep, which is the toll's other half and fires at the end of a long
 * rest rather than on arrival.
 *
 * Separate from `rollOffMark` because they answer different questions and one
 * can happen without the other: a character with no Mark still pays upkeep if
 * they are holding both decks, and a character with 6 Mark and a single-domain
 * loadout pays none.
 */
export async function payUpkeep(actor: any): Promise<boolean> {
  if (!marked(actor)) return false;
  const inLoadout = (d: string) =>
    actor.items.some(
      (i: any) => i.type === "domainCard" && i.system?.inLoadout && i.system?.domain === d,
    );
  if (!inLoadout("root") || !inLoadout("void")) return false;
  return markStress(actor, 1, "the upkeep for resting with Root and Void in your loadout");
}

/** Whether this character is carrying either deck at all. */
export const isMarkedCharacter = (actor: any): boolean =>
  Boolean(
    marked(actor) &&
      (markOf(actor) > 0 ||
        actor.items?.some?.((i: any) => i.type === "domainCard" && isMarkedDomain(i.system?.domain))),
  );

export const clearMark = (actor: any): Promise<any> =>
  actor.update({ "system.mark": 0, "system.surging": false });
