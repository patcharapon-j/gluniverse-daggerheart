/**
 * Dice So Nice, told what this system's dice look like.
 *
 * The plate draws its own dice: a gold diamond for Hope, a violet one for Fear,
 * and pale chamfered squares for the advantage d6s. With Dice So Nice installed,
 * the matching 3D dice are on by default and each player can turn them off.
 *
 * What tables used to get was a pair of identical house-default d12s
 * tumbling next to a card that had just gone to some trouble to say which one
 * was which. The whole point of the duality roll is that the two d12s are not
 * interchangeable, and the one surface that could have said so loudest was
 * saying nothing at all.
 *
 * ── the four ──────────────────────────────────────────────────────────
 * Two kinds of die, and the split is the same one the plate makes.
 *
 * **Hope and Fear are read as a colour.** You are not adding two numbers, you
 * are asking which of two hues came up higher, and that answer has to survive
 * the die landing at an angle, in shadow, half behind another one. So they are
 * `frosted` — a real transmissive material in that module — which carries the
 * hue through the whole body of the die rather than painting it on the
 * surface. Their numerals are white on both, because a numeral in a *third*
 * colour is a third thing to decode on a die whose entire job is to be one of
 * two, and white is the only value that reads at the same weight on gold and
 * on violet. Their number and cut glow faintly from inside the casting, which
 * is exactly what you want to find when the die is face-down in shadow behind
 * another one. The light is applied in the material shader rather than through
 * Dice So Nice's global bloom compositor; that distinction is the performance
 * argument below.
 *
 * **The advantage pair is read as a number**, so it is opaque. `velvet` —
 * matte, with a soft sheen along the edge as the die turns — because a
 * translucent die is a worse number, and because these two should sit quietly
 * next to the two that are carrying the question. They are a *value* pair
 * rather than a hue pair: advantage is pale with dark numerals, disadvantage
 * is dark with pale ones. Giving the negative its own colour would make it a
 * third kind of die instead of an inversion of the first.
 *
 * ── the surfaces ──────────────────────────────────────────────────────
 * Every texture here is ours and every one is almost nothing — see
 * `tools/make-dice-textures.mjs` for why, and for how they are generated. The
 * short version is that every texture the module ships is a picture of
 * something, this system draws no pictures of anything, and all the character
 * is put in the bump where it costs the hue nothing. What they draw is a
 * chamfered bevel — a rule following the edge of the face, with the system's own
 * diamond at every corner.
 *
 * **Hope and Fear do not share it.** They did, and the consequence was that the
 * hue was the only thing on the table distinguishing them — one axis, for the
 * one question the whole roll is. So the cut is a second axis, and the two cuts
 * are now orthogonal in *direction*, which is the largest difference two line
 * cuts can have: Fear is three rules going round, closed at every corner with
 * the mark set into them; Hope is one rule that lets go at every corner, with
 * the mark standing free in the gap and a burst of light leaving it outward.
 * The argument is in the generator's header, where the shape is.
 *
 * **And there is one of each per shape.** A colorset is chosen per *term*, so
 * the die's face count is known at the moment it is painted — which means the
 * figure can be derived from that face's own polygon rather than from a
 * compromise between a d6's square and a d12's pentagon. It had to be a
 * compromise while Hope was always a d12; *Signature Move*, *Rise to the
 * Challenge* and *Reliable Backup* all hand you a d20 instead, the roll popover
 * now lets you say so, and a d20's face is a triangle with barely half the
 * inradius. Six shapes, two hues, twelve textures, and the colours, the
 * material, the font and the glow are identical across all of them: a d20 Hope
 * Die is the same die, cut for the face it has.
 *
 * One thing there is worth knowing here rather than only there: on `frosted`
 * the bump canvas is handed to the material a second time as its
 * `transmissionMap` (`usesTransmissionMask` in `DiceFactory.js`). So the bump's
 * flat level is not a free choice — it is how much of the die you can see
 * through — and the groove is a place light scatters as well as a place the
 * surface dips. Every texture here keeps a high flat level for that reason,
 * and Hope's and Fear's keep the *same* one, or the pair stops being a fair
 * comparison.
 *
 * The bump and the glow both need the module's own "realistic lighting" on;
 * without it the colour maps still apply and the rest is quietly dropped.
 * That is the user's setting and not ours to move.
 *
 * ── the glow, and what it can honestly be ─────────────────────────────
 * Hope and Fear glow. Everything below was read out of the module's own
 * sources, because this is the corner of its API where the wiki and the truth
 * have least to do with each other, and the line numbers are Dice So Nice
 * 6.2.4's.
 *
 * **A texture has no emissive slot.** `Dice3D.addTexture(id, data)` hands its
 * argument to `DiceColors.loadTextures`, which loads exactly two images —
 * `source` and `bump`, or an `atlas` naming both (`DiceColors.js:815`). There
 * is no third. The only emission a *colorset* can ask for is
 * `emissiveLabels: true`, and what that buys is stated in one branch:
 * `mat.emissiveIntensity = 0.7; mat.emissive = new Color(0xffffff)`
 * (`DiceFactory.js:1234`). The emissive **map** it multiplies is a canvas
 * filled `#000000` with the numeral drawn into it at `#999999` and nothing
 * else (`createTextMaterial`, `DiceFactory.js:1453` and `:1699`). So out of
 * the box, a glowing die means a glowing *number*.
 *
 * **That built-in switch is too expensive for two small illuminated areas.**
 * Dice So Nice 6.2.9 treats any visible non-black emissive material as a reason
 * to enable its full-screen bloom compositor. During every animation frame it
 * traverses the scene, darkens non-bloom meshes, renders the bloom composer,
 * traverses again to restore materials, and renders the final composer. The
 * custom dice used to opt into all of that through `emissiveLabels: true`.
 *
 * We still use the module's exact emissive atlas. The material-ready hook sets
 * the public emissive colour to black so Dice So Nice keeps its one-pass render,
 * then its `onBeforeCompile` wrapper seeds `totalEmissiveRadiance` immediately
 * before Three.js applies that same atlas. The label and cut pixels, intensity,
 * frosted material, bump, transmission mask, colours and textures are unchanged;
 * only the scene-wide post-process around them is removed.
 *
 * **The surface glow is composited, and here is why it is not a preset.**
 * The one genuine emission-*map* path in the module is `addDicePreset`, which
 * takes `emissiveMaps`, `backgrounds.emissiveMaps`, `emissive` and
 * `emissiveIntensity` (`DiceFactory.js:654`, `:664`, and the background draw
 * at `:1510`). It is real and it works — and reaching it means routing our
 * dice through `options.appearance.system`, because a preset belongs to a die
 * *system* and a system is chosen by name. That is the wrong thing to take.
 * A colorset is a finish; a system is the **die** — its model, its geometry,
 * the shape a table paid a dice-model module for. Overriding it would mean a
 * player who chose their own d12 gets ours instead, on a roll they did not ask
 * us to redecorate, which is the same overreach as making ourselves the
 * preferred colorset and is refused for the same reason. It is also the more
 * fragile half of the API: presets live on a `DiceFactory` instance, while
 * colorsets and textures are module-level state, so anything that builds its
 * own factory keeps the finish and loses the preset.
 *
 * So the glow map is composited into the module's own emissive canvas instead,
 * on `diceSoNiceOnMaterialReady` — which fires with the finished material and
 * its cache key at the very end of `createMaterial` (`DiceFactory.js:1378`),
 * after the emissive map is built (`:1224`) and before the material is cached
 * (`:1380`), which is the one frame in which this is a change to a surface
 * rather than a change to a cached material somebody else is already using.
 * The material identifies itself: `mat.userData.materialData` is set two lines
 * earlier (`:1357`), and its `texture.name` is our own texture id, so nothing
 * that is not ours is ever touched. **That hook is marked "deprecated shader
 * hook" in the module's source.** It is called unconditionally today; if it
 * stops being called, the glow falls back to the numeral and nothing else
 * changes, which is the whole reason the numeral's glow was worth fixing
 * first.
 *
 * The composite is `lighten` and not `lighter`: `lighter` adds, and the mark
 * at 150 landing on the numeral's 153 where a two-digit face overlaps it would
 * blow both to white. `lighten` takes the larger, so nothing can out-glow the
 * number.
 *
 * The intensity is 1 and the local shader light stays white.
 * A gold emissive on Hope would light its numeral gold too, and the numerals
 * are white on both on purpose — see above.
 *
 * ── the API ───────────────────────────────────────────────────────────
 * The rest of it, read off the module rather than off the wiki, because most
 * of it is easy to get subtly wrong:
 *
 *   `term.options.colorset` is checked *first* and wins outright over the
 *   user's own preferences — `options.appearance.colorset` is only consulted
 *   when nothing else matched, and is silently dropped if the name is not
 *   registered. The plain option is the one that always applies.
 *
 *   `addTexture` must resolve before the colorset naming it is added, or the
 *   theme is built against a texture that is not there yet.
 *
 *   `visibility: "hidden"` on a colorset is read in exactly one place —
 *   `prepareColorsetList`, which builds the settings dialog's dropdown — and
 *   nowhere in the render path. A hidden set is fully functional and still
 *   wins outright when a term names it. That is what lets one finish be twelve
 *   registrations without becoming twelve entries in somebody's menu.
 *
 *   `diceSoNiceMessagePreProcess(id, ctx)` is the one hook whose `ctx` is
 *   still mutable; `diceSoNiceMessageProcessed` fires afterwards and logs a
 *   deprecation if anyone writes to it. This is how a message opts out.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "../config.ts";
import { absolute } from "../assets.ts";

/**
 * The four roles a die can have here, and the only thing the roll engine names.
 *
 * A *role* is not a colorset any more. Hope and Fear each register six — one
 * per shape — and `paint()` picks between them off the term's own face count,
 * because the whole reason the cut can follow the face is that the shape is
 * known by then. The engine says "this die is the Hope Die" and stops there,
 * which is the only thing it knows and the only thing it should have to.
 */
