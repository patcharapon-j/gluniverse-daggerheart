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
  - `dice/` — the roll engine, the chat plate, and the Dice So Nice colorsets.
  - `sheets/` — Svelte 5 sheet components.
  - `apps/` — the ApplicationV2 ↔ Svelte bridge, and the three dialogs.
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
does not appear on a browser reload. Restart Foundry. `ledger.css` was the last
one added and needed all three; a chat card that lands unstyled after a change
to `design/` is almost always the third one missing.

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
| `equipment` | 358 documents: 204 weapons, 34 armour, 60 consumables, 60 items |

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
on a card whose job is Evasion, Hit Points and a feature. A class now
gets **one sentence**: the chapter's opener, verbatim, and nothing after it.
The book writes each class in pairs — an opener saying what it is, then a
sentence elaborating — and two was still a paragraph above the stats. The
check says so if one grows back.

It also checks that **every class feature has a name of its own**, and that is
the one thing an audit against the SRD actually turned up. Every class's
Evasion, Hit Points, domain pair and Hope feature is correct and always was;
what was wrong was a shape. Five of the nine print more than one class feature
— the Rogue is Cloaked *and* Sneak Attack, the Sorcerer has three — and
`classFeature` held one, so those five were joined into a single block named
"Class Features", which is the book's own section heading. That was an honest
compromise while the class was drawn as a card, because a card shows one
feature run and the heading is what sits above it. It stopped being honest the
moment the class became a list: those five had a row called "Class Features"
carrying two or three unrelated rules concatenated, which is precisely what
the Features panel exists to prevent, and it fed the price parser an opening
clause belonging to whichever feature happened to be first. The field is
`classFeatures` and plural now, and the check fails on a feature named after
the heading rather than after itself.

The card draws neither of them. Flavour is off every class and subclass card —
`system.description` still holds the sentence, the check still polices it, the
card is simply not where it gets read.

**And the class is not a card on the sheet at all any more.** Class and
subclass used to be two spines in a "Class" panel, and a spine is a promise:
it says there is a card behind this, hover to read it. That promise is right
for a domain card, which genuinely *is* a card — you hold five, you swap them,
the object is the unit you manipulate. A class is none of those things. You
cannot spend it, move it or lose it; the only question anyone ever asks of it
is what its feature says, and that was two gestures away and answered at card
scale, which is 300px of frame and artwork wrapped around one paragraph you
own permanently.

So the panel is **Features** and it lists rules rather than objects: every
class feature, and standalone `feature` Items — which had no card at all and
were therefore invisible, a subtype the "+ new" menu offered and nothing ever
drew again. Each is a pressable row with its rule printed on it. See `.abl` in
`design/sheet.css` for the argument and `featureCard` in `sheets/cards.ts` for
the card it posts.

**The subclass is still a card, though, and that argument does not reach it.**
A class is not an object — you cannot spend it, move it or lose it — but a
subclass genuinely is three printed cards, acquired one at a time by spending
an advancement, and which of Foundation / Specialization / Mastery you are
holding is a fact the card states and a list of features does not.

So the panel is two columns — **the rules on the left, the cards on the
right** — rather than a row of spines above a list, and the two columns hold
two different *kinds* of thing rather than two views of one. Subclass features
are **not** in the list. They were at first, on the reasoning that a rule you
have to reveal is a rule you will not read, and that is true of a class; it is
not true of a card you are holding. What it produced was the sheet answering
one question twice — a row headed "Foundation · Beastbound" printing the rule
the Beastbound tile six inches to its right exists to carry. The tile is the
printed object and it keeps its own rules: hover peeks it, click posts it,
exactly as a domain card in the loadout behaves and for the same reason.

One to three cards is what makes a narrow right-hand column fit, and they are
`TILE`s rather than `SPINE`s because a subclass has no level and no Recall
Cost, so two of a spine's five cells are dead, while it *does* carry a
Spellcast trait that appears nowhere else on the sheet and that a spine has no
cell for. The tile's data strip was built generic for exactly that. `text: ""`
suppresses the body paragraph, and its reason is size rather than duplication
now: the tile is a 68px strip, what fits is a clause and a half, and half a
rule reads as a whole one. Truncating a rule is worse than not printing it.
The column is a grid rather than flex: three tiles wrapped into two flex rows
leave the third alone, and `flex-grow` then stretches it to double its
neighbours' width.

**A row that costs something pays for it.** The Hope action has charged for
itself since it moved to the rail and it was the only one; every other feature
that opens "Spend a Hope" or "Mark a Stress" printed the price and left the
paying to you, which is the half that gets forgotten. `featurePrice` in
`cards.ts` reads it and `useAbility` charges before posting, and the refusal is
the track that cannot pay flinching rather than a dialog.

That is a parse of English rules text, which this system refuses to do
everywhere else, so it is bounded hard: **only the opening clause counts.**
Daggerheart states a price the way an invoice does — first thing, imperative
— and anything later in the paragraph is describing what the feature *does*.
Ranger's Focus is the case that proves it: "Spend a Hope and make an attack…
When you deal damage to them, they must mark a Stress." The first is your
price and the second is the target's, and a regex over the whole paragraph
charges you for both. Anchoring at the start and stopping at the first
sentence is what tells them apart. A `feature` Item's authored `stressCost`
always wins over the prose.

The one fact the class card carried that had nowhere else to go is the two
domains, so they are two coloured diamonds above the list — and there may be
more than two, because multiclassing hands you another. `system.domainList` is
every domain across every class; `domains.primary`/`secondary` stay the first
class's, because that pair feeds a card's two corners and a card has two
corners. A subclass card resolves its own class *by name* rather than reading
either, which is what stops a multiclassed character's second subclass wearing
the first class's colours.

The Hope feature moved to the rail for the same reason a level earlier: it is
the one thing on this sheet that is a *move* rather than a record, it costs
three Hope, and the only moment it matters is the moment you are deciding
whether to spend them — against a number that has to be on screen at the same
time. It is a row under the Hope gems, where the printed sheet puts it.
Pressing it spends the Hope and posts the action as its own card; `hopeCost`
reads the price out of the rule's own "Spend N Hope" rather than assuming the
usual three.

The class card still exists — the right-click menu's "Show to chat" posts it,
because the menu acts on the *document* and the row acts on the *feature*, and
those are honestly two different objects.

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

## The equipment tables

`src/packs-src/equipment-tables.mjs` and `loot-tables.mjs` are chapter 2, typed
in. They are the one body of content here with **no upstream at all** — the
official Card Creator publishes cards, and a longsword is not a card — so
`fetch-cards.mjs` cannot reach them and `check-cards.mjs` has nothing to compare
them against.

`equipment.mjs` is therefore **not generated**, which is a deliberate departure
from `domain-cards.mjs` rather than an inconsistency. A generated file exists
because something upstream writes it, and it is then a second copy of the same
facts that the build has to keep checking. Nothing writes these, so the pack
derives its documents from the tables at import time: one copy, nothing to
drift, and the check tool is free to spend its attention on the question that
actually matters.

That question is **did a line get lost on the way in**, and
`tools/check-equipment.mjs` answers it by asserting the book's own regularities:
every tier reprints the same fifteen physical primaries, ten magic primaries,
seven secondaries and four armours under an Improved / Advanced / Legendary
prefix; every secondary is One-Handed; both d12 tables run 1–60 with no gaps or
repeats; every trait, range, burden and die is a value the closed sets contain.
The staples are **named, not counted** — a count catches a deleted row, and the
failure that actually happens when you copy a table by hand is transcribing one
row twice and its neighbour not at all, where the count is right and the table
is wrong.

It also asserts the handful of facts **character creation depends on**, so a
change to the tables cannot quietly empty a step of the flow: a tier-1
two-handed weapon exists, so does a one-handed one and a secondary and an
armour, and the two starting potions are still at rolls 7 and 8 *and* still
called what the window goes looking for. `npm run build:packs` runs it first.

Recurring features are constants. *Reliable: +1 to attack rolls* is printed
identically on eleven weapons across four tiers, and eleven copies of a string
is eleven chances to typo the eighth one invisibly. What is deduplicated is
identical printed text and never a meaning — `PAINFUL_W` and `PAINFUL_A` share a
name on the page and are two different sentences, so they stay two constants.

**A feature's numbers ride on the feature, not in its prose.** *Heavy* is −1
Evasion and *Barrier* is +N Armor Score; both are carried as `ev` and `as`
rather than read out of the sentence. This system parses English rules text in
exactly one place, narrowly and on purpose (`featurePrice`), and a table we are
typing in ourselves is the last place that would be needed.

Which closed a real gap. `WeaponData` gained **`armorScoreModifier`**, because a
Round Shield is *Protective: +1 to Armor Score* and there was nowhere for that
to go — `CharacterData` read Armor Score off the equipped **armor** alone, so a
Tower Shield charged you its −1 Evasion and silently withheld the +2 it was
charging for. Score and Slots had already split for exactly this reason, and
this was the other end of the same argument, missing. Both modifiers are now
summed over the same list of worn gear. Slots stay the armour's: "Armor Score is
how many slots you have" is shorthand, not the rule.

**There is no art, and that is a finding rather than a shortcut.** Demiplane
serves every equipment image from a signed CDN — the URLs carry query strings
tied to a logged-in subscription session — so nothing a committed tool could
fetch would still resolve tomorrow, and the build not touching the network is
the whole point of the snapshot. Every weapon, armour and consumable draws the
design's own type glyph from `assets/types/`, which `sheets/cards.ts` already
counts as "not artwork", so they fall through to the builders' fallback plate
exactly as a card with no domain does. Uniform by construction: a picture on
nine of them and a glyph on three hundred and fifty reads as broken. `img` is
per document, so stable art drops in later with nothing else changing.

The arcane-frame wheelchair is the one weapon in the book that names **no
trait** — it uses whatever your subclass casts with. The schema stores a trait
as one of the six, so the row carries a plausible one, the weapon's own
`description` carries the truth, and `takeWeapon` rewrites the field to the
character's Spellcast trait at the moment of granting, which is the first moment
the answer exists. Not a seventh trait: "Spellcast" is a pointer to one of the
six, and adding it to `TRAITS` would reach the roll engine, the sheet's six
plates and every closed-set check in the system to serve one item.

## Making a character

A button on the sheet's rail opens a window that walks the book's creation
steps, writes every choice to the sheet as it is made, and can be reopened
forever to change any of it. `design/make.css` is its look, `design/make.html`
the study page, `apps/creation.ts` the engine and `apps/CreationWindow.svelte`
the window. `apps/create.ts` is the application shell.

**It is not a dialog**, and `dlg.css` is why. A dialog is allowed here for
exactly one shape — *a decision with more than one part, taken once, that
changes the sheet underneath it* — and creation breaks that on the word **once**.
You come back to it after session one, when Finesse turns out to be the wrong
place for the +2, when the party needs a healer. A box that asks is the wrong
object for something you will reopen in three weeks and change one thing in. So
it is a place you go, and closing it is leaving rather than cancelling.

**Progress is derived.** A class Item means step 1 happened; an ancestry and a
community mean step 2; two Experiences mean step 7. Nothing stores a cursor, so
nothing can be stale — delete your class from the gear tab and the window says
so on the next open, because it was never holding a second opinion. It is the
advancement marks' argument transplanted: *the marks are the record, and the two
can never disagree because there is only one of them.* "Continue where you left
off" is then not a feature — it is `steps.find(s => !s.done)`, computed on open.

Exactly two things are written, because exactly two cannot be re-derived.

- **`finished`**, because *done is a decision, not a fact*. A player whose GM
  said "no armour, you're a monk" satisfies no armour check and must still be
  able to say they have finished. And the derivation *rots as the character
  advances* — at level 2 you gain a third Experience, at level 5 your traits no
  longer match the starting spread — so a level-6 character with nothing stored
  would be told their sheet is wrong. It is **inferred** on first open for
  characters that predate all of this (`inferFinished`), deliberately
  generously: the cost of guessing wrong that way is a button press, and the
  cost of guessing wrong the other way is telling somebody their finished
  character is unfinished.
- **`granted`**, the ids of documents this flow created. Changing your mind
  about class has to remove the subclass card that class gave you and the domain
  cards that are no longer legal, and it must not touch the longsword you looted
  in session three. Nothing else on an Item records provenance.

**The rail carries the steps *and* the character**, and that is the whole layout
argument rather than a space saving. Choose Guardian and Evasion and Hit Points
land under your cursor — the step you are on and the number it moves are inches
apart in one column. Put the steps in a tab strip along the top and that
relationship is gone, and with it the reason any of this is live.

**Steps are not tabs.** A tab is one view of a thing that is already whole; main,
vault and gear are the same character seen three ways. A step is a stage of
something being made: it has a state a tab never has, and it can be
*unsatisfied*, which is not a thing a tab can be. Dressing them alike would
promise they behave alike.

**The book's step 4 is not a page.** "Record Additional Character Information" is
Evasion off your class, Hit Points off your class, Stress 6, Hope 2, thresholds
off your armour, Proficiency 1 — every one a consequence of a step you already
took. It is the rail, filling in as you choose. A page restating it would be the
window telling you something it should have been showing you the whole time. The
step numerals are the **book's**, which is why they read 1, 2, 2, 3, 5, 7, 8: a
player with the rulebook open should not have to translate, and the gaps are
honest about what this does not do — 6 and 9 are prose and belong on the bio tab.

**Two of them read 2, and that is the numeral being a pointer rather than a
count.** The book's step 2 is "Choose Your Heritage" and asks for an ancestry
*and* a community; this window asks for them on two stages, because one stage
meant the community deck began below eighteen ancestry cards and nobody
scrolled to it, and because the mixed-ancestry switch sat above a grid it does
not govern — ancestry has that option and a two-press flow, community is a flat
pick-one. Both stages are genuinely the book's step 2, so both say 2.

**The rail's numbers land, and only the ones that moved.** `setVals` in
`make.js` is `setMarks`'s job for the same reason: re-rendering the block would
replace every element, so choosing a community would flash Evasion, Hit Points,
Stress, Hope, both thresholds and Proficiency, of which none had anything to do
with it. The animation means "this is what that choice did", and it only means
that if it fires on the ones that did. The text is written *before* the class is
added, so a client that never runs the animation is handed the settled number.

**An unset value is an em dash, not a zero.** Zero is a number a rule produced;
the dash is the absence of the rule. A rail reading "Evasion 0" before a class
exists is asserting something false about a number you are three seconds from
setting. Same argument as the adversary's `thresholds.none`.

**Constrain the offer, do not validate the answer** — `pickTwo`'s rule. Illegal
options stay on screen and say why on themselves, which is `dlg.css`'s
dead-not-hidden doing more work than it does there: filtering the Blade cards
out of a Wizard's deck leaves a deck that *looks complete*, and the player never
learns the rule exists. One **GM-only** `unrestricted` switch lifts every
constraint at once, gated on `isGM` for the adjust tab's reason — a player who
can set a number directly is a player who never has to be told no.

**A step offers one of two shapes, and which one is a claim about the thing.**

**The class is a row, full width, one per line.** As a tile in a two-track grid
it was 268px holding two domains, a name, two numbers and a sentence, all
competing for the same column — which is a fair description of what a class is
*not*. It is the largest single decision in this window; it fixes your domains,
your Evasion, your Hit Points and half your card pool, and you make it once.
Nine of those deserve a page each. So the row splits by *kind*: the class mark
on a plate tinted by its domain pair on the left — the only picture a class has
anywhere in this system — and everything written on the right. Both domains are
shown as coloured sigils rather than a text-only label, and every class and Hope
ability is printed directly in the row. A class has no hover card: the row is
the decision surface and already carries the complete answer.

**Identity is a header, not a column, and a long rule is what taught us that.**
The right-hand side was two side-by-side columns, identity and rules, which is
the shape you draw when the halves are about the same size. They are not, by an
order of magnitude: identity is five short facts that never grow, and a class
feature runs from three lines to fifteen — the Druid's Beastform is a
paragraph. So the row stood as tall as Beastform and a 226px column beside it
held a name and two numbers above six hundred pixels of nothing, while the
rules read at 10.35px in a 350px column. Identity is one line across the top
now — name, domains, and the two numbers pushed right so they land in the same
place on all nine rows, which is what makes them comparable — and the rules
take the full width underneath. The Druid row went from about 700px to 191px at
the width the window actually has.

**The rules balance rather than tile.** They are a `columns` block, not a
two-track grid. A grid puts one plate per cell and stretches the short one to
the tall one's height — Make a Scene, four lines, drawn as a box the height of
Rally's ten — and a class with three features wrapped the third to a second row
and left a hole the size of a plate. `columns` fills to an even height and
stretches nothing; `break-inside:avoid` keeps each plate whole.

**And `--c` belongs on the row.** It was set inline on the mark plate alone, so
every rule plate's `color-mix(in srgb,var(--c) 5%,…)` resolved against nothing.
An invalid `color-mix` invalidates the whole declaration, so those plates had no
tint, no domain bar and **no border**, since the border rode in the same
`box-shadow`. Class features were bare paragraphs beside Hope abilities that
drew correctly — the Hope variant states `--hope`, which exists — so it read as
a deliberate contrast rather than as two dead declarations. `tools/verify/` now
asserts a rule plate resolves its hue, which is the shape of failure that page
is for.

