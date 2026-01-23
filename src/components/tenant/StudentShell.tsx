import { PropsWithChildren } from "react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { BookOpen, CalendarDays, GraduationCap, Headphones, LayoutGrid, ScrollText } from "lucide-react";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  schoolSlug: string;
}>;

export function StudentShell({ title, subtitle, schoolSlug, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl bg-surface p-4 shadow-elevated">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">EDUVERSE</p>
              <p className="text-xs text-muted-foreground">/{schoolSlug} • student</p>
            </div>
            <Button variant="soft" size="icon" aria-label="Student">
              <GraduationCap className="h-4 w-4" />
            </Button>
          </div>

          <nav className="mt-6 space-y-1">
            <NavLink
              to={`/${schoolSlug}/student`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <LayoutGrid className="h-4 w-4" /> Home
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/student/attendance`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <CalendarDays className="h-4 w-4" /> Attendance
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/student/grades`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <BookOpen className="h-4 w-4" /> Grades
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/student/timetable`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <ScrollText className="h-4 w-4" /> Timetable
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/student/assignments`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <ScrollText className="h-4 w-4" /> Assignments
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/student/certificates`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <ScrollText className="h-4 w-4" /> Certificates
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/student/support`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <Headphones className="h-4 w-4" /> Support
            </NavLink>
          </nav>
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
