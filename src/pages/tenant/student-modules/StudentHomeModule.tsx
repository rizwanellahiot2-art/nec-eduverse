import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { fetchStudentLabelMap } from "@/lib/student-display";

export function StudentHomeModule({ myStudent }: { myStudent: any }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (myStudent.status !== "ready") {
      setLabel(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const map = await fetchStudentLabelMap(supabase, { studentIds: [myStudent.studentId] });
      if (cancelled) return;
      setLabel(map[myStudent.studentId] ?? myStudent.studentId);
    })();
    return () => {
      cancelled = true;
    };
  }, [myStudent.status, myStudent.studentId]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Linked student</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {myStudent.status === "ready" ? label ?? myStudent.studentId : myStudent.status === "loading" ? "Loading…" : myStudent.error ?? "—"}
          </p>
        </CardContent>
      </Card>
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Portal mode</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-display text-lg font-semibold tracking-tight">Read-only</p>
          <p className="mt-1 text-xs text-muted-foreground">Attendance, grades, timetable, assignments, certificates, support.</p>
        </CardContent>
      </Card>
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Tip</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">If you can’t see data, ensure your account is linked to a student profile.</p>
        </CardContent>
      </Card>
    </div>
  );
}
