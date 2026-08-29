// The attack bar — the one thing on this sheet that is an action rather
// than a record.
//
// Everything else here answers "what is true about my character". This
// answers "what do I roll", and it is the question asked most often in a
// session, so it sits at the top of the first tab and it does the two sums
// players actually get wrong:
//
//   attack   2d12 + trait, plus whatever the weapon's feature adds.
//   damage   PROFICIENCY copies of the damage die, plus the flat bonus.
//            Not one die. This is the single most-missed rule in the game
//            and the sheet knows the character's Proficiency, so there is
//            no excuse for making anyone multiply it themselves.
//
// The two dice are the system's own diamonds, because they are the system's
// own diamonds: the Hope Die and the Fear Die are Hope and Fear. Damage
// dice are chamfered squares instead — the shape says which kind of roll
// you are looking at before you have read a number.

const d = n => 1 + Math.floor(Math.random() * n);

/* Duality. Equal faces is a critical success, and it is the only outcome
   that is not a comparison — worth returning as its own token rather than
   making every caller re-derive it from h === f. */
export const duality = (mod = 0) => {
  const h = d(12), f = d(12);
  return {kind:'atk', h, f, mod, sides:[12, 12], faces:[h, f],
          total: h + f + mod,
          out: h === f ? 'crit' : h > f ? 'hope' : 'fear'};
};

export const damage = (prof, die, bonus = 0) => {
  const faces = Array.from({length: Math.max(1, prof)}, () => d(die));
  return {kind:'dmg', faces, sides:faces.map(() => die), mod:bonus,
          total: faces.reduce((a, b) => a + b, 0) + bonus};
};

export const dmgText = (w, prof) =>
  `${Math.max(1, prof)}d${w.die}${w.bonus ? `+${w.bonus}` : ''}`;
const sign = n => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);

/* ── the bar ──────────────────────────────────────────────────────
   A slot per hand. An empty slot is still drawn, and a *blocked* slot is
   drawn with the reason — "Two-Handed primary, no free hand" is a rule
   people forget mid-session, and the sheet is where they would find out.
   Hiding the slot would have hidden the rule with it. */
const ROW = (s) => {
  if(!s.w) return `
  <div class="wr off">
    <span class="sl">${s.slot}</span>
    <div class="id"><b>${s.blocked ? 'Unavailable' : 'Empty'}</b>
      <span>${s.note ?? 'nothing equipped'}</span></div>
  </div>`;

  const w = s.w;
  return `
  <div class="wr" data-slot="${s.key}">
    <span class="sl">${s.slot}</span>
    <div class="id"><b>${w.name}</b>
      <span>${w.trait} · ${w.range} · ${w.burden}${
        w.feat ? ` · <em>${w.feat}</em>` : ''}</span></div>
    <button class="go" data-atk="${s.key}" title="Attack roll — 2d12 + ${w.trait}">
      <span class="dd"><i class="h"></i><i class="f"></i></span>
      <em>${sign(s.mod)}</em><s>attack</s>
    </button>
    <button class="go dm" data-dmg="${s.key}" title="${s.prof} × d${w.die}, your Proficiency">
      <em>${dmgText(w, s.prof)}</em><s>damage</s>
    </button>
  </div>`;
};

/* ── the pair on its own ──────────────────────────────────────────
   The two rows above are *about* a weapon and bring a number with them. A
   great deal of what a table actually rolls is neither — "roll me a duality
   and tell me how the night goes", a card being improvised, a house rule
   that wants 2d12 and a modifier somebody agreed on out loud. Pressing a
   trait and subtracting its modifier in your head puts a number on the card
   that nobody rolled, so the pair gets a row of its own.

   Under the weapons rather than above them, because it is the least often
   pressed of the three and the bar is ordered by how often each is reached
   for — the rail's own rule. It contributes nothing: the popover opens at
   zero and whatever is typed into it is the whole modifier. */
const FREE = () => `
  <div class="wr free">
    <span class="sl">Duality</span>
    <div class="id"><b>Duality Roll</b>
      <span>no trait · <em>your modifier</em></span></div>
    <button class="go" data-free="1" title="2d12 Hope and Fear, with whatever you compose — no trait">
      <span class="dd"><i class="h"></i><i class="f"></i></span>
      <em>2d12</em><s>roll</s>
    </button>
  </div>`;

export const ATTACK = (slots) => `
<div class="atk">
  ${slots.map(ROW).join('')}
  ${FREE()}
  <div class="rd"></div>
</div>`;

/* ── the readout ──────────────────────────────────────────────────
   One row, replaced on every roll. The die that decided the outcome is
   marked rather than described — you look at the pair, and one of them is
   lit. The word underneath is for confirmation, not for reading first. */
const OUT = {hope:'with Hope', fear:'with Fear', crit:'critical success'};

const FACE = (v, cls) => `<i class="dc ${cls}"><b>${v}</b></i>`;

const READOUT = (r, src) => {
  /* On a critical both dice are marked, because on a critical both dice
     won — that is what equal faces means, and dimming one of them would
     have said the opposite. */
  const dice = r.kind === 'dmg'
    ? r.faces.map(v => FACE(v, 'p')).join('')
    : FACE(r.h, 'h' + (r.out === 'fear' ? '' : ' win')) +
      FACE(r.f, 'f' + (r.out === 'hope' ? '' : ' win'));
  return `
  <span class="dice">${dice}</span>
  <span class="sum">${r.mod ? `<s>${sign(r.mod)}</s>` : ''}<b>${r.total}</b></span>
  <span class="tag">${r.kind === 'dmg' ? 'damage' : OUT[r.out]}</span>
  <span class="src">${src}</span>`;
};

/* The tumble. Stepped at 58ms rather than per frame: at 60fps the numerals
   blur into a grey average and the dice stop reading as dice.

   Timers, not requestAnimationFrame, and for the same reason settle.js
   exists — rAF does not fire in a window that is not painting, so the first
   version left `rolling` latched forever the moment the sheet was occluded,
   which meant the dice stayed grey and the total stayed a placeholder on a
   roll that had in fact already been decided. A timer is throttled in the
   background rather than stopped: the tumble degrades to a couple of steps
   and the result still lands, which is the right way round.

   The result itself was never at stake. It is decided before any of this
   runs and written into the markup first; the tumble only ever overwrites
   the *display*, so even with no frames at all the readout is correct.

   `tk` is on the element rather than in a module variable so two readouts
   could coexist — and, more to the point, so a second roll cancels the
   first. Without it an in-flight tumble kept stepping after its own readout
   had been replaced and dropped its `land()` onto the new one. */
const TUMBLE = 430, STEP = 58;

export function showRoll(rd, r, src){
  clearTimeout(+rd.dataset.tk || 0);
  rd.className = 'rd on ' + (r.kind === 'dmg' ? 'dmg' : r.out);
  rd.innerHTML = READOUT(r, src);

  const faces = [...rd.querySelectorAll('.dc b')];
  const sum = rd.querySelector('.sum b');
  if(!faces.length) return;

  rd.classList.add('rolling');
  const t0 = Date.now();
  const step = () => {
    if(Date.now() - t0 >= TUMBLE - STEP / 2){
      faces.forEach((el, i) => el.textContent = r.faces[i]);
      sum.textContent = r.total;
      rd.classList.remove('rolling');
      rd.classList.add('land');
      return;
    }
    faces.forEach((el, i) => el.textContent = 1 + Math.floor(Math.random() * r.sides[i]));
    sum.textContent = '·';
    rd.dataset.tk = setTimeout(step, STEP);
  };
  rd.dataset.tk = setTimeout(step, STEP);
}
