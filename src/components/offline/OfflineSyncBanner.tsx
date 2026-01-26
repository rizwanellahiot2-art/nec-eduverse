import { CloudOff, RefreshCw, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface OfflineSyncBannerProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  onSync: () => void;
  dismissible?: boolean;
  className?: string;
}

export function OfflineSyncBanner({
  isOnline,
  isSyncing,
  pendingCount,
  onSync,
  dismissible = true,
  className,
}: OfflineSyncBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Show banner only when offline OR has pending items
  if ((isOnline && pendingCount === 0) || dismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl px-4 py-3",
        !isOnline
          ? "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200"
          : "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {!isOnline ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
            <CloudOff className="h-4 w-4 text-amber-600" />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <RefreshCw className={cn("h-4 w-4 text-primary", isSyncing && "animate-spin")} />
          </div>
        )}
        
        <div>
          <p className="text-sm font-medium">
            {!isOnline
              ? "You're offline"
              : isSyncing
                ? "Syncing changes..."
                : `${pendingCount} pending change${pendingCount !== 1 ? "s" : ""}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {!isOnline
              ? "Changes will sync when you reconnect"
              : isSyncing
                ? "Please wait..."
                : "Click sync to upload your changes"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isOnline && pendingCount > 0 && (
          <Button
            variant="default"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
            className="gap-2"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync Now
          </Button>
        )}
        
        {dismissible && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
