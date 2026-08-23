/**
 * Ports the design prototypes' stylesheets into `styles/`.
 *
 * The design pages own a whole document; a Foundry system owns a subtree of
 * somebody else's. So four things change and nothing else does:
 *
 *   :root          → .dh          the palette is scoped to our own root, or
 *                                 `--ink` and `--paper` leak into every
 *                                 other package on the page.
 *   :root.light    → html.dh-light .dh
 *   body.ramp      → .dh.ramp     the study pages drove art modes off <body>
 *                                 because they had one; we have many roots.
 *   every selector → .dh <sel>    see below.
 *
 * Plus the study-page chrome at the foot of tokens.css and sheet.css, which
 * styles the nav bar and prose of the prototype pages and has no business in
 * a game system.
 *
 * ── why every selector ────────────────────────────────────────────────
 * Scoping the *palette* was never enough. The design names things the way a
 * document that owns itself may: `.tabs`, `.rail`, `.win`, `.slot`, `.card`,
 * `.pk`. Foundry uses four of those six for its own furniture, and Foundry
 * puts our sheets in the `system` cascade layer — which it declares *after*
 * `elements`, `blocks` and `applications`. A layer beats specificity
 * outright, so `.tabs button` did not merely compete with Foundry's sidebar
 * rule, it won: thirteen sidebar tabs lost their icon font and rendered as
 * tofu boxes, and nothing in our code had gone anywhere near them.
 *
 * That is not a bug to fix once. It is the whole class of bug you get from
 * shipping unqualified class names into somebody else's document, and there
 * are about two hundred of them in here. So the port qualifies all of them.
 *
 * It does not help with two of our own sheets colliding with each other —
 * both are inside `.dh` — and it should not: that is a name clash in the
 * design system and belongs in `design/`, where `.die.win` became `.die.lit`
 * and `.dfn .pl` became `.dfn .crest`.
 *
 * Re-runnable: the design files stay the source of truth, and this is how a
 * change there reaches the system.
 */

import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SRC = resolve("design");
const OUT = resolve("styles");
const ASSET_SRC = resolve("design/assets");
const ASSET_OUT = resolve("assets");

/** The sheets a running system needs. The rest are study pages. */
const SHEETS = [
  "tokens.css",
  "mark.css",
  "gem.css",
  "track.css",
  "pool.css",
  "tile.css",
  "card.css",
  "chit.css",
  "keep.css",
  "ledger.css",
  "activity.css",
  "roll.css",
  "swap.css",
  "sheet.css",
  "plate.css",
  "menu.css",
  "prep.css",
  "dlg.css",
  "make.css",
  "browse.css",
  "marked.css",
  "token.css",
];

/**
 * Trailing blocks that style the prototype page itself. Everything from the
 * marker to end of file goes.
 */
const TRIM = {
  "tokens.css": "*{box-sizing:border-box}",
  "sheet.css": ".btns{display:flex",
};

/* ── the scoper ────────────────────────────────────────────────────────
   A tokenizer rather than a regex, because the thing it must never do is
   mistake a brace inside a comment or a string for the start of a block and
   prefix the next two hundred rules with garbage. Comments and quoted
   strings are copied through untouched; only selector preludes are rewritten.

   `@keyframes`, `@property` and `@font-face` are opaque: their blocks hold
   percentages and descriptors, not selectors. `@media`, `@container`,
   `@supports` and `@layer` are transparent — their contents are rules, so
   the scoper walks into them. */

const OPAQUE = /^@(-\w+-)?(keyframes|property|font-face|page|counter-style|charset)\b/i;

/** Index just past the closing quote of the string starting at `i`. */
function endOfString(css, i) {
  const q = css[i];
  for (let j = i + 1; j < css.length; j++) {
    if (css[j] === "\\") j++;
    else if (css[j] === q) return j + 1;
  }
  return css.length;
}

/** Index just past the `}` matching the `{` at `open`. */
function endOfBlock(css, open) {
  let depth = 0;
  for (let i = open; i < css.length; ) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      const e = css.indexOf("*/", i + 2);
      i = e === -1 ? css.length : e + 2;
    } else if (c === '"' || c === "'") i = endOfString(css, i);
    else if (c === "{") (depth++, i++);
    else if (c === "}") {
      i++;
      if (--depth === 0) return i;
    } else i++;
  }
  return css.length;
}

