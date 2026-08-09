/**
 * The change log.
 *
 * Everything else this system puts in chat is an event somebody chose: a roll,
 * a card shown, a rest taken, a character finished. This is the opposite — the
 * record of what happened to a sheet while nobody was posting anything. A
 * player marks three Stress and the GM, looking at the map, has no idea; a card
 * comes out of the vault and the only witness is the sheet it happened on.
 *
 * **It observes the document rather than instrumenting the writers.** There are
 * fifteen or so call sites that move one of these numbers — the damage dialog,
 * a claim on a chat card, the roll popover paying for an Experience, a chit, a
 * pip on the rail, the adjust tab, somebody's macro — and a `log()` on each is
 * a list that is wrong the first time one is added and says nothing about the
 * ones that were never routed through a method at all. One hook on the update
 * catches every one of them, including the ones that do not exist yet. It is
 * `syncVulnerable`'s argument: the document is the record, so read the record.
 *
 * The old value comes through `options` rather than out of a second snapshot,
 * because `preUpdate*` is the only moment the document still holds it and
 * `preUpdate*` can be cancelled. Writing what was there into the options the
 * update is carrying means a cancelled write leaves nothing behind — there is
 * no `update` hook to read it back.
 *
 * **Where it lands is `activity-log.ts` and no longer chat.** That file argues
 * the move; what it changes here is one word in the gate. `options` travel to
 * every client with the update, so the before-state is on the GM's client
 * whoever pressed the button, and the client that buffers and posts is now the
 * one whose record it is rather than the one that started it. The stamp stays
 * where it was, which is what keeps `muteLedger` working across the wire: it
 * is read on the initiating client, and an unstamped update says nothing to
 * anybody.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID, domainDef } from "./config.ts";
import { type LedgerEntry } from "./ui/ledger.js";
import { recordActivity } from "./activity-log.ts";
import { resourceMax } from "./data/resources.ts";

/** The four printed tracks, and what each is called in `system.resources`. */
const TRACKS = ["hitPoints", "stress", "armorSlots"] as const;

/**
 * How long after the last change the window closes.
 *
 * The unit is the change, not the write. Applying damage is four writes —
 * armour, stress, hope, hit points — inside about fifty milliseconds, and one
 * event; a player fixing a miscount is three clicks in two seconds and one
 * correction. A second is comfortably longer than either and comfortably
 * shorter than the gap between two things that genuinely happened.
 */
const QUIET = 1200;

/**
 * And how long the window may stay open regardless.
 *
 * Without a ceiling a steady drip never posts: one press a second holds the
 * buffer open forever and the log stays empty through the whole fight. Six
 * seconds is the point at which "still happening" stops being true.
 */
const CEILING = 6000;

interface Pending {
  actor: any;
  /** When this window opened, for {@link CEILING}. */
  opened: number;
  timer: ReturnType<typeof setTimeout> | null;
  /**
   * Keyed rather than a list, because the second change to a thing revises
   * the first rather than joining it. `from` is kept from the first write in
   * the window and `to` is overwritten by every one after it, which is what
   * makes the card say what settled instead of replaying the keystrokes.
   */
  entries: Map<string, LedgerEntry>;
}

const buffers = new Map<string, Pending>();

/* ── muting ───────────────────────────────────────────────────────────────
   Two flows already post a card that enumerates the same changes line by
   line — a rest and character creation — and a second card saying the same
   thing in a different grammar is the log arguing with itself.

   Nothing else is muted, and the two cases worth naming are the ones that put
   a ledger card *beside* a plate rather than instead of one.

   A claim button pressed three hours after the roll landed changes the sheet
   on a card nobody is still looking at: the plate **offered** a Hope, and the
   ledger records that it was taken. Paying for an Experience is the same
   argument at one second's distance — the plate draws the term in gold, which
   says it was bought, and the ledger says what it cost and what is left. Both
   stay, because a plate is a statement about a *roll* and neither of these is.

   Per actor rather than global, because a rest is a thing happening to one
   character and the rest of the table is still playing. Counted rather than
   flagged, so two overlapping scopes cannot have the inner one un-mute the
   outer's. */
const muted = new Map<string, number>();

export function muteLedger(actor: any): void {
  const id = actor?.id;
  if (id) muted.set(id, (muted.get(id) ?? 0) + 1);
}