export const HOPE = "hope";
export const FEAR = "fear";
export const ADV = "advantage";
export const DIS = "disadvantage";

/**
 * The shapes we cut a face for: every die Daggerheart rolls.
 *
 * A term outside this list keeps its role and takes the role's default shape —
 * the figure is then a decoration sized for the wrong polygon, which is
 * survivable and is exactly what every die got before there were six. The
 * colours, material and font are per role and are never the thing that falls
 * back.
 */
const SHAPES = ["d4", "d6", "d8", "d10", "d12", "d20"] as const;
type Shape = (typeof SHAPES)[number];

/** Hope and Fear are a d12 unless a card says otherwise; the pair is a d6. */
const DEFAULT_SHAPE: Record<string, Shape> = {
  [HOPE]: "d12",
  [FEAR]: "d12",
  [ADV]: "d6",
  [DIS]: "d6",
};

/** `dh-hope-d20`. Named so they cannot collide with a user's own presets. */
const setName = (role: string, shape: Shape): string => `dh-${role}-${shape}`;

/** And the surfaces, under the same prefix and for the same reason. */
const cutName = (hue: "hope" | "fear", shape: Shape): string => `dh-cut-${hue}-${shape}`;
const MARK_FAINT = "dh-mark-faint";

/**
 * The design's display face, which is the face every numeral in this system is
 * set in — the plate's totals, the rail's values, a card's level.
 */
