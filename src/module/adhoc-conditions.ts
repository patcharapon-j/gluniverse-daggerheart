/**
 * Conditions this system does not name.
 *
 * Daggerheart names sixteen and `config.ts` has all sixteen, which is the
 * right list and is not the whole list a table needs. A GM says "you are
 * Waterlogged until you dry off" and means it exactly as hard as Restrained;
 * the difference is that no card will ever mention it. Before this, the only
 * way to record that was Foundry's Effects tab, where it is a row of text on
 * a sheet nobody has open — so the thing the GM said out loud was the one
 * kind of condition the board could not show.
 *
 * ── it is a status, not a note ───────────────────────────────────────
 * An ad-hoc condition is an ActiveEffect carrying a status id, exactly as
 * the sixteen are, and everything downstream reads it through
 * `actor.statuses` and `actor.appliedEffects` without knowing the
 * difference. That is the whole of why it is worth doing this way rather
 * than with a flag holding an array of strings: a status participates in
 * Foundry's own machinery — it is suppressed when the effect is disabled,
 * it transfers from items, it shows in the Effects tab, another module can
 * see it — and a flag participates in nothing.
 *
 * The id is derived from the name rather than random, so naming the same
 * thing twice on one creature is the same condition rather than two of it.
 * Names that slug to nothing at all — a name written entirely in a script
 * with no ASCII in it — fall back to a hash of the name, because "no id" is
 * not an answer and silently dropping the GM's condition is worse than an
 * id nobody will ever read.
 *
 * ── one material for all of them ─────────────────────────────────────
 * See `ADHOC_CONDITION_ID` in `token-conditions.ts`. The short version: the
 * shader draws the sixteen as what they are and has no idea what
 * Waterlogged is, so it says only that the creature is marked. It says it
 * at all — rather than leaving an ad-hoc condition with no material —
 * because the sentence naming it leaves at 36px and the material does not.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { dhDialog } from "./apps/dialog.ts";
import { SYSTEM_PATH } from "./config.ts";

/** Reserved. Anything under it is ours and is a condition somebody typed. */
const PREFIX = "dh-adhoc-";
const IMG = `${SYSTEM_PATH}/assets/conditions/adhoc.svg`;

/** Long enough for a phrase, short enough to still be a condition. */
export const ADHOC_NAME_MAX = 32;

export interface AdhocCondition {
  /** The status id, and what `actor.statuses` holds. */
  id: string;
  /** What the GM typed, and what the chip's sentence says. */
  name: string;
}

/** Collapse whitespace and cap the length. What is stored and what is shown. */
export function adhocName(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, ADHOC_NAME_MAX);
}

/**
 * The status id for a name.
 *
 * Case- and punctuation-insensitive on purpose: "On Fire", "on fire" and
 * "on-fire" are one condition, because a GM typing the same thing twice
 * across two sessions meant the same thing twice.
 */
export function adhocStatusId(raw: unknown): string {
  const name = adhocName(raw);
  if (!name) return "";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug) return PREFIX + slug;
  /* Nothing ASCII survived. A 32-bit FNV-ish walk over the name is enough to
     separate two of them and is stable across sessions, which is all the id
     has to be — it is never read by a person. */
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return PREFIX + hash.toString(36);
}

export const isAdhocStatus = (id: unknown): boolean =>
  typeof id === "string" && id.startsWith(PREFIX);

/**
 * The ad-hoc conditions currently ON a creature, in the order they were put
 * there.
 *
 * Off `appliedEffects` rather than `effects`, which is the ledger's rule
 * again: a disabled effect is not a condition the creature has, and reading
 * the raw collection would keep drawing it after somebody switched it off.
 */
export function adhocConditions(actor: any): AdhocCondition[] {
  const out: AdhocCondition[] = [];
  const seen = new Set<string>();
  for (const effect of actor?.appliedEffects ?? []) {
    for (const status of effect?.statuses ?? []) {
      if (!isAdhocStatus(status) || seen.has(status)) continue;
      seen.add(status);
      out.push({ id: status, name: adhocName(effect?.name) || status.slice(PREFIX.length) });
    }
  }
  return out;
}

/** @returns false when the name was empty or the creature already has it. */
export async function addAdhocCondition(actor: any, raw: unknown): Promise<boolean> {
  const name = adhocName(raw);
  const id = adhocStatusId(name);
  if (!actor || !name || !id || actor.statuses?.has?.(id)) return false;
  await actor.createEmbeddedDocuments("ActiveEffect", [{ name, img: IMG, statuses: [id] }]);
  return true;
}

export async function removeAdhocCondition(actor: any, id: string): Promise<void> {
  const doomed = (actor?.effects ?? [])
    .filter((effect: any) => effect?.statuses?.has?.(id))
    .map((effect: any) => effect.id);
  if (doomed.length) await actor.deleteEmbeddedDocuments("ActiveEffect", doomed);
}

