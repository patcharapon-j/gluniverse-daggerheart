import { existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteStaticCopy } from "vite-plugin-static-copy";

/**
 * Empties `dist/` except `dist/packs`. Foundry holds a LevelDB lock on the
 * packs while a world using this system is open, so Vite's own emptyOutDir
 * dies with EPERM. Pack compilation owns that directory and rewrites it in
 * place, so leaving it behind is safe.
 */
function cleanDistExceptPacks(): Plugin {
  return {
    name: "dh-clean-dist-except-packs",
    apply: "build",
    buildStart() {
      const dist = resolve("dist");
      if (!existsSync(dist)) return;
      for (const entry of readdirSync(dist)) {
        if (entry === "packs") continue;
        rmSync(join(dist, entry), { recursive: true, force: true });
      }
    },
  };
}

/**
 * Writes the bundled component CSS to BOTH dist/styles/ and the source
 * styles/ dir. Foundry loads this repo folder directly during dev — root
 * `module/` is a junction into dist/, but `styles/` is the real source dir —
 * so system.json's styles/daggerheart-components.css has to exist at the root
 * too. Writing from the in-memory bundle after every other plugin also
 * guarantees viteStaticCopy cannot clobber dist with a stale root copy.
 */
function syncComponentsCss(): Plugin {
  return {
    name: "dh-sync-components-css",
    apply: "build",
    enforce: "post",
    writeBundle(_options, bundle) {
      const asset = bundle["styles/daggerheart-components.css"];
      if (asset && asset.type === "asset") {
        writeFileSync(resolve("styles/daggerheart-components.css"), asset.source);
        writeFileSync(resolve("dist/styles/daggerheart-components.css"), asset.source);
      }
    },
  };
}

/**
 * Builds the system into `dist/` with the layout Foundry expects at the root
 * of the packaged zip:
 *
 *   dist/
 *   ├── system.json
 *   ├── module/daggerheart.js
 *   ├── styles/*.css
 *   ├── assets/
 *   └── lang/en.json
 *
 * Svelte 5 components are compiled and bundled into the single ES module
 * Foundry loads; the Svelte runtime ships inside it (no external CDN).
 */
export default defineConfig({
  build: {
    outDir: "dist",
    // Cleaning is done by cleanDistExceptPacks(); Vite's emptyOutDir would
    // rmSync dist/packs and EPERM while Foundry has the LevelDB open.
    emptyOutDir: false,
    sourcemap: true,
    target: "es2022",
    lib: {
      entry: "src/module/daggerheart.ts",
      formats: ["es"],
      fileName: () => "module/daggerheart.js",
    },
    rollupOptions: {
      output: {
        // Svelte component styles are extracted into one predictable file so
        // the manifest can load it; the hand-written token and component
        // sheets are copied separately by viteStaticCopy.
        assetFileNames: (info) => {
          const name = info.names?.[0] ?? info.name ?? "";
          if (name.endsWith(".css")) return "styles/daggerheart-components.css";
          return "styles/[name][extname]";
        },
      },
    },
  },
  plugins: [
    cleanDistExceptPacks(),
    syncComponentsCss(),
    svelte(),
    viteStaticCopy({
      targets: [
        { src: "system.json", dest: "." },
        { src: "lang", dest: "." },
        { src: "styles", dest: "." },
        { src: "assets", dest: "." },
      ],
    }),
  ],
});
