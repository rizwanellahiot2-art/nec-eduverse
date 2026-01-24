import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodTimetableGrid, type PeriodTimetableEntry } from "@/components/timetable/PeriodTimetableGrid";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [myEntries, setMyEntries] = useState<TimetableEntry[]>([]);
  const [sectionEntries, setSectionEntries] = useState<TimetableEntry[]>([]);
  const [viewMode, setViewMode] = useState<"mine" | "sections">("mine");
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

      const userId = user.user?.id ?? null;

      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("class_section_id")
        .eq("school_id", tenant.schoolId);
      const sectionIds = (assignments ?? []).map((a) => a.class_section_id).filter(Boolean);

      const [{ data: mine }, { data: bySections }] = await Promise.all([
        supabase
          .from("timetable_entries")
          .select("id,subject_name,day_of_week,period_id,room,teacher_user_id,class_section_id, class_sections(name, academic_classes(name))")
          .eq("school_id", tenant.schoolId)
          .eq("teacher_user_id", userId)
          .order("day_of_week")
          .order("period_id"),
        sectionIds.length
          ? supabase
              .from("timetable_entries")
              .select("id,subject_name,day_of_week,period_id,room,teacher_user_id,class_section_id, class_sections(name, academic_classes(name))")
              .eq("school_id", tenant.schoolId)
              .in("class_section_id", sectionIds)
              .order("day_of_week")
              .order("period_id")
          : Promise.resolve({ data: [] as any }),
      ]);

      const enrich = (rows: any[] | null | undefined) =>
        (rows ?? []).map((e: any) => {
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

      const mineEnriched = enrich(mine as any);
      const sectionEnriched = enrich(bySections as any);
      setMyEntries(mineEnriched as any);
      setSectionEntries(sectionEnriched as any);

      // Default: My periods (per your choice). If empty but sections exist, auto-switch.
      if (mineEnriched.length === 0 && sectionEnriched.length > 0) setViewMode("sections");
      setLoading(false);
    };

    fetchTimetable();
  }, [tenant.status, tenant.schoolId]);

  const teacherLabelByUserId = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of directory) m.set(d.user_id, d.display_name ?? d.email);
    return m;
  }, [directory]);

  const entries = viewMode === "mine" ? myEntries : sectionEntries;

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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end no-print">
        <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <SelectTrigger className="w-full sm:w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mine">My periods</SelectItem>
            <SelectItem value="sections">All assigned sections</SelectItem>
          </SelectContent>
        </Select>

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
              No timetable entries found for this view.
            </p>
          ) : (
            <PeriodTimetableGrid periods={periods} entries={gridEntries} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
