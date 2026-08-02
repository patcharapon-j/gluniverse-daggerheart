/**
 * A die that tumbles in the tray and does not travel.
 *
 * A short rest's move clears `1d4 + Tier`, and that die is a detail of a move
 * you are picking rather than a roll the table is waiting on. Through the chat
 * log it would put three or four messages between you and the one card that
 * says what the rest did, and on a table with the 3D module on it would throw
 * the whole board's worth of physics at a d4 nobody is watching. So it rolls
 * where it is read — in the panel of the card that was pressed.
 *
 * "Where it is read" used to mean a CSS tumble of our own — a number cycling
 * in a 34px cell, honest about being unsettled and not a die. With Dice So
 * Nice installed the table already has real dice, and asking them to accept a
 * flat substitute in the one place the die is *closest* to the hand is the
 * wrong trade.
 *
 * ── why not a throw ────────────────────────────────────────────────────
 * The first version of this file borrowed the module's own board: it parked
 * `game.dice3d.canvas` over the tray, resized the scene to it and called
 * `showForRoll`, which is a real physics throw. It worked, and it was wrong
 * for this box. A thrown die needs somewhere to go. In a tray a hundred and
 * forty pixels tall it bounces off two walls and comes to rest against one of
 * them, which reads as a die that got away rather than a die that was rolled,
 * and every throw was a different distance from the number you were trying to
 * read. Borrowing also meant the *board* was mid-resize for the length of the
 * throw, so anything that rendered while a rest was open drew into a tray.
 *
 * So the die is **posed**: it spins on the spot for about two seconds and
 * settles onto the face the roll already produced. That is the technique
 * `aeris-bg3-rolls` uses for its own overlay, and the trade it makes is the
 * right one here — no physics, no travel, no walls, and the die is in the
 * middle of the tray at the start and at the end.
 *
 * ── the box ────────────────────────────────────────────────────────────
 * A second `DiceBox`, built over our own container out of the module's own
 * constructors — `game.dice3d.box.constructor` and
 * `game.dice3d.box.dicefactory.constructor`. Two things make that cheaper
 * than it sounds:
 *
 * - **The factory has to be ours.** `DiceBox.initialize` calls
 *   `dicefactory.setScale` and `setQualitySettings` on whatever factory it is
 *   handed, so passing the module's would quietly resize every die on the
 *   board for the length of a rest. A fresh `DiceFactory` registers the
 *   standard presets in its constructor and needs nothing else; the cost is
 *   that a *third-party* dice system added through `game.dice3d.addSystem`
 *   is not in it, and a die that wants one falls back to standard.
 *
 * - **The renderer is not ours, and that is the point.** `DiceScene` caches
 *   its `WebGLRenderer` in `game.dice3d.dice3dRenderers[boxType]`, which is
 *   how the module gets away with a board and a dice editor at once. We take
 *   a key of our own, so this system adds **at most one** WebGL context to
 *   the page, ever, and only if a rest actually rolls something. Browsers cap
 *   live contexts around sixteen; the thing that would blow that is creating
 *   one per dialog, not holding one.
 *
 * Which is why `disposeInPlace` — called when the rest dialog closes — stops
 * the animation, empties the scene and takes the canvas back out of a dialog
 * that is about to be destroyed, but leaves the renderer in the module's
 * cache. Disposing it would force a fresh context and a fresh HDR load on the
 * next rest, and would leave a dead renderer under our key for the module to
 * hand back. `DiceEditorPreview` in that module makes the same call and says
 * so in the same words.
 *
 * ── landing on the right face ───────────────────────────────────────────
 * There is no "set this die to face V" in Dice So Nice. `swapDiceFace` is a
 * *delta* — it reads `DICE_MODELS[shape].rotationCombinations["from,to"]` and
 * needs to know what the die is showing already — and a box we construct has
 * no `throwEngine` at all, because the module only builds one for the physics
 * path. `aeris-bg3-rolls` answers this with a hardcoded quaternion table, and
 * that table covers d20 and nothing else, which is no use to a dialog whose
 * die is a d4.
 *
 * So the orientation is derived from geometry. `FACE_NORMALS` is the outward
 * normal of the face carrying each value, in the die's own local frame, for
 * every shape the module ships. Landing value V is then one rotation — the
 * shortest arc taking that normal onto the direction the result is read from
 * — plus a random yaw about that direction, so the same number does not
 * always come to rest the same way up.
 *
 * Two things about that table are worth knowing.
 *
 * It is **generated, not measured**: each normal is the plane of a face in
 * the module's own `DICE_SHAPE`, oriented outward by the sign of its centroid
 * so the winding does not matter, and paired with `faceValues[i]` — which is
 * the number printed on that face, exactly as the module's own dice editor
 * reads it when you click one. It was then checked against a second,
 * independent statement of the same fact: `rotationCombinations[a,b]` is the
 * rotation `swapDiceFace` applies to turn value a into value b, so it must
 * map normal(a) onto normal(b). All 1,272 of those entries, across all ten
 * shapes, agree — to within the whole-degree rounding of the module's own
 * Euler table, which is where the last decimal of disagreement comes from.
 * If Dice So Nice ever renumbers a model this table is wrong, and that same
 * check is what would say so.
 *
 * And **the d4 reads downward.** Every other die is read off the face nearest
 * the camera, which sits directly above; a tetrahedron at rest has no such
 * face — three of the four tie at a third of the way up, and the tie is
 * settled by floating point. What it has is a unique face pointing *down*,
 * opposite the apex whose number you read, and that is the one `faceValues`
 * is about. This is also what the module's own ancestor did, with a reference
 * vector flipped for `d4` and nothing else.
 *
 * A note for anyone comparing this with `aeris-bg3-rolls`: their table
 * resolves each value's face onto **+Z**, and the box they build has the
 * module's standard camera, which is directly overhead looking down −Y. We
 * use +Y, which is what that camera sees.
 *
 * ── failing ────────────────────────────────────────────────────────────
 * All of it is a reach into a module's insides, so all of it is guarded and
 * none of it throws. Every way out resolves `false`, at which point the
 * caller draws the CSS tumble it would have drawn anyway. A Dice So Nice
 * update that moves any of this costs the 3D die and nothing else.
 *
 * Serialised, because one box cannot be in two trays: a second call while one
 * is in flight waits for it.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "../config.ts";

/* ── the table ──────────────────────────────────────────────────────────
   Outward face normals in the die's local frame, three numbers per value,
   values 1..N in order. Generated from `DICE_SHAPE` in Dice So Nice 6.2.4
   and cross-checked against `DICE_MODELS[...].rotationCombinations`; see the
   header. `d2` is the coin, whose shape is a cylinder rather than a
   polyhedron and whose two faces the module states directly as ±Y. */
