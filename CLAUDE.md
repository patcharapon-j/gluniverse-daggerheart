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
does not appear on a browser reload. Restart Foundry. `dlg.css` was the last
one added and needed all three.

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

One thing this does *not* reach: `design/plate.js` still hardcodes `sq` for
every damage die, while `src/module/dice/plate.ts` has `shapeOf`. So
`tools/verify/` draws a 2d8 as two d6 chips, because it builds its plates with
the design builder. The look is right in the game and wrong on the study page,
which is the opposite of the usual direction and worth fixing when the two
builders are next reconciled.

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

**A move is a card**, in the landscape grammar `tile.css` already speaks —
art panel, gold seam, display-caps name, tier bar. It is `.dt`, a **sibling**
of `.tile` rather than an instance of it, and that is the whole argument: a
tile is assembled out of a domain, a sigil and a level, and a downtime move
has none of the three. Handing `TILE()` a graphite gear kind to get the shape
would invent an object rather than draw one.

**The die rolls in the card that was pressed**, in the panel where a card
would carry its artwork, and it lands as the chat plate's own `.die` — the
same silhouette-with-a-numeral a damage roll draws, so a rolled 3 is the same
object wherever you meet it. The die shows its *face* and the caption carries
the total, because a d4 reading 6 is precisely the lie the plate's `data-mx`
exists to prevent. Resolve and apply are two beats now, three hundred
milliseconds apart: the die settles, then the effect lands and the ledger line
writes itself. They used to happen in the same frame, which meant the number
you were watching for had already been spent by the time you read it.

**Undo is per ledger entry**, and it gives back what was *written* rather than
what the move is worth. Tend to Wounds clearing four Hit Points when only two
were marked has to return two, so the outcome records `clearTrack`'s real
result rather than its argument. The roll is not kept — re-taking rolls again,
because undo means "that did not happen" and not "let me keep the number".
Nothing has been posted at that point, so there is only actor state and the
ledger to reverse, and it is not offered after Done.

**The dice are real, and they tumble without going anywhere.** With Dice So
Nice installed the die in the card is that module's — its geometry, its
materials, our colorset — but it is **posed and spun rather than thrown**. A
die that bounces wants somewhere to bounce *to*, and the panel it rolls in is
a hundred pixels tall; a physics throw there is a die skidding into a corner
and stopping against a wall you cannot see.

