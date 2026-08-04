/**
 * Points the repo root at the build output so Foundry can load this folder
 * in place during development. `system.json` names `module/daggerheart.js`
 * and `packs/*`, both of which live in `dist/`; junctioning them keeps one
 * manifest correct for both the dev folder and the packaged zip.
 */

import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, symlinkSync, unlinkSync } from "node:fs";
import { relative, resolve } from "node:path";

const links = [
  ["module", "dist/module"],
  ["packs", "dist/packs"],
];

for (const [linkPath, targetPath] of links) {
  const link = resolve(linkPath);
  const target = resolve(targetPath);

  // packs/ is legitimately empty until there is compendium content to compile.
  if (!existsSync(target)) mkdirSync(target, { recursive: true });

  if (existsSync(link)) {
    const stat = lstatSync(link);
    if (!stat.isSymbolicLink()) {
      // With core.symlinks=false, Git checks out a symlink as a regular file
      // whose contents are the link target. Replace only that exact placeholder.
      const isGitSymlinkPlaceholder = stat.isFile() && readFileSync(link, "utf8") === targetPath;
      if (isGitSymlinkPlaceholder) {
        unlinkSync(link);
      } else {
        throw new Error(`Cannot link ${linkPath}: the path already exists and is not a link.`);
      }
    } else {
      const currentTarget = resolve(linkPath, "..", readlinkSync(link));
      if (currentTarget !== target) {
        throw new Error(`Cannot link ${linkPath}: it points outside ${targetPath}.`);
      }

      console.log(`${linkPath} already links to ${targetPath}`);
      continue;
    }
  }

  const linkTarget = process.platform === "win32" ? target : relative(resolve(linkPath, ".."), target);
  symlinkSync(linkTarget, link, process.platform === "win32" ? "junction" : "dir");
  console.log(`Linked ${linkPath} -> ${targetPath}`);
}