const FACE_NORMALS: Record<string, number[]> = {
  d2: [0, 1, 0, 0, -1, 0],
  d4: [
    -0.57735, -0.57735, -0.57735, -0.57735, 0.57735, 0.57735,
    0.57735, 0.57735, -0.57735, 0.57735, -0.57735, 0.57735,
  ],
  d6: [0, -1, 0, -1, 0, 0, 0, 0, -1, 0, 0, 1, 1, 0, 0, 0, 1, 0],
  d8: [
    0.57735, -0.57735, -0.57735, -0.57735, -0.57735, 0.57735,
    0.57735, -0.57735, 0.57735, -0.57735, -0.57735, -0.57735,
    0.57735, 0.57735, 0.57735, -0.57735, 0.57735, -0.57735,
    0.57735, 0.57735, -0.57735, -0.57735, 0.57735, 0.57735,
  ],
  d10: [
    -0.598519, -0.43485, 0.672815, -0.228614, 0.703602, -0.672815,
    0.73981, 0, 0.672815, -0.228614, -0.703602, -0.672815,
    0.228614, 0.703602, 0.672815, -0.73981, 0, -0.672815,
    0.228614, -0.703602, 0.672815, 0.598519, 0.43485, -0.672815,
    -0.598519, 0.43485, 0.672815, 0.598519, -0.43485, -0.672815,
  ],
  d12: [
    0.525731, 0, -0.850651, 0.850651, 0.525731, 0,
    -0.850651, 0.525731, 0, 0, 0.850651, -0.525731,
    0, -0.850651, -0.525731, -0.525731, 0, -0.850651,
    0.525731, 0, 0.850651, 0, 0.850651, 0.525731,
    0, -0.850651, 0.525731, 0.850651, -0.525731, 0,
    -0.850651, -0.525731, 0, -0.525731, 0, 0.850651,
  ],
  d14: [
    -0.755201, 0.633645, -0.167826, -0.606383, 0.632156, 0.482368,
    -0.001466, 0.636112, 0.771595, 0.604975, 0.637637, 0.47689,
    0.751723, 0.636171, -0.173777, 0.337035, 0.637434, -0.692882,
    -0.335182, 0.637865, -0.693384, 0.335182, -0.637865, 0.693384,
    -0.337035, -0.637434, 0.692882, -0.751723, -0.636171, 0.173777,
    -0.604976, -0.637636, -0.47689, 0.001465, -0.636109, -0.771597,
    0.606383, -0.632156, -0.482369, 0.7552, -0.633646, 0.167826,
  ],
  d16: [
    -0.265242, 0.67464, -0.688845, -0.678598, 0.678598, -0.281087,
    -0.678598, 0.678598, 0.281087, -0.287963, 0.680245, 0.674051,
    0.286842, 0.679979, 0.674796, 0.678598, 0.678598, 0.281087,
    0.678598, 0.678598, -0.281087, 0.264177, 0.674366, -0.689522,
    0.272924, -0.680262, -0.680262, 0.678131, -0.679144, -0.280894,
    0.681987, -0.674605, 0.282491, 0.299185, -0.674718, 0.674718,
    -0.300561, -0.674412, 0.674412, -0.683099, -0.673287, 0.282951,
    -0.679238, -0.677847, -0.281352, -0.274199, -0.680006, -0.680006,
  ],
  d20: [
    0.934172, 0.356822, 0, -0.57735, -0.57735, 0.57735,
    0, 0.934172, -0.356822, 0, -0.934172, -0.356822,
    0.57735, -0.57735, 0.57735, -0.356822, 0, -0.934172,
    0.57735, 0.57735, 0.57735, -0.934172, 0.356822, 0,
    0.356822, 0, -0.934172, -0.57735, 0.57735, 0.57735,
    0.57735, -0.57735, -0.57735, -0.356822, 0, 0.934172,
    0.934172, -0.356822, 0, -0.57735, -0.57735, -0.57735,
    0.356822, 0, 0.934172, -0.57735, 0.57735, -0.57735,
    0, 0.934172, 0.356822, 0, -0.934172, 0.356822,
    0.57735, 0.57735, -0.57735, -0.934172, -0.356822, 0,
  ],
  d24: [
    -0.357211, 0.863018, -0.357211, 0.357211, -0.863018, -0.357211,
    -0.86284, 0.357584, 0.357268, 0.357268, -0.357584, -0.86284,
    -0.357268, -0.357584, 0.86284, 0.86284, 0.357268, 0.357584,
    0.863018, -0.357211, 0.357211, 0.357268, 0.357584, 0.86284,
    -0.357268, 0.357584, -0.86284, -0.86284, -0.357584, 0.357268,
    -0.357268, -0.86284, -0.357584, 0.357268, 0.86284, -0.357584,
    -0.357211, -0.863018, 0.357211, 0.357211, 0.863018, 0.357211,
    0.863018, 0.357211, -0.357211, 0.357211, -0.357211, 0.863018,
    -0.357211, -0.357211, -0.863018, -0.863018, 0.357211, -0.357211,
    -0.86284, -0.357584, -0.357268, 0.357211, 0.357211, -0.863018,
    -0.357211, 0.357211, 0.863018, 0.863018, -0.357211, -0.357211,
    -0.357268, 0.86284, 0.357584, 0.357268, -0.86284, 0.357584,
  ],
  d30: [
    0, 1, 0, -0.499985, -0.308991, 0.809037,
    -0.499985, -0.30899, -0.809037, 0.809037, -0.499985, 0.30899,
    -0.809037, 0.499985, 0.30899, 0.809037, 0.499985, -0.30899,
    -1, 0, 0, 0.499985, -0.308991, -0.809037,
    -0.30899, 0.809037, -0.499985, -0.30899, -0.809037, -0.499985,
    0.499985, -0.308991, 0.809037, -0.809037, -0.499985, -0.308991,
    0.30899, 0.809037, -0.499985, -0.308991, 0.809037, 0.499985,
    0, 0, -1, 0, 0, 1,
    0.30899, -0.809037, -0.499985, -0.308991, -0.809037, 0.499985,
    0.809037, 0.499985, 0.30899, -0.499985, 0.30899, -0.809037,
    0.308991, 0.809037, 0.499985, 0.308991, -0.809037, 0.499985,
    -0.499985, 0.30899, 0.809037, 1, 0, 0,
    -0.809037, -0.499985, 0.30899, 0.809037, -0.499985, -0.308991,
    -0.809037, 0.499985, -0.30899, 0.499985, 0.308991, 0.809037,
    0.499985, 0.308991, -0.809037, 0, -1, 0,
  ],
};

