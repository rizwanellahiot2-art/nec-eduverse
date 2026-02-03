import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fetchStudentLabelMap } from "@/lib/student-display";
import { StudentDigitalTwinCard } from "@/components/ai/StudentDigitalTwinCard";
import { 
  CalendarDays, 
  BookOpen, 
  ScrollText, 
  GraduationCap,
  Brain,
  TrendingUp,
  Clock,
  AlertTriangle
} from "lucide-react";

interface StudentStats {
  attendanceRate: number;
  totalAssignments: number;
  pendingAssignments: number;
  assessmentCount: number;
  averageGrade: number | null;
}

export function StudentHomeModule({ myStudent }: { myStudent: any }) {
  const [label, setLabel] = useState<string | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (myStudent.status !== "ready") {
      setLabel(null);
      setStats(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    
    (async () => {
      setLoading(true);
      try {
        // Fetch student label
        const map = await fetchStudentLabelMap(supabase, { studentIds: [myStudent.studentId] });
        if (cancelled) return;
        setLabel(map[myStudent.studentId] ?? myStudent.studentId);

        // Get student's school_id
        const { data: student } = await supabase
          .from("students")
          .select("school_id")
          .eq("id", myStudent.studentId)
          .single();
        
        if (!student || cancelled) return;

        // Fetch attendance stats (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: attendance } = await supabase
          .from("attendance_entries")
          .select("status")
          .eq("student_id", myStudent.studentId)
          .gte("created_at", thirtyDaysAgo.toISOString());

        const totalDays = attendance?.length || 0;
        const presentDays = attendance?.filter((a) => a.status === "present" || a.status === "late").length || 0;
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

        // Fetch assignments
        const { data: assignments } = await supabase
          .from("assignments")
          .select("id, status, due_date")
          .eq("school_id", student.school_id);

        const totalAssignments = assignments?.length || 0;
        const pendingAssignments = assignments?.filter(
          (a) => a.status === "active" && a.due_date && new Date(a.due_date) >= new Date()
        ).length || 0;

        // Fetch grades
        const { data: marks } = await supabase
          .from("student_marks")
          .select("marks, academic_assessments!inner(max_marks)")
          .eq("student_id", myStudent.studentId);

        let averageGrade: number | null = null;
        if (marks && marks.length > 0) {
          const validMarks = marks.filter((m) => m.marks != null && m.academic_assessments);
          if (validMarks.length > 0) {
            const percentages = validMarks.map((m) => 
              (m.marks! / (m.academic_assessments as any).max_marks) * 100
            );
            averageGrade = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);
          }
        }

        if (cancelled) return;

        setStats({
          attendanceRate,
          totalAssignments,
          pendingAssignments,
          assessmentCount: marks?.length || 0,
          averageGrade,
        });
      } catch (error) {
        console.error("Error fetching student stats:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [myStudent.status, myStudent.studentId]);

  // Get school ID for AI components
  const [schoolId, setSchoolId] = useState<string | null>(null);
  
  useEffect(() => {
    if (myStudent.status !== "ready") return;
    
    (async () => {
      const { data: student } = await supabase
        .from("students")
        .select("school_id")
        .eq("id", myStudent.studentId)
        .single();
      
      if (student) setSchoolId(student.school_id);
    })();
  }, [myStudent.status, myStudent.studentId]);

  if (myStudent.status === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (myStudent.status === "error") {
    return (
      <div className="rounded-3xl bg-destructive/10 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-3 font-display text-lg font-semibold">Account Not Linked</p>
        <p className="mt-2 text-sm text-muted-foreground">{myStudent.error}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Contact your school administration to link your student profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Welcome back, {label?.split(" ")[0] || "Student"}!
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here's an overview of your academic journey
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CalendarDays className="h-5 w-5 text-emerald-500" />
              {stats && stats.attendanceRate >= 90 && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                  Great!
                </Badge>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold">
              {loading ? "—" : `${stats?.attendanceRate || 0}%`}
            </p>
            <p className="text-xs text-muted-foreground">Attendance Rate</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <ScrollText className="h-5 w-5 text-blue-500" />
              {stats && stats.pendingAssignments > 0 && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-[10px]">
                  {stats.pendingAssignments} due
                </Badge>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold">
              {loading ? "—" : stats?.totalAssignments || 0}
            </p>
            <p className="text-xs text-muted-foreground">Assignments</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <BookOpen className="h-5 w-5 text-purple-500" />
            </div>
            <p className="mt-3 text-2xl font-bold">
              {loading ? "—" : stats?.assessmentCount || 0}
            </p>
            <p className="text-xs text-muted-foreground">Assessments</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-5 w-5 text-primary" />
              {stats?.averageGrade != null && stats.averageGrade >= 80 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">
                  Excellent
                </Badge>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold">
              {loading ? "—" : stats?.averageGrade != null ? `${stats.averageGrade}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Average Grade</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Digital Twin - Main Feature */}
      {schoolId && myStudent.status === "ready" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Your AI Learning Profile</h2>
          </div>
          <StudentDigitalTwinCard 
            studentId={myStudent.studentId} 
            schoolId={schoolId} 
          />
        </div>
      )}

      {/* Quick Links */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <a 
              href="attendance" 
              className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted"
            >
              <CalendarDays className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs font-medium">Attendance</span>
            </a>
            <a 
              href="grades" 
              className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted"
            >
              <GraduationCap className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs font-medium">Grades</span>
            </a>
            <a 
              href="timetable" 
              className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted"
            >
              <Clock className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs font-medium">Timetable</span>
            </a>
            <a 
              href="assignments" 
              className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted"
            >
              <ScrollText className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs font-medium">Assignments</span>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Student Info Card */}
      <Card className="shadow-sm bg-accent/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{label || myStudent.studentId}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Student Portal • Read-only access to your academic records, timetable, and more.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
