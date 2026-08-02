/**
 * GLUniverse — Daggerheart
 *
 * System entry point. Everything that has to exist before a document is
 * constructed goes in `init`; everything that needs a loaded world goes in
 * `ready`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ADVERSARY_TYPE_LABELS,
  CARD_TYPE_LABELS,
  CONDITIONS,
  DOMAIN_CONFIG,
  ENVIRONMENT_TYPE_LABELS,
  RANGE_LABELS,
  SYSTEM_ID,
  TRAIT_LABELS,
} from "./config.ts";
import { registerDataModels } from "./data/index.ts";
import { DaggerheartActor } from "./documents/actor.ts";
import { DaggerheartItem } from "./documents/item.ts";
import { registerSheets } from "./sheets/register.ts";
import { registerChat } from "./dice/chat.ts";
import { registerDice } from "./dice/dsn.ts";
import { rollAdversaryAttack, rollAttack, rollTrait, rollWeaponDamage } from "./dice/actions.ts";
import { rollDamage, rollDuality, rollFoe } from "./dice/rolls.ts";
import { applyTheme, gainFear, getFear, registerSettings, setFear, spendFear } from "./settings.ts";

/**
 * The design is set in Google Sans, which is not bundled — it is not ours to
 * redistribute. The stylesheet is requested at init and every rule falls
 * back to a system stack, so an offline client gets the layout and the
 * metrics without the face.
 */
function requestFonts(): void {
  if (document.getElementById("dh-fonts")) return;
  const link = document.createElement("link");
  link.id = "dh-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700" +
    "&family=Google+Sans+Text:wght@400;500;600;700" +
    "&family=Google+Sans+Code:wght@400;500;600;700&display=swap";
  document.head.append(link);
}

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | Initializing GLUniverse — Daggerheart`);

  CONFIG.Actor.documentClass = DaggerheartActor;
  CONFIG.Item.documentClass = DaggerheartItem;

  // Published for modules and macros that want the closed sets without
  // importing from a bundled ES module they cannot reach.
  CONFIG.DAGGERHEART = {
    domains: DOMAIN_CONFIG,
    traits: TRAIT_LABELS,
    ranges: RANGE_LABELS,
    cardTypes: CARD_TYPE_LABELS,
    adversaryTypes: ADVERSARY_TYPE_LABELS,
    environmentTypes: ENVIRONMENT_TYPE_LABELS,
  };

  /* Foundry's own list is generic — blinded, deaf, paralysis, prone — and
     none of those words appear in this game. Daggerheart names exactly three
     conditions and the honest thing is to offer three, rather than to leave a
     table picking whichever of Foundry's dozen sounds closest to Restrained.

     `dead` survives the replacement because it is not a condition, it is what
     `specialStatusEffects.DEFEATED` points at — the combat tracker crosses a
     combatant out with it, and dropping it would take that with it. */
  CONFIG.statusEffects = [
    ...CONDITIONS.map((c) => ({ id: c.id, name: c.name, img: c.img, description: c.rule })),
    { id: "dead", name: "EFFECT.StatusDead", img: "icons/svg/skull.svg" },
  ];
  CONFIG.specialStatusEffects.DEFEATED = "dead";

  registerSettings();
  registerDataModels();
  registerSheets();
  registerChat();
  registerDice();
  requestFonts();

  /* Vulnerable, kept in step with the Stress track — the one condition the
     sheet can work out for itself. Gated on the active GM for the reason the
     Fear claim is: the hook fires on every connected client, and three
     clients agreeing to write the same effect is three writes and a race.
     One nominated writer, and every other client sees the result replicate. */
  Hooks.on("updateActor", (actor: any, changed: any) => {
    if (actor.type !== "character") return;
    if (game.users?.activeGM !== game.user) return;
    if (!foundry.utils.hasProperty(changed, "system.resources.stress")) return;
    void actor.syncVulnerable?.();
  });
});

Hooks.once("ready", () => {
  applyTheme();

  /** Public API for macros and modules: `game.daggerheart.rollTrait(actor, "agility")`. */
  (game as any).daggerheart = {
    rollTrait,
    rollAttack,
    rollWeaponDamage,
    rollAdversaryAttack,
    rollDuality,
    rollDamage,
    rollFoe,
    fear: { get: getFear, set: setFear, gain: gainFear, spend: spendFear },
  };

  console.log(`${SYSTEM_ID} | Ready (v${game.system?.version ?? "unknown"})`);
});
