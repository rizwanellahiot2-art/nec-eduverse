import { Fragment, useMemo } from "react";

type Period = {
  id: string;
  label: string;
  sort_order: number;
  start_time: string | null;
  end_time: string | null;
};

export type PeriodTimetableEntry = {
  id: string;
  day_of_week: number;
  period_id: string;
  subject_name: string | null;
  room: string | null;
  teacher_name?: string | null;
  section_label?: string | null;
};

const DAYS: Array<{ id: number; label: string }> = [
  { id: 0, label: "Sun" },
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
];

function timeLabel(v: string | null) {
  if (!v) return "";
  return String(v).slice(0, 5);
}

export function PeriodTimetableGrid({
  periods,
  entries,
  stickyDayColumn = true,
  printable = false,
}: {
  periods: Period[];
  entries: PeriodTimetableEntry[];
  stickyDayColumn?: boolean;
  printable?: boolean;
}) {
  const entryBySlot = useMemo(() => {
    const m = new Map<string, PeriodTimetableEntry>();
    for (const e of entries) m.set(`${e.day_of_week}:${e.period_id}`, e);
    return m;
  }, [entries]);

  return (
    <div className={printable ? "" : "overflow-auto"}>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `160px repeat(${Math.max(periods.length, 1)}, minmax(200px, 1fr))` }}
      >
        <div
          className={
            "rounded-2xl bg-surface px-2 py-2 text-xs font-medium text-muted-foreground " +
            (stickyDayColumn && !printable ? "sticky left-0 z-10" : "")
          }
        >
          Day
        </div>
        {periods.map((p) => (
          <div key={p.id} className="rounded-2xl bg-surface px-2 py-2">
            <p className="text-sm font-medium">{p.label}</p>
            <p className="text-xs text-muted-foreground">
              {timeLabel(p.start_time)}
              {p.start_time && p.end_time ? "–" : ""}
              {timeLabel(p.end_time)}
            </p>
          </div>
        ))}

        {DAYS.map((d) => (
          <Fragment key={`row:${d.id}`}>
            <div
              className={
                "flex items-center rounded-2xl bg-surface px-2 py-2 text-sm font-medium " +
                (stickyDayColumn && !printable ? "sticky left-0 z-10" : "")
              }
            >
              {d.label}
            </div>
            {periods.map((p) => {
              const e = entryBySlot.get(`${d.id}:${p.id}`) ?? null;
              return (
                <div key={`cell:${d.id}:${p.id}`} className="min-h-[72px] rounded-2xl border bg-surface p-2">
                  {e?.subject_name ? (
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium leading-snug">{e.subject_name}</p>
                      {e.teacher_name && <p className="text-xs text-muted-foreground">{e.teacher_name}</p>}
                      {e.room && <p className="text-xs text-muted-foreground">Room: {e.room}</p>}
                      {e.section_label && <p className="text-xs text-muted-foreground">{e.section_label}</p>}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
