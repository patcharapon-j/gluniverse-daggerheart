/**
 * The token chip, on the board.
 *
 * `design/token.css` and `design/token.js` are the component and argue for
 * themselves. This file is the half a study page cannot have: where the chips
 * live, what keeps them over the right creature, and what they are allowed to
 * say to whom.
 *
 * ── an HTML layer, not a PIXI one ────────────────────────────────────
 * The obvious build is a PIXI container per token, because the board is a
 * PIXI stage. It was not taken, and the reason is that every part of this
 * component is a thing PIXI would have to be taught: a conic gradient in
 * fourteen segments, a radial mask, `mix-blend-mode:plus-lighter`, text bent
 * round a path, three composited loops. Drawing those into a canvas means
 * re-deriving all of it in a second language and then keeping two copies
 * true — which is exactly the trade `port-design-js.mjs` exists to refuse.
 *
 * So it is one layer of HTML over the board, with the chips inside it placed
 * in **scene** coordinates. That is why every measurement in `token.css` is a
 * scene pixel: a 1x1 token is a hundred of them, at every zoom, forever.
 *
 * ── the layer is INSIDE `#hud`, and that is the whole of the alignment ─
 * Three builds of this file kept the layer *beside* `#hud` and re-derived the
 * alignment from `canvas.stage.worldTransform` — a `matrix()`, a measured
 * offset between our wall and the canvas element, a ticker to keep it fresh.
 * Every one of those was a second opinion about a number Foundry had already
 * published, and it drifted, because the two are not computed the same way.
 *
 * Foundry aligns `#hud` in `Canvas#pan` and does **not** use `worldTransform`
 * to do it: `left`/`top` are `canvas.primary.getGlobalPosition()`, the size is
 * `canvas.dimensions`, and the zoom is a plain `transform:scale()` against
 * `transform-origin:top left`. Its own Token HUD is then a child of that
 * element positioned at `bounds.x`/`bounds.y` — **raw scene coordinates, with
 * no transform of its own at all**.
 *
 * So a chip is exactly what Foundry's Token HUD is: a child of `#hud` at the
 * token's scene x and y. There is no matrix here, no offset and no ticker,
 * because there is nothing left for this file to get wrong — the layer is
 * aligned by the same call, on the same element, as everything else Foundry
 * draws over the board.
 *
 * The one thing that buys has a price, and it is the activity log's: `#hud` is
 * an ApplicationV2 whose `_replaceHTML` assigns `innerHTML`, so every render of
 * it sweeps our layer away. That is answered by re-hanging on its render hook
 * rather than by hanging somewhere safer, because "somewhere safer" is what the
 * three drifting builds were.
 *
 * ── what still writes during a gesture ───────────────────────────────
 * A token moving moves its own chip, off `refreshToken` — the same render flag
 * (`refreshPosition`) that moves Foundry's own nameplate and border, so it is
 * raised on every frame of an animated move by construction rather than by our
 * hoping so. Panning and zooming write nothing of ours whatsoever.
 *
 * `data-t` is the exception and is deliberately not per frame. It is written
 * per chip and only when a chip actually *crosses* a threshold — `setTier`
 * returns false otherwise — so a slow zoom across a board of twelve creatures
 * writes an attribute a handful of times rather than twelve times a frame. CSS
 * cannot ask the question itself: a container query measures layout, and the
 * layout never changes here, the ancestor's transform does.
 *
 * ── the chip is rendered once ────────────────────────────────────────
 * `setChip` diffs, exactly as `setMarks`, `setPool` and `setChits` do on the
 * sheet and for their reason: a mark that lands has an arrival to play, and
 * markup rebuilt at its new value has already arrived. So the markup is
 * rebuilt only when its *shape* changes — a track's maximum moving, Hope's
 * ceiling moving under a scar, an adversary becoming visible — and every
 * ordinary hit is a diff into the row that is already standing.
 *
 * ── the cell is not where the creature ends ──────────────────────────
 * Every radius in `token.css` is written against one assumption: that the
 * creature ends at the grid cell's own circle. A **dynamic token ring**
 * breaks it in both of its fit modes, and so does a token whose **artwork
 * is scaled** — and when it breaks, the chip is drawn on the painting it
 * exists to stay off, which is the one thing the component promised.
 *
 * `chipScale` is the arithmetic and lives beside the radii in
 * `design/token.js`, with the derivation written out. This file is the
 * half a study page cannot have: **asking Foundry what the token is
 * actually wearing.** Four questions, and the split between them is who
 * owns the answer:
 *
 *   the ring       `token.document.ring.enabled` — per token
 *   the fit mode   `CONFIG.Token.ring.isGridFitMode` — a WORLD setting of
 *                  Foundry's, so one answer for the whole table
 *   subject scale  `ring.subject.scale` — per token, on its config sheet
 *   art scale      `texture.scaleX/scaleY` — per token, and it applies
 *                  whether or not there is a ring at all
 *
 * plus `tokenChipScale`, ours, world-scoped, a multiplier over the lot.
 *
 * The result is two numbers rather than one, because there are two claims.
 * `--tkr` is the READOUT — three tracks, the gems, the Difficulty — which
 * is a reading *off* the creature and moves out to clear whatever it now
 * occupies. The subject scale remains diagnostic evidence for dynamic-ring
 * fit; the condition material is attached to the PIXI mesh and follows the
 * subject without a second HTML transform.
 *
 * ── what it may say, and to whom ─────────────────────────────────────
 * A GM sees everything. Everybody else sees their own characters and their
 * companions in full, and sees an adversary according to one world setting —
 * nothing, the tracks without the Difficulty, or the lot. Explicit conditions
 * are exempt from resource privacy because they are shared tactical facts;
 * fog and token visibility still suppress the entire chip and material.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { CONDITIONS, SYSTEM_ID } from "./config.ts";
import { TOKEN_CHIP, chipScale, setChip, setTier } from "./ui/token.js";
import {
  clearTokenConditionMaterial,
  conditionTint,
  registerTokenConditionMaterials,
  syncTokenConditionMaterial,
} from "./token-conditions.ts";

/** What the chip is told about a creature. Mirrors token.js's `s`. */
interface ChipState {
  hp?: { marked: number; max: number };
  stress?: { marked: number; max: number };
  armor?: { marked: number; max: number };
  hope?: { value: number; max: number };
  scars?: number;
  difficulty?: number | null;
  conditions?: string[];
  conditionIds?: string[];
  /** The first active condition's material colour, for the sentence. */
  tint?: string;
  hidden?: boolean;
  defeated?: boolean;
  /* Obsidian orbit's tactical chrome. Selection goes outward as a crown,
     targeting inward as a reticle, and `actor` only picks the identity
     hairline's colour — it is never a permission. */
  actor?: string;
  selected?: boolean;
  targeted?: boolean;
}

