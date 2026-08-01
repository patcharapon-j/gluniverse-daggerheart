<script lang="ts">
  /**
   * The environment stat block — a stat block for a place.
   *
   * It has a Difficulty and features, and that is most of it. The rest is
   * prompts for the GM, which is why the sheet is mostly prose: impulses and
   * potential adversaries are things you read, not things you roll.
   */

  /* eslint-disable @typescript-eslint/no-explicit-any */

  import { ENVIRONMENT_TYPE_LABELS } from "../config.ts";
  import type { SheetState } from "../apps/sheet-state.svelte.ts";
  import { handleActorDrop } from "../apps/svelte-sheets.ts";

  interface Props {
    doc: any;
    snap: SheetState;
    app: any;
  }
  let { doc, snap }: Props = $props();

  const sys = $derived(snap.system);
  const ed = $derived(snap.editable);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="win"
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
        <div class="env-hd">
          <span class="eyebrow"
            >Tier {sys.tier} · {ENVIRONMENT_TYPE_LABELS[sys.kind] ?? sys.kind}</span
          >
          <b>{snap.name}</b>
          <p>{sys.description}</p>
        </div>

        <div class="pnl">
          <div class="k">Difficulty</div>
          <!-- A few environments print "Special" rather than a number. That
               is an absent Difficulty, not a zero one. -->
          <div class="env-dc">{sys.difficultySpecial ? "Special" : sys.difficulty}</div>
        </div>

        {#if sys.impulses}
          <div class="pnl">
            <div class="k">Impulses</div>
            <p class="tx">{sys.impulses}</p>
          </div>
        {/if}

        {#if sys.potentialAdversaries}
          <div class="pnl">
            <div class="k">Potential adversaries</div>
            <div class="tx">{@html sys.potentialAdversaries}</div>
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
  .env-hd {
    padding: 16px 18px 14px;
    background: var(--sunk);
    border-bottom: 1px solid var(--line);
  }
  .env-hd .eyebrow {
    display: block;
    font: 700 8.5px/1 var(--f-mono);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--hope-tx);
    margin-bottom: 7px;
  }
  .env-hd b {
    display: block;
    font: 700 20px/1.05 var(--f-display);
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .env-hd p {
    margin: 7px 0 0;
    font: 400 12px/1.5 var(--f-ui);
    color: var(--ink-2);
  }
  .env-dc {
    font: 700 34px/1 var(--f-display);
    letter-spacing: -0.04em;
    color: var(--ink);
  }
  .tx {
    font: 400 12px/1.55 var(--f-ui);
    color: var(--ink-2);
    margin: 0;
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
    color: var(--hope-tx);
  }
</style>
