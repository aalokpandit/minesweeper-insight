import { describe, it, expect } from "vitest";
import { emptyBoard, placeMines, neighbors, computeProbabilities } from "@/lib/minesweeper";

describe("minesweeper", () => {
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
