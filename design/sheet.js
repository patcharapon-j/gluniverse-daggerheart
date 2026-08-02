// The character sheet — candidate C built out.
//
// Nothing in here draws a card, a tile, a spine, a threshold bar or a
// resource pip. Those all already exist and the sheet's whole job is to
// arrange them: CARD/MINI/SPINE/TILE from the loadout study, GEMS from the
// gem study, MARKS and DAMAGE from mark.js, ATTACK from roll.js. If the
// sheet had to restate any of them it would drift from them, which is the
// failure the shared definitions exist to prevent.

import { DOMAINS, KINDS, icon, glyph } from './domains.js';
import { CARD } from './card.js';
import { SPINE, TILE } from './tile.js';
import { GEMS } from './gem.js';
import { MARKS, DAMAGE, XBOX, XMARK } from './mark.js';
import { ATTACK, dmgText } from './roll.js';

const by = s => DOMAINS.find(d => d.slug === s);

/* ── the character ────────────────────────────────────────────────
   One Ranger, used everywhere, so a change to the sheet is never
   confounded by a change to the data. */
export const PC = {
  name: 'Aliyah Vance', heritage: 'Elf · Wildborne', cls: 'Ranger', sub: 'Beastbound',
  level: 3, prof: 2, profMax: 6,
  traits: [['Agility', '+2', true, ['Sprint', 'Leap', 'Maneuver']],
           ['Strength', '−1', false, ['Lift', 'Smash', 'Grapple']],
           ['Finesse', '+1', true, ['Control', 'Hide', 'Tinker']],
           ['Instinct', '+2', false, ['Perceive', 'Sense', 'Navigate']],
           ['Presence', '+0', false, ['Charm', 'Perform', 'Deceive']],
           ['Knowledge', '+1', false, ['Recall', 'Analyze', 'Comprehend']]],
  /* Beastbound casts with Agility. The trait row is the only place this
     fact is any use, and it lives on a subclass card two tabs away. */
  spellcast: 'Agility',
  evasion: 11,
  hp: 7, hpMarked: 2, stress: 6, stressMarked: 3, armorMarked: 1,
  hope: 4, scars: 0,
  gold: {hf: 7, bg: 3, ch: 0},
  exp: [['Wildborne tracker', '+2'], ['Never forgets a face', '+2'], ['Bad with authority', '+2']],
  /* Things you merely have. No rules text, no card — this is the whole line:
     a torch is not a card, and a Gem of Alacrity's text is a rule. */
  inventory: ['Torch', '50 ft of rope', 'A rival’s letter', 'Chalk'],
  /* What is in each hand, and on the body. Three slots, not a list with
     flags — the rules give a character exactly one of each, and a shape
     that can represent two equipped primaries can represent a bug. */
  equip: {primary: 'longbow', secondary: null, armor: 'gambeson'},
  owned: ['longbow', 'broadsword', 'shield', 'gambeson'],
};

/* ── the kit ──────────────────────────────────────────────────────
   Real weapons off the Tier 1 tables, stats included, because the attack
   bar has to do arithmetic and arithmetic on invented numbers teaches
   nothing. `die`/`bonus` are the *printed* damage — the sheet multiplies
   the die by Proficiency itself, which is the rule people miss.

   `atk` is a flat bonus to the attack roll and `armorScore` a flat bonus to
   Armor Score, so a weapon's feature is a number the sheet can actually
   apply rather than a sentence somebody has to remember. */
export const KIT = {
  longbow: {slot:'primary', name:'Wyrmwood Longbow', tier:1,
    trait:'Agility', range:'Very Far', burden:'Two-Handed', die:8, bonus:3,
    text:'On a successful attack, you can **mark a Stress** to make the target *Vulnerable* until your next attack against them.'},
  broadsword: {slot:'primary', name:'Hunter’s Broadsword', tier:1,
    trait:'Agility', range:'Melee', burden:'One-Handed', die:8, bonus:0,
    atk:1, feat:'Reliable +1',
    text:'**Reliable.** Gain a **+1** bonus to your attack rolls with this weapon.'},
  shield: {slot:'secondary', name:'Round Shield', tier:1,
    trait:'Strength', range:'Melee', burden:'One-Handed', die:4, bonus:0,
    armorScore:1, feat:'Protective +1',
    text:'**Protective.** Gain a **+1** bonus to your Armor Score.'},
  /* Printed thresholds are base values — the sheet's are these plus level,
     which is why the rail reads 7/15 off a 4/12 armour at level 3. If these
     two ever disagree it is this line that is wrong, not the track. */
  gambeson: {slot:'armor', name:'Gambeson Armor', tier:1,
    base:4, major:4, severe:12,
    text:'Gain a **+1** bonus to your Evasion while you have at least one unmarked Armor Slot.'},
};

/* ── loot ─────────────────────────────────────────────────────────
   Items are kept and reused; consumables are used once and you can hold up to
   five of each, which makes a consumable the only thing on this sheet that is
   both a card and a resource. `held` is how many are left, so the charges are
   crossed off from the right — the same direction Hit Points and Stress read
   in, and the reason there is no second convention to learn.

   Rarity is a word and nothing else. There is no hue left to spend on it and
   the value ramp that could have carried it would have been the third grey
   scale on a sheet that already has two.

   There is no treasure here because there is no treasure in the rules: loot
   is items and consumables, and money is gold, which is on the rail. */
