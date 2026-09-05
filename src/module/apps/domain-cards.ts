import { contentChoiceAllowed } from "../gunslinger.ts";
/**
 * Taking a domain card, wherever the reason came from.
 *
 * Three surfaces want the same thing and want it for three different reasons,
 * and the reason is the *only* thing that differs between them:
 *
 *   the advancement option  "choose an additional domain card of your level or
 *                           lower (up to level 4)" — capped at the lower of
 *                           your level and the tier's top, recorded against
 *                           the box so unmarking gives it back.
 *   the level card          step 4 of the printed level-up, one at every
 *                           level, capped at the level that owed it, recorded
 *                           against that level.
 *   the vault's "+ card"    no rule at all — the drag-in gesture with the
 *                           compendium's own filter attached. Nothing to
 *                           record, because nothing bought it.
 *
 * So the ceiling is an argument rather than something worked out in here: a
 * function that decided which of the three it was serving by inspecting its
 * caller would be three rules pretending to be one. What is shared is the rest
 * of the question — which cards are legal, what a card looks like while you are
 * choosing it, and where the chosen one lands.
 *
 * It sat inside `advance.ts` while two of the three callers were levelling up.
 * The third is not, and a vault button reaching into a file whose first line
 * says "levelling up, applied rather than recorded" would be lying about what
 * it was doing.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { DOMAIN_CONFIG, LOADOUT_LIMIT } from "../config.ts";
import { cardOf, loadSigils } from "../sheets/cards.ts";
import { CARD } from "../ui/card.js";
import { fromPack } from "./creation.ts";
import { dialogPeeks } from "./dialog-peek.ts";
import { dhDialog } from "./dialog.ts";

/**
 * A domain card something took: which one, and who made it.
 *
 * `made` is what tells a give-back what it may do. A card this flow *created*
 * goes back with the thing that bought it; a card it merely **adopted** — one
 * already on the sheet, named as the answer to "which card did that box buy" —
 * is released and the document stays, because deleting it would be the sheet
 * binning somebody's document over a rule it was not asked to police. Same
 * argument `cascadeOf` makes in `creation.ts`.
 *
 * The name rides alongside the id so a record can name a document that has
 * gone.
 */
export interface TakenCard {
  id: string;
  name: string;
  made: boolean;
}

export interface TakeOptions {
  /**
   * Whether cards already on the sheet may be *named* rather than taken.
   *
   * True for anything keeping a record — the advancement box and the level
   * card — because the character who levelled up before those records existed
   * has their card already and the honest answer is to say which. False for
   * the vault's own button, where there is no record to fill in and offering
   * a card you are holding as something to add is offering you nothing.
   */
  adopt?: boolean;
}

/**
 * Take a domain card, from your domains, at `cap` or lower.
 *
 * What makes a card legal is the same three rules `cardRefusal` states for
 * creation — your domains, the ceiling, and not one you already hold —
 * restated here rather than imported because the ceiling differs and a shared
 * predicate taking it as an argument would be one function pretending two
 * rules are one.
 *
 * Only legal cards are offered. That is a departure from `pickTwo`'s
 * constrain-the-offer-and-say-why, and the reason is arithmetic: a deck of 189
 * cards drawn dead with a sentence each is not a list anybody reads, and the
 * two rules being enforced are already stated in the hint above it. What the
 * dialog *does* keep from that rule is that it never validates after the fact.
 */
export async function takeDomainCard(
  actor: any,
  cap: number,
  { adopt = true }: TakeOptions = {},
): Promise<TakenCard | null> {
  const domains: string[] = actor.system?.domainList ?? [];
  if (!domains.length) {
    ui.notifications?.warn(game.i18n.localize("DAGGERHEART.Warning.NoClass"));
    return null;
  }

  const held = adopt ? unclaimedCards(actor) : [];
  const names = new Set(
    actor.items
      .filter((i: any) => i.type === "domainCard")
      .map((i: any) => String(i.name).toLowerCase()),
  );

  const pool = (await fromPack("domains", "domainCard"))
    .filter(
      (c: any) =>
        domains.includes(c.system?.domain) &&
        Number(c.system?.level ?? 1) <= cap &&
        !names.has(String(c.name).toLowerCase()),
    )
    .sort(
      (a: any, b: any) =>
        String(a.system?.domain).localeCompare(String(b.system?.domain)) ||
        (a.system?.level ?? 1) - (b.system?.level ?? 1) ||
        String(a.name).localeCompare(String(b.name)),
    );

  if (!pool.length && !held.length) {
    ui.notifications?.warn(game.i18n.format("DAGGERHEART.Warning.NoCardsLeft", { level: cap }));
    return null;
  }

  const picked = await pickCard(cap, held, pool);
  if (!picked) return null;

  /* Adopting: nothing is created, and the record simply says that this box is
     what paid for a card already on the sheet. */
  if (picked.startsWith("held:")) {
    const item = actor.items.get(picked.slice(5));
    if (!item) return null;
    return { id: item.id, name: item.name, made: false };
  }

  const source = pool.find((c: any) => c.id === picked.slice(5));
  if (!source) return null;
  const card = await grantCard(actor, source);
  return card ? { id: card.id, name: card.name, made: true } : null;
}

