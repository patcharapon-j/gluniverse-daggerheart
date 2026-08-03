/* Vendored from design/die.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/die.js and re-run `node scripts/port-design-js.mjs`. */
// One die, and the table that says what shape it is.
//
// This was the top of `plate.js` and moved out when a second component
// wanted it. `keep.js` draws dice that live on a card, and it has to draw
// them with the *same* builder the chat plate uses or the two drift — which
// is not a hypothetical: `tools/verify/` caught exactly that between
// `design/plate.js` and `src/module/dice/plate.ts`, where one hardcoded a
// square for every damage die and a 2d8 came out as two d6.
//
// It is also the reason this is a module of its own rather than an import
// from `plate.js`. `plate.js` is a study page's builder and is not vendored;
// `port-design-js.mjs` copies modules into `src/module/ui/` verbatim and
// rewrites no import paths, so anything the system side needs has to be
// reachable from inside that folder. A file holding one function is a small
// price for the two never disagreeing about what a d10 looks like.
//
// Nothing here is an `<svg>`, which is load-bearing rather than incidental:
// Foundry's sanitiser strips SVG out of stored chat message content, so a
// die built from `<i>`/`<b>`/`<em>` survives the database and one built from
// a path does not. See `design/ledger.js` for the same constraint stated at
// length.

/* Three layers, in the order light hits them: .lamp is the solid — its
   ::before the outer edge, its ::after the faceted ring — and .core is the
   front face, the one plane square to you. The numeral rides on top of
   both. See plate.css for the projection geometry.

   `sz` is optional and is *meant* to be omitted wherever a stylesheet has
   already stated one: an inline `--sz` beats anything a host inherits down,
   so passing a number here is how a caller takes the size decision away
   from the surface the die is standing on. The keep tray omits it. */
export const DIE = (v, cls, sz, mx) =>
  `<i class="die ${cls}"${sz ? ` style="--sz:${sz}px"` : ''}${
    mx ? ` data-mx="${mx}"` : ''}><b class="lamp"></b><b class="core"></b><em>${v}</em></i>`;

/* `sq` for the d6 rather than `d6`, because a square chip is also what the
   advantage die and the critical's maximum dice are, and those are not
   claiming to be a kind of die when they wear it. */
export const SHAPE = {d4:'d4', d6:'sq', d8:'d8', d10:'d10', d12:'d12', d20:'d20'};

export const shapeOf = die => SHAPE[String(die).toLowerCase()] ?? 'sq';

export const facesOf = die => {
  const n = Math.floor(Number(String(die).replace(/^d/i, '')));
  return Number.isFinite(n) && n > 1 ? n : 12;
};
