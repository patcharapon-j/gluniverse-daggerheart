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
  - `sheets/` — Svelte 5 sheet components. `suggest.ts` is the retired prose
    parsers, kept as the item sheet's "suggest automation" press.
  - `effects.ts` — temporary ActiveEffects and the sweep that expires them.
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
does not appear on a browser reload. Restart Foundry. `activity.css` was the
last one added and needed all three — plus a fourth for a component that also
ships JavaScript, since `activity.js` is a builder and had to join the module
list too. A card or a window that lands unstyled after a change to `design/` is
almost always the `system.json` registration missing.

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
paying to you, which is the half that gets forgotten. The refusal is the track
that cannot pay flinching rather than a dialog.

> **Everything from here to the end of this block is history.** `featurePrice`
> no longer decides what a card charges — costs are authored per document and
> the parse is the item sheet's "suggest" press. See **A card's buttons are
> data too** for what replaced it and why. It is kept because the widening
> below is the clearest statement in this file of *why* a parse over rules text
> cannot be made safe, and the corpus measurements in it are what sized the
> reading that replaced it.

That is a parse of English rules text, which this system refuses to do
everywhere else, so it is bounded hard — and **the bound was the wrong one.**
It was *positional*: `^[^.!?]{0,64}?`, on the reading that Daggerheart states a
price the way an invoice does, first thing and imperative. It does, when there
is nothing in front of it. Shadow Stepper's first full stop lands at character
thirty-four and Wings of Light's at twelve, because both open with the
condition the price is attached to, and neither price was ever reached.
Measured across the subclass cards: fifteen of a hundred and eighteen features
were priced, and twenty-two more stated a cost and were silently missed.

**That reads as missing plumbing, which is why it survived so long.** The
complaint is "the subclass card has no Mark Stress button", and every part of
the machinery a reader would go and check is present and correct — subclass
features do reach `card.feats[]`, `actionsFor` does scan them, the button is
drawn for the features that *are* priced. Nothing is unwired. The card simply
has no price on it, according to a regex that stopped reading four words in.

**So the position is dropped, and what replaces it is whose price it is.** A
price is the holder's, and the holder's price is written one of two ways: an
offer — "you can spend", "you may mark" — or a bare imperative at the head of a
clause, which is the same sentence with the subject left out. `PAYER` in
`cards.ts` is that set and `MK` is markdown emphasis at every junction, because
`plain` leaves the asterisks *inside* the phrase rather than around it. Ranger's
Focus is still the case that settles it — "Spend a Hope and make an attack…
When you deal damage to them, they must mark a Stress" — and it survives the
widening untouched, because "they must mark" is neither an offer nor a clause
head. The discriminator was never the sentence.

A hundred and eleven feature blocks gained a price they had always stated, and
twenty-nine clauses **lost** one they should never have had: three weapons named
Scary were charging the wielder the Stress the *target* marks, and four suits of
Banded Armor were charging Severe damage's Armor Slot on a press rather than on
the damage. One genuine price goes with them — the Ethereal Zweihänder's "You
must mark a Stress to conjure this weapon" — because "must" writes a consequence
far more often than a price and nothing in the sentence tells the two apart.

**`tools/check-cards.mjs` is what keeps the widening honest**, and it is
`check-resources.mjs`'s ratchet pointed at a third reading: every clause the
pattern charges across the four packs is listed with the words it was read from
— 288 of them on 274 documents — a `said` that leaves a card fails, and anything
priced on neither list is a new over-match and fails too. The pattern is
**lifted out of `cards.ts` as text** rather than copied, which is
`check-item-sheet.mjs`'s move: a `.mjs` tool cannot import TypeScript, and a
second regex maintained by hand is the exact thing the list exists to prevent.
A rename in `cards.ts` stops the tool rather than leaving it checking a pattern
the sheet no longer uses.

**`DECLINED` turned out to be one finding stated five times.** Every one is a
feature naming *two* currencies — Wings of Light's two bullets, Know Thy Enemy's
"Additionally, on a success", the Book of Korvax's Rune Circle beside Recant —
and `featurePrice` charges both, which nobody at a table pays. The invariant the
block records is therefore that **no feature prices two currencies**, so a sixth
fails rather than silently double-charging somebody.

A `feature` Item's authored `stressCost`/`fearCost` always wins over the prose,
because somebody typed it deliberately.

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

## SRD 2.0, and what a second source costs

The *Daggerheart System Reference Document 2.0* (2026-08-25) carries errata for
both the corebook and *Hope and Fear*, which makes it the third upstream this
repo answers to — beside the Card Creator's snapshot and chapter 2, which is
typed in. A full mechanical diff against it found the corpus overwhelmingly
correct: all 13 classes' domains, Evasion and Hit Points; every class,
subclass, ancestry, community and transformation feature name; all 210 printed
domain cards at the right level, domain and Recall Cost; 69 armour rows, 311
weapon rows, 222 loot rows; 246 adversaries and 44 environments matching on
Difficulty, thresholds, HP, Stress and attack. Fifteen things were wrong, and
they are worth reading as three different kinds of wrong.

**Four are the corebook's own corrections and live in an overlay.**
Whirlwind gains a sentence, Unleash Chaos gains an article that turns out to
be load-bearing, Book of Vagras loses a garbled clause and Book of Grynn gains
the word *temporary*. Those four cards are **generated** from
`official-cards.json`, so correcting them in `domain-cards.mjs` is a
correction the next `cards:fetch` silently reverts. `src/packs-src/card-errata.mjs`
is therefore a third `with*` wrapper beside `withDice` and `withDamage`,
applied at `domains.mjs`'s own `export default`, and it **throws** when a card
it names no longer says what it expects — because upstream adopting an
erratum and upstream rewriting the card around it look identical from here.

Unleash Chaos is the one worth keeping. "Mark Stress" → "Mark **a** Stress" is
a word, and it is what makes `priceClause` match — the card has always charged
a Stress and printed no amount, so the sheet was charging nothing. The
ratchet in `check-cards.mjs` fired on it, which is the ratchet doing exactly
its job.

**Two are Dread cards changing what they are.** Savor the Anguish and Invoke
Torment stopped being Spells and became Abilities, which retired
`dread-cards.mjs`'s own header claim that "every Dread card is a Spell except
Dread-Touched". Dread is transcribed rather than fetched, so those are edited
in place. Summon Horror and Darkfire both gained "Once per scene", which is
not prose — it is a **budget**, so both gained an annotation in
`card-resources.mjs` and `check-resources.mjs`'s coverage ratchet is what
would have caught their absence.

**Nine are transcription defects in the stat blocks**, found by the same
diff and fixed against it: the Glass Snake's Armor-Shredding Shards rewritten
short, the Wyvern terrifying *PCs* rather than *creatures*, the Cryptimoth
rolling **Instinct** where the repo had typed "Insight" — a trait this game
does not have — and five smaller slips including a doubled word and two
straightforward typos.

**One candidate was refused, and the refusal is the finding.** The repo spells
Outer Realms Corrupt**e**r in five places and Corrupt**o**r in two, which reads
as an obvious normalisation. The SRD spells it both ways too — "Corrupter" in
the statblock and its own feature, "Corruptor" in the index and the Chaos
Realm environment — and the repo mirrors that split exactly, statblock for
statblock and environment for environment. Normalising would have made the
text *less* faithful, and it would have moved an adversary's `_id`, which is
derived from `pack:type:name` and is what keeps a dragged copy linked. The
inconsistency is upstream's and it stays.

**A tenth was refused for a different reason and is worth knowing about.** The
SRD 2.0 appendix omits Notorious's "This card doesn't count against your
loadout's domain card maximum of 5" sentence. The Card Creator still prints
it. An omission in a reprint's appendix is not an erratum, and removing a rule
from a card somebody is holding is the worst direction to be wrong in. The
decision is recorded in `card-errata.mjs` so the next reader does not
re-litigate it.

## Migrating a world

Almost nothing in this system has ever needed migrating, and the reason is
architectural rather than lucky: everything derives. `advancementTally`
recomputes from the marks, `resourceMax` recomputes from the source, and the
two `migrateData` implementations in `data/items.ts` fix a *shape* on the way
in, per document, forever, for free. Whenever old data can be *read* as new
data, that is the tool.

`src/module/migration/` is for the case it cannot: **content that was
copied.** A domain card on a character sheet is not a view of the compendium,
it is a duplicate made months ago. Rebuilding the pack does not touch it and
nothing can derive it back — the player may have renamed it, and matching a
card by name to a pack it was never linked to is a guess. So the four card
errata above have to be *applied*, once, to the copies, and something has to
remember that they have been.

**The record is a counter, not a version.** `dataVersion` is a world setting
holding a plain integer, and the obvious build — stamp `game.system.version`,
gate each step on `isNewerVersion` — is quietly broken here.
`.github/workflows/release.yml` lets a human choose hotfix, minor or major at
release time, so the version a step ships in is *unknown when the step is
written*. Guess 1.11.0, have the release come out as 1.10.2, and the step
runs, stamps 1.10.2, and is still newer than the stamp on the next launch — so
it runs again, every launch, forever. A counter has no such coupling.

**The active GM writes**, which is `applyFear`'s and `syncVulnerable`'s
arrangement a fourth time: `ready` fires on every connected client, and four
clients agreeing to rewrite the same forty cards is four writes and a race.

**It fails in the direction that keeps data.** A step that throws leaves the
stamp where it was, so the next launch retries rather than being silently
half-done. That is only safe because every step is idempotent *and gated on
the old shape*, and a step that cannot be written that way does not belong in
the file.

**Matching on the old text is the whole safety argument.** Every fix is gated
on the superseded text still being present, so a GM who rewrote Whirlwind for
their table keeps their rewrite — their document no longer contains the
fragment and is skipped, counted, and **named** in the report, because "we
skipped 3" is not something a GM can act on and "we skipped Whirlwind on Bex"
is. There is no provenance field on an Item to consult; the text itself is the
evidence that nobody has touched it. This is `creation.granted`'s argument
arriving somewhere with nothing to record provenance in, and it fails in the
recoverable direction: a migration that skips a card is a message, and one
that clobbers somebody's homebrew is not undoable.

**Compendium packs are deliberately not touched.** Ours are rebuilt by the
build and are locked; an unlocked pack in somebody's world is *their* copy,
made deliberately, and a system rewriting it is `cascadeOf`'s overreach in a
new place.

**Three populations, and the third gets forgotten.** World Items, Items
embedded on Actors, and Items on **unlinked tokens** — which are a separate
Actor each, living in a scene's `actorDelta`, invisible to `game.actors`. A
linked token is skipped precisely because its Actor was already walked.

**Arrays are rebuilt whole and never addressed by index.** Foundry reads a
dotted index in an update key as a path into an *object* — the trap the adjust
tab learned about Experiences and `moveResource` learned about pools — and
rules text lives in `classFeatures[]` and `features[]` as readily as in
`description`. The walk emits only top-level `system` keys, so an array lands
as one value.

### The two forms of one erratum, and the ratchet between them

`src/packs-src/card-errata.mjs` holds the corrections in the cards' own
**markdown**, applied before `rt()`. `src/module/migration/errata.ts` holds
the same corrections against `rt()`'s **output** — `<b>Mark a Stress</b>` and
not `**Mark a Stress**` — because that is what a copied document actually
stores. Two readings of one change, and the thing that stops them drifting is
`tools/check-migration-errata.mjs`, which builds the pack and asserts that
every `replace` is now present in the built document and every `find` is
absent.

It earned itself on its first run. Whirlwind's erratum *appends* a sentence,
so its unanchored fragment was a **prefix of its own replacement** — it would
have matched the corrected card as readily as the old one, and a second run
would have appended the sentence twice. The check now refuses that shape
outright rather than leaving it to the corpus to notice, because the corpus
reports it as "the pack was never corrected", which sends the reader to the
wrong file entirely.

`tools/test-migration.mjs` is the behaviour half, in `test-activity-log.mjs`'s
idiom — a stub Foundry in the shape these functions actually use. It ratchets
the eight things that fail silently: that a player's client and a second GM
write nothing, that running twice is indistinguishable from running once, that
an edited document is skipped and named while an already-corrected one is
neither, that no update key ever addresses an array by index, that all three
populations are reached and a linked token is not double-written, that a
failed write does not move the stamp, and that an empty world is stamped
rather than walked.

Both run in CI: `migration:check` joins `build:packs`, `migration:test` joins
`typecheck`.

`game.daggerheart.migrate()` is the console, for the reason the token chip and
the ruler both have one — a thing that runs once, silently, at load has no
steady state to inspect, so "it never ran" and "it ran and found nothing" look
identical afterwards. `{dryRun:true}` reports without writing; `{force:true}`
ignores the stamp, which is what a GM wants after restoring a character from a
backup made before the errata landed.

## The two optional rules

SRD 2.0 prints both of these as optional, and this system had one of them
switched on with no switch and the other quietly disagreeing with the book.

**Massive Damage** — twice your Severe threshold marks four Hit Points rather
than three — has been applied unconditionally since the damage band was drawn.
It is a world setting now and it **defaults on**, which is a migration
decision rather than a reading of the book: defaulting it off would silently
change what a hit costs at every table that upgrades, and a rules change
nobody asked for is worse than a default that disagrees with the book's own
suggestion.

What it gates is `severityFor`'s top rung and the **damage dialog's** fifth
zone *together*, and those two must agree or the dialog offers a zone the
document will never return. `apps/damage.ts` hardcoded `massive: true`, so it
was already agreeing with the setting by accident; it reads it now.

**The character sheet's rail band draws no fifth zone at all, switch or no
switch**, and that is not the same file disagreeing with itself. The dialog is
where a hit is *measured* — the number is known, the ladder is the subject, and
the choice in it is how far down you will pay to fall. The rail band is a
**readout of the two thresholds this character has**, and Massive is not a
third one: it is a rule about what happens above the second. Drawn as a fourth
zone it puts a number on the sheet that the sheet does not carry, and it closes
the Severe zone — which is the one thing that band is honest about, because
`open` means "and everything above this" and there is no width that says that
truthfully.

What the sheet gives up is the band's press for four Hit Points, and that is
the right thing to give up. Pressing Severe means "three and up"; how far up is
exactly the question the damage dialog exists to ask.

The rung ceiling — `SEVERITY.indexOf(actor.severityFor(n))` — is correct
without changing, and it is correct **because `massive` is last in the closed
set**. The setting stops `severityFor` returning the rung; it does not shorten
the array, so no lower rung's index moves. Had the optional rung been anywhere
but last, that line would have gone wrong for every hit on the ladder at once.

**Defined Ranges** is the opposite default. The ranges are fiction-first and
say so out loud; the printed squares are for a table that has decided to play
on a grid. It is off, and world-scoped, because it is the table's agreement
about what Close means — a per-client switch would put two people at one map
measuring the same reach differently, which is the exact disagreement the
ruler was drawn to surface.

One band moves. `RANGE_FEET` divided by five gives Very Close **2** squares
and the printed optional rule says **3**; Close and Far already agree at 6 and
12, which is what says the derivation was right about everything it could see.
`RANGE_SQUARES_DEFINED` is the printed table and `rangeSquares(r, defined)`
takes the choice as an argument, because `config.ts` is imported by every
card-drawing surface in the system and must not need a live `game` to answer a
question about geometry.

**And the ruler was not rebuilding.** The hook was wired and would have read
as working — `sync()`'s fast path returns early when the subject and its
footprint are unchanged, which is exactly true when a *setting* changed, so a
GM flipping the rule mid-session would have watched the ruler visibly
reposition and go on measuring the old table. That is this component's own
named failure — drawn perfectly and lying — arriving through a fast path built
for a different question. The ruler now remembers which table it was built
under, as a **string** rather than a boolean, so "never built" stays
distinguishable from "built under the derived table";
`game.daggerheart.rangeRuler()` reports both that and each band's radius in
squares.

## Root and Void — a campaign frame's two domains

*The Twilight Marked* adds two decks nobody's class carries. `config.ts` has
them at the end of `DOMAINS` rather than filed alphabetically, because the
printed ten are a closed set somebody else owns and reading them as one block
is worth more than one alphabetised list. `design/marked.css` is the frame the
cards wear, `src/packs-src/marked-cards.mjs` is the forty-two, and
`src/module/marked.ts` is the mechanic around them.

**The frame is stamped by `cardOf`, so every surface gets it at once** — sheet
peeks, chat, the browser, creation, the rules panel, the card picker. `cls` on
`CardOptions` is read by `CARD` and by neither `TILE` nor `SPINE`, which is the
boundary that decides what may go in it: a class naming a *frame* is a claim
about the card as a printed object, and a tile and a spine are handles for one.
That is also why the deck's name rides in **`code`** — the footer's right cell,
`CARD`-only — and not in `foot`: `foot` is shared with the tile and the spine,
so putting "TM·ROOT" there would rename the deck in every loadout row and gear
tile, where nothing explains the word. It also retires a lie, since these cards
would otherwise print a Darrington Press card number for a card nobody printed.

**They have no upstream at all**, which is one step past Dread. Dread has none
because the Card Creator publishes the corebook only; these have none because
nobody published them. So `check-cards.mjs` skips them by construction, and
what replaces the audit is `tools/check-marked.mjs` — `check-equipment.mjs`'s
argument arriving at a deck: when there is nothing to compare a line to, assert
that the line obeys the rules every printed line obeys.

    node tools/check-marked.mjs --report

**Two of those rules were measured off the 210 printed cards, not asserted.**
*A repeatable damage card scales with Proficiency; a flat-dice card is gated* —
every printed card dealing flat dice pays a Hope, Stress or a once-per-rest,
and every one castable again for nothing writes `dN+M using your Proficiency`.
And *area damage above level 4 takes a Reaction Roll and halves on a success* —
below that the idiom is "Spellcast Roll against all targets", and from Chain
Lightning up it is always a save-for-half. Six cards broke one or the other and
were rewritten. The tool also refuses a card that names a **player's turn**:
this game has a spotlight, and the printed corpus says "your turn" zero times
in 210 cards while saying "the GM spends a Fear on their turn" freely.

**The damage band is `check-resources.mjs`'s ratchet in a new place.** A card
over the largest printed average *at or below its level*, for its own kind
(save-for-half or not), must be listed in `AHEAD` with the reading that put it
there — and a card listed there that is no longer over its band fails too,
because a justification for a number that has since changed is one nobody has
re-read. Three are listed, and all three are the same finding: print has **no
save-for-half area card between levels 4 and 7**, so the band at level 7 is
still quoting a level 3 grimoire. A measurement cannot know that; a reader can.

`card-resources.mjs` annotates these by **derivation** rather than by hand, and
that is a departure from every entry above it. Those are readings — somebody
decided whether "until your next rest" was a duration or a use limit. These we
wrote, to a rule the check enforces, so there is no reading to record and
listing them would be a second copy of what `marked-cards.mjs` already says.
The provenance survives: `once()` takes its `said` from the scope, so an entry
is still evidenced by the words being on the card.

**The mechanic is four rules and two of them are automated on purpose.**

- **Using a card is a press, not a side effect of posting.** Clicking a card
  posts it, and you show a card to argue about it at least as often as you play
  it — so the posted card carries a claim button spending the same one-per-
  message flag a duality plate's "Gain a Hope" does. That also answers the
  three cases the frame calls out: a reaction, a second activation and a use
  that failed are all *somebody pressing this*. It is `unshift`ed to the head
  of the action row because it is the one action there that is not optional.
- **The GM's Fear is written by the GM.** A player cannot write a world
  setting, so the press leaves a flag and the **active GM's** client answers
  it — `applyFear`'s arrangement one step along, gated for `syncVulnerable`'s
  reason. **A full pool does not make the deck free**: Fear caps at 12 and the
  cost lands as Stress instead, or the cards would cost nothing exactly when
  the table is in the most trouble.
- **The toll is observed, not instrumented.** A card reaches the loadout by at
  least five routes — the recall button, either drag, the item sheet, a macro
  — so `ledger.ts`'s argument applies unchanged: one `updateItem` hook catches
  every route including the ones that do not exist yet. `firstOwner` picks the
  client that pays, because unlike Fear this is not the GM's to write.
- **The Spellcast override is stated and not substituted.** Root casts with
  Instinct and Void with Knowledge, and `markedSpellcast` is exposed on
  `game.daggerheart.marked` — but nothing swaps the trait under a roll the
  player started from a trait plate. Doing so would be a campaign rule reaching
  into the roll engine, and the first time it was wrong nobody could see why.
  There is now exactly one place it *is* substituted, and it is the other
  situation entirely: a roll button on the posted card itself, where the object
  naming the trait is the object being pressed. See "A card that asks for a
  roll" under Chat. The lookup table moved to `config.ts` for it, beside the two
  domains it is keyed on — `marked.ts` imports the roll engine, which evaluates
  Dice So Nice's texture table at module scope, so asking which trait a Root
  card casts with used to cost every card-drawing surface a live `foundry`.
  `marked.ts` re-exports it, because the *rule* is still stated there.

