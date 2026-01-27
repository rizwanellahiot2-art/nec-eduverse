// Offline Data Banner Component
// Shows when using cached data in offline mode

import { WifiOff, RefreshCw, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OfflineDataBannerProps {
  isOffline: boolean;
  isUsingCache: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function OfflineDataBanner({ 
  isOffline, 
  isUsingCache, 
  onRefresh,
  className 
}: OfflineDataBannerProps) {
  if (!isOffline && !isUsingCache) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border p-3 text-sm",
        isOffline 
          ? "border-warning/30 bg-warning/10 text-warning" 
          : "border-muted bg-muted/50 text-muted-foreground",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {isOffline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>📶 Offline Mode — Showing cached data</span>
          </>
        ) : (
          <>
            <CloudOff className="h-4 w-4" />
            <span>Using cached data</span>
          </>
        )}
      </div>
      
      {onRefresh && !isOffline && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-7 gap-1.5 text-xs"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      )}
    </div>
  );
}

// Simple loading fallback with offline awareness
interface OfflineAwareLoadingProps {
  loading: boolean;
  isOffline: boolean;
  hasData: boolean;
  children: React.ReactNode;
  loadingMessage?: string;
  emptyMessage?: string;
}

export function OfflineAwareLoading({
  loading,
  isOffline,
  hasData,
  children,
  loadingMessage = "Loading...",
  emptyMessage = "No data available",
}: OfflineAwareLoadingProps) {
  if (loading && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm">{loadingMessage}</p>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
        {isOffline ? (
          <>
            <WifiOff className="h-8 w-8" />
            <p className="text-sm">No cached data available offline</p>
          </>
        ) : (
          <p className="text-sm">{emptyMessage}</p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
