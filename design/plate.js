/* V1, refined, and four variations. See plate.css for what each one is
   doing and why the critical is red. */

/* The die itself lives in `die.js` now, because `keep.js` draws dice that
   sit on a card and has to draw them with this builder rather than one that
   resembles it. Re-exported so every caller of `plate.js` is unaffected. */
export { DIE } from './die.js';
import { DIE } from './die.js';

/* ── advantage ─────────────────────────────────────────────────────
   Always a d6, never anything else. Advantage adds it, disadvantage
   subtracts it, and the two cancel one-for-one across every source, so a
   roll never carries both — which is why this is one object with a sign
   rather than two independent slots.

   More than one die happens only through Help an Ally: any number of PCs
   may spend a Hope to help, each rolls a d6, and you take the *highest*.
   So several dice land and exactly one counts. The rest are crossed off
   with an X — see plate.css for why unlit was not enough. */
export const advDie = r => r.adv ? Math.max(...r.adv.dice) : 0;
export const advVal = r => r.adv ? (r.adv.neg ? -advDie(r) : advDie(r)) : 0;

const ADV = (r, sz) => {
  if(!r.adv) return '';
  const keep = r.adv.dice.indexOf(advDie(r));
  return r.adv.dice.map((v, i) =>
    DIE(v, `sq a${r.adv.neg ? ' neg' : ''}${i === keep ? '' : ' dim'}`, sz, 6)).join('');
};

/* ── the pair's own silhouettes ─────────────────────────────────────
   A duality roll is 2d12 and was drawn as two decagons on that assumption,
   which held until a card moved one: `Signature Move`, `Rise to the
   Challenge`, `Reliable Backup` and the Paragon's Chain all read "you can
   roll a d20 as your Hope Die". A 17 on a twelve-sided chip is the card
   contradicting itself about the one thing it exists to report, so `hd`
   and `fd` name the dice and the silhouette follows them. Absent is the
   printed d12 — every card posted before the pair could move was stored
   without them, and a log is a record.

   `sq` for the d6 rather than `d6`, because a square chip is also what the
   advantage die and the critical's maximum dice are, and those are not
   claiming to be a kind of die when they wear it. */
/* The table moved to `die.js` with the builder it belongs to. One copy, so
   the keep tray's d10 and the chat plate's d10 cannot become two shapes. */
import { shapeOf, facesOf } from './die.js';

/* A d6 is smaller than a d12 and is drawn smaller, because that is true
   and because it keeps the duality pair the subject of the strip. */
const DICE = (r, sz) => {
  const hd = r.hd ?? 'd12';
  const fd = r.fd ?? 'd12';
  return DIE(r.h, `h ${shapeOf(hd)}` + (r.out === 'fear' ? '' : ' lit'), sz, facesOf(hd)) +
    DIE(r.f, `f ${shapeOf(fd)}` + (r.out === 'hope' ? '' : ' lit'), sz, facesOf(fd)) +
    ADV(r, Math.round(sz * .76));
};

const ADV_TERM = r => !r.adv ? [] : [{
  k: (r.adv.neg ? 'disadvantage' : 'advantage') +
     (r.adv.dice.length > 1 ? ` · highest of ${r.adv.dice.length}` : ''),
  v: advVal(r)}];

/* A term that was paid for is marked in the currency that paid for it:
   gold when a PC spent Hope, violet when the GM spent Fear. Same slot,
   same grammar, and the two sides never wear each other's colour. */
const TERMS = (t, cls) => `<div class="pl-arith${cls ? ' ' + cls : ''}">${t.map((x, i) =>
  `${i ? `<u>${x.v < 0 ? '−' : '+'}</u>` : ''}<i class="${
    x.fear ? 'fe' : x.spent ? 'sp' : ''}"><b>${
    Math.abs(x.v)}</b> ${x.k}</i>`).join('')}</div>`;

/* The pair's own term says which dice only when there is something to say.
   "dice" is right for the printed 2d12 and would be a shrug on a roll
   somebody spent a card to change; "d20 + d12" is the whole point of having
   spent it. The silhouettes carry it too, but the arithmetic strip is what
   gets read back three hours later in a log. */
