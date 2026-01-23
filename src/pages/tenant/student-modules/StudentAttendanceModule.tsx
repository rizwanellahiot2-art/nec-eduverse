import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type Attendance = { id: string; status: string; note: string | null; created_at: string; session_id: string };

export function StudentAttendanceModule({ myStudent, schoolId }: { myStudent: any; schoolId: string }) {
  const [rows, setRows] = useState<Attendance[]>([]);

  const refresh = async () => {
    if (myStudent.status !== "ready") return;
    const { data } = await supabase
      .from("attendance_entries")
      .select("id,status,note,created_at,session_id")
      .eq("school_id", schoolId)
      .eq("student_id", myStudent.studentId)
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as Attendance[]);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myStudent.status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Your attendance entries</p>
        <Button variant="soft" onClick={refresh}>Refresh</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
              <TableCell className="font-medium">{r.status}</TableCell>
              <TableCell className="text-muted-foreground">{r.note ?? "—"}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-sm text-muted-foreground">No attendance found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
