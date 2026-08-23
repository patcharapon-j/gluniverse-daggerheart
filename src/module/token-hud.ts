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
 * So it is one absolutely-positioned layer over the board, carrying a
 * `matrix()` copied from `canvas.stage.worldTransform`, with the chips inside
 * it placed in **scene** coordinates. That is Foundry's own arrangement for
 * `#hud`, which is where the token HUD and the drawing controls live, and it
 * is why every measurement in `token.css` is a scene pixel: a 1x1 token is a
 * hundred of them, at every zoom, forever.
 *
 * ── one write per frame ──────────────────────────────────────────────
 * Panning and zooming move the *layer* — one transform on one node, however
 * many creatures are out. A token moving moves its own chip, because a token
 * moves in scene coordinates and the layer's transform knows nothing about
 * it. Those are the only two things that write during a gesture.
 *
 * `data-t` is the third and is deliberately not one of them. It is written
 * per chip, and only when a chip actually *crosses* a threshold — `setTier`
 * returns false otherwise — so a slow zoom across a board of twelve
 * creatures writes an attribute a handful of times rather than twelve times
 * a frame. CSS cannot ask the question itself: a container query measures
 * layout, and the layout never changes here, the ancestor's transform does.
 *
 * ── the chip is rendered once ────────────────────────────────────────
 * `setChip` diffs, exactly as `setMarks`, `setPool` and `setChits` do on the
 * sheet and for their reason: a mark that lands has an arrival to play, and
 * markup rebuilt at its new value has already arrived. So the markup is
 * rebuilt only when its *shape* changes — a track's maximum moving, Hope's
 * ceiling moving under a scar, an adversary becoming visible — and every
 * ordinary hit is a diff into the row that is already standing.
 *
 * ── what it may say, and to whom ─────────────────────────────────────
 * A GM sees everything. Everybody else sees their own characters and their
 * companions in full, and sees an adversary according to one world setting —
 * nothing, the tracks without the Difficulty, or the lot. **Vulnerable is
 * exempt from all of it**, because a creature that is easier to hit is a
 * fact somebody at the table produced by hitting it, and hiding the
 * consequence of your own hit is the system taking back what the fiction
 * just gave you.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "./config.ts";
import { TOKEN_CHIP, setChip, setTier } from "./ui/token.js";

/** What the chip is told about a creature. Mirrors token.js's `s`. */
interface ChipState {
  hp?: { marked: number; max: number };
  stress?: { marked: number; max: number };
  armor?: { marked: number; max: number };
  hope?: { value: number; max: number };
  scars?: number;
  difficulty?: number | null;
  vuln?: boolean;
  hidden?: boolean;
  defeated?: boolean;
}

let layer: HTMLElement | null = null;
const chips = new Map<string, HTMLElement>();

/* ── where the layer goes ─────────────────────────────────────────────
   Found rather than assumed, which is `chatPanels()`'s rule in a second
   place. Foundry has moved the canvas's neighbours once already between the
   two supported generations, and a layer appended into a region that no
   longer exists is a feature that silently stops existing.

   `#hud` first, because that is the element Foundry itself transforms in
   step with the stage — landing beside it is landing in the one place on
   the page already known to be correct for this. The rest are fallbacks in
   descending confidence, and if none of them is there we say so once and
   name the file, because a layer that fails to appear is the failure with
   nothing on screen to diagnose. */
const WALLS = ["#hud", "#interface", "#board"];

