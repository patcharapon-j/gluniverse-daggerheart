/* What a posted card looks like after Foundry has cleaned it, and what the
 * flag has to carry so the render side can put back what it took.
 *
 * ── why this is a ratchet and not a comment
 *
 * `post-card.ts` and `dice/chat.ts` have carried the claim "the sanitiser eats
 * this, so it travels in a flag instead" since cards were first posted, and the
 * claim was never checked. It was also *wrong in one half*, which is how this
 * file started: the sigils really are stripped, and the `style` attribute
 * really is not — what killed `--art` was never the sanitiser at all, it was
 * `url("…")` with double quotes written into a double-quoted `style="…"`, where
 * the first `"` inside ends the attribute at parse time and the rest becomes
 * stray attributes. The card then inherited `tokens.css`'s sample photograph
 * and read as the wrong picture rather than as broken markup, which is exactly
 * why it shipped twice.
 *
 * So the two halves are asserted separately and for what they actually are:
 * one is Foundry's allow-list, the other is HTML attribute quoting.
 *
 * ── the allow-list
 *
 * Transcribed from Foundry's own `ALLOWED_HTML_TAGS` and
 * `ALLOWED_HTML_ATTRIBUTES` in `common/constants.mjs`, which is where they
 * live precisely because the client and the server share them —
 * `foundry.utils.cleanHTML` in `client/utils/helpers.mjs` is the client half
 * and the whole of its policy is those two lists plus "a disallowed tag
 * becomes an empty fragment, and its children go with it". Transcribed rather
 * than imported for `terms.js`'s reason: a check that imported the
 * installation it is checking would pass on the one machine that has it.
 * Against Foundry 14.
 *
 * `svg` is not on the tag list and `style` is on the global attribute list,
 * with its value set verbatim and no url() inspection anywhere. Those are the
 * two facts everything below turns on.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

globalThis.CONST = { CHAT_MESSAGE_STYLES: { OTHER: 0 } };
globalThis.ChatMessage = { getSpeaker: () => ({}), create: async (data) => data };

const { postCard, cardWrapper } = await import("../src/module/sheets/post-card.ts");
const SYSTEM_ID = "gluniverse-daggerheart";

/** Foundry's allowed tags. Anything else is deleted with its subtree. */
const ALLOWED_TAGS = new Set([
  "header", "main", "section", "article", "aside", "nav", "footer", "div", "address",
  "h1", "h2", "h3", "h4", "h5", "h6", "hr", "br",
  "p", "blockquote", "summary", "details", "span", "code", "pre", "a", "label", "abbr", "cite",
  "mark", "q", "ruby", "rp", "rt", "small", "time", "var", "kbd", "samp",
  "dfn", "sub", "sup", "strong", "em", "b", "i", "u", "s", "del", "ins",
  "ol", "ul", "li", "dl", "dd", "dt", "menu",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "col", "colgroup",
  "form", "input", "select", "option", "button", "datalist", "fieldset", "legend", "meter",
  "optgroup", "progress", "textarea", "output",
  "figure", "figcaption", "caption", "img", "video", "map", "area", "track", "picture",
  "source", "audio", "iframe",
]);

/** The global attribute list, plus the per-tag entries a card actually uses. */
const GLOBAL_ATTRS = [
  "class", "data-*", "id", "title", "style", "draggable", "aria-*", "tabindex", "dir",
  "hidden", "inert", "role", "is", "lang", "popover",
];
const TAG_ATTRS = {
  button: ["disabled", "name", "type", "value"],
  img: ["height", "src", "width", "usemap", "sizes", "srcset", "alt"],
  a: ["href", "name", "target", "rel"],
};
const allowed = (tag, name) =>
  [...GLOBAL_ATTRS, ...(TAG_ATTRS[tag] ?? [])].some((pattern) =>
    pattern.endsWith("*") ? name.startsWith(pattern.slice(0, -1)) : name === pattern);

/* ── reading the markup back ───────────────────────────────────────────
   A tag scanner rather than a parser, and it is enough because the only input
   is markup this repo's own builders emitted: no attribute minimisation, no
   unquoted values, every value in double quotes. That last point is the whole
   subject, so it is asserted rather than assumed — `ATTR` only matches a
   double-quoted value, and `tags()` insists every attribute in a tag matched.
   A tag whose attributes do not add up is precisely the `--art` failure, and
   it fails here as a count rather than as a wrong picture. */
