import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PeriodTimetableGrid, type PeriodTimetableEntry } from "@/components/timetable/PeriodTimetableGrid";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate">Section Timetable</span>
            <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs shrink-0">
              {sectionLabel}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="min-w-0">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No timetable entries found for this section.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <PeriodTimetableGrid
                    periods={periods}
                    entries={entries}
                    density="compact"
                    stickyDayColumn={false}
                  />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
