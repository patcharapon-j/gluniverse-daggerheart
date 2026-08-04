import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const script = resolve(import.meta.dirname, "../scripts/link-dev-build.mjs");

function run(cwd) {
  return spawnSync(process.execPath, [script], { cwd, encoding: "utf8" });
}

const fixture = mkdtempSync(resolve(tmpdir(), "daggerheart-link-dev-"));

try {
  mkdirSync(resolve(fixture, "dist/module"), { recursive: true });
  mkdirSync(resolve(fixture, "dist/packs"), { recursive: true });

  // This is how Git checks out a symlink when core.symlinks=false on Windows.
  writeFileSync(resolve(fixture, "module"), "dist/module");
  writeFileSync(resolve(fixture, "packs"), "dist/packs");

  const linked = run(fixture);
  assert.equal(linked.status, 0, linked.stderr);
  assert.match(linked.stdout, /Linked module -> dist\/module/);
  assert.match(linked.stdout, /Linked packs -> dist\/packs/);

  rmSync(resolve(fixture, "module"), { recursive: true, force: true });
  writeFileSync(resolve(fixture, "module"), "user data");

  const protectedFile = run(fixture);
  assert.notEqual(protectedFile.status, 0);
  assert.match(protectedFile.stderr, /path already exists and is not a link/);
  assert.equal(readFileSync(resolve(fixture, "module"), "utf8"), "user data");

  console.log("link-dev-build: Git symlink placeholders are linked and unrelated files are protected.");
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
