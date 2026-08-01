<script lang="ts">
  /**
   * The Hope pool — and, on the GM side, Fear.
   *
   * Same contract as {@link Marks}: rendered once, driven afterwards through
   * `setPool`, which diffs the row and animates only the pips that changed.
   * A spent Hope has an afterglow that outlives the click, and re-rendering
   * the row would cut it off mid-fade.
   *
   * A diamond is Hope and Fear and nothing else on this sheet.
   */

  /* eslint-disable @typescript-eslint/no-explicit-any */

  import { untrack } from "svelte";
  import { GEMS, setPool } from "../../ui/gem.js";

  interface Props {
    value: number;
    max: number;
    /** Scars eat slots off the end of the row permanently. */
    scars?: number;
    /** Violet, and glowing by pool size rather than per pip. */
    fear?: boolean;
    size?: number;
    gap?: number;
    /** "paper" tightens the bloom — it needs somewhere dark to fall. */
    ground?: "paper" | "dark";
    editable?: boolean;
    onset?: (n: number) => void;
  }

  let {
    value,
    max,
    scars = 0,
    fear = false,
    size = 32,
    gap = 10,
    ground = "paper",
    editable = true,
    onset,
  }: Props = $props();

  // untrack() is the point, not a workaround: this markup is built from the
  // values as they were at mount and must never be rebuilt from them again.
  const initial = untrack(() =>
    GEMS({ cur: value, max, scars, fear, sz: size, gap, ground }),
  );

  let root: HTMLElement;
  let applied = untrack(() => value);

  $effect(() => {
    const next = value;
    if (!root || next === applied) return;
    applied = next;
    const row = root.querySelector(".gems");
    if (row) setPool(row, next, { fear, max });
  });

  function click(event: MouseEvent) {
    if (!editable || !onset) return;
    const gem = (event.target as HTMLElement).closest(".gem");
    if (!gem || gem.classList.contains("scar")) return;
    const gems = [...(root.querySelectorAll(".gem") ?? [])];
    const i = gems.indexOf(gem as HTMLElement);
    if (i < 0) return;
    onset(i + 1 === applied ? i : i + 1);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div bind:this={root} onclick={click} class="dh-gems">
  {@html initial}
</div>

<style>
  .dh-gems {
    display: contents;
  }
</style>
