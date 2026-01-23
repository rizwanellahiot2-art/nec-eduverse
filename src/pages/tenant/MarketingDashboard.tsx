import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useTenant } from "@/hooks/useTenant";
import { MarketingShell } from "@/components/tenant/MarketingShell";
import { MarketingHomeModule } from "@/pages/tenant/marketing-modules/MarketingHomeModule";
import { MarketingLeadsModule } from "@/pages/tenant/marketing-modules/MarketingLeadsModule";
import { MarketingFollowUpsModule } from "@/pages/tenant/marketing-modules/MarketingFollowUpsModule";
import { MarketingCallsModule } from "@/pages/tenant/marketing-modules/MarketingCallsModule";
import { MarketingSourcesModule } from "@/pages/tenant/marketing-modules/MarketingSourcesModule";
import { MarketingCampaignsModule } from "@/pages/tenant/marketing-modules/MarketingCampaignsModule";
import { MarketingReportsModule } from "@/pages/tenant/marketing-modules/MarketingReportsModule";

const MarketingDashboard = () => {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const { user, loading } = useSession();
  const [authzState, setAuthzState] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    if (tenant.status !== "ready") return;
    if (!user) return;

    let cancelled = false;
    setAuthzState("checking");

    (async () => {
      const { data: psa } = await supabase
        .from("platform_super_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (psa?.user_id) {
        setAuthzState("ok");
        return;
      }

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("id")
        .eq("school_id", tenant.schoolId)
        .eq("user_id", user.id)
        .in("role", ["marketing_staff", "counselor"])
        .maybeSingle();

      if (cancelled) return;
      setAuthzState(roleRow ? "ok" : "denied");
    })();

    return () => {
      cancelled = true;
    };
  }, [tenant.status, tenant.schoolId, user]);

  if (loading) {
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
      {authzState === "ok" && (
        <Routes>
          <Route index element={<MarketingHomeModule />} />
          <Route path="leads" element={<MarketingLeadsModule />} />
          <Route path="follow-ups" element={<MarketingFollowUpsModule />} />
          <Route path="calls" element={<MarketingCallsModule />} />
          <Route path="sources" element={<MarketingSourcesModule />} />
          <Route path="campaigns" element={<MarketingCampaignsModule />} />
          <Route path="reports" element={<MarketingReportsModule />} />
          <Route path="*" element={<Navigate to={`/${tenant.slug}/marketing`} replace />} />
        </Routes>
      )}
    </MarketingShell>
  );
};

export default MarketingDashboard;