export const CHARGES = 5;
export const LOOT = [
  {k:'potion', kind:'consumable', name:'Minor Health Potion', rarity:'Common', held:3,
   text:'**Clear 1d4 Hit Points.**'},
  {k:'venom', kind:'consumable', name:'Improved Grindletooth Venom', rarity:'Rare', held:1,
   text:'You can apply this venom to a weapon that deals physical damage to **add a d8** to your next damage roll with that weapon.'},
  {k:'bedroll', kind:'item', name:'Premium Bedroll', rarity:'Common',
   text:'During downtime, you automatically **clear a Stress**.'},
  {k:'torch', kind:'item', name:'Alistair’s Torch', rarity:'Uncommon',
   text:'You can light this magic torch at will. The flame’s light fills a much larger space than it should, enough to illuminate a cave bright as day.'},
  {k:'gem', kind:'item', name:'Gem of Alacrity', rarity:'Legendary',
   text:'You can attach this gem to a weapon, allowing you to use your **Agility** when making an attack with that weapon.'},
];

export const eq = slot => KIT[PC.equip[slot]] ?? null;

/* Armor Score and Armor Slots are not the same number and were being
   drawn from one field. Slots are the armour's Base Score; the Score
   itself is that base plus every bonus on top — a Round Shield raises what
   you subtract from a hit without giving you another box to mark. */
export const armorSlots = () => eq('armor')?.base ?? 0;
export const armorScore = () => (eq('armor')?.base ?? 0) + (eq('secondary')?.armorScore ?? 0);
export const major  = () => (eq('armor')?.major  ?? 0) + PC.level;
export const severe = () => (eq('armor')?.severe ?? 0) + PC.level;

/* The rule, in one place: a secondary needs a free hand. Kept as a
   predicate rather than checked at each call site, because it governs the
   attack bar, the gear slot and the carried list, and three copies of a
   rule is three chances to disagree about it. */
export const twoHanded = () => eq('primary')?.burden === 'Two-Handed';
export const hands = () => (twoHanded()
  ? `${eq('primary').name} is Two-Handed — no free hand`
  : null);

/* Hit Points and Stress share a column and therefore share a box size. Both
   are sized for whichever is longer, so gaining a Stress slot at level 4
   resizes both rows together rather than making them disagree. */
export const vitSpan = () => Math.max(PC.hp, PC.stress);

const TR = k => {
  const t = PC.traits.find(x => x[0] === k);
  return t ? parseInt(t[1].replace('−', '-'), 10) : 0;
};

/* What the attack bar is handed. Both slots always appear: a Secondary row
   that vanished when it could not be used would have hidden the rule along
   with the row. */
export const atkSlots = () => {
  const row = (key, label) => {
    const w = eq(key);
    if(w) return {key, slot:label, w, prof:PC.prof, mod:TR(w.trait) + (w.atk ?? 0)};
    return {key, slot:label, w:null,
      blocked: key === 'secondary' && twoHanded(),
      note: (key === 'secondary' ? hands() : null) ?? 'nothing equipped'};
  };
  return [row('primary', 'Primary'), row('secondary', 'Secondary')];
};

/* ── advancement ──────────────────────────────────────────────────
   Straight off the printed character guide, slot counts included, because
   the slot count *is* the rule: an option with three boxes can be taken
   three times over its tier and no more. Proficiency and Multiclass are
   the two that carry a heavier frame on the printed sheet — that box means
   the option consumes both of the level's two choices rather than one.

   Tier 1 is not here. It is character creation, and it has no options. */
export const ADV = [
  { tier: 2, lv: '2–4', at: 2,
    ach: 'At level 2, gain an additional Experience at +2 and a +1 bonus to your Proficiency.',
    opts: [
      {k: 'Gain a +1 bonus to two unmarked character traits and mark them', slots: 3, on: 1},
      {k: 'Permanently gain one Hit Point slot',                           slots: 2, on: 0},
      {k: 'Permanently gain one Stress slot',                              slots: 2, on: 1},
      {k: 'Permanently gain a +1 bonus to two Experiences',                slots: 1, on: 0},
      {k: 'Choose an additional domain card of your level or lower (up to level 4)', slots: 1, on: 0},
      {k: 'Permanently gain a +1 bonus to your Evasion',                   slots: 1, on: 0},
    ]},
  { tier: 3, lv: '5–7', at: 5,
    ach: 'At level 5, gain an additional Experience at +2 and clear all marks on character traits. Then gain a +1 bonus to your Proficiency.',
    opts: [
      {k: 'Gain a +1 bonus to two unmarked character traits and mark them', slots: 3, on: 0},
      {k: 'Permanently gain one Hit Point slot',                           slots: 2, on: 0},
      {k: 'Permanently gain one Stress slot',                              slots: 2, on: 0},
      {k: 'Permanently gain a +1 bonus to two Experiences',                slots: 1, on: 0},
      {k: 'Choose an additional domain card of your level or lower (up to level 7)', slots: 1, on: 0},
      {k: 'Permanently gain a +1 bonus to your Evasion',                   slots: 1, on: 0},
      {k: 'Take an upgraded subclass card, then cross out the multiclass option for this tier', slots: 1, on: 0},
      {k: 'Increase your Proficiency by +1',                               slots: 2, on: 0, pair: true},
      {k: 'Multiclass — choose an additional class, then cross out an unused subclass upgrade and the other multiclass option', slots: 2, on: 0, pair: true},
    ]},
  { tier: 4, lv: '8–10', at: 8,
    ach: 'At level 8, gain an additional Experience at +2 and clear all marks on character traits. Then gain a +1 bonus to your Proficiency.',
    opts: [
      {k: 'Gain a +1 bonus to two unmarked character traits and mark them', slots: 3, on: 0},
      {k: 'Permanently gain one Hit Point slot',                           slots: 2, on: 0},
      {k: 'Permanently gain one Stress slot',                              slots: 2, on: 0},
      {k: 'Permanently gain a +1 bonus to two Experiences',                slots: 1, on: 0},
      {k: 'Choose an additional domain card of your level or lower',       slots: 1, on: 0},
      {k: 'Permanently gain a +1 bonus to your Evasion',                   slots: 1, on: 0},
      {k: 'Take an upgraded subclass card, then cross out the multiclass option for this tier', slots: 1, on: 0},
      {k: 'Increase your Proficiency by +1',                               slots: 2, on: 0, pair: true},
      {k: 'Multiclass — choose an additional class, then cross out an unused subclass upgrade and the other multiclass option', slots: 2, on: 0, pair: true},
    ]},
];

