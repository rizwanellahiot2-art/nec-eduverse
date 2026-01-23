import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { toast } from "@/components/ui/sonner";

export type AppNotification = {
  id: string;
  school_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

export function useNotifications(schoolId: string | null) {
  const { user } = useSession();
  const qc = useQueryClient();

  const enabled = !!user?.id && !!schoolId;

  const queryKey = useMemo(() => ["app_notifications", schoolId, user?.id], [schoolId, user?.id]);

  const query = useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_notifications")
        .select("id,school_id,user_id,type,title,body,entity_type,entity_id,read_at,created_at")
        .eq("school_id", schoolId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });

  useRealtimeTable({
    channel: `rt:app_notifications:${schoolId}:${user?.id ?? ""}`,
    table: "app_notifications",
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    enabled,
    onChange: () => {
      void qc.invalidateQueries({ queryKey });
    },
  });

  const unreadCount = useMemo(() => {
    return (query.data ?? []).filter((n) => !n.read_at).length;
  }, [query.data]);

  const markRead = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from("app_notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        await qc.invalidateQueries({ queryKey });
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to mark as read");
      }
    },
    [qc, queryKey],
  );

  return {
    ...query,
    unreadCount,
    markRead,
  };
}