`system.mark` and `system.surging` are the only campaign-frame state in the
character schema, and they are there rather than on a "Marked" feature Item
holding an open counter — which the counter machinery would have allowed —
because `marked.ts` has to *read* them, and reading a number off "the resource
named Mark on the Item named Marked" is string-matching a document a player can
rename. Both default to zero and false, so a table not running the frame
carries two fields that say nothing.

**Two balance findings are worth keeping.** The long-rest roll is 2d12 against
8 + Mark with no trait, which stops being a roll around Mark 8 — a Difficulty
of 16 against an average of 13 is a tax with dice on it. It can be **bought
down two points per Stress**, which puts the decision back and charges the
currency the decks already burn. And *Surging* had no teeth at all: it is now
double Fear per use until your next long rest, which is the frame stating
itself twice as hard rather than a new rule to remember.

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
charging for. Both modifiers are now summed over the same list of worn gear,
and the derived Armor Score is the Armor Slot capacity: a shield or card that
adds to the score adds the matching markable box too.

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

## The supplemental campaign variants

SRD 2.0 prints sixteen pages of optional mechanics — an alternate starting
equipment table for characters with no access to weapons, a cooking economy,
and eight campaign frames from Grimdark to Hex Crawl. Every one of them is
explicitly *supplemental*, so none of it may simply be switched on.
`src/module/variants.ts` is the switch, and the content is two packs.

**Ten booleans and not one dropdown.** The obvious build is a setting naming
"the campaign you are running", and it is wrong on the chapter's own terms:
these are not exclusive. A Hex Crawl through a Grimdark world is two of them,
Monster Hunting brings an equipment table and touches nothing else, and Feasts
is a downtime economy belonging to no frame at all. A dropdown would be this
system inventing an exclusivity the book does not have.

A multi-select was the second candidate and was declined for a duller reason:
it renders through Foundry's own `SetField` form group, which is a claim about
a version of the settings window this repo cannot test against. Ten booleans
render the same way on v13 and v14, each carries its own hint, and each is
findable by somebody searching the settings pane for the word "Grimdark".

Every one is **world**-scoped, which is the change log's argument rather than
the token chip's: a variant is the table's agreement about what game is being
played, and one player opting out of Feasts is not a thing that can mean
anything.

**A switch gates availability, never enforcement.** Turning Grimdark on does
not make anything Shadow-Touched; it puts the frame's gear and rules where a
GM can reach them. That is `apps/rules.ts`'s standing position — print the
rule verbatim rather than parsing English into behaviour, because parsing is
how a system starts quietly getting rules wrong — and a supplemental frame is
the last place to start.

**Two packs, because they hold two different kinds of thing.** `variants` is
Items a character equips and is filed beside the other Items; `variant-rules`
is JournalEntries, which is what a virtual tabletop has for rules text nobody
equips. `variant-rules` is the first JournalEntry pack in this system, and
`build-packs.mjs`'s `PACKS` list grew a `collection: "journal"` entry for it.

**Kept out of `equipment`, deliberately.** Everyday Hero alone is 36 more
documents on a table not running it, and the compendium browser answers "every
weapon in the world" — a Pitchfork arriving in a search for tier-1 primaries
is a variant leaking into a game nobody switched on. A pack is the coarsest
gate this system has and it is the right grain here, because the chapter is
optional together.

The browser reads that gate in `ourPacks()`, matched on the **pack's name**
rather than on anything a document carries: a longsword has no field saying
which optional chapter printed it, and inventing one would put it on all 633
equipment documents to serve 60. Nothing is hidden from anybody — the pack is
still in the compendium sidebar and a GM who wants a Pitchfork can open it.
What the switch buys is that a search for "axe" in an ordinary game answers
with the axes that game has. Flipping a switch drops the browser's per-pack
cache and closes the window rather than refreshing it, because a rail whose
counts changed under the reader is a window that has quietly become about a
different question.

**Everyday Hero is a one-for-one reskin of the core tier-1 tables** — Cleaver
for Broadsword, Butcher's Axe for Warhammer, Quilted Clothing for Gambeson —
which is what made its column alignment independently checkable during
transcription, and is why it is tagged tier 1 throughout.

**Two of the new items land on gaps this repo already records.** The Enchanted
Kite's *Versatile* is the second-stat-line problem — `WeaponData.damage` is
one stat line rather than a list of them — and it is carried as printed text
with nothing structural, exactly as the seven core Versatile weapons are.
Monster Hunting's *Warded* ("reduce incoming magic damage by your Armor Score
**before** applying to thresholds") is a per-armour exception to the printed
damage rule that `apps/damage.ts` deliberately does not implement; the text is
carried and no modifier half-implements it.

**The extraction is evidenced, and one table is a reading.** The SRD's tables
do not survive `pdftotext`'s default or `-layout` modes — the first emits each
column as a separate block and the second interleaves them with a half-row
offset. `pdftotext -table` (Xpdf 4) reconstructs the grid correctly and is
what every row here came through, cross-checked against the block-order
extraction. The Tech-Based **Scrap Table** is the exception: the PDF's content
stream genuinely holds only 8 tokens for a 10-column row, so the column spans
were inferred from measured character offsets. The journal page says so on its
face, because a table that silently presents an inference as a transcription
is the failure this repo's `said`-provenance tables exist to prevent.

## The Brawler has no gear, and needed a weapon anyway

*I Am the Weapon* says you have a primary weapon called **Brawler's Strike**
equipped while you have no other Active Weapons, using a trait of your choice,
at Melee range, dealing `d8+d6` physical damage using your Proficiency. Half of
that shipped: `legacyFeatureModifiers` has carried the +1 Evasion since *Hope
and Fear*'s classes arrived, and the sentence it hangs off — the weapon — was
nowhere in the system. **The one class in the book built around carrying no gear
was the one class that could not attack.**

`src/module/brawler.ts` is the whole of it, and it is three decisions.

**The weapon is a real Item.** Every surface that matters already works off
`actor.items` — the gear tab's slots, the attack and damage buttons,
`weaponModifierTerms`, the item sheet, somebody's macro — so a *derived* weapon
would mean teaching all of them about a second kind of thing that is a weapon
except when it is not. A document costs one creation and is then
indistinguishable from a longsword, which is what the rule says it is.

**It is observed rather than instrumented**, which is `ledger.ts`'s argument
arriving at equipment: a weapon becomes active by at least five routes and a
hand-off written into each is wrong the first time a sixth appears. It is found
back by a **flag** and not by its name, because a player may rename their fists
— the objection this file already states about reading a number off "the
resource named Mark on the Item named Marked". The *feature* is matched by name,
because that is the established idiom (`legacyFeatureModifiers` is an exact-name
registry and `resourcesFor` binds a pool the same way). `firstOwner` picks the
client that writes: unlike Fear this is not the GM's to author, and two
connected owners both creating one is two Brawler's Strikes.

**And `noWeapons` had to stop counting the strike.** The condition the +1
Evasion hangs on means "no *other* Active Weapons", and the moment the fists
became an equipped weapon they would have switched off the bonus they are the
condition for — the feature paying out only in the instant before it took
effect. That is the shape of bug this change creates and the reason the
condition is now written the way the card is.

**`d8+d6` is one expression with two die sizes, and `damageField.extra` is
where it goes.** It is not the Versatile problem wearing a hat: that is a whole
alternate stat line — its own trait, range and die, *chosen between* — and it
still has nowhere to go. These are rolled together, always. A list rather than
one more pair of fields, because two is what the corpus happens to print and not
a rule anybody wrote, and because a `dice2` blank on 358 documents is a field
every reader has to test. It inherits `proficiency` rather than restating it:
"both the d8 and the d6 scale off your Proficiency" is one claim about the
expression, and a group that could opt out would be inventing a printed form
nobody has.

The plate follows. A `DamagePlate` keeps its first group spread across
`n`/`die`/`rolls`/`max` and holds any others in `extra`, for the reason `hd`/`fd`
are optional on the duality plate — every damage card posted before an expression
could hold two shapes was stored with those four fields, and a log is a record.
One term per group in the arithmetic strip, so an expression with two shapes
says what each contributed; two runs and one operator in the dice strip, because
the division that matters on a critical is awarded-versus-rolled and the groups
inside each run tell themselves apart by their own silhouettes. A critical
maximises **every** group, since it is the expression that doubles and half a
doubled expression is neither.

**And the sheet did not follow, which is the half that shipped wrong.** The
plate drew `d8+d6` correctly from the first roll, and every surface that
*prints* the expression without rolling it said `d8` — the attack bar's damage
button, the gear tile's Damage stat, the advancement tab's sentence about
Proficiency and the creation window's equipment table. All four wrote
`${count}${dice}` inline, because until this weapon existed the first group was
the whole expression and a helper would have been one function wrapping a
string interpolation. That is the shape of it: extending a schema is one edit
and extending what *reads* the schema is four, and the four are invisible
because each one is correct about the field it names. `damageDice` in
`data/damage.ts` is the one function now, and it takes an optional multiplier
because the surfaces mean two different expressions — a tile prints what is on
the weapon (`d8+d6`, a leading 1 being noise on a stat line) and the attack bar
prints what will be thrown (`2d8+2d6`). The **bonus stays with the caller**,
since a tile means the weapon's own and the attack bar means that plus every
passive item effect in scope, and a function that folded both in would be
choosing between them with no way to know.

`card-damage.mjs` declined this expression and the decline stands, with its
reason rewritten: the shape can hold it now, and the class card is still not
where you swing your fists. The trait is left at the schema's default with the
weapon's own `description` saying so, which is the arcane-frame wheelchair's
answer one step earlier — "of your choice" is a choice this system cannot make
and should not pretend to have made.

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

## Browsing the compendium

`design/browse.css` is the look, `design/browse.html` the study page,
`apps/browse-index.ts` the model and `apps/BrowseWindow.svelte` the window.
`apps/browse.ts` is the application shell. Open it from the button at the head
of the **compendium sidebar**, or `game.daggerheart.browse()`.

**Foundry's compendium sidebar gives you a pack and a flat list of names.**
Every fact anybody actually filters on lives in `system` and the sidebar cannot
see any of it, so "a Grace card at level 3 or lower whose Recall Cost I can
afford" means opening the domains pack, scrolling 189 names, and reading them
one at a time — and this system already *knows* the answer, because domain,
level and Recall Cost are three of `config.ts`'s closed sets. Six packs and
about a thousand documents is past the size where a list of names is a way of
finding anything.

**The rail asks what kind of thing first, and everything under it belongs to
that kind.** "All compendium contents" is not one list: a longsword and a
Wizard share a name and an image and nothing else, and a filter rail that was
the union of every subtype's axes would be nine-tenths inapplicable to whatever
was on screen — trait and range greyed out over a deck of domain cards, level
and Recall Cost greyed out over a rack of armour. The kinds are not a tab
strip, for `make.css`'s reason inverted: a step can be unsatisfied and a tab
cannot, and these are neither. They are the one question the window has to ask
before it can ask anything else, and each carries a count, which a tab does not.

**Every axis is a closed set and never a tag**, and that is a refusal rather
than an omission. A filter built by sweeping the values that happen to be
present describes *this world's packs* — so a chip can appear, be pressed, and
vanish when a module is uninstalled — and it cannot say that a value exists and
is empty, which is the whole of what dead-not-hidden is for. So the axes are
`config.ts`'s own sets plus two that are closed by arithmetic: Recall Cost is
0–4 because that is what is printed, and subclass rank is the three cards you
acquire. Ancestry, community, transformation, consumable and loot get **no
axes at all**, because nothing distinguishes one from another but what it says,
and an axis over somebody's typing is what the search field is for.

**A chip's count is what pressing it would leave behind**, counted against
every *other* axis. Counting against its own too would give every unselected
chip in a narrowed axis a zero — press Grace and the other eight domains read
0, which says they are empty when what is true is that you asked for Grace.
Within an axis the values are OR and across axes they are AND, because "Grace
or Midnight, at level 1 or 2" is one question and "Grace and Midnight" is not
a card.

**The shape of a result is the kind's own claim about itself**, which is the
creation window's argument arriving with nothing to choose. A class, a domain
card, an ancestry and a subclass are printed *objects*, and a text summary of
one lies by omission about the two facts a card carries structurally rather
than in prose — the domain, which is the hue and the two corner sigils, and the
level and Recall Cost, which are the corner blocks. Everything else is a table,
because what you compare across two hundred longswords is five columns of the
*same five facts*, and a tile states each fact in a different place on every
tile. `feature` is a table for the reason it is a row on the character sheet:
`cardOf` returns null for it, because it has never had a card.

The grid's floor is **196px** rather than `make.css`'s 176, and it is a floor
rather than a width — `auto-fill` counts tracks off it and `1fr` spends the
remainder, so the default window is three columns at about 250. That is the
right way round here: there the grid is a *chooser* and more options at once is
worth a smaller card; here the card is the answer and the rules text printed on
it is what you came to read.

**Nothing peeks.** The creation window settled this and the settlement reaches
here unchanged: the card is on screen at card size, so a hover card over a card
is the same picture twice, and the table answers "what is this object" in
columns, which is what a table is. There is no `.peeklayer` in this window —
not an empty one, none. **A click opens the document's own sheet** instead,
which draws every field of every subtype across three tabs; a second detail
view here would be a second thing to keep true.

**A drag hands Foundry `{type, uuid}`** — the payload `onDragStart` writes on
the character sheet — so a card dragged out of here lands through
`handleActorDrop` exactly as one dragged off the sidebar does, transformation
limit and loadout placement included. `.lift` is applied **one tick late** and
by `setTimeout` rather than `requestAnimationFrame`, for `swap.js`'s two
reasons: the browser snapshots the drag image at the end of the `dragstart`
dispatch, and rAF does not fire in a tab that is not painting, which is exactly
the tab you drag *out of*.

**It reads every mounted pack whose documents are ours**, which is wider than
the six this system ships — a world with a homebrew domain pack has those cards
in the collection the sheet drags from, and a browser that showed only ours
would be wrong about the one thing it exists to answer. `metadata.system` is
what says a pack is ours; a pack of the right document type belonging to
another system holds a `system` object that means something else, and reading a
`tier` off one is reading a coincidence. Where more than one pack is on screen,
each result names its own — two cards with the same name and different text are
told apart by nothing else.

It is `getDocuments` and not `getIndex({fields})`, which was the obvious reach:
an index is a promise about which paths a caller will want, and this window
wants `system` entire — every axis reads one field, the search reads the rules
text, and the grid hands the whole thing to `cardOf`. Cached per pack for the
session and dropped per pack on the ordinary document hooks, which fire for
compendium documents with `pack` set.

### What it costs to open, which the study page could not tell us at all

The first build did both halves of this window the expensive way and neither
was visible on a study page holding four cards and a mock rail. Opened in a
real world it stopped Foundry.

**It read every pack before it drew anything**, because the rail's counts
needed all of them. That is **1,332 documents** across the six packs this
system ships — and 290 of them are adversary *Actors*, which construct their
embedded documents and prepare their derived data on the way in. A thousand
documents is not a wait, it is the client going away.

And it was never necessary, because Foundry has already read the part that
answers the rail. A pack's **index** is in memory at world load and carries
`_id`, `name`, `img` and `type` for every document — which is exactly what a
kind row says and no more. So `survey()` counts off the index, the window
opens on the frame it is asked for, and `loadType` reads documents one subtype
at a time, from **only the packs that hold it**. The default kind is domain
cards, so opening now costs 210 documents out of one pack instead of 1,332 out
of six.

That is the honest form of the paragraph above rather than a retraction of it.
An index still cannot serve the axes, the search or the grid — `indexFields`
could be made to carry a few of those paths and never all of them. What
changed is that the two questions were being answered by one call: the index
says *what is there*, `getDocuments` says *what it says*, and only the first
one is needed to draw a rail. A pack is still read **whole** and cached whole,
because the equipment pack holds weapons, armour, consumables and loot, and
reading it four times would be four copies of 633 documents.

**And a card grid is drawn a page at a time.** Measured on the real deck
rather than guessed: 189 domain cards cost 1.3ms to build, 11ms to insert,
**209ms to lay out** — every card is a container-query root — and `fit()`
solves 22 of them past their opening type scale. The freeze was the load, but
this is what made the window bad afterwards, in two places. Any full relayout
of the page pays that 209ms while the window is open, which is the "switching
tabs is slow" half. And the fit effect is keyed on what is drawn, so **every
keystroke in the search field re-solved every card on screen** — 56ms a letter,
for cards the letter had not touched.

Three things fix it and each is a different mistake. The page: 48 cards, grown
by a control that is also its own scroll sentinel, and only under the grid —
a table row is a grid row with text in it and paging one would break the
reading it exists for. The mark: a fitted card wears `data-fit` and is not
solved again, which works because the `{#each}` is keyed on the uuid, so a card
that survived a filter change kept its element. And the chunk: six cards a
frame, so what is left lands across paints instead of on one. Two things
invalidate a solve and both clear the marks — fonts, because `fit()` says at
the top that metrics against a fallback face are wrong by a line, and *width*,
because `auto-fill` changes the column count and a card solved at 250px is not
solved at 196.

**Every piece of state that holds a document is `$state.raw`.** Plain `$state`
deep-proxies the plain objects it is handed and creates a signal per property
on first read, and an `Entry` is a plain object wrapping a Document and a
DataModel — which Svelte declines to proxy, so the wrapper was buying nothing
and standing between `countsFor` and a field a thousand times a keystroke.
Nothing here is ever mutated in place: an entry is written once and a filter
set is rebuilt on every press, so reassignment was always the whole of the
reactivity.

**The search haystack is built on the first search that asks**, not at load.
It walks a dozen paths and runs `plain` over each, which is ten regex passes a
string, and the majority of visits to this window never type a word.

**The search reads rules text, not just names**, because a domain card's
identity is its paragraph and "the one that lets me reroll a damage die" is how
anybody looks for one. Every term must match, anywhere, so "grace stress" finds
the Grace cards that mention Stress — which is how a search gets typed and is
not what a single substring match does.

**Nothing here writes and nothing here is stored.** It is the only window in
this system that only reads, which is why it has no `SheetState` and no
document, and why it is a singleton rather than one per actor. What you were
looking at last week is not a fact about the world; it is a fact about a search
you have already finished.

### What its study page could not see, either

Six things, all of them in `tools/verify/`'s **THE BROWSER** stage — and the
button floor now covers a seventh control, `.bmore`.

**The button floor, for the third surface to pay for it.** `make.css` and
`pool.css` each learned it separately and this window has thirteen kind rows,
three dozen chips, a card grid and three hundred table rows, none of which is a
button in the sense Foundry's `elements` layer means. The kind row is the
dangerous one: a name and a count on one line is genuinely close to 28px, so it
looks merely roomy. The chip is what gives it away, at 21.

**And the text input, which is new to this system.** No surface here had ever
had one. Foundry gives every input a height with a matching floor, a border, a
background and a 4px radius — so an unreset search field is a piece of
Foundry's chrome sitting in the middle of our paper, which is the single thing
that makes a window read as belonging to a different application. `browse.css`
resets it once at the root beside the button, and `design/browse.html` and
`tools/verify/` both had to grow the stand-in rule to be able to see it.

**A scroll container's padding is inside the scrollport.** `.bbody` therefore
carries **no padding at the top**: with 16px there, a `top:0` sticky heading
leaves a band above itself with rows sliding through it in the open, and
pulling the heading up into the band with a negative offset clips the heading
instead. Both failures look perfect at `scrollTop: 0`, which is where a study
page leaves them. So the top space belongs to whatever is inside — the table's
heading *is* the top of the table, and the card grid asks for the 16px it
wants.

**The heading is sticky at all**, which the creation window's table is not and
does not need to be: thirty-five rows inside a step against three hundred and
fifty-eight here, and a column heading you have scrolled past is a column
heading that has stopped working.

**The `b`-prefix is tested rather than asserted.** Every class is `b`-prefixed
and the block root is `.brw`, because `.card`, `.tile`, `.row`, `.chip` and
`.find` are all names something else in this system owns, and `.ftr` — the
creation window's own table row — is what the shape classes would have been
called. `design/browse.html` loads six stylesheets and the game loads
twenty-two, so the check is the ledger's, pointed at a new block: every element
the browser owns, against every rule in the whole ported stack. `.card` is
excluded by *element*, because the card is a component this window deliberately
hosts.

**And the browser does not resize the shared card**, which is the creation
window's inverted peek check from the other side.

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

## What a frame costs

The browse window's "what it costs to open" is above, and everything in it
turned out to be true of three other surfaces that had no idea. The findings
are one finding stated four times: **work keyed on a signal that changes more
often than the thing it is about.** None of them looks wrong afterwards —
every card is correct, every mark lands — so the whole cost is in the frame
that was dropped, which is the one place nothing can show you.

