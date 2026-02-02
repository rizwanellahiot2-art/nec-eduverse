import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useUniversalPrefetch } from "@/hooks/useUniversalPrefetch";
import { OwnerShell } from "@/components/tenant/OwnerShell";

// Import all owner modules
import { OwnerOverviewModule } from "@/pages/tenant/owner-modules/OwnerOverviewModule";
import { OwnerAcademicsModule } from "@/pages/tenant/owner-modules/OwnerAcademicsModule";
import { OwnerAdmissionsModule } from "@/pages/tenant/owner-modules/OwnerAdmissionsModule";
import { OwnerFinanceModule } from "@/pages/tenant/owner-modules/OwnerFinanceModule";
import { OwnerHrModule } from "@/pages/tenant/owner-modules/OwnerHrModule";
import { OwnerWellbeingModule } from "@/pages/tenant/owner-modules/OwnerWellbeingModule";
import { OwnerComplianceModule } from "@/pages/tenant/owner-modules/OwnerComplianceModule";
import { OwnerCampusesModule } from "@/pages/tenant/owner-modules/OwnerCampusesModule";
import { OwnerBrandModule } from "@/pages/tenant/owner-modules/OwnerBrandModule";
import { OwnerSecurityModule } from "@/pages/tenant/owner-modules/OwnerSecurityModule";
import { OwnerSupportModule } from "@/pages/tenant/owner-modules/OwnerSupportModule";
import { OwnerAdvisorModule } from "@/pages/tenant/owner-modules/OwnerAdvisorModule";
import { OwnerAIModule } from "@/pages/tenant/owner-modules/OwnerAIModule";
import { MessagesModule } from "@/pages/tenant/modules/MessagesModule";

// Cache key for owner auth
const OWNER_AUTHZ_CACHE = "eduverse_owner_authz_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedOwnerAuthz {
  schoolId: string;
  userId: string;
  authorized: boolean;
  timestamp: number;
}

function getCachedOwnerAuthz(schoolId: string, userId: string): boolean | null {
  try {
    const cached = localStorage.getItem(OWNER_AUTHZ_CACHE);
    if (!cached) return null;
    const data: CachedOwnerAuthz = JSON.parse(cached);
    if (
      data.schoolId === schoolId &&
      data.userId === userId &&
      Date.now() - data.timestamp < CACHE_DURATION
    ) {
      return data.authorized;
    }
    return null;
  } catch {
    return null;
  }
}

