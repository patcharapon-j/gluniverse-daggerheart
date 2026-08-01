<script lang="ts">
  /**
   * The character sheet: rail and pane.
   *
   * The rail is ordered by how often each thing is touched, top to bottom —
   * identity, defence, damage, stress, hope, experience, gold — because if
   * the window is ever short enough to scroll it, the tail is what should go.
   *
   * The class tab is gone. A character has exactly one ancestry, one
   * community, one class and between one and three subclass cards; its
   * contents could never change, and a tab whose contents never change is a
   * heading that costs a click. Those four are rows in the main tab now,
   * last, where they cost almost nothing.
   */

  /* eslint-disable @typescript-eslint/no-explicit-any */

  import {
    ADVANCEMENT,
    BURDEN_LABELS,
    LOADOUT_LIMIT,
    TRAITS,
    TRAIT_VERBS,
    rangeLabel,
    traitLabel,
    type Trait,
  } from "../config.ts";
  import type { ItemSnapshot, SheetState } from "../apps/sheet-state.svelte.ts";
  import { handleActorDrop } from "../apps/svelte-sheets.ts";
  import { absolute, cssUrl } from "../assets.ts";
  import { rollAttack, rollTrait, rollWeaponDamage } from "../dice/actions.ts";
  import { platePortrait } from "../dice/plate.ts";
  import { SPINE, TILE } from "../ui/tile.js";
  import { XBOX, XMARK } from "../ui/mark.js";
  import { CARD, fit } from "../ui/card.js";
  import { closePeeks, peeks } from "../ui/peek.js";
  import { menu } from "../ui/menu.js";
  import { prep } from "../ui/prep.js";
  import { cardOf, loadSigils, type CardOptions, type Sigils } from "./cards.ts";
  import { postCard } from "./post-card.ts";
  import Marks from "./parts/Marks.svelte";
  import Gems from "./parts/Gems.svelte";
  import Prose from "./parts/Prose.svelte";

  /* The three written fields, in the order the book asks them. Description is
     yours alone; the other two are questions your *class* asked you at
     creation and the answers point at other people — which is why they are
     three fields and not one long one. */
  const BIO_FIELDS = [
    { key: "description", label: "Description", note: "who they are", height: 220 },
    { key: "background", label: "Background", note: "where they came from", height: 260 },
    { key: "connections", label: "Connections", note: "who else is in it", height: 220 },
  ] as const;

  interface Props {
    doc: any;
    snap: SheetState;
    app: any;
  }
  let { doc, snap, app }: Props = $props();

  let tab = $state<"main" | "vault" | "gear" | "advancement" | "bio">("main");

  const sys = $derived(snap.system);
  const ed = $derived(snap.editable);

  /* Straight from the printed sheet, where Evasion and Armor are told apart
     by outline rather than by label: Evasion is an arch, Armor is a shield.
     The arch is drawn three times — twice as an offset outline, occluded on
     its right by the solid on top. Nothing floats; the shape is simply
     somewhere its own outline says it used to be, which is what dodging
     looks like. */
  const ARCH_D = "M12 61 L12 26 Q12 7 33 7 Q54 7 54 26 L54 61 Z";
  const SHIELD_D = "M12 8 L54 8 L54 34 Q54 53 33 61 Q12 53 12 34 Z";

  const cards = $derived(snap.of("domainCard"));
  const loadout = $derived(cards.filter((c) => c.system.inLoadout));
  const vault = $derived(cards.filter((c) => !c.system.inLoadout));

  const primary = $derived(
    snap.of("weapon").find((w) => w.system.equipped && w.system.slot === "primary") ?? null,
  );
  const secondary = $derived(
    snap.of("weapon").find((w) => w.system.equipped && w.system.slot === "secondary") ?? null,
  );
  const twoHanded = $derived(primary?.system.burden === "twoHanded");

  /* Hit Points and Stress sit one above the other in the same column at 7 and
     6. Sized independently that is two box sizes stacked, and two sizes read
     as two kinds of thing — they are not. Both are sized for the larger. */
  const vitSpan = $derived(
    Math.max(sys.resources?.hitPoints?.max ?? 6, sys.resources?.stress?.max ?? 6),
  );

  const heritage = $derived(
    [snap.of("ancestry")[0]?.name, snap.of("community")[0]?.name].filter(Boolean).join(" · ") ||
      sys.biography?.heritage ||
      "—",
  );
  const className = $derived(snap.of("class")[0]?.name ?? "—");
  const subclassName = $derived(snap.of("subclass")[0]?.system.subclassName ?? "");

  const sign = (n: number) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);

  /* ── the portrait ─────────────────────────────────────────────────
     One picture, two frames. The diorama is a wide band across the top of
     the rail; the roll plate's portrait is a narrower panel behind the
     verdict. A crop judged in one is wrong in the other, so each is stored
     and set separately — and while you are setting the plate's, the plate's
     own panel is drawn over the diorama at true proportions and you drag
     inside *that*, because framing a box you cannot see is guessing and you
     find out one message later.

     Freeform means freeform. Offsets are unbounded — pushing a subject off
     an edge is a legitimate composition — and the scale goes below 1, where
     the picture sits inside the frame with the panel's colour around it.
     Neither is clamped to keep the image "covering", because deciding that
     for someone is the opposite of what was asked for. */
  type Frame = { x: number; y: number; scale: number };
  const NEUTRAL: Frame = { x: 0, y: 0, scale: 1 };

  /** The chat card's true width. The preview is scaled to fit the rail. */
  const PLATE_W = 300;
  const MAX_LEVEL = 10;

  let framing = $state(false);
  let target = $state<"sheet" | "plate">("sheet");
  let dioW = $state(PLATE_W);

  const stored = (which: "sheet" | "plate"): Frame => ({
    ...NEUTRAL,
    ...(sys.portrait?.[which] ?? {}),
  });

  /* The diorama always shows the diorama's own framing, now that the card
     has a preview of its own. It used to borrow the plate's while you were
     editing it, which was the best available answer when the alternative
     was showing you nothing — and is the wrong one now that both surfaces
     can be on screen at once, each wearing its own crop. */
  const frameVars = $derived(
    (({ x, y, scale }) => `--fx:${x}%;--fy:${y}%;--fz:${scale}`)(stored("sheet")),
  );
  /** The frame the controls are addressing — the readout, Reset, the drag. */
  const live = $derived(stored(target));

  /* Never above 1: a preview larger than the card would be a lie in the
     other direction. Below it the crop is unchanged — the frame is stored
     in percentages — so the only thing lost by scaling is the type's
     absolute size, and the type is not what is being placed. */
  const previewScale = $derived(Math.min(1, Math.max(0.5, (dioW - 18) / PLATE_W)));

  /* Built by the card's own builder, so the preview cannot drift from the
     card — see `platePortrait`. The roll it shows is a fixed sample: what
     is being judged is where the face sits under the name and the numeral,
     and those are in the same place on every duality roll ever made. */
  const preview = $derived(
    platePortrait({
      who: snap.name,
      label: "agility",
      kind: "duality roll",
      img: snap.img ? absolute(snap.img) : undefined,
      frame: stored("plate"),
      h: 9,
      f: 7,
      out: "hope",
      dc: null,
      hit: true,
      total: 18,
      mods: [],
    }),
  );

  const writeFrame = (f: Frame) =>
    ed && doc.update({ [`system.portrait.${target}`]: f });

  const resetFrame = () => writeFrame(NEUTRAL);
  const setLevel = (n: number) =>
    ed && doc.update({ "system.level": Math.min(MAX_LEVEL, Math.max(1, Math.round(n || 1))) });

  async function pickImage() {
    if (!ed) return;
    const picker = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current: doc.img,
      callback: (path: string) => doc.update({ img: path }),
    });
    await picker.browse();
  }

  /**
   * The surface the percentages are measured against, and the layer that
   * carries them, for whichever frame is being edited.
   *
   * This matters more than it looks. An offset is a percentage of the box it
   * is applied in, so measuring the drag against the diorama while the crop
   * lands in the plate's panel means every gesture is scaled by the ratio of
   * two differently-shaped boxes — the picture drifts under the pointer, by
   * more vertically than horizontally, and the harder you try to place a
   * face the further it gets. Measuring against the panel you are actually
   * looking at makes the picture track the hand exactly, which is the only
   * behaviour a direct-manipulation gesture is allowed to have.
   *
   * The preview being scaled does not enter into it: the rect is the scaled
   * rect and the translation is a percentage of the unscaled box, so the two
   * cancel and a pixel of pointer is a pixel of picture at any size.
   */
  const framed = (box: HTMLElement): { rect: HTMLElement; img: HTMLElement | null } => {
    const por = target === "plate" ? box.querySelector<HTMLElement>(".pv .por") : null;
    return por
      ? { rect: por, img: por.querySelector<HTMLElement>("u") }
      : { rect: box, img: box.querySelector<HTMLElement>(".img") };
  };

  /* Drag to pan. The delta is converted to a percentage of the *frame* on
     the way in, so a framing set in a 288px rail survives the window being
     dragged wider — and so the two surfaces can share one unit. */
  function onFrameDown(event: PointerEvent) {
    if (!framing || !ed) return;
    const box = event.currentTarget as HTMLElement;
    if ((event.target as HTMLElement).closest("button, input")) return;
    event.preventDefault();

    const { rect, img } = framed(box);
    const r = rect.getBoundingClientRect();
    const from = stored(target);
    const x0 = event.clientX;
    const y0 = event.clientY;
    let f = from;

    const move = (e: PointerEvent) => {
      f = {
        ...from,
        x: from.x + ((e.clientX - x0) / r.width) * 100,
        y: from.y + ((e.clientY - y0) / r.height) * 100,
      };
      // Written to the DOM directly during the drag and to the document only
      // at the end: a document update per pointermove is a re-render per
      // pointermove, and the sheet would spend the gesture rebuilding itself.
      img?.style.setProperty("--fx", `${f.x}%`);
      img?.style.setProperty("--fy", `${f.y}%`);
    };
    const up = () => {
      box.removeEventListener("pointermove", move);
      box.removeEventListener("pointerup", up);
      box.removeEventListener("pointercancel", up);
      void writeFrame(f);
    };
    box.setPointerCapture(event.pointerId);
    box.addEventListener("pointermove", move);
    box.addEventListener("pointerup", up);
    box.addEventListener("pointercancel", up);
  }

  /* Wheel to zoom, multiplicatively — a fixed step is coarse at 0.3 and
     glacial at 4. The floor is the schema's, so dragging it to nothing you
     could grab again is the one thing the gesture will not do. */
  function onFrameWheel(event: WheelEvent) {
    if (!framing || !ed) return;
    event.preventDefault();
    const f = stored(target);
    const scale = Math.min(8, Math.max(0.1, f.scale * (event.deltaY < 0 ? 1.08 : 1 / 1.08)));
    void writeFrame({ ...f, scale: Math.round(scale * 1000) / 1000 });
  }

  /* ── cards ────────────────────────────────────────────────────────
     Nothing here draws a card. `SPINE` and `CARD` already do, and they take
     the same option object, which is why the row and the peek can never say
     different things — `cards.ts` builds that object and this only decides
     which rows exist.

     The sigils are fetched and recentred against their own ink bounds, so
     they cannot be built during a render. They land in a rune instead and
     every spine re-derives when they do; before that the plate is simply
     empty, which is a mark missing for one frame rather than a sheet that
     waits for one. */
  let sigils = $state<Sigils>({});
  loadSigils().then((s) => (sigils = s));

  const ctx = $derived({
    domains: sys.domains,
    armorSlots: sys.resources?.armorSlots?.max ?? 0,
    armorMarked: sys.resources?.armorSlots?.marked ?? 0,
  });

  const opt = (it: ItemSnapshot | undefined): CardOptions | null =>
    it ? cardOf(it, sigils, ctx) : null;

  /* A row and its peek are one entry, keyed the same. The key is the item id
     rather than the index: an index is exactly what a swap changes, so
     keying by it would point every peek at its neighbour the moment a card
     moved. */
  interface Row {
    pk: string;
    card: CardOptions;
  }
  const rows = (items: ItemSnapshot[]): Row[] =>
    items
      .map((i) => ({ pk: i.id, card: opt(i) }))
      .filter((r): r is Row => r.card !== null);

  const classCards = $derived(rows([...snap.of("class"), ...snap.of("subclass")]));
  const heritageCards = $derived(rows([...snap.of("ancestry"), ...snap.of("community")]));
  const loadoutCards = $derived(rows(loadout));
  const vaultCards = $derived(rows(vault));

  /* ── gear ─────────────────────────────────────────────────────────
     Three slots, and everything else you own listed underneath. The armor
     slot is a slot like the two hands are: it is one of exactly three things
     a character wears, and a list with an `equipped` flag would let two of
     them be true at once. */
  const armor = $derived(snap.of("armor").find((a) => a.system.equipped) ?? null);

  /** What the "equip ·" hint on a carried tile names. */
  const SLOT_CAP: Record<string, string> = {
    primary: "Primary",
    secondary: "Secondary",
    armor: "Armor",
  };

  const slots = $derived([
    { key: "primary", label: "Primary weapon", it: primary },
    { key: "secondary", label: "Secondary weapon", it: secondary },
    { key: "armor", label: "Armor", it: armor },
  ]);

  /* Everything owned that is not currently in a slot. A weapon that cannot
     be equipped right now is still listed and still says why — hiding it
     would make the shield look lost rather than shelved. */
  const carried = $derived(
    snap.items.filter(
      (i) =>
        (i.type === "weapon" || i.type === "armor") &&
        !i.system.equipped &&
        i.id !== primary?.id &&
        i.id !== secondary?.id,
    ),
  );

  /* Loot with a rules paragraph earns a card, because a rule you cannot see
     is a rule you will not use. A torch stays a line — it is a thing you
     have rather than a thing you do. */
  const hasText = (i: ItemSnapshot) => !!String(i.system.description ?? "").replace(/<[^>]*>/g, "").trim();
  const lootItems = $derived(
    snap.items.filter((i) => (i.type === "consumable" || i.type === "loot") && hasText(i)),
  );
  const lootCards = $derived(rows(lootItems));
  const inventory = $derived(
    snap.items.filter((i) => (i.type === "consumable" || i.type === "loot") && !hasText(i)),
  );

  /* ── charges ──────────────────────────────────────────────────────
     You can hold up to five of a consumable, which makes it the only thing
     on this sheet that is both a card and a resource. They ride at the end
     of the row's meta line and are clickable there, because spending one is
     the commonest thing you will do to loot and it should not require
     opening anything. `data-act` keeps the click off the peek: a control
     inside a row is a control first.

     Crossed from the *left*, like every other row of boxes on this sheet.
     Crossing from the right would put the survivors where the count is —
     and would make this the one row that fills the other way, which is the
     kind of small inconsistency nobody notices and everybody misreads. */
  const CHARGES = 5;

  const charges = (held: number, id: string) =>
    `<span class="chg" title="${held} of ${CHARGES} left">` +
    Array.from(
      { length: CHARGES },
      (_, i) =>
        `<i class="${i < CHARGES - held ? "on" : ""}" data-act data-ch="${id}" data-i="${i}"><u></u>${XMARK}<b></b></i>`,
    ).join("") +
    "</span>";

  const chargeTotal = $derived(
    lootItems
      .filter((i) => i.type === "consumable")
      .reduce((n, i) => n + Math.min(CHARGES, i.system.quantity ?? 0), 0),
  );

  /* Click the box you want to be the last crossed one; click it again to
     give it back. `target()` in the design is the shared rule for every row
     of boxes on the sheet, so a charge behaves like a Hit Point without
     either of them knowing about the other. */
  function onCharge(e: MouseEvent) {
    const el = (e.target as Element | null)?.closest?.("[data-ch]") as HTMLElement | null;
    if (!el || !ed) return;
    const id = el.dataset.ch;
    const i = Number(el.dataset.i);
    const it = snap.items.find((x) => x.id === id);
    if (!id || !it || Number.isNaN(i)) return;
    const crossed = CHARGES - Math.min(CHARGES, it.system.quantity ?? 0);
    const n = i + 1;
    item(id)?.update({ "system.quantity": CHARGES - (n === crossed ? n - 1 : n) });
  }

  /* Every card on screen, for the peek layer. It renders them all once,
     outside every scroller — see peek.js: an absolutely positioned card is
     clipped by any ancestor that scrolls, and no z-index fixes a clip. */
  const peekRows = $derived(
    tab === "main"
      ? [...loadoutCards, ...classCards, ...heritageCards]
      : tab === "vault"
        ? [...loadoutCards, ...vaultCards]
        : tab === "gear"
          ? lootCards
          : [],
  );

  /* ── the window ───────────────────────────────────────────────────
     `peeks` delegates from the window and binds once, because Svelte keeps
     this element for the life of the sheet — the very reason the sheet is
     Svelte at all. `fit` has to run again whenever the cards change: it
     measures each card's prose against its plate and steps the type down
     until it fits, and a card added after the last pass has never been
     measured. */
  let winEl: HTMLElement | undefined = $state();

  $effect(() => {
    if (winEl) peeks(winEl);
  });

  $effect(() => {
    void peekRows;
    if (!winEl) return;
    const el = winEl;
    // After paint, or the cards are measured at zero height.
    requestAnimationFrame(() => fit(el));
  });

  /* ── fitting the window to the tab ─────────────────────────────────
     Five tabs of wildly different heights share one window, and the window
     is sized once when it opens. Advancement is roughly three times the
     Attack panel; a height that suits one leaves the other either cut off or
     floating in empty frame.

     So the window takes the height of whatever you just opened. The measure
     is the *scroller's* shortfall rather than the content's absolute height,
     because that is the number that survives not knowing what the window
     chrome costs: `natural - clientHeight` is how much taller the box needs
     to be, in the same units the window is set in, whatever is above it.

     Both scrollers are measured and the larger wins — the rail is the same
     on every tab, and a window sized to a short pane would clip it instead.

     Bounded at both ends and it matters at both. The floor stops a nearly
     empty tab from collapsing the window to a title bar; the ceiling is the
     viewport, because a sheet taller than the screen cannot be scrolled back
     into view — Foundry windows do not scroll, their contents do, and the
     contents are exactly what we just made too tall to reach. */
  const MIN_H = 560;

  /** Content height of a scroller, independent of the box it is in. */
  function natural(scr: HTMLElement): number {
    const kids = [...scr.children] as HTMLElement[];
    const first = kids.at(0);
    const last = kids.at(-1);
    if (!first || !last) return 0;
    const cs = getComputedStyle(scr);
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    return last.getBoundingClientRect().bottom - first.getBoundingClientRect().top + pad;
  }

  /**
   * One pass. Iterated, because one pass does not converge.
   *
   * `setPosition` is not a setter — Foundry clamps the height so the window
   * stays on screen, and will move the window up to make room before it
   * refuses. So the height you ask for and the height you get differ, by an
   * amount that depends on where the window happens to be. Measuring again
   * after the move is the only way to find out, and two or three passes is
   * always enough because each one is strictly closer. `passes` is a
   * stop, not a schedule: it converges before it runs out or the tab is
   * genuinely taller than the screen, and then it should stop and scroll.
   */
  function refit(passes = 3) {
    if (!winEl || !app?.setPosition) return;
    const scrs = [...winEl.querySelectorAll(".scr")] as HTMLElement[];
    if (!scrs.length) return;

    const grow = Math.max(...scrs.map((s) => natural(s) - s.clientHeight));
    if (!Number.isFinite(grow)) return;

    const now = app.position?.height;
    if (typeof now !== "number") return;

    const want = Math.round(Math.min(window.innerHeight - 60, Math.max(MIN_H, now + grow)));
    // A few pixels is measurement noise, and setting the position re-renders
    // — chasing it would be a loop with no bottom.
    if (Math.abs(want - now) < 8) return;

    app.setPosition({ height: want });
    if (passes > 1) requestAnimationFrame(() => refit(passes - 1));
  }

  $effect(() => {
    void tab;
    void peekRows;
    // Two frames: the first paints the new tab, the second is after `fit`
    // above has stepped any card's type scale, which changes its height.
    requestAnimationFrame(() => requestAnimationFrame(() => refit()));
  });

  /* ── a card, said out loud ─────────────────────────────────────────
     Clicking a card row posts the whole card to chat. It is the same option
     object the row and the peek were built from, so the three cannot
     disagree — see `post-card.ts`.

     Hover already shows you the card. This is for the other person. */
  const toChat = (card: CardOptions | null) => {
    if (card) void postCard(card, doc);
  };

  /* Every row on every tab already carries `data-pk`, and a `pk` is an item
     id — so one delegated handler covers all five tabs, and a row added
     later is wired the moment it is drawn. The alternative was the same
     `onclick` copied onto eight `{#each}` bodies, which is eight places for
     the ninth to be forgotten. */
  const cardByPk = $derived(
    new Map(
      snap.items
        .map((i) => [i.id, opt(i)] as const)
        .filter((e): e is readonly [string, CardOptions] => e[1] !== null),
    ),
  );

  /* ── rolling ────────────────────────────────────────────────────────
     Every roll on this sheet goes through the popover, and the popover
     opens on the click that used to roll. That is a tax on the most
     frequent gesture in the game, paid so that the four things a roll can
     carry — advantage and its sources, a modifier, the Experiences you are
     bringing in, and the Hope they cost — have somewhere to be said. They
     have been arguments of `rollTrait`/`rollAttack` since those were
     written; nothing had ever passed them.

     `prep` resolves null on every way out, and every way out is free. The
     Hope is charged in `actions.ts`, not here, because the popover only
     ever *proposes* a roll — the sheet is not where money moves. */
  const purse = $derived(sys.resources?.hope?.value ?? 0);
  const xpList = $derived(
    (sys.experiences ?? []).map((x: any) => ({ name: x.name, modifier: x.modifier })),
  );

  async function askTrait(event: MouseEvent, trait: Trait, reaction: boolean | "only" = true) {
    const o = await prep(event.currentTarget as Element, {
      kind: reaction === "only" ? "reaction roll" : `${traitLabel(trait).toLowerCase()} roll`,
      label: traitLabel(trait),
      base: (doc as any).traitMod(trait),
      experiences: xpList,
      purse,
      reaction,
    });
    if (!o) return;
    await rollTrait(doc, trait, {
      advantage: o.advantage,
      experiences: o.experiences,
      extra: o.extra,
      reaction: o.reaction,
    });
  }

  /* An attack is an action by definition, so the reaction button is not
     offered here — a weapon you swing in response to something is still a
     reaction roll made with the trait, and that is the trait cell's job. */
  async function askAttack(event: MouseEvent, weaponId: string) {
    const weapon = item(weaponId);
    const trait = (weapon?.system?.trait ?? "agility") as Trait;
    const o = await prep(event.currentTarget as Element, {
      kind: "attack roll",
      label: weapon?.name ?? "Attack",
      base: (doc as any).traitMod(trait),
      experiences: xpList,
      purse,
      reaction: false,
    });
    if (!o) return;
    await rollAttack(doc, weapon, {
      advantage: o.advantage,
      experiences: o.experiences,
      extra: o.extra,
    });
  }

  function onCardClick(event: MouseEvent) {
    const t = event.target as HTMLElement;
    // Anything that is its own control keeps its own click. A card row is
    // the background here, not the foreground: the shelve button, the
    // charge pips and the Resting checkbox all sit *on* a row and none of
    // them mean "show everyone this card".
    if (t.closest?.("button, input, label, a, [data-act]")) return;
    const pk = t.closest<HTMLElement>("[data-pk]")?.dataset.pk;
    if (pk) toChat(cardByPk.get(pk) ?? null);
  }

  /* ── the right-click menu ─────────────────────────────────────────
     Everything this sheet does, it does by pressing something you can see,
     and that is the right default — it is also why there was nowhere left
     to put "open this", "copy this" and "this one was a mistake". A card
     row already carries a shelve button, a charge strip and a click that
     posts it to chat. Three more permanent controls per row, to serve
     three actions taken once a session between them, would have cost the
     row far more than the actions are worth.

     So they go on the second button, which is where rare-and-real belongs
     and where every other application in this genre already puts them.

     One handler for every row on every tab, delegated on `data-pk` exactly
     like the click above — a row added later is wired the moment it is
     drawn, and the list is built at the moment the menu opens rather than
     registered at mount, because whether a card can be recalled depends on
     how much Stress is left *now*. */
  type MenuRow = { k: string; run?: () => void; warn?: boolean; off?: string; sep?: true };

  const RECALL_FULL = "The loadout is full — swap on the vault tab.";

  /** Every reason this sheet is read-only, in one sentence. */
  const locked = $derived(ed ? undefined : "This sheet is not yours to change.");

  function rowsFor(it: ItemSnapshot): MenuRow[] {
    const live = item(it.id);
    const card = cardByPk.get(it.id) ?? null;
    const rows: MenuRow[] = [];

    if (card) rows.push({ k: "Show to chat", run: () => toChat(card) });
    rows.push({ k: "Open", run: () => live?.sheet.render(true) });

    /* The one action each kind of thing is actually *for*, restated here so
       the menu is not a worse version of the row it was opened from. A
       domain card moves; a weapon is held or is not; a consumable is spent. */
    if (it.type === "domainCard") {
      rows.push(
        it.system.inLoadout
          ? { k: "Move to vault", off: locked, run: () => shelve(it.id) }
          : {
              k: recallCost(it) ? `Recall · ${recallCost(it)} Stress` : "Recall to loadout",
              off:
                locked ??
                (loadout.length >= LOADOUT_LIMIT
                  ? RECALL_FULL
                  : !canPay(it)
                    ? `Not enough Stress — this costs ${recallCost(it)}.`
                    : undefined),
              run: () => recall(it.id, null),
            },
      );
    }
    if (it.type === "weapon" || it.type === "armor") {
      const blocked =
        !it.system.equipped &&
        it.type === "weapon" &&
        it.system.slot === "secondary" &&
        twoHanded;
      rows.push({
        k: it.system.equipped
          ? "Unequip"
          : `Equip · ${SLOT_CAP[it.type === "armor" ? "armor" : it.system.slot] ?? ""}`,
        off: locked ?? (blocked ? `${primary?.name} is Two-Handed — no free hand.` : undefined),
        run: () => live?.toggleEquipped(),
      });
    }
    if (it.type === "consumable") {
      const held = it.system.quantity ?? 0;
      rows.push({
        k: "Spend one",
        off: locked ?? (held > 0 ? undefined : "None left."),
        run: () => live?.update({ "system.quantity": held - 1 }),
      });
    }

    rows.push(
      { sep: true, k: "" },
      { k: "Duplicate", off: locked, run: () => duplicate(it) },
      { k: "Delete", warn: true, off: locked, run: () => remove(it) },
    );
    return rows;
  }

  function onCardMenu(event: MouseEvent) {
    const pk = (event.target as Element | null)?.closest?.<HTMLElement>("[data-pk]")?.dataset.pk;
    const it = pk ? snap.items.find((i) => i.id === pk) : null;
    if (!it) return;
    // A peek is a full card hovering over the rows; the menu is about to
    // open on top of one of them. Two floating objects describing the same
    // row, and the reader has to work out which one they are aiming at.
    closePeeks();
    menu(event, rowsFor(it), it.name);
  }

  const duplicate = (it: ItemSnapshot) => {
    const live = item(it.id);
    if (!live || !ed) return;
    const copy = live.toObject();
    delete copy._id;
    copy.name = game.i18n.format("DAGGERHEART.Copy", { name: copy.name });
    return doc.createEmbeddedDocuments("Item", [copy]);
  };

  /* Asked, not undone. Foundry's own undo is a per-user setting nobody has
     on, and an item is a card somebody spent a level on — the confirmation
     is cheap and the mistake is not. It names the thing, because a dialog
     that says "are you sure?" is asking about whatever you *think* you
     right-clicked. */
  async function remove(it: ItemSnapshot) {
    if (!ed) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("DAGGERHEART.Delete.Title") },
      content: `<p>${foundry.utils.escapeHTML(
        game.i18n.format("DAGGERHEART.Delete.Body", { name: it.name }),
      )}</p>`,
      modal: true,
    });
    if (ok) await doc.deleteEmbeddedDocuments("Item", [it.id]);
  }

  /* ── taking a thing out of the sheet ──────────────────────────────
     Foundry moves documents by dragging them, and until now every row here
     was a dead end: you could drop a card in and never get it back out to
     another character, to a compendium, or onto the hotbar.

     Stamped after each render rather than written onto eight `{#each}`
     bodies, for the same reason the click and the menu are delegated. The
     vault's own rows are excluded: those already drag, on pointer events,
     to swap a card into the loadout — and a native drag starting under a
     pointer drag makes the browser take the gesture away mid-swap. */
  $effect(() => {
    void peekRows;
    void tab;
    if (!winEl) return;
    for (const el of winEl.querySelectorAll<HTMLElement>("[data-pk]:not([data-swap])")) {
      el.draggable = true;
    }
  });

  /* ── making something from nothing ────────────────────────────────
     Content comes from compendiums and this system ships three packs of
     it, which is why dragging in was the only way in for a long time. But
     a table invents things — a shortbow with a name, a potion the GM made
     up, the rope — and "install a module to write down that you have a
     rope" is not an answer.

     The same menu component, opened on a left-click: the choice being made
     is which of five kinds of thing this is, and five kinds is a list, not
     five buttons. The new item opens its own sheet immediately, because
     nobody creates a blank item in order to look at a blank item. */
  const NEW_TYPES: [string, string][] = [
    ["weapon", "Weapon"],
    ["armor", "Armor"],
    ["consumable", "Consumable"],
    ["loot", "Loot"],
    ["feature", "Feature"],
  ];

  function onNewItem(event: MouseEvent) {
    if (!ed) return;
    menu(
      event,
      NEW_TYPES.map(([type, label]) => ({
        k: label,
        run: async () => {
          const [made] = await doc.createEmbeddedDocuments("Item", [
            { type, name: game.i18n.format("DAGGERHEART.NewItem", { kind: label }) },
          ]);
          made?.sheet.render(true);
        },
      })),
      "New",
    );
  }

  function onDragStart(event: DragEvent) {
    const pk = (event.target as Element | null)?.closest?.<HTMLElement>("[data-pk]")?.dataset.pk;
    const live = pk ? item(pk) : null;
    if (!live) return;
    closePeeks();
    event.dataTransfer?.setData(
      "text/plain",
      JSON.stringify({ type: "Item", uuid: live.uuid }),
    );
  }

  /* ── the swap ─────────────────────────────────────────────────────
     The vault tab carries both lists. At 5/5 there is no such thing as
     "add a card" — something leaves — so the gesture takes two picks, and
     the pick that decides it (is this better than the worst one I hold?)
     needs both lists on screen at once.

     `resting` is the whole of resting on this sheet. Rests are run at the
     table, so nothing turns it off but a hand, and that makes it the only
     thing on screen that knows whether a swap is free. It therefore has to
     say which state it is *in* rather than restating the rule: "free while
     resting" is true in both positions and so answers nothing. It defaults
     to false, because the priced state is the normal state of play — a
     sheet that defaulted the other way would hand out free swaps in the
     middle of a fight and never say so. */
  let armed = $state<string | null>(null);
  let resting = $state(false);

  const armedCard = $derived(vault.find((c) => c.id === armed) ?? null);

  const recallCost = (c: ItemSnapshot | null) => (resting ? 0 : (c?.system.recallCost ?? 0));
  const canPay = (c: ItemSnapshot | null) => {
    const cost = recallCost(c);
    return (
      cost === 0 ||
      (sys.resources?.stress?.marked ?? 0) + cost <= (sys.resources?.stress?.max ?? 6)
    );
  };
  const stressLeft = $derived(
    (sys.resources?.stress?.max ?? 6) - (sys.resources?.stress?.marked ?? 0),
  );

  /* The refusal is the Stress track saying no, not a dialog. It is the thing
     that cannot pay, so it is the thing that should flinch. */
  function refuse() {
    const mk = winEl?.querySelector(".mk.stress");
    if (!mk) return;
    mk.classList.remove("deny");
    void (mk as HTMLElement).offsetWidth;
    mk.classList.add("deny");
    setTimeout(() => mk.classList.remove("deny"), 600);
  }

  /**
   * Move a card out of the vault, optionally trading a loadout card for it.
   *
   * The Stress is marked here rather than left to the player: that is the
   * entire argument for a digital sheet — the rail moves, so the price is
   * not a number you then have to go and pay somewhere else.
   */
  async function recall(vaultId: string, loadoutId: string | null) {
    if (!ed) return;
    const card = vault.find((c) => c.id === vaultId) ?? null;
    if (!card) return;
    if (!canPay(card)) return refuse();
    const trade = !!loadoutId;
    if (!trade && loadout.length >= LOADOUT_LIMIT) return;

    const cost = recallCost(card);
    const updates: any[] = [{ _id: vaultId, "system.inLoadout": true }];
    if (loadoutId) updates.push({ _id: loadoutId, "system.inLoadout": false });
    await doc.updateEmbeddedDocuments("Item", updates);
    if (cost) {
      await doc.update({
        "system.resources.stress.marked": (sys.resources?.stress?.marked ?? 0) + cost,
      });
    }
    armed = null;
  }

  const shelve = (id: string) =>
    ed && doc.updateEmbeddedDocuments("Item", [{ _id: id, "system.inLoadout": false }]);

  /* A padlock would say "you cannot have this", which is wrong — a vaulted
     card is available, it is just not in hand. An archive box says stored. */
  const LOCK = `<svg viewBox="0 0 14 14" aria-hidden="true" fill="currentColor">
    <path d="M1 2h12v3H1z"/><path d="M2.2 6h9.6l-.7 6H2.9z" opacity=".62"/>
    <path d="M5.2 7.6h3.6v1.3H5.2z" fill="#000" opacity=".38"/></svg>`;

  /* ── advancement ──────────────────────────────────────────────────
     Stored as `advancement[tier][option] = count`, so the rules table in
     `config.ts` can grow a row without a migration.

     Nested rather than a flat `"2.0"` key on purpose: Foundry reads a dot in
     an update key as a *path*, so `"system.advancement.2.0"` would write the
     nested shape whatever the reader expected. Two levels is what the writer
     actually produces, so it is what the reader asks for.

     Clicking a slot marks *up to* it, and clicking the last marked one
     clears it — the same gesture as every other row of boxes on this sheet,
     which is why there is no second convention to learn. */
  const taken = (tier: number, option: number): number =>
    Number(sys.advancement?.[tier]?.[option] ?? 0);

  /* The whole row of boxes as one string, rather than an `{#each}` of
     `{@html}`. Svelte plants a comment anchor before every block it can
     update independently, and a flex container full of those anchors sizes
     to nothing under `max-content` — `.slots` then took the whole row and
     squeezed the label to zero width. One `{@html}` produces exactly the
     markup the design emits, and `.adv .slots > i` sizes it. */
  const boxes = (n: number, on: number): string =>
    Array.from({ length: n }, (_, i) => XBOX(i < on)).join("");

  const setAdvancement = (tier: number, option: number, n: number) =>
    ed && doc.update({ [`system.advancement.${tier}.${option}`]: Math.max(0, n) });

  function onAdvance(e: MouseEvent, tier: number, option: number, on: number) {
    const row = e.currentTarget as HTMLElement;
    const box = (e.target as Element | null)?.closest("i");
    if (!box || box.parentElement !== row) return;
    const n = [...row.children].indexOf(box) + 1;
    setAdvancement(tier, option, n === on ? n - 1 : n);
  }

  /* ── writes ───────────────────────────────────────────────────────── */

  const set = (path: string, value: unknown) => ed && doc.update({ [path]: value });

  const setGold = (row: "handfuls" | "bags" | "chests", i: number) => {
    if (!ed) return;
    const cur = sys.gold?.[row] ?? 0;
    doc.update({ [`system.gold.${row}`]: i + 1 === cur ? i : i + 1 });
  };

  const item = (id: string) => doc.items.get(id);

  async function onDrop(event: DragEvent) {
    event.preventDefault();
    if (!ed) return;
    await handleActorDrop(doc, event);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="win"
  style="--w:100%"
  bind:this={winEl}
  ondrop={onDrop}
  ondragover={(e) => e.preventDefault()}
  ondragstart={onDragStart}
  oncontextmenu={onCardMenu}
>
  <div class="bd" style="--h:100%">
    <!-- ══ the rail ══════════════════════════════════════════════════ -->
    <div class="rail">
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="dio {framing ? 'framing' : ''} {framing ? target : ''}"
        style="--pvz:{previewScale}"
        bind:clientWidth={dioW}
        onpointerdown={onFrameDown}
        onwheel={onFrameWheel}
      >
        <div class="img" style="--art:{cssUrl(snap.img)};{frameVars}"></div>
        <div class="scrim"></div>
        <!-- The roll plate's own field, at true proportions, drawn by the
             builder the real card is drawn by. Rendered only while framing
             for it: the rest of the time it is a picture of a card nobody
             asked to see. -->
        {#if framing && target === "plate"}
          <div class="pv">{@html preview}</div>
        {/if}
        <div class="lv">
          <i>Lv</i>
          {#if ed}
            <!-- The plate *is* the field. A level is one of two numbers on
                 this sheet you set by typing rather than by pressing
                 something, and giving it its own labelled box would put a
                 form control in the middle of a picture. -->
            <input
              class="b"
              type="number"
              min="1"
              max={MAX_LEVEL}
              value={sys.level}
              onchange={(e) => setLevel(+(e.currentTarget as HTMLInputElement).value)}
            />
          {:else}
            <b>{sys.level}</b>
          {/if}
        </div>
        {#if ed}
          <div class="fr">
            <button type="button" class="ctl" onclick={pickImage}>Image</button>
            <button type="button" class="ctl {framing ? 'on' : ''}" onclick={() => (framing = !framing)}>
              Frame
            </button>
          </div>
          <div class="fx">
            <span class="seg">
              <button type="button" class="ctl {target === 'sheet' ? 'on' : ''}" onclick={() => (target = "sheet")}>
                Sheet
              </button>
              <button type="button" class="ctl {target === 'plate' ? 'on' : ''}" onclick={() => (target = "plate")}>
                Card
              </button>
            </span>
            <button type="button" class="ctl" onclick={resetFrame}>Reset</button>
            <span class="z">{live.scale.toFixed(2)}×</span>
          </div>
        {/if}
        <div class="nm">
          <b>{snap.name}</b>
          <span>{heritage}<br />{className}{subclassName ? " · " : ""}<em>{subclassName}</em></span>
        </div>
      </div>

      <div class="scr">
        <!-- defence -->
        <div class="sec">
          <div class="dfn">
            <div>
              <button
                class="crest ev"
                type="button"
                title="Evasion"
                onclick={(e) => askTrait(e, "agility", "only")}
              >
                <svg viewBox="0 0 64 66" aria-hidden="true">
                  <path class="gh f" d={ARCH_D} transform="translate(-11.5 0)" />
                  <path class="gh n" d={ARCH_D} transform="translate(-6 0)" />
                  <path class="sil" d={ARCH_D} />
                </svg>
                <span class="v">{sys.evasion?.value ?? 0}</span>
              </button>
              <span class="k">Evasion</span>
            </div>
            <div>
              <!-- The numeral is the Armor *Score*, which a shield raises; the
                   boxes beside it are the armour's Base Score, which it does not. -->
              <div class="crest">
                <svg viewBox="0 0 64 66" aria-hidden="true">
                  <path class="sil" d={SHIELD_D} />
                </svg>
                <span class="v sh">{sys.armorScore?.value ?? 0}</span>
              </div>
              <span class="k">Armor</span>
            </div>
            <!-- "Slots", not "Armor Slots": it sits four pixels from a shield
                 with the word ARMOR under it, and the longer label wrapped its
                 own count onto a second line in the 102px this column has. -->
            <div class="side">
              {#key snap.items.length}
                <Marks
                  kind="armor"
                  label="Slots"
                  total={sys.resources?.armorSlots?.max ?? 0}
                  marked={sys.resources?.armorSlots?.marked ?? 0}
                  editable={ed}
                  onset={(n) => set("system.resources.armorSlots.marked", n)}
                />
              {/key}
            </div>
          </div>
        </div>

        <!-- One section, two tracks. The printed sheet puts Hit Points and
             Stress under a single heading and it is right to: they are the
             same question asked twice, and a divider between them claims
             otherwise while costing 28px of a rail that has none to spare. -->
        <div class="sec">
          {#key `${sys.thresholds?.major}/${sys.thresholds?.severe}/${sys.resources?.hitPoints?.max}`}
            <Marks
              kind="hp"
              label="Damage"
              damage={{ major: sys.thresholds?.major ?? 1, severe: sys.thresholds?.severe ?? 2 }}
              total={sys.resources?.hitPoints?.max ?? 6}
              marked={sys.resources?.hitPoints?.marked ?? 0}
              span={vitSpan}
              editable={ed}
              onset={(n) => set("system.resources.hitPoints.marked", n)}
            />
          {/key}
          {#key sys.resources?.stress?.max}
            <Marks
              kind="stress"
              label="Stress"
              total={sys.resources?.stress?.max ?? 6}
              marked={sys.resources?.stress?.marked ?? 0}
              span={vitSpan}
              vuln
              editable={ed}
              onset={(n) => set("system.resources.stress.marked", n)}
            />
          {/key}
        </div>

        <!-- hope -->
        <div class="sec">
          <div class="pool">
            <div class="hd">
              <span class="k">Hope</span>
              <span class="n"
                >{sys.resources?.hope?.value ?? 0}<s> / {sys.resources?.hope?.max ?? 6}</s></span
              >
            </div>
            {#key (sys.scars ?? []).length}
              <Gems
                value={sys.resources?.hope?.value ?? 0}
                max={6}
                scars={(sys.scars ?? []).length}
                size={32}
                gap={10}
                ground="paper"
                editable={ed}
                onset={(n) => set("system.resources.hope.value", n)}
              />
            {/key}
          </div>
        </div>

        <!-- experience -->
        <div class="sec">
          <div class="pnl" style="padding:0;border:0">
            <div class="k">Experience</div>
            <div class="xp">
              <!-- Not a button any more. This row used to roll *Instinct*,
                   hardcoded, whatever the Experience was — an Experience is
                   not a trait and does not imply one. It is brought into a
                   roll from the roll popover, alongside the trait you
                   actually meant, which is also the only place the Hope it
                   costs can be taken. The row is here to be read while you
                   decide, which is why it sits six pixels from the Hope. -->
              {#each sys.experiences ?? [] as x, i (i)}
                <div class="r" title="Bring this into a roll from the roll popover.">
                  <b>{x.name || "—"}</b><em>{sign(x.modifier)}</em>
                </div>
              {:else}
                <p class="ach">No Experiences yet.</p>
              {/each}
            </div>
          </div>
        </div>

        <!-- gold. Ten handfuls make a bag, ten bags make a chest, and the
             printed sheet draws all three rows because the conversion is the
             point. Three silhouettes, so each row is identifiable without
             its label. -->
        <div class="sec">
          <div class="pnl" style="padding:0;border:0">
            <div class="k">
              Gold<s>{sys.gold?.bags ?? 0}b · {sys.gold?.handfuls ?? 0}h</s>
            </div>
            <div class="gld">
              <div class="rows">
                {#each [["hf", "Handfuls", "handfuls", 10], ["bg", "Bags", "bags", 10], ["ch", "Chest", "chests", 1]] as [cls, label, key, n]}
                  <div class="ln {cls}">
                    <span class="k">{label}</span>
                    <span class="set">
                      {#each Array(n as number) as _, i}
                        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
                        <i
                          class={i < (sys.gold?.[key as string] ?? 0) ? "on" : ""}
                          onclick={() => setGold(key as any, i)}
                        ></i>
                      {/each}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ the pane ══════════════════════════════════════════════════ -->
    <div class="pane">
      <!-- Above the tab strip and outside the scroller, which is what
           `flex:none` on .trs is for. The traits are the one thing on the
           pane that is true no matter which tab you are on, so they do not
           belong to any of them — and putting the row inside .scr made it
           scroll away and vanish on four tabs out of five. -->
      <div class="trs">
        {#each TRAITS as t}
          <button
            type="button"
            class="tr {sys.traits?.[t]?.marked ? 'on' : ''} {sys.spellcastTrait === t ? 'cast' : ''}"
            title={sys.spellcastTrait === t
              ? "Spellcast — your subclass casts with this trait"
              : undefined}
            onclick={(e) => askTrait(e, t as Trait)}
          >
            <span class="k">{traitLabel(t)}</span>
            <span class="v">{sign(sys.traits?.[t]?.value ?? 0)}</span>
            <i class="mk"></i>
            <!-- No badge element: the spellcast trait is marked by the cell
                 itself — gold top edge, gold name, and a spark in the corner
                 drawn by `.tr.cast::after`. See sheet.css for why it stopped
                 being a line. -->
            <span class="vb">
              {#each TRAIT_VERBS[t] ?? [] as verb}<i>{verb}</i>{/each}
            </span>
          </button>
        {/each}
      </div>

      <div class="tabs">
        {#each [["main", "loadout"], ["vault", "vault"], ["gear", "gear"], ["advancement", "advancement"], ["bio", "bio"]] as [key, label]}
          <button type="button" class={tab === key ? "on" : ""} onclick={() => (tab = key as any)}>
            {label}
          </button>
        {/each}
        <span class="ct">
          {tab === "vault"
            ? `${vault.length} in vault`
            : tab === "advancement"
              ? `tier ${sys.tier}`
              : `prof ${sys.proficiency}`}
        </span>
      </div>

      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="scr" onclick={onCardClick}>
        {#if tab === "main"}
          <!-- the attack bar: the only control on the sheet. Everything else
               here is a record you edit. This is a button you press, and it
               does the two sums players actually get wrong. -->
          <div class="pnl">
            <div class="k">Attack<s>proficiency {sys.proficiency}</s></div>
            <div class="atk">
              {#each [["primary", "Primary", primary], ["secondary", "Secondary", secondary]] as [key, label, w]}
                {#if w}
                  <div class="wr" data-slot={key}>
                    <span class="sl">{label}</span>
                    <div class="id">
                      <b>{(w as any).name}</b>
                      <span>
                        {traitLabel((w as any).system.trait)} ·
                        {rangeLabel((w as any).system.range)} ·
                        {BURDEN_LABELS[(w as any).system.burden] ?? "One-Handed"}
                        {#if (w as any).system.feature?.name}
                          · <em>{(w as any).system.feature.name}</em>
                        {/if}
                      </span>
                    </div>
                    <button
                      class="go"
                      type="button"
                      title="Attack roll — 2d12 + trait"
                      onclick={(e) => askAttack(e, (w as any).id)}
                    >
                      <span class="dd"><i class="h"></i><i class="f"></i></span>
                      <em>{sign(sys.traits?.[(w as any).system.trait]?.value ?? 0)}</em>
                      <s>attack</s>
                    </button>
                    <button
                      class="go dm"
                      type="button"
                      title="{sys.proficiency} × {(w as any).system.damage.dice}, your Proficiency"
                      onclick={() => rollWeaponDamage(doc, item((w as any).id))}
                    >
                      <em
                        >{sys.proficiency}{(w as any).system.damage.dice}{(w as any).system.damage
                          .bonus
                          ? `+${(w as any).system.damage.bonus}`
                          : ""}</em
                      >
                      <s>damage</s>
                    </button>
                  </div>
                {:else}
                  <div class="wr off">
                    <span class="sl">{label}</span>
                    <div class="id">
                      <b>{key === "secondary" && twoHanded ? "Unavailable" : "Empty"}</b>
                      <span>
                        {key === "secondary" && twoHanded
                          ? "Two-Handed primary, no free hand"
                          : "nothing equipped"}
                      </span>
                    </div>
                  </div>
                {/if}
              {/each}
              <div class="rd"></div>
            </div>
          </div>

          <!-- The domain loadout. Empty slots show here too: under five you
               are carrying less than the rules allow, and the main tab is
               where you would notice — the fix is one tab away and the slot
               is what says to go there. -->
          <div class="pnl">
            <div class="k">Domain loadout<s>{loadout.length} / {LOADOUT_LIMIT}</s></div>
            <div class="grid2">
              {#each loadoutCards as r (r.pk)}
                <div class="pk" class:noart={r.card.noart} data-pk={r.pk} style={r.card.art}>
                  {@html SPINE(r.card)}
                </div>
              {/each}
              {#each Array(Math.max(0, LOADOUT_LIMIT - loadoutCards.length)) as _, i (i)}
                <div class="pk">
                  <div class="mtslot"><b>Empty</b><span>room for one more</span></div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Read carefully once and then almost never, so they go last,
               where their height costs nothing — and they are spines with the
               card on hover rather than four cards at full size, which is
               how every other card on this sheet is reached. -->
          <div class="pnl">
            <div class="k">
              Class<s>
                {sys.level >= 5 ? "specialization available" : "specialization at 5 · mastery at 8"}
              </s>
            </div>
            <div class="grid2">
              {#each classCards as r (r.pk)}
                <div class="pk" class:noart={r.card.noart} data-pk={r.pk} style={r.card.art}>
                  {@html SPINE(r.card)}
                </div>
              {:else}
                <p class="ach">No class yet. Drag one in from the compendium.</p>
              {/each}
            </div>
          </div>

          <div class="pnl">
            <div class="k">Heritage<s>{heritage}</s></div>
            <div class="grid2">
              {#each heritageCards as r (r.pk)}
                <div class="pk" class:noart={r.card.noart} data-pk={r.pk} style={r.card.art}>
                  {@html SPINE(r.card)}
                </div>
              {:else}
                <p class="ach">No ancestry or community yet.</p>
              {/each}
            </div>
          </div>
        {:else if tab === "vault"}
          <!-- The loadout, above the vault it is being compared against.
               With a card armed, every row here is a card you could replace,
               and the heading says so. -->
          <div class="pnl swap" class:armed={!!armedCard}>
            <div class="k">
              Loadout<s>
                {loadout.length} / {LOADOUT_LIMIT}{armedCard ? " · choose one to replace" : ""}
              </s>
            </div>
            <div class="grid2">
              {#each loadoutCards as r (r.pk)}
                <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                <div
                  class="pk"
                  class:noart={r.card.noart}
                  data-pk={r.pk}
                  data-swap
                  style={r.card.art}
                  onclick={(e) => {
                    // Only when a swap is in flight. With nothing armed this
                    // row means what it means everywhere else on the sheet,
                    // and the delegated handler above posts it to chat.
                    if (!armedCard) return;
                    e.stopPropagation();
                    recall(armedCard.id, r.pk);
                  }}
                >
                  {@html SPINE(r.card)}
                  <span class="swp"></span>
                  <button
                    type="button"
                    class="shv"
                    title="Move to the vault"
                    onclick={(e) => {
                      e.stopPropagation();
                      shelve(r.pk);
                    }}>shelve</button
                  >
                </div>
              {/each}
              {#each Array(Math.max(0, LOADOUT_LIMIT - loadoutCards.length)) as _, i (i)}
                <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                <div
                  class="pk"
                  onclick={() => armedCard && recall(armedCard.id, null)}
                >
                  <div class="mtslot">
                    <b>Empty</b>
                    <span>{armedCard ? "drop a card here" : "room for one more"}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- The same spine as the loadout, because it is the same card —
               drawing it as a mini would say "different kind of thing" when
               the truth is "same thing, not in hand". So: identical row,
               desaturated, with a vault tab down its edge. -->
          <div class="pnl swap vaultp" class:armed={!!armedCard}>
            <div class="k">Vault<s>{vault.length} stored</s></div>

            <div class="swcost" class:on={resting}>
              <label
                class="rst"
                data-act
                title="Set by hand — rests are run at the table. This changes the price of a swap and nothing else."
              >
                <input type="checkbox" bind:checked={resting} disabled={!ed} />
                <u></u><span>Resting</span>
              </label>
              <em>
                {#if armedCard}
                  Recall <b>{armedCard.name}</b>
                {:else if resting}
                  <b>Swaps are free</b> until you switch this off
                {:else}
                  Swaps cost the card’s Recall Cost in Stress
                {/if}
              </em>
              {#if armedCard}
                {@const cost = recallCost(armedCard)}
                {@const ok = canPay(armedCard)}
                <span class="p" class:free={cost === 0} class:no={cost !== 0 && !ok}>
                  {cost === 0 ? "Free" : ok ? `Mark ${cost}` : `Needs ${cost} · ${stressLeft} left`}
                  {#if cost}
                    <span class="pips">{#each Array(cost) as _, i (i)}<i></i>{/each}</span>
                  {/if}
                </span>
              {/if}
            </div>

            <div class="grid2">
              {#each vaultCards as r (r.pk)}
                <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                <div
                  class="pk vl"
                  class:arm={armed === r.pk}
                  class:mute={!!armedCard && armed !== r.pk}
                  class:noart={r.card.noart}
                  data-pk={r.pk}
                  data-swap
                  style={r.card.art}
                >
                  {@html SPINE(r.card)}
                  <span class="swp"></span>
                  <span class="stamp" title="In vault">{@html LOCK}<em>Vault</em></span>
                  <!-- Arming is a control now, not the row. Every other card
                       row on this sheet posts its card to chat when you click
                       it, and a vault row is not a different kind of card —
                       so it takes the loadout's own hover-revealed button in
                       the same corner, saying the opposite word. -->
                  <button
                    type="button"
                    class="shv"
                    title="Bring this card back into the loadout"
                    onclick={() => (armed = armed === r.pk ? null : r.pk)}
                  >{armed === r.pk ? "cancel" : "recall"}</button>
                </div>
              {:else}
                <p class="ach">The vault is empty.</p>
              {/each}
            </div>
          </div>
        {:else if tab === "gear"}
          <!-- Three slots, drawn as three slots. An empty one keeps its frame
               and its label, and a *blocked* one says why: the two-handed
               rule is exactly the kind of thing a sheet should enforce
               silently and explain loudly, since the alternative is a table
               argument in session four. -->
          <div class="pnl">
            <div class="k">
              Equipped<s>armor score {sys.armorScore?.value ?? 0}</s>
              {#if ed}
                <button type="button" class="nw" onclick={onNewItem}>+ new</button>
              {/if}
            </div>
            <div class="slots3">
              {#each slots as s (s.key)}
                {@const card = opt(s.it ?? undefined)}
                {#if s.it && card}
                  <div class="slot" data-slot={s.key} data-pk={s.it.id}>
                    <div class="sh">
                      <span>{s.label}</span>
                      <button type="button" onclick={() => item(s.it!.id)?.toggleEquipped()}>
                        unequip
                      </button>
                    </div>
                    <div class:noart={card.noart} style={card.art}>{@html TILE(card)}</div>
                  </div>
                {:else}
                  {@const blocked = s.key === "secondary" && twoHanded}
                  <div class="slot empty" class:blocked data-slot={s.key}>
                    <div class="sh"><span>{s.label}</span></div>
                    <div class="ph">
                      <b>{blocked ? "No free hand" : "Empty"}</b>
                      <span>
                        {blocked
                          ? `${primary?.name} is Two-Handed — no free hand`
                          : "Nothing equipped in this slot."}
                      </span>
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          </div>

          <!-- Everything owned that is not in a slot. A weapon that cannot be
               equipped right now is still listed and still says so — hiding
               it would make the shield look lost rather than shelved. -->
          {#if carried.length}
            <div class="pnl">
              <div class="k">Carried<s>click to show · equip on the strip</s></div>
              <div class="grid2">
                {#each carried as g (g.id)}
                  {@const card = opt(g)}
                  {@const no = g.type === "weapon" && g.system.slot === "secondary" && twoHanded}
                  {#if card}
                    <div
                      class="eqp"
                      class:no
                      class:noart={card.noart}
                      style={card.art}
                      data-pk={g.id}
                      title={no ? `${primary?.name} is Two-Handed — no free hand` : ""}
                    >
                      {@html TILE(card)}
                      <!-- The strip was a label over a tile that was itself
                           the button. Now it is the button and the tile is a
                           card like every other card here — which also means
                           the one gesture that changes your equipment is no
                           longer the same gesture as reading it. -->
                      <button
                        type="button"
                        class="act"
                        disabled={no}
                        onclick={() => !no && item(g.id)?.toggleEquipped()}
                      >
                        {no ? "needs a free hand" : `equip · ${SLOT_CAP[g.type === "armor" ? "armor" : g.system.slot]}`}
                      </button>
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}

          <!-- Loot with a rules paragraph earns a card, because a rule you
               cannot see is a rule you will not use. -->
          {#if lootCards.length}
            <div class="pnl">
              <div class="k">
                Loot<s>{lootCards.length} carried · {chargeTotal} charges</s>
              </div>
              <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
              <div class="grid2" onclick={onCharge}>
                {#each lootCards as r (r.pk)}
                  {@const src = lootItems.find((i) => i.id === r.pk)}
                  {@const aside =
                    src?.type === "consumable"
                      ? charges(Math.min(CHARGES, src.system.quantity ?? 0), r.pk)
                      : null}
                  <div class="pk" class:noart={r.card.noart} data-pk={r.pk} style={r.card.art}>
                    {@html SPINE({ ...r.card, aside })}
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Below the loot, and it is the right way round: these are the
               things that do nothing. The heading says so rather than leaving
               anyone to wonder why the rope is not a card. -->
          {#if inventory.length}
            <div class="pnl">
              <div class="k">Inventory<s>no rules, no card</s></div>
              <div class="xp">
                {#each inventory as g (g.id)}
                  <!-- `data-pk` even though these rows have no card. It is the
                       key the menu, the drag and the peek are all delegated on,
                       and the rope was the one thing on this sheet you could
                       not delete: no card meant no `data-pk` meant no
                       right-click. The peek and the chat post both look their
                       row up by id and quietly do nothing when there is
                       nothing to draw, which is the correct behaviour for a
                       row that is only a name and a count. -->
                  <button
                    type="button"
                    class="r"
                    data-pk={g.id}
                    onclick={() => item(g.id)?.sheet.render(true)}
                  >
                    <b>{g.name}</b>{#if g.system.quantity > 1}<em>×{g.system.quantity}</em>{/if}
                  </button>
                {/each}
              </div>
            </div>
          {/if}

          {#if !carried.length && !lootCards.length && !inventory.length && !primary && !secondary && !armor}
            <!-- The empty state names both ways in, because until now it
                 named the one that needs a compendium and a table's worth of
                 gear does not come out of a book. -->
            <p class="ach">
              Nothing carried. Drag equipment in from a compendium{#if ed}, or
                <button type="button" class="nw" onclick={onNewItem}>make one</button>{/if}.
            </p>
          {/if}
        {:else if tab === "advancement"}
          <!-- Circles, from the printed sheet, and the only circles here
               other than a gold coin — which is fine, because they are also
               the only thing filled in permanently and never cleared. -->
          <div class="pnl adv">
            <div class="k">Proficiency<s>damage dice</s></div>
            <div class="prof">
              <span class="set">
                {#each Array(6) as _, i (i)}
                  <i class={i < sys.proficiency ? "on" : ""}></i>
                {/each}
              </span>
              <span class="n">{sys.proficiency}</span>
            </div>
            <p class="ach">
              Each level, choose two options with unmarked slots and mark them, then raise both
              damage thresholds by +1. An option with a heavier frame costs both choices.
              Proficiency is how many damage dice you roll — your
              {#if primary}
                {primary.name} rolls {sys.proficiency}{primary.system.damage.dice}{primary.system
                  .damage.bonus
                  ? `+${primary.system.damage.bonus}`
                  : ""}.
              {:else}
                weapon scales with it.
              {/if}
            </p>
          </div>

          {#each ADVANCEMENT as t (t.tier)}
            {@const open = sys.level >= t.at}
            {@const used = t.options.reduce((n, _, oi) => n + taken(t.tier, oi), 0)}
            <div class="pnl adv" class:shut={!open}>
              <div class="k">
                Tier {t.tier}<s>{open ? `${used} marked` : `from level ${t.at}`}</s>
              </div>
              <p class="ach">{t.achievement}</p>
              {#each t.options as o, oi (oi)}
                {@const on = taken(t.tier, oi)}
                <div class="row" class:done={on >= o.slots}>
                  <!-- The boxes are direct children of `.slots`, because that
                       is what `.adv .slots > i` sizes. A wrapper per box to
                       carry its own click handler makes every one of them a
                       grandchild, and they collapse to nothing. So the click
                       is delegated from the row, exactly as the design does. -->
                  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                  <span
                    class="slots"
                    class:pair={o.pair}
                    onclick={(e) => open && onAdvance(e, t.tier, oi, on)}
                  >{@html boxes(o.slots, on)}</span>
                  <span class="lb">{o.label}</span>
                </div>
              {/each}
            </div>
          {/each}
        {:else}
          <!-- All three are written, not derived, so all three are editors.
               They were read-only panels, which meant the only way to fill in
               a character's own history was the item-sheet-shaped hole of
               editing the actor somewhere else.

               `{#key}` on the item id: the editor is built once and then owns
               its own DOM, so switching to a different actor has to build a
               different editor rather than hand the old one new text. -->
          {#key doc.id}
            {#each BIO_FIELDS as f (f.key)}
              <div class="pnl">
                <div class="k">{f.label}<s>{f.note}</s></div>
                <Prose
                  {doc}
                  path="system.biography.{f.key}"
                  value={sys.biography?.[f.key] ?? ""}
                  editable={ed}
                  height={f.height}
                />
              </div>
            {/each}
          {/key}
        {/if}
      </div>
    </div>

    <!-- Inside .bd rather than .win: the layer's box is the frame a peek is
         positioned and clamped against, and the app's own title bar is not
         part of the sheet. Parked higher up, a card centred on a top row
         rides up over Foundry's window chrome. -->
    <div class="peeklayer">
      {#each peekRows as r (r.pk)}
        <div class="pkc" class:noart={r.card.noart} data-peek={r.pk} style={r.card.art}>
          {@html CARD(r.card)}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  /* There is no bespoke row style here any more, and that is the point:
     every card on this sheet is a SPINE, a TILE or a CARD from `design/`,
     so there is nothing left for this sheet to invent a look for. */
  .bio {
    font: 400 12.5px/1.6 var(--f-ui);
    color: var(--ink-2);
  }
  /* The trait and experience rows, the Evasion arch and the two roll buttons
     are buttons — they are things you press. Strip the browser's and
     Foundry's own button chrome so the design's rules land on them unchanged.

     `height`/`min-height` are the load-bearing pair. Foundry gives every
     `button` a fixed 28px, which is right for its own toolbars and wrong for
     anything that stacks: a trait cell wants 66px and a roll button 49px, and
     both are `overflow:hidden` flex columns, so at 28px the children do not
     overflow — they collapse to zero height and vanish. That is why the trait
     row was a bare number with no label and no mark, and why the attack
     button was a sliver. One rule, two symptoms.

     `padding:0` matters for its own reason: the arch is a 58×64 grid with the
     numeral placed inside it, and a user-agent 1px 6px would shift that
     numeral off its own optical centre. */
  .trs .tr,
  .xp .r,
  .wr .go {
    height: auto;
    min-height: 0;
    line-height: normal;
    border: 0;
    padding: 0;
    cursor: pointer;
    font: inherit;
    text-align: inherit;
  }
  /* The arch is the one that must *not* take `height:auto`, and it took it
     for a while — which is why Evasion came back at half size. The three
     above have no height of their own and size to their content, so `auto`
     is what releases them from Foundry's 28px. This one is a fixed 58×64
     grid with an SVG absolutely positioned inside it: nothing in it has
     height, so `auto` collapses the box to the numeral and the arch is
     drawn into a 30px slot. `min-height` alone is what was needed. */
  .dfn .crest.ev {
    min-height: 0;
    line-height: normal;
    border: 0;
    padding: 0;
    cursor: pointer;
    font: inherit;
    background: none;
    box-shadow: none;
  }
  /* The equip strip is the one that must *not* join the group above.
     `design/sheet.css` already gives `.eqp .act` its padding, font, colour,
     background and centring — it was always drawn as a strip, it just was
     not a button. So the only thing to strip here is the chrome a button
     brings with it, and declaring `padding:0` or `font:inherit` alongside
     the others collapsed it to a zero-height sliver: this rule is more
     specific than the ported one and wins every property it names. Name
     less. */
  .eqp .act {
    width: 100%;
    height: auto;
    min-height: 0;
    border: 0;
    cursor: pointer;
  }
  /* Same reasoning as `.eqp .act`, and the same discipline: `design/` draws
     these two, so name only the chrome that has to go. The level plate is
     the one place an input has to disappear entirely into a shape — Foundry
     gives every input a box, a border and a focus ring, and all three of
     them are the plate's job here, not the field's. */
  /* The two controls that are typographic rather than boxed — the panel
     heading's action and the link inside an empty-state sentence. `design/`
     gives both their font and colour; the only thing to take away here is
     the 28px floor and the box, which would make each of them a widget
     sitting in a line of text. */
  .pnl > .k .nw,
  .ach .nw {
    width: auto;
    height: auto;
    min-height: 0;
    line-height: inherit;
    box-shadow: none;
    border-radius: 0;
  }
  .dio .ctl,
  .dio .lv .b {
    height: auto;
    min-height: 0;
    line-height: normal;
    box-shadow: none;
    outline-offset: 2px;
  }
  .dio .lv .b {
    border: 0;
    border-radius: 0;
    background: transparent;
  }
  .eqp .act:disabled {
    cursor: default;
  }
  /* ...except the three the design gives an explicit padding of its own. */
  .trs .tr {
    padding: 9px 4px 10px;
  }
  .xp .r {
    padding: 5px 9px;
  }
  .wr .go {
    padding: 7px 11px 6px;
  }
</style>
