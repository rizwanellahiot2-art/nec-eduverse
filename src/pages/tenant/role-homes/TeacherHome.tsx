import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BarChart3, BookOpen, CalendarCheck, ClipboardCheck, MessageSquare, TableIcon, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useSession } from "@/hooks/useSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AtRiskStudentsCard } from "@/components/teacher/AtRiskStudentsCard";
import { ClassPerformanceChart } from "@/components/teacher/ClassPerformanceChart";
import { TimetablePreviewWidget } from "@/components/teacher/TimetablePreviewWidget";
import { StudentPerformanceWidget } from "@/components/teacher/StudentPerformanceWidget";

interface Stats {
  totalStudents: number;
  assignedSections: number;
  pendingHomework: number;
  todayAttendance: number;
  unreadMessages: number;
}

export function TeacherHome() {
  const { schoolSlug } = useParams();
  const tenant = useTenant(schoolSlug);
  const { user } = useSession();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    assignedSections: 0,
    pendingHomework: 0,
    todayAttendance: 0,
    unreadMessages: 0,
  });
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [recentHomework, setRecentHomework] = useState<{ id: string; title: string; due_date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant.status !== "ready" || !user) return;

    const fetchStats = async () => {
      setLoading(true);
      const schoolId = tenant.schoolId;

      // Get assigned sections for this teacher
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("class_section_id")
        .eq("school_id", schoolId)
        .eq("teacher_user_id", user.id);

      const assignedSectionIds = [...new Set(assignments?.map((a) => a.class_section_id) || [])];
      setSectionIds(assignedSectionIds);
      const assignedSections = assignedSectionIds.length;

      // Get total students in assigned sections
      let totalStudents = 0;
      if (assignedSectionIds.length > 0) {
        const { count } = await supabase
          .from("student_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .in("class_section_id", assignedSectionIds);
        totalStudents = count || 0;
      }

      // Get pending homework - only for THIS teacher's sections or created by this teacher
      const today = new Date().toISOString().split("T")[0];
      let pendingHomeworkCount = 0;
      if (assignedSectionIds.length > 0) {
        const { count } = await supabase
          .from("homework")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("status", "active")
          .gte("due_date", today)
          .or(`class_section_id.in.(${assignedSectionIds.join(",")}),teacher_user_id.eq.${user.id}`);
        pendingHomeworkCount = count || 0;
      }

      // Get today's attendance sessions - only for THIS teacher's sections
      let todayAttendanceCount = 0;
      if (assignedSectionIds.length > 0) {
        const { count } = await supabase
          .from("attendance_sessions")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("session_date", today)
          .in("class_section_id", assignedSectionIds);
        todayAttendanceCount = count || 0;
      }

      // Get unread parent messages
      const { count: unreadMessages } = await supabase
        .from("parent_messages")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("recipient_user_id", user.id)
        .eq("is_read", false);

      // Get recent homework - only for THIS teacher's sections or created by this teacher
      let homework: { id: string; title: string; due_date: string }[] = [];
      if (assignedSectionIds.length > 0) {
        const { data } = await supabase
          .from("homework")
          .select("id, title, due_date")
          .eq("school_id", schoolId)
          .eq("status", "active")
          .or(`class_section_id.in.(${assignedSectionIds.join(",")}),teacher_user_id.eq.${user.id}`)
          .order("due_date", { ascending: true })
          .limit(5);
        homework = data || [];
      }

      setStats({
        totalStudents,
        assignedSections,
        pendingHomework: pendingHomeworkCount,
        todayAttendance: todayAttendanceCount,
        unreadMessages: unreadMessages || 0,
      });
      setRecentHomework(homework);
      setLoading(false);
    };

    fetchStats();
  }, [tenant.status, tenant.schoolId, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions - Top for better accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <a
              href={`/${schoolSlug}/teacher/attendance`}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors hover:bg-accent"
            >
              <ClipboardCheck className="h-6 w-6 text-primary" />
              <span className="text-sm">Take Attendance</span>
            </a>
            <a
              href={`/${schoolSlug}/teacher/homework`}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors hover:bg-accent"
            >
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-sm">Add Homework</span>
            </a>
            <a
              href={`/${schoolSlug}/teacher/gradebook`}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors hover:bg-accent"
            >
              <TableIcon className="h-6 w-6 text-primary" />
              <span className="text-sm">Gradebook</span>
            </a>
            <a
              href={`/${schoolSlug}/teacher/progress`}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors hover:bg-accent"
            >
              <TrendingUp className="h-6 w-6 text-primary" />
              <span className="text-sm">Progress</span>
            </a>
            <a
              href={`/${schoolSlug}/teacher/students`}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors hover:bg-accent"
            >
              <Users className="h-6 w-6 text-primary" />
              <span className="text-sm">View Students</span>
            </a>
            <a
              href={`/${schoolSlug}/teacher/messages`}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors hover:bg-accent"
            >
              <MessageSquare className="h-6 w-6 text-primary" />
              <span className="text-sm">Messages</span>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalStudents}</p>
            <p className="text-xs text-muted-foreground">across {stats.assignedSections} sections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Homework</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.pendingHomework}</p>
            <p className="text-xs text-muted-foreground">active assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Attendance</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.todayAttendance}</p>
            <p className="text-xs text-muted-foreground">sessions recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.unreadMessages}</p>
            <p className="text-xs text-muted-foreground">from parents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assigned Sections</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.assignedSections}</p>
            <p className="text-xs text-muted-foreground">class sections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Analytics</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground">view class performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Timetable Preview & Performance Widget */}
      {tenant.status === "ready" && schoolSlug && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TimetablePreviewWidget schoolId={tenant.schoolId} schoolSlug={schoolSlug} />
          <StudentPerformanceWidget schoolId={tenant.schoolId} sectionIds={sectionIds} />
        </div>
      )}

      {/* Analytics Cards - At-Risk Students & Class Performance */}
      {tenant.status === "ready" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AtRiskStudentsCard schoolId={tenant.schoolId} sectionIds={sectionIds} />
          <ClassPerformanceChart schoolId={tenant.schoolId} sectionIds={sectionIds} />
        </div>
      )}

      {/* Recent Homework */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Homework</CardTitle>
        </CardHeader>
        <CardContent>
          {recentHomework.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming homework assignments.</p>
          ) : (
            <div className="space-y-3">
              {recentHomework.map((hw) => (
                <div key={hw.id} className="flex items-center justify-between rounded-lg border p-3">
                  <p className="text-sm font-medium">{hw.title}</p>
                  <p className="text-xs text-muted-foreground">Due: {hw.due_date}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
