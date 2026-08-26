/**
 * Does the framing land on the picture it was judged against?
 *
 * `system.portrait` is three numbers per surface and its schema opens by
 * saying what it is: **one picture, two frames.** The diorama and the roll
 * plate are different shapes, a crop judged in one is wrong in the other, so
 * each gets its own offsets — and the whole arrangement rests on there being
 * exactly one picture underneath both.
 *
 * That premise broke silently. `portraitOf` in `dice/rolls.ts` preferred the
 * *token* art, on the reasoning that it is what the table is looking at, while
 * the sheet's framing preview drew `actor.img`. So a character with token art
 * — which is most of them, and the diorama has a button for it — framed a face
 * against one image and got a different one on the card, wearing offsets
 * judged for a picture it is not. It reads from the sheet as the framing not
 * saving, and it works perfectly for anyone who never set token art, which is
 * why it lasted. Nothing on either side is wrong about the field it names,
 * which is the shape of gap `check-item-sheet.mjs` exists for.
 *
 * Six assertions, each one a failure that has actually happened here:
 *
 *   1. the schema still declares both frames, and declares them the same way —
 *      a `plate` frame that drifted to a different shape from `sheet` would
 *      make `writeFrame`'s one path two;
 *   2. the sheet writes both through one keyed path, so the target segment is
 *      the only difference between framing the diorama and framing the card;
 *   3. **the preview and the poster name the same picture** — the bug above.
 *      Held structurally now: the sheet calls `portraitOf`, so there is one
 *      answer and no second path to it. The check is that it still does, and
 *      that `portraitOf` still starts from `actor.img`;
 *   4. both plate builders write the framing into `.por`. `design/plate.js` is
 *      what `tools/verify/` draws and `dice/plate.ts` is what ships, and the
 *      design one went without the vars entirely: a framed portrait was a
 *      thing no study page could show. Same drift as `sq` against `shapeOf`;
 *   5. the offsets are written unitless. `plate.css` spends them as `cqw`/
 *      `cqh`, and a percentage where a number is expected is invalid at
 *      computed-value time — which does not mis-pan the portrait, it takes the
 *      whole `background` down and draws no portrait at all;
 *   6. `frameOf` reads the *plate*'s frame. Reading `portrait.sheet` there
 *      would put the diorama's crop on the card, and both are three numbers
 *      that look equally plausible in a debugger.
 *
 *     node tools/check-portrait-framing.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const schema = read("src/module/data/actors.ts");
const sheet = read("src/module/sheets/CharacterSheet.svelte");
const rolls = read("src/module/dice/rolls.ts");
const shipped = read("src/module/dice/plate.ts");
const studied = read("design/plate.js");

const fail = [];
const want = (ok, why) => ok || fail.push(why);

/** One function's body, from its opening line to the next top-level close. */
const bodyOf = (src, opening) => {
  const at = src.indexOf(opening);
  if (at < 0) return "";
  const end = src.indexOf("\n}", at);
  return end < 0 ? src.slice(at) : src.slice(at, end);
};

/* ── 1. the schema still says "one picture, two frames" ─────────────── */

const portrait = schema.match(/portrait:\s*schema\(\{([\s\S]*?)\}\)/);
want(portrait, "CharacterData no longer declares system.portrait");
for (const which of ["sheet", "plate"]) {
  want(
    portrait && new RegExp(`\\b${which}:\\s*frame\\(\\)`).test(portrait[1]),
    `system.portrait.${which} is not a frame(). Both surfaces store the same ` +
      "three numbers, and a shape that differs between them makes one write " +
      "path into two",
  );
}

/* ── 2. one write, keyed on the target ──────────────────────────────── */

want(
  /system\.portrait\.\$\{target\}/.test(sheet),
  "writeFrame no longer keys on the target. The diorama and the card differ " +
    "by one path segment and by nothing else",
);
want(
  /target\s*=\s*\$state<"sheet" \| "plate">/.test(sheet),
  "the framing target is no longer the two surfaces the schema declares",
);

/* ── 3. the preview and the card draw the same picture ──────────────── */

const preview = bodyOf(sheet, "platePortrait({");
want(preview, "the sheet no longer previews the plate it is framing");
want(
  /img:\s*portraitSrc\b/.test(preview),
  "the sheet's plate preview resolves its own picture. Whatever it draws is " +
    "what the framing is judged against, so it has to be the same call the " +
    "card posts — see portraitOf",
);
want(
  /import \{ portraitOf \} from "\.\.\/dice\/rolls\.ts"/.test(sheet) &&
    /portraitOf\(doc\)/.test(sheet),
  "CharacterSheet.svelte no longer asks portraitOf which picture the card " +
    "will draw. A second copy of that rule here is a second copy that can " +
    "disagree, which is exactly how the framing came to land on the wrong art",
);
want(
  /frame:\s*stored\("plate"\)/.test(preview),
  "the sheet's plate preview is not framed by the plate's own stored frame",
);

const por = bodyOf(rolls, "function portraitOf(");
want(por, "dice/rolls.ts no longer has portraitOf");
const first = por.match(/own\(actor\?\.(\w+)/);
want(
  first?.[1] === "img",
  "portraitOf does not reach for actor.img first. The sheet frames against " +
    "actor.img, so a card that prefers the token art applies offsets judged " +
    "for one picture to another — which reads as the framing not saving",
);
want(
  /mystery-man\.svg/.test(por),
  "portraitOf no longer excludes Foundry's placeholder, so an actor with no " +
    "art gets a card that reserves space for one",
);

/* ── 4 and 5. both builders write it, unitless ──────────────────────── */

for (const [name, src] of [
  ["src/module/dice/plate.ts", shipped],
  ["design/plate.js", studied],
]) {
  const p = bodyOf(src, "const POR =");
  want(p, `${name} no longer has a POR`);
  for (const v of ["--fdx", "--fdy", "--fz"]) {
    want(
      p.includes(v),
      `${name}'s POR does not write ${v}. The two builders draw the same ` +
        "panel and only one of them is on the study page, so a framing the " +
        "game applies and the page cannot show is a drift nothing catches",
    );
  }
  want(
    !/--fd[xy]:\$\{[^}]*\}%/.test(p),
    `${name}'s POR writes the offsets as percentages. plate.css spends them ` +
      "as cqw/cqh, and a percentage there is invalid at computed-value time " +
      "— which takes the whole background down and draws no portrait at all",
  );
}

/* ── 6. the card reads the card's frame ─────────────────────────────── */

const fo = bodyOf(rolls, "function frameOf(");
want(fo, "dice/rolls.ts no longer has frameOf");
want(
  /system\?\.portrait\?\.plate/.test(fo),
  "frameOf does not read portrait.plate. The diorama's crop is three numbers " +
    "that look exactly as plausible here, and it is the wrong panel's",
);

/* ── report ─────────────────────────────────────────────────────────── */

if (fail.length) {
  const one = fail.length === 1;
  console.error(`portrait framing: ${fail.length} thing${one ? "" : "s"} adrift\n`);
  for (const f of fail) console.error(`  ${f}`);
  console.error(
    "\nEvery half of this is correct about the field it names. What goes\n" +
      "wrong is the two halves naming different pictures.",
  );
  process.exit(1);
}

console.log(
  "portrait framing: two frames, one picture, and both builders spend it.",
);