**There is no flavour on it.** The row carried the book's opening paragraph for
a while, in the widest column on the page, and that was the wrong thing to give
it: this is a choice between nine sets of *rules*, and a paragraph of lore above
two numbers and four abilities is the row answering a question nobody is asking
at this moment. Every word in the row is now something the class does.

`ClassData.flavor` still exists and `tools/check-cards.mjs` still polices it —
it must open with the card's own sentence, so the two are one fact stated at two
lengths and a `flavor` pasted against the wrong class fails the build. Nothing
draws it today. The field is content rather than markup and the check is what
keeps it true, so it survives the surface that used to print it.

**The chosen class opens downward into its own subclass drawer.** The two
subclasses were a grid of their own below the list, under a heading naming the
class they belonged to — a caption doing a job adjacency does better, with the
answer to "which class is this for" three inches and one heading away from the
class. Nine rows collapsed to one open one is also the shape of the decision:
you have chosen, and this is what that choice now asks. The gold brackets sit on
the panel, so they wrap the row *and* the drawer: one object, extended.

Two consequences. **`.fcls` is a container and `.fclsr` is the press**, because
a subclass card is a `<button>` and a button inside a button is not markup a
browser will keep — and the panel no longer lifts on hover while it is open, for
the reason the rest dialog's squares do not reflow: a surface you are reaching
into must not move under the pointer. And **`previewClass` is gone.** It existed
only to say which class the separate grid was a grid *for* before that class was
taken; the drawer is inside the panel, so the answer is adjacency rather than
state.

**The class step peeks nothing now.** A subclass card used to carry `data-pk`
and hover-peek at full size, which was right when the thing you hovered was a
176px grid cell. It is drawn at card size inside the panel, so the peek would be
the same picture twice. The `.fdet` panel under the step went with it for the
same reason: it reprinted every class feature and every subclass feature as
text, and both are already on screen — the features in the row's own rule
plates, the subclass on the card.

**Subclass, ancestry, community and domain cards draw the printed card.** Those
steps choose things that genuinely exist on paper, and a text summary of one lies by
omission about the two facts a card carries structurally rather than in prose:
the domain, which is the hue and the two corner sigils, and the level and Recall
Cost, which are the corner blocks. A domain card's whole identity is "Grace,
level 1, Recall 0" and the tile printed none of it in a form you could compare
across twenty of them at a glance. It also printed the rules text **raw** —
`***Power Push:***` and literal `<br>` — because `rich()` lives inside `CARD()`
and a bare `<p>` never called it. `.card` is container-query driven, so the
component that draws a 300px chat plate draws a 176px grid cell unchanged, and
the grid card uses the shared card's independent `fit()` pass; the builder does
not normalize image plates or type across the grid, so its cards follow the same
scaling rules as sheet peeks and chat. Equipment draws neither: a longsword is
not a card, there is no artwork to draw, and it is a **table** — see below.

**The equipment step is a table, and it is the only one.** Every other step
offers something you can hold a picture of, and a grid is right for those
because the thing you are comparing is the whole object. Equipment is not that.
A longsword is one line of chapter 2, and what you compare across thirty-five of
them is five columns of the *same five facts* — trait, range, damage, burden,
feature. A tile states each fact in a different place on every tile, so
comparing two weapons' damage means finding the damage twice; a column is read
down. It is also the only list here that runs long enough for it to matter: nine
classes fit on a page and eighteen ancestries are pictures, while `unrestricted`
turns this step into two hundred and four primaries.

**The groups are the book's own tables.** Chapter 2 prints primaries as two
tables per tier — Physical and Magic — and that split is a rule rather than a
caption: a magic weapon rolls with your Spellcast trait, which a character
without a spellcasting subclass does not have. Secondaries and armour are one
table each and get no caption, because inventing one would claim a division the
book does not make. The tier joins the caption only when more than one tier is
on screen, which only ever happens under the GM's switch — at level 1 there is
one tier and saying so above every group is the window answering a question
nobody asked.

**The row carries no `data-pk`, so nothing hovers.** `subgrid` is what lines the
columns up *across* groups — one grid per group and Physical and Magic each
solve their own widths, which is two tables of the same facts aligned
differently, precisely what a table exists to prevent. See the equipment table
block in `design/make.css`.

**Nothing in this window peeks, and the layer is gone rather than empty.** The
four card steps carry no `data-pk`, which is the class step's argument reaching
the rest of the window: the printed card is on screen, and a hover card over a
card is the same picture twice. A `creationPeek` setting restored them for a
while, on the reasoning that the argument turns on *size* — a 176px card is one
you can identify and not always one you can read — and it is gone, because a
peek is a way of asking *what is this* and these grids have already answered.
The right answer to a card too small to read is a wider window.

Equipment was the last step holding one, and its argument was about the **tile**:
a longsword is not a card, the tile stated five facts in five different places
and left you asking what the object was, and the peek was the only place the
whole thing existed. The table answers that in columns, which is what a table
is — so the peek became a picture interrupting the comparison the table was
built to let you make, and a picture of a weapon is a type glyph and a paragraph
the row already prints. It went with the tile.

So `CreationWindow.svelte` renders no `.peeklayer` at all, `peeks()` is not
wired, and `.forge .peeklayer .pkc{width:393px}` is deleted rather than left
unused — a layer rendering nothing is machinery that reads as a feature, and the
`closePeeks()` calls on every step change would have been closing peeks
belonging to somebody's open *character sheet*. The sheet's own peek is
untouched; this is a claim about one window. `tools/verify/` inverted its check
to match: a card inside a `.forge` must now measure exactly what it measures
anywhere else, which is where a resurrected copy of that rule would surface.

**Changing class cascades, and names every document first.** "3 items will be
removed" is a sentence nobody can consent to, which is why `cascadeOf` returns
documents rather than ids. It takes the class, every subclass card, and domain
cards whose domain the new class does not have — and **only the ones this flow
granted**. A card dragged off the compendium by hand stays even when it becomes
illegal, because removing it would be this window deleting somebody's document
over a rule it was not asked to police. Multiclassing is respected: the other
class's domains are added to the keep set, so a second class's cards survive.

**Changing subclass is not a small class change**, and routing it through
`takeClass` was wrong. That destroyed and rebuilt the class Item to swap the
card beside it, so its id moved and a chat card posted a minute earlier pointed
at a document that no longer existed. `takeSubclass` is its own call.

**Mixed ancestry** lands as *one* Item wearing the first ancestry's name and the
second's bottom feature, with `mixedFrom` recording where it came from — the
field has been in the schema since the beginning and nothing had ever written
it. One Item rather than two, because the character has one ancestry: two would
put two cards on the heritage row and hand the sheet four features to draw where
the rules give two.

**The trait spread is the one bespoke control**, and the one step where the
constraint *is* the point. `+2, +1, +1, 0, 0, −1` is a fixed budget rather than
six independent numbers, and six spinners would let you type +2 six times and
then be told off — the failure `pickTwo` exists to prevent. So it is six chips
you spend: overspending is not something the control refuses, it is something it
cannot express. Chips are keyed **positionally**, because two of them read +1 and
"the +1 chip" is not a thing that exists. A spent chip keeps its slot as a hole,
since the budget's *shape* is the information and a row that reflows on every
placement moves the chip you were about to click. Deliberately **not**
pre-placed: `prep.js` opens roll-ready and is right to, because you meet it
twice a minute; this is met once and its answer is permanent, and a default on a
permanent choice is a default that gets accepted.

**And it can be dragged, which it always claimed it could.** The tray said
`cursor:grab` and the whole control was designed around a budget you *spend*,
and dragging a chip did nothing whatever — it was click-to-arm, click-to-place
and no more. Both gestures commit through `placeChip` now, which is `swap.js`'s
rule about a surface that is both dragged and pressed: one call, one result,
nothing to learn twice. What the drag adds that a click cannot express is the
two moves with no press — pulling a value out of a trait back to the tray, and
moving one straight from one trait to another. A click can say "put this here"
and "take this off"; it cannot say "move this there", because the intermediate
state has nowhere to live. The payload is the chip *index* and not its value,
for the reason the tray is keyed positionally.

**The step's real bug was that placing a chip cleared the tray.** `readPlacement`
re-derives the six chips from the six numbers and is deliberately
all-six-or-nothing, because a trait sitting at 0 is genuinely ambiguous between
"the 0 chip is here" and "nothing is here" — and it was being run on **every**
revision of the actor. So placing one chip wrote six numbers, the write bumped
the revision, the re-read reconstructed three slots, gave up, and emptied the
control. The number landed on the character and the tray sprang back. It looked
like the click not registering, and later like the drag not working.

The all-or-nothing rule is right and stays. What was wrong was running it
against our own writes at all, so the six values are now compared with what
`placed` *implies* they should be: equal means the change was ours and the
local state is the better record; unequal means something else moved a trait —
the adjust tab, a macro — and re-deriving is the only honest answer. A
`lastRead` signature stops the unequal case retrying forever on a spread that
cannot be reconstructed at all, which is what a hand-set +2 and five zeros is.

**Hope is set to 2, once.** "You start with 2 Hope" is step 4, the pool's schema
default is zero, and nothing in this system had ever put the opening two in — a
character built by hand has been starting empty-handed since the sheet was
written. Guarded on the current value rather than on a first-time flag, so a
player who changes class in session four is not handed two Hope for it.

**Creation is a level-1 flow.** Above level 1 the same window opens in
review-and-edit: the steps say what you have, constraints relax to your actual
level, and it never tries to hand out advancement — that is the advancement
tab's job and it already asks the right questions. A table starting at level 5
does creation at 1 and then spends four levels there.

**Finishing posts a card**, because this system posts what happened and a
character arriving at the table is at least as much of an event as a short rest.
The review page is unnumbered — it is not a step, it is the character — and it
is the one screen that shows the full rules text of everything you took, which
nothing before it does.

**The window is not a document sheet**, so Foundry does not re-render it when the
actor changes; that courtesy goes to registered sheets. It is asked, via hooks on
`updateActor` *and* `createItem`/`updateItem`/`deleteItem` — almost everything
creation does is an embedded document arriving or leaving, and `updateActor`
never fires for those. One window per actor, tracked by id: two windows writing
to one actor is two rails disagreeing about which value just landed.

**The plate on the sheet takes height rather than overlaying**, which is edit
mode's rule and the same reasoning — a hint that lasts a second may float over
the sheet, a state that lasts a session may not. It never disappears when
creation is finished, only goes quiet: a control that vanishes the moment you
complete something is a control you will hunt for in three weeks when you want
to swap one domain card.

Every class name in `make.css` is `f`-prefixed (`.fopt`, `.fstep`, `.fval`,
`.ftrt`) and the block root is `.forge`. That is not decoration — `.pick` and
`.picks` already belong to `dlg.css`, both load into the same `.dh` root where
scoping does nothing, and this would have been the fourth instance of the bug
that renamed `.die.win` and `.dfn .crest`. `tools/verify/` now loads `make.css`
beside `sheet.css`, `card.css`, `tile.css` and `dlg.css` — the stack a real
Foundry window has and a study page never does — and asserts the two do not
reach into each other.

## What a study page cannot see

**Every control in the creation window is a `<button>`, and Foundry sizes every
button to one centred line 28px tall.** `--button-height` lives in the
`elements` layer, and nothing in this window is a button in the sense that rule
means — a class row, a step, a trait slot, a weapon and a domain card are all
*things you press*, and a thing is as tall as what is printed on it.

Left unreset it clipped the entire window. Every option lost everything below
its first line, the sheet's own entry plate lost its label, and the two-column
review cells centred their headings. It read as a broken grid rather than as an
inherited height: the tiles were the right width, in the right places, with
their contents sheared off. It is reset once at the root of `make.css` rather
than re-declared on nine controls, because the claim is about the window; the
two that genuinely *are* buttons — the tray chip and the footer's back/next —
state their own metrics and win on source order.

**And the reset reaches one step further than it looks like it can.** It sets
`justify-content:flex-start` for the column controls, and the tray chip is a
`display:grid` with no declared columns — so its single implicit track is `auto`,
and an `auto` track only stretches to fill its container while `justify-content`
is `normal`. `place-items:center` says nothing whatever about *content*, so the
track collapsed to the width of the numeral, sat against the left edge, and
`justify-items` then centred the numeral inside a track it exactly filled. The
chip was the right size, in the right place, with its number 8px from the left
edge and 14.3 from the right — about a quarter of the numeral's own width off
centre, which is small enough to read as a rendering artefact and large enough
to see, on the one control in this window whose entire job is to be a number you
aim at. Foundry's own `padding:0 8px` was hiding most of it. `place-content` is
the other half of `place-items` and both are now stated; `tools/verify/` measures
the ink's clearance on each side rather than trusting the declaration.

The general lesson is the one this repo keeps relearning from a new direction:
`design/` is authored as whole documents and a Foundry system owns a subtree of
somebody else's, so **the environment is part of the component and the study
page has to carry it**. `design/make.html` and `tools/verify/` now both declare
`@layer elements { button{height:28px…} }` themselves. Our stylesheets arrive
unlayered through their `<link>`s and unlayered always beats layered, which is
exactly the relationship the `system` layer has to `elements` in the real
application. Delete the reset and both pages go red in the same places the game
did.

**And the same layer draws the checkbox**, which is the first time this lesson
has landed on a control the design deliberately left to the browser. `.pick` —
the picker row, shared by creation's two-from-a-list and the domain-card list —
asked for a native checkbox tinted with `accent-color`, which is exactly right
on a page that owns itself. Foundry's `elements` layer takes every checkbox and
radio to `appearance:none` and rebuilds it out of two Font Awesome glyphs, so
`accent-color` had nothing left to tint and the row inherited three faults at
once. It came in as one report — *tapping add is fine, then you click and
suddenly there is a radio button and the height expanded* — and it is three:

- **A 20px control** where the design drew eleven, because the glyph's own
  `--checkbox-size` is what sizes it.
- **An invisible one until it is chosen.** Unchecked, the mark is
  `--checkbox-background-color`, Foundry's theme grey, which is within a shade
  of `--sunk` — so it is not there, and then it is *orange*, a hue this system
  reserves for nothing. It does not read as a control changing state. It reads
  as a control appearing.
- **A row that changes height when you press it.** The glyph that is *in flow*
  swaps from the `::before` to the `::after` as the box is checked, in a
  different Font Awesome face, and two faces do not put their baseline in the
  same place. `.pick` aligns on baselines, so the row grew 40px → 49px on the
  click that chose it — which is a list that jumps under the pointer that is
  still on it.

So the tick is **drawn** now, once, at the head of `sheet.css`, because three of
our surfaces carry one and the port scopes the lot to `.dh`: the pseudo-elements
go, the metrics are stated, and the mark is the family's rhombus filled with
Hope. Two sites keep what is theirs and nothing else — `.pick input` sets only
`align-self`, since a mark is not type and bottom-aligning an 11px rhombus to a
12.5px baseline hangs it off the line, and the creation footer's is violet on
chrome tokens rather than gold on paper. `accent-color` is gone from all three
places that carried it, the third being an inline style on the mixed-ancestry
switch.

The study pages are the mirror image of the button case and need the opposite
patch: they load `design/sheet.css` unported, so a bare element rule reaches the
studio's own toggles. `.tg input[type=checkbox]` in the trimmed chrome at the
foot of `tokens.css` hands those back to the browser — the studio is not the
system — and the port never sees it.

`tools/verify/` carries Foundry's checkbox rules beside its `button{height:28px}`
and asserts all three outcomes: the tick measures the 11px it declares, its two
states are the same box, and the chosen one resolves `--hope`. Strip the rules
and it reports 20×21, 40 against 49, and two transparent marks.

**An unbalanced CSS comment is the quietest failure this pipeline has**, and it
cost an hour of this. CSS recovers from one by discarding tokens up to the next
`}`, so the rule *after* the mistake vanishes and everything else keeps
working. A paragraph was pasted after a block that had already closed, the
button reset below it stopped existing, and the symptom was the window looking
exactly as broken as before while the file plainly contained the fix. Nothing
here looks at CSS syntax — not `tsc`, not `svelte-check`, not the build — so
`port-design-css.mjs` counts the delimiters and refuses to port an unbalanced
file. It is not a parser and is not trying to be; it catches the mistake that
actually happens when these files are edited by hand.

**And the sheet's own buttons were never checked against that layer**, which is
the same lesson arriving somewhere the reset had never been looked for. Three
presses on the character sheet are *type* rather than controls — a panel
heading's "+ new" and "+ card", the empty state's inline way out, and a slot
header's "unequip" — and each inherits a 7.5–9px mono line. Each is a `<button>`,
so Foundry drew all three 28px tall: on a 9px heading that is a nineteen-pixel
hole under a correctly-sized label, which reads as a spacing choice rather than
as an inherited height. Two of them had shipped that way for as long as the sheet
has had them, and were found only by measuring the third. All four now state
`height/min-height/max-height`, and `tools/verify/`'s **THE PANEL** stage asserts
it: strip the reset and the heading goes 9px → 28px in front of the check.

