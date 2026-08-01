<script lang="ts">
  /**
   * A mark track — Hit Points, Stress, Armor Slots — or the fused damage
   * band with its thresholds.
   *
   * The markup is rendered **once** and never again. Every later change goes
   * through `setMarks`, which diffs the row and animates only the boxes that
   * moved. That is not an optimisation: a wound lands whole in 160ms and then
   * bleeds for 340ms, and an element replaced at 40ms takes its own animation
   * with it. `{@html}` on a reactive expression would do exactly that.
   *
   * The box does not move. All the motion belongs to the mark.
   */

  /* eslint-disable @typescript-eslint/no-explicit-any */

  import { untrack } from "svelte";
  import { DAMAGE, MARKS, setMarks } from "../../ui/mark.js";

  interface Props {
    /** "hp" | "stress" | "armor" — the material, not just the hue. */
    kind?: string;
    label?: string;
    total: number;
    marked: number;
    /** How many boxes the row is *sized* for. Hit Points and Stress sit in
        one column at 7 and 6; sized independently that is two box sizes
        stacked, which reads as two kinds of thing. They are the same box. */
    span?: number;
    head?: boolean;
    /** Draw the Vulnerable strip when the track fills. Stress only. */
    vuln?: boolean;
    /** Render the fused damage band above the row. */
    damage?: { major: number; severe: number; massive?: boolean };
    editable?: boolean;
    onset?: (n: number) => void;
  }

  let {
    kind = "hp",
    label = "",
    total,
    marked,
    span,
    head = true,
    vuln = false,
    damage,
    editable = true,
    onset,
  }: Props = $props();

  // untrack() is the point, not a workaround: this markup is built from the
  // values as they were at mount and must never be rebuilt from them again.
  // Anything that genuinely changes the *shape* of the row — a new maximum, a
  // new threshold — is handled by the caller keying the component instead.
  const initial = untrack(() =>
    damage
      ? DAMAGE({
          major: damage.major,
          severe: damage.severe,
          massive: damage.massive ?? false,
          hp: total,
          marked,
          label: label || "Damage",
          span,
        })
      : MARKS({ label, total, marked, kind, head, vuln, span }),
  );

  let root: HTMLElement;
  let applied = untrack(() => marked);

  $effect(() => {
    const next = marked;
    if (!root || next === applied) return;
    applied = next;
    const mk = root.querySelector(".mk");
    if (mk) setMarks(mk, next);
  });

  function click(event: MouseEvent) {
    if (!editable || !onset) return;
    const box = (event.target as HTMLElement).closest(".row > i");
    if (!box) return;
    const boxes = [...(root.querySelectorAll(".row > i") ?? [])];
    const i = boxes.indexOf(box as HTMLElement);
    if (i < 0) return;
    // Clicking the last marked box clears it; clicking anywhere else marks
    // up to and including it. Boxes fill from the left, which is how every
    // table already tracks them on paper.
    onset(i + 1 === applied ? i : i + 1);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div bind:this={root} onclick={click} class="dh-marks" class:ro={!editable}>
  {@html initial}
</div>

<style>
  .dh-marks {
    display: contents;
  }
</style>