**`SheetState` is `$state.raw`, and always should have been.** Plain `$state`
deep-proxies the object it is handed and mints a signal per property on first
read, and a character's snapshot is one `system` object plus one per Item. The
proxies bought nothing: fine-grained invalidation is a claim about *writes*,
and `sync` replaces each field wholesale, so the top-level signal changes
identity and every reader invalidates however deeply it read. Svelte does not
diff the new object against the old. Reassignment was always the entire
mechanism and the proxy was overhead standing between every `$derived` on the
sheet and the field it wanted — which is `browse-index.ts`'s own paragraph,
arriving on the sheet a level up. `of()` is memoized against the array `sync`
built, because the character sheet asks it two dozen times a pass; the key is
the array's identity rather than `rev`, so a stale bucket is unreachable by
construction.

**`fit()` is not an idempotent tidy-up and was being run as one.** It resets a
card to its opening type scale and steps down, reading `scrollHeight` each
time, so every step is a forced synchronous layout — and a card is a
container-query root, so the layout it forces is its own. The character sheet
called it on `peekRows`, whose array identity `rows()` rebuilds every pass, and
the creation window called it on `snap.rev`, which is bumped by definition. So
**marking a Stress box re-solved every peeked card** and **placing a trait chip
re-solved every card in the window**, several hundred forced layouts behind a
gesture whose own work was writing one number.

`apps/fit-cards.ts` is the browse window's answer lifted out for all of them —
`data-fit` plus a few cards a frame — and the two dialogs' peek host takes it
too, where the domain card picker draws forty cards on the frame the window
appears. The mark moved onto the **`.card` itself**, which is what `{@html}`
replaces when a card's text genuinely changes; a mark on the wrapper Svelte
keeps outlives a rewritten card and would skip it.

Two consequences worth knowing. The supersede has to happen **after** the work
is found and not before — bumping the pass counter on a run with nothing to do
cancels a pass still walking, and a change that only *removes* cards is exactly
that run. And a solve is invalidated by width, so a grid that reflows needs a
`ResizeObserver`; the creation window never had one and did not need one while
every write re-solved everything anyway. The sheet's peek layer does not, and
that is a fact rather than an omission: a `.pkc` is a fixed 262px.

**A chat card is one card, and fifty of them are not.** `renderChatMessageHTML`
fires per message and each scheduled its own `fit` into the same double-`rAF`
callback, so opening the log or reconnecting was fifty solves on one frame.
`fitSoon` is one shared queue at the same few-per-frame rate, with each card's
arrival still landing after its own fit — a card that had to wait for
forty-nine strangers has stopped arriving.

**Restarting an animation costs a layout, so do it once.** Re-firing a CSS
animation means taking the class off, flushing style and putting it back, and
the flush is a read of `offsetWidth`. `setMarks` and `setPool` both did it
*inside* their diff loop, so the cost scaled with how much moved: a Severe hit
marks four boxes, a rest clears seven, the Hope action spends three pips. The
flush only has to sit between the removal and the addition, so one serves
everything that moved, and both drivers are two passes now.
`tools/test-mark-restarts.mjs` asserts the flush count **beside** the resulting
classes rather than instead of them — a driver that is fast and leaves a spent
Hope lit is the bug `settle.js` was written about, and it fails in the
direction that looks like nothing is wrong.

**And the FLIP read and wrote alternately.** `capture()` cancelled a travel and
measured a row in the same step; `flip()` took a rect and started an animation
in the same step. Both are a write followed by a `getBoundingClientRect`, so
each pair forced another layout, once per row, on a vault twenty rows long and
on the one frame a FLIP has to land in. Batched, the result is identical — a
transform on one row cannot move another row's box, so no rect ever depended on
the order, and one layout is also the only way the distances can be consistent
with each other.

**One thing was measured and left alone.** `hud-flow` animates a registered
custom property feeding a conic gradient, so the Fear strip's rim repaints
every frame, indefinitely, in the chrome above the canvas. It is real and it is
25,000 pixels; making it composited means rotating a square large enough to
cover the strip's diagonal and moving the chamfer to a wrapper, which is a
visual change to a designed component to buy back a cost that has not been
shown to matter. The pips' own idle motion is already a transform and an
opacity and is free.

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

## One picture, two frames

`system.portrait` is `{sheet, plate}`, three numbers each, and the schema's own
first line is the whole design: **one picture, two frames.** The diorama is a
wide band across the top of the rail and the roll plate's portrait is a
narrower panel behind the verdict, so a crop judged in one is a chin in the
other — but there is only ever one photograph underneath both, and every
argument in `frame()` and in the drag rests on that.

**The premise broke and nothing on either side looked wrong.** The sheet's
framing preview drew `actor.img`; `portraitOf` in `dice/rolls.ts` posted the
card with the *token* art, on its own reasoning that the token is what the
table is looking at. So a character with token art — which is most of them,
and the diorama has a Token button for it — framed a face against one picture
and got a different one on the card, wearing offsets judged for a face that is
not in it. From the sheet that reads as the framing not saving, and it works
perfectly for anybody who never set token art, which is why it lasted.

Two things about the shape of it are worth keeping. It is **invisible by
construction**: each half is correct about the field it names, so a reader
checking the schema, the drag, the write and the CSS finds four correct
answers and no bug. And the machinery a reader would go and check first —
`writeFrame`, the `sheet`/`plate` key, the `--fdx`/`--fdy`/`--fz` on `.por` —
is entirely present and entirely working, exactly as the price parser was
before `PAYER` widened it.

**The picture is the actor's own now, with the token art as the fallback.**
That is the diorama's own argument run the other way: a token is drawn to be
read at 100px from above, and this panel is a head-and-shoulders wash with a
name and a 48px numeral on it. The fallback stays because a creature built
token-first — most of the adversary roster — has nothing else to show, and it
also makes a plate agree with the sheet header every actor already has, which
draws `actor.img` for all four subtypes.

And the agreement is **structural rather than checked**: `portraitOf` is
exported and the sheet's preview calls it. A second copy of "which picture
does this actor's card draw" is a second copy that can disagree, which is the
whole of the bug, reached from the other side.

`design/plate.js`'s `POR` had drifted too — it wrote `--pic` and no framing at
all, so a framed portrait was a thing no study page could show and
`tools/verify/` had to fake by setting `--fdx` by hand. Same finding as `sq`
against `shapeOf`: right in the game, wrong on the page. Both builders write
it now and the check asks the builder rather than dressing its output.

`tools/check-portrait-framing.mjs` is the ratchet, in `check-focus.mjs`'s
idiom, and it runs in `typecheck`.

**One thing was investigated and is not the cause**, which is worth recording
because it is the explanation this file's own notes point at. `dice/chat.ts`
redraws a posted `.dh-card` from its flag partly because "Foundry's sanitiser
drops a `style` carrying a `url()`", and a plate is *not* redrawn — so the
obvious reading is that `--pic` and the framing beside it are lost on the way
into the database. Measured against the installed Foundry rather than read:
chat content goes through `sanitizeHTMLField` → `cleanHTML` → `sanitize-html`
with `ALLOWED_HTML_ATTRIBUTES`, `style` is allowed globally for every tag, and
`allowedStyles` is never set. The whole attribute survives, `url()` and all.
What the sanitiser genuinely takes is `<svg>`, which is why the card is
redrawn and why the change log is built out of `<i>`/`<b>` and holes.

## The density scale

Every sheet this system draws — character, adversary, companion, environment,
item — has **`.win` at its root**, so density is one decision rather than sixty
numbers spread across four stylesheets and two Svelte style blocks. Five
properties are published there and `design/sheet.css` opens with the argument:
`--sec` a section's own vertical padding, `--run` the space between blocks
inside one, `--row` a pressable row's own padding, `--pnl-x` a pane section's
side padding, `--dio` the portrait diorama.

**What is on the scale and what is not is the whole of it.** Structural space
is; nothing that makes an object what it is — type size, colour, silhouette,
the tile's and spine's `cqw` proportions, a mark's geometry, a gem's metrics —
because a sheet that got smaller by shrinking its type is the gear tile's own
failure chosen deliberately: large pictures and caption-sized data. The values
are the old ones less the slack, which had been tuned on a study page, where a
document is as tall as it likes; a Foundry window is 860px with a scrollbar.
Measured: the rail gives back 92px, the advancement tab 130, the item sheet 88,
and nothing on any of them reads differently.

**Every use site carries its own fallback**, and that is not belt and braces.
An unset custom property inside a `calc()` or a shorthand is invalid at
computed-value time, which does not fall back to the previous declaration — it
falls back to the property's *initial* value. So a `.pnl` drawn outside a
`.win`, which is what a dialog borrowing this vocabulary is, would not be
slightly wrong; it would have no padding at all. `tools/verify/`'s panel stage
carries both readings and asserts both: that a panel inside a sheet root *moves
when the scale moves* — the Fear strip's ramp check pointed at a property — and
that a panel with no sheet over it lands on the scale's own numbers anyway. A
literal padding put back by hand passes every other assertion on that page.

`styles/actor-sheets.css` is hand-authored and takes the scale rather than
restating one: its `.pnl` override was 10/14/11, which is exactly what the
scale now says, so the override was a second copy of one number rather than a
decision and is gone. The three restated paddings in `CharacterSheet.svelte`
are the one place a value is genuinely duplicated, and they have to be — the
button reset there zeroes the padding to get three controls out of Foundry's
28px, and a `padding:0` in the same rule beats the design's from the `system`
layer.

**One thing was fixed on the way past.** Those three sheets' tab strips printed
the chosen tab's label in `--paper` on a `--frame-2` strip, which in the default
dark theme is `#171a1f` on `#101317`: the label was not dim, it was gone. It was
a straight copy of `.tabs button.on`'s *background* into its `color`. The
character sheet's own strip is the pattern — the chosen tab takes the pane's
ground and its label takes the pane's ink.

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

## An Experience is a sentence

`.xp .r b` truncated with an ellipsis, in a rail that is a fixed 288px — about
thirty characters, which is a clause. An Experience is not a label picked off a
list; it is a phrase the player wrote, and the half of it that fits is not the
half being chosen between. Two Experiences that begin the same way are the
common case, because the thing they begin with is the character.

Two other answers were available and both are worse. **Widening the rail** taxes
every other thing on the sheet for one field, and the rail is where Hope, the
four tracks and both thresholds live. **Shrinking the type to fit** is the gear
tile's failure one section above, arriving by choice rather than by accident: a
7px Experience beside a 12px one is large pictures and caption-sized data again,
and this time we would have typed it in.

So it wraps. `overflow-wrap:anywhere` and not `break-word`, because only
`anywhere` also shrinks the min-content contribution — the rail's scroller does
not go sideways, so a single unbroken word would otherwise force the column open
rather than break inside it.

**The modifier is pinned to the first line**, and `align-items:baseline` is what
does it. Flexbox baseline alignment takes an item's *first* baseline, so a `+2`
beside a phrase that has grown to three lines stays level with line one, and the
rail stays a column of numbers you read straight down rather than one where the
modifier drifts to the middle of whatever height its row happens to be. On the
ordinary one-line row it lands within a fraction of a pixel of where centring
already put it and no row changes height, so the common case is unmoved.

`.xp` is one component making one claim, so the adversary and companion sheets
take it with the character sheet. **And the roll popover's `.xr b` takes the
same treatment**, which is the surface where it matters most: on the sheet an
Experience is a record you are reading, and in the popover it is the thing you
are *choosing*, so hiding which one you are about to buy is the worse of the two
failures. Baseline alignment there picks up the tick and the 7px cost caption
for free — both sit on the first line of however long a phrase, rather than
being centred against a block that may now be tall.

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

`src/packs-src/card-resources.mjs` is hand-authored and keyed `type:name`.
Compendium documents deliberately ship without its counter annotations:
players and GMs add only the counters they want after an Item is embedded on a
character. `withDice()` attaches the kept-die annotations, because a die tray
records faces rather than a scalar counter.

It is two blocks and a list. **`PILES`** are the twenty-one cards read
individually, because what they count is particular — Flight is *your Agility,
minimum 1*, which is the floor's whole reason; Wild Fortress counts **Hit
Points** upward, not uses. **`BUDGETS`** are the regular "once per X" majority,
built by `once()`. They remain checker evidence for the rules reading, not
runtime compendium data. **`DECLINED`** records matching cards that carry no
tracked resource.

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

**Five of the six go through one snippet and the sixth does not**, which is
where the die pools first shipped invisible. `pools` in `CharacterSheet.svelte`
draws both arrays for a whole Item and serves every spine and tile, because
those rows *stand for the document*. The Features panel cannot use it: a class
carries several features and only one of them counts anything, so its rows bind
by feature name through `resourcesFor` and now `dicePoolsFor`, and it writes
its own `<Chits>` and `<Keep>` inline. Adding a second kind of pool to `pools`
therefore reaches five hosts and misses the one that draws **every class
feature in the system** — Prayer Dice, the Bard's Rally Die, Unstoppable, the
Patron Die and the Combo Die, five of the eleven annotations, on the panel a
player looks at first. `dicePoolsFor` sat written and uncalled, which is the
shape of it: the binding half was built and the drawing half was not.

**And a ceiling is not a constant.** `setChits` has taken its max on every
drive since it was written and `setKeep` read its own once, off the dataset, on
the frame the row was built. Prayer Dice are "equal to your Spellcast trait"
and a Seraph *has* no such trait until the subclass card lands — so the tray
drew no sockets, forever, on the card whose entire job is to say how many you
may hold. Three of the six ceiling sources move like that: Proficiency and tier
at every advancement, `fear` several times a session. The row redraws on a
changed max for the reason it redraws on a changed die size — both are the row
changing *shape* rather than value, which is the boundary `setChits` already
draws at its own cap. A study page cannot see this, because it holds a fixed
capacity: a tray drawn at zero and a tray that *became* zero look identical on
one, so the check lives in `tools/verify/`.

**Where a card rolls its dice on arrival, placing one rolls it.** Prayer Dice
carry `onRefresh: "reroll"` and no roll button, because rerolling them is
offering to change an answer the session already gave — and `placeDie` put down
a blank, which in a tray with no roll button is a die that can never have a
face. "Roll a number of d4s and place them on this card" is one act. Slayer
Dice stay blank, because those are rolled when they are *spent*.

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

## A card's damage is data

`post-card.ts` decided whether a card rolls damage by sniffing its prose for the
literal phrase **"damage roll"**, and the corpus says that is the wrong question
twice over. Seventy-seven entries print a complete expression — a count, a die
and usually a bonus — and **not one of them says the phrase**. The phrase
matches fifty entries, thirty-four of which print no dice at all. The two sets
are very nearly disjoint, because the English is not being used the same way in
them: "add a d6 to your damage roll" is a clause about a roll the *weapon* is
making, and "they take 2d8+4 magic damage" is the card rolling.

**So there are two buttons and never one.** The weapon's `roll-damage` was right
all along for the clauses it fired on and keeps every one of them; the card's
own is a second action beside it, and its label prints its dice — "Roll 3d8+2" —
because that is what tells it from its neighbour. The plate it posts is named
after the *object* instead, exactly as a weapon's is, because a plate has no
neighbour to be told apart from.

`src/packs-src/card-damage.mjs` is the annotation, hand-authored and keyed
`type:name`, and it is `card-resources.mjs`'s argument arriving at a second
reading. `domain-cards.mjs` is generated from a snapshot we do not own, so an
interpretation living inside it is an interpretation that gets overwritten — and
an interpretation is what these are. "1d20+2 magic damage **for each Stress
marked**" is a printed expression and not a formula: the dice repeat a number of
times only the table knows at the moment of casting. Unleash Chaos rolls a d10
per token spent. Preservation Blast scales its count on the Spellcast trait, and
the only scaling this shape offers is Proficiency. Every one of those matches a
regex for dice, and recording any of them as a fixed count is quietly wrong on
every character who holds it.

**What cannot be held honestly is declined out loud** — sixty-one phrases on
fifty-eight documents, each with the words it was read from and the reading that
disqualified it, under four headings: additive, reduction, a count this shape
cannot hold, and somebody else's stat line. `DECLINED`'s values are **arrays**
here where `card-resources.mjs`'s are strings, because a document can decline
twice for unrelated reasons — the Werewolf does — and Hungry Fire is annotated
*and* declined, its d8+2 being what casting deals and its extra 1d8 firing on
the target's next spotlight.

Fifty-seven expressions on fifty-two cards carry an annotation, and `withDamage`
attaches them at each pack's own `export default`, beside `withDice` and for the
same reason: no generator emits either call, because a generated file is an
*ingredient* and the wrap is hand-written downstream where a re-fetch cannot
revert it. Unlike a counter this **does** ride on the compendium document — a
counter is something a player decides to keep, and a printed expression is on
the card whether anybody wants it or not. The field is **`cardDamage`** and not
`damage`, because a weapon's `damage` is its own singular stat line and
spreading an array of that name over every subtype would shadow it.

`tools/check-card-damage.mjs` is `check-resources.mjs`'s twin and asserts six
things: every key names a document, every `said` is still on its card, the
closed sets hold, two modes on one document do not share a name, the ratchet —
a card matching the sweep and dispositioned nowhere — and **agreement**, which
the twin has no equivalent of. Agreement is that the `{count, dice, bonus}`
triple must be one the quoted phrase actually prints, and it is the failure that
happens when seventy-seven expressions are typed in by hand: an entry recording
`3d10+8` beside a `said` that reads 3d10+6. Both halves are perfectly well
formed and every other check here passes it.

    node tools/check-card-damage.mjs

`npm run build:packs` runs it beside the others, off the committed pack sources
and never the network.

Two deliberate partings from the twin, both stated in its header. It does **not**
fail a decline the sweep no longer reaches, because every decline here carries
`said` and a phrase is a better handle than a deliberately broad regex — seven
Versatile weapons are declined and swept by nothing, which is somebody having
read further than the sweep reaches and is the direction this should fail in.
And it does not fail a card that is annotated *and* declined, because Hungry
Fire is that card and the file argues it out loud.

**The ratchet fired on its first run against the whole world, which is what a
ratchet is for.** Fifteen cards matched the sweep and were dispositioned
nowhere, every one of them in a deck that arrived after the reading was taken —
the file had been read against one corpus and is swept against a larger one. Six
print a complete expression and were missing a *button*, not merely a record;
nine landed under readings `DECLINED` already names. All fifteen were written up
rather than silenced, which is the only way a coverage ratchet is worth having,
and the six new readings are newer than the rest of the file and worth a second
reader.

## A card's buttons are data too

Everything above about `cardDamage` — one reading, keyed `type:name`, filled at
`prepareBaseData` so an embedded copy gets it — is the same argument arriving at
the rest of what a card does. **What a rule asks of you is authored now, and no
longer swept out of its own prose at render time.**

Three patterns used to decide a card's buttons. `featurePrice` read a cost,
`rollCall` read a roll, and a third sniffed the literal words "damage roll".
Each was bounded with real care, each is argued for at length in the sections
above, and each was wrong somewhere nobody could see:

- Three weapons named **Scary** say "the target must mark a Stress", and the
  sheet charged that Stress to the *wielder*.
- Four suits of **Banded Armor** say Severe damage costs an Armor Slot, and the
  sheet charged it on a press rather than on the damage.
- **Unleash Chaos** printed "Mark Stress" where the pattern wanted "Mark a
  Stress", so a card that has always cost a Stress cost nothing at all until
  SRD 2.0 added the article.

None of those looks wrong afterwards, and that is the whole argument. A card
with a button too many and a card with a button too few both render perfectly;
the only witness is the player who paid, three hours later, noticing a track
that has not moved all session. `PRICED` in `check-cards.mjs` existed to keep
that safe by hand — 275 documents, 843 quoted clauses — and it said in its own
comments what it could not do: **prove a price was missed.** A card stating a
cost in words the regex did not know was invisible to it by construction.

### The vocabulary is closed, and the declines are the deliverable

`ACTION_KINDS` in `config.ts` is fifteen presses and nothing else, each backed
by at least thirty distinct rule units in the corpus, in five families:
currency (`pay`/`gain`/`clear` over one `amount` block), the document's own
counters (`move-resource`/`die-pool`/`refresh`), rolls (`roll-trait`,
`roll-damage`, `roll-card-damage`, and `roll-dice` for the fifty units that
roll a die which is *not* damage and have never had a button), the table's
state (`apply-condition`, `grant-effect`), and the two that already existed.

Closed rather than a script field, and that is the load-bearing decision. A
rule this cannot express gets **no button and a `DECLINED` entry naming the
reading that disqualified it**, which is a fact somebody can act on — where a
scripting hatch would have produced a button nobody can review and no ratchet
could ever police. It is `card-damage.mjs`'s posture applied to a much larger
reading: sixty-one declines there, and here the declines are the specification
for whatever comes next.

**`pay`, `gain` and `clear` are three kinds over one block of tracks**, and the
sign was never the difference: paying can be *refused* when the purse is short,
gaining cannot, and clearing is bounded by what is marked rather than by what
is left.

### Two places, and mixed ancestry is what settles it

