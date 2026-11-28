# Minesweeper Insight

Minesweeper web app with **Learn Mode** exact mine-probability heatmaps, cell-level reasoning explanations, safest-cell highlights, and optional Auto-Clear. Deployed at [minesweeper.aalokdeep.com](https://minesweeper.aalokdeep.com) and synced with [Lovable](https://lovable.dev/projects/566ed658-4911-4780-80a4-7da904fabb5f).

## Features

- **Board Presets & Custom Mode:** Beginner (`9×9`, 10 mines), Intermediate (`16×16`, 40 mines), Expert (`30×16`, 99 mines), and Custom (clamped to `W: 5–50`, `H: 5–30`, `M: 1..(W×H - 1)`).
- **First-Click Guarantee:** Mines are placed lazily on the first reveal, excluding the 3×3 neighborhood around the clicked cell (falling back to excluding only the clicked cell on ultra-dense custom boards where `W×H - excluded < mines`).
- **Desktop & Touch Controls:**
  - Left click reveals; right click cycles flag (`🚩`) → question mark (`?`) → clear.
  - Left-click on a satisfied revealed number chords unflagged neighbors; holding middle mouse highlights unflagged neighbors (`pressedSet`) and chords on release.
  - Touch long-press (`400ms` + haptic `navigator.vibrate?.(30)`) toggles flags; in Learn Mode, double-tap within `300ms` opens a bottom-sheet explanation modal.
- **Responsive Viewport Fitting:** `ResizeObserver` scales cells (`9–36px`) to fit the viewport, displaying inline percentage numbers when `cellSize >= 22px`. A custom `short` landscape variant (`max-height: 520px`) switches to a compact horizontal layout.
- **Learn Mode:**
  - Colors unrevealed cells from green (`0%` safe) to red (`100%` mine) using exact constraint-satisfaction probabilities (player flags/`?` marks are ignored so user mistakes never bias probabilities).
  - Blinks cells tied for the exact minimum probability (`.safest-cell`; static emphasis under `prefers-reduced-motion`).
  - Hovering/focusing a cell for `1000ms` (with a `200ms` hover grace period) opens a detailed explanation tooltip and outlines all tiles in the same connected component (`.group-cell`).
- **Auto-Clear Mode:** Optional toggle (`Auto-Clear`) that waits for fresh worker analysis and chains `120ms` steps automatically flagging `100%` mines and revealing `0%` safe cells.
- **Timer & End State:** Wall-clock timer (`250ms` tick, capped at `999` seconds); loss reveals all mines and marks wrong flags (`❌`); win auto-flags remaining mines.

## Tech Stack

- **Framework:** TanStack Start (`1.168.60`, SPA mode via `@lovable.dev/vite-tanstack-config`), TanStack Router (`1.170.41`), TanStack Query (`^5.101.1`)
- **Frontend:** React `^19.2.0`, TypeScript `^5.8.3` (strict + `exactOptionalPropertyTypes` + `noPropertyAccessFromIndexSignature`), Tailwind CSS `^4.2.1` (OKLCH tokens), Radix UI / shadcn (`new-york`), `lucide-react`, `zod`
- **Build & Test:** Vite `^8.1.6` (resolved `8.4.0`), Vitest `^4.1.10`, Testing Library (`@testing-library/react`, `jsdom`), ESLint `^9.32.0`, Prettier `^3.7.3`
- **Package Manager:** **`bun`** (`bun.lock`, `bunfig.toml`, and CI all use `bun`; `postbuild` also calls `node -e`)

## Development Commands (Run with `bun`)

```bash
bun install                 # Install dependencies (respects bunfig.toml minimumReleaseAge = 86400s)
bun run dev                 # Start Vite dev server
bun run build               # Build SPA into .output/public (+ postbuild _shell.html -> index.html)
bun run build:dev           # Development-mode build
bun run preview             # Preview production build
bun run test                # Run Vitest suite once (vitest run)
bun run test:watch          # Run Vitest in watch mode
bun run lint                # Run ESLint
bun run format              # Format with Prettier
```

## Architecture & Solver Invariants

- **Exact CSP Solver (`src/lib/minesweeper.ts`):**
  - Reads only revealed tiles and adjacent counts (`!c.revealed`, `!c.mine`, `c.adj`).
  - Decomposes frontier tiles into independent connected components via Union-Find, orders variables by constraint traversal, and runs exact DFS backtracking (`counts[k]` and `cellCounts[k][i]`).
  - Uses log-space binomial weights `C(I, totalMines - m)` and polynomial convolution across components to compute exact marginal probabilities and uniform interior probability.
  - Uses `CERTAINTY_EPSILON = 1e-9` for `0%`/`100%` classification. Note: there is no node or timeout cap in the backtracking DFS; responsiveness relies on Web Worker cancellation on new player actions.
- **Web Worker & Anti-Flash Caching (`src/lib/solver.worker.ts`, `src/hooks/use-probability-analysis.ts`):**
  - Runs `solveProbabilities` in a module Worker (`Worker` undefined falls back synchronously for tests/jsdom).
  - Terminates and recreates busy workers on new moves, retaining the previous heatmap (`fresh: false`) until the current board's analysis finishes (`fresh: true`).
- **Lazy Explanation Invariant (`src/hooks/use-delayed-explanation.ts`, `src/components/cell-explanation.tsx`):**
  - `solveProbabilities` returns structured-clone-safe `Evidence`; `buildAnalysis` assembles plain-English explanations and scenario breakdowns lazily only when a `1000ms` dwell completes or touch double-tap triggers.
- **Server / Error Handling & CSRF (`src/server.ts`, `src/start.ts`, `src/lib/error-capture.ts`):**
  - `server.ts` recovers h3 swallowed 500 JSON responses into rendered HTML error pages; `start.ts` installs `errorMiddleware` and explicitly re-registers `createCsrfMiddleware` for server functions; `lovable-error-reporting.ts` forwards React error boundaries to Lovable preview hooks.
- **Tooling Guardrails:**
  - `vite.config.ts` delegates plugins to `@lovable.dev/vite-tanstack-config` (do not manually re-add bundled TanStack/React/Tailwind/Nitro plugins).
  - `bunfig.toml` enforces a 24-hour (`86400`s) npm `minimumReleaseAge` supply-chain guard (with exclusions limited to `@lovable.dev/*` packages).
  - `eslint.config.js` forbids Next.js `server-only` imports and enforces Prettier.

## CI/CD & Git Safety

- **Azure Static Web Apps:** `.github/workflows/azure-static-web-apps-blue-tree-00d6d3410.yml` builds with `bun install --frozen-lockfile && bun run build` and deploys `.output/public` (`skip_app_build: true`, `skip_deploy_on_missing_secrets: true`), paired with `public/staticwebapp.config.json` SPA rewrites.
- **Dependabot:** `.github/dependabot.yml` configures weekly Bun security updates (`open-pull-requests-limit: 0`).
- **Lovable Bidirectional Sync Guardrail:** Because `main` syncs bidirectionally with Lovable, **never** rewrite published git history (`git push --force`, `rebase`, `amend`, or `squash` on pushed commits). See [AGENTS.md](./AGENTS.md) for all repo invariants.