/**
 * Domain cards on this sheet that nothing has accounted for.
 *
 * Three records say where a card came from — creation, an advancement box, and
 * a level — so what is left over is exactly the set a player put here
 * themselves, which is the set the retroactive claim is asking about. All three
 * are subtracted, or two of them would both say they bought the same card.
 */
function unclaimedCards(actor: any): any[] {
  const ids = (source: any): string[] =>
    Object.values(source ?? {})
      .map((c: any) => c?.card?.id ?? c?.id)
      .filter(Boolean) as string[];

  const spoken = new Set<string>([
    ...(actor.system?.creation?.granted ?? []),
    ...ids(actor.system?.advancementChoices),
    ...ids(actor.system?.levelCards),
  ]);
  return actor.items.filter((i: any) => i.type === "domainCard" && !spoken.has(i.id));
}

/**
 * Create the card, into the loadout if there is room.
 *
 * Same call `takeCard` makes at creation and `handleActorDrop` makes for a card
 * dragged in: a card you have just chosen is a card you are holding, and
 * putting it in the vault would charge you Stress to recall something you have
 * never used. The loadout being full is not a refusal — it is a card in the
 * vault and a sheet you can rearrange.
 */
async function grantCard(actor: any, card: any): Promise<any> {
  if (!contentChoiceAllowed(card)) return null;
  const limit = actor.system?.loadoutLimit ?? LOADOUT_LIMIT;
  const held = actor.items.filter(
    (i: any) => i.type === "domainCard" && i.system?.inLoadout,
  ).length;

  const source = card.toObject();
  source.system.inLoadout = held < limit;

  const [made] = (await actor.createEmbeddedDocuments("Item", [source])) ?? [];
  if (made) {

    ui.notifications?.info(
      game.i18n.format("DAGGERHEART.Advance.TookCard", {
        name: made.name,
        where: game.i18n.localize(
          source.system.inLoadout ? "DAGGERHEART.Advance.ToLoadout" : "DAGGERHEART.Advance.ToVault",
        ),
      }),
    );
  }
  return made ?? null;
}


/**
 * Add a card, for no reason but wanting it.
 *
 * The vault's own button. Every other caller here is settling an account — a
 * box that was marked, a level that was reached — and this one is not: it is
 * the gesture of dragging a card in off the compendium, with the compendium's
 * 189 cards already filtered down to the ones you may legally take. So the
 * ceiling is simply your level, nothing is recorded, and nothing is offered
 * for adoption, because a card already on the sheet is not something to add.
 *
 * `ed` rather than edit mode gates it on the sheet, which is the same call
 * the gear tab's "+ new" makes and for the same reason: taking a card is a
 * deliberate gesture in a way a click on a number is not, and a player who is
 * handed one mid-session should not have to unlock the sheet to write it down.
 */
export const addDomainCard = (actor: any): Promise<TakenCard | null> =>
  takeDomainCard(actor, Number(actor?.system?.level ?? 1), { adopt: false });

/* ══════════════════════════════════════════════════════════════════════
   PICKING A CARD

   One from a list, and the list has two halves that mean different things.
   The compendium's half *gives* you a card. The other half — cards already on
   this sheet that nothing has accounted for — only names one, and it is there
   for the character who levelled up before any of these records existed and
   dragged their card in by hand. Both answer "which card was that", so both
   are the same control and one press answers it.

   The second half is usually absent, and that is the point rather than an
   optimisation: creation, the advancement boxes and the levels all record what
   they took, so a character made since has nothing left over and the dialog is
   one plain list. The vault's own button suppresses it outright — nothing is
   being accounted for there, and a card you are already holding is not
   something to add. A heading that only appears when there is something under
   it is a heading; one that is always there is furniture.

   Radios rather than checkboxes, because the rule says *a* domain card, and
   the count enforcement `pickTwo` needs is what a radio group is.

   ── and every row peeks the card ──────────────────────────────────────
   `pickTwo`'s rows are a trait and an Experience: a name, a number, and
   nothing else to know. This one's rows stand for *printed objects*, and a
   name with "Grace · Lv 2 · Recall 1" beside it is the one thing a domain card
   is not — its whole identity is a paragraph of rules text, and the row cannot
   carry that at any width without becoming a card badly.

   So it becomes a card, properly: the sheet's own peek, `CARD` into `.pkc`
   through `sheet.css`'s `.peeklayer`, hover to show and click to pin, exactly
   as hovering a spine in the loadout behaves. This is the rules panel's
   argument in `rule-cards.ts` reaching a second surface, and it is the same
   machinery rather than a copy — see `dialog-peek.ts`.

   Which is also why the cards arrive in `wire` rather than in `content`: they
   carry inline `<svg>` sigils, and DialogV2 strips SVG out of `content`
   exactly as Foundry strips it out of stored chat message content. `fit()`
   cannot measure a card that is not in the document either, so both problems
   have the same answer and it is the one `damage.ts` already reached.
   ══════════════════════════════════════════════════════════════════════ */

