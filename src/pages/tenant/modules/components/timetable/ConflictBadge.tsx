import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type ConflictInfo = {
  type: "teacher" | "room";
  message: string;
};

export function ConflictBadge({ conflicts }: { conflicts: ConflictInfo[] }) {
  if (conflicts.length === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" />
            {conflicts.length}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            {conflicts.map((c, i) => (
              <p key={i} className="text-xs">
                <span className="font-medium capitalize">{c.type}:</span> {c.message}
              </p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
