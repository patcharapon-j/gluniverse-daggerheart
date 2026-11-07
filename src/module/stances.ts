/**
 * The Martial Artist's stances — the sheet the foundation card sends you to
 * fetch, finally doing what it says.
 *
 * Sixteen stances have been `feature` Items since *Hope and Fear* arrived, and
 * the Focus they cost has been a pool since `refocus` was written. What sat
 * between the two was the rule itself, which the Stance Fighter card prints
 * and nothing here implemented:
 *
 *   "You can spend a Focus to shift into a known martial stance, gaining its
 *    effects until you take Severe damage, mark your last Hit Point, or shift
 *    into a different stance. Otherwise, you drop the stance and end its
 *    effects at the end of the scene."
 *
 * Every clause of that is a piece of this file.
 *
 * **"a known martial stance"** is a stance Item the character holds. Known is
 * ownership, and the Features panel is the stance sheet: you drag in the two
 * you start with and one more per level.
 *
 * **"gaining its effects"** is `passiveItemActive` in `data/modifiers.ts`
 * answering *no* for every stance except the active one. The stance is
 * exactly a passive you hold while in it, so the gate is on the document and
 * not on each modifier: Reliable's +1, Aggressive's −1 Evasion and Anchored's
 * +2 thresholds turn on and off together, through the one function every
 * derived number already reads. A homebrew stance with modifiers authored on
 * the item sheet obeys the same gate without anybody having to know.
 *
 * **"spend a Focus"** is one write that moves the pool *and* the stance, so a
 * shift is never half-done: the Focus gone and the stance not taken, or the
 * reverse. Flow State's "mark a Stress instead" is the second payer. The
 * refusal is the Focus row flinching, which is `spendFocus`'s answer.
 *
 * **"until you take Severe damage"** is `applyDamage` on the Actor, the one
 * implementation the damage dialog and the chat card's apply button share —
 * so it is decided where the rung is decided, on the rung that actually
 * landed after armour. **"mark your last Hit Point"** is observed rather than
 * instrumented, `syncVulnerable`'s arrangement: a Hit Point is marked by at
 * least six routes and one `updateActor` hook catches every one of them.
 * **"the end of the scene"** is `endScene()`, the seam that already ends
 * every once-per-scene thing at the table.
 *
 * **One at a time** is the shape of the field rather than a rule enforced on
 * top of it: `system.stance` holds one id, and "shift into a different
 * stance" is a write that replaces it.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** What every stance Item's `origin` opens with — `Martial Stance · Tier N`. */
export const STANCE_ORIGIN = "Martial Stance";

/** The Mastery feature that lets Stress pay where Focus would. */
export const FLOW_FEATURE = "Flow State";

/** The feature that makes a character a Brawler with a Combo Die. */
export const COMBO_FEATURE = "Combo Strike";

/** Why a stance ended, for the message that says so. */
export type DropReason = "severe" | "lastHitPoint" | "scene" | "manual";

/** How a shift was paid for, or why it could not be. */
export type StancePayer = "focus" | "stress";

/**
 * Is this Item a martial stance?
 *
 * By `origin`, which the compendium authors and the item sheet edits, rather
 * than by name: "Reliable" is also a weapon feature, "Aggressive" is plausibly
 * an adversary's, and a stance a table writes for itself should be a stance
 * because somebody *said* so in the field that exists to say where a feature
 * came from.
 */
export const isStance = (item: any): boolean =>
  item?.type === "feature" && String(item?.system?.origin ?? "").trim().startsWith(STANCE_ORIGIN);

/** The tier a stance prints, 1 when it prints none. */
export const stanceTier = (item: any): number => {
  const m = /Tier\s*(\d)/i.exec(String(item?.system?.origin ?? ""));
  return m ? Number(m[1]) : 1;
};

/** Every stance the character knows, by tier and then by name. */
export const knownStances = (actor: any): any[] =>
  [...(actor?.items ?? [])]
    .filter(isStance)
    .sort((a, b) => stanceTier(a) - stanceTier(b) || String(a.name).localeCompare(String(b.name)));

/** The stance the character is in, or null. A dangling id reads as none. */
export const activeStance = (actor: any): any => {
  const id = actor?.system?.stance;
  if (!id) return null;
  const item = actor?.items?.get?.(id);
  return isStance(item) ? item : null;
};

