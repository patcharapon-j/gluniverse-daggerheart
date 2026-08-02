/**
 * One dialog shell, for the three that had to exist.
 *
 * This system had gone a long way without a modal, deliberately: a sheet you
 * press is better than a box that asks, and the refusals it does have — a
 * recall the Stress cannot pay, a Hope action above the purse — are answered
 * by the track flinching rather than by a dialog explaining itself over the
 * top of the number that already said no.
 *
 * Three things genuinely cannot be answered that way, and all three are the
 * same shape: **a decision with more than one part, taken once, that changes
 * the sheet underneath it.** Which two traits to raise. Whether to spend an
 * Armor Slot on damage you have just been dealt. Which downtime moves you are
 * making. Each is a sentence you are still composing rather than a record you
 * are editing — the same thing the roll popover is, at a size a popover
 * cannot hold.
 *
 * So they share a shell, and the shell's whole job is to be *ours*: `.dh` on
 * the root, so every rule the port wrote lands, and one place that knows how
 * to turn a form into a value. Foundry's DialogV2 does the window.
 *
 * `wire` is the half that matters. A dialog that lets you press OK and then
 * tells you the answer was wrong made you do the work twice; every one of
 * these knows what a legal answer looks like while you are giving it, so the
 * button is live exactly when the answer is.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface DhDialogOptions<T> {
  title: string;
  /** Body markup. Lands inside `.dh .dlg`, so the design's rules apply. */
  content: string;
  /** The affirmative button. */
  ok?: string;
  /** Left off for a dialog whose only answer is "yes" — the rest cancel. */
  cancel?: false;
  cancelLabel?: string;
  width?: number;
  /**
   * Live wiring: given the dialog's root and a way to enable the OK button.
   * Called once, after the content is in the document.
   */
  wire?: (root: HTMLElement, setOk: (enabled: boolean) => void) => void;
  /** Turn the settled form into the value this dialog resolves with. */
  read?: (root: HTMLElement) => T;
}

/**
 * @returns what `read` produced, or null on cancel, on Escape, and on the
 * window being closed. One null for every way out, because every way out is
 * the same answer — the caller should not have to tell "cancelled" from
 * "dismissed" to know it must not write anything.
 */
export async function dhDialog<T = true>(o: DhDialogOptions<T>): Promise<T | null> {
  let root: HTMLElement | null = null;
  let wired = false;

  const buttons: any[] = [
    {
      action: "ok",
      label: o.ok ?? game.i18n.localize("Confirm"),
      default: true,
      /* Boxed, and it has to be. `wait` resolves with the button's own action
         string when a callback returns nothing, so a dialog whose answer is
         itself a string — or an empty array, or `false` — would be
         indistinguishable from one that was dismissed. One wrapper object
         makes "there is an answer" and "the answer is falsy" two facts. */
      callback: () => ({ v: root && o.read ? o.read(root) : (true as unknown as T) }),
    },
  ];
  if (o.cancel !== false) {
    buttons.push({
      action: "cancel",
      label: o.cancelLabel ?? game.i18n.localize("Cancel"),
    });
  }

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: o.title },
    // `dh` carries the palette, exactly as it does on a sheet root; `dh-dlg`
    // carries this shell's own chrome.
    classes: ["dh", "dh-dlg"],
    position: { width: o.width ?? 460 },
    content: `<div class="dlg">${o.content}</div>`,
    buttons,
    // Escape and the close button resolve rather than throw. A rejection
    // would make every caller wrap this in a try, to learn nothing the null
    // does not already say.
    rejectClose: false,
    render: (_event: any, target: any) => {
      /* ApplicationV2 has handed the render callback three different things
         across as many majors — the application, its frame, its content. All
         three answer to one of these, so resolve rather than assume, and take
         the frame in every case: the buttons are the footer's and `wire` has
         to be able to reach them. */
      const el: HTMLElement | null =
        target instanceof HTMLElement ? target : (target?.element ?? null);
      root = (el?.closest?.(".application") as HTMLElement) ?? el;
      if (!root) return;

      /* `wait` binds this to the "render" event without `{once}`, so it fires
         again on any re-render — and a second pass would add a second click
         listener to every stepper, so one press would step twice. Nothing
         here re-renders today; the guard is what keeps that true if anything
         ever does. */
      if (wired) return;
      wired = true;

      const okBtn = root.querySelector<HTMLButtonElement>('button[data-action="ok"]');
      o.wire?.(root, (enabled) => {
        if (okBtn) okBtn.disabled = !enabled;
      });
    },
  });

  return result && typeof result === "object" && "v" in result ? (result.v as T) : null;
}
