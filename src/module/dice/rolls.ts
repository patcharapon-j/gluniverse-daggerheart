/**
 * The roll engine.
 *
 * Every roll goes through a real Foundry `Roll` so the dice log, seeded
 * randomness and any 3D-dice module stay honest — and the plate is built
 * from the evaluated results afterwards. The plate never rolls anything.
 *
 * Three roll shapes, and they are genuinely different mechanics rather than
 * one mechanic with flags:
 *
 *   duality  two dice, one Hope and one Fear, ± a d6. The comparison between
 *            the two is the whole game; the total is secondary.
 *   damage   Proficiency copies of one die. No duality, no verdict.
 *   foe      1d20 + the stat block's modifier. Advantage is a second d20,
 *            not an added d6.
 *
 * A duality roll is 2d12 unless something says otherwise, and a fair number of
 * things do: *Signature Move*, *Rise to the Challenge*, *Reliable Backup* and
 * the Paragon's Chain all hand you a d20 as your Hope Die. So the pair is two
 * arguments rather than a constant. Nothing here validates them — a Fear Die is
 * whatever the GM says it is tonight — and both default to the printed d12.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { absolute } from "../assets.ts";
import { SYSTEM_ID } from "../config.ts";
import { getFear, setFear } from "../settings.ts";
import { ADV, DIS, FEAR, HOPE, paint } from "./dsn.ts";
import { damagePlate, dualityPlate, foeCrit, foePlate } from "./plate.ts";
import type { DamagePlate, DualityPlate, FoePlate, Note, Outcome, Term } from "./types.ts";

/** Pull every rolled face off a term, kept and discarded alike. */
const faces = (term: any): number[] => (term?.results ?? []).map((r: any) => r.result);

const flat = (mods: Term[]): number => mods.reduce((n, m) => n + m.v, 0);

const modFormula = (mods: Term[]): string =>
  mods.map((m) => (m.v < 0 ? ` - ${Math.abs(m.v)}` : ` + ${m.v}`)).join("");

/* ── duality ─────────────────────────────────────────────────────────── */

export interface DualityOptions {
  actor?: any;
  /** What was rolled: "Agility", "Broadsword". Shown after the `//`. */
  label: string;
  /** The meta line's left slot. Defaults to "duality roll". */
  kind?: string;
  /** Terms below the dice — the trait, an Experience, a spent Hope. */
  mods?: Term[];
  /**
   * The two duality dice, as notation. Both default to the printed `d12`.
   *
   * They are separate because the rules move them separately: everything that
   * touches the pair today upgrades the *Hope* Die and leaves Fear alone. The
   * value is trusted rather than checked against a list — a table that agreed
   * on a d10 Fear Die for a scene should not be told by the roll engine that
   * their ruling does not exist. What it *is* checked against is arithmetic:
   * anything unparseable falls back to the d12 rather than building a formula
   * out of it.
   */
  hopeDie?: string;
  fearDie?: string;
  /**
   * Advantage as a count of d6. Positive adds and takes the highest;
   * negative subtracts. Zero is neither. They cancel one-for-one across
   * every source before they get here, which is why this is one signed
   * number rather than two independent slots.
   */
  advantage?: number;
  /** Difficulty, or null for the common case of no target number at all. */
  dc?: number | null;
  /** A reaction roll keeps the dice and throws the duality away. */
  reaction?: boolean;
  /** Chat button text and action for whatever comes next. */
  next?: string;
  nextAct?: string;
  /**
   * The weapon this attack was made with, so the card's damage button knows
   * what to roll. It is recorded on the *message* rather than looked up when
   * pressed, because the loadout may have changed in between and the damage
   * owed is the damage of the thing that hit.
   */
  weaponId?: string;
  /**
   * A rule the roll carries — the weapon's feature. It is passed in rather
   * than read off `weaponId` here for the same reason the id is recorded at
   * all: the caller knows which weapon swung, and this file's job is to roll
   * dice, not to go looking for documents.
   */
  note?: Note;
}

export interface DualityOutcome {
  plate: DualityPlate;
  roll: any;
  message: any;
}

/**
 * A die, sanitised into notation and its own face count.
 *
 * The pair is trusted as a *ruling* and not as a *string*: whatever a card or a
 * GM calls the Hope Die, what goes into a `Roll` formula has to be something
 * Foundry can parse, and a bad one there throws before anything is rolled. So
 * the number is read out and re-rendered, and anything that is not a positive
 * integer becomes the printed d12.
 */
const dieOf = (notation: string | undefined): string => {
  const n = Math.floor(Number(String(notation ?? "").trim().replace(/^d/i, "")));
  return Number.isFinite(n) && n > 1 ? `d${n}` : "d12";
};

