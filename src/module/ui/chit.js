/* Vendored from design/chit.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/chit.js and re-run `node scripts/port-design-js.mjs`. */
// Counters placed on a card. One builder, one setter, three hosts.
//
// The setter is the contract Gems and Marks already keep: the row is
// rendered once and every later change goes through setChits, which diffs
// what is there against what is wanted and animates only the difference.
// Rebuilding the markup would cut a placement's settle off mid-drop and
// restart it, which is the thing that makes twelve read as different from
// eleven on the Fear pool and the thing that makes a chit read as landing
// here.
//
// A chit is a button, not a div. It is the smallest control on the sheet
// and it has to be reachable by keyboard like everything else you press.

const CHIT = () => '<b class="face"></b><b class="rim"></b><b class="pip"></b>';

/* At this many, the row states the number instead of enumerating it.
   Twelve chits at 22px is 340px and no host has that; the loadout makes
   the same concession when it prints 5/5 rather than five card names.

   The default is the card's, because the card is the widest host and the
   one with room to be generous. A narrower host passes its own — which is
   the `--sz` contract again: the host knows how much room it has and the
   component does not, so the host states it and the geometry follows.
   Getting this wrong does not look like a cap set too high; it looks like
   a row that grew a second line, which is why `.chits` in a row is
   `nowrap` and this is not the only thing standing between them. */
export const CHIT_CAP = 5;

/**
 * value  how many are on the card
 * max    the capacity, when it is known. Null or 0 means an open pool:
 *        no sockets are drawn, because there is no capacity to draw.
 * name   what the pool is called, for the control's own label
 * cap    the held count at which this host becomes one chit plus a multiplier
 * add    false to render a readout with no way to place — a posted chat
 *        card is a record, and a record does not take input.
 * dom    whether the host has a domain. Stated rather than sniffed: a
 *        var() fallback on --dom asks whether the property is set
 *        anywhere up the tree, and tokens.css sets it at :root, so the
 *        answer is always yes and every chit comes out teal. An ancestry,
 *        a community and a class feature have no domain, and only the
 *        thing drawing them knows that.
 * key    what the host calls this pool, handed straight back on the row's
 *        `data-key`. The component never reads it and could not: it counts
 *        a number and has no idea what the number is of. The delegated
 *        handler needs to know, and this is the only thread between them.
 */
export const CHITS = ({value = 0, max = 0, name = 'tokens', cap = CHIT_CAP, add = true, round = false, dom = false, key = ''} = {}) => {
  const capped = max > 0;
  const n = capped ? Math.min(value, max) : value;
  const cls = ['chits'];
  if (dom) cls.push('dom');
  if (capped) cls.push('capped');
  if (capped && n >= max) cls.push('full');
  if (round) cls.push('round');

  // At the cap the row collapses to one chit and a multiplier. The chit is
  // still a chit and still takes the click, so the gesture does not change
  // shape at the boundary.
  //
  // Collapse from the held value rather than the ceiling. A pool with room
  // for five should still look empty when it is empty; it becomes a stack
  // only once five counters are actually present.
  const open = '<div class="' + cls.join(' ') + '" data-chits data-v="' + n +
    '" data-max="' + max + '" data-cap="' + cap + '"' +
    (key ? ' data-key="' + key + '"' : '') + '>';
  if (n >= cap) {
    return open +
      '<button class="chit" data-take="1" title="Spend one ' + name + '">' + CHIT() + '</button>' +
      '<span class="n">×' + n + '</span>' +
      (add ? addBtn(name) : '') +
      '</div>';
  }

  const chits = Array.from({length: n}, (_, i) =>
    '<button class="chit" data-take="' + (i + 1) + '" title="Spend one ' + name + '">' + CHIT() + '</button>').join('');

  // Sockets only where a maximum exists. An open pool ends at its last
  // chit, which is what a real card looks like.
  const socks = capped
    ? Array.from({length: Math.max(0, max - n)}, () => '<span class="sk"></span>').join('')
    : '';

  return open + chits + socks + (add ? addBtn(name) : '') + '</div>';
};

/* `.put` and not `.add`, which is what it was called and what it cannot be:
   `sheet.css` already owns `.lst .add` for the panel headings' "+ new", both
   load into the same `.dh` root where scoping does nothing, and the two are
   the *same specificity* — so which one won would have been decided by the
   order `system.json` happens to list them in. That is the bug that renamed
   `.die.win` and `.dfn .pl`, caught before it shipped rather than after. */
