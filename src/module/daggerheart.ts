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
import { DaggerheartItem, refreshDicePools, refreshResources } from "./documents/item.ts";
import { registerSheets } from "./sheets/register.ts";
import { registerChat } from "./dice/chat.ts";
import { registerMessageHeaders } from "./message-header.ts";
import { registerDice } from "./dice/dsn.ts";
import { rollAdversaryAttack, rollAttack, rollTrait, rollWeaponDamage } from "./dice/actions.ts";
import { rollDamage, rollDuality, rollFoe } from "./dice/rolls.ts";
import { applyTheme, gainFear, getFear, registerSettings, setFear, spendFear } from "./settings.ts";
import { openCreation, refreshCreation } from "./apps/create.ts";
import { openBrowser, registerBrowser } from "./apps/browse.ts";
import { registerFearHud } from "./fear-hud.ts";
import {
  rebuildTokenChips,
  registerTokenBars,
  registerTokenChips,
  reportTokenChips,
} from "./token-hud.ts";
import { registerRangeRuler, reportRangeRuler } from "./range-ruler.ts";
import { registerLedger, withoutLedger } from "./ledger.ts";
import { openActivity, registerActivityLog } from "./activity-log.ts";
import { registerBrawler } from "./brawler.ts";
import { openTokenStudio } from "./token-studio.ts";
import { clearMark, isMarkedCharacter, markedSpellcast, payUpkeep, registerMarked, rollOffMark } from "./marked.ts";

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
  /* The chip draws the tracks, so Foundry's two bars come off — and this has
     to happen at `init`, because it swaps the Token class the canvas builds
     its placeables from. */
  registerTokenBars();
  /* And the chips themselves — here at `init` and deliberately NOT beside the
     Fear strip at `ready`. The strip has to wait, because it writes into
     `#ui-top` and that does not exist until the game view is drawn. This only
     asks `Hooks.on`, and the hook it needs is `canvasReady`, which fires
     during `setupGame` — so a listener attached at `ready` is attached to an
     event that has already gone past. See the note on registerTokenChips. */
  registerTokenChips();
  /* And the ruler, beside them and for the identical reason — it needs
     `canvasReady`, which has already fired by the time `ready` runs. */
  registerRangeRuler();
  registerDataModels();
  registerSheets();
  registerChat();
  registerMessageHeaders();
  registerLedger();
  /* And where it lands. The ledger observes; this is the GM's window it is
     observed into, which is where the change log used to be a chat card. */
  registerActivityLog();

  /* The campaign frame's two hooks — the Fear a marked card owes, and the toll
     for holding both decks. Both are observers rather than instrumentation, so
     registering them costs a table not running the frame two predicates that
     return on their first line. */
  registerMarked();
  /* The Brawler's fists, kept in step with what else is equipped. Same shape
     and the same reason: a weapon becomes active by five routes and the
     document is the record. */
  registerBrawler();
  registerDice();
  registerBrowser();
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

  /* The creation window is not a document sheet, so Foundry does not re-render
     it when the actor changes — that courtesy is extended to registered sheets
     only. It has to be asked, and it has to be asked for *items* as well as for
     the actor: almost everything creation does is an embedded document arriving
     or leaving, and `updateActor` never fires for those.

     Cheap by construction. `refreshCreation` is a Map lookup that does nothing
     at all unless a creation window happens to be open for that exact actor,
     which is almost never. */
  const touched = (actor: any) => refreshCreation(actor);
  Hooks.on("updateActor", touched);
  for (const hook of ["createItem", "updateItem", "deleteItem"]) {
    Hooks.on(hook, (item: any) => {
      if (item?.parent?.documentName === "Actor") refreshCreation(item.parent);
    });
  }
});

/**
 * Give back every `scene`- or `session`-scoped resource on one character, or
 * on all of them.
 *
 * Only characters, and only ones somebody owns. A scene ending is a fact about
 * the party; sweeping every Actor in the world would reach the GM's adversary
 * roster and refill a stat block's pool because a player's card came back.
 */
