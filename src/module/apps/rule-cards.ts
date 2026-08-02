/**
 * The rules a dialog surfaces, one line each, opening onto what is behind them.
 *
 * `rules.ts` finds every rule this character carries that mentions what you
 * are about to do and hands back three strings — a name, where it came from,
 * and the text. This file draws them.
 *
 * ── two lanes ─────────────────────────────────────────────────────────
 * A rule can be in this panel for two quite different reasons. Celestial
 * Trance *changes the rest* — it hands you a third downtime move and you have
 * to read it to use it. Deft Maneuvers says "once per rest", which means the
 * rest hands it back; there is no decision in it and nothing to apply. Both
 * mention resting, and drawing them at one weight buries the decision under
 * the receipt. So they are two lanes with two headings.
 *
 * ── one line per rule ─────────────────────────────────────────────────
 * What the lanes no longer differ in is *shape*. The bearing lane drew a full
 * tile per rule and the recharge lane drew lines, and a character three
 * sessions in has four or five rules bearing on a rest: five tiles is five
 * hundred pixels of panel under a dialog whose controls are all above it, and
 * the reader is scrolling a deck to find one name. Both lanes are lines now,
 * told apart by weight and by heading, which is what a heading is for.
 *
 * ── what a line opens is the one distinction worth drawing ────────────
 * A line has to be one gesture away from something, and which something
 * depends on whether the rule is printed on anything.
 *
 * A **class feature** — Cloaked, Sneak Attack, a knack the GM wrote last night
 * — is not. You cannot spend it, move it or lose it, the text is the whole of
 * it, and the sheet itself stopped drawing a class card for exactly this
 * reason. So the line opens the rule, and that is everything there is to open.
 *
 * A **domain card, ancestry, community or subclass** — and the weapon or
 * armour you are wearing — is a printed object, sitting in a loadout the
 * player has been looking at all session. The question the damage dialog is
 * actually asking — *is there something in my hand that gets me out of this* —
 * is a question about objects. So those lines open **the card**: the 5:7
 * playing card, `card.js`'s `CARD` and `sheet.css`'s `.pkc`, which is exactly
 * what hovering that card's spine on the character sheet gives you.
 *
 * It is the sheet's peek and not a copy of it. Same component, same layer
 * class, same geometry — right of the row, flipped when there is no room,
 * centred on the row and clamped, hover shows and click pins — because a
 * player who has learned that gesture on the sheet has learned it here. The
 * landscape tile was the wrong object twice over: it is the *handle* for a
 * card, drawn where the card itself will not fit, and this panel has room for
 * the card because it does not have to live inside the row.
 *
 * The one thing that differs is the frame. The sheet's layer is a child of the
 * window because the window is the boundary a peek must not cross; a dialog is
 * 500px of chrome floating over a board, so the frame is the **viewport** —
 * `position:fixed` on the layer, clamped against `innerWidth`/`innerHeight`.
 * That is also what takes it out of the dialog's own scroller, which is the
 * clipping problem `peek.js` was written to solve, arriving here from a
 * different direction.
 *
 * A rule whose document cannot be found back at all falls to the text side,
 * for the same reason a class feature does: inventing a card around one would
 * be claiming there is something to pick up.
 *
 * The tiles carry inline `<svg>` sigils, so nothing here may go into a
 * DialogV2's `content`: Foundry strips SVG out of that string exactly as it
 * strips it out of stored chat message content. Both callers assign the result
 * with `innerHTML` once the dialog is in the document, which is the same
 * answer `post-card.ts` reached for the same reason.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Rule } from "./rules.ts";
import { type CardContext, cardOf, loadSigils } from "../sheets/cards.ts";
import { CARD, fit, rich } from "../ui/card.js";

const esc = (s: string) => foundry.utils.escapeHTML(s);

/**
 * An attribute value, escaped — and it is `--art` that needs it.
 *
 * `art` is `--art:url("systems/…/x.webp")`, double quotes and all, and it was
 * being interpolated straight into `style="…"`. The first `"` inside the url
 * ends the attribute, the rest of the declaration is parsed as stray
 * attributes, and the tile falls back to whatever `--art` it inherits — which
 * is the sample photograph `tokens.css` ships as the default. It reads as a
 * card with the wrong picture rather than as broken markup, which is why it
 * survived: the panel looked like it was working.
 *
 * `post-card.ts` has had exactly this escaper, with exactly this note, since
 * cards were first posted to chat. This file was written later and did not
 * have it.
 */
