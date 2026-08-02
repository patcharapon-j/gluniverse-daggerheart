/**
 * Bumps the system's version in the three files that carry it, and prints the
 * new version.
 *
 *     node scripts/bump-version.mjs hotfix|minor|major
 *
 * `system.json` is the authority — it is what Foundry reads and what the
 * release publishes — so the current version is read from there and the other
 * two are brought into line rather than consulted. `package.json` is private
 * and never published; keeping it in step is for `npm version`-shaped tooling
 * and for anybody reading the repo, not for a registry.
 *
 * The manifest's `download` URL names a tag that does not exist yet, which is
 * the one thing here that has to be written before the build rather than after
 * it: `vite build` copies `system.json` into `dist/`, and the copy inside the
 * zip is the one a user's Foundry reads when it checks for the next update.
 * `manifest` is left alone — it points at `releases/latest`, which is stable by
 * construction and must stay that way or every installed copy stops seeing
 * updates the moment a release is superseded.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BUMPS = { hotfix: 2, patch: 2, minor: 1, major: 0 };

const kind = process.argv[2];
if (!(kind in BUMPS)) {
  console.error(`Usage: node scripts/bump-version.mjs ${Object.keys(BUMPS).join("|")}`);
  process.exit(1);
}

/** Reads a JSON file, preserving nothing but its data — all three are ours. */
const read = (name) => JSON.parse(readFileSync(resolve(name), "utf8"));
const write = (name, data) => writeFileSync(resolve(name), `${JSON.stringify(data, null, 2)}\n`);

const system = read("system.json");

const parts = String(system.version).split(".").map(Number);
if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0)) {
  throw new Error(`system.json version is not major.minor.patch: ${system.version}`);
}

const index = BUMPS[kind];
parts[index] += 1;
for (let i = index + 1; i < parts.length; i += 1) parts[i] = 0;
const version = parts.join(".");

system.version = version;
if (typeof system.download === "string") {
  const download = system.download.replace(/\/releases\/download\/[^/]+\//, `/releases/download/v${version}/`);
  if (download === system.download) {
    throw new Error(`Could not find a tag to rewrite in system.json download: ${system.download}`);
  }
  system.download = download;
}
write("system.json", system);

const pkg = read("package.json");
pkg.version = version;
write("package.json", pkg);

try {
  const lock = read("package-lock.json");
  lock.version = version;
  if (lock.packages?.[""]) lock.packages[""].version = version;
  write("package-lock.json", lock);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

// The workflow reads both off stdout; a human reads the second line.
if (process.env.GITHUB_OUTPUT) {
  writeFileSync(process.env.GITHUB_OUTPUT, `version=${version}\ntag=v${version}\n`, { flag: "a" });
}
console.log(version);