const FONT = "Google Sans";

/**
 * A texture path, from the user data root.
 *
 * `absolute()` is for turning a path Foundry *gave* us into one a stylesheet
 * can fetch, and it takes a path that is already rooted at the user data
 * directory — `systems/…/assets/x.png`. Handed a bare `assets/dice/hope.png`
 * it produced `/assets/dice/hope.png`, which is a 404, and the failure was
 * quiet in the worst possible way: the rejected texture load took the whole
 * registration down with it in a `Promise.all`, so the *colours* went missing
 * and there was nothing on screen to suggest a missing image was the cause.
 * The dice simply came out the module's default brown.
 */
const asset = (file: string): string => absolute(`systems/${SYSTEM_ID}/assets/dice/${file}`);

const TEXTURES = [
  ...SHAPES.flatMap((shape) => [
    {
      id: cutName("hope", shape),
      data: {
        name: `Daggerheart — Open cut, ${shape}`,
        // `multiply`, not `destination-in`: this is a finish over the hue, not
        // a mask cut out of it. At 236..255 it darkens by at most 7.5 percent,
        // and the groove floor — the line — is 255, which darkens by nothing.
        composite: "multiply",
        source: asset(`hope-${shape}.png`),
        bump: asset(`hope-${shape}-bump.png`),
      },
    },
    {
      id: cutName("fear", shape),
      data: {
        name: `Daggerheart — Closed cut, ${shape}`,
        composite: "multiply",
        source: asset(`fear-${shape}.png`),
        bump: asset(`fear-${shape}-bump.png`),
      },
    },
  ]),
  {
    // The advantage pair is a d6 and always will be, so it is the one surface
    // with no shape in its name.
    id: MARK_FAINT,
    data: {
      name: "Daggerheart — Chamfer, faint",
      composite: "multiply",
      source: asset("mark-faint.png"),
      bump: asset("mark-faint-bump.png"),
    },
  },
];

