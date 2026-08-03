/**
 * Which cards ask you to keep a number, and what number.
 *
 * Hand-authored, and the only file in this repo that is a *reading* of the
 * rules text rather than a transcription of it. That is why it is separate
 * from the entries themselves: `domain-cards.mjs` is generated from the
 * official snapshot and may be regenerated at any time, and an interpretation
 * living inside a generated file is an interpretation that gets overwritten.
 *
 * **Why not derive it.** A regex over the deck gets most of this right and is
 * wrong in exactly the place that matters. "Until your next long rest" appears
 * on thirty-eight cards; on thirty-six of them it is a *duration* — a potion
 * that wears off, a condition that ends — and on two it is a use limit
 * ("the prism can't be activated again until your next long rest"). Those two
 * readings are identical to a pattern and opposite to a player. This system
 * parses English rules text in exactly one place, narrowly and on purpose
 * (`featurePrice`), and a hundred and fifty-seven cards is not that place.
 *
 * **What the checker does instead.** Every entry records `said` — the exact
 * phrase the reading was taken from — and `tools/check-resources.mjs` asserts
 * that phrase is still on the card. So upstream rewording fails the build
 * rather than silently invalidating a ceiling, and an entry naming a card that
 * has been renamed fails too. What it cannot do is prove completeness, so it
 * does the honest second-best: it re-runs the regex, and every card that
 * matches must either be annotated here or named in `DECLINED` with a reason.
 * That is `fetch-cards.mjs`'s `TYPOS` list, applied to a different problem.
 *
 * Keyed `type:name`, which is unique across all 995 documents in the four
 * packs — the same key `card-printings.mjs` uses, for the same reason.
 */

/* ── the four ceilings ───────────────────────────────────────────────────
   See `RESOURCE_MAX` in `src/module/config.ts`. A card states where its
   number comes from and the character supplies it, because the card in the
   compendium belongs to nobody. */

const fixed = (n) => ({ kind: "fixed", n, trait: "", floor: 0 });
const trait = (t, floor = 0) => ({ kind: "trait", n: 1, trait: t, floor });
const level = (floor = 0) => ({ kind: "level", n: 1, trait: "", floor });
const open = () => ({ kind: "open", n: 0, trait: "", floor: 0 });

const res = ({
  name = "Tokens",
  max = open(),
  refresh = "manual",
  onRefresh = "clear",
  feature = "",
  onEmpty = "",
  said,
}) => ({ name, value: 0, max, refresh, onRefresh, feature, onEmpty, said });

/**
 * A budget: N uses of something, refilled when the scope comes round.
 *
 * The overwhelming majority of this file. `said` is derived from the scope
 * rather than passed, because the phrase and the scope are the same fact —
 * "once per long rest" *is* `longRest` — and letting them be stated
 * separately is letting them disagree.
 */
const SAID = {
  rest: "once per rest",
  longRest: "once per long rest",
  shortRest: "once per short rest",
  session: "once per session",
  scene: "once per scene",
};

const once = (refresh, feature = "", n = 1, said = SAID[refresh]) => ({
  ...res({
    name: n === 1 ? "Use" : "Uses",
    max: fixed(n),
    refresh,
    onRefresh: "fill",
    feature,
    said,
  }),
  /* **A budget arrives full and a pile arrives empty**, and that is the same
     split `onRefresh` draws, showing up one more time. A card you have just
     picked up has not been used, so its counters are all there; a card that
     asks you to *place* tokens has none on it until you place them. The
     schema's default is 0 because most of what it holds is a pile — this is
     the exception stating itself rather than the default being wrong. */
  value: n,
});

/* ══════════════════════════════════════════════════════════════════════
   THE PILES

   Cards you place counters on. Read one at a time, because no two of them
   are quite the same shape and four of the twenty-one have a ceiling no
   sheet can compute.
   ══════════════════════════════════════════════════════════════════════ */

