import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

type Assessment = { id: string; title: string; assessment_date: string; max_marks: number; subject_id: string | null };
type Mark = { id: string; assessment_id: string; marks: number | null; remarks: string | null; computed_grade: string | null; grade_points: number | null };
type Subject = { id: string; name: string };

export function StudentGradesModule({ myStudent, schoolId }: { myStudent: any; schoolId: string }) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (myStudent.status !== "ready") return;
    setLoading(true);

    // First get the student's enrollment to find their section
    const { data: enrollment } = await supabase
      .from("student_enrollments")
      .select("class_section_id")
      .eq("school_id", schoolId)
      .eq("student_id", myStudent.studentId)
      .is("end_date", null)
      .limit(1)
      .maybeSingle();

    const sectionId = enrollment?.class_section_id;

    // Fetch marks, assessments (only published and for student's section), and subjects
    const [{ data: m }, { data: a }, { data: subj }] = await Promise.all([
      supabase
        .from("student_marks")
        .select("id,assessment_id,marks,remarks,computed_grade,grade_points")
        .eq("school_id", schoolId)
        .eq("student_id", myStudent.studentId),
      sectionId
        ? supabase
            .from("academic_assessments")
            .select("id,title,assessment_date,max_marks,subject_id")
            .eq("school_id", schoolId)
            .eq("class_section_id", sectionId)
            .eq("is_published", true)
            .order("assessment_date", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from("subjects").select("id,name").eq("school_id", schoolId),
    ]);

    setMarks((m ?? []) as Mark[]);
    setAssessments((a ?? []) as Assessment[]);
    setSubjects((subj ?? []) as Subject[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myStudent.status]);

  const markByAssessment = useMemo(() => {
    const map = new Map<string, Mark>();
    for (const m of marks) map.set(m.assessment_id, m);
    return map;
  }, [marks]);

  const subjectNameById = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Your published assessments & marks</p>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Assessment</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Marks</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Remarks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assessments.map((a) => {
            const m = markByAssessment.get(a.id);
            const percentage = m?.marks != null ? ((m.marks / a.max_marks) * 100).toFixed(1) : null;
            return (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {a.subject_id ? subjectNameById.get(a.subject_id) ?? "—" : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(a.assessment_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {m?.marks != null ? (
                    <span>
                      {m.marks} / {a.max_marks}
                      <span className="ml-1 text-xs text-muted-foreground">({percentage}%)</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {m?.computed_grade ? (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {m.computed_grade}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[200px] truncate">
                  {m?.remarks ?? "—"}
                </TableCell>
              </TableRow>
            );
          })}
          {assessments.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                No published assessments found yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
