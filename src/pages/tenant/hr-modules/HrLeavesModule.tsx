import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useOfflineLeaveRequests } from "@/hooks/useOfflineData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import { WifiOff } from "lucide-react";

export function HrLeavesModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"requests" | "types" | "balances">("requests");

  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);
  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

  // Offline data hook
  const { data: cachedRequests, isUsingCache } = useOfflineLeaveRequests(schoolId);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["hr_leave_requests", tenant.schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_leave_requests")
        .select("*")
        .eq("school_id", tenant.schoolId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: tenant.status === "ready" && !isOffline
  });

  // Use cached data when offline
  const displayRequests = useMemo(() => {
    if (isOffline || isUsingCache) {
      return cachedRequests.map(r => ({
        id: r.id,
        user_id: r.userId,
        leave_type_id: r.leaveTypeId,
        start_date: r.startDate,
        end_date: r.endDate,
        days_count: r.daysCount,
        status: r.status,
        reason: r.reason,
      }));
    }
    return requests || [];
  }, [requests, cachedRequests, isOffline, isUsingCache]);
 
   const approveMutation = useMutation({
     mutationFn: async ({ id, status }: { id: string; status: string }) => {
       const { error } = await supabase
         .from("hr_leave_requests")
         .update({ status, reviewed_at: new Date().toISOString() })
         .eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["hr_leave_requests"] });
       toast.success("Leave request updated");
     }
   });
 
  return (
    <div className="space-y-6">
      {/* Offline Banner */}
      {isOffline && (
        <div className="rounded-2xl bg-warning/10 border border-warning/20 p-3 text-sm text-warning text-center">
          <WifiOff className="inline-block h-4 w-4 mr-2" />
          Offline Mode — Showing cached data. Actions are disabled.
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={() => setMode("requests")} variant={mode === "requests" ? "default" : "outline"}>
          Requests
        </Button>
        <Button onClick={() => setMode("types")} variant={mode === "types" ? "default" : "outline"}>
          Leave Types
        </Button>
        <Button onClick={() => setMode("balances")} variant={mode === "balances" ? "default" : "outline"}>
          Balances
        </Button>
      </div>

      {mode === "requests" && (
        <div className="space-y-3">
          {isLoading && !isOffline ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : displayRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave requests found.</p>
          ) : (
            displayRequests.map((req) => (
              <div key={req.id} className="rounded-2xl bg-accent p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{req.user_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {req.start_date} → {req.end_date} ({req.days_count} days)
                    </p>
                    <p className="mt-1 text-sm">{req.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    {req.status === "pending" && !isOffline && (
                      <>
                        <Button size="sm" onClick={() => approveMutation.mutate({ id: req.id, status: "approved" })}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => approveMutation.mutate({ id: req.id, status: "rejected" })}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {(req.status !== "pending" || isOffline) && (
                      <span className="rounded-lg bg-background px-3 py-1 text-sm font-medium capitalize">
                        {req.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
 
       {mode === "types" && (
         <div className="rounded-2xl bg-accent p-6">
           <p className="text-sm text-muted-foreground">Leave types management coming soon.</p>
         </div>
       )}
 
       {mode === "balances" && (
         <div className="rounded-2xl bg-accent p-6">
           <p className="text-sm text-muted-foreground">Leave balances coming soon.</p>
         </div>
       )}
     </div>
   );
 }