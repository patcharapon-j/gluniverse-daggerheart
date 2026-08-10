/**
 * The activity log — where the change log goes now.
 *
 * `ledger.ts` observes the documents and decides what settled; this is the
 * place that settled thing lands, and until now that place was **chat**.
 *
 * ── why it is not chat ────────────────────────────────────────────────
 * Everything else this system posts is an event somebody *chose*: a roll, a
 * card shown, a rest taken, a character finished. The ledger's whole argument
 * is that it is the opposite — the record of what happened while nobody was
 * posting anything — and those two do not belong in one column. A four-person
 * party in a fight settles a dozen tracks a round, and every one of those
 * cards pushed the roll everybody *was* looking at further up a log four
 * people are reading. The relief available was the world switch, which does
 * not narrow the log, it deletes the record — and deletes it for the one
 * person it was for.
 *
 * So it moves to the GM, who is who the rules ask to keep it, and it stops
 * being a feed and becomes a window: there when you look at it, silent when
 * you do not. Players get nothing at all, which is not a permission being
 * withheld — a player already sees their own sheet move, and what this log
 * adds is *the other three characters*, which is the GM's job to hold.
 *
 * ── the store is world state, and the active GM writes it ─────────────
 * A per-client pile in memory was the obvious build and is wrong twice: a GM
 * who reloads mid-session loses the session, and two GMs at one table keep
 * two different records of the same evening. So the log is a world setting,
 * capped, and written by `game.users.activeGM` alone — `applyFear`'s
 * arrangement, for `syncVulnerable`'s reason. Every GM's window then reads one
 * record, and a reload rejoins it.
 *
 * That the writer is a GM rather than whoever pressed the button is not an
 * extra hop: `preUpdate*` stamps the before-state into the update's own
 * `options`, and Foundry broadcasts `options` to every client with the update.
 * The before-state therefore arrives at the GM's client already — see the gate
 * in `ledger.ts`, which used to name the initiating client and now names the
 * writer. What travels is what the initiating client was willing to stamp,
 * which is what keeps `muteLedger` working from the other end of the wire: a
 * rest stamps nothing, so a GM sees nothing to record.
 *
 * The one thing this gives up is a table playing with no GM connected. Nothing
 * is recorded then, because there is nobody whose record it would be.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "./config.ts";
import { ACTIVITY, ACTIVITY_EMPTY, ACTIVITY_ENTRY, type ActivityEntry } from "./ui/activity.js";
import type { LedgerEntry } from "./ui/ledger.js";

/**
 * How many settled windows the log keeps.
 *
 * A cap rather than a rolling delete by age, because what makes an entry
 * worth keeping is how recent it is *relative to the others* — a table that
 * plays for six hours and one that plays for one both want the last hundred
 * things that happened. It is also the size of one setting document, rewritten
 * on every flush, and a hundred entries of six rows is a few tens of
 * kilobytes: comparable to the ChatMessage this replaces, which was a document
 * creation per flush.
 */
const CAP = 100;

export interface ActivityEvent {
  id: string;
  /** Epoch milliseconds. Formatted per client, because a table crosses zones. */
  at: number;
  /** The character the changes happened to. */
  who: string;
  entries: LedgerEntry[];
}

/* ── the store ────────────────────────────────────────────────────────── */

/** Oldest first, which is how it is appended. The window draws it reversed. */
export const activityLog = (): ActivityEvent[] => {
  const raw = game.settings?.get(SYSTEM_ID, "activity");
  return Array.isArray(raw) ? (raw as ActivityEvent[]) : [];
};

/** Whether the ledger is watching at all. The log draws this as a state. */
const watching = (): boolean => !!game.settings?.get(SYSTEM_ID, "changeLog");

/**
 * Writes go through one queue, because an append is a read and then a write.
 *
 * The ledger buffers per actor, so an area attack that lands on three
 * characters opens three windows within a millisecond of each other and closes
 * them the same way: three appends in one tick, each of which reads the store,
 * awaits a write, and would be handed the version before its neighbour's. Two
 * of the three entries would simply not be there — and it would happen exactly
 * when the most was going on, which is the worst time for a record to be
 * quietly short.
 */
let writes: Promise<unknown> = Promise.resolve();
const serialised = <T>(fn: () => Promise<T>): Promise<T> => {
  const next = writes.then(fn, fn);
  writes = next.catch(() => undefined);
  return next;
};

/**
 * Record one settled window of changes.
 *
 * Called on every connected client by `ledger.ts`; exactly one of them is the
 * active GM and the rest return on the first line.
 */
export async function recordActivity(who: string, entries: LedgerEntry[]): Promise<void> {
  if (!entries.length || game.users?.activeGM !== game.user) return;
  const ev: ActivityEvent = {
    id: foundry.utils.randomID(),
    at: Date.now(),
    who,
    entries,
  };
  await serialised(() =>
    game.settings.set(SYSTEM_ID, "activity", [...activityLog(), ev].slice(-CAP)),
  );
}

