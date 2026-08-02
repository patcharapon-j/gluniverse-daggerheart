/**
 * The chat plate.
 *
 * A direct port of the accepted design (design/plate.js, variant A and the
 * GM card) with the study-page scaffolding removed. The markup is load-
 * bearing: plate.css addresses `.pl > .p > .row > .pl-num` and friends by
 * structure, so element order and nesting here are not stylistic choices.
 *
 * Everything below builds a string. Nothing measures, nothing recomputes,
 * and every number is already decided by the time it arrives.
 */

import { rich } from "../ui/card.js";
import type { DamagePlate, DualityPlate, FoePlate, Term } from "./types.ts";

/**
 * Three layers, in the order light hits them: `.lamp` is the solid — its
 * ::before the outer edge, its ::after the faceted ring — and `.core` is
 * the front face, the one plane square to you. The numeral rides on top.
 *
 * `data-mx` is the die's own range. Every die tumbles inside it, because a
 * d6 that flashes an 11 on its way to landing is a d6 that is lying about
 * what it is. Dice with no range never tumble — they were awarded, not
 * rolled, and showing them spin would be the one false claim on the card.
 */
export const DIE = (v: number | string, cls: string, sz?: number, mx?: number): string =>
  `<i class="die ${cls}"${sz ? ` style="--sz:${sz}px"` : ""}${
    mx ? ` data-mx="${mx}"` : ""
  }><b class="lamp"></b><b class="core"></b><em>${v}</em></i>`;

const esc = (s: unknown): string => foundry.utils.escapeHTML(String(s ?? ""));

/**
 * A die's own silhouette, by notation.
 *
 * Every damage die used to be drawn `sq`, and `sq` is the *d6's* shape — flat,
 * coreless, because a d6 seen face-on is one square with nothing folded back to
 * shade. So a 2d8 arrived as two d6s on a card whose entire job is saying what
 * was rolled, with the notation underneath quietly disagreeing with the
 * picture. `sq` keeps its name rather than becoming `d6`, because it is also
 * what the advantage chip and the critical's maximum dice are: those genuinely
 * are square chips, and renaming the class would make them claim to be a kind
 * of die.
 *
 * It is above the duality dice rather than beside the damage ones because both
 * need it now. A Hope Die is not always a d12 — several cards upgrade it to a
 * d20 — and a card that drew a 17 on a twelve-sided silhouette would be lying
 * about the one thing it exists to report.
 *
 * Anything unrecognised falls back to the square. A homebrew d3 has no
 * silhouette here and a plain chip is the honest thing to draw for it.
 */
const SHAPE: Record<string, string> = {
  d4: "d4",
  d6: "sq",
  d8: "d8",
  d10: "d10",
  d12: "d12",
  d20: "d20",
};

const shapeOf = (die: string): string => SHAPE[String(die).toLowerCase()] ?? "sq";

/** How many faces a notation claims, for the tumble's own range. */
const facesOf = (die: string): number => {
  const n = Math.floor(Number(String(die).replace(/^d/i, "")));
  return Number.isFinite(n) && n > 1 ? n : 12;
};

/* ── advantage ───────────────────────────────────────────────────────
   Always a d6, never anything else. Advantage adds it, disadvantage
   subtracts it, and the two cancel one-for-one across every source, so a
   roll never carries both — which is why this is one object with a sign
   rather than two independent slots.

   More than one die happens only through Help an Ally: any number of PCs
   may spend a Hope to help, each rolls a d6, and you take the highest. So
   several land and exactly one counts. The rest are crossed off with an X,
   which in this system means one thing and only one thing: this did not
   count. */

export const advDie = (r: DualityPlate): number => (r.adv ? Math.max(...r.adv.dice) : 0);
export const advVal = (r: DualityPlate): number =>
  r.adv ? (r.adv.neg ? -advDie(r) : advDie(r)) : 0;

const ADV = (r: DualityPlate, sz: number): string => {
  if (!r.adv) return "";
  const keep = r.adv.dice.indexOf(advDie(r));
  return r.adv.dice
    .map((v, i) => DIE(v, `sq a${r.adv!.neg ? " neg" : ""}${i === keep ? "" : " dim"}`, sz, 6))
    .join("");
};

/* A d6 is smaller than a d12 and is drawn smaller, because that is true and
   because it keeps the duality pair the subject of the strip.

   The pair's own silhouettes come off `hd`/`fd` rather than being the decagon
   twice. A card upgraded to a d20 Hope Die shows a 17 next to a 9, and on two
   identical twelve-sided chips that reads as a d12 having rolled a number it
   cannot. `data-mx` moves with it, so the tumble stays inside the die's real
   range — which is the rule that made the damage dice take their own shape in
   the first place. */
