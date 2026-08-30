<script lang="ts">
  /**
   * The Automation editor: what a rule *does*, edited by hand.
   *
   * Three fields on every Item subtype had no control anywhere on this sheet —
   * `actions`, `modifiers` and `cardDamage`. Two of those predate this
   * component: the compendium has been writing passive modifiers and printed
   * damage expressions since they existed, and a GM has never been able to see
   * or edit either. `check-item-sheet.mjs` could not report it because its own
   * walker never recognised the `...tracked()` spread, so it said "every field
   * reachable" while looking at none of them.
   *
   * They are one panel rather than three tabs because they are one question
   * asked at three tenses. `modifiers` is what this rule changes *while you
   * hold it*; `actions` is what it does *when you press it*; `cardDamage` is
   * the expression it *prints*. A GM writing a homebrew card fills them in
   * together, in that order, and a tab strip would make that three journeys.
   *
   * **It lives in the Rules tab and not a fourth one.** An action is what a
   * rule does, and the creation window's own argument applies: a tab is one
   * view of a whole thing, and a fourth tab that is empty on a longsword is a
   * strip that reads as broken rather than as inapplicable.
   *
   * ── the one thing this component may not do
   *
   * Write `system.<run>.<i>.actions`. Every feature list here is an ArrayField
   * and Foundry reads a dotted index in an update key as a path into an
   * *object* — the trap the adjust tab learned about Experiences and
   * `moveResource` learned about pools. So a block's actions are written by
   * rebuilding the whole run array, which `write` does, and the only reason
   * this is not `editRow` from the host is that a block can be reached three
   * ways: a run (`classFeatures[i]`), a single (`hopeFeature`), or the
   * document itself.
   */

  /* eslint-disable @typescript-eslint/no-explicit-any */

  import {
    ACTION_DURATIONS,
    ACTION_DURATION_LABELS,
    ACTION_KINDS,
    ACTION_KIND_LABELS,
    ACTION_SUBJECTS,
    CONDITIONS,
    DIE_POOL_OPS,
    DIE_POOL_OP_LABELS,
    RESOURCE_TRAITS,
    TRAITS,
    traitLabel,
    type Trait,
  } from "../../config.ts";
  import { MODIFIER_CONDITIONS, MODIFIER_SOURCES, MODIFIER_TARGETS } from "../../data/modifiers.ts";

  interface Props {
    /** The actions on this block, as stored. */
    actions: any[];
    /** Called with the whole new array. Never a path — see the note above. */
    write: (actions: any[]) => void;
    editable: boolean;
    /** Counter and die-pool names on this document, for the `resource` picker. */
    resources?: string[];
    dice?: string[];
    /** Printed damage modes on this document, for `roll-card-damage`. */
    damage?: string[];
    /** What the parser would suggest for this block, or nothing. */
    suggest?: () => void;
    suggestable?: boolean;
    /** Always-on modifiers on this block. See `data/modifiers.ts`. */
    modifiers?: any[];
    writeModifiers?: (modifiers: any[]) => void;
  }

  const {
    actions = [],
    write,
    editable,
    resources = [],
    dice = [],
    damage = [],
    suggest,
    suggestable = false,
    modifiers = [],
    writeModifiers,
  }: Props = $props();

  const txt = (e: Event) => (e.currentTarget as HTMLInputElement).value;
  const num = (e: Event) => Number((e.currentTarget as HTMLInputElement).value) || 0;

  /**
   * A blank action, complete against the schema's own defaults.
   *
   * Complete rather than sparse because every consumer reads these fields
   * unconditionally, and a `subject` of `undefined` is a press that lands
   * nowhere rather than one that lands on you.
   */
  const blank = () => ({
    kind: "pay",
    label: "",
    subject: "self",
    amount: { hope: 0, stress: 0, hitPoints: 0, armorSlots: 0, fear: 0 },
    resource: "",
    by: 0,
    op: "place",
    trait: "",
    dc: 0,
    damageName: "",
    formula: "",
    condition: "",
    effect: { name: "", duration: "temporary", modifiers: [] },
    mark: 1,
    said: "",
    when: "",
    steps: [],
  });

  const rows = (): any[] => foundry.utils.deepClone(actions ?? []);

  const add = () => write([...rows(), blank()]);
  const drop = (i: number) => {
    const list = rows();
    list.splice(i, 1);
    write(list);
  };
  const move = (i: number, by: number) => {
    const list = rows();
    const j = i + by;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    write(list);
  };
  const edit = (i: number, path: string, v: unknown) => {
    const list = rows();
    if (!list[i]) return;
    foundry.utils.setProperty(list[i], path, v);
    write(list);
  };

  /** A step keeps `said` and drops the two things only a head may carry. */
  const addStep = (i: number) => {
    const list = rows();
    if (!list[i]) return;
    const { when: _w, steps: _st, ...step } = blank();
    list[i].steps = [...(list[i].steps ?? []), step];
    write(list);
  };
  const dropStep = (i: number, j: number) => {
    const list = rows();
    if (!list[i]?.steps) return;
    list[i].steps.splice(j, 1);
    write(list);
  };
  const editStep = (i: number, j: number, path: string, v: unknown) => {
    const list = rows();
    if (!list[i]?.steps?.[j]) return;
    foundry.utils.setProperty(list[i].steps[j], path, v);
    write(list);
  };

  /* ── which controls a kind actually uses ──────────────────────────────
     The field set is wide and every kind uses a few of it, exactly as
     `damageField` and `resourceField` are. Drawing all of it on every row
     would be a panel where most controls do nothing, which is worse than a
     narrow one — a control that is present and inert is a control somebody
     will fill in and then wonder about. */
  const USES: Record<string, string[]> = {
    pay: ["amount"],
    gain: ["amount"],
    clear: ["amount"],
    "move-resource": ["resource", "by"],
    "die-pool": ["pool", "op"],
    refresh: ["resource"],
    "roll-trait": ["trait", "dc"],
    "roll-damage": [],
    "roll-card-damage": ["damageName"],
    "roll-dice": ["formula"],
    "apply-condition": ["condition", "subject"],
    "grant-effect": ["effect", "subject"],
    "use-item": [],
    "mark-use": ["mark"],
  };
  const uses = (kind: string, field: string) => (USES[kind] ?? []).includes(field);

  /* ── passives ────────────────────────────────────────────────────────
     `modifiers` has been written by the compendium since it existed and has
     never had a control on this sheet. It sits under Actions rather than in a
     panel of its own because the two are the same question at two tenses:
     what this rule changes while you hold it, and what it does when you press
     it. A GM writing a homebrew card fills them in together. */

  const blankModifier = () => ({
    target: "evasion",
    value: 1,
    source: "fixed",
    trait: "",
    scale: 1,
    condition: "always",
    minimum: 0,
  });

  const mods = (): any[] => foundry.utils.deepClone(modifiers ?? []);
  const addMod = () => writeModifiers?.([...mods(), blankModifier()]);
  const dropMod = (i: number) => {
    const list = mods();
    list.splice(i, 1);
    writeModifiers?.(list);
  };
  const editMod = (i: number, path: string, v: unknown) => {
    const list = mods();
    if (!list[i]) return;
    foundry.utils.setProperty(list[i], path, v);
    writeModifiers?.(list);
  };

  const AMOUNTS: Array<[string, string]> = [
    ["hope", "Hope"],
    ["stress", "Stress"],
    ["hitPoints", "HP"],
    ["armorSlots", "Armor"],
    ["fear", "Fear"],
  ];
