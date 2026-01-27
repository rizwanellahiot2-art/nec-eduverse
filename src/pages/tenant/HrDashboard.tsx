import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useSession } from "@/hooks/useSession";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useAuthz } from "@/hooks/useAuthz";
import { useUniversalPrefetch } from "@/hooks/useUniversalPrefetch";
import { HrShell } from "@/components/tenant/HrShell";
import { HrHomeModule } from "@/pages/tenant/hr-modules/HrHomeModule";
import { HrUsersModule } from "@/pages/tenant/hr-modules/HrUsersModule";
import { HrLeavesModule } from "@/pages/tenant/hr-modules/HrLeavesModule";
import { HrAttendanceModule } from "@/pages/tenant/hr-modules/HrAttendanceModule";
import { HrSalariesModule } from "@/pages/tenant/hr-modules/HrSalariesModule";
import { HrContractsModule } from "@/pages/tenant/hr-modules/HrContractsModule";
import { HrReviewsModule } from "@/pages/tenant/hr-modules/HrReviewsModule";
import { HrDocumentsModule } from "@/pages/tenant/hr-modules/HrDocumentsModule";
import { HrSupportModule } from "@/pages/tenant/hr-modules/HrSupportModule";
import { HrMessagesModule } from "@/pages/tenant/hr-modules/HrMessagesModule";
import { TimetableBuilderModule } from "@/pages/tenant/modules/TimetableBuilderModule";

const HrDashboard = () => {
  const { schoolSlug } = useParams();
  
  // Use optimized hooks with caching
  const tenant = useTenantOptimized(schoolSlug);
  const { user, loading } = useSession();

  const schoolId = useMemo(() => 
    tenant.status === "ready" ? tenant.schoolId : null, 
    [tenant.status, tenant.schoolId]
  );

  // Use optimized authorization hook
  const authz = useAuthz({
    schoolId,
    userId: user?.id ?? null,
    requiredRoles: ["hr_manager"],
  });
  const authzState = authz.state;

  // Universal prefetch for offline support
  useUniversalPrefetch({
    schoolId,
    userId: user?.id ?? null,
    enabled: !!schoolId && !!user && authzState === 'ok',
  });

  // Don't show loading if we have cached user
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="rounded-3xl bg-surface p-6 shadow-elevated">
          <p className="text-sm text-muted-foreground">Loading session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/${tenant.slug}/auth`} replace />;
  }

  if (authzState === "denied") {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="rounded-3xl bg-surface p-6 shadow-elevated">
          <p className="font-display text-xl font-semibold tracking-tight">Access Denied</p>
          <p className="mt-2 text-sm text-muted-foreground">You do not have HR Manager access.</p>
        </div>
      </div>
    );
  }

  return (
    <HrShell title={`${tenant.school?.name || "EDUVERSE"} • HR`} subtitle="Human Resources" schoolSlug={tenant.slug}>
      <Routes>
        <Route index element={<HrHomeModule />} />
        <Route path="users" element={<HrUsersModule />} />
        <Route path="leaves" element={<HrLeavesModule />} />
        <Route path="attendance" element={<HrAttendanceModule />} />
        <Route path="salaries" element={<HrSalariesModule />} />
        <Route path="contracts" element={<HrContractsModule />} />
        <Route path="reviews" element={<HrReviewsModule />} />
        <Route path="documents" element={<HrDocumentsModule />} />
        <Route path="support" element={<HrSupportModule />} />
        <Route path="messages" element={<HrMessagesModule />} />
        <Route path="timetable" element={<TimetableBuilderModule />} />
        <Route path="*" element={<Navigate to={`/${tenant.slug}/hr`} replace />} />
      </Routes>
    </HrShell>
  );
};

export default HrDashboard;
