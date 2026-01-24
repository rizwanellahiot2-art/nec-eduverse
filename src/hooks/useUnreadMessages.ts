import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  // Realtime subscription for message recipient changes (new messages and read status updates)
  useEffect(() => {
    if (!schoolId || !userId) return;

    const channel = supabase
      .channel(`unread-messages-rt-${schoolId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_message_recipients",
          filter: `recipient_user_id=eq.${userId}`,
        },
        () => {
          void fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId, userId, fetchUnreadCount]);

  return { unreadCount, loading };
}
