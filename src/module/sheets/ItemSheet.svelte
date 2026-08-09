<script lang="ts">
  /**
   * One sheet for all eleven Item subtypes.
   *
   * They share more than they differ — a name, an image, a block of rules
   * text, a set of counters — and the parts that differ are a handful of
   * fields each. Eleven sheets would be eleven places for the shared half to
   * drift apart.
   *
   * **It used to show a fraction of what an Item holds, and that fraction was
   * the wrong half.** Four subtypes had no panel at all — an ancestry, a
   * community, a transformation and every one of their features were simply
   * not on screen — and of the seven that did, none reached its feature
   * blocks, its printing credit or its counters. The rules text was
   * `{@html}`, read-only, on the one document type whose whole content *is*
   * rules text. So a GM could drag a card off the compendium and read it, and
   * could not write one: homebrew meant editing JSON or building the document
   * in a macro.
   *
   * Every field in `data/items.ts` is now reachable and writable here. That is
   * the claim this file makes, and `tools/check-item-sheet.mjs` is what keeps
   * it true — it walks each subtype's schema and fails if a field has no
   * control.
   *
   * **Three tabs, because an Item is whole and these are views of it.** That
   * is the distinction the creation window draws between a tab and a step: a
   * step is a stage of something being made and can be *unsatisfied*, a tab is
   * one view of a thing that already exists. An Item is the second. Details is
   * what it is, Rules is what it says, Counters is what it asks you to keep —
   * and every subtype has all three, so no tab is ever a dead strip.
   */

  /* eslint-disable @typescript-eslint/no-explicit-any */

  import {
    BURDEN_LABELS,
    BURDENS,
    CARD_TYPES,
    DAMAGE_DICE,
    DAMAGE_TYPES,
    DOMAINS,
    domainDef,
    FEATURE_KINDS,
    RANGES,
    RANGE_LABELS,
    DIE_FACES,
    DIE_MODES,
    DIE_MODE_LABELS,
    DIE_ON_REFRESH,
    DIE_ON_REFRESH_LABELS,
    RESOURCE_MAX,
    RESOURCE_MAX_LABELS,
    RESOURCE_ON_REFRESH,
    RESOURCE_REFRESH,
    RESOURCE_REFRESH_LABELS,
    RESOURCE_TRAITS,
    TRAITS,
    traitLabel,
    WEAPON_SLOTS,
  } from "../config.ts";
  import { SUBCLASS_RANKS } from "../data/items.ts";
  import { resourceMax } from "../data/resources.ts";
  import { poolCapacity } from "../data/dice-pools.ts";
  import { damageDice } from "../data/damage.ts";
  import type { SheetState } from "../apps/sheet-state.svelte.ts";
  import Prose from "./parts/Prose.svelte";

  interface Props {
    doc: any;
    snap: SheetState;
    app: any;
  }
  let { doc, snap }: Props = $props();

  const sys = $derived(snap.system);
  const ed = $derived(snap.editable);
  const set = (path: string, v: unknown) => ed && doc.update({ [path]: v });

  /** The hue this item is drawn in, or graphite when it belongs to no domain. */
  const accent = $derived(
    snap.type === "domainCard" && sys.domain ? domainDef(sys.domain).light : "#5c636d",
  );

  /** `d8+d6` — every group in the printed expression, in one string. */
  const damageNotation = $derived(damageDice(sys.damage));

  const num = (e: Event) => Number((e.currentTarget as HTMLInputElement).value) || 0;
  const txt = (e: Event) => (e.currentTarget as HTMLInputElement).value;
  const chk = (e: Event) => (e.currentTarget as HTMLInputElement).checked;

  /**
   * A checkbox over a document method that is allowed to say no.
   *
   * Equipping and recalling are not flags this sheet may set — `toggleEquipped`
   * is what knows one armour, one primary, and no off hand while the primary
   * needs both, and `toggleLoadout` is what knows the limit. Both **decline**
   * rather than clamp, which is this system's answer to a refusal everywhere
   * else, and a decline writes nothing at all.
   *
   * Which is exactly the problem. No write is no re-render, so the box the
   * browser already ticked stays ticked while the document says otherwise —
   * the sheet reporting a card into a loadout that refused it. So the state is
   * read back off the document afterwards and the box is set from that. The
   * element is captured before the await because `currentTarget` is only
   * itself during dispatch.
   */
  async function toggleVia(e: Event, call: () => Promise<unknown>, read: () => boolean) {
    const box = e.currentTarget as HTMLInputElement;
    if (ed) await call();
    box.checked = read();
  }

  /* ── tabs ──────────────────────────────────────────────────────────── */

  type Tab = "details" | "rules" | "counters";
  let tab = $state<Tab>("details");

  const typeLabel = $derived(game.i18n?.localize?.(`TYPES.Item.${snap.type}`) || snap.type);

  /**
   * The subtypes that exist as a physical card, and therefore carry a
   * printing credit. Five, not the four `printingField` was written for:
   * transformation is *Hope and Fear*'s third heritage card and is printed
   * exactly as the other two are.
   */
  const PRINTED = ["ancestry", "community", "transformation", "subclass", "domainCard"];
  const printed = $derived(PRINTED.includes(snap.type));

  /* ── writing lists ─────────────────────────────────────────────────────
     Every list on an Item is an ArrayField, and Foundry reads a dotted index
     in an update key as a path into an *object* — so `system.features.0.name`
     writes a shape the reader does not expect. The adjust tab learned this
     about Experiences and `moveResource` learned it about pools; it is the
     same field type and the same trap, so the whole array is written every
     time. These arrays are three or four entries long and it is one update
     either way. */

  /* `getProperty` rather than an index, so a nested list works — a weapon's
     further damage groups are `damage.extra`. It is still the *array* being
     named and never a position inside one, which is the trap above. */
  const rowsOf = (key: string): any[] =>
    foundry.utils.deepClone(foundry.utils.getProperty(sys, key) ?? []);
  const writeRows = (key: string, rows: any[]) => ed && doc.update({ [`system.${key}`]: rows });

  const addRow = (key: string, blank: unknown) => writeRows(key, [...rowsOf(key), blank]);

  const dropRow = (key: string, i: number) => {
    const rows = rowsOf(key);
    rows.splice(i, 1);
    writeRows(key, rows);
  };

  /** Reorder, because these arrays are printed in the order they are held. */
  const moveRow = (key: string, i: number, by: number) => {
    const rows = rowsOf(key);
    const j = i + by;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    writeRows(key, rows);
  };

  /** `field` may be nested — a resource's ceiling is `max.kind`. */
  const editRow = (key: string, i: number, field: string, v: unknown) => {
    const rows = rowsOf(key);
    if (!rows[i]) return;
    foundry.utils.setProperty(rows[i], field, v);
    writeRows(key, rows);
  };

  /** A list of bare strings — a class's questions — has no field to name. */
  const setStr = (key: string, i: number, v: string) => {
    const rows = rowsOf(key);
    rows[i] = v;
    writeRows(key, rows);
  };

  const blankFeature = () => ({ name: "", description: "" });
  const blankResource = () => ({
    name: "Tokens",
    value: 0,
    max: { kind: "fixed", n: 1, trait: "", floor: 0 },
    refresh: "manual",
    onRefresh: "fill",
    feature: "",
    onEmpty: "",
  });
  /* A blank tray is a `bag` of d6s with no ceiling, which is the shape that
     asserts least: the commonest thing to author is a pile you place into,
     and `open` draws no sockets, so a half-filled-in pool looks unfinished
     rather than looking like a card that caps at one. */
  const blankDiePool = () => ({
    name: "Dice",
    mode: "bag",
    faces: 6,
    dice: [],
    max: { kind: "open", n: 1, trait: "", floor: 0 },
    refresh: "manual",
    onRefresh: "clear",
    feature: "",
    grow: "",
    onEmpty: "",
  });

  /* ── the picture ───────────────────────────────────────────────────────
     An Item has exactly one, unlike a character, so there is no second
     target to disambiguate and the header image is the whole control. It had
     no control at all: a homebrew card took the subtype's default glyph
     forever, or you went and found Foundry's own default sheet. */
  async function pickImage() {
    if (!ed) return;
    const picker = new (foundry as any).applications.apps.FilePicker.implementation({
      type: "image",
      current: doc.img,
      callback: (p: string) => doc.update({ img: p }),
    });
    await picker.browse();
  }

  /* ── features ──────────────────────────────────────────────────────────
     Which named blocks this subtype holds, and where each one is written.
     `key` is a path under `system` for the singles and an array name for the
     runs, and the two are drawn by two different snippets because only one
     of them can be added to. */

  interface Single {
    key: string;
    label: string;
    note?: string;
  }

  const SINGLES: Record<string, Single[]> = {
    ancestry: [
      { key: "topFeature", label: "Top feature", note: "kept by a mixed ancestry taking this one first" },
      { key: "bottomFeature", label: "Bottom feature", note: "kept by a mixed ancestry taking this one second" },
    ],
    community: [{ key: "feature", label: "Feature" }],
    class: [{ key: "hopeFeature", label: "Hope feature", note: "the rail prints its price and charges it" }],
    weapon: [{ key: "feature", label: "Feature" }],
    armor: [{ key: "feature", label: "Feature" }],
  };

  const RUNS: Record<string, Single> = {
    class: { key: "classFeatures", label: "Class features", note: "one per printed rule, named for itself" },
    subclass: { key: "features", label: "Features" },
    transformation: { key: "features", label: "Features", note: "the benefit and its cost, in printed order" },
  };

  const singles = $derived(SINGLES[snap.type] ?? []);
  const run = $derived(RUNS[snap.type]);

  /**
   * The lists of bare strings: prompts a card puts to you.
   *
   * Not feature blocks, because they are prose the sheet *offers* rather than
   * a rule the sheet applies — the same kind of thing a transformation's
   * questions are and a class's background questions have always been. The
   * class's two are still drawn nowhere else in the system, deliberately:
   * they belong on the bio tab. That is a reason for the character sheet not
   * to print them and no reason at all for the document not to be editable.
   */
  const QUESTIONS: Record<string, { key: string; label: string; placeholder: string }[]> = {
    class: [
      {
        key: "backgroundQuestions",
        label: "Background questions",
        placeholder: "Something the book asks about your past",
      },
      {
        key: "connectionQuestions",
        label: "Connection questions",
        placeholder: "Something you ask another player at the table",
      },
    ],
    transformation: [
      {
        key: "questions",
        label: "Transformation questions",
        placeholder: "A prompt the card puts to you",
      },
    ],
  };
  const questionLists = $derived(QUESTIONS[snap.type] ?? []);

  /**
   * Every feature name on this document, for a counter to bind itself to.
   *
   * A resource names the rule it belongs to because a document can carry
   * several and only one of them may take tokens — the Hedge's Foundation
   * prints Herbal Remedies and Enchanted Talisman and only the second counts.
   * Offering the names rather than a free text field is what stops a homebrew
   * card failing `tools/check-resources.mjs` for a typo, and blank stays
   * available because blank is the common case and means the document itself.
   */
  const featureNames = $derived.by(() => {
    const out: string[] = [];
    const push = (f: any) => {
      if (f?.name) out.push(f.name);
    };
    for (const s of SINGLES[snap.type] ?? []) push(sys[s.key]);
    for (const f of sys[RUNS[snap.type]?.key ?? ""] ?? []) push(f);
    return [...new Set(out)];
  });

  /* ── counters ──────────────────────────────────────────────────────────
     What the ceiling currently resolves to, so the editor can say what it
     will be worth rather than only where it comes from. On an unowned
     document every trait- and level-sourced ceiling resolves to its floor,
     which is the honest answer: the card in the compendium belongs to nobody.
     `doc.actor` and not the snapshot, because `resourceMax` reads a live
     actor. */
  const resolved = (res: any): number | null => resourceMax(res, doc.actor);
