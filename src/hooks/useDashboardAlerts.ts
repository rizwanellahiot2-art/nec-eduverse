import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { toast } from "@/components/ui/sonner";

export type DashboardAlert = {
  id: string;
  type: "support_ticket" | "low_attendance" | "pending_invoice";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  timestamp: string;
  entityId?: string;
  dismissed: boolean;
};

type AlertThresholds = {
  attendanceWarning: number;
  attendanceCritical: number;
  pendingInvoices: number;
  ticketHours: number;
};

const DEFAULT_THRESHOLDS: AlertThresholds = {
  attendanceWarning: 75,
  attendanceCritical: 60,
  pendingInvoices: 10,
  ticketHours: 24,
};

export function useDashboardAlerts(schoolId: string | null) {
  const qc = useQueryClient();
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [newTicketsCount, setNewTicketsCount] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);

  const enabled = !!schoolId;

  // Fetch alert settings
  const fetchSettings = useCallback(async () => {
    if (!schoolId) return DEFAULT_THRESHOLDS;

    const { data } = await supabase
      .from("school_alert_settings")
      .select("*")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (data) {
      const newThresholds = {
        attendanceWarning: data.attendance_warning_threshold ?? 75,
        attendanceCritical: data.attendance_critical_threshold ?? 60,
        pendingInvoices: data.pending_invoices_threshold ?? 10,
        ticketHours: data.support_ticket_hours ?? 24,
      };
      setThresholds(newThresholds);
      return newThresholds;
    }

    return DEFAULT_THRESHOLDS;
  }, [schoolId]);

  // Fetch initial data with thresholds
  const fetchData = useCallback(async (currentThresholds?: AlertThresholds) => {
    if (!schoolId) return;

    const useThresholds = currentThresholds ?? thresholds;
    const now = new Date();
    const d7 = new Date(now);
    d7.setDate(now.getDate() - 7);

    try {
      const [
        openTickets,
        entries7d,
        present7d,
        pendingInvoices,
      ] = await Promise.all([
        supabase
          .from("support_conversations")
          .select("id,student_id,status,created_at")
          .eq("school_id", schoolId)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("attendance_entries")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .gte("created_at", d7.toISOString()),
        supabase
          .from("attendance_entries")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("status", "present")
          .gte("created_at", d7.toISOString()),
        supabase
          .from("finance_invoices")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("status", "pending"),
      ]);

      const newAlerts: DashboardAlert[] = [];

      // Support ticket alerts - use configurable hours
      const tickets = openTickets.data ?? [];
      setNewTicketsCount(tickets.length);
      
      if (tickets.length > 0) {
        const recentTickets = tickets.filter(t => {
          const createdAt = new Date(t.created_at);
          const hoursAgo = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          return hoursAgo < useThresholds.ticketHours;
        });
        
        if (recentTickets.length > 0) {
          newAlerts.push({
            id: `support-${Date.now()}`,
            type: "support_ticket",
            title: "New Support Tickets",
            message: `${recentTickets.length} new ticket${recentTickets.length > 1 ? "s" : ""} in the last ${useThresholds.ticketHours}h`,
            severity: recentTickets.length >= 5 ? "critical" : "warning",
            timestamp: new Date().toISOString(),
            dismissed: false,
          });
        }
      }

      // Attendance alerts - use configurable thresholds
      const totalEntries = entries7d.count ?? 0;
      const presentEntries = present7d.count ?? 0;
      const rate = totalEntries > 0 ? Math.round((presentEntries / totalEntries) * 100) : 100;
      setAttendanceRate(rate);

      if (rate < useThresholds.attendanceWarning && totalEntries > 0) {
        newAlerts.push({
          id: `attendance-${Date.now()}`,
          type: "low_attendance",
          title: "Low Attendance Alert",
          message: `Weekly attendance is at ${rate}%, below the ${useThresholds.attendanceWarning}% threshold`,
          severity: rate < useThresholds.attendanceCritical ? "critical" : "warning",
          timestamp: new Date().toISOString(),
          dismissed: false,
        });
      }

      // Pending invoices alert - use configurable threshold
      const invoiceCount = pendingInvoices.count ?? 0;
      if (invoiceCount >= useThresholds.pendingInvoices) {
        newAlerts.push({
          id: `invoices-${Date.now()}`,
          type: "pending_invoice",
          title: "Pending Invoices",
          message: `${invoiceCount} invoices pending payment`,
          severity: invoiceCount >= useThresholds.pendingInvoices * 2 ? "critical" : "info",
          timestamp: new Date().toISOString(),
          dismissed: false,
        });
      }

      setAlerts(newAlerts);
      setInitialized(true);
    } catch (error) {
      console.error("Failed to fetch dashboard alerts:", error);
    }
  }, [schoolId, thresholds]);

  // Initialize: fetch settings then data
  useEffect(() => {
    const init = async () => {
      const loadedThresholds = await fetchSettings();
      await fetchData(loadedThresholds);
    };
    void init();
  }, [fetchSettings, fetchData]);

  // Combined refresh that reloads settings + data
  const refresh = useCallback(async () => {
    const loadedThresholds = await fetchSettings();
    await fetchData(loadedThresholds);
  }, [fetchSettings, fetchData]);

  // Real-time subscription for support tickets
  useRealtimeTable({
    channel: `rt:support_conversations:${schoolId ?? "none"}`,
    table: "support_conversations",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled,
    onChange: (payload: any) => {
      if (payload.eventType === "INSERT" && payload.new?.status === "open") {
        // New ticket arrived
        setNewTicketsCount((prev) => prev + 1);
        
        const newAlert: DashboardAlert = {
          id: `support-new-${payload.new.id}`,
          type: "support_ticket",
          title: "New Support Ticket",
          message: "A new support request has been submitted",
          severity: "warning",
          timestamp: new Date().toISOString(),
          entityId: payload.new.id,
          dismissed: false,
        };
        
        setAlerts((prev) => [newAlert, ...prev.filter(a => a.type !== "support_ticket" || a.id.includes("new-"))]);
        
        // Show toast notification
        toast.info("New Support Ticket", {
          description: "A new support request has been submitted",
          action: {
            label: "View",
            onClick: () => {
              // Navigate handled by parent
            },
          },
        });
      } else if (payload.eventType === "UPDATE" && payload.new?.status === "resolved") {
        setNewTicketsCount((prev) => Math.max(0, prev - 1));
      }
      
      // Refresh data
      void fetchData();
    },
  });

  // Real-time subscription for attendance
  useRealtimeTable({
    channel: `rt:attendance_entries:${schoolId ?? "none"}`,
    table: "attendance_entries",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled,
    onChange: () => {
      // Refresh attendance rate
      void fetchData();
    },
  });

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, dismissed: true } : a))
    );
  }, []);

  const activeAlerts = useMemo(
    () => alerts.filter((a) => !a.dismissed),
    [alerts]
  );

  const criticalCount = useMemo(
    () => activeAlerts.filter((a) => a.severity === "critical").length,
    [activeAlerts]
  );

  const warningCount = useMemo(
    () => activeAlerts.filter((a) => a.severity === "warning").length,
    [activeAlerts]
  );

  return {
    alerts: activeAlerts,
    allAlerts: alerts,
    newTicketsCount,
    attendanceRate,
    dismissAlert,
    refresh,
    criticalCount,
    warningCount,
    initialized,
    thresholds,
  };
}
