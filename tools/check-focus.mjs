/**
 * Is the Martial Artist's Focus pool wired all the way through?
 *
 * `check-actor-sheets.mjs` proves every writable field on the adversary, the
 * environment and the companion is reachable from a control — and it stops
 * there on purpose, because the *character* sheet is four tabs and a rail and
 * a field-by-field sweep of it would be a list nobody maintains. That leaves
 * the character schema with no ratchet at all, which is fine for a field the
 * whole sheet is built around and is not fine for this one: Focus belongs to
 * one subclass of thirteen, so **nobody's sheet draws it and nobody notices
 * when it stops being drawn.** Twelve out of thirteen characters at the table
 * are a control group that will never report the bug.
 *
 * So this is `check-item-sheet.mjs`'s ratchet pointed at one pool, and every
 * assertion below is a failure that has already happened somewhere in this
 * repo rather than one somebody imagined:
 *
 *   1. the field exists and is a `pool`, not a `markTrack` — the split the
 *      two helpers are named for, and the one a later hand is most likely to
 *      "tidy" into the three tracks above it;
 *   2. the sheet reaches `system.resources.focus.value`, which is
 *      `check-actor-sheets.mjs`'s whole claim in one line;
 *   3. the gate is `FOCUS_SUBCLASS` and not the string "Martial Artist" typed
 *      out — `config.ts` owns the closed sets and a literal here is a second
 *      copy that cannot be renamed;
 *   4. `refocus` builds a real `Roll`. Writing a `Math.random()` into a field
 *      produces the right number and silently drops the dice log, the seeded
 *      randomness and any 3D-dice module, which is `dice/reroll.ts`'s rule and
 *      the one shortcut this method exists to refuse;
 *   5. both rail pools carry `data-p`, because `querySelector(".rail .pool")`
 *      takes the *first* one — a Focus refusal that shook the Hope gems would
 *      be a correct refusal pointing at the wrong number, on a sheet where
 *      both rows are gold diamonds;
 *   6. the refocus press states `height`, `min-height` **and** `max-height`.
 *      That is the trap CLAUDE.md records four separate times: Foundry's
 *      `elements` layer gives every `<button>` 28px with a matching floor, our
 *      sheets arrive unlayered so `height` wins on its own, and *a floor with
 *      no competitor simply applies*. Strip the reset and the disabled state —
 *      one line of rule instead of two — stands at a different height from the
 *      enabled one.
 *
 *     node tools/check-focus.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const config = read("src/module/config.ts");
const schema = read("src/module/data/actors.ts");
const actor = read("src/module/documents/actor.ts");
const sheet = read("src/module/sheets/CharacterSheet.svelte");

const fail = [];
const want = (ok, why) => ok || fail.push(why);

/* ── 1. the closed constants, and the schema shape ──────────────────── */

for (const name of ["FOCUS_MAX", "FOCUS_DIE", "FOCUS_TRAIT", "FOCUS_SUBCLASS"]) {
  want(
    new RegExp(`export const ${name}\\b`).test(config),
    `config.ts no longer exports ${name}`,
  );
}

want(
  /focus:\s*pool\(FOCUS_MAX\)/.test(schema),
  "CharacterData.resources.focus is not `pool(FOCUS_MAX)` — a pool is spent " +
    "down and given back in a lump, which is Hope's shape and not a track's",
);
want(
  !/focus:\s*markTrack/.test(schema),
  "Focus is declared as a mark track. It is spent, not crossed off",
);

/* ── 2 and 3. the sheet reaches it, and gates on the constant ───────── */

want(
  sheet.includes("system.resources.focus.value"),
  "CharacterSheet.svelte never writes system.resources.focus.value — the " +
    "pool would be a readout with no way to spend it",
);
want(
  sheet.includes("FOCUS_SUBCLASS"),
  "CharacterSheet.svelte does not gate the Focus pool on FOCUS_SUBCLASS",
);
want(
  !/["'`]Martial Artist["'`]/.test(sheet),
  'CharacterSheet.svelte spells "Martial Artist" out. That name is ' +
    "config.ts's, and a second copy is one that cannot be renamed",
);

/* ── 4. the refill rolls, and refuses ───────────────────────────────── */

const refocus = actor.slice(actor.indexOf("async refocus("));
want(refocus.length > 0, "DaggerheartActor.refocus is gone");
const body = refocus.slice(0, refocus.indexOf("\n  }"));

want(/new Roll\(/.test(body), "refocus() does not build a Roll");
want(
  /kh/.test(body),
  "refocus() does not keep the highest — the card gains Focus equal to the " +
    "highest result rolled, not the sum",
);
want(
  !/Math\.random/.test(body),
  "refocus() reaches for Math.random. A number written into a field is not a " +
    "roll: the dice log, the seed and every 3D-dice module go with it",
);
want(
  /toMessage|ChatMessage\.create/.test(body),
  "refocus() rolls and does not post. A pool that refills with no dice on the " +
    "table is a pool nobody watched refill",
);
want(
  /<=\s*0\)\s*return null/.test(body),
  "refocus() no longer refuses at Instinct +0 or lower. Read literally the " +
    "move still clears the track for nothing, once per rest, on a press that " +
    "cannot be taken back",
);

want(
  /async spendFocus\([^)]*\): Promise<boolean>/.test(actor),
  "DaggerheartActor.spendFocus is gone or no longer answers a refusal",
);
want(
  /focus\.value < amount\) return false/.test(actor),
  "spendFocus does not refuse a short purse before writing",
);

/* ── 5. two pools on one rail ───────────────────────────────────────── */

const pools = [...sheet.matchAll(/class="pool"(?!\s+data-p)/g)];
want(
  pools.length === 0,
  `${pools.length} rail pool(s) carry no data-p. refusePool takes the first ` +
    "match, so an unnamed row means the wrong pool flinches",
);
want(
  /\.rail \.pool\[data-p=/.test(sheet),
  "refusePool no longer addresses a pool by name",
);

/* ── 6. the button floor ────────────────────────────────────────────── */

const rfc = sheet.match(/\.rfc\s*\{[^}]*\}/);
want(rfc, "the refocus press states no metrics of its own");
for (const prop of ["height", "min-height", "max-height"]) {
  want(
    rfc && new RegExp(`(^|[^-])${prop}\\s*:`, "m").test(rfc[0]),
    `.rfc does not state ${prop}. Foundry's elements layer gives every ` +
      "button 28px with a matching floor, and a floor with no competitor " +
      "simply applies",
  );
}

/* ── report ─────────────────────────────────────────────────────────── */

if (fail.length) {
  const one = fail.length === 1;
  console.error(`focus: ${fail.length} thing${one ? "" : "s"} unwired\n`);
  for (const f of fail) console.error(`  ${f}`);
  console.error(
    `\nOne subclass of thirteen holds Focus, so nobody's sheet draws it and\n` +
      `nobody notices when it stops being drawn.`,
  );
  process.exit(1);
}

console.log(
  "focus: pool declared, reachable, gated on the subclass, and refilled by a real roll.",
);
