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
 * The two that ask are here. The two that are acquisitions — a domain card,
 * a subclass card, a whole second class — deliberately do not: they arrive by
 * dragging a document in from a compendium, which is a gesture this system
 * already has and which no dialog improves on. Marking those boxes says "I am
 * owed this", and the panel says so.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ADVANCEMENT,
  STARTING_EXPERIENCE_MODIFIER,
  TRAITS,
  TRAIT_LABELS,
  type AdvancementId,
  type AdvancementTier,
} from "../config.ts";
import { dhDialog } from "./dialog.ts";

/** One taken instance of one option, as `advancementChoices` keys it. */
const choiceKey = (tier: number, option: number, n: number) => `${tier}:${option}:${n}`;

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
 * Everything accumulates into one `update` object and lands in one write. The
 * whole point is that a level-up is a single change to a character: a
 * half-applied one, with the box marked and the traits not, is precisely the
 * state this exists to make impossible.
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

  /* Taking, one instance at a time. Three marks on the trait option is three
     separate pairs, and asking for all six at once would let you pick a trait
     you had marked in the same breath. `pending` is what makes the second ask
     see the first one's answer. */
  for (let n = from + 1; n <= to; n++) {
    const chosen = await ask(actor, def.id, update);
    if (!chosen) return false;
    choices[choiceKey(tier.tier, option, n)] = chosen;
  }

  /* Giving back, newest first — so unmarking down to one undoes the third and
     then the second, which is what clicking a box means everywhere else on
     this sheet. */
  for (let n = from; n > to; n--) {
    const key = choiceKey(tier.tier, option, n);
    const chosen = choices[key];
    if (chosen) revert(actor, def.id, chosen, update);
    delete choices[key];
  }

  update["system.advancementChoices"] = choices;
  await actor.update(update);
  return true;
}

/* ── the two that ask ─────────────────────────────────────────────────── */

type Chosen = { traits?: string[]; experiences?: number[] };

async function ask(
  actor: any,
  id: AdvancementId,
  update: Record<string, unknown>,
): Promise<Chosen | null> {
  if (id === "traits") return askTraits(actor, update);
  if (id === "experiences") return askExperiences(actor, update);
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
): void {
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
