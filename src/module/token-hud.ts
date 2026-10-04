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
 * So a chip is exactly what Foundry's Token HUD is: a descendant of `#hud`
 * at the token's scene x and y. There is no matrix here, no offset and no
 * ticker, because there is nothing left for this file to get wrong — the
 * layer is aligned by the same call, on the same element, as everything else
 * Foundry draws over the board.
 *
 * Descendant rather than child, and only for the last step of it: the layer
 * hangs in a stack of ours that is itself the first child of `#hud`, because
 * a layer that IS a child of `#hud` is a sibling of Foundry's own Token HUD
 * and won that argument on a z-index. `board-layers.ts` is the element and
 * the whole of the reasoning. The coordinate system is untouched — the stack
 * is `inset:0` inside the element Foundry aligns, so scene (0,0) is still
 * scene (0,0).
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
 * `chipScale` answers in two numbers, because there were two claims — and
 * Obsidian orbit ended with only one of them drawing anything. `readout` is
 * OUTWARD CLEARANCE and is floored at 1; `subject` is where the artwork itself
 * ends, and is not floored. Only the second is written to a chip, as `--tkv`.
 *
 * The rails used to hang outside the creature and wanted the first. They are
 * inside it now — under `.er-shell`'s clip — and want the second, and nobody
 * moved them when they moved. So `--tkr` went on being written on every chip
 * and read by one element, `--tkv` went on being written and read by **none**,
 * and every rail sat at a fixed percentage of the grid **cell** — which is the
 * assumption this section opens by disavowing. It fails in the direction that
 * lasts: every arc is drawn perfectly, around a creature that is not there.
 *
 * The one element still reading the clearance was the condition sentence, and
 * it is the same finding wearing the other hat: a caption set against the rim
 * stood 1.0848 cells out at Foundry's default fit while the rails it captions
 * had come in onto the artwork, and further out again on a subject scale under
 * 1, where the clearance divides. It follows `--tkv` now, which leaves `--tkr`
 * with no consumer and retires it exactly as `--tk0` was retired. The number
 * survives in `chipScale` because it is what the fit modes' reciprocal
 * arithmetic is checked against and what `tokenChips()` prints, and a number
 * that is reported is not a number that is read.
 * `design/token.css` carries the correction and the arithmetic.
 *
 * The condition material is the same finding on the other side of the fence.
 * It is a PIXI filter on the token **mesh**, and the mesh is not the creature:
 * a dynamic ring's texture is half again the cell in subject fit, so the
 * shader was dressing a quad. `subjectInFrame` below is the one place the
 * chip's cells and the shader's frame meet.
 *
 * ── what it may say, and to whom ─────────────────────────────────────
 * A GM sees everything. Everybody else sees their own characters and their
 * companions in full, and sees an adversary according to one world setting —
 * nothing, the tracks without the Difficulty, or the lot. Explicit conditions
 * are exempt from resource privacy because they are shared tactical facts;
 * fog and token visibility still suppress the entire chip and material.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { adhocConditions } from "./adhoc-conditions.ts";
