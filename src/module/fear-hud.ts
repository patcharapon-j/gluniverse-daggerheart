/**
 * The Fear pool, docked in Foundry's chrome.
 *
 * Fear had a complete model and no surface. `settings.ts` has owned the number
 * since the beginning — world-scoped, GM-writable, capped at twelve — and the
 * only way a human could see it was `game.daggerheart.fear.get()` in a macro.
 * A pool the rules ask the GM to keep *visible to the table* was, in practice,
 * a number one person could look up.
 *
 * So the strip goes in the chrome rather than in a window, and the difference
 * is not convenience. A surface you have to open is a surface that is shut
 * almost all of the time, and the whole claim this component makes is that the
 * table can see the pool without asking anybody for it. That is also why there
 * is no setting to hide it from players: `design/pool.css` argues the point in
 * its own comments, and a switch to turn it off would be this system offering
 * to break the rule it drew the component around.
 *
 * **Players get the same strip minus the steppers**, not a different strip.
 * `FEAR_HUD`'s `gm` flag is the whole of the difference, and the tally is
 * present on both — a GM says "I have four Fear" out loud, and neither of them
 * should have to count pips to do it.
 *
 * ── the underside, which is not about Fear at all ────────────────────
 * The strip is also the only piece of this system's chrome that is always on
 * screen, so it has become where the controls with nowhere else to go live.
 * There are two groups and the split is **whose they are**:
 *
 * - **left, the view switch** — whether this screen draws the token chips. It
 *   is on the players' strip too, which is the one press here they may make,
 *   and that follows from the setting rather than from generosity:
 *   `tokenChip` is client-scoped, a preference about one screen. A player who
 *   finds the rings busy should not have to ask the GM about it. It never
 *   touches `adversaryChip`, which is world-scoped and stays the GM's.
 * - **right, `scene` and `session`** — the two refresh scopes nothing in
 *   Foundry can infer, and both reach every character at the table. GM only.
 *
 * The switch differs from those two in kind and not merely in scope: they are
 * acts and it is a **state**, so it has to read as on or off standing still.
 * It says so in `aria-pressed`, which is the accessible name for exactly this
 * and doubles as the styling hook — one source of truth rather than a class
 * kept in step by hand.
 *
 * None of that weakens the paragraph above. The claim there is that the *pool*
 * may not be hidden; a control that hides something else, on one screen, at
 * its owner's request, is a different thing entirely.
 *
 * ── what a study page could not see ──────────────────────────────────
 * Two things, and both are Foundry's chrome rather than the component:
 *
 * - `#ui-middle` is `pointer-events:none`, so a strip appended into it looks
 *   live and is not. `frame.css` takes them back for the strip alone.
 * - `.hud` is not a name we may ship unqualified. `port-design-css.mjs`
 *   rewrites it to the compound `.dh.hud` — the fifth thing this system draws
 *   outside a sheet, after the drag proxy, the context menu, the roll popover
 *   and the rules panel's peek host — so the element wears *both* classes and
 *   gets the palette from `.dh` and its shape from `.hud`.
 *
 * The dock is `#ui-top`, which is where the two supported generations put
 * something rather different: on v13 it holds the scene navigation, so the
 * strip lands under the scene tabs; on v14 the navigation has moved to
 * `#ui-left-column-2` and `#ui-top` is a centred column holding little else,
 * so the strip lands top-centre. Both are the same claim — above the canvas,
 * never collapsed, competing with nothing — which is why one selector serves
 * both rather than a version check choosing between two docks.
 *
 * ── the record, not a second opinion ─────────────────────────────────
 * The strip is rendered *once* and driven afterwards through `setPool`, the
 * same contract `Gems.svelte` and `Marks.svelte` keep on the sheet. Rebuilding
 * the markup on every change would cut off a spent pip's afterglow mid-fade
 * and restart the pool-wide `--i` ramp, which is the thing that sells twelve
 * as worse than eleven. The tally is the one part written as text, because it
 * is text.
 *
 * Nothing here holds a copy of the number. `daggerheart.fearChanged` fires on
 * every client from the setting's own `onChange`, so the pool is read from the
 * setting and the strip is only ever told what it now is.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "./config.ts";
import { FEAR_MAX, getFear, setFear } from "./settings.ts";
import { intensity, setPool } from "./ui/gem.js";
import { FEAR_HUD } from "./ui/pool.js";

/** Where the strip docks. See the note above on v13 versus v14. */
const DOCK = "#ui-top";

let strip: HTMLElement | null = null;

