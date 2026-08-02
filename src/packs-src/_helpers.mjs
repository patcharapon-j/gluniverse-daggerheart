/**
 * Authoring helpers for compendium source.
 *
 * The content files are read far more often than they are written, so these
 * exist to keep a class or a card looking like the page it came from rather
 * than like a document object. Everything here is pure — `build-packs.mjs`
 * adds the `_id`, `_key` and the rest of the Foundry envelope.
 */

import PRINTINGS from "./card-printings.mjs";

const SYSTEM_PATH = "systems/gluniverse-daggerheart";

export const domainIcon = (domain) => `${SYSTEM_PATH}/assets/domains/${domain}.svg`;

/**
 * The kind-of-thing glyphs, for the cards that have no domain.
 *
 * In this system a saturated hue *means* domain, so an ancestry or a community
 * borrowing a domain's mark would say something false about it. They get the
 * design's own type glyphs instead — the same ones `domains.js` loads.
 */
export const typeGlyph = (kind) => `${SYSTEM_PATH}/assets/types/${kind}.svg`;

/**
 * The class marks.
 *
 * A class card's corner plates carry its two *domains*, because that is what a
 * class is — so the card needs no mark of its own. A class in a sidebar row, a
 * compendium list or a hotbar slot has no card and no plates, and there the
 * domain sigil was actively wrong: Ranger and Warrior both wore Bone, so two
 * different classes were the same picture, and Bone itself is a *domain* and
 * now meant three things at once. These are the class's face in a list, and
 * only there — `sheets/cards.ts` counts them as "not artwork" so a card still
 * falls back to its own sigil plate rather than blowing this up behind itself.
 */
export const classIcon = (name) =>
  `${SYSTEM_PATH}/assets/classes/${name.toLowerCase()}.svg`;

/**
 * A card's header art, artist and printed number, looked up by name.
 *
 * The three constructors below reach for this themselves rather than taking
 * it as an argument, because there is exactly one right answer per card and a
 * hand-written path is a hand-written path that can go stale. It also cannot
 * be derived — upstream files Halfling under `halflings.webp` and Orc under
 * `orcs.webp` — so the map is generated alongside the art by
 * `tools/fetch-cards.mjs` and a card missing from it is a card whose art was
 * never fetched.
 *
 * A miss is not fatal. `img` falls back to the mark and `sheets/cards.ts`
 * draws the sigil plate, which is what every card looked like before there
 * was any art at all; `tools/check-cards.mjs` is what complains about it.
 */
const printed = (kind, name, fallbackImg) => {
  const p = PRINTINGS[kind]?.[name];
  return {
    img: p?.art || fallbackImg,
    printing: { artist: p?.artist ?? "", code: p?.code ?? "" },
  };
};

/**
 * Inline emphasis, the two marks the cards actually use.
 *
 * `**bold**` is the *cost* — "**Mark a Stress**", "**Spend 3 Hope**", "**d8**"
 * — and `_italic_` is a condition — "_Vulnerable_", "_Charged_". Both are
 * printed on the official card and both are load-bearing, so they survive the
 * trip: `sheets/cards.ts` turns `<b>`/`<i>` back into `**`/`*` on the way to
 * the design's `rich()`, which re-marks them. Order matters — the bold rule
 * has to run before the italic one or `**x**` is read as two italics.
 */
const inline = (s) =>
  s
    .replace(/\*\*([^*]+?)\*\*/g, "<b>$1</b>")
    .replace(/(?<![*\w])[*_]([^*_]+?)[*_](?![*\w])/g, "<i>$1</i>");

/**
 * Rules text → HTML.
 *
 * The book writes in two shapes and only two: paragraphs, and bulleted lists
 * introduced by a paragraph. So a blank line starts a paragraph and a line
 * beginning `- ` starts a list item, and that is the whole grammar. Anything
 * more would be a templating language nobody asked for.
 *
 * A blank line is the *only* separator, which is what lets the source wrap.
 * Card text runs long and the entries here are wrapped to fit a screen; a
 * continuation line therefore joins whatever is already open — the paragraph
 * or the list item — rather than starting something new. Wrap a bullet across
 * three lines and it is still one bullet.
 */