export const dualityDie = (r: DualityPlate, side: "h" | "f"): string =>
  (side === "h" ? r.hd : r.fd) ?? "d12";

const DICE = (r: DualityPlate, sz: number): string => {
  const hd = dualityDie(r, "h");
  const fd = dualityDie(r, "f");
  return (
    DIE(r.h, `h ${shapeOf(hd)}` + (r.out === "fear" ? "" : " lit"), sz, facesOf(hd)) +
    DIE(r.f, `f ${shapeOf(fd)}` + (r.out === "hope" ? "" : " lit"), sz, facesOf(fd)) +
    ADV(r, Math.round(sz * 0.76))
  );
};

const ADV_TERM = (r: DualityPlate): Term[] =>
  !r.adv
    ? []
    : [
        {
          k:
            (r.adv.neg ? "disadvantage" : "advantage") +
            (r.adv.dice.length > 1 ? ` · highest of ${r.adv.dice.length}` : ""),
          v: advVal(r),
        },
      ];

/* A term that was paid for is marked in the currency that paid for it: gold
   when a PC spent Hope, violet when the GM spent Fear. Same slot, same
   grammar, and the two sides never wear each other's colour. */
const TERMS = (t: Term[], cls?: string): string =>
  `<div class="pl-arith${cls ? " " + cls : ""}">${t
    .map(
      (x, i) =>
        `${i ? `<u>${x.v < 0 ? "−" : "+"}</u>` : ""}<i class="${
          x.fear ? "fe" : x.spent ? "sp" : ""
        }"><b>${Math.abs(x.v)}</b> ${esc(x.k)}</i>`,
    )
    .join("")}</div>`;

/* The pair's own term, and it says which dice only when there is something to
   say. "dice" is right for the printed 2d12 and would be a shrug on a roll
   somebody spent a card to change; "d20 + d12" is the whole point of having
   spent it. The silhouettes above carry it too, but the arithmetic strip is
   what gets read back three hours later in a log. */
const DICE_TERM = (r: DualityPlate): string => {
  const hd = dualityDie(r, "h");
  const fd = dualityDie(r, "f");
  return hd === "d12" && fd === "d12" ? "dice" : `${hd} + ${fd}`;
};

export const ARITH = (r: DualityPlate): string =>
  TERMS([{ k: DICE_TERM(r), v: r.h + r.f }, ...ADV_TERM(r), ...r.mods]);

/* Most duality rolls are made with no Difficulty at all. That is not a
   degraded state — it is the common one — so it gets its own sentence
   rather than a verdict with a hole in it.

   A reaction roll has no such fallback: it rolls the duality dice and then
   throws the duality away, so with no Difficulty there is nothing true to
   say about it at all. It says nothing. The sentence is omitted rather than
   filled with a placeholder, because a card narrating its own ignorance is
   worse than a card that is simply quiet — the dice, the total and the
   arithmetic are all still there and all still correct. */
export const VERDICT = (r: DualityPlate): string =>
  r.rxn
    ? r.out === "crit"
      ? "critical success"
      : r.dc == null
        ? ""
        : r.hit
          ? "success"
          : "failure"
    : r.out === "crit"
      ? "critical success"
      : r.dc == null
        ? r.out === "hope"
          ? "with Hope"
          : "with Fear"
        : `${r.hit ? "success" : "failure"} ${r.out === "hope" ? "with Hope" : "with Fear"}`;

/* The name sits beside the portrait, where the face already answers the same
   question — so the meta line's left slot carries the *kind* of roll, which
   is a fact the card had nowhere else to put and which damage, reaction and
   adversary rolls all need. A missing Difficulty is not a fact worth a slot:
   no chip, no "no difficulty", nothing. */
const META = (r: { kind?: string; dc: number | null }): string =>
  `<div class="pl-meta"><span>${esc(r.kind ?? "duality roll")}</span>${
    r.dc == null ? "" : `<s>vs ${r.dc}</s>`
  }</div>`;

/* The portrait, and nothing at all when there is not one.

   The framing travels with it. It is three numbers the player set while
   looking at this exact panel's proportions, and re-deriving anything from
   them here would be a second opinion about a crop that already has one. */
const POR = (r: { img?: string; frame?: { x: number; y: number; scale: number } }): string => {
  if (!r.img) return "";
  const f = r.frame;
  const vars = f ? `;--fx:${f.x}%;--fy:${f.y}%;--fz:${f.scale}` : "";
  return `<span class="por" style="--pic:url('${esc(r.img)}')${vars}"><i><u></u><b></b></i></span>`;
};

/* Name first, then the roll. `//` is the system's own separator and is the
   one part of this line that may fade. */
