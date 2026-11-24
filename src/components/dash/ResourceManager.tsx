"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Download, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { useApp } from "./AppContext";
import { Confirm, EmptyState, Modal, Notice, Spinner, Status, Table, useToast } from "./ui";
import { download, fmtDate, fmtNum, parseCsv, toCsv } from "@/lib/format";

export type Field = {
  key: string; label: string; type?: "text" | "number" | "date" | "select" | "textarea" | "ref" | "email";
  options?: [string, string][]; ref?: string; required?: boolean; default?: unknown; hint?: string;
  table?: boolean; status?: boolean; step?: string;
};
export interface ResourceConfig {
  table: string; singular: string; plural?: string; fields: Field[]; searchKeys: string[]; order?: string; asc?: boolean;
  csv?: boolean; dupKeys?: string[]; description?: string; deletable?: boolean;
  rowActions?: (row: any, reload: () => void) => ReactNode;
  validate?: (v: Record<string, any>) => string | null;
  header?: ReactNode;
  filter?: { key: string; label: string; options: [string, string][] };
}
const refLabelKey: Record<string, string> = { reporting_periods: "label" };

export function useRefs(tables: string[]) {
  const { supabase, orgId } = useApp();
  const [refs, setRefs] = useState<Record<string, { id: string; name: string }[]>>({});
  useEffect(() => {
    let live = true;
    (async () => {
      const out: typeof refs = {};
      for (const t of tables) {
        const k = refLabelKey[t] || "name";
        const { data } = await supabase.from(t).select(`id, ${k}`).eq("org_id", orgId).order(k);
        out[t] = ((data as any[]) || []).map((r) => ({ id: r.id, name: r[k] }));
      }
      if (live) setRefs(out);
    })();
    return () => { live = false; };
  }, [supabase, orgId, tables.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  return refs;
}

export function ResourceManager({ cfg }: { cfg: ResourceConfig }) {
  const { supabase, orgId, canWrite } = useApp();
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState("");
  const [edit, setEdit] = useState<Record<string, any> | null>(null);
  const [del, setDel] = useState<any | null>(null);
  const [showCsv, setShowCsv] = useState(false);
  const refTables = useMemo(() => Array.from(new Set(cfg.fields.filter((f) => f.type === "ref").map((f) => f.ref!))), [cfg.fields]);
  const refs = useRefs(refTables);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from(cfg.table).select("*").eq("org_id", orgId).order(cfg.order || "created_at", { ascending: cfg.asc ?? false }).limit(2000);
    if (error) setError(error.message); else { setError(""); setRows(data || []); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [cfg.table]); // eslint-disable-line react-hooks/exhaustive-deps

  const refName = (t: string, id?: string | null) => (id ? refs[t]?.find((r) => r.id === id)?.name || "Unknown" : "Not set");
  const shown = rows.filter((r) => {
    if (flt && r[cfg.filter!.key] !== flt) return false;
    if (!q) return true;
    return cfg.searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q.toLowerCase()));
  });
  const cols = cfg.fields.filter((f) => f.table !== false);

  function cell(f: Field, r: any) {
    const v = r[f.key];
    if (f.type === "ref") return refName(f.ref!, v);
    if (f.status || (f.type === "select" && f.status !== false && f.options && ["status", "scope_status", "value_basis", "validation_status"].includes(f.key))) return <Status value={v} />;
    if (f.type === "select") return f.options?.find((o) => o[0] === v)?.[1] || (v ?? "Not set");
    if (f.type === "number") return fmtNum(v, 3);
    if (f.type === "date") return fmtDate(v);
    return v || <span className="text-muted">Not set</span>;
  }

  async function save(values: Record<string, any>) {
    const err = cfg.validate?.(values);
    if (err) { toast("error", err); return false; }
    const payload: Record<string, any> = {};
    cfg.fields.forEach((f) => { const v = values[f.key]; payload[f.key] = v === "" || v === undefined ? null : f.type === "number" ? Number(v) : typeof v === "string" ? v.trim() : v; });
    const res = values.id ? await supabase.from(cfg.table).update(payload).eq("id", values.id).eq("org_id", orgId) : await supabase.from(cfg.table).insert({ ...payload, org_id: orgId });
    if (res.error) { toast("error", res.error.message); return false; }
    toast("success", `${cfg.singular} ${values.id ? "updated" : "created"}.`);
    await load(); return true;
  }
  async function remove(r: any) {
    const { error } = await supabase.from(cfg.table).delete().eq("id", r.id).eq("org_id", orgId);
    setDel(null);
    if (error) toast("error", error.message); else { toast("success", `${cfg.singular} deleted. The deletion is recorded in the audit log.`); load(); }
  }
  const blank = () => Object.fromEntries(cfg.fields.map((f) => [f.key, f.default ?? ""]));
  const plural = cfg.plural || cfg.singular + "s";

  return (
    <div>
      {cfg.header}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative w-full sm:max-w-xs"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="input pl-9" placeholder={`Search ${plural.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></div>
          {cfg.filter && <select className="input w-auto" value={flt} onChange={(e) => setFlt(e.target.value)} aria-label={cfg.filter.label}><option value="">All {cfg.filter.label.toLowerCase()}</option>{cfg.filter.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" disabled={!rows.length} onClick={() => download(`${cfg.table}.csv`, toCsv(rows))}><Download size={16} />Export CSV</button>
          {cfg.csv && canWrite && <button className="btn-secondary" onClick={() => setShowCsv(true)}><Upload size={16} />Import CSV</button>}
          {canWrite && <button className="btn-primary" onClick={() => setEdit(blank())}><Plus size={16} />Add {cfg.singular.toLowerCase()}</button>}
        </div>
      </div>
      {error && <Notice kind="error">Could not load {plural.toLowerCase()}: {error}. Check that <code>supabase/schema.sql</code> has been applied.</Notice>}
      {loading ? <Spinner /> : !shown.length && !error ? (
        <EmptyState title={rows.length ? "No matching records" : `No ${plural.toLowerCase()} yet`} text={rows.length ? "Try a different search or filter." : cfg.description || `Add your first ${cfg.singular.toLowerCase()} to get started.`} action={!rows.length && canWrite ? <button className="btn-primary" onClick={() => setEdit(blank())}><Plus size={16} />Add {cfg.singular.toLowerCase()}</button> : undefined} />
      ) : !error && (
        <Table head={[...cols.map((c) => c.label), "Actions"]}>
          {shown.map((r) => (
            <tr key={r.id} className="hover:bg-offwhite/70">
              {cols.map((c) => <td key={c.key} className="td">{cell(c, r)}</td>)}
              <td className="td"><div className="flex items-center gap-1">
                {cfg.rowActions?.(r, load)}
                {canWrite && <button className="rounded p-1.5 text-forest hover:bg-mint" onClick={() => setEdit({ ...r })} aria-label={`Edit ${cfg.singular}`}><Pencil size={16} /></button>}
                {canWrite && cfg.deletable !== false && <button className="rounded p-1.5 text-danger hover:bg-danger/10" onClick={() => setDel(r)} aria-label={`Delete ${cfg.singular}`}><Trash2 size={16} /></button>}
              </div></td>
            </tr>
          ))}
        </Table>
      )}
      {edit && <FormModal cfg={cfg} refs={refs} initial={edit} onClose={() => setEdit(null)} onSave={async (v) => { if (await save(v)) setEdit(null); }} />}
      {del && <Confirm danger title={`Delete ${cfg.singular.toLowerCase()}`} text="This permanently removes the record. The deletion is written to the audit log. Linked records keep existing but lose this link." confirmLabel="Delete" onConfirm={() => remove(del)} onCancel={() => setDel(null)} />}
      {showCsv && <CsvImport cfg={cfg} refs={refs} existing={rows} onClose={() => setShowCsv(false)} onDone={() => { setShowCsv(false); load(); }} />}
    </div>
  );
}

function FormModal({ cfg, refs, initial, onClose, onSave }: { cfg: ResourceConfig; refs: Record<string, { id: string; name: string }[]>; initial: Record<string, any>; onClose: () => void; onSave: (v: Record<string, any>) => Promise<void> }) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const m = cfg.fields.filter((f) => f.required && (v[f.key] === "" || v[f.key] == null)).map((f) => f.key);
    setMissing(m); if (m.length) return;
    setBusy(true); await onSave(v); setBusy(false);
  }
  return (
    <Modal title={`${v.id ? "Edit" : "Add"} ${cfg.singular.toLowerCase()}`} onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          {cfg.fields.map((f) => (
            <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
              <label className="label" htmlFor={`f-${f.key}`}>{f.label}{f.required && <span className="text-danger"> *</span>}</label>
              {f.type === "textarea" ? <textarea id={`f-${f.key}`} rows={3} className="input" value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
                : f.type === "select" ? <select id={`f-${f.key}`} className="input" value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}>{!f.required && <option value="">Not set</option>}{f.options!.map(([o, l]) => <option key={o} value={o}>{l}</option>)}</select>
                : f.type === "ref" ? <select id={`f-${f.key}`} className="input" value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}><option value="">Not set</option>{(refs[f.ref!] || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
                : <input id={`f-${f.key}`} className="input" type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : "text"} step={f.step || (f.type === "number" ? "any" : undefined)} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />}
              {f.hint && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
              {missing.includes(f.key) && <p className="mt-1 text-xs text-danger">{f.label} is required.</p>}
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? "Saving" : "Save"}</button></div>
      </form>
    </Modal>
  );
}

function CsvImport({ cfg, refs, existing, onClose, onDone }: { cfg: ResourceConfig; refs: Record<string, { id: string; name: string }[]>; existing: any[]; onClose: () => void; onDone: () => void }) {
  const { supabase, orgId } = useApp();
  const toast = useToast();
  const [parsed, setParsed] = useState<{ n: number; payload: Record<string, any>; errors: string[] }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileErr, setFileErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const iso = /^\d{4}-\d{2}-\d{2}$/;

  function template() { download(`${cfg.table}_template.csv`, cfg.fields.map((f) => f.key).join(",") + "\n"); }

  async function onFile(file: File) {
    setFileErr(""); setParsed(null);
    if (file.size > 5_000_000) { setFileErr("File is larger than 5 MB."); return; }
    const rows = parseCsv(await file.text());
    if (rows.length < 2) { setFileErr("The file has no data rows."); return; }
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (f: Field) => { let i = header.indexOf(f.key.toLowerCase()); if (i < 0) i = header.indexOf(f.label.toLowerCase()); return i; };
    const map = cfg.fields.map((f) => [f, idx(f)] as const);
    const unknown = cfg.fields.filter((f) => f.required && idx(f) < 0);
    if (unknown.length) { setFileErr(`Missing required column: ${unknown.map((f) => f.key).join(", ")}.`); return; }
    const seen = new Set<string>();
    const existingKeys = new Set(existing.map((e) => (cfg.dupKeys || []).map((k) => String(e[k] ?? "").toLowerCase()).join("|")));
    const out = rows.slice(1).map((r, i) => {
      const payload: Record<string, any> = {}; const errors: string[] = [];
      for (const [f, ci] of map) {
        const raw = ci >= 0 ? (r[ci] ?? "").trim() : "";
        if (raw === "") { if (f.required) errors.push(`${f.label} is required`); payload[f.key] = f.default && f.required ? f.default : null; continue; }
        if (f.type === "number") { const n = Number(raw.replace(/,/g, "")); if (Number.isNaN(n)) errors.push(`${f.label} is not a number`); else payload[f.key] = n; }
        else if (f.type === "date") { if (!iso.test(raw) || Number.isNaN(Date.parse(raw))) errors.push(`${f.label} must be a date as YYYY-MM-DD`); else payload[f.key] = raw; }
        else if (f.type === "select") { const o = f.options!.find(([v, l]) => v === raw.toLowerCase() || l.toLowerCase() === raw.toLowerCase()); if (!o) errors.push(`${f.label} must be one of: ${f.options!.map((x) => x[0]).join(", ")}`); else payload[f.key] = o[0]; }
        else if (f.type === "ref") { const o = (refs[f.ref!] || []).find((x) => x.name.toLowerCase() === raw.toLowerCase() || x.id === raw); if (!o) errors.push(`${f.label} "${raw}" does not exist. Create it first`); else payload[f.key] = o.id; }
        else payload[f.key] = raw;
      }
      if (cfg.dupKeys) {
        const k = cfg.dupKeys.map((x) => String(payload[x] ?? "").toLowerCase()).join("|");
        if (existingKeys.has(k)) errors.push("Duplicate of an existing record"); else if (seen.has(k)) errors.push("Duplicate within this file");
        seen.add(k);
      }
      const e = cfg.validate?.(payload); if (e) errors.push(e);
      return { n: i + 2, payload, errors };
    });
    setParsed(out);
  }
  const good = parsed?.filter((p) => !p.errors.length) || [];
  async function run() {
    setBusy(true);
    const { error } = await supabase.from(cfg.table).insert(good.map((g) => ({ ...g.payload, org_id: orgId })));
    setBusy(false);
    if (error) { toast("error", error.message); return; }
    toast("success", `${good.length} ${cfg.singular.toLowerCase()} record(s) imported.`); onDone();
  }
  return (
    <Modal title={`Import ${cfg.plural || cfg.singular + "s"} from CSV`} onClose={onClose} wide>
      <p className="text-sm text-muted">Columns are matched by field name or label. Dates use YYYY-MM-DD. Linked records are matched by name and must already exist. Rows with errors are skipped, nothing is changed silently.</p>
      <div className="mt-3 flex flex-wrap gap-2"><button className="btn-secondary" onClick={template}><Download size={16} />Download template</button><button className="btn-primary" onClick={() => input.current?.click()}><Upload size={16} />Choose CSV file</button>
        <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /></div>
      {fileErr && <div className="mt-3"><Notice kind="error">{fileErr}</Notice></div>}
      {parsed && (
        <div className="mt-4">
          <div className="mb-2 text-sm"><strong>{good.length}</strong> valid, <strong>{parsed.length - good.length}</strong> with errors</div>
          <div className="max-h-64 overflow-auto rounded-xl border border-line">
            <table className="w-full text-sm"><tbody className="divide-y divide-line">{parsed.map((p) => (<tr key={p.n}><td className="td w-16 text-muted">Row {p.n}</td><td className="td">{p.errors.length ? <span className="text-danger">{p.errors.join("; ")}</span> : <span className="text-success">Valid</span>}</td></tr>))}</tbody></table>
          </div>
          <div className="mt-4 flex justify-end gap-2"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={!good.length || busy} onClick={run}>{busy ? "Importing" : `Import ${good.length} valid row(s)`}</button></div>
        </div>
      )}
    </Modal>
  );
}
