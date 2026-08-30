/**
 * A card, in the chat log.
 *
 * "What does this card say?" is a table question, not a private one — the
 * answer is the same paragraph everyone at the table is about to argue over.
 * Showing it means posting the card, and the card is a thing this system
 * already knows how to draw.
 *
 * So this takes the *same option object* the sheet built for the row and the
 * peek and hands it to the same `CARD` builder. Nothing here re-derives
 * anything from the Item. A card in chat that disagreed with the card on the
 * sheet would be a worse bug than not having one, and the only way to
 * guarantee it cannot is to have one source and no second path to it.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  CONDITIONS, SYSTEM_ID, TRAITS, isMarkedDomain, markedSpellcast, traitLabel, type Trait,
} from "../config.ts";
import { CARD } from "../ui/card.js";
import { isFree, type CardOptions, type Price } from "./cards.ts";

export interface CardAction {
  kind:
    | "pay-cost"
    | "gain"
    | "clear"
    | "move-resource"
    | "die-pool"
    | "refresh"
    | "use-item"
    | "roll-damage"
    | "roll-card-damage"
    | "roll-trait"
    | "roll-dice"
    | "apply-condition"
    | "grant-effect"
    | "mark-use";
  label: string;
  /**
   * The words this was read from, carried onto the message.
   *
   * A posted card is a record, and three hours later "why did that button
   * take a Stress" is a question only the card's own sentence answers. It is
   * the action's tooltip on the plate and it costs one string.
   */
  said?: string;
  /** `gain` / `clear`: a Hit Point, which `pay-cost` never needed. */
  hitPoints?: number;
  /** `die-pool`: what the press does. See `DIE_POOL_OPS`. */
  op?: string;
  /** `refresh` / `die-pool` / `move-resource`: the pool's printed name. */
  resource?: string;
  /** `roll-dice`: the formula, which is never damage. */
  formula?: string;
  /** `apply-condition`: an id out of `CONDITIONS`. */
  condition?: string;
  /** `apply-condition` / `grant-effect`: self, or whoever is selected. */
  subject?: string;
  /** `grant-effect`: the ActiveEffect to create. */
  effect?: { name: string; duration: string; modifiers: any[] };
  /** A chain, run in order and aborted whole if a link refuses. */
  steps?: CardAction[];
  /** `mark-use` only: how much Mark this press costs. 3 on the two level 10s. */
  mark?: number;
  hope?: number;
  stress?: number;
  armor?: number;
  fear?: number;
  itemId?: string;
  resourceIndex?: number;
  by?: number;
  weaponId?: string;
  /** `roll-trait` only: which of the six, already resolved off the card. */
  trait?: Trait;
  /** `roll-trait` only: a Difficulty the card *printed*, or null for none. */
  dc?: number | null;
  /** `roll-card-damage` only: the expression, already resolved. */
  count?: number;
  die?: string;
  bonus?: number;
  damageType?: string;
  /** `roll-card-damage` only: what the damage plate is named after. */
  damageName?: string;
}

export interface PostCardOptions {
  /**
   * Which feature block is being posted, by its printed name.
   *
   * A card posted from the Features panel is one *rule* off a document that
   * has several, and its buttons are that rule's — a class row for Cloaked
   * must not carry Sneak Attack's press. Blank means the whole document,
   * which is what every other caller means.
   */
  feature?: string;
  /** Exact price of a feature row. Omit to infer it from a single-rule card. */
  price?: Price;
  /** Only the counters owned by the posted feature. Omit for the whole Item. */
  resourceIndexes?: number[];
}

/**
 * The wrapper's two facts: whether there is artwork, and where it is.
 *
 * Kept as a pair because the render side has to restate both — see
 * `dice/chat.ts`. `--art` holds a `url("…")` with double quotes in it, which
 * is why the attribute is escaped rather than interpolated: unescaped, the
 * first `"` inside the url ends the `style=` attribute, the rest of the
 * declaration becomes stray attributes, and the card silently falls back to
 * the sample photograph `tokens.css` ships as the default `--art`. It looks
 * like the wrong picture, not like broken markup.
 */
export const wrapperClass = (card: CardOptions): string =>
  `dh dh-card${card.noart ? " noart" : ""}`;

const attr = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** The wrapper both halves of this file have to agree on. */
/**
 * The wrapper both halves of this file have to agree on.
 *
 * `said` becomes the button's `title`, which is the cheapest useful place it
 * could go: three hours later "why did that button take a Stress" is a
 * question only the card's own sentence answers, and the alternative is
 * scrolling back to the card and reading the paragraph again. It is a plain
 * attribute rather than anything drawn, because the row is already the
 * narrowest thing on a 300px plate.
 */
const actionRow = (actions?: CardAction[]): string =>
  !actions?.length
    ? ""
    : `<div class="pl-act card-actions">${actions.map((a, i) =>
        `<button type="button" class="pl-b" data-dh-act="card-action:${i}"` +
        `${a.said ? ` title="${attr(a.said)}"` : ""}><i></i>${attr(a.label)}</button>`,
      ).join("")}</div>`;

export const cardWrapper = (card: CardOptions & { actions?: CardAction[] }): string =>
  `<div class="${wrapperClass(card)}" style="${attr(card.art ?? "")}">` +
  `${CARD(card)}${actionRow(card.actions)}</div>`;

/**
 * The card's prose, in the blocks it is printed in.
 *
 * Everything below reads *both* `text` and `feats`, and that is a fix rather
 * than a flourish. The damage sniff this replaces read `card.text` alone — so
 * a subclass, a class, an ancestry, a community and a transformation, every
 * subtype whose rules live in feature blocks and whose `text` is empty, could
 * never get a damage button at all. It looked like those cards simply had no
 * damage on them.
 *
 * `n` is the prefix a label wears, and it follows `addPrice`'s rule exactly:
 * a feature block is named only when there is more than one of them, because
 * one block's name is the card's name and the card is already on screen. The
 * `text` block never carries one for the same reason.
 *
 * Both strings arrive from `cardOf` already through `plain`, which is why the
 * patterns below are written against markdown emphasis — `**`, `_`, `•`,
 * `<br>` — rather than against markup.
 */
const blocks = (card: CardOptions): { n: string; t: string }[] => {
  const feats = card.feats ?? [];
  return [
    ...(card.text ? [{ n: "", t: card.text }] : []),
    ...feats.map((f) => ({ n: feats.length > 1 ? f.n : "", t: f.t })),
  ];
};

/* ── the roll a card asks for ──────────────────────────────────────────
   The pattern that found one has moved to `sheets/suggest.ts`; what stays here
   is the half that cannot: resolving `spellcast` against a character, which is
   the one place the campaign frame's own override is honest. A button on the
   card is the object naming the trait being the object pressed, and the player
   is looking straight at it — reading `spellcastTrait` anywhere else would be
   a campaign rule reaching into the roll engine with nothing on screen to say
   why. See "A card that asks for a roll" in CLAUDE.md. */

/**
 * Which of the six a call resolves to, or nothing at all.
 *
 * Five of the six are themselves. "Spellcast" is a *pointer* — the same
 * pointer the arcane-frame wheelchair carries and the same one a counter's
 * ceiling carries — and it is resolved against the character, because that is
 * the only place the answer exists.
 *
 * **Except on a Root or Void card, and this is the one place the campaign
 * frame's override is honest.** `marked.ts` states the rule and refuses to
 * substitute it, because swapping the trait under a roll a player started from
 * a trait plate would be a campaign rule reaching into the roll engine and
 * nothing on screen would say why. A button *on the card* is the other
 * situation entirely: the object naming the trait is the object being pressed,
 * the player is looking straight at it, and reading `spellcastTrait` there
 * would be this file quietly overruling the card in the reader's hand.
 *
 * With no Spellcast trait and no mark, there is **no button** rather than a
 * button on a trait we picked. A character with no spellcasting subclass
 * holding a card that calls for a Spellcast Roll is a table conversation, and
 * a row that answered it by rolling Finesse would be a worse answer than
 * silence.
 */
