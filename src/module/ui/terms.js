/* Vendored from design/terms.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/terms.js and re-run `node scripts/port-design-js.mjs`. */
// Game-term marking for a card's rules prose.
//
// A port of gluniverse-vtt's
// `apps/web/src/rulesets/daggerheart/cards/terms.ts` and the marking half of
// its `RulesText.tsx` — the scanner, the mark paths, and `PerMark`'s four
// refresh glyphs — rewritten as a plain browser-runnable module with no
// imports, so the design study can load it from a file:// page the same way
// it loads card.js.
//
// WHY A SECOND SCANNER EXISTS AT ALL. The first pass of this port reused
// card.js's TERMS/mark(), on the argument that a second list of terms is a
// second place for the terms to drift. That argument was right about the
// risk and wrong about the cost: card.js colours two words out of the
// thirty-odd the rules actually name, draws no marks, and puts its treatment
// on a bare `<b>` — so every `**bold**` in a card's prose came out in small
// caps and the domain's print colour whether it was a game term or not.
// A card that says "Hit Points" in body grey and "**a choice**" in printed
// caps is saying the opposite of what it means. The marking is the thing
// that makes a card scannable, so it gets its own module and card.js keeps
// its minimal marker for the surfaces that still use it (tile.js).
//
// THE DRIFT RISK IS REAL AND IS HANDLED BY POINTING AT ONE SOURCE. Three of
// the lists below — the six traits, the five ranges, the conditions — are
// not invented here. They are transcriptions of this system's own
// `src/module/config.ts` (CONDITIONS) and of the trait and range vocabulary
// the rest of the system uses. If a condition is added there, it is added
// here; the comment on CONDITION_NAMES says so, and the names are kept in
// config.ts's own order so the two files diff against each other by eye.
//
// WHAT THIS IS NOT. It does not escape HTML, exactly as card.js's mark()
// does not: a card's `text` is already interpolated raw into the face's
// template, and introducing escaping in one of the two paths would make the
// two paths disagree about what a `<` in a card means. If escaping is wanted
// it belongs at the point the text enters the builder, for both markers at
// once.

/* ── the vocabulary ──────────────────────────────────────────────────────
   Four of these six lists are this system's; two are the port's. */

/** The six traits, plus Spellcast, which is a roll's trait without being one. */
const TRAIT_NAMES = [
  'Agility', 'Strength', 'Finesse', 'Instinct', 'Presence', 'Knowledge', 'Spellcast',
];

/** The five printed ranges. "Very Close" has to beat "Close" — see ALTS. */
const RANGE_NAMES = ['Melee', 'Very Close', 'Close', 'Far', 'Very Far'];

/* The conditions THIS system registers, transcribed from CONDITIONS in
   src/module/config.ts and in its order: the three the core rules name, the
   thirteen the cards do, then the optional chapters' and the Guardian's.

   Kept as names rather than ids because the rules print the name, and
   "Marked for Death" is three words — a card that writes it is marking one
   term, not a condition and two prepositions.

   Dead is deliberately absent, as it is upstream: a dead creature is not in
   a state a card refers back to, and printing DEAD in condition red in the
   middle of a sentence reads as a rules keyword when it is a fact.

   If config.ts gains a condition, add it here in the same place. */
const CONDITION_NAMES = [
  'Vulnerable', 'Hidden', 'Restrained',
  'Cloaked', 'Marked for Death', 'Spectral', 'Hexed', 'Invisible', 'Enraptured',
  'Corroded', 'Stunned', 'Charged', 'Drained', 'Horrified', 'Silenced', 'Ablaze',
  'Roped', 'Frostbitten', 'Nauseated', 'Cursed', 'Unstoppable', 'Broken', 'Destroyed',
];

/* The named rolls, as whole phrases. This exists so "Agility Roll" comes out
   as one term rather than as a trait followed by the word Roll: the phrase
   is the thing a card is telling you to make, and splitting it would print
   AGILITY in trait styling with a plain "Roll" trailing it. Which is why
   this group is matched before the traits. */
const ROLL_TRAITS = ['Action', 'Attack', 'Damage', 'Reaction', ...TRAIT_NAMES];

/* The repo's own terms, the ones card.js's TERMS had and gluvtt's scanner
   does not. They are kept because this study's sample text uses them and
   because dropping a term that was being marked would be a regression
   dressed as a port. None of them get a colour of their own — see the CSS
   note in face.css — so they ride the default print colour and differ from
   plain prose only by weight, caps, and their mark. */
const DICE_NAMES = ['Duality Dice', 'Rally Die'];
const SCORE_NAMES = ['Proficiency', 'Difficulty', 'Evasion'];
const SWING_NAMES = ['Advantage', 'Disadvantage'];

