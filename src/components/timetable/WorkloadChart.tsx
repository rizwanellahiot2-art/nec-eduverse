import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(var(--accent))",
];

type Entry = {
  day_of_week: number;
  period_id: string;
  subject_name: string | null;
};

type Period = {
  id: string;
  start_time: string | null;
  end_time: string | null;
  is_break?: boolean;
};

function calculateHours(periods: Period[], periodIds: string[]): number {
  let totalMinutes = 0;
  const periodSet = new Set(periodIds);

  for (const p of periods) {
    if (!periodSet.has(p.id) || p.is_break) continue;
    if (p.start_time && p.end_time) {
      const [sh, sm] = p.start_time.split(":").map(Number);
      const [eh, em] = p.end_time.split(":").map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      if (endMins > startMins) {
        totalMinutes += endMins - startMins;
      }
    } else {
      // Default to 45 minutes if no time set
      totalMinutes += 45;
    }
  }

  return Math.round((totalMinutes / 60) * 10) / 10;
}

export function WorkloadChart({
  entries,
  periods,
}: {
  entries: Entry[];
  periods: Period[];
}) {
  const data = useMemo(() => {
    const byDay: Record<number, string[]> = {};
    for (let i = 0; i < 7; i++) byDay[i] = [];

    for (const e of entries) {
      if (e.subject_name) {
        byDay[e.day_of_week]?.push(e.period_id);
      }
    }

    return DAYS.map((name, idx) => ({
      name,
      periods: byDay[idx].length,
      hours: calculateHours(periods, byDay[idx]),
    }));
  }, [entries, periods]);

  const totalPeriods = useMemo(() => entries.filter((e) => e.subject_name).length, [entries]);
  const totalHours = useMemo(() => data.reduce((sum, d) => sum + d.hours, 0), [data]);
  const avgPerDay = useMemo(() => {
    const daysWithClasses = data.filter((d) => d.periods > 0).length;
    return daysWithClasses > 0 ? Math.round((totalHours / daysWithClasses) * 10) / 10 : 0;
  }, [data, totalHours]);

  const today = new Date().getDay();

  return (
    <Card className="no-print">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium">Weekly Workload</CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">{totalPeriods} periods</Badge>
            <Badge variant="outline">{totalHours}h total</Badge>
            <Badge variant="outline">{avgPerDay}h/day avg</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{ value: "hours", angle: -90, position: "insideLeft", fontSize: 10 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg bg-popover px-3 py-2 text-sm shadow-md border">
                        <p className="font-medium">{d.name}</p>
                        <p className="text-muted-foreground">
                          {d.periods} period{d.periods !== 1 ? "s" : ""} • {d.hours}h
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === today ? "hsl(var(--primary))" : DAY_COLORS[index % DAY_COLORS.length]}
                    opacity={index === today ? 1 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