const traitOf = (word: string, actor: any, item: any): Trait | undefined => {
  if (word !== "spellcast") return word as Trait;
  const mark = markedSpellcast(item?.system?.domain);
  const trait = mark ?? actor?.system?.spellcastTrait;
  return (TRAITS as readonly string[]).includes(String(trait)) ? (trait as Trait) : undefined;
};

/** What the card called it, which is not always what is being rolled. */
const rollLabel = (word: string): string =>
  `${word === "spellcast" ? "Spellcast" : traitLabel(word as Trait)} Roll`;

/** "Roll 3d6+2" — and the dice are the point. See the damage block below. */
const damageLabel = (name: string, count: number, die: string, bonus: number): string =>
  `${name ? `${name} · ` : ""}Roll ${count}${die}${bonus > 0 ? `+${bonus}` : bonus < 0 ? `${bonus}` : ""}`;

const costLabel = (p: Price): string => [
  p.hope && `Spend ${p.hope} Hope`,
  p.stress && `Mark ${p.stress} Stress`,
  p.armor && `Mark ${p.armor} Armor Slot${p.armor === 1 ? "" : "s"}`,
  p.fear && `Spend ${p.fear} Fear`,
].filter(Boolean).join(" · ");

/**
 * The weapon a "Roll damage" press throws, when the card is not itself one.
 *
 * Primary first, then anything equipped. Lifted out of `actionsFor` when the
 * authored path arrived, because two copies of "which weapon did they mean"
 * is two answers the first time somebody equips a second one.
 */
const equippedWeapon = (actor: any, item: any): any =>
  item?.type === "weapon"
    ? item
    : actor?.items?.find?.(
        (it: any) => it.type === "weapon" && it.system?.equipped && it.system?.slot === "primary",
      ) ?? actor?.items?.find?.((it: any) => it.type === "weapon" && it.system?.equipped);

/**
 * One printed damage expression as a press.
 *
 * `proficiency` is resolved here rather than at the click, and the reason is
 * the label: a button reading "Roll 3d8+2" that threw a different number of
 * dice would be worse than no label at all. The Proficiency in it is the one
 * this character had when the card was posted, which is what the card said
 * when it was posted.
 *
 * **No critical.** A weapon's damage button is reached from the attack plate
 * that produced it and knows whether it critted; a posted card is a card, and
 * there is no honest link from it to a roll — the player may have posted it
 * before rolling, after rolling, or to argue about what it says.
 */
function cardDamageAction(
  d: any,
  actor: any,
  card: CardOptions,
  labelPrefix = "",
): CardAction {
  const count = Math.max(1, Number(d.count) || 1) *
    (d.proficiency ? Math.max(1, Number(actor?.system?.proficiency) || 1) : 1);
  const bonus = Number(d.bonus) || 0;
  const mode = String(d.name ?? "");
  return {
    kind: "roll-card-damage",
    label: `${labelPrefix}${damageLabel(mode, count, String(d.dice || "d6"), bonus)}`,
    damageName: mode ? `${card.name} · ${mode}` : card.name,
    count,
    die: String(d.dice || "d6"),
    bonus,
    // Direct rides in the type, as it does on an adversary's attack, because
    // `apps/damage.ts` reads it back off the same string. Save-for-half does
    // not travel at all — halving is the *target's* outcome, decided against
    // thresholds this side of the exchange does not own.
    damageType: `${d.direct ? "direct " : ""}${String(d.type || "physical")}`,
  };
}

