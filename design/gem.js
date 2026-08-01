// The Hope and Fear diamond. Solid fill, shading, glow — no idle motion.
// Everything animated happens on a value change.

import { settled } from './settle.js';

/* .lamp exists only to hold the bloom. The drop-shadow has to be declared
   on a parent of the clipped face — painting order is filter then
   clip-path, so declared on the face itself the shadow is generated and
   then clipped away by the very shape it describes. */
export const GEM = ({on = true, scar = false, fear = false, i = 1, sz}) => `
<i class="gem${fear ? ' fear' : ''}${scar ? ' scar' : on ? ' on' : ''}"
   style="${sz ? `--sz:${sz}px;` : ''}${fear ? `--i:${i.toFixed(3)}` : ''}">
  <b class="lamp"><b class="pit"></b><b class="edge"><i></i></b><b class="rim"></b></b>
  <b class="fx"></b>
</i>`;

/* Fear's glow is a property of the *pool*, not of a pip. Ramped rather than
   linear so the first few gains are visible at all — a linear map spends its
   whole bottom third looking like nothing is happening. */
export const intensity = (cur, max) => Math.pow(cur / max, .72);

/* `ground` names what the row is sitting on. A bloom needs somewhere dark
   to fall, so on paper it tightens and the rim carries the light instead —
   see the .gems.paper rules. Dark is the default because the HUD is dark. */
export const GEMS = ({cur = 4, max = 6, scars = 0, fear = false, sz, gap, ground}) => {
  const live = max - scars;
  const i = fear ? intensity(cur, max) : 1;
  const row = Array.from({length: max}, (_, n) =>
    GEM({fear, sz, i, on: n < cur, scar: n >= live})).join('');
  return `<div class="gems${ground === 'paper' ? ' paper' : ''}"${
    gap ? ` style="--gap:${gap}px"` : ''}>${row}</div>`;
};

/* ── transitions ──────────────────────────────────────────────────
   Diff the row against the new count and animate only what changed. The
   class comes off on animationend rather than on a timer, so a fast
   double-click restarts cleanly instead of stacking. */
/* Resolve when every animation this state started has finished, wherever it
   lives — some of these run on the gem, some on .fx, and the afterglow runs
   on .pit. Transitions are excluded because Fear's --i ramp is one, and it is
   pool-wide rather than part of this pip's state change.

   Shared with mark.js, and not the one-liner it was: see settle.js. The old
   version left every spent gem holding `on spend` forever, which meant a
   spent Hope stayed lit. */

export function setPool(row, cur, {fear = false, max} = {}){
  const gems = [...row.querySelectorAll('.gem')];
  const n = max ?? gems.length;

  gems.forEach((g, k) => {
    if(g.classList.contains('scar')) return;
    // A gem mid-spend still carries `on` — it is not removed until the
    // collapse finishes. Without discounting it here, re-gaining inside that
    // ~400ms window reads as "no change", nothing re-fires, and the pending
    // spend then turns off a pip the count says is lit.
    const want = k < cur;
    const has = g.classList.contains('on') && !g.classList.contains('spend');
    if(want === has) return;

    g.classList.remove('gain', 'spend', 'after');
    void g.offsetWidth;                       // restart, not resume
    // a later click wins outright: dataset is strings, so bump explicitly
    const token = String((+g.dataset.seq || 0) + 1);
    g.dataset.seq = token;

    if(want){
      g.classList.add('on', 'gain');
      settled(g).then(() => {
        if(g.dataset.seq === token) g.classList.remove('gain');
      });
    } else {
      g.classList.add('spend');
      settled(g).then(() => {
        if(g.dataset.seq !== token) return;
        g.classList.remove('spend', 'on');
        g.classList.add('after');             // the socket remembers, briefly
        void g.offsetWidth;
        settled(g).then(() => {
          if(g.dataset.seq === token) g.classList.remove('after');
        });
      });
    }
  });

  // Pool-wide, and eased: the strip brightening over half a second is what
  // sells twelve as worse than eleven, not the twelfth pip on its own.
  if(fear){
    const i = intensity(cur, n).toFixed(3);
    gems.forEach(g => g.style.setProperty('--i', i));
  }
}
