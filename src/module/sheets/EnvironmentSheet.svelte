<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any */
  import { ENVIRONMENT_TYPES, ENVIRONMENT_TYPE_LABELS } from "../config.ts";
  import type { SheetState } from "../apps/sheet-state.svelte.ts";
  import { handleActorDrop } from "../apps/svelte-sheets.ts";
  import ActorSheetHeader from "./parts/ActorSheetHeader.svelte";
  import FeatureList from "./parts/FeatureList.svelte";
  import Prose from "./parts/Prose.svelte";

  interface Props { doc: any; snap: SheetState; app: any }
  let { doc, snap }: Props = $props();

  let tab = $state<"overview" | "details">("overview");
  let editing = $state(false);
  const sys = $derived(snap.system);
  const ed = $derived(snap.editable);
  const set = (path: string, next: unknown) => ed && editing && doc.update({ [path]: next });
  const value = (event: Event) => (event.currentTarget as HTMLInputElement).value;
  const number = (event: Event, fallback = 0) => Math.round(Number(value(event)) || fallback);
  const toggleEdit = () => { editing = !editing; tab = editing ? "details" : "overview"; };
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="win actor-sheet environment"
  class:editing
  style="--w:100%"
  ondrop={(event) => { event.preventDefault(); if (ed) handleActorDrop(doc, event); }}
  ondragover={(event) => event.preventDefault()}
>
  <div class="bd" style="--h:100%">
    <div class="pane">
      <div class="scr">
        <ActorSheetHeader
          {doc}
          img={snap.img}
          name={snap.name}
          eyebrow={`Tier ${sys.tier} · ${ENVIRONMENT_TYPE_LABELS[sys.kind] ?? sys.kind}`}
          description={sys.description}
          editable={ed}
          {editing}
          ontoggle={toggleEdit}
        />

        <nav class="actor-tabs" aria-label="Environment sheet sections">
          <button type="button" class:on={tab === "overview"} onclick={() => (tab = "overview")}>Overview</button>
          {#if editing}<button type="button" class:on={tab === "details"} onclick={() => (tab = "details")}>Details</button>{/if}
        </nav>

        {#if tab === "overview"}
          <section class="pnl"><div class="k">Difficulty</div><div class="environment-difficulty">{sys.difficultySpecial ? "Special" : sys.difficulty}</div></section>
          {#if sys.impulses}<section class="pnl"><div class="k">Impulses</div><p class="tx">{sys.impulses}</p></section>{/if}
          {#if sys.potentialAdversaries}<section class="pnl"><div class="k">Potential adversaries</div><div class="tx rich">{@html sys.potentialAdversaries}</div></section>{/if}
          <section class="pnl"><div class="k">Features<s>click a name to open · drag to move</s></div><FeatureList {doc} features={snap.of("feature")} editable={editing} canCreate={ed} /></section>
          {#if sys.notes}<section class="pnl"><div class="k">Notes</div><div class="tx rich">{@html sys.notes}</div></section>{/if}
        {:else}
          <section class="pnl"><div class="k">Identity</div><div class="actor-form">
            <label class="actor-field"><span>Tier</span><input type="number" min="1" max="4" value={sys.tier} onchange={(e) => set("system.tier", Math.min(4, Math.max(1, number(e, 1))))} /></label>
            <label class="actor-field"><span>Type</span><select value={sys.kind} onchange={(e) => set("system.kind", value(e))}>{#each ENVIRONMENT_TYPES as kind}<option value={kind}>{ENVIRONMENT_TYPE_LABELS[kind]}</option>{/each}</select></label>
          </div><div class="actor-form wide">
            <label class="actor-field"><span>Description</span><textarea value={sys.description} onchange={(e) => set("system.description", value(e))}></textarea></label>
            <label class="actor-field"><span>Impulses</span><textarea value={sys.impulses} onchange={(e) => set("system.impulses", value(e))}></textarea></label>
          </div></section>

          <section class="pnl"><div class="k">Difficulty</div><div class="actor-form">
            <label class="actor-field"><span>Value</span><input type="number" min="0" value={sys.difficulty} disabled={!!sys.difficultySpecial} onchange={(e) => set("system.difficulty", Math.max(0, number(e)))} /></label>
            <label class="actor-check"><input type="checkbox" checked={!!sys.difficultySpecial} onchange={(e) => set("system.difficultySpecial", e.currentTarget.checked)} /> Printed as “Special”</label>
          </div></section>

          <section class="pnl"><div class="k">Potential adversaries</div>{#key `${doc.id}:potential`}<Prose {doc} path="system.potentialAdversaries" value={sys.potentialAdversaries ?? ""} editable={ed && editing} height={120} />{/key}</section>
          <section class="pnl"><div class="k">Features<s>drop Items anywhere on the sheet</s></div><FeatureList {doc} features={snap.of("feature")} editable={editing} canCreate={ed} /></section>
          <section class="pnl"><div class="k">Notes</div>{#key `${doc.id}:notes`}<Prose {doc} path="system.notes" value={sys.notes ?? ""} editable={ed && editing} height={120} />{/key}</section>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .environment-difficulty{font:700 42px/1 var(--f-display);letter-spacing:-.05em;color:var(--ink)}
  .tx{margin:0;font:400 12px/1.62 var(--f-ui);color:var(--ink-2)}
  .rich :global(p){margin:.45em 0}
</style>
