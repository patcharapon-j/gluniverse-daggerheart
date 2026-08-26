/**
 * The migration errata, checked against the corpus it claims to be about.
 *
 * `src/module/migration/errata.ts` corrects documents that already exist in
 * somebody's world — a domain card dragged onto a character sheet before the
 * errata landed. It does that by matching a fragment of the *stored* text and
 * substituting, which makes it a hand-written claim about what the pack used
 * to say and what it says now, and there is exactly one way a claim like that
 * goes wrong: the pack moves and the fragment does not. Then the migration
 * runs, matches nothing, reports nothing, and every character at the table
 * quietly keeps the old rule.
 *
 * That failure is invisible by construction — which is what
 * `check-item-sheet.mjs` exists for in a different place, and what
 * `check-resources.mjs`'s `said` ratchet exists for in a third. So this
 * builds the pack and asserts, for every entry:
 *
 *   - the document it names still exists, by type and name;
 *   - what it substitutes **to** is what the built document now says;
 *   - what it substitutes **from** is no longer anywhere in that document.
 *
 * The second and third are the two halves of the same thing and both are
 * needed. Only checking `replace` would pass an entry whose `find` was never
 * right, so the migration would do nothing and the check would be happy.
 * Only checking `find` would pass an entry that substitutes the wrong text in.
 *
 * ── two forms of the same erratum, and why ────────────────────────────
 * `src/packs-src/card-errata.mjs` holds the same corrections in the cards'
 * own **markdown**, applied before `rt()`. This file's fragments are written
 * against `rt()`'s **output**, because that is what a copied document
 * actually stores — `<b>Mark a Stress</b>` and not `**Mark a Stress**`. The
 * two are not a duplication so much as two readings of one change, and this
 * check is the thing that stops them drifting apart.
 *
 * Run: node --experimental-strip-types tools/check-migration-errata.mjs
 * The strip-types flag is why this can import the TypeScript table directly
 * rather than re-parsing it as text, which is `check-item-sheet.mjs`'s
 * compromise and worth avoiding where the module has no Foundry in it.
 */

import DOMAINS from "../src/packs-src/domains.mjs";
import ADVERSARIES from "../src/packs-src/adversaries.mjs";
import ENVIRONMENTS from "../src/packs-src/environments.mjs";
import { SRD2_ERRATA } from "../src/module/migration/errata.ts";

const problems = [];

/**
 * Everything the migration could reach, flattened the way it walks.
 *
 * Two populations, because SRD 2.0 corrected two kinds of thing. Domain cards
 * are top-level Items. An adversary or environment **feature** is an Item
 * embedded on an Actor, and it is carried here with the name of the Actor it
 * sits on — because "Relentless (2)" is printed on dozens of stat blocks and
 * an entry that matched on the feature name alone would be checked against
 * whichever copy happened to sort first.
 *
 * A future entry naming a class or a weapon adds its pack here rather than
 * loosening the lookup.
 */
const CORPUS = [
  ...DOMAINS.map((d) => ({ doc: d, parent: null })),
  ...[...ADVERSARIES, ...ENVIRONMENTS].flatMap((a) =>
    (a.items ?? []).map((i) => ({ doc: i, parent: a.name })),
  ),
];

const say = (e, msg) =>
  problems.push(
    `  ${e.id} (${e.type} "${e.name}"${e.parent ? ` on "${e.parent}"` : ""})\n    ${msg}`,
  );

for (const e of SRD2_ERRATA) {
  const hit = CORPUS.find(
    (c) =>
      c.doc.type === e.type &&
      c.doc.name === e.name &&
      (!e.parent || c.parent === e.parent),
  );
  const doc = hit?.doc;
  if (!doc) {
    say(e, "names a document that is not in the built packs — renamed, or removed.");
    continue;
  }

  const json = JSON.stringify(doc.system ?? {});

  if (e.fix.kind === "set") {
    const current = doc.system?.[e.fix.path];
    if (current !== e.fix.to) {
      say(
        e,
        `expects system.${e.fix.path} === ${JSON.stringify(e.fix.to)} after the fix, ` +
          `but the built card says ${JSON.stringify(current)}.`,
      );
    }
    continue;
  }

  /* An erratum that only *adds* words is the one shape that can be written
     so it never stops matching: leave the fragment unanchored and it is a
     prefix of its own replacement, so it fires on the corrected card too and
     a second run appends the sentence a second time. This is checked here
     rather than left to the corpus test below, because the corpus test
     reports it as "the pack was never corrected", which sends the reader to
     the wrong file entirely. */
  if (e.fix.replace.includes(e.fix.find)) {
    say(
      e,
      "substitutes text that contains its own search fragment, so the fix is " +
        "not idempotent — running it twice would apply it twice. Anchor the " +
        "fragment on something the replacement moves, such as the closing tag.",
    );
    continue;
  }

  /* JSON.stringify escapes nothing our fragments contain — no quotes, no
     backslashes — so a plain substring test over the serialised system object
     reaches every field without this check having to know which one holds the
     rules text. That is the same reason the migration itself walks rather
     than naming paths. */
  if (!json.includes(e.fix.replace)) {
    say(
      e,
      "substitutes text the built card does not contain. The migration would " +
        "write something the compendium disagrees with.\n" +
        `      wants: ${e.fix.replace}`,
    );
  }
  if (json.includes(e.fix.find)) {
    say(
      e,
      "matches text the built card STILL contains, so the pack was never " +
        "corrected — or the fragment is not specific enough.\n" +
        `      found: ${e.fix.find}`,
    );
  }
}

if (problems.length) {
  console.error(
    `\n${problems.length} problem${problems.length === 1 ? "" : "s"} in ` +
      `src/module/migration/errata.ts:\n\n${problems.join("\n\n")}\n`,
  );
  process.exit(1);
}

console.log(
  `check-migration-errata: ${SRD2_ERRATA.length} errata agree with the built packs ` +
    `(${CORPUS.length} documents swept).`,
);
