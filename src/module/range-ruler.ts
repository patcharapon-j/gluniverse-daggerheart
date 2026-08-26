/**
 * The range ruler, on the board.
 *
 * `design/ruler.css` and `design/ruler.js` are the component and argue for
 * themselves. This file is the half a study page cannot have: when a ruler
 * exists, whose it is, and what the scene's own grid makes of a range.
 *
 * ── it rides the chip's arrangement rather than repeating it ─────────
 * `token-hud.ts` cost three broken builds to learn where a layer over the
 * board goes, and every one of those lessons applies here unchanged: the
 * layer hangs inside `#hud`, the element is positioned in raw scene
 * coordinates, Foundry's own `Canvas#pan` does the alignment, and `#hud`'s
 * `_replaceHTML` will sweep the layer away on every render of it. So this
 * file looks like that one on purpose. The differences are the interesting
 * part and there are three.
 *
 * **It is keyed on the selection, not on the token.** A chip exists because a
 * creature does; a ruler exists because somebody asked a question. So it is
 * built on `controlToken` and dismissed on the same hook, and there is at
 * most one of them on the board at a time.
 *
 * **One selection only.** With several tokens selected you are moving them,
 * not measuring — and four bands each on three creatures is several thousand
 * pixels of overlapping circles with nothing to read in them. `controlled`
 * of length one is the whole condition.
 *
 * **It is under the chips.** `z-index` 0 against the chip layer's 1, so a
 * ring never crosses an arc. Those are two different kinds of claim about
 * one creature and the readout wins. That pair of numbers is stated inside
 * the board stack rather than among `#hud`'s own children — see
 * `board-layers.ts` — because among those children it was also a claim
 * about Foundry's Token HUD, and it beat that too.
 *
 * ── the scene's grid, not the book's feet ────────────────────────────
 * `RANGE_FEET` is the book's approximation and `rangeSquares` is that
 * approximation in the unit a virtual tabletop actually has. The ring comes
 * off **squares**; only the printed distance comes off `scene.grid.distance`
 * and its units. Dividing the book's feet by the scene's distance is the
 * obvious build and is quietly wrong on every metric table, because it reads
 * a number labelled *metres* as though it were feet — Melee would come out
 * at three and a third squares on a 1.5m grid.
 *
 * ── which table, and why it is read here ─────────────────────────────
 * The SRD prints a second set of numbers under *Defined Ranges*, and the two
 * disagree in exactly one place: derived, Very Close is **2** squares;
 * printed, it is **3**. Close and Far already agree. So the setting moves one
 * ring, and it moves it by half again — which is a table's agreement about
 * what "very close" means changing under a picture of it, and therefore
 * exactly the thing this component exists to make visible.
 *
 * It is read **at the moment the bands are built** and never cached. That is
 * this repo's standing rule about a setting — the setting is the record, so
 * read the record, the same arrangement the Fear strip and the token-chip
 * switch keep — and `config.ts` cannot read it for us on purpose: that module
 * is imported by every card-drawing surface in the system and must answer a
 * question about geometry without a live `game`. So `rangeSquares` takes the
 * answer as an argument and this file is the one that knows it.
 *
 * Which then has a consequence the on/off switch did not have. Flipping the
 * ruler off and on again is a ruler that goes and comes back; flipping *this*
 * has to move rings that are already on screen, under a token still selected.
 * `sync`'s fast path returns early for exactly that case — same token, same
 * footprint, reposition and leave — so the table in force is carried beside
 * the footprint as a second thing the current bands were measured under. Two
 * fields rather than one composite key, because they are checked in two
 * places: a resize is a `refreshToken` and asks only about the creature, and
 * a rule change is a settings hook and asks only about the table.
 *
 * ── Very Far is declined ─────────────────────────────────────────────
 * Twenty-four squares is a ring 4,900 scene pixels across before the token
 * is added, on a scene that is typically four thousand by three thousand. It
 * stops being a measurement and becomes a claim that the answer is
 * everywhere, and it drags the ladder out with it: at the zoom where it fits,
 * Melee is nine pixels and has already been culled. `BANDS` is four, and the
 * fifth is left out here rather than filtered out of `RANGES`, because the
 * closed set is the rules' and this is a drawing decision.
 *
 * ── whose it is ──────────────────────────────────────────────────────
 * Nobody's but yours. Selection is per-client, so a ruler is only ever drawn
 * on the screen of the person who selected the token — there is no
 * permission question here and no world setting, which is why there is not
 * one. The switch on the Fear strip is client-scoped for the same reason the
 * chip's is: it is a preference about one screen.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { boardStack, boardStackHosted } from "./board-layers.ts";
import { RANGES, RANGE_LABELS, SYSTEM_ID, rangeSquares } from "./config.ts";
import { definedRanges } from "./settings.ts";
import type { RangeBand } from "./ui/ruler.js";
import { RANGE_RULER, TTL, closeRuler, radiusOf, setRulerZoom } from "./ui/ruler.js";

/** Melee, Very Close, Close and Far. See the note above on the fifth. */
const BANDS = RANGES.slice(0, 4);

