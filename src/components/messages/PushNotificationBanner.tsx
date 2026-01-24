import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PushNotificationBannerProps {
  permission: NotificationPermission;
  supported: boolean;
  onRequestPermission: () => Promise<boolean>;
}

export function PushNotificationBanner({
  permission,
  supported,
  onRequestPermission,
}: PushNotificationBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // Don't show if not supported, already granted, or dismissed
  if (!supported || permission === "granted" || permission === "denied" || dismissed) {
    return null;
  }

  const handleRequest = async () => {
    setRequesting(true);
    await onRequestPermission();
    setRequesting(false);
  };

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Enable push notifications</p>
          <p className="text-xs text-muted-foreground">
            Get notified when you receive new messages
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleRequest}
          disabled={requesting}
        >
          {requesting ? "Enabling..." : "Enable"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