const EYE = (r: { who: string; label: string }): string =>
  `<span class="pl-eye"><b>${esc(r.who)}</b><u>//</u><i>${esc(r.label)}</i></span>`;

/* ── the claim row ───────────────────────────────────────────────────
   What the roll hands somebody. A reaction generates no Hope, no Fear and
   no GM move, so it hands over nothing — its whole consequence is the
   effect it was rolled against. A critical reaction is the one exception,
   and it is not Hope either: you ignore the effects that would still have
   hit you on a plain success. */

interface Claim {
  t: string;
  /** Mine to press; the GM's claims are stated, not offered. */
  mine: boolean;
  /** The chat action the button fires. */
  act?: string;
}

const claims = (r: DualityPlate): Claim[] =>
  r.rxn
    ? r.out === "crit"
      ? [{ t: "Ignore the effect", mine: true }]
      : []
    : r.out === "crit"
      ? [
          { t: "+1 Hope", mine: true, act: "gain-hope" },
          { t: "Clear 1 Stress", mine: true, act: "clear-stress" },
        ]
      : r.out === "hope"
        ? [{ t: "+1 Hope", mine: true, act: "gain-hope" }]
        : [{ t: "GM gains a Fear", mine: false, act: "gain-fear" }];

const ACT = (list: Claim[], next?: string, nextAct?: string): string =>
  !list.length && !next
    ? ""
    : `<div class="pl-act">
    ${list
      .map((c) =>
        c.mine
          ? `<button type="button" class="pl-b" data-dh-act="${c.act ?? ""}"><i></i>${esc(c.t)}</button>`
          : `<span class="pl-b theirs" data-dh-act="${c.act ?? ""}"><i></i>${esc(c.t)}</span>`,
      )
      .join("")}
    ${next ? `<button type="button" class="pl-b go" data-dh-act="${nextAct ?? ""}"><i></i>${esc(next)}</button>` : ""}
  </div>`;

/* Red plus material: a bracket and a lit glass edge in CSS, embers, one foil
   sweep and a struck badge. All of it red, and nothing below this rung may
   use any of it. It rides on `.mat` rather than on `.crit`, because critical
   *damage* is the top rung too and keeps the wound's field. */
const CRIT = (on: boolean): string =>
  on
    ? `<span class="embers"><i></i><i></i><i></i><i></i><i></i><i></i></span>
     <span class="foil"></span><span class="seal"><i></i><b>Critical</b></span>`
    : "";

const GHOST = (r: DualityPlate): string =>
  r.out === "crit" ? "CRITICAL" : r.rxn ? "REACTION" : r.out === "hope" ? "HOPE" : "FEAR";

/**
 * The rule this roll brought with it — a weapon's feature, in practice.
 *
 * Drawn with `rich`, the cards' own renderer, rather than with `esc`. That
 * is deliberate and it is the reason this takes text in the builders'
 * dialect instead of HTML: a feature that reads one way on the weapon's card
 * and another way on the card announcing the swing is two descriptions of one
 * rule, and the second one to be edited is the one that goes stale. The name
 * is escaped, because a name is a name and has no dialect.
 *
 * Nothing at all when there is no feature, which is most weapons. A card that
 * reserves a band for a rule that does not exist is a card with a hole in it.
 */
const NOTE = (r: DualityPlate): string =>
  r.note?.t
    ? `<div class="pl-note"><b>${esc(r.note.n)}</b><p>${rich(r.note.t)}</p></div>`
    : "";

/* ══ A · the player's plate ═══════════════════════════════════════════ */

/** The class list the whole card wears — the outcome, in one place. */
const FAMILY = (r: DualityPlate): string =>
  `${r.rxn && r.out !== "crit" ? "flat" : r.out}${r.out === "crit" ? " mat" : ""}`;

/* The field: everything drawn *on* the coloured block, which is also
   everything the portrait sits behind. Broken out because the sheet's
   framing preview shows exactly this and nothing below it — see
   `platePortrait` at the foot of this file. A preview assembled by hand
   would be a second opinion about a panel that already has one, and the
   first time the two drifted the framing would silently start lying. */
