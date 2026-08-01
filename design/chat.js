/* ══════════════════════════════════════════════════════════════════
   DH CHAT — the roll result

   A Daggerheart roll has *two* independent axes and the sheet only ever
   knows one of them for certain.

     Hope / Fear   decided by the dice against each other. Always knowable,
                   needs nothing from the GM, and it is the axis the game is
                   named after. It is also the one that changes table state:
                   a Hope is gained, or the GM gains a Fear.

     Success       decided by the total against a Difficulty — which the
     / failure     rules explicitly allow the GM to keep to themselves, and
                   which does not exist at all until a target is picked.

   So the card can always say "15, with Fear" and can only sometimes say
   "and that missed". That asymmetry is the whole design: this card is
   authoritative about arithmetic and tentative about fiction. It states
   what the dice did, it states what is owed, and it says "vs ?" rather
   than guessing at a verdict it was not given.

   Three roll kinds, three shapes:

     action     duality, both axes, claims.
     reaction   duality, success axis only. Reaction rolls generate no Hope
                and no Fear (p.99), so the card that reports one must not
                offer a claim — and must not be gold or violet either.
     dmg        proficiency dice. No axes at all; a total and a type.
   ══════════════════════════════════════════════════════════════════ */

const d = n => 1 + Math.floor(Math.random() * n);
const sign = n => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);

/* ── rolling ──────────────────────────────────────────────────────*/

export function action({who, label, mods = [], dc = null, adv = null, kind = 'action'}){
  const h = d(12), f = d(12);
  const av = adv ? {v: d(6), neg: adv === -1} : null;
  const m = mods.reduce((a, x) => a + x.v, 0);
  const total = h + f + m + (av ? (av.neg ? -av.v : av.v) : 0);
  /* A critical is equal faces and it is a success *regardless of the
     total* — the one place the two axes are not independent. It is also
     the only outcome that is not a comparison, so it is its own token
     rather than something every caller re-derives from h === f. */
  const out = kind === 'reaction' ? 'none'
            : h === f ? 'crit' : h > f ? 'hope' : 'fear';
  return {kind, who, label, h, f, adv: av, mods, dc, total, out,
          crit: h === f,
          hit: dc == null ? null : (h === f || total >= dc)};
}

/* Critical damage is not a multiplier. You start from the *maximum* the
   damage dice could roll, then roll them as normal and add — so a crit
   with 2d8+3 is 16 + 2d8 + 3. Spelling that out is half the reason this
   card exists; it is the rule most often got wrong at the table. */
export function damage({who, label, prof, die, bonus = 0, crit = false, dtype = 'phy'}){
  const n = Math.max(1, prof);
  const faces = Array.from({length: n}, () => d(die));
  const mx = crit ? n * die : 0;
  return {kind:'dmg', who, label, faces, die, prof: n, bonus, crit, dtype, mx,
          total: mx + faces.reduce((a, b) => a + b, 0) + bonus,
          out:'dmg'};
}

/* ── the words ────────────────────────────────────────────────────
   "Success with Hope", never "Success (Hope)". The rules name these five
   outcomes in prose and the table says them out loud; a card that
   abbreviates them is a card you have to translate. */
const VERDICT = (r, know) => {
  if(r.kind === 'dmg')      return `${r.crit ? 'critical ' : ''}${r.dtype === 'mag' ? 'magic' : 'physical'} damage`;
  if(r.out === 'crit')      return 'critical success';
  /* A reaction roll can still critically succeed — it just pays nothing for
     it. The rules give the crit its own effect there (you ignore what would
     have hit you anyway), so the word has to survive even though the colour
     and the claims do not. */
  if(r.kind === 'reaction') return r.crit ? 'critical success'
                                 : know ? (r.hit ? 'success' : 'failure') : 'reaction roll';
  const side = r.out === 'hope' ? 'with Hope' : 'with Fear';
  return know ? `${r.hit ? 'success' : 'failure'} ${side}` : side;
};

/* What the roll owes, and to whom. Derived from the Hope/Fear axis alone,
   which is why it survives an unknown Difficulty — the card can be unsure
   whether you hit and still be certain you gained a Hope. */
export const claims = r => {
  if(r.kind !== 'action') return [];
  if(r.out === 'crit') return [{k:'hope', t:'+1 Hope', mine:true},
                               {k:'stress', t:'Clear 1 Stress', mine:true}];
  if(r.out === 'hope') return [{k:'hope', t:'+1 Hope', mine:true}];
  return [{k:'fear', t:'GM gains a Fear', mine:false}];
};

/* ── the card ─────────────────────────────────────────────────────
   `mode` is the authority question, and it is a parameter here only so
   the study can put the three answers side by side on the same roll:

     a  announce         dice, total, side. No verdict, no claims.
     b  announce + offer  verdict when it is known, claims as buttons.
     c  announce + apply   verdict, claims already taken.
*/
const FACE = (v, cls) => `<i class="dc ${cls}"><b>${v}</b></i>`;

const DICE = r => r.kind === 'dmg'
  ? (r.crit ? Array.from({length: r.prof}, () => FACE(r.die, 'p mx')).join('') : '')
    + r.faces.map(v => FACE(v, 'p')).join('')
  : FACE(r.h, 'h' + (r.out === 'fear' ? '' : ' win')) +
    FACE(r.f, 'f' + (r.out === 'hope' ? '' : ' win')) +
    (r.adv ? FACE(sign(r.adv.neg ? -r.adv.v : r.adv.v), 'a' + (r.adv.neg ? ' neg' : '')) : '');

