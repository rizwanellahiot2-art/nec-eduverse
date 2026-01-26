import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PeriodTimetableGrid, type PeriodTimetableEntry } from "@/components/timetable/PeriodTimetableGrid";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

type Period = {
  id: string;
  label: string;
  sort_order: number;
  start_time: string | null;
  end_time: string | null;
  is_break?: boolean;
};

export function SectionTimetableDialog({
  open,
  onOpenChange,
  sectionLabel,
  periods,
  entries,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionLabel: string;
  periods: Period[];
  entries: PeriodTimetableEntry[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Section Timetable
            <Badge variant="secondary" className="ml-2">
              {sectionLabel}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No timetable entries found for this section.
            </p>
          ) : (
            <PeriodTimetableGrid
              periods={periods}
              entries={entries}
              density="compact"
              stickyDayColumn={false}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