/* ── the cards ────────────────────────────────────────────────────
   Real definitions in the shape CARD/SPINE/TILE all take, so the spine in
   the loadout, the tile in the gear tab and the card in the peek are the
   same object drawn three ways. */
export async function deck(){
  const [bone, sage, valor, grace, splendor, ancG, comG,
         priG, secG, armG, gearG, conG] = await Promise.all([
    icon('bone'), icon('sage'), icon('valor'), icon('grace'), icon('splendor'),
    glyph('ancestry'), glyph('community'),
    glyph('primary'), glyph('secondary'), glyph('armor'),
    glyph('gear'), glyph('consumable')]);
  /* A glyph per slot rather than one for all equipment. The three slots are
     the only thing about a piece of gear you cannot read off its stats, and
     they are what you scan the carried list for; `gear` stays the generic mark
     for everything that is not held in a slot at all. */
  const gearGlyph = {primary: priG, secondary: secG, armor: armG,
                     item: gearG, consumable: conG};

  const loadout = [
    { d:by('bone'), sig:bone, lvl:1, rc:1, type:'ABILITY', name:'Hold Them Off', foot:'Bone',
      text:'When you succeed on an attack with a weapon that has a **Far** or **Very Far** range, you can **mark a Stress** to use this attack against two additional targets within range.' },
    { d:by('sage'), sig:sage, lvl:1, rc:0, type:'ABILITY', name:'Gifted Tracker', foot:'Sage',
      text:'When you spend time observing tracks, you can make an **Instinct Roll** to gather information about the creature that left them.' },
    { d:by('bone'), sig:bone, lvl:2, rc:1, type:'ABILITY', name:'Untouchable', foot:'Bone',
      text:'Gain a bonus to your Evasion equal to half your Agility. **Mark a Stress** to make an attack against you roll with Disadvantage.' },
    { d:by('sage'), sig:sage, lvl:2, rc:2, type:'SPELL', name:'Vicious Entangle', foot:'Sage',
      text:'Make a **Spellcast Roll** against a target within Far range. On a success, roots erupt and the target is *Restrained*.' },
    { d:by('bone'), sig:bone, lvl:3, rc:2, type:'ABILITY', name:'Signature Move', foot:'Bone',
      text:'Name and describe your signature combat move. Once per rest, **spend a Hope** to use it and roll with Advantage.' },
  ];

  const vault = [
    { d:by('sage'), sig:sage, lvl:1, rc:1, type:'ABILITY', name:'Nature’s Tongue', foot:'Sage',
      text:'You can speak with plants and animals.' },
    { d:by('bone'), sig:bone, lvl:1, rc:1, type:'ABILITY', name:'Deft Maneuvers', foot:'Bone',
      text:'Once per rest, **mark a Stress** to move up to Close range without triggering a reaction.' },
    { d:by('valor'), sig:valor, lvl:2, rc:1, type:'ABILITY', name:'Bare Bones', foot:'Valor',
      text:'When you choose not to equip armor, your Armor Score equals your level.' },
    { d:by('grace'), sig:grace, lvl:1, rc:1, type:'ABILITY', name:'Deft Deceiver', foot:'Grace',
      text:'**Spend a Hope** to gain Advantage on a roll to deceive or trick someone.' },
    { d:by('splendor'), sig:splendor, lvl:2, rc:2, type:'SPELL', name:'Healing Hands', foot:'Splendor',
      text:'Make a **Spellcast Roll (13)**. On a success, clear a Hit Point on a creature you touch.' },
  ];

  /* Class, subclass, ancestry and community. All four are cards in
     Daggerheart, and they live in the main tab rather than behind a tab of
     their own: you get exactly one ancestry, one community and one class,
     and between one and three subclass cards. A tab that can only ever hold
     the same six things is not a tab, it is a heading.

     They are drawn as spines, the same row the domain loadout uses, with the
     full card on hover. Four fixed cards at full size were four permanent
     paragraphs at the bottom of the tab you open most, and their text is
     re-read about once a session — a spine is the row you scan, and the card
     is one gesture away when you actually want to read it. It also means
     every card on this sheet is reached the same way.

     Class and subclass carry both of the class's domains, because that is
     what a class is — Ranger is Bone and Sage, and the duo treatment built
     for subclass cards says so without a word. Ancestry and Community carry
     neither, so they stay graphite: in this system a saturated hue means
     domain, and a heritage has none. */
  const cls = [
    { d:by('bone'), d2:by('sage'), sig:bone, sig2:sage, type:'CLASS', name:'Ranger',
      foot:'Bone · Sage', stats:[{k:'Evasion',v:'12'},{k:'Hit Points',v:'6'},{k:'Domains',v:'Bone · Sage'}],
      feats:[
        {n:'Ranger’s Focus', t:'**Spend 3 Hope** to make an attack against a target. On a success, deal your primary weapon damage and temporarily make them your Focus. Until this Focus ends, you know their direction and your attacks against them deal an extra die of damage.'},
        {n:'Hope Feature', t:'Focus ends when the target is defeated or you make another creature your Focus.'},
      ] },
    { d:by('bone'), d2:by('sage'), sig:bone, sig2:sage, type:'SUBCLASS', name:'Beastbound',
      foot:'Foundation', stats:[{k:'Spellcast',v:'Agility'},{k:'Companion',v:'Sable'}],
      feats:[
        {n:'Companion', t:'You have an animal companion. Take the Ranger Companion sheet and give them a name; they act on your spotlight and share your Stress.'},
        {n:'Expert Training', t:'**Spend a Hope** to give your companion Advantage on their next attack, or to clear a Stress on them.'},
      ] },
  ];
  const heritage = [
    { d:KINDS.ancestry, sig:ancG, type:'ANCESTRY', name:'Elf', foot:'Heritage',
      feats:[
        {n:'Quick Reactions', t:'**Mark a Stress** to gain advantage on a reaction roll.'},
        {n:'Celestial Trance', t:'During a rest, you can drop into a trance to choose one Experience and gain a **+1** bonus to it until your next rest.'},
      ] },
    { d:KINDS.community, sig:comG, type:'COMMUNITY', name:'Wildborne', foot:'Heritage',
      flavour:'Raised under canopy, taught to leave nothing behind but the path you came by.',
      feats:[
        {n:'Lightfoot', t:'Your movement is naturally silent. You have advantage on rolls to move without being heard.'},
      ] },
  ];

  /* Loot, in the shape SPINE and CARD both take, derived from LOOT so the row
     and the card can never say different things. Graphite like the rest of the
     equipment: a potion belongs to no domain either. */
  const loot = LOOT.map(o => ({
    d:KINDS.gear, sig: o.kind === 'consumable' ? conG : gearG,
    type: o.kind === 'consumable' ? 'CONSUMABLE' : 'ITEM',
    name:o.name, foot:o.rarity, text:o.text, src:o}));

  /* A stable identity per card, used by the swap's FLIP. It cannot be the
     index: an index is exactly what a swap changes, so flipping by index
     animates every row into its neighbour instead of moving one card. */
  [...loadout, ...vault].forEach(c => { c.k = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'); });

  return {loadout, vault, cls, heritage, loot, gearGlyph};
}

/* ── loadout and vault ────────────────────────────────────────────
   Five active domain cards, maximum. Subclass, ancestry and community do
   not count toward it and are always active, which is why they are in the
   main tab and not here.

   Two ways out of the vault, and the sheet has to be able to tell them
   apart because they cost different amounts: free when you start a rest,
   before any downtime moves, or mark Stress equal to the card's Recall
   Cost at any other time. That number is already printed in the corner
   chip of every domain row, so the price was drawn before the interaction
   existed — this only has to spend it.

   `resting` defaults to false. A sheet that defaulted the other way would
   hand out free swaps in the middle of a fight and never say so; the
   priced state is the normal state of play. */
export const LOADCAP = 5;
export const SWAP = {armed: null, resting: false};

export const recallCost = c => SWAP.resting ? 0 : (c?.rc ?? 0);
export const canPay = c => recallCost(c) === 0
  || PC.stressMarked + recallCost(c) <= PC.stress;

/* A kit entry, drawn as a tile. Built here rather than stored alongside the
   stats so there is one definition of a weapon and the presentation is
   derived from it — the damage cell is the printed die, and the *rolled*
   dice appear only in the attack bar where Proficiency is in scope. */
const CAP = {primary:'Primary', secondary:'Secondary', armor:'Armor'};

/* The chip carries the tier, in the cell a domain card puts its level in. It
   is the same kind of number — the one you sort and shop by — so it takes the
   same cell, prefixed with a T because it is not the same number. That also
   frees the footer to say only which slot the thing goes in, which was the one
   fact the tile could not otherwise tell you. */
export const kitTile = (w, D) => TILE({
  d:KINDS.gear, sig:D.gearGlyph[w.slot] ?? D.gearGlyph.item,
  lvl:w.tier, pre:'T',
  type: w.slot === 'armor' ? 'ARMOR' : 'WEAPON',
  name:w.name, foot:CAP[w.slot],
  stats: w.slot === 'armor'
    ? [{k:'Base',v:w.base},{k:'Major',v:w.major},{k:'Severe',v:w.severe},
       {k:'Slots',v:`${armorSlots() - PC.armorMarked} / ${armorSlots()}`}]
    : [{k:'Trait',v:w.trait},{k:'Range',v:w.range},
       {k:'Damage',v:`d${w.die}${w.bonus ? `+${w.bonus}` : ''}`},{k:'Burden',v:w.burden}],
  text:w.text});

/* ── defence silhouettes ──────────────────────────────────────────
   Straight from the printed sheet, where Evasion and Armor are told apart
   by outline rather than by label: Evasion is an arch, Armor is a shield.

   The first version put two gold ticks glancing off the arch's shoulder to
   mean "a blow going wide". They read as two stray diagonal lines floating
   next to the number, because that is what they were — marks outside the
   silhouette, belonging to nothing. Replaced with an after-image: the same
   arch, twice, offset left and drawn as outline only, occluded on its right
   by the solid arch on top. Nothing floats; the shape is simply somewhere
   its own outline says it used to be, which is what dodging looks like. */
const ARCH_D = 'M12 61 L12 26 Q12 7 33 7 Q54 7 54 26 L54 61 Z';
const ARCH = `
<svg viewBox="0 0 64 66" aria-hidden="true">
  <path class="gh f" d="${ARCH_D}" transform="translate(-11.5 0)"/>
  <path class="gh n" d="${ARCH_D}" transform="translate(-6 0)"/>
  <path class="sil" d="${ARCH_D}"/>
</svg>`;
const SHIELD = `
<svg viewBox="0 0 64 66" aria-hidden="true">
  <path class="sil" d="M12 8 L54 8 L54 34 Q54 53 33 61 Q12 53 12 34 Z"/>
</svg>`;

export const DEFENCE = () => `
<div class="dfn">
  <div>
    <div class="crest ev">${ARCH}<span class="v">${PC.evasion}</span></div>
    <span class="k">Evasion</span>
  </div>
  <div>
    <!-- The numeral is the Armor *Score*, which a shield raises; the boxes
         beside it are the armour's Base Score, which a shield does not. -->
    <div class="crest">${SHIELD}<span class="v sh">${armorScore()}</span></div>
    <span class="k">Armor</span>
  </div>
  <!-- "Slots", not "Armor Slots". It sits four pixels from a shield with the
       word ARMOR under it, and the longer label wrapped its own count onto a
       second line in the 102px this column has. -->
  <div class="side">
    ${MARKS({label:'Slots', total:armorSlots(), marked:PC.armorMarked, kind:'armor'})}
  </div>
</div>`;

/* ── gold ─────────────────────────────────────────────────────────
   Ten handfuls make a bag, ten bags make a chest, and the printed sheet
   draws all three rows because the conversion is the point. Clickable,
   because counting coins is the one bit of bookkeeping that is a pleasure.
   Three silhouettes so each row is identifiable without its label. */
const purse = (cls, k, n, on) => `
  <div class="ln ${cls}"><span class="k">${k}</span>
    <span class="set">${Array.from({length: n}, (_, i) =>
      `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</span></div>`;

export const GOLD = () => `
<div class="gld">
  <div class="rows">
    ${purse('hf', 'Handfuls', 10, PC.gold.hf)}
    ${purse('bg', 'Bags', 10, PC.gold.bg)}
    ${purse('ch', 'Chest', 1, PC.gold.ch)}
  </div>
</div>`;

export const XP = () => `
<div class="xp">${PC.exp.map(([s, v]) =>
  `<div class="r"><b>${s}</b><em>${v}</em></div>`).join('')}</div>`;

export const TRAITS = () => `
<div class="trs">${PC.traits.map(([k, v, on, vb]) => {
  const cast = k === PC.spellcast;
  return `
  <div class="tr${on ? ' on' : ''}${cast ? ' cast' : ''}"
       ${cast ? 'title="Spellcast — your subclass casts with this trait"' : ''}>
    <span class="k">${k}</span><span class="v">${v}</span>
    <i class="mk"></i>
    <span class="vb">${vb.map(w => `<i>${w}</i>`).join('')}</span></div>`;
}).join('')}</div>`;

const S = (k, body, note) =>
  `<div class="sec"><div class="pnl" style="padding:0;border:0">
     <div class="k">${k}${note ? `<s>${note}</s>` : ''}</div>${body}</div></div>`;

/* ── the rail ─────────────────────────────────────────────────────
   Ordered by how often it is touched, top to bottom, because if the window
   is ever short enough to scroll this rail it is the tail that should go:
   identity, defence, damage, stress, hope, experience, gold. */
export const RAIL = () => `
<div class="rail">
  <div class="dio">
    <div class="img"></div><div class="scrim"></div>
    <div class="lv"><i>Lv</i><b>${PC.level}</b></div>
    <div class="nm"><b>${PC.name}</b>
      <span>${PC.heritage}<br>${PC.cls} · <em>${PC.sub}</em></span></div>
  </div>
  <div class="scr">
    <div class="sec">${DEFENCE()}</div>
    <!-- One section, two tracks. The printed sheet puts Hit Points and
         Stress under a single "Damage & Health" heading and it is right to:
         they are the same question asked twice, and a divider between them
         claimed otherwise while costing 28px of a rail that does not have
         28px to spare. -->
    <!-- Both tracks sized for the same count. 7 Hit Points and 6 Stress
         divided independently is two box sizes stacked in one column, and
         two sizes read as two kinds of thing — they are the same box. -->
    <div class="sec" id="vit">
      ${DAMAGE({major:major(), severe:severe(), hp:PC.hp, marked:PC.hpMarked, span:vitSpan()})}
      ${MARKS({label:'Stress', total:PC.stress, marked:PC.stressMarked,
        kind:'stress', vuln:true, span:vitSpan()})}
    </div>
    <div class="sec" id="hp"><div class="pool">
      <div class="hd"><span class="k">Hope</span>
        <span class="n">${PC.hope}<s> / ${6 - PC.scars}</s></span></div>
      ${GEMS({cur:PC.hope, max:6, scars:PC.scars, sz:32, gap:10, ground:'paper'})}</div></div>
    ${S('Experience', XP())}
    ${S('Gold', GOLD(), `${PC.gold.bg}b · ${PC.gold.hf}h`)}
  </div>
</div>`;

/* ── the body ─────────────────────────────────────────────────────
   Five tabs. `class` is gone: a character has exactly one ancestry, one
   community, one class and between one and three subclass cards, so its
   contents could never change and a tab whose contents never change is a
   heading that costs a click. Those cards moved into the main tab at full
   size, where they belong — they are the answer to "what am I", and that is
   the first question the sheet should be able to answer. */
const TAB_KEYS = [['loadout', 'main'], ['vault', 'vault'], ['gear', 'gear'],
                  ['advancement', 'advancement'], ['bio', 'bio']];

const TABS = (tab, D) => `
<div class="tabs">
  ${TAB_KEYS.map(([t, lb]) =>
    `<button data-tab="${t}" class="${t === tab ? 'on' : ''}">${lb}</button>`).join('')}
  <span class="ct">${tab === 'vault' ? `${D.vault.length} in vault`
    : tab === 'advancement' ? `tier ${tier(PC.level)}` : `prof ${PC.prof}`}</span>
</div>`;

const tier = lv => lv >= 8 ? 4 : lv >= 5 ? 3 : lv >= 2 ? 2 : 1;

/* ── proficiency ──────────────────────────────────────────────────
   Circles, from the printed sheet, and the only circles on the sheet other
   than a gold coin — which is fine, because they are also the only thing
   that is filled in permanently and never cleared. It lives in the
   advancement tab because that is the only place it ever changes. */
const PROF = () => `
<div class="prof">
  <span class="set">${Array.from({length: PC.profMax}, (_, i) =>
    `<i class="${i < PC.prof ? 'on' : ''}"></i>`).join('')}</span>
  <span class="n">${PC.prof}</span>
</div>`;

/* One advancement option. The slot boxes are the same crossed box as Hit
   Points and Stress, at half the size and with the neutral arm — which is
   the point of the mark being a component: an advancement is also a thing
   you cross off, and it should animate like one without looking like a
   wound. */
const OPT = (o, ti, oi) => `
<div class="row${o.on >= o.slots ? ' done' : ''}">
  <span class="slots${o.pair ? ' pair' : ''}" data-adv="${ti}.${oi}">
    ${Array.from({length: o.slots}, (_, i) => XBOX(i < o.on)).join('')}</span>
  <span class="lb">${o.k}</span>
</div>`;

const TIER = (t, i) => {
  const open = PC.level >= t.at;
  const used = t.opts.reduce((n, o) => n + o.on, 0);
  return `
<div class="pnl adv${open ? '' : ' shut'}">
  <div class="k">Tier ${t.tier}<s>${open ? `${used} marked` : `from level ${t.at}`}</s></div>
  <p class="ach">${t.ach}</p>
  ${t.opts.map((o, oi) => OPT(o, i, oi)).join('')}
</div>`;
};

/* ── gear ─────────────────────────────────────────────────────────
   Three slots drawn as three slots. An empty one keeps its frame and its
   label, and a *blocked* one says why it is blocked — the two-handed rule
   is exactly the kind of thing a sheet should enforce silently and explain
   loudly, since the alternative is a table argument in session four. */
const SLOT = (key, label, D) => {
  const w = eq(key);
  if(w) return `
  <div class="slot" data-slot="${key}">
    <div class="sh"><span>${label}</span><button data-un="${key}">unequip</button></div>
    ${kitTile(w, D)}
  </div>`;
  const why = key === 'secondary' ? hands() : null;
  return `
  <div class="slot empty${why ? ' blocked' : ''}" data-slot="${key}">
    <div class="sh"><span>${label}</span></div>
    <div class="ph"><b>${why ? 'No free hand' : 'Empty'}</b>
      <span>${why ?? 'Nothing equipped in this slot.'}</span></div>
  </div>`;
};

/* Everything owned that is not currently in a slot. A card that cannot be
   equipped right now is still listed and still says so — hiding it would
   make the shield look lost rather than shelved. */
const CARRIED = (D) => {
  const held = new Set(Object.values(PC.equip).filter(Boolean));
  const rest = PC.owned.filter(k => !held.has(k));
  if(!rest.length) return '';
  return `
  <div class="pnl"><div class="k">Carried<s>click to equip</s></div>
    <div class="grid2">${rest.map(k => {
      const w = KIT[k], no = w.slot === 'secondary' && twoHanded();
      return `<div class="eqp${no ? ' no' : ''}" data-eq="${k}"${
        no ? ` title="${hands()}"` : ''}>${kitTile(w, D)}
        <span class="act">${no ? 'needs a free hand' : `equip · ${CAP[w.slot]}`}</span>
      </div>`;
    }).join('')}</div></div>`;
};

/* ── loot ─────────────────────────────────────────────────────────
   The same row as the domain loadout, with the full card on hover and pinned
   on click. Loot with a rules paragraph earns a card because a rule you
   cannot see is a rule you will not use; a torch stays a line, because it is
   a thing you have rather than a thing you do.

   A consumable's charges ride at the end of the row's meta line and are
   clickable there — spending one is the commonest thing you will do to loot
   and it should not require opening anything. `data-act` keeps the click off
   the peek: a control inside a row is a control first. */
/* Crossed from the *left*, like every other row of boxes on this sheet. It is
   tempting to cross from the right so the survivors sit where the count would
   — and it would make this the one row that fills the other way, which is the
   kind of small inconsistency nobody notices and everybody misreads. */
const CHG = (o) => `<span class="chg" title="${o.held} of ${CHARGES} left">${
  Array.from({length: CHARGES}, (_, i) =>
    `<i class="${i < CHARGES - o.held ? 'on' : ''}" data-act data-ch="${o.k}"
      ><u></u>${XMARK}<b></b></i>`).join('')}</span>`;

const LOOT_PANEL = (D) => {
  const rows = D.loot.map((c, i) => `
    <div class="pk" data-pk="k${i}">${SPINE({...c,
      aside: c.src.kind === 'consumable' ? CHG(c.src) : null})}</div>`).join('');
  const charged = LOOT.filter(o => o.kind === 'consumable')
                      .reduce((n, o) => n + o.held, 0);
  return `
  <div class="pnl"><div class="k">Loot<s>${D.loot.length} carried · ${charged} charges</s></div>
    <div class="grid2">${rows}</div></div>`;
};

/* ── the swap surface ─────────────────────────────────────────────
   The vault tab carries both lists. At 5/5 there is no such thing as
   "add a card" — something leaves — so the gesture takes two picks, and
   the pick that decides it (is this better than the worst one I hold?)
   needs both lists on screen at once. They were in two tabs, which is
   why the vault tab was a list you could only look at.

   The rows are the same spine as everywhere else and carry three data
   hooks: `data-fk` is the card's key, for the FLIP; `data-vt`/`data-ld`
   are its position, for the gesture; `data-drag` says a row may be
   picked up. `data-swap` tells peek.js to keep its hover and drop its
   click, because in this tab a click on a row means "move this". */
/* `live` is what makes a slot a drop target. The main tab draws the same
   slots to report the same fact and must not accept anything, because the
   vault is not on screen there — a target you cannot drag to is a target
   that lies about what the tab does. */
const empties = (n, live = false) => Array.from({length: n}, () => `
  <div class="pk"${live ? ' data-ld="-1"' : ''}>
    <div class="mtslot"><b>Empty</b><span>${
      live && SWAP.armed != null ? 'drop a card here' : 'room for one more'}</span></div>
  </div>`).join('');

const PIPS = n => `<span class="pips">${'<i></i>'.repeat(n)}</span>`;

/* The switch is the whole of "resting" on this sheet. Rests are run at the
   table for now — no downtime moves, no short/long, nothing cleared — so
   nothing turns this off but a hand, and that makes it the only thing on
   screen that knows whether a swap is free. It therefore has to say which
   state it is *in* rather than restating the rule: "free while resting"
   is true in both positions and so answers nothing. Left on by accident,
   the alternative is a sheet quietly giving away Stress it should have
   charged. */
const COST = (armed) => {
  const c = armed ? recallCost(armed) : null;
  const ok = armed ? canPay(armed) : true;
  const idle = SWAP.resting
    ? '<b>Swaps are free</b> until you switch this off'
    : 'Swaps cost the card’s Recall Cost in Stress';
  return `
  <div class="swcost${SWAP.resting ? ' on' : ''}">
    <label class="rst" data-act
      title="Set by hand — rests are run at the table. This changes the price of a swap and nothing else."
      ><input type="checkbox" data-rest${SWAP.resting ? ' checked' : ''}><u></u><span>Resting</span></label>
    <em>${armed ? `Recall <b>${armed.name}</b>` : idle}</em>
    ${armed ? `<span class="p ${c === 0 ? 'free' : ok ? '' : 'no'}">${
      c === 0 ? 'Free' : ok ? `Mark ${c}` : `Needs ${c} · ${PC.stress - PC.stressMarked} left`
    }${c ? PIPS(c) : ''}</span>` : ''}
  </div>`;
};

const SWAP_TAB = (D) => {
  const armed = SWAP.armed != null ? D.vault[SWAP.armed] : null;
  const on = armed ? ' armed' : '';
  return `
  <div class="pnl swap${on}">
    <div class="k">Loadout<s>${D.loadout.length} / ${LOADCAP}${
      armed ? ' · choose one to replace' : ''}</s></div>
    <div class="grid2">
      ${D.loadout.map((c, i) => `
        <div class="pk" data-pk="l${i}" data-fk="${c.k}" data-ld="${i}" data-drag data-swap>
          ${SPINE(c)}<span class="swp"></span>
          <button class="shv" data-shelve="${i}" title="Move to the vault">shelve</button>
        </div>`).join('')}
      ${empties(LOADCAP - D.loadout.length, true)}
    </div>
  </div>
  <div class="pnl swap vaultp${on}">
    <div class="k">Vault<s>${D.vault.length} stored</s></div>
    ${COST(armed)}
    <div class="grid2">
      ${D.vault.map((c, i) => `
        <div class="pk vl${SWAP.armed === i ? ' arm' : armed ? ' mute' : ''}"
             data-pk="v${i}" data-fk="${c.k}" data-vt="${i}" data-drag data-swap>
          ${SPINE(c)}<span class="swp"></span>
        </div>`).join('')}
    </div>
  </div>`;
};

const BODY = (tab, D) => ({
  /* Ordered by how often it is reached for, the same rule the rail follows.
     The attack bar is touched every round, the loadout every few, and the
     class and heritage cards are read carefully once and then almost never
     — so they are last, where their height costs nothing. */
  loadout: `
    <div class="pnl"><div class="k">Attack<s>proficiency ${PC.prof}</s></div>
      ${ATTACK(atkSlots())}</div>
    <!-- Empty slots show here too. Under five you are carrying less than the
         rules allow, and the main tab is where you would notice — the fix is
         one tab away and the slot is what says to go there. -->
    <div class="pnl"><div class="k">Domain loadout<s>${D.loadout.length} / ${LOADCAP}</s></div>
      <div class="grid2">${D.loadout.map((c, i) => `
        <div class="pk" data-pk="l${i}">${SPINE(c)}</div>`).join('')}
        ${empties(LOADCAP - D.loadout.length)}</div></div>
    <div class="pnl"><div class="k">Class<s>${
      PC.level >= 5 ? 'specialization available' : 'specialization at 5 · mastery at 8'}</s></div>
      <div class="grid2">${D.cls.map((c, i) => `
        <div class="pk" data-pk="c${i}">${SPINE(c)}</div>`).join('')}</div></div>
    <div class="pnl"><div class="k">Heritage<s>${PC.heritage}</s></div>
      <div class="grid2">${D.heritage.map((c, i) => `
        <div class="pk" data-pk="h${i}">${SPINE(c)}</div>`).join('')}</div></div>`,
  /* The vault is the same spine as the loadout, because it is the same card
     — drawing it as a mini said "different kind of thing" when the truth is
     "same thing, not in hand". So: identical row, desaturated, with a vault
     tab down its edge, above the loadout it is being compared against. */
  vault: SWAP_TAB(D),
  gear: `
    <div class="pnl"><div class="k">Equipped<s>armor score ${armorScore()}</s></div>
      <div class="slots3">
        ${SLOT('primary', 'Primary weapon', D)}
        ${SLOT('secondary', 'Secondary weapon', D)}
        ${SLOT('armor', 'Armor', D)}
      </div></div>
    ${CARRIED(D)}
    ${LOOT_PANEL(D)}
    <!-- Below the loot, and it is the right way round: these are the things
         that do nothing. The heading says so rather than leaving anyone to
         wonder why the rope is not a card. -->
    <div class="pnl"><div class="k">Inventory<s>no rules, no card</s></div>
      <div class="xp">${PC.inventory.map(s => `<div class="r"><b>${s}</b></div>`).join('')}</div></div>`,
  advancement: `
    <div class="pnl adv"><div class="k">Proficiency<s>damage dice</s></div>
      ${PROF()}
      <p class="ach">Each level, choose two options with unmarked slots and mark them, then
      raise both damage thresholds by +1. An option with a heavier frame costs both choices.
      Proficiency is how many damage dice you roll — your ${eq('primary')
        ? `${eq('primary').name} rolls ${dmgText(eq('primary'), PC.prof)}` : 'weapon scales with it'}.</p>
    </div>
    ${ADV.map((t, i) => TIER(t, i)).join('')}`,
  bio: `
    <div class="pnl"><div class="k">Background</div>
      <div class="xp">
        <div class="r"><b>What did your community count on you for?</b></div>
        <div class="r"><b>Who taught you to move unseen?</b></div>
        <div class="r"><b>Why did you leave the Wildborne?</b></div>
      </div></div>
    <div class="pnl"><div class="k">Connections</div>
      <div class="xp"><div class="r"><b>What favor have I asked that you cannot fulfill?</b></div></div></div>`,
}[tab]);

/* There was an archive-box mark here, on a tab down the row's right edge —
   never a padlock, because a vaulted card is available and simply not in
   hand. It is gone, and not because the mark was wrong. `.spine .rc` is
   top-right, so the tab sat on the recall chip: the vault covering the
   price of leaving the vault. The hatch over the artwork says it now; see
   `.pk.vl .spine .thumb::after` in sheet.css. */

/* The cards for the peek layer. Rendered once per pane, outside every
   scroller — see peek.js for why they cannot live in the rows. */
const PEEKS = (tab, D) => {
  const src = tab === 'loadout'
              ? [...D.loadout.map((c, i) => [`l${i}`, c]),
                 ...D.cls.map((c, i) => [`c${i}`, c]),
                 ...D.heritage.map((c, i) => [`h${i}`, c])]
            : tab === 'vault' ? [...D.loadout.map((c, i) => [`l${i}`, c]),
                                 ...D.vault.map((c, i) => [`v${i}`, c])]
            : tab === 'gear'  ? D.loot.map((c, i) => [`k${i}`, c])
            : [];
  return `<div class="peeklayer">${src.map(([k, c]) =>
    `<div class="pkc" data-peek="${k}">${CARD(c)}</div>`).join('')}</div>`;
};

/* No inline --w/--h here. Declaring `--w:var(--w)` on the element that also
   *reads* --w is a cycle, so the property is invalid at computed-value time
   and `width:var(--w,880px)` silently takes the fallback — the window sat at
   880px no matter what the slider said. It inherits from the page instead. */
export const SHEET = (tab, D) => `
<div class="win">
  <div class="tt"><b>${PC.name}</b><s>— □ ×</s></div>
  <div class="bd">
    ${RAIL()}
    <div class="pane">
      ${TRAITS()}
      ${TABS(tab, D)}
      <div class="scr">${BODY(tab, D)}</div>
    </div>
    <!-- Inside .bd rather than .win: the layer's box is the frame a peek is
         positioned and clamped against, and the title bar is not part of the
         sheet. Parked on .win, a card centred on a top row rode up over the
         app's own chrome. -->
    ${PEEKS(tab, D)}
  </div>
</div>`;
