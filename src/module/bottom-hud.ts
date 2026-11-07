/**
 * The bottom HUD — play without the sheet.
 *
 * `design/hud.*` draws the rail and `design/seat.*` the party's ringed seats;
 * this is the half a study page cannot have, which is asking Foundry whose rail
 * it is, what that character is holding, and what a press on it means. It is a
 * wiring job in the Fear strip's sense: every press here calls the code the
 * sheet already calls, so the rail and the sheet cannot disagree about what a
 * roll adds, what a recall costs or what a card posts.
 *
 *   trait            `askRoll`              (apps/ask-roll.ts — the chat card's seam)
 *   weapon           `askAttack`            (moved there from the sheet for this)
 *   a strip box      `actor.markTrack`
 *   Hit              `takeDamage`           (apps/damage.ts)
 *   a feature        `postCard`             with the rule's own authored actions
 *   the Hope feature `postCard` + its price (the sheet's `useHopeAction`)
 *   recall / shelve  `placeCard`            (loadout.ts — moved out of the sheet)
 *   rest             `rest`                 (apps/rest.ts)
 *   GM attack        `rollAdversaryAttack`
 *
 * **Rendered once, driven afterwards.** `bottom-hud-shape.ts` decides whether a
 * change is a value — a box marked, a Hope spent — or the rail changing shape,
 * and only the second redraws. Values go through `setStrip`, `setPool`,
 * `setSeat` and `flinch`, so a landing plays once and nothing beside it replays.
 *
 * **Whose rail.** One controlled token whose character you own is that
 * character's rail — for a GM too, which is how a GM plays an NPC companion or
 * checks a player's numbers. Otherwise a GM gets the adversary rail and a
 * player gets their assigned character. With none of those there is no rail at
 * all, rather than an empty one.
 *
 * **Where.** In `#interface`, along the bottom edge from the left margin to the
 * sidebar. Not in `#ui-bottom`: that column is Foundry's middle 60%, and the rail
 * is the width of the board. Foundry's macro hotbar is hidden while the rail is
 * up — two bars on one edge is the screen arguing with itself about where the
 * bottom is — and the players list is lifted clear of the party stack.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ADVERSARY_TYPE_LABELS,
  FEATURE_KIND_LABELS,
  FOCUS_MAX,
  FOCUS_SUBCLASS,
  LOADOUT_LIMIT,
  SYSTEM_ID,
  rangeLabel,
  traitLabel,
  type Trait,
} from "./config.ts";
import { askAttack, askRoll, damageLine } from "./apps/ask-roll.ts";
import { takeDamage } from "./apps/damage.ts";
import { rest } from "./apps/rest.ts";
import { damageDice } from "./data/damage.ts";
import { resourcesFor } from "./data/resources.ts";
import { rollAdversaryAttack } from "./dice/actions.ts";
import { portraitOf } from "./dice/rolls.ts";
import { placeCard } from "./loadout.ts";
import { activeStance, dropStance, hasFlowState, isStance, knownStances, stancePayer, stanceTier } from "./stances.ts";
import { shiftStance } from "./stance-actions.ts";
import {
  authoredPrice,
  cardOf,
  counterGroups,
  featureCard,
  featureSpent,
  hopeCard,
  hopeCost,
  loadSigils,
  plain,
  priceLabel,
  type CardOptions,
  type Sigils,
} from "./sheets/cards.ts";
import { postCard } from "./sheets/post-card.ts";
import { canAct, liveOf, pressBox, shapeOf, tookHit, type Live } from "./bottom-hud-shape.ts";
import { rich } from "./ui/card.js";
import { FACE } from "./ui/face.js";
import { fit, nameFit } from "./ui/face-fx.js";
import { setPool } from "./ui/gem.js";
import { COMPACT } from "./ui/compact.js";
import { setSeat } from "./ui/seat.js";
import { DLIST, DRAWER, HUD, PEEK, REST, RULE_PEEK, flinch, setStrip } from "./ui/hud.js";

const TRACK = { hp: "hitPoints", st: "stress", ar: "armorSlots" } as const;
type StripKind = keyof typeof TRACK;

/** How long a pointer rests before a hover peeks, and how long a peek outlives it. */
const PEEK_REST = 140;
const PEEK_GRACE = 250;

/* ── state ────────────────────────────────────────────────────────── */

let host: HTMLElement | null = null;
let sigils: Sigils = {};
let timer: ReturnType<typeof setTimeout> | null = null;
let forced = false;

/** What is on screen now, so the next refresh can tell a value from a shape. */
let drawn: { key: string; shape: string; live: Live; opts: any } | null = null;
/** The model behind the rail on screen: who it is of and what each handle means. */
let model: Model | null = null;

let drawer = "";
type PeekKind = "card" | "feat" | "stance";
let peek: { kind: PeekKind; id: string; pinned: boolean } | null = null;
let peekTimer: ReturnType<typeof setTimeout> | null = null;
/** The GM's pick among the adversaries in play, by token id, when nothing is controlled. */
let gmPick: string | null = null;

interface Feat {
  name: string;
  /** The Item it arrived on. */
  item: any;
  /** Which feature block on the Item, by printed name; blank for the Item's own. */
  bind: string;
  /** The card a press posts. */
  card: CardOptions | null;
  hope: number;
  price: ReturnType<typeof authoredPrice>;
  from: string;
  text: string;
  isHope: boolean;
  resourceIndexes: number[];
}

interface Model {
  role: "player" | "gm";
  key: string;
  /** The character a player rail is of, or the adversary on the GM's plinth. */
  actor: any;
  /** The adversary tokens in play, for a GM rail. */
  foes: any[];
  feats: Feat[];
  /** Loadout and vault cards and everything else a drawer shows, by item id. */
  cards: Map<string, { item: any; card: CardOptions }>;
  limit: number;
  opts: any;
}

/* ── mounting ─────────────────────────────────────────────────────── */

const enabled = (): boolean => game.settings?.get(SYSTEM_ID, "bottomHud") !== false;

export function registerBottomHud(): void {
  const wall = document.querySelector("#interface");
  if (!wall) {
    /* Said once, naming the file, for the Fear strip's reason: a surface that
       silently fails to appear is the one failure with nothing on screen to
       diagnose. */
    console.error(
      `${SYSTEM_ID} | no #interface to dock the bottom HUD in — Foundry's layout ` +
        `has changed and bottom-hud.ts needs a new dock.`,
    );
    return;
  }
  host?.remove();
  host = document.createElement("div");
  host.className = "dh-bhud-host";
  wall.append(host);

  host.addEventListener("click", onClick);
  host.addEventListener("pointerover", onOver);
  host.addEventListener("pointerout", onOut);
  host.addEventListener("dragstart", onDragStart);
  host.addEventListener("dragover", onDragOver);
  host.addEventListener("drop", onDrop);
  document.addEventListener("pointerdown", onOutside, true);
  document.addEventListener("keydown", onKey);

  /* The right gutter is the sidebar's width, which the player can collapse
     and drag; the rail follows it rather than running underneath. */
  const side = document.querySelector("#sidebar");
  if (side && "ResizeObserver" in window) new ResizeObserver(() => gutter()).observe(side);
  window.addEventListener("resize", () => gutter());

  loadSigils().then((s) => {
    sigils = s;
    schedule(true);
  });

  const any = () => schedule();
  Hooks.on("daggerheart.bottomHudChanged", () => schedule(true));
  for (const h of [
    "updateActor",
    "createItem",
    "updateItem",
    "deleteItem",
    "createActiveEffect",
    "updateActiveEffect",
    "deleteActiveEffect",
    "createToken",
    "updateToken",
    "deleteToken",
    "controlToken",
    "updateUser",
    "canvasReady",
  ]) {
    Hooks.on(h, any);
  }
  schedule(true);
}

/**
 * Coalesce to one refresh per macrotask. A box-select over three creatures
 * raises `controlToken` three times and applying damage is four writes; the
 * rail should answer the last of them, once. A timeout and not a frame, for
 * the ruler's reason: rAF does not fire in a tab that is not painting.
 */
function schedule(force = false): void {
  forced ||= force;
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    const f = forced;
    forced = false;
    try {
      refresh(f);
    } catch (err) {
      console.error(`${SYSTEM_ID} | bottom HUD refresh failed`, err);
    }
  }, 0);
}

/* ── whose rail ───────────────────────────────────────────────────── */

const isChar = (a: any): boolean => a?.type === "character";

function subject(): { role: "player"; actor: any } | { role: "gm" } | null {
  const user = game.user;
  const controlled = (canvas as any)?.tokens?.controlled ?? [];
  const mine = controlled
    .map((t: any) => t.actor)
    .filter((a: any) => isChar(a) && a.testUserPermission?.(user, "OWNER"));
  if (controlled.length === 1 && mine.length === 1) return { role: "player", actor: mine[0] };
  if (user?.isGM) return { role: "gm" };
  const own = (user as any)?.character;
  if (isChar(own)) return { role: "player", actor: own };
  return mine.length ? { role: "player", actor: mine[0] } : null;
}

/** The characters at the table: every character a player owns. */
const party = (): any[] =>
  [...((game as any).actors ?? [])].filter((a: any) => isChar(a) && a.hasPlayerOwner);

/** The adversaries in play: every adversary token on the scene in view. */
/* In the scene's own order, not the canvas's. `placeables` is z-order, and
   controlling or redrawing a token re-sorts it — so the cards would shuffle
   under the GM's pointer and every HP change would read as a shape change. */
const foeTokens = (): any[] =>
  [...((canvas as any)?.scene?.tokens ?? [])]
    .map((d: any) => d.object)
    .filter((t: any) => t?.actor?.type === "adversary");

/* ── the model ────────────────────────────────────────────────────── */

const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The sheet's snapshot shape, without the clone: nothing here writes to it. */
const snapOf = (i: any) => ({
  id: i.id,
  uuid: i.uuid,
  name: i.name,
  type: i.type,
  img: i.img,
  sort: i.sort ?? 0,
  system: i.system,
});

const itemsOf = (actor: any, type: string): any[] =>
  [...(actor?.items ?? [])]
    .filter((i: any) => i.type === type)
    .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0));

const pair = (t: any): [number, number] => [Number(t?.marked ?? 0), Number(t?.max ?? 0)];

function ctxOf(actor: any) {
  const sys = actor.system ?? {};
  return {
    domains: sys.domains,
    classDomains: Object.fromEntries(
      itemsOf(actor, "class").map((c) => [c.name.toLowerCase(), c.system?.domains ?? {}]),
    ),
    armorSlots: sys.resources?.armorSlots?.max ?? 0,
    armorMarked: sys.resources?.armorSlots?.marked ?? 0,
    actor,
  };
}

/** A party seat. The character's own picture and the four printed tracks. */
function seatOf(a: any): any {
  const r = a.system?.resources ?? {};
  const scars = (a.system?.scars ?? []).length;
  const hp = pair(r.hitPoints);
  const vulnerable = a.statuses?.has?.("vulnerable");
  const down = hp[1] > 0 && hp[0] >= hp[1];
  return {
    id: a.id,
    name: a.name,
    sub: down ? "Down" : vulnerable ? "Vulnerable" : (itemsOf(a, "class")[0]?.name ?? ""),
    state: down ? "down" : vulnerable ? "vulnerable" : undefined,
    img: portraitOf(a) ?? a.img,
    hp,
    st: pair(r.stress),
    ar: pair(r.armorSlots),
    hope: [Number(r.hope?.value ?? 0), Number(r.hope?.max ?? 0) + scars, scars],
  };
}

function conditionsOf(actor: any): any[] {
  const effects = (CONFIG as any).statusEffects ?? [];
  return [...(actor.statuses ?? [])]
    .map((id: string) => effects.find((e: any) => e.id === id))
    .filter((e: any) => e && e.id !== "dead")
    .map((e: any) => ({
      id: e.id,
      name: game.i18n?.localize(e.name ?? e.label ?? e.id) ?? e.id,
      icon: e.img ?? e.icon,
      tone: e.id === "vulnerable" ? "danger" : undefined,
    }));
}

/**
 * The features column: the Hope feature first, then every class feature, then
 * standalone feature Items — the sheet's Features panel at the rail's height.
 * Each row prints what pressing it costs, read off its authored actions, and
 * the press posts the rule with exactly those actions on it.
 */
