import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface DraftRestorationBannerProps {
  hasDraft: boolean;
  lastSavedAt?: Date | null;
  onRestore: () => void;
  onDiscard: () => void;
  className?: string;
}

export function DraftRestorationBanner({
  hasDraft,
  lastSavedAt,
  onRestore,
  onDiscard,
  className,
}: DraftRestorationBannerProps) {
  if (!hasDraft) return null;

  const timeAgo = lastSavedAt 
    ? formatDistanceToNow(lastSavedAt, { addSuffix: true })
    : 'recently';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <span className="text-sm">
          You have an unsaved draft from <span className="font-medium">{timeAgo}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
        >
          <X className="mr-1 h-3 w-3" />
          Discard
        </Button>
        <Button
          size="sm"
          onClick={onRestore}
          className="h-7 px-3 text-xs"
        >
          Restore Draft
        </Button>
      </div>
    </div>
  );
}
