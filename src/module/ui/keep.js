/* Vendored from design/keep.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/keep.js and re-run `node scripts/port-design-js.mjs`. */
// The dice a card asks you to keep. One builder, one setter, one delegated
// handler — chit.js's contract, for a thing chit.js cannot say.
//
// A chit answers "how many". Eighteen rules in the corpus ask a second
// question the chit has no room for: how many, AND what does each one say.
// Prayer Dice are four d4s sitting on your sheet with four different faces
// up, and a row of four identical counters is not a record of that.
//
// Three modes, and they are the three shapes the corpus actually has rather
// than three settings somebody might want:
//
//   bag    several dice held at once and spent one at a time. Prayer Dice,
//          Slayer Dice, Sigil of Retribution, the Rally Die you were given.
//   climb  exactly one die, placed showing 1, stepped upward, and removed
//          when it would pass its own maximum. Unstoppable, Wild Surge,
//          Zone of Protection. The overflow IS the rule, so the step
//          refuses at the top rather than clamping — see keepClicks.
//   roll   nothing is held. The card names a die whose *size* changes as
//          you level, which is the fact the sheet had nowhere to keep, and
//          pressing it rolls. Patron Die, Combo Die, Marked for Death.
//
// ── an unrolled die is a chit with a silhouette ──────────────────────
// Slayer Dice are placed blank and rolled when spent; Prayer Dice are
// rolled when placed. So `bag` needs both, and the distinction is a face or
// no face. A die with no face draws the family rhombus instead of a
// numeral — which is exactly what a chit draws, so a pool you have not
// rolled yet reads as counters and becomes dice at the moment it means
// something. Nothing had to be invented for that: the pip was already the
// chit's answer to "this is a counter and not a blank disc".
//
// ── why the row is a chits row ───────────────────────────────────────
// `<div class="chits keep">` and not a row of its own. Sockets, the way to
// put one down, the gap, the tilt, the six host sizings and both grounds
// are chit.css's and are already right; a die is a counter that says
// something, so it belongs in the same tray. What keep.css adds is only
// what a die needs beyond a chit. It carries `data-keep` rather than
// `data-chits` so chitClicks declines it — two delegated handlers on one
// root, each answering for its own rows.

import { DIE, shapeOf as shapeOfDie } from './die.js';

/** The five a die can be. There is no seventh polyhedron to want. */
export const FACES = [4, 6, 8, 10, 12];

/* `die.js` keys its table by notation because that is what a roll carries;
   a kept die is stored as a face *count*, because the schema stores numbers
   and `d6` is a string a migration would have to keep parsing. One table
   either way — this only changes the key. */
export const shapeOf = (f) => shapeOfDie(`d${Number(f)}`);

/* A die is wider than a chit at the same --sz — a d10's kite and a d4's
   triangle both lose their corners to the gap — so a row of them enumerates
   fewer before it states the number. Five rather than eight, which is the
   largest pool in the corpus that is not open-ended (Sigil at level 5+). */
export const KEEP_CAP = 5;

/**
 * One die in the tray.
 *
 * `--sz` is deliberately not passed. DIE writes an inline `--sz` only when
 * it is given one, and every host has already told `.chits` how big its
 * counters are; inheriting is what keeps a die and a chit the same size on
 * the same plate without either of them knowing about the other.
 *
 * **The die does not wear `kd`, and it did.** `kd` is the button — the
 * object you press — and the die is the drawing inside it. Handing the
 * class to both made `.keep .kd` match the die as well, so plate.css's
 * `display:grid` lost to this file's `display:block` and every numeral came
 * off the centre of its silhouette and sat on the text baseline. That is
 * `.die.win` and `.dfn .pl` and `.r.pl` again, and this one is worse in one
 * respect: those were two of our sheets colliding, and this was a component
 * colliding with itself, which no amount of scoping could ever have caught.
 * The colours ride on `.keep .die`, which says what it means — every die in
 * the tray, however it got there.
 */
const KD = (v, faces, i, name, act) =>
  `<button class="kd" data-${act}="${i + 1}" title="${
    v ? `Spend this ${name} (${v})` : `Roll this ${name}`}">${
    DIE(v || '', `${shapeOf(faces)}${v ? '' : ' blank'}`, 0, faces)}</button>`;

/* The step, and the reason it is not the chit's plus. Placing a chit adds
   an object; stepping a climbing die changes the one that is there, and the
   two must not be the same control or the gesture lies about what happened.
   A chevron rather than a cross, pointing the way the number goes. */
