/**
 * Types for the vendored design components.
 *
 * These modules are plain JavaScript on purpose — they are copied verbatim
 * from `design/` by `scripts/port-design-js.mjs`, and adding annotations to
 * them there would mean the prototypes no longer run in a browser. So the
 * contract is declared here instead, next to the copy.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare module "*/ui/mark.js" {
  /** A mark track: Hit Points, Stress, Armor Slots. */
  export function MARKS(opts: {
    label?: string;
    total: number;
    marked?: number;
    /** "hp" | "stress" | "armor" | "plain" — the material, not just the hue. */
    kind?: string;
    head?: boolean;
    /** Draw the Vulnerable strip when the track fills. */
    vuln?: boolean;
    /** How many boxes the row is *sized* for, which is not always how many
        it has — see the note in mark.js. */
    span?: number;
  }): string;

  /** Thresholds and Hit Points fused into one object. */
  export function DAMAGE(opts: {
    major: number;
    severe: number;
    hp: number;
    marked?: number;
    /** The optional 2× severe rule, which bounds the Severe zone. */
    massive?: boolean;
    label?: string;
    span?: number;
  }): string;

  /** Diff the row against a new count and animate only what changed. */
  export function setMarks(mk: Element, marked: number): void;

  /** The neutral mark at tick size, for the damage band's cost cells. */
  export const TICK: string;
  /** An advancement slot: a box you cross off, at half size. */
  export function XBOX(on: boolean): string;
  /** The neutral mark alone, for callers that build their own box. */
  export const XMARK: string;
  /**
   * The same arm as a `clip-path`, for a surface that cannot carry SVG —
   * the change log is one. Null for `plain`, the only arm with a curve
   * in it; a polygon cannot say Q.
   */
  export function armPolygon(kind: string): string | null;
}

declare module "*/ui/gem.js" {
  export function GEM(opts: {
    on?: boolean;
    scar?: boolean;
    fear?: boolean;
    i?: number;
    /** The pip's place in the row. Fear's idle breath is offset by it. */
    n?: number;
    sz?: number;
  }): string;

  export function GEMS(opts: {
    cur?: number;
    max?: number;
    scars?: number;
    fear?: boolean;
    sz?: number;
    gap?: number;
    /** "paper" tightens the bloom — it needs somewhere dark to fall. */
    ground?: string;
  }): string;

  /** Fear's glow is a property of the pool, ramped rather than linear. */
  export function intensity(cur: number, max: number): number;

  export function setPool(
    row: Element,
    cur: number,
    opts?: { fear?: boolean; max?: number },
  ): void;
}

declare module "*/ui/pool.js" {
  /** The chrome around GEMS: the label, the tally, the row. */
  export function POOL(opts: {
    label?: string;
    cur?: number;
    max?: number;
    scars?: number;
    /** "hope" | "fear" — the hue, and whether the glow rides the pool. */
    tone?: string;
    dark?: boolean;
    head?: boolean;
    sz?: number;
    gap?: number;
  }): string;

  /**
   * The GM's strip. `gm:false` is the same strip without the steppers, which
   * is what every player at the table sees — see `fear-hud.ts`.
   */
  export function FEAR_HUD(opts: { cur?: number; max?: number; gm?: boolean }): string;
}

declare module "*/ui/card.js" {
  export function CARD(opts: any): string;
  /** Fit each card's prose to its plate. Call after the cards are in the DOM. */
  export function fit(scope?: ParentNode): void;
  /** `**bold**`, `*italic*`, then game-term marking on top. */
  export function rich(s: string): string;
}

declare module "*/ui/die.js" {
  /** One die: silhouette, facets and a numeral. No `<svg>`, so it stores. */
  export function DIE(v: number | string, cls: string, sz?: number, mx?: number): string;
  /** Notation to silhouette class. `sq` for the d6 — see the module. */
  export const SHAPE: Record<string, string>;
  export function shapeOf(die: string): string;
  export function facesOf(die: string): number;
}