`system.actions[]` **and** `featureField.actions[]`, mirroring `modifiers` and
deliberately not `resources`. Both arrangements are right for their own reason.
A player *adds* a counter after embedding, so it belongs to the document and
names its rule by string. An action is printed **on** a rule and has to travel
with it — creation copies one ancestry's bottom feature onto another document,
and a flat `feature: "Surefooted"` binding would arrive on a document that has
no such block. A domain card, a consumable and a piece of loot print their rule
in `system.description` and have no block to nest in, which is why the
document-level array exists as well.

`src/packs-src/card-actions.mjs` is the reading, delivered twice from one
source: `withActions()` writes it into the built compendium document, and
`fillCardActions` writes it onto every construction of an **embedded copy**,
because a domain card on a character sheet is a duplicate made months ago and a
pack rebuild never reaches it. Neither ever overwrites a non-empty array — that
is somebody's homebrew and it wins. This is what keeps the whole change out of
`src/module/migration/`, where it would otherwise have been the largest entry
by an order of magnitude.

### `said` is the field that makes a thousand readings reviewable

Every action carries the words it was read from, quoted off the card. It is
`card-resources.mjs`'s provenance promoted out of a checker's table into the
data itself, and it does three jobs nothing else can: a human can check 989
readings against their own quotations in an afternoon and cannot check them
against 1,136 documents ever; `check-actions.mjs` fails the build when the
words leave the card, because upstream fixing a typo and upstream rewriting a
rule around its cost look identical from here; and it is the posted button's
`title`, so "why did that button take a Stress" is answerable three hours later
without scrolling back to the card.

**`when` is printed and never read.** Ninety-eight rule units say "on a
success", and a posted card has no honest link to the roll that resolved it —
which is exactly why `roll-card-damage` reads no critical. The condition rides
on the label, the table reads it, the press does what it says. Modelling
outcome gating would be the same guess with a bigger blast radius.

**`steps` is one level deep structurally** — a step is `actionField` minus
`steps` and `said`, so a chain of chains is not expressible rather than
discouraged. One level is what "Spend a Hope **and** make an attack" needs, and
it needs it: two buttons for one sentence lets somebody take the second without
paying for the first. A chain **charges before it rolls and aborts whole**,
which is `payFor`'s rule applied to a list rather than to one roll, and it is
the only arrangement in which "aborts whole" means anything.

### What survives the authored path, and why

Exactly two, and both are structural rather than printed. `mark-use` is *The
Twilight Marked*'s toll — a rule of the campaign frame, not a sentence on Rune
Ward — and `use-item` is a consumable's quantity, a fact about the object. No
reader annotating a card should have to remember to write down that Root and
Void cards cost a Mark. Everything else an annotated document offers is what
its entry says and nothing more, so a card cannot carry a counter button its
reader did not put there.

**Resolution happens at the post, not at the press.** An authored action names
things in the card's vocabulary — a counter by its printed name, a trait that
might be the `spellcast` pointer, a damage mode by which expression it is — and
a posted card carries answers instead, because the message is a record and the
character may have changed by the time somebody presses it. It is also why the
label is written there: a button reading "Roll 3d8+2" that threw a different
number of dice would be worse than no label at all.

**Returning nothing is a real answer.** A `spellcast` pointer that resolves to
nothing on a character with no spellcasting subclass emits *no button*, because
a row that answered it by rolling Finesse is a worse answer than silence. An
action naming a counter the document does not carry draws nothing rather than a
button that does nothing.

**And it retired the last small parser in that file.** `actionsFor` decided
whether a counter was spent or marked by testing its *name* against
`/^uses?$/i` — a guess about English, on data whose author already knew the
answer.

### Conditions are a press, never a consequence

`apply-condition` puts one of the twenty-three registered conditions on
somebody through `damageRecipients` — a GM means the tokens they have
**selected**, a player means their own character — so one button is correct on
both sides of the screen. Never automatic, and that is the rule rather than an
omission: applying a condition is adjudication, and the sheet is not where
adjudication happens. Idempotent, because pressing twice is something people do
and two copies of one condition is two rows in the HUD saying the same word.

Reaction Rolls still get no button, and the reason is unchanged: the roll a
target is forced to make belongs to the other side of the exchange, which is
precisely what `apps/targets.ts` was written to fix for damage. They are
declined out loud rather than omitted.

### Temporary effects are ActiveEffects, and passives are not

`grant-effect` creates a real ActiveEffect, which is the right document for a
rule with a duration: it shows on the sheet, a GM can lift it by hand, it
survives a reload. `src/module/effects.ts` is the sweep.

**The scope rides in a flag rather than in Foundry's `duration`**, because that
counts seconds, rounds and turns and Daggerheart has none of the three. It has
"until your next long rest", "until the end of the scene", and — thirty-seven
times — the bare word *temporarily*. `ACTION_DURATIONS` is `RESOURCE_REFRESH`'s
members with `manual` replaced by `temporary`, and the sweep hangs off the four
call sites that already reach `refreshResources`: both rests, `endScene()` and
`endSession()`. One seam, so a card granting a bonus *and* a use until your
next long rest has both halves expire together by construction rather than by
two mechanisms agreeing. There is deliberately **no table** in `effects.ts`
saying which rest ends which duration — `restScopes` already answers that, and
a second copy is the exact bug `restScopes` was itself written to fix.

**`temporary` is never swept.** It is the rules' own keyword for a state a roll
clears, which is GM-adjudicated; putting a timer on it would be inventing a
rule. It gets a real, visible, hand-dismissable effect and no expiry.

**Always-on passives stay `modifiers` and did not move**, and the reason is the
`condition` field. Half the interesting passives in this corpus are gated on
loadout composition or a track's state — four cards of one domain, no weapons
equipped, a full Stress track — and an ActiveEffect `change` is unconditional
by construction, so an always-on version of "while you have 4+ Grace cards in
your loadout" is silently wrong exactly where the rule is most specific.
`activeModifiers` folds effect-borne modifiers in as a genuinely separate
population: an Item is a passive because you are *holding* it, an effect is one
because somebody granted it and it has not expired.

### The parsers are the suggest button now

`sheets/suggest.ts` is where they went, and nothing was deleted — `featurePrice`
moved there whole, with its own argument unedited, because the reasoning is
what makes a suggestion trustworthy enough to offer. The same three patterns run
**once, on a press**, and their guess arrives as ordinary editable
rows in the Automation panel that somebody looks at before it can charge
anybody anything. **A guess you can see and edit is a different object from a
guess that acts.**

It is deliberately more generous than the runtime version could be: an
over-suggestion costs one click to delete, and the failure that mattered was an
over-*charge*, which this cannot make. It **appends** rather than replaces,
because somebody pressing suggest on a block they have already edited means
"and what else did you see", not "throw mine away" — a duplicate is one click
and a hand-written action is not recoverable. And it may only ever name a pool
or expression the document actually carries, because one naming a missing pool
draws no button and gives the GM nothing on screen to explain why.

`authoredPrice` is what replaced it on the sheet, and it is a change of
*meaning* rather than of implementation: the parse could only ever find the
first clause per currency, because a regex cannot know whether a second "mark a
Stress" is a second price or the same one restated. A reading knows. A chain's
steps are included, since the whole point of a chain is that it is one act with
one bill.

**One authored cost predates all of this and survives**: a `feature` Item's
`stressCost`/`fearCost`, which somebody typed into the item sheet. A homebrew
feature built through those two fields goes on charging what it was told to.

**An unannotated document gets the two structural presses and nothing else**,
which is the posture rather than a gap — `check-actions.mjs` will not let a
rule unit through unannotated and undeclined, so a document reaching that point
has genuinely nothing authored, and a guess there would be the retired parser
back under another name.

`apps/rules.ts`'s three sweeps survive untouched as the fallback for
un-annotated documents, and the asymmetry is worth stating: **surfacing a rule
is safe to guess at, charging for one is not.** A sweep that shows you a rule
you did not need costs a line of panel; a parse that takes a Stress costs a
resource.

### The check that could not see its own subject

`check-item-sheet.mjs` proves every declared field has a control somewhere, and
its walker incremented the bracket depth **before** flushing the token it had
accumulated. `...tracked()` is a token at depth zero followed immediately by
`(`, so the next branch was the depth-above-zero one, which resets the token.
The spread was never recognised and `keys.push("resources")` was unreachable
code.

So every field the spread carries had been invisible to it for as long as it
existed, and the tool printed the identical sentence — "every one reachable" —
before and after the stand-in was written, which is why nothing caught it. That
is precisely the failure the file exists to prevent, arriving in the file
itself. It went from 68 fields to 123, and reported what it should always have
been reporting: `actions`, `modifiers` and `cardDamage` had no control on any
of the eleven subtypes. **Two of those three predate this work entirely** — the
compendium has been writing passive modifiers and printed damage expressions
since they existed, and a GM has never been able to see or edit either.

The counter runs after the flush now, and the stand-in reads `tracked()`'s own
members rather than restating one of them, so the next field added to the
spread is policed by being added.

### `tools/check-actions.mjs` is the ratchet, pointed the other way

`PRICED` asked *did the pattern start charging something nobody read*. This
asks *is there a rule unit nobody has read*, which is answerable because the
corpus is closed, and it is what `PRICED` explicitly could not do. `PRICED` is
**deleted** rather than left standing: a ratchet policing a pattern nothing runs
goes green on a system it no longer describes, and the next reader trusts it.

    node tools/check-actions.mjs --report

Five checks — coverage against a deliberately broad sweep (a false positive
costs one `DECLINED` line, a false negative is a card that silently loses its
buttons); `said` still verbatim on its card, with emphasis flattened both sides
because quoting "Mark a Stress" off "**Mark a Stress**" is quoting correctly;
every closed set lifted from `config.ts` **as text**, which is
`check-item-sheet.mjs`'s move for its reason, so a rename stops the tool rather
than leaving it checking a set nothing uses; every `resource` and `damageName`
naming something the document carries; and the shape rules — no authored
`use-item` or `mark-use`, no step carrying `steps`/`said`/`when`, no key naming
a document that is not there.

Its block walk is deliberately the same one `fillCardActions` does, in the same
order: a block this tool can see but annotation cannot reach would be a check
passing on data the game never loads.

**What it cannot check is whether the reading is right.** A `pay` of one Stress
on a card that says "mark a Stress" and one on a card where the *target* marks
it are indistinguishable here — both quote real words off a real card. That is
the reader's job, and `said` is what makes it a job a human can finish.

`tools/test-authored-actions.mjs` is the behaviour half, and it is
negative-controlled: removing the early return that suppresses the parse fails
its first assertion, and making the `spellcast` pointer fall back to Finesse
fails its fifth.

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

**And the pair rolls for its own sake.** Every other duality roll here is
*about* something — a trait, a weapon, a card that asked for one — and each
brings a number with it. A great deal of what a table actually rolls is
neither: "roll me a duality and tell me how the night goes", a card being
improvised, a house rule that wants 2d12 and a modifier somebody agreed on out
loud. The only way to do that was to press a trait and subtract its modifier in
your head, which puts a number on the card nobody rolled. `rollFree` is that
roll, and `.duo` is the press.

**It is a mark on the Attack panel's heading, and that is a correction.** It
was a third `.wr` at the foot of the attack bar, on the reading that it is the
same gesture as the two rows above it — press, compose the sentence, roll —
and that is true and is not what decides the size of a control. A `.wr` is
**48px** of sheet, on the tab the density scale had just recovered 60 from,
and a row that shape claims to be a third weapon. This is the least
reached-for control in the panel and it needs one line, so it goes on a line
the panel already has: `.pnl > .k` carries a press slot, which is `+ card`'s
own position with a different verb in it. Measured, the heading goes 9px to
14px — the whole feature costs **5px** rather than 48.

The mark is the two diamonds rather than the word "duality" doing the work
alone: the same rhombus the Hope gems, the roll button's own pair and the
plate about to be posted are made of, in the two colours that say which is
which. At 9px a heading has room for a mark and a verb and not for a sentence.
`margin-left:auto` with an override on `s + .duo` is `.nw`'s pattern exactly,
and stated in that order for a reason — `:only-of-type` was the first attempt
and it out-specifies the adjacency rule, so "proficiency 2" was left stranded
in the middle of the heading.

**And it takes `align-self:center` rather than the row's baseline**, which is
this file's own recurring lesson arriving on a control that is a *box* rather
than a word. `.pnl > .k` aligns on baselines so the heading and its meta sit
on one line, and an inline-flex box takes its baseline from its **first flex
item** — which here is a 6px pip with no text in it. So the chip hung off the
line by the depth of a diamond and took the heading row with it: 14px of press
in a 21px row, which is the whole five-pixel saving the position was chosen
for, spent. It measures 14 in a 14 on a study page and 14 in a 21 in the game,
because Foundry's `elements` layer is what supplies the line-height the
baseline is computed against. `tools/verify/` carries the layer and is what
caught it, on the run that added the check.

**It contributes nothing, and that is the claim.** No trait term, and no
passive `actionRoll` modifiers either — a free roll is not necessarily an
action roll, and a bonus the sheet added silently is a total the player cannot
reconcile with what they typed. The popover opens at `base: 0`, so what goes in
is what the player put in and the card's arithmetic strip adds up to exactly
what was on screen. Experiences still cost a Hope, through the same `payFor`
every other roll uses.

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

### A card that asks for a roll

A posted card has carried a row of actions since the marked decks arrived — pay
the price, spend a counter, roll the weapon's damage. What it could not do is
the thing most cards actually ask for. "Make a Spellcast Roll (15)" is the first
line of half the domain deck, and the only answer was to read it, go and find
the sheet, and press the trait plate saying the same word.

**This is the second bounded parse of English rules text in a system that
permits one**, so it argues for itself the way `featurePrice` does or it does
not get to exist. A roll is written in one shape, on purpose, every time:
Daggerheart asks for one in the imperative — "Make a Spellcast Roll", "make an
Instinct Roll (12)" — and everything else putting a trait next to the word
*Roll* is describing a bonus to one rather than asking for one. Channeling's
"+1 to Spellcast Rolls" earns no button, and neither does "you gain a +1 bonus
to your next Knowledge Roll" or "+10 bonus to your damage rolls". None of them
says **make**, and that verb is the whole of what a button needs.

Required, and required to be *imperative*, which is `featurePrice`'s own
discriminator asking a different question. There it is who is paying; here it is
who is being told to roll, and the answer has the same shape — a clause head or
an offer. "When you *would* make a Spellcast Roll" and "before *you* make a
Spellcast Roll" both name a roll being made somewhere else, and neither "would"
nor "you" is in the caller set. Over `src/packs-src/` the pattern takes a
hundred and fifteen matches in thirty-one distinct shapes, and every
counter-example above was checked one at a time rather than assumed.

**No Reaction Rolls, and that falls out of the shape rather than needing a rule
of its own.** The trait word has to sit immediately against `Roll`, so "make an
Agility Reaction Roll" is unreachable — which is the point and not a limitation.
Twenty-four cards name one and almost every one is the *target's* roll, so a
button would put the roll on the wrong side of the exchange, which is precisely
the failure `apps/targets.ts` was written to fix for damage. It is also what
makes `to` safe in the caller set, even though `to` is the word a coercion is
written with.

**The button opens the roll popover rather than rolling.** A card saying "make a
Spellcast Roll" is the start of a sentence you are still composing — the
advantage and its sources, the flat modifier, the Experiences and the Hope they
cost — and a button that rolled raw would be the one roll surface in this system
where you cannot bring an Experience. `apps/ask-roll.ts` is that seam and it is
thin on purpose: `dice/chat.ts` is the *message* layer, it knows which flag a
claim spends and how an `<li>` is dressed, and it has no business knowing where
a popover anchors or how a base modifier is summed — while `CharacterSheet.svelte`
owns that arithmetic already and cannot lend it, because a Svelte component is
not something chat can import. One call, two callers, no second copy. The anchor
is the pressed button, because `prep` flips left when it would overflow and a
300px sidebar is where that matters most. A Difficulty rides along **only when
the card printed one**: a target number is the GM's everywhere else here, and
"Make a Spellcast Roll (15)" is the single case where the table can already read
it off the object in front of them.

**And this is the one place the marked decks' Spellcast override is honest.**
Root casts with Instinct and Void with Knowledge, and *Root and Void* says the
rule is stated and not substituted — which is a claim about a roll the player
started from a trait plate, where a campaign rule reaching into the roll engine
is invisible the first time it is wrong. A button on the card is the other
situation entirely: the object naming the trait is the object being pressed and
the player is looking straight at it, so reading `spellcastTrait` there would be
this file quietly overruling the card in the reader's hand. With no Spellcast
trait and no mark there is **no button** — a character with no spellcasting
subclass holding a card that calls for a Spellcast Roll is a table conversation,
and a row that answered it by rolling Finesse is a worse answer than silence.

**Two action kinds, and they claim differently.** `roll-trait` spends no flag at
all: a claim exists because a Hope leaves a purse and cannot leave it twice, and
a roll leaves nothing — you will roll this card again next round, and a button
that burned itself on the first press sends you back to the sheet for every
press after it. Ownership is the whole gate, and rolling stays independent of
the price above it, because several cards let you pay *after* seeing whether you
needed to. `roll-card-damage` **is** claimed, for the reason the plate's own
`roll-damage` has been since it was written: damage completes an attack, and two
clients pressing it is one attack dealing damage twice.

**And `blocks()` was the older half of the gap.** The damage sniff read
`card.text` alone, so a subclass, a class, an ancestry, a community and a
transformation — every subtype whose prose lives in `feats[]` and whose `text`
is empty — could never get a damage button at all. It read as those cards simply
not having damage on them. `blocks()` yields the text and every feature block,
and both parses walk it. That is a gap invisible by construction, which is what
`check-item-sheet.mjs` exists for in a different place and what nothing was
watching for here.

### Rolling a die again

A great many cards say to reroll something — a damage die, a Hope Die, the whole
lot — and the only way to do any of it was to roll again from the sheet and ask
the table to ignore the first card. That is two records of one roll, and the
second one is what everybody argues about. So **the die on the plate is the
control**: press it and it rolls again, in place, on the card that already
exists. `dice/reroll.ts` is the engine and `data-rr` is the handle.

**It rolls a real `Roll`.** The engine's opening promise — the dice log, seeded
randomness and any 3D-dice module stay honest — is not one a reroll may quietly
drop by writing a number into a flag. So a `Roll` is built, evaluated, painted
with the same DSN role the die was thrown under, appended to the message's own
`rolls`, and shown in 3D when the table is running the toy. `showForRoll` is
called rather than relied on, because DSN animates on message *creation* and
this is an update; it is gated on the same setting that suppresses the dice on a
fresh plate, which is the two halves of one switch.

**The plate is the record and the markup is a rendering of it.** Nothing here
touches the DOM: the stored options are updated and the content is rebuilt by
the same three builders that wrote it. That is what forced `next`/`nextAct` to
start being *stored* — they were the one part of a plate that lived only in the
markup, so a rebuild without them silently ate the "Roll damage" button. A card
posted before that has `weaponId`, which is the only trailing button any plate
has ever had, so the one lossy case answers itself.

**The face that was replaced stays on the card**, drawn beside its replacement
and struck through with `dim` — the class that already means *this did not
count* on a discarded helper's d6 and an adversary's unkept d20. A rerolled face
is the same claim and gets the same mark rather than a fourth vocabulary for one
idea. That is also what makes an **unlimited** reroll safe to offer: this system
does not enforce the card that permits one — it prints the rule and lets the
table read it — so what it owes the table instead is an honest record of how
many times you asked. A silent reroll would be the only thing on a chat card
that could be done without leaving a mark. Measured: the strip holds its 49px
through two supersedings and grows one line at three.

**A settled roll is settled.** The moment anything on the card is claimed — the
Hope taken, the Fear gained, the damage rolled or applied — the dice go inert,
or a claimed Fear could be rerolled into an unclaimed Hope and the claim flags,
which exist precisely so a thing cannot be collected twice, would be guarding an
outcome that no longer happened. `canUserModify` is the other half of the gate,
the same test `message-header.ts` uses to decide who gets a trash can: the author
of a roll and a GM are exactly the two people entitled to change what it says.

**The builders say which die each one is and stop there.** `data-rr` is emitted
unconditionally; `.rr` and the click are added by `dice/chat.ts`, which is the
division `data-dh-act` and `CLAIM_OF` already draw one function above. A builder
that asked who was looking would be a card that renders differently per reader,
which is the thing storing a plate as its options exists to prevent — and it
means a settled card's dice carry no hover at all, rather than a pointer that
lifts a die and then refuses it.

**The affordance is motion and light, not a mark.** Every mark this component
has is load-bearing — the X means "this did not count", `lit` means "this side
won", the deep-cut rim means "awarded, not rolled" — and a sixth badge on a 26px
chip is a sixth thing to decode on the one surface read at a glance. No
pseudo-elements either: `.dim` owns both of a die's, and a rerollable die is very
often a dim one, since an unkept advantage d6 is exactly the die somebody wants
to try again. The awarded maximum dice are the one set that never reroll, for
the reason they never tumble.

