import { useCallback } from "react";
import { toCsv } from "@/lib/csv";

type PeriodRow = {
  id: string;
  label: string;
  sort_order: number;
  start_time: string | null;
  end_time: string | null;
};

type EntryRow = {
  id: string;
  day_of_week: number;
  period_id: string;
  subject_name: string;
  teacher_user_id: string | null;
  room: string | null;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function timeLabel(v: string | null) {
  if (!v) return "";
  return String(v).slice(0, 5);
}

export function useTimetableExport(
  periods: PeriodRow[],
  entries: EntryRow[],
  teacherLabelByUserId: Map<string, string>,
  sectionLabel: string,
) {
  const exportCsv = useCallback(() => {
    if (entries.length === 0) return;

    const rows = entries.map((e) => {
      const period = periods.find((p) => p.id === e.period_id);
      const dayName = DAYS[e.day_of_week] ?? e.day_of_week;
      const teacherLabel = e.teacher_user_id
        ? teacherLabelByUserId.get(e.teacher_user_id) ?? e.teacher_user_id
        : "";

      return {
        Day: dayName,
        Period: period?.label ?? "",
        "Start Time": timeLabel(period?.start_time ?? null),
        "End Time": timeLabel(period?.end_time ?? null),
        Subject: e.subject_name,
        Teacher: teacherLabel,
        Room: e.room ?? "",
      };
    });

    // Sort by day, then period sort_order
    const periodOrder = new Map(periods.map((p) => [p.id, p.sort_order]));
    rows.sort((a, b) => {
      const dayA = DAYS.indexOf(a.Day as string);
      const dayB = DAYS.indexOf(b.Day as string);
      if (dayA !== dayB) return dayA - dayB;
      const periodA = entries.find((e) => DAYS[e.day_of_week] === a.Day && e.subject_name === a.Subject);
      const periodB = entries.find((e) => DAYS[e.day_of_week] === b.Day && e.subject_name === b.Subject);
      return (periodOrder.get(periodA?.period_id ?? "") ?? 0) - (periodOrder.get(periodB?.period_id ?? "") ?? 0);
    });

    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timetable-${sectionLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [periods, entries, teacherLabelByUserId, sectionLabel]);

  return { exportCsv };
}
