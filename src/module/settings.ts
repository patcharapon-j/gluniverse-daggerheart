/**
 * World settings.
 *
 * The Fear pool lives here rather than on any actor, because Fear is not
 * anybody's — it is the GM's, it is one number for the whole table, and
 * hanging it off a token would make it disappear when that token did.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "./config.ts";
import { registerGunslingerSettings } from "./gunslinger.ts";
import { registerVariantSettings } from "./variants.ts";

/** The Fear pool caps at twelve. */
export const FEAR_MAX = 12;

export function registerSettings(): void {
  game.settings.register(SYSTEM_ID, "fear", {
    name: "DAGGERHEART.Settings.Fear",
    scope: "world",
    config: false,
    type: Number,
    default: 0,
    onChange: () => Hooks.callAll("daggerheart.fearChanged", getFear()),
  });

  /* How far this world's *data* has been brought up to date — a plain
     counter, and deliberately **not** the system version.

     The obvious build stamps `game.system.version` and gates each step on
     `isNewerVersion`, and it is quietly broken here: `.github/workflows/release.yml`
     lets a human pick hotfix, minor or major at release time, so the version
     a step ships in is not known when the step is written. Guess 1.11.0,
     have the release come out as 1.10.2, and the step runs, stamps 1.10.2,
     and is still newer than the stamp on the next launch — so it runs again,
     every launch, forever.

     A counter has no such coupling. A step declares the number it brings the
     world *to*, the stamp is the highest number that has run, and nothing
     about it moves when somebody picks a different release kind. Zero is a
     world that has never been migrated, which is every world that predates
     this file. See `migration/index.ts`.

     `config:false` because it is a record rather than a dial, and
     world-scoped because a migration happens once to the world and not once
     per person who logs into it. */
  game.settings.register(SYSTEM_ID, "dataVersion", {
    name: "DAGGERHEART.Settings.DataVersion",
    scope: "world",
    config: false,
    type: Number,
    default: 0,
  });

  /* The SRD's *Massive Damage* optional rule — twice your Severe threshold
     marks four Hit Points rather than three.

     **Default on, and that is a migration decision rather than a reading of
     the book.** The rule is printed as optional and a fresh table might
     reasonably expect it off; this system has applied it unconditionally
     since the damage band was drawn, so defaulting it off would silently
     change what damage does at every table that upgrades. A rules change
     nobody asked for is worse than a default that disagrees with the
     book's own suggestion, and the switch is right here either way.

     What it gates is `severityFor`'s top rung and the band's fifth zone
     together — the two must agree, or the dialog offers a zone the document
     will never return. */
  game.settings.register(SYSTEM_ID, "massiveDamage", {
    name: "DAGGERHEART.Settings.MassiveDamage",
    hint: "DAGGERHEART.Settings.MassiveDamageHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  /* The SRD's *Defined Ranges* optional rule. Off by default, because this
     one genuinely is the book's exception rather than its rule — the ranges
     are fiction-first and say so out loud, and the printed squares are for a
     table that has decided to play on a grid.

     World-scoped, because it is the table's agreement about what Close
     means. A per-client switch would put two people at one map measuring the
     same reach differently, which is the exact disagreement the ruler was
     drawn to surface. */
  game.settings.register(SYSTEM_ID, "definedRanges", {
    name: "DAGGERHEART.Settings.DefinedRanges",
    hint: "DAGGERHEART.Settings.DefinedRangesHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => Hooks.callAll("daggerheart.rangeRulerChanged"),
  });

  /* And the ten supplemental campaign variants, which are content gates
     rather than rules and are registered together in their own module —
     ten near-identical registrations inlined here would bury the four
     settings above them that each say something different. */
  registerVariantSettings();
  registerGunslingerSettings();

  game.settings.register(SYSTEM_ID, "theme", {
    name: "DAGGERHEART.Settings.Theme",
    hint: "DAGGERHEART.Settings.ThemeHint",
    scope: "client",
    config: true,
    type: String,
    choices: { dark: "DAGGERHEART.Theme.Dark", light: "DAGGERHEART.Theme.Light" },
    default: "dark",
    onChange: applyTheme,
  });

  /* Readability belongs to the person at the screen. These two dials are
     client-scoped so a player can enlarge their sheet and card peeks without
     changing the layout for anybody else at the table. CSS variables keep
     the preference live across every open sheet; no rerender is needed. */
  game.settings.register(SYSTEM_ID, "sheetFontScale", {
    name: "DAGGERHEART.Settings.SheetFontScale",
    hint: "DAGGERHEART.Settings.SheetFontScaleHint",
    scope: "client",
    config: true,
    type: Number,
    range: { min: 0.9, max: 1.4, step: 0.05 },
    default: 1,
    onChange: applyDisplayPreferences,
  });

  game.settings.register(SYSTEM_ID, "hoverCardScale", {
    name: "DAGGERHEART.Settings.HoverCardScale",
    hint: "DAGGERHEART.Settings.HoverCardScaleHint",
    scope: "client",
    config: true,
    type: Number,
    range: { min: 0.75, max: 1.5, step: 0.05 },
    default: 1,
    onChange: applyDisplayPreferences,
  });

  /* How much the cards move, and it is client-scoped for the reason the two
     dials above it are: a card turning under the pointer is a fact about one
     person's screen, and the OS setting it overrides — `prefers-reduced-motion`
     — is itself a per-person accessibility preference. A world switch would
     let the GM decide whose inner ear is which.

     Three values, and the middle one is why this exists. Until now the only
     way to turn the motion down was the OS dial, which is all or nothing and
     which a lot of people leave on `reduce` for reasons that have nothing to
     do with a 6° tilt. `full` is the card as drawn, `reduced` keeps the
     transitions and takes them to about a third, and `off` is zero.

     `inherit` is the fourth value the obvious build would have, and it is
     deliberately absent: `full` already means "whatever the OS says" for
     everybody who has not touched the OS dial, and a setting whose default
     reads as a third state is a setting nobody can tell the state of. What
     `full` costs is that somebody with `reduce` set system-wide and `full`
     chosen here gets motion — which is the right way round, because they
     said so here, afterwards, about this system. */
  game.settings.register(SYSTEM_ID, "motion", {
    name: "DAGGERHEART.Settings.Motion",
    hint: "DAGGERHEART.Settings.MotionHint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      full: "DAGGERHEART.Motion.Full",
      reduced: "DAGGERHEART.Motion.Reduced",
      off: "DAGGERHEART.Motion.Off",
    },
    default: "full",
    onChange: applyDisplayPreferences,
  });

  /* On by default, and world-scoped, because what is being switched is
     whether the table's changes are *recorded at all* rather than who gets to
     look at the record. That question stopped being a matter of taste when
     the log left chat: a per-client switch would have let one player opt out
     of being seen, which was always the opposite of the point, and now there
     is nothing for a player to opt out of — the record is the GM's window and
     nobody else's. One decision, and the GM's. */
  game.settings.register(SYSTEM_ID, "changeLog", {
    name: "DAGGERHEART.Settings.ChangeLog",
    hint: "DAGGERHEART.Settings.ChangeLogHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => Hooks.callAll("daggerheart.activityChanged"),
  });

  /* The record itself. World-scoped because it is the table's evening rather
     than one client's session — a GM who reloads rejoins it, and two GMs read
     one log instead of two — and `config:false` because it is data rather than
     a preference: the window is where it is read and cleared.

     Only the active GM ever writes it; see `activity-log.ts`. The `onChange`
     is the one hook every reader listens to, so the window and the unread
     badge have one thing to be told rather than two. */
  /* The chip itself. Client-scoped and on by default, because what it
     switches is whether *this* screen draws them — which is a matter of
     taste in a way the change log's switch deliberately is not. A player
     running a small window, or one who simply wants the artwork, is making
     a decision about their own display and nobody else's. */
  game.settings.register(SYSTEM_ID, "tokenChip", {
    name: "DAGGERHEART.Settings.TokenChip",
    hint: "DAGGERHEART.Settings.TokenChipHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => Hooks.callAll("daggerheart.tokenChipChanged"),
  });

  /* The range rings under the selected token, and it is client-scoped for
     the reason the chip's switch is rather than a similar one: a selection
     only ever exists on one screen, so a ruler is only ever drawn on the
     screen of the person who made it. There is no permission question here
     and therefore no world setting — which is also why this needed no
     `adversaryChip` of its own. */
  game.settings.register(SYSTEM_ID, "rangeRuler", {
    name: "DAGGERHEART.Settings.RangeRuler",
    hint: "DAGGERHEART.Settings.RangeRulerHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => Hooks.callAll("daggerheart.rangeRulerChanged"),
  });

  /* The dial, and it is WORLD-scoped where the two switches above are not.
     Those say what this screen draws, which is a preference; this says how
     large a chip is over a creature, and the creatures are the GM's — they
     make the tokens, choose the artwork, set the ring and pick the fit
     mode. A per-client dial would mean four people looking at one ogre and
     seeing its Stress track in four places, with the one who built the
     token unable to fix it for anybody else.

     A MULTIPLIER on the derived radius and never a replacement for it. The
     fit modes and the two token scales are read and answered automatically;
     this is the correction for the case the derivation cannot see — a
     module's own ring, a sprite cropped tight inside its own square, or a
     table that simply wants more air. Setting it absolutely would throw the
     automatic handling away to fix one token.

     It is also the honest escape hatch for the one input this system cannot
     verify. Subject scale reaches Foundry's shader as a UV correction rather
     than as a radius, and which way it moves the ring is read off the source
     rather than measured; see chipScale in design/token.js. If it is
     backwards at a real table, this is the answer, and it is one press. */
  game.settings.register(SYSTEM_ID, "tokenChipScale", {
    name: "DAGGERHEART.Settings.TokenChipScale",
    hint: "DAGGERHEART.Settings.TokenChipScaleHint",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0.8, max: 1.6, step: 0.01 },
    default: 1,
    onChange: () => Hooks.callAll("daggerheart.tokenChipChanged"),
  });

  /* What players see on an adversary, and it is world-scoped for the reason
     the change log is: it is a ruling about the table rather than a
     preference about a screen. A GM who has decided the party may not read
     an ogre's Stress cannot have one player opt back in.

     Three values rather than two, because the interesting one is in the
     middle. `none` is the default and the traditional answer. `full` is the
     card-on-the-table game. `marks` is the one this system is actually
     shaped for — the arcs without the Difficulty, so the table can see that
     the ogre is nearly out of Stress without being handed the number they
     are supposed to be discovering by rolling against it.

     Vulnerable is exempt at every setting and that is not an oversight: a
     creature that is easier to hit is a fact somebody at the table produced,
     and hiding the consequence of your own hit is the system taking back
     something the fiction already gave you. */
  game.settings.register(SYSTEM_ID, "adversaryChip", {
    name: "DAGGERHEART.Settings.AdversaryChip",
    hint: "DAGGERHEART.Settings.AdversaryChipHint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      none: "DAGGERHEART.AdversaryChip.None",
      marks: "DAGGERHEART.AdversaryChip.Marks",
      full: "DAGGERHEART.AdversaryChip.Full",
    },
    default: "none",
    onChange: () => Hooks.callAll("daggerheart.tokenChipChanged"),
  });

  game.settings.register(SYSTEM_ID, "activity", {
    name: "DAGGERHEART.Settings.Activity",
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange: () => Hooks.callAll("daggerheart.activityChanged"),
  });

  /* Dice So Nice is optional, but when it is installed our themed Hope, Fear,
     advantage, and disadvantage dice should appear without another setup step.
     This remains a client setting so each player can turn the animation off. */
  game.settings.register(SYSTEM_ID, "diceSoNice", {
    name: "DAGGERHEART.Settings.DiceSoNice",
    hint: "DAGGERHEART.Settings.DiceSoNiceHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });
}

export const getFear = (): number => Number(game.settings.get(SYSTEM_ID, "fear") ?? 0);

/**
 * The two optional rules, read rather than cached.
 *
 * Both are asked on every damage dialog and every ruler build, which is often
 * enough to be tempted to hold a copy and not often enough for it to matter —
 * and a copy is the bug the Fear strip and the token chip's switch both
 * argue against: the setting is the record, so read the record, and the two
 * cannot disagree whichever surface changed it.
 *
 * Both tolerate being called before `registerSettings` has run. `game.settings.get`
 * throws on an unregistered key, and the token chip's own report and a macro
 * can both reach these early; a rule that is off because the world has not
 * finished loading is a better answer than a stack trace.
 */
const flag = (key: string, fallback: boolean): boolean => {
  try {
    return Boolean(game.settings?.get(SYSTEM_ID, key) ?? fallback);
  } catch {
    return fallback;
  }
};

export const massiveDamage = (): boolean => flag("massiveDamage", true);
export const definedRanges = (): boolean => flag("definedRanges", false);

/** The high water mark of the migrations that have run in this world. */
export const getDataVersion = (): number =>
  Number(game.settings.get(SYSTEM_ID, "dataVersion") ?? 0);

export const setDataVersion = async (n: number): Promise<void> => {
  await game.settings.set(SYSTEM_ID, "dataVersion", n);
};

/**
 * Only a GM may write the pool; a player card's "GM gains a Fear" button
 * therefore states the claim rather than firing it, and the GM's own client
 * applies it. Returns the new value.
 */
export async function setFear(value: number): Promise<number> {
  const next = Math.clamp(Math.round(value), 0, FEAR_MAX);
  if (!game.user?.isGM) return getFear();
  await game.settings.set(SYSTEM_ID, "fear", next);
  return next;
}

export const gainFear = (n = 1): Promise<number> => setFear(getFear() + n);
export const spendFear = (n = 1): Promise<number> => setFear(getFear() - n);

/**
 * The theme is a class on <html>, not a stylesheet swap. Dark is the base,
 * and light is the substrate changing underneath the same role tokens.
 */
export function applyTheme(value?: string): void {
  const theme = value ?? game.settings.get(SYSTEM_ID, "theme") ?? "dark";
  document.documentElement.classList.toggle("dh-light", theme === "light");
}

/** Apply this client's sheet readability preferences to every open window. */
export function applyDisplayPreferences(): void {
  const read = (key: string, fallback: number, min: number, max: number): number => {
    let value = fallback;
    try {
      value = Number(game.settings?.get(SYSTEM_ID, key) ?? fallback);
    } catch {
      /* Settings are not available before init. Keep the documented default. */
    }
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  };

  const root = document.documentElement;
  root.style.setProperty(
    "--dh-sheet-font-scale",
    String(read("sheetFontScale", 1, 0.9, 1.4)),
  );
  root.style.setProperty(
    "--dh-hover-card-scale",
    String(read("hoverCardScale", 1, 0.75, 1.5)),
  );
  applyMotion();
}

/* ── the motion dial ──────────────────────────────────────────────────
   What the three choices are worth as `--vtt-motion-speed`, the single
   scale `face-tokens.css` multiplies all five card durations by.

   0.35 rather than 0.5 for `reduced`, because the number that has to come
   down is the one you notice: `--vtt-motion-reveal` is 620ms and the sweep
   runs at 2.2× that, so half speed is still most of a second of a line
   falling down a card. A third puts the reveal at about 220ms, which reads
   as a transition rather than as an event. */
const MOTION_SPEED: Record<string, number> = { full: 1, reduced: 0.35, off: 0 };

/**
 * The motion preference, as a rule in the document.
 *
 * **Not `documentElement.style.setProperty`, which is what the two dials
 * above do and what this started as.** Those two write tokens nothing
 * redeclares, so inheritance carries them into every sheet.
 * `--vtt-motion-speed` is different: `face-tokens.css` declares it *on*
 * `.dh` — once at 1, and again at 0 inside
 * `@media (prefers-reduced-motion: reduce)`. A declared value on an element
 * beats an inherited one whatever the inherited one's origin or importance,
 * so a property set on `<html>` never reaches a `.dh` root at all, and under
 * a reduced-motion OS it would lose to the media query even if it did.
 *
 * So the preference has to arrive as a declaration on `.dh` itself, and the
 * two ways to do that are an inline style on every `.dh` root — of which
 * this system opens an unbounded, changing number — or one rule appended
 * after the system's stylesheets, where equal specificity is settled by
 * order and the later rule wins. The second is the one that holds still.
 * `:root` is named beside `.dh` so the handful of ported surfaces that live
 * outside a `.dh` root inherit it too.
 *
 * This is `sheets/card-style.ts`'s idiom, one `<style>` element rewritten in
 * place rather than appended to, because unlike a motif this value changes.
 */
let motionSheet: HTMLStyleElement | null = null;

export function applyMotion(value?: string): void {
  if (typeof document === "undefined") return;
  let choice = value;
  if (choice === undefined) {
    try {
      choice = String(game.settings?.get(SYSTEM_ID, "motion") ?? "full");
    } catch {
      /* Before init. The documented default is the card as drawn. */
      choice = "full";
    }
  }
  const speed = MOTION_SPEED[choice] ?? 1;
  motionSheet ??= document.head.appendChild(document.createElement("style"));
  motionSheet.textContent = `:root,.dh{--vtt-motion-speed:${speed}}`;
}

/**
 * Whether this client has asked for no motion at all.
 *
 * `off` takes every duration to zero, which is enough for everything the
 * stylesheets own — a transition that takes 0ms does not happen. It is not
 * enough for the two behaviours JavaScript owns. `face-fx.js`'s pointer tilt
 * still writes `--dh-rx`/`--dh-ry` on every move, so the card still *turns*,
 * instantly rather than smoothly, which is more jarring than the animation
 * was; and `sweep()` still hangs `data-sweeping` on the card for 1364ms. Both
 * are gated on one function in that file, `reduced()`, which reads
 * `matchMedia('(prefers-reduced-motion:reduce)')` and nothing else.
 *
 * This is the seam for that: `reduced()` wants to be
 * `matchMedia(…).matches || motionOff()`. `src/module/ui/face-fx.js` is
 * vendored from `design/face-fx.js` and neither may be edited from here, and
 * a design-system file cannot import a Foundry setting anyway — so the real
 * shape is a settable gate on the module (an exported `setMotionGate(fn)`,
 * or a `--vtt-motion-speed` read off the scope) and it is one deliberate
 * change in `design/`, not a workaround on this side.
 */
export const motionOff = (): boolean => {
  try {
    return String(game.settings?.get(SYSTEM_ID, "motion") ?? "full") === "off";
  } catch {
    return false;
  }
};
