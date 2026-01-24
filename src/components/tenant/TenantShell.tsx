import { PropsWithChildren, useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { BarChart3, CalendarDays, Coins, GraduationCap, Headphones, KanbanSquare, LayoutGrid, Settings, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { EduverseRole } from "@/lib/eduverse-roles";
import { supabase } from "@/integrations/supabase/client";
import { GlobalCommandPalette } from "@/components/global/GlobalCommandPalette";
import { NotificationsBell } from "@/components/global/NotificationsBell";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  role: EduverseRole;
  schoolSlug: string;
}>;

export function TenantShell({ title, subtitle, role, schoolSlug, children }: Props) {
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

  return (
    <div className="min-h-screen bg-background">
      <GlobalCommandPalette basePath={`/${schoolSlug}/${role}`} />
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl bg-surface p-4 shadow-elevated">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">EDUVERSE</p>
              <p className="text-xs text-muted-foreground">/{schoolSlug} • {role}</p>
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
              to={`/${schoolSlug}/${role}`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <LayoutGrid className="h-4 w-4" /> Dashboard
            </NavLink>

            {role === "super_admin" && (
              <NavLink
                to={`/${schoolSlug}/${role}/admin`}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
                activeClassName="bg-accent text-accent-foreground"
              >
                <ShieldCheck className="h-4 w-4" /> Admin Console
              </NavLink>
            )}

            {role === "super_admin" && (
              <NavLink
                to={`/${schoolSlug}/${role}/schools`}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
                activeClassName="bg-accent text-accent-foreground"
              >
                <ShieldCheck className="h-4 w-4" /> All Schools
              </NavLink>
            )}

            <NavLink
              to={`/${schoolSlug}/${role}/users`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <Users className="h-4 w-4" /> Staff & Users
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/${role}/crm`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <KanbanSquare className="h-4 w-4" /> Admissions CRM
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/${role}/academic`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <GraduationCap className="h-4 w-4" /> Academic Core
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/${role}/timetable`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <CalendarDays className="h-4 w-4" /> Timetable Builder
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/${role}/attendance`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <GraduationCap className="h-4 w-4" /> Attendance
            </NavLink>

            {(["principal", "vice_principal", "accountant", "super_admin", "school_owner"] as EduverseRole[]).includes(role) && (
              <NavLink
                to={`/${schoolSlug}/${role}/finance`}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
                activeClassName="bg-accent text-accent-foreground"
              >
                <Coins className="h-4 w-4" /> Finance
              </NavLink>
            )}

            <NavLink
              to={`/${schoolSlug}/${role}/reports`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <BarChart3 className="h-4 w-4" /> Reports
            </NavLink>

            {(["principal", "vice_principal", "super_admin", "school_owner", "hr_manager"] as EduverseRole[]).includes(role) && (
              <NavLink
                to={`/${schoolSlug}/${role}/support`}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
                activeClassName="bg-accent text-accent-foreground"
              >
                <Headphones className="h-4 w-4" /> Support
              </NavLink>
            )}

            <NavLink
              to={`/${schoolSlug}/${role}?settings=1`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <Settings className="h-4 w-4" /> Settings
            </NavLink>
          </nav>

          <div className="mt-6 rounded-2xl bg-accent p-4">
            <p className="text-sm font-medium text-accent-foreground">Foundation status</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Modules will light up as we add CRM, academics, finance, HR, comms, and BI.
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
