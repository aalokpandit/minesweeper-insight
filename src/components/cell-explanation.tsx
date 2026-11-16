import { useEffect, type ReactElement } from "react";
import { useDelayedExplanation } from "@/hooks/use-delayed-explanation";
import { analyzeProbabilities } from "@/lib/minesweeper";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProbabilityExplanationContent } from "@/components/probability-explanation";

export function CellExplanation({ analysis, index, width, onGroup, children }: {
  analysis: ReturnType<typeof analyzeProbabilities>; index: number; width: number; children: ReactElement;
  onGroup?: (cells: number[] | null) => void;
}) {
  const { value, start, cancel, closeSoon, keepOpen } = useDelayedExplanation(() => analysis.explain(index), analysis);
  useEffect(() => {
    if (!value) return;
    onGroup?.(value.group);
    return () => onGroup?.(null);
  }, [value, onGroup]);
  return (
    <Tooltip open={value !== null} onOpenChange={(open) => { if (!open) cancel(); }}>
      <TooltipTrigger asChild onPointerEnter={(e) => { if (e.pointerType !== "touch") start(); }}
        onPointerLeave={closeSoon} onPointerDown={cancel} onFocus={start} onBlur={cancel}>
        {children}
      </TooltipTrigger>
      {value && <TooltipContent side="bottom" sideOffset={10} collisionPadding={12}
        onPointerEnter={keepOpen} onPointerLeave={closeSoon}
        className="w-[420px] max-w-[calc(100vw-24px)] border border-border bg-popover p-4 text-popover-foreground shadow-lg">
        <ProbabilityExplanationContent explanation={value} index={index} width={width} />
      </TooltipContent>}
    </Tooltip>
  );
}