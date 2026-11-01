import type { ReactElement } from "react";
import { useDelayedExplanation } from "@/hooks/use-delayed-explanation";
import { analyzeProbabilities } from "@/lib/minesweeper";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProbabilityExplanationContent } from "@/components/probability-explanation";

export function CellExplanation({ analysis, index, width, children }: {
  analysis: ReturnType<typeof analyzeProbabilities>; index: number; width: number; children: ReactElement;
}) {
  const { value, start, cancel } = useDelayedExplanation(() => analysis.explain(index), analysis);
  return (
    <Tooltip open={value !== null} onOpenChange={(open) => { if (!open) cancel(); }}>
      <TooltipTrigger asChild onPointerEnter={(e) => { if (e.pointerType !== "touch") start(); }}
        onPointerLeave={cancel} onPointerDown={cancel} onFocus={start} onBlur={cancel}>
        {children}
      </TooltipTrigger>
      {value && <TooltipContent side="bottom" sideOffset={10} collisionPadding={12}
        className="w-[420px] max-w-[calc(100vw-24px)] border border-border bg-popover p-4 text-popover-foreground shadow-lg">
        <ProbabilityExplanationContent explanation={value} index={index} width={width} />
      </TooltipContent>}
    </Tooltip>
  );
}