/**
 * The two presses that are the system's rather than the card's.
 *
 * `mark-use` is *The Twilight Marked*'s toll — a rule of the campaign frame,
 * not a sentence printed on Rune Ward — and it goes to the **head** of the row
 * because it is the one action there that is not optional: using a Root or
 * Void card gains a Mark whether you like it or not. `use-item` is a
 * consumable's quantity, which is a fact about the object rather than about
 * its rules text.
 *
 * Neither is something a reader annotating a card should have to remember to
 * write down, which is why both survive the authored path.
 */
function appendStructural(out: CardAction[], item: any, card: CardOptions): void {
  if (item && ["consumable", "loot"].includes(item.type) && Number(item.system?.quantity) > 0) {
    out.push({ kind: "use-item", label: `Use ${item.name}`, itemId: item.id });
  }
  if (item?.type === "domainCard" && isMarkedDomain(item.system?.domain)) {
    /* The two level 10 cards buy an extra action and cost 3, and it is read
       off the text rather than listed because the cards say it in the words
       the frame uses — a second list of two names is a second thing to keep
       true. This is the one prose read that survives, and it survives because
       its subject is the frame rather than the card. */
    const mark = /gain \*\*?3 Mark/i.test(String(card.text ?? "")) ? 3 : 1;
    out.unshift({ kind: "mark-use", label: mark === 1 ? "Use · Mark" : `Use · ${mark} Mark`, mark });
  }
}

/* ── authored actions ─────────────────────────────────────────────────────
   What the document says it asks of you, read once by somebody and written
   down. See `ACTION_KINDS` in `config.ts` for why this exists and
   `card-actions.mjs` for the reading itself.

   This function's whole job is **resolution**: an authored action names things
   in the card's own vocabulary — a counter by its printed name, a trait that
   might be the `spellcast` pointer, a damage mode by which of the card's
   expressions it is — and a posted card has to carry answers rather than
   names, because the message is a record and the character it was resolved
   against may have changed by the time somebody presses the button.

   Which is the same reason the label is written here and not at the press:
   a button reading "Roll 3d8+2" that rolled a different number of dice would
   be worse than no label at all.

   **Two actions stay automatic even on an annotated document**, and both are
   structural rather than printed. `use-item` is about a consumable's quantity
   and `mark-use` is *The Twilight Marked*'s toll, which is a rule of the
   frame rather than a sentence on the card — no reader annotating Rune Ward
   should have to remember to write down that Root and Void cards cost a Mark.
   Everything else an annotated document offers is what its entry says and
   nothing more, so a card cannot carry a counter button its reader did not
   put there. */

/** Which feature blocks a post is *about*. Blank means the whole document. */
const authoredBlocks = (item: any, feature?: string): any[] => {
  const s = item?.system ?? {};
  const all = [
    ...(s.classFeatures ?? []),
    s.hopeFeature,
    ...(s.features ?? []),
    s.topFeature,
    s.bottomFeature,
    s.feature,
  ].filter(Boolean);
  return feature ? all.filter((b: any) => b.name === feature) : all;
};

/**
 * Every authored action a post should carry, document-level and block-level.
 *
 * A post *about one feature* takes that block's alone — a class row for
 * Cloaked must not carry Sneak Attack's press — and a post about the whole
 * document takes its own plus every block's, which is what a domain card with
 * one rule and a subclass card with three both need.
 */
const authoredActions = (item: any, feature?: string): { action: any; from: string }[] => {
  if (!item) return [];
  const blocks = authoredBlocks(item, feature)
    .flatMap((b: any) => (b.actions ?? []).map((action: any) => ({ action, from: b.name ?? "" })));
  // A feature post is that feature's, full stop: the document's own actions
  // belong to its own rules text, which is not what is being posted.
  if (feature) return blocks;
  return [
    ...((item.system?.actions ?? []) as any[]).map((action) => ({ action, from: "" })),
    ...blocks,
  ];
};

