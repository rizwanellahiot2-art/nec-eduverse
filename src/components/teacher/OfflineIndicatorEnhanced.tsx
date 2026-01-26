import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { CloudOff, RefreshCw, Wifi, ChevronUp, Database, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface OfflineIndicatorEnhancedProps {
  isOnline: boolean;
  isSyncing: boolean;
  stats: {
    pending: number;
    synced: number;
    failed: number;
    byType: Record<string, number>;
  };
  lastSyncAt: Date | null;
  syncProgress: { current: number; total: number; currentType: string } | null;
  onSync: () => void;
}

const typeLabels: Record<string, string> = {
  attendance: "Attendance",
  period_log: "Period Logs",
  behavior_note: "Notes",
  homework: "Homework",
  quick_grade: "Grades",
  message: "Messages",
};

export function OfflineIndicatorEnhanced({
  isOnline,
  isSyncing,
  stats,
  lastSyncAt,
  syncProgress,
  onSync,
}: OfflineIndicatorEnhancedProps) {
  const [open, setOpen] = useState(false);
  
  const totalPending = stats.pending + stats.failed;
  
  // Don't show if online and nothing pending
  if (isOnline && totalPending === 0 && !isSyncing) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "fixed left-4 top-20 z-50 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg transition-all md:top-4",
            "hover:scale-105 active:scale-95",
            isOnline
              ? stats.failed > 0
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                : "bg-accent text-accent-foreground"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {isOnline ? (
            <>
              {isSyncing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wifi className="h-3.5 w-3.5" />
              )}
              <span>
                {isSyncing
                  ? "Syncing..."
                  : stats.failed > 0
                  ? `${stats.failed} failed`
                  : `${stats.pending} pending`}
              </span>
            </>
          ) : (
            <>
              <CloudOff className="h-3.5 w-3.5" />
              <span>Offline</span>
              {totalPending > 0 && (
                <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">
                  {totalPending}
                </Badge>
              )}
            </>
          )}
          <ChevronUp className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      
      <PopoverContent align="start" className="w-72 p-3" sideOffset={8}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  isOnline ? "bg-primary" : "bg-destructive"
                )}
              />
              <span className="text-sm font-medium">
                {isOnline ? "Online" : "Offline Mode"}
              </span>
            </div>
            
            {lastSyncAt && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(lastSyncAt, { addSuffix: true })}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Last sync: {format(lastSyncAt, "PPpp")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          
          {/* Sync Progress */}
          {syncProgress && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Syncing {typeLabels[syncProgress.currentType] || syncProgress.currentType}
                </span>
                <span className="font-mono">
                  {syncProgress.current}/{syncProgress.total}
                </span>
              </div>
              <Progress value={(syncProgress.current / syncProgress.total) * 100} className="h-1.5" />
            </div>
          )}
          
          {/* Pending Items by Type */}
          {Object.keys(stats.byType).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Pending changes:</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(stats.byType)
                  .filter(([_, count]) => count > 0)
                  .map(([type, count]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs"
                    >
                      <span>{typeLabels[type] || type}</span>
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        {count}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* Stats Summary */}
          {(stats.synced > 0 || stats.failed > 0) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {stats.synced > 0 && <span className="text-primary">✓ {stats.synced} synced</span>}
              {stats.failed > 0 && (
                <span className="text-destructive">✕ {stats.failed} failed</span>
              )}
            </div>
          )}
          
          {/* Sync Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing || !isOnline || stats.pending === 0}
            className="w-full"
          >
            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
          
          {!isOnline && (
            <p className="text-center text-xs text-muted-foreground">
              Changes will sync when you're back online
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