/** The one shape whose result is the face pointing away from the camera. */
const READS_DOWNWARD = new Set(["d4"]);

/**
 * Our own key into `game.dice3d.dice3dRenderers`, and the box's `boxType`.
 *
 * Anything other than `"board"` turns off physics, interactivity, persistent
 * dice and the post-processing passes in `DiceBox.initialize`, which is
 * exactly what we want. The name is this system's so that a table running
 * another module that does the same trick — `aeris-bg3-rolls` uses
 * `"shared-dice-box"` — does not find our canvas in its container.
 */
const BOX_TYPE = "gluniverse-dh-tray";

/**
 * How much of the tray's short side the die's widest silhouette may take.
 *
 * Measured against the bounding sphere rather than the shape, so it is the
 * worst case at every angle of the tumble and nothing ever clips. The die
 * also sits its own radius above the desk, which is a little nearer the
 * camera than the plane this is measured on, and the headroom covers that.
 */
const FILL = 0.5;

/** More than a handful cannot be posed in a row without shrinking to nothing. */
const MAX_DICE = 4;

const SPIN_MS = 1800;
const SPIN_JITTER_MS = 200;

/** The tail of the queue. One tray at a time, in the order asked for. */
let queue: Promise<unknown> = Promise.resolve();

let box: any = null;
let factory: any = null;
/** The tray the box is currently parked over. */
let host: HTMLElement | null = null;
let observer: ResizeObserver | null = null;
let raf: number | null = null;
let placed: any[] = [];
/**
 * How a spin in flight is let go of.
 *
 * Cancelling the frame alone would leave the promise the caller is awaiting
 * with nothing left to resolve it, and the queue behind it would never move
 * again — so the two always happen together.
 */