let layer: HTMLElement | null = null;
const chips = new Map<string, HTMLElement>();

/* ── where the layer goes ─────────────────────────────────────────────
   `#hud`, and nothing else. The earlier builds took `chatPanels()`'s rule —
   look for a wall, fall back, fall back again — and that rule is about
   finding a place to *stand*. This is not that: the element is not a
   backdrop, it is the coordinate system, and a fallback is a second
   coordinate system that has to be aligned by hand. Which is what the
   three drifting builds were.

   Asked of `canvas.hud` first, because that is the API and it is what will
   still answer if Foundry moves the element or renames the id. */
function hudElement(): HTMLElement | null {
  const el = (canvas as any)?.hud?.element ?? document.querySelector("#hud");
  return el instanceof HTMLElement ? el : null;
}

/* ── reading a creature ───────────────────────────────────────────────
   Off the *document*, never off a copy. `ledger.ts` states the general
   version of this — the document is the record, so read the record — and
   here it is what lets a chip be correct after any write at all, including
   ones this system does not know exist. */

const track = (t: any) =>
  t && t.max > 0 ? { marked: Math.max(0, Math.min(t.max, t.marked ?? 0)), max: t.max } : undefined;

/** A GM sees everything; everyone else asks the two questions below. */
const isGM = (): boolean => !!game.user?.isGM;

/**
 * How much of this creature the person at this keyboard may read.
 *
 * Ownership is the first answer and the uncontroversial one — your own
 * character, and the companion you are the partner of. The second is the
 * table's ruling about adversaries, and it is a world setting because it is
 * a ruling rather than a preference.
 */
function reading(actor: any): "full" | "marks" | "none" {
  if (isGM()) return "full";
  if (actor?.isOwner) return "full";
  if (actor?.type === "character" || actor?.type === "companion") return "full";
  const set = game.settings?.get(SYSTEM_ID, "adversaryChip");
  return set === "full" ? "full" : set === "marks" ? "marks" : "none";
}

