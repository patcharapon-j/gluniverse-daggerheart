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
export const FEAR_HUD = ({cur = 4, max = 12, gm = true}) => `
<div class="hud" style="--i:${intensity(cur, max).toFixed(3)}">
  <b class="hglow"></b>
  <b class="hface"></b>
  ${POOL({cur, max, tone: 'fear', dark: true, head: false, sz: 24, gap: 7})}
  <span class="tally">${cur}<s>/${max}</s></span>
  ${gm ? `<div class="stp"><button data-f="1">+</button><button data-f="-1">−</button></div>` : ''}
</div>`;
