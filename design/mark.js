// The boxes you cross off — Hit Points, Stress, Armor Slots — plus the
// fused damage track they belong to.
//
// The mark is a filled shape, not a stroke. A stroked X is one width from
// end to end, which is what a printer does and not what a pen, a blade or a
// hammer does: every real mark is thin where it enters, widest where the
// force was, and thin again where it leaves. So each arm is a spindle —
// point, belly, point — and the profile is where each track's character
// lives before any colour is applied.

import { settled } from './settle.js';

/* ── the four arms ────────────────────────────────────────────────
   One diagonal each, in a 20×20 box. Drawn once and mirrored for the
   second arm, so the X is symmetric about the vertical without being two
   copies of the same stroke rotated — a rotated copy puts identical
   irregularities in both arms and the eye catches it.

   Every arm runs corner to corner. A mark that stops short of the edge is
   a decoration sitting inside a box; a mark that crosses it is the box
   crossed out, which is the entire gesture.

   The profiles are the whole design. Read them as physics:

     hp      a tear. Seventeen points and — the part that matters — a
             centreline that *bows off the diagonal*, so the stroke is not
             straight. Flesh does not part in a line. Its widest point is
             at 38% rather than the middle, and the two arms mirror, so the
             pair is never symmetric about anything.
     stress  a scored line. Narrow, hard, dead straight, and doubled: a
             fine second scratch runs alongside the main one, because
             something dragged under load rarely leaves one line.
     armor   a chisel. Four points, straight edges, the heaviest of the
             three by a wide margin. A blow, not a cut, and the only arm
             whose tips overhang the box it is breaking.
     plain   the neutral spindle, curved rather than faceted. Advancement
             slots use it: crossing off a permanent choice is bookkeeping,
             and bookkeeping should not look like an injury.

   Width is what was wrong with the first three. At a quarter of their own
   length these were not strokes: two spindles that fat cross in a lozenge
   as big as either of them, and the eye resolves the whole thing as one
   four-pointed star with a hole in the middle rather than as two marks. A
   pen stroke is under a tenth of its length. These are 8%, 5% and 15% —
   and the 15% is armour, which is allowed to be a blunt instrument. */
const ARM = {
  hp:     'M.5 .5 3.29 1.51 6.2 3.16 9.06 5.62 11.61 8.39 14.03 11.29 16.31 14.33 ' +
          '18.1 17.1 19.5 19.5 17.67 17.53 15.49 15.15 12.92 12.4 10.3 9.7 ' +
          '7.48 7.2 4.57 4.79 2.19 2.61Z',
  stress: 'M.7 .7 5.86 4.84 11.57 10.29 16.02 15.14 19.3 19.3 15.19 15.97 10.31 11.55 4.87 5.83Z',
  armor:  'M.4 .4 9.87 7.83 19.6 19.6 10.13 12.17Z',
  plain:  'M1 1Q12.3 7.6 19 19Q7.7 12.4 1 1Z',
};
/* Drawn alongside the arm and not derived from it — the second scratch is
   a different event from the first, so it is a different shape. */
const EXTRA = {
  stress: 'M4.83 2.15 11.56 8.44 17.85 15.17 11.24 8.76Z',
};

/* The same arm as a `clip-path`, for a surface that cannot carry SVG.
   The change log is one: Foundry's sanitiser takes every `<svg>` out of
   stored message content, and a marked box that loses its X does not look
   broken, it looks unmarked. So the ledger crosses its boxes off with the
   arm cut out of an empty element instead.

   Derived here rather than typed again over there. Three of these paths
   are pure point lists, so the polygon is exactly the same shape and not
   an approximation of it, and there is one place the geometry lives —
   which is the whole reason `XMARK` is exported rather than redrawn.

   `plain` is absent because it is the only one with a curve in it, and a
   polygon cannot say Q. Nothing needs it: the three tracks that get
   crossed off in a log are the three the rules print boxes for. */