/**
 * The chip's state, or null for a creature this client draws nothing for.
 *
 * Conditions are the one thing here that survives a `none`, and it is why this
 * returns a state rather than bailing: a readable adversary with a condition
 * still gets the joined sentence and material, but no private resources.
 */
function stateOf(token: any): ChipState | null {
  const actor = token?.actor;
  if (!actor) return null;

  const sys = actor.system ?? {};
  const res = sys.resources ?? {};
  const active = CONDITIONS.filter((condition) => actor.statuses?.has?.(condition.id));
  const conditionIds = active.map((condition) => condition.id);
  const conditions = active.map((condition) => condition.name);

  /* One tint for a sentence that may name three conditions, and it is the
     FIRST — which is CONDITIONS' own order, so the same pair of statuses
     always tints the same way on every token at the table. Averaging the
     active colours was tried and is worse: two conditions whose hues are
     opposite average to a grey that names neither, and the material under
     the sentence does not average either. */
  const tint = conditionTint(conditionIds[0]);
  const defeated = !!actor.statuses?.has?.(CONFIG.specialStatusEffects?.DEFEATED ?? "dead");

  /* Read off the placeable, not the document: `controlled` is this
     client's own selection and `targeted` is this client's own target
     set, which is exactly what the crown and the reticle are claims
     about. Neither is anybody else's business and neither is stored. */
  const chrome = {
    actor: actor.type,
    selected: !!token?.controlled,
    targeted: !!token?.isTargeted,
  };

  const see = reading(actor);
  if (see === "none") {
    return conditions.length || defeated
      ? { conditions, conditionIds, tint, defeated, ...chrome }
      : null;
  }

  const state: ChipState = {
    ...chrome,
    hp: track(res.hitPoints),
    stress: track(res.stress),
    armor: track(res.armorSlots),
    conditions,
    conditionIds,
    tint,
    defeated,
  };

  if (actor.type === "character") {
    const hope = res.hope;
    if (hope?.max > 0) {
      state.hope = { value: Math.max(0, Math.min(hope.max, hope.value ?? 0)), max: hope.max };
      state.scars = sys.scars?.length ?? 0;
    }
  } else if (see === "full" && sys.difficulty != null) {
    /* Difficulty is the GM's number and the one thing `marks` withholds.
       It is what the players are supposed to be discovering by rolling
       against it, so a setting that shows the tracks and not this is the
       interesting middle rather than a half-measure. */
    state.difficulty = sys.difficulty;
  }

  return state;
}

/* ── shape versus value ───────────────────────────────────────────────
   The only thing that forces a rebuild. A track's maximum, Hope's ceiling
   under a scar, whether there is a Difficulty at all — change any of those
   and the markup is a different set of segments; change what is *marked*
   and `setChip` has a row already standing to diff into. Getting this
   backwards in either direction is a visible bug: rebuild too eagerly and
   every arrival is cut off mid-play, too rarely and a levelled-up character
   keeps last level's Hit Point count. */
const shapeOf = (s: ChipState | null): string =>
  s === null
    ? "-"
    : [
        s.hp?.max ?? 0,
        s.stress?.max ?? 0,
        s.armor?.max ?? 0,
        s.hope?.max ?? 0,
        s.scars ?? 0,
        s.difficulty ?? "-",
      ].join("/");

/* ── placing one ──────────────────────────────────────────────────────
   Raw scene coordinates, exactly as Foundry's own Token HUD writes them,
   because the layer's coordinate system IS `#hud`'s and `#hud`'s origin is
   scene (0,0). The chip's own `inset:0` is overridden here, which is what
   `token.css` means when it says the rule is load-bearing for a host that
   positions the chip itself.

   `token.position`, not `token.document.x`. They agree at rest — Foundry's
   own `_refreshPosition` copies one into the other — and the container is the
   one that is true mid-animation, which is the frame that matters.

   The tier is asked in *screen* pixels of footprint rather than in camera
   scale, because a 2x2 creature is legible at half the zoom a 1x1 one needs
   and one table then answers for both. */
const boxes = new WeakMap<HTMLElement, string>();

