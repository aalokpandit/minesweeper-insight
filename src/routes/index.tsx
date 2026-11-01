import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Cell, emptyBoard, placeMines, revealFrom, neighbors, analyzeProbabilities } from "@/lib/minesweeper";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProbabilityExplanationContent } from "@/components/probability-explanation";

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
  const [cellSize, setCellSize] = useState(32);
  const press = useRef<{ t?: number; long: boolean; touch: boolean }>({ long: false, touch: false });

  const newGame = (c = cfg) => {
    setCfg(c);
    setBoard(emptyBoard(c.w, c.h));
    setStatus("ready");
    setTime(0);
  };

  useEffect(() => {
    if (status !== "playing") return;
    const id = setInterval(() => setTime((t) => Math.min(999, t + 1)), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    const fit = () => {
      const avail = Math.min(window.innerWidth - 48, 1200);
      setCellSize(Math.max(18, Math.min(40, Math.floor(avail / cfg.w))));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [cfg.w]);

  const analysis = useMemo(
    () => (learn && status === "playing" ? analyzeProbabilities(board, cfg.w, cfg.h, cfg.m) : null),
    [learn, status, board, cfg],
  );

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
  const showText = cellSize >= 30;
  const pad = (n: number) => String(Math.max(-99, n)).padStart(3, "0");

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5">
        <h1 className="font-mono text-3xl font-bold tracking-tight">MINESWEEPER</h1>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {Object.entries(PRESETS).map(([name, p]) => {
            const active = cfg.w === p.w && cfg.h === p.h && cfg.m === p.m;
            return (
              <button key={name} onClick={() => newGame({ ...p })}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}>
                {name}
              </button>
            );
          })}
          <form className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              const w = Math.max(5, Math.min(50, custom.w)), h = Math.max(5, Math.min(30, custom.h));
              const m = Math.max(1, Math.min(w * h - 1, custom.m));
              setCustom({ w, h, m });
              newGame({ w, h, m });
            }}>
            {(["w", "h", "m"] as const).map((k) => (
              <label key={k} className="flex items-center gap-1 text-muted-foreground">
                {k === "w" ? "W" : k === "h" ? "H" : "Mines"}
                <input type="number" value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: +e.target.value })}
                  className="w-14 rounded border border-input bg-background px-1 py-0.5 text-foreground" />
              </label>
            ))}
            <button className="ml-1 rounded bg-secondary px-2 py-0.5 font-medium text-secondary-foreground hover:bg-muted">Custom</button>
          </form>
        </div>

        <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
          <input type="checkbox" checked={learn} onChange={(e) => setLearn(e.target.checked)} className="h-4 w-4 accent-primary" />
          <span className="font-medium">Learn Mode</span>
          <span className="text-muted-foreground">— colour tiles by exact mine probability</span>
        </label>

        <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between rounded-md bg-muted px-3 py-2">
            <span className="font-mono text-2xl font-bold text-destructive" aria-label="Mines left">{pad(cfg.m - flags)}</span>
            <button onClick={() => newGame()} aria-label="New game"
              className="rounded-md border border-border bg-card px-2 text-2xl transition-transform hover:scale-110 active:scale-95">{face}</button>
            <span className="font-mono text-2xl font-bold text-destructive" aria-label="Time">{pad(time)}</span>
          </div>
          <div className="overflow-auto">
            <TooltipProvider delayDuration={250} skipDelayDuration={100}>
            <div className="grid select-none gap-px bg-border" style={{ gridTemplateColumns: `repeat(${cfg.w}, ${cellSize}px)` }}
              onContextMenu={(e) => e.preventDefault()}>
              {board.map((c, i) => {
                const p = analysis?.probabilities[i];
                const hasP = p !== undefined && Number.isFinite(p) && !c.revealed;
                const pct = hasP && p !== undefined ? `${Math.round(p * 100)}%` : "";
                const explanation = hasP ? analysis?.explain(i) : null;
                const style: React.CSSProperties = { width: cellSize, height: cellSize, fontSize: cellSize * 0.5 };
                if (hasP && p !== undefined) style.backgroundColor = `hsl(${120 * (1 - p)} 70% 45%)`;
                const tile = (
                  <Button variant="ghost" style={style}
                    aria-label={`Row ${Math.floor(i / cfg.w) + 1}, column ${i % cfg.w + 1}${c.revealed ? c.mine ? ", mine" : `, revealed ${c.adj}` : c.flag === 1 ? ", flagged" : ", unopened"}${hasP ? `, ${pct} mine chance` : ""}`}
                    className={`flex rounded-none p-0 items-center justify-center font-mono font-bold leading-none transition-colors duration-150 ${
                      c.revealed ? (c.exploded ? "bg-destructive" : "bg-background") : pressedSet.has(i) ? "bg-background scale-95" : "bg-secondary hover:brightness-110 active:brightness-90"}`}
                    onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); setHeld(i); } }}
                    onMouseEnter={() => { if (held !== null) setHeld(i); }}
                    onMouseUp={(e) => { if (e.button === 1) { setHeld(null); if (board[i].revealed) reveal(i); } }}
                    onAuxClick={(e) => e.preventDefault()}
                    onPointerDown={(e) => {
                      if (e.pointerType !== "touch") return;
                      press.current = { long: false, touch: true, t: window.setTimeout(() => { press.current.long = true; toggleFlag(i); navigator.vibrate?.(30); }, 400) };
                    }}
                    onPointerUp={() => clearTimeout(press.current.t)}
                    onPointerLeave={() => clearTimeout(press.current.t)}
                    onClick={() => { if (press.current.long) { press.current.long = false; return; } reveal(i); }}
                    onContextMenu={(e) => { e.preventDefault(); if (!press.current.touch) toggleFlag(i); press.current.touch = false; }}>
                    {c.revealed
                      ? c.mine ? "💣" : c.adj ? <span style={{ color: NUM_COLORS[c.adj] }}>{c.adj}</span> : null
                      : c.flag === 1 ? (status === "lost" && !c.mine ? "❌" : "🚩")
                      : c.flag === 2 ? <span className="text-foreground">?</span>
                      : hasP && showText ? <span className="text-[0.55em] text-primary-foreground drop-shadow">{pct}</span> : null}
                  </Button>
                );
                return explanation ? (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>{tile}</TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={10} collisionPadding={12}
                      className="w-[420px] max-w-[calc(100vw-24px)] border border-border bg-popover p-4 text-popover-foreground shadow-lg">
                      <ProbabilityExplanationContent explanation={explanation} index={i} width={cfg.w} />
                    </TooltipContent>
                  </Tooltip>
                ) : <span key={i} className="contents">{tile}</span>;
              })}
            </div>
            </TooltipProvider>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {status === "won" ? "You cleared the field! 🎉" : status === "lost" ? "Boom. Click the face to try again." :
            "Left-click to reveal · Right-click or long-press to flag (again for ?) · Click a number to chord"}
        </p>
      </div>
    </main>
  );
}
