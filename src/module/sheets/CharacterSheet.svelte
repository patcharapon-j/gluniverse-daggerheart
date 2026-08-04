<script lang="ts">
  /**
   * The character sheet: rail and pane.
   *
   * The rail is ordered by how often each thing is touched, top to bottom —
   * identity, defence, damage, stress, hope, experience, gold — because if
   * the window is ever short enough to scroll it, the tail is what should go.
   *
   * The class tab is gone. A character has exactly one ancestry, one
   * community, one class and between one and three subclass cards; its
   * contents could never change, and a tab whose contents never change is a
   * heading that costs a click. Those four are rows in the main tab now,
   * last, where they cost almost nothing.
   */

  /* eslint-disable @typescript-eslint/no-explicit-any */

  import {
    ADVANCEMENT,
    BURDEN_LABELS,
    FEATURE_KIND_LABELS,
    LOADOUT_LIMIT,
    TRAITS,
    TRAIT_VERBS,
    choicesDue,
    choicesSpent,
    domainDef,
    rangeLabel,
    traitLabel,
    type Trait,
  } from "../config.ts";
  import type { ItemSnapshot, SheetState } from "../apps/sheet-state.svelte.ts";
  import { handleActorDrop } from "../apps/svelte-sheets.ts";
  import {
    applyLevelCards,
    applyTierEntry,
    choiceKey,
    claimAdvancement,
    claimLevelCard,
    levelCardRows,
    setAdvancement,
  } from "../apps/advance.ts";
  import { addDomainCard } from "../apps/domain-cards.ts";
  import { takeDamage } from "../apps/damage.ts";
  import { rest } from "../apps/rest.ts";
  import { absolute, cssUrl } from "../assets.ts";
  import { rollAttack, rollTrait, rollWeaponDamage } from "../dice/actions.ts";
  import {
    modifierTotal,
    rollModifierTerms,
    weaponModifierTerms,
  } from "../data/modifiers.ts";
  import { platePortrait } from "../dice/plate.ts";
  import { SPINE, TILE } from "../ui/tile.js";
  import { XBOX, XMARK } from "../ui/mark.js";
  import { CARD, fit, rich } from "../ui/card.js";
  import { chitClicks, refuseChits } from "../ui/chit.js";
  import { keepClicks, refuseKeep } from "../ui/keep.js";
  import { closePeeks, peeks } from "../ui/peek.js";
  import { capture, flip } from "../ui/swap.js";
  import { menu } from "../ui/menu.js";
  import { prep } from "../ui/prep.js";
  import { openCreation } from "../apps/create.ts";
  import { stepsOf } from "../apps/creation.ts";
  import {
    cardOf,
    featureCard,
    featurePrice,
    hasDomainHue,
    hopeCard,
    hopeCost,
    isFree,
    loadSigils,
    plain,
    priceLabel,
    type CardOptions,
    type Price,
    type Sigils,
  } from "./cards.ts";
  import {
    liveResources,
    resourcesFor,
    type LiveResource,
  } from "../data/resources.ts";
  import { postCard } from "./post-card.ts";
  import Chits from "./parts/Chits.svelte";
  import Keep from "./parts/Keep.svelte";
  import { liveDicePools, dicePoolsFor, type LiveDicePool } from "../data/dice-pools.ts";
  import Marks from "./parts/Marks.svelte";
  import Gems from "./parts/Gems.svelte";
  import Prose from "./parts/Prose.svelte";

  /* The three written fields, in the order the book asks them. Description is
     yours alone; the other two are questions your *class* asked you at
     creation and the answers point at other people — which is why they are
     three fields and not one long one. */
  const BIO_FIELDS = [
    { key: "description", label: "Description", note: "who they are", height: 220 },
    { key: "background", label: "Background", note: "where they came from", height: 260 },
    { key: "connections", label: "Connections", note: "who else is in it", height: 220 },
  ] as const;

  interface Props {
    doc: any;
    snap: SheetState;
    app: any;
  }
  let { doc, snap, app }: Props = $props();

  let tab = $state<"main" | "vault" | "gear" | "advancement" | "bio" | "adjust">("main");

  const sys = $derived(snap.system);
  const ed = $derived(snap.editable);
  /* Not reactive, and does not need to be — nobody is promoted to GM with a
     character sheet open. It gates the adjust tab; see the tab strip. */
  const isGM = game.user?.isGM ?? false;

  /* ── edit mode ─────────────────────────────────────────────────────
     Definition against use, and the whole sheet turns on which one you are
     doing.

     Everything derived here hangs off something set once. Level drives the
     tier, Proficiency, both damage thresholds and what each advancement
     panel owes; the class hands over base Evasion, Hit Points and Stress; a
     trait score is chosen at creation and moved twice in a campaign. During
     play you are doing the other thing entirely — marking, spending,
     clearing, equipping, taking — dozens of times an hour, under a clock,
     with a GM waiting. A stray click on Level or a trait in the middle of
     that moves a number nobody notices moved until a sum is wrong three
     sessions later.

     `$state(false)` local to the component, deliberately. It dies with the
     sheet, so nobody reopens a character next week and finds it unlocked,
     and it is per-user rather than per-document: two people with the same
     sheet open are not both editing because one of them pressed a button.
     Nothing about it is worth a document write or a setting.

     `edit` and not `editMode` is what every gate reads. A sheet you cannot
     change at all must not offer the mode, and the alternative — testing
     both conditions at nineteen call sites — is nineteen chances to test
     one of them.

     Not the same question as the adjust tab, and not folded into it. That
     tab overrides numbers the *rules* derive, which is adjudication and is
     therefore the GM's; this unlocks the character's own definition, which
     is authorship and is therefore the owner's. A player levelling up needs
     this and has no business on the dials. So: `isGM` there, `editable`
     here. */
  let editMode = $state(false);
  const edit = $derived(editMode && ed);

  /* The banner's text, repeated so a run is wider than any window it will be
     dragged to. Two identical runs in one track translated by half its width
     is what makes the loop seamless — see `.tape` in sheet.css. */
  const TAPE = Array.from(
    { length: 6 },
    () => "Edit mode · level, traits, portrait and the numbers the class hands you are unlocked · ",
  ).join("");

  /** Said under every panel the mode locks, in the panel's own quiet ink. */
  const LOCKED = "Locked while the sheet is in play mode — switch on edit at the end of the tab strip.";

  /* Leaving the mode puts the framing gesture down with it. The framing bar
     lives inside the mode, so a sheet locked mid-drag would otherwise sit in
     `.framing` forever: the diorama grabbing the pointer, the plate preview
     over the picture, and no visible control to turn any of it off. */
  function toggleEdit() {
    editMode = !editMode;
    if (!editMode) framing = false;
  }

  /* The write path for anything that is definition. `set` further down is
     the one for anything that is use, and the only difference between them
     is which gate they read — which is exactly the distinction this whole
     mode is about, so it is worth two functions rather than one with a
     boolean. A call site that picks the wrong one is a bug you can see by
     reading the name. */
  const setDef = (path: string, value: unknown) => edit && doc.update({ [path]: value });

  /* Five, unless the table says otherwise. It was a constant, and a constant
     is the wrong shape for it: subclasses and campaign frames move this
     number, and a table that cannot move it moves something else instead. */
  const loadoutLimit = $derived(sys.loadoutLimit ?? LOADOUT_LIMIT);

  /* Straight from the printed sheet, where Evasion and Armor are told apart
     by outline rather than by label: Evasion is an arch, Armor is a shield.
     The arch is drawn three times — twice as an offset outline, occluded on
     its right by the solid on top. Nothing floats; the shape is simply
     somewhere its own outline says it used to be, which is what dodging
     looks like. */
  const ARCH_D = "M12 61 L12 26 Q12 7 33 7 Q54 7 54 26 L54 61 Z";
  const SHIELD_D = "M12 8 L54 8 L54 34 Q54 53 33 61 Q12 53 12 34 Z";

  const cards = $derived(snap.of("domainCard"));
  const loadout = $derived(cards.filter((c) => c.system.inLoadout));
  const vault = $derived(cards.filter((c) => !c.system.inLoadout));

  const primary = $derived(
    snap.of("weapon").find((w) => w.system.equipped && w.system.slot === "primary") ?? null,
  );
  const secondary = $derived(
    snap.of("weapon").find((w) => w.system.equipped && w.system.slot === "secondary") ?? null,
  );
  const twoHanded = $derived(primary?.system.burden === "twoHanded");

  /* Hit Points and Stress sit one above the other in the same column at 7 and
     6. Sized independently that is two box sizes stacked, and two sizes read
     as two kinds of thing — they are not. Both are sized for the larger. */
  const vitSpan = $derived(
    Math.max(sys.resources?.hitPoints?.max ?? 6, sys.resources?.stress?.max ?? 6),
  );

  /* ── character creation, from the outside ──────────────────────────
     The plate reads the same derivation the window does, so the two can
     never disagree about how far along this character is — there is one
     answer and `stepsOf` is it. `snap.rev` is read to make it reactive:
     everything creation touches is an embedded document, and the snapshot
     is what knows those changed.

     The hint names what is *outstanding* rather than what is done, because
     the outstanding half is the actionable one. Two names at most, then a
     count — "traits, equipment and 2 more" reads; six names is a paragraph
     in a 252px column. */
  const made = $derived.by(() => {
    void snap.rev;
    const steps = stepsOf(doc);
    const left = steps.filter((s) => !s.done);
    const done = steps.length - left.length;
    const names = left.slice(0, 2).map((s) => s.label.toLowerCase());
    const rest = left.length - names.length;
    return {
      finished: !!sys.creation?.finished,
      pct: Math.round((done / Math.max(1, steps.length)) * 100),
      hint: sys.creation?.finished
        ? "Finished — open it to change anything"
        : left.length
          ? `${done} of ${steps.length} · ${[...names, rest ? `${rest} more` : ""]
              .filter(Boolean)
              .join(", ")} outstanding`
          : `${done} of ${steps.length} · ready to finish`,
    };
  });

  /* The sub-heading under "Heritage", and the transformation belongs in it —
     "reborne human vampire" is how a player says who they are, in one line, the
     same way "wildborne faun" is. */
  const heritage = $derived(
    [
      snap.of("ancestry")[0]?.name,
      snap.of("community")[0]?.name,
      snap.of("transformation")[0]?.name,
    ]
      .filter(Boolean)
      .join(" · ") ||
      sys.biography?.heritage ||
      "—",
  );
  const className = $derived(snap.of("class")[0]?.name ?? "—");
  const subclassName = $derived(snap.of("subclass")[0]?.system.subclassName ?? "");

  const sign = (n: number) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);

  /* ── the portrait ─────────────────────────────────────────────────
     One picture, two frames. The diorama is a wide band across the top of
     the rail; the roll plate's portrait is a narrower panel behind the
     verdict. A crop judged in one is wrong in the other, so each is stored
     and set separately — and while you are setting the plate's, the plate's
     own panel is drawn over the diorama at true proportions and you drag
     inside *that*, because framing a box you cannot see is guessing and you
     find out one message later.

     Freeform means freeform. Offsets are unbounded — pushing a subject off
     an edge is a legitimate composition — and the scale goes below 1, where
     the picture sits inside the frame with the panel's colour around it.
     Neither is clamped to keep the image "covering", because deciding that
     for someone is the opposite of what was asked for. */
  type Frame = { x: number; y: number; scale: number };
  const NEUTRAL: Frame = { x: 0, y: 0, scale: 1 };

  /** The chat card's true width. The preview is scaled to fit the rail. */
  const PLATE_W = 300;
  const MAX_LEVEL = 10;

  let framing = $state(false);
  let target = $state<"sheet" | "plate">("sheet");
  let dioW = $state(PLATE_W);

  const stored = (which: "sheet" | "plate"): Frame => ({
    ...NEUTRAL,
    ...(sys.portrait?.[which] ?? {}),
  });

  /* The diorama always shows the diorama's own framing, now that the card
     has a preview of its own. It used to borrow the plate's while you were
     editing it, which was the best available answer when the alternative
     was showing you nothing — and is the wrong one now that both surfaces
     can be on screen at once, each wearing its own crop. */
  /* Unitless, because the offsets are spent as `cqw`/`cqh` in `sheet.css`
     — one percent of the frame, which is the unit the drag below writes —
     rather than as a translation of the picture layer. See `.dio .img`. */
  const frameVars = $derived(
    (({ x, y, scale }) => `--fdx:${x};--fdy:${y};--fz:${scale}`)(stored("sheet")),
  );
  /** The frame the controls are addressing — the readout, Reset, the drag. */
  const live = $derived(stored(target));

  /* Never above 1: a preview larger than the card would be a lie in the
     other direction. Below it the crop is unchanged — the frame is stored
     in percentages — so the only thing lost by scaling is the type's
     absolute size, and the type is not what is being placed. */
  const previewScale = $derived(Math.min(1, Math.max(0.5, (dioW - 18) / PLATE_W)));

  /* Built by the card's own builder, so the preview cannot drift from the
     card — see `platePortrait`. The roll it shows is a fixed sample: what
     is being judged is where the face sits under the name and the numeral,
     and those are in the same place on every duality roll ever made. */
  const preview = $derived(
    platePortrait({
      who: snap.name,
      label: "agility",
      kind: "duality roll",
      img: snap.img ? absolute(snap.img) : undefined,
      frame: stored("plate"),
      h: 9,
      f: 7,
      out: "hope",
      dc: null,
      hit: true,
      total: 18,
      mods: [],
    }),
  );

  const writeFrame = (f: Frame) =>
    edit && doc.update({ [`system.portrait.${target}`]: f });

  const resetFrame = () => writeFrame(NEUTRAL);

  /* Setting the level is the level-up.
   *
   * Reaching a tier hands over an Experience, and the two upper ones clear
   * every trait mark — which is what reopens all six traits for that tier's
   * own advancements. Those are the achievements printed at the head of each
   * panel, and until now they were printed and nothing else: the panel said
   * "gain an additional Experience" and you went and typed one in.
   *
   * Applied after the write, so `applyTierEntry` reads the level it is
   * reacting to. It records which tiers it has already paid out — see
   * `tiersEntered` — so a level typed down and back up does not collect twice.
   *
   * And **every level gives a domain card**, which is step 4 of the printed
   * level-up and sits beside the two advancement choices rather than being one
   * of them. `applyLevelCards` asks for it, once per level newly reached.
   *
   * It is handed the level you *were*, and that is the whole migration: the
   * record only knows about levels it has seen, so a character who has been
   * level 6 all year is asked about level 7 and about nothing else, rather
   * than being handed a bill for a campaign's worth of levels already played.
   * Read before the write, or the old level is the new one.
   */
  async function setLevel(n: number) {
    if (!edit) return;
    const was = Number(sys.level ?? 1);
    const level = Math.min(MAX_LEVEL, Math.max(1, Math.round(n || 1)));
    await doc.update({ "system.level": level });
    for (const line of await applyTierEntry(doc, level)) {
      ui.notifications?.info(line);
    }
    for (const line of await applyLevelCards(doc, was, level)) {
      ui.notifications?.info(line);
    }
  }

  /* Two pictures, and they are genuinely two. The portrait fills the diorama
     and the roll plate; the token art is what sits on the board, where a
     head-and-shoulders crop is the wrong picture at 100px seen from above.
     Foundry keeps them apart and so does this — one browser, two targets. */
  async function pickImage(which: "portrait" | "token") {
    if (!edit) return;
    const path =
      which === "token" ? doc.prototypeToken?.texture?.src : doc.img;
    const picker = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current: path,
      callback: (p: string) =>
        doc.update(which === "token" ? { "prototypeToken.texture.src": p } : { img: p }),
    });
    await picker.browse();
  }

  /**
   * The surface the percentages are measured against, and the layer that
   * carries them, for whichever frame is being edited.
   *
   * This matters more than it looks. An offset is a percentage of the box it
   * is applied in, so measuring the drag against the diorama while the crop
   * lands in the plate's panel means every gesture is scaled by the ratio of
   * two differently-shaped boxes — the picture drifts under the pointer, by
   * more vertically than horizontally, and the harder you try to place a
   * face the further it gets. Measuring against the panel you are actually
   * looking at makes the picture track the hand exactly, which is the only
   * behaviour a direct-manipulation gesture is allowed to have.
   *
   * The preview being scaled does not enter into it: the rect is the scaled
   * rect and the translation is a percentage of the unscaled box, so the two
   * cancel and a pixel of pointer is a pixel of picture at any size.
   */
  const framed = (box: HTMLElement): { rect: HTMLElement; img: HTMLElement | null } => {
    const por = target === "plate" ? box.querySelector<HTMLElement>(".pv .por") : null;
    return por
      ? { rect: por, img: por.querySelector<HTMLElement>("u") }
      : { rect: box, img: box.querySelector<HTMLElement>(".img") };
  };

  /* Drag to pan. The delta is converted to a percentage of the *frame* on
     the way in, so a framing set in a 288px rail survives the window being
     dragged wider — and so the two surfaces can share one unit. */
  function onFrameDown(event: PointerEvent) {
    if (!framing || !edit) return;
    const box = event.currentTarget as HTMLElement;
    if ((event.target as HTMLElement).closest("button, input")) return;
    event.preventDefault();

    const { rect, img } = framed(box);
    const r = rect.getBoundingClientRect();
    const from = stored(target);
    const x0 = event.clientX;
    const y0 = event.clientY;
    let f = from;

    const move = (e: PointerEvent) => {
      f = {
        ...from,
        x: from.x + ((e.clientX - x0) / r.width) * 100,
        y: from.y + ((e.clientY - y0) / r.height) * 100,
      };
      // Written to the DOM directly during the drag and to the document only
      // at the end: a document update per pointermove is a re-render per
      // pointermove, and the sheet would spend the gesture rebuilding itself.
      img?.style.setProperty("--fdx", `${f.x}`);
      img?.style.setProperty("--fdy", `${f.y}`);
    };
    const up = () => {
      box.removeEventListener("pointermove", move);
      box.removeEventListener("pointerup", up);
      box.removeEventListener("pointercancel", up);
      void writeFrame(f);
    };
    box.setPointerCapture(event.pointerId);
    box.addEventListener("pointermove", move);
    box.addEventListener("pointerup", up);
    box.addEventListener("pointercancel", up);
  }

  /* Wheel to zoom, multiplicatively — a fixed step is coarse at 0.3 and
     glacial at 4. The floor is the schema's, so dragging it to nothing you
     could grab again is the one thing the gesture will not do. */
  function onFrameWheel(event: WheelEvent) {
    if (!framing || !edit) return;
    event.preventDefault();
    const f = stored(target);
    const scale = Math.min(8, Math.max(0.1, f.scale * (event.deltaY < 0 ? 1.08 : 1 / 1.08)));
    void writeFrame({ ...f, scale: Math.round(scale * 1000) / 1000 });
  }

  /* ── cards ────────────────────────────────────────────────────────
     Nothing here draws a card. `SPINE` and `CARD` already do, and they take
     the same option object, which is why the row and the peek can never say
     different things — `cards.ts` builds that object and this only decides
     which rows exist.

     The sigils are fetched and recentred against their own ink bounds, so
     they cannot be built during a render. They land in a rune instead and
     every spine re-derives when they do; before that the plate is simply
     empty, which is a mark missing for one frame rather than a sheet that
     waits for one. */
  let sigils = $state<Sigils>({});
  loadSigils().then((s) => (sigils = s));

  /* Each class's own pair, so a subclass card can wear the colours of the
     class it names rather than of whichever class is first on the sheet.
     One class is the common case and the map has one entry; two is what a
     multiclass advancement produces, and it is the case the old code got
     silently wrong. */
  const classDomains = $derived(
    Object.fromEntries(
      snap.of("class").map((c) => [c.name.toLowerCase(), c.system?.domains ?? {}]),
    ),
  );

  const ctx = $derived({
    domains: sys.domains,
    classDomains,
    armorSlots: sys.resources?.armorSlots?.max ?? 0,
    armorMarked: sys.resources?.armorSlots?.marked ?? 0,
    /* The document and not the snapshot: a pool sized "equal to your
       Spellcast trait" is resolved against the live actor, and the snapshot
       is a value with no `system.spellcastTrait` derivation on it. */
    actor: doc,
  });

  const opt = (it: ItemSnapshot | undefined): CardOptions | null =>
    it ? cardOf(it, sigils, ctx) : null;

  /* A row and its peek are one entry, keyed the same. The key is the item id
     rather than the index: an index is exactly what a swap changes, so
     keying by it would point every peek at its neighbour the moment a card
     moved. */
  interface Row {
    pk: string;
    card: CardOptions;
    /** The item itself, for the counters the row draws into the builder's output. */
    it: ItemSnapshot;
  }
  const rows = (items: ItemSnapshot[]): Row[] =>
    items
      .map((i) => ({ pk: i.id, card: opt(i), it: i }))
      .filter((r): r is Row => r.card !== null);

  /* Three kinds on one row, and that is the book's own arrangement rather
     than a saving of space: a transformation is added "as if it were part of
     your character's heritage", does not count against the loadout limit, and
     is chosen the way the other two are. A fourth panel for a card that is
     present on maybe one character in five would be a permanently empty
     heading; the row simply has three spines instead of two when there is one.
     Last, because it is the one you acquire mid-campaign. */
  const heritageCards = $derived(
    rows([...snap.of("ancestry"), ...snap.of("community"), ...snap.of("transformation")]),
  );
  const loadoutCards = $derived(rows(loadout));
  const vaultCards = $derived(rows(vault));

  /* ── the subclass, which really is a card ──────────────────────────
     The class stopped being one and the subclass did too, and only the
     first of those was right.

     The argument for taking the class off the card was that a class is not
     an object: you cannot spend it, move it or lose it, so a spine promising
     a card behind it was promising the wrong shape. None of that is true of
     a subclass. It *is* printed as a card, three of them per subclass, and
     you acquire them one at a time by spending an advancement — Foundation
     at creation, Specialization at 5, Mastery at 8. Which of the three you
     are holding is a fact about your character that the printed card states
     and a list of features does not, and "take the Mastery card" is a thing
     a player says out loud at the table.

     So it is a card again, on the sheet and in chat. The feature rows stay,
     because what a feature *says* is still the question asked most often and
     a row answers it without a gesture — but a subclass row posts the
     subclass card rather than a card synthesised around one of its features,
     because the object exists and there is no reason to invent a worse one. */
  const subclassCards = $derived(rows(snap.of("subclass")));

  /* ── gear ─────────────────────────────────────────────────────────
     Three slots, and everything else you own listed underneath. The armor
     slot is a slot like the two hands are: it is one of exactly three things
     a character wears, and a list with an `equipped` flag would let two of
     them be true at once. */
  const armor = $derived(snap.of("armor").find((a) => a.system.equipped) ?? null);

  /** What the "equip ·" hint on a carried tile names. */
  const SLOT_CAP: Record<string, string> = {
    primary: "Primary",
    secondary: "Secondary",
    armor: "Armor",
  };

  const slots = $derived([
    { key: "primary", label: "Primary weapon", it: primary },
    { key: "secondary", label: "Secondary weapon", it: secondary },
    { key: "armor", label: "Armor", it: armor },
  ]);

  /* Everything owned that is not currently in a slot. A weapon that cannot
     be equipped right now is still listed and still says why — hiding it
     would make the shield look lost rather than shelved. */
  const carried = $derived(
    snap.items.filter(
      (i) =>
        (i.type === "weapon" || i.type === "armor") &&
        !i.system.equipped &&
        i.id !== primary?.id &&
        i.id !== secondary?.id,
    ),
  );

  /* Loot with a rules paragraph earns a card, because a rule you cannot see
     is a rule you will not use. A torch stays a line — it is a thing you
     have rather than a thing you do. */
  const hasText = (i: ItemSnapshot) => !!String(i.system.description ?? "").replace(/<[^>]*>/g, "").trim();
  const lootItems = $derived(
    snap.items.filter((i) => (i.type === "consumable" || i.type === "loot") && hasText(i)),
  );
  const lootCards = $derived(rows(lootItems));
  const inventory = $derived(
    snap.items.filter((i) => (i.type === "consumable" || i.type === "loot") && !hasText(i)),
  );

  /* ── charges ──────────────────────────────────────────────────────
     You can hold up to five of a consumable, which makes it the only thing
     on this sheet that is both a card and a resource. They ride at the end
     of the row's meta line and are clickable there, because spending one is
     the commonest thing you will do to loot and it should not require
     opening anything. `data-act` keeps the click off the peek: a control
     inside a row is a control first.

     Crossed from the *left*, like every other row of boxes on this sheet.
     Crossing from the right would put the survivors where the count is —
     and would make this the one row that fills the other way, which is the
     kind of small inconsistency nobody notices and everybody misreads. */
  const CHARGES = 5;

  const charges = (held: number, id: string) =>
    `<span class="chg" title="${held} of ${CHARGES} left">` +
    Array.from(
      { length: CHARGES },
      (_, i) =>
        `<i class="${i < CHARGES - held ? "on" : ""}" data-act data-ch="${id}" data-i="${i}"><u></u>${XMARK}<b></b></i>`,
    ).join("") +
    "</span>";

  const chargeTotal = $derived(
    lootItems
      .filter((i) => i.type === "consumable")
      .reduce((n, i) => n + Math.min(CHARGES, i.system.quantity ?? 0), 0),
  );

  /* Click the box you want to be the last crossed one; click it again to
     give it back. `target()` in the design is the shared rule for every row
     of boxes on the sheet, so a charge behaves like a Hit Point without
     either of them knowing about the other. */
  function onCharge(e: MouseEvent) {
    const el = (e.target as Element | null)?.closest?.("[data-ch]") as HTMLElement | null;
    if (!el || !ed) return;
    const id = el.dataset.ch;
    const i = Number(el.dataset.i);
    const it = snap.items.find((x) => x.id === id);
    if (!id || !it || Number.isNaN(i)) return;
    const crossed = CHARGES - Math.min(CHARGES, it.system.quantity ?? 0);
    const n = i + 1;
    item(id)?.update({ "system.quantity": CHARGES - (n === crossed ? n - 1 : n) });
  }

  /* Every card on screen, for the peek layer. It renders them all once,
     outside every scroller — see peek.js: an absolutely positioned card is
     clipped by any ancestor that scrolls, and no z-index fixes a clip. */
  const peekRows = $derived(
    tab === "main"
      ? [...loadoutCards, ...subclassCards, ...heritageCards]
      : tab === "vault"
        ? [...loadoutCards, ...vaultCards]
        : tab === "gear"
          ? lootCards
          : [],
  );

  /* ── the window ───────────────────────────────────────────────────
     `peeks` delegates from the window and binds once, because Svelte keeps
     this element for the life of the sheet — the very reason the sheet is
     Svelte at all. `fit` has to run again whenever the cards change: it
     measures each card's prose against its plate and steps the type down
     until it fits, and a card added after the last pass has never been
     measured. */
  let winEl: HTMLElement | undefined = $state();

  $effect(() => {
    if (winEl) peeks(winEl);
  });

  /* Both chit gestures, delegated from the window and bound once for the
     same reason `peeks` is. The row is the subject and the handler stops the
     press there — see `chitClicks` — or placing a counter on a domain card
     would also post that card to chat, which is `onCardClick` doing its job
     on an event that was never meant for it.

     Nothing is written here optimistically. `moveResource` clamps and returns
     false when the pool cannot go that way, and a refusal is the pool
     flinching rather than a warning: the number that said no is the thing
     under the pointer. The Item's update is what moves the row, through the
     `Chits` component's own effect, so a spend looks identical whether it
     came from this sheet or from a rest three panels away. */
  $effect(() => {
    if (!winEl) return;
    chitClicks(winEl, async (row, _next, dir) => {
      if (!ed) return refuseChits(row);
      const [id, ix] = (row.dataset.key ?? "").split(":");
      const item: any = doc.items.get(id);
      if (!item) return refuseChits(row);
      if (!(await item.moveResource(Number(ix), dir))) refuseChits(row);
    });
  });

  /* And every gesture a tray of kept dice has, off the same root and by the
     same rules. Two handlers rather than one because they answer for
     different rows — `chitClicks` claims `[data-chits]` and this claims
     `[data-keep]`, and neither can see the other's.

     The five gestures collapse to four calls on the document, and the one
     that does not is `roll`: `keepClicks` hands the list back *unchanged*
     for both roll gestures, because the RNG belongs to whoever owns the
     dice log, and here that is Foundry. Everything else states its own
     result and the Item decides whether it is allowed.

     `step` is the only one that adds an animation from out here, and it has
     to: a value changing on a die that did not move is not something the
     setter can tell apart from a die arriving, so the caller — which knows
     it pressed the chevron — says so. */
  $effect(() => {
    if (!winEl) return;
    keepClicks(winEl, async (row, _next, how, at) => {
      if (!ed) return refuseKeep(row);
      const [id, ix] = (row.dataset.key ?? "").split(":");
      const item: any = doc.items.get(id);
      if (!item) return refuseKeep(row);
      const i = Number(ix);

      if (how === "place") {
        if (!(await item.placeDie(i))) refuseKeep(row);
        return;
      }
      if (how === "take") {
        if (!(await item.spendDie(i, at ?? 0))) refuseKeep(row);
        return;
      }
      if (how === "step") {
        const kd = row.querySelector(".kd");
        if (!(await item.stepDie(i))) return refuseKeep(row);
        kd?.classList.add("step");
        kd?.addEventListener("animationend", () => kd.classList.remove("step"), { once: true });
        return;
      }
      const rolled = await item.rollTray(i, how === "roll1" ? at : undefined);
      if (!rolled.length) refuseKeep(row);
    });
  });

  $effect(() => {
    void peekRows;
    if (!winEl) return;
    const el = winEl;
    // After paint, or the cards are measured at zero height.
    requestAnimationFrame(() => fit(el));
  });

  /* ── fitting the window, once ──────────────────────────────────────
     Five tabs of wildly different heights share one window: Advancement is
     roughly three times the Attack panel, so a height that suits one leaves
     the other either cut off or floating in empty frame.

     This used to refit on every tab change, and that was the wrong answer to
     a real problem. **A window that resizes under you while you are reading
     it is worse than one that is sometimes too tall.** Switching tabs is a
     glance — you are checking what is in the vault, not asking the sheet to
     rearrange the desk — and the window jumping made the tab strip move under
     the pointer that had just pressed it. The scrollers were always there to
     take the overflow, and `.scr` has scrolled since it was written.

     So the fit happens once, against whatever tab the sheet opens on, and
     after that the height is yours. The measure is the *scroller's* shortfall
     rather than the content's absolute height, because that is the number
     that survives not knowing what the window chrome costs:
     `natural - clientHeight` is how much taller the box needs to be, in the
     same units the window is set in, whatever is above it.

     Both scrollers are measured and the larger wins — the rail is the same
     on every tab, and a window sized to a short pane would clip it instead.

     Bounded at both ends and it matters at both. The floor stops a nearly
     empty tab from collapsing the window to a title bar; the ceiling is the
     viewport, because a sheet taller than the screen cannot be scrolled back
     into view — Foundry windows do not scroll, their contents do, and the
     contents are exactly what we just made too tall to reach. */
  const MIN_H = 560;

  /** Content height of a scroller, independent of the box it is in. */
  function natural(scr: HTMLElement): number {
    const kids = [...scr.children] as HTMLElement[];
    const first = kids.at(0);
    const last = kids.at(-1);
    if (!first || !last) return 0;
    const cs = getComputedStyle(scr);
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    return last.getBoundingClientRect().bottom - first.getBoundingClientRect().top + pad;
  }

  /**
   * One pass. Iterated, because one pass does not converge.
   *
   * `setPosition` is not a setter — Foundry clamps the height so the window
   * stays on screen, and will move the window up to make room before it
   * refuses. So the height you ask for and the height you get differ, by an
   * amount that depends on where the window happens to be. Measuring again
   * after the move is the only way to find out, and two or three passes is
   * always enough because each one is strictly closer. `passes` is a
   * stop, not a schedule: it converges before it runs out or the tab is
   * genuinely taller than the screen, and then it should stop and scroll.
   */
  function refit(passes = 3) {
    if (!winEl || !app?.setPosition) return;
    const scrs = [...winEl.querySelectorAll(".scr")] as HTMLElement[];
    if (!scrs.length) return;

    const grow = Math.max(...scrs.map((s) => natural(s) - s.clientHeight));
    if (!Number.isFinite(grow)) return;

    const now = app.position?.height;
    if (typeof now !== "number") return;

    const want = Math.round(Math.min(window.innerHeight - 60, Math.max(MIN_H, now + grow)));
    // A few pixels is measurement noise, and setting the position re-renders
    // — chasing it would be a loop with no bottom.
    if (Math.abs(want - now) < 8) return;

    app.setPosition({ height: want });
    if (passes > 1) requestAnimationFrame(() => refit(passes - 1));
  }

  /* Deliberately depends on `winEl` and nothing else. `tab` and `peekRows`
     used to be read here, which is what made every tab change a resize —
     and `peekRows` is itself derived from `tab`, so it was two subscriptions
     to the same event. `fitted` is a plain `let` rather than `$state` so
     setting it cannot re-enter the effect. */
  let fitted = false;
  $effect(() => {
    if (fitted || !winEl) return;
    fitted = true;
    // Two frames: the first paints, the second is after `fit` above has
    // stepped any card's type scale, which changes its height.
    requestAnimationFrame(() => requestAnimationFrame(() => refit()));
  });

  /* ── a card that changes hands travels ─────────────────────────────
     Recalling a card from the vault, shelving one back, and equipping a
     weapon all moved the thing instantly: it was in one list on one frame
     and in another on the next. Every animation for it has existed in
     `swap.css` since the vault was designed — the wipe with its lit
     leading edge, the brackets snapping onto the two square corners, the
     saturation coming back up as the card comes to hand, the folder tab
     arriving on the one going away — and none of it had ever run in
     Foundry, because nothing on this sheet had ever called `flip()`.

     It is a FLIP and it has to be. Committing a swap writes to the
     documents, which re-renders the sheet, which destroys the row and
     builds a new one somewhere else — there is nothing left to transition.
     So the rects are measured before the write, measured again after the
     new markup lands, and the difference is played backwards: the card
     appears to travel from where it was to where it now is, while never
     actually having moved. Every other row in both lists reflows around it
     and is flipped too, at a shorter duration, so the list closes over the
     gap rather than snapping shut.

     The measure-after is the part Svelte decides, not us. A write to a
     Foundry document comes back on its own schedule, so there is no
     `await` here that lands on the frame the DOM changed. `$effect` is
     exactly that frame: it reads the derived lists, so it runs when they
     actually changed — after the DOM is patched and before the browser
     paints, which is the whole window a FLIP needs.

     `pending` is a plain `let` rather than `$state`, so writing it cannot
     re-enter the effect, and it carries a timestamp: a swap the rules
     refused, or a write that produced no visible move, must not leave a
     stale set of rects for the next unrelated item change to fly against. */
  const STALE = 1200;
  let pending: {
    before: Map<string, DOMRect>;
    moved: string;
    mode: "recall" | "shelve" | null;
    at: number;
  } | null = null;

  /** Measure now; the effect below plays it when the new markup lands. */
  function travels(moved: string, mode: "recall" | "shelve" | null) {
    if (!winEl) return;
    pending = { before: capture(winEl), moved, mode, at: performance.now() };
  }

  $effect(() => {
    // Read them, so this runs on the paint that moved something rather than
    // on the frame that asked for it. All four lists, because equipping is
    // the same journey across a different tab.
    void loadoutCards;
    void vaultCards;
    void slots;
    void carried;
    const p = pending;
    if (!p) return;
    pending = null;
    if (!winEl || performance.now() - p.at > STALE) return;
    flip(winEl, p.before, { moved: p.moved, mode: p.mode });
  });

  /* ── a card, said out loud ─────────────────────────────────────────
     Clicking a card row posts the whole card to chat. It is the same option
     object the row and the peek were built from, so the three cannot
     disagree — see `post-card.ts`.

     Hover already shows you the card. This is for the other person. */
  const toChat = (card: CardOptions | null) => {
    if (card) void postCard(card, doc);
  };

  /* Every row on every tab already carries `data-pk`, and a `pk` is an item
     id — so one delegated handler covers all five tabs, and a row added
     later is wired the moment it is drawn. The alternative was the same
     `onclick` copied onto eight `{#each}` bodies, which is eight places for
     the ninth to be forgotten. */
  const cardByPk = $derived(
    new Map(
      snap.items
        .map((i) => [i.id, opt(i)] as const)
        .filter((e): e is readonly [string, CardOptions] => e[1] !== null),
    ),
  );

  /* ── rolling ────────────────────────────────────────────────────────
     Every roll on this sheet goes through the popover, and the popover
     opens on the click that used to roll. That is a tax on the most
     frequent gesture in the game, paid so that the four things a roll can
     carry — advantage and its sources, a modifier, the Experiences you are
     bringing in, and the Hope they cost — have somewhere to be said. They
     have been arguments of `rollTrait`/`rollAttack` since those were
     written; nothing had ever passed them.

     `prep` resolves null on every way out, and every way out is free. The
     Hope is charged in `actions.ts`, not here, because the popover only
     ever *proposes* a roll — the sheet is not where money moves. */
  const purse = $derived(sys.resources?.hope?.value ?? 0);
  const xpList = $derived(
    (sys.experiences ?? []).map((x: any) => ({ name: x.name, modifier: x.modifier })),
  );

  /* ── the Hope action ───────────────────────────────────────────────
     Every class has one, it costs Hope, and it used to be the second
     feature run on the class card — which put the only *move* on this
     sheet inside the one object you have to hover to read, four panels
     down, while the pool it spends sits in the rail.

     It is a row under the gems now, which is where the printed sheet
     draws it and for the same reason: the question "can I afford this?"
     is answered by a number that has to be on screen at the same time.
     Pressing it does both halves — the Hope leaves and the card is
     posted — because those are one act, and a sheet that did the first
     and left you to describe the second is a sheet that made you do the
     bookkeeping and then the talking.

     The class Item rather than a derived copy, so the card the press
     posts is built from the same document the row was read off. */
  const classItem = $derived(snap.of("class")[0] ?? null);

  /* The rule is on the row rather than behind a hover. Every other card on
     this sheet is a spine you go and look up, which is right for a thing you
     own — this is a thing you *do*, mid-turn, while somebody is waiting, and
     "can I afford it" and "what does it actually say" are one question asked
     once. `rich` is the cards' own renderer, so the sentence reads here
     exactly as it reads on the card the press posts. */
  const hopeAction = $derived.by(() => {
    const f = classItem?.system?.hopeFeature;
    if (!f?.name && !f?.description) return null;
    const text = plain(f.description);
    return { name: f.name || "Hope Feature", cost: hopeCost(f), text: text ? rich(text) : "" };
  });

  /* ── the feature list ──────────────────────────────────────────────
     What a class *is*, and it stopped being a card to say it.

     Class and subclass were two spines in a "Class" panel — objects you
     hovered to read. That is right for a domain card, which really is a
     card: you hold five, you swap them, the object is the unit. A class is
     not that. You do not spend it or move it; you have it, permanently, and
     the only question anyone asks of it is what its feature says. That was
     two gestures away and the answer arrived wrapped in 300px of frame,
     artwork and a stat block you already know.

     So the run comes out of the card and onto the sheet: one row per
     feature, the rule printed on it. Same argument that moved the Hope
     action to the rail, applied to the other half of the same card — and
     the same shape, because a rule you have to reveal is a rule you will
     not read.

     Two sources, one list: the class's own features, and standalone
     `feature` Items, which had no card at all and were therefore invisible —
     a subtype the "+ new" menu offered and nothing ever drew again.

     **Subclass features are not in it, and that is the point of the second
     column.** They were, briefly, and it read as the sheet saying the same
     thing twice: the Beastbound tile sat six inches to the right of a row
     headed "Foundation · Beastbound" carrying the rule that tile is *for*.
     The argument that took the class out of a card does not reach a
     subclass — a subclass genuinely is a printed object you acquire one
     card at a time — so the object stays, and the object is where its rules
     are read. Hover peeks it, click posts it, exactly as a domain card in
     the loadout behaves, and for the same reason.

     Pressing a row posts *that feature*, not its class. See `featureCard`. */

  interface Ability {
    /** The Item it arrived on. The menu, the drag and the delete key on it. */
    pk: string;
    /** Unique per row — an Item can carry several features. */
    key: string;
    /** The type line: which card it came on, and whose. */
    origin: string;
    name: string;
    /** Marked up by the cards' own renderer, so it reads as it will in chat. */
    text: string;
    /** What using it costs, read off the rule. Most cost nothing. */
    price: Price;
    /** That price as a phrase, or nothing when it is free. */
    cost?: string;
    card: CardOptions | null;
    /**
     * The pools this feature counts, resolved against the character.
     *
     * Read by feature *name*, which is why every class feature had to get one
     * of its own — a row headed "Class Features" carrying the Rogue's two
     * rules has nowhere to hang Sneak Attack's counter that is not also
     * Cloaked's. `tools/check-cards.mjs` polices the names; this is the first
     * thing that depends on them being distinct.
     */
    res: LiveResource[];
    /**
     * And the dice it keeps, bound the same way and for the same reason.
     *
     * Two fields rather than one because they are two arrays on the schema
     * and two records at the table — the Guardian's Unstoppable is a
     * once-per-long-rest use *and* a die that climbs, and a row that merged
     * them would be claiming the use and the die are one fact.
     */
    dice: LiveDicePool[];
  }

  const abilities = $derived.by(() => {
    const out: Ability[] = [];

    const add = (
      it: ItemSnapshot,
      f: any,
      o: {
        slot: string;
        origin: string;
        type: string;
        foot?: string;
        domains?: any;
        className?: string;
        system?: any;
        card?: CardOptions | null;
        /** Which feature block on the Item owns the pools. "" is the Item's own. */
        bind?: string;
      },
    ) => {
      if (!f?.name && !f?.description) return;
      const text = plain(f.description);
      const price = featurePrice(f, o.system);
      out.push({
        pk: it.id,
        key: `${it.id}:${o.slot}`,
        origin: o.origin,
        name: f.name || "Feature",
        text: text ? rich(text) : "",
        price,
        cost: priceLabel(price),
        res: resourcesFor(it, o.bind ?? f.name ?? "", doc),
        /* Bound the same way, because a class carries several features and
           only one of them keeps the dice — the Seraph's Prayer Dice sit on
           Prayer Dice and not on Life Support. `liveDicePools` is the whole
           document's and is right for a spine or a tile, which stand for the
           document; a row here stands for one feature block. */
        dice: dicePoolsFor(it, o.bind ?? f.name ?? "", doc),
        card:
          o.card !== undefined
            ? o.card
            : featureCard(sigils, {
                item: it,
                feature: f,
                slot: o.slot,
                type: o.type,
                foot: o.foot,
                domains: o.domains,
                className: o.className,
              }),
      });
    };

    /* Several, on five of the nine classes. They used to arrive joined into
       one block under the book's section heading, which was fine on a card
       and wrong the moment the card became a list — see `classFeatures` in
       data/items.ts for the whole argument. */
    for (const c of snap.of("class")) {
      (c.system?.classFeatures ?? []).forEach((f: any, i: number) =>
        add(c, f, {
          slot: `class${i}`,
          origin: `Class · ${c.name}`,
          type: "CLASS FEATURE",
          foot: c.name,
          domains: c.system?.domains,
          className: c.name,
        }),
      );
    }

    /* A whole Item rather than a block on one, so it has its own card with
       its own costs and uses — `opt` builds it, exactly as for a weapon. */
    for (const f of snap.of("feature")) {
      add(
        f,
        { name: f.name, description: f.system?.description },
        {
          slot: "self",
          origin: f.system?.origin || (FEATURE_KIND_LABELS[f.system?.kind] ?? "Feature"),
          type: (FEATURE_KIND_LABELS[f.system?.kind] ?? "Feature").toUpperCase(),
          system: f.system,
          card: opt(f),
          /* A whole Item, so its pools are the document's own and carry no
             feature name — there is one feature here and it is the Item. */
          bind: "",
        },
      );
    }

    return out;
  });

  /* The one fact the class card carried that has nowhere else on this sheet
     to live. Every class, not just the first — multiclassing hands you a
     third domain and the sheet should say which. */
  const domainChips = $derived(
    ((sys.domainList ?? []) as string[]).map((d) => ({ d, def: domainDef(d) })),
  );

  /* The pool is what cannot pay, so the pool is what flinches — the same
     refusal the Stress track gives a recall it cannot afford, and no
     dialog, because the number saying no is already on screen. */
  function refusePool() {
    const el = winEl?.querySelector(".rail .pool");
    if (!el) return;
    el.classList.remove("deny");
    void (el as HTMLElement).offsetWidth;
    el.classList.add("deny");
    setTimeout(() => el.classList.remove("deny"), 600);
  }

  async function useHopeAction() {
    if (!ed || !classItem || !hopeAction) return;
    const card = hopeCard(classItem, sigils);
    if (card) {
      await postCard(card, doc, {
        price: { hope: hopeAction.cost, stress: 0, fear: 0, armor: 0 },
      });
    }
  }

  /* ── using a feature that costs something ─────────────────────────
     The Hope action used to charge immediately from the rail, and it was the
     only one automated. Every other feature on this sheet that opens
     "Spend a Hope" or "Mark a Stress" printed the price, posted the card,
     and left the paying to you — which is the half that gets forgotten,
     three hours later, when somebody notices the Stress track has not moved
     all session.

     The posted card now carries the payment. That gives the table one visible
     place to confirm the move, and the message's claim flag makes the button
     durable across clients and reloads. Mixed self-costs are checked and
     written together, so a feature costing Hope and Stress cannot take one
     and then fail the other. */
  async function useAbility(a: Ability) {
    if (!ed) return;
    if (a.card) {
      await postCard(a.card, doc, {
        price: isFree(a.price) ? undefined : a.price,
        resourceIndexes: a.res.map((r) => r.i),
        damageRoll: /\bdamage roll\b/i.test(a.text),
      });
    }
  }

  /* ── the trait cell, in two states ─────────────────────────────────
     Six numbers this game is played with, and until now there was nowhere
     on this sheet to set any of them: the cell rolled and did nothing else,
     so a character's traits were written by editing the actor somewhere
     else entirely. They are the definition case in its purest form — chosen
     at creation, moved perhaps twice in a campaign, and consulted forty
     times a session — so they are exactly what the mode is for.

     One element, two behaviours, because a trait cell that changed from a
     button into something else would be the row rebuilding under the
     pointer. In play the press rolls, as it always has. In edit the numeral
     is a field and the press toggles the *mark* — the level-up bookkeeping
     half, which says this trait was raised this tier and is closed until
     the next one, and which had no control of any kind before.

     The mark cannot have a button of its own: the cell already is one, and
     a button inside a button is not markup. So the press the cell already
     had is repointed rather than a second one invented, and the cost is
     that a trait does not roll while you are defining it. That is the right
     side of the trade — nobody rolls Agility in the ten seconds they are
     typing its score, and the roll comes back on the next press of the
     toggle. */
  function onTrait(event: MouseEvent, t: Trait) {
    if (!edit) return void askTrait(event, t);
    // The numeral is its own control; everything else in the cell is the mark.
    if ((event.target as HTMLElement).closest?.("input")) return;
    void setDef(`system.traits.${t}.marked`, !sys.traits?.[t]?.marked);
  }

  /* Unbounded on purpose. The printed spread runs −1 to +2 and every table
     leaves it: a blessing, a homebrew ancestry, a GM saying yes. A sheet
     that refused to hold the number the table agreed on would be a sheet
     the table stopped using for traits. */
  const setTrait = (t: Trait, e: Event) =>
    setDef(
      `system.traits.${t}.value`,
      Math.round(Number((e.currentTarget as HTMLInputElement).value) || 0),
    );

  async function askTrait(event: MouseEvent, trait: Trait, reaction: boolean | "only" = true) {
    const o = await prep(event.currentTarget as Element, {
      kind: reaction === "only" ? "reaction roll" : `${traitLabel(trait).toLowerCase()} roll`,
      label: traitLabel(trait),
      base:
        (doc as any).traitMod(trait) +
        sumTerms(rollModifierTerms(doc, reaction === "only" ? "reactionRoll" : "actionRoll")) +
        (trait === sys.spellcastTrait ? sumTerms(rollModifierTerms(doc, "spellcastRoll")) : 0),
      experiences: xpList,
      purse,
      reaction,
    });
    if (!o) return;
    await rollTrait(doc, trait, {
      advantage: o.advantage,
      experiences: o.experiences,
      extra: o.extra,
      reaction: o.reaction,
      hopeDie: o.hope,
      fearDie: o.fear,
    });
  }

  /* An attack is an action by definition, so the reaction button is not
     offered here — a weapon you swing in response to something is still a
     reaction roll made with the trait, and that is the trait cell's job. */
  async function askAttack(event: MouseEvent, weaponId: string) {
    const weapon = item(weaponId);
    const o = await prep(event.currentTarget as Element, {
      kind: "attack roll",
      label: weapon?.name ?? "Attack",
      base: attackTotal(weapon as any),
      experiences: xpList,
      purse,
      reaction: false,
    });
    if (!o) return;
    await rollAttack(doc, weapon, {
      advantage: o.advantage,
      experiences: o.experiences,
      extra: o.extra,
      hopeDie: o.hope,
      fearDie: o.fear,
    });
  }

  function onCardClick(event: MouseEvent) {
    const t = event.target as HTMLElement;
    // Anything that is its own control keeps its own click. A card row is
    // the background here, not the foreground: the shelve button, the
    // charge pips and the Resting checkbox all sit *on* a row and none of
    // them mean "show everyone this card".
    if (t.closest?.("button, input, label, a, [data-act]")) return;
    const pk = t.closest<HTMLElement>("[data-pk]")?.dataset.pk;
    if (pk) toChat(cardByPk.get(pk) ?? null);
  }

  /* ── the right-click menu ─────────────────────────────────────────
     Everything this sheet does, it does by pressing something you can see,
     and that is the right default — it is also why there was nowhere left
     to put "open this", "copy this" and "this one was a mistake". A card
     row already carries a shelve button, a charge strip and a click that
     posts it to chat. Three more permanent controls per row, to serve
     three actions taken once a session between them, would have cost the
     row far more than the actions are worth.

     So they go on the second button, which is where rare-and-real belongs
     and where every other application in this genre already puts them.

     One handler for every row on every tab, delegated on `data-pk` exactly
     like the click above — a row added later is wired the moment it is
     drawn, and the list is built at the moment the menu opens rather than
     registered at mount, because whether a card can be recalled depends on
     how much Stress is left *now*. */
  type MenuRow = { k: string; run?: () => void; warn?: boolean; off?: string; sep?: true };

  const RECALL_FULL = "The loadout is full — swap on the vault tab.";

  /** Every reason this sheet is read-only, in one sentence. */
  const locked = $derived(ed ? undefined : "This sheet is not yours to change.");

  function rowsFor(it: ItemSnapshot): MenuRow[] {
    const live = item(it.id);
    const card = cardByPk.get(it.id) ?? null;
    const rows: MenuRow[] = [];

    if (card) rows.push({ k: "Show to chat", run: () => toChat(card) });
    rows.push({ k: "Open", run: () => live?.sheet.render(true) });

    /* The one action each kind of thing is actually *for*, restated here so
       the menu is not a worse version of the row it was opened from. A
       domain card moves; a weapon is held or is not; a consumable is spent. */
    if (it.type === "domainCard") {
      rows.push(
        it.system.inLoadout
          ? { k: "Move to vault", off: locked, run: () => shelve(it.id) }
          : {
              k: recallCost(it) ? `Recall · ${recallCost(it)} Stress` : "Recall to loadout",
              off:
                locked ??
                (loadout.length >= loadoutLimit
                  ? RECALL_FULL
                  : !canPay(it)
                    ? `Not enough Stress — this costs ${recallCost(it)}.`
                    : undefined),
              run: () => recall(it.id, null),
            },
      );
    }
    if (it.type === "weapon" || it.type === "armor") {
      const blocked =
        !it.system.equipped &&
        it.type === "weapon" &&
        it.system.slot === "secondary" &&
        twoHanded;
      rows.push({
        k: it.system.equipped
          ? "Unequip"
          : `Equip · ${SLOT_CAP[it.type === "armor" ? "armor" : it.system.slot] ?? ""}`,
        off: locked ?? (blocked ? `${primary?.name} is Two-Handed — no free hand.` : undefined),
        run: () => toggleGear(it.id),
      });
    }
    if (it.type === "consumable") {
      const held = it.system.quantity ?? 0;
      rows.push({
        k: "Spend one",
        off: locked ?? (held > 0 ? undefined : "None left."),
        run: () => live?.update({ "system.quantity": held - 1 }),
      });
    }

    rows.push(
      { sep: true, k: "" },
      { k: "Duplicate", off: locked, run: () => duplicate(it) },
      { k: "Delete", warn: true, off: locked, run: () => remove(it) },
    );
    return rows;
  }

  function onCardMenu(event: MouseEvent) {
    const pk = (event.target as Element | null)?.closest?.<HTMLElement>("[data-pk]")?.dataset.pk;
    const it = pk ? snap.items.find((i) => i.id === pk) : null;
    if (!it) return;
    // A peek is a full card hovering over the rows; the menu is about to
    // open on top of one of them. Two floating objects describing the same
    // row, and the reader has to work out which one they are aiming at.
    closePeeks();
    menu(event, rowsFor(it), it.name);
  }

  const duplicate = (it: ItemSnapshot) => {
    const live = item(it.id);
    if (!live || !ed) return;
    const copy = live.toObject();
    delete copy._id;
    copy.name = game.i18n.format("DAGGERHEART.Copy", { name: copy.name });
    return doc.createEmbeddedDocuments("Item", [copy]);
  };

  /* Asked, not undone. Foundry's own undo is a per-user setting nobody has
     on, and an item is a card somebody spent a level on — the confirmation
     is cheap and the mistake is not. It names the thing, because a dialog
     that says "are you sure?" is asking about whatever you *think* you
     right-clicked. */
  async function remove(it: ItemSnapshot) {
    if (!ed) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("DAGGERHEART.Delete.Title") },
      content: `<p>${foundry.utils.escapeHTML(
        game.i18n.format("DAGGERHEART.Delete.Body", { name: it.name }),
      )}</p>`,
      modal: true,
    });
    if (ok) await doc.deleteEmbeddedDocuments("Item", [it.id]);
  }

  /* ── taking a thing out of the sheet ──────────────────────────────
     Foundry moves documents by dragging them, and until now every row here
     was a dead end: you could drop a card in and never get it back out to
     another character, to a compendium, or onto the hotbar.

     Stamped after each render rather than written onto eight `{#each}`
     bodies, for the same reason the click and the menu are delegated. The
     swap tab's rows are excluded, and they are the exception that proves
     the rule: they set `draggable` in their own markup, because they carry
     four handlers of their own for the reorder. `onDragStart` above is
     delegated on the window root, so it still runs for them and still
     writes the Foundry payload — a vault card can leave for another
     character exactly like any other row. */
  $effect(() => {
    void peekRows;
    void tab;
    if (!winEl) return;
    for (const el of winEl.querySelectorAll<HTMLElement>("[data-pk]:not([data-swap])")) {
      el.draggable = true;
    }
  });

  /* ── making something from nothing ────────────────────────────────
     Content comes from compendiums and this system ships three packs of
     it, which is why dragging in was the only way in for a long time. But
     a table invents things — a shortbow with a name, a potion the GM made
     up, the rope — and "install a module to write down that you have a
     rope" is not an answer.

     The same menu component, opened on a left-click: the choice being made
     is which of five kinds of thing this is, and five kinds is a list, not
     five buttons. The new item opens its own sheet immediately, because
     nobody creates a blank item in order to look at a blank item. */
  const NEW_TYPES: [string, string][] = [
    ["weapon", "Weapon"],
    ["armor", "Armor"],
    ["consumable", "Consumable"],
    ["loot", "Loot"],
    ["feature", "Feature"],
  ];

  function onNewItem(event: MouseEvent) {
    if (!ed) return;
    menu(
      event,
      NEW_TYPES.map(([type, label]) => ({
        k: label,
        run: async () => {
          const [made] = await doc.createEmbeddedDocuments("Item", [
            { type, name: game.i18n.format("DAGGERHEART.NewItem", { kind: label }) },
          ]);
          made?.sheet.render(true);
        },
      })),
      "New",
    );
  }

  function onDragStart(event: DragEvent) {
    const pk = (event.target as Element | null)?.closest?.<HTMLElement>("[data-pk]")?.dataset.pk;
    const live = pk ? item(pk) : null;
    if (!live) return;
    closePeeks();
    event.dataTransfer?.setData(
      "text/plain",
      JSON.stringify({ type: "Item", uuid: live.uuid }),
    );
  }

  /* ── the swap ─────────────────────────────────────────────────────
     The vault tab carries both lists. At 5/5 there is no such thing as
     "add a card" — something leaves — so the gesture takes two picks, and
     the pick that decides it (is this better than the worst one I hold?)
     needs both lists on screen at once.

     `resting` is the whole of resting on this sheet. Rests are run at the
     table, so nothing turns it off but a hand, and that makes it the only
     thing on screen that knows whether a swap is free. It therefore has to
     say which state it is *in* rather than restating the rule: "free while
     resting" is true in both positions and so answers nothing. It defaults
     to false, because the priced state is the normal state of play — a
     sheet that defaulted the other way would hand out free swaps in the
     middle of a fight and never say so. */
  let armed = $state<string | null>(null);
  let resting = $state(false);

  const armedCard = $derived(vault.find((c) => c.id === armed) ?? null);

  const recallCost = (c: ItemSnapshot | null) => (resting ? 0 : (c?.system.recallCost ?? 0));
  const canPay = (c: ItemSnapshot | null) => {
    const cost = recallCost(c);
    return (
      cost === 0 ||
      (sys.resources?.stress?.marked ?? 0) + cost <= (sys.resources?.stress?.max ?? 6)
    );
  };
  const stressLeft = $derived(
    (sys.resources?.stress?.max ?? 6) - (sys.resources?.stress?.marked ?? 0),
  );

  /* The refusal is the Stress track saying no, not a dialog. It is the thing
     that cannot pay, so it is the thing that should flinch. */
  function refuse() {
    const mk = winEl?.querySelector(".mk.stress");
    if (!mk) return;
    mk.classList.remove("deny");
    void (mk as HTMLElement).offsetWidth;
    mk.classList.add("deny");
    setTimeout(() => mk.classList.remove("deny"), 600);
  }

  /**
   * Move a card out of the vault, optionally trading a loadout card for it.
   * Putting one back is the same act with no price and no second pick.
   *
   * Both are one line, because both commit through `place()` — the same call
   * the drag lands on. That is the design system's own rule about this
   * gesture and it had never been kept here: a swap made by pressing and a
   * swap made by dragging must produce the same write, the same order and
   * the same animation, or there are two of everything to keep in step.
   * Pressing used to leave the card wherever its `sort` already put it,
   * which is how a recall arrived at the *top* of a loadout it had never
   * been in.
   */
  const recall = (vaultId: string, loadoutId: string | null) =>
    place(vaultId, "loadout", loadoutId, false);

  const shelve = (id: string) => place(id, "vault", null, false);

  const loadoutFull = $derived(loadout.length >= loadoutLimit);

  /* Pressing recall used to arm the card and then wait to be told which
     loadout row it replaced. That is exactly right at 5/5, where something
     genuinely has to leave and choosing it *is* the decision — and it is
     pure ceremony below the limit, where there is a hole and the answer is
     obvious. So the second question is only asked when there is a second
     question: under the limit the card goes in, and the button says so by
     reading "recall" rather than "swap". */
  function quickRecall(id: string) {
    if (armed === id) return void (armed = null);
    if (!loadoutFull) return void recall(id, null);
    armed = id;
  }

  /* ── dragging a card around ────────────────────────────────────────
     Three gestures, one handler, because they are three readings of one
     act — *put this card there*. Vault into loadout is a recall and costs
     Stress; loadout into vault is a shelve and costs nothing; either list
     onto itself is a reorder and is free by definition. Three handlers
     would be three places for the payment, the sort and the FLIP to drift
     apart, and the FLIP is the one that would drift silently.

     Order was a fact this sheet had and never wrote. `snap.of()` sorts on
     the document's own `sort` field, and nothing here had ever set it, so
     every list stood in creation order forever — the order a compendium
     happened to be dragged from, months ago. A loadout is five cards you
     reach for under time pressure. The order you keep them in is yours.

     It is written as **one sequence across every domain card**, loadout
     first, rather than one per panel. The two lists are a single collection
     split by `inLoadout`, so numbering them separately would interleave
     their values, and a card crossing between them would land wherever the
     arithmetic put it rather than where you let go of it. */
  type Zone = "loadout" | "vault";

  let dragId = $state<string | null>(null);
  /** The row the pointer is over, and which of its two gutters is the mark. */
  let overId = $state<string | null>(null);
  let overAfter = $state(false);
  /** Set while the pointer is inside a panel, for a drop that names no row. */
  let overZone = $state<Zone | null>(null);

  function dragCard(event: DragEvent, id: string) {
    if (!ed) return event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    /* One tick late, and that tick is the whole reason. `.lift` hides the
       row and leaves a hatch in its place, and the browser snapshots the
       drag image at the end of *this* dispatch — set the flag now and the
       picture it takes is of the row we have just hidden, so you drag
       nothing across the screen.
       A timeout rather than `requestAnimationFrame`, which is the obvious
       reach and is wrong: rAF does not fire in a tab that is not painting,
       and it is throttled in one that is painting slowly. The state this
       schedules is not about a frame, it is about being after the snapshot,
       and a macrotask is after the snapshot unconditionally. */
    setTimeout(() => (dragId = id), 0);
    /* The root's own `dragstart` still runs after this one and writes the
       Foundry payload, so a card dragged off the sheet entirely still goes
       to another character or the hotbar. These rows had been excluded from
       that on the grounds that they "already drag on pointer events" — see
       the note on `bindDrag`, which was describing the study page. */
  }

  /* `dragId` is the guard on every one of these, and it is doing real work:
     a drag from another sheet has no id of ours, so we decline the event
     entirely — no `preventDefault`, no drop target — and it bubbles to the
     window root, where `handleActorDrop` has always taken it. */
  function dragOver(event: DragEvent, zone: Zone, id: string | null) {
    if (!dragId) return;
    event.preventDefault();
    event.stopPropagation();
    overZone = zone;
    if (!id || id === dragId) return void (overId = null);
    const r = (event.currentTarget as HTMLElement).getBoundingClientRect();
    overId = id;
    // Which half of the row, not which half of the list: the grid runs two
    // up, so left/right is the direction the order actually goes in.
    overAfter = event.clientX > r.left + r.width / 2;
  }

  function endDrag() {
    dragId = null;
    overId = null;
    overZone = null;
  }

  function dropCard(event: DragEvent, to: Zone, onId: string | null) {
    if (!dragId) return;
    event.preventDefault();
    event.stopPropagation();
    const id = dragId;
    const target = onId && onId !== id ? onId : null;
    const after = target ? overAfter : false;
    endDrag();
    return place(id, to, target, after);
  }

  /**
   * Commit a drop: the whole order of every domain card, plus whatever
   * `inLoadout` and Stress the crossing costs, in one write.
   */
  async function place(id: string, to: Zone, target: string | null, after: boolean) {
    if (!ed) return;
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    const from: Zone = card.system.inLoadout ? "loadout" : "vault";

    /* Coming into a full loadout, something has to leave, and the only card
       that can name itself is the one you dropped on top of. Landing in the
       gutter at 5/5 therefore does nothing at all, rather than evicting
       whichever card the arithmetic reached first — that is the swap's
       decision and it is not a drop's to make. */
    let traded: string | null = null;
    if (from === "vault" && to === "loadout") {
      if (!canPay(card)) return refuse();
      if (loadoutFull) {
        if (!target || !loadout.some((c) => c.id === target)) return;
        traded = target;
      }
    }

    const l = loadout.map((c) => c.id).filter((x) => x !== id && x !== traded);
    const v = vault.map((c) => c.id).filter((x) => x !== id);
    /* The traded card goes to the head of the vault, not its tail. It is the
       thing you just made a decision about; burying it under twenty cards
       you did not touch is the sheet hiding its own answer. */
    if (traded) v.unshift(traded);

    const dest = to === "loadout" ? l : v;
    let at = dest.length;
    if (traded) at = loadout.findIndex((c) => c.id === traded);
    else if (target) {
      const i = dest.indexOf(target);
      if (i >= 0) at = after ? i + 1 : i;
    } else if (from !== to && to === "vault") {
      /* Anything leaving the loadout surfaces at the top of the vault. It is
         the card you have just made a decision about, and the commonest next
         thought is that you would like it back; twentieth of twenty-two is
         the sheet filing its own answer where you have to go looking for it.
         A card being reordered *within* the vault still goes where you put
         it — end of the list if you aimed at no gap, because there you did
         mean the end. */
      at = 0;
    }
    dest.splice(Math.max(0, at), 0, id);

    /* Only what moved. A card dropped back where it started writes nothing,
       which is what makes it a true no-op — no update, no re-render, and so
       no travel either. */
    const order = [...l, ...v];
    const updates = order.flatMap((x, i) => {
      const cur = cards.find((c) => c.id === x);
      const wants = i < l.length;
      const u: any = {};
      if (cur?.sort !== (i + 1) * 100) u.sort = (i + 1) * 100;
      if (!!cur?.system.inLoadout !== wants) u["system.inLoadout"] = wants;
      return Object.keys(u).length ? [{ _id: x, ...u }] : [];
    });
    if (!updates.length) return;

    const cost = from === "vault" && to === "loadout" ? recallCost(card) : 0;
    // A reorder travels and says nothing: it is a move, and the recall's
    // sweep and brackets mean "this card is in your hand now".
    travels(id, from === to ? null : to === "loadout" ? "recall" : "shelve");
    await doc.updateEmbeddedDocuments("Item", updates);
    if (cost) {
      await doc.update({
        "system.resources.stress.marked": (sys.resources?.stress?.marked ?? 0) + cost,
      });
    }
    armed = null;
  }

  /* Equipping is the same journey on a different tab — the item genuinely
     leaves the Carried grid and arrives in its slot — so it travels the
     same way. It does *not* wear a recall's arrival: the sweep and the
     brackets are the sheet saying "this card is in your hand now", and a
     breastplate has not joined a loadout. Hence `mode: null`, which
     `flip()` reads as travel and nothing more. */
  function toggleGear(id: string) {
    if (!ed) return;
    travels(id, null);
    return item(id)?.toggleEquipped();
  }

  /* There was an archive-box mark here, on a tab down each vault row's right
     edge — never a padlock, because a vaulted card is available and simply
     not in hand. What killed it was where the tab landed: `.spine .rc` is
     top-right, so it sat exactly on the recall chip, and the recall cost is
     the one number this panel exists to help you weigh. A vault row is
     desaturated and its artwork takes a hatch instead; see
     `.pk.vl .spine .thumb::after` in `design/sheet.css`. */

  /* ── advancement ──────────────────────────────────────────────────
     Stored as `advancement[tier][option] = count`, so the rules table in
     `config.ts` can grow a row without a migration.

     Nested rather than a flat `"2.0"` key on purpose: Foundry reads a dot in
     an update key as a *path*, so `"system.advancement.2.0"` would write the
     nested shape whatever the reader expected. Two levels is what the writer
     actually produces, so it is what the reader asks for.

     Clicking a slot marks *up to* it, and clicking the last marked one
     clears it — the same gesture as every other row of boxes on this sheet,
     which is why there is no second convention to learn. */
  const taken = (tier: number, option: number): number =>
    Number(sys.advancement?.[tier]?.[option] ?? 0);

  /* ── the budget ────────────────────────────────────────────────────
     What this level owes you, against what is marked. The boxes have
     always said what was *taken*; nothing said what was *due*, so the one
     question anyone opens this tab to ask — am I caught up? — was the one
     it could not answer, and the arithmetic (two per level since the
     second, spent within the tier that level falls in) is exactly the kind
     nobody does at the table.

     Counted in choices rather than in boxes, and those are different
     numbers: the two options in the heavy frame cost both of the level's
     picks for one mark. See `choicesSpent` in config.ts. */
  const budgets = $derived(
    ADVANCEMENT.map((t) => ({
      tier: t,
      due: choicesDue(sys.level, t),
      spent: choicesSpent(sys.advancement?.[t.tier] ?? {}, t),
    })),
  );

  const choiceTotal = $derived({
    due: budgets.reduce((n, b) => n + b.due, 0),
    spent: budgets.reduce((n, b) => n + b.spent, 0),
  });

  /** The budget line's sentence. Level is the quiet case; it says nothing. */
  const budgetNote = (due: number, spent: number): string =>
    spent < due
      ? `${due - spent} still to choose`
      : spent > due
        ? `${spent - due} more than this level grants`
        : "up to date";

  /* The whole row of boxes as one string, rather than an `{#each}` of
     `{@html}`. Svelte plants a comment anchor before every block it can
     update independently, and a flex container full of those anchors sizes
     to nothing under `max-content` — `.slots` then took the whole row and
     squeezed the label to zero width. One `{@html}` produces exactly the
     markup the design emits, and `.adv .slots > i` sizes it. */
  const boxes = (n: number, on: number): string =>
    Array.from({ length: n }, (_, i) => XBOX(i < on)).join("");

  /* Marking a box *does* the advancement.
   *
   * It used to write the box and stop, so the panel was an honest ledger of
   * things that had not happened: "permanently gain one Stress slot" marked,
   * and the Stress track eighteen inches away still six boxes long. Every one
   * of those had to be carried across by hand, which is the arithmetic this
   * whole sheet exists to stop doing.
   *
   * Four of the nine are pure numbers and are not written at all — the model
   * derives them from the marks, so the box *is* the record. The two that
   * need a decision ask for it. The three that are documents you drag in
   * still just mark, because a dialog is not a better compendium.
   *
   * `setAdvancement` writes the count itself, which is why cancelling the
   * picker leaves the box exactly where it was rather than marked and inert.
   */
  function onAdvance(e: MouseEvent, tier: any, option: number, on: number) {
    /* `edit`, not `ed`. Marking a box *is* the advancement — it moves the
       Stress track, the Evasion arch or the Proficiency dots the moment it
       lands — so a stray click here is the most expensive one on the sheet,
       and it is a click on the tab you scroll through looking at what level
       5 offers. */
    if (!edit) return;
    const row = e.currentTarget as HTMLElement;
    const box = (e.target as Element | null)?.closest("i");
    if (!box || box.parentElement !== row) return;
    const n = [...row.children].indexOf(box) + 1;
    void setAdvancement(doc, tier, option, on, n === on ? n - 1 : n);
  }

  /* ── what the card advancement actually took ───────────────────────
     The one option on this tab that hands you a *document*, and therefore
     the one whose mark could be true and useless at the same time: the box
     said you were owed a domain card and nothing on the sheet said which,
     or whether you had ever gone and got it.

     So the row prints its answer. A box with a card behind it names the
     card; a box without one says so and offers the picker, which is both
     the ordinary path — mark it, choose, done — and the only way a
     character who levelled up before any of this existed can catch up. It
     reads the *live* Item rather than the stored name, so a card deleted
     off the gear tab takes its claim back down to unchosen rather than
     leaving the panel asserting a document that has gone.

     Both halves are read off the snapshot rather than off the document —
     `sys` for the record and `cards` for the card — because the snapshot is
     what Svelte tracks. `doc.items.get()` would answer correctly and answer
     once: deleting the card off the gear tab changes no reactive value, so
     the row would go on naming it until something else forced a pass. */
  const cardTaken = (tier: number, option: number, n: number): string | null => {
    const id = (sys.advancementChoices as any)?.[choiceKey(tier, option, n)]?.card?.id;
    return (id && cards.find((c) => c.id === id)?.name) || null;
  };

  function onClaim(tier: any, option: number, n: number) {
    if (!edit) return;
    void claimAdvancement(doc, tier, option, n);
  }

  /* ── the card every level gives ────────────────────────────────────
     Step 4 of the printed level-up, and its own panel rather than rows
     inside a tier's, because it is a fact about a *level* and the tier
     panels are the printed advancement table — one is a rules table this
     system copies and the other is a ledger of what happened to you.

     Only levels the record has seen appear, which is what keeps an old
     character quiet: `levelCardRows` reads the keys rather than counting
     from 2, so a level reached before any of this existed is owed nothing
     and shows nothing. See `applyLevelCards`.

     Read off the snapshot for `cardTaken`'s reason — deleting the card on
     the gear tab has to take its name off this row. */
  const levelCards = $derived.by(() => {
    void sys.levelCards;
    void sys.level;
    return levelCardRows(doc).map((r) => ({
      level: r.level,
      name: (r.card?.id && cards.find((c) => c.id === r.card?.id)?.name) || null,
    }));
  });

  function onClaimLevel(level: number) {
    if (!edit) return;
    void claimLevelCard(doc, level);
  }

  /* Nothing is recorded, because nothing bought it. The advancement box and
     the level card are both settling an account and have somewhere to write
     the answer; this is the drag-in gesture with the compendium's own filter
     applied, and inventing a ledger entry for it would claim a rule that is
     not there. */
  const onAddCard = () => ed && void addDomainCard(doc);

  /* ── writes ───────────────────────────────────────────────────────── */

  const set = (path: string, value: unknown) => ed && doc.update({ [path]: value });

  const setGold = (row: "handfuls" | "bags" | "chests", i: number) => {
    if (!ed) return;
    const cur = sys.gold?.[row] ?? 0;
    doc.update({ [`system.gold.${row}`]: i + 1 === cur ? i : i + 1 });
  };

  const item = (id: string) => doc.items.get(id);

  const sumTerms = (terms: { v: number }[]) => terms.reduce((n, t) => n + t.v, 0);
  const attackTotal = (w: ItemSnapshot) =>
    Number(sys.traits?.[w.system.trait]?.total ?? sys.traits?.[w.system.trait]?.value ?? 0) +
    sumTerms(rollModifierTerms(doc, "actionRoll", item(w.id))) +
    sumTerms(rollModifierTerms(doc, "attackRoll", item(w.id))) +
    sumTerms(weaponModifierTerms(doc, item(w.id), "attack"));
  const damageBonus = (w: ItemSnapshot) =>
    Number(w.system.damage?.bonus ?? 0) +
    sumTerms(rollModifierTerms(doc, "damageRoll", item(w.id))) +
    sumTerms(weaponModifierTerms(doc, item(w.id), "damage"));
  const damageProficiency = () =>
    Number(sys.proficiency ?? 1) + modifierTotal(doc, "damageProficiency");

  /* ── taking a thing *into* the sheet ───────────────────────────────
     One handler on the root, and it always was — every subtype this
     character can hold lands the same way, and inventing four sub-targets
     to look precise would be the interface promising a distinction it does
     not make. What was missing is that it said nothing while you were
     holding something: the sheet lit up no differently for a card it would
     accept than for one it would not, and the only way to find out was to
     let go and go looking.

     Counted rather than flagged, because `dragenter` and `dragleave` fire
     for every element crossed — a single boolean is switched off the moment
     the pointer passes from the rail onto a panel inside it, and the sheet
     strobes all the way across. The counter goes up on enter and down on
     leave, so it is only zero when the pointer has genuinely left.

     Our own rows are excluded. They are draggable so a card can leave for
     another character, and a drop back onto the sheet it came from is a
     no-op — lighting up for it would advertise a move that does nothing. */
  let dropDepth = $state(0);
  let selfDrag = $state(false);
  const dropping = $derived(ed && dropDepth > 0 && !selfDrag);

  async function onDrop(event: DragEvent) {
    event.preventDefault();
    dropDepth = 0;
    if (!ed) return;
    await handleActorDrop(doc, event);
  }

  /* ── making something from nothing, in the inventory ───────────────
     The two subtypes that land in the plain list, offered from the list's
     own heading. The Equipped panel above already offers all five, and
     that is the right menu *there* — but the rope was unreachable from the
     panel the rope lives in, and the panel only existed once something was
     already in it. */
  function onNewInventory(event: MouseEvent) {
    if (!ed) return;
    const KINDS: [string, string][] = [
      ["loot", "Item"],
      ["consumable", "Consumable"],
    ];
    menu(
      event,
      KINDS.map(([type, label]) => ({
        k: label,
        run: async () => {
          const [made] = await doc.createEmbeddedDocuments("Item", [
            { type, name: game.i18n.format("DAGGERHEART.NewItem", { kind: label }) },
          ]);
          made?.sheet.render(true);
        },
      })),
      "Add",
    );
  }

  /* ── the dials ─────────────────────────────────────────────────────
     Everything on the adjust tab is a number some rule normally derives,
     and the tab exists because a table invents exceptions faster than a
     schema can name them. A GM who cannot set a number directly sets it
     indirectly — by lying to the sheet about the armour — and then the
     sheet is wrong about two things instead of one.

     `num` is the whole write path: read the field, clamp to an integer,
     write. Every field on the tab is an integer and there is no reason for
     eleven copies of `+(e.currentTarget as HTMLInputElement).value`.

     Every one of them is definition, so every one of them goes through
     `setDef` and the whole tab is inert outside edit mode. That is two
     gates on one surface and they are asking two different things: `isGM`
     is who may adjudicate, `edit` is whether this sheet is being authored
     right now. A GM who is playing their own character is exactly the case
     where one is true and the other should not be. */
  const num = (path: string, e: Event, min = -99) => {
    const v = Math.round(Number((e.currentTarget as HTMLInputElement).value) || 0);
    setDef(path, Math.max(min, v));
  };

  /* A derived field is one the sheet is about to overwrite, and saying so
     is the difference between a control that does nothing and a control
     that explains why. Armor Slots follow total Armor Score, both thresholds
     normally come off equipped armour, and the spellcast trait comes off a
     casting subclass. */
  const derivedNote = $derived({
    slots: "Armor Slots equal total Armor Score, including shields, cards and other bonuses.",
    thresholds: sys.thresholds?.override
      ? ""
      : "Derived from armour plus your level. Switch on Override to set them.",
    cast: sys.spellcastTrait && snap.of("subclass").some((s) => s.system.spellcastTrait)
      ? "Set by your subclass."
      : "",
  });

  /* ── experiences and scars ─────────────────────────────────────────
     The two lists on a character that are free text plus a number, and
     both were unreachable: an Experience could be brought into a roll and
     never written down, and a scar cost a Hope slot with no way to record
     what left it.

     Written whole rather than by path. `system.experiences` is an
     ArrayField, and Foundry treats a dotted index in an update key as a
     path into an *object* — so `"system.experiences.0.name"` writes a
     shape the reader does not expect. The array is small and rewriting it
     is one update either way.

     `edit` and not `ed`, and the removal is gated with the rest of it —
     which is the one place this mode disagrees with "deleting anything is
     always allowed". That rule is about *items*: a weapon you loot mid-
     session is a deliberate two-step gesture on a document, and making a
     player unlock the sheet to record it would be the mode getting in the
     way of play. An Experience is not a document. It is a field of the
     character, next to five other fields, removed by a 24px × in a list you
     are scrolling — the exact shape of the accident this mode exists to
     prevent. */
  const writeList = (key: "experiences" | "scars", rows: any[]) =>
    edit && doc.update({ [`system.${key}`]: rows });

  const listRows = (key: "experiences" | "scars"): any[] =>
    foundry.utils.deepClone(sys[key] ?? []);

  const addExperience = () =>
    writeList("experiences", [...listRows("experiences"), { name: "", modifier: 2, marked: false }]);
  const addScar = () => writeList("scars", [...listRows("scars"), { name: "", description: "" }]);

  const dropRow = (key: "experiences" | "scars", i: number) => {
    const rows = listRows(key);
    rows.splice(i, 1);
    writeList(key, rows);
  };

  const editRow = (key: "experiences" | "scars", i: number, field: string, value: unknown) => {
    const rows = listRows(key);
    if (!rows[i]) return;
    rows[i] = { ...rows[i], [field]: value };
    writeList(key, rows);
  };
