/**
 * What every printed rule asks you to *do*, read once and written down.
 *
 * This file is the reading that replaced the parsers. Until it existed, a
 * card's buttons were swept out of its own prose at render time by three
 * regular expressions — `featurePrice` for a cost, `rollCall` for a roll, and
 * a sniff for the literal words "damage roll" — and the corpus is what shows
 * why that could not be made to work:
 *
 *   over-match  Three weapons named Scary say "the target must mark a Stress"
 *               and the sheet charged the *wielder* for it. Four suits of
 *               Banded Armor charged Severe damage's Armor Slot on a press
 *               rather than on the damage.
 *   under-match Unleash Chaos printed "Mark Stress" where the pattern wanted
 *               "Mark a Stress", so a card that has always charged a Stress
 *               charged nothing at all until SRD 2.0 added the article.
 *
 * Neither is visible afterwards. A card with a button too many and a card
 * with a button too few both render perfectly, and the only witness is the
 * player who paid. That is the whole argument for reading them by hand.
 *
 * ── the shape ────────────────────────────────────────────────────────────
 *
 * Keyed `type:name`, one entry per document:
 *
 *     "domainCard:Rune Ward": {
 *       actions: [ { kind: "pay", amount: { stress: 1 }, said: "Mark a Stress" } ],
 *       features: { "Ward": [ … ] },
 *     }
 *
 * `actions` land on `system.actions`; `features` land on the named block's own
 * `actions`, because an action is printed on a rule and has to travel with it
 * when mixed ancestry copies the block. See `actionField` in
 * `src/module/data/fields.ts` for every member and why it is there.
 *
 * ── said, and why every entry carries one ────────────────────────────────
 *
 * `said` is the words the action was read from, quoted off the card. It is
 * `card-resources.mjs`'s provenance promoted out of a checker's table into the
 * data itself, and it does three jobs no other field can. It makes a thousand
 * readings reviewable by a human. It fails the build when the words leave the
 * card — because upstream fixing a typo and upstream rewriting a rule around
 * its cost look identical from here, and only one of them is fine. And it is
 * what a GM reads in the Automation editor to understand why a button exists.
 *
 * ── declining, out loud ──────────────────────────────────────────────────
 *
 * `DECLINED` is every phrase that looks like an action and is not one, with
 * the reading that disqualified it. Values are **arrays**, as
 * `card-damage.mjs`'s are, because one document declines for unrelated
 * reasons more than once — and a document may be annotated *and* declined,
 * where part of its text is a press and part of it is somebody else's.
 *
 * A decline is not an omission. `tools/check-actions.mjs` walks every rule
 * unit in the four packs and fails on one that is neither annotated nor
 * declined, so the only way past it is to have read the card.
 *
 * ── two deliveries, one reading ──────────────────────────────────────────
 *
 * `withActions()` writes these into the built compendium document, and
 * `fillCardActions` in `data/fields.ts` writes them onto every construction of
 * an *embedded copy* — because a domain card on a character sheet is a
 * duplicate made months ago and a pack rebuild never reaches it. Neither ever
 * overwrites a non-empty array: that is somebody's homebrew, and it wins.
 */

/* ── entries ─────────────────────────────────────────────────────────────
   Populated per population — see `tools/check-actions.mjs` for what is still
   unread. Each population lands as its own commit with its own ratchet
   turning green, so an empty region here is work not yet done rather than a
   claim that those cards ask for nothing. */

