# Token condition overlay design QA

final result: passed

## Evidence

- Source visual truth: `design/qa/reference-shattered-effigy.png` (470 x 590 px), selected from the locked Option 02 Shattered Effigy preview.
- Production implementation: `http://127.0.0.1:4175/design/condition-material.html`.
- Browser-rendered full view: `design/qa/production-token-condition.jpg` (1280 x 812 px).
- Focused production region: `design/qa/production-token-condition-close.jpg` (592 x 248 px).
- Normalized side-by-side comparison: `design/qa/shattered-effigy-comparison.jpg` (1280 x 720 px).
- Browser viewport: 1280 x 720 CSS px at device pixel ratio 2. The in-app browser capture is normalized to one output pixel per CSS pixel. Each displayed production token measured 162 x 162 CSS px.
- State: dark map, full motion, Vulnerable, Marked for Death + Charged blend, and defeated terminal override.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: the production component uses the shipped token typography and a single joined outer sentence. The weight, tracking, contrast, and flush rim placement remain legible without competing with the resource tracks.
- Spacing and layout rhythm: the shader is clipped to the token mesh; only the recognition sentence occupies rim space. Resource tracks retain their existing radii. Defeated removes the sentence and all live resource tracks.
- Colors and visual tokens: live materials preserve portrait luminance. Red Marked for Death plus blue Charged resolves as saturated purple before portrait composition instead of washing the image out.
- Image quality and asset fidelity: the verification harness feeds the shader the same square portrait crop a live Token mesh receives. The terminal state samples the actual portrait into seven irregular, displaced fragments with true transparent void. No generated badge, skull, icon, or substitute asset is present.
- Copy and content: multiple states join in one repeated sentence, for example `MARKED FOR DEATH · CHARGED ·`. Defeated has no condition sentence.
- Interaction and motion: the production WebGL program compiled successfully, rendered all three representative states, and reported 16 material definitions. Defeated is frozen. The implementation includes reduced-motion freezing for live materials.
- Browser console: no errors in the implementation or comparison page.
- Existing range ruler: no ruler source or generated file changed.

## Comparison history

1. Initial production comparison found a P2 terminal-state drift: the dead treatment read as a cracked medallion because the seven regions were too regular and the voids too narrow.
2. The shader was revised to widen transparent fracture channels, increase fragment separation, and feed the verification pass the same square portrait crop as a live token mesh.
3. A second focused comparison found the fragment grid still slightly regular. Seed positions and fracture distances were made irregular while preserving exactly seven physical pieces.
4. The final side-by-side comparison shows the locked hierarchy intact: separated portrait pieces, obvious void, no icon, no condition text, and a frozen terminal material. No P0/P1/P2 issue remains.

## Implementation checklist

- [x] Sixteen unique condition material branches.
- [x] Circular, token-contained WebGL composition.
- [x] Joined, repeating outer condition sentence.
- [x] Pre-composite color blending for simultaneous conditions.
- [x] Icon suppression for system token types.
- [x] Defeated overrides all conditions and resources.
- [x] Seven-piece Shattered Effigy with true void and no icon.
- [x] Reduced-motion support and frozen defeated state.
- [x] Existing range ruler unchanged.
