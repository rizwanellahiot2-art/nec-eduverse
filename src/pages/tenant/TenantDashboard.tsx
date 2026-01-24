import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { BarChart3, LogOut, UserRound, Coins, UserPlus, ClipboardList, GraduationCap, FileText, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useTenant } from "@/hooks/useTenant";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { isEduverseRole, roleLabel, type EduverseRole } from "@/lib/eduverse-roles";
import { TenantShell } from "@/components/tenant/TenantShell";
import { Button } from "@/components/ui/button";
import { DashboardHome } from "@/pages/tenant/modules/DashboardHome";
import { AdminConsole } from "@/pages/tenant/modules/AdminConsole";
import { UsersModule } from "@/pages/tenant/modules/UsersModule";
import { CrmModule } from "@/pages/tenant/modules/CrmModule";
import { AcademicModule } from "@/pages/tenant/modules/AcademicModule";
import { AttendanceModule } from "@/pages/tenant/modules/AttendanceModule";
import { PlatformSchoolsModule } from "@/pages/tenant/modules/PlatformSchoolsModule";
import { AttendanceReportsModule } from "@/pages/tenant/modules/AttendanceReportsModule";
import { FinanceModule } from "@/pages/tenant/modules/FinanceModule";
import { PrincipalHome } from "@/pages/tenant/role-homes/PrincipalHome";
import { VicePrincipalHome } from "@/pages/tenant/role-homes/VicePrincipalHome";
import { SupportModule } from "@/pages/tenant/modules/SupportModule";
import { DirectoryModule } from "@/pages/tenant/modules/DirectoryModule";
import { TimetableBuilderModule } from "@/pages/tenant/modules/TimetableBuilderModule";
import { MessagesModule } from "@/pages/tenant/modules/MessagesModule";

