/* Vendored from design/track.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/track.js and re-run `node scripts/port-design-js.mjs`. */
// Damage thresholds and marked-slot rows. Used by the armour card, the
// armour tile and the character sheet from one definition, because the
// number line an armour promises and the one the sheet tracks are the same
// number line.

/* ── thresholds ───────────────────────────────────────────────────
   `major` and `severe` are the only inputs that matter. Everything else
   about the drawing follows from them:

   - The bounded zones are drawn to scale against each other. 0→major and
     major→severe get flex-grow equal to their real spans, so 7/15 (spans
     of 7 and 8) shows a slightly wider Major band than 8/16 does. This is
     the whole reason it is a bar and not four numbers in boxes.
   - The last zone is unbounded and gets a fixed width plus an arrow. There
     is no width that honestly represents "and everything above this".
   - `massive` turns on the optional 2×severe rule, which *bounds* the
     Severe zone — so it becomes proportional too and the arrow moves out
     to the new tail.
   - `note` is for the armour card, where the printed thresholds are base
     values and the player has to add their level.  */
export const THRESHOLDS = ({major, severe, massive = false, label = 'Damage Thresholds',
                            note, sm = false}) => {
  const zones = [
    {k:'Minor',  hp:1, cls:'s1', span: major},
    {k:'Major',  hp:2, cls:'s2', span: severe - major, pin: major},
  ];
  if(massive){
    zones.push({k:'Severe',  hp:3, cls:'s3', span: severe, pin: severe});
    zones.push({k:'Massive', hp:4, cls:'s4', open:true,    pin: severe * 2});
  } else {
    zones.push({k:'Severe',  hp:3, cls:'s3', open:true,    pin: severe});
  }
  const tip = {s1:'#e4e7ea', s2:'#767d88', s3:'#2b3037', s4:'#14161a'}[zones.at(-1).cls];

  return `
<div class="thr${sm ? ' sm' : ''}">
  ${label === false ? '' : `<div class="hd"><span class="k">${label}</span>${
    note ? `<span class="note">${note}</span>` : ''}</div>`}
  <div class="track" style="--tip:${tip}">
    ${zones.map(z => `<div class="seg ${z.cls}${z.open ? ' open' : ''}"${
      z.open ? '' : ` style="flex-grow:${Math.max(z.span, 1)}"`}>
      ${z.pin == null ? '' : `<i class="pin">${z.pin}</i>`}
      <span class="lb">${z.k}</span>
      <span class="hp"><b>${z.hp}</b><i>HP</i></span>
    </div>`).join('')}
    <i class="tip"></i>
  </div>
</div>`;
};

/* ── slot rows ────────────────────────────────────────────────────
   HP, Stress and Armor Slots are one component. `marked` boxes fill from
   the left, which is how every table already tracks them on paper. */
export const SLOTS = ({label, total, marked = 0, cls = ''}) => `
<div class="slots ${cls}">
  <div class="hd"><span class="k">${label}</span><span class="n">${total - marked} / ${total}</span></div>
  <div class="row">${Array.from({length: total},
    (_, i) => `<i class="${i < marked ? 'on' : ''}"></i>`).join('')}</div>
</div>`;