/** What a use limit waits for, keyed by the words a card prints. */
const PER = {
  'long rest': 'longRest',
  'short rest': 'shortRest',
  rest: 'rest',
  session: 'session',
  scene: 'scene',
};

/* ── the scanner ─────────────────────────────────────────────────────────
   One regex, one pass, named groups. Two orderings matter and they are
   different orderings:

   - WITHIN a group, longest alternative first, so "Very Close" wins over
     "Close" and "short rest" over "rest". That is what ALTS does.
   - BETWEEN groups, earlier group wins a tie at the same starting offset.
     That is what the order of PATTERNS does, and it is why `roll` sits
     above `trait` and `armor` above nothing in particular. */

const literal = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The words as one alternation, longest first. */
const ALTS = (words) => [...words].sort((a, b) => b.length - a.length).map(literal).join('|');

/* A JavaScript regex cannot carry a flag on part of itself, and this scanner
   needs some kinds case-blind (a card writes "stress" mid-sentence and
   "Stress" after a full stop, and both are the resource) while the rest stay
   case-sensitive (Charged and Broken and Hidden are ordinary English words
   until they are capitalised). So the case-blind sources are expanded letter
   by letter into [sS][tT]... — upstream's trick, kept verbatim in spirit. */
const anyCase = (source) =>
  source.replace(/[a-z]/gi, (letter) => `[${letter.toLowerCase()}${letter.toUpperCase()}]`);

/** [group name, case-blind?, alternation source]. Order breaks ties. */
const PATTERNS = [
  ['limit', true, `once per (?:${ALTS(Object.keys(PER))})`],
  ['roll', false, `(?:${ALTS(ROLL_TRAITS)}) Roll`],
  ['hp', true, 'hit points?|HP'],
  ['armor', true, 'armor slots?|armor score|armor'],
  ['hope', true, 'hope'],
  ['fear', true, 'fear'],
  ['stress', true, 'stress'],
  ['dice', false, ALTS(DICE_NAMES)],
  ['score', false, ALTS(SCORE_NAMES)],
  ['swing', false, ALTS(SWING_NAMES)],
  ['range', false, ALTS(RANGE_NAMES)],
  ['trait', false, ALTS(TRAIT_NAMES)],
  ['condition', false, ALTS(CONDITION_NAMES)],
];

const READING = new RegExp(
  PATTERNS.map(([kind, blind, source]) =>
    `(?<${kind}>\\b(?:${blind ? anyCase(source) : source})\\b)`).join('|'),
  'g',
);

/**
 * The text as plain stretches and marked terms, in order. A segment is
 * `{text}` for prose, `{text, term}` for a term, and `{text, term:'limit',
 * per}` for a use limit, whose mark says what it waits for rather than what
 * it costs.
 */
export function readTerms(text) {
  const segments = [];
  let from = 0;
  for (const match of String(text).matchAll(READING)) {
    const at = match.index;
    if (at > from) segments.push({ text: text.slice(from, at) });
    const kind = Object.keys(match.groups).find(k => match.groups[k] !== undefined);
    const word = match[0];
    if (kind === 'limit') {
      segments.push({
        text: word,
        term: 'limit',
        per: PER[word.slice('once per '.length).toLowerCase()] ?? 'rest',
      });
    } else {
      segments.push({ text: word, term: kind });
    }
    from = at + word.length;
  }
  if (from < text.length) segments.push({ text: text.slice(from) });
  return segments;
}

/* ── the marks ───────────────────────────────────────────────────────────
   Upstream's paths, unchanged, on a 16×16 box. They are drawn rather than
   loaded for the same reason face.js draws its own bolt: these are nine
   glyphs at body-text size, and a sprite sheet or nine fetches for them
   would be machinery around 2kB of path data.

   The glyphs are each the resource's own shape as the rest of the system
   draws it — Hope's diamond, Fear's flame, Stress's bolt, Hit Points' heart,
   Armor's shield, a range's concentric rings, a trait's hexagon, a
   condition's ring. */