declare module "*/ui/keep.js" {
  /** A tray of dice a card asks you to keep. */
  export function KEEP(opts: {
    /** bag: several held · climb: one counting up · roll: named, not kept. */
    mode?: string;
    /** The die's size right now: 4, 6, 8, 10 or 12. */
    faces?: number;
    /** The faces held. 0 is a die placed and not yet rolled. */
    dice?: number[];
    /** 0 or absent means an open pool: no ceiling, so no sockets. */
    max?: number;
    name?: string;
    cap?: number;
    /** False for a readout — a posted card is a record and takes no input. */
    add?: boolean;
    /** False where the card's dice arrive already rolled. */
    roll?: boolean;
    /** Whether the host has a domain hue. Stated, never sniffed. */
    dom?: boolean;
    key?: string;
  }): string;

  /** The five a die can be. */
  export const FACES: number[];
  /** Past this many the row states the count rather than enumerating it. */
  export const KEEP_CAP: number;
  /** Face count to silhouette class. */
  export function shapeOf(faces: number): string;

  /** Diff the tray against a new list of faces and move only what moved. */
  export function setKeep(row: Element, dice: number[], faces?: number, max?: number): void;

  /** Tumble one die to a face. `done` fires when it lands. */
  export function landDie(
    kd: Element,
    value: number,
    faces: number,
    done?: () => void,
  ): void;

  /** The flinch a tray plays when it cannot do what was asked. */
  export function refuseKeep(row: Element): void;

  /**
   * Delegate every gesture off one root.
   *
   * `how` is `place`, `take`, `step`, `roll` or `roll1`; `next` is the list
   * the tray should now hold, **except** for the two roll gestures, which
   * hand it back unchanged because the caller owns the RNG. `i` names the
   * die for `take` and `roll1`.
   */
  export function keepClicks(
    root: Element,
    onChange: (row: HTMLElement, next: number[], how: string, i?: number) => unknown,
  ): void;
}

declare module "*/ui/chit.js" {
  /** A row of counters placed on a card. */
  export function CHITS(opts: {
    value?: number;
    /** 0 or absent means an open pool: no ceiling, so no sockets. */
    max?: number;
    /** What one of them is called, for the controls' own labels. */
    name?: string;
    /** The held count at which this becomes one counter plus a multiplier. */
    cap?: number;
    /** False for a readout — a posted card is a record and takes no input. */
    add?: boolean;
    round?: boolean;
    /** Whether the host has a domain hue. Stated, never sniffed. */
    dom?: boolean;
    /** Handed back on `data-key`, so a delegated handler knows the subject. */
    key?: string;
  }): string;

  /** At this held count the row becomes one counter plus a multiplier. */
  export const CHIT_CAP: number;

  /** Diff the row against a new value and animate only what moved. */
  export function setChits(row: Element, value: number, max?: number, name?: string): void;

  /** The flinch a pool plays when it cannot take or give another. */
  export function refuseChits(row: Element): void;

  /**
   * Delegate both gestures off one root. The handler is told the row, the
   * value it should now hold, and which direction the press went.
   */
  export function chitClicks(
    root: Element,
    onChange: (row: HTMLElement, next: number, dir: 1 | -1) => unknown,
  ): void;
}

declare module "*/ui/ledger.js" {
  /**
   * One thing that changed on a sheet.
   *
   * `from` and `to` are the ends of a *window*, not of a write — see
   * `ledger.ts`. A `move` has no quantity and carries them only so a card
   * that left and came straight back can be dropped as a net of zero.
   */
  export interface LedgerEntry {
    kind: "hitPoints" | "stress" | "armorSlots" | "hope" | "pool" | "move";
    from: number;
    to: number;
    /** The ceiling — how many boxes the strip is long. */
    max?: number;
    /** The card's name. Tracks take their own and need none. */
    label?: string;
    /** Hope only: dead sockets past the ceiling, drawn because they are permanent. */
    scars?: number;
    /** A pool only: what one counter is called. */
    name?: string;
    /** A pool or a move: the card's domain hue. */
    dom?: { light: string; dark: string };
    /** A move only: into the loadout rather than out of it. */
    into?: boolean;
  }

