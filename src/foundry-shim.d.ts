/**
 * Minimal ambient types for the Foundry globals this system touches.
 *
 * Deliberately loose: `foundry-vtt-types` does not track v14 yet, and a wrong
 * type is worse than no type here — it would force casts that hide real
 * mistakes. Everything below is `any` on purpose, and the real contract lives
 * in the Foundry source under `resources/app/client/`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  /** Foundry extends Math with a clamp; it is not a standard built-in. */
  interface Math {
    clamp(value: number, min: number, max: number): number;
  }

  const foundry: any;
  /** Foundry ships PixiJS as a global; the canvas layers are built on it. */
  const PIXI: any;
  const game: any;
  const ui: any;
  /** Null until a scene is active, which `apps/targets.ts` has to survive. */
  const canvas: any;
  const CONFIG: any;
  const Hooks: any;
  const Actor: any;
  const Item: any;
  const ChatMessage: any;
  const Roll: any;
  const Die: any;
  const CONST: any;
  const fromUuid: (uuid: string) => Promise<any>;
  const fromUuidSync: (uuid: string) => any;
  const renderTemplate: (path: string, data: any) => Promise<string>;

  interface Window {
    daggerheart?: any;
  }
}

declare module "*.svelte" {
  const component: any;
  export default component;
}

export {};
