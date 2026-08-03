<script lang="ts">
  /**
   * A tray of kept dice on the sheet.
   *
   * `Chits.svelte` with one thing changed, and everything about the shape is
   * that component's: render once, drive after, mount into a `slot` the host
   * names so the row can live inside a `{@html}` string without being
   * rebuilt by it. See `Chits.svelte` for why all three of those are
   * load-bearing — the argument is identical and repeating it here would
   * make it look like two arguments.
   *
   * The one thing changed is the **state**. A chit pool is a number, so the
   * driving effect reads two scalars and `setChits` diffs arithmetic. A tray
   * is a list of faces, so the effect has to read the list — and a list is a
   * new array reference on every snapshot, which would re-run the effect on
   * every actor update whether or not a die moved. Hence `sig`: the faces
   * joined into a string, which is a scalar and compares by value. Without
   * it a Seraph's four Prayer Dice would tumble every time somebody else at
   * the table marked a Stress.
   */

  /* eslint-disable @typescript-eslint/no-explicit-any */

  import { untrack } from "svelte";
  import { KEEP, KEEP_CAP, setKeep } from "../../ui/keep.js";

  interface Props {
    mode?: "bag" | "climb" | "roll";
    faces?: number;
    dice: number[];
    /** Null for an open pool — no ceiling, so no sockets. */
    max: number | null;
    name?: string;
    key?: string;
    cap?: number;
    dom?: boolean;
    add?: boolean;
    /** False where the card's dice arrive already rolled — Prayer Dice. */
    roll?: boolean;
    slot?: string;
    rev?: number;
  }

  let {
    mode = "bag",
    faces = 6,
    dice,
    max,
    name = "dice",
    key = "",
    cap = KEEP_CAP,
    dom = false,
    add = true,
    roll = true,
    slot = "",
    rev = 0,
  }: Props = $props();

  let mount = $state<HTMLElement | null>(null);
  let row: HTMLElement | null = null;

  /**
   * The scalar the driving effect actually depends on.
   *
   * `max` is in it as well as the faces, because a ceiling is not a constant:
   * Prayer Dice are "equal to your Spellcast trait" and a Seraph has no such
   * trait until the subclass card lands, which is after this row was built.
   * Left out, the tray drew whatever the ceiling was on its first frame and
   * never again — no sockets, forever, on a card whose whole job is to say
   * how many you may hold. Proficiency and tier move at every advancement.
   */
  const sig = $derived(`${faces}:${max}:${(dice ?? []).join(",")}`);

  const build = (): HTMLElement => {
    const box = document.createElement("div");
    box.innerHTML = KEEP({
      mode,
      faces: untrack(() => faces),
      dice: untrack(() => dice) ?? [],
      max: untrack(() => max) ?? 0,
      name,
      cap,
      dom,
      add,
      roll,
      key,
    });
    return box.firstElementChild as HTMLElement;
  };

  $effect(() => {
    void rev;
    if (!mount) return;
    const target = slot ? (mount.parentElement?.querySelector(slot) ?? null) : mount;
    if (!target) return;
    row ??= build();
    if (row.parentElement !== target) target.appendChild(row);
  });

  $effect(() => {
    void sig;
    if (row)
      setKeep(
        row,
        untrack(() => dice) ?? [],
        untrack(() => faces),
        untrack(() => max) ?? 0,
      );
  });
</script>

<span style="display:contents" bind:this={mount}></span>
