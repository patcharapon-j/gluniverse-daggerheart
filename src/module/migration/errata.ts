/**
 * The SRD 2.0 errata, as substitutions against documents that already exist.
 *
 * ── why this is a second copy, and why that is not a duplication ──────
 * `src/packs-src/card-errata.mjs` is the same errata applied to the *pack*,
 * in the source form the cards are authored in — markdown emphasis, `\n\n`
 * paragraph breaks, keyed by `type:name`. It answers "what does the
 * compendium say".
 *
 * This answers a different question: **what does the copy on somebody's
 * character sheet say.** A player dragged Whirlwind onto their sheet in
 * January; that Item is theirs, it holds `rt()`'s *output* rather than its
 * input, and rebuilding the compendium does not touch it. So the fragments
 * here are written against the rendered HTML — `<b>Mark a Stress</b>`, not
 * `**Mark a Stress**` — because that is what is actually stored.
 *
 * The two are kept honest by `tools/check-migration-errata.mjs`, which builds
 * the pack and asserts that every `replace` here is present in the built
 * document and every `find` is absent. A fragment that stops matching the
 * corpus fails the build rather than silently migrating nothing — which is
 * `check-resources.mjs`'s `said` ratchet pointed at a third reading.
 *
 * ── matching on the old text is the whole safety argument ─────────────
 * Every fix is gated on the superseded text still being there. A GM who
 * rewrote Whirlwind for their table keeps their rewrite, because their
 * document no longer contains the fragment and is skipped. This is
 * `creation.granted`'s provenance rule arriving somewhere with no field to
 * record provenance in: the text itself is the evidence that nobody has
 * touched it, and a migration that clobbers somebody's homebrew is
 * unrecoverable in a way a migration that skips one is not.
 *
 * `said` is the SRD sentence the change was read from, for the reason every
 * annotation table in `src/packs-src/` carries one — an entry with no
 * evidence is an entry nobody can re-check.
 */

/** What one erratum does to one document. */
export type ErratumFix =
  /** Replace a fragment of rules text, wherever in `system` it is stored. */
  | { kind: "text"; find: string; replace: string }
  /** Set one scalar field, gated on it still holding the superseded value. */
  | { kind: "set"; path: string; from: unknown; to: unknown };

export interface Erratum {
  /** Stable id. Appears in the console report and nowhere a user reads. */
  id: string;
  /** The Item subtype this applies to. Narrows the walk and prevents a
      fragment matching a document that merely quotes the card. */
  type: string;
  /** The document's name. A renamed document is skipped, deliberately —
      see the provenance argument above. */
  name: string;
  /**
   * The name of the Actor this Item is embedded on, where the Item's own name
   * is not enough to identify it.
   *
   * A domain card's name is unique in the corpus and needs none of this. An
   * adversary *feature* name is emphatically not: "Relentless (2)" is printed
   * on dozens of stat blocks, and while the old-text gate means the wrong ones
   * are never rewritten, they would every one of them be **reported as
   * skipped** — which is a migration telling a GM that forty of their
   * adversaries have been edited when none of them has. The report is the
   * thing being protected here rather than the write.
   */
  parent?: string;
  /** The SRD sentence this was read from. */
  said: string;
  fix: ErratumFix;
}

/**
 * Daggerheart System Reference Document 2.0, released 2026-08-25.
 *
 * Eight entries, and they are not eight of one kind. Four are text on cards
 * the Card Creator generates, two are text on Dread cards this repo
 * transcribes by hand, and two are a *card type* — Savor the Anguish and
 * Invoke Torment stopped being Spells and became Abilities, which is a fact
 * about the word under the title and about which corner the card draws.
 *
 * **Notorious is deliberately not here.** The SRD 2.0 appendix omits its
 * "doesn't count against your loadout" sentence and the Card Creator still
 * prints it. An omission in an appendix is not an erratum, and removing a
 * rule from a card somebody is holding on the strength of one is the worst
 * direction to be wrong in.
 */
