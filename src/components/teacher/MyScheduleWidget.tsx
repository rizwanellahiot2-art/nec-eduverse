import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Check, ChevronRight, Clock, Coffee, Pencil, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodLogDialog } from "./PeriodLogDialog";
import { useTeacherSchedule, ScheduleEntry, PeriodLog } from "@/hooks/useTeacherSchedule";

interface MyScheduleWidgetProps {
  schoolId: string | null;
  schoolSlug: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS = [1, 2, 3, 4, 5]; // Mon-Fri

function formatTime(time: string | null): string {
  if (!time) return "";
  return time.slice(0, 5);
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <Check className="h-3.5 w-3.5 text-primary" />;
    case "partial":
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    case "cancelled":
      return <X className="h-3.5 w-3.5 text-destructive" />;
    default:
      return null;
  }
}

export function MyScheduleWidget({ schoolId, schoolSlug }: MyScheduleWidgetProps) {
  // Determine initial day: today if weekday, else Monday
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay();
    return today >= 1 && today <= 5 ? today : 1;
  });

  const { entries, periodLogs, loading, error, isOffline, refetch } = useTeacherSchedule(schoolId, selectedDay);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogEntry, setDialogEntry] = useState<ScheduleEntry | null>(null);

  const todayDayOfWeek = new Date().getDay();
  const isToday = selectedDay === todayDayOfWeek;

  // Determine current period index (only for today)
  const currentPeriodIndex = useMemo(() => {
    if (!isToday || entries.length === 0) return -1;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.startTime && entry.endTime) {
        const [startH, startM] = entry.startTime.split(":").map(Number);
        const [endH, endM] = entry.endTime.split(":").map(Number);
        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;

        if (currentMinutes >= startMins && currentMinutes <= endMins) {
          return i;
        }
      }
    }
    return -1;
  }, [entries, isToday]);

  const handleOpenLog = (entry: ScheduleEntry) => {
    setDialogEntry(entry);
    setDialogOpen(true);
  };

  const handleLogSaved = () => {
    refetch();
  };

  // Map ScheduleEntry to PeriodLogDialog's expected format
  const dialogEntryForLog = dialogEntry
    ? {
        id: dialogEntry.id,
        subject_name: dialogEntry.subjectName,
        period_id: dialogEntry.periodId,
        room: dialogEntry.room,
        section_label: dialogEntry.sectionLabel,
        period_label: dialogEntry.periodLabel,
        start_time: dialogEntry.startTime,
        end_time: dialogEntry.endTime,
        sort_order: dialogEntry.sortOrder,
      }
    : null;

  const existingLog = dialogEntry ? periodLogs.get(dialogEntry.id) : undefined;
  const existingLogForDialog = existingLog
    ? {
        id: existingLog.id,
        timetable_entry_id: existingLog.timetableEntryId,
        status: existingLog.status,
        notes: existingLog.notes,
        topics_covered: existingLog.topicsCovered,
      }
    : undefined;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">My Schedule</CardTitle>
            <p className="text-sm text-muted-foreground">
              {FULL_DAY_NAMES[selectedDay]} {isToday && "(Today)"}
            </p>
          </div>
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {/* Day Selector */}
          <div className="flex gap-1 mb-4">
            {WEEKDAYS.map((day) => (
              <Button
                key={day}
                variant={selectedDay === day ? "default" : "outline"}
                size="sm"
                className="flex-1 px-2"
                onClick={() => setSelectedDay(day)}
              >
                {DAY_NAMES[day]}
                {day === todayDayOfWeek && <span className="ml-1 text-xs">•</span>}
              </Button>
            ))}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          )}

          {/* Offline Notice */}
          {!loading && isOffline && entries.length > 0 && (
            <div className="mb-3 rounded-lg border border-muted bg-muted/30 p-2">
              <p className="text-xs text-muted-foreground text-center">
                📶 Showing cached schedule (offline)
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={refetch}>
                Retry
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Coffee className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No classes scheduled for {FULL_DAY_NAMES[selectedDay]}.
              </p>
            </div>
          )}

          {/* Schedule Entries */}
          {!loading && !error && entries.length > 0 && (
            <div className="space-y-2">
              {entries.slice(0, 6).map((entry, index) => {
                const log = periodLogs.get(entry.id);
                const isCurrent = index === currentPeriodIndex;

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                      isCurrent ? "border-primary bg-primary/5" : ""
                    } ${log ? "bg-muted/30" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{entry.subjectName}</p>
                        {log && (
                          <span
                            className="flex items-center gap-0.5"
                            title={`${log.status}${log.topicsCovered ? `: ${log.topicsCovered}` : ""}`}
                          >
                            {getStatusIcon(log.status)}
                          </span>
                        )}
                        {isCurrent && (
                          <Badge variant="default" className="text-xs px-1.5 py-0">
                            Now
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{entry.periodLabel}</span>
                        {entry.startTime && (
                          <span>
                            • {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {entry.sectionLabel && (
                        <Badge variant="outline" className="text-xs whitespace-nowrap hidden sm:inline-flex">
                          {entry.sectionLabel}
                        </Badge>
                      )}
                      {entry.room && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.room}
                        </Badge>
                      )}
                      <Button
                        variant={log ? "ghost" : "outline"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleOpenLog(entry)}
                        title={log ? "Edit log" : "Mark complete"}
                      >
                        {log ? <Pencil className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {entries.length > 6 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{entries.length - 6} more periods
                </p>
              )}
            </div>
          )}

          {/* View Full Timetable Link */}
          <div className="mt-4 pt-3 border-t">
            <Button variant="ghost" size="sm" asChild className="w-full">
              <Link to={`/${schoolSlug}/teacher/timetable`}>
                View Full Timetable <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Period Log Dialog */}
      {dialogEntryForLog && schoolId && (
        <PeriodLogDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          entry={dialogEntryForLog}
          schoolId={schoolId}
          existingLog={existingLogForDialog}
          onSaved={handleLogSaved}
        />
      )}
    </>
  );
}
