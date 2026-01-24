import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { DndContext, type DragEndEvent, useDraggable, useDroppable, TouchSensor, MouseSensor, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { useParams } from "react-router-dom";
import { CalendarDays, Coffee, Download, Pencil, Printer, Trash2, Wrench } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useSession } from "@/hooks/useSession";
import { useSchoolPermissions } from "@/hooks/useSchoolPermissions";
import { useRealtimeTable } from "@/hooks/useRealtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import { PeriodManagerCard } from "./components/PeriodManagerCard";
import { PeriodTimetableGrid, type PeriodTimetableEntry } from "@/components/timetable/PeriodTimetableGrid";
import { PrintPreviewDialog } from "@/components/timetable/PrintPreviewDialog";
import { TimetableToolsDialog } from "./components/TimetableToolsDialog";
import { ConflictBadge, type ConflictInfo } from "./components/timetable/ConflictBadge";
import { useConflictDetection } from "./components/timetable/useConflictDetection";
import { TeacherTypeahead } from "./components/timetable/TeacherTypeahead";
import { PublishControls } from "./components/timetable/PublishControls";
import { useTimetableExport } from "./components/timetable/useTimetableExport";

type PeriodRow = {
  id: string;
  label: string;
  sort_order: number;
  start_time: string | null;
  end_time: string | null;
  is_break: boolean;
};

type ClassRow = { id: string; name: string };
type SectionRow = { id: string; name: string; class_id: string };
type SubjectRow = { id: string; name: string };
type ClassSectionSubjectRow = { class_section_id: string; subject_id: string };
type TeacherSubjectAssignmentRow = { class_section_id: string; subject_id: string; teacher_user_id: string };
type DirectoryRow = { user_id: string; display_name: string | null; email: string };

type EntryRow = {
  id: string;
  day_of_week: number;
  period_id: string;
  subject_name: string;
  teacher_user_id: string | null;
  room: string | null;
  is_published?: boolean;
};

type AllEntryRow = EntryRow & { class_section_id: string };

const DAYS: Array<{ id: number; label: string }> = [
  { id: 0, label: "Sun" },
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
];

function timeLabel(v: string | null) {
  if (!v) return "";
  return String(v).slice(0, 5);
}

function SubjectTile({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, touchAction: "none" }
    : { touchAction: "none" };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={
        "cursor-grab select-none rounded-2xl border bg-surface px-3 py-2 text-sm shadow-sm transition active:cursor-grabbing touch-none " +
        (isDragging ? "opacity-70 z-50" : "")
      }
    >
      {label}
    </div>
  );
}