/**
 * What this token is wearing, in the terms `chipScale` asks for.
 *
 * Read off the *document* rather than off `token.ring`, which is the
 * ledger's rule again and load-bearing here for a second reason: the live
 * `TokenRing` only exists once the token has been drawn with one, so a
 * chip built on `drawToken` would be reading a null on exactly the frame
 * it is deciding its radii. The document is true from `createToken`.
 *
 * `hasDynamicRing` is Foundry's own name for the question and is preferred
 * where it answers, because `ring.enabled` is the flag and that getter is
 * the *rule* — a subclass or a module may have one without the other.
 */
function wearOf(token: any): Record<string, unknown> {
  const doc = token?.document ?? token;
  const tex = doc?.texture ?? {};
  return {
    ring: doc?.hasDynamicRing ?? !!doc?.ring?.enabled,
    gridFit: !!(CONFIG as any).Token?.ring?.isGridFitMode,
    subject: doc?.ring?.subject?.scale ?? 1,
    /* The larger of the two, because a track has one radius and the
       artwork's wider side is what it has to clear. Absolute, since a
       mirrored token carries a negative scale and is the same size. */
    art: Math.max(Math.abs(tex.scaleX ?? 1), Math.abs(tex.scaleY ?? 1)),
    manual: Number(game.settings?.get(SYSTEM_ID, "tokenChipScale") ?? 1) || 1,
  };
}

/* Written only when one of the two actually moves. Both are inherited by
   every radius in the stylesheet, so a write here invalidates the chip's
   whole layout — and `refreshToken` fires for a dozen reasons that are not
   a scale change. Two comparisons against two style writes. */
const scales = new WeakMap<HTMLElement, string>();

function rescale(chip: HTMLElement, token: any): void {
  const k = chipScale(wearOf(token) as any);
  const key = `${k.readout}/${k.subject}`;
  if (scales.get(chip) === key) return;
  scales.set(chip, key);
  chip.style.setProperty("--tkr", String(k.readout));
  chip.style.setProperty("--tkv", String(k.subject));
}

function place(chip: HTMLElement, token: any): void {
  const doc = token.document ?? token;
  const grid = canvas.grid?.size ?? 100;
  const w = token.w ?? (doc.width ?? 1) * grid;
  const h = token.h ?? (doc.height ?? 1) * grid;
  const x = token.position?.x ?? token.x ?? doc.x ?? 0;
  const y = token.position?.y ?? token.y ?? doc.y ?? 0;

  /* Written only when it moved. `refreshToken` is raised for a dozen reasons
     that are not movement — a nameplate, a ring, an elevation — and four
     number comparisons is cheaper than four style writes that change nothing. */
  const key = `${x}/${y}/${w}/${h}`;
  if (boxes.get(chip) !== key) {
    boxes.set(chip, key);
    const st = chip.style;
    st.left = `${x}px`;
    st.top = `${y}px`;
    st.width = `${w}px`;
    st.height = `${h}px`;
  }

  rescale(chip, token);
  setTier(chip, w * (canvas.stage?.scale?.x ?? 1));
}

/* A token nobody may see gets no chip at all rather than a hidden one: the
   fog is a fact about what this client knows, and an element carrying a
   creature's Stress is the wrong thing to leave in the DOM of somebody who
   has not found it yet. `.hidden` on the chip is the *other* case — a token
   the GM has toggled invisible, which the GM can still see. */
const visible = (token: any): boolean => token?.visible !== false && !token?.document?.hidden;

function sync(token: any): void {
  const id = token?.document?.id ?? token?.id;
  if (!id) return;

  const enabled = game.settings?.get(SYSTEM_ID, "tokenChip") !== false;
  const state = enabled ? stateOf(token) : null;
  const gone = !state || (!token.isVisible && !isGM());

  if (gone) clearTokenConditionMaterial(token);
  else syncTokenConditionMaterial(token, state.conditionIds ?? [], !!state.defeated);

  let chip = chips.get(id);
  if (gone) {
    chip?.remove();
    chips.delete(id);
    return;
  }

  const shape = shapeOf(state);
  if (chip && chip.dataset.shape !== shape) {
    chip.remove();
    chips.delete(id);
    chip = undefined;
  }

  if (!chip) {
    const host = document.createElement("div");
    host.innerHTML = TOKEN_CHIP(state);
    chip = host.firstElementChild as HTMLElement;
    if (!chip) return;
    chip.dataset.shape = shape;
    chips.set(id, chip);
    layer?.appendChild(chip);
  }

  place(chip, token);
  setChip(chip, { ...state, hidden: !visible(token) });
}

