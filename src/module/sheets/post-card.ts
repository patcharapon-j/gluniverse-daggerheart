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
import type { CardOptions } from "./cards.ts";

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
export const cardWrapper = (card: CardOptions): string =>
  `<div class="${wrapperClass(card)}" style="${attr(card.art ?? "")}">` +
  `${CARD(card)}</div>`;

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
export async function postCard(card: CardOptions, actor?: any): Promise<any> {
  // The sigils are the one part that cannot survive storage, so they are not
  // stored — `sigKey` is, and the render side resolves it.
  const { sig: _sig, sig2: _sig2, ...stored } = card;
  return ChatMessage.create({
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: cardWrapper(card),
    flags: { [SYSTEM_ID]: { kind: "card", itemId: card.id ?? null, card: stored } },
  });
}