/**
 * The third map, which the module has no slot for.
 *
 * Keyed by texture id, because that is what the finished material carries and
 * therefore the only thing the hook can recognise itself by. Only the two
 * `frosted` roles have one. The `velvet` pair remains wholly unlit.
 */
const GLOW: Record<string, string> = Object.fromEntries(
  SHAPES.flatMap((shape) => [
    [cutName("hope", shape), asset(`hope-${shape}-glow.png`)],
    [cutName("fear", shape), asset(`fear-${shape}-glow.png`)],
  ]),
);

/** Loaded once, on registration. Absent means the glow is simply not applied. */
const glowImages = new Map<string, HTMLImageElement>();

/** The existing finish's white light level, now applied locally. */
const GLOW_INTENSITY = 1;

/** Unique enough not to collide with Dice So Nice or another material hook. */
const LOCAL_GLOW_UNIFORM = "dhLocalEmissiveIntensity";

/** One atlas tile, which is the unit the module draws a texture in. */
const TILE = 256;

/**
 * What a role looks like, and it is the same on every shape it can wear.
 *
 * Only `texture` varies with the die, because only the *cut* has anything to do
 * with the polygon it is cut into. Hue, numeral, outline, edge, material, face
 * and glow are the role's, so a d20 Hope Die and a d12 Hope Die are two sizes
 * of the same object rather than two objects — which is the whole claim the
 * duality roll makes and the one a table has to be able to read across the
 * board.
 */
const ROLES = [
  {
    role: HOPE,
    description: "Daggerheart — Hope",
    // `--hope`, the same gold the gems in the rail are made of and the only
    // place in this system gold is a solid.
    background: "#d4a72c",
    foreground: "#ffffff",
    // Deep enough to hold the numeral's edge against a pale casting without
    // becoming a second colour in its own right.
    outline: "#5f4405",
    edge: "#eccb63",
    material: "frosted",
    cut: "hope" as const,
  },
  {
    role: FEAR,
    description: "Daggerheart — Fear",
    background: "#7b4fc0",
    foreground: "#ffffff",
    outline: "#241043",
    edge: "#b498f0",
    material: "frosted",
    cut: "fear" as const,
  },
  /* The advantage d6 and its negative, straight off `.die.a` and `.die.a.neg`
     in plate.css. No glow on either: these are opaque, they are read in the
     light, and a lit numeral on a pale die is a smudge rather than a signal. */
  {
    role: ADV,
    description: "Daggerheart — Advantage",
    background: "#dfe6ee",
    foreground: "#14161a",
    outline: "#8c98a8",
    edge: "#f7fafd",
    material: "velvet",
    cut: null,
  },
  {
    role: DIS,
    description: "Daggerheart — Disadvantage",
    background: "#101318",
    foreground: "#eef2f7",
    outline: "#000000",
    edge: "#3a424c",
    material: "velvet",
    cut: null,
  },
];

/**
 * One theme per role per shape it can be rolled on.
 *
 * The two `frosted` roles get all six, because a card can make either of them
 * any die in the game. The `velvet` pair gets the d6 alone: advantage in this
 * game is a d6 and always will be.
 *
 * **Only the role's default shape is `visible`, and the other five are
 * `hidden`.** That flag decides one thing and one thing only — whether a
 * colorset appears in the user's own theme picker (`prepareColorsetList`
 * filters on it); a hidden set still works, and still wins outright, when it is
 * named directly the way `paint` names it. Which is the whole distinction: the
 * six are an *implementation* of one finish across six polyhedra, not six
 * finishes, and a picker that grew from four Daggerheart entries to fourteen
 * would be this system spending a table's settings screen on its own
 * bookkeeping. What is left in the list is exactly what was there before —
 * Hope, Fear, Advantage, Disadvantage — and a user who picks one for their own
 * d20 gets the d12's cut on it, which is the compromise every die in this
 * system had until now and is a finish rather than an error.
 */
const COLORSETS = ROLES.flatMap((r) =>
  (r.cut ? SHAPES : (["d6"] as const)).map((shape) => ({
    name: setName(r.role, shape),
    description: r.description,
    category: "Daggerheart",
    background: r.background,
    foreground: r.foreground,
    outline: r.outline,
    edge: r.edge,
    texture: r.cut ? cutName(r.cut, shape) : MARK_FAINT,
    material: r.material,
    font: FONT,
    visibility: shape === DEFAULT_SHAPE[r.role] ? "visible" : "hidden",
  })),
);

