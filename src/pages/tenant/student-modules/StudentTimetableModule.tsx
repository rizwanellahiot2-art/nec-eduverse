import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PeriodTimetableGrid, type PeriodTimetableEntry } from "@/components/timetable/PeriodTimetableGrid";
import { Printer } from "lucide-react";

type Enrollment = { class_section_id: string };
type Period = { id: string; label: string; sort_order: number; start_time: string | null; end_time: string | null };
type Entry = {
  id: string;
  day_of_week: number;
  period_id: string;
  subject_name: string;
  teacher_user_id: string | null;
  room: string | null;
};

export function StudentTimetableModule({ myStudent, schoolId }: { myStudent: any; schoolId: string }) {
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [directory, setDirectory] = useState<Array<{ user_id: string; display_name: string | null; email: string }>>([]);

  const refresh = async () => {
    if (myStudent.status !== "ready") return;

    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("class_section_id")
      .eq("school_id", schoolId)
      .eq("student_id", myStudent.studentId);

    const secIds = (enrollments ?? []).map((e) => (e as Enrollment).class_section_id);
    setSectionIds(secIds);

    const [{ data: p }, { data: t }, { data: dir }] = await Promise.all([
      supabase
        .from("timetable_periods")
        .select("id,label,sort_order,start_time,end_time")
        .eq("school_id", schoolId)
        .order("sort_order", { ascending: true }),
      secIds.length
        ? supabase
            .from("timetable_entries")
            .select("id,day_of_week,period_id,subject_name,teacher_user_id,room")
            .eq("school_id", schoolId)
            .in("class_section_id", secIds)
            .order("day_of_week", { ascending: true })
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("school_user_directory").select("user_id,display_name,email").eq("school_id", schoolId),
    ]);
    setPeriods((p ?? []) as Period[]);
    setEntries((t ?? []) as Entry[]);
    setDirectory((dir ?? []) as any);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myStudent.status]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Your timetable</p>
        <div className="flex gap-2 no-print">
          <Button variant="soft" onClick={refresh}>Refresh</Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Sections: {sectionIds.length ? sectionIds.join(", ") : "—"}</p>

      {entries.length === 0 ? (
        <div className="rounded-3xl bg-surface p-6 shadow-elevated">
          <p className="text-sm text-muted-foreground">No timetable entries yet.</p>
        </div>
      ) : (
        <div className="print-area">
          <PeriodTimetableGrid periods={periods} entries={gridEntries} />
        </div>
      )}
    </div>
  );
}