/** Every token on the board, from scratch. */
function redraw(): void {
  if (!layer) return;
  const live = new Set<string>();
  for (const token of canvas.tokens?.placeables ?? []) {
    live.add(token.document?.id ?? token.id);
    sync(token);
  }
  for (const [id, chip] of chips) {
    if (!live.has(id)) {
      chip.remove();
      chips.delete(id);
    }
  }
}

/* ══ the zoom ═════════════════════════════════════════════════════════
   The only thing pan and zoom still cost us. The layer is aligned by
   Foundry, so nothing of ours moves — but `data-t` is a question about how
   large the chip has become *on screen*, and only the camera can answer it.

   `canvasPan` is exactly the right hook and its reputation here is undeserved:
   an earlier build blamed it for the drift and replaced it with a ticker, and
   reading `Canvas#pan` settles that it fires from the same function, two lines
   above the `align()` that moves Foundry's own HUD. It is raised once per pan
   step, animated pans included. It was never the lagging part. */
let lastK = 0;

function retier(): void {
  const k = canvas.stage?.scale?.x ?? 1;
  if (k === lastK) return;
  lastK = k;
  for (const token of canvas.tokens?.placeables ?? []) {
    const chip = chips.get(token.document?.id ?? token.id);
    if (chip) setTier(chip, (token.w ?? 100) * k);
  }
}

/* ══ Foundry's bars ═══════════════════════════════════════════════════
   A green bar and a blue bar under the token, and this system has neither
   number. Daggerheart marks boxes: a bar at 60% says nothing about whether
   the next hit costs you one box or four, which is the entire question
   anybody asks of a Hit Point track. Left on beside the chip it is also a
   second answer to a question already answered, in a grammar borrowed from
   a different game.

   Two halves, because there are two populations. **New actors** get
   `displayBars: NONE` on their prototype token, which is a default rather
   than a rule — a table that wants a bar can still switch it back on, and
   this is only saying what the system ships with. **Every actor that
   already exists** is answered at draw time instead, because rewriting
   somebody's prototype tokens on upgrade is a migration nobody asked for.

   `attributeBar` stays declared in `template.json` and the two attribute
   paths stay valid, so the bar a table turns back on still works. This
   suppresses a drawing; it does not remove a capability. */

const OURS = new Set(["character", "adversary", "companion", "environment"]);

export function registerTokenBars(): void {
  const Base: any = CONFIG.Token?.objectClass;
  if (!Base) return;

  class DaggerheartToken extends Base {
    /* Overridden rather than stubbed. If a later Foundry renames this, our
       override stops being called and the bars come back — which is a
       visible, obvious regression rather than a silent one, and the right
       direction for a guess about somebody else's private API to fail in. */
    drawBars(...args: any[]): any {
      if (OURS.has(this.actor?.type)) return;
      return super.drawBars?.(...args);
    }

    /* Condition art is the token material now. Foundry's square effect icons
       would be a second, lower-fidelity answer sitting on top of it, so our
       actor types suppress the icon container at its source. This catches the
       initial `_draw()` path as well as later effect refreshes.

       What this may NOT do is empty the container and walk away. Core's
       `_drawEffects` leaves a contract behind it — `effects.bg` is a live
       `PIXI.Graphics` and `effects.overlay` is null-or-icon — and core's
       `_refreshEffects` reads `this.effects.bg.clear()` with no guard at all.
       `drawEffects` raises `refreshEffects` the moment this returns, and
       `refreshSize`/`refreshShape` propagate to it besides, so a destroyed
       `bg` throws on the next move, resize or redraw and takes the token's
       refresh — and the canvas behind it — down with it.

       So we rebuild the contract and draw nothing into it. `renderable`
       false is what suppresses the icons; the empty `bg` is what keeps
       core's own refresh honest. */
    async _drawEffects(...args: any[]): Promise<any> {
      if (!OURS.has(this.actor?.type)) return super._drawEffects?.(...args);
      const effects = this.effects;
      if (!effects) return;

      effects.renderable = false;
      for (const child of effects.removeChildren?.() ?? []) child.destroy?.({ children: true });

      /* Mirrors core's own setup, minus every icon it would have added. */
      effects.bg = effects.addChild(new PIXI.Graphics());
      effects.bg.zIndex = -1;
      effects.overlay = null;
    }
  }

  CONFIG.Token.objectClass = DaggerheartToken;
}

