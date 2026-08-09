/**
 * The domain card set — ten decks, 210 cards.
 *
 * Nine of the decks are the corebook's and their text is **fetched** rather
 * than transcribed: see `tools/fetch-cards.mjs`, which reads the official
 * Daggerheart Card Creator and writes `domain-cards.mjs` next to this file,
 * art and all. The tenth is Dread, from *Hope and Fear*, and it is
 * **transcribed** — the Card Creator publishes no Hope and Fear content, so
 * there is nothing to fetch and `dread-cards.mjs` is the appendix typed in.
 * That module's own header has the argument.
 *
 * This module is the thin part either way: it decides what a card *is* as a
 * document, and nothing about what it says.
 *
 * Both sources already arrive in deck order — by level, then alphabetical
 * within a level — so this concatenates and stops. Dread goes last because it
 * is a later book rather than a tenth entry in the corebook's own sequence,
 * and a compendium folder list that reads "…Splendor, Valor, Dread" says which
 * nine came together in a way an alphabetical merge would hide.
 */

import CARDS from "./domain-cards.mjs";
import DREAD from "./dread-cards.mjs";
import MARKED from "./marked-cards.mjs";
import { domainCardItem } from "./_helpers.mjs";
import { withDice } from "./card-resources.mjs";
import { withDamage } from "./card-damage.mjs";

/**
 * Root and Void go last, after Dread, for the reason Dread goes after the nine.
 *
 * A compendium folder list reading "…Splendor, Valor, Dread, Root, Void" says
 * three things an alphabetical merge would hide: which nine came together, that
 * Dread arrived with a later book, and that the last two came from neither —
 * they are *The Twilight Marked*'s and no class carries them. `config.ts` puts
 * them in the same place in `DOMAINS` and for the same reason.
 *
 * `thread` is the campaign's own axis rather than the game's, so it is dropped
 * here rather than carried into `system`: `domainCardItem` takes the fields a
 * domain card *has*, and inventing an eleventh for two decks would put a field
 * on all 231 documents that 189 of them can never answer.
 * `tools/check-marked.mjs` is the only thing that reads it.
 */
export default withDamage(withDice([...CARDS, ...DREAD, ...MARKED].map(domainCardItem)));
