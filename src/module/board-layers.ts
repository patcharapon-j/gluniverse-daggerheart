/**
 * The stack our two board layers live in.
 *
 * Both of them are HTML over the board — the chips in `token-hud.ts`, the
 * range rings in `range-ruler.ts` — both are children of `#hud` for the
 * reason written at length at the head of `token-hud.ts`, and both used to
 * be hung there directly. That is what drew a chip on top of Foundry's own
 * Token HUD.
 *
 * ── why `#hud` is not a place to state this ──────────────────────────
 * Everything else Foundry puts in `#hud` carries no `z-index` at all: the
 * Token HUD's button columns, `#measurement`, the chat bubbles. Against
 * `auto` the only thing that can decide is a number of ours, so the chip
 * layer's `z-index:1` won outright, and it won over exactly the buttons you
 * opened in order to act on the creature the chip is describing.
 *
 * Dropping that to `0` is not the fix, because the two layers also have to
 * be ordered against EACH OTHER and that ordering is its own claim: a ruler
 * ring may not draw over a chip's arc. Both facts cannot be stated on
 * `#hud`'s own children at once — there is no pair of z-indexes that is
 * ordered between themselves and still under `auto`, and the pair that is
 * (`-2`, `-1`) only stays visible while the host happens to be a stacking
 * context, which is a property of somebody else's element and not a thing
 * this system may rely on.
 *
 * So the pair gets a stack of its own: one element, first in `#hud`, with a
 * `z-index` of zero. Zero is doing two jobs and both are load-bearing. It
 * is a stacking context, so the `0` and the `1` inside are settled between
 * our two layers and stop being claims about anybody else's HUD; and it is
 * not positive, so DOM order decides against Foundry's furniture, and the
 * furniture is appended after us by Foundry's own `_insertElement`.
 *
 * ── inline rather than in `token.css` ────────────────────────────────
 * The stack is not a design component. The study pages host the layers
 * directly and have no furniture to sit under, so there is nothing there
 * for it to do; it exists because Foundry's `#hud` has other tenants. That
 * makes it a fact about the host, which is what this file and the head of
 * `token-hud.ts` are for, rather than a fact about the chip.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const STACK = "dh-board-stack";
const STYLE = "position:absolute;inset:0;pointer-events:none;z-index:0;transform-origin:0 0";

/* Asked of `canvas.hud` first, because that is the API and it is what will
   still be right if Foundry ever moves the element. */
function hudElement(): HTMLElement | null {
  const el = (globalThis as any).canvas?.hud?.element ?? document.querySelector("#hud");
  return el instanceof HTMLElement ? el : null;
}

/**
 * The element both board layers hang inside, made if it is not there.
 *
 * Returns null when there is nowhere to hang it, which both callers already
 * have to handle: `#hud` is an ApplicationV2 and does not exist before it
 * has rendered once.
 */
export function boardStack(): HTMLElement | null {
  const host = hudElement();
  if (!host) return null;
  const found = host.querySelector(`:scope > .${STACK}`);
  if (found instanceof HTMLElement) return found;
  /* `#hud`'s `_replaceHTML` assigns `innerHTML`, so the stack goes the same
     way the layers do on every render of it and is remade here rather than
     watched for. */
  const stack = document.createElement("div");
  stack.className = STACK;
  stack.style.cssText = STYLE;
  host.prepend(stack);
  return stack;
}

/** For the diagnostics both layers report. */
export function boardStackHosted(layer: HTMLElement | null): boolean {
  const host = hudElement();
  const stack = host?.querySelector(`:scope > .${STACK}`) ?? null;
  return !!layer && !!stack && layer.parentElement === stack;
}
