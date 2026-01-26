import { useMemo } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { useAuthz } from "@/hooks/useAuthz";
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
  
  // Use optimized hooks with caching
  const tenant = useTenantOptimized(schoolSlug);
  const { user, loading } = useSession();
  const navigate = useNavigate();

  const schoolId = useMemo(() => 
    tenant.status === "ready" ? tenant.schoolId : null, 
    [tenant.status, tenant.schoolId]
  );

  // Use optimized authorization hook
  const authz = useAuthz({
    schoolId,
    userId: user?.id ?? null,
    requiredRoles: ["teacher"],
  });
  const authzState = authz.state;
  const authzMessage = authz.message;

  // Don't show loading screen if we have cached session data
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

  const title = tenant.status === "ready" ? `${tenant.school?.name} • Teacher` : "EDUVERSE";

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

        {/* Access check - only show if denied (not while checking with cache) */}
        {authzState === "denied" && (
          <div className="rounded-2xl bg-destructive/10 p-4 text-sm">
            <p className="font-medium text-destructive">Access Denied</p>
            <p className="mt-1">{authzMessage ?? "You do not have access to this area."}</p>
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
          </div>
        )}

        {/* Routes - show if OK or checking (with cached auth) */}
        {authzState !== "denied" && (
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
