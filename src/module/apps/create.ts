/**
 * The creation window's application shell.
 *
 * Not a document sheet, and that distinction is the reason this file exists
 * rather than reusing `svelte-sheets.ts`. A sheet is *the* view of a document —
 * Foundry registers one per subtype, opens it from the directory, and closes it
 * when the document goes. This is a second window about the same actor, opened
 * on purpose, closable without consequence, and there may be one per character
 * at the table at once.
 *
 * It keeps the sheet's two habits because both are load-bearing:
 *
 *   - `_renderHTML` returns null and `_replaceHTML` mounts Svelte exactly once,
 *     so Foundry's re-renders re-sync a snapshot instead of rebuilding the DOM.
 *     Throwing the markup away on every write would take the rail's landing
 *     animation with it — the thing the whole layout is for.
 *   - the root wears `dh`, or none of the ported stylesheets apply.
 *
 * One window per actor, tracked by id. Opening it twice from two places is a
 * thing people do — the rail plate and a macro — and two windows writing to one
 * actor is two rails disagreeing about which value just landed.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { mount, unmount } from "svelte";
import CreationWindow from "./CreationWindow.svelte";
import { SheetState } from "./sheet-state.svelte.ts";
import { inferFinished } from "./creation.ts";
import { muteLedger, unmuteLedger } from "../ledger.ts";

const open = new Map<string, any>();

function makeApp(): any {
  const { ApplicationV2 } = foundry.applications.api;

  return class CreationApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
      // 1040 leaves 752px of stage beside the 288px rail, which is three
      // option columns at 210 and two at 268 — the widths `make.css` is
      // written for. Narrower and the class panels stack one-up.
      classes: ["dh", "dh-sheet", "dh-make"],
      position: { width: 1040, height: 700 },
      window: { resizable: true, title: "DAGGERHEART.Create.Title" },
    };

    actor: any = null;
    _svelte: any = null;
    _state: SheetState | null = null;

    constructor(options: any = {}) {
      super(options);
      this.actor = options.actor ?? null;
    }

    get title(): string {
      return game.i18n.format("DAGGERHEART.Create.TitleFor", { name: this.actor?.name ?? "" });
    }

    async _renderHTML(): Promise<null> {
      return null;
    }

    _replaceHTML(_result: unknown, content: HTMLElement): void {
      if (this._svelte && this._state) {
        this._state.sync(this.actor, this);
        return;
      }
      const target: HTMLElement =
        content?.matches?.(".window-content")
          ? content
          : ((content?.querySelector?.(".window-content") as HTMLElement) ?? content);

      this._state = new SheetState(this.actor, this);
      this._svelte = mount(CreationWindow, {
        target,
        props: { doc: this.actor, snap: this._state, app: this },
      });
    }

    /** This window is about editing the character, so it follows the sheet's
        own permission rather than inventing one. */
    get isEditable(): boolean {
      return !!this.actor?.isOwner;
    }

    async _onClose(options: unknown): Promise<void> {
      if (this._svelte) {
        unmount(this._svelte);
        this._svelte = null;
        this._state = null;
      }
      if (this.actor?.id && open.delete(this.actor.id)) unmuteLedger(this.actor);
      await (super._onClose as any)?.(options);
    }
  };
}

let Cached: any = null;

/**
 * Open the creation window for an actor, or bring the open one forward.
 *
 * The class is built lazily because `foundry.applications` does not exist at
 * module-evaluation time — the same reason every DataModel in this system wraps
 * its base class in a thunk.
 *
 * **Completion is inferred here**, once, on the first open of a character that
 * predates any of this. A world full of hand-built level-6 characters must not
 * be greeted by a progress bar reading 0 of 6, and the moment somebody opens
 * the window is the only moment we have both the actor and a reason to write to
 * it. See `inferFinished` for why the test is deliberately generous.
 */
export async function openCreation(actor: any): Promise<any> {
  if (!actor) return null;

  const existing = open.get(actor.id);
  if (existing) {
    existing.bringToFront?.();
    return existing;
  }

  if (!actor.system?.creation?.finished && inferFinished(actor) && actor.isOwner) {
    await actor.update({ "system.creation.finished": true });
  }

  Cached ??= makeApp();
  const app = new Cached({ actor });
  open.set(actor.id, app);
  /* Nothing this window does goes in the change log, for the rest dialog's
     reason: finishing posts a card that is the whole character. And most of
     what it writes is not an event anyway — the opening two Hope is a rule
     being applied for the first time, not somebody gaining two Hope, and a
     class swap in session four would announce a track's base moving as though
     the character had been hit. Held for as long as the window is, since a
     player comes back to this over weeks. */
  muteLedger(actor);
  await app.render(true);
  return app;
}

/** Foundry re-renders open applications itself for sheets; this is not one. */
export function refreshCreation(actor: any): void {
  open.get(actor?.id)?.render?.(false);
}

/** Cached choices must be fetched again after the GM changes available content. */
export function closeCreationForContentChange(): void {
  for (const app of open.values()) void app.close();
}