export const SRD2_ERRATA: Erratum[] = [
  {
    id: "whirlwind-half-damage",
    type: "domainCard",
    name: "Whirlwind",
    said: "All additional adversaries you succeed against with this ability take half damage.",
    /* Anchored on the closing tag, and it has to be. This erratum *appends*,
       so the unanchored fragment is a prefix of its own replacement — it
       matches the corrected card as readily as the old one, and a migration
       run twice would append the sentence twice. The paragraph end is what
       makes "the old text" a thing that stops existing.
       `tools/check-migration-errata.mjs` refuses the unanchored form outright
       rather than leaving it to the corpus to notice. */
    fix: {
      kind: "text",
      find: "to use the attack against all other targets within Very Close range.</p>",
      replace:
        "to use the attack against all other targets within Very Close range. " +
        "All additional adversaries you succeed against with this ability take half damage.</p>",
    },
  },
  {
    id: "unleash-chaos-mark-a-stress",
    type: "domainCard",
    name: "Unleash Chaos",
    said: "Mark a Stress to replenish this card with tokens (up to your Spellcast trait).",
    fix: {
      kind: "text",
      find: "<b>Mark Stress</b> to replenish this card with tokens",
      replace: "<b>Mark a Stress</b> to replenish this card with tokens",
    },
  },
  {
    id: "book-of-vagras-reveal",
    type: "domainCard",
    name: "Book of Vagras",
    said: "If there is anything magically hidden within Close range, it is revealed.",
    fix: {
      kind: "text",
      find: "within Close range, the roll would succeed against, it is revealed.",
      replace: "within Close range, it is revealed.",
    },
  },
  {
    id: "book-of-grynn-wall-of-flame",
    type: "domainCard",
    name: "Book of Grynn",
    said: "On a success, create a temporary wall of magical flame between two points within Far range.",
    fix: {
      kind: "text",
      find: "create a wall of magical flame between two points",
      replace: "create a temporary wall of magical flame between two points",
    },
  },
  {
    id: "summon-horror-once-per-scene",
    type: "domainCard",
    name: "Summon Horror",
    said: "Once per scene, mark a Stress to summon an otherworldly creature…",
    fix: {
      kind: "text",
      find: "<b>Mark a Stress</b> to summon an otherworldly creature",
      replace: "<b>Once per scene</b>, mark a Stress to summon an otherworldly creature",
    },
  },
  {
    id: "darkfire-once-per-scene",
    type: "domainCard",
    name: "Darkfire",
    said: "Once per scene, spend any number of Hope to target an equal number of adversaries…",
    fix: {
      kind: "text",
      find: "Spend any number of Hope to target an equal number of adversaries",
      replace:
        "<b>Once per scene</b>, spend any number of Hope to target an equal number of adversaries",
    },
  },
  {
    id: "savor-the-anguish-is-an-ability",
    type: "domainCard",
    name: "Savor the Anguish",
    said: "Savor the Anguish — Ability (SRD 2.0; printed as a Spell in Hope and Fear).",
    fix: { kind: "set", path: "cardType", from: "spell", to: "ability" },
  },
  {
    id: "invoke-torment-is-an-ability",
    type: "domainCard",
    name: "Invoke Torment",
    said: "Invoke Torment — Ability (SRD 2.0; printed as a Spell in Hope and Fear).",
    fix: { kind: "set", path: "cardType", from: "spell", to: "ability" },
  },

  /* ── the stat blocks ──────────────────────────────────────────────────
     These are transcription defects rather than errata — the SRD said this
     all along and the repo had typed something else — but they migrate for
     exactly the same reason the cards do, and it is worth being clear that
     the reason is not "the rules changed". An adversary dragged into a scene
     is a *copy*, and the GM's copy is wrong in the same way the compendium's
     was. The Cryptimoth is the one that matters most: it was rolling
     "Insight", which is not one of the six traits, so the roll it asks for
     could not be made at all.

     Every one carries `parent`, because an adversary feature's name is not
     unique — see the field's own note. */
  {
    id: "glass-snake-shards",
    type: "feature",
    name: "Armor-Shredding Shards",
    parent: "Glass Snake",
    said:
      "After a successful attack against the Snake within Melee range, the attacker must " +
      "mark an Armor Slot. If they can't mark an Armor Slot, they must mark an HP.",
    fix: {
      kind: "text",
      find:
        "On a successful attack within Melee range against the Snake, the attacker must " +
        "mark an Armor Slot without receiving its benefits (they can still use armor to " +
        "reduce the damage). If they can’t mark an Armor Slot, they must mark an " +
        "additional HP.",
      replace:
        "After a successful attack against the Snake within Melee range, the attacker must " +
        "mark an Armor Slot. If they can’t mark an Armor Slot, they must mark an HP.",
    },
  },
  {
    id: "wyvern-shriek-pcs",
    type: "feature",
    name: "Terrifying Shriek",
    parent: "Wyvern",
    said: "All PCs within Far range are Terrified…",
    fix: {
      kind: "text",
      find: "All creatures within Far range are Terrified",
      replace: "All PCs within Far range are Terrified",
    },
  },
  {
    id: "cryptimoth-screech-instinct",
    type: "feature",
    name: "Psychic Screech",
    parent: "Cryptimoth",
    said: "Each target must make an Instinct Reaction Roll (16).",
    fix: {
      kind: "text",
      find: "an Insight Reaction Roll (16)",
      replace: "an Instinct Reaction Roll (16)",
    },
  },
  {
    id: "cryptimoth-glare-instinct",
    type: "feature",
    name: "Paranoia Glare",
    parent: "Cryptimoth",
    said: "the PC must succeed on an Instinct Roll (16)…",
    fix: {
      kind: "text",
      find: "an Insight Roll (16)",
      replace: "an Instinct Roll (16)",
    },
  },
  {
    id: "cephilith-titan-worshippers",
    type: "feature",
    name: "Summon Worshippers",
    parent: "Cephilith Titan",
    said: "Spend a Fear to summon 1d4 Cephilith Abominations…",
    fix: {
      kind: "text",
      find: "summon 1d4 Outer Realms Abominations",
      replace: "summon 1d4 Cephilith Abominations",
    },
  },
  {
    /* Two fragments on one feature is two entries, because a fix is one
       substitution — and these are two different mistakes that happen to
       share a paragraph. Splitting them means a GM who had corrected only
       one by hand still gets the other. */
    id: "cephilith-titan-their-hp",
    type: "feature",
    name: "Summon Worshippers",
    parent: "Cephilith Titan",
    said: "When the Titan has marked half their HP, they manifest in their full form…",
    fix: {
      kind: "text",
      find: "half its HP, they manifests in their full form",
      replace: "half their HP, they manifest in their full form",
    },
  },
  {
    id: "battle-box-relentless",
    type: "feature",
    name: "Relentless (2)",
    parent: "Battle Box",
    said: "The Box can be spotlighted up to two times per GM turn.",
    fix: {
      kind: "text",
      find: "up to two times times per GM turn",
      replace: "up to two times per GM turn",
    },
  },
  {
    id: "abandoned-grove-restrained",
    type: "feature",
    name: "Barbed Vines",
    parent: "Abandoned Grove",
    said: "Restrained lasts until they're freed…",
    fix: {
      kind: "text",
      find: "Restrained creatures until they’re freed",
      replace: "Restrained lasts until they’re freed",
    },
  },
  {
    id: "burning-heart-targets",
    type: "feature",
    name: "Choking Ash",
    parent: "Burning Heart of the Woods",
    said: "Targets who succeed take half damage.",
    fix: {
      kind: "text",
      find: "Targes who succeed",
      replace: "Targets who succeed",
    },
  },
];