let release: (() => void) | null = null;
/** Bumped by `disposeInPlace`, so an animation in flight knows to stop. */
let generation = 0;

/* ── quaternion arithmetic ──────────────────────────────────────────────
   Written out rather than imported. The module's meshes carry three.js
   objects and `mesh.quaternion.set(x,y,z,w)` takes plain numbers, so all we
   need is the maths — and bundling a second copy of three purely to say
   `slerp` would be a second copy of three. */

type Vec3 = [number, number, number];
type Quat = [number, number, number, number];

const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function normalize3(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** The shortest rotation taking unit `a` onto unit `b`. */
function align(a: Vec3, b: Vec3): Quat {
  const w = dot3(a, b) + 1;
  if (w < 1e-6) {
    // Antipodal: any axis perpendicular to `a` does it. Pick the one that
    // is furthest from degenerate.
    const q: Quat =
      Math.abs(a[0]) > Math.abs(a[2]) ? [-a[1], a[0], 0, 0] : [0, -a[2], a[1], 0];
    return qNorm(q);
  }
  return qNorm([
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
    w,
  ]);
}

function qNorm(q: Quat): Quat {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}

function qMul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function qAxisAngle(axis: Vec3, angle: number): Quat {
  const h = angle / 2;
  const s = Math.sin(h);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(h)];
}

