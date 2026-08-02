/* Vendored from design/domains.js by scripts/port-design-js.mjs — do not edit here.
   Edit design/domains.js and re-run `node scripts/port-design-js.mjs`. */
// Domain tokens — colours, icons, classes and blurbs.
// Colours are the official values from daggerheart.org (--colour-domain-*-light/dark).
// Icons are the official 250x250 SVGs in assets/domains/, authored with
// fill="currentColor" so they recolour from CSS `color` alone.
export const DOMAINS = [
  { slug:'arcana',   name:'Arcana',   light:'#75509f', dark:'#4a3067',
    classes:['Druid','Sorcerer'],  blurb:'Innate and instinctual magic. Volatile power, potent when correctly channeled.' },
  { slug:'blade',    name:'Blade',    light:'#8e1f13', dark:'#5c0e06',
    classes:['Guardian','Warrior'], blurb:'Weapon mastery. Inexorable power over death.' },
  // The one departure from the official values, and a deliberate one. Bone
  // ships as #868686 — saturation 0, the same family as the graphite this
  // system spends on "no domain" (#5c636d, saturation 16). Every other domain
  // is separated from that graphite by hue; Bone was separated by value alone,
  // which is the one axis a colour ramp over artwork erodes. Same value, warmed
  // to old ivory: the smallest move that puts it in a family of its own, and
  // warm is the one direction nothing else on the sheet uses. See bone.html.
  { slug:'bone',     name:'Bone',     light:'#8f8578', dark:'#6b6357',
    classes:['Ranger','Warrior'],   blurb:'Tactics and the body. Unparalleled understanding of movement.' },
  { slug:'codex',    name:'Codex',    light:'#3262a2', dark:'#203f6a',
    classes:['Bard','Wizard'],      blurb:'Intensive magical study. Commanding, versatile understanding of magic.' },
  // Dread is Hope and Fear's domain, and the second departure from "official
  // values" in this table — but for the opposite reason to Bone's. Bone has an
  // official colour we chose to move; Dread has none to copy. daggerheart.org
  // publishes the palette for the nine corebook domains only, the Card Creator
  // API carries no Hope and Fear content, and the tint on the book's own
  // Warlock page (#361347) belongs to that page's artwork rather than to the
  // domain — which is how it differs from the Witch page's (#1c2619) even
  // though both classes carry Dread.
  // The hue is a transcription, though, and of the one thing that states it:
  // the banner in the DREAD DOMAIN callout on page 5. Measured across its
  // field it is 274.8° and holds it — p5 273.3, p95 276.4 — which lands in
  // the gap the wheel had, between Codex at 256° and Arcana at 304°.
  // Lightness is not transcribed. That banner is a shaded, textured object and
  // its L runs 30 to 43, so no single point off it is "the colour". It is
  // chosen under Bone's constraint instead: a domain has to survive being a
  // sigil in a card corner, where hue is all a reader gets, and at the family's
  // usual L≈50 Dread lands 0.038 from Codex in OKLab — under half this table's
  // own tightest pair (Codex/Midnight, 0.093). So it goes darker, which is the
  // axis the neighbours leave free and the direction the book itself drew: L 40,
  // inside the banner's own p75–p95, and 0.102 clear of Codex.
  // Replace both values if an official palette appears.
  { slug:'dread',    name:'Dread',    light:'#363e8a', dark:'#202559',
    classes:['Warlock','Witch'],    blurb:'Terror and the space past death. Power borrowed from what should stay buried.' },
  { slug:'grace',    name:'Grace',    light:'#9f365d', dark:'#7c163c',
    classes:['Bard','Rogue'],       blurb:'Charisma. Raw magnetism and mastery over language.' },
  { slug:'midnight', name:'Midnight', light:'#1b686f', dark:'#0b494f',
    classes:['Rogue','Sorcerer'],   blurb:'Shadows and secrecy. The power to control and create enigmas.' },
  { slug:'sage',     name:'Sage',     light:'#52822b', dark:'#346011',
    classes:['Druid','Ranger'],     blurb:'The natural world. The vitality of a bloom, the ferocity of a predator.' },
  { slug:'splendor', name:'Splendor', light:'#9b8d1a', dark:'#6a600c',
    classes:['Seraph','Wizard'],    blurb:'Life. The magnificent ability to both give and end it.' },
  { slug:'valor',    name:'Valor',    light:'#df903c', dark:'#9c6020',
    classes:['Guardian','Seraph'],  blurb:'Protection. Formidable strength raised in defense of others.' },
];

export const byslug = Object.fromEntries(DOMAINS.map(d => [d.slug, d]));

// The official marks are not centred inside their 250x250 viewBoxes — the ink
// sits up to 3px off centre, and the drawn size varies ~5% between domains, so
// nine icons at one CSS size neither align nor read as the same size. Measure
// the real ink bounds once and rewrite the viewBox to a square centred on them;
// after this, `place-items:center` plus a single height is exact everywhere.
let stage;
function recentre(markup){
  if(!stage){
    stage = document.createElement('div');
    // must stay in the layout tree — display:none makes getBBox return zeros
    stage.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden';
    document.body.append(stage);
  }
  stage.innerHTML = markup;
  const svg = stage.firstElementChild;
  const b = svg.getBBox();
  const s = Math.max(b.width, b.height);
  svg.setAttribute('viewBox', `${b.x + b.width/2 - s/2} ${b.y + b.height/2 - s/2} ${s} ${s}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const out = svg.outerHTML;
  stage.innerHTML = '';
  return out;
}

// Fetch a mark once and hand back inline, recentred markup.
// The official domain files carry a Tailwind `fill-white` class that would
// beat currentColor if any utility CSS were present — strip it. Comments are
// stripped too, or they become firstElementChild and break recentre().
const cache = new Map();
async function load(url){
  if(!cache.has(url)){
    const svg = await fetch(url)
      .then(r => r.ok ? r.text() : Promise.reject(new Error(`${url} ${r.status}`)))
      .then(t => t.replace(/<!--[\s\S]*?-->/g,'')
                  .replace(/\sclass="[^"]*"/g,'')
                  .replace(/\s(width|height)="[^"]*"/g,'').trim());
    cache.set(url, recentre(svg));
  }
  return cache.get(url);
}

export const icon  = slug => load(`systems/gluniverse-daggerheart/assets/domains/${slug}.svg`);
export const glyph = name => load(`systems/gluniverse-daggerheart/assets/types/${name}.svg`);
// Class marks. Not sigils — a class card's corner plates carry its two
// *domains*, which is what a class is. These are the class's face in a list:
// the placeholder a class or subclass wears in a sidebar, a compendium row or
// a hotbar slot, where the domain pair is not visible and "Ranger" is
// otherwise a word next to a grey square.
export const CLASSES = ['bard','druid','guardian','ranger','rogue',
                        'seraph','sorcerer','warrior','wizard',
                        // Hope and Fear.
                        'assassin','brawler','warlock','witch'];
export const clazz = name => load(`systems/gluniverse-daggerheart/assets/classes/${name}.svg`);

// Non-domain card types. Graphite, because in this system a saturated hue
// means "domain" — Ancestry and Community have none, so they read neutral.
// ramp:false suppresses the colour ramp over the art for the same reason.
export const KINDS = {
  ancestry:  { slug:'ancestry',  name:'Ancestry',  light:'#5c636d', dark:'#31363c', ramp:false },
  community: { slug:'community', name:'Community', light:'#5c636d', dark:'#31363c', ramp:false },
  // Hope and Fear's third heritage card. Graphite for the same reason the
  // other two are: a transformation belongs to no domain. It is deliberately
  // not tinted toward Dread despite arriving in the same book — vampire and
  // werewolf are not Dread cards, and a hue that said they were would be this
  // table inventing a rule the book does not print.
  transformation: { slug:'transformation', name:'Transformation',
                    light:'#5c636d', dark:'#31363c', ramp:false },
  // Equipment follows the same rule for the same reason: a sword belongs to
  // no domain. Open question whether weapons should earn an accent of their
  // own — tier, or physical vs magic — rather than sharing this graphite.
  gear:      { slug:'gear',      name:'Equipment', light:'#5c636d', dark:'#31363c', ramp:false },
};
