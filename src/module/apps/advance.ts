/**
 * Levelling up, applied rather than recorded.
 *
 * The advancement tab has always been a truthful ledger and an inert one: you
 * marked "permanently gain one Stress slot" and the Stress track did not
 * change, so the sheet held a note saying you had a thing and a rail saying
 * you did not. Every one of those had to be carried across to the rail by
 * hand, which is the arithmetic a digital sheet exists to stop.
 *
 * The nine printed options split cleanly in two, and the split is the whole
 * design here:
 *
 *   **Numbers** — a Hit Point slot, a Stress slot, +1 Evasion, +1 Proficiency.
 *   Nothing to decide. These are not written at all: `data/actors.ts` derives
 *   them from the marks, so the box *is* the record and unmarking it is
 *   exactly as safe as marking it.
 *
 *   **Decisions** — which two traits, which two Experiences, which card,
 *   which subclass, which second class. The sheet cannot guess and must not.
 *   These ask, apply the answer, and store the answer so that taking the box
 *   back can undo precisely what that box did.
 *
 * **The domain card moved across that line**, and the reason is that it was
 * the only acquisition with a *closed* set of legal answers. "Drag one in" is
 * the right answer for a subclass card, which you take one of three of and
 * which the compendium sorts by class, and for a second class, which is nine
 * documents. It was never the right answer for a domain card: what is legal is
 * your domains — plural, and multiclassing makes it three or four — crossed
 * with a level ceiling that is *not* your level but the tier's, and a player
 * dragging from a 189-card pack has none of that in front of them. So the sheet
 * knew the rule, the box marked it, and nobody was told. Marking it now asks
 * which, exactly as the trait option does.
 *
 * The other two acquisitions still only mark, because a dialog is not a better
 * compendium when the compendium is already the right shape.
 *
 * ── and the card that is not an advancement at all ────────────────────
 * **Every level hands over a domain card**, beside the two choices rather than
 * as one of them. That is step 4 of the printed level-up, and the advancement
 * table says so out loud in a word nobody had read: "choose an **additional**
 * domain card" is additional to *this* one. Two rules were missing here rather
 * than one, and this is the larger of them — it fires at every level where the
 * option fires once a tier. See REACHING A LEVEL below.
 *
 * ── the character who levelled up before this existed ─────────────────
 * Two records, one answer, and the answer is that nothing is repaired behind
 * anybody's back.
 *
 * A **marked box** with no record of what it bought is not an error state — the
 * card may well be on the sheet already, dragged in by hand months ago. So it
 * says so on its own row and offers the picker, and the picker offers both
 * halves of the honest answer: take one from the compendium, or *name the one
 * you already hold*. Adopting creates nothing; it records that this box is what
 * paid for that card.
 *
 * A **level** reached before the record existed is simply absent from it, and
 * absent means owed nothing. So an old character is asked about their next
 * level and about no other, rather than being handed a bill for a campaign's
 * worth of levels they have already played.
 *
 * Which is also why what a give-back gives back depends on which happened. A
 * card this flow created goes with it. A card it merely adopted is *released* —
 * the record goes and the document stays, because deleting it would be this
 * panel binning somebody's document over a rule it was not asked to police.
 * Same argument `cascadeOf` makes in `creation.ts`.
 *
 * The picker itself is `domain-cards.ts`. It has a third caller that is not
 * levelling up at all — the vault's own "+ card" — which is why it is not here.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ADVANCEMENT,
  STARTING_EXPERIENCE_MODIFIER,
  TRAITS,
  TRAIT_LABELS,
  tierTopLevel,
  type AdvancementId,
  type AdvancementTier,
} from "../config.ts";
import { dhDialog } from "./dialog.ts";
import { takeDomainCard, type TakenCard } from "./domain-cards.ts";

export type { TakenCard };

/** One taken instance of one option, as `advancementChoices` keys it. */
export const choiceKey = (tier: number, option: number, n: number) => `${tier}:${option}:${n}`;

/* ══════════════════════════════════════════════════════════════════════
   TAKING AND GIVING BACK
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Move one option from `from` marks to `to` marks, applying the difference.
 *
 * The advancement count is written *through* here rather than around it, so
 * there is one path and no way to mark a box without its consequence.
 * Returns false when the change was refused — a picker cancelled, or no legal
 * traits left — and then nothing at all is written, which is why cancelling
 * leaves the box where it was rather than marking it and doing nothing.
 *
 * Everything a *field* accumulates into one `update` object and lands in one
 * write. The whole point is that a level-up is a single change to a character:
 * a half-applied one, with the box marked and the traits not, is precisely the
 * state this exists to make impossible.
 *
 * A domain card is the one thing here that cannot ride in that object, because
 * it is an embedded document rather than a field. So it is created up front —
 * the id is what gets stored, and the id does not exist until the document does
 * — and `made` is what a later refusal in the same call takes back. Nothing can
 * be left behind: either the write lands with every card it named, or every
 * card this call created is gone again.
 */
