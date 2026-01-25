import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  CalendarDays,
  Heart,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";

interface Props {
  schoolId: string | null;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export function OwnerHrModule({ schoolId }: Props) {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch HR data
  const { data: hrData, isLoading } = useQuery({
    queryKey: ["owner_hr", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;

      const [staffRes, rolesRes, salariesRes, leavesRes, payRunsRes] = await Promise.all([
        supabase.from("school_memberships").select("*").eq("school_id", schoolId),
        supabase.from("user_roles").select("*").eq("school_id", schoolId),
        supabase.from("hr_salary_records").select("*").eq("school_id", schoolId),
        supabase.from("hr_leave_requests").select("*").eq("school_id", schoolId),
        supabase.from("hr_pay_runs").select("*").eq("school_id", schoolId),
      ]);

      const staff = staffRes.data || [];
      const roles = rolesRes.data || [];
      const salaries = salariesRes.data || [];
      const leaves = leavesRes.data || [];
      const payRuns = payRunsRes.data || [];

      const activeStaff = staff.filter((s) => s.status === "active").length;
      const totalStaff = staff.length;

      // Role distribution
      const roleDistribution: Record<string, number> = {};
      roles.forEach((r) => {
        const role = r.role || "unknown";
        roleDistribution[role] = (roleDistribution[role] || 0) + 1;
      });

      // Salary stats
      const activeSalaries = salaries.filter((s) => s.is_active);
      const totalSalaryBill = activeSalaries.reduce(
        (sum, s) => sum + Number(s.base_salary || 0) + Number(s.allowances || 0) - Number(s.deductions || 0),
        0
      );
      const avgSalary = activeSalaries.length > 0 ? totalSalaryBill / activeSalaries.length : 0;

      // Leave stats
      const pendingLeaves = leaves.filter((l) => l.status === "pending").length;
      const approvedLeaves = leaves.filter((l) => l.status === "approved").length;

      // Payroll processed
      const payrollProcessed = payRuns.filter((p) => p.status === "completed").length;

      // Engagement score (mock - based on active ratio)
      const engagementScore = totalStaff > 0 ? Math.round((activeStaff / totalStaff) * 100) : 0;

      // Retention rate (mock)
      const retentionRate = 92;

      // Burnout risk (mock - based on pending leaves)
      const burnoutRisk = pendingLeaves > 5 ? "High" : pendingLeaves > 2 ? "Medium" : "Low";

      return {
        totalStaff,
        activeStaff,
        roleDistribution,
        totalSalaryBill,
        avgSalary,
        pendingLeaves,
        approvedLeaves,
        payrollProcessed,
        engagementScore,
        retentionRate,
        burnoutRisk,
        teachers: roleDistribution["teacher"] || 0,
      };
    },
    enabled: !!schoolId,
  });

  const roleChartData = useMemo(() => {
    if (!hrData) return [];
    return Object.entries(hrData.roleDistribution)
      .map(([name, value], idx) => ({
        name: name.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
        fill: COLORS[idx % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [hrData]);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return amount.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">HR & Culture</h1>
        <p className="text-muted-foreground">Staff management, engagement metrics, and payroll overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{hrData?.totalStaff || 0}</p>
            <p className="text-xs text-muted-foreground">Total Staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <UserCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{hrData?.activeStaff || 0}</p>
            <p className="text-xs text-muted-foreground">Active Staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{hrData?.teachers || 0}</p>
            <p className="text-xs text-muted-foreground">Teachers</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Wallet className="h-5 w-5 text-purple-600" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold">
              {formatCurrency(hrData?.totalSalaryBill || 0)}
            </p>
            <p className="text-xs text-muted-foreground">Monthly Payroll</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Heart className="h-5 w-5 text-pink-600" />
              <Badge
                variant={(hrData?.engagementScore || 0) >= 80 ? "default" : "destructive"}
                className="text-[10px]"
              >
                Score
              </Badge>
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{hrData?.engagementScore || 0}%</p>
            <p className="text-xs text-muted-foreground">Engagement</p>
          </CardContent>
        </Card>

        <Card className={hrData?.burnoutRisk === "High" ? "border-red-500/50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <AlertTriangle
                className={`h-5 w-5 ${
                  hrData?.burnoutRisk === "High"
                    ? "text-red-600"
                    : hrData?.burnoutRisk === "Medium"
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              />
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{hrData?.burnoutRisk || "Low"}</p>
            <p className="text-xs text-muted-foreground">Burnout Risk</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roles">Role Distribution</TabsTrigger>
          <TabsTrigger value="salary">Salary Analysis</TabsTrigger>
          <TabsTrigger value="culture">Culture Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Staff by Role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {roleChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Retention Rate</span>
                    <span className="font-medium">{hrData?.retentionRate || 0}%</span>
                  </div>
                  <Progress value={hrData?.retentionRate || 0} className="mt-2 h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Staff Engagement</span>
                    <span className="font-medium">{hrData?.engagementScore || 0}%</span>
                  </div>
                  <Progress value={hrData?.engagementScore || 0} className="mt-2 h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Pending Leave Requests</span>
                    <span className="font-medium">{hrData?.pendingLeaves || 0}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Average Salary</span>
                    <span className="font-medium">{formatCurrency(hrData?.avgSalary || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleChartData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {roleChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Salary Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl bg-primary/10 p-6 text-center">
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(hrData?.totalSalaryBill || 0)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">Total Monthly Payroll</p>
                </div>
                <div className="rounded-xl bg-blue-500/10 p-6 text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {formatCurrency(hrData?.avgSalary || 0)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">Average Salary</p>
                </div>
                <div className="rounded-xl bg-emerald-500/10 p-6 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{hrData?.payrollProcessed || 0}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Payrolls Processed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="culture" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Culture & Engagement Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Culture analytics will be available once staff surveys and feedback systems are integrated.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