/* ── the GM's way in ───────────────────────────────────────────────────
   In Foundry's own status palette, beside the sixteen, because that is
   where a GM already goes to put a condition on a creature and a second
   place to do the same job is a second place to forget about.

   The palette is Foundry's markup and Foundry's stylesheet, so the two
   controls added to it are styled inline rather than from `token.css`.
   That is the same call `board-layers.ts` makes and for the same reason:
   this is a fact about somebody else's element, and the port scopes every
   selector in `design/` under `.dh`, which the Token HUD is not. */

const ADD_STYLE =
  "display:grid;place-items:center;width:var(--effect-size);height:var(--effect-size);" +
  "background:none;border:none;padding:0;margin:0;font-size:13px;line-height:1;" +
  "color:currentColor;opacity:.5;cursor:var(--cursor-pointer)";

/**
 * Type a condition onto a creature, and clear any that are already on it.
 *
 * One dialog for both halves rather than a prompt for the name and a
 * separate way to take it off. They are the same question asked at the same
 * moment — a GM opening this is looking at what the creature is wearing —
 * and a condition you can add and cannot see is a one-way door.
 */
export async function promptAdhocConditions(actor: any): Promise<void> {
  if (!actor) return;
  const on = adhocConditions(actor);
  const escape = (value: string) => foundry.utils.escapeHTML(value);
  const rows = on
    .map(
      (condition) => `<label class="pick">
        <input type="checkbox" name="clear" value="${escape(condition.id)}">
        <b>${escape(condition.name)}</b>
        <s>${game.i18n.localize("DAGGERHEART.Condition.Clear")}</s>
      </label>`,
    )
    .join("");

  const answer = await dhDialog<{ add: string; clear: string[] }>({
    title: game.i18n.localize("DAGGERHEART.Condition.Title"),
    ok: game.i18n.localize("DAGGERHEART.Condition.Apply"),
    width: 420,
    content:
      `<p class="ach">${game.i18n.localize("DAGGERHEART.Condition.Hint")}</p>
       <label class="pick"><input type="text" name="name" maxlength="${ADHOC_NAME_MAX}"
         placeholder="${game.i18n.localize("DAGGERHEART.Condition.Placeholder")}" autofocus></label>` +
      (rows ? `<div class="picks">${rows}</div>` : ""),
    /* Live, for the reason every dialog in this system is: the button is
       not offered for an answer that would do nothing. Typing a name the
       creature already has is one of those — it is not an error worth a
       notification, it is simply not a change. */
    wire: (root, setOk) => {
      const field = root.querySelector<HTMLInputElement>('input[name="name"]');
      const boxes = [...root.querySelectorAll<HTMLInputElement>('input[name="clear"]')];
      const sync = () => {
        const typed = adhocStatusId(field?.value);
        const fresh = !!typed && !actor.statuses?.has?.(typed);
        setOk(fresh || boxes.some((box) => box.checked));
      };
      field?.addEventListener("input", sync);
      for (const box of boxes) box.addEventListener("change", sync);
      sync();
    },
    read: (root) => ({
      add: root.querySelector<HTMLInputElement>('input[name="name"]')?.value ?? "",
      clear: [...root.querySelectorAll<HTMLInputElement>('input[name="clear"]:checked')].map(
        (box) => box.value,
      ),
    }),
  });
  if (!answer) return;

  for (const id of answer.clear) await removeAdhocCondition(actor, id);
  await addAdhocCondition(actor, answer.add);
}

export function registerAdhocConditions(): void {
  Hooks.on("renderTokenHUD", (hud: any, element: any) => {
    /* ApplicationV2 hands the element; V1 handed a jQuery. Resolve rather
       than assume, the same way `dhDialog`'s render callback does. */
    const root: HTMLElement | null =
      element instanceof HTMLElement ? element : (element?.[0] ?? null);
    const actor = hud?.object?.actor;
    /* The GM's, and only the GM's. A player clearing a condition the GM
       named is a table conversation, not a button. */
    if (!root || !actor || !game.user?.isGM) return;
    const palette = root.querySelector(".palette.status-effects");
    if (!palette) return;

    /* Swept before they are added, and not because a render is known to reuse
       the element. It is because this hook fires on every render of the HUD
       and the cost of being wrong about which of those rebuild the palette is
       a row of duplicate controls that grows every time you open it. */
    for (const stale of palette.querySelectorAll("[data-dh-adhoc]")) stale.remove();

    for (const condition of adhocConditions(actor)) {
      const icon = document.createElement("img");
      icon.className = "effect-control active";
      icon.dataset.dhAdhoc = condition.id;
      icon.src = IMG;
      icon.dataset.tooltipText = condition.name;
      icon.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await removeAdhocCondition(actor, condition.id);
        hud.render();
      });
      palette.appendChild(icon);
    }

    const add = document.createElement("button");
    add.type = "button";
    add.className = "effect-control";
    add.dataset.dhAdhoc = "add";
    add.style.cssText = ADD_STYLE;
    add.innerHTML = '<i class="fa-solid fa-plus" inert></i>';
    add.dataset.tooltipText = game.i18n.localize("DAGGERHEART.Condition.Title");
    add.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await promptAdhocConditions(actor);
      hud.render();
    });
    palette.appendChild(add);
  });
}
