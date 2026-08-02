/**
 * Taking damage, with the decisions it actually contains.
 *
 * Damage in this game is not a subtraction. A number lands on a ladder of
 * thresholds and becomes one, two, three or four Hit Points, and the question
 * asked of the person taking it is how far down that ladder they are willing
 * to pay to fall. That choice is made *after* seeing the number — it is the
 * whole reason armour is a slot rather than a stat.
 *
 * **It draws the sheet's own band.** There used to be a four-cell ladder in
 * here, purpose-built, sitting twenty pixels from a rail already drawing the
 * real thing — two pictures of one fact, and the one you were being asked to
 * decide against was the unfamiliar one. `DAMAGE()` from `ui/mark.js` is the
 * builder the rail calls, so the thresholds, the zone weights and the tick
 * marks counting out each zone's cost are literally the same object.
 *
 * **Rungs and payment are two controls.** Only one rule joins them — an Armor
 * Slot buys one threshold — and that one is wired: pressing + on Reduce takes
 * a slot while you have one, so the printed case stays a single press.
 * Everything else that softens a hit is printed on a card, and cards charge
 * what they like. Fusing the two would mean this file inventing a price for
 * every such card; keeping them apart means the sheet does the arithmetic and
 * the card keeps the ruling.
 *
 * **Minor reduces to nothing.** That is the printed parenthesis and this
 * system used to floor at Minor instead — see `reduceSeverity`. The visible
 * symptom was that the one hit armour completely negates was the one hit the
 * dialog would not let you spend on.
 *
 * ── what this dialog was getting wrong ────────────────────────────────
 * Everything above stayed. What changed is that all of it was drawn at one
 * weight — a number, a band, a forecast, a stepper, three purses, a rule line
 * and a panel of prose, each asking equally hard to be read — so the dialog
 * asked four questions at once and the one it exists for was not visibly
 * among them.
 *
 * Three fixes, none of which removes anything:
 *
 * **Which rung, unmistakably.** The zone the hit lands in is lit and the
 * others step back. The band is a weight ramp on purpose (hue means domain in
 * this system), which is exactly why four zones at full weight were four equal
 * claims and a gold ring on one of them was the fourth thing you noticed.
 *
 * **The armour spend reads as travel.** An Armor Slot moves the damage one
 * rung *down the ladder*, and the dialog drew two still frames of that: a zone
 * struck out here, a zone lit there. Now a gold arrow runs between them, in
 * its own lane above the band, replayed on every press. See `.wb` in
 * `design/dlg.css`.
 *
 * **Incoming outweighs existing.** The fused Hit Point row forecast the boxes
 * this hit would take at *half* weight against already-marked boxes at full —
 * which drew the settled fact louder than the one being decided. It is the
 * other way round now.
 *
 * And the cards that might change any of it are drawn as cards. See
 * `rule-cards.ts`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SEVERITY, SEVERITY_COST, type Severity } from "../config.ts";
import type { DamagePlan, DamageSpend } from "../documents/actor.ts";
import { DAMAGE, XMARK } from "../ui/mark.js";
import { REDUCE_RX, rulesAbout } from "./rules.ts";
import { ruleCardsPanel, wireRulePeeks } from "./rule-cards.ts";
import { dhDialog } from "./dialog.ts";

const esc = (s: string) => foundry.utils.escapeHTML(s);
const label = (sev: Severity) => game.i18n.localize(`DAGGERHEART.Severity.${sev}`);

/* ── the purses ────────────────────────────────────────────────────────
   What this actor can be asked to spend. An adversary has Stress and no
   Hope; a character with no armour equipped has no slots. Offering a
   stepper that can only ever read zero is furniture claiming to be a
   choice, so each one appears only if there is something in it. */

interface Purse {
  key: "armor" | "stress" | "hope";
  k: string;
  have: number;
}

const purses = (actor: any): Purse[] =>
  (
    [
      { key: "armor", k: "Armor", have: actor.armorLeft ?? 0 },
      { key: "stress", k: "Stress", have: actor.stressLeft ?? 0 },
      { key: "hope", k: "Hope", have: actor.hopeLeft ?? 0 },
    ] as Purse[]
  ).filter((p) => p.have > 0);

