import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PushNotificationOptions {
  schoolId: string | null;
  userId: string | null;
  enabled?: boolean;
}

export function usePushNotifications({ schoolId, userId, enabled = true }: PushNotificationOptions) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);

  // Check if notifications are supported
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  // Request permission
  const requestPermission = useCallback(async () => {
    if (!supported) return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch {
      return false;
    }
  }, [supported]);

  // Show notification
  const showNotification = useCallback((title: string, body: string, options?: { 
    icon?: string; 
    tag?: string; 
    onClick?: () => void;
  }) => {
    if (!supported || permission !== "granted") return null;

    try {
      const notification = new Notification(title, {
        body,
        icon: options?.icon || "/favicon.ico",
        tag: options?.tag || "message",
        requireInteraction: false,
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        options?.onClick?.();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return notification;
    } catch {
      return null;
    }
  }, [supported, permission]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!enabled || !schoolId || !userId || permission !== "granted") return;

    const channel = supabase
      .channel(`push-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_message_recipients",
          filter: `recipient_user_id=eq.${userId}`,
        },
        async (payload) => {
          // Fetch the message details
          const { data: message } = await supabase
            .from("admin_messages")
            .select("content, sender_user_id")
            .eq("id", payload.new.message_id)
            .maybeSingle();

          if (!message) return;

          // Fetch sender name
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", message.sender_user_id)
            .maybeSingle();

          const senderName = senderProfile?.display_name || "Someone";
          const preview = message.content.length > 50 
            ? message.content.substring(0, 50) + "..." 
            : message.content;

          showNotification(`New message from ${senderName}`, preview, {
            tag: `message-${payload.new.message_id}`,
            onClick: () => {
              // Focus on messages - could navigate to specific conversation
              window.focus();
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, schoolId, userId, permission, showNotification]);

  return {
    supported,
    permission,
    requestPermission,
    showNotification,
    isEnabled: supported && permission === "granted",
  };
}
