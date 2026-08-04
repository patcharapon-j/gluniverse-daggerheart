/**
 * Every rule a character is carrying, in one list.
 *
 * Two of the new dialogs need the same awkward thing: *the sheet does not know
 * what your features do.* Taking damage is one Armor Slot for one threshold
 * until a subclass says two; a rest is two downtime moves until an ancestry
 * gives you a third. Those exceptions are printed on cards this character
 * already holds, and the system cannot parse them — parsing English rules text
 * into behaviour is how a game system starts quietly getting rules wrong.
 *
 * So it does not try. It finds the ones that mention the thing you are doing
 * and puts them in front of you, and you apply them, because you can read.
 * That is a smaller promise than automation and it is one that stays true: a
 * homebrew feature written by the GM last night gets surfaced by exactly the
 * same rule as a printed one.
 *
 * The match is deliberately loose. A false positive costs a line of text in a
 * dialog you are already reading; a false negative costs the rule.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { plain } from "../sheets/cards.ts";

export interface Rule {
  /** The feature's own name. */
  name: string;
  /** What it came off — "Ranger", "Beastbound · Foundation", "Gilded Armor". */
  source: string;
  /** The rule, in the builders' dialect. */
  text: string;
  /** The owned top-level Item this feature is printed on. */
  itemId?: string;
}

const push = (out: Rule[], source: string, f: any, itemId?: string): void => {
  const text = plain(f?.description);
  if (text) out.push({ name: f.name || "Feature", source, text, itemId });
};

/**
 * Everything with rules text on it, in the order it would be read: what you
 * are, then what you chose, then what you are holding.
 *
 * Vaulted domain cards are excluded — a card in the vault is not in play, and
 * a rest dialog listing a rule you cannot currently use is the same mistake as
 * not listing one you can, pointing the other way.
 */
export function rulesOf(actor: any): Rule[] {
  const out: Rule[] = [];
  const items = [...(actor?.items ?? [])];

  for (const it of items) {
    const s = it.system ?? {};
    switch (it.type) {
      case "class":
        for (const f of s.classFeatures ?? []) push(out, it.name, f, it.id);
        push(out, it.name, s.hopeFeature, it.id);
        break;
      case "subclass": {
        const who = s.subclassName || it.name;
        for (const f of s.features ?? []) push(out, `${who} · ${it.name}`, f, it.id);
        break;
      }
      case "ancestry":
        push(out, it.name, s.topFeature, it.id);
        push(out, it.name, s.bottomFeature, it.id);
        break;
      case "community":
        push(out, it.name, s.feature, it.id);
        break;
      /* A transformation is heritage, and both of its features are live rules
         at all times — including the drawback, which is the half the book asks
         you to remind your GM about. Ephemeral doubles the magic damage you are
         about to take and Corpse decides whether a rest clears anything, so a
         damage or rest dialog that did not list them would be quietly wrong in
         exactly the way these panels exist to prevent. */
      case "transformation":
        for (const f of s.features ?? []) push(out, it.name, f, it.id);
        break;
      case "domainCard":
        if (s.inLoadout) push(out, "Loadout", { name: it.name, description: s.description }, it.id);
        break;
      case "feature":
        push(out, s.origin || "Feature", { name: it.name, description: s.description }, it.id);
        break;
      case "armor":
      case "weapon":
        if (s.equipped) push(out, it.name, s.feature, it.id);
        break;
      default:
        break;
    }
  }
  return out;
}

/** Item shapes that are presented as one printed card rather than child rows. */
const TOP_LEVEL_CARDS = new Set([
  "domainCard",
  "ancestry",
  "community",
  "transformation",
  "subclass",
  "weapon",
  "armor",
]);

const typeLabel = (type: string): string =>
  ({
    domainCard: "Loadout",
    ancestry: "Ancestry",
    community: "Community",
    transformation: "Transformation",
    subclass: "Subclass",
    weapon: "Weapon",
    armor: "Armor",
  })[type] ?? "Feature";

/**
 * Collapse matching child features to the printed Item that owns them.
 *
 * The dialog peeks a complete ancestry/subclass/etc. card. Listing each
 * matching feature beside that full card makes one physical card appear as
 * both its child and its parent, and two matching features appear twice.
 * Class and standalone feature rows stay granular because they do not have a
 * full-card representation in these dialogs.
 */
