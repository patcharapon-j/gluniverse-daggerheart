/**
 * Rerolling a die that is already in the log.
 *
 * A great many cards say to reroll something — a damage die, a Hope Die, the
 * whole lot — and until now the only way to do any of it was to roll again
 * from the sheet and ask the table to ignore the first card. That is two
 * records of one roll, and the second one is the one everybody argues about.
 *
 * So the die on the plate is the control. Press it and it rolls again, in
 * place, on the card that already exists.
 *
 * ── four things this file is careful about ────────────────────────────
 *
 * **It rolls a real `Roll`.** The engine's opening promise — the dice log,
 * seeded randomness and any 3D-dice module stay honest — is not one a reroll
 * may quietly drop by calling `Math.random()` and writing a number into a
 * flag. So a `Roll` is built and evaluated, painted with the same DSN role the
 * die was painted with when it was first thrown, appended to the message's own
 * `rolls`, and shown in 3D if the table is running the toy. Every die on the
 * card is then something Foundry actually rolled.
 *
 * **The plate is the record and the markup is a rendering of it.** Nothing
 * here reads the DOM or patches a numeral: the stored options are updated, the
 * content is rebuilt by the same three builders that wrote it, and every
 * client redraws from the message. That is why `next`/`nextAct` had to start
 * being stored — they were the one part of a plate that lived only in the
 * markup, and a rebuild without them silently ate the "Roll damage" button.
 *
 * **The face that was replaced stays on the card.** `rr` keeps it, and it is
 * drawn beside its replacement struck through with the X that means *this did
 * not count*. That is what makes an unlimited reroll safe to offer: this
 * system does not enforce the card that permits one — it prints the rule and
 * lets the table read it — so what it owes the table instead is an honest
 * record of how many times you asked. A silent reroll would be the one thing
 * on a chat card that could be done without leaving a mark.
 *
 * **A settled roll is settled.** The moment anything on the card is claimed —
 * the Hope taken, the Fear gained, the damage rolled or applied — the dice go
 * inert. Otherwise a claimed Fear could be rerolled into an unclaimed Hope and
 * the claim flags, which exist precisely so a thing cannot be collected twice,
 * would be guarding an outcome that no longer happened.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "../config.ts";
import { ADV, DIS, FEAR, HOPE, paint } from "./dsn.ts";
import {
  advVal,
  d20Keep,
  damageGroups,
  damagePlate,
  dualityDie,
  dualityPlate,
  foeCrit,
  foePlate,
} from "./plate.ts";
import type { DamagePlate, DualityPlate, FoePlate, PlateBase, Term } from "./types.ts";

type Kind = "duality" | "damage" | "adversary";

const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0);
const flat = (mods: Term[]): number => sum(mods.map((m) => m.v));

/** How many faces a notation claims. Anything unparseable is a d12. */
const facesOf = (die: string): number => {
  const n = Math.floor(Number(String(die).replace(/^d/i, "")));
  return Number.isFinite(n) && n > 1 ? n : 12;
};

/**
 * Whether this client may reroll anything on this message.
 *
 * `canUserModify` is the same test `message-header.ts` uses to decide who gets
 * a trash can, and it is the right one here for the same reason: the author of
 * a roll and a GM are exactly the two people entitled to change what it says.
 * Actor ownership is not asked on top of it — a GM rerolling an adversary's
 * d20 owns the adversary, and a player rerolling their own attack authored the
 * message.
 */
export const canReroll = (message: any): boolean =>
  !!message?.canUserModify?.(game.user, "update") &&
  !Object.values((message.getFlag(SYSTEM_ID, "claimed") ?? {}) as Record<string, unknown>).some(
    Boolean,
  );

/**
 * Which die a key names: its notation, its DSN role, and how to put a new face
 * back on the plate.
 *
 * One resolver rather than a branch per plate kind at every step, because the
 * three kinds differ in where the number lives and in nothing else — and a
 * key that names no die on this plate has to fall out as `null` rather than as
 * a write to `undefined`, since the key arrives off a DOM attribute.
 */
