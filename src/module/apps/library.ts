/**
 * The content library's window — the GM's one place to say what this world
 * plays with. `content.ts` is the model; this draws it and writes it.
 *
 * Three doors, because a GM looks for this in three places: a button at the
 * head of the compendium sidebar beside "Browse Daggerheart", a menu in
 * Configure Settings beside the switches it supersedes, and
 * `game.daggerheart.library()` for a macro.
 *
 * Rendered once and driven afterwards. A press flips one row's
 * `aria-pressed` and rewrites the summary; nothing is rebuilt under the
 * pointer that pressed it. A change made on another GM's screen arrives
 * through the same setting hooks and moves the same rows.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "../config.ts";
import {
  CONTENT_CHANGED,
  SOURCES,
  isOurPack,
  libraryPacks,
  setSourceEnabled,
  sourceEnabled,
  tallySources,
  type SourceKind,
  type SourceTally,
} from "../content.ts";
import { LIBRARY, setLibraryRow } from "../ui/library.js";

const esc = (s: unknown): string => foundry.utils.escapeHTML(String(s ?? ""));
const t = (key: string): string => game.i18n.localize(key);

/** "Class", "Adversary", "Journal" — the subtype's own label. */
function typeLabel(type: string): string {
  for (const doc of ["Item", "Actor"]) {
    const key = `TYPES.${doc}.${type}`;
    if (game.i18n.has?.(key)) return game.i18n.localize(key);
  }
  return type === "journal" ? t("DAGGERHEART.Content.Journal") : type;
}

/** The three subtypes a source holds most of, so its row says what it takes away. */
const partsOf = (tally?: SourceTally): [string, string][] =>
  Object.entries(tally?.types ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, n]) => [esc(typeLabel(type)), String(n)]);

/** Which package a homebrew pack came from: the world, a module, or this system. */
function packageOf(pack: any): string {
  const kind = pack.metadata?.packageType;
  const name = pack.metadata?.packageName;
  if (kind === "world") return `${t("DAGGERHEART.Content.World")} · ${game.world?.title ?? name}`;
  if (kind === "module") return `${t("DAGGERHEART.Content.Module")} · ${game.modules?.get(name)?.title ?? name}`;
  return name ?? "";
}

interface Row {
  id: string;
  kind: SourceKind;
}

/** Every switch the window draws, in order: ours, then everybody else's packs. */
function rows(): Row[] {
  return [
    ...SOURCES.map((s) => ({ id: s.id, kind: s.kind })),
    ...libraryPacks()
      .filter((p: any) => !isOurPack(p.collection))
      .map((p: any) => ({ id: `pack:${p.collection}`, kind: "homebrew" as const })),
  ];
}

function summary(): string {
  const all = rows();
  return game.i18n.format("DAGGERHEART.Content.Summary", {
    on: all.filter((r) => sourceEnabled(r.id)).length,
    all: all.length,
  });
}

async function panel(): Promise<string> {
  const tally = await tallySources();
  const count = (id: string): string => (tally.get(id)?.total ?? 0).toLocaleString();

  const ours = (kind: SourceKind) =>
    SOURCES.filter((s) => s.kind === kind).map((s) => ({
      id: esc(s.id),
      name: esc(t(s.label)),
      hint: esc(t(s.hint)),
      on: sourceEnabled(s.id),
      count: count(s.id),
      parts: partsOf(tally.get(s.id)),
    }));

  const foreign = libraryPacks()
    .filter((p: any) => !isOurPack(p.collection))
    .map((p: any) => {
      const id = `pack:${p.collection}`;
      return {
        id: esc(id),
        name: esc(p.metadata?.label ?? p.title ?? p.collection),
        from: esc(packageOf(p)),
        on: sourceEnabled(id),
        count: count(id),
        parts: partsOf(tally.get(id)),
      };
    });

  return LIBRARY({
    title: esc(t("DAGGERHEART.Content.Title")),
    summary: esc(summary()),
    groups: [
      { id: "book", title: esc(t("DAGGERHEART.Content.Books")), note: esc(t("DAGGERHEART.Content.BooksNote")), rows: ours("book") },
      { id: "frame", title: esc(t("DAGGERHEART.Content.Frames")), note: esc(t("DAGGERHEART.Content.FramesNote")), rows: ours("frame") },
      {
        id: "homebrew",
        title: esc(t("DAGGERHEART.Content.Homebrew")),
        note: esc(t("DAGGERHEART.Content.HomebrewNote")),
        rows: [...ours("homebrew"), ...foreign],
        empty: esc(t("DAGGERHEART.Content.HomebrewEmpty")),
      },
    ],
    note: t("DAGGERHEART.Content.Note"),
  });
}

/* ══════════════════════════════════════════════════════════════════════
   THE WINDOW
   ══════════════════════════════════════════════════════════════════════ */

