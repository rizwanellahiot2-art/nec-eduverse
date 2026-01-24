import { PropsWithChildren, useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, ClipboardList, Megaphone, PhoneCall, Target, Users, CalendarDays, MessageSquare, Sparkles, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlobalCommandPalette } from "@/components/global/GlobalCommandPalette";
import { NotificationsBell } from "@/components/global/NotificationsBell";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  schoolSlug: string;
}>;

export function MarketingShell({ title, subtitle, schoolSlug, children }: Props) {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const { unreadCount } = useUnreadMessages(schoolId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: school } = await supabase.from("schools").select("id").eq("slug", schoolSlug).maybeSingle();
      if (cancelled || !school?.id) return;
      setSchoolId(school.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolSlug]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = `/${schoolSlug}/auth`;
  };

  const basePath = `/${schoolSlug}/marketing`;

  return (
    <div className="min-h-screen bg-background">
      <GlobalCommandPalette basePath={basePath} />
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl bg-surface p-4 shadow-elevated">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">EDUVERSE</p>
              <p className="text-xs text-muted-foreground">/{schoolSlug} • Marketing</p>
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
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              activeClassName="bg-primary text-primary-foreground shadow-sm"
            >
              <BarChart3 className="h-4 w-4" /> Overview
            </NavLink>

            <NavLink
              to={`${basePath}/leads`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              activeClassName="bg-primary text-primary-foreground shadow-sm"
            >
              <Users className="h-4 w-4" /> Leads
            </NavLink>

            <NavLink
              to={`${basePath}/follow-ups`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              activeClassName="bg-primary text-primary-foreground shadow-sm"
            >
              <ClipboardList className="h-4 w-4" /> Follow-ups
            </NavLink>

            <NavLink
              to={`${basePath}/calls`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              activeClassName="bg-primary text-primary-foreground shadow-sm"
            >
              <PhoneCall className="h-4 w-4" /> Call logs
            </NavLink>

            <NavLink
              to={`${basePath}/sources`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              activeClassName="bg-primary text-primary-foreground shadow-sm"
            >
              <Target className="h-4 w-4" /> Sources
            </NavLink>

            <NavLink
              to={`${basePath}/campaigns`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              activeClassName="bg-primary text-primary-foreground shadow-sm"
            >
              <Megaphone className="h-4 w-4" /> Campaigns
            </NavLink>

            <NavLink
              to={`${basePath}/reports`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              activeClassName="bg-primary text-primary-foreground shadow-sm"
            >
              <BarChart3 className="h-4 w-4" /> Reports
            </NavLink>

            <NavLink
              to={`${basePath}/messages`}
              className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              activeClassName="bg-primary text-primary-foreground shadow-sm"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Messages
              </span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </NavLink>

            <NavLink
              to={`${basePath}/timetable`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              activeClassName="bg-primary text-primary-foreground shadow-sm"
            >
              <CalendarDays className="h-4 w-4" /> Timetable Builder
            </NavLink>
          </nav>

          <div className="mt-6 rounded-2xl bg-accent p-4">
            <p className="text-sm font-medium text-accent-foreground">Marketing Portal</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage leads, campaigns, and admission pipeline.
            </p>
          </div>

          <Button onClick={handleLogout} variant="outline" className="mt-6 w-full">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
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
