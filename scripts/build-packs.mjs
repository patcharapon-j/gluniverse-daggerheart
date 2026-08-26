/**
 * Compiles compendium source into LevelDB packs under `dist/packs/`.
 *
 * Source lives in `src/packs-src/*.mjs` as normalized document objects (see
 * `_helpers.mjs`). This script:
 *   1. gives each document a STABLE `_id` derived from pack + type + source key, so
 *      rebuilds keep the same ids and a character that dragged a card off the
 *      compendium stays linked to it;
 *   2. materialises the folders entries asked for by name;
 *   3. stages everything as JSON and runs the Foundry CLI `compilePack`.
 *
 * Run after `vite build`, which empties `dist/`. Wired into `npm run build`.
 */

import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { compilePack } from "@foundryvtt/foundryvtt-cli";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src", "packs-src");
const OUT = join(ROOT, "dist", "packs");

/** Deterministic 16-char id. Hex is a valid Foundry id charset. */
const stableId = (key) => createHash("sha1").update(key).digest("hex").slice(0, 16);

/**
 * One entry per pack, and the same list feeds `system.json`. `collection` is
 * the LevelDB key prefix Foundry reads the pack back out of, so it has to
 * match `docType`.
 */
export const PACKS = [
  {
    name: "classes",
    module: "classes.mjs",
    label: "Classes & Subclasses",
    collection: "items",
    docType: "Item",
  },
  {
    name: "heritage",
    module: "heritage.mjs",
    label: "Ancestries & Communities",
    collection: "items",
    docType: "Item",
  },
  {
    name: "domains",
    module: "domains.mjs",
    label: "Domain Cards",
    collection: "items",
    docType: "Item",
  },
  {
    name: "equipment",
    module: "equipment.mjs",
    label: "Equipment",
    collection: "items",
    docType: "Item",
  },
  {
    name: "adversaries",
    module: "adversaries.mjs",
    label: "Adversaries",
    collection: "actors",
    docType: "Actor",
  },
  {
    name: "environments",
    module: "environments.mjs",
    label: "Environments",
    collection: "actors",
    docType: "Actor",
  },

  /* The supplemental campaign variants, in two packs because they hold two
     different kinds of thing. Gear is Items a character equips and belongs
     beside the other Items; a frame is rules text nobody equips, and a
     JournalEntry is what a virtual tabletop has for that.

     Kept OUT of the equipment pack, deliberately. Everyday Hero alone is 36
     more documents on a table that is not running it, and the compendium
     browser answers "every weapon in the world" — a Pitchfork arriving in a
     search for tier-1 primaries is a variant leaking into a game nobody
     switched on. A pack is the coarsest gate this system has and it is the
     right grain here, because the whole chapter is optional together. See
     `src/module/variants.ts` for the switch that decides which of them the
     browser and the creation window will offer. */
  {
    name: "variants",
    module: "variants.mjs",
    label: "Variant Equipment",
    collection: "items",
    docType: "Item",
  },
  {
    name: "variant-rules",
    module: "variant-rules.mjs",
    label: "Variant Rules",
    collection: "journal",
    docType: "JournalEntry",
  },
];

/**
 * A feature living on an adversary or an environment.
 *
 * The CLI walks a document's hierarchy and writes every embedded document
 * under its own LevelDB key — `!actors.items!<actor>.<item>` — so an embedded
 * doc needs a `_key` exactly as a primary one does. Without it the batch is
 * handed an undefined key and the whole compile fails, which is what
 * "Key cannot be null or undefined" means. The parent's own `items` array is
 * reduced to ids by the CLI, so both halves stay in step.
 */
function embeddedItem(pack, actorId, entry, index) {
  const id = stableId(`${pack.name}:${actorId}:item:${index}:${entry.name}`);
  return {
    _id: id,
    _key: `!${pack.collection}.items!${actorId}.${id}`,
    name: entry.name,
    type: entry.type,
    img: entry.img,
    system: entry.system,
    effects: [],
    folder: null,
    sort: (index + 1) * 1000,
    flags: {},
  };
}

/**
 * A page of a journal entry.
 *
 * `embeddedItem`'s argument and its failure mode, one document type along: the
 * CLI walks a document's hierarchy — `pages` for a JournalEntry exactly as
 * `items` is for an Actor — and writes each embedded document under its own
 * LevelDB key. A page arriving without a `_key` throws `Key cannot be null or
 * undefined`, which is the same error `embeddedItem` was written for.
 *
 * The silent half is worse and is what this function exists to prevent. The
 * envelope below picks its fields **explicitly**, so a document kind whose
 * content lives somewhere the list does not name is compiled without it and
 * reported at its full count: ten journal entries, ten folders, and every one
 * of them empty. Nothing errors and the summary line looks right.
 */
function embeddedPage(pack, entryId, page, index) {
  const id = stableId(`${pack.name}:${entryId}:page:${index}:${page.name}`);
  return {
    _id: id,
    _key: `!${pack.collection}.pages!${entryId}.${id}`,
    name: page.name,
    type: page.type ?? "text",
    title: page.title ?? { show: true, level: 1 },
    text: page.text,
    sort: (index + 1) * 1000,
    // -1 is INHERIT: a page takes the entry's own ownership rather than
    // asserting one of its own, which is what makes the pack's `ownership`
    // in `system.json` the single place a reader's access is decided.
    ownership: { default: -1 },
    flags: {},
  };
}

