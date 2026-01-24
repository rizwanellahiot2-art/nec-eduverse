import { useState, useEffect } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useAlertSettings, AlertSettings } from "@/hooks/useAlertSettings";

type Props = {
  schoolId: string | null;
  onSettingsChanged?: () => void;
};

export function AlertSettingsDialog({ schoolId, onSettingsChanged }: Props) {
  const { settings, isLoading, save, isSaving } = useAlertSettings(schoolId);
  const [open, setOpen] = useState(false);

  const [attendanceWarning, setAttendanceWarning] = useState(75);
  const [attendanceCritical, setAttendanceCritical] = useState(60);
  const [invoiceThreshold, setInvoiceThreshold] = useState(10);
  const [ticketHours, setTicketHours] = useState(24);

  // Sync local state when settings load
  useEffect(() => {
    if (settings) {
      setAttendanceWarning(settings.attendance_warning_threshold);
      setAttendanceCritical(settings.attendance_critical_threshold);
      setInvoiceThreshold(settings.pending_invoices_threshold);
      setTicketHours(settings.support_ticket_hours);
    }
  }, [settings]);

  const handleSave = async () => {
    await save({
      attendance_warning_threshold: attendanceWarning,
      attendance_critical_threshold: attendanceCritical,
      pending_invoices_threshold: invoiceThreshold,
      support_ticket_hours: ticketHours,
    });
    setOpen(false);
    onSettingsChanged?.();
  };

  // Ensure critical is always less than warning
  const handleWarningChange = (val: number[]) => {
    const newVal = val[0];
    setAttendanceWarning(newVal);
    if (attendanceCritical >= newVal) {
      setAttendanceCritical(Math.max(0, newVal - 10));
    }
  };

  const handleCriticalChange = (val: number[]) => {
    const newVal = val[0];
    if (newVal < attendanceWarning) {
      setAttendanceCritical(newVal);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Alert Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alert Thresholds</DialogTitle>
          <DialogDescription>
            Configure when dashboard alerts should be triggered.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Attendance Warning Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="attendance-warning">Attendance Warning</Label>
              <span className="text-sm font-medium text-muted-foreground">
                Below {attendanceWarning}%
              </span>
            </div>
            <Slider
              id="attendance-warning"
              min={50}
              max={95}
              step={5}
              value={[attendanceWarning]}
              onValueChange={handleWarningChange}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Show warning when attendance drops below this rate.
            </p>
          </div>

          {/* Attendance Critical Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="attendance-critical">Attendance Critical</Label>
              <span className="text-sm font-medium text-destructive">
                Below {attendanceCritical}%
              </span>
            </div>
            <Slider
              id="attendance-critical"
              min={30}
              max={attendanceWarning - 5}
              step={5}
              value={[attendanceCritical]}
              onValueChange={handleCriticalChange}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Show critical alert when attendance drops below this rate.
            </p>
          </div>

          {/* Pending Invoices Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="invoices-threshold">Pending Invoices Alert</Label>
              <span className="text-sm font-medium text-muted-foreground">
                ≥ {invoiceThreshold}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                id="invoices-threshold"
                type="number"
                min={1}
                max={100}
                value={invoiceThreshold}
                onChange={(e) => setInvoiceThreshold(Number(e.target.value) || 1)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">pending invoices</span>
            </div>
          </div>

          {/* Support Ticket Hours */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="ticket-hours">New Ticket Window</Label>
              <span className="text-sm font-medium text-muted-foreground">
                {ticketHours}h
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                id="ticket-hours"
                type="number"
                min={1}
                max={168}
                value={ticketHours}
                onChange={(e) => setTicketHours(Number(e.target.value) || 24)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">hours to show "new" tickets</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
