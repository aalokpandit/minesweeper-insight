import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Cell, type ProbabilityExplanation, emptyBoard, placeMines, revealFrom, neighbors, safestCells, isCertainMine, isCertainSafe } from "@/lib/minesweeper";
import { useProbabilityAnalysis } from "@/hooks/use-probability-analysis";
import { ProbabilityExplanationContent } from "@/components/probability-explanation";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CellExplanation } from "@/components/cell-explanation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Minesweeper — with Learn Mode probabilities" },
      { name: "description", content: "Classic Minesweeper with exact mine probability heatmap, custom boards and touch controls." },
      { property: "og:title", content: "Minesweeper — Learn Mode" },
      { property: "og:description", content: "Play Minesweeper and see the exact chance of a mine under every tile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Game,
});

const PRESETS = {
  Beginner: { w: 9, h: 9, m: 10 },
  Intermediate: { w: 16, h: 16, m: 40 },
  Expert: { w: 30, h: 16, m: 99 },
} as const;
type Status = "ready" | "playing" | "won" | "lost";
const NUM_COLORS = ["", "#2563eb", "#16a34a", "#dc2626", "#7c3aed", "#b45309", "#0891b2", "#111827", "#6b7280"];

function Game() {
  const [cfg, setCfg] = useState({ w: 9, h: 9, m: 10 });
  const [custom, setCustom] = useState({ w: 20, h: 12, m: 40 });
  const [board, setBoard] = useState<Cell[]>(() => emptyBoard(9, 9));
  const [status, setStatus] = useState<Status>("ready");
  const [time, setTime] = useState(0);
  const [learn, setLearn] = useState(false);
  const [autoClear, setAutoClear] = useState(false);
  const [cellSize, setCellSize] = useState(32);
  const press = useRef<{ t?: number; long: boolean; touch: boolean }>({ long: false, touch: false });

  const newGame = (c = cfg) => {
    setCfg(c);
    setBoard(emptyBoard(c.w, c.h));
    setStatus("ready");
    setTime(0);
    setMobileExplain(null);
  };

  // Elapsed time comes from the clock, so a busy moment can delay a repaint but never loses seconds.
  const startedAt = useRef(0);
  useEffect(() => {
    if (status !== "playing") return;
    const tick = () => setTime(Math.min(999, Math.floor((Date.now() - startedAt.current) / 1000)));
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [status]);

  // Fit the board to the measured free area; cap tiles so large screens don't get a giant grid.
  const areaRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const fit = () => {
      const cardPad = window.innerWidth < 640 ? 18 : 26; // padding + border of the card
      const bar = (barRef.current?.offsetHeight ?? 36) + (window.innerWidth < 640 ? 8 : 12);
      const availW = area.clientWidth - cardPad - (cfg.w - 1);
      const availH = area.clientHeight - cardPad - bar - (cfg.h - 1);
      const calc = Math.floor(Math.min(availW / cfg.w, availH / cfg.h));
      setCellSize(Math.max(9, Math.min(36, calc)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(area);
    return () => ro.disconnect();
  }, [cfg.w, cfg.h]);

  const [mobileExplain, setMobileExplain] = useState<{ index: number; value: ProbabilityExplanation } | null>(null);
  const tap = useRef<{ index: number; at: number; t?: number }>({ index: -1, at: 0 });
  const shared = useProbabilityAnalysis(board, cfg.w, cfg.h, cfg.m, (learn || autoClear) && status === "playing");
  const analysis = learn ? shared : null;
  const safest = useMemo(() => analysis ? safestCells(analysis.probabilities) : new Set<number>(), [analysis]);
  useEffect(() => { setMobileExplain(null); }, [board]);

  // Auto-Clear: open every 0% tile and flag every 100% tile, repeating until nothing certain remains.
  useEffect(() => {
    if (!autoClear || status !== "playing" || !shared) return;
    const id = window.setTimeout(() => {
      const probs = shared.probabilities;
      let changed = false;
      const b = board.map((c) => ({ ...c }));
      probs.forEach((p, i) => {
        if (b[i].revealed) return;
        if (isCertainMine(p) && b[i].flag !== 1) { b[i].flag = 1; changed = true; }
        else if (isCertainSafe(p)) { b[i].flag = 0; revealFrom(b, cfg.w, cfg.h, i); changed = true; }
      });
      if (changed) setBoard(finish(b));
    }, 120);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoClear, status, shared]);

  const finish = (b: Cell[]) => {
    if (b.some((c) => c.revealed && c.mine)) {
      setStatus("lost");
      return b.map((c) => (c.mine ? { ...c, revealed: true } : c));
    }
    if (b.every((c) => c.mine || c.revealed)) {
      setStatus("won");
      return b.map((c) => (c.mine ? { ...c, flag: 1 as const } : c));
    }
    return b;
  };

  const reveal = (i: number) => {
    if (status === "won" || status === "lost") return;
    let b = board.map((c) => ({ ...c }));
    if (status === "ready") {
      b = placeMines(b, cfg.w, cfg.h, cfg.m, i);
      startedAt.current = Date.now();
      setStatus("playing");
    }
    const c = b[i];
    if (c.flag === 1) return;
    if (c.revealed) {
      // chord
      const ns = neighbors(i, cfg.w, cfg.h);
      if (c.adj === 0 || ns.filter((n) => b[n].flag === 1).length !== c.adj) return;
      ns.forEach((n) => { if (b[n].flag !== 1 && !b[n].revealed) { if (b[n].mine) b[n].exploded = true; revealFrom(b, cfg.w, cfg.h, n); } });
    } else {
      if (c.mine) c.exploded = true;
      revealFrom(b, cfg.w, cfg.h, i);
    }
    setBoard(finish(b));
  };

  const revealRef = useRef(reveal);
  revealRef.current = reveal;

  // Middle-button hold: "press" the cell (if hidden) and its hidden, unflagged neighbours
  const [held, setHeld] = useState<number | null>(null);
  useEffect(() => {
    const up = (e: MouseEvent) => { if (e.button === 1) setHeld(null); };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);
  const pressedSet = useMemo(() => {
    if (held === null || status === "won" || status === "lost") return new Set<number>();
    return new Set([held, ...neighbors(held, cfg.w, cfg.h)].filter((n) => !board[n].revealed && board[n].flag !== 1));
  }, [held, board, cfg, status]);

  const toggleFlag = (i: number) => {
    if (status === "won" || status === "lost" || board[i].revealed) return;
    setBoard((prev) => prev.map((c, j) => (j === i ? { ...c, flag: ((c.flag + 1) % 3) as 0 | 1 | 2 } : c)));
  };

  const flags = board.filter((c) => c.flag === 1).length;
  const face = status === "lost" ? "😵" : status === "won" ? "😎" : "🙂";
  const showText = cellSize >= 22;
  const pad = (n: number) => String(Math.max(-99, n)).padStart(3, "0");

  return (
    <main className="flex h-dvh flex-col gap-2 overflow-hidden bg-background px-2 py-2 text-foreground sm:gap-4 sm:px-4 sm:py-6 short:flex-row short:gap-3 short:py-2">
      <div className="mx-auto flex w-full max-w-6xl shrink-0 flex-col items-center gap-2 sm:gap-4 short:mx-0 short:w-64 short:justify-center short:overflow-y-auto">
        <h1 className="font-mono text-xl sm:text-3xl font-bold tracking-tight short:text-lg">MINESWEEPER</h1>

        <div className="flex flex-wrap items-center justify-center gap-2 short:gap-1">
          {Object.entries(PRESETS).map(([name, p]) => {
            const active = cfg.w === p.w && cfg.h === p.h && cfg.m === p.m;
            return (
              <button key={name} onClick={() => newGame({ ...p })}
                className={`rounded-md border px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm short:px-2! short:py-1! short:text-xs! font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}>
                {name}
              </button>
            );
          })}
          <form className="flex flex-wrap items-center justify-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs sm:text-sm short:text-xs"
            onSubmit={(e) => {
              e.preventDefault();
              const w = Math.max(5, Math.min(50, custom.w)), h = Math.max(5, Math.min(30, custom.h));
              const m = Math.max(1, Math.min(w * h - 1, custom.m));
              setCustom({ w, h, m });
              newGame({ w, h, m });
            }}>
            {(["w", "h", "m"] as const).map((k) => (
              <label key={k} className="flex items-center gap-1 text-muted-foreground">
                {k === "w" ? "W" : k === "h" ? "H" : "M"}
                <input type="number" value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: +e.target.value })}
                  className="w-12 sm:w-14 short:w-10 rounded border border-input bg-background px-1 py-0.5 text-foreground" />
              </label>
            ))}
            <button className="ml-1 rounded bg-secondary px-2 py-0.5 font-medium text-secondary-foreground hover:bg-muted">Custom</button>
          </form>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-1 sm:gap-y-2">
        <label className="flex cursor-pointer select-none items-center gap-2 text-xs sm:text-sm">
          <input type="checkbox" checked={autoClear} onChange={(e) => setAutoClear(e.target.checked)} className="h-4 w-4 accent-primary" />
          <span className="font-medium">Auto-Clear</span>
          <span className="text-muted-foreground hidden sm:inline short:hidden!">— open 0% tiles, flag 100% tiles</span>
        </label>
        <label className="flex cursor-pointer select-none items-center gap-2 text-xs sm:text-sm">
          <input type="checkbox" checked={learn} onChange={(e) => setLearn(e.target.checked)} className="h-4 w-4 accent-primary" />
          <span className="font-medium">Learn Mode</span>
          <span className="text-muted-foreground hidden sm:inline short:hidden!">— colour tiles by exact mine probability</span>
        </label>
        </div>
        <p className="hidden text-center text-xs text-muted-foreground short:block">
          {status === "won" ? "You cleared the field! 🎉" : status === "lost" ? "Boom. Tap the face to retry." : learn ? "Tap to reveal · double-tap to explain · long-press to flag" : "Tap to reveal · long-press to flag"}
        </p>
      </div>

      <section ref={areaRef} className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
        <div className="max-h-full max-w-full rounded-xl border border-border bg-card p-2 sm:p-3 shadow-lg">
          <div ref={barRef} className="mb-2 sm:mb-3 flex items-center justify-between rounded-md bg-muted px-3 py-1.5 sm:py-2">
            <span className="font-mono text-xl sm:text-2xl font-bold text-destructive" aria-label="Mines left">{pad(cfg.m - flags)}</span>
            <button onClick={() => newGame()} aria-label="New game"
              className="rounded-md border border-border bg-card px-2 text-xl sm:text-2xl transition-transform hover:scale-110 active:scale-95">{face}</button>
            <span className="font-mono text-xl sm:text-2xl font-bold text-destructive" aria-label="Time">{pad(time)}</span>
          </div>
          <div className="overflow-auto max-w-full">
            <TooltipProvider delayDuration={1000} skipDelayDuration={0}>
            <div className="grid select-none gap-px bg-border mx-auto w-max" style={{ gridTemplateColumns: `repeat(${cfg.w}, ${cellSize}px)` }}
              onContextMenu={(e) => e.preventDefault()}>
              {board.map((c, i) => {
                const p = analysis?.probabilities[i];
                const hasP = p !== undefined && Number.isFinite(p) && !c.revealed;
                const pct = hasP && p !== undefined ? isCertainSafe(p) ? "0%" : isCertainMine(p) ? "100%" : `${Math.round(p * 100)}%` : "";
                const style: React.CSSProperties = { width: cellSize, height: cellSize, fontSize: Math.max(9, cellSize * 0.55) };
                if (hasP && p !== undefined) style.backgroundColor = `hsl(${120 * (1 - p)} 70% 45%)`;
                const tile = (
                  <Button variant="ghost" style={style}
                    aria-label={`Row ${Math.floor(i / cfg.w) + 1}, column ${i % cfg.w + 1}${c.revealed ? c.mine ? ", mine" : `, revealed ${c.adj}` : c.flag === 1 ? ", flagged" : ", unopened"}${hasP ? `, ${pct} mine chance` : ""}`}
                    className={`flex rounded-none p-0 items-center justify-center font-mono font-bold leading-none transition-colors duration-150 ${safest.has(i) ? "safest-cell" : ""} ${
                      c.revealed ? (c.exploded ? "bg-destructive" : "bg-background") : pressedSet.has(i) ? "bg-background scale-95" : "bg-secondary hover:brightness-110 active:brightness-90"}`}
                    onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); setHeld(i); } }}
                    onMouseEnter={() => { if (held !== null) setHeld(i); }}
                    onMouseUp={(e) => { if (e.button === 1) { setHeld(null); if (board[i].revealed) reveal(i); } }}
                    onAuxClick={(e) => e.preventDefault()}
                    onPointerDown={(e) => {
                      if (e.pointerType !== "touch") { press.current.touch = false; return; }
                      press.current = { long: false, touch: true, t: window.setTimeout(() => { press.current.long = true; toggleFlag(i); navigator.vibrate?.(30); }, 400) };
                    }}
                    onPointerUp={() => clearTimeout(press.current.t)}
                    onPointerLeave={() => clearTimeout(press.current.t)}
                    onClick={() => {
                      if (press.current.long) { press.current.long = false; return; }
                      // Touch + Learn Mode: a double tap explains, a single tap reveals after a short wait.
                      if (press.current.touch && hasP && analysis) {
                        const now = Date.now();
                        clearTimeout(tap.current.t);
                        if (tap.current.index === i && now - tap.current.at < 300) {
                          tap.current = { index: -1, at: 0 };
                          const value = analysis.explain(i);
                          if (value) setMobileExplain({ index: i, value });
                          return;
                        }
                        tap.current = { index: i, at: now, t: window.setTimeout(() => { tap.current = { index: -1, at: 0 }; revealRef.current(i); }, 300) };
                        return;
                      }
                      reveal(i);
                    }}
                    onContextMenu={(e) => { e.preventDefault(); if (!press.current.touch) toggleFlag(i); press.current.touch = false; }}>
                    {c.revealed
                      ? c.mine ? "💣" : c.adj ? <span style={{ color: NUM_COLORS[c.adj] }}>{c.adj}</span> : null
                      : c.flag === 1 ? (status === "lost" && !c.mine ? "❌" : "🚩")
                      : c.flag === 2 ? <span className="text-foreground">?</span>
                      : hasP && showText ? <span className="text-[0.6em] text-primary-foreground drop-shadow leading-none">{pct}</span> : null}
                  </Button>
                );
                return hasP && analysis ? (
                  <CellExplanation key={i} analysis={analysis} index={i} width={cfg.w}>{tile}</CellExplanation>
                ) : <span key={i} className="contents">{tile}</span>;
              })}
            </div>
            </TooltipProvider>
          </div>
        </div>
      </section>

      {mobileExplain && (
        <div className="fixed inset-0 z-50 flex items-end bg-foreground/20" onClick={() => setMobileExplain(null)}>
          <div className="w-full rounded-t-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex justify-end">
              <button onClick={() => setMobileExplain(null)} className="rounded-md border border-border px-3 py-1 text-sm">Close</button>
            </div>
            <ProbabilityExplanationContent explanation={mobileExplain.value} index={mobileExplain.index} width={cfg.w} />
          </div>
        </div>
      )}

      <p className="shrink-0 text-center text-xs sm:text-sm text-muted-foreground short:hidden">
        {status === "won" ? "You cleared the field! 🎉" : status === "lost" ? "Boom. Click the face to try again." :
          "Left-click to reveal · Right-click or long-press to flag (again for ?) · Click a number to chord"}
      </p>
    </main>
  );
}
