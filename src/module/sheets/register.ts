/** Registers the system's ApplicationV2 document sheets. */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ITEM_TYPES, SYSTEM_ID } from "../config.ts";
import { makeActorSheet, makeItemSheet } from "../apps/svelte-sheets.ts";
import CharacterSheet from "./CharacterSheet.svelte";
import AdversarySheet from "./AdversarySheet.svelte";
import EnvironmentSheet from "./EnvironmentSheet.svelte";
import CompanionSheet from "./CompanionSheet.svelte";
import ItemSheet from "./ItemSheet.svelte";

export function registerSheets(): void {
  const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;

  // The character sheet is a 288px rail plus a pane; below about 860px the
  // pane stops being able to hold a card row, so that is the floor.
  const CharacterApp = makeActorSheet(CharacterSheet, { width: 980, height: 860 });
  const AdversaryApp = makeActorSheet(AdversarySheet, { width: 620, height: 760 });
  const EnvironmentApp = makeActorSheet(EnvironmentSheet, { width: 600, height: 700 });
  const CompanionApp = makeActorSheet(CompanionSheet, { width: 520, height: 560 });
  const ItemApp = makeItemSheet(ItemSheet, { width: 540, height: 660 });

  DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, CharacterApp, {
    types: ["character"],
    makeDefault: true,
    label: "GLUniverse — Character",
  });
  DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, AdversaryApp, {
    types: ["adversary"],
    makeDefault: true,
    label: "GLUniverse — Adversary",
  });
  DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, EnvironmentApp, {
    types: ["environment"],
    makeDefault: true,
    label: "GLUniverse — Environment",
  });
  DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, CompanionApp, {
    types: ["companion"],
    makeDefault: true,
    label: "GLUniverse — Companion",
  });
  DocumentSheetConfig.registerSheet(Item, SYSTEM_ID, ItemApp, {
    types: [...ITEM_TYPES],
    makeDefault: true,
    label: "GLUniverse — Item",
  });
}
