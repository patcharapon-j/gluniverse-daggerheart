<script lang="ts">
  /**
   * The adversary stat block.
   *
   * Deliberately not a character sheet with the player parts removed. There
   * are no traits, no domains and no Hope. An adversary is a Difficulty
   * others roll against, one attack modifier, two short tracks, and features
   * that fire when the GM spends the spotlight on it — so the sheet is
   * shaped like the printed block rather than like a character.
   */

  /* eslint-disable @typescript-eslint/no-explicit-any */

  import { ADVERSARY_TYPE_LABELS, RANGE_LABELS } from "../config.ts";
  import type { SheetState } from "../apps/sheet-state.svelte.ts";
  import { handleActorDrop } from "../apps/svelte-sheets.ts";
  import { rollAdversaryAttack, rollAdversaryDamage, rollAdversaryReaction } from "../dice/actions.ts";
  import Marks from "./parts/Marks.svelte";

  interface Props {
    doc: any;
    snap: SheetState;
    app: any;
  }
  let { doc, snap }: Props = $props();

  const sys = $derived(snap.system);
  const ed = $derived(snap.editable);
  const set = (path: string, v: unknown) => ed && doc.update({ [path]: v });
  const sign = (n: number) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);

  const dmg = $derived(sys.attack?.damage ?? { count: 1, dice: "d6", bonus: 0, type: "physical" });
  const notation = $derived(`${dmg.count}${dmg.dice}${dmg.bonus ? `+${dmg.bonus}` : ""}`);

  const target = $derived([...(game.user?.targets ?? [])][0] ?? null);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="win foe"
  style="--w:100%"
  ondrop={(e) => {
    e.preventDefault();
    if (ed) handleActorDrop(doc, e);
  }}
  ondragover={(e) => e.preventDefault()}
