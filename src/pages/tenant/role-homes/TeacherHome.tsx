import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BarChart3, BookOpen, CalendarCheck, ClipboardCheck, MessageSquare, TableIcon, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useSession } from "@/hooks/useSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AtRiskStudentsCard } from "@/components/teacher/AtRiskStudentsCard";
import { ClassPerformanceChart } from "@/components/teacher/ClassPerformanceChart";
import { MyScheduleWidget } from "@/components/teacher/MyScheduleWidget";
import { StudentPerformanceWidget } from "@/components/teacher/StudentPerformanceWidget";
import { TodaysFocusCard } from "@/components/teacher/TodaysFocusCard";
import { QuickActionsBar } from "@/components/teacher/QuickActionsBar";
import { OfflineIndicator } from "@/components/teacher/OfflineIndicator";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useTeacherKeyboardShortcuts } from "@/hooks/useTeacherKeyboardShortcuts";

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

  // Initialize keyboard shortcuts
  useTeacherKeyboardShortcuts(schoolSlug || "", tenant.status === "ready");

  // Initialize offline sync
  const schoolId = tenant.status === "ready" ? tenant.schoolId : null;
  const { isOnline, pendingCount, isSyncing, syncPendingEntries } = useOfflineSync(
    schoolId,
    user?.id ?? null
  );

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

      // Get unread messages
      const { count: unreadMessages } = await supabase
        .from("admin_message_recipients")
        .select("id", { count: "exact", head: true })
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
      {/* Offline Indicator */}
      <OfflineIndicator
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onSync={syncPendingEntries}
      />

      {/* Today's Focus Card - NEW Prominent Section */}
      {tenant.status === "ready" && schoolSlug && (
        <TodaysFocusCard
          schoolId={tenant.schoolId}
          schoolSlug={schoolSlug}
          sectionIds={sectionIds}
        />
      )}

      {/* Stats Grid - Compact Version */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{stats.totalStudents}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{stats.assignedSections}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Sections</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{stats.pendingHomework}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Homework</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{stats.todayAttendance}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{stats.unreadMessages}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">—</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timetable Preview & Performance Widget */}
      {tenant.status === "ready" && schoolSlug && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MyScheduleWidget schoolId={tenant.schoolId} schoolSlug={schoolSlug} />
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

      {/* Quick Actions Floating Bar */}
      {schoolSlug && <QuickActionsBar schoolSlug={schoolSlug} />}
    </div>
  );
}
