/**
 * ApplicationV2 ↔ Svelte 5 bridge.
 *
 * A thin base that mounts a Svelte component into an ActorSheetV2 or
 * ItemSheetV2 window and keeps a reactive {@link SheetState} in sync with the
 * document across Foundry's own re-renders. No third-party framework layer.
 *
 * `_renderHTML` returning null is the whole trick: ApplicationV2 is told the
 * content is empty, and `_replaceHTML` mounts Svelte into the window content
 * exactly once. Every subsequent render re-syncs the snapshot instead of
 * rebuilding the DOM — which is what keeps the mark and gem animations alive
 * across an update.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { mount, unmount, type Component } from "svelte";
import { SheetState } from "./sheet-state.svelte.ts";

interface SvelteSheetOptions {
  width?: number;
  height?: number;
  classes?: string[];
}

function svelteSheetMixin(Base: any, component: Component<any>, opts: SvelteSheetOptions) {
  return class extends Base {
    static DEFAULT_OPTIONS = {
      // `dh` carries the palette; `dh-sheet` carries the window chrome.
      classes: ["dh", "dh-sheet", ...(opts.classes ?? [])],
      position: { width: opts.width ?? 920, height: opts.height ?? 820 },
      window: { resizable: true },
      form: { submitOnChange: false, closeOnSubmit: false },
    };

    _dh_svelte: any = null;
    _dh_state: SheetState | null = null;

    /** We render the DOM ourselves; give ApplicationV2 an empty context. */
    async _renderHTML(): Promise<null> {
      return null;
    }

    _replaceHTML(_result: unknown, content: HTMLElement): void {
      if (this._dh_svelte && this._dh_state) {
        this._dh_state.sync(this.document, this);
        return;
      }
      // Resolve the content region whether ApplicationV2 hands us the frame
      // or the `.window-content` directly.
      const target: HTMLElement =
        content?.matches?.(".window-content")
          ? content
          : ((content?.querySelector?.(".window-content") as HTMLElement) ?? content);

      this._dh_state = new SheetState(this.document, this);
      this._dh_svelte = mount(component, {
        target,
        props: { doc: this.document, snap: this._dh_state, app: this },
      });
    }

    /**
     * Neutralize ActorSheetV2's built-in drop handling. The Svelte root owns
     * drops; the bubbled event would otherwise reach the core handler too and
     * create the embedded document a second time.
     */
    async _onDrop(_event: DragEvent): Promise<void> {}

    async _onClose(options: unknown): Promise<void> {
      if (this._dh_svelte) {
        unmount(this._dh_svelte);
        this._dh_svelte = null;
        this._dh_state = null;
      }
      await super._onClose?.(options);
    }
  };
}

export function makeActorSheet(component: Component<any>, opts: SvelteSheetOptions = {}): any {
  return svelteSheetMixin(foundry.applications.sheets.ActorSheetV2, component, opts);
}

export function makeItemSheet(component: Component<any>, opts: SvelteSheetOptions = {}): any {
  return svelteSheetMixin(foundry.applications.sheets.ItemSheetV2, component, {
    width: opts.width ?? 520,
    height: opts.height ?? 620,
    classes: opts.classes,
  });
}

/**
 * Accept a dropped Item onto an Actor sheet.
 *
 * Dropping a card that already belongs to this actor is a sort, not a copy —
 * Foundry's default would happily give you two of the same domain card.
 */
export async function handleActorDrop(actor: any, event: DragEvent): Promise<boolean> {
  const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
  if (data?.type !== "Item") return false;

  const item = await fromUuid(data.uuid);
  if (!item) return false;
  if (item.parent?.id === actor.id) return false;

  await actor.createEmbeddedDocuments("Item", [item.toObject()]);
  return true;
}
