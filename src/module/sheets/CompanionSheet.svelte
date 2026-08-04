<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any */
  import { DAMAGE_DICE, DAMAGE_TYPES, DAMAGE_TYPE_LABELS, RANGES, RANGE_LABELS } from "../config.ts";
  import type { SheetState } from "../apps/sheet-state.svelte.ts";
  import { handleActorDrop } from "../apps/svelte-sheets.ts";
  import { rollDamage } from "../dice/rolls.ts";
  import ActorSheetHeader from "./parts/ActorSheetHeader.svelte";
  import FeatureList from "./parts/FeatureList.svelte";
  import Marks from "./parts/Marks.svelte";
  import Prose from "./parts/Prose.svelte";

  interface Props { doc: any; snap: SheetState; app: any }
  let { doc, snap }: Props = $props();

  const TRAINING = [
    ["intelligent", "Intelligent", 3], ["lightInTheDark", "Light in the Dark", 3],
    ["creatureComfort", "Creature Comfort", 1], ["armored", "Armored", 1],
    ["vicious", "Vicious", 3], ["resilient", "Resilient", 3],
    ["bonded", "Bonded", 1], ["aware", "Aware", 3],
  ] as const;

  let tab = $state<"overview" | "details">("overview");
  let editing = $state(false);
  const sys = $derived(snap.system);
  const ed = $derived(snap.editable);
  const dmg = $derived(sys.attack?.damage ?? { count: 1, dice: "d6", bonus: 0, type: "physical" });
  const notation = $derived(`${dmg.count}${dmg.dice}${dmg.bonus ? `+${dmg.bonus}` : ""}`);
  const sign = (n: number) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);
  const set = (path: string, next: unknown) => ed && editing && doc.update({ [path]: next });
  const value = (event: Event) => (event.currentTarget as HTMLInputElement).value;
  const number = (event: Event, fallback = 0) => Math.round(Number(value(event)) || fallback);
  const toggleEdit = () => { editing = !editing; tab = editing ? "details" : "overview"; };
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="win actor-sheet companion"
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
          eyebrow={sys.species || "Companion"}
          description={sys.description}
          descriptionHtml
          editable={ed}
          {editing}
          ontoggle={toggleEdit}
        />

        <nav class="actor-tabs" aria-label="Companion sheet sections">
          <button type="button" class:on={tab === "overview"} onclick={() => (tab = "overview")}>Overview</button>
          {#if editing}<button type="button" class:on={tab === "details"} onclick={() => (tab = "details")}>Details</button>{/if}
        </nav>

        {#if tab === "overview"}
          <section class="pnl"><div class="k">Defence</div><div class="companion-defence">
            <div class="companion-evasion"><span>Evasion</span><b>{sys.evasion?.value ?? 10}</b></div>
            <div class="companion-stress">{#key sys.resources?.stress?.max}<Marks kind="stress" label="Stress" total={sys.resources?.stress?.max ?? 3} marked={sys.resources?.stress?.marked ?? 0} editable={ed} onset={(n) => ed && doc.update({ "system.resources.stress.marked": n })} />{/key}</div>
          </div></section>

          <section class="pnl"><div class="k">{sys.attack?.name || "Attack"}<s>{RANGE_LABELS[sys.attack?.range] ?? sys.attack?.range}</s></div><div class="atk">
            <div class="wr"><span class="sl">dmg</span><div class="id"><b>{sys.attack?.name || "Attack"}</b><span>{notation} {DAMAGE_TYPE_LABELS[dmg.type] ?? dmg.type}</span></div>
              <button class="go dm" type="button" onclick={() => rollDamage({ actor: doc, label: sys.attack?.name || "Attack", count: dmg.count, die: dmg.dice, mods: dmg.bonus ? [{ k: "modifier", v: dmg.bonus }] : [], damageType: dmg.type })}><em>{dmg.count}{dmg.dice}</em><s>damage</s></button>
            </div><div class="rd"></div>
          </div></section>

          {#if sys.experience?.name}<section class="pnl"><div class="k">Experience</div><div class="xp"><div class="r"><b>{sys.experience.name}</b><em>{sign(sys.experience.modifier)}</em></div></div></section>{/if}

          {#if TRAINING.some(([key]) => (sys.training?.[key] ?? 0) > 0)}
            <section class="pnl"><div class="k">Training</div><div class="training-readout">{#each TRAINING.filter(([key]) => (sys.training?.[key] ?? 0) > 0) as [key, label]}<span><b>{label}</b><i>{sys.training?.[key]}</i></span>{/each}</div></section>
          {/if}
          <section class="pnl"><div class="k">Features<s>click a name to open · drag to move</s></div><FeatureList {doc} features={snap.of("feature")} editable={editing} canCreate={ed} /></section>
          {#if sys.notes}<section class="pnl"><div class="k">Notes</div><div class="tx rich">{@html sys.notes}</div></section>{/if}
        {:else}
          <section class="pnl"><div class="k">Identity</div><div class="actor-form">
            <label class="actor-field"><span>Species</span><input value={sys.species ?? ""} onchange={(e) => set("system.species", value(e))} /></label>
            <label class="actor-field"><span>Partner UUID</span><input value={sys.partner ?? ""} placeholder="Actor.xxxxx" onchange={(e) => set("system.partner", value(e) || null)} /></label>
          </div></section>
          <section class="pnl"><div class="k">Description</div>{#key `${doc.id}:description`}<Prose {doc} path="system.description" value={sys.description ?? ""} editable={ed && editing} height={120} />{/key}</section>

          <section class="pnl"><div class="k">Defence</div><div class="actor-form">
            <label class="actor-field"><span>Evasion base</span><input type="number" value={sys.evasion?.base ?? 10} onchange={(e) => set("system.evasion.base", number(e, 10))} /></label>
            <label class="actor-field"><span>Evasion bonus</span><input type="number" value={sys.evasion?.bonus ?? 0} onchange={(e) => set("system.evasion.bonus", number(e))} /></label>
            <label class="actor-field"><span>Stress slots</span><input type="number" min="0" value={sys.resources?.stress?.max ?? 3} onchange={(e) => set("system.resources.stress.max", Math.max(0, number(e)))} /></label>
          </div></section>

          <section class="pnl"><div class="k">Attack</div><div class="actor-form">
            <label class="actor-field"><span>Name</span><input value={sys.attack?.name ?? ""} onchange={(e) => set("system.attack.name", value(e))} /></label>
            <label class="actor-field"><span>Range</span><select value={sys.attack?.range} onchange={(e) => set("system.attack.range", value(e))}>{#each RANGES as range}<option value={range}>{RANGE_LABELS[range]}</option>{/each}</select></label>
            <label class="actor-field"><span>Damage dice</span><input type="number" min="1" value={dmg.count} onchange={(e) => set("system.attack.damage.count", Math.max(1, number(e, 1)))} /></label>
            <label class="actor-field"><span>Damage die</span><select value={dmg.dice} onchange={(e) => set("system.attack.damage.dice", value(e))}>{#each DAMAGE_DICE as die}<option value={die}>{die}</option>{/each}</select></label>
            <label class="actor-field"><span>Damage bonus</span><input type="number" value={dmg.bonus} onchange={(e) => set("system.attack.damage.bonus", number(e))} /></label>
            <label class="actor-field"><span>Damage type</span><select value={dmg.type} onchange={(e) => set("system.attack.damage.type", value(e))}>{#each DAMAGE_TYPES as type}<option value={type}>{DAMAGE_TYPE_LABELS[type]}</option>{/each}</select></label>
          </div></section>

          <section class="pnl"><div class="k">Experience</div><div class="actor-form">
            <label class="actor-field"><span>Name</span><input value={sys.experience?.name ?? ""} onchange={(e) => set("system.experience.name", value(e))} /></label>
            <label class="actor-field"><span>Modifier</span><input type="number" value={sys.experience?.modifier ?? 2} onchange={(e) => set("system.experience.modifier", number(e, 2))} /></label>
          </div></section>

          <section class="pnl"><div class="k">Training<s>advancement ranks</s></div><div class="actor-training">
            {#each TRAINING as [key, label, max]}<label class="actor-field"><span>{label}</span><input type="number" min="0" {max} value={sys.training?.[key] ?? 0} onchange={(e) => set(`system.training.${key}`, Math.min(max, Math.max(0, number(e))))} /></label>{/each}
          </div></section>

          <section class="pnl"><div class="k">Features<s>drop Items anywhere on the sheet</s></div><FeatureList {doc} features={snap.of("feature")} editable={editing} canCreate={ed} /></section>
          <section class="pnl"><div class="k">Notes</div>{#key `${doc.id}:notes`}<Prose {doc} path="system.notes" value={sys.notes ?? ""} editable={ed && editing} height={120} />{/key}</section>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .companion-defence{display:grid;grid-template-columns:150px minmax(0,1fr);gap:20px;align-items:center}
  .companion-evasion{min-height:112px;display:flex;flex-direction:column;justify-content:center;align-items:center;background:var(--sunk);clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%)}
  .companion-evasion span{font:700 8px/1 var(--f-mono);letter-spacing:.17em;text-transform:uppercase;color:var(--ink-3)}
  .companion-evasion b{margin-top:8px;font:700 44px/1 var(--f-display);letter-spacing:-.06em;color:var(--ink)}
  .training-readout{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
  .training-readout span{display:flex;align-items:center;gap:8px;background:var(--sunk);padding:9px 11px}.training-readout b{font:600 11.5px/1.3 var(--f-ui);color:var(--ink-2)}.training-readout i{margin-left:auto;font:700 12px/1 var(--f-mono);font-style:normal;color:var(--hope-tx)}
  .tx{margin:0;font:400 12px/1.62 var(--f-ui);color:var(--ink-2)}.rich :global(p){margin:.45em 0}
  .xp .r,.wr .go{height:auto;min-height:0;border:0;padding:0;font:inherit;text-align:inherit;cursor:pointer}
  @container (max-width:430px){.companion-defence{grid-template-columns:1fr}.training-readout{grid-template-columns:1fr}}
</style>
