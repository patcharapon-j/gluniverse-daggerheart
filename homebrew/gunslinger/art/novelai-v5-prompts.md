# Gunslinger and Artifice art prompts for NovelAI V5

Researched September 5, 2026. Based on the package's version 0.1 card text and the current official NovelAI documentation.

This collection covers all 56 Item documents introduced by the package: the Gunslinger class, six subclass cards, 21 Artifice cards, and 28 firearm profiles. The first 28 entries are the class and domain set; the firearms form an appendix. Trick Shot and Against the Odds are features inside Gunslinger, not separate Item cards. Bone cards and the proposed magical Sunken Pistol are outside this new-card set.

Every entry contains a complete prompt. Copy its entire code block into NovelAI's main Prompt field. Set Undesired Content separately using the shared block below. Card names, filenames, and the art notes belong outside the generation prompt. The companion [JSON catalog](novelai-v5-prompts.json) repeats the complete prompt and matching Undesired Content for each item. It is a portable editorial catalog, not a native NovelAI preset import or API payload.

## What the research changes

- V5 supports natural-language descriptions and tags. These prompts use prose to specify who holds each object, where ropes attach, and what a single action looks like. This is my approach for these cards, not a claim that one prompt format always wins. [V5 announcement](https://journal.novelai.net/image-generation-novelai-diffusion-v5-is-here-c2df7c6b8d2d/)
- V5 can interpret quoted text as something to render. Keep titles and rules out of the prompt, and generate only the illustration. The Foundry card supplies its own text and frame. [V5 text support](https://journal.novelai.net/image-generation-novelai-diffusion-v5-is-here-c2df7c6b8d2d/)
- NovelAI supports numerical emphasis such as `1.15::a taut rope visibly connected to the harness::`. Use this only to repair a recurring omission, replacing the relevant phrase rather than duplicating it. Start unweighted. The syntax is documented; 1.15 is my conservative trial value. [Strengthening and weakening](https://docs.novelai.net/en/image/strengthening-weakening/)
- V5's Light quality setting appends `very aesthetic, amazing quality, no text`. The prompts assume Light is enabled and do not repeat that suffix. [Quality tags](https://docs.novelai.net/en/image/qualitytags/)
- Undesired Content accepts your own exclusions. Some supplied presets discourage negative space, and the Light preset discourages white haze. I recommend custom UC here because quiet corners and smoke are intentional parts of this set. [Undesired Content and preset contents](https://docs.novelai.net/en/image/undesiredcontent/)
- If identities bleed between figures, V5 supports separate character fields and free positioning. Keep the setting and interaction in the base prompt, then move each person's appearance into their own field. [Multiple characters](https://docs.novelai.net/en/image/multiplecharacters/)

## Starting settings

These are proposed production settings, not results from a NovelAI test run.

| Setting | Start with |
| --- | --- |
| Model | NovelAI Diffusion V5 Full |
| Canvas | 1216 by 832, landscape |
| Steps | 28 |
| Prompt Guidance | 5 |
| Sampler and other advanced controls | Current V5 UI defaults |
| Quality Tags | Light |
| UC preset | No Default UC, with the custom block below |
| Transparent background | Off |
| Seed | Explore randomly, then save a selected seed while revising |

The documentation gives roughly 5 to 6 as general guidance for V3 and later and recommends finding a composition before spending more steps. Those are broad recommendations, not a V5-specific benchmark for these prompts. [Steps and guidance](https://docs.novelai.net/en/image/stepsguidance/)

Locking a seed helps compare prompt edits, but changing the prompt or settings can still change the image. A shared seed alone does not guarantee the same face across different scenes. Save the model, settings, full prompt, UC, seed, and original PNG together. [Seeds](https://docs.novelai.net/en/image/seed/)

## Art direction and crop

Use painted maritime fantasy: brass, copper, indigo, weathered wood, and sea-green shadows. The Gunslinger scenes emphasize posture, sightlines, and a readable weapon silhouette. Artifice alternates action with quiet workmanship and care between companions. The domain works without guns or magic, so most of its illustrations center ordinary tools.

The feline sailor on Gunslinger and Drifter is a proposed Kass-inspired design. His approximate age, male feline ancestry, and sailor background follow the supplied character. Brown tabby fur, amber eyes, the nicked ear, and clothing are new visual choices. The human sharpshooter and dwarven maker are invented recurring figures, not added character lore.

For a solo Kass image that keeps becoming a human with cat ears, try adding `fur dataset` at the very start of the prompt. The official tag targets furry imagery. Check mixed scenes carefully so the human opponent remains human. I have left this tag out of the default set. [Dataset tags](https://docs.novelai.net/en/image/tags/)

The current [card layout](../../../design/card.css) uses a 5:7 whole card with artwork initially occupying its upper half, approximately a 10:7 art area. Its cover crop is positioned at 44% horizontally and 22% vertically, and some cards compress the art area to fit text. The proposed 1216 by 832 canvas is close to that landscape area. Keep faces, hands, rope connections, and weapon muzzles in the central region, away from the upper corner badges. Do not reserve half the generated image for rules text.

Higher weapon tiers change materials, finish, and workmanship while preserving the family silhouette, size, and nonmagical identity. Legendary weapons do not acquire glowing runes or new mechanisms.

## Undesired Content for class, subclass, and Artifice cards

Paste this into Undesired Content, not the positive Prompt field.

```text
text, lettering, captions, speech bubbles, logo, watermark, signature, border, card frame, panels, collage, photorealistic, 3d render, plastic skin, malformed hands, extra arms, fused fingers, duplicated weapons, floating parts, modern tactical equipment, assault rifle, laser beam, hologram, glowing runes, gore
```

## Undesired Content for the firearm appendix

```text
text, lettering, captions, logo, watermark, signature, border, card frame, panels, collage, photorealistic, 3d render, people, hands, duplicate weapon, floating parts, disassembled gun, modern tactical equipment, assault rifle, telescopic sight, laser beam, glowing runes, magical aura
```

These exclusions are a starting point. If a desired detail disappears, remove the conflicting exclusion before adding more emphasis.

## A two-character fallback

For Something Worth Keeping, first try its complete prompt as written. If the two people exchange faces or clothing, remove their appearance descriptions from the main prompt and use these fields instead. Keep its galley, box, hinge repair, shared action, framing, and style sentences in the main prompt.

Character field 1, positioned left of center:

```text
woman, adult dwarf, copper-brown skin, thick dark braid threaded with gray, moss-green work shirt, patched leather apron, rolled sleeves. She sits on the left and holds the wooden keepsake box steady while listening to the sailor.
```

Character field 2, positioned right of center:

```text
man, adult human sailor, faded indigo coat. He sits on the right, speaking quietly while seating a replacement hinge pin into the wooden keepsake box.
```

Use the UI's separate character boxes for this fallback. Do not paste their labels into the scene or leave conflicting appearance descriptions in the base prompt. This follows the documented division between scene and character information. [Character fields](https://docs.novelai.net/en/image/multiplecharacters/)

## Review each result

Generate Gunslinger, Something Worth Keeping, and one firearm first to establish the set's look. Then work through the remaining entries with the same style and settings.

Check each image at actual card size. A successful scene needs an obvious focal action, correct hands and weapon count, and the mechanical connection described by the card. Fix a broken rope or an extra pistol before increasing decorative detail. Multi-step physical effects such as Sharpshooter: Mastery and Chain Reaction may need several candidates or local correction.

No images have been generated, visually evaluated, or installed by this prompt-writing pass. The filenames below are suggested output names, not existing artwork paths.

## Card index

1. [Gunslinger](#gunslinger)
2. [Drifter: Foundation](#drifter-foundation)
3. [Drifter: Specialization](#drifter-specialization)
4. [Drifter: Mastery](#drifter-mastery)
5. [Sharpshooter: Foundation](#sharpshooter-foundation)
6. [Sharpshooter: Specialization](#sharpshooter-specialization)
7. [Sharpshooter: Mastery](#sharpshooter-mastery)
8. [Fieldwork, level 1](#fieldwork)
9. [Fault Finder, level 1](#fault-finder)
10. [Make Do, level 1](#make-do)
11. [Smoke Pot, level 2](#smoke-pot)
12. [Something Worth Keeping, level 2](#something-worth-keeping)
13. [Catch Line, level 3](#catch-line)
14. [Field Patch, level 3](#field-patch)
15. [Tripwire, level 4](#tripwire)
16. [Leverage, level 4](#leverage)
17. [Running Repairs, level 5](#running-repairs)
18. [Flash Charge, level 5](#flash-charge)
19. [Rework, level 6](#rework)
20. [Safety Line, level 6](#safety-line)
21. [Artifice-Touched, level 7](#artifice-touched)
22. [Prepared Ground, level 7](#prepared-ground)
23. [Breaching Charge, level 8](#breaching-charge)
24. [Rigged Rescue, level 8](#rigged-rescue)
25. [Chain Reaction, level 9](#chain-reaction)
26. [Master Mechanic, level 9](#master-mechanic)
27. [Impossible Apparatus, level 10](#impossible-apparatus)
28. [Escape Route, level 10](#escape-route)

The [firearm appendix](#firearm-appendix) follows the 28 class and domain entries.


<a id="gunslinger"></a>

## 01. Gunslinger

Suggested output: `gunslinger.png`

Class identity: practical awareness, precision, and nerve. This is a proposed Kass-inspired design, not a confirmed portrait.

```text
On a rain-dark ship deck, an adult male anthropomorphic feline sailor around forty, brown tabby fur, a pale muzzle, amber eyes, a nicked left ear, a weathered navy sea coat, a rust-red sash, and leather wrist wraps stands at a broken railing with a smoking brass-and-walnut boarding pistol lowered in his right hand. His left hand rests on the hilt of a sheathed short sword. His head turns toward a loose pulley and a dangling rope, already noticing the next useful shot. Frame him from the thighs upward, in three-quarter view, with his muzzle, pistol, and attentive eyes clearly separated. A torn cream sail catches the dawn behind him. Sea-green water and distant harbor roofs remain soft. The pistol is a single handheld black-powder weapon. A narrow curl of pale smoke passes beside his face.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="drifter-foundation"></a>

## 02. Drifter: Foundation

Suggested output: `drifter-foundation.png`

Blade and Powder and Keep Moving. Show one coordinated close-range sequence, with one weapon in each hand.

```text
an adult male anthropomorphic feline sailor around forty, brown tabby fur, a pale muzzle, amber eyes, a nicked left ear, a weathered navy sea coat, a rust-red sash, and leather wrist wraps pivots around one adult human boarding guard on a wooden deck. The sailor holds a short sword in his left hand and a compact boarding pistol in his right hand, with two distinct weapons and readable wrists. His blade presses the guard's raised saber aside while the pistol points toward the guard's leather breastplate. His leading boot plants on a clear patch of deck beside the guard. Capture the instant before the shot, both figures in three-quarter profile. The sailor fills the left center and the guard the right center. A diagonal sweep of coat and rigging suggests the step around the opponent. Warm reflected sunlight picks out the blade and pistol.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="drifter-specialization"></a>

## 03. Drifter: Specialization

Suggested output: `drifter-specialization.png`

Finish the Job with movement as the secondary motif. The miss remains a dangerous failure; the follow-up is a sword strike.

```text
an adult male anthropomorphic feline sailor around forty, brown tabby fur, a pale muzzle, amber eyes, a nicked left ear, a weathered navy sea coat, a rust-red sash, and leather wrist wraps slips past one adult human guard in a narrow dockside passage. His right-hand boarding pistol has just fired wide, leaving one fresh splintered mark on a timber post behind the guard and a thin curl of muzzle smoke. His left-hand short sword turns inward toward the guard's exposed leather-clad flank as the sailor steps across the clear foreground. The guard is still lunging, maintaining the danger. Keep the sword arm and pistol arm separate, the missed impact visible, and both figures readable in side view. Ochre lamplight falls across damp navy cloth; the distant harbor recedes into cold green shadows.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="drifter-mastery"></a>

## 04. Drifter: Mastery

Suggested output: `drifter-mastery.png`

Nothing Wasted selects Pin while retaining damage. One opponent, one shot, real loose fabric and a fixed anchor.

```text
an adult male anthropomorphic feline sailor around forty, brown tabby fur, a pale muzzle, amber eyes, a nicked left ear, a weathered navy sea coat, a rust-red sash, and leather wrist wraps faces one adult human duelist at arm's length beside a heavy wooden mast. The sailor leans calmly outside the duelist's saber arc, his own short sword held low in his left hand. His right-hand boarding pistol has just fired once. A torn edge of the duelist's loose coat is caught against the mast at the impact, and the duelist recoils from the shot. Show the taut fabric joining the coat to the wood, a single fresh impact, and the sailor's balanced stance. His expression is economical and watchful. A shaft of late sunlight crosses the smoke. The mast and both figures form one close triangular composition.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="sharpshooter-foundation"></a>

## 05. Sharpshooter: Foundation

Suggested output: `sharpshooter-foundation.png`

Find the Angle and Sure Footing. Partial cover has an exposed angle; the shot does not pass through a solid wall.

```text
an adult human woman with deep brown skin, tightly braided black hair, an ochre shooting jacket, a slate-blue scarf, and a long wooden-stock musket balances on a broad stone parapet above a harbor. She shoulders the musket with both hands and lines its iron sights through a clear gap between two nearby chimney stacks. A single distant adult guard stands partly sheltered behind a low stone wall, with one shoulder visibly exposed along her firing angle. Show the sharpshooter in crisp side profile at left center and the exposed shoulder in the right middle distance. Her forward boot grips a dry ledge and her scarf streams gently behind her. The route along the parapet remains visible. Cool dawn stone contrasts with a small warm glint on the sight.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="sharpshooter-specialization"></a>

## 06. Sharpshooter: Specialization

Suggested output: `sharpshooter-specialization.png`

Thread the Needle is the visible story. Choose a simple exposed latch, not a lock puzzle or a sequence of mechanisms.

```text
an adult human woman with deep brown skin, tightly braided black hair, an ochre shooting jacket, a slate-blue scarf, and a long wooden-stock musket kneels behind a low roof ridge, holding her musket steadily against her shoulder. In the near foreground to the right, an exposed brass latch on a hanging gate has just been struck and is tipping open. The gate and latch are in the same uninterrupted line of sight as the musket muzzle. One small burst of metal sparks marks the contact; the rest of the scene stays still. Use a compressed side-on view that makes the shooter, barrel direction, and latch easy to connect. Her cheek rests against the wooden stock. Pale afternoon light traces the rifle-length silhouette against a deep blue warehouse wall.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="sharpshooter-mastery"></a>

## 07. Sharpshooter: Mastery

Suggested output: `sharpshooter-mastery.png`

One Shot, Two Problems combines Disarm and Pin on one damaged target. Reject images with two targets or two gunshots.

```text
an adult human woman with deep brown skin, tightly braided black hair, an ochre shooting jacket, a slate-blue scarf, and a long wooden-stock musket fires one measured shot from a warehouse balcony at a single adult guard across a narrow courtyard. The guard stands beside a rough timber door, gripping a saber with a loose sleeve draped close to the jamb. At the point of impact the saber falls from the guard's hand while the sleeve catches against the timber. The guard recoils; both the falling saber and taut sleeve remain visible. Use a composed side view with the shooter in the left foreground and the one guard at right center. The musket is firmly shouldered with both hands. One thin stream of smoke cuts through cool evening light.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="fieldwork"></a>

## 08. Fieldwork / Artifice level 1

Suggested output: `fieldwork.png`

An ordinary mechanical repair with appropriate tools. Keep gears inside an intelligible housing.

```text
an adult dwarven woman with copper-brown skin, a thick dark braid threaded with gray, a moss-green work shirt, a patched leather apron, and rolled sleeves kneels beside a small harbor winch with its wooden cover set aside. She uses a short wrench to reseat a loose metal bracket while her other hand steadies the housing. Frame the work from just above her shoulder, keeping her face, both hands, the bracket, and the connected rope drum visible. A few ordinary tools lie on folded cloth beside the winch. Abraded wood, grease-dark steel, and polished wear marks tell how often the mechanism has been used. Daylight enters through an open boathouse door and lights the exact point where tool meets metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="fault-finder"></a>

## 09. Fault Finder / Artifice level 1

Suggested output: `fault-finder.png`

Visual inspection reveals a specific mechanical fault. No magical scanning, x-ray view, or floating statistics.

```text
An adult elven engineer with olive skin, cropped dark hair, and a faded blue work coat studies the exposed hinge of a heavy dock gate. She holds a small oil lantern close to a bent retaining pin, then points at a bright hairline crack in its supporting bracket. Show her narrowed eyes in profile and the cracked joint large enough to read at card size. A thick chain and a wooden counterweight establish how the gate moves. Warm lamplight isolates the defect against cool iron and weathered timber. Everything is physically present in front of her; the rest of the gate recedes into shadow.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="make-do"></a>

## 10. Make Do / Artifice level 1

Suggested output: `make-do.png`

One mundane handheld tool assembled from visible material. Avoid depicting a weapon or a conjured machine.

```text
an adult dwarven woman with copper-brown skin, a thick dark braid threaded with gray, a moss-green work shirt, a patched leather apron, and rolled sleeves sits on a dock step assembling a small improvised clamp from two scrap wooden jaws, a salvaged screw, and a strip of cord. Her hands tighten the finished tool around a cracked lantern handle to show its ordinary use. Use a close three-quarter overhead view with the clamp as the largest, sharpest object. Her open tool roll contains only a few worn hand tools; offcuts rest beside her boot. Amber late sunlight catches the screw thread, and cool harbor water is softly visible beyond the step. The object looks temporary, practical, and small enough to hold in one hand.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="smoke-pot"></a>

## 11. Smoke Pot / Artifice level 2

Suggested output: `smoke-pot.png`

Partial cover from smoke. People remain partly visible; the pot neither explodes nor grants magical invisibility.

```text
A small clay smoke pot rests on cobbles at the mouth of a harbor alley, its vent releasing a dense, low billow of pale gray smoke. An adult courier in a rust-red coat has just thrown it and is visible at the left edge with an empty extended hand. Through the smoke, the partial silhouettes of a companion and a pursuing guard remain distinguishable. Place the pot and rolling smoke at center, with a strip of open cobblestone visible underneath. Cool blue evening shadows separate the figures from warm lantern light. The smoke spreads across the sightline and softens outlines while leaving the scene readable.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="something-worth-keeping"></a>

## 12. Something Worth Keeping / Artifice level 2

Suggested output: `something-worth-keeping.png`

A rest scene centered on a personal belonging and companionship. Emotional repair matters as much as the hinge.

```text
an adult dwarven woman with copper-brown skin, a thick dark braid threaded with gray, a moss-green work shirt, a patched leather apron, and rolled sleeves and an adult human sailor in a faded indigo coat sit together at a quiet galley table. Between them lies a small battered wooden keepsake box with a broken hinge. The maker holds the box steady while the sailor carefully seats a replacement pin with a small hand tool. Their shoulders relax as the sailor speaks, and the maker listens with a slight smile. Give equal visual weight to their faces and their shared work. An oil lamp makes a warm pool across their hands, scratched wood, and a scrap of old cloth. Night-blue porthole light gently separates their silhouettes.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="catch-line"></a>

## 13. Catch Line / Artifice level 3

Suggested output: `catch-line.png`

One restrained target, a catchable harness, and a secure anchor. The line inflicts no injury and does not strangle.

```text
An adult human adventurer in a moss-green coat pulls a hooked rope taut across a narrow pier. The hook has caught the heavy leather harness worn by one adult armored raider, arresting the raider's forward step without piercing their body. The other end of the rope is visibly secured around a thick mooring bollard in the foreground. Show all three points clearly: adventurer, caught harness, and bollard. The raider braces against the tension, still upright. Use a low side view, with the taut rope cutting diagonally through open space. Sea-green reflections brighten the rope against the dark planks.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="field-patch"></a>

## 14. Field Patch / Artifice level 3

Suggested output: `field-patch.png`

A physical armor adjustment during a pause, not magical healing or a repair made during an incoming hit.

```text
an adult dwarven woman with copper-brown skin, a thick dark braid threaded with gray, a moss-green work shirt, a patched leather apron, and rolled sleeves tightens a replacement leather strap across an adult companion's dented shoulder armor. The companion sits calmly on a stone step, supporting the damaged plate while the maker threads the buckle and braces it with a small metal strip. Show a close view of their working hands and the clearly visible crack beside the repair. Both faces occupy the softer upper background. Their tools rest within reach on an open cloth roll. Warm daylight illuminates scuffed metal and rough stitching, with a cool blue traveling cloak behind them. The scene is a brief pause in a sheltered courtyard.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="tripwire"></a>

## 15. Tripwire / Artifice level 4

Suggested output: `tripwire.png`

A visible restraining line with two secure endpoints. It is not an invisible explosive mine.

```text
An adult halfling scout with curly black hair and a rust-red scarf kneels in an old warehouse doorway, securing a clearly visible cord between two stout iron rings near the floor. A short loop of the cord lies ready to catch a boot. In the background, one adult ally looks toward the scout's pointing hand and the placed line. Use a low view at cord height so both fixed endpoints and the uninterrupted span can be read. Slanting daylight makes the line stand out against dark floorboards. A few empty crates frame the scene without concealing the device.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="leverage"></a>

## 16. Leverage / Artifice level 4

Suggested output: `leverage.png`

An unsecured unattended object moves along a supported clear route. The lever and fulcrum must visibly connect.

```text
an adult dwarven woman with copper-brown skin, a thick dark braid threaded with gray, a moss-green work shirt, a patched leather apron, and rolled sleeves presses down on a long timber lever pivoting across a solid stone fulcrum. The far end lifts the edge of an unattended, empty handcart just enough for it to roll away from a blocked doorway. Show the lever as one continuous beam, with the fulcrum and cart wheel in clear side view. Her planted boots and bent knees convey effort. A broad clear strip of cobblestone opens in the direction the cart will move. Warm copper sunlight hits the wood grain, with cool green warehouse shadows behind. The handcart is modest in size and contains no passengers.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="running-repairs"></a>

## 17. Running Repairs / Artifice level 5

Suggested output: `running-repairs.png`

A temporary mundane repair. Preserve the rough splint and lashing so it differs from Master Mechanic.

```text
An adult human mechanic with brown skin, short gray hair, and a navy work shirt crouches beside a damaged small wagon at a roadside halt. She tightens a rope lashing around a cracked axle housing reinforced with a rough spare timber. One hand holds the binding while the other turns a wooden tensioning stick. Frame the improvised repair prominently beneath the wheel, with her focused face above it. An open kit and the original broken bracket sit nearby. Late sunlight catches fresh splinters and old grease. The vehicle remains visibly battered, held together by the temporary brace.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="flash-charge"></a>

## 18. Flash Charge / Artifice level 5

Suggested output: `flash-charge.png`

Disorientation without damage. No burning people, shrapnel wounds, or destructive fireball.

```text
At the center of a harbor courtyard, a small thrown charge releases a brief white-gold flash beside two adult raiders standing close together. Both raiders turn their faces aside and raise their forearms against the light. In the left foreground an adult scout in an indigo coat has already covered their own eyes after the throw. Show one compact source of light with a thin expanding puff of smoke, distinct silhouettes, and intact clothing and paving. Cool surrounding shadows preserve the shape of the bodies and the courtyard. The moment feels startling and disorienting, with restrained highlights instead of a frame-filling blaze.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="rework"></a>

## 19. Rework / Artifice level 6

Suggested output: `rework.png`

Choose the weapon improvement option. One adjusted item; no new weapon tier, magical aura, or transformed weapon family.

```text
an adult dwarven woman with copper-brown skin, a thick dark braid threaded with gray, a moss-green work shirt, a patched leather apron, and rolled sleeves works at a camp bench during a quiet rest, carefully fitting a shaped leather grip and a small steel reinforcement collar to an ally's worn short sword. The sword lies across wooden supports, blade intact and hilt nearest the viewer. Her companion's hand rests on the bench while watching the adjustment. Focus on the neatly fitted collar, the fresh grip, and her measuring calipers. An oil lamp picks out clean steel edges among otherwise worn equipment. Navy cloth and moss-green sleeves provide broad color shapes. The weapon keeps its familiar proportions while showing a modest, tangible improvement.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="safety-line"></a>

## 20. Safety Line / Artifice level 6

Suggested output: `safety-line.png`

An environmental fall arrested by carried equipment. Keep weapons and attackers out of this scene.

```text
An adult traveler in a rust-red coat slips through a rotten plank on a narrow wooden walkway. A thick safety rope already fastened to their climbing harness snaps taut, stopping the fall just below the broken boards. At left center, an adult companion in a navy coat braces beside a sound timber post around which the rope is secured. Show the continuous rope from harness to post, a few falling planks, and the traveler's startled but conscious face. Use a side view that keeps the gap small and the rescuing line prominent. Cool river light rises from below; warm afternoon light catches the hands.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="artifice-touched"></a>

## 21. Artifice-Touched / Artifice level 7

Suggested output: `artifice-touched.png`

Expertise and physical help. The domain name does not mean a magical transformation, extra limbs, or cybernetics.

```text
an adult dwarven woman with copper-brown skin, a thick dark braid threaded with gray, a moss-green work shirt, a patched leather apron, and rolled sleeves guides an adult human apprentice in a navy work shirt as they adjust a large hand-operated winch together. Her steady hand holds a bracket precisely in place while the apprentice turns the fitting tool. Frame their four distinct hands around the shared mechanism, with the maker's calm eyes and the apprentice's concentration above. A plumb line, calipers, a coil of rope, and a patched tool roll lie within reach as practical evidence of broad experience. Warm brass reflections echo between the tools and their faces. The mechanism is firmly mounted to a heavy wooden bench inside a sea-green boathouse.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="prepared-ground"></a>

## 22. Prepared Ground / Artifice level 7

Suggested output: `prepared-ground.png`

A fixed prepared area with physical braces, screens, and footholds. No moving force field or invulnerable fortress.

```text
A small group of three adult adventurers holds a prepared corner of a harbor storehouse. Stout wooden braces support two angled timber screens, and broad foothold blocks are fixed securely to the floor behind them. An adult dwarven maker in a moss-green shirt checks one brace while two companions stand ready within the protected space. Use a slightly elevated view so the footprint of the small defensive area is clear. Daylight falls through a high window onto ordinary fasteners, scarred wood, and steady boots. A continuous clear floor surrounds the fixtures. The screens look useful for dodging behind and staying balanced.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="breaching-charge"></a>

## 23. Breaching Charge / Artifice level 8

Suggested output: `breaching-charge.png`

Illustrates the alternative mundane-barrier use. A person-sized opening, not the collapse of an entire building.

```text
An unoccupied old brick partition in an abandoned warehouse has just opened around a compact powder charge, leaving a rough person-sized gap. Show fractured bricks falling inward and a short-lived cloud of ochre dust lit from the other side. The thick supporting timber posts at either side remain intact. An adult sapper in a navy coat watches from safe cover at the far left edge, with their hands away from the blast. The gap is the central readable shape, dark at its edge and bright beyond. Use a restrained scale of debris and a little gray smoke, with no occupants near the breach.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="rigged-rescue"></a>

## 24. Rigged Rescue / Artifice level 8

Suggested output: `rigged-rescue.png`

An existing line reduces a physical attack's harm and moves an ally safely. Show prior attachment, not a rope materializing.

```text
An adult sailor in an ochre vest is pulled sideways along a clear wooden deck as a single armored raider's sword clips their raised shoulder plate. A rope visibly fastened to the sailor's broad harness runs through a deck-mounted pulley to an adult rescuer in an indigo coat, who leans back on the line. Keep the rope, pulley, and harness connected and visible. The sailor moves toward an empty safe patch of deck, away from the raider. Show all three figures in a clean lateral composition, with a small spark at the armor and a sweep of cloth marking the rescue. Warm sunset crosses cool green shadows.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="chain-reaction"></a>

## 25. Chain Reaction / Artifice level 9

Suggested output: `chain-reaction.png`

One ranged hit produces one nearby secondary hit through a visible object. No branching energy, repeated ricochets, or Trick Shot.

```text
An adult human marksman in a navy coat fires a black-powder pistol at one leather-armored raider beside a wooden crate. The raider recoils from a fresh strike in the shoulder armor. A loose iron hook resting on the crate is knocked sideways by the impact beside them and hits a second raider standing immediately beyond the crate. Show the pistol, first impact, and flying hook in one compressed side view, with a single source of muzzle smoke. The two raiders are distinct, the original shooter separate at the left. A few wood splinters trace the short secondary path through warm lantern light.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="master-mechanic"></a>

## 26. Master Mechanic / Artifice level 9

Suggested output: `master-mechanic.png`

A lasting mundane repair using tools and original parts. Ordinary craftsmanship, with a mentor's tool as the legacy motif.

```text
an adult dwarven woman with copper-brown skin, a thick dark braid threaded with gray, a moss-green work shirt, a patched leather apron, and rolled sleeves stands beside a small repaired wagon inside a harbor workshop after a long morning of work. She turns the restored wheel by hand while inspecting a carefully fitted replacement axle bearing. The repair is clean and lasting, with flush fasteners, aligned supports, and the original aged wood preserved. Her worn mentor's hand plane rests prominently on the bench beside a few removed broken parts. Frame her attentive expression, the turning wheel, and the finished joint together. Broad afternoon light enters through the doors; the bench and rafters fall into sea-green shadow. Her sleeves bear old grease and sawdust.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="impossible-apparatus"></a>

## 27. Impossible Apparatus / Artifice level 10

Suggested output: `impossible-apparatus.png`

Choose only the bridge option. Real available material and secure supports; no floating architecture or autonomous machine.

```text
A temporary footbridge built from salvaged ship spars, thick rope, and wooden deck panels spans a modest gap between two stone quays. Massive posts on both banks visibly anchor the ropes. An adult dwarven engineer in a moss-green shirt tightens the last lashing at the near bank while one adult companion cautiously tests the first plank. Use a three-quarter wide view that shows the complete bridge, both supports, and the water below. The assembly is ingenious but physically joined, with load carried through continuous beams and lines. Copper sunset picks out knots and grain against deep blue water.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="escape-route"></a>

## 28. Escape Route / Artifice level 10

Suggested output: `escape-route.png`

A group escape along one supported physical route. The route fails behind the party, with no teleportation or solid-wall passage.

```text
Four adult adventurers hurry along a continuous escape route from a harbor warehouse loft to a safe stone quay. A broad hinged loading ramp meets a narrow gangway, with taut support ropes fastened to posts at both ends. At the near end an adult maker in a moss-green shirt holds the release line while the final companion crosses. The leading pair has already reached the clear quay. One emptied plank begins to fall behind the last traveler, showing the route will not last. Use a readable diagonal view from the loft toward the visible destination. Warm dawn lights the escape path over cool harbor water.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="firearm-appendix"></a>

## Firearm appendix

Each tier has a complete prompt below. Use the firearm Undesired Content block for every entry in this appendix.

<a id="workshop-pocket-flintlock"></a>

## 29. Workshop Pocket Flintlock

Suggested output: `workshop-pocket-flintlock.png`

One small ordinary pistol. Concealable is suggested by size, not by a disappearing weapon. Tier changes are finish and workmanship only, not new powers.

```text
A single compact single-barrel flintlock pistol with a short walnut grip, a short straight steel barrel, and a small brass lock plate. Its entire silhouette is sized to fit inside a coat pocket. The pistol lies beside the open edge of a folded navy coat pocket. The cloth provides scale without hiding the barrel or grip. The finish is practical and plain: scratched walnut, dull iron, simple brass fittings, and a few carefully maintained wear marks. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="improved-workshop-pocket-flintlock"></a>

## 30. Improved Workshop Pocket Flintlock

Suggested output: `improved-workshop-pocket-flintlock.png`

One small ordinary pistol. Concealable is suggested by size, not by a disappearing weapon. Tier changes are finish and workmanship only, not new powers.

```text
A single compact single-barrel flintlock pistol with a short walnut grip, a short straight steel barrel, and a small brass lock plate. Its entire silhouette is sized to fit inside a coat pocket. The pistol lies beside the open edge of a folded navy coat pocket. The cloth provides scale without hiding the barrel or grip. The finish shows careful upgrading: cleanly fitted brass bands, smoother oiled walnut, tidy checkering on the grip, and a small dark-green leather accent. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="advanced-workshop-pocket-flintlock"></a>

## 31. Advanced Workshop Pocket Flintlock

Suggested output: `advanced-workshop-pocket-flintlock.png`

One small ordinary pistol. Concealable is suggested by size, not by a disappearing weapon. Tier changes are finish and workmanship only, not new powers.

```text
A single compact single-barrel flintlock pistol with a short walnut grip, a short straight steel barrel, and a small brass lock plate. Its entire silhouette is sized to fit inside a coat pocket. The pistol lies beside the open edge of a folded navy coat pocket. The cloth provides scale without hiding the barrel or grip. The finish shows expert workmanship: a deep blue-black steel finish, a precisely fitted walnut body, restrained copper line inlay, and crisp geometric engraving on the fittings. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="legendary-workshop-pocket-flintlock"></a>

## 32. Legendary Workshop Pocket Flintlock

Suggested output: `legendary-workshop-pocket-flintlock.png`

One small ordinary pistol. Concealable is suggested by size, not by a disappearing weapon. Tier changes are finish and workmanship only, not new powers.

```text
A single compact single-barrel flintlock pistol with a short walnut grip, a short straight steel barrel, and a small brass lock plate. Its entire silhouette is sized to fit inside a coat pocket. The pistol lies beside the open edge of a folded navy coat pocket. The cloth provides scale without hiding the barrel or grip. The finish shows a master artisan's work: dark polished walnut, fine silver-and-copper wave inlay, exceptionally clean metal seams, and small signs of long, careful use. Its metal and decoration reflect ordinary light. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="workshop-boarding-pistol"></a>

## 33. Workshop Boarding Pistol

Suggested output: `workshop-boarding-pistol.png`

Keep the pistol handheld and nonmagical. Do not add the separate Sunken Pistol's supernatural powers. Tier changes are finish and workmanship only, not new powers.

```text
A single sturdy single-barrel boarding pistol with a curved walnut grip, a moderately long steel barrel, a brass trigger guard, and a simple lanyard ring at the butt. It is balanced for one-handed use. The pistol rests diagonally across a rust-red sash on a sea-worn deck plank, with a short loop of cord passing through its lanyard ring. The finish is practical and plain: scratched walnut, dull iron, simple brass fittings, and a few carefully maintained wear marks. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="improved-workshop-boarding-pistol"></a>

## 34. Improved Workshop Boarding Pistol

Suggested output: `improved-workshop-boarding-pistol.png`

Keep the pistol handheld and nonmagical. Do not add the separate Sunken Pistol's supernatural powers. Tier changes are finish and workmanship only, not new powers.

```text
A single sturdy single-barrel boarding pistol with a curved walnut grip, a moderately long steel barrel, a brass trigger guard, and a simple lanyard ring at the butt. It is balanced for one-handed use. The pistol rests diagonally across a rust-red sash on a sea-worn deck plank, with a short loop of cord passing through its lanyard ring. The finish shows careful upgrading: cleanly fitted brass bands, smoother oiled walnut, tidy checkering on the grip, and a small dark-green leather accent. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="advanced-workshop-boarding-pistol"></a>

## 35. Advanced Workshop Boarding Pistol

Suggested output: `advanced-workshop-boarding-pistol.png`

Keep the pistol handheld and nonmagical. Do not add the separate Sunken Pistol's supernatural powers. Tier changes are finish and workmanship only, not new powers.

```text
A single sturdy single-barrel boarding pistol with a curved walnut grip, a moderately long steel barrel, a brass trigger guard, and a simple lanyard ring at the butt. It is balanced for one-handed use. The pistol rests diagonally across a rust-red sash on a sea-worn deck plank, with a short loop of cord passing through its lanyard ring. The finish shows expert workmanship: a deep blue-black steel finish, a precisely fitted walnut body, restrained copper line inlay, and crisp geometric engraving on the fittings. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="legendary-workshop-boarding-pistol"></a>

## 36. Legendary Workshop Boarding Pistol

Suggested output: `legendary-workshop-boarding-pistol.png`

Keep the pistol handheld and nonmagical. Do not add the separate Sunken Pistol's supernatural powers. Tier changes are finish and workmanship only, not new powers.

```text
A single sturdy single-barrel boarding pistol with a curved walnut grip, a moderately long steel barrel, a brass trigger guard, and a simple lanyard ring at the butt. It is balanced for one-handed use. The pistol rests diagonally across a rust-red sash on a sea-worn deck plank, with a short loop of cord passing through its lanyard ring. The finish shows a master artisan's work: dark polished walnut, fine silver-and-copper wave inlay, exceptionally clean metal seams, and small signs of long, careful use. Its metal and decoration reflect ordinary light. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="workshop-long-musket"></a>

## 37. Workshop Long Musket

Suggested output: `workshop-long-musket.png`

Long two-handed silhouette. No modern optic, oversized cannon barrel, or increased range at higher tiers. Tier changes are finish and workmanship only, not new powers.

```text
A single slender black-powder musket with one long straight steel barrel, a full walnut shoulder stock, a brass butt plate, and simple iron sights. Its elongated proportions clearly require both hands. The complete musket rests diagonally across two low wooden supports on folded navy sailcloth. Both the muzzle and the shoulder stock fit inside the image. The finish is practical and plain: scratched walnut, dull iron, simple brass fittings, and a few carefully maintained wear marks. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="improved-workshop-long-musket"></a>

## 38. Improved Workshop Long Musket

Suggested output: `improved-workshop-long-musket.png`

Long two-handed silhouette. No modern optic, oversized cannon barrel, or increased range at higher tiers. Tier changes are finish and workmanship only, not new powers.

```text
A single slender black-powder musket with one long straight steel barrel, a full walnut shoulder stock, a brass butt plate, and simple iron sights. Its elongated proportions clearly require both hands. The complete musket rests diagonally across two low wooden supports on folded navy sailcloth. Both the muzzle and the shoulder stock fit inside the image. The finish shows careful upgrading: cleanly fitted brass bands, smoother oiled walnut, tidy checkering on the grip, and a small dark-green leather accent. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="advanced-workshop-long-musket"></a>

## 39. Advanced Workshop Long Musket

Suggested output: `advanced-workshop-long-musket.png`

Long two-handed silhouette. No modern optic, oversized cannon barrel, or increased range at higher tiers. Tier changes are finish and workmanship only, not new powers.

```text
A single slender black-powder musket with one long straight steel barrel, a full walnut shoulder stock, a brass butt plate, and simple iron sights. Its elongated proportions clearly require both hands. The complete musket rests diagonally across two low wooden supports on folded navy sailcloth. Both the muzzle and the shoulder stock fit inside the image. The finish shows expert workmanship: a deep blue-black steel finish, a precisely fitted walnut body, restrained copper line inlay, and crisp geometric engraving on the fittings. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="legendary-workshop-long-musket"></a>

## 40. Legendary Workshop Long Musket

Suggested output: `legendary-workshop-long-musket.png`

Long two-handed silhouette. No modern optic, oversized cannon barrel, or increased range at higher tiers. Tier changes are finish and workmanship only, not new powers.

```text
A single slender black-powder musket with one long straight steel barrel, a full walnut shoulder stock, a brass butt plate, and simple iron sights. Its elongated proportions clearly require both hands. The complete musket rests diagonally across two low wooden supports on folded navy sailcloth. Both the muzzle and the shoulder stock fit inside the image. The finish shows a master artisan's work: dark polished walnut, fine silver-and-copper wave inlay, exceptionally clean metal seams, and small signs of long, careful use. Its metal and decoration reflect ordinary light. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="workshop-deck-blunderbuss"></a>

## 41. Workshop Deck Blunderbuss

Suggested output: `workshop-deck-blunderbuss.png`

One flared barrel and a substantial shoulder stock. Keep it distinct from both the musket and brace cannon. Tier changes are finish and workmanship only, not new powers.

```text
A single short, sturdy two-handed black-powder blunderbuss with one visibly flared brass muzzle, a broad wooden shoulder stock, and a thick steel barrel band. The muzzle opening is broad but modest in scale. The blunderbuss rests diagonally on an old ship's hatch, supported by a folded moss-green cloth, with its bell-shaped muzzle clearly visible in three-quarter view. The finish is practical and plain: scratched walnut, dull iron, simple brass fittings, and a few carefully maintained wear marks. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="improved-workshop-deck-blunderbuss"></a>

## 42. Improved Workshop Deck Blunderbuss

Suggested output: `improved-workshop-deck-blunderbuss.png`

One flared barrel and a substantial shoulder stock. Keep it distinct from both the musket and brace cannon. Tier changes are finish and workmanship only, not new powers.

```text
A single short, sturdy two-handed black-powder blunderbuss with one visibly flared brass muzzle, a broad wooden shoulder stock, and a thick steel barrel band. The muzzle opening is broad but modest in scale. The blunderbuss rests diagonally on an old ship's hatch, supported by a folded moss-green cloth, with its bell-shaped muzzle clearly visible in three-quarter view. The finish shows careful upgrading: cleanly fitted brass bands, smoother oiled walnut, tidy checkering on the grip, and a small dark-green leather accent. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="advanced-workshop-deck-blunderbuss"></a>

## 43. Advanced Workshop Deck Blunderbuss

Suggested output: `advanced-workshop-deck-blunderbuss.png`

One flared barrel and a substantial shoulder stock. Keep it distinct from both the musket and brace cannon. Tier changes are finish and workmanship only, not new powers.

```text
A single short, sturdy two-handed black-powder blunderbuss with one visibly flared brass muzzle, a broad wooden shoulder stock, and a thick steel barrel band. The muzzle opening is broad but modest in scale. The blunderbuss rests diagonally on an old ship's hatch, supported by a folded moss-green cloth, with its bell-shaped muzzle clearly visible in three-quarter view. The finish shows expert workmanship: a deep blue-black steel finish, a precisely fitted walnut body, restrained copper line inlay, and crisp geometric engraving on the fittings. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="legendary-workshop-deck-blunderbuss"></a>

## 44. Legendary Workshop Deck Blunderbuss

Suggested output: `legendary-workshop-deck-blunderbuss.png`

One flared barrel and a substantial shoulder stock. Keep it distinct from both the musket and brace cannon. Tier changes are finish and workmanship only, not new powers.

```text
A single short, sturdy two-handed black-powder blunderbuss with one visibly flared brass muzzle, a broad wooden shoulder stock, and a thick steel barrel band. The muzzle opening is broad but modest in scale. The blunderbuss rests diagonally on an old ship's hatch, supported by a folded moss-green cloth, with its bell-shaped muzzle clearly visible in three-quarter view. The finish shows a master artisan's work: dark polished walnut, fine silver-and-copper wave inlay, exceptionally clean metal seams, and small signs of long, careful use. Its metal and decoration reflect ordinary light. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="workshop-turning-pepperbox"></a>

## 45. Workshop Turning Pepperbox

Suggested output: `workshop-turning-pepperbox.png`

A rotating barrel cluster, not a modern revolver with a separate long barrel. It grants no pictured burst of extra attacks. Tier changes are finish and workmanship only, not new powers.

```text
A single compact one-handed black-powder pepperbox pistol with a rotating cluster of short steel barrels, a curved walnut grip, and a brass mechanical housing. The cluster is short and evenly arranged around its central axis. The pepperbox lies on a folded navy tool cloth, angled so the barrel cluster and side mechanism are both readable in one three-quarter view. The finish is practical and plain: scratched walnut, dull iron, simple brass fittings, and a few carefully maintained wear marks. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="improved-workshop-turning-pepperbox"></a>

## 46. Improved Workshop Turning Pepperbox

Suggested output: `improved-workshop-turning-pepperbox.png`

A rotating barrel cluster, not a modern revolver with a separate long barrel. It grants no pictured burst of extra attacks. Tier changes are finish and workmanship only, not new powers.

```text
A single compact one-handed black-powder pepperbox pistol with a rotating cluster of short steel barrels, a curved walnut grip, and a brass mechanical housing. The cluster is short and evenly arranged around its central axis. The pepperbox lies on a folded navy tool cloth, angled so the barrel cluster and side mechanism are both readable in one three-quarter view. The finish shows careful upgrading: cleanly fitted brass bands, smoother oiled walnut, tidy checkering on the grip, and a small dark-green leather accent. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="advanced-workshop-turning-pepperbox"></a>

## 47. Advanced Workshop Turning Pepperbox

Suggested output: `advanced-workshop-turning-pepperbox.png`

A rotating barrel cluster, not a modern revolver with a separate long barrel. It grants no pictured burst of extra attacks. Tier changes are finish and workmanship only, not new powers.

```text
A single compact one-handed black-powder pepperbox pistol with a rotating cluster of short steel barrels, a curved walnut grip, and a brass mechanical housing. The cluster is short and evenly arranged around its central axis. The pepperbox lies on a folded navy tool cloth, angled so the barrel cluster and side mechanism are both readable in one three-quarter view. The finish shows expert workmanship: a deep blue-black steel finish, a precisely fitted walnut body, restrained copper line inlay, and crisp geometric engraving on the fittings. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="legendary-workshop-turning-pepperbox"></a>

## 48. Legendary Workshop Turning Pepperbox

Suggested output: `legendary-workshop-turning-pepperbox.png`

A rotating barrel cluster, not a modern revolver with a separate long barrel. It grants no pictured burst of extra attacks. Tier changes are finish and workmanship only, not new powers.

```text
A single compact one-handed black-powder pepperbox pistol with a rotating cluster of short steel barrels, a curved walnut grip, and a brass mechanical housing. The cluster is short and evenly arranged around its central axis. The pepperbox lies on a folded navy tool cloth, angled so the barrel cluster and side mechanism are both readable in one three-quarter view. The finish shows a master artisan's work: dark polished walnut, fine silver-and-copper wave inlay, exceptionally clean metal seams, and small signs of long, careful use. Its metal and decoration reflect ordinary light. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="workshop-brace-cannon"></a>

## 49. Workshop Brace Cannon

Suggested output: `workshop-brace-cannon.png`

Portable two-handed weapon with a visible brace. No artillery carriage, multiple barrels, or reduced burden at higher tiers. Tier changes are finish and workmanship only, not new powers.

```text
A single heavy portable black-powder hand cannon with one thick straight iron barrel, a reinforced wooden shoulder brace, and a separate forward grip. Its weight and substantial rear support clearly require two hands. The weapon rests across two stout low timber blocks on a dockside workbench. Side lighting reveals the broad support and the full straight barrel. The finish is practical and plain: scratched walnut, dull iron, simple brass fittings, and a few carefully maintained wear marks. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="improved-workshop-brace-cannon"></a>

## 50. Improved Workshop Brace Cannon

Suggested output: `improved-workshop-brace-cannon.png`

Portable two-handed weapon with a visible brace. No artillery carriage, multiple barrels, or reduced burden at higher tiers. Tier changes are finish and workmanship only, not new powers.

```text
A single heavy portable black-powder hand cannon with one thick straight iron barrel, a reinforced wooden shoulder brace, and a separate forward grip. Its weight and substantial rear support clearly require two hands. The weapon rests across two stout low timber blocks on a dockside workbench. Side lighting reveals the broad support and the full straight barrel. The finish shows careful upgrading: cleanly fitted brass bands, smoother oiled walnut, tidy checkering on the grip, and a small dark-green leather accent. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="advanced-workshop-brace-cannon"></a>

## 51. Advanced Workshop Brace Cannon

Suggested output: `advanced-workshop-brace-cannon.png`

Portable two-handed weapon with a visible brace. No artillery carriage, multiple barrels, or reduced burden at higher tiers. Tier changes are finish and workmanship only, not new powers.

```text
A single heavy portable black-powder hand cannon with one thick straight iron barrel, a reinforced wooden shoulder brace, and a separate forward grip. Its weight and substantial rear support clearly require two hands. The weapon rests across two stout low timber blocks on a dockside workbench. Side lighting reveals the broad support and the full straight barrel. The finish shows expert workmanship: a deep blue-black steel finish, a precisely fitted walnut body, restrained copper line inlay, and crisp geometric engraving on the fittings. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="legendary-workshop-brace-cannon"></a>

## 52. Legendary Workshop Brace Cannon

Suggested output: `legendary-workshop-brace-cannon.png`

Portable two-handed weapon with a visible brace. No artillery carriage, multiple barrels, or reduced burden at higher tiers. Tier changes are finish and workmanship only, not new powers.

```text
A single heavy portable black-powder hand cannon with one thick straight iron barrel, a reinforced wooden shoulder brace, and a separate forward grip. Its weight and substantial rear support clearly require two hands. The weapon rests across two stout low timber blocks on a dockside workbench. Side lighting reveals the broad support and the full straight barrel. The finish shows a master artisan's work: dark polished walnut, fine silver-and-copper wave inlay, exceptionally clean metal seams, and small signs of long, careful use. Its metal and decoration reflect ordinary light. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="workshop-sleeve-flintlock"></a>

## 53. Workshop Sleeve Flintlock

Suggested output: `workshop-sleeve-flintlock.png`

A handheld secondary weapon with a sleeve sheath. No automatic wrist launcher, attached hand, or extra weapon slot. Tier changes are finish and workmanship only, not new powers.

```text
A single slim single-barrel flintlock pistol with a very short steel barrel, a narrow walnut grip, and a restrained brass lock plate. It is a small handheld sidearm shaped for use alongside a sword. The pistol rests beside an empty leather wrist sheath on a rust-red sleeve laid flat on a workbench. It remains outside the sheath so its complete silhouette is visible. The finish is practical and plain: scratched walnut, dull iron, simple brass fittings, and a few carefully maintained wear marks. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="improved-workshop-sleeve-flintlock"></a>

## 54. Improved Workshop Sleeve Flintlock

Suggested output: `improved-workshop-sleeve-flintlock.png`

A handheld secondary weapon with a sleeve sheath. No automatic wrist launcher, attached hand, or extra weapon slot. Tier changes are finish and workmanship only, not new powers.

```text
A single slim single-barrel flintlock pistol with a very short steel barrel, a narrow walnut grip, and a restrained brass lock plate. It is a small handheld sidearm shaped for use alongside a sword. The pistol rests beside an empty leather wrist sheath on a rust-red sleeve laid flat on a workbench. It remains outside the sheath so its complete silhouette is visible. The finish shows careful upgrading: cleanly fitted brass bands, smoother oiled walnut, tidy checkering on the grip, and a small dark-green leather accent. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="advanced-workshop-sleeve-flintlock"></a>

## 55. Advanced Workshop Sleeve Flintlock

Suggested output: `advanced-workshop-sleeve-flintlock.png`

A handheld secondary weapon with a sleeve sheath. No automatic wrist launcher, attached hand, or extra weapon slot. Tier changes are finish and workmanship only, not new powers.

```text
A single slim single-barrel flintlock pistol with a very short steel barrel, a narrow walnut grip, and a restrained brass lock plate. It is a small handheld sidearm shaped for use alongside a sword. The pistol rests beside an empty leather wrist sheath on a rust-red sleeve laid flat on a workbench. It remains outside the sheath so its complete silhouette is visible. The finish shows expert workmanship: a deep blue-black steel finish, a precisely fitted walnut body, restrained copper line inlay, and crisp geometric engraving on the fittings. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```

<a id="legendary-workshop-sleeve-flintlock"></a>

## 56. Legendary Workshop Sleeve Flintlock

Suggested output: `legendary-workshop-sleeve-flintlock.png`

A handheld secondary weapon with a sleeve sheath. No automatic wrist launcher, attached hand, or extra weapon slot. Tier changes are finish and workmanship only, not new powers.

```text
A single slim single-barrel flintlock pistol with a very short steel barrel, a narrow walnut grip, and a restrained brass lock plate. It is a small handheld sidearm shaped for use alongside a sword. The pistol rests beside an empty leather wrist sheath on a rust-red sleeve laid flat on a workbench. It remains outside the sheath so its complete silhouette is visible. The finish shows a master artisan's work: dark polished walnut, fine silver-and-copper wave inlay, exceptionally clean metal seams, and small signs of long, careful use. Its metal and decoration reflect ordinary light. Show the complete assembled weapon with its grip, trigger guard, and barrel clearly separated. Use a quiet workshop background and warm side lighting over cool sea-green shadows. The weapon is the only focal object, with ample breathing room around its outline. All materials are ordinary wood, leather, and metal.

Landscape fantasy illustration, painterly gouache with fine ink accents, expressive natural proportions, clearly grouped shapes, worn brass and copper highlights, deep indigo and sea-green shadows, textured cloth and timber, selective sharp detail at the focal action. One continuous scene fills the image. Keep the essential action within the central four-fifths, with quiet upper corners and room around hands, faces, and equipment.
```