function wall(): HTMLElement | null {
  for (const sel of WALLS) {
    const el = document.querySelector(sel);
    if (el?.parentElement) return sel === "#hud" ? el.parentElement : (el as HTMLElement);
  }
  return null;
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
 * The Vulnerable exemption is the one thing here that survives a `none`, and
 * it is why this returns a state rather than bailing: a hidden adversary
 * that is Vulnerable still gets a chip, holding nothing but the word.
 */
function stateOf(token: any): ChipState | null {
  const actor = token?.actor;
  if (!actor) return null;

  const sys = actor.system ?? {};
  const res = sys.resources ?? {};
  const vuln = !!actor.statuses?.has?.("vulnerable");
  const defeated = !!actor.statuses?.has?.(CONFIG.specialStatusEffects?.DEFEATED ?? "dead");

  const see = reading(actor);
  if (see === "none") return vuln ? { vuln, defeated } : null;

  const state: ChipState = {
    hp: track(res.hitPoints),
    stress: track(res.stress),
    armor: track(res.armorSlots),
    vuln,
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
   In scene coordinates, so the layer's transform does the rest. The chip's
   own `inset:0` is overridden here, which is what `token.css` means when it
   says the rule is load-bearing for a host that positions the chip itself.

   The tier is asked in *screen* pixels of footprint rather than in camera
   scale, because a 2x2 creature is legible at half the zoom a 1x1 one needs
   and one table then answers for both. */
function place(chip: HTMLElement, token: any): void {
  const doc = token.document ?? token;
  const w = token.w ?? doc.width * (canvas.grid?.size ?? 100);
  const h = token.h ?? doc.height * (canvas.grid?.size ?? 100);
  const st = chip.style;
  st.left = `${token.x ?? doc.x}px`;
  st.top = `${token.y ?? doc.y}px`;
  st.width = `${w}px`;
  st.height = `${h}px`;
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

/* ── the transform ────────────────────────────────────────────────────
   Read off the stage rather than recomputed from pan and zoom, because the
   stage is what actually drew the frame and anything derived alongside it
   is a second opinion that can be one frame stale. `transform-origin:0 0`
   is stated in the stylesheet; without it the matrix means something else
   entirely, which is the bug the Hope gems already paid for once. */
function syncTransform(): void {
  if (!layer) return;
  const t = canvas.stage?.worldTransform;
  if (!t) return;
  layer.style.transform = `matrix(${t.a},${t.b},${t.c},${t.d},${t.tx},${t.ty})`;
}

/** Zoom changed, so every chip re-asks the ladder. `setTier` no-ops on most. */
function syncTiers(): void {
  const k = canvas.stage?.scale?.x ?? 1;
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
  }

  CONFIG.Token.objectClass = DaggerheartToken;
}

export function registerTokenChips(): void {
  Hooks.on("canvasReady", () => {
    layer?.remove();
    const host = wall();
    if (!host) {
      console.error(
        `${SYSTEM_ID} | nowhere to hang the token layer — tried ${WALLS.join(", ")}. ` +
          `Foundry's canvas layout has changed and token-hud.ts needs a new wall.`,
      );
      layer = null;
      return;
    }
    layer = document.createElement("div");
    layer.className = "dh tok-layer";
    host.appendChild(layer);
    chips.clear();
    syncTransform();
    redraw();
  });

  /* Pan and zoom move the layer, not the chips. The tier pass rides along
     because a zoom is the only thing that changes a chip's footprint in
     screen pixels, and it costs a comparison per creature. */
  Hooks.on("canvasPan", () => {
    syncTransform();
    syncTiers();
  });

  /* A token's own movement. `refreshToken` fires on every frame of a move
     animation and on every drag, which is exactly the rate a chip has to
     follow at — and `place` is four style writes, so following is cheap.
     `sync` is not called here: nothing about the creature has changed. */
  Hooks.on("refreshToken", (token: any) => {
    const chip = chips.get(token.document?.id ?? token.id);
    if (chip) place(chip, token);
    else if (layer) sync(token);
  });

  Hooks.on("drawToken", (token: any) => sync(token));
  Hooks.on("destroyToken", (token: any) => {
    const id = token.document?.id ?? token.id;
    chips.get(id)?.remove();
    chips.delete(id);
  });

  /* The state, from every direction it can move. An actor's tracks, a
     token's own flags, and an effect arriving or leaving — which is how
     Vulnerable gets here, and it is the reason `deleteActiveEffect` is on
     this list at all. */
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
}

/** Every token standing for this actor, on this scene. */
function forActor(actor: any): void {
  if (!actor || !layer) return;
  for (const token of canvas.tokens?.placeables ?? []) {
    if (token.actor?.id === actor.id) sync(token);
  }
}
