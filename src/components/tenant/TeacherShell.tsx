import { PropsWithChildren, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquare,
  NotebookPen,
  Send,
  Sparkles,
  Users,
  TableIcon,
  TrendingUp,
  BookCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlobalCommandPalette } from "@/components/global/GlobalCommandPalette";
import { NotificationsBell } from "@/components/global/NotificationsBell";
import { useTeacherBadges } from "@/hooks/useTeacherBadges";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useSession } from "@/hooks/useSession";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  schoolSlug: string;
}>;

export function TeacherShell({ title, subtitle, schoolSlug, children }: Props) {
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user } = useSession();
  const badges = useTeacherBadges(schoolId, user?.id ?? null);
  const { unreadCount: unreadAdminMessages } = useUnreadMessages(schoolId);
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/${schoolSlug}/auth`);
  };

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

  const navItems = [
    { to: basePath, icon: LayoutGrid, label: "Dashboard", end: true, badge: 0 },
    { to: `${basePath}/students`, icon: Users, label: "My Students", badge: 0 },
    { to: `${basePath}/attendance`, icon: ClipboardCheck, label: "Attendance", badge: 0 },
    { to: `${basePath}/homework`, icon: BookOpen, label: "Homework", badge: 0 },
    { to: `${basePath}/assignments`, icon: FileText, label: "Assignments", badge: badges.pendingAssignments },
    { to: `${basePath}/behavior`, icon: NotebookPen, label: "Behavior Notes", badge: 0 },
    { to: `${basePath}/gradebook`, icon: TableIcon, label: "Gradebook", badge: 0 },
    { to: `${basePath}/progress`, icon: TrendingUp, label: "Student Progress", badge: 0 },
    { to: `${basePath}/lesson-plans`, icon: BookCheck, label: "Lesson Planner", badge: 0 },
    { to: `${basePath}/reports`, icon: GraduationCap, label: "Report Cards", badge: 0 },
    { to: `${basePath}/timetable`, icon: CalendarDays, label: "Timetable", badge: 0 },
    { to: `${basePath}/messages`, icon: MessageSquare, label: "Parent Messages", badge: badges.unreadMessages },
    { to: `${basePath}/workspace-messages`, icon: Send, label: "Admin Messages", badge: unreadAdminMessages },
  ];

  const bottomNavItems = [
    { to: basePath, icon: LayoutGrid, label: "Home", end: true },
    { to: `${basePath}/workspace-messages`, icon: MessageSquare, label: "Messages", badge: badges.unreadMessages + unreadAdminMessages },
    { to: `${basePath}/attendance`, icon: ClipboardCheck, label: "Attendance" },
    { to: `${basePath}/students`, icon: Users, label: "Students" },
  ];

  const NavContent = () => (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-semibold tracking-tight">EDUVERSE</p>
          <p className="text-xs text-muted-foreground">/{schoolSlug} • Teacher</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell schoolId={schoolId} schoolSlug={schoolSlug} role="teacher" />
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
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            activeClassName="bg-primary text-primary-foreground shadow-sm"
            onClick={() => setMobileNavOpen(false)}
          >
            <span className="flex items-center gap-2">
              <item.icon className="h-4 w-4" /> {item.label}
            </span>
            {item.badge > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {item.badge > 99 ? "99+" : item.badge}
              </Badge>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 rounded-2xl bg-accent p-4">
        <p className="text-sm font-medium text-accent-foreground">Teacher Panel</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Manage your classes, students, and daily tasks.
        </p>
      </div>

      <div className="mt-6">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <GlobalCommandPalette basePath={basePath} />

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-4">
              <NavContent />
            </SheetContent>
          </Sheet>
          <div>
            <p className="font-display text-base font-semibold tracking-tight">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell schoolId={schoolId} schoolSlug={schoolSlug} role="teacher" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.dispatchEvent(new Event("eduverse:open-search"))}
          >
            <Sparkles className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[280px_1fr] lg:gap-6 lg:px-6 lg:py-6">
        {/* Desktop Sidebar */}
        <aside className="sticky top-6 hidden self-start max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl bg-surface p-4 shadow-elevated lg:block">
          <NavContent />
        </aside>

        {/* Main Content */}
        <section className="rounded-2xl bg-surface p-4 shadow-elevated lg:rounded-3xl lg:p-6">
          <header className="mb-4 hidden lg:mb-6 lg:block">
            <p className="font-display text-2xl font-semibold tracking-tight">{title}</p>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </header>
          {children}
        </section>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-background/95 px-2 py-2 backdrop-blur lg:hidden">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-muted-foreground transition-colors relative"
            activeClassName="text-primary-foreground bg-primary shadow-sm"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
            {"badge" in item && item.badge !== undefined && item.badge > 0 && (
              <span className="absolute -top-0.5 right-1/4 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setMobileNavOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-muted-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </div>
  );
}