/** Hang a fresh layer inside `#hud` and fill it. Every scene change does this. */
function build(): void {
  layer?.remove();
  const host = hudElement();
  if (!host) {
    console.error(
      `${SYSTEM_ID} | nowhere to hang the token layer — canvas.hud has no element ` +
        `and there is no #hud on the page. token-hud.ts needs a new host.`,
    );
    layer = null;
    return;
  }
  layer = document.createElement("div");
  layer.className = "dh tok-layer";
  host.appendChild(layer);
  chips.clear();
  lastK = canvas.stage?.scale?.x ?? 1;
  redraw();
}

/* `#hud` is an ApplicationV2 and its `_replaceHTML` assigns `innerHTML`, so
   every render of it takes our layer with it — the activity log's own lesson,
   arriving somewhere we cannot answer it the same way. There the door became a
   *sibling* of the part that gets rebuilt; here the element that gets rebuilt
   is the coordinate system, so standing outside it is the bug rather than the
   fix. We re-hang instead, which is cheap and has one condition: only when the
   layer has actually been evicted, or a render during play would throw away
   every chip's arrival mid-play. */
function rehang(): void {
  if (!layer) return;
  const host = hudElement();
  if (!host || layer.parentElement === host) return;
  host.appendChild(layer);
}

/**
 * Wire the chips up.
 *
 * **Called from `init`, and that is load-bearing rather than tidy.** The first
 * build called this from `ready` — beside `registerFearHud`, which genuinely
 * has to wait, because it writes into `#ui-top` and that does not exist until
 * the game view is drawn. This does not: it only asks `Hooks.on`, and the one
 * hook it cares about is `canvasReady`, which fires during `Game#setupGame`
 * and therefore **before** `ready`. Registered at `ready` the listener was
 * attached to an event that had already gone past, so the layer was never
 * built and nothing was ever drawn.
 *
 * The failure is worth recording because of how it presents. Nothing throws,
 * nothing logs, every check passes, the stylesheet is loaded and correct — and
 * then the moment you change scenes the whole component appears and works
 * perfectly, which makes it read as a caching problem rather than as a hook
 * that fired three hundred milliseconds too early.
 *
 * `canvas?.ready` covers the other direction: a system reloaded into a world
 * that is already up has missed the event for real, and the honest answer
 * there is to build once immediately rather than to wait for a scene change.
 */
export function registerTokenChips(): void {
  registerTokenConditionMaterials();
  Hooks.on("canvasReady", build);

  /* Pan and zoom move nothing of ours — Foundry moves `#hud` and the chips
     ride it. All that is left is the ladder, which is a question about the
     camera and can only be asked here. */
  Hooks.on("canvasPan", retier);

  /* `#hud` re-rendered and took the layer with it. */
  Hooks.on("renderHeadsUpDisplayContainer", rehang);

  /* A token moving, resizing, or arriving. This is the same render flag that
     moves Foundry's own nameplate and border (`refreshPosition`), so it is
     raised on every frame of an animated move by construction — which is what
     makes a ticker of our own unnecessary rather than merely redundant. */
  Hooks.on("refreshToken", (token: any) => {
    if (!layer) return;
    const chip = chips.get(token.document?.id ?? token.id);
    if (chip) place(chip, token);
    else sync(token);
  });

  Hooks.on("drawToken", (token: any) => sync(token));
  Hooks.on("destroyToken", (token: any) => {
    const id = token.document?.id ?? token.id;
    chips.get(id)?.remove();
    chips.delete(id);
    clearTokenConditionMaterial(token);
  });

  /* The state, from every direction it can move. An actor's tracks, a
     token's own flags, and an effect arriving or leaving — which is how every
     condition gets here, and why `deleteActiveEffect` is on this list. */
  /* The crown and the reticle answer to this client alone. Neither
     selecting nor targeting touches an Actor or a TokenDocument, so
     nothing above would ever fire for them — they need their own two
     hooks or the chrome simply never appears. */
  Hooks.on("controlToken", (token: any) => sync(token));
  Hooks.on("targetToken", (_user: any, token: any) => sync(token));

  Hooks.on("updateActor", (actor: any) => forActor(actor));
  Hooks.on("updateToken", (doc: any) => doc.object && sync(doc.object));
  for (const hook of ["createActiveEffect", "deleteActiveEffect", "updateActiveEffect"]) {
    Hooks.on(hook, (effect: any) => forActor(effect?.parent));
  }

  /* Both switches, and the theme, land the same way: what may be drawn has
     changed, so everything is asked again. */
  Hooks.on("daggerheart.tokenChipChanged", () => redraw());

  /* Sight recomputed — a creature stepping out of the fog, or into it. */
  Hooks.on("sightRefresh", () => redraw());

  /* Already up. See the note above: this is the case `canvasReady` cannot
     answer, because it has genuinely been and gone. */
  if ((canvas as any)?.ready) build();
}