/** Empty it. A GM's own record, so a GM's own decision — and it asks first. */
export async function clearActivity(): Promise<void> {
  if (!game.user?.isGM || !activityLog().length) return;
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("DAGGERHEART.Activity.ClearTitle") },
    content: `<p>${foundry.utils.escapeHTML(
      game.i18n.localize("DAGGERHEART.Activity.ClearBody"),
    )}</p>`,
    modal: true,
  });
  if (ok) await serialised(() => game.settings.set(SYSTEM_ID, "activity", []));
}

/** The world switch, from the window that is about it. */
async function toggleWatching(): Promise<void> {
  if (!game.user?.isGM) return;
  await game.settings.set(SYSTEM_ID, "changeLog", !watching());
}

/* ── drawing it ───────────────────────────────────────────────────────── */

/**
 * Everything that reaches the builder is escaped here.
 *
 * A ledger row carries two strings a player wrote — the card's name and what
 * one of its counters is called — and the chat card was handed to Foundry,
 * which sanitises message content on the way into the database. This draws
 * into our own window instead, so nothing sanitises it but us. `who` is a
 * character name and travels the same way.
 */
const esc = (s: unknown): string => foundry.utils.escapeHTML(String(s ?? ""));

const clock = (at: number): string =>
  new Date(at).toLocaleTimeString(game.i18n?.lang || undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

const drawn = (ev: ActivityEvent): ActivityEntry => ({
  id: ev.id,
  when: esc(clock(ev.at)),
  who: esc(ev.who),
  entries: (ev.entries ?? []).map((e) => ({
    ...e,
    ...(e.label === undefined ? {} : { label: esc(e.label) }),
    ...(e.name === undefined ? {} : { name: esc(e.name) }),
  })),
});

const L = (key: string): string => game.i18n.localize(`DAGGERHEART.Activity.${key}`);

const countLabel = (n: number): string =>
  n ? game.i18n.format("DAGGERHEART.Activity.Count", { n }) : L("None");

/** Newest first — see activity.css for why this log runs the other way up. */
const newestFirst = (): ActivityEvent[] => [...activityLog()].reverse();

/**
 * The whole window as markup.
 *
 * Exported for `tools/test-activity-log.mjs`, which is the only way to ratchet
 * the escaping: `drawn` is the one place a name a player typed stops being
 * text, and a refactor that drops it leaves a window that looks perfect until
 * somebody names a card with a tag in it.
 */
export function panel(): string {
  const events = newestFirst();
  const on = watching();
  return ACTIVITY({
    title: L("Title"),
    count: countLabel(events.length),
    watching: on,
    watchLabel: L(on ? "Watching" : "Paused"),
    clearLabel: L("Clear"),
    off: L("Off"),
    empty: { title: L("EmptyTitle"), note: L("EmptyNote") },
    events: events.map(drawn),
  });
}

const node = (html: string): HTMLElement => {
  const box = document.createElement("div");
  box.innerHTML = html.trim();
  return box.firstElementChild as HTMLElement;
};

/**
 * Bring what is already standing up to date, rather than drawing it again.
 *
 * The contract `Marks`, `Gems` and the Fear strip all keep, and here it buys
 * three things at once: an entry that arrives keeps its arrival to itself, the
 * twenty underneath it do not replay theirs, and a GM reading the middle of
 * the log does not have the scroller pulled out from under them.
 */
function sync(root: HTMLElement): void {
  const log = root.querySelector<HTMLElement>(".aclog");
  const body = root.querySelector<HTMLElement>(".acbd");
  if (!log || !body) return;

  const events = newestFirst();
  const on = watching();

  const count = root.querySelector<HTMLElement>(".achd > s");
  if (count) count.textContent = countLabel(events.length);

  const watch = root.querySelector<HTMLElement>('.acbt[data-ac="watch"]');
  if (watch) {
    watch.setAttribute("aria-pressed", on ? "true" : "false");
    watch.textContent = L(on ? "Watching" : "Paused");
  }

  const banner = log.querySelector<HTMLElement>(":scope > .acoff");
  if (on) banner?.remove();
  else if (!banner) {
    const el = document.createElement("div");
    el.className = "acoff";
    el.innerHTML = L("Off");
    log.insertBefore(el, body);
  }

  // Entries, keyed by id: what is gone goes, what is new arrives, and what
  // stayed keeps the element it already had.
  const have = new Map<string, HTMLElement>(
    [...body.querySelectorAll<HTMLElement>("[data-ace]")].map(
      (el) => [el.dataset.ace ?? "", el] as [string, HTMLElement],
    ),
  );
  const want = new Set(events.map((e) => e.id));
  for (const [id, el] of have) if (!want.has(id)) el.remove();
  if (events.length) body.querySelector(".acnil")?.remove();

  let prev: HTMLElement | null = null;
  for (const ev of events) {
    let el = have.get(ev.id) ?? null;
    if (!el) {
      const fresh = node(ACTIVITY_ENTRY(drawn(ev)));
      fresh.classList.add("new");
      fresh.addEventListener("animationend", () => fresh.classList.remove("new"), { once: true });
      el = fresh;
    }
    const at: Element | null = prev ? prev.nextElementSibling : body.firstElementChild;
    if (at !== el) body.insertBefore(el, at);
    prev = el;
  }

  if (!events.length && !body.querySelector(".acnil")) {
    body.append(node(ACTIVITY_EMPTY({ title: L("EmptyTitle"), note: L("EmptyNote") })));
  }
}

/* ── the window ───────────────────────────────────────────────────────── */

let open: any = null;
let root: HTMLElement | null = null;

function makeApp(): any {
  const { ApplicationV2 } = foundry.applications.api;

  return class ActivityApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
      id: "dh-activity",
      /* `dh` for the palette, `dh-sheet` for the frame — this is the same
         application chrome the sheet and the browser wear, at the same
         chamfer, because it is a window of ours and not a third kind of
         object. 348 is the card's 300 plus the body's own margins, so the
         ledger card inside is drawn at exactly the width it is drawn at
         everywhere else. */
      classes: ["dh", "dh-sheet", "dh-activity"],
      position: { width: 348, height: 620 },
      window: { resizable: true, title: "DAGGERHEART.Activity.Title" },
    };

    async _renderHTML(): Promise<string> {
      return panel();
    }

    _replaceHTML(result: string, content: HTMLElement): void {
      const target: HTMLElement =
        content?.matches?.(".window-content")
          ? content
          : ((content?.querySelector?.(".window-content") as HTMLElement) ?? content);

      target.innerHTML = result;
      root = target;
      seeAll();

      /* Once. The listener is on the container and the container survives a
         re-render, so binding on every one of them would stack them. */
      if (!target.dataset.dhWired) {
        target.dataset.dhWired = "1";
        target.addEventListener("click", (ev: Event) => {
          const press = (ev.target as HTMLElement)?.closest?.("[data-ac]") as HTMLElement | null;
          if (!press) return;
          if (press.dataset.ac === "clear") void clearActivity();
          if (press.dataset.ac === "watch") void toggleWatching();
        });
      }
    }

    async _onClose(options: unknown): Promise<void> {
      if (open === this) open = null;
      root = null;
      await (super._onClose as any)?.(options);
    }
  };
}

