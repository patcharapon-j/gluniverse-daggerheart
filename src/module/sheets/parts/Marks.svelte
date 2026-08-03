<script lang="ts">
  /**
   * A mark track — Hit Points, Stress, Armor Slots — or the fused damage
   * band with its thresholds.
   *
   * Mark changes go through `setMarks`, which diffs the row and animates only
   * the boxes that moved. Shape changes — maxima, shared span, or thresholds —
   * redraw the markup. Keeping those paths separate is not an optimisation: a
   * wound lands whole in 160ms and then bleeds for 340ms, and an element
   * replaced at 40ms takes its own animation with it.
   *
   * The box does not move. All the motion belongs to the mark.
   */

  /* eslint-disable @typescript-eslint/no-explicit-any */

  import { untrack } from "svelte";
  import { DAMAGE, MARKS, setMarks } from "../../ui/mark.js";
  import { markShapeSignature } from "./marks.ts";

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

  const markup = (marks: number) =>
    damage
      ? DAMAGE({
          major: damage.major,
          severe: damage.severe,
          massive: damage.massive ?? false,
          hp: total,
          marked: marks,
          label: label || "Damage",
          span,
        })
      : MARKS({ label, total, marked: marks, kind, head, vuln, span });

  const shape = () => markShapeSignature({ kind, label, total, span, head, vuln, damage });

  // Build once at mount. Later shape changes are handled below without making
  // ordinary mark changes recreate their own animated elements.
  const initial = untrack(() => markup(marked));

  let root: HTMLElement;
  let applied = untrack(() => marked);
  let appliedShape = untrack(shape);

  $effect(() => {
    const next = shape();
    if (!root || next === appliedShape) return;
    appliedShape = next;
    applied = marked;
    root.innerHTML = markup(marked);
  });

  $effect(() => {
    const next = marked;
    if (!root || next === applied) return;
    applied = next;
    const mk = root.querySelector(".mk");
    if (mk) setMarks(mk, next);
  });

  function click(event: MouseEvent) {
    if (!editable || !onset) return;
    const target = event.target as HTMLElement;

    /* The band takes a *hit*, so it adds rather than sets. "That's a Major"
       is what gets said at the table, and it means two more Hit Points on
       top of whatever is already marked — the zone's cost is a price, not a
       position. The boxes below say the other thing, and both gestures are
       on the same object because both are things a player does to it.

       Clamped rather than refused: a Severe on a character with one box left
       marks the one box. Whether that is death is the death move's question,
       and it is not one a click on the band should be answering. */
    const zone = target.closest<HTMLElement>(".band .z");
    if (zone) {
      const cost = Number(zone.dataset.hp);
      if (cost > 0) onset(Math.min(total, applied + cost));
      return;
    }

    const box = target.closest(".row > i");
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