let layer: HTMLElement | null = null;
let ruler: HTMLElement | null = null;
let subject: any = null;
/* The token's footprint the current bands were measured against. The radii
   are taken from the token's EDGE, so a creature changing size changes every
   ring rather than only the box they are centred in — which `place` alone
   cannot answer. This is `shapeOf`'s job on the chip, one field wide. */
let footprint = "";
/* Which range table the current bands were measured under — the other half of
   "what were these built from". A string rather than the setting's own
   boolean, so "never built" is a value of its own exactly as `footprint`'s
   empty string is; `false` would be indistinguishable from a ruler built under
   the derived table, and the first flip of the rule after a reload would find
   nothing to disagree with. */
let table = "";

const on = (): boolean => game.settings?.get(SYSTEM_ID, "rangeRuler") !== false;

/** Which of the two range tables is in force, as a key. */
const tableNow = (): string => (definedRanges() ? "defined" : "derived");

/**
 * What the bands are on this scene.
 *
 * `grid.distance` and `grid.units` are the scene's own, so a table playing in
 * metres gets rings on the right squares and a legend that says so. The
 * radius is measured from the token's EDGE — reach is what the rule means,
 * and a three-by-three dragon threatens a square beyond its own body.
 *
 * The setting is read **once, here**, rather than per band: four calls would
 * be four chances for the rule to change between Melee and Far, which is a
 * ruler drawn half under each table and a state nothing on screen could
 * explain. One reading is what makes the four rings one instrument.
 */
function bandsFor(token: any): RangeBand[] {
  const grid = canvas.grid?.size ?? 100;
  const scene = (canvas as any)?.scene?.grid ?? {};
  const per = Number(scene.distance) || 5;
  const units = String(scene.units ?? "").trim();
  const tokenR = Math.min(token.w ?? grid, token.h ?? grid) / 2;
  const defined = definedRanges();

  return BANDS.map((key) => {
    const squares = rangeSquares(key, defined);
    const away = +(squares * per).toFixed(2);
    return {
      key,
      label: RANGE_LABELS[key] ?? key,
      dist: units ? `${away} ${units}` : `${away}`,
      r: radiusOf(squares, grid, tokenR),
    };
  });
}

/** The footprint the bands were measured against. See `footprint` above. */
const sizeOf = (token: any): string => {
  const grid = canvas.grid?.size ?? 100;
  const doc = token.document ?? token;
  return `${token.w ?? (doc.width ?? 1) * grid}/${token.h ?? (doc.height ?? 1) * grid}/${grid}`;
};

/* Raw scene coordinates, exactly as a chip is placed and as Foundry's own
   Token HUD places itself, because the layer's coordinate system IS `#hud`'s
   and `#hud`'s origin is scene (0,0). `token.position` rather than the
   document's x/y: they agree at rest and the container is the one that is
   true mid-animation, which is the frame that matters. */
function place(): void {
  if (!ruler || !subject) return;
  const doc = subject.document ?? subject;
  const grid = canvas.grid?.size ?? 100;
  const w = subject.w ?? (doc.width ?? 1) * grid;
  const h = subject.h ?? (doc.height ?? 1) * grid;
  const st = ruler.style;
  st.left = `${subject.position?.x ?? subject.x ?? doc.x ?? 0}px`;
  st.top = `${subject.position?.y ?? subject.y ?? doc.y ?? 0}px`;
  st.width = `${w}px`;
  st.height = `${h}px`;
}

/**
 * Take the ruler down.
 *
 * Through `closeRuler`, so the collapse actually plays — a ruler that simply
 * stops existing reads as a redraw rather than as a measurement ending. The
 * reference is dropped *now* and the element removes itself after `TTL`, so a
 * second selection during the collapse builds its own without waiting and
 * without the outgoing one taking the incoming one with it.
 */
function drop(): void {
  const going = ruler;
  ruler = null;
  subject = null;
  footprint = "";
  table = "";
  if (going) closeRuler(going, undefined);
}

