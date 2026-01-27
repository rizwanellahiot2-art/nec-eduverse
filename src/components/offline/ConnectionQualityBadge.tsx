import { Wifi, WifiOff, WifiLow, Signal, Zap, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ConnectionQuality } from '@/hooks/useConnectionQuality';

interface ConnectionQualityBadgeProps {
  quality: ConnectionQuality;
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
  estimatedSyncTime?: string;
  pendingCount?: number;
  isSyncing?: boolean;
  className?: string;
  showDetails?: boolean;
}

const qualityConfig: Record<ConnectionQuality, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
}> = {
  offline: {
    icon: <WifiOff className="h-3.5 w-3.5" />,
    label: 'Offline',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
  },
  slow: {
    icon: <WifiLow className="h-3.5 w-3.5" />,
    label: 'Slow',
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
  },
  fair: {
    icon: <Wifi className="h-3.5 w-3.5" />,
    label: 'Fair',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
  },
  fast: {
    icon: <Signal className="h-3.5 w-3.5" />,
    label: 'Fast',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
  excellent: {
    icon: <Zap className="h-3.5 w-3.5" />,
    label: 'Excellent',
    color: 'text-green-600',
    bgColor: 'bg-green-500/10 border-green-500/20',
  },
};

export function ConnectionQualityBadge({
  quality,
  effectiveType,
  rtt,
  downlink,
  estimatedSyncTime,
  pendingCount = 0,
  isSyncing = false,
  className,
  showDetails = true,
}: ConnectionQualityBadgeProps) {
  const config = qualityConfig[quality];

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 transition-all',
        config.bgColor,
        config.color,
        isSyncing && 'animate-pulse',
        className
      )}
    >
      {isSyncing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        config.icon
      )}
      <span className="text-xs font-medium">{config.label}</span>
      {pendingCount > 0 && !isSyncing && (
        <span className="ml-0.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold">
          {pendingCount}
        </span>
      )}
    </Badge>
  );

  if (!showDetails) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Connection:</span>
              <span className="font-medium">{config.label}</span>
            </div>
            
            {effectiveType && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Network:</span>
                <span className="font-medium uppercase">{effectiveType}</span>
              </div>
            )}
            
            {rtt !== undefined && quality !== 'offline' && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Latency:</span>
                <span className="font-medium">{rtt}ms</span>
              </div>
            )}
            
            {downlink !== undefined && quality !== 'offline' && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Speed:</span>
                <span className="font-medium">{downlink} Mbps</span>
              </div>
            )}
            
            {pendingCount > 0 && (
              <>
                <div className="my-1.5 border-t" />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Pending:</span>
                  <span className="font-medium">{pendingCount} items</span>
                </div>
                {estimatedSyncTime && quality !== 'offline' && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Est. sync:</span>
                    <span className="font-medium">{estimatedSyncTime}</span>
                  </div>
                )}
              </>
            )}
            
            {quality === 'offline' && (
              <p className="mt-1 text-amber-600">
                Changes saved locally until connection restores
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
