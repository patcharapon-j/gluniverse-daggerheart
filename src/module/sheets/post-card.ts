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

import { SYSTEM_ID } from "../config.ts";
import { CARD } from "../ui/card.js";
import { featurePrice, isFree, plain, type CardOptions, type Price } from "./cards.ts";

export interface CardAction {
  kind: "pay-cost" | "move-resource" | "use-item" | "roll-damage";
  label: string;
  hope?: number;
  stress?: number;
  armor?: number;
  fear?: number;
  itemId?: string;
  resourceIndex?: number;
  by?: number;
  weaponId?: string;
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

  const saysDamageRoll = /\bdamage roll\b/i.test(plain(card.text || ""));
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
