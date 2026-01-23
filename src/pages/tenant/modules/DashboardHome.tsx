import { BarChart3, GraduationCap, KanbanSquare, Users } from "lucide-react";

export function DashboardHome() {
  const items = [
    { title: "Staff & Users", desc: "Invites, roles, memberships", icon: Users },
    { title: "Admissions CRM", desc: "Pipelines, leads, scoring", icon: KanbanSquare },
    { title: "Academic Core", desc: "Classes, sections, students", icon: GraduationCap },
    { title: "BI widgets", desc: "KPIs and forecasts (next)", icon: BarChart3 },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map(({ title, desc, icon: Icon }) => (
        <div key={title} className="rounded-3xl bg-surface p-6 shadow-elevated">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-semibold tracking-tight">{title}</p>
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
        </div>
      ))}
    </div>
  );
}
