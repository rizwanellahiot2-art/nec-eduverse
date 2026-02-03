import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useMyChildren, ChildInfo } from "@/hooks/useMyChildren";
import { useUniversalPrefetch } from "@/hooks/useUniversalPrefetch";
import { ParentShell } from "@/components/tenant/ParentShell";

import ParentHomeModule from "./parent-modules/ParentHomeModule";
import ParentAttendanceModule from "./parent-modules/ParentAttendanceModule";
import ParentGradesModule from "./parent-modules/ParentGradesModule";
import ParentFeesModule from "./parent-modules/ParentFeesModule";
import ParentMessagesModule from "./parent-modules/ParentMessagesModule";
import ParentTimetableModule from "./parent-modules/ParentTimetableModule";
import ParentNotificationsModule from "./parent-modules/ParentNotificationsModule";
import ParentSupportModule from "./parent-modules/ParentSupportModule";
import ParentAIModule from "./parent-modules/ParentAIModule";

// Cache key for parent auth
const PARENT_AUTHZ_CACHE = "eduverse_parent_authz_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedParentAuthz {
  schoolId: string;
  userId: string;
  authorized: boolean;
  timestamp: number;
}

function getCachedParentAuthz(schoolId: string, userId: string): boolean | null {
  try {
    const cached = localStorage.getItem(PARENT_AUTHZ_CACHE);
    if (!cached) return null;
    const data: CachedParentAuthz = JSON.parse(cached);
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

function setCachedParentAuthz(schoolId: string, userId: string, authorized: boolean) {
  try {
    const data: CachedParentAuthz = { schoolId, userId, authorized, timestamp: Date.now() };
    localStorage.setItem(PARENT_AUTHZ_CACHE, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

const ParentDashboard = () => {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const tenant = useTenantOptimized(schoolSlug);

  const schoolId = tenant.status === "ready" ? tenant.schoolId : null;
  const { children: childList, loading: childrenLoading } = useMyChildren(schoolId);

  const [selectedChild, setSelectedChild] = useState<ChildInfo | null>(null);
  const [authzState, setAuthzState] = useState<"checking" | "ok" | "denied">("checking");
  const [authzMessage, setAuthzMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Universal prefetch for offline support
  useUniversalPrefetch({
    schoolId,
    userId: user?.id ?? null,
    enabled: !!schoolId && !!user && authzState === 'ok',
  });

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Authorization check
  useEffect(() => {
    if (sessionLoading || tenant.status === "loading") return;
    if (!user) {
      setAuthzState("denied");
      setAuthzMessage("Please sign in to access the Parent Portal.");
      return;
    }
    if (tenant.status === "error") {
      setAuthzState("denied");
      setAuthzMessage(tenant.error);
      return;
    }

    const userId = user.id;
    const schoolIdVal = tenant.schoolId;

    // Check cache first
    const cachedAuth = getCachedParentAuthz(schoolIdVal, userId);
    
    // If offline and we have cache, use it immediately
    if (!navigator.onLine && cachedAuth !== null) {
      setAuthzState(cachedAuth ? "ok" : "denied");
      if (!cachedAuth) {
        setAuthzMessage("You do not have parent access to this school.");
      }
      return;
    }

    // If we have valid cache, use it while we verify in background
    if (cachedAuth === true) {
      setAuthzState("ok");
      if (!navigator.onLine) return;
    } else if (cachedAuth === false) {
      setAuthzState("denied");
      setAuthzMessage("You do not have parent access to this school.");
      if (!navigator.onLine) return;
    } else {
      setAuthzState("checking");
    }

    // Skip network check if offline
    if (!navigator.onLine) {
      return;
    }

    const checkAuth = async () => {
      try {
        // Check if user has 'parent' role in this school
        const { data: roles, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("school_id", schoolIdVal)
          .eq("user_id", userId)
          .eq("role", "parent")
          .limit(1);

        if (error) {
          // On error, use cache if available
          if (cachedAuth !== null) {
            setAuthzState(cachedAuth ? "ok" : "denied");
          } else {
            setAuthzState("denied");
            setAuthzMessage("Authorization check failed.");
          }
          return;
        }

        const authorized = roles && roles.length > 0;
        setAuthzState(authorized ? "ok" : "denied");
        if (!authorized) {
          setAuthzMessage("You do not have parent access to this school.");
        }
        setCachedParentAuthz(schoolIdVal, userId, authorized);
      } catch {
        // On network error, use cache if available
        if (cachedAuth !== null) {
          setAuthzState(cachedAuth ? "ok" : "denied");
        }
      }
    };

    checkAuth();
  }, [user, sessionLoading, tenant, isOnline]);

  // Auto-select first child when loaded
  useEffect(() => {
    if (childList.length > 0 && !selectedChild) {
      setSelectedChild(childList[0]);
    }
  }, [childList, selectedChild]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/${schoolSlug}/auth`);
  };

  // Don't show loading if we have cached user and auth
  const cachedAuth = schoolId && user ? getCachedParentAuthz(schoolId, user.id) : null;
  if (sessionLoading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show loading only if truly checking (no cache)
  if (tenant.status === "loading" || (authzState === "checking" && cachedAuth === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Redirect to auth if denied
  if (authzState === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-destructive">{authzMessage}</p>
        <button
          className="text-primary underline"
          onClick={() => navigate(`/${schoolSlug}/auth`)}
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  // No children linked
  if (!childrenLoading && childList.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-muted-foreground">No children linked to your account.</p>
        <p className="text-sm text-muted-foreground">
          Please contact the school administration to link your children to your account.
        </p>
        <button className="text-primary underline" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    );
  }

  const schoolName = tenant.status === "ready" ? tenant.school.name : "School";

  return (
    <ParentShell
      schoolName={schoolName}
      schoolSlug={schoolSlug || ""}
      childList={childList}
      selectedChild={selectedChild}
      onSelectChild={setSelectedChild}
      onLogout={handleLogout}
    >
      <Routes>
        <Route index element={<ParentHomeModule child={selectedChild} schoolId={schoolId} />} />
        <Route path="ai-insights" element={<ParentAIModule child={selectedChild} schoolId={schoolId} />} />
        <Route path="attendance" element={<ParentAttendanceModule child={selectedChild} schoolId={schoolId} />} />
        <Route path="grades" element={<ParentGradesModule child={selectedChild} schoolId={schoolId} />} />
        <Route path="fees" element={<ParentFeesModule child={selectedChild} schoolId={schoolId} />} />
        <Route path="messages" element={<ParentMessagesModule child={selectedChild} schoolId={schoolId} />} />
        <Route path="timetable" element={<ParentTimetableModule child={selectedChild} schoolId={schoolId} />} />
        <Route path="notifications" element={<ParentNotificationsModule child={selectedChild} schoolId={schoolId} />} />
        <Route path="support" element={<ParentSupportModule child={selectedChild} schoolId={schoolId} />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </ParentShell>
  );
};

export default ParentDashboard;