/** Does any card this character holds print the named feature? */
export const holdsFeature = (actor: any, name: string): boolean =>
  [...(actor?.items ?? [])].some((i: any) => {
    const s = i?.system ?? {};
    const blocks = [
      ...(s.features ?? []),
      ...(s.classFeatures ?? []),
      s.hopeFeature,
      s.topFeature,
      s.bottomFeature,
      s.feature,
    ];
    return blocks.some((f: any) => f?.name === name) || (i.type === "feature" && i.name === name);
  });

/** Flow State: Stress may pay for a shift, and Focus for a combo strike. */
export const hasFlowState = (actor: any): boolean => holdsFeature(actor, FLOW_FEATURE);

/**
 * Who would pay for a shift right now, or null when nobody can.
 *
 * `auto` is Focus first — it is the printed price — and Stress only when
 * Flow State is held and Focus is empty. Asking for one by name is how the
 * sheet's shift-click offers the Stress deliberately while Focus is still in
 * the pool, because a Martial Artist saving their last Focus for Keen
 * Defenses is making exactly the trade Flow State exists for.
 */
export function stancePayer(actor: any, want: StancePayer | "auto" = "auto"): StancePayer | null {
  const r = actor?.system?.resources ?? {};
  const focus = Number(r.focus?.value ?? 0) >= 1;
  const stress = hasFlowState(actor)
    && Number(r.stress?.marked ?? 0) < Number(r.stress?.max ?? 0);
  if (want === "focus") return focus ? "focus" : null;
  if (want === "stress") return stress ? "stress" : null;
  return focus ? "focus" : stress ? "stress" : null;
}

/**
 * Which client writes a derived drop. `game.users` is ordered the same
 * everywhere, so the first connected owner is a stable choice — the arrangement
 * `brawler.ts` uses for the same reason.
 */
const firstOwner = (actor: any): any =>
  game.users?.find?.((u: any) => u.active && actor.testUserPermission?.(u, "OWNER")) ?? null;

const mine = (actor: any): boolean => !!actor?.isOwner && game.user === firstOwner(actor);

/**
 * Drop out of the current stance, if there is one.
 *
 * Says so in a notification rather than a chat card: a stance ending is a
 * consequence of something that already posted — the damage, the scene — and
 * a second card in a different grammar is the log arguing with itself about
 * which is the record.
 *
 * @returns the stance that ended, or null when there was none.
 */
export async function dropStance(actor: any, reason: DropReason = "manual"): Promise<any> {
  const stance = activeStance(actor);
  if (!actor?.system?.stance) return null;
  await actor.update({ "system.stance": "" });
  if (stance && reason !== "manual") {
    ui.notifications?.info(
      game.i18n.format(`DAGGERHEART.Stance.Dropped.${reason}`, {
        actor: actor.name,
        stance: stance.name,
      }),
    );
  }
  return stance;
}

/** The last Hit Point is marked: every track box is full. */
const downed = (actor: any): boolean => {
  const hp = actor?.system?.resources?.hitPoints;
  return !!hp && Number(hp.max) > 0 && Number(hp.marked) >= Number(hp.max);
};

export function registerStances(): void {
  /* "mark your last Hit Point". Observed for `syncVulnerable`'s reason — a
     Hit Point is marked from the damage dialog, a chat claim, a pip on the
     rail, the adjust tab and a macro — and gated on the changed keys so a
     write to anything else costs one property read. */
  Hooks.on("updateActor", (actor: any, changed: any) => {
    if (actor?.type !== "character" || !actor.system?.stance) return;
    if (changed?.system?.resources?.hitPoints === undefined) return;
    if (!mine(actor) || !downed(actor)) return;
    void dropStance(actor, "lastHitPoint");
  });

  /* A stance Item leaving the sheet leaves a dangling id behind. It already
     reads as no stance — `activeStance` checks the document — but a field
     that names something gone is a field the next reader has to reason
     about, so it is cleared. */
  Hooks.on("deleteItem", (item: any) => {
    const actor = item?.parent;
    if (actor?.documentName !== "Actor" || actor.system?.stance !== item.id) return;
    if (!mine(actor)) return;
    void actor.update({ "system.stance": "" });
  });
}
