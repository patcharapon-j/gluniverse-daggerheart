/**
 * The compendium browser's application shell.
 *
 * `create.ts`'s shape with one thing taken away: there is no document. The
 * creation window is a second view of one actor, so it is tracked per actor and
 * re-rendered when that actor changes; this is a view of a *collection*, and
 * the collection is the world's. So it is a singleton — a second copy would be
 * a second search running beside the first, and nothing on screen is owned by
 * anybody, so there is nothing for two of them to disagree about.
 *
 * It keeps the same two habits, and both are load-bearing for the same reasons:
 *
 *   - `_renderHTML` returns null and `_replaceHTML` mounts Svelte exactly once,
 *     so Foundry's re-renders never rebuild the DOM. Here that protects the
 *     search field's caret and the body's scroll position, which a rebuild
 *     would throw away on any render at all.
 *   - the root wears `dh`, or none of the ported stylesheets apply.
 *
 * Foundry never re-renders it, because that courtesy goes to registered sheets
 * and this is not one. It does not need to: the window holds its own index and
 * `dropPack` is what says a pack has changed underneath it.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { mount, unmount } from "svelte";
import BrowseWindow from "./BrowseWindow.svelte";
import { dropPack } from "./browse-index.ts";

let open: any = null;

function makeApp(): any {
  const { ApplicationV2 } = foundry.applications.api;

  return class BrowseApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
      /* 1080 leaves 827px of stage beside the 252px rail, which is three card
         columns at about 250 and a weapon table whose feature column still
         holds a sentence. Narrower and the table's last column starts wrapping
         every row, which is the one thing a table may not do. */
      classes: ["dh", "dh-sheet", "dh-browse"],
      position: { width: 1080, height: 720 },
      window: { resizable: true, title: "DAGGERHEART.Browse.Title" },
    };

    _svelte: any = null;

    async _renderHTML(): Promise<null> {
      return null;
    }

    _replaceHTML(_result: unknown, content: HTMLElement): void {
      if (this._svelte) return;
      const target: HTMLElement =
        content?.matches?.(".window-content")
          ? content
          : ((content?.querySelector?.(".window-content") as HTMLElement) ?? content);

      this._svelte = mount(BrowseWindow, { target, props: { app: this } });
    }

    async _onClose(options: unknown): Promise<void> {
      if (this._svelte) {
        unmount(this._svelte);
        this._svelte = null;
      }
      if (open === this) open = null;
      await (super._onClose as any)?.(options);
    }
  };
}

let Cached: any = null;

/** Open the browser, or bring the open one forward. */
export async function openBrowser(): Promise<any> {
  if (open) {
    open.bringToFront?.();
    return open;
  }
  Cached ??= makeApp();
  open = new Cached();
  await open.render(true);
  return open;
}

/* ══════════════════════════════════════════════════════════════════════
   GETTING TO IT

   Two ways in, and they are two different people. The **compendium sidebar**
   is where somebody already looking for a document is standing, and a button
   at the head of that tab is the shortest possible correction of the thing
   this window exists to correct — it is offered beside the six packs whose
   flat name lists are the problem. The **API** is for a macro and for a
   module, which is how `openCreation` is reached too.

   No scene control and no button on the character sheet. A scene control is
   the GM's toolbar and this is not a GM tool; the sheet already has a way to
   take a domain card that knows which ones are legal, and a second button
   beside it offering the unfiltered 189 would be the sheet arguing with
   itself about what you may have.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Anybody may browse. There is nothing here to gate: every pack this reads is
 * one Foundry has already decided the user can see — `game.packs` is filtered
 * by ownership before we get it — and a player who can drag a card off the
 * sidebar can drag one out of here. Gating it on `isGM` would take the
 * player's own card list away for no rule anybody could name.
 */
export function registerBrowser(): void {
  Hooks.on("renderCompendiumDirectory", (_app: any, html: any) => {
    const root: HTMLElement =
      html instanceof HTMLElement ? html : (html?.[0] ?? html?.element ?? null);
    if (!root || root.querySelector(".dh-browse-btn")) return;

    const button = document.createElement("button");
    button.type = "button";
    /* `dh` for the palette and nothing else. Every token in this system is
       declared on `.dh` — the port moved them off `:root` so `--ink` and
       `--paper` could not leak into every other package on the page — so an
       element outside one resolves none of them. Same reason the drag proxy,
       the context menu, the roll popover, the peek host and the Fear HUD all
       wear it while living outside every sheet. */
    button.className = "dh dh-browse-btn";
    button.innerHTML = `<i class="fa-solid fa-book-open-reader"></i> ${foundry.utils.escapeHTML(
      game.i18n.localize("DAGGERHEART.Browse.Open"),
    )}`;
    button.addEventListener("click", () => void openBrowser());

    /* Above the pack list, which is what it is an alternative to. The header
       is where Foundry itself puts the directory's own controls, and the
       selector falls through because it has moved once already across the two
       supported generations — a button appended to the tab root is in the
       wrong place and still works, which is the right way round for chrome we
       do not own. */
    const header =
      root.querySelector(".directory-header") ??
      root.querySelector("header") ??
      root;
    header.prepend(button);
  });

  /* A pack the GM has edited is a pack our index is now wrong about. Foundry
     fires the ordinary document hooks for compendium documents with `pack`
     set, so this needs no compendium-specific machinery — and it is the same
     three hooks the creation window listens to, for the same reason. */
  for (const hook of ["createItem", "updateItem", "deleteItem", "createActor", "updateActor", "deleteActor"]) {
    Hooks.on(hook, (doc: any) => {
      if (doc?.pack) dropPack(doc.pack);
    });
  }
}