let Cached: any = null;

/**
 * Open it, or bring the open one forward.
 *
 * GM only, and it says so rather than failing quietly: a player who has been
 * handed the macro should be told whose window this is, not shown an empty
 * one. The world setting behind it is readable by anybody — world settings
 * are — so this is a claim about the surface and not a secret.
 */
export async function openActivity(): Promise<any> {
  if (!game.user?.isGM) {
    ui.notifications?.warn(game.i18n.localize("DAGGERHEART.Activity.GMOnly"));
    return null;
  }

  /* `rendered` and not merely non-null, and the difference is a whole class of
     silent failure. The reference used to be taken before the render was
     awaited, so a render that threw left a half-built application standing in
     it forever — and every click after that found something there, brought a
     window that had never been drawn to the front, and did nothing at all.
     One failure became a dead button, which is the worst way to fail: the
     symptom outlives the cause and says nothing about it. */
  if (open?.rendered) {
    open.bringToFront?.();
    return open;
  }

  Cached ??= makeApp();
  const app = new Cached();
  try {
    await app.render(true);
  } catch (err) {
    /* Said out loud. A window that fails to open is indistinguishable from a
       button that is not wired, and only one of those is worth reporting. */
    console.error(`${SYSTEM_ID} | the activity log failed to open`, err);
    ui.notifications?.error(game.i18n.localize("DAGGERHEART.Activity.Failed"));
    open = null;
    return null;
  }
  open = app;
  return app;
}

/* ── the way to it, and the badge on it ───────────────────────────────────
   One door, in the **chat sidebar**, which is the room this record used to
   live in: a GM looking for what just happened is already looking there, and
   a button at the head of the tab is the shortest possible correction of the
   thing this window exists to correct. The API is the second way in, for a
   macro, exactly as `openBrowser` and `openCreation` are reached.

   No scene control. That toolbar is for tools that act on the canvas, and
   this acts on nothing at all — it is a record. */

let btn: HTMLElement | null = null;
/** Said once. A door that cannot find its wall is worth exactly one line. */
let warned = false;