const DICE_TERM = r => {
  const hd = r.hd ?? 'd12';
  const fd = r.fd ?? 'd12';
  return hd === 'd12' && fd === 'd12' ? 'dice' : `${hd} + ${fd}`;
};

export const ARITH = r => TERMS([{k:DICE_TERM(r), v:r.h + r.f}, ...ADV_TERM(r), ...r.mods]);

/* Most duality rolls are made with no Difficulty at all. That is not a
   degraded state — it is the common one — so it gets its own sentence
   rather than a verdict with a hole in it.

   A reaction roll has no such fallback: it rolls the Duality Dice and
   then throws the duality away — no Hope, no Fear, no GM move — so with
   no Difficulty there is nothing true to say about it at all. It says
   nothing. The sentence is omitted, not filled with a placeholder about
   waiting, because a card narrating its own ignorance is worse than a
   card that is simply quiet: the dice, the total and the arithmetic are
   all still there and all still correct.

   Same rule on the meta line. A missing Difficulty is not a fact worth
   a slot — no chip, no "no difficulty", nothing. */
export const VERDICT = r => r.rxn
  ? (r.out === 'crit' ? 'critical success'
    : r.dc == null ? '' : (r.hit ? 'success' : 'failure'))
  : r.out === 'crit' ? 'critical success'
  : r.dc == null ? (r.out === 'hope' ? 'with Hope' : 'with Fear')
  : `${r.hit ? 'success' : 'failure'} ${r.out === 'hope' ? 'with Hope' : 'with Fear'}`;

/* D promotes the verdict's first word into a lit chip. With no Difficulty
   there is no first word to promote — so the *whole* verdict becomes the
   chip rather than the chip becoming one bare word. "FEAR" alone in a
   gold-on-black block reads as a Fear counter, which is a different thing
   on this sheet and one the GM tracks. */
const VERDICT_CHIP = r => {
  const v = VERDICT(r);
  if(r.dc == null && r.out !== 'crit') return `<b>${v}</b>`;
  const i = v.indexOf(' ');
  return `<b>${v.slice(0, i)}</b>${v.slice(i)}`;
};

/* The name moved up beside the portrait, where the face already answers
   the same question — so the meta line's left slot carries the *kind* of
   roll instead, which is a fact the card had nowhere to put and which
   damage, reaction and adversary rolls will all need. */
const META = r => `
  <div class="pl-meta"><span>${r.kind ?? 'duality roll'}</span>${
    r.dc == null ? '' : `<s>vs ${r.dc}</s>`}</div>`;

/* The portrait, and nothing at all when there is not one. Plenty of
   actors have no art, and a card that reserves space for a missing image
   is worse than a card that never mentions it — so this returns an empty
   string and the layout is byte-for-byte what it was before.

   The framing travels with it, because the player set those three numbers
   while looking at this exact panel's proportions. They are written
   unitless: `plate.css` spends them as `cqw`/`cqh` — one percent of the
   panel — rather than as a translation of the layer, and a percentage where
   a number is expected is invalid at computed-value time, which does not
   mis-pan the picture but takes the whole `background` down with it.

   This builder went without them for a while and `src/module/dice/plate.ts`
   did not, which is the drift `tools/verify/` exists to catch: it draws the
   *design* plate, so a framed portrait was a thing the study page could not
   show and the check had to fake by setting `--fdx` by hand. Same finding as
   `sq` against `shapeOf` — right in the game, wrong on the page. */
const POR = r => {
  if ( !r.img ) return '';
  const f = r.frame;
  const vars = f ? `;--fdx:${f.x};--fdy:${f.y};--fz:${f.scale}` : '';
  return `<span class="por" style="--pic:url('${r.img}')${vars}"><i><u></u><b></b></i></span>`;
};

/* Name first, then the roll. `//` is the system's own separator and it
   is the one part of this line that may fade. */
const EYE = r => `<span class="pl-eye"><b>${r.who}</b><u>//</u><i>${r.label}</i></span>`;

/* A reaction roll generates no Hope, no Fear and no GM move, so it has
   nothing to hand anybody — its whole consequence is the effect it was
   rolled against, which is what `next` carries. A critical reaction is
   the one exception, and it is not Hope either: you ignore the effects
   that would still have hit you on a plain success. */
