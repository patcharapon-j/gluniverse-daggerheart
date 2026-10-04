/* The alpha channel of a PNG, as bytes, with no dependency.
 *
 * The marks this repo traces arrive as white on transparent, so the *shape* is
 * the alpha and nothing is keyed by colour. Decoding that needs inflate, which
 * node has, and unfiltering, which is the twenty lines below — against pulling
 * in an image library for one channel of one file type. `flatten.mjs` upstream
 * reaches for a headless Chrome to do the same job; this is the same job
 * without the browser.
 *
 * Handles the 8-bit colour types that carry an alpha channel (6 = RGBA, 4 =
 * grey+alpha) and the two that do not (2 = RGB, 0 = grey), where every pixel
 * is opaque and the caller gets 255s. Interlaced PNGs and 16-bit depth throw
 * rather than decode wrong: the generator does not emit either.
 */
import { inflateSync } from "node:zlib";

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
/** Bytes per pixel, by PNG colour type. */
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/* `luminance`: for an opaque PNG, read the ink off brightness rather than
   returning 255s. Midjourney draws white on black and has no alpha to give. */
export function pngAlpha(buf, { luminance = false } = {}) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error("not a PNG");
  let width = 0;
  let height = 0;
  let depth = 0;
  let colour = 0;
  const idat = [];
  for (let at = 8; at < buf.length; ) {
    const len = buf.readUInt32BE(at);
    const tag = buf.toString("ascii", at + 4, at + 8);
    const body = buf.subarray(at + 8, at + 8 + len);
    if (tag === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      depth = body[8];
      colour = body[9];
      if (depth !== 8) throw new Error(`bit depth ${depth} is not 8`);
      if (body[12] !== 0) throw new Error("interlaced PNG");
      if (!(colour in CHANNELS)) throw new Error(`colour type ${colour}`);
    } else if (tag === "IDAT") idat.push(body);
    else if (tag === "IEND") break;
    at += 12 + len;
  }
  const bpp = CHANNELS[colour];
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(width * height);
  // Opaque colour types have no alpha to read; every pixel is solid.
  const opaque = colour === 0 || colour === 2;
  let prev = Buffer.alloc(stride);
  for (let y = 0, at = 0; y < height; y++) {
    const filter = raw[at++];
    const line = Buffer.from(raw.subarray(at, at + stride));
    at += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      if (filter === 1) line[i] = (line[i] + a) & 255;
      else if (filter === 2) line[i] = (line[i] + b) & 255;
      else if (filter === 3) line[i] = (line[i] + ((a + b) >> 1)) & 255;
      else if (filter === 4) line[i] = (line[i] + paeth(a, b, c)) & 255;
      else if (filter !== 0) throw new Error(`filter ${filter}`);
    }
    for (let x = 0; x < width; x++) {
      out[y * width + x] = !opaque
        ? line[x * bpp + bpp - 1]
        : !luminance ? 255
        : colour === 0 ? line[x]
        : Math.round(0.299 * line[x * 3] + 0.587 * line[x * 3 + 1] + 0.114 * line[x * 3 + 2]);
    }
    prev = line;
  }
  return { width, height, alpha: out };
}
