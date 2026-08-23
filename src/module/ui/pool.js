/* Vendored from design/pool.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/pool.js and re-run `node scripts/port-design-js.mjs`. */
// Hope and Fear. Same builder, two owners: `tone:'hope'` renders the PC's
// six on the sheet, `tone:'fear'` renders the GM's twelve in the Foundry HUD.
// Scars consume slots from the tail, permanently — a scarred slot is not an
// empty one, and the header count says so.
//
// There used to be three candidate forms in here (cells / chips / hero). The
// diamond replaced all three, so the choice is gone and this file is now just
// the chrome around GEMS() — the label, the tally, and the HUD strip.

import { GEMS, intensity } from './gem.js';

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

export const FEAR_HUD = ({cur = 4, max = 12, gm = true, chips = true, ruler = true}) => `
<div class="hud${gm ? ' gm' : ''}" style="--i:${intensity(cur, max).toFixed(3)}">
  <b class="hglow"></b>
  <b class="hface"></b>
  ${POOL({cur, max, tone: 'fear', dark: true, head: false, sz: 24, gap: 7})}
  <span class="tally">${cur}<s>/${max}</s></span>
  ${gm ? `<div class="stp"><button data-f="1">+</button><button data-f="-1">−</button></div>` : ''}
  ${SWITCH(chips, ruler)}
  ${gm ? `<div class="cyc"><button data-refresh="scene" title="Refresh all once-per-scene counters and dice">scene</button><button data-refresh="session" title="Refresh all once-per-session counters and dice">session</button></div>` : ''}
</div>`;
