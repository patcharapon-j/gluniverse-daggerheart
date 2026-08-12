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

  /* ── raw, and that is the whole of the reactivity ──────────────────
     These three are `$state.raw` for the reason `browse-index.ts`'s entries
     are: plain `$state` deep-proxies the object it is handed and mints a
     signal per property on first read, and a character's snapshot is one
     `system` object plus one per Item — thousands of properties, re-proxied
     on every sync.

     The proxies bought nothing. Fine-grained invalidation is a claim about
     *writes*, and nothing here is ever written to in place: `sync` replaces
     each of these wholesale, so the top-level signal changes identity and
     every reader invalidates regardless of how deeply it read. Svelte does
     not diff the new object against the old one — reassignment was always
     the entire mechanism, and the proxy was pure overhead standing between
     every `$derived` on the sheet and the field it wanted.

     What this costs is that a component may no longer mutate `snap.system`
     and expect the sheet to notice. Nothing does, and nothing should: edits
     go through `doc.update(...)` and come back as a re-render, which is the
     one direction this class has ever supported. */
  system = $state.raw<any>({});
  flags = $state.raw<any>({});
  items = $state.raw<ItemSnapshot[]>([]);

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

  /**
   * Items of one subtype, in sort order.
   *
   * Memoized against the array `sync` last built, because the character sheet
   * asks this two dozen times per pass — once per panel, and again for every
   * `$derived` that narrows one of those lists. The key is the array's own
   * identity rather than `rev`, so a stale bucket is not something this can
   * hand back: `items` is `$state.raw` and only ever replaced, so a new list
   * is a new object and the old cache is unreachable by construction.
   */
  #buckets = new WeakMap<ItemSnapshot[], Map<string, ItemSnapshot[]>>();

  of(type: string): ItemSnapshot[] {
    const items = this.items;
    let byType = this.#buckets.get(items);
    if (!byType) this.#buckets.set(items, (byType = new Map()));
    let list = byType.get(type);
    if (!list) byType.set(type, (list = items.filter((i) => i.type === type)));
    return list;
  }
}