export const armPolygon = (kind) => {
  const n = (ARM[kind] ?? '').match(/[0-9.]+/g)?.map(Number);
  if (!n) return null;
  const pt = [];
  for (let i = 0; i < n.length; i += 2) pt.push(`${n[i] * 5}% ${n[i + 1] * 5}%`);
  return `polygon(${pt.join(',')})`;
};
/* The core is the same path narrowed *across* the arm and not shortened
   along it — which is a fussier transform than scaling about the centre and
   is the whole difference between a mark and a shuriken. Every arm here runs
   at 45° through (10,10), so: rotate the diagonal onto the x-axis, squash y,
   rotate back. Scaled about the centre instead, a 0.46 copy of a spindle is
   the middle third of it — precisely the patch where the two arms already
   overlap — and both marks read as a four-pointed star with a hole in it.

   Narrowed the right way it is a line running the full length of the stroke:
   depth in the wound, the groove of the scratch, the facet of the chisel.
   Three meanings, one geometric relationship, no fourth path to keep in
   agreement with the first.

   And it is offset, not centred, which is the second thing that was wrong.
   A narrow shape sitting exactly down the middle of a wider one reads as a
   facet — two hard edges, symmetric, geometric — and that is what kept both
   the wound and the plate looking like folded metal. Shifted across the
   stroke it becomes an *edge*: on the wound a wet highlight along the lip of
   the tear, on the chisel a shadowed bevel down one side. Same construction,
   opposite sign, opposite colour, and neither of them is a star any more.

   Stress has none. At 5% of its length the whole stroke is about two device
   pixels wide, and a core inside that is a sub-pixel grey line — which is
   not a groove, it is a blur. The second scratch does that job instead. */
/* Armour's is centred and the wound's is not, and that is not an
   inconsistency. An offset core only stays inside a stroke that bows the
   same way it is offset — the wound does, so its highlight rides the outer
   lip the whole length. A straight taper does not: shifted sideways the
   core walks off the arm near the tips and the bevel floats in mid-air. So
   the chisel gets a fuller instead: one narrow dark line down the middle of
   a bright blade, which is a thing steel actually has. */
const CORE = {hp:{k:.30, off:.62}, stress:null, armor:{k:.28, off:0},
              plain:{k:.38, off:0}};
/* Right-to-left in point space: squash across the arm first, then slide the
   result across it. Both steps are in the arm's own frame, which is what the
   rotate pair is for. */
const core = c => `translate(${(c.off * .7071).toFixed(2)} ${(-c.off * .7071).toFixed(2)})` +
  `translate(10 10)rotate(-45)scale(1 ${c.k})rotate(45)translate(-10 -10)`;

/* Armour, and only armour, breaks the box — but the break is not drawn
   here. The first attempt was: knock chips out of the corners by filling
   them with the sheet's own colour and stroking the fracture edge back in.
   Two chips, two stroked edges, and at 22px it read as a small white bird
   perched on the box rather than as damage.

   So the box breaks itself. The recess's clip-path is what defines its
   outline, so a *different* clip-path when marked is a genuinely different
   silhouette — a shard sheared off the top-left corner where the mark
   exits, a nick out of the right edge — and there is nothing drawn over
   anything. What is left here is what the SVG is actually good for: three
   hairline cracks running out of the impact and across the plate. */
const BREAK = `
  <g class="bk">
    <path class="ck" d="M6.4 4.9 3.9 6.6 1.4 6.2"/>
    <path class="ck" d="M13.4 5.6 16.2 4.3 18.6 4.9"/>
    <path class="ck" d="M8.9 12.2 7.1 15.4"/>
  </g>`;

/* Two nested groups per arm, and the nesting is load-bearing: a CSS
   `transform` on an SVG element overrides the `transform` *attribute*
   outright. The outer group holds placement (the mirror) as an attribute,
   the inner one is left free for the animation to drive. */
const arm = (d, k, ex) => `<path class="bd" d="${d}"/>` +
  (ex ? `<path class="ex" d="${ex}"/>` : '') +
  (k ? `<path class="cr" d="${d}" transform="${core(k)}"/>` : '');