const STEP = (name) =>
  `<button class="up" data-step title="Advance the ${name}"></button>`;

const PUT = (name) =>
  `<button class="put" data-place title="Place a ${name.replace(/s$/, '')}"></button>`;

const ROLL = (name) =>
  `<button class="tumble" data-roll title="Roll your ${name}"></button>`;

/**
 * mode   bag | climb | roll — see the head of this file
 * faces  the die's size right now. A number, because the thing that grows
 *        it is a subclass card rather than a level, and this system does
 *        not read one document's rules text to decide another's schema.
 *        Edited on the item sheet, which is where a definition is edited.
 * dice   the faces currently held. 0 is a die with no face — placed and
 *        not yet rolled — and the array's *length* is the count, so an
 *        unrolled bag is `[0,0,0]` rather than a number and a flag.
 * max    the capacity when it is known. 0 or null is an open pool, which
 *        draws no sockets, exactly as a chit pool does.
 * roll   whether the row offers to roll what it holds. False on a card
 *        whose dice are already rolled — Prayer Dice are rolled once at
 *        the start of a session and spent at their standing values, and a
 *        button that rerolls them would be offering to change the answer.
 * add    false renders a readout with no way in. A posted card is a record.
 */
export const KEEP = ({
  mode = 'bag', faces = 6, dice = [], max = 0, name = 'dice',
  cap = KEEP_CAP, add = true, roll = true, dom = false, key = '',
} = {}) => {
  const held = Array.isArray(dice) ? dice.map((n) => Math.max(0, Number(n) || 0)) : [];
  const capped = mode === 'bag' && max > 0;
  const cls = ['chits', 'keep'];
  if (dom) cls.push('dom');
  if (capped) cls.push('capped');
  if (capped && held.length >= max) cls.push('full');

  const open =
    `<div class="${cls.join(' ')}" data-keep data-mode="${mode}" data-faces="${faces}"` +
    ` data-v="${held.length}" data-max="${max || 0}" data-cap="${cap}"` +
    ` data-dice="${held.join(',')}"${key ? ` data-key="${key}"` : ''}>`;

  /* ── roll ───────────────────────────────────────────────────────
     Nothing is held, so there is nothing to place and nothing to spend.
     What the row states is the die you own and what it last said, and the
     size is stated in words beside it because that is the fact this mode
     exists to record — a d8 silhouette at 14px is a shape you recognise
     and not a number you can read off. */
  if (mode === 'roll') {
    const v = held[0] || 0;
    return open +
      `<button class="kd" data-roll title="Roll your ${name}">${
        DIE(v || '', `${shapeOf(faces)}${v ? '' : ' blank'}`, 0, faces)}</button>` +
      `<span class="fx">d${faces}</span>` +
      '</div>';
  }

  /* ── climb ──────────────────────────────────────────────────────
     One die or none. With none the row is a single socket and the way to
     put it down; with one it is the die and the chevron that advances it.
     No sockets past the first, because the capacity of this pool is one
     die and drawing five empty places for a d6 would be the row claiming
     the number counts objects rather than pips. */
  if (mode === 'climb') {
    const v = held[0] || 0;
    if (!v) return open + '<span class="sk"></span>' + (add ? PUT(name) : '') + '</div>';
    return open +
      `<button class="kd" data-take="1" title="Remove the ${name}">${
        DIE(v, `${shapeOf(faces)} climb`, 0, faces)}</button>` +
      (add ? STEP(name) : '') +
      '</div>';
  }

  /* ── bag ────────────────────────────────────────────────────────
     Past the cap the row collapses to one die and a numeral, which is the
     chit's own concession and made for the same reason. It states the
     *count* rather than a face: five dice showing five different numbers
     have no single value to print, and the one thing that is still true
     of the pile is how big it is. */
  const drawn = capped ? max : held.length;
  if (drawn > cap) {
    return open +
      KD(held[0] || 0, faces, 0, name, 'take') +
      `<span class="n">${held.length}${capped ? `<s>/${max}</s>` : ''}</span>` +
      (add && roll && held.some((v) => !v) ? ROLL(name) : '') +
      (add && (!capped || held.length < max) ? PUT(name) : '') +
      '</div>';
  }

  const kds = held.map((v, i) => KD(v, faces, i, name, 'take')).join('');
  const socks = capped
    ? '<span class="sk"></span>'.repeat(Math.max(0, max - held.length))
    : '';

  return open + kds + socks +
    (add && roll && held.some((v) => !v) ? ROLL(name) : '') +
    (add ? PUT(name) : '') +
    '</div>';
};