## The change log

Everything above is an event somebody **chose** to post: a roll, a card shown,
a rest taken, a character finished. The change log is the opposite — the record
of what happened to a sheet while nobody was posting anything. A player marks
three Stress and the GM, looking at the map, has no idea; a card comes out of
the vault and the only witness is the sheet it happened on. The rules ask a
table to keep these numbers where everybody can see them, and until now the only
place any of them existed was the sheet of the person holding it.

`src/module/ledger.ts` is the observer, `design/ledger.*` is the card, and
`design/ledger.html` is the study page. `src/module/activity-log.ts` is the
window it lands in, `design/activity.*` is that window, and
`design/activity.html` is its study page.

**And it is not in chat any more, which is the whole of the change.** For as
long as the ledger has existed the card went into the chat log, and that was
the wrong room. Everything else this system posts is an event somebody *chose*;
this is the record of what happened while nobody was posting anything, and
those two do not belong in one column. The cost was paid by the player, who
never asked the question: a four-person party in a fight settles a dozen tracks
a round, and every one of those cards pushed the roll everybody *was* looking
at further up a log four people are reading. The only relief available was the
world switch, which does not narrow the log — it deletes the record, and
deletes it for the one person it was for.

So it goes to the GM, who is who the rules ask to keep it, and stops being a
feed: **a window, there when you look at it and silent when you do not.**
Players get nothing at all, and that is not a permission being withheld — a
player already watches their own sheet move, and what the log adds is the other
three characters, which is the GM's job to hold.

**The store is a world setting and the active GM writes it.** A pile in memory
per client was the obvious build and is wrong twice: a GM who reloads
mid-session loses the session, and two GMs keep two records of one evening. So
it is `system` setting `activity`, capped at a hundred entries, written by
`game.users.activeGM` alone — `applyFear`'s arrangement for `syncVulnerable`'s
reason. Every GM's window reads one record and a reload rejoins it. The one
thing given up is a table playing with no GM connected: nothing is recorded,
because there is nobody whose record it would be.

Appends go through **one promise queue**, and that is not defensive
programming. An append is a read and then a write, the ledger buffers per
actor, and an area attack landing on three characters opens three windows
within a millisecond and closes them the same way — three appends in one tick,
two of which would read the store before the first had written it. The record
would be silently short exactly when the most was happening.

`tools/test-activity-log.mjs` is what keeps all three honest, and it is
`check-resources.mjs`'s ratchet pointed at behaviour rather than at content:
that a player's client and a second GM's record nothing, that three appends in
one tick are three entries, that the cap keeps the *recent* hundred, and that a
card called `<b>Twilight</b> Toll` arrives as text. The last is the one thing
the move out of chat took away — a posted card went through Foundry's sanitiser
on the way into the database, and this draws into our own window — which is why
`panel()` is exported at all. `npm run typecheck` runs it, so it runs before
the release workflow spends a version number.

    node tools/test-activity-log.mjs

The window is **rendered once and driven afterwards**, which is `setMarks`'s
and `setPool`'s contract arriving on an application: an entry that lands keeps
its arrival to itself, the twenty underneath it do not replay theirs, and a GM
reading the middle of the log does not have the scroller pulled out from under
them. `sync` diffs on the entry id — the store is append-only, so almost always
that is one new node prepended.

The door is a button at the head of the **chat sidebar**, GM-only, wearing the
count of what has not been looked at yet — `game.daggerheart.activity()` is the
other way in, and it refuses a player out loud rather than opening an empty
window. Not a scene control: that toolbar is for tools that act on the canvas,
and this acts on nothing at all.

**It finds its own wall rather than taking the one a hook hands it**, which is
the browse button's arrangement corrected. `ChatLog` is an ApplicationV2 built
out of *parts* in both supported generations, so what its render hook passes
and what its markup is called are two things this repo does not own and has
watched move once already — the Fear strip's dock changed between v13 and v14.
So `chatPanels()` looks for `#chat`, `.chat-sidebar` or a `section` on the chat
tab, minus anything inside a `nav` (the tab strip carries `data-tab="chat"`
too, and a button prepended into a nav item is a button inside a button) and
minus the outer of any nested pair. It runs on four hooks and again at `ready`,
and it is idempotent, so the cost of the extra three is a `querySelector` each.
Plural, because the chat exists twice the moment anybody pops it out.

The button goes in as a **sibling** of the message log rather than inside it: a
part's element is replaced wholesale on every re-render, which chat does
constantly, so a door in there would be swept away by the next message. And
when no panel is found at all it says so once in the console, naming the API —
a door that silently fails to appear is the one failure there is nothing on
screen to diagnose.

**The press is delegated off the document**, which is the same argument as the
wall. A listener belongs to the *node*, and this node's lifetime is Foundry's:
every way a live element comes back as a lookalike — an ancestor's `innerHTML`
read back and written, an `outerHTML` move, a pane rebuilt from a cached
string — leaves the button on screen, ours by class, and carrying no handler.
That is invisible, and it is indistinguishable from a button nobody wired. It
is also the idiom already: `data-pk` is four gestures delegated off the sheet
root rather than four handlers per row.

**And the button states `pointer-events:auto`, which is a measurement rather
than a precaution.** In a real client the injected door computed
`pointer-events: none`, inherited from one of Foundry's own layout containers —
the bands it switches off so they do not eat clicks meant for the canvas, with
each real control switching them back on for itself. The Fear strip pays for
exactly this in `#ui-middle`; this is the same lesson arriving in the sidebar,
where the symptom is a button that is the right size, in the right place,
drawn perfectly, and dead. `tools/verify/` puts a door inside a band with the
pointer events off and asserts it takes its own back, along with its 28px and
its unread badge — strip the declaration and it reports `none`, which is what
the client reported.

**The open singleton is keyed on `rendered`, not on being non-null**, and that
is the same failure one step in. The reference used to be taken before the
render was awaited, so a render that threw left a half-built application
standing in it forever: every click afterwards found something there, brought a
window that had never been drawn to the front, and did nothing whatever. One
failure became a dead button, with the symptom outliving the cause and saying
nothing about it. A failed open now clears the reference, logs and says so.

`.dh-ledger` stays in `frame.css`'s list of message kinds although nothing
posts one any more. A world that ran an older version has those cards in its
log already, and dropping the selector would not tidy anything up — it would
put a Foundry frame around a card drawn without one.

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

The move to a window of its own does not relax that, it re-argues it: a chat
log is a mixture and this is a column of nothing but these, so a card at twice
the height is half as much of the session on screen at once.

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

**That reason expired with the move and the rule is kept anyway**, which is
worth saying out loud rather than leaving as a check nobody can justify. A card
drawn into our own window is not sanitised by anybody, so an `<svg>` would
survive it — but the card is unchanged, nothing is gained by rewriting it, and
an older world's chat log still holds the posted ones. What replaces the reason
is a smaller one: the entries are stored as **data** and the markup is built on
render, so whatever the card is made of is rebuilt every time and the cheapest
thing it can be made of is the thing it already is.

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

**The gate was who pressed the button and is now who keeps the record.** It was
the initiator because the log was a chat message and `update*` fires on every
connected client — twelve clients agreeing to post is twelve copies of one
card. The record is a world setting now and only a GM may write one, so the
nominated writer replaces the initiator, which is `syncVulnerable`'s and
`applyFear`'s arrangement a third time: two GMs would otherwise append the same
entry twice.

What makes the swap possible is that **`options` are broadcast with the
update**, so the before-state stamped by the initiator's `preUpdate*` arrives at
the GM's client already — there is no socket here and none is needed. What
makes it *safe* is that the stamp is still written where it always was, under
`watching()`: an actor muted on the client doing the work hands the GM nothing
to record, so `muteLedger` goes on working from the other end of the wire
without knowing there is a wire.

`changeLog` is a **world** setting, on by default, and what it switches is
whether changes are *recorded at all* rather than who may look. That stopped
being a matter of taste when the log left chat: a per-client switch would have
let one player opt out of being seen, which was always the opposite of the
point, and there is now nothing for a player to opt out of. One decision for
the table, and the GM's — `pool.css`'s argument about the Fear HUD, arriving one
room over.

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
steppers taken off, 451px against the GM's 487 — and the **tally is on both**,
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

### The underside, which is not about Fear at all

The strip is the only piece of this system's chrome that is always on screen,
so it has become where the controls with nowhere else to go live. There are two
plinths hanging under it and **the split is whose they are**: on the left the
switch for what *this screen* draws, on the right the two acts that reach the
whole table. Only the left one survives the players' build — a scene ending is
the GM's to declare, and what your own screen draws never was.

`scene` and `session` are the two refresh scopes nothing in Foundry can infer,
and they are `endScene()`/`endSession()` with a button on them.

**The view switch turns the token chips off**, and it is on the players' strip
too — which is the one press here they may make. That follows from the setting
rather than from generosity: `tokenChip` is **client**-scoped, a preference
about one screen, so a player who finds the rings busy should not have to ask
the GM about it. It never touches `adversaryChip`, which is world-scoped and
stays a ruling about the table.

None of that weakens `pool.css`'s refusal to hide the Fear pool from players.
That claim is about the *pool*; a control that hides something else, on one
screen, at its owner's request, is a different thing entirely.

**It is a state and its neighbours are acts**, which is the whole of why it is
not simply a third button in the same group. `scene` and `session` do something
when pressed and say nothing standing still; a switch has to read as on or off
before anybody touches it. So it carries a mark, and the mark is a rhombus lit
like a pip against a socket — deliberately the vocabulary of the twelve fear
gems twenty pixels above it rather than a new one. `aria-pressed` is where the
state lives: the accessible name for exactly this and the styling hook at once,
so there is no class to keep in step by hand.

**The button is a reading of the setting and never a copy.** The press writes
`tokenChip`, the setting's own `onChange` raises `daggerheart.tokenChipChanged`,
and that hook is the only thing that ever moves the button — so the strip and
the checkbox in Foundry's settings window cannot disagree, whichever one you
used. `token-hud.ts` listens to the same hook to redraw the chips, and neither
file knows the other is there.

The chamfer stays on the **bottom-right** of both plinths although one of them
is docked left. The family mark is not a decoration that mirrors with its
container; it is the one corner this system always cuts, and two plinths
cutting opposite corners would read as two different objects.

### It is the duality plate's header now

The first build was honest and said nothing: a 9.5px mono caption reading FEAR,
twelve pips and a tally, on flat graphite. Every one of those parts is correct
and the object as a whole made no claim about what it was counting — which is a
strange thing for the one surface in this system whose entire subject is dread
accumulating in public.

A Fear card in chat has had a grammar for that since the plate was drawn, so the
strip borrows it: **the plate's violet field running deep→light at 103°, the
plate's diagonal weave over it, and the count set as a display numeral** rather
than as a caption. `.hface` carries all of it as background layers — the weave,
a corner bleed, the field, and a near-black base with alpha so the backdrop blur
underneath survives.

**The eyebrow is gone rather than restyled.** Twelve violet diamonds and a
stepper, docked above the map, is not an object anybody at the table has to be
told the name of, and a caption that says what the object already says is a
caption doing adjacency's job. That freed the width the numeral now spends.

**The plate's ghost was drawn and then removed**, and the reason is worth
keeping because it is about this component's shape rather than about taste.
`.pl-gh` is a copy of the thing the object is about, set three times over and
running off the frame, and it is the cheapest way to make a small box feel
cropped out of something larger. Here the only thing to copy is the count, and
the only place to put it is *behind the pips* — so it is legible at two Fear,
half-eaten at seven, and at eleven it is two vertical stems poking out from
under the lit diamonds, which reads as a rendering fault rather than as a
number. Every other object carrying a ghost has a quiet corner to put it in;
this one is a 51px band that is pips all the way across. So what says "cropped
out of something larger" is light instead of type: one wide radial anchored off
the bottom-left corner, giving the field a source it does not contain. Nothing
to keep in sync, and nothing that can collide with a pip.

**The edge flows.** `.hglow` is a single conic gradient turning about the
strip's centre in 22 seconds, and `.hface` is inset 1.5px on top of it — so the
rim is the only place the conic is ever visible, and it reads as light running
round the outline. On a 10:1 box the angular sweep crosses the two short ends
far faster than the long ones, which is what stops it reading as a wheel behind
a window. Under the conic is a flat base, because a rim that exists only where
the highlight currently is, is not a rim, it is a comet.

**And everything on it ramps on `--i`** — the pool's own fullness, the number
`gem.css` has always ramped a pip's burn on, now set on the strip and inherited
down. The field saturates, the weave comes up, the sockets deepen, the corner
bleed lifts, the rim's light strengthens. One transition on `--i` carries all of
it, so twelve is not eleven with one more diamond lit: it is a strip that has
got worse, easing over the half-second after the press. `show()` sets the one
property; nothing is rebuilt.

**The socket is violet-black now**, because a socket is a hole in whatever it
sits on and what it sits on is no longer graphite. Left at the sheet's near-black
an unlit pip read as a punched hole rather than as an empty slot, and it too
deepens with `--i` so the empty half of the row keeps its distance from the full
half at every value.

### Fear breathes and Hope does not

`gem.css` has said since it was written that there is **no idle animation
anywhere in it** — six things breathing on a character sheet is six things
asking for attention, all day, for nothing, and the whole motion budget belongs
to the moment a value changes. That rule now has one exception, and it is not
the same claim in a different hue.

Hope is on your own sheet, in front of you, one of forty things on it, and it
moves when *you* move it. Fear is docked in the chrome above the map, it is the
GM's, and the entire reason it is up there is that the table is supposed to feel
it sitting there between the moments anybody touches it. A pool that is
completely still until a button is pressed is a number; a pool that is barely
alive is a thing in the room.

So a lit fear pip carries two loops, both slow, both offset by the pip's own
place in the row — `--n`, written by `GEMS()` and set on nothing else — so the
strip reads as one thing moving rather than as twelve things blinking:

- **the breath**, an opacity on `.edge` and nothing else. That is the light
  *inside* the glass, so dimming and recovering it is the one part of this
  object that can waver without the object appearing to move: the silhouette
  stays exact and the face stays flat, which is the rule the whole component is
  drawn on. It floors at .42 of the settled value rather than at zero, because
  a band that goes out entirely reads as a pip flickering, which is a fault
  rather than a mood. 5.4s, offset a third of a second, so the wave takes about
  four seconds to cross twelve pips.
- **the swim**, one soft band turning inside the face, clipped by `.pit`'s own
  diamond, 23 seconds to the turn. It is what makes the gem read as liquid
  rather than as a lit tile — the strip's rotating rim making the same claim at
  the other scale, deliberately at a period that never falls into step with it.

Both are ramped on `--i` as well, so at one Fear they are very nearly nothing
and it is only at ten or eleven that the motion is something you notice you have
been watching. Neither runs on an unlit pip, a scarred one, or a pip playing a
gain or a spend — `:not(.gain):not(.spend)` is what hands the element back for
those. Both are cheap by construction: an opacity and a transform, no filter
interpolated and no colour mixed per frame. Both stop under
`prefers-reduced-motion`, which the gain and the spend do **not**: those are the
answer to a press, and a press with no answer is a control that looks broken.

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

The switch pays the same floor a stepper does, and `tools/verify/` asserts it
alongside the thing a stepper has no equivalent of: **that the two states are
drawn differently**, since a switch whose values look identical is worse than
no switch — pressing it appears to do nothing. That check failed on its first
run against a control drawing perfectly, which is the `--i` ramp's lesson in a
second place: the pip and the word both ease over .18s, so a computed value
read on the frame the attribute was set is the one the transition is currently
*at*. The transitions come off before the reading, exactly as they do for the
ramp.

`tools/verify/` carries a stand-in `#ui-middle` and `#ui-top` beside its
stand-in `elements` layer, for the reason it carries the layer at all: the
environment is part of the component and a study page has to bring it. It
asserts five things — that the strip resolves its ground and Fear's hue while
standing outside every `.dh` root, which is exactly what the compound buys and
what a wrapper would have hidden; that it takes its pointer events back; that a
stepper measures 20×15 and not 28; that the **pip row** is 365px, twelve at 24
on a 7px gap, which makes this the widest fixed object in the system and its
width therefore a decision rather than an outcome; and that the field **ramps**.

Two of those changed shape with the plate's header. The ground is `.hface` and
not the strip's own `background` — the rim needs something over it that stops
1.5px short of the edge — so a check reading `backgroundColor` off `.hud` gets
transparent on a strip that is drawing perfectly. And the width is taken off the
pips rather than off the strip: the old check asserted 521px, which silently
included a mono word and a tally, which is *text in a webfont fetched over the
network*. A client that has not got Google Sans Code yet lays that out in
whatever it does have and the check goes red on a strip that is exactly right.
Twelve boxes and eleven gaps is geometry, and no font can move it.

The ramp check is the one that catches the failure with no symptom at all. Every
layer on `.hface` is a `color-mix()` or an `rgba()` whose amount is
`calc(… * var(--i))`, and `--i` is registered in **gem.css**, not in `pool.css`.
Registration is what makes it a `<number>` rather than a token stream; without
it every one of those functions is invalid and takes the whole `background`
shorthand down with it, leaving a strip that is merely *dark*. So the computed
background is read at `--i:0` and again at `--i:1` and the two must differ —
which is the ramp, the registration and the field's existence in one assertion.
The transition has to come off to take that reading, because `.hud` eases `--i`
over .6s and a value read on the frame it was set is the one the transition is
currently at, not the one that was asked for.

The section is deliberately not `.stage`, because that class carries
`.stage .dh{width:300px}` and would have handed the strip the one measurement
the check exists to take.

## The token chip

Foundry draws a green bar and a blue bar under a token. Daggerheart has
neither number. It has **boxes you cross off**, and a bar at 60% cannot say
whether the next hit costs you one box or four — which is the entire question
anybody asks of a Hit Point track, and the whole reason `apps/damage.ts` is a
dialog rather than a subtraction. So the bars come off and the tracks go on
the creature. `design/token.css` is the component, `design/token.js` the
builder, `design/token.html` the study page, and `src/module/token-hud.ts` the
layer they live in.

**Two drafts were thrown away and both are worth keeping as arguments.** The
first ported the sheet's own row unchanged — twelve Hit Points, six Stress,
three Armor Slots and six Hope, **twenty-seven objects at seven pixels** — and
that is texture rather than a readout. What made it so is the box that is
*empty*: on the sheet an empty box is the **affordance**, the thing you press,
and nothing on a token is pressable. Half the component was drawing the part of
the sheet that existed only to be clicked, and it cost exactly as much ink as a
mark. The second took the empty boxes out and still lost, on two counts — a
centred row filled from the left puts 5-of-12 visibly off-centre, and the strip
sat on the artwork anyway, since the circle is inscribed in the square and the
bottom band *at centre* is the painting. Only the corners are free.

**The ring won because the circumference is about three times the width**, so a
fourteen-unit track finally has room to be fourteen things, and because it is
the shape a token actually is. Everything below follows from that.

### The gauge

Every track shares one origin and one direction: they start at **210°**,
lower-left, and run clockwise over the top to lower-right. The **60° left open
at six o'clock is not waste** — it is the slot where Hope sits on a character
and Difficulty on an adversary. The rings open for the thing the creature
spends.

Radially, outermost first: **Armor, then Hit Points, then Stress**. That order
is the rule rather than a layout — armour is what stands between a hit and your
Hit Points, so it stands outside them.

**Armor is not a ring**, and that is the one place a full circle actively lies.
It is two or three slots on most characters and can be six, and a circle
divided into two is not a track, it is a pie chart. So Armor alone runs at a
**fixed angular pitch** and stops when it runs out — three slots is 51° of arc
and six is 102° — so the arc's own *length* is the capacity, which a full ring
normalises away.

The pitch was 13° and the band was the *narrowest* of the three at 3.0px, and
both had it backwards. Armor is the **outermost** track, so it is the only one
drawn against the map rather than against another arc of ours; it is the only
one that lights what is *left*, so a nearly-spent purse is a nearly-empty ring
with nothing to hold the eye; and its slots are the shortest marks on the chip,
because it alone stops. Three claims all pointing the same way, and the answer
to every one of them is ink — 17° and 4.2px, the widest band rather than the
narrowest.

**And Armor reads the other way round, which no other track does.** Hit Points
and Stress are things that happen *to* you: the mark is the damage, the lit run
grows as the fight goes badly, and an empty ring is a creature that is fine.
Armor is not damage — it is a **purse**, slots you still have to spend, which is
the number anybody actually asks at the table and the number the damage dialog
counts down while you decide. So Armor lights what is **left** and goes dark as
it is spent. Drawn like the damage tracks it would put a bright band meaning
nothing on a fresh character and nothing at all on a spent one, which is exactly
backwards. `litOf` in `token.js` is the whole of the difference.

