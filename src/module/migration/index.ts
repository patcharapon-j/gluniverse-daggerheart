/**
 * World migration.
 *
 * Everything else in this system reads the document and derives from it, so
 * almost nothing ever needs migrating — `advancementTally` recomputes from
 * the marks, `resourceMax` recomputes from the source, and the two
 * `migrateData` implementations in `data/items.ts` fix a *shape* on the way
 * in, per document, for free, forever. That is the right tool whenever the
 * old data can be read as the new data.
 *
 * This file is for the case it cannot: **content that was copied.** A domain
 * card on a character sheet is not a view of the compendium, it is a
 * duplicate made months ago, and when the card's rules text is corrected the
 * compendium changes and the duplicate does not. Nothing derives it back,
 * because there is nothing to derive it from — the player may have renamed
 * it, and a card matched by name to a pack it was never linked to is a guess.
 * So the correction has to be *applied*, once, to the copies, and something
 * has to remember that it has been.
 *
 * ── the record is a counter ───────────────────────────────────────────
 * `dataVersion`, a world setting, and its own registration says why it is not
 * `game.system.version`. The short version: the release workflow lets a human
 * choose hotfix / minor / major, so the version a step ships in is unknown
 * when the step is written, and a step gated on a guessed semver runs on
 * every launch forever when the guess comes out high.
 *
 * ── one writer ───────────────────────────────────────────────────────
 * The active GM, which is `applyFear`'s and `syncVulnerable`'s arrangement a
 * fourth time. `ready` fires on every connected client; four clients agreeing
 * to rewrite the same forty cards is four writes, a race, and four
 * notifications. Every other client sees the result replicate.
 *
 * ── it fails in the direction that keeps data ─────────────────────────
 * A step that throws leaves the stamp where it was, so the migration runs
 * again next launch rather than being silently half-done. That is only safe
 * because every step here is *idempotent and gated on the old shape* — an
 * erratum whose text has already been replaced no longer matches and is
 * skipped. A step that cannot be written that way does not belong in this
 * file.
 *
 * ── what it deliberately does not touch ──────────────────────────────
 * **Compendium packs.** Ours are rebuilt by the build and are locked; an
 * unlocked pack in somebody's world is *their* copy, made deliberately, and
 * a system rewriting it is the same overreach as deleting a card the player
 * dragged in by hand — see `cascadeOf`. The migration reaches documents the
 * world owns, and a GM who wants their own pack updated re-imports it.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "../config.ts";
import { getDataVersion, setDataVersion } from "../settings.ts";
import { SRD2_ERRATA, type Erratum } from "./errata.ts";

/** What a run did, for the console and the notification. */
export interface MigrationReport {
  from: number;
  to: number;
  /** Documents looked at. */
  inspected: number;
  /** Documents actually written. */
  changed: number;
  /** Human-readable lines, one per thing worth saying. */
  notes: string[];
  /**
   * Documents that matched by name and type but not by content, so were left
   * alone. Named, because "we skipped 3" is not something a GM can act on and
   * "we skipped Whirlwind on Kesh" is.
   */
  skipped: string[];
  /** Steps that threw. A non-empty list means the stamp was not moved. */
  failed: string[];
}

const blankReport = (from: number, to: number): MigrationReport => ({
  from,
  to,
  inspected: 0,
  changed: 0,
  notes: [],
  skipped: [],
  failed: [],
});

/* ── walking the world ───────────────────────────────────────────────── */

/**
 * Every Item this world owns, grouped by the document that has to be told
 * about a change.
 *
 * Three populations, and the third is the one that gets forgotten: world
 * Items, Items embedded on Actors, and Items on **unlinked tokens**, which
 * are a separate Actor each living in a scene's `actorDelta`. A party that
 * has ever had an unlinked token holding a domain card has a copy there that
 * `game.actors` cannot see.
 */
function* itemGroups(): Generator<{ owner: any; label: string; items: any[] }> {
  yield { owner: null, label: "world", items: [...((game.items as any) ?? [])] };

  for (const actor of (game.actors as any) ?? []) {
    yield { owner: actor, label: actor.name, items: [...actor.items] };
  }

  for (const scene of (game.scenes as any) ?? []) {
    for (const token of scene.tokens ?? []) {
      if (token.isLinked) continue;
      const actor = token.actor;
      if (!actor) continue;
      yield { owner: actor, label: `${scene.name} > ${token.name}`, items: [...actor.items] };
    }
  }
}