/* ══ DRIVING ONE ════════════════════════════════════════════════════
   The row is rendered once and every later change goes through here, which
   is the contract Marks, Gems and Chits already keep. A rebuild at the new
   value has already arrived, so there is nothing left to animate — and on
   this component that costs more than it does on the others, because the
   thing worth watching is a die *landing on a face*.

   Unlike setChits there is no arithmetic to diff: the state is a list, so
   what moved is found by comparing the two lists position by position.
   Three kinds of difference and one redraw:

     appeared   a die was placed          → drop it in, chit.js's fall
     vanished   a die was spent           → lift it away
     changed    a face moved              → tumble to the new one
   ══════════════════════════════════════════════════════════════════ */

const emOf = (kd) => kd?.querySelector('em');

/**
 * Land a die on a face, with a tumble in front of it.
 *
 * The numeral cycles through faces the die could have shown and never
 * through the answer until the last frame, which is the rest dialog's reel
 * rule: a value that appears and then moves again reads as having stopped
 * and restarted. `steps` is small because this is a 14–27px object in the
 * corner of a card, not the subject of the screen — six frames is a tumble
 * and twenty is a slot machine.
 */
export function landDie(kd, value, faces, done) {
  const em = emOf(kd);
  if (!em) return done?.();
  const die = kd.querySelector('.die');
  die?.classList.remove('blank');
  kd.classList.add('roll');
  let i = 0;
  const steps = 6;
  const tick = () => {
    if (i++ >= steps) {
      em.textContent = String(value);
      kd.classList.remove('roll');
      kd.classList.add('land');
      kd.addEventListener('animationend', () => kd.classList.remove('land'), { once: true });
      return done?.();
    }
    /* Never the answer before the end. With a d4 there are only three
       other faces, so this loops through them rather than pretending to be
       random — a tumble is a picture of motion and not a simulation. */
    const others = [];
    for (let f = 1; f <= faces; f++) if (f !== value) others.push(f);
    em.textContent = String(others[i % others.length] ?? value);
    setTimeout(tick, 48 + i * 12);
  };
  tick();
}

/**
 * Drive an already-rendered row to a new list of faces.
 *
 * `faces` is passed rather than read back off the row because the die's
 * size can change between renders — a Rally Die becomes a d8 at level 5 —
 * and a setter that trusted the markup would tumble a d8 through a d6's
 * faces on the render that grew it.
 */
export function setKeep(row, dice, faces = Number(row.dataset.faces) || 6) {
  const want = (dice ?? []).map((n) => Math.max(0, Number(n) || 0));
  const was = (row.dataset.dice || '').split(',').filter(Boolean).map(Number);
  const mode = row.dataset.mode || 'bag';
  const max = Number(row.dataset.max) || 0;
  const cap = Number(row.dataset.cap) || KEEP_CAP;
  if (want.join(',') === was.join(',') && faces === Number(row.dataset.faces)) return;

  const grewShape = faces !== Number(row.dataset.faces);
  row.dataset.dice = want.join(',');
  row.dataset.v = String(want.length);
  row.dataset.faces = String(faces);
  row.classList.toggle('full', mode === 'bag' && max > 0 && want.length >= max);

  /* Three things this cannot animate through, and all three are the row
     changing *shape* rather than value: the die changing size, crossing
     the cap in either direction, and climb going from nothing to a die or
     back. Redraw and stop, which is setChits's answer at its own boundary. */
  const drawn = mode === 'bag' && max > 0 ? max : Math.max(want.length, was.length);
  if (grewShape || drawn > cap || (mode === 'climb' && !want.length !== !was.length)) {
    row.innerHTML = KEEP({
      mode, faces, dice: want, max, cap,
      add: !!row.querySelector('[data-place],[data-step],[data-roll]'),
      key: row.dataset.key || '',
    }).replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '');
    return;
  }

  const kds = [...row.querySelectorAll('.kd')];
  const socks = [...row.querySelectorAll('.sk')];

  // Faces that moved on dice that stayed. Done first, so a roll that also
  // spends reads as the survivors landing rather than as a redraw.
  for (let i = 0; i < Math.min(want.length, was.length); i++) {
    if (want[i] !== was[i] && kds[i]) landDie(kds[i], want[i], faces);
  }

  // Placed.
  for (let i = was.length; i < want.length; i++) {
    const el = document.createElement('button');
    el.className = 'kd place';
    el.dataset.take = String(i + 1);
    el.innerHTML = DIE(want[i] || '', `${shapeOf(faces)}${want[i] ? '' : ' blank'}`, 0, faces);
    el.addEventListener('animationend', () => el.classList.remove('place'), { once: true });
    const sk = socks.shift();
    if (sk) sk.replaceWith(el);
    else row.insertBefore(el, row.querySelector('.tumble,.put,.up'));
  }

  // Spent. The die lifts and its socket arrives when it has gone, so the
  // gap does not open before the object has left it.
  for (let i = was.length - 1; i >= want.length; i--) {
    const el = kds[i];
    if (!el) continue;
    el.classList.add('take');
    el.addEventListener('animationend', () => {
      if (mode === 'bag' && max > 0) {
        const sk = document.createElement('span');
        sk.className = 'sk after';
        sk.addEventListener('animationend', () => sk.classList.remove('after'), { once: true });
        el.replaceWith(sk);
      } else {
        el.remove();
      }
    }, { once: true });
  }
}