let open: any = null;
let root: HTMLElement | null = null;

/** Move every row to what the settings now say, and nothing else. */
function sync(): void {
  if (!root) return;
  for (const row of root.querySelectorAll<HTMLElement>("[data-src]")) {
    setLibraryRow(row, sourceEnabled(row.dataset.src ?? ""));
  }
  const sum = root.querySelector(".cl-sum");
  if (sum) sum.textContent = summary();
}

async function press(row: HTMLElement): Promise<void> {
  const id = row.dataset.src ?? "";
  const on = row.getAttribute("aria-pressed") !== "true";
  /* Drawn first, so the switch answers on the frame it was pressed; the
     write then lands and `sync` agrees with it. A write that fails puts the
     row back rather than leaving it claiming a state the world does not. */
  setLibraryRow(row, on);
  try {
    await setSourceEnabled(id, on);
  } catch (err) {
    console.error(`${SYSTEM_ID} | could not switch ${id}`, err);
    ui.notifications?.error(t("DAGGERHEART.Content.Failed"));
  }
  sync();
}

function makeApp(): any {
  const { ApplicationV2 } = foundry.applications.api;

  return class LibraryApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
      id: "dh-library",
      classes: ["dh", "dh-sheet", "dh-library"],
      position: { width: 520, height: 640 },
      window: { resizable: true, title: "DAGGERHEART.Content.Title" },
    };

    async _renderHTML(): Promise<string> {
      return panel();
    }

    _replaceHTML(result: string, content: HTMLElement): void {
      const target: HTMLElement =
        content?.matches?.(".window-content")
          ? content
          : ((content?.querySelector?.(".window-content") as HTMLElement) ?? content);

      target.innerHTML = result;
      root = target;

      /* Once: the container survives a re-render and its listener with it. */
      if (!target.dataset.dhWired) {
        target.dataset.dhWired = "1";
        target.addEventListener("click", (ev: Event) => {
          const row = (ev.target as HTMLElement)?.closest?.("[data-src]") as HTMLElement | null;
          if (row) void press(row);
        });
      }
    }

    async _onClose(options: unknown): Promise<void> {
      if (open === this) open = null;
      root = null;
      await (super._onClose as any)?.(options);
    }
  };
}

let Cached: any = null;

/** Open it, or bring the open one forward. GM only, and it says so. */
export async function openLibrary(): Promise<any> {
  if (!game.user?.isGM) {
    ui.notifications?.warn(t("DAGGERHEART.Content.GMOnly"));
    return null;
  }
  if (open?.rendered) {
    open.bringToFront?.();
    return open;
  }
  Cached ??= makeApp();
  const app = new Cached();
  try {
    await app.render(true);
  } catch (err) {
    console.error(`${SYSTEM_ID} | the content library failed to open`, err);
    ui.notifications?.error(t("DAGGERHEART.Content.Failed"));
    open = null;
    return null;
  }
  open = app;
  return app;
}

/**
 * The settings menu's entry. Foundry constructs the class it is handed and
 * calls `render`, so this is a door rather than a window: it routes to the
 * singleton, and a second press brings the open one forward.
 */
class LibraryMenu {
  render(): Promise<any> {
    return openLibrary();
  }
}

/** The sidebar button, the settings menu and the cross-client sync. */
export function registerLibrary(): void {
  game.settings.registerMenu(SYSTEM_ID, "contentLibrary", {
    name: "DAGGERHEART.Content.Title",
    label: "DAGGERHEART.Content.Open",
    hint: "DAGGERHEART.Content.MenuHint",
    icon: "fa-solid fa-books",
    type: LibraryMenu,
    restricted: true,
  });

  Hooks.on("renderCompendiumDirectory", (_app: any, html: any) => {
    if (!game.user?.isGM) return;
    const el: HTMLElement | null =
      html instanceof HTMLElement ? html : (html?.[0] ?? html?.element ?? null);
    if (!el || el.querySelector(".dh-library-btn")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "dh dh-browse-btn dh-library-btn";
    button.innerHTML = `<i class="fa-solid fa-books"></i> ${esc(t("DAGGERHEART.Content.Open"))}`;
    button.addEventListener("click", () => void openLibrary());

    /* After the browse button, which `registerBrowser` prepended: the two are
       the system's own doors into the compendium and read as a pair. */
    const browse = el.querySelector(".dh-browse-btn:not(.dh-library-btn)");
    if (browse) browse.after(button);
    else (el.querySelector(".directory-header") ?? el.querySelector("header") ?? el).prepend(button);
  });

  for (const hook of [CONTENT_CHANGED, "daggerheart.variantsChanged"]) {
    Hooks.on(hook, () => {
      sync();
      ui.compendium?.render(false);
    });
  }
}