/**
 * Which of a role's six a term wants, off the die it actually is.
 *
 * `faces` is the one thing a `Die` term always carries and the one thing the
 * cut depends on. A term that is not one of the six — a homebrew d3, a module's
 * d100 — keeps the role's colours and takes the role's default cut, because the
 * cut is a finish and the hue is the answer to the question being asked.
 */
function shapeOf(term: any, role: string): Shape {
  const name = `d${term?.faces}`;
  return (SHAPES as readonly string[]).includes(name)
    ? (name as Shape)
    : (DEFAULT_SHAPE[role] ?? "d12");
}

/**
 * Stamp a term with one of ours.
 *
 * Guarded because the terms are positional and a formula can be shorter than
 * the caller thinks — `rollDuality` builds the advantage term only when there
 * is advantage, so `dice[2]` is very often nothing at all.
 *
 * **It is said twice for compatibility.** `options.colorset` is the module's
 * priority route and makes the theme win over the user's general preference;
 * `options.appearance.colorset` is its documented appearance route. Keeping
 * both means either Dice So Nice parsing path still identifies the same finish.
 *
 * `mergeObject`-free on purpose: `options.appearance` may already carry a
 * caller's own keys and only this one is ours to set.
 */
export function paint(term: any, role: string): void {
  if (!term) return;
  const set = setName(role, shapeOf(term, role));
  term.options.colorset = set;
  term.options.appearance = { ...(term.options.appearance ?? {}), colorset: set };
}

/**
 * Put our glow into the material the module just finished building.
 *
 * The emissive canvas is one atlas tile per face, each 256px, drawn edge to
 * edge — the same grid the colour and bump maps are drawn in, and the same one
 * the texture we are adding to was authored for. So the whole canvas is tiled
 * at 256 without asking how many faces there are: the tiles beyond the face
 * count are never sampled, and the two leading tiles that carry the die's edge
 * already take the colour texture for the same reason (`DiceFactory.js:1163`).
 *
 * Everything is guarded and nothing throws. The failure mode is an unlit die,
 * which is what the module gives anyone whose "realistic lighting" is off in
 * any case — there is no emissive map at all in that branch.
 */
function applyGlow(mat: any): void {
  const name = mat?.userData?.materialData?.texture?.name;
  const src = typeof name === "string" ? glowImages.get(name) : undefined;
  if (!src) return;

  const canvas = mat.emissiveMap?.image;
  if (!canvas?.getContext) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  // `lighten` and not `lighter`: the numeral is already on this canvas at 153
  // and adding 150 to it where a two-digit face reaches the mark would blow
  // both to white. Taking the larger of the two means nothing on the die can
  // ever out-glow the number.
  ctx.globalCompositeOperation = "lighten";
  for (let y = 0; y < canvas.height; y += TILE) {
    for (let x = 0; x < canvas.width; x += TILE) ctx.drawImage(src, x, y, TILE, TILE);
  }
  ctx.restore();

  mat.emissiveMap.needsUpdate = true;

  /* Dice So Nice 6.2.9 turns on a full-screen bloom compositor whenever any
     visible material exposes a non-black emissive colour. That means two small
     glowing cuts otherwise force extra scene traversals and render passes for
     every frame of the roll.

     Keep the exact atlas and light level, but seed Three's existing emissive
     chunk locally. The chunk still samples `mat.emissiveMap`; only the white
     multiplier moves from the public material colour into this shader uniform.
     Dice So Nice therefore sees black and keeps its normal one-pass renderer. */
  if (typeof mat.emissive?.setHex === "function") mat.emissive.setHex(0x000000);
  else mat.emissive?.set?.(0x000000);

  const baseShader = mat.onBeforeCompile;
  mat.onBeforeCompile = function (this: any, shader: any, renderer: any): void {
    baseShader?.call(this, shader, renderer);

    const chunk = "#include <emissivemap_fragment>";
    if (!shader.fragmentShader?.includes(chunk)) return;

    shader.uniforms[LOCAL_GLOW_UNIFORM] = { value: GLOW_INTENSITY };
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", `uniform float ${LOCAL_GLOW_UNIFORM};\nvoid main() {`)
      .replace(
        chunk,
        `totalEmissiveRadiance = vec3(${LOCAL_GLOW_UNIFORM});\n${chunk}`,
      );
  };
  mat.needsUpdate = true;
}

