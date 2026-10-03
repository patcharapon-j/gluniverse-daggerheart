// Near-zero-dependency static server for design iteration.
// Serves the repo root so design/*.html can reference design/assets/* directly.
// ESM, because package.json says "type": "module" and every other script in
// this repo is one. It was CommonJS, which meant `npm run preview` threw on
// its third line and the design pages — the source of truth for the look —
// could not be opened at all.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 4173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  // The compendium source is `.mjs`, and the verify page imports it directly
  // so that what it draws is the shipping data rather than a copy of it.
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  // The shader lives in a .ts module and the design pages import it from there
  // rather than copying it, which is the whole point of those pages. A browser
  // refuses a module served as anything but JavaScript, and refuses TypeScript
  // syntax once it arrives, so .ts is stripped on the way out. Before this,
  // design/condition-material.html failed to load its own module and rendered
  // three empty canvases: the live harness was dead and the only thing still
  // verifying the shader was the generated gate page, which inlines the source
  // as a string and so never noticed.
  '.ts': 'text/javascript; charset=utf-8',
};

/* esbuild is a dev dependency and already present for Vite. It is imported
   lazily so every page that needs no stripping still works in a checkout with
   no node_modules, which is how this server was used before .ts was served. */
let strip = null;
async function transformTs(source, file) {
  if (!strip) {
    const esbuild = await import('esbuild').catch(() => null);
    if (!esbuild)
      throw new Error('serving .ts needs esbuild: run npm install');
    strip = esbuild.transform ?? esbuild.default.transform;
  }
  const out = await strip(source, { loader: 'ts', format: 'esm', sourcefile: file });
  return out.code;
}

http
  .createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);

    // Redirect rather than alias. Serving design/index.html *at* "/" would make
    // every relative URL in it resolve against the root instead of /design/.
    if (rel === '/') {
      res.writeHead(302, { location: '/design/' }).end();
      return;
    }
    if (rel.endsWith('/')) rel += 'index.html';

    // The one alias. Everything the *system* asks for — a domain sigil, a
    // card's header art, an item's `img` — is written as the route Foundry
    // mounts us at, and Foundry mounts this folder there. So does this: it is
    // the same folder, and a verify page that had to rewrite those paths would
    // be verifying paths it made up rather than the ones we ship.
    //
    // Anything before the mount point goes with it, because those routes are
    // written without a leading slash and a page under /tools/verify/ resolves
    // them against itself.
    rel = rel.replace(/^.*?\/systems\/gluniverse-daggerheart\//, '/');

    const file = path.join(ROOT, rel);
    // Refuse to serve anything outside the repo.
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end('forbidden');
      return;
    }

    fs.readFile(file, async (err, buf) => {
      if (err) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('not found: ' + rel);
        return;
      }
      const ext = path.extname(file).toLowerCase();
      let body = buf;
      if (ext === '.ts') {
        try {
          body = await transformTs(buf.toString('utf8'), file);
        } catch (error) {
          res.writeHead(500, { 'content-type': 'text/plain' }).end(String(error.message ?? error));
          return;
        }
      }
      res.writeHead(200, {
        'content-type': TYPES[ext] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(body);
    });
  })
  .listen(PORT, () => console.log(`design preview  http://localhost:${PORT}/`));