export function unmuteLedger(actor: any): void {
  const id = actor?.id;
  if (!id) return;
  const n = (muted.get(id) ?? 0) - 1;
  if (n > 0) muted.set(id, n);
  else muted.delete(id);
}

/** Run something with this actor's changes kept out of the log. */
export async function withoutLedger<T>(actor: any, fn: () => Promise<T>): Promise<T> {
  muteLedger(actor);
  try {
    return await fn();
  } finally {
    unmuteLedger(actor);
  }
}

/* ── noting ───────────────────────────────────────────────────────────── */

const enabled = (): boolean => !!game.settings?.get(SYSTEM_ID, "changeLog");

/**
 * Whether this actor's changes are ours to announce.
 *
 * Characters only — the user's own framing, and the right one: an adversary's
 * Stress is the GM's working state and belongs on the GM's side of the screen,
 * not in a log the table reads.
 */
const watching = (actor: any): boolean =>
  !!actor && actor.type === "character" && !muted.has(actor.id) && enabled();

function note(actor: any, key: string, entry: LedgerEntry): void {
  let buf = buffers.get(actor.id);
  if (!buf) {
    buf = { actor, opened: Date.now(), timer: null, entries: new Map() };
    buffers.set(actor.id, buf);
  }
  // The actor is re-taken every time. A document can be replaced underneath a
  // buffer that is still open, and posting against a stale one speaks for a
  // sheet that no longer exists.
  buf.actor = actor;

  const had = buf.entries.get(key);
  buf.entries.set(key, had ? { ...entry, from: had.from } : entry);

  if (buf.timer) clearTimeout(buf.timer);
  const left = Math.max(0, buf.opened + CEILING - Date.now());
  buf.timer = setTimeout(() => void flush(actor.id), Math.min(QUIET, left));
}

/**
 * Record one entry for everything that settled, and drop what did not move.
 *
 * A net of zero is not an event. Marking a box and taking it straight back is
 * a correction, and a table that has to watch every correction happen learns
 * to stop reading the log.
 */
async function flush(id: string): Promise<void> {
  const buf = buffers.get(id);
  if (!buf) return;
  buffers.delete(id);
  if (buf.timer) clearTimeout(buf.timer);

  const entries = [...buf.entries.values()].filter((e) => e.from !== e.to);
  if (!entries.length) return;

  await recordActivity(buf.actor.name, entries);
}

/* ── reading the writes ───────────────────────────────────────────────── */

/**
 * Whether an update touches a path.
 *
 * This reads the *expanded* form and every writer in this system passes the
 * flat one — `markTrack` sends `{"system.resources.stress.marked": 3}` and
 * `moveResource` sends `{"system.resources": [...]}`, neither of which
 * `hasProperty` can walk. It works because the `changed` a `preUpdate*` hook
 * receives has already been through `DataModel.cleanData`, whose `expand`
 * option defaults to true — checked in Foundry's own
 * `client/data/client-backend.mjs`, not assumed. The Vulnerable sync in
 * `daggerheart.ts` has been resting on the same fact since it was written.
 */
const has = (changed: any, path: string): boolean =>
  foundry.utils.hasProperty(changed, path);

/** What the four tracks read before an update that is about to touch them. */
function actorBefore(actor: any, changed: any): Record<string, number> | null {
  const res = actor.system?.resources;
  if (!res) return null;
  const out: Record<string, number> = {};
  for (const t of TRACKS) {
    if (has(changed, `system.resources.${t}.marked`)) out[t] = res[t]?.marked ?? 0;
  }
  if (has(changed, "system.resources.hope.value")) out.hope = res.hope?.value ?? 0;
  return Object.keys(out).length ? out : null;
}

function noteActor(actor: any, before: Record<string, number>): void {
  const res = actor.system?.resources ?? {};
  for (const t of TRACKS) {
    const from = before[t];
    if (from === undefined) continue;
    note(actor, t, {
      kind: t,
      from,
      to: res[t]?.marked ?? 0,
      max: res[t]?.max ?? 0,
    });
  }
  if (before.hope !== undefined) {
    note(actor, "hope", {
      kind: "hope",
      from: before.hope,
      to: res.hope?.value ?? 0,
      max: res.hope?.max ?? 0,
      // The pool's ceiling is already the printed six minus these, so the row
      // is `max + scars` wide and the count is the ceiling. See `hope` in
      // ledger.js — a scarred socket is drawn, because it is permanent.
      scars: actor.system?.scars?.length ?? 0,
    });
  }
}