const X = kind => {
  const d = ARM[kind] ?? ARM.plain, ex = EXTRA[kind];
  const k = kind in CORE ? CORE[kind] : CORE.plain;
  return `<svg class="x" viewBox="0 0 20 20" aria-hidden="true">
    <g class="ar a"><g>${arm(d, k, ex)}</g></g>
    <g class="ar b" transform="translate(20 0)scale(-1 1)"><g>${arm(d, k, ex)}</g></g>
    ${kind === 'armor' ? BREAK : ''}
  </svg>`;
};

/* The same mark at tick size, for the damage band's cost cells. It is the
   plain arm rather than the wound's, because a 9px organic tear is a smudge
   — but it is the wound's *colour*, and that is the whole point: the band
   used to say "this zone costs two" in little grey squares, which is a
   different vocabulary from the two red marks you are about to make in the
   row directly underneath. Now it says it in the same marks. */
export const TICK = `<svg class="xm" viewBox="0 0 20 20" aria-hidden="true">
  <path d="${ARM.plain}"/><path d="${ARM.plain}" transform="translate(20 0)scale(-1 1)"/></svg>`;

/* One box, three children, and none of them is decoration:
     <u> the recess. It carries the fill, the ring and the clip — which is
         the reason it exists rather than the clip living on the box: a
         clipped element clips its descendants, and the armour break has to
         be able to run past the box's own edge.
     .x  the mark.
     <b> the transient. Ring, bloom or sweep depending on the track; drawn
         on its own element so the recess's clip cannot eat it. */
const BOX = (on, kind) => `<i class="${on ? 'on' : ''}"><u></u>${X(kind)}<b></b></i>`;
/* Advancement slots are also boxes you cross off, at half the size — with
   the neutral arm, because they are not an injury. */
export const XBOX = on => BOX(on, 'plain');

/* The neutral mark on its own, for callers that have to build the box
   themselves because it carries their own attributes — a consumable's charge
   needs a data-* the shared BOX() has no business knowing about. Exported
   rather than re-drawn there: an eighth copy of these path strings is an
   eighth chance for one of them to be a different X. */
export const XMARK = X('plain');

/* The run that scrolls in the Vulnerable strip. Authored as terms rather
   than a sentence: it is read at a glance, out of the corner of an eye,
   in the middle of the GM describing something. `i` is a term, `b` is the
   diamond that separates them.

   Both rules, not just the condition — a player whose Stress is full needs
   to know what the next mark costs as much as what is already true. */
const VULN_RUN = `<span>
  <i>Vulnerable</i><b></b>
  <i>All rolls targeting you have advantage</i><b></b>
  <i>Further Stress costs 1 Hit Point</i><b></b>
  <i>Clear 1 Stress to end it</i><b></b>
</span>`;
const VULN = `<div class="vuln"><div class="trk">${VULN_RUN}${VULN_RUN}</div></div>`;

/* `span` is how many boxes the row is *sized* for, which is not always how
   many it has. Hit Points and Stress sit one above the other in the same
   column at 7 and 6, and sized independently that is two different box
   sizes in the same glance — which reads as two different kinds of thing.
   They are not: they are the same box. So both are sized for the larger
   count and the shorter row simply ends early, left-packed, the way a row
   of anything shorter than the row above it should. */
export const MARKS = ({label, total, marked = 0, kind = 'hp', head = true,
                       vuln = false, span}) => `
<div class="mk ${kind}${vuln && marked >= total ? ' max' : ''}" style="--n:${span ?? total}">
  ${head ? `<div class="hd"><span class="k">${label}</span>
    <span class="n">${total - marked}<s> / ${total}</s></span></div>` : ''}
  <div class="row">${Array.from({length: total}, (_, i) => BOX(i < marked, kind)).join('')}</div>
  ${vuln ? VULN : ''}
</div>`;

