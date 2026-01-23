import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationsBell({ schoolId }: { schoolId: string | null }) {
  const { data, unreadCount, isLoading, markRead, error } = useNotifications(schoolId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="soft" size="icon" aria-label="Notifications">
          <span className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span
                className={cn(
                  "absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full px-1",
                  "bg-primary text-primary-foreground text-[11px] font-semibold shadow-soft",
                )}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px]">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {error ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">Failed to load notifications.</div>
        ) : isLoading ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>
        ) : (data?.length ?? 0) === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">You’re all caught up.</div>
        ) : (
          <div className="max-h-[420px] overflow-auto">
            {(data ?? []).map((n) => (
              <DropdownMenuItem
                key={n.id}
                onSelect={(e) => {
                  e.preventDefault();
                  if (!n.read_at) void markRead(n.id);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-start gap-1 rounded-xl",
                  !n.read_at && "bg-accent/40",
                )}
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    {n.body ? <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p> : null}
                  </div>
                  {!n.read_at ? <Check className="mt-0.5 h-4 w-4 text-muted-foreground" /> : null}
                </div>
                <p className="text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
