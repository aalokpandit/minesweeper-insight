export type Cell = { mine: boolean; revealed: boolean; flag: 0 | 1 | 2; adj: number; exploded?: boolean };

export function neighbors(i: number, w: number, h: number): number[] {
  const x = i % w, y = (i / w) | 0, out: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h) out.push(ny * w + nx);
    }
  return out;
}

export function emptyBoard(w: number, h: number): Cell[] {
  return Array.from({ length: w * h }, () => ({ mine: false, revealed: false, flag: 0, adj: 0 }));
}

/** Places mines avoiding the 3x3 zone around safeIdx (falls back to just safeIdx if too dense). */
export function placeMines(board: Cell[], w: number, h: number, mines: number, safeIdx: number, rng = Math.random): Cell[] {
  const b = board.map((c) => ({ ...c, mine: false, adj: 0 }));
  let excluded = new Set([safeIdx, ...neighbors(safeIdx, w, h)]);
  if (w * h - excluded.size < mines) excluded = new Set([safeIdx]);
  const pool: number[] = [];
  for (let i = 0; i < w * h; i++) if (!excluded.has(i)) pool.push(i);
  for (let k = 0; k < mines && pool.length; k++) {
    const j = k + Math.floor(rng() * (pool.length - k));
    [pool[k], pool[j]] = [pool[j], pool[k]];
    b[pool[k]].mine = true;
  }
  for (let i = 0; i < b.length; i++) b[i].adj = neighbors(i, w, h).filter((n) => b[n].mine).length;
  return b;
}

/** Flood-fill reveal. Mutates and returns the given board copy. */
export function revealFrom(b: Cell[], w: number, h: number, start: number): Cell[] {
  const stack = [start];
  while (stack.length) {
    const i = stack.pop();
    if (i === undefined) break;
    const c = b[i];
    if (c.revealed || c.flag === 1) continue;
    c.revealed = true;
    c.flag = 0;
    if (!c.mine && c.adj === 0) for (const n of neighbors(i, w, h)) if (!b[n].revealed) stack.push(n);
  }
  return b;
}

function logC(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  let s = 0;
  k = Math.min(k, n - k);
  for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
  return s;
}

function convolve(a: number[], b: number[]): number[] {
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) if (a[i]) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return out;
}

/**
 * Exact mine probability for every unrevealed cell (NaN for revealed).
 * Flags are treated as unknown (player guesses are not trusted).
 */
export type ProbabilityScenario = {
  mines: number;
  arrangements?: number;
  mineArrangements?: number;
  likelihood: number;
  conditional: number;
  contribution: number;
};
export type ProbabilityExplanation = {
  probability: number;
  reason: string;
  clues: { index: number; mines: number; hidden: number }[];
  scenarios: ProbabilityScenario[];
  interior: boolean;
  interiorCells: number;
  totalMines: number;
};

