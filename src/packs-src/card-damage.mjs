/**
 * Which cards roll damage of their own, and what they roll.
 *
 * Hand-authored, and the second file in this repo that is a *reading* of the
 * rules text rather than a transcription of it. `card-resources.mjs` is the
 * first and the argument is unchanged: `domain-cards.mjs` is generated from
 * the official snapshot and may be regenerated at any time, and an
 * interpretation living inside a generated file is an interpretation that gets
 * overwritten. So the reading lives beside the entries rather than inside
 * them, keyed `type:name` — the key `card-printings.mjs` and
 * `card-resources.mjs` both use, for the same reason.
 *
 * **Why not derive it.** Two measurements over the corpus, and they point the
 * same way. Seventy-seven entries print a complete damage expression — a
 * count, a die and usually a bonus — and the sniff this replaced looked for
 * the literal string "damage roll": that matched fifty entries, thirty-four of
 * which print no dice at all, and **not one** of the cards with a complete
 * expression says the phrase. The two sets barely overlap, because English is
 * not being used the same way in them. "Add a d6 to your damage roll" is a
 * clause about a roll the *weapon* is making; "they take 2d8+4 magic damage"
 * is the card rolling.
 *
 * And a pattern cannot finish the job even where it fires. Falling Sky prints
 * "1d20+2 magic damage **for each Stress marked**", which is a printed
 * expression and not a formula — the dice repeat a number of times only the
 * table knows at the moment of casting. Unleash Chaos rolls "a number of d10s
 * equal to the tokens you spent". Preservation Blast scales its count on the
 * Spellcast trait, and the only scaling this shape offers is Proficiency.
 * Every one of those matches a regex for dice, and recording any of them as a
 * fixed count would be quietly wrong on every character. Somebody has to read
 * them, which is what `DECLINED` is.
 *
 * **What the checker does instead.** Every mode records `said` — the exact
 * phrase the reading was taken from — so upstream rewording fails the build
 * rather than silently leaving a button rolling the wrong dice, and an entry
 * naming a card that has been renamed fails too. What it cannot do is prove
 * completeness, so it does the honest second-best: it re-runs the sweep, and
 * every card that matches must either be annotated here or named in `DECLINED`
 * with a reason. That is `fetch-cards.mjs`'s `TYPOS` list, applied to a third
 * problem.
 *
 * `said` is checker evidence and not document data, and `withDamage` strips it
 * on the way in exactly as `withDice` strips it off a die pool.
 */

/**
 * One printed expression.
 *
 * The fields are `damageField`'s in `src/module/data/fields.ts` and in its
 * order, so a reader with both open is reading one sequence rather than two.
 * Three of them are worth stating here because they are decisions rather than
 * transcription:
 *
 * **`proficiency` is a flag and not a number.** Sixteen of the seventy-seven
 * say "using your Proficiency" and sixty-one do not, and the multiplier
 * belongs to the character rather than to the card — which is the rule the
 * marked decks were measured against, arriving from the other side: a card you
 * can cast again for nothing scales, and a card dealing flat dice is gated.
 *
 * **`name` is which printed mode**, not a label somebody invented. Blank is
 * the common case and means the card prints one expression; see the modal
 * block below for the ten that do not.
 *
 * **`type` may be blank.** Ground Pound prints "4d10+8 damage" and names no
 * type, and "" is that fact rather than a gap. Filling in `physical` because
 * the schema defaults to it would be this file deciding a rule the card
 * declines to.
 *
 * `direct` is on one card in the corpus and is the target's own reading of the
 * number rather than ours; **save-for-half is deliberately absent**, for the
 * reason it is absent from `damageField` — halving on a success is what
 * happens to the target after the dice land, and a damage expression is what
 * the caster rolls.
 */
const dmg = ({
  name = "",
  count = 1,
  dice,
  bonus = 0,
  proficiency = false,
  type = "",
  direct = false,
  said,
}) => ({ name, count, dice, bonus, proficiency, type, direct, said });

/* ══════════════════════════════════════════════════════════════════════
   ONE EXPRESSION

   The card prints a single set of dice, so the mode has no name and the
   button that rolls it needs none either. Forty-one of the fifty-two.
   ══════════════════════════════════════════════════════════════════════ */