export function rt(text) {
  const lines = inline(String(text))
    .split("\n")
    .map((l) => l.trim());

  const out = [];
  let para = [];
  let list = null;

  const flushPara = () => {
    if (para.length) out.push(`<p>${para.join(" ")}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`<ul>${list.map((i) => `<li>${i}</li>`).join("")}</ul>`);
    list = null;
  };

  for (const line of lines) {
    if (!line) {
      flushPara();
      flushList();
    } else if (line.startsWith("- ")) {
      flushPara();
      (list ??= []).push(line.slice(2));
    } else if (list) {
      list[list.length - 1] += ` ${line}`;
    } else {
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return out.join("");
}

/** A named block of rules text: `{name, description}`, description as HTML. */
export const feat = (name, text) => ({ name, description: rt(text) });

/* ── documents ───────────────────────────────────────────────────────── */

/**
 * A class. `domains` is `[primary, secondary]` in the order the book prints
 * them, which is also the order the sheet ramps them.
 */
export function classItem({
  name,
  description,
  flavor = "",
  domains,
  evasion,
  hitPoints,
  items,
  hopeFeature,
  features,
  background = [],
  connections = [],
  suggestedTraits = "",
}) {
  const [primary, secondary] = domains;
  return {
    name,
    type: "class",
    // Sixty-three documents in one flat list is a scroll, not a browse. The
    // class and its six subclass cards are the unit you actually go looking
    // for, so they share a folder named for the class.
    folder: name,
    img: classIcon(name),
    system: {
      description: rt(description),
      // The chapter opener, whole. `description` keeps its one sentence
      // because that is what the card prints; see `flavor` in `ClassData`.
      flavor: flavor ? rt(flavor) : "",
      domains: { primary, secondary },
      startingEvasion: evasion,
      startingHitPoints: hitPoints,
      // The book gives a class one feature or several, each with its own
      // name, and the schema holds all of them. `concat` so the single case
      // still reads as `features: feat(…)` at the call site rather than
      // making four classes wrap one feature in brackets to look like five.
      classFeatures: [].concat(features ?? []),
      hopeFeature,
      startingInventory: rt(items),
      backgroundQuestions: background,
      connectionQuestions: connections,
      suggestedTraits: suggestedTraits ? rt(suggestedTraits) : "",
    },
  };
}

/**
 * A subclass, expanded into its three cards.
 *
 * A subclass is not one thing you own — it arrives as Foundation, then
 * Specialization, then Mastery, at levels the character reaches years apart.
 * `spellcastTrait` rides on every card because the sheet reads it off
 * whichever one you are holding, and Foundation is not guaranteed to be it.
 */
export function subclassCards({ name, className, description, spellcastTrait = "", ranks }) {
  const RANKS = ["foundation", "specialization", "mastery"];
  // One painting per subclass, shared by its three cards — that is how the
  // printed set does it too, and it is what makes three Beastbound cards read
  // as a set rather than as three unrelated things a Ranger happens to own.
  const { img, printing } = printed("subclass", name, classIcon(className));
  return RANKS.filter((r) => ranks[r]?.length).map((rank) => ({
    name: `${name}: ${rank[0].toUpperCase()}${rank.slice(1)}`,
    type: "subclass",
    folder: className,
    img,
    system: {
      description: rt(description),
      subclassName: name,
      className,
      rank,
      spellcastTrait,
      features: ranks[rank],
      printing,
    },
  }));
}

/**
 * An ancestry. Two features, and the order they are given in is load-bearing:
 * mixed ancestry takes the *top* feature of one and the *bottom* of another,
 * so a character can hold Surefooted or Sturdy but never both.
 */
export function ancestryItem({ name, description, top, bottom }) {
  const { img, printing } = printed("ancestry", name, typeGlyph("ancestry"));
  return {
    name,
    type: "ancestry",
    img,
    system: {
      description: rt(description),
      topFeature: top,
      bottomFeature: bottom,
      mixedFrom: "",
      printing,
    },
  };
}

export function communityItem({ name, description, feature }) {
  const { img, printing } = printed("community", name, typeGlyph("community"));
  return {
    name,
    type: "community",
    img,
    system: { description: rt(description), feature, printing },
  };
}

/* ── gear ─────────────────────────────────────────────────────────────
   The four subtypes with no card of their own.

   They take a **type glyph** as `img` rather than artwork, and that is not a
   placeholder standing in until art arrives. The official equipment art is
   served from a signed, session-scoped CDN — every URL carries a query string
   tied to a logged-in subscription — so there is nothing a committed tool
   could fetch that would still resolve tomorrow, and the whole point of the
   snapshot is that the build never touches the network. A glyph on every one
   of them is uniform by construction; a picture on nine and a glyph on three
   hundred and fifty reads as broken. `img` is per document, so a table that
   *does* have stable art can set it without any of this changing.

   `sheets/cards.ts` already counts `assets/types/` as "not artwork", so these
   fall through to the builders' own fallback plate — the glyph at plate size
   on a graphite ground, which is what a card with no domain looks like
   everywhere else in this system. */

/**
 * `"d10+3"` → the schema's damage shape.
 *
 * `count` is 1 on every weapon in the book, and stays a field because the
 * number actually rolled is Proficiency copies of it — see the note on
 * `WeaponData.damage`. The bonus is the printed one and the type comes from
 * which table the row was in, physical or magic.
 */
function damageOf(printed, magic) {
  const m = /^(d\d+)(?:\+(\d+))?$/.exec(String(printed).trim());
  if (!m) throw new Error(`Unreadable damage "${printed}" — expected "d8" or "d10+3"`);
  return {
    count: 1,
    dice: m[1],
    bonus: Number(m[2] ?? 0),
    type: magic ? "magic" : "physical",
  };
}

/** A `{name, description}` feature block, or the schema's empty one. */
const featureOf = (feat) =>
  feat ? { name: feat.name, description: rt(feat.description) } : { name: "", description: "" };

/**
 * A weapon. `slot` is primary or secondary, which is which *table* it came
 * from rather than anything about the weapon — a Shortsword is a secondary
 * because the secondary table prints it, not because of its damage.
 */
export function weaponItem({
  name,
  tier,
  slot,
  trait,
  range,
  damage,
  burden,
  feature = null,
  magic = false,
  spellcast = false,
}) {
  return {
    name,
    type: "weapon",
    folder: slot === "secondary" ? "Secondary Weapons" : "Primary Weapons",
    img: typeGlyph(slot === "secondary" ? "secondary" : "primary"),
    system: {
      /* The arcane-frame wheelchair is the only weapon in the book that names
         no trait: it uses whatever your subclass casts with. The schema stores
         a trait as one of the six, so the row carries a plausible one and this
         line carries the truth — and `apps/creation.ts` rewrites the field to
         the character's own Spellcast trait when it grants one, which is the
         only moment the right answer is knowable.

         Not a seventh trait. "Spellcast" is a pointer to one of the six, and
         adding it to `TRAITS` would reach the roll engine, the sheet's six
         plates and every closed-set check in the system to serve one item. */
      description: spellcast
        ? rt(
            "This weapon doesn’t specify a trait. Attack with the Spellcast trait your subclass gives you.",
          )
        : "",
      tier,
      slot,
      equipped: false,
      trait,
      range,
      burden,
      damage: damageOf(damage, magic),
      feature: featureOf(feature),
      // Straight off the feature rather than parsed out of its sentence. See
      // the note at the head of equipment-tables.mjs.
      evasionModifier: feature?.ev ?? 0,
      armorScoreModifier: feature?.as ?? 0,
      magical: magic,
    },
  };
}

export function armorItem({ name, tier, major, severe, score, feature = null }) {
  return {
    name,
    type: "armor",
    folder: "Armor",
    img: typeGlyph("armor"),
    system: {
      description: "",
      tier,
      equipped: false,
      baseThresholds: { major, severe },
      baseScore: score,
      feature: featureOf(feature),
      evasionModifier: feature?.ev ?? 0,
      magical: false,
    },
  };
}

/**
 * A consumable or an item off the loot tables.
 *
 * `source` carries the printed roll number, because that *is* how the rules
 * refer to a row — "roll 3d12 and take the item that matches that value" — and
 * the field exists for exactly this.
 */
export function lootItem({ name, description, roll, consumable = false }) {
  return {
    name,
    type: consumable ? "consumable" : "loot",
    folder: consumable ? "Consumables" : "Items",
    img: typeGlyph(consumable ? "consumable" : "gear"),
    system: {
      description: rt(description),
      quantity: 1,
      source: roll ? `${consumable ? "Consumable" : "Item"} ${String(roll).padStart(2, "0")}` : "",
    },
  };
}

/**
 * A domain card. `recall` is the Recall Cost printed in the corner — the
 * Stress you pay to pull it back out of the vault mid-session.
 */
export function domainCardItem({
  name,
  domain,
  level,
  cardType = "ability",
  recall = 0,
  text,
  uses = 0,
  art = "",
  artist = "",
  cardId = "",
}) {
  return {
    name,
    type: "domainCard",
    folder: `${domain[0].toUpperCase()}${domain.slice(1)}`,
    // A domain card is the one kind whose art travels with the card in the
    // generated module, so it is passed in rather than looked up.
    img: art || domainIcon(domain),
    system: {
      domain,
      level,
      cardType,
      recallCost: recall,
      description: rt(text),
      inLoadout: false,
      uses: { value: uses, max: uses },
      printing: { artist, code: cardId },
    },
  };
}
