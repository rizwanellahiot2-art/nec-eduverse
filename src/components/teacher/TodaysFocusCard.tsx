import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  AlertCircle,
  BookOpen,
  CalendarCheck,
  Clock,
  FileText,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface TodaysFocusData {
  classesToday: number;
  currentPeriod: string | null;
  nextPeriod: string | null;
  nextPeriodTime: string | null;
  pendingSubmissions: number;
  upcomingDeadlines: { title: string; due: string }[];
  unreadMessages: number;
  attendanceCompleted: number;
  attendanceTotal: number;
}

interface Props {
  schoolId: string;
  schoolSlug: string;
  sectionIds: string[];
}

export function TodaysFocusCard({ schoolId, schoolSlug, sectionIds }: Props) {
  const { user } = useSession();
  const [data, setData] = useState<TodaysFocusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !schoolId) return;

    const fetchData = async () => {
      setLoading(true);
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      const dayOfWeek = today.getDay(); // 0-6

      // Get today's timetable entries
      const { data: timetableEntries } = await supabase
        .from("timetable_entries")
        .select("*, timetable_periods!inner(label, start_time, end_time, sort_order)")
        .eq("school_id", schoolId)
        .eq("teacher_user_id", user.id)
        .eq("day_of_week", dayOfWeek)
        .order("timetable_periods(sort_order)", { ascending: true });

      const classesToday = timetableEntries?.length || 0;

      // Calculate current and next period
      const now = format(today, "HH:mm:ss");
      let currentPeriod: string | null = null;
      let nextPeriod: string | null = null;
      let nextPeriodTime: string | null = null;

      if (timetableEntries && timetableEntries.length > 0) {
        for (let i = 0; i < timetableEntries.length; i++) {
          const entry = timetableEntries[i];
          const period = entry.timetable_periods as { label: string; start_time: string | null; end_time: string | null };
          const startTime = period.start_time || "00:00:00";
          const endTime = period.end_time || "23:59:59";

          if (now >= startTime && now <= endTime) {
            currentPeriod = `${entry.subject_name} (${period.label})`;
          } else if (now < startTime && !nextPeriod) {
            nextPeriod = `${entry.subject_name} (${period.label})`;
            nextPeriodTime = startTime.slice(0, 5);
          }
        }
      }

      // Get pending submissions to grade
      let pendingSubmissions = 0;
      const { count: submissionCount } = await supabase
        .from("assignment_submissions")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("status", "submitted")
        .in("assignment_id", (
          await supabase
            .from("assignments")
            .select("id")
            .eq("school_id", schoolId)
            .eq("teacher_user_id", user.id)
        ).data?.map(a => a.id) || []);
      pendingSubmissions = submissionCount || 0;

      // Get upcoming deadlines (next 3 days)
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      const { data: homeworkData } = await supabase
        .from("homework")
        .select("title, due_date")
        .eq("school_id", schoolId)
        .eq("teacher_user_id", user.id)
        .eq("status", "active")
        .gte("due_date", todayStr)
        .lte("due_date", format(threeDaysLater, "yyyy-MM-dd"))
        .order("due_date", { ascending: true })
        .limit(3);

      const upcomingDeadlines = homeworkData?.map(h => ({
        title: h.title,
        due: h.due_date,
      })) || [];

      // Get unread messages
      const { count: unreadCount } = await supabase
        .from("admin_message_recipients")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", user.id)
        .eq("is_read", false);

      // Get attendance completion for today
      let attendanceCompleted = 0;
      let attendanceTotal = 0;
      if (sectionIds.length > 0) {
        attendanceTotal = sectionIds.length;
        const { count } = await supabase
          .from("attendance_sessions")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("session_date", todayStr)
          .in("class_section_id", sectionIds);
        attendanceCompleted = count || 0;
      }

      setData({
        classesToday,
        currentPeriod,
        nextPeriod,
        nextPeriodTime,
        pendingSubmissions,
        upcomingDeadlines,
        unreadMessages: unreadCount || 0,
        attendanceCompleted,
        attendanceTotal,
      });
      setLoading(false);
    };

    fetchData();
  }, [user, schoolId, sectionIds]);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const attendanceProgress = data.attendanceTotal > 0 
    ? Math.round((data.attendanceCompleted / data.attendanceTotal) * 100) 
    : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Today's Focus</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {format(new Date(), "EEEE, MMM d")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current/Next Period Banner */}
        {(data.currentPeriod || data.nextPeriod) && (
          <div className="rounded-xl bg-primary/10 p-3 sm:p-4">
            {data.currentPeriod ? (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary animate-pulse">
                  <Clock className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Currently Teaching</p>
                  <p className="font-semibold text-sm sm:text-base">{data.currentPeriod}</p>
                </div>
              </div>
            ) : data.nextPeriod ? (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Next Up at {data.nextPeriodTime}</p>
                  <p className="font-semibold text-sm sm:text-base">{data.nextPeriod}</p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Classes Today */}
          <Link
            to={`/${schoolSlug}/teacher/timetable`}
            className="flex flex-col items-center gap-1 rounded-xl border bg-background/50 p-3 text-center transition-all hover:bg-accent hover:shadow-md"
          >
            <CalendarCheck className="h-5 w-5 text-primary" />
            <span className="text-xl font-bold">{data.classesToday}</span>
            <span className="text-[10px] text-muted-foreground">Classes Today</span>
          </Link>

          {/* Pending Submissions */}
          <Link
            to={`/${schoolSlug}/teacher/assignments`}
            className="relative flex flex-col items-center gap-1 rounded-xl border bg-background/50 p-3 text-center transition-all hover:bg-accent hover:shadow-md"
          >
            {data.pendingSubmissions > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {data.pendingSubmissions > 9 ? "9+" : data.pendingSubmissions}
              </span>
            )}
            <FileText className="h-5 w-5 text-orange-500" />
            <span className="text-xl font-bold">{data.pendingSubmissions}</span>
            <span className="text-[10px] text-muted-foreground">To Grade</span>
          </Link>

          {/* Unread Messages */}
          <Link
            to={`/${schoolSlug}/teacher/messages`}
            className="relative flex flex-col items-center gap-1 rounded-xl border bg-background/50 p-3 text-center transition-all hover:bg-accent hover:shadow-md"
          >
            {data.unreadMessages > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {data.unreadMessages > 9 ? "9+" : data.unreadMessages}
              </span>
            )}
            <MessageSquare className="h-5 w-5 text-blue-500" />
            <span className="text-xl font-bold">{data.unreadMessages}</span>
            <span className="text-[10px] text-muted-foreground">Unread</span>
          </Link>

          {/* Attendance Progress */}
          <Link
            to={`/${schoolSlug}/teacher/attendance`}
            className="flex flex-col items-center gap-1 rounded-xl border bg-background/50 p-3 text-center transition-all hover:bg-accent hover:shadow-md"
          >
            <div className="relative">
              <svg className="h-8 w-8 -rotate-90">
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-muted"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={`${(attendanceProgress / 100) * 75.4} 75.4`}
                  className="text-green-500"
                />
              </svg>
            </div>
            <span className="text-sm font-bold">{data.attendanceCompleted}/{data.attendanceTotal}</span>
            <span className="text-[10px] text-muted-foreground">Attendance</span>
          </Link>
        </div>

        {/* Upcoming Deadlines */}
        {data.upcomingDeadlines.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <p className="text-xs font-medium text-muted-foreground">Upcoming Deadlines</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.upcomingDeadlines.map((deadline, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  <BookOpen className="mr-1 h-3 w-3" />
                  {deadline.title} • {format(new Date(deadline.due), "MMM d")}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Quick Action */}
        {data.attendanceCompleted < data.attendanceTotal && (
          <Button asChild size="sm" className="w-full">
            <Link to={`/${schoolSlug}/teacher/attendance`}>
              <CalendarCheck className="mr-2 h-4 w-4" />
              Complete Today's Attendance ({data.attendanceTotal - data.attendanceCompleted} remaining)
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