/**
 * Ask again, once, after this batch of hooks.
 *
 * `controlToken` is raised **per token**, so a box-select over three
 * creatures raises it three times and the set is a different size at each —
 * one of which is a set of one. Answering each in turn builds a ruler on the
 * first and takes it down on the second, which is a 240ms collapse playing
 * over a gesture that never wanted a ruler at all. Coalescing reads the set
 * once, when it has settled.
 *
 * A macrotask rather than `requestAnimationFrame`, for `swap.js`'s reason
 * inverted: rAF is the right tool for "before the next paint" and the wrong
 * one for "after the current batch", and it does not fire at all in a tab
 * that is not painting.
 */
let queued = 0;
function ask(): void {
  if (queued) return;
  queued = setTimeout(() => {
    queued = 0;
    sync();
  }, 0) as unknown as number;
}

/** Draw for whatever is selected now, or take it down. */
function sync(): void {
  if (!layer) return;
  const held = canvas.tokens?.controlled ?? [];
  const token = on() && held.length === 1 ? held[0] : null;

  if (!token) return drop();
  /* The fast path, and what it may skip. Same creature, same size, same rule
     in force: nothing about the rings has changed, so the answer is where the
     token now is and no more. Every one of those three is a thing the bands
     were measured from, which is why the table is tested here beside the
     footprint — without it a rule flipped mid-session under a token that is
     still selected would reposition rings drawn to the other table, and the
     component would go on being drawn perfectly and be lying. */
  if (subject === token && ruler && sizeOf(token) === footprint && tableNow() === table) {
    return place();
  }

  drop();
  subject = token;
  footprint = sizeOf(token);
  table = tableNow();

  const host = document.createElement("div");
  host.innerHTML = RANGE_RULER(bandsFor(token));
  ruler = host.firstElementChild as HTMLElement | null;
  if (!ruler) {
    subject = null;
    return;
  }
  layer.appendChild(ruler);
  place();
  /* Asked for the camera before the first paint rather than left to the next
     pan. Without this the lettering has no legends at all until something
     moves, which is a ruler that arrives blank on a board nobody is panning. */
  setRulerZoom(ruler, canvas.stage?.scale?.x ?? 1);
}

/* ══ the camera ═══════════════════════════════════════════════════════
   The only thing pan and zoom cost. The layer is aligned by Foundry, so
   nothing of ours moves — but how large a ring has become ON SCREEN, and how
   many legends its circumference now has room for, are questions only the
   camera can answer. `setRulerZoom` returns early when the scale has not
   changed, and rewrites a ring's lettering only when the count itself moves,
   which is `setTier`'s discipline rather than a similar one. */
function retier(): void {
  if (ruler) setRulerZoom(ruler, canvas.stage?.scale?.x ?? 1);
}

/** Hang a fresh layer in the board stack. Every scene change does this. */
function build(): void {
  ruler?.remove();
  ruler = null;
  subject = null;
  layer?.remove();

  const host = boardStack();
  if (!host) {
    console.error(
      `${SYSTEM_ID} | nowhere to hang the range ruler — canvas.hud has no element ` +
        `and there is no #hud on the page. range-ruler.ts needs a new host.`,
    );
    layer = null;
    return;
  }
  layer = document.createElement("div");
  layer.className = "dh ruler-layer";
  /* Before the chip layer rather than after it, so a ring draws under an arc.
     `prepend` rather than a z-index race: both layers are children of an
     element Foundry rebuilds, and source order is the thing that survives
     that. The stylesheet states the z-index as well, because the layers can
     be re-hung in either order after an eviction. Both statements are now
     made INSIDE the board stack rather than inside `#hud`, which is what
     keeps them a claim about our two layers instead of a claim about
     Foundry's Token HUD — see `board-layers.ts`. */
  host.prepend(layer);
  sync();
}

/* `#hud` is an ApplicationV2 and its `_replaceHTML` assigns `innerHTML`, so
   every render of it takes our layer with it. Re-hung rather than hung
   somewhere safer, because "somewhere safer" is outside the coordinate
   system — see the long note at the head of `token-hud.ts`. */
function rehang(): void {
  if (!layer) return;
  const host = boardStack();
  if (!host || layer.parentElement === host) return;
  host.prepend(layer);
}

/**
 * Wire the ruler up.
 *
 * From `init`, and for `registerTokenChips`'s reason rather than a similar
 * one: this only asks `Hooks.on`, and the hook it depends on is
 * `canvasReady`, which fires during `Game#setupGame` and therefore *before*
 * `ready`. Registered at `ready` the listener is attached to an event that
 * has already gone past, nothing throws, nothing logs, and the component
 * appears the first time somebody changes scene.
 */