**A backtick inside markup closes the template literal it is in**, and that cost
the study page its tab strip. Every builder in `design/sheet.js` is a template
literal, so an HTML comment naming a class the way the rest of this repo names
one — in code quotes — ends the string, and what follows becomes a *tagged
template call* on whatever expression preceded it. It parses cleanly, throws at
render, and the console said nothing: the sheet simply stopped halfway through
its own body. The rule is that comments inside these builders use plain words.

For a long time nothing here could catch it, on the reasoning that it is valid
JavaScript — which is true of that instance and not of the general case. The
same mistake in the chit row's comment inside `CARD` was a plain syntax error
that took `card.js` down and every module importing it with it, and `node
--check` sees both shapes. `port-design-js.mjs` runs it over each module and
refuses to port one that does not parse, which is what the CSS port already
does by counting comment delimiters.

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

## Releasing

`.github/workflows/release.yml` is **manual only** — a release moves a number
every installed copy is watching, so it is a decision rather than a consequence
of a push. Run it from the Actions tab, pick `hotfix`, `minor` or `major`, and
it typechecks, bumps, builds, tags and publishes.

Two URLs in `system.json` do the installing, and they are not the same kind of
thing. **`manifest` points at `releases/latest/download/system.json` and never
changes** — that is what somebody pastes into Foundry's *Install System* box,
and what an installed copy re-fetches to ask whether there is a newer version.
`download` names a **specific tag** and is rewritten on every release. So the
loose `system.json` has to be a release asset in its own right: the one inside
the zip is what a user has after installing, and the one beside it is what the
world reads to decide whether to install at all.

    https://github.com/patcharapon-j/gluniverse-daggerheart/releases/latest/download/system.json

The bump therefore happens **before** the build, not after: `vite build` copies
`system.json` into `dist/`, and that copy is the manifest inside the zip. A
version written afterwards would ship a system claiming to be the version it
replaced. `scripts/bump-version.mjs` writes the three files that carry the
number — `system.json` first, since it is the one Foundry reads and the other
two are brought into line — and prints it for the workflow to tag with.

The typecheck runs **before** the bump so a failure spends no version number,
and `npm run build:packs` brings the two content checks with it, both of which
read the committed snapshot rather than the network. The zip is made from
inside `dist/` so `system.json` sits at the archive root, which is where
Foundry looks.

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

The swap tab's rows carry `data-swap` as well and are excluded from that
stamping loop — not because they cannot drag, but because they drag
*differently*: they set `draggable` in their own markup and carry four
handlers of their own, for the reorder. `onDragStart` is delegated on the
window root, so it still runs for them and still writes the Foundry payload,
and a vault card can leave for another character exactly like any other row.
`swaps()` — the design system's pointer drag — remains vendored and unbound;
wiring it would mean an api adapter whose `click` double-fires against the
Svelte handlers already on those rows.

**`data-fk` is the other key, and it is a different job.** It carries the same
item id and exists so `swap.js` can FLIP: `capture()` measures every `[data-fk]`
before the write and `flip()` plays the difference backwards after it. Two
attributes rather than one because the gesture key and the animation key have
different lifetimes — a gear slot's `data-fk` sits on the tile's own wrapper
while `data-pk` sits where the gesture wants it. See "moving a card" below.

The other direction is one handler on the sheet root — `handleActorDrop` in
`apps/svelte-sheets.ts` — and it is deliberately type-agnostic: every subtype
a character can hold lands the same way, and inventing four sub-targets to
*look* precise would promise a distinction the code does not make. What it
does add is a **domain card landing in the loadout** when there is room, since
dragging a card in is the gesture for "I am taking this" and the vault would
make that two gestures and a Stress payment. It also names what landed, because
the commonest drop puts a weapon on a tab you are not looking at.

While a drag is over the window the root wears `.dropping` — one gold edge, no
reflow. The depth is *counted* rather than flagged: `dragenter`/`dragleave`
fire for every element crossed, so a boolean strobes the whole way across a
sheet. Our own rows are excluded via `selfDrag`, because a card dropped back
where it came from is a no-op.

## Moving a card

A card going from the loadout to the vault, or back, **travels**. The wipe
with its lit leading edge, the corner brackets and the saturation ramp have
all been in `design/swap.js` since the vault was designed — and
`CharacterSheet.svelte` had never imported the module, so on the real sheet a
swap was a teleport for as long as the vault has existed. That is worth
remembering as a class of bug: a component can be finished, studied and
documented in `design/` and still not be *wired*, and the study page cannot
tell you which.

A Svelte sheet has no line you can put `capture()` in front of and `flip()`
behind — the press writes to the document and the DOM changes back whenever
Foundry says so. So `travels()` captures rects synchronously at the press, and
a `$effect` reading the four lists plays them; that effect runs on the paint
that actually moved the card, after the patch and before paint, which is the
window a FLIP needs. The pending capture is a plain `let` and not `$state`, or
writing it re-enters the effect.

Two things keep it safe under interruption, and both are load-bearing:

- **`capture()` cancels every travel still in flight before it measures.**
  `getBoundingClientRect()` reports the box an animation is *drawing*, not the
  one the layout holds, so a second swap during the first would fly the next
  card from a place it has never been.
- **No travel is filled.** Every one ends on the element's own
  `transform:none`, so a cancelled or superseded animation leaves the row
  where the layout already put it. Nothing can be stranded mid-transform.

`travels()` is called after every guard in `place()` and immediately before
the write, so a recall the Stress track refuses leaves no measurement behind —
the refusal is still the track flinching. Equipping travels too, with a null
`mode` meaning "move, no arrival": the item genuinely crosses the gear tab into
its slot, but the recall brackets say *this card is in your hand now* and a
breastplate has not joined a loadout. A **reorder** takes the same null mode,
for the same reason: the card moved, and it did not change hands.

## The order of a loadout

**Order is a fact this sheet had and never wrote.** `snap.of()` sorts on the
document's own `sort` field and nothing here had ever set it, so both lists
stood in creation order forever — the order a compendium happened to be
dragged from, months ago. A loadout is five cards you reach for under time
pressure, and the order you keep them in is yours. Both lists reorder by
drag now, and a card crosses between them the same way.

**One handler does all of it**, because they are three readings of one act:
put this card there. Vault into loadout is a recall and costs Stress; loadout
into vault is a shelve and costs nothing; either list onto itself is a reorder
and is free by definition. `place()` in `CharacterSheet.svelte` is the whole
of it, and **`recall()` and `shelve()` are now one line each on top of it**.
That is `swap.js`'s own rule about this gesture — drag and click "commit
through the same call and produce the same animation, so there is nothing to
learn twice and nothing that can drift" — and it had never actually been kept
here: pressing recall left the card wherever its `sort` already put it, which
is how a card arrived at the *top* of a loadout it had never been in.

The write is **one sequence across every domain card, loadout first**, not one
per panel. The two lists are a single collection split by `inLoadout`, so
numbering them separately would interleave the values and a card crossing
between them would land wherever the arithmetic put it rather than where you
let go. Only what actually changed is written, so a card dropped back where it
started is a true no-op — no update, no re-render, no travel.

Three placement rules, and each is about where you *aimed*:

- Aimed at a row: the caret sits in the gutter you are nearer, and the card
  goes in there. The caret is deliberately not a highlight on the row — a lit
  row already means something else here, and it means "this is the card that
  leaves".
- Aimed at nothing, crossing into the vault: the **head** of the list. It is
  the card you just made a decision about, and twentieth of twenty-two is the
  sheet filing its own answer where you have to go looking for it. Shelving by
  button does the same, so pressing and dragging agree.
- Aimed at nothing, reordering within a list: the end, because there you did
  mean the end.

**Pressing recall only asks a second question when there is one.** It used to
arm the card and wait to be told which loadout row it replaced. That is exactly
right at 5/5, where something has to leave and choosing it *is* the decision;
below the limit it is ceremony over a hole. So the button reads `recall` and
goes straight in when there is room, and `swap` and arms when there is not.
Coming into a full loadout by drag follows the same rule from the other side:
the card you dropped *on* is the one that leaves, and letting go in the gutter
at 5/5 does nothing at all rather than evicting whoever the arithmetic reached
first.

Two details in the drag are load-bearing:

- **`.lift` is applied one tick late.** The browser snapshots the drag image at
  the end of the `dragstart` dispatch, and `.lift` hides the row — set the flag
  synchronously and the picture it takes is of the row you just hid, so you
  drag nothing across the screen. A `setTimeout` and *not* `requestAnimationFrame`,
  which is the obvious reach and is wrong: rAF does not fire in a tab that is
  not painting and is throttled in one painting slowly, and what this needs is
  "after the snapshot", which a macrotask is unconditionally.
- **`dragId` is the guard on every handler**, and it is doing real work: a drag
  from another sheet carries no id of ours, so those handlers decline the event
  entirely — no `preventDefault`, no drop target — and it bubbles to the window
  root where `handleActorDrop` has always taken it.

**A vault row wears no badge**, and getting to none of one took three tries. A
chip in the bottom-right corner sat on the thumbnail and the tier bar. A tab
down the right edge, like the label on a filed folder, was better and still
wrong for a reason the loadout study could not show: the loadout draws no
recall chip and the vault is the one place it matters. `.spine .rc` is
top-right; the tab was exactly on top of it, so the vault covered the price of
leaving the vault. What says it now is the picture — the row is desaturated and
its artwork takes a fine diagonal hatch, the same hatch the drag leaves behind
in a slot whose card is in your hand, making the same claim: this is filed, not
held. It falls on the only region of a spine carrying neither a word nor a
number, and it lifts on hover.

## Edit mode

The sheet's derived numbers all hang off things you set once. Level drives
tier, Proficiency, advancement and both damage thresholds; the class hands you
base Evasion, Hit Points and Stress. Playing a character means marking,
spending, clearing, equipping and taking — constantly, at speed, with a GM
waiting — and a stray click on Level in the middle of that moves four numbers
nobody will notice moved. So the split is **definition versus use**, and the
mode unlocks the definition: name and pronouns, portrait and token art, the
diorama framing, level, the six trait scores and their marks, the class-given
bases, Experiences, scars, advancement boxes and the loadout limit.

Everything you actually *do* stays live: every mark track, gold, equipping,
shelving and recalling, domain-card uses, consumable charges, the bio prose,
drag-in, "+ new" and delete. The last two are deliberate and were a
correction — adding and removing an item are deliberate gestures in a way a
click on a number is not, and a player who loots a weapon mid-session should
not have to unlock the sheet to write it down.

It is **not** the adjust tab, and the two must not be folded together even
though they overlap on the same fields. The adjust tab is *overrides of
numbers a rule derives*, which is adjudication and therefore the GM's; edit
mode is *the character's own definition*, which is authorship and therefore
the owner's. So the tab is gated on `isGM` and the mode on `editable`.

Per-user and transient — a `$state` local to the component, which dies with
it, so nobody reopens a character in edit mode a week later. Leaving the mode
also drops `framing`, or a sheet locked mid-drag sits framing forever with no
visible control to leave it.

**A locked field stays where it is and reads as locked** rather than
vanishing. The adjust tab learned this already — a control that disappears
when you flip a switch makes the switch feel destructive — so `.def` keeps
full ink on the value and takes `inert` plus `cursor:not-allowed`, and the JS
writers check the mode as well, which is what makes `inert` a presentation
detail rather than the enforcement.

**The banner takes height rather than overlaying**, which is the opposite of
what `.win.dropping` does, and the difference is duration. A drop hint lasts a
second and a reflow under a held pointer makes you re-aim mid-gesture. Edit
mode lasts minutes, and a persistent overlay would sit on the diorama and the
gold rows — covering the very controls it just unlocked — with
`pointer-events:none` giving you the clicks back but not the pixels. So 18px
comes off the top and the bottom and the scroller absorbs all 36; nothing
moves sideways. Two identical runs inside one `max-content` track translating
`-50%` gives a seamless loop with no JS ticker, and the bottom band runs in
reverse so the two read as one band going round. `--strain` and not `--hope`,
because gold is Hope's currency everywhere else and a second meaning for it is
a second thing to decode.

## Gear on the sheet

`design/tile.css` is entirely `cqw`, so one component is proportionally
identical at any width — which is right for proportion and wrong for
*legibility*, and that took a while to see. The tile was drawn in a 368–520px
study panel; a Foundry pane hands it a 262px grid column. Everything scaled by
0.79, and a name going 18px → 14px is still a name, but the stat labels landed
at **4.9px** and their values at 7.2px. Large pictures, caption-sized data.

The fix is `.slot .tile` / `.eqp .tile` / `.abl .sub .tile` in `sheet.css`,
not a change to the component: the art plate drops from 36% of the tile to
25%, labels go to 6.1px and values to 8.8px, and the tile ends up *shorter*
than it was. It refused to go further and the reason is worth keeping — at the
next size up, three of four stat cells ellipse on a weapon a real character
carries. `design/tile.css` is untouched, which is what lets the dialogs draw
the base component unchanged.

## The item sheet

One sheet for all eleven Item subtypes, because they share more than they
differ — a name, a picture, a block of rules text, a set of counters — and the
parts that differ are a handful of fields each.

**It showed a fraction of what an Item holds, and the fraction was the wrong
half.** Four subtypes had no panel whatsoever: an ancestry, a community, a
transformation and every feature any of them carries were simply not on
screen. Of the seven that did have one, none reached its feature blocks, its
printing credit or its counters, and `description` was `{@html}` — read-only,
on the one family of documents whose entire content *is* rules text. So a GM
could drag a card off the compendium and read it, and could not write one:
homebrew meant hand-editing JSON or building the document in a macro.

The sheet reads as finished the whole time it is doing this, which is the
point. A panel with four controls on it looks like a complete panel; there is
nothing on screen to say that `armorScoreModifier` exists and that the shield
you are building will silently do nothing. That is why the gap needed a tool
rather than a read-through — see below.

**Three tabs, and they are tabs rather than steps.** The creation window draws
that distinction and it lands the other way here: a step is a stage of
something being made and can be *unsatisfied*, a tab is one view of a thing
that is already whole. An Item is the second. **Details** is what it is,
**Rules** is what it says, **Counters** is what it asks you to keep — and every
subtype has all three, so no tab is ever a dead strip. The header sits outside
the scroller, because it is what the window is *of*: on a sheet holding four
panels of counters, a name that scrolls away is a sheet you can lose your place
in.

**Rules text is a `Prose` editor now, everywhere, including inside a feature
block.** That needed one change to the component: `onsave`. A dotted path is
how a SchemaField is written and was all any caller had ever wanted, but a
feature inside `classFeatures` or `features` is an ArrayField element, and
Foundry reads a dotted index as a path into an *object* — the trap the adjust
tab learned about Experiences and `moveResource` learned about pools. Those
callers rewrite the whole array and hand `Prose` the writer. `path` is still
passed either way, because it is also the editor element's `name`.

**A checkbox over a method that is allowed to say no has to read its answer
back.** Equipped and In-the-loadout are not flags this sheet may set:
`toggleEquipped` is what knows one armour, one primary and no off hand while
the primary needs both hands, and `toggleLoadout` is what knows the limit. Both
**decline** rather than clamp, which is this system's answer to a refusal
everywhere else — and a decline writes nothing, so nothing re-renders, so the
box the browser already ticked stays ticked while the document says otherwise.
`toggleVia` reads the state back off the document afterwards. It captures the
element before the await, because `currentTarget` is only itself during
dispatch.

Two smaller things the schema had been carrying with nowhere to say them.
**Loadout is only a question when somebody is holding the card**, so it is
drawn only for an owned document — on a compendium card it is a field about a
character who does not exist. And a counter's **ceiling is a source rather than
a number**, so the editor asks where it comes from and then prints what that
currently resolves to; on an unowned document every trait- and level-sourced
ceiling falls to its floor, and the panel says so rather than showing a zero
that looks like a mistake.

### Proving a field is reachable

`tools/check-item-sheet.mjs` is `check-resources.mjs`'s ratchet pointed at a
different gap. There the risk was a card that asks you to count something and
an annotation that never said so; here it is a schema field that exists, is
written by the compendium or by a migration, and has no control anywhere — a
failure that is invisible by construction.

    node tools/check-item-sheet.mjs

It reads the fields each subtype declares out of `data/items.ts` and the paths
and keys the sheet names out of `ItemSheet.svelte`, and fails when a declared
field is named nowhere. `npm run typecheck` runs it, so it runs before the
release workflow bumps a version.

**What it can prove and what it cannot.** It does *not* prove the control was
drawn under the right subtype. That would mean parsing the template's branches,
and it is the mistake you see the instant you open the sheet — where a missing
field is the one you never see. Coverage is the ratchet; placement is the
reader's.

It reads the source rather than the class, because a DataModel cannot be
instantiated outside Foundry, and it strips comments before it walks the
literal. That is not tidiness: `data/items.ts` is more commentary than code by
volume, the commentary is English, and English has colons in it. The first run
reported `class.once`, `weapon.Protective` and `feature.from` as missing
fields, every one of them a word lifted out of a paragraph explaining a field
that was present.

### And the two list controls nobody had measured

`.lst` is the row shape the adjust tab's Experiences and scars are made of, and
the item sheet's every string list is made of it too — which is how this was
found. Both of its presses had the bug that `make.css` and `pool.css` taught
and that the panel heading's plus and the slot header's unequip were fixed for.

