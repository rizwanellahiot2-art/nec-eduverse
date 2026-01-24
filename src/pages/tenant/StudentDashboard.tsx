import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useTenant } from "@/hooks/useTenant";
import { useMyStudentId } from "@/hooks/useMyStudentId";
import { StudentShell } from "@/components/tenant/StudentShell";
import { StudentHomeModule } from "@/pages/tenant/student-modules/StudentHomeModule";
import { StudentAttendanceModule } from "@/pages/tenant/student-modules/StudentAttendanceModule";
import { StudentGradesModule } from "@/pages/tenant/student-modules/StudentGradesModule";
import { StudentTimetableModule } from "@/pages/tenant/student-modules/StudentTimetableModule";
import { StudentAssignmentsModule } from "@/pages/tenant/student-modules/StudentAssignmentsModule";
import { StudentCertificatesModule } from "@/pages/tenant/student-modules/StudentCertificatesModule";
import { StudentSupportModule } from "@/pages/tenant/student-modules/StudentSupportModule";
import { StudentMessagesModule } from "@/pages/tenant/student-modules/StudentMessagesModule";

const StudentDashboard = () => {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const { user, loading } = useSession();
  const [authzState, setAuthzState] = useState<"checking" | "ok" | "denied">("checking");

  const myStudent = useMyStudentId(tenant.status === "ready" ? tenant.schoolId : null);

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
        .eq("role", "student")
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
          <p className="mt-2 text-sm text-muted-foreground">You do not have Student access.</p>
        </div>
      </div>
    );
  }

  const title = `${tenant.school?.name || "EDUVERSE"} • Student`;

  return (
    <StudentShell title={title} subtitle="Read-only student portal" schoolSlug={tenant.slug}>
      {authzState === "ok" && (
        <Routes>
          <Route index element={<StudentHomeModule myStudent={myStudent} />} />
          <Route path="attendance" element={<StudentAttendanceModule myStudent={myStudent} schoolId={tenant.schoolId} />} />
          <Route path="grades" element={<StudentGradesModule myStudent={myStudent} schoolId={tenant.schoolId} />} />
          <Route path="timetable" element={<StudentTimetableModule myStudent={myStudent} schoolId={tenant.schoolId} />} />
          <Route path="assignments" element={<StudentAssignmentsModule myStudent={myStudent} schoolId={tenant.schoolId} />} />
          <Route path="certificates" element={<StudentCertificatesModule myStudent={myStudent} schoolId={tenant.schoolId} />} />
          <Route path="messages" element={<StudentMessagesModule />} />
          <Route path="support" element={<StudentSupportModule myStudent={myStudent} schoolId={tenant.schoolId} />} />
          <Route path="*" element={<Navigate to={`/${tenant.slug}/student`} replace />} />
        </Routes>
      )}
    </StudentShell>
  );
};

export default StudentDashboard;
