import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, GraduationCap, Receipt, Bell, Brain, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChildInfo } from "@/hooks/useMyChildren";
import { StudentDigitalTwinCard } from "@/components/ai/StudentDigitalTwinCard";
import { ParentTrustDashboard } from "@/components/ai/ParentTrustDashboard";
import { useSession } from "@/hooks/useSession";

interface ParentHomeModuleProps {
  child: ChildInfo | null;
  schoolId: string | null;
}

const ParentHomeModule = ({ child, schoolId }: ParentHomeModuleProps) => {
  const { user } = useSession();
  const [stats, setStats] = useState({
    attendanceRate: 0,
    pendingAssignments: 0,
    unpaidFees: 0,
    unreadNotifications: 0,
    recentGrade: null as number | null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!child || !schoolId) return;

    const fetchStats = async () => {
      setLoading(true);

      try {
        // Fetch attendance stats (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: attendance } = await supabase
          .from("attendance_entries")
          .select("status")
          .eq("student_id", child.student_id)
          .gte("created_at", thirtyDaysAgo.toISOString());

        const totalDays = attendance?.length || 0;
        const presentDays = attendance?.filter((a) => a.status === "present" || a.status === "late").length || 0;
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

        // Fetch pending assignments
        const { count: pendingAssignments } = await supabase
          .from("assignments")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("status", "active")
          .gte("due_date", new Date().toISOString().split("T")[0]);

        // Fetch unpaid invoices
        const { count: unpaidFees } = await supabase
          .from("finance_invoices")
          .select("id", { count: "exact", head: true })
          .eq("student_id", child.student_id)
          .eq("status", "unpaid");

        // Fetch unread notifications
        const { data: user } = await supabase.auth.getUser();
        const { count: unreadNotifications } = await supabase
          .from("app_notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.user?.id || "")
          .is("read_at", null);

        // Fetch recent grade
        const { data: recentMarks } = await supabase
          .from("student_marks")
          .select("marks, academic_assessments!inner(max_marks)")
          .eq("student_id", child.student_id)
          .order("created_at", { ascending: false })
          .limit(1);

        let recentGrade: number | null = null;
        if (recentMarks && recentMarks.length > 0 && recentMarks[0].marks != null) {
          const mark = recentMarks[0];
          recentGrade = Math.round((mark.marks! / (mark.academic_assessments as any).max_marks) * 100);
        }

        setStats({
          attendanceRate,
          pendingAssignments: pendingAssignments || 0,
          unpaidFees: unpaidFees || 0,
          unreadNotifications: unreadNotifications || 0,
          recentGrade,
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [child, schoolId]);

  if (!child) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <AlertTriangle className="mx-auto h-8 w-8 mb-3" />
        <p>Please select a child to view their dashboard.</p>
      </div>
    );
  }

  const childName = [child.first_name, child.last_name].filter(Boolean).join(" ") || "Your Child";
  const classSection = [child.class_name, child.section_name].filter(Boolean).join(" / ");

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Welcome, Parent!
        </h1>
        <p className="text-muted-foreground">
          Viewing dashboard for <span className="font-medium text-foreground">{childName}</span>
          {classSection && <span className="text-muted-foreground"> • {classSection}</span>}
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {loading ? "—" : `${stats.attendanceRate}%`}
              </span>
              {!loading && stats.attendanceRate >= 90 && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                  Excellent
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Latest Grade</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {loading ? "—" : stats.recentGrade != null ? `${stats.recentGrade}%` : "—"}
              </span>
              {!loading && stats.recentGrade != null && stats.recentGrade >= 80 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">
                  Great!
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Most recent assessment</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Fees</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {loading ? "—" : stats.unpaidFees}
              </span>
              {!loading && stats.unpaidFees > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  Pending
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Invoices pending</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {loading ? "—" : stats.unreadNotifications}
              </span>
              {!loading && stats.unreadNotifications > 0 && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-[10px]">
                  New
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Unread</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Section Header */}
      {schoolId && (
        <div className="flex items-center gap-2 pt-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">AI-Powered Insights</h2>
        </div>
      )}

      {/* AI Trust Dashboard */}
      {schoolId && user && (
        <ParentTrustDashboard 
          studentId={child.student_id} 
          schoolId={schoolId}
          parentUserId={user.id}
        />
      )}

      {/* AI Digital Twin - Compact View */}
      {schoolId && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">Learning Profile</h3>
          </div>
          <StudentDigitalTwinCard 
            studentId={child.student_id} 
            schoolId={schoolId}
            compact
          />
        </div>
      )}

      {/* Quick Links */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <a 
              href="attendance" 
              className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted"
            >
              <Calendar className="h-6 w-6 text-muted-foreground" />
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
              href="fees" 
              className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted"
            >
              <Receipt className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs font-medium">Fees</span>
            </a>
            <a 
              href="messages" 
              className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted"
            >
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs font-medium">Messages</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentHomeModule;
