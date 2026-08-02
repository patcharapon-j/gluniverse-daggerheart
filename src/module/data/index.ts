/**
 * Registers every DataModel onto CONFIG during `init`.
 *
 * These replace the removed `template.json`: the schema is the model, and a
 * subtype without an entry here falls back to a free-form object, which is
 * how a typo in `system.json` shows up as a sheet full of nothing.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  AdversaryData,
  CharacterData,
  CompanionData,
  EnvironmentData,
} from "./actors.ts";
import {
  AncestryData,
  ArmorData,
  ClassData,
  CommunityData,
  ConsumableData,
  DomainCardData,
  FeatureData,
  LootData,
  SubclassData,
  TransformationData,
  WeaponData,
} from "./items.ts";

export function registerDataModels(): void {
  Object.assign(CONFIG.Actor.dataModels, {
    character: CharacterData,
    adversary: AdversaryData,
    environment: EnvironmentData,
    companion: CompanionData,
  });

  Object.assign(CONFIG.Item.dataModels, {
    ancestry: AncestryData,
    community: CommunityData,
    transformation: TransformationData,
    class: ClassData,
    subclass: SubclassData,
    domainCard: DomainCardData,
    weapon: WeaponData,
    armor: ArmorData,
    consumable: ConsumableData,
    loot: LootData,
    feature: FeatureData,
  });
}

export {
  AdversaryData,
  AncestryData,
  ArmorData,
  CharacterData,
  ClassData,
  CommunityData,
  CompanionData,
  ConsumableData,
  DomainCardData,
  EnvironmentData,
  FeatureData,
  LootData,
  SubclassData,
  TransformationData,
  WeaponData,
};
