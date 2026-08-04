<!--
  The compendium browser.

  Kinds on the rail, that kind's own filters under them, and the results in
  whichever shape the kind's claim about itself calls for — see the head of
  `design/browse.css` for the argument, and `browse-index.ts` for what an axis
  is and why every one of them is a closed set.

  Nothing here writes. It is the one window in this system that only reads:
  a click opens the document's own sheet, a drag hands Foundry the uuid, and
  everything else is narrowing. That is why there is no `SheetState` and no
  document — the browser is about a collection, not about a document, and
  there is nothing on screen that any actor owns.
-->
<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any */
  import { onMount } from "svelte";
  import {
    BURDEN_LABELS,
    DAMAGE_TYPE_SHORT,
    FEATURE_KIND_LABELS,
    RANGE_LABELS,
    TRAIT_LABELS,
  } from "../config.ts";
  import { cardOf, loadSigils, plain, type Sigils } from "../sheets/cards.ts";
  import { CARD, fit } from "../ui/card.js";
  import {
    axesFor,
    countsFor,
    KINDS,
    kindOf,
    loadType,
    matches,
    passes,
    pending,
    sortsFor,
    survey,
    terms,
    type Axis,
    type Entry,
    type Filters,
    type Survey,
  } from "./browse-index.ts";

  interface Props {
    app: any;
  }
  let { app }: Props = $props();

  /* ══════════════════════════════════════════════════════════════════
     STATE

     All of it local and none of it stored. A browser is a place you go, and
     what you were looking at last week is not a fact about this world — it
     is a fact about a search you have already finished. The window keeps its
     state while it is open, which is exactly as long as it is a question.
     ══════════════════════════════════════════════════════════════════ */

  /* `$state.raw` on all three, and it is a performance rule rather than a
     preference. Plain `$state` deep-proxies every plain object and array it
     is handed and creates a signal per property on first read — which over a
     thousand entries, each read a dozen times per keystroke by `countsFor`
     and the sort, is tens of thousands of signals doing nothing but stand
     between a loop and a field. Nothing here is ever mutated in place: an
     entry is written once at load and a filter set is rebuilt on every press,
     so reassignment is the whole of the reactivity we need and the proxy was
     buying us none of it.

     It also keeps Foundry's own objects out of the graph. Svelte declines to
     proxy a class instance, so a Document and a DataModel were already safe —
     but an `Entry` is a plain object holding both, and the wrapper around it
     is a thing every reader would have had to reach through. */
  /* What the packs hold, off Foundry's own index — the rail's numbers, and
     which packs a kind is in. Read on open and never again: a pack's contents
     are a fact about the installation, and this window is not open long
     enough for one to be installed underneath it. */
  let sur = $state.raw<Survey>({ counts: {}, packs: {} });

  /* Documents, one subtype at a time and kept once read. See the survey block
     in `browse-index.ts` for why they are not all read on open. */
  let byKind = $state.raw<Record<string, Entry[]>>({});
  let sigils = $state.raw<Sigils>({});
  let loading = $state(true);
  let toRead = $state(0);

  let kind = $state<string>("domainCard");
  let query = $state("");
  let filters = $state.raw<Filters>({});
  let sortId = $state("pack");

  let body: HTMLElement | undefined = $state();
  let findEl: HTMLInputElement | undefined = $state();

  /**
   * Make sure this subtype's documents are in hand.
   *
   * Guarded on what is already loaded rather than on a flag, so going back to
   * a kind you have already looked at costs nothing and shows no wait — the
   * pack cache underneath it is per pack, so the second kind out of the
   * equipment pack is free too.
   */
  async function ensure(type: string): Promise<void> {
    if (byKind[type]) return;
    toRead = pending(type, sur);
    loading = true;
    const list = await loadType(type, sur);
    byKind = { ...byKind, [type]: list };
    loading = false;
  }

  onMount(() => {
    void (async () => {
      sur = await survey();
      void loadSigils().then((sig) => (sigils = sig));
      await ensure(meta.type);
      /* The commonest thing anybody does here is type. Focusing the field on
         open is the difference between a window you search and a window you
         click into and then search. */
      findEl?.focus();
    })();

    /* Once, and not per pass: a card solved against a fallback face is
       solved against the wrong metrics, and `fonts.ready` is the only
       moment anybody can say the real ones have arrived. */
    if (document.fonts?.status === "loading") void document.fonts.ready.then(refitCards);
  });

  /* ══════════════════════════════════════════════════════════════════
     NARROWING

     Three stages, and the order is the cost: the kind is a field test, the
     search is a substring over a string built once at load, and the axes are
     last because `countsFor` walks the kind's pool once per axis and wants
     the smallest pool it can get.
     ══════════════════════════════════════════════════════════════════ */

  const meta = $derived(kindOf(kind));
  const axes = $derived(axesFor(kind));
  const sorts = $derived(sortsFor(kind));

  /** How many of each kind exist at all — the rail's numbers, off the index.
      They are right before a single document has been read, which is what
      lets the rail be a rail rather than a loading state. */
  const kindCounts = $derived(sur.counts);

  const ts = $derived(terms(query));

  /** This kind, and the search. What the axes and their counts run over. */
  const pool = $derived(
    (byKind[meta.type] ?? []).filter((e) => !ts.length || matches(e, ts)),
  );

  const counts = $derived(countsFor(pool, axes, filters));

  const shown = $derived.by(() => {
    const cmp = (sorts.find((s) => s.id === sortId) ?? sorts[0]!).cmp;
    return pool.filter((e) => passes(e, axes, filters)).sort(cmp);
  });

  /* ── how many of them are drawn ──────────────────────────────────
     See `.bmore` in `browse.css` for why a card grid is paged and a table
     is not. The page resets whenever the *question* changes — a new kind, a
     new word, a chip, a different order — because a hundred and forty-four
     cards deep into one search is not a place you meant to still be in the
     next one. It does not reset when the page grows, which is the whole
     point of it being separate state. */
  const PAGE = 48;
  let drawn = $state(PAGE);

  $effect(() => {
    void kind;
    void ts;
    void filters;
    void sortId;
    drawn = PAGE;
  });

  const capped = $derived(meta.shape === "cards" ? shown.slice(0, drawn) : shown);
  const more = $derived(shown.length - capped.length);

  /** Everything of this kind, before the search and the filters. */
  const total = $derived(kindCounts[meta.type] ?? 0);

  const active = $derived(
    Object.values(filters).reduce((n, set) => n + (set?.size ?? 0), 0),
  );

  /**
   * Whether the pack is worth naming on a result.
   *
   * A world with one domain pack has an answer nobody asked for; a world with
   * three has the only question that matters, because two cards with the same
   * name and different text are told apart by nothing else.
   */
  const manyPacks = $derived(new Set(pool.map((e) => e.pack)).size > 1);

  /* Changing kind drops the filters, and that is the honest thing rather than
     a convenience: an axis belongs to a kind, so a `tier` carried from weapons
     to adversaries would be a filter the new rail does not draw and cannot be
     taken off. The search survives, because a word is a word. */
  function goKind(id: string): void {
    if (id === kind) return;
    kind = id;
    filters = {};
    sortId = "pack";
    if (body) body.scrollTop = 0;
    void ensure(kindOf(id).type);
  }

  function toggle(axis: Axis, v: string): void {
    const set = new Set(filters[axis.id] ?? []);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    filters = { ...filters, [axis.id]: set };
    if (body) body.scrollTop = 0;
  }

  const clear = (): void => {
    filters = {};
  };

  /* ══════════════════════════════════════════════════════════════════
     THE CARD GRID

     `fit()` measures *wrapped prose*: it writes a type scale, reads
     `scrollHeight`, and steps until the panel stops overflowing. Every step
     is a forced synchronous layout, and it resets each card to its opening
     scale before it starts — so `fit(body)` is not a cheap idempotent pass
     over the grid, it is the whole solve, redone.

     Run that way over a grid it costs the window twice. Once at the size:
     the first draft handed it all 189 domain cards, which is 189 container
     roots and several hundred reflows on a document that holds all of them,
     and Foundry stopped answering. And once at the *frequency*: the effect
     is keyed on what is drawn, and what is drawn changes on every keystroke
     in the search field — so every letter re-solved every card on screen,
     including the ones the letter did not touch.

     Both halves are the same fix. A card that has been fitted wears
     `data-fit` and is not fitted again, so a keystroke pays only for the
     cards that arrived with it; and the ones that did arrive are fitted a
     few per frame, so the cost is spread across paints instead of landing
     on one. The `{#each}` is keyed on the uuid, which is what makes the
     attribute survive a filter change — a card that stayed on screen kept
     its element and therefore its solve.

     Two things invalidate a solve and both clear the marks. Fonts, because
     metrics measured against a fallback face are wrong by enough to cost a
     line — the vendored `fit()` says so at the top. And width, because
     `auto-fill` changes the column count as the window resizes and a card
     solved at 250px is not solved at 196. Nothing else does: the grid's
     height is free to change, and does, every time this runs.
     ══════════════════════════════════════════════════════════════════ */

  const asSnapshot = (e: Entry) => ({
    id: e.id,
    uuid: e.uuid,
    name: e.name,
    type: e.type,
    img: e.img,
    sort: e.sort,
    system: e.system,
  });

  const cardFor = (e: Entry) => cardOf(asSnapshot(e), sigils);

  /** Cards solved per frame. Six is about a frame's worth at this size. */
  const CHUNK = 6;

  /** Supersedes any pass still walking, so a filter change abandons the old
      one rather than racing it. */
  let pass = 0;

  function fitCards(): void {
    if (!body || meta.shape !== "cards") return;
    const mine = ++pass;
    const todo = [...body.querySelectorAll<HTMLElement>(".bcrd:not([data-fit])")];
    if (!todo.length) return;

    let i = 0;
    const step = (): void => {
      if (mine !== pass || !body) return;
      for (const end = Math.min(i + CHUNK, todo.length); i < end; i++) {
        const el = todo[i]!;
        /* The `.card` is the button's only child, so the button is a legal
           scope for a one-card solve — `fit` wants something to
           `querySelectorAll` and nothing else. */
        fit(el);
        el.dataset.fit = "1";
      }
      if (i < todo.length) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Every solve on screen is stale. Throw them all away and start again. */
  function refitCards(): void {
    if (!body) return;
    for (const el of body.querySelectorAll<HTMLElement>(".bcrd[data-fit]")) {
      delete el.dataset.fit;
    }
    fitCards();
  }

  $effect(() => {
    void capped;
    void sigils;
    fitCards();
  });

  /* Width, and only width. `fit` writes an `aspect-ratio`, so the grid's
     height moves every time this runs — observing that would be a loop. */
  $effect(() => {
    if (!body) return;
    let was = body.clientWidth;
    const ro = new ResizeObserver(() => {
      if (!body || body.clientWidth === was) return;
      was = body.clientWidth;
      refitCards();
    });
    ro.observe(body);
    return () => ro.disconnect();
  });

  /* ── growing the page ────────────────────────────────────────────
     The control is its own sentinel. Scrolling to it and pressing it are
     the same act, which is `swap.js`'s rule about a surface that is both
     dragged and pressed — one call, one result, nothing to learn twice.
     600px of margin means it has usually already grown by the time you
     reach it, so the press is the fallback rather than the gesture. */
  let sentinel: HTMLElement | undefined = $state();

  $effect(() => {
    if (!sentinel || !body) return;
    const io = new IntersectionObserver(
      (rows) => {
        if (rows.some((r) => r.isIntersecting)) drawn += PAGE;
      },
      { root: body, rootMargin: "600px" },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  });

  /* ══════════════════════════════════════════════════════════════════
     TAKING SOMETHING OUT

     Two gestures and neither of them writes here. A click opens the
     document's own sheet, which this system already has one of for every
     subtype and which draws every field across three tabs — a second detail
     view in this window would be a second thing to keep true. A drag hands
     Foundry the payload `onDragStart` writes on the character sheet, so a
     card dragged out of here lands through `handleActorDrop` exactly as one
     dragged off the compendium sidebar does, transformation limit and loadout
     placement included.
     ══════════════════════════════════════════════════════════════════ */

  const open = (e: Entry): void => {
    e.doc.sheet?.render(true);
  };

  let lifted = $state<string | null>(null);

  function startDrag(ev: DragEvent, e: Entry): void {
    ev.dataTransfer?.setData(
      "text/plain",
      JSON.stringify({ type: e.docName, uuid: e.uuid }),
    );
    /* `effectAllowed` is deliberately left alone. Foundry sets it nowhere and
       reads `dropEffect` nowhere, and pinning it to `copy` would mean any drop
       target that ever did set `dropEffect` to something else silently refused
       the drag — a failure with no symptom but a card that will not land.
       One tick late, and a macrotask rather than a frame. The browser
       snapshots the drag image at the end of the `dragstart` dispatch, so
       dimming the element synchronously means dragging a picture of something
       already dimmed; and `requestAnimationFrame` does not fire in a tab that
       is not painting, which is exactly the tab somebody drags *out of*. */
    const id = e.uuid;
    setTimeout(() => (lifted = id), 0);
  }

  const endDrag = (): void => {
    lifted = null;
  };

  /* ══════════════════════════════════════════════════════════════════
     WHAT A TABLE ROW SAYS

     One reader per column rather than one template per kind, because the
     columns repeat across kinds — tier is tier on a weapon, on a piece of
     armour and on an adversary — and three copies of the same cell is three
     places for it to drift.
     ══════════════════════════════════════════════════════════════════ */

  const dmg = (d: any): string =>
    d ? `${d.count ?? 1}${d.dice ?? "d6"}${d.bonus ? `+${d.bonus}` : ""} ${
        DAMAGE_TYPE_SHORT[d.type] ?? ""
      }`.trim() : "—";

  /** A feature block, printed as its name and its rule. */
  const featureText = (f: any): string =>
    f?.name ? `**${f.name}:** ${plain(f.description ?? "")}` : plain(f?.description ?? "");

  /** The first sentence of something long, for a cell that holds one line. */
  const brief = (s: string): string => {
    const t = plain(s ?? "").trim();
    return t.length > 190 ? `${t.slice(0, 189).replace(/\s+\S*$/, "")}…` : t;
  };

  /** `**bold**` only — the cell is one line and a `<br>` in it is a row that
      grew. `rich()` would also mark game terms, which is right on a card and
      noise in a column that is already labelled Damage. */
  const strong = (s: string): string =>
    foundry.utils
      .escapeHTML(s)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

  const thresholds = (s: any): string => {
    if (s?.thresholds?.none) return "None";
    const severe = s?.thresholds?.severeNone ? "None" : (s?.thresholds?.severe ?? 0);
    return `${s?.thresholds?.major ?? 0}/${severe}`;
  };
</script>

<div class="brw">
  <!-- ══ the rail ══ -->
  <div class="bside">
    <s>Kind</s>
    <div class="bkinds">
      {#each KINDS as k (k.id)}
        <button
          type="button"
          class="bkind"
          class:on={kind === k.id}
          disabled={!kindCounts[k.type]}
          onclick={() => goKind(k.id)}
        >
          <span>{k.label}</span>
          <u>{kindCounts[k.type] ?? 0}</u>
        </button>
      {/each}
    </div>

    <div class="bfilts">
      {#each axes as axis (axis.id)}
        <div class="bgrp">
          <s>{axis.label}</s>
          <div class="bchips">
            {#each axis.values as value (value.v)}
              {@const n = counts[axis.id]?.[value.v] ?? 0}
              {@const on = !!filters[axis.id]?.has(value.v)}
              <button
                type="button"
                class="bchip"
                class:hue={!!value.hue}
                class:on
                style={value.hue ? `--c:${value.hue}` : undefined}
                disabled={!n && !on}
                onclick={() => toggle(axis, value.v)}
              >
                {value.label}<u>{n}</u>
              </button>
            {/each}
          </div>
        </div>
      {/each}

      {#if active}
        <button type="button" class="bclear" onclick={clear}>
          clear {active} filter{active === 1 ? "" : "s"}
        </button>
      {:else if !axes.length}
        <div class="bgrp">
          <s>Filters</s>
          <p
            style="margin:0;padding:0 16px;font:400 10.5px/1.5 var(--f-ui);color:var(--ink-4)"
          >
            Nothing here is told apart by a number or a closed set — search the
            text instead.
          </p>
        </div>
      {/if}
    </div>
  </div>

  <!-- ══ the stage ══ -->
  <div class="bstage">
    <div class="bhead">
      <div class="bfind">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="5" /><path d="M11 11l4 4" />
        </svg>
        <input
          type="search"
          bind:this={findEl}
          bind:value={query}
          placeholder="Search names and rules text…"
          onkeydown={(e) => {
            if (e.key === "Escape" && query) {
              e.stopPropagation();
              query = "";
            }
          }}
        />
        {#if query}
          <button type="button" class="bx" title="clear" onclick={() => (query = "")}>×</button>
        {/if}
      </div>

      <div class="bcount"><b>{shown.length}</b> of {total}</div>

      <select class="bsort" bind:value={sortId} aria-label="Sort">
        {#each sorts as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
      </select>
    </div>

    <div class="bbody" bind:this={body}>
      {#if loading}
        <div class="bwait">Reading {toRead || ""} documents…</div>
      {:else if !shown.length}
        <div class="bnone">
          {#if query}
            <b>Nothing matches “{query}”</b>
          {:else}
            <b>Nothing here</b>
          {/if}
          <p>
            {#if active && query}
              {active} filter{active === 1 ? " is" : "s are"} also narrowing this list.
            {:else if active}
              {active} filter{active === 1 ? "" : "s"} narrowed it to nothing.
            {:else if !total}
              No mounted pack holds a {meta.label.toLowerCase().replace(/s$/, "")}.
            {:else}
              Try another kind, or search the text.
            {/if}
          </p>
        </div>

        <!-- ══ cards ══ -->
      {:else if meta.shape === "cards"}
        <div class="bcards">
          {#each capped as e (e.uuid)}
            {@const card = cardFor(e)}
            <button
              type="button"
              class="bcrd"
              class:noart={card?.noart}
              class:lift={lifted === e.uuid}
              style={card?.art}
              draggable="true"
              title={e.name}
              onclick={() => open(e)}
              ondragstart={(ev) => startDrag(ev, e)}
              ondragend={endDrag}
            >
              {#if card}{@html CARD(card)}{/if}
              {#if manyPacks}<s class="bsrc">{e.packLabel}</s>{/if}
            </button>
          {/each}
        </div>

        {#if more > 0}
          <button
            type="button"
            class="bmore"
            bind:this={sentinel}
            onclick={() => (drawn += PAGE)}
          >
            show {Math.min(more, PAGE)} more<u>{capped.length} of {shown.length}</u>
          </button>
        {/if}

        <!-- ══ tables ══
             One `{#snippet}` per shape rather than a generic row builder: the
             columns are the kind's own facts and a table that took them as
             data would be a template with a schema, which is a worse thing to
             read than five short tables. -->
      {:else}
        <div class="btbl {meta.shape}">
          {#if meta.shape === "bwpn"}
            <div class="bthd">
              <s>Name</s><s></s><s>Tier</s><s>Trait</s><s>Range</s><s>Damage</s><s>Feature</s>
            </div>
          {:else if meta.shape === "barm"}
            <div class="bthd">
              <s>Name</s><s></s><s>Tier</s><s>Thresholds</s><s>Score</s><s>Feature</s>
            </div>
          {:else if meta.shape === "bcon"}
            <div class="bthd"><s>Name</s><s></s><s>Roll</s><s>Effect</s></div>
          {:else if meta.shape === "bfea"}
            <div class="bthd"><s>Name</s><s></s><s>Kind</s><s>Rule</s></div>
          {:else if meta.shape === "badv"}
            <div class="bthd">
              <s>Name</s><s></s><s>Tier</s><s>Role</s><s>Diff.</s><s>Thresholds</s><s>HP/Str</s><s>Motives</s>
            </div>
          {:else}
            <div class="bthd"><s>Name</s><s></s><s>Tier</s><s>Kind</s><s>Diff.</s><s>Impulses</s></div>
          {/if}

          {#each shown as e (e.uuid)}
            <button
              type="button"
              class="btr"
              class:lift={lifted === e.uuid}
              draggable="true"
              title={e.name}
              onclick={() => open(e)}
              ondragstart={(ev) => startDrag(ev, e)}
              ondragend={endDrag}
            >
              <b>{e.name}{#if manyPacks}<s>{e.packLabel}</s>{/if}</b>
              <span class="bico"><img src={e.img} alt="" /></span>

              {#if meta.shape === "bwpn"}
                <u>{e.system?.tier ?? 1}</u>
                <i>{TRAIT_LABELS[e.system?.trait] ?? "—"}</i>
                <i>{RANGE_LABELS[e.system?.range] ?? "—"}</i>
                <u>{dmg(e.system?.damage)}</u>
                {#if e.system?.feature?.name || e.system?.feature?.description}
                  <p>{@html strong(featureText(e.system.feature))}</p>
                {:else}
                  <p class="none">— {BURDEN_LABELS[e.system?.burden] ?? ""}</p>
                {/if}
              {:else if meta.shape === "barm"}
                <u>{e.system?.tier ?? 1}</u>
                <u>{e.system?.baseThresholds?.major ?? 0}/{e.system?.baseThresholds?.severe ?? 0}</u>
                <u>{e.system?.baseScore ?? 0}</u>
                {#if e.system?.feature?.name || e.system?.feature?.description}
                  <p>{@html strong(featureText(e.system.feature))}</p>
                {:else}
                  <p class="none">—</p>
                {/if}
              {:else if meta.shape === "bcon"}
                <i>{e.system?.source || "—"}</i>
                <p>{brief(e.system?.description)}</p>
              {:else if meta.shape === "bfea"}
                <i>{FEATURE_KIND_LABELS[e.system?.kind] ?? "—"}</i>
                <p>{brief(e.system?.description)}</p>
              {:else if meta.shape === "badv"}
                <u>{e.system?.tier ?? 1}</u>
                <i>{e.system?.role ?? "—"}</i>
                <u>{e.system?.difficulty ?? "—"}</u>
                <u>{thresholds(e.system)}</u>
                <u>{e.system?.resources?.hitPoints?.max ?? 0}/{e.system?.resources?.stress?.max ?? 0}</u>
                <p class:none={!e.system?.motives}>{brief(e.system?.motives) || "—"}</p>
              {:else}
                <u>{e.system?.tier ?? 1}</u>
                <i>{e.system?.kind ?? "—"}</i>
                <u class:none={e.system?.difficultySpecial}
                  >{e.system?.difficultySpecial ? "Special" : (e.system?.difficulty ?? "—")}</u
                >
                <p class:none={!e.system?.impulses}>{brief(e.system?.impulses) || "—"}</p>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