/* Every term, in the order it was added. The operators are what make this
   an equation rather than a list, and an equation is what stops the "wait,
   what was your Agility?" that a bare total invites.

   The operator carries the sign and the term never does — otherwise a
   disadvantage die renders as `+ −3`, which is two symbols for one idea
   and reads as a typo in the one line whose whole job is being checkable. */
const MODS = r => {
  const t = r.kind === 'dmg'
    ? [{k:`${r.crit ? 'max ' : ''}${r.prof}d${r.die}`,
        v: r.mx + r.faces.reduce((a, b) => a + b, 0)},
       ...(r.bonus ? [{k:'weapon', v:r.bonus}] : [])]
    : [{k:'dice', v:r.h + r.f},
       ...(r.adv ? [{k: r.adv.neg ? 'disadvantage' : 'advantage',
                     v: r.adv.neg ? -r.adv.v : r.adv.v}] : []),
       ...r.mods];
  if(t.length < 2) return '';
  return `<div class="dhm-mod">${t.map((x, i) =>
    `${i ? `<u>${x.v < 0 ? '−' : '+'}</u>` : ''}<i class="${x.spent ? 'sp' : ''}"><b>${
      Math.abs(x.v)}</b> ${x.k}</i>`).join('')}</div>`;
};

const CLAIM = (c, mode) => {
  if(mode === 'c') return `<span class="dhm-b done"><i></i>${c.t}<em>✓</em></span>`;
  /* Shown from the player's chair, unpressable: "the GM gained a Fear" is
     information the player needs and a button the player does not own. */
  if(!c.mine)      return `<span class="dhm-b theirs"><i></i>${c.t}</span>`;
  return `<button class="dhm-b${c.k === 'stress' ? ' st' : ''}" data-claim="${c.k}"><i></i>${c.t}</button>`;
};

export function MSG(r, mode = 'b', {next = null} = {}){
  const know = mode !== 'a' && r.dc != null;
  const acts = mode === 'a' ? [] : claims(r);
  const foot = [
    ...acts.map(c => CLAIM(c, mode)),
    next ? (mode === 'c'
      ? `<span class="dhm-b go done"><i></i>${next}<em>rolled</em></span>`
      : `<button class="dhm-b go" data-next><i></i>${next}</button>`) : '',
  ].filter(Boolean).join('');

  return `
  <div class="dhm ${r.out}">
    <div class="dhm-k">
      <span class="dhm-nm">${r.who}</span>
      <span class="dhm-lb">${r.label}</span>
    </div>
    <div class="dhm-bd">
      <span class="dhm-dice">${DICE(r)}</span>
      <span class="dhm-tot">${r.kind === 'dmg' ? '<s>dmg</s>' : ''}<b>${r.total}</b></span>
    </div>
    ${MODS(r)}
    <div class="dhm-v"><b>${VERDICT(r, know)}</b>${
      r.kind !== 'dmg' && mode !== 'a'
        ? `<s class="${r.dc == null ? 'q' : ''}">vs ${r.dc ?? '?'}</s>` : ''}</div>
    ${foot ? `<div class="dhm-act">${foot}</div>` : ''}
  </div>`;
}

/* ── arrival ──────────────────────────────────────────────────────
   Stepped at 58ms rather than per frame: at 60fps the numerals blur into
   a grey average and the dice stop reading as dice.

   Timers, not requestAnimationFrame — rAF does not fire in a window that
   is not painting, and a chat log is very often exactly that. A timer is
   throttled in the background rather than stopped, so the tumble degrades
   to a couple of steps and the result still lands.

   The result was never at stake: it is decided in action()/damage() and
   written into the markup before any of this runs. The tumble only
   overwrites the *display*, so with no frames at all the card is still
   correct — which is the right way round for something another player is
   reading over your shoulder. */
const TUMBLE = 420, STEP = 58;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function land(el, r){
  el.classList.add('in');
  if(REDUCED) return;
  const dice = [...el.querySelectorAll('.dc:not(.mx) b')];
  const tot = el.querySelector('.dhm-tot b');
  if(!dice.length) return;
  const real = dice.map(b => b.textContent);
  const sides = r.kind === 'dmg' ? r.faces.map(() => r.die)
    : [12, 12, ...(r.adv ? [6] : [])];

  el.classList.add('rolling');
  const t0 = Date.now();
  const step = () => {
    if(Date.now() - t0 >= TUMBLE - STEP / 2){
      dice.forEach((b, i) => b.textContent = real[i]);
      tot.textContent = r.total;
      el.classList.remove('rolling');
      el.classList.add('land');
      return;
    }
    dice.forEach((b, i) => {
      const v = 1 + Math.floor(Math.random() * (sides[i] ?? 6));
      b.textContent = (i === 2 && r.adv) ? sign(r.adv.neg ? -v : v) : v;
    });
    tot.textContent = '·';
    el.dataset.tk = setTimeout(step, STEP);
  };
  el.dataset.tk = setTimeout(step, STEP);
}
