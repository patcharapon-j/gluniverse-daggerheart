/**
 * Dice So Nice, told what this system's dice look like.
 *
 * The plate draws its own dice, and it draws them well — a gold diamond for
 * Hope, a violet one for Fear, pale chamfered squares for the advantage d6s.
 * That is why the 3D dice are off by default here: two answers to one question
 * is worse than either.
 *
 * But "off by default" is not "off". A table that wants the toy should get the
 * toy, and what they used to get was a pair of identical house-default d12s
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
 * on violet. They are the two sets with `emissiveLabels`, which lights the
 * label texture and nothing else: the number glows faintly from inside the
 * casting, which is exactly what you want to find when the die is face-down in
 * shadow behind another one.
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
 * chamfered bevel: three octagonal rules stepping inward at falling weight,
 * with the system's own diamond four times among them. An octagon because the
 * module lays *one* texture over every face of every shape, and a chamfered
 * square is the only closed figure that follows the edge of a d6 and still
 * fits inside the pentagon of a d12.
 *
 * **Hope and Fear no longer share it.** They did, and the consequence was that
 * the hue was the only thing on the table distinguishing them — one axis, for
 * the one question the whole roll is. So the cut is a second axis and the two
 * cuts are halves of one figure: Hope keeps the octagon's four straight runs
 * and leaves the corners open, with the marks standing free on the axes; Fear
 * closes the corners and sets its marks into them. The argument is in the
 * generator's header, where the shape is.
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
 * **And we were not even getting that.** `emissiveLabels` is read off
 * `DiceColors.getColorSet(appearance.colorset)` at `DiceFactory.js:2286` —
 * and when a colorset arrives the way ours does, `appearance.colorset` is
 * `undefined` by then. `getAppearanceForDice` honours `term.options.colorset`
 * first, as it should, but it does so by replacing the whole appearance with
 * the colorset record: `appearance = colorsetData` (`:2052`). That record
 * carries `name` and `id` and every colour, and no key called `colorset` —
 * so the lookup at `:2286` falls through to `COLORSETS['custom']`, which has
 * no `emissiveLabels`, and the flag is quietly dropped. It is the *only*
 * colorset property lost that way: the colours, texture, material and font
 * are all read off `appearance` directly and survive, which is exactly why
 * nothing looked broken. The dice have been correct in every respect except
 * the one that was never firing.
 *
 * The fix is to say it twice. `paint()` writes `options.colorset` **and**
 * `options.appearance.colorset`, because `options.appearance` is merged back
 * over the replaced appearance immediately afterwards (`:2077`) and putting
 * the key back is all `:2286` needs. It costs one string in the message's
 * stored options and it is also, incidentally, the module's own priority-3
 * route (`:2040`), so if the first ever stops working the second still names
 * the right theme.
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
 * The intensity goes to 1 from the module's 0.7, and the colour stays white.
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
 *   `diceSoNiceMessagePreProcess(id, ctx)` is the one hook whose `ctx` is
 *   still mutable; `diceSoNiceMessageProcessed` fires afterwards and logs a
 *   deprecation if anyone writes to it. This is how a message opts out.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "../config.ts";
import { absolute } from "../assets.ts";

/** Our four, named so they cannot collide with a user's own presets. */
export const HOPE_SET = "dh-hope";
export const FEAR_SET = "dh-fear";
export const ADV_SET = "dh-advantage";
export const DIS_SET = "dh-disadvantage";