const attr = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * The Item a rule came off, found back from what `rules.ts` recorded about it.
 *
 * `Rule` deliberately carries no document reference — it is a value, and the
 * one thing it is used for everywhere else is being printed. Rather than widen
 * that type (and make every producer of a rule answer for a document it may
 * not have), the two facts it does carry are enough to find the source again,
 * because `rulesOf` writes them from the document in the first place.
 *
 * The order matters. A subclass's source is compound and has to be tried
 * first; a domain card and a `feature` Item name *themselves* rather than
 * their source; everything else names the document it sits on.
 */
function sourceItem(actor: any, r: Rule): any {
  const items = [...(actor?.items ?? [])];

  const parts = r.source.split(" · ");
  if (parts.length === 2) {
    const sub = items.find(
      (i: any) =>
        i.type === "subclass" &&
        i.name === parts[1] &&
        (i.system?.subclassName || i.name) === parts[0],
    );
    if (sub) return sub;
  }

  const own = items.find(
    (i: any) => i.name === r.name && (i.type === "domainCard" || i.type === "feature"),
  );
  if (own) return own;

  return items.find((i: any) => i.name === r.source);
}

/** What a card needs to know that it cannot read off itself. */
const contextOf = (actor: any): CardContext => {
  const classDomains: Record<string, { primary?: string; secondary?: string }> = {};
  for (const it of [...(actor?.items ?? [])]) {
    if ((it as any).type === "class") {
      classDomains[String((it as any).name).toLowerCase()] = (it as any).system?.domains ?? {};
    }
  }
  return { domains: actor?.system?.domains, classDomains };
};

/**
 * The types whose rules are printed on something you are holding.
 *
 * The four the ask names, plus the two it did not and that belong for the same
 * reason: an equipped weapon or armour is an object with a card of its own on
 * the gear tab, and on the damage dialog it is very often *the* object — a
 * shield's "mark an Armor Slot" is the commonest way out of a hit there is.
 *
 * Not on this list, and deliberately: `class`, whose features are the case
 * that motivated the split, and `feature`, the standalone Item that has never
 * had a card at all and is drawn on the sheet as a pressable row of rules text
 * for exactly that reason.
 */
const HELD = new Set(["domainCard", "ancestry", "community", "subclass", "weapon", "armor"]);

/**
 * One row, in either lane and of either kind.
 *
 * `tabindex` because what the row holds is behind a hover, and a hover is not
 * something everybody has. It is not a control — there is nothing to press and
 * nothing happens — so it is a focus stop rather than a button.
 *
 * The right-hand cell is a count *or* a reason and never both: they answer the
 * same question, which is what this row is claiming about itself.
 */
const line = (o: {
  name: string;
  source: string;
  /** The rule, for a row that has no card to open. */
  text?: string;
  /** The peek key, for a row that has. Exactly one of the two. */
  peek?: string;
  note?: string;
  uses?: string;
}): string => `<div class="ln" tabindex="0"${o.peek ? ` data-peek="${o.peek}"` : ""}>
  <span class="hd"><b>${esc(o.name)}</b><em>${esc(o.source)}</em>${
    o.note
      ? `<s class="wh">${esc(o.note)}</s>`
      : o.uses
        ? `<s>${esc(o.uses)}</s>`
        : ""
  }</span>
  ${o.peek ? "" : `<p>${rich(o.text ?? "")}</p>`}
</div>`;

export interface RuleCard {
  rule: Rule;
  /**
   * Why this one is in the list, when the answer is not simply "it mentions
   * what you are doing" — today, the card that granted an extra downtime
   * move. Drawn in the row's right-hand cell rather than on the card, because
   * it is the dialog's note about the card and not anything the card says.
   */
  note?: string;
}

/** One line in the other lane: something the rest simply gives back. */
export interface RefreshRow {
  name: string;
  /** Where it came from — "Loadout", "Beastbound · Foundation". */
  source: string;
  /** The rule, held back behind a hover because it is not why this is here. */
  text: string;
  /** "1 / 2", when the sheet is actually tracking a use pool. */
  uses?: string;
  /** The owned Item this row came from, when there is one. */
  itemId?: string;
}

export interface RefreshLane {
  heading: string;
  rows: RefreshRow[];
}

/**
 * The panel, cards where there are cards and prose where there are not.
 *
 * Async only because the sigils are: `loadSigils` fetches twenty-five SVGs
 * once per session and caches them, so this is a round trip on the first
 * dialog of a session and free thereafter.
 *
 * @returns the whole `.rl` panel, or an empty string when there is nothing to
 * say — which is the common case at level 1 and should cost no furniture.
 */
export async function ruleCardsPanel(
  actor: any,
  entries: RuleCard[],
  heading: string,
  refresh?: RefreshLane,
): Promise<string> {
  const lane = refresh?.rows.length ? refresh : null;
  if (!entries.length && !lane) return "";
  const sig = await loadSigils();
  const ctx = contextOf(actor);

  /* The cards, rendered once into the layer rather than on demand — which is
     `peek.js`'s reason and it applies here twice over: `fit()` has to measure
     them, and it can only measure a card that is in the document. They are
     parked with `visibility`, not `display`, or it would measure them at zero
     height and every peek would render uncompacted. */
  const cards: string[] = [];

  /** Turn an owned, printed Item into the same full-card peek used above. */
  const peekFor = (it: any): string | undefined => {
    const held = it && HELD.has(it.type) ? it : null;
    const card = held ? cardOf(held as any, sig, ctx) : null;
    if (!card) return undefined;

    const key = `p${cards.length}`;
    cards.push(
      `<div class="pkc${card.noart ? " noart" : ""}" data-peek="${key}" style="${attr(
        card.art ?? "",
      )}">${CARD(card)}</div>`,
    );
    return key;
  };

  const body = entries
    .map(({ rule, note }) => {
      const it = sourceItem(actor, rule);
      const peek = peekFor(it);
      if (!peek) return line({ ...rule, note });

      /* Drawn exactly as the sheet draws it, including the features this rule
         is not. The row already says which rule matched; the card's claim is
         *this is the object it is printed on*, and an ancestry card with one
         of its two features quietly removed is no longer that object. */
      return line({ ...rule, note, peek });
    })
    .join("");

  const lanes = lane
    ? `<div class="rf"><div class="k">${esc(lane.heading)}</div>${lane.rows
        .map((r) => {
          const it = r.itemId
            ? [...(actor?.items ?? [])].find((item: any) => item.id === r.itemId)
            : sourceItem(actor, r);
          return line({ ...r, peek: peekFor(it) });
        })
        .join("")}</div>`
    : "";

  const layer = cards.length ? `<div class="peeklayer">${cards.join("")}</div>` : "";

  return `<div class="rl"><div class="k">${esc(heading)}</div>${body}${lanes}${layer}</div>`;
}

/**
 * The peek, wired against the viewport.
 *
 * `peek.js` does this for the sheet and is not reusable here, for one reason
 * that is structural rather than stylistic: it positions and clamps against
 * the sheet window, which is the boundary a peek on a sheet must not cross.
 * A dialog is 500px of chrome floating over a board — a card clamped inside
 * *that* would have nowhere to go — so the frame is the viewport, the layer is
 * `position:fixed`, and the same arithmetic runs against `innerWidth` and
 * `innerHeight`. Everything a player has learned about the gesture holds:
 * right of the row, flipped when there is no room, centred and clamped, hover
 * shows and click pins.
 *
 * Called from `wire`, because a card carries inline `<svg>` and DialogV2
 * strips that out of `content` — so the panel is not in the document until
 * then, and neither `fit()` nor a `getBoundingClientRect` would have anything
 * to measure.
 */
export function wireRulePeeks(root: HTMLElement): void {
  const layer = root.querySelector<HTMLElement>(".rl .peeklayer");
  if (!layer) return;

  /* Onto <body>, and it is not optional. `position:fixed` was the obvious
     answer and it does not work: Foundry gives every `.window-content` a
     `backdrop-filter`, and a filtered element is the containing block for its
     fixed descendants — so a layer that says `fixed` inside a dialog is still
     framed by the dialog, and the card flies to coordinates that were right
     for a frame it does not have. The host carries `dh` for the palette; the
     layer stays a descendant of it, so every rule `sheet.css` writes for
     `.peeklayer` and `.pkc` lands untouched. */
  const host = document.createElement("div");
  host.className = "dh peekhost";
  host.append(layer);
  document.body.append(host);

  /* The host outlives the dialog unless something takes it away, and nothing
     will: it is not a child of the window Foundry removes. Watching `body`
     for that removal is cheaper than a close hook and does not care which of
     the several ways out the user took. */
  const gone = new MutationObserver(() => {
    if (root.isConnected) return;
    host.remove();
    gone.disconnect();
  });
  gone.observe(document.body, { childList: true, subtree: true });

  /* Fonts first: `fit` measures wrapped text, and metrics taken against a
     fallback face are wrong by enough to cost a line. `fit` is idempotent, so
     the immediate call is the one that matters and the second only corrects
     it — a dialog opened before the face has loaded still lands compacted. */
  fit(layer);
  document.fonts?.ready.then(() => fit(layer));

  /** Space kept from the row, and from the edges of the screen. */
  const GAP = 14;
  const EDGE = 12;

  let open: HTMLElement | null = null;
  let pinned = false;

  const cardFor = (row: HTMLElement) =>
    layer.querySelector<HTMLElement>(`.pkc[data-peek="${row.dataset.peek}"]`);

  /* Only `close(true)` clears a pin, so pointer traffic cannot dismiss one. */
  const close = (force?: boolean): void => {
    if (pinned && !force) return;
    open?.classList.remove("on", "pin");
    open = null;
    pinned = false;
  };

  const show = (row: HTMLElement, pin?: boolean): void => {
    const card = cardFor(row);
    if (!card) return;
    if (card === open) {
      if (pin) {
        pinned = true;
        card.classList.add("pin");
      }
      return;
    }
    close(true);

    const r = row.getBoundingClientRect();
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Right of the row by default, flipped rather than squeezed.
    let left = r.right + GAP;
    let side = "left";
    if (left + w > vw - EDGE) {
      left = r.left - GAP - w;
      side = "right";
    }
    if (left < EDGE) {
      left = Math.max(EDGE, (vw - w) / 2);
      side = "center";
    }

    // Centred on its row, then clamped: a card half off the top of the screen
    // is worse than one not quite level with the row it came from.
    const mid = r.top + r.height / 2 - h / 2;
    const top = Math.min(Math.max(EDGE, mid), Math.max(EDGE, vh - h - EDGE));

    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
    // Grows out of the row it belongs to, so the flip reads as a flip.
    card.style.transformOrigin = side === "center" ? "center center" : `${side} center`;
    card.classList.add("on");
    if (pin) card.classList.add("pin");
    open = card;
    pinned = !!pin;
  };

  /* Delegated, and `pointerover` rather than `pointerenter`, because only a
     delegating listener can be one listener. The layer is
     `pointer-events:none`, so moving onto anything that is not a row closes. */
  root.addEventListener("pointerover", (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const row = t.closest<HTMLElement>(".rl .ln[data-peek]");
    if (row) show(row);
    else close();
  });

  /* Hover shows, click pins. A hover peek dies the moment you move toward it,
     which is fine for "which card is this" and useless for "read this card" —
     and reading it is the entire reason the panel exists. Clicking the pinned
     row again unpins; clicking anywhere else in the dialog closes, so a card
     cannot sit over the stepper you just reached for. */
  root.addEventListener("click", (e) => {
    const t = e.target instanceof Element ? e.target : null;
    const row = t?.closest<HTMLElement>(".rl .ln[data-peek]");
    if (!row) {
      close(true);
      return;
    }
    if (pinned && cardFor(row) === open) close(true);
    else show(row, true);
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      close(true);
    }
  });
  // A scroll under an open peek leaves it pointing at the wrong row.
  root.addEventListener("scroll", () => close(true), true);
  window.addEventListener("resize", () => close(true));
}

/**
 * One list, with the granting cards named first and never twice.
 *
 * The rest dialog has two overlapping questions about the same shelf of cards
 * — "what changes how many moves I get" and "what mentions resting at all" —
 * and Celestial Trance is the answer to both. Two panels would draw it twice;
 * one panel with a note on the one that matters draws it once and says which.
 */
export function merge(primary: RuleCard[], rest: Rule[]): RuleCard[] {
  const seen = new Set(primary.map((e) => `${e.rule.source} ${e.rule.name}`));
  return [
    ...primary,
    ...rest.filter((r) => !seen.has(`${r.source} ${r.name}`)).map((rule) => ({ rule })),
  ];
}
