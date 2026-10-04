/**
 * Why each Root and Void card is worth its level — one entry per card.
 *
 * ── why this is a module and not a comment ────────────────────────────
 * It is read twice. `tools/check-marked.mjs` fails the build when a card has
 * no entry, when an entry names a card print does not have, or when a `damage`
 * claim does not survive arithmetic. `tools/sync-marked-note.mjs` renders it
 * into the vault note's audit. A balance argument that lives in one of those
 * two places drifts out of the other, so it lives here and neither owns it.
 *
 * ── what an entry is for ──────────────────────────────────────────────
 * These decks charge the GM a Fear on **every** use, which no printed domain
 * does. A card that merely matches a printed card of the same level is
 * therefore a card nobody should take — so the question every card has to
 * answer is not "is this too strong" but "what does this beat, and how".
 *
 * One entry per card: the printed card it beats and the axis it beats it on.
 * Naming a card *above* our own level is allowed and is the stronger claim —
 * "ahead by one tier" is exactly that claim — so the check counts those
 * separately rather than refusing them.
 *
 * `axis: "damage"` is checked arithmetically against `over`. Every other axis
 * is a reading, and `why` is the reading — `check-resources.mjs`'s pattern,
 * because a measurement cannot make the call and a reader can. `over: null`
 * with `axis: "novel"` means print has no card that does this at any level,
 * which is the strongest claim available and the one the brief is spent on.
 */