/** And our three surfaces, under the same prefix and for the same reason. */
const MARK_HOPE = "dh-mark-hope";
const MARK_FEAR = "dh-mark-fear";
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
  {
    id: MARK_HOPE,
    data: {
      name: "Daggerheart — Chamfer, open",
      // `multiply`, not `destination-in`: this is a finish over the hue, not
      // a mask cut out of it. At 236..255 it darkens by at most 7.5 percent,
      // and the groove floor — the line — is 255, which darkens by nothing.
      composite: "multiply",
      source: asset("hope.png"),
      bump: asset("hope-bump.png"),
    },
  },
  {
    id: MARK_FEAR,
    data: {
      name: "Daggerheart — Chamfer, closed",
      composite: "multiply",
      source: asset("fear.png"),
      bump: asset("fear-bump.png"),
    },
  },
  {
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
 * `frosted` sets have one: `velvet` takes no `emissiveLabels`, so its material
 * ends up with a black emissive colour and a glow map would be multiplied by
 * nothing (`DiceFactory.js:1237`).
 */
const GLOW: Record<string, string> = {
  [MARK_HOPE]: asset("hope-glow.png"),
  [MARK_FEAR]: asset("fear-glow.png"),
};

/** Loaded once, on registration. Absent means the glow is simply not applied. */
const glowImages = new Map<string, HTMLImageElement>();

/** Above the module's own 0.7 for a lit label, and no further. */
const GLOW_INTENSITY = 1;

/** One atlas tile, which is the unit the module draws a texture in. */
const TILE = 256;

const COLORSETS = [
  {
    name: HOPE_SET,
    description: "Daggerheart — Hope",
    category: "Daggerheart",
    // `--hope`, the same gold the gems in the rail are made of and the only
    // place in this system gold is a solid.
    background: "#d4a72c",
    foreground: "#ffffff",
    // Deep enough to hold the numeral's edge against a pale casting without
    // becoming a second colour in its own right.
    outline: "#5f4405",
    edge: "#eccb63",
    texture: MARK_HOPE,
    material: "frosted",
    font: FONT,
    emissiveLabels: true,
  },
  {
    name: FEAR_SET,
    description: "Daggerheart — Fear",
    category: "Daggerheart",
    background: "#7b4fc0",
    foreground: "#ffffff",
    outline: "#241043",
    edge: "#b498f0",
    texture: MARK_FEAR,
    material: "frosted",
    font: FONT,
    emissiveLabels: true,
  },
  /* The advantage d6 and its negative, straight off `.die.a` and `.die.a.neg`
     in plate.css. No glow on either: these are opaque, they are read in the
     light, and a lit numeral on a pale die is a smudge rather than a signal. */
  {
    name: ADV_SET,
    description: "Daggerheart — Advantage",
    category: "Daggerheart",
    background: "#dfe6ee",
    foreground: "#14161a",
    outline: "#8c98a8",
    edge: "#f7fafd",
    texture: MARK_FAINT,
    material: "velvet",
    font: FONT,
  },
  {
    name: DIS_SET,
    description: "Daggerheart — Disadvantage",
    category: "Daggerheart",
    background: "#101318",
    foreground: "#eef2f7",
    outline: "#000000",
    edge: "#3a424c",
    texture: MARK_FAINT,
    material: "velvet",
    font: FONT,
  },
];

/**
 * Stamp a term with one of ours.
 *
 * Guarded because the terms are positional and a formula can be shorter than
 * the caller thinks — `rollDuality` builds the advantage term only when there
 * is advantage, so `dice[2]` is very often nothing at all.
 *
 * **It is said twice, and the second one is not redundant.** `options.colorset`
 * is what the module checks first and what makes the theme win outright over
 * the user's preferences. But honouring it replaces the whole appearance
 * record with the colorset's own (`DiceFactory.js:2052`), and that record has
 * no key named `colorset` — so the later lookup that reads `emissiveLabels`
 * back off the theme (`:2286`) finds nothing and the glow is dropped. Merging
 * `options.appearance` happens in between (`:2077`), so writing the name there
 * as well puts the key back. Everything else about the theme comes through the
 * appearance directly and never needed it, which is why this was invisible.
 *
 * `mergeObject`-free on purpose: `options.appearance` may already carry a
 * caller's own keys and only this one is ours to set.
 */
export function paint(term: any, set: string): void {
  if (!term) return;
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
 * Everything is guarded and nothing throws. The failure mode is a die whose
 * numeral glows and whose cut does not, which is what the module gives anyone
 * whose "realistic lighting" is off in any case — there is no emissive map at
 * all in that branch, and `mat.emissiveMap` is simply absent.
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
  mat.emissiveIntensity = GLOW_INTENSITY;
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