`.lst .r .x` declared `height:24px` and beat Foundry's `height` outright. It
had nothing for the matching `min-height` to beat, and **a floor with no
competitor simply applies**, so it stood 28px tall in a 24px row. `.lst .add`
declared no height at all and was a 9px word centred in a 28px box. Both read
as spacing rather than as an inherited height, which is why they shipped.
`tools/verify/`'s THE PANEL stage now carries a list editor and asserts both:
strip the reset and it reports 28px in a 28px row, and 28px.

## The adjust tab

Everything on it is a number some rule normally derives — Evasion off the
class, thresholds off the armour, Hope max off your scars — and it exists
because a table invents exceptions faster than a schema can name them. **A GM
who cannot set a number directly sets it indirectly, by lying to the sheet
about the armour**, and then the sheet is wrong about two things instead of one.

**It is a GM tab.** It used to be shown to anyone who could edit the sheet, on
the reasoning that ownership is the right to change your own character and half
of what is here is the player's to write — Experiences most of all. That
reasoning was about the *fields* and missed what the tab is: every one of them
overrides a number a rule derives. A player who can set those directly is a
player who never has to be told no, and the first time it is used to fix
something rather than to record a ruling, the sheet is quietly wrong in a way
nothing on it will ever surface. Adjudicating exceptions is the GM's job, so
the dials are the GM's tab. Gated on `isGM` rather than on `editable`, which
is strictly narrower and needs no second condition, since a GM owns every sheet
at the table anyway.

Two things about it are structural rather than cosmetic:

- **`LOADOUT_LIMIT` is now a default, not a rule.** `system.loadoutLimit`
  initialises from it, and the sheet reads the field. Subclasses and campaign
  frames move that number, and one the table cannot move is one they work
  around somewhere worse.
- **A field the sheet is about to overwrite says so** rather than vanishing.
  Armor Slots while armour is equipped, both thresholds while `override` is
  off — they keep their values and wear `.off` with a sentence underneath. A
  control that disappears when you flip a switch makes the switch feel
  destructive.

Experiences and scars are written **whole**, not by path: `system.experiences`
is an ArrayField and Foundry reads a dotted index in an update key as a path
into an *object*, so `"system.experiences.0.name"` writes a shape the reader
does not expect.

## Counting what a card counts

**A counter you put down, not a box you cross off.** Every other row of boxes
on this sheet is printed and marked — Hit Points, Stress, Armor Slots, a
consumable's charges — and the boxes are always there while only the marking
varies. That premise is false for the hundred and fifty-seven cards that count
something. Several pools have **no maximum at all** (Twilight Toll takes a
token every time you mark the target), several have one that **moves when your
Spellcast trait does**, and one says *place 1d4+1*. So a chit exists or it does
not, an empty pool draws nothing, and `design/chit.css` is the argument in
full.

**The schema stores where a ceiling comes from, not what it is.**
`resourceField` in `data/fields.ts` is `{name, value, max:{kind,n,trait,floor},
refresh, onRefresh, feature, onEmpty}`, and `data/resources.ts` is the one
place a `kind` becomes a number. `open` is first-class rather than a zero,
because a pool with no ceiling and a pool with a ceiling of zero are opposite
things. `spellcast` is a legal `max.trait` and is deliberately **not** in
`TRAITS` — it is a pointer to one of the six, exactly as the arcane-frame
wheelchair's is, and adding it to the closed set would reach the roll engine
and six trait plates to serve a handful of cards.

**`proficiency`, `tier` and `fear` were the three that sweep missed**, and they
were missed the same way: it started from the 189 domain cards, found `trait`
and `level` there, and stopped. The other two live on class and subclass
features — Call of the Slayer stores dice "equal to your Proficiency", the
Assassin adds d4s "equal to your tier" — and both are derived numbers on the
character exactly as level is. They read the actor's *derived* values rather
than recomputing from level, so an advancement option that bought a point of
Proficiency raises the Slayer's pool with it, which is why the card says
Proficiency instead of naming a number. `fear` is the odd one and reads a
**world setting**: Umbral Veil counts "tokens equal to the Fear in the GM's
pool", was annotated `open` as an honest fallback, and drew no capacity at all
for a card that states one. Two players holding a copy each see the same
number, because there is only one.

`resources` is an array, so **every subtype has one** — `tracked()` in
`data/items.ts` — rather than the two that had `uses`. That field is gone;
`migrateUses` turns an old one into a fixed pool that comes back on either
rest, which is what it meant. And `item.system.resources` shares a word with
`actor.system.resources`, the four printed tracks. They are safe only because
the prefix always disambiguates: two fields on two documents with no shared
namespace to collide in, which is why this is not the clash that renamed
`.die.win`.

**A refresh has a scope, and `refreshUses` did not honour one.** It refilled on
either rest kind, which is right for the fifty-one entries reading "once per
rest" and wrong for the fifty-nine reading "once per **long** rest" — a latent
bug that could not fire, because nothing in the corpus had ever authored a
pool. `refreshResources(actor, scopes)` is the one implementation, `restScopes`
names the two sets, and `scene`/`session` have no automatic trigger at all:
`game.daggerheart.endScene()` and `endSession()` are the seams, because nothing
in Foundry knows when a scene ended and a system that guessed would be wrong at
somebody's table every week.

**`onRefresh` is three values because the corpus needs three.** `fill` is a
budget you are given back, `clear` is a pile you were accumulating, and
`decrement` is the Vampire's six-charge card, which spends one *per long rest*
whether or not you used it. A `fill` on an open pool is left exactly where it
is rather than handed a number this system made up.

### The annotations, and what checks them

`src/packs-src/card-resources.mjs` is hand-authored and keyed `type:name`, and
`withResources()` stamps it onto the four packs at import time — the same
argument `equipment.mjs` makes: nothing upstream publishes this, so a generated
file would be a second copy of facts with nothing to generate them from.

It is two blocks and a list. **`PILES`** are the twenty-one cards read
individually, because what they count is particular — Flight is *your Agility,
minimum 1*, which is the floor's whole reason; Wild Fortress counts **Hit
Points** upward, not uses. **`BUDGETS`** are the regular "once per X" majority,
built by `once()`, which sets `value: n` so a freshly dragged card arrives
**full**: a budget you have not spent is not a budget at zero. And **`DECLINED`**
is four entries with a reason each.

`tools/check-resources.mjs` is `fetch-cards.mjs`'s `TYPOS` pattern applied to a
new problem, and the reason it is shaped that way is epistemic: **a regex
cannot prove completeness.** Of the thirty-eight cards matching `until…rest`,
thirty-six are durations and two are use limits, and only a reader can say
which. So the tool is annotation-first — every entry carries `said`, the words
it was read from, and the check **fails when those words leave the card** —
and coverage is a ratchet: anything matching `SWEEP` must be annotated or
declined out loud. It also binds every `feature` to a feature that exists,
which is the first thing in this system to depend on class features having
names of their own.

    node tools/check-resources.mjs

`npm run build:packs` runs it beside the other two.

### And eighteen rules keep a die

A chit answers **how many**. Eighteen ask a second question it has no room
for: how many, *and what does each one say*. Prayer Dice are four d4s lying on
your sheet with four different faces up, and four identical counters are not a
record of that.

So `dice` is a second array beside `resources` on every subtype, and
`diePoolField` is its own field rather than a flag on the first. The `max`
block is shared verbatim — a ceiling is a ceiling, and `resourceMax` answers
for both, so a source added for one is available to the other by construction
— and nothing else is: one holds an integer and the other a list, and folding
them together would give every reader a branch and every writer a shape to
guess. Seven documents carry both, which is the case that settles it: the
Guardian's Unstoppable is a once-per-long-rest **use** and a die that climbs,
and those are two records of two things.

**Three modes, and they are the three shapes the corpus has** rather than
three somebody might want. `bag` is several held and spent one at a time —
Prayer Dice, Slayer Dice, the Sigil's d8s, the Rally Die you were given.
`climb` is exactly one, placed showing 1 and stepped upward — Unstoppable,
Wild Surge, Zone of Protection. `roll` holds nothing: the card names a die
whose *size* changes as you level, which is the fact the sheet had nowhere to
keep, and pressing it rolls — the Patron Die, the Combo Die, Marked for Death.

**`0` is a die with no face**, which is what makes one array serve both halves
of `bag`. Slayer Dice and the Sigil's d8s are *placed* and rolled when spent;
Prayer Dice are rolled when placed. So a die can genuinely be on the card
showing nothing, and the array's length is the count — a number and a flag
could not say it.

**A climbing die refuses at the top rather than clearing itself**, and that
refusal is the card's whole bargain. All three say "when the value would
exceed its maximum" and all three then do something *different*: Wild Surge
charges a Stress, Unstoppable drops a stance, Zone of Protection simply ends.
Three consequences behind one arithmetic condition is exactly the shape this
system declines to guess at, so the row says no, `onEmpty` prints the card's
own sentence, and the person who read it takes the die off.

**`faces` is a number the table sets and `grow` is prose nothing reads.** A
Rally Die becomes a d8 at level 5 and a d10 at Wordsmith Mastery; an
Unstoppable Die becomes a d6 at level 5; a Combo Die grows by an *advancement
option*. Those triggers live on three different documents and two of them are
cards the holder has never heard of. The size is therefore edited on the item
sheet, which is where a definition is edited — the sheet's own
definition-versus-use split, arriving on an Item.

`refreshDicePools` is `refreshResources`'s twin and is separate for the reason
the fields are: what comes back is a list here and a number there. `reroll` is
the one `onRefresh` a resource has no equivalent of, and it exists because
Prayer Dice arrive **already rolled** — "at the beginning of each session,
roll a number of d4s equal to your Spellcast trait" — and a tray of blanks
would be the sheet quietly making you do it by hand. One `Roll` per pool
rather than per die, so a Seraph's four d4s are one entry in a dice log.

`DICE` in `card-resources.mjs` is the eleven annotations, policed by the same
`said`-provenance ratchet, and `check-resources.mjs` merges the two blocks for
the walk — so a card carrying a counter *and* a die has its names compared
across both, since "Unstoppable" and "Unstoppable Die" as two rows called the
same thing would be two trays a player cannot tell apart. Its sweep gained two
patterns and one **subtraction**: the Hope Die, the Fear Die, the pair and the
advantage die are stripped before sweeping rather than declined afterwards.
`DECLINED` is for a card somebody read and judged; those four are the roll
engine's own and no reading will ever make one a tray. Which card holds a
Rally Die *is* a reading, so the four subclass cards that name one and hold
none are declined by hand.

### Where the counters are drawn

`design/chit.js` is one builder, one setter and one delegated handler.
`setChits` is the contract `Marks` and `Gems` already keep — the row is
rendered once and every later change diffs against it — and `parts/Chits.svelte`
is what keeps that true on a Svelte sheet.

**The number must not be in the builder's string, or there is nothing left to
animate.** A spine and a tile are `{@html}` output from `ui/tile.js`, and
Svelte replaces that content whenever the string changes; a row rebuilt at its
new value has already arrived, so `setChits` finds nothing to move. So nothing
about a pool is passed to `SPINE` or `TILE`. The component renders its row
**detached** and appends it to a selector the host names — `slot`, resolved from
the anchor's own parent so a caller inside an `{#each}` needs no `bind:this` —
which leaves the builder's string identical across a spend, `{@html}` comparing
it and skipping, and our row still standing there. `rev` is the dependency that
re-parents after the one kind of change that *does* rewrite the markup. It is
`message-header.ts`'s move: dress what was already drawn rather than draw a
second one beside it.

Six hosts on the sheet, and the slot differs because the slack does: a spine's
is the meta line, a tile's is the footer, and a features row draws it in flow
under the rule. **A card is the exception and takes it through the builder**,
because a peeked card is rebuilt on every hover and a posted one is a record —
both are readouts, so there is no animation to protect and `CHITS({add:false})`
is the whole of it. Two pools go in a `.chitstack`, since the plate has one
anchor and seven cards in the corpus carry two.

**A chit is a button, so the features row stopped being one.** `.abl .a` is a
container now and `.abl .ap` is the press — `.fcls`/`.fclsr`'s answer arriving
on the character sheet — and `.ap` restates its own height for the reason the
panel heading and the slot header do. `chitClicks` **stops the press at the
row**: every host it sits on is itself pressable off a delegated handler, so
left to bubble, placing a counter on a domain card would also post that card to
chat.

**And the tray of kept dice is a chits row wearing a second class.**
`<div class="chits keep">`, not a row of its own: sockets, the way to put one
down, the gap, the tilt, the six host sizings and both grounds are already
written and already right, and a die is a counter that says something — so it
belongs in the same tray, on the same corner of the same plate, at the same
size. `keep.css` states only the difference. What that buys is not brevity but
`.card .chits`'s three corrections — the plate's own bottom edge, `.lower`'s
margin resolving against *width*, the seam's 8cqw — solved once; a second row
would have had to rediscover all three, and the way you discover them is by
shipping counters that sit on the prose. It carries `data-keep` rather than
`data-chits`, so `chitClicks` declines it and `keepClicks` answers instead.

**The die itself is `plate.css`'s die**, not a picture of one — `DIE()` out of
the new `design/die.js`, which is the top of `plate.js` moved out when a second
component wanted it. `port-design-js.mjs` copies modules verbatim and rewrites
no import paths, so anything the system side needs has to be reachable from
inside `src/module/ui/`; a file holding one function is a small price for the
chat plate and the tray never disagreeing about what a d10 looks like. That is
the finding `tools/verify/` already caught between `design/plate.js` and
`dice/plate.ts`, arriving early rather than late.

**An unrolled die draws the family rhombus**, which is exactly what a chit
draws and for the same reason: it is what stops the object reading as a blank
at 14px. A pool you have not rolled is a row of counters and becomes dice at
the moment that means something. Nothing had to be invented for it.

**The die must not wear `kd`.** That is the button — the thing you press — and
the `.die` inside it is the drawing, and the first draft gave the class to
both: `.keep .kd`'s `display:block` then beat `plate.css`'s `display:grid` and
every numeral came off the centre of its silhouette onto the text baseline.
Fourth instance of `.die.win` and `.dfn .pl`, and worse in one respect — those
were two of our sheets colliding and this was one component colliding with
itself, which no amount of `.dh` scoping could ever have caught. The colours
ride on `.keep .die`, which says what it means.

**The numeral had to survive nine domains**, and choosing an ink was not
enough. A kept die takes the card's hue and the nine run from Splendor's pale
gold to Midnight's near-black; asking the face's lightness and flipping
between black and white left six of them between 2.2 and 3.4:1, because those
hues are *mid* and neither ink gets anywhere on them. Nothing you can do to a
numeral fixes a face it cannot be read on. So both ends are floored against
the same channel — the face at `max(l,.74)`, the ink at `min(l,.28)`, hue and
chroma untouched — which is a lightness gap of at least .46 on every domain by
construction. Every one now measures 5.8:1 or better on both themes. The rim
and the glow keep the **true** hue at full strength, so the card still says
which domain it belongs to, round the outside of a face you can read. Do not
chain the two: computing the ink from `var(--facec)` when that is itself an
`oklch(from …)` drops *both* declarations silently, and a die with no face and
no numeral reads as an empty socket.

**A d4 is the one asymmetric silhouette.** Two thirds of a triangle's ink sits
below the halfway line, so a numeral on the box's centre reads as having
slipped upward — which is the complaint that produced `--oy`, a per-shape
optical offset in `plate.css` applying to the chat plate too. It is neither of
the two anchors this file has already argued about: 66.7% is the face centroid
and where a real d4 prints it, retired for being unreadable as a picture, and
50% is the box. The optical centre is 59.7%, and `--oy` is a fraction of
`--sz` rather than of the numeral because what it corrects is the shape and
not the type — beside the font correction rather than folded into it, for the
reason `--nudge` was taken apart in the first place.

`.chits .put` and not `.add`: `sheet.css` already owns `.lst .add` at identical
specificity, both load into the same `.dh` root, and which won would have been
decided by the order `system.json` lists them in. Caught before it shipped
rather than after, which is one better than `.die.win` and `.dfn .pl`.

**The port now refuses a module that does not parse.** `node --check` sees the
backtick-in-markup bug — the one CLAUDE.md said nothing here could catch — and
it caught it on the first comment written into `CARD` for this work. It is the
JS half of what the CSS port does by counting comment delimiters: not a linter,
just the one mistake that actually happens when these files are edited by hand.

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
have touched anything, and it is a handful of lines tall. A popover slower than the
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

**The pair is named now, and it is the one thing here that was never said at
all rather than said and ignored.** A duality roll is 2d12, the popover
asserted it by drawing nothing, and that held until a card moved one:
*Signature Move*, *Rise to the Challenge*, *Reliable Backup* and the Paragon's
Chain all read "you can roll a **d20** as your Hope Die". So the two dice are
drawn at the top of the popover, always, in the silhouettes the chat plate is
about to draw them in — press one and the six open under it.

Always, for two reasons. A control that appears only once something is unusual
is a control nobody knows exists at the moment they need it. And on the
ninety-nine rolls in a hundred that never touch it the row is a *readout*: what
am I about to roll, stated by the surface whose whole job is composing that
sentence. It costs one line, and it is the line everything else in the popover
is modifying.

