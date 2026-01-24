import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type Enrollment = { class_section_id: string };
type Period = { id: string; label: string; sort_order: number; start_time: string | null; end_time: string | null };
type Entry = {
  id: string;
  day_of_week: number;
  period_id: string;
  subject_name: string;
  room: string | null;
};

const dayLabel: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export function StudentTimetableModule({ myStudent, schoolId }: { myStudent: any; schoolId: string }) {
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);

  const refresh = async () => {
    if (myStudent.status !== "ready") return;

    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("class_section_id")
      .eq("school_id", schoolId)
      .eq("student_id", myStudent.studentId);

    const secIds = (enrollments ?? []).map((e) => (e as Enrollment).class_section_id);
    setSectionIds(secIds);

    const [{ data: p }, { data: t }] = await Promise.all([
      supabase
        .from("timetable_periods")
        .select("id,label,sort_order,start_time,end_time")
        .eq("school_id", schoolId)
        .order("sort_order", { ascending: true }),
      secIds.length
        ? supabase
            .from("timetable_entries")
            .select("id,day_of_week,period_id,subject_name,room")
            .eq("school_id", schoolId)
            .in("class_section_id", secIds)
            .order("day_of_week", { ascending: true })
        : Promise.resolve({ data: [] as any[] }),
    ]);
    setPeriods((p ?? []) as Period[]);
    setEntries((t ?? []) as Entry[]);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myStudent.status]);

  const periodLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of periods) {
      const time = p.start_time && p.end_time ? ` (${String(p.start_time).slice(0, 5)}–${String(p.end_time).slice(0, 5)})` : "";
      m.set(p.id, `${p.label}${time}`);
    }
    return m;
  }, [periods]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Your timetable</p>
        <Button variant="soft" onClick={refresh}>Refresh</Button>
      </div>

      <p className="text-xs text-muted-foreground">Sections: {sectionIds.length ? sectionIds.join(", ") : "—"}</p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Day</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Room</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e) => (
            <TableRow key={e.id}>
                <TableCell className="font-medium">{dayLabel[e.day_of_week] ?? String(e.day_of_week)}</TableCell>
              <TableCell className="text-muted-foreground">{periodLabelById.get(e.period_id) ?? e.period_id}</TableCell>
                <TableCell className="text-muted-foreground">{e.subject_name}</TableCell>
              <TableCell className="text-muted-foreground">{e.room ?? "—"}</TableCell>
            </TableRow>
          ))}
          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-sm text-muted-foreground">No timetable entries yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
