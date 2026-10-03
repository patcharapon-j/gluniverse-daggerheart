import { fitSoon } from "./fit-cards.ts";

/** Chat hooks can run while the sidebar or notification is hidden. Measure
 * only once a card has a width, and refit when that width changes.
 *
 * It is also where a card's *other* post-layout work is let go of. A posted
 * card now carries a ResizeObserver of its own — `frameArt`, following the
 * frame the painting is cropped into — and the question "has this card been
 * detached" already has one answer here, watching `body` for removals. A
 * second observer asking it would be a second answer to maintain, and the one
 * that drifted would be the one holding the node. */
const watched = new Map<
  HTMLElement,
  { width: number; done?: () => void; release?: () => void }
>();
let resize: ResizeObserver | undefined;
let removal: MutationObserver | undefined;

/**
 * @param done    played once the card has actually been measured.
 * @param release torn down once the card leaves the document.
 */
export function watchChatCard(
  card: HTMLElement,
  done?: () => void,
  release?: () => void,
): void {
  if (!resize) {
    resize = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const card = entry.target as HTMLElement;
        const state = watched.get(card);
        if (!state) continue;
        const width = entry.contentRect.width;
        if (width === state.width) continue;
        state.width = width;
        if (width <= 0) continue;
        fitSoon(card, () => {
          state.done?.();
          state.done = undefined;
        });
      }
    });
    // Message replacement, deletion, and closing a popout all detach cards.
    // Stop observing those nodes so the shared observer cannot retain them.
    removal = new MutationObserver((records) => {
      if (!records.some((record) => record.removedNodes.length)) return;
      for (const card of watched.keys()) {
        if (card.isConnected) continue;
        resize!.unobserve(card);
        watched.get(card)?.release?.();
        watched.delete(card);
      }
      if (!watched.size) {
        resize!.disconnect();
        removal!.disconnect();
        resize = undefined;
        removal = undefined;
      }
    });
    removal.observe(document.body, { childList: true, subtree: true });
  }
  watched.set(card, { width: 0, done, release });
  resize.observe(card);
}
