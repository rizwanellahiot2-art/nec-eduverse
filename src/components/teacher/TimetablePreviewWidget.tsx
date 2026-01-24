import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
}

interface TimetablePreviewWidgetProps {
  schoolId: string;
  schoolSlug: string;
}

function timeLabel(v: string | null): string {
  if (!v) return "";
  return v.slice(0, 5);
}

export function TimetablePreviewWidget({ schoolId, schoolSlug }: TimetablePreviewWidgetProps) {
  const [todayEntries, setTodayEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodaySchedule = useCallback(async () => {
    setLoading(true);

    const { data: user } = await supabase.auth.getUser();
    const userId = user.user?.id ?? null;
    if (!userId) {
      setLoading(false);
      return;
    }

    // Get today's day of week (0 = Sunday, 6 = Saturday)
    const today = new Date().getDay();

    // Fetch periods
    const { data: periods } = await supabase
      .from("timetable_periods")
      .select("id,label,sort_order,start_time,end_time,is_break")
      .eq("school_id", schoolId)
      .order("sort_order", { ascending: true });

    const periodMap = new Map<string, Period>();
    (periods ?? []).forEach((p: any) => periodMap.set(p.id, p));

    // Fetch today's entries for this teacher
    const { data: entries } = await supabase
      .from("timetable_entries")
      .select("id,subject_name,period_id,room,class_section_id,class_sections(name,academic_classes(name))")
      .eq("school_id", schoolId)
      .eq("teacher_user_id", userId)
      .eq("day_of_week", today)
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
      };
    });

    // Sort by period sort_order
    enriched.sort((a, b) => {
      const pA = periodMap.get(a.period_id);
      const pB = periodMap.get(b.period_id);
      return (pA?.sort_order ?? 0) - (pB?.sort_order ?? 0);
    });

    setTodayEntries(enriched);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    void fetchTodaySchedule();
  }, [fetchTodaySchedule]);

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = dayNames[new Date().getDay()];

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg">Today's Schedule</CardTitle>
          <p className="text-sm text-muted-foreground">{todayName}</p>
        </div>
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {todayEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No classes scheduled for today.</p>
        ) : (
          <div className="space-y-2">
            {todayEntries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.subject_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{entry.period_label}</span>
                    {entry.start_time && (
                      <span>• {timeLabel(entry.start_time)} - {timeLabel(entry.end_time)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {entry.section_label && (
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {entry.section_label}
                    </Badge>
                  )}
                  {entry.room && (
                    <Badge variant="secondary" className="text-xs">
                      {entry.room}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {todayEntries.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{todayEntries.length - 5} more periods
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
  );
}