const claims = r => r.rxn
  ? (r.out === 'crit' ? [{t:'Ignore the effect', mine:true}] : [])
  : r.out === 'crit'
  ? [{t:'+1 Hope', mine:true}, {t:'Clear 1 Stress', mine:true}]
  : r.out === 'hope' ? [{t:'+1 Hope', mine:true}]
  : [{t:'GM gains a Fear', mine:false}];

const ACT = (list, next) => !list.length && !next ? '' : `
  <div class="pl-act">
    ${list.map(c => c.mine
      ? `<button class="pl-b"><i></i>${c.t}</button>`
      : `<span class="pl-b theirs"><i></i>${c.t}</span>`).join('')}
    ${next ? `<button class="pl-b go"><i></i>${next}</button>` : ''}
  </div>`;

/* Red plus material: a bracket and a lit glass edge in CSS, embers, one
   foil sweep and a struck badge. All of it red, and nothing below this
   rung may use any of it. It rides on .mat rather than on .crit, because
   critical *damage* is the top rung too and keeps the wound's field. */
const CRIT = on => on
  ? `<span class="embers"><i></i><i></i><i></i><i></i><i></i><i></i></span>
     <span class="foil"></span><span class="seal"><i></i><b>Critical</b></span>` : '';

const GHOST = r => r.out === 'crit' ? 'CRITICAL'
  : r.rxn ? 'REACTION' : r.out === 'hope' ? 'HOPE' : 'FEAR';

/* A rule the roll brought with it — a weapon's feature, most often. The
   card used to name the weapon and stop, which meant the one moment the
   feature is relevant was the one moment only the roller could read it:
   they have the card on their sheet, everyone else has this. Closes the
   body, above the footer, because it is part of what was rolled rather
   than part of what the roll was called. */
const NOTE = r => r.note
  ? `<div class="pl-note"><b>${r.note.n}</b><p>${r.note.t}</p></div>` : '';

/* ── A · plate ────────────────────────────────────────────────────*/
export const A = (r, next) => `
<div class="pl a1 ${r.rxn && r.out !== 'crit' ? 'flat' : r.out}${r.out === 'crit' ? ' mat' : ''}">
  ${CRIT(r.out === 'crit')}
  <div class="p">
    ${POR(r)}
    <span class="shards"></span>
    <span class="pl-gh">${GHOST(r)}</span>
    ${EYE(r)}
    <span class="row">${VERDICT(r) ? `<b class="pl-vb">${VERDICT(r)}</b>` : ''}<u
      class="pl-num">${r.total}</u></span>
  </div>
  <div class="pl-st">${DICE(r, 38)}${ARITH(r)}</div>
  ${NOTE(r)}${META(r)}${ACT(claims(r), next)}
</div>`;

/* ── B · split ────────────────────────────────────────────────────*/
export const B = (r, next) => `
<div class="pl b1 ${r.out}${r.out === 'crit' ? ' mat' : ''}">
  ${CRIT(r.out === 'crit')}
  <div class="p">
    <span class="shards"></span>
    <div class="lf">
      <span class="pl-gh">${GHOST(r)}</span>
      ${EYE(r)}
      <b class="pl-vb">${VERDICT(r)}</b>
    </div>
    <div class="rt"><u class="pl-num">${r.total}</u></div>
  </div>
  <div class="pl-st">${DICE(r, 38)}${ARITH(r)}</div>
  ${META(r)}${ACT(claims(r), next)}
</div>`;

/* ── C · wedge ────────────────────────────────────────────────────*/
export const C = (r, next) => `
<div class="pl c1 ${r.out}${r.out === 'crit' ? ' mat' : ''}">
  ${CRIT(r.out === 'crit')}
  <div class="p">
    <span class="shards"></span>
    <span class="pl-gh">${GHOST(r)}</span>
    ${EYE(r)}
    <b class="pl-vb">${VERDICT(r)}</b>
  </div>
  <div class="cross">${DICE(r, 40)}<u class="pl-num">${r.total}</u></div>
  <div class="pl-st">${ARITH(r)}</div>
  ${META(r)}${ACT(claims(r), next)}
</div>`;