export async function setAdvancement(
  actor: any,
  tier: AdvancementTier,
  option: number,
  from: number,
  to: number,
): Promise<boolean> {
  const def = tier.options[option];
  if (!def) return false;

  const update: Record<string, unknown> = {
    [`system.advancement.${tier.tier}.${option}`]: Math.max(0, to),
  };
  const choices = foundry.utils.deepClone(actor.system.advancementChoices ?? {});

  /** Documents this call created, to be taken back if it is refused. */
  const made: string[] = [];
  /** Documents a give-back has to remove, once the write has landed. */
  const doomed: string[] = [];

  /* Taking, one instance at a time. Three marks on the trait option is three
     separate pairs, and asking for all six at once would let you pick a trait
     you had marked in the same breath. `pending` is what makes the second ask
     see the first one's answer. */
  for (let n = from + 1; n <= to; n++) {
    const chosen = await ask(actor, tier, def.id, update);
    if (!chosen) {
      await unmake(actor, made);
      return false;
    }
    if (chosen.card?.made) made.push(chosen.card.id);
    choices[choiceKey(tier.tier, option, n)] = chosen;
  }

  /* Giving back, newest first — so unmarking down to one undoes the third and
     then the second, which is what clicking a box means everywhere else on
     this sheet. */
  for (let n = from; n > to; n--) {
    const key = choiceKey(tier.tier, option, n);
    const chosen = choices[key];
    if (chosen) revert(actor, def.id, chosen, update, doomed);
    delete choices[key];
  }

  /* Every other give-back on this tab is a number going back where it was,
     and those need no asking: the box *is* the record, and putting it back
     is exactly as safe as marking it. A card is not a number. This is the
     one unmark that destroys a document, and the sheet already confirms
     that same act on the gear tab — same act, same manners, and it names
     the card because a dialog asking "are you sure?" is asking about
     whatever you think you clicked. Refusing writes nothing at all, so the
     box stays marked rather than being marked and hollow. */
  if (doomed.length && !(await confirmLoss(actor, doomed))) return false;

  update["system.advancementChoices"] = choices;
  await actor.update(update);
  await unmake(actor, doomed);
  return true;
}

/**
 * Record what an already-marked box took, without moving the box.
 *
 * The retroactive half, and the only entry point that writes a choice for a
 * mark it did not make. It exists for one option — see the note at the head of
 * this file — and refuses the rest rather than doing something plausible with
 * them: a trait advancement claimed after the fact would have to guess which
 * two traits the +1s are already sitting on, and guessing wrong there silently
 * changes two numbers.
 */
export async function claimAdvancement(
  actor: any,
  tier: AdvancementTier,
  option: number,
  n: number,
): Promise<boolean> {
  if (tier.options[option]?.id !== "domainCard") return false;

  const card = await takeDomainCard(actor, optionCap(actor, tier));
  if (!card) return false;
  const chosen: Chosen = { card };

  const choices = foundry.utils.deepClone(actor.system.advancementChoices ?? {});
  choices[choiceKey(tier.tier, option, n)] = chosen;
  await actor.update({ "system.advancementChoices": choices });
  return true;
}

/** Delete documents by id, tolerating ones that have already gone. */
async function unmake(actor: any, ids: string[]): Promise<void> {
  const kill = ids.filter((id) => actor.items.get(id));
  if (kill.length) await actor.deleteEmbeddedDocuments("Item", kill);
}

/** Name what an unmark would destroy, and ask. Nothing is named twice. */
async function confirmLoss(actor: any, ids: string[]): Promise<boolean> {
  const names = [...new Set(ids.map((id) => actor.items.get(id)?.name).filter(Boolean))];
  if (!names.length) return true;
  return foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("DAGGERHEART.Delete.Title") },
    content: `<p>${foundry.utils.escapeHTML(
      game.i18n.format("DAGGERHEART.Delete.Body", { name: names.join(", ") }),
    )}</p>`,
    modal: true,
  });
}

/* ── the three that ask ───────────────────────────────────────────────── */