function featsOf(actor: any): Feat[] {
  const out: Feat[] = [];
  const cls = itemsOf(actor, "class")[0];
  const hf = cls?.system?.hopeFeature;
  if (cls && (hf?.name || hf?.description)) {
    const cost = hopeCost(hf);
    out.push({
      name: hf.name || "Hope Feature",
      item: cls,
      bind: "",
      card: hopeCard(snapOf(cls), sigils),
      hope: cost,
      price: { hope: cost, stress: 0, fear: 0, armor: 0 },
      from: `Hope feature · <em>${cost} Hope</em>`,
      text: rich(plain(hf.description)),
      isHope: true,
      resourceIndexes: [],
    });
  }
  for (const c of itemsOf(actor, "class")) {
    (c.system?.classFeatures ?? []).forEach((f: any, i: number) => {
      if (!f?.name && !f?.description) return;
      const price = authoredPrice(f.actions);
      out.push({
        name: f.name || "Feature",
        item: c,
        bind: f.name ?? "",
        card: featureCard(sigils, {
          item: snapOf(c),
          feature: f,
          slot: `class${i}`,
          type: "CLASS FEATURE",
          foot: c.name,
          domains: c.system?.domains,
          className: c.name,
          bind: f.name ?? "",
          actor,
        }),
        hope: price.hope ?? 0,
        price,
        from: `Class feature · ${esc(c.name)}`,
        text: rich(plain(f.description)),
        isHope: false,
        resourceIndexes: resourcesFor(c, f.name ?? "", actor).map((r: any) => r.i),
      });
    });
  }
  /* Stances are features, and a Martial Artist knows up to sixteen of them:
     they have their own plate and drawer rather than flooding this one. */
  for (const f of itemsOf(actor, "feature").filter((x) => !isStance(x))) {
    const price = authoredPrice(f.system?.actions);
    out.push({
      name: f.name,
      item: f,
      bind: "",
      card: cardOf(snapOf(f), sigils, ctxOf(actor)),
      hope: price.hope ?? 0,
      price,
      from: esc(f.system?.origin || FEATURE_KIND_LABELS[f.system?.kind] || "Feature"),
      text: rich(plain(f.system?.description)),
      isHope: false,
      resourceIndexes: resourcesFor(f, "", actor).map((r: any) => r.i),
    });
  }
  return out;
}

/**
 * The stance plate's options, for a character holding the Martial Artist
 * subclass and nobody else — the sheet's gate, matched on `subclassName`
 * because a Martial Artist holds one to three differently named cards.
 */
function stanceOf(actor: any): any {
  if (!itemsOf(actor, "subclass").some((s) => s.system?.subclassName === FOCUS_SUBCLASS)) return null;
  const f = actor.system?.resources?.focus ?? {};
  const on = activeStance(actor);
  return {
    focus: [Number(f.value ?? 0), Number(f.max ?? FOCUS_MAX)],
    active: on ? { id: on.id, name: on.name, tier: stanceTier(on) } : null,
    known: knownStances(actor).filter((x) => x.id !== on?.id).length,
  };
}

/** The row's readout: its price, or the uses it has left, or nothing. */
function featRow(actor: any, f: Feat): any {
  const it = snapOf(f.item);
  const uses = counterGroups(it, actor, f.bind).find((g) => g.kind === "uses" && g.max);
  return {
    name: f.name,
    hope: f.hope || undefined,
    stress: !f.hope && f.price.stress ? f.price.stress : undefined,
    uses: !f.hope && !f.price.stress && uses ? [uses.value ?? 0, uses.max] : undefined,
    spent: !f.isHope && f.bind ? featureSpent(it, f.bind, actor) : false,
  };
}

function playerModel(actor: any): Model {
  const sys = actor.system ?? {};
  const r = sys.resources ?? {};
  const ctx = ctxOf(actor);
  const limit = Number(sys.loadoutLimit ?? LOADOUT_LIMIT);
  const scars = (sys.scars ?? []).length;
  const hope = Number(r.hope?.value ?? 0);
  const hopeMax = Number(r.hope?.max ?? 6);
  const cards = new Map<string, { item: any; card: CardOptions }>();
  const card = (i: any, state?: any): any => {
    const c = cardOf(snapOf(i), sigils, state ? { ...ctx, state } : ctx);
    if (c) cards.set(i.id, { item: i, card: c });
    return c ? { ...c, id: i.id } : null;
  };

  const domain = itemsOf(actor, "domainCard");
  const hand = domain.filter((c) => c.system?.inLoadout).map((c) => card(c)).filter(Boolean);
  const vaulted = domain.filter((c) => !c.system?.inLoadout);
  for (const c of vaulted) card(c);
  for (const t of ["subclass", "ancestry", "community", "weapon", "armor", "consumable", "loot"]) {
    for (const i of itemsOf(actor, t)) card(i);
  }

  const weapon = (slot: string) => {
    const w = itemsOf(actor, "weapon").find((x) => x.system?.equipped && x.system?.slot === slot);
    return w
      ? { name: w.name, meta: `${rangeLabel(w.system.range)} · ${traitLabel(w.system.trait)}`, dmg: damageLine(actor, w) }
      : null;
  };

  const feats = featsOf(actor);
  const cls = itemsOf(actor, "class")[0];
  const traits: Record<string, number> = {};
  const marked: string[] = [];
  for (const [k, t] of Object.entries<any>(sys.traits ?? {})) {
    traits[k] = Number(t?.total ?? t?.value ?? 0);
    if (t?.marked) marked.push(k);
  }

  const opts = {
    role: "player",
    stack: party()
      .filter((a) => a.id !== actor.id)
      .map(seatOf),
    plinth: {
      name: actor.name,
      sub: `${esc(cls?.name ?? "")} ${sys.level ?? 1} · Evasion <em>${sys.evasion?.value ?? 0}</em>`,
      img: portraitOf(actor) ?? actor.img,
      hopeLit: hopeMax ? hope / (hopeMax + scars) : 0,
      hope,
      conds: conditionsOf(actor),
    },
    vitals: {
      hope: [hope, hopeMax + scars, scars],
      hp: pair(r.hitPoints),
      st: pair(r.stress),
      ar: pair(r.armorSlots),
      thresholds: [sys.thresholds?.major ?? 0, sys.thresholds?.severe ?? 0],
    },
    actions: { traits, marked, weapon: weapon("primary"), secondary: weapon("secondary") },
    features: { list: feats.map((f) => featRow(actor, f)), hope },
    stance: stanceOf(actor),
    hand: { cards: hand, limit },
    drawers: {
      counts: {
        vault: vaulted.length,
        cards: ["subclass", "ancestry", "community"].reduce((n, t) => n + itemsOf(actor, t).length, 0),
        bag: ["weapon", "armor", "consumable", "loot"].reduce((n, t) => n + itemsOf(actor, t).length, 0),
        experiences: (sys.experiences ?? []).length,
      },
    },
  };
  return { role: "player", key: `player:${actor.uuid}`, actor, foes: [], feats, cards, limit, opts };
}