</script>

<div class="pnl">
  <div class="k">
    Actions
    <s>what a press does — see the closed set in config.ts</s>
    {#if editable}
      {#if suggestable && suggest}
        <!-- The parsers, demoted from runtime code to an authoring assist.
             They used to decide a card's buttons at render time and were wrong
             in ways nobody could see; here their guess arrives as ordinary
             editable rows that somebody looks at before it can charge anybody
             anything. A guess you can see and edit is a different object from
             a guess that acts. -->
        <button type="button" class="nw" title="Read this rule's prose and fill in what it seems to ask for. Always check it." onclick={suggest}>suggest</button>
      {/if}
      <button type="button" class="nw" onclick={add}>+ action</button>
    {/if}
  </div>

  {#each actions ?? [] as a, i (i)}
    <div class="auto">
      <div class="auhd">
        <select disabled={!editable} value={a.kind} onchange={(e) => edit(i, "kind", txt(e))}>
          {#each ACTION_KINDS as k}
            <option value={k}>{ACTION_KIND_LABELS[k] ?? k}</option>
          {/each}
        </select>
        <input
          class="aunm"
          placeholder="Label (blank = derived from the kind)"
          value={a.label ?? ""}
          disabled={!editable}
          onchange={(e) => edit(i, "label", txt(e))}
        />
        {#if editable}
          <button type="button" class="aumv" title="Move up" disabled={i === 0} onclick={() => move(i, -1)}>↑</button>
          <button type="button" class="aumv" title="Move down" disabled={i === (actions ?? []).length - 1} onclick={() => move(i, 1)}>↓</button>
          <button type="button" class="audl" title="Remove" onclick={() => drop(i)}>×</button>
        {/if}
      </div>

      <div class="af">
        {#if uses(a.kind, "amount")}
          {#each AMOUNTS as [key, label]}
            <label class="an"
              >{label}
              <input
                type="number"
                min="0"
                value={a.amount?.[key] ?? 0}
                disabled={!editable}
                onchange={(e) => edit(i, `amount.${key}`, num(e))}
              />
            </label>
          {/each}
        {/if}

        {#if uses(a.kind, "resource") || uses(a.kind, "pool")}
          <label class="an wide"
            >{uses(a.kind, "pool") ? "Die pool" : "Counter"}
            <!-- A list rather than free text, because the name has to match a
                 pool this document actually carries: a `move-resource` naming
                 one that is not there emits no button at all, silently. -->
            <select disabled={!editable} value={a.resource ?? ""} onchange={(e) => edit(i, "resource", txt(e))}>
              <option value="">—</option>
              {#each (uses(a.kind, "pool") ? dice : resources) as name}
                <option value={name}>{name}</option>
              {/each}
            </select>
          </label>
        {/if}

        {#if uses(a.kind, "by")}
          <label class="an"
            >By
            <input type="number" value={a.by ?? 0} disabled={!editable} onchange={(e) => edit(i, "by", num(e))} />
          </label>
        {/if}

        {#if uses(a.kind, "op")}
          <label class="an wide"
            >Does
            <select disabled={!editable} value={a.op ?? "place"} onchange={(e) => edit(i, "op", txt(e))}>
              {#each DIE_POOL_OPS as op}
                <option value={op}>{DIE_POOL_OP_LABELS[op] ?? op}</option>
              {/each}
            </select>
          </label>
        {/if}

        {#if uses(a.kind, "trait")}
          <label class="an wide"
            >Trait
            <select disabled={!editable} value={a.trait ?? ""} onchange={(e) => edit(i, "trait", txt(e))}>
              <option value="">—</option>
              {#each RESOURCE_TRAITS as t}
                <!-- `spellcast` is a pointer to one of the six, resolved
                     against the character at the press. It is deliberately not
                     in TRAITS, so it has no label there. -->
                <option value={t}>{t === "spellcast" ? "Spellcast" : traitLabel(t as Trait)}</option>
              {/each}
            </select>
          </label>
        {/if}

        {#if uses(a.kind, "dc")}
          <label class="an"
            >Difficulty
            <input type="number" min="0" value={a.dc ?? 0} disabled={!editable} onchange={(e) => edit(i, "dc", num(e))} />
          </label>
        {/if}

        {#if uses(a.kind, "damageName")}
          <label class="an wide"
            >Which expression
            <select disabled={!editable} value={a.damageName ?? ""} onchange={(e) => edit(i, "damageName", txt(e))}>
              {#each damage as name}
                <option value={name}>{name || "(the only one)"}</option>
              {/each}
            </select>
          </label>
        {/if}

        {#if uses(a.kind, "formula")}
          <label class="an wide"
            >Formula
            <input placeholder="1d4" value={a.formula ?? ""} disabled={!editable} onchange={(e) => edit(i, "formula", txt(e))} />
          </label>
        {/if}

        {#if uses(a.kind, "condition")}
          <label class="an wide"
            >Condition
            <select disabled={!editable} value={a.condition ?? ""} onchange={(e) => edit(i, "condition", txt(e))}>
              <option value="">—</option>
              {#each CONDITIONS as c}
                <option value={c.id}>{c.name}</option>
              {/each}
            </select>
          </label>
        {/if}

        {#if uses(a.kind, "subject")}
          <label class="an wide"
            >Lands on
            <select disabled={!editable} value={a.subject ?? "self"} onchange={(e) => edit(i, "subject", txt(e))}>
              {#each ACTION_SUBJECTS as s}
                <option value={s}>{s === "self" ? "The holder" : "Selected tokens"}</option>
              {/each}
            </select>
          </label>
        {/if}

        {#if uses(a.kind, "mark")}
          <label class="an"
            >Mark
            <input type="number" min="0" value={a.mark ?? 1} disabled={!editable} onchange={(e) => edit(i, "mark", num(e))} />
          </label>
        {/if}
      </div>

      {#if uses(a.kind, "effect")}
        <div class="af">
          <label class="an wide"
            >Effect name
            <input value={a.effect?.name ?? ""} disabled={!editable} onchange={(e) => edit(i, "effect.name", txt(e))} />
          </label>
          <label class="an wide"
            >Lasts
            <select disabled={!editable} value={a.effect?.duration ?? "temporary"} onchange={(e) => edit(i, "effect.duration", txt(e))}>
              {#each ACTION_DURATIONS as d}
                <option value={d}>{ACTION_DURATION_LABELS[d] ?? d}</option>
              {/each}
            </select>
          </label>
        </div>
        <p class="ach">
          What it changes is a list of modifiers, edited in the Passives panel
          below and copied here — an effect with none is a name on a token and
          nothing else, which is a legitimate thing to want.
        </p>
      {/if}

      <div class="af">
        <label class="an wide"
          >When <s>printed, never enforced</s>
          <input
            placeholder="On a success"
            value={a.when ?? ""}
            disabled={!editable}
            onchange={(e) => edit(i, "when", txt(e))}
          />
        </label>
        <label class="an wide"
          >Said <s>the words this was read from</s>
          <!-- The load-bearing field. A build check fails when this string is
               no longer on the card, because upstream fixing a typo and
               upstream rewriting a rule around its cost look identical from
               here. It is also the button's tooltip in chat. -->
          <input
            placeholder="Mark a Stress"
            value={a.said ?? ""}
            disabled={!editable}
            onchange={(e) => edit(i, "said", txt(e))}
          />
        </label>
      </div>

      <!-- Steps: one level, structurally. "Spend a Hope and make an attack" is
           one act at the table, and two buttons for one sentence lets somebody
           take the second without paying for the first. A chain charges before
           it rolls and aborts whole. -->
      {#each a.steps ?? [] as st, j (j)}
        <div class="stp">
          <span class="ar">then</span>
          <select disabled={!editable} value={st.kind} onchange={(e) => editStep(i, j, "kind", txt(e))}>
            {#each ACTION_KINDS as k}
              <option value={k}>{ACTION_KIND_LABELS[k] ?? k}</option>
            {/each}
          </select>
          <input
            class="aunm"
            placeholder="Label"
            value={st.label ?? ""}
            disabled={!editable}
            onchange={(e) => editStep(i, j, "label", txt(e))}
          />
          {#if uses(st.kind, "amount")}
            {#each AMOUNTS as [key, label]}
              <label class="an"
                >{label}
                <input
                  type="number"
                  min="0"
                  value={st.amount?.[key] ?? 0}
                  disabled={!editable}
                  onchange={(e) => editStep(i, j, `amount.${key}`, num(e))}
                />
              </label>
            {/each}
          {/if}
          {#if uses(st.kind, "trait")}
            <select disabled={!editable} value={st.trait ?? ""} onchange={(e) => editStep(i, j, "trait", txt(e))}>
              <option value="">—</option>
              {#each RESOURCE_TRAITS as t}
                <option value={t}>{t === "spellcast" ? "Spellcast" : traitLabel(t as Trait)}</option>
              {/each}
            </select>
          {/if}
          {#if editable}
            <button type="button" class="audl" title="Remove step" onclick={() => dropStep(i, j)}>×</button>
          {/if}
        </div>
      {/each}
      {#if editable}
        <button type="button" class="nw stpadd" onclick={() => addStep(i)}>+ step</button>
      {/if}
    </div>
  {:else}
    <p class="ach">
      No actions. This card's rules text is printed and nothing about it is a
      press — which is true of about a fifth of the corpus and is a fine answer.
    </p>
  {/each}
</div>


{#if writeModifiers}
  <div class="pnl">
    <div class="k">
      Passives
      <s>always on while this is held — never a press</s>
      {#if editable}
        <button type="button" class="nw" onclick={addMod}>+ passive</button>
      {/if}
    </div>

    {#each modifiers ?? [] as m, i (i)}
      <div class="auto">
        <div class="af">
          <label class="an wide"
            >Changes
            <select disabled={!editable} value={m.target} onchange={(e) => editMod(i, "target", txt(e))}>
              {#each MODIFIER_TARGETS as t}
                <option value={t}>{t}</option>
              {/each}
            </select>
          </label>
          {#if m.target === "trait"}
            <label class="an wide"
              >Which trait <s>blank = all six</s>
              <select disabled={!editable} value={m.trait ?? ""} onchange={(e) => editMod(i, "trait", txt(e))}>
                <option value="">All six</option>
                {#each TRAITS as t}
                  <option value={t}>{traitLabel(t as Trait)}</option>
                {/each}
              </select>
            </label>
          {/if}
          <label class="an"
            >By
            <input type="number" value={m.value ?? 0} disabled={!editable} onchange={(e) => editMod(i, "value", num(e))} />
          </label>
          <label class="an wide"
            >Plus <s>a number off the character</s>
            <select disabled={!editable} value={m.source ?? "fixed"} onchange={(e) => editMod(i, "source", txt(e))}>
              {#each MODIFIER_SOURCES as s}
                <option value={s}>{s === "fixed" ? "nothing" : s}</option>
              {/each}
            </select>
          </label>
          {#if (m.source ?? "fixed") !== "fixed"}
            <label class="an"
              >× <s>scale</s>
              <input type="number" step="0.5" value={m.scale ?? 1} disabled={!editable} onchange={(e) => editMod(i, "scale", num(e))} />
            </label>
          {/if}
          {#if m.source === "trait"}
            <label class="an wide"
              >Off which trait
              <select disabled={!editable} value={m.trait ?? ""} onchange={(e) => editMod(i, "trait", txt(e))}>
                {#each TRAITS as t}
                  <option value={t}>{traitLabel(t as Trait)}</option>
                {/each}
              </select>
            </label>
          {/if}
          <label class="an wide"
            >Only while
            <!-- The reason these are our own modifiers rather than Foundry
                 ActiveEffect changes: half the interesting passives in this
                 corpus are gated on loadout composition or a track's state,
                 and an AE change is unconditional by construction. -->
            <select disabled={!editable} value={m.condition ?? "always"} onchange={(e) => editMod(i, "condition", txt(e))}>
              {#each MODIFIER_CONDITIONS as c}
                <option value={c}>{c}</option>
              {/each}
            </select>
          </label>
          {#if ["hope", "domain"].includes(m.condition)}
            <label class="an"
              >At least
              <input type="number" min="0" value={m.minimum ?? 0} disabled={!editable} onchange={(e) => editMod(i, "minimum", num(e))} />
            </label>
          {/if}
          {#if editable}
            <button type="button" class="audl" title="Remove" onclick={() => dropMod(i)}>×</button>
          {/if}
        </div>
      </div>
    {:else}
      <p class="ach">Nothing always-on. Most rules are a press rather than a bonus.</p>
    {/each}
  </div>
{/if}

<style>
  /* Every control here is a `<button>`, `<input>` or `<select>`, and Foundry's
     `elements` layer sizes all three — 28px buttons with a matching min-height,
     4px radii, its own borders and grounds. Our sheets arrive unlayered and
     unlayered beats layered, so a stated height wins; a floor with no
     competitor simply applies, which is the bug that stood two steppers 59px
     tall in a 51px Fear strip. So all three metrics are stated, not just one.

     This block is the fourth surface in this system to pay that toll, after
     `make.css`, `pool.css` and `browse.css`. The lesson keeps arriving because
     the environment is part of the component and a study page never carries it. */
  /* ── the members this component owns ─────────────────────────────────
     `.pnl`, `.k`, `.nw` and `.ach` come from the ported `sheet.css` and reach
     any component inside a `.dh` root, so they are used as-is. Everything else
     the item sheet's rows are made of — `.blk`, `.bh`, `.fnm`, `.mv`, `.x` —
     is scoped to `ItemSheet.svelte` and does **not** reach a child component,
     which is Svelte's rule and not a bug in it.

     So these are `au`-prefixed and styled here rather than borrowed. Borrowing
     the names and letting them fall through unstyled would have been this
     repo's own recurring failure — drawn perfectly and lying — with the worst
     of it on `.x` and `.mv`, which are `<button>`s: unstyled, Foundry's
     `elements` layer takes both to 28px in a 24px row, and the panel reads as
     roomy rather than as broken. That is exactly what `.lst .r .x` shipped as
     until somebody measured it. */
  .auto {
    display: grid;
    gap: 5px;
    padding: 8px 0 9px;
    border-top: 1px solid var(--line);
  }

  .auto:first-of-type {
    border-top: 0;
  }

  .auhd {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .aunm {
    flex: 1 1 auto;
    min-width: 0;
    height: 20px;
    min-height: 20px;
    max-height: 20px;
    border-radius: 0;
    font: 400 11px/1 var(--f-ui, sans-serif);
    padding: 0 5px;
    background: var(--sunk);
    color: var(--ink);
    border: 1px solid var(--edge);
  }

  /* All three metrics, not just `height`. Foundry gives a button a height AND
     a matching `min-height`, and a floor with no competitor simply applies —
     the bug that stood two Fear-strip steppers 59px tall in a 51px strip. */
  .aumv,
  .audl {
    flex: 0 0 auto;
    width: 20px;
    height: 20px;
    min-height: 20px;
    max-height: 20px;
    padding: 0;
    border: 1px solid var(--edge);
    border-radius: 0;
    background: none;
    color: var(--ink-3);
    font: 500 11px/1 var(--f-ui, sans-serif);
    cursor: pointer;
  }

  .aumv:hover:not(:disabled),
  .audl:hover {
    color: var(--ink);
    border-color: var(--ink-3);
  }

  .aumv:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .af {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    align-items: flex-end;
  }

  .an {
    display: grid;
    gap: 2px;
    font: 500 7.5px/1 var(--f-mono, monospace);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-3);
    min-width: 46px;
  }

  .an.wide {
    min-width: 116px;
    flex: 1 1 116px;
  }

  .an :global(s) {
    display: block;
    text-transform: none;
    letter-spacing: 0;
    opacity: 0.62;
  }

  .an input,
  .an select,
  .auto > .auhd select {
    height: 20px;
    min-height: 20px;
    max-height: 20px;
    border-radius: 0;
    font: 400 10px/1 var(--f-ui, sans-serif);
    padding: 0 4px;
    background: var(--sunk);
    color: var(--ink);
    border: 1px solid var(--edge);
  }

  .auto > .auhd select {
    flex: 0 0 148px;
  }

  /* A step is visibly *inside* its action rather than beside it — the chain is
     one press, and a row that read as a sibling would be offering two. */
  .stp {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: flex-end;
    margin-left: 14px;
    padding-left: 8px;
    border-left: 2px solid var(--edge);
  }

  .stp select,
  .stp input {
    height: 20px;
    min-height: 20px;
    max-height: 20px;
    border-radius: 0;
    font: 400 10px/1 var(--f-ui, sans-serif);
    padding: 0 4px;
    background: var(--sunk);
    color: var(--ink);
    border: 1px solid var(--edge);
  }

  .ar {
    font: 500 7.5px/20px var(--f-mono, monospace);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-3);
  }

  .stpadd {
    justify-self: start;
    margin-left: 14px;
  }
</style>
