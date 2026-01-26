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

// Cache key for student auth
const STUDENT_AUTHZ_CACHE = "eduverse_student_authz_cache";

interface CachedStudentAuthz {
  schoolId: string;
  userId: string;
  authorized: boolean;
  timestamp: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function getCachedStudentAuthz(schoolId: string, userId: string): boolean | null {
  try {
    const cached = localStorage.getItem(STUDENT_AUTHZ_CACHE);
    if (!cached) return null;
    const data: CachedStudentAuthz = JSON.parse(cached);
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

function setCachedStudentAuthz(schoolId: string, userId: string, authorized: boolean) {
  try {
    const data: CachedStudentAuthz = { schoolId, userId, authorized, timestamp: Date.now() };
    localStorage.setItem(STUDENT_AUTHZ_CACHE, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

const StudentDashboard = () => {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const { user, loading } = useSession();
  const [authzState, setAuthzState] = useState<"checking" | "ok" | "denied">("checking");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const myStudent = useMyStudentId(tenant.status === "ready" ? tenant.schoolId : null);

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

  useEffect(() => {
    if (tenant.status !== "ready") return;
    if (!user) return;

    const schoolId = tenant.schoolId;
    const userId = user.id;

    // Check cache first
    const cachedAuth = getCachedStudentAuthz(schoolId, userId);
    
    // If offline and we have cache, use it immediately
    if (!navigator.onLine && cachedAuth !== null) {
      setAuthzState(cachedAuth ? "ok" : "denied");
      return;
    }

    // If we have valid cache, use it while we verify in background
    if (cachedAuth === true) {
      setAuthzState("ok");
      // Only verify in background if online
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
      try {
        const { data: psa } = await supabase
          .from("platform_super_admins")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();
        if (cancelled) return;
        if (psa?.user_id) {
          setAuthzState("ok");
          setCachedStudentAuthz(schoolId, userId, true);
          return;
        }

        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("id")
          .eq("school_id", schoolId)
          .eq("user_id", userId)
          .eq("role", "student")
          .maybeSingle();
        if (cancelled) return;
        const authorized = !!roleRow;
        setAuthzState(authorized ? "ok" : "denied");
        setCachedStudentAuthz(schoolId, userId, authorized);
      } catch {
        // On network error, use cache if available
        if (cachedAuth !== null) {
          setAuthzState(cachedAuth ? "ok" : "denied");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenant.status, tenant.schoolId, user, isOnline]);

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
    </StudentShell>
  );
};

export default StudentDashboard;