export async function rollDuality(opts: DualityOptions): Promise<DualityOutcome> {
  const mods = opts.mods ?? [];
  const adv = opts.advantage ?? 0;
  const n = Math.abs(adv);
  const hope = dieOf(opts.hopeDie);
  const fear = dieOf(opts.fearDie);

  const advPart = n ? `${adv < 0 ? " - " : " + "}${n}d6kh1` : "";
  const roll = new Roll(`1${hope} + 1${fear}${advPart}${modFormula(mods)}`);
  await roll.evaluate();

  const [hopeTerm, fearTerm, advTerm] = roll.dice;
  const h = faces(hopeTerm)[0] ?? 0;
  const f = faces(fearTerm)[0] ?? 0;

  /* Which d12 is which, said on the die itself.
   *
   * The whole duality roll is "did gold beat violet", and to a 3D-dice module
   * these are two anonymous d12s in one formula — so a table with the toy on
   * watched two identical dice land and then read the answer off the card,
   * which is the card doing the die's job. Stamped after evaluation and
   * before the message, because `options` travels with the roll into storage
   * and this is the last moment it is ours.
   *
   * Costs nothing when the module is absent: it is an unread property on a
   * term that was going to be serialised anyway.
   *
   * The role is all that is said here. Which of the role's six cuts a die wears
   * is `paint`'s to work out, off the term's own face count — the shape is on
   * the term and re-stating it here would be two places that could disagree
   * about what was just rolled. */
  paint(hopeTerm, HOPE);
  paint(fearTerm, FEAR);
  paint(advTerm, adv < 0 ? DIS : ADV);

  const out: Outcome = h === f ? "crit" : h > f ? "hope" : "fear";
  const total = roll.total;
  // A critical succeeds regardless of the Difficulty, and "meets it beats
  // it" — the comparison is >=, not >.
  const hit = out === "crit" ? true : opts.dc == null ? false : total >= opts.dc;

  const plate: DualityPlate = {
    who: opts.actor?.name ?? game.user?.name ?? "—",
    label: opts.label,
    img: portraitOf(opts.actor),
    frame: frameOf(opts.actor),
    kind: opts.kind ?? (opts.reaction ? "reaction roll" : "duality roll"),
    total,
    mods,
    h,
    f,
    hd: hope,
    fd: fear,
    out,
    ...(n ? { adv: { dice: faces(advTerm), neg: adv < 0 } } : {}),
    dc: opts.dc ?? null,
    hit,
    ...(opts.reaction ? { rxn: true } : {}),
    ...(opts.note?.t ? { note: opts.note } : {}),
  };

  const message = await postPlate({
    roll,
    content: dualityPlate(plate, opts.next, opts.nextAct),
    actor: opts.actor,
    type: "duality",
    plate,
    extra: opts.weaponId ? { weaponId: opts.weaponId } : undefined,
  });

  return { plate, roll, message };
}

/* ── damage ──────────────────────────────────────────────────────────── */

export interface DamageOptions {
  actor?: any;
  label: string;
  /** How many dice to roll — Proficiency copies for a weapon. */
  count: number;
  /** "d6", "d12". */
  die: string;
  /** Flat additions shown as their own terms. */
  mods?: Term[];
  /** "physical" | "magic", or anything a feature invents. */
  damageType?: string;
  /**
   * A critical deals the maximum possible roll of the damage dice *plus*
   * the result of rolling them. Both halves are shown, and the maximised
   * half never tumbles because it was not rolled.
   */
  critical?: boolean;
  next?: string;
  nextAct?: string;
}

export async function rollDamage(opts: DamageOptions): Promise<{ plate: DamagePlate; roll: any; message: any }> {
  const mods = opts.mods ?? [];
  const count = Math.max(1, opts.count);
  const sides = Number(opts.die.replace(/^d/i, "")) || 6;
  const critBonus = opts.critical ? count * sides : 0;

  const roll = new Roll(
    `${count}${opts.die}${critBonus ? ` + ${critBonus}` : ""}${modFormula(mods)}`,
  );
  await roll.evaluate();

  const rolls = faces(roll.dice[0]);
  const plate: DamagePlate = {
    who: opts.actor?.name ?? game.user?.name ?? "—",
    label: opts.label,
    img: portraitOf(opts.actor),
    frame: frameOf(opts.actor),
    total: roll.total,
    mods,
    n: count,
    die: opts.die,
    rolls,
    ...(opts.critical ? { max: Array.from({ length: count }, () => sides) } : {}),
    dtype: opts.damageType ?? "physical",
  };

  const message = await postPlate({
    roll,
    content: damagePlate(plate, opts.next, opts.nextAct),
    actor: opts.actor,
    type: "damage",
    plate,
  });

  return { plate, roll, message };
}

/* ── the GM's d20 ────────────────────────────────────────────────────── */