function gmModel(): Model {
  const tokens = foeTokens();
  const controlled = ((canvas as any)?.tokens?.controlled ?? []).find(
    (t: any) => t.actor?.type === "adversary",
  );
  if (controlled) gmPick = controlled.id;
  const sel = tokens.find((t) => t.id === gmPick) ?? tokens[0] ?? null;
  const a = sel?.actor ?? null;
  const cards = new Map<string, { item: any; card: CardOptions }>();
  const feats: Feat[] = [];

  let adversary: any = null;
  let plinth: any = {
    name: (canvas as any)?.scene?.name ?? "No scene",
    sub: "Game Master",
    img: "",
    hopeLit: 0,
  };
  if (a) {
    const sys = a.system ?? {};
    const r = sys.resources ?? {};
    const atk = sys.attack ?? {};
    const bonus = Number(atk.damage?.bonus ?? 0);
    const ctx = { actor: a };
    for (const f of itemsOf(a, "feature")) {
      const c = cardOf(snapOf(f), sigils, ctx);
      if (c) cards.set(f.id, { item: f, card: c });
    }
    adversary = {
      difficulty: sys.difficulty ?? 0,
      hp: pair(r.hitPoints),
      st: pair(r.stress),
      thresholds: [sys.thresholds?.major ?? 0, sys.thresholds?.severe ?? 0],
      attack: {
        name: atk.name || "Attack",
        mod: Number(atk.modifier ?? 0),
        range: rangeLabel(atk.range ?? "melee"),
        dmg:
          damageDice(atk.damage) +
          (bonus ? `${bonus > 0 ? "+" : "−"}${Math.abs(bonus)}` : "") +
          (atk.damage?.type === "magic" ? " mag" : " phy"),
      },
      features: itemsOf(a, "feature").map((f) => ({
        id: f.id,
        name: f.name,
        kind: FEATURE_KIND_LABELS[f.system?.kind] ?? "Feature",
        fear: Number(f.system?.fearCost || authoredPrice(f.system?.actions).fear || 0) || undefined,
        text: plain(f.system?.description),
      })),
    };
    plinth = {
      name: sel.name ?? a.name,
      sub: `${esc(ADVERSARY_TYPE_LABELS[sys.role] ?? "Adversary")} · Tier ${sys.tier ?? 1}`,
      img: portraitOf(a) ?? a.img,
      hopeLit: 0,
      conds: conditionsOf(a),
    };
  }

  const opts = {
    role: "gm",
    stack: party().map(seatOf),
    plinth,
    adversary,
    foes: {
      selected: sel?.id,
      foes: tokens.map((t) => ({
        id: t.id,
        name: t.name ?? t.actor.name,
        role: ADVERSARY_TYPE_LABELS[t.actor.system?.role] ?? "Adversary",
        tier: t.actor.system?.tier ?? 1,
        img: portraitOf(t.actor) ?? t.document?.texture?.src,
        hp: pair(t.actor.system?.resources?.hitPoints),
      })),
    },
  };
  return { role: "gm", key: `gm:${sel?.id ?? ""}`, actor: a, foes: tokens, feats, cards, limit: 0, opts };
}

/* ── drawing ──────────────────────────────────────────────────────── */

let swapTimer = 0;

function refresh(force: boolean): void {
  if (!host) return;
  /* A swap still fading out is superseded by whatever this refresh decides:
     left to land, it would paint the subject of a selection that has since
     been released. */
  if (swapTimer) {
    clearTimeout(swapTimer);
    swapTimer = 0;
    rail()?.classList.remove("is-leaving");
  }
  const who = enabled() ? subject() : null;
  document.body.classList.toggle("dh-bhud-on", !!who);
  if (!who) {
    host.replaceChildren();
    drawn = model = null;
    lift();
    return;
  }
  const next = who.role === "gm" ? gmModel() : playerModel(who.actor);
  const shape = shapeOf(next.opts);
  const live = liveOf(next.opts);
  const root = rail();

  if (!force && root && drawn && drawn.key === next.key && drawn.shape === shape) {
    const prev = drawn.live;
    model = next;
    drawn = { key: next.key, shape, live, opts: next.opts };
    drive(root, prev, live);
    if (drawer) showDrawer(drawer, false);
    if (peek) showPeek(peek.kind, peek.id, peek.pinned, false);
    return;
  }

  const swapped = !!drawn && drawn.key !== next.key;
  if (swapped) {
    drawer = "";
    peek = null;
  }
  const arrive = !drawn || swapped;
  const draw = () => {
    model = next;
    drawn = { key: next.key, shape, live, opts: next.opts };
    paint(arrive);
  };
  if (swapped && root && !reduced()) {
    root.classList.add("is-leaving");
    swapTimer = window.setTimeout(() => {
      swapTimer = 0;
      draw();
    }, 150);
  } else draw();
}

const rail = (): HTMLElement | null => host?.querySelector<HTMLElement>(".bhud") ?? null;
const reduced = (): boolean => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const folded = (): boolean => game.settings?.get(SYSTEM_ID, "bottomHudFolded") === true;

function paint(arrive: boolean): void {
  if (!host || !model) return;
  const o = model.opts;
  host.innerHTML = HUD({
    ...o,
    folded: folded(),
    drawers: { ...(o.drawers ?? {}), open: drawer },
  });
  const root = rail();
  if (!root) return;
  /* The compound `.dh.bhud`: the palette from one class and the shape from
     the other, because nothing on this edge is inside a sheet. */
  root.classList.add("dh");
  gutter();
  if (!canAct(model.role, game.user, model.actor)) root.setAttribute("data-readonly", "");
  if (arrive && !reduced()) {
    root.classList.add("is-arriving");
    setTimeout(() => root.classList.remove("is-arriving"), 700);
  }
  if (drawer) showDrawer(drawer, false);
  if (peek) showPeek(peek.kind, peek.id, peek.pinned, false);
  requestAnimationFrame(() => lift());
}