const FIELD = (r: DualityPlate): string => {
  const v = VERDICT(r);
  return `<div class="p">
    ${POR(r)}
    <span class="shards"></span>
    <span class="pl-gh">${GHOST(r)}</span>
    ${EYE(r)}
    <span class="row">${v ? `<b class="pl-vb">${v}</b>` : ""}<u class="pl-num">${r.total}</u></span>
  </div>`;
};

export const dualityPlate = (r: DualityPlate, next?: string, nextAct?: string): string => `
<div class="pl a1 ${FAMILY(r)}">
  ${CRIT(r.out === "crit")}
  ${FIELD(r)}
  <div class="pl-st">${DICE(r, 38)}${ARITH(r)}</div>
  ${NOTE(r)}${META(r)}${ACT(claims(r), next, nextAct)}
</div>`;

/**
 * The plate's field on its own, at true size, for framing a portrait against.
 *
 * The sheet used to draw a plain rectangle at the plate's aspect ratio over
 * the diorama and call it a guide. It got the *shape* right and everything
 * else wrong, because a portrait in this card is not a picture in a box —
 * it is a single-channel wash, bled off its right edge by a mask, tinted by
 * the outcome, and with the roller's name, the verdict and a 48px numeral
 * sitting on top of it. Where the face ends up relative to *those* is the
 * whole question, and an empty outline cannot answer it. You framed against
 * a rectangle and found out what you had actually done one message later.
 *
 * So the preview is the panel, built by the same function the card is built
 * by. Hope, because its tint is the lightest of the three and shows the most
 * of what you are placing; the other two only ever hide more.
 *
 * The frame is stored in percentages, so a preview scaled to fit the rail
 * crops identically to the card at full size — the sheet scales it down and
 * nothing about the answer changes.
 */
export const platePortrait = (r: DualityPlate): string =>
  `<div class="pl a1 ${FAMILY(r)}">${FIELD(r)}</div>`;

/* ══ damage ═══════════════════════════════════════════════════════════
   No duality axis, no verdict — a damage roll is a quantity, and the only
   question about it is how big. So the parts take new jobs: the sentence
   slot carries the damage *type*, which is the one thing about a damage
   number that changes what happens to it; the meta line carries the
   notation; the number is the card.

   And the card stops at the number. How many Hit Points this becomes
   depends on the target's thresholds, armour and immunities — none of which
   live here — so it says the damage and offers to apply it, rather than
   claiming an outcome it cannot know.

   Critical damage keeps the *wound's* field and takes the critical's
   material. The critical was already announced, loudly, on the attack card
   one message earlier, and a second saturated crit-red plate directly under
   it would read as the same event twice. What this card is saying is "and
   it hurt more", which is the wound's sentence at the top rung. */

const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0);

export const damagePlate = (r: DamagePlate, next?: string, nextAct?: string): string => {
  const crit = !!r.max?.length;
  const flat = sum(r.mods.map((m) => m.v));
  const notation = `${r.n}${r.die}${flat ? "+" + flat : ""}`;
  const terms: Term[] = [
    ...(crit ? [{ k: `${r.n}${r.die} maximum`, v: sum(r.max!) }] : []),
    { k: `${r.n}${r.die}`, v: sum(r.rolls) },
    ...(r.bonus ? [{ k: r.bonus.k, v: r.bonus.v }] : []),
    ...r.mods,
  ];
  const shape = shapeOf(r.die);
  return `
<div class="pl a1 wound blk${crit ? " mat" : ""}">
  ${CRIT(crit)}
  <div class="p">
    ${POR(r)}
    <span class="shards"></span>
    <span class="pl-gh">${crit ? "CRITICAL" : "DAMAGE"}</span>
    ${EYE(r)}
    <span class="row"><b class="pl-vb">${crit ? "critical " : ""}${esc(r.dtype)} damage</b><u class="pl-num">${r.total}</u></span>
  </div>
  <div class="dmg-st">
    ${
      crit
        ? `<span class="grp"><s>max</s>${r.max!.map((v) => DIE(v, `${shape} w max`, 26)).join("")}</span><span class="op">+</span>`
        : ""
    }
    <span class="grp">${r.rolls.map((v) => DIE(v, `${shape} w`, 26, +r.die.slice(1))).join("")}</span>
    ${
      r.bonus
        ? `<span class="op">+</span><span class="grp">${DIE(r.bonus.v, "sq a", 26, r.bonus.mx ?? 6)}</span>`
        : ""
    }
  </div>
  ${TERMS(terms, "dmg-a")}
  <div class="pl-meta"><span>${crit ? "critical damage" : "damage roll"}</span><s>${notation}</s></div>
  ${ACT([], next ?? "Apply to target", nextAct ?? "apply-damage")}
</div>`;
};

