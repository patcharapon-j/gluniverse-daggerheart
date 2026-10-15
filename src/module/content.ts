/**
 * The content library — which books, frames and homebrew this world plays with.
 *
 * Content arrives from three kinds of place and used to be switched in three
 * different ways, or not at all. The ten SRD variants had ten checkboxes in
 * Configure Settings, the 0.1 playtest Gunslinger had an eleventh, and the
 * corebook, *Hope and Fear*, *The Twilight Marked* and every homebrew pack
 * somebody installed had none: a table running the corebook alone still met Dread cards in the
 * deck, Assassins in creation and Hope and Fear's adversaries in the browser.
 *
 * So a **source** is the unit, and it is the unit a table actually decides in:
 * "we are playing core and Hope and Fear, with our own homebrew". It is not the
 * pack. The domain pack is the corebook's nine decks, Dread and Root and Void
 * in one list, and a pack switch would have been all of them or none. Every
 * document this system builds carries its source in a flag (`fromSource` in
 * `src/packs-src/_helpers.mjs`, enforced by `build-packs.mjs`); a pack from
 * another package is its own source, `pack:<collection>`, because the pack is
 * the only thing a homebrew module is guaranteed to have.
 *
 * ── what switching one off does ──────────────────────────────────────
 * It gates **offering**, never **holding**. A disabled source leaves the
 * compendium browser, character creation, the domain card pickers, drag-in,
 * and the players' compendium sidebar. A card a character already holds is
 * theirs: it is an embedded copy, it keeps working, and nothing deletes it.
 * The GM still sees every pack, dimmed, because the GM is who switches them.
 *
 * ── one store, and the old switches stay where they were ─────────────
 * The variants keep their own Boolean settings, because
 * every reader of them already exists and a world upgrading has them set. The
 * library writes those settings rather than a copy of them, so the window and
 * Configure Settings cannot disagree. Everything new is one list of what is
 * *off*, so a source added in a later release arrives switched on — the
 * opposite would silently hide a book somebody already owns.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "./config.ts";
import { VARIANTS, variantEnabled, type Variant } from "./variants.ts";

export const CONTENT_CHANGED = "daggerheart.contentChanged";

export type SourceKind = "book" | "frame" | "homebrew";

export interface SourceDef {
  id: string;
  kind: SourceKind;
  /** i18n keys. */
  label: string;
  hint: string;
  /** An existing Boolean world setting that already stores this switch. */
  setting?: string;
  /** Domains that exist only because this source does. */
  domains?: readonly string[];
}

const variantKey = (v: Variant): string => v[0]!.toUpperCase() + v.slice(1);

/**
 * Every source this system ships, in the order the library lists them.
 *
 * `build-packs.mjs` restates the ids in `CONTENT_SOURCES`, and
 * `tools/check-content.mjs` asserts the two lists agree.
 */
export const SOURCES: readonly SourceDef[] = [
  { id: "core", kind: "book", label: "DAGGERHEART.Content.Core", hint: "DAGGERHEART.Content.CoreHint" },
  {
    id: "hopeAndFear",
    kind: "book",
    label: "DAGGERHEART.Content.HopeAndFear",
    hint: "DAGGERHEART.Content.HopeAndFearHint",
    domains: ["dread"],
  },
  {
    id: "twilightMarked",
    kind: "frame",
    label: "DAGGERHEART.Content.TwilightMarked",
    hint: "DAGGERHEART.Content.TwilightMarkedHint",
    domains: ["root", "void"],
  },
  ...VARIANTS.map(
    (v): SourceDef => ({
      id: `variant:${v}`,
      kind: "frame",
      label: `DAGGERHEART.Variant.${variantKey(v)}`,
      hint: `DAGGERHEART.Variant.${variantKey(v)}Hint`,
      setting: v,
    }),
  ),
  /* This system's own homebrew, as one switch: Rattin and Avori, and the
     Gunslinger with its Corsair subclass and the Flint deck. They are filed in
     the ordinary packs beside the books and stamped with this source.

     The 0.1 playtest Gunslinger was a source of its own here, with its own
     packs and its own setting. It is retired rather than carried: a copy a
     character holds keeps working (`sourceOf` answers `null` for a document
     from a pack that no longer exists, and owned copies are never refused),
     and Artifice stays registered in `DOMAINS` so those cards still load. */
  {
    id: "gluniverse",
    kind: "homebrew",
    label: "DAGGERHEART.Content.Gluniverse",
    hint: "DAGGERHEART.Content.GluniverseHint",
    domains: ["flint"],
  },
];

export const DISABLED_SOURCES = "disabledSources";
export const DISABLED_PACKS = "disabledPacks";

/** The flag paths a compendium index has to carry for `sourceOf` to answer. */
export const INDEX_FIELDS = [`flags.${SYSTEM_ID}.source`] as const;