/**
 * The advancement option's ceiling: your level, or the tier's top, whichever
 * is lower.
 *
 * The **level card**'s ceiling is a different number — the level that owed it —
 * and the two being different is why `takeDomainCard` takes a ceiling rather
 * than working one out. Both read "of your level or lower"; only the clause
 * after it differs.
 */
const optionCap = (actor: any, tier: AdvancementTier): number =>
  Math.min(Number(actor.system?.level ?? 1), tierTopLevel(tier));

type Chosen = { traits?: string[]; experiences?: number[]; card?: TakenCard };

async function ask(
  actor: any,
  tier: AdvancementTier,
  id: AdvancementId,
  update: Record<string, unknown>,
): Promise<Chosen | null> {
  if (id === "traits") return askTraits(actor, update);
  if (id === "experiences") return askExperiences(actor, update);
  if (id === "domainCard") {
    const card = await takeDomainCard(actor, optionCap(actor, tier));
    return card ? { card } : null;
  }
  // Everything else is either a derived number or a document you drag in.
  // Both are legitimately nothing to do here, so both succeed silently.
  return {};
}

/**
 * "Gain a +1 bonus to two unmarked character traits and mark them."
 *
 * Unmarked is the load-bearing word and the reason this is a picker rather
 * than a pair of steppers: the mark is what stops the same trait being raised
 * twice in one tier, and it is cleared on entering the next. So the dialog
 * offers only what is legal, and refuses rather than truncating when fewer
 * than two are left — a tier that has run out of traits is a real state and
 * silently raising one is not a smaller version of raising two.
 */
async function askTraits(actor: any, update: Record<string, unknown>): Promise<Chosen | null> {
  const traits = pending(actor, update, "system.traits", actor.system.traits);
  const open = TRAITS.filter((t) => !traits[t]?.marked);

  if (open.length < 2) {
    ui.notifications?.warn(
      game.i18n.format("DAGGERHEART.Warning.NoUnmarkedTraits", { left: open.length }),
    );
    return null;
  }

  const picked = await pickTwo(
    game.i18n.localize("DAGGERHEART.Advance.TraitsTitle"),
    game.i18n.localize("DAGGERHEART.Advance.TraitsHint"),
    open.map((t) => ({
      value: t,
      label: TRAIT_LABELS[t] ?? t,
      note: `now ${sign(traits[t]?.value ?? 0)}`,
    })),
  );
  if (!picked) return null;

  const next = foundry.utils.deepClone(traits);
  for (const t of picked) next[t] = { value: (next[t]?.value ?? 0) + 1, marked: true };
  update["system.traits"] = next;
  return { traits: picked };
}

/** "Permanently gain a +1 bonus to two Experiences." */
async function askExperiences(
  actor: any,
  update: Record<string, unknown>,
): Promise<Chosen | null> {
  const list = pending(actor, update, "system.experiences", actor.system.experiences ?? []);

  if (list.length < 2) {
    ui.notifications?.warn(game.i18n.localize("DAGGERHEART.Warning.NotEnoughExperiences"));
    return null;
  }

  const picked = await pickTwo(
    game.i18n.localize("DAGGERHEART.Advance.ExperiencesTitle"),
    game.i18n.localize("DAGGERHEART.Advance.ExperiencesHint"),
    list.map((x: any, i: number) => ({
      value: String(i),
      label: x.name || "—",
      note: `now ${sign(x.modifier ?? 0)}`,
    })),
  );
  if (!picked) return null;

  const next = foundry.utils.deepClone(list);
  const idx = picked.map(Number);
  for (const i of idx) next[i] = { ...next[i], modifier: (next[i].modifier ?? 0) + 1 };
  update["system.experiences"] = next;
  return { experiences: idx };
}

/** Undo what one stored choice did. */
function revert(
  actor: any,
  id: AdvancementId,
  chosen: Chosen,
  update: Record<string, unknown>,
  doomed: string[],
): void {
  if (id === "domainCard" && chosen.card) {
    /* Made, not adopted. A card this box created goes back with it; a card it
       only claimed is released and left where it is, because it was somebody's
       document before this box named it and it stays one after. */
    if (chosen.card.made) doomed.push(chosen.card.id);
    return;
  }
  if (id === "traits" && chosen.traits) {
    const traits = pending(actor, update, "system.traits", actor.system.traits);
    const next = foundry.utils.deepClone(traits);
    for (const t of chosen.traits) {
      next[t] = { value: (next[t]?.value ?? 0) - 1, marked: false };
    }
    update["system.traits"] = next;
    return;
  }
  if (id === "experiences" && chosen.experiences) {
    const list = pending(actor, update, "system.experiences", actor.system.experiences ?? []);
    const next = foundry.utils.deepClone(list);
    for (const i of chosen.experiences) {
      if (next[i]) next[i] = { ...next[i], modifier: (next[i].modifier ?? 0) - 1 };
    }
    update["system.experiences"] = next;
  }
}

