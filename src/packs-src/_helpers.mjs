/**
 * Authoring helpers for compendium source.
 *
 * The content files are read far more often than they are written, so these
 * exist to keep a class or a card looking like the page it came from rather
 * than like a document object. Everything here is pure — `build-packs.mjs`
 * adds the `_id`, `_key` and the rest of the Foundry envelope.
 */

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
 * Rules text → HTML.
 *
 * The book writes in two shapes and only two: paragraphs, and bulleted lists
 * introduced by a paragraph. So a blank line starts a paragraph and a line
 * beginning `- ` starts a list item, and that is the whole grammar. Anything
 * more would be a templating language nobody asked for.
 */
export function rt(text) {
  const lines = String(text)
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
    } else {
      flushList();
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
      domains: { primary, secondary },
      startingEvasion: evasion,
      startingHitPoints: hitPoints,
      // The book gives a class one feature block or several under one
      // heading; the schema holds one, so several are joined under the
      // heading the book itself uses.
      classFeature: features,
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
export function subclassCards({ name, className, domain, description, spellcastTrait = "", ranks }) {
  const RANKS = ["foundation", "specialization", "mastery"];
  return RANKS.filter((r) => ranks[r]?.length).map((rank) => ({
    name: `${name}: ${rank[0].toUpperCase()}${rank.slice(1)}`,
    type: "subclass",
    folder: className,
    // Its class's mark, not its own — a subclass card has artwork of its own
    // to come, and until it does, the honest placeholder is the thing it is a
    // subclass *of*. Three Beastbound cards with a Ranger paw is a set; three
    // with the Bone mark is indistinguishable from a Warrior's.
    img: classIcon(className),
    system: {
      description: rt(description),
      subclassName: name,
      className,
      rank,
      spellcastTrait,
      features: ranks[rank],
    },
  }));
}

/**
 * An ancestry. Two features, and the order they are given in is load-bearing:
 * mixed ancestry takes the *top* feature of one and the *bottom* of another,
 * so a character can hold Surefooted or Sturdy but never both.
 */
export function ancestryItem({ name, description, top, bottom }) {
  return {
    name,
    type: "ancestry",
    img: typeGlyph("ancestry"),
    system: { description: rt(description), topFeature: top, bottomFeature: bottom, mixedFrom: "" },
  };
}

export function communityItem({ name, description, feature }) {
  return {
    name,
    type: "community",
    img: typeGlyph("community"),
    system: { description: rt(description), feature },
  };
}

/**
 * A domain card. `recall` is the Recall Cost printed in the corner — the
 * Stress you pay to pull it back out of the vault mid-session.
 */
export function domainCardItem({ name, domain, level, cardType = "ability", recall = 0, text, uses = 0 }) {
  return {
    name,
    type: "domainCard",
    folder: `${domain[0].toUpperCase()}${domain.slice(1)}`,
    img: domainIcon(domain),
    system: {
      domain,
      level,
      cardType,
      recallCost: recall,
      description: rt(text),
      inLoadout: false,
      uses: { value: uses, max: uses },
    },
  };
}
