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
}

const push = (out: Rule[], source: string, f: any): void => {
  const text = plain(f?.description);
  if (text) out.push({ name: f.name || "Feature", source, text });
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
        for (const f of s.classFeatures ?? []) push(out, it.name, f);
        push(out, it.name, s.hopeFeature);
        break;
      case "subclass": {
        const who = s.subclassName || it.name;
        for (const f of s.features ?? []) push(out, `${who} · ${it.name}`, f);
        break;
      }
      case "ancestry":
        push(out, it.name, s.topFeature);
        push(out, it.name, s.bottomFeature);
        break;
      case "community":
        push(out, it.name, s.feature);
        break;
      case "domainCard":
        if (s.inLoadout) push(out, "Loadout", { name: it.name, description: s.description });
        break;
      case "feature":
        push(out, s.origin || "Feature", { name: it.name, description: s.description });
        break;
      case "armor":
      case "weapon":
        if (s.equipped) push(out, it.name, s.feature);
        break;
      default:
        break;
    }
  }
  return out;
}

/** The ones whose text mentions what you are about to do. */
export const rulesAbout = (actor: any, rx: RegExp): Rule[] =>
  rulesOf(actor).filter((r) => rx.test(r.text) || rx.test(r.name));

/** Armour, thresholds, damage reduction — anything bearing on a hit landing. */
export const ARMOUR_RX = /\barmou?r\b|\bseverit|\bthreshold|\bdamage\s+(?:you|is|taken)/i;

/** Rests and the moves made during them. */
export const REST_RX = /\brests?\b|\bresting\b|\bdowntime\b/i;

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
