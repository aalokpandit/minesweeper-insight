# Fix explanations, mobile access, timer, slowdowns and Auto-Clear stalls

## 1. Scrollable explanation box (desktop)
- Keep the explanation open while the pointer moves from the tile into the box; close only when the pointer leaves both (short grace period so the gap between tile and box doesn't close it).
- Tighten the content (smaller table spacing, collapse long clue lists) so most explanations fit without scrolling; the box stays scrollable for the long ones.

## 2. Explanations on phones: double-tap
- In Learn Mode on touch screens, double-tapping an unopened tile opens its explanation as a panel anchored to the bottom of the screen with a close button; tapping outside closes it.
- A single tap still reveals, after a short wait (~250 ms) to rule out a double tap. Only applies on touch and only while Learn Mode is on, so desktop clicks and Learn-Mode-off play keep instant reveals. Long-press flagging is unchanged.

## 3. Accurate timer
- Store the game start time and show elapsed seconds computed from the clock, so a busy moment can delay a repaint but never loses time.
- Heavy maths moves off the main thread (see 4), so the timer keeps ticking smoothly.

## 4. Sluggishness and freezes
Likely causes found in the code (to confirm with a timing test on large boards first):
- The solver tries every mine arrangement of each linked group of edge tiles; a long edge on Expert/large custom boards makes this explode and blocks the page — this is the probable "page stopped responding" cause, not a cache leak (nothing is kept between games).
- With Learn Mode and Auto-Clear both on, the solver runs twice per board change.
Fixes:
- Run the solver in a background worker; one shared result feeds the heatmap, safest-cell blink, Auto-Clear and explanations. A new board cancels the outdated calculation (worker restarted), and a new game discards any pending work.
- Speed up the solver: split groups further where clues don't actually interact, and prune counting with per-group memoisation, so large frontiers stay fast.
- While a calculation is running the board stays playable; the heatmap simply updates when ready.

## 5. Auto-Clear sometimes stalls
- Cause: Auto-Clear acts only on probabilities that are exactly 0 or 1, but rounding in the maths can give values like 0.9999999 or 1e-17, which display as 100%/0% yet are skipped. Use a tiny tolerance (and the same rule for the 0%/100% labels).
- Also make Auto-Clear re-run reliably after each pass using the shared worker result rather than its own timer chain.

## Technical details
- `src/lib/minesweeper.ts`: tolerance helper `isCertain`, solver refactor (pure, serialisable evidence so `explain` can be rebuilt on the main thread from worker output — keeps the AGENTS.md rule of explanations from cached evidence only).
- New `src/lib/solver.worker.ts` + `useProbabilityAnalysis` hook (cancel via terminate, keyed by board version).
- `src/hooks/use-delayed-explanation.ts` / `cell-explanation.tsx`: hoverable content with grace close; new mobile bottom-panel component; double-tap detection in `src/routes/index.tsx`.
- Timer from `startedAt` with `Date.now()`.
- Tests: tolerance (near-0/near-1 treated as certain), Auto-Clear acts on near-certain cells, solver result unchanged on existing cases, timer elapsed computation, double-tap vs single tap timing.