function setCachedOwnerAuthz(schoolId: string, userId: string, authorized: boolean) {
  try {
    const data: CachedOwnerAuthz = { schoolId, userId, authorized, timestamp: Date.now() };
    localStorage.setItem(OWNER_AUTHZ_CACHE, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

export default function OwnerDashboard() {
  const { schoolSlug } = useParams();
  const tenant = useTenantOptimized(schoolSlug);
  const { user, loading } = useSession();

  const schoolId = useMemo(
    () => (tenant.status === "ready" ? tenant.schoolId : null),
    [tenant.status, tenant.schoolId]
  );

  const [authzState, setAuthzState] = useState<"checking" | "ok" | "denied">("checking");
  const [authzMessage, setAuthzMessage] = useState<string | null>(null);

  const title = useMemo(() => {
    if (tenant.status === "ready") return `${tenant.school.name} • Owner`;
    return "EDUVERSE • Owner";
  }, [tenant.status, tenant.school]);

  // Universal prefetch for offline support
  useUniversalPrefetch({
    schoolId,
    userId: user?.id ?? null,
    enabled: !!schoolId && !!user && authzState === 'ok',
  });

  useEffect(() => {
    if (tenant.status !== "ready") return;
    if (!user) return;

    const schoolIdVal = tenant.schoolId;
    const userId = user.id;

    // Check cache first
    const cachedAuth = getCachedOwnerAuthz(schoolIdVal, userId);
    
    // If offline and we have cache, use it immediately
    if (!navigator.onLine && cachedAuth !== null) {
      setAuthzState(cachedAuth ? "ok" : "denied");
      if (!cachedAuth) {
        setAuthzMessage("You do not have the School Owner role for this institution.");
      }
      return;
    }

    // If we have valid cache, use it while we verify in background
    if (cachedAuth === true) {
      setAuthzState("ok");
      if (!navigator.onLine) return;
    } else {
      setAuthzState("checking");
    }

    // Skip network check if offline
    if (!navigator.onLine) {
      if (cachedAuth !== null) {
        setAuthzState(cachedAuth ? "ok" : "denied");
      }
      return;
    }

    let cancelled = false;

    (async () => {
      // Check platform super admin
      const { data: psa } = await supabase
        .from("platform_super_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (psa?.user_id) {
        setAuthzState("ok");
        setCachedOwnerAuthz(schoolIdVal, userId, true);
        return;
      }

      // Check school_owner role
      const { data: roleRow, error: roleErr } = await supabase
        .from("user_roles")
        .select("id")
        .eq("school_id", schoolIdVal)
        .eq("user_id", userId)
        .eq("role", "school_owner")
        .maybeSingle();

      if (cancelled) return;
      if (roleErr) {
        setAuthzState("denied");
        setAuthzMessage(roleErr.message);
        setCachedOwnerAuthz(schoolIdVal, userId, false);
        return;
      }
      if (!roleRow) {
        setAuthzState("denied");
        setAuthzMessage("You do not have the School Owner role for this institution.");
        setCachedOwnerAuthz(schoolIdVal, userId, false);
        return;
      }

      setAuthzState("ok");
      setCachedOwnerAuthz(schoolIdVal, userId, true);
    })();

    return () => {
      cancelled = true;
    };
  }, [tenant.status, tenant.schoolId, user]);

  // Don't show loading if we have cached user
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="rounded-3xl bg-surface p-6 shadow-elevated text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading executive dashboard…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/${tenant.slug}/auth`} replace />;
  }

  if (authzState === "denied") {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="max-w-md rounded-3xl bg-surface p-8 shadow-elevated text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="mt-4 font-display text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-sm text-muted-foreground">{authzMessage}</p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = `/${tenant.slug}/auth`;
            }}
            className="mt-6 rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <OwnerShell title={title} subtitle="Executive Command Center" schoolSlug={tenant.slug}>
      {authzState === "checking" && !getCachedOwnerAuthz(schoolId || "", user?.id || "") ? (
        <div className="rounded-3xl bg-surface p-8 shadow-elevated text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Verifying executive access…</p>
        </div>
      ) : (
        <Routes>
          <Route index element={<OwnerOverviewModule schoolId={schoolId} />} />
          <Route path="academics" element={<OwnerAcademicsModule schoolId={schoolId} />} />
          <Route path="admissions" element={<OwnerAdmissionsModule schoolId={schoolId} />} />
          <Route path="finance" element={<OwnerFinanceModule schoolId={schoolId} />} />
          <Route path="hr" element={<OwnerHrModule schoolId={schoolId} />} />
          <Route path="wellbeing" element={<OwnerWellbeingModule schoolId={schoolId} />} />
          <Route path="compliance" element={<OwnerComplianceModule schoolId={schoolId} />} />
          <Route path="campuses" element={<OwnerCampusesModule schoolId={schoolId} />} />
          <Route path="brand" element={<OwnerBrandModule schoolId={schoolId} />} />
          <Route path="security" element={<OwnerSecurityModule schoolId={schoolId} />} />
          <Route path="support" element={<OwnerSupportModule schoolId={schoolId} />} />
          <Route path="advisor" element={<OwnerAdvisorModule schoolId={schoolId} />} />
          <Route path="ai" element={<OwnerAIModule schoolId={schoolId} />} />
          <Route path="messages" element={<MessagesModule schoolId={schoolId} />} />
        </Routes>
      )}
    </OwnerShell>
  );
}
