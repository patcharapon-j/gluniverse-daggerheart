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
function place(chip: HTMLElement, token: any, retier = true): void {
  const doc = token.document ?? token;
  const grid = canvas.grid?.size ?? 100;
  const w = token.w ?? (doc.width ?? 1) * grid;
  const h = token.h ?? (doc.height ?? 1) * grid;
  /* `token.position`, not `token.document.x`. A Token is a PIXI container and
     a move animates the *container* while the document already holds the
     destination — so reading the document during a move puts the chip on the
     square the creature has not arrived at yet, which is the drift you see
     for exactly as long as the animation lasts. */
  const x = token.position?.x ?? token.x ?? doc.x ?? 0;
  const y = token.position?.y ?? token.y ?? doc.y ?? 0;

  /* Written only when it moved. On a still board this is four number
     comparisons per creature per frame and no style write at all. */
  const key = `${x}/${y}/${w}/${h}`;
  if (boxes.get(chip) !== key) {
    boxes.set(chip, key);
    const st = chip.style;
    st.left = `${x}px`;
    st.top = `${y}px`;
    st.width = `${w}px`;
    st.height = `${h}px`;
  }

  if (retier) setTier(chip, w * (canvas.stage?.scale?.x ?? 1));
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

/* ══ the transform ════════════════════════════════════════════════════
   Read off the stage rather than recomputed from pan and zoom, because the
   stage is what actually drew the frame and anything derived alongside it is
   a second opinion that can be a frame stale. `transform-origin:0 0` is
   stated in the stylesheet; without it the matrix means something else
   entirely, which is the bug the Hope gems already paid for once.

   ── it is measured against the canvas, not assumed flush with it ────
   `worldTransform` maps scene coordinates into the **canvas element's** own
   pixel space, and our layer hangs on whatever wall `wall()` found — which
   is a neighbour of that element and not guaranteed to share its origin.
   Any difference is a constant offset, and a constant offset on a layer
   whose contents scale is exactly the failure that looks like drift: at low
   zoom the chips sit near their creatures and at high zoom they are inches
   away, so it reads as tracking badly rather than as being shifted.

   So the offset is measured once per build and added to the matrix's
   translation. Two `getBoundingClientRect` calls, on a build and a resize,
   and never in a frame — a layout forced per frame to place a decoration is
   the cost `fit-cards.ts` exists to refuse. */
let offX = 0;
let offY = 0;

function measureOffset(): void {
  offX = offY = 0;
  const host = layer?.parentElement;
  const board: HTMLElement | null = (canvas as any)?.app?.view ?? document.querySelector("#board");
  if (!host || !board?.getBoundingClientRect) return;
  const a = board.getBoundingClientRect();
  const b = host.getBoundingClientRect();
  offX = a.left - b.left;
  offY = a.top - b.top;
}

function syncTransform(): void {
  if (!layer) return;
  const t = canvas.stage?.worldTransform;
  if (!t) return;
  layer.style.transform =
    `matrix(${t.a},${t.b},${t.c},${t.d},${t.tx + offX},${t.ty + offY})`;
}

/* ══ the frame ════════════════════════════════════════════════════════
   `canvasPan` was the whole of this and it is not enough. It fires when
   Foundry *decides* to pan, not on every frame of one — so an animated pan,
   a zoom with easing, or the camera following a token leaves the layer on
   last frame's matrix for the whole of the movement and snaps into place at
   the end. That is the "moves about" half, and it is invisible at rest,
   which is why it survived a static check.

   The same is true of a token: `refreshToken` is reliable for a drag and is
   not something to *rely* on for an animated move, because how many render
   flags a move raises is Foundry's business and not ours.

   So there is one ticker callback, at Foundry's own frame rate, and it is
   built to be cheap rather than to be clever:

     - the transform is one style write, unconditionally, because comparing
       six matrix components costs about what writing them does;
     - a chip's box is written ONLY when one of its four numbers changed,
       which on a still board is never;
     - the tier is asked only when the zoom actually moved.

   Every number it reads is a property on a PIXI object or a plain field on a
   document. Nothing here reads the DOM, so nothing here forces a layout. */
let lastK = 0;

const boxes = new WeakMap<HTMLElement, string>();

function frame(): void {
  if (!layer) return;
  syncTransform();

  const k = canvas.stage?.scale?.x ?? 1;
  const zoomed = k !== lastK;
  if (zoomed) lastK = k;

  for (const token of canvas.tokens?.placeables ?? []) {
    const chip = chips.get(token.document?.id ?? token.id);
    if (chip) place(chip, token, zoomed);
  }
}

/* The ticker we are attached to, rather than a boolean. A boolean is right
   until the application is rebuilt underneath us, at which point it says we
   are ticking on something that no longer ticks — which is the same shape as
   the hook that had already fired, and would present the same way: nothing
   moves and nothing says why. */
let ticker: any = null;

function startTicking(): void {
  const t = (canvas as any)?.app?.ticker;
  if (!t?.add || t === ticker) return;
  ticker?.remove?.(frame);
  /* Last in the frame, so the matrix we copy is the one the stage just drew
     with rather than the one it is about to replace. */
  t.add(frame, undefined, -100);
  ticker = t;
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

/** Hang a fresh layer on the wall and fill it. Every scene change does this. */
function build(): void {
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
  measureOffset();
  syncTransform();
  redraw();
  startTicking();
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
  Hooks.on("canvasReady", build);

  /* Pan and zoom are the ticker's, not this hook's — see the note on
     `frame`. What is left for `canvasPan` is the thing a frame cannot
     measure without forcing a layout: whether the canvas element has moved
     relative to our wall, which happens when the sidebar collapses or the
     window resizes and never mid-gesture. */
  Hooks.on("canvasPan", measureOffset);
  Hooks.on("collapseSidebar", measureOffset);
  window.addEventListener("resize", measureOffset);

  /* A token arriving. Movement is the ticker's, for `frame`'s reason: how
     many render flags an animated move raises is Foundry's business and not
     something to hang a position on. */
  Hooks.on("refreshToken", (token: any) => {
    if (!layer) return;
    if (!chips.has(token.document?.id ?? token.id)) sync(token);
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
  const t = canvas?.stage?.worldTransform;
  return {
    setting: game.settings?.get(SYSTEM_ID, "tokenChip"),
    adversaries: game.settings?.get(SYSTEM_ID, "adversaryChip"),
    stylesheetLoaded: [...document.styleSheets].some((s) => s.href?.includes("token.css")),
    wall: layer?.parentElement
      ? `${layer.parentElement.tagName.toLowerCase()}#${layer.parentElement.id || "(no id)"}`
      : "NONE — the layer was never hung",
    layerBox: layer ? layer.getBoundingClientRect().toJSON() : null,
    transform: t ? `matrix(${t.a},${t.b},${t.c},${t.d},${t.tx},${t.ty})` : "no stage",
    offset: `${offX}, ${offY}  (wall to canvas element)`,
    ticking: !!ticker,
    tokensOnScene: canvas?.tokens?.placeables?.length ?? 0,
    chipsDrawn: chips.size,
    walls: WALLS.map((w) => `${w}: ${document.querySelector(w) ? "found" : "absent"}`),
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