const PRINTED = {
  /* ── domain cards ───────────────────────────────────────────────────
     Twenty-three, and the majority of the corpus. A domain card is one rule,
     so the expression belongs to the document and the mode stays unnamed —
     the same reason none of the domain-card budgets names a feature. */
  "domainCard:Cinder Grasp": [
    dmg({ count: 1, dice: "d20", bonus: 3, type: "magic", said: "takes 1d20+3 magic damage" }),
  ],
  "domainCard:Chain Lightning": [
    dmg({
      count: 2, dice: "d8", bonus: 4, type: "magic",
      said: "Targets who fail take 2d8+4 magic damage.",
    }),
  ],
  "domainCard:Telekinesis": [
    dmg({
      count: 1, dice: "d12", bonus: 4, proficiency: true, type: "physical",
      said: "deal d12+4 physical damage to the second target using your Proficiency",
    }),
  ],
  "domainCard:Earthquake": [
    dmg({
      count: 3, dice: "d10", bonus: 8, type: "physical",
      said: "Targets who fail take 3d10+8 physical damage",
    }),
  ],
  "domainCard:Rain of Blades": [
    dmg({
      count: 1, dice: "d8", bonus: 2, proficiency: true, type: "magic",
      said: "Targets you succeed against take d8+2 magic damage using your Proficiency.",
    }),
  ],
  "domainCard:Vicious Entangle": [
    dmg({
      count: 1, dice: "d8", bonus: 1, type: "physical",
      said: "dealing 1d8+1 physical damage",
    }),
  ],
  "domainCard:Corrosive Projectile": [
    dmg({
      count: 1, dice: "d6", bonus: 4, proficiency: true, type: "magic",
      said: "On a success, deal d6+4 magic damage using your Proficiency.",
    }),
  ],
  "domainCard:Towering Stalk": [
    dmg({
      count: 1, dice: "d8", proficiency: true, type: "physical",
      said: "dealing d8 physical damage using your Proficiency",
    }),
  ],
  "domainCard:Death Grip": [
    dmg({
      count: 3, dice: "d6", bonus: 2, type: "physical",
      said: "taking 3d6+2 physical damage",
    }),
  ],
  "domainCard:Bolt Beacon": [
    dmg({
      count: 1, dice: "d8", bonus: 2, proficiency: true, type: "magic",
      said: "dealing d8+2 magic damage using your Proficiency",
    }),
  ],
  "domainCard:Hideous Retribution": [
    dmg({
      count: 1, dice: "d6", proficiency: true, type: "magic",
      said: "mark a Stress to deal d6 magic damage using your Proficiency",
    }),
  ],

  /* The reaction is rolled with the Spellcast trait and the damage is not,
     which is the distinction Preservation Blast is declined for: a card
     saying "using your Spellcast trait" *after the dice* is scaling the
     count, and one saying it of the roll is naming the trait you roll. Both
     of these name the trait for the roll and scale the dice on Proficiency,
     so both are ordinary. */
  "domainCard:Siphon Essence": [
    dmg({
      count: 1, dice: "d12", bonus: 4, proficiency: true, type: "magic",
      said: "the target takes d12+4 magic damage using your Proficiency",
    }),
  ],

  /* The one card in the corpus that prints no damage type. See `dmg` above:
     the blank is the reading, not a field somebody forgot. */
  "domainCard:Ground Pound": [
    dmg({ count: 4, dice: "d10", bonus: 8, said: "Targets who fail take 4d10+8 damage." }),
  ],

  "domainCard:Null Grip": [
    dmg({ count: 2, dice: "d8", type: "magic", said: "they take 2d8 magic damage" }),
  ],
  "domainCard:Weight of the Void": [
    dmg({
      count: 2, dice: "d8", bonus: 4, type: "magic",
      said: "Targets you succeed against take 2d8+4 magic damage",
    }),
  ],
  "domainCard:Crush": [
    dmg({
      count: 1, dice: "d12", bonus: 4, proficiency: true, type: "magic",
      said: "they take d12+4 magic damage using your Proficiency.",
    }),
  ],
  "domainCard:Geometry of Ruin": [
    dmg({
      count: 4, dice: "d10", bonus: 6, type: "magic",
      said: "Targets who fail take 4d10+6 magic damage.",
    }),
  ],
  "domainCard:Barkskin": [
    dmg({
      count: 1, dice: "d8", bonus: 1, proficiency: true, type: "physical",
      said: "your unarmed attacks deal d8+1 physical damage using your Proficiency.",
    }),
  ],

  /* Hungry Fire is in both blocks of this file, and that is a reading rather
     than a mistake. The d8+2 is what casting it deals; the extra 1d8 an
     Ablaze creature takes is declined below, because it fires on the
     target's next spotlight and not on anybody pressing this card. */
  "domainCard:Hungry Fire": [
    dmg({
      count: 1, dice: "d8", bonus: 2, proficiency: true, type: "magic",
      said: "they take d8+2 magic damage using your Proficiency",
    }),
  ],

  "domainCard:Thorn Spray": [
    dmg({
      count: 2, dice: "d8", bonus: 4, type: "physical",
      said: "Targets you succeed against take 2d8+4 physical damage",
    }),
  ],
  "domainCard:Wildfire": [
    dmg({
      count: 3, dice: "d10", bonus: 4, type: "magic",
      said: "Targets who fail take 3d10+4 magic damage",
    }),
  ],
  "domainCard:Bloom": [
    dmg({
      count: 4, dice: "d8", bonus: 5, type: "physical",
      said: "Targets who fail take 4d8+5 physical damage.",
    }),
  ],
  "domainCard:The Undergrowth Wakes": [
    dmg({
      count: 3, dice: "d12", bonus: 8, type: "physical",
      said: "Targets who fail take 3d12+8 physical damage",
    }),
  ],

  /* ── classes and subclasses ─────────────────────────────────────────
     Four, and all four print their dice on a *named* feature. The mode
     still has no name, because a feature name is not a mode: the document
     prints one expression and the row that draws it already says which
     rule it came from. Where a document prints two, the name earns its
     keep — see the modal block. */
  "subclass:School of War: Foundation": [
    dmg({
      count: 1, dice: "d10", type: "magic",
      said: "When you succeed with Fear on an attack roll, you deal an extra 1d10 magic damage.",
    }),
  ],

  /* Specialization and Mastery restate Face Your Fear at a larger size, so
     each card carries the expression it is currently worth rather than a
     delta. A card that says "increases to 2d10" is stating the whole roll,
     which is why these are annotations and the Winged Sentinel's
     "1d12 instead of 1d8" is declined: that one names two dice in one
     replacement clause and prints no damage type at all. */
  "subclass:School of War: Specialization": [
    dmg({
      count: 2, dice: "d10", type: "magic",
      said: "The extra magic damage from your “Face Your Fear” feature increases to 2d10",
    }),
  ],
  "subclass:School of War: Mastery": [
    dmg({
      count: 3, dice: "d10", type: "magic",
      said: "The extra magic damage from your “Face Your Fear” feature increases to 3d10",
    }),
  ],

  "subclass:Martial Artist: Specialization": [
    dmg({
      count: 1, dice: "d20", bonus: 3, proficiency: true, type: "magic",
      said: "On a success, deal d20+3 magic damage using your Proficiency.",
    }),
  ],

  /* ── heritage and transformations ───────────────────────────────────
     Four documents whose feature *is* a weapon you were born with. All
     four scale on Proficiency except the Firbolg's Charge, which is gated
     on a Stress instead — the marked decks' rule, printed in the corebook
     before anybody wrote it down. */
  "ancestry:Drakona": [
    dmg({
      count: 1, dice: "d8", proficiency: true, type: "magic",
      said: "treating it as an Instinct weapon that deals d8 magic damage using your Proficiency",
    }),
  ],
  "ancestry:Firbolg": [
    dmg({
      count: 1, dice: "d12", type: "physical",
      said: "you can mark a Stress to deal 1d12 physical damage to all targets within Melee range",
    }),
  ],
  "ancestry:Ribbet": [
    dmg({
      count: 1, dice: "d12", proficiency: true, type: "physical",
      said:
        "use your tongue as a Finesse Close weapon that deals d12 physical damage " +
        "using your Proficiency",
    }),
  ],
  "transformation:Vampire": [
    dmg({
      count: 1, dice: "d6", proficiency: true, type: "physical",
      said: "On a success, deal d6 physical damage using your Proficiency",
    }),
  ],

  /* ── consumables ────────────────────────────────────────────────────
     Ten, and the only place in this file where an expression is printed
     on something you throw away. Nine are flat, which is what a one-use
     object should be; Dragonbloom Tea is the exception and says so. */
  "consumable:Unstable Arcane Shard": [
    dmg({
      count: 1, dice: "d20", type: "magic",
      said: "Targets you succeed against take 1d20 magic damage.",
    }),
  ],
  "consumable:Improved Arcane Shard": [
    dmg({
      count: 2, dice: "d20", type: "magic",
      said: "Targets you succeed against take 2d20 magic damage.",
    }),
  ],
  "consumable:Major Arcane Shard": [
    dmg({
      count: 4, dice: "d20", type: "magic",
      said: "Targets you succeed against take 4d20 magic damage.",
    }),
  ],

  /* The one `direct` in the corpus. Direct damage is not reduced by armour
     and the card says the word, so the flag is a transcription here rather
     than a reading — which is exactly why it is a flag and not a sniff for
     the word somewhere in the paragraph. */
  "consumable:Dripfang Poison": [
    dmg({
      count: 8, dice: "d10", type: "magic", direct: true,
      said: "A creature who consumes this poison takes 8d10 direct magic damage.",
    }),
  ],

  "consumable:Jar of Lost Voices": [
    dmg({
      count: 6, dice: "d8", type: "magic",
      said: "Creatures within Far range unprepared for the sound take 6d8 magic damage.",
    }),
  ],
  "consumable:Dragonbloom Tea": [
    dmg({
      count: 1, dice: "d20", proficiency: true, type: "physical",
      said: "Targets you succeed against take d20 physical damage using your Proficiency.",
    }),
  ],
  "consumable:Stardrop": [
    dmg({
      count: 8, dice: "d20", type: "physical",
      said:
        "You can use this stardrop to summon a hailstorm of comets that deals 8d20 " +
        "physical damage to all targets within Very Far range.",
    }),
  ],

  /* The three elemental shards are one card printed three times: the same
     Reaction Roll, the same 3d6, a different condition after the comma. The
     dice are the shard's own and the condition is the target's problem, so
     the expression is the whole of what a press rolls.

     Each also prints a second die that is **not damage** and needs no
     decline: Emberite's Ablaze d4 marks a Hit Point on a 1 and Fulgurite's
     1d4 is Stress. `DECLINED` is for dice that look like this card's damage
     and are not, and neither of those is a damage expression at all. */
  "consumable:Emberite Shard": [
    dmg({
      count: 3, dice: "d6", type: "magic",
      said: "take 3d6 magic damage and become temporarily Ablaze",
    }),
  ],
  "consumable:Arcticite Shard": [
    dmg({
      count: 3, dice: "d6", type: "magic",
      said: "take 3d6 magic damage and become temporarily Restrained by ice.",
    }),
  ],
  "consumable:Fulgurite Shard": [
    dmg({
      count: 3, dice: "d6", type: "magic",
      said: "take 3d6 magic damage and mark 1d4 Stress",
    }),
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   SEVERAL, AND THE NAME IS WHICH

   Eleven documents print more than one expression, and `name` is what tells
   them apart. Two shapes, and both need it for the same reason.

   The grimoires and Conjure Swarm print three or four features of which one
   or two deal damage, so the name is the printed sub-feature's — Rune
   Circle, Fire Flies, Wall of Flame. A card that offered "Roll 2d12+4" with
   nothing else on the button would be asking the holder to remember which of
   Levitation, Recant and Rune Circle it belonged to.

   Tempest, Stunning Sunlight and Blighting Strike print several expressions
   of the *same* feature, and there the name is which one applies: Blizzard,
   Hurricane or Sandstorm; the targets who succeeded or the ones who failed;
   the roll having come up with Hope or with Fear. Only the first of those
   three is a choice, which is why the heading says "which" and not "pick".

   Warden of the Elements is the shape at its smallest — four elements, one
   of which deals damage — and the name is "Fire" because that is the word
   above the sentence. The card is not offering a Fire mode and three others
   that roll nothing; it is offering four states, and only one of them has
   dice to press.
   ══════════════════════════════════════════════════════════════════════ */

const MODAL = {
  /* Stunning Sunlight's shape one step further in: the mode is not a choice
     but *how the roll came up*, and here it is the duality itself. Both
     expressions are printed, exactly one of them is ever the answer, and
     which is a fact the plate on screen has already settled — so they are two
     buttons named for the two halves of a duality roll rather than one button
     and a sentence telling the presser to halve or double it. */
  "domainCard:Blighting Strike": [
    dmg({
      name: "With Hope", count: 1, dice: "d6", bonus: 1, proficiency: true, type: "magic",
      said: "On a roll with Hope, deal d6+1 magic damage using your Proficiency.",
    }),
    dmg({
      name: "With Fear", count: 1, dice: "d10", bonus: 1, proficiency: true, type: "magic",
      said: "On a roll with Fear, deal d10+1 magic damage using your Proficiency.",
    }),
  ],

  "domainCard:Book of Ava": [
    dmg({
      name: "Power Push", count: 1, dice: "d10", bonus: 2, proficiency: true, type: "magic",
      said: "take d10+2 magic damage using your Proficiency",
    }),
    dmg({
      name: "Ice Spike", count: 1, dice: "d6", proficiency: true, type: "physical",
      said: "deal d6 physical damage using your Proficiency",
    }),
  ],

  "domainCard:Book of Tyfar": [
    dmg({
      name: "Wild Flame", count: 2, dice: "d6", type: "magic",
      said: "Targets you succeed against take 2d6 magic damage",
    }),
  ],
  "domainCard:Book of Korvax": [
    dmg({
      name: "Rune Circle", count: 2, dice: "d12", bonus: 4, type: "magic",
      said: "take 2d12+4 magic damage",
    }),
  ],
  "domainCard:Book of Norai": [
    dmg({
      name: "Fireball", count: 1, dice: "d20", bonus: 5, proficiency: true, type: "magic",
      said: "Targets who fail take d20+5 magic damage using your Proficiency.",
    }),
  ],

  /* The construct's attacks rather than yours, and it is still this card's
     expression: nothing else on the sheet holds a construct, and the dice
     are printed here. */
  "domainCard:Book of Exota": [
    dmg({
      name: "Create Construct", count: 2, dice: "d10", bonus: 3, type: "physical",
      said: "their attacks deal 2d10+3 physical damage",
    }),
  ],

  "domainCard:Book of Grynn": [
    dmg({
      name: "Wall of Flame", count: 4, dice: "d10", bonus: 3, type: "magic",
      said: "anything that subsequently passes through the wall takes 4d10+3 magic damage",
    }),
  ],
  "domainCard:Conjure Swarm": [
    dmg({
      name: "Fire Flies", count: 2, dice: "d8", bonus: 3, type: "magic",
      said: "Spend a Hope to deal 2d8+3 magic damage to targets you succeeded against.",
    }),
  ],

  "domainCard:Tempest": [
    dmg({
      name: "Blizzard", count: 2, dice: "d20", bonus: 8, type: "magic",
      said: "Blizzard: Deal 2d20+8 magic damage",
    }),
    dmg({
      name: "Hurricane", count: 3, dice: "d10", bonus: 10, type: "magic",
      said: "Hurricane: Deal 3d10+10 magic damage",
    }),
    dmg({
      name: "Sandstorm", count: 5, dice: "d6", bonus: 9, type: "magic",
      said: "Sandstorm: Deal 5d6+9 magic damage",
    }),
  ],

  /* One roll against two bands of target, which is the only card in the
     corpus where a mode is *who* rather than *what*. Both are printed, both
     are rolled, and which one you need is a fact about the reaction roll
     rather than a choice you made — so they are two modes and not a mode
     and a rider. */
  "domainCard:Stunning Sunlight": [
    dmg({
      name: "Targets who succeed", count: 3, dice: "d20", bonus: 3, type: "magic",
      said: "Targets who succeed take 3d20+3 magic damage",
    }),
    dmg({
      name: "Targets who fail", count: 4, dice: "d20", bonus: 5, type: "magic",
      said: "Targets who fail take 4d20+5 magic damage",
    }),
  ],

  "subclass:Warden of the Elements: Foundation": [
    dmg({
      name: "Fire", count: 1, dice: "d10", type: "magic",
      said: "When an adversary within Melee range deals damage to you, they take 1d10 magic damage.",
    }),
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   DECLINED

   Sixty-one phrases on fifty-eight documents that print dice and are not this
   card's damage. One entry per phrase with the reason, and the check fails
   if one stops matching — a card that no longer says what we declined it for
   is a card that has been rewritten, and a rewrite deserves a fresh reading.

   An **array** per key rather than a string, which is where this parts
   company with `card-resources.mjs`'s `DECLINED`. Two things force it. The
   Werewolf declines twice for two unrelated reasons, and Hungry Fire is
   annotated *and* declined — one clause is what casting it deals and the
   other is a rider that fires on the target's next spotlight. A key holding
   one reason could say neither.

   Four readings between them cover the lot, and they are worth naming
   because each is a different way of not being this card's roll:

   - **Additive.** "Add a d6 to your damage roll" — the dice ride on a roll
     the weapon is making, which is why almost none of them print a damage
     type. There is nothing to print: the type is the weapon's. This is the
     largest group and the one the old sniff was actually finding.
   - **Reduction.** Rune Ward, Thorn Skin, Elemental Aura's Air. Dice, and
     they subtract.
   - **A count this shape cannot hold.** Equal to the Hope you spent, the
     tokens you spent, the Stress you marked, your tier, your Spellcast
     trait, the range increments you fell. `proficiency` is the only scaling
     the field offers and none of these is it.
   - **Somebody else's stat line.** Versatile prints an alternate set of
     weapon statistics, and a weapon's `damage` has been its own field since
     the beginning.
   ══════════════════════════════════════════════════════════════════════ */

export const DECLINED = {
  /* ── dice that subtract ─────────────────────────────────────────────── */
  "domainCard:Rune Ward": [
    {
      said: "can spend a Hope to reduce incoming damage by 1d8",
      why: "Damage reduction, not damage dealt. The d8 is a die pool in `card-resources.mjs`.",
    },
  ],
  "domainCard:Thorn Skin": [
    {
      said: "reduce the incoming damage by that amount",
      why:
        "Reduction off a variable pile of d6s, and the amount reflected back is that same " +
        "reduction rather than a printed expression.",
    },
  ],
  "subclass:Warden of the Elements: Specialization": [
    {
      said: "When you or an ally takes damage from an attack beyond Melee range, reduce the damage by 1d8",
      why: "Damage reduction, not damage dealt — Rune Ward's shape on a subclass card.",
    },
  ],

  /* ── a count this shape cannot hold ─────────────────────────────────── */
  "domainCard:Unleash Chaos": [
    {
      said: "roll a number of d10s equal to the tokens you spent and deal that much magic damage to the target",
      why: "The count is however many tokens you spend, so there is no fixed count to record.",
    },
  ],
  "domainCard:Preservation Blast": [
    {
      said: "take d8+3 magic damage using your Spellcast trait.",
      why:
        "The count scales with the Spellcast trait and the only scaling this shape offers is " +
        "Proficiency. Recording it as a flat 1d8+3 would understate it on every character.",
    },
  ],
  "domainCard:Summon Horror": [
    {
      said: "deals d8+1 magic damage using your Spellcast trait",
      why: "Preservation Blast's reading: the count scales with the Spellcast trait.",
    },
  ],
  "domainCard:Darkfire": [
    {
      said: "Targets who fail take d8+6 magic damage using your Spellcast trait",
      why: "The count scales with the Spellcast trait, which this shape cannot express.",
    },
  ],
  "domainCard:Falling Sky": [
    {
      said: "take 1d20+2 magic damage for each Stress marked",
      why: "A conditional multiplier — the expression repeats once per Stress marked.",
    },
  ],
  "domainCard:Damnation": [
    {
      said: "mark any number of Stress to roll an equal number of d20s",
      why: "Unleash Chaos's shape in a different currency — the count is however much Stress you mark.",
    },
  ],
  "consumable:Gambler’s Fallacy": [
    {
      said: "deals 1d20 magic damage for each handful of gold spent",
      why: "Falling Sky's shape: the expression repeats once per handful of gold, a count only the table knows.",
    },
  ],
  "domainCard:Vector": [
    {
      said: "they fall and take 1d10 physical damage for each range increment fallen.",
      why: "Falling Sky's shape: the dice repeat once per range increment, a count only the table knows.",
    },
  ],
  "domainCard:Book of Illiat": [
    {
      said: "Roll a number of d6s equal to the Hope spent and deal that much magic damage to the target.",
      why: "Arcane Barrage's count is however much Hope you spend.",
    },
  ],
  "domainCard:Midnight Spirit": [
    {
      said: "Roll a number of d6s equal to your Spellcast trait and deal that much magic damage to the target.",
      why: "The count scales with the Spellcast trait.",
    },
  ],
  "domainCard:Night Terror": [
    {
      said: "Roll a number of d6s equal to the number of stolen Fear and deal the total damage to each",
      why: "The count is however much Fear was stolen.",
    },
  ],
  "class:Brawler": [
    {
      said:
        "deals d8+d6 physical damage using your Proficiency (both the d8 and d6 scale off your " +
        "Proficiency)",
      why:
        "Two scaling dice in one expression, both multiplied by Proficiency, which the " +
        "count/dice/bonus shape cannot hold. It is also a weapon: Brawler's Strike is equipped.",
    },
  ],
  "transformation:Werewolf": [
    {
      said: "While in this form, you gain a 1d10 bonus to attack and damage rolls",
      why: "A bonus clause added to rolls made elsewhere; the card rolls nothing of its own.",
    },
    {
      said:
        "Roll a number of d20s equal to your tier and deal that much physical damage to all " +
        "creatures within Very Close range",
      why: "The count is your tier, which neither the fixed count nor the Proficiency flag can express.",
    },
  ],

  /* ── additive: the dice belong to a roll already being made ─────────
     The largest group, and the one the literal "damage roll" sniff was
     actually matching. Almost none prints a damage type, which is the tell:
     there is nothing to print, because the type is the weapon's. */
  "domainCard:Arcane Reflection": [
    {
      said: "spend any number of Hope to roll that many d6s",
      why:
        "The d6s are a trigger check for reflecting an attack; the damage dealt is the " +
        "attacker's, not this card's.",
    },
  ],
  "domainCard:Strategic Approach": [
    { said: "You add a d8 to your damage roll.", why: "Additive to a weapon damage roll you are already making." },
  ],
  "domainCard:Boost": [
    { said: "add a d10 to the damage roll", why: "Additive to the attack's own damage roll." },
  ],
  "domainCard:Breaking Blow": [
    {
      said: "deal an extra 2d12 damage",
      why: "Additive to a later successful attack's damage roll, and no damage type is printed.",
    },
  ],
  "domainCard:Sigil of Retribution": [
    {
      said: "roll the dice on this card and add the total to your damage roll",
      why: "A variable pile of d8s added to your own damage roll. The pile is a die pool.",
    },
  ],
  "domainCard:Chokehold": [
    {
      said: "they deal an extra 2d6 damage",
      why: "The extra dice belong to whoever attacks the Vulnerable target, added to their attack.",
    },
  ],
  "domainCard:Spellcharge": [
    { said: "add a d6 for each token spent to your damage roll", why: "Additive, one die per token spent." },
  ],
  "domainCard:Twilight Toll": [
    { said: "add a d12 for each token spent to your damage roll", why: "Additive, one die per token spent." },
  ],
  "domainCard:Natural Familiar": [
    { said: "you add a d6 to your damage roll", why: "Additive to your own damage roll." },
  ],
  "domainCard:Forceful Push": [
    { said: "add a d6 to your damage roll", why: "Additive to the primary weapon attack's damage roll." },
  ],
  "domainCard:The Beast": [
    {
      said: "a d6 bonus to your damage rolls",
      why: "A bonus clause on the weapon's roll rather than an expression this card rolls.",
    },
  ],
  "domainCard:Rend": [
    {
      said: "Your next successful attack this scene deals an extra 1d12+3 damage",
      why: "Additive on an attack already rolled, and no damage type is printed for it.",
    },
  ],
  "domainCard:Apex": [
    {
      said: "your attacks deal an extra d12 damage",
      why: "Additive on every attack for the scene; the dice ride on the weapon's roll.",
    },
  ],
  "domainCard:Hungry Fire": [
    {
      said: "An Ablaze creature takes an extra 1d8 magic damage the first time it's spotlighted in a scene.",
      why:
        "The rider fires on the target's next spotlight rather than on pressing the card. " +
        "Hungry Fire's own d8+2 is annotated above.",
    },
  ],
  "domainCard:Rejuvenation Barrier": [
    {
      said: "clear 1d4 Hit Points",
      why:
        "The dice are healing rather than damage; it is swept only because the same sentence " +
        "mentions physical damage resistance.",
    },
  ],
  "class:Rogue": [
    {
      said: "add a number of d6s equal to your tier to your damage roll.",
      why: "Additive, and the count is your tier rather than a printed number.",
    },
  ],
  "class:Assassin": [
    {
      said: "add a number of d4s equal to your tier to the damage roll",
      why: "Additive, and the count is your tier. The die's *size* is a die pool in `card-resources.mjs`.",
    },
  ],
  "subclass:Syndicate: Specialization": [
    {
      said: "The next time you deal damage, they snipe from the shadows, adding 2d8 to your damage roll.",
      why: "Added to a damage roll you are already making; the dice are the contact's contribution.",
    },
  ],
  "subclass:Winged Sentinel: Foundation": [
    {
      said: "Spend a Hope to deal an extra 1d8 damage on a successful attack.",
      why: "Additive on an attack already rolled; no damage type is printed, because the type is the weapon's.",
    },
  ],
  "subclass:Winged Sentinel: Mastery": [
    {
      said: "While flying, you deal an extra 1d12 damage instead of 1d8 with your “Wings of Light” feature.",
      why:
        "Restates the declined Wings of Light rider, with two dice named in one replacement " +
        "clause and no printed damage type.",
    },
  ],
  "subclass:Poisoners Guild: Foundation": [
    {
      said: "Leech Weed: You deal an extra 1d6 damage on this attack.",
      why: "Additive on the weapon attack that spent the token, and no damage type is printed.",
    },
  ],
  "ancestry:Faun": [
    {
      said:
        "dealing an extra 2d6 damage and knocking back either yourself or the target to Very " +
        "Close range",
      why: "Additive on the attack you already succeeded on, and it prints no damage type.",
    },
  ],
  "ancestry:Orc": [
    {
      said: "dealing an extra 1d6 damage",
      why: "Additive on an attack already rolled, with no printed damage type.",
    },
  ],
  "ancestry:Emberkin": [
    {
      said: "you gain a 1d6 bonus to damage rolls with that weapon",
      why: "A bonus to the equipped weapon's damage roll, not damage the card itself deals.",
    },
  ],
  "domainCard:Avatar of Terror": [
    {
      said: "you gain a 1d6 bonus to your damage rolls for each Fear in the GM’s pool",
      why:
        "The Werewolf's first reading with a variable count on top: a bonus to rolls made " +
        "elsewhere, repeated once per Fear in a pool that moves between presses.",
    },
  ],

  /* Both of Dark Army's clauses print dice and neither is this card's roll,
     which is why the key holds two: one adds to a damage roll already being
     made and the other subtracts from one being taken. The Werewolf is the
     precedent for a key declining twice for unrelated reasons. */
  "domainCard:Dark Army": [
    {
      said: "spend any number of tokens to add 1d8 for each token spent to your damage roll",
      why: "Additive, and the count is however many tokens you spend.",
    },
    {
      said: "spend any number of tokens to reduce the damage by 1d8 for each token spent",
      why: "Rune Ward's reading — dice that subtract — with Unleash Chaos's count.",
    },
  ],

  /* The oils are Grindletooth Venom's shape wearing a damage type. That the
     phrase says "magic" rather than leaving the type to the weapon does not
     make the dice the oil's: the roll is still the weapon's next successful
     attack, and there is no press on this card that rolls them. Red Ooze Oil
     declines twice, because its Ignited rider fires on the target's next
     spotlight exactly as Hungry Fire's Ablaze rider does. */
  "consumable:Red Ooze Oil": [
    {
      said: "The next successful attack you make with this weapon deals an extra 1d8 magic damage",
      why: "The 1d8 rides on the weapon's next damage roll, not on pressing this card.",
    },
    {
      said: "the target takes 1d4 magic damage when they take the spotlight",
      why: "Hungry Fire's reading: the rider fires on the target's spotlight rather than on a press.",
    },
  ],
  "consumable:Green Ooze Oil": [
    {
      said: "The next successful attack you make with this weapon deals an extra 1d8 magic damage",
      why: "Red Ooze Oil's reading; the Corroded rider is a threshold penalty and prints no dice.",
    },
  ],
  "consumable:Grindletooth Venom": [
    {
      said: "You can apply this venom to a weapon that deals physical damage to add a d6 to your next damage roll with that weapon.",
      why: "The d6 belongs to the weapon's next damage roll, not to pressing this card.",
    },
  ],
  "consumable:Improved Grindletooth Venom": [
    {
      said: "You can apply this venom to a weapon that deals physical damage to add a d8 to your next damage roll with that weapon.",
      why: "Grindletooth Venom's reading one tier up.",
    },
  ],
  "consumable:Redthorn Saliva": [
    {
      said: "You can apply this saliva to a weapon that deals physical damage to add a d12 to your next damage roll with that weapon.",
      why: "The d12 is added to the weapon's next damage roll.",
    },
  ],
  "consumable:Mythic Dust": [
    {
      said: "You can apply this dust to a weapon that deals magic damage to add a d12 to your next damage roll with that weapon.",
      why: "The d12 is added to the weapon's next damage roll.",
    },
  ],
  "armor:Spiked Plate Armor": [
    {
      said: "On a successful attack against a target within Melee range, add a d4 to the damage roll.",
      why: "Sharp is additive on the weapon attack already rolled.",
    },
  ],

  /* ── somebody else's stat line ──────────────────────────────────────
     Devastating swaps the die inside the weapon's own damage roll, and
     Versatile prints a second set of weapon statistics. A weapon's `damage`
     has been its own field since the beginning; `cardDamage` is a reading of
     rules text, and these are the stat line stating itself twice. */
  "weapon:Hammer of Wrath": [
    {
      said: "Before you make an attack roll, you can mark a Stress to use a d20 as your damage die.",
      why: "Devastating substitutes the die in the weapon's own damage roll.",
    },
  ],
  "weapon:Bec de Corbin": [
    {
      said: "Before you make an attack roll, you can mark a Stress to use a d20 as your damage die.",
      why: "Devastating, printed identically on the corpus's other one.",
    },
  ],
  "weapon:Spiked Bow": [
    {
      said: "This weapon can also be used with these statistics—Agility, Melee, d10+5.",
      why: "Versatile prints an alternate weapon stat line, not a card damage roll.",
    },
  ],
  "weapon:Scepter": [
    {
      said: "This weapon can also be used with these statistics—Presence, Melee, d8.",
      why: "Versatile prints an alternate weapon stat line, not a card damage roll.",
    },
  ],
  "weapon:Improved Scepter": [
    {
      said: "This weapon can also be used with these statistics—Presence, Melee, d8+3.",
      why: "Versatile prints an alternate weapon stat line, not a card damage roll.",
    },
  ],
  "weapon:Advanced Scepter": [
    {
      said: "This weapon can also be used with these statistics—Presence, Melee, d8+4.",
      why: "Versatile prints an alternate weapon stat line, not a card damage roll.",
    },
  ],
  "weapon:Legendary Scepter": [
    {
      said: "This weapon can also be used with these statistics—Presence, Melee, d8+6.",
      why: "Versatile prints an alternate weapon stat line, not a card damage roll.",
    },
  ],
  "weapon:Casting Sword": [
    {
      said: "This weapon can also be used with these statistics—Knowledge, Far, d6+3.",
      why: "Versatile prints an alternate weapon stat line, not a card damage roll.",
    },
  ],
  "weapon:Hand Sling": [
    {
      said: "This weapon can also be used with these statistics—Finesse, Close, d8+4.",
      why: "Versatile prints an alternate weapon stat line, not a card damage roll.",
    },
  ],
};

/* ══════════════════════════════════════════════════════════════════════ */

/** Every annotation, keyed `type:name`. */
const DAMAGE = { ...PRINTED, ...MODAL };
export default DAMAGE;

/**
 * Attach the printed damage expressions to a pack's entries.
 *
 * Called at each pack's own `export default` beside `withDice`, and for the
 * same reason: `tools/verify/` imports these modules directly to draw THE DECK
 * and would otherwise draw cards the game does not have.
 *
 * Unlike a counter, this **does** belong on the compendium document. A counter
 * is something a player decides to keep; a printed expression is on the card
 * whether anybody wants it or not, and a card in the browser that cannot say
 * what it rolls is a card the browser is wrong about.
 *
 * `said` is stripped on the way in because it is checker evidence and not
 * document data. `fillCardDamage` in `src/module/data/fields.ts` reads the same
 * table at construction time for copies that predate this, and guards on a
 * non-empty array — so a card stamped here is left exactly as it is.
 */
export function withDamage(entries) {
  for (const e of entries) {
    const modes = DAMAGE[`${e.type}:${e.name}`];
    /* eslint-disable-next-line no-unused-vars */
    if (modes) e.system.cardDamage = modes.map(({ said, ...keep }) => ({ ...keep }));
  }
  return entries;
}