/**
 * What the layer currently thinks, for a console.
 *
 * This exists because the two bugs that shipped in the first build were both
 * *silent* — a hook registered after it had fired, and a clip on a
 * transformed box — and neither threw, logged, or left anything on screen to
 * look at. A component drawn over somebody else's canvas has no natural place
 * to complain from, so it gets asked instead. `game.daggerheart.tokenChips()`.
 */
export function reportTokenChips(): Record<string, unknown> {
  /* The alignment, measured rather than asserted. A chip and its token are
     two rectangles that must be concentric at every zoom, and the difference
     between their centres is the one number every drifting build got wrong.
     Reported in *screen* pixels, because that is where the error is visible
     and where a scene-pixel figure would flatter it at low zoom. */
  const off = (() => {
    const token = canvas?.tokens?.placeables?.[0];
    const chip = token && chips.get(token.document?.id ?? token.id);
    if (!token || !chip) return "no token to measure against";
    const k = canvas.stage?.scale?.x ?? 1;
    const w = canvas.stage?.worldTransform;
    const c = chip.getBoundingClientRect();
    const view = (canvas as any)?.app?.view?.getBoundingClientRect?.() ?? { left: 0, top: 0 };
    /* Where the token's centre actually is on screen, straight off the stage. */
    const tx = view.left + w.tx + (token.position.x + token.w / 2) * k;
    const ty = view.top + w.ty + (token.position.y + token.h / 2) * k;
    const dx = c.left + c.width / 2 - tx;
    const dy = c.top + c.height / 2 - ty;
    return `${dx.toFixed(2)}, ${dy.toFixed(2)} px at zoom ${k.toFixed(3)} (0,0 is aligned)`;
  })();

  /* The scales, for the one input this system reads and cannot verify.
     Subject scale reaches Foundry's shader as a UV correction rather than
     as a radius; if it turns out to move the ring the other way, this is
     the line that says so, and `tokenChipScale` is the fix. */
  const wear = (() => {
    const token = canvas?.tokens?.placeables?.[0];
    if (!token) return "no token to read";
    const w = wearOf(token) as any;
    const k = chipScale(w);
    return (
      `ring ${w.ring ? (w.gridFit ? "grid fit" : "subject fit") : "off"}` +
      `, subject ${w.subject}, art ${w.art}, dial ${w.manual}` +
      ` -> readout ${k.readout}, subject ${k.subject}`
    );
  })();

  return {
    setting: game.settings?.get(SYSTEM_ID, "tokenChip"),
    adversaries: game.settings?.get(SYSTEM_ID, "adversaryChip"),
    scale: game.settings?.get(SYSTEM_ID, "tokenChipScale"),
    firstTokenWear: wear,
    stylesheetLoaded: [...document.styleSheets].some((s) => s.href?.includes("token.css")),
    host: layer?.parentElement
      ? `${layer.parentElement.tagName.toLowerCase()}#${layer.parentElement.id || "(no id)"}`
      : "NONE — the layer was never hung",
    hosted: layer?.parentElement === hudElement(),
    misalignment: off,
    tokensOnScene: canvas?.tokens?.placeables?.length ?? 0,
    chipsDrawn: chips.size,
  };
}

/** Throw the layer away and build it again. For a console, and for a fix. */
export function rebuildTokenChips(): void {
  build();
}

/** Every token standing for this actor, on this scene. */
function forActor(actor: any): void {
  if (!actor || !layer) return;
  for (const token of canvas.tokens?.placeables ?? []) {
    if (token.actor?.id === actor.id) sync(token);
  }
}