/** Split a selector list on its own commas — `:is(a,b)` must survive whole. */
function splitList(sel) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === "/" && sel[i + 1] === "*") {
      const e = sel.indexOf("*/", i + 2);
      i = (e === -1 ? sel.length : e + 1);
    } else if (c === '"' || c === "'") i = endOfString(sel, i) - 1;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      out.push(sel.slice(start, i));
      start = i + 1;
    }
  }
  out.push(sel.slice(start));
  return out;
}

/** Leading whitespace and comments, which must stay in front of the prefix. */
function splitLead(s) {
  let i = 0;
  for (;;) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (s.startsWith("/*", i)) {
      const e = s.indexOf("*/", i + 2);
      i = e === -1 ? s.length : e + 2;
      continue;
    }
    return [s.slice(0, i), s.slice(i)];
  }
}

/* Already ours. `.dh`, `.dh.ramp`, `html:not(.dh-light) .dh` all are — and
   `.dh-light` on its own is not, which is what the trailing guard is for. */
const MINE = /(^|[\s>+~(,])\.dh(?![\w-])/;

const scopeSelector = (sel) =>
  splitList(sel)
    .map((part) => {
      const [lead, rest] = splitLead(part);
      if (!rest.trim() || MINE.test(rest)) return part;
      return `${lead}.dh ${rest}`;
    })
    .join(",");

function scope(css) {
  let out = "";
  let prelude = "";
  for (let i = 0; i < css.length; ) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      const e = css.indexOf("*/", i + 2);
      const j = e === -1 ? css.length : e + 2;
      prelude += css.slice(i, j);
      i = j;
    } else if (c === '"' || c === "'") {
      const j = endOfString(css, i);
      prelude += css.slice(i, j);
      i = j;
    } else if (c === ";" || c === "}") {
      // A statement at rule level (`@import`, `@layer a, b;`) or a stray
      // close brace. Neither carries a selector.
      out += prelude + c;
      prelude = "";
      i++;
    } else if (c === "{") {
      const end = endOfBlock(css, i);
      const inner = css.slice(i + 1, end - 1);
      const [lead, head] = splitLead(prelude);
      out +=
        lead +
        (head.startsWith("@")
          ? `${head}{${OPAQUE.test(head) ? inner : scope(inner)}}`
          : `${scopeSelector(head)}{${inner}}`);
      prelude = "";
      i = end;
    } else {
      prelude += c;
      i++;
    }
  }
  return out + prelude;
}