  /** One message for everything that settled in one window. */
  export function LEDGER(opts: { who?: string; entries?: LedgerEntry[] }): string;
}

declare module "*/ui/activity.js" {
  import type { LedgerEntry } from "*/ui/ledger.js";

  /** One settled window of changes, as the log holds it. */
  export interface ActivityEntry {
    id?: string;
    when?: string;
    who?: string;
    entries?: LedgerEntry[];
  }

  /** The time, and the card. Prepended one at a time as they land. */
  export function ACTIVITY_ENTRY(entry: ActivityEntry): string;

  /** Nothing yet: what the window is, and why it is empty. */
  export function ACTIVITY_EMPTY(opts: { title?: string; note?: string }): string;

  /** The whole panel, drawn once. Every string arrives localised and escaped. */
  export function ACTIVITY(opts: {
    title?: string;
    count?: string;
    watching?: boolean;
    watchLabel?: string;
    clearLabel?: string;
    off?: string;
    empty?: { title?: string; note?: string };
    events?: ActivityEntry[];
  }): string;
}

declare module "*/ui/tile.js" {
  export function TILE(opts: any): string;
  export function SPINE(opts: any): string;
  export function MINI(opts: any): string;
}

declare module "*/ui/domains.js" {
  export const DOMAINS: any[];
  export const KINDS: Record<string, any>;
  export const byslug: Record<string, any>;
  /** The nine class slugs, lowercase — the filenames under `assets/classes/`. */
  export const CLASSES: string[];
  export function icon(slug: string): Promise<string>;
  export function glyph(name: string): Promise<string>;
  /** A class mark. Not a sigil — see the note in `domains.js`. */
  export function clazz(name: string): Promise<string>;
}

declare module "*/ui/peek.js" {
  export function peeks(win: Element): void;
  /** Shut every open peek — Escape does this, and so does anything about to
      draw over the sheet. */
  export function closePeeks(): void;
}

declare module "*/ui/menu.js" {
  /** One row of a context menu. `sep` makes it a rule instead. */
  export interface MenuRow {
    k: string;
    run?: () => unknown;
    /** Destructive — drawn in the wound's ink. */
    warn?: boolean;
    /** Why it cannot be pressed. Its presence disables the row. */
    off?: string;
    sep?: true;
  }
  /** Open a menu at the pointer. Replaces any menu already open. */
  export function menu(event: MouseEvent, rows: MenuRow[], title?: string): HTMLElement;
  export function closeMenu(): void;
}

