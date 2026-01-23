import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ChildInfo } from "@/hooks/useMyChildren";
import { format } from "date-fns";

interface ParentGradesModuleProps {
  child: ChildInfo | null;
  schoolId: string | null;
}

interface GradeRecord {
  id: string;
  marks: number;
  max_marks: number;
  assessment_title: string;
  assessment_date: string;
}

const ParentGradesModule = ({ child, schoolId }: ParentGradesModuleProps) => {
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!child || !schoolId) return;

    const fetchGrades = async () => {
      setLoading(true);

      // Fetch marks first
      const { data: marks, error } = await supabase
        .from("student_marks")
        .select("id, marks, assessment_id, graded_at")
        .eq("student_id", child.student_id)
        .order("graded_at", { ascending: false })
        .limit(100);

      if (error || !marks || marks.length === 0) {
        setGrades([]);
        setLoading(false);
        return;
      }

      // Fetch assessment details
      const assessmentIds = [...new Set(marks.map((m) => m.assessment_id))];
      const { data: assessments } = await supabase
        .from("academic_assessments")
        .select("id, title, max_marks, assessment_date")
        .in("id", assessmentIds);

      const assessmentMap = new Map(
        (assessments || []).map((a) => [a.id, a])
      );

      const formatted: GradeRecord[] = marks.map((m) => {
        const assessment = assessmentMap.get(m.assessment_id);
        return {
          id: m.id,
          marks: Number(m.marks) || 0,
          max_marks: Number(assessment?.max_marks) || 100,
          assessment_title: assessment?.title || "Assessment",
          assessment_date: assessment?.assessment_date || "",
        };
      });

      setGrades(formatted);
      setLoading(false);
    };

    fetchGrades();
  }, [child, schoolId]);

  if (!child) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Please select a child to view grades.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Grades</h1>
        <p className="text-muted-foreground">
          View grades and assessment results for {child.first_name || "your child"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assessment Results</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : grades.length === 0 ? (
            <p className="text-muted-foreground">No grades recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => {
                  const percentage = Math.round((grade.marks / grade.max_marks) * 100);
                  return (
                    <TableRow key={grade.id}>
                      <TableCell className="font-medium">{grade.assessment_title}</TableCell>
                      <TableCell>
                        {grade.assessment_date
                          ? format(new Date(grade.assessment_date), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {grade.marks} / {grade.max_marks}
                      </TableCell>
                      <TableCell className="text-right font-medium">{percentage}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentGradesModule;
