---
target: bottom HUD study page
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/home/frostnoxia/.t3/worktrees/gluniverse-daggerheart/t3-3884bd0b/design/hud.html"
target_fingerprint: "sha256:7098cfe949190391403abd0a500e64f96568e3bef4c66e46a2a7fb88078c40e0"
target_path: /home/frostnoxia/.t3/worktrees/gluniverse-daggerheart/t3-3884bd0b/design/hud.html
timestamp: 2026-11-06T20-34-29Z
slug: design-hud-html
---
Method: dual-agent (A: a32f57459c48ec781 · B: a8901aa891882dd0f). Overlay skipped (T3 preview unresponsive); rendered evidence via headless Firefox.

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Seat empty Hope sockets near-invisible |
| 2 | Match System / Real World | 2 | Two threshold grammars (player vs GM) |
| 3 | User Control and Freedom | 3 | Fold left peek/drawer floating |
| 4 | Consistency and Standards | 2 | Player hand crushed, GM hand spread; thresholds differ |
| 5 | Error Prevention | 3 | Rule peek action strip over raised cards |
| 6 | Recognition Rather Than Recall | 2 | 38px card slivers |
| 7 | Flexibility and Efficiency | 3 | Hand slowest to target |
| 8 | Aesthetic and Minimalist Design | 3 | Dense but earned |
| 9 | Error Recovery | 3 | Nothing destructive reachable |
| 10 | Help and Documentation | 3 | Peek explains rules; fold chevron hard to find |
| **Total** | | **27/40** | Good |

## Priority Issues
- [P0] Hand gets leftover width (≈38px advance at 1440).
- [P1] Outer card's tilt spills over the features plate readouts.
- [P1] Rule peek action strip lands on raised card tops.
- [P1] Foe HP mini strip drawn over the role line.
- [P2] One threshold grammar, not two.

## Detector
22 findings, all known false positives (study chrome, intended materials). Mechanical: faint-on-hover pairs <4.5; disabled peek chip 4.30; seat words illegible on pale art (1.24–1.5); down name 3.58; data-full dead CSS; setSeat label stale; fold button unbound, no aria-expanded; condition names display:none.

## Fixed this loop
Budget re-cut: plates keep every reading (vitals 218, features 158 fixed, plinth 148), the hand is the deliberate give (min advance 30, hover lifts whole) — P0 resolved as a stated trade rather than by truncating rules; fan inset 20px both ends for tilt overhang; rule peek at 170px clears the cards; foe HP strip moved to the card's empty top edge; THRESHOLDS shared by both rails; folded hides drawer/peek, plinth Hope numeral moved off the name line; fold button wired with aria-expanded; seat words on a fading scrim; down name dim; data-full wired; setSeat updates Hope and the spoken sentence; condition names sr-only; marked trait in title; hover/disabled contrast fixed; drawer fits its cards.