declare module "*/ui/prep.js" {
  /** What the popover was asked to offer. */
  export interface PrepOptions {
    /** The meta line: "agility roll". */
    kind?: string;
    /** What is being rolled: "Agility", "Broadsword". */
    label?: string;
    /** The modifier already in the roll, shown beside the name. */
    base: number;
    experiences?: { name: string; modifier: number }[];
    /** How many Hope — or Fear — are available to spend. */
    purse?: number;
    /** "fear" runs the whole popover violet; the GM buys Experience with it. */
    currency?: "hope" | "fear";
    /** Offer the advantage row. Damage has no advantage. */
    advantage?: boolean;
    /**
     * Offer the duality pair. True unless the caller is not rolling two dice
     * against each other, in which case the row would be describing a
     * comparison that is not happening.
     */
    dice?: boolean;
    /**
     * The two duality dice, as notation, both "d12" unless a card moved one.
     * Passed in rather than only chosen here so a caller that already knows —
     * a feature that hands you a d20 Hope Die — opens the popover with the
     * answer in it.
     */
    hope?: string;
    fear?: string;
    /**
     * Advantage the roller did not choose and cannot decline — a rule already
     * acting on them, like Galapa's Retract putting action rolls at
     * disadvantage until they leave the shell. Listed as a named chip rather
     * than folded into the number: an automation you cannot see is
     * indistinguishable from a bug the first time it changes a roll.
     *
     * Nothing on the character sheet fills this in today. It briefly held a
     * full Stress track, which was a misreading — that makes you Vulnerable,
     * and Vulnerable gives advantage to rolls made *against* you.
     */
    forced?: { k: string; v: number; why?: string }[];
    /**
     * `true` offers both buttons, `false` only ROLL, and `"only"` makes the
     * whole popover a reaction — for surfaces that already are one when you
     * press them, like the Evasion crest.
     */
    reaction?: boolean | "only";
  }
  /** Exactly the arguments the roll engine already accepts. */
  export interface PrepResult {
    advantage: number;
    experiences: { name: string; modifier: number }[];
    extra: { k: string; v: number }[];
    reaction: boolean;
    /** The pair, always stated — "d12" when nothing moved it. */
    hope: string;
    fear: string;
  }
  /** Every die a duality roll can be made with, in printed order. */
  export const DUALITY_DICE: string[];
  /** Open against an element. Resolves null when cancelled. */
  export function prep(anchor: Element, opts: PrepOptions): Promise<PrepResult | null>;
  export function closePrep(): void;
}

declare module "*/ui/make.js" {
  /** A rail row, or a heading when `head` is set instead of `k`. */
  export interface ValRow {
    k?: string;
    /** null draws an em dash — the absence of a rule, not a zero. */
    v?: number | string | null;
    /** A qualifier printed small beside the label: "/ 6". */
    sub?: string;
    head?: string;
  }
  export const DASH: string;
  export function VAL(row: ValRow): string;
  export function VALS(rows: ValRow[]): string;
  /** Write new values in and light only what moved. See the note in make.js. */
  export function setVals(root: Element, rows: ValRow[]): void;

  /** Give every card in a `.fcards` grid the smallest art plate any of them
      needed, so the picture line across a row is straight. Run after `fit()`. */
  export function levelPlates(root?: ParentNode): void;

  export function OPT(opts: {
    name: string;
    meta?: string;
    text?: string;
    nums?: { k: string; v: string | number }[];
    /** Why it cannot be taken. Its presence disables the option. */
    why?: string;
    on?: boolean;
  }): string;

  export function TRAY(chips: { v: number; spent?: boolean; armed?: boolean }[]): string;
  export function TRAIT(opts: {
    key: string;
    label: string;
    verbs?: string[];
    v?: number | null;
    open?: boolean;
  }): string;

  /** `+2`, `0`, `−1` — U+2212, and a bare zero. */
  export function sign(n: number): string;

  export function PLATE(opts: {
    done: boolean;
    of: number;
    at: number;
    label: string;
    hint?: string;
  }): string;
}

declare module "*/ui/settle.js" {
  export function settled(el: Element): Promise<void>;
}

declare module "*/ui/track.js" {
  const anything: any;
  export default anything;
}

declare module "*/ui/swap.js" {
  /**
   * Rects of every `[data-fk]` in the window, measured *before* the repaint
   * that moves one of them. Also cancels any travel still in flight, so a
   * second swap is measured against the layout rather than against an
   * animation halfway through it.
   */
  export function capture(win: Element): Map<string, DOMRect>;
  /**
   * Play the difference backwards, after the repaint. `moved` is the
   * `data-fk` of the card that changed hands; `from` overrides its captured
   * rect, for a card already under the pointer; `mode` names the arrival it
   * wears, or null for a move that should travel and nothing more.
   */
  export function flip(
    win: Element,
    before: Map<string, DOMRect>,
    opts?: {
      moved?: string | null;
      from?: DOMRect | null;
      mode?: "recall" | "shelve" | null;
    },
  ): void;
  /** The pointer half — the study page's drag. The sheet does not bind it. */
  export function swaps(root: Element, api: any): void;
}
