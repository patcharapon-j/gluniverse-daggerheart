<!--
  Making a character.

  Six steps and the character they build, in one column. The rail carries
  both — see the head of `design/make.css` for why that is the whole layout
  argument and not a space saving.

  Nothing here is held. Every press writes to the actor immediately, which is
  what makes closing the window leaving rather than cancelling, and what makes
  reopening it three weeks later show you the truth rather than a memory.
-->
<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any */
  import { onMount, tick } from "svelte";
  import {
    BURDEN_LABELS,
    CREATION_STEPS,
    RANGE_LABELS,
    STARTING_DOMAIN_CARDS,
    STARTING_EXPERIENCES,
    STARTING_KIT,
    STARTING_TRAIT_SPREAD,
    TRAITS,
    TRAIT_LABELS,
    TRAIT_VERBS,
    domainDef,
  } from "../config.ts";
  import {
    armorRefusal,
    cardRefusal,
    cascadeOf,
    classOf,
    dropCard,
    equippedArmor,
    equippedPrimary,
    equippedSecondary,
    fromPack,
    namedExperiences,
    setFinished,
    stepsOf,
    subclassOf,
    takeAncestry,
    takeArmor,
    takeCard,
    takeClass,
    takeCommunity,
    takeExperiences,
    takeKit,
    takeSubclass,
    takeTraits,
    takeWeapon,
    weaponRefusal,
  } from "./creation.ts";
  import { cardOf, classKey, loadSigils, plain, type Sigils } from "../sheets/cards.ts";
  import { postCard } from "../sheets/post-card.ts";
  import { CARD, fit, rich } from "../ui/card.js";
  import { setVals, sign, VALS, type ValRow } from "../ui/make.js";
  import { dhDialog } from "./dialog.ts";

  interface Props {
    doc: any;
    snap: any;
    app: any;
  }
  let { doc, snap, app }: Props = $props();

  const isGM = game.user?.isGM ?? false;

  /* ── where we are ──────────────────────────────────────────────────
     A cursor, and it is *local state* rather than anything stored. "Where you
     left off" is the first unsatisfied step, computed on open; the cursor only
     records where you have walked since. Storing it would be a second record
     of a fact the sheet already holds — see the head of `creation.ts`. */
  let at = $state<string>("class");
  let started = false;

  /** The GM's one switch. Not persisted: it is a ruling for this sitting. */
  let loose = $state(false);

  /* Steps are recomputed from the *document* rather than the snapshot, because
     the predicates want real Items with their methods. `snap.rev` is read
     first purely to make this reactive — it is bumped on every sync, so any
     write anywhere re-derives the whole rail. */
  const steps = $derived.by(() => {
    void snap.rev;
    return stepsOf(doc);
  });
  const step = $derived(steps.find((s) => s.id === at) ?? steps[0]);
  const doneCount = $derived(steps.filter((s) => s.done).length);
  const allDone = $derived(steps.every((s) => s.done));
  const finished = $derived(!!snap.system?.creation?.finished);

  /* Review is a page rather than a step, so it lives outside the list. */
  let reviewing = $state(false);

  /* ── the compendiums ───────────────────────────────────────────────
     Loaded once per window. `getDocuments()` on the domain pack is 189
     documents; a step that re-fetched on every keystroke would be a search box
     with a database behind it. */
  let classes = $state<any[]>([]);
  let subclasses = $state<any[]>([]);
  let ancestries = $state<any[]>([]);
  let communities = $state<any[]>([]);
  let deck = $state<any[]>([]);
  let weapons = $state<any[]>([]);
  let armors = $state<any[]>([]);
  let potions = $state<any[]>([]);
  let sigils = $state<Sigils>({});
  let loading = $state(true);

  onMount(async () => {
    const [cls, her, dom, eq, sig] = await Promise.all([
      fromPack("classes"),
      fromPack("heritage"),
      fromPack("domains", "domainCard"),
      fromPack("equipment"),
      loadSigils(),
    ]);
    classes = cls.filter((d: any) => d.type === "class").sort(byName);
    subclasses = cls.filter((d: any) => d.type === "subclass");
    ancestries = her.filter((d: any) => d.type === "ancestry").sort(byName);
    communities = her.filter((d: any) => d.type === "community").sort(byName);
    deck = dom;
    weapons = eq.filter((d: any) => d.type === "weapon");
    armors = eq.filter((d: any) => d.type === "armor").sort(byTier);
    potions = eq.filter(
      (d: any) => d.type === "consumable" && /^Minor (Health|Stamina) Potion$/.test(d.name),
    );
    sigils = sig;
    loading = false;

    /* Land on the first gap. This is the whole of "continue where you left
       off", and it needs nothing stored because the sheet already knows. */
    if (!started) {
      started = true;
      const gap = steps.find((s) => !s.done && !s.blocked);
      if (finished || !gap) reviewing = true;
      else at = gap.id;
    }
  });

  const byName = (a: any, b: any) => a.name.localeCompare(b.name);
  const byTier = (a: any, b: any) =>
    (a.system?.tier ?? 1) - (b.system?.tier ?? 1) || a.name.localeCompare(b.name);

  /* ══════════════════════════════════════════════════════════════════
     THE RAIL'S NUMBERS

     Render-once-and-diff, exactly as `Marks.svelte` and `Gems.svelte` do it,
     and for the same reason: re-rendering the block would replace every
     element, so every value would animate on every change. The animation
     means "this is what that choice did" and it only means that if it fires
     on the ones that did.
     ══════════════════════════════════════════════════════════════════ */

  let valsEl: HTMLElement | undefined = $state();

  const rows = $derived.by((): ValRow[] => {
    void snap.rev;
    const s = snap.system ?? {};
    const cls = classOf(doc);
    const armor = equippedArmor(doc);
    return [
      { head: "the character" },
      { k: "Level", v: s.level ?? 1 },
      { k: "Evasion", v: cls ? (s.evasion?.value ?? null) : null },
      { k: "Hit Points", v: cls ? (s.resources?.hitPoints?.max ?? null) : null },
      { k: "Stress", v: s.resources?.stress?.max ?? null },
      { k: "Hope", v: s.resources?.hope?.value ?? null, sub: `/ ${s.resources?.hope?.max ?? 6}` },
      { head: "damage" },
      { k: "Major", v: armor ? (s.thresholds?.major ?? null) : null },
      { k: "Severe", v: armor ? (s.thresholds?.severe ?? null) : null },
      { k: "Armor", v: armor ? (s.armorScore?.value ?? null) : null },
      { head: "rolling" },
      { k: "Proficiency", v: s.proficiency ?? 1 },
      { k: "Spellcast", v: s.spellcastTrait ? (TRAIT_LABELS[s.spellcastTrait] ?? null) : null },
    ];
  });

  /* Drawn once on mount, then driven through the diff. `first` is what keeps
     the initial paint from lighting all thirteen: an arrival is not a change. */
  let first = true;
  $effect(() => {
    const list = rows;
    if (!valsEl) return;
    if (first) {
      first = false;
      return;
    }
    setVals(valsEl, list);
  });

  const domainDots = $derived(
    (snap.system?.domainList ?? []).map((d: string) => ({
      c: domainDef(d).light,
      name: domainDef(d).label,
    })),
  );

  /* ══════════════════════════════════════════════════════════════════
     NO PEEK

     **Nothing in this window hovers a card, and that is now the whole rule
     rather than an exception with one survivor.**

     Subclass, ancestry, community and the domain deck all draw the printed
     card in the grid, so hovering one opened a second copy of the picture
     already under the cursor — the sheet's gesture kept out of habit rather
     than because it answered anything. The class step gave it up when the
     subclass drawer landed and the other three followed.

     Equipment was the last one holding it, on the reasoning that a longsword
     is not a card and the peek was the only place its card existed at all.
     That reasoning was about the *tile*, which stated five facts in five
     different places and left you asking what the thing was. The table
     answers that: name, trait, range, damage, burden and feature, in columns,
     read down against thirty-four neighbours. A card floating over the row
     you are reading is then a picture interrupting the comparison the table
     was built to let you make — and it is a picture of a weapon, which is to
     say a type glyph and a paragraph you can already see.

     So the layer is gone, not merely empty. It had exactly one subject left,
     and a `.peeklayer` rendering nothing is machinery that reads as a feature.
     The character sheet keeps its peek untouched; this window simply is not a
     place where cards hover.
     ══════════════════════════════════════════════════════════════════ */

  let winEl: HTMLElement | undefined = $state();

  /** A pack document in the shape `cardOf` reads. */
  const asSnapshot = (d: any) => ({
    id: d.id,
    uuid: d.uuid ?? "",
    name: d.name,
    type: d.type,
    img: d.img,
    sort: 0,
    system: d.system,
  });

  const cardCtx = $derived({
    domains: snap.system?.domains,
    classDomains: Object.fromEntries(
      classes.map((c: any) => [c.name.toLowerCase(), c.system?.domains ?? {}]),
    ),
  });

  /** The card for a pack document — the same call the peek layer makes, so an
      inline card and its peek can never disagree about what they are of. */
  const cardFor = (d: any) => cardOf(asSnapshot(d), sigils, cardCtx);

  /* `fit()` measures every `.card` in the scope, and four steps draw cards
     inline. Keyed on the step and the document revision, which together cover
     every way a card can appear, leave, or change what it says. */
  $effect(() => {
    void at;
    void reviewing;
    void snap.rev;
    if (!winEl) return;
    requestAnimationFrame(() => {
      if (winEl) {
        fit(winEl);
        // `fit()` measures wrapped prose. Repeat the measurement after the
        // real card faces load if Foundry opened the window against fallbacks.
        if (document.fonts?.status === "loading") {
          void document.fonts.ready.then(() => winEl && fit(winEl));
        }
      }
    });
  });

  /* ══════════════════════════════════════════════════════════════════
     STEP 1 — CLASS
     ══════════════════════════════════════════════════════════════════ */

  const chosenClass = $derived.by(() => {
    void snap.rev;
    return classOf(doc);
  });
  const chosenSub = $derived.by(() => {
    void snap.rev;
    return subclassOf(doc);
  });

  /** A class's two subclasses, by their foundation cards. */
  const subclassesFor = (cls: any): any[] =>
    !cls
      ? []
      : subclasses
          .filter(
            (s: any) =>
              s.system?.rank === "foundation" &&
              String(s.system?.className ?? "").toLowerCase() === String(cls.name).toLowerCase(),
          )
          .sort(byName);

  /* There is no `previewClass` any more. It existed because the subclass grid
     was a block of its own below the list, so something had to say which class
     it was a grid *for* before the class was taken. The drawer is inside the
     panel now, so the only class showing subclasses is the chosen one and the
     answer is adjacency rather than state. */

  async function pickClass(cls: any) {
    // Same class, nothing to confirm and nothing to remove.
    if (chosenClass?.name === cls.name) return;

    const doomed = cascadeOf(doc, cls);
    if (doomed.length && !(await confirmCascade(cls, doomed))) return;
    // One subclass, or none: taking the class alone and asking next is right.
    // Two is the normal case and the second press is the real choice.
    const only = subclassesFor(cls);
    await takeClass(doc, cls, only.length === 1 ? only[0] : null);
    flash(cls.id);
  }

  async function pickSubclass(sub: any) {
    if (!chosenClass) return;
    await takeSubclass(doc, sub);
    flash(sub.id);
  }

  /**
   * Name every document before removing it.
   *
   * "3 items will be removed" is a sentence nobody can consent to. The list is
   * what makes this a decision rather than a formality, and it is why
   * `cascadeOf` returns documents rather than ids.
   */
  async function confirmCascade(cls: any, doomed: any[]): Promise<boolean> {
    const rowsHtml = doomed
      .map(
        (d: any) =>
          `<label class="pick"><b>${foundry.utils.escapeHTML(d.name)}</b>` +
          `<s>${game.i18n.localize(`TYPES.Item.${d.type}`)}</s></label>`,
      )
      .join("");
    const ok = await dhDialog<boolean>({
      title: game.i18n.localize("DAGGERHEART.Create.ChangeClassTitle"),
      ok: game.i18n.localize("DAGGERHEART.Create.ChangeClassOk"),
      content:
        `<p class="ach">${game.i18n.format("DAGGERHEART.Create.ChangeClassHint", {
          name: foundry.utils.escapeHTML(cls.name),
        })}</p><div class="picks">${rowsHtml}</div>`,
      read: () => true,
    });
    return ok === true;
  }

  /* ══════════════════════════════════════════════════════════════════
     STEP 2 — ANCESTRY, THEN COMMUNITY

     The book's heritage step, drawn as the two choices it actually asks for.
     One stage with both grids meant the community deck began below eighteen
     ancestry cards, and the mixed switch sat over a grid it does not govern.

     Mixed ancestry is the one thing on either step that is not just "pick
     one". It is off by default, because it is an option rather than the norm,
     and turning it on splits the ancestry choice in two — the top feature of
     one, the bottom of another. The position *is* the rule.
     ══════════════════════════════════════════════════════════════════ */

  let mixing = $state(false);
  let mixTop = $state<any>(null);

  const chosenAncestry = $derived.by(() => {
    void snap.rev;
    return [...doc.items].find((i: any) => i.type === "ancestry") ?? null;
  });
  const chosenCommunity = $derived.by(() => {
    void snap.rev;
    return [...doc.items].find((i: any) => i.type === "community") ?? null;
  });

  async function pickAncestry(a: any) {
    if (!mixing) {
      await takeAncestry(doc, a);
      flash(a.id);
      return;
    }
    if (!mixTop) {
      mixTop = a;
      return;
    }
    await takeAncestry(doc, mixTop, a);
    flash(a.id);
    mixTop = null;
    mixing = false;
  }

  /* ══════════════════════════════════════════════════════════════════
     STEP 3 — TRAITS

     Chips are keyed by *position*, not by value. Two of them read +1 and two
     read 0, so "the +1 chip" is not a thing that exists — placing the second
     +1 has to be distinguishable from moving the first, and taking one back
     has to know which hole it came out of.
     ══════════════════════════════════════════════════════════════════ */

  const SPREAD: number[] = [...STARTING_TRAIT_SPREAD];

  /** trait key → chip index. Rebuilt from the actor so it survives a reopen. */
  let placed = $state<Record<string, number>>({});
  let armed = $state<number | null>(null);

  /**
   * Read the placement back off the six trait values.
   *
   * The sheet stores numbers and this control thinks in chips, so coming back
   * to a half-placed spread means working out which chip is in which trait.
   * Greedy by value against the remaining chips, which is exact because the
   * chips *are* the multiset: any assignment that uses each value the right
   * number of times is the same assignment as far as the sheet is concerned.
   */
  function readPlacement() {
    const free = SPREAD.map((v, i) => ({ v, i }));
    const out: Record<string, number> = {};
    const values = TRAITS.map((t) => ({ t, v: Number(snap.system?.traits?.[t]?.value ?? 0) }));
    // Non-zero first: a trait sitting at 0 is ambiguous between "the 0 chip is
    // here" and "nothing is here", and spending the unambiguous ones first is
    // what stops a real +2 being matched against a hole.
    for (const { t, v } of [...values].sort((a, b) => Math.abs(b.v) - Math.abs(a.v))) {
      const n = free.findIndex((c) => c.v === v);
      const chip = free[n];
      if (n === -1 || !chip) continue;
      out[t] = chip.i;
      free.splice(n, 1);
    }
    // All six placed, or none. A partial read would put chips in traits the
    // player never touched, which is worse than an empty tray.
    placed = Object.keys(out).length === TRAITS.length ? out : {};
  }

  /**
   * Re-read only when the sheet says something we did not.
   *
   * This used to re-derive the placement on **every** revision of the actor,
   * and that quietly broke the whole step: placing a chip writes six numbers,
   * the write bumps the revision, the re-read runs — and `readPlacement` is
   * all-six-or-nothing, so one chip down it reconstructed three slots, gave
   * up, and cleared the tray. The number landed on the character and the
   * control sprang back to empty. Both gestures had it; it looked like the
   * click not registering and like the drag doing nothing.
   *
   * The all-or-nothing rule is right and stays — a trait sitting at 0 is
   * genuinely ambiguous between "the 0 chip is here" and "nothing is here",
   * and guessing puts chips in slots the player never touched. What was wrong
   * was running it against our own writes at all. So the six values are
   * compared with what `placed` *implies* they should be: equal means the
   * change was ours and the local state is already the better record; unequal
   * means somebody moved a trait somewhere else — the adjust tab, a macro —
   * and re-deriving is the only honest thing to do.
   *
   * `lastRead` stops the unequal case retrying forever when the spread cannot
   * be reconstructed at all, which is what a hand-set +2 and five zeros is.
   * It is a plain `let`, not `$state`: writing it must not re-enter the
   * effect, exactly like the rail's `first` flag above.
   */
  let lastRead = "";
  $effect(() => {
    void snap.rev;
    if (at !== "traits") {
      lastRead = "";
      return;
    }
    const actual = TRAITS.map((t) => Number(snap.system?.traits?.[t]?.value ?? 0)).join(",");
    if (actual === lastRead) return;
    lastRead = actual;
    if (actual === TRAITS.map((t) => traitValue(t) ?? 0).join(",")) return;
    readPlacement();
  });

  const chips = $derived(
    SPREAD.map((v, i) => ({
      v,
      i,
      spent: Object.values(placed).includes(i),
      armed: armed === i,
    })),
  );

  const traitValue = (t: string): number | null => {
    const i = placed[t];
    return i === undefined ? null : (SPREAD[i] ?? null);
  };

  function armChip(i: number) {
    armed = armed === i ? null : i;
  }

  async function dropChip(t: string) {
    if (placed[t] !== undefined) {
      const { [t]: _gone, ...rest } = placed;
      placed = rest;
      armed = null;
      await writeTraits();
      return;
    }
    if (armed === null) return;
    placed = { ...placed, [t]: armed };
    armed = null;
    await writeTraits();
  }

  /* ── the drag ──────────────────────────────────────────────────────
     A chip is a thing you pick up, and until now it was only a thing you
     pressed — the tray said `cursor:grab`, the whole control was designed
     around a budget you *spend*, and dragging one did nothing at all.

     Both gestures commit through `placeChip`, which is `swap.js`'s rule about
     a surface that can be dragged and pressed: one call, one result, nothing
     to learn twice. What drag adds that click cannot is the two moves that
     have no press — taking a value out of a trait by pulling it back to the
     tray, and moving one straight from one trait to another. A click can
     express "put this here" and "take this off"; it cannot express "move this
     there", because the intermediate state has nowhere to be.

     The payload is the chip *index*, not its value. Two chips read +1 and
     "the +1 chip" is not a thing that exists — the same reason the tray is
     keyed positionally. It travels as `text/plain` because Foundry's own
     drop handler on the sheet reads `text/plain` as JSON and would otherwise
     be handed something it cannot parse; ours never leaves this window, so
     it is a bare number and `dragKind` is what says it is ours.

     `over` is a single trait key rather than a class toggled on elements,
     because `dragleave` fires on every child crossed and a boolean strobes.
     One value, last writer wins, cleared on drop and on dragend. */

  /** The chip index currently being dragged, or null. Not `$state` for the
      payload's sake — but it *is*, because the tray and the slots both draw
      from it. */
  let dragChip = $state<number | null>(null);
  /** The trait a dragged chip is currently over, `"tray"` for the tray. */
  let over = $state<string | null>(null);

  function startDrag(e: DragEvent, i: number) {
    dragChip = i;
    armed = null;
    e.dataTransfer?.setData("text/plain", String(i));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  }

  function endDrag() {
    dragChip = null;
    over = null;
  }

  /** True when the event carries one of our chips. Guards every handler, so a
      drag from anywhere else bubbles to the window root untouched — the same
      job `dragId` does for the vault. */
  const ours = () => dragChip !== null;

  function allow(e: DragEvent, target: string) {
    if (!ours()) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    over = target;
  }

  /** Put chip `i` on trait `t`, displacing whatever was there. */
  async function placeChip(i: number, t: string) {
    const next: Record<string, number> = {};
    // A chip lives in at most one trait, so placing it anywhere takes it out
    // of wherever it was — which is what makes trait→trait a move rather than
    // a copy, with no special case for it.
    for (const [key, chip] of Object.entries(placed)) if (chip !== i && key !== t) next[key] = chip;
    next[t] = i;
    placed = next;
    armed = null;
    await writeTraits();
  }

  async function dropOnTrait(e: DragEvent, t: string) {
    if (!ours()) return;
    e.preventDefault();
    const i = dragChip!;
    endDrag();
    await placeChip(i, t);
  }

  /** Dropped back in the tray: whatever trait held it lets go. */
  async function dropOnTray(e: DragEvent) {
    if (!ours()) return;
    e.preventDefault();
    const i = dragChip!;
    endDrag();
    if (!Object.values(placed).includes(i)) return;
    placed = Object.fromEntries(Object.entries(placed).filter(([, chip]) => chip !== i));
    await writeTraits();
  }

  const writeTraits = () =>
    takeTraits(
      doc,
      Object.fromEntries(TRAITS.map((t) => [t, traitValue(t) ?? 0])),
    );

  /* ══════════════════════════════════════════════════════════════════
     STEP 5 — EQUIPMENT
     ══════════════════════════════════════════════════════════════════ */

  const tier = $derived(snap.system?.tier ?? 1);

  const primaries = $derived(
    weapons
      .filter((w: any) => w.system?.slot === "primary" && (loose || w.system?.tier <= tier))
      .sort(byName),
  );
  const secondaries = $derived(
    weapons
      .filter((w: any) => w.system?.slot === "secondary" && (loose || w.system?.tier <= tier))
      .sort(byName),
  );
  const armorList = $derived(armors.filter((a: any) => loose || a.system?.tier <= tier));

  const heldPrimary = $derived.by(() => {
    void snap.rev;
    return equippedPrimary(doc);
  });
  const heldSecondary = $derived.by(() => {
    void snap.rev;
    return equippedSecondary(doc);
  });
  const heldArmor = $derived.by(() => {
    void snap.rev;
    return equippedArmor(doc);
  });

  /** Which of the three equipment lists is showing. */
  let gear = $state<"primary" | "secondary" | "armor" | "pack">("primary");

  const twoHanded = $derived(heldPrimary?.system?.burden === "twoHanded");

  /* ── the table's groups ────────────────────────────────────────────
     The book's own tables, in the book's own order.

     Chapter 2 prints primaries as *two* tables per tier — Physical and Magic
     — and that split is a rule rather than a heading: every magic weapon is
     rolled with your Spellcast trait, which a character without a spellcasting
     subclass does not have. Secondaries and armour are one table each and get
     no caption at all, because inventing one would claim a division the book
     does not make.

     The tier joins the caption only when more than one is on screen, which
     only ever happens under the GM's `unrestricted` switch. At level 1 there
     is exactly one tier, and saying "Tier 1" above every group is the window
     answering a question nobody asked six times over. */

  type GearGroup = { key: string; label: string; rows: any[] };

  const groupsOf = (list: any[], split: boolean): GearGroup[] => {
    const tiers = [...new Set(list.map((w: any) => w.system?.tier ?? 1))].sort(
      (a: number, b: number) => a - b,
    );
    const many = tiers.length > 1;
    const out: GearGroup[] = [];
    for (const t of tiers) {
      const here = list.filter((w: any) => (w.system?.tier ?? 1) === t);
      const parts: [string, any[]][] = split
        ? [
            ["Physical", here.filter((w: any) => !w.system?.magical)],
            ["Magic", here.filter((w: any) => !!w.system?.magical)],
          ]
        : [["", here]];
      for (const [kind, rows] of parts) {
        if (!rows.length) continue;
        out.push({
          key: `${t}:${kind}`,
          label: many ? (kind ? `Tier ${t} · ${kind}` : `Tier ${t}`) : kind,
          rows,
        });
      }
    }
    return out;
  };

  const gearGroups = $derived(
    gear === "primary"
      ? groupsOf(primaries, true)
      : gear === "secondary"
        ? groupsOf(secondaries, false)
        : gear === "armor"
          ? groupsOf(armorList, false)
          : [],
  );

  async function pickWeapon(w: any, slot: "primary" | "secondary") {
    await takeWeapon(doc, w, slot);
    flash(w.id);
  }

  async function pickArmor(a: any) {
    await takeArmor(doc, a);
    flash(a.id);
  }

  /* ── the pack ──────────────────────────────────────────────────────
     Torch, rope, supplies, a potion, and the class's own "X or Y". The first
     three are not a choice and arrive together; the last two are, and are the
     only reason this is a panel rather than a line of text. */

  const hasKit = $derived.by(() => {
    void snap.rev;
    return STARTING_KIT.every((k: any) =>
      [...doc.items].some((i: any) => i.type === "loot" && i.name === k.name),
    );
  });

  /** The class's either/or, split. Every class stores it as "X or Y". */
  const classChoice = $derived.by(() => {
    const raw = plain(chosenClass?.system?.startingInventory).replace(/<br>/g, " ");
    const [a, b] = raw.split(/\s+\bor\b\s+/i);
    return a && b ? [a.trim(), b.trim()] : [];
  });

  const heldLoot = $derived.by(() => {
    void snap.rev;
    return [...doc.items].filter((i: any) => i.type === "loot").map((i: any) => i.name);
  });
  const heldConsumables = $derived.by(() => {
    void snap.rev;
    return [...doc.items].filter((i: any) => i.type === "consumable").map((i: any) => i.name);
  });

  async function grantKit() {
    const want = STARTING_KIT.filter((k: any) => !heldLoot.includes(k.name));
    await takeKit(
      doc,
      want.map((k: any) => ({
        name: k.name,
        type: "loot",
        img: "systems/gluniverse-daggerheart/assets/types/gear.svg",
        system: { description: `<p>${k.description}</p>`, quantity: 1, source: "Starting inventory" },
      })),
    );
  }

  async function pickPotion(p: any) {
    const other = potions.filter((x: any) => x.id !== p.id).map((x: any) => x.name);
    const drop = [...doc.items].filter(
      (i: any) => i.type === "consumable" && other.includes(i.name),
    );
    if (drop.length) await doc.deleteEmbeddedDocuments("Item", drop.map((d: any) => d.id));
    if (heldConsumables.includes(p.name)) return;
    await takeKit(doc, [p.toObject()]);
    flash(p.id);
  }

  async function pickClassItem(text: string) {
    const other = classChoice.filter((c) => c !== text);
    const drop = [...doc.items].filter((i: any) => i.type === "loot" && other.includes(i.name));
    if (drop.length) await doc.deleteEmbeddedDocuments("Item", drop.map((d: any) => d.id));
    if (heldLoot.includes(text)) return;
    await takeKit(doc, [
      {
        name: text,
        type: "loot",
        img: "systems/gluniverse-daggerheart/assets/types/gear.svg",
        system: { description: "", quantity: 1, source: `${chosenClass?.name ?? ""} starting item` },
      },
    ]);
  }

  /* ══════════════════════════════════════════════════════════════════
     STEP 7 — EXPERIENCES
     ══════════════════════════════════════════════════════════════════ */

  let xpNames = $state<string[]>(["", ""]);

  $effect(() => {
    void snap.rev;
    if (at !== "experiences") return;
    const held = snap.system?.experiences ?? [];
    xpNames = [held[0]?.name ?? "", held[1]?.name ?? ""];
  });

  const saveExperiences = () => takeExperiences(doc, xpNames);

  /* ══════════════════════════════════════════════════════════════════
     STEP 8 — DOMAIN CARDS

     The whole level-1 pool of both your domains, with everything else present
     and captioned. Filtering the illegal cards out would leave a deck that
     looks complete — see the note in `make.js`.
     ══════════════════════════════════════════════════════════════════ */

  const myDomains = $derived((snap.system?.domainList ?? []) as string[]);

  /** Every card worth showing: your two domains in full, at any level. */
  const legalDeck = $derived(
    deck
      .filter((c: any) => myDomains.includes(c.system?.domain))
      .sort(
        (a: any, b: any) =>
          (a.system?.level ?? 1) - (b.system?.level ?? 1) || a.name.localeCompare(b.name),
      ),
  );

  const heldCards = $derived.by(() => {
    void snap.rev;
    return [...doc.items].filter((i: any) => i.type === "domainCard");
  });

  async function toggleCard(c: any) {
    const held = heldCards.find((h: any) => h.name === c.name);
    if (held) {
      await dropCard(doc, held.id);
      return;
    }
    if (!loose && heldCards.length >= STARTING_DOMAIN_CARDS) return;
    await takeCard(doc, c);
    flash(c.id);
  }

  /* ══════════════════════════════════════════════════════════════════
     THE REVIEW, AND FINISHING
     ══════════════════════════════════════════════════════════════════ */

  interface RuleRow {
    from: string;
    name: string;
    text: string;
  }

  /** Everything acquired, with its rules text. The one screen that shows it. */
  const acquired = $derived.by((): RuleRow[] => {
    void snap.rev;
    const out: RuleRow[] = [];
    const add = (from: string, f: any) => {
      if (f?.name || f?.description) {
        out.push({ from, name: f.name || "Feature", text: plain(f.description) });
      }
    };
    for (const i of doc.items ?? []) {
      const s = i.system ?? {};
      if (i.type === "class") {
        for (const f of s.classFeatures ?? []) add(i.name, f);
        add(i.name, s.hopeFeature);
      } else if (i.type === "subclass") {
        for (const f of s.features ?? []) add(`${s.subclassName} · ${s.rank}`, f);
      } else if (i.type === "ancestry") {
        add(i.name, s.topFeature);
        add(i.name, s.bottomFeature);
      } else if (i.type === "community") {
        add(i.name, s.feature);
      } else if (i.type === "transformation") {
        /* There is no transformation *step* — the book hands these out as a
           narrative event during play and says the GM may, at their discretion,
           offer one at creation, so it is not one of the nine numbered stages
           and inventing a tenth would put a page in this flow that the rulebook
           does not have. A character who has one got it by dragging the card
           onto their sheet.

           The review page is a different question. It is not a step either —
           it is the character — and its whole job is to print the full rules
           text of everything you are carrying. A transformation you already
           have is exactly that, and both of its features belong here, drawback
           included: the book asks you to keep the burden in view. */
        for (const f of s.features ?? []) add(i.name, f);
      } else if (i.type === "domainCard") {
        add(`${domainDef(s.domain).label} · level ${s.level}`, {
          name: i.name,
          description: s.description,
        });
      }
    }
    return out;
  });

  const outstanding = $derived(steps.filter((s) => !s.done));

  async function finish() {
    await setFinished(doc, true);
    await postCard(summaryCard(), doc);
    app?.close?.();
  }

  /**
   * The card a finished character posts.
   *
   * This system posts what happened — every roll, every rest, every feature
   * used — and a character arriving at the table is at least as much of an
   * event as a short rest. Built off the class Item so it wears the two
   * domains in its corners and the class mark on its plate, which is the
   * treatment every other thing that class says already gets.
   */
  function summaryCard(): any {
    const cls = chosenClass;
    const sub = chosenSub;
    const anc = chosenAncestry;
    const com = chosenCommunity;
    const p = cls?.system?.domains?.primary;
    const q = cls?.system?.domains?.secondary;
    const ck = cls ? `#${String(cls.name).toLowerCase()}` : undefined;

    return {
      id: doc.id,
      k: `${doc.id}:made`,
      art: "--art:none",
      noart: true,
      d: domainAsKind(p),
      d2: q ? domainAsKind(q) : undefined,
      sig: (p && sigils[p]) || "",
      sigKey: p,
      sig2: q ? (sigils[q] ?? "") : undefined,
      sig2Key: q,
      fbsig: ck ? sigils[ck] : undefined,
      fbsigKey: ck,
      fbname: cls?.name,
      type: "CHARACTER",
      name: doc.name,
      foot: [com?.name, anc?.name].filter(Boolean).join(" · ") || "Heritage",
      stats: [
        { k: "Class", v: cls?.name ?? "—" },
        { k: "Subclass", v: sub?.system?.subclassName ?? "—" },
        { k: "Evasion", v: snap.system?.evasion?.value ?? 10 },
        { k: "Hit Points", v: snap.system?.resources?.hitPoints?.max ?? 6 },
      ],
      text: TRAITS.map((t) => `${TRAIT_LABELS[t]} ${sign(snap.system?.traits?.[t]?.value ?? 0)}`).join(
        " · ",
      ),
    };
  }

  const domainAsKind = (slug?: string) => {
    const d = domainDef(slug ?? "");
    return { slug, name: d.label, light: d.light, dark: d.dark, ramp: true };
  };

  /* ── the arrival on a chosen tile ──────────────────────────────────
     `.just` is dropped a beat later, so a re-render does not replay the
     brackets snapping on — the same `play`/`land` distinction the chat plate
     spells out. */
  let justId = $state<string | null>(null);
  async function flash(id: string) {
    justId = id;
    await tick();
    setTimeout(() => {
      if (justId === id) justId = null;
    }, 340);
  }

  /* ── moving between steps ──────────────────────────────────────────── */

  const index = $derived(steps.findIndex((s) => s.id === at));

  function go(id: string) {
    const s = steps.find((x) => x.id === id);
    if (!s || s.blocked) return;
    reviewing = false;
    at = id;
    turn();
  }

  function next() {
    if (reviewing) return;
    const after = steps.slice(index + 1).find((s) => !s.blocked);
    if (after) {
      at = after.id;
      turn();
    } else {
      reviewing = true;
      turn();
    }
  }

  function back() {
    if (reviewing) {
      reviewing = false;
      turn();
      return;
    }
    const before = steps.slice(0, index).reverse().find((s) => !s.blocked);
    if (before) {
      at = before.id;
      turn();
    }
  }

  /** One short settle on the page that changed. Retriggered by hand. */
  let bodyEl: HTMLElement | undefined = $state();
  function turn() {
    const el = bodyEl;
    if (!el) return;
    el.classList.remove("turn");
    void el.offsetWidth;
    el.classList.add("turn");
    el.scrollTop = 0;
  }

  const title = $derived(reviewing ? "Your character" : (step?.label ?? ""));
  const hint = $derived(
    reviewing
      ? "Everything you have taken, in full. Nothing here is final — come back and change any of it."
      : (step?.hint ?? ""),
  );