/** Keeps the exact counting evidence so hovering never runs the solver again. */
export function analyzeProbabilities(b: Cell[], w: number, h: number, totalMines: number) {
  const n = b.length;
  const probs = new Array(n).fill(NaN);
  const constraints: { cells: number[]; need: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (!b[i].revealed || b[i].mine) continue;
    const cells = neighbors(i, w, h).filter((x) => !b[x].revealed);
    if (cells.length) constraints.push({ cells, need: b[i].adj });
  }
  // union-find over cells
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    let r = x;
    while (parent.get(r) !== r) {
      const next = parent.get(r);
      if (next === undefined) break;
      r = next;
    }
    parent.set(x, r);
    return r;
  };
  for (const c of constraints) {
    for (const x of c.cells) if (!parent.has(x)) parent.set(x, x);
    for (let k = 1; k < c.cells.length; k++) parent.set(find(c.cells[k]), find(c.cells[0]));
  }
  const groups = new Map<number, number[]>();
  for (const x of parent.keys()) {
    const r = find(x);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)?.push(x);
  }
  const comps: { cells: number[]; counts: number[]; cellCounts: number[][] }[] = [];
  for (const cellsRaw of groups.values()) {
    const set = new Set(cellsRaw);
    const cons = constraints.filter((c) => set.has(c.cells[0]));
    // order vars by constraint traversal for early pruning
    const order: number[] = [], seen = new Set<number>();
    for (const c of cons) for (const x of c.cells) if (!seen.has(x)) { seen.add(x); order.push(x); }
    const pos = new Map(order.map((x, i) => [x, i]));
    const m = order.length;
    const varCons: number[][] = order.map(() => []);
    cons.forEach((c, ci) => c.cells.forEach((x) => {
      const position = pos.get(x);
      if (position !== undefined) varCons[position].push(ci);
    }));
    const sum = new Array(cons.length).fill(0);
    const rem = cons.map((c) => c.cells.length);
    const assign = new Array(m).fill(0);
    const counts = new Array(m + 1).fill(0);
    const cellCounts: number[][] = Array.from({ length: m + 1 }, () => new Array(m).fill(0));
    const rec = (v: number, k: number) => {
      if (v === m) {
        counts[k]++;
        const cc = cellCounts[k];
        for (let i = 0; i < m; i++) if (assign[i]) cc[i]++;
        return;
      }
      for (const val of [0, 1]) {
        let ok = true;
        for (const ci of varCons[v]) {
          sum[ci] += val; rem[ci]--;
          if (sum[ci] > cons[ci].need || sum[ci] + rem[ci] < cons[ci].need) ok = false;
        }
        assign[v] = val;
        if (ok) rec(v + 1, k + val);
        for (const ci of varCons[v]) { sum[ci] -= val; rem[ci]++; }
      }
      assign[v] = 0;
    };
    rec(0, 0);
    comps.push({ cells: order, counts, cellCounts });
  }

  const unknown: number[] = [];
  for (let i = 0; i < n; i++) if (!b[i].revealed) unknown.push(i);
  const interior = unknown.filter((x) => !parent.has(x));
  const I = interior.length;
  const maxM = comps.reduce((s, c) => s + c.cells.length, 0);
  // weights w(m) = C(I, M - m), normalised in log space
  const logs = Array.from({ length: maxM + 1 }, (_, m) => logC(I, totalMines - m));
  const maxLog = Math.max(...logs.filter((x) => x > -Infinity), 0);
  const wt = logs.map((l) => (l === -Infinity ? 0 : Math.exp(l - maxLog)));

  const all = comps.reduce((acc, c) => convolve(acc, c.counts), [1]);
  let total = 0, interiorMines = 0;
  all.forEach((d, m) => {
    total += d * wt[m];
    if (I > 0) interiorMines += d * wt[m] * (totalMines - m) / I;
  });
  const evidence = new Map<number, ProbabilityScenario[]>();
  if (total === 0) return { probabilities: probs, explain: (_index: number): ProbabilityExplanation | null => null };
  for (const x of interior) probs[x] = interiorMines / total;
  comps.forEach((c, ci) => {
    const others = comps.reduce((acc, o, oi) => (oi === ci ? acc : convolve(acc, o.counts)), [1]);
    const g = c.counts.map((_, k) => others.reduce((s, d, m) => s + d * (wt[k + m] ?? 0), 0));
    c.cells.forEach((x, i) => {
      let s = 0;
      for (let k = 0; k < c.counts.length; k++) s += c.cellCounts[k][i] * g[k];
      probs[x] = s / total;
      evidence.set(x, c.counts.flatMap((count, k) => count && g[k] ? [{
        mines: k,
        arrangements: count,
        mineArrangements: c.cellCounts[k][i],
        likelihood: count * g[k] / total,
        conditional: c.cellCounts[k][i] / count,
        contribution: c.cellCounts[k][i] * g[k] / total,
      }] : []));
    });
  });
  const interiorScenarios = all.flatMap((count, m) => I > 0 && count * wt[m] > 0 ? [{
    mines: totalMines - m,
    likelihood: count * wt[m] / total,
    conditional: (totalMines - m) / I,
    contribution: count * wt[m] / total * (totalMines - m) / I,
  }] : []);
  const explain = (index: number): ProbabilityExplanation | null => {
    const probability = probs[index];
    if (probability === undefined || !Number.isFinite(probability)) return null;
    const direct = constraints.filter((c) => c.cells.includes(index));
    const forced = direct.find((c) => c.need === 0 || c.need === c.cells.length);
    const interior = !parent.has(index);
    let reason: string;
    if (forced) {
      const clueIndex = neighbors(index, w, h).find((n) => b[n].revealed && b[n].adj === forced.need &&
        neighbors(n, w, h).filter((x) => !b[x].revealed).every((x) => forced.cells.includes(x)));
      const location = clueIndex === undefined ? "A nearby clue" : `The clue at row ${Math.floor(clueIndex / w) + 1}, column ${clueIndex % w + 1}`;
      reason = forced.need === 0
        ? `${location} requires no mines among its ${forced.cells.length} unopened neighbours, so this tile is safe.`
        : `${location} needs ${forced.need} mines and has exactly ${forced.cells.length} unopened neighbours. Every one must be a mine.`;
    } else if (interior) {
      reason = `No revealed clue touches this tile. The ${I} tiles outside all clues share the mines left after satisfying the clues. Average the remaining-mine fraction over all compatible arrangements.`;
    } else {
      reason = `Nearby clues overlap, so their fractions cannot simply be averaged. Keep only arrangements satisfying every connected clue and the board's total of ${totalMines} mines, then count how often this tile is a mine.${probability === 0 ? " None of those arrangements puts a mine here." : probability === 1 ? " Every one puts a mine here." : ""}`;
    }
    return {
      probability, reason, interior, interiorCells: I, totalMines,
      clues: neighbors(index, w, h).filter((n) => b[n].revealed && !b[n].mine).map((n) => ({
        index: n, mines: b[n].adj, hidden: neighbors(n, w, h).filter((x) => !b[x].revealed).length,
      })),
      scenarios: interior ? interiorScenarios : evidence.get(index) ?? [],
    };
  };
  return { probabilities: probs, explain };
}

export function computeProbabilities(b: Cell[], w: number, h: number, totalMines: number): number[] {
  return analyzeProbabilities(b, w, h, totalMines).probabilities;
}
