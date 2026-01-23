import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimetableEntry {
  id: string;
  subject_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  section_name: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function TeacherTimetableModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant.status !== "ready") return;

    const fetchTimetable = async () => {
      setLoading(true);

      const { data: user } = await supabase.auth.getUser();

      // Get teacher's timetable entries
      const { data: timetableData } = await supabase
        .from("timetable_entries")
        .select("*, class_sections(name, academic_classes(name))")
        .eq("school_id", tenant.schoolId)
        .eq("teacher_user_id", user.user?.id)
        .order("day_of_week")
        .order("start_time");

      if (!timetableData?.length) {
        // Also check for sections they're assigned to
        const { data: assignments } = await supabase
          .from("teacher_assignments")
          .select("class_section_id")
          .eq("school_id", tenant.schoolId);

        if (assignments?.length) {
          const sectionIds = assignments.map((a) => a.class_section_id);
          const { data: sectionTimetable } = await supabase
            .from("timetable_entries")
            .select("*, class_sections(name, academic_classes(name))")
            .eq("school_id", tenant.schoolId)
            .in("class_section_id", sectionIds)
            .order("day_of_week")
            .order("start_time");

          if (sectionTimetable?.length) {
            const enriched = sectionTimetable.map((e: any) => ({
              id: e.id,
              subject_name: e.subject_name,
              day_of_week: e.day_of_week,
              start_time: e.start_time,
              end_time: e.end_time,
              room: e.room,
              section_name: e.class_sections
                ? `${e.class_sections.academic_classes?.name || ""} - ${e.class_sections.name}`
                : "",
            }));
            setEntries(enriched);
          }
        }
        setLoading(false);
        return;
      }

      const enriched = timetableData.map((e: any) => ({
        id: e.id,
        subject_name: e.subject_name,
        day_of_week: e.day_of_week,
        start_time: e.start_time,
        end_time: e.end_time,
        room: e.room,
        section_name: e.class_sections
          ? `${e.class_sections.academic_classes?.name || ""} - ${e.class_sections.name}`
          : "",
      }));

      setEntries(enriched);
      setLoading(false);
    };

    fetchTimetable();
  }, [tenant.status, tenant.schoolId]);

  const groupedByDay = DAYS.map((day, index) => ({
    day,
    entries: entries.filter((e) => e.day_of_week === index),
  })).filter((g) => g.entries.length > 0);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>My Timetable</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No timetable entries found. Timetable can be configured by school administrators.
            </p>
          ) : (
            <div className="space-y-6">
              {groupedByDay.map((group) => (
                <div key={group.day}>
                  <h3 className="mb-3 font-semibold text-lg">{group.day}</h3>
                  <div className="grid gap-2">
                    {group.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-lg border bg-accent/30 p-3"
                      >
                        <div>
                          <p className="font-medium">{entry.subject_name}</p>
                          <p className="text-sm text-muted-foreground">{entry.section_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                          </p>
                          {entry.room && (
                            <p className="text-sm text-muted-foreground">Room: {entry.room}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
