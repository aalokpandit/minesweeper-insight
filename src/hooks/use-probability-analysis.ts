import { useEffect, useRef, useState } from "react";
import { buildAnalysis, solveProbabilities, type Cell } from "@/lib/minesweeper";

type Analysis = ReturnType<typeof buildAnalysis>;

/** Solve once per board in a background worker; a newer board cancels the outdated solve. */
export function useProbabilityAnalysis(board: Cell[], w: number, h: number, m: number, enabled: boolean) {
  const [state, setState] = useState<{ board: Cell[]; analysis: Analysis } | null>(null);
  const worker = useRef<Worker | null>(null);
  const busy = useRef(false);
  const seq = useRef(0);
  useEffect(() => {
    if (!enabled) { setState(null); return; }
    const id = ++seq.current;
    if (typeof Worker === "undefined") {
      setState({ board, analysis: buildAnalysis(solveProbabilities(board, w, h, m), board, w, h, m) });
      return;
    }
    if (busy.current) { worker.current?.terminate(); worker.current = null; }
    if (!worker.current) worker.current = new Worker(new URL("../lib/solver.worker.ts", import.meta.url), { type: "module" });
    busy.current = true;
    worker.current.onmessage = (e) => {
      if (e.data.id !== id) return;
      busy.current = false;
      setState({ board, analysis: buildAnalysis(e.data.result, board, w, h, m) });
    };
    worker.current.postMessage({ id, board, w, h, m });
  }, [board, w, h, m, enabled]);
  useEffect(() => () => worker.current?.terminate(), []);
  // Keep showing the previous heatmap while the new one calculates, so tiles never flash blank.
  if (!enabled || !state) return { analysis: null, fresh: false };
  return { analysis: state.analysis, fresh: state.board === board };
}