`dice/inplace.ts` follows the approach
[`aeris-bg3-rolls`](https://gitlab.com/aeris-fvtt/aeris-bg3-rolls) takes: reach
`DiceBox` and `DiceFactory` off `game.dice3d.box.constructor`, build a
**second box** over our own container, `factory.create` a mesh into its scene,
and drive it from our own RAF loop. `boxType` set to anything other than
`"board"` is what switches off physics, interactivity, persistent dice and the
post-processing passes — that one string is most of the work. The factory has
to be ours as well, because `DiceBox.initialize` calls `setScale` on whatever
it is handed and would resize every die on the board for the length of a rest.

The motion is a slerp from a random start orientation to the target with a
continuous spin about a random axis multiplied on top — three to five whole
turns, easing out, snapping exactly at the end. The spin angle is
`2π·turns·eased`, so it is identity at `t=1` and the die decelerates *onto* its
face rather than near it.

**The face table is derived from geometry, not written down.** Aeris hardcodes
`faceQuats` and it covers d20 only, which would not serve a rest rolling a d4
— and it would not have served us for the d20 either: it resolves onto **+Z**,
and DSN's camera looks straight down −Y with `up = (0,0,−1)`. So the outward
normal of the face carrying each value is computed from `DICE_SHAPE` and paired
with `faceValues`, for all ten shapes the module ships, and the result
cross-checks against a second independent statement of the same fact:
`rotationCombinations["a,b"]` is what `swapDiceFace` applies to turn face *a*
into face *b*, so it must carry normal(a) onto normal(b). All 1,272 entries
agree to within DSN's own whole-degree Euler rounding.

**The d4's special case is the reading direction, not the table.** Every other
die is read off the face nearest the overhead camera; a tetrahedron at rest has
no such face — three of its four tie, and floating point breaks the tie. It has
a unique face pointing *down*, opposite the apex whose number you read, which
is what `faceValues` is about and what DSN's own ancestor did with a reference
vector flipped for `d4` alone.

The renderer is deliberately **not** disposed. `DiceScene` caches its
`WebGLRenderer` in `game.dice3d.dice3dRenderers[boxType]`, so under our own key
this system adds at most one WebGL context to the page, ever, and only if a
rest actually rolls. Tearing it down would force a fresh context and a fresh
HDR load every rest and leave a dead renderer under our key for the module to
hand back; DSN's own editor preview makes the same call for the same reason.
What `disposeInPlace()` does take down is the animation frame, the mesh and the
canvas — and `rest.ts` calls it *before* its early return, or a rest where
nothing was taken strands the canvas in a destroyed dialog.

Every step is guarded and any failure at all falls back to our CSS tumble,
which is also what a table with the module off gets. One trade worth knowing:
a third-party dice system registered through `game.dice3d.addSystem` is not in
our fresh factory, so such a die falls back to standard in the tray. Mutating
the board's factory to avoid that would be worse.

Two moves is the printed number, and `restAllowance` reads it off your own
cards — a Celestial Trance says three, and the hint names the card so the
number does not read as a bug in the sheet. Nothing enforces it: a campaign
frame, a GM ruling and a long-term project all move it, and refusing a third
move would send the table to do the whole rest by hand. That parse is
deliberately shallow and only ever moves a *hint*; the rule itself is printed
verbatim underneath either way. Both rests also refresh every domain card's
`uses`, which is the rule nobody remembers.

Neither the damage nor the rest dialog automates a feature, and that is the
shape of `apps/rules.ts`: it finds every rule this character carries that
*mentions* what you are about to do and prints it verbatim underneath. Parsing
English rules text into behaviour is how a system starts quietly getting rules
wrong; this is a smaller promise that stays true for a feature the GM wrote
last night.

**And where the rule came from a card, both dialogs draw the card.**
`apps/rule-cards.ts` is the other half: it resolves a `Rule` back to the Item
it was read off and builds the tile panel. Finding and drawing lived in one
file while there was one caller; there are two now, and the second wanted
different markup out of the same search. `rules.ts` therefore still carries no
document reference on a `Rule` — the resolver finds the Item back from the
`source` and `name` that `rulesOf` wrote them from. The panels are built before
the dialog opens, because sigils load asynchronously, and injected in `wire`,
because a tile carries `<svg>` and DialogV2 strips that out of `content`.

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
- **Decisions** — which two traits, which two Experiences. The sheet cannot
  guess and must not. These ask, apply, and store the answer in
  `system.advancementChoices` so taking the box back undoes precisely what
  that box did.
- **Acquisitions** — a domain card, a subclass card, a second class. These
  only mark, because a dialog is not a better compendium; you drag the
  document in, which is a gesture this system already has.

Because HP and Stress are derived, the adjust tab's fields are the **base** —
what the class hands you — and advancement is added on top, exactly as an
equipped armour overwrites `armorSlots.max`.

Tier entry is separate and is an *event*: levels 2, 5 and 8 hand over an
Experience, and the two upper ones clear every trait mark, which is what
reopens all six traits. `system.tiersEntered` records which have been paid
out, because a level typed down to 4 and back up to 5 has not reached tier 3
twice and should not collect a second Experience for a typo.

## Conditions

`CONDITIONS` in `config.ts` registers the three the rules name — Vulnerable,
Hidden, Restrained — as Foundry status effects, with marks in
`assets/conditions/`. Foundry's own list is blinded, deaf, paralysis and
prone, and none of those words appear in this game; `dead` survives the
replacement because it is what `specialStatusEffects.DEFEATED` points at.

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

Four colorsets, taken from the values the plate already uses, and split the
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

**What they draw is a chamfer**: three octagonal grooves stepping inward at
falling weight, plus four small diamonds — the mark, the domain pip, the same
rhombus everything else in this system is cut from. Four corners cut rather
than the design's one bottom-right, because a die arrives at any rotation. The
first attempt was seeded value noise, which was a picture of nothing in
particular and read as dirt.

**Hope and Fear no longer share it, and the split falls out of the geometry.**
One texture for both meant hue was the only thing telling apart the two dice
the whole roll turns on, on a surface that had gone to some trouble to have a
character of its own. An octagon is the intersection of a square and a diamond,
so `octagon()` returns `max(square, diamond) - a` — and **which of the two
terms wins already names the run a point stands on**. That discriminator is the
whole mechanism; the two motifs are halves of one figure rather than two
drawings.

Hope keeps only where the *square* term dominates: four straight runs, one
along each edge of the face, tapering out before the corners, with the marks
standing free on the axes inside. It is **the open cut**, and Hope is the one
thing on this sheet you hold in order to spend — the rail's only gesture for it
is letting it go — so a frame with a way out on every side is the right frame.
A chamfer that runs out is also what a real cut does at the end of a run; one
stopping dead would read as a dash. Fear takes the rules the whole way round,
corners included, and moves its marks *into* the corners it just closed, onto
the diagonals at r=0.272 where a regular octagon's innermost chamfer already
is — so `max()` fuses mark and rule into one figure. **The closed cut**: Fear
is not yours and does not leave. The advantage pair takes Fear's figure at half
depth, because nothing is being asked of a d6 except its number.

Parity between the two is enforced on the bump's **flat level and not its
mean**, for the reason the next paragraph gives: that map is also the
transmission mask, so the flat is how see-through the die is, and two duality
dice that are not equally transmissive are not a fair comparison. The generator
prints both means every run to keep that honest — currently 226.32 and 224.82.

The octagon is chosen off the real UV layout rather than by eye.
`createTextMaterial` draws the whole texture into one 256px atlas tile **per
face**, so the motif has to survive being clipped to a square (d6), a pentagon
(d12) and a triangle (d20) — and those three are exactly the shapes we paint,
since `rolls.ts` colours the duality d12s, the advantage d6 and `rollFoe`'s
adversary d20 and nothing else. An octagon's straight runs parallel a square's
four edges and a pentagon's five far better than a diamond's two diagonals do.
No closed rule can hug the edge on a d6 and stay whole on a d20 — measured, a
closed rule survives the d20 only inside inradius 0.233, which on a d6 is a
collar round the numeral — so the grooves are sized for d12 and d6 and 34/56/72
percent of the three of them land on the d20, which reads as a bevel passing
under the face edge rather than as debris.

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
`emissiveLabels: false` with the old wiring and `true` with the new, and
`texture.name` is `dh-mark-hope` under both — the shape of a bug that hides.

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
would also miss the dice we control best, since presets are per-`DiceFactory`
instance and `dice/inplace.ts` builds a second factory that has never heard of
ours, while colorsets and textures are module-level and reach both.

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
  ancestries, communities and the domain decks. Equipment and the adversary
  roster are still to come, as is everything from *Hope and Fear*.
- Character creation. The class's `startingInventory`, `backgroundQuestions`,
  `connectionQuestions` and `suggestedTraits` are all in the schema and drawn
  nowhere, and `STARTING_TRAIT_SPREAD` is unused.
- Death moves. Scars are recordable on the adjust tab and cost a Hope slot;
  Blaze of Glory, Avoid Death and Risk It All are not implemented.
- The Fear HUD (`design/pool.js`) and the GM screen.
- Damage rolls and the adversary d20 do not open the roll popover.
- Help an Ally and tag team rolls. The plate already draws several advantage
  dice with the losers crossed off; nothing lets a second player contribute one.
- Countdowns.
- The companion sheet exists with a `partner` uuid nothing sets.
