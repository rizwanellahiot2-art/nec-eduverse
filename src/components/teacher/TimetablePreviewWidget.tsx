import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Check, ChevronRight, Clock, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PeriodLogDialog } from "./PeriodLogDialog";

interface Period {
  id: string;
  label: string;
  sort_order: number;
  start_time: string | null;
  end_time: string | null;
  is_break: boolean;
}

interface TimetableEntry {
  id: string;
  subject_name: string;
  period_id: string;
  room: string | null;
  section_label: string | null;
  period_label: string;
  start_time: string | null;
  end_time: string | null;
  sort_order: number;
}

interface PeriodLog {
  id: string;
  timetable_entry_id: string;
  status: string;
  notes: string | null;
  topics_covered: string | null;
}

interface TimetablePreviewWidgetProps {
  schoolId: string;
  schoolSlug: string;
}

function timeLabel(v: string | null): string {
  if (!v) return "";
  return v.slice(0, 5);
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

export function TimetablePreviewWidget({ schoolId, schoolSlug }: TimetablePreviewWidgetProps) {
  const [todayEntries, setTodayEntries] = useState<TimetableEntry[]>([]);
  const [periodLogs, setPeriodLogs] = useState<Map<string, PeriodLog>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dialogEntry, setDialogEntry] = useState<TimetableEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay();
    // If weekend (0 or 6), default to Monday (1)
    return today === 0 || today === 6 ? 1 : today;
  });

  const fetchSchedule = useCallback(async (dayOfWeek: number, currentSchoolId: string) => {
    setLoading(true);

    const { data: user } = await supabase.auth.getUser();
    const userId = user.user?.id ?? null;
    if (!userId) {
      setLoading(false);
      return;
    }

    const todayDate = new Date().toISOString().split("T")[0];

    // Fetch periods
    const { data: periods } = await supabase
      .from("timetable_periods")
      .select("id,label,sort_order,start_time,end_time,is_break")
      .eq("school_id", currentSchoolId)
      .order("sort_order", { ascending: true });

    const periodMap = new Map<string, Period>();
    (periods ?? []).forEach((p: any) => periodMap.set(p.id, p));

    // Fetch entries for selected day for this teacher
    const { data: entries } = await supabase
      .from("timetable_entries")
      .select("id,subject_name,period_id,room,class_section_id,class_sections(name,academic_classes(name))")
      .eq("school_id", currentSchoolId)
      .eq("teacher_user_id", userId)
      .eq("day_of_week", dayOfWeek)
      .order("period_id");

    const enriched: TimetableEntry[] = (entries ?? []).map((e: any) => {
      const period = periodMap.get(e.period_id);
      const sectionLabel = e.class_sections
        ? `${e.class_sections.academic_classes?.name || ""} • ${e.class_sections.name}`.trim()
        : null;
      return {
        id: e.id,
        subject_name: e.subject_name,
        period_id: e.period_id,
        room: e.room,
        section_label: sectionLabel,
        period_label: period?.label ?? "",
        start_time: period?.start_time ?? null,
        end_time: period?.end_time ?? null,
        sort_order: period?.sort_order ?? 0,
      };
    });

    // Sort by period sort_order
    enriched.sort((a, b) => a.sort_order - b.sort_order);

    // Fetch today's period logs (only relevant for today's view)
    const entryIds = enriched.map((e) => e.id);
    if (entryIds.length > 0) {
      const { data: logs } = await supabase
        .from("teacher_period_logs")
        .select("id, timetable_entry_id, status, notes, topics_covered")
        .eq("teacher_user_id", userId)
        .eq("log_date", todayDate)
        .in("timetable_entry_id", entryIds);

      const logsMap = new Map<string, PeriodLog>();
      (logs ?? []).forEach((log: any) => {
        logsMap.set(log.timetable_entry_id, log);
      });
      setPeriodLogs(logsMap);
    } else {
      setPeriodLogs(new Map());
    }

    setTodayEntries(enriched);
    setLoading(false);
  }, []);

  // Fetch schedule when selectedDay or schoolId changes
  useEffect(() => {
    if (schoolId) {
      void fetchSchedule(selectedDay, schoolId);
    }
  }, [selectedDay, schoolId, fetchSchedule]);

  const handleOpenLog = (entry: TimetableEntry) => {
    setDialogEntry(entry);
    setDialogOpen(true);
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fullDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayDayOfWeek = new Date().getDay();
  const isToday = selectedDay === todayDayOfWeek;

  // Determine current period based on time (only for today)
  const currentPeriodIndex = useMemo(() => {
    if (!isToday) return -1;
    
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    
    for (let i = 0; i < todayEntries.length; i++) {
      const entry = todayEntries[i];
      if (entry.start_time && entry.end_time) {
        const start = entry.start_time.slice(0, 5);
        const end = entry.end_time.slice(0, 5);
        if (currentTime >= start && currentTime <= end) {
          return i;
        }
      }
    }
    return -1;
  }, [todayEntries, isToday]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Today's Schedule</CardTitle>
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const existingLog = dialogEntry ? periodLogs.get(dialogEntry.id) : null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">My Schedule</CardTitle>
            <p className="text-sm text-muted-foreground">
              {fullDayNames[selectedDay]} {isToday && "(Today)"}
            </p>
          </div>
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {/* Day Selector */}
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((day) => (
              <Button
                key={day}
                variant={selectedDay === day ? "default" : "outline"}
                size="sm"
                className="flex-1 px-2"
                onClick={() => setSelectedDay(day)}
              >
                {dayNames[day]}
                {day === todayDayOfWeek && <span className="ml-1 text-xs">•</span>}
              </Button>
            ))}
          </div>
          {todayEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes scheduled for today.</p>
          ) : (
            <div className="space-y-2">
              {todayEntries.slice(0, 6).map((entry, index) => {
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
                        <p className="text-sm font-medium truncate">{entry.subject_name}</p>
                        {log && (
                          <span className="flex items-center gap-0.5" title={`${log.status}${log.topics_covered ? `: ${log.topics_covered}` : ""}`}>
                            {getStatusIcon(log.status)}
                          </span>
                        )}
                        {isCurrent && (
                          <Badge variant="default" className="text-xs px-1.5 py-0">Now</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{entry.period_label}</span>
                        {entry.start_time && (
                          <span>• {timeLabel(entry.start_time)} - {timeLabel(entry.end_time)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {entry.section_label && (
                        <Badge variant="outline" className="text-xs whitespace-nowrap hidden sm:inline-flex">
                          {entry.section_label}
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
              {todayEntries.length > 6 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{todayEntries.length - 6} more periods
                </p>
              )}
            </div>
          )}
          <div className="mt-4 pt-3 border-t">
            <Button variant="ghost" size="sm" asChild className="w-full">
              <Link to={`/${schoolSlug}/teacher/timetable`}>
                View Full Timetable <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {dialogEntry && (
        <PeriodLogDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          entry={dialogEntry}
          schoolId={schoolId}
          existingLog={existingLog}
          onSaved={() => fetchSchedule(selectedDay, schoolId)}
        />
      )}
    </>
  );
}
