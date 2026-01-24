import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Building2, LayoutGrid, LogOut, Search, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { usePlatformSuperAdmin } from "@/hooks/usePlatformSuperAdmin";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SchoolRow = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

 import { Navigate } from "react-router-dom";
 
 export default function PlatformDashboardPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const authz = usePlatformSuperAdmin(user?.id);

  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState<string>("__none__");

  const [kpis, setKpis] = useState({ schools: 0, students: 0, leads: 0, sessions: 0 });
  const [busy, setBusy] = useState(false);

  const activeSchool = useMemo(() => schools.find((s) => s.id === activeSchoolId) ?? null, [schools, activeSchoolId]);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  const refresh = async () => {
    if (!user || !authz.allowed) return;
    setBusy(true);
    try {
      const [{ data: schoolsData }, schoolsCount, studentsCount, leadsCount, sessionsCount] = await Promise.all([
        supabase.from("schools").select("id,slug,name,is_active,created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("schools").select("id", { count: "exact", head: true }),
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("crm_leads").select("id", { count: "exact", head: true }),
        supabase.from("attendance_sessions").select("id", { count: "exact", head: true }),
      ]);

      setSchools((schoolsData ?? []) as SchoolRow[]);
      setKpis({
        schools: schoolsCount.count ?? 0,
        students: studentsCount.count ?? 0,
        leads: leadsCount.count ?? 0,
        sessions: sessionsCount.count ?? 0,
      });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (authz.loading) return;
    if (!authz.allowed) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authz.loading, authz.allowed]);

  useEffect(() => {
    if (activeSchoolId !== "__none__") return;
    if (schools.length === 0) return;
    setActiveSchoolId(schools[0].id);
  }, [schools, activeSchoolId]);

  if (loading) {
    return null;
  }
  
  if (!authz.loading && !authz.allowed) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle className="font-display text-xl">Super Admin</CardTitle>
            <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" /> Global dashboard • All schools
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="soft" onClick={() => navigate("/super_admin/directory")}>
                <Search className="mr-2 h-4 w-4" /> Directory
              </Button>
              <Button variant="outline" onClick={async () => {
                await supabase.auth.signOut();
                navigate("/auth");
              }}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {!authz.loading && !authz.allowed && (
          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle className="font-display text-xl">Access</CardTitle>
              <p className="text-sm text-muted-foreground">Platform Super Admin only</p>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl bg-accent p-4 text-sm text-accent-foreground">{authz.message ?? "Access denied."}</div>
            </CardContent>
          </Card>
        )}

        {authz.allowed && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[{ label: "Schools", value: kpis.schools }, { label: "Students", value: kpis.students }, { label: "Leads", value: kpis.leads }, { label: "Attendance Sessions", value: kpis.sessions }].map((k) => (
                <div key={k.label} className="rounded-3xl bg-surface p-5 shadow-elevated">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{k.label}</p>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-3 font-display text-2xl font-semibold tracking-tight">{k.value.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Live count (RLS enforced)</p>
                </div>
              ))}
            </div>

            <Card className="shadow-elevated">
              <CardHeader>
                <CardTitle className="font-display text-xl">School Switcher</CardTitle>
                <p className="text-sm text-muted-foreground">Pick a school, then jump directly into its modules.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <Select value={activeSchoolId} onValueChange={setActiveSchoolId}>
                    <SelectTrigger className="md:max-w-md">
                      <SelectValue placeholder="Select a school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.slug} — {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Button variant="soft" disabled={busy} onClick={refresh}>
                      Refresh
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/super_admin/schools")}>
                      <Building2 className="mr-2 h-4 w-4" /> All Schools
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Button
                    variant="hero"
                    className="justify-start"
                    disabled={!activeSchool}
                    onClick={() => activeSchool && navigate(`/${activeSchool.slug}/super_admin`)}
                  >
                    <LayoutGrid className="mr-2 h-4 w-4" /> Open school workspace
                  </Button>

                  <Button
                    variant="soft"
                    className="justify-start"
                    disabled={!activeSchool}
                    onClick={() => activeSchool && navigate(`/${activeSchool.slug}/super_admin/academic`)}
                  >
                    Academic
                  </Button>

                  <Button
                    variant="soft"
                    className="justify-start"
                    disabled={!activeSchool}
                    onClick={() => activeSchool && navigate(`/${activeSchool.slug}/super_admin/crm`)}
                  >
                    CRM / Admissions
                  </Button>

                  <Button
                    variant="soft"
                    className="justify-start"
                    disabled={!activeSchool}
                    onClick={() => activeSchool && navigate(`/${activeSchool.slug}/super_admin/users`)}
                  >
                    Users & Roles
                  </Button>

                  <Button
                    variant="soft"
                    className="justify-start"
                    disabled={!activeSchool}
                    onClick={() => activeSchool && navigate(`/${activeSchool.slug}/super_admin/attendance`)}
                  >
                    Attendance
                  </Button>

                  <Button
                    variant="soft"
                    className="justify-start"
                    disabled={!activeSchool}
                    onClick={() => activeSchool && navigate(`/${activeSchool.slug}/bootstrap`)}
                  >
                    Bootstrap tools
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
