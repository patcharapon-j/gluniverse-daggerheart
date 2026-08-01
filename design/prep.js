/**
 * The roll prep popover.
 *
 * One at a time, on <body>, anchored to the thing you pressed, and it
 * resolves to the arguments the roll engine already accepts:
 *
 *   const opts = await prep(row, {
 *     kind: 'agility roll', label: 'Agility', base: 2,
 *     experiences: [{ name: 'Grew up on the streets', modifier: 2 }],
 *     purse: 4,
 *   })
 *   if (opts) rollTrait(actor, 'agility', opts)
 *
 * It resolves `null` when cancelled, and cancelling is free — Escape, a
 * click anywhere else, a scroll, a resize. The promise settles exactly
 * once whichever way it ends.
 *
 * ── it produces nothing new ───────────────────────────────────────
 * `advantage` as a signed count of d6, `experiences` as the list the
 * player ticked, `extra` as one labelled term, `reaction` as a boolean.
 * All four are arguments `rollDuality`/`rollTrait` have declared since
 * they were written and nothing has ever passed. This is the missing
 * hand, not a new mechanic.
 *
 * ── it opens on the click that used to roll ───────────────────────
 * So the empty case governs it. A level-1 character with no Experiences
 * meets this twice a minute: it is roll-ready the frame it opens, Enter
 * works before you touch anything, and it is four lines tall.
 */

/* ── the model ────────────────────────────────────────────────────
   Advantage nets to one signed count because that is what the dice do.
   Help stacks — each ally who spends a Hope rolls their own d6 — while
   advantage and disadvantage cancel one for one, so the three are summed
   rather than max'd. */
const netAdv = (st) => (st.adv ? 1 : 0) - (st.dis ? 1 : 0) + st.help;
const sign = (n) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);

let live = null;

/** Close the open popover, if there is one. Safe to call at any time. */
export function closePrep() {
  if (!live) return;
  const { el, teardown, settle } = live;
  live = null;
  teardown();
  el.remove();
  settle(null);
}

/**
 * Open the popover against an element.
 *
 * @param {Element} anchor  the row or button that was pressed
 * @param {object}  o
 * @param {string}  o.kind         the meta line: "agility roll"
 * @param {string}  o.label        what is being rolled: "Agility"
 * @param {number}  o.base         the modifier already in the roll
 * @param {Array}   [o.experiences] [{ name, modifier }]
 * @param {number}  [o.purse]      how many Hope (or Fear) can be spent
 * @param {string}  [o.currency]   'hope' (default) or 'fear'
 * @param {boolean} [o.advantage]  offer the advantage row. Default true.
 * @param {boolean|'only'} [o.reaction]
 *        `true` (default) offers both buttons; `false` offers only ROLL;
 *        `'only'` makes the whole popover a reaction — one button, and no
 *        duality diamonds on it, because a reaction hands nothing over.
 *        That last is for surfaces that are *already* a reaction when you
 *        press them, like the Evasion crest: opening a popover that then
 *        asked you to choose the thing you had just chosen would be the
 *        surface forgetting what you pressed.
 * @returns {Promise<null|{advantage:number,experiences:Array,extra:Array,reaction:boolean}>}
 */
