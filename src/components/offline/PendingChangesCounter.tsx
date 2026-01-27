import { CloudUpload, AlertCircle, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PendingChangesCounterProps {
  pending: number;
  failed: number;
  synced: number;
  byType: Record<string, number>;
  isSyncing: boolean;
  isOnline: boolean;
  onSync: () => void;
  className?: string;
}

export function PendingChangesCounter({
  pending,
  failed,
  synced,
  byType,
  isSyncing,
  isOnline,
  onSync,
  className,
}: PendingChangesCounterProps) {
  const total = pending + failed;
  const hasIssues = failed > 0;
  const showCounter = total > 0 || isSyncing;

  if (!showCounter) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-1 text-emerald-600', className)}>
              <Check className="h-4 w-4" />
              <span className="text-xs font-medium">Synced</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>All changes synced ({synced} items)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const pendingTypes = Object.entries(byType)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSync}
            disabled={isSyncing || !isOnline}
            className={cn(
              'gap-2 px-2',
              hasIssues && 'text-destructive',
              className
            )}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasIssues ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CloudUpload className="h-4 w-4" />
            )}
            <Badge
              variant={hasIssues ? 'destructive' : 'secondary'}
              className="h-5 min-w-5 rounded-full px-1.5 text-[10px] font-bold"
            >
              {total}
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-medium">
              {isSyncing
                ? 'Syncing changes...'
                : `${pending} pending, ${failed} failed`}
            </p>
            {pendingTypes && (
              <p className="text-muted-foreground">{pendingTypes}</p>
            )}
            {!isOnline && (
              <p className="text-amber-600">
                Waiting for connection to sync
              </p>
            )}
            {hasIssues && isOnline && (
              <p className="text-destructive">
                Click to retry failed items
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
