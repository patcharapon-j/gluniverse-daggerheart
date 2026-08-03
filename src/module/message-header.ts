/**
 * The envelope every object this system posts arrives in.
 *
 * A plate, a card and a rest are three finished objects and none of them is a
 * *message*. Who pressed the button, which character it was pressed for, when,
 * and how to take it back are facts about the message rather than about the
 * thing inside it — which is exactly why Foundry has a header for them, and
 * why this file dresses that header rather than drawing a second one.
 *
 * It used to be a caption *below* the object, one 8px mono line, on the
 * reasoning that a caption read before the thing it captions is a caption in
 * the wrong place. Two things were wrong with that. A log is scrolled back
 * through, and below-the-object means the name you are looking for sits
 * against the *next* message rather than the one it belongs to. And it named
 * one person where there are two: `.message-sender` is the speaker alias,
 * which is the character — so a card posted by a GM playing three NPCs, or by
 * a player from a shared actor, said nothing whatever about who pressed it.
 *
 * So: the character, the player, the time and the trash, on one line, above.
 *
 * **Nothing here is redrawn.** The alias, the timestamp and the whisper line
 * are Foundry's own elements, left where they are and restyled — the
 * timestamp especially, because `ChatLog#updateTimestamps` rewrites the text
 * of every `.message-timestamp` on a fifteen-second interval and a copy of it
 * would be the one line on the card that is quietly wrong an hour later.
 *
 * Two elements are added, and both are added because Foundry does not have
 * them:
 *
 * - **the player's name**, which is nowhere in the template. `alias` is the
 *   character; `message.author.name` is the person.
 * - **the trash**, which Foundry renders for GMs *only* — `canDelete ??=
 *   game.user.isGM` in `ChatMessage#renderHTML`. The permission is `OWNER`
 *   and the author owns their own message, so a player deleting a card they
 *   posted by mistake is allowed by the server and merely has no button. Ours
 *   is drawn for anyone `canUserModify` says may delete, which is the same
 *   test Foundry's own context menu uses, and Foundry's anchor is hidden so
 *   there is one control and one code path rather than two that can drift.
 *
 * The player's colour is carried as `--who` and used at full strength only on
 * the mark — a rhombus, the family shape — because a colour picker will hand
 * you `#000000` on a dark sheet sooner or later. The name itself is mixed
 * toward `--ink`, so the hue survives and the legibility does not depend on
 * the player having chosen well. See `.dhk` in `styles/frame.css`.
 *
 * The character is named twice on a duality roll — once here and once inside
 * the plate, which says who it belongs to on its own so that a card is still
 * readable when a module suppresses this header. That is the plate keeping a
 * promise rather than this header repeating itself, and it is worth the line:
 * a *posted card* names nobody at all, and that is the gap this closes.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SYSTEM_ID } from "./config.ts";

/** The four wrappers this system posts. See `frame.css`. */
const OURS = ".dh-plate, .dh-card, .dh-rest, .dh-ledger";

export function registerMessageHeaders(): void {
  Hooks.on("renderChatMessageHTML", (message: any, html: HTMLElement) => {
    if (!html.querySelector(OURS)) return;
    try {
      dress(message, html);
    } catch (err) {
      console.error(`${SYSTEM_ID} | could not dress a chat message header`, err);
    }
  });
}

/**
 * `User#color` is a `Color` in v13 and a string in anything that predates it,
 * and a user who has never opened the configuration has neither.
 */
function colorOf(author: any): string | null {
  const c = author?.color;
  if (!c) return null;
  return typeof c === "string" ? c : (c.css ?? c.toString?.() ?? null);
}

function dress(message: any, html: HTMLElement): void {
  const head = html.querySelector<HTMLElement>(".message-header");
  // Foundry hands out a fresh element per render, so this only ever guards
  // against a second pass over the same one — but a second pass would append
  // a second trash, which is the kind of thing that only shows up on the one
  // client that had the sidebar popped out.
  if (!head || head.classList.contains("dhk")) return;

  // `.dh` is where the palette is declared; the header sits outside
  // `.message-content` and therefore outside our own wrapper, so it has to
  // carry the root itself or every token on it resolves to nothing.
  head.classList.add("dh", "dhk");

  const author = message.author;
  const who = colorOf(author);
  if (who) head.style.setProperty("--who", who);

  const sender = head.querySelector<HTMLElement>(".message-sender");
  const alias = (message.alias ?? "").trim();
  const player = (author?.name ?? "").trim();

  /* One name, or two. `ChatMessage.getSpeaker` falls back to the user's own
     name when there is no actor — a GM's damage roll on a bare token, say —
     and printing "Patcharapon · PATCHARAPON" is the header answering a
     question with the same word twice. When that happens the single name *is*
     the player, so it takes the player's colour and the second slot is not
     drawn at all. */
  const named = player && alias.toLowerCase() !== player.toLowerCase();
  if (!named) head.classList.add("byplayer");

  /* The two names are moved into a box of their own, and that is a layout
     fact rather than a tidy one. The header wraps, because a whisper line
     needs a row to itself — and a wrapping flex container breaks a line
     before it shrinks anything on it, so a long enough character name did
     not ellipse, it took the player's name down to a second row with the
     separator hairline stranded at the head of it. Inside a box that does
     not wrap they shrink instead, and `.dhk-by` gives way first: the
     character is the answer to "whose card is this" and is not the part
     that goes. Same argument as `.pl-eye` on the plate itself. */
  if (sender) {
    const nm = document.createElement("span");
    nm.className = "dhk-nm";
    sender.before(nm);
    nm.append(sender);
    if (named) {
      const by = document.createElement("span");
      by.className = "dhk-by";
      by.textContent = player;
      nm.append(by);
    }
  }

  /* The relative time is the one anyone reads — "3 minutes ago" is what tells
     you whether this is the roll under discussion. The absolute one is what
     you want at 2am when the log is four hours long, so it is a tooltip
     rather than a second column. */
  const time = head.querySelector<HTMLElement>(".message-timestamp");
  if (time && message.timestamp) {
    time.dataset.tooltip = new Date(message.timestamp).toLocaleString();
  }

  const meta = head.querySelector<HTMLElement>(".message-metadata");
  if (meta && message.canUserModify?.(game.user, "delete")) {
    const label = game.i18n.localize("COMMON.Delete");
    const x = document.createElement("button");
    x.type = "button";
    x.className = "dhk-x";
    x.setAttribute("aria-label", label);
    x.dataset.tooltip = label;
    x.innerHTML = `<i class="fa-solid fa-trash" inert></i>`;
    x.addEventListener("click", (event) => {
      event.preventDefault();
      // Foundry's own anchor is delegated off the sidebar application, which
      // the floating notification is not part of. This is called directly so
      // the control means the same thing in both places.
      event.stopPropagation();
      void message.delete();
    });
    meta.append(x);
  }
}
