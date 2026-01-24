import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  CreditCard,
  Coins,
  BarChart3,
  Users,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Wallet,
  Receipt,
  PiggyBank,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalaryComparisonChart } from "@/components/accountant/SalaryComparisonChart";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export function AccountantHomeModule() {
  const { schoolSlug } = useParams();
  const navigate = useNavigate();
  const tenant = useTenant(schoolSlug);
  const schoolId = tenant.status === "ready" ? tenant.schoolId : null;

  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all financial data
  const { data: invoices = [] } = useQuery({
    queryKey: ["finance_invoices_home", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_invoices")
        .select("id, total, status, issue_date, due_date, student_id")
        .eq("school_id", schoolId!)
        .order("issue_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["finance_payments_home", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_payments")
        .select("id, amount, paid_at, invoice_id, method_id")
        .eq("school_id", schoolId!)
        .order("paid_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["finance_expenses_home", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_expenses")
        .select("id, amount, expense_date, category, description")
        .eq("school_id", schoolId!)
        .order("expense_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: payRuns = [] } = useQuery({
    queryKey: ["hr_pay_runs_home", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_pay_runs")
        .select("id, period_start, period_end, gross_amount, net_amount, status, paid_at, created_at")
        .eq("school_id", schoolId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: salaryRecords = [] } = useQuery({
    queryKey: ["hr_salary_records_home", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_salary_records")
        .select("id, user_id, base_salary, allowances, deductions, is_active")
        .eq("school_id", schoolId!)
        .eq("is_active", true);
      if (error) throw error;
      return (data || []).map((r) => ({
        ...r,
        allowances: r.allowances || 0,
        deductions: r.deductions || 0,
      }));
    },
    enabled: !!schoolId,
  });

  // Calculate comprehensive stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Revenue
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const thisMonthRevenue = payments
      .filter((p) => new Date(p.paid_at) >= thisMonth)
      .reduce((sum, p) => sum + p.amount, 0);
    const lastMonthRevenue = payments
      .filter((p) => {
        const date = new Date(p.paid_at);
        return date >= lastMonth && date <= lastMonthEnd;
      })
      .reduce((sum, p) => sum + p.amount, 0);
    const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    // Expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const thisMonthExpenses = expenses
      .filter((e) => new Date(e.expense_date) >= thisMonth)
      .reduce((sum, e) => sum + e.amount, 0);

    // Invoices
    const totalInvoiced = invoices.reduce((sum, i) => sum + i.total, 0);
    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const overdueInvoices = invoices.filter((i) => i.status === "overdue" || (i.status === "sent" && new Date(i.due_date) < now));
    const pendingInvoices = invoices.filter((i) => i.status === "sent" || i.status === "draft");
    const collectionRate = totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : 0;

    // Payroll
    const monthlyPayroll = salaryRecords.reduce((sum, s) => sum + s.base_salary + s.allowances - s.deductions, 0);
    const completedPayRuns = payRuns.filter((p) => p.status === "completed").length;
    const pendingPayRuns = payRuns.filter((p) => p.status === "draft" || p.status === "processing").length;

    // Profit
    const netProfit = totalRevenue - totalExpenses - (monthlyPayroll * (payRuns.filter((p) => p.status === "completed").length || 1));

    return {
      totalRevenue,
      thisMonthRevenue,
      revenueGrowth,
      totalExpenses,
      thisMonthExpenses,
      totalInvoiced,
      paidInvoices: paidInvoices.length,
      overdueInvoices: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce((sum, i) => sum + i.total, 0),
      pendingInvoices: pendingInvoices.length,
      collectionRate,
      monthlyPayroll,
      activeEmployees: salaryRecords.length,
      completedPayRuns,
      pendingPayRuns,
      netProfit,
    };
  }, [payments, expenses, invoices, payRuns, salaryRecords]);

  // Cash flow trend (last 30 days)
  const cashFlowData = useMemo(() => {
    const dataMap = new Map<string, { date: string; revenue: number; expenses: number }>();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    payments
      .filter((p) => new Date(p.paid_at) >= thirtyDaysAgo)
      .forEach((p) => {
        const date = new Date(p.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const existing = dataMap.get(date) || { date, revenue: 0, expenses: 0 };
        existing.revenue += p.amount;
        dataMap.set(date, existing);
      });

    expenses
      .filter((e) => new Date(e.expense_date) >= thirtyDaysAgo)
      .forEach((e) => {
        const date = new Date(e.expense_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const existing = dataMap.get(date) || { date, revenue: 0, expenses: 0 };
        existing.expenses += e.amount;
        dataMap.set(date, existing);
      });

    return Array.from(dataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [payments, expenses]);

  // Expense breakdown
  const expenseBreakdown = useMemo(() => {
    const categoryMap = new Map<string, number>();
    expenses.forEach((e) => {
      const current = categoryMap.get(e.category) || 0;
      categoryMap.set(e.category, current + e.amount);
    });
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name: name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [expenses]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const activities: { type: string; description: string; amount: number; date: Date; icon: any }[] = [];

    payments.slice(0, 5).forEach((p) => {
      activities.push({
        type: "payment",
        description: "Payment received",
        amount: p.amount,
        date: new Date(p.paid_at),
        icon: CreditCard,
      });
    });

    expenses.slice(0, 5).forEach((e) => {
      activities.push({
        type: "expense",
        description: e.description || e.category,
        amount: -e.amount,
        date: new Date(e.expense_date),
        icon: Receipt,
      });
    });

    return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);
  }, [payments, expenses]);

  const quickActions = [
    { label: "Record Payment", icon: CreditCard, path: `/${schoolSlug}/accountant/payments` },
    { label: "Add Expense", icon: TrendingDown, path: `/${schoolSlug}/accountant/expenses` },
    { label: "Create Invoice", icon: FileText, path: `/${schoolSlug}/accountant/invoices` },
    { label: "Run Payroll", icon: Coins, path: `/${schoolSlug}/accountant/payroll` },
    { label: "View Reports", icon: BarChart3, path: `/${schoolSlug}/accountant/reports` },
    { label: "Manage Fees", icon: DollarSign, path: `/${schoolSlug}/accountant/fees` },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="salary">Salary Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <Card className="shadow-elevated bg-gradient-to-r from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="flex h-auto flex-col items-center gap-2 bg-background p-4 hover:bg-accent"
                    onClick={() => navigate(action.path)}
                  >
                    <action.icon className="h-5 w-5 text-primary" />
                    <span className="text-xs font-medium">{action.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="shadow-elevated">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Revenue</p>
                  </div>
                  {stats.revenueGrowth !== 0 && (
                    <Badge variant={stats.revenueGrowth > 0 ? "default" : "destructive"} className="text-xs">
                      {stats.revenueGrowth > 0 ? "+" : ""}{stats.revenueGrowth.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-2xl font-semibold text-primary">{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">This month: {stats.thisMonthRevenue.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="shadow-elevated">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <p className="text-sm text-muted-foreground">Expenses</p>
                </div>
                <p className="mt-2 text-2xl font-semibold text-destructive">{stats.totalExpenses.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">This month: {stats.thisMonthExpenses.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="shadow-elevated">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Monthly Payroll</p>
                </div>
                <p className="mt-2 text-2xl font-semibold">{stats.monthlyPayroll.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{stats.activeEmployees} active employees</p>
              </CardContent>
            </Card>

            <Card className="shadow-elevated">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                </div>
                <p className={`mt-2 text-2xl font-semibold ${stats.netProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                  {stats.netProfit >= 0 ? "+" : ""}{stats.netProfit.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts Row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {stats.overdueInvoices > 0 && (
              <Card className="border-destructive/30 bg-destructive/5 shadow-elevated">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="rounded-full bg-destructive/10 p-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-semibold text-destructive">{stats.overdueInvoices} Overdue Invoices</p>
                    <p className="text-sm text-muted-foreground">Amount: {stats.overdueAmount.toLocaleString()}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    onClick={() => navigate(`/${schoolSlug}/accountant/invoices`)}
                  >
                    View <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {stats.pendingPayRuns > 0 && (
              <Card className="border-warning/30 bg-warning/5 shadow-elevated">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="rounded-full bg-warning/10 p-3">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-semibold">{stats.pendingPayRuns} Pending Pay Runs</p>
                    <p className="text-sm text-muted-foreground">Awaiting processing</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    onClick={() => navigate(`/${schoolSlug}/accountant/payroll`)}
                  >
                    Process <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="border-primary/30 bg-primary/5 shadow-elevated">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Collection Rate</p>
                  <div className="flex items-center gap-2">
                    <Progress value={stats.collectionRate} className="h-2 w-24" />
                    <span className="text-sm font-medium">{stats.collectionRate.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Cash Flow Chart */}
            <Card className="shadow-elevated">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Cash Flow (Last 30 Days)</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/${schoolSlug}/accountant/reports`)}
                >
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {cashFlowData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashFlowData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip
                          formatter={(value: number) => value.toLocaleString()}
                          contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary) / 0.2)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="expenses"
                          name="Expenses"
                          stroke="hsl(var(--destructive))"
                          fill="hsl(var(--destructive) / 0.2)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card className="shadow-elevated">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Expense Categories</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/${schoolSlug}/accountant/expenses`)}
                >
                  Manage <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {expenseBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {expenseBreakdown.map((entry, index) => (
                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => value.toLocaleString()} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No expenses recorded
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Invoice Status */}
            <Card className="shadow-elevated">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Invoice Status</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/${schoolSlug}/accountant/invoices`)}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm">Paid</span>
                  </div>
                  <Badge variant="default">{stats.paidInvoices}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Pending</span>
                  </div>
                  <Badge variant="secondary">{stats.pendingInvoices}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm">Overdue</span>
                  </div>
                  <Badge variant="destructive">{stats.overdueInvoices}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Payroll Status */}
            <Card className="shadow-elevated">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Payroll Summary</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/${schoolSlug}/accountant/payroll`)}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-accent p-4">
                  <p className="text-sm text-muted-foreground">Monthly Payroll Cost</p>
                  <p className="text-2xl font-bold">{stats.monthlyPayroll.toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-semibold text-primary">{stats.completedPayRuns}</p>
                    <p className="text-xs text-muted-foreground">Completed Runs</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-semibold">{stats.activeEmployees}</p>
                    <p className="text-xs text-muted-foreground">Employees</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="shadow-elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[220px]">
                  <div className="space-y-3">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity, idx) => (
                        <div key={idx} className="flex items-center gap-3 rounded-lg border p-2">
                          <div className={`rounded-full p-2 ${activity.amount > 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
                            <activity.icon className={`h-3 w-3 ${activity.amount > 0 ? "text-primary" : "text-destructive"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {activity.date.toLocaleDateString()}
                            </p>
                          </div>
                          <p className={`text-sm font-semibold ${activity.amount > 0 ? "text-primary" : "text-destructive"}`}>
                            {activity.amount > 0 ? "+" : ""}{activity.amount.toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-sm text-muted-foreground py-8">No recent activity</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="salary">
          <SalaryComparisonChart />
        </TabsContent>
      </Tabs>
    </div>
  );
}
