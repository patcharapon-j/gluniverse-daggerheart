/**
 * World settings.
 *
 * The Fear pool lives here rather than on any actor, because Fear is not
 * anybody's — it is the GM's, it is one number for the whole table, and
 * hanging it off a token would make it disappear when that token did.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "./config.ts";

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
  game.settings.register(SYSTEM_ID, "activity", {
    name: "DAGGERHEART.Settings.Activity",
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange: () => Hooks.callAll("daggerheart.activityChanged"),
  });

  /* Off by default, and deliberately so: the chat plate draws its own dice
     with its own geometry, and a 3D d12 tumbling next to a drawn one is two
     answers to the same question. Tables that want the toy can have it. */
  game.settings.register(SYSTEM_ID, "diceSoNice", {
    name: "DAGGERHEART.Settings.DiceSoNice",
    hint: "DAGGERHEART.Settings.DiceSoNiceHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });
}

export const getFear = (): number => Number(game.settings.get(SYSTEM_ID, "fear") ?? 0);

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