>
  <div class="bd" style="--h:100%">
    <div class="pane">
      <div class="scr">
        <!-- the head: name, tier and role, and the one sentence the block
             opens with. -->
        <div class="foe-hd">
          <span class="eyebrow"
            >Tier {sys.tier} · {ADVERSARY_TYPE_LABELS[sys.role] ?? sys.role}</span
          >
          <b>{snap.name}</b>
          <p>{sys.description}</p>
          {#if sys.motives}
            <p class="mot"><i>Motives &amp; Tactics:</i> {sys.motives}</p>
          {/if}
        </div>

        <!-- the numbers, in the order the block prints them -->
        <div class="pnl">
          <div class="k">Statistics</div>
          <div class="foe-nums">
            <div class="n">
              <span class="k">Difficulty</span>
              <b>{sys.difficulty}</b>
            </div>
            <div class="n">
              <span class="k">Thresholds</span>
              <b>{sys.thresholds?.none ? "None" : `${sys.thresholds.major}/${sys.thresholds.severe}`}</b>
            </div>
            <div class="n">
              <span class="k">Attack</span>
              <b>{sign(sys.attack?.modifier ?? 0)}</b>
            </div>
          </div>
        </div>

        <div class="pnl">
          <div class="k">Damage &amp; stress</div>
          {#key `${sys.resources?.hitPoints?.max}/${sys.resources?.stress?.max}/${sys.thresholds?.major}/${sys.thresholds?.severe}`}
            <Marks
              kind="hp"
              label="Hit Points"
              damage={sys.thresholds?.none
                ? undefined
                : { major: sys.thresholds.major, severe: sys.thresholds.severe }}
              total={sys.resources?.hitPoints?.max ?? 3}
              marked={sys.resources?.hitPoints?.marked ?? 0}
              span={Math.max(sys.resources?.hitPoints?.max ?? 3, sys.resources?.stress?.max ?? 3)}
              editable={ed}
              onset={(n) => set("system.resources.hitPoints.marked", n)}
            />
          {/key}
          {#key `${sys.resources?.stress?.max}/${sys.resources?.hitPoints?.max}`}
            <Marks
              kind="stress"
              label="Stress"
              total={sys.resources?.stress?.max ?? 3}
              marked={sys.resources?.stress?.marked ?? 0}
              span={Math.max(sys.resources?.hitPoints?.max ?? 3, sys.resources?.stress?.max ?? 3)}
              editable={ed}
              onset={(n) => set("system.resources.stress.marked", n)}
            />
          {/key}
        </div>

        <!-- the attack. Two buttons, because the target's thresholds decide
             what the damage number means and the attack card must not
             pretend to know them. -->
        <div class="pnl">
          <div class="k">
            {sys.attack?.name || "Attack"}<s
              >{RANGE_LABELS[sys.attack?.range] ?? sys.attack?.range} · {notation}</s
            >
          </div>
          <div class="atk">
            <div class="wr">
              <span class="sl">d20</span>
              <div class="id">
                <b>{sys.attack?.name || "Attack"}</b>
                <span>
                  {target ? `vs ${target.actor?.name} — evasion ${target.actor?.system?.evasion?.value ?? "?"}` : "no target selected"}
                </span>
              </div>
              <button
                class="go"
                type="button"
                onclick={() => rollAdversaryAttack(doc, { target })}
              >
                <em>{sign(sys.attack?.modifier ?? 0)}</em><s>attack</s>
              </button>
              <button class="go dm" type="button" onclick={() => rollAdversaryDamage(doc)}>
                <em>{notation}</em><s>damage</s>
              </button>
            </div>
            <div class="wr">
              <span class="sl">rxn</span>
              <div class="id">
                <b>Reaction roll</b>
                <!-- A critical on an adversary reaction has no added benefit
                     at all, so it takes no material either. Nothing is being
                     announced. -->
                <span>no critical benefit</span>
              </div>
              <button class="go" type="button" onclick={() => rollAdversaryReaction(doc)}>
                <em>d20</em><s>react</s>
              </button>
            </div>
            <div class="rd"></div>
          </div>
        </div>

        {#if (sys.experiences ?? []).length}
          <div class="pnl">
            <div class="k">Experience</div>
            <div class="xp">
              {#each sys.experiences as x, i (i)}
                <button
                  class="r"
                  type="button"
                  title="Spend a Fear to bring this in"
                  onclick={() =>
                    rollAdversaryAttack(doc, {
                      target,
                      experiences: [{ name: x.name, modifier: x.modifier }],
                    })}
                >
                  <b>{x.name}</b><em>{sign(x.modifier)}</em>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <div class="pnl">
          <div class="k">Features</div>
          <div class="stack">
            {#each snap.of("feature") as f (f.id)}
              <div class="feat">
                <b>{f.name}</b><i class="kind">{f.system.kind}</i>
                <div class="tx">{@html f.system.description}</div>
              </div>
            {:else}
              <p class="ach">No features.</p>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .foe-hd {
    padding: 16px 18px 14px;
    background: var(--sunk);
    border-bottom: 1px solid var(--line);
  }
  .foe-hd .eyebrow {
    display: block;
    font: 700 8.5px/1 var(--f-mono);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--fear-tx);
    margin-bottom: 7px;
  }
  .foe-hd b {
    display: block;
    font: 700 20px/1.05 var(--f-display);
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .foe-hd p {
    margin: 7px 0 0;
    font: 400 12px/1.5 var(--f-ui);
    color: var(--ink-2);
  }
  .foe-hd .mot i {
    font-style: normal;
    font-weight: 600;
    color: var(--ink);
  }
  .foe-nums {
    display: flex;
    gap: 1px;
    background: var(--line);
  }
  .foe-nums .n {
    flex: 1 1 0;
    background: var(--paper);
    padding: 9px 4px 10px;
    text-align: center;
  }
  .foe-nums .n .k {
    display: block;
    font: 700 8px/1 var(--f-mono);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .foe-nums .n b {
    display: block;
    margin-top: 6px;
    font: 700 22px/1 var(--f-display);
    letter-spacing: -0.04em;
    color: var(--ink);
  }
  .feat {
    background: var(--sunk);
    padding: 9px 12px 10px;
  }
  .feat b {
    font: 600 12.5px/1.3 var(--f-ui);
    color: var(--ink);
  }
  .feat .kind {
    margin-left: 7px;
    font: 700 8px/1 var(--f-mono);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-style: normal;
    color: var(--fear-tx);
  }
  .feat .tx {
    margin-top: 4px;
    font: 400 11.5px/1.5 var(--f-ui);
    color: var(--ink-2);
  }
  .xp .r {
    border: 0;
    cursor: pointer;
    font: inherit;
    text-align: inherit;
  }
</style>