**Everything is outside the sprite.** The innermost track's inner edge is at
radius 50.2, a tenth of a pixel past the token's own circle: the creature is
drawn and the tracks are drawn, and neither is drawn over the other. The first
pass put all three *on* the painting at 2.4–3.2px wide and about 1.2px apart,
which fails twice over — a 3px arc loses to a pale highlight however saturated
it is, and three arcs that close are not three tracks but one striped band you
can see the hue change in and cannot count. They are 3.2–4.2px now with **1.6px
between them**, over half an arc: the empty ring is what says there are three.

The cost is a footprint and it is real. The outer edge is at 64.6 where the grid
cell's is 50, so a chip reaches about a seventh of a cell into each neighbour
and two adjacent creatures' Armor arcs can cross. That is what buys the artwork
back, and it is the judgement here most likely to want revisiting at a crowded
table.

**But 50 is an assumption, and three arrangements break it** — see below.

**Hope is gems and curves with everything else.** Not a ring and not a variant
of one — Hope is gold diamonds on the rail, in the rest dialog and in the
ledger, so it is `gem.js`'s own `GEM` and a token is not where that gets
re-taught. What changes is placement: each gem is put down **by angle** on the
tracks' own circle and **tilts with it**, filling the 60° opening. A straight
row underneath would be a caption below a gauge, and Hope is not a caption. The
gems rotate rather than counter-rotate, because a diamond is symmetric about
both axes so a tilt costs it no legibility, while a row of upright gems on a
curve reads as a row that has been bent.

**That paragraph was false for as long as the chip existed, and this file said
it anyway.** What shipped was a hand-written diamond: a square turned 45°, the
gold on a `::before` so the state change could be an opacity, and a gain and a
spend of its own in `token.css`. Every part of it was reasonable, and the sum
was a **fourth Hope** — one a player had to learn separately, because it did
not move like the one on their sheet, in the rest dialog or in the log. Nothing
could catch it: at six pixels a gold diamond looks like a gold diamond, and the
study page and this file both asserted the wrong answer in prose. It is
`GEM` now, driven by `setPool`, and `tools/test-token-hope-arc.mjs` asserts
the members — `.lamp`, `.pit`, `.edge`, `.rim`, `.fx` — rather than the look.

Two consequences worth keeping. **The placement is a wrapper**: `.er-gem` owns
the polar transform and `GEM` owns the drawing, which is `.fcls`/`.fclsr` and
`.abl .a`/`.abl .ap` a third time, and it is also the only way to hand a gem
its own angle, since `GEM` writes its own style attribute and takes no
arbitrary one. And **the √2 is gone**: the old square sat on the arc by its
*diagonal*, so its box had to be divided; a `GEM` is a diamond clipped out of
an upright box, so the box is what sits on the arc and there is nothing to
divide. Same ink at the same spacing — 6.5 is 4.6 × √2 — arrived at by
inscribing the shape rather than circumscribing it.

**`gem.css` is proportional in everything but three lengths**, and the chip is
the first caller at a fifth of the size those were written for, so all three
bind at once: a 1px blur on the refraction band, a 1px socket line and a 1.6px
scar stroke are a smudge, a border and a cross that has eaten the shape at
6.5px. They are restated in `token.css` rather than fixed upstream, because
each is correct at the size it was written for and the value that would serve
both is the proportional one — which would move the Fear strip's 24px pips by a
fraction nobody asked for. The socket line is stated against `:not(.on)` rather
than against `.pit`, or it would outweigh `gem.css` taking the shadow *off* a
lit face and put a border back on the gems that are supposed to be glass.

Both gems lie on one circle, which is the bug this component was measured for
once already: placed by angle from the token's centre, a gem that pivots about
its own middle instead comes out as an arc that **drifts** — radii of 52.0
through 54.6 where six identical numbers are the whole claim. Gems that plainly
ignore the ring read as a decision; gems that *very nearly* follow it read as
sloppiness with nothing on screen to say which. `tools/verify/` measures the
spread rather than trusting the rule.

### Arriving and leaving

A chip had neither, and that is the third thing on this component that was
invisible because it was an absence. It was `appendChild` and `remove`, so a
creature dragged onto the board, a token coming out of fog, a scene loading and
a corpse being deleted all happened between one frame and the next — on the one
surface in this system drawn over somebody else's artwork and therefore with
nothing to establish it. A readout that pops reads as a rendering fault: the
token was there, and now there is also a gauge, and nothing said the gauge is
*of* the token.

So it **assembles**. The chip rises out of the creature — .9 to 1, small on
purpose, because the thing it is growing out of is directly underneath it and a
large scale would read as the token itself moving — and the three rails follow
**inside out**, Stress then Hit Points then Armor. That is the ladder run
backwards, and it is the ladder's own argument: things leave in the order they
were argued for, so a chip assembling arrives in the reverse of the order it
will cull in. Leaving is one move, no stagger, at half the length — an arrival
is *read*, and nobody studies a gauge that is going. Same asymmetry `gem.css`
draws between a gain and a spend.

**The root takes opacity and a scale; the rails take a scale only**, and that
is the ladder again rather than economy: `data-lod` drives every rail's
opacity, so an arrival that also wrote opacity would spend 340ms overruling it,
and a chip arriving at a pulled-back camera would show an Armor rail the zoom
had already culled. A transform cannot collide with it. Filling the root
*forwards* is the matching trap in the other direction — it would pin opacity
at 1 and beat `.tok.hidden`, which is a GM-invisible token quietly becoming
visible on the frame its chip finished arriving.

**Three things remove a chip and only two of them are departures.** A token
going out of view or off the board is a creature leaving, and that plays. A
chip whose *shape* changed — a levelled character, a scar, an adversary
becoming visible — is torn down and rebuilt in the same call, which is one
object being redrawn rather than two objects swapping, and animating it would
be the readout blinking every time a maximum moved. So `fresh` is threaded
through rather than inferred, because "there was no chip a moment ago" is true
of both and only one of them means it. A departure interrupted is a departure
that did not happen: the element is handed back rather than left to fade under
its own replacement, which is `capture()`'s rule about a travel still in flight.

**`after()` is settle.js's arithmetic without settle.js's event path**, and both
departures are forced by what a chip is. It *skips* a non-finite animation
rather than substituting a floor for one, because a chip is very often selected
or conditioned and `tkCrown` and the Vulnerable marquee never end — the 1.2s
floor would become the answer every time, and a departure would sit invisible
for a second and a fifth instead of its own 170ms. And there is no
`animationend` race, because that argument is about being *prompt* — a spent
gem may not keep `on` a moment longer than it must — and nothing waits on this;
worse, `animationend` bubbles, so the root's own 300ms arrival would fire first
and cancel the Armor rail 160ms into a 460ms stagger, which is a visible snap.

**Difficulty is the other occupant of that opening and never both.** A character
spends Hope; an adversary makes you beat a number. It is the one numeral on the
whole component and it earns it by having no units — Difficulty does not move
during a scene and there is nothing to cross off.

### Material

Three layers per track, and each is a **different claim** rather than a
different opacity of one. `.ch` is the channel — every slot the track *has*,
recessed — which is what says "fourteen" while six are marked and what lets an
unmarked slot be genuinely absent from `.lit` rather than a washed-out copy of a
marked one. `.lit` is what is marked (or, on Armor, what is left). `.fx` is the
landing.

Substance is what the ring costs and this is how much comes back. Hue and radius
do most of the telling apart, and then **Stress is scored** — fine hairlines
across the annulus, the scratch's own character — while **Armor is plate**, the
only one with a specular run down its outer edge. It is not the tear, the
scratch and the chisel that `mark.js` argues for, and it is more than three
colours.

**There was a fourth layer and it is gone**, and the two are worth telling
apart because they are the same technique. The bevel rode the **channel** — a
pale ramp at each track's outer edge, drawn whether anything was marked or not.
On the two inner tracks it was invisible under the lit run. On Armor, which is
the outermost band and therefore the one place the chip meets the map, it drew
a continuous pale ring all the way round the outside of the chip: **light with
no object under it**, and the first thing anybody noticed about the component.
The specular survives because it rides the **lit** run, so it appears only
where a slot is — and a highlight along the top of a filled slot is what plate
does.

**It has to survive the artwork**, which is the one thing no other surface in
this system does. Every other component draws on paper it owns; this draws on
somebody's painting. So each layer carries its own dark contour, and it is a
`drop-shadow` rather than a `box-shadow` for a reason that is not taste: **a
mask clips a box shadow along with the box**, and every layer here is masked to
its annulus, while a drop-shadow is taken from the *result* and traces the
silhouette of the slots themselves. Two of them on the marked run and they are
opposite claims — a tight near-black seat, so the arc reads as sitting in a
groove cut through the sprite, and a wide coloured one that keeps the hue
legible at the distance where the arc is two pixels.

**The landing is a flash, not a travel**, for `mark.css`'s reason: a cut is not
a gesture you watch happen, it is a thing that has happened. `.fx` is handed a
wedge covering exactly the slots that moved and restarted with **one** forced
flush for the whole change, which is `setMarks`' own two-pass shape and for its
reason — a Severe hit moves four slots and four restarts is four layouts.

### The ring, and the room it takes

Every radius above is written against one assumption: that the creature ends at
the grid cell's own circle, radius 50. That is true of a plain token and
**false of three arrangements a table can be in** — a dynamic token ring in
either of its fit modes, and a token whose artwork is scaled. In all three the
chip is drawn *on the painting*, which is the one thing this component
promised.

**The numbers are not measured and not guessed.** Foundry publishes the ring
texture's own proportions in the spritesheet beside the artwork —
`rings-steel.json` carries `defaultColorBand: {startRadius: .666, endRadius:
.7225}`, the edge of the subject's hole and the edge of the visible band. (The
`.666` is the same number `TokenRing` holds as its default subject thickness,
which is the check that these are one reading rather than two.)

**The two fit modes are two normalisations of that one texture**, which is why
one constant answers both and they are reciprocals:

| | the hole | the rim |
| --- | --- | --- |
| **subject fit** — Foundry's default | at the cell | **1.0848** cells out |
| **grid fit** | **0.9218** of the cell | at the cell |

Subject fit is the collision, and it is exact: 1.0848 of 50 is **54.2**, and
the chip's innermost track began at **50.2**. The two were drawn on top of each
other, to within a third of a pixel, on every ringed token at every table
running Foundry's default. Grid fit needs no push at all — nothing of
Foundry's reaches past the cell — and is instead the one arrangement where the
*creature* is smaller than its cell.

**So there are two scales rather than one, because there are two claims.**
`--tkr` is **outward clearance** — a reading that sits *outside* the creature
has to clear whatever the creature now occupies, and it is floored at 1, since
a small sprite must not get a small readout. `--tkv` is **the subject** — where
the artwork itself ends, which grid fit puts at .9218 of the cell and a
.6-scale sprite at .6 — and it is *not* floored, because a thing drawn **on**
the creature has to be on it. Grid fit is exactly what separates them, and a
build that collapsed the two into one number would pass every other check.

**Which of the two the rails want changed, and nobody moved them.** They used
to hang outside the creature, so clearing it was the whole question; the
Obsidian-orbit redesign put them *inside*, under `.er-shell`'s clip, and a
track resting on the artwork follows the artwork. So `--tkr` went on being
written on every chip and read by **one** element, `--tkv` went on being
written and read by **none**, and all three rails, the Hope arc, the clip and
the identity hairline sat at fixed percentages of the grid **cell** — which is
the assumption the section above opens by disavowing. It fails in the direction
that lasts: at grid fit the rails are 8% outside a creature that stopped at
92%, and on a .6-scale sprite they are a gauge floating around a creature that
is nowhere near them, drawn perfectly, every time.

Everything under `.er-shell` reads `--tkv` now. `--tk0` is gone: it described
where the innermost track sat when the tracks were outside, and it had been
declared and read by nothing since they moved.

**The condition sentence was the last thing reading the clearance, and it was
the same finding wearing the other hat.** A caption set against the rim belongs
to the rim, and at Foundry's default fit it stood 1.0848 cells out while the
rails it captions had come in onto the artwork — further out again on a subject
scale under 1, where the clearance *divides*, so the moat widened as the
creature shrank. What a table reports is the words orbiting nothing, and every
glyph is drawn perfectly. It follows `--tkv` now, so the sentence, the rails and
the PIXI material are three readings of one creature rather than two, and its
baseline is the rim itself — **49.2**, `.er-shell`'s own clip radius, down from
50.2 and 51.8 before it, because text on a circular path grows *outward* from
its baseline and the only unit left to give is the one between the lettering and
the Armor rail. Any further in sets the sentence across the track it captions.

**What that gives up is stated rather than discovered.** On a ringed token at
subject fit, Foundry's band runs from the cell out to 1.0848 of it and the
sentence is now inside that — lettering over the ring rather than beyond it.
It is the trade the rails already made at Obsidian orbit, it is why the
sentence carries a stroke and two shadows, and a table that wants the whole
readout clear of the band has `tokenChipScale`, which moves the sentence, the
rails and the material together.

That leaves `--tkr` with no consumer at all, and it goes the way `--tk0` went
rather than being left declared for the next reader to trace. `chipScale` still
computes the clearance, because the two fit modes' reciprocal arithmetic is
stated and checked there and `game.daggerheart.tokenChips()` prints it — a
number that is reported is not a number that is read.
`tools/test-token-hope-arc.mjs` is the ratchet on both halves: the sentence
must scale on the subject, the baseline must sit between the Armor rail and the
rim, and no rule in the ported stylesheet may read `--tkr` again.

**Radii scale as radii and not as insets**, which is the one piece of
arithmetic here worth reading twice. An inset is measured from the edge and a
radius from the centre, so halving a 2% inset does not halve anything — it
moves the rail 1% further *out*. What has to shrink is `50% − inset`, so every
one is written `calc(50% - (50% - <inset>) * var(--tkv))`.

**And the condition material is the same finding on the other side of the
fence.** It is a PIXI filter on the token **mesh**, and the mesh is not the
creature: a dynamic ring's texture is half again the cell in subject fit, so
every pattern, the rim roll-off and the break's shard cuts were drawn to a quad
the creature only sometimes fills. The shader takes a `uSubject` uniform — where
the creature ends as a fraction of the filter frame — and dividing `p` by it
once at the top of `main()` is the whole of respecting token scale, because
every pattern in that file is written in `p`. **`uv` is deliberately not
divided**: `uv` is where the artwork is sampled from, so scaling it would drag
the creature's own picture around underneath the material. The material moves
onto the creature; the creature stays where it is. The detail budget takes the
same correction, since "how many pixels has the thing being dressed got" is a
question about the creature rather than about the quad.

`subjectInFrame` in `token-hud.ts` is where the two coordinate systems meet,
and each half comes from whoever owns it: **how many cells the frame spans is
measured** off the mesh, because that is Foundry's to say, and **where the
creature ends inside those cells is `chipScale`'s**, already argued. Getting
that split wrong is what the three drifting chip builds were — a second opinion
about a number somebody else had already published. It is clamped at 1, since
above that the material would be asked to cover more than the frame holds.

**The dial comes with it**, and that reads at first like it should not.
`tokenChipScale` was written when the readout hung outside the creature, so it
was a clearance correction; with the readout on the creature it says one thing
only — *this is where the creature actually ends*. A table that has had to
correct that has corrected it for the rails and the material alike, and a dial
that moved one and not the other would put two objects on one creature in two
places.

**Radii only.** A band's width, a gem and a numeral keep their size at every
setting. That is the range ruler's own rule arriving here — the rings are
geometry and scale with what they measure, the lettering is read and does not —
and it is what stops the dial making one creature's Stress track fatter than
its neighbour's. The obvious build is a `transform:scale` on the whole readout
and it is the one `tools/verify/` fails.

**The readout is floored at the grid cell** however small the art is. Following
a 0.6-scale sprite inward would draw its Stress track at 0.6 the size of the
creature beside it, and being countable across a whole fight at a glance is the
entire job. The creature gets a gap, which reads as deliberate; the reading
stays comparable. Vulnerable has no floor, for the reason it has its own scale.

**`chipScale` is the arithmetic and lives beside the radii** in
`design/token.js`; `token-hud.ts` is the half a study page cannot have, which
is asking Foundry what the token is actually wearing. Four questions, and the
split between them is who owns the answer: the ring and both scales are **per
token**, the fit mode is a **world setting of Foundry's**, and
`tokenChipScale` is ours. It reads the **document** rather than `token.ring`,
which is `ledger.ts`'s rule and load-bearing for a second reason — the live
`TokenRing` only exists once the token has been drawn with one, so a chip built
on `drawToken` would read a null on exactly the frame it decides its radii.

**The dial is world-scoped where the two switches are not**, and that is a
claim about what it governs rather than an inconsistency. `tokenChip` and
`rangeRuler` say what *this screen* draws. This says how large a chip is over a
creature, and the creatures are the GM's — they make the tokens, choose the
artwork, set the ring and pick the fit mode. A per-client dial would mean four
people looking at one ogre and seeing its Stress in four places, with the one
who built the token unable to fix it for anybody else.

It is a **multiplier** and never a replacement. The fit modes and both token
scales are answered automatically; this is the correction for what the
derivation cannot see — a module's own ring, a sprite cropped tight inside its
square, a table that wants more air. Setting it absolutely would throw the
automatic handling away to fix one token.

**And it is the honest escape hatch for the one input that is read rather than
measured.** Subject scale reaches Foundry's shader as a **UV correction**, not
as a radius, and a UV expanded about its centre draws its texture *smaller* —
so a larger subject means a relatively smaller ring, which is the direction
taken here and the direction the two fit modes then read from opposite ends.
It is derived from the source rather than confirmed against a running game.
If it is backwards at a real table the dial is the answer, and
`game.daggerheart.tokenChips()` reports the whole computation so the question
can be asked rather than guessed at.

### Vulnerable

**The most important thing on the chip**, because it is the condition the table
meets most often and it arrives two ways: a full Stress track, and a hand.

It is **not a fourth ring**. Three concentric arcs already say "track", and a
condition drawn as a fourth would be a track you cannot count — so it goes
**inward**, where nothing else lives, and it is the one thing that stays inside
the sprite. That is a claim rather than a leftover: the tracks are a reading
*off* the creature and this is a claim *about* it, so the thing that is
Vulnerable is the thing in the middle.

It is `mark.js`'s own run of terms bent round a circle. The sheet answers this
condition with a scrolling strip because it is read at a glance, out of the
corner of an eye, while the GM is describing something; a token has no room for
the rules and every room for the word. `textLength` with `lengthAdjust="spacing"`
is what makes it seamless — a repeated string almost never comes out to the
exact circumference, and the leftover otherwise shows as a gap travelling round
with the text.

**Three loops and none of them is a colour change.** `pool.css` took the one
exception to `gem.css`'s ban on idle motion, for the Fear strip, because dread
sitting in the room between the moments anybody touches it is the whole claim.
This is the second and the reasoning is identical: a condition giving every roll
against this creature advantage is live for as long as it is on, and a ring that
is perfectly still is a border. The vignette breathes at 4.6s, the words turn
clockwise at 46s, and a `plus-lighter` sweep runs **anticlockwise** at 7.5s.
Deliberately incommensurate and deliberately in two directions: a sweep going
the same way as the text is a highlight stuck to a word, and the point is that
it passes over them. All three are cheap by construction — both turns are a
`transform` on a static gradient rather than an animated gradient angle, so they
composite and never repaint — which matters here where the Fear strip's does
not, because this can be on eight creatures at once.

**And `syncVulnerable` was silently erasing the hand-applied half.** The method
compared "should be Vulnerable" against "is Vulnerable" and toggled, so every
write to the actor re-asserted the derived answer over an ad-hoc one: a GM marks
a creature Vulnerable, the player marks a Hope, and the effect disappears. It
reads as the condition not sticking, which is the worst shape of bug — the cause
is a hook nobody has reason to suspect and the symptom shows on somebody else's
screen. The effect the track creates is **flagged as its own** now, and only a
flagged one is ever removed. That is `creation.granted`'s provenance argument
arriving at a condition, and it fails in the right direction: an effect nobody
claimed is left alone, which is always recoverable.

### The ladder

Every measurement in the component is a **scene** pixel — a 1×1 token is a
hundred of them, at every zoom — so legibility is a separate question and the
ladder is the answer. Tracks leave from the outside in, which is the order they
were argued in:

    data-t=near   110px or more of footprint on screen — everything
    data-t=mid    55 to 110px — the three tracks, no Hope and no Difficulty
    data-t=far    28 to 55px — Hit Points and Stress
    data-t=min    below that — nothing but Vulnerable

Nothing shrinks its way out. An arc below the width where its slots separate is
a coloured smudge claiming to be a count, so it is **removed**. Vulnerable
outlives all of it and burns brighter with the tracks gone, because "which of
these is Vulnerable" is a question asked while looking at the whole fight —
which is exactly the zoom where everything else has been culled.

