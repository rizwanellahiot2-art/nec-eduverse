import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Clock, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  name: string;
  class_name: string;
}

interface StudentRow {
  student_id: string;
  first_name: string;
  last_name: string | null;
  status: "present" | "absent" | "late" | "excused";
}

export function TeacherAttendanceModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [periodLabel, setPeriodLabel] = useState<string>("Period 1");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant.status !== "ready") return;

    const fetchSections = async () => {
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("class_section_id")
        .eq("school_id", tenant.schoolId);

      if (!assignments?.length) {
        setLoading(false);
        return;
      }

      const sectionIds = assignments.map((a) => a.class_section_id);

      const { data: sectionData } = await supabase
        .from("class_sections")
        .select("id, name, class_id")
        .in("id", sectionIds);

      if (!sectionData?.length) {
        setLoading(false);
        return;
      }

      const classIds = [...new Set(sectionData.map((s) => s.class_id))];
      const { data: classes } = await supabase
        .from("academic_classes")
        .select("id, name")
        .in("id", classIds);

      const classMap = new Map(classes?.map((c) => [c.id, c.name]) || []);

      const enriched = sectionData.map((s) => ({
        id: s.id,
        name: s.name,
        class_name: classMap.get(s.class_id) || "Unknown",
      }));

      setSections(enriched);
      if (enriched.length > 0) {
        setSelectedSection(enriched[0].id);
      }
      setLoading(false);
    };

    fetchSections();
  }, [tenant.status, tenant.schoolId]);

  const loadSession = async () => {
    if (!selectedSection) return;

    // Get or create session
    const { data: existingSession } = await supabase
      .from("attendance_sessions")
      .select("id")
      .eq("school_id", tenant.schoolId)
      .eq("class_section_id", selectedSection)
      .eq("session_date", sessionDate)
      .eq("period_label", periodLabel)
      .maybeSingle();

    let sid = existingSession?.id;

    if (!sid) {
      const { data: user } = await supabase.auth.getUser();
      const { data: newSession, error } = await supabase
        .from("attendance_sessions")
        .insert({
          school_id: tenant.schoolId,
          class_section_id: selectedSection,
          session_date: sessionDate,
          period_label: periodLabel,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) {
        toast({ title: "Failed to create session", description: error.message, variant: "destructive" });
        return;
      }
      sid = newSession.id;
    }

    setSessionId(sid);

    // Load students
    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("student_id")
      .eq("school_id", tenant.schoolId)
      .eq("class_section_id", selectedSection);

    if (!enrollments?.length) {
      setRows([]);
      return;
    }

    const studentIds = enrollments.map((e) => e.student_id);
    const { data: students } = await supabase
      .from("students")
      .select("id, first_name, last_name")
      .in("id", studentIds);

    // Load existing entries
    const { data: entries } = await supabase
      .from("attendance_entries")
      .select("student_id, status")
      .eq("session_id", sid);

    const statusMap = new Map(entries?.map((e) => [e.student_id, e.status as StudentRow["status"]]) || []);

    const studentRows: StudentRow[] = (students || []).map((s) => ({
      student_id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      status: statusMap.get(s.id) || "present",
    }));

    setRows(studentRows);
  };

  const saveAttendance = async () => {
    if (!sessionId) return;

    setSaving(true);

    const payload = rows.map((r) => ({
      session_id: sessionId,
      school_id: tenant.schoolId,
      student_id: r.student_id,
      status: r.status,
    }));

    const { error } = await supabase.from("attendance_entries").upsert(payload, {
      onConflict: "session_id,student_id",
    });

    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Attendance saved successfully" });
    }

    setSaving(false);
  };

  const updateStatus = (studentId: string, status: StudentRow["status"]) => {
    setRows((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, status } : r))
    );
  };

  const markAll = (status: StudentRow["status"]) => {
    setRows((prev) => prev.map((r) => ({ ...r, status })));
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (sections.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No classes assigned to you yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Mark Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <Label>Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.class_name} - {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
            </div>
            <div>
              <Label>Period</Label>
              <Input value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={loadSession} className="w-full">
                Load Session
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      {sessionId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Students ({rows.length})</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => markAll("present")}>
                All Present
              </Button>
              <Button size="sm" variant="outline" onClick={() => markAll("absent")}>
                All Absent
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students enrolled in this section.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Check className="h-4 w-4 text-green-600" /> Present
                        </span>
                      </TableHead>
                      <TableHead className="text-center">
                        <span className="flex items-center justify-center gap-1">
                          <X className="h-4 w-4 text-red-600" /> Absent
                        </span>
                      </TableHead>
                      <TableHead className="text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Clock className="h-4 w-4 text-amber-600" /> Late
                        </span>
                      </TableHead>
                      <TableHead className="text-center">
                        <span className="flex items-center justify-center gap-1">
                          <FileCheck className="h-4 w-4 text-blue-600" /> Excused
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.student_id}>
                        <TableCell className="font-medium">
                          {r.first_name} {r.last_name}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => updateStatus(r.student_id, "present")}
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                              r.status === "present"
                                ? "border-green-600 bg-green-100 text-green-700"
                                : "border-muted hover:border-green-400 hover:bg-green-50"
                            )}
                            aria-label="Mark present"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => updateStatus(r.student_id, "absent")}
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                              r.status === "absent"
                                ? "border-red-600 bg-red-100 text-red-700"
                                : "border-muted hover:border-red-400 hover:bg-red-50"
                            )}
                            aria-label="Mark absent"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => updateStatus(r.student_id, "late")}
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                              r.status === "late"
                                ? "border-amber-600 bg-amber-100 text-amber-700"
                                : "border-muted hover:border-amber-400 hover:bg-amber-50"
                            )}
                            aria-label="Mark late"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => updateStatus(r.student_id, "excused")}
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                              r.status === "excused"
                                ? "border-blue-600 bg-blue-100 text-blue-700"
                                : "border-muted hover:border-blue-400 hover:bg-blue-50"
                            )}
                            aria-label="Mark excused"
                          >
                            <FileCheck className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4">
                  <Button onClick={saveAttendance} disabled={saving}>
                    {saving ? "Saving..." : "Save Attendance"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