/** A counter or die pool's index, by the name the card prints on it. */
const poolIndex = (list: any[], name: string): number =>
  list.findIndex((r: any) => String(r?.name ?? "").toLowerCase() === name.toLowerCase());

const AMOUNT_WORDS: Array<[string, string]> = [
  ["hope", "Hope"],
  ["stress", "Stress"],
  ["hitPoints", "Hit Point"],
  ["armorSlots", "Armor Slot"],
  ["fear", "Fear"],
];

/** "2 Hope · 1 Stress", pluralised, in the order the sheet's rail draws them. */
const amountLabel = (amount: any): string =>
  AMOUNT_WORDS.filter(([key]) => Number(amount?.[key]) > 0)
    .map(([key, word]) => {
      const n = Number(amount[key]);
      return `${n} ${word}${n === 1 || word === "Hope" || word === "Stress" || word === "Fear" ? "" : "s"}`;
    })
    .join(" · ");

/**
 * One authored action, resolved against this character, or nothing.
 *
 * Returning null is a real answer and not a failure: a `roll-trait` whose
 * `spellcast` pointer resolves to nothing on a character with no spellcasting
 * subclass emits **no button**, because a row that answered it by rolling
 * Finesse would be a worse answer than silence. A `roll-card-damage` naming a
 * mode the document does not print is the same shape — the annotation and the
 * card have drifted, and a button is not the place to say so.
 */