/**
 * An Item's before-state: every tracked pool's value, and which list it is in.
 *
 * `resources` is an ArrayField written whole, so the diff is positional and
 * both sides are read by index. A card whose annotation changed shape under a
 * running buffer would misreport; that is a compendium rebuild rather than
 * play, and it costs a wrong line rather than a wrong number on a sheet.
 */
function itemBefore(item: any, changed: any): { pools?: number[]; loadout?: boolean } | null {
  const out: { pools?: number[]; loadout?: boolean } = {};
  if (has(changed, "system.resources")) {
    out.pools = (item.system?.resources ?? []).map((r: any) => r.value ?? 0);
  }
  if (has(changed, "system.inLoadout")) out.loadout = !!item.system?.inLoadout;
  return Object.keys(out).length ? out : null;
}

function noteItem(item: any, before: { pools?: number[]; loadout?: boolean }): void {
  const actor = item.parent;
  const dom = item.system?.domain ? domainDef(item.system.domain) : null;

  if (before.pools) {
    const list: any[] = item.system?.resources ?? [];
    list.forEach((res, i) => {
      const from = before.pools?.[i];
      if (from === undefined) return;
      note(actor, `pool:${item.id}:${i}`, {
        kind: "pool",
        // The card's name, not the pool's. "Twilight Toll" is what anybody
        // says out loud; "tokens" is what four dozen cards call theirs, and
        // four rows of it names nothing.
        label: item.name,
        name: (res.name || "tokens").toLowerCase(),
        from,
        to: res.value ?? 0,
        max: resourceMax(res, actor) ?? 0,
        dom: dom ? { light: dom.light, dark: dom.dark } : undefined,
      });
    });
  }

  if (before.loadout !== undefined) {
    const into = !!item.system?.inLoadout;
    note(actor, `move:${item.id}`, {
      kind: "move",
      label: item.name,
      into,
      // A move has no quantity. `from`/`to` exist only so the zero-net filter
      // can drop a card that went out and came straight back.
      from: before.loadout ? 1 : 0,
      to: into ? 1 : 0,
      dom: dom ? { light: dom.light, dark: dom.dark } : undefined,
    });
  }
}

/* ── wiring ───────────────────────────────────────────────────────────── */

/**
 * The gate is **who keeps the record**, which is the active GM.
 *
 * It used to be whoever pressed the button, because the log was a chat message
 * and `update*` fires on every connected client — twelve clients agreeing to
 * post is twelve copies of one card. The record now lives in a world setting
 * that only a GM may write, so the nominated writer replaces the initiator, and
 * one nominated writer is `syncVulnerable`'s and `applyFear`'s arrangement
 * exactly: two GMs at one table would otherwise append the same entry twice.
 *
 * What makes the swap possible at all is that `options` are broadcast with the
 * update, so the before-state stamped by the initiating client's `preUpdate*`
 * arrives here. What makes it *safe* is that the stamp is still gated by
 * `watching()` where it is written: an actor muted on the client doing the work
 * hands this one nothing to record.
 */
const writer = (): boolean => game.users?.activeGM === game.user;

export function registerLedger(): void {
  Hooks.on("preUpdateActor", (actor: any, changed: any, options: any) => {
    if (!watching(actor)) return;
    const before = actorBefore(actor, changed);
    if (before) foundry.utils.setProperty(options, `${SYSTEM_ID}.was`, before);
  });

  Hooks.on("updateActor", (actor: any, _c: any, options: any) => {
    const before = options?.[SYSTEM_ID]?.was;
    if (!before || !writer() || !watching(actor)) return;
    noteActor(actor, before);
  });

  Hooks.on("preUpdateItem", (item: any, changed: any, options: any) => {
    if (!watching(item?.parent)) return;
    const before = itemBefore(item, changed);
    if (before) foundry.utils.setProperty(options, `${SYSTEM_ID}.was`, before);
  });

  Hooks.on("updateItem", (item: any, _c: any, options: any) => {
    const before = options?.[SYSTEM_ID]?.was;
    if (!before || !writer() || !watching(item?.parent)) return;
    noteItem(item, before);
  });
}