export function registerDice(): void {
  Hooks.once("diceSoNiceReady", (dice3d: any) => {
    void (async () => {
      try {
        /* The face, before anything is drawn with it.
         *
         * DSN rasterises each theme's labels to a canvas once and caches the
         * result, and canvas text falls back silently to a default face when
         * the webfont it was asked for has not finished loading. Our faces
         * come from a stylesheet `<link>` rather than from Foundry's font
         * registry, so `addColorset`'s own loader has nothing to fetch and
         * returns immediately — leaving a race that resolves differently
         * depending on how warm the browser cache is. Whichever theme was
         * rasterised first got the wrong numerals for the session.
         *
         * `document.fonts.load` is the wait that closes it, and it is cheap:
         * the face is already in flight from the sheet stylesheet. */
        await document.fonts?.load(`700 100px "${FONT}"`).catch(() => {});

        /* Textures first: a colorset naming one that has not resolved is
           built against a texture that is not there, and stays that way.
           Each is allowed to fail on its own, though — a missing finish
           costs the dice their bevel, and taking the hues down with it
           would trade a surface nobody would notice for the one thing on
           these dice that carries meaning. */
        await Promise.all(
          TEXTURES.map((t) =>
            dice3d.addTexture(t.id, t.data).catch((err: unknown) => {
              console.warn(`${SYSTEM_ID} | dice texture ${t.id} did not load`, err);
            }),
          ),
        );

        // "default", not "preferred": these are what *our* dice look like, not
        // a replacement for what the player chose for everything else. A system
        // that made itself the preferred colorset would repaint a user's d20.
        for (const set of COLORSETS) await dice3d.addColorset(set, "default");

        /* The glow maps, which the module has no slot for and therefore does
           not load for us. Loaded here rather than lazily because the hook
           that uses them runs inside the module's material build and has
           nowhere to wait; a map that is not in hand by then is a die whose
           numeral glows and whose cut does not, which is exactly the state a
           table with realistic lighting off gets and is survivable. Materials
           are built on the first roll, which is a long time after this. */
        await Promise.all(
          Object.entries(GLOW).map(async ([id, path]) => {
            try {
              const img = new Image();
              img.src = path;
              await img.decode();
              glowImages.set(id, img);
            } catch (err) {
              console.warn(`${SYSTEM_ID} | dice glow map ${id} did not load`, err);
            }
          }),
        );
      } catch (err) {
        // A theme that failed to register costs the dice their colours and
        // nothing else — the roll, the plate and the chat card are untouched.
        console.error(`${SYSTEM_ID} | could not register the 3D dice`, err);
      }
    })();
  });

  /* Every material the module builds passes through here on its way to the
     cache, ours and everyone else's. `applyGlow` recognises its own by the
     texture the material was built with and declines the rest — a module's
     material is not ours to touch, and this one is not even ours to *keep*:
     the same object goes into `baseMaterialCache` two lines later and is
     handed to every later die that asks for the same theme.

     Bound on `Hooks.on` rather than inside `diceSoNiceReady`, because a hook
     registered from inside another hook's handler is a hook registered at
     whatever moment that one happened to fire, and materials are built off
     the first roll. Registering it at init means it cannot be late. */
  Hooks.on("diceSoNiceOnMaterialReady", (mat: any) => {
    try {
      applyGlow(mat);
    } catch (err) {
      // A glow that failed costs the cut its light and nothing else. It must
      // not take the material down with it: the die is already built and this
      // is the last thing that happens to it.
      console.warn(`${SYSTEM_ID} | could not light the dice`, err);
    }
  });

  /* The setting finally does what it says.
   *
   * It has been checked in exactly one place — whether to null the message's
   * sound — which muted the dice and left them rolling. Turning it off was
   * therefore the worst of both: the plate drew its own dice, the module drew
   * three more on top, and the only thing that changed was that the loudest
   * of the two answers was now also the silent one.
   *
   * Scoped to our own messages. Any other module's roll, a macro's `/r 2d6`,
   * a module that posts its own — none of those are ours to have an opinion
   * about, and a system that switched off a user's dice everywhere would be
   * a system overreaching from a checkbox labelled "3D dice on rolls".
   */
  Hooks.on("diceSoNiceMessagePreProcess", (id: string, ctx: any) => {
    if (game.settings.get(SYSTEM_ID, "diceSoNice")) return;
    const message = game.messages?.get(id);
    if (!message?.getFlag(SYSTEM_ID, "kind")) return;
    ctx.willTrigger3DRoll = false;
  });
}
