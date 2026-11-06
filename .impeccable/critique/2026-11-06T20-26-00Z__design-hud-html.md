---
target: bottom HUD study page
total_score: 22
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 4
target_identity: "file:/home/frostnoxia/.t3/worktrees/gluniverse-daggerheart/t3-3884bd0b/design/hud.html"
target_fingerprint: "sha256:a8546383084cadb2347814ccf38bd748ac9d3fda1c2b8c924917113ba5d9956e"
target_path: /home/frostnoxia/.t3/worktrees/gluniverse-daggerheart/t3-3884bd0b/design/hud.html
timestamp: 2026-11-06T20-26-00Z
slug: design-hud-html
---
Method: dual-agent (A: add6853d1ee0b174c · B: a21d5efc9269aa254). Browser overlay skipped (T3 preview unresponsive); rendered evidence via headless Firefox.

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Folded rail lost the Hope numeral |
| 2 | Match System / Real World | 3 | "1 ST" read as "1st" |
| 3 | User Control and Freedom | 2 | Peek "Use" spends Hope with no visible undo |
| 4 | Consistency and Standards | 3 | Same GEM/COMPACT objects throughout |
| 5 | Error Prevention | 1 | Unaffordable Hope feature drawn lit; refusal only after press |
| 6 | Recognition Rather Than Recall | 2 | Icon-only drawers; fanned card names hidden |
| 7 | Flexibility and Efficiency | 3 | One press from rail; no keyboard lift |
| 8 | Aesthetic and Minimalist Design | 3 | Empty socket the loudest face in the hand |
| 9 | Error Recovery | 2 | Shake with no words |
| 10 | Help and Documentation | n/a | Study page; rows peek their rule |
| **Total** | | **22/36** | Fair |

## Priority Issues
- [P1] Empty socket stacked on top of real cards (hud.js HAND, hud.css .bh-held z-index).
- [P1] Hand advance capped at 64px while rail width sat unused; names hidden.
- [P1] Selected foe lifted to z 20, occluding its neighbour.
- [P1] Hope gating not drawn before the press (aria-disabled never written).
- [P2] Vault drawer tucked the hand it asks you to drag into.

## Detector
22 findings, all study chrome (10px nav/eyebrows in tokens.css, gradient-text in pool/face.css) or intended material (stress hatching, map grid). Mechanical: focus outline clipped by clip-path on every chamfered control; aria-label on role-less spans; faint text <4.5:1 on hover grounds; .bh-dw height unstated.

## Fixed this loop
Socket behind cards; advance cap raised to card width + 6; neighbours part 18px and on :focus-within; selected foe no longer raised; Hope-short features and peek actions drawn disabled; vault keeps the hand up, drawers rise clear of cards; "1 Stress"; focus ring inset; faint counts lift on hover; sr-only text for gems/uses/conditions; plinth keeps Hope numeral when folded; fold 22px; drawer tiles 26px stated; foe HP strip 4px.