/* ── the errata pass ─────────────────────────────────────────────────── */

/**
 * Replace every occurrence of `find` inside one value, returning a new value
 * and whether anything moved.
 *
 * Recursive, and the recursion is the point: rules text is not in one place.
 * A domain card keeps it in `description`, a class keeps several in
 * `classFeatures[]`, a subclass in `features[]` — and a fix that named a path
 * would be a list that is wrong the first time a subtype grows a field, which
 * is exactly what `check-item-sheet.mjs` exists to catch elsewhere.
 *
 * **Arrays are rebuilt whole and never addressed by index.** Foundry reads a
 * dotted index in an update key as a path into an *object*, which is the trap
 * the adjust tab learned about Experiences and `moveResource` learned about
 * pools. The caller only ever writes top-level `system` keys, so an array
 * lands as one value.
 */
function patched(value: any, find: string, replace: string): { value: any; changed: boolean } {
  if (typeof value === "string") {
    if (!value.includes(find)) return { value, changed: false };
    return { value: value.split(find).join(replace), changed: true };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((v) => {
      const r = patched(v, find, replace);
      if (r.changed) changed = true;
      return r.value;
    });
    return { value: changed ? out : value, changed };
  }
  if (value && typeof value === "object") {
    let changed = false;
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const r = patched(v, find, replace);
      if (r.changed) changed = true;
      out[k] = r.value;
    }
    return { value: changed ? out : value, changed };
  }
  return { value, changed: false };
}

/**
 * Is this the document the erratum is about?
 *
 * Subtype and name, plus the parent Actor's name where the erratum gives one.
 * A domain card's name is unique in the corpus; an adversary feature's is
 * emphatically not — "Relentless (2)" is printed on dozens of stat blocks —
 * and without the parent every one of them would be *reported* as an edited
 * document even though the old-text gate means none of them is rewritten.
 * See `Erratum.parent`.
 */
function names(item: any, e: Erratum): boolean {
  if (item.type !== e.type || item.name !== e.name) return false;
  if (!e.parent) return true;
  return item.parent?.name === e.parent;
}

/**
 * What one erratum would write to one Item, or null if it does not apply.
 *
 * Null covers three different situations on purpose — wrong subtype, wrong
 * name, and *right document whose text has already moved on*. Only the third
 * is interesting, and it is reported separately by the caller, because it is
 * the one that means somebody has edited their copy.
 */
function fixFor(item: any, e: Erratum): Record<string, any> | null {
  if (!names(item, e)) return null;
  const system = item.system?.toObject?.() ?? item.system ?? {};

  if (e.fix.kind === "set") {
    if (foundry.utils.getProperty(system, e.fix.path) !== e.fix.from) return null;
    return { [`system.${e.fix.path}`]: e.fix.to };
  }

  const update: Record<string, any> = {};
  for (const [key, value] of Object.entries(system)) {
    const r = patched(value, e.fix.find, e.fix.replace);
    if (r.changed) update[`system.${key}`] = r.value;
  }
  return Object.keys(update).length ? update : null;
}

/** Does this document look like one of ours that has already been fixed? */
function alreadyFixed(item: any, e: Erratum): boolean {
  if (e.fix.kind === "set") {
    return foundry.utils.getProperty(item.system ?? {}, e.fix.path) === e.fix.to;
  }
  return JSON.stringify(item.system ?? {}).includes(e.fix.replace);
}

/** Apply every erratum to every Item the world owns. */
async function applyErrata(report: MigrationReport, dryRun: boolean): Promise<void> {
  for (const group of itemGroups()) {
    const updates: Record<string, Record<string, any>> = {};

    for (const item of group.items) {
      report.inspected += 1;
      for (const e of SRD2_ERRATA) {
        /* `names` and not a name comparison, because the parent is half of
           the identity for an embedded feature — without it, thirty other
           adversaries' "Relentless (2)" reaches the skip branch below and is
           reported as somebody's edit. */
        if (!names(item, e)) continue;
        const update = fixFor(item, e);
        if (update) {
          updates[item.id] = { ...(updates[item.id] ?? {}), ...update, _id: item.id };
        } else if (!alreadyFixed(item, e)) {
          report.skipped.push(
            `${e.id} — "${item.name}" on ${group.label} (already edited; left alone)`,
          );
        }
      }
    }

    const list = Object.values(updates);
    if (!list.length) continue;
    report.changed += list.length;
    if (dryRun) continue;

    try {
      if (group.owner) await group.owner.updateEmbeddedDocuments("Item", list);
      else await Item.updateDocuments(list);
    } catch (err) {
      report.failed.push(`errata on ${group.label}: ${(err as Error).message}`);
    }
  }

  report.notes.push(
    `SRD 2.0 errata — ${report.changed} document${report.changed === 1 ? "" : "s"} updated, ` +
      `${report.inspected} inspected`,
  );
}