The threshold is asked in **footprint** rather than in camera scale, because a
2×2 creature is legible at half the zoom a 1×1 one needs and one table then
answers for both.

**`data-t` is written by JS and that is not a shortcut.** CSS cannot ask a range
question about a transformed size: a container query measures *layout*, and the
layout never changes here — the ancestor's transform does. It is still nearly
free, because `setTier` returns false unless the chip actually crossed a
threshold, so a slow zoom across twelve creatures writes an attribute a handful
of times rather than twelve times a frame.

### The layer

**An HTML layer, not a PIXI one**, and the board is a PIXI stage so that wants
justifying. Every part of this component is something PIXI would have to be
taught: a conic gradient in fourteen segments, a radial mask,
`mix-blend-mode:plus-lighter`, text bent round a path, three composited loops.
Drawing those into a canvas means re-deriving all of it in a second language and
then keeping two copies true — which is exactly the trade `port-design-js.mjs`
exists to refuse.

So it is one layer of HTML over the board with the chips inside it placed in
scene coordinates, which is why every number in `token.css` is a scene pixel.

**The layer is a child of `#hud`, and that is the whole of the alignment.**
Three builds hung it *beside* `#hud` and re-derived where it goes from
**`canvas.stage.worldTransform`** — a `matrix()`, then a measured offset between
the wall and the canvas element, then a ticker to keep the matrix fresh. Each
fixed something real and each still drifted, because all three were a second
opinion about a number Foundry had already published.

Foundry aligns `#hud` in `Canvas#pan` and does not use `worldTransform` to do
it: `left`/`top` are `canvas.primary.getGlobalPosition()`, the size is
`canvas.dimensions`, and the zoom is a plain `transform:scale()` against
`transform-origin:top left`. Its **own Token HUD** is then a child of that
element positioned at the token's `bounds.x`/`bounds.y` — raw scene
coordinates, with no transform whatsoever of its own. A chip is now exactly
that, so there is no matrix here, no offset and no ticker: nothing left for
this file to get wrong.

The price is the activity log's, arriving where it cannot be answered the same
way. `#hud` is an ApplicationV2 whose `_replaceHTML` assigns `innerHTML`, so
every render of it sweeps the layer away. There the fix was to become a
*sibling* of the part that gets rebuilt; here the element that gets rebuilt
**is the coordinate system**, so standing outside it is the bug rather than the
fix. It re-hangs on the render hook instead, and only when it has actually been
evicted — re-appending unconditionally would throw away every chip's arrival
mid-play.

**Nothing of ours writes on a pan or a zoom.** Foundry moves `#hud` and the
chips ride it. A token moving moves its own chip off `refreshToken` — the same
`refreshPosition` render flag that moves Foundry's own nameplate and border, so
it is raised on every frame of an animated move by construction rather than by
our hoping so — and `place` writes four styles only when one of its four
numbers changed. The one thing the camera still costs is `data-t`, which is a
question about how large the chip has become *on screen* and can only be asked
from `canvasPan`.

**`canvasPan`'s reputation here was undeserved**, and that is worth recording
because it cost a whole build. It was blamed for the drift and replaced with a
ticker on the reasoning that it fires when Foundry *decides* to pan rather than
per frame. `Canvas#pan` settles it: the hook is raised two lines above the
`align()` that moves Foundry's own HUD, from the same function, once per pan
step and animated pans included. It was never the lagging part.

**And a constant offset does look like drift**, which is the reasoning error
under all three builds. The intuition says a fixed screen-pixel error is a
fixed misalignment and therefore not drift — but the *token* changes size with
the zoom while the error does not, so six pixels is a sixth of a creature at
0.35x and invisible at 2.4x. "It moves about when I zoom" is exactly what that
looks like, and it sent every diagnosis after a per-frame cause.

**The chip is rendered once**, which is the contract `setMarks`, `setPool` and
`setChits` already keep. `setChip` diffs, and the markup is rebuilt only when
its *shape* changes — a track's maximum, Hope's ceiling under a scar, an
adversary becoming visible. Getting that boundary wrong is visible in both
directions: rebuild too eagerly and every arrival is cut off mid-play, too
rarely and a levelled-up character keeps last level's Hit Point count.

**The host is asked for, not searched for**, and that is `chatPanels()`'s rule
*declined* rather than applied a second time. That rule is about finding a place
to stand, and a fallback is a reasonable answer when the element is a backdrop.
This element is not a backdrop, it is the coordinate system — so a fallback is a
second coordinate system somebody has to align by hand, which is precisely what
the three drifting builds were. It asks `canvas.hud` first, because that is the
API and it will still answer if Foundry moves the element or renames the id, and
if there is no host at all it says so once and names the file.

**Nothing here is pressable, no exceptions.** `pool.css` argues the first half —
a readout that is also a control is a misclick, and here a misclick costs
somebody a Hit Point. The second half is worse: the canvas owns click, drag and
box-select over exactly these pixels, and a chip that swallows a `dragstart` is
a token you cannot move. That is the inverse of the pressure the Fear strip and
the activity log's door are under, both of which have to *take* pointer events
back from a band Foundry switched them off in — so `tools/verify/` puts the chip
in a band that has them on and asserts it stays inert anyway.

### What it may say, and to whom

A GM sees everything. Everybody else sees their own characters and companions in
full, and sees an adversary according to one **world** setting: `none` (the
default), `marks`, or `full`. World-scoped for the change log's reason — it is a
ruling about the table rather than a preference about a screen, and a GM who has
decided the party may not read an ogre's Stress cannot have one player opt back
in.

Three values rather than two, because the interesting one is in the middle.
`marks` draws the arcs and withholds the **Difficulty**, which is precisely what
the players are supposed to be discovering by rolling against it — so the table
can see the ogre is nearly out of Stress without being handed the number.

**Vulnerable is exempt at every setting**, and that is not an oversight. A
creature that is easier to hit is a fact somebody at the table produced by
hitting it, and hiding the consequence of your own hit is the system taking back
what the fiction just gave you. A hidden adversary that is Vulnerable still gets
a chip, holding nothing but the word.

**A token nobody may see gets no chip at all** rather than a hidden one: the fog
is a fact about what this client knows, and an element carrying a creature's
Stress is the wrong thing to leave in the DOM of somebody who has not found it
yet. `.hidden` on the chip is the *other* case — a token the GM has toggled
invisible, which the GM can still see. **Defeated keeps its marks and dims**,
for the ledger's reason: a corpse's slots are what the table just spent the
fight producing, and clearing them at the last one is the record vanishing at
the moment it meant the most.

### Foundry's bars

Off in two halves, because there are two populations. **New actors** get
`displayBars: NONE` on their prototype token via `_preCreate` — a *default*
rather than a rule, so a table that wants a bar can turn it back on and both
attribute paths stay declared. **Every actor that already exists** is answered at
draw time by a `Token` subclass whose `drawBars` returns early for our four
types, because rewriting somebody's prototype tokens on upgrade is a migration
nobody asked for. The override is a guess about somebody else's private API and
fails in the right direction: if a later Foundry renames the method, our
override stops being called and the bars come back, which is visible.

### What its study page could not see

`tools/verify/`'s **THE TOKEN** stage, and it earned itself on the first run.

The naming discipline is the reason. Members are `tk`-prefixed because `.row`,
`.hd`, `.n` and `.trk` already belong to somebody, and the chip is drawn outside
every `.dh` root so `port-design-css.mjs` rewrites it to a **compound** —
the sixth after the drag proxy, the context menu, the roll popover, the rules
panel's peek host and the Fear strip. **The word ring was `.wr` for exactly one
run of that page**, and `roll.css` has owned `.wr` since the roll panel was
drawn: both load into the same `.dh` root where scoping does nothing, so the
token's SVG would have arrived wearing a flex row's padding and background.
Sixth instance of the bug that renamed `.die.win` and `.dfn .pl`, and the first
one this system caught **before** shipping it — `design/token.html` loads three
stylesheets and the game loads twenty-three, so no study page could ever have
shown it.

One more consequence of the naive rewrite: it runs over comments too, so
`design/token.css` **may not spell its own selectors in prose**. Written out,
they come back through the port carrying two copies of the prefix and describing
something that does not exist.

The stage asserts thirteen things: that the compound resolves the palette while
standing outside every `.dh` root; that nothing in the chip takes pointer events
on a band that has them; that every track clears radius 50; that the gaps
between tracks survive; **five about the ring** — that the two fit modes are
one texture read two ways, that the readout is floored and Vulnerable is not,
that a pushed chip genuinely clears the rim it was pushed for, that the dial
moves radii and never band widths, and that the two scales are two claims; that
the six Hope gems lie on **one** circle, which is
the `transform-origin` bug measured rather than trusted; that the bottom rung
culls to Vulnerable alone; that no other sheet in the ported stack reaches into
a chip; and **that a chip stays concentric with its token at every zoom**.

**Two exclusions in the reach check, and the second is new.** The chip's root
deliberately wears `.dh`, so a check calling `tokens.css .dh` a trespass would
be calling the compound itself the bug; and `gem.js`'s gem is hosted here on
purpose, so every rule `gem.css` writes for it is somebody else's by design.
That second one used to name only `.gems` — the row `GEMS()` builds — and the
chip solves its own angles, so it calls `GEM` directly and there is no row.
Naming only the container would have made every rule in `gem.css` a trespass
on the frame this component started hosting the real component, which is a
check going red on the fix.

**And two of that stage's checks still name selectors the Obsidian-orbit
redesign retired** — `.tkarcs` and `.tkvuln`, from when Vulnerable was an HTML
ring rather than a material on the mesh. They are stale rather than wrong about
anything, and re-deriving what the ladder now culls to is its own piece of work
with its own judgement; naming it here beats leaving a reader to find a check
that reports on nothing.

That last one is the alignment, and it is the check three broken builds needed
and did not have. It stands up Foundry's own two functions rather than
describing them — a host sized and scaled the way `align()` sizes and scales
`#hud`, a chip inside it at raw scene coordinates the way `PlaceableHUD` places
itself — and measures the distance between the two centres at 0.35x, 1x and
2.4x. Three zooms rather than one, because the failure is a constant screen-pixel
offset and a single zoom cannot tell that from being correct. Injecting six
pixels of error makes it report `6.00` at all three, which is the negative
control the check was confirmed against.

Two exclusions in the reach check and both are hosted components rather than
leniency: `.gems` and everything under it is `gem.js`'s row, drawn here on
purpose, and the chip's **root** deliberately wears `.dh` because that is where
the palette comes from. A check calling `tokens.css .dh` a trespass would be
calling the compound itself the bug.

**One thing is not yet measured and should be before this is trusted at scale.**
Nine masked elements and three `drop-shadow` filters per chip, times however
many creatures are on the board. It is the shape of cost the browse window's
"what it costs to open" turned out to be about — invisible afterwards, because
every chip is correct, and paid entirely in frames that were dropped.

## The range ruler

Daggerheart's ranges are fiction-first and the book says so out loud: Melee,
Very Close, Close, Far and Very Far are agreements at the table, and the feet
printed beside them in `config.ts`'s `RANGE_FEET` are the book's own
approximations rather than a conversion. That is the *reason* to draw them
rather than a reason not to — **an approximation nobody can see is not one
agreement, it is four people holding four of them**, and the disagreement
surfaces after somebody has already committed to a move.

Select a token and four rings come out of it. `design/ruler.css` is the look,
`design/ruler.js` the builder, `design/ruler.html` the study page, and
`src/module/range-ruler.ts` the half a study page cannot have.

**It is not a fourth arc on the chip.** The chip is a readout *of* a creature;
this is a measurement *from* one, and the two differ in every dimension that
matters — lifetime (a chip lives as long as the token, a ruler as long as the
selection), size (0.63 of a grid cell against twelve of them) and subject. So
it is its own layer, and it sits **under** the chips: two different kinds of
claim about one creature, and the readout wins.

**It rides the chip's arrangement rather than repeating it.** `token-hud.ts`
cost three broken builds to learn where a layer over the board goes, and every
one of those lessons applies here unchanged — child of `#hud`, positioned in
raw scene coordinates, aligned by Foundry's own `Canvas#pan`, re-hung when
`#hud`'s `_replaceHTML` sweeps it away. That file's long note is the argument;
this one is a second caller of it.

**The ruler has no hue, and that is a rule rather than a gap.** Every colour on
a token in this system already means a resource: wound is Hit Points, strain is
Stress, plate is Armor, gold is Hope, violet is Fear. A ruler measures the
*ground*, so it is drawn in the map's own ink and buys its legibility with
contrast and contour — the chip's own dark drop-shadow contour, for the chip's
own reason. A saturated ruler would be a sixth meaning for a hue that has one,
on the single surface where all five are already in play. Its ink is a literal
rather than a palette token for the same reason: scene artwork has no theme and
does not become parchment because a *sheet* went light.

**Certainty is the line style.** Melee and Very Close are solid, because within
arm's reach is a thing you can be sure of; Close and Far break into dashes,
because those are the two the book leaves most to the table. The dash is an
**arc length** and not an angle — a fixed angular period would make Far's
dashes eight times longer than Melee's and the four rings would stop reading as
one instrument.

**A band is four layers and each is a claim**, which is `token.css`'s rule
about the chip's arcs arriving somewhere with more room for it. A bevel — light
bleeding inward off the line, shadow falling outward, one claim about one edge
and therefore one gradient — makes the ring sit *in* the ground rather than on
it. The line carries the certainty. A finer companion rule just outside it is
how this design draws a border everywhere else, and it is what stops a single
stroke reading as a fence. Then the lettering. **None of it is a fill**: a wash
over the disc would tint the map, which is the thing the reader came for.

**The light on the line is a second mask, not an overlay**, and that is not a
preference. A conic alpha intersected with the annulus dims the ring toward the
lower right so it reads as a solid thing lit from above. An overlay in
`plus-lighter` doing the same job would brighten the *gaps* in a dashed ring as
readily as the dashes, and there would be no dash left. Composited, the light
can only ever take away — the same guarantee `plate.css`'s facet ring gives its
numerals.

### The name follows the ring

Which is what makes a band identifiable from wherever the reader is looking at
the board, rather than one they have to trace back to a tag somewhere on it. It
is the chip's own gesture: `token.js` bends VULNERABLE round a circle for the
same reason, that a token has no room for a caption and every room for a word.

**Two half-arcs rather than one circle, and that is the whole of the
readability.** A single circular path puts the bottom third of every ring
upside down. An upper arc running left-to-right over the top and a lower arc
running left-to-right *under* the bottom are both upright — the map-maker's
answer to labelling a contour, and it costs one extra `<path>`. `paint-order`
is the other half: stroking a dark halo first and filling over it knocks a
channel out of the line behind every glyph, so the words read as cut *into* the
ring. That is also why this needs no plinth — a box would be an object on the
map.

**Placed, not poured**, and this is where the chip's technique had to be
abandoned rather than copied. The chip fills its circle exactly, with
`textLength` forcing the repeat to the path's own length so no gap travels
round with the words. Ask that of Far and it is about ninety repeats and a
thousand glyphs; cap the repeat *while still forcing the length* and eleven
letters spread over half a circle. Those are the same mechanism failing from
either end. So the legends are placed — N per half arc, evenly spaced, each at
its natural width, with N taken from the arc's length **on screen**. A ring
gains more legends as the camera comes in rather than larger ones, and the
lettering is rewritten only when N actually changes, which is `setTier`'s
discipline rather than a similar one. The offsets are (m + ½)/N, a fence-post
rule doing real work: it keeps every run clear of the two seams at three and
nine o'clock, where the arcs meet and a run anchored to the end of one would
hang off it.

**The rings scale with the map and the type does not.** A ring is a distance on
the ground, so it is a scene pixel and rides the camera exactly as the grid
does; the lettering is chrome *about* a ring, so it counter-scales through
`--k` and holds one size on screen at every zoom. A legend that shrinks with
the map is a legend twice.

**Two ladders, and they are different questions.** A ring below its floor is
not a small ring, it is a dot inside the creature — its stroke wider than the
gap to its neighbour — so it leaves, exactly as a track leaves the chip's. The
lettering's is separate: two bands a hundred scene pixels apart stay a hundred
apart on the ground forever, but on screen that gap shrinks with the camera
while the type does not, so below some zoom Melee's words print through Very
Close's however far apart the circles are. That is a middling-zoom failure,
which is the worst kind — correct at the zoom anybody builds it at and wrong at
the one they play at. Walked from the **outside in**, because the outermost
band is the one still worth reading when the type is crowding, and keeping the
innermost instead would answer a pulled-back camera with the word MELEE.

**No idle motion.** `gem.css`'s ban has taken two exceptions — the Fear strip
and Vulnerable — and both earned it the same way: each is a live threat sitting
in the room between the moments anybody touches it. A ruler is not that. It is
a measurement you take, read and stop looking at, and a ring turning slowly
under a token somebody is trying to *move* is motion competing with the gesture
it exists to serve. The rings arrive staggered outward at 62ms, one wave leaves
the creature and is gone, a 240ms collapse says the measurement is over, and
after that nothing on this layer moves until the selection does.

### The arithmetic, which is the only thing here that can be silently wrong

**Squares, not feet.** The obvious build divides `RANGE_FEET` by the scene's
own `grid.distance`, which is right on every imperial table and quietly wrong
on every other one — it reads a number labelled *metres* as though it were
feet, and Melee lands at three and a third squares on a 1.5m grid. The squares
are the invariant, so `rangeSquares` in `config.ts` is `RANGE_FEET / 5` — the
book's own five feet to the square — the ring comes off the **grid**, and only
the printed distance comes off `grid.distance` and its units. That paragraph in
`config.ts` saying nothing here does arithmetic with the feet now has exactly
one exception, and it does the arithmetic somewhere else.

**Measured from the token's edge**, because reach is what the rule means: a
three-by-three dragon threatens a square beyond its own body, and measuring
from its centre would put half of Melee inside the dragon. It costs nothing on
a one-by-one and is the difference between right and roughly right on
everything larger — which is why a resize rebuilds rather than repositions.

**Very Far is declined out loud.** Twenty-four squares is a ring 4,900 scene
pixels across before the token is added, on a scene that is typically four
thousand by three thousand. It stops being a measurement and becomes a claim
that the answer is *everywhere*, and it drags the ladder out with it: at the
zoom where it fits, Melee is nine pixels and has already been culled. `BANDS`
is four, and the fifth is left out in `range-ruler.ts` rather than filtered out
of `RANGES`, because the closed set is the rules' and this is a drawing
decision.

### One selection, one screen

**One ruler at a time**, and only when exactly one token is controlled. With
several selected you are moving them, not measuring, and four bands each on
three creatures is several thousand pixels of overlapping circles with nothing
to read in them.

**`controlToken` is raised per token**, so a box-select over three creatures
raises it three times and the set is a different size at each — one of which is
a set of one. Answering each in turn builds a ruler on the first and takes it
down on the second, which is a 240ms collapse playing over a gesture that never
wanted one. So the answer is coalesced to the end of the batch, on a macrotask
rather than a `requestAnimationFrame` — that is `swap.js`'s rule inverted: rAF
is the right tool for *before the next paint* and the wrong one for *after the
current batch*, and it does not fire at all in a tab that is not painting.

**Nobody sees yours.** A selection only ever exists on one client, so there is
no permission question here and therefore no world setting — which is also why
this needed no `adversaryChip` of its own. The switch is the second on the Fear
strip's left plinth, beside `tracks`, client-scoped for the chip switch's
reason, and it is a *reading* of the setting rather than a copy: the press
writes `rangeRuler`, the setting's own `onChange` raises the hook, and that
hook is the only thing that ever moves either the button or the rings.

### What its study page could not see

`tools/verify/`'s **THE RULER** stage, eight checks, and the interesting half
are about arithmetic rather than about paint — which is the difference between
this component and the chip. **A chip is drawn wrong or right; a ruler can be
drawn perfectly and be lying**, and nothing on screen says which. So one check
measures every ring's radius against the range it claims, and it caught its own
author first: written with `getBoundingClientRect` it reported every radius at
exactly 0.55 of itself, because a rect reports the box an animation is
*drawing* rather than the one the layout holds and 0.55 is the arrival's
opening scale. `capture()`'s lesson from `token-hud.ts`, arriving in a check
rather than in a FLIP, and failing in the worst direction — a plausible wrong
number on the one component whose whole job is to be a number you can trust.

The rest: that the compound resolves the palette outside every `.dh` root; that
nothing takes pointer events on a band that has them, which matters *more* here
than on a chip because this covers twelve squares of a canvas that owns click,
drag and box-select; that the lettering counter-scales; that the two arcs are
genuinely opposite-handed, sampled off the path geometry rather than read off a
sweep flag; that the ladder culls inward and never the outermost legend; that
the ruler's layer sits under the chip's; and that no other sheet reaches in.