/** Values only: the setters, and the one thing a value change also says. */
function drive(root: HTMLElement, prev: Live, next: Live): void {
  if (next.role === "player") {
    const gems = root.querySelector<HTMLElement>(".bh-hope .gems");
    if (gems && next.hope !== prev.hope) setPool(gems, next.hope ?? 0);
    const hn = root.querySelector(".bh-hn b");
    if (hn) hn.textContent = String(next.hope ?? 0);
    const ph = root.querySelector(".bh-ph b");
    if (ph) ph.textContent = String(next.hope ?? 0);
    const plinth = root.querySelector<HTMLElement>("[data-plinth]");
    const of = (next.hopeMax ?? 0) || 1;
    plinth?.style.setProperty("--bh-hope", ((next.hope ?? 0) / of).toFixed(3));
    if (next.focus && next.focus[0] !== prev.focus?.[0]) {
      const fg = root.querySelector<HTMLElement>(".bh-focus .gems");
      if (fg) setPool(fg, next.focus[0]);
      const fn = root.querySelector(".bh-fn b");
      if (fn) fn.textContent = String(next.focus[0]);
    }
    for (const f of root.querySelectorAll<HTMLElement>(".bh-feat[data-hope]")) {
      const short = (next.hope ?? 0) < Number(f.dataset.hope);
      if (short) {
        f.setAttribute("aria-disabled", "true");
        f.title = `Needs ${f.dataset.hope} Hope`;
      } else {
        f.removeAttribute("aria-disabled");
        f.removeAttribute("title");
      }
    }
  }
  const strips = root.querySelector(next.role === "gm" ? ".bh-adv" : ".bh-vitals");
  for (const k of ["hp", "st", "ar"] as StripKind[]) {
    const v = next[k];
    const el = strips?.querySelector<HTMLElement>(`[data-strip="${k}"]`);
    if (v && el && v[0] !== prev[k]?.[0]) setStrip(el, v[0]);
  }
  if (tookHit(prev, next)) {
    const p = root.querySelector<HTMLElement>("[data-plinth]");
    if (p && !reduced()) flinch(p);
  }
  for (const [id, s] of Object.entries(next.seats)) {
    const el = root.querySelector<HTMLElement>(`[data-seat="${CSS.escape(id)}"]`);
    if (el) setSeat(el, s);
  }
  for (const [id, hp] of Object.entries(next.foes)) {
    if (prev.foes[id]?.[0] === hp[0]) continue;
    const held = root.querySelector(`.bh-foes [data-card="${CSS.escape(id)}"]`)?.closest(".bh-held");
    const mini = held?.querySelector(".bh-mini");
    if (!mini) continue;
    mini.querySelectorAll("i").forEach((i, n) => i.classList.toggle("on", n < hp[0]));
    mini.setAttribute("aria-valuenow", String(hp[0]));
  }
}

/* The rail runs from the left margin to the sidebar's edge, whatever width
   the sidebar has been dragged to or collapsed down to. */
function gutter(): void {
  const root = rail();
  const wall = document.querySelector("#interface");
  const side = document.querySelector("#sidebar");
  if (!root || !wall) return;
  const right = wall.getBoundingClientRect().right;
  const edge = side?.getBoundingClientRect().left ?? right;
  root.style.setProperty("--bh-gutter-r", `${Math.max(12, Math.round(right - edge + 12))}px`);
}

/* The players list sits bottom-left, which is where the party stack stands;
   lift it clear of the tallest thing on the rail's left end. */
function lift(): void {
  const root = rail();
  const body = document.body;
  if (!root) return void body.style.removeProperty("--dh-bhud-lift");
  let top = root.getBoundingClientRect().top;
  for (const el of root.querySelectorAll(".bh-stack, .bh-plinth .bh-fig")) {
    top = Math.min(top, el.getBoundingClientRect().top);
  }
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ui-scale")) || 1;
  body.style.setProperty("--dh-bhud-lift", `${Math.max(0, Math.round((innerHeight - top + 8) / scale))}px`);
}

/* ── drawers ──────────────────────────────────────────────────────── */

function drawerBody(k: string): string {
  const m = model;
  if (!m || m.role !== "player") return "";
  const a = m.actor;
  const sys = a.system ?? {};
  const cardsOf = (types: string[]) =>
    types.flatMap((t) => itemsOf(a, t)).filter((i) => m.cards.has(i.id));
  if (k === "vault") {
    const left = Number(sys.resources?.stress?.max ?? 6) - Number(sys.resources?.stress?.marked ?? 0);
    const vault = itemsOf(a, "domainCard").filter((c) => !c.system?.inLoadout);
    return DRAWER({
      title: "Vault",
      note: "Recall costs <em>Stress</em> · press to recall, or drag onto a card to swap",
      body: vault.length
        ? `<ul class="bh-vault">${vault
            .map((c) => {
              const card = m.cards.get(c.id)?.card;
              if (!card) return "";
              const reach = Number(c.system?.recallCost ?? 0) > left ? "out-of-reach" : "within-reach";
              return COMPACT({
                ...card,
                id: c.id,
                size: "s",
                cls: "is-vaulted",
                state: card.state === "used" ? "used" : reach,
              });
            })
            .join("")}</ul>`
        : DLIST({ rows: [], empty: "The vault is empty." }),
    });
  }
  if (k === "cards") {
    const held = cardsOf(["subclass", "ancestry", "community"]);
    return DRAWER({
      title: "Subclass and heritage",
      note: "Press a card to show it",
      body: held.length
        ? `<ul class="bh-vault">${held
            .map((i) => COMPACT({ ...m.cards.get(i.id)!.card, id: i.id, size: "s" }))
            .join("")}</ul>`
        : DLIST({ rows: [], empty: "No subclass or heritage cards yet." }),
    });
  }
  /* The rows the Features plate had no room for — every one, so the list is
     one place to look. A row opens the same peek a plate row does, pinned,
     which is where Use and Post live. */
  if (k === "feats") {
    const rows = m.feats.map((f) => ({
      key: `feat:${f.name}`,
      name: f.name,
      /* `from` is set for the plate, with its cost in markup; a row prints
         text, and the Hope feature's cost is already in it. */
      meta: f.from.replace(/<[^>]+>/g, ""),
      n: f.isHope ? undefined : priceLabel(f.price) || undefined,
      act: true,
      title: "Read it, and use it from there",
    }));
    return DRAWER({ title: "Features", note: "Press one to read and use it", body: DLIST({ rows }) });
  }
  /* Every stance this character knows. A row is the shift itself — the shared
     `shiftStance`, which pays and posts — and shift-click asks for the
     Stress, Flow State's trade, exactly as the sheet's own row does. */
  if (k === "stances") {
    const on = activeStance(a);
    const flow = hasFlowState(a);
    const rows = knownStances(a).map((x) => ({
      key: `stance:${x.id}`,
      name: x.name,
      meta: `Tier ${stanceTier(x)}`,
      n: x.id === on?.id ? game.i18n.localize("DAGGERHEART.Stance.Active") : undefined,
      act: x.id !== on?.id,
      title: game.i18n.format(
        !stancePayer(a)
          ? "DAGGERHEART.Stance.CannotShift"
          : Number(sys.resources?.focus?.value ?? 0) < 1
            ? "DAGGERHEART.Stance.ShiftStressHint"
            : flow
              ? "DAGGERHEART.Stance.ShiftFlowHint"
              : "DAGGERHEART.Stance.ShiftHint",
        { stance: x.name },
      ),
    }));
    return DRAWER({
      title: game.i18n.localize("DAGGERHEART.Stance.Heading"),
      note: flow ? "Press to spend a Focus and shift · shift-click marks a Stress" : "Press to spend a Focus and shift",
      body: DLIST({ rows, empty: game.i18n.localize("DAGGERHEART.Stance.Empty") }),
    });
  }
  if (k === "bag") {
    const label: Record<string, string> = { weapon: "Weapon", armor: "Armor", consumable: "Consumable", loot: "Item" };
    const rows = ["weapon", "armor", "consumable", "loot"].flatMap((t) =>
      itemsOf(a, t).map((i) => ({
        key: i.id,
        name: i.name,
        meta: `${label[t]}${i.system?.equipped ? " · equipped" : ""}`,
        n: Number(i.system?.quantity ?? 1) > 1 ? `×${i.system.quantity}` : undefined,
        act: true,
        title: "Show it to the table",
      })),
    );
    return DRAWER({ title: "Bag", note: "Press an item to show it", body: DLIST({ rows, empty: "The bag is empty." }) });
  }
  if (k === "experiences") {
    const rows = (sys.experiences ?? []).map((x: any, i: number) => ({
      key: String(i),
      name: x.name || "Experience",
      n: `${Number(x.modifier ?? 0) >= 0 ? "+" : "−"}${Math.abs(Number(x.modifier ?? 0))}`,
    }));
    return DRAWER({
      title: "Experiences",
      note: "Add one to a roll from its popover",
      body: DLIST({ rows, empty: "No Experiences yet." }),
    });
  }
  if (k === "rest") return DRAWER({ title: "Rest", body: REST() });
  return "";
}

