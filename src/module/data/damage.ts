/**
 * Writing a damage expression down.
 *
 * `damageField` holds a first group spread across `count`/`dice` and any
 * others in `extra`, and that shape exists because the Brawler's fists are
 * `d8+d6` — one expression with two die sizes, rolled together. Five surfaces
 * print it: the attack bar's damage button, a gear tile's Damage stat, the
 * advancement tab's sentence about Proficiency, the creation window's
 * equipment table and the item sheet. All five wrote `${count}${dice}` by
 * hand, so all five said `d8` about a weapon that rolls `d8+d6` — a fact the
 * schema had and no reader could see.
 *
 * So it is one function. The **bonus stays with the caller**, because the two
 * kinds of surface mean different numbers by it: a tile prints what is on the
 * weapon, and the attack bar prints that plus every passive item effect in
 * scope. Folding both into one call would mean this file choosing which, and
 * it has no way to know.
 */

export interface DiceGroup {
  count?: number;
  dice?: string;
}

export interface DamageExpression {
  count?: number;
  dice?: string;
  extra?: DiceGroup[];
}

/**
 * `d8+d6` printed, `2d8+2d6` rolled.
 *
 * @param mult  Proficiency, when the caller is showing what will actually be
 *              thrown. Omit for the printed expression — where a count of one
 *              is written `d8` rather than `1d8`, because that is how the book
 *              prints a weapon and the leading 1 is noise on a stat line.
 */
export function damageDice(damage: DamageExpression | undefined, mult?: number): string {
  const groups: DiceGroup[] = [
    { count: damage?.count, dice: damage?.dice ?? "d6" },
    ...(damage?.extra ?? []).filter((g) => g?.dice),
  ];
  return groups
    .map((g) => {
      const n = Math.max(1, g.count ?? 1);
      // The same arithmetic `rollWeaponDamage` does — every group scales, so
      // "both the d8 and the d6 use your Proficiency" is one claim about the
      // expression rather than a property a group could opt out of.
      return mult == null ? (n === 1 ? "" : n) + (g.dice ?? "d6") : `${mult * n}${g.dice ?? "d6"}`;
    })
    .join("+");
}
