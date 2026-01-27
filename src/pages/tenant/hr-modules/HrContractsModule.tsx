import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useOfflineContracts } from "@/hooks/useOfflineData";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { WifiOff } from "lucide-react";

export function HrContractsModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);
  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

  // Offline data hook
  const { data: cachedContracts, isUsingCache } = useOfflineContracts(schoolId);

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["hr_contracts", tenant.schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_contracts")
        .select("*")
        .eq("school_id", tenant.schoolId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: tenant.status === "ready" && !isOffline
  });

  // Use cached data when offline
  const displayContracts = useMemo(() => {
    if (isOffline || isUsingCache) {
      return cachedContracts.map(c => ({
        id: c.id,
        position: c.position,
        start_date: c.startDate,
        end_date: c.endDate,
        status: c.status,
      }));
    }
    return contracts || [];
  }, [contracts, cachedContracts, isOffline, isUsingCache]);

  return (
    <div className="space-y-6">
      {/* Offline Banner */}
      {isOffline && (
        <div className="rounded-2xl bg-warning/10 border border-warning/20 p-3 text-sm text-warning text-center">
          <WifiOff className="inline-block h-4 w-4 mr-2" />
          Offline Mode — Showing cached data
        </div>
      )}

      <Button disabled={isOffline}>Add Contract</Button>

      {isLoading && !isOffline ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : displayContracts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contracts found.</p>
      ) : (
        <div className="space-y-3">
          {displayContracts.map((contract) => (
            <div key={contract.id} className="rounded-2xl bg-accent p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{contract.position || "Contract"}</p>
                  <p className="text-sm text-muted-foreground">
                    {contract.start_date} → {contract.end_date || "Ongoing"}
                  </p>
                  <p className="mt-1 text-xs capitalize">{contract.status}</p>
                </div>
                <Button size="sm" variant="outline" disabled={isOffline}>
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}