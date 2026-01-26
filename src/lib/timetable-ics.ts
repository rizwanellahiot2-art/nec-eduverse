/**
 * ICS Calendar Export for Timetables
 * Generates downloadable .ics files for calendar import
 */

type TimetableIcsEntry = {
  day_of_week: number;
  period_id: string;
  subject_name: string | null;
  room: string | null;
  section_label: string | null;
  teacher_name?: string | null;
};

type TimetablePeriod = {
  id: string;
  label: string;
  start_time: string | null;
  end_time: string | null;
};

type IcsExportData = {
  teacherName: string;
  schoolName: string;
  periods: TimetablePeriod[];
  entries: TimetableIcsEntry[];
  weeksAhead?: number;
};

function formatIcsDate(date: Date, time: string | null): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  
  return `${year}${month}${day}T${hour}${min}00`;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@eduverse.app`;
}

function getNextDayOfWeek(dayOfWeek: number, fromDate: Date): Date {
  const result = new Date(fromDate);
  const currentDay = result.getDay();
  const daysUntil = (dayOfWeek - currentDay + 7) % 7;
  result.setDate(result.getDate() + (daysUntil === 0 ? 0 : daysUntil));
  return result;
}

export function generateTimetableIcs(data: IcsExportData): string {
  const { teacherName, schoolName, periods, entries, weeksAhead = 4 } = data;
  const periodById = new Map(periods.map((p) => [p.id, p]));
  const now = new Date();
  
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EDUVERSE//Timetable Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(teacherName)} - Timetable`,
    `X-WR-CALDESC:Weekly teaching schedule from ${escapeIcsText(schoolName)}`,
  ];

  // Generate events for each entry, repeated for weeksAhead weeks
  for (const entry of entries) {
    if (!entry.subject_name) continue;
    
    const period = periodById.get(entry.period_id);
    if (!period || !period.start_time || !period.end_time) continue;

    for (let week = 0; week < weeksAhead; week++) {
      const baseDate = getNextDayOfWeek(entry.day_of_week, now);
      baseDate.setDate(baseDate.getDate() + week * 7);

      const dtStart = formatIcsDate(baseDate, period.start_time);
      const dtEnd = formatIcsDate(baseDate, period.end_time);

      if (!dtStart || !dtEnd) continue;

      const summary = entry.subject_name;
      const location = entry.room || "";
      const description = [
        entry.section_label ? `Section: ${entry.section_label}` : "",
        entry.teacher_name ? `Teacher: ${entry.teacher_name}` : "",
        `Period: ${period.label}`,
      ]
        .filter(Boolean)
        .join("\\n");

      lines.push(
        "BEGIN:VEVENT",
        `UID:${generateUID()}`,
        `DTSTAMP:${formatIcsDate(now, "00:00")}00Z`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${escapeIcsText(summary)}`,
        location ? `LOCATION:${escapeIcsText(location)}` : "",
        `DESCRIPTION:${description}`,
        `CATEGORIES:Teaching,${escapeIcsText(schoolName)}`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    }
  }

  lines.push("END:VCALENDAR");
  
  return lines.filter(Boolean).join("\r\n");
}

export function downloadTimetableIcs(data: IcsExportData): void {
  const icsContent = generateTimetableIcs(data);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  const safeName = data.teacherName.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  a.download = `Timetable_${safeName}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