function qSlerp(a: Quat, b: Quat, t: number): Quat {
  let [bx, by, bz, bw] = b;
  let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (cos < 0) {
    cos = -cos;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }
  if (cos > 0.9995) {
    return qNorm([
      a[0] + (bx - a[0]) * t,
      a[1] + (by - a[1]) * t,
      a[2] + (bz - a[2]) * t,
      a[3] + (bw - a[3]) * t,
    ]);
  }
  const theta = Math.acos(cos);
  const sin = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sin;
  const wb = Math.sin(t * theta) / sin;
  return [a[0] * wa + bx * wb, a[1] * wa + by * wb, a[2] * wa + bz * wb, a[3] * wa + bw * wb];
}

function randomAxis(): Vec3 {
  // Rejection-free: a normalised gaussian-ish triple is close enough for a
  // spin axis, and the degenerate case is caught by `normalize3`.
  return normalize3([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]);
}

function randomQuat(): Quat {
  // Shoemake. An even spread over orientations, so the die does not start
  // from a family of poses.
  const u1 = Math.random();
  const u2 = Math.random() * Math.PI * 2;
  const u3 = Math.random() * Math.PI * 2;
  const a = Math.sqrt(1 - u1);
  const b = Math.sqrt(u1);
  return [a * Math.sin(u2), a * Math.cos(u2), b * Math.sin(u3), b * Math.cos(u3)];
}

/* ── the module ─────────────────────────────────────────────────────── */

/** Whether a 3D die is available *and* wanted for this roll right now. */
export function canRollInPlace(): boolean {
  try {
    // The user's own switch. It is labelled "3D dice on rolls" and this is a
    // roll — a table that turned the dice off should not meet them in a
    // dialog because the dialog thought it knew better.
    if (!game.settings?.get(SYSTEM_ID, "diceSoNice")) return false;
    const d = (game as any).dice3d;
    return !!(
      d?.box?.initialized &&
      d.dice3dRenderers &&
      d.uniforms &&
      typeof d.box.constructor === "function" &&
      typeof d.box.dicefactory?.constructor === "function"
    );
  } catch {
    return false;
  }
}

/**
 * Pose an already-evaluated roll's dice in `tray` and spin them onto their
 * faces.
 *
 * @returns whether the 3D dice actually ran. `false` means nothing was drawn
 * and the caller still owes the reader some sign that a die was thrown.
 */
export function rollInPlace(roll: any, tray: HTMLElement): Promise<boolean> {
  const run = queue.then(() => spinInto(roll, tray).catch(() => false));
  // The queue must never hold a rejection, or every later throw inherits it.
  queue = run.catch(() => {});
  return run;
}

/**
 * Give the tray back.
 *
 * Called when the rest dialog closes. Stops the animation, empties the scene
 * and lifts the canvas out of an element that is about to stop existing — but
 * leaves the renderer where the module caches it, because a context we
 * destroy is a context the next rest has to build, and the module would hand
 * the dead one back under our key. See the header.
 */
export function disposeInPlace(): void {
  generation++;
  try {
    if (raf !== null) cancelAnimationFrame(raf);
  } catch {
    /* nothing */
  }
  raf = null;
  try {
    release?.();
  } catch {
    /* nothing */
  }
  release = null;
  try {
    observer?.disconnect();
  } catch {
    /* nothing */
  }
  observer = null;
  host = null;
  clearDice();
  try {
    // Geometry and materials are cached on the factory and shared with the
    // next die of the same type, so they are not ours to dispose.
    box?.renderer?.domElement?.remove();
  } catch {
    /* nothing */
  }
}

