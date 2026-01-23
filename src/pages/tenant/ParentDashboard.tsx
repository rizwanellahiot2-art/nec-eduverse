import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useTenant } from "@/hooks/useTenant";
import { useMyChildren, ChildInfo } from "@/hooks/useMyChildren";
import { ParentShell } from "@/components/tenant/ParentShell";

import ParentHomeModule from "./parent-modules/ParentHomeModule";
import ParentAttendanceModule from "./parent-modules/ParentAttendanceModule";
import ParentGradesModule from "./parent-modules/ParentGradesModule";
import ParentFeesModule from "./parent-modules/ParentFeesModule";
import ParentMessagesModule from "./parent-modules/ParentMessagesModule";
import ParentTimetableModule from "./parent-modules/ParentTimetableModule";
import ParentNotificationsModule from "./parent-modules/ParentNotificationsModule";
import ParentSupportModule from "./parent-modules/ParentSupportModule";

const ParentDashboard = () => {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const tenant = useTenant(schoolSlug);

  const schoolId = tenant.status === "ready" ? tenant.schoolId : null;
  const { children: childList, loading: childrenLoading } = useMyChildren(schoolId);

  const [selectedChild, setSelectedChild] = useState<ChildInfo | null>(null);
  const [authzState, setAuthzState] = useState<"checking" | "ok" | "denied">("checking");
  const [authzMessage, setAuthzMessage] = useState<string | null>(null);

  // Authorization check
  useEffect(() => {
    if (sessionLoading || tenant.status === "loading") return;
    if (!session) {
      setAuthzState("denied");
      setAuthzMessage("Please sign in to access the Parent Portal.");
      return;
    }
    if (tenant.status === "error") {
      setAuthzState("denied");
      setAuthzMessage(tenant.error);
      return;
    }

    const checkAuth = async () => {
      // Check if user has 'parent' role in this school
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("school_id", tenant.schoolId)
        .eq("user_id", session.user.id)
        .eq("role", "parent")
        .limit(1);

      if (error) {
        setAuthzState("denied");
        setAuthzMessage("Authorization check failed.");
        return;
      }

      if (!roles || roles.length === 0) {
        setAuthzState("denied");
        setAuthzMessage("You do not have parent access to this school.");
        return;
      }

      setAuthzState("ok");
    };

    checkAuth();
  }, [session, sessionLoading, tenant]);

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

  // Loading states
  if (sessionLoading || tenant.status === "loading" || authzState === "checking") {
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
