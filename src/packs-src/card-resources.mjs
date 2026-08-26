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

/* The one module this reads. See THE MARKED DECKS at the foot: Root and Void
   are annotated by derivation rather than by hand, so their card list has to
   be here. Nothing else in this file imports anything, and nothing else
   should — every other entry is a reading of a card somebody else printed. */
import MARKED_CARDS from "./marked-cards.mjs";

const fixed = (n) => ({ kind: "fixed", n, trait: "", floor: 0 });
const trait = (t, floor = 0) => ({ kind: "trait", n: 1, trait: t, floor });
const level = (floor = 0) => ({ kind: "level", n: 1, trait: "", floor });
const prof = (floor = 0) => ({ kind: "proficiency", n: 1, trait: "", floor });
const tier = (floor = 0) => ({ kind: "tier", n: 1, trait: "", floor });
const open = () => ({ kind: "open", n: 0, trait: "", floor: 0 });

const res = ({
  name = "Tokens",
  value = 0,
  max = open(),
  refresh = "manual",
  onRefresh = "clear",
  feature = "",
  onEmpty = "",
  said,
}) => ({ name, value, max, refresh, onRefresh, feature, onEmpty, said });

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

  /* ── the one class currency that is not Hope ──────────────────────
     Favor, and it is the largest single gap the sweep turned up: thirteen
     Pact features across both subclasses spend it, and the Warlock class
     document carried no pool at all. A player had thirteen cards saying
     "spend a Favor" and nowhere on the sheet that Favor existed.

     `open`, because the card states no ceiling — you gain your Spellcast
     trait's worth on a downtime move and one at a time in play, and
     nothing caps the pile. `value: 3` because "You start with 3 Favor" is
     the card's own first sentence, so a freshly dragged Warlock arrives
     with them; `once()` has always done the same thing for the same
     reason, and a budget you have not spent is not a budget at zero.

     `manual` and not a rest scope. Favor does not come back — it is
     earned, which is the whole texture of the class, and a refresh here
     would hand out three a night. */
  "class:Warlock": [
    res({
      name: "Favor",
      value: 3,
      feature: "Favor",
      max: open(),
      refresh: "manual",
      said: "You start with 3 Favor",
    }),
  ],

  /* The charge half of Rune Ward. Its d8 is in `DICE`; this is the ward
     itself, which is spent by an 8 rather than by being used. */
  "domainCard:Rune Ward": [
    res({
      name: "Ward",
      value: 1,
      max: fixed(1),
      refresh: "rest",
      onRefresh: "fill",
      said: "It can be recharged for free on your next rest",
    }),
  ],

  /* ── the variant tables ─────────────────────────────────────────────
     One reading, printed on four documents, because the Western revolver
     runs a tier ladder and a ladder is four weapons. They are listed
     separately rather than folded together for the reason `PAINFUL_W` and
     `PAINFUL_A` stay two constants: a key here names a *document*, and four
     documents is four keys even when the sentence is the same.

     `refresh: "manual"` is the load-bearing part and the whole reason this
     needed reading rather than sweeping. Every other budget in this file
     comes back when a scope comes round; Ammo comes back when you **mark a
     Stress**, which is a price rather than a scope, and there is no refresh
     kind for it. Handing it `rest` would refill six shots on a short rest
     that the card says cost a Stress each — generous, invisible, and wrong
     in the direction nobody checks. So the pool is manual and the sentence
     under it is what tells you how to fill it.

     It arrives **full**, which is `once()`'s own split: the card says
     *place* six, and a revolver you have just picked up is loaded. */
  ...Object.fromEntries(
    ["Revolver", "Improved Revolver", "Advanced Revolver", "Legendary Revolver"].map((name) => [
      `weapon:${name}`,
      [
        res({
          name: "Ammo",
          value: 6,
          max: fixed(6),
          refresh: "manual",
          onRefresh: "fill",
          feature: "Six Shot",
          said: "Place 6 Ammo tokens on your character sheet.",
        }),
      ],
    ]),
  ),
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

  /* Two gates the System Reference Document 2.0 added, and the only budgets in
     this block whose `said` is not on a card somebody else printed — Dread is
     transcribed from *Hope and Fear* and the erratum is edited into
     `dread-cards.mjs` in place, since there is no generated file for an overlay
     to sit on top of. The reading is the same one either way: "Once per scene"
     is a use limit and not a duration, so it is a budget of one that comes back
     with the scene. `once("scene")` derives the phrase from the scope, which is
     what keeps the drift check honest about a card we typed in ourselves. */
  "domainCard:Summon Horror": [once("scene")],
  "domainCard:Darkfire": [once("scene")],

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
   KEPT DICE

   Eighteen rules keep a die rather than a count, and a chit cannot say what
   one is showing. See `DIE_MODES` in `src/module/config.ts` for the three
   shapes and `design/keep.js` for the object.

   Two things about this block are worth knowing before reading it.

   **`grow` is prose and nothing reads it.** A Rally Die becomes a d8 at
   level 5 and a d10 at Wordsmith Mastery; an Unstoppable Die becomes a d6 at
   level 5; a Combo Die grows by an *advancement option*. Those triggers live
   on three different documents and two of them are cards this one has never
   heard of, so the size is a number the table sets and the card prints its
   own sentence about when it moves. The alternative is this file learning to
   read another document's rules text, which is the thing the whole repo is
   arranged to avoid.

   **A climbing die's `onEmpty` is not decoration either.** All three say
   "when the value would exceed its maximum", and all three then do something
   *different* — Wild Surge charges a Stress, Unstoppable drops a stance,
   Zone of Protection simply ends. The tray refuses at the top and prints
   this, and a person reads it. That is the same bargain `onEmpty` has always
   struck for the Vampire's Feed.
   ══════════════════════════════════════════════════════════════════════ */