const stepper = (name: string, n = 0) => `<span class="sp" data-sp="${name}">
  <button type="button" data-step="-1" aria-label="One fewer">−</button>
  <span class="n">${n}</span>
  <button type="button" data-step="1" aria-label="One more">+</button>
</span>`;

/**
 * Ask, then apply.
 *
 * @returns what was applied, or null if the dialog was dismissed — in which
 * case nothing at all has been written and the caller must not claim anything.
 */
export async function takeDamage(
  actor: any,
  amount: number,
  { damageType = "", ask = false }: { damageType?: string; ask?: boolean } = {},
): Promise<DamagePlan | null> {
  /* Nothing to decide is not a dialog. A hit can land below the Minor
     threshold and that is a real outcome — it just is not one anybody needs
     to be asked about. It does not apply when the number is the thing being
     asked for, because then zero is only the starting value. */
  if (!ask && actor.severityFor(amount) === "none") {
    return actor.previewDamage(0);
  }

  const t = actor.system?.thresholds ?? {};
  const hp = actor.system?.resources?.hitPoints ?? { max: 6, marked: 0 };
  const pocket = purses(actor);

  /* Minions print no thresholds — any damage marks their one Hit Point — so
     there is no band to draw and nothing on it to escape. The dialog is still
     worth opening, because a card may still let them pay their way out. */
  const band = () =>
    t.none
      ? '<p class="ach">No thresholds — any damage marks one Hit Point.</p>'
      : withCrosses(
          DAMAGE({
            major: t.major ?? 1,
            severe: t.severe ?? 2,
            hp: hp.max,
            marked: hp.marked,
            // The 2× rule, always drawn here. On the rail it is optional
            // because it costs a zone's width in a 236px column; this dialog
            // has room, and a Massive hit is exactly the one you want it for.
            massive: true,
            label: "Damage",
          }),
        );

  /* Your own cards, drawn as cards. "Takaia Armored Beetles · Loadout" over a
     paragraph is a rule; the tile is the object the rule is printed on, and
     the question this dialog asks — is there something in my hand that gets me
     out of this — is a question about objects.

     And *only* that question. This used to match on the subject — armour,
     severity, thresholds — which swept in every passive bonus the character
     carries: a weapon's Protective is "+1 to your Armor Score", Bare Bones is
     "your damage thresholds equal your level". Both are real rules and both
     were already applied before the dialog opened; the Armor Score is the
     purse and the thresholds are the band this hit is being measured against.
     A card printing them under a heading that promises a way out is the
     dialog asking you to re-check arithmetic it did. `REDUCE_RX` matches
     offers rather than topics — see the note on it in `rules.ts`. */
  const panel = await ruleCardsPanel(
    actor,
    rulesAbout(actor, REDUCE_RX).map((rule) => ({ rule })),
    game.i18n.localize("DAGGERHEART.Damage.Relevant"),
  );

  const spent = await dhDialog<DamageSpend>({
    title: game.i18n.format("DAGGERHEART.Damage.Title", { name: actor.name }),
    ok: game.i18n.localize("DAGGERHEART.Damage.Apply"),
    width: 500,
    content: `<div class="hit">
      <div class="amt">
        ${
          /* Typed when the damage came from a voice across the table, printed
             when it came from a card that already rolled it. The same box
             either way: the number is the loudest thing in this dialog and
             giving the sheet-side path its own labelled field somewhere else
             would make two dialogs out of one. */
          ask
            ? `<input type="number" min="0" value="${amount}" class="amtin" autofocus>`
            : `<b>${amount}</b>`
        }
        <s>${esc(damageType || game.i18n.localize("DAGGERHEART.Damage.Incoming"))}</s>
        <span class="vd"></span>
      </div>

      <!-- Filled in "wire", not here. Foundry strips SVG out of a dialog's
           "content" exactly as it strips it out of stored chat message
           content — so the band arrived with empty cost cells and an empty
           strike mark, which reads as a design choice rather than as a
           sanitiser. Assigning innerHTML after the dialog is already in the
           document is not filtered, and it is the same answer post-card.ts
           reached for the same reason. The card tiles below arrive the same
           way and for the same reason. -->
      <div class="band-host"></div>

      <div class="spend">
        <div class="st rung">
          <span class="k">${esc(game.i18n.localize("DAGGERHEART.Damage.Reduce"))}</span>
          ${stepper("rungs")}
          <em></em>
        </div>
        ${
          pocket.length
            ? `<div class="st pay">
                 <span class="k">${esc(game.i18n.localize("DAGGERHEART.Damage.PaidWith"))}</span>
                 <span class="purse">${pocket
                   .map(
                     (p) => `<span class="p" data-purse="${p.key}">
                       <span class="k">${esc(p.k)}</span>${stepper(p.key)}
                     </span>`,
                   )
                   .join("")}</span>
               </div>`
            : ""
        }
      </div>

      <p class="out"></p>
      <div class="rules-host"></div>
    </div>`,

    wire: (root) => {
      const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s);
      const host = q<HTMLElement>(".band-host");
      if (host) host.innerHTML = band();
      const rules = q<HTMLElement>(".rules-host");
      if (rules) rules.innerHTML = panel;
      wireRulePeeks(root);

      const field = q<HTMLInputElement>(".amtin");
      const vd = q(".vd");
      const out = q<HTMLElement>(".out");
      const note = q<HTMLElement>(".st.rung em");
      const boxes = [...root.querySelectorAll<HTMLElement>(".hit .row > i")];
      const zones = [...root.querySelectorAll<HTMLElement>(".hit .z")];

      /* The walk-back, added here rather than by `DAMAGE()` because it is the
         dialog's furniture and the rail has no use for it — the same argument
         as the strike marks below. Its geometry cannot be written in CSS: the
         zones size themselves to their own contents, so where their centres
         landed is only knowable from their rects. */
      const bandEl = q<HTMLElement>(".hit .band");
      let wb: HTMLElement | null = null;
      if (bandEl) {
        wb = document.createElement("div");
        wb.className = "wb";
        wb.innerHTML = "<u></u><i></i><em></em>";
        bandEl.append(wb);
      }
      /** What the arrow last said, so a redraw does not replay it unchanged. */
      let walked = "";

      let n = amount;
      const spend: Required<DamageSpend> = { rungs: 0, armor: 0, stress: 0, hope: 0 };

      /** The furthest the damage can fall: all the way off the bottom. */
      const maxRungs = () => SEVERITY.indexOf(actor.severityFor(n));

      const draw = () => {
        spend.rungs = Math.min(Math.max(0, spend.rungs), maxRungs());
        for (const p of pocket) {
          spend[p.key] = Math.min(Math.max(0, spend[p.key]), p.have);
        }

        const plan: DamagePlan = actor.previewDamage(n, spend);
        // One source for the answer, written by the one function that has it —
        // the number included, because the typed path can change it and by the
        // time the caller reads this the field is gone with the dialog.
        root.dataset.dhDmg = JSON.stringify({ ...spend, amount: n });

        /* ── the band ──────────────────────────────────────────────────
           `data-hp` is the zone's cost in Hit Points, and a severity's cost
           and its position on the ladder are the same number — so the zone
           for a severity is the one whose cost equals it, with no second
           table to keep in step. */
        const costOf = (s: Severity) => SEVERITY_COST[s] ?? 0;
        let landed: HTMLElement | null = null;
        let escaped: HTMLElement | null = null;
        for (const z of zones) {
          const c = Number(z.dataset.hp);
          const on = c === costOf(plan.severity) && plan.severity !== "none";
          const was = c === costOf(plan.base) && plan.base !== plan.severity;
          z.classList.toggle("on", on);
          z.classList.toggle("was", was);
          if (on) landed = z;
          if (was) escaped = z;
        }
        /* Everything that is not the landing zone steps back, and the band is
           told so rather than the stylesheet re-deriving it with `:has(.z.on)`.
           The fact is already decided here; asking again in a selector puts one
           condition in two places that have to agree. */
        bandEl?.classList.toggle("aim", !!landed);

        /* ── the forecast ──────────────────────────────────────────────
           The boxes this hit would take. `.on` is what draws the mark and
           `.pv` is what says it has not happened yet; both come off together
           when a slot buys one back. The weights are in `dlg.css`, and they
           are the way round they are because what is already marked cannot
           change in this dialog and what is incoming is the whole of it. */
        boxes.forEach((b, i) => {
          const pv = i >= hp.marked && i < hp.marked + plan.marked;
          b.classList.toggle("pv", pv);
          b.classList.toggle("on", i < hp.marked || pv);
        });

        /* ── the verdict ───────────────────────────────────────────────── */
        if (vd) {
          vd.classList.toggle("safe", plan.severity === "none");
          vd.innerHTML =
            plan.severity === "none"
              ? `<b>${esc(game.i18n.localize("DAGGERHEART.Damage.Nothing"))}</b>no Hit Points`
              : `<b>${esc(label(plan.severity))}</b>${game.i18n.format(
                  plan.marked === 1
                    ? "DAGGERHEART.Damage.MarksOne"
                    : "DAGGERHEART.Damage.Marks",
                  { n: plan.marked },
                )}`;
        }

        /* ── the walk back ─────────────────────────────────────────────
           From the zone the hit would have landed in to the one it lands in
           now — and when it lands nowhere at all, off the left end of the
           band, which is where "Minor to nothing" actually goes.

           Replayed only when the journey itself changed. `draw` runs on every
           keystroke in the amount field, and an arrow that re-flies on each
           one is an animation reporting that nothing happened. */
        const from = plan.base;
        const trip = escaped ? `${from}>${plan.severity}` : "";
        if (wb && bandEl) {
          if (!escaped) {
            wb.classList.remove("go");
            walked = "";
          } else {
            const b = bandEl.getBoundingClientRect();
            const f = escaped.getBoundingClientRect();
            const right = f.left + f.width / 2 - b.left;
            // No landing zone means the damage came off the bottom of the
            // ladder entirely, so the arrow runs to the band's own left edge.
            const left = landed
              ? (() => {
                  const r = landed.getBoundingClientRect();
                  return r.left + r.width / 2 - b.left;
                })()
              : 2;
            wb.style.left = `${left}px`;
            wb.style.width = `${Math.max(24, right - left)}px`;
            const em = wb.querySelector("em");
            if (em) {
              em.textContent = game.i18n.format("DAGGERHEART.Damage.From", {
                base: label(from),
                now:
                  plan.severity === "none"
                    ? game.i18n.localize("DAGGERHEART.Damage.Nothing")
                    : label(plan.severity),
              });
            }
            if (trip !== walked) {
              wb.classList.remove("go");
              void wb.offsetWidth;
              wb.classList.add("go");
              walked = trip;
            }
          }
        }

        root.querySelector(".hit .st.rung")?.classList.toggle("live", spend.rungs > 0);
        const paid = pocket.some((p) => spend[p.key] > 0);
        root.querySelector(".hit .st.pay")?.classList.toggle("live", paid);
        for (const p of pocket) {
          root
            .querySelector(`[data-purse="${p.key}"]`)
            ?.classList.toggle("live", spend[p.key] > 0);
          set(p.key, spend[p.key]);
          left(p.key, p.have - spend[p.key]);
        }
        set("rungs", spend.rungs);

        /* The stepper's note now says only the thing the arrow cannot: that
           there is nothing to soften. The from→to sentence rides on the arrow
           itself, so printing it here too would be the dialog saying one fact
           twice in one glance — and when there is no band at all (a minion has
           no thresholds) the arrow does not exist, so the note takes it back. */
        if (note) {
          note.textContent =
            maxRungs() === 0
              ? game.i18n.localize("DAGGERHEART.Damage.NoHit")
              : wb || plan.severity === plan.base
                ? ""
                : game.i18n.format("DAGGERHEART.Damage.From", {
                    base: label(plan.base),
                    now:
                      plan.severity === "none"
                        ? game.i18n.localize("DAGGERHEART.Damage.Nothing")
                        : label(plan.severity),
                  });
        }

        /* The printed rule, stated once and never enforced — the same stance
           the rest dialog takes on two downtime moves. A dialog that refused
           the second slot would be refusing every subclass that grants one.

           "Beyond it" is anything past *one slot for one threshold*, which
           includes paying with Stress or Hope at all: nothing in the core
           rules lets you, so every one of those is a card talking. */
        if (out) {
          const beyond =
            spend.rungs > 1 || spend.armor > 1 || spend.stress > 0 || spend.hope > 0;
          out.textContent = game.i18n.localize(
            beyond ? "DAGGERHEART.Damage.BeyondRule" : "DAGGERHEART.Damage.Rule",
          );
        }

        // Each stepper's own two ends, so nothing offers a press that no-ops.
        for (const sp of root.querySelectorAll<HTMLElement>(".sp")) {
          const key = sp.dataset.sp as keyof typeof spend;
          const cap = key === "rungs" ? maxRungs() : (pocket.find((p) => p.key === key)?.have ?? 0);
          const now = spend[key] ?? 0;
          for (const b of sp.querySelectorAll<HTMLButtonElement>("button")) {
            b.disabled = Number(b.dataset.step) < 0 ? now <= 0 : now >= cap;
          }
        }
      };

      const set = (key: string, v: number) => {
        const el = root.querySelector(`[data-sp="${key}"] .n`);
        if (el) el.textContent = String(v);
      };
      const left = (key: string, v: number) => {
        const el = root.querySelector(`[data-purse="${key}"] .k`);
        if (el) el.setAttribute("title", `${v} left`);
      };

      root.addEventListener("click", (e) => {
        const b = (e.target as Element | null)?.closest?.<HTMLElement>("[data-step]");
        if (!b) return;
        e.preventDefault();
        const key = b.closest<HTMLElement>("[data-sp]")?.dataset.sp as
          | keyof typeof spend
          | undefined;
        if (!key) return;
        const d = Number(b.dataset.step);
        spend[key] += d;

        /* The one rule that ties a rung to a price, wired so the printed case
           is still one press: reaching for another threshold takes an Armor
           Slot while there is one, and giving the threshold back returns it.
           Anything past that, the player sets in the ledger themselves —
           because past that it is their card talking, not the rulebook. */
        if (key === "rungs") {
          const slots = pocket.find((p) => p.key === "armor")?.have ?? 0;
          if (d > 0 && spend.armor < slots && spend.armor < spend.rungs) spend.armor++;
          else if (d < 0 && spend.armor > spend.rungs) spend.armor--;
        }
        draw();
      });

      // `input`, not `change`: the band is the reason to type a number here at
      // all, and one that updated on blur would be answering a question you
      // had already stopped asking.
      field?.addEventListener("input", () => {
        n = Math.max(0, Math.round(Number(field.value) || 0));
        draw();
      });
      draw();
    },

    read: (root) => JSON.parse(root.dataset.dhDmg || "{}") as DamageSpend & { amount?: number },
  });

  if (spent === null) return null;
  const { amount: settled, ...spend } = spent as DamageSpend & { amount?: number };
  return actor.applyDamage(Number.isFinite(settled) ? Number(settled) : amount, spend);
}

/**
 * A hidden strike mark in every zone, shown on the one the damage escaped.
 *
 * Added here rather than in `DAMAGE()` because it is the dialog's furniture
 * and the rail has no use for it — four extra SVGs on every character sheet
 * render, to serve a state the sheet never enters.
 */
function withCrosses(html: string): string {
  return html.replace(
    /<span class="cost"/g,
    `<i class="cx">${XMARK}</i><span class="cost"`,
  );
}
