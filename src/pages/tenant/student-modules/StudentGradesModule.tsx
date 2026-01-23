import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type Assessment = { id: string; title: string; assessment_date: string; max_marks: number };
type Mark = { id: string; assessment_id: string; marks: number | null; remarks: string | null };

export function StudentGradesModule({ myStudent, schoolId }: { myStudent: any; schoolId: string }) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);

  const refresh = async () => {
    if (myStudent.status !== "ready") return;
    const [{ data: m }, { data: a }] = await Promise.all([
      supabase
        .from("student_marks")
        .select("id,assessment_id,marks,remarks")
        .eq("school_id", schoolId)
        .eq("student_id", myStudent.studentId),
      supabase
        .from("academic_assessments")
        .select("id,title,assessment_date,max_marks")
        .eq("school_id", schoolId)
        .order("assessment_date", { ascending: false }),
    ]);
    setMarks((m ?? []) as Mark[]);
    setAssessments((a ?? []) as Assessment[]);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Your assessments & marks</p>
        <Button variant="soft" onClick={refresh}>Refresh</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Assessment</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Marks</TableHead>
            <TableHead>Remarks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assessments.map((a) => {
            const m = markByAssessment.get(a.id);
            return (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.title}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(a.assessment_date).toLocaleDateString()}</TableCell>
                <TableCell className="text-muted-foreground">{m?.marks ?? "—"} / {a.max_marks}</TableCell>
                <TableCell className="text-muted-foreground">{m?.remarks ?? "—"}</TableCell>
              </TableRow>
            );
          })}
          {assessments.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-sm text-muted-foreground">No assessments found yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
