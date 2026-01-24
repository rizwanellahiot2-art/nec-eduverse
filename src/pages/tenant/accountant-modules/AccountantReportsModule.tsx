import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, TrendingUp, TrendingDown, FileText, Download, Calendar, DollarSign } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

export function AccountantReportsModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const schoolId = tenant.status === "ready" ? tenant.schoolId : null;

  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  const { data: payments = [] } = useQuery({
    queryKey: ["finance_payments", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_payments")
        .select("amount, paid_at")
        .eq("school_id", schoolId!)
        .order("paid_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["finance_expenses", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_expenses")
        .select("amount, expense_date, category")
        .eq("school_id", schoolId!)
        .order("expense_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["finance_invoices", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_invoices")
        .select("total, status, issue_date")
        .eq("school_id", schoolId!)
        .order("issue_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: payRuns = [] } = useQuery({
    queryKey: ["hr_pay_runs", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_pay_runs")
        .select("net_amount, paid_at, status, created_at")
        .eq("school_id", schoolId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  // Calculate period date range
  const getPeriodRange = () => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "quarter":
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterMonth, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { startDate, endDate: now };
  };

  const { startDate, endDate } = getPeriodRange();

  // Filter data by period
  const periodPayments = payments.filter((p) => {
    const date = new Date(p.paid_at);
    return date >= startDate && date <= endDate;
  });

  const periodExpenses = expenses.filter((e) => {
    const date = new Date(e.expense_date);
    return date >= startDate && date <= endDate;
  });

  const periodPayRuns = payRuns.filter((p) => {
    const date = new Date(p.paid_at || p.created_at);
    return date >= startDate && date <= endDate;
  });

  // Calculate stats
  const totalRevenue = periodPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPayroll = periodPayRuns.filter((p) => p.status === "completed").reduce((sum, p) => sum + (p.net_amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses - totalPayroll;

  // Chart data - trend by date
  const trendData = useMemo(() => {
    const dataMap = new Map<string, { date: string; revenue: number; expenses: number }>();

    periodPayments.forEach((p) => {
      const date = new Date(p.paid_at).toLocaleDateString();
      const existing = dataMap.get(date) || { date, revenue: 0, expenses: 0 };
      existing.revenue += p.amount;
      dataMap.set(date, existing);
    });

    periodExpenses.forEach((e) => {
      const date = new Date(e.expense_date).toLocaleDateString();
      const existing = dataMap.get(date) || { date, revenue: 0, expenses: 0 };
      existing.expenses += e.amount;
      dataMap.set(date, existing);
    });

    return Array.from(dataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [periodPayments, periodExpenses]);

  // Expense breakdown by category
  const expenseByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();
    periodExpenses.forEach((e) => {
      const current = categoryMap.get(e.category) || 0;
      categoryMap.set(e.category, current + e.amount);
    });
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name: name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()), value }))
      .sort((a, b) => b.value - a.value);
  }, [periodExpenses]);

  // Invoice status breakdown
  const invoiceByStatus = useMemo(() => {
    const statusMap = new Map<string, number>();
    invoices.forEach((i) => {
      const current = statusMap.get(i.status) || 0;
      statusMap.set(i.status, current + i.total);
    });
    return Array.from(statusMap.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [invoices]);

  const handleExport = (type: string) => {
    // Simple CSV export
    let csv = "";
    let filename = "";

    switch (type) {
      case "pl":
        csv = "Category,Amount\n";
        csv += `Revenue,${totalRevenue}\n`;
        csv += `Expenses,${totalExpenses}\n`;
        csv += `Payroll,${totalPayroll}\n`;
        csv += `Net Profit,${netProfit}\n`;
        filename = `profit_loss_${period}.csv`;
        break;
      case "expenses":
        csv = "Category,Amount\n";
        expenseByCategory.forEach((e) => {
          csv += `${e.name},${e.value}\n`;
        });
        filename = `expenses_${period}.csv`;
        break;
      case "cashflow":
        csv = "Date,Revenue,Expenses\n";
        trendData.forEach((d) => {
          csv += `${d.date},${d.revenue},${d.expenses}\n`;
        });
        filename = `cashflow_${period}.csv`;
        break;
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Card className="shadow-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display text-xl">Financial Reports</CardTitle>
            <p className="text-sm text-muted-foreground">View P&L, expense breakdown, and cash flow</p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="shadow-elevated">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">Revenue</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-primary">{totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevated">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <p className="text-sm text-muted-foreground">Expenses</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-destructive">{totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevated">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Payroll</p>
            </div>
            <p className="mt-2 text-2xl font-semibold">{totalPayroll.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevated">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Net Profit</p>
            </div>
            <p className={`mt-2 text-2xl font-semibold ${netProfit >= 0 ? "text-primary" : "text-destructive"}`}>
              {netProfit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cash Flow Chart */}
        <Card className="shadow-elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Cash Flow Trend</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleExport("cashflow")}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stackId="1"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.3)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stackId="2"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive) / 0.3)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="shadow-elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Expense Breakdown</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleExport("expenses")}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P&L Statement */}
      <Card className="shadow-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Profit & Loss Statement</CardTitle>
          <Button variant="outline" size="sm" onClick={() => handleExport("pl")}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] rounded-xl border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-primary">Revenue (Fee Collections)</TableCell>
                  <TableCell className="text-right font-medium text-primary">+{totalRevenue.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={2} className="font-semibold">Expenses</TableCell>
                </TableRow>
                {expenseByCategory.map((cat) => (
                  <TableRow key={cat.name}>
                    <TableCell className="pl-8">{cat.name}</TableCell>
                    <TableCell className="text-right text-destructive">-{cat.value.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="pl-8">Payroll</TableCell>
                  <TableCell className="text-right text-destructive">-{totalPayroll.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>Net Profit / Loss</TableCell>
                  <TableCell className={`text-right ${netProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                    {netProfit >= 0 ? "+" : ""}{netProfit.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Invoice Status */}
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="text-lg">Invoice Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {invoiceByStatus.map((status) => (
              <div key={status.name} className="rounded-xl border p-4 text-center">
                <p className="text-sm text-muted-foreground">{status.name}</p>
                <p className="mt-1 text-xl font-semibold">{status.value.toLocaleString()}</p>
              </div>
            ))}
            {invoiceByStatus.length === 0 && (
              <div className="col-span-4 text-center py-8">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No invoice data</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