export function rulesAtTopLevel(actor: any, rules: Rule[]): Rule[] {
  const items = new Map(
    [...(actor?.items ?? [])].map((item: any) => [String(item.id), item]),
  );
  const out: Rule[] = [];
  const positions = new Map<string, number>();

  for (const rule of rules) {
    const item = rule.itemId ? items.get(String(rule.itemId)) : null;
    if (!item || !TOP_LEVEL_CARDS.has(item.type)) {
      out.push(rule);
      continue;
    }

    const key = String(item.id);
    const at = positions.get(key);
    if (at !== undefined) {
      const current = out[at] as Rule;
      if (!current.text.includes(rule.text)) current.text += `\n\n${rule.text}`;
      continue;
    }

    positions.set(key, out.length);
    out.push({
      name: item.name,
      source:
        item.type === "subclass"
          ? (item.system?.subclassName || typeLabel(item.type))
          : typeLabel(item.type),
      text: rule.text,
      itemId: item.id,
    });
  }
  return out;
}

/** The ones whose text mentions what you are about to do. */
export const rulesAbout = (actor: any, rx: RegExp): Rule[] =>
  rulesOf(actor).filter((r) => rx.test(r.text) || rx.test(r.name));

/**
 * What can still be *spent* while a hit is landing.
 *
 * This used to be `ARMOUR_RX` — armour, severity, thresholds, "damage you
 * take" — and it was too wide by exactly one category. A weapon's Protective
 * is "+1 to your Armor Score"; Bare Bones is "your damage thresholds equal
 * your level". Both mention armour, both are real rules, and both were
 * *already applied* by the time the dialog opened: the Armor Score is the
 * slot count in the purse and the thresholds are the band the hit is being
 * measured against. Printing them as cards asked the reader to check
 * arithmetic the sheet had done, under a heading promising a way out.
 *
 * The question this dialog asks is "is there something I can pay". So the
 * pattern is a list of *offers* rather than a list of topics — spending a
 * slot, reducing a severity or a damage number, halving it, resisting it,
 * marking something else instead, or anything that fires at the moment the
 * damage arrives. A passive bonus matches none of those phrasings, which is
 * why this is a positive test and not a veto: a rule the sheet has already
 * counted has nothing to say in the imperative.
 *
 * Loose within that, deliberately, and it errs the way this file always
 * does: a false positive costs one card in a panel you are reading anyway.
 */
export const REDUCE_RX =
  /\b(?:mark|spend|use|expend)\s+(?:an?|one|two|three|\d+)\s+armou?r\s+slots?|\breduc\w+\s+(?:the\s+)?(?:severity|damage(?!\s+thresholds?))|\bby\s+(?:one|two|three|\d+)\s+thresholds?|\bhalve\b|\bhalf\s+(?:the\s+|that\s+)?damage|\bresistan\w+|\bimmun\w+|\bwhen\s+you\s+(?:would\s+)?take\s+(?:any\s+|\w+\s+)?damage|\b(?:instead\s+of|before|without)\s+marking|\b(?:ignore|avoid|negate)\s+(?:the\s+|all\s+)?damage/i;

/** Rests and the moves made during them. */
export const REST_RX = /\brests?\b|\bresting\b|\bdowntime\b/i;

/**
 * A rule whose only business with a rest is getting its own use back.
 *
 * "Once per rest, mark a Stress to sprint anywhere within Far range" has
 * nothing to say to somebody deciding which downtime moves to take. The rest
 * refreshes it, that is the whole transaction, and a full card asking to be
 * considered is the panel spending its loudest object on a receipt.
 *
 * Told apart from a rule that genuinely changes the rest by *removing the
 * recharge clause and asking again*. Celestial Trance — "During a rest, you
 * can drop into a trance to choose an additional downtime move" — matches no
 * recharge phrasing at all and stays. A card that said "Once per long rest,
 * when you take a short rest you may take an extra downtime move" still
 * mentions resting once the clause is gone, so it stays too, which is the
 * case a plain "does it say per rest" test would have thrown away.
 */
export const RECHARGE_RX =
  /\b(?:once|twice|\d+\s+times)\s+per\s+(?:short\s+|long\s+)?rest\b|\bper\s+(?:short|long)\s+rest\b|\buntil\s+(?:your|the\s+end\s+of\s+your)\s+next\s+(?:short\s+|long\s+)?rest\b/i;

export const rechargeOnly = (text: string): boolean =>
  RECHARGE_RX.test(text) &&
  !REST_RX.test(text.replace(new RegExp(RECHARGE_RX.source, "gi"), " "));

/* This file used to draw the panel as well as find it — `rulesPanel`, a
   heading over one `<div class="r">` per rule. `apps/rule-cards.ts` draws it
   now, and draws the *card* wherever the rule came from one, which is what
   both dialogs were asked for. Finding and drawing were only ever in the same
   file because there was one caller; there are two now, and the second wanted
   different markup from the same search.

   What stays here is the search, and the reason it is worth having: a feature
   that mentions taking damage is printed verbatim under the damage dialog
   rather than executed by it. Parsing English rules text into behaviour is
   how a system starts quietly getting rules wrong; this is a smaller promise
   that stays true for a feature the GM wrote last night. */