`DUALITY_DICE` is the one closed set on this surface, and it is closed because
a die is a *shape* rather than a number — there is no seventh polyhedron for
somebody to want. Everything else here is deliberately unbounded. The engine
takes `hopeDie`/`fearDie` as notation and re-renders the number rather than
trusting the string, because a ruling belongs to the table and a `Roll` formula
belongs to Foundry, and only one of those two will throw.

Both dice move, though nothing printed moves Fear. A GM ruling is the only
thing that ever will, and there is nowhere else in the system to say it.

The plate follows: `hd`/`fd` ride on the message, the silhouette and `data-mx`
come off them, and the arithmetic strip's first term reads `d20 + d12` instead
of `dice` when — and only when — something moved it. Both are optional on
`DualityPlate`, because a log is a record and every card posted before the pair
could move was stored without them; absent reads as the printed d12, which is
what it was.

## Chat

**A message is not the object in it**, and the header is where that shows.
Who pressed the button, which character it was pressed for, when, and how to
take it back are facts about the *message* — so `src/module/message-header.ts`
dresses the header Foundry already rendered rather than drawing a second one,
and `.dhk` in `styles/frame.css` is its look. That file and not `design/`,
because a message header is the application's furniture, which is the same
reason the window and dialog chrome are hand-authored there too.

It was a quiet 8px caption *below* the object, and both halves of that were
wrong. Below, in a log that is scrolled back through, puts the line nearer
the **next** message than the one it names. And `.message-sender` is the
speaker alias, which is the character — so a card posted by a GM speaking for
three NPCs said nothing whatever about who was at the keyboard. It names both
now: the character in the sheet's own UI face, the player as a mono caption
beside it.

**Nothing on it is redrawn.** The alias, the timestamp and the whisper line
are Foundry's own elements, moved nowhere and restyled — the timestamp
especially, since `ChatLog#updateTimestamps` rewrites every
`.message-timestamp` on a fifteen-second interval and a copy would be the one
line on the card that is quietly wrong an hour later. Two elements are added,
and only because Foundry does not have them: the **player's name**, which is
nowhere in the template, and the **trash**, which Foundry renders for GMs only
(`canDelete ??= game.user.isGM`) although the permission is `OWNER` and the
author owns their own message. Ours is drawn for anyone `canUserModify` allows,
which is the test Foundry's own context menu uses, and Foundry's anchor is
hidden so there is one control rather than two that can drift.

**The strip is made of paper**, and a transparent one was the first mistake:
naked on Foundry's chat log it was type floating on somebody else's substrate,
with neither an edge nor a ground, and it read as something that had failed to
load rather than as a caption. The card below it has solved that since it was
drawn — a paper ground, a hairline, a shadow to lift it off the log — and the
header takes the same three and is thereby the same object. It is also what
keeps the contrast figures below true: every one is measured against
`--paper`, and they were being spent on whatever the log happened to be.

**It is flush**, at `margin-bottom:-1px`, and the minus one is the seam rather
than a nudge — butted at zero the two hairlines sit side by side and read as a
2px rule, overlapped by exactly their own width they are one, and where the
object carries no border at all (a posted card is shadow and paper, nothing
else) the two become one sheet. It carries **no chamfer** for the same reason:
the family mark belongs to the bottom-right of the *message*, which is the
card's own cut, and a second one in the middle of the object would notch a
hole straight through to the chat log. Both gaps were reported before they
were noticed here, so `tools/verify/` now asserts the shared edge.

That in turn capped the plate. A card was already 300px and a rest caps itself,
but `.dh-plate` simply took the log's width — invisible while the sidebar *is*
300px, and obvious the moment a 300px caption sits over a 480px plate in a
popped-out chat. "A chat card is a fixed 300px in Foundry and does not scale"
is `design/chat.css`'s own opening rule; it is now stated where it binds.

**The player's colour is a hue, not a colour.** It lands at full strength on
the mark — a rhombus, the family shape — because that is the one thing on the
line that is not text and therefore cannot be made illegible by somebody
picking `#000000`. On the names it is `oklch(from var(--who) L c h)`: their
hue and chroma, the sheet's lightness, one step per substrate. Measured across
black, white and a saturated green it lands between 4.6 and 8.7:1 on both
themes, against `--ink-3`'s own 4.4 and 3.6. Mixing toward `--ink` was the
first answer and is the `@supports` fallback; it lifts a black to 2.2:1, which
is a name you can see and cannot read.

**The strip is a grid of three and was a wrapping flex row**, which is the
kind of bug that reads correctly at every ordinary width. A wrapping flex
container breaks a line *before* it shrinks anything on it, so a long
character name did not ellipse — it took the whole metadata block onto a
second row and turned a 26px strip into 35px. Three columns cannot do that,
the middle one is `minmax(0,1fr)`, and the two names inside it use
`flex:1 1 0` on the handle so that the **character never gives way first**:
a shrink *factor* cannot manage that, because flex divides an overflow by
factor times base size, and even at twelve a five-letter name beside a long
handle still lost the pixel that renders an ellipsis. Taking the handle's
base to zero takes it out of the overflow entirely.

The character is named twice on a duality roll — here and inside the plate,
which says who it belongs to on its own so a card stays readable when a module
suppresses this header. That is the plate keeping a promise rather than the
header repeating itself, and it is worth the line: a **posted card** names
nobody at all, which is the gap this closes. `tools/verify/` draws the whole
envelope under a stand-in `elements` layer, because the trash is a `<button>`
and would otherwise be a 28px control on a 26px strip.

**Foundry draws every message twice** — once into the log and once as the
notification that floats over the board — from two separate calls about three
milliseconds apart. Two elements, one message. Anything keyed on the message
id that fires "only the first time" therefore serves one of the two and
silently skips the other, and which one you are looking at is a coin flip.
`dice/chat.ts` allows both and rejects anything later; see `TWIN`.

**A numeral that is centred is not the same as a box that is centred.**
`letter-spacing` is applied after every character, the last one included, so
an `<em>`'s layout box is one whole tracking narrower than the ink inside it —
at `-.045em` the run overhangs its own box on the right and `place-items:center`
puts the *box* on the die's centre, leaving the number half a tracking to the
right of it. Measured, not inferred: removing the tracking moves the ink centre
by exactly `-L/2`, constant, whatever the value. The fix is
`margin-inline-end:.045em`, which hands the box back precisely the column
letter-spacing took, and it must move in lockstep with the tracking — it is a
third correction alongside `--nudge`'s two, and unlike them it is horizontal
and therefore not part of `--nudge`, which is a translateY.

What remains after it is the *value's* own asymmetry rather than the box's:
tabular figures centre each glyph in one shared advance, so `10` leans right
by about 0.8px because a `1` is narrow and a `0` is not. No stylesheet rule
reaches that, and chasing it with JS text measurement would be paying a
per-render cost for a fraction of a pixel.

**The numeral is .66 of the die now, and overflow is allowed.** The old rule
was "nothing overflows the die's own box", which is retired: at 26px on a
damage card the d4's numeral was under eight pixels of Google Sans on the dice
that are the whole subject of the card. Three things could have set the
ceiling and only one does — the plate clips at 300px but the strip sits 12px
inside it, and the 5px gap between dice is never reached — so the limit is the
**silhouette**, and it binds on the d10, where `10` fills the kite out to its
shoulders at .61 and bursts the outline at the next step. Overhang onto the
facets is fine on every shape, because the facet ring may only ever *darken*,
which is the guarantee every contrast figure in `plate.css` was measured under.

**And every numeral is centred on the silhouette — one rule, six shapes.** It
used to ride the *front face*'s area centroid instead, the one plane square to
you, on the reasoning that a numeral is painted on that plane: 66.67% down on
the d4, which is where a real d4 prints it, 36.67% on the d8, 43.67% on the
d10's kite. True of the object in your hand and unreadable as a picture. The
front face is a slightly lighter region inside an outline on a 26px chip; at
that size it is shading, not geometry, so the outline is all a reader has, and
against the outline three of the six shapes had a number sitting off-centre for
a reason nothing on screen could show.

The d8 is where it broke loudest — enlarging the numeral put 45% of ink on a
40%-tall face, so it was anchored to a plane it was visibly bigger than — but
the d8 was the symptom. The d10 is the principle: 43.67% is a pixel and a half
off centre at damage size, too small to read as projection and large enough to
read as an error. Making the anchor *conditional* on whether the face can hold
the ink was tried first and rejected — derivable, defensible, and still two
positioning rules for a distinction nobody can see.

