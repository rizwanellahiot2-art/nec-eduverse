import { PropsWithChildren } from "react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { BarChart3, ClipboardList, Megaphone, PhoneCall, Target, Users, CalendarDays } from "lucide-react";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  schoolSlug: string;
}>;

export function MarketingShell({ title, subtitle, schoolSlug, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl bg-surface p-4 shadow-elevated">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">EDUVERSE</p>
              <p className="text-xs text-muted-foreground">/{schoolSlug} • marketing</p>
            </div>
            <Button variant="soft" size="icon" aria-label="Marketing">
              <Megaphone className="h-4 w-4" />
            </Button>
          </div>

          <nav className="mt-6 space-y-1">
            <NavLink
              to={`/${schoolSlug}/marketing`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <BarChart3 className="h-4 w-4" /> Overview
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/marketing/leads`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <Users className="h-4 w-4" /> Leads
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/marketing/follow-ups`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <ClipboardList className="h-4 w-4" /> Follow-ups
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/marketing/calls`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <PhoneCall className="h-4 w-4" /> Call logs
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/marketing/sources`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <Target className="h-4 w-4" /> Sources
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/marketing/campaigns`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <Megaphone className="h-4 w-4" /> Campaigns
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/marketing/reports`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <BarChart3 className="h-4 w-4" /> Reports
            </NavLink>

            <NavLink
              to={`/${schoolSlug}/marketing/timetable`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground"
              activeClassName="bg-accent text-accent-foreground"
            >
              <CalendarDays className="h-4 w-4" /> Timetable Builder
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