</script>

<div class="forge" bind:this={winEl}>
  <!-- ══ the rail ══ -->
  <div class="fside">
    <div class="fsteps">
      {#each steps as s (s.id)}
        <button
          type="button"
          class="fstep"
          class:done={s.done}
          class:on={!reviewing && at === s.id}
          disabled={!!s.blocked}
          title={s.blocked ?? s.detail}
          onclick={() => go(s.id)}
        >
          <i>
            {#if s.done}
              <svg viewBox="0 0 20 20" aria-hidden="true"
                ><path d="M4 10.5 8 15 16 5.5" fill="none" stroke="currentColor" stroke-width="2.4"
                  stroke-linecap="round" stroke-linejoin="round" /></svg
              >
            {:else}{s.printed}{/if}
          </i>
          <span>{s.label}</span>
          {#if s.blocked}<em>{s.blocked}</em>{/if}
        </button>
      {/each}
      <button
        type="button"
        class="fstep"
        class:on={reviewing}
        class:done={finished}
        onclick={() => {
          reviewing = true;
          turn();
        }}
      >
        <i>·</i>
        <span>Review</span>
      </button>
    </div>

    <div class="fvals" bind:this={valsEl}>
      {@html VALS(rows)}
      {#if domainDots.length}
        <div class="fdm">
          {#each domainDots as d (d.name)}<i style="--c:{d.c}">{d.name}</i>{/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- ══ the stage ══ -->
  <div class="fstage">
    <div class="fhead">
      <h2>{title}</h2>
      <p>
        {hint}
        {#if !reviewing && at === "domains"}
          <em class:ok={heldCards.length === STARTING_DOMAIN_CARDS}
            >{heldCards.length} of {STARTING_DOMAIN_CARDS} chosen</em
          >
        {:else if !reviewing && at === "traits"}
          <em class:ok={Object.keys(placed).length === 6}
            >{Object.keys(placed).length} of 6 placed</em
          >
        {/if}
      </p>
    </div>

    <div class="fbody turn" bind:this={bodyEl}>
      {#if loading}
        <p style="color:var(--ink-3);font:400 12px/1.5 var(--f-ui)">Reading the compendiums…</p>

        <!-- ══════ REVIEW ══════ -->
      {:else if reviewing}
        <div class="frev">
          {#if outstanding.length}
            <section>
              <h3>Still outstanding</h3>
              <p class="fmiss">
                {#each outstanding as o, i (o.id)}<b>{o.label}</b>{i < outstanding.length - 1
                    ? ", "
                    : ""}{/each}. You can finish anyway — a step you meant to skip is a decision,
                not a gap.
              </p>
            </section>
          {/if}
          <section>
            <h3>The character</h3>
            <div class="fgrid wide">
              {#each steps as s (s.id)}
                <button type="button" class="fopt" onclick={() => go(s.id)}>
                  <s>{s.label}</s>
                  <b>{s.detail}</b>
                </button>
              {/each}
            </div>
          </section>
          {#if acquired.length}
            <section>
              <h3>Everything it gave you</h3>
              <div class="fdet">
                {#each acquired as r (r.from + r.name)}
                  <div class="frule">
                    <b>{r.name}</b>
                    <p>{@html rich(r.text)}</p>
                  </div>
                {/each}
              </div>
            </section>
          {/if}
        </div>

        <!-- ══════ CLASS ══════
             One row per class, full width, the mark on the left and everything
             written on the right. See `.fcls` in `design/make.css` for why a
             class is a page rather than a tile. -->
      {:else if at === "class"}
        <div class="fclass">
          {#each classes as c (c.id)}
            {@const ck = classKey(c.name)}
            {@const primary = c.system?.domains?.primary}
            {@const secondary = c.system?.domains?.secondary}
            {@const dom = domainDef(primary)}
            {@const dom2 = domainDef(secondary)}
            {@const chosen = chosenClass?.name === c.name}
            {@const subs = chosen ? subclassesFor(c) : []}
            <!-- `--c`/`--c2` sit on the panel, not on the mark plate: the rule
                 plates tint and bar themselves with the primary hue, and a
                 `color-mix` against an unset custom property takes the whole
                 declaration down with it. See `.fcls` in `design/make.css`. -->
            <div
              class="fcls"
              class:on={chosen}
              class:just={justId === c.id}
              style="--c:{dom.light};--c2:{dom2.light}"
            >
              <button type="button" class="fclsr" onclick={() => pickClass(c)}>
                <span class="fsig">
                  {#if ck && sigils[ck]}{@html sigils[ck]}{/if}
                </span>
                <span class="fmain">
                  <span class="fidentity">
                    <b>{c.name}</b>
                    <span class="fdoms">
                      {#each [primary, secondary].filter(Boolean) as d (d)}
                        {@const def = domainDef(d)}
                        <span class="fdom" style="--c:{def.light}">
                          <i>{@html sigils[d] ?? ""}</i><s>{def.label}</s>
                        </span>
                      {/each}
                    </span>
                    <span class="fnum">
                      <i>Evasion <b>{c.system?.startingEvasion ?? 10}</b></i>
                      <i>Hit Points <b>{c.system?.startingHitPoints ?? 6}</b></i>
                    </span>
                  </span>
                  <span class="fabilities">
                    {#each c.system?.classFeatures ?? [] as f (f.name)}
                      <span class="fability">
                        <b>{f.name}</b><span>{@html rich(plain(f.description))}</span>
                      </span>
                    {/each}
                    {#if c.system?.hopeFeature?.name}
                      <span class="fability hope">
                        <b><i>Hope</i>{c.system.hopeFeature.name}</b>
                        <span>{@html rich(plain(c.system.hopeFeature.description))}</span>
                      </span>
                    {/if}
                  </span>
                </span>
              </button>

              <!-- The drawer. The printed foundation card, because that is what
                   a subclass is: three cards acquired one at a time, and which
                   of the three you are holding is a fact the card states. No
                   `data-pk` — nothing in this window hovers a card any more,
                   and here it would have been the same picture twice. -->
              {#if subs.length}
                <div class="fsub">
                  <s
                    >Subclass{#if chosenSub}
                      · <em>{chosenSub.system.subclassName}</em>
                    {/if}</s
                  >
                  <div class="fcards">
                    {#each subs as s (s.id)}
                      {@const card = cardFor(s)}
                      <button
                        type="button"
                        class="fcrd"
                        class:on={chosenSub?.system?.subclassName === s.system?.subclassName}
                        class:just={justId === s.id}
                        class:noart={card?.noart}
                        style={card?.art}
                        onclick={() => pickSubclass(s)}
                      >
                        {#if card}{@html CARD(card)}{/if}
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <!-- ══════ ANCESTRY ══════
             Its own stage rather than the top half of a heritage one. The
             mixed switch governs this grid and nothing else, and eighteen
             cards is a screenful on its own. -->
      {:else if at === "ancestry"}
        <div style="display:flex;align-items:center;gap:12px;margin:0 0 12px">
          <label
            style="display:inline-flex;align-items:center;gap:7px;cursor:pointer;margin-left:auto;
                   font:700 7.5px/1 var(--f-mono);letter-spacing:.14em;text-transform:uppercase;
                   color:{mixing ? 'var(--hope-tx)' : 'var(--ink-4)'}"
          >
            <input
              type="checkbox"
              bind:checked={mixing}
              onchange={() => (mixTop = null)}
            />
            mixed ancestry
          </label>
        </div>
        {#if mixing}
          <p style="margin:0 0 12px;font:400 11.5px/1.5 var(--f-ui);color:var(--ink-2)">
            {#if mixTop}
              <b style="color:var(--hope-tx)">{mixTop.name}</b> gives the top feature. Now choose whose
              <b>bottom</b> feature you take.
            {:else}
              Choose whose <b>top</b> feature you take first. The position is the rule — a goblin-orc
              can be Surefooted or Sturdy, never both.
            {/if}
          </p>
        {/if}
        <div class="fcards">
          {#each ancestries as a (a.id)}
            {@const card = cardFor(a)}
            <button
              type="button"
              class="fcrd"
              class:on={mixing ? mixTop?.id === a.id : chosenAncestry?.name?.startsWith(a.name)}
              class:just={justId === a.id}
              class:noart={card?.noart}
              style={card?.art}
              onclick={() => pickAncestry(a)}
            >
              {#if card}{@html CARD(card)}{/if}
              {#if mixing}<div class="fwhy">{mixTop ? "bottom feature" : "top feature"}</div>{/if}
            </button>
          {/each}
        </div>

        {#if chosenAncestry}
          <div class="fdet">
            <s>{chosenAncestry.name}</s>
            {#each [chosenAncestry.system?.topFeature, chosenAncestry.system?.bottomFeature].filter(Boolean) as f, i (i)}
              <div class="frule"><b>{f.name}</b><p>{@html rich(plain(f.description))}</p></div>
            {/each}
          </div>
        {/if}

        <!-- ══════ COMMUNITY ══════ -->
      {:else if at === "community"}
        <div class="fcards">
          {#each communities as c (c.id)}
            {@const card = cardFor(c)}
            <button
              type="button"
              class="fcrd"
              class:on={chosenCommunity?.name === c.name}
              class:just={justId === c.id}
              class:noart={card?.noart}
              style={card?.art}
              onclick={async () => {
                await takeCommunity(doc, c);
                flash(c.id);
              }}
            >
              {#if card}{@html CARD(card)}{/if}
            </button>
          {/each}
        </div>

        {#if chosenCommunity}
          <div class="fdet">
            <s>{chosenCommunity.name}</s>
            {#if chosenCommunity.system?.feature}
              {@const f = chosenCommunity.system.feature}
              <div class="frule"><b>{f.name}</b><p>{@html rich(plain(f.description))}</p></div>
            {/if}
          </div>
        {/if}

        <!-- ══════ TRAITS ══════ -->
      {:else if at === "traits"}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="ftray"
          class:over={over === "tray"}
          ondragover={(e) => allow(e, "tray")}
          ondragleave={() => over === "tray" && (over = null)}
          ondrop={dropOnTray}
        >
          <s>spread</s>
          {#each chips as c (c.i)}
            <button
              type="button"
              class="fchip"
              class:spent={c.spent}
              class:armed={c.armed}
              class:lift={dragChip === c.i}
              disabled={c.spent}
              draggable={!c.spent}
              ondragstart={(e) => startDrag(e, c.i)}
              ondragend={endDrag}
              onclick={() => armChip(c.i)}>{sign(c.v)}</button
            >
          {/each}
        </div>
        <div class="ftraits">
          {#each TRAITS as t (t)}
            {@const v = traitValue(t)}
            <button
              type="button"
              class="ftrt"
              class:empty={v === null}
              class:open={armed !== null && placed[t] === undefined}
              class:over={over === t}
              draggable={v !== null}
              ondragstart={(e) => placed[t] !== undefined && startDrag(e, placed[t])}
              ondragend={endDrag}
              ondragover={(e) => allow(e, t)}
              ondragleave={() => over === t && (over = null)}
              ondrop={(e) => dropOnTrait(e, t)}
              onclick={() => dropChip(t)}
            >
              <b>{v === null ? "—" : sign(v)}</b>
              <span>
                <k>{TRAIT_LABELS[t]}</k>
                <em>{(TRAIT_VERBS[t] ?? []).join(", ")}</em>
              </span>
            </button>
          {/each}
        </div>

        <!-- ══════ EQUIPMENT ══════ -->
      {:else if at === "equipment"}
        <div style="display:flex;gap:7px;margin:0 0 14px;flex-wrap:wrap">
          {#each [["primary", heldPrimary?.name], ["secondary", heldSecondary?.name], ["armor", heldArmor?.name], ["pack", hasKit ? "packed" : null]] as [key, held] (key)}
            <button
              type="button"
              class="fchip"
              class:armed={gear === key}
              style="width:auto;padding:0 12px;font:700 8px/1 var(--f-mono);letter-spacing:.14em;
                     text-transform:uppercase"
              onclick={() => (gear = key as any)}
            >
              {key}{held ? " ✓" : ""}
            </button>
          {/each}
        </div>

        {#if gear === "pack"}
          <div class="fdet" style="margin-top:0">
            <s>everyone gets these</s>
            {#each STARTING_KIT as k (k.name)}
              <div class="frule"><b>{k.name}</b><p>{k.description}</p></div>
            {/each}
            {#if !hasKit}
              <button
                type="button"
                class="fchip"
                style="width:auto;padding:0 14px;font:700 8px/1 var(--f-mono);letter-spacing:.14em;
                       text-transform:uppercase;margin-top:4px"
                onclick={grantKit}>take the pack</button
              >
            {/if}
          </div>

          <h3
            style="margin:18px 0 9px;font:700 8.5px/1 var(--f-mono);letter-spacing:.2em;
                   text-transform:uppercase;color:var(--ink-4)"
          >
            One potion
          </h3>
          <div class="fgrid">
            {#each potions as p (p.id)}
              <button
                type="button"
                class="fopt"
                class:on={heldConsumables.includes(p.name)}
                class:just={justId === p.id}
                onclick={() => pickPotion(p)}
              >
                <s>Consumable</s>
                <b>{p.name}</b>
                <p>{plain(p.system?.description)}</p>
              </button>
            {/each}
          </div>

          {#if classChoice.length === 2}
            <h3
              style="margin:18px 0 9px;font:700 8.5px/1 var(--f-mono);letter-spacing:.2em;
                     text-transform:uppercase;color:var(--ink-4)"
            >
              {chosenClass?.name} · one of these
            </h3>
            <div class="fgrid">
              {#each classChoice as c (c)}
                <button
                  type="button"
                  class="fopt"
                  class:on={heldLoot.includes(c)}
                  onclick={() => pickClassItem(c)}
                >
                  <s>Starting item</s>
                  <b>{c}</b>
                </button>
              {/each}
            </div>
          {/if}
        {:else}
          {@const held =
            gear === "primary" ? heldPrimary : gear === "secondary" ? heldSecondary : heldArmor}
          {#if gear === "secondary" && twoHanded}
            <p style="margin:0 0 12px;font:400 11.5px/1.5 var(--f-ui);color:var(--ink-2)">
              Your primary weapon is two-handed, so there is no hand left for a secondary. Choosing
              one here will put the two-handed weapon away.
            </p>
          {/if}

          <!-- The table. Chapter 2's own shape, and the one step where it is
               right: what you compare across thirty-five weapons is five
               columns of the same five facts, and a column is read down.

               No `data-pk`, so no hover card — the table states what the tile
               made you hover to find out, and a picture over the row you are
               reading interrupts the comparison it exists to let you make. See
               the equipment table block in `design/make.css`. -->
          <div class="ftbl" class:farm={gear === "armor"}>
            <div class="fthd">
              <s>Name</s>
              {#if gear === "armor"}
                <s>Thresholds</s>
                <s>Score</s>
              {:else}
                <s>Trait</s>
                <s>Range</s>
                <s>Damage</s>
                <s>Burden</s>
              {/if}
              <s>Feature</s>
            </div>
            {#each gearGroups as g (g.key)}
              {#if g.label}<div class="fgrp">{g.label}</div>{/if}
              {#each g.rows as w (w.id)}
                {@const why = loose
                  ? undefined
                  : gear === "armor"
                    ? armorRefusal(doc, w)
                    : weaponRefusal(doc, w, { secondary: gear === "secondary" })}
                <button
                  type="button"
                  class="ftr"
                  class:on={held?.name === w.name}
                  class:just={justId === w.id}
                  disabled={!!why}
                  onclick={() =>
                    gear === "armor" ? pickArmor(w) : pickWeapon(w, gear as "primary" | "secondary")}
                >
                  <b>{w.name}</b>
                  {#if gear === "armor"}
                    <u>{w.system?.baseThresholds?.major}/{w.system?.baseThresholds?.severe}</u>
                    <u>{w.system?.baseScore ?? 0}</u>
                  {:else}
                    <i>{TRAIT_LABELS[w.system?.trait] ?? "—"}</i>
                    <i>{RANGE_LABELS[w.system?.range] ?? "—"}</i>
                    <u
                      >{w.system?.damage?.dice}{w.system?.damage?.bonus
                        ? `+${w.system.damage.bonus}`
                        : ""}</u
                    >
                    <i>{BURDEN_LABELS[w.system?.burden] ?? "—"}</i>
                  {/if}
                  <p class:none={!w.system?.feature?.name && !why}>
                    {#if w.system?.feature?.name}<b>{w.system.feature.name}:</b>
                      {plain(w.system.feature.description)}{:else}—{/if}
                    {#if why}<span class="fwhy">{why}</span>{/if}
                  </p>
                </button>
              {/each}
            {/each}
          </div>
        {/if}

        <!-- ══════ EXPERIENCES ══════ -->
      {:else if at === "experiences"}
        <div style="display:flex;flex-direction:column;gap:10px;max-width:520px">
          {#each [0, 1] as i (i)}
            <label style="display:flex;align-items:center;gap:11px">
              <b
                style="flex:none;width:36px;text-align:center;font:700 19px/1 var(--f-display);
                       letter-spacing:-.03em;color:var(--hope-tx)">+2</b
              >
              <input
                type="text"
                bind:value={xpNames[i]}
                onchange={saveExperiences}
                placeholder={i === 0 ? "Sapphire Syndicate Assassin" : "Never Again"}
                style="flex:1 1 auto;min-width:0;height:32px;padding:0 11px;border:0;
                       background:var(--sunk);box-shadow:inset 0 0 0 1px var(--line);
                       font:400 12.5px/1 var(--f-ui);color:var(--ink)"
              />
            </label>
          {/each}
        </div>
        <div class="fdet">
          <s>what makes a good one</s>
          <div class="frule">
            <p>
              Specific beats broad. <b>Talented</b> and <b>Focused</b> apply to almost anything and
              so are worth nothing; <b>Swashbuckler</b> and <b>Magic Studies</b> are choices. Flavour
              them and they get more use, not less — <b>Assassin of the Sapphire Syndicate</b> hands
              your GM a faction and hands you a reason to be good at talking to them. An Experience
              can't grant a spell or a game ability.
            </p>
          </div>
          <div class="frule">
            <b>Spending them</b>
            <p>
              Before an action or reaction roll, <b>spend a Hope</b> to add an Experience's modifier.
              More than one can apply, at a Hope each.
            </p>
          </div>
        </div>

        <!-- ══════ DOMAIN CARDS ══════ -->
      {:else if at === "domains"}
        <div class="fcards">
          {#each legalDeck as c (c.id)}
            {@const mine = heldCards.some((h: any) => h.name === c.name)}
            {@const why = loose ? undefined : cardRefusal(doc, c, myDomains)}
            {@const full = !mine && !why && heldCards.length >= STARTING_DOMAIN_CARDS && !loose}
            {@const card = cardFor(c)}
            <button
              type="button"
              class="fcrd"
              class:on={mine}
              class:just={justId === c.id}
              class:noart={card?.noart}
              style={card?.art}
              disabled={!!why || full}
              onclick={() => toggleCard(c)}
            >
              {#if card}{@html CARD(card)}{/if}
              {#if why}<div class="fwhy">{why}</div>
              {:else if full}<div class="fwhy">two already chosen</div>{/if}
            </button>
          {/each}
          {#if !legalDeck.length}
            <p style="color:var(--ink-3);font:400 12px/1.5 var(--f-ui)">
              Choose a class first — it is your class's two domains that decide which cards you may
              take.
            </p>
          {/if}
        </div>
      {/if}
    </div>

    <div class="fbot">
      <s>{doneCount} of {steps.length} done{finished ? " · finished" : ""}</s>
      {#if isGM}
        <label class:on={loose} title="Lift every rule constraint. GM only.">
          <input type="checkbox" bind:checked={loose} /> unrestricted
        </label>
      {/if}
      <button type="button" onclick={back} disabled={index <= 0 && !reviewing}>back</button>
      {#if reviewing}
        <button type="button" class="go" onclick={finish}>
          {finished ? "post again" : "finish"}
        </button>
      {:else}
        <button type="button" class="go" onclick={next}>next</button>
      {/if}
    </div>
  </div>

  <!-- No peek layer. Nothing in this window hovers a card — see the NO PEEK
       block at the head of the script. -->
</div>
