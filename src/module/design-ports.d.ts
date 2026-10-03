/**
 * Types for the two design modules `sheets/card-style.ts` imports directly.
 *
 * Everything else in `design/` reaches the system through
 * `scripts/port-design-js.mjs`, which copies a module into `src/module/ui/`
 * and rewrites its asset URLs; `ui/ui.d.ts` then declares the copy's
 * contract. `ornaments.js` and `framing.js` are not on that script's list
 * yet — the card port landed after it — and neither has an asset URL in it
 * to rewrite, so they are imported from `design/` where they are and
 * declared here instead of being hand-copied into a generated directory.
 *
 * The right end state is the ordinary one: add the card port's modules to
 * `MODULES` in `port-design-js.mjs` and change the two import paths in
 * `card-style.ts` from `../../../design/` to `../ui/`. That is a one-line
 * edit in a file this pass was told to leave alone, so it is named here
 * rather than made.
 *
 * The wildcard is `ui.d.ts`'s: `*` matches the whole relative prefix, so one
 * declaration covers the module from wherever it is imported.
 */

declare module "*/design/ornaments.js" {
  /** The motif a domain wears: its own set, or `plain` past the corebook. */
  export function motifOf(domain?: string): string;

  /**
   * A motif's corner and seam as `url("data:image/svg+xml,…")` strings, for
   * the CSS masks `--dh-orn-corner` and `--dh-orn-seam` read.
   */
  export function ornamentImages(motif: string): { corner: string; seam: string };
}

declare module "*/design/framing.js" {
  /** A hand-marked focus point: shares across and down, and how close in. */
  export interface Focus {
    x: number;
    y: number;
    scale?: number;
  }

  /** The part of a painting a frame should show, in shares of the painting. */
  export interface Region {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface Box {
    width: number;
    height: number;
  }

  export function framedRegion(art: Box, frame: Box, focus: Focus): Region;
  export function regionStyle(region: Region): {
    width: string;
    height: string;
    left: string;
    top: string;
  };
  export function regionCss(region: Region): string;
  export function coverCss(focus: Focus): string;
  export function focusOnArt(focus: Focus): Focus;
  export const SMALLEST_CROP: number;
  export function followSize(frame: Element, onSize: (size: Box) => void): () => void;
}
