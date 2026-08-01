# GLUniverse — Daggerheart

An unofficial Foundry VTT game system for Daggerheart, built on the design
system in `design/`.

## Layout

- `system.json` — the Foundry manifest. `documentTypes` declares the four
  Actor subtypes and the ten Item subtypes; `styles` lists the sheets in load
  order, tokens first.
- `design/` — **the design system, and the source of truth for the look.**
  Standalone HTML study pages plus the component modules they are built from.
  It runs on its own at `http://localhost:4173/design/` with no build step.
  `design/system.html` is the written study of why everything is the way it is.
- `src/module/` — the system proper.
  - `config.ts` — the closed sets: traits, domains, tiers, ranges, severities.
    Anything a table can extend (classes, ancestries) is content, not config.
  - `data/` — DataModels. Derivation lives here; the schema owns the numbers.
  - `documents/` — Actor and Item behaviour. Marking, equipping, applying
    damage. One implementation each, shared by the sheet and the chat card.
  - `dice/` — the roll engine and the chat plate.
  - `sheets/` — Svelte 5 sheet components.
  - `apps/` — the ApplicationV2 ↔ Svelte bridge.
  - `ui/` — **vendored** from `design/`. Do not edit; see below.
- `src/packs-src/` — compendium source, one module per pack. See below.
- `styles/` — **ported** from `design/`. Do not edit; see below.
- `scripts/port-design-css.mjs`, `scripts/port-design-js.mjs` — the port.
- `scripts/build-packs.mjs` — compiles `src/packs-src/` into `dist/packs/`.

## The port

`design/` is authored as whole documents; a Foundry system owns a subtree of
somebody else's. The two port scripts carry the design across and change only
what has to change:

    :root        → .dh                 the palette is scoped to our own root,
    :root.light  → html.dh-light .dh   or --ink and --paper leak into every
    body.ramp    → .dh.ramp            other package on the page.
    <selector>   → .dh <selector>      and so does everything else — see below.
    /design/assets/ → ../assets/       relative to `styles/`, where it lands.

Everything Foundry renders is wrapped in `.dh` — sheet roots via
`DEFAULT_OPTIONS.classes`, chat cards via the wrapper in `dice/rolls.ts`.

**Every ported selector is qualified with `.dh`.** Foundry imports our sheets
into the `system` cascade layer, which it declares *after* `elements`,
`blocks` and `applications` — so an unqualified rule of ours does not merely
compete with Foundry's, it wins outright regardless of specificity. The design
names things the way a document that owns itself may (`.tabs`, `.rail`,
`.win`, `.slot`, `.card`, `.pk`), and Foundry uses most of those for its own
furniture. `.tabs button` took the icon font off all thirteen sidebar tabs.

Two consequences worth knowing:

- Anything we draw **outside** a `.dh` root needs the class itself. Three do:
  the swap's drag proxy, the context menu and the roll popover, all on
  `<body>` so no scroller can clip them. All three wear `dh`, and the port
  rewrites `.dragproxy` → `.dh.dragproxy`, `.ctxm` → `.dh.ctxm` and `.prep` →
  `.dh.prep`. Note it rewrites the *class*, not just the root selector, so
  descendants work too: `.ctxm .mi` has to become `.dh.ctxm .mi`, and
  `.dh .ctxm .mi` — what the scoper would have written — matches nothing.
- Scoping does **not** help when two of *our own* sheets collide, because both
  are inside `.dh`. That is a name clash in the design system and is fixed in
  `design/`: `.die.win` became `.die.lit` (it was taking `.win`, the sheet
  window) and `.dfn .pl` became `.dfn .crest` (it was taking `.pl`, the chat
  plate). Study pages load one stylesheet at a time and cannot show this; the
  system loads all of them at once, so it always will.