/* ══ THE GM SIDE ══════════════════════════════════════════════════════
   An adversary attack is not a duality roll and must not pretend to be one.
   One d20 plus the stat block's Attack Modifier, against the target's
   Evasion — meets or beats hits. No Hope, no Fear, no GM move, nothing
   passes hands. So the duality pair, the gold/violet axis and the whole
   claim row are gone.

   Advantage on this side is a *second d20*, and you take the highest (or
   the lowest on disadvantage) — not the PC's added d6. A different mechanic
   wearing the same grammar: several land, one counts, and the ones that did
   not are crossed off with the X. That is the payoff for having given the X
   exactly one meaning.

   A natural 20 succeeds automatically and takes the critical rung, with one
   exception the book is explicit about: a critical on an adversary
   *reaction* roll has no added benefit at all. So it does not get the
   material either — nothing is being announced. */

export const d20Keep = (r: FoePlate): number =>
  r.neg ? Math.min(...r.d20) : Math.max(...r.d20);

export const foeCrit = (r: FoePlate): boolean =>
  !r.rxn && r.d20.includes(20) && d20Keep(r) === 20;

const D20 = (r: FoePlate, sz: number): string => {
  const keep = r.d20.indexOf(d20Keep(r));
  return r.d20
    .map((v, i) =>
      DIE(
        v,
        "d20" + (i === keep ? (v === 20 && !r.rxn ? " nat" : " w") + " lit" : " dim"),
        sz,
        20,
      ),
    )
    .join("");
};

const FOE_ARITH = (r: FoePlate): string =>
  TERMS([
    {
      k: r.d20.length > 1 ? `d20 · ${r.neg ? "lowest" : "highest"} of ${r.d20.length}` : "d20",
      v: d20Keep(r),
    },
    ...r.mods,
  ]);

/* The target's name is in the sentence, not the eyebrow, because the eyebrow
   already answers "whose roll is this" and the answer is the adversary. Who
   it landed on is the *outcome*, and the outcome slot is where outcomes go. */
const FOE_V = (r: FoePlate): string =>
  r.rxn
    ? r.dc == null
      ? ""
      : r.hit
        ? "success"
        : "failure"
    : foeCrit(r)
      ? `critical hit ${esc(r.target)}`
      : r.hit
        ? `hit ${esc(r.target)}`
        : `missed ${esc(r.target)}`;

const FOE_GH = (r: FoePlate): string =>
  r.rxn ? "REACTION" : foeCrit(r) ? "CRITICAL" : r.hit ? "HIT" : "MISS";

/* Evasion and Difficulty are different target numbers and the chip says
   which — a GM reading a log full of both should never have to work out what
   the number on the right was. */
const FOE_META = (r: FoePlate): string =>
  `<div class="pl-meta"><span>${esc(r.kind ?? "adversary attack")}</span>${
    r.dc == null ? "" : `<s>vs ${r.rxn ? "" : "evasion "}${r.dc}</s>`
  }</div>`;

/**
 * The GM card.
 *
 * The GM is a *force*, not a participant. No portrait, no field, no cut
 * corner — the family mark goes too, and that notch is on every player card
 * in this system, so its absence says "not one of yours" before any hue
 * does. Near-black throughout, type pushed to mono, the number down two
 * sizes so the card reports rather than announces.
 *
 * The rail carries the outcome: red on a hit, cold steel on a miss, hot on
 * a critical. Two lit states and one unlit, not three lit ones — lit means a
 * hit is being *claimed*, and a withheld Difficulty claims nothing, so it is
 * unlit alongside the miss. Deriving this from `hit` alone put a red rail on
 * a roll nobody had told us the target number for.
 *
 * And the number is white, not red. Red means a quantity of harm and nothing
 * else; a d20 against Evasion is a comparison, and it is set in ink.
 */
export const foePlate = (r: FoePlate, next?: string, nextAct?: string): string => {
  const crit = foeCrit(r);
  const v = FOE_V(r);
  const landed = r.dc != null && r.hit;
  return `
<div class="pl g1 ${crit ? "hot mat" : landed ? "hit" : "cold"}">
  ${CRIT(crit)}
  <span class="rail"></span>
  <div class="p">
    ${EYE(r)}
    <span class="row">${v ? `<b class="pl-vb">${v}</b>` : ""}<u class="pl-num">${r.total}</u></span>
  </div>
  <div class="pl-st">${D20(r, 32)}${FOE_ARITH(r)}</div>
  ${FOE_META(r)}${ACT([], next, nextAct)}
</div>`;
};
