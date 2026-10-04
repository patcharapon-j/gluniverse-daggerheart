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
    over: "Book of Vagras",
    axis: "cost",
    why: "Arcane Door, on this grimoire at the same level, requires no adversary within Melee range and closes after one creature passes. Fold works mid-fight and carries everyone you're touching.",
  },
  "Weight of the Void": { over: "Conjure Swarm", axis: "damage" },
  "Silence the Song": {
    over: "Hush",
    axis: "effect",
    why: "Hush is the printed Silenced card and charges exactly the same Hope on top of its Spellcast Roll, two levels later. Hush silences an area around the target and follows them, which this does not; what this does is arrive at level 3.",
  },
  Vector: {
    over: "Book of Korvax",
    axis: "effect",
    why: "Levitation, on this grimoire at the same level, lifts a target and moves them within Close range of where they were. Vector moves them in any direction including up, and the fall is damage with no second roll — Telekinesis (Arcana 6) needs a second Spellcast Roll to weaponise the same idea three levels later.",
  },
  "Cold Solution": {
    over: "Support Tank",
    axis: "cost",
    why: "Support Tank, same level, buys one die reroll for 2 Hope. This buys the same reroll from a pool that fills as the GM's Fear does, and buys both dice for two tokens. Umbral Veil (Dread 1) is the printed precedent for sizing tokens off the Fear pool.",
  },
  Unmake: {
    over: "Book of Grynn",
    axis: "effect",
    why: "Time Lock, on this grimoire at the same level, freezes an object where it is. Nothing in print destroys matter outright.",
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
    why: "Banish, same level, displaces one target and only once per rest, on a failed reaction roll against your highest of several d20s. This moves three every time it lands, with no roll for them to pass, and a Hope leaves them Vulnerable where they come down.",
  },
  Solve: {
    over: "Premonition",
    axis: "effect",
    why: "Adjust Reality (Arcana 10) is print's card for setting a die result, four levels later and for 5 Hope. Premonition, one level below this, spends its once-per-long-rest on undoing a GM move rather than guaranteeing a roll.",
  },
  Erasure: {
    over: null,
    axis: "novel",
    why: "no printed card takes memory from a group. Recant, on Book of Korvax at level 3, is the nearest thing and takes a minute of *conversation* from one target behind a Reaction Roll. This takes the minute itself from everyone within Close range, and because they no longer know you were in it, each of them loses their next chance to come after you.",
  },
  "Void-Touched": {
    over: "Arcana-Touched",
    axis: "effect",
    why: "every printed -Touched card gives a loadout bonus plus one small break in the game's economy. This one breaks the frame's own economy instead, which is the only thing a campaign domain has worth breaking.",
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
    why: "Disintegration Wave, same level and same Recall, caps at Difficulty 18 but hits every adversary under it. Disjunction takes one target and reaches Difficulty 20, which is the highest Difficulty print writes anywhere — and pays for overreaching by vaulting itself.",
  },
  "Second Silence": {
    over: null,
    axis: "novel",
    why: "no printed card suppresses magic across an area. The Hollow Note is this deck's own level 5 version and is stationary, Very Close, and cannot be opted out of.",
  },
  "The Answer": {
    over: null,
    axis: "novel",
    why: "no printed card in 210 grants an additional action. Priced at 3 Mark and 3 Fear, because the biggest thing you can do must not also be the cheapest per unit of what it does.",
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
    over: "Inspirational Words",
    axis: "effect",
    why: "Tactician (Bone 3) adds one Experience and needs you in reach to Help an Ally. This adds a full trait at Far range with no line of sight and no proximity. Inspirational Words, a level below, spends a token per benefit and needs you to be speaking with them.",
  },
  "Thorn Spray": {
    over: "Conjure Swarm",
    axis: "effect",
    why: "Fire Flies, on Conjure Swarm at the same level, deals the same 12 once for a Hope and is gone. This costs a Stress and leaves the thorns standing until your next rest, biting anything that comes near you — a persistent hazard no printed card at this level leaves behind.",
  },
  Amber: {
    over: "Book of Illiat",
    axis: "effect",
    why: "Slumber, on this grimoire at level 1, ends the instant the target takes damage. Banish (Codex 6) needs a reaction roll and lands once per rest on a failure. Amber removes a target outright at level 3 and the GM has to spend a Fear to end it.",
  },
  "The Beast": {
    over: "Reckless",
    axis: "effect",
    why: "Reckless (level 2) buys advantage on one attack for a Stress. This buys a bonus to every attack roll and every damage roll for the whole scene for the same Stress, against a real fictional cost.",
  },
  Rend: {
    over: "Boost",
    axis: "damage",
  },
  "The Root Remembers": {
    over: "Premonition",
    axis: "effect",
    why: "Premonition is the printed card that rescinds a GM move, one level later and at the same once-per-long-rest. This one is a level earlier and one Recall cheaper.",
  },
  Regrow: {
    over: "Healing Field",
    axis: "effect",
    why: "Healing Field, a level below, clears 1 Hit Point for every ally at once but only once per long rest. This is one target at a time and repeatable all session, clears 2 and a temporary condition, and has none of Healing Hands' (Splendor 2) lock against touching the same target twice before a long rest.",
  },
  Wildfire: { over: "Book of Korvax", axis: "damage" },
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
  Bloom: { over: "Book of Korvax", axis: "damage" },
  "Root-Touched": {
    over: "Sage-Touched",
    axis: "effect",
    why: "every printed -Touched card gives a loadout bonus plus one small break in the game's economy. This one breaks the frame's own economy instead.",
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
    why: "Frenzy (Blade 8) gives +10 damage but locks your Armor Slots for the duration. Force of Nature (Sage 10) gives +10 but charges a Hope before every action roll. Apex charges 2 Stress once, adds a d12, and feeds you a Hit Point per kill.",
  },
  "The Undergrowth Wakes": { over: "Earthquake", axis: "damage" },
  "No More Waiting": {
    over: null,
    axis: "novel",
    why: "no printed card in 210 grants an additional action. Triggered off damage dealt rather than off a success, so it reads as Hunger rather than as Void's The Answer.",
  },
  "The World Tree": {
    over: "Resurrection",
    axis: "effect",
    why: "print's biggest heal is a long-rest downtime move for one character, or Salvation Beam (Splendor 9) trading your Stress for allies' Hit Points. This empties Hit Points *and* Stress for everyone who touches it, once each, in the middle of a scene.",
  },
};
