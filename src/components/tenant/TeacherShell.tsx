import { PropsWithChildren, useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutGrid,
  MessageSquare,
  NotebookPen,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlobalCommandPalette } from "@/components/global/GlobalCommandPalette";
import { NotificationsBell } from "@/components/global/NotificationsBell";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  schoolSlug: string;
}>;

export function TeacherShell({ title, subtitle, schoolSlug, children }: Props) {
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Apply per-school branding to global CSS vars (white-labeling hook point)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: school } = await supabase.from("schools").select("id").eq("slug", schoolSlug).maybeSingle();
      if (cancelled || !school?.id) return;
      setSchoolId(school.id);
      const { data: branding } = await supabase
        .from("school_branding")
        .select("accent_hue,accent_saturation,accent_lightness,radius_scale")
        .eq("school_id", school.id)
        .maybeSingle();

      if (cancelled || !branding) return;
      const root = document.documentElement;
      root.style.setProperty("--brand", `${branding.accent_hue} ${branding.accent_saturation}% ${branding.accent_lightness}%`);
      root.style.setProperty("--radius", `${0.85 * (branding.radius_scale || 1)}rem`);
    })();

    return () => {
      cancelled = true;
    };
  }, [schoolSlug]);

  const basePath = `/${schoolSlug}/teacher`;

  return (
    <div className="min-h-screen bg-background">
      <GlobalCommandPalette basePath={basePath} />
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl bg-surface p-4 shadow-elevated">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">EDUVERSE</p>
              <p className="text-xs text-muted-foreground">/{schoolSlug} • Teacher</p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationsBell schoolId={schoolId} />
              <Button
                variant="soft"
                size="icon"
                aria-label="Search"
                onClick={() => window.dispatchEvent(new Event("eduverse:open-search"))}
              >
                <Sparkles />
              </Button>
            </div>
          </div>

          <nav className="mt-6 space-y-1">
            <NavLink
              to={basePath}
              end
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <LayoutGrid className="h-4 w-4" /> Dashboard
            </NavLink>

            <NavLink
              to={`${basePath}/students`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <Users className="h-4 w-4" /> My Students
            </NavLink>

            <NavLink
              to={`${basePath}/attendance`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <ClipboardCheck className="h-4 w-4" /> Attendance
            </NavLink>

            <NavLink
              to={`${basePath}/homework`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <BookOpen className="h-4 w-4" /> Homework
            </NavLink>

            <NavLink
              to={`${basePath}/assignments`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <FileText className="h-4 w-4" /> Assignments & Results
            </NavLink>

            <NavLink
              to={`${basePath}/behavior`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <NotebookPen className="h-4 w-4" /> Behavior Notes
            </NavLink>

            <NavLink
              to={`${basePath}/reports`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <GraduationCap className="h-4 w-4" /> Report Cards
            </NavLink>

            <NavLink
              to={`${basePath}/timetable`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <CalendarDays className="h-4 w-4" /> Timetable
            </NavLink>

            <NavLink
              to={`${basePath}/messages`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <MessageSquare className="h-4 w-4" /> Parent Messages
            </NavLink>

            <NavLink
              to={`${basePath}/admin-inbox`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <Send className="h-4 w-4" /> Message Admin
            </NavLink>
          </nav>

          <div className="mt-6 rounded-2xl bg-accent p-4">
            <p className="text-sm font-medium text-accent-foreground">Teacher Panel</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage your classes, students, and daily tasks.
            </p>
          </div>
        </aside>

        <section className="rounded-3xl bg-surface p-6 shadow-elevated">
          <header className="mb-6">
            <p className="font-display text-2xl font-semibold tracking-tight">{title}</p>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </header>
          {children}
        </section>
      </div>
    </div>
  );
}
