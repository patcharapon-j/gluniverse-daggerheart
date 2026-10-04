/**
 * What kind of thing a piece of gear is, read off its name.
 *
 * Every weapon in the compendium wore one of two marks and every piece of
 * armor wore one, because a spearhead is all the data model can honestly
 * say: `WeaponData` records slot, trait, range, burden, tier and magical,
 * and `slot` is which table the book printed the row in rather than
 * anything about the weapon. A Longbow and a Warhammer are both primaries.
 *
 * There is nowhere to read the answer from, so it is derived from the name.
 * That is a real tradeoff and worth stating plainly: a table that renames
 * Longbow to "Grandfather's Gift" gets the floor mark back, and so does
 * anything the lists below do not know the words for. The alternative was a
 * `kind` field on four data models, tagged by hand across the seven hundred
 * and fifty rows in `packs-src`, and migrated on every existing world item.
 * The floor is the same mark these items wear today, so the failure is the
 * old behaviour rather than a blank.
 *
 * Order is load-bearing: the first pattern that matches wins, so the lists
 * run most specific first. A Gunblade is a firearm before it is a blade, a
 * Bladed Whip is a whip, Knuckle Blades are a fist and Throwing Knives are
 * thrown rather than daggers. Each list ends where its words run out and
 * the caller's floor takes over.
 *
 * `_helpers.mjs` imports this too, so a weapon's row icon in the gear tab
 * and its sigil on the card are picked by the same function. Two tables
 * would be two tables to keep in step.
 */

/** Weapons. Shield, fist, thrown and whip run first: they all borrow blade
    words, and a Bladed Star is a thrown weapon that happens to be sharp. */
const WEAPON = [
  ["shield", /shield|buckler|aegis/],
  ["fist", /gauntlet|knuckle|claw|fist|glove|vambrace/],
  ["thrown", /throw|chakram|javelin|dart|star|shard|sling|boomerang|needle/],
  ["whip", /whip|chain|flail|rope|lasso|wire|tendril|grappl|net/],
  ["crossbow", /crossbow|arbalest/],
  ["bow", /\bbow\b|bow$|longbow|shortbow|greatbow/],
  ["firearm", /pistol|revolver|rifle|shotgun|musket|blunderbuss|arquebus|cannon|flintlock|pepperbox|serpentine|\bgun|powder|dynamite|firework|launcher/],
  ["polearm", /spear|halberd|scythe|lance|pike|polearm|glaive|pitchfork|\bpick\b|corbin|trident/],
  // Not `\baxe`: a Battleaxe is one word and was the first thing that broke.
  ["axe", /axe|hatchet|labrys|cleaver|sickle/],
  ["hammer", /hammer|mace|maul|baton|sledge|skillet|rolling pin/],
  ["dagger", /dagger|knife|knives|scalpel|razor|stake|shiv/],
  ["blade", /sword|blade|saber|sabre|rapier|katana|scimitar|falchion|cutlass|zweih|anlace|estoc|edge|talon|fang/],
  ["staff", /staff|shillelagh|quarterstaff|stave/],
  ["wand", /wand|scepter|sceptre|rod\b/],
  ["focus", /orb|rune|\bgem|ring|pendant|bangle|prism|charm|amulet|lute|loupe/],
];

/** Armor. Cloak first, because a Darkweave Shroud is a cloak and `weave`
    would otherwise read it as cloth. */
const ARMOR = [
  ["cloak", /cloak|mantle|shroud|longcoat|veil|shawl|drakemantle/],
  ["plate-armor", /plate|brigandine|splint|banded|fortified|exosuit|aegis|tray/],
  ["mail-armor", /chain|mail|scale|lamellar|laminar|dragonscale/],
  ["leather-armor", /leather|hide|harness|bone|bark|coffinwood/],
  ["cloth-armor", /robe|tunic|gambeson|quilted|silk|raiment|finery|habit|weave|woven|clothing|apron|thread/],
];

/** Consumables. */
const CONSUMABLE = [
  ["bomb", /bomb|flare|firework|explod|blasting/],
  ["potion", /potion|tonic|elixir|brew|\btea\b|draught|mead|concoction|cordial|milk/],
  ["vial", /vial|phial|bottle|flask|\bjar\b|bezoar/],
  ["salve", /salve|\boil\b|paste|\bsap\b|clay|honey|ointment|\bwax\b|saliva|venom|poison|ooze/],
  ["powder", /powder|dust|salt|granule|pollen/],
  ["shard", /shard|stone|\bgem|orb|crystal|token|lozenge|candle|incense/],
  ["herb", /leaf|leaves|root|moss|seed|mushroom|flower|feast|pomelo|sprout|weed|thorn|spiderleg|featherbone|bundle|fungus/],
];

/** Loot. Garment before ring, so Gecko Gloves are worn rather than charmed. */
const LOOT = [
  ["relic", /relic|reliquary/],
  ["garment", /boot|glove|mitten|helm|\bhat\b|cloak|saddle|shawl|veil|mantle|girdle|frames|periapt/],
  ["ring", /ring|amulet|pendant|locket|circlet|brooch|charm|necklace|anklet|bracelet|collar/],
  ["tome", /\bmap\b|book|scroll|recipe|slate|quill|tome|lorekeeper|oracle|parchment|codex|journal/],
  ["bag", /\bbag\b|chest|case|\bbox\b|\bjar\b|\bnet\b|quiver|backpack|pouch|flask|sack/],
  ["gem", /\bgem|stone|shard|coin|crystal|dust|feather/],
  ["tool", /torch|\bkey\b|rope|compass|lens|loupe|spyglass|whistle|bell|bedroll|manacle|\brod\b|prism|glider|caltrop|grapnel|pole|dice|toy|horn|mirror|disc|lantern|thread|camp/],
];

const TABLES = {
  weapon: WEAPON,
  armor: ARMOR,
  consumable: CONSUMABLE,
  loot: LOOT,
};

/**
 * Every mark these tables can name, which is also every file
 * `design/assets/types` has to hold for them.
 */
export const KIND_GLYPHS = Object.values(TABLES).flatMap((t) => t.map(([k]) => k));

/**
 * The finer mark for an item, or `undefined` when its name says nothing the
 * tables know. The caller supplies the floor, because what a weapon falls
 * back to (its slot) is not what a consumable falls back to.
 */
export const kindOf = (type, name) => {
  const table = TABLES[type];
  if (!table || !name) return undefined;
  const n = String(name).toLowerCase();
  for (const [kind, pattern] of table) if (pattern.test(n)) return kind;
  return undefined;
};
