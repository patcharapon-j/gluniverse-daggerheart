// Hope and Fear. Same builder, two owners: `tone:'hope'` renders the PC's
// six on the sheet, `tone:'fear'` renders the GM's twelve in the Foundry HUD.
// Scars consume slots from the tail, permanently — a scarred slot is not an
// empty one, and the header count says so.
//
// There used to be three candidate forms in here (cells / chips / hero). The
// diamond replaced all three, so the choice is gone and this file is now just
// the chrome around GEMS() — the label, the tally, and the HUD strip.

import { GEMS, intensity, setPool } from './gem.js';
import { ARRIVE, embersOn, emberGain, emberLand, emberSpend, smoulder } from './ember.js';

export const POOL = ({
  label = 'Hope', cur = 0, max = 6, scars = 0,
  tone = 'hope', dark = false, head = true, sz = 26, gap = 9,
}) => {
  const live = max - scars;
  const hd = !head ? '' : `
    <div class="hd">
      <span class="k">${label}</span>
      <span class="n">${cur}<s> / ${live}</s></span>
    </div>`;

  return `<div class="pool ${tone}${dark ? ' dark' : ''}">
    ${hd}${GEMS({cur, max, scars, fear: tone === 'fear', sz, gap})}
  </div>`;
};

/* ── the GM's HUD strip ───────────────────────────────────────────
   Docked in Foundry's chrome, not in a sheet. Public — the rules ask the
   GM to keep the pool visible to the table — so the players' build is the
   same strip minus the steppers. The tally is always present regardless:
   a GM says "I have four Fear" out loud, and the HUD should never make
   them count pips to do it.

   Two elements before the content, and neither draws anything on its own:
   `.hglow` is the rotating rim and `.hface` is the ground that covers all
   but its outermost pixel and a half. There is no label — a strip of violet
   diamonds with a stepper on it does not need to be told it is the Fear
   pool — so the tally is the only type on it, and is set accordingly. See
   the GM HUD block in `pool.css`.

   `--i` is the pool's fullness, and it is on the *strip* rather than only
   on the pips because everything here ramps with it: the field, the weave,
   the word and the rim. `gem.css` registers it and it inherits, so the
   gems below take the same number and each pip's own inline value — which
   `setPool` keeps current — wins where it is set. */
/* The underside carries two groups and the split is whose they are: on the
   left the switch for what THIS screen draws, on the right the two the whole
   table feels. That is also why only one of them survives the players' build
   — a scene ending is the GM's to declare, and what your own screen draws
   never was.

   `chips` is a state and the two on the right are acts, so the switch reads
   its answer back rather than merely being pressable. It says so in
   `aria-pressed`, which is the accessible name for exactly this and doubles as
   the styling hook, so the lit state has one source of truth rather than a
   class somebody has to remember to keep in step with it.

   The mark is a rhombus lit like a pip, and that is a borrowing rather than a
   coincidence: the row of fear gems is twenty pixels above it, so lit-versus-
   socket is a vocabulary the eye has already learned on this exact strip. */
const SWITCH = (chips, ruler) => `
  <div class="vis"><button data-chip aria-pressed="${chips ? 'true' : 'false'}"
    title="Show resource tracks on tokens (this screen only)"><i></i>tracks</button><button
    data-ruler aria-pressed="${ruler ? 'true' : 'false'}"
    title="Show range rings under the selected token (this screen only)"><i></i>range</button></div>`;

/* The spotlight's two presses, on the GM's plinth beside the two refreshes.
   One per side, and pressing the lit one turns the spotlight off. They are a
   state rather than an act, so they carry the view switch's socket-and-pip,
   lit in the side's own colour; see spotlight.js. */
const SPOT = spot => `<button class="spb" data-spot="hope" aria-pressed="${spot === 'hope'}"
    title="Player spotlight"><i></i>player</button><button class="spb" data-spot="fear"
    aria-pressed="${spot === 'fear'}" title="GM spotlight"><i></i>gm</button><span class="sps"></span>`;

