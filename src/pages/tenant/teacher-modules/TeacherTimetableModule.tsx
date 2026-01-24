import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodTimetableGrid, type PeriodTimetableEntry } from "@/components/timetable/PeriodTimetableGrid";
import { TimetableConflictAlert } from "@/components/timetable/TimetableConflictAlert";
import { Button } from "@/components/ui/button";
import { Printer, Coffee, Download, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { openTimetablePdf, downloadTimetableHtml, type TimetablePdfData } from "@/lib/timetable-pdf";
import { useConflictDetection } from "@/pages/tenant/modules/components/timetable/useConflictDetection";

type Period = {
  id: string;
  label: string;
  sort_order: number;
  start_time: string | null;
  end_time: string | null;
  is_break: boolean;
};

interface TimetableEntry {
  id: string;
  subject_name: string;
  day_of_week: number;
  period_id: string;
  room: string | null;
  teacher_user_id: string | null;
  section_label: string | null;
  class_section_id: string | null;
}

interface SectionInfo {
  id: string;
  label: string;
}

type AllEntryRow = {
  id: string;
  day_of_week: number;
  period_id: string;
  subject_name: string;
  teacher_user_id: string | null;
  room: string | null;
  class_section_id: string;
};

export function TeacherTimetableModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);
  const schoolName = useMemo(() => (tenant.status === "ready" ? tenant.school.name : "School"), [tenant.status, tenant.school]);
  
  const [myEntries, setMyEntries] = useState<TimetableEntry[]>([]);
  const [sectionEntries, setSectionEntries] = useState<TimetableEntry[]>([]);
  const [allSchoolEntries, setAllSchoolEntries] = useState<AllEntryRow[]>([]);
  const [viewMode, setViewMode] = useState<"mine" | "sections">("mine");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [directory, setDirectory] = useState<Array<{ user_id: string; display_name: string | null; email: string }>>([]);
  const [mySections, setMySections] = useState<SectionInfo[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("Teacher");
  const [loading, setLoading] = useState(true);

  // Build section label map for conflict detection
  const sectionLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of mySections) m.set(s.id, s.label);
    return m;
  }, [mySections]);

  // Conflict detection - check for teacher double-bookings and room collisions
  const conflictMap = useConflictDetection(allSchoolEntries, "", sectionLabelById);

  // Filter conflicts to only show those affecting current user's entries
  const myConflicts = useMemo(() => {
    const filtered = new Map<string, typeof conflictMap extends Map<string, infer V> ? V : never>();
    const entries = viewMode === "mine" ? myEntries : sectionEntries;
    for (const e of entries) {
      const conflicts = conflictMap.get(e.id);
      if (conflicts && conflicts.length > 0) {
        filtered.set(e.id, conflicts);
      }
    }
    return filtered;
  }, [conflictMap, myEntries, sectionEntries, viewMode]);

  // Entry labels for conflict alert display
  const entryLabels = useMemo(() => {
    const m = new Map<string, string>();
    const entries = viewMode === "mine" ? myEntries : sectionEntries;
    for (const e of entries) {
      m.set(e.id, `${e.subject_name} (${e.section_label || "Unknown section"})`);
    }
    return m;
  }, [myEntries, sectionEntries, viewMode]);

  const fetchTimetable = useCallback(async () => {
    if (tenant.status !== "ready") return;
    setLoading(true);

    const { data: user } = await supabase.auth.getUser();
    const userId = user.user?.id ?? null;

    if (!userId) {
      console.error("TeacherTimetableModule: No user ID found");
      setLoading(false);
      return;
    }

    setCurrentUserId(userId);

    // Fetch periods, directory, and all school entries for conflict detection
    const [{ data: p }, { data: dir }, { data: allEntries }] = await Promise.all([
      supabase
        .from("timetable_periods")
        .select("id,label,sort_order,start_time,end_time,is_break")
        .eq("school_id", tenant.schoolId)
        .order("sort_order", { ascending: true }),
      supabase.from("school_user_directory").select("user_id,display_name,email").eq("school_id", tenant.schoolId),
      supabase
        .from("timetable_entries")
        .select("id,subject_name,day_of_week,period_id,room,teacher_user_id,class_section_id")
        .eq("school_id", tenant.schoolId),
    ]);

    setPeriods((p ?? []) as Period[]);
    setDirectory((dir ?? []) as any);
    setAllSchoolEntries((allEntries ?? []) as AllEntryRow[]);

    // Get current user's display name
    const currentUserDir = (dir ?? []).find((d: any) => d.user_id === userId);
    if (currentUserDir) {
      setCurrentUserName((currentUserDir as any).display_name || (currentUserDir as any).email || "Teacher");
    }

    // Get teacher's assigned sections
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select("class_section_id")
      .eq("school_id", tenant.schoolId)
      .eq("teacher_user_id", userId);
    const sectionIds = (assignments ?? []).map((a) => a.class_section_id).filter(Boolean) as string[];

    // Get section labels
    if (sectionIds.length > 0) {
      const { data: secs } = await supabase
        .from("class_sections")
        .select("id, name, academic_classes(name)")
        .in("id", sectionIds);
      setMySections((secs ?? []).map((s: any) => ({
        id: s.id,
        label: `${s.academic_classes?.name || ""} • ${s.name}`.trim(),
      })));
    } else {
      setMySections([]);
    }

    // Fetch ALL timetable entries with section info
    const { data: entriesWithSections, error: entriesError } = await supabase
      .from("timetable_entries")
      .select("id,subject_name,day_of_week,period_id,room,teacher_user_id,class_section_id, class_sections(name, academic_classes(name))")
      .eq("school_id", tenant.schoolId)
      .order("day_of_week")
      .order("period_id");

    if (entriesError) {
      console.error("TeacherTimetableModule: Error fetching entries", entriesError);
    }

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
          class_section_id: e.class_section_id,
        } satisfies TimetableEntry;
      });

    const enrichedAll = enrich(entriesWithSections);

    // Filter: "My periods" = entries where I am the teacher
    const mineEnriched = enrichedAll.filter((e) => e.teacher_user_id === userId);
    
    // Filter: "All assigned sections" = entries in sections I'm assigned to
    const sectionSet = new Set(sectionIds);
    const sectionEnriched = enrichedAll.filter((e) => e.class_section_id && sectionSet.has(e.class_section_id));

    setMyEntries(mineEnriched);
    setSectionEntries(sectionEnriched);

    // Default: My periods. If empty but sections exist, auto-switch.
    if (mineEnriched.length === 0 && sectionEnriched.length > 0) setViewMode("sections");
    setLoading(false);
  }, [tenant.status, tenant.schoolId]);

  useEffect(() => {
    void fetchTimetable();
  }, [fetchTimetable]);

  // Realtime subscription for live updates
  useRealtimeTable({
    channel: `teacher-timetable-${schoolId}`,
    table: "timetable_entries",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId,
    onChange: () => void fetchTimetable(),
  });

  const teacherLabelByUserId = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of directory) m.set(d.user_id, d.display_name ?? d.email);
    return m;
  }, [directory]);

  const entries = viewMode === "mine" ? myEntries : sectionEntries;

  // Break period IDs
  const breakPeriodIds = useMemo(() => new Set(periods.filter((p) => p.is_break).map((p) => p.id)), [periods]);

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

  // Stats
  const uniqueSections = useMemo(() => new Set(entries.map((e) => e.class_section_id).filter(Boolean)).size, [entries]);
  const totalPeriods = entries.length;
  const uniqueSubjects = useMemo(() => new Set(entries.map((e) => e.subject_name).filter(Boolean)).size, [entries]);
  const conflictCount = myConflicts.size;

  // PDF export handler
  const handleExportPdf = useCallback(() => {
    const pdfData: TimetablePdfData = {
      teacherName: currentUserName,
      schoolName,
      periods,
      entries: entries.map((e) => ({
        day_of_week: e.day_of_week,
        period_id: e.period_id,
        subject_name: e.subject_name,
        room: e.room,
        section_label: e.section_label,
        teacher_name: e.teacher_user_id ? teacherLabelByUserId.get(e.teacher_user_id) ?? null : null,
      })),
      generatedAt: new Date().toLocaleString(),
    };
    openTimetablePdf(pdfData);
  }, [currentUserName, schoolName, periods, entries, teacherLabelByUserId]);

  const handleDownloadHtml = useCallback(() => {
    const pdfData: TimetablePdfData = {
      teacherName: currentUserName,
      schoolName,
      periods,
      entries: entries.map((e) => ({
        day_of_week: e.day_of_week,
        period_id: e.period_id,
        subject_name: e.subject_name,
        room: e.room,
        section_label: e.section_label,
        teacher_name: e.teacher_user_id ? teacherLabelByUserId.get(e.teacher_user_id) ?? null : null,
      })),
      generatedAt: new Date().toLocaleString(),
    };
    downloadTimetableHtml(pdfData);
  }, [currentUserName, schoolName, periods, entries, teacherLabelByUserId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Conflict Alert */}
      {conflictCount > 0 && (
        <TimetableConflictAlert conflicts={myConflicts} entryLabels={entryLabels} />
      )}

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="secondary" className="text-sm">
          {totalPeriods} periods
        </Badge>
        <Badge variant="secondary" className="text-sm">
          {uniqueSections} sections
        </Badge>
        <Badge variant="secondary" className="text-sm">
          {uniqueSubjects} subjects
        </Badge>
        {periods.some((p) => p.is_break) && (
          <Badge variant="outline" className="text-sm">
            <Coffee className="mr-1 h-3 w-3" />
            {periods.filter((p) => p.is_break).length} breaks
          </Badge>
        )}
        {conflictCount > 0 && (
          <Badge variant="destructive" className="text-sm">
            {conflictCount} conflict{conflictCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end no-print">
        <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <SelectTrigger className="w-full sm:w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mine">My periods ({myEntries.length})</SelectItem>
            <SelectItem value="sections">All assigned sections ({sectionEntries.length})</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPdf} disabled={entries.length === 0}>
            <FileText className="mr-2 h-4 w-4" /> Export PDF
          </Button>
          <Button variant="outline" onClick={handleDownloadHtml} disabled={entries.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Assigned sections list */}
      {mySections.length > 0 && (
        <Card className="no-print">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Assigned Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {mySections.map((s) => (
                <Badge key={s.id} variant="outline">{s.label}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="print-area">
        <CardHeader className="no-print">
          <CardTitle>My Weekly Schedule</CardTitle>
          <p className="text-sm text-muted-foreground">
            {viewMode === "mine" 
              ? "Periods where you are the assigned teacher" 
              : "All periods in your assigned sections"}
          </p>
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