export function registerRangeRuler(): void {
  Hooks.on("canvasReady", build);
  Hooks.on("canvasPan", retier);
  Hooks.on("renderHeadsUpDisplayContainer", rehang);

  /* Selecting and deselecting are the same event, and `sync` reads the
     controlled set rather than the hook's own arguments — a box-select
     raises this once per token and only the resulting set is the answer. */
  Hooks.on("controlToken", () => ask());

  /* A selected token moving takes its ruler with it. The same render flag
     that moves Foundry's own nameplate (`refreshPosition`), so it is raised
     on every frame of an animated move by construction. */
  Hooks.on("refreshToken", (token: any) => {
    if (!subject) return;
    if (token !== subject && token.document?.id !== subject.document?.id) return;
    /* A resize is a refresh too, and it moves every ring rather than the box
       they sit in — the radii are measured from the EDGE. So the footprint is
       compared here and a changed one rebuilds instead of repositioning. */
    if (sizeOf(token) !== footprint) ask();
    else place();
  });

  /* A token being destroyed under a live ruler — a scene edit, a delete. */
  Hooks.on("destroyToken", (token: any) => {
    if (subject && token.document?.id === subject.document?.id) drop();
  });

  /* The switch on the Fear strip, and Foundry's own settings window, are the
     same press: both write the setting, the setting raises this, and this is
     the only thing that ever turns the ruler on or off.

     Two settings raise it now — `rangeRuler`, which says whether there is a
     ruler, and `definedRanges`, which says what one measures — and one hook
     serves both because `sync` reads the world rather than the event. It
     answers the first by finding the ruler switched off and dropping, and the
     second by finding the table changed and rebuilding; neither has to be
     told which of them fired. `definedRanges` is world-scoped, so this
     arrives on every client at the table and every ruler on the board moves
     together, which is the point of it being the table's agreement. */
  Hooks.on("daggerheart.rangeRulerChanged", () => ask());

  /* Already up — the case `canvasReady` cannot answer, because for a system
     reloaded into a running world it has genuinely been and gone. */
  if ((canvas as any)?.ready) build();
}

/**
 * What the ruler currently thinks, for a console.
 *
 * The chip has one of these because both bugs in its first build were silent.
 * This has one for the same reason and a sharper version of it: a component
 * that only exists while something is selected has no steady state to look
 * at, so "it did not appear" and "it appeared and went" are indistinguishable
 * afterwards. `game.daggerheart.rangeRuler()`.
 *
 * **And it says which table, in squares.** CLAUDE.md's line about this
 * component is that a chip is drawn wrong or right while a ruler can be drawn
 * perfectly and be *lying*, and *Defined Ranges* is that hazard with a switch
 * on it: the rule moves one ring by half again, silently, from a world
 * setting, and a circle at six squares looks exactly as correct as a circle
 * at four. So the report prints the table in force and every band's radius in
 * the unit the ring is actually built from — `squares` beside `builtUnder`,
 * which is what the rings on screen *were* built under. The two disagreeing
 * is the one failure this component's fast path can produce, and it is
 * therefore the one thing worth being able to read off a console.
 */
export function reportRangeRuler(): Record<string, unknown> {
  const held = canvas?.tokens?.controlled ?? [];
  const scene = (canvas as any)?.scene?.grid ?? {};
  const defined = definedRanges();
  return {
    setting: game.settings?.get(SYSTEM_ID, "rangeRuler"),
    ranges: defined
      ? "defined — the SRD's optional printed table"
      : "derived — the book's feet divided by five",
    builtUnder: table || "(nothing drawn)",
    squares: Object.fromEntries(BANDS.map((k) => [k, rangeSquares(k, defined)])),
    stylesheetLoaded: [...document.styleSheets].some((s) => s.href?.includes("ruler.css")),
    host: layer?.parentElement
      ? `${layer.parentElement.tagName.toLowerCase()}#${layer.parentElement.id || "(no id)"}`
      : "NONE — the layer was never hung",
    hosted: boardStackHosted(layer),
    underTheChips: layer?.nextElementSibling?.className ?? "(nothing after the ruler layer)",
    controlled: held.length,
    drawn: !!ruler,
    subject: subject?.name ?? null,
    grid: `${canvas?.grid?.size ?? "?"}px = ${scene.distance ?? "?"} ${scene.units ?? ""}`.trim(),
    bands: ruler ? [...ruler.querySelectorAll(".rngt")].map((s) => (s as HTMLElement).dataset.run) : [],
    ttl: TTL,
  };
}
