import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarCheck, Save } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useSession } from "@/hooks/useSession";
import { useOfflineSections, useOfflineClasses, useOfflineTeacherAssignments, useOfflineStudents, useOfflineEnrollments } from "@/hooks/useOfflineData";
import { OfflineDataBanner } from "@/components/offline/OfflineDataBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type AssignedSection = { class_section_id: string; section_name: string; class_name: string };

export function AttendanceModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const { user } = useSession();
  const schoolId = useMemo(() => (tenant.status === "ready" ? tenant.schoolId : null), [tenant.status, tenant.schoolId]);

  // Offline data hooks
  const offlineSections = useOfflineSections(schoolId);
  const offlineClasses = useOfflineClasses(schoolId);
  const offlineTeacherAssignments = useOfflineTeacherAssignments(schoolId);
  const offlineStudents = useOfflineStudents(schoolId);
  const offlineEnrollments = useOfflineEnrollments(schoolId);
  
  const isOffline = offlineSections.isOffline;
  const isUsingCache = offlineSections.isUsingCache || offlineClasses.isUsingCache;

  const [sections, setSections] = useState<AssignedSection[]>([]);
  const [sectionId, setSectionId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rows, setRows] = useState<{ student_id: string; name: string; status: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!schoolId || !user?.id) return;

      // If offline, use cached data
      if (!navigator.onLine) {
        const myAssignments = offlineTeacherAssignments.data.filter(a => a.teacherUserId === user.id);
        const mySecIds = new Set(myAssignments.map(a => a.classSectionId));
        const classMap = new Map(offlineClasses.data.map(c => [c.id, c.name]));
        
        const assignedSections = offlineSections.data
          .filter(s => mySecIds.has(s.id))
          .map(s => ({
            class_section_id: s.id,
            section_name: s.name,
            class_name: classMap.get(s.classId) ?? "Class",
          }));
        setSections(assignedSections);
        return;
      }

      const { data: ta } = await supabase
        .from("teacher_assignments")
        .select("class_section_id")
        .eq("school_id", schoolId)
        .eq("teacher_user_id", user.id);
      const ids = (ta ?? []).map((x: any) => x.class_section_id as string);
      if (ids.length === 0) {
        setSections([]);
        return;
      }

      const { data: sec } = await supabase
        .from("class_sections")
        .select("id,name,class_id")
        .in("id", ids);
      const { data: cls } = await supabase.from("academic_classes").select("id,name");
      const byClass = new Map((cls ?? []).map((c: any) => [c.id, c.name]));
      setSections(
        (sec ?? []).map((s: any) => ({
          class_section_id: s.id,
          section_name: s.name,
          class_name: byClass.get(s.class_id) ?? "Class",
        })),
      );
    };
    void load();
  }, [schoolId, user?.id, offlineSections.data, offlineClasses.data, offlineTeacherAssignments.data]);

  const start = async () => {
    if (!schoolId) return;
    if (!sectionId) return toast.error("Pick a section");

    const { data: session, error } = await supabase
      .from("attendance_sessions")
      .upsert(
        {
          school_id: schoolId,
          class_section_id: sectionId,
          session_date: date,
          period_label: period,
          created_by: user?.id ?? null,
        },
        { onConflict: "school_id,class_section_id,session_date,period_label" },
      )
      .select("id")
      .single();
    if (error) return toast.error(error.message);

    setSessionId(session.id);

    // load students for section
    const { data: enrollments, error: enrErr } = await supabase
      .from("student_enrollments")
      .select("student_id")
      .eq("school_id", schoolId)
      .eq("class_section_id", sectionId);
    if (enrErr) return toast.error(enrErr.message);

    const studentIds = (enrollments ?? []).map((e: any) => e.student_id as string);
    const { data: studs } = await supabase
      .from("students")
      .select("id,first_name,last_name")
      .eq("school_id", schoolId)
      .in("id", studentIds);

    // existing entries
    const { data: entries } = await supabase
      .from("attendance_entries")
      .select("student_id,status")
      .eq("school_id", schoolId)
      .eq("session_id", session.id);
    const statusByStudent = new Map((entries ?? []).map((x: any) => [x.student_id, x.status]));

    setRows(
      (studs ?? []).map((s: any) => ({
        student_id: s.id,
        name: `${s.first_name} ${s.last_name ?? ""}`.trim(),
        status: statusByStudent.get(s.id) ?? "present",
      })),
    );
  };

  const save = async () => {
    if (!schoolId || !sessionId) return;
    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        school_id: schoolId,
        session_id: sessionId,
        student_id: r.student_id,
        status: r.status,
      }));
      const { error } = await supabase
        .from("attendance_entries")
        .upsert(payload, { onConflict: "school_id,session_id,student_id" });
      if (error) return toast.error(error.message);
      toast.success("Attendance saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <OfflineDataBanner 
        isOffline={isOffline} 
        isUsingCache={isUsingCache} 
      />
      
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-xl">Attendance</CardTitle>
          <p className="text-sm text-muted-foreground">Teachers can take attendance only for assigned sections</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <Select value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger>
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((s) => (
                <SelectItem key={s.class_section_id} value={s.class_section_id}>
                  {s.class_name} • {s.section_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
          <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Period (optional)" />
          <Button variant="hero" onClick={start}>
            <CalendarCheck className="mr-2 h-4 w-4" /> Load
          </Button>
        </CardContent>
      </Card>

      {sessionId && (
        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle className="font-display text-xl">Mark</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-auto rounded-2xl border bg-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.student_id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>
                        <Select
                          value={r.status}
                          onValueChange={(v) =>
                            setRows((prev) => prev.map((x) => (x.student_id === r.student_id ? { ...x, status: v } : x)))
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="excused">Excused</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        No enrolled students for this section.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <Button variant="hero" size="xl" className="w-full" onClick={save} disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> Save attendance
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
