import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, GraduationCap, Receipt, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChildInfo } from "@/hooks/useMyChildren";

interface ParentHomeModuleProps {
  child: ChildInfo | null;
  schoolId: string | null;
}

const ParentHomeModule = ({ child, schoolId }: ParentHomeModuleProps) => {
  const [stats, setStats] = useState({
    attendanceRate: 0,
    pendingAssignments: 0,
    unpaidFees: 0,
    unreadNotifications: 0,
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
        const presentDays = attendance?.filter((a) => a.status === "present").length || 0;
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
          .from("parent_notifications")
          .select("id", { count: "exact", head: true })
          .eq("parent_user_id", user.user?.id || "")
          .eq("student_id", child.student_id)
          .eq("is_read", false);

        setStats({
          attendanceRate,
          pendingAssignments: pendingAssignments || 0,
          unpaidFees: unpaidFees || 0,
          unreadNotifications: unreadNotifications || 0,
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
        Please select a child to view their dashboard.
      </div>
    );
  }

  const childName = [child.first_name, child.last_name].filter(Boolean).join(" ") || "Your Child";
  const classSection = [child.class_name, child.section_name].filter(Boolean).join(" / ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Welcome, Parent!
        </h1>
        <p className="text-muted-foreground">
          Viewing dashboard for <span className="font-medium text-foreground">{childName}</span>
          {classSection && <span className="text-muted-foreground"> • {classSection}</span>}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "—" : `${stats.attendanceRate}%`}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "—" : stats.pendingAssignments}
            </div>
            <p className="text-xs text-muted-foreground">Due upcoming</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Fees</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "—" : stats.unpaidFees}
            </div>
            <p className="text-xs text-muted-foreground">Invoices pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "—" : stats.unreadNotifications}
            </div>
            <p className="text-xs text-muted-foreground">Unread</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the navigation menu to view attendance records, grades, fee status, and more.
            You can also message teachers directly from the Messages section.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentHomeModule;
