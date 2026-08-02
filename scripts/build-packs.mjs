/**
 * Compiles compendium source into LevelDB packs under `dist/packs/`.
 *
 * Source lives in `src/packs-src/*.mjs` as normalized document objects (see
 * `_helpers.mjs`). This script:
 *   1. gives each document a STABLE `_id` derived from pack + type + name, so
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
];

/** The Foundry envelope around a normalized entry. */
function itemDoc(packName, entry, folderId) {
  const id = stableId(`${packName}:${entry.type}:${entry.name}`);
  return {
    _id: id,
    _key: `!items!${id}`,
    name: entry.name,
    type: entry.type,
    img: entry.img,
    system: entry.system,
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

      const doc = itemDoc(pack.name, { ...entry, sort: (sort += 1000) }, folderId);
      if (seen.has(doc._id)) {
        throw new Error(
          `Duplicate id in "${pack.name}": "${entry.name}" collides with "${seen.get(doc._id)}". ` +
            `Ids are derived from type + name — rename one to disambiguate.`,
        );
      }
      seen.set(doc._id, entry.name);
      writeFileSync(join(stage, `${doc._id}.json`), JSON.stringify(doc, null, 2));
    }

    await compilePack(stage, join(OUT, pack.name), { log: false });
    rmSync(stage, { recursive: true, force: true });
    summary.push(`  ${pack.name.padEnd(14)} ${String(seen.size).padStart(4)} docs  ${folders.size} folders`);
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