/* ── the fused damage track ───────────────────────────────────────
   Thresholds and Hit Points as one object. The breakpoint numeral opens
   the zone it begins rather than floating above the join — same statement,
   no vertical cost. `massive` is the optional 2×severe rule, which bounds
   the Severe zone and so makes it proportional too.

   Every zone carries its own cost in `data-hp`, because the band is the
   fastest way there is to take a hit: what gets said at the table is "that's
   a Major", not "mark two". The zone already draws the cost — one tick per
   Hit Point — so pressing it is pressing the thing you just read. */
export const DAMAGE = ({major, severe, hp, marked = 0, massive = false,
                        label = 'Damage', span}) => {
  const z = [
    {k:'Minor',  n:1, cls:'s1', span: major},
    {k:'Major',  n:2, cls:'s2', span: severe - major, bp: major},
  ];
  if(massive){
    z.push({k:'Severe',  n:3, cls:'s3', span: severe, bp: severe});
    z.push({k:'Massive', n:4, cls:'s4', open:true,    bp: severe * 2});
  } else {
    z.push({k:'Severe',  n:3, cls:'s3', open:true,    bp: severe});
  }

  return `
<div class="mk dmg hp" style="--n:${span ?? hp}">
  <div class="hd"><span class="k">${label}</span>
    <span class="n">${hp - marked}<s> / ${hp}</s></span></div>
  <div class="band">
    ${z.map(s => `<div class="z ${s.cls}${s.open ? ' open' : ''}" data-hp="${s.n}"${
      s.open ? '' : ` style="flex-grow:${Math.max(s.span, 1)}"`}>
      ${s.bp == null ? '' : `<i class="bp">${s.bp}</i>`}
      <span class="lb">${s.k}</span>
      <span class="cost" title="${s.n} HP">${TICK.repeat(s.n)}</span>
    </div>`).join('')}
    <i class="tip"></i>
  </div>
  <div class="row">${Array.from({length: hp}, (_, i) => BOX(i < marked, 'hp')).join('')}</div>
</div>`;
};

/* ── the driver ───────────────────────────────────────────────────
   Same contract as gem.js's setPool: diff the row against the new count,
   animate only what changed, and survive being interrupted. Boxes fill
   from the left, which is how every table already tracks them on paper.
   `settled` is shared with the gem — see settle.js for why it is not the
   one-liner it looks like it should be. */
export function setMarks(mk, marked){
  const boxes = [...mk.querySelectorAll('.row > i')];

  /* Two passes and one flush, for setPool's reason and with more riding on
     it here: a Severe hit marks four boxes at once and a rest clears the
     whole track, so the per-box `offsetWidth` this used to do was four to
     seven forced synchronous layouts inside one loop. The restart needs a
     flush *between* a class coming off and going back on, not one each. */
  const moving = [];
  for(const [k, b] of boxes.entries()){
    const want = k < marked;
    if(want === b.classList.contains('on')) continue;
    b.classList.remove('hit', 'clr');
    moving.push([b, want]);
  }

  if(moving.length) void mk.offsetWidth;       // restart, not resume — once

  moving.forEach(([b, want]) => {
    const token = String((+b.dataset.seq || 0) + 1);
    b.dataset.seq = token;

    // The class flips immediately in both directions: the mark's arrival is
    // a transition on `.on`, and only the recess's reaction and the
    // transient are keyframes. Nothing here can be left in a state that
    // disagrees with the count.
    b.classList.toggle('on', want);
    b.classList.add(want ? 'hit' : 'clr');
    settled(b).then(() => {
      if(b.dataset.seq === token) b.classList.remove('hit', 'clr');
    });
  });

  // `max` drives the Vulnerable strip. Toggled here rather than by the
  // caller because it is not a separate piece of state — it is what this
  // count *means*, and anything that can mark Stress must not be able to
  // forget to say so.
  mk.classList.toggle('max', marked >= boxes.length && boxes.length > 0);

  const n = mk.querySelector('.hd .n');
  if(n) n.innerHTML = `${boxes.length - marked}<s> / ${boxes.length}</s>`;
}
