import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodTimetableGrid, type PeriodTimetableEntry } from "@/components/timetable/PeriodTimetableGrid";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type Period = { id: string; label: string; sort_order: number; start_time: string | null; end_time: string | null };

interface TimetableEntry {
  id: string;
  subject_name: string;
  day_of_week: number;
  period_id: string;
  room: string | null;
  teacher_user_id: string | null;
  section_label: string | null;
}

export function TeacherTimetableModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [directory, setDirectory] = useState<Array<{ user_id: string; display_name: string | null; email: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant.status !== "ready") return;

    const fetchTimetable = async () => {
      setLoading(true);

      const { data: user } = await supabase.auth.getUser();

      const [{ data: p }, { data: dir }] = await Promise.all([
        supabase
          .from("timetable_periods")
          .select("id,label,sort_order,start_time,end_time")
          .eq("school_id", tenant.schoolId)
          .order("sort_order", { ascending: true }),
        supabase.from("school_user_directory").select("user_id,display_name,email").eq("school_id", tenant.schoolId),
      ]);

      setPeriods((p ?? []) as any);
      setDirectory((dir ?? []) as any);

      // Get teacher's timetable entries
      const { data: timetableData } = await supabase
        .from("timetable_entries")
        .select("id,subject_name,day_of_week,period_id,room,teacher_user_id,class_section_id, class_sections(name, academic_classes(name))")
        .eq("school_id", tenant.schoolId)
        .eq("teacher_user_id", user.user?.id)
        .order("day_of_week")
        .order("period_id");

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
            .select("id,subject_name,day_of_week,period_id,room,teacher_user_id,class_section_id, class_sections(name, academic_classes(name))")
            .eq("school_id", tenant.schoolId)
            .in("class_section_id", sectionIds)
            .order("day_of_week")
            .order("period_id");

          if (sectionTimetable?.length) {
            const enriched = sectionTimetable.map((e: any) => {
              const sectionLabel = e.class_sections
                ? `${e.class_sections.academic_classes?.name || ""} • ${e.class_sections.name}`.trim()
                : null;
              return {
                id: e.id,
                subject_name: e.subject_name,
                day_of_week: e.day_of_week,
                period_id: e.period_id,
                room: e.room,
                teacher_user_id: e.teacher_user_id,
                section_label: sectionLabel,
              } satisfies TimetableEntry;
            });
            setEntries(enriched as any);
          }
        }
        setLoading(false);
        return;
      }

      const enriched = timetableData.map((e: any) => {
        const sectionLabel = e.class_sections
          ? `${e.class_sections.academic_classes?.name || ""} • ${e.class_sections.name}`.trim()
          : null;
        return {
          id: e.id,
          subject_name: e.subject_name,
          day_of_week: e.day_of_week,
          period_id: e.period_id,
          room: e.room,
          teacher_user_id: e.teacher_user_id,
          section_label: sectionLabel,
        } satisfies TimetableEntry;
      });

      setEntries(enriched);
      setLoading(false);
    };

    fetchTimetable();
  }, [tenant.status, tenant.schoolId]);

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
        section_label: e.section_label,
      }) satisfies PeriodTimetableEntry
    );
  }, [entries, teacherLabelByUserId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end no-print">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </div>

      <Card className="print-area">
        <CardHeader className="no-print">
          <CardTitle>My Timetable</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No timetable entries found. Timetable can be configured by school administrators.
            </p>
          ) : (
            <PeriodTimetableGrid periods={periods} entries={gridEntries} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
