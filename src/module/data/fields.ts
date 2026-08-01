/**
 * Thin wrappers over `foundry.data.fields` so schema definitions read as
 * schemas rather than as constructor calls. Foundry's field classes are
 * untyped here (see foundry-shim.d.ts); these return `any` and are consumed
 * only inside DataModel schemas.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const F = () => foundry.data.fields;

export const int = (initial = 0, opts: Record<string, unknown> = {}): any =>
  new (F().NumberField)({ required: true, nullable: false, integer: true, initial, ...opts });

export const num = (initial = 0, opts: Record<string, unknown> = {}): any =>
  new (F().NumberField)({ required: true, nullable: false, initial, ...opts });

export const str = (initial = "", opts: Record<string, unknown> = {}): any =>
  new (F().StringField)({ required: true, blank: true, initial, ...opts });

export const choice = (
  choices: readonly string[],
  initial: string,
  opts: Record<string, unknown> = {},
): any =>
  new (F().StringField)({ required: true, blank: false, choices: [...choices], initial, ...opts });

/** A choice that is allowed to be unset — an unassigned domain, an empty slot. */
export const maybeChoice = (choices: readonly string[], opts: Record<string, unknown> = {}): any =>
  new (F().StringField)({ required: true, blank: true, choices: ["", ...choices], initial: "", ...opts });

export const bool = (initial = false): any => new (F().BooleanField)({ required: true, initial });

export const html = (initial = ""): any =>
  new (F().HTMLField)({ required: true, blank: true, initial });

export const schema = (fields: Record<string, any>, opts: Record<string, unknown> = {}): any =>
  new (F().SchemaField)(fields, opts);

export const arr = (element: any, opts: Record<string, unknown> = {}): any =>
  new (F().ArrayField)(element, opts);

export const uuid = (): any =>
  new (F().DocumentUUIDField)({ required: true, nullable: true, initial: null });

/**
 * A free-form record.
 *
 * Used where the *keys* are the data — advancement marks are keyed by
 * `tier.option`, and declaring a SchemaField per option would bake the
 * rules table into the schema, so adding a row to it would need a migration
 * to store what the player had already chosen.
 */
export const obj = (initial: Record<string, unknown> = {}): any =>
  new (F().ObjectField)({ required: true, initial });

/* ── shared shapes ───────────────────────────────────────────────────── */

/**
 * A track you mark rather than spend down: Hit Points, Stress, Armor Slots.
 * `marked` is what the sheet writes, because that is what a player does —
 * they cross a box. `value` is derived as `max - marked` purely so Foundry's
 * token bars, which assume a resource counts *down*, read the right way.
 */
export const markTrack = (max = 6): any =>
  schema({
    marked: int(0, { min: 0 }),
    max: int(max, { min: 0 }),
  });

/**
 * How a picture is placed inside a frame it does not fit.
 *
 * `x` and `y` are percentages of the frame, not of the image, so a framing
 * survives the window being resized — and they are unbounded on purpose:
 * pushing the subject past an edge is a thing people do, and a clamp here
 * would be this file deciding what a good crop looks like.
 *
 * `scale` has a floor rather than starting at one. Below 1 the picture sits
 * *inside* the frame with the panel's own colour around it, which is right
 * for a full-body drawing and wrong to forbid; the floor only stops it
 * being dragged down to nothing you could grab again.
 */
export const frame = (): any =>
  schema({
    x: num(0),
    y: num(0),
    scale: num(1, { min: 0.1, max: 8 }),
  });

/** A pool you spend from and gain into: Hope, and Fear on the GM side. */
export const pool = (max = 6): any =>
  schema({
    value: int(0, { min: 0 }),
    max: int(max, { min: 0 }),
  });

/**
 * An Experience: a phrase and the bonus it grants. `marked` is the level-up
 * bookkeeping — an Experience raised this tier cannot be raised again until
 * the next one.
 */
export const experienceField = (): any =>
  schema({
    name: str(),
    modifier: int(2),
    marked: bool(false),
  });

/**
 * A named block of rules text. Ancestries, communities, classes, subclasses
 * and stat blocks are all mostly made of these, and none of them are worth
 * being their own document.
 */
export const featureField = (): any =>
  schema({
    name: str(),
    description: html(),
  });

/** Damage as the stat blocks print it: `2d6+3 phy`. */
export const damageField = (dice = "d6", count = 1, bonus = 0): any =>
  schema({
    count: int(count, { min: 0 }),
    dice: str(dice),
    bonus: int(bonus),
    type: str("physical"),
  });