export function registerFearHud(): void {
  const dock = document.querySelector(DOCK);
  if (!dock) {
    /* Loud rather than silent. A renamed region is a Foundry change we would
       otherwise discover as "the Fear pool stopped existing", with nothing on
       screen and nothing in the log to say why. */
    console.error(
      `${SYSTEM_ID} | no ${DOCK} to dock the Fear strip in — ` +
        `Foundry's layout has changed and fear-hud.ts needs a new dock.`,
    );
    return;
  }

  strip?.remove();

  const host = document.createElement("div");
  host.innerHTML = FEAR_HUD({
    cur: getFear(),
    max: FEAR_MAX,
    gm: !!game.user?.isGM,
    chips: chipsOn(),
  });
  strip = host.firstElementChild as HTMLElement | null;
  if (!strip) return;

  /* The compound the port script rewrote to. `.hud` alone would take the
     shape and none of the palette; `.dh` alone the palette and none of the
     shape. */
  strip.classList.add("dh");
  dock.append(strip);

  strip.addEventListener("click", onPress);
  Hooks.on("daggerheart.fearChanged", show);
  Hooks.on("daggerheart.fearRefused", refuse);
  /* The switch is a *reading* of the setting, never a second copy of it. The
     press writes the setting, the setting's own `onChange` raises this, and
     this is the only thing that ever moves the button — so the strip and the
     checkbox in Foundry's own settings window cannot disagree, whichever one
     you used. `token-hud.ts` is listening to the same hook for the same
     reason, and neither knows about the other. */
  Hooks.on("daggerheart.tokenChipChanged", showChips);
}

/** Whether this screen is drawing the token chips. Client-scoped: mine, not the table's. */
const chipsOn = (): boolean => game.settings?.get(SYSTEM_ID, "tokenChip") !== false;

/** Told what the switch now is, exactly as `show` is told what the pool now is. */
function showChips(): void {
  const button = strip?.querySelector("[data-chip]");
  button?.setAttribute("aria-pressed", chipsOn() ? "true" : "false");
}

/**
 * A press on the strip — the steppers, the two cycle buttons, or the switch.
 *
 * The stepper's bounds are tested here rather than left to `setFear`'s clamp,
 * because a clamp answers by doing nothing and this control has to answer by
 * saying no. That is the Stress track's rule reaching the GM's side of the
 * table: the thing that cannot pay is the thing that flinches.
 */
async function onPress(event: Event): Promise<void> {
  /* The view switch, and it is the one press on this strip a player may make.
     `tokenChip` is client-scoped — a preference about one screen rather than a
     ruling about the table — which is exactly why it is not gated on `isGM`
     the way everything else here is. It writes the setting and nothing else:
     the button's own state comes back through `showChips`. */
  const chip = (event.target as HTMLElement).closest<HTMLElement>("[data-chip]");
  if (chip) {
    await game.settings?.set(SYSTEM_ID, "tokenChip", !chipsOn());
    return;
  }

  const refresh = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-refresh]");
  if (refresh && game.user?.isGM) {
    const scope = refresh.dataset.refresh;
    const action =
      scope === "scene"
        ? (game as any).daggerheart?.endScene
        : scope === "session"
          ? (game as any).daggerheart?.endSession
          : null;
    if (!action || refresh.disabled) return;
    refresh.disabled = true;
    try {
      await action();
    } finally {
      refresh.disabled = false;
    }
    return;
  }

  const button = (event.target as HTMLElement).closest<HTMLElement>("[data-f]");
  if (!button || !game.user?.isGM) return;

  const step = Number(button.dataset.f);
  const next = getFear() + step;
  if (next < 0 || next > FEAR_MAX) return refuse();
  await setFear(next);
}

/**
 * Told what the pool now is. Never asked to work it out.
 *
 * Three things move and none of them is a rebuild. The pips diff through
 * `setPool`; the tally is written as text, because it is text; and `--i` is
 * the strip's own intensity, which every layer on it — the field, the weave,
 * the corner bleed, the sockets, the rim — is written as a function of.
 * Setting the one property is what makes the whole strip ease together
 * rather than snap, and `pool.css` puts the transition on `.hud` for it.
 *
 * The gems carry their own inline `--i` as well, written by `setPool` and
 * winning over what they inherit from here. That is not a second opinion:
 * both are `intensity(cur, max)` of the same number, and a pip needs its
 * own because `GEMS` is also drawn on sheets that have no strip around it.
 */
function show(cur: number): void {
  if (!strip) return;
  const row = strip.querySelector(".gems");
  if (row) setPool(row, cur, { fear: true, max: FEAR_MAX });
  const tally = strip.querySelector(".tally");
  if (tally) tally.innerHTML = `${cur}<s>/${FEAR_MAX}</s>`;
  strip.style.setProperty("--i", intensity(cur, FEAR_MAX).toFixed(3));
}

/**
 * The refusal, and it is the pool that shakes rather than the strip: `.deny`
 * is `pool.css`'s own animation and the character sheet's `refusePool` plays
 * exactly this on the Hope gems. One gesture, both sides of the table.
 *
 * Also what `payFearFor` fires instead of a notification. A warning toast is
 * a panel explaining itself over the top of the number that already said no,
 * and until this strip existed there was no number on screen to say it.
 */
function refuse(): void {
  const pool = strip?.querySelector(".pool");
  if (!pool) return;
  pool.classList.remove("deny");
  void (pool as HTMLElement).offsetWidth; // restart, not resume
  pool.classList.add("deny");
  setTimeout(() => pool.classList.remove("deny"), 600);
}
