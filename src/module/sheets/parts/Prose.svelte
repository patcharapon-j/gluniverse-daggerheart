<script lang="ts">
  /**
   * One rich-text field.
   *
   * Foundry's `<prose-mirror>` is a custom element that builds its own editor,
   * so it is mounted by hand rather than written into the template: Svelte
   * would render the tag, the element would build its children, and the next
   * render would find children it did not create and does not own. Handing it
   * an empty host and letting it fill it keeps that boundary clean — which is
   * the same reason the sheet mounts once and syncs rather than re-rendering.
   *
   * `toggled` means it shows the enriched, read-only prose until you press
   * edit. That is the right default for a biography: it is read at the table
   * far more often than it is written, and an always-live editor makes a
   * paragraph you are quoting look like a paragraph you are about to change.
   */

  /* eslint-disable @typescript-eslint/no-explicit-any */

  interface Props {
    doc: any;
    /** The update path, e.g. `system.biography.background`. */
    path: string;
    value: string;
    height?: number;
    editable?: boolean;
    /**
     * How to write it, when a dotted path cannot say it.
     *
     * `path` is the default writer and the right one for a SchemaField, which
     * is what every caller had until the item sheet arrived. A feature block
     * inside an ArrayField is the exception: Foundry reads a dotted index as a
     * path into an *object*, so `system.features.0.description` writes a shape
     * the reader does not expect — the trap the adjust tab already learned
     * about Experiences and `moveResource` learned about pools. Those callers
     * rewrite the whole array and hand us the writer.
     *
     * `path` is still passed either way, because it is also the editor
     * element's `name`.
     */
    onsave?: (value: string) => void;
  }
  let { doc, path, value, height = 240, editable = true, onsave }: Props = $props();

  let host: HTMLElement | undefined = $state();
  let el: any = null;
  /** The last value we wrote, so our own round-trip is not an outside change. */
  let mine: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Write what the editor currently holds, if it differs.
   *
   * There is no "committed" event to hang this on. `<prose-mirror>` fires
   * `input` on every keystroke and fires nothing at all when the editor is
   * closed and saved — so a naive `input` handler is one document update per
   * character, and a naive `change` handler never runs.
   *
   * So: debounce the typing, and flush for certain at the two moments an
   * edit can end — the toggle closing, and the sheet going away. Losing a
   * paragraph because the window was closed a second too early is the one
   * failure this field is not allowed to have.
   */
  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!el) return;
    const next: string = el.value ?? "";
    if (next === mine || next === (value ?? "")) return;
    mine = next;
    if (onsave) onsave(next);
    else void doc.update({ [path]: next });
  }

  async function build(raw: string) {
    if (!host) return;
    const TE = (foundry as any).applications.ux.TextEditor.implementation;
    // Enriched separately because the element takes both: the source for the
    // editor and the resolved HTML for the read view. `@UUID` links and
    // inline rolls are the whole reason a bio is HTML and not a string.
    const enriched = await TE.enrichHTML(raw, {
      relativeTo: doc,
      secrets: doc.isOwner,
      rollData: doc.getRollData?.() ?? {},
    });

    const next = (foundry as any).applications.elements.HTMLProseMirrorElement.create({
      name: path,
      value: raw,
      enriched,
      toggled: true,
      height,
      disabled: !editable,
    });
    next.addEventListener("input", () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 800);
    });
    // Closing the editor is a save. One frame later, because the element
    // writes its own value on the same click and we would otherwise read the
    // value it had before.
    next.addEventListener("click", (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest("button.toggle")) {
        requestAnimationFrame(flush);
      }
    });

    el = next;
    host.replaceChildren(next);
  }

  $effect(() => {
    const raw = value ?? "";
    if (!host) return;
    // Rebuilt only when the text genuinely changed underneath us. Every
    // actor update re-runs this effect, and rebuilding on each one would
    // throw away an open editor — including the one that caused the update.
    if (el && (raw === mine || raw === el.value)) return;
    void build(raw);
  });

  /* The other end an edit can come to: the tab changed, or the sheet closed,
     while the debounce was still pending. No dependencies, so this cleanup
     runs once, on unmount. */
  $effect(() => flush);
</script>

<div class="prose" bind:this={host}></div>

<style>
  /* The editor is Foundry's, so its own chrome comes with it and only needs
     placing on our paper. `:global` because the element builds its children
     itself and Svelte's scoping never reaches them. */
  .prose {
    background: var(--sunk);
    box-shadow: inset 0 0 0 1px var(--line);
  }

  .prose :global(.editor-content) {
    padding: 10px 12px;
    font: 400 12.5px/1.6 var(--f-ui);
    color: var(--ink-2);
  }

  /* Foundry hides the edit toggle until the field is hovered. That is fine
     in a dense form, where every row has one and you already know they are
     there. It is wrong here: these are three large, mostly empty panels, and
     a control you have to find by sweeping the mouse over a blank rectangle
     is a control most people will conclude does not exist. It is also the
     only thing on this tab you can press. So it stays up. */
  .prose :global(button.toggle) {
    display: block;
    top: 6px;
    right: 6px;
    width: auto;
    height: auto;
    padding: 4px 6px;
    color: var(--ink-3);
    background: transparent;
    border: 0;
    font-size: 11px;
  }
  .prose :global(button.toggle:hover) {
    color: var(--hope-tx);
    background: transparent;
  }

  /* An empty field still has to be a target you can find and press. Without
     this it is a 0px line with an edit button floating next to nothing. */
  .prose :global(.editor-content:empty)::after {
    content: "Nothing written yet.";
    color: var(--ink-4);
    font: 400 12.5px/1.6 var(--f-ui);
  }
</style>
