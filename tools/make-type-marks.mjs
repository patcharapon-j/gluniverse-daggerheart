/* Traces the item type marks from their generated art into design/assets/types.
 *
 * The set used to be hand-authored geometry — a lozenge, a hexagon, three bars
 * — which held at 14px but sat beside the domain plates and the class sigils
 * looking like a different product. These come off the pipeline those do: the
 * Codex CLI's image tool against the style paragraph in `gen-type-marks.sh`,
 * then the trace `design/assets/domains/dread.svg` documents and Artifice,
 * Root and Void already went through.
 *
 * The art is white on a transparent ground, so the *alpha* is the shape and no
 * colour is keyed anywhere. Alpha >= 128 to a bitmap, then potrace at turdSize
 * 40 / alphaMax 1.0 / optTolerance 0.2 / turnPolicy minority.
 *
 * potrace's path data is kept **verbatim** and only its wrapping transform is
 * recomputed. The alternative — walking the path and rewriting every
 * coordinate — has to track the current point through relative cubics, where
 * only the last of three pairs advances it, and a tracer that gets that subtly
 * wrong produces a shape that is still a shape and still renders. Refitting by
 * transform cannot be subtly wrong: the curve is the one potrace emitted or it
 * is nothing. It is also what the class sigils in design/assets/classes carry,
 * so the two families stay the same kind of file.
 *
 * The refit measures the *bitmap*, not the path, which is exact and needs no
 * parsing at all: the mark's long axis goes to 234 units centred in the 250
 * box, where grace (236), splendor (231) and valor (218) already sit.
 *
 *   node tools/make-type-marks.mjs            # every PNG in the art folder
 *   node tools/make-type-marks.mjs loot gear  # just these
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pngAlpha } from "./lib/png-alpha.mjs";

const HERE = new URL("..", import.meta.url).pathname;
const ART = join(HERE, "art-src/types/generated");
const OUT = join(HERE, "design/assets/types");
const SUBJECTS = join(HERE, "art-src/types/subjects.tsv");

/** The long axis every mark is refitted to, inside the 250 box. */
const SPAN = 234;
const BOX = 250;
/** Where the ink starts, in the alpha channel. */
const INK = 128;

const subjects = new Map(
  readFileSync(SUBJECTS, "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const [name, subject, note] = l.split("\t");
      return [name.trim(), { subject: subject?.trim(), note: note?.trim() }];
    }),
);

/** alpha >= INK to a PBM, the one bitmap every potrace build reads. */
const toPbm = ({ width, height, alpha }) => {
  const row = (width + 7) >> 3;
  const bits = Buffer.alloc(row * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (alpha[y * width + x] >= INK) bits[y * row + (x >> 3)] |= 128 >> (x & 7);
  return Buffer.concat([Buffer.from(`P4\n${width} ${height}\n`, "ascii"), bits]);
};

/** The ink's bounds in image pixels, which is what the refit is measured off. */
const bounds = ({ width, height, alpha }) => {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (alpha[y * width + x] >= INK) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) throw new Error("no ink above the threshold");
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
};

const trace = (pbm) => {
  const dir = mkdtempSync(join(tmpdir(), "typemark-"));
  writeFileSync(join(dir, "in.pbm"), pbm);
  execFileSync("potrace", [
    join(dir, "in.pbm"), "--svg", "--output", join(dir, "out.svg"),
    "--turdsize", "40", "--alphamax", "1.0",
    "--opttolerance", "0.2", "--turnpolicy", "minority",
  ]);
  const svg = readFileSync(join(dir, "out.svg"), "utf8");
  const ds = [...svg.matchAll(/ d="([^"]+)"/g)].map(([, d]) => d);
  if (!ds.length) throw new Error("potrace produced no path");
  return ds;
};

/* potrace writes `translate(0,H) scale(0.1,-0.1)` over coordinates at ten
   units to the pixel, so image pixel (px,py) is path (10·px, 10·(H−py)).
   Composing that with "move the ink's top-left to (ox,oy) and scale by k"
   leaves another translate-and-flip, which is the whole of the refit. */
const transform = ({ x0, y0, w, h }, height) => {
  const k = SPAN / Math.max(w, h);
  const s = k / 10;
  const r = (v) => Number(v.toFixed(6));
  return `translate(${r((BOX - w * k) / 2 - x0 * k)},${r((BOX - h * k) / 2 + (height - y0) * k)}) scale(${r(s)},${r(-s)})`;
};

const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(ART).filter((f) => f.endsWith(".png")).map((f) => f.slice(0, -4)).sort();

for (const name of names) {
  const img = pngAlpha(readFileSync(join(ART, `${name}.png`)));
  const ds = trace(toPbm(img));
  const { subject, note } = subjects.get(name) ?? {};
  const title = name[0].toUpperCase() + name.slice(1).replace(/-/g, " ");
  const head = [
    `<!-- ${title}.${note ? ` ${note}` : ""}`,
    ``,
    `     Generated with the Codex CLI's image tool from this mark's subject in`,
    `     art-src/types/subjects.tsv — "${subject}" — against the style`,
    `     paragraph the class sigils and the Artifice, Root and Void domain`,
    `     marks were drawn to, so a type mark beside a domain mark reads as one`,
    `     family. The art is white on transparent, so the alpha is the shape.`,
    ``,
    `     Traced by tools/make-type-marks.mjs, which keeps potrace's curve and`,
    `     only refits the transform. Do not edit the path: change the subject`,
    `     or the art and re-run the tool. -->`,
  ].join("\n");
  writeFileSync(
    join(OUT, `${name}.svg`),
    `${head}\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" fill="currentColor">\n` +
      `<g transform="${transform(bounds(img), img.height)}">\n` +
      ds.map((d) => `<path d="${d}"/>`).join("\n") +
      `\n</g>\n</svg>\n`,
  );
  console.log(`${name.padEnd(16)} ${ds.length} path(s)  ${ds.join("").length} chars`);
}
