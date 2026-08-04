<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any */
  import {
    ADVERSARY_TYPES,
    ADVERSARY_TYPE_LABELS,
    DAMAGE_DICE,
    DAMAGE_TYPES,
    DAMAGE_TYPE_LABELS,
    RANGES,
    RANGE_LABELS,
  } from "../config.ts";
  import type { SheetState } from "../apps/sheet-state.svelte.ts";
  import { handleActorDrop } from "../apps/svelte-sheets.ts";
  import { rollAdversaryAttack, rollAdversaryDamage, rollAdversaryReaction } from "../dice/actions.ts";
  import ActorSheetHeader from "./parts/ActorSheetHeader.svelte";
  import FeatureList from "./parts/FeatureList.svelte";
  import Marks from "./parts/Marks.svelte";
  import Prose from "./parts/Prose.svelte";

  interface Props { doc: any; snap: SheetState; app: any }
  let { doc, snap }: Props = $props();

  let tab = $state<"overview" | "details">("overview");
  let editing = $state(false);
  const sys = $derived(snap.system);
  const ed = $derived(snap.editable);
  const dmg = $derived(sys.attack?.damage ?? { count: 1, dice: "d6", bonus: 0, type: "physical" });
  const notation = $derived(dmg.count
    ? `${dmg.count}${dmg.dice}${dmg.bonus ? `${dmg.bonus < 0 ? "" : "+"}${dmg.bonus}` : ""}`
    : `${dmg.bonus ?? 0}`);
  const sign = (n: number) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);
  const attackModifier = $derived(sys.attack?.modifierDice ? `+${sys.attack.modifierDice}` : sign(sys.attack?.modifier ?? 0));
  const set = (path: string, value: unknown) => ed && editing && doc.update({ [path]: value });
  const value = (event: Event) => (event.currentTarget as HTMLInputElement).value;
  const number = (event: Event, fallback = 0) => Math.round(Number(value(event)) || fallback);
  const toggleEdit = () => {
    editing = !editing;
    tab = editing ? "details" : "overview";
  };
  const editExperience = (index: number, key: string, next: unknown) => {
    if (!ed || !editing) return;
    const rows = (sys.experiences ?? []).map((row: any) => ({ ...row }));
    rows[index] = { ...rows[index], [key]: next };
    doc.update({ "system.experiences": rows });
  };
  const addExperience = () => set("system.experiences", [...(sys.experiences ?? []), { name: "", modifier: 2 }]);
  const removeExperience = (index: number) => set("system.experiences", (sys.experiences ?? []).filter((_x: any, i: number) => i !== index));
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="win actor-sheet foe"
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
          eyebrow={`Tier ${sys.tier} · ${ADVERSARY_TYPE_LABELS[sys.role] ?? sys.role}`}
          description={sys.description}
          editable={ed}
          {editing}
          ontoggle={toggleEdit}
        />

        <nav class="actor-tabs" aria-label="Adversary sheet sections">
          <button type="button" class:on={tab === "overview"} onclick={() => (tab = "overview")}>Overview</button>
          {#if editing}<button type="button" class:on={tab === "details"} onclick={() => (tab = "details")}>Details</button>{/if}
        </nav>

        {#if tab === "overview"}
          {#if sys.motives}
            <section class="pnl"><div class="k">Motives &amp; tactics</div><p class="tx">{sys.motives}</p></section>
          {/if}

          <section class="pnl">
            <div class="k">Statistics</div>
            <div class="actor-stat-grid">
              <div class="actor-stat"><span>Difficulty</span><b>{sys.difficulty}</b></div>
              <div class="actor-stat"><span>Thresholds</span><b>{sys.thresholds?.none ? "None" : `${sys.thresholds.major}/${sys.thresholds.severeNone ? "None" : sys.thresholds.severe}`}</b></div>
              <div class="actor-stat"><span>Attack</span><b>{attackModifier}</b></div>
            </div>
          </section>

          <section class="pnl">
            <div class="k">Damage &amp; stress</div>
            <!-- The band draws Minor, Major and Severe. A stat block with no
                 Severe rung has nothing to put in the third zone, so it takes
                 the plain row the minions take and the printed pair above
                 says what the one threshold is. -->
            {#key `${sys.resources?.hitPoints?.max}/${sys.resources?.stress?.max}/${sys.thresholds?.major}/${sys.thresholds?.severe}/${sys.thresholds?.severeNone}`}
              <Marks kind="hp" label="Hit Points" damage={sys.thresholds?.none || sys.thresholds?.severeNone ? undefined : { major: sys.thresholds.major, severe: sys.thresholds.severe }} total={sys.resources?.hitPoints?.max ?? 3} marked={sys.resources?.hitPoints?.marked ?? 0} span={Math.max(sys.resources?.hitPoints?.max ?? 3, sys.resources?.stress?.max ?? 3)} editable={ed} onset={(n) => ed && doc.update({ "system.resources.hitPoints.marked": n })} />
            {/key}
            {#key `${sys.resources?.stress?.max}/${sys.resources?.hitPoints?.max}`}
              <Marks kind="stress" label="Stress" total={sys.resources?.stress?.max ?? 3} marked={sys.resources?.stress?.marked ?? 0} span={Math.max(sys.resources?.hitPoints?.max ?? 3, sys.resources?.stress?.max ?? 3)} editable={ed} onset={(n) => ed && doc.update({ "system.resources.stress.marked": n })} />
            {/key}
          </section>

          <section class="pnl">
            <div class="k">{sys.attack?.name || "Attack"}<s>{RANGE_LABELS[sys.attack?.range] ?? sys.attack?.range} · {notation}</s></div>
            <div class="atk">
              <div class="wr">
                <span class="sl">d20</span><div class="id"><b>{sys.attack?.name || "Attack"}</b><span>unresolved roll</span></div>
                <button class="go" type="button" onclick={() => rollAdversaryAttack(doc)}><em>{attackModifier}</em><s>attack</s></button>
                <button class="go dm" type="button" onclick={() => rollAdversaryDamage(doc)}><em>{notation}</em><s>damage</s></button>
              </div>
              <div class="wr">
                <span class="sl">rxn</span><div class="id"><b>Reaction roll</b><span>no critical benefit</span></div>
                <button class="go" type="button" onclick={() => rollAdversaryReaction(doc)}><em>d20</em><s>react</s></button>
              </div>
              <div class="rd"></div>
            </div>
          </section>

          {#if (sys.experiences ?? []).length}
            <section class="pnl"><div class="k">Experience<s>costs 1 Fear</s></div><div class="xp">
              {#each sys.experiences as experience, i (i)}
                <button class="r" type="button" title="Spend a Fear to bring this in" onclick={() => rollAdversaryAttack(doc, { experiences: [{ name: experience.name, modifier: experience.modifier }] })}><b>{experience.name}</b><em>{sign(experience.modifier)}</em></button>
              {/each}
            </div></section>
          {/if}

          {#if sys.hordeDamage}<section class="pnl"><div class="k">Horde damage<s>when bloodied</s></div><p class="tx">{sys.hordeDamage}</p></section>{/if}
          <section class="pnl"><div class="k">Features<s>click a name to open · drag to move</s></div><FeatureList {doc} features={snap.of("feature")} editable={editing} canCreate={ed} /></section>
          {#if sys.notes}<section class="pnl"><div class="k">Notes</div><div class="tx rich">{@html sys.notes}</div></section>{/if}
        {:else}
          <section class="pnl"><div class="k">Identity</div><div class="actor-form">
            <label class="actor-field"><span>Tier</span><input type="number" min="1" max="4" value={sys.tier} onchange={(e) => set("system.tier", Math.min(4, Math.max(1, number(e, 1))))} /></label>
            <label class="actor-field"><span>Role</span><select value={sys.role} onchange={(e) => set("system.role", value(e))}>{#each ADVERSARY_TYPES as role}<option value={role}>{ADVERSARY_TYPE_LABELS[role]}</option>{/each}</select></label>
          </div><div class="actor-form wide">
            <label class="actor-field"><span>Description</span><textarea value={sys.description} onchange={(e) => set("system.description", value(e))}></textarea></label>
            <label class="actor-field"><span>Motives &amp; tactics</span><textarea value={sys.motives} onchange={(e) => set("system.motives", value(e))}></textarea></label>
          </div></section>

          <section class="pnl"><div class="k">Statistics</div><div class="actor-form">
            <label class="actor-field"><span>Difficulty</span><input type="number" min="0" value={sys.difficulty} onchange={(e) => set("system.difficulty", Math.max(0, number(e)))} /></label>
            <label class="actor-check"><input type="checkbox" checked={!!sys.thresholds?.none} onchange={(e) => set("system.thresholds.none", e.currentTarget.checked)} /> No damage thresholds</label>
            <label class="actor-field"><span>Major threshold</span><input type="number" value={sys.thresholds?.major ?? 0} disabled={!!sys.thresholds?.none} onchange={(e) => set("system.thresholds.major", number(e))} /></label>
            <label class="actor-check"><input type="checkbox" checked={!!sys.thresholds?.severeNone} disabled={!!sys.thresholds?.none} onchange={(e) => set("system.thresholds.severeNone", e.currentTarget.checked)} /> No Severe threshold</label>
            <label class="actor-field"><span>Severe threshold</span><input type="number" value={sys.thresholds?.severe ?? 0} disabled={!!sys.thresholds?.none || !!sys.thresholds?.severeNone} onchange={(e) => set("system.thresholds.severe", number(e))} /></label>
            <label class="actor-field"><span>Hit Point slots</span><input type="number" min="1" value={sys.resources?.hitPoints?.max ?? 3} onchange={(e) => set("system.resources.hitPoints.max", Math.max(1, number(e, 1)))} /></label>
            <label class="actor-field"><span>Stress slots</span><input type="number" min="0" value={sys.resources?.stress?.max ?? 3} onchange={(e) => set("system.resources.stress.max", Math.max(0, number(e)))} /></label>
          </div></section>

          <section class="pnl"><div class="k">Attack</div><div class="actor-form">
            <label class="actor-field"><span>Name</span><input value={sys.attack?.name ?? ""} onchange={(e) => set("system.attack.name", value(e))} /></label>
            <label class="actor-field"><span>Modifier</span><input type="number" value={sys.attack?.modifier ?? 0} onchange={(e) => set("system.attack.modifier", number(e))} /></label>
            <label class="actor-field"><span>Modifier dice</span><input value={sys.attack?.modifierDice ?? ""} placeholder="e.g. 2d4" onchange={(e) => set("system.attack.modifierDice", value(e))} /></label>
            <label class="actor-field"><span>Range</span><select value={sys.attack?.range} onchange={(e) => set("system.attack.range", value(e))}>{#each RANGES as range}<option value={range}>{RANGE_LABELS[range]}</option>{/each}</select></label>
            <label class="actor-field"><span>Damage dice</span><input type="number" min="0" value={dmg.count} onchange={(e) => set("system.attack.damage.count", Math.max(0, number(e)))} /></label>
            <label class="actor-field"><span>Damage die</span><select value={dmg.dice} onchange={(e) => set("system.attack.damage.dice", value(e))}>{#each DAMAGE_DICE as die}<option value={die}>{die}</option>{/each}</select></label>
            <label class="actor-field"><span>Damage bonus</span><input type="number" value={dmg.bonus} onchange={(e) => set("system.attack.damage.bonus", number(e))} /></label>
            <label class="actor-field"><span>Damage type</span><select value={dmg.type} onchange={(e) => set("system.attack.damage.type", value(e))}>{#each DAMAGE_TYPES as type}<option value={type}>{DAMAGE_TYPE_LABELS[type]}</option>{/each}</select></label>
            <label class="actor-check"><input type="checkbox" checked={!!dmg.direct} onchange={(e) => set("system.attack.damage.direct", e.currentTarget.checked)} /> Direct damage (ignores Armor)</label>
            <label class="actor-field"><span>Horde damage</span><input value={sys.hordeDamage ?? ""} placeholder="Reduced expression when bloodied" onchange={(e) => set("system.hordeDamage", value(e))} /></label>
          </div></section>

          <section class="pnl"><div class="k">Experiences</div><div class="actor-list">
            {#each sys.experiences ?? [] as experience, i (i)}<div class="actor-list__row"><input aria-label="Experience name" value={experience.name} onchange={(e) => editExperience(i, "name", value(e))} /><input aria-label="Experience modifier" type="number" value={experience.modifier} onchange={(e) => editExperience(i, "modifier", number(e))} /><button type="button" aria-label="Remove experience" onclick={() => removeExperience(i)}>×</button></div>{/each}
            <button type="button" class="actor-add" onclick={addExperience}>+ experience</button>
          </div></section>

          <section class="pnl"><div class="k">Features<s>drop Items anywhere on the sheet</s></div><FeatureList {doc} features={snap.of("feature")} editable={editing} canCreate={ed} /></section>
          <section class="pnl"><div class="k">Notes</div>{#key doc.id}<Prose {doc} path="system.notes" value={sys.notes ?? ""} editable={ed && editing} height={120} />{/key}</section>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .tx{margin:0;font:400 12px/1.6 var(--f-ui);color:var(--ink-2)}
  .rich :global(p){margin:.45em 0}
  .xp .r,.wr .go{height:auto;min-height:0;border:0;padding:0;font:inherit;text-align:inherit;cursor:pointer}
</style>
