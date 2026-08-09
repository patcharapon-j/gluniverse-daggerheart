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
  SYSTEM_ID, TRAITS, isMarkedDomain, markedSpellcast, traitLabel, type Trait,
} from "../config.ts";
import { CARD } from "../ui/card.js";
import { featurePrice, isFree, plain, type CardOptions, type Price } from "./cards.ts";

export interface CardAction {
  kind:
    | "pay-cost"
    | "move-resource"
    | "use-item"
    | "roll-damage"
    | "roll-card-damage"
    | "roll-trait"
    | "mark-use";
  label: string;
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
  /** Exact price of a feature row. Omit to infer it from a single-rule card. */
  price?: Price;
  /** Only the counters owned by the posted feature. Omit for the whole Item. */
  resourceIndexes?: number[];
  /** A rule which explicitly calls for a Damage Roll. */
  damageRoll?: boolean;
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
const actionRow = (actions?: CardAction[]): string =>
  !actions?.length
    ? ""
    : `<div class="pl-act card-actions">${actions.map((a, i) =>
        `<button type="button" class="pl-b" data-dh-act="card-action:${i}"><i></i>${attr(a.label)}</button>`,
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

/* ── "Make a Spellcast Roll" ───────────────────────────────────────────
   The second parse of English rules text in this system, and it has to argue
   for itself the way the first one does. `featurePrice` is the other, and its
   whole discipline is that a pattern over rules text is only allowed where the
   book writes the thing in one shape, on purpose, every time.

   A roll is written that way. Daggerheart asks for one in the imperative and
   in one shape — "Make a Spellcast Roll", "make an Instinct Roll (12)" — and
   everything else that puts a trait next to the word *Roll* is describing a
   bonus to a roll rather than asking for one:

       Channeling — "+1 to Spellcast Rolls"
       Not Good Enough — "you gain a +1 bonus to your next Knowledge Roll"
       Deadly Focus — "+10 bonus to your damage rolls"

   None of those says *make*, and that verb is the whole of what a button
   needs. So it is required, and required to be *imperative* — which is
   `featurePrice`'s own
   discriminator arriving at a different question. There it is "who is paying";
   here it is "who is being told to roll", and the shape of the answer is the
   same: the clause head, or an offer. What precedes `make` is the whole test.

       "When you would make a Spellcast Roll, you can spend a Hope…"
       "Additionally, before you make a Spellcast Roll while within…"

   Both name a roll being made somewhere else and neither is a call to roll
   now; "would" and "you" are not in the caller set, so neither is reached. A
   card saying "by making an additional Spellcast Roll" is out on the verb
   alone.

   Two more things fall out of the shape rather than needing a rule of their
   own, and both are worth stating because they look like omissions:

   - **No Reaction Rolls.** The trait word has to sit immediately against
     `Roll`, so "make an Agility Reaction Roll" and "must succeed on a Reaction
     Roll (16)" are both unreachable. That is also what keeps the *target's*
     rolls off this card: in this game the thing a target is forced to make is
     always a Reaction Roll, which is why `to` is safe in the caller set even
     though it is the word a coercion is written with.
   - **"make the … Roll" is given up**, deliberately, as `featurePrice` gives
     up "must". Two cards phrase it that way and nothing in the sentence tells
     the definite article apart from a reference back to a roll already named.

   A printed Difficulty rides along in the same match, because the book prints
   it in the same breath — "Make a Spellcast Roll (15)". An *unprinted* one
   does not and must not: a target number is the GM's everywhere else in this
   system, and the popover deliberately declines to offer one. */

const ROLL_MK = "[\\s*_]";
const ROLL_CALLER =
  "(?:^|<br>|•|[.!?:;,]|\\band\\b|\\bthen\\b|\\byou can\\b|\\byou may\\b|\\bto\\b)";
const ROLL_WORDS = [...TRAITS, "spellcast"].join("|");
const ROLL_RX = new RegExp(
  `${ROLL_CALLER}${ROLL_MK}*make${ROLL_MK}+an?${ROLL_MK}+(${ROLL_WORDS})` +
    `${ROLL_MK}+roll\\b${ROLL_MK}*(?:\\(${ROLL_MK}*(\\d+)${ROLL_MK}*\\))?`,
  "i",
);

/** The first roll a block asks for, and only the first — see `actionsFor`. */
const rollCall = (text: string): { word: string; dc: number | null } | null => {
  const m = ROLL_RX.exec(text);
  return m ? { word: String(m[1]).toLowerCase(), dc: m[2] ? Number(m[2]) : null } : null;
};

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

function actionsFor(card: CardOptions, actor: any, options: PostCardOptions): CardAction[] {
  const item = card.id ? actor?.items?.get?.(card.id) : null;
  const out: CardAction[] = [];

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

  if (options.price) {
    addPrice(options.price);
  } else {
    const authored = item?.type === "feature" ? item.system : undefined;
    if (card.text) addPrice(featurePrice({ description: card.text }, authored));
    for (const feature of card.feats ?? []) {
      addPrice(
        featurePrice({ description: feature.t }),
        card.feats && card.feats.length > 1 ? feature.n : "",
      );
    }
  }

  const resources: any[] = item?.system?.resources ?? [];
  const indexes = options.resourceIndexes ?? resources.map((_r, i) => i);
  for (const i of indexes) {
    const res = resources[i];
    if (!res) continue;
    const budget = /^uses?$/i.test(String(res.name ?? ""));
    const name = String(res.name || "Counter").replace(/s$/i, "");
    out.push({
      kind: "move-resource",
      label: budget ? `Spend ${name}` : `Mark ${name}`,
      itemId: item.id,
      resourceIndex: i,
      by: budget ? -1 : 1,
    });
  }

  if (item && ["consumable", "loot"].includes(item.type) && Number(item.system?.quantity) > 0) {
    out.push({ kind: "use-item", label: `Use ${item.name}`, itemId: item.id });
  }

  /* *The Twilight Marked*'s toll, and it goes **first** in the row.
     Every other action here is optional — a cost the card offers you, a
     counter you may spend, a damage roll you may want. This one is not: using
     a Root or Void card gains a Mark and feeds the GM's pool whether you like
     it or not, so it is the first thing the row says rather than the last.

     It is a *press* and not something the post applies, because posting a card
     is how you show it as often as it is how you play it. Which also settles
     the three cases the frame calls out — a reaction, a second activation and
     a use that failed are all somebody pressing this.

     The two level 10 cards buy an extra action and cost 3. Read off the text
     rather than listed, because the cards say it in the words the frame uses
     and a second list of two names is a second thing to keep true. */
  if (item?.type === "domainCard" && isMarkedDomain(item.system?.domain)) {
    const mark = /gain \*\*?3 Mark/i.test(String(card.text ?? "")) ? 3 : 1;
    out.unshift({ kind: "mark-use", label: mark === 1 ? "Use · Mark" : `Use · ${mark} Mark`, mark });
  }

  /* The row reads in the order the card's sentence does — pay, roll, damage —
     which is what puts this after every price above it and before both damage
     blocks below. A card that asks for a Stress, a roll and then some dice is
     a card whose buttons are pressed left to right.

     **One button per block, and the first invocation only.** A block that
     calls for two rolls is calling for the second *because of* how the first
     went ("on a success, make a Presence Roll"), so a row offering both up
     front would be offering a roll nobody has earned yet. The reader can press
     the trait plate on their own sheet for the second, which is what they did
     before this button existed.

     **Repeatable, and therefore no claim.** Every other action in this row
     spends something once — a Hope leaves a purse, a use leaves a counter —
     and a row of live buttons three hours later is an invitation to collect it
     twice. A roll spends nothing. You will genuinely roll the same card again
     next round, and burning the button on the first press would send you back
     to the sheet for every press after it. Ownership is the whole gate. */
  for (const b of blocks(card)) {
    const call = rollCall(b.t);
    if (!call) continue;
    const trait = traitOf(call.word, actor, item);
    if (!trait) continue;
    out.push({
      kind: "roll-trait",
      label: `${b.n ? `${b.n} · ` : ""}${rollLabel(call.word)}`,
      trait,
      dc: call.dc,
    });
  }

  /* The card's own dice, which is a different button from the one below it.
     Two, never one, and the corpus is what settles it: seventy-seven entries
     print a complete damage expression, the "damage roll" sniff below matches
     fifty of which thirty-four print no dice at all, and *not one* card with a
     complete expression says the phrase. The two are not two readings of one
     thing — "add a d6 to your damage roll" is a clause about the weapon in
     your hand, and "they take 2d8+4 magic damage" is the card rolling.

     So the label **prints the dice**. A row carrying two buttons both reading
     "Roll damage" is precisely the ambiguity this exists to remove, and the
     expression is the one thing that can never be true of both.

     `proficiency` is resolved *here* rather than at the press, unlike the
     weapon below, and the reason is the label: a button reading "Roll 3d8+2"
     that rolled a different number of dice would be worse than no label at
     all. The Proficiency in it is the one this character had when the card was
     posted, which is what the card said when it was posted.

     **No critical.** A weapon's damage button is reached from an attack plate
     and reads the crit off the message that hit; a posted card is a card, and
     there is no honest link from it to a roll that critted — the player may
     have posted it before rolling, after rolling, or to argue about what it
     says. Guessing would double dice on a hit that never happened. */
  for (const d of (item?.system?.cardDamage ?? []) as any[]) {
    const count = Math.max(1, Number(d.count) || 1) *
      (d.proficiency ? Math.max(1, Number(actor?.system?.proficiency) || 1) : 1);
    const bonus = Number(d.bonus) || 0;
    const mode = String(d.name ?? "");
    out.push({
      kind: "roll-card-damage",
      label: damageLabel(mode, count, String(d.dice || "d6"), bonus),
      damageName: mode ? `${card.name} · ${mode}` : card.name,
      count,
      die: String(d.dice || "d6"),
      bonus,
      // Direct rides in the type, as it does on an adversary's attack, because
      // `apps/damage.ts` reads it back off the same string. Save-for-half does
      // not travel at all — halving is the *target's* outcome, decided against
      // thresholds this side of the exchange does not own.
      damageType: `${d.direct ? "direct " : ""}${String(d.type || "physical")}`,
    });
  }

  const saysDamageRoll = blocks(card).some((b) => /\bdamage roll\b/i.test(plain(b.t)));
  if (item?.type === "weapon" || options.damageRoll || saysDamageRoll) {
    const weapon = item?.type === "weapon"
      ? item
      : actor?.items?.find?.((it: any) => it.type === "weapon" && it.system?.equipped && it.system?.slot === "primary")
        ?? actor?.items?.find?.((it: any) => it.type === "weapon" && it.system?.equipped);
    out.push({ kind: "roll-damage", label: "Roll damage", weaponId: weapon?.id });
  }
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