const die = ({
  name = "Dice",
  mode = "bag",
  faces = 6,
  max = open(),
  refresh = "manual",
  onRefresh = "clear",
  feature = "",
  grow = "",
  onEmpty = "",
  said,
}) => ({ name, mode, faces, dice: [], max, refresh, onRefresh, feature, grow, onEmpty, said });

export const DICE = {
  /* ── a bag you spend from ─────────────────────────────────────────── */

  /* The only pool in the corpus that arrives **rolled**. "At the beginning
     of each session, roll a number of d4s" — so `reroll` rather than `fill`,
     and the tray offers no roll button, because a button that rerolled them
     would be offering to change an answer the session already gave. */
  "class:Seraph": [
    die({
      name: "Prayer Dice", faces: 4, max: trait("spellcast"),
      refresh: "session", onRefresh: "reroll", feature: "Prayer Dice",
      said: "roll a number of d4s equal to your subclass's Spellcast trait",
      onEmpty: "At the end of each session, clear all unspent Prayer Dice.",
    }),
  ],

  /* One die, because this is the *Bard's own*. The feature gives one to
     every PC, and the other four land on four other sheets — which this file
     cannot reach and should not try to: handing out an Item to the party is
     a gesture, not an annotation. */
  "class:Bard": [
    die({
      name: "Rally Die", faces: 6, max: fixed(1),
      refresh: "session", onRefresh: "clear", feature: "Rally",
      said: "give yourself and each of your allies a Rally Die",
      grow: "At level 5, your Rally Die increases to a d8. Epic Poetry takes it to a d10.",
      onEmpty: "At the end of each session, clear all unspent Rally Dice.",
    }),
  ],

  /* `proficiency`, and the reason that ceiling exists at all. */
  "subclass:Call of the Slayer: Foundation": [
    die({
      name: "Slayer Dice", faces: 6, max: prof(),
      refresh: "session", onRefresh: "clear", feature: "Slayer",
      said: "You can store a number of Slayer Dice equal to your Proficiency",
      onEmpty:
        "At the end of each session, clear any unspent Slayer Dice on this card " +
        "and gain a Hope per die cleared.",
    }),
  ],

  "domainCard:Sigil of Retribution": [
    die({
      name: "Sigil Dice", faces: 8, max: level(),
      said: "You can hold a number of d8s equal to your level",
      onEmpty:
        "This effect ends when the marked adversary is defeated or you cast " +
        "Sigil of Retribution again.",
    }),
  ],

  /* ── one die, counting up ─────────────────────────────────────────── */

  /* The scene is the scope, not the rest. "When the die's value would exceed
     its maximum value **or when the scene ends**, remove the die" — and the
     once-per-long-rest half is already a `BUDGETS` entry on the same card,
     which is exactly why the two are separate arrays. */
  "class:Guardian": [
    die({
      name: "Unstoppable Die", mode: "climb", faces: 4,
      refresh: "scene", onRefresh: "clear", feature: "Unstoppable",
      said: "At level 1, your Unstoppable Die is a d4",
      grow: "At level 5, your Unstoppable Die increases to a d6.",
      onEmpty:
        "When the die's value would exceed its maximum value or when the scene " +
        "ends, remove the die and drop out of Unstoppable.",
    }),
  ],

  "domainCard:Wild Surge": [
    die({
      name: "Wild Surge Die", mode: "climb", faces: 6,
      refresh: "rest", onRefresh: "clear",
      said: "place a d6 on this card with the 1 value facing up",
      onEmpty:
        "When the die's value would exceed 6 or you take a rest, this form drops " +
        "and you must mark an additional Stress.",
    }),
  ],

  "domainCard:Zone of Protection": [
    die({
      name: "Zone Die", mode: "climb", faces: 6,
      refresh: "longRest", onRefresh: "clear",
      said: "place a d6 on this card with the 1 value facing up",
      onEmpty: "When the die's value would exceed 6, this effect ends.",
    }),
  ],

  /* ── named, not kept ──────────────────────────────────────────────── */

  /* Nothing is held; what the sheet had nowhere to record is the *size*.
     All three of these grow, and all three grow by something this file
     cannot see — a level, a subclass card, an advancement option. */
  "class:Warlock": [
    die({
      name: "Patron Die", mode: "roll", faces: 6, feature: "Patron’s Pact",
      said: "rolling your Patron Die and adding its result to the total",
      grow: "Your Patron Die starts at a d6 and increases to a d8 at level 5.",
    }),
  ],

  "class:Brawler": [
    die({
      name: "Combo Die", mode: "roll", faces: 4, feature: "Combo Strike",
      said: "Your Combo Die starts as a d4",
      grow: "Once per tier, you can increase your Combo Die by one step as a " +
        "level advancement option.",
    }),
  ],

  /* The count is your tier and the card says so, so the tray records the one
     thing it does not: which die. Executioners Guild takes it to d6 at
     Foundation and d8 at Mastery, which is two other documents again. */
  "class:Assassin": [
    die({
      name: "Marked for Death", mode: "roll", faces: 4, feature: "Marked for Death",
      said: "add a number of d4s equal to your tier to the damage roll",
      grow: "Ambush uses d6s instead of d4s; Backstab uses d8s instead of d6s.",
    }),
  ],

  /* Both halves of one card. The charge is a resource — it is spent and
     comes back on a rest — and the d8 is a die you roll, and the card's
     bargain is that rolling an 8 spends the charge. Two records because they
     are two facts; nothing here automates the link between them, because
     "if the result is 8" is a reading and the player has the card. */
  "domainCard:Rune Ward": [
    die({
      name: "Ward Die", mode: "roll", faces: 8,
      said: "reduce incoming damage by 1d8",
      onEmpty:
        "If the Ward Die result is 8, the ward's power ends after it reduces " +
        "damage this turn. It can be recharged for free on your next rest.",
    }),
  ],
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

  /* ── dice that live on another card ────────────────────────────────
     Four subclass cards name a die pool and none of them holds one. The
     tray is on the *class* card in every case, which is where the die is
     gained and where the ceiling is stated; these change what it does.
     That is the same reading Poisoners Guild got about the Foundation
     card's tokens, arriving three more times.

     Worth saying why this is not a sweep refinement like the Duality
     pair in `check-resources.mjs`: "the Bard's card holds the Rally Die
     and the Troubadour's does not" is a fact about these two cards, read
     off them, and a fifth card could perfectly well hold its own. The
     Hope Die will never be a tray, and that is a fact about the game. */
  "subclass:Troubadour: Specialization":
    "Maestro changes what a Rally Die does when it is given away. The tray " +
    "is on the Bard class card, which is where the die is gained.",
  "subclass:Wordsmith: Mastery":
    "Epic Poetry grows the Rally Die to a d10. The Bard's own tray records " +
    "the size, and the card's `grow` sentence names this feature.",
  "subclass:Call of the Slayer: Mastery":
    "Reroll 1s when you roll your Slayer Dice. The pool is on the Foundation " +
    "card, which states the Proficiency ceiling.",
  "subclass:Pact of the Wrathful: Foundation":
    "Patron's Fury and Deadly Vengeance both roll Patron Dice. The die is " +
    "the Warlock class card's; nothing is kept here.",
};

