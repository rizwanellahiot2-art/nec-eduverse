import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSync: () => void;
}

export function OfflineIndicator({ isOnline, pendingCount, isSyncing, onSync }: Props) {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed left-4 top-20 z-50 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg transition-all md:top-4",
        isOnline
          ? "bg-accent text-accent-foreground"
          : "bg-destructive/10 text-destructive"
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="h-3.5 w-3.5" />
          <span>{pendingCount} pending</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-muted"
                onClick={onSync}
                disabled={isSyncing}
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sync pending changes</p>
            </TooltipContent>
          </Tooltip>
        </>
      ) : (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          <span>Offline Mode</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">
              {pendingCount}
            </span>
          )}
        </>
      )}
    </div>
  );
}
