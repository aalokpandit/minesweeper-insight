import { describe, it, expect } from "vitest";
import { emptyBoard, placeMines, neighbors, computeProbabilities, analyzeProbabilities, safestCells } from "@/lib/minesweeper";

describe("minesweeper", () => {
  it("selects only the lowest exact probability, not rounded percentages", () => {
    expect([...safestCells([NaN, 0.101, 0.104, 0.8])]).toEqual([1]);
  });

  it("selects every cell tied for the lowest probability including zero", () => {
    expect([...safestCells([0.5, 0.2, 0.2, NaN])]).toEqual([1, 2]);
    expect([...safestCells([0, 1, 0, NaN])]).toEqual([0, 2]);
  });

  it("selects no cells when no finite probabilities are available", () => {
    expect([...safestCells([NaN, Infinity])]).toEqual([]);
  });
  it("explains two mines among two unopened neighbours as certain mines", () => {
    const b = emptyBoard(3, 1);
    b[1] = { mine: false, revealed: true, flag: 0, adj: 2 };
    const e = analyzeProbabilities(b, 3, 1, 2).explain(0);
    expect(e?.probability).toBe(1);
    expect(e?.clues).toEqual([{ index: 1, mines: 2, hidden: 2 }]);
    expect(e?.scenarios[0].conditional).toBe(1);
  });

  it("explains overlapping clues using full-board combinatorial weights", () => {
    // A,1,B,1,C,D,E: B alone leaves one mine in D/E (2 ways),
    // A+C leaves no mine in D/E (1 way). B is therefore 2/3, not 1/2.
    const b = emptyBoard(7, 1);
    b[1] = { mine: false, revealed: true, flag: 0, adj: 1 };
    b[3] = { mine: false, revealed: true, flag: 0, adj: 1 };
    const analysis = analyzeProbabilities(b, 7, 1, 2);
    const e = analysis.explain(2);
    expect(e?.probability).toBeCloseTo(2 / 3);
    expect(e?.scenarios.map((s) => s.mines)).toEqual([1, 2]);
    expect(e?.scenarios[0].likelihood).toBeCloseTo(2 / 3);
    expect(e?.scenarios[1].likelihood).toBeCloseTo(1 / 3);
    expect(e?.scenarios.reduce((sum, s) => sum + s.contribution, 0)).toBeCloseTo(analysis.probabilities[2]);
    const interior = analysis.explain(5);
    expect(interior?.interiorCells).toBe(2);
    expect(interior?.probability).toBeCloseTo(1 / 3);
    expect(interior?.scenarios.reduce((sum, s) => sum + s.contribution, 0)).toBeCloseTo(1 / 3);
    expect(analysis.explain(1)).toBeNull();
  });

  it("does not trust flags or consult hidden mines for explanations", () => {
    const b = emptyBoard(3, 1);
    b[1] = { mine: false, revealed: true, flag: 0, adj: 1 };
    const initial = analyzeProbabilities(b, 3, 1, 1).explain(0);
    b[0].flag = 1;
    b[0].mine = true;
    expect(analyzeProbabilities(b, 3, 1, 1).explain(0)).toEqual(initial);
  });
  it("first click keeps the 3x3 zone mine-free", () => {
    for (let t = 0; t < 50; t++) {
      const b = placeMines(emptyBoard(9, 9), 9, 9, 10, 40);
      expect(b.filter((c) => c.mine).length).toBe(10);
      for (const i of [40, ...neighbors(40, 9, 9)]) expect(b[i].mine).toBe(false);
    }
  });

  it("revealed 1 with two hidden neighbours gives 50% each", () => {
    // 3x1 row: [hidden, revealed 1, hidden], 1 mine total
    const b = emptyBoard(3, 1);
    b[1] = { mine: false, revealed: true, flag: 0, adj: 1 };
    const p = computeProbabilities(b, 3, 1, 1);
    expect(p[0]).toBeCloseTo(0.5);
    expect(p[2]).toBeCloseTo(0.5);
  });

  it("weights boundary configs against interior combinations", () => {
    // 4x1: [A, 1, B, C]; C is interior, 1 mine total -> C must be 0%
    const b = emptyBoard(4, 1);
    b[1] = { mine: false, revealed: true, flag: 0, adj: 1 };
    const p = computeProbabilities(b, 4, 1, 1);
    expect(p[3]).toBeCloseTo(0);
    expect(p[0]).toBeCloseTo(0.5);
  });
});
