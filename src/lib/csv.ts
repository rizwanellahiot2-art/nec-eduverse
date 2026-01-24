type CsvRow = Record<string, string>;

// Minimal CSV parser (supports quotes, commas, CRLF).
// Good for admin imports; not a full RFC4180 implementation.
export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cur);
    cur = "";
  };
  const pushRow = () => {
    // Ignore completely empty trailing line
    if (row.length === 1 && row[0] === "") {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  const s = text.replace(/^\uFEFF/, ""); // strip BOM
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        const next = s[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      pushCell();
      continue;
    }
    if (ch === "\n") {
      pushCell();
      pushRow();
      continue;
    }
    if (ch === "\r") {
      // swallow CR (CRLF)
      continue;
    }
    cur += ch;
  }
  pushCell();
  if (row.length) pushRow();

  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const data = rows.slice(1);
  return data
    .filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
    .map((r) => {
      const obj: CsvRow = {};
      header.forEach((k, idx) => {
        obj[k] = (r[idx] ?? "").trim();
      });
      return obj;
    });
}

const escapeCsv = (value: string) => {
  const s = String(value ?? "");
  if (/[\n\r",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export function toCsv(rows: Array<Record<string, string | number | null | undefined>>): string {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const header = keys.map(escapeCsv).join(",");
  const lines = rows.map((r) => keys.map((k) => escapeCsv(String(r[k] ?? ""))).join(","));
  return [header, ...lines].join("\n");
}

export function exportToCSV(rows: Array<Record<string, string | number | null | undefined>>, filename: string): void {
  const csvContent = toCsv(rows);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