</script>

<!-- Counters on a card that has any, put into the row the builder already
     drew. One snippet for every spine and tile on the sheet, because they are
     the same claim in five places — a loadout card, a vault card, an
     ancestry, a piece of loot, a subclass tile — and a pool that looked
     different in the vault from the way it looks in the loadout would read as
     a different pool. `slot` is what the caller varies, and it varies because
     a spine's slack is on its meta line and a tile's is on its footer. -->
{#snippet pools(it: ItemSnapshot, slot: string)}
  {#each liveResources(it, doc) as p (p.i)}
    <Chits
      value={p.res.value}
      max={p.max}
      name={(p.res.name || "tokens").toLowerCase()}
      key="{it.id}:{p.i}"
      dom={hasDomainHue(it.type)}
      add={ed}
      {slot}
      rev={snap.rev}
    />
  {/each}
  <!-- Kept dice go in the same slot and after the counters, so a card that
       carries both — the Guardian's Unstoppable is a once-per-long-rest use
       *and* a die that climbs — reads as a use it spent and a die it is
       holding, in that order. Two arrays rather than one is the schema
       saying they are two records; drawing them in one tray would be the
       sheet arguing with it. -->
  {#each liveDicePools(it, doc) as p (p.i)}
    <Keep
      mode={p.pool.mode}
      faces={p.pool.faces}
      dice={p.pool.dice}
      max={p.max}
      name={(p.pool.name || "dice").toLowerCase()}
      key="{it.id}:{p.i}"
      dom={hasDomainHue(it.type)}
      add={ed}
      roll={p.pool.onRefresh !== "reroll"}
      {slot}
      rev={snap.rev}
    />
  {/each}
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="win"
  class:dropping
  class:editing={edit}
  class:dragging={!!dragId}
  style="--w:100%"
  bind:this={winEl}
  ondrop={onDrop}
  ondragover={(e) => e.preventDefault()}
  ondragenter={() => dropDepth++}
  ondragleave={() => (dropDepth = Math.max(0, dropDepth - 1))}
  ondragstart={(e) => {
    selfDrag = true;
    onDragStart(e);
  }}
  ondragend={() => {
    selfDrag = false;
    dropDepth = 0;
    /* Belt and braces on the row's own handler. A drag that ends outside
       the window — dropped on another sheet, or cancelled with Escape —
       still fires `dragend` on its source, but a row destroyed by a
       re-render mid-drag would never see it, and the caret would be left
       lit on a list nothing is being dragged over. */
    endDrag();
  }}
  oncontextmenu={onCardMenu}
>
  <!-- The banner. Top and bottom, running until the mode is switched off,
       because the risk this mode carries is forgetting you left it on — a
       locked sheet refuses you and says so, an unlocked one says nothing.
       Motion is what a peripheral eye picks up unaimed.

       It takes height rather than overlaying, and that is the trade. The
       drop edge overlays because a drag lasts a second and a reflow under a
       held pointer makes you re-aim mid-gesture; this lasts as long as you
       are editing. An overlay that persists sits permanently on top of the
       diorama and the gold rows — covering the controls the mode exists to
       unlock, and `pointer-events:none` does not give the pixels back. The
       band costs one reflow, on the frame you pressed the toggle, which is
       a deliberate gesture whose answer is the sheet changing shape; and
       `.bd` is `flex:1 1 auto`, so the 36px comes off the body and the two
       scrollers take it up. Nothing moves sideways.

       `aria-hidden` because the run is repeated a dozen times to fill the
       width; the toggle carries `aria-pressed` and the sentence. -->
  {#if edit}
    <div class="tape" aria-hidden="true"><i><span>{TAPE}</span><span>{TAPE}</span></i></div>
  {/if}
  <div class="bd" style="--h:100%">
    <!-- ══ the rail ══════════════════════════════════════════════════ -->
    <div class="rail">
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="dio {framing ? 'framing' : ''} {framing ? target : ''}"
        style="--pvz:{previewScale}"
        bind:clientWidth={dioW}
        onpointerdown={onFrameDown}
        onwheel={onFrameWheel}
      >
        <div class="img" style="--art:{cssUrl(snap.img)};{frameVars}"></div>
        <div class="scrim"></div>
        <!-- The roll plate's own field, at true proportions, drawn by the
             builder the real card is drawn by. Rendered only while framing
             for it: the rest of the time it is a picture of a card nobody
             asked to see. -->
        {#if framing && target === "plate"}
          <div class="pv">{@html preview}</div>
        {/if}
        <div class="lv">
          <i>Lv</i>
          {#if edit}
            <!-- The plate *is* the field. A level is one of two numbers on
                 this sheet you set by typing rather than by pressing
                 something, and giving it its own labelled box would put a
                 form control in the middle of a picture.

                 Edit mode, not ownership. Level is the single most derived-
                 from number on the sheet — tier, Proficiency, both damage
                 thresholds and what every advancement panel owes you all
                 hang off it — and it sits in the top-right corner of a
                 picture people drag and hover all session. The locked state
                 is the `<b>` below, which the design draws identically on
                 purpose: nothing vanishes, the number simply stops taking a
                 caret. -->
            <input
              class="b"
              type="number"
              min="1"
              max={MAX_LEVEL}
              value={sys.level}
              onchange={(e) => setLevel(+(e.currentTarget as HTMLInputElement).value)}
            />
          {:else}
            <b>{sys.level}</b>
          {/if}
        </div>
        {#if edit}
          <div class="fr">
            <button type="button" class="ctl" onclick={() => pickImage("portrait")}>Image</button>
            <!-- The other picture. A head-and-shoulders crop is the wrong
                 image at 100px seen from above, so Foundry keeps the token's
                 art apart from the actor's and so does this. -->
            <button type="button" class="ctl" onclick={() => pickImage("token")}>Token</button>
            <button type="button" class="ctl {framing ? 'on' : ''}" onclick={() => (framing = !framing)}>
              Frame
            </button>
          </div>
          <div class="fx">
            <span class="seg">
              <button type="button" class="ctl {target === 'sheet' ? 'on' : ''}" onclick={() => (target = "sheet")}>
                Sheet
              </button>
              <button type="button" class="ctl {target === 'plate' ? 'on' : ''}" onclick={() => (target = "plate")}>
                Card
              </button>
            </span>
            <button type="button" class="ctl" onclick={resetFrame}>Reset</button>
            <span class="z">{live.scale.toFixed(2)}×</span>
          </div>
        {/if}
        <!-- The name is the level plate's trick again, and for the same
             reason: the art is the field. A name that grew a bordered box
             and a focus ring when the sheet unlocked would put a form
             control across the middle of the one surface here that is not a
             form — so `b` and `input.b` are drawn as one thing, and the only
             difference between the two states is the caret.

             Pronouns were in the schema and drawn nowhere. They sit under
             the name, and in play mode only when there is something to
             read: an empty line under a name is a field reporting that it
             is empty, which is what a placeholder is for and what edit mode
             is the moment for. -->
        <div class="nm">
          {#if edit}
            <input
              class="b"
              type="text"
              value={snap.name}
              onchange={(e) => edit && doc.update({ name: (e.currentTarget as HTMLInputElement).value })}
            />
            <input
              class="pn"
              type="text"
              placeholder="pronouns"
              value={sys.biography?.pronouns ?? ""}
              onchange={(e) =>
                setDef("system.biography.pronouns", (e.currentTarget as HTMLInputElement).value)}
            />
          {:else}
            <b>{snap.name}</b>
            {#if sys.biography?.pronouns}<span class="pn">{sys.biography.pronouns}</span>{/if}
          {/if}
          <span>{heritage}<br />{className}{subclassName ? " · " : ""}<em>{subclassName}</em></span>
        </div>
      </div>

      <!-- Where you go to make this character, and it does two jobs at two
           different times. On a fresh sheet the most important fact is that
           nothing has been chosen yet, and that should be loud; once creation
           is finished the same control has to go quiet and stay reachable,
           because swapping one domain card three weeks later is the same
           gesture as choosing it.

           It takes height rather than overlaying — edit mode's rule, and the
           same reasoning: a hint that lasts a second may float over the sheet,
           a state that lasts a session may not. And it never disappears, or it
           becomes a control you have to hunt for exactly when you want it. -->
      {#if ed}
        <button
          type="button"
          class="mkp"
          class:done={made.finished}
          title={made.finished
            ? "Open character creation — change anything you chose."
            : "Walk through character creation."}
          onclick={() => openCreation(doc)}
        >
          <span>
            <b>{made.finished ? "Character creation" : "Make this character"}</b>
            <em>{made.hint}</em>
          </span>
          {#if !made.finished}
            <div class="fbar"><u style="width:{made.pct}%"></u></div>
          {/if}
        </button>
      {/if}

      <div class="scr">
        <!-- defence -->
        <div class="sec">
          <div class="dfn">
            <div>
              <button
                class="crest ev"
                type="button"
                title="Evasion"
                onclick={(e) => askTrait(e, "agility", "only")}
              >
                <svg viewBox="0 0 64 66" aria-hidden="true">
                  <path class="gh f" d={ARCH_D} transform="translate(-11.5 0)" />
                  <path class="gh n" d={ARCH_D} transform="translate(-6 0)" />
                  <path class="sil" d={ARCH_D} />
                </svg>
                <span class="v">{sys.evasion?.value ?? 0}</span>
              </button>
              <span class="k">Evasion</span>
            </div>
            <div>
              <!-- The numeral is the Armor *Score*, which a shield raises; the
                   boxes beside it are the armour's Base Score, which it does not. -->
              <div class="crest">
                <svg viewBox="0 0 64 66" aria-hidden="true">
                  <path class="sil" d={SHIELD_D} />
                </svg>
                <span class="v sh">{sys.armorScore?.value ?? 0}</span>
              </div>
              <span class="k">Armor</span>
            </div>
            <!-- "Slots", not "Armor Slots": it sits four pixels from a shield
                 with the word ARMOR under it, and the longer label wrapped its
                 own count onto a second line in the 102px this column has. -->
            <div class="side">
              {#key sys.resources?.armorSlots?.max}
                <Marks
                  kind="armor"
                  label="Slots"
                  total={sys.resources?.armorSlots?.max ?? 0}
                  marked={sys.resources?.armorSlots?.marked ?? 0}
                  editable={ed}
                  onset={(n) => set("system.resources.armorSlots.marked", n)}
                />
              {/key}
            </div>
          </div>
        </div>

        <!-- One section, two tracks. The printed sheet puts Hit Points and
             Stress under a single heading and it is right to: they are the
             same question asked twice, and a divider between them claims
             otherwise while costing 28px of a rail that has none to spare. -->
        <div class="sec">
          {#key `${sys.thresholds?.major}/${sys.thresholds?.severe}/${sys.resources?.hitPoints?.max}/${vitSpan}`}
            <Marks
              kind="hp"
              label="Damage"
              damage={{ major: sys.thresholds?.major ?? 1, severe: sys.thresholds?.severe ?? 2 }}
              total={sys.resources?.hitPoints?.max ?? 6}
              marked={sys.resources?.hitPoints?.marked ?? 0}
              span={vitSpan}
              editable={ed}
              onset={(n) => set("system.resources.hitPoints.marked", n)}
            />
          {/key}
          {#key `${sys.resources?.stress?.max}/${vitSpan}`}
            <Marks
              kind="stress"
              label="Stress"
              total={sys.resources?.stress?.max ?? 6}
              marked={sys.resources?.stress?.marked ?? 0}
              span={vitSpan}
              vuln
              editable={ed}
              onset={(n) => set("system.resources.stress.marked", n)}
            />
          {/key}
          <!-- The three things that happen *to* you, under the two tracks
               they all write to. Everything else in this rail is a record
               you edit; these are events with more than one part, so they
               are the only places in this system that open a dialog. -->
          {#if ed}
            <div class="acts">
              <button
                type="button"
                title="Take damage — the ladder, and whether to mark an Armor Slot"
                onclick={() => takeDamage(doc, 0, { ask: true })}
              >damage</button>
              <button
                type="button"
                title="Short rest — downtime moves, each clearing 1d4 + your Tier"
                onclick={() => rest(doc, "short")}
              >short rest</button>
              <button
                type="button"
                title="Long rest — downtime moves that clear a track outright"
                onclick={() => rest(doc, "long")}
              >long rest</button>
            </div>
          {/if}
        </div>

        <!-- hope -->
        <div class="sec">
          <div class="pool">
            <div class="hd">
              <span class="k">Hope</span>
              <span class="n"
                >{sys.resources?.hope?.value ?? 0}<s> / {sys.resources?.hope?.max ?? 6}</s></span
              >
            </div>
            {#key (sys.scars ?? []).length}
              <Gems
                value={sys.resources?.hope?.value ?? 0}
                max={6}
                scars={(sys.scars ?? []).length}
                size={32}
                gap={10}
                ground="paper"
                editable={ed}
                onset={(n) => set("system.resources.hope.value", n)}
              />
            {/key}
            <!-- The class's Hope feature, under the gems it spends. It is
                 the only *move* on this sheet — everything else here is a
                 record you edit or a roll you make — and it used to be the
                 second feature run on the class card, which meant deciding
                 whether to spend three Hope needed a card you had to hover
                 to see and a number four panels away. Pressing it does both
                 halves: the Hope leaves and the card lands in chat. -->
            {#if hopeAction}
              <button
                type="button"
                class="hact"
                class:no={purse < hopeAction.cost}
                title={purse < hopeAction.cost
                  ? `${hopeAction.name} costs ${hopeAction.cost} Hope — you have ${purse}.`
                  : `Spend ${hopeAction.cost} Hope and show ${hopeAction.name} to the table.`}
                onclick={useHopeAction}
              >
                <span class="hd">
                  <span class="c">
                    {#each Array(hopeAction.cost) as _, i (i)}<i></i>{/each}
                  </span>
                  <b>{hopeAction.name}</b>
                  <s>{hopeAction.cost} Hope</s>
                </span>
                <!-- The rule, on the row. Not a caption under a control —
                     the whole block is the move, which is why it is inside
                     the button and not beside it. -->
                {#if hopeAction.text}<p>{@html hopeAction.text}</p>{/if}
              </button>
            {/if}
          </div>
        </div>

        <!-- experience -->
        <div class="sec">
          <div class="pnl" style="padding:0;border:0">
            <div class="k">Experience</div>
            <div class="xp">
              <!-- Not a button any more. This row used to roll *Instinct*,
                   hardcoded, whatever the Experience was — an Experience is
                   not a trait and does not imply one. It is brought into a
                   roll from the roll popover, alongside the trait you
                   actually meant, which is also the only place the Hope it
                   costs can be taken. The row is here to be read while you
                   decide, which is why it sits six pixels from the Hope. -->
              {#each sys.experiences ?? [] as x, i (i)}
                <div class="r" title="Bring this into a roll from the roll popover.">
                  <b>{x.name || "—"}</b><em>{sign(x.modifier)}</em>
                </div>
              {:else}
                <p class="ach">No Experiences yet.</p>
              {/each}
            </div>
          </div>
        </div>

        <!-- gold. Ten handfuls make a bag, ten bags make a chest, and the
             printed sheet draws all three rows because the conversion is the
             point. Three silhouettes, so each row is identifiable without
             its label. -->
        <div class="sec">
          <div class="pnl" style="padding:0;border:0">
            <div class="k">
              Gold<s>{sys.gold?.bags ?? 0}b · {sys.gold?.handfuls ?? 0}h</s>
            </div>
            <div class="gld">
              <div class="rows">
                {#each [["hf", "Handfuls", "handfuls", 10], ["bg", "Bags", "bags", 10], ["ch", "Chest", "chests", 1]] as [cls, label, key, n]}
                  <div class="ln {cls}">
                    <span class="k">{label}</span>
                    <span class="set">
                      {#each Array(n as number) as _, i}
                        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
                        <i
                          class={i < (sys.gold?.[key as string] ?? 0) ? "on" : ""}
                          onclick={() => setGold(key as any, i)}
                        ></i>
                      {/each}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ the pane ══════════════════════════════════════════════════ -->
    <div class="pane">
      <!-- Above the tab strip and outside the scroller, which is what
           `flex:none` on .trs is for. The traits are the one thing on the
           pane that is true no matter which tab you are on, so they do not
           belong to any of them — and putting the row inside .scr made it
           scroll away and vanish on four tabs out of five. -->
      <div class="trs">
        {#each TRAITS as t}
          <button
            type="button"
            class="tr {sys.traits?.[t]?.marked ? 'on' : ''} {sys.spellcastTrait === t ? 'cast' : ''}"
            title={edit
              ? `Set ${traitLabel(t)}, or press the cell to ${sys.traits?.[t]?.marked ? "clear" : "set"} its tier mark.`
              : sys.spellcastTrait === t
                ? "Spellcast — your subclass casts with this trait"
                : undefined}
            onclick={(e) => onTrait(e, t as Trait)}
          >
            <span class="k">{traitLabel(t)}</span>
            <!-- Same face, same size, same place — the cell does not change
                 shape when the mode comes on, so the row does not jump and
                 the number does not move under the eye reading it. `sign`
                 is display only: a trait is stored as a signed integer and
                 "+2" is not a number a field can be handed back. -->
            {#if edit}
              <input
                class="v"
                type="number"
                value={sys.traits?.[t]?.value ?? 0}
                onchange={(e) => setTrait(t as Trait, e)}
              />
            {:else}
              <span class="v">{sign(sys.traits?.[t]?.total ?? sys.traits?.[t]?.value ?? 0)}</span>
            {/if}
            <i class="mk"></i>
            <!-- No badge element: the spellcast trait is marked by the cell
                 itself — gold top edge, gold name, and a spark in the corner
                 drawn by `.tr.cast::after`. See sheet.css for why it stopped
                 being a line. -->
            <span class="vb">
              {#each TRAIT_VERBS[t] ?? [] as verb}<i>{verb}</i>{/each}
            </span>
          </button>
        {/each}
      </div>

      <div class="tabs">
        <!-- `adjust` last, and only for a GM.
             It used to be shown to anyone who could edit the sheet, on the
             reasoning that ownership is the right to change your own
             character and half of what is on the tab — Experiences most of
             all — is the player's to write. That reasoning was about the
             *fields* and missed what the tab is: every one of them overrides
             a number a rule derives. Evasion off the class, thresholds off
             the armour, Hope max off your scars. A player who can set those
             directly is a player who never has to be told no, and the first
             time it is used to fix something rather than to record a ruling,
             the sheet is quietly wrong in a way nothing on it will ever
             surface. Adjudicating exceptions is the GM's job, so the dials
             are the GM's tab.

             `isGM` and not `ed`: a GM owns every sheet at the table, so this
             is strictly narrower and needs no second condition. -->
        {#each [["main", "loadout"], ["vault", "vault"], ["gear", "gear"], ["advancement", "advancement"], ["bio", "bio"], ...(isGM ? [["adjust", "adjust"]] : [])] as [key, label]}
          <button type="button" class={tab === key ? "on" : ""} onclick={() => (tab = key as any)}>
            {label}
          </button>
        {/each}
        <span class="ct">
          {tab === "vault"
            ? `${vault.length} in vault`
            : tab === "advancement"
              ? `${choiceTotal.spent} / ${choiceTotal.due} chosen`
              : `prof ${sys.proficiency}`}
        </span>
        <!-- At the end of the strip, and not in Foundry's title bar: that bar
             is the *application* — its close button, its drag handle — and
             this is a state of the sheet, one of the two the sheet can be
             in. It belongs where the sheet's other states are chosen.

             After the counter rather than beside the tabs, so it is not read
             as a seventh one. It takes none of a tab's vocabulary — no gold
             top rule, no paper fill — and takes a box instead: the same
             chamfered pip an advancement slot is made of, which is this
             sheet's shape for a state that is either set or not.

             `ed` and not `isGM`. A player levelling their own character is
             the case this exists for. -->
        {#if ed}
          <button
            type="button"
            class="edt"
            class:on={editMode}
            aria-pressed={editMode}
            title={editMode
              ? "Editing — level, traits, the portrait and the numbers the class hands you are unlocked. Press to go back to play."
              : "Play mode — everything you mark, spend and equip is live; the things you set once are locked. Press to edit them."}
            onclick={toggleEdit}
          >
            <i></i>edit
          </button>
        {/if}
      </div>

      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="scr" onclick={onCardClick}>
        {#if tab === "main"}
          <!-- the attack bar: the only control on the sheet. Everything else
               here is a record you edit. This is a button you press, and it
               does the two sums players actually get wrong. -->
          <div class="pnl">
            <div class="k">Attack<s>proficiency {sys.proficiency}</s></div>
            <div class="atk">
              {#each [["primary", "Primary", primary], ["secondary", "Secondary", secondary]] as [key, label, w]}
                {#if w}
                  <div class="wr" data-slot={key}>
                    <span class="sl">{label}</span>
                    <div class="id">
                      <b>{(w as any).name}</b>
                      <span>
                        {traitLabel((w as any).system.trait)} ·
                        {rangeLabel((w as any).system.range)} ·
                        {BURDEN_LABELS[(w as any).system.burden] ?? "One-Handed"}
                        {#if (w as any).system.feature?.name}
                          · <em>{(w as any).system.feature.name}</em>
                        {/if}
                      </span>
                    </div>
                    <button
                      class="go"
                      type="button"
                      title="Attack roll — 2d12 + trait"
                      onclick={(e) => askAttack(e, (w as any).id)}
                    >
                      <span class="dd"><i class="h"></i><i class="f"></i></span>
                      <em>{sign(attackTotal(w as any))}</em>
                      <s>attack</s>
                    </button>
                    <button
                      class="go dm"
                      type="button"
                      title="{damageProficiency()} × {(w as any).system.damage.dice}, including passive item effects"
                      onclick={() => rollWeaponDamage(doc, item((w as any).id))}
                    >
                      <em
                        >{damageProficiency()}{(w as any).system.damage.dice}{damageBonus(w as any)
                          ? `${damageBonus(w as any) > 0 ? "+" : "−"}${Math.abs(damageBonus(w as any))}`
                          : ""}</em
                      >
                      <s>damage</s>
                    </button>
                  </div>
                {:else}
                  <div class="wr off">
                    <span class="sl">{label}</span>
                    <div class="id">
                      <b>{key === "secondary" && twoHanded ? "Unavailable" : "Empty"}</b>
                      <span>
                        {key === "secondary" && twoHanded
                          ? "Two-Handed primary, no free hand"
                          : "nothing equipped"}
                      </span>
                    </div>
                  </div>
                {/if}
              {/each}
              <div class="rd"></div>
            </div>
          </div>

          <!-- The domain loadout. Empty slots show here too: under five you
               are carrying less than the rules allow, and the main tab is
               where you would notice — the fix is one tab away and the slot
               is what says to go there. -->
          <div class="pnl">
            <div class="k">Domain loadout<s>{loadout.length} / {loadoutLimit}</s></div>
            <div class="grid2">
              {#each loadoutCards as r (r.pk)}
                <div class="pk" class:noart={r.card.noart} data-pk={r.pk} style={r.card.art}>
                  {@html SPINE(r.card)}
                  {@render pools(r.it, ".spine .meta")}
                </div>
              {/each}
              {#each Array(Math.max(0, loadoutLimit - loadoutCards.length)) as _, i (i)}
                <div class="pk">
                  <div class="mtslot"><b>Empty</b><span>room for one more</span></div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Not cards. A class is the one thing on this sheet you can
               neither hold nor spend nor move, and drawing it as a spine
               promised a card behind it for the only question anybody asks:
               what does my feature say. The rules are on the rows now.

               Still `data-pk`, and still the class Item's — the row acts on
               the feature, the right-click acts on the document that carries
               it, and those are honestly two different objects. -->
          <div class="pnl">
            <div class="k">
              Features<s>
                {sys.level >= 5 ? "specialization available" : "specialization at 5 · mastery at 8"}
              </s>
            </div>
            <div class="abl">
              {#if domainChips.length}
                <div class="dm">
                  {#each domainChips as c (c.d)}
                    <i style="--c:{c.def.light}">{c.def.label}</i>
                  {/each}
                </div>
              {/if}
              <!-- Two columns, and they hold two different *kinds* of thing:
                   loose rules on the left, printed objects on the right.
                   Nothing appears in both. The subclass cards used to sit
                   above the list and their features used to be *in* it, and
                   that second half was the sheet answering one question
                   twice — a row headed "Foundation · Beastbound" carrying
                   the rule the Beastbound tile is for. The tile is the
                   printed thing; it keeps its own rules. -->
              <div class="cols">
                <div class="runs">
                  <!-- The row is a `<div>` and `.ap` is the press. A feature
                       that counts something carries a chit row, a chit is a
                       button, and a button inside a button is not markup a
                       browser keeps — the wall `.fcls`/`.fclsr` hit in the
                       creation window, answered the same way. -->
                  {#each abilities as a (a.key)}
                    <div class="a" class:paid={!!a.cost} data-pk={a.pk}>
                      <button
                        type="button"
                        class="ap"
                        title={a.cost
                          ? `Pay ${a.cost} and show ${a.name} to the table`
                          : `Show ${a.name} to the table`}
                        onclick={() => useAbility(a)}
                      >
                        <span class="hd">
                          <s>{a.origin}</s>
                          {#if a.cost}<em>{a.cost}</em>{/if}
                        </span>
                        <b>{a.name}</b>
                        {#if a.text}<p>{@html a.text}</p>{/if}
                      </button>
                      {#each a.res as r (r.i)}
                        <Chits
                          value={r.res.value}
                          max={r.max}
                          name={(r.res.name || "tokens").toLowerCase()}
                          key="{a.pk}:{r.i}"
                          add={ed}
                        />
                      {/each}
                      <!-- Counters first, then dice, which is the order the
                           `pools` snippet uses on a spine and a tile — a
                           feature carrying both spent a use and is holding a
                           die, and that is the order it happened in. Neither
                           takes a `slot`: this row has slack of its own, so
                           the tray draws in flow under the rule rather than
                           being re-parented into somebody's meta line. -->
                      {#each a.dice as p (p.i)}
                        <Keep
                          mode={p.pool.mode}
                          faces={p.pool.faces}
                          dice={p.pool.dice}
                          max={p.max}
                          name={(p.pool.name || "dice").toLowerCase()}
                          key="{a.pk}:{p.i}"
                          add={ed}
                          roll={p.pool.onRefresh !== "reroll"}
                          rev={snap.rev}
                        />
                      {/each}
                    </div>
                  {:else}
                    <p class="ach">No class yet. Drag one in from the compendium.</p>
                  {/each}
                </div>
                <!-- Tiles, not spines. A subclass has no level and no recall
                     cost, so two of a spine's five cells are empty — and it
                     carries a Spellcast trait, which is a fact no other row
                     on this sheet shows and which a spine has nowhere to
                     put. `text: ""` because TILE otherwise leads with the
                     card's first feature, and this tile is a 68px strip:
                     what fits is a clause and a half, which reads as the
                     whole rule and is not one. Truncating a rule is worse
                     than not showing it, and the full text is one hover
                     away in the peek — the same bargain every card in the
                     loadout makes. -->
                {#if subclassCards.length}
                  <div class="sub">
                    {#each subclassCards as r (r.pk)}
                      <div class="pk" class:noart={r.card.noart} data-pk={r.pk} style={r.card.art}>
                        {@html TILE({ ...r.card, text: "" })}
                        {@render pools(r.it, ".tile .ft")}
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <div class="pnl">
            <div class="k">Heritage<s>{heritage}</s></div>
            <div class="grid2">
              {#each heritageCards as r (r.pk)}
                <div class="pk" class:noart={r.card.noart} data-pk={r.pk} style={r.card.art}>
                  {@html SPINE(r.card)}
                  {@render pools(r.it, ".spine .meta")}
                </div>
              {:else}
                <p class="ach">No ancestry or community yet.</p>
              {/each}
            </div>
          </div>
        {:else if tab === "vault"}
          <!-- The loadout, above the vault it is being compared against.
               With a card armed, every row here is a card you could replace,
               and the heading says so. -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="pnl swap"
            class:armed={!!armedCard}
            class:over={overZone === "loadout" && !overId}
            ondragover={(e) => dragOver(e, "loadout", null)}
            ondrop={(e) => dropCard(e, "loadout", null)}
          >
            <div class="k">
              Loadout<s>
                {loadout.length} / {loadoutLimit}{armedCard ? " · choose one to replace" : ""}
              </s>
            </div>
            <div class="grid2">
              {#each loadoutCards as r (r.pk)}
                <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                <div
                  class="pk"
                  class:noart={r.card.noart}
                  class:lift={dragId === r.pk}
                  class:dz={overId === r.pk}
                  class:dz-a={overId === r.pk && overAfter}
                  class:dz-b={overId === r.pk && !overAfter}
                  data-pk={r.pk}
                  data-fk={r.pk}
                  data-ld={r.pk}
                  data-swap
                  data-drag
                  draggable="true"
                  style={r.card.art}
                  ondragstart={(e) => dragCard(e, r.pk)}
                  ondragend={endDrag}
                  ondragover={(e) => dragOver(e, "loadout", r.pk)}
                  ondrop={(e) => dropCard(e, "loadout", r.pk)}
                  onclick={(e) => {
                    // Only when a swap is in flight. With nothing armed this
                    // row means what it means everywhere else on the sheet,
                    // and the delegated handler above posts it to chat.
                    if (!armedCard) return;
                    e.stopPropagation();
                    recall(armedCard.id, r.pk);
                  }}
                >
                  {@html SPINE(r.card)}
                  {@render pools(r.it, ".spine .meta")}
                  <span class="swp"></span>
                  <button
                    type="button"
                    class="shv"
                    title="Move to the vault"
                    onclick={(e) => {
                      e.stopPropagation();
                      shelve(r.pk);
                    }}>shelve</button
                  >
                </div>
              {/each}
              {#each Array(Math.max(0, loadoutLimit - loadoutCards.length)) as _, i (i)}
                <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                <div
                  class="pk"
                  data-ld=""
                  ondragover={(e) => dragOver(e, "loadout", null)}
                  ondrop={(e) => dropCard(e, "loadout", null)}
                  onclick={() => armedCard && recall(armedCard.id, null)}
                >
                  <div class="mtslot">
                    <b>Empty</b>
                    <span
                      >{armedCard || dragId ? "drop a card here" : "room for one more"}</span
                    >
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- The same spine as the loadout, because it is the same card —
               drawing it as a mini would say "different kind of thing" when
               the truth is "same thing, not in hand". So: identical row,
               desaturated, with a vault tab down its edge. -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="pnl swap vaultp"
            class:armed={!!armedCard}
            class:over={overZone === "vault" && !overId}
            ondragover={(e) => dragOver(e, "vault", null)}
            ondrop={(e) => dropCard(e, "vault", null)}
          >
            <!-- The one place on this tab a card can arrive from outside it.
                 Dragging one in off the compendium has always worked and
                 always asked you to know which of 189 cards you were allowed
                 to take; this is that gesture with the rule already applied.
                 `ed` and not `edit`, the same call the gear tab's "+ new"
                 makes: taking a card is a deliberate act in a way a click on
                 a number is not. -->
            <div class="k">
              Vault<s>{vault.length} stored</s>
              {#if ed}
                <button type="button" class="nw" onclick={onAddCard}>+ card</button>
              {/if}
            </div>

            <div class="swcost" class:on={resting}>
              <label
                class="rst"
                data-act
                title="Set by hand — rests are run at the table. This changes the price of a swap and nothing else."
              >
                <input type="checkbox" bind:checked={resting} disabled={!ed} />
                <u></u><span>Resting</span>
              </label>
              <em>
                {#if armedCard}
                  Recall <b>{armedCard.name}</b>
                {:else if resting}
                  <b>Swaps are free</b> until you switch this off
                {:else}
                  Swaps cost the card’s Recall Cost in Stress
                {/if}
              </em>
              {#if armedCard}
                {@const cost = recallCost(armedCard)}
                {@const ok = canPay(armedCard)}
                <span class="p" class:free={cost === 0} class:no={cost !== 0 && !ok}>
                  {cost === 0 ? "Free" : ok ? `Mark ${cost}` : `Needs ${cost} · ${stressLeft} left`}
                  {#if cost}
                    <span class="pips">{#each Array(cost) as _, i (i)}<i></i>{/each}</span>
                  {/if}
                </span>
              {/if}
            </div>

            <div class="grid2">
              {#each vaultCards as r (r.pk)}
                <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                <div
                  class="pk vl"
                  class:arm={armed === r.pk}
                  class:mute={!!armedCard && armed !== r.pk}
                  class:noart={r.card.noart}
                  class:lift={dragId === r.pk}
                  class:dz={overId === r.pk}
                  class:dz-a={overId === r.pk && overAfter}
                  class:dz-b={overId === r.pk && !overAfter}
                  data-pk={r.pk}
                  data-fk={r.pk}
                  data-swap
                  data-drag
                  draggable="true"
                  style={r.card.art}
                  ondragstart={(e) => dragCard(e, r.pk)}
                  ondragend={endDrag}
                  ondragover={(e) => dragOver(e, "vault", r.pk)}
                  ondrop={(e) => dropCard(e, "vault", r.pk)}
                >
                  {@html SPINE(r.card)}
                  {@render pools(r.it, ".spine .meta")}
                  <span class="swp"></span>
                  <!-- Arming is a control now, not the row. Every other card
                       row on this sheet posts its card to chat when you click
                       it, and a vault row is not a different kind of card —
                       so it takes the loadout's own hover-revealed button in
                       the same corner, saying the opposite word.

                       Two words, though, because it is two gestures. Below
                       the limit it recalls outright; at the limit it arms,
                       and the second pick is the whole decision. -->
                  <button
                    type="button"
                    class="shv"
                    title={armed === r.pk
                      ? "Put it back down"
                      : loadoutFull
                        ? "The loadout is full — pick the card this replaces"
                        : "Bring this card back into the loadout"}
                    onclick={() => quickRecall(r.pk)}
                  >{armed === r.pk ? "cancel" : loadoutFull ? "swap" : "recall"}</button>
                </div>
              {:else}
                <p class="ach">The vault is empty.</p>
              {/each}
            </div>
          </div>
        {:else if tab === "gear"}
          <!-- Three slots, drawn as three slots. An empty one keeps its frame
               and its label, and a *blocked* one says why: the two-handed
               rule is exactly the kind of thing a sheet should enforce
               silently and explain loudly, since the alternative is a table
               argument in session four. -->
          <div class="pnl">
            <div class="k">
              Equipped<s>armor score {sys.armorScore?.value ?? 0}</s>
              {#if ed}
                <button type="button" class="nw" onclick={onNewItem}>+ new</button>
              {/if}
            </div>
            <div class="slots3">
              {#each slots as s (s.key)}
                {@const card = opt(s.it ?? undefined)}
                {#if s.it && card}
                  <div class="slot" data-slot={s.key} data-pk={s.it.id}>
                    <div class="sh">
                      <span>{s.label}</span>
                      <button type="button" onclick={() => toggleGear(s.it!.id)}>
                        unequip
                      </button>
                    </div>
                    <!-- `data-fk` on the tile's own wrapper rather than on
                         the slot, because the slot carries a header the
                         tile does not: the rect that flies has to be the
                         rect of the thing you watched leave. -->
                    <div class:noart={card.noart} data-fk={s.it.id} style={card.art}>
                      {@html TILE(card)}
                      {@render pools(s.it, ".tile .ft")}
                    </div>
                  </div>
                {:else}
                  {@const blocked = s.key === "secondary" && twoHanded}
                  <div class="slot empty" class:blocked data-slot={s.key}>
                    <div class="sh"><span>{s.label}</span></div>
                    <div class="ph">
                      <b>{blocked ? "No free hand" : "Empty"}</b>
                      <span>
                        {blocked
                          ? `${primary?.name} is Two-Handed — no free hand`
                          : "Nothing equipped in this slot."}
                      </span>
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          </div>

          <!-- Everything owned that is not in a slot. A weapon that cannot be
               equipped right now is still listed and still says so — hiding
               it would make the shield look lost rather than shelved. -->
          {#if carried.length}
            <div class="pnl">
              <div class="k">Carried<s>click to show · equip on the strip</s></div>
              <div class="grid2">
                {#each carried as g (g.id)}
                  {@const card = opt(g)}
                  {@const no = g.type === "weapon" && g.system.slot === "secondary" && twoHanded}
                  {#if card}
                    <div
                      class="eqp"
                      class:no
                      class:noart={card.noart}
                      style={card.art}
                      data-pk={g.id}
                      data-fk={g.id}
                      title={no ? `${primary?.name} is Two-Handed — no free hand` : ""}
                    >
                      {@html TILE(card)}
                      {@render pools(g, ".tile .ft")}
                      <!-- The strip was a label over a tile that was itself
                           the button. Now it is the button and the tile is a
                           card like every other card here — which also means
                           the one gesture that changes your equipment is no
                           longer the same gesture as reading it. -->
                      <button
                        type="button"
                        class="act"
                        disabled={no}
                        onclick={() => !no && toggleGear(g.id)}
                      >
                        {no ? "needs a free hand" : `equip · ${SLOT_CAP[g.type === "armor" ? "armor" : g.system.slot]}`}
                      </button>
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}

          <!-- Loot with a rules paragraph earns a card, because a rule you
               cannot see is a rule you will not use. -->
          {#if lootCards.length}
            <div class="pnl">
              <div class="k">
                Loot<s>{lootCards.length} carried · {chargeTotal} charges</s>
              </div>
              <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
              <div class="grid2" onclick={onCharge}>
                {#each lootCards as r (r.pk)}
                  {@const src = lootItems.find((i) => i.id === r.pk)}
                  {@const aside =
                    src?.type === "consumable"
                      ? charges(Math.min(CHARGES, src.system.quantity ?? 0), r.pk)
                      : null}
                  <div class="pk" class:noart={r.card.noart} data-pk={r.pk} style={r.card.art}>
                    {@html SPINE({ ...r.card, aside })}
                    {@render pools(r.it, ".spine .meta")}
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Below the loot, and it is the right way round: these are the
               things that do nothing. The heading says so rather than leaving
               anyone to wonder why the rope is not a card.

               It renders when the sheet is yours even with nothing in it,
               which it did not before — and that was the whole of "there is
               no way to add an inventory item". The panel only existed once
               something was already in it, so the one place a rope belongs
               was invisible until you had already put a rope there by some
               other route. An empty panel with a way to fill it is a state;
               an absent one is a dead end. -->
          {#if inventory.length || ed}
            <div class="pnl">
              <div class="k">
                Inventory<s>no rules, no card</s>
                {#if ed}
                  <button type="button" class="nw" onclick={onNewInventory}>+ add</button>
                {/if}
              </div>
              {#if !inventory.length}
                <!-- The way in, in the sentence that describes the way out.
                     This is the tab's only empty-state now: the panel above
                     draws three labelled slots whether or not they hold
                     anything, so a second paragraph under it saying "nothing
                     carried" was reporting a state the slots already showed. -->
                <p class="ach">
                  The rope, the rations, the lantern. Drag them in from a compendium{#if ed}, or
                    <button type="button" class="nw" onclick={onNewInventory}>make one</button>{/if}.
                </p>
              {/if}
              <div class="xp">
                {#each inventory as g (g.id)}
                  <!-- `data-pk` even though these rows have no card. It is the
                       key the menu, the drag and the peek are all delegated on,
                       and the rope was the one thing on this sheet you could
                       not delete: no card meant no `data-pk` meant no
                       right-click. The peek and the chat post both look their
                       row up by id and quietly do nothing when there is
                       nothing to draw, which is the correct behaviour for a
                       row that is only a name and a count. -->
                  <button
                    type="button"
                    class="r"
                    data-pk={g.id}
                    onclick={() => item(g.id)?.sheet.render(true)}
                  >
                    <b>{g.name}</b>{#if g.system.quantity > 1}<em>×{g.system.quantity}</em>{/if}
                  </button>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Only when the sheet is not yours. Both panels above now carry
               their own way in — "+ new" on Equipped, "+ add" on Inventory —
               so on an editable sheet this was a third paragraph saying
               "empty" under two that had already said it and offered a fix. -->
          {#if !ed && !carried.length && !lootCards.length && !inventory.length && !primary && !secondary && !armor}
            <p class="ach">Nothing carried.</p>
          {/if}
        {:else if tab === "advancement"}
          <!-- Circles, from the printed sheet, and the only circles here
               other than a gold coin — which is fine, because they are also
               the only thing filled in permanently and never cleared. -->
          <div class="pnl adv">
            <div class="k">Proficiency<s>damage dice</s></div>
            <div class="prof">
              <span class="set">
                {#each Array(6) as _, i (i)}
                  <i class={i < sys.proficiency ? "on" : ""}></i>
                {/each}
              </span>
              <span class="n">{sys.proficiency}</span>
            </div>
            <!-- Said, not implied. A row of boxes that quietly stopped
                 answering the pointer would read as a bug in the tab; the
                 sentence is what makes it a state. -->
            {#if ed && !edit}
              <p class="ach">{LOCKED}</p>
            {/if}
            <p class="ach">
              <b>Marking a slot takes the advancement.</b> A Hit Point, a Stress slot, Evasion and
              Proficiency move the moment you mark them and move back when you unmark them; two
              traits, two Experiences and a domain card ask which; a subclass card or a second class
              you drag in yourself. Both damage thresholds rise with your level on their own.
            </p>
            <p class="ach">
              Each level, choose two options with unmarked slots. An option with a heavier frame
              costs both choices. Proficiency is how many damage dice you roll — your
              {#if primary}
                {primary.name} rolls {sys.proficiency}{primary.system.damage.dice}{primary.system
                  .damage.bonus
                  ? `+${primary.system.damage.bonus}`
                  : ""}.
              {:else}
                weapon scales with it.
              {/if}
            </p>
          </div>

          <!-- ══ the card every level gives ═════════════════════════════
               Step 4 of the printed level-up, and *not* the advancement
               option beside it — "choose an **additional** domain card" is
               additional to this one, which the table says out loud and
               nobody had read. Two rules were missing here rather than one.

               Its own panel, because it is a fact about a *level* and the
               tier panels below are the printed advancement table: one is a
               rules table this system copies and the other is a ledger of
               what happened to you.

               Only levels the record has seen appear, so a character who
               levelled up before any of this existed is owed nothing and
               shown nothing until their next level. See `applyLevelCards`. -->
          {#if levelCards.length}
            <div class="pnl adv">
              <div class="k">
                {game.i18n.localize("DAGGERHEART.Advance.LevelCards")}
                <s>{game.i18n.localize("DAGGERHEART.Advance.LevelCardsSub")}</s>
              </div>
              <p class="ach">{game.i18n.localize("DAGGERHEART.Advance.LevelCardsHint")}</p>
              {#each levelCards as r (r.level)}
                <div class="row" class:done={!!r.name}>
                  <span class="lvn">{r.level}</span>
                  <span class="lb">
                    {game.i18n.format("DAGGERHEART.Advance.LevelLabel", { level: r.level })}
                    {#if r.name}
                      <s class="got">{r.name}</s>
                    {:else if edit}
                      <button type="button" class="tk" onclick={() => onClaimLevel(r.level)}>
                        {game.i18n.localize("DAGGERHEART.Advance.Choose")}
                      </button>
                    {:else}
                      <s class="got owed"
                        >{game.i18n.localize("DAGGERHEART.Advance.Unchosen")}</s
                      >
                    {/if}
                  </span>
                </div>
              {/each}
            </div>
          {/if}

          {#each budgets as b (b.tier.tier)}
            {@const t = b.tier}
            {@const open = sys.level >= t.at}
            <div class="pnl adv" class:shut={!open}>
              <div class="k">
                Tier {t.tier}<s>{open ? `levels ${t.levels}` : `from level ${t.at}`}</s>
              </div>
              <p class="ach">{t.achievement}</p>
              <!-- Only once the tier has opened. A tier you have not reached
                   owes you nothing, and "0 of 0" is a sum about a thing that
                   has not started. -->
              {#if open}
                <div class="bal" class:owed={b.spent < b.due} class:over={b.spent > b.due}>
                  <span class="n">{b.spent} / {b.due}</span>
                  <span class="t">choices spent · {budgetNote(b.due, b.spent)}</span>
                </div>
              {/if}
              {#each t.options as o, oi (oi)}
                {@const on = taken(t.tier, oi)}
                <div class="row" class:done={on >= o.slots}>
                  <!-- The boxes are direct children of `.slots`, because that
                       is what `.adv .slots > i` sizes. A wrapper per box to
                       carry its own click handler makes every one of them a
                       grandchild, and they collapse to nothing. So the click
                       is delegated from the row, exactly as the design does. -->
                  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                  <!-- `def`: a mark here *is* the advancement, so the boxes
                       are definition and go inert with the rest of it. They
                       keep their marks and their place — this tab is read
                       far more often than it is written, and half of why
                       anyone opens it is to see what level 5 offers. -->
                  <span
                    class="slots def"
                    class:pair={o.pair}
                    onclick={(e) => open && onAdvance(e, t, oi, on)}
                  >{@html boxes(o.slots, on)}</span>
                  <span class="lb">
                    {o.label}
                    <!-- The only option here that hands over a document, and
                         so the only one whose mark is not the whole record.
                         One line per mark: the card it took, or the press
                         that goes and gets it. -->
                    {#if o.id === "domainCard" && open}
                      {#each Array(on) as _, i (i)}
                        {@const got = cardTaken(t.tier, oi, i + 1)}
                        {#if got}
                          <s class="got">{got}</s>
                        {:else if edit}
                          <button type="button" class="tk" onclick={() => onClaim(t, oi, i + 1)}>
                            {game.i18n.localize("DAGGERHEART.Advance.Choose")}
                          </button>
                        {:else}
                          <s class="got owed"
                            >{game.i18n.localize("DAGGERHEART.Advance.Unchosen")}</s
                          >
                        {/if}
                      {/each}
                    {/if}
                  </span>
                </div>
              {/each}
            </div>
          {/each}
        {:else if tab === "adjust" && isGM}
          <!-- ══ the dials ══════════════════════════════════════════════
               Every number here is one some rule normally derives, and the
               tab exists because a table invents exceptions faster than a
               schema can name them: a blessing that raises Evasion for a
               session, a homebrew armour, a subclass that carries six cards
               instead of five. A GM who cannot set a number directly sets
               it *indirectly* — by lying to the sheet about the armour — and
               then the sheet is wrong about two things instead of one.

               Two gates, and they ask two different questions. `isGM` is who
               may adjudicate: every field here overrides a number a rule
               works out, and a player who can set those directly is a player
               who never has to be told no. `edit` is whether this sheet is
               being *authored* right now — the same gate the level, the
               traits and the portrait are behind, because the accident this
               tab is exposed to is the same one they are: a click that lands
               on a number while you meant to reach the panel below it.

               A GM playing their own character at the table is exactly the
               case where the first is true and the second should not be,
               which is why they are not one condition. -->
          <div class="pnl">
            <div class="k">Adjustments<s>ad hoc, and they stick</s></div>
            <p class="ach">
              These override what the rules would otherwise work out. Nothing here is
              undone by a rest or a level — a value set here stays set until it is set back.
            </p>
            <!-- The whole tab is definition, so one sentence covers it rather
                 than five copies under five panels. -->
            {#if !edit}
              <p class="ach" style="margin-top:9px">{LOCKED}</p>
            {/if}
          </div>

          <div class="pnl">
            <div class="k">Defence</div>
            <div class="cfg def" inert={!edit}>
              <label class="f">
                <span>Evasion base</span>
                <input type="number" value={sys.evasion?.base ?? 10}
                  onchange={(e) => num("system.evasion.base", e, 0)} />
              </label>
              <label class="f">
                <span>Evasion bonus</span>
                <input type="number" value={sys.evasion?.bonus ?? 0}
                  onchange={(e) => num("system.evasion.bonus", e)} />
              </label>
              <label class="f">
                <span>Armor Score bonus</span>
                <input type="number" value={sys.armorScore?.bonus ?? 0}
                  onchange={(e) => num("system.armorScore.bonus", e)} />
              </label>
              <label class="f off" title={derivedNote.slots}>
                <span>Armor Slots</span>
                <input type="number" value={sys.resources?.armorSlots?.max ?? 0} disabled />
              </label>
            </div>
            {#if derivedNote.slots}
              <p class="ach" style="margin-top:9px">{derivedNote.slots}</p>
            {/if}
          </div>

          <div class="pnl">
            <div class="k">Tracks<s>the boxes, not the marks</s></div>
            <div class="cfg def" inert={!edit}>
              <!-- The *base*, now that advancement adds to it. These write the
                   stored number and the model puts the marked slots on top, so
                   a character who bought two Stress slots reads 6 here and
                   eight in the rail — which is the only arrangement where
                   unmarking the advancement can take them away again. -->
              <label class="f" title="Before advancement. Slots bought on the advancement tab are added on top.">
                <span>Hit Points base</span>
                <input type="number" value={sys.resources?.hitPoints?.max ?? 6}
                  onchange={(e) => num("system.resources.hitPoints.max", e, 1)} />
              </label>
              <label class="f" title="Before advancement. Slots bought on the advancement tab are added on top.">
                <span>Stress base</span>
                <input type="number" value={sys.resources?.stress?.max ?? 6}
                  onchange={(e) => num("system.resources.stress.max", e, 1)} />
              </label>
              <label class="f">
                <span>Proficiency bonus</span>
                <input type="number" value={sys.proficiencyBonus ?? 0}
                  onchange={(e) => num("system.proficiencyBonus", e)} />
              </label>
              <label class="f">
                <span>Loadout slots</span>
                <input type="number" value={loadoutLimit}
                  onchange={(e) => num("system.loadoutLimit", e, 0)} />
              </label>
            </div>
            <!-- Hope's maximum is deliberately absent. It is six less your
                 scars and nothing else, and the scars are three panels down
                 — a second control for one number is a second thing to
                 disagree with the first. -->
            <p class="ach" style="margin-top:9px">
              Hope holds {sys.resources?.hope?.max ?? 6} — six, less one for each scar.
            </p>
          </div>

          <div class="pnl">
            <div class="k">Damage thresholds<s>major {sys.thresholds?.major} · severe {sys.thresholds?.severe}</s></div>
            <div class="cfg def" inert={!edit}>
              <label class="f">
                <span>Override</span>
                <span class="sw">
                  <input type="checkbox" checked={!!sys.thresholds?.override}
                    onchange={(e) => setDef("system.thresholds.override", e.currentTarget.checked)} />
                </span>
              </label>
              <label class="f" class:off={!sys.thresholds?.override}>
                <span>Major</span>
                <input type="number" value={sys.thresholds?.major ?? 0}
                  onchange={(e) => num("system.thresholds.major", e, 0)} />
              </label>
              <label class="f" class:off={!sys.thresholds?.override}>
                <span>Severe</span>
                <input type="number" value={sys.thresholds?.severe ?? 0}
                  onchange={(e) => num("system.thresholds.severe", e, 0)} />
              </label>
              <label class="f" class:off={!!sys.thresholds?.override}>
                <span>Major bonus</span>
                <input type="number" value={sys.thresholds?.bonusMajor ?? 0}
                  onchange={(e) => num("system.thresholds.bonusMajor", e)} />
              </label>
              <label class="f" class:off={!!sys.thresholds?.override}>
                <span>Severe bonus</span>
                <input type="number" value={sys.thresholds?.bonusSevere ?? 0}
                  onchange={(e) => num("system.thresholds.bonusSevere", e)} />
              </label>
            </div>
            <!-- Two ways to move a threshold, and the switch decides which
                 one is live. A bonus is added to what the armour and your
                 level work out; an override replaces the sum outright. Both
                 keep their values while the other is in charge, because a
                 field that empties itself when you flip a switch makes the
                 switch feel destructive. -->
            <p class="ach" style="margin-top:9px">
              {sys.thresholds?.override
                ? "Overridden — the armour and your level are being ignored."
                : derivedNote.thresholds}
            </p>
          </div>

          <div class="pnl">
            <div class="k">Experiences<s>brought into a roll from the popover</s></div>
            <div class="lst def" inert={!edit}>
              {#each sys.experiences ?? [] as x, i (i)}
                <div class="r">
                  <input
                    class="t"
                    type="text"
                    placeholder="A phrase — “Grew up on the docks”"
                    value={x.name ?? ""}
                    onchange={(e) => editRow("experiences", i, "name", e.currentTarget.value)}
                  />
                  <input
                    class="n"
                    type="number"
                    value={x.modifier ?? 2}
                    onchange={(e) =>
                      editRow("experiences", i, "modifier", Math.round(Number(e.currentTarget.value) || 0))}
                  />
                  <button type="button" class="x" title="Remove" onclick={() => dropRow("experiences", i)}>×</button>
                </div>
              {/each}
              <button type="button" class="add" onclick={addExperience}>+ experience</button>
            </div>
          </div>

          <div class="pnl">
            <div class="k">Scars<s>{(sys.scars ?? []).length} · one Hope slot each</s></div>
            <div class="lst def" inert={!edit}>
              {#each sys.scars ?? [] as s, i (i)}
                <div class="r">
                  <input
                    class="t"
                    type="text"
                    placeholder="What the death move left behind"
                    value={s.name ?? ""}
                    onchange={(e) => editRow("scars", i, "name", e.currentTarget.value)}
                  />
                  <button type="button" class="x" title="Remove" onclick={() => dropRow("scars", i)}>×</button>
                </div>
              {/each}
              <button type="button" class="add" onclick={addScar}>+ scar</button>
            </div>
            <!-- The count is the mechanical half and the rail already draws
                 it: a scarred socket is a gem you cannot fill. The name is
                 here so the socket means something. -->
            <p class="ach" style="margin-top:9px">
              Each scar permanently costs a Hope slot, and the rail draws it as a socket
              you cannot fill.
            </p>
          </div>
        {:else}
          <!-- All three are written, not derived, so all three are editors.
               They were read-only panels, which meant the only way to fill in
               a character's own history was the item-sheet-shaped hole of
               editing the actor somewhere else.

               `{#key}` on the item id: the editor is built once and then owns
               its own DOM, so switching to a different actor has to build a
               different editor rather than hand the old one new text. -->
          {#key doc.id}
            {#each BIO_FIELDS as f (f.key)}
              <div class="pnl">
                <div class="k">{f.label}<s>{f.note}</s></div>
                <Prose
                  {doc}
                  path="system.biography.{f.key}"
                  value={sys.biography?.[f.key] ?? ""}
                  editable={ed}
                  height={f.height}
                />
              </div>
            {/each}
          {/key}
        {/if}
      </div>
    </div>

    <!-- Inside .bd rather than .win: the layer's box is the frame a peek is
         positioned and clamped against, and the app's own title bar is not
         part of the sheet. Parked higher up, a card centred on a top row
         rides up over Foundry's window chrome. -->
    <div class="peeklayer">
      {#each peekRows as r (r.pk)}
        <div class="pkc" class:noart={r.card.noart} data-peek={r.pk} style={r.card.art}>
          {@html CARD(r.card)}
        </div>
      {/each}
    </div>
  </div>
  {#if edit}
    <div class="tape bot" aria-hidden="true"><i><span>{TAPE}</span><span>{TAPE}</span></i></div>
  {/if}
</div>

<style>
  /* There is no bespoke row style here any more, and that is the point:
     every card on this sheet is a SPINE, a TILE or a CARD from `design/`,
     so there is nothing left for this sheet to invent a look for. */
  .bio {
    font: 400 12.5px/1.6 var(--f-ui);
    color: var(--ink-2);
  }
  /* The trait and experience rows, the Evasion arch and the two roll buttons
     are buttons — they are things you press. Strip the browser's and
     Foundry's own button chrome so the design's rules land on them unchanged.

     `height`/`min-height` are the load-bearing pair. Foundry gives every
     `button` a fixed 28px, which is right for its own toolbars and wrong for
     anything that stacks: a trait cell wants 66px and a roll button 49px, and
     both are `overflow:hidden` flex columns, so at 28px the children do not
     overflow — they collapse to zero height and vanish. That is why the trait
     row was a bare number with no label and no mark, and why the attack
     button was a sliver. One rule, two symptoms.

     `padding:0` matters for its own reason: the arch is a 58×64 grid with the
     numeral placed inside it, and a user-agent 1px 6px would shift that
     numeral off its own optical centre. */
  .trs .tr,
  .xp .r,
  .wr .go {
    height: auto;
    min-height: 0;
    line-height: normal;
    border: 0;
    padding: 0;
    cursor: pointer;
    font: inherit;
    text-align: inherit;
  }
  /* The arch is the one that must *not* take `height:auto`, and it took it
     for a while — which is why Evasion came back at half size. The three
     above have no height of their own and size to their content, so `auto`
     is what releases them from Foundry's 28px. This one is a fixed 58×64
     grid with an SVG absolutely positioned inside it: nothing in it has
     height, so `auto` collapses the box to the numeral and the arch is
     drawn into a 30px slot. `min-height` alone is what was needed. */
  .dfn .crest.ev {
    min-height: 0;
    line-height: normal;
    border: 0;
    padding: 0;
    cursor: pointer;
    font: inherit;
    background: none;
    box-shadow: none;
  }
  /* The equip strip is the one that must *not* join the group above.
     `design/sheet.css` already gives `.eqp .act` its padding, font, colour,
     background and centring — it was always drawn as a strip, it just was
     not a button. So the only thing to strip here is the chrome a button
     brings with it, and declaring `padding:0` or `font:inherit` alongside
     the others collapsed it to a zero-height sliver: this rule is more
     specific than the ported one and wins every property it names. Name
     less. */
  .eqp .act {
    width: 100%;
    height: auto;
    min-height: 0;
    border: 0;
    cursor: pointer;
  }
  /* Same reasoning as `.eqp .act`, and the same discipline: `design/` draws
     these two, so name only the chrome that has to go. The level plate is
     the one place an input has to disappear entirely into a shape — Foundry
     gives every input a box, a border and a focus ring, and all three of
     them are the plate's job here, not the field's. */
  /* The two controls that are typographic rather than boxed — the panel
     heading's action and the link inside an empty-state sentence. `design/`
     gives both their font and colour; the only thing to take away here is
     the 28px floor and the box, which would make each of them a widget
     sitting in a line of text. */
  .pnl > .k .nw,
  .ach .nw {
    width: auto;
    height: auto;
    min-height: 0;
    line-height: inherit;
    box-shadow: none;
    border-radius: 0;
  }
  .dio .ctl,
  .dio .lv .b {
    height: auto;
    min-height: 0;
    line-height: normal;
    box-shadow: none;
    outline-offset: 2px;
  }
  .dio .lv .b {
    border: 0;
    border-radius: 0;
    background: transparent;
  }
  /* The three fields edit mode adds, and the same discipline as `.eqp .act`:
     `design/sheet.css` draws all three — face, ground, focus ring — so the
     only thing to take away here is what Foundry gives an `<input>` and the
     design does not name. For the two on the diorama that is the fixed
     height and the 28px floor, since neither states one; a 19px name in a
     28px box is a name with a box round it, on the one surface here that is
     a picture rather than a form.

     The trait numeral is deliberately *not* in that group. It states a
     height of its own — `height:1em`, which is the whole reason the six
     cells do not grow seven pixels the moment the mode comes on — so
     handing it `height:auto` here would undo the fix from a more specific
     rule. Only the floor and the corner are Foundry's to give back. */
  .dio .nm .b,
  .dio .nm .pn {
    height: auto;
    min-height: 0;
    box-shadow: none;
    border-radius: 0;
  }
  .trs .tr input.v {
    min-height: 0;
    box-shadow: none;
    border-radius: 0;
  }
  /* `height:auto` is load-bearing rather than defensive: the toggle is
     `align-self:stretch` so its sticky ground covers the full strip and tabs
     pass behind it rather than under the word, and stretch does nothing to an
     element Foundry has already given a fixed 28px. `box-shadow` is not named
     — the design uses it for the hairline that puts this on the far side of
     the counter. */
  .tabs .edt {
    height: auto;
    min-height: 0;
    border-radius: 0;
  }
  .eqp .act:disabled {
    cursor: default;
  }
  /* Same discipline as `.eqp .act`, and the same reason it is short: every
     one of these is *drawn* in `design/sheet.css` — padding, hairline,
     background, font, clip — and those rules land in Foundry's `system`
     layer, which is declared after its own, so they already win. What they
     do not name is what a `button` and an `input` bring with them, and
     Foundry's fixed 28px is the one that breaks things: the Hope action is a
     ~31px flex row that would have its diamonds clipped, and the adjust
     tab's fields are 26px and would be stretched into form controls in a
     grid built for label-sized rows.

     `border-radius` because Foundry rounds both and nothing in this system
     is rounded — every surface here is chamfered. */
  .hact,
  .abl .a,
  .acts button,
  .cfg .f input,
  .lst .r input,
  .lst .add {
    height: auto;
    min-height: 0;
    line-height: normal;
    border-radius: 0;
  }
  /* The remove button is the one the design *does* size, to a 24px square,
     so `height:auto` would collapse it to its own glyph. Only the floor and
     the corner rounding are Foundry's to give back. */
  .lst .r .x {
    min-height: 0;
    border-radius: 0;
  }
  /* ...except the three the design gives an explicit padding of its own. */
  .trs .tr {
    padding: 9px 4px 10px;
  }
  .xp .r {
    padding: 5px 9px;
  }
  .wr .go {
    padding: 7px 11px 6px;
  }
</style>