export const CARD_ACTIONS = {
  "ancestry:Aetheris": {
    features: {
      "Celestial Wings": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "Once per scene while flying",
          said: "spend a Hope",
        },
      ],
    },
  },
  "ancestry:Rattin": {
    features: {
      "Familiar Scent": [
        { kind: "pay", amount: { stress: 1 }, said: "mark a Stress" },
      ],
    },
  },
  "ancestry:Avori": {
    features: {
      "Watchful Eyes": [
        { kind: "pay", amount: { stress: 1 }, said: "mark a Stress" },
      ],
    },
  },
  "ancestry:Drakona": {
    features: {
      "Elemental Breath": [
        {
          kind: "roll-card-damage",
          damageName: "",
          said: "magic damage using your Proficiency",
        },
      ],
      "Scales": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you would take Severe damage",
          said: "mark a Stress",
        },
      ],
    },
  },
  "ancestry:Dwarf": {
    features: {
      "Increased Fortitude": [
        {
          kind: "pay",
          amount: { hope: 3 },
          said: "Spend 3 Hope",
        },
      ],
      "Thick Skin": [
        {
          kind: "pay",
          amount: { stress: 2 },
          when: "When you take Minor damage",
          said: "mark 2 Stress",
        },
      ],
    },
  },
  "ancestry:Elf": {
    features: {
      "Quick Reactions": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress",
        },
      ],
    },
  },
  "ancestry:Emberkin": {
    features: {
      "Ignition": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress",
        },
      ],
    },
  },
  "ancestry:Faerie": {
    features: {
      "Luckbender": [
        {
          kind: "pay",
          amount: { hope: 3 },
          when: "Once per session",
          said: "spend 3 Hope",
        },
      ],
      "Wings": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "While flying, after an adversary makes an attack against you",
          said: "mark a Stress",
        },
      ],
    },
  },
  "ancestry:Faun": {
    features: {
      "Kick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you succeed on an attack against a target within Melee range",
          said: "mark a Stress",
        },
      ],
    },
  },
  "ancestry:Firbolg": {
    features: {
      "Charge": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you succeed on an Agility Roll to move from Far or Very Far range into Melee range",
          said: "mark a Stress",
          steps: [
            {
              kind: "roll-card-damage",
              damageName: "",
              said: "physical damage to all targets within Melee range",
            }
          ],
        },
      ],
      "Unshakable": [
        {
          kind: "roll-dice",
          formula: "1d6",
          when: "When you would mark a Stress",
          said: "roll a <b>d6</b>",
        },
      ],
    },
  },
  "ancestry:Fungril": {
    features: {
      "Death Connection": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "While touching a corpse that died recently",
          said: "mark a Stress",
        },
      ],
      "Fungril Network": [
        {
          kind: "roll-trait",
          trait: "instinct",
          dc: 12,
          said: "Instinct Roll (12)",
        },
      ],
    },
  },
  "ancestry:Galapa": {
    features: {
      "Retract": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress",
        },
      ],
    },
  },
  "ancestry:Gnome": {
    features: {
      "Nimble Fingers": [
        {
          kind: "pay",
          amount: { hope: 2 },
          when: "When you make a Finesse Roll",
          said: "spend 2 Hope",
        },
      ],
    },
  },
  "ancestry:Goblin": {
    features: {
      "Danger Sense": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "Once per rest",
          said: "mark a Stress",
        },
      ],
    },
  },
  "ancestry:Human": {
    features: {
      "Adaptability": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you fail a roll that utilized one of your Experiences",
          said: "mark a Stress",
        },
      ],
    },
  },
  "ancestry:Infernis": {
    features: {
      "Fearless": [
        {
          kind: "pay",
          amount: { stress: 2 },
          when: "When you roll with Fear",
          said: "mark 2 Stress",
        },
      ],
    },
  },
  "ancestry:Katari": {
    features: {
      "Feline Instincts": [
        {
          kind: "pay",
          amount: { hope: 2 },
          when: "When you make an Agility Roll",
          said: "spend 2 Hope",
        },
      ],
      "Retracting Claws": [
        {
          kind: "roll-trait",
          trait: "agility",
          said: "Agility Roll",
        },
        {
          kind: "apply-condition",
          subject: "targets",
          condition: "vulnerable",
          when: "On a success",
          said: "On a success, they become temporarily",
        },
      ],
    },
  },
  "ancestry:Orc": {
    features: {
      "Tusks": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "When you succeed on an attack against a target within Melee range",
          said: "spend a Hope",
        },
      ],
    },
  },
  "ancestry:Ribbet": {
    features: {
      "Long Tongue": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress",
        },
        {
          kind: "roll-card-damage",
          damageName: "",
          said: "physical damage using your Proficiency",
        },
      ],
    },
  },
  "ancestry:Skykin": {
    features: {
      "Eye of the Storm": [
        {
          kind: "pay",
          amount: { hope: 2 },
          said: "Spend 2 Hope",
        },
      ],
      "Gale Force": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress",
        },
      ],
    },
  },
  "ancestry:Tidekin": {
    features: {
      "Lifespring": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "Once per rest, with access to a small amount of water",
          said: "mark a Stress",
        },
      ],
    },
  },
  "armor:Advanced Brigandine Armor": {
    features: {
      "Lined": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress to negate Minor damage",
        },
      ],
    },
  },
  "armor:Astral Raiment": {
    features: {
      "Stellar": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress to gain advantage on a Spellcast roll",
        },
      ],
    },
  },
  "armor:Bloodstone Plate Armor": {
    features: {
      "Bloodthirsty": [
        {
          kind: "clear",
          amount: { hitPoints: 1 },
          when: "When you critically succeed on a weapon attack within Melee range",
          said: "clear a Hit Point",
        },
      ],
    },
  },
  "armor:Brigandine Armor": {
    features: {
      "Lined": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress to negate Minor damage",
        },
      ],
    },
  },
  "armor:Circle-Forged Dreadplate": {
    features: {
      "Accursed": [
        {
          kind: "roll-dice",
          formula: "1d4",
          said: "roll a d4",
        },
      ],
    },
  },
  "armor:Darkweave Shroud": {
    features: {
      "Ghostwalker": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "Once per rest",
          said: "mark a Stress to move up to Close range through solid objects",
        },
      ],
    },
  },
  "armor:Dragonscale Armor": {
    features: {
      "Impenetrable": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "Once per short rest, when you would mark your last Hit Point",
          said: "you can instead mark a Stress",
        },
      ],
    },
  },
  "armor:Dunamis Silkchain": {
    features: {
      "Timeslowing": [
        {
          kind: "pay",
          amount: { armorSlots: 1 },
          said: "Mark an Armor Slot",
          steps: [
            {
              kind: "roll-dice",
              formula: "1d4",
              said: "roll a d4",
            }
          ],
        },
      ],
    },
  },
  "armor:Gilded Sunplate": {
    features: {
      "Resplendent": [
        {
          kind: "clear",
          amount: { armorSlots: 1 },
          when: "Once per scene when you spend Hope",
          said: "you can clear an Armor Slot",
        },
      ],
    },
  },
  "armor:Godbound Laminar": {
    features: {
      "Divine": [
        {
          kind: "gain",
          amount: { hope: 1 },
          when: "When you mark an Armor Slot",
          said: "gain a Hope",
        },
      ],
    },
  },
  "armor:Harrowbone Armor": {
    features: {
      "Resilient": [
        {
          kind: "roll-dice",
          formula: "1d6",
          said: "roll a d6",
        },
      ],
    },
  },
  "armor:Improved Brigandine Armor": {
    features: {
      "Lined": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress to negate Minor damage",
        },
      ],
    },
  },
  "armor:Legendary Brigandine Armor": {
    features: {
      "Lined": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress to negate Minor damage",
        },
      ],
    },
  },
  "armor:Resonant Harness": {
    features: {
      "Vitreous": [
        {
          kind: "pay",
          amount: { armorSlots: 2 },
          said: "you can mark 2 Armor Slots to negate that damage",
        },
      ],
    },
  },
  "armor:Runetan Floating Armor": {
    features: {
      "Shifting": [
        {
          kind: "pay",
          amount: { armorSlots: 1 },
          when: "When you are targeted for an attack",
          said: "you can mark an Armor Slot to give the attack roll against you disadvantage",
        },
      ],
    },
  },
  "armor:Stormthread Habit": {
    features: {
      "Absorbing": [
        {
          kind: "clear",
          amount: { armorSlots: 1 },
          when: "Once per scene when you take magic damage",
          said: "you can clear an Armor Slot",
        },
      ],
    },
  },
  "armor:Trollhide Cuirass": {
    features: {
      "Self-Healing": [
        {
          kind: "clear",
          amount: { armorSlots: 1 },
          when: "When you take a rest",
          said: "clear an Armor Slot",
        },
      ],
    },
  },
  "class:Assassin": {
    features: {
      "Deadly Determination": [
        {
          kind: "pay",
          amount: { hope: 3 },
          said: "Spend 3 Hope",
          steps: [
            {
              kind: "clear",
              amount: { stress: 2 },
              said: "clear 2 Stress",
            }
          ],
        },
      ],
      "Get In & Get Out": [
        {
          kind: "pay",
          amount: { hope: 1 },
          said: "Spend a Hope",
        },
      ],
      "Marked for Death": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a successful weapon attack",
          said: "mark a Stress",
          steps: [
            {
              kind: "apply-condition",
              subject: "targets",
              condition: "markedForDeath",
              said: "make the target <i>Marked for Death</i>",
            }
          ],
        },
        {
          kind: "die-pool",
          resource: "Marked for Death",
          op: "roll",
          when: "a number of d4s equal to your tier",
          said: "add a number of <b>d4s</b> equal to your tier to the damage roll",
        },
      ],
    },
  },
  "class:Bard": {
    features: {
      "Make a Scene": [
        {
          kind: "pay",
          amount: { hope: 3 },
          said: "Spend 3 Hope",
        },
      ],
      "Rally": [
        {
          kind: "die-pool",
          resource: "Rally Die",
          when: "Once per session",
          said: "give yourself and each of your allies a Rally Die",
        },
        {
          kind: "die-pool",
          resource: "Rally Die",
          op: "spend",
          said: "A PC can spend their Rally Die to roll it",
        },
      ],
    },
  },
  "class:Brawler": {
    features: {
      "Combo Strike": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "After rolling damage on a successful attack with a Melee weapon",
          said: "mark a Stress",
          steps: [
            {
              kind: "die-pool",
              resource: "Combo Die",
              op: "roll",
              said: "roll your Combo Die and note the result",
            }
          ],
        },
      ],
      "Square Up": [
        {
          kind: "pay",
          amount: { hope: 3 },
          said: "Spend 3 Hope",
          steps: [
            {
              kind: "apply-condition",
              subject: "targets",
              condition: "vulnerable",
              said: "making them temporarily <i>Vulnerable</i>",
            }
          ],
        },
      ],
    },
  },
  "class:Druid": {
    features: {
      "Beastform": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress",
        },
      ],
      "Evolution": [
        {
          kind: "pay",
          amount: { hope: 3 },
          said: "Spend 3 Hope",
        },
      ],
    },
  },
  "class:Guardian": {
    features: {
      "Frontline Tank": [
        {
          kind: "pay",
          amount: { hope: 3 },
          said: "Spend 3 Hope",
          steps: [
            {
              kind: "clear",
              amount: { armorSlots: 2 },
              said: "clear 2 Armor Slots",
            }
          ],
        },
      ],
      "Unstoppable": [
        {
          kind: "apply-condition",
          condition: "unstoppable",
          when: "Once per long rest",
          said: "you can become Unstoppable",
          steps: [
            {
              kind: "die-pool",
              resource: "Unstoppable Die",
              said: "You gain an Unstoppable Die",
            }
          ],
        },
        {
          kind: "die-pool",
          resource: "Unstoppable Die",
          op: "step",
          when: "After you make a damage roll that deals 1 or more Hit Points to a target",
          said: "increase the Unstoppable Die value by one",
        },
        {
          kind: "die-pool",
          resource: "Unstoppable Die",
          op: "clear",
          when: "When the die’s value would exceed its maximum value or when the scene ends",
          said: "remove the die and drop out of Unstoppable",
        },
      ],
    },
  },
  "class:Ranger": {
    features: {
      "Hold Them Off": [
        {
          kind: "pay",
          amount: { hope: 3 },
          when: "when you succeed on an attack with a weapon",
          said: "Spend 3 Hope",
        },
      ],
      "Ranger’s Focus": [
        {
          kind: "pay",
          amount: { hope: 1 },
          said: "Spend a Hope",
        },
      ],
    },
  },
  "class:Rogue": {
    features: {
      "Rogue’s Dodge": [
        {
          kind: "pay",
          amount: { hope: 3 },
          said: "Spend 3 Hope",
          steps: [
            {
              kind: "grant-effect",
              effect: { name: "Rogue’s Dodge", duration: "rest", modifiers: [{"target":"evasion","value":2}] },
              said: "gain a +2 bonus to your Evasion",
            }
          ],
        },
      ],
      "Sneak Attack": [
        {
          kind: "roll-dice",
          formula: "1d6",
          when: "a number of d6s equal to your tier",
          said: "add a number of d6s equal to your tier to your damage roll",
        },
      ],
    },
  },
  "class:Seraph": {
    features: {
      "Life Support": [
        {
          kind: "pay",
          amount: { hope: 3 },
          said: "Spend 3 Hope",
        },
      ],
      "Prayer Dice": [
        {
          kind: "die-pool",
          resource: "Prayer Dice",
          op: "roll",
          when: "At the beginning of each session",
          said: "roll a number of d4s equal to your subclass’s Spellcast trait and place them on your character sheet",
        },
        {
          kind: "die-pool",
          resource: "Prayer Dice",
          op: "spend",
          said: "You can spend any number of Prayer Dice",
        },
      ],
    },
  },
  "class:Sorcerer": {
    features: {
      "Minor Illusion": [
        {
          kind: "roll-trait",
          trait: "spellcast",
          dc: 10,
          said: "Make a Spellcast Roll (10)",
        },
      ],
      "Volatile Magic": [
        {
          kind: "pay",
          amount: { hope: 3 },
          when: "on an attack that deals magic damage",
          said: "Spend 3 Hope",
        },
      ],
    },
  },
  "class:Warlock": {
    features: {
      "Patron’s Boon": [
        {
          kind: "pay",
          amount: { hope: 3 },
          when: "When you fail a roll",
          said: "spend 3 Hope",
        },
      ],
    },
  },
  "class:Warrior": {
    features: {
      "Attack of Opportunity": [
        {
          kind: "roll-damage",
          when: "Choose one effect on a success",
          said: "You deal damage to them equal to your primary weapon’s damage",
        },
      ],
      "No Mercy": [
        {
          kind: "pay",
          amount: { hope: 3 },
          said: "Spend 3 Hope",
          steps: [
            {
              kind: "grant-effect",
              effect: { name: "No Mercy", duration: "rest", modifiers: [{"target":"attackRoll","value":1}] },
              said: "gain a +1 bonus to your attack rolls until your next rest",
            }
          ],
        },
      ],
    },
  },
  "class:Witch": {
    features: {
      "Commune": [
        {
          kind: "roll-dice",
          formula: "1d6",
          when: "a number of d6s equal to your Spellcast trait",
          said: "roll a number of <b>d6s</b> equal to your Spellcast trait",
        },
      ],
      "Hex": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress",
          steps: [
            {
              kind: "apply-condition",
              subject: "targets",
              condition: "hexed",
              said: "temporarily <i>Hex</i> a target within Far range",
            }
          ],
        },
      ],
      "Witch’s Charm": [
        {
          kind: "pay",
          amount: { hope: 3 },
          when: "When you or an ally within Far range fails an action roll",
          said: "spend 3 Hope",
        },
      ],
    },
  },
  "class:Wizard": {
    features: {
      "Not This Time": [
        {
          kind: "pay",
          amount: { hope: 3 },
          said: "Spend 3 Hope",
        },
      ],
      "Strange Patterns": [
        {
          kind: "gain",
          amount: { hope: 1 },
          when: "When you roll that number on a Duality Die",
          said: "gain a Hope",
        },
        {
          kind: "clear",
          amount: { stress: 1 },
          when: "When you roll that number on a Duality Die",
          said: "clear a Stress",
        },
      ],
    },
  },
  "community:Frostborne": {
    features: {
      "Hardy": [
        {
          kind: "clear",
          amount: { hitPoints: 1 },
          when: "When you take a rest",
          said: "you clear a Hit Point",
        },
      ],
    },
  },
  "community:Reborne": {
    features: {
      "Found Family": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "Once per rest",
          said: "spend a Hope",
        },
      ],
    },
  },
  "community:Wanderborne": {
    features: {
      "Nomadic Pack": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "Once per session",
          said: "spend a Hope",
        },
      ],
    },
  },
  "community:Warborne": {
    features: {
      "Brave Face": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "Once per session when you would be forced to mark a Stress",
          said: "spend a Hope",
        },
      ],
    },
  },
  "consumable:Arcticite Shard": {
    actions: [
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets who fail the Reaction Roll (16)",
        said: "take <b>3d6</b> magic damage",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "restrained",
        when: "Targets who fail the Reaction Roll (16)",
        said: "become temporarily <i>Restrained</i> by ice",
      },
    ],
  },
  "consumable:Armor Stitcher": {
    actions: [
      {
        kind: "pay",
        label: "Spend 1 Hope, clear 1 Armor Slot",
        amount: { hope: 1 },
        said: "spend any number of Hope",
        steps: [
          {
            kind: "clear",
            amount: { armorSlots: 1 },
            said: "clear that many Armor Slots",
          }
        ],
      },
    ],
  },
  "consumable:Blinding Orb": {
    actions: [
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "vulnerable",
        said: "All targets within Close range become <i>Vulnerable</i>",
      },
    ],
  },
  "consumable:Charm Potion": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Charm Potion", duration: "temporary", modifiers: [{"target":"trait","trait":"presence","value":1}] },
        when: "your next Presence Roll",
        said: "You gain a +1 bonus to your next Presence Roll.",
      },
    ],
  },
  "consumable:Circle of the Void": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        said: "Mark a Stress to create a void",
      },
    ],
  },
  "consumable:Control Potion": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Control Potion", duration: "temporary", modifiers: [{"target":"trait","trait":"finesse","value":1}] },
        when: "your next Finesse Roll",
        said: "You gain a +1 bonus to your next Finesse Roll.",
      },
    ],
  },
  "consumable:Cupbearer’s Bezoar": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Immune to poisons", duration: "longRest" },
        said: "become immune to poisons until your next long rest",
      },
    ],
  },
  "consumable:Demiurge’s Draught": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Demiurge’s Draught", duration: "temporary", modifiers: [{"target":"proficiency","value":1}] },
        when: "for your next successful attack roll",
        said: "gain a +1 bonus to your Proficiency for your next successful attack roll",
      },
    ],
  },
  "consumable:Dragonbloom Tea": {
    actions: [
      {
        kind: "roll-trait",
        trait: "instinct",
        said: "Make an Instinct Roll against all adversaries in front of you within Close range",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets you succeed against",
        said: "Targets you succeed against take d20 physical damage using your Proficiency",
      },
    ],
  },
  "consumable:Drakemantle": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Drakemantle", duration: "scene", modifiers: [{"target":"thresholds","value":5},{"target":"proficiency","value":1}] },
        said: "you can fly and gain a +5 bonus to your damage thresholds and a +1 bonus to your Proficiency",
      },
    ],
  },
  "consumable:Dripfang Poison": {
    actions: [
      {
        kind: "roll-card-damage",
        damageName: "",
        said: "takes 8d10 direct magic damage",
      },
    ],
  },
  "consumable:Dynamite": {
    actions: [
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets who fail",
        said: "Targets who fail take 1d20+5 physical damage.",
      },
    ],
  },
  "consumable:Emberite Shard": {
    actions: [
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "on a failed Reaction Roll (16)",
        said: "take <b>3d6</b> magic damage",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "ablaze",
        said: "become temporarily <i>Ablaze</i>",
      },
    ],
  },
  "consumable:Feast of Xuria": {
    actions: [
      {
        kind: "roll-dice",
        formula: "1d4",
        said: "gain 1d4 Hope",
      },
    ],
  },
  "consumable:Featherstep Potion": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Featherstep Potion", duration: "rest", modifiers: [{"target":"evasion","source":"tier"}] },
        said: "give you a bonus to your Evasion equal to your tier until your next rest",
      },
    ],
  },
  "consumable:Formoid Serum": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "A swarm of ants", duration: "scene" },
        said: "become a swarm of 16 million ants until the end of the scene",
      },
    ],
  },
  "consumable:Fulgurite Shard": {
    actions: [
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "on a failed Reaction Roll (16)",
        said: "take <b>3d6</b> magic damage",
      },
    ],
  },
  "consumable:Glowmoss Mushroom": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Glowing", duration: "longRest" },
        said: "causing it to glow bright blue until your next long rest",
      },
    ],
  },
  "consumable:Green Ooze Oil": {
    actions: [
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "corroded",
        said: "temporarily <i>Corrodes</i> the target",
      },
    ],
  },
  "consumable:Growing Potion": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Growing Potion", duration: "rest", modifiers: [{"target":"trait","trait":"strength","value":2},{"target":"proficiency","value":1}] },
        when: "until you choose to drop this form or your next rest",
        said: "you have a +2 bonus to Strength and a +1 bonus to your Proficiency",
      },
    ],
  },
  "consumable:Health Potion": {
    actions: [
      {
        kind: "roll-dice",
        label: "Roll 1d4+1 HP cleared",
        formula: "1d4+1",
        said: "Clear 1d4+1 HP.",
      },
    ],
  },
  "consumable:Improved Arcane Shard": {
    actions: [
      {
        kind: "roll-trait",
        trait: "finesse",
        said: "You can make a Finesse Roll to throw this shard",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets you succeed against",
        said: "Targets you succeed against take 2d20 magic damage",
      },
    ],
  },
  "consumable:Invisibility Potion": {
    actions: [
      {
        kind: "apply-condition",
        condition: "hidden",
        said: "You are <i>Hidden</i>",
      },
    ],
  },
  "consumable:Jar of Lost Voices": {
    actions: [
      {
        kind: "roll-card-damage",
        damageName: "",
        said: "take 6d8 magic damage",
      },
    ],
  },
  "consumable:Lionheart Tonic": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Lionheart Tonic", duration: "temporary", modifiers: [{"target":"proficiency","value":1}] },
        when: "until you roll with Fear",
        said: "gain a +1 bonus to your Proficiency until you roll with Fear",
      },
    ],
  },
  "consumable:Lyrebird Lozenge": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Mimicking a voice", duration: "rest" },
        said: "perfectly mimic any voice you’ve heard",
      },
    ],
  },
  "consumable:Major Arcane Shard": {
    actions: [
      {
        kind: "roll-trait",
        trait: "finesse",
        said: "You can make a Finesse Roll to throw this shard",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets you succeed against",
        said: "Targets you succeed against take 4d20 magic damage",
      },
    ],
  },
  "consumable:Major Attune Potion": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Major Attune Potion", duration: "rest", modifiers: [{"target":"trait","trait":"instinct","value":1}] },
        said: "You gain a +1 bonus to your Instinct until your next rest.",
      },
    ],
  },
  "consumable:Major Bolster Potion": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Major Bolster Potion", duration: "rest", modifiers: [{"target":"trait","trait":"strength","value":1}] },
        said: "You gain a +1 bonus to your Strength until your next rest.",
      },
    ],
  },
  "consumable:Major Charm Potion": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Major Charm Potion", duration: "rest", modifiers: [{"target":"trait","trait":"presence","value":1}] },
        said: "You gain a +1 bonus to your Presence until your next rest.",
      },
    ],
  },
  "consumable:Major Control Potion": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Major Control Potion", duration: "rest", modifiers: [{"target":"trait","trait":"finesse","value":1}] },
        said: "You gain a +1 bonus to your Finesse until your next rest.",
      },
    ],
  },
  "consumable:Major Enlighten Potion": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Major Enlighten Potion", duration: "rest", modifiers: [{"target":"trait","trait":"knowledge","value":1}] },
        said: "You gain a +1 bonus to your Knowledge until your next rest.",
      },
    ],
  },
  "consumable:Major Health Potion": {
    actions: [
      {
        kind: "roll-dice",
        label: "Roll 1d4+2 HP cleared",
        formula: "1d4+2",
        said: "Clear 1d4+2 HP.",
      },
    ],
  },
  "consumable:Major Stamina Potion": {
    actions: [
      {
        kind: "roll-dice",
        label: "Roll 1d4+2 Stress cleared",
        formula: "1d4+2",
        said: "Clear 1d4+2 Stress",
      },
    ],
  },
  "consumable:Major Stride Potion": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Major Stride Potion", duration: "rest", modifiers: [{"target":"trait","trait":"agility","value":1}] },
        said: "You gain a +1 bonus to your Agility until your next rest.",
      },
    ],
  },
  "consumable:Mesmer’s Tonic": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Hearing only surface thoughts", duration: "rest" },
        said: "the only thing you can hear until your next rest are the surface t",
      },
    ],
  },
  "consumable:Minor Health Potion": {
    actions: [
      {
        kind: "roll-dice",
        label: "Roll 1d4 HP cleared",
        formula: "1d4",
        said: "Clear 1d4 HP.",
      },
    ],
  },
  "consumable:Minor Stamina Potion": {
    actions: [
      {
        kind: "roll-dice",
        label: "Roll 1d4 Stress cleared",
        formula: "1d4",
        said: "Clear 1d4 Stress",
      },
    ],
  },
  "consumable:Mirror of Marigold": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "When you take damage",
        said: "you can spend a Hope to negate that damage",
      },
    ],
  },
  "consumable:Morphing Clay": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        said: "You can spend a Hope to use this clay",
      },
    ],
  },
  "consumable:Nightmare Mead": {
    actions: [
      {
        kind: "gain",
        amount: { fear: 1 },
        said: "the GM gains a Fear",
      },
    ],
  },
  "consumable:Pipeweed": {
    actions: [
      {
        kind: "clear",
        amount: { stress: 1 },
        when: "When you choose the Clear Stress downtime move during a short rest",
        said: "clear an additional Stress",
      },
    ],
  },
  "consumable:Potion of Vigilance": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Potion of Vigilance", duration: "temporary", modifiers: [{"target":"evasion","value":1}] },
        when: "until you mark a Hit Point",
        said: "gain a +1 bonus to your Evasion until you mark a Hit Point",
      },
    ],
  },
  "consumable:Salamander Salve": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Immune to heat", duration: "rest" },
        said: "make yourself immune to heat until your next rest",
      },
    ],
  },
  "consumable:Self-Sewing Thread": {
    actions: [
      {
        kind: "clear",
        label: "Clear a Hit Point",
        amount: { hitPoints: 1 },
        said: "clear either a Hit Point",
      },
      {
        kind: "clear",
        label: "Clear 2 Armor Slots",
        amount: { armorSlots: 2 },
        said: "clear either a Hit Point or 2 Armor Slots",
      },
    ],
  },
  "consumable:Shrinking Potion": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Shrinking Potion", duration: "rest", modifiers: [{"target":"trait","trait":"agility","value":2},{"target":"proficiency","value":-1}] },
        said: "you have a +2 bonus to Agility and a −1 penalty to your Proficiency",
      },
    ],
  },
  "consumable:Snap Powder": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        said: "Mark a Stress",
        steps: [
          {
            kind: "clear",
            amount: { hitPoints: 1 },
            said: "clear a HP",
          }
        ],
      },
    ],
  },
  "consumable:Snapthorn Seed": {
    actions: [
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "restrained",
        said: "temporarily <i>Restrains</i> all creatures within Close range of that point",
      },
    ],
  },
  "consumable:Stamina Potion": {
    actions: [
      {
        kind: "roll-dice",
        label: "Roll 1d4+1 Stress cleared",
        formula: "1d4+1",
        said: "Clear 1d4+1 Stress",
      },
    ],
  },
  "consumable:Stardrop": {
    actions: [
      {
        kind: "roll-card-damage",
        damageName: "",
        said: "deals 8d20 physical damage to all targets within Very Far range",
      },
    ],
  },
  "consumable:Steelskin Salve": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Steelskin Salve", duration: "scene", modifiers: [{"target":"thresholds","source":"tier","scale":1}] },
        said: "gain a bonus to your damage thresholds equal to your tier until the end of the scene",
      },
    ],
  },
  "consumable:Stride Potion": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Stride Potion", duration: "temporary", modifiers: [{"target":"trait","trait":"agility","value":1}] },
        when: "your next Agility Roll",
        said: "You gain a +1 bonus to your next Agility Roll.",
      },
    ],
  },
  "consumable:Sun Tree Sap": {
    actions: [
      {
        kind: "roll-dice",
        formula: "1d6",
        said: "roll a d6",
      },
      {
        kind: "clear",
        amount: { hitPoints: 2 },
        when: "On a result of 5–6",
        said: "clear 2 HP",
      },
      {
        kind: "clear",
        amount: { stress: 3 },
        when: "On a result of 2–4",
        said: "clear 3 Stress",
      },
    ],
  },
  "consumable:Sweet Moss": {
    actions: [
      {
        kind: "roll-dice",
        label: "Roll 1d10 HP or Stress cleared",
        formula: "1d10",
        when: "during a rest",
        said: "clear 1d10 HP or 1d10 Stress",
      },
    ],
  },
  "consumable:Unstable Arcane Shard": {
    actions: [
      {
        kind: "roll-trait",
        trait: "finesse",
        said: "You can make a Finesse Roll to throw this shard",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets you succeed against",
        said: "Targets you succeed against take 1d20 magic damage",
      },
    ],
  },
  "consumable:Varik Leaves": {
    actions: [
      {
        kind: "gain",
        amount: { hope: 2 },
        said: "immediately gain 2 Hope",
      },
    ],
  },
  "consumable:Yakamel Milk": {
    actions: [
      {
        kind: "clear",
        amount: { hitPoints: 1 },
        when: "the next time you clear 1 or more Hit Points",
        said: "you clear an additional Hit Point",
      },
    ],
  },
  "domainCard:A Soldier’s Bond": {
    actions: [
      {
        kind: "gain",
        amount: { hope: 3 },
        when: "Once per long rest",
        said: "you can both gain 3 Hope",
      },
    ],
  },
  "domainCard:Adjust Reality": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 5 },
        when: "After you or a willing ally make any roll",
        said: "spend 5 Hope",
      },
    ],
  },
  "domainCard:Alpha": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "Once per rest",
        said: "<b>mark a Stress</b> and roar",
      },
    ],
  },
  "domainCard:Amber": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 14,
        when: "Once per rest",
        said: "make a <b>Spellcast Roll (14)</b>",
      },
    ],
  },
  "domainCard:Apex": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 2 },
        when: "Once per long rest",
        said: "<b>mark 2 Stress</b>",
      },
      {
        kind: "clear",
        amount: { hitPoints: 1 },
        when: "whenever you defeat an adversary",
        said: "you clear a Hit Point whenever you defeat an adversary",
      },
    ],
  },
  "domainCard:Astral Projection": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "Once per long rest",
        said: "mark a Stress",
      },
    ],
  },
  "domainCard:Avatar of Terror": {
    actions: [
      {
        kind: "pay",
        label: "Transform",
        amount: { stress: 1 },
        said: "Mark a Stress",
      },
      {
        kind: "gain",
        amount: { hope: 1 },
        when: "When the GM spends a Fear to spotlight an adversary within Very Close range",
        said: "you gain a Hope",
      },
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "Before you make an action roll",
        said: "spend a Hope",
      },
    ],
  },
  "domainCard:Banish": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Close range",
      },
    ],
  },
  "domainCard:Barkskin": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "Once per rest",
        said: "<b>mark a Stress</b> to harden",
        steps: [
          {
            kind: "grant-effect",
            effect: { name: "Barkskin", duration: "rest", modifiers: [{"target":"thresholds","value":2}] },
            said: "Until your next rest, gain a <b>+2</b> bonus to your damage thresholds",
          }
        ],
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "While hardened — unarmed attacks",
        said: "your unarmed attacks deal <b>d8+1</b> physical damage using your Proficiency",
      },
    ],
  },
  "domainCard:Battle Monster": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 4 },
        when: "When you make a successful attack against an adversary",
        said: "mark 4 Stress",
      },
    ],
  },
  "domainCard:Battle-Hardened": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "Once per long rest when you would make a Death Move",
        said: "<b>spend a Hope</b>",
        steps: [
          {
            kind: "clear",
            amount: { hitPoints: 1 },
            said: "to clear a Hit Point instead",
          }
        ],
      },
    ],
  },
  "domainCard:Blighting Strike": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Far range",
      },
      {
        kind: "roll-card-damage",
        damageName: "With Hope",
        when: "On a success, on a roll with Hope",
        said: "On a roll with Hope, deal <b>d6+1</b> magic damage using your Proficiency",
      },
      {
        kind: "roll-card-damage",
        damageName: "With Fear",
        when: "On a success, on a roll with Fear",
        said: "On a roll with Fear, deal <b>d10+1</b> magic damage using your Proficiency",
      },
      {
        kind: "pay",
        label: "On a failure: Spend a Hope",
        amount: { hope: 1 },
        when: "On a failure — choose this or Mark a Stress, not both",
        said: "On a failure, you must <b>spend a Hope</b>",
      },
      {
        kind: "pay",
        label: "On a failure: Mark a Stress",
        amount: { stress: 1 },
        when: "On a failure — choose this or Spend a Hope, not both",
        said: "<b>mark a Stress</b>",
      },
    ],
  },
  "domainCard:Blink Out": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 12,
        said: "Make a <b>Spellcast Roll (12)</b>",
      },
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "On a success",
        said: "<b>spend a Hope</b> to teleport to another point you can see within Far range",
      },
      {
        kind: "pay",
        label: "Spend a Hope (per creature)",
        amount: { hope: 1 },
        when: "Once for each willing creature within Very Close range you bring along",
        said: "<b>spend an additional Hope</b> for each creature to bring them with you",
      },
    ],
  },
  "domainCard:Bloom": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 16,
        when: "Once per rest",
        said: "Spellcast Roll (16)",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets who fail",
        said: "4d8+5",
      },
    ],
  },
  "domainCard:Bold Presence": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        said: "<b>spend a Hope</b> to add your Strength to the roll",
      },
    ],
  },
  "domainCard:Bolt Beacon": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Far range",
      },
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "On a success",
        said: "<b>spend a Hope</b> to send a bolt of shimmering light toward them, dealing <b>d8+2</b> magic damage using your Proficiency",
        steps: [
          {
            kind: "roll-card-damage",
            damageName: "",
            said: "dealing <b>d8+2</b> magic damage using your Proficiency",
          }
        ],
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "vulnerable",
        said: "The target becomes temporarily <i>Vulnerable</i>",
      },
    ],
  },
  "domainCard:Bone-Touched": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 3 },
        when: "Once per rest, to cause an attack that succeeded against you to fail instead",
        said: "spend 3 Hope",
      },
    ],
  },
  "domainCard:Book of Ava": {
    actions: [
      {
        kind: "roll-trait",
        label: "Power Push: Spellcast Roll",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Melee range",
      },
      {
        kind: "roll-card-damage",
        damageName: "Power Push",
        when: "Power Push, on a success",
        said: "take <b>d10+2</b> magic damage using your Proficiency",
      },
      {
        kind: "pay",
        label: "Tava's Armor: Spend a Hope",
        amount: { hope: 1 },
        said: "<b>Spend a Hope</b> to give a target you can touch a +1 bonus to their Armor Score",
      },
      {
        kind: "roll-trait",
        label: "Ice Spike: Spellcast Roll (12)",
        trait: "spellcast",
        dc: 12,
        said: "Make a <b>Spellcast Roll (12)</b> to summon a large ice spike within Far range",
      },
      {
        kind: "roll-card-damage",
        damageName: "Ice Spike",
        when: "Ice Spike, on a success",
        said: "deal <b>d6</b> physical damage using your Proficiency",
      },
    ],
  },
  "domainCard:Book of Exota": {
    actions: [
      {
        kind: "pay",
        label: "Create Construct",
        amount: { hope: 1 },
        said: "<b>Spend a Hope</b> to choose a group of objects around you",
      },
      {
        kind: "roll-trait",
        label: "Command construct",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> to command them to take action",
      },
      {
        kind: "roll-card-damage",
        label: "Construct attack",
        damageName: "Create Construct",
        said: "their attacks deal <b>2d10+3</b> physical damage",
      },
    ],
  },
  "domainCard:Book of Grynn": {
    actions: [
      {
        kind: "pay",
        label: "Arcane Deflection: Spend a Hope",
        amount: { hope: 1 },
        when: "Arcane Deflection, once per long rest",
        said: "<b>spend a Hope</b> to negate the damage of an attack targeting you or an ally within Very Close range",
      },
      {
        kind: "roll-trait",
        label: "Time Lock: Spellcast Roll",
        trait: "spellcast",
        when: "If a creature tries to move the object",
        said: "make a <b>Spellcast Roll</b> against them to maintain this spell",
      },
      {
        kind: "roll-trait",
        label: "Wall of Flame: Spellcast Roll (15)",
        trait: "spellcast",
        dc: 15,
        said: "Make a <b>Spellcast Roll (15)</b>",
      },
      {
        kind: "roll-card-damage",
        damageName: "Wall of Flame",
        when: "For anything that passes through the wall",
        said: "takes <b>4d10+3</b> magic damage",
      },
    ],
  },
  "domainCard:Book of Homet": {
    actions: [
      {
        kind: "roll-trait",
        label: "Pass Through",
        trait: "spellcast",
        dc: 13,
        said: "Spellcast Roll (13)",
      },
      {
        kind: "roll-trait",
        label: "Plane Gate",
        trait: "spellcast",
        dc: 14,
        said: "Spellcast Roll (14)",
      },
    ],
  },
  "domainCard:Book of Illiat": {
    actions: [
      {
        kind: "roll-trait",
        label: "Slumber",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Very Close range",
      },
      {
        kind: "pay",
        label: "Telepathy",
        amount: { hope: 1 },
        said: "<b>Spend a Hope</b> to open a line of mental communication",
      },
    ],
  },
  "domainCard:Book of Korvax": {
    actions: [
      {
        kind: "roll-trait",
        label: "Levitation",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> to temporarily lift a target you can see",
      },
      {
        kind: "pay",
        label: "Recant",
        amount: { hope: 1 },
        said: "<b>Spend a Hope</b> to force a target within Melee range",
      },
      {
        kind: "pay",
        label: "Rune Circle",
        amount: { stress: 1 },
        said: "<b>Mark a Stress</b>",
      },
      {
        kind: "roll-card-damage",
        label: "Rune Circle damage",
        damageName: "Rune Circle",
        said: "take <b>2d12+4</b> magic damage",
      },
    ],
  },
  "domainCard:Book of Norai": {
    actions: [
      {
        kind: "roll-trait",
        label: "Mystic Tether: Spellcast Roll",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Far range",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "restrained",
        when: "Mystic Tether, on a success",
        said: "they’re temporarily <i>Restrained</i>",
      },
      {
        kind: "roll-trait",
        label: "Fireball: Spellcast Roll",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Very Far range",
      },
      {
        kind: "roll-card-damage",
        damageName: "Fireball",
        when: "Fireball — targets who fail the Reaction Roll; targets who succeed take half",
        said: "take <b>d20+5</b> magic damage using your Proficiency",
      },
    ],
  },
  "domainCard:Book of Ronin": {
    actions: [
      {
        kind: "roll-trait",
        label: "Transform",
        trait: "spellcast",
        dc: 15,
        said: "Make a <b>Spellcast Roll (15)</b>",
      },
      {
        kind: "roll-trait",
        label: "Eternal Enervation",
        trait: "spellcast",
        when: "Once per long rest",
        said: "make a <b>Spellcast Roll</b> against a target within Close range",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "vulnerable",
        when: "On a success",
        said: "they become permanently <i>Vulnerable</i>",
      },
    ],
  },
  "domainCard:Book of Sitil": {
    actions: [
      {
        kind: "pay",
        label: "Parallela",
        amount: { hope: 2 },
        said: "<b>Spend 2 Hope</b>",
      },
      {
        kind: "roll-trait",
        label: "Illusion",
        trait: "spellcast",
        dc: 14,
        said: "Make a <b>Spellcast Roll (14)</b>",
      },
    ],
  },
  "domainCard:Book of Tyfar": {
    actions: [
      {
        kind: "roll-trait",
        label: "Wild Flame: Spellcast Roll",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against up to three adversaries within Melee range",
      },
      {
        kind: "roll-card-damage",
        damageName: "Wild Flame",
        when: "Wild Flame, targets you succeed against",
        said: "take <b>2d6</b> magic damage",
      },
      {
        kind: "roll-trait",
        label: "Mysterious Mist: Spellcast Roll (13)",
        trait: "spellcast",
        dc: 13,
        said: "Make a <b>Spellcast Roll (13)</b> to cast a temporary thick fog",
      },
    ],
  },
  "domainCard:Book of Vagras": {
    actions: [
      {
        kind: "roll-trait",
        label: "Runic Lock: Spellcast Roll (15)",
        trait: "spellcast",
        dc: 15,
        said: "Make a <b>Spellcast Roll (15)</b> on an object you’re touching that can close",
      },
      {
        kind: "roll-trait",
        label: "Arcane Door: Spellcast Roll (13)",
        trait: "spellcast",
        dc: 13,
        when: "When you have no adversaries within Melee range",
        said: "make a <b>Spellcast Roll (13)</b>",
      },
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "Arcane Door, on a success",
        said: "<b>spend a Hope</b> to create a portal from where you are to a point within Far range you can see",
      },
      {
        kind: "roll-trait",
        label: "Reveal: Spellcast Roll",
        trait: "spellcast",
        said: "<b><i>Reveal:</i></b> Make a <b>Spellcast Roll</b>",
      },
    ],
  },
  "domainCard:Book of Vyola": {
    actions: [
      {
        kind: "roll-trait",
        label: "Memory Delve",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b>",
      },
      {
        kind: "pay",
        label: "Shared Clarity",
        amount: { hope: 1 },
        when: "Once per long rest",
        said: "spend a Hope",
      },
    ],
  },
  "domainCard:Book of Yarrow": {
    actions: [
      {
        kind: "roll-trait",
        label: "Timejammer",
        trait: "spellcast",
        dc: 18,
        said: "Spellcast Roll (18)",
      },
      {
        kind: "pay",
        label: "Magic Immunity",
        amount: { hope: 5 },
        said: "Spend 5 Hope",
      },
    ],
  },
  "domainCard:Boost": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        said: "<b>Mark a Stress</b> to boost off a willing ally within Close range",
      },
    ],
  },
  "domainCard:Brace": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1, armorSlots: 1 },
        when: "When you mark an Armor Slot to reduce incoming damage",
        said: "<b>mark a Stress</b> to mark an additional Armor Slot",
      },
    ],
  },
  "domainCard:Breaking Blow": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you make a successful attack",
        said: "mark a Stress",
      },
    ],
  },
  "domainCard:Chain Lightning": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 2 },
        said: "Mark 2 Stress",
        steps: [
          {
            kind: "roll-trait",
            trait: "spellcast",
            said: "make a <b>Spellcast Roll</b>",
          }
        ],
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets who fail",
        said: "<b>2d8+4</b> magic damage",
      },
    ],
  },
  "domainCard:Chains of Affliction": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 2 },
        said: "<b>Mark 2 Stress</b>",
      },
    ],
  },
  "domainCard:Champion’s Edge": {
    actions: [
      {
        kind: "pay",
        label: "Spend a Hope: clear a Hit Point",
        amount: { hope: 1 },
        when: "When you critically succeed on an attack",
        said: "spend up to 3 Hope",
        steps: [
          {
            kind: "clear",
            amount: { hitPoints: 1 },
            said: "You clear a Hit Point.",
          }
        ],
      },
      {
        kind: "pay",
        label: "Spend a Hope: clear an Armor Slot",
        amount: { hope: 1 },
        when: "When you critically succeed on an attack",
        said: "spend up to 3 Hope",
        steps: [
          {
            kind: "clear",
            amount: { armorSlots: 1 },
            said: "You clear an Armor Slot.",
          }
        ],
      },
    ],
  },
  "domainCard:Chariot of Thought": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "Once per rest",
        said: "<b>spend a Hope</b>",
      },
    ],
  },
  "domainCard:Chokehold": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        said: "<b>mark a Stress</b> to pull them into a chokehold",
        steps: [
          {
            kind: "apply-condition",
            subject: "targets",
            condition: "vulnerable",
            said: "making them temporarily <i>Vulnerable</i>",
          }
        ],
      },
    ],
  },
  "domainCard:Cinder Grasp": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Melee range",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "On a success",
        said: "takes <b>1d20+3</b> magic damage",
      },
    ],
  },
  "domainCard:Cloaking Blast": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "When you make a successful <b>Spellcast Roll</b> to cast a different spell",
        said: "<b>spend a Hope</b>",
        steps: [
          {
            kind: "apply-condition",
            condition: "cloaked",
            said: "to become <i>Cloaked</i>",
          }
        ],
      },
    ],
  },
  "domainCard:Codex-Touched": {
    actions: [
      {
        kind: "pay",
        label: "Mark a Stress: add Proficiency to a Spellcast Roll",
        amount: { stress: 1 },
        when: "When 4 or more of the domain cards in your loadout are from the Codex domain",
        said: "<b>mark a Stress</b> to add your Proficiency to a Spellcast Roll",
      },
    ],
  },
  "domainCard:Cold Solution": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "Once per rest, when an ally within Far range fails an action roll",
        said: "<b>mark a Stress</b> to let them reroll both dice instead",
      },
    ],
  },
  "domainCard:Confusing Aura": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 14,
        said: "Spellcast Roll (14)",
      },
    ],
  },
  "domainCard:Conjure Swarm": {
    actions: [
      {
        kind: "pay",
        label: "Tekaira Armored Beetles: Mark a Stress",
        amount: { stress: 1 },
        said: "<b>Mark a Stress</b> to conjure armored beetles that encircle you",
      },
      {
        kind: "pay",
        label: "Tekaira Armored Beetles: Spend a Hope",
        amount: { hope: 1 },
        said: "<b>spend a Hope</b> to keep the beetles conjured after taking damage",
      },
      {
        kind: "roll-trait",
        label: "Fire Flies: Spellcast Roll",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against all adversaries within Close range",
      },
      {
        kind: "pay",
        label: "Fire Flies: Spend a Hope and deal damage",
        amount: { hope: 1 },
        said: "<b>Spend a Hope</b> to deal <b>2d8+3</b> magic damage to targets you succeeded against",
        steps: [
          {
            kind: "roll-card-damage",
            damageName: "Fire Flies",
            said: "deal <b>2d8+3</b> magic damage to targets you succeeded against",
          }
        ],
      },
    ],
  },
  "domainCard:Corrosive Projectile": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Far range",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "On a success",
        said: "deal <b>d6+4</b> magic damage using your Proficiency",
      },
      {
        kind: "pay",
        amount: { stress: 2 },
        when: "Two Stress per press; the condition stacks, so press again for each further −1",
        said: "<b>mark 2 or more Stress</b> to make them permanently <i>Corroded</i>",
        steps: [
          {
            kind: "apply-condition",
            subject: "targets",
            condition: "corroded",
            said: "make them permanently <i>Corroded</i>",
          }
        ],
      },
    ],
  },
  "domainCard:Crush": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b>",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "On a success",
        said: "they take <b>d12+4</b> magic damage",
      },
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "to give the target a −2 penalty to their damage thresholds",
        said: "mark a Stress",
      },
    ],
  },
  "domainCard:Damnation": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Far range",
      },
    ],
  },
  "domainCard:Dark Army": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 14,
        said: "Make a <b>Spellcast Roll (14)</b>",
      },
    ],
  },
  "domainCard:Dark Whispers": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        said: "<b>mark a Stress</b>",
        steps: [
          {
            kind: "roll-trait",
            trait: "spellcast",
            said: "make a <b>Spellcast Roll</b> against them",
          }
        ],
      },
    ],
  },
  "domainCard:Deadly Focus": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Deadly Focus", duration: "temporary", modifiers: [{"target":"proficiency","value":1}] },
        when: "Once per rest; until you attack another creature, you defeat the target, or the battle ends",
        said: "gain a +1 bonus to your Proficiency",
      },
    ],
  },
  "domainCard:Death Grip": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Close range",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Third option — adversaries between you and the target who fail the Reaction Roll",
        said: "taking <b>3d6+2</b> physical damage",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "restrained",
        when: "On a success",
        said: "temporarily <i>Restraining</i> the target",
      },
    ],
  },
  "domainCard:Deathrun": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 3 },
        said: "Spend 3 Hope",
      },
    ],
  },
  "domainCard:Deep Dreaming": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 15,
        when: "Once per long rest",
        said: "make a <b>Spellcast Roll (15)</b>",
      },
    ],
  },
  "domainCard:Deft Deceiver": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        said: "<b>Spend a Hope</b>",
      },
    ],
  },
  "domainCard:Deft Maneuvers": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "Once per rest",
        said: "<b>mark a Stress</b>",
      },
    ],
  },
  "domainCard:Dire Strike": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "When a target marks any number of Hit Points from an attack you make",
        said: "spend a Hope",
        steps: [
          {
            kind: "pay",
            amount: { fear: 1 },
            said: "The GM loses a Fear.",
          }
        ],
      },
    ],
  },
  "domainCard:Disintegration Wave": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 18,
        said: "Make a <b>Spellcast Roll (18)</b>",
      },
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "Once per long rest on a success - one press per adversary",
        said: "<b>Mark a Stress</b> for each one you wish to hit with this spell",
      },
    ],
  },
  "domainCard:Disjunction": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 18,
        when: "Once per long rest",
        said: "make a <b>Spellcast Roll (18)</b>",
      },
    ],
  },
  "domainCard:Divination": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 3 },
        when: "Once per long rest",
        said: "<b>spend 3 Hope</b>",
      },
    ],
  },
  "domainCard:Dread-Touched": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 2 },
        when: "When you succeed with Fear, to prevent the GM from gaining a Fear",
        said: "mark 2 Stress",
      },
    ],
  },
  "domainCard:Earthquake": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 16,
        said: "Make a <b>Spellcast Roll (16)</b>",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets who fail",
        said: "take <b>3d10+8</b> physical damage",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "vulnerable",
        when: "Targets who fail",
        said: "are temporarily <i>Vulnerable</i>",
      },
    ],
  },
  "domainCard:Eclipse": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 16,
        said: "Spellcast Roll (16)",
      },
    ],
  },
  "domainCard:Eldritch Flesh": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 2 },
        when: "When you roll with Fear",
        said: "spend 2 Hope",
        steps: [
          {
            kind: "clear",
            amount: { armorSlots: 1 },
            said: "clear an Armor Slot",
          }
        ],
      },
    ],
  },
  "domainCard:Elsewhere": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        when: "Once per rest",
        said: "make a <b>Spellcast Roll</b> against up to three targets within Close range",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "vulnerable",
        when: "Targets you succeed against",
        said: "are temporarily <i>Vulnerable</i>",
      },
    ],
  },
  "domainCard:Encore": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        when: "When an ally within Close range deals damage to an adversary",
        said: "Spellcast Roll",
      },
    ],
  },
  "domainCard:Endless Charisma": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "After you make an action roll to persuade, lie, or garner favor",
        said: "spend a Hope",
      },
    ],
  },
  "domainCard:Enrapture": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Close range",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "enraptured",
        when: "On a success",
        said: "they become temporarily <i>Enraptured</i>",
      },
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "Once per rest, on a success",
        said: "<b>mark a Stress</b> to force the <i>Enraptured</i> target to mark a Stress as well",
      },
    ],
  },
  "domainCard:Erasure": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 16,
        when: "Once per long rest",
        said: "Spellcast Roll (16)",
      },
    ],
  },
  "domainCard:Excise": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 13,
        when: "Once per rest",
        said: "make a <b>Spellcast Roll (13)</b>",
      },
    ],
  },
  "domainCard:Falling Sky": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against all adversaries within Far range",
      },
    ],
  },
  "domainCard:Feed": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "Once per rest, when you deal damage to a target within Melee range",
        said: "mark a Stress",
        steps: [
          {
            kind: "clear",
            amount: { hitPoints: 1 },
            said: "clear a Hit Point",
          },
          {
            kind: "gain",
            amount: { hope: 1 },
            said: "gain a Hope",
          }
        ],
      },
    ],
  },
  "domainCard:Ferocity": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 2 },
        when: "When you cause an adversary to mark 1 or more Hit Points",
        said: "<b>spend 2 Hope</b> to increase your Evasion by the number of Hit Points they marked",
      },
    ],
  },
  "domainCard:Final Words": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 13,
        said: "Make a <b>Spellcast Roll (13)</b>",
      },
    ],
  },
  "domainCard:Flight": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 15,
        said: "Make a <b>Spellcast Roll (15)</b>",
      },
    ],
  },
  "domainCard:Floating Eye": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        said: "<b>Spend a Hope</b>",
      },
    ],
  },
  "domainCard:Fold": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        said: "<b>Spend a Hope</b> and make a <b>Spellcast Roll (13)</b>",
        steps: [
          {
            kind: "roll-trait",
            trait: "spellcast",
            dc: 13,
            said: "make a <b>Spellcast Roll (13)</b>",
          }
        ],
      },
    ],
  },
  "domainCard:Forager": {
    actions: [
      {
        kind: "roll-dice",
        formula: "1d6",
        when: "As an additional downtime move you can choose",
        said: "roll a <b>d6</b> to see what you forage",
      },
    ],
  },
  "domainCard:Force of Nature": {
    actions: [
      {
        kind: "pay",
        label: "Transform",
        amount: { stress: 1 },
        said: "Mark a Stress",
      },
      {
        kind: "clear",
        amount: { armorSlots: 1 },
        when: "When you deal enough damage to defeat a creature within Close range",
        said: "clear an Armor Slot",
      },
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "Before you make an action roll",
        said: "spend a Hope",
      },
    ],
  },
  "domainCard:Forceful Push": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        said: "<b>spend a Hope</b> to make them temporarily <i>Vulnerable</i>",
        steps: [
          {
            kind: "apply-condition",
            subject: "targets",
            condition: "vulnerable",
            said: "make them temporarily <i>Vulnerable</i>",
          }
        ],
      },
    ],
  },
  "domainCard:Forest Sprites": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 13,
        said: "Make a <b>Spellcast Roll (13)</b>",
      },
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "On a success - one Hope per sprite",
        said: "spend any number of Hope",
      },
    ],
  },
  "domainCard:Full Surge": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 3 },
        when: "Once per long rest",
        said: "mark 3 Stress",
        steps: [
          {
            kind: "grant-effect",
            effect: { name: "Full Surge", duration: "rest", modifiers: [{"target":"trait","trait":"agility","value":2},{"target":"trait","trait":"strength","value":2},{"target":"trait","trait":"finesse","value":2},{"target":"trait","trait":"instinct","value":2},{"target":"trait","trait":"presence","value":2},{"target":"trait","trait":"knowledge","value":2}] },
            said: "Gain a +2 bonus to all of your character traits until your next rest.",
          }
        ],
      },
    ],
  },
  "domainCard:Geometry of Ruin": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        when: "Once per long rest, against all targets within Far range",
        said: "make a <b>Spellcast Roll</b>",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets who fail",
        said: "take <b>4d10+6</b> magic damage",
      },
      {
        kind: "pay",
        amount: { fear: 1 },
        when: "one press per failing target",
        said: "The GM loses a Fear for each target that fails.",
      },
    ],
  },
  "domainCard:Get Back Up": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you take Severe damage",
        said: "<b>mark a Stress</b> to reduce the severity by one threshold",
      },
    ],
  },
  "domainCard:Glancing Blow": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you fail an attack",
        said: "<b>mark a Stress</b>",
      },
    ],
  },
  "domainCard:Glimpse the Hunt": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        said: "<b>Mark a Stress</b>",
      },
    ],
  },
  "domainCard:Glyph of Nightfall": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Very Close range",
      },
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "On a success",
        said: "<b>spend a Hope</b> to conjure a dark glyph",
      },
    ],
  },
  "domainCard:Goad Them On": {
    actions: [
      {
        kind: "roll-trait",
        trait: "presence",
        said: "make a <b>Presence Roll</b> against them",
      },
    ],
  },
  "domainCard:Gore and Glory": {
    actions: [
      {
        kind: "gain",
        amount: { hope: 1 },
        when: "When you critically succeed on a weapon attack",
        said: "gain an additional Hope",
      },
      {
        kind: "clear",
        amount: { stress: 1 },
        when: "When you critically succeed on a weapon attack",
        said: "clear an additional Stress",
      },
      {
        kind: "gain",
        amount: { hope: 1 },
        when: "when you deal enough damage to defeat an enemy",
        said: "gain a Hope",
      },
      {
        kind: "clear",
        amount: { stress: 1 },
        when: "when you deal enough damage to defeat an enemy",
        said: "clear a Stress",
      },
    ],
  },
  "domainCard:Grace-Touched": {
    actions: [
      {
        kind: "pay",
        amount: { armorSlots: 1 },
        when: "When 4 or more of the domain cards in your loadout are from the Grace domain",
        said: "<b>mark an Armor Slot</b> instead of marking a Stress",
      },
    ],
  },
  "domainCard:Ground Pound": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 2 },
        said: "Spend 2 Hope",
        steps: [
          {
            kind: "roll-trait",
            trait: "strength",
            said: "Strength Roll",
          }
        ],
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets who fail",
        said: "4d10+8",
      },
    ],
  },
  "domainCard:Healing Field": {
    actions: [
      {
        kind: "clear",
        amount: { hitPoints: 1 },
        when: "Once per long rest",
        said: "allowing you and all allies in the area to clear a Hit Point",
      },
      {
        kind: "pay",
        amount: { hope: 2 },
        said: "<b>Spend 2 Hope</b> to allow you and all allies to clear 2 Hit Points instead",
        steps: [
          {
            kind: "clear",
            amount: { hitPoints: 2 },
            said: "clear 2 Hit Points instead",
          }
        ],
      },
    ],
  },
  "domainCard:Healing Hands": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 13,
        said: "Make a <b>Spellcast Roll (13)</b>",
      },
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "On a success — clears 2 Hit Points or 2 Stress on the target",
        said: "<b>mark a Stress</b> to clear 2 Hit Points or 2 Stress on the target",
      },
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "On a failure — clears a Hit Point or a Stress on the target",
        said: "<b>mark a Stress</b> to clear a Hit Point or a Stress on the target",
      },
    ],
  },
  "domainCard:Healing Strike": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 2 },
        when: "When you deal damage to an adversary",
        said: "spend 2 Hope",
      },
    ],
  },
  "domainCard:Hideous Retribution": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "On a success",
        said: "<b>mark a Stress</b> to deal <b>d6</b> magic damage",
        steps: [
          {
            kind: "roll-card-damage",
            damageName: "",
            said: "deal <b>d6</b> magic damage",
          }
        ],
      },
    ],
  },
  "domainCard:Hold the Line": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        said: "<b>spend a Hope</b>",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "restrained",
        when: "If an adversary moves within Very Close range",
        said: "they’re pulled into Melee range and <i>Restrained</i>",
      },
    ],
  },
  "domainCard:Hungry Fire": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Close range",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "On a success",
        said: "they take <b>d8+2</b> magic damage using your Proficiency",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "ablaze",
        when: "On a success",
        said: "are temporarily <i>Ablaze</i>",
      },
    ],
  },
  "domainCard:Hush": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b>",
      },
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "On a success",
        said: "spend a Hope",
        steps: [
          {
            kind: "apply-condition",
            subject: "targets",
            condition: "silenced",
            said: "The target and anything within the area is <i>Silenced</i>",
          }
        ],
      },
    ],
  },
  "domainCard:Hypnotic Shimmer": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against all adversaries in front of you within Close range",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "stunned",
        when: "Once per rest, on a success",
        said: "temporarily <i>Stuns</i> targets you succeed against",
      },
    ],
  },
  "domainCard:I Am Your Shield": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        said: "<b>mark a Stress</b>",
      },
    ],
  },
  "domainCard:I See it Coming": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you are targeted by an attack made from beyond Melee range",
        said: "<b>mark a Stress</b> to roll a <b>d4</b> and gain a bonus to your Evasion equal to the result",
        steps: [
          {
            kind: "roll-dice",
            formula: "1d4",
            said: "roll a <b>d4</b>",
          }
        ],
      },
    ],
  },
  "domainCard:Invisibility": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 10,
        said: "Make a <b>Spellcast Roll (10)</b>",
      },
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "On a success",
        said: "<b>mark a Stress</b> and choose yourself or an ally within Melee range to become <i>Invisible</i>",
        steps: [
          {
            kind: "apply-condition",
            subject: "targets",
            condition: "invisible",
            said: "to become <i>Invisible</i>",
          }
        ],
      },
    ],
  },
  "domainCard:Invoke Torment": {
    actions: [
      {
        kind: "gain",
        amount: { hope: 1 },
        when: "when an adversary within Close range is defeated with all its Stress marked",
        said: "you gain a Hope",
      },
    ],
  },
  "domainCard:Jump Scare": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you deal magic damage to a target",
        said: "mark a Stress",
        steps: [
          {
            kind: "apply-condition",
            subject: "targets",
            condition: "vulnerable",
            said: "they are <i>Vulnerable</i>",
          }
        ],
      },
    ],
  },
  "domainCard:Know Thy Enemy": {
    actions: [
      {
        kind: "roll-trait",
        trait: "instinct",
        when: "When observing a creature",
        said: "make an <b>Instinct Roll</b>",
      },
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "On a success, to ask the GM for one set of information",
        said: "spend a Hope",
      },
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "Additionally on a success",
        said: "mark a Stress",
        steps: [
          {
            kind: "pay",
            amount: { fear: 1 },
            said: "remove a Fear from the GM’s Fear Pool",
          }
        ],
      },
    ],
  },
  "domainCard:Lead By Example": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you deal damage to an adversary",
        said: "mark a Stress",
      },
    ],
  },
  "domainCard:Lean On Me": {
    actions: [
      {
        kind: "clear",
        amount: { stress: 2 },
        when: "Once per long rest",
        said: "you can both clear 2 Stress",
      },
    ],
  },
  "domainCard:Life Ward": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 3 },
        said: "<b>Spend 3 Hope</b> and choose an ally within Close range",
      },
    ],
  },
  "domainCard:Manifest Wall": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 15,
        said: "Make a <b>Spellcast Roll (15)</b>",
      },
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "Once per rest on a success",
        said: "spend a Hope",
      },
    ],
  },
  "domainCard:Mass Disguise": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you have a few minutes of silence to focus",
        said: "mark a Stress",
      },
    ],
  },
  "domainCard:Mass Enrapture": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Spellcast Roll",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "enraptured",
        when: "Targets you succeed against",
        said: "Enraptured",
      },
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "To end this spell",
        said: "Mark a Stress",
      },
    ],
  },
  "domainCard:Mending Touch": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 2 },
        said: "<b>spend 2 Hope</b> to clear a Hit Point or a Stress on them",
      },
    ],
  },
  "domainCard:Midnight Spirit": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        said: "<b>Spend a Hope</b> to summon a humanoid-sized spirit",
      },
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "make a <b>Spellcast Roll</b> against a target within Very Far range",
      },
    ],
  },
  "domainCard:Midnight-Touched": {
    actions: [
      {
        kind: "gain",
        amount: { hope: 1 },
        when: "Once per rest, when you have 0 Hope and the GM would gain a Fear",
        said: "gain a Hope instead",
      },
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you make a successful attack, to add your Fear Die to the damage roll",
        said: "mark a Stress",
      },
    ],
  },
  "domainCard:Natural Familiar": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        said: "<b>Spend a Hope</b> to summon a small nature spirit",
      },
      {
        kind: "pay",
        label: "Summon a flying familiar",
        amount: { hope: 1 },
        said: "<b>spend an additional Hope</b>",
      },
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "make a <b>Spellcast Roll</b> to command them to perform simple tasks",
      },
      {
        kind: "pay",
        amount: { stress: 1 },
        said: "<b>mark a Stress</b> to see through their eyes",
      },
    ],
  },
  "domainCard:Nature’s Tongue": {
    actions: [
      {
        kind: "roll-trait",
        trait: "instinct",
        dc: 12,
        said: "make an <b>Instinct Roll (12)</b>",
      },
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "Before a Spellcast Roll made within a natural environment",
        said: "<b>spend a Hope</b> to gain a +2 bonus to the roll",
      },
    ],
  },
  "domainCard:Never Upstaged": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you mark 1 or more Hit Points from an attack",
        said: "<b>mark a Stress</b>",
      },
    ],
  },
  "domainCard:Night Terror": {
    actions: [
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "horrified",
        when: "On a failed Reaction Roll (16)",
        said: "become temporarily <i>Horrified</i>",
      },
    ],
  },
  "domainCard:Notorious": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you leverage your notoriety to get what you want",
        said: "<b>mark a Stress</b> before you roll to gain a +10 bonus to the result",
      },
    ],
  },
  "domainCard:Null Grip": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        when: "Once per rest",
        said: "make a <b>Spellcast Roll</b> against a target within Close range",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "On a success",
        said: "they take <b>2d8</b> magic damage",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "restrained",
        when: "On a success",
        said: "are temporarily <i>Restrained</i>",
      },
    ],
  },
  "domainCard:Onslaught": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "when a creature within your weapon’s range deals damage to an ally with an attack that doesn’t include you",
        said: "<b>mark a Stress</b>",
      },
    ],
  },
  "domainCard:Overwhelming Aura": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 15,
        said: "Make a <b>Spellcast Roll (15)</b>",
      },
      {
        kind: "pay",
        amount: { hope: 2 },
        when: "On a success",
        said: "<b>spend 2 Hope</b>",
      },
    ],
  },
  "domainCard:Phantom Retreat": {
    actions: [
      {
        kind: "pay",
        label: "Activate",
        amount: { hope: 1 },
        said: "Spend a Hope",
      },
      {
        kind: "pay",
        label: "Return",
        amount: { hope: 1 },
        when: "At any time before your next rest",
        said: "Spend another Hope",
      },
    ],
  },
  "domainCard:Plant Dominion": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 18,
        said: "Make a <b>Spellcast Roll (18)</b>",
      },
    ],
  },
  "domainCard:Preservation Blast": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b>",
      },
    ],
  },
  "domainCard:Rage Up": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "Before you make an attack",
        said: "mark a Stress",
      },
    ],
  },
  "domainCard:Rain of Blades": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        said: "<b>Spend a Hope</b> to make a <b>Spellcast Roll</b>",
        steps: [
          {
            kind: "roll-trait",
            trait: "spellcast",
            said: "make a <b>Spellcast Roll</b> and conjure throwing blades",
          }
        ],
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets you succeed against",
        said: "take <b>d8+2</b> magic damage",
      },
    ],
  },
  "domainCard:Rapid Riposte": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When an attack made against you from within Melee range fails",
        said: "<b>mark a Stress</b>",
        steps: [
          {
            kind: "roll-damage",
            said: "deal the weapon damage of one of your active weapons to the attacker",
          }
        ],
      },
    ],
  },
  "domainCard:Reaper’s Strike": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "Once per long rest, to make an attack roll",
        said: "spend a Hope",
      },
    ],
  },
  "domainCard:Reckless": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        said: "<b>Mark a Stress</b> to gain advantage on an attack",
      },
    ],
  },
  "domainCard:Reckoning": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        said: "<b>Mark a Stress</b>",
      },
    ],
  },
  "domainCard:Recovery": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "to let an ally do the same",
        said: "spend a Hope",
      },
    ],
  },
  "domainCard:Redirect": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "If any roll a 6",
        said: "<b>mark a Stress</b>",
      },
    ],
  },
  "domainCard:Regrow": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 14,
        when: "Once per rest",
        said: "make a <b>Spellcast Roll (14)</b>",
      },
      {
        kind: "clear",
        amount: { hitPoints: 2 },
        when: "On a success - on yourself, or on an ally by hand",
        said: "clear <b>2 Hit Points</b>",
      },
    ],
  },
  "domainCard:Rejuvenation Barrier": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 15,
        said: "Spellcast Roll (15)",
      },
      {
        kind: "roll-dice",
        label: "Hit Points cleared",
        formula: "1d4",
        when: "Once per rest on a success",
        said: "1d4",
      },
    ],
  },
  "domainCard:Rend": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        said: "<b>Spend a Hope.</b>",
      },
    ],
  },
  "domainCard:Resurrection": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 20,
        said: "Make a <b>Spellcast Roll (20)</b>",
      },
      {
        kind: "roll-dice",
        label: "Roll a d6 — 5 or lower vaults this card",
        formula: "1d6",
        when: "On a success",
        said: "Then roll a <b>d6</b>",
      },
    ],
  },
  "domainCard:Rift Walker": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 15,
        said: "Make a <b>Spellcast Roll (15)</b>",
      },
    ],
  },
  "domainCard:Rise Up": {
    actions: [
      {
        kind: "clear",
        amount: { stress: 1 },
        when: "When you mark 1 or more Hit Points from an attack",
        said: "clear a Stress",
      },
    ],
  },
  "domainCard:Rousing Strike": {
    actions: [
      {
        kind: "clear",
        amount: { hitPoints: 1 },
        when: "Once per rest, when you critically succeed on an attack",
        said: "clear a Hit Point",
      },
      {
        kind: "roll-dice",
        label: "Stress cleared",
        formula: "1d4",
        when: "Once per rest, when you critically succeed on an attack",
        said: "1d4",
      },
    ],
  },
  "domainCard:Rune Ward": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "the ward's holder, when reducing incoming damage",
        said: "can spend a Hope to reduce incoming damage by <b>1d8</b>",
        steps: [
          {
            kind: "die-pool",
            resource: "Ward Die",
            op: "roll",
            said: "reduce incoming damage by <b>1d8</b>",
          }
        ],
      },
    ],
  },
  "domainCard:Safe Haven": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 2 },
        when: "When you have a few minutes of calm to focus",
        said: "spend 2 Hope",
      },
    ],
  },
  "domainCard:Salvation Beam": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 16,
        said: "Make a <b>Spellcast Roll (16)</b>",
      },
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "On a success - one Stress per Hit Point cleared on the targets",
        said: "mark any number of Stress",
      },
    ],
  },
  "domainCard:Savor the Anguish": {
    actions: [
      {
        kind: "clear",
        amount: { stress: 1 },
        when: "When an adversary within Close range takes Severe damage",
        said: "clear a Stress",
      },
    ],
  },
  "domainCard:Second Silence": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 18,
        when: "Once per long rest",
        said: "Spellcast Roll (18)",
      },
    ],
  },
  "domainCard:Second Wind": {
    actions: [
      {
        kind: "clear",
        label: "Clear 3 Stress",
        amount: { stress: 3 },
        when: "Once per rest, when you succeed on an attack",
        said: "you can clear 3 Stress or a Hit Point",
      },
      {
        kind: "clear",
        label: "Clear a Hit Point",
        amount: { hitPoints: 1 },
        when: "Once per rest, when you succeed on an attack",
        said: "you can clear 3 Stress or a Hit Point",
      },
    ],
  },
  "domainCard:Sensory Projection": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 15,
        said: "make a <b>Spellcast Roll (15)</b>",
      },
    ],
  },
  "domainCard:Sever": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 16,
        when: "Once per rest",
        said: "Spellcast Roll (16)",
      },
    ],
  },
  "domainCard:Shadowbind": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against all adversaries within Very Close range",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "restrained",
        said: "Targets you succeed against are temporarily <i>Restrained</i>",
      },
    ],
  },
  "domainCard:Shape Material": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        said: "Spend a Hope",
      },
    ],
  },
  "domainCard:Shield Aura": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        said: "Mark a Stress",
      },
    ],
  },
  "domainCard:Shrug It Off": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you would take damage",
        said: "mark a Stress",
        steps: [
          {
            kind: "roll-dice",
            formula: "1d6",
            said: "d6",
          }
        ],
      },
    ],
  },
  "domainCard:Sigil of Retribution": {
    actions: [
      {
        kind: "gain",
        amount: { fear: 1 },
        said: "The GM gains a Fear.",
      },
      {
        kind: "die-pool",
        resource: "Sigil Dice",
        when: "When the marked adversary deals damage to you or your allies",
        said: "place a <b>d8</b> on this card",
      },
      {
        kind: "die-pool",
        resource: "Sigil Dice",
        op: "roll",
        when: "When you successfully attack the marked adversary",
        said: "roll the dice on this card",
        steps: [
          {
            kind: "die-pool",
            resource: "Sigil Dice",
            op: "clear",
            said: "clear the dice",
          }
        ],
      },
    ],
  },
  "domainCard:Signature Move": {
    actions: [
      {
        kind: "clear",
        amount: { stress: 1 },
        when: "On a success",
        said: "clear a Stress",
      },
    ],
  },
  "domainCard:Silence the Song": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        when: "Once per rest",
        said: "make a <b>Spellcast Roll</b> against a target within Close range",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "silenced",
        when: "On a success",
        said: "they're temporarily <i>Silenced</i>",
      },
    ],
  },
  "domainCard:Siphon Essence": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Very Close range",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Once per long rest, on a success",
        said: "the target takes <b>d12+4</b> magic damage using your Proficiency",
      },
    ],
  },
  "domainCard:Smite": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 3 },
        when: "Once per rest",
        said: "spend 3 Hope",
      },
    ],
  },
  "domainCard:Soothing Speech": {
    actions: [
      {
        kind: "clear",
        amount: { hitPoints: 2 },
        when: "During a short rest, after Tend to Wounds on another character",
        said: "you also clear 2 Hit Points",
      },
    ],
  },
  "domainCard:Specter of the Dark": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        said: "<b>Mark a Stress</b>",
        steps: [
          {
            kind: "apply-condition",
            condition: "spectral",
            said: "to become <i>Spectral</i>",
          }
        ],
      },
    ],
  },
  "domainCard:Spectral Mist": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 2 },
        said: "Spend 2 Hope",
      },
    ],
  },
  "domainCard:Splintering Strike": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "and make an attack against all adversaries within your weapon’s range",
        said: "Spend a Hope",
      },
      {
        kind: "roll-damage",
        when: "Once per long rest, on a success against any targets",
        said: "roll your weapon’s damage",
      },
    ],
  },
  "domainCard:Stealth Expertise": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you roll with Fear while moving unnoticed through a dangerous area",
        said: "<b>mark a Stress</b> to roll with Hope instead",
      },
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When an ally within Close range moving unnoticed rolls with Fear",
        said: "<b>mark a Stress</b> to change their result to a roll with Hope",
      },
    ],
  },
  "domainCard:Stunning Sunlight": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Spellcast Roll",
      },
      {
        kind: "roll-card-damage",
        damageName: "Targets who succeed",
        when: "Targets who succeed",
        said: "3d20+3",
      },
      {
        kind: "roll-card-damage",
        damageName: "Targets who fail",
        when: "Targets who fail",
        said: "4d20+5",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "stunned",
        when: "Targets who fail",
        said: "Stunned",
      },
    ],
  },
  "domainCard:Summon Horror": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "Once per scene",
        said: "mark a Stress to summon an otherworldly creature",
      },
    ],
  },
  "domainCard:Support Tank": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 2 },
        said: "<b>spend 2 Hope</b>",
      },
    ],
  },
  "domainCard:Swift Step": {
    actions: [
      {
        kind: "clear",
        amount: { stress: 1 },
        when: "When an attack made against you fails",
        said: "clear a Stress",
      },
      {
        kind: "gain",
        amount: { hope: 1 },
        when: "If you can’t clear a Stress",
        said: "gain a Hope",
      },
    ],
  },
  "domainCard:Telekinesis": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b>",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "On a success, against the second target",
        said: "deal <b>d12+4</b> physical damage",
      },
    ],
  },
  "domainCard:Teleport": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 16,
        when: "Once per long rest",
        said: "Spellcast Roll (16)",
      },
    ],
  },
  "domainCard:Tell No Lies": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Very Close range",
      },
    ],
  },
  "domainCard:Tempest": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "make a <b>Spellcast Roll</b> against all targets within Far range",
      },
      {
        kind: "roll-card-damage",
        damageName: "Blizzard",
        said: "Deal <b>2d20+8</b> magic damage",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "vulnerable",
        when: "Blizzard",
        said: "targets are temporarily <i>Vulnerable</i>",
      },
      {
        kind: "roll-card-damage",
        damageName: "Hurricane",
        said: "Deal <b>3d10+10</b> magic damage",
      },
      {
        kind: "roll-card-damage",
        damageName: "Sandstorm",
        said: "Deal <b>5d6+9</b> magic damage",
      },
    ],
  },
  "domainCard:Terrify": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Close range",
      },
      {
        kind: "roll-dice",
        label: "Roll 1d4 (target's Stress)",
        formula: "1d4",
        when: "On a success — the target marks this many Stress",
        said: "the target marks <b>1d4</b> Stress",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "vulnerable",
        when: "On a success with Fear",
        said: "the target also becomes temporarily <i>Vulnerable</i>",
      },
    ],
  },
  "domainCard:The Beast": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "Once per rest",
        said: "<b>mark a Stress</b> to give in",
        steps: [
          {
            kind: "grant-effect",
            effect: { name: "The Beast", duration: "scene", modifiers: [{"target":"attackRoll","value":1}] },
            said: "Until the scene ends, gain a <b>+1</b> bonus to your attack rolls",
          }
        ],
      },
    ],
  },
  "domainCard:The Hollow Note": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 15,
        when: "Once per long rest",
        said: "Spellcast Roll (15)",
      },
    ],
  },
  "domainCard:The Long Memory": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        when: "Once per long rest",
        said: "Spellcast Roll",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "horrified",
        when: "Permanently on a failure, temporarily on a success",
        said: "Horrified",
      },
    ],
  },
  "domainCard:The Pack Knows": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        said: "<b>spend a Hope</b> to add your Instinct to their roll",
      },
    ],
  },
  "domainCard:The Undergrowth Wakes": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 18,
        when: "Once per long rest",
        said: "make a <b>Spellcast Roll (18)</b>",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets who fail",
        said: "take <b>3d12+8</b> physical damage",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "restrained",
        when: "Targets who fail",
        said: "temporarily <i>Restrained</i>",
      },
    ],
  },
  "domainCard:The World Tree": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 18,
        when: "Once per long rest",
        said: "Spellcast Roll (18)",
      },
    ],
  },
  "domainCard:Thorn Skin": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "Once per rest",
        said: "spend a Hope",
      },
    ],
  },
  "domainCard:Thorn Spray": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        when: "Once per rest",
        said: "make a <b>Spellcast Roll</b> against all targets within Very Close range",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets you succeed against",
        said: "take <b>2d8+4</b> physical damage",
      },
    ],
  },
  "domainCard:Thought Delver": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "to read the vague surface thoughts of a target within Far range",
        said: "Spend a Hope",
      },
      {
        kind: "roll-trait",
        trait: "spellcast",
        when: "to delve for deeper, more hidden thoughts",
        said: "Make a <b>Spellcast Roll</b>",
      },
    ],
  },
  "domainCard:Towering Stalk": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        said: "<b>Mark a Stress</b> to use this spell as an attack",
        steps: [
          {
            kind: "roll-trait",
            trait: "spellcast",
            said: "Make a <b>Spellcast Roll</b> against an adversary or group of adversaries within Close range",
          }
        ],
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "targets you succeed against",
        said: "dealing <b>d8</b> physical damage",
      },
    ],
  },
  "domainCard:Transcendent Union": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 5 },
        when: "Once per long rest",
        said: "<b>spend 5 Hope</b>",
      },
    ],
  },
  "domainCard:Troublemaker": {
    actions: [
      {
        kind: "roll-trait",
        trait: "presence",
        said: "make a <b>Presence Roll</b> against them",
      },
    ],
  },
  "domainCard:Umbral Veil": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "Once per rest",
        said: "<b>mark a Stress</b>",
      },
    ],
  },
  "domainCard:Unbreakable": {
    actions: [
      {
        kind: "roll-dice",
        label: "Hit Points cleared",
        formula: "1d6",
        when: "When you mark your last Hit Point, instead of making a death move",
        said: "d6",
      },
    ],
  },
  "domainCard:Uncanny Disguise": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you have a few minutes to prepare",
        said: "<b>mark a Stress</b> to don the facade of any humanoid",
      },
    ],
  },
  "domainCard:Unleash Chaos": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Far range",
      },
      {
        kind: "pay",
        label: "Mark a Stress to replenish tokens",
        amount: { stress: 1 },
        said: "<b>Mark a Stress</b> to replenish this card with tokens",
      },
    ],
  },
  "domainCard:Unmake": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 15,
        when: "Once per long rest",
        said: "make a <b>Spellcast Roll (15)</b>",
      },
    ],
  },
  "domainCard:Valor-Touched": {
    actions: [
      {
        kind: "clear",
        amount: { armorSlots: 1 },
        when: "When you mark 1 or more Hit Points without marking an Armor Slot",
        said: "clear an Armor Slot",
      },
    ],
  },
  "domainCard:Vanishing Dodge": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "When an attack made against you that would deal physical damage fails",
        said: "<b>spend a Hope</b>",
        steps: [
          {
            kind: "apply-condition",
            condition: "hidden",
            said: "becoming <i>Hidden</i>",
          }
        ],
      },
    ],
  },
  "domainCard:Vector": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        said: "<b>Spend a Hope</b> and make a <b>Spellcast Roll</b>",
        steps: [
          {
            kind: "roll-trait",
            trait: "spellcast",
            said: "make a <b>Spellcast Roll</b> against a target within Far range",
          }
        ],
      },
    ],
  },
  "domainCard:Veil of Night": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 13,
        said: "Make a <b>Spellcast Roll (13)</b>",
      },
    ],
  },
  "domainCard:Versatile Fighter": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you deal damage",
        said: "<b>mark a Stress</b> to use the maximum result of one of your damage dice instead of rolling it",
      },
    ],
  },
  "domainCard:Vicious Entangle": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against a target within Far range",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "On a success",
        said: "dealing <b>1d8+1</b> physical damage",
        steps: [
          {
            kind: "apply-condition",
            subject: "targets",
            condition: "restrained",
            said: "temporarily <i>Restraining</i> the target",
          }
        ],
      },
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "Additionally on a success",
        said: "<b>spend a Hope</b> to temporarily <i>Restrain</i> another adversary",
        steps: [
          {
            kind: "apply-condition",
            subject: "targets",
            condition: "restrained",
            said: "temporarily <i>Restrain</i> another adversary within Very Close range",
          }
        ],
      },
    ],
  },
  "domainCard:Voice of Dread": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        said: "Make a <b>Spellcast Roll</b> against them",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "restrained",
        when: "On a success",
        said: "making them temporarily <i>Restrained</i>",
      },
    ],
  },
  "domainCard:Wall Walk": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        said: "<b>Spend a Hope</b>",
      },
    ],
  },
  "domainCard:Wall of Hunger": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 10,
        said: "Make a <b>Spellcast Roll (10)</b>",
      },
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "On a success",
        said: "<b>spend a Hope</b>",
      },
    ],
  },
  "domainCard:Weight of the Void": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        when: "Once per rest",
        said: "make a <b>Spellcast Roll</b> against all targets within Close range",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets you succeed against",
        said: "take <b>2d8+4</b> magic damage",
      },
    ],
  },
  "domainCard:Whirlwind": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "After a successful attack against a target within Very Close range",
        said: "<b>spend a Hope</b> to use the attack against all other targets within Very Close range",
      },
    ],
  },
  "domainCard:Wild Fortress": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 13,
        said: "Spellcast Roll (13)",
      },
      {
        kind: "pay",
        amount: { hope: 2 },
        when: "On a success",
        said: "spend 2 Hope",
      },
    ],
  },
  "domainCard:Wild Surge": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "Once per long rest",
        said: "<b>mark a Stress</b>",
        steps: [
          {
            kind: "die-pool",
            resource: "Wild Surge Die",
            said: "place a <b>d6</b> on this card with the 1 value facing up",
          }
        ],
      },
      {
        kind: "die-pool",
        resource: "Wild Surge Die",
        op: "step",
        when: "After you add its value to a roll",
        said: "increase the Wild Surge Die’s value by one",
      },
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When the die’s value would exceed 6 or you take a rest",
        said: "mark an additional Stress",
        steps: [
          {
            kind: "die-pool",
            resource: "Wild Surge Die",
            op: "clear",
            said: "this form drops",
          }
        ],
      },
    ],
  },
  "domainCard:Wildfire": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 15,
        when: "Once per long rest",
        said: "Spellcast Roll (15)",
      },
      {
        kind: "roll-card-damage",
        damageName: "",
        when: "Targets who fail",
        said: "3d10+4",
      },
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "ablaze",
        when: "Targets who fail",
        said: "Ablaze",
      },
    ],
  },
  "domainCard:Words of Discord": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 13,
        said: "Spellcast Roll (13)",
      },
    ],
  },
  "domainCard:Wrangle": {
    actions: [
      {
        kind: "roll-trait",
        trait: "agility",
        said: "Make an Agility Roll",
      },
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "To move targets you succeed against",
        said: "Spend a Hope",
      },
    ],
  },
  "domainCard:Zone of Protection": {
    actions: [
      {
        kind: "roll-trait",
        trait: "spellcast",
        dc: 16,
        said: "Make a <b>Spellcast Roll (16)</b>",
      },
      {
        kind: "die-pool",
        resource: "Zone Die",
        when: "Once per long rest on a success",
        said: "place a <b>d6</b> on this card with the 1 value facing up",
      },
      {
        kind: "die-pool",
        resource: "Zone Die",
        op: "step",
        when: "When an ally in this zone takes damage",
        said: "increase the die’s value by one",
      },
    ],
  },
  "feature:Crushing": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "When you deal Severe damage",
        said: "spend a Hope",
      },
    ],
  },
  "feature:Grappling": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "On a successful attack within Melee range",
        said: "mark a Stress",
      },
    ],
  },
  "feature:Invigorating": {
    actions: [
      {
        kind: "roll-dice",
        formula: "1d4",
        when: "On a successful attack",
        said: "roll a <b>d4</b>",
      },
    ],
  },
  "feature:Quick": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you make an attack",
        said: "mark a Stress",
      },
    ],
  },
  "feature:Vigilant": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "When you are targeted by an attack",
        said: "mark a Stress",
      },
    ],
  },
  "loot:Bag of Ficklesand": {
    actions: [
      {
        kind: "apply-condition",
        subject: "targets",
        condition: "vulnerable",
        when: "on a successful Finesse Roll (10)",
        said: "blow a bit of sand into a target’s face to make them temporarily <i>Vulnerable</i>",
      },
    ],
  },
  "loot:Belt of Unity": {
    actions: [
      {
        kind: "pay",
        label: "Lead a three-PC Tag Team Roll",
        amount: { hope: 5 },
        when: "Once per session",
        said: "you can spend 5 Hope",
      },
    ],
  },
  "loot:Box of Many Goods": {
    actions: [
      {
        kind: "roll-dice",
        formula: "1d12",
        when: "Once per long rest",
        said: "roll a d12",
      },
    ],
  },
  "loot:Calming Pendant": {
    actions: [
      {
        kind: "roll-dice",
        formula: "1d6",
        when: "When you would mark your last Stress",
        said: "roll a d6",
      },
    ],
  },
  "loot:Cheater’s Coin": {
    actions: [
      {
        kind: "pay",
        label: "Set the coin",
        amount: { hope: 1 },
        said: "<b>spend a Hope</b>",
      },
    ],
  },
  "loot:Communion Relic": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "Once per rest",
        said: "spend a Hope",
      },
    ],
  },
  "loot:Crucible Frames": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "Three times per rest",
        said: "<b>spend a Hope</b>",
      },
    ],
  },
  "loot:Eclipse Coin": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Eclipse Coin (heads)", duration: "temporary", modifiers: [{"target":"attackRoll","value":1}] },
        when: "On heads",
        said: "you gain a +1 bonus to attack rolls until your next successful attack",
      },
      {
        kind: "grant-effect",
        effect: { name: "Eclipse Coin (tails)", duration: "temporary", modifiers: [{"target":"evasion","value":1}] },
        when: "On tails",
        said: "you gain +1 to your Evasion until an attack fails against you",
      },
    ],
  },
  "loot:Elusive Amulet": {
    actions: [
      {
        kind: "apply-condition",
        condition: "hidden",
        when: "Once per long rest",
        said: "become <i>Hidden</i> until you move",
      },
    ],
  },
  "loot:Furball Bag": {
    actions: [
      {
        kind: "roll-dice",
        formula: "2d20",
        when: "Once per rest",
        said: "you can produce <b>2d20</b> harmless, cat-sized fur creatures",
      },
    ],
  },
  "loot:Gadiman’s Backpack": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "Once per rest",
        said: "spend a Hope",
      },
    ],
  },
  "loot:Glamour Stone": {
    actions: [
      {
        kind: "pay",
        label: "Spend a Hope to recreate the guise",
        amount: { hope: 1 },
        said: "Spend a Hope",
      },
    ],
  },
  "loot:Glider": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "While falling",
        said: "mark a Stress",
      },
    ],
  },
  "loot:Hopekeeper Locket": {
    actions: [
      {
        kind: "pay",
        label: "Imbue the locket",
        amount: { hope: 1 },
        when: "During a long rest, if you have 6 Hope",
        said: "spend a Hope",
      },
      {
        kind: "gain",
        amount: { hope: 1 },
        when: "When you have 0 Hope, if the locket is imbued",
        said: "immediately gain a Hope",
      },
    ],
  },
  "loot:Insomniac’s Periapt": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Insomniac's Periapt", duration: "rest", modifiers: [{"target":"attackRoll","value":2},{"target":"damageRoll","value":2}] },
        when: "When you take a rest without clearing Hit Points or Stress",
        said: "you gain a +2 bonus to attack and damage rolls until your next rest",
      },
    ],
  },
  "loot:Iron Dagger Pendant": {
    actions: [
      {
        kind: "pay",
        label: "Name a creature",
        amount: { hope: 1 },
        when: "Once per long rest",
        said: "<b>spend a Hope</b>",
      },
    ],
  },
  "loot:Loaded Dice": {
    actions: [
      {
        kind: "roll-trait",
        label: "Finesse Roll to set the dice",
        trait: "finesse",
        dc: 14,
        said: "<b>Finesse Roll (14)</b>",
      },
    ],
  },
  "loot:Molepaw Mittens": {
    actions: [
      {
        kind: "pay",
        label: "Swim through earth",
        amount: { hope: 1 },
        said: "<b>Spend a Hope</b>",
      },
    ],
  },
  "loot:Nighthawker’s Ring": {
    actions: [
      {
        kind: "pay",
        label: "Spend a Hope to activate the gemstone",
        amount: { hope: 1 },
        said: "Spend a Hope",
      },
    ],
  },
  "loot:Paragon’s Chain": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 1 },
        when: "Once per long rest",
        said: "spend a Hope",
      },
    ],
  },
  "loot:Phobophage’s Circlet": {
    actions: [
      {
        kind: "roll-dice",
        formula: "1d4",
        when: "When the GM spends a Fear",
        said: "roll a <b>d4</b>",
      },
      {
        kind: "clear",
        amount: { stress: 1 },
        when: "Once per scene, on a result of 4",
        said: "you clear a Stress",
      },
    ],
  },
  "loot:Premium Bedroll": {
    actions: [
      {
        kind: "clear",
        amount: { stress: 1 },
        when: "During downtime",
        said: "you automatically clear a Stress",
      },
    ],
  },
  "loot:Ring of Silence": {
    actions: [
      {
        kind: "pay",
        label: "Activate the ring",
        amount: { hope: 1 },
        said: "Spend a Hope",
      },
    ],
  },
  "loot:Ring of Unbreakable Resolve": {
    actions: [
      {
        kind: "pay",
        amount: { hope: 4 },
        when: "Once per session, when the GM spends a Fear",
        said: "spend 4 Hope",
      },
    ],
  },
  "loot:Shard of Memory": {
    actions: [
      {
        kind: "pay",
        label: "Recall a card for 2 Hope",
        amount: { hope: 2 },
        when: "Once per long rest",
        said: "you can spend 2 Hope",
      },
    ],
  },
  "loot:Soul-Twin Circlets": {
    actions: [
      {
        kind: "pay",
        label: "Switch places",
        amount: { hope: 1 },
        said: "<b>spend a Hope</b>",
      },
    ],
  },
  "loot:Titan’s Girdle": {
    actions: [
      {
        kind: "grant-effect",
        effect: { name: "Titan's Girdle", duration: "temporary", modifiers: [{"target":"proficiency","value":1}] },
        when: "Once per scene",
        said: "gain a +1 bonus to your Proficiency for your next attack",
      },
    ],
  },
  "loot:Valorstone": {
    actions: [
      {
        kind: "roll-dice",
        formula: "1d6",
        when: "Before you mark your last Armor Slot",
        said: "roll a d6",
      },
    ],
  },
  "loot:Vial of Darksmoke Recipe": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "As a downtime move",
        said: "you can mark a Stress",
      },
    ],
  },
  "loot:Warp Pendant": {
    actions: [
      {
        kind: "pay",
        amount: { stress: 1 },
        when: "Once per rest",
        said: "mark a Stress",
      },
    ],
  },
  "loot:Woven Net": {
    actions: [
      {
        kind: "roll-trait",
        label: "Finesse Roll to trap",
        trait: "finesse",
        said: "You can make a Finesse Roll using this net",
      },
    ],
  },
  "subclass:Call of the Brave: Foundation": {
    features: {
      "Battle Ritual": [
        {
          kind: "clear",
          amount: { stress: 2 },
          when: "Once per long rest, after describing your ritual",
          said: "clear 2 Stress",
          steps: [
            {
              kind: "gain",
              amount: { hope: 2 },
              said: "gain 2 Hope",
            }
          ],
        },
      ],
      "Courage": [
        {
          kind: "gain",
          amount: { hope: 1 },
          when: "When you fail a roll with Fear",
          said: "you gain a Hope",
        },
      ],
    },
  },
  "subclass:Call of the Slayer: Foundation": {
    features: {
      "Slayer": [
        {
          kind: "die-pool",
          label: "Bank a Slayer Die",
          resource: "Slayer Dice",
          when: "On a roll with Hope",
          said: "you can place a <b>d6</b> on this card instead of gaining a Hope",
        },
        {
          kind: "die-pool",
          resource: "Slayer Dice",
          op: "spend",
          when: "When you make an attack roll or damage roll",
          said: "you can spend any number of these Slayer Dice, rolling them and adding their result to the roll",
        },
        {
          kind: "die-pool",
          resource: "Slayer Dice",
          op: "clear",
          when: "At the end of each session",
          said: "clear any unspent Slayer Dice on this card",
        },
      ],
    },
  },
  "subclass:Call of the Slayer: Specialization": {
    features: {
      "Weapon Specialist": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "When you succeed on an attack",
          said: "you can <b>spend a Hope</b> to add one of the damage dice from your secondary weapon to the damage roll",
        },
      ],
    },
  },
  "subclass:Divine Wielder: Foundation": {
    features: {
      "Spirit Weapon": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "You can <b>mark a Stress</b> to target an additional adversary within range with the same attack roll",
        },
      ],
    },
  },
  "subclass:Elemental Origin: Foundation": {
    features: {
      "Elementalist": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "Describe how your element helps an action roll you are about to make",
          said: "spend a Hope",
        },
      ],
    },
  },
  "subclass:Elemental Origin: Mastery": {
    features: {
      "Transcendence": [
        {
          kind: "grant-effect",
          label: "+4 Severe threshold",
          effect: { name: "Transcendence: Severe threshold", duration: "rest", modifiers: [{"target":"severeThreshold","value":4}] },
          when: "choose two of the following benefits to gain until your next rest",
          said: "+4 bonus to your Severe threshold",
        },
        {
          kind: "grant-effect",
          label: "+1 Proficiency",
          effect: { name: "Transcendence: Proficiency", duration: "rest", modifiers: [{"target":"proficiency","value":1}] },
          when: "choose two of the following benefits to gain until your next rest",
          said: "+1 bonus to your Proficiency",
        },
        {
          kind: "grant-effect",
          label: "+2 Evasion",
          effect: { name: "Transcendence: Evasion", duration: "rest", modifiers: [{"target":"evasion","value":2}] },
          when: "choose two of the following benefits to gain until your next rest",
          said: "+2 bonus to your Evasion",
        },
      ],
    },
  },
  "subclass:Elemental Origin: Specialization": {
    features: {
      "Natural Evasion": [
        {
          kind: "pay",
          label: "Natural Evasion",
          amount: { stress: 1 },
          when: "When an attack roll against you succeeds",
          said: "<b>mark a Stress</b> and describe how you use your element to defend you",
          steps: [
            {
              kind: "roll-dice",
              formula: "1d6",
              said: "roll a <b>d6</b> and add its result to your Evasion against the attack",
            }
          ],
        },
      ],
    },
  },
  "subclass:Executioners Guild: Mastery": {
    features: {
      "True Strike": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "Once per long rest when you fail an attack",
          said: "you can <b>spend a Hope</b> to make it a success instead",
        },
      ],
    },
  },
  "subclass:Executioners Guild: Specialization": {
    features: {
      "Death Strike": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you deal Severe damage to a creature",
          said: "mark a Stress",
        },
      ],
    },
  },
  "subclass:Hedge: Specialization": {
    features: {
      "Walk Between Worlds": [
        {
          kind: "roll-trait",
          trait: "spellcast",
          dc: 13,
          when: "During a moment of calm",
          said: "make a <b>Spellcast Roll (13)</b>",
        },
        {
          kind: "pay",
          label: "Walk Between Worlds",
          amount: { stress: 1 },
          when: "Once per rest, on a success",
          said: "<b>mark a Stress</b> to step beyond the veil of death and converse with any nearby spirits",
        },
      ],
    },
  },
  "subclass:Juggernaut: Foundation": {
    features: {
      "Overwhelm": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "When you succeed on an attack against a target",
          said: "spend a Hope",
        },
      ],
    },
  },
  "subclass:Juggernaut: Mastery": {
    features: {
      "Not Done Yet": [
        {
          kind: "gain",
          amount: { hope: 1 },
          when: "When you take Severe damage",
          said: "you can gain a Hope",
        },
        {
          kind: "clear",
          amount: { stress: 1 },
          when: "When you take Severe damage",
          said: "clear a Stress",
        },
      ],
      "Pummeljoy": [
        {
          kind: "gain",
          amount: { hope: 1 },
          when: "When you critically succeed on a Melee weapon attack",
          said: "gain an additional Hope",
          steps: [
            {
              kind: "clear",
              amount: { stress: 1 },
              said: "clear an additional Stress",
            }
          ],
        },
      ],
    },
  },
  "subclass:Juggernaut: Specialization": {
    features: {
      "Eye for an Eye": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "Once per rest when an adversary within Melee range forces you to mark any number of Hit Points",
          said: "you can <b>mark a Stress</b> to force them to mark the same number of Hit Points",
        },
      ],
    },
  },
  "subclass:Martial Artist: Mastery": {
    features: {
      "Flow State": [
        {
          kind: "pay",
          label: "Shift stance",
          amount: { stress: 1 },
          said: "<b>mark a Stress</b> instead of spending a Focus to shift into a different stance",
        },
      ],
      "Limit Breaker": [
        {
          kind: "gain",
          amount: { hope: 1 },
          when: "Once per rest, after an unbelievable feat of athletic prowess",
          said: "gain a Hope",
          steps: [
            {
              kind: "clear",
              amount: { stress: 1 },
              said: "clear a Stress",
            }
          ],
        },
      ],
    },
  },
  "subclass:Martial Artist: Specialization": {
    features: {
      "Focus Cannon": [
        {
          kind: "roll-trait",
          trait: "instinct",
          when: "Spend a Focus",
          said: "make an <b>Instinct Roll</b> against an adversary within Far range",
        },
        {
          kind: "roll-card-damage",
          damageName: "",
          when: "On a success",
          said: "deal <b>d20+3</b> magic damage using your Proficiency",
        },
      ],
    },
  },
  "subclass:Moon: Foundation": {
    features: {
      "Night’s Glamour": [
        {
          kind: "roll-trait",
          trait: "spellcast",
          dc: 13,
          said: "Make a <b>Spellcast Roll (13)</b>",
        },
        {
          kind: "pay",
          label: "Maintain Glamour",
          amount: { stress: 1 },
          said: "<b>mark a Stress</b> to maintain your <i>Glamour</i>",
        },
      ],
    },
  },
  "subclass:Moon: Mastery": {
    features: {
      "Lunar Phases": [
        {
          kind: "roll-dice",
          formula: "1d6",
          when: "At the beginning of each session",
          said: "roll a <b>d6</b> and place it on this card",
        },
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "1 — New",
          said: "<b>Spend a Hope</b> to negate Minor damage",
        },
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "Once per rest",
          said: "you can <b>spend a Hope</b> to increase the value of this die by one",
        },
      ],
    },
  },
  "subclass:Nightwalker: Foundation": {
    features: {
      "Shadow Stepper": [
        {
          kind: "pay",
          label: "Shadow step",
          amount: { stress: 1 },
          when: "When you move into an area of darkness or a shadow",
          said: "<b>mark a Stress</b> to disappear from where you are and reappear inside another shadow within Far range",
          steps: [
            {
              kind: "apply-condition",
              condition: "cloaked",
              said: "When you reappear, you are <i>Cloaked</i>.",
            }
          ],
        },
      ],
    },
  },
  "subclass:Nightwalker: Mastery": {
    features: {
      "Vanishing Act": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "<b>Mark a Stress</b> to become <i>Cloaked</i> at any time",
          steps: [
            {
              kind: "apply-condition",
              condition: "cloaked",
              said: "<b>Mark a Stress</b> to become <i>Cloaked</i> at any time",
            }
          ],
        },
      ],
    },
  },
  "subclass:Nightwalker: Specialization": {
    features: {
      "Dark Cloud": [
        {
          kind: "roll-trait",
          trait: "spellcast",
          dc: 15,
          said: "Make a <b>Spellcast Roll (15)</b>",
        },
      ],
    },
  },
  "subclass:Pact of the Endless: Mastery": {
    features: {
      "Draining Bane": [
        {
          kind: "apply-condition",
          subject: "targets",
          condition: "drained",
          when: "spend a Favor",
          said: "you can spend a Favor to <i>Drain</i> them",
        },
        {
          kind: "clear",
          amount: { stress: 1 },
          when: "When you Drain them",
          said: "you can clear a Stress",
        },
      ],
    },
  },
  "subclass:Poisoners Guild: Foundation": {
    features: {
      "Toxic Concoctions": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "<b>Mark a Stress</b> to place <b>1d4+1</b> tokens on this card",
        },
        {
          kind: "apply-condition",
          label: "Ghost Petal",
          subject: "targets",
          condition: "vulnerable",
          when: "spend a token to afflict the target with a poison",
          said: "The target becomes temporarily <i>Vulnerable</i>.",
        },
      ],
    },
  },
  "subclass:Poisoners Guild: Specialization": {
    features: {
      "Poison Compendium": [
        {
          kind: "apply-condition",
          label: "Gorgon Root: Restrained",
          subject: "targets",
          condition: "restrained",
          when: "Gorgon Root",
          said: "The target becomes temporarily",
        },
      ],
    },
  },
  "subclass:Primal Origin: Foundation": {
    features: {
      "Manipulate Magic": [
        {
          kind: "pay",
          label: "Manipulate Magic",
          amount: { stress: 1 },
          when: "After you cast a spell or make an attack using a weapon that deals magic damage",
          said: "<b>mark a Stress</b> to do one of the following",
        },
      ],
    },
  },
  "subclass:Primal Origin: Mastery": {
    features: {
      "Arcane Charge": [
        {
          kind: "apply-condition",
          label: "Become Charged",
          condition: "charged",
          when: "When you take magic damage",
          said: "When you take magic damage, you become",
        },
        {
          kind: "pay",
          label: "Become Charged (2 Hope)",
          amount: { hope: 2 },
          said: "spend 2 Hope",
          steps: [
            {
              kind: "apply-condition",
              condition: "charged",
              said: "to become",
            }
          ],
        },
      ],
    },
  },
  "subclass:School of Knowledge: Foundation": {
    features: {
      "Adept": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you Utilize an Experience, instead of spending a Hope",
          said: "mark a Stress",
        },
      ],
    },
  },
  "subclass:School of Knowledge: Mastery": {
    features: {
      "Honed Expertise": [
        {
          kind: "roll-dice",
          label: "Honed Expertise",
          formula: "1d6",
          when: "When you use an Experience",
          said: "roll a <b>d6</b>",
        },
      ],
    },
  },
  "subclass:School of War: Foundation": {
    features: {
      "Face Your Fear": [
        {
          kind: "roll-card-damage",
          damageName: "",
          when: "When you succeed with Fear on an attack roll",
          said: "you deal an extra <b>1d10</b> magic damage",
        },
      ],
    },
  },
  "subclass:School of War: Mastery": {
    features: {
      "Thrive in Chaos": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you succeed on an attack, after rolling damage",
          said: "<b>mark a Stress</b> after rolling damage to force the target to mark an additional Hit Point",
        },
      ],
    },
  },
  "subclass:Stalwart: Foundation": {
    features: {
      "Iron Will": [
        {
          kind: "pay",
          amount: { armorSlots: 1 },
          when: "When you take physical damage",
          said: "mark an additional Armor Slot",
        },
      ],
    },
  },
  "subclass:Stalwart: Mastery": {
    features: {
      "Loyal Protector": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When an ally within Close range has 2 or fewer Hit Points and would take damage",
          said: "<b>mark a Stress</b> to sprint to their side and take the damage instead",
        },
      ],
    },
  },
  "subclass:Stalwart: Specialization": {
    features: {
      "Partners in Arms": [
        {
          kind: "pay",
          amount: { armorSlots: 1 },
          when: "When an ally within Very Close range takes damage",
          said: "you can <b>mark an Armor Slot</b> to reduce the severity by one threshold",
        },
      ],
    },
  },
  "subclass:Troubadour: Foundation": {
    features: {
      "Gifted Performer": [
        {
          kind: "clear",
          label: "Relaxing Song",
          amount: { hitPoints: 1 },
          said: "You and all allies within Close range clear a Hit Point.",
        },
        {
          kind: "apply-condition",
          label: "Epic Song",
          subject: "targets",
          condition: "vulnerable",
          said: "Make a target within Close range temporarily <i>Vulnerable</i>.",
        },
        {
          kind: "gain",
          label: "Heartbreaking Song",
          amount: { hope: 1 },
          said: "You and all allies within Close range gain a Hope.",
        },
      ],
    },
  },
  "subclass:Vengeance: Foundation": {
    features: {
      "Revenge": [
        {
          kind: "pay",
          amount: { stress: 2 },
          when: "When an adversary within Melee range succeeds on an attack against you",
          said: "<b>mark 2 Stress</b> to force the attacker to mark a Hit Point",
        },
      ],
    },
  },
  "subclass:Vengeance: Mastery": {
    features: {
      "Nemesis": [
        {
          kind: "pay",
          label: "Prioritize an adversary",
          amount: { hope: 2 },
          said: "Spend 2 Hope",
        },
      ],
    },
  },
  "subclass:Warden of Renewal: Foundation": {
    features: {
      "Regeneration": [
        {
          kind: "pay",
          label: "Touch a creature (3 Hope)",
          amount: { hope: 3 },
          said: "spend 3 Hope",
          steps: [
            {
              kind: "roll-dice",
              label: "Hit Points that creature clears",
              formula: "1d4",
              said: "1d4",
            }
          ],
        },
      ],
    },
  },
  "subclass:Warden of Renewal: Mastery": {
    features: {
      "Defender": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "In Beastform, when an ally within Close range marks 2 or more Hit Points",
          said: "mark a Stress",
        },
      ],
    },
  },
  "subclass:Warden of Renewal: Specialization": {
    features: {
      "Warden’s Protection": [
        {
          kind: "pay",
          amount: { hope: 2 },
          when: "Once per long rest",
          said: "<b>spend 2 Hope</b> to clear 2 Hit Points",
        },
      ],
    },
  },
  "subclass:Warden of the Elements: Foundation": {
    features: {
      "Elemental Incarnation": [
        {
          kind: "pay",
          label: "Channel an element",
          amount: { stress: 1 },
          said: "<b>Mark a Stress</b> to <i>Channel</i> one of the following elements",
        },
        {
          kind: "roll-card-damage",
          label: "Fire retaliation",
          damageName: "Fire",
          when: "Channeling Fire, when an adversary within Melee range deals damage to you",
          said: "they take <b>1d10</b> magic damage",
        },
      ],
    },
  },
  "subclass:Warden of the Elements: Mastery": {
    features: {
      "Elemental Dominion": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "Water, while Channeling, when an attack against you succeeds",
          said: "mark a Stress",
          steps: [
            {
              kind: "apply-condition",
              subject: "targets",
              condition: "vulnerable",
              said: "make the attacker temporarily",
            }
          ],
        },
      ],
    },
  },
  "subclass:Warden of the Elements: Specialization": {
    features: {
      "Elemental Aura": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "Water: When an adversary deals damage to you",
          said: "you can <b>mark a Stress</b> to move them anywhere within Very Close range",
        },
        {
          kind: "roll-dice",
          label: "Reduce damage 1d8",
          formula: "1d8",
          when: "Air: when you or an ally takes damage from an attack beyond Melee range",
          said: "reduce the damage by <b>1d8</b>",
        },
      ],
    },
  },
  "subclass:Wayfinder: Foundation": {
    features: {
      "Ruthless Predator": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you make a damage roll",
          said: "you can <b>mark a Stress</b> to gain a +1 bonus to your Proficiency",
        },
      ],
    },
  },
  "subclass:Wayfinder: Mastery": {
    features: {
      "Apex Predator": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "Before you make an attack roll against your Focus",
          said: "you can <b>spend a Hope</b>",
        },
      ],
    },
  },
  "subclass:Winged Sentinel: Foundation": {
    features: {
      "Wings of Light": [
        {
          kind: "pay",
          label: "Carry a creature",
          amount: { stress: 1 },
          when: "While flying",
          said: "<b>Mark a Stress</b> to pick up and carry another willing creature approximately your size or smaller.",
        },
        {
          kind: "pay",
          label: "Empowered strike",
          amount: { hope: 1 },
          when: "While flying, on a successful attack",
          said: "<b>Spend a Hope</b> to deal an extra <b>1d8</b> damage on a successful attack.",
        },
      ],
    },
  },
  "subclass:Wordsmith: Foundation": {
    features: {
      "Heart of a Poet": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "After an action roll to impress, persuade, or offend someone",
          said: "spend a Hope",
          steps: [
            {
              kind: "roll-dice",
              label: "Add a d4 to the roll",
              formula: "1d4",
              said: "d4",
            }
          ],
        },
      ],
    },
  },
  "transformation:Demigod": {
    features: {
      "Weight of Divinity": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you fail a roll",
          said: "mark a Stress",
        },
        {
          kind: "gain",
          amount: { fear: 1 },
          when: "When you fail a roll and do not mark the Stress",
          said: "the GM gains a Fear",
        },
      ],
    },
  },
  "transformation:Ghost": {
    features: {
      "Ephemeral": [
        {
          kind: "pay",
          amount: { stress: 2 },
          said: "mark 2 Stress",
        },
      ],
    },
  },
  "transformation:Vampire": {
    features: {
      "Fangs": [
        {
          kind: "roll-card-damage",
          damageName: "",
          when: "On a success",
          said: "physical damage using your Proficiency",
        },
      ],
      "Feed": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a successful Fangs attack against a creature that can bleed",
          said: "mark a Stress",
        },
      ],
    },
  },
  "transformation:Werewolf": {
    features: {
      "Wolf Form": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you mark 1 or more Hit Points",
          said: "mark a Stress",
        },
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you roll with Hope while in Wolf Form",
          said: "you must mark a Stress",
        },
      ],
    },
  },
  "weapon:Adder’s Fang": {
    features: {
      "Venomous": [
        {
          kind: "apply-condition",
          subject: "targets",
          condition: "vulnerable",
          when: "When you deal Major or greater damage with this weapon",
          said: "the target becomes temporarily Vulnerable",
        },
      ],
    },
  },
  "weapon:Advanced Arcane Rifle": {
    features: {
      "Aimed": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "You can mark a Stress to ignore this penalty",
        },
      ],
    },
  },
  "weapon:Advanced Enchanted Chakram": {
    features: {
      "Ricochet": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "you can mark a Stress to target another creature within Very Close range of the first target",
        },
      ],
    },
  },
  "weapon:Advanced Hallowed Shield": {
    features: {
      "Resonant": [
        {
          kind: "gain",
          amount: { hope: 1 },
          when: "When you critically succeed on a primary weapon attack",
          said: "you gain an additional Hope",
        },
      ],
    },
  },
  "weapon:Advanced Hatchet": {
    features: {
      "Follow-Up": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a successful attack with your primary weapon within Melee range",
          said: "you can mark a Stress to gain a +1 bonus to your Proficiency for this attack",
        },
      ],
    },
  },
  "weapon:Advanced Katana": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you make an attack, to target another creature within range",
          said: "you can mark a Stress",
        },
      ],
    },
  },
  "weapon:Advanced Lasso": {
    features: {
      "Roped": [
        {
          kind: "apply-condition",
          subject: "targets",
          condition: "roped",
          when: "On a successful attack",
          said: "you can temporarily Rope the target instead of dealing damage",
        },
      ],
    },
  },
  "weapon:Advanced Light-Frame Wheelchair": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you make an attack, to target another creature within range",
          said: "you can mark a Stress",
        },
      ],
    },
  },
  "weapon:Advanced Rapier": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "you can mark a Stress to target another creature within range",
        },
      ],
    },
  },
  "weapon:Advanced Repeating Crossbow": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you make an attack, to target another creature within range",
          said: "you can mark a Stress",
        },
      ],
    },
  },
  "weapon:Advanced Revolver": {
    features: {
      "Six Shot": [
        {
          kind: "pay",
          label: "Mark a Stress: regain Ammo",
          amount: { stress: 1 },
          said: "You can mark a Stress to regain spent Ammo tokens",
        },
      ],
    },
  },
  "weapon:Advanced Rifle": {
    features: {
      "Sightline": [
        {
          kind: "pay",
          amount: { hope: 2 },
          said: "Spend 2 Hope to gain advantage on an attack roll",
        },
      ],
    },
  },
  "weapon:Advanced Runelock Pistol": {
    features: {
      "Reloading": [
        {
          kind: "roll-dice",
          formula: "1d6",
          said: "roll a d6",
        },
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a result of 1, to reload",
          said: "you must mark a Stress to reload this weapon",
        },
      ],
    },
  },
  "weapon:Advanced Small Revolver": {
    features: {
      "Quick Shot": [
        {
          kind: "pay",
          amount: { hope: 2 },
          said: "Spend 2 Hope to gain a +4 bonus to primary weapon damage",
        },
      ],
    },
  },
  "weapon:Advanced Whip": {
    features: {
      "Startling": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress to crack the whip",
        },
      ],
    },
  },
  "weapon:Arcane Rifle": {
    features: {
      "Aimed": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "You can mark a Stress to ignore this penalty",
        },
      ],
    },
  },
  "weapon:Arquebus": {
    features: {
      "Reloading": [
        {
          kind: "roll-dice",
          formula: "1d6",
          said: "roll a d6",
        },
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a result of 1",
          said: "you must mark a Stress to reload this weapon",
        },
      ],
    },
  },
  "weapon:Axe of Fortunis": {
    features: {
      "Lucky": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a failed attack",
          said: "you can mark a Stress to reroll your attack",
        },
      ],
    },
  },
  "weapon:Bec de Corbin": {
    features: {
      "Devastating": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "you can mark a Stress to use a d20 as your damage die",
        },
      ],
    },
  },
  "weapon:Black Powder Revolver": {
    features: {
      "Reloading": [
        {
          kind: "roll-dice",
          formula: "1d6",
          said: "roll a d6",
        },
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a result of 1",
          said: "you must mark a Stress to reload this weapon",
        },
      ],
    },
  },
  "weapon:Bladed Whip": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "you can mark a Stress to target another creature within range",
        },
      ],
    },
  },
  "weapon:Blessed Anlace": {
    features: {
      "Healing": [
        {
          kind: "clear",
          amount: { hitPoints: 1 },
          when: "During downtime",
          said: "automatically clear a Hit Point",
        },
      ],
    },
  },
  "weapon:Blitz Hammer": {
    features: {
      "Accelerator": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "Once per scene",
          said: "mark a Stress to move to Far range",
        },
      ],
    },
  },
  "weapon:Blunderbuss": {
    features: {
      "Reloading": [
        {
          kind: "roll-dice",
          formula: "1d6",
          said: "roll a d6",
        },
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a result of 1",
          said: "you must mark a Stress to reload this weapon",
        },
      ],
    },
  },
  "weapon:Buckler": {
    features: {
      "Deflecting": [
        {
          kind: "pay",
          amount: { armorSlots: 1 },
          said: "you can mark an Armor Slot to gain a bonus to your Evasion equal to your available Armor Score",
        },
      ],
    },
  },
  "weapon:Chained Scythe": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you make an attack, to target another creature within range",
          said: "you can mark a Stress",
        },
      ],
    },
  },
  "weapon:Clockwork Crossbow": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you make an attack, to target another creature within range",
          said: "you can mark a Stress",
        },
      ],
    },
  },
  "weapon:Dual-Ended Sword": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "you can mark a Stress to target another creature within range",
        },
      ],
    },
  },
  "weapon:Echo Blade": {
    features: {
      "Doubled Up": [
        {
          kind: "roll-damage",
          when: "When you succeed on an attack with your primary weapon",
          said: "you can deal damage to another target within Melee range",
        },
      ],
    },
  },
  "weapon:Eldritch Vambrace": {
    features: {
      "Deflecting": [
        {
          kind: "pay",
          amount: { armorSlots: 1 },
          said: "you can mark an Armor Slot to gain a bonus to your Evasion equal to your Armor Score",
        },
      ],
    },
  },
  "weapon:Enchanted Chakram": {
    features: {
      "Ricochet": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "you can mark a Stress to target another creature within Very Close range of the first target",
        },
      ],
    },
  },
  "weapon:Enchanted Lute": {
    features: {
      "Invigorating": [
        {
          kind: "roll-dice",
          formula: "1d4",
          when: "On a successful attack",
          said: "roll a d4",
        },
        {
          kind: "clear",
          amount: { stress: 1 },
          when: "On a result of 4",
          said: "clear a Stress",
        },
      ],
    },
  },
  "weapon:Ethereal Zweihänder": {
    features: {
      "Ethereal": [
        {
          kind: "pay",
          label: "Conjure this weapon",
          amount: { stress: 1 },
          said: "You must mark a Stress to conjure this weapon",
        },
      ],
    },
  },
  "weapon:Festival Whip": {
    features: {
      "Startling": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress to crack the whip",
        },
      ],
    },
  },
  "weapon:Gravity Arbalest": {
    features: {
      "Magnetic": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "When you make an attack with this weapon",
          said: "you can spend a Hope to force all adversaries within Very Close range of the target to make a Reaction Roll (16)",
        },
      ],
    },
  },
  "weapon:Hallowed Shield": {
    features: {
      "Resonant": [
        {
          kind: "gain",
          amount: { hope: 1 },
          when: "When you critically succeed on a primary weapon attack",
          said: "you gain an additional Hope",
        },
      ],
    },
  },
  "weapon:Hammer of Wrath": {
    features: {
      "Devastating": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "you can mark a Stress to use a d20 as your damage die",
        },
      ],
    },
  },
  "weapon:Hand Cannon": {
    features: {
      "Reloading": [
        {
          kind: "roll-dice",
          formula: "1d6",
          said: "roll a d6",
        },
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a result of 1",
          said: "you must mark a Stress to reload this weapon",
        },
      ],
    },
  },
  "weapon:Hatchet": {
    features: {
      "Follow-Up": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a successful attack with your primary weapon within Melee range",
          said: "you can mark a Stress to gain a +1 bonus to your Proficiency for this attack",
        },
      ],
    },
  },
  "weapon:Ilmari’s Rifle": {
    features: {
      "Reloading": [
        {
          kind: "roll-dice",
          formula: "1d6",
          said: "roll a d6",
        },
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a result of 1",
          said: "you must mark a Stress to reload this weapon",
        },
      ],
    },
  },
  "weapon:Impact Gauntlet": {
    features: {
      "Concussive": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "On a successful attack",
          said: "you can spend a Hope to knock the target back to Far range",
        },
      ],
    },
  },
  "weapon:Improved Arcane Rifle": {
    features: {
      "Aimed": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "You can mark a Stress to ignore this penalty",
        },
      ],
    },
  },
  "weapon:Improved Enchanted Chakram": {
    features: {
      "Ricochet": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "you can mark a Stress to target another creature within Very Close range of the first target",
        },
      ],
    },
  },
  "weapon:Improved Hallowed Shield": {
    features: {
      "Resonant": [
        {
          kind: "gain",
          amount: { hope: 1 },
          when: "When you critically succeed on a primary weapon attack",
          said: "you gain an additional Hope",
        },
      ],
    },
  },
  "weapon:Improved Hatchet": {
    features: {
      "Follow-Up": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a successful attack with your primary weapon within Melee range",
          said: "you can mark a Stress to gain a +1 bonus to your Proficiency for this attack",
        },
      ],
    },
  },
  "weapon:Improved Katana": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you make an attack, to target another creature within range",
          said: "you can mark a Stress",
        },
      ],
    },
  },
  "weapon:Improved Lasso": {
    features: {
      "Roped": [
        {
          kind: "apply-condition",
          subject: "targets",
          condition: "roped",
          when: "On a successful attack",
          said: "you can temporarily Rope the target instead of dealing damage",
        },
      ],
    },
  },
  "weapon:Improved Light-Frame Wheelchair": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "you can mark a Stress to target another creature within range",
        },
      ],
    },
  },
  "weapon:Improved Rapier": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "you can mark a Stress to target another creature within range",
        },
      ],
    },
  },
  "weapon:Improved Repeating Crossbow": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you make an attack, to target another creature within range",
          said: "you can mark a Stress",
        },
      ],
    },
  },
  "weapon:Improved Revolver": {
    features: {
      "Six Shot": [
        {
          kind: "pay",
          label: "Mark a Stress: regain Ammo",
          amount: { stress: 1 },
          said: "You can mark a Stress to regain spent Ammo tokens",
        },
      ],
    },
  },
  "weapon:Improved Rifle": {
    features: {
      "Sightline": [
        {
          kind: "pay",
          amount: { hope: 2 },
          said: "Spend 2 Hope to gain advantage on an attack roll",
        },
      ],
    },
  },
  "weapon:Improved Runelock Pistol": {
    features: {
      "Reloading": [
        {
          kind: "roll-dice",
          formula: "1d6",
          said: "roll a d6",
        },
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a result of 1",
          said: "you must mark a Stress to reload this weapon",
        },
      ],
    },
  },
  "weapon:Improved Small Revolver": {
    features: {
      "Quick Shot": [
        {
          kind: "pay",
          amount: { hope: 2 },
          said: "Spend 2 Hope to gain a +4 bonus to primary weapon damage",
        },
      ],
    },
  },
  "weapon:Improved Whip": {
    features: {
      "Startling": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress to crack the whip",
        },
      ],
    },
  },
  "weapon:Katana": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you make an attack, to target another creature within range",
          said: "you can mark a Stress",
        },
      ],
    },
  },
  "weapon:Lasso": {
    features: {
      "Roped": [
        {
          kind: "apply-condition",
          subject: "targets",
          condition: "roped",
          when: "On a successful attack",
          said: "you can temporarily Rope the target instead of dealing damage",
        },
      ],
    },
  },
  "weapon:Legendary Arcane Rifle": {
    features: {
      "Aimed": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "You can mark a Stress to ignore this penalty",
        },
      ],
    },
  },
  "weapon:Legendary Enchanted Chakram": {
    features: {
      "Ricochet": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "you can mark a Stress to target another creature within Very Close range of the first target",
        },
      ],
    },
  },
  "weapon:Legendary Hallowed Shield": {
    features: {
      "Resonant": [
        {
          kind: "gain",
          amount: { hope: 1 },
          when: "When you critically succeed on a primary weapon attack",
          said: "you gain an additional Hope",
        },
      ],
    },
  },
  "weapon:Legendary Hatchet": {
    features: {
      "Follow-Up": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a successful attack with your primary weapon within Melee range",
          said: "you can mark a Stress to gain a +1 bonus to your Proficiency for this attack",
        },
      ],
    },
  },
  "weapon:Legendary Katana": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you make an attack, to target another creature within range",
          said: "you can mark a Stress",
        },
      ],
    },
  },
  "weapon:Legendary Lasso": {
    features: {
      "Roped": [
        {
          kind: "apply-condition",
          subject: "targets",
          condition: "roped",
          when: "On a successful attack",
          said: "you can temporarily Rope the target instead of dealing damage",
        },
      ],
    },
  },
  "weapon:Legendary Light-Frame Wheelchair": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you make an attack, to target another creature within range",
          said: "you can mark a Stress",
        },
      ],
    },
  },
  "weapon:Legendary Rapier": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "you can mark a Stress to target another creature within range",
        },
      ],
    },
  },
  "weapon:Legendary Repeating Crossbow": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you make an attack, to target another creature within range",
          said: "you can mark a Stress",
        },
      ],
    },
  },
  "weapon:Legendary Revolver": {
    features: {
      "Six Shot": [
        {
          kind: "pay",
          label: "Mark a Stress: regain Ammo",
          amount: { stress: 1 },
          said: "You can mark a Stress to regain spent Ammo tokens",
        },
      ],
    },
  },
  "weapon:Legendary Rifle": {
    features: {
      "Sightline": [
        {
          kind: "pay",
          amount: { hope: 2 },
          said: "Spend 2 Hope to gain advantage on an attack roll",
        },
      ],
    },
  },
  "weapon:Legendary Runelock Pistol": {
    features: {
      "Reloading": [
        {
          kind: "roll-dice",
          formula: "1d6",
          said: "roll a d6",
        },
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a result of 1, to reload",
          said: "you must mark a Stress to reload this weapon",
        },
      ],
    },
  },
  "weapon:Legendary Small Revolver": {
    features: {
      "Quick Shot": [
        {
          kind: "pay",
          amount: { hope: 2 },
          said: "Spend 2 Hope to gain a +4 bonus to primary weapon damage",
        },
      ],
    },
  },
  "weapon:Legendary Whip": {
    features: {
      "Startling": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress to crack the whip",
        },
      ],
    },
  },
  "weapon:Light-Frame Wheelchair": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "you can mark a Stress to target another creature within range",
        },
      ],
    },
  },
  "weapon:Magus Revolver": {
    features: {
      "Reloading": [
        {
          kind: "roll-dice",
          formula: "1d6",
          said: "roll a d6",
        },
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a result of 1",
          said: "you must mark a Stress to reload this weapon",
        },
      ],
    },
  },
  "weapon:Powered Gauntlet": {
    features: {
      "Charged": [
        {
          kind: "pay",
          label: "Mark a Stress: +1 Proficiency",
          amount: { stress: 1 },
          said: "Mark a Stress to gain a +1 bonus to your Proficiency on a primary weapon attack",
        },
      ],
    },
  },
  "weapon:Rapier": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "you can mark a Stress to target another creature within range",
        },
      ],
    },
  },
  "weapon:Razor Wire": {
    features: {
      "Entangling": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "On a successful attack with your primary weapon against a target within Very Close range",
          said: "you can spend a Hope to make the target temporarily Vulnerable",
          steps: [
            {
              kind: "apply-condition",
              subject: "targets",
              condition: "vulnerable",
              said: "make the target temporarily Vulnerable",
            }
          ],
        },
      ],
    },
  },
  "weapon:Repeating Crossbow": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you make an attack, to target another creature within range",
          said: "you can mark a Stress",
        },
      ],
    },
  },
  "weapon:Revolver": {
    features: {
      "Six Shot": [
        {
          kind: "pay",
          label: "Mark a Stress: regain Ammo",
          amount: { stress: 1 },
          said: "You can mark a Stress to regain spent Ammo tokens",
        },
      ],
    },
  },
  "weapon:Ricochet Axes": {
    features: {
      "Bouncing": [
        {
          kind: "pay",
          label: "Mark a Stress: hit another target",
          amount: { stress: 1 },
          said: "Mark 1 or more Stress",
        },
      ],
    },
  },
  "weapon:Rifle": {
    features: {
      "Sightline": [
        {
          kind: "pay",
          amount: { hope: 2 },
          said: "Spend 2 Hope to gain advantage on an attack roll",
        },
      ],
    },
  },
  "weapon:Rime Scepter": {
    features: {
      "Freezing": [
        {
          kind: "apply-condition",
          subject: "targets",
          condition: "restrained",
          when: "When an attack from this weapon causes a target to mark 2 or more HP",
          said: "they become temporarily Restrained",
        },
      ],
    },
  },
  "weapon:Rocket Maul": {
    features: {
      "Concussive": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "On a successful attack",
          said: "you can spend a Hope to knock the target back to Far range",
        },
      ],
    },
  },
  "weapon:Runelock Pistol": {
    features: {
      "Reloading": [
        {
          kind: "roll-dice",
          formula: "1d6",
          said: "roll a d6",
        },
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a result of 1",
          said: "you must mark a Stress to reload this weapon",
        },
      ],
    },
  },
  "weapon:Scepter of Elias": {
    features: {
      "Invigorating": [
        {
          kind: "roll-dice",
          formula: "1d4",
          when: "On a successful attack",
          said: "roll a d4",
        },
        {
          kind: "clear",
          amount: { stress: 1 },
          when: "On a result of 4",
          said: "clear a Stress",
        },
      ],
    },
  },
  "weapon:Sickle": {
    features: {
      "Quick": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "When you make an attack, to target another creature within range",
          said: "you can mark a Stress",
        },
      ],
    },
  },
  "weapon:Singing Sword": {
    features: {
      "Bolstering": [
        {
          kind: "gain",
          amount: { hope: 1 },
          when: "When you critically succeed on an attack — every PC within Close range gains a Hope, one press each",
          said: "all PCs within Close range gain a Hope",
        },
      ],
    },
  },
  "weapon:Siphoning Gauntlets": {
    features: {
      "Lifestealing": [
        {
          kind: "roll-dice",
          formula: "1d6",
          when: "On a successful attack",
          said: "roll a d6",
        },
        {
          kind: "clear",
          amount: { hitPoints: 1 },
          when: "On a result of 6",
          said: "clear a Hit Point",
        },
        {
          kind: "clear",
          amount: { stress: 1 },
          when: "On a result of 6 (instead of the Hit Point)",
          said: "clear a Stress",
        },
      ],
    },
  },
  "weapon:Small Revolver": {
    features: {
      "Quick Shot": [
        {
          kind: "pay",
          amount: { hope: 2 },
          said: "Spend 2 Hope to gain a +4 bonus to primary weapon damage",
        },
      ],
    },
  },
  "weapon:Soldier’s Pike": {
    features: {
      "Braced": [
        {
          kind: "pay",
          amount: { stress: 2 },
          said: "you can mark 2 Stress to force them to mark a Hit Point",
        },
      ],
    },
  },
  "weapon:Soul Chain": {
    features: {
      "Draining": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "On a successful attack",
          said: "you can spend a Hope to force the target to mark a Stress",
        },
        {
          kind: "clear",
          amount: { stress: 1 },
          when: "If the target marked the Stress",
          said: "you clear a Stress",
        },
      ],
    },
  },
  "weapon:Splintershaft Bow": {
    features: {
      "Volleyed": [
        {
          kind: "pay",
          label: "Spend a Hope: volley",
          amount: { hope: 1 },
          said: "Spend a Hope to target a group of creatures within range",
        },
      ],
    },
  },
  "weapon:Staff of Augma": {
    features: {
      "Catalytic": [
        {
          kind: "pay",
          amount: { stress: 1 },
          when: "On a successful attack",
          said: "you can mark a Stress to give an ally within Close range a +3 bonus",
        },
      ],
    },
  },
  "weapon:Swinging Ropeblade": {
    features: {
      "Grappling": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "On a successful attack",
          said: "you can spend a Hope to Restrain the target or pull them into Melee range with you",
        },
      ],
    },
  },
  "weapon:Void Needle": {
    features: {
      "Inverted": [
        {
          kind: "gain",
          amount: { hope: 1 },
          when: "When you roll a weapon attack with Fear",
          said: "you gain a Hope",
        },
      ],
    },
  },
  "weapon:Vorpal Shard": {
    features: {
      "Targeted": [
        {
          kind: "pay",
          amount: { hope: 1 },
          when: "When you fail a weapon attack",
          said: "you can spend a Hope to succeed on your next weapon attack",
        },
      ],
    },
  },
  "weapon:Wand of Enthrallment": {
    features: {
      "Persuasive": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "you can mark a Stress to gain a +2 bonus to the result",
        },
      ],
    },
  },
  "weapon:Whip": {
    features: {
      "Startling": [
        {
          kind: "pay",
          amount: { stress: 1 },
          said: "Mark a Stress to crack the whip",
        },
      ],
    },
  },
};

