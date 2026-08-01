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
}

declare module "*/ui/gem.js" {
  export function GEM(opts: {
    on?: boolean;
    scar?: boolean;
    fear?: boolean;
    i?: number;
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

declare module "*/ui/card.js" {
  export function CARD(opts: any): string;
  /** Fit each card's prose to its plate. Call after the cards are in the DOM. */
  export function fit(scope?: ParentNode): void;
  /** `**bold**`, `*italic*`, then game-term marking on top. */
  export function rich(s: string): string;
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
  export function icon(slug: string): Promise<string>;
  export function glyph(name: string): Promise<string>;
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
  }
  /** Open against an element. Resolves null when cancelled. */
  export function prep(anchor: Element, opts: PrepOptions): Promise<PrepResult | null>;
  export function closePrep(): void;
}

declare module "*/ui/settle.js" {
  export function settled(el: Element): Promise<void>;
}

declare module "*/ui/track.js" {
  const anything: any;
  export default anything;
}

declare module "*/ui/swap.js" {
  const anything: any;
  export default anything;
}
