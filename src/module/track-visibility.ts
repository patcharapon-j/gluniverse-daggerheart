/**
 * Whether a token's chip draws its resource tracks at all.
 *
 * An improvised creature has no stat block behind it, so its Hit Points,
 * Stress and Armor are whatever the schema defaulted to, and arcs counting
 * a number nobody chose are worse than no arcs. This is not a permission —
 * `adversaryChip` already says who may read a creature — it is a statement
 * that there is nothing to read, so it applies to the GM too.
 *
 * Two layers. `adversaryTracks` is the world default for every adversary,
 * and a per-token flag overrides it either way, so a GM can hide one
 * improvised bandit in a statted fight, or show the one statted boss in a
 * room of improvised ones. The flag lives on the TOKEN document rather than
 * the actor, because improvising is usually one generic actor dropped many
 * times, unlinked, and each copy is its own question.
 *
 * What survives hiding is everything that is not a number: the identity
 * hairline, the selection crown, the target reticle, conditions and the
 * corpse. The chip stays an object on the creature rather than vanishing.
 */

import { SYSTEM_ID } from "./config.ts";

export const TRACKS_FLAG = "tracks";

type Choice = "shown" | "hidden";

/** The token's own answer, or undefined when it defers to the world. */
const ownChoice = (doc: any): Choice | undefined => {
  const own = doc?.getFlag?.(SYSTEM_ID, TRACKS_FLAG);
  return own === "shown" || own === "hidden" ? own : undefined;
};

/** True when this token's chip should draw no tracks and no Difficulty. */
export function tracksHidden(doc: any): boolean {
  const own = ownChoice(doc);
  if (own) return own === "hidden";
  if (doc?.actor?.type !== "adversary") return false;
  return game.settings?.get(SYSTEM_ID, "adversaryTracks") === "hidden";
}

/**
 * A Token HUD press, GM-only, on adversaries. It writes an explicit choice
 * rather than clearing to the default, so flipping the world default later
 * does not silently undo a token somebody already decided about.
 */
export function registerTrackVisibility(): void {
  Hooks.on("renderTokenHUD", (hud: any, element: any) => {
    const root: HTMLElement | null =
      element instanceof HTMLElement ? element : (element?.[0] ?? null);
    const doc = hud?.object?.document;
    if (!root || !doc || !game.user?.isGM) return;
    if (doc.actor?.type !== "adversary") return;
    const col = root.querySelector(".col.right");
    if (!col) return;

    for (const stale of col.querySelectorAll("[data-dh-tracks]")) stale.remove();

    const hidden = tracksHidden(doc);
    const press = document.createElement("button");
    press.type = "button";
    press.className = `control-icon${hidden ? " active" : ""}`;
    press.dataset.dhTracks = "";
    press.innerHTML = `<i class="fa-solid ${hidden ? "fa-heart-circle-xmark" : "fa-heart-pulse"}" inert></i>`;
    press.dataset.tooltipText = game.i18n.localize(
      hidden ? "DAGGERHEART.Tracks.Show" : "DAGGERHEART.Tracks.Hide",
    );
    press.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await doc.setFlag(SYSTEM_ID, TRACKS_FLAG, hidden ? "shown" : "hidden");
      hud.render();
    });
    col.appendChild(press);
  });
}