function port(name) {
  let css = readFileSync(join(SRC, name), "utf8");

  const cut = TRIM[name];
  if (cut) {
    const i = css.indexOf(cut);
    if (i === -1) throw new Error(`${name}: trim marker ${JSON.stringify(cut)} not found`);
    css = css.slice(0, i).trimEnd() + "\n";
  }

  css = css
    // Order matters: the qualified forms first, or `:root` eats their prefix.
    .replaceAll(":root:not(.light)", "html:not(.dh-light) .dh")
    .replaceAll(":root.light", "html.dh-light .dh")
    .replaceAll(":root", ".dh")
    .replaceAll("body.ramp", ".dh.ramp")
    .replaceAll("body.noart", ".dh.noart")
    // The drag proxy is the one thing we draw outside the sheet — it has to
    // be, or the card being dragged is clipped by the scroller it came out
    // of. So it wears `.dh` itself rather than sitting under one, and the
    // rule has to be a compound instead of a descendant to match it.
    .replaceAll(".dragproxy", ".dh.dragproxy")
    // The context menu, for the same reason and by the same trick: it is on
    // <body> because a menu opened on a row near the bottom of a scroller
    // would otherwise be clipped by it. Rewriting the *class* rather than
    // only the root selector is what makes the descendants work too —
    // `.ctxm .mi` becomes `.dh.ctxm .mi`, which matches; `.dh .ctxm .mi`,
    // which is what the scoper would have produced, does not.
    .replaceAll(".ctxm", ".dh.ctxm")
    // The roll popover, third of the three we draw outside a sheet and for
    // the identical reason — it opens against a row that may be near the
    // bottom of a scroller, and `position:fixed` escapes overflow but not
    // a transformed ancestor. Same trick, same requirement: the *class* is
    // rewritten, so `.prep .xr` becomes `.dh.prep .xr` rather than the
    // `.dh .prep .xr` the scoper would have written, which matches nothing.
    .replaceAll(".prep", ".dh.prep")
    // The rules panel's peek host, fourth and the only one whose reason is
    // somebody else's stylesheet: Foundry gives every `.window-content` a
    // `backdrop-filter`, and a filtered element is the containing block for
    // its own fixed descendants — so a peek layer inside a dialog is framed
    // by the dialog no matter what `position` it claims. On <body> it is
    // framed by the screen. Only the host wears `dh`; the `.peeklayer` and
    // `.pkc` inside it are descendants of it, so `sheet.css`'s rules for
    // them land unchanged, which is the whole point of hosting rather than
    // restyling.
    .replaceAll(".peekhost", ".dh.peekhost")
    // The Fear strip, fifth, and the only one that is docked rather than
    // floating: it lives in Foundry's own `#ui-top`, beside the scene
    // navigation, because the rules ask the GM to keep the pool visible to
    // the table and a surface you have to open is not visible. Nothing up
    // there is inside a sheet, so the same trick applies — and here the
    // compound is not merely convenient but safer, because `hud` is a name
    // Foundry uses for its own furniture and `.dh .hud` would match any of
    // it that ever landed inside one of our roots.
    .replaceAll(".hud", ".dh.hud")
    // The token chip, sixth, and the one that is drawn the most times: one
    // per creature on the board, in a layer over the canvas that mirrors
    // `canvas.stage.worldTransform`. Nothing on the board is inside a sheet,
    // so it takes the same treatment as the Fear strip — and here the
    // compound is again the safer form rather than merely the shorter one,
    // since the descendant version would match anything of Foundry's that
    // ever landed inside one of our roots wearing the same name.
    //
    // One rewrite covers both classes, because the layer's name begins with
    // the chip's. That is also why design/token.css may not spell either
    // selector in its own prose: this runs over comments too, and a comment
    // naming the class would come back carrying two prefixes.
    .replaceAll(".tok", ".dh.tok")
    /* `../assets/`, not `systems/gluniverse-daggerheart/assets/`.
       A relative `url()` resolves against the stylesheet it is written in,
       and these end up in `styles/` — so the absolute-looking form was
       fetched from `styles/systems/gluniverse-daggerheart/assets/` and
       404'd. `../assets/` is correct from `styles/` and stays correct on a
       Foundry served under a route prefix, which a leading `/` would not. */
    .replaceAll("/design/assets/", "../assets/");

  // A comment that never closes, or one closed twice, is the quietest failure
  // this pipeline has. CSS recovers from it by discarding tokens up to the
  // next `}` — so the rule *after* the mistake vanishes, everything else keeps
  // working, and what you see in the game is one control behaving as though
  // its stylesheet had never been written. It cost an hour here: an
  // explanatory paragraph was pasted after a block that had already closed,
  // and the button reset below it stopped existing. Nothing in the port, the
  // build, `tsc` or `svelte-check` looks at CSS syntax.
  //
  // Counting delimiters is not a parser and is not meant to be. It catches the
  // mistake that actually happens when these files are edited by hand, which
  // is a paragraph landing on the wrong side of a comment's closing delimiter.
  const opens = (css.match(/\/\*/g) ?? []).length;
  const closes = (css.match(/\*\//g) ?? []).length;
  if (opens !== closes) {
    throw new Error(
      `design/${name}: ${opens} comment openers and ${closes} closers. ` +
        `An unbalanced comment silently deletes the rule that follows it.`,
    );
  }

  css = scope(css);

  const header =
    `/* Ported from design/${name} by scripts/port-design-css.mjs — do not edit here.\n` +
    `   Edit design/${name} and re-run \`node scripts/port-design-css.mjs\`. */\n`;

  writeFileSync(join(OUT, name), header + css);
  return css.length;
}

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const src = join(from, entry);
    const dest = join(to, entry);
    if (statSync(src).isDirectory()) copyTree(src, dest);
    else copyFileSync(src, dest);
  }
}

mkdirSync(OUT, { recursive: true });
for (const name of SHEETS) console.log(`${name.padEnd(12)} ${port(name)} bytes`);

copyTree(ASSET_SRC, ASSET_OUT);
console.log(`assets       copied from design/assets/`);