interface Target {
  die: string;
  role: string;
  read: () => number;
  write: (v: number) => void;
}

/**
 * An index out of a key, or -1.
 *
 * The key arrives off a DOM attribute, so "there is no such die" is an
 * ordinary answer rather than an impossible one — and `Number(undefined)` is
 * `NaN`, which passes a naive `i < length` test and would then write a face
 * onto nothing.
 */
const indexIn = (raw: string | undefined, length: number): number => {
  const i = Number(raw);
  return Number.isInteger(i) && i >= 0 && i < length ? i : -1;
};

function targetOf(kind: Kind, plate: any, key: string): Target | null {
  if (kind === "duality") {
    const r = plate as DualityPlate;
    if (key === "h") {
      return { die: dualityDie(r, "h"), role: HOPE, read: () => r.h, write: (v) => (r.h = v) };
    }
    if (key === "f") {
      return { die: dualityDie(r, "f"), role: FEAR, read: () => r.f, write: (v) => (r.f = v) };
    }
    const adv = /^adv:(\d+)$/.exec(key);
    if (adv && r.adv) {
      const dice = r.adv.dice;
      const i = indexIn(adv[1], dice.length);
      if (i < 0) return null;
      return {
        die: "d6",
        role: r.adv.neg ? DIS : ADV,
        read: () => dice[i] as number,
        write: (v) => (dice[i] = v),
      };
    }
    return null;
  }

  if (kind === "damage") {
    const r = plate as DamagePlate;
    const m = /^dmg:(\d+):(\d+)$/.exec(key);
    if (!m) return null;
    /* `damageGroups` reads the first group off `n`/`die`/`rolls` and the rest
       off `extra`, and the objects it returns hold the stored arrays — so
       writing into `group.rolls` writes into the plate. Group zero's array is
       `r.rolls` itself, which is why this does not have to branch on it. */
    const groups = damageGroups(r);
    const gi = indexIn(m[1], groups.length);
    if (gi < 0) return null;
    const rolls = groups[gi]!.rolls;
    const i = indexIn(m[2], rolls.length);
    if (i < 0) return null;
    return {
      die: groups[gi]!.die,
      // Damage dice have never named a role: they are neither side of the
      // duality, so they take whatever the table's own theme is.
      role: "",
      read: () => rolls[i] as number,
      write: (v) => (rolls[i] = v),
    };
  }

  const r = plate as FoePlate;
  const m = /^d20:(\d+)$/.exec(key);
  if (!m) return null;
  const i = indexIn(m[1], r.d20.length);
  if (i < 0) return null;
  // The GM's die is violet — "the other side of the table" — whatever it rolls.
  return {
    die: "d20",
    role: FEAR,
    read: () => r.d20[i] as number,
    write: (v) => (r.d20[i] = v),
  };
}

/**
 * Everything a plate derives from its dice, recomputed.
 *
 * Deliberately the same expressions the engine used rather than a re-run of
 * it: `rollDuality` reads `roll.total` off Foundry, and there is no second
 * `Roll` here holding the whole formula, so the total is summed from the
 * plate's own parts. They agree by construction because the plate holds every
 * term the formula had — which is the property that made a display record the
 * right shape for a card in the first place.
 */
function settle(kind: Kind, plate: any): void {
  if (kind === "duality") {
    const r = plate as DualityPlate;
    r.out = r.h === r.f ? "crit" : r.h > r.f ? "hope" : "fear";
    r.total = r.h + r.f + advVal(r) + flat(r.mods);
    r.hit = r.out === "crit" ? true : r.dc == null ? false : r.total >= r.dc;
    return;
  }
  if (kind === "damage") {
    const r = plate as DamagePlate;
    const groups = damageGroups(r);
    r.total =
      sum(groups.map((g) => sum(g.rolls))) +
      sum(groups.map((g) => sum(g.max ?? []))) +
      (r.bonus?.v ?? 0) +
      flat(r.mods);
    return;
  }
  const r = plate as FoePlate;
  r.total = d20Keep(r) + flat(r.mods);
  r.hit = foeCrit(r) ? true : r.dc == null ? false : r.total >= r.dc;
}