function TimetableCell({
  id,
  title,
  subtitle,
  meta,
  conflicts,
  onClear,
  onEdit,
}: {
  id: string;
  title: string | null;
  subtitle: string | null;
  meta: string | null;
  conflicts: ConflictInfo[];
  onClear: (() => void) | null;
  onEdit: (() => void) | null;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const hasConflicts = conflicts.length > 0;

  return (
    <div
      ref={setNodeRef}
      className={
        "group relative min-h-[68px] rounded-2xl border bg-surface p-2 transition " +
        (isOver ? "ring-2 ring-primary/40" : "") +
        (hasConflicts ? " border-destructive/50 bg-destructive/5" : "")
      }
    >
      {title ? (
        <div className="space-y-0.5 pr-8">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium leading-snug">{title}</p>
            <ConflictBadge conflicts={conflicts} />
          </div>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Drop subject</p>
      )}

      <div className="absolute right-2 top-2 hidden items-center gap-1 group-hover:flex">
        {onEdit && title && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        {onClear && title && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Clear"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function TimetableBuilderModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);
  const { user } = useSession();
  const perms = useSchoolPermissions(schoolId);
  const canEdit = perms.canManageStudents;

  // Touch and mouse sensors for drag-drop on mobile/tablet
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const sensors = useSensors(mouseSensor, touchSensor, pointerSensor);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [directory, setDirectory] = useState<DirectoryRow[]>([]);

  const [sectionId, setSectionId] = useState<string>("");
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherSubjectAssignmentRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [allSchoolEntries, setAllSchoolEntries] = useState<AllEntryRow[]>([]);
  const [busy, setBusy] = useState(false);

  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [editTeacherUserId, setEditTeacherUserId] = useState<string>("");
  const [editRoom, setEditRoom] = useState<string>("");

  const [toolsOpen, setToolsOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);

  const refreshStatic = useCallback(async () => {
    if (!schoolId) return;
    const [{ data: c }, { data: s }, { data: p }, { data: dir }] = await Promise.all([
      supabase.from("academic_classes").select("id,name").eq("school_id", schoolId).order("name"),
      supabase.from("class_sections").select("id,name,class_id").eq("school_id", schoolId).order("name"),
      supabase
        .from("timetable_periods")
        .select("id,label,sort_order,start_time,end_time,is_break")
        .eq("school_id", schoolId)
        .order("sort_order", { ascending: true }),
      supabase.from("school_user_directory").select("user_id,display_name,email").eq("school_id", schoolId),
    ]);

    setClasses((c ?? []) as ClassRow[]);
    setSections((s ?? []) as SectionRow[]);
    setPeriods((p ?? []) as PeriodRow[]);
    setDirectory((dir ?? []) as DirectoryRow[]);
  }, [schoolId]);

  const refreshAllEntries = useCallback(async () => {
    if (!schoolId) return;
    const { data } = await supabase
      .from("timetable_entries")
      .select("id,day_of_week,period_id,subject_name,teacher_user_id,room,class_section_id,is_published")
      .eq("school_id", schoolId);
    setAllSchoolEntries((data ?? []) as AllEntryRow[]);
  }, [schoolId]);

  const refreshSection = useCallback(async () => {
    if (!schoolId || !sectionId) return;
    const [{ data: css }, { data: subj }, { data: tsa }, { data: tte }] = await Promise.all([
      supabase
        .from("class_section_subjects")
        .select("class_section_id,subject_id")
        .eq("school_id", schoolId)
        .eq("class_section_id", sectionId),
      supabase.from("subjects").select("id,name").eq("school_id", schoolId).order("name"),
      supabase
        .from("teacher_subject_assignments")
        .select("class_section_id,subject_id,teacher_user_id")
        .eq("school_id", schoolId)
        .eq("class_section_id", sectionId),
      supabase
        .from("timetable_entries")
        .select("id,day_of_week,period_id,subject_name,teacher_user_id,room,is_published")
        .eq("school_id", schoolId)
        .eq("class_section_id", sectionId),
    ]);

    const allowedSubjectIds = new Set((css ?? []).map((r) => (r as ClassSectionSubjectRow).subject_id));
    setSubjects(((subj ?? []) as SubjectRow[]).filter((s) => allowedSubjectIds.has(s.id)));
    setTeacherAssignments((tsa ?? []) as TeacherSubjectAssignmentRow[]);
    setEntries((tte ?? []) as EntryRow[]);
    
    // Also refresh all entries for conflict detection
    await refreshAllEntries();
  }, [schoolId, sectionId, refreshAllEntries]);

  const refreshPeriods = useCallback(async () => {
    await refreshStatic();
    await refreshSection();
  }, [refreshStatic, refreshSection]);

  useEffect(() => {
    void refreshStatic();
    void refreshAllEntries();
  }, [refreshStatic, refreshAllEntries]);

  useEffect(() => {
    void refreshSection();
  }, [refreshSection]);

  // Realtime subscription for live updates
  useRealtimeTable({
    channel: `timetable-entries-${schoolId}`,
    table: "timetable_entries",
    filter: schoolId ? `school_id=eq.${schoolId}` : undefined,
    enabled: !!schoolId,
    onChange: () => {
      void refreshAllEntries();
      if (sectionId) void refreshSection();
    },
  });

  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);
  const sectionLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sections) m.set(s.id, `${classNameById.get(s.class_id) ?? "Class"} • ${s.name}`);
    return m;
  }, [sections, classNameById]);

  const teacherLabelByUserId = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of directory) m.set(d.user_id, d.display_name ?? d.email);
    return m;
  }, [directory]);

  const subjectNameById = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  const teacherBySubjectId = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of teacherAssignments) m.set(a.subject_id, a.teacher_user_id);
    return m;
  }, [teacherAssignments]);

  const entryBySlot = useMemo(() => {
    const m = new Map<string, EntryRow>();
    for (const e of entries) m.set(`${e.day_of_week}:${e.period_id}`, e);
    return m;
  }, [entries]);

  // Break period IDs
  const breakPeriodIds = useMemo(() => new Set(periods.filter((p) => p.is_break).map((p) => p.id)), [periods]);

  // Conflict detection
  const conflictMap = useConflictDetection(allSchoolEntries, sectionId, sectionLabelById);

  // Publish counts
  const publishedCount = useMemo(() => entries.filter((e) => e.is_published).length, [entries]);
  const totalCount = entries.length;

  const readOnlyEntries = useMemo(() => {
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

  // CSV Export
  const sectionLabel = sectionId ? sectionLabelById.get(sectionId) ?? "Section" : "Section";
  const { exportCsv } = useTimetableExport(periods, entries, teacherLabelByUserId, sectionLabel);

  const setSlot = async (day: number, periodId: string, subjectId: string) => {
    if (!schoolId || !sectionId) return;
    if (!canEdit) return toast.error("Read-only: you don't have permission to edit timetables.");
    const subjectName = subjectNameById.get(subjectId);
    if (!subjectName) return;

    const period = periods.find((p) => p.id === periodId);
    if (!period) return;

    const existing = entries.find((e) => e.day_of_week === day && e.period_id === periodId) ?? null;
    const teacherUserId = existing?.teacher_user_id ?? teacherBySubjectId.get(subjectId) ?? null;
    const room = existing?.room ?? null;

    setBusy(true);
    try {
      const { error: delErr } = await supabase
        .from("timetable_entries")
        .delete()
        .eq("school_id", schoolId)
        .eq("class_section_id", sectionId)
        .eq("day_of_week", day)
        .eq("period_id", periodId);
      if (delErr) return toast.error(delErr.message);

      const { error: insErr } = await supabase.from("timetable_entries").insert({
        school_id: schoolId,
        class_section_id: sectionId,
        day_of_week: day,
        period_id: periodId,
        subject_name: subjectName,
        teacher_user_id: teacherUserId,
        start_time: period.start_time,
        end_time: period.end_time,
        room,
      });
      if (insErr) return toast.error(insErr.message);

      await refreshSection();
    } finally {
      setBusy(false);
    }
  };

  const clearSlot = async (day: number, periodId: string) => {
    if (!schoolId || !sectionId) return;
    if (!canEdit) return toast.error("Read-only: you don't have permission to edit timetables.");
    setBusy(true);
    try {
      const { error } = await supabase
        .from("timetable_entries")
        .delete()
        .eq("school_id", schoolId)
        .eq("class_section_id", sectionId)
        .eq("day_of_week", day)
        .eq("period_id", periodId);
      if (error) return toast.error(error.message);
      await refreshSection();
    } finally {
      setBusy(false);
    }
  };

  const onDragEnd = async (evt: DragEndEvent) => {
    if (!canEdit) return;
    const activeId = String(evt.active.id);
    const overId = evt.over?.id ? String(evt.over.id) : null;
    if (!overId) return;

    if (!activeId.startsWith("sub:")) return;
    if (!overId.startsWith("cell:")) return;

    const subjectId = activeId.slice("sub:".length);
    const [, dayStr, periodId] = overId.split(":");
    const day = Number(dayStr);
    if (!Number.isFinite(day) || !periodId) return;

    await setSlot(day, periodId, subjectId);
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-elevated no-print">
        <CardHeader>
          <CardTitle className="font-display text-xl">Timetable Builder</CardTitle>
          <p className="text-sm text-muted-foreground">Drag subjects into the grid to build a section timetable.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {sectionLabelById.get(s.id) ?? s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="soft" onClick={refreshSection} disabled={!sectionId || busy}>
              <CalendarDays className="mr-2 h-4 w-4" /> Refresh
            </Button>

            <div className="flex flex-wrap gap-2 md:justify-self-end">
              <Button variant="outline" onClick={exportCsv} disabled={!sectionId || entries.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
              <Button variant="outline" onClick={() => setToolsOpen(true)} disabled={!sectionId}>
                <Wrench className="mr-2 h-4 w-4" /> Tools
              </Button>
              <Button variant="outline" onClick={() => setPrintPreviewOpen(true)} disabled={!sectionId}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            </div>
          </div>

          {sectionId && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
              <PublishControls
                schoolId={schoolId}
                sectionId={sectionId}
                entryIds={entries.map((e) => e.id)}
                publishedCount={publishedCount}
                totalCount={totalCount}
                onDone={refreshSection}
                canEdit={canEdit}
              />
              <div className="text-xs text-muted-foreground">
                {periods.length ? `${periods.length} periods` : "Add periods first"}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!perms.loading && perms.error && (
        <div className="rounded-3xl bg-surface p-5 shadow-elevated no-print">
          <p className="text-sm font-medium">Permissions</p>
          <p className="mt-1 text-sm text-muted-foreground">{perms.error}</p>
        </div>
      )}

      {!perms.loading && !canEdit && (
        <div className="rounded-3xl bg-accent p-5 shadow-elevated no-print">
          <p className="text-sm font-medium text-accent-foreground">Read-only mode</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You can view timetables, but only academic admins can edit periods and grid slots.
          </p>
        </div>
      )}

      {canEdit && (
        <div className="no-print">
          <PeriodManagerCard schoolId={schoolId} userId={user?.id ?? null} periods={periods} onChanged={refreshPeriods} />
        </div>
      )}

      {!sectionId ? (
        <div className="rounded-3xl bg-surface p-6 shadow-elevated">
          <p className="text-sm text-muted-foreground">Select a section to start building its timetable.</p>
        </div>
      ) : !canEdit ? (
        <div className="print-area">
          {entries.length === 0 ? (
            <div className="rounded-3xl bg-surface p-6 shadow-elevated">
              <p className="text-sm text-muted-foreground">No timetable entries yet.</p>
            </div>
          ) : (
            <Card className="shadow-elevated">
              <CardHeader className="no-print">
                <CardTitle className="font-display text-lg">Preview</CardTitle>
                <p className="text-sm text-muted-foreground">Read-only timetable grid.</p>
              </CardHeader>
              <CardContent>
                <PeriodTimetableGrid periods={periods} entries={readOnlyEntries} printable={false} />
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
            <Card className="shadow-elevated no-print">
              <CardHeader>
                <CardTitle className="font-display text-lg">Subjects</CardTitle>
                <p className="text-sm text-muted-foreground">Only subjects enabled for this section appear here.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {subjects.map((s) => {
                  const teacherId = teacherBySubjectId.get(s.id);
                  const teacherLabel = teacherId ? teacherLabelByUserId.get(teacherId) ?? teacherId : null;
                  return (
                    <div key={s.id} className="space-y-1">
                      <SubjectTile id={`sub:${s.id}`} label={s.name} />
                      <p className="pl-2 text-xs text-muted-foreground">
                        {teacherLabel ? `Teacher: ${teacherLabel}` : "No teacher assigned"}
                      </p>
                    </div>
                  );
                })}
                {subjects.length === 0 && (
                  <p className="text-sm text-muted-foreground">No subjects assigned to this section yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-elevated print-area">
              <CardHeader className="no-print">
                <CardTitle className="font-display text-lg">Grid</CardTitle>
                <p className="text-sm text-muted-foreground">Drop subject tiles into day × period slots.</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `160px repeat(${Math.max(periods.length, 1)}, minmax(180px, 1fr))` }}
                  >
                    <div className="sticky left-0 z-10 rounded-2xl bg-surface px-2 py-2 text-xs font-medium text-muted-foreground">
                      Day
                    </div>
                    {periods.map((p) => (
                      <div key={p.id} className={`rounded-2xl px-2 py-2 ${p.is_break ? "bg-accent/50" : "bg-surface"}`}>
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          {p.is_break && <Coffee className="h-3.5 w-3.5 text-muted-foreground" />}
                          {p.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {timeLabel(p.start_time)}{p.start_time && p.end_time ? "–" : ""}{timeLabel(p.end_time)}
                        </p>
                      </div>
                    ))}

                    {DAYS.map((d) => (
                      <Fragment key={`row:${d.id}`}>
                        <div className="sticky left-0 z-10 flex items-center rounded-2xl bg-surface px-2 py-2 text-sm font-medium">
                          {d.label}
                        </div>
                        {periods.map((p) => {
                          const isBreak = breakPeriodIds.has(p.id);
                          
                          // Break periods show a special cell
                          if (isBreak) {
                            return (
                              <div
                                key={`cell:${d.id}:${p.id}`}
                                className="flex min-h-[68px] items-center justify-center rounded-2xl border border-dashed border-accent bg-accent/30 p-2"
                              >
                                <div className="flex flex-col items-center gap-1 text-center">
                                  <Coffee className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-xs font-medium text-muted-foreground">{p.label}</p>
                                </div>
                              </div>
                            );
                          }

                          const slotKey = `${d.id}:${p.id}`;
                          const e = entryBySlot.get(slotKey) ?? null;
                          const teacherLabel = e?.teacher_user_id
                            ? teacherLabelByUserId.get(e.teacher_user_id) ?? e.teacher_user_id
                            : null;

                          const roomLabel = e?.room ? `Room: ${e.room}` : null;
                          const subtitle = teacherLabel ? `Teacher: ${teacherLabel}` : null;
                          const entryConflicts = e ? conflictMap.get(e.id) ?? [] : [];

                          return (
                            <TimetableCell
                              key={`cell:${slotKey}`}
                              id={`cell:${d.id}:${p.id}`}
                              title={e?.subject_name ?? null}
                              subtitle={subtitle}
                              meta={roomLabel}
                              conflicts={entryConflicts}
                              onClear={e ? () => void clearSlot(d.id, p.id) : null}
                              onEdit={
                                e
                                  ? () => {
                                      setEditEntryId(e.id);
                                      setEditTeacherUserId(e.teacher_user_id ?? "");
                                      setEditRoom(e.room ?? "");
                                    }
                                  : null
                              }
                            />
                          );
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DndContext>
      )}

      <Dialog open={!!editEntryId} onOpenChange={(open) => !open && setEditEntryId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit slot</DialogTitle>
            <DialogDescription>Override teacher and room for this timetable slot.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Teacher</Label>
              <TeacherTypeahead
                value={editTeacherUserId}
                onValueChange={setEditTeacherUserId}
                directory={directory}
                placeholder="Search teacher..."
              />
            </div>

            <div className="space-y-2">
              <Label>Room</Label>
              <Input value={editRoom} onChange={(e) => setEditRoom(e.target.value)} placeholder="e.g. Lab 2" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntryId(null)}>
              Cancel
            </Button>
            <Button
              variant="hero"
              onClick={async () => {
                if (!schoolId || !sectionId || !editEntryId) return;
                if (!canEdit) return toast.error("Read-only: you don't have permission to edit timetables.");
                const { error } = await supabase
                  .from("timetable_entries")
                  .update({
                    teacher_user_id: editTeacherUserId || null,
                    room: editRoom.trim() || null,
                  })
                  .eq("school_id", schoolId)
                  .eq("class_section_id", sectionId)
                  .eq("id", editEntryId);

                if (error) return toast.error(error.message);
                toast.success("Slot updated");
                setEditEntryId(null);
                await refreshSection();
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TimetableToolsDialog
        open={toolsOpen}
        onOpenChange={setToolsOpen}
        schoolId={schoolId}
        canEdit={canEdit}
        periods={periods}
        sections={sections}
        sectionLabelById={sectionLabelById}
        currentSectionId={sectionId}
        onDone={refreshSection}
      />

      <PrintPreviewDialog
        open={printPreviewOpen}
        onOpenChange={setPrintPreviewOpen}
        headerTitle={tenant.school?.name ?? "School"}
        headerSubtitle={sectionId ? sectionLabelById.get(sectionId) ?? null : null}
        periods={periods}
        entries={readOnlyEntries}
      />
    </div>
  );
}
