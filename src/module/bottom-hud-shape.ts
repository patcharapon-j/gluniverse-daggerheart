/**
 * The bottom HUD's one decision: is this change a *shape* or a *value*?
 *
 * The rail is rendered once and driven afterwards — `setStrip`, `setPool`,
 * `setSeat` and `flinch` are the design's own setters, and they exist so a
 * box that lands plays its landing and nothing around it replays anything.
 * That contract is only kept if the host can tell the two kinds of change
 * apart, and it is the same boundary the token chip draws: a track's *marked*
 * count moving is a value, and a track's *maximum* moving — a level, a scar, a
 * card going into the hand — is the object changing shape, which is a rebuild.
 *
 * So the options object the builders are handed is the whole truth, and this
 * file names the handful of paths in it that are values. Everything else is
 * shape by default, which fails in the safe direction: a field forgotten here
 * costs one 10ms redraw, where a value mistaken for shape would be a number on
 * screen that never moves.
 *
 * Nothing in here touches Foundry, the DOM or a builder, so
 * `tools/test-bottom-hud.mjs` can hold it to that boundary with plain objects.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** `[marked, max]`, or Hope's `[cur, max, scars]`. */
type Pair = [number, number, ...number[]];

export interface SeatLive {
  hp?: Pair;
  st?: Pair;
  ar?: Pair;
  hope?: Pair | null;
}

/** Every number on the rail that a setter moves rather than a redraw. */
export interface Live {
  role: "player" | "gm";
  /** The player's Hope, and the plinth's halo and folded numeral with it. */
  hope?: number;
  hopeMax?: number;
  hp?: Pair;
  st?: Pair;
  ar?: Pair;
  /** The party, by actor id. */
  seats: Record<string, SeatLive>;
  /** Each foe card's Hit Points, by token id. */
  foes: Record<string, Pair>;
}

const live = (p: any): Pair | undefined => (Array.isArray(p) ? (p.slice() as Pair) : undefined);

/** Read the values out of a rail's options. */
export function liveOf(o: any): Live {
  const seats: Record<string, SeatLive> = {};
  for (const s of o?.stack ?? []) {
    if (!s?.id) continue;
    seats[s.id] = { hp: live(s.hp), st: live(s.st), ar: live(s.ar), hope: s.hope ? live(s.hope) : null };
  }
  const foes: Record<string, Pair> = {};
  for (const f of o?.foes?.foes ?? []) if (f?.id) foes[f.id] = live(f.hp) as Pair;
  if (o?.role === "gm") {
    return { role: "gm", hp: live(o.adversary?.hp), st: live(o.adversary?.st), seats, foes };
  }
  return {
    role: "player",
    hope: o?.vitals?.hope?.[0],
    hopeMax: o?.vitals?.hope?.[1],
    hp: live(o?.vitals?.hp),
    st: live(o?.vitals?.st),
    ar: live(o?.vitals?.ar),
    seats,
    foes,
  };
}

/* The first element of a value pair is the value; the rest is its shape. */
const blank = (p: any): any => (Array.isArray(p) ? [null, ...p.slice(1)] : p);

/**
 * The rail's options with every value taken out, as a string to compare.
 *
 * Two rails with equal shapes differ only in numbers a setter can move, so the
 * host drives the one on screen to the other. Unequal, it redraws.
 */
export function shapeOf(o: any): string {
  const c = JSON.parse(JSON.stringify(o ?? {}));
  if (c.vitals) {
    c.vitals.hope = blank(c.vitals.hope);
    c.vitals.hp = blank(c.vitals.hp);
    c.vitals.st = blank(c.vitals.st);
    c.vitals.ar = blank(c.vitals.ar);
  }
  if (c.plinth) {
    delete c.plinth.hopeLit;
    delete c.plinth.hope;
  }
  /* Which features the purse can pay for is a reading of Hope, not a shape:
     the setter dims and lights them from their own `data-hope`. */
  if (c.features) delete c.features.hope;
  for (const s of c.stack ?? []) {
    s.hp = blank(s.hp);
    s.st = blank(s.st);
    s.ar = blank(s.ar);
    if (s.hope) s.hope = blank(s.hope);
  }
  if (c.adversary) {
    c.adversary.hp = blank(c.adversary.hp);
    c.adversary.st = blank(c.adversary.st);
  }
  for (const f of c.foes?.foes ?? []) f.hp = blank(f.hp);
  return JSON.stringify(c);
}

/** Did Hit Points just get worse? That is the one change the figure feels. */
export const tookHit = (prev: Live | null, next: Live): boolean =>
  !!prev && prev.role === next.role && (next.hp?.[0] ?? 0) > (prev.hp?.[0] ?? 0);

/**
 * Who may press this rail.
 *
 * A player's rail acts on the character only when the user owns it — the
 * rail draws for an observer too (a GM looking at a character's rail is the
 * common case, and so is a player whose character is shared), but every press
 * on it writes to a document, and a write the server would refuse is a press
 * that looks like it did nothing. The GM's rail is the GM's: it marks
 * adversaries and spends Fear, which nobody else may do.
 */
export function canAct(role: "player" | "gm", user: any, actor: any): boolean {
  if (role === "gm") return !!user?.isGM;
  if (!actor) return false;
  if (typeof actor.testUserPermission === "function") return !!actor.testUserPermission(user, "OWNER");
  return !!actor.isOwner;
}

/**
 * The next marked count for a press on box `i` of a strip, given what is marked.
 *
 * Pressing the box at the edge of the run toggles it; pressing anywhere else
 * marks up to it. Armor reads the other way round — the strip lights what is
 * *left* — so the same press means the mirror-image count. This is the study
 * page's arithmetic, and the sheet's track does the same thing in its own
 * vocabulary: the box you press is the box that changes.
 */
export function pressBox(kind: "hp" | "st" | "ar", i: number, marked: number, max: number): number {
  const next =
    kind === "ar"
      ? max - marked === i + 1
        ? max - i
        : max - i - 1
      : i + 1 === marked
        ? i
        : i + 1;
  return Math.max(0, Math.min(max, next));
}
