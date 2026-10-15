/** Optional homebrew availability. Owned documents keep working when disabled. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SYSTEM_ID } from "./config.ts";
import {
  CONTENT_CHANGED,
  GUNSLINGER_PACK,
  GUNSLINGER_RULES_PACK,
  GUNSLINGER_SETTING,
  gunslingerEnabled,
} from "./content.ts";

/* The general gate lives in `content.ts` now; these names stay importable
   from here because the Gunslinger's own callers and checks use them. */
export {
  CONTENT_CHANGED,
  GUNSLINGER_PACK,
  GUNSLINGER_RULES_PACK,
  GUNSLINGER_SETTING,
  gunslingerEnabled,
};
export { contentChoiceAllowed, contentPackAllowed } from "./content.ts";

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
    /* The GM keeps the row, dimmed by `content.ts`, to switch it back on. */
    if (!root || game.user?.isGM) return;
    for (const pack of [GUNSLINGER_PACK, GUNSLINGER_RULES_PACK]) {
      for (const row of root.querySelectorAll(`[data-pack="${pack}"]`)) {
        row.hidden = !gunslingerEnabled();
        row.style.display = row.hidden ? "none" : "";
      }
    }
  });
}