/** The Foundry envelope around a normalized Item, Actor or JournalEntry. */
function documentDoc(pack, entry, folderId) {
  /* A JournalEntry has no subtype, so the `type` slot in the id key is
     `undefined` for every one of them — deterministic, and stable, but
     meaningless. It is spelled out rather than left to interpolation, because
     an id is what keeps a link alive and `variant-rules:undefined:feasts` is
     the kind of string somebody tidies up later without realising it moves
     every id in the pack. `sourceKey` is the variant id here, so a GM
     retitling an entry does not orphan it. */
  const kind = pack.docType === "JournalEntry" ? "journal" : entry.type;
  const id = stableId(`${pack.name}:${kind}:${entry.sourceKey ?? entry.name}`);

  if (pack.docType === "JournalEntry") {
    return {
      _id: id,
      _key: `!${pack.collection}!${id}`,
      name: entry.name,
      pages: (entry.pages ?? []).map((page, index) => embeddedPage(pack, id, page, index)),
      folder: folderId,
      sort: entry.sort ?? 0,
      ownership: { default: 0 },
      flags: {},
    };
  }

  const embedded = (entry.items ?? []).map((item, index) =>
    embeddedItem(pack, id, item, index),
  );
  return {
    _id: id,
    _key: `!${pack.collection}!${id}`,
    name: entry.name,
    type: entry.type,
    img: entry.img,
    system: entry.system,
    ...(pack.docType === "Actor" ? { items: embedded } : {}),
    effects: [],
    folder: folderId,
    sort: entry.sort ?? 0,
    ownership: { default: 0 },
    flags: {},
  };
}

function folderDoc(packName, name, docType, sort) {
  const id = stableId(`${packName}:folder:${name}`);
  return {
    _id: id,
    _key: `!folders!${id}`,
    name,
    type: docType,
    // Manual sorting, so folders keep the order the source file declares them
    // in — which for classes is alphabetical anyway, but for domain cards is
    // the book's order and not the alphabet's.
    sorting: "m",
    folder: null,
    description: "",
    color: null,
    sort,
    flags: {},
  };
}

async function main() {
  if (!existsSync(SRC)) throw new Error(`No pack source at ${SRC}`);
  mkdirSync(OUT, { recursive: true });
  const summary = [];

  for (const pack of PACKS) {
    const mod = await import(pathToFileURL(join(SRC, pack.module)).href);
    const entries = mod.default;
    if (!Array.isArray(entries)) {
      throw new Error(`${pack.module} must default-export an array (got ${typeof entries})`);
    }

    const stage = mkdtempSync(join(tmpdir(), `dhpack-${pack.name}-`));
    const folders = new Map();
    const seen = new Map();
    let sort = 0;
    /* Counted and printed, because the failure the JournalEntry branch was
       added for was SILENT: ten entries in ten folders, reported at their full
       count, every one of them empty. A document count cannot see inside a
       document, so the summary says how much is inside one. */
    let embedded = 0;

    for (const entry of entries) {
      let folderId = null;
      if (entry.folder) {
        if (!folders.has(entry.folder)) {
          const doc = folderDoc(pack.name, entry.folder, pack.docType, folders.size * 1000);
          folders.set(entry.folder, doc);
          writeFileSync(join(stage, `folder-${doc._id}.json`), JSON.stringify(doc, null, 2));
        }
        folderId = folders.get(entry.folder)._id;
      }

      const doc = documentDoc(pack, { ...entry, sort: (sort += 1000) }, folderId);
      if (seen.has(doc._id)) {
        throw new Error(
          `Duplicate id in "${pack.name}": "${entry.name}" collides with "${seen.get(doc._id)}". ` +
            `Ids are derived from type + source key — give one entry a distinct sourceKey.`,
        );
      }
      seen.set(doc._id, entry.name);
      embedded += (doc.pages?.length ?? 0) + (doc.items?.length ?? 0);
      writeFileSync(join(stage, `${doc._id}.json`), JSON.stringify(doc, null, 2));
    }

    await compilePack(stage, join(OUT, pack.name), { log: false });
    rmSync(stage, { recursive: true, force: true });
    const inside = embedded
      ? `  ${embedded} ${pack.docType === "JournalEntry" ? "pages" : "features"}`
      : "";
    summary.push(
      `  ${pack.name.padEnd(14)} ${String(seen.size).padStart(4)} docs  ${folders.size} folders${inside}`,
    );
  }

  console.log("Compiled compendium packs:");
  console.log(summary.join("\n"));
  checkManifest();
}

/**
 * A pack Foundry does not know about is a pack nobody can open, and the
 * failure is silent — the folder is simply there on disk and never mounted.
 * So the manifest is checked against what was actually built rather than
 * generated from it: generating would make the two agree by construction and
 * hide the case where somebody edits one on purpose.
 */
function checkManifest() {
  const manifest = JSON.parse(readFileSync(join(ROOT, "system.json"), "utf8"));
  const declared = new Set((manifest.packs ?? []).map((p) => p.name));
  const built = new Set(PACKS.map((p) => p.name));

  const missing = [...built].filter((n) => !declared.has(n));
  const stale = [...declared].filter((n) => !built.has(n));
  if (!missing.length && !stale.length) return;

  const lines = [];
  if (missing.length) lines.push(`  built but not declared in system.json: ${missing.join(", ")}`);
  if (stale.length) lines.push(`  declared in system.json but not built: ${stale.join(", ")}`);
  throw new Error(`Compendium packs and manifest disagree:\n${lines.join("\n")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
