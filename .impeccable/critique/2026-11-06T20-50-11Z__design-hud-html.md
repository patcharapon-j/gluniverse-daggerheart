---
target: bottom HUD study page
total_score: 32
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:/home/frostnoxia/.t3/worktrees/gluniverse-daggerheart/t3-3884bd0b/design/hud.html"
target_fingerprint: "sha256:79feb8a2d23691191e8e1ab706e5603e2a2d5a55b769ba402ef93f64ff164eb3"
target_path: /home/frostnoxia/.t3/worktrees/gluniverse-daggerheart/t3-3884bd0b/design/hud.html
timestamp: 2026-11-06T20-50-11Z
slug: design-hud-html
---
Method: dual-agent, loop 3 (B: a911955b9c11469c3). Overlay skipped (T3 preview unresponsive); rendered evidence via headless Firefox. Scores are after the loop-3 fixes were applied.

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 4 | HP landing now flinches the figure; folded keeps Hope |
| 2 | Match System / Real World | 3 | "Hit" label is terse; kept, the title explains it |
| 3 | User Control and Freedom | 3 | Peek/drawer now exit; held card offers Vault, not Recall |
| 4 | Consistency and Standards | 3 | One threshold grammar; compact-card text held to 11px |
| 5 | Error Prevention | 3 | Short-of-Hope rows drawn disabled before the press |
| 6 | Recognition Rather Than Recall | 3 | Duplicate minions numbered; fanned titles still clip |
| 7 | Flexibility and Efficiency | 3 | Hand is the deliberate give at 1080 |
| 8 | Aesthetic and Minimalist Design | 4 | Dense but earned |
| 9 | Error Recovery | 3 | Nothing destructive reachable |
| 10 | Help and Documentation | 3 | Rule peek prints the rule |
| **Total** | | **32/40** | Good |

## Fixed this loop
- P1 held-card peek offered Recall → Roll / Post / Vault.
- P1 compact-card text under 11px (kind 8.5, stamp 8.5, pennant "Tier" 6.5) → hidden or 11px inside the HUD.
- P1 GM moves overflowed silently → capped at 5 with an "N more" chip.
- P1 identical minions all read BANDIT → numbered.
- P2 arrival doubled and replayed folded body → plinth/body children/stack only.
- P2 no exit motion → 130ms sink on peek and drawer.
- P2 GM hand overran the rail edge → no parting round the selected foe.
- P2 light theme broke currency inks on dark plates → pinned on .bhud.
- P2 seat scrim failed on pale art → deeper scrim.
- a11y: drawer counts in labels, fold label tracks state, SEAT escapes its strings.
- min/max heights on every button; STRIP clamps; stale comments corrected.

## Left as-is
- Fanned card titles clip (allowed, the peek prints them whole).
- Strip boxes are not keyboard targets (the sheet is the keyboard path; the HUD's Hit button is).