So there is no stored `--nudge` any more. A shape declares `--nf`, its
numeral's fraction of `--sz`, and both the font size and the offset
(`--nf × .0275`, the font's own metric correction) are computed from it in one
place. The old arrangement stored the *product* of the two, so every change of
size silently invalidated six offsets — which is exactly how this went wrong.

The two builders are reconciled on this now. `design/plate.js` hardcoded `sq`
for every damage die while `src/module/dice/plate.ts` had `shapeOf`, so
`tools/verify/` drew a 2d8 as two d6 chips — right in the game and wrong on the
study page, which is the opposite of the usual direction. Both carry the same
`SHAPE` table, and both use it for the duality pair as well now that a card can
make the Hope Die a d20.

The plate is **veiled** until it lands: field, ghost word, verdict, claim row
and the critical's whole material are held back while the dice tumble, so the
card does not answer the question it is still asking. It is presentation only
— the result is in the markup from the first frame — and a client that never
runs the arrival never wears the veil. See the veil block at the foot of
`design/plate.css` and `dice/arrival.ts`.

**A card arrives as one thing.** It used to rise while its level cap and
recall corner ran a second animation of their own, which is three objects
moving where there is one object. Now the whole card rises a little and
settles, and the only other event is a **sheen** — a warm band crossing the
art plate once, at a slight angle, and never the prose. `.plate` is already
`overflow:hidden` for the ramp, so the clip is free, and the band paints above
the artwork while staying under the corner tabs without touching `z-index`.

It fires **once, on the client that watched it land**, and needs no code to do
so: `.card.arrive` is added in `dice/chat.ts` only when `arriving(message)`
says this is the message's first drawing here, so it already carries exactly
the `play`-and-not-`land` distinction the plate spells out below. There is no
`land` half because a card has nothing to reveal — it arrives already saying
everything it says.

The card also no longer lifts on hover, anywhere. In the log it is a record;
in the peek layer the rule never fired at all, because `.peeklayer` is
`pointer-events:none` and `.pkc` does its own moving.

**`play` and `land` are two different claims, and every arrival rule needs
both.** `land` means *settled* and is worn by every re-render of the log;
`play.land` means *this client just watched it land*. Foundry re-renders a
message whenever anything is written to it, so a rule keyed on `land` alone
replays each time. It costs nothing to qualify because every arrival keyframe
ends on the element's natural value, so a re-render is handed the end state
rather than travelling to it.

**A claim is offered once.** `gain-hope`, `clear-stress`, `roll-damage` and
`apply-damage` each spend a flag on the message — see `CLAIM_OF` in
`dice/chat.ts` — and `bindActions` reads those back on every render, so a
button taken on one client is taken on every other one and stays taken after a
reload. The log is a record of what changed hands, and a row of live buttons
three hours later is an invitation to collect the same Hope again.

The **diamond is removed** rather than recoloured on a spent button, and that
is the load-bearing half. On a plate the diamond means *unclaimed*: it is the
same shape as the pip you are about to mark, sitting on the thing that would
mark it. Leaving it on would make it the one mark in this system that means
two opposite things. The GM's Fear wears the spent state from the first frame,
because it applies at creation and is a statement rather than an offer.

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

## The change log

Everything above is an event somebody **chose** to post: a roll, a card shown,
a rest taken, a character finished. The change log is the opposite — the record
of what happened to a sheet while nobody was posting anything. A player marks
three Stress and the GM, looking at the map, has no idea; a card comes out of
the vault and the only witness is the sheet it happened on. The rules ask a
table to keep these numbers where everybody can see them, and until now the only
place any of them existed was the sheet of the person holding it.

`src/module/ledger.ts` is the observer, `design/ledger.*` is the card, and
`design/ledger.html` is the study page.

**It observes the document rather than instrumenting the writers.** Fifteen or
so call sites move one of these numbers — the damage dialog, a claim on a chat
card, the roll popover paying for an Experience, a chit, a pip on the rail, the
adjust tab, somebody's macro — and a `log()` on each is a list that is wrong the
first time one is added, and silent about every write that never went through a
method at all. One hook on the update catches all of them, including the ones
that do not exist yet. It is `syncVulnerable`'s argument: the document is the
record, so read the record.

The before-state travels in `options` rather than in a second snapshot, because
`preUpdate*` is the only moment the document still holds it and `preUpdate*` can
be **cancelled**. Writing it into the options the update is already carrying
means a refused write leaves nothing behind — there is no `update` hook to read
it back off. And `has()` reads the *expanded* form while every writer in this
system passes the flat one (`markTrack` sends `"system.resources.stress.marked"`,
`moveResource` sends `"system.resources"`), which works because the `changed` a
`preUpdate*` hook receives has been through `DataModel.cleanData`, whose
`expand` defaults to true. Checked in Foundry's own `client-backend.mjs` rather
than assumed; the Vulnerable sync has been resting on the same fact since it was
written.

**The unit is the change, not the write.** Applying damage is four writes —
armour, stress, hope, hit points — inside about fifty milliseconds, and one
event; a player fixing a miscount is three clicks in two seconds and one
correction. So entries coalesce into a window and what lands is the **net**:
3 → 5 Hit Points, never "+1, +1, −1, +2". Which also means a **net of zero posts
nothing at all**, and marking a box by mistake and taking it straight back is not
something the table has to watch happen. Keyed by what changed rather than
listed, so the second write revises the first: `from` is kept from the opening
write and `to` is overwritten by every one after.

Two timers, and the second is not decoration. `QUIET` closes the window a second
after the last change; `CEILING` closes it six seconds after the first
regardless, because without a ceiling a steady drip never posts — one press a
second holds the buffer open through the whole fight and the log stays empty.

**A change is one line, and the line is a picture rather than a sentence.**
This is a **note in the margin of the log**, not an object in it: a plate is
300px of card because a roll is the thing everybody is looking at, and this
arrives unasked for while somebody is describing a room. Four of them between
two rolls must not push the roll off the screen. Six changes — every row shape
there is — stand 122px, where the first draft stood about 230 for three.

Most of what that cost was **numerals**. The row led with a 22px figure and the
word MARKED, above a strip that had already said it, and then said the total
again on the right. The strip states the total, the current value **and** the
delta at once:

- `.on` — marked before this entry, receding. Settled history.
- `.up` — marked *by* this entry: full strength, and lit.
- `.dn` — given back by it: the **ghost** of the mark that was there.
- bare — never marked.

That is the damage dialog's *incoming outweighs existing* in the past tense, and
it needs no reading: a run of dim marks ending in bright ones is a hit, ending
in ghosts it is a heal. The ghost is a mark and not a hollow box, because a
cleared box on the sheet is simply *empty* — and right to be, since the sheet
says what is true now. A log has to say what changed, and "there was a mark
here" is a thing only the mark can say.

**And the mark is the sheet's mark.** Crossing a box off has a look here and it
is not a filled square: a wound is a tear that bows off the diagonal, a strain
is a fine scored line, a plate is a chisel blow. That is `mark.js`'s whole
argument — the tracks are told apart by *substance* first and hue second — and
three identical squares in three colours would throw away the half of it that
survives being small.

So they are the same arms, off the same point lists, through **`armPolygon`**:
three of the four are pure point lists, so a `clip-path` is exactly the same
shape rather than an approximation. The geometry lives in two files and
`tools/verify/` asserts they agree *numerically*, since the browser reformats
what it is handed. Two things differ from the sheet and both are about size.
The recess is `<u>` and the mark is the box's own pseudo-elements, exactly as
`mark.js` splits them — a clipped element clips its descendants, so the chamfer
has to sit on a sibling of the thing crossing the box out. And where the sheet
scales the arm *up* past its box, this may not: these rows are four pixels
apart and a chisel at 1.6 puts its tips through the track above. What the small
sizes need is **width**, which is `core()`'s transform run the other way —
rotate the arm's diagonal onto an axis, scale across it, rotate back — so the
stroke thickens without growing a pixel longer.

**Nothing on this card is an `<svg>`, and that is a decision rather than an
accident.** It is deliberately *not* the sheet's `MARKS` row — not for size, but
because Foundry's sanitiser strips every `<svg>` out of stored message content,
and a marked box that loses its X does not look broken, it looks **unmarked**.
A posted card survives that by being redrawn from a flag on render; a lie
cannot be styled back into the truth. So every mark here is a hole cut in an
empty element, `GEMS` and `CHITS` were already `<i>`/`<b>`, and the whole
message survives storage exactly as posted — **no flag, no redraw, no render
hook**. `tools/verify/` asserts both halves, so reaching for `MARKS` here to
save fifty lines goes red rather than going quietly wrong.

**A picture reaches two readers badly**, though, and dropping the numerals is
what made that a debt rather than a preference: somebody using a screen reader,
for whom a strip of empty elements is nothing at all, and a client that never
got the stylesheet, for whom it is empty boxes. Both get the sentence — `said`
writes one clipped `.sr` span per row, which is the same element assistive
technology needed anyway. Stripping an `<svg>` *lies*; dropping a numeral costs
a fact, which is the better failure and still a failure.

**No row carries a class of its own, and that is a fix rather than a style.**
The pool row was `.r.pl`, and `.pl` is the **chat plate** — both load into the
same `.dh` root where scoping does nothing, so a card's counters were drawing
on the plate's paper ground, inside its overflow clip, playing its arrival
animation, and it read as a deliberate tray. Fourth instance of the bug that
renamed `.die.win` and `.dfn .crest`, and there was never anything for the class
to say: `data-t` already names every row and an attribute cannot collide with a
class. `tools/verify/` now asserts that **no other sheet reaches into a ledger
row** — every element that is not part of a hosted `GEMS` or `CHITS`, against
every rule in the ported stack. A study page cannot see this: `design/ledger.html`
loads four stylesheets and the game loads twenty.

The same page taught the other half of it. `.ldg > .hd` states `padding:0` and
`border:0` because `tools/verify/`'s own sticky page header was an unqualified
`.hd` with 11px/26px on it, and a metric we never state is one with no
competitor to beat — the `min-height` lesson, arriving from the page rather than
from the game. The card came out 145px instead of 122 and looked merely roomy.

Hope is gems and a card's pool is chits, because those are what the sheet draws
and the log is not the place to introduce a second drawing of either. What
changes is that nothing is pressable — a control in a record would be offering
to change a number that changed three hours ago — and that both learn the
strip's two change states. Hope is built a pip at a time rather than through
`GEMS`, since a gained pip and the socket a spent one left are not things
`GEMS` has any reason to know about: it draws a pool, and this draws what
happened to one. A pool's is a rewrite of the markup `CHITS` returned one line
above, walking chits and sockets in document order — which is the strip's rule
again, because `[lo, hi)` is the part that moved whichever way it went. Scars
ride along on Hope: the ceiling is already the printed six *minus* them, so the
row is `max + scars` wide, and a ledger drawing only the live half would quietly
drop the permanent part of what happened to this character.

**Exactly two flows are muted**, and the test is narrow: does something else
already post a card that enumerates *these same changes*, line by line. A rest
does — with the die that produced each one — and creation does, and a second
card in a different grammar is the log arguing with itself about which is the
record. `refreshScope` is muted for the same reason one step out: a scene ending
refills every once-per-scene pool at the table and a card listing twenty
counters is not a record of anything that happened. Muting is **per actor** and
**counted**, so the rest of the table goes on being watched while one character
rests, and two overlapping scopes cannot have the inner one un-mute the outer's.

Two cases are deliberately **not** muted, and both put a ledger card beside a
plate rather than instead of one. A claim button pressed three hours later
changes the sheet on a card nobody is still looking at: the plate *offered* a
Hope, the ledger records that it was taken. Paying for an Experience is the
same argument at one second's distance — the plate draws the term in gold,
which says it was bought, and the ledger says what it cost and what is left.
Both stay, because a plate is a statement about a *roll* and neither of these
is. It is the judgement call in here most likely to want revisiting at a real
table, and it is a `muteLedger` call away either way.

**The gate is who pressed the button.** `update*` fires on every connected
client, and posting from all of them is one message per player. The initiating
client is also the only one whose `preUpdate*` ran, so it is the only one
holding the before-state — the two conditions are the same condition, which is
what makes it safe rather than merely conventional.

`changeLog` is a **world** setting, on by default. A per-client switch would let
one player opt out of being seen, which is the opposite of the point; a
per-client switch to opt out of *seeing* would leave the GM alone with it. One
decision for the table, and the GM's — `pool.css`'s argument about the Fear HUD,
arriving in chat.

Characters only. An adversary's Stress is the GM's working state and belongs on
the GM's side of the screen. Gold is not watched either, and the boundary has a
principle rather than being an oversight: the set is *the four printed tracks
plus the two things you do to a card*, which is exactly what the sheet's rail
and loadout show. Equipping is out for the same reason.

## The Fear HUD

Fear had a complete model and no surface. `settings.ts` has owned the number
since the beginning — world-scoped so it belongs to the table rather than to a
token, GM-writable, capped at twelve — and until now the only way a human could
read it was `game.daggerheart.fear.get()` in a macro. A pool the rules ask the
GM to keep *visible to the table* was, in practice, a number one person could
look up. `styles/pool.css` had been shipping the entire `.hud` block, in
`system.json`'s `styles` array, drawing nothing, for as long as the system has
existed.

So this is `src/module/fear-hud.ts`, and it is a wiring job rather than a design
one: `design/pool.js` had already drawn the strip, and `design/hope.html`
studies it live under "IN THE HUD".

**It docks in the chrome rather than opening in a window**, and the difference
is not convenience. A surface you have to open is shut almost all of the time,
and the whole claim this component makes is that the table can see the pool
without asking anybody for it. Which is also why there is **no setting to hide
it from players**: `pool.css` argues the point in its own comments, and a switch
to turn it off would be this system offering to break the rule it drew the
component around. Players get `FEAR_HUD({gm:false})` — the same strip with the
steppers taken off, 485px against the GM's 521 — and the **tally is on both**,
because a GM says "I have four Fear" out loud and neither of them should have
to count pips to do it.

The dock is `#ui-top`, and the two supported generations put rather different
things there: on v13 it holds the scene navigation, so the strip lands under
the scene tabs; on v14 the navigation has moved to `#ui-left-column-2` and
`#ui-top` is a centred column holding little else, so the strip lands
top-centre. Both are the same claim — above the canvas, never collapsed,
competing with nothing — which is why one selector serves both rather than a
version check choosing between two docks.

**The strip is rendered once and driven afterwards through `setPool`**, the
contract `Gems.svelte` and `Marks.svelte` already keep on the sheet. Rebuilding
the markup would cut off a spent pip's afterglow mid-fade and restart the
pool-wide `--i` ramp, which is the thing that sells twelve as worse than
eleven. Nothing here holds a copy of the number: `daggerheart.fearChanged`
fires on every client from the setting's own `onChange`, so the pool is read
from the setting and the strip is only ever told what it now is.

**The pips are a readout, not a control.** Hope's are clickable on the sheet
because there they are the only control; here there are dedicated steppers, and
a readout that is also a control is a misclick swinging the pool six points
mid-session.

**And it refuses out loud.** `setFear` clamps, and a clamp answers by doing
nothing — so the bounds are tested before the write and a press that cannot
move plays `.pool.deny`, the same shake `refusePool` plays on the Hope gems.
That in turn retired a notification: `payFearFor` used to warn that the pool was
short, which is a panel explaining itself over the top of the number that
already said no, and it only existed because until now there was **no number on
screen to say it**. It fires `daggerheart.fearRefused` instead, a hook rather
than a call so the roll path does not reach into a UI module. Only a GM rolls an
adversary, so the flinch always lands on the screen that pressed the button.

**`.hud` is the fifth class-rewrite**, after the drag proxy, the context menu,
the roll popover and the rules panel's peek host — `port-design-css.mjs` turns
it into the compound `.dh.hud`, so the element wears both classes and takes its
palette from one and its shape from the other. Here the compound is not merely
the pattern but the safer form: `hud` is a name Foundry uses for its own
furniture, and the descendant `.dh .hud` the scoper would have written would
match any of it that ever landed inside one of our roots.

**Two facts about the dock are Foundry's, and they live in `frame.css`** with
the rest of the application's furniture rather than in the ported component.
`#ui-middle` is `pointer-events:none` — Foundry's own rule, so the top and
bottom bands do not eat clicks meant for the canvas, with each real control
switching them back on for itself — and inherited unchallenged it leaves the
steppers looking enabled and doing nothing, which has no visual symptom
whatsoever. And `#ui-top` stacks its children flush against the top edge, where
a chamfered dark strip reads as a browser artefact rather than as an object.

### What the study page could not see, a third time

The stepper is the one control in this component that genuinely *is* a button,
and `design/pool.css` had never carried the reset `make.css` and `prep.css`
both had to learn. Foundry's `elements` layer sizes every `<button>` to
`--button-size` **with a matching `min-height`**. Our sheets arrive unlayered
and unlayered beats layered, so `height:15px` won on its own — but there was
nothing of ours for the `min-height` to beat, and **a floor with no competitor
simply applies**. Two steppers at 28px stand 59px tall beside a 24px pip row:
the strip was 77px tall instead of 51, half again as large, and nothing about it
looked broken enough to send anybody to read the CSS. `min-height` and
`max-height` are stated rather than zeroed, because 15 is a measurement and 0 is
only the absence of somebody else's.

`border-radius:0` is the same argument one property along. Foundry's rule rounds
every button to 4px, and nothing in this system has a rounded corner — the
family mark is a chamfer, a corner *cut off* rather than turned, and the two are
opposite claims at the same size.

`tools/verify/` carries a stand-in `#ui-middle` and `#ui-top` beside its
stand-in `elements` layer, for the reason it carries the layer at all: the
environment is part of the component and a study page has to bring it. It
asserts four things — that the strip resolves its ground and Fear's hue while
standing outside every `.dh` root, which is exactly what the compound buys and
what a wrapper would have hidden; that it takes its pointer events back; that a
stepper measures 20×15 and not 28; and that the strip is **521px**, since twelve
pips at 24 on a 7px gap make this the widest fixed object in the system and its
width is therefore a decision rather than an outcome. The section is
deliberately not `.stage`, because that class carries `.stage .dh{width:300px}`
and would have handed the strip the one measurement the check exists to take.

## The three dialogs

This system went a long way without a modal, on purpose: a sheet you press
beats a box that asks, and its refusals are answered by the thing that cannot
pay — the Stress track flinches, the Hope pool flinches — rather than by a
panel explaining itself over the top of the number that already said no.

A dialog is allowed for exactly one shape: **a decision with more than one
part, taken once, that changes the sheet underneath it.** There are three, and
`apps/dialog.ts` is the shell all three share. `design/dlg.css` is their look
and `design/dlg.html` is the study page. Foundry's own dialog chrome is
restyled by hand in `styles/frame.css`, next to the sheet's, because a window
frame is the *application* and not the thing inside it.

**Taking damage** (`apps/damage.ts`, `.hit` in `dlg.css`). Damage is not a
subtraction: a number falls onto a ladder of thresholds and becomes one, two,
three or four Hit Points, and the choice in it is how far down that ladder you
are willing to pay to fall. That choice is made *after* seeing the number,
which is the whole reason armour is a slot rather than a stat.

**An Armor Slot moves the damage one rung down the ladder** — Severe to Major,
Major to Minor, **Minor to nothing** — rather than subtracting the Armor Score
from the number. That is the printed rule and it is not the obvious one: Armor
Score is how many slots you *have*. The old code subtracted, which made heavy
armour absurd against small hits and useless against large ones, silently in
both directions. `reduceSeverity` then floored at Minor, which is an invention
and not the rule — the printed parenthesis says "Minor to Nothing" — and it
cost exactly the case it looks like it protects: against a Minor hit the
dialog computed a ceiling of zero slots and refused to let you spend on the
one hit armour completely negates.

**It draws the sheet's own band.** `DAMAGE()` from `ui/mark.js` is the builder
the rail calls, so the thresholds you decide against are the ones you have
been reading all session, tick marks and all. The Hit Point row comes fused to
it and doubles as a forecast: the boxes this hit would take are drawn on it,
so a slot buys a box back in front of you.

**The zone the hit lands in is the headline, and everything else gets out of
its way.** The dialog held every capability it holds now and ranked none of
them: the amount, the band, the forecast, two steppers, a three-way ledger, a
rule line and a panel of cards, all at one weight. So the landing zone is at
full strength with a gold ring and a gold sill, every other zone is dimmed,
and the verdict is set at display size beside the number. Nothing was removed
— a dialog that answers fewer questions is not a simpler dialog, it is a
dialog you have to leave — but `Paid with` sits at reduced weight until it
holds something or you reach for it, because on the overwhelming majority of
hits the only control anyone touches is `Reduce by`.

**Spending armour is drawn as travel back down the ladder.** `.was` — the
escaped zone, struck out with the wound's own mark — said *where you were*,
and a second static state is a thing to compare rather than a thing to read.
So a gold arrow runs in its own lane above the band from the struck zone back
to the one the hit now lands in, carrying the from→to sentence on its shaft,
and replays only when the journey itself changes: typing in the amount field
must not re-fly it. The geometry is measured off the zones' own rects in JS
rather than computed, because the zones size to their contents. "Minor →
Nothing" runs off the band's left edge, which is the one case where the
destination is not a zone.

**Incoming outweighs existing.** The forecast used to be drawn at half weight
against fully-marked history, which is exactly backwards: what is already
marked is settled and what is incoming is the thing being decided. Marked
boxes recede, the forecast is at full weight and glows.

**Rungs and payment are two controls**, because only one rule joins them. An
Armor Slot buys one threshold, and that one is wired — pressing `+` on Reduce
takes a slot while you have one, so the printed case is a single press.
Everything else that softens a hit is printed on a card and cards charge what
they like (Takaia Armored Beetles is a Stress, and a Hope to keep them), so
`Paid with` is a separate ledger of Armor / Stress / Hope. Fusing the two
would mean this file inventing a price for every such card. Nothing is
enforced; the line under it says what the rules give you and says when you
have gone past it.

The dialog block is `.hit` and **not** `.dmg`: `.dmg` is the fused damage
track in `mark.css`, and both load into the same `.dh` root where scoping does
nothing. That would have been the third instance of the bug that renamed
`.die.win` and `.dfn .pl`.

**Who it lands on** is `apps/targets.ts`, and it is not the target reticle. A
GM means the tokens they have *selected*; a player means their own character.
The reticle is what both of them point at the thing they are about to attack,
so reading damage off it hit the wrong side of the exchange for everybody —
press "apply damage" as a player and you marked the enemy's Hit Points. Each
recipient is asked separately and sequentially. Dismissing applies nothing, so
the claim button stays live rather than burning.

**Levelling up** (`apps/advance.ts`). See below.

**Resting** (`apps/rest.ts`). **A move is taken, not ticked.** This was a form
— check the moves, press OK, everything at once — and that is the wrong model
for downtime in a way you only notice at a table: *Tend to Wounds rolls a
die*, and clearing two Hit Points when you needed five is exactly the moment
you decide to spend your second move on wounds again rather than on armour. A
form resolves all of that after you have stopped being able to use it. So each
move rolls and applies on the press, the rail moves while the dialog is open,
and a ledger fills in behind you. Taking the same move twice stops being a
special case: a checkbox is on or off, a card can be pressed again. There is
no Cancel — everything has already happened — only Done, which posts one card
for the whole rest.

**A move is a square.** It is `.dt`, a **sibling** of `.tile` rather than an
instance of it, and that is the whole argument: a tile is assembled out of a
domain, a sigil and a level, and a downtime move has none of the three.
Handing `TILE()` a graphite gear kind to get the shape would invent an object
rather than draw one.

It keeps the family's tier bar and drops the family's **gold seam**, which is
the one piece of the grammar that does not survive the move. That rule divides
a picture from a panel and on a card that is a real division — somebody's
painting above somebody else's paragraph. Here there is one object, a number
and the thing it is the number *of*, and a line across the middle makes two of
it; a hard-edged dark ground on top then makes the upper one a box the numeral
is stuck inside. So the plate's ground fades into the paper it sits on, and
with no edge there is nothing for the number to be inside. Half the tile's
height rather than a fixed pad, so the slack around the numeral is
proportional and survives the five-track width a long rest asks for.

It was a full landscape card, and the *shape* is what changed. Four cards at
104px, stacked, is four hundred and fifty pixels of dialog spent before the
first press — and everything a rest is actually about happens below them, so
the ledger, the tally and the cards that change the rest were all under the
fold behind a deck that had answered nothing yet. The squares sit in one grid
row, one track per move stated inline rather than left to `auto-fit` (a long
rest has five moves and `minmax` puts the fifth alone on a second row at a
quarter width), and the whole deck now costs about what one card did. The rule
swaps in over the name on hover, because at that width either is readable and
both are not — absolutely positioned rather than expanding, since a grid you
are aiming at must not reflow under the pointer.

**The value rolls in the plate**, where a card would carry its artwork, and it
rolls as a **reel**: candidate totals scrolling to a stop. It used to be a die
— the chat plate's own `.die`, and with Dice So Nice installed a real
three-dimensional one posed and spun in the tray by a second `DiceBox` over a
second `DiceFactory`, with a generated table of face normals behind it. The
square retired both. A die drawn small enough for a hundred-pixel tile is a
chip with a numeral on it — the geometry that made it a die is below the
resolution of the box — and a WebGL context is a great deal of machinery to
put behind a numeral nobody watches land. `dice/inplace.ts` is gone.

The reel also dissolves the face-versus-total rule rather than answering it. A
die showing 6 on a d4 is precisely the lie the plate's `data-mx` exists to
prevent, which is why the silhouette had to carry the *face* and the caption
the total; a reel is not a d4 and claims nothing, so it lands on the **total**
and the caption says where the total came from. The candidates are drawn from
the range the roll could have produced and never include the answer before the
last cell, or the reel reads as having stopped and then moved again.

It travels on one CSS transition, and the start value is flushed with
`offsetHeight` rather than a `requestAnimationFrame` — deliberately, and for
the reason the swap's `.lift` reaches for `setTimeout`: rAF does not fire in a
tab that is not painting, so a rest opened on a background window would sit on
a reel that never lands, never applies, and never resolves the promise the
press is awaiting. A reflow is unconditional and synchronous.

Resolve and apply are two beats, three hundred milliseconds apart: the number
settles, then the effect lands and the ledger line writes itself. They used to
happen in the same frame, which meant the number you were watching for had
already been spent by the time you read it.

**The die survives on the card the rest posts**, and only there. A row used to
be a name, a small gold "1d4+Tier = 5" and the sentence "cleared 5 Hit Points"
— three statements of one fact, none of them loud, and the one anybody scrolls
back for was the middle number of the sentence at body size. It is the plate's
grammar now: the die on the left, the name in the middle, the amount at
display size with its unit under it, each row drawn in its own track's
material. `--wound` bleeds, `--strain` is scored, `--plate` fractures, gold is
Hope — the one place this system suspends "hue means domain", and the place it
is worth the most.

Two things about that row. The die shows the **face** while the numeral shows
what it was worth, which is the distinction the dialog's reel is allowed to
dissolve and a card with a die drawn on it is not — `Outcome.face` exists for
this and nothing else. And the die's colours have to be set through a selector
that *reaches the die*: `.die` declares `--rimc` and friends on itself, so a
value inherited from the row would lose to it. `DIE` builds `<i>`/`<b>`/`<em>`
and no `<svg>`, so unlike a posted card this survives storage and needs no
redraw on render — which is also why its size is a stylesheet rule and not an
inline `style`.

**Undo is per ledger entry**, and it gives back what was *written* rather than
what the move is worth. Tend to Wounds clearing four Hit Points when only two
were marked has to return two, so the outcome records `clearTrack`'s real
result rather than its argument. The roll is not kept — re-taking rolls again,
because undo means "that did not happen" and not "let me keep the number".
Nothing has been posted at that point, so there is only actor state and the
ledger to reverse, and it is not offered after Done.

Two moves is the printed number, and `restAllowance` reads it off your own
cards — a Celestial Trance says three, and the hint names the card so the
number does not read as a bug in the sheet. Nothing enforces it: a campaign
frame, a GM ruling and a long-term project all move it, and refusing a third
move would send the table to do the whole rest by hand. That parse is
deliberately shallow and only ever moves a *hint*; the rule itself is printed
verbatim underneath either way. Both rests also refresh every pool whose scope
this rest is — see "Counting what a card counts" — which is the rule nobody
remembers, and which each rest kind now honours separately.

Neither the damage nor the rest dialog automates a feature, and that is the
shape of `apps/rules.ts`: it finds every rule this character carries that
*mentions* what you are about to do and prints it verbatim underneath. Parsing
English rules text into behaviour is how a system starts quietly getting rules
wrong; this is a smaller promise that stays true for a feature the GM wrote
last night.

**What it found was too much, and in two different ways.** Mentioning a topic
is not the same as bearing on the decision, and both panels were drawing
everything at one weight.

On damage the extra category was *passive maths*. `ARMOUR_RX` matched armour,
severity, thresholds and "damage you take", which sweeps in a weapon's
Protective ("+1 to your Armor Score") and Bare Bones ("your damage thresholds
equal your level"). Both are real rules and both were **already applied**
before the dialog opened — the Armor Score is the purse and the thresholds are
the band the hit is being measured against — so a card printing them under a
heading promising a way out asks the reader to re-check arithmetic the sheet
did. `REDUCE_RX` matches *offers* rather than topics: spending a slot,
reducing a severity or a damage number, halving it, resisting it, marking
something else instead, or anything firing at the moment the damage arrives. A
positive test and not a veto, because a rule the sheet has already counted has
nothing to say in the imperative.

On resting the extra category was *receipts*. Celestial Trance changes the
rest and you have to read it to use it; Deft Maneuvers says "once per rest",
which only means the rest gives it back. Both mention resting. So the second
kind drops into the panel's other lane — `.rf` in `dlg.css` — and they are
told apart by removing the recharge clause and asking again (`rechargeOnly`),
so a card that says "once per long rest, when you take a short rest…" still
counts as changing the rest. That lane's rows come from two places, and they
are two different kinds of knowing: an Item with a tracked pool is a **fact**,
and the rest is about to fill it, so the row draws **its actual counters** — the
same chits the card carries, at the same size the loadout draws them, a readout
rather than a control because pressing one inside the dialog that is about to
refill it is not a thing anybody means. A rule that only says "once per rest" is
a **reading**, and gets a row with no count because there is no count to be
honest about.

**Every rule is a line, and the lanes differ in weight rather than in shape.**
The bearing lane drew a full tile per rule and the recharge lane drew lines,
and a character three sessions in has four or five rules bearing on a rest:
five tiles is five hundred pixels of panel under a dialog whose controls are
all above it, and the reader is scrolling a deck to find one name. `.rl .ln` is
now the whole grammar and `.rf` only says its name a shade quieter, which is
what a heading is for.

**What a line opens is the one distinction left worth drawing.** A rule in this
panel is either printed on something or it is not. A **class feature** — the
Rogue's Cloaked, a knack the GM wrote last night — is not: you cannot spend it,
move it or lose it, the text is the whole of it, and the sheet stopped drawing
a class card for exactly this reason. So the line grows the rule underneath
itself. A **domain card, ancestry, community or subclass** — and the weapon or
armour you are wearing, which the ask did not name and which belong for the
same reason — is an object sitting in a loadout the player has been looking at
all session, and the question the damage dialog asks is *is there something in
my hand that gets me out of this*. So those lines **peek the card**. `HELD` in
`rule-cards.ts` is that list; a rule whose document cannot be found back at all
falls to the text side, because inventing a card around one would claim there
is something to pick up. `feature` Items are on the text side too — that
subtype has never had a card, which is why the sheet draws it as a pressable
row of rules text.

**And the peek is the sheet's peek**, not a second thing resembling it: `CARD`,
`.peeklayer`, `.pkc`, the 262px 5:7 card, right of the row and flipped when
there is no room, centred on the row and clamped, hover shows and click pins.
A player who learned that gesture on a spine has learned it here. The card is
drawn *as printed*, features this rule is not included — the row already says
which rule matched, and the card's claim is "this is the object it is printed
on", which an ancestry card with one of its two features quietly removed is no
longer.

It was the landscape tile for a while, and that was wrong twice over. A tile is
the **handle** for a card — it is what a loadout row is — so putting one where
a card would go offers the handle to somebody already holding it. And it was
drawn *inside* the row, which is the only place a tile fits and the whole
reason it got chosen; a card does not have to live in the row, so it does not.

**A dialog cannot reach the screen with `position:fixed`, and that is
Foundry's doing rather than ours.** Every `.window-content` carries a
`backdrop-filter`, and a filtered element is the containing block for its own
fixed descendants — so a layer inside a dialog is framed by the dialog no
matter what it claims, and it fails *quietly*: the layer reports `fixed` and a
538px box, and the card flies off the right of the screen to coordinates that
were correct for a frame it does not have. So the host goes on `<body>`,
wearing `dh`, which is the fourth instance of the pattern the drag proxy, the
context menu and the roll popover already use, and `.peekhost` joins them in
the port script's class-rewrite list. Only the *host* wears `dh`; the layer and
its cards are descendants of it, so every rule `sheet.css` writes for them
lands untouched — which is the difference between hosting the sheet's peek and
restyling a copy of it. A `MutationObserver` on `body` takes the host away when
the dialog goes, since nothing else would: it is not a child of the window
Foundry removes.

The **text** rows still grow in place, which is the opposite of the move
square's choice above and for the reason that governs both: a deck is a grid
you are aiming at and must not reflow under the pointer, while this is the last
thing in the dialog with nothing below it to push. `grid-template-rows` from
`0fr` to `1fr` is what animates a height nobody has measured.

**The art plate was also empty, and had been all along.** `art` is
`--art:url("systems/…/x.webp")`, double quotes and all, and `rule-cards.ts`
interpolated it straight into `style="…"`: the first `"` inside the url ends
the attribute, the rest becomes stray attributes, and the card falls back to
the sample photograph `tokens.css` ships as the default `--art`. It reads as a
card with the wrong picture rather than as broken markup, which is why it
survived. `post-card.ts` has had the escaper, and a note saying exactly this,
since cards were first posted to chat; the later file simply did not use it.

**And where the rule came from a card, the line peeks the card.**
`apps/rule-cards.ts` is the other half: it resolves a `Rule` back to the Item
it was read off and builds the panel. Finding and drawing lived in one
file while there was one caller; there are two now, and the second wanted
different markup out of the same search. `rules.ts` therefore still carries no
document reference on a `Rule` — the resolver finds the Item back from the
`source` and `name` that `rulesOf` wrote them from. The panels are built before
the dialog opens, because sigils load asynchronously, and injected in `wire`,
because a card carries `<svg>` and DialogV2 strips that out of `content`. The
cards are rendered into the layer at that moment rather than on demand, because
`fit()` can only measure a card that is in the document — which is also why
they are parked with `visibility` and not `display`.

## Levelling up

Marking an advancement box now does the advancement. It used to write the box
and stop, so the panel was an honest ledger of things that had not happened —
"permanently gain one Stress slot" marked, and the Stress track eighteen
inches away still six boxes long.

The nine printed options split in two, and the split is the design:

- **Numbers** — a Hit Point slot, a Stress slot, +1 Evasion, +1 Proficiency.
  These are not written at all. `data/actors.ts` derives them from the marks
  via `advancementTally`, so the box *is* the record: mark it and the rail
  moves, unmark it and it moves back, and the two can never disagree because
  there is only one of them. A write-on-press design cannot be undone.
- **Decisions** — which two traits, which two Experiences, **which domain
  card**. The sheet cannot guess and must not. These ask, apply, and store the
  answer in `system.advancementChoices` so taking the box back undoes precisely
  what that box did.
- **Acquisitions** — a subclass card, a second class. These only mark, because
  a dialog is not a better compendium; you drag the document in, which is a
  gesture this system already has.

**The domain card crossed that line**, and the reason is that it was the only
acquisition with a *closed* set of legal answers. "Drag one in" is right for a
subclass card, which is one of three the compendium already sorts by class, and
for a second class, which is nine documents. It was never right for a domain
card: what is legal is your domains — plural, and multiclassing makes it three
or four — crossed with a ceiling that is **not your level but the tier's**.
`tierTopLevel` is that ceiling, derived off `at` rather than stored so it cannot
disagree with the printed `levels`, and the parenthesis it encodes — "(up to
level 4)" — had only ever existed as prose in the option's own label. Take tier
2's advancement at level 7 and you still get a card of level 4 or lower, because
the choice belongs to the tier that was owed it. So the sheet knew the whole
rule, the box marked it, and nobody was told; marking it now asks which, exactly
as the trait option does.

**And the row prints its answer.** Eight of the nine options are their own
record — mark a Stress slot and the track is a box longer, and the two cannot
disagree because there is only one of them. The ninth hands you a *document*, so
a mark on it is true and useless at the same time: it says you are owed a card
and not which, nor whether you ever went and got it. `.adv .row .got` is the card
it took, read off the **snapshot** rather than off the document so a card deleted
from the gear tab takes its claim back down to unchosen.

**A box marked before any of this existed says so and offers the same picker**,
which is the whole of the migration — nothing is repaired behind anyone's back,
because the card may well be on the sheet already, dragged in by hand months ago.
So the picker offers both halves of the honest answer: take one from the
compendium, or **name the one you already hold**. Adopting creates nothing; it
records that this box is what paid for that card. `unclaimedCards` is what it
can offer — every domain card that none of the three records (`creation.granted`,
`advancementChoices`, `levelCards`) has spoken for — which is exactly the set a
player put there themselves, and it is empty for anybody made since creation
existed, so the second heading only appears when there is something under it.

## The card every level gives

**Step 4 of the printed level-up, and this system had never handed one over.**
"Acquire a new domain card at your level or lower" sits *beside* the two
advancement choices rather than being one of them, and the advancement table has
been saying so out loud in a word nobody read: "choose an **additional** domain
card" is additional to *this* one. Two rules were missing rather than one, and
this is the larger — it fires at every level where the option fires once a tier.

`applyLevelCards` asks for it, once per level newly reached, from `setLevel`
after `applyTierEntry`. An **event**, recorded for `tiersEntered`'s reason: a
level typed down to 4 and back up to 5 has not reached level 5 twice.

**`system.levelCards` is three-valued and the third value is the whole
migration.** *Absent* is a level reached before the record existed; it is owed
nothing and drawn nowhere. *Null* is a level reached and not yet spent. A
`TakenCard` is the answer. So the loop runs from the level you **were** rather
than from level 2 — `setLevel` reads `sys.level` before the write — and a
character who has been level 6 all year is asked about level 7 and about nothing
else. Nothing is guessed and nothing is seeded, where any amount of inferring
"they must already have these" would have been doing the same thing less
honestly on the way to the same place.

**Declining is free**, and the panel is what makes it so. A level standing at
null says so on the advancement tab and offers the same picker, so the prompt is
a convenience and the record is the debt. One refusal ends a run of them: four
levels typed in at once is four dialogs, and somebody who cancels the first has
said what they think of that.

It is **its own panel** above the tier tables rather than rows inside them,
because those are the printed advancement table — a rules table this system
copies — and this is a ledger of what happened to you. The level stands where a
row of slot boxes stands and is a numeral rather than a box, because there is
nothing here to mark: a level is not something you choose to have.

The ceiling is **the level that owed the card**, not the level you are now.
"At your level or lower" is a clause about the moment it was due, which is the
same reasoning that makes the advancement option's ceiling the tier's top.

Which is also why what unmarking gives back depends on which happened. A card
this box **made** goes with it; a card it **adopted** is released and the
document stays, because deleting it would be the panel binning somebody's
document over a rule it was not asked to police — `cascadeOf`'s argument, from
the other end. `TakenCard` carries that flag alongside the id, and the name too,
so a record can name a document that has gone.

**And the one unmark that destroys a document asks first.** Every other give-back
on this tab is a number going back where it was, and the box being the record is
what makes those exactly as safe to undo as to do. A card is not a number, the
gear tab already confirms deleting one by hand, and unmarking is how you correct
a mis-click — so it is the same act with the same manners, naming the card.
Declining writes nothing at all, so the box stays marked rather than marked and
hollow.

## Picking a domain card

`apps/domain-cards.ts`. **Three surfaces want the same thing for three different
reasons, and the reason is the only thing that differs between them** — so the
ceiling is an argument rather than something worked out inside, and a function
that decided which of the three it was serving by inspecting its caller would be
three rules pretending to be one.

| caller | ceiling | records |
| --- | --- | --- |
| the advancement option | your level or the tier's top, lower wins | against the box |
| the level card | the level that owed it | against the level |
| the vault's **+ card** | your level | nothing — nothing bought it |

The third is why the picker is not in `advance.ts`: a vault button reaching into
a file whose first line reads "levelling up, applied rather than recorded" would
be lying about what it was doing. It is the drag-in gesture with the compendium's
own filter attached — the gesture has always worked and has always asked you to
know which of 189 cards you may legally take. `ed` and not `edit`, the same call
the gear tab's "+ new" makes: taking a card is a deliberate act in a way a click
on a number is not. It suppresses the adopt half outright, because a card already
on the sheet is not something to add.

**Only legal cards are offered**, which departs from `pickTwo`'s
constrain-the-offer-and-say-why for a reason that is arithmetic: 189 cards drawn
dead with a sentence each is not a list anybody reads, and the two rules are
already stated in the hint above it. What it keeps from that rule is that it
never validates after the fact.

**And every row peeks the card.** `pickTwo`'s rows are a trait and an Experience
— a name, a number, nothing else to know. These stand for *printed objects*, and
a name with "Grace · Lv 2 · Recall 1" beside it is the one thing a domain card is
not: its whole identity is a paragraph of rules text, which the row cannot carry
at any width without becoming a card badly. So it becomes one properly — the
sheet's own peek, `CARD` into `.pkc` through `sheet.css`'s `.peeklayer`, exactly
as hovering a spine in the loadout behaves.

`apps/dialog-peek.ts` is that machinery, lifted out of `rule-cards.ts` when the
second caller arrived. Nothing in it ever knew what the rows meant; it wants a
root to delegate on, a layer to draw into and a selector naming which rows peek.
`wireRulePeeks` is now one line on top of it, because callers should go on asking
for the thing they want rather than for the machinery underneath.

**The one thing the second caller needed differently is `pin`,** and it turns on
a gesture rather than a look. Click-to-pin is right where the row is *inert* — a
rules line exists to be read, and a hover peek dies the moment you move toward
it. It is wrong where the row **is the control**: in the picker a click chooses
the card, and a click that both chose a card and parked a 262px copy of it over
the list is one gesture doing two things, one of them in the way. It governs the
Escape key too — with nothing pinnable there is nothing for Escape to dismiss,
and swallowing it would take away the dialog's own way out.

The cards arrive in `wire` rather than in `content`, because they carry inline
`<svg>` sigils and DialogV2 strips SVG out of `content` exactly as Foundry strips
it out of stored chat message content — and `fit()` cannot measure a card that is
not in the document either, so both problems have the answer `damage.ts` already
reached.

Because HP and Stress are derived, the adjust tab's fields are the **base** —
what the class hands you — and advancement is added on top, exactly as an
equipped armour overwrites `armorSlots.max`.

Tier entry is separate and is an *event*: levels 2, 5 and 8 hand over an
Experience, and the two upper ones clear every trait mark, which is what
reopens all six traits. `system.tiersEntered` records which have been paid
out, because a level typed down to 4 and back up to 5 has not reached tier 3
twice and should not collect a second Experience for a typo.

## Conditions

`CONDITIONS` in `config.ts` registers the three the **core rules** name —
Vulnerable, Hidden, Restrained — plus thirteen the **cards** do, as Foundry
status effects, with marks in `assets/conditions/`. Foundry's own list is
blinded, deaf, paralysis and prone, and none of those words appear in this
game; `dead` survives the replacement because it is what
`specialStatusEffects.DEFEATED` points at.

"Daggerheart has no poisoned, no prone, no blinded" is still true and was
never the whole claim. What this list said for a long time was that three was
all of them, and a sweep of the four packs says otherwise: sixteen cards put a
named state on a creature and then say **"While X"** followed by a rule, which
is exactly the shape the first three have. Cloaked is the Rogue's core class
feature and is on six cards. Marked for Death is the Assassin's and is on
five, with three Executioners Guild cards turning on it. Hexed is the Witch's.
The others are Spectral, Invisible, Enraptured, Corroded, Stunned, Charged,
Drained, Horrified, Silenced and Ablaze.

**The test is that shape and nothing looser.** A word the fiction produces is
described; a word a card *defines and then refers back to* is tracked.
"Temporarily Enraptured" is a rule with a duration and a consequence; "you
know somebody who owes you a favor" is not. Two of them live on a document
that also carries a counter, and that is not a duplication: Arcane Charge is a
Charged **state** — "you stop being Charged at your next long rest" — and a
one-use budget, and the state belongs on the token where the table can see it
while the budget belongs on the card.

Vulnerable is also derived: marking your last Stress makes you Vulnerable
until you clear one, and that is the one condition the sheet can know on its
own. `syncVulnerable` is idempotent and gated on the active GM, for the reason
the Fear claim is — the hook fires on every client and three clients agreeing
to write the same effect is three writes and a race.

**Vulnerable does not touch your own dice, and the sheet must not pretend it
does.** It gives advantage to rolls made *against* you. A full Stress track
briefly put a locked −1d6 chip in the roll popover on the reading that being
Stressed out rolls badly; it does not, and that half of the rule belongs to
whoever is attacking you. The `forced` mechanism in `prep.js` stays — it is
the right shape and printed rules do impose disadvantage you cannot decline,
Galapa's Retract among them — but nothing on the character sheet feeds it
today. The adversary half is not wired either way.

## 3D dice

`dice/dsn.ts`. The plate draws its own dice and draws them well, which is why
the module is off by default — but off by default is not off, and a table that
turned it on got two identical house-default d12s tumbling next to a card that
had just gone to some trouble to say which was which. The whole duality roll
is "did gold beat violet".

Four *roles*, taken from the values the plate already uses, and split the
way the plate splits them. **Hope and Fear are read as a colour** — you are
asking which of two hues came up higher, not adding two numbers — so they are
`frosted`, a real transmissive material in that module, which carries the hue
through the body of the die rather than painting it on the surface. Their
numerals are white on both, because a numeral in a *third* colour is a third
thing to decode on a die whose whole job is to be one of two, and they are the
two sets with `emissiveLabels`, which lights the label texture and nothing
else: the number glows faintly from inside the casting, which is what you want
when the die is face-down in shadow behind another one. **The advantage pair
is read as a number**, so it is opaque `velvet` — matte, with a sheen along
the edge as it turns — and a *value* pair rather than a hue pair: pale with
dark numerals, dark with pale ones.

Both textures are ours and generated rather than chosen — see
`tools/make-dice-textures.mjs`. Every texture the module ships is a picture of
something (clouds, marble, a leopard), this system draws no pictures of
anything, and a d12 wearing stained glass next to a plate made of two flat
colours is the plate losing an argument it did not enter. So the colour map
never darkens the die by more than about eight percent and all the character
is in the bump, where it costs the hue nothing. The bump and the label glow
both need the module's own "realistic lighting" on; without it the colour maps
still apply and the rest is quietly dropped.

**What they draw is a chamfer**: grooves following the edge of the face, plus
small diamonds — the mark, the domain pip, the same rhombus everything else in
this system is cut from. One at every corner rather than the design's single
bottom-right, because a die arrives at any rotation. The first attempt was
seeded value noise, which was a picture of nothing in particular and read as
dirt.

**Hope and Fear do not share it, and the first split was too fine.** One
texture for both meant hue was the only thing telling apart the two dice the
whole roll turns on. The first answer was Hope keeping an octagon's four
straight runs while Fear kept the whole ring — a real difference, and one you
cannot see across a table: both were three concentric rules and a bare corner
is not a signal at that size. The two figures are **orthogonal in direction**
now, which is the largest difference two line cuts can have and survives any
rotation, any distance and any light.

**Fear is the closed cut**: three rules following the face all the way round,
insets 0.10 / 0.20 / 0.30 of the inradius, the weight falling as they step
inward, which is how this design draws a border everywhere else. The mark is
cut **into** the innermost rule at every corner, so `max()` fuses the two into
one figure. Concentric, layered, closed. Fear is not yours and does not leave.

**Hope is the open cut**: one rule, on the innermost of Fear's three, and let
go of at every corner — the same diamond stands free in the gap rather than set
into the line, and out of each gap comes a **burst**, three grooves along the
corner's own bisector running outward through the band Fear fills with rings.
Radial where Fear is concentric. Hope is the one thing on this sheet you hold
in order to spend — the rail's whole gesture for it is letting it go — and a
figure whose every line is leaving is the surface saying so. One line is a spur
and three is light; the outer two are shortened by their own cosine, because a
ray leaving at an angle meets the face edge sooner than one going straight out.

Both come off **the same discriminator**, which is the one piece of the octagon
worth keeping. Take the two largest half-plane distances to the face's edges:
in the middle of a side one dominates, at a corner two tie. So the difference
*names the run a point stands on*. Fear ignores it, Hope opens its rule where
it is small and puts the burst where it is largest. One number, two readings,
and it works on a triangle, a square, a pentagon and a kite without being told
which it is. The advantage pair takes Fear's figure at half depth, because
nothing is being asked of a d6 except its number.

**And there is one of each per shape, which retired a compromise rather than
complicating one.** `createTextMaterial` draws the texture into one 256px atlas
tile **per face**, so a single motif had to survive being clipped to a square
(d6), a pentagon (d12) and a triangle (d20) — and an octagon was the best
compromise available. It had a price: on a d20 a third of the figure fell
outside the face and was never sampled, and the d4, d8 and d10 were never
considered because nothing of ours rolled one.

A colorset is chosen **per term**, so the die's face count is known at the
moment it is painted. Now that a card can make the Hope Die a d20, that is the
answer: `paint(term, HOPE)` names the role and reads the shape off `term.faces`
itself, and there are six cuts per hue, each derived from **that face's own
polygon**. The polygons are measured rather than guessed — the UVs come
straight out of the module's `DiceModels.js`, binned by atlas tile and averaged
over every face:

| | face | inradius |
| --- | --- | --- |
| d6 | the square, corner to corner — the face *is* the tile | 0.489 |
| d12 | a regular pentagon, apex up | 0.418 |
| d20 | a triangle, apex up | 0.287 |
| d4 | a triangle | 0.284 |
| d8 | a triangle | 0.269 |
| d10 | a kite — tangential, so it has an incircle too | 0.275 |

Everything is built from one function, `insetOf(p)`: for a convex polygon the
distance inward from the nearest edge is `-max_i dot(p - a_i, n_i)` over the
outward normals, so a rule is a level set of it and needs no centre, no radius
and no per-shape arithmetic. The kite gets the same treatment as the square.
Rule *positions* are fractions of each face's own inradius and rule *widths*
are absolute: a bevel is proportional to the face it runs around, and a cut is
a cut. The generator asserts every cut lands inside the face — the check the
octagon could never have passed, and the one that catches a ray lengthened by a
tenth on the shape with the most room landing off the shape with the least.

Colours, numeral, outline, edge, material, font and glow are **the role's** and
identical across all six. A d20 Hope Die is the same die, cut for the face it
has. Only the role's default shape is registered `visible`; the other five are
`hidden`, which is read in exactly one place — `prepareColorsetList`, the
settings dropdown — and nowhere in the render path. So the user's theme picker
still shows the four it always showed rather than fourteen.

Parity between the two hues is enforced on the bump's **flat level and not its
mean**, for the reason the next paragraph gives: that map is also the
transmission mask, so the flat is how see-through the die is, and two duality
dice that are not equally transmissive are not a fair comparison. The means no
longer agree closely and cannot — three closed rules cut away more of a face
than one broken rule and a few bursts do, and that difference is the whole
point of having two figures. The generator prints every mean each run so the
divergence stays a number somebody decided: currently 227.0–227.4 against
223.3–224.8, on a flat of 228 and a floor of 124 on both.

**One finding is about the material, not the finish.** On `frosted`, DSN hands
the bump canvas to the material a *second* time as its `transmissionMap`; the
default with no texture is a white fill, meaning fully transmissive. A flat
bump level of 176 was therefore making Hope and Fear about a third less
see-through than a plain frosted die — a change to the material smuggled in
under what looked like a change to its surface. The flat is 228 now. Only the
gradient reaches the normal map, so relief is unaffected, and the groove picks
the effect up in the right direction: less transmission is more scattering, so
the cut reads as a line of the die's own hue through a body you can otherwise
see into. That is the coloured line, and the files contain nothing but grey.

**`emissiveLabels` had never once fired.** The paragraph above has claimed
since these sets were written that the numeral glows from inside the casting,
and it did not. `generateMaterialData` reads the flag off
`getColorSet(appearance.colorset)`, and by then `appearance.colorset` is
`undefined`: honouring `term.options.colorset` — which is the route we use and
the right one — does it by *replacing* the whole appearance with the colorset
record, and that record carries `name` and `id` and every colour but no key
called `colorset`. The lookup falls through to `COLORSETS['custom']`, which has
no `emissiveLabels`. It is the **only** property lost that way; the colours,
the texture, the material and the font are all read off `appearance` directly
and survived, which is exactly why nothing looked broken. The dice were correct
in every respect except the one that was never running.

`paint()` writes both keys now. `options.appearance` is merged back over the
replaced appearance immediately afterwards, so putting the name there as well
is all the later lookup needs. Confirmed in a live game rather than by reading:
the same d12 through `getAppearanceForDice` → `generateMaterialData` gives
`emissiveLabels: false` with the old wiring and `true` with the new, and the
texture's name is unchanged under both — the shape of a bug that hides.

**The glow beyond the numeral is composited, not configured.** There is no
emissive slot on a texture: `addTexture` loads exactly `source` and `bump`, and
the module's emissive canvas is filled black with only the label drawn into it.
So a third map per die is drawn into that canvas on
`diceSoNiceOnMaterialReady`, tiled at 256 like the other two, `lighten` rather
than `lighter` so nothing on the die can ever out-glow the number. Two limits
worth knowing: that hook is marked deprecated in DSN's own source, and the
whole emissive path is gated on the user's "realistic lighting" — so the
degradation is a die whose numeral glows and whose cut does not, which is also
what a table with that setting off has always had.

The one real emission-map API — `addDicePreset` with `emissiveMaps` — was
investigated and **declined**. Reaching a preset means routing through
`appearance.system`, and a system is the **die**: its model and its geometry,
the thing a table paid a dice-model module for. A finish may not take that. It
is also the more fragile half of the API: presets are per-`DiceFactory`
instance, while colorsets and textures are module-level, so anything that
builds a factory of its own keeps the finish and silently loses the preset.

Three API notes, all learned the hard way. `term.options.colorset` is what DSN
checks *first* and it wins over the user's own preferences;
`options.appearance.colorset` is only consulted last and is dropped silently
if the name is unregistered — which is why writing both is belt and braces
rather than redundancy. Painted after evaluation and before the message,
because `options` travels into storage with the roll. And **a texture path is
rooted at the user data directory**, not at the system — `absolute()` takes
`systems/…/assets/x.png`, and handed a bare `assets/…` it produced a 404 whose
rejection took the whole registration down with it in a `Promise.all`, so the
*colours* went missing and the dice came out the module's default brown with
nothing on screen to suggest a missing image was the cause. Each texture is
allowed to fail on its own now.

The `diceSoNice` setting finally suppresses the dice rather than only the
sound, via `diceSoNiceMessagePreProcess` — the one hook whose context is still
mutable. Scoped to our own messages: a system that switched off a user's dice
everywhere from a checkbox labelled "3D dice on rolls" would be overreaching.

## Not done yet

- Compendium content — character creation is covered: classes, subclasses,
  ancestries, communities, the domain decks and now all four tiers of
  equipment. The adversary roster is still to come, as is everything from
  *Hope and Fear*.
- **Equipment artwork.** None, and it is blocked rather than skipped — see the
  equipment tables section. If stable asset URLs ever appear, the fetch is one
  tool and `img` is already per document.
- Creation leaves three things it could reach. `backgroundQuestions` and
  `connectionQuestions` are still drawn nowhere, deliberately: they are prose
  and belong on the bio tab, which is where the flow's own steps 6 and 9 went.
  `suggestedTraits` is in the schema and **empty for all nine classes**, so a
  "use the recommended setup" shortcut needs content written first, and it is
  the one kind of content with no upstream to check it against.
- The Ranger's Beastbound subclass should create a companion Actor and set the
  `partner` uuid nothing currently sets. Creation is where that would happen;
  it does not, because it is the only place the flow would start creating
  documents that are not Items.
- A higher-level start is creation at level 1 plus N levels of advancement by
  hand. The window declines to walk the second half.
- Death moves. Scars are recordable on the adjust tab and cost a Hope slot;
  Blaze of Glory, Avoid Death and Risk It All are not implemented.
- The GM screen. The Fear pool is docked and public — see the Fear HUD above —
  but nothing else on the GM's side has a surface of its own.
- Damage rolls and the adversary d20 do not open the roll popover.
- Help an Ally and tag team rolls. The plate already draws several advantage
  dice with the losers crossed off; nothing lets a second player contribute one.
- Countdowns.
- The companion sheet exists with a `partner` uuid nothing sets.
- **The Beastform list is not content that exists.** The Druid's core feature
  says "a creature of your tier or lower from the Beastform list" and there is
  no such list anywhere in `src/packs-src/`; three subclass features build on
  it. It has no upstream — the Card Creator publishes cards and a Beastform is
  a stat block — so it is `equipment-tables.mjs`'s problem again, typed in by
  hand and checked by its own regularities.
- **An effect held on exactly one target has nowhere to record which.** Marked
  for Death, Twilight Toll, the Sigil, Invisibility, Shield Aura, Midnight
  Spirit, the Book of Sitil's Parallela and the Wayfinder's Focus each say
  "only one at a time", and Hex says "up to your Spellcast trait". The *count*
  is a counter and is annotated; the creature is a uuid nothing stores. It is
  the companion's gap in a different place, and the condition marks now
  registered are half an answer — the token wears Marked for Death, and the
  card that put it there does not know.
- **Eight player cards read or spend the GM's Fear** — Know Thy Enemy removes
  one, Night Terror steals Fear and rolls it as damage, Avatar of Terror scales
  off the pool. `fear` is a legal ceiling source now, so a card can *count*
  against it; none of them can move it. The pool, the HUD and `setFear` all
  exist, so this is wiring rather than design.
- **Temporary effects.** 87 rules match the sweep for one, which is the largest
  bucket it turned up, and the number wants breaking down before anybody acts
  on it — a third of it is not a modifier at all.
  - **Nineteen are a numeric bonus or penalty**, and they are the tidiest set
    in the corpus: the six Major potions each give +1 to a named trait until
    your next rest, Full Surge gives +2 to all six, Featherstep gives Evasion
    equal to your tier, No Mercy +1 to attacks, Insomniac's Periapt +2 to
    attack and damage. These are Foundry ActiveEffects and nothing else, and
    they are where to start.
  - **Nineteen apply a condition this system now registers** — Earthquake,
    Shadowbind, Chokehold, Tempest, Bolt Beacon, Terrify, Rime Scepter's
    Freezing, Adder's Fang's Venomous, the Poisoners Guild's three toxins.
    Half-answered already: the token can wear the state, and nothing puts it
    there.
  - **Forty-five are a duration on something that was created**, which is not
    a modifier and should not be built as one. Manifest Wall, Natural
    Familiar, Book of Homet's gateway, Astral Projection, Midnight Spirit, the
    Vial of Moondrip's darkvision, the Ring of Silence's footsteps. A handful
    name a condition the rules use once and this system does not — "Chain",
    "lit On Fire", "Ignites", "Corrodes", "Distract", "Prioritize" — and those
    are a judgement call about where the `CONDITIONS` line sits, not a gap.
  - By duration: 39 end at your next rest, 37 say only **"temporarily"**,
    which is the rules' own keyword for a state a roll clears and is therefore
    GM-adjudicated rather than timed. An implementation that put a timer on
    those would be inventing a rule.
