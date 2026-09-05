// Generated from homebrew/gunslinger by scripts/sync-gunslinger.mjs. Edit the Markdown source.
export default [
  {
    "name": "Gunslinger",
    "type": "class",
    "folder": "Gunslinger",
    "img": "systems/gluniverse-daggerheart/assets/cards/gunslinger/gunslinger.png",
    "system": {
      "description": "<p>Gunslingers use nerve, precision, and an eye for opportunity to change a dangerous situation with a shot.</p>",
      "flavor": "",
      "domains": {
        "primary": "bone",
        "secondary": "artifice"
      },
      "startingEvasion": 10,
      "startingHitPoints": 6,
      "classFeatures": [
        {
          "name": "Trick Shot",
          "description": "<p>Before making a <b>single-target firearm attack</b>, declare one effect from the table below and describe the shot that would produce it. The target must be visible, within the firearm's range, and meet the effect's requirements. The GM establishes whether the shot is possible before you roll.</p><p>On a success, you can <b>spend 1 Hope</b> to apply the declared effect <b>instead of all damage from that attack</b>. Otherwise, resolve the attack normally. A successful roll with Hope can supply the Hope you spend. You cannot change the declared effect after rolling.</p><ul><li><b>Expose</b>: The adversary becomes temporarily <b>Vulnerable</b>. Describe how the shot makes them expose themselves or lose their footing.</li><li><b>Disarm</b>: One object the adversary is holding and could drop lands on an unoccupied surface within Melee range of them. They can recover it through the normal fiction and GM moves. This neither removes their other attacks nor guarantees they must spend an entire spotlight retrieving it.</li><li><b>Herd</b>: Move an adversary capable of moving up to a Melee distance to an unoccupied position you can see within the firearm's range. The route and destination must be safe for that adversary. The shot provokes movement; it cannot drag, lift, or launch a target.</li><li><b>Pin</b>: Fasten an adversary's loose clothing or carried material to a nearby fixed surface, making them temporarily <b>Restrained</b>. There must be both a suitable material and an anchor within their Melee range.</li><li><b>Manipulate</b>: Strike an exposed, nonmagical object to sever a thin cord, break a fragile component, or move a small unsecured object up to a Melee distance along a supporting surface. The GM sets the object's Difficulty before the roll. This cannot operate a complex device or destroy a substantial barrier in one shot.</li></ul><p>When you replace damage, remove bonus damage and other offensive weapon or on-hit effects as well. The roll still counts as a successful attack for your own movement and resource features. It cannot be combined with additional attacks, additional targets, or a Tag Team Roll. An ordinary critical success still grants its normal Hope and Stress recovery, but a damage-replacing Trick Shot deals no critical damage.</p>",
          "modifiers": []
        }
      ],
      "hopeFeature": {
        "name": "Against the Odds",
        "description": "<p>Before attempting a Trick Shot, <b>spend 3 Hope</b>. On a success, deal the firearm attack's normal damage to its target and apply the declared trick-shot effect. You do not pay the ordinary 1 Hope cost. On a failure, the Hope remains spent and neither benefit occurs.</p>\n<p>The attack remains single-target. Damage dice, flat damage bonuses such as Paired, critical damage, and damage rerolls apply normally. Do not apply additional conditions, movement of the target, forced HP or Stress marking, or other target-affecting riders beyond the declared Trick Shot effect and the HP loss caused by this damage. Your own movement and resource features, including Keep Moving, remain available. A Manipulate shot damages only the object it targets; it does not also damage a nearby adversary. This feature grants no extra attack.</p>",
        "modifiers": []
      },
      "startingInventory": "<p>Choose a battered tool inherited from your teacher or an unfired bullet engraved with a name. These possessions provide story prompts, not mechanical bonuses.</p>",
      "backgroundQuestions": [
        "Who taught you that an accurate shot and a wise shot are different things? When did you ignore them?",
        "What did you once break with a single shot that you still hope to repair?",
        "Who recognizes your weapon, and what do they believe you owe them?"
      ],
      "connectionQuestions": [
        "What have you trusted me to repair that matters more to you than its price?",
        "When did one of my clever plans put you in danger, and what have I promised since?",
        "What signal do we use when you need me to create an opening?"
      ],
      "suggestedTraits": ""
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Drifter: Foundation",
    "type": "subclass",
    "folder": "Gunslinger",
    "img": "systems/gluniverse-daggerheart/assets/cards/gunslinger/drifter.png",
    "system": {
      "description": "<p>Choose Drifter to move through close combat with a blade in one hand and a pistol in the other.</p>",
      "subclassName": "Drifter",
      "className": "Gunslinger",
      "rank": "foundation",
      "spellcastTrait": "",
      "features": [
        {
          "name": "Blade and Powder",
          "description": "<p>While wielding a one-handed firearm and a one-handed melee weapon, gain <b>+1 to single-target attack rolls</b> made with either against an adversary within Melee range when you describe using both in the sequence. Choose one weapon for the roll's trait and damage; do not combine damage profiles.</p>",
          "modifiers": []
        },
        {
          "name": "Keep Moving",
          "description": "<p>After you succeed on such an attack, you can move without a roll to another unoccupied position within Melee range of that target along a clear route.</p>",
          "modifiers": []
        }
      ],
      "printing": {
        "artist": "",
        "code": ""
      }
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Drifter: Specialization",
    "type": "subclass",
    "folder": "Gunslinger",
    "img": "systems/gluniverse-daggerheart/assets/cards/gunslinger/drifter.png",
    "system": {
      "description": "<p>Choose Drifter to move through close combat with a blade in one hand and a pistol in the other.</p>",
      "subclassName": "Drifter",
      "className": "Gunslinger",
      "rank": "specialization",
      "spellcastTrait": "",
      "features": [
        {
          "name": "Through the Fray",
          "description": "<p>When you use Keep Moving, you can <b>spend 1 Hope</b> to move anywhere within Very Close range of your starting position instead, along a clear route.</p>",
          "modifiers": []
        },
        {
          "name": "Finish the Job",
          "description": "<p>Once per rest, when a Blade and Powder attack fails, you can <b>mark 1 Stress</b> to strike with the other weapon in the sequence. Deal physical damage to the same target equal to <b>a number of d6s equal to your tier</b>. This is a fixed damage roll, not another attack; add no other damage bonuses or on-hit effects. Resolve the original failure and any GM move normally.</p>",
          "modifiers": []
        }
      ],
      "printing": {
        "artist": "",
        "code": ""
      }
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Drifter: Mastery",
    "type": "subclass",
    "folder": "Gunslinger",
    "img": "systems/gluniverse-daggerheart/assets/cards/gunslinger/drifter.png",
    "system": {
      "description": "<p>Choose Drifter to move through close combat with a blade in one hand and a pistol in the other.</p>",
      "subclassName": "Drifter",
      "className": "Gunslinger",
      "rank": "mastery",
      "spellcastTrait": "",
      "features": [
        {
          "name": "Close Quarters Legend",
          "description": "<p>While wielding the weapons required by Blade and Powder, gain <b>+1 Evasion</b> against attacks made by adversaries within Melee range.</p>",
          "modifiers": []
        },
        {
          "name": "Nothing Wasted",
          "description": "<p>Once per long rest, after a successful Blade and Powder firearm attack, you can apply one eligible Trick Shot effect to that target while retaining the attack's normal damage. You do not spend Hope. Declare the effect at this point, but all other Against the Odds restrictions apply. Do not use this feature on an attack for which you already paid for Against the Odds.</p>",
          "modifiers": []
        }
      ],
      "printing": {
        "artist": "",
        "code": ""
      }
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Sharpshooter: Foundation",
    "type": "subclass",
    "folder": "Gunslinger",
    "img": "systems/gluniverse-daggerheart/assets/cards/gunslinger/sharpshooter.png",
    "system": {
      "description": "<p>Choose Sharpshooter to find useful firing positions and make precision count across the battlefield.</p>",
      "subclassName": "Sharpshooter",
      "className": "Gunslinger",
      "rank": "foundation",
      "spellcastTrait": "",
      "features": [
        {
          "name": "Find the Angle",
          "description": "<p>When making a single-target firearm attack against a visible target beyond Melee range, you can ignore disadvantage caused by that target's partial cover if your position offers a plausible exposed angle. Describe the angle. This does not reveal an unseen target or bypass a solid obstruction.</p>",
          "modifiers": []
        },
        {
          "name": "Sure Footing",
          "description": "<p>Gain advantage on action rolls made to climb, balance, or cross precarious ground specifically to reach a firing position you can identify. This does not grant extra movement or automatically succeed.</p>",
          "modifiers": []
        }
      ],
      "printing": {
        "artist": "",
        "code": ""
      }
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Sharpshooter: Specialization",
    "type": "subclass",
    "folder": "Gunslinger",
    "img": "systems/gluniverse-daggerheart/assets/cards/gunslinger/sharpshooter.png",
    "system": {
      "description": "<p>Choose Sharpshooter to find useful firing positions and make precision count across the battlefield.</p>",
      "subclassName": "Sharpshooter",
      "className": "Gunslinger",
      "rank": "specialization",
      "spellcastTrait": "",
      "features": [
        {
          "name": "Measured Shot",
          "description": "<p>When you succeed on a single-target firearm attack against a target beyond Close range and roll its damage, you can <b>mark 1 Stress</b> to reroll one damage die. Use the new result. You can do this only once for that attack.</p>",
          "modifiers": []
        },
        {
          "name": "Thread the Needle",
          "description": "<p>You can use Manipulate to operate one exposed simple lever, latch, or switch with a successful shot, provided moving it requires neither sustained pressure nor a sequence of operations.</p>",
          "modifiers": []
        }
      ],
      "printing": {
        "artist": "",
        "code": ""
      }
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Sharpshooter: Mastery",
    "type": "subclass",
    "folder": "Gunslinger",
    "img": "systems/gluniverse-daggerheart/assets/cards/gunslinger/sharpshooter.png",
    "system": {
      "description": "<p>Choose Sharpshooter to find useful firing positions and make precision count across the battlefield.</p>",
      "subclassName": "Sharpshooter",
      "className": "Gunslinger",
      "rank": "mastery",
      "spellcastTrait": "",
      "features": [
        {
          "name": "One Shot, Two Problems",
          "description": "<p>Once per long rest, when Against the Odds succeeds against an adversary beyond Melee range, you can apply a second, different eligible Trick Shot effect to that same target. Describe how one shot causes both effects. Resolve damage only once; this grants no extra target or attack.</p>",
          "modifiers": []
        },
        {
          "name": "Hold Your Nerve",
          "description": "<p>When Measured Shot rerolls a die, you can keep either result.</p>",
          "modifiers": []
        }
      ],
      "printing": {
        "artist": "",
        "code": ""
      }
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Fieldwork",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/cards/gunslinger/fieldwork.png",
    "system": {
      "domain": "artifice",
      "level": 1,
      "cardType": "ability",
      "recallCost": 0,
      "description": "<p>Gain advantage on action rolls to repair a mundane device or sabotage an unattended nonmagical mechanism using appropriate tools. Describe what you adjust, brace, or disconnect. This does not grant access through a barrier, remove a magical protection, or make an impossible repair possible.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Fault Finder",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/cards/gunslinger/fault-finder.png",
    "system": {
      "domain": "artifice",
      "level": 1,
      "cardType": "ability",
      "recallCost": 0,
      "description": "<p><b>Spend 1 Hope</b> and closely examine a visible object or structure within Very Close range. Ask the GM one question: what holds it together, what powers or operates it, or where could a small intervention interrupt its function? The answer is truthful about what examination can reveal. Gain advantage on your next action roll this scene to exploit that answer. This feature cannot identify a creature's statistics or guarantee that a structure has an accessible weakness.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Make Do",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/cards/gunslinger/make-do.png",
    "system": {
      "domain": "artifice",
      "level": 1,
      "cardType": "ability",
      "recallCost": 0,
      "description": "<p>Once per rest, <b>spend 1 Hope</b> and take a few uninterrupted moments to assemble a mundane handheld tool from your kit and nearby material. Describe its practical construction. It can do the ordinary work of one tool, such as a wedge, probe, crank, or clamp, until the end of the scene. It cannot become a weapon, consumable, copied key, or valuable commodity. Using it still requires any appropriate action roll.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Smoke Pot",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/cards/gunslinger/smoke-pot.png",
    "system": {
      "domain": "artifice",
      "level": 2,
      "cardType": "ability",
      "recallCost": 1,
      "description": "<p>Once per rest, <b>mark 1 Stress</b> and make a <b>Finesse Roll (12)</b> to throw a prepared smoke pot to a point within Close range. On a success, smoke fills a Very Close area around that point. Attacks whose line of sight passes through it have disadvantage from partial cover, for allies and adversaries alike. The smoke does not make anyone Hidden or Cloaked. It lasts until the scene ends, a strong wind disperses it, or a move extinguishes or removes its source. It is an area effect, not a condition on its occupants.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Something Worth Keeping",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/cards/gunslinger/something-worth-keeping.png",
    "system": {
      "domain": "artifice",
      "level": 2,
      "cardType": "ability",
      "recallCost": 0,
      "description": "<p>Once per long rest, during a rest, repair or tend a willing ally's personal belonging together. Ask why they keep it, and tell them something you have kept through difficult times. You and that ally each <b>clear 2 Stress</b>. A character can benefit from this feature only once per long rest, regardless of how many people have it. This is in addition to your normal downtime moves.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Catch Line",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 3,
      "cardType": "ability",
      "recallCost": 1,
      "description": "<p><b>Mark 1 Stress</b> and make a <b>Finesse attack roll</b> against an adversary within Close range, using a hooked line from your kit. The target must have something the line can catch, and you need a secure anchor. On a success, they become temporarily <b>Restrained</b> and take no damage. The effect also ends if the line is severed, its anchor fails, or you move beyond Close range of the target. You can maintain only one Catch Line at a time.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Field Patch",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 3,
      "cardType": "ability",
      "recallCost": 1,
      "description": "<p>Once per rest, take a few uninterrupted moments within Melee range of yourself or a willing ally to tighten straps and brace damaged armor. <b>Mark 1 Stress</b> to let the wearer <b>clear 1 marked Armor Slot</b>. This cannot be used while resolving an incoming attack. It does not increase Armor Score or restore an exhausted armor feature.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Tripwire",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 4,
      "cardType": "ability",
      "recallCost": 1,
      "description": "<p>Once per rest, <b>mark 1 Stress</b> and make a <b>Finesse Roll (12)</b> to rig a visible line between two secure points within Very Close range of you. On a success, the first adversary that crosses it this scene makes a <b>Reaction Roll (13)</b>. On a failure, they become temporarily <b>Restrained</b>. The device is expended after that reaction roll, whether it succeeds or fails. It deals no damage. Tell your allies where you placed it; it is not inherently concealed from anyone.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Leverage",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 4,
      "cardType": "ability",
      "recallCost": 1,
      "description": "<p><b>Spend 1 Hope</b> and make a <b>Strength or Knowledge Roll (15)</b> to improvise a lever or pulley from available material. On a success, move one unattended, unsecured object no larger than a wagon up to a Very Close distance along a clear supporting surface. You must start within Melee range of it. This cannot move an occupied vehicle, a creature, a load-bearing part of a structure, or an object into a creature or hazard.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Running Repairs",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 5,
      "cardType": "ability",
      "recallCost": 1,
      "description": "<p>Once per rest, <b>spend 1 Hope</b> and make a <b>Knowledge Roll (15)</b> while working within Melee range of a broken mundane device no larger than a wagon. You need its major parts and a few uninterrupted moments. On a success, it functions until your next rest, when it needs proper repair. This restores ordinary mechanical function, not Armor Slots, consumable charges, ammunition, or a magical property.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Flash Charge",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 5,
      "cardType": "ability",
      "recallCost": 2,
      "description": "<p><b>Spend 1 Hope</b> and make one <b>Finesse attack roll</b> against up to two adversaries within Close range that are within Melee range of each other. Warn nearby allies to avert their eyes as you throw a small prepared flash charge. Each target you succeed against has disadvantage on their next attack roll before the scene ends. This deals no damage and cannot affect a target unable to perceive either the flash or its report. Additional uses do not stack on a target.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Rework",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 6,
      "cardType": "ability",
      "recallCost": 1,
      "description": "<p>During a rest, you can adjust one weapon or set of armor belonging to yourself or a willing ally. Until your next rest, the weapon gains <b>+2 to damage rolls</b>, or the armor's wearer gains <b>+2 to both damage thresholds</b> while wearing it. Describe the physical improvement. You can maintain one Rework at a time; an item cannot benefit from more than one Rework. This does not change the item's tier, burden, or existing feature.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Safety Line",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 6,
      "cardType": "ability",
      "recallCost": 1,
      "description": "<p>When a mundane trap, fall, or collapsing structure would deal damage to you or a willing ally within Very Close range, you can <b>spend 2 Hope</b> to reduce that damage by <b>2d8</b>. Describe how a line, brace, or tool you carried arrests the danger. Apply the reduction before damage thresholds and armor. This does not work against an adversary's attack. Only one Safety Line can reduce a particular instance of damage.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Artifice-Touched",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 7,
      "cardType": "ability",
      "recallCost": 2,
      "description": "<p>When four or more cards in your loadout are from the Artifice domain, including this card:</p><ul><li>Gain <b>+1 Finesse</b>.</li><li>When you Help an Ally by physically assisting with tools or a mechanism, roll a <b>d8</b> instead of a d6 as your advantage die. This does not reduce the Hope cost or grant an additional advantage die.</li></ul>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": [
        {
          "target": "trait",
          "trait": "finesse",
          "value": 1,
          "condition": "domain",
          "minimum": 4
        }
      ]
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Prepared Ground",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 7,
      "cardType": "ability",
      "recallCost": 2,
      "description": "<p>Once per long rest, spend at least a minute securing braces, screens, and footholds in a Very Close area around you, then <b>mark 2 Stress</b>. You and allies in that area gain <b>+2 Evasion</b> until the scene ends or the fixtures are dismantled or destroyed. The area needs a stable supporting surface and remains where you built it. You cannot overlap this benefit with another Prepared Ground.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Breaching Charge",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 8,
      "cardType": "ability",
      "recallCost": 2,
      "description": "<p>Once per long rest, <b>mark 2 Stress</b> and make a <b>Finesse attack roll</b> to place or throw a prepared powder charge. Choose up to three adversaries within Close range that are within Very Close range of a single point. Each must have an unobstructed path from that point that passes through no ally's position. Deal <b>4d8 physical damage</b> to each target you succeed against; roll damage once. Describe how you direct fragments along those clear paths.</p><p>Alternatively, use the charge against an unoccupied mundane barrier within Melee range, making a Knowledge Roll against a Difficulty the GM sets before you pay. On a success, open a person-sized gap. A reinforced or load-bearing structure may require a larger demolition project instead.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Rigged Rescue",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 8,
      "cardType": "ability",
      "recallCost": 2,
      "description": "<p>Once per rest, when a willing ally within Close range would mark HP from a physical attack, you can <b>spend 2 Hope and mark 1 Stress</b> to pull them clear with a line or movable fixture. After they use armor, reduce the damage severity by one threshold, reducing Minor to no HP marked. Then move them up to a Very Close distance to a safe, unoccupied point along a clear route. You must have a suitable line or fixture already connecting to the ally. Only one Rigged Rescue can affect that attack.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Chain Reaction",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 9,
      "cardType": "ability",
      "recallCost": 2,
      "description": "<p>Once per rest, after a successful single-target ranged physical weapon attack deals damage, you can <b>spend 2 Hope</b> to exploit a visible loose object or exposed surface beside the target. Apply the original attack roll against one other visible adversary within Very Close range of the first target and within your weapon's range. If it succeeds, deal half the first attack's total damage before the first target's resistance or mitigation, rounded down, to that adversary. Include the first attack's critical damage and bonuses in that total. Add no further damage or on-hit effects to the second hit, which uses its own target's mitigation. This cannot follow a Trick Shot, a multi-target attack, or a Tag Team Roll, and cannot trigger itself.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Master Mechanic",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 9,
      "cardType": "ability",
      "recallCost": 1,
      "description": "<p>Once per long rest, <b>spend 2 Hope</b> and work for one uninterrupted hour with suitable tools and most of the original parts. Restore a damaged mundane vehicle or mechanism no larger than a wagon to ordinary working condition without a roll. You can instead repair a wagon-sized section of a larger vessel or installation. This does not supply missing cargo, fuel, ammunition, Armor Slots, charges, or magical functions. Tell the group whose methods you used and how their work lives on in yours.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Impossible Apparatus",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 10,
      "cardType": "ability",
      "recallCost": 3,
      "description": "<p>Once per long rest, <b>spend 3 Hope</b>, work for a minute with substantial available material, and make a <b>Knowledge Roll (18)</b>. On a success, assemble one of these devices until the scene ends: a bridge spanning a gap within Close range; an anchored lift carrying up to a wagon's weight a Close distance; or a fixed barricade covering a Close frontage. All need secure supports. The barricade gives partial cover and reduces damage from attacks passing through it by <b>2d8</b>, rolled once per attack before thresholds and armor. Its reduction does not stack with another Impossible Apparatus. The devices are operated physically and grant no attacks of their own.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Escape Route",
    "type": "domainCard",
    "folder": "Artifice",
    "img": "systems/gluniverse-daggerheart/assets/domains/artifice.svg",
    "system": {
      "domain": "artifice",
      "level": 10,
      "cardType": "ability",
      "recallCost": 2,
      "description": "<p>Once per long rest, <b>spend 3 Hope</b> and make a <b>Finesse Roll (18)</b> to deploy lines, ramps, or movable supports from suitable equipment and surroundings. On a success, you and willing allies within Close range who can move may immediately travel without additional rolls to one safe, visible point within Far range of you. A continuous route must exist or be physically supported by the equipment you deploy. This does not remove Restrained, pass through solid barriers, or grant attacks. The route then falls apart or becomes unusable; resolve any Fear from your roll normally.</p>",
      "inLoadout": false,
      "printing": {
        "artist": "",
        "code": ""
      },
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Workshop Pocket Flintlock",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 1,
      "slot": "primary",
      "equipped": false,
      "trait": "finesse",
      "range": "veryClose",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d8",
        "bonus": 0,
        "type": "physical"
      },
      "feature": {
        "name": "Concealable",
        "description": "<p>Gain advantage on action rolls to conceal this weapon on your person. This does not grant advantage on an attack or make the shot quiet.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Improved Workshop Pocket Flintlock",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 2,
      "slot": "primary",
      "equipped": false,
      "trait": "finesse",
      "range": "veryClose",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d8",
        "bonus": 3,
        "type": "physical"
      },
      "feature": {
        "name": "Concealable",
        "description": "<p>Gain advantage on action rolls to conceal this weapon on your person. This does not grant advantage on an attack or make the shot quiet.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Advanced Workshop Pocket Flintlock",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 3,
      "slot": "primary",
      "equipped": false,
      "trait": "finesse",
      "range": "veryClose",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d8",
        "bonus": 6,
        "type": "physical"
      },
      "feature": {
        "name": "Concealable",
        "description": "<p>Gain advantage on action rolls to conceal this weapon on your person. This does not grant advantage on an attack or make the shot quiet.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Legendary Workshop Pocket Flintlock",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 4,
      "slot": "primary",
      "equipped": false,
      "trait": "finesse",
      "range": "veryClose",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d8",
        "bonus": 9,
        "type": "physical"
      },
      "feature": {
        "name": "Concealable",
        "description": "<p>Gain advantage on action rolls to conceal this weapon on your person. This does not grant advantage on an attack or make the shot quiet.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Workshop Boarding Pistol",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 1,
      "slot": "primary",
      "equipped": false,
      "trait": "finesse",
      "range": "far",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 0,
        "type": "physical"
      },
      "feature": {
        "name": "Adaptable",
        "description": "<p>You can use Agility instead of Finesse for attacks with this weapon.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Improved Workshop Boarding Pistol",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 2,
      "slot": "primary",
      "equipped": false,
      "trait": "finesse",
      "range": "far",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 3,
        "type": "physical"
      },
      "feature": {
        "name": "Adaptable",
        "description": "<p>You can use Agility instead of Finesse for attacks with this weapon.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Advanced Workshop Boarding Pistol",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 3,
      "slot": "primary",
      "equipped": false,
      "trait": "finesse",
      "range": "far",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 6,
        "type": "physical"
      },
      "feature": {
        "name": "Adaptable",
        "description": "<p>You can use Agility instead of Finesse for attacks with this weapon.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Legendary Workshop Boarding Pistol",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 4,
      "slot": "primary",
      "equipped": false,
      "trait": "finesse",
      "range": "far",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 9,
        "type": "physical"
      },
      "feature": {
        "name": "Adaptable",
        "description": "<p>You can use Agility instead of Finesse for attacks with this weapon.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Workshop Long Musket",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 1,
      "slot": "primary",
      "equipped": false,
      "trait": "agility",
      "range": "veryFar",
      "burden": "twoHanded",
      "damage": {
        "count": 1,
        "dice": "d8",
        "bonus": 1,
        "type": "physical"
      },
      "feature": {
        "name": "Long Stock",
        "description": "<p>Attacks with this weapon against a target within Melee range have disadvantage.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Improved Workshop Long Musket",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 2,
      "slot": "primary",
      "equipped": false,
      "trait": "agility",
      "range": "veryFar",
      "burden": "twoHanded",
      "damage": {
        "count": 1,
        "dice": "d8",
        "bonus": 4,
        "type": "physical"
      },
      "feature": {
        "name": "Long Stock",
        "description": "<p>Attacks with this weapon against a target within Melee range have disadvantage.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Advanced Workshop Long Musket",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 3,
      "slot": "primary",
      "equipped": false,
      "trait": "agility",
      "range": "veryFar",
      "burden": "twoHanded",
      "damage": {
        "count": 1,
        "dice": "d8",
        "bonus": 7,
        "type": "physical"
      },
      "feature": {
        "name": "Long Stock",
        "description": "<p>Attacks with this weapon against a target within Melee range have disadvantage.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Legendary Workshop Long Musket",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 4,
      "slot": "primary",
      "equipped": false,
      "trait": "agility",
      "range": "veryFar",
      "burden": "twoHanded",
      "damage": {
        "count": 1,
        "dice": "d8",
        "bonus": 10,
        "type": "physical"
      },
      "feature": {
        "name": "Long Stock",
        "description": "<p>Attacks with this weapon against a target within Melee range have disadvantage.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Workshop Deck Blunderbuss",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 1,
      "slot": "primary",
      "equipped": false,
      "trait": "strength",
      "range": "veryClose",
      "burden": "twoHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 1,
        "type": "physical"
      },
      "feature": {
        "name": "Spread",
        "description": "<p>Before attacking, you can mark 1 Stress to also target a second adversary within Melee range of the first and within this weapon's range. Apply the same attack roll to both targets and roll damage once for those hit.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Improved Workshop Deck Blunderbuss",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 2,
      "slot": "primary",
      "equipped": false,
      "trait": "strength",
      "range": "veryClose",
      "burden": "twoHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 4,
        "type": "physical"
      },
      "feature": {
        "name": "Spread",
        "description": "<p>Before attacking, you can mark 1 Stress to also target a second adversary within Melee range of the first and within this weapon's range. Apply the same attack roll to both targets and roll damage once for those hit.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Advanced Workshop Deck Blunderbuss",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 3,
      "slot": "primary",
      "equipped": false,
      "trait": "strength",
      "range": "veryClose",
      "burden": "twoHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 7,
        "type": "physical"
      },
      "feature": {
        "name": "Spread",
        "description": "<p>Before attacking, you can mark 1 Stress to also target a second adversary within Melee range of the first and within this weapon's range. Apply the same attack roll to both targets and roll damage once for those hit.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Legendary Workshop Deck Blunderbuss",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 4,
      "slot": "primary",
      "equipped": false,
      "trait": "strength",
      "range": "veryClose",
      "burden": "twoHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 10,
        "type": "physical"
      },
      "feature": {
        "name": "Spread",
        "description": "<p>Before attacking, you can mark 1 Stress to also target a second adversary within Melee range of the first and within this weapon's range. Apply the same attack roll to both targets and roll damage once for those hit.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Workshop Turning Pepperbox",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 1,
      "slot": "primary",
      "equipped": false,
      "trait": "finesse",
      "range": "close",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 1,
        "type": "physical"
      },
      "feature": {
        "name": "Follow Through",
        "description": "<p>After rolling this weapon's damage, you can mark 1 Stress to reroll one of its damage dice, keeping the new result. Use this feature at most once per attack.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Improved Workshop Turning Pepperbox",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 2,
      "slot": "primary",
      "equipped": false,
      "trait": "finesse",
      "range": "close",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 4,
        "type": "physical"
      },
      "feature": {
        "name": "Follow Through",
        "description": "<p>After rolling this weapon's damage, you can mark 1 Stress to reroll one of its damage dice, keeping the new result. Use this feature at most once per attack.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Advanced Workshop Turning Pepperbox",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 3,
      "slot": "primary",
      "equipped": false,
      "trait": "finesse",
      "range": "close",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 7,
        "type": "physical"
      },
      "feature": {
        "name": "Follow Through",
        "description": "<p>After rolling this weapon's damage, you can mark 1 Stress to reroll one of its damage dice, keeping the new result. Use this feature at most once per attack.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Legendary Workshop Turning Pepperbox",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 4,
      "slot": "primary",
      "equipped": false,
      "trait": "finesse",
      "range": "close",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 10,
        "type": "physical"
      },
      "feature": {
        "name": "Follow Through",
        "description": "<p>After rolling this weapon's damage, you can mark 1 Stress to reroll one of its damage dice, keeping the new result. Use this feature at most once per attack.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Workshop Brace Cannon",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 1,
      "slot": "primary",
      "equipped": false,
      "trait": "strength",
      "range": "far",
      "burden": "twoHanded",
      "damage": {
        "count": 1,
        "dice": "d10",
        "bonus": 1,
        "type": "physical"
      },
      "feature": {
        "name": "Recoil",
        "description": "<p>While this weapon is equipped, take a −1 penalty to Evasion.</p>",
        "modifiers": [
          {
            "target": "evasion",
            "value": -1
          }
        ]
      },
      "evasionModifier": -1,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Improved Workshop Brace Cannon",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 2,
      "slot": "primary",
      "equipped": false,
      "trait": "strength",
      "range": "far",
      "burden": "twoHanded",
      "damage": {
        "count": 1,
        "dice": "d10",
        "bonus": 4,
        "type": "physical"
      },
      "feature": {
        "name": "Recoil",
        "description": "<p>While this weapon is equipped, take a −1 penalty to Evasion.</p>",
        "modifiers": [
          {
            "target": "evasion",
            "value": -1
          }
        ]
      },
      "evasionModifier": -1,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Advanced Workshop Brace Cannon",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 3,
      "slot": "primary",
      "equipped": false,
      "trait": "strength",
      "range": "far",
      "burden": "twoHanded",
      "damage": {
        "count": 1,
        "dice": "d10",
        "bonus": 7,
        "type": "physical"
      },
      "feature": {
        "name": "Recoil",
        "description": "<p>While this weapon is equipped, take a −1 penalty to Evasion.</p>",
        "modifiers": [
          {
            "target": "evasion",
            "value": -1
          }
        ]
      },
      "evasionModifier": -1,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Legendary Workshop Brace Cannon",
    "type": "weapon",
    "folder": "Primary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/primary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 4,
      "slot": "primary",
      "equipped": false,
      "trait": "strength",
      "range": "far",
      "burden": "twoHanded",
      "damage": {
        "count": 1,
        "dice": "d10",
        "bonus": 10,
        "type": "physical"
      },
      "feature": {
        "name": "Recoil",
        "description": "<p>While this weapon is equipped, take a −1 penalty to Evasion.</p>",
        "modifiers": [
          {
            "target": "evasion",
            "value": -1
          }
        ]
      },
      "evasionModifier": -1,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Workshop Sleeve Flintlock",
    "type": "weapon",
    "folder": "Secondary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/secondary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 1,
      "slot": "secondary",
      "equipped": false,
      "trait": "finesse",
      "range": "veryClose",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 0,
        "type": "physical"
      },
      "feature": {
        "name": "Paired",
        "description": "<p>Add +2 to primary weapon damage against targets within Melee range. Add the bonus once to a damaging attack. It does not apply when Trick Shot replaces that damage.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Improved Workshop Sleeve Flintlock",
    "type": "weapon",
    "folder": "Secondary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/secondary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 2,
      "slot": "secondary",
      "equipped": false,
      "trait": "finesse",
      "range": "veryClose",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 2,
        "type": "physical"
      },
      "feature": {
        "name": "Paired",
        "description": "<p>Add +3 to primary weapon damage against targets within Melee range. Add the bonus once to a damaging attack. It does not apply when Trick Shot replaces that damage.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Advanced Workshop Sleeve Flintlock",
    "type": "weapon",
    "folder": "Secondary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/secondary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 3,
      "slot": "secondary",
      "equipped": false,
      "trait": "finesse",
      "range": "veryClose",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 4,
        "type": "physical"
      },
      "feature": {
        "name": "Paired",
        "description": "<p>Add +4 to primary weapon damage against targets within Melee range. Add the bonus once to a damaging attack. It does not apply when Trick Shot replaces that damage.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  },
  {
    "name": "Legendary Workshop Sleeve Flintlock",
    "type": "weapon",
    "folder": "Secondary Weapons",
    "img": "systems/gluniverse-daggerheart/assets/types/secondary.svg",
    "system": {
      "description": "<p>Gunslinger playtest firearm. Physical and nonmagical. Reloading is narrative; no ammunition counter or automatic misfire. Existing firearms retain their own rules. See the Gunslinger Playtest Rules journal for collection rules.</p>",
      "tier": 4,
      "slot": "secondary",
      "equipped": false,
      "trait": "finesse",
      "range": "veryClose",
      "burden": "oneHanded",
      "damage": {
        "count": 1,
        "dice": "d6",
        "bonus": 6,
        "type": "physical"
      },
      "feature": {
        "name": "Paired",
        "description": "<p>Add +5 to primary weapon damage against targets within Melee range. Add the bonus once to a damaging attack. It does not apply when Trick Shot replaces that damage.</p>",
        "modifiers": []
      },
      "evasionModifier": 0,
      "armorScoreModifier": 0,
      "magical": false,
      "modifiers": []
    },
    "flags": {
      "gluniverse-daggerheart": {
        "contentPackage": "gunslinger",
        "homebrewVersion": "0.1"
      }
    }
  }
];
