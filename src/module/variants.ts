/**
 * The supplemental campaign variants — which of them this table is running.
 *
 * SRD 2.0 prints sixteen pages of optional mechanics: an alternate starting
 * equipment table for characters with no access to weapons, a cooking economy,
 * and eight campaign frames from Grimdark to Hex Crawl. Every one of them is
 * explicitly *supplemental*, so none of it may be simply switched on.
 *
 * ── ten switches and not one dropdown ────────────────────────────────
 * The obvious build is one setting naming "the campaign you are running", and
 * it is wrong on the chapter's own terms: these are not exclusive. A Hex
 * Crawl through a Grimdark world is two of them, Monster Hunting brings its
 * own equipment table and nothing else it touches, and Feasts is a downtime
 * economy that belongs to no frame at all. A dropdown would be this system
 * inventing an exclusivity the book does not have.
 *
 * The second candidate was a multi-select — one setting, ten values — and it
 * was declined for a duller reason: it renders through Foundry's own
 * `SetField` form group, which is a claim about a version of the settings
 * window this repo cannot test against here. Ten booleans render on v13 and
 * v14 the same way they render everywhere, each carries its own hint, and
 * each is separately findable by somebody searching the settings pane for the
 * word "Grimdark". Boring beats clever on a surface that gates content.
 *
 * ── what a switch actually does ──────────────────────────────────────
 * It gates **availability**, never enforcement. Turning Grimdark on does not
 * make anything Shadow-Touched; it puts Shadow-Touched where a GM can reach
 * it, and it puts the frame's rules in the compendium. That distinction is
 * this system's standing rule about rules text — `apps/rules.ts` prints a
 * feature verbatim rather than parsing it into behaviour, because parsing
 * English is how a system starts quietly getting rules wrong — and a
 * supplemental frame is the last place to start.
 *
 * Every one is **world**-scoped. A campaign variant is the table's agreement
 * about what game is being played, which is the change log's argument rather
 * than the token chip's: it is a ruling, not a preference about a screen, and
 * one player opting out of Feasts is not a thing that can mean anything.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "./config.ts";

/**
 * The ten, in the order the SRD prints them.
 *
 * `id` is the setting key and the folder name a variant's content lands
 * under, so it is stable in the way a document name is — renaming one moves
 * every world's switch back to its default and orphans a compendium folder.
 */
export const VARIANTS = [
  "everydayHero",
  "feasts",
  "grimdark",
  "tech",
  "western",
  "colossal",
  "magicSchool",
  "fairyTale",
  "monsterHunting",
  "hexCrawl",
] as const;

export type Variant = (typeof VARIANTS)[number];

/** The compendium folder each variant's content is filed under. */
export const VARIANT_FOLDERS: Record<Variant, string> = {
  everydayHero: "Everyday Hero",
  feasts: "Feasts",
  grimdark: "Grimdark",
  tech: "Tech-Based",
  western: "Western",
  colossal: "Colossal Adversaries",
  magicSchool: "Floating Magic School",
  fairyTale: "Fairy Tale",
  monsterHunting: "Monster Hunting",
  hexCrawl: "Hex Crawl",
};

/**
 * Is this table running that variant?
 *
 * Read rather than cached, and tolerant of being asked before the settings
 * are registered — the compendium browser's survey and a macro can both get
 * here early, and a variant that is off because the world has not finished
 * loading is a better answer than a stack trace. Same shape as the two
 * optional rules in `settings.ts`, and for the same reason.
 */
export function variantEnabled(id: Variant): boolean {
  try {
    return Boolean(game.settings?.get(SYSTEM_ID, id) ?? false);
  } catch {
    return false;
  }
}

/** Every variant currently switched on. */
export const activeVariants = (): Variant[] => VARIANTS.filter(variantEnabled);

/**
 * Register the ten.
 *
 * Called from `registerSettings`, so it lands in the same `init` pass as
 * everything else — a content-gating switch that arrived at `ready` would be
 * a switch the compendium browser had already read past.
 *
 * The `onChange` is one hook for all ten, because every reader of these wants
 * the same thing: re-ask which content is available. The browse window, the
 * creation window's equipment step and the condition list all listen to it,
 * and none of them cares *which* variant moved.
 */
export function registerVariantSettings(): void {
  for (const id of VARIANTS) {
    const key = id[0]!.toUpperCase() + id.slice(1);
    game.settings.register(SYSTEM_ID, id, {
      name: `DAGGERHEART.Variant.${key}`,
      hint: `DAGGERHEART.Variant.${key}Hint`,
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      onChange: () => Hooks.callAll("daggerheart.variantsChanged", activeVariants()),
    });
  }
}