/**
 * What the GM has not looked at yet.
 *
 * Ids rather than a timestamp, because two windows can settle in the same
 * millisecond and a count that says "one" when two landed is worse than no
 * count. Seeded with everything present at start-up: a GM who logs in should
 * be told what happens *now*, not that a hundred things happened last week.
 */
const seen = new Set<string>();

function seeAll(): void {
  for (const ev of activityLog()) seen.add(ev.id);
  badge();
}

function badge(): void {
  if (!btn) return;
  const unread = activityLog().filter((e) => !seen.has(e.id)).length;
  btn.dataset.n = String(unread);
}

/**
 * Every chat panel currently in the document.
 *
 * Found from the document rather than taken from whatever a hook hands over,
 * and that is the correction rather than belt and braces. `ChatLog` is an
 * ApplicationV2 built out of **parts** in both supported generations, so what
 * a render hook passes and what its markup is called are two things this repo
 * does not own and has already watched move once — the Fear strip's dock did
 * exactly that between v13 and v14. A selector list that names four things is
 * four chances to still be right; one hook argument is one.
 *
 * Plural because the chat exists twice as soon as anybody pops it out, and a
 * door in one copy is no door at all if you are looking at the other.
 */
const chatPanels = (): HTMLElement[] => {
  /* Not a bare `[data-tab="chat"]`: the sidebar's own tab strip carries that
     too, and a button prepended into a nav item is a button inside a button —
     markup no browser keeps, in the one place nobody would look for it. */
  const all = [
    ...document.querySelectorAll<HTMLElement>("#chat, .chat-sidebar, section[data-tab='chat']"),
  ].filter((el) => !el.closest("nav"));
  /* One panel can match twice — `#chat.chat-sidebar` is both — and a nested
     pair would take two buttons. Keep the innermost of any nesting. */
  return all.filter((el) => !all.some((other) => other !== el && el.contains(other)));
};

/**
 * Put the door in every chat panel that has not got one.
 *
 * Idempotent by construction: the guard is per panel, so this is safe to call
 * on every render, on every sidebar event, and again at `ready`.
 */
function mountButton(): void {
  if (!game.user?.isGM) return;
  let mounted = 0;

  for (const panel of chatPanels()) {
    if (panel.querySelector(".dh-activity-btn")) {
      mounted++;
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    /* `dh` for the palette and nothing else, which is the sixth place this
       system has needed it: every token is declared on `.dh`, so an element
       outside one resolves none of them. */
    button.className = "dh dh-activity-btn";
    button.innerHTML = `<i class="fa-solid fa-clipboard-list"></i> ${foundry.utils.escapeHTML(
      game.i18n.localize("DAGGERHEART.Activity.Open"),
    )}`;
    button.addEventListener("click", () => void openActivity());

    /* Above the messages, as a **sibling** of the log rather than inside it.
       The log is one of the application's parts, and a part's element is
       replaced wholesale on every re-render — which chat does constantly — so
       a button inside it would be swept away by the next message to arrive.
       A sibling is not. The fall-through prepends to the panel, because a
       button in the wrong place that still works is the right failure for
       chrome we do not own; `registerBrowser` says the same thing about the
       compendium tab. */
    const log = panel.querySelector("#chat-log, .chat-log, ol.chat-log");
    if (log?.parentElement) log.parentElement.insertBefore(button, log);
    else panel.prepend(button);

    btn = button;
    mounted++;
  }

  /* A door that silently fails to appear is the one failure there is nothing
     on screen to diagnose, so it says so once instead. Named, because the
     window is still open-able and the sentence has to say how. */
  if (!mounted && !warned) {
    warned = true;
    console.warn(
      `${SYSTEM_ID} | no chat panel found for the activity log's button — ` +
        `open it with game.daggerheart.activity()`,
    );
  }
  badge();
}

export function registerActivityLog(): void {
  /* Four ways the panel can arrive, and `mountButton` is idempotent, so they
     cost a `querySelector` each when there is nothing to do. `renderChatLog`
     is the one that ought to be enough; the other three are the sidebar being
     drawn, being changed and being popped out, which are the events after
     which the panel exists and that hook has already fired. */
  for (const hook of ["renderChatLog", "renderSidebar", "changeSidebarTab", "collapseSidebar"]) {
    Hooks.on(hook, () => mountButton());
  }

  /* The store and the switch both report through one hook, so the window has
     one thing to listen to and the badge has one place to be counted. */
  Hooks.on("daggerheart.activityChanged", () => {
    // An open window is a window being read, so what lands in it is read.
    if (root) {
      seeAll();
      sync(root);
    } else badge();
  });

  Hooks.once("ready", () => {
    if (!game.user?.isGM) return;
    /* Nothing that happened before this client connected is news to it. */
    seeAll();
    mountButton();
  });
}