const TenantDashboard = () => {
  const { schoolSlug, role: roleParam } = useParams();
  // Support route aliases that are nicer than DB enum values.
  // URL: /:schoolSlug/hr  -> DB role: hr_manager
  // URL: /:schoolSlug/marketing -> DB role: marketing_staff
  const roleAlias = useMemo(() => {
    if (!roleParam) return null;
    if (roleParam === "hr") return "hr_manager";
    if (roleParam === "marketing") return "marketing_staff";
    return roleParam;
  }, [roleParam]);
  const role = (isEduverseRole(roleAlias) ? roleAlias : null) as EduverseRole | null;
  const tenant = useTenant(schoolSlug);
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const schoolId = useMemo(() => 
    tenant.status === "ready" ? tenant.schoolId : null, 
    [tenant.status, tenant.schoolId]
  );

  const [authzState, setAuthzState] = useState<"checking" | "ok" | "denied">("checking");
  const [authzMessage, setAuthzMessage] = useState<string | null>(null);

  const title = useMemo(() => {
    if (tenant.status === "ready" && role) return `${tenant.school.name} • ${roleLabel[role]}`;
    if (tenant.status === "ready") return tenant.school.name;
    return "EDUVERSE";
  }, [tenant.status, tenant.school, role]);

  // Calculate month start for MTD queries
  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);

  // 7 days ago for attendance
  const d7Ago = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  // Realtime invalidation callback
  const invalidateKpiQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dashboard_kpi_revenue", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard_kpi_leads", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard_kpi_attendance", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard_kpi_students", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard_kpi_invoices", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard_kpi_staff", schoolId] });
  }, [queryClient, schoolId]);

  // Realtime subscriptions for KPIs
  useRealtimeTable({
    channel: `dashboard-kpi-payments-${schoolId}`,
    table: "finance_payments",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId,
    onChange: invalidateKpiQueries,
  });

  useRealtimeTable({
    channel: `dashboard-kpi-leads-${schoolId}`,
    table: "crm_leads",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId,
    onChange: invalidateKpiQueries,
  });

  useRealtimeTable({
    channel: `dashboard-kpi-attendance-${schoolId}`,
    table: "attendance_entries",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId,
    onChange: invalidateKpiQueries,
  });

  useRealtimeTable({
    channel: `dashboard-kpi-students-${schoolId}`,
    table: "students",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId,
    onChange: invalidateKpiQueries,
  });

  useRealtimeTable({
    channel: `dashboard-kpi-invoices-${schoolId}`,
    table: "finance_invoices",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId,
    onChange: invalidateKpiQueries,
  });

  useRealtimeTable({
    channel: `dashboard-kpi-staff-${schoolId}`,
    table: "school_memberships",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId,
    onChange: invalidateKpiQueries,
  });

  // Fetch Revenue (MTD payments)
  const { data: revenueMtd = 0 } = useQuery({
    queryKey: ["dashboard_kpi_revenue", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_payments")
        .select("amount")
        .eq("school_id", schoolId!)
        .gte("paid_at", monthStart.toISOString())
        .limit(1000);
      if (error) throw error;
      return (data || []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    },
    enabled: !!schoolId,
  });

  // Fetch Admissions (leads count & open leads)
  const { data: leadsData } = useQuery({
    queryKey: ["dashboard_kpi_leads", schoolId],
    queryFn: async () => {
      const [totalRes, openRes] = await Promise.all([
        supabase.from("crm_leads").select("id", { count: "exact", head: true }).eq("school_id", schoolId!),
        supabase.from("crm_leads").select("id", { count: "exact", head: true }).eq("school_id", schoolId!).not("stage_id", "is", null),
      ]);
      return {
        total: totalRes.count ?? 0,
        open: openRes.count ?? 0,
      };
    },
    enabled: !!schoolId,
  });

  // Fetch Attendance (7-day rate)
  const { data: attendanceData } = useQuery({
    queryKey: ["dashboard_kpi_attendance", schoolId],
    queryFn: async () => {
      const [entriesRes, presentRes] = await Promise.all([
        supabase
          .from("attendance_entries")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId!)
          .gte("created_at", d7Ago.toISOString()),
        supabase
          .from("attendance_entries")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId!)
          .eq("status", "present")
          .gte("created_at", d7Ago.toISOString()),
      ]);
      const total = entriesRes.count ?? 0;
      const present = presentRes.count ?? 0;
      return {
        total,
        present,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    },
    enabled: !!schoolId,
  });

  // Fetch Students count
  const { data: studentsCount = 0 } = useQuery({
    queryKey: ["dashboard_kpi_students", schoolId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!schoolId,
  });

  // Fetch Pending Invoices
  const { data: pendingInvoices = 0 } = useQuery({
    queryKey: ["dashboard_kpi_invoices", schoolId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("finance_invoices")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId!)
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!schoolId,
  });

  // Fetch Staff count
  const { data: staffData } = useQuery({
    queryKey: ["dashboard_kpi_staff", schoolId],
    queryFn: async () => {
      const [totalRes, teachersRes] = await Promise.all([
        supabase.from("school_memberships").select("id", { count: "exact", head: true }).eq("school_id", schoolId!),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("school_id", schoolId!).eq("role", "teacher"),
      ]);
      return {
        total: totalRes.count ?? 0,
        teachers: teachersRes.count ?? 0,
      };
    },
    enabled: !!schoolId,
  });

  useEffect(() => {
    if (!role) return;
    if (tenant.status !== "ready") return;
    if (!user) return;

    let cancelled = false;
    setAuthzState("checking");
    setAuthzMessage(null);

    (async () => {
      // Global platform Super Admin bypass
      const { data: psa, error: psaErr } = await supabase
        .from("platform_super_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (psaErr) {
        setAuthzState("denied");
        setAuthzMessage(psaErr.message);
        return;
      }
      if (psa?.user_id) {
        setAuthzState("ok");
        return;
      }

      const { data: membership, error: memErr } = await supabase
        .from("school_memberships")
        .select("id")
        .eq("school_id", tenant.schoolId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (memErr) {
        setAuthzState("denied");
        setAuthzMessage(memErr.message);
        return;
      }
      if (!membership) {
        setAuthzState("denied");
        setAuthzMessage("You are not a member of this school.");
        return;
      }

      const { data: roleRow, error: roleErr } = await supabase
        .from("user_roles")
        .select("id")
        .eq("school_id", tenant.schoolId)
        .eq("user_id", user.id)
        .eq("role", role)
        .maybeSingle();

      if (cancelled) return;
      if (roleErr) {
        setAuthzState("denied");
        setAuthzMessage(roleErr.message);
        return;
      }
      if (!roleRow) {
        setAuthzState("denied");
        setAuthzMessage(`You do not have the ${roleLabel[role]} role in this school.`);
        return;
      }

      setAuthzState("ok");
    })();

    return () => {
      cancelled = true;
    };
  }, [role, tenant.status, tenant.schoolId, user]);

  if (!role) return <Navigate to={`/${tenant.slug || ""}/auth`} replace />;

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

  return (
    <TenantShell title={title} subtitle="Role-isolated workspace" role={role} schoolSlug={tenant.slug}>
      <div className="flex flex-col gap-6">
        {/* Primary KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {/* Revenue KPI */}
          <div className="rounded-3xl bg-surface p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Revenue (MTD)</p>
              <Coins className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-primary">
              {revenueMtd.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">This month</p>
          </div>

          {/* Students KPI */}
          <div className="rounded-3xl bg-surface p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Students</p>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight">
              {studentsCount.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Enrolled</p>
          </div>

          {/* Staff KPI */}
          <div className="rounded-3xl bg-surface p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Staff</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight">
              {staffData?.total ?? 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{staffData?.teachers ?? 0} teachers</p>
          </div>

          {/* Admissions KPI */}
          <div className="rounded-3xl bg-surface p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Admissions</p>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight">
              {leadsData?.open ?? 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{leadsData?.total ?? 0} leads</p>
          </div>

          {/* Pending Invoices KPI */}
          <div className="rounded-3xl bg-surface p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Pending</p>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight">
              {pendingInvoices}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Invoices</p>
          </div>

          {/* Attendance KPI */}
          <div className="rounded-3xl bg-surface p-5 shadow-elevated">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Attendance</p>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight">
              {attendanceData?.rate ?? 0}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">7-day rate</p>
          </div>
        </div>

        <div className="rounded-3xl bg-surface p-6 shadow-elevated">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-xl font-semibold tracking-tight">Workspace</p>
              <p className="text-sm text-muted-foreground">You are signed in as {user.email}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="soft"
                onClick={() => navigate(`/${tenant.slug}/auth`)}
                className="justify-start"
              >
                <UserRound className="mr-2 h-4 w-4" /> Switch role
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate(`/${tenant.slug}/auth`);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </div>
          </div>

          {authzState !== "ok" && (
            <div className="mt-5 rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
              <p className="font-medium">Access check</p>
              <p className="mt-1">
                {authzState === "checking" ? "Verifying membership and role…" : authzMessage ?? "Access denied."}
              </p>
              {authzState === "denied" && (
                <div className="mt-3">
                  <Button
                    variant="hero"
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
        </div>

        {authzState === "ok" && (
          <Routes>
            <Route index element={
              role === "principal" ? <PrincipalHome /> : 
              role === "vice_principal" ? <VicePrincipalHome /> : 
              <DashboardHome />
            } />
            <Route path="admin" element={<AdminConsole />} />
            <Route path="schools" element={<PlatformSchoolsModule />} />
            <Route path="messages" element={<MessagesModule schoolId={tenant.schoolId} />} />
            <Route path="users" element={<UsersModule />} />
            <Route path="directory" element={<DirectoryModule />} />
            <Route path="crm" element={<CrmModule />} />
            <Route path="academic" element={<AcademicModule />} />
            <Route path="timetable" element={<TimetableBuilderModule />} />
            <Route path="attendance" element={<AttendanceModule />} />
            <Route path="finance" element={<FinanceModule />} />
            <Route path="reports" element={<AttendanceReportsModule />} />
            <Route path="support" element={<SupportModule schoolId={tenant.schoolId} />} />
            <Route path="*" element={<Navigate to={`/${tenant.slug}/${role}`} replace />} />
          </Routes>
        )}
      </div>
    </TenantShell>
  );
};

export default TenantDashboard;