function resolveAction(
  a: any,
  actor: any,
  item: any,
  card: CardOptions,
  from: string,
): CardAction | null {
  const prefix = from ? `${from} · ` : "";
  const when = a.when ? `${a.when} · ` : "";
  const named = (derived: string): string => a.label || `${prefix}${when}${derived}`;
  const base = { said: a.said || undefined, subject: a.subject || "self" };

  switch (a.kind) {
    case "pay": {
      const amount = a.amount ?? {};
      return {
        ...base,
        kind: "pay-cost",
        label: named(`Spend ${amountLabel(amount) || "nothing"}`),
        hope: Number(amount.hope) || 0,
        stress: Number(amount.stress) || 0,
        armor: Number(amount.armorSlots) || 0,
        hitPoints: Number(amount.hitPoints) || 0,
        fear: Number(amount.fear) || 0,
      };
    }
    case "gain":
    case "clear": {
      const amount = a.amount ?? {};
      const words = amountLabel(amount);
      if (!words) return null;
      return {
        ...base,
        kind: a.kind,
        label: named(`${a.kind === "gain" ? "Gain" : "Clear"} ${words}`),
        hope: Number(amount.hope) || 0,
        stress: Number(amount.stress) || 0,
        armor: Number(amount.armorSlots) || 0,
        hitPoints: Number(amount.hitPoints) || 0,
        fear: Number(amount.fear) || 0,
      };
    }
    case "move-resource": {
      /* The name is resolved to an index here rather than at the press,
         because a player may rename their own counter between the post and
         the click and the message is a record of what was offered. This is
         also what retired the last small parser in this file: the sign used
         to be decided by testing the counter's *name* against `/^uses?$/i`,
         which is a guess about English on data whose author already knew the
         answer. */
      const index = poolIndex(item?.system?.resources ?? [], a.resource || "");
      if (index < 0) return null;
      const by = Number(a.by) || 0;
      const name = String(a.resource).replace(/s$/i, "");
      return {
        ...base,
        kind: "move-resource",
        label: named(by < 0 ? `Spend ${name}` : `Mark ${name}`),
        itemId: item.id,
        resource: a.resource,
        resourceIndex: index,
        by,
      };
    }
    case "die-pool": {
      const index = poolIndex(item?.system?.dice ?? [], a.resource || "");
      if (index < 0) return null;
      const name = String(a.resource);
      const verb: Record<string, string> = {
        place: `Place a ${name}`,
        roll: `Roll a ${name}`,
        spend: `Spend a ${name}`,
        step: `Step the ${name} up`,
        clear: `Clear the ${name}`,
      };
      return {
        ...base,
        kind: "die-pool",
        label: named(verb[a.op] ?? `Use the ${name}`),
        itemId: item.id,
        resource: a.resource,
        resourceIndex: index,
        op: String(a.op || "place"),
      };
    }
    case "refresh":
      if (!a.resource) return null;
      return {
        ...base,
        kind: "refresh",
        label: named(`Refill ${a.resource}`),
        itemId: item?.id,
        resource: a.resource,
      };
    case "roll-trait": {
      const trait = traitOf(String(a.trait || ""), actor, item);
      if (!trait) return null;
      return {
        ...base,
        kind: "roll-trait",
        label: named(rollLabel(String(a.trait))),
        trait,
        dc: Number(a.dc) > 0 ? Number(a.dc) : null,
      };
    }
    case "roll-damage": {
      const weapon = equippedWeapon(actor, item);
      return { ...base, kind: "roll-damage", label: named("Roll damage"), weaponId: weapon?.id };
    }
    case "roll-card-damage": {
      const printed = ((item?.system?.cardDamage ?? []) as any[])
        .find((d) => String(d.name ?? "") === String(a.damageName ?? ""));
      if (!printed) return null;
      return cardDamageAction(printed, actor, card, a.label || `${prefix}${when}`);
    }
    case "roll-dice":
      if (!a.formula) return null;
      return { ...base, kind: "roll-dice", label: named(`Roll ${a.formula}`), formula: a.formula };
    case "apply-condition": {
      const condition = CONDITIONS.find((c) => c.id === a.condition);
      if (!condition) return null;
      return {
        ...base,
        kind: "apply-condition",
        label: named(condition.name),
        condition: condition.id,
      };
    }
    case "grant-effect": {
      const effect = a.effect ?? {};
      if (!effect.name) return null;
      return {
        ...base,
        kind: "grant-effect",
        label: named(effect.name),
        effect: {
          name: String(effect.name),
          duration: String(effect.duration || "temporary"),
          modifiers: [...(effect.modifiers ?? [])],
        },
      };
    }
    case "use-item":
      if (!item) return null;
      return { ...base, kind: "use-item", label: named(`Use ${item.name}`), itemId: item.id };
    case "mark-use":
      return { ...base, kind: "mark-use", label: named("Use · Mark"), mark: Number(a.mark) || 1 };
    default:
      return null;
  }
}