/* ── D · black bar ────────────────────────────────────────────────*/
export const D = (r, next) => `
<div class="pl d1 ${r.out}${r.out === 'crit' ? ' mat' : ''}">
  ${CRIT(r.out === 'crit')}
  <div class="p">
    <span class="shards"></span>
    <span class="pl-gh">${GHOST(r)}</span>
    ${EYE(r)}
    <span class="row"><b class="pl-vb">${VERDICT_CHIP(r)}</b><u class="pl-num">${r.total}</u></span>
  </div>
  <div class="pl-st">${DICE(r, 38)}${ARITH(r)}</div>
  ${META(r)}${ACT(claims(r), next)}
</div>`;

/* ── E · stack ────────────────────────────────────────────────────*/
export const E = (r, next) => {
  const v = VERDICT(r), i = v.indexOf(' ');
  /* Stacked only when there are two things to stack. With no Difficulty
     the verdict is "with Hope" and splitting it puts "with" alone on the
     hero line — so it stays one line, at the size the second line would
     have been. */
  const two = r.out === 'crit' ? `Critical<s>success</s>`
    : r.dc == null ? `<span class="one">${v}</span>`
    : `${v.slice(0, i)}<s>${v.slice(i + 1)}</s>`;
  return `
<div class="pl e1 ${r.out}${r.out === 'crit' ? ' mat' : ''}">
  ${CRIT(r.out === 'crit')}
  <div class="p">
    <span class="shards"></span>
    <span class="pl-gh">${GHOST(r)}</span>
    <span class="hd">${EYE(r)}
      <span class="dice">${DICE(r, 30)}</span></span>
    <span class="row"><b class="pl-vb">${two}</b><u class="pl-num">${r.total}</u></span>
  </div>
  ${ARITH(r)}
  ${META(r)}${ACT(claims(r), next)}
</div>`;
};

export const RENDER = {A, B, C, D, E};

/* ── damage ────────────────────────────────────────────────────────
   No duality axis, no verdict — a damage roll is a quantity, and the
   only question about it is how big. So the parts take new jobs: the
   sentence slot carries the damage *type*, which is the one thing about
   a damage number that changes what happens to it; the meta line carries
   the notation; the number is the card.

   And the card stops at the number. How many Hit Points this becomes
   depends on the target's thresholds, armour, resistance and immunity —
   none of which live here — so it says the damage and offers to apply
   it, rather than claiming an outcome it cannot know. Same posture the
   duality card takes toward the fiction.

   Critical damage keeps the *wound's* field and takes the critical's
   material. Two reasons: the critical was already announced, loudly, on
   the attack card one message earlier, and a second saturated crit-red
   plate directly under it would read as the same event twice. What this
   card is actually saying is "and it hurt more", which is the wound's
   sentence, delivered at the top rung. */
const sum = a => a.reduce((x, y) => x + y, 0);

export const DMG = (r, next) => {
  const crit = !!r.max, flat = sum(r.mods.map(m => m.v));
  /* The damage dice take their own silhouette too, and this closes a
     divergence rather than opening one: `plate.ts` has had `shapeOf` since a
     2d8 was noticed arriving as two d6 chips, and this builder went on drawing
     `sq` for everything — so the look was right in the game and wrong on the
     study page, which is the opposite of the usual direction. */
  const shape = shapeOf(r.die);
  const notation = `${r.n}${r.die}${flat ? '+' + flat : ''}`;
  const terms = [
    ...(crit ? [{k:`${r.n}${r.die} maximum`, v:sum(r.max)}] : []),
    {k:`${r.n}${r.die}`, v:sum(r.rolls)},
    ...(r.bonus ? [{k:r.bonus.k, v:r.bonus.v}] : []),
    ...r.mods];
  return `
<div class="pl a1 wound blk${crit ? ' mat' : ''}">
  ${CRIT(crit)}
  <div class="p">
    ${POR(r)}
    <span class="shards"></span>
    <span class="pl-gh">${crit ? 'CRITICAL' : 'DAMAGE'}</span>
    ${EYE(r)}
    <span class="row"><b class="pl-vb">${crit ? 'critical ' : ''}${r.dtype} damage</b><u
      class="pl-num">${r.total}</u></span>
  </div>
  <div class="dmg-st">
    ${crit ? `<span class="grp"><s>max</s>${
      r.max.map(v => DIE(v, `${shape} w max`, 26)).join('')}</span><span class="op">+</span>` : ''}
    <span class="grp">${r.rolls.map(v => DIE(v, `${shape} w`, 26, facesOf(r.die))).join('')}</span>
    ${r.bonus ? `<span class="op">+</span><span class="grp">${
      DIE(r.bonus.v, 'sq a', 26, r.bonus.mx ?? 6)}</span>` : ''}
  </div>
  ${TERMS(terms, 'dmg-a')}
  <div class="pl-meta"><span>${crit ? 'critical damage' : 'damage roll'}</span><s>${
    notation}</s></div>
  ${ACT([], next ?? 'Apply to target')}
</div>`;
};

