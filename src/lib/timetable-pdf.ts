/**
 * Teacher Timetable PDF Generation
 * Generates a printable weekly timetable with sections and rooms
 */

export type TimetablePdfEntry = {
  day_of_week: number;
  period_id: string;
  subject_name: string | null;
  room: string | null;
  section_label: string | null;
  teacher_name?: string | null;
};

export type TimetablePeriod = {
  id: string;
  label: string;
  sort_order: number;
  start_time: string | null;
  end_time: string | null;
  is_break?: boolean;
};

export type TimetablePdfData = {
  teacherName: string;
  schoolName: string;
  periods: TimetablePeriod[];
  entries: TimetablePdfEntry[];
  generatedAt: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function timeLabel(v: string | null): string {
  if (!v) return "";
  return String(v).slice(0, 5);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function generateTimetablePdfHtml(data: TimetablePdfData): string {
  const { teacherName, schoolName, periods, entries, generatedAt } = data;

  // Build entry lookup
  const entryBySlot = new Map<string, TimetablePdfEntry>();
  for (const e of entries) {
    entryBySlot.set(`${e.day_of_week}:${e.period_id}`, e);
  }

  // Filter non-break periods for grid columns
  const gridPeriods = periods.filter((p) => !p.is_break);

  // Generate period headers
  const periodHeaders = gridPeriods
    .map(
      (p) => `
      <th class="period-header">
        <div class="period-label">${p.label}</div>
        <div class="period-time">${timeLabel(p.start_time)}${p.start_time && p.end_time ? " - " : ""}${timeLabel(p.end_time)}</div>
      </th>
    `
    )
    .join("");

  // Generate rows for each day
  const dayRows = DAYS.map((dayName, dayIndex) => {
    const cells = gridPeriods
      .map((p) => {
        const entry = entryBySlot.get(`${dayIndex}:${p.id}`);
        if (!entry || !entry.subject_name) {
          return `<td class="cell empty">—</td>`;
        }
        return `
          <td class="cell">
            <div class="subject">${entry.subject_name}</div>
            ${entry.section_label ? `<div class="section">${entry.section_label}</div>` : ""}
            ${entry.room ? `<div class="room">Room: ${entry.room}</div>` : ""}
          </td>
        `;
      })
      .join("");

    return `
      <tr>
        <td class="day-cell">${dayName}</td>
        ${cells}
      </tr>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Timetable - ${teacherName}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #1a1a1a;
      background: #fff;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e5e5;
    }
    .school-name {
      font-size: 18px;
      font-weight: 700;
      color: #333;
      margin-bottom: 4px;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #111;
      margin-bottom: 8px;
    }
    .teacher-name {
      font-size: 16px;
      font-weight: 600;
      color: #555;
      margin-bottom: 4px;
    }
    .generated-date {
      font-size: 10px;
      color: #888;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 6px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
    }
    .day-header {
      width: 70px;
      background: #f0f0f0;
    }
    .period-header {
      min-width: 100px;
      text-align: center;
    }
    .period-label {
      font-weight: 600;
      font-size: 11px;
    }
    .period-time {
      font-size: 9px;
      color: #666;
      margin-top: 2px;
    }
    .day-cell {
      font-weight: 600;
      background: #f8f9fa;
      text-align: center;
      vertical-align: middle;
    }
    .cell {
      min-height: 50px;
      font-size: 10px;
    }
    .cell.empty {
      color: #ccc;
      text-align: center;
      vertical-align: middle;
    }
    .subject {
      font-weight: 600;
      font-size: 11px;
      color: #333;
      margin-bottom: 2px;
    }
    .section {
      font-size: 9px;
      color: #666;
      margin-bottom: 1px;
    }
    .room {
      font-size: 9px;
      color: #888;
    }
    .footer {
      text-align: center;
      font-size: 9px;
      color: #999;
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #eee;
    }
    @media print {
      body {
        padding: 0;
        font-size: 10px;
      }
      .header {
        margin-bottom: 16px;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      @page {
        size: landscape;
        margin: 10mm;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="school-name">${schoolName}</div>
    <div class="title">Weekly Teaching Schedule</div>
    <div class="teacher-name">${teacherName}</div>
    <div class="generated-date">Generated: ${generatedAt}</div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th class="day-header">Day</th>
        ${periodHeaders}
      </tr>
    </thead>
    <tbody>
      ${dayRows}
    </tbody>
  </table>
  
  <div class="footer">
    This timetable was automatically generated. For any discrepancies, please contact the administration.
  </div>
</body>
</html>
  `.trim();
}

export function openTimetablePdf(data: TimetablePdfData): void {
  const html = generateTimetablePdfHtml(data);
  const newWindow = window.open("", "_blank");
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
    // Give it time to render before printing
    setTimeout(() => {
      newWindow.print();
    }, 300);
  }
}

export function downloadTimetableHtml(data: TimetablePdfData): void {
  const html = generateTimetablePdfHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = data.teacherName.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  a.download = `Timetable_${safeName}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