export const FEAR_HUD = ({cur = 4, max = 12, gm = true, chips = true, ruler = true, spot = 'off'}) => `
<div class="hud${gm ? ' gm' : ''}" data-cur="${cur}" style="--i:${intensity(cur, max).toFixed(3)}">
  <b class="hglow"></b>
  <b class="hface"></b>
  <b class="hsurge"></b>
  ${POOL({cur, max, tone: 'fear', dark: true, head: false, sz: 24, gap: 7})}
  <span class="tally"><b>${cur}</b><s>/${max}</s></span>
  ${gm ? `<div class="stp"><button data-f="1">+</button><button data-f="-1">−</button></div>` : ''}
  ${SWITCH(chips, ruler)}
  ${gm ? `<div class="cyc">${SPOT(spot)}<button data-refresh="scene" title="Refresh all once-per-scene counters and dice">scene</button><button data-refresh="session" title="Refresh all once-per-session counters and dice">session</button></div>` : ''}
</div>`;

/* ── driving the strip ────────────────────────────────────────────
   The one way the strip is told what the pool now is, shared by the study
   page and `fear-hud.ts` so the two cannot drift.

   Two values ride on the element and they are different claims. `data-cur`
   is the pool — written at once, because the strip is the record of the
   number. `data-shown` is what the strip is currently *drawing*, and on a
   gain it lags by `ARRIVE`: embers leave the board on the press and the pip,
   the count and the surge land when they reach it. A pip that lit before
   the light got there would be the effect arriving ahead of its cause.

   `paint` always draws the latest `data-cur` rather than the value it was
   scheduled for, so three presses inside one flight land as one surge to
   the newest number instead of three surges racing each other. A spend
   paints at once and cancels any gain still in the air, because the GM
   taking Fear back mid-flight has changed the answer.

   One forced flush for the restart, which is `setMarks`' rule: the class
   comes off, style is flushed once, and it goes back on. */
const paint = (strip, max) => {
  const cur = Number(strip.dataset.cur), was = Number(strip.dataset.shown);
  const row = strip.querySelector('.gems');
  if (row) setPool(row, cur, {fear: true, max});
  const n = strip.querySelector('.tally b');
  if (n) n.textContent = String(cur);
  strip.style.setProperty('--i', intensity(cur, max).toFixed(3));
  strip.dataset.shown = String(cur);
  if (cur === max) smoulder(strip, max);
  if (!Number.isFinite(was) || was === cur) return;
  strip.classList.remove('surge', 'ebb');
  void strip.offsetWidth;
  strip.classList.add(cur > was ? 'surge' : 'ebb');
};

export const setFearHud = (strip, cur, max = 12) => {
  if (!strip.dataset.shown) strip.dataset.shown = strip.dataset.cur ?? String(cur);
  const shown = Number(strip.dataset.shown);
  strip.dataset.cur = String(cur);
  if (cur > shown && embersOn(strip)) {
    /* Only the pips this press newly owes — a second press mid-flight sends
       embers to the one socket it added, not to all of them again. */
    const aimed = Number(strip.dataset.aimed ?? shown);
    emberGain(strip, Math.max(shown, aimed), cur);
    strip.dataset.aimed = String(cur);
    /* The first press in a run sets the landing and later ones do not move
       it: a GM tapping + four times must see the pool land, not watch it
       wait until they stop. Embers for the later sockets arrive into a pool
       that has already lit, which reads as it still being fed. */
    if (!strip.__land) strip.__land = setTimeout(() => {
      strip.__land = 0;
      const from = Number(strip.dataset.shown);
      paint(strip, max);
      emberLand(strip, from, Number(strip.dataset.cur));
      delete strip.dataset.aimed;
    }, ARRIVE);
    return;
  }
  clearTimeout(strip.__land);
  strip.__land = 0;
  delete strip.dataset.aimed;
  /* How hard the strip is struck, for `hud-struck` in pool.css: one Fear
     is a flinch, three or more the full blow. */
  if (cur < shown) strip.style.setProperty('--heft', Math.min(1, (shown - cur) / 3).toFixed(2));
  if (cur < shown && embersOn(strip)) emberSpend(strip, cur, shown);
  paint(strip, max);
};