function showDrawer(k: string, animate = true): void {
  const root = rail();
  if (!root) return;
  const old = root.querySelector(".bh-drawer");
  const html = drawerBody(k);
  drawer = html ? k : "";
  if (drawer) root.setAttribute("data-drawer", drawer);
  else root.removeAttribute("data-drawer");
  for (const b of root.querySelectorAll<HTMLElement>(".bh-dw[data-drawer]")) {
    const on = b.dataset.drawer === drawer;
    b.classList.toggle("on", on);
    if (b.dataset.drawer !== "sheet") b.setAttribute("aria-expanded", String(on));
  }
  if (!html) return void old?.remove();
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  const el = tpl.content.firstElementChild as HTMLElement;
  if (!animate) el.style.animation = "none";
  for (const li of el.querySelectorAll<HTMLElement>(".bh-vault [data-card]")) {
    if (k === "vault") li.draggable = true;
  }
  if (old) old.replaceWith(el);
  else root.append(el);
}

function closeDrawer(): void {
  const el = rail()?.querySelector<HTMLElement>(".bh-drawer");
  const done = () => showDrawer("");
  if (!el || reduced()) return done();
  el.classList.add("is-closing");
  setTimeout(done, 130);
}

/* ── peeks ────────────────────────────────────────────────────────── */

function peekHTML(kind: PeekKind, id: string): string {
  const m = model;
  if (!m) return "";
  if (kind === "stance") {
    /* Only the stance you are in has a peek: a drop the rail did not make —
       Severe damage, the scene ending, another client shifting — has to take
       a pinned one down rather than leave Drop pointing at the wrong stance. */
    const st = activeStance(m.actor);
    if (st?.id !== id) return "";
    return RULE_PEEK({
      name: st.name,
      from: `${game.i18n.localize("DAGGERHEART.Stance.Active")} · Tier ${stanceTier(st)}`,
      text: rich(plain(st.system?.description)),
      actions: [
        { id: "drop", label: game.i18n.localize("DAGGERHEART.Stance.Drop"), said: game.i18n.format("DAGGERHEART.Stance.DropHint", { stance: st.name }) },
        { id: "post", label: "Post", said: "Show to chat" },
      ],
    });
  }
  if (kind === "feat") {
    const f = m.feats.find((x) => x.name === id);
    if (!f) return "";
    const hope = Number(m.actor?.system?.resources?.hope?.value ?? 0);
    const cost = priceLabel(f.price);
    return RULE_PEEK({
      name: f.name,
      from: f.from,
      text: f.text,
      actions: [
        {
          id: "use",
          label: f.isHope || cost ? "Use" : "Post",
          cost: f.isHope ? `${f.hope} Hope` : cost,
          tone: f.isHope || f.price.hope ? "hope" : f.price.stress ? "stress" : "",
          said: f.isHope ? `Spend ${f.hope} Hope and post it` : "Post it with its actions",
          short: f.isHope && f.hope > hope ? `Needs ${f.hope} Hope` : "",
        },
        ...(f.isHope ? [{ id: "post", label: "Post", said: "Show to chat without spending" }] : []),
      ],
    });
  }
  const c = m.cards.get(id);
  if (!c) return "";
  const inHand = c.item.type === "domainCard" && c.item.system?.inLoadout;
  return PEEK({
    face: `<div class="bh-pfhost" style="container-type:inline-size;width:264px">${FACE({ ...c.card, size: "full" })}</div>`,
    actions: [
      { id: "post", label: "Post", said: "Show to chat, with the card's own actions" },
      ...(inHand
        ? [{ id: "vault", label: "Vault", cost: "Free", said: "Move it to the vault. Recalling it later costs its Recall Cost in Stress." }]
        : []),
    ],
  });
}

function showPeek(kind: PeekKind, id: string, pinned: boolean, animate = true): void {
  const root = rail();
  if (!root) return;
  const html = peekHTML(kind, id);
  root.querySelector(".bh-peek")?.remove();
  root.querySelectorAll(".is-peek").forEach((e) => e.classList.remove("is-peek"));
  if (!html) return void (peek = null);
  peek = { kind, id, pinned };
  const src =
    kind === "feat"
      ? root.querySelector<HTMLElement>(`.bh-feat[data-feature="${CSS.escape(id)}"]`)
      : kind === "stance"
      ? root.querySelector<HTMLElement>(`.bh-stn[data-stance="${CSS.escape(id)}"]`)
      : root.querySelector(`.bh-hand:not(.bh-foes) [data-card="${CSS.escape(id)}"]`)?.closest<HTMLElement>(".bh-held") ?? null;
  src?.classList.add("is-peek");
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  const el = tpl.content.firstElementChild as HTMLElement;
  if (!animate) el.style.animation = "none";
  root.append(el);
  if (src) {
    const r = src.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    const x = r.left - rr.left + r.width / 2 - 132;
    root.style.setProperty("--bh-peek-x", `${Math.round(Math.max(8, Math.min(rr.width - 272, x)))}px`);
  }
  if (kind === "card") {
    fit(el);
    nameFit(el);
    document.fonts?.ready.then(() => el.isConnected && (fit(el), nameFit(el)));
  }
}