export const MARK_PATHS = {
  hope: 'M8 1.2 13 8l-5 6.8L3 8z',
  fear: 'M8 1c1.8 3 5 4.6 5 8.2A5 5 0 0 1 3 9.2C3 5.6 6.2 4 8 1zm0 6.2c-.8 1.3-2 2-2 3.4a2 2 0 0 0 4 0c0-1.4-1.2-2.1-2-3.4z',
  stress: 'M9.8 1 3.6 8.6h3.8L6.2 15l6.2-7.6H8.6z',
  hp: 'M8 14.4S1.6 10.6 1.6 6.2A3.4 3.4 0 0 1 8 4.4a3.4 3.4 0 0 1 6.4 1.8c0 4.4-6.4 8.2-6.4 8.2z',
  armor: 'M8 1.2l5.6 2.2v4c0 3.4-2.4 6.2-5.6 7.2-3.2-1-5.6-3.8-5.6-7.2v-4z',
  range:
    'M8 1.6a6.4 6.4 0 1 1 0 12.8A6.4 6.4 0 1 1 8 1.6zm0 2.2a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 1 0 0-8.4zm0 2.4a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 1 1 0-3.6z',
  trait: 'M8 1.2l5.9 3.4v6.8L8 14.8l-5.9-3.4V4.6z',
  condition: 'M8 1.6a6.4 6.4 0 1 1 0 12.8A6.4 6.4 0 1 1 8 1.6zm0 2.4a4 4 0 1 0 0 8 4 4 0 1 0 0-8z',

  /* The three the repo's own terms take. None is upstream's, because
     upstream has no such terms; each borrows a glyph that already means the
     right thing rather than inventing a fourth family of shapes. A roll and
     a named die both take the die face below; Proficiency, Difficulty and
     Evasion take the trait hexagon, because all three are numbers you read
     off a sheet; Advantage and Disadvantage take the range rings, since what
     they modify is a roll's spread. */
  roll: null,
  dice: null,
  score: null,
  swing: null,
};

/** A die's face with three pips — upstream's `diePath`, for rolls and dice. */
export const DIE_PATH =
  'M3 1.5h10A1.5 1.5 0 0 1 14.5 3v10a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 13V3A1.5 1.5 0 0 1 3 1.5zm2 2.4a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 1 0 0-2.6zm6 5.6a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 1 0 0-2.6zM8 6.7a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 1 0 0-2.6z';

MARK_PATHS.roll = DIE_PATH;
MARK_PATHS.dice = DIE_PATH;
MARK_PATHS.score = MARK_PATHS.trait;
MARK_PATHS.swing = MARK_PATHS.range;

/* Upstream's PerMark, as path data. A use limit's mark says what the limit
   waits for, not what spending it costs: a sun for a long rest, a book for a
   session, a stage for a scene, and a crescent for the plain or short rest
   that is one night's sleep. Short rest and rest share the crescent on
   purpose — a card that says "once per rest" means either kind, and drawing
   them apart would claim a distinction the sentence does not make. */
export const PER_PATHS = {
  longRest: 'M8 2a6 6 0 1 1 0 12A6 6 0 1 1 8 2z',
  session:
    'M1.8 3.2c2.2-.8 4.2-.6 6.2.8 2-1.4 4-1.6 6.2-.8V13c-2.2-.8-4.2-.6-6.2.8-2-1.4-4-1.6-6.2-.8zm5.5 1.9v7.4h1.4V5.1z',
  scene: 'M2 5.5h12V14H2zm0-3 12-.9.2 2.1-12 .9z',
  rest: 'M10.8 2.2A6 6 0 1 0 13.8 11 5 5 0 0 1 10.8 2.2z',
  shortRest: 'M10.8 2.2A6 6 0 1 0 13.8 11 5 5 0 0 1 10.8 2.2z',
};

const markSvg = (path) =>
  `<svg viewBox="0 0 16 16" class="dh-term-mark" aria-hidden="true" focusable="false"` +
  `><path d="${path}" fill="currentColor" fill-rule="evenodd"/></svg>`;

/** One term, as the face prints it: its mark, then the words. */
const termHtml = (segment) => {
  const path = segment.term === 'limit'
    ? (PER_PATHS[segment.per] ?? PER_PATHS.rest)
    : MARK_PATHS[segment.term];
  return `<b class="dh-term" data-term="${segment.term}">${
    path ? markSvg(path) : ''}${segment.text}</b>`;
};

/** The text with every game term marked, and nothing else touched. */
export const terms = (text) =>
  readTerms(text).map(s => (s.term ? termHtml(s) : s.text)).join('');

/* ── markdown ────────────────────────────────────────────────────────────
   `**bold**` and `*italic*`, with the term scanner run INSIDE each run
   rather than over the finished markup — which is the whole point of doing
   it in this order. Marking first and emphasising after is what let a
   `**bold**` collect the term treatment: both came out as a bare `<b>` and
   the CSS had no way to tell them apart. Here emphasis is `<strong>` and
   `<em>`, the term is `.dh-term`, and the two can be styled without either
   one guessing about the other.

   Split-and-rejoin rather than a replace, because a term can straddle
   nothing but it can certainly sit inside emphasis — "spend a **Hope**" has
   to come out bold AND gold, which means the term lives in the run, not
   around it. */
export const rich = (text) =>
  String(text)
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)
    .map((part) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return `<strong>${terms(part.slice(2, -2))}</strong>`;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return `<em>${terms(part.slice(1, -1))}</em>`;
      }
      return terms(part);
    })
    .join('');
