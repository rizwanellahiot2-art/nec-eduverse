import { useMemo } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";

import { useSession } from "@/hooks/useSession";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useAuthz } from "@/hooks/useAuthz";
import { useUniversalPrefetch } from "@/hooks/useUniversalPrefetch";
import { MarketingShell } from "@/components/tenant/MarketingShell";
import { MarketingHomeModule } from "@/pages/tenant/marketing-modules/MarketingHomeModule";
import { MarketingLeadsModule } from "@/pages/tenant/marketing-modules/MarketingLeadsModule";
import { MarketingFollowUpsModule } from "@/pages/tenant/marketing-modules/MarketingFollowUpsModule";
import { MarketingCallsModule } from "@/pages/tenant/marketing-modules/MarketingCallsModule";
import { MarketingSourcesModule } from "@/pages/tenant/marketing-modules/MarketingSourcesModule";
import { MarketingCampaignsModule } from "@/pages/tenant/marketing-modules/MarketingCampaignsModule";
import { MarketingReportsModule } from "@/pages/tenant/marketing-modules/MarketingReportsModule";
import { MarketingMessagesModule } from "@/pages/tenant/marketing-modules/MarketingMessagesModule";
import { TimetableBuilderModule } from "@/pages/tenant/modules/TimetableBuilderModule";

const MarketingDashboard = () => {
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
    requiredRoles: ["marketing_staff", "counselor"],
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

  if (!user) return <Navigate to={`/${tenant.slug}/auth`} replace />;

  if (authzState === "denied") {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="rounded-3xl bg-surface p-6 shadow-elevated">
          <p className="font-display text-xl font-semibold tracking-tight">Access Denied</p>
          <p className="mt-2 text-sm text-muted-foreground">You do not have Marketing/CRM access.</p>
        </div>
      </div>
    );
  }

  return (
    <MarketingShell title={`${tenant.school?.name || "EDUVERSE"} • Marketing`} subtitle="CRM & campaigns" schoolSlug={tenant.slug}>
      <Routes>
        <Route index element={<MarketingHomeModule />} />
        <Route path="leads" element={<MarketingLeadsModule />} />
        <Route path="follow-ups" element={<MarketingFollowUpsModule />} />
        <Route path="calls" element={<MarketingCallsModule />} />
        <Route path="sources" element={<MarketingSourcesModule />} />
        <Route path="campaigns" element={<MarketingCampaignsModule />} />
        <Route path="reports" element={<MarketingReportsModule />} />
        <Route path="messages" element={<MarketingMessagesModule />} />
        <Route path="timetable" element={<TimetableBuilderModule />} />
        <Route path="*" element={<Navigate to={`/${tenant.slug}/marketing`} replace />} />
      </Routes>
    </MarketingShell>
  );
};

export default MarketingDashboard;