function closePeek(): void {
  if (peekTimer) clearTimeout(peekTimer);
  peekTimer = null;
  const root = rail();
  const el = root?.querySelector<HTMLElement>(".bh-peek");
  peek = null;
  root?.querySelectorAll(".is-peek").forEach((e) => e.classList.remove("is-peek"));
  if (!el) return;
  if (reduced()) return void el.remove();
  el.classList.add("is-closing");
  setTimeout(() => el.remove(), 130);
}

/** What a pointer over this element would peek, if anything. */
function peekTarget(t: HTMLElement): { kind: PeekKind; id: string } | null {
  if (model?.role !== "player") return null;
  const stn = t.closest<HTMLElement>(".bh-stn[data-stance]");
  if (stn) return { kind: "stance", id: stn.dataset.stance! };
  const feat = t.closest<HTMLElement>(".bh-feat[data-feature]");
  if (feat) return { kind: "feat", id: feat.dataset.feature! };
  const held = t.closest(".bh-hand:not(.bh-foes) .bh-held");
  const id = held?.querySelector<HTMLElement>("[data-card]")?.dataset.card;
  return id ? { kind: "card", id } : null;
}

function onOver(e: PointerEvent): void {
  const t = e.target as HTMLElement;
  if (t.closest(".bh-peek")) {
    if (peekTimer) clearTimeout(peekTimer);
    peekTimer = null;
    return;
  }
  const want = peekTarget(t);
  if (!want || peek?.pinned || drawer) return;
  if (peek?.kind === want.kind && peek.id === want.id) {
    if (peekTimer) clearTimeout(peekTimer);
    peekTimer = null;
    return;
  }
  if (peekTimer) clearTimeout(peekTimer);
  peekTimer = setTimeout(() => showPeek(want.kind, want.id, false), PEEK_REST);
}

function onOut(e: PointerEvent): void {
  if (!peek || peek.pinned) {
    if (peekTimer && !peek) clearTimeout(peekTimer);
    return;
  }
  const to = e.relatedTarget as HTMLElement | null;
  if (to && (to.closest?.(".bh-peek") || peekTarget(to)?.id === peek.id)) return;
  if (peekTimer) clearTimeout(peekTimer);
  peekTimer = setTimeout(closePeek, PEEK_GRACE);
}

function onOutside(e: Event): void {
  const t = e.target as HTMLElement;
  if (t.closest?.(".dh-bhud-host")) return;
  if (peek) closePeek();
}

function onKey(e: KeyboardEvent): void {
  if (e.key !== "Escape") return;
  if (peek) closePeek();
  else if (drawer) closeDrawer();
}

/* ── presses ──────────────────────────────────────────────────────── */

/** The thing that could not pay is the thing that flinches — no dialog. */
function deny(el: Element | null | undefined): void {
  (el as HTMLElement | null)?.animate?.(
    [{ translate: "0 0" }, { translate: "-3px 0" }, { translate: "3px 0" }, { translate: "0 0" }],
    220,
  );
}

async function onClick(e: MouseEvent): Promise<void> {
  const m = model;
  const root = rail();
  const t = e.target as HTMLElement;
  if (!m || !root) return;
  const may = canAct(m.role, game.user, m.actor);
  const a = m.actor;

  if (t.closest('[data-act="fold"]')) {
    const next = !folded();
    root.toggleAttribute("data-folded", next);
    t.closest(".bh-fold")?.setAttribute("aria-expanded", String(!next));
    t.closest(".bh-fold")?.setAttribute("aria-label", next ? "Show the whole HUD" : "Fold the HUD");
    if (next) closePeek();
    await game.settings?.set(SYSTEM_ID, "bottomHudFolded", next);
    return;
  }

  /* The peek's own strip first: it stands over everything else. */
  const pa = t.closest<HTMLElement>(".bh-peek .bh-pa[data-pa]");
  if (pa && peek) {
    if (!may) return;
    if (pa.getAttribute("aria-disabled") === "true") return deny(pa);
    const which = pa.dataset.pa;
    const p = peek;
    if (p.kind === "feat") {
      const f = m.feats.find((x) => x.name === p.id);
      if (f) await useFeat(f, which === "use", root);
    } else if (p.kind === "stance") {
      const st = a?.items?.get?.(p.id);
      if (which === "drop" && activeStance(a)?.id === p.id) await dropStance(a, "manual");
      if (which === "post" && st) {
        const card = cardOf(snapOf(st), sigils, ctxOf(a));
        if (card) await postCard(card, a);
      }
    } else {
      const c = m.cards.get(p.id);
      if (which === "post" && c) await postCard(c.card, a);
      if (which === "vault" && c) {
        closePeek();
        await placeCard(a, m.limit, p.id, "vault");
        return;
      }
    }
    closePeek();
    return;
  }

  const dw = t.closest<HTMLElement>(".bh-dw[data-drawer], .bh-feat.is-more[data-drawer]");
  if (dw) {
    const k = dw.dataset.drawer!;
    if (dw.getAttribute("aria-disabled") === "true") return deny(dw);
    if (k === "sheet") return void a?.sheet?.render(true);
    closePeek();
    if (drawer === k) closeDrawer();
    else showDrawer(k);
    return;
  }

  if (m.role === "gm") return onGmClick(t, m, root, may);
  if (!may) return;

  const trait = t.closest<HTMLElement>(".bh-trait[data-trait]");
  if (trait) return void askRoll(a, trait.dataset.trait as Trait, trait, { reaction: true });

  const wpn = t.closest<HTMLElement>(".bh-wpn[data-weapon]");
  if (wpn) {
    const w = itemsOf(a, "weapon").find((x) => x.system?.equipped && x.system?.slot === wpn.dataset.weapon);
    return void askAttack(a, w, wpn);
  }

  const box = t.closest<HTMLElement>(".bh-vitals .bh-box");
  if (box) return void pressStrip(a, box);

  if (t.closest('[data-act="damage"]')) return void takeDamage(a, 0, { ask: true });

  const feat = t.closest<HTMLElement>(".bh-feat[data-feature]");
  if (feat) {
    const f = m.feats.find((x) => x.name === feat.dataset.feature);
    if (!f) return;
    if (feat.getAttribute("aria-disabled") === "true") return deny(feat);
    closePeek();
    return void useFeat(f, true, root);
  }

  /* The stance you are in: like a held card, the press pins its peek, which
     is where Drop lives. */
  const stn = t.closest<HTMLElement>(".bh-stn[data-stance]");
  if (stn) {
    const sid = stn.dataset.stance!;
    if (peek?.id === sid && peek.pinned) return closePeek();
    if (peekTimer) clearTimeout(peekTimer);
    return showPeek("stance", sid, true, peek?.id !== sid);
  }

  /* A held card: the press pins its peek, which is where its actions are. */
  const held = t.closest(".bh-hand .bh-held");
  const id = held?.querySelector<HTMLElement>("[data-card]")?.dataset.card;
  if (id) {
    if (peek?.id === id && peek.pinned) return closePeek();
    if (peekTimer) clearTimeout(peekTimer);
    return showPeek("card", id, true, peek?.id !== id);
  }

  const inDrawer = t.closest<HTMLElement>(".bh-drawer [data-card]");
  if (inDrawer) {
    const cid = inDrawer.dataset.card!;
    if (drawer === "vault") {
      const plan = await placeCard(a, m.limit, cid, "loadout");
      if (!plan) deny(root.querySelector(".bh-hand"));
      else if ("refuse" in plan) deny(root.querySelector('.bh-vitals [data-strip="st"]'));
      return;
    }
    const c = m.cards.get(cid);
    if (c) await postCard(c.card, a);
    return;
  }

  const row = t.closest<HTMLElement>(".bh-drawer button.bh-drow[data-row]");
  if (row?.dataset.row?.startsWith("feat:")) return void showPeek("feat", row.dataset.row.slice(5), true);
  if (row?.dataset.row?.startsWith("stance:")) {
    const pay = e.shiftKey && hasFlowState(a) ? "stress" : "auto";
    if (!(await shiftStance(a, row.dataset.row.slice(7), { pay }))) {
      return deny(root.querySelector('[data-pool="focus"]'));
    }
    return closeDrawer();
  }
  if (row) {
    const c = m.cards.get(row.dataset.row!);
    if (c) await postCard(c.card, a);
    return;
  }

  const rb = t.closest<HTMLElement>(".bh-rb[data-rest]");
  if (rb) {
    closeDrawer();
    return void rest(a, rb.dataset.rest as "short" | "long");
  }
}