Paths in CSS are the other thing that does not survive the move. A relative
`url()` resolves against the **stylesheet**, not the document — including one
substituted from a custom property set inline. `src/module/assets.ts` puts
every JS-set `--art`/`--pic` through `getRoute`; the port rewrites the ones
written in the stylesheets. Chat is stricter still: Foundry's sanitiser strips
`<svg>` and `url()` styles out of stored message content, so a posted card is
stored as its *options* and redrawn on render (`sheets/post-card.ts`,
`dice/chat.ts`).

**Edit `design/`, then re-run the scripts.** Editing `styles/` or
`src/module/ui/` directly means the next port silently reverts you, and the
study pages stop describing the system they are about.

    node scripts/port-design-css.mjs
    node scripts/port-design-js.mjs

A new component in `design/` is **three registrations**, not one: the file
list in the port script, and — for CSS — the `styles` array in `system.json`.
Foundry reads that array once at server start, so a newly added stylesheet
does not appear on a browser reload. Restart Foundry.

`tools/verify/` is a page that loads the *ported* sheets and asserts the
things the port could silently break — that the palette resolves inside `.dh`,
that it does not leak to `:root`, that a plate is still exactly 300px. Open it
at `http://localhost:4173/tools/verify/` after any port.

Its last section, THE DECK, imports `src/packs-src/` directly and draws one
card of each subtype with the vendored builder. What that catches is not CSS
but *data*: header art that 404s leaves a card merely looking dark, and a
footer with no card number looks like a design choice. The preview server
aliases `/systems/gluniverse-daggerheart/` to the repo root so those paths
resolve exactly as they do in Foundry, rather than being rewritten into
something the page made up.

## Compendium content

`src/packs-src/*.mjs` each default-export an array of normalized documents;
`_helpers.mjs` has one constructor per Item subtype so a class reads like the
page it came from. `build-packs.mjs` gives every document a **stable `_id`**
derived from `pack:type:name` — rebuild as often as you like and a character
who dragged a card off the compendium stays linked to it. Rename a card and
that link breaks, which is the honest outcome and why the id is not random.

The script also creates the folders entries ask for by name, and checks that
`system.json` declares exactly the packs it built. A pack the manifest does
not know about is never mounted, and nothing says so.

| Pack | Contents |
| --- | --- |
| `classes` | 9 classes and 54 subclass cards, foldered by class |
| `heritage` | 18 ancestries and 9 communities |
| `domains` | 189 domain cards, foldered by domain, in deck order |

A subclass is three documents, not one — Foundation, Specialization, Mastery —
because that is how you acquire it. `subclassCards()` does the expansion so
the source stays one entry per subclass.

Ancestries and communities share a pack because heritage is one line on the
sheet and one choice at the table — "wildborne faun" — and two compendiums
would mean two windows to fill in one field. They are still two Item
subtypes. An ancestry's features are `top` and `bottom`, named for where they
sit on the card rather than for what they do, because the position *is* the
rule: mixed ancestry takes the top of one and the bottom of another, which is
why a goblin-orc can be Surefooted or Sturdy but never both.

Neither carries a domain mark. In this system a saturated hue means domain, so
they take the design's own type glyphs from `assets/types/` — but both now
carry the card's own header art as their `img`, which is what actually fills
the plate. The glyph is the fallback for a card whose art is missing.

