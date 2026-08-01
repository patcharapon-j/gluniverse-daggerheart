/**
 * The corebook domain card set — nine decks, 189 cards.
 *
 * The card text is extracted rather than transcribed: see
 * `tools/extract-domain-cards.mjs`, which reads the Domain Card Reference
 * appendix out of `docs/rules/` and writes `domain-cards.mjs` next to this
 * file. This module is the thin part — it decides what a card *is* as a
 * document, and nothing about what it says.
 *
 * Order matters and is the book's, not the alphabet's: within a domain, by
 * level, and within a level as printed. That is the order a player leafs
 * through a deck, so it is the order the compendium lists them in.
 */

import CARDS from "./domain-cards.mjs";
import { domainCardItem } from "./_helpers.mjs";

/** Deck order: the nine domains as the book introduces them. */
const DOMAIN_ORDER = [
  "arcana",
  "blade",
  "bone",
  "codex",
  "grace",
  "midnight",
  "sage",
  "splendor",
  "valor",
];

const sorted = CARDS.slice().sort((a, b) => {
  const domain = DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain);
  if (domain) return domain;
  if (a.level !== b.level) return a.level - b.level;
  return CARDS.indexOf(a) - CARDS.indexOf(b);
});

export default sorted.map(domainCardItem);
