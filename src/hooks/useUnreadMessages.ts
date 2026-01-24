import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/useRealtime";

interface UnreadMessagesResult {
  unreadCount: number;
  loading: boolean;
}

export function useUnreadMessages(schoolId: string | null): UnreadMessagesResult {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setLoading(false);
        return;
      }
      setUserId(user.user.id);

      // Count unread messages where user is a recipient
      const { count } = await supabase
        .from("admin_message_recipients")
        .select("id, admin_messages!inner(school_id)", { count: "exact", head: true })
        .eq("recipient_user_id", user.user.id)
        .eq("is_read", false)
        .eq("admin_messages.school_id", schoolId);

      setUnreadCount(count || 0);
    } catch (err) {
      console.error("Error fetching unread messages:", err);
    }

    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    void fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Realtime subscription for new messages
  useRealtimeTable({
    channel: `unread-messages-${schoolId}`,
    table: "admin_message_recipients",
    enabled: !!schoolId && !!userId,
    onChange: () => void fetchUnreadCount(),
  });

  return { unreadCount, loading };
}