</script>

<div class="win item" style="--w:100%;--accent:{accent}">
  <div class="bd" style="--h:100%">
    <div class="pane">
      <!-- Outside the scroller, because it is what the window is *of*: on a
           660px sheet holding four panels of counters, a name that scrolls
           away is a sheet you can lose your place in. -->
      <div class="it-hd">
        <button
          type="button"
          class="pic"
          title={ed ? "Change the picture" : ""}
          disabled={!ed}
          onclick={pickImage}
        >
          <img src={snap.img} alt="" />
        </button>
        <div class="id">
          <span class="eyebrow">{typeLabel}</span>
          <input
            class="nm"
            value={snap.name}
            disabled={!ed}
            onchange={(e) => set("name", txt(e))}
          />
        </div>
      </div>

      <div class="tabs">
        {#each [["details", "details"], ["rules", "rules"], ["counters", "counters"]] as [key, label]}
          <button type="button" class={tab === key ? "on" : ""} onclick={() => (tab = key as Tab)}>
            {label}
          </button>
        {/each}
        <span class="ct">
          {tab === "counters"
            ? `${(sys.resources ?? []).length + (sys.dice ?? []).length} tracked`
            : snap.type === "domainCard"
              ? `${domainDef(sys.domain).label} · lv ${sys.level}`
              : typeLabel}
        </span>
      </div>

      <div class="scr">
        {#if tab === "details"}
          {#if snap.type === "domainCard"}
            <div class="pnl">
              <div class="k">Card</div>
              <div class="fields">
                <label>
                  <span>Domain</span>
                  <select disabled={!ed} onchange={(e) => set("system.domain", txt(e))}>
                    <option value="" selected={!sys.domain}>—</option>
                    {#each DOMAINS as d}
                      <option value={d} selected={sys.domain === d}>{domainDef(d).label}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Level</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={sys.level}
                    disabled={!ed}
                    onchange={(e) => set("system.level", num(e))}
                  />
                </label>
                <label>
                  <span>Type</span>
                  <select disabled={!ed} onchange={(e) => set("system.cardType", txt(e))}>
                    {#each CARD_TYPES as t}
                      <option value={t} selected={sys.cardType === t}>{t}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Recall cost</span>
                  <input
                    type="number"
                    min="0"
                    value={sys.recallCost}
                    disabled={!ed}
                    onchange={(e) => set("system.recallCost", num(e))}
                  />
                </label>
              </div>
              <!-- Loadout is the one piece of *character* state a card
                   carries, so it is only a question when somebody is holding
                   it. Routed through the document rather than written here:
                   `toggleLoadout` is what knows the limit and refuses at it,
                   and a checkbox that set the flag directly would be the one
                   way into a six-card loadout. -->
              {#if doc.actor}
                <label class="sw">
                  <input
                    type="checkbox"
                    checked={sys.inLoadout}
                    disabled={!ed}
                    onchange={(e) =>
                      toggleVia(e, () => doc.toggleLoadout(), () => !!doc.system.inLoadout)}
                  />
                  <span>In the loadout</span>
                </label>
              {/if}
            </div>
          {:else if snap.type === "weapon"}
            <div class="pnl">
              <div class="k">Weapon</div>
              <div class="fields">
                <label>
                  <span>Tier</span>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={sys.tier}
                    disabled={!ed}
                    onchange={(e) => set("system.tier", num(e))}
                  />
                </label>
                <label>
                  <span>Slot</span>
                  <select disabled={!ed} onchange={(e) => set("system.slot", txt(e))}>
                    {#each WEAPON_SLOTS as s}
                      <option value={s} selected={sys.slot === s}>{s}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Trait</span>
                  <select disabled={!ed} onchange={(e) => set("system.trait", txt(e))}>
                    {#each TRAITS as t}
                      <option value={t} selected={sys.trait === t}>{traitLabel(t)}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Range</span>
                  <select disabled={!ed} onchange={(e) => set("system.range", txt(e))}>
                    {#each RANGES as r}
                      <option value={r} selected={sys.range === r}>{RANGE_LABELS[r]}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Burden</span>
                  <select disabled={!ed} onchange={(e) => set("system.burden", txt(e))}>
                    {#each BURDENS as b}
                      <option value={b} selected={sys.burden === b}>{BURDEN_LABELS[b]}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Damage dice</span>
                  <input
                    type="number"
                    min="0"
                    value={sys.damage?.count}
                    disabled={!ed}
                    onchange={(e) => set("system.damage.count", num(e))}
                  />
                </label>
                <label>
                  <span>Damage die</span>
                  <select disabled={!ed} onchange={(e) => set("system.damage.dice", txt(e))}>
                    {#each DAMAGE_DICE as d}
                      <option value={d} selected={sys.damage?.dice === d}>{d}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Damage bonus</span>
                  <input
                    type="number"
                    value={sys.damage?.bonus}
                    disabled={!ed}
                    onchange={(e) => set("system.damage.bonus", num(e))}
                  />
                </label>
                <label>
                  <span>Damage type</span>
                  <select disabled={!ed} onchange={(e) => set("system.damage.type", txt(e))}>
                    {#each DAMAGE_TYPES as t}
                      <option value={t} selected={sys.damage?.type === t}>{t}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Evasion modifier</span>
                  <input
                    type="number"
                    value={sys.evasionModifier}
                    disabled={!ed}
                    onchange={(e) => set("system.evasionModifier", num(e))}
                  />
                </label>
                <!-- A Round Shield is Protective and a Tower Shield is
                     Barrier, and both ride here rather than in the sentence:
                     this system parses English rules text in exactly one
                     place and a field we are typing in ourselves is the last
                     place that would be needed. -->
                <label>
                  <span>Armor Score modifier</span>
                  <input
                    type="number"
                    value={sys.armorScoreModifier}
                    disabled={!ed}
                    onchange={(e) => set("system.armorScoreModifier", num(e))}
                  />
                </label>
              </div>
              <!-- Further die *sizes* in the same expression, and the only
                   weapon in the corpus that prints one is the Brawler's
                   Strike: d8+d6, both halves scaling off Proficiency. It is
                   full width and below the grid because a row is three
                   controls and a 150px cell is two of them.

                   Not the Versatile problem. That is a whole alternate stat
                   line — its own trait, range and die, chosen between — and
                   it still has nowhere to go. These are rolled together,
                   always, and never chosen between. -->
              <div class="fields wide">
                <label>
                  <span>Also rolls</span>
                  <div class="lst">
                    {#each sys.damage?.extra ?? [] as g, i (i)}
                      <div class="r">
                        <input
                          type="number"
                          min="0"
                          value={g.count}
                          disabled={!ed}
                          onchange={(e) => editRow("damage.extra", i, "count", num(e))}
                        />
                        <select
                          disabled={!ed}
                          onchange={(e) => editRow("damage.extra", i, "dice", txt(e))}
                        >
                          {#each DAMAGE_DICE as d}
                            <option value={d} selected={g.dice === d}>{d}</option>
                          {/each}
                        </select>
                        {#if ed}
                          <button
                            type="button"
                            class="x"
                            title="Remove"
                            onclick={() => dropRow("damage.extra", i)}>×</button
                          >
                        {/if}
                      </div>
                    {/each}
                    {#if ed}
                      <button
                        type="button"
                        class="add"
                        onclick={() => addRow("damage.extra", { count: 1, dice: "d6" })}
                        >+ die group</button
                      >
                    {/if}
                  </div>
                </label>
              </div>
              <div class="sws">
                <label class="sw">
                  <input
                    type="checkbox"
                    checked={sys.magical}
                    disabled={!ed}
                    onchange={(e) => set("system.magical", chk(e))}
                  />
                  <span>Magical</span>
                </label>
                {#if doc.actor}
                  <label class="sw">
                    <input
                      type="checkbox"
                      checked={sys.equipped}
                      disabled={!ed}
                      onchange={(e) =>
                        toggleVia(e, () => doc.toggleEquipped(), () => !!doc.system.equipped)}
                    />
                    <span>Equipped</span>
                  </label>
                {/if}
              </div>
              <!-- Damage is Proficiency copies of this die, not one die. The
                   count above is the *printed* count and is almost always 1;
                   the multiplication is the character's and is done there. -->
              <p class="ach">
                Rolled as <b>Proficiency × {damageNotation}</b> — the character sheet does the
                multiplication.
              </p>
            </div>
          {:else if snap.type === "armor"}
            <div class="pnl">
              <div class="k">Armor</div>
              <div class="fields">
                <label>
                  <span>Tier</span>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={sys.tier}
                    disabled={!ed}
                    onchange={(e) => set("system.tier", num(e))}
                  />
                </label>
                <label>
                  <span>Base score</span>
                  <input
                    type="number"
                    min="0"
                    value={sys.baseScore}
                    disabled={!ed}
                    onchange={(e) => set("system.baseScore", num(e))}
                  />
                </label>
                <label>
                  <span>Base major</span>
                  <input
                    type="number"
                    value={sys.baseThresholds?.major}
                    disabled={!ed}
                    onchange={(e) => set("system.baseThresholds.major", num(e))}
                  />
                </label>
                <label>
                  <span>Base severe</span>
                  <input
                    type="number"
                    value={sys.baseThresholds?.severe}
                    disabled={!ed}
                    onchange={(e) => set("system.baseThresholds.severe", num(e))}
                  />
                </label>
                <label>
                  <span>Evasion modifier</span>
                  <input
                    type="number"
                    value={sys.evasionModifier}
                    disabled={!ed}
                    onchange={(e) => set("system.evasionModifier", num(e))}
                  />
                </label>
              </div>
              <div class="sws">
                <label class="sw">
                  <input
                    type="checkbox"
                    checked={sys.magical}
                    disabled={!ed}
                    onchange={(e) => set("system.magical", chk(e))}
                  />
                  <span>Magical</span>
                </label>
                {#if doc.actor}
                  <label class="sw">
                    <input
                      type="checkbox"
                      checked={sys.equipped}
                      disabled={!ed}
                      onchange={(e) =>
                        toggleVia(e, () => doc.toggleEquipped(), () => !!doc.system.equipped)}
                    />
                    <span>Equipped</span>
                  </label>
                {/if}
              </div>
              <p class="ach">
                The wearer adds their <b>level</b> to both thresholds. Base score also sets the
                number of Armor Slots.
              </p>
            </div>
          {:else if snap.type === "subclass"}
            <div class="pnl">
              <div class="k">Subclass card</div>
              <div class="fields">
                <label>
                  <span>Subclass</span>
                  <input
                    value={sys.subclassName}
                    disabled={!ed}
                    onchange={(e) => set("system.subclassName", txt(e))}
                  />
                </label>
                <label>
                  <span>Class</span>
                  <input
                    value={sys.className}
                    disabled={!ed}
                    onchange={(e) => set("system.className", txt(e))}
                  />
                </label>
                <label>
                  <span>Rank</span>
                  <select disabled={!ed} onchange={(e) => set("system.rank", txt(e))}>
                    {#each SUBCLASS_RANKS as r}
                      <option value={r} selected={sys.rank === r}>{r}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Spellcast trait</span>
                  <select disabled={!ed} onchange={(e) => set("system.spellcastTrait", txt(e))}>
                    <option value="" selected={!sys.spellcastTrait}>— none —</option>
                    {#each TRAITS as t}
                      <option value={t} selected={sys.spellcastTrait === t}>{traitLabel(t)}</option>
                    {/each}
                  </select>
                </label>
              </div>
              <!-- The card resolves its own class by name rather than off the
                   character, which is what stops a multiclassed character's
                   second subclass wearing the first class's colours. -->
              <p class="ach">
                The class is matched <b>by name</b> to pick the card's hue, so it has to read
                exactly as the class Item does.
              </p>
            </div>
          {:else if snap.type === "class"}
            <div class="pnl">
              <div class="k">Class</div>
              <div class="fields">
                <label>
                  <span>Primary domain</span>
                  <select disabled={!ed} onchange={(e) => set("system.domains.primary", txt(e))}>
                    <option value="" selected={!sys.domains?.primary}>—</option>
                    {#each DOMAINS as d}
                      <option value={d} selected={sys.domains?.primary === d}
                        >{domainDef(d).label}</option
                      >
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Secondary domain</span>
                  <select disabled={!ed} onchange={(e) => set("system.domains.secondary", txt(e))}>
                    <option value="" selected={!sys.domains?.secondary}>—</option>
                    {#each DOMAINS as d}
                      <option value={d} selected={sys.domains?.secondary === d}
                        >{domainDef(d).label}</option
                      >
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Starting Evasion</span>
                  <input
                    type="number"
                    value={sys.startingEvasion}
                    disabled={!ed}
                    onchange={(e) => set("system.startingEvasion", num(e))}
                  />
                </label>
                <label>
                  <span>Starting Hit Points</span>
                  <input
                    type="number"
                    value={sys.startingHitPoints}
                    disabled={!ed}
                    onchange={(e) => set("system.startingHitPoints", num(e))}
                  />
                </label>
              </div>
            </div>
          {:else if snap.type === "ancestry"}
            <div class="pnl">
              <div class="k">Ancestry</div>
              <div class="fields">
                <!-- Written by the creation window when a mixed ancestry
                     takes this card's top and somebody else's bottom. It is
                     one Item wearing the first ancestry's name, and this is
                     the only record of where the other half came from. -->
                <label>
                  <span>Bottom feature taken from</span>
                  <input
                    placeholder="— not mixed —"
                    value={sys.mixedFrom}
                    disabled={!ed}
                    onchange={(e) => set("system.mixedFrom", txt(e))}
                  />
                </label>
              </div>
              <p class="ach">
                The two features are named for <b>where they sit on the card</b>, because the
                position is the rule: a mixed ancestry takes the top of one and the bottom of
                another.
              </p>
            </div>
          {:else if snap.type === "feature"}
            <div class="pnl">
              <div class="k">Feature</div>
              <div class="fields">
                <label>
                  <span>Fires as</span>
                  <select disabled={!ed} onchange={(e) => set("system.kind", txt(e))}>
                    {#each FEATURE_KINDS as k}
                      <option value={k} selected={sys.kind === k}>{k}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Fear cost</span>
                  <input
                    type="number"
                    min="0"
                    value={sys.fearCost}
                    disabled={!ed}
                    onchange={(e) => set("system.fearCost", num(e))}
                  />
                </label>
                <label>
                  <span>Stress cost</span>
                  <input
                    type="number"
                    min="0"
                    value={sys.stressCost}
                    disabled={!ed}
                    onchange={(e) => set("system.stressCost", num(e))}
                  />
                </label>
                <label>
                  <span>Origin</span>
                  <input
                    placeholder="A class, an ancestry, the stat block"
                    value={sys.origin}
                    disabled={!ed}
                    onchange={(e) => set("system.origin", txt(e))}
                  />
                </label>
              </div>
              <!-- An authored cost always wins over the prose. `featurePrice`
                   reads the opening clause and only the opening clause, and
                   this is how you tell it it is wrong. -->
              <p class="ach">
                A <b>Stress cost</b> set here overrides the price read out of the rule's own
                opening clause, and the sheet charges it before posting.
              </p>
            </div>
          {:else if snap.type === "consumable" || snap.type === "loot"}
            <div class="pnl">
              <div class="k">Quantity</div>
              <div class="fields">
                <label>
                  <span>Held</span>
                  <input
                    type="number"
                    min="0"
                    value={sys.quantity}
                    disabled={!ed}
                    onchange={(e) => set("system.quantity", num(e))}
                  />
                </label>
                <label>
                  <span>Source</span>
                  <input
                    placeholder="The roll that produced it"
                    value={sys.source}
                    disabled={!ed}
                    onchange={(e) => set("system.source", txt(e))}
                  />
                </label>
              </div>
            </div>
          {:else if snap.type === "transformation"}
            <div class="pnl">
              <div class="k">Transformation</div>
              <p class="ach">
                A transformation joins the heritage row and does <b>not</b> count against the domain
                card limit — and a character may hold exactly one, so taking a second replaces it.
              </p>
            </div>
          {/if}

          <!-- Art you ship is art you credit, and until now there was
               nowhere on this sheet to read the credit, let alone write one.
               The code is the number in the card's own footer. -->
          {#if printed}
            <div class="pnl">
              <div class="k">Printing<s>what the card's own footer says</s></div>
              <div class="fields">
                <label>
                  <span>Artist</span>
                  <input
                    value={sys.printing?.artist}
                    disabled={!ed}
                    onchange={(e) => set("system.printing.artist", txt(e))}
                  />
                </label>
                <label>
                  <span>Card number</span>
                  <input
                    placeholder="DH106"
                    value={sys.printing?.code}
                    disabled={!ed}
                    onchange={(e) => set("system.printing.code", txt(e))}
                  />
                </label>
              </div>
            </div>
          {/if}
        {:else if tab === "rules"}
          <!-- Built once and then owning its own DOM, so a different document
               has to build a different editor rather than be handed new text
               in the old one. The tab is in the key as well: switching away
               unmounts every editor here, and coming back has to build them
               rather than reuse elements that are gone. -->
          {#key `${doc.id}:${snap.type}`}
            <div class="pnl">
              <div class="k">
                {snap.type === "class" ? "Card text" : "Rules text"}
                <s>{snap.type === "class" ? "one sentence — the chapter's opener" : ""}</s>
              </div>
              <Prose
                {doc}
                path="system.description"
                value={sys.description ?? ""}
                editable={ed}
                height={snap.type === "class" ? 120 : 190}
              />
            </div>

            {#each singles as f (f.key)}
              <div class="pnl">
                <div class="k">{f.label}<s>{f.note ?? ""}</s></div>
                <input
                  class="fnm"
                  placeholder="Name it for itself"
                  value={sys[f.key]?.name ?? ""}
                  disabled={!ed}
                  onchange={(e) => set(`system.${f.key}.name`, txt(e))}
                />
                <Prose
                  {doc}
                  path="system.{f.key}.description"
                  value={sys[f.key]?.description ?? ""}
                  editable={ed}
                  height={150}
                />
              </div>
            {/each}

            {#if run}
              <div class="pnl">
                <div class="k">
                  {run.label}<s>{run.note ?? ""}</s>
                  {#if ed}
                    <button type="button" class="nw" onclick={() => addRow(run.key, blankFeature())}
                      >+ feature</button
                    >
                  {/if}
                </div>
                {#each sys[run.key] ?? [] as f, i (i)}
                  <div class="blk">
                    <div class="bh">
                      <input
                        class="fnm"
                        placeholder="Name it for itself"
                        value={f.name ?? ""}
                        disabled={!ed}
                        onchange={(e) => editRow(run.key, i, "name", txt(e))}
                      />
                      {#if ed}
                        <button
                          type="button"
                          class="mv"
                          title="Move up"
                          disabled={i === 0}
                          onclick={() => moveRow(run.key, i, -1)}>↑</button
                        >
                        <button
                          type="button"
                          class="mv"
                          title="Move down"
                          disabled={i === (sys[run.key] ?? []).length - 1}
                          onclick={() => moveRow(run.key, i, 1)}>↓</button
                        >
                        <button
                          type="button"
                          class="x"
                          title="Remove"
                          onclick={() => dropRow(run.key, i)}>×</button
                        >
                      {/if}
                    </div>
                    <Prose
                      {doc}
                      path="system.{run.key}.{i}.description"
                      value={f.description ?? ""}
                      editable={ed}
                      height={140}
                      onsave={(v) => editRow(run.key, i, "description", v)}
                    />
                  </div>
                {:else}
                  <p class="ach">No features yet.</p>
                {/each}
              </div>
            {/if}

            {#if snap.type === "class"}
              <!-- The longer form of the same fact. `description` is held to
                   one sentence by `tools/check-cards.mjs` because it is what
                   a card prints; this is what the creation window's class row
                   prints, and there the paragraph is the point. Empty falls
                   back to the sentence. -->
              <div class="pnl">
                <div class="k">Flavour<s>the creation window's class row</s></div>
                <Prose
                  {doc}
                  path="system.flavor"
                  value={sys.flavor ?? ""}
                  editable={ed}
                  height={130}
                />
              </div>
              <div class="pnl">
                <div class="k">Starting inventory</div>
                <Prose
                  {doc}
                  path="system.startingInventory"
                  value={sys.startingInventory ?? ""}
                  editable={ed}
                  height={130}
                />
              </div>
              <div class="pnl">
                <div class="k">Suggested traits<s>the book's recommended spread</s></div>
                <Prose
                  {doc}
                  path="system.suggestedTraits"
                  value={sys.suggestedTraits ?? ""}
                  editable={ed}
                  height={110}
                />
              </div>
            {/if}

            <!-- Prose the sheet offers rather than a rule the sheet applies,
                 which is why they are bare strings and not feature blocks. -->
            {#each questionLists as q (q.key)}
              <div class="pnl">
                <div class="k">{q.label}</div>
                <div class="lst">
                  {#each sys[q.key] ?? [] as text, i (i)}
                    <div class="r">
                      <input
                        class="t"
                        type="text"
                        placeholder={q.placeholder}
                        value={text ?? ""}
                        disabled={!ed}
                        onchange={(e) => setStr(q.key, i, txt(e))}
                      />
                      {#if ed}
                        <button
                          type="button"
                          class="x"
                          title="Remove"
                          onclick={() => dropRow(q.key, i)}>×</button
                        >
                      {/if}
                    </div>
                  {/each}
                  {#if ed}
                    <button type="button" class="add" onclick={() => addRow(q.key, "")}
                      >+ question</button
                    >
                  {/if}
                </div>
              </div>
            {/each}
          {/key}
        {:else}
          <!-- ── counters ──────────────────────────────────────────────
               A counter you put down, not a box you cross off. Compendium
               documents intentionally carry none: the player or GM adds the
               useful counters after the item belongs to a character. -->
          <div class="pnl">
            <div class="k">
              Tracked resources<s>{(sys.resources ?? []).length}</s>
              {#if ed}
                <button
                  type="button"
                  class="nw"
                  onclick={() => addRow("resources", blankResource())}>+ counter</button
                >
              {/if}
            </div>
            {#each sys.resources ?? [] as res, i (i)}
              <div class="blk res">
                <div class="bh">
                  <input
                    class="fnm"
                    placeholder="What the card calls them"
                    value={res.name ?? ""}
                    disabled={!ed}
                    onchange={(e) => editRow("resources", i, "name", txt(e))}
                  />
                  {#if ed}
                    <button
                      type="button"
                      class="mv"
                      title="Move up"
                      disabled={i === 0}
                      onclick={() => moveRow("resources", i, -1)}>↑</button
                    >
                    <button
                      type="button"
                      class="mv"
                      title="Move down"
                      disabled={i === (sys.resources ?? []).length - 1}
                      onclick={() => moveRow("resources", i, 1)}>↓</button
                    >
                    <button
                      type="button"
                      class="x"
                      title="Remove"
                      onclick={() => dropRow("resources", i)}>×</button
                    >
                  {/if}
                </div>
                <div class="fields">
                  <label>
                    <span>Held now</span>
                    <input
                      type="number"
                      min="0"
                      value={res.value}
                      disabled={!ed}
                      onchange={(e) => editRow("resources", i, "value", num(e))}
                    />
                  </label>
                  <label>
                    <span>Ceiling</span>
                    <select
                      disabled={!ed}
                      onchange={(e) => editRow("resources", i, "max.kind", txt(e))}
                    >
                      {#each RESOURCE_MAX as k}
                        <option value={k} selected={res.max?.kind === k}
                          >{RESOURCE_MAX_LABELS[k] ?? k}</option
                        >
                      {/each}
                    </select>
                  </label>
                  {#if res.max?.kind === "fixed"}
                    <label>
                      <span>How many</span>
                      <input
                        type="number"
                        min="0"
                        value={res.max?.n}
                        disabled={!ed}
                        onchange={(e) => editRow("resources", i, "max.n", num(e))}
                      />
                    </label>
                  {:else if res.max?.kind === "trait"}
                    <!-- Spellcast is a pointer to one of the six rather than
                         a seventh trait, resolved against the character's
                         subclass at the moment the ceiling is read. -->
                    <label>
                      <span>Which trait</span>
                      <select
                        disabled={!ed}
                        onchange={(e) => editRow("resources", i, "max.trait", txt(e))}
                      >
                        <option value="" selected={!res.max?.trait}>—</option>
                        {#each RESOURCE_TRAITS as t}
                          <option value={t} selected={res.max?.trait === t}
                            >{t === "spellcast" ? "Spellcast" : traitLabel(t)}</option
                          >
                        {/each}
                      </select>
                    </label>
                  {/if}
                  {#if res.max?.kind !== "open"}
                    <label>
                      <span>Printed minimum</span>
                      <input
                        type="number"
                        value={res.max?.floor}
                        disabled={!ed}
                        onchange={(e) => editRow("resources", i, "max.floor", num(e))}
                      />
                    </label>
                  {/if}
                  <label>
                    <span>Comes back on</span>
                    <select
                      disabled={!ed}
                      onchange={(e) => editRow("resources", i, "refresh", txt(e))}
                    >
                      {#each RESOURCE_REFRESH as r}
                        <option value={r} selected={res.refresh === r}
                          >{RESOURCE_REFRESH_LABELS[r]}</option
                        >
                      {/each}
                    </select>
                  </label>
                  <label>
                    <span>And the refresh</span>
                    <select
                      disabled={!ed}
                      onchange={(e) => editRow("resources", i, "onRefresh", txt(e))}
                    >
                      {#each RESOURCE_ON_REFRESH as r}
                        <option value={r} selected={res.onRefresh === r}>{r}s it</option>
                      {/each}
                    </select>
                  </label>
                  {#if featureNames.length}
                    <label>
                      <span>Belongs to</span>
                      <select
                        disabled={!ed}
                        onchange={(e) => editRow("resources", i, "feature", txt(e))}
                      >
                        <option value="" selected={!res.feature}>the card itself</option>
                        {#each featureNames as n}
                          <option value={n} selected={res.feature === n}>{n}</option>
                        {/each}
                      </select>
                    </label>
                  {/if}
                </div>
                <div class="fields wide">
                  <label>
                    <span>What happens at zero</span>
                    <input
                      placeholder="Printed verbatim — the card's own sentence"
                      value={res.onEmpty}
                      disabled={!ed}
                      onchange={(e) => editRow("resources", i, "onEmpty", txt(e))}
                    />
                  </label>
                </div>
                <p class="ach">
                  {#if res.max?.kind === "open"}
                    No ceiling, so the row draws no empty sockets — a pool with none and a pool
                    capped at zero are opposite things.
                  {:else}
                    Resolves to <b>{resolved(res)}</b>
                    {doc.actor ? `for ${doc.actor.name}` : "— an unowned card belongs to nobody, so a trait or level ceiling falls to its minimum"}.
                  {/if}
                </p>
              </div>
            {:else}
              <p class="ach">
                Nothing tracked. Add counters here after this item is on a character sheet.
              </p>
            {/each}
          </div>

          <!-- Kept dice, and they are a second panel rather than a second
               kind of counter. A resource holds one number; a tray holds a
               list of faces, and the two would have spent every control
               asking which they were. Seven documents in the corpus carry
               both — the Guardian's Unstoppable is a once-per-long-rest use
               *and* a die that climbs — so the two panels stack, in that
               order, exactly as the sheet draws them. -->
          <div class="pnl">
            <div class="k">
              Kept dice<s>{(sys.dice ?? []).length}</s>
              {#if ed}
                <button type="button" class="nw" onclick={() => addRow("dice", blankDiePool())}
                  >+ dice</button
                >
              {/if}
            </div>
            {#each sys.dice ?? [] as pool, i (i)}
              <div class="blk res">
                <div class="bh">
                  <input
                    class="fnm"
                    placeholder="What the card calls them"
                    value={pool.name ?? ""}
                    disabled={!ed}
                    onchange={(e) => editRow("dice", i, "name", txt(e))}
                  />
                  {#if ed}
                    <button
                      type="button"
                      class="mv"
                      disabled={i === 0}
                      onclick={() => moveRow("dice", i, -1)}>↑</button
                    >
                    <button
                      type="button"
                      class="mv"
                      disabled={i === (sys.dice ?? []).length - 1}
                      onclick={() => moveRow("dice", i, 1)}>↓</button
                    >
                    <button type="button" class="x" onclick={() => dropRow("dice", i)}>×</button>
                  {/if}
                </div>
                <div class="fields">
                  <label>
                    <span>Shape</span>
                    <select disabled={!ed} onchange={(e) => editRow("dice", i, "mode", txt(e))}>
                      {#each DIE_MODES as m}
                        <option value={m} selected={pool.mode === m}
                          >{DIE_MODE_LABELS[m] ?? m}</option
                        >
                      {/each}
                    </select>
                  </label>
                  <!-- The size is a number the table sets, not a rule this
                       file derives. A Rally Die becomes a d8 at level 5 and a
                       d10 at Wordsmith Mastery; a Combo Die grows by an
                       advancement option. Those triggers live on three other
                       documents, so the card states the size and prints its
                       own sentence about when it moves. -->
                  <label>
                    <span>Die</span>
                    <select
                      disabled={!ed}
                      onchange={(e) => editRow("dice", i, "faces", num(e))}
                    >
                      {#each DIE_FACES as f}
                        <option value={f} selected={pool.faces === f}>d{f}</option>
                      {/each}
                    </select>
                  </label>
                  {#if pool.mode === "bag"}
                    <label>
                      <span>How many</span>
                      <select
                        disabled={!ed}
                        onchange={(e) => editRow("dice", i, "max.kind", txt(e))}
                      >
                        {#each RESOURCE_MAX as k}
                          <option value={k} selected={pool.max?.kind === k}
                            >{RESOURCE_MAX_LABELS[k] ?? k}</option
                          >
                        {/each}
                      </select>
                    </label>
                    {#if pool.max?.kind === "fixed"}
                      <label>
                        <span>That many</span>
                        <input
                          type="number"
                          min="0"
                          value={pool.max?.n}
                          disabled={!ed}
                          onchange={(e) => editRow("dice", i, "max.n", num(e))}
                        />
                      </label>
                    {:else if pool.max?.kind === "trait"}
                      <label>
                        <span>Which trait</span>
                        <select
                          disabled={!ed}
                          onchange={(e) => editRow("dice", i, "max.trait", txt(e))}
                        >
                          <option value="" selected={!pool.max?.trait}>—</option>
                          {#each RESOURCE_TRAITS as t}
                            <option value={t} selected={pool.max?.trait === t}
                              >{t === "spellcast" ? "Spellcast" : traitLabel(t)}</option
                            >
                          {/each}
                        </select>
                      </label>
                    {/if}
                  {/if}
                  <label>
                    <span>Comes back</span>
                    <select disabled={!ed} onchange={(e) => editRow("dice", i, "refresh", txt(e))}>
                      {#each RESOURCE_REFRESH as r}
                        <option value={r} selected={pool.refresh === r}
                          >{RESOURCE_REFRESH_LABELS[r] ?? r}</option
                        >
                      {/each}
                    </select>
                  </label>
                  <label>
                    <span>And then</span>
                    <select
                      disabled={!ed}
                      onchange={(e) => editRow("dice", i, "onRefresh", txt(e))}
                    >
                      {#each DIE_ON_REFRESH as o}
                        <option value={o} selected={pool.onRefresh === o}
                          >{DIE_ON_REFRESH_LABELS[o] ?? o}</option
                        >
                      {/each}
                    </select>
                  </label>
                  {#if featureNames.length}
                    <label>
                      <span>Belongs to</span>
                      <select
                        disabled={!ed}
                        onchange={(e) => editRow("dice", i, "feature", txt(e))}
                      >
                        <option value="" selected={!pool.feature}>This document</option>
                        {#each featureNames as f}
                          <option value={f} selected={pool.feature === f}>{f}</option>
                        {/each}
                      </select>
                    </label>
                  {/if}
                </div>
                <div class="fields wide">
                  <label>
                    <span>When the die grows</span>
                    <input
                      placeholder="Printed verbatim — the card's own sentence"
                      value={pool.grow}
                      disabled={!ed}
                      onchange={(e) => editRow("dice", i, "grow", txt(e))}
                    />
                  </label>
                  <label>
                    <span>What happens at the end</span>
                    <input
                      placeholder="Printed verbatim — what the card says when it runs out"
                      value={pool.onEmpty}
                      disabled={!ed}
                      onchange={(e) => editRow("dice", i, "onEmpty", txt(e))}
                    />
                  </label>
                </div>
                <p class="ach">
                  {#if pool.mode === "roll"}
                    Nothing is held — the card names a <b>d{pool.faces}</b> and pressing it rolls.
                  {:else if pool.mode === "climb"}
                    One <b>d{pool.faces}</b>, placed showing 1 and stepped up to {pool.faces}. It
                    refuses at the top rather than clearing itself, because what happens then is
                    printed on the card and differs between them.
                  {:else}
                    Up to <b>{poolCapacity(pool, doc.actor) ?? "any number"}</b> ×
                    <b>d{pool.faces}</b>
                    {doc.actor ? `for ${doc.actor.name}` : "— an unowned card belongs to nobody"}.
                  {/if}
                </p>
              </div>
            {:else}
              <p class="ach">
                No dice. Eighteen rules in the corpus keep one: a bag you spend from, a die that
                counts up, or a die whose size is the only thing worth recording.
              </p>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .it-hd {
    display: flex;
    gap: 13px;
    align-items: center;
    padding: 15px 18px;
    background: var(--sunk);
    border-bottom: 1px solid var(--line);
    box-shadow: inset 3px 0 0 var(--accent);
    flex: none;
  }
  /* A button, so Foundry's `elements` layer would otherwise size it to one
     centred 28px line — the reset this repo keeps relearning. It is a
     picture you press, and a picture is as tall as the picture. */
  .it-hd .pic {
    flex: none;
    width: 52px;
    height: 52px;
    min-height: 0;
    max-height: none;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: var(--sunk-2);
    cursor: pointer;
    position: relative;
  }
  .it-hd .pic:disabled {
    cursor: default;
  }
  .it-hd .pic img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .it-hd .pic:not(:disabled):hover {
    box-shadow: inset 0 0 0 1.5px var(--hope);
  }
  .it-hd .id {
    min-width: 0;
    flex: 1 1 auto;
  }
  .it-hd .eyebrow {
    display: block;
    font: 700 8.5px/1 var(--f-mono);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-bottom: 6px;
  }
  .it-hd .nm {
    width: 100%;
    border: 0;
    background: transparent;
    font: 700 18px/1.05 var(--f-display);
    letter-spacing: -0.02em;
    color: var(--ink);
    padding: 0;
  }
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 9px;
  }
  /* One field whose content is a sentence, so it takes the row rather than a
     150px cell it would immediately scroll inside. */
  .fields.wide {
    grid-template-columns: 1fr;
    margin-top: 9px;
  }
  .fields label {
    display: block;
  }
  .fields span {
    display: block;
    font: 700 8px/1 var(--f-mono);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-bottom: 5px;
  }
  .fields input,
  .fields select,
  .fnm {
    width: 100%;
    border: 0;
    background: var(--sunk);
    box-shadow: inset 0 0 0 1px var(--line);
    color: var(--ink);
    font: 500 12px/1 var(--f-ui);
    padding: 7px 8px;
  }
  .fields input:focus,
  .fields select:focus,
  .fnm:focus {
    outline: 0;
    box-shadow: inset 0 0 0 1.5px var(--hope);
  }

  /* A feature's name, above its own editor. Set at the weight the rule is
     titled at rather than at field size, because it is a heading that
     happens to be typed into. */
  .fnm {
    font: 600 12.5px/1.3 var(--f-ui);
    margin-bottom: 6px;
  }

  /* One named block — a feature, or a counter and everything about it. The
     tint is what says the run is made of repeated things rather than of one
     long panel. */
  .blk {
    padding: 10px 11px 11px;
    background: var(--sunk);
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .blk + .blk {
    margin-top: 9px;
  }
  .blk .bh {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .blk .bh .fnm {
    flex: 1 1 auto;
    min-width: 0;
    margin-bottom: 0;
  }
  .blk .fields {
    margin-top: 9px;
  }
  .blk .ach {
    margin-top: 8px;
  }

  /* The two row controls, and both state all three heights: Foundry's
     `elements` layer sets `height` *and* a matching `min-height`, and a
     floor with no competitor simply applies. Left alone these are 28px
     controls on a 24px row. */
  .blk .mv,
  .blk .x {
    flex: none;
    width: 22px;
    height: 24px;
    min-height: 0;
    max-height: none;
    padding: 0;
    border: 0;
    border-radius: 0;
    cursor: pointer;
    background: transparent;
    color: var(--ink-4);
    font: 700 12px/1 var(--f-mono);
    transition:
      color 0.14s,
      background 0.14s;
  }
  .blk .mv:hover:not(:disabled) {
    color: var(--hope-tx);
    background: var(--raise);
  }
  .blk .x:hover {
    color: var(--wound);
    background: var(--raise);
  }
  .blk .mv:disabled {
    opacity: 0.3;
    cursor: default;
  }

  /* A switch is a mark and a word, aligned on the mark rather than on the
     baseline: an 11px rhombus bottom-aligned to a 12px line hangs off it. */
  .sws {
    display: flex;
    flex-wrap: wrap;
    gap: 7px 18px;
  }
  .sws,
  .fields + .sw {
    margin-top: 11px;
  }
  .sw {
    display: flex;
    align-items: center;
    gap: 7px;
    cursor: pointer;
  }
  .sw span {
    font: 500 11.5px/1 var(--f-ui);
    color: var(--ink-2);
  }
</style>
