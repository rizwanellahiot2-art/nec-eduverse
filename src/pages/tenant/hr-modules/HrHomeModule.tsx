import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Users, Calendar, ClipboardList, Coins, FileText, Star, RefreshCw, WifiOff } from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useOfflineStaffMembers, useOfflineLeaveRequests, useOfflineContracts } from "@/hooks/useOfflineData";
import { OfflineDataBanner } from "@/components/offline/OfflineDataBanner";
import { Button } from "@/components/ui/button";

export function HrHomeModule() {
  const { schoolSlug } = useParams();
  const navigate = useNavigate();
  const tenant = useTenant(schoolSlug);
  const schoolId = useMemo(() => tenant.status === "ready" ? tenant.schoolId : null, [tenant.status, tenant.schoolId]);
  const basePath = `/${schoolSlug}/hr`;

  // Offline data hooks
  const { data: staff, loading: staffLoading, isOffline, isUsingCache: staffFromCache, refresh: refreshStaff } = useOfflineStaffMembers(schoolId);
  const { data: leaveRequests, isUsingCache: leavesFromCache } = useOfflineLeaveRequests(schoolId);
  const { data: contracts, isUsingCache: contractsFromCache } = useOfflineContracts(schoolId);

  const metrics = useMemo(() => ({
    totalStaff: staff.length,
    pendingLeaves: leaveRequests.filter(l => l.status === "pending").length,
    activeContracts: contracts.filter(c => c.status === "active").length,
  }), [staff, leaveRequests, contracts]);

  const loading = staffLoading;
  const isUsingCache = staffFromCache || leavesFromCache || contractsFromCache;

  if (loading && !isUsingCache) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OfflineDataBanner isOffline={isOffline} isUsingCache={isUsingCache} onRefresh={refreshStaff} />
      
      {/* Quick Actions - Top for better accessibility */}
      <div className="rounded-2xl bg-accent p-6">
        <p className="font-display text-lg font-semibold text-accent-foreground">Quick Actions</p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {[
            { label: "Add Staff", icon: Users, path: `${basePath}/directory` },
            { label: "Leave Requests", icon: Calendar, path: `${basePath}/leaves` },
            { label: "Mark Attendance", icon: ClipboardList, path: `${basePath}/attendance` },
            { label: "Payroll", icon: Coins, path: `${basePath}/salaries` },
            { label: "Contracts", icon: FileText, path: `${basePath}/contracts` },
            { label: "Reviews", icon: Star, path: `${basePath}/reviews` }
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => !isOffline && navigate(action.path)}
              disabled={isOffline}
              className="flex flex-col items-center gap-2 rounded-xl bg-background p-4 text-sm font-medium transition-all hover:scale-105 disabled:opacity-50"
            >
              <action.icon className="h-5 w-5" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: "Total Staff", value: metrics.totalStaff, icon: Users },
          { label: "Pending Leaves", value: metrics.pendingLeaves, icon: Calendar },
          { label: "Active Contracts", value: metrics.activeContracts, icon: FileText }
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-3xl bg-surface p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>

      {isOffline && staff.length === 0 && (
        <div className="rounded-2xl border bg-surface p-8 text-center">
          <WifiOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No cached HR data available. Connect to the internet to load data.</p>
        </div>
      )}
    </div>
  );
}