function actionsFor(card: CardOptions, actor: any, options: PostCardOptions): CardAction[] {
  const item = card.id ? actor?.items?.get?.(card.id) : null;
  const out: CardAction[] = [];

  /* ── the authored row ──────────────────────────────────────────────────
     If somebody has read this document, their reading is the whole row and
     nothing below this block runs for it. That is the point: a parse cannot
     be *partly* retired, because a card whose price was authored and whose
     roll was still swept would be charging the reader's answer and guessing
     at the rest, which is the worst of both and impossible to review.

     Two exceptions, and both are structural rather than printed —
     `mark-use` is *The Twilight Marked*'s toll and `use-item` is a
     consumable's quantity, neither of which is a sentence anybody wrote on
     a card. See the block above `authoredBlocks`. */
  const authored = authoredActions(item, options.feature);
  if (authored.length) {
    for (const { action, from } of authored) {
      const resolved = resolveAction(action, actor, item, card, from);
      if (!resolved) continue;
      resolved.steps = ((action.steps ?? []) as any[])
        .map((step) => resolveAction(step, actor, item, card, from))
        .filter(Boolean) as CardAction[];
      if (!resolved.steps.length) delete resolved.steps;
      out.push(resolved);
    }
    appendStructural(out, item, card);
    return out;
  }

  const addPrice = (price: Price, featureName = "") => {
    if (isFree(price)) return;
    const prefix = featureName ? `${featureName} · ` : "";
    const self = { ...price, fear: 0 };
    if (!isFree(self)) {
      out.push({ kind: "pay-cost", label: `${prefix}${costLabel(self)}`, ...self });
    }
    if (price.fear) {
      const fear = { hope: 0, stress: 0, armor: 0, fear: price.fear };
      out.push({ kind: "pay-cost", label: `${prefix}${costLabel(fear)}`, ...fear });
    }
  };

  /* ── the parse path is gone ────────────────────────────────────────────
     Three patterns used to run here: a price swept out of the prose, a roll
     read off "make a … Roll", and a sniff for the literal words "damage roll".
     Every rule unit in the packs is read now — `tools/check-actions.mjs` will
     not let one through unannotated and undeclined — so a document reaching
     this point has genuinely nothing authored, and the honest answer is the
     two structural presses and no more.

     They are not deleted: `sheets/suggest.ts` is the same three patterns
     behind the item sheet's "suggest" press, where their guess arrives as
     editable rows somebody looks at before it can charge anybody anything.

     `options.price` still travels, and it is not a leftover. The Hope action
     is not an Item and has no block to author against — it is assembled from
     the class's `hopeFeature` by `hopeCard`, and `hopeCost` reads its price
     off that block's own authored actions. One caller, one explicit price. */
  if (options.price) addPrice(options.price);

  /* The `feature` subtype's own `stressCost`/`fearCost`, which survive the
     retirement because they were never a parse: somebody typed them into the
     item sheet deliberately, and they are the one authored cost that predates
     `actions`. A homebrew feature built through those two fields goes on
     charging what it was told to. */
  // Unconditional: the branch above returned, so nothing here is annotated.
  if (item?.type === "feature") {
    const stress = Number(item.system?.stressCost) || 0;
    const fear = Number(item.system?.fearCost) || 0;
    if (stress || fear) addPrice({ hope: 0, armor: 0, stress, fear });
  }

  appendStructural(out, item, card);
  return out;
}

/**
 * The card is posted **twice**: once as HTML, and once as the options it was
 * drawn from.
 *
 * The HTML is what a client without this system sees, and it is genuinely
 * degraded — Foundry strips every `<svg>` out of stored message content, so
 * the corner sigils, the recall bolt and the art fallback's whole plate are
 * gone from it before it reaches the database. There is no way to store them.
 *
 * So the options travel in a flag and the card is drawn again on render, from
 * the reader's own copy of the assets. That is the better arrangement anyway:
 * a sigil is a local file, not a fact about the card, and a card posted by one
 * player now renders at the recipient's theme rather than the poster's.
 *
 * `fit` is deliberately not run here either. It measures a card that is
 * already laid out — `scrollHeight` against `clientHeight`, stepping the type
 * scale down until the body fits. At create time the markup is a string with
 * no box, so every measurement is zero and the pass bakes wrong values into
 * stored content. Both the fit and the redraw happen in `dice/chat.ts`.
 */
export async function postCard(
  card: CardOptions,
  actor?: any,
  options: PostCardOptions = {},
): Promise<any> {
  // The sigils are the one part that cannot survive storage, so they are not
  // stored — `sigKey` is, and the render side resolves it. `fbsig` is a sigil
  // too, and the class card is the one card that is *entirely* fallback plate,
  // so leaving it out of this list posts a class to chat with a blank one.
  const actions = actionsFor(card, actor, options);
  const actionable = { ...card, actions };
  const { sig: _sig, sig2: _sig2, fbsig: _fbsig, ...stored } = actionable;
  return ChatMessage.create({
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: cardWrapper(actionable),
    flags: {
      [SYSTEM_ID]: {
        kind: "card",
        actorUuid: actor?.uuid ?? null,
        itemId: card.id ?? null,
        card: stored,
        cardActions: actions,
      },
    },
  });
}
