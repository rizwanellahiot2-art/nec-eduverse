import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Save, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToCSV } from "@/lib/csv";

interface Section {
  id: string;
  name: string;
  class_name: string;
}

interface Assessment {
  id: string;
  title: string;
  max_marks: number;
  assessment_date: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string | null;
}

interface Mark {
  student_id: string;
  assessment_id: string;
  marks: number | null;
  computed_grade: string | null;
}

export function TeacherGradebookModule() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const { user } = useSession();
  const schoolId = tenant.status === "ready" ? tenant.schoolId : null;

  const [sections, setSections] = useState<Section[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Map<string, Mark>>(new Map());
  const [editedMarks, setEditedMarks] = useState<Map<string, number | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedSection, setSelectedSection] = useState<string>("");

  useEffect(() => {
    if (schoolId && user?.id) {
      loadSections();
    }
  }, [schoolId, user?.id]);

  useEffect(() => {
    if (selectedSection && schoolId) {
      loadGradebook();
    }
  }, [selectedSection, schoolId]);

  const loadSections = async () => {
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select("class_section_id")
      .eq("school_id", schoolId!)
      .eq("teacher_user_id", user!.id);

    const sectionIds = [...new Set(assignments?.map((a) => a.class_section_id) || [])];
    if (sectionIds.length === 0) {
      setLoading(false);
      return;
    }

    const { data: secs } = await supabase
      .from("class_sections")
      .select("id, name, class_id")
      .in("id", sectionIds);

    const { data: classes } = await supabase.from("academic_classes").select("id, name");
    const classMap = new Map(classes?.map((c) => [c.id, c.name]) || []);

    const mapped = (secs || []).map((s) => ({
      id: s.id,
      name: s.name,
      class_name: classMap.get(s.class_id) || "",
    }));

    setSections(mapped);
    if (mapped.length > 0 && !selectedSection) {
      setSelectedSection(mapped[0].id);
    }
    setLoading(false);
  };

  const loadGradebook = async () => {
    setLoading(true);

    // Load assessments for section
    const { data: assessData } = await supabase
      .from("academic_assessments")
      .select("id, title, max_marks, assessment_date")
      .eq("school_id", schoolId!)
      .eq("class_section_id", selectedSection)
      .order("assessment_date", { ascending: true });

    setAssessments((assessData as Assessment[]) || []);

    // Load students in section
    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("student_id")
      .eq("school_id", schoolId!)
      .eq("class_section_id", selectedSection);

    const studentIds = enrollments?.map((e) => e.student_id) || [];

    if (studentIds.length > 0) {
      const { data: studs } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .in("id", studentIds)
        .order("first_name");

      setStudents((studs as Student[]) || []);

      // Load marks
      const assessmentIds = assessData?.map((a) => a.id) || [];
      if (assessmentIds.length > 0) {
        const { data: marksData } = await supabase
          .from("student_marks")
          .select("student_id, assessment_id, marks, computed_grade")
          .eq("school_id", schoolId!)
          .in("assessment_id", assessmentIds);

        const marksMap = new Map<string, Mark>();
        marksData?.forEach((m) => {
          marksMap.set(`${m.student_id}-${m.assessment_id}`, m as Mark);
        });
        setMarks(marksMap);
      }
    } else {
      setStudents([]);
      setMarks(new Map());
    }

    setEditedMarks(new Map());
    setLoading(false);
  };

  const getMark = (studentId: string, assessmentId: string): number | null => {
    const key = `${studentId}-${assessmentId}`;
    if (editedMarks.has(key)) {
      return editedMarks.get(key) ?? null;
    }
    return marks.get(key)?.marks ?? null;
  };

  const getGrade = (studentId: string, assessmentId: string): string | null => {
    return marks.get(`${studentId}-${assessmentId}`)?.computed_grade ?? null;
  };

  const updateMark = (studentId: string, assessmentId: string, value: string) => {
    const key = `${studentId}-${assessmentId}`;
    const numValue = value === "" ? null : parseFloat(value);
    setEditedMarks((prev) => new Map(prev).set(key, numValue));
  };

  const saveMarks = async () => {
    if (editedMarks.size === 0) {
      toast.info("No changes to save");
      return;
    }

    setSaving(true);
    const updates: { school_id: string; student_id: string; assessment_id: string; marks: number | null }[] = [];

    editedMarks.forEach((value, key) => {
      const [student_id, assessment_id] = key.split("-");
      updates.push({
        school_id: schoolId!,
        student_id,
        assessment_id,
        marks: value,
      });
    });

    const { error } = await supabase
      .from("student_marks")
      .upsert(updates, { onConflict: "school_id,student_id,assessment_id" });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Saved ${updates.length} marks`);
      loadGradebook();
    }
    setSaving(false);
  };

  const exportGradebook = () => {
    const rows = students.map((student) => {
      const row: Record<string, string | number> = {
        "Student Name": `${student.first_name} ${student.last_name || ""}`.trim(),
      };
      assessments.forEach((a) => {
        const mark = getMark(student.id, a.id);
        row[a.title] = mark ?? "";
      });
      return row;
    });
    
    const section = sections.find((s) => s.id === selectedSection);
    exportToCSV(rows, `gradebook-${section?.class_name}-${section?.name}`);
    toast.success("Gradebook exported");
  };

  const studentAverages = useMemo(() => {
    const avgs = new Map<string, number>();
    students.forEach((student) => {
      let total = 0;
      let count = 0;
      assessments.forEach((a) => {
        const mark = getMark(student.id, a.id);
        if (mark !== null) {
          total += (mark / a.max_marks) * 100;
          count++;
        }
      });
      if (count > 0) {
        avgs.set(student.id, total / count);
      }
    });
    return avgs;
  }, [students, assessments, marks, editedMarks]);

  if (loading && sections.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-lg font-medium">No Assigned Sections</p>
          <p className="text-sm text-muted-foreground">
            You need to be assigned to sections to view the gradebook.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Select value={selectedSection} onValueChange={setSelectedSection}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select section" />
          </SelectTrigger>
          <SelectContent>
            {sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.class_name} • {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" onClick={exportGradebook} disabled={students.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button onClick={saveMarks} disabled={saving || editedMarks.size === 0}>
            <Save className="h-4 w-4 mr-1" /> Save Changes
          </Button>
        </div>
      </div>

      {/* Gradebook Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gradebook</CardTitle>
          <CardDescription>
            Enter marks for each student. Grades are calculated automatically based on thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : assessments.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No assessments created for this section yet.
            </p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background min-w-[150px]">Student</TableHead>
                    {assessments.map((a) => (
                      <TableHead key={a.id} className="text-center min-w-[100px]">
                        <div className="text-xs">{a.title}</div>
                        <div className="text-xs text-muted-foreground">/{a.max_marks}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[80px]">Avg %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="sticky left-0 bg-background font-medium">
                        {student.first_name} {student.last_name}
                      </TableCell>
                      {assessments.map((a) => {
                        const mark = getMark(student.id, a.id);
                        const grade = getGrade(student.id, a.id);
                        const key = `${student.id}-${a.id}`;
                        const isEdited = editedMarks.has(key);

                        return (
                          <TableCell key={a.id} className="p-1">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={a.max_marks}
                                step={0.5}
                                value={mark ?? ""}
                                onChange={(e) => updateMark(student.id, a.id, e.target.value)}
                                className={`w-16 text-center ${isEdited ? "ring-2 ring-primary" : ""}`}
                              />
                              {grade && !isEdited && (
                                <Badge variant="secondary" className="text-xs">
                                  {grade}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        {studentAverages.has(student.id) ? (
                          <Badge
                            variant={studentAverages.get(student.id)! >= 60 ? "default" : "destructive"}
                          >
                            {studentAverages.get(student.id)!.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
