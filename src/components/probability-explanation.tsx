import type { ProbabilityExplanation } from "@/lib/minesweeper";

const percent = (value: number) => `${Number((value * 100).toFixed(2))}%`;
const count = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 0 });

export function ProbabilityExplanationContent({ explanation: e, index, width }: {
  explanation: ProbabilityExplanation; index: number; width: number;
}) {
  return (
    <div className="max-h-[60vh] space-y-2 overflow-y-auto text-xs leading-snug sm:text-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <span className="font-medium">Row {Math.floor(index / width) + 1}, column {index % width + 1}</span>
        <strong className="font-mono">{percent(e.probability)} mine chance</strong>
      </div>
      <p>{e.reason}</p>
      {e.clues.length > 0 && <div>
        <h3 className="mb-1 font-semibold">Clues touching this tile</h3>
        <ul className="space-y-1 text-muted-foreground">
          {e.clues.map((clue) => <li key={clue.index}>
            R{Math.floor(clue.index / width) + 1} C{clue.index % width + 1}: {clue.mines} {clue.mines === 1 ? "mine" : "mines"} among {clue.hidden} unopened neighbours
          </li>)}
        </ul>
      </div>}
      <div>
        <h3 className="mb-1 font-semibold">{e.interior ? "Remaining-mine scenarios" : "Compatible arrangements"}</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          {e.interior
            ? `Tile chance = remaining mines ÷ ${e.interiorCells} tiles outside the clues.`
            : "Group = all unopened tiles linked by overlapping clues. Tile chance = group arrangements with a mine here ÷ valid group arrangements."}
        </p>
        <table className="w-full text-left text-xs tabular-nums">
          <thead className="border-b border-border text-muted-foreground"><tr>
            <th className="py-1 pr-2 font-medium">{e.interior ? "Mines left" : "Group mines"}</th>
            <th className="py-1 pr-2 font-medium">Scenario share</th>
            <th className="py-1 pr-2 font-medium">Tile chance</th>
            <th className="py-1 font-medium">Adds</th>
          </tr></thead>
          <tbody>{e.scenarios.map((s) => <tr key={s.mines} className="border-b border-border">
            <td className="py-1 pr-2">{s.mines}</td>
            <td className="py-1 pr-2">{percent(s.likelihood)}</td>
            <td className="py-1 pr-2">
              {!e.interior && s.arrangements !== undefined && s.mineArrangements !== undefined &&
                <span className="block text-muted-foreground">{count(s.mineArrangements)} / {count(s.arrangements)}</span>}
              {e.interior && <span className="block text-muted-foreground">{s.mines} / {e.interiorCells}</span>}
              {percent(s.conditional)}
            </td>
            <td className="py-1">{percent(s.contribution)}</td>
          </tr>)}</tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">Each row adds scenario share × tile chance. Their sum is {percent(e.probability)} (rounding may affect the displayed sum).</p>
      </div>
      <p className="text-xs text-muted-foreground">Scenario shares count full-board completions: arrangements allowing more ways to place the remaining mines have more weight. All {e.totalMines} mines must fit. Flags and ? marks are guesses, not evidence.</p>
    </div>
  );
}