import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ChildInfo } from "@/hooks/useMyChildren";

interface ParentTimetableModuleProps {
  child: ChildInfo | null;
  schoolId: string | null;
}

interface TimetableEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_name: string | null;
  room: string | null;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ParentTimetableModule = ({ child, schoolId }: ParentTimetableModuleProps) => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionId, setSectionId] = useState<string | null>(null);

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

      const { data, error } = await supabase
        .from("timetable_entries")
        .select("id, day_of_week, start_time, end_time, subject_name, room")
        .eq("class_section_id", sectionId)
        .order("day_of_week")
        .order("start_time");

      if (error) {
        console.error("Failed to fetch timetable:", error);
        setLoading(false);
        return;
      }

      const formatted: TimetableEntry[] = (data || []).map((e) => ({
        id: e.id,
        day_of_week: e.day_of_week,
        start_time: e.start_time,
        end_time: e.end_time,
        subject_name: e.subject_name,
        room: e.room,
      }));

      setEntries(formatted);
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

  // Group by day
  const byDay = DAYS.map((dayName, idx) => ({
    day: dayName,
    entries: entries.filter((e) => e.day_of_week === idx),
  })).filter((d) => d.entries.length > 0);

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
      ) : byDay.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No timetable entries found for this section.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {byDay.map(({ day, entries: dayEntries }) => (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{day}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Room</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">
                          {entry.start_time?.slice(0, 5)} - {entry.end_time?.slice(0, 5)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.subject_name || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.room || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParentTimetableModule;