/* ── the steps ───────────────────────────────────────────────────────── */

interface MigrationStep {
  /**
   * The data version this brings the world **to**. Ascending, never reused,
   * and never renumbered once released — the number is in every world that
   * has run it.
   */
  to: number;
  id: string;
  run(report: MigrationReport, dryRun: boolean): Promise<void>;
}

const STEPS: MigrationStep[] = [
  {
    to: 1,
    id: "srd-2.0-errata",
    run: applyErrata,
  },
];

/** The number a fully migrated world carries. */
export const LATEST_DATA_VERSION = STEPS.reduce((n, s) => Math.max(n, s.to), 0);

/* ── the runner ──────────────────────────────────────────────────────── */

/** Is there anything in this world for a migration to have been about? */
const worldHasContent = (): boolean =>
  Boolean((game.actors as any)?.size || (game.items as any)?.size);

/**
 * Bring this world's documents up to date.
 *
 * Safe to call by hand at any time — `game.daggerheart.migrate()` — which is
 * the console the token chip and the ruler both have and for the same reason:
 * a thing that runs once, silently, at load has no steady state to inspect,
 * so "it never ran" and "it ran and found nothing" look identical afterwards.
 * `{ dryRun: true }` reports without writing, and `{ force: true }` ignores
 * the stamp.
 */
export async function migrateWorld(
  opts: { dryRun?: boolean; force?: boolean } = {},
): Promise<MigrationReport> {
  const dryRun = opts.dryRun ?? false;
  const from = opts.force ? 0 : getDataVersion();
  const report = blankReport(from, LATEST_DATA_VERSION);

  if (from >= LATEST_DATA_VERSION) {
    report.notes.push("Already up to date.");
    return report;
  }

  /* A world with nothing in it has nothing to migrate, and stamping it now is
     not a shortcut — it is the difference between "these documents have been
     brought forward" and "there were no documents". A future step that fixes
     a shape only old data has must not fire for a world created after that
     shape stopped existing. */
  if (from === 0 && !worldHasContent()) {
    if (!dryRun) await setDataVersion(LATEST_DATA_VERSION);
    report.notes.push("New world — stamped, nothing to migrate.");
    return report;
  }

  for (const step of [...STEPS].sort((a, b) => a.to - b.to)) {
    if (step.to <= from) continue;
    try {
      await step.run(report, dryRun);
    } catch (err) {
      report.failed.push(`${step.id}: ${(err as Error).message}`);
      console.error(`${SYSTEM_ID} | migration step ${step.id} failed`, err);
      break;
    }
  }

  /* The stamp moves only on a clean run. A half-finished migration that
     recorded itself as finished is unrecoverable without somebody knowing to
     force it; one that did not is simply retried, which every step here is
     written to survive. */
  if (!dryRun && !report.failed.length) await setDataVersion(LATEST_DATA_VERSION);
  return report;
}

/**
 * The `ready` half: run it, and say what happened.
 *
 * It reports **only when there was something to report**. A migration that
 * changed nothing is the overwhelmingly common case — every launch after the
 * first — and a notification saying so every time is one nobody reads by the
 * third session.
 */
export async function migrateOnReady(): Promise<void> {
  if ((game.users as any)?.activeGM !== game.user) return;
  if (getDataVersion() >= LATEST_DATA_VERSION) return;

  const report = await migrateWorld();
  console.log(`${SYSTEM_ID} | migration`, report);

  if (report.failed.length) {
    ui.notifications?.error(
      game.i18n.format("DAGGERHEART.Migration.Failed", { n: report.failed.length }),
      { permanent: true },
    );
    return;
  }
  if (report.changed) {
    ui.notifications?.info(game.i18n.format("DAGGERHEART.Migration.Done", { n: report.changed }));
  }
  if (report.skipped.length) {
    ui.notifications?.warn(
      game.i18n.format("DAGGERHEART.Migration.Skipped", { n: report.skipped.length }),
    );
  }
}