/**
 * Empty the scene of dice.
 *
 * One rest takes two or three moves and each rolls into the card it was
 * pressed on, so the canvas travels between trays — and a die left in the
 * scene would arrive in the next tray alongside the new one, sharing a
 * layout that was measured for one.
 */
function clearDice(): void {
  try {
    for (const mesh of placed) box?.scene?.remove(mesh);
  } catch {
    /* nothing */
  }
  placed = [];
}

/** The die type Dice So Nice knows this term by, or null if it does not. */
function typeOf(term: any): string | null {
  const t = foundry.dice.terms as any;
  if (t?.Coin && term instanceof t.Coin) return "d2";
  if (t?.FateDie && term instanceof t.FateDie) return "df";
  const faces = Number(term?.faces);
  return Number.isInteger(faces) && faces > 1 ? `d${faces}` : null;
}

/**
 * The shape-face value that shows `value` on this preset.
 *
 * A preset's `values` are the numbers printed on it, and a shape's faces are
 * numbered 1..N; a d3 is a d6 with its three values printed twice, so face
 * `f` shows `values[(f - 1) % values.length]`. Several faces can carry the
 * same number, and one is picked at random — which is the honest answer and
 * also stops a d3 always landing the same way up.
 */
function shapeFaceFor(preset: any, shape: string, value: number): number | null {
  const values: any[] = preset?.values ?? [];
  const table = FACE_NORMALS[shape];
  if (!table || !values.length) return null;
  const count = table.length / 3;
  const hits: number[] = [];
  for (let f = 1; f <= count; f++) {
    if (values[(f - 1) % values.length] === value) hits.push(f);
  }
  return hits[Math.floor(Math.random() * hits.length)] ?? null;
}

/** How the user has this die painted, read the way the module reads it. */
function appearanceFor(type: string, term: any): { appearance: any; library: any } | null {
  const Dice3D = (game as any).dice3d?.constructor;
  if (!Dice3D?.ALL_CUSTOMIZATION) return null;
  const config = Dice3D.ALL_CUSTOMIZATION(game.user, factory);
  // `term.options.colorset` is what the module checks first and what this
  // system sets on its own duality dice, so a die that named a colorset
  // wears it here too.
  const notation = term?.options?.colorset ? { options: { ...term.options } } : null;
  let appearance: any = null;
  try {
    appearance = factory.getAppearanceForDice(config.appearance, type, notation);
  } catch {
    appearance = null;
  }
  if (!appearance) {
    try {
      appearance = factory.getAppearanceForDice(config.appearance, type);
    } catch {
      return null;
    }
  }
  return { appearance, library: config.diceLibrary ?? null };
}

