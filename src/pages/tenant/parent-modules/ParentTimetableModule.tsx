import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ChildInfo } from "@/hooks/useMyChildren";
import { PeriodTimetableGrid, type PeriodTimetableEntry } from "@/components/timetable/PeriodTimetableGrid";

interface ParentTimetableModuleProps {
  child: ChildInfo | null;
  schoolId: string | null;
}

interface TimetableEntry {
  id: string;
  day_of_week: number;
  period_id: string;
  subject_name: string | null;
  room: string | null;
  teacher_user_id: string | null;
}

type Period = { id: string; label: string; sort_order: number; start_time: string | null; end_time: string | null };

const ParentTimetableModule = ({ child, schoolId }: ParentTimetableModuleProps) => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [directory, setDirectory] = useState<Array<{ user_id: string; display_name: string | null; email: string }>>([]);

  const teacherLabelByUserId = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of directory) m.set(d.user_id, d.display_name ?? d.email);
    return m;
  }, [directory]);

  const gridEntries = useMemo(() => {
    return entries.map((e) =>
      ({
        id: e.id,
        day_of_week: e.day_of_week,
        period_id: e.period_id,
        subject_name: e.subject_name,
        room: e.room,
        teacher_name: e.teacher_user_id ? teacherLabelByUserId.get(e.teacher_user_id) ?? null : null,
      }) satisfies PeriodTimetableEntry
    );
  }, [entries, teacherLabelByUserId]);

  // Fetch child's current section
  useEffect(() => {
    if (!child || !schoolId) return;

    const fetchSection = async () => {
      const { data } = await supabase
        .from("student_enrollments")
        .select("class_section_id")
        .eq("student_id", child.student_id)
        .is("end_date", null)
        .order("start_date", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setSectionId(data.class_section_id);
      }
    };

    fetchSection();
  }, [child, schoolId]);

  // Fetch timetable entries
  useEffect(() => {
    if (!sectionId || !schoolId) return;

    const fetchTimetable = async () => {
      setLoading(true);

      const [{ data: p }, { data, error }, { data: dir }] = await Promise.all([
        supabase
          .from("timetable_periods")
          .select("id,label,sort_order,start_time,end_time")
          .eq("school_id", schoolId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("timetable_entries")
          .select("id, day_of_week, period_id, subject_name, room, teacher_user_id")
          .eq("school_id", schoolId)
          .eq("class_section_id", sectionId)
          .order("day_of_week")
          .order("period_id"),
        supabase.from("school_user_directory").select("user_id,display_name,email").eq("school_id", schoolId),
      ]);

      if (error) {
        console.error("Failed to fetch timetable:", error);
        setLoading(false);
        return;
      }

      const formatted: TimetableEntry[] = (data || []).map((e: any) => ({
        id: e.id,
        day_of_week: e.day_of_week,
        period_id: e.period_id,
        subject_name: e.subject_name,
        room: e.room,
        teacher_user_id: e.teacher_user_id,
      }));

      setEntries(formatted);
      setPeriods((p ?? []) as any);
      setDirectory((dir ?? []) as any);
      setLoading(false);
    };

    fetchTimetable();
  }, [sectionId, schoolId]);

  if (!child) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Please select a child to view timetable.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Timetable</h1>
        <p className="text-muted-foreground">
          Weekly schedule for {child.first_name || "your child"}
          {child.class_name && ` • ${child.class_name}`}
          {child.section_name && ` / ${child.section_name}`}
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No timetable entries found for this section.
          </CardContent>
        </Card>
      ) : (
        <PeriodTimetableGrid periods={periods} entries={gridEntries} />
      )}
    </div>
  );
};

export default ParentTimetableModule;
