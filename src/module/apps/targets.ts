/**
 * Who a damage card lands on.
 *
 * This used to be `game.user.targets` for everybody, which is the reticle you
 * set by right-clicking a token — and it is the wrong handle for both halves
 * of the table, in opposite directions.
 *
 * **A player has one character.** Almost every hit they take is aimed at that
 * character by the GM saying a number out loud, and asking them to target
 * their own token first is asking them to aim at themselves. Worse, targeting
 * is the gesture they use to point at the thing they are *attacking*, so the
 * reticle is usually already on somebody else — press "apply damage" and you
 * heal the enemy's turn by marking the enemy's Hit Points instead of your own.
 *
 * **A GM has all of them**, and the handle they already have on "these ones,
 * now" is selection: a blast lands on the four tokens they just dragged a box
 * around. Targeting, for a GM, is what they do on behalf of a monster that is
 * about to attack — again, the other side of the exchange.
 *
 * So: selection for the GM, the assigned character for a player, and the
 * reticle only as the last thing tried. It is kept as a fallback rather than
 * dropped because it is still the honest answer for a GM who has genuinely
 * targeted something and selected nothing, and for a player with no assigned
 * character — a one-shot, a guest, a second character mid-session.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const actorsOf = (tokens: Iterable<any>): any[] =>
  [...tokens].map((t) => t?.actor).filter(Boolean);

/** By uuid: one token selected twice, or a linked actor with two tokens out. */
const unique = (actors: any[]): any[] => {
  const seen = new Set<string>();
  return actors.filter((a) => {
    const key = a?.uuid ?? a?.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * @returns the actors a damage claim should be applied to, in the order they
 * should be asked. Empty when there is nothing to apply to, which the caller
 * reports rather than guessing at.
 */
export function damageRecipients(): any[] {
  const selected = unique(actorsOf(canvas?.tokens?.controlled ?? []));
  const targeted = unique(actorsOf(game.user?.targets ?? []));

  if (game.user?.isGM) return selected.length ? selected : targeted;

  const own = game.user?.character;
  if (own) return [own];

  // A player with no assigned character but a token in hand meant that token.
  const mine = selected.filter((a) => a.isOwner);
  return mine.length ? mine : targeted;
}

/**
 * What a roll is compared against, which belongs to the thing being hit
 * rather than to whoever is hitting it. A character and a companion are found
 * by their Evasion and an adversary by its Difficulty, so this reads whichever
 * the target actually has — and a PC swinging at a PC resolves for free.
 *
 * An Environment whose Difficulty is printed as special has no number, and
 * neither has anything off this list. `null` is the honest answer rather than
 * a degraded one, and the card already draws it: the same ruling as a "4/None"
 * threshold and the minion band.
 */
const targetNumber = (actor: any): number | null => {
  const s = actor?.system ?? {};
  switch (actor?.type) {
    case "character":
    case "companion":
      return finite(s.evasion?.value);
    case "adversary":
      return finite(s.difficulty);
    case "environment":
      return s.difficultySpecial ? null : finite(s.difficulty);
    default:
      return null;
  }
};

const finite = (v: unknown): number | null =>
  Number.isFinite(Number(v)) ? Number(v) : null;

/**
 * The thing being attacked: its name, and the number the roll is measured
 * against.
 *
 * `game.user.targets` is the right handle for this and the wrong one for
 * damage, which is the distinction the whole of this file exists to draw. The
 * reticle is what you aim at the thing you are *attacking*, so it answers
 * "what am I rolling against" and never "who takes the harm" —
 * `damageRecipients` above answers the second and must not be used for the
 * first.
 *
 * One target, or no number. A card carries one verdict, and "hit" against two
 * different Evasions is two different answers, so two reticles name both and
 * resolve neither. That is the same card the system has drawn for an
 * unresolved attack all along, which is why it needs nothing new to draw it.
 */
export function attackTarget(): { name: string; dc: number | null } {
  const aimed = unique(actorsOf(game.user?.targets ?? []));
  return {
    name: aimed.map((a) => a?.name).filter(Boolean).join(" · "),
    dc: aimed.length === 1 ? targetNumber(aimed[0]) : null,
  };
}

/** Why there was nobody to hit, in the words of whoever is asking. */
export const noRecipientKey = (): string =>
  game.user?.isGM ? "NoSelection" : "NoCharacter";
