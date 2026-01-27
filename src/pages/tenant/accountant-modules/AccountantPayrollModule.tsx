import { useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Play, CheckCircle, Clock, Trash2, Users, Coins, FileText, Download, History, WifiOff, RefreshCw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { useOfflineSalaryRecords, useOfflineStaffMembers } from "@/hooks/useOfflineData";
import { OfflineDataBanner } from "@/components/offline/OfflineDataBanner";
import { openBulkPayslipsPDF, downloadBulkPayslipsHTML, PayslipData } from "@/lib/payslip-pdf";
import { SalaryHistoryDialog } from "@/components/hr/SalaryHistoryDialog";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type PayRun = {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  status: string;
  notes: string | null;
};

type SalaryRecord = {
  id: string;
  user_id: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  currency: string;
  pay_frequency: string;
  notes: string | null;
};

type StaffMember = {
  id: string;
  full_name: string;
  email: string;
};

export function AccountantPayrollModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const queryClient = useQueryClient();
  const schoolId = tenant.status === "ready" ? tenant.schoolId : null;

  // Offline hooks
  const { isOffline, isUsingCache: salariesFromCache, refresh: refreshSalaries } = useOfflineSalaryRecords(schoolId);
  const { isUsingCache: staffFromCache, refresh: refreshStaff } = useOfflineStaffMembers(schoolId);
  const isUsingCache = salariesFromCache || staffFromCache;

  const handleRefresh = useCallback(() => {
    if (!isOffline) {
      refreshSalaries();
      refreshStaff();
    }
  }, [isOffline, refreshSalaries, refreshStaff]);

  const [payRunDialogOpen, setPayRunDialogOpen] = useState(false);
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState<{ id: string; name: string } | null>(null);

  // Pay run form
  const [formPeriodStart, setFormPeriodStart] = useState("");
  const [formPeriodEnd, setFormPeriodEnd] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Salary form
  const [formUserId, setFormUserId] = useState("");
  const [formBaseSalary, setFormBaseSalary] = useState("");
  const [formAllowances, setFormAllowances] = useState("0");
  const [formDeductions, setFormDeductions] = useState("0");
  const [formEffectiveFrom, setFormEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);

  // Invalidate all payroll queries on realtime changes
  const invalidatePayrollQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["hr_pay_runs", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["hr_salary_records", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["hr_pay_runs_home"] });
    queryClient.invalidateQueries({ queryKey: ["hr_salary_records_home"] });
  }, [queryClient, schoolId]);

  // Real-time subscriptions
  useRealtimeTable({
    channel: `accountant-payroll-pay-runs-${schoolId}`,
    table: "hr_pay_runs",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId,
    onChange: invalidatePayrollQueries,
  });

  useRealtimeTable({
    channel: `accountant-payroll-salaries-${schoolId}`,
    table: "hr_salary_records",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId,
    onChange: invalidatePayrollQueries,
  });

  const { data: payRuns = [], isLoading: loadingPayRuns } = useQuery({
    queryKey: ["hr_pay_runs", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_pay_runs")
        .select("*")
        .eq("school_id", schoolId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        period_start: r.period_start,
        period_end: r.period_end,
        paid_at: r.paid_at,
        gross_amount: r.gross_amount,
        deductions: r.deductions,
        net_amount: r.net_amount,
        status: r.status,
        notes: r.notes,
      })) as PayRun[];
    },
    enabled: !!schoolId,
  });

  const { data: salaryRecords = [], isLoading: loadingSalaries } = useQuery({
    queryKey: ["hr_salary_records", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_salary_records")
        .select("*")
        .eq("school_id", schoolId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        base_salary: r.base_salary,
        allowances: r.allowances || 0,
        deductions: r.deductions || 0,
        is_active: r.is_active ?? true,
        effective_from: r.effective_from,
        effective_to: r.effective_to,
        currency: r.currency,
        pay_frequency: r.pay_frequency,
        notes: r.notes,
      })) as SalaryRecord[];
    },
    enabled: !!schoolId,
  });

  const { data: staffMembers = [] } = useQuery({
    queryKey: ["school_memberships_staff", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_memberships")
        .select("user_id, profiles:user_id(display_name)")
        .eq("school_id", schoolId!);
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.user_id,
        full_name: m.profiles?.display_name || "Unknown",
        email: "",
      })) as StaffMember[];
    },
    enabled: !!schoolId,
  });

  const resetPayRunForm = () => {
    setFormPeriodStart("");
    setFormPeriodEnd("");
    setFormNotes("");
  };

  const resetSalaryForm = () => {
    setFormUserId("");
    setFormBaseSalary("");
    setFormAllowances("0");
    setFormDeductions("0");
    setFormEffectiveFrom(new Date().toISOString().split("T")[0]);
  };

  const handleCreatePayRun = async () => {
    if (!schoolId) return;
    if (!formPeriodStart || !formPeriodEnd) {
      toast.error("Period start and end dates required");
      return;
    }

    // Get active salary records
    const activeSalaries = salaryRecords.filter((s) => s.is_active);
    if (activeSalaries.length === 0) {
      toast.error("No active salary records to process");
      return;
    }

    // Create individual pay runs for each staff member
    const payRunRecords = activeSalaries.map((salary) => ({
      school_id: schoolId,
      user_id: salary.user_id,
      period_start: formPeriodStart,
      period_end: formPeriodEnd,
      gross_amount: salary.base_salary + salary.allowances,
      deductions: salary.deductions,
      net_amount: salary.base_salary + salary.allowances - salary.deductions,
      status: "draft",
      notes: formNotes.trim() || null,
    }));

    const { error } = await supabase.from("hr_pay_runs").insert(payRunRecords);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`${payRunRecords.length} pay runs created for individual staff members`);
    setPayRunDialogOpen(false);
    resetPayRunForm();
    queryClient.invalidateQueries({ queryKey: ["hr_pay_runs", schoolId] });
  };

  const handleAddSalaryRecord = async () => {
    if (!schoolId) return;
    if (!formUserId) {
      toast.error("Select a staff member");
      return;
    }
    const baseSalary = Number(formBaseSalary);
    if (!Number.isFinite(baseSalary) || baseSalary <= 0) {
      toast.error("Base salary must be a positive number");
      return;
    }

    // Mark previous records as inactive
    await supabase
      .from("hr_salary_records")
      .update({ is_active: false, effective_to: formEffectiveFrom })
      .eq("school_id", schoolId)
      .eq("user_id", formUserId)
      .eq("is_active", true);

    const { error } = await supabase.from("hr_salary_records").insert([
      {
        school_id: schoolId,
        user_id: formUserId,
        base_salary: baseSalary,
        allowances: Number(formAllowances) || 0,
        deductions: Number(formDeductions) || 0,
        is_active: true,
        effective_from: formEffectiveFrom,
        currency: "PKR",
        pay_frequency: "monthly",
      },
    ]);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Salary record added");
    setSalaryDialogOpen(false);
    resetSalaryForm();
    queryClient.invalidateQueries({ queryKey: ["hr_salary_records", schoolId] });
  };

  const handleUpdatePayRunStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("hr_pay_runs")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Pay run marked as ${newStatus}`);
    queryClient.invalidateQueries({ queryKey: ["hr_pay_runs", schoolId] });
  };

  const handleDeletePayRun = async (id: string) => {
    const { error } = await supabase.from("hr_pay_runs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pay run deleted");
    queryClient.invalidateQueries({ queryKey: ["hr_pay_runs", schoolId] });
  };

  const handleDeleteSalaryRecord = async (id: string) => {
    const { error } = await supabase.from("hr_salary_records").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Salary record deleted");
    queryClient.invalidateQueries({ queryKey: ["hr_salary_records", schoolId] });
  };

  const getStaffMember = (userId: string) => staffMembers.find((s) => s.id === userId);
  const getStaffName = (userId: string) => getStaffMember(userId)?.full_name || "Unknown";
  const getStaffEmail = (userId: string) => getStaffMember(userId)?.email || "";

  const handleGeneratePayslip = (run: PayRun) => {
    // Find the salary record for this specific user
    const salary = salaryRecords.find((s) => s.user_id === run.user_id && s.is_active);
    const staff = getStaffMember(run.user_id);
    
    if (!staff) {
      toast.error("Staff member not found");
      return;
    }

    const schoolName = tenant.status === "ready" ? tenant.school?.name || "School" : "School";

    const payslip: PayslipData = {
      employeeName: staff.full_name,
      employeeEmail: staff.email || "",
      employeeId: run.user_id,
      periodStart: run.period_start,
      periodEnd: run.period_end,
      paidAt: run.paid_at,
      baseSalary: salary?.base_salary || run.gross_amount - (salary?.allowances || 0),
      allowances: salary?.allowances || 0,
      deductions: run.deductions,
      grossAmount: run.gross_amount,
      netAmount: run.net_amount,
      currency: salary?.currency || "PKR",
      schoolName,
      payRunId: run.id,
      status: run.status,
    };

    openBulkPayslipsPDF([payslip]);
    toast.success("Payslip generated!");
  };

  const handleDownloadPayslip = (run: PayRun) => {
    // Find the salary record for this specific user
    const salary = salaryRecords.find((s) => s.user_id === run.user_id && s.is_active);
    const staff = getStaffMember(run.user_id);
    
    if (!staff) {
      toast.error("Staff member not found");
      return;
    }

    const schoolName = tenant.status === "ready" ? tenant.school?.name || "School" : "School";

    const payslip: PayslipData = {
      employeeName: staff.full_name,
      employeeEmail: staff.email || "",
      employeeId: run.user_id,
      periodStart: run.period_start,
      periodEnd: run.period_end,
      paidAt: run.paid_at,
      baseSalary: salary?.base_salary || run.gross_amount - (salary?.allowances || 0),
      allowances: salary?.allowances || 0,
      deductions: run.deductions,
      grossAmount: run.gross_amount,
      netAmount: run.net_amount,
      currency: salary?.currency || "PKR",
      schoolName,
      payRunId: run.id,
      status: run.status,
    };

    downloadBulkPayslipsHTML([payslip], run.period_start, run.period_end);
    toast.success("Payslip downloaded!");
  };

  const openSalaryHistory = (userId: string) => {
    const staff = getStaffMember(userId);
    setSelectedEmployeeForHistory({ id: userId, name: staff?.full_name || "Unknown" });
    setHistoryDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <CheckCircle className="mr-1 h-3 w-3" /> Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            <Play className="mr-1 h-3 w-3" /> Processing
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" /> Draft
          </Badge>
        );
    }
  };

  const filteredPayRuns = statusFilter === "all"
    ? payRuns
    : payRuns.filter((pr) => pr.status === statusFilter);

  const activeSalaries = salaryRecords.filter((s) => s.is_active);
  const stats = {
    totalPayRuns: payRuns.length,
    completedPayRuns: payRuns.filter((p) => p.status === "completed").length,
    totalPayroll: activeSalaries.reduce((sum, s) => sum + s.base_salary + s.allowances - s.deductions, 0),
    activeEmployees: activeSalaries.length,
  };

  if ((loadingPayRuns || loadingSalaries) && !isUsingCache) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OfflineDataBanner isOffline={isOffline} isUsingCache={isUsingCache} onRefresh={handleRefresh} />
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="shadow-elevated">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Active Employees</p>
            <p className="text-2xl font-semibold">{stats.activeEmployees}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevated">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Monthly Payroll</p>
            <p className="text-2xl font-semibold">{stats.totalPayroll.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevated">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Pay Runs</p>
            <p className="text-2xl font-semibold">{stats.totalPayRuns}</p>
          </CardContent>
        </Card>
        <Card className="shadow-elevated">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-semibold text-primary">{stats.completedPayRuns}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pay Runs */}
        <Card className="shadow-elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-xl">Pay Runs</CardTitle>
              <p className="text-sm text-muted-foreground">Manage payroll runs</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={payRunDialogOpen} onOpenChange={setPayRunDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" onClick={resetPayRunForm}>
                    <Plus className="mr-2 h-4 w-4" /> Run Payroll
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Pay Run</DialogTitle>
                    <DialogDescription>Start a new payroll run for a period</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Period Start</Label>
                        <Input
                          type="date"
                          value={formPeriodStart}
                          onChange={(e) => setFormPeriodStart(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Period End</Label>
                        <Input
                          type="date"
                          value={formPeriodEnd}
                          onChange={(e) => setFormPeriodEnd(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="rounded-lg bg-accent p-4">
                      <p className="text-sm font-medium">Estimated Totals</p>
                      <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Gross</p>
                          <p className="font-semibold">
                            {activeSalaries.reduce((s, r) => s + r.base_salary + r.allowances, 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Deductions</p>
                          <p className="font-semibold">
                            {activeSalaries.reduce((s, r) => s + r.deductions, 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Net</p>
                          <p className="font-semibold text-primary">
                            {stats.totalPayroll.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Input
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPayRunDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreatePayRun}>Create Pay Run</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              <div className="space-y-3">
                {filteredPayRuns.map((run) => (
                  <div key={run.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{getStaffName(run.user_id)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(run.period_start).toLocaleDateString()} — {new Date(run.period_end).toLocaleDateString()}
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Gross</p>
                            <p className="font-medium">{run.gross_amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Deductions</p>
                            <p className="font-medium">{run.deductions.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Net</p>
                            <p className="font-medium text-primary">{run.net_amount.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(run.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGeneratePayslip(run)}
                          title="Print Payslip"
                        >
                          <FileText className="h-4 w-4 mr-1" /> Print
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadPayslip(run)}
                          title="Download Payslip"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {run.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdatePayRunStatus(run.id, "processing")}
                            title="Start Processing"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {run.status === "processing" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdatePayRunStatus(run.id, "completed")}
                            title="Mark Completed"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete pay run?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePayRun(run.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredPayRuns.length === 0 && (
                  <div className="text-center py-8">
                    <Coins className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">No pay runs found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Salary Records */}
        <Card className="shadow-elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-xl">Salary Records</CardTitle>
              <p className="text-sm text-muted-foreground">Active salary configurations</p>
            </div>
            <Dialog open={salaryDialogOpen} onOpenChange={setSalaryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={resetSalaryForm}>
                  <Plus className="mr-2 h-4 w-4" /> Add Record
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Salary Record</DialogTitle>
                  <DialogDescription>Configure salary for a staff member</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Staff Member</Label>
                    <Select value={formUserId} onValueChange={setFormUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Base Salary</Label>
                      <Input
                        type="number"
                        value={formBaseSalary}
                        onChange={(e) => setFormBaseSalary(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Allowances</Label>
                      <Input
                        type="number"
                        value={formAllowances}
                        onChange={(e) => setFormAllowances(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Deductions</Label>
                      <Input
                        type="number"
                        value={formDeductions}
                        onChange={(e) => setFormDeductions(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Effective From</Label>
                    <Input
                      type="date"
                      value={formEffectiveFrom}
                      onChange={(e) => setFormEffectiveFrom(e.target.value)}
                    />
                  </div>
                  <div className="rounded-lg bg-accent p-3">
                    <p className="text-sm text-muted-foreground">Net Salary</p>
                    <p className="text-xl font-semibold">
                      {((Number(formBaseSalary) || 0) + (Number(formAllowances) || 0) - (Number(formDeductions) || 0)).toLocaleString()}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSalaryDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddSalaryRecord}>Add Record</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px] rounded-xl border bg-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{getStaffName(record.user_id)}</TableCell>
                      <TableCell>{record.base_salary.toLocaleString()}</TableCell>
                      <TableCell className="text-primary">
                        {(record.base_salary + record.allowances - record.deductions).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.is_active ? "default" : "secondary"}>
                          {record.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openSalaryHistory(record.user_id)}
                            title="View Salary History"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete salary record?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSalaryRecord(record.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {salaryRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        <Users className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                        No salary records
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Salary History Dialog */}
      {selectedEmployeeForHistory && (
        <SalaryHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          employeeName={selectedEmployeeForHistory.name}
          employeeId={selectedEmployeeForHistory.id}
          salaryRecords={salaryRecords}
        />
      )}
    </div>
  );
}