import { boardStack, boardStackHosted } from "./board-layers.ts";
import { CONDITIONS, SYSTEM_ID } from "./config.ts";
import { TOKEN_CHIP, chipScale, setChip, setTier } from "./ui/token.js";
import {
  ADHOC_CONDITION_ID,
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
  /** The same conditions, newest first, for the material's five slots. */
  materialIds?: string[];
  tints?: string[];
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

   Both halves now live in `board-layers.ts`, because the ruler needs the
   same element for the same reason and the two of them also have to be
   ordered against each other once they are inside it. */

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
 * When each status on this actor was applied, newest wins.
 *
 * Read off the effect documents rather than stored, because Foundry already
 * records it: every ActiveEffect carries its own creation time. One effect can
 * carry several statuses and several effects can carry the same one, so the
 * latest application of a status is the one that counts.
 *
 * An effect with no creation time sorts as oldest, which is the right answer
 * for the one case that produces it: a status that has been on the actor since
 * before anything was keeping track.
 */
function conditionRecency(actor: any): Map<string, number> {
  const out = new Map<string, number>();
  for (const effect of actor?.appliedEffects ?? []) {
    const at = Number(effect?._stats?.createdTime ?? 0) || 0;
    for (const status of effect?.statuses ?? []) {
      const seen = out.get(status);
      if (seen === undefined || at > seen) out.set(status, at);
    }
  }
  return out;
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
  /* The named ones first, in CONDITIONS' own order, then whatever the GM typed
     in the order they typed it. Two lists rather than one sorted list, and
     the split is deliberate: the named conditions read the same way on every
     token at the table because their order is a constant, and an ad-hoc one
     has no place in that order to be given. */
  const active = CONDITIONS.filter((condition) => actor.statuses?.has?.(condition.id));
  const adhoc = adhocConditions(actor);
  const adhocTint = conditionTint(ADHOC_CONDITION_ID) ?? "";
  const conditionIds = [...active.map((c) => c.id), ...adhoc.map((c) => c.id)];
  const conditions = [...active.map((c) => c.name), ...adhoc.map((c) => c.name)];

  /* The sentence names all of them; the material has five slots. Which five
     was CONDITIONS' own order, which meant a sixth condition silently cost
     the creature whichever of its conditions happens to come first in a list
     in config.ts — so a GM who applied Marked for Death to an already heavily
     afflicted adversary could watch the mark not appear. Newest first instead:
     the condition somebody just applied is the one they are looking for.

     The sentence keeps the constant order on purpose and is not sorted with
     it. That order is why the same pair of statuses reads the same way on
     every token at the table, and the slots are a different question with a
     different answer. */
  const applied = conditionRecency(actor);
  const materialIds = conditionIds
    .map((id, index) => ({ id, index, at: applied.get(id) ?? 0 }))
    .sort((a, b) => (b.at - a.at) || (a.index - b.index))
    .map((entry) => entry.id);

  /* Each condition names itself in its own colour, and `tint` is the key
     the rest of the sentence is set in — the FIRST condition's, which is
     CONDITIONS' own order, so the same pair of statuses reads the same way
     on every token at the table.

     Averaging the active colours was tried and is worse, and that has not
     changed: two conditions whose hues are opposite average to a grey that
     names neither, and the material under the sentence does not average
     either. What did change is the conclusion drawn from it. "These cannot
     be averaged" is not "one of them has to win" — the sentence has a word
     per condition and each word can carry its own. */
  const tints = [...active.map((c) => conditionTint(c.id) ?? ""), ...adhoc.map(() => adhocTint)];
  const tint = tints[0] || undefined;
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
      ? { conditions, conditionIds, materialIds, tints, tint, defeated, ...chrome }
      : null;
  }

  const state: ChipState = {
    ...chrome,
    hp: track(res.hitPoints),
    stress: track(res.stress),
    armor: track(res.armorSlots),
    conditions,
    conditionIds,
    materialIds,
    tints,
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

/**
 * Where the creature ends, as a fraction of the condition filter's frame.
 *
 * The chip answers this in CELLS and the shader needs it in FRAME units, so
 * this is the one place the two coordinate systems meet — and each half comes
 * from the source that owns it. How many cells the frame spans is Foundry's
 * to say, so it is MEASURED off the mesh rather than derived from the ring
 * arithmetic; where the creature ends inside those cells is already argued in
 * `chipScale`, so it is reused rather than restated. Getting that split wrong
 * is what the three drifting chip builds were: a second opinion about a number
 * somebody else had already published.
 *
 * The dial comes with it, and that is worth stating because it reads at first
 * like it should not. `tokenChipScale` was written when the readout hung
 * OUTSIDE the creature, so it was a clearance correction — push the tracks out
 * past whatever the derivation could not see. Obsidian orbit put the readout on
 * the creature, and that leaves the dial saying one thing only: *this is where
 * the creature actually ends*. A table that has had to correct that has
 * corrected it for the rails and the material alike, and a dial that moved one
 * and not the other would put the two objects on the same creature in two
 * places.
 *
 * Falls back to 1 rather than guessing, which is the plain-token answer and
 * the one that was in force before this existed.
 */
function subjectInFrame(token: any): number {
  const cell = Math.max(Number(token?.w) || 0, Number(token?.h) || 0);
  const mesh = token?.mesh;
  const frame = Math.max(Math.abs(Number(mesh?.width) || 0), Math.abs(Number(mesh?.height) || 0));
  if (!(cell > 0) || !(frame > 0)) return 1;
  const cells = frame / cell;
  return Math.min(1, Math.max(0.2, chipScale(wearOf(token) as any).subject / cells));
}

/* Written only when it actually moves. It is inherited by every radius in
   the stylesheet, so a write here invalidates the chip's whole layout — and
   `refreshToken` fires for a dozen reasons that are not a scale change. One
   comparison against one style write. */
const scales = new WeakMap<HTMLElement, string>();

function rescale(chip: HTMLElement, token: any): void {
  const k = chipScale(wearOf(token) as any);
  const key = String(k.subject);
  if (scales.get(chip) === key) return;
  scales.set(chip, key);
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

/* ══ arriving and leaving ═══════════════════════════════════════════
   The animation is token.css's; what belongs here is when it is allowed to
   play and what happens to the element afterwards.

   Three things remove a chip and only two of them are departures. A token
   going out of view or off the board is a creature leaving, and that plays.
   A chip whose SHAPE changed — a levelled character, a scar, an adversary
   becoming visible — is torn down and rebuilt in the same call, and that is
   one object being re-drawn rather than two objects swapping: animating it
   would be the readout blinking every time a maximum moved.

   So `fresh` is threaded through rather than inferred, because "there was
   no chip a moment ago" is true of both and only one of them means it.

   That paragraph was aspirational for as long as it has been here. The code
   under it set one local on the way out of BOTH branches, so every shape
   change played the full 460ms arrival: a level-up, a scar, an adversary
   becoming visible. It survived because each half reads correctly on its
   own -- the teardown is right, the build is right, and the flag they share
   is the only place the two are told apart. It is threaded now, and the
   flag is named `appeared` for the claim rather than for the timing. */

/* ── settle, and why this one is a deadline and nothing else ──────
   settle.js's arithmetic — read the end off the animations themselves, so
   it is exactly as long as the motion declares and stays correct when a
   duration changes in the CSS — without settle.js's event path.

   Both departures from it are forced by what a chip is.

   It skips a non-finite animation rather than substituting a floor for it.
   settle.js treats "will not say when it ends" as 1.2 seconds, which is
   right when the caller is waiting to take a class off a gem. A chip is a
   creature that is very often selected, conditioned, or both, and `tkCrown`
   and the Vulnerable marquee never end — so the floor would become the
   answer every time and a departure would sit invisible for a second and a
   fifth instead of its own 170ms. Skipping them leaves the longest FINITE
   animation, which is the one that was asked about.

   And there is no `animationend` race, which is the part worth stating
   because settle.js argues hard for one. That argument is about being
   PROMPT: a spent gem may not keep `on` a moment longer than it must.
   Nothing waits on this. What it gates is taking a cosmetic class off a
   settled chip and removing an element that is already at opacity zero, so
   a hundred and twenty milliseconds of slack costs nothing — and the event
   path here would be actively wrong, because `animationend` bubbles: the
   root's own 300ms arrival would fire first and cancel the Armor rail 160ms
   into a 460ms stagger, which is a visible snap. Counting the events
   instead is the trap above wearing a hat, since the indefinite ones never
   fire at all. */
const GRACE = 120;

function after(chip: HTMLElement, run: () => void): void {
  let deadline = 0;
  for (const a of chip.getAnimations?.({ subtree: true }) ?? []) {
    /* Animations only, which settle.js also insists on. `getAnimations`
       hands back every CSSTransition in the subtree too, and a chip has
       several standing ones — the condition sentence fades over .28s and
       the crown over .19s — so a departure measured against those would
       wait 280ms for its own 170ms of motion. */
    if (typeof CSSAnimation !== "undefined" && !(a instanceof CSSAnimation)) continue;
    const t = Number(a.effect?.getComputedTiming?.().endTime ?? 0);
    if (Number.isFinite(t)) deadline = Math.max(deadline, t);
  }
  window.setTimeout(run, deadline + GRACE);
}

/** Chips playing their departure. Out of `chips`, still in the document. */
const leaving = new Map<string, HTMLElement>();

/** Take a chip off the board, with the animation if this is a departure. */
function retire(id: string, chip: HTMLElement, played: boolean): void {
  chips.delete(id);
  if (!played) {
    chip.remove();
    return;
  }
  leaving.get(id)?.remove();
  leaving.set(id, chip);
  chip.classList.remove("arrive");
  chip.classList.add("leaving");
  after(chip, () => {
    /* Only if it is still the chip that was leaving. A creature that came
       back inside those 170ms has had this element handed back to it by
       `reclaim`, and removing it then would delete the live chip. */
    if (leaving.get(id) !== chip) return;
    leaving.delete(id);
    chip.remove();
  });
}

/* A departure interrupted is a departure that did not happen. Handing the
   element back is `capture()`'s rule about a travel still in flight: the
   alternative is a second chip fading in over the first, at the same
   coordinates, for as long as the first has left to run. */
function reclaim(id: string): HTMLElement | undefined {
  const chip = leaving.get(id);
  if (!chip) return undefined;
  leaving.delete(id);
  chip.classList.remove("leaving");
  return chip;
}

/* A token nobody may see gets no chip at all rather than a hidden one: the
   fog is a fact about what this client knows, and an element carrying a
   creature's Stress is the wrong thing to leave in the DOM of somebody who
   has not found it yet. `.hidden` on the chip is the *other* case — a token
   the GM has toggled invisible, which the GM can still see. */
const visible = (token: any): boolean => token?.visible !== false && !token?.document?.hidden;

/* ── a creature has more than one placeable ───────────────────────────
   Foundry's drag ghost is `document.clone({keepId: true})` drawn as a second
   Token object, so for the length of a drag one creature is on the board
   twice and both copies answer to the same document id. That is not an edge
   case to exclude: the ghost is the copy the person dragging is looking at,
   and the readout belongs on the creature, so the chip rides it.

   What it cannot survive is identity taken from the placeable. `_original`
   is the real object behind a ghost and `isPreview` is how Foundry says
   which is which. Every question about WHO this is goes through the first;
   every question about WHERE to draw takes the object it was handed. The bug
   this replaces deleted the live chip on `destroyToken` for the ghost,
   because the ghost's id is the creature's id -- so the next hook built a
   new one and the arrival replayed, on every drag, dropped or cancelled.

   A creation preview -- dragging an actor onto the board -- has no
   `_original` and no document id, so it falls out of `sync` before any of
   this can apply to it. */
const ghost = (token: any): boolean => token?.isPreview === true;
const realOf = (token: any): any => token?._original ?? token;

function sync(token: any): void {
  /* Who, from the real placeable; where, from the one we were handed. */
  const subject = realOf(token);
  const id = subject?.document?.id ?? subject?.id;
  if (!id) return;

  const enabled = game.settings?.get(SYSTEM_ID, "tokenChip") !== false;
  const state = enabled ? stateOf(subject) : null;
  /* Visibility is the real token's. A ghost is created `visible = false` and
     turned on a frame later by `clone().draw().then()`, so asking the ghost
     would retire a living creature's chip on the frame a drag starts. */
  const gone = !state || (!subject.isVisible && !isGM());

  if (gone) clearTokenConditionMaterial(token);
  else syncTokenConditionMaterial(token, state.materialIds ?? state.conditionIds ?? [], !!state.defeated,
    subjectInFrame(token));

  let chip = chips.get(id);
  if (gone) {
    if (chip) retire(id, chip, true);
    return;
  }

  /* Before anything is built: a creature that is back inside its own
     departure keeps the element it already had. */
  if (!chip) chip = reclaim(id);

  /* Three ways to arrive holding a chip and only one of them is an
     appearance, so the distinction is carried rather than read back off
     "there was no chip a moment ago", which is true of two of the three. */
  const shape = shapeOf(state);
  let rebuilt = false;
  if (chip && chip.dataset.shape !== shape) {
    retire(id, chip, false);
    chip = undefined;
    rebuilt = true;
  }

  let appeared = false;
  if (!chip) {
    const host = document.createElement("div");
    host.innerHTML = TOKEN_CHIP(state);
    chip = host.firstElementChild as HTMLElement;
    if (!chip) return;
    chip.dataset.shape = shape;
    chips.set(id, chip);
    layer?.appendChild(chip);
    appeared = !rebuilt;
  } else {
    chips.set(id, chip);
  }

  place(chip, token);
  setChip(chip, { ...state, hidden: !visible(subject) });

  /* After `place`, and that ordering is the whole of it: the arrival is a
     scale about the chip's own centre, and a chip that has not been placed
     yet is a 0x0 box at the top-left of the scene. It would grow there and
     jump. */
  if (appeared) {
    const el = chip;
    el.classList.add("arrive");
    after(el, () => el.classList.remove("arrive"));
  }
}

/** Every token on the board, from scratch. */
function redraw(): void {
  if (!layer) return;
  const live = new Set<string>();
  for (const token of canvas.tokens?.placeables ?? []) {
    live.add(token.document?.id ?? token.id);
    sync(token);
  }
  for (const [id, chip] of [...chips]) {
    if (!live.has(id)) retire(id, chip, true);
  }
}

/* ══ sight ════════════════════════════════════════════════════════════
   A perception refresh is news about visibility and nothing else.

   This used to call `redraw()`, which is a full `sync` of every token on the
   scene: `stateOf` walking the actor, every condition uniform rewritten,
   `place`, `setChip`. `sightRefresh` is raised from
   `canvas.visibility.refresh()`, which a moving vision source asks for every
   tick -- so this file's own header claim that only `place()` runs during a
   gesture was false for every client with a token that can see.

   What a perception refresh can actually change is whether this client may
   see a creature at all, which is one boolean per token. Anything that
   changes a VALUE arrives on its own hook and always did. */
let pending = 0;

function revisit(): void {
  if (!layer || pending) return;
  /* A macrotask rather than `requestAnimationFrame`, for `swap.js`'s reason:
     what this wants is "after the current batch", and rAF does not fire at
     all in a tab that is not painting. Twelve creatures' visibility asked
     twelve times in one frame is the shape this is here to collapse. */
  pending = window.setTimeout(() => {
    pending = 0;
    if (!layer) return;
    const gm = isGM();
    for (const token of canvas.tokens?.placeables ?? []) {
      const id = token.document?.id ?? token.id;
      if (!id) continue;
      const chip = chips.get(id);
      const hidden = !token.isVisible && !gm;
      if (chip && hidden) {
        clearTokenConditionMaterial(token);
        retire(id, chip, true);
      } else if (!chip && !hidden) {
        /* Out of the fog is a creature appearing, and that is the one
           direction here that genuinely wants the whole build. */
        sync(token);
      }
    }
  }, 0);
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

/** Hang a fresh layer in the board stack and fill it. Every scene change does this. */
function build(): void {
  layer?.remove();
  const host = boardStack();
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
  /* Appended, so the ruler's layer — which prepends — stays behind it in DOM
     order as well as in `z-index`. See `board-layers.ts` for why neither of
     those two statements is allowed to be the only one. */
  host.appendChild(layer);
  chips.clear();
  /* Both maps, and `leaving` is the one that was missed. Its elements were
     children of the layer just removed, so a chip caught mid-departure
     stayed in here as a detached node -- and the next `sync` for that id
     called `reclaim`, got the detached element back, matched its shape, and
     never appended it to the new layer. The chip then simply never appeared,
     which is the exact mirror of the drag bug: that one deleted a live chip,
     this one resurrected a dead one. */
  leaving.clear();
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
  const host = boardStack();
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
    /* While a creature is being dragged it is on the board twice and the chip
       rides the ghost -- so the real token's own refreshes, which Foundry
       raises for its dimmed drag state, must not pull it back. Both were
       writing one element every frame. Matched on the preview's KIND rather
       than on `hasPreview`, which is also true of a sheet's config preview,
       and that one does not move the token at all. */
    if (token?._preview?._previewType === "dragging") return;
    const chip = chips.get(token.document?.id ?? token.id);
    if (chip) place(chip, token);
    else sync(token);
  });

  Hooks.on("drawToken", (token: any) => sync(token));
  Hooks.on("destroyToken", (token: any) => {
    /* Keyed by the token object, so a ghost's filter goes and the real
       creature's stays. */
    clearTokenConditionMaterial(token);

    /* A ghost being destroyed is a drag ending -- Foundry destroys the clone
       on a drop and on a cancel alike -- and it carries the creature's own
       document id, so deleting by id here is what deleted the live chip and
       made the arrival replay. The chip is handed back to the real placeable
       instead. A drop also raises `updateToken`; a cancel raises nothing at
       all, so this is the only hook that can. */
    if (ghost(token)) {
      const real = realOf(token);
      if (real && real !== token) sync(real);
      return;
    }

    const id = token.document?.id ?? token.id;
    chips.get(id)?.remove();
    chips.delete(id);
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

  /* Sight recomputed — a creature stepping out of the fog, or into it. That
     and nothing else: see `revisit`. */
  Hooks.on("sightRefresh", () => revisit());

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
      ` -> subject ${k.subject} (drawn), clearance ${k.readout} (retired)` +
      `, material ${subjectInFrame(token).toFixed(4)} of the filter frame`
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
    hosted: boardStackHosted(layer),
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

/**
 * Put a set of conditions on the controlled tokens, to look at the material.
 *
 * The composite is the part of this system hardest to check, because seeing it
 * means getting several conditions onto one creature and the honest way to do
 * that is to stage a fight. The design pages render it beside the shipped one
 * at a size you can judge, which is the right tool for deciding; this is the
 * other half, for confirming the decision on the real canvas with the real
 * mesh, real token art and a real dynamic ring.
 *
 *   game.daggerheart.tokenChips.conditions("vulnerable", "charged")
 *   game.daggerheart.tokenChips.conditions()   // clears them again
 *
 * Applied as ordinary ActiveEffects through Foundry's own status API, so they
 * behave exactly as conditions applied by hand: no test path, nothing that
 * only exists for this. Which also means the clear only removes statuses this
 * call could have set, and leaves anything the fight actually put there.
 */
export async function applyTokenConditions(...ids: string[]): Promise<string> {
  const tokens = canvas?.tokens?.controlled ?? [];
  if (!tokens.length) return "select a token first";

  const known = new Set(CONDITIONS.map((condition) => condition.id));
  const wanted = ids.filter((id) => known.has(id));
  const unknown = ids.filter((id) => !known.has(id));

  for (const token of tokens) {
    const actor = token.actor;
    if (!actor) continue;
    for (const id of known) {
      const has = !!actor.statuses?.has?.(id);
      const want = wanted.includes(id);
      if (has !== want) await actor.toggleStatusEffect(id, { active: want });
    }
  }

  const named = wanted.length ? wanted.join(", ") : "nothing";
  const note = unknown.length ? ` (not conditions: ${unknown.join(", ")})` : "";
  return `${tokens.length} token(s) set to ${named}${note}`;
}
