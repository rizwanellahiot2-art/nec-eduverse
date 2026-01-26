import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AttendancePercentageBadge } from "./AttendancePercentageBadge";
import { BarChart3 } from "lucide-react";
import type { StudentAttendanceStats } from "@/hooks/useAttendanceData";

interface StudentAttendanceStatsCardProps {
  stats: StudentAttendanceStats[];
  loading?: boolean;
}

export function StudentAttendanceStatsCard({ stats, loading }: StudentAttendanceStatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading attendance statistics...
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return null;
  }

  // Sort by attendance percentage (lowest first to highlight issues)
  const sortedStats = [...stats].sort((a, b) => a.attendance_percentage - b.attendance_percentage);
  const lowAttendanceCount = stats.filter((s) => s.attendance_percentage < 75).length;
  const warningCount = stats.filter((s) => s.attendance_percentage >= 75 && s.attendance_percentage < 85).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Student Attendance Overview
        </CardTitle>
        <div className="flex items-center gap-3 text-sm">
          {lowAttendanceCount > 0 && (
            <span className="text-red-600 font-medium">
              {lowAttendanceCount} student{lowAttendanceCount !== 1 ? "s" : ""} below 75%
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-amber-600 font-medium">
              {warningCount} need attention
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-80 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-center w-24">Sessions</TableHead>
                <TableHead className="text-center w-20">Present</TableHead>
                <TableHead className="text-center w-20">Absent</TableHead>
                <TableHead className="text-center w-20">Late</TableHead>
                <TableHead className="w-48">Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStats.map((student) => (
                <TableRow
                  key={student.student_id}
                  className={student.attendance_percentage < 75 ? "bg-red-50/50 dark:bg-red-900/10" : ""}
                >
                  <TableCell className="font-medium">
                    {student.first_name} {student.last_name}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {student.total_sessions}
                  </TableCell>
                  <TableCell className="text-center text-green-600">
                    {student.present_count}
                  </TableCell>
                  <TableCell className="text-center text-red-600">
                    {student.absent_count}
                  </TableCell>
                  <TableCell className="text-center text-amber-600">
                    {student.late_count}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={student.attendance_percentage}
                        className="h-2 flex-1 min-w-[60px]"
                      />
                      <AttendancePercentageBadge percentage={Number(student.attendance_percentage.toFixed(2))} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
