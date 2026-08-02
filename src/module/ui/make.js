/* Vendored from design/make.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/make.js and re-run `node scripts/port-design-js.mjs`. */
/* ══════════════════════════════════════════════════════════════════
   MAKING A CHARACTER — the parts that are not markup

   Most of this window is layout, and layout belongs in the component that
   draws it. Three things do not, and they are here for the reason every
   other module in `design/` is: they are pure functions from data to
   markup or to a DOM diff, they encode a decision that would be re-derived
   subtly differently the second time, and the study page has to be able to
   exercise them without a game running.
   ══════════════════════════════════════════════════════════════════ */

/* ── the rail's numbers ────────────────────────────────────────────
   A value with nothing behind it yet is an **em dash**, not a zero.

   That distinction is the whole reason this is a function rather than a
   template. Zero is a number some rule produced; the dash is the absence of
   the rule. A character with no class does not have Evasion 0 — Evasion is
   not yet decided, and a rail that says 0 is asserting something false about
   a number the player is three seconds away from setting. It is the same
   argument the adversary's `thresholds.none` makes: an absent threshold is
   not a zero one. */

export const DASH = "—";

export const VAL = ({ k, v, sub = "" }) => `
  <div class="fval${v === null || v === undefined ? " none" : ""}" data-k="${k}">
    <k>${k}${sub ? ` <em>${sub}</em>` : ""}</k>
    <b>${v === null || v === undefined ? DASH : v}</b>
  </div>`;

export const VALS = (rows) =>
  rows
    .map((r) => (r.head ? `<s>${r.head}</s>` : VAL(r)))
    .join("");

/**
 * Write new values into a rail that is already drawn, and light **only what
 * moved**.
 *
 * This is `setMarks`'s job, for the same reason `setMarks` exists. Re-rendering
 * the block would replace every element, so every value would animate on every
 * change — choose a community and watch Evasion, Hit Points, Stress, Hope,
 * both thresholds and Proficiency all flash at you, of which exactly none had
 * anything to do with what you just did. The animation means "this is what
 * that choice did", and it only means that if it fires on the ones that did.
 *
 * The text is written **before** the class is added, so an element that never
 * runs the animation is holding the settled number rather than travelling to
 * it — the rule every arrival in this system keeps, and the reason a re-render
 * mid-flight cannot strand a value.
 *
 * `.land` is removed on the way in so a value that changes twice in quick
 * succession restarts rather than being ignored: the class is what the
 * animation is bound to, and re-adding a class that is already there does
 * nothing at all.
 */
export function setVals(root, rows) {
  for (const r of rows) {
    if (r.head) continue;
    const el = root.querySelector(`.fval[data-k="${CSS.escape(r.k)}"]`);
    if (!el) continue;

    const b = el.querySelector("b");
    const next = r.v === null || r.v === undefined ? DASH : String(r.v);
    if (!b || b.textContent === next) continue;

    b.textContent = next;
    el.classList.toggle("none", next === DASH);
    el.classList.remove("land");
    // Forced reflow, and it is load-bearing: without it the browser coalesces
    // the remove and the add into no change at all and the animation is
    // skipped. One read of one element, on a row that just changed.
    void el.offsetWidth;
    el.classList.add("land");
  }
}

/* ── one option ────────────────────────────────────────────────────
   A class, an ancestry, a community, a weapon, a card.

   `why` is the thing worth pointing at. An option you may not take stays on
   screen and says why on itself — "Blade · not one of your domains" — which
   is `dlg.css`'s dead-not-hidden rule doing more work than it does there. In
   the damage dialog the greyed trait is one of six you can see the rest of;
   here, filtering the illegal cards out of a domain deck would leave a deck
   that looks complete, and the player would never learn that the rule exists.
   A deck with them present and captioned is the rule being taught. */

export const OPT = ({ name, meta = "", text = "", nums = [], why = "", on = false }) => `
  <button type="button" class="fopt${on ? " on" : ""}"${why ? " disabled" : ""}>
    ${meta ? `<s>${meta}</s>` : ""}
    <b>${name}</b>
    ${nums.length ? `<div class="fnum">${nums.map((n) => `<i>${n.k} <b>${n.v}</b></i>`).join("")}</div>` : ""}
    ${text ? `<p>${text}</p>` : ""}
    ${why ? `<div class="fwhy">${why}</div>` : ""}
  </button>`;

