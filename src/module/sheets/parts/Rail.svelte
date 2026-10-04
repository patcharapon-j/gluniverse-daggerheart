<script lang="ts">
  /**
   * A compact card's counter rail on the sheet.
   *
   * `Chits`' contract, for the rail rather than a row under the card: the
   * contents are built exactly once and every later change goes through
   * `setRail`, which dims the light that was spent and tumbles the die that
   * was placed rather than swapping the whole column for one that has
   * already arrived.
   *
   * **It lives inside a builder's output.** `COMPACT` is an `{@html}` string
   * and draws only an empty `.dh-cc-rail` — the string must not carry the
   * numbers, or a spend would change it and `{@html}` would replace the card
   * under the animation. So the component builds its groups into a detached
   * `display:contents` holder and appends that to the rail it finds beside
   * its own anchor. `rev` is the dependency that re-parents the holder when
   * the string *does* change — a card becoming used, a rename — because then
   * the rail it was standing in has been replaced.
   */

  /* eslint-disable @typescript-eslint/no-explicit-any */

  import { untrack } from "svelte";
  import { RAIL, setRail } from "../../ui/counter.js";
  import type { CounterGroup } from "../cards.ts";

  interface Props {
    groups: CounterGroup[];
    /** False draws the rail inert: a card you may look at and not spend from. */
    live?: boolean;
    /** The snapshot's revision — the dependency that re-checks parentage. */
    rev?: number;
  }

  let { groups, live = true, rev = 0 }: Props = $props();

  let mount = $state<HTMLElement | null>(null);
  let holder: HTMLElement | null = null;

  const build = (): HTMLElement => {
    const box = document.createElement("span");
    box.className = "dh-cc-rail-in";
    box.style.display = "contents";
    box.innerHTML = RAIL(untrack(() => groups), { live: untrack(() => live) });
    return box;
  };

  const attach = (): boolean => {
    const rail = mount?.parentElement?.querySelector(".dh-cc-rail") ?? null;
    if (!rail) return false;
    holder ??= build();
    if (holder.parentElement !== rail) rail.appendChild(holder);
    return true;
  };

  /* `rev` is not the only thing that replaces the card. The sigils load after
     the first paint, and the card string changes when they arrive — so the
     rail the holder was standing in is swapped for an empty one with no
     revision to say so, and the card sits there with its counters gone until
     the actor next changes, which on a sheet just opened may be never. So the
     host watches its own card: any change to what stands beside the anchor
     re-attaches, which is a no-op when the holder is already home. The first
     mount gets a macrotask too, because the anchor can be standing in a
     fragment that has not been inserted yet — a timeout rather than a frame,
     for `swap.js`'s reason. */
  $effect(() => {
    void rev;
    if (!mount) return;
    if (!attach()) setTimeout(attach, 0);
  });

  $effect(() => {
    const host = mount?.parentElement;
    if (!host) return;
    const watch = new MutationObserver(() => {
      if (!holder?.isConnected || !holder.parentElement?.matches(".dh-cc-rail")) attach();
      else if (holder.parentElement !== host.querySelector(".dh-cc-rail")) attach();
    });
    watch.observe(host, { childList: true, subtree: true });
    return () => watch.disconnect();
  });

  $effect(() => {
    const g = groups;
    const l = live;
    if (holder) setRail(holder, g, { live: l });
  });
</script>

<span style="display:contents" bind:this={mount}></span>
