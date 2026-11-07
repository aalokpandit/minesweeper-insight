# Fit the board to any screen

## Goal
The whole game (controls + board) always fits in the visible screen on phones, in portrait and landscape, with no scroll bars. On large screens tiles stop growing at a comfortable maximum size.

## What changes for the player
- **Phones, portrait:** board shrinks so Intermediate and Expert fit edge to edge; controls get more compact (smaller buttons, Custom form tucked into a small row).
- **Phones, landscape:** controls move to a narrow column beside the board instead of stacking above it, so the board gets almost all the screen height.
- **Big screens:** tiles cap at 36px, so the board stays a sensible size and is centred.
- Percentages inside tiles still show only when tiles are big enough; otherwise the 1-second hover/press explanation still works.
- Rotating the phone or resizing the window re-fits instantly.

## Technical details
- Replace the hard-coded "UI overhead" guesses in `src/routes/index.tsx` with real measurement: a `ResizeObserver` on the board area wrapper reads its actual width/height (after header and controls are laid out), subtracting card padding and the 1px grid gaps (`w-1` gaps per row/column).
- Cell size = `clamp(min, floor(min(availW / w, availH / h)), 36)` with min lowered to ~9px so a 30×16 Expert board fits a 360px-wide phone.
- Use `100dvh` for the page height so mobile browser toolbars don't cause overflow; remove `overflow-auto` around the grid (keep it only as a last-resort fallback for tiny custom boards like 50×30 on a phone).
- Landscape layout on short screens (`max-height: 520px` and landscape): two-column layout — controls/score bar on the left, board fills the right.
- Tighten mobile spacing: smaller title, smaller card padding, hide the long helper text on short screens.
- Verify with Playwright at 375×667, 667×375, 390×844, 844×390 and 1440×900 for Beginner, Intermediate and Expert: no page scroll, no grid scroll, tiles ≤36px on desktop.