/**
 * The value a field will have *after* this update, rather than the one it has
 * now. Three marks on the trait option is three writes to `system.traits` in
 * one update object, and each has to build on the last — reading the actor
 * each time would have the third overwrite the first two.
 */
const pending = (actor: any, update: Record<string, unknown>, path: string, fallback: any) =>
  (update[path] as any) ?? foundry.utils.deepClone(fallback);

const sign = (n: number) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);

/* ══════════════════════════════════════════════════════════════════════
   ENTERING A TIER

   Not an option — a thing that happens to you. Levels 2, 5 and 8 each hand
   over an Experience at +2, and the two upper ones also clear every trait
   mark, which is what reopens all six traits for the tier's own advancements.

   Recorded rather than derived from level, because these are events. A
   character typed down to level 4 and back up to 5 has not reached tier 3
   twice, and a sheet that handed out a second Experience for it would be
   punishing a typo with a permanent change.
   ══════════════════════════════════════════════════════════════════════ */

export async function applyTierEntry(actor: any, level: number): Promise<string[]> {
  const entered = foundry.utils.deepClone(actor.system.tiersEntered ?? {});
  const update: Record<string, unknown> = {};
  const done: string[] = [];

  for (const tier of ADVANCEMENT) {
    if (level < tier.at || entered[tier.tier]) continue;
    entered[tier.tier] = true;

    const list = pending(actor, update, "system.experiences", actor.system.experiences ?? []);
    update["system.experiences"] = [
      ...foundry.utils.deepClone(list),
      { name: "", modifier: STARTING_EXPERIENCE_MODIFIER, marked: false },
    ];
    done.push(game.i18n.format("DAGGERHEART.Advance.GainedExperience", { tier: tier.tier }));

    /* Tier 2 does not clear marks — there is nothing to clear, tier 1 has no
       advancements. The achievement text says so and this follows it rather
       than assuming every tier entry is the same. */
    if (tier.at > 2) {
      const traits = pending(actor, update, "system.traits", actor.system.traits);
      const next = foundry.utils.deepClone(traits);
      for (const key of Object.keys(next)) next[key] = { ...next[key], marked: false };
      update["system.traits"] = next;
      done.push(game.i18n.localize("DAGGERHEART.Advance.ClearedMarks"));
    }
  }

  if (!done.length) return [];
  update["system.tiersEntered"] = entered;
  await actor.update(update);
  return done;
}

/* ══════════════════════════════════════════════════════════════════════
   REACHING A LEVEL

   **Every level hands over a domain card**, and this system had never handed
   over one. Step 4 of the printed level-up is "acquire a new domain card at
   your level or lower", and it sits *beside* the two advancement choices
   rather than being one of them — which the advancement table says out loud
   and nobody had read: "choose an **additional** domain card" is additional to
   this one. Two rules were missing here, not one, and this is the larger of
   them, because it fires at every level and the option fires once a tier.

   An event, exactly as a tier entry is, and recorded for the same reason: a
   level typed down to 4 and back up to 5 has not reached level 5 twice, and a
   sheet that handed over a second card for a typo would be paying a permanent
   thing for a slip of the keyboard.

   ── the watermark, and why there is no inference ──────────────────────
   `system.levelCards` is three-valued and the third value is the whole
   migration. **Absent** is a level reached before this record existed; it is
   owed nothing and shows nothing. **Null** is a level reached and not yet
   spent. A card is the answer.

   So the loop runs from the level you *were* rather than from level 2, and a
   character who has been level 6 all year is asked about level 7 and about
   nothing else. Nothing is guessed, nothing is seeded, and nobody is handed a
   bill for a campaign's worth of levels they have already played — which is
   what any amount of inferring "they must already have these" would have been
   doing on the way to the same place, less honestly.

   The panel is the other half: a level standing at null says so on the
   advancement tab and offers the same picker. That is what makes declining
   free — the prompt is a convenience, the debt is the record, and neither can
   be lost by pressing Escape at the wrong moment.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Ask for the domain card each newly-reached level gives, one level at a time.
 *
 * @param from the level held before this change — the watermark, not a floor.
 * @returns one line per level, for the caller to say.
 */
