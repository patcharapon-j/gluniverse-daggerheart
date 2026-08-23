/**
 * Phil's Token Studio — the seam.
 *
 * The module is a token and portrait editor: crop, frame, effects, a paint
 * mask, and a Save that writes `actor.img` and `prototypeToken.texture.src`.
 * Both of those are fields this sheet already owns a control for — the
 * diorama's **Image** and **Token** buttons open a FilePicker at each — so
 * Studio is a third way to fill the same two slots rather than a new
 * capability, and it belongs beside them rather than in a place of its own.
 *
 * **It publishes no API.** `QuickTokenStudio` is a plain `export` from
 * `scripts/token-studio.js`; there is no `game.modules.get(…).api` and
 * nothing on `globalThis`. So the class is reached by a dynamic `import()`
 * of the module's own file, and that import happens **at the press** rather
 * than at load: a system that imported it at module scope would fail to boot
 * for every table that does not have the module, which is most of them.
 *
 * The path goes through `getRoute` for `assets.ts`'s reason — a Foundry
 * served under a route prefix has one, and a leading `/` would break exactly
 * those installs. It is a URL rather than a specifier, so the bundler leaves
 * it alone; `vite` would otherwise try to resolve a module that is not in
 * this repo and cannot be.
 *
 * **The module also injects itself, and it reaches us.** `main.js` runs a
 * `MutationObserver` on `<body>` for any node carrying `.application` — which
 * every ApplicationV2 window does — and then resolves the actor by taking the
 * last hyphen-separated chunk of the element's id. DocumentSheetV2 builds that
 * id as `${constructor.name}-${uuid}`, so ours ends in the actor id and the
 * lookup succeeds. Its `injectProfileButton` finds nothing (it looks for
 * `.portrait`, `.profile-img`, `img[data-edit=img]` and six more; the diorama
 * is a `div.img` inside `.dio`), so it falls through to the header and lands
 * an `<a class="phils-token-studio-header-btn">` in our `.window-header`.
 *
 * That is a second door to the same room, wearing Foundry's chrome, next to
 * the one we drew. `styles/frame.css` hides it **inside `.dh-sheet` only** —
 * see the rule there. Not a disagreement with the module: every other sheet
 * in the world keeps it, and it is hidden here precisely because we offer the
 * same thing in the place this system puts things.
 *
 * The two remaining paths cannot reach us and need no handling: the 100ms
 * interval matches `.daggerheart.sheet`/`.dh-style.sheet`, and the
 * `renderContextMenu` hook wants a dnd5e menu.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const MODULE_ID = "phils-token-studio";
const ENTRY = `modules/${MODULE_ID}/scripts/token-studio.js`;

/** Is the module installed and switched on in this world? */
export function tokenStudioActive(): boolean {
  return (game as any).modules?.get(MODULE_ID)?.active === true;
}

/**
 * The one Studio window, because the module can only have one.
 *
 * `QuickTokenStudio.DEFAULT_OPTIONS.id` is the fixed string
 * `"phils-token-studio-app-v3"` — not `"…-{id}"` — and ApplicationV2 keys
 * `foundry.applications.instances` on that id at render and *deletes* the
 * entry at close. So a second Studio opened while a first is up overwrites
 * the registry entry, and closing either one unregisters the other: the
 * loser is a window on screen that Foundry no longer knows about. The module
 * itself constructs a new one on every click and wears that.
 *
 * We do not. A press for the actor already being edited brings that window
 * to the front; a press for a different actor closes the first properly
 * before opening the second, which is strictly better than orphaning it.
 * Kept on `rendered` rather than on being non-null, for `activity-log.ts`'s
 * reason: a render that threw would otherwise leave a half-built application
 * standing in the reference forever, and every press afterwards would find
 * something there and do nothing.
 */
let studio: any = null;

/**
 * Open the Studio on an actor.
 *
 * @returns true when a window is up, false when it declined or failed — and
 *   it says why either way rather than failing silently, because a button
 *   that does nothing is indistinguishable from a button nobody wired.
 */
export async function openTokenStudio(doc: any): Promise<boolean> {
  if (!tokenStudioActive()) {
    ui.notifications?.warn(game.i18n.localize("DAGGERHEART.Warning.NoTokenStudio"));
    return false;
  }
  if (doc?.documentName !== "Actor") return false;
  if (!doc.isOwner) {
    ui.notifications?.warn(game.i18n.localize("DAGGERHEART.Warning.TokenStudioNotYours"));
    return false;
  }

  if (studio?.rendered) {
    if (studio.actor === doc) {
      studio.bringToFront?.();
      return true;
    }
    await studio.close();
  }
  studio = null;

  try {
    const mod: any = await import(
      /* @vite-ignore */ (foundry as any).utils.getRoute(ENTRY)
    );
    const Studio = mod?.QuickTokenStudio;
    if (typeof Studio !== "function") {
      throw new Error("phils-token-studio exports no QuickTokenStudio");
    }
    const app = new Studio({ actor: doc });
    await app.render(true);
    studio = app;
    return true;
  } catch (err) {
    // The reference is cleared before the notice so a failed open cannot
    // leave a dead window standing in the singleton.
    studio = null;
    console.error("GLUniverse — Daggerheart | Token Studio failed to open", err);
    ui.notifications?.error(game.i18n.localize("DAGGERHEART.Warning.TokenStudioFailed"));
    return false;
  }
}

/**
 * The header control, for every actor sheet in the system.
 *
 * Two entry points and they are two different questions. The diorama's
 * button is *edit mode* — it sits beside Image and Token, which are the
 * character's own definition and locked with the rest of it. This one is
 * ownership, in the window's control menu next to Foundry's own "Show
 * Portrait Artwork" and "Configure Prototype Token", which is where somebody
 * who has never opened this sheet before goes looking for artwork. The
 * adversary, companion and environment sheets have no diorama at all, so for
 * three of the four subtypes the header is the way in that always exists.
 *
 * `onClick` rather than a registered action, because the entry carries its
 * own handler and an `actions` key on the sheet would be a second place to
 * keep the same fact. `visible` re-asks whether the module is on: header
 * controls are gathered per render, so a world that enables the module mid-
 * session gets the entry on the next open with nothing to reload.
 */
export function tokenStudioHeaderControl(doc: any): any {
  return {
    action: "dhTokenStudio",
    icon: "fa-solid fa-user-pen",
    label: "DAGGERHEART.TokenStudio.Open",
    ownership: "OWNER",
    visible: () => tokenStudioActive(),
    onClick: () => void openTokenStudio(doc),
  };
}