/** Build the box once, or hand back the one we have, parked over `tray`. */
async function ensureBox(tray: HTMLElement, width: number, height: number): Promise<boolean> {
  const d = (game as any).dice3d;
  if (!box) {
    try {
      const DiceBoxCtor = d.box.constructor;
      const DiceFactoryCtor = d.box.dicefactory.constructor;
      factory = new DiceFactoryCtor();
      const config = foundry.utils.deepClone(d.box.config);
      config.boxType = BOX_TYPE;
      config.autoscale = false;
      config.dimensions = { width, height };
      // Nothing collides in here, so there is nothing to make a noise about.
      config.sounds = false;
      box = new DiceBoxCtor(tray, factory, config);
      await box.initialize();
    } catch {
      // A half-built box would fail every later rest silently, so it is
      // dropped and the next one starts over.
      box = null;
      factory = null;
      return false;
    }
  } else if (box.renderer?.domElement?.parentElement !== tray) {
    // The canvas is cached with the renderer and follows us from tray to
    // tray, exactly as it does between the module's own board and editor.
    tray.appendChild(box.renderer.domElement);
  }

  /* The box and its scene each keep the container they were built over, and
     `setScene` measures *that* element rather than the one the canvas is in
     — so a rest's second move would be sized by the first move's card. */
  host = tray;
  box.container = tray;
  if (box.diceScene) box.diceScene.container = tray;

  const canvas: HTMLElement | undefined = box.renderer?.domElement;
  if (!canvas) return false;
  /* Absolute, because the tray is a flex column holding the caption and the
     card's own plate and the die is meant to be *behind* them rather than
     another row. `.tray::after` — the gold seam — sits at z-index 2. */
  canvas.style.position = "absolute";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.zIndex = "1";
  canvas.style.pointerEvents = "none";

  box.setScene({ width, height, margin: { top: 0, right: 0, bottom: 0, left: 0 } });

  if (!observer) {
    // Reads `host` rather than closing over a tray, because the tray changes
    // with every move and the observer does not.
    observer = new ResizeObserver(() => {
      try {
        const w = host?.clientWidth ?? 0;
        const h = host?.clientHeight ?? 0;
        if (w < 24 || h < 24) return;
        box.setScene({ width: w, height: h, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
        box.renderScene();
      } catch {
        /* nothing */
      }
    });
  }
  observer.disconnect();
  observer.observe(tray);
  return true;
}

async function spinInto(roll: any, tray: HTMLElement): Promise<boolean> {
  if (!canRollInPlace()) return false;

  const width = tray.clientWidth;
  const height = tray.clientHeight;
  if (width < 40 || height < 40) return false;

  /* Every die the roll actually kept, in the order it is printed. A dropped
     die is not on the card and should not be in the tray either. */
  const wanted: { type: string; value: number; term: any }[] = [];
  for (const term of (roll?.dice ?? []) as any[]) {
    const type = typeOf(term);
    if (!type) return false;
    for (const r of term.results ?? []) {
      if (r.active === false || r.discarded) continue;
      wanted.push({ type, value: r.result, term });
    }
  }
  if (!wanted.length || wanted.length > MAX_DICE) return false;

  if (!(await ensureBox(tray, width, height))) return false;
  const mine = ++generation;
  clearDice();

  /* The visible half-extents of the scene at the desk, in world units. The
     module's camera sits directly above at a height chosen so that the
     container's own height fills a twenty-degree field, so the half-extent
     along the screen's vertical *is* `containerHeight`; the horizontal one
     follows from the canvas aspect. */
  const display = box.display;
  const hz = display.containerHeight / (display.aspect || 1);
  const hx = hz * (display.currentWidth / display.currentHeight || 1);
  if (!(hz > 0) || !(hx > 0)) return false;

  const n = wanted.length;
  const radius = Math.min(hz * FILL, (1.8 * hx) / (2.4 * n - 0.4));

  const spins: {
    mesh: any;
    start: Quat;
    target: Quat;
    axis: Vec3;
    turns: number;
    duration: number;
  }[] = [];

  for (let i = 0; i < n; i++) {
    const { type, value, term } = wanted[i]!;
    const painted = appearanceFor(type, term);
    if (!painted) return abort(mine);

    const preset = factory.getPresetBySystem?.(type, painted.appearance.system) ?? factory.get?.(type);
    const shape: string | undefined = preset?.shape;
    const table = shape ? FACE_NORMALS[shape] : undefined;
    if (!shape || !table) return abort(mine);

    const face = shapeFaceFor(preset, shape, value);
    if (!face) return abort(mine);

    let mesh: any = null;
    try {
      mesh = await factory.create(box.renderer.scopedTextureCache, type, painted.appearance, painted.library);
    } catch {
      mesh = null;
    }
    if (!mesh || generation !== mine) return abort(mine);

    // A custom GLTF preset carries its own scale on the mesh rather than in
    // the geometry. Uniform scales commute with rotation, so folding it in
    // here is the same as the wrapper object the module's showcase builds.
    if (mesh.userData?.modelScale) mesh.scale.multiplyScalar(mesh.userData.modelScale);

    const geom = mesh.geometry;
    try {
      if (geom && !geom.boundingSphere) geom.computeBoundingSphere?.();
    } catch {
      /* nothing */
    }
    const native = geom?.boundingSphere?.radius;
    if (!(native > 0)) return abort(mine);

    // The module's non-board scenes draw dice at a fixed "showcase" size
    // that has nothing to do with the container, so the fit is ours to make.
    mesh.scale.multiplyScalar(radius / (native * (mesh.scale.x || 1)));
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    const x = n === 1 ? 0 : (i - (n - 1) / 2) * radius * 2.4;
    // Sitting on the desk rather than through it: the shadow plane is at
    // y = 0 and the camera is straight overhead, so a die centred there
    // would be half underneath a surface nobody can see.
    mesh.position.set(x, radius, 0);

    const o = (face - 1) * 3;
    const normal: Vec3 = [table[o] ?? 0, table[o + 1] ?? 0, table[o + 2] ?? 0];
    const up: Vec3 = READS_DOWNWARD.has(shape) ? [0, -1, 0] : [0, 1, 0];
    // Yaw about the reading direction leaves the face where it is, so the
    // number can come to rest any way round without ever being wrong.
    const target = qMul(qAxisAngle([0, 1, 0], Math.random() * Math.PI * 2), align(normal, up));
    const start = randomQuat();

    mesh.quaternion.set(start[0], start[1], start[2], start[3]);
    mesh.notation = { type };
    mesh.result = value;

    box.scene.add(mesh);
    placed.push(mesh);

    spins.push({
      mesh,
      start,
      target,
      axis: randomAxis(),
      turns: 3 + Math.floor(Math.random() * 3),
      duration: SPIN_MS + (Math.random() * 2 - 1) * SPIN_JITTER_MS,
    });
  }

  const settle = () => {
    for (const s of spins) {
      s.mesh.quaternion.set(s.target[0], s.target[1], s.target[2], s.target[3]);
    }
    try {
      box.renderScene();
    } catch {
      /* nothing */
    }
  };

  /* A reader who has asked for less motion gets the answer and not the
     journey: the die is posed on its face and simply appears. */
  let reduced = false;
  try {
    reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  } catch {
    /* nothing */
  }
  if (reduced) {
    settle();
    await fade(box.renderer.domElement, 220);
    return true;
  }

  const longest = Math.max(...spins.map((s) => s.duration));
  await new Promise<void>((resolve) => {
    release = resolve;
    const t0 = performance.now();
    const step = () => {
      if (generation !== mine) return resolve();
      const now = performance.now();
      let done = true;
      for (const s of spins) {
        const raw = Math.min(1, (now - t0) / s.duration);
        if (raw < 1) done = false;
        // power2.out — fast off the mark and long in the settle, which is
        // what makes a posed die read as a thrown one.
        const e = 1 - (1 - raw) * (1 - raw);
        const base = qSlerp(s.start, s.target, e);
        // Whole turns on the same clock, so the spin is exactly identity at
        // the end and the die lands on its face rather than near it.
        const spin = qAxisAngle(s.axis, Math.PI * 2 * s.turns * e);
        const q = qMul(spin, base);
        s.mesh.quaternion.set(q[0], q[1], q[2], q[3]);
      }
      try {
        box.renderScene();
      } catch {
        return resolve();
      }
      if (done || now - t0 > longest + 500) return resolve();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  });

  release = null;
  if (generation !== mine) return true;
  raf = null;
  settle();
  return true;
}

/** Take back whatever we had put in the scene, and report the failure. */
function abort(mine: number): false {
  if (generation === mine) {
    clearDice();
    try {
      box?.renderScene();
    } catch {
      /* nothing */
    }
  }
  return false;
}

/** A short arrival for the reduced-motion path, cleaned up after itself. */
function fade(el: HTMLElement | undefined, ms: number): Promise<void> {
  if (!el) return Promise.resolve();
  return new Promise((resolve) => {
    el.style.transition = `opacity ${ms}ms ease-out`;
    el.style.opacity = "0";
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      setTimeout(() => {
        el.style.transition = "";
        el.style.opacity = "";
        resolve();
      }, ms);
    });
  });
}
