/**
 * The corebook domain card set — nine decks, 189 cards.
 *
 * The card text is fetched rather than transcribed: see
 * `tools/fetch-cards.mjs`, which reads the official Daggerheart Card Creator
 * and writes `domain-cards.mjs` next to this file, art and all. This module
 * is the thin part — it decides what a card *is* as a document, and nothing
 * about what it says.
 *
 * `domain-cards.mjs` already comes out in deck order — by domain as the book
 * introduces them, then by level — so this maps it and stops. It used to sort,
 * from the days when the source was an appendix scrape arriving in page order.
 */

import CARDS from "./domain-cards.mjs";
import { domainCardItem } from "./_helpers.mjs";

export default CARDS.map(domainCardItem);