const TAG = /<([a-zA-Z][\w-]*)((?:\s+[^<>]*?)?)\/?>/g;
const ATTR = /([a-zA-Z_:][\w:.-]*)="([^"]*)"/g;

function tags(html) {
  const body = html.replace(/<!--[\s\S]*?-->/g, "");
  const out = [];
  for (const [, tag, raw] of body.matchAll(TAG)) {
    const attrs = Object.fromEntries([...raw.matchAll(ATTR)].map(([, k, v]) => [k, v]));
    /* Every run of non-space in the attribute text must have been consumed by
       a well-formed `name="value"`. The old double-quoted `--art` left a
       trail of bare words — `url(systems…webp)`, `;` — and this is what sees
       them. */
    const consumed = [...raw.matchAll(ATTR)].reduce((n, m) => n + m[0].length, 0);
    const text = raw.trim().replace(/\s+/g, " ");
    assert.equal(
      text.length,
      consumed + Math.max(0, Object.keys(attrs).length - 1),
      `<${tag}> has attribute text no well-formed attribute claims: ${text}`,
    );
    out.push({ tag: tag.toLowerCase(), attrs });
  }
  return out;
}

/** Foundry's clean, as far as a string can model it: drop disallowed tags. */
const surviving = (html) => tags(html).filter((node) => ALLOWED_TAGS.has(node.tag));

/* ── the card ──────────────────────────────────────────────────────────
   A domain card with everything that has ever failed to travel on it: a
   painting whose filename holds an apostrophe, a hand-marked focus point, an
   ornament motif, a second domain, a sigil in every slot, charge lights and a
   counter row (both pre-rendered `<svg>`), and an authored press. */
const domain = (slug, name) => ({ slug, name, light: "#8a7", dark: "#231", ramp: true });
const SIGIL = '<svg viewBox="0 0 250 250"><path d="M0 0h8v8H0z" fill="currentColor"/></svg>';
const ART = "/systems/gluniverse-daggerheart/assets/cards/domains/grace/deft%27s-blade.webp";

const card = {
  d: domain("grace", "Grace"),
  d2: domain("codex", "Codex"),
  sig: SIGIL,
  sig2: SIGIL,
  fbsig: SIGIL,
  sigKey: "grace",
  sig2Key: "codex",
  fbsigKey: "primary",
  lvl: 2,
  rc: 1,
  tier: 1,
  type: "Spell",
  name: "Deft Deceiver",
  glyph: "primary",
  text: "Spend a **Hope** to gain advantage on a roll to deceive someone.",
  art: ART,
  motif: "grace",
  focus: { x: 0.52, y: 0.31, scale: 0.8 },
  uses: `<span class="dh-charge">${SIGIL}</span>`,
  chits: `<div class="chits">${SIGIL}</div>`,
  code: "DH-CB 071",
  artist: "Jenny Tan",
};

const posted = await postCard(card, null, {});
const stored = posted.flags[SYSTEM_ID].card;

/* ── 1. the keys, and nothing missing behind them ────────────────────── */

for (const key of ["sigKey", "sig2Key", "fbsigKey"]) {
  assert.equal(stored[key], card[key], `${key} must travel in the flag`);
}
for (const field of ["sig", "sig2", "fbsig"]) {
  assert.equal(stored[field], undefined, `${field} is markup and must not be stored`);
}
assert.equal(stored.motif, card.motif, "the motif names its own injected rule and must travel");
assert.deepEqual(stored.focus, card.focus, "the focus point must travel, scale and all");
assert.equal(stored.art, card.art, "the painting's URL must travel");
/* The two pre-rendered readouts hold `<svg>` and so cannot be read back off
   the content; they are stored as the strings they were when the card was
   posted, which is also what a record should go on saying. */
assert.equal(stored.uses, card.uses, "the charge lights must travel");
assert.equal(stored.chits, card.chits, "the counter readout must travel");

/* ── 2. what the clean actually takes ───────────────────────────────── */

const content = posted.content;
const all = tags(content);
const gone = all.filter((node) => !ALLOWED_TAGS.has(node.tag));
assert.deepEqual(
  [...new Set(gone.map((n) => n.tag))].sort(),
  ["path", "svg"],
  "only the sigils may fail the allow-list; a new disallowed tag means a new recovery key",
);
for (const { tag, attrs } of surviving(content)) {
  for (const name of Object.keys(attrs)) {
    assert.ok(allowed(tag, name), `<${tag} ${name}> is not an attribute Foundry keeps`);
  }
}