const addBtn = (name) =>
  '<button class="put" data-place title="Place a ' + name.replace(/s$/, '') + '"></button>';

/**
 * Drive an already-rendered row to a new value.
 *
 * Only the difference moves. Adding two chits plays two drops and leaves
 * the rest alone; taking one plays one lift on the chit that left and
 * marks the socket it vacated. The DOM is patched after the animations
 * are started, so the element that is flying away is the element that was
 * there — a rebuild would animate a stranger.
 */
export function setChits(row, value, max = Number(row.dataset.max) || 0) {
  const was = Number(row.dataset.v) || 0;
  const capped = max > 0;
  const now = capped ? Math.max(0, Math.min(value, max)) : Math.max(0, value);
  if (now === was) return;

  // The cap is read back off the row rather than defaulted, because the
  // builder took it from the host and this has no way to ask the host
  // again. A default here would make the setter disagree with the builder
  // on exactly one row — a narrow host's — and only past the boundary,
  // which is a bug that waits for a player with a lot of counters.
  const cap = Number(row.dataset.cap) || CHIT_CAP;

  row.dataset.v = String(now);
  row.dataset.max = String(max);
  row.classList.toggle('capped', capped);
  row.classList.toggle('full', capped && now >= max);

  // At the cap in either direction, the row changes shape rather than
  // count, and there is nothing honest to animate between "eleven chits"
  // and "one chit and the numeral 11". Redraw and stop.
  if (Math.max(now, was) >= cap) {
    row.innerHTML = CHITS({value: now, max, cap, add: !!row.querySelector('[data-place]')})
      .replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '');
    return;
  }

  const chits = [...row.querySelectorAll('.chit')];
  const socks = [...row.querySelectorAll('.sk')];

  if (now > was) {
    // Place. Each new chit takes the socket that was standing where it
    // lands, so the row does not reflow under the pointer that is still
    // on the plus.
    for (let i = was; i < now; i++) {
      const el = document.createElement('button');
      el.className = 'chit place';
      el.dataset.take = String(i + 1);
      el.innerHTML = CHIT();
      el.addEventListener('animationend', () => el.classList.remove('place'), {once: true});
      const sk = socks.shift();
      if (sk) sk.replaceWith(el); else row.insertBefore(el, row.querySelector('.put'));
    }
    return;
  }

  // Take. The chits that left lift away and are replaced by their sockets
  // when they are gone, so the gap does not appear before the object has.
  for (let i = was - 1; i >= now; i--) {
    const el = chits[i];
    if (!el) continue;
    el.classList.add('take');
    el.addEventListener('animationend', () => {
      if (capped) {
        const sk = document.createElement('span');
        sk.className = 'sk after';
        sk.addEventListener('animationend', () => sk.classList.remove('after'), {once: true});
        el.replaceWith(sk);
      } else {
        el.remove();
      }
    }, {once: true});
  }
}

/**
 * The refusal. A pool that cannot take another chit says so by flinching,
 * for the reason the Stress track and the Hope pool do: the thing that
 * cannot pay is the thing that should answer, not a panel over the top of
 * the number that already said no.
 */
export function refuseChits(row) {
  row.classList.remove('deny');
  void row.offsetWidth;                        // restart, not resume
  row.classList.add('deny');
  row.addEventListener('animationend', () => row.classList.remove('deny'), {once: true});
}

/**
 * One delegated handler for both gestures, so a host wires this once.
 *
 * place and take commit through the same call and produce the same
 * animation, which is swap.js's rule about a surface that is both pressed
 * and dragged, applied to a surface that is pressed two ways.
 *
 * **The press stops here.** A chit sits *on* something — a card in a
 * loadout, a feature row — and every one of those hosts is itself pressable
 * and delegates its own click off a common ancestor. Left to bubble, placing
 * a counter on a domain card would also post that card to chat: two acts on
 * one press, one of them unasked for. The row is the subject of the click,
 * so the click ends at the row.
 */
export function chitClicks(root, onChange) {
  root.addEventListener('click', (e) => {
    const row = e.target.closest?.('[data-chits]');
    if (!row) return;
    e.stopPropagation();
    const v = Number(row.dataset.v) || 0;
    const max = Number(row.dataset.max) || 0;

    if (e.target.closest('[data-place]')) {
      if (max > 0 && v >= max) return refuseChits(row);
      return onChange(row, v + 1, +1);
    }
    const chit = e.target.closest('.chit');
    if (chit) return onChange(row, Math.max(0, v - 1), -1);
  });
}
