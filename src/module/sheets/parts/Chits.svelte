<script lang="ts">
  /**
   * A counter pool on the sheet.
   *
   * The third component to keep the render-once-drive-after contract, after
   * `Marks` and `Gems`, and for the third time the reason is the animation:
   * a chit drops over 200ms and settles, and a component that rebuilt its
   * markup on every actor update would cut that off at 40ms and replace the
   * object mid-flight. So the row is built exactly once and every later
   * change goes through `setChits`, which diffs the row against the number
   * and moves only what moved.
   *
   * **`slot` is what lets it live inside a builder's output.** The Features
   * panel is our own markup and the row goes straight in it, but a loadout
   * spine and a subclass tile are `{@html}` strings from `ui/tile.js` and
   * nothing can be rendered *into* one. So the component renders its row
   * detached and appends it to a selector the host names — the same shape as
   * `message-header.ts` dressing a header Foundry already drew, rather than
   * drawing a second one beside it.
   *
   * That also means the builder's string must not carry the number, which it
   * does not: nothing about a pool is passed to `SPINE` or `TILE`. The string
   * is therefore identical across a spend, `{@html}` compares it and skips,
   * and the row we appended is still standing there to be animated. `rev` is
   * the dependency that re-checks the one case where the string *does* change
   * — a rename, a new portrait — and re-parents the row into the fresh DOM.
   */

  /* eslint-disable @typescript-eslint/no-explicit-any */

  import { untrack } from "svelte";
  import { CHITS, CHIT_CAP, setChits } from "../../ui/chit.js";

  interface Props {
    value: number;
    /** Null for an open pool — no ceiling, so no sockets. */
    max: number | null;
    /** What one of them is called, for the controls' own labels. */
    name?: string;
    /** Handed back on `data-key` so the delegated handler knows the subject. */
    key?: string;
    /** The held count at which this host becomes one counter plus a multiplier. */
    cap?: number;
    /** Whether the host has a domain hue. Stated, never sniffed — see CHITS. */
    dom?: boolean;
    /** False for a readout. A record does not take input. */
    add?: boolean;
    /**
     * A selector to append to, searched from the anchor's own parent.
     * Omitted: the row renders where the component sits.
     *
     * Resolved from the parent rather than taken as an element, so a caller
     * inside an `{#each}` needs no `bind:this` per row — the component is
     * already standing next to the `{@html}` it is looking into.
     */
    slot?: string;
    /** The snapshot's revision — the dependency that re-checks parentage. */
    rev?: number;
  }

  let {
    value,
    max,
    name = "tokens",
    key = "",
    cap = CHIT_CAP,
    dom = false,
    add = true,
    slot = "",
    rev = 0,
  }: Props = $props();

  let mount = $state<HTMLElement | null>(null);
  let row: HTMLElement | null = null;

  /* Built from the value at first render and never from it again. `untrack`
     is what makes that true rather than merely intended: reading `value`
     here would put this effect on the value, and the row would be rebuilt —
     not diffed — on every spend, which is the whole thing being avoided. */
  const build = (): HTMLElement => {
    const box = document.createElement("div");
    box.innerHTML = CHITS({
      value: untrack(() => value),
      max: untrack(() => max) ?? 0,
      name,
      cap,
      dom,
      add,
      key,
    });
    return box.firstElementChild as HTMLElement;
  };

  $effect(() => {
    void rev; // re-check after any re-render of the host's markup
    if (!mount) return;
    const target = slot ? (mount.parentElement?.querySelector(slot) ?? null) : mount;
    if (!target) return;
    row ??= build();
    if (row.parentElement !== target) target.appendChild(row);
  });

  $effect(() => {
    const v = value;
    const m = max;
    if (row) setChits(row, v, m ?? 0);
  });
</script>

<!-- `display:contents` so the anchor is not a box: in a features row the chit
     row must itself be the flex item, and a wrapper around it would be the
     one the gap and the alignment applied to. With a `slot` the anchor draws
     nothing either way — it is only there to say where to look. -->
<span style="display:contents" bind:this={mount}></span>