export async function applyLevelCards(actor: any, from: number, to: number): Promise<string[]> {
  const taken = foundry.utils.deepClone(actor.system.levelCards ?? {});
  const done: string[] = [];
  let changed = false;
  /* One refusal ends the run. Four levels typed in at once is four dialogs,
     and somebody who cancels the first has said what they think of that; the
     rest are recorded as owed and wait on the panel. */
  let declined = false;

  for (let n = Math.max(2, Math.floor(from) + 1); n <= to; n++) {
    if (n in taken) continue;
    changed = true;

    if (declined) {
      taken[n] = null;
      continue;
    }
    const card = await takeDomainCard(actor, n);
    taken[n] = card;
    if (card) {
      done.push(game.i18n.format("DAGGERHEART.Advance.LevelCard", { level: n, name: card.name }));
    } else declined = true;
  }

  if (!changed) return [];
  await actor.update({ "system.levelCards": taken });
  return done;
}

/**
 * Take the card a level owes, later.
 *
 * The same call the prompt makes, from the panel instead — because a prompt
 * you can dismiss needs somewhere for the thing you dismissed to go, and
 * because this is where a character who declined at the table on Tuesday
 * comes back to it. The ceiling is the level that owed the card and not the
 * level you are now: the card was due then, and "at your level or lower" is a
 * clause about the moment it was due.
 */
export async function claimLevelCard(actor: any, level: number): Promise<boolean> {
  const card = await takeDomainCard(actor, level);
  if (!card) return false;
  const taken = foundry.utils.deepClone(actor.system.levelCards ?? {});
  taken[level] = card;
  await actor.update({ "system.levelCards": taken });
  return true;
}

/**
 * The levels that owe a card or have spent one, for the panel.
 *
 * Capped at the character's level, because a level-7 record on a character who
 * has dropped to 5 is a fact about a level they are not at — the record is
 * kept (dropping and climbing back must not re-ask) and it is not drawn.
 */
export function levelCardRows(actor: any): { level: number; card: TakenCard | null }[] {
  const taken = actor?.system?.levelCards ?? {};
  const level = Number(actor?.system?.level ?? 1);
  return Object.keys(taken)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n <= level)
    .sort((a, b) => a - b)
    .map((n) => ({ level: n, card: (taken[n] as TakenCard) ?? null }));
}

/* ══════════════════════════════════════════════════════════════════════
   THE PICKER

   Two from a list, and it will not resolve with any other number. Both
   options it serves say "two" and mean it — one trait is not half an
   advancement, it is a different and cheaper advancement nobody chose.
   ══════════════════════════════════════════════════════════════════════ */

interface Choice {
  value: string;
  label: string;
  note: string;
}

async function pickTwo(title: string, hint: string, choices: Choice[]): Promise<string[] | null> {
  const rows = choices
    .map(
      (c) => `<label class="pick">
        <input type="checkbox" name="pick" value="${foundry.utils.escapeHTML(c.value)}">
        <b>${foundry.utils.escapeHTML(c.label)}</b>
        <s>${foundry.utils.escapeHTML(c.note)}</s>
      </label>`,
    )
    .join("");

  const picked = await dhDialog({
    title,
    content: `<p class="ach">${foundry.utils.escapeHTML(hint)}</p>
      <div class="picks">${rows}</div>`,
    ok: game.i18n.localize("DAGGERHEART.Advance.Take"),
    /* Exactly two, enforced in the form rather than in the callback: a dialog
       that lets you press OK and then tells you off is a dialog that made you
       do the work twice. The button is simply not live until the answer is
       legal, and the count says how far off it is. */
    wire: (html, setOk) => {
      const boxes = [...html.querySelectorAll<HTMLInputElement>('input[name="pick"]')];
      const count = html.querySelector<HTMLElement>(".ach");
      const base = count?.textContent ?? "";
      const sync = () => {
        const on = boxes.filter((b) => b.checked);
        for (const b of boxes) b.disabled = !b.checked && on.length >= 2;
        if (count) count.textContent = `${base} — ${on.length} of 2 chosen`;
        setOk(on.length === 2);
      };
      for (const b of boxes) b.addEventListener("change", sync);
      sync();
    },
    read: (html) =>
      [...html.querySelectorAll<HTMLInputElement>('input[name="pick"]:checked')].map(
        (b) => b.value,
      ),
  });

  return picked && picked.length === 2 ? picked : null;
}
