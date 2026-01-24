import { useMemo } from "react";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Minus, Calendar, DollarSign, History } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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

type SalaryHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  employeeId: string;
  salaryRecords: SalaryRecord[];
};

export function SalaryHistoryDialog({
  open,
  onOpenChange,
  employeeName,
  employeeId,
  salaryRecords,
}: SalaryHistoryDialogProps) {
  // Filter and sort records for this employee
  const employeeRecords = useMemo(() => {
    return salaryRecords
      .filter((r) => r.user_id === employeeId)
      .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());
  }, [salaryRecords, employeeId]);

  // Calculate salary changes
  const recordsWithChanges = useMemo(() => {
    return employeeRecords.map((record, index) => {
      const previousRecord = employeeRecords[index + 1];
      const netSalary = record.base_salary + record.allowances - record.deductions;
      const previousNet = previousRecord
        ? previousRecord.base_salary + previousRecord.allowances - previousRecord.deductions
        : null;
      
      let changePercent = 0;
      let changeType: "increase" | "decrease" | "same" = "same";
      
      if (previousNet !== null && previousNet > 0) {
        changePercent = ((netSalary - previousNet) / previousNet) * 100;
        if (changePercent > 0.5) changeType = "increase";
        else if (changePercent < -0.5) changeType = "decrease";
      }

      return {
        ...record,
        netSalary,
        previousNet,
        changePercent,
        changeType,
      };
    });
  }, [employeeRecords]);

  const formatCurrency = (amount: number, currency: string) =>
    `${currency} ${amount.toLocaleString()}`;

  const formatDate = (dateStr: string) =>
    format(new Date(dateStr), "MMM dd, yyyy");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Salary History — {employeeName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          {recordsWithChanges.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="mx-auto h-12 w-12 opacity-30 mb-4" />
              <p>No salary records found for this employee</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[18px] top-8 bottom-8 w-0.5 bg-border" />

              <div className="space-y-6">
                {recordsWithChanges.map((record, index) => (
                  <div key={record.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div
                      className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                        record.is_active
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background border-muted-foreground/30"
                      }`}
                    >
                      {record.changeType === "increase" && (
                        <TrendingUp className="h-4 w-4" />
                      )}
                      {record.changeType === "decrease" && (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {record.changeType === "same" && (
                        <Minus className="h-4 w-4" />
                      )}
                    </div>

                    {/* Content card */}
                    <div
                      className={`flex-1 rounded-xl border p-4 ${
                        record.is_active
                          ? "bg-primary/5 border-primary/20"
                          : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {formatDate(record.effective_from)}
                              {record.effective_to && (
                                <> — {formatDate(record.effective_to)}</>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold">
                              {formatCurrency(record.netSalary, record.currency)}
                            </span>
                            {record.is_active && (
                              <Badge className="bg-primary/10 text-primary border-primary/20">
                                Current
                              </Badge>
                            )}
                          </div>
                        </div>

                        {record.previousNet !== null && record.changePercent !== 0 && (
                          <Badge
                            variant="outline"
                            className={
                              record.changeType === "increase"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : record.changeType === "decrease"
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : ""
                            }
                          >
                            {record.changeType === "increase" && "+"}
                            {record.changePercent.toFixed(1)}%
                          </Badge>
                        )}
                      </div>

                      {/* Breakdown */}
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <div className="rounded-lg bg-background/50 p-2">
                          <p className="text-xs text-muted-foreground">Base</p>
                          <p className="font-medium">
                            {formatCurrency(record.base_salary, record.currency)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-background/50 p-2">
                          <p className="text-xs text-muted-foreground">Allowances</p>
                          <p className="font-medium text-primary">
                            +{formatCurrency(record.allowances, record.currency)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-background/50 p-2">
                          <p className="text-xs text-muted-foreground">Deductions</p>
                          <p className="font-medium text-destructive">
                            -{formatCurrency(record.deductions, record.currency)}
                          </p>
                        </div>
                      </div>

                      {record.notes && (
                        <p className="mt-3 text-sm text-muted-foreground italic">
                          "{record.notes}"
                        </p>
                      )}

                      {index === 0 && employeeRecords.length > 1 && (
                        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                          Previous: {formatCurrency(record.previousNet!, record.currency)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Summary footer */}
        {recordsWithChanges.length > 1 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {recordsWithChanges.length} salary records over{" "}
                {Math.ceil(
                  (new Date().getTime() -
                    new Date(
                      recordsWithChanges[recordsWithChanges.length - 1].effective_from
                    ).getTime()) /
                    (1000 * 60 * 60 * 24 * 365)
                )}{" "}
                year(s)
              </span>
              <span className="font-medium">
                Total change:{" "}
                {recordsWithChanges[0].previousNet !== null && recordsWithChanges.length > 1 ? (
                  <span
                    className={
                      recordsWithChanges[0].netSalary >
                      recordsWithChanges[recordsWithChanges.length - 1].netSalary
                        ? "text-primary"
                        : "text-destructive"
                    }
                  >
                    {(
                      ((recordsWithChanges[0].netSalary -
                        (recordsWithChanges[recordsWithChanges.length - 1].base_salary +
                          recordsWithChanges[recordsWithChanges.length - 1].allowances -
                          recordsWithChanges[recordsWithChanges.length - 1].deductions)) /
                        (recordsWithChanges[recordsWithChanges.length - 1].base_salary +
                          recordsWithChanges[recordsWithChanges.length - 1].allowances -
                          recordsWithChanges[recordsWithChanges.length - 1].deductions)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
