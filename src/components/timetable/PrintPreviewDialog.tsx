import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PeriodTimetableGrid, type PeriodTimetableEntry } from "@/components/timetable/PeriodTimetableGrid";

type Period = {
  id: string;
  label: string;
  sort_order: number;
  start_time: string | null;
  end_time: string | null;
};

export function PrintPreviewDialog({
  open,
  onOpenChange,
  headerTitle,
  headerSubtitle,
  periods,
  entries,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headerTitle: string;
  headerSubtitle?: string | null;
  periods: Period[];
  entries: PeriodTimetableEntry[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Print preview</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-surface p-4">
            <p className="font-display text-xl">{headerTitle}</p>
            {headerSubtitle ? <p className="text-sm text-muted-foreground">{headerSubtitle}</p> : null}
          </div>

          <div className="print-area">
            <PeriodTimetableGrid periods={periods} entries={entries} printable density="compact" stickyDayColumn={false} />
          </div>
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="hero"
            onClick={() => {
              // Let the dialog render before the print dialog blocks the thread.
              requestAnimationFrame(() => window.print());
            }}
          >
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
