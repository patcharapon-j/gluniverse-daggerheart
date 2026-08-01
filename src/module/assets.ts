/**
 * Turning a Foundry path into something CSS will actually fetch.
 *
 * Foundry hands out document paths relative to the user data root —
 * `systems/…/assets/x.png`, `worlds/…/art/y.webp` — and everywhere else in
 * the client that is exactly right. In a `url()` it is not, and the way it
 * fails is worth naming because nothing about it looks like a path bug.
 *
 * A relative `url()` is resolved against the **stylesheet** that the
 * declaration came from, not against the document. Our art arrives through a
 * custom property (`--art`, `--pic`) set inline, and the browser resolves it
 * where the property is *substituted* — inside `styles/sheet.css`. So
 * `systems/x/assets/a.png` was fetched from `styles/systems/x/assets/a.png`,
 * a 404 that renders as an empty panel with no error anyone would connect to
 * the picture they just chose.
 *
 * `getRoute` rather than a leading slash, because a Foundry served under a
 * route prefix has one and hardcoding `/` would break exactly those installs.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Absolute, or already absolute. */
export function absolute(path: string): string {
  if (!path) return "";
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(path)) return path;
  return (foundry as any).utils.getRoute(path);
}

/**
 * A `url()` a stylesheet can resolve, or `none`.
 *
 * Double quotes and no encoding pass: a filename with a space is legal
 * inside a quoted `url()`, and running `encodeURI` over a path that Foundry
 * already encoded turns `%20` into `%2520`.
 */
export const cssUrl = (path?: string): string =>
  path ? `url("${absolute(path).replace(/["\\]/g, "\\$&")}")` : "none";
