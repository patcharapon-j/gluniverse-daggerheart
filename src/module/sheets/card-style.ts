/**
 * The two card rules that cannot be written in a stylesheet, injected once.
 *
 * `face.css` and `compact.css` are authored files and they are right to be:
 * everything about a card that is the same for every card belongs in them.
 * Two things are not the same for every card, and neither can be spelled as
 * a static rule, because both are *data* — a motif's path geometry and a
 * painting's hand-marked focus point. So each arrives as one generated rule
 * appended to the document, exactly once, the first time a card that needs
 * it is drawn.
 *
 * This is gluvtt's `useOrnaments` with the hook taken off it. There, a React
 * effect injects a `<style>` per motif the page has shown; here the same
 * thing is a function `cardOf()` calls while it builds the options, which is
 * the only moment in this system that knows a given motif is about to be
 * needed. The guard is the same guard: a motif is written once per session
 * and the second card wearing it costs a `Set` lookup.
 *
 * **One `<style>` element, not one per rule.** 13 motifs and up to 291
 * paintings is a lot of nodes to put in `<head>` one at a time, and the
 * ordering question — which rule wins — is easier to answer about one sheet
 * appended after `face.css` than about a growing pile of them.
 *
 * Safe outside a document. `tools/check-gunslinger.mjs` imports `cardOf` into
 * Node and reads the options it returns; there is nothing to inject into
 * there, and the options do not depend on the injection having happened.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { motifOf, ornamentImages } from "../ui/ornaments.js";
import { coverCss, focusOnArt, type Focus } from "../ui/framing.js";
/* The import attribute is not optional: Node refuses a JSON module without
   it, and `tools/check-gunslinger.mjs` imports this file's caller into Node.
   Vite and tsc both accept it. */
import FOCUS_POINTS from "../../../assets/cards/card-focus.json" with { type: "json" };

export type { Focus };

/**
 * Every painting's focus point, keyed by the path Foundry serves it under.
 *
 * `assets/cards/card-focus.json`'s keys are the full
 * `systems/gluniverse-daggerheart/assets/cards/…` path, which is the same
 * string an Item's `img` already holds — so the lookup is the document's own
 * field and nothing in between does string surgery on it.
 * `tools/check-focus-points.mjs` is what keeps the two in step.
 */
const POINTS = FOCUS_POINTS as Record<string, Focus | undefined>;

/* ── the sheet ────────────────────────────────────────────────────── */

let sheet: HTMLStyleElement | null = null;
const written = new Set<string>();

/** Append one rule, under a key that says what it is, at most once. */
function inject(key: string, css: string): void {
  if (written.has(key)) return;
  written.add(key);
  sheet ??= document.head.appendChild(document.createElement("style"));
  sheet.append(css);
}

const drawing = (): boolean => typeof document !== "undefined";

/* ── ornaments ────────────────────────────────────────────────────── */

/**
 * The motif a domain wears, with its corner and seam masks in the document.
 *
 * Returns the motif name for `motif` on the option object; `FACE()` puts it
 * on `[data-motif]` and `face.css` reads `--dh-orn-corner`/`--dh-orn-seam`
 * off that element. A domain past the corebook gets `plain`, which is a real
 * motif with its own bracket and diamonds rather than an absence.
 *
 * @param domain a domain slug, or a `KINDS` slug — `gear`, `ancestry` — for
 * the cards that belong to no domain. Both resolve through `motifOf`, which
 * is why this takes the slug rather than the motif.
 */
export function useOrnaments(domain?: string): string {
  const motif = motifOf(domain);
  if (!drawing()) return motif;
  const key = `motif:${motif}`;
  if (!written.has(key)) {
    const { corner, seam } = ornamentImages(motif);
    inject(key, `[data-motif="${motif}"]{--dh-orn-corner:${corner};--dh-orn-seam:${seam}}`);
  }
  return motif;
}

/* ── the focus crop ──────────────────────────────────────────────────
   What a card can do about a focus point without measuring anything.

   `framing.js` has two answers and this is the cheap one. The measured
   answer — `framedRegion` against the painting's natural size and the
   frame's box — needs both of those, and a builder that returns a string has
   neither: the image has not loaded and the frame has not been laid out. So
   the marked point is spent here as `framing.js`'s own pre-measurement
   fallback, a cover crop anchored on the point instead of on the middle,
   which is the thing that stops a wide painting's head being cut off by a
   narrow plate. `focus` travels on the option object too, so a surface that
   *does* measure — the peek layer, a chat card after `followSize` — can take
   the region crop from there without looking the painting up again.

   **Keyed on the painting's path, not on a class, and that is a constraint
   rather than a preference.** `.dh-art-paint` and `.dh-cc-art` draw the
   painting as `background: var(--dh-art) center top / cover`, a shorthand
   whose position is written into the authored stylesheet — so overriding it
   needs a selector, and the only per-card hooks the two builders' markup
   offers are `cls` and the inline `style` that carries `--dh-art`. `cls` is
   already spoken for (`marked()`'s frame classes, the Gunslinger card's
   `grow`) and is not where a crop belongs anyway; the painting's own URL is
   in the `style` attribute by construction, and it is also exactly the thing
   the rule is about. One rule per painting actually drawn, which on a
   character sheet is a dozen.

   `scale` is not honoured here, and cannot be: `background-position` moves a
   cover crop, it cannot close in on one. A marking with a `scale` still
   frames on its point, just no tighter than cover — and the measured path
   above is where the close-up happens. */

/** The focus point as a CSS position pair, off `framing.js`'s own rounding. */
const positionOf = (focus: Focus): string =>
  /object-position:\s*([^;]+)/.exec(coverCss(focus))?.[1]?.trim() ?? "center top";

/** A path as a CSS string's contents, for the attribute selector below. */
const quoted = (path: string): string => path.replace(/["\\]/g, "\\$&");

/**
 * The hand-marked focus point for a painting, framed in the document.
 *
 * Returns the point for `focus` on the option object, or nothing at all for
 * a card with no painting or an unmarked one — in which case the painting
 * draws the way it drew before any of this existed, a centred cover crop,
 * which is the fallback `check-focus-points.mjs` exists to stop anybody
 * reaching by accident.
 *
 * @param img the Item's `img`, as Foundry stores it. Not the absolute URL:
 * the markings are keyed by the stored path, and `absolute()` may put a
 * route prefix in front of it.
 */
export function useArtFocus(img?: string): Focus | undefined {
  const marked = img ? POINTS[img] : undefined;
  if (!marked) return undefined;
  const focus = focusOnArt(marked);
  if (drawing()) {
    const at = `[style*="${quoted(img as string)}"]`;
    inject(
      `focus:${img}`,
      `${at} .dh-art-paint,${at} .dh-cc-art{background-position:${positionOf(focus)}}`,
    );
  }
  return focus;
}
