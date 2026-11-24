export const fmtDate = (d?: string | null) => (d ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not set");
export const fmtNum = (n?: number | string | null, max = 2) => (n === null || n === undefined || n === "" || Number.isNaN(Number(n)) ? "Not set" : Number(n).toLocaleString("en-GB", { maximumFractionDigits: max }));
export const label = (s?: string | null) => (s ? s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "Not set");
export function download(name: string, content: string, mime = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type: mime + ";charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
export function toCsv(rows: Record<string, unknown>[], cols?: string[]) {
  const keys = cols || Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => { let s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}
