import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  // Svelte 5 with runes enabled project-wide.
  compilerOptions: { runes: true },
  preprocess: vitePreprocess(),
};