export function prep(anchor, o = {}) {
  closePrep();

  const xp = o.experiences ?? [];
  const purse = o.purse ?? 0;
  const fear = o.currency === 'fear';
  const wantAdv = o.advantage !== false;
  const onlyRxn = o.reaction === 'only';
  const wantRxn = o.reaction !== false && !onlyRxn;

  const st = { adv: false, dis: false, help: 0, pick: new Set(), mod: 0 };

  const el = document.createElement('div');
  el.className = `dh prep${fear ? ' fear' : ''}`;
  el.tabIndex = -1;
  el.style.left = '-9999px';
  el.style.top = '0';

  /* Affordability, and the only place the purse is consulted. A row you
     have already ticked stays tickable — untickng it is how you get the
     Hope back, and a row that disabled itself the moment it was chosen
     could not be undone. */
  const cost = () => st.pick.size;
  const affordable = (i) => st.pick.has(i) || cost() < purse;

  const total = () => o.base + st.mod + [...st.pick].reduce((n, i) => n + xp[i].modifier, 0);

  function draw() {
    const n = netAdv(st);
    const die = n
      ? `<i class="d6${n < 0 ? ' neg' : ''}">${n > 0 ? '+' : '−'}${Math.abs(n)}d6</i>`
      : '';

    const srcs = wantAdv
      ? `<div class="sec">
           <s>advantage <kbd>A D H</kbd></s>
           <div class="srcs">
             <button class="src${st.adv ? ' on' : ''}" type="button" data-src="adv"><i></i>adv</button>
             <button class="src${st.dis ? ' on neg' : ' neg'}" type="button" data-src="dis"><i></i>disadv</button>
             <button class="src${st.help ? ' on' : ''}" type="button" data-src="help"><i></i>help${
               st.help > 1 ? `<em>×${st.help}</em>` : ''}</button>
           </div>
         </div>`
      : '';

    const xps = !xp.length
      ? (o.experiences
          ? `<div class="sec"><p class="nil">No Experiences yet — they appear here at level 2,
             and each one costs a ${fear ? 'Fear' : 'Hope'} to bring in.</p></div>`
          : '')
      : `<div class="sec">
           <s>experience <kbd>1–${Math.min(xp.length, 9)}</kbd></s>
           <div class="xps">${xp.map((x, i) => {
             const on = st.pick.has(i);
             const can = affordable(i);
             return `<button class="xr${on ? ' on' : ''}" type="button" data-xp="${i}"${
               can ? '' : ` disabled title="No ${fear ? 'Fear' : 'Hope'} left to spend."`}>
               <i></i><b>${esc(x.name || 'Experience')}</b>
               <span class="cost">${can ? `−1 ${fear ? 'fear' : 'hope'}` : `no ${fear ? 'fear' : 'hope'}`}</span>
               <em>${sign(x.modifier)}</em></button>`;
           }).join('')}</div>
         </div>`;

    el.innerHTML = `
      <div class="hd">
        <div class="id"><s>// ${esc(o.kind ?? 'roll')}</s><b>${esc(o.label ?? '')}</b></div>
        <div class="v">${sign(o.base)}</div>
      </div>
      <div class="sum"><b>${sign(total())}</b>${die}</div>
      <div class="bd">
        ${srcs}
        ${xps}
        <div class="sec inline">
          <s>modifier <kbd>− +</kbd></s>
          <div class="stp">
            <button type="button" data-mod="-1">−</button><b>${sign(st.mod)}</b>
            <button type="button" data-mod="1">+</button>
          </div>
        </div>
      </div>
      <div class="ft">
        <button class="go" type="button" data-go="${onlyRxn ? 'reaction' : 'roll'}"${
          onlyRxn ? ' title="No Hope, no Fear, no GM move."' : ''}>
          ${onlyRxn ? '' : '<span class="dd"><i class="h"></i><i class="f"></i></span>'}
          <s>${onlyRxn ? 'react' : 'roll'}</s><em>⏎</em>
        </button>
        ${wantRxn
          ? `<button class="go rx" type="button" data-go="reaction"
               title="No Hope, no Fear, no GM move."><s>reaction</s></button>`
          : ''}
        <button class="esc" type="button" data-go="cancel">esc</button>
      </div>`;
  }

  draw();
  document.body.appendChild(el);

  /* Positioned after insertion, for the reason the menu is: where it goes
     depends on how big it turned out to be, and that depends on how many
     Experiences the caller just handed us. Beside the anchor rather than
     over it — the row you pressed is the subject, and a popover that
     covers its subject is answering a question you can no longer see. */
  const pad = 8;
  const a = anchor?.getBoundingClientRect?.() ?? { right: 0, left: 0, top: 0, bottom: 0 };
  const box = el.getBoundingClientRect();
  const x = a.right + pad + box.width > innerWidth
    ? Math.max(pad, a.left - pad - box.width)
    : a.right + pad;
  const y = Math.max(pad, Math.min(a.top, innerHeight - box.height - pad));
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
  el.focus({ preventScroll: true });

  let settle;
  const done = new Promise((res) => { settle = res; });

  function finish(reaction) {
    // Nothing to finish if this popover has already been closed. The
    // listeners come off in `teardown` and the element goes with it, so
    // there is no known path here — but the promise may only settle once,
    // and a second settle is silent rather than loud. Guard the cheap way.
    if (!live || live.el !== el) return;
    const result = {
      advantage: wantAdv ? netAdv(st) : 0,
      experiences: [...st.pick].map((i) => ({ name: xp[i].name, modifier: xp[i].modifier })),
      extra: st.mod ? [{ k: 'modifier', v: st.mod }] : [],
      reaction: !!reaction,
    };
    const { el: e, teardown: t } = live;
    live = null;
    t();
    e.remove();
    settle(result);
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const { src, xp: i, mod, go } = b.dataset;
    if (src === 'adv') st.adv = !st.adv;
    else if (src === 'dis') st.dis = !st.dis;
    // Help wraps rather than growing without limit. Past three the stagger
    // on the card stops meaning anything and nobody has four spare allies.
    else if (src === 'help') st.help = (st.help + 1) % 4;
    else if (i !== undefined) toggle(Number(i));
    else if (mod !== undefined) st.mod += Number(mod);
    else if (go === 'roll') return finish(false);
    else if (go === 'reaction') return finish(true);
    else if (go === 'cancel') return closePrep();
    draw();
  });

  function toggle(i) {
    if (st.pick.has(i)) st.pick.delete(i);
    else if (affordable(i)) st.pick.add(i);
  }

  /* The keys the labels promise. Consumed with `stopPropagation` because
     Foundry binds its own hotkeys to the document and a bare `1` would
     otherwise reach them — the popover is focused, so anything it claims
     is unambiguously aimed at it. */
  const key = (e) => {
    if (e.key === 'Escape') return (e.stopPropagation(), closePrep());
    if (e.key === 'Enter') return (e.stopPropagation(), finish(onlyRxn || e.shiftKey));
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (wantAdv && k === 'a') st.adv = !st.adv;
    else if (wantAdv && k === 'd') st.dis = !st.dis;
    else if (wantAdv && k === 'h') st.help = (st.help + 1) % 4;
    else if (k === '+' || k === '=') st.mod += 1;
    else if (k === '-' || k === '_') st.mod -= 1;
    else if (/^[1-9]$/.test(k) && xp[Number(k) - 1]) toggle(Number(k) - 1);
    else return;
    e.stopPropagation();
    e.preventDefault();
    draw();
  };

  /* Every way out, and they are the menu's. Scroll closes rather than
     repositions: the popover is anchored to a point in the viewport and
     the row it is about is anchored to the document, so the moment those
     disagree it is pointing at something it does not mean. */
  const away = (e) => { if (!el.contains(e.target)) closePrep(); };
  addEventListener('pointerdown', away, true);
  addEventListener('keydown', key, true);
  addEventListener('scroll', closePrep, true);
  addEventListener('resize', closePrep, true);
  addEventListener('blur', closePrep);

  live = {
    el,
    settle,
    teardown() {
      removeEventListener('pointerdown', away, true);
      removeEventListener('keydown', key, true);
      removeEventListener('scroll', closePrep, true);
      removeEventListener('resize', closePrep, true);
      removeEventListener('blur', closePrep);
    },
  };

  return done;
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