/* ── the trait spread ──────────────────────────────────────────────
   Six chips and six plates.

   The chips are **positional**, not valued: two of them read +1 and two read
   0, so "the +1 chip" is not a thing that exists and every chip carries its
   index instead. Keying them by value would make placing the second +1
   indistinguishable from moving the first, and taking one back would have no
   way to know which hole it came out of.

   A spent chip keeps its slot as a hole rather than closing the row up. The
   budget is six objects and its *shape* is the information — a row with two
   gaps on the left tells you what you have spent without you having to count
   what is left. A row that reflows on every placement tells you nothing and
   moves the chip you were about to click. */

export const TRAY = (chips) => `
  <div class="ftray">
    <s>spread</s>
    ${chips
      .map(
        (c, i) =>
          `<button type="button" class="fchip${c.spent ? " spent" : ""}${c.armed ? " armed" : ""}"
             data-i="${i}"${c.spent ? " disabled" : ""} draggable="${!c.spent}">${sign(c.v)}</button>`,
      )
      .join("")}
  </div>`;

export const TRAIT = ({ key, label, verbs = [], v = null, open = false }) => `
  <button type="button" class="ftrt${v === null ? " empty" : ""}${open ? " open" : ""}"
    data-t="${key}">
    <b>${v === null ? DASH : sign(v)}</b>
    <span><k>${label}</k><em>${verbs.join(", ")}</em></span>
  </button>`;

/**
 * A modifier as the sheet writes one: `+2`, `0`, `−1`.
 *
 * The minus is U+2212, not a hyphen, which is the same choice every other
 * number on this sheet makes — a hyphen at display weight next to a tabular
 * numeral is visibly too short and sits too high. Zero is bare: `+0` claims
 * a bonus and there is not one.
 */
export const sign = (n) => (n < 0 ? `−${Math.abs(n)}` : n > 0 ? `+${n}` : "0");

/**
 * Level the art plates across a grid of cards.
 *
 * `fit()` sizes each card on its own, and it is right to: the plate gives up
 * height first, so a card with a long rule keeps its prose readable by
 * cropping its picture. That is exactly what you want when you are looking at
 * one card. It is not what you want when you are looking at eighteen at once
 * — the ancestries laid out in a grid had their pictures ending at eight
 * different heights across a row, and a picture line that wanders reads as
 * broken rather than as adaptive.
 *
 * So each grid takes its *smallest* plate. Smallest and not average or
 * largest, because every other value is one a card already proved it did not
 * need: shrinking a plate only ever hands prose more room than `fit()`
 * decided it wanted, and can therefore never cause an overflow. Growing one
 * could.
 *
 * Run after `fit()`, never instead of it. `fit()` resets `--plate` to its
 * maximum at the top of every pass, so this cannot ratchet down over repeated
 * runs — each pass solves from scratch and is levelled once. The value it
 * chose is on `dataset.plate`, which is read here rather than the computed
 * style so a levelled card reports what it *needs* and not what it was given.
 */
export function levelPlates(root = document) {
  for (const grid of root.querySelectorAll(".fcards")) {
    const cards = [...grid.querySelectorAll(".card")];
    if (cards.length < 2) continue;
    let min = Infinity;
    for (const c of cards) {
      const v = parseFloat(c.dataset.plate);
      if (Number.isFinite(v)) min = Math.min(min, v);
    }
    if (!Number.isFinite(min)) continue;
    for (const c of cards) c.style.setProperty("--plate", min.toFixed(2) + "%");
  }
}

/* ── the plate on the sheet ────────────────────────────────────────
   Two states, one element. See the note at the foot of make.css for why it
   does not vanish when it is finished. */

export const PLATE = ({ done, of, at, label, hint }) => `
  <button type="button" class="mkp${done ? " done" : ""}">
    <span>
      <b>${label}</b>
      ${hint ? `<em>${hint}</em>` : ""}
    </span>
    ${done ? "" : `<div class="fbar"><u style="width:${Math.round((at / Math.max(1, of)) * 100)}%"></u></div>`}
  </button>`;
