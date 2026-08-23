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
import { LOADOUT_LIMIT, TRANSFORMATION_LIMIT } from "../config.ts";
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
 * What the browser is carrying, however it was written.
 *
 * `getDragEventData` is Foundry's own reader and is the right first call, but
 * it is a namespaced static that has moved twice across major versions and
 * throws rather than returning nothing when the payload is not JSON. The
 * payload itself has been the same two lines of JSON on `text/plain` the
 * whole time — it is what our own `onDragStart` writes — so reading it
 * directly is a fallback that cannot go stale.
 */
function readDrop(event: DragEvent): any {
  try {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data) return data;
  } catch {
    /* fall through to the raw payload */
  }
  try {
    return JSON.parse(event.dataTransfer?.getData("text/plain") ?? "");
  } catch {
    return null;
  }
}

/**
 * Every Item subtype that arrives holding a domain card wants to land in the
 * loadout if there is room for it.
 *
 * Dragging a card onto a sheet is the gesture for "I am taking this", and
 * putting it in the vault instead means the gesture is always two gestures —
 * drag, then go to the vault tab and recall it, paying Stress for a card you
 * have not used yet. At the limit it correctly goes to the vault, because at
 * the limit there genuinely is no room and choosing what leaves is the swap's
 * job, not a drop's.
 */
function placeDomainCard(actor: any, source: any): void {
  const limit = actor.system?.loadoutLimit ?? LOADOUT_LIMIT;
  const held = actor.items.filter(
    (i: any) => i.type === "domainCard" && i.system?.inLoadout,
  ).length;
  source.system ??= {};
  source.system.inLoadout = held < limit;
}

/**
 * Accept a dropped Item onto an Actor sheet.
 *
 * Dropping a card that already belongs to this actor is a sort, not a copy —
 * Foundry's default would happily give you two of the same domain card.
 *
 * It says what landed. A drop is a gesture with no result you can see when
 * the thing you dropped goes to a tab you are not looking at, and the
 * commonest one does exactly that: a weapon dragged onto the loadout tab is
 * filed under gear, correctly and invisibly. A one-line notice is the
 * difference between "that did nothing" and "that worked, look over there".
 *
 * @returns the created Items, empty when nothing was accepted.
 */
export async function handleActorDrop(actor: any, event: DragEvent): Promise<any[]> {
  const data = readDrop(event);
  if (data?.type !== "Item" || !data.uuid) return [];

  const item = await fromUuid(data.uuid);
  if (!item) return [];
  // Already ours. Foundry's own default would hand back a duplicate.
  if (item.parent?.id === actor.id) return [];

  /* "A PC can have only one transformation" is printed in its own one-line
     paragraph, and it is the only arity rule in this system a drop can break.
     Everything else a character holds is either genuinely repeatable — two
     classes is multiclassing, twenty domain cards is a vault — or is repeatable
     in a way the rules allow, so `handleActorDrop` has always been deliberately
     type-agnostic and this is the one exception.

     It **refuses** rather than replacing. Replacing would delete a document
     nobody asked it to delete, and a transformation is not a card you shuffle:
     it is the thing that happened to your character, granted by the GM, and
     swapping it is a decision rather than a correction. So the notice names
     what you are already carrying, which is also the instruction — remove that
     one and this one will land. */
  if (item.type === "transformation") {
    const held = actor.items.filter((i: any) => i.type === "transformation");
    if (held.length >= TRANSFORMATION_LIMIT) {
      ui.notifications?.warn(
        game.i18n.format("DAGGERHEART.Warning.OneTransformation", {
          name: actor.name,
          held: held.map((i: any) => i.name).join(", "),
        }),
      );
      return [];
    }
  }

  const source = item.toObject();
  if (source.type === "domainCard") placeDomainCard(actor, source);

  const made = await actor.createEmbeddedDocuments("Item", [source]);
  const [first] = made ?? [];
  if (first) {
    ui.notifications?.info(
      game.i18n.format("DAGGERHEART.Info.Added", {
        name: first.name,
        kind: game.i18n.localize(`TYPES.Item.${first.type}`),
      }),
    );
  }
  return made ?? [];
}
