import { solveProbabilities, type Cell } from "./minesweeper";

self.onmessage = (e: MessageEvent<{ id: number; board: Cell[]; w: number; h: number; m: number }>) => {
  const { id, board, w, h, m } = e.data;
  self.postMessage({ id, result: solveProbabilities(board, w, h, m) });
};
