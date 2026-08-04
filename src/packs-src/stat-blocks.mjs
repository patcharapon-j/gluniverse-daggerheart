/**
 * The adversary and environment stat blocks, read back off the committed
 * snapshot.
 *
 * The books themselves live in `docs/rules` and are **not** committed — 579MB
 * of somebody else's work that the build does not need. So the parse happens
 * in `tools/extract-stat-blocks.mjs`, on a machine that has them, and this
 * reads what that wrote:
 *
 *     node tools/extract-stat-blocks.mjs
 *
 * That is `official-cards.json`'s arrangement and it is here for the same
 * reason — the build reads a file in the repository and never anything
 * outside it. Parsing at import time made these two packs the only ones that
 * a clean checkout could not build, and the failure was a release workflow
 * away rather than a local one: every machine that had ever run the parser
 * also had the books.
 *
 * `equipment.mjs` deliberately does the opposite and derives its documents at
 * import time, and the two are the same rule rather than two. A generated
 * file is a second copy of facts something else owns, so it is worth having
 * only when that something else is out of reach — the Card Creator, a PDF —
 * and worth avoiding when the source is a table in this repository that
 * nothing else writes.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SNAPSHOT = join(dirname(fileURLToPath(import.meta.url)), "stat-blocks.json");
const { adversaries, environments } = JSON.parse(readFileSync(SNAPSHOT, "utf8"));

export const ADVERSARIES = adversaries;
export const ENVIRONMENTS = environments;
