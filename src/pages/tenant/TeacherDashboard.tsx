import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useTenant } from "@/hooks/useTenant";
import { TeacherShell } from "@/components/tenant/TeacherShell";
import { Button } from "@/components/ui/button";

// Teacher modules
import { TeacherHome } from "@/pages/tenant/role-homes/TeacherHome";
import { TeacherStudentsModule } from "@/pages/tenant/teacher-modules/TeacherStudentsModule";
import { TeacherAttendanceModule } from "@/pages/tenant/teacher-modules/TeacherAttendanceModule";
import { TeacherHomeworkModule } from "@/pages/tenant/teacher-modules/TeacherHomeworkModule";
import { TeacherAssignmentsModule } from "@/pages/tenant/teacher-modules/TeacherAssignmentsModule";
import { TeacherBehaviorModule } from "@/pages/tenant/teacher-modules/TeacherBehaviorModule";
import { TeacherReportsModule } from "@/pages/tenant/teacher-modules/TeacherReportsModule";
import { TeacherTimetableModule } from "@/pages/tenant/teacher-modules/TeacherTimetableModule";
import { TeacherAdminInboxModule } from "@/pages/tenant/teacher-modules/TeacherAdminInboxModule";
import { TeacherWorkspaceMessagesModule } from "@/pages/tenant/teacher-modules/TeacherWorkspaceMessagesModule";
import { TeacherGradebookModule } from "@/pages/tenant/teacher-modules/TeacherGradebookModule";
import { TeacherProgressModule } from "@/pages/tenant/teacher-modules/TeacherProgressModule";
import { TeacherLessonPlannerModule } from "@/pages/tenant/teacher-modules/TeacherLessonPlannerModule";

const TeacherDashboard = () => {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const { user, loading } = useSession();
  const navigate = useNavigate();

  const [authzState, setAuthzState] = useState<"checking" | "ok" | "denied">("checking");
  const [authzMessage, setAuthzMessage] = useState<string | null>(null);

  useEffect(() => {
    if (tenant.status !== "ready") return;
    if (!user) return;

    let cancelled = false;
    setAuthzState("checking");
    setAuthzMessage(null);

    (async () => {
      // Check if user has teacher role in this school
      const { data: roleRow, error: roleErr } = await supabase
        .from("user_roles")
        .select("id")
        .eq("school_id", tenant.schoolId)
        .eq("user_id", user.id)
        .eq("role", "teacher")
        .maybeSingle();

      if (cancelled) return;
      if (roleErr) {
        setAuthzState("denied");
        setAuthzMessage(roleErr.message);
        return;
      }

      // Also check for platform super admin bypass
      if (!roleRow) {
        const { data: psa } = await supabase
          .from("platform_super_admins")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (!psa?.user_id) {
          setAuthzState("denied");
          setAuthzMessage("You do not have the Teacher role in this school.");
          return;
        }
      }

      setAuthzState("ok");
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

  if (!user) {
    return <Navigate to={`/${tenant.slug}/auth`} replace />;
  }

  const title = tenant.status === "ready" ? `${tenant.school.name} • Teacher` : "EDUVERSE";

  return (
    <TeacherShell title={title} subtitle="Teacher workspace" schoolSlug={tenant.slug}>
      <div className="flex flex-col gap-6">
        {/* User info bar */}
        <div className="rounded-2xl bg-accent/50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="soft"
                size="sm"
                onClick={() => navigate(`/${tenant.slug}/auth`)}
              >
                <UserRound className="mr-2 h-4 w-4" /> Switch role
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate(`/${tenant.slug}/auth`);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Access check */}
        {authzState !== "ok" && (
          <div className="rounded-2xl bg-destructive/10 p-4 text-sm">
            <p className="font-medium text-destructive">Access check</p>
            <p className="mt-1">
              {authzState === "checking" ? "Verifying teacher role…" : authzMessage ?? "Access denied."}
            </p>
            {authzState === "denied" && (
              <div className="mt-3">
                <Button
                  variant="hero"
                  size="sm"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate(`/${tenant.slug}/auth`);
                  }}
                >
                  Return to login
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Routes */}
        {authzState === "ok" && (
          <Routes>
            <Route index element={<TeacherHome />} />
            <Route path="students" element={<TeacherStudentsModule />} />
            <Route path="attendance" element={<TeacherAttendanceModule />} />
            <Route path="homework" element={<TeacherHomeworkModule />} />
            <Route path="assignments" element={<TeacherAssignmentsModule />} />
            <Route path="behavior" element={<TeacherBehaviorModule />} />
            <Route path="gradebook" element={<TeacherGradebookModule />} />
            <Route path="progress" element={<TeacherProgressModule />} />
            <Route path="lesson-plans" element={<TeacherLessonPlannerModule />} />
            <Route path="reports" element={<TeacherReportsModule />} />
            <Route path="timetable" element={<TeacherTimetableModule />} />
            <Route path="messages" element={<TeacherWorkspaceMessagesModule />} />
            <Route path="admin-inbox" element={<TeacherAdminInboxModule />} />
            <Route path="*" element={<Navigate to={`/${tenant.slug}/teacher`} replace />} />
          </Routes>
        )}
      </div>
    </TeacherShell>
  );
};

export default TeacherDashboard;
