import type { ProbabilityExplanation } from "@/lib/minesweeper";

const percent = (value: number) => `${Number((value * 100).toFixed(1))}%`;
const count = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 0 });
const letter = (i: number) => i < 26 ? String.fromCharCode(65 + i) : String(i + 1);
const plural = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;

export function ProbabilityExplanationContent({ explanation: e, index, width }: {
  explanation: ProbabilityExplanation; index: number; width: number;
}) {
  const certain = e.scenarios.length <= 1;
  return (
    <div className="max-h-[60vh] space-y-2 overflow-y-auto text-xs leading-snug sm:text-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <span className="font-medium">Row {Math.floor(index / width) + 1}, column {index % width + 1}</span>
        <strong className="font-mono">{percent(e.probability)} mine chance</strong>
      </div>
      <p>{e.reason}</p>
      {e.clues.length > 0 && <p className="text-muted-foreground">
        <span className="font-semibold text-foreground">Nearby clues: </span>
        {e.clues.map((c) => `R${Math.floor(c.index / width) + 1} C${c.index % width + 1} needs ${plural(c.mines, "mine")} among ${c.hidden} unopened`).join(" · ")}
      </p>}
      {e.interior ? <p>
        <span className="font-semibold">Open area: </span>
        {plural(e.interiorCells, "tile")} touch no clue. Whatever mines the clues don't use are spread evenly across them.
      </p> : <p>
        <span className="font-semibold">Connected group: </span>
        {plural(e.group.length, "unopened tile")} (outlined on the board) are linked by overlapping clues, so they're worked out together.
      </p>}
      {!certain && <div>
        <p className="mb-1 font-semibold">{e.interior ? "How many mines could be left out here:" : "How many mines the group could hold:"}</p>
        <ul className="space-y-1">
          {e.scenarios.map((s, i) => <li key={s.mines}>
            <span className="font-semibold">Scenario {letter(i)} ({percent(s.likelihood)} likely):</span>{" "}
            {e.interior
              ? <>{plural(s.mines, "mine")} left across {plural(e.interiorCells, "tile")}, so this tile has a <strong>{percent(s.conditional)}</strong> chance.</>
              : <>exactly {plural(s.mines, "mine")} in the group. In {count(s.mineArrangements ?? 0)} of {plural(s.arrangements ?? 0, "possible layout")}, this tile is a mine (<strong>{percent(s.conditional)}</strong>).</>}
          </li>)}
        </ul>
      </div>}
      <p><span className="font-semibold">Combined risk: </span>
        {certain ? "Every valid layout agrees" : "Weighting each scenario by how likely it is"}, this tile has a <strong>{percent(e.probability)}</strong> chance of hiding a mine.
      </p>
      <p className="text-xs text-muted-foreground">Scenarios that leave more ways to place the board's other mines are more likely. All {e.totalMines} mines must fit. Flags and ? marks are your guesses, so they're ignored.</p>
    </div>
  );
}
