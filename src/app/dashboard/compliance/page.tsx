"use client";
import { useMemo, useState } from "react";
import { PageHeader, Tabs, Notice, Spinner, Stat, Status, Table, EmptyState, useToast } from "@/components/dash/ui";
import { ResourceManager } from "@/components/dash/ResourceManager";
import { useApp } from "@/components/dash/AppContext";
import { useComplianceData } from "@/lib/hooks";
import { analyze, readiness } from "@/lib/quality";
import { tasksCfg, periodsCfg, classCfg, countryOpts } from "@/lib/modules";
import { fmtDate, fmtNum } from "@/lib/format";
import { CheckCircle2, Circle } from "lucide-react";

export default function Page() {
  const [tab, setTab] = useState("monitor");
  return (
    <>
      <PageHeader title="Compliance Monitoring" desc="Readiness is calculated from completed requirements in your records, not from an arbitrary score." />
      <Tabs value={tab} onChange={setTab} tabs={[["monitor", "Monitoring"], ["quality", "Data validation"], ["tasks", "Tasks"], ["deadlines", "Reporting periods"], ["authorization", "Authorization"], ["classification", "Classification list"]]} />
      {tab === "monitor" && <Monitor />}
      {tab === "quality" && <Quality />}
      {tab === "tasks" && <ResourceManager cfg={tasksCfg} />}
      {tab === "deadlines" && <ResourceManager cfg={periodsCfg} />}
      {tab === "authorization" && <Authorization />}
      {tab === "classification" && <ResourceManager cfg={classCfg} />}
    </>
  );
}

function Monitor() {
  const { data, error } = useComplianceData();
  const [thr, setThr] = useState("50");
  const issues = useMemo(() => (data ? analyze(data) : []), [data]);
  const reqs = useMemo(() => (data ? readiness(data, issues) : []), [data, issues]);
  if (error) return <Notice kind="error">Could not load data: {error}</Notice>;
  if (!data) return <Spinner />;
  const today = new Date().toISOString().slice(0, 10);
  const in30 = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const done = reqs.filter((r) => r.done).length;
  const alerts: { tone: "warn" | "error"; text: string }[] = [];
  data.submissions.filter((s) => ["requested", "correction_requested"].includes(s.status) && s.deadline && s.deadline < today).forEach((s) => alerts.push({ tone: "error", text: `Supplier request overdue since ${fmtDate(s.deadline)}` }));
  data.tasks.filter((t) => t.status !== "done" && t.due_date && t.due_date <= in30(14)).forEach((t) => alerts.push({ tone: t.due_date < today ? "error" : "warn", text: `Task "${t.title}" ${t.due_date < today ? "was due" : "is due"} ${fmtDate(t.due_date)}` }));
  data.periods.filter((p) => p.status === "open" && p.declaration_due && p.declaration_due <= in30(60)).forEach((p) => alerts.push({ tone: p.declaration_due < today ? "error" : "warn", text: `Declaration for ${p.label} ${p.declaration_due < today ? "was due" : "is due"} ${fmtDate(p.declaration_due)}` }));
  // Indicative threshold tally by period, excluding electricity and hydrogen
  const tally = data.periods.map((p) => ({ p, t: data.imports.filter((i) => i.reporting_period_id === p.id && i.unit === "tonne" && !["electricity", "hydrogen"].includes(data.products.find((x) => x.id === i.product_id)?.category)).reduce((a, i) => a + Number(i.quantity || 0), 0) }));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Outstanding supplier submissions" value={data.submissions.filter((s) => ["requested", "correction_requested"].includes(s.status)).length} tone="warn" />
        <Stat label="Missing documentation flags" value={issues.filter((i) => i.category === "Missing supporting documents").length} tone="warn" />
        <Stat label="Products requiring review" value={data.products.filter((p) => p.scope_status === "needs_review").length} tone="warn" />
        <Stat label="Unverified emissions records" value={data.records.filter((r) => r.status !== "verified").length} tone="warn" />
        <Stat label="Pending internal approvals" value={data.declarations.filter((d) => d.status === "in_review").length} />
        <Stat label="Authorization" value={<span className="text-base">{(data.auth?.status || "not recorded").replace(/_/g, " ")}</span>} />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <div className="flex items-baseline justify-between"><h2 className="text-lg font-bold">Reporting readiness</h2><span className="font-heading text-xl font-extrabold text-forest">{done} of {reqs.length} requirements complete</span></div>
          <div className="mt-3 h-2 rounded-full bg-mint"><div className="h-2 rounded-full bg-emerald" style={{ width: `${(done / reqs.length) * 100}%` }} /></div>
          <ul className="mt-4 divide-y divide-line">{reqs.map((r) => (<li key={r.key} className="flex items-start gap-3 py-2.5 text-sm">{r.done ? <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={18} /> : <Circle className="mt-0.5 shrink-0 text-muted" size={18} />}<div><div className={r.done ? "" : "font-medium"}>{r.label}</div><div className="text-xs text-muted">{r.detail}</div></div></li>))}</ul>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5"><h2 className="text-lg font-bold">Notifications</h2>{!alerts.length ? <p className="mt-2 text-sm text-muted">No upcoming deadlines or overdue items.</p> : <ul className="mt-3 space-y-2">{alerts.map((a, i) => <li key={i} className={`rounded-lg border p-2.5 text-sm ${a.tone === "error" ? "border-danger/40 bg-danger/10" : "border-warn/40 bg-warn/10"}`}>{a.text}</li>)}</ul>}</div>
          <div className="card p-5">
            <h2 className="text-lg font-bold">Mass threshold check (indicative)</h2>
            <p className="mt-1 text-xs text-muted">Sums imported tonnes per reporting period, leaving out electricity and hydrogen. The legal threshold rules and exceptions must be checked against current official sources. This tally does not decide whether an obligation applies.</p>
            <label className="label mt-3">Threshold in tonnes (editable)</label><input className="input" value={thr} onChange={(e) => setThr(e.target.value)} inputMode="decimal" />
            {!tally.length ? <p className="mt-3 text-sm text-muted">Create a reporting period to see totals.</p> : <ul className="mt-3 space-y-1 text-sm">{tally.map(({ p, t }) => <li key={p.id} className="flex justify-between"><span>{p.label}</span><span>{fmtNum(t)} t {Number(thr) > 0 && (t > Number(thr) ? <span className="badge ml-1 bg-warn/15 text-[#8a5a0f]">Above</span> : <span className="badge ml-1 bg-mint text-forest">Below</span>)}</span></li>)}</ul>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Quality() {
  const { data, error } = useComplianceData();
  const [sev, setSev] = useState(""); const [cat, setCat] = useState("");
  const issues = useMemo(() => (data ? analyze(data) : []), [data]);
  if (error) return <Notice kind="error">Could not load data: {error}</Notice>;
  if (!data) return <Spinner />;
  const cats = Array.from(new Set(issues.map((i) => i.category)));
  const shown = issues.filter((i) => (!sev || i.severity === sev) && (!cat || i.category === cat));
  return (
    <div>
      <div className="mb-4"><Notice>Checks run against your records each time this page loads. Flags explain why a record was raised. CBAM AI never changes submitted or approved data on its own: you decide what to fix, and changes are written to the audit log.</Notice></div>
      <div className="mb-4 grid grid-cols-3 gap-3"><Stat label="Errors" value={issues.filter((i) => i.severity === "error").length} tone="bad" /><Stat label="Warnings" value={issues.filter((i) => i.severity === "warning").length} tone="warn" /><Stat label="For human review" value={issues.filter((i) => i.severity === "review").length} /></div>
      <div className="mb-4 flex flex-wrap gap-2"><select className="input w-auto" value={sev} onChange={(e) => setSev(e.target.value)} aria-label="Severity"><option value="">All severities</option><option value="error">Error</option><option value="warning">Warning</option><option value="review">Human review</option></select>
        <select className="input w-auto" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></div>
      {!shown.length ? <EmptyState title={issues.length ? "No matching flags" : "No flags raised"} text={issues.length ? "Change the filters to see other flags." : "No issues were found in the current records. With no data entered, there is nothing to check yet."} /> : (
        <div className="space-y-2">{shown.map((i) => (<div key={i.id} className="card flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`badge ${i.severity === "error" ? "bg-danger/10 text-danger" : i.severity === "warning" ? "bg-warn/15 text-[#8a5a0f]" : "bg-mint text-forest"}`}>{i.severity === "review" ? "Human review" : i.severity === "error" ? "Error" : "Warning"}</span><span className="text-sm font-semibold text-forest">{i.title}</span></div><p className="mt-1 text-sm text-muted">{i.why}</p></div><span className="text-xs text-muted sm:text-right">{i.category}<br />{i.area}</span></div>))}</div>)}
    </div>
  );
}

function Authorization() {
  const { supabase, orgId, canWrite } = useApp();
  const toast = useToast();
  const { data, reload } = useComplianceData();
  const [v, setV] = useState<any | null>(null);
  if (!data) return <Spinner />;
  const rec = v || data.auth || { status: "not_applied" };
  const set = (k: string, val: string) => setV({ ...rec, [k]: val });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (rec.status === "authorised" && (!rec.application_reference || !rec.authority)) return toast("error", "An Authorised status needs an application reference and the relevant authority.");
    const payload = { status: rec.status, application_reference: rec.application_reference || null, authority: rec.authority || null, eori_number: rec.eori_number || null, valid_from: rec.valid_from || null, notes: rec.notes || null };
    const res = rec.id ? await supabase.from("authorization_records").update(payload).eq("id", rec.id).eq("org_id", orgId) : await supabase.from("authorization_records").insert({ ...payload, org_id: orgId });
    if (res.error) return toast("error", res.error.message);
    toast("success", "Authorization record saved."); setV(null); reload();
  }
  return (
    <form onSubmit={save} className="card max-w-2xl space-y-4 p-5">
      <Notice>Record the status of your authorization as an authorised CBAM declarant. This is a record keeping field. CBAM AI does not grant authorization or check it with any authority. Upload supporting documents under Documents.</Notice>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Authorization status</label><select className="input" disabled={!canWrite} value={rec.status} onChange={(e) => set("status", e.target.value)}>{[["not_applied", "Not applied"], ["application_prepared", "Application prepared"], ["applied", "Applied"], ["authorised", "Authorised"], ["rejected", "Rejected"]].map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select></div>
        <div><label className="label">Application reference</label><input className="input" disabled={!canWrite} value={rec.application_reference || ""} onChange={(e) => set("application_reference", e.target.value)} /></div>
        <div><label className="label">Relevant authority</label><input className="input" disabled={!canWrite} value={rec.authority || ""} onChange={(e) => set("authority", e.target.value)} placeholder="Competent authority of the Member State" /></div>
        <div><label className="label">EORI number</label><input className="input" disabled={!canWrite} value={rec.eori_number || ""} onChange={(e) => set("eori_number", e.target.value)} /></div>
        <div><label className="label">Valid from</label><input type="date" className="input" disabled={!canWrite} value={rec.valid_from || ""} onChange={(e) => set("valid_from", e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">Notes</label><textarea rows={3} className="input" disabled={!canWrite} value={rec.notes || ""} onChange={(e) => set("notes", e.target.value)} /></div>
      </div>
      {canWrite && <button className="btn-primary">Save authorization record</button>}
    </form>
  );
}
