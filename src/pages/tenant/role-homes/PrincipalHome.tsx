import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BarChart3, Coins, GraduationCap, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type Kpis = {
  students: number;
  teachers: number;
  leads: number;
  attendanceEntries7d: number;
  attendancePresent7d: number;
  revenueMtd: number;
  expensesMtd: number;
};

export function PrincipalHome() {
  const { schoolSlug, role } = useParams();
  const tenant = useTenant(schoolSlug);
  const navigate = useNavigate();

  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);
  const [kpis, setKpis] = useState<Kpis>({
    students: 0,
    teachers: 0,
    leads: 0,
    attendanceEntries7d: 0,
    attendancePresent7d: 0,
    revenueMtd: 0,
    expensesMtd: 0,
  });
  const [trend, setTrend] = useState<{ day: string; revenue: number; expenses: number }[]>([]);
  const [busy, setBusy] = useState(false);

  const attendanceRate = useMemo(() => {
    if (kpis.attendanceEntries7d === 0) return 0;
    return Math.round((kpis.attendancePresent7d / kpis.attendanceEntries7d) * 100);
  }, [kpis.attendanceEntries7d, kpis.attendancePresent7d]);

  const monthStart = useMemo(() => {
    const d = new Date();
    const ms = new Date(d.getFullYear(), d.getMonth(), 1);
    return ms;
  }, []);

  const refresh = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      const now = new Date();
      const d7 = new Date(now);
      d7.setDate(now.getDate() - 7);

      const [
        studentsCount,
        teachersCount,
        leadsCount,
        entries7,
        present7,
        payments,
        expenses,
      ] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("role", "teacher"),
        supabase.from("crm_leads").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase
          .from("attendance_entries")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .gte("created_at", d7.toISOString()),
        supabase
          .from("attendance_entries")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("status", "present")
          .gte("created_at", d7.toISOString()),
        supabase
          .from("finance_payments")
          .select("amount,paid_at")
          .eq("school_id", schoolId)
          .gte("paid_at", monthStart.toISOString())
          .order("paid_at", { ascending: true })
          .limit(1000),
        supabase
          .from("finance_expenses")
          .select("amount,expense_date")
          .eq("school_id", schoolId)
          .gte("expense_date", monthStart.toISOString().slice(0, 10))
          .order("expense_date", { ascending: true })
          .limit(1000),
      ]);

      const revenueMtd = (payments.data ?? []).reduce((sum, r: any) => sum + Number(r.amount ?? 0), 0);
      const expensesMtd = (expenses.data ?? []).reduce((sum, r: any) => sum + Number(r.amount ?? 0), 0);

      setKpis({
        students: studentsCount.count ?? 0,
        teachers: teachersCount.count ?? 0,
        leads: leadsCount.count ?? 0,
        attendanceEntries7d: entries7.count ?? 0,
        attendancePresent7d: present7.count ?? 0,
        revenueMtd,
        expensesMtd,
      });

      // Build day buckets for chart (MTD)
      const byDay = new Map<string, { revenue: number; expenses: number }>();
      const fmt = (d: Date) => d.toISOString().slice(5, 10);
      for (let i = 0; i < 31; i++) {
        const d = new Date(monthStart);
        d.setDate(monthStart.getDate() + i);
        if (d.getMonth() !== monthStart.getMonth()) break;
        byDay.set(fmt(d), { revenue: 0, expenses: 0 });
      }
      (payments.data ?? []).forEach((p: any) => {
        const k = fmt(new Date(p.paid_at));
        const cur = byDay.get(k) ?? { revenue: 0, expenses: 0 };
        cur.revenue += Number(p.amount ?? 0);
        byDay.set(k, cur);
      });
      (expenses.data ?? []).forEach((e: any) => {
        const k = String(e.expense_date).slice(5, 10);
        const cur = byDay.get(k) ?? { revenue: 0, expenses: 0 };
        cur.expenses += Number(e.amount ?? 0);
        byDay.set(k, cur);
      });
      setTrend(Array.from(byDay.entries()).map(([day, v]) => ({ day, revenue: v.revenue, expenses: v.expenses })));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl bg-surface p-5 shadow-elevated">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Students</p>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight">{kpis.students.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">All active enrollments</p>
        </div>

        <div className="rounded-3xl bg-surface p-5 shadow-elevated">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Teachers</p>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight">{kpis.teachers.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">Staffed roles (teacher)</p>
        </div>

        <div className="rounded-3xl bg-surface p-5 shadow-elevated">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Attendance (7d)</p>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight">{attendanceRate}%</p>
          <p className="mt-1 text-xs text-muted-foreground">Present entries / total entries</p>
        </div>

        <div className="rounded-3xl bg-surface p-5 shadow-elevated">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Open leads</p>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 font-display text-2xl font-semibold tracking-tight">{kpis.leads.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">Admissions pipeline</p>
        </div>
      </div>

      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-xl">Finance pulse (MTD)</CardTitle>
          <p className="text-sm text-muted-foreground">Collections vs expenses</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-sm text-muted-foreground">Revenue (MTD)</p>
              <p className="mt-2 font-display text-xl font-semibold">{kpis.revenueMtd.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-sm text-muted-foreground">Expenses (MTD)</p>
              <p className="mt-2 font-display text-xl font-semibold">{kpis.expensesMtd.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-sm text-muted-foreground">Net (MTD)</p>
              <p className="mt-2 font-display text-xl font-semibold">{(kpis.revenueMtd - kpis.expensesMtd).toLocaleString()}</p>
            </div>
          </div>

          <div className="h-[260px] rounded-2xl border bg-surface p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={40} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                <Area type="monotone" dataKey="expenses" stroke="hsl(var(--brand))" fill="hsl(var(--brand) / 0.18)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="hero" onClick={() => navigate(`/${tenant.slug}/${role}/users`)} className="flex-1">
              <Users className="mr-2 h-4 w-4" /> Staff & roles
            </Button>
            <Button variant="soft" onClick={() => navigate(`/${tenant.slug}/${role}/academic`)} className="flex-1">
              <GraduationCap className="mr-2 h-4 w-4" /> Academics
            </Button>
            <Button variant="soft" onClick={() => navigate(`/${tenant.slug}/${role}/finance`)} className="flex-1">
              <Coins className="mr-2 h-4 w-4" /> Finance
            </Button>
          </div>

          <Button variant="outline" onClick={refresh} disabled={busy} className="w-full">
            Refresh KPIs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
