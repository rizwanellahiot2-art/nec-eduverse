import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StudentHomeModule({ myStudent }: { myStudent: any }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className="shadow-elevated">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Linked student</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {myStudent.status === "ready" ? myStudent.studentId : myStudent.status === "loading" ? "Loading…" : myStudent.error ?? "—"}
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
