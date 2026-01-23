import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ChildInfo } from "@/hooks/useMyChildren";
import { format } from "date-fns";

interface ParentAttendanceModuleProps {
  child: ChildInfo | null;
  schoolId: string | null;
}

interface AttendanceRecord {
  id: string;
  status: string;
  note: string | null;
  session_date: string;
  period_label: string;
}

const ParentAttendanceModule = ({ child, schoolId }: ParentAttendanceModuleProps) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!child || !schoolId) return;

    const fetchAttendance = async () => {
      setLoading(true);

      const { data: entries, error } = await supabase
        .from("attendance_entries")
        .select(`
          id,
          status,
          note,
          session:attendance_sessions(session_date, period_label)
        `)
        .eq("student_id", child.student_id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Failed to fetch attendance:", error);
        setLoading(false);
        return;
      }

      const formatted: AttendanceRecord[] = (entries || []).map((e) => ({
        id: e.id,
        status: e.status,
        note: e.note,
        session_date: (e.session as { session_date: string } | null)?.session_date || "",
        period_label: (e.session as { period_label: string } | null)?.period_label || "",
      }));

      setRecords(formatted);
      setLoading(false);
    };

    fetchAttendance();
  }, [child, schoolId]);

  if (!child) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Please select a child to view attendance.
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "present":
        return "default";
      case "absent":
        return "destructive";
      case "late":
        return "secondary";
      case "excused":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">
          View attendance records for {child.first_name || "your child"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : records.length === 0 ? (
            <p className="text-muted-foreground">No attendance records found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {record.session_date
                        ? format(new Date(record.session_date), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>{record.period_label || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusColor(record.status)}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.note || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentAttendanceModule;