/* ══ THE GM SIDE ═══════════════════════════════════════════════════
   An adversary attack is not a duality roll and must not pretend to be
   one. One d20 plus the stat block's Attack Modifier, against the
   target's Evasion — meets or beats hits. No Hope, no Fear, no GM move,
   nothing passes hands. So the duality pair, the gold/violet axis and
   the whole claim row are gone.

   Advantage on this side is a *second d20*, and you take the highest
   (or the lowest on disadvantage) — not the PC's added d6. A different
   mechanic wearing the same grammar: several land, one counts, the ones
   that did not are crossed off with the X. That is the payoff for
   having given the X exactly one meaning.

   A natural 20 succeeds automatically and takes the critical rung, with
   one exception the book is explicit about: a critical on an adversary
   *reaction* roll has no added benefit at all. So it does not get the
   material either — nothing is being announced.

   Experience is bought with Fear here, the way a PC buys with Hope, so
   the term is marked violet. */
export const d20Keep = r => r.neg ? Math.min(...r.d20) : Math.max(...r.d20);
export const foeCrit = r => !r.rxn && r.d20.includes(20) && d20Keep(r) === 20;

const D20 = (r, sz) => {
  const keep = r.d20.indexOf(d20Keep(r));
  return r.d20.map((v, i) => DIE(v,
    'd20' + (i === keep ? (v === 20 && !r.rxn ? ' nat' : ' w') + ' lit' : ' dim'),
    sz, 20)).join('');
};

const FOE_ARITH = r => TERMS([
  {k: r.d20.length > 1 ? `d20 · ${r.neg ? 'lowest' : 'highest'} of ${r.d20.length}` : 'd20',
   v: d20Keep(r)},
  ...r.mods]);

/* The target's name is in the sentence, not the eyebrow, because the
   eyebrow already answers "whose roll is this" and the answer is the
   adversary. Who it landed on is the *outcome*, and the outcome slot is
   where outcomes go. A reaction roll has no target — it is the
   adversary avoiding something — so it reads as a plain verdict, and
   with no Difficulty supplied it says nothing at all. Same rule as
   every other card. */
const FOE_V = r => r.rxn
  ? (r.dc == null ? '' : r.hit ? 'success' : 'failure')
  : foeCrit(r) ? `critical hit ${r.target}`
  : r.hit ? `hit ${r.target}` : `missed ${r.target}`;

const FOE_GH = r => r.rxn ? 'REACTION'
  : foeCrit(r) ? 'CRITICAL' : r.hit ? 'HIT' : 'MISS';

/* Evasion and Difficulty are different target numbers and the chip says
   which — a GM reading a log full of both should never have to work out
   what the number on the right was. */
const FOE_META = r => `
  <div class="pl-meta"><span>${r.kind ?? 'adversary attack'}</span>${
    r.dc == null ? '' : `<s>vs ${r.rxn ? '' : 'evasion '}${r.dc}</s>`}</div>`;

/* ── FOE_KIN · the one that lost ───────────────────────────────────
   The player's plate with a hostile field, kept as the record of the
   choice. It parsed well in isolation — same eyebrow, same portrait
   band, same right-aligned number — and it lost in the log, where the
   GM reads as one more participant. */
export const FOE_KIN = (r, next) => {
  const crit = foeCrit(r), v = FOE_V(r);
  return `
<div class="pl a1 foe${crit ? ' mat' : ''}">
  ${CRIT(crit)}
  <div class="p">
    ${POR(r)}
    <span class="shards"></span>
    <span class="pl-gh">${FOE_GH(r)}</span>
    ${EYE(r)}
    <span class="row">${v ? `<b class="pl-vb">${v}</b>` : ''}<u
      class="pl-num">${r.total}</u></span>
  </div>
  <div class="pl-st">${D20(r, 38)}${FOE_ARITH(r)}</div>
  ${FOE_META(r)}${ACT([], next)}
</div>`;
};