export default {
  /* ── VOID ───────────────────────────────────────────────────────── */

  Excise: {
    over: "Book of Illiat",
    axis: "effect",
    why: "print's dispels are reactions that interrupt a spell mid-cast — Counterspell (Arcana 3) vaults itself to do it, Repudiate (Codex 4) is once per rest. Nothing below level 3 ends an effect that has already landed, and nothing at any level does it at Far range on someone else. Slumber, on Book of Illiat at level 1, is the nearest thing print has to a condition this could lift.",
  },
  "Null Grip": { over: "Vicious Entangle", axis: "damage" },
  Reckoning: {
    over: "Gifted Tracker",
    axis: "effect",
    why: "Gifted Tracker answers only about a creature you are already tracking, and Know Thy Enemy (Bone 5) gives one set of facts behind an Instinct Roll. This gives two facts at level 1 with no roll, and carries Know Thy Enemy's remove-a-Fear clause four levels early.",
  },
  Fold: {
    over: "Blink Out",
    axis: "effect",
    why: "Blink Out (Arcana 4), two levels later, charges a Hope for you and another for every creature you bring. Fold charges one Hope for everyone you're touching, and like Arcane Door (Book of Vagras, same level) only after the roll succeeds — but it works with adversaries in Melee range, which Arcane Door refuses.",
  },
  "Weight of the Void": { over: "Conjure Swarm", axis: "damage" },
  "Silence the Song": {
    over: "Hush",
    axis: "effect",
    why: "Hush (Midnight 5) is the printed Silenced card: a Hope on top of the roll, lasting until the GM spends a Fear, you recast, or you take Major damage. This holds for exactly that long, two levels earlier, and charges no Hope. What Hush keeps is the area around the target that follows them.",
  },
  Vector: {
    over: "Telekinesis",
    axis: "effect",
    why: "Telekinesis (Arcana 6) moves a target and needs a second Spellcast Roll against a second target to deal d12+4. Vector moves the target and drops them for d10+3 using your Proficiency on the one roll, three levels earlier. Corrosive Projectile, at this level, is d6+4 with no movement.",
  },
  "Cold Solution": {
    over: "Support Tank",
    axis: "cost",
    why: "Support Tank, same level, buys one die reroll for 2 Hope. This buys the same reroll from a pool that fills as the GM's Fear does, and buys both dice for two tokens. Umbral Veil (Dread 1) is the printed precedent for sizing tokens off the Fear pool.",
  },
  Unmake: {
    over: "Book of Grynn",
    axis: "effect",
    why: "Time Lock, on this grimoire at the same level, freezes an object where it is. Nothing in print destroys matter outright; Shape Material (Splendor 5) only reshapes natural material no larger than you, which is this card's free size a level earlier — and a Stress takes it to a section of wall.",
  },
  Crush: {
    over: "Telekinesis",
    axis: "effect",
    why: "Telekinesis deals the same d12+4 using Proficiency one level later with no rider at all. Crush softens the target's damage thresholds for everyone else on a plain success, and buys the rest of the fight for a Stress.",
  },
  "The Hollow Note": {
    over: null,
    axis: "novel",
    why: "no printed card creates a zone where magic stops working, at any level.",
  },
  Elsewhere: {
    over: "Banish",
    axis: "effect",
    why: "Banish, same level, displaces one target and only once per rest, on a failed reaction roll against your highest of several d20s. This moves three every time it lands, with no roll for them to pass, brings willing allies along for nothing, and a Hope leaves the adversaries Vulnerable where they come down.",
  },
  Solve: {
    over: "Premonition",
    axis: "effect",
    why: "Adjust Reality (Arcana 10) is print's card for setting a die result, four levels later and for 5 Hope. This guarantees a roll with Hope once per long rest for you or any ally in Far range; Premonition, one level below, spends its once-per-long-rest on undoing a GM move rather than guaranteeing a roll, and only your own.",
  },
  Erasure: {
    over: null,
    axis: "novel",
    why: "no printed card takes memory from a group. Recant, on Book of Korvax at level 3, takes a minute of *conversation* from one target behind a Reaction Roll. This takes the minute itself from every adversary within Close range, leaves them Vulnerable while they reorient, and costs each of them their next chance to come after you.",
  },
  "Void-Touched": {
    over: "Bone-Touched",
    axis: "effect",
    why: "Bone-Touched gives +1 to the trait its deck leans on and one economy break. This gives +1 to the trait the mark casts with, and lets you pay the frame's toll in Stress rather than handing the GM a Fear — on every use, not once per rest. It never makes a use free; it decides who pays.",
  },
  "Geometry of Ruin": { over: "Ground Pound", axis: "damage" },
  Sever: {
    over: null,
    axis: "novel",
    why: "no printed card disables a named adversary feature. Eternal Enervation, on this grimoire one level later, is the nearest thing and only makes a target permanently Vulnerable.",
  },
  "Chariot of Thought": {
    over: null,
    axis: "novel",
    why: "no printed card puts the party in the air. Flight (Arcana 3) is one creature and spends a token per action; Conjured Steeds (Sage 6) is six creatures on the ground and ends when a steed takes any damage. This is flight to Very Far for six, holding for the scene, and everything shooting at the disk does it with disadvantage.",
  },
  Disjunction: {
    over: "Disintegration Wave",
    axis: "effect",
    why: "Disintegration Wave, same level and same Recall, kills every adversary in Far range at Difficulty 18 or lower for a Stress each. Disjunction reaches Difficulty 20 — the highest print writes anywhere — for 2 Stress each, so it is the one card that can end a tier 4 solo outright. Choosing wrong vaults it, which is what Reckoning is for.",
  },
  "Second Silence": {
    over: null,
    axis: "novel",
    why: "no printed card suppresses magic across an area. The Hollow Note is this deck's own level 5 version and is stationary, Very Close, and cannot be opted out of.",
  },
  "The Answer": {
    over: null,
    axis: "novel",
    why: "no printed card in 210 grants an additional action, and none turns an action roll into a success without rolling — Adjust Reality sets a result after the fact for 5 Hope. Priced at 3 Mark and 3 Fear, because the biggest thing you can do must not also be the cheapest per unit of what it does.",
  },

  /* ── ROOT ───────────────────────────────────────────────────────── */

  Barkskin: {
    over: "Bare Bones",
    axis: "effect",
    why: "Bare Bones, same level, improves your thresholds only while you refuse armour. Barkskin stacks with armour, lasts until your next rest, and arms you as well.",
  },
  "Glimpse the Hunt": {
    over: "Gifted Tracker",
    axis: "effect",
    why: "Gifted Tracker, same level and also Recall 0, answers only about a creature whose trail you already have. This answers about the ground itself and needs no quarry.",
  },
  "Hungry Fire": {
    over: "Bolt Beacon",
    axis: "effect",
    why: "Bolt Beacon, same level, charges exactly the same Hope on success and buys Vulnerable with it. This buys Ablaze, which recurs at 2d6 every time the target is spotlighted — the cadence Cinder Grasp (Arcana 2) sets with On Fire, one level earlier and at Close range instead of Melee.",
  },
  "The Pack Knows": {
    over: "Tactician",
    axis: "effect",
    why: "Help an Ally costs a Hope and adds a d6 from beside them; Tactician (Bone 3) lets them spend another Hope to add an Experience too. This adds a d6 and a whole trait for no Hope at all, at Far range, with no line of sight — the frame's Fear is the whole price.",
  },
  "Thorn Spray": {
    over: "Conjure Swarm",
    axis: "effect",
    why: "Fire Flies, on Conjure Swarm at the same level, deals the same 12 once for a Hope and is gone. This costs a Stress and leaves the thorns standing until your next rest, biting anything that comes near you — a persistent hazard no printed card at this level leaves behind.",
  },
  Amber: {
    over: "Book of Illiat",
    axis: "effect",
    why: "Slumber, on this grimoire at level 1, ends the instant the target takes damage. Amber removes a target from the fight outright — nobody can hurt it and it can't act — on the same roll, holds until the GM spends a Fear, and only one at a time. Banish (Codex 6) needs a reaction roll and lands once per rest.",
  },
  "The Beast": {
    over: "Reckless",
    axis: "effect",
    why: "Reckless (level 2) buys advantage on one attack for a Stress. This buys a bonus to every attack roll and every damage roll for the whole scene for the same Stress, against a real fictional cost.",
  },
  Rend: { over: "Boost", axis: "damage" },
  "The Root Remembers": {
    over: "Premonition",
    axis: "effect",
    why: "Premonition (Arcana 5) rescinds the consequences of a roll you made, once per long rest. This rescinds them for a roll you or any ally within Far range made, a level earlier and at the same Recall.",
  },
  Regrow: {
    over: "Healing Field",
    axis: "effect",
    why: "Healing Field, a level below, clears 1 Hit Point for every ally at once but only once per long rest. This is one target at a time and repeatable all session, clears 2 and a temporary condition, and has none of Healing Hands' (Splendor 2) lock against touching the same target twice before a long rest.",
  },
  Wildfire: { over: "Chain Lightning", axis: "damage" },
  Alpha: {
    over: "Battle Cry",
    axis: "effect",
    why: "Battle Cry (Blade 8) gives allies advantage until the first failure with Fear, once per long rest, two levels later. Alpha holds for the whole scene, makes the party immune to Horrified, and softens every adversary standing near you when it lands.",
  },
  "Deep Dreaming": {
    over: "Divination",
    axis: "effect",
    why: "Divination (Splendor 4) answers one yes-or-no question once per long rest for 3 Hope. This answers open questions as often as the Undergrowth has memory to spend, and Stress buys more memory.",
  },
  Bloom: { over: "Earthquake", axis: "damage" },
  "Root-Touched": {
    over: "Bone-Touched",
    axis: "effect",
    why: "Bone-Touched gives +1 to the trait its deck leans on and one economy break. This gives +1 to the trait the mark casts with, and lets you pay the frame's toll in Hit Points rather than handing the GM a Fear — which Feed, Apex and Regrow can then buy back.",
  },
  Feed: {
    over: "Gore and Glory",
    axis: "effect",
    why: "Gore and Glory (Blade 9) gives a Hope or clears a Stress only on a critical or a kill. This converts any Melee hit into a cleared Hit Point for a Stress, repeatably, and still pays the Hope on a kill — the whole Hunger thread stated as arithmetic. Second Wind (Splendor 3) is the printed Hit-Point version and fires once per rest.",
  },
  "The Long Memory": {
    over: "Mass Enrapture",
    axis: "effect",
    why: "Night Terror (Midnight 9) horrifies behind a Reaction Roll but the condition is temporary and the damage is rolled off stolen Fear. This one is permanent on a failure, a level earlier. Mass Enrapture, same level, only fixes attention and ends when it bites.",
  },
  Apex: {
    over: "Frenzy",
    axis: "effect",
    why: "Frenzy (Blade 8) gives +10 damage and +8 to Severe but locks your Armor Slots for the duration. Apex gives 2d12 (13 on average) with your armour intact, feeds you a Hit Point per kill and frees you from Restrained, for one Stress.",
  },
  "The Undergrowth Wakes": { over: "Earthquake", axis: "damage" },
  "No More Waiting": {
    over: null,
    axis: "novel",
    why: "no printed card in 210 grants an additional action. Triggered off damage dealt rather than off a success, and it pays out in Proficiency on the follow-up attack, so it reads as Hunger rather than as Void's The Answer.",
  },
  "The World Tree": {
    over: "Resurrection",
    axis: "effect",
    why: "print's biggest heal is a long-rest downtime move for one character, or Salvation Beam (Splendor 9) trading your Stress for allies' Hit Points. This empties Hit Points *and* Stress for you and every ally who touches it, once each, in the middle of a scene.",
  },
};