**Three names were wanted and all three were taken** — `.rr` is a die run in
`plate.css`, `.rl` is the rules panel's line in `dlg.css` and `.ln` is that
line's own body. `dlg.css` draws inside a `.dh` root, so `.dh .rl` would have
matched a legend of ours the moment the two were on screen together. Seventh
instance of the bug that renamed `.die.win`, and the second one caught before
shipping — by grepping the ported stack rather than by a study page, which
loads four stylesheets against the game's twenty-four.

**And the root is spelled out rather than shortened, which is that lesson one
step further.** `.rul` is the name it wants and the port forbids it: the class
rewrites in `port-design-css.mjs` run over **every** ported sheet, and `.rul` is
a substring of `card.css`'s own `.rules`. A three-letter root would have reached
into a stylesheet this component has nothing to do with and renamed a class
there. A root has to be unique against the whole stack, not merely against the
selectors it shares a file with — and members still take a prefix that is *not*
a continuation of the root's, which is the chip's `tok`/`tk` split followed
rather than rediscovered.

**Unprofiled, like the chip.** Four rings of masked gradients and up to twenty
SVG legends, on one selected token. It is one object against the chip's N, so
it is the smaller worry of the two — but it is the same shape of cost, and
neither has been measured on a real board.

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

## The Martial Artist's Focus

The sixteen Martial Stances have been in this system since *Hope and Fear*
arrived — sixteen `feature` Items wearing `origin: "Martial Stance · Tier N"`
— and the currency every one of them spends was not. Half of them read "spend
a Focus" against a pool that did not exist, which is `brawler.ts`'s finding in
a new place: the sentence shipped and the thing it hangs off did not.

**It is a pool, not a mark track.** "Clear your Focus track, then roll a
number of d6s equal to your Instinct and gain Focus equal to the highest
result" is Hope's shape — held, spent one at a time, given back in a lump.
Stored as marks, the refill would have to write `marked = max − highest`,
which is arithmetic nobody at a table performs. `max` is a stored six and is
never derived, because unlike Hope's — which shrinks one per scar — nothing
printed moves it.

**The field is on every character and the control is not**, which is
`system.mark` and `system.surging`'s arrangement. `spendFocus` and `refocus`
have to *read* the number, and reading it off "the resource named Focus on the
Item named Martial Artist" is string-matching two documents a player can
rename. So the schema carries one integer pair sitting at zero for twelve
subclasses that say nothing about it, and the **sheet** is where the gate
lives: a field costs nothing to carry and a control costs a reader. The rail
draws the row only for a character holding a subclass whose `subclassName` is
`FOCUS_SUBCLASS`, matched on that rather than on the Item's name because a
Martial Artist holds one to three differently-*named* cards.

No world migration was needed and that is worth stating rather than assuming:
a schema field with an `initial` is filled by Foundry's own `DataModel` clean
on the way in, so an existing character reads `focus: {value: 0, max: 6}` from
the first render. `mark`, `surging`, `loadoutLimit` and `levelCards` all took
the same free ride. `migration/` exists for content that was *copied*, and a
schema addition is not that.

**Refocusing rolls a real `Roll`.** `dice/reroll.ts`'s opening promise — the
dice log, seeded randomness and any 3D-dice module stay honest — is not one a
refill may quietly drop by writing a number into a field. It is `NdN` keep-
highest, so the total *is* the highest and Foundry's own tooltip already draws
the discarded dice struck out, and the roll is posted **before** the pool
moves, so the dice reach the table before the number changes under them. It
posts Foundry's own roll card rather than a plate, deliberately: the three
plates here each exist because the dice mean something a total cannot say, and
`frame.css` leaves Foundry's own frame standing around anything that is not
one of our finished objects.

**At Instinct +0 or lower it refuses and writes nothing.** Read literally the
move still happens — the track clears, no dice, gain nothing — which is a rule
that charges your whole pool for zero, once per rest, on a press you cannot
undo. It returns `null` rather than `false`, so a caller can tell a refusal
from a result, and the answer is the Focus row flinching rather than a dialog,
which is this system's answer to a refusal everywhere else.

**And `refusePool` was taking the first pool it found.** It read
`querySelector(".rail .pool")`, which was unambiguous while Hope was the only
one; with two rows of gold diamonds on one rail, a Focus refusal would have
shaken the Hope gems. Both rows carry `data-p` now and the flinch is asked for
by name.

Both pools being gold is a **deferral and not a decision**: `--tone` is
declared on `.gem` itself in `design/gem.css`, so a third hue means a modifier
class beside `.gem.fear`, which is the design system's call rather than a
sheet's. Size (22 against Hope's 32) and the heading are what tell them apart
meanwhile.

**This is the currency and not the stances.** There is no `shiftStance`,
nothing drops you out of one on Severe damage, and the sixteen stance Items
are untouched — a stance is a state with three different exits printed on
three different cards, which is exactly the shape this system declines to
guess at.

`tools/check-focus.mjs` is the ratchet, and it exists because
`check-actor-sheets.mjs` covers only the three non-character sheets — the
character schema had none, and Focus is the field where that bites, since
twelve of thirteen subclasses are a control group who will never report it
missing. Six assertions: the field is a pool and not a mark track, the sheet
writes its value, the gate is `FOCUS_SUBCLASS` and never the literal string,
`refocus` builds a real `Roll` with `kh` and does not reach for `Math.random`,
every rail pool carries `data-p`, and the press states all three of its
heights. Negative-controlled.

## Conditions

`CONDITIONS` in `config.ts` registers **twenty-three**: the three the *core
rules* name — Vulnerable, Hidden, Restrained — plus thirteen the *cards* do,
plus seven the optional chapters and one class stance do. All as Foundry status
effects, with marks in `assets/conditions/`. Foundry's own list is
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

**Seven more were apologised for in five places before they were registered.**
`variant-rules.mjs` carried sentences saying Frostbitten and Nauseated "are not
registered conditions, so neither has a token mark"; Cursed had one of its own,
so did Roped, and so did Broken and Destroyed. A table running Monster Hunting,
a Grimdark curse or a Colossus had six states the rules define, refer back to
and give a duration, with nowhere to put any of them but somebody's memory.
They pass the same test — "While Frostbitten, a PC gains a -1 penalty to their
Proficiency" is that shape exactly. The seventh is **Unstoppable**, on Cloaked's
precedent: a core class feature that puts a named state on its holder. It
registers the *state* and not the shifting, because what drops you out of a
stance is three different sentences on three different cards.

Two words that look like candidates are declined rather than skipped: *Distract*
is a verb the Bard's Make a Scene uses once and never refers back to, and
*Chain* is only ever a card's name.

**Registering one is four things.** A mark in the established idiom — Roped is
Restrained's sibling by construction, same stroke and no fill, because Roped
*is* Restrained plus a tether and the difference is an open loop with a line
leaving it; Nauseated is Hope's own rhombus struck through with Silenced's bar,
because "can't gain Hope" is the whole rule and a queasy face would say nothing
about which resource stopped; Broken and Destroyed are one bar in two states.
A hue in `PALETTE`, positional against this list. A `conditionPattern` branch
drawing the actual substance, **with time in it** — the invariant
`test-token-conditions.mjs` enforces and the one Restrained shipped without
through two review passes. And a `conditionWarp` branch, so none of them falls
through to the material for a condition whose subject is unknown.

At twenty-three the palette is straining, exactly as the shader's own notes
predicted — "the only thing separating them is hue, which is the actual
complaint" — so the seven lean on their ramps to tell themselves apart and the
hex only has to be legible in the HUD sentence.

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

## Phil's Token Studio

A token and portrait editor — crop, frame, effects, a paint mask, and a Save
that writes `actor.img` and `prototypeToken.texture.src`. Both of those are
fields this sheet already owns a control for: the diorama's **Image** and
**Token** buttons open a FilePicker at each. So the Studio is a **third way to
fill the same two slots** rather than a new capability, and it belongs beside
them rather than in a place of its own. `src/module/token-studio.ts` is the
whole seam.

**It publishes no API**, which is the first thing that shapes this.
`QuickTokenStudio` is a plain `export` from `scripts/token-studio.js`; there is
no `game.modules.get(…).api` and nothing on `globalThis`. So the class is
reached by a dynamic `import()` of the module's own file, **at the press** and
not at load — a system that imported it at module scope would fail to boot for
every table that does not have the module, which is most of them. The path goes
through `getRoute` for `assets.ts`'s reason, and carries `@vite-ignore` because
it is a URL rather than a specifier and the bundler would otherwise try to
resolve a module that is not in this repo and cannot be.

**Three entry points, and they are three different questions.**

- **The diorama's `Studio` button**, beside Image and Token, in **edit mode**.
  Those two are the character's own definition and are locked with the rest of
  it, and this writes the same two fields.
- **A header control on every actor sheet**, gated on **ownership** rather than
  on edit mode, in the window's control menu next to Foundry's own "Show
  Portrait Artwork" and "Configure Prototype Token" — which is where somebody
  who has never opened this sheet before goes looking for artwork. The
  adversary, companion and environment sheets have no diorama, so for three of
  the four subtypes this is the way in that always exists. It is **appended in
  `_getHeaderControls`** and not declared in `DEFAULT_OPTIONS.window.controls`,
  because `mergeObject` *replaces* an array rather than concatenating it:
  declaring the key would take ActorSheetV2's own four controls off every sheet
  in the system in order to add one.
- **`ActorSheetHeader`'s `Studio` button**, beside its Image, for the same
  three sheets while editing.

Every one of them is drawn only when the module is active, because **a control
that opens nothing is worse than no control** — and `openTokenStudio` refuses
out loud rather than silently, since a button that does nothing is
indistinguishable from a button nobody wired. That is the activity log's door
again.

**One window, because the module can only have one.**
`QuickTokenStudio.DEFAULT_OPTIONS.id` is the fixed string
`"phils-token-studio-app-v3"` rather than `"…-{id}"`, and ApplicationV2 keys
`foundry.applications.instances` on that id at render and *deletes* the entry at
close. A second Studio opened while a first is up therefore overwrites the
registry entry, and closing either one unregisters the other: the loser is a
window on screen Foundry no longer knows about. The module constructs a new one
on every click and wears that. We do not — a press for the actor already being
edited brings that window to the front, and a press for a different actor closes
the first properly before opening the second. Kept on `rendered` rather than on
being non-null, for `activity-log.ts`'s reason.

**And the module injects its own door, which it turned out we could not talk
our way out of.** The first draft of this file asserted that its
`UniversalButtonInjector` could not find us — it matches `.daggerheart` /
`.dh-style` and `game.system.id === "daggerheart"`, and this system is
`gluniverse-daggerheart` inside a `.dh` root. That is true of three of its four
paths and false of the one that matters. Its `MutationObserver` watches `<body>`
for any node carrying **`.application`**, which every ApplicationV2 window does,
and then resolves the actor by taking the last hyphen-separated chunk of the
element's id — and `DocumentSheetV2` builds that id as
`${constructor.name}-${uuid}`, so ours ends in the actor id and the lookup
succeeds. `injectProfileButton` then finds nothing (it wants `.portrait`,
`.profile-img`, `img[data-edit=img]` and six more; the diorama is a `div.img`
inside `.dio`) and falls through to the header, landing an
`<a class="phils-token-studio-header-btn">` in our `.window-header`.

So `styles/frame.css` hides it, **inside `.dh-sheet` only**. Not a disagreement
with the module: every sheet in the world that is not ours keeps its button, and
it is hidden here precisely because we offer the same thing in the place this
system puts things — a Foundry-chrome control in the middle of our own is the
thing `browse.css` resets an input for. `display:none` rather than removing the
node, because the injector re-runs on every mutation and on a 100ms timer, so
taking it out is a race we would lose.

The general lesson is the one about the study page arriving from a new
direction: **a claim about somebody else's code is a measurement, not a
reading.** Three of the four paths were correctly ruled out by reading; the
fourth was ruled out by reading too, and was wrong, because `.application` is a
class Foundry puts on the window and neither file says so.

`game.daggerheart.tokenStudio(actor)` is the same call, for a macro — the one
place in the world that knows the import path.

## Not done yet

- Compendium content — character creation is covered: classes, subclasses,
  ancestries, communities, the domain decks and all four tiers of equipment,
  and the adversary roster and *Hope and Fear* have both landed. SRD 2.0's
  supplemental chapter is in as two packs behind ten switches. What is left is
  below.
- **The campaign variants ship as content and a switch, and enforce nothing.**
  That is the design — `variants.ts` argues it — but the specific gaps are
  worth naming, because a table switching Grimdark on is entitled to know what
  it is and is not getting. Grimdark's **Shadow-Touched** and Hex Crawl's
  **Blighted** are the same one-field mechanic (an adversary that crits on
  19–20 or 18–20) and neither reaches the roll engine. Six new conditions
  arrive with concrete effects — Roped, Frostbitten, Nauseated, Cursed, and
  the Colossus's Broken and Destroyed — and none is in `CONDITIONS`, which
  would need six marks in `assets/conditions/` before it could be. Feasts is a
  downtime economy the rest dialog has never heard of. Four variants want a
  **countdown attached to a character or a faction**, which is the single
  most-asked-for missing primitive in the chapter and is the GM screen's gap
  under another name.
- **Two sections of that chapter have no home at all.** Faction Tracking
  (p. 190) and Building Villains Collaboratively (p. 200) belong to no variant
  — they are chapter-level GM procedure — so there is no id in `VARIANTS` to
  file them under and no eleventh folder was invented for them. An eleventh
  entry needs an eleventh variant id first, and that is a decision rather than
  an oversight.
- **Tech-Based ships no gear, and that is a finding.** Its weapon is the
  Iconic Weapon, and the SRD prints three of its five columns as *player
  choices* — "make selections about trait, range, and damage" — with the stat
  line recorded on the character's own sheet. A row missing one cell is the
  arcane-frame wheelchair; a row missing three is not a row. The Upgrade list
  is not in the SRD at all; it lives on a downloadable sheet.
- **The Beastform list now has an upstream and still is not in.** SRD 2.0
  prints all 22 categories across four tiers, each with a trait bonus, an
  attack line, an Evasion bonus and its features — so what was "content with
  no upstream to check it against" is now content somebody can transcribe
  against a source, which is a different and much smaller job. The Druid's
  core feature and three subclass features still point at a list that does not
  exist.
- **Four SRD 2.0 rules are read and not implemented**, all of them out of
  scope for the pass that brought the errata in. *Downtime consequences* — the
  GM gains 1d4 Fear on a short rest and 1d4 plus the number of PCs on a long
  one — is pure wiring, since `setFear` and the HUD both exist and
  `apps/rest.ts` mentions Fear nowhere. *Gold rollover* (10 handfuls to a bag,
  10 bags to a chest, carrying and clearing) is three independent counters in
  `data/actors.ts` today. The *multiclass domain-card ceiling* — cards at or
  below half your level, rounded up, from the second class's domain — is
  stated twice in the SRD and appears nowhere in `apps/domain-cards.ts`, which
  offers every domain at full level. And the *Martial Artist's stances* are
  sixteen Items with a currency now and still no shifting, dropping out, or
  one-active-at-a-time.
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
- The GM screen. Three pieces of it exist — the Fear pool is docked and public,
  the activity log is a window of the GM's own, and every creature's tracks are
  on the creature — and the rest of what a GM keeps beside the map still has no
  surface: countdowns, the adversary roster, the environment in play.
- **The token chip has never been profiled.** Nine masked elements and three
  `drop-shadow` filters per creature, times however many are on the board, plus
  three composited loops on every Vulnerable one. Every part of it is cheap by
  argument and none of it is cheap by measurement, and this is precisely the
  shape of cost the browse window turned out to be carrying — invisible
  afterwards, because every chip is correct, and paid entirely in dropped
  frames. A twenty-token scene is the test that matters.
- **A chip is wider than its grid cell**, by about a seventh on each side, and
  by a third on a token wearing Foundry's default dynamic ring — which is what
  buys the tracks their way off the artwork. Two creatures on adjacent squares
  can therefore cross Armor arcs, and rings make that likelier rather than
  less. It has not been seen at a real table yet and `tokenChipScale` is now
  the dial for it, at the cost of pulling every chip in at once.
- **Which way subject scale moves the ring is read rather than measured.** It
  reaches Foundry's shader as a UV correction, and the direction taken here —
  a larger subject means a relatively smaller ring — comes from reading
  `TokenRing#configureSize` rather than from watching a token. It only matters
  on a token whose scale has been moved off 1, the dial is the answer if it is
  backwards, and `game.daggerheart.tokenChips()` prints the whole computation.
  One evening at a table with a ringed token settles it.
- **The range ruler has never been profiled either**, and it shares the
  chip's exact exposure: masked gradients and, at a close camera, up to twenty
  SVG text runs. One object against the chip's N, so it is the smaller of the
  two worries — and the same unmeasured one.
- **A ruler is drawn for a selection and never for a target.** The reticle is
  where "how far is that thing" is actually asked, and `apps/targets.ts`
  already draws the line between the two: selection is what you are acting
  *with*, targeting is what you are acting *on*. Rings under a target would be
  a second answer in the same grammar and it is not obvious they should agree.
- **The other fifteen conditions are not on the token.** Vulnerable is, because
  it is the one the sheet derives and the one the table meets most often;
  Cloaked, Hexed, Marked for Death and the rest wear Foundry's own status icons
  and nothing more. Whether they want a place on the chip is a design question
  nobody has asked yet — sixteen of anything is not a badge row.
- Damage rolls and the adversary d20 do not open the roll popover.
- Help an Ally and tag team rolls. The plate already draws several advantage
  dice with the losers crossed off; nothing lets a second player contribute one.
- Countdowns.
- The companion sheet exists with a `partner` uuid nothing sets.
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
- **Reaction Rolls get no button, and the reason is whose roll it is.**
  Twenty-four cards name one and almost every one belongs to the *target* —
  "each target must make an Agility Reaction Roll". A button on the caster's
  posted card would put the roll on the wrong side of the exchange, which is
  exactly what `apps/targets.ts` was written to fix for damage, and nothing on
  the card says which side it is on in a shape a pattern can read. `askRoll`
  already takes a `reaction` flag and nothing passes one, so the seam is there
  for whoever settles the targeting question first.
- **Card damage reads no critical.** A weapon's damage button is posted by the
  attack that produced it and knows whether it critted; a card's is posted by
  the card, which has no honest link to any roll. Inventing one — the last
  duality roll this actor made, say — would be right most of the time and
  silently wrong exactly when somebody is watching, so it is commented rather
  than omitted.
- **Save-for-half is not encoded**, deliberately, in `damageField` or in the
  annotations. Halving on a success is what happens to a *target* after the
  dice land, and a damage expression is what the caster rolls. It belongs with
  `apps/damage.ts` and the targeting question above, not on the card.
- **The seven Versatile weapons print a second stat line with nowhere to put
  it.** "This weapon can also be used with these statistics—Presence, Melee,
  d8" is a whole alternate weapon — trait, range and die together — and
  `WeaponData.damage` is one stat line rather than a list of them. They are
  declined in `card-damage.mjs` under "somebody else's stat line", which is the
  honest record and not the fix: the fix is a second stat line on the schema
  and a way to say which one you are swinging. **`damageField.extra` is not
  that**, and reading it as a head start would be the wrong lesson — it adds
  die *groups* inside one expression, rolled together and never chosen between,
  which is the Brawler's `d8+d6`. What Versatile needs is the list this schema
  still does not have: `damage` as several stat lines with a live choice
  between them.
- ~~**A feature block has no authored cost field.**~~ **Closed.**
  `featureField()` is `{name, description, modifiers, actions}` now, and a
  block's price is an authored `pay` action rather than a parse of its prose.
  The entry is kept because its reasoning is what forced the shape: a class or
  subclass feature the pattern could not read was a feature nobody could price
  by hand either, which is why `actions` had to nest in the block rather than
  live in a table keyed by document.
- **Temporary effects — the machinery exists now and the readings are what is
  left.** `grant-effect` creates a real ActiveEffect with a Daggerheart
  duration and `effects.ts` sweeps it at the four rest and scene seams, so
  every bucket below is a matter of *annotating* the cards rather than of
  building anything. 87 rules match the sweep, and the breakdown still matters
  because a third of it is not a modifier at all.
  - **Nineteen are a numeric bonus or penalty**, and they are the tidiest set
    in the corpus: the six Major potions each give +1 to a named trait until
    your next rest, Full Surge gives +2 to all six, Featherstep gives Evasion
    equal to your tier, No Mercy +1 to attacks, Insomniac's Periapt +2 to
    attack and damage. These are exactly what `grant-effect` was built for —
    a `modifiers` list and a `duration` — and they are where to start.
  - **Nineteen apply a condition this system now registers** — Earthquake,
    Shadowbind, Chokehold, Tempest, Bolt Beacon, Terrify, Rime Scepter's
    Freezing, Adder's Fang's Venomous, the Poisoners Guild's three toxins.
    Fully answered by `apply-condition` now: the token wears the state and a
    press on the card is what puts it there, on the GM's selected tokens or on
    a player's own character. What is left is one annotation each.
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