/* ── declined ────────────────────────────────────────────────────────────
   One entry per phrase a reader looked at and judged not to be a press by the
   holder of this card, with the reason. */

export const DECLINED = {
  "ancestry:Aetheris": [
    "\"instead of marking an Armor Slot\" is the cost this feature lets you avoid, not a cost it charges.",
    "\"you can change it into a roll with Hope instead\" rewrites an ally's completed duality roll; it is not a Hope gain and no action kind covers it",
  ],
  "ancestry:Clank": [
    "\"gain a permanent +1 bonus to it\" is a permanent character-creation modifier applied to an Experience the card cannot name, not a pressable action",
  ],
  "ancestry:Drakona": [
    "\"to mark 1 fewer Hit Points\" reads like a Hit Point action and is damage reduction — it lowers what the hit costs rather than clearing anything.",
  ],
  "ancestry:Dwarf": [
    "\"instead of marking a Hit Point\" is the cost this feature avoids, not a clear — nothing is given back",
  ],
  "ancestry:Earthkin": [
    "\"Gain a permanent +1 bonus to your Armor Score and damage thresholds at character creation\" is a permanent passive modifier, explicitly not timed, so it is not a `grant-effect`.",
  ],
  "ancestry:Emberkin": [
    "\"you gain a 1d6 bonus to damage rolls with that weapon\" has a printed duration (\"until the end of the scene\") but its value is a die rather than a number, and `modifiers` carries no dice — writing a fixed number would be inventing one.",
    "\"While the weapon is ablaze\" describes the weapon being on fire, not the registered Ablaze condition on a creature, so no `apply-condition`.",
  ],
  "ancestry:Faerie": [
    "\"a +2 bonus to your Evasion against that attack\" lasts for a single attack, which is not one of the printed durations, so it is not a `grant-effect`.",
    "\"reroll the Duality Dice\" is not covered by any action kind — rerolling a completed roll is the posted plate's own gesture, not a press on this card",
  ],
  "ancestry:Faun": [
    "\"dealing an extra <b>2d6</b> damage\" is additive to the weapon's damage roll; this document carries no cardDamage expression, so there is nothing for roll-card-damage to name and roll-dice is explicitly not for damage",
  ],
  "ancestry:Firbolg": [
    "\"When you would mark a Stress\" is the trigger for the d6, not a price the holder pays — nothing is charged by pressing this.",
    "\"When you succeed on an Agility Roll\" names a roll made elsewhere as a precondition; it is not an imperative to roll and gets no roll-trait button",
  ],
  "ancestry:Galapa": [
    "\"you have resistance to physical damage, you have disadvantage on action rolls, and you can’t move\" is the state the shell puts you in, lasting \"while in your shell\" — not one of the printed durations, so no `grant-effect`.",
    "\"Gain a bonus to your damage thresholds equal to your Proficiency\" is a passive modifier with no printed duration and nothing to press",
  ],
  "ancestry:Giant": [
    "\"Gain an additional Hit Point slot at character creation\" is a permanent change to the track's capacity made once at creation, not a `gain` of Hope or a `clear` of a mark.",
  ],
  "ancestry:Gnome": [
    "\"Once per scene, you can teleport to another point you can see within Far range\" costs nothing the vocabulary can spend, and the document carries no once-per-scene counter to move.",
    "\"reroll your Hope Die\" is not covered by any action kind — the die is already thrown",
    "\"When you make a <b>Finesse Roll</b>\" is a precondition naming a roll made elsewhere, not an imperative to roll",
  ],
  "ancestry:Goblin": [
    "\"force an adversary to reroll an attack\" is the adversary's roll, so there is nothing here for the holder to press.",
    "\"You ignore disadvantage on Agility Rolls\" describes a passive; there is no imperative to roll, so no roll-trait button",
  ],
  "ancestry:Halfling": [
    "\"everyone in your party gains a Hope\" is a gain for the whole table, and `gain` has no way to say who receives it — a button here would quietly hand one Hope to the Halfling alone.",
    "\"When you roll a 1 on your Hope Die, you can reroll it\" rerolls a die already thrown; no action kind covers a reroll",
  ],
  "ancestry:Human": [
    "\"to reroll\" is the duality roll being taken again, which the chat plate's own die control already does; there is no die on this card to roll.",
    "\"Gain an additional Stress slot at character creation\" is a permanent modifier to the Stress track, not a press",
  ],
  "ancestry:Katari": [
    "\"reroll your Hope Die\" is not covered by any action kind — the die is already thrown",
    "\"When you make an Agility Roll\" is a precondition naming a roll made elsewhere, not an imperative to roll",
  ],
  "ancestry:Orc": [
    "\"dealing an extra <b>1d6</b> damage\" is additive to the weapon's damage roll; this document carries no cardDamage expression to name",
  ],
  "ancestry:Simiah": [
    "\"You have advantage on Agility Rolls that involve balancing and climbing\" describes a bonus to rolls made elsewhere; it is not an imperative asking for a roll, so no `roll-trait`.",
    "\"Gain a permanent +1 bonus to your Evasion at character creation\" is a permanent modifier, not a press",
  ],
  "ancestry:Skykin": [
    "\"a +1 bonus to Evasion until you take Severe damage or you use this feature again\" has a duration that is none of shortRest/longRest/rest/scene/session/temporary, and it may land on an ally rather than on the holder, which grant-effect has no way to say",
  ],
  "ancestry:Tidekin": [
    "\"to clear a Hit Point on yourself or an ally within Very Close range\" chooses its recipient; clear cannot name an ally, so authoring it would give the holder a Hit Point back that an ally was owed",
  ],
  "armor:Advanced Banded Armor": [
    "\"when you take Severe damage, you must mark a Stress\" fires as damage lands, inside the damage flow; it is a consequence rather than an offer or a bare imperative, and a press would charge the Stress at a moment of the presser's choosing",
  ],
  "armor:Advanced Coffinwood Armor": [
    "\"Gain a bonus to your damage thresholds equal to your unmarked Armor Slots\" is a passive derived modifier, not a Hope gain and not a press",
  ],
  "armor:Advanced Leather Longcoat": [
    "\"Gain a +2 bonus to rolls you make to move silently\" is a standing bonus, not Hope gained, and carries no printed duration.",
  ],
  "armor:Advanced Mage Robes": [
    "\"Gain a bonus to your damage thresholds equal to your Spellcast trait\" is a standing modifier on worn armour, not Hope gained and not a timed effect anybody grants by pressing.",
  ],
  "armor:Advanced Silverweave Armor": [
    "\"You reduce incoming magic damage by your Armor Score before applying it to your damage thresholds\" changes how damage is measured whenever it lands; it is automatic and per-armour, not a press",
  ],
  "armor:Astral Raiment": [
    "\"gain advantage on a Spellcast roll\" is a bonus to a roll made elsewhere on the sheet, not an instruction to make one - the card never says \"make a Spellcast Roll\"",
  ],
  "armor:Banded Armor": [
    "\"when you take Severe damage, you must mark a Stress\" fires as damage lands, inside the damage flow; it is a consequence rather than an offer or a bare imperative, and a press would charge the Stress at a moment of the presser's choosing",
  ],
  "armor:Bladefare Armor": [
    "\"You can't mark an Armor Slot to reduce magic damage\" is a prohibition; the phrase names a cost the armour forbids rather than one it charges",
  ],
  "armor:Channeling Armor": [
    "\"+1 to Spellcast Rolls\" describes a bonus to a roll made elsewhere. Nothing here says make one, so it earns no roll-trait button.",
  ],
  "armor:Circle-Forged Dreadplate": [
    "\"the attacker must mark an equal number of Stress\" is the ATTACKER's cost, not the wearer's.",
    "\"When you mark any number of Hit Points from an attack\" is the trigger and prints no amount; the Hit Points are marked by the damage flow.",
  ],
  "armor:Cloverweave Cloak": [
    "\"change a failure with Hope into a success with Fear\" names two roll outcomes, not Hope gained or Fear given to the GM; nothing in the vocabulary rewrites a result.",
  ],
  "armor:Coffinwood Armor": [
    "\"Gain a bonus to your damage thresholds equal to your unmarked Armor Slots\" is a passive derived modifier, not a Hope gain and not a press",
  ],
  "armor:Deep-Forged Coral Armor": [
    "\"gain advantage on Agility Rolls while submerged\" is advantage on a roll made elsewhere, not Hope gained and not a command to roll.",
  ],
  "armor:Dragonscale Armor": [
    "\"when you would mark your last Hit Point\" is the trigger this feature exists to prevent, not a Hit Point the holder pays.",
  ],
  "armor:Elundrian Chain Armor": [
    "\"You reduce incoming magic damage by your Armor Score before applying it to your damage thresholds\" changes how damage is measured whenever it lands; it is automatic and per-armour, not a press",
  ],
  "armor:Emberwoven Armor": [
    "\"When an adversary attacks you within Melee range, they mark a Stress\" is the ATTACKER's cost, not the holder's.",
  ],
  "armor:Enchanter’s Robes": [
    "\"without paying its Recall Cost\" waives a Stress rather than charging one; read as a price it would charge the holder for a recall this armour makes free.",
  ],
  "armor:Full Fortified Armor": [
    "\"When you mark an Armor Slot\" names the trigger and describes what that mark now buys; the slot is marked by the damage dialog, so a press here would charge a second one",
  ],
  "armor:Gilded Sunplate": [
    "\"when you spend Hope\" is the trigger, not a price - the Hope is spent on something else and this armour only notices.",
  ],
  "armor:Godbound Laminar": [
    "\"When you mark an Armor Slot\" is the trigger, not a cost this feature charges - the slot is marked by the damage dialog",
  ],
  "armor:Granminster’s Finery": [
    "\"Gain a bonus to your Armor Score equal to your Presence\" is a standing trait-scaled modifier with no printed duration, not a resource gain.",
  ],
  "armor:Hallowed Heroplate": [
    "\"you can spend any number of Hope\" prints no amount - the number is the player's choice at the moment of the death move, and a pay button would have to invent one",
  ],
  "armor:Harrowbone Armor": [
    "\"Before you mark your last Armor Slot\" is the trigger, not a price - the slot is marked by the damage flow, and the feature's whole point is that it is not marked.",
  ],
  "armor:Improved Banded Armor": [
    "\"when you take Severe damage, you must mark a Stress\" fires as damage lands, inside the damage flow; it is a consequence rather than an offer or a bare imperative, and a press would charge the Stress at a moment of the presser's choosing",
  ],
  "armor:Improved Coffinwood Armor": [
    "\"Gain a bonus to your damage thresholds equal to your unmarked Armor Slots\" is a passive derived modifier, not a Hope gain and not a press",
  ],
  "armor:Improved Leather Longcoat": [
    "\"Gain a +2 bonus to rolls you make to move silently\" is a standing bonus, not Hope gained, and carries no printed duration.",
  ],
  "armor:Improved Mage Robes": [
    "\"Gain a bonus to your damage thresholds equal to your Spellcast trait\" is a standing modifier on worn armour, not Hope gained and not a timed effect anybody grants by pressing.",
  ],
  "armor:Improved Silverweave Armor": [
    "\"You reduce incoming magic damage by your Armor Score before applying it to your damage thresholds\" changes how damage is measured whenever it lands; it is automatic and per-armour, not a press",
  ],
  "armor:Irontree Breastplate Armor": [
    "\"increase your damage thresholds by +2 until you clear at least 1 Armor Slot\" fires automatically when the last slot is marked and its duration is not one of the printed set, so there is nothing to press and no grant-effect to author.",
  ],
  "armor:Leather Longcoat": [
    "\"Gain a +2 bonus to rolls you make to move silently\" is a standing bonus, not Hope gained, and carries no printed duration.",
  ],
  "armor:Legendary Banded Armor": [
    "\"when you take Severe damage, you must mark a Stress\" fires as damage lands, inside the damage flow; it is a consequence rather than an offer or a bare imperative, and a press would charge the Stress at a moment of the presser's choosing",
  ],
  "armor:Legendary Coffinwood Armor": [
    "\"Gain a bonus to your damage thresholds equal to your unmarked Armor Slots\" is a passive derived modifier, not a Hope gain and not a press",
  ],
  "armor:Legendary Leather Longcoat": [
    "\"Gain a +2 bonus to rolls you make to move silently\" is a standing bonus, not Hope gained, and carries no printed duration.",
  ],
  "armor:Legendary Mage Robes": [
    "\"Gain a bonus to your damage thresholds equal to your Spellcast trait\" is a standing modifier on worn armour, not Hope gained and not a timed effect anybody grants by pressing.",
  ],
  "armor:Legendary Silverweave Armor": [
    "\"You reduce incoming magic damage by your Armor Score before applying it to your damage thresholds\" changes how damage is measured whenever it lands; it is automatic and per-armour, not a press",
  ],
  "armor:Mage Robes": [
    "\"Gain a bonus to your damage thresholds equal to your Spellcast trait\" is a standing modifier on worn armour, not Hope gained and not a timed effect anybody grants by pressing.",
  ],
  "armor:Monett’s Cloak": [
    "\"You can't mark an Armor Slot to reduce physical damage\" forbids a payment rather than offering one; read as an offer it would put a button on the exact thing this armour refuses.",
  ],
  "armor:Resonant Harness": [
    "\"until you choose to repair your armor as a downtime move\" is a printed duration, and it is not one of the six the vocabulary holds, so the -5 threshold penalty is left to the table rather than granted with a duration that would be wrong.",
  ],
  "armor:Rosewild Armor": [
    "\"When you would spend a Hope, you can mark an Armor Slot instead\" is a substitution: a press that marked the Armor Slot could not also suppress the Hope the card is replacing, so it would be half the rule.",
  ],
  "armor:Rune-Forged Exosuit": [
    "\"you gain a bonus to your damage thresholds equal to your tier\" is a standing tier-scaled modifier with no printed duration, not a resource gain, and \"The maximum number of domain cards in your loadout is reduced by one\" is a standing loadout-limit modifier; both belong to the modifiers system rather than here.",
  ],
  "armor:Runes of Fortification": [
    "\"Each time you mark an Armor Slot, you must mark a Stress\" is a consequence attached to marking a slot, not a price paid on a press — a button would charge the Stress at the wrong moment.",
  ],
  "armor:Silverweave Armor": [
    "\"You reduce incoming magic damage by your Armor Score before applying it to your damage thresholds\" changes how damage is measured whenever it lands; it is automatic and per-armour, not a press",
  ],
  "armor:Spiked Plate Armor": [
    "\"add a d4 to the damage roll\" is additive to the weapon's own damage roll rather than an expression this card rolls on its own.",
  ],
  "armor:Tyris Soft Armor": [
    "\"You gain a +2 bonus to rolls you make to move silently\" is a standing bonus, not Hope gained, and it carries no printed duration, so it is a modifier rather than a grant-effect.",
  ],
  "armor:Wyrdwood Splint Armor": [
    "\"You can’t be Restrained\" is an immunity to a registered condition, not anybody applying one.",
  ],
  "class:Assassin": [
    "Marked for Death: \"the GM spends a number of Fear equal to your tier to clear it\" is the GM's Fear, spent to take the condition OFF. It is not the holder's cost and its amount is unprinted.",
    "Get In & Get Out: \"The next roll you make that acts on this information has advantage\" is advantage on one later roll; advantage is not a modifier target and the card prints no duration for it.",
  ],
  "class:Bard": [
    "Rally: \"or to clear a number of Stress equal to the result\" is a clear whose amount is the face the Rally Die just rolled. The card prints no number, so no `clear` can be written honestly.",
    "Rally: \"At the end of each session, clear all unspent Rally Dice\" is session upkeep, which the session refresh scope already performs. A button always on screen that emptied the tray would destroy dice mid-session.",
    "Rally: \"At level 5, your Rally Die increases to a d8\" changes the pool's die SIZE at a level. That is edited on the item sheet, not stepped by a press.",
    "Make a Scene: \"temporarily Distract a target\" names the state Distract, which is not in the registered condition set, so no `apply-condition` may be authored for it.",
  ],
  "class:Brawler": [
    "I Am the Weapon: \"deals <b>d8+d6</b> physical damage using your Proficiency\" is the Brawler’s Strike WEAPON's own stat line, rolled from the weapon Item. It is not a damage expression this document carries.",
    "I Am the Weapon: \"you gain a +1 bonus to your Evasion\" is a passive modifier that holds while the weapon is active — a state, with no press and no printed duration.",
    "Combo Strike: \"you can increase your Combo Die by one step as a level advancement option\" changes the pool's die SIZE and is bought with an advancement, not stepped by a press.",
  ],
  "class:Druid": [
    "Beastform: \"you mark Armor Slots as usual\" describes ordinary armour marking continuing while transformed. It is a statement about how the form behaves, not a press.",
    "Beastform: \"If you mark your last Hit Point, you automatically drop out of this form\" is a consequence of a Hit Point being marked elsewhere, not a cost this feature charges.",
    "Evolution: \"without marking a Stress\" is the Stress this feature explicitly does NOT charge. A price reader that saw \"marking a Stress\" here would charge exactly the cost the card waives.",
    "Evolution: \"choose one trait to raise by +1 until you drop out of that Beastform\" is a bonus whose trait is the player's choice and whose duration is not one the vocabulary carries.",
  ],
  "class:Guardian": [
    "Unstoppable: \"You can’t be Restrained or Vulnerable\" names two registered conditions but forbids them rather than applying them, and there is no press and no kind that removes a condition.",
    "Unstoppable: \"At level 5, your Unstoppable Die increases to a d6\" is the pool's die size at a level, not a `step` of its value.",
    "Unstoppable: \"You add the current value of the Unstoppable Die to your damage roll\" and \"You reduce the severity of physical damage by one threshold\" are passive benefits of the state, not presses.",
  ],
  "class:Ranger": [
    "Ranger’s Focus: \"When you deal damage to them, they must mark a Stress\" is the TARGET's Stress, not the holder's. This is the exact clause the old parser charged the wielder for.",
    "Ranger’s Focus: \"make an attack against a target\" has no kind — an attack roll is neither `roll-trait` nor `roll-damage` — so the press pays the Hope and leaves the attack to the player.",
    "Ranger’s Focus: \"deal your attack’s normal damage\" is the equipped weapon's ordinary damage, which the attack's own damage button already rolls. A second button here would be a duplicate.",
    "Ranger’s Focus: \"temporarily make the attack’s target your Focus\" names a state (Focus) that is not in the registered condition set.",
    "Ranger’s Focus: \"you can end your Ranger’s Focus feature to reroll your Duality Dice\" ends a feature and rerolls the pair; neither is one of the fifteen kinds.",
  ],
  "class:Rogue": [
    "Cloaked: \"Any time you would be Hidden, you are instead Cloaked\" substitutes one registered condition for another automatically, whenever something ELSE would make you Hidden. Nothing here is pressed.",
    "Cloaked: \"you are no longer Cloaked\" removes a condition, and no kind removes one.",
  ],
  "class:Seraph": [
    "Prayer Dice: \"gain Hope equal to the result\" is a gain whose amount is the spent die's face; the card prints no number, so no `gain` can be written.",
    "Prayer Dice: \"use a spent die’s value to reduce incoming damage\" reduces a hit by an unprinted amount and belongs to the damage dialog, not to a press on this card.",
    "Prayer Dice: \"At the end of each session, clear all unspent Prayer Dice\" is session upkeep the refresh scope performs; a standing button would empty the tray mid-session.",
    "Life Support: \"clear a Hit Point on an ally within Close range\" heals SOMEBODY ELSE. `clear` has no way to say whose Hit Point, and authored bare it would unmark the holder's own — the mirror of charging the wielder a target's Stress.",
  ],
  "class:Sorcerer": [
    "Channel Raw Power: \"Gain Hope equal to the level of the card\" is a gain whose amount is the vaulted card's level. The card prints no number.",
    "Channel Raw Power: \"gaining a bonus to your damage roll equal to twice the level of the card\" is a modifier with no printed value and no printed duration.",
    "Channel Raw Power: \"place a domain card from your loadout into your vault\" is the cost, and no kind moves a card between the loadout and the vault — so the whole feature is left unpressed rather than handing out the benefit for free.",
    "Volatile Magic: \"reroll any number of your damage dice\" is not one of the fifteen kinds; a reroll is pressed on the die on the posted plate, which is where the record of it belongs.",
  ],
  "class:Warlock": [
    "Patron’s Pact: \"you can spend a Favor to call upon their aid\" spends Favor, which is a counter this document does not carry — there is nothing to charge, so the cost cannot be expressed.",
    "Patron’s Pact: \"rolling your Patron Die and adding its result to the total\" gets no button either, because a `die-pool` roll on its own would hand out the aid without spending the Favor the card charges for it.",
    "Patron’s Pact: \"Your Patron Die starts at a <b>d6</b> and increases to a <b>d8</b> at level 5\" is the pool's die size at a level, not a press.",
    "Favor: \"gain Favor equal to your Spellcast trait\" gains a counter this document does not carry, in an amount the card does not print.",
    "Favor: \"you can choose to gain a Favor instead of a Hope\" is a Hope DECLINED in exchange for Favor. A reader matching on \"gain a…Hope\" here would hand the holder the very Hope the card gives up.",
    "Patron’s Boon: \"to reroll with advantage\" is not one of the fifteen kinds; a reroll is pressed on the die on the posted plate.",
  ],
  "class:Warrior": [
    "Attack of Opportunity: \"make a reaction roll using a trait of your choice against their Difficulty\" is the holder's own roll, but the trait is the player's choice, so no `roll-trait` can name one without inventing it.",
    "Combat Training: \"you gain a bonus to your damage roll equal to your level\" is a permanent passive modifier with no duration and no press — the modifier system's, not a `grant-effect`.",
  ],
  "class:Witch": [
    "Hex: \"the target gains a penalty to their damage rolls and Difficulty equal to your tier\" is a modifier on the TARGET, in an amount the card does not print. It is what being Hexed does, not something the holder presses.",
    "Witch’s Charm: \"change it into a success with Fear instead\" names the roll's OUTCOME, not the GM's Fear pool. Nothing on this card gains Fear.",
  ],
  "class:Wizard": [
    "Not This Time: \"reroll an attack or damage roll\" is the ADVERSARY's reroll, forced on them. It is not the holder's roll and gets no button of ours.",
  ],
  "community:Duneborne": [
    "\"reroll a die used for a downtime move and take the higher result\" names no die size — it is whichever die the downtime move rolled — and that reel belongs to the rest dialog rather than to this card.",
  ],
  "community:Freeborne": [
    "\"you can change it into a roll with Hope instead\" charges nothing and reinterprets a roll already made; no kind in the vocabulary expresses it.",
  ],
  "community:Hearthborne": [
    "\"you can spend any number of Hope\" prints no amount, so a `pay` would have to invent one.",
    "\"grant an ally within Far range an equal number of Hope\" lands on somebody else, and `gain` has no way to name who receives it.",
  ],
  "community:Orderborne": [
    "\"you can roll a <b>d20</b> as your Hope Die\" changes the size of the duality pair's Hope Die rather than rolling a separate die; that lives in the roll popover's die pair, not in a roll-dice action",
  ],
  "community:Seaborne": [
    "\"place a token on your community card\" and \"clear all unspent tokens\" move a pool this document carries no counter for — a compendium document ships with no resources, and inventing one is forbidden",
    "\"you can spend any number of these tokens to gain a +1 bonus to the roll for each token spent\" prints no fixed amount; how many are spent is the player's choice at the moment of rolling",
  ],
  "community:Warborne": [
    "\"when you would be forced to mark a Stress\" is the cost this feature lets you avoid, not one it charges — the Hope is the price.",
  ],
  "consumable:Arcticite Shard": [
    "\"must succeed on a <b>Reaction Roll (16)</b>\" is the targets' Reaction Roll, not the holder's, so it gets no roll-trait button.",
  ],
  "consumable:Armor Stitcher": [
    "\"any number of Hope\" is a variable spend this vocabulary cannot state - the press is authored as the single Hope-for-a-slot unit the card is made of, to be pressed again for each further slot, rather than inventing a total",
  ],
  "consumable:Attune Potion": [
    "\"a +1 bonus to your next Instinct Roll\" is a one-roll bonus to one trait's rolls — no per-trait-roll modifier target exists, and a trait bonus would persist past the single roll the card pays for.",
  ],
  "consumable:Berserker’s Brew": [
    "\"a bonus to your Strength and a penalty to your Finesse and Knowledge equal to your Instinct (minimum 1)\" needs a modifier to name both the trait it changes and the trait it scales off, and there is one `trait` field for both. Written either way the card would silently modify the wrong trait.",
  ],
  "consumable:Blinding Orb": [
    "\"until they mark HP\" is the clause that ENDS the condition on the target - it is the target’s Hit Point and never a cost the holder pays",
  ],
  "consumable:Bolster Potion": [
    "\"a +1 bonus to your next Strength Roll\" is a one-roll bonus to one trait's rolls. The modifier vocabulary has no per-trait-roll target and no scope that expires on use; writing it as a trait bonus would raise every Strength Roll, and anything else sourced on Strength, until somebody took the effect off by hand.",
  ],
  "consumable:Bridge Seed": [
    "\"The vines dissipate on your next short rest.\" is a duration on a created object, not a bonus",
  ],
  "consumable:Bundle of Spiderlegs": [
    "\"walk on walls until your next rest\" is a granted ability with a duration and no modifier",
  ],
  "consumable:Channelstone": [
    "\"take a spell or grimoire from your vault, use it once, and return it to your vault\" moves a card between vault and loadout. That is a card placement, not one of the fifteen kinds, and inventing a press for it would move somebody's loadout.",
  ],
  "consumable:Chimeric Saliva": [
    "\"change its damage type to magic until your next rest\" is a printed duration on a weapon's damage type, and no modifier target names a damage type.",
  ],
  "consumable:Ciscan Fog Bottle": [
    "\"A creature who enters the mist clears a Stress\" is whoever walks into the mist clearing their own Stress, not the presser's — the press only makes the mist.",
    "\"becomes <i>Hidden</i>\" is a registered condition landing on a creature who enters the area later, so neither `self` nor `targets` names who it is on at the moment of the press.",
  ],
  "consumable:Cockerel Claw Tea": [
    "\"refresh your features as if you had taken a long rest\" refills every feature on the CHARACTER; `refresh` names a counter this document carries and this document carries none",
  ],
  "consumable:Death Tea": [
    "\"you instantly kill your target when you critically succeed on an attack\" and \"you die\" are outcomes with no kind to hold them — there is no kill and no death move in the vocabulary, and the second is a consequence to the holder rather than a press.",
  ],
  "consumable:Deathseer’s Powder": [
    "\"conjure a spectral reprise of their final minute of life\" is prose describing a vision, not the registered <i>Spectral</i> condition on a creature",
  ],
  "consumable:Displacement Token": [
    "\"Each illusion lasts until it takes damage or until your next rest.\" is a duration on a conjured thing, not a bonus with modifiers",
  ],
  "consumable:Dynamite": [
    "\"must make a Reaction Roll (14)\" is the targets’ Reaction Roll and gets no button (rule 7)",
    "\"Targets who succeed must mark a Stress.\" is the TARGETS’ Stress - \"must\" here is a consequence landing on somebody else, and the holder owes nothing",
  ],
  "consumable:Emberite Shard": [
    "\"All targets within Close range of that point must succeed on a <b>Reaction Roll (16)</b>\" is the targets’ Reaction Roll and gets no button (rule 7)",
    "\"a creature must roll a <b>d4</b> whenever they make an action roll. On a result of 1, they mark a Hit Point.\" is the TARGET’s roll and the target’s Hit Point, made on their own turn",
  ],
  "consumable:Enlighten Potion": [
    "\"a +1 bonus to your next Knowledge Roll\" is a one-roll bonus to one trait's rolls — no per-trait-roll modifier target exists, and a trait bonus would persist past the single roll the card pays for.",
  ],
  "consumable:Feast of Xuria": [
    "\"clear all HP and Stress\" is an unbounded clear - `amount` carries numbers and cannot say \"all\", and inventing the character’s maxima here would be writing a number the card does not print",
    "\"gain 1d4 Hope\" is a rolled gain, so only the die is authored and the pips are taken by hand",
  ],
  "consumable:Fulgurite Shard": [
    "\"must succeed on a <b>Reaction Roll (16)</b>\" is the targets’ Reaction Roll and gets no button (rule 7)",
    "\"mark <b>1d4</b> Stress\" is the TARGETS’ Stress, marked by the creatures caught in the area - this is exactly the Scary misreading and the holder pays nothing",
  ],
  "consumable:Gambler’s Fallacy": [
    "\"spend any number of handfuls of gold\" is gold, which `amount` does not carry, and the number is the player’s to choose",
    "\"deals <b>1d20</b> magic damage for each handful of gold spent\" repeats a die an unknown number of times, and this document carries no `cardDamage` expression",
  ],
  "consumable:Godling’s Pomelo": [
    "\"clear all Hit Points and Stress\" clears both tracks whole; `clear` takes a fixed amount and would have to invent two numbers.",
  ],
  "consumable:Gravity Bomb": [
    "\"pulls all creatures and objects within Close range of that point into Melee range with it\" is forced movement, which no kind in this vocabulary expresses",
  ],
  "consumable:Green Ooze Oil": [
    "\"deals an extra <b>1d8</b> magic damage\" rides on a weapon attack and this document carries no `cardDamage` to name",
    "\"the target gains a −2 penalty to their damage thresholds\" is a modifier on the TARGET - `grant-effect` lands on the presser, so authoring it would move the holder’s own thresholds",
  ],
  "consumable:Grindletooth Venom": [
    "\"add a <b>d6</b> to your next damage roll with that weapon\" is a bonus die on a future *weapon* damage roll: `roll-damage` rolls the weapon alone, a modifier `value` is a number and not a die, and this document carries no `cardDamage` to point at",
  ],
  "consumable:Health Potion": [
    "\"Clear 1d4+1 HP.\" is a rolled amount, and `clear` carries a fixed number - the die is the press and the unmarking is done by hand",
  ],
  "consumable:Homet’s Secret Potion": [
    "\"the next successful attack you make critically succeeds\" reads as a granted state with a printed scope, and nothing in the modifier vocabulary forces a critical — there is no target for it and no number to carry it.",
  ],
  "consumable:Hopehold Flare": [
    "\"allies within Close range roll a d6 when they spend a Hope\" is the ALLY’s roll and the ally’s Hope, not the holder’s press",
    "\"The flare lasts until the end of the scene.\" is a duration on a created effect that carries no modifier for the holder",
  ],
  "consumable:Improved Grindletooth Venom": [
    "\"add a <b>d8</b> to your next damage roll with that weapon\" is an extra die inside somebody else's damage expression. `roll-damage` rolls the weapon's own printed line, this document carries no `cardDamage` entry, and `roll-dice` is for a die that is not damage — none of the three is this.",
  ],
  "consumable:Iridian Dust": [
    "\"prevents creatures covered in it from becoming <i>Hidden</i>\" names a registered condition and withholds it rather than applying it; `apply-condition` has no negative form and the subject is somebody else besides.",
  ],
  "consumable:Jumping Root": [
    "\"Eat this root to leap up to Far range once without needing to roll\" — using it is the whole of it, and use-item is added by the system",
  ],
  "consumable:Knowledge Stone": [
    "\"an ally can take a card from your loadout to place in their loadout or vault\" is the ALLY’s act on the holder’s death, and moving a card between loadout and vault is not a kind in this vocabulary",
  ],
  "consumable:Magic-User’s Malison": [
    "\"cast one spell from a card in your vault as if it were in your loadout\" is a card placement rather than a press — nothing in the vocabulary moves a card, and the spell it lets you cast is a different document's action.",
  ],
  "consumable:Major Health Potion": [
    "\"Clear 1d4+2 HP.\" is a rolled amount, and `clear` carries a fixed number - the die is the press and the unmarking is done by hand",
  ],
  "consumable:Major Stamina Potion": [
    "\"Clear 1d4+2 Stress\" is a rolled amount and `clear` carries a fixed `amount`; only the die is annotated.",
  ],
  "consumable:Mask of the Echoed Self": [
    "\"swap the values of any of your traits\" rewrites the trait spread at level up. There is no kind that writes a trait score, and a grant-effect modifier adds rather than swaps.",
  ],
  "consumable:Midas Flask": [
    "\"transmute it into a handful of gold\" gains gold, and `amount` holds hope, stress, hitPoints, armorSlots and fear only.",
  ],
  "consumable:Minor Health Potion": [
    "\"Clear 1d4 HP.\" is a rolled amount, and `clear` carries a fixed number - the die is the press and the unmarking is done by hand",
  ],
  "consumable:Minor Stamina Potion": [
    "\"Clear 1d4 Stress\" is a rolled amount and `clear` carries a fixed `amount`; the die is annotated as a roll-dice instead and the player unmarks what it says.",
  ],
  "consumable:Mnemonic Potion": [
    "\"Utilize an Experience without spending a Hope\" is the ABSENCE of a cost - the roll popover charges the Hope, and there is no kind that waives one. Authoring a `pay` here would charge the very Hope the card forgives",
  ],
  "consumable:Morphing Clay": [
    "\"altering your face enough to make you unrecognizable until your next rest\" is a granted disguise with a duration and no modifier, not a `grant-effect`",
  ],
  "consumable:Mossmantle Potion": [
    "\"perfectly blend into natural environments until your next rest\" is a granted state with a duration; the card does not name <i>Hidden</i> and inventing that condition would be reading a rule the card does not print",
  ],
  "consumable:Mythic Dust": [
    "\"add a <b>d12</b> to your next damage roll with that weapon\" is a bonus die on a future *weapon* damage roll: `roll-damage` rolls the weapon alone, a modifier `value` is a number and not a die, and this document carries no `cardDamage` to point at",
  ],
  "consumable:Necroprancer’s Bell": [
    "\"summon a skeletal steed that climbs out of the earth and serves you until the next sunrise\" is a conjured creature with a duration, not a bonus carrying modifiers",
  ],
  "consumable:Night Hag’s Dust": [
    "\"prevent them from clearing Stress until your next long rest\" is a restriction on an adversary — it neither costs the holder anything nor names a registered condition, and there is no kind that forbids somebody else a clear.",
  ],
  "consumable:Ogre Musk": [
    "\"prevent anyone from tracking you by mundane or magical means until your next rest\" is a granted state with a duration and no modifier",
  ],
  "consumable:Phial of Deep Ink": [
    "\"transform into a cephalopod of roughly your size for the next hour\" grants a form and four abilities with a duration and no printed modifier",
  ],
  "consumable:Pipeweed": [
    "\"Any other PCs who chose the Clear Stress downtime move also gain this benefit\" is a clear on other characters' sheets, not the holder's; only the holder's own additional Stress is annotated.",
  ],
  "consumable:Potion of Stability": [
    "\"choose one additional downtime move\" moves the rest allowance, which no kind in the vocabulary expresses",
  ],
  "consumable:Psychopomp’s Shroud": [
    "\"becomes your spectral assistant\" uses the word spectral as a description of a summoned spirit, not the registered Spectral condition, and there is nobody on the board to put it on.",
  ],
  "consumable:Red Ooze Oil": [
    "\"deals an extra <b>1d8</b> magic damage\" rides on a weapon attack and this document carries no `cardDamage` to name, so there is nothing honest for `roll-card-damage` to point at",
    "\"temporarily <i>Ignites</i> the target\" names <i>Ignited</i>, a state that is not in the registered condition list",
    "\"the target takes <b>1d4</b> magic damage when they take the spotlight\" is damage the TARGET takes on their own spotlight, not a press the holder makes",
  ],
  "consumable:Redthorn Saliva": [
    "\"add a <b>d12</b> to your next damage roll with that weapon\" is a bonus die on a future *weapon* damage roll: `roll-damage` rolls the weapon alone, a modifier `value` is a number and not a die, and this document carries no `cardDamage` to point at",
  ],
  "consumable:Slayer’s Salt": [
    "\"a magical barrier that undead creatures can't cross until the line is broken\" — the effect is on the ground rather than on a creature, and \"until the line is broken\" is not a duration this system can sweep",
  ],
  "consumable:Sleeping Sap": [
    "\"You clear all Stress upon waking\" clears the whole track rather than a printed number, and it happens on waking from the rest rather than on a press. `clear` takes a fixed amount and would have to invent one.",
  ],
  "consumable:Snakeskin Spirit": [
    "\"heal a scar\" removes a permanent record; no kind in the vocabulary moves a scar, and `clear` carries only the four tracks",
  ],
  "consumable:Sprite Bottle": [
    "\"The Sprite clears all your Hit Points\" clears the whole track rather than a printed number, and it fires automatically on marking your last Hit Point rather than on a press.",
  ],
  "consumable:Staff of Reversal": [
    "\"reverse one magical transformation or effect within Far range\" removes somebody else’s effect; `grant-effect` only ever adds one to the presser",
  ],
  "consumable:Stake of Abjuration": [
    "\"a creature within Far range of the stake who transgresses that proclamation must mark a Stress\" is the TRANSGRESSOR’s Stress - the holder plants the stake and pays nothing",
  ],
  "consumable:Stamina Potion": [
    "\"Clear 1d4+1 Stress\" is a rolled amount and `clear` carries a fixed `amount`; only the die is annotated.",
  ],
  "consumable:Sun Tree Sap": [
    "\"gaining one scar\" is a permanent record with no kind in the vocabulary, and it is the outcome of a 1 rather than something to press",
  ],
  "consumable:Sweet Moss": [
    "\"clear 1d10 HP or 1d10 Stress\" is a rolled amount and a choice of track; `clear` holds one fixed amount on one track, so only the die is annotated.",
  ],
  "consumable:Tears of the Undying Hero": [
    "\"When you would mark your last Hit Point\" is a trigger on a Hit Point the holder marks elsewhere, not a cost this card charges",
    "\"you make one final action roll\" names no trait, so there is no `roll-trait` to write without inventing one",
    "\"an ally chooses the Tend to Wounds downtime move to clear your Hit Points\" is the ALLY’s downtime move",
  ],
  "consumable:Vial of Darksmoke": [
    "\"roll a number of d6s equal to your Agility\" is a count this card does not print — a formula I would have to invent, and the highest result is then added to Evasion, which no modifier target holds either.",
  ],
  "consumable:Vial of Featherfall": [
    "\"ignore damage from falling for the next 10 minutes\" negates a source of damage - no modifier target expresses it and the duration is not one the vocabulary carries",
  ],
  "consumable:Vial of Moondrip": [
    "\"you can see in total darkness until your next rest\" is a granted sense with a printed duration and no modifier - a duration on something created, which rule 4 says is not a `grant-effect`",
  ],
  "domainCard:A Soldier’s Bond": [
    "\"you can both gain 3 Hope\" also gives the other person 3 Hope; only the holder's half is authored, because the ally's Hope is on the ally's sheet.",
  ],
  "domainCard:Alpha": [
    "\"allies within Far range gain a <b>+1</b> bonus to attack rolls and can't be <i>Horrified</i>\" lands on the allies’ sheets, not the holder’s.",
    "\"adversaries within Close range of you when you roar gain a <b>−1</b> penalty to their Difficulty\" lands on the adversaries, not the holder.",
  ],
  "domainCard:Amber": [
    "\"the GM spends a Fear on their turn to end it\" is the GM's Fear, not the holder's press.",
  ],
  "domainCard:Apex": [
    "\"your attacks deal an extra <b>d12</b> damage\" has a printed duration but its value is a die rather than a number, and a modifier carries a number.",
  ],
  "domainCard:Arcana-Touched": [
    "\"+1 bonus to your Spellcast Rolls\" is a standing bonus conditional on your loadout with no printed duration and nobody presses it — a passive modifier, not a grant-effect",
    "\"you can switch the results of your Hope and Fear Dice\" swaps two dice already on the table; no kind in the vocabulary expresses it and it is not a cost, a roll or a die this card throws",
  ],
  "domainCard:Arcane Reflection": [
    "\"spend any number of Hope\" to \"roll that many <b>d6s</b>\" is a variable spend chosen at the moment of casting; neither the Hope cost nor the die count is a number this card prints, and a one-Hope press could not roll the pool the card asks you to read together (\"If any roll a 6\").",
    "\"the attack is reflected back to the caster, dealing the damage to them instead\" is damage moved onto somebody else, not an expression this card rolls.",
  ],
  "domainCard:Armorer": [
    "\"While you’re wearing armor, gain a +1 bonus to your Armor Score\" is a passive modifier with no press and no printed duration.",
    "\"your allies also clear an Armor Slot\" clears the allies' slots, not the holder's.",
  ],
  "domainCard:Astral Projection": [
    "\"This effect lasts until your next rest\" is a duration on a conjured projection, not a bonus carrying modifiers.",
  ],
  "domainCard:Avatar of Terror": [
    "\"you gain a 1d6 bonus to your damage rolls for each Fear in the GM's pool\" scales off the GM's pool at the moment of the roll; the count is not printed and cannot be written",
  ],
  "domainCard:Banish": [
    "\"roll a number of <b>d20s</b> equal to your Spellcast trait\" scales with a trait, so there is no formula to write.",
    "\"The target must make a reaction roll with a Difficulty equal to your highest result\" is the target’s roll, not the holder’s.",
    "\"the target must mark a Stress but isn’t banished\" is the target’s cost, not the holder’s.",
  ],
  "domainCard:Bare Bones": [
    "\"you have a base Armor Score of 3 + your Strength\" is a standing derivation the sheet already applies; it is a modifier, not a press.",
    "\"use the following as your base damage thresholds\" replaces two derived numbers by tier and is likewise a standing rule with no press and no duration.",
  ],
  "domainCard:Battle Cry": [
    "\"All allies who can hear you each clear a Stress and gain a Hope\" lands on the allies, not the holder - clear and gain have no subject and would give the presser somebody else's Hope.",
    "\"your allies gain advantage on attack rolls until you or an ally rolls a failure with Fear\" is an allies' bonus whose duration is a table event, not one of the printed durations.",
  ],
  "domainCard:Battle Monster": [
    "\"force the target to mark a number of Hit Points equal to the number of Hit Points you currently have marked\" is the TARGET's cost, not the holder's, and the amount is read off your own sheet at the moment of the hit",
  ],
  "domainCard:Blade-Touched": [
    "\"+2 bonus to your attack rolls\" and \"+4 bonus to your Severe damage threshold\" are standing bonuses conditional on your loadout, with no printed duration and no press — passive modifiers, not grant-effect",
  ],
  "domainCard:Bloom": [
    "\"Targets you succeed against must make a Reaction Roll (15)\" is the TARGETS' roll, not the holder's",
    "\"Targets who succeed take half damage\" is what happens to a target after the dice land; halving is not encoded on a damage expression",
  ],
  "domainCard:Body Basher": [
    "\"gain a bonus to your damage roll equal to your Strength\" — a standing passive on melee attacks: nothing is pressed and no duration is printed",
  ],
  "domainCard:Bold Presence": [
    "\"avoid gaining the condition\" declines a condition rather than applying one; there is no way to say \"do not apply\" in this vocabulary, and the condition it refuses is unnamed.",
  ],
  "domainCard:Bone-Touched": [
    "\"+1 bonus to Agility\" is a standing trait bonus conditional on your loadout, with no printed duration and no press",
  ],
  "domainCard:Book of Ava": [
    "\"give a target you can touch a +1 bonus to their Armor Score until their next rest\" — the bonus lands on another creature and grant-effect has no way to say whose effect it is; only the Hope is the holder's",
  ],
  "domainCard:Book of Exota": [
    "\"Make a reaction roll using your Spellcast trait\" is a Reaction Roll, which this system deliberately gives no button, and the once-per-rest clause hangs on its outcome rather than on the press.",
  ],
  "domainCard:Book of Illiat": [
    "\"they’re <i>Asleep</i>\" names a state — Asleep — that is not one of the registered conditions.",
    "\"the GM spends a Fear on their turn to clear this condition\" is the GM's Fear, spent to end the effect; it is not the holder's press.",
    "\"<b>spend any number of Hope</b>\" prints no amount, so there is no sum to charge.",
    "\"Roll a number of <b>d6s</b> equal to the Hope spent\" takes its die count from a payment made a moment earlier, which the card never fixes to a number.",
  ],
  "domainCard:Book of Korvax": [
    "\"make a Reaction Roll (15)\" is the TARGET's Reaction Roll, made against the holder's spell; a Reaction Roll gets no button on the caster's card.",
  ],
  "domainCard:Book of Norai": [
    "\"must mark a Stress\" — Mystic Tether's Stress is marked by the restrained target, not by the holder",
    "\"must make a Reaction Roll (13)\" — that roll belongs to the target and everything near it; a Reaction Roll gets no button",
  ],
  "domainCard:Book of Tyfar": [
    "\"must mark a Stress as flames erupt from your hand\" — that Stress is marked by the targets Wild Flame succeeded against, not by the holder",
  ],
  "domainCard:Book of Vyola": [
    "\"When one of them would mark Stress, they can choose between the two of them who marks it\" is the two chosen creatures' mark, not the holder's.",
  ],
  "domainCard:Book of Yarrow": [
    "\"become immune to magic damage until your next rest\" has a printed duration but no modifier target that can express immunity to a damage type; the Hope is charged and the immunity is left to the table",
  ],
  "domainCard:Boost": [
    "\"add a <b>d10</b> to the damage roll\" — a bonus die on the weapon's own damage roll, not an expression this card rolls; the document carries no cardDamage",
  ],
  "domainCard:Breaking Blow": [
    "\"deal an extra <b>2d12</b> damage\" is damage on the *next* successful attack against that target, not an expression this press rolls, and this document carries no card-damage entry to hang it on.",
  ],
  "domainCard:Chain Lightning": [
    "\"Targets you succeed against must make a reaction roll\" is the targets' roll, not the holder's - a Reaction Roll gets no button on the caster's card.",
  ],
  "domainCard:Chains of Affliction": [
    "\"temporarily <i>Chain</i> a target within Close range\" names a state — Chained — that is not one of the registered conditions.",
    "\"the target of their attack marks one fewer Hit Point than they normally would\" is a reduction applied to whoever the Chained creature attacks, on their own sheet.",
  ],
  "domainCard:Champion’s Edge": [
    "\"The target must mark an additional Hit Point.\" is the target's cost, not the holder's - the third option buys damage on somebody else and must not mark the holder's own track.",
  ],
  "domainCard:Chokehold": [
    "\"they deal an extra <b>2d6</b> damage\" is damage rolled by whoever attacks the Vulnerable creature — anybody at the table — and not by the holder of this card.",
  ],
  "domainCard:Cinder Grasp": [
    "\"is temporarily lit <i>On Fire</i>\" — On Fire is not a registered condition in this system",
    "\"they must take an extra <b>2d6</b> magic damage if they are still <i>On Fire</i>\" — that is damage the burning creature takes on its own action, not an expression the holder rolls, and it is not in this card's cardDamage",
  ],
  "domainCard:Cloaking Blast": [
    "\"When you make a successful <b>Spellcast Roll</b> to cast a different spell\" is not an imperative — it names a roll made on some other card, so this card gets no roll button of its own.",
  ],
  "domainCard:Codex-Touched": [
    "\"replace this card with any card from your vault without paying its Recall Cost\" moves a card between loadout and vault; it names a cost only to waive it, and there is no press in this vocabulary for a loadout swap.",
  ],
  "domainCard:Cold Solution": [
    "\"They reroll their Fear Die\" — the reroll is on the ally's own dice and costs the holder nothing",
  ],
  "domainCard:Confusing Aura": [
    "\"Mark any number of Stress\" is genuinely the holder's price, but the amount is the player's choice at the moment of casting and this shape holds one fixed number — writing 1 would be inventing a figure the card does not print",
    "\"roll a number of d6s equal to the number of layers currently active\" is a count only the table knows; the formula cannot be written and the roll fires on the adversary's attack rather than on a press of yours",
  ],
  "domainCard:Conjured Steeds": [
    "\"<b>Spend any number of Hope</b> to conjure that many magical steeds\" is the holder’s price with no printed number — the count is the point of the card.",
    "\"Creatures riding a steed gain a -2 penalty to attack rolls and a +2 bonus to damage rolls\" lands on whoever is riding, which is not necessarily the holder, so it is not an effect this card can grant to one sheet.",
  ],
  "domainCard:Copycat": [
    "\"<b>Spend Hope equal to half the card’s level</b>\" is the holder’s price, but the number depends on which card is being mimicked and is unknowable here.",
  ],
  "domainCard:Counterspell": [
    "\"making a reaction roll using your Spellcast trait\" — not an imperative ask for a roll, and a Reaction Roll gets no button",
  ],
  "domainCard:Critical Inspiration": [
    "\"all allies within Very Close range can clear a Stress or gain a Hope\" — the Stress and the Hope are the allies', each of them choosing for themselves; nothing here is the holder's to clear or gain",
  ],
  "domainCard:Cruel Precision": [
    "\"gain a bonus to your damage roll equal to either your Finesse or Agility\" is a passive bonus with no printed duration and nothing to press — it belongs to the modifier system, not to an authored action.",
  ],
  "domainCard:Crush": [
    "\"give them a <b>−2</b> penalty to their damage thresholds until your next rest\" is a debuff on the target with a printed duration, and grant-effect has no subject - authoring it would drop the penalty on the caster's own thresholds.",
  ],
  "domainCard:Damnation": [
    "\"mark any number of Stress to roll an equal number of <b>d20s</b>\" is the holder’s price and the holder’s dice, but both counts are chosen at the moment of casting.",
    "\"all adversaries within Far range of the target must <b>mark a Stress</b>\" is the adversaries’ cost, not the holder’s.",
  ],
  "domainCard:Dark Army": [
    "\"Place 8 tokens on this card\" and \"spend any number of tokens\" move a counter this document does not carry - there is no resource on this unit to name.",
    "\"add <b>1d8</b> for each token spent to your damage roll\" and \"reduce the damage by <b>1d8</b> for each token spent\" are die counts equal to a spend chosen at the table.",
  ],
  "domainCard:Darkfire": [
    "\"spend any number of Hope to target an equal number of adversaries\" is the holder’s price with no printed number.",
    "\"Each target makes a <b>Reaction Roll (15)</b>\" is the targets’ roll, not the holder’s.",
    "\"take <b>d8+6</b> magic damage using your Spellcast trait\" is printed on the card, but this document carries no annotated damage expression to point a button at, and inventing one is not allowed.",
  ],
  "domainCard:Death Grip": [
    "\"force them to mark 2 Stress\" — the second option's Stress is marked by the constricted target, not by the holder",
    "\"All adversaries between you and the target must succeed on a Reaction Roll (13)\" — that roll is the adversaries'; a Reaction Roll gets no button",
  ],
  "domainCard:Deathrun": [
    "\"roll your weapon damage with a +1 bonus to your Proficiency\" cannot be roll-damage: that kind rolls the equipped weapon's own expression and has nowhere to carry the +1 Proficiency, and the sequence that follows removes a die per target, which nothing here can express",
  ],
  "domainCard:Deft Maneuvers": [
    "\"gain a +1 bonus to the attack roll\" is conditional on how the sprint ends and carries no duration anybody grants by pressing, so it is a modifier on that one roll rather than an action.",
  ],
  "domainCard:Dire Strike": [
    "\"When a target marks any number of Hit Points\" is the target's mark - it is the trigger for this card, not a cost the holder pays.",
  ],
  "domainCard:Dread-Touched": [
    "\"you can gain a bonus to the roll equal to the number of Fear in the GM's pool\" scales off a world value at the moment of the roll; the bonus cannot be written and no press applies it",
  ],
  "domainCard:Earthquake": [
    "\"all targets within Very Far range who aren’t flying must make a Reaction Roll (18)\" is the targets’ roll, not the holder’s — a button here would put the roll on the wrong side of the exchange.",
    "\"Targets who succeed take half damage\" is save-for-half, which happens to a target after the dice land and has no encoding in a damage expression.",
  ],
  "domainCard:Eclipse": [
    "\"the target must mark a Stress\" is the TARGET's cost when you or an ally succeeds with Hope, not the holder's",
    "\"the GM spends a Fear on their turn to clear this effect\" is the GM's spend and ends the spell; it is not a press on the holder's card",
  ],
  "domainCard:Eldritch Flesh": [
    "\"Gain a +1 bonus to your damage thresholds for each Stress you have marked\" is a standing bonus that recomputes as you mark Stress — a passive modifier, not a timed effect somebody grants",
  ],
  "domainCard:Encore": [
    "\"you deal the same damage to the target that your ally dealt\" is not an expression this card prints; the number belongs to somebody else's roll and cannot be rolled from here",
  ],
  "domainCard:Enrapture": [
    "\"force the <i>Enraptured</i> target to mark a Stress as well\" — the second Stress is the target's; only the holder's own Mark a Stress is charged here",
  ],
  "domainCard:Excise": [
    "\"end one temporary condition or ongoing magical effect on a target within Far range\" removes an unnamed state from somebody else; nothing in the closed condition list is named and the removal is the GM's adjudication.",
  ],
  "domainCard:Falling Sky": [
    "\"<b>Mark any number of Stress</b>\" is genuinely the holder’s price, but the amount is chosen at the moment of casting and a fixed number here would charge the wrong price on almost every cast.",
    "\"take <b>1d20+2</b> magic damage for each Stress marked\" repeats the expression a number of times only the table knows, which is not a count this shape can hold.",
  ],
  "domainCard:Fane of the Wilds": [
    "\"place a number of tokens equal to the number of Sage domain cards in your loadout and vault on this card\" counts something this document carries no counter for.",
    "\"spend any number of tokens after the roll to gain a +1 bonus for each token spent\" spends a pool that does not exist here, in an amount the card leaves open.",
    "\"When you take a long rest, clear all unspent tokens\" clears the same absent pool.",
  ],
  "domainCard:Ferocity": [
    "\"increase your Evasion by the number of Hit Points they marked. This bonus lasts until after the next attack made against you\" — the value is not printed (it is however many Hit Points were marked) and the duration is not one this system can express",
  ],
  "domainCard:Flight": [
    "\"place a number of tokens equal to your Agility on this card (minimum 1)\" names a counter this document does not carry, and the count is the holder's Agility rather than a printed number.",
    "\"spend a token from this card\" moves the same uncarried counter, so there is nothing to decrement.",
  ],
  "domainCard:Forager": [
    "\"(Clear 2 Stress)\", \"(Gain 2 Hope)\", \"(Clear 2 Hit Points)\" and the rest of the d6 table describe the consumable you foraged and add to your inventory - they are that item's effect when it is used later, not a press on this card.",
  ],
  "domainCard:Force of Nature": [
    "\"gain a +10 bonus to the damage roll\" on a successful attack lasts only while transformed, which is not one of the printed durations — the form ends when you cannot pay the Hope",
    "\"You can't be Restrained\" is an immunity to a registered condition, not an application of one; apply-condition would put it on somebody",
  ],
  "domainCard:Forceful Push": [
    "\"Make an attack with your primary weapon against a target within Melee range\" — no kind in this vocabulary is a weapon attack roll, and the card names no trait for roll-trait to use",
    "\"add a <b>d6</b> to your damage roll\" — a bonus die on the weapon's own damage roll, not an expression this card rolls",
  ],
  "domainCard:Forest Sprites": [
    "\"Your allies gain a +3 bonus to attack rolls against adversaries within Melee range of a sprite\" is the allies' bonus, not the holder's.",
    "\"An ally who marks an Armor Slot while within Melee range of a sprite can mark an additional Armor Slot\" is the ally's mark, not the holder's - a press here would spend the caster's own armour.",
  ],
  "domainCard:Fortified Armor": [
    "\"gain a +2 bonus to your damage thresholds\" — a standing passive while armor is worn: nothing is pressed and no duration is printed, so it belongs to the modifier system rather than to grant-effect",
  ],
  "domainCard:Frenzy": [
    "\"you can go into a Frenzy\" names a state that is not in the registered condition list — Frenzied is not one of them",
    "\"you gain a +10 bonus to your damage rolls and a +8 bonus to your Severe damage threshold\" lasts \"until there are no more adversaries within sight\", which is none of the printed durations; and \"you can't use Armor Slots\" has no modifier target, so any grant-effect here would implement half the rule",
  ],
  "domainCard:Geometry of Ruin": [
    "\"Targets you succeed against must make a <b>Reaction Roll (16)</b>\" is the targets' roll, not the holder's - a Reaction Roll gets no button here.",
    "\"Targets who succeed take half damage\" is halving applied to a target after the dice land, which belongs with the damage dialog rather than with the expression the caster rolls.",
  ],
  "domainCard:Gifted Tracker": [
    "\"<b>spend any number of Hope</b>\" prints no amount, so there is no sum to charge.",
    "\"gain a +1 bonus to your Evasion against them\" is a standing conditional passive with no press and no printed duration.",
  ],
  "domainCard:Glancing Blow": [
    "\"deal weapon damage using half your Proficiency\" is not the weapon’s printed damage roll — the halved Proficiency has no expression here, and a plain weapon-damage button would roll the full one.",
  ],
  "domainCard:Glyph of Nightfall": [
    "\"temporarily reducing the target’s Difficulty by a value equal to your Knowledge (minimum 1)\" moves a number on the TARGET's stat block, and the amount is the holder's Knowledge rather than a printed value.",
  ],
  "domainCard:Goad Them On": [
    "\"the target must mark a Stress\" — the taunted target marks it, not the holder",
  ],
  "domainCard:Grace-Touched": [
    "\"force them to mark that number of Stress\" is the target’s cost — the holder pays nothing when this fires.",
  ],
  "domainCard:Ground Pound": [
    "\"must make a Reaction Roll (17)\" is the TARGETS' roll, not the holder's",
    "\"Targets who succeed take half damage\" is what happens to a target after the dice land; halving is not encoded on a damage expression",
  ],
  "domainCard:Healing Field": [
    "\"you and all allies in the area\" also clears Hit Points on every ally; only the holder's own clear is authored, because an ally's Hit Points are on the ally's sheet.",
  ],
  "domainCard:Healing Hands": [
    "\"clear 2 Hit Points or 2 Stress on the target\" — the clearing lands on a creature other than yourself and clear has no subject; the holder's Stress is charged and the healing is left to the table",
  ],
  "domainCard:Healing Strike": [
    "\"clear a Hit Point on an ally within Close range\" lands on the ALLY's sheet, not the holder's — the Hope is the holder's price and is charged; the clearing is somebody else's",
  ],
  "domainCard:Hideous Retribution": [
    "\"make a reaction roll against the target using your Spellcast trait\" is a Reaction Roll, which gets no button.",
  ],
  "domainCard:Hold the Line": [
    "\"the GM spends 2 Fear on their turn to clear it\" is the GM’s cost, not the holder’s.",
  ],
  "domainCard:Hungry Fire": [
    "\"An <i>Ablaze</i> creature takes an extra <b>1d8</b> magic damage the first time it's spotlighted in a scene\" — a second expression the document's cardDamage does not carry, and it fires on the target's spotlight rather than on any press of the holder's",
  ],
  "domainCard:Hypnotic Shimmer": [
    "\"forces them to mark a Stress\" — the Stress belongs to the stunned targets, not to the holder",
  ],
  "domainCard:I Am Your Shield": [
    "\"you can mark any number of Armor Slots\" prints no amount, so there is nothing fixed to charge.",
  ],
  "domainCard:Inevitable": [
    "\"your next action roll has advantage\" — advantage on a roll you have not made yet, which the roll popover asks about at the moment you make it",
  ],
  "domainCard:Inspirational Words": [
    "\"place a number of tokens on this card equal to your Presence\" names a counter this document does not carry, and the count is the holder's Presence rather than a printed number.",
    "\"Your ally clears a Stress.\" and \"Your ally gains a Hope.\" land on the ALLY's sheet; nothing here is the holder's to clear or gain.",
  ],
  "domainCard:Invigoration": [
    "\"you can spend any number of Hope and roll that many d6s\" is the holder's price twice over and neither half can be written: the Hope is a number the player chooses and the pool of d6s is that same unknown count",
  ],
  "domainCard:Invisibility": [
    "\"Place a number of tokens on this card equal to your Spellcast trait\" names a counter this document does not carry, and the count is the holder's Spellcast trait rather than a printed number.",
    "\"spend a token from this card\" is spent by the <i>Invisible</i> creature acting, which may be an ally, and moves the same uncarried counter.",
  ],
  "domainCard:Jump Scare": [
    "\"until they mark 1 or more Hit Points\" is the target's mark ending the condition, not a cost - it is a duration clause.",
  ],
  "domainCard:Know Thy Enemy": [
    "The card names two currencies in two separate sentences - a Hope for the information and a Stress for the Fear removal - so they are two presses. One button charging both is the double-charge this file exists to prevent.",
  ],
  "domainCard:Lead By Example": [
    "\"The next PC to make an attack against that adversary can clear a Stress or gain a Hope\" is another player character's press, not the holder's.",
  ],
  "domainCard:Lean On Me": [
    "\"you can both clear 2 Stress\" also clears the ally's Stress; only the holder's half is authored.",
  ],
  "domainCard:Life Ward": [
    "\"they clear a Hit Point instead\" — the Hit Point is cleared on the warded ally, at the moment they would make a death move, not by the holder pressing anything",
  ],
  "domainCard:Manifest Wall": [
    "\"create a temporary magical wall\" that \"stays up until your next rest\" is a conjured object with a duration, not a bonus carrying modifiers - grant-effect would misfile it as a buff on the caster.",
  ],
  "domainCard:Mass Disguise": [
    "\"A disguised creature has advantage on Presence Rolls to avoid scrutiny\" is advantage on somebody else's roll, with no printed duration and no modifier target for advantage.",
    "\"Activate a Countdown (8)\" is a countdown, which this vocabulary has no kind for.",
  ],
  "domainCard:Mass Enrapture": [
    "\"force all Enraptured targets to mark a Stress\" is the TARGETS' cost — the holder's price for it is the Mark a Stress already annotated",
  ],
  "domainCard:Master of the Craft": [
    "\"Gain a permanent +2 bonus to two of your Experiences\" is permanent rather than one of the printed durations, and an Experience is not a modifier target.",
  ],
  "domainCard:Mending Touch": [
    "\"clear a Hit Point or a Stress on them\" is cleared on the CREATURE being healed, not on the holder; the Hope is the holder's and is charged, the clearing is not.",
    "\"you can clear 2 Hit Points or 2 Stress on them instead\" is the same clearing on somebody else, once per long rest.",
  ],
  "domainCard:Midnight Spirit": [
    "\"Roll a number of <b>d6s</b> equal to your Spellcast trait\" takes its die count from the holder's Spellcast trait, so no formula can be written from what the card prints.",
  ],
  "domainCard:Natural Familiar": [
    "\"you add a <b>d6</b> to your damage roll\" adds a die to the weapon's damage roll rather than rolling an expression of this card's own.",
  ],
  "domainCard:Never Upstaged": [
    "\"place a number of tokens equal to the number of Hit Points you marked on this card\" counts something this document carries no counter for, and the number is variable — inventing a pool would be inventing the rule.",
    "\"gain a +5 bonus to your damage roll for each token on this card, then clear all tokens\" spends a counter that does not exist here.",
  ],
  "domainCard:Night Terror": [
    "\"The targets must succeed on a Reaction Roll (16)\" is the targets’ roll, not the holder’s.",
    "\"Steal a number of Fear from the GM equal to the number of targets that are <i>Horrified</i>\" takes Fear out of the GM’s pool rather than adding to it, and the amount is variable; there is no press for it here.",
    "\"Roll a number of <b>d6s</b> equal to the number of stolen Fear\" has a count nobody can know at annotation time.",
    "\"While <i>Horrified</i>, they’re <i>Vulnerable</i>\" describes what the condition already means; a second button would put Vulnerable on the targets twice.",
  ],
  "domainCard:No More Waiting": [
    "\"you gain <b>3 Mark</b> instead of 1\" changes the Marked deck’s toll, which the system applies automatically and which must never be authored.",
    "\"the GM gains <b>3 Fear</b> instead of 1\" is the same toll seen from the GM’s side — a gain button here would charge the pool a second time on top of the automatic one.",
  ],
  "domainCard:Not Good Enough": [
    "\"you can reroll any 1s or 2s\" rerolls dice already on a posted damage plate; that is the plate's own reroll handle, not a press that spends or gains anything.",
  ],
  "domainCard:Onslaught": [
    "\"force them to make a Reaction Roll (15)\" is the attacker’s roll, not the holder’s.",
    "\"On a failure, the target must mark a Hit Point\" is the target’s cost — this is the shape that once charged the wielder for a Stress somebody else marked.",
  ],
  "domainCard:Overwhelming Aura": [
    "\"make your Presence equal to your Spellcast trait until your next long rest\" sets a trait to another trait’s value; a modifier adds or scales and cannot say “equal to”, so authoring one would change the number by the wrong amount.",
    "\"an adversary must mark a Stress when they target you with an attack\" is the adversary’s cost, not the holder’s.",
  ],
  "domainCard:Premonition": [
    "\"you can rescind the move and consequences like they never happened\" — undoing the GM's move is a table conversation, not a press this system can hold; the once-per-long-rest limit is a budget and belongs in card-resources.mjs",
  ],
  "domainCard:Preservation Blast": [
    "\"take <b>d8+3</b> magic damage using your Spellcast trait\" scales its die count on the caster's Spellcast trait, so the printed expression is not a fixed one and the document carries no cardDamage entry for it.",
  ],
  "domainCard:Rage Up": [
    "\"gain a bonus to your damage roll equal to twice your Strength\" has no printed duration and scales off a trait, so it is neither a grant-effect nor a number this card prints.",
  ],
  "domainCard:Rain of Blades": [
    "\"they take an extra <b>1d8</b> damage\" is a second expression the document carries no cardDamage entry for, and it fires only on a target that is already <i>Vulnerable</i>.",
  ],
  "domainCard:Reaper’s Strike": [
    "\"force them to mark 5 Hit Points\" is the target's cost, not the holder's.",
    "\"make an attack roll\" is an attack roll rather than a trait roll, and there is no kind for one.",
  ],
  "domainCard:Reassurance": [
    "\"your ally can reroll their dice\" — the reroll is made on the ally's own roll and costs the holder nothing; there is no press here for the holder to take",
  ],
  "domainCard:Redirect": [
    "\"roll a number of <b>d6s</b> equal to your Proficiency\" has a die count taken from the holder's Proficiency, so no formula can be written from what the card prints.",
  ],
  "domainCard:Regrow": [
    "\"that target clears one temporary condition\" removes a condition rather than putting one on, and apply-condition only ever applies.",
  ],
  "domainCard:Rejuvenation Barrier": [
    "\"clear 1d4 Hit Points\" is not authored as a clear: the amount is a rolled die rather than a printed number, and the sentence clears it on you and every ally inside the barrier, which is several sheets. The d4 is offered as a roll and the clearing is left to the table",
  ],
  "domainCard:Rend": [
    "\"deals an extra <b>1d12+3</b> damage\" rides on a later weapon attack rather than being an expression this card rolls, and the document carries no cardDamage entry for it.",
    "\"the target temporarily gains a <b>−1</b> penalty to their damage thresholds\" moves a number on the TARGET's sheet.",
  ],
  "domainCard:Restoration": [
    "\"place a number of tokens equal to your Spellcast trait on this card\" counts something this document carries no counter for.",
    "\"spend any number of tokens to clear 2 Hit Points or 2 Stress for each token spent\" clears a touched creature’s tracks, not necessarily the holder’s, in an amount the card leaves open.",
    "\"spend a token from this card when touching a creature to clear the <i>Vulnerable</i> condition\" removes a condition from somebody else and spends the same absent pool.",
  ],
  "domainCard:Rise Up": [
    "\"Gain a bonus to your Severe threshold equal to your Proficiency\" is a passive modifier the schema already carries, not a granted effect with a printed duration.",
  ],
  "domainCard:Root-Touched": [
    "\"<b>+1</b> bonus to your Spellcast Rolls\" is a passive bonus with no printed duration and nothing to press.",
    "\"you don't gain a Mark and the GM doesn't gain a Fear\" waives the Marked deck’s toll, which the system applies by itself.",
  ],
  "domainCard:Rousing Strike": [
    "\"you and all allies who can see or hear you can clear a Hit Point or 1d4 Stress\" also clears on every ally in earshot; only the holder's own clear is authored, and the 1d4 is offered as a roll rather than as a clear whose amount is a die",
  ],
  "domainCard:Rune Ward": [
    "\"It can be recharged for free on your next rest\" is a refresh the rest already performs, not a press.",
  ],
  "domainCard:Sage-Touched": [
    "\"you gain a +2 bonus to your Spellcast Rolls\" while in a natural environment is a standing conditional bonus with no printed duration and no press",
    "\"you can double your Agility or Instinct when making a roll that uses that trait\" doubles a trait for one roll; no modifier can express a multiplier on the trait the roll happens to use",
  ],
  "domainCard:Salvation Beam": [
    "\"You can clear Hit Points on the targets equal to the number of Stress marked\" clears the allies' Hit Points, not the holder's - clear has no subject and would heal the caster instead.",
  ],
  "domainCard:Scramble": [
    "\"you can avoid the attack and safely move out of Melee range\" — a reaction that spends nothing and rolls nothing; the once-per-rest limit is a budget",
  ],
  "domainCard:Second Wind": [
    "\"you also clear 3 Stress or a Hit Point on an ally within Close range of you\" lands on the ALLY's tracks, not the holder's.",
  ],
  "domainCard:Shadowhunter": [
    "\"you gain a +1 bonus to your Evasion and make attack rolls with advantage\" is a passive conditional state with no press and no printed duration - it belongs to the modifiers system, not to grant-effect.",
  ],
  "domainCard:Share the Burden": [
    "\"Transfer any number of their marked Stress to you, then gain a Hope for each Stress transferred\" is a two-sided move of a count chosen at the table: the ally's marked Stress is cleared and the holder marks it. A press could only perform the holder's half, which would hand out Hope with no Stress leaving the ally.",
  ],
  "domainCard:Shared Trauma": [
    "\"mark any number of Hit Points on a willing creature within Melee range\" prints no amount and marks somebody ELSE's Hit Points, not the holder's.",
    "\"clear an equal number of Hit Points on another willing creature within Melee range\" clears a third party's Hit Points, and the amount is whatever the first creature paid.",
  ],
  "domainCard:Shield Aura": [
    "\"When the target marks an Armor Slot, they reduce the severity of the attack by an additional threshold\" is the target's Armor Slot, not the holder's - the caster pays only the Stress that cast the aura.",
  ],
  "domainCard:Sigil of Retribution": [
    "\"Mark an adversary within Close range with a sigil of retribution\" is placing a sigil on a creature, not marking a resource - a press that read this as a cost would mark the holder's own Stress.",
  ],
  "domainCard:Signature Move": [
    "\"you can roll a d20 as your Hope Die\" changes which die the duality roll uses; that is a property of the roll the popover composes, not a die this card throws, and no kind expresses it",
  ],
  "domainCard:Siphon Essence": [
    "\"you gain a +1 bonus to your Proficiency for this attack\" — a bonus for one attack with no printed duration, so not a grant-effect",
    "\"You clear a number of Hit Points equal to the number of Hit Points the target marked from this attack\" — the amount is whatever the target marked, which the card does not print; writing a number here would be inventing one",
  ],
  "domainCard:Smite": [
    "\"double the result of your damage roll\" multiplies a roll made later by the weapon; nothing in the vocabulary carries a multiplier onto the next attack's damage",
  ],
  "domainCard:Solve": [
    "\"Treat your Hope Die as though it rolled a 12\" overrides the face of a die in a roll the player has not made yet; there is no kind for setting a result and roll-dice would post a second, unrelated die.",
  ],
  "domainCard:Soothing Speech": [
    "\"clear an additional Hit Point on that character\" — that Hit Point is cleared on the character being tended, and clear has no way to name somebody else",
  ],
  "domainCard:Spectral Mist": [
    "\"turns you and allies of your choice within Close range momentarily incorporeal\" names incorporeal, which is not a registered condition, and its \"immune to physical damage\" has no modifier target — the Hope is charged and the state is left to the table",
  ],
  "domainCard:Spellcharge": [
    "\"place tokens equal to the number of Hit Points you marked on this card\" asks for a counter, and this document carries no resource to move; the amount is also read off a hit rather than printed",
    "\"you can spend any number of tokens to add a d6 for each token spent\" spends a pool that does not exist on this document, in an amount the player chooses",
  ],
  "domainCard:Splendor-Touched": [
    "\"+3 bonus to your Severe damage threshold\" is a passive bonus with no printed duration and nothing to press.",
    "\"you can choose to mark that much Stress or spend that much Hope instead\" is the holder’s price, but the amount is whatever the incoming damage demanded and is not printed.",
  ],
  "domainCard:Splintering Strike": [
    "\"roll an additional damage die\" names no die - it is the equipped weapon's own, which this card cannot print, so the extra die is left to the table.",
  ],
  "domainCard:Strategic Approach": [
    "\"place a number of tokens equal to your Knowledge on this card (minimum 1)\" names a counter this document does not carry, and the count is the holder's Knowledge rather than a printed number.",
    "\"You clear a Stress on an ally within Melee range of the adversary.\" clears the ALLY's Stress, not the holder's.",
    "\"You add a <b>d8</b> to your damage roll.\" adds a die to a weapon damage roll rather than rolling an expression of its own.",
  ],
  "domainCard:Stunning Sunlight": [
    "\"spend any number of Hope and force that many targets you succeeded against\" is the holder's price, but the amount is chosen at the moment of casting and this shape holds one fixed number",
    "\"make a Reaction Roll (14)\" is the TARGETS' roll, not the holder's",
  ],
  "domainCard:Summon Horror": [
    "\"deals <b>d8+1</b> magic damage using your Spellcast trait\" — the document carries no cardDamage entry for it, and roll-card-damage may only name an expression the document already holds",
    "\"they must succeed on a <b>Reaction Roll (12)</b> ... or mark an equal number of Stress\" — both the roll and the Stress belong to the target",
  ],
  "domainCard:Support Tank": [
    "\"to allow them to reroll either their Hope or Fear Die\" is a reroll on the ALLY's posted plate, which the ally presses on their own card.",
  ],
  "domainCard:Tactician": [
    "\"they can spend a Hope to add one of your Experiences to their roll\" is the ALLY's Hope, spent on the ally's own roll.",
    "\"you can roll a <b>d20</b> as your Hope Die\" changes the duality pair's die size; that is the roll popover's own control, not a press on this card.",
  ],
  "domainCard:Telekinesis": [
    "\"You can throw the lifted target as an attack by making an additional Spellcast Roll against the second target\" names a second roll as a gerund rather than asking for one. The card's only imperative is the opening Spellcast Roll, which already carries its button, so a second identical Spellcast press distinguished only by a when would be two buttons for one printed instruction.",
  ],
  "domainCard:Teleport": [
    "\"gain a +3 bonus\" / \"gain a +1 bonus\" / \"gain a −2 penalty\" are situational modifiers the player picks for this one Spellcast Roll from how well they know the place; they are not a timed effect anybody grants",
  ],
  "domainCard:Tell No Lies": [
    "\"they must mark a Stress and the effect ends\" — the Stress is marked by the target who refuses to answer, not by the holder",
  ],
  "domainCard:Tempest": [
    "\"until the GM spends a Fear on their turn to end this spell\" is the GM’s cost, not the holder’s.",
  ],
  "domainCard:Terrify": [
    "\"the target marks <b>1d4</b> Stress\" — the die is the holder's to roll and is annotated as such, but the Stress it produces is the target's and is charged to nobody here",
  ],
  "domainCard:The Answer": [
    "\"you gain <b>3 Mark</b> instead of 1\" changes the Marked deck’s toll, which the system applies automatically and which must never be authored.",
    "\"the GM gains <b>3 Fear</b> instead of 1\" is the same toll seen from the GM’s side — a gain button here would charge the pool a second time on top of the automatic one.",
  ],
  "domainCard:The Beast": [
    "\"a <b>d6</b> bonus to your damage rolls\" — a die rather than a value, and a grant-effect modifier carries a number; it is left off the effect rather than guessed at",
  ],
  "domainCard:The Long Memory": [
    "\"must make a Reaction Roll (16)\" is the TARGET's roll, not the holder's",
    "\"they mark 4 Hit Points\" and \"they mark 2 Hit Points\" are the TARGET's cost, not the holder's — the exact shape the old parser charged the wielder for",
  ],
  "domainCard:The Root Remembers": [
    "\"The GM's move is rescinded as though it never happened\" — Premonition's rule in the Root deck, declined for its reason",
  ],
  "domainCard:The Undergrowth Wakes": [
    "\"All targets in the area must make a <b>Reaction Roll (18)</b>\" is the targets' roll, not the holder's.",
    "\"Targets who succeed take half damage\" is halving applied to a target after the dice land, not part of the expression the caster rolls.",
  ],
  "domainCard:The World Tree": [
    "\"Any creature that touches it clears all their Hit Points and Stress\" lands on whichever creature touches the tree, holder or not, and \"all\" is not an amount this shape can hold",
  ],
  "domainCard:Thorn Skin": [
    "\"place a number of tokens equal to your Spellcast trait on this card\" moves a counter this document does not carry, and the count scales off a trait rather than being printed.",
    "\"spend any number of tokens to roll that number of <b>d6s</b>\" is a variable spend whose die count is the spend - no formula this card prints.",
  ],
  "domainCard:Thorn Spray": [
    "\"temporarily gain a <b>−1</b> penalty to their Difficulty\" — a penalty on the targets' Difficulty, which is neither a registered condition nor a modifier target this system has",
  ],
  "domainCard:Through Your Eyes": [
    "\"You can transition between using your own senses or the target's freely\" — a state with a duration and no modifier, held by the fiction rather than by a track",
  ],
  "domainCard:Transcendent Union": [
    "\"when a creature connected by this union would mark Stress or Hit Points, the connected creatures can choose who marks it\" redirects somebody else’s marking; it is not a cost the holder pays by pressing anything.",
  ],
  "domainCard:Troublemaker": [
    "\"roll a number of <b>d4s</b> equal to your Proficiency\" takes its die count from the holder's Proficiency, so no formula can be written from what the card prints.",
    "\"The target must mark Stress equal to the highest result rolled.\" is the TARGET's Stress — this is exactly the cost the old parser charged the wielder for.",
  ],
  "domainCard:Twilight Toll": [
    "\"place a token on this card\" and \"spend any number of tokens\" move a counter this document does not carry - there is no resource on this unit to name, and inventing one is forbidden.",
    "\"add a <b>d12</b> for each token spent to your damage roll\" is a die count equal to a spend chosen at the table, not a formula this card prints.",
  ],
  "domainCard:Umbral Veil": [
    "\"place a number of tokens on this card equal to the number of Fear in the GM’s pool\" names a counter this document does not carry, and its size is read off a world setting rather than printed.",
    "\"you can spend any number of tokens to give the result a −1 penalty per token spent\" prints no amount and moves the same uncarried counter.",
  ],
  "domainCard:Unbreakable": [
    "\"clear a number of Hit Points equal to the result\" cannot be a clear: the amount is the d6 just rolled. The die is offered and the clearing is left to the table",
  ],
  "domainCard:Uncanny Disguise": [
    "\"Place a number of tokens equal to your Spellcast trait on this card\" — the document carries no counter in its resources, so there is nothing to place",
    "\"spend a token from this card\" — same missing counter, and it is spent by taking an action rather than by pressing anything",
  ],
  "domainCard:Unleash Chaos": [
    "\"place a number of tokens equal to your Spellcast trait on this card\" — this document carries no counter in its resources, so there is nothing to place tokens on; inventing one is forbidden",
    "\"spend any number of tokens\" — same missing counter, and the number is chosen at the moment of casting rather than printed",
    "\"roll a number of <b>d10s</b> equal to the tokens you spent\" — the die count is the tokens spent, so no formula can be written; the card also carries no cardDamage expression",
  ],
  "domainCard:Untouchable": [
    "\"Gain a bonus to your Evasion equal to half your Agility.\" is a standing passive with no press and no printed duration; it belongs to the modifier system, not to an authored action.",
  ],
  "domainCard:Unyielding Armor": [
    "\"roll a number of <b>d6s</b> equal to your Proficiency\" scales with Proficiency, so there is no formula to write.",
    "\"reduce the severity by one threshold without marking an Armor Slot\" is a change to how a hit is measured, and this vocabulary has no press for it.",
  ],
  "domainCard:Valor-Touched": [
    "\"+1 bonus to your Armor Score\" is a passive bonus with no printed duration and nothing to press.",
  ],
  "domainCard:Vector": [
    "\"take <b>1d10</b> physical damage for each range increment fallen\" repeats an unknown number of times, so the expression the card prints is not the one anybody rolls, and the document carries no cardDamage entry for it.",
  ],
  "domainCard:Veil of Night": [
    "\"You’re considered <i>Hidden</i> to adversaries on the other side of the veil\" — a state relative to one side of the curtain rather than a condition the card puts on you; applying Hidden outright would claim more than the card says",
  ],
  "domainCard:Vitality": [
    "\"permanently gain two of the following benefits\" — One Stress slot, One Hit Point slot, +2 to damage thresholds — is a permanent change to the character's definition, not a timed effect and not a clear; it belongs to advancement, not to a button",
    "\"place this card in your vault permanently\" moves the card between loadout and vault, which is not one of the fifteen kinds",
  ],
  "domainCard:Voice of Dread": [
    "\"they must <b>mark a Stress</b>\" — bolded like a price, but it is the tormented creature that marks it, not the holder",
  ],
  "domainCard:Voice of Reason": [
    "\"you gain a +1 bonus to your Proficiency for damage rolls\" — a standing conditional bonus while every Stress slot is marked: nothing is pressed and no duration is printed",
  ],
  "domainCard:Void-Touched": [
    "\"<b>+1</b> bonus to your Spellcast Rolls\" is a passive bonus with no printed duration and nothing to press.",
    "\"you don't gain a Mark and the GM doesn't gain a Fear\" waives the Marked deck’s toll, which the system applies by itself; a button here would be a second opinion about a charge nobody made by pressing.",
  ],
  "domainCard:Wall of Hunger": [
    "\"A creature inside the wall when it appears or that passes through it must <b>mark 2 Stress</b>\" is the creature’s cost, not the holder’s — exactly the reading that once charged the wielder for somebody else’s Stress.",
  ],
  "domainCard:Wild Fortress": [
    "\"lasts until it marks 3 Hit Points. Place tokens on this card to represent marking Hit Points\" counts the dome's Hit Points, not the holder's, and this document carries no resource to hold them",
  ],
  "domainCard:Wildfire": [
    "\"All targets within Close range of it must make a Reaction Roll (15)\" is the TARGETS' roll, not the holder's",
    "\"Targets who succeed take half damage\" is what happens to a target after the dice land; halving is not encoded on a damage expression",
  ],
  "domainCard:Words of Discord": [
    "\"the target must mark a Stress\" is the TARGET's cost on a successful cast, not the holder's — this is exactly the shape the old parser charged the wielder for",
    "\"gain a −5 penalty to the Spellcast Roll\" applies the next time you cast this on the same target; it is a situational modifier the GM adjudicates, with no duration and no press",
  ],
  "domainCard:Zone of Protection": [
    "\"they reduce it by the die’s value\" is the ally's damage reduction, not a resource the holder spends.",
  ],
  "feature:Aggressive": [
    "\"Gain a −1 penalty to your Evasion\" is a permanent passive modifier with no press and no duration.",
    "\"roll an additional damage die and discard the lowest result\" names no die — it is the equipped weapon's own, so there is no formula to write.",
  ],
  "feature:Anchored": [
    "\"Gain a +2 bonus to your damage thresholds\" is a passive modifier held while in the stance, with no printed duration and nothing to press",
  ],
  "feature:Crushing": [
    "\"force the target to mark an additional Hit Point\" is the TARGET's cost, not the holder's.",
  ],
  "feature:Defensive": [
    "\"unless the attacker marks a Stress to negate the disadvantage\" is the ATTACKER's cost, not the holder's. This is the Scary shape exactly: the wielder would be charged for a Stress somebody else marks.",
  ],
  "feature:Exacting": [
    "\"When you roll a 1 on a damage die, you can treat it as the highest value\" rewrites a die already rolled elsewhere; it is not a damage roll this card makes",
  ],
  "feature:Favored": [
    "\"Gain a bonus to damage rolls equal to a trait of your choice\" is a standing passive modifier, not a `gain` — and the bonus is a trait score the card never names as a number.",
  ],
  "feature:Grappling": [
    "\"you can spend a Focus\" — Focus is not a currency `amount` can hold, so only the Stress half is offered.",
    "\"temporarily *Restrain* the target or throw the target up to Close range\" is a choice between two outcomes, so no `apply-condition` is attached to the press — a button that Restrained would take the branch away from the player.",
  ],
  "feature:Honed": [
    "\"Spend a Focus before you make an attack roll\" is a Focus cost, which is not one of the five currencies `amount` can hold.",
    "\"+1 bonus to your Proficiency for that attack\" lasts one attack, which is not one of the printed durations `grant-effect` accepts.",
  ],
  "feature:Invigorating": [
    "\"gain a Focus\" names the Martial Artist's Focus pool, which is not one of hope/stress/hitPoints/armorSlots/fear and is not a counter this document carries — there is nothing for an action to move",
  ],
  "feature:Isolating": [
    "\"Gain advantage on attack rolls\" is a conditional passive with no printed duration and nothing to press",
  ],
  "feature:Otherworldly": [
    "\"you can deal physical or magic damage\" chooses the damage type of the weapon's own roll; it is not a second damage roll and this document carries no damage expression",
  ],
  "feature:Quick": [
    "\"you can spend a Focus\" is the alternative cost, and Focus is not one of the five currencies `amount` can hold, so only the Stress half of the offer is pressable.",
  ],
  "feature:Reliable": [
    "\"Gain a +1 bonus to your attack rolls\" is a passive modifier with no printed duration and nothing to press; it belongs to the modifier system, not to grant-effect",
  ],
  "feature:Scary": [
    "\"the target must mark a Stress\" is the TARGET's cost, not the holder's — this is the exact clause the old parser charged the wielder for",
  ],
  "feature:Stable": [
    "\"You can spend a Focus instead of an Armor Slot to reduce damage\" is entirely a Focus cost, which `amount` cannot express, and the Armor Slot is what it avoids rather than what it charges.",
  ],
  "feature:Vigilant": [
    "\"gain a <b>d6</b> bonus to your Evasion against the attack\" is a die-sized bonus; a modifier carries a fixed value or a scaled source and cannot express a rolled one",
  ],
  "loot:Airblade Charm": [
    "\"Three times per rest, you can activate the charm and attack a target within Close range\" — an attack is not one of the fifteen kinds, and the three-per-rest budget has no counter on this document to spend.",
  ],
  "loot:Arcane Prism": [
    "\"All allies within Close range of it gain a +1 bonus to their Spellcast Rolls\" is a bonus on somebody else, not the holder, and its duration is \"while activated\" rather than a printed one.",
    "\"it can’t be activated again until your next long rest\" is a use limit against a counter this document does not carry.",
  ],
  "loot:Attune Relic": [
    "\"You gain a +1 bonus to your Instinct\" is a passive modifier with no press and no printed duration; it belongs to the modifier system, not to grant-effect",
  ],
  "loot:Augur’s Relic": [
    "\"activate your Hope feature without spending Hope\" waives the Hope feature's cost; reading it as a spend would charge the holder for exactly the payment the card removes",
  ],
  "loot:Bag of Ficklesand": [
    "\"with a successful Presence Roll (10)\" names the holder's roll and a Difficulty, but states it as a condition of success rather than asking for it in the imperative, so it gets no roll button.",
    "\"on a successful Finesse Roll (10)\" is the same shape — a success being described, not a roll being called for; the Vulnerable it gates is annotated with the clause as its printed precondition.",
  ],
  "loot:Belt of Unity": [
    "\"lead a Tag Team Roll with three PCs\" names a roll this system does not implement and which is not one trait roll by the holder; only the 5 Hope is authored",
  ],
  "loot:Bloodstone": [
    "\"When you roll the maximum value on a damage die, roll an additional damage die\" prints no die size — the die is whichever weapon the stone is attached to, so no formula can be written honestly.",
  ],
  "loot:Bolster Relic": [
    "\"You gain a +1 bonus to your Strength\" is a passive modifier with no press and no printed duration; it belongs to the modifier system, not to grant-effect",
  ],
  "loot:Caltrops": [
    "\"A creature hastening through that area must mark a Stress\" is the creature crossing the caltrops paying, not the holder — this is the Scary shape, and charging the wielder would be exactly the old parser's error.",
  ],
  "loot:Charging Quiver": [
    "\"gain a bonus to the damage roll equal to your current tier\" reads like a gain, but it is a passive numeric modifier on the weapon's damage roll with no printed duration — the modifier system's job, not a press.",
  ],
  "loot:Charm Relic": [
    "\"You gain a +1 bonus to your Presence\" is a standing trait modifier with no printed duration — the modifier system's, not a press.",
  ],
  "loot:Control Relic": [
    "\"You gain a +1 bonus to your Finesse\" is a standing trait modifier with no printed duration — the modifier system's, not a press.",
  ],
  "loot:Corrector Sprite": [
    "\"you can gain advantage on an attack roll\" looks like a gain, but advantage is not a resource this vocabulary can hand over — it is a term on a roll the popover composes.",
  ],
  "loot:Crucible Frames": [
    "\"gain advantage on an attack roll\" is what the Hope buys, and advantage has no kind in this vocabulary; only the payment is authored",
  ],
  "loot:Eclipse Coin": [
    "\"flip a coin\" prints no die, so there is no formula to roll; the two outcomes are offered as separately labelled grants instead",
  ],
  "loot:Enlighten Relic": [
    "\"You gain a +1 bonus to your Knowledge\" is a passive modifier with no press and no printed duration; it belongs to the modifier system, not to grant-effect",
  ],
  "loot:Escher’s Mirrorball": [
    "\"Once per long rest\" — a budget and nothing more; it belongs in card-resources.mjs, and what the press would do has no mechanical effect to apply",
  ],
  "loot:Fire Jar": [
    "\"The contents regenerate when you take a long rest\" reads like a refresh, but this document carries no counter to refill and inventing one is forbidden.",
  ],
  "loot:Gem of Alacrity": [
    "\"use your Agility when making an attack with that weapon\" names a trait beside an attack, but it overrides the weapon's own trait rather than asking for a roll.",
  ],
  "loot:Gem of Audacity": [
    "\"use your Presence when making an attack with that weapon\" names a trait beside an attack, but it overrides the weapon's own trait rather than asking for a roll.",
  ],
  "loot:Gem of Insight": [
    "\"use your Instinct when making an attack with that weapon\" substitutes the trait on an attack made with the attached weapon; it is not an instruction to roll and this item is not the weapon",
  ],
  "loot:Gem of Might": [
    "\"use your Strength when making an attack with that weapon\" substitutes the trait on an attack made with the attached weapon; it is not an instruction to roll and this item is not the weapon",
  ],
  "loot:Gem of Precision": [
    "\"use your Finesse when making an attack with that weapon\" names a trait beside an attack, but it overrides the weapon's own trait rather than asking for a roll.",
  ],
  "loot:Gem of Sagacity": [
    "\"use your Knowledge when making an attack with that weapon\" substitutes the trait on an attack made with the attached weapon; it is not an instruction to roll and this item is not the weapon",
  ],
  "loot:Gloves of Alacrity": [
    "\"When you would mark a Stress to reload a weapon, you don’t mark it\" contains \"mark a Stress\" as a cost being waived, not charged — a pay button here would take the very Stress the gloves save.",
  ],
  "loot:Grapnel": [
    "\"You gain advantage on action rolls to climb sheer surfaces\" is a passive bonus with no press and no duration; advantage has no kind in this vocabulary",
  ],
  "loot:Greatstone": [
    "\"roll an additional damage die and discard the lowest result\" is printed as a feature the attached WEAPON gains; it modifies that weapon's damage roll and is not a press on this item",
  ],
  "loot:Hero’s Helm": [
    "\"all allies within Close range gain a Hope\" is Hope landing on other characters, not on the holder — whose gain it is, is the whole question, and it is not the wearer's.",
  ],
  "loot:Honing Relic": [
    "\"You gain a +1 bonus to an Experience of your choice\" looks like a gain; it is a standing bonus on an Experience, which is not a modifier target and is chosen by the player rather than by a press.",
  ],
  "loot:Insomniac’s Periapt": [
    "\"without clearing Hit Points or Stress\" names clearing only to say it did not happen; it is a precondition on the grant, never a clear the holder presses",
  ],
  "loot:Iron Dagger Pendant": [
    "\"pulls you toward that creature's current location until your next long rest\" is a printed duration on a fictional state with no modifier to carry; not a grant-effect",
  ],
  "loot:Iron Veil": [
    "\"renders the wearer invisible to fey creatures\" names invisibility, but it is a permanent property of the worn veil against one kind of creature rather than the registered Invisible condition being applied by a press.",
  ],
  "loot:Kingfisher’s Net": [
    "\"Once per long rest\" — a budget and nothing more; it belongs in card-resources.mjs, and what the press would do has no mechanical effect to apply",
  ],
  "loot:Lorekeeper": [
    "\"You gain a +1 bonus to action rolls against those creatures\" is a standing passive modifier with no printed duration, not a press.",
  ],
  "loot:Namer’s Oracle": [
    "\"you can roll this set of runic dice\" prints neither a die size nor a count, so no formula can be written.",
  ],
  "loot:Paragon’s Chain": [
    "\"roll a d20 as your Hope Die\" is not a die this card rolls; it changes the size of the duality roll's Hope Die, which the roll popover owns.",
  ],
  "loot:Phobophage’s Circlet": [
    "\"When the GM spends a Fear\" is the GM's expenditure and the trigger for the d4, not a cost the holder pays.",
  ],
  "loot:Phoenix Feather": [
    "\"you gain a +1 bonus to the roll you make to determine whether you gain a scar\" looks like a gain and is a passive modifier on a death move this system does not implement.",
  ],
  "loot:Piercing Arrows": [
    "\"you can add your Proficiency to the damage roll\" modifies a weapon damage roll you are already making; it is not a press and the card rolls no dice of its own",
    "\"Three times per rest\" names a use budget, but this document carries no counter to move",
  ],
  "loot:Portal Seed": [
    "\"The portal is ready to use in 24 hours\" — a thing in the world with a lifetime measured in days; nothing here is a press or a track",
  ],
  "loot:Quillshawl": [
    "\"they must succeed on a <b>Reaction Roll (12)</b>\" is the attacking adversary's Reaction Roll, which gets no button",
    "\"or mark a Hit Point\" is the ADVERSARY's cost, not the holder's",
  ],
  "loot:Reliquary of the Sightless Saint": [
    "\"You gain a +1 bonus to your Hope Die when you make the Risk It All death move\" is a passive modifier on a death move this system does not implement, and the Hope Die is not a modifier target",
  ],
  "loot:Ring of Resistance": [
    "\"activate this ring after a successful attack against you to halve the damage\" is incoming-damage reduction, which no kind here expresses, and it costs the holder nothing",
    "\"Once per long rest\" names a use budget, but this document carries no counter to move",
  ],
  "loot:Ring of Silence": [
    "\"Your footsteps are silent until your next rest\" is a printed duration on a fictional state carrying no modifier this system can hold; not a grant-effect",
  ],
  "loot:Ring of Unbreakable Resolve": [
    "\"when the GM spends a Fear\" is the GM's expenditure and the trigger for this ring, not a cost the holder pays — only the 4 Hope is theirs.",
  ],
  "loot:Rings of Alliance": [
    "\"without spending Hope\" names Hope in order to say none is spent; a Hope-spend reading would charge the holder for a cost the card waives",
    "\"initiate a Tag Team Roll\" names a roll this system does not implement and which is not one trait roll by the holder",
  ],
  "loot:Rings of Camaraderie": [
    "\"You can mark the Stress of whoever is wearing the other ring (with their permission) as if it were your own\" marks somebody else's track; a pay button would charge the holder the Stress the other wearer owes.",
  ],
  "loot:Rings of Friendship": [
    "\"You can spend the Hope of whoever is wearing the other ring\" spends ANOTHER character's Hope, not the holder's, and prints no amount; a pay here would charge the wrong purse",
  ],
  "loot:Skeleton Key": [
    "\"you gain advantage on the Finesse Roll\" describes a bonus to a roll you are already making, not an instruction to make one; advantage has no kind in this vocabulary",
  ],
  "loot:Sorcerer’s Hat": [
    "\"you can cast a spell from your vault with a Recall Cost equal to or less than your tier\" is a free recall of a vaulted card; there is no kind for moving a card out of the vault, and no counter on this document for the once-per-rest limit.",
  ],
  "loot:Stride Relic": [
    "\"You gain a +1 bonus to your Agility\" is a standing trait modifier with no printed duration — the modifier system's, not a press.",
  ],
  "loot:Traveler’s Bell": [
    "\"Once per long rest\" — a budget and nothing more; it belongs in card-resources.mjs, and what the press would do has no mechanical effect to apply",
  ],
  "loot:Two-Faced Aegis Brooch": [
    "\"Once per rest, flip a coin\" is a randomiser this vocabulary has no die for; writing it as 1d2 would be inventing a die the card does not print.",
  ],
  "loot:Valorstone": [
    "\"reduce the severity by one threshold without marking an Armor Slot\" looks like a payment being waived; there is no kind for moving a hit down the severity ladder, and \"without marking an Armor Slot\" is the absence of a cost rather than one.",
  ],
  "loot:Woven Net": [
    "\"A trapped target can break free with a successful Attack Roll (16)\" is the TARGET's roll, not the holder's",
  ],
  "subclass:Beastbound: Mastery": [
    "\"Once per long rest\" is a use budget and this document carries no counter to spend or refresh",
    "\"take that damage instead\" moves a hit between the holder and the companion; the amount is the attack's and neither side's cost can be authored",
  ],
  "subclass:Beastbound: Specialization": [
    "\"you gain a +2 bonus to your Evasion against the attack\" is a conditional passive modifier with no printed duration and nothing to press.",
  ],
  "subclass:Call of the Brave: Foundation": [
    "\"Once per long rest\" is a use budget and this document carries no counter to move or refresh",
  ],
  "subclass:Call of the Brave: Mastery": [
    "\"they only need to spend 2 Hope to do so\" is the ALLY's cost to initiate a Tag Team Roll, not the holder's",
  ],
  "subclass:Call of the Brave: Specialization": [
    "\"you can roll a <b>d20</b> as your Hope Die\" replaces a die the duality roll already throws; it is not a die this card rolls and there is nothing to press.",
  ],
  "subclass:Call of the Slayer: Foundation": [
    "\"gain a Hope per die cleared\" is an amount the card does not print — it is the size of the pool at that moment — so no gain is authored beside the clear.",
  ],
  "subclass:Call of the Slayer: Mastery": [
    "\"You and each ally who chooses this downtime move gain a d6 Slayer Die\" hands a die to the whole party; this unit names no die pool on the document and a party-wide grant cannot be expressed by placing one die on this card",
    "\"A PC with a Slayer Die can spend it to roll the die\" is every holder's own die, spent on their own card, not a press on this one",
  ],
  "subclass:Call of the Slayer: Specialization": [
    "\"when you roll your Slayer Dice, reroll any 1s\" names a die pool this document does not carry — the Slayer Dice live on the Foundation card — and rerolling ones is not a die-pool op",
  ],
  "subclass:Divine Wielder: Foundation": [
    "\"clear 2 Hit Points or 2 Stress from them\" clears from the touched creature, not the holder, and offers a choice between two tracks; clear carries no subject",
    "\"Once per long rest\" is a use budget with no counter on this document",
  ],
  "subclass:Divine Wielder: Mastery": [
    "\"When you roll damage for your “Spirit Weapon” feature\" looks like a damage press, but the rule only changes how dice already rolled are counted",
  ],
  "subclass:Divine Wielder: Specialization": [
    "\"you can roll an additional die and discard the lowest result\" moves the Prayer Dice pool, which is declared on the Foundation card; this document carries no die pool to act on.",
    "\"use your “Sparing Touch” feature twice instead of once per long rest\" raises another card's use limit; there is no counter on this document to refresh.",
  ],
  "subclass:Elemental Origin: Foundation": [
    "\"either gain a +2 bonus to the roll or a +3 bonus to the roll's damage\" is a choice made after the Hope is spent, applying to one roll rather than for a printed duration",
  ],
  "subclass:Elemental Origin: Mastery": [
    "\"+1 bonus to a character trait of your choice\" names no trait, and the vocabulary needs one — authoring it would mean inventing the choice",
  ],
  "subclass:Executioners Guild: Foundation": [
    "\"you deal double damage\" multiplies a roll made from the weapon elsewhere; it prints no expression of its own and there is nothing to press.",
    "\"Your “Marked for Death” feature uses <b>d6s</b> instead of <b>d4s</b>\" resizes a die pool carried by another document",
  ],
  "subclass:Executioners Guild: Mastery": [
    "\"Your “Marked for Death” feature uses d8s instead of d6s\" prints dice this card never rolls; it changes the die size of a pool on another card",
  ],
  "subclass:Executioners Guild: Specialization": [
    "\"force them to mark an additional Hit Point\" is the TARGET's cost, not the holder's; only the Stress above it is paid here",
    "\"a creature you’ve <i>Marked for Death</i>\" names the condition as a precondition and does not apply it; the +2 Evasion is a conditional passive modifier.",
  ],
  "subclass:Hedge: Foundation": [
    "\"Spend any number of Hope to place an equal number of tokens on this card\" has no printed amount; a pay button would have to invent one",
    "\"place an equal number of tokens on this card\" and \"spend a token\" move a counter this unit does not name; no resource is carried, and inventing one is forbidden",
    "\"Once per rest\" is a use budget with no counter on this document",
    "\"increase the number cleared by 1\" modifies a clear somebody else's consumable performed — it clears nothing on its own and fires automatically",
  ],
  "subclass:Hedge: Mastery": [
    "\"place a number of tokens equal to your Spellcast trait on this card\" and \"Remove a token each time\" move a counter this unit does not name",
    "\"you and your allies gain a +2 bonus to damage thresholds, attack rolls, and Evasion\" is held only while inside the circle and reaches allies as well as the holder; neither the position nor the party scope can be expressed",
    "\"Once per rest\" is a use budget with no counter on this document",
  ],
  "subclass:Hedge: Specialization": [
    "\"Place a number of tokens equal to your Spellcast trait on this card\" names a counter this document does not declare, and its size is a trait rather than a printed number.",
    "\"You have advantage on attacks against <i>Hexed</i> creatures\" reads a registered condition rather than applying one, and advantage is not a press",
  ],
  "subclass:Juggernaut: Foundation": [
    "\"force them to mark a Stress\" is the TARGET's cost; the holder pays only the Hope",
    "\"Gain a permanent +3 bonus to your Severe damage threshold\" is a permanent passive modifier with no duration and nothing to press",
  ],
  "subclass:Juggernaut: Mastery": [
    "\"gain a +1 bonus to your Proficiency for that attack\" lasts for one attack rather than for a printed duration, and Proficiency-for-an-attack is the attack's own arithmetic",
  ],
  "subclass:Juggernaut: Specialization": [
    "\"spend any number of Hope\" prints no amount; a pay of one would invent a unit the card never states.",
    "\"to force them to mark the same number of Hit Points\" is the ADVERSARY's cost, and the number is not printed",
  ],
  "subclass:Martial Artist: Mastery": [
    "\"Once per rest\" is a use budget and this document carries no counter",
    "\"you can spend a Focus instead of marking a Stress to start a combo strike\" spends Focus, which is not a currency an amount carries and is not a counter this document declares.",
  ],
  "subclass:Martial Artist: Specialization": [
    "\"you can spend a Focus\" — Focus is not one of the five currencies an amount can carry, and this document declares no counter named Focus.",
    "\"gain a bonus to your Evasion equal to your tier against the attack\" is a modifier on one attack, not a granted effect with a printed duration.",
    "\"Spend a Focus\" is a real holder's cost with no home: the amount vocabulary has no Focus, and this document carries no counter of that name. The roll is annotated with the price stated on its label instead",
  ],
  "subclass:Moon: Foundation": [
    "\"<i>Glamour</i> yourself\" and \"While <i>Glamoured</i>\" name a state that is not in the registered condition list — Glamoured has no status effect to apply",
    "\"adversaries within Close range must mark a Stress to attack you\" is the ADVERSARY's cost, not the holder's",
  ],
  "subclass:Moon: Mastery": [
    "\"place it on this card\" asks for a die pool this document does not carry, so the d6 is rolled and not kept",
    "\"+2 to damage rolls\", \"+3 to damage thresholds\" and \"+1 to Evasion\" are granted by whichever face the die shows rather than by a press, and which one applies is not something the card lets anybody choose",
    "\"increase the value of this die by one\" steps a die pool this document does not carry; only the Hope it costs is annotated",
  ],
  "subclass:Moon: Specialization": [
    "\"you and your allies gain a +1 bonus to Spellcast Rolls\" is conditioned on being \"bathed in this moonlight\" — a position, not a duration — and reaches allies as well as the holder, so a scene-long self grant would be wrong the moment anybody steps out",
    "\"Once per session\" is a use budget with no counter on this document",
    "\"they must mark a Stress\" is the Hexed creature's cost, not the holder's.",
  ],
  "subclass:Nightwalker: Mastery": [
    "\"Gain a permanent +1 bonus to your Evasion\" is a permanent passive modifier with no printed duration and no press.",
    "\"you automatically clear the <i>Restrained</i> condition if you have it\" removes a condition, and there is no remove-condition action; it also fires automatically rather than on a press",
  ],
  "subclass:Nightwalker: Specialization": [
    "\"While you're Vulnerable, add your level to your damage rolls\" reads the condition rather than applying it, and the bonus is a passive damage-roll modifier with no duration",
    "\"You’re considered <i>Cloaked</i> from any adversary for whom the cloud blocks line of sight\" is a per-adversary state, not a condition on the token — applying Cloaked outright would claim more than the card grants",
  ],
  "subclass:Pact of the Endless: Foundation": [
    "\"Spend a Favor\" names a currency this document does not carry; there is no Favor counter to move, so no price can be charged",
    "\"lasts until you take Severe damage or the scene ends\" has two exits and only one of them is a duration this vocabulary holds; granting the threshold bonus without being able to charge the Favor would be a free button",
    "\"spend any number of Favor to roll an equal number of Patron Dice\" names two pools this document does not declare and prints no amount.",
    "\"For each result of 4 or higher, clear a Hit Point\" clears an amount only the dice can say; no fixed number is printed.",
  ],
  "subclass:Pact of the Endless: Mastery": [
    "\"you can spend a Favor instead of marking Hit Points\" spends Favor, which is neither one of the five currencies nor a counter this document declares.",
    "\"you can spend a Favor\" is a holder's cost against a counter this document does not carry; the price is stated on the label of the press it gates",
    "\"they must mark a Stress\" is the TARGET's cost, not the holder's",
  ],
  "subclass:Pact of the Endless: Specialization": [
    "\"spend a Favor to halve incoming damage\" names a currency this document does not carry, and halving damage is the damage dialog's arithmetic rather than a press",
    "\"Once per rest\" is a use budget with no counter on this document",
    "\"you can spend a Favor\" is a holder's cost against a counter this document does not carry — Favor lives on the Pact's Foundation card",
    "\"they must also mark a Stress\" is the ADVERSARY's cost on their failed roll, not the holder's",
  ],
  "subclass:Pact of the Wrathful: Foundation": [
    "\"Spend a Favor\" names a pool this document does not declare.",
    "\"roll a number of Patron Dice equal to your tier\" scales on tier and names a die pool this document does not carry, so no formula can be written.",
    "\"you can spend a Favor\" is a holder's cost against a counter this document does not carry",
    "\"roll an equal number of Patron Dice\" names a die pool this document does not carry, and the count is equal to Hit Points marked rather than printed",
    "\"the attacker marks a Hit Point\" is the ADVERSARY's cost, not the holder's",
  ],
  "subclass:Pact of the Wrathful: Mastery": [
    "\"spend any number of Favor\" names a currency this document does not carry, and the amount is chosen at the table rather than printed",
    "\"roll that many Patron Dice\" is a die pool this unit does not name, rolled a variable number of times",
    "\"Each target must mark a Hit Point\" is the TARGETS' cost, not the holder's",
    "\"Once per rest\" is a use budget with no counter on this document",
    "\"Spend a Favor\" is a holder's cost against a counter this document does not carry",
    "\"reroll any number of your damage dice\" looks like a damage press but asks to re-throw dice already on a posted card, which the plate's own reroll answers rather than an authored action",
  ],
  "subclass:Pact of the Wrathful: Specialization": [
    "\"Spend a Favor\" names a currency this document does not carry",
    "\"increase the range of your primary weapon by one step\" edits an equipped weapon's range with no kind for it, and \"ends when you make a successful attack\" is not a duration this vocabulary holds",
    "\"spend any number of Favor\" names a pool this document does not declare and prints no amount.",
    "\"force the target to mark an equal number of Stress\" is the target's cost, not the holder's.",
  ],
  "subclass:Poisoners Guild: Foundation": [
    "\"place <b>1d4+1</b> tokens on this card\" and \"you can spend a token\" address a counter this document does not carry, and the count is rolled rather than printed; \"clear all unspent tokens\" is the same counter",
    "\"The target must also mark a Stress\" (Grave Spore) is the TARGET's cost, not the holder's",
    "\"You deal an extra <b>1d6</b> damage on this attack\" (Leech Weed) adds to the weapon's damage roll rather than being an expression this card rolls",
  ],
  "subclass:Poisoners Guild: Mastery": [
    "\"The target gains a −3 penalty to their damage thresholds until the end of the scene\" (Blight Seed) has a printed duration but lands on the TARGET, and grant-effect grants to the holder",
    "\"You deal extra damage equal to the result of your Fear Die on this attack\" (Fear Leaf) has no writable formula — the amount is a die already rolled elsewhere",
    "\"The target gains disadvantage on reaction rolls until the end of the scene\" (Corpse Thorn) is the TARGET's penalty, and disadvantage is not a modifier target",
  ],
  "subclass:Poisoners Guild: Specialization": [
    "Midnight Vine's \"until it marks a Stress to clear this condition\" is the TARGET's cost, paid on their sheet to end the effect",
    "Midnight Vine's \"disadvantage on attack rolls\" is a state with no name in the registered condition list",
    "\"you can spend an additional token\" names a token pool this document does not declare, and prints no amount for a press to take.",
  ],
  "subclass:Primal Origin: Mastery": [
    "\"you can clear your Charge to either gain a +10 bonus to the damage roll or gain a +3 bonus to the Difficulty of a reaction roll\" removes a condition and picks between two one-off bonuses; there is no kind that clears a condition",
  ],
  "subclass:Primal Origin: Specialization": [
    "\"you can roll a <b>d8</b> as your advantage die\" names the advantage die of an ally's Spellcast Roll, not a die this feature rolls",
    "\"you can swap the results of their Duality Dice\" edits an ally's roll after it landed; no action kind expresses it and the dice are not the holder's",
  ],
  "subclass:School of Knowledge: Mastery": [
    "\"you can use it without spending Hope\" waives the Experience's own price rather than charging one here.",
  ],
  "subclass:School of Knowledge: Specialization": [
    "\"Take an additional domain card of your level or lower\" hands over a document; no kind in this vocabulary acquires one.",
    "\"you can reduce its Recall Cost by 1\" discounts the Stress the recall gesture charges elsewhere; there is no way to express a discount, and pressing anything here would charge rather than refund",
  ],
  "subclass:School of War: Foundation": [
    "\"Gain an additional Hit Point slot\" raises the Hit Point maximum permanently; it is a schema modifier, not a gain",
  ],
  "subclass:School of War: Mastery": [
    "\"force the target to mark an additional Hit Point\" is the target's cost, not the holder's; only the Stress is charged.",
    "\"The extra magic damage from your “Face Your Fear” feature increases to <b>3d10</b>\" prints dice but only restates another feature's expression; the roll belongs to that feature",
  ],
  "subclass:School of War: Specialization": [
    "\"The extra magic damage from your “Face Your Fear” feature increases to 2d10\" prints dice this card never rolls; it edits the damage of a feature printed on another card",
    "\"you add your Proficiency to your Evasion\" is a passive modifier held while a condition is true, with no printed duration and no press",
  ],
  "subclass:Stalwart: Foundation": [
    "\"Gain a permanent +1 bonus to your damage thresholds\" is a permanent passive modifier with no printed duration and nothing to press — it belongs to the modifiers system, not to grant-effect",
  ],
  "subclass:Stalwart: Mastery": [
    "\"Gain a permanent +3 bonus to your damage thresholds\" is a permanent passive modifier, not a grant with a printed duration",
  ],
  "subclass:Stalwart: Specialization": [
    "\"Gain a permanent +2 bonus to your damage thresholds\" is a permanent passive modifier with no printed duration and no press; grant-effect is not for this.",
  ],
  "subclass:Syndicate: Mastery": [
    "\"three times per session\" is a use budget on the “Contacts Everywhere” feature; no counter is carried by this document",
    "\"You can roll a d20 as your Hope Die\" changes the duality pair's die size; that is a roll-engine fact with no kind in this vocabulary, and the roll itself is not asked for in the imperative",
  ],
  "subclass:Syndicate: Specialization": [
    "\"adding <b>2d8</b> to your damage roll\" adds to a damage roll made later by the weapon, so it is neither this card's own damage expression nor a die rolled on its own",
    "\"their help provides a +3 bonus to the result of your Hope or Fear Die\" modifies one later action roll; no printed duration in the vocabulary covers it and nobody presses it",
  ],
  "subclass:Troubadour: Mastery": [
    "\"perform each of your “Gifted Performer” feature’s songs twice instead of once per long rest\" raises a use budget printed on a different card; this document carries no counter to refresh or move, and nothing here is pressed",
  ],
  "subclass:Troubadour: Specialization": [
    "\"they can immediately gain a Hope or clear a Stress\" is the ALLY's gain and the ALLY's clear — the holder pays and receives nothing, so neither is the holder's press",
    "\"When you give a Rally Die to an ally\" reads like a die-pool spend, but this document carries no die pool; the Rally Die lives on the Troubadour Foundation card",
  ],
  "subclass:Vengeance: Foundation": [
    "\"Gain an additional Stress slot\" raises the Stress maximum permanently; it is a schema modifier, not a gain of a resource",
    "\"force the attacker to mark a Hit Point\" is the attacker's cost, not the holder's; only the 2 Stress is charged here.",
  ],
  "subclass:Vengeance: Mastery": [
    "\"Prioritize an adversary until your next rest\" names a state, Prioritized, that is not in the registered condition list, and \"swap the results of your Hope and Fear Dice\" has no vocabulary here",
  ],
  "subclass:Vengeance: Specialization": [
    "\"you gain a +1 bonus to your Proficiency for the next successful attack you make against that adversary\" is granted automatically by being damaged, and its duration — one successful attack — is not one the effect vocabulary can express",
  ],
  "subclass:Warden of Renewal: Foundation": [
    "\"That creature clears 1d4 Hit Points\" heals the touched creature, not the holder; clear has no subject, so the d4 is rolled and the healing is left to the table",
    "\"clear Stress equal to your Instinct, distributed as you choose between you and your allies\" prints no number the holder clears — the amount is trait-scaled and split across other characters, so nothing fixed is the holder's",
  ],
  "subclass:Warden of Renewal: Specialization": [
    "\"clear 2 Hit Points on <b>1d4</b> allies within Close range\" is the ALLIES' clear, and how many of them is a die the card asks you to roll rather than a printed count",
  ],
  "subclass:Warden of the Elements: Foundation": [
    "Water's \"all other adversaries within Very Close range must mark a Stress\" is the adversaries' cost, not the holder's.",
    "Earth's \"Gain a bonus to your damage thresholds equal to your Proficiency\" and Air's \"gaining advantage on Agility Rolls\" are states held while Channeling, under a compound duration (\"until you take Severe damage or until your next rest\") this vocabulary cannot state; neither is a press of its own.",
  ],
  "subclass:Warden of the Elements: Mastery": [
    "Earth's \"roll a d6 per Hit Point marked\" prints a die whose count is only known at the moment damage lands; the formula cannot be written and a fixed 1d6 button would be a different rule",
    "Fire's \"+1 bonus to your Proficiency\" and Air's \"+1 bonus to your Evasion and can fly\" are passive modifiers held while Channeling, with no printed duration and nothing to press",
  ],
  "subclass:Warden of the Elements: Specialization": [
    "\"they must also mark a Stress\" is the ADVERSARY's cost when they mark Hit Points, not the holder's",
    "\"Your allies gain a +1 bonus to Strength\" is a passive bonus on the allies, and grant-effect lands on the holder",
  ],
  "subclass:Wayfinder: Foundation": [
    "\"they must mark a Stress\" when you deal Severe damage is the ADVERSARY's cost; the old parser charged the wielder for exactly this shape",
  ],
  "subclass:Wayfinder: Mastery": [
    "\"you remove a Fear from the GM’s Fear pool\" moves the GM's pool downward, which is neither a gain (Fear is gained, not removed) nor a cost the holder pays",
  ],
  "subclass:Wayfinder: Specialization": [
    "\"you gain a +2 bonus to your Evasion against the attack\" is a conditional passive modifier with no printed duration and nothing to press.",
  ],
  "subclass:Winged Sentinel: Foundation": [
    "The extra <b>1d8</b> is damage and this document declares no cardDamage entry to roll it from, so the Hope press pays and the die is left to the table.",
  ],
  "subclass:Winged Sentinel: Mastery": [
    "\"Gain a permanent +4 bonus to your Severe damage threshold\" is a permanent passive modifier, not a timed grant",
    "\"you deal an extra <b>1d12</b> damage instead of 1d8\" restates another card's die on that card's own press; there is nothing here to roll or to pay.",
  ],
  "subclass:Winged Sentinel: Specialization": [
    "\"you can remove a Fear from the GM’s Fear pool\" moves the GM's pool downward — not a gain, and not a cost the holder pays",
    "\"instead of gaining Hope\" names the duality roll's own award, which the plate already offers; it is not a press on this card",
  ],
  "subclass:Wordsmith: Foundation": [
    "\"All allies within Far range clear 2 Stress\" clears the ALLIES' Stress, not the holder's — the holder is not among the recipients",
  ],
  "subclass:Wordsmith: Mastery": [
    "\"Your Rally Die increases to a <b>d10</b>\" changes the size of a die pool this document does not carry",
    "\"roll a <b>d10</b> as your advantage die\" names the advantage die of a Help an Ally roll somebody else is composing; it is not a die this feature rolls on its own",
  ],
  "subclass:Wordsmith: Specialization": [
    "\"Help an Ally without spending Hope\" waives a cost rather than charging one; there is nothing for a press to spend.",
  ],
  "transformation:Demigod": [
    "\"You gain a +1 bonus to action, reaction, and damage rolls\" is a standing passive modifier with no press and no printed duration.",
  ],
  "transformation:Ghost": [
    "\"You are resistant to physical damage, take double magic damage\" is the transformation's permanent state, not a timed effect somebody grants by pressing.",
  ],
  "transformation:Reanimated": [
    "\"you can clear Hit Points only if you have access to remains\" is a restriction on a rest move you already have, not a clear — and it prints no amount.",
    "\"you can permanently mark a Hit Point to succeed instead\" is a permanent mark that shortens the track; pay marks a box a rest gives back, which is a different thing",
    "\"you still use the Hope Die's value to clear Hit Points and Stress\" clears an amount read off a die thrown elsewhere; no printed number to author",
  ],
  "transformation:Vampire": [
    "\"Make an attack using a trait of your choice\" names no trait, so `roll-trait` has nothing to write; \"of your choice\" is a choice this system cannot make on the holder's behalf.",
    "\"Place a number of tokens on this card equal to the number of Hit Points the target marks\" counts the TARGET's marked Hit Points, which is not a printed number, and this document carries no counter to place them on",
    "\"you can spend a token to make your Fear Die a <b>d20</b>\" spends a pool this document carries no counter for, and the Fear Die's size belongs to the roll's own die pair",
  ],
  "transformation:Werewolf": [
    "\"Roll a number of d20s equal to your tier\" scales its count on the character's tier, which no `formula` can hold, so the roll is declined rather than written as 1d20.",
    "\"deal that much physical damage to all creatures within Very Close range\" is damage whose amount is that unwritable roll's total; the document carries no `cardDamage` expression for it.",
    "\"you gain a <b>1d10</b> bonus to attack and damage rolls\" is a die-sized bonus a modifier cannot express, and its duration — until Howling Rampage or a rest — is not one of the printed set",
  ],
  "weapon:Advanced Arcane-Frame Wheelchair": [
    "\"Attack with the Spellcast trait your subclass gives you\" names which trait the weapon's own attack already uses; it is a schema fact, not an instruction to make a separate roll",
  ],
  "weapon:Advanced Casting Dagger": [
    "\"This weapon can also be used with these statistics\" is a whole alternate stat line - trait, range and die together, chosen between - and the schema holds one stat line; there is nothing here to press",
  ],
  "weapon:Advanced Greatstaff": [
    "\"roll an additional damage die and discard the lowest result\" changes how the weapon's own damage roll is made; it is not a separate press, and the die size is the weapon's own and is not printed here",
  ],
  "weapon:Advanced Greatsword": [
    "\"roll an additional damage die and discard the lowest result\" modifies the weapon's own damage roll rather than being a press of its own, and the card names no die size for the extra die. \"−1 to Evasion\" is a standing modifier the feature already carries.",
  ],
  "weapon:Advanced Lasso": [
    "\"While Roped, the target is <i>Restrained</i> and <i>Vulnerable</i>\" describes what the Roped state means rather than two further conditions somebody applies; the registered Roped condition carries it.",
    "\"you can make a Strength Reaction Roll\" is a Reaction Roll and gets no button.",
  ],
  "weapon:Advanced Revolver": [
    "\"Place 6 Ammo tokens on your character sheet\" and \"Spend 1 Ammo token to make an attack\" address a counter this document does not carry — there is no Ammo resource on it to move, and inventing one is forbidden.",
  ],
  "weapon:Advanced Scepter": [
    "\"This weapon can also be used with these statistics\" prints a whole alternate stat line — trait, range and die together — which is somebody else's stat line rather than an expression this card rolls.",
  ],
  "weapon:Advanced Shadowblade": [
    "\"you can deal physical or magic damage\" is a choice of damage type made on the weapon's own damage roll, not a press: nothing is paid, nothing is granted, and the attack bar already rolls this weapon's damage.",
  ],
  "weapon:Advanced Throwing Knives": [
    "\"by making an attack roll using Finesse\" describes throwing this weapon with a different trait rather than asking for a roll in the imperative; it is the weapon's own attack, which the attack bar already presses.",
  ],
  "weapon:Advanced Whipsword": [
    "\"This weapon can also be used with these statistics\" prints a whole alternate stat line — trait, range and die together — which is somebody else's stat line rather than an expression this card rolls.",
  ],
  "weapon:Advanced Wooden Stake": [
    "\"Gain a bonus equal to 1 + your tier to primary weapon damage\" is a standing modifier on paired gear, not Hope gained and not a timed effect.",
  ],
  "weapon:Arc Wand": [
    "\"Mark any number of Stress\" is the holder's price and prints no amount. A one-Stress button would understate a press meant to be made several times over, and any number I chose would be invented.",
  ],
  "weapon:Arcane-Frame Wheelchair": [
    "\"Attack with the Spellcast trait your subclass gives you\" names which trait the weapon's own attack already uses; it is a schema fact, not an instruction to make a separate roll",
  ],
  "weapon:Bec de Corbin": [
    "\"use a d20 as your damage die\" substitutes the weapon's damage die for this attack; it is not a die this card rolls itself, so no roll-dice is authored.",
  ],
  "weapon:Black Powder Serpentine": [
    "\"all creatures within Very Close range of the target must mark a Hit Point\" is the TARGETS' cost, not the holder's",
  ],
  "weapon:Blackblood Tendril": [
    "\"they mark an equal number of Stress\" is the TARGET's cost, not the holder's",
  ],
  "weapon:Bladed Fan": [
    "\"roll this weapon's damage dice\" asks for THIS weapon's dice; roll-damage rolls the equipped weapon's, which on a secondary like a Bladed Fan is the primary's stat line and would print the wrong dice",
  ],
  "weapon:Bladed Star": [
    "\"you can reroll your attack with disadvantage\" costs nothing and there is no reroll in the vocabulary; a pay button would invent a price the card does not print",
  ],
  "weapon:Blitz Hammer": [
    "\"Gain a +1 bonus to your Proficiency on this attack\" is scoped to the single attack this press buys and has no printed duration, so it is not a timed effect anybody grants",
  ],
  "weapon:Bloodstaff": [
    "\"you must mark a Stress\" on every successful attack is an automatic consequence of the attack, not an offer or a bare imperative the holder presses; it fires when the attack lands and a button would charge it at a moment of its own choosing",
  ],
  "weapon:Braveshield": [
    "\"When you mark an Armor Slot\" is a trigger describing a slot marked in the damage flow, not an offer this card makes; a press charging a slot here would charge it twice.",
  ],
  "weapon:Cane Sword": [
    "\"The blade can be hidden in the cane to avoid detection\" — fiction, and the sweep only reached it on the word \"can\"",
  ],
  "weapon:Casting Dagger": [
    "\"This weapon can also be used with these statistics\" prints a whole alternate stat line — trait, range and die together — which is somebody else's stat line rather than an expression this card rolls.",
  ],
  "weapon:Casting Sword": [
    "\"This weapon can also be used with these statistics\" prints a whole alternate stat line - trait, range and die - chosen between rather than rolled. The dice in it are somebody else's stat line, not an expression this card rolls.",
  ],
  "weapon:Collapsible Baton": [
    "\"they mark an equal number of Stress instead\" is the TARGET's cost, and the number is whatever the damage was - nothing here is the holder's to pay",
  ],
  "weapon:Curved Dagger": [
    "\"When you roll a 1 on a damage die, it deals 8 damage instead\" replaces a face on the weapon's own damage roll; it is not an expression this card rolls and there is nothing to press.",
  ],
  "weapon:Cyrurgien’s Scalpel": [
    "\"the target must mark a Stress\" is the TARGET's cost, not the holder's",
  ],
  "weapon:Demon’s Edge": [
    "\"all adversaries within Close range must mark a Stress\" is the adversaries' cost, not the wielder's.",
  ],
  "weapon:Devouring Dagger": [
    "\"the target must mark a Stress\" is the TARGET's cost, not the holder's",
  ],
  "weapon:Double Flail": [
    "\"roll an additional damage die and discard the lowest result\" changes how the weapon's own damage roll is made; it is not a separate press, and the die size is the weapon's own and is not printed here",
  ],
  "weapon:Ego Blade": [
    "\"You must have a Presence of 0 or lower to use this weapon\" is a requirement for wielding it, not a price anybody pays",
  ],
  "weapon:Elder Bow": [
    "\"roll an additional damage die and discard the lowest result\" changes how the weapon's own damage roll is made; it is not a separate press, and the die size is the weapon's own and is not printed here",
  ],
  "weapon:Enchanted Kite": [
    "\"This weapon can also be used with these statistics\" prints a whole alternate stat line — trait, range and die together — which is somebody else's stat line rather than an expression this card rolls.",
  ],
  "weapon:Firestaff": [
    "\"the target must mark a Stress\" is the TARGET's cost, not the holder's",
  ],
  "weapon:Flare Launcher": [
    "\"temporarily lights up the area\" uses the rules' duration keyword about lamplight, not about a state on a creature. Nothing is granted to anybody.",
  ],
  "weapon:Flickerfly Blade": [
    "\"Gain a bonus to your damage rolls equal to your Agility\" is a standing trait-scaled modifier with no printed duration and nothing to press, not a resource gain.",
  ],
  "weapon:Floating Bladeshards": [
    "\"roll an additional damage die and discard the lowest result\" — a change to the weapon's own damage roll, which the attack plate throws; there is no press here and a second damage button would roll a second, unrelated expression",
  ],
  "weapon:Fury Gem": [
    "\"the target must mark a Stress\" is the TARGET's cost, not the wielder's. This is the Scary error verbatim.",
  ],
  "weapon:Fusion Gloves": [
    "\"Gain a bonus to your damage rolls equal to your level\" is a standing level-scaled modifier with no printed duration, not a resource gain.",
  ],
  "weapon:Ghostblade": [
    "\"you can deal physical or magic damage\" is a choice of damage type made on the weapon's own damage roll, not a press: nothing is paid, nothing is granted, and the attack bar already rolls this weapon's damage.",
  ],
  "weapon:Gilded Bow": [
    "\"When you roll a 1 on a damage die, it deals 6 damage instead\" replaces a face on the weapon's own damage roll; nothing is pressed and no expression is printed for this card to roll.",
  ],
  "weapon:Gilded Falchion": [
    "\"roll an additional damage die and discard the lowest result\" changes how the weapon's own damage roll is made; it is not a separate press, and the die size is the weapon's own and is not printed here",
  ],
  "weapon:Gravity Arbalest": [
    "\"make a Reaction Roll (16)\" is rolled by the adversaries, not by the holder - a Reaction Roll gets no button",
    "\"Creatures who fail must mark a Stress\" is the TARGETS' cost, not the holder's",
  ],
  "weapon:Greatbow": [
    "\"roll an additional damage die and discard the lowest result\" changes how the weapon's own damage roll is made; it is not a separate press, and the die size is the weapon's own and is not printed here",
  ],
  "weapon:Greatstaff": [
    "\"roll an additional damage die and discard the lowest result\" changes how the weapon's own damage roll is made; it is not a separate press, and the die size is the weapon's own and is not printed here",
  ],
  "weapon:Greatsword": [
    "\"roll an additional damage die and discard the lowest result\" modifies the weapon's own damage roll rather than being a press of its own, and the card names no die size for the extra die. \"−1 to Evasion\" is a standing modifier the feature already carries.",
  ],
  "weapon:Gunblade": [
    "\"This weapon can also be used with these statistics\" is a whole alternate stat line - trait, range and die together, chosen between - and the schema holds one stat line; there is nothing here to press",
  ],
  "weapon:Hammer of Exota": [
    "\"all other adversaries within Very Close range must succeed on a reaction roll (14)\" is the targets' Reaction Roll and their half damage, not the holder's action.",
  ],
  "weapon:Hammer of Wrath": [
    "\"use a d20 as your damage die\" substitutes the weapon's damage die for this attack; it is not a die this card rolls itself, so no roll-dice is authored.",
  ],
  "weapon:Hand Sling": [
    "\"This weapon can also be used with these statistics\" is a whole alternate stat line - trait, range and die together, chosen between - and the schema holds one stat line; there is nothing here to press",
  ],
  "weapon:Improved Arcane-Frame Wheelchair": [
    "\"Attack with the Spellcast trait your subclass gives you\" names which trait the weapon's own attack already uses; it is a schema fact, not an instruction to make a separate roll",
  ],
  "weapon:Improved Casting Dagger": [
    "\"This weapon can also be used with these statistics\" prints a whole alternate stat line - trait, range and die - chosen between rather than rolled. The dice in it are somebody else's stat line, not an expression this card rolls.",
  ],
  "weapon:Improved Greatstaff": [
    "\"roll an additional damage die and discard the lowest result\" changes how the weapon's own damage roll is made; it is not a separate press, and the die size is the weapon's own and is not printed here",
  ],
  "weapon:Improved Greatsword": [
    "\"roll an additional damage die and discard the lowest result\" modifies the weapon's own damage roll rather than being a press of its own, and the card names no die size for the extra die. \"−1 to Evasion\" is a standing modifier the feature already carries.",
  ],
  "weapon:Improved Lasso": [
    "\"While Roped, the target is <i>Restrained</i> and <i>Vulnerable</i>\" describes what the Roped state means rather than two further conditions somebody applies; the registered Roped condition carries it.",
    "\"you can make a Strength Reaction Roll\" is a Reaction Roll and gets no button.",
  ],
  "weapon:Improved Revolver": [
    "\"Place 6 Ammo tokens on your character sheet\" and \"Spend 1 Ammo token to make an attack\" address a counter this document does not carry — there is no Ammo resource on it to move, and inventing one is forbidden.",
  ],
  "weapon:Improved Scepter": [
    "\"This weapon can also be used with these statistics\" prints a whole alternate stat line — trait, range and die together — which is somebody else's stat line rather than an expression this card rolls.",
  ],
  "weapon:Improved Shadowblade": [
    "\"you can deal physical or magic damage\" is a choice of damage type made on the weapon's own damage roll, not a press: nothing is paid, nothing is granted, and the attack bar already rolls this weapon's damage.",
  ],
  "weapon:Improved Throwing Knives": [
    "\"by making an attack roll using Finesse\" describes throwing this weapon with a different trait rather than asking for a roll in the imperative; it is the weapon's own attack, which the attack bar already presses.",
  ],
  "weapon:Improved Whipsword": [
    "\"This weapon can also be used with these statistics\" prints a whole alternate stat line — trait, range and die together — which is somebody else's stat line rather than an expression this card rolls.",
  ],
  "weapon:Improved Wooden Stake": [
    "\"Gain a bonus equal to 1 + your tier to primary weapon damage\" is a standing modifier on paired gear, not Hope gained and not a timed effect.",
  ],
  "weapon:Infinite Staff": [
    "\"You gain a −1 penalty to attack rolls for each step you increase the range by\" is a penalty scaled by a choice made in the fiction, with nothing to press and no duration printed.",
  ],
  "weapon:Javelins": [
    "\"by making an attack roll using Agility\" — the weapon's own attack, described rather than asked for; the imperative \"make a\" is absent and the attack bar already throws it",
  ],
  "weapon:Knuckle Blades": [
    "\"roll an additional damage die\" names the weapon's own damage die, whose size this card never prints, so there is no formula to author.",
  ],
  "weapon:Knuckle Claws": [
    "\"you can deal damage to another target within Melee range\" is the same weapon's damage applied a second time against a different creature; the damage button cannot tell the two applications apart and no cost is printed.",
  ],
  "weapon:Lasso": [
    "\"While Roped, the target is <i>Restrained</i> and <i>Vulnerable</i>\" describes what the Roped state means rather than two further conditions somebody applies; the registered Roped condition carries it.",
    "\"you can make a Strength Reaction Roll\" is a Reaction Roll and gets no button.",
  ],
  "weapon:Legendary Arcane-Frame Wheelchair": [
    "\"Attack with the Spellcast trait your subclass gives you\" names which trait the weapon's own attack already uses; it is a schema fact, not an instruction to make a separate roll",
  ],
  "weapon:Legendary Casting Dagger": [
    "\"This weapon can also be used with these statistics\" prints a whole alternate stat line — trait, range and die together — which is somebody else's stat line rather than an expression this card rolls.",
  ],
  "weapon:Legendary Greatstaff": [
    "\"roll an additional damage die and discard the lowest result\" — a change to the weapon's own damage roll, which the attack plate throws; there is no press here and a second damage button would roll a second, unrelated expression",
  ],
  "weapon:Legendary Greatsword": [
    "\"roll an additional damage die and discard the lowest result\" modifies the weapon's own damage roll rather than being a press of its own, and the card names no die size for the extra die. \"−1 to Evasion\" is a standing modifier the feature already carries.",
  ],
  "weapon:Legendary Lasso": [
    "\"While Roped, the target is <i>Restrained</i> and <i>Vulnerable</i>\" describes what the Roped state means rather than two further conditions somebody applies; the registered Roped condition carries it.",
    "\"you can make a Strength Reaction Roll\" is a Reaction Roll and gets no button.",
  ],
  "weapon:Legendary Revolver": [
    "\"Place 6 Ammo tokens on your character sheet\" and \"Spend 1 Ammo token to make an attack\" address a counter this document does not carry — there is no Ammo resource on it to move, and inventing one is forbidden.",
  ],
  "weapon:Legendary Scepter": [
    "\"This weapon can also be used with these statistics\" prints a whole alternate stat line - trait, range and die - chosen between rather than rolled. The dice in it are somebody else's stat line, not an expression this card rolls.",
  ],
  "weapon:Legendary Shadowblade": [
    "\"you can deal physical or magic damage\" is a choice of damage type made on the weapon's own damage roll, not a press: nothing is paid, nothing is granted, and the attack bar already rolls this weapon's damage.",
  ],
  "weapon:Legendary Throwing Knives": [
    "\"by making an attack roll using Finesse\" describes throwing this weapon with a different trait rather than asking for a roll in the imperative; it is the weapon's own attack, which the attack bar already presses.",
  ],
  "weapon:Legendary Whipsword": [
    "\"This weapon can also be used with these statistics\" prints a whole alternate stat line - trait, range and die - chosen between rather than rolled. The dice in it are somebody else's stat line, not an expression this card rolls.",
  ],
  "weapon:Legendary Wooden Stake": [
    "\"Gain a bonus equal to 1 + your tier to primary weapon damage\" is a standing modifier on paired gear, not Hope gained and not a timed effect.",
  ],
  "weapon:Mage Orb": [
    "\"roll an additional damage die and discard the lowest result\" changes how the weapon's own damage roll is made; it is not a separate press, and the die size is the weapon's own and is not printed here",
  ],
  "weapon:Meridian Cutlass": [
    "\"gain advantage on your attack roll against them\" is a conditional bonus to a roll made elsewhere, not a press and not a resource gain",
  ],
  "weapon:Midas Scythe": [
    "\"Spend a handful of gold\" is genuinely the holder's price, but gold is not one of the five currencies an amount can hold, so it cannot be authored honestly.",
  ],
  "weapon:Möbius Orb": [
    "\"roll an additional damage die and add the result to the total damage\" is additive to the weapon's own damage roll and names no die size, so there is no expression to author.",
  ],
  "weapon:Parrying Dagger": [
    "\"roll this weapon's damage dice\" asks for THIS weapon's dice; roll-damage rolls the equipped weapon's, which on a secondary like a Parrying Dagger is the primary's stat line and would print the wrong dice",
  ],
  "weapon:Powered Gauntlet": [
    "\"a +1 bonus to your Proficiency on a primary weapon attack\" is not authored as a grant-effect: it lasts for one attack and the card prints no duration from the closed set.",
  ],
  "weapon:Retractable Saber": [
    "\"The blade can be hidden in the hilt\" describes the weapon being concealed, not the Hidden condition being put on a creature.",
  ],
  "weapon:Revolver": [
    "\"Place 6 Ammo tokens on your character sheet\" and \"Spend 1 Ammo token to make an attack\" address a counter this document does not carry — there is no Ammo resource on it to move, and inventing one is forbidden.",
  ],
  "weapon:Runes of Ruination": [
    "\"you must mark a Stress\" on every successful attack is an automatic consequence of the attack, not an offer or a bare imperative the holder presses; it fires when the attack lands and a button would charge it at a moment of its own choosing",
  ],
  "weapon:Scepter": [
    "\"This weapon can also be used with these statistics\" prints a whole alternate stat line - trait, range and die - chosen between rather than rolled. The dice in it are somebody else's stat line, not an expression this card rolls.",
  ],
  "weapon:Severed Dragon Claw": [
    "\"all adversaries within Very Close range must mark a Stress\" is the ADVERSARIES' cost, not the wielder's. Charging the holder here is exactly the Scary error.",
  ],
  "weapon:Shadowblade": [
    "\"you can deal physical or magic damage\" is a choice of damage type made on the weapon's own damage roll, not a press: nothing is paid, nothing is granted, and the attack bar already rolls this weapon's damage.",
  ],
  "weapon:Sledge Axe": [
    "\"all adversaries within Very Close range must mark a Stress\" is the ADVERSARIES' cost, not the wielder's. Charging the holder here is exactly the Scary error.",
  ],
  "weapon:Sledgehammer": [
    "\"roll an additional damage die and discard the lowest result\" modifies the weapon's own damage roll rather than being a press of its own, and the card names no die size for the extra die. \"−1 to Evasion\" is a standing modifier the feature already carries.",
  ],
  "weapon:Soldier’s Pike": [
    "\"force them to mark a Hit Point\" is the ADVERSARY's cost. Only the 2 Stress is the wielder's.",
  ],
  "weapon:Soul Chain": [
    "\"force the target to mark a Stress\" is the TARGET's cost; the holder pays only the Hope",
  ],
  "weapon:Sparkling Staff": [
    "\"roll an additional damage die and discard the lowest result\" — a change to the weapon's own damage roll, which the attack plate throws; there is no press here and a second damage button would roll a second, unrelated expression",
  ],
  "weapon:Spiked Bow": [
    "\"This weapon can also be used with these statistics\" prints a whole alternate stat line — trait, range and die together — which is somebody else's stat line rather than an expression this card rolls.",
  ],
  "weapon:Splintershaft Bow": [
    "\"Targets you succeed against take half damage\" is what happens to the targets after the dice land, not something the holder presses; save-for-half is deliberately not encoded.",
  ],
  "weapon:Staff of Augma": [
    "\"a +3 bonus to their next attack roll\" lands on an ALLY. grant-effect addresses the holder or the press's targets, so the bonus is left to the table.",
  ],
  "weapon:Starmetal Blade": [
    "\"When you roll a 1 on a damage die, it deals 8 damage instead\" replaces a face on the weapon's own damage roll; it is not an expression this card rolls and there is nothing to press.",
  ],
  "weapon:Steelforged Halberd": [
    "\"the target must mark a Stress\" is the TARGET's cost, not the holder's",
  ],
  "weapon:Storm God’s Greataxe": [
    "\"Mark any number of Stress\" is the holder's price and prints no amount. A one-Stress button would understate a press meant to be made several times over, and any number I chose would be invented.",
  ],
  "weapon:Swinging Ropeblade": [
    "\"Restrain the target or pull them into Melee range\" is a choice of two outcomes for one payment. Restrained is a registered condition, but a single press cannot know which half was chosen, so no apply-condition is authored.",
  ],
  "weapon:Talon Blades": [
    "\"roll an additional damage die\" names the weapon's own damage die, whose size this card never prints, so there is no formula to author.",
  ],
  "weapon:Throwing Knives": [
    "\"by making an attack roll using Finesse\" describes throwing this weapon with a different trait rather than asking for a roll in the imperative; it is the weapon's own attack, which the attack bar already presses.",
  ],
  "weapon:Urok Broadsword": [
    "\"the target must mark an additional HP\" is the TARGET's cost, not the holder's — this is the Scary failure exactly.",
  ],
  "weapon:Wand of Enthrallment": [
    "\"Before you make a Presence Roll\" names a roll being made elsewhere in the ordinary flow; it is not an imperative asking for one, so it earns no roll-trait button.",
  ],
  "weapon:Wand of Essek": [
    "\"You can choose the target of your attack after making your attack roll\" — a permission about ordering, with nothing to spend and nothing to roll",
  ],
  "weapon:War Dart": [
    "\"This weapon can also be used with these statistics\" prints a whole alternate stat line - trait, range and die - chosen between rather than rolled. The dice in it are somebody else's stat line, not an expression this card rolls.",
  ],
  "weapon:War Pick": [
    "\"the target must mark an additional HP\" is the TARGET's cost, not the holder's — this is the Scary failure exactly.",
  ],
  "weapon:Whipsword": [
    "\"This weapon can also be used with these statistics\" prints a whole alternate stat line - trait, range and die - chosen between rather than rolled. The dice in it are somebody else's stat line, not an expression this card rolls.",
  ],
  "weapon:Widogast Pendant": [
    "\"You can choose the target of your attack after making your attack roll\" — a permission about ordering, with nothing to spend and nothing to roll",
  ],
  "weapon:Wooden Stake": [
    "\"Gain a bonus equal to 1 + your tier to primary weapon damage\" is a standing modifier on paired gear, not Hope gained and not a timed effect.",
  ],
  "weapon:Yutari Bloodbow": [
    "\"roll an additional damage die\" names the weapon's own damage die, whose size this card never prints, so there is no formula to author.",
  ],
};

export default CARD_ACTIONS;

/**
 * Attach the reading to a pack's documents, at its own `export default`.
 *
 * Beside `withDice` and `withDamage` and for their reason: no generator emits
 * this call, because a generated file is an *ingredient* and the wrap is
 * hand-written downstream where the next `cards:fetch` cannot revert it.
 */
export const withActions = (docs) =>
  docs.map((d) => {
    const entry = CARD_ACTIONS[`${d.type}:${d.name}`];
    if (!entry) return d;
    const system = { ...d.system };
    if (entry.actions?.length) system.actions = entry.actions;
    for (const [name, actions] of Object.entries(entry.features ?? {})) {
      for (const key of ["classFeatures", "features"]) {
        if (Array.isArray(system[key])) {
          system[key] = system[key].map((b) => (b?.name === name ? { ...b, actions } : b));
        }
      }
      for (const key of ["hopeFeature", "topFeature", "bottomFeature", "feature"]) {
        if (system[key]?.name === name) system[key] = { ...system[key], actions };
      }
    }
    return { ...d, system };
  });