/**
 * The trailing button, for a card that predates it being stored.
 *
 * `next`/`nextAct` started being recorded when this file was written, so every
 * roll already in a world's log carries neither — and rebuilding one without
 * them would quietly eat its "Roll damage". An attack is the only plate that
 * has ever had a trailing button and it has always recorded `weaponId`, so the
 * one lossy case answers itself. Anything older with no weapon on it genuinely
 * had no button.
 */
const legacyNext = (message: any, kind: Kind): [string?, string?] =>
  kind === "duality" && message.getFlag(SYSTEM_ID, "weaponId")
    ? ["Roll damage", "roll-damage"]
    : [undefined, undefined];

const rebuild = (kind: Kind, plate: any, next?: string, nextAct?: string): string => {
  const inner =
    kind === "duality"
      ? dualityPlate(plate, next, nextAct)
      : kind === "damage"
        ? damagePlate(plate, next, nextAct)
        : foePlate(plate, next, nextAct);
  // The same wrapper `postPlate` writes. `.dh` is where the role tokens are
  // declared and Foundry's chat log is not our substrate.
  return `<div class="dh dh-plate">${inner}</div>`;
};

/**
 * Roll one die again.
 *
 * @returns whether anything moved. A refusal is silent to the caller and
 *          warned to the presser, because every way this can decline is
 *          something the reader can see on the card in front of them.
 */
export async function rerollDie(message: any, key: string): Promise<boolean> {
  if (!canReroll(message)) {
    ui.notifications?.warn(game.i18n.localize("DAGGERHEART.Warning.RollSettled"));
    return false;
  }

  const kind = message.getFlag(SYSTEM_ID, "kind") as Kind | undefined;
  const stored = message.getFlag(SYSTEM_ID, "plate");
  if (!kind || !stored) return false;

  /* A deep copy, because the flag's object is the one Foundry handed us and
     mutating it in place would leave a client that then failed to write
     showing a number the world does not hold. */
  const plate = foundry.utils.deepClone(stored) as PlateBase & Record<string, any>;
  const target = targetOf(kind, plate, key);
  if (!target) return false;

  const roll = new Roll(`1${target.die}`);
  await roll.evaluate();
  if (target.role) paint(roll.dice[0], target.role);
  const face = roll.dice[0]?.results?.[0]?.result;
  if (typeof face !== "number") return false;

  plate.rr = { ...(plate.rr ?? {}) };
  plate.rr[key] = [...(plate.rr[key] ?? []), target.read()];
  target.write(face);
  settle(kind, plate);

  /* 3D first, then the write. The dice land while the card still says what it
     said, and the card changes as they settle — which is the order the arrival
     animation already establishes for a roll being watched. Awaited, so a
     table with the toy on does not read the answer before the dice stop.

     `showForRoll` is called rather than relied on: DSN animates on message
     *creation*, and this is an update. The setting is the same one that
     suppresses the dice on a fresh plate — the two halves of one switch. */
  if (game.settings.get(SYSTEM_ID, "diceSoNice")) {
    await (game as any).dice3d?.showForRoll?.(roll, game.user, true)?.catch?.(() => {});
  }

  const [oldNext, oldNextAct] = legacyNext(message, kind);
  await message.update({
    content: rebuild(
      kind,
      plate,
      message.getFlag(SYSTEM_ID, "next") ?? oldNext,
      message.getFlag(SYSTEM_ID, "nextAct") ?? oldNextAct,
    ),
    rolls: [...(message.rolls ?? []), roll],
    [`flags.${SYSTEM_ID}.plate`]: plate,
  });
  return true;
}