const sourceById = new Map(SOURCES.map((s) => [s.id, s]));
export const sourceDef = (id: string): SourceDef | undefined => sourceById.get(id);

/** Is this pack one this system ships, rather than somebody's homebrew? */
export const isOurPack = (collection: string): boolean =>
  collection.startsWith(`${SYSTEM_ID}.`);

/* Read rather than cached, and tolerant of being asked before the settings are
   registered — `variants.ts`'s reasoning. A list that is not a list is empty. */
function readList(key: string): string[] {
  try {
    const v = game.settings?.get(SYSTEM_ID, key);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

const packOfUuid = (uuid: string): string | null => {
  const m = /^Compendium\.([^.]+\.[^.]+)\./.exec(uuid ?? "");
  return m ? m[1]! : null;
};

/**
 * Which source a document or index entry came from, or `null` for one that
 * came from no source at all — an Item a GM made in the world directory.
 *
 * The flag is the answer. The fallback is for documents built before there
 * was one: the pack a document lives in or was imported from.
 */
export function sourceOf(doc: any, pack?: string): string | null {
  const stamped = doc?.flags?.[SYSTEM_ID]?.source ?? doc?.[`flags.${SYSTEM_ID}.source`];
  if (stamped) return String(stamped);

  const from = pack ?? doc?.pack ?? packOfUuid(doc?._stats?.compendiumSource ?? "");
  if (!from) return null;
  return isOurPack(from) ? null : `pack:${from}`;
}

/** Is this source switched on in this world? */
export function sourceEnabled(id: string | null): boolean {
  if (!id) return true;
  if (id.startsWith("pack:")) return !readList(DISABLED_PACKS).includes(id.slice(5));
  const def = sourceById.get(id);
  if (def?.setting) return variantEnabled(def.setting as Variant);
  return !readList(DISABLED_SOURCES).includes(id);
}

/** May a domain be offered — false only when the one source that brings it is off. */
export function domainAvailable(domain: string): boolean {
  const owner = SOURCES.find((s) => s.domains?.includes(domain));
  return !owner || sourceEnabled(owner.id);
}

/**
 * May this document be *offered*? Owned copies always may: a source switched
 * off stops a card being taken, never a card being held.
 */
export function contentChoiceAllowed(doc: any): boolean {
  if (!doc || doc.parent?.documentName === "Actor") return true;
  return sourceEnabled(sourceOf(doc));
}

/**
 * The sources a pack shipped by this system holds, when its index cannot say.
 *
 * Only for an index built without our flag fields, which is a world that
 * loaded before `INDEX_FIELDS` were registered — the index is read first.
 */
const PACK_SOURCES: Record<string, string[]> = {
  [`${SYSTEM_ID}.marked-rules`]: ["twilightMarked"],
  [`${SYSTEM_ID}.variants`]: VARIANTS.map((v) => `variant:${v}`),
  [`${SYSTEM_ID}.variant-rules`]: VARIANTS.map((v) => `variant:${v}`),
};

/**
 * Is anything in this pack switched on? A pack whose every source is off is
 * hidden from players and skipped by the browser; a mixed pack stays, and its
 * documents are filtered one at a time.
 */
export function contentPackAllowed(collection: string): boolean {
  if (!isOurPack(collection)) return sourceEnabled(`pack:${collection}`);
  const pack = game.packs?.get?.(collection);
  const index = [...(pack?.index ?? [])];
  const known = index.map((e: any) => sourceOf(e, collection)).filter(Boolean) as string[];
  if (known.length) return known.some(sourceEnabled);
  const listed = PACK_SOURCES[collection];
  return listed ? listed.some(sourceEnabled) : true;
}

/** Is this index entry, in this pack, offered? */
export const indexEntryAllowed = (entry: any, collection: string): boolean =>
  sourceEnabled(sourceOf(entry, collection));

/** What a refused drag says: which source is off, and where to turn it on. */
export function disabledContentWarning(doc: any): string {
  const id = sourceOf(doc) ?? "";
  const def = sourceById.get(id);
  const i18n = game.i18n;
  const name = def
    ? i18n.localize(def.label)
    : (game.packs?.get?.(id.slice(5))?.metadata?.label ?? id.slice(5));
  return i18n.format
    ? i18n.format("DAGGERHEART.Warning.ContentDisabled", { name })
    : i18n.localize("DAGGERHEART.Warning.ContentDisabled");
}

/* ══════════════════════════════════════════════════════════════════════
   WRITING
   ══════════════════════════════════════════════════════════════════════ */

async function writeList(key: string, id: string, off: boolean): Promise<void> {
  const now = new Set(readList(key));
  if (off) now.add(id);
  else now.delete(id);
  await game.settings.set(SYSTEM_ID, key, [...now].sort());
}

/**
 * Switch a source on or off. GM only, because every store behind it is a
 * world setting, and the library window is the GM's.
 */
export async function setSourceEnabled(id: string, on: boolean): Promise<void> {
  if (!game.user?.isGM) return;
  if (id.startsWith("pack:")) return writeList(DISABLED_PACKS, id.slice(5), !on);
  const def = sourceById.get(id);
  if (def?.setting) {
    await game.settings.set(SYSTEM_ID, def.setting, on);
    return;
  }
  await writeList(DISABLED_SOURCES, id, !on);
}

/* ══════════════════════════════════════════════════════════════════════
   COUNTING — what the library prints beside each switch
   ══════════════════════════════════════════════════════════════════════ */

export interface SourceTally {
  total: number;
  /** Document count per subtype ("class", "domainCard", "adversary"…). */
  types: Record<string, number>;
}

/** Every pack the library can talk about: ours, and anybody's Items, Actors or journals. */
export function libraryPacks(): any[] {
  return [...(game.packs ?? [])].filter((p: any) =>
    ["Item", "Actor", "JournalEntry"].includes(p.metadata?.type ?? p.documentName),
  );
}

/** Make sure a pack's index carries our flag paths. Costs an index, never a document. */
export async function indexWithSources(pack: any): Promise<any[]> {
  const first = pack.index?.contents?.[0] ?? [...(pack.index ?? [])][0];
  const hasFields = first && (first.flags?.[SYSTEM_ID] !== undefined || `flags.${SYSTEM_ID}.source` in first);
  if (!pack.index?.size || (isOurPack(pack.collection) && !hasFields)) {
    await pack.getIndex({ fields: [...INDEX_FIELDS] });
  }
  return [...(pack.index ?? [])];
}

/** Tally every pack's index by source. */
export async function tallySources(): Promise<Map<string, SourceTally>> {
  const out = new Map<string, SourceTally>();
  for (const pack of libraryPacks()) {
    const entries = await indexWithSources(pack).catch(() => []);
    for (const e of entries) {
      const id = sourceOf(e, pack.collection);
      if (!id) continue;
      const t = out.get(id) ?? { total: 0, types: {} };
      const type = String(e.type ?? "journal");
      t.total += 1;
      t.types[type] = (t.types[type] ?? 0) + 1;
      out.set(id, t);
    }
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════════
   REGISTRATION
   ══════════════════════════════════════════════════════════════════════ */

const changed = (): void => {
  Hooks.callAll(CONTENT_CHANGED);
  ui.compendium?.render(false);
};

/**
 * The two lists, the index fields, and the sidebar's manners.
 *
 * Called from `registerSettings`, in the same `init` pass as the switches it
 * sits beside, because the browser and creation read it as soon as they open.
 */
export function registerContentSettings(): void {
  for (const key of [DISABLED_SOURCES, DISABLED_PACKS]) {
    game.settings.register(SYSTEM_ID, key, {
      scope: "world",
      config: false,
      type: Array,
      default: [],
      onChange: changed,
    });
  }

  /* So `sourceOf` can answer from an index, without reading a document. Set at
     init, before Foundry builds the indexes at setup. */
  for (const doc of ["Item", "Actor", "JournalEntry"]) {
    const cfg = (CONFIG as any)[doc];
    if (!cfg) continue;
    cfg.compendiumIndexFields = [...new Set([...(cfg.compendiumIndexFields ?? []), ...INDEX_FIELDS])];
  }

  /* The sidebar: a pack with nothing switched on is gone for players and
     dimmed for the GM, who is the one person who needs to find it again. */
  Hooks.on("renderCompendiumDirectory", (_app: any, html: any) => {
    const root: HTMLElement | null =
      html instanceof HTMLElement ? html : (html?.[0] ?? html?.element ?? null);
    if (!root) return;
    const gm = Boolean(game.user?.isGM);
    for (const row of root.querySelectorAll<HTMLElement>("[data-pack]")) {
      const allowed = contentPackAllowed(row.dataset.pack ?? "");
      row.classList.toggle("dh-pack-off", gm && !allowed);
      if (!gm) {
        row.hidden = !allowed;
        row.style.display = allowed ? "" : "none";
      }
    }
  });

  /* Inside a mixed pack, for players: the domain deck with Dread switched off
     lists the corebook's nine and nothing else. */
  Hooks.on("renderCompendium", (app: any, html: any) => {
    if (game.user?.isGM) return;
    const pack = app?.collection;
    if (!pack?.collection) return;
    const root: HTMLElement | null =
      html instanceof HTMLElement ? html : (html?.[0] ?? app?.element ?? null);
    if (!root) return;
    for (const li of root.querySelectorAll<HTMLElement>("[data-entry-id]")) {
      const entry = pack.index?.get?.(li.dataset.entryId);
      if (entry && !indexEntryAllowed(entry, pack.collection)) li.style.display = "none";
    }
  });
}