/** A feature press: the rule posted with its own actions, and the Hope feature's price with it. */
async function useFeat(f: Feat, use: boolean, root: HTMLElement): Promise<void> {
  const a = model?.actor;
  if (!a || !f.card) return;
  if (f.isHope) {
    const hope = Number(a.system?.resources?.hope?.value ?? 0);
    if (use && hope < f.hope) return deny(root.querySelector(".bh-hope"));
    await postCard(f.card, a, use ? { price: f.price } : {});
    return;
  }
  await postCard(f.card, a, { feature: f.bind, resourceIndexes: f.resourceIndexes });
}

async function pressStrip(actor: any, box: HTMLElement): Promise<void> {
  const strip = box.closest<HTMLElement>("[data-strip]");
  const kind = strip?.dataset.strip as StripKind | undefined;
  if (!kind || !actor) return;
  const track = actor.system?.resources?.[TRACK[kind]];
  if (!track) return;
  const next = pressBox(kind, Number(box.dataset.i), Number(track.marked ?? 0), Number(track.max ?? 0));
  if (next !== track.marked) await actor.markTrack(TRACK[kind], next - track.marked);
}

async function onGmClick(t: HTMLElement, m: Model, root: HTMLElement, may: boolean): Promise<void> {
  if (!may) return;
  const foe = t.closest(".bh-foes .bh-held")?.querySelector<HTMLElement>("[data-card]");
  if (foe) {
    gmPick = foe.dataset.card!;
    const tok = m.foes.find((x) => x.id === gmPick);
    if (tok?.control) tok.control({ releaseOthers: true });
    schedule();
    return;
  }
  const a = m.actor;
  if (!a) return;
  const box = t.closest<HTMLElement>(".bh-adv .bh-box");
  if (box) return void pressStrip(a, box);
  if (t.closest('.bh-move[data-act="attack"]')) return void rollAdversaryAttack(a);
  if (t.closest('.bh-move[data-act="moves"]')) return void a.sheet?.render(true);
  const move = t.closest<HTMLElement>(".bh-move[data-feature]");
  if (move) {
    const f = itemsOf(a, "feature").find((x) => x.name === move.dataset.feature);
    const c = f ? m.cards.get(f.id) : null;
    if (c) await postCard(c.card, a);
    return;
  }
  void root;
}

/* ── drag: vault into the hand ────────────────────────────────────── */

const DRAG = "application/x-dh-bhud";

function onDragStart(e: DragEvent): void {
  const li = (e.target as HTMLElement).closest?.<HTMLElement>(".bh-drawer .bh-vault [data-card]");
  if (!li || drawer !== "vault" || !e.dataTransfer) return;
  e.dataTransfer.setData(DRAG, li.dataset.card!);
  e.dataTransfer.effectAllowed = "move";
}

function onDragOver(e: DragEvent): void {
  if (!e.dataTransfer?.types.includes(DRAG)) return;
  if (!(e.target as HTMLElement).closest?.(".bh-hand:not(.bh-foes)")) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

async function onDrop(e: DragEvent): Promise<void> {
  const id = e.dataTransfer?.getData(DRAG);
  const hand = (e.target as HTMLElement).closest?.(".bh-hand:not(.bh-foes)");
  if (!id || !hand || !model || model.role !== "player") return;
  e.preventDefault();
  if (!canAct("player", game.user, model.actor)) return;
  const target =
    (e.target as HTMLElement).closest(".bh-held")?.querySelector<HTMLElement>("[data-card]")?.dataset.card ?? null;
  const plan = await placeCard(model.actor, model.limit, id, "loadout", target);
  const root = rail();
  if (!plan) deny(root?.querySelector(".bh-hand"));
  else if ("refuse" in plan) deny(root?.querySelector('.bh-vitals [data-strip="st"]'));
}

/** For `game.daggerheart.bottomHud()`: what the rail is of and why. */
export function reportBottomHud(): Record<string, unknown> {
  return {
    enabled: enabled(),
    mounted: !!rail(),
    role: model?.role ?? null,
    of: model?.actor?.name ?? null,
    drawer: drawer || null,
    peek,
    folded: folded(),
  };
}

export const redrawBottomHud = (): void => schedule(true);
