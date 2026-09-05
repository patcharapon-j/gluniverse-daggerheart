/** Optional homebrew availability. Owned documents keep working when disabled. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SYSTEM_ID } from "./config.ts";

export const GUNSLINGER_PACK = `${SYSTEM_ID}.gunslinger`;
export const GUNSLINGER_RULES_PACK = `${SYSTEM_ID}.gunslinger-rules`;
export const GUNSLINGER_SETTING = "gunslingerContent";
export const CONTENT_CHANGED = "daggerheart.contentChanged";

export function gunslingerEnabled(): boolean {
  try { return Boolean(game.settings?.get(SYSTEM_ID, GUNSLINGER_SETTING) ?? false); }
  catch { return false; }
}

export function contentPackAllowed(pack: string): boolean {
  return ![GUNSLINGER_PACK, GUNSLINGER_RULES_PACK].includes(pack) || gunslingerEnabled();
}

/** Guard stale picker results, including copies imported into a world directory. */
export function contentChoiceAllowed(doc: any): boolean {
  if (!doc || doc.parent?.documentName === "Actor") return true;
  const source = doc._stats?.compendiumSource ?? "";
  const ours = doc.flags?.[SYSTEM_ID]?.contentPackage === "gunslinger" ||
    doc.pack === GUNSLINGER_PACK || source.startsWith(`Compendium.${GUNSLINGER_PACK}.`);
  return !ours || gunslingerEnabled();
}

export async function supplementalItems(key: string): Promise<any[]> {
  const types: Record<string, string[]> = { classes: ["class", "subclass"], domains: ["domainCard"], equipment: ["weapon"] };
  if (!gunslingerEnabled() || !types[key]) return [];
  const docs = await game.packs?.get(GUNSLINGER_PACK)?.getDocuments() ?? [];
  return gunslingerEnabled() ? docs.filter((doc: any) => types[key]!.includes(doc.type)) : [];
}

export function registerGunslingerSettings(): void {
  game.settings.register(SYSTEM_ID, GUNSLINGER_SETTING, {
    name: "DAGGERHEART.Settings.GunslingerContent",
    hint: "DAGGERHEART.Settings.GunslingerContentHint",
    scope: "world", config: true, type: Boolean, default: false,
    onChange: () => {
      Hooks.callAll(CONTENT_CHANGED);
      ui.compendium?.render(false);
    },
  });
  Hooks.on("renderCompendiumDirectory", (_app: any, html: any) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;
    for (const pack of [GUNSLINGER_PACK, GUNSLINGER_RULES_PACK]) {
      for (const row of root.querySelectorAll(`[data-pack="${pack}"]`)) {
        row.hidden = !gunslingerEnabled();
        row.style.display = row.hidden ? "none" : "";
      }
    }
  });
}