const PILES = {
  /* 1d4+1 is a roll, and a roll is not a ceiling. `open` rather than
     fixed(5): capping it at the best case would let the sheet accept
     counters the dice never gave you. */
  "subclass:Poisoners Guild: Foundation": [
    res({
      feature: "Toxic Concoctions",
      max: open(),
      refresh: "longRest",
      said: "place 1d4+1 tokens on this card",
    }),
  ],

  /* Two resources, and they are genuinely two. The once-per-rest limits the
     *imbuing*; the tokens are what the imbuing produced. Spending the last
     token does not give you the imbuing back, so a single pool cannot say
     what is true. How many tokens is bounded by the Hope you are willing to
     pay, which is a decision rather than a ceiling. */
  "subclass:Hedge: Foundation": [
    once("rest", "Enchanted Talisman"),
    res({
      feature: "Enchanted Talisman",
      max: open(),
      refresh: "rest",
      said: "Spend any number of Hope to place an equal number of tokens",
    }),
  ],

  "subclass:Hedge: Specialization": [
    once("rest", "Walk Between Worlds"),
    res({
      feature: "Walk Between Worlds",
      max: trait("spellcast"),
      refresh: "scene",
      said: "Place a number of tokens equal to your Spellcast trait",
    }),
  ],

  /* The circle ends when you leave it, which nothing on this sheet can know.
     So the pile is manual and the rule underneath says why. */
  "subclass:Hedge: Mastery": [
    once("rest", "Circle of Power"),
    res({
      feature: "Circle of Power",
      max: trait("spellcast"),
      refresh: "manual",
      said: "place a number of tokens equal to your Spellcast trait on this card",
    }),
  ],

  "community:Seaborne": [
    res({
      feature: "Know the Tide",
      max: level(),
      refresh: "session",
      said: "You can hold a number of tokens equal to your level",
    }),
  ],

  /* `decrement`, and it is the only one. The card says "remove a token", not
     "clear all", and the difference is the whole bargain of the
     transformation: you starve one long rest at a time unless you feed. */
  "transformation:Vampire": [
    res({
      feature: "Feed",
      max: fixed(6),
      refresh: "longRest",
      onRefresh: "decrement",
      onEmpty: "You make action and reaction rolls with disadvantage.",
      said: "You can hold up to 6 tokens at a time",
    }),
  ],

  "domainCard:Unleash Chaos": [
    res({
      max: trait("spellcast"),
      refresh: "session",
      onRefresh: "fill",
      said: "place a number of tokens equal to your Spellcast trait on this card",
    }),
  ],

  /* The card's own parenthesis, and the reason `floor` exists: Agility can
     be −1 at level 1, so the ceiling is genuinely negative without it. */
  "domainCard:Flight": [
    res({
      max: trait("agility", 1),
      refresh: "manual",
      said: "place a number of tokens equal to your Agility on this card (minimum 1)",
    }),
  ],

  "domainCard:Strategic Approach": [
    res({
      max: trait("knowledge", 1),
      refresh: "longRest",
      onRefresh: "fill",
      said: "place a number of tokens equal to your Knowledge on this card (minimum 1)",
    }),
  ],

  "domainCard:Inspirational Words": [
    res({
      max: trait("presence"),
      refresh: "longRest",
      onRefresh: "fill",
      said: "place a number of tokens on this card equal to your Presence",
    }),
  ],

  "domainCard:Invisibility": [
    res({
      max: trait("spellcast"),
      refresh: "manual",
      said: "Place a number of tokens on this card equal to your Spellcast trait",
    }),
  ],

  /* Placed from the Hit Points you marked, which is a number the card cannot
     know in advance and the sheet has no business guessing. */
  "domainCard:Never Upstaged": [
    res({
      max: open(),
      refresh: "manual",
      said: "place a number of tokens equal to the number of Hit Points you marked",
    }),
  ],

  "domainCard:Uncanny Disguise": [
    res({
      max: trait("spellcast"),
      refresh: "manual",
      said: "Place a number of tokens equal to your Spellcast trait on this card",
    }),
  ],

  /* Nothing gives this back — it is a store you fill by taking magic damage
     and empty by spending. `manual` is the truthful scope, not a gap. */
  "domainCard:Spellcharge": [
    res({
      max: trait("spellcast"),
      refresh: "manual",
      said: "You can store a number of tokens equal to your Spellcast trait",
    }),
  ],

  "domainCard:Twilight Toll": [
    res({
      max: open(),
      refresh: "rest",
      said: "When you choose a new target or take a rest, clear all unspent tokens",
    }),
  ],

  "domainCard:Thorn Skin": [
    once("rest"),
    res({
      max: trait("spellcast"),
      refresh: "rest",
      said: "place a number of tokens equal to your Spellcast trait on this card",
    }),
  ],

  /* Counting *up* rather than down: the tokens are the dome's marked Hit
     Points and three of them ends it. Still a pile of counters on a card,
     which is why it is here and not somewhere cleverer. */
  "domainCard:Wild Fortress": [
    res({
      name: "Hit Points",
      max: fixed(3),
      refresh: "manual",
      said: "Place tokens on this card to represent marking Hit Points",
    }),
  ],

  /* "Equal to the number of Sage domain cards in your loadout and vault" is
     derivable in principle and `open` anyway: a ceiling kind for it would be
     one kind serving one card, and the honest failure — the sheet declining
     to state a number it would have to define a rule to know — is better
     than a number that is quietly wrong the moment you vault a card. */
  "domainCard:Fane of the Wilds": [
    res({
      max: open(),
      refresh: "longRest",
      said: "place a number of tokens equal to the number of Sage domain cards",
    }),
  ],

  "domainCard:Restoration": [
    res({
      max: trait("spellcast"),
      refresh: "longRest",
      onRefresh: "fill",
      said: "place a number of tokens equal to your Spellcast trait on this card",
    }),
  ],

  /* The GM's Fear pool at the moment you cast it. This system *has* that
     number — it is a world setting and the HUD draws it — and it is still
     `open`, because a ceiling is a standing fact and this is a snapshot: the
     pool moves every roll, and a ceiling that tracked it would take counters
     off your card when the GM spent Fear. */
  "domainCard:Umbral Veil": [
    once("rest"),
    res({
      max: open(),
      refresh: "scene",
      said: "place a number of tokens on this card equal to the number of Fear",
    }),
  ],

  "domainCard:Dark Army": [
    once("longRest"),
    res({
      max: fixed(8),
      refresh: "rest",
      said: "Place 8 tokens on this card",
    }),
  ],

  /* A pile of one, and the only card that is a *state* rather than a count.
     Being Charged is on or off, you become it and clear it, and it goes away
     at your next long rest — which is a counter you place on a card in every
     respect except how many of them there are. It is not a `condition`
     either: `CONDITIONS` is deliberately the three the rules name, and this
     is one subclass's word for one subclass's rule. */
  "subclass:Primal Origin: Mastery": [
    res({
      name: "Charge",
      feature: "Arcane Charge",
      max: fixed(1),
      refresh: "longRest",
      said: "You stop being Charged at your next long rest",
    }),
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   THE BUDGETS

   "Once per rest" and its four siblings. One line each, and the line names
   the feature it belongs to when the document has more than one — the
   Features panel draws a row per rule, so a resource that could not name
   its rule would have to be drawn on all of them.
   ══════════════════════════════════════════════════════════════════════ */

const BUDGETS = {
  /* ── classes and subclasses ─────────────────────────────────────────── */
  "class:Bard": [once("session", "Rally")],
  "class:Guardian": [once("longRest", "Unstoppable")],
  "class:Sorcerer": [once("longRest", "Channel Raw Power")],
  "class:Witch": [once("longRest", "Commune")],

  "subclass:Troubadour: Foundation": [once("longRest", "Gifted Performer")],
  "subclass:Troubadour: Mastery": [once("longRest", "Virtuoso")],
  "subclass:Wordsmith: Foundation": [once("longRest", "Rousing Speech")],
  "subclass:Wordsmith: Specialization": [once("session", "Eloquent")],
  "subclass:Warden of the Elements: Specialization": [once("rest", "Elemental Aura")],
  "subclass:Warden of Renewal: Foundation": [once("longRest", "Clarity of Nature")],
  "subclass:Warden of Renewal: Specialization": [once("longRest", "Warden’s Protection")],
  "subclass:Beastbound: Mastery": [once("longRest", "Loyal Friend")],
  "subclass:Syndicate: Specialization": [once("session", "Contacts Everywhere")],
  "subclass:Divine Wielder: Foundation": [once("longRest", "Sparing Touch")],
  "subclass:Divine Wielder: Specialization": [once("longRest", "Devout")],
  "subclass:Elemental Origin: Mastery": [once("longRest", "Transcendence")],
  "subclass:Primal Origin: Specialization": [once("longRest", "Enchanted Aid")],
  "subclass:Call of the Brave: Foundation": [once("longRest", "Battle Ritual")],
  "subclass:Call of the Slayer: Specialization": [once("longRest", "Weapon Specialist")],
  "subclass:School of Knowledge: Specialization": [once("rest", "Perfect Recall")],
  "subclass:Executioners Guild: Mastery": [once("longRest", "True Strike")],
  "subclass:Juggernaut: Specialization": [once("rest", "Eye for an Eye")],
  "subclass:Martial Artist: Mastery": [once("rest", "Limit Breaker")],
  "subclass:Pact of the Endless: Foundation": [once("rest", "Deathless Embrace")],
  "subclass:Pact of the Endless: Specialization": [once("rest", "Damage Sink")],
  "subclass:Pact of the Endless: Mastery": [once("longRest", "Dark Aegis")],
  "subclass:Pact of the Wrathful: Mastery": [once("rest", "Otherworldly Ire")],
  "subclass:Moon: Specialization": [once("session", "Moonbeam")],
  "subclass:Moon: Mastery": [once("rest", "Lunar Phases")],

  /* ── heritage ───────────────────────────────────────────────────────── */
  "ancestry:Faerie": [once("session", "Luckbender")],
  "ancestry:Goblin": [once("rest", "Danger Sense")],
  "ancestry:Gnome": [once("scene", "Flicker Step")],
  "ancestry:Tidekin": [once("rest", "Lifespring")],
  /* The only document in the set with two, one per feature — which is what
     the `feature` field is for. */
  "ancestry:Aetheris": [once("longRest", "Hallowed Aura"), once("scene", "Celestial Wings")],
  "community:Orderborne": [once("rest", "Dedicated")],
  "community:Wanderborne": [once("session", "Nomadic Pack")],
  "community:Freeborne": [once("session", "Unbound")],
  "community:Hearthborne": [once("longRest", "Close-Knit")],
  "community:Reborne": [once("rest", "Found Family")],
  "community:Warborne": [once("session", "Brave Face")],

  /* ── domain cards ───────────────────────────────────────────────────
     Sixty of them, and none needs a feature name: a domain card is one
     rule, so the resource belongs to the document. */
  "domainCard:Premonition": [once("longRest")],
  "domainCard:Arcana-Touched": [once("rest")],
  "domainCard:Confusing Aura": [once("longRest")],
  "domainCard:Earthquake": [once("rest")],
  "domainCard:Sensory Projection": [once("rest")],
  "domainCard:A Soldier’s Bond": [once("longRest")],
  "domainCard:Scramble": [once("rest")],
  "domainCard:Deadly Focus": [once("rest")],
  "domainCard:Battle-Hardened": [once("longRest")],
  "domainCard:Battle Cry": [once("longRest")],
  "domainCard:Frenzy": [once("longRest")],
  "domainCard:Reaper’s Strike": [once("longRest")],
  "domainCard:Deft Maneuvers": [once("rest")],
  "domainCard:Signature Move": [once("rest")],
  "domainCard:Bone-Touched": [once("rest")],
  "domainCard:Splintering Strike": [once("longRest")],
  "domainCard:Book of Illiat": [once("rest")],
  "domainCard:Book of Vagras": [once("rest")],
  "domainCard:Book of Exota": [once("rest")],
  "domainCard:Book of Grynn": [once("longRest")],
  "domainCard:Manifest Wall": [once("rest")],
  "domainCard:Teleport": [once("longRest")],
  "domainCard:Banish": [once("rest")],
  "domainCard:Book of Homet": [once("longRest")],
  "domainCard:Codex-Touched": [once("rest")],
  "domainCard:Book of Vyola": [once("longRest")],
  "domainCard:Book of Ronin": [once("longRest")],
  "domainCard:Disintegration Wave": [once("longRest")],
  "domainCard:Transcendent Union": [once("longRest")],
  "domainCard:Enrapture": [once("rest")],
  "domainCard:Troublemaker": [once("rest")],
  "domainCard:Hypnotic Shimmer": [once("rest")],
  "domainCard:Share the Burden": [once("rest")],
  "domainCard:Astral Projection": [once("longRest")],
  "domainCard:Copycat": [once("longRest")],
  "domainCard:Midnight-Touched": [once("rest")],
  "domainCard:Night Terror": [once("longRest")],
  "domainCard:Eclipse": [once("longRest")],
  "domainCard:Towering Stalk": [once("rest")],
  "domainCard:Healing Field": [once("longRest")],
  "domainCard:Sage-Touched": [once("rest")],
  "domainCard:Wild Surge": [once("longRest")],
  "domainCard:Rejuvenation Barrier": [once("rest")],
  "domainCard:Plant Dominion": [once("longRest")],
  "domainCard:Mending Touch": [once("longRest")],
  "domainCard:Reassurance": [once("rest")],
  "domainCard:Second Wind": [once("rest")],
  "domainCard:Divination": [once("longRest")],
  "domainCard:Smite": [once("rest")],
  "domainCard:Zone of Protection": [once("longRest")],
  "domainCard:Splendor-Touched": [once("longRest")],
  "domainCard:Invigoration": [once("rest")],
  "domainCard:Bold Presence": [once("rest")],
  "domainCard:Critical Inspiration": [once("rest")],
  "domainCard:Lean On Me": [once("longRest")],
  "domainCard:Rousing Strike": [once("rest")],
  "domainCard:Full Surge": [once("longRest")],
  "domainCard:Siphon Essence": [once("longRest")],
  "domainCard:Shared Trauma": [once("rest")],
  "domainCard:Dread-Touched": [once("rest")],

  /* ── equipment ──────────────────────────────────────────────────────
     The half of this that had nowhere to go at all. Armour and weapons
     carry a named feature and loot does not, which is the difference
     between a suit with a rule printed on it and a trinket that *is* its
     rule. */
  "armor:Dragonscale Armor": [once("shortRest", "Impenetrable")],
  "loot:Piercing Arrows": [once("rest", "", 3, "three times per rest")],
  "loot:Corrector Sprite": [once("shortRest")],
  "loot:Ring of Resistance": [once("longRest")],
  "loot:Box of Many Goods": [once("longRest")],
  "loot:Airblade Charm": [once("rest", "", 3, "three times per rest")],
  "loot:Paragon’s Chain": [once("longRest")],
  "loot:Elusive Amulet": [once("longRest")],
  "loot:Shard of Memory": [once("longRest")],
  "loot:Ring of Unbreakable Resolve": [once("session")],
  "loot:Belt of Unity": [once("session")],
  "weapon:Blitz Hammer": [once("scene", "Accelerator")],
  "armor:Enchanter’s Robes": [once("scene", "Mnemonic")],
  "armor:Stormthread Habit": [once("scene", "Absorbing")],
  "armor:Gilded Sunplate": [once("scene", "Resplendent")],
  "armor:Cloverweave Cloak": [once("scene", "Fortune-Favored")],
  "armor:Darkweave Shroud": [once("rest", "Ghostwalker")],
  "armor:Hallowed Heroplate": [once("longRest", "Blessed")],
  "loot:Traveler’s Bell": [once("longRest")],
  "loot:Kingfisher’s Net": [once("longRest")],
  "loot:Titan’s Girdle": [once("scene")],
  "loot:Furball Bag": [once("rest")],
  "loot:Escher’s Mirrorball": [once("longRest")],
  "loot:Gadiman’s Backpack": [once("rest")],
  "loot:Eclipse Coin": [once("rest")],
  "loot:Sorcerer’s Hat": [once("rest")],
  "loot:Namer’s Oracle": [once("session")],
  "loot:Crucible Frames": [once("rest", "", 3, "three times per rest")],
  "loot:Two-Faced Aegis Brooch": [once("rest")],
  "loot:Iron Dagger Pendant": [once("longRest")],
  "loot:Rings of Alliance": [once("session")],
  "loot:Phobophage’s Circlet": [once("scene")],
  "loot:Warp Pendant": [once("rest")],
  "loot:Communion Relic": [once("rest")],
  "loot:Augur’s Relic": [once("longRest")],
};

/* ══════════════════════════════════════════════════════════════════════
   DECLINED

   Cards whose text matches the sweep and which deliberately carry no
   resource. One entry per card with the reason, and the check fails if one
   stops matching — a card that no longer says what we declined it for is a
   card that has been rewritten, and a rewrite deserves a fresh reading.
   ══════════════════════════════════════════════════════════════════════ */

export const DECLINED = {
  "consumable:Displacement Token":
    "“Token” is the item's own name. The only limit it states is a duration.",
  "subclass:Poisoners Guild: Specialization":
    "Twin Fang spends the Foundation card's tokens; it has no pool of its own.",
  "ancestry:Firbolg":
    "Matched on the feature name “Charge”, which is a move rather than a meter.",
  "weapon:Powered Gauntlet":
    "Matched on the feature name “Charged”. The feature costs a Stress and " +
    "counts nothing.",
};

/* ══════════════════════════════════════════════════════════════════════ */

/** Every annotation, keyed `type:name`. */
const RESOURCES = { ...PILES, ...BUDGETS };
export default RESOURCES;

/**
 * Attach the annotations to a pack's entries.
 *
 * Called at each pack's own `export default` rather than centrally in
 * `build-packs.mjs`, because `tools/verify/` imports these modules directly
 * to draw THE DECK and would otherwise draw cards the game does not have.
 *
 * `said` is stripped on the way in — it is the checker's evidence, not the
 * document's data, and a schema that carried it would be shipping a copy of
 * the rules text next to the rules text.
 */
export function withResources(entries) {
  for (const e of entries) {
    const found = RESOURCES[`${e.type}:${e.name}`];
    if (!found) continue;
    /* eslint-disable-next-line no-unused-vars */
    e.system.resources = found.map(({ said, ...keep }) => ({ ...keep }));
  }
  return entries;
}