/* ── FOE · the GM card ─────────────────────────────────────────────
   The GM is a *force*, not a participant. No portrait, no field, no cut
   corner — the family mark goes too, and that notch is on every player
   card in this system, so its absence says "not one of yours" before
   any hue does. Near-black throughout, type pushed to mono, the number
   down two sizes so the card reports rather than announces.

   ── the rail carries the outcome ──────────────────────────────────
   The card has exactly one mark, so the mark does the work: red on a
   hit, cold steel on a miss, hot on a critical. Before this the two
   outcomes were told apart only by the words, which is the slowest
   possible way to answer the fastest question a GM card is asked.

   And the number is white, not red. It was --o-hi, which is the damage
   bar's numeral colour — and a damage card lands one message after this
   one. Two different objects arriving back to back in the same clothes
   took back the one thing this treatment was bought to do. Red now
   means a quantity of harm and nothing else; a d20 against Evasion is a
   comparison, and it is set in ink. */
export const FOE = (r, next) => {
  const crit = foeCrit(r), v = FOE_V(r);
  /* Two lit states and one unlit, not three lit ones. Lit means a hit is
     being *claimed*, and a withheld Difficulty claims nothing — so it is
     unlit alongside the miss, which is exactly true of both: no hit is
     being asserted. Deriving this from r.hit instead put a red rail on a
     roll nobody had told us the target number for. */
  const landed = r.dc != null && r.hit;
  return `
<div class="pl g1 ${crit ? 'hot mat' : landed ? 'hit' : 'cold'}">
  ${CRIT(crit)}
  <span class="rail"></span>
  <div class="p">
    ${EYE(r)}
    <span class="row">${v ? `<b class="pl-vb">${v}</b>` : ''}<u
      class="pl-num">${r.total}</u></span>
  </div>
  <div class="pl-st">${D20(r, 32)}${FOE_ARITH(r)}</div>
  ${FOE_META(r)}${ACT([], next)}
</div>`;
};

/* ── arrival ──────────────────────────────────────────────────────
   Stepped at 58ms, not per frame: at 60fps the numerals blur to a grey
   average and the dice stop reading as dice. Timers rather than rAF,
   because rAF does not fire in a window that is not painting and a chat
   log is very often exactly that. The result is written into the markup
   before any of this runs — the tumble only overwrites the display. */
const TUMBLE = 430, STEP = 58;

export function play(el){
  clearTimeout(+el.dataset.tk || 0);
  el.classList.remove('play', 'land', 'rolling');
  void el.offsetWidth;
  /* The sweep is added per play rather than living in the markup, so it
     restarts cleanly — and removed first, or ten replays leave ten of
     them stacked and the card gets progressively brighter. */
  el.querySelector(':scope > .swp')?.remove();
  el.insertAdjacentHTML('afterbegin', '<span class="swp"></span>');
  el.classList.add('play');

  /* Every die tumbles inside its own range, which is why each one carries
     its size in the markup: a d6 that flashes an 11 on its way to landing
     is a d6 that is lying about what it is. The maximised dice on a
     critical carry no range at all and never tumble — they were not
     rolled, they were awarded, and showing them spin would be the one
     visual claim on this card that is false. */
  const nums = [...el.querySelectorAll('.die[data-mx] em')];
  const mx = nums.map(n => +n.parentElement.dataset.mx);
  const big = el.querySelector('.pl-num');
  const real = nums.map(n => n.textContent), total = big?.textContent;

  el.classList.add('rolling');
  const t0 = Date.now();
  const step = () => {
    if(Date.now() - t0 >= TUMBLE - STEP / 2){
      nums.forEach((n, i) => n.textContent = real[i]);
      if(big) big.textContent = total;
      el.classList.remove('rolling');
      el.classList.add('land');
      return;
    }
    nums.forEach((n, i) => n.textContent = 1 + Math.floor(Math.random() * mx[i]));
    if(big) big.textContent = '·';
    el.dataset.tk = setTimeout(step, STEP);
  };
  el.dataset.tk = setTimeout(step, STEP);
}