export interface FoeOptions {
  actor?: any;
  label: string;
  kind?: string;
  mods?: Term[];
  /** Advantage is a second d20. Positive keeps the highest, negative the lowest. */
  advantage?: number;
  /** The target's Evasion, or a Difficulty on a reaction roll. */
  dc?: number | null;
  target?: string;
  reaction?: boolean;
  next?: string;
  nextAct?: string;
}

export async function rollFoe(opts: FoeOptions): Promise<{ plate: FoePlate; roll: any; message: any }> {
  const mods = opts.mods ?? [];
  const adv = opts.advantage ?? 0;
  const dice = adv === 0 ? 1 : 2;
  const keep = adv < 0 ? "kl1" : "kh1";

  const roll = new Roll(`${dice}d20${dice > 1 ? keep : ""}${modFormula(mods)}`);
  await roll.evaluate();

  // The GM's die, in the GM's colour. There is no duality here to tell apart,
  // but violet is what this system means by "the other side of the table" and
  // an adversary's d20 landing in it says whose roll it is before anyone reads
  // the card. Advantage is a second d20 rather than an added d6, so there is
  // only ever this one term to paint, and it takes the d20's own cut.
  paint(roll.dice[0], FEAR);

  const d20 = faces(roll.dice[0]);
  const base: FoePlate = {
    who: opts.actor?.name ?? "—",
    label: opts.label,
    kind: opts.kind ?? (opts.reaction ? "adversary reaction" : "adversary attack"),
    total: roll.total,
    mods,
    d20,
    ...(adv < 0 ? { neg: true } : {}),
    target: opts.target ?? "",
    dc: opts.dc ?? null,
    hit: false,
    ...(opts.reaction ? { rxn: true } : {}),
  };
  // A natural 20 hits automatically; otherwise meets-it-beats-it against
  // whatever target number we were given, and nothing at all when we were
  // given none.
  base.hit = foeCrit(base) ? true : base.dc == null ? false : base.total >= base.dc;

  const message = await postPlate({
    roll,
    content: foePlate(base, opts.next, opts.nextAct),
    actor: opts.actor,
    type: "adversary",
    plate: base,
  });

  return { plate: base, roll, message };
}

/* ── posting ─────────────────────────────────────────────────────────── */

/**
 * The portrait, preferring the token art the table is actually looking at.
 * Returns undefined rather than a placeholder: a card that reserves space
 * for a missing image is worse than one that never mentions it.
 */
function portraitOf(actor: any): string | undefined {
  const img = actor?.token?.texture?.src || actor?.prototypeToken?.texture?.src || actor?.img;
  return img && !img.endsWith("mystery-man.svg") ? absolute(img) : undefined;
}

/**
 * The framing the player set for this panel, or nothing.
 *
 * Nothing rather than a default object, because the CSS already holds the
 * unframed behaviour in its `var()` fallbacks — and an actor that has never
 * been framed should get whatever that is today, not a copy of it taken on
 * the day the roll was made.
 */
function frameOf(actor: any): { x: number; y: number; scale: number } | undefined {
  const f = actor?.system?.portrait?.plate;
  if (!f) return undefined;
  return f.x || f.y || f.scale !== 1 ? { x: f.x, y: f.y, scale: f.scale } : undefined;
}

interface PostOptions {
  roll: any;
  content: string;
  actor?: any;
  type: "duality" | "damage" | "adversary";
  plate: unknown;
  /** Anything the card's own buttons will need when they are pressed. */
  extra?: Record<string, unknown>;
}

/**
 * The plate is wrapped in `.dh` because that is where the role tokens are
 * declared. Foundry's chat log is not our substrate, and scoping the
 * palette to our own root is what keeps `--ink` and `--paper` from leaking
 * into every other package on the page.
 */
async function postPlate({ roll, content, actor, type, plate, extra }: PostOptions): Promise<any> {
  return ChatMessage.create({
    type,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    // The dice themselves are suppressed in `dsn.ts`, on the one hook whose
    // context is still writable. This kills the sound that would otherwise
    // play for dice nobody is being shown — the two halves of one setting.
    sound: game.settings.get(SYSTEM_ID, "diceSoNice") ? undefined : null,
    content: `<div class="dh dh-plate">${content}</div>`,
    flags: { [SYSTEM_ID]: { plate, kind: type, actorUuid: actor?.uuid ?? null, ...extra } },
  });
}

/* ── the Fear pool ───────────────────────────────────────────────────── */

/**
 * "GM gains a Fear" is stated on the player's card and applied on the GM's
 * client, because only a GM may write a world setting. The button is a
 * `<span>` on the player side for exactly this reason — it is a claim, not
 * a control.
 */
export async function applyFearClaim(n = 1): Promise<void> {
  if (game.user?.isGM) await setFear(getFear() + n);
}