**Card text is fetched, not transcribed.** `tools/fetch-cards.mjs` reads the
official [Daggerheart Card Creator](https://cardcreator.daggerheart.com) and
lands four things in the repo:

| Output | What it is |
| --- | --- |
| `src/packs-src/official-cards.json` | the snapshot, committed so the build never touches the network |
| `src/packs-src/domain-cards.mjs` | generated — the 189 domain cards |
| `src/packs-src/card-printings.mjs` | generated — art, artist and card number for the hand-authored kinds |
| `assets/cards/**.webp` | the header art, plus a `CREDITS.md` naming every artist |

    node tools/fetch-cards.mjs

It is the API and not the book because the API carries **errata** — Splintering
Strike there is the September 2025 wording and the corebook's is not — and
because the appendix has no way to give art, an artist credit, or a printed
card number. It refuses to write unless the result is nine domains with three
cards at level 1 and two at every level after, eighteen ancestries, nine
communities and eighteen subclasses.

Upstream is not clean, and the tool does not pretend otherwise: `TYPOS` in it
is the complete list of what we decline to copy, one entry per defect with the
reason, and the fetch **fails** if an entry stops matching. That is deliberate
— upstream having fixed a typo and upstream having rewritten the card around it
look identical from here, and only one of them is fine.

`heritage.mjs` and `classes.mjs` stay hand-authored, because they hold things
no API publishes: a class's starting Evasion, the background questions, the
split of an ancestry's two features into top and bottom. **`tools/check-cards.mjs`
is what stops them drifting** — it re-derives what every entry should say from
the snapshot and compares meaning, not typesetting.

    node tools/check-cards.mjs

`npm run build:packs` runs it first, so a hand-edit that drifts from the cards
fails the build rather than shipping. It reads the committed snapshot, never
the network, so it is offline and deterministic.

The last thing it checks is not wording. There is no class *card* in the
printed set, so nothing upstream can validate a class description — and it was
the rulebook's chapter opener that got pasted into one, five sentences of lore
on a card whose job is Evasion, Hit Points and two feature runs. A class now
gets **one sentence**: the chapter's opener, verbatim, and nothing after it.
The book writes each class in pairs — an opener saying what it is, then a
sentence elaborating — and two was still a paragraph above the stats. The
check says so if one grows back.

That class card is also the only one in the system with **no artwork**, for the
same reason it has no upstream: nothing published a painting for a page in a
book. So it is the one card whose fallback plate is always the picture, and
`fbsig` is what it draws there — the class mark from `assets/classes/`, not the
first of its two domain sigils. Grace and Codex are already in the corners; a
plate repeating Grace under the word "Grace" is a third copy of a fact the card
stated twice. Subclass takes the same override for the same reason, though it
almost never shows: subclasses do have art.

**The art is Darrington Press's, and the rules text is not.** The DPCGL grants
the text; it does not grant the paintings. `assets/cards/CREDITS.md` says so
and names all 234 of them. It is committed because the cards are drawn with it
— unlike `docs/`, which nothing reads — but if this history goes public, that
folder is the first thing to move into `.gitignore`.

## Why Svelte

The mark animations. A wound lands whole in 160ms and then bleeds for 340ms; a
sheet that rebuilds its markup on every update takes that with it. Svelte's
fine-grained updates keep the DOM, and `Marks.svelte` / `Gems.svelte` push it
further — they render once and drive every later change through the design's
own `setMarks` / `setPool`, which diff the row and animate only what moved.

## Build

`npm run build` compiles `src/` into `dist/module/daggerheart.js`, copies
`system.json`, `lang/`, `styles/` and `assets/` into `dist/`, compiles the
compendium packs into `dist/packs/`, then junctions root `module/` and
`packs/` at `dist/` so Foundry can load this folder in place. `dist/` is the
root of the packaged `system.zip`.

`npm run typecheck` runs `tsc --noEmit` and `svelte-check`.

## `data-pk` is the sheet's one handle

Four things are delegated off the character sheet's root, and all four find
their subject the same way — the nearest ancestor carrying `data-pk`, which
is an item id:

| gesture | what it does |
| --- | --- |
| click | posts the card to chat (`onCardClick`) |
| right-click | the context menu (`onCardMenu` → `ui/menu.js`) |
| hover | the peek layer (`ui/peek.js`) |
| dragstart | hands Foundry `{type:"Item", uuid}` so the item can leave |

So a row gets all four by carrying `data-pk`, and a row that omits it gets
none — which is how the inventory list ended up being the one thing on the
sheet that could not be deleted. Put it on every row that stands for an item,
even one with no card to show: the click and the peek both look their subject
up and quietly do nothing when there is nothing to draw.

The vault's own rows carry `data-swap` as well and are excluded from the
native drag — they already drag on pointer events, and a browser drag
starting underneath takes the gesture away mid-swap.

## Rolling

Every roll on the character sheet goes through **the roll popover**
(`design/prep.js` → `ui/prep.js`), which opens on the click that used to
roll. It is the only surface in this system that is a sentence you are still
composing rather than a record you edit or a result you read, and it exists
because four things a roll can carry had nowhere to be said: advantage and
its sources, a flat modifier, the Experiences you are bringing in, and the
Hope they cost.

The engine never needed changing. `rollDuality` has taken `advantage` as a
signed count of d6 and `mods` as labelled terms since it was written, and
`rollTrait`/`rollAttack` have taken `experiences` on top; nothing had ever
passed them. `prep()` resolves to exactly that object, or `null` on every way
out — and every way out is free.

**The empty state is the common state.** A level-1 character has no
Experiences and nothing granting advantage, and they meet this twice a minute
for an hour. So it is roll-ready the frame it opens, Enter works before you
have touched anything, and it is four lines tall. A popover slower than the
click it replaced would be a regression no capability pays for.

**Experiences now cost Hope, and they always claimed to.** `actions.ts`
stamps every Experience term `spent: true` — that is what draws it in gold,
the currency that paid — and nothing ever called `spendHope`. `payFor` charges
before the dice and refuses the roll if the purse is short, because a payment
that landed on the result would let you read the outcome and then discover you
could not afford the roll that produced it. The GM's side is `payFearFor`, and
Fear is a world setting rather than an actor field, which is why it is spent
in `actions.ts` rather than through a document method.

Difficulty stays out. The engine takes it and the card draws it, but the
player usually does not know it, so it remains the GM's to set and the card
goes on honestly saying there was no target number.

## Chat

**Foundry draws every message twice** — once into the log and once as the
notification that floats over the board — from two separate calls about three
milliseconds apart. Two elements, one message. Anything keyed on the message
id that fires "only the first time" therefore serves one of the two and
silently skips the other, and which one you are looking at is a coin flip.
`dice/chat.ts` allows both and rejects anything later; see `TWIN`.

The plate is **veiled** until it lands: field, ghost word, verdict, claim row
and the critical's whole material are held back while the dice tumble, so the
card does not answer the question it is still asking. It is presentation only
— the result is in the markup from the first frame — and a client that never
runs the arrival never wears the veil. See the veil block at the foot of
`design/plate.css` and `dice/arrival.ts`.

**`play` and `land` are two different claims, and every arrival rule needs
both.** `land` means *settled* and is worn by every re-render of the log;
`play.land` means *this client just watched it land*. Foundry re-renders a
message whenever anything is written to it, so a rule keyed on `land` alone
replays each time. It costs nothing to qualify because every arrival keyframe
ends on the element's natural value, so a re-render is handed the end state
rather than travelling to it.

**Nothing writes to a message while it is arriving, and nothing may.** A
re-render replaces the element, so a write that lands inside the arrival
takes the animation with it. The GM's Fear used to apply itself from the
card on a delay sized to outlast the landing — which worked until Dice So
Nice, whose module holds the whole `<li>` at `display:none` for four or five
seconds while its own dice roll. An element with no box runs no animations,
so the arrival was spent unseen and then destroyed, and what DSN revealed
was a settled, unswept replacement. Fear was the only outcome it happened to,
because it was the only one that wrote to itself.

No delay fixes that, because **when a message is shown is not ours to know**.
So the Fear applies at `createChatMessage` instead — see `applyFear` in
`dice/chat.ts` — which fires once per client for a genuinely new message and
never on a reload, and is gated on `game.users.activeGM` so a second GM at
the table does not gain a second Fear. Anything else that wants to record
something about a roll belongs there too, not on a timer.

## Not done yet

- Compendium content — character creation is covered: classes, subclasses,
  ancestries, communities and the domain decks. Equipment and the adversary
  roster are still to come, as is everything from *Hope and Fear*.
- Character creation, level-up, death moves and scars.
- The Fear HUD (`design/pool.js`) and the GM screen.