/** The refusal, and it is the row that flinches. chit.js's `refuseChits`. */
export function refuseKeep(row) {
  row.classList.remove('deny');
  void row.offsetWidth;
  row.classList.add('deny');
  row.addEventListener('animationend', () => row.classList.remove('deny'), { once: true });
}

/**
 * One delegated handler for every gesture this component has.
 *
 * `onChange(row, next, how)` is handed the whole new list rather than a
 * delta, because three of the four gestures are not deltas: rolling changes
 * every face and none of the count, stepping changes one face, and only
 * placing and spending move the length. A caller that had to reconstruct
 * the list from a signed number would be doing the work twice.
 *
 * **The press stops at the row**, chit.js's rule and for its reason: every
 * host this sits on is itself pressable off a delegated handler, so left to
 * bubble, rolling your Prayer Dice would also post the Seraph's class card
 * to chat.
 */
export function keepClicks(root, onChange) {
  root.addEventListener('click', (e) => {
    const row = e.target.closest?.('[data-keep]');
    if (!row) return;
    e.stopPropagation();
    const mode = row.dataset.mode || 'bag';
    const faces = Number(row.dataset.faces) || 6;
    const max = Number(row.dataset.max) || 0;
    const held = (row.dataset.dice || '').split(',').filter(Boolean).map(Number);

    if (e.target.closest('[data-place]')) {
      if (mode === 'bag' && max > 0 && held.length >= max) return refuseKeep(row);
      // A climbing die is placed showing 1 — the card says so, every time.
      return onChange(row, [...held, mode === 'climb' ? 1 : 0], 'place');
    }

    /* The step refuses at the top rather than wrapping or clamping, and
       that refusal is the card's whole bargain: "when the die's value
       would exceed its maximum, remove the die". What the sheet must not
       do is decide *for* you — Wild Surge charges a Stress on the way out
       and Unstoppable does not, so the row says no and the rule is read by
       the person who wrote it. Spending the die is the button beside it. */
    if (e.target.closest('[data-step]')) {
      if (!held.length) return refuseKeep(row);
      if (held[0] >= faces) return refuseKeep(row);
      return onChange(row, [held[0] + 1, ...held.slice(1)], 'step');
    }

    /* The roll gestures hand the list back **unchanged**. What comes out of
       a die is not this component's to invent — the caller owns the RNG,
       the chat message and whatever the table has bolted onto rolling —
       so `how` says what happened and the caller says what it produced.
       Every other gesture can state its own result, and does. */
    if (e.target.closest('[data-roll]')) {
      if (mode !== 'roll' && !held.length) return refuseKeep(row);
      return onChange(row, held, 'roll');
    }

    const kd = e.target.closest('.kd');
    if (!kd) return;
    const i = Number(kd.dataset.take) - 1;
    if (!(i >= 0)) return;
    /* Pressing an unrolled die rolls that one. It is the only reading a
       blank face has — there is no value to spend — and it means the
       common Slayer gesture (roll one, add it) is one press on the thing
       you are adding rather than two on the row. */
    if (!held[i]) return onChange(row, held, 'roll1', i);
    return onChange(row, held.filter((_, k) => k !== i), 'take', i);
  });
}
