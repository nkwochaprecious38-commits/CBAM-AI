"use client";
import { useMemo, useState } from "react";
import { Download, FilePlus2, Send } from "lucide-react";
import { PageHeader, Notice, Spinner, Stat, Status, Table, EmptyState, Modal, Confirm, useToast } from "@/components/dash/ui";
import { useApp } from "@/components/dash/AppContext";
import { useComplianceData } from "@/lib/hooks";
import { analyze, readiness } from "@/lib/quality";
import { buildLines } from "@/lib/report";
import { download, fmtDate, fmtNum, toCsv } from "@/lib/format";
import { CheckCircle2, Circle } from "lucide-react";

export default function Page() {
  const { supabase, orgId, userId, canWrite, canApprove, orgName } = useApp();
  const toast = useToast();
  const { data, error, reload } = useComplianceData();
  const [pid, setPid] = useState("");
  const [view, setView] = useState<any | null>(null);
  const [act, setAct] = useState<{ kind: "submit" | "approve" | "reject"; d: any } | null>(null);
  const [notes, setNotes] = useState("");
  const issues = useMemo(() => (data ? analyze(data) : []), [data]);
  const reqs = useMemo(() => (data ? readiness(data, issues) : []), [data, issues]);
  if (error) return <Notice kind="error">Could not load reporting data: {error}</Notice>;
  if (!data) return <Spinner />;
  const period = data.periods.find((p) => p.id === pid);
  const lines = pid ? buildLines(data, pid) : [];
  const total = lines.reduce((a, l) => a + (l.embedded_tco2e || 0), 0);
  const missing = lines.filter((l) => l.note);

  async function generate() {
    const snapshot = { organization: orgName, reporting_period: { label: period.label, start: period.start_date, end: period.end_date, declaration_due: period.declaration_due, deadline_source: period.deadline_source }, generated_at: new Date().toISOString(), lines, total_embedded_tco2e: total, authorization: data!.auth ? { status: data!.auth.status, reference: data!.auth.application_reference, authority: data!.auth.authority } : null, notice: "Draft prepared with CBAM AI. Not submitted to any official registry. Requires internal approval." };
    const { error } = await supabase.from("cbam_declarations").insert({ org_id: orgId, reporting_period_id: pid, title: `Draft declaration: ${period.label}`, snapshot, readiness: { complete: reqs.filter((r) => r.done).length, total: reqs.length, items: reqs } });
    if (error) return toast("error", error.message);
    toast("success", "Draft generated as a frozen snapshot of current records."); reload();
  }
  async function transition() {
    if (!act) return;
    const now = new Date().toISOString();
    const patch: any = act.kind === "submit" ? { status: "in_review", submitted_by: userId, submitted_at: now } : { status: act.kind === "approve" ? "approved" : "rejected", reviewed_by: userId, reviewed_at: now, review_notes: notes || null };
    if (act.kind === "reject" && !notes.trim()) return toast("error", "Add review notes explaining the rejection.");
    const { error } = await supabase.from("cbam_declarations").update(patch).eq("id", act.d.id).eq("org_id", orgId);
    if (error) return toast("error", error.message);
    toast("success", act.kind === "submit" ? "Submitted for internal approval." : act.kind === "approve" ? "Declaration approved internally." : "Declaration rejected."); setAct(null); setNotes(""); reload();
  }
  const exportJson = (d: any) => download(`${d.title.replace(/\W+/g, "_")}.json`, JSON.stringify({ status: d.status, ...d.snapshot }, null, 2), "application/json");
  const exportCsv = (d: any) => download(`${d.title.replace(/\W+/g, "_")}.csv`, toCsv(d.snapshot.lines || []));

  return (
    <>
      <PageHeader title="CBAM Reporting" desc="Prepare declaration data from your records, review it internally, and export structured information." />
      <div className="mb-5"><Notice kind="warn">CBAM AI prepares and exports reporting information. It does not submit to the official CBAM Registry, because no authorised and verified integration is configured. Final submission is made by an authorised person in the official system.</Notice></div>
      <div className="card mb-6 p-5">
        <label className="label">Reporting period</label>
        <select className="input max-w-md" value={pid} onChange={(e) => setPid(e.target.value)}><option value="">Select a reporting period</option>{data.periods.map((p) => <option key={p.id} value={p.id}>{p.label} ({fmtDate(p.start_date)} to {fmtDate(p.end_date)})</option>)}</select>
        {!data.periods.length && <p className="mt-2 text-sm text-muted">No reporting periods yet. Create one under Compliance Monitoring, Reporting periods.</p>}
      </div>
      {pid && (<>
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Imported goods in period" value={lines.length} /><Stat label="Embedded emissions (tCO2e)" value={fmtNum(total, 3)} sub="Estimate until all records are verified" /><Stat label="Records missing or unusable" value={missing.length} tone={missing.length ? "warn" : undefined} /><Stat label="Declaration due" value={<span className="text-base">{fmtDate(period.declaration_due)}</span>} sub={period.deadline_source || "No source recorded"} /></div>
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h2 className="mb-2 text-lg font-bold">Imported goods and embedded emissions</h2>
            {!lines.length ? <EmptyState title="No imports in this period" text="Assign imports to this reporting period under Imports." /> : (
              <Table head={["Import", "Product", "Origin", "Quantity", "Supplier", "Embedded tCO2e", "Basis", "Check"]}>{lines.map((l, i) => (<tr key={i}><td className="td">{l.import_reference}</td><td className="td">{l.product || "Not set"}<div className="text-xs text-muted">{l.cn_code}</div></td><td className="td">{l.country_of_origin || "Not set"}</td><td className="td">{fmtNum(l.quantity)} {l.unit}</td><td className="td">{l.supplier || "Not set"}</td><td className="td">{l.embedded_tco2e == null ? "Not calculated" : fmtNum(l.embedded_tco2e, 3)}</td><td className="td">{l.basis ? <Status value={l.basis} /> : "None"}{l.data_status && <div className="mt-1"><Status value={l.data_status} /></div>}</td><td className="td text-xs">{l.note ? <span className="text-danger">{l.note}</span> : <span className="text-success">Ready</span>}</td></tr>))}</Table>)}
          </div>
          <div className="lg:col-span-2"><div className="card p-5"><h2 className="text-lg font-bold">Readiness</h2><p className="text-sm text-muted">{reqs.filter((r) => r.done).length} of {reqs.length} requirements complete</p>
            <ul className="mt-3 divide-y divide-line">{reqs.map((r) => <li key={r.key} className="flex gap-2 py-2 text-sm">{r.done ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-success" /> : <Circle size={17} className="mt-0.5 shrink-0 text-muted" />}<span>{r.label}<span className="block text-xs text-muted">{r.detail}</span></span></li>)}</ul></div></div>
        </div>
        {canWrite && <div className="mt-5"><button className="btn-primary" onClick={generate} disabled={!lines.length}><FilePlus2 size={16} />Generate draft report</button></div>}
      </>)}

      <h2 className="mb-3 mt-10 text-xl font-bold">Draft reports and approvals</h2>
      {!data.declarations.length ? <EmptyState title="No drafts yet" text="Select a period and generate a draft. Drafts are frozen snapshots, so later data changes never alter them silently." /> : (
        <Table head={["Title", "Created", "Status", "Embedded tCO2e", "Readiness", "Actions"]}>{data.declarations.sort((a, b) => b.created_at.localeCompare(a.created_at)).map((d) => (
          <tr key={d.id}><td className="td font-medium">{d.title}</td><td className="td">{fmtDate(d.created_at)}</td><td className="td"><Status value={d.status} /></td><td className="td">{fmtNum(d.snapshot?.total_embedded_tco2e, 3)}</td><td className="td">{d.readiness?.complete ?? 0} of {d.readiness?.total ?? 0}</td>
            <td className="td"><div className="flex flex-wrap gap-1"><button className="btn-ghost !py-1" onClick={() => setView(d)}>View</button><button className="rounded p-1.5 hover:bg-mint" aria-label="Export JSON" title="Export JSON" onClick={() => exportJson(d)}><Download size={16} /></button><button className="btn-ghost !py-1" onClick={() => exportCsv(d)}>CSV</button>
              {canWrite && d.status === "draft" && <button className="btn-secondary !py-1" onClick={() => setAct({ kind: "submit", d })}><Send size={14} />Submit for approval</button>}
              {canApprove && d.status === "in_review" && <><button className="btn-primary !py-1" onClick={() => setAct({ kind: "approve", d })}>Approve</button><button className="btn-danger !py-1" onClick={() => setAct({ kind: "reject", d })}>Reject</button></>}</div></td></tr>))}</Table>)}
      {view && <Modal title={view.title} onClose={() => setView(null)} wide><p className="text-sm text-muted">Status: {view.status.replace("_", " ")}. {view.review_notes ? `Review notes: ${view.review_notes}` : ""}</p><pre className="mt-3 max-h-[60vh] overflow-auto rounded-lg bg-offwhite p-3 text-xs">{JSON.stringify(view.snapshot, null, 2)}</pre></Modal>}
      {act && <Modal title={act.kind === "submit" ? "Submit for internal approval" : act.kind === "approve" ? "Approve declaration" : "Reject declaration"} onClose={() => setAct(null)}>
        <p className="text-sm text-muted">{act.kind === "submit" ? "A different person with the Organization Admin or Compliance Manager role must approve this draft." : act.kind === "approve" ? "Approval records that your organization accepts this draft internally. It is not a submission to the official registry, and approved drafts cannot be edited." : "Explain why the draft is rejected."}</p>
        {act.kind !== "submit" && <textarea className="input mt-3" rows={3} placeholder="Review notes" value={notes} onChange={(e) => setNotes(e.target.value)} />}
        <div className="mt-5 flex justify-end gap-2"><button className="btn-secondary" onClick={() => setAct(null)}>Cancel</button><button className={act.kind === "reject" ? "btn-danger" : "btn-primary"} onClick={transition}>Confirm</button></div></Modal>}
    </>
  );
}