async function pickCard(cap: number, held: any[], pool: any[]): Promise<string | null> {
  const esc = foundry.utils.escapeHTML;
  const sig = await loadSigils();

  /* The layer, built alongside the rows so a row and its card share a key.
     `attr` and not raw interpolation: `art` is `--art:url("…")`, quotes and
     all, and the first one inside would end the style attribute — the failure
     `rule-cards.ts` documents, which reads as a card with the wrong picture
     rather than as broken markup. */
  const cards: string[] = [];
  const peekFor = (c: any): string => {
    const opts = cardOf(snapshotOf(c), sig);
    if (!opts) return "";
    const key = `c${cards.length}`;
    cards.push(
      `<div class="pkc${opts.noart ? " noart" : ""}" data-peek="${key}" style="${attr(
        opts.art ?? "",
      )}">${CARD(opts)}</div>`,
    );
    return key;
  };

  const note = (card: any) =>
    [
      DOMAIN_CONFIG[card.system?.domain]?.label ?? card.system?.domain ?? "—",
      `Lv ${card.system?.level ?? 1}`,
      `Recall ${card.system?.recallCost ?? 0}`,
    ].join(" · ");

  const row = (c: any, prefix: string) => {
    const key = peekFor(c);
    return `<label class="pick"${key ? ` data-peek="${key}"` : ""}>
      <input type="radio" name="pick" value="${esc(`${prefix}:${c.id}`)}">
      <b>${esc(c.name)}</b>
      <s>${esc(note(c))}</s>
    </label>`;
  };

  const list = (cs: any[], prefix: string) =>
    `<div class="picks">${cs.map((c) => row(c, prefix)).join("")}</div>`;

  const body: string[] = [
    `<p class="ach">${esc(game.i18n.format("DAGGERHEART.Advance.CardHint", { level: cap }))}</p>`,
  ];
  if (held.length) {
    body.push(
      `<p class="ach"><b>${esc(game.i18n.localize("DAGGERHEART.Advance.CardHeld"))}</b></p>`,
      list(held, "held"),
      `<p class="ach"><b>${esc(game.i18n.localize("DAGGERHEART.Advance.CardPool"))}</b></p>`,
    );
  }
  body.push(list(pool, "pack"));

  return dhDialog<string | null>({
    title: game.i18n.localize("DAGGERHEART.Advance.CardTitle"),
    content: `${body.join("")}<div class="peeklayer"></div>`,
    ok: game.i18n.localize("DAGGERHEART.Advance.Take"),
    width: 520,
    /* Nothing is preselected, and that is the trait spread's argument rather
       than an omission: this choice is permanent, it is met once, and a
       default on a permanent choice is a default that gets accepted. */
    wire: (html, setOk) => {
      const boxes = [...html.querySelectorAll<HTMLInputElement>('input[name="pick"]')];
      const sync = () => setOk(boxes.some((b) => b.checked));
      for (const b of boxes) b.addEventListener("change", sync);
      sync();

      const layer = html.querySelector<HTMLElement>(".peeklayer");
      if (!layer || !cards.length) return;
      layer.innerHTML = cards.join("");
      dialogPeeks({ root: html, layer, rows: ".pick[data-peek]", pin: false });
    },
    read: (html) =>
      html.querySelector<HTMLInputElement>('input[name="pick"]:checked')?.value ?? null,
  });
}

/**
 * What `cardOf` reads, from either kind of document.
 *
 * The pool is compendium documents and the held half is owned Items, and
 * `cardOf` takes the sheet's `ItemSnapshot` — a plain value. Both answer to the
 * five fields it actually reads, so this is a widening rather than a
 * conversion, and stating it is what keeps the two halves of the list drawn by
 * one function.
 */
const snapshotOf = (c: any): any => ({
  id: c.id,
  uuid: c.uuid ?? "",
  name: c.name,
  type: c.type,
  img: c.img,
  sort: 0,
  system: c.system,
});

/** See the note on the identical escaper in `rule-cards.ts`. */
const attr = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