/* ══════════════════════════════════════════════════════════════════════
   THE MARKED DECKS

   Root and Void are **derived rather than listed**, and that is a departure
   from everything above it for a reason that is about who wrote the cards.

   Every entry above is a *reading*: somebody opened a printed card, decided
   whether "until your next rest" was a duration or a use limit, and wrote down
   the words they decided it from. A regex cannot do that, which is what the
   whole `said` ratchet is for — of the thirty-eight cards matching
   `until…rest`, thirty-six are durations and two are use limits.

   These forty-two we wrote, to a rule `tools/check-marked.mjs` enforces: a
   card is either gated or it scales with Proficiency, and where it is gated it
   says so in the corpus's own words at the head of its text. So there is no
   reading to record, and listing them would be a second copy of a fact
   `marked-cards.mjs` already states — `equipment.mjs`'s argument arriving on a
   deck. Add a card and it is annotated by construction; miss the gate and
   `check-marked.mjs` fails the build before this ever runs.

   The provenance survives the derivation, which is the part that matters:
   `once()` takes its `said` from the refresh scope, so an entry here is still
   evidenced by the words "once per rest" being on the card, and still fails
   the drift check the day they leave it.
   ══════════════════════════════════════════════════════════════════════ */

const MARKED = Object.fromEntries(
  MARKED_CARDS.flatMap((c) => {
    const t = String(c.text).replace(/\*\*|__|\*|_/g, "");
    /* Long first: "once per long rest" contains "once per rest"'s words in a
       different order but not its phrase, and testing the shorter one first
       would still be the wrong habit to write down. */
    const scope = /once per long rest/i.test(t)
      ? "longRest"
      : /once per rest/i.test(t)
        ? "rest"
        : null;
    return scope ? [[`domainCard:${c.name}`, [once(scope)]]] : [];
  }),
);

/* ══════════════════════════════════════════════════════════════════════ */

/** Every annotation, keyed `type:name`. */
const RESOURCES = { ...PILES, ...BUDGETS, ...MARKED };
export default RESOURCES;

/**
 * Attach only kept-die annotations to a pack's entries.
 *
 * Called at each pack's own `export default` rather than centrally in
 * `build-packs.mjs`, because `tools/verify/` imports these modules directly
 * to draw THE DECK and would otherwise draw cards the game does not have.
 *
 * Counters are deliberately not attached to compendium documents. A player
 * or GM adds the counters they want after the document is on a character
 * sheet; the compendium remains plain rules content. `said` is stripped from
 * dice on the way in because it is checker evidence, not document data.
 */
export function withDice(entries) {
  for (const e of entries) {
    const key = `${e.type}:${e.name}`;
    const dice = DICE[key];
    /* eslint-disable-next-line no-unused-vars */
    if (dice) e.system.dice = dice.map(({ said, ...keep }) => ({ ...keep }));
  }
  return entries;
}
