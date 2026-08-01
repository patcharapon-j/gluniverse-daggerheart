/**
 * Reactive snapshot of a Foundry document for Svelte 5.
 *
 * Foundry documents are not deeply reactive, so instead of trying to observe
 * them we keep a plain runes-backed snapshot here. The sheet re-syncs it
 * every time Foundry re-renders — which it does after any update — and
 * components read from the snapshot. Edits flow the other way through
 * `doc.update(...)`, which triggers the re-render → re-sync → refresh.
 *
 * The important consequence is that the DOM is never thrown away. A
 * Handlebars sheet rebuilds its markup on every change, which would take the
 * mark animations with it: a wound that lands over 160ms and then bleeds for
 * 340ms cannot survive its own element being replaced at 40ms. Fine-grained
 * updates are not a preference here, they are what makes the motion possible.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ItemSnapshot {
  id: string;
  uuid: string;
  name: string;
  type: string;
  img: string;
  sort: number;
  system: any;
}

export class SheetState {
  name = $state("");
  img = $state("");
  type = $state("");
  system = $state<any>({});
  flags = $state<any>({});
  items = $state<ItemSnapshot[]>([]);

  /**
   * Whether the viewing user may modify the document. Mirrors the sheet's
   * `isEditable` (ownership plus compendium locks), falling back to raw
   * ownership when no app is available. Components gate every write on it.
   */
  editable = $state(false);
  /** Exactly LIMITED, not OBSERVER or OWNER: a stripped portrait-only view. */
  limited = $state(false);
  /** Bumped on every sync so a component can force a dependency on freshness. */
  rev = $state(0);

  constructor(doc: any, app?: any) {
    this.sync(doc, app);
  }

  sync(doc: any, app?: any): void {
    this.name = doc.name;
    this.img = doc.img;
    this.type = doc.type;
    this.editable = app?.isEditable ?? !!doc.isOwner;
    try {
      const user = game?.user;
      this.limited =
        !!user &&
        !!doc.testUserPermission?.(user, "LIMITED") &&
        !doc.testUserPermission?.(user, "OBSERVER");
    } catch {
      this.limited = false;
    }
    // deepClone rather than a reference: the snapshot has to be a value, or
    // Svelte cannot tell that anything changed.
    this.system = foundry.utils.deepClone(doc.system);
    this.flags = foundry.utils.deepClone(doc.flags ?? {});
    this.items = doc.items
      ? [...doc.items]
          .map((i: any) => ({
            id: i.id,
            uuid: i.uuid,
            name: i.name,
            type: i.type,
            img: i.img,
            sort: i.sort ?? 0,
            system: foundry.utils.deepClone(i.system),
          }))
          .sort((a, b) => a.sort - b.sort)
      : [];
    this.rev++;
  }

  /** Items of one subtype, in sort order. */
  of(type: string): ItemSnapshot[] {
    return this.items.filter((i) => i.type === type);
  }
}