/* ── 3. the style attribute, which survives and must stay well formed ── */

const face = surviving(content).find((n) => n.attrs.class?.includes("dh-face"));
assert.ok(face, "the posted card must be a face");
assert.match(
  face.attrs.style,
  /--dh-art:url\('[^']+'\)/,
  "`--dh-art` must be single-quoted inside a double-quoted style attribute",
);
assert.ok(
  !face.attrs.style.includes('"'),
  "a double quote inside style= ends the attribute: this is the shipped --art defect",
);
assert.ok(
  face.attrs.style.includes(ART),
  `the painting's URL must survive intact: ${face.attrs.style}`,
);
/* And the container, without which `--dh-w:100cqi` resolves to zero and the
   whole card draws nothing at all.

   Two halves, because the rule lives in a stylesheet and the class lives in
   the markup, and a card collapses if either goes missing. The markup half
   is asserted here against the posted content; the stylesheet half is read
   out of `styles/chat.css`, which is the generated copy `port-design-css.mjs`
   writes and the one Foundry actually serves — so this also catches a
   `design/chat.css` edit that was never ported. */
const host = surviving(content).find((n) => n.attrs.class === "dh-card-face");
assert.ok(host, "the face must sit in a host of its own");
const frameCss = readFileSync(new URL("../styles/frame.css", import.meta.url), "utf8");
assert.match(
  frameCss,
  /\.dh-card-face\s*\{[^}]*container-type:\s*inline-size/,
  "styles/frame.css must give .dh-card-face a container or the face collapses",
);

/* And the scanner has teeth: the form that shipped — a double-quoted `url()`
   inside a double-quoted `style` — does not read back as one attribute, which
   is the entire failure said as an assertion rather than as a comment. */
assert.throws(
  () => tags(`<div class="dh-card" style="--art:url(\"${ART}\")"></div>`),
  /attribute text no well-formed attribute claims/,
  "the old double-quoted --art must still be detectable as broken markup",
);

/* The apostrophe form, to show the escaping is doing work rather than being
   decorative: a painting whose own filename holds a `'` must come out as
   `%27` and not as the end of the url. */
const quoted = await postCard({ ...card, art: "/a/b/don't.webp" }, null, {});
const quotedFace = surviving(quoted.content).find((n) => n.attrs.class?.includes("dh-face"));
assert.ok(
  quotedFace.attrs.style.includes("--dh-art:url('/a/b/don%27t.webp')"),
  `an apostrophe in a filename must be escaped: ${quotedFace.attrs.style}`,
);

/* ── 4. the presses, and the readouts beside them ───────────────────── */

const act = { kind: "pay-cost", label: "Spend 1 Hope", said: 'say "when"', hope: 1 };
const withRow = cardWrapper({ ...card, actions: [act] });
const button = surviving(withRow).find((n) => n.tag === "button");
assert.equal(button.attrs["data-dh-act"], "card-action:0", "the action row must survive the clean");
assert.equal(button.attrs.type, "button");
/* The sentence the card was read from, as the button's tooltip — and with its
   own quotes entity-escaped rather than left to end the attribute, which is
   the same lesson one field over. */
assert.equal(button.attrs.title, "say &quot;when&quot;", "`said` must travel as an escaped title");
assert.ok(
  surviving(withRow).some((n) => n.attrs.class === "dh-card-chits"),
  "the counter readout must be drawn beside the card, not lost with the plate",
);

/* ── 5. the redraw, which is what makes all of it honest ─────────────── */

const sigils = { grace: SIGIL, codex: SIGIL, primary: SIGIL };
const redrawn = cardWrapper({
  ...stored,
  sig: sigils[stored.sigKey] ?? "",
  sig2: sigils[stored.sig2Key] ?? "",
  fbsig: sigils[stored.fbsigKey] ?? "",
});
assert.ok(
  tags(redrawn).filter((n) => n.tag === "svg").length >= 2,
  "redrawing from the flag must put the sigils back",
);
assert.ok(redrawn.includes(ART), "redrawing from the flag must put the painting back");

console.log(
  "chat card round trip: the sigils are the only tags Foundry's allow-list takes, their keys "
    + "and the motif, focus, painting and readouts all travel in the flag, every surviving "
    + "attribute is one Foundry keeps, --dh-art stays single-quoted and well formed, the host "
    + "keeps its container, and the redraw restores what the clean removed",
);
