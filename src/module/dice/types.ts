/**
 * The shapes the chat plate is drawn from.
 *
 * These are deliberately *display* records rather than roll objects: every
 * number on a card is decided before any of it renders, and the card never
 * recomputes anything. That is what makes the arrival animation safe — the
 * tumble only ever overwrites a display that already held the true value.
 */

/** A term in the arithmetic strip under the dice. */
export interface Term {
  /** What it is: "dice", "agility", "advantage · highest of 3". */
  k: string;
  v: number;
  /** Paid for with Hope — drawn in gold. */
  spent?: boolean;
  /** Paid for with Fear — drawn in violet. Never both. */
  fear?: boolean;
}

/** Which side of the duality won, or neither. */
export type Outcome = "hope" | "fear" | "crit";

export interface PlateBase {
  /** The roller's name. Sits beside the portrait, where the face already
      answers the same question. */
  who: string;
  /** What was rolled: "Agility", "Broadsword", "Tremor Sense". */
  label: string;
  /** Portrait URL, or empty — a card that reserves space for a missing
      image is worse than one that never mentions it. */
  img?: string;
  /** How that image is framed for *this* panel — see `data/fields.ts`. */
  frame?: { x: number; y: number; scale: number };
  /** The meta line's left slot: the *kind* of roll. */
  kind?: string;
  total: number;
  mods: Term[];
}

/** A player's duality roll. */
export interface DualityPlate extends PlateBase {
  h: number;
  f: number;
  out: Outcome;
  adv?: { dice: number[]; neg: boolean };
  /** Difficulty, or null when none was set — which is the common case and
      not a degraded one. */
  dc: number | null;
  hit: boolean;
  /** A reaction roll rolls the duality dice and then throws the duality
      away: no Hope, no Fear, no GM move. */
  rxn?: boolean;
}

/** A damage roll. No duality axis, no verdict — a damage roll is a quantity. */
export interface DamagePlate extends PlateBase {
  /** Number of dice rolled, i.e. Proficiency copies. */
  n: number;
  /** "d6", "d12". */
  die: string;
  rolls: number[];
  /** Present only on a critical: the awarded maximum, which never tumbles
      because it was not rolled. */
  max?: number[];
  /** A bonus die some features add on top. */
  bonus?: { k: string; v: number; mx?: number };
  dtype: string;
}

/** An adversary's d20 attack or reaction. */
export interface FoePlate extends PlateBase {
  d20: number[];
  /** Disadvantage keeps the lowest. */
  neg?: boolean;
  target?: string;
  dc: number | null;
  hit: boolean;
  rxn?: boolean;
}
