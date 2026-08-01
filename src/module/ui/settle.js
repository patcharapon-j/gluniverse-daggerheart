/* Vendored from design/settle.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/settle.js and re-run `node scripts/port-design-js.mjs`. */
// "This state's motion has landed." One definition, because both drivers need
// it and both need it to mean exactly the same thing: gem.js has to know when a
// spend has collapsed before it may take `on` off the pip, and mark.js has to
// know when a strike has settled before it may take `hit` off the box.
//
// Two things were wrong with the obvious version of this, and the second only
// showed up once the first was fixed.
//
// 1. It was `Promise.allSettled(el.getAnimations().map(a => a.finished))`, which
//    reads like the correct answer and is not. In this engine a CSS animation
//    reaches playState:"finished" without its `finished` promise ever settling —
//    verified against a two-line control animation on a bare div, so it is not
//    something about the keyframes involved. The promise stayed pending forever,
//    the cleanup never ran, and every marked box kept `hit` and every spent gem
//    kept `on spend` — the second of which is not cosmetic: a spent Hope stayed
//    lit. It failed in the one direction that looks like nothing is wrong.
//
// 2. animationend does fire, and it bubbles, so counting events off a single
//    listener works — while the page is painting. It is not, in general: an
//    occluded or offscreen window advances the document timeline (playState
//    still reaches "finished") without producing the frames the events are
//    dispatched on. So the event path cannot be the only path.
//
// Hence both, raced. The deadline is not a magic number: it is read back off
// the animations themselves, so it is exactly as long as the motion actually
// declares and it stays correct when a duration changes in the CSS.

/* One frame of grace past the declared end, so the event path wins the race in
   the normal case and the deadline only decides it when frames are not coming. */
const GRACE = 120;
/* Only for an animation that will not say when it ends. Nothing in this system
   calls settled() on an infinite animation — the Vulnerable marquee is never
   waited on — but a promise that never resolves is the bug this file exists to
   escape, so there is a floor regardless. */
const FALLBACK = 1200;

export const settled = el => new Promise(done => {
  const anims = el.getAnimations({subtree: true})
    .filter(a => a instanceof CSSAnimation);
  if(!anims.length) return done();

  let seen = 0;
  const tick = () => { if(++seen >= anims.length) finish(); };
  const finish = () => {
    el.removeEventListener('animationend', tick);
    el.removeEventListener('animationcancel', tick);
    clearTimeout(deadline);
    done();
  };

  const ends = anims.map(a => {
    const t = a.effect && a.effect.getComputedTiming();
    const end = t ? Number(t.endTime) : NaN;
    return Number.isFinite(end) ? end : FALLBACK;
  });
  const deadline = setTimeout(finish, Math.max(...ends) + GRACE);

  el.addEventListener('animationend', tick);
  el.addEventListener('animationcancel', tick);
});
