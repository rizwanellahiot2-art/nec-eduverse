import { Check, CheckCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  isRead: boolean;
  readAt?: string | null;
  className?: string;
}

export function ReadReceiptIndicator({ isRead, readAt, className }: Props) {
  if (!isRead) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Check className={cn("h-3.5 w-3.5 text-muted-foreground/50", className)} />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Delivered
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <CheckCheck className={cn("h-3.5 w-3.5 text-primary", className)} />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Read {readAt ? format(parseISO(readAt), "MMM d, h:mm a") : ""}
      </TooltipContent>
    </Tooltip>
  );
}

interface RecipientReadStatusProps {
  recipients: { user_id: string; name: string; is_read: boolean; read_at?: string | null }[];
}

export function RecipientReadStatus({ recipients }: RecipientReadStatusProps) {
  const readRecipients = recipients.filter((r) => r.is_read);
  const unreadRecipients = recipients.filter((r) => !r.is_read);

  return (
    <div className="space-y-2 text-xs">
      {readRecipients.length > 0 && (
        <div>
          <p className="font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <CheckCheck className="h-3 w-3 text-primary" /> Read by
          </p>
          <div className="space-y-1 pl-4">
            {readRecipients.map((r) => (
              <div key={r.user_id} className="flex items-center justify-between gap-2">
                <span className="truncate">{r.name}</span>
                {r.read_at && (
                  <span className="shrink-0 text-muted-foreground">
                    {format(parseISO(r.read_at), "MMM d, h:mm a")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {unreadRecipients.length > 0 && (
        <div>
          <p className="font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <Check className="h-3 w-3 text-muted-foreground/50" /> Delivered to
          </p>
          <div className="space-y-1 pl-4">
            {unreadRecipients.map((r) => (
              <span key={r.user_id} className="block truncate">
                {r.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