async function refreshScope(scope: "scene" | "session", actor?: any): Promise<number> {
  const targets = actor
    ? [actor]
    : (game.actors?.filter?.((a: any) => a.type === "character") ?? []);

  /* Out of the change log, for the rest's reason one step further out. A
     scene ending gives back every once-per-scene pool at the table at once,
     and a ledger card per character listing twenty counters refilling is not
     a record of anything that happened — it is the bookkeeping the notification
     below already sums up in one line. */
  let moved = 0;
  for (const a of targets) {
    moved += (await withoutLedger(a, () => refreshResources(a, [scope]))).length;
    moved += (await withoutLedger(a, () => refreshDicePools(a, [scope]))).length;
  }

  if (moved) {
    ui.notifications?.info(
      game.i18n.format("DAGGERHEART.Resource.Refreshed", { n: moved, scope }),
    );
  }
  return moved;
}

Hooks.once("ready", () => {
  applyTheme();

  /* Not in `init` with the rest of the registrations: this one writes to
     Foundry's own chrome, and `#ui-top` does not exist until the game view
     has been drawn. */
  registerFearHud();

  /** Public API for macros and modules: `game.daggerheart.rollTrait(actor, "agility")`. */
  (game as any).daggerheart = {
    rollTrait,
    /* A console for the token chips. Both bugs in the first build were
       silent — a hook registered after it had fired, and a clip on a
       transformed box — so the component answers questions as well as
       drawing. `game.daggerheart.tokenChips()` reports; `.rebuild()` fixes. */
    tokenChips: Object.assign(reportTokenChips, { rebuild: rebuildTokenChips }),
    /* And one for the ruler, which needs it more: a component that only
       exists while something is selected has no steady state to inspect,
       so "it never appeared" and "it appeared and went" look the same
       afterwards. `game.daggerheart.rangeRuler()`. */
    rangeRuler: reportRangeRuler,
    rollAttack,
    rollWeaponDamage,
    rollAdversaryAttack,
    rollDuality,
    rollDamage,
    rollFoe,
    fear: { get: getFear, set: setFear, gain: gainFear, spend: spendFear },
    /** `game.daggerheart.create(actor)` — the same call the rail plate makes. */
    create: openCreation,

    /** `game.daggerheart.browse()` — the same call the compendium tab's own
        button makes. Takes nothing: the browser is about the world's packs
        rather than about any one document. */
    browse: openBrowser,

    /* `game.daggerheart.activity()` — the same call the chat sidebar's own
       button makes, and the same refusal: it is the GM's record, so a player
       who is handed the macro is told whose window it is rather than shown an
       empty one. */
    activity: openActivity,

    /* `game.daggerheart.tokenStudio(actor)` — the same call the diorama's
       Studio button and every actor sheet's header control make. A seam
       rather than a surface, for `endScene`'s reason: the module publishes
       no API of its own, so this is the one place in the world that knows
       how to reach it, and a macro or another module asking for it should
       not have to rediscover the import path. It refuses out loud when the
       module is absent rather than opening nothing. */
    tokenStudio: openTokenStudio,

    /* Two of the six refresh scopes have no automatic trigger, and these are
       not a placeholder for one. Foundry knows a rest happened because this
       system runs the dialog; it has no idea what a scene or a session is,
       and every candidate for inferring one is wrong somewhere real — a
       combat ending is not a scene ending, and a world being loaded is not a
       session starting for the table that plays two in a day.

       So they are a seam. A GM presses a macro, or a session-tracking module
       calls them, and the twenty entries that say "once per session" or
       "once per scene" come back. Both take an actor because a scope is a
       fact about a character's cards; `endSession()` with no argument does
       every player character in the world, which is what the GM means. */
    endScene: (actor?: any) => refreshScope("scene", actor),
    endSession: (actor?: any) => refreshScope("session", actor),

    /* *The Twilight Marked*. A seam rather than a surface, for the reason
       `endScene` is one: the long rest already runs the roll and the loadout
       already pays its own toll, and what is left is a GM wanting to mark
       somebody mid-session, take a mark off, or re-roll one by hand.

       `roll` takes the buy-down as an argument because the dialog does not ask
       — two Stress per two Difficulty is a real decision and it has nowhere to
       be made yet, so a table that wants it makes it in a macro until the
       character sheet grows a control for it. Stated here rather than left
       undiscoverable. */
    marked: {
      is: isMarkedCharacter,
      spellcast: markedSpellcast,
      roll: (actor: any, bought = 0) => rollOffMark(actor, bought),
      upkeep: payUpkeep,
      clear: clearMark,
    },
  };

  console.log(`${SYSTEM_ID} | Ready (v${game.system?.version ?? "unknown"})`);
});
