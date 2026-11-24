"use client";
import { useEffect, useState } from "react";
import { Bell, Eye, Link2, Send } from "lucide-react";
import { PageHeader, Tabs, Modal, Notice, Status, Spinner, EmptyState, Table, Stat, useToast, Confirm } from "@/components/dash/ui";
import { ResourceManager, useRefs } from "@/components/dash/ResourceManager";
import { useApp } from "@/components/dash/AppContext";
import { suppliersCfg } from "@/lib/modules";
import { fmtDate, fmtNum } from "@/lib/format";
import { dataFields } from "@/lib/submission";

export default function Page() {
  const { supabase, orgId } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState("suppliers");
  const [invite, setInvite] = useState<any | null>(null);
  const [request, setRequest] = useState<any | null>(null);
  const [tick, setTick] = useState(0);

  const cfg = {
    ...suppliersCfg,
    rowActions: (r: any, reload: () => void) => (
      <>
        <button className="rounded p-1.5 text-forest hover:bg-mint" title="Invite to supplier portal" aria-label="Invite supplier" onClick={() => setInvite({ ...r, reload })}><Link2 size={16} /></button>
        <button className="rounded p-1.5 text-forest hover:bg-mint" title="Request emissions data" aria-label="Request data" onClick={() => setRequest({ supplier_id: r.id })}><Send size={16} /></button>
      </>
    ),
  };

  async function markInvited(s: any) {
    if (s.status === "draft") { await supabase.from("suppliers").update({ status: "invited" }).eq("id", s.id).eq("org_id", orgId); s.reload?.(); }
  }
  const link = invite ? `${typeof window !== "undefined" ? window.location.origin : ""}/signup?supplier_invite=${invite.invite_token}${invite.email ? `&email=${encodeURIComponent(invite.email)}` : ""}` : "";

  return (
    <>
      <PageHeader title="Suppliers" desc="Manage suppliers, invite them to the portal, request emissions data and review what they submit." />
      <Tabs value={tab} onChange={setTab} tabs={[["suppliers", "Suppliers"], ["requests", "Data requests and submissions"]]} />
      {tab === "suppliers" ? <ResourceManager cfg={cfg} /> : <Requests key={tick} onNew={() => setRequest({})} />}
      {invite && (
        <Modal title={`Invite ${invite.name}`} onClose={() => setInvite(null)}>
          <Notice kind="warn">Email delivery is not configured in this deployment, so no email is sent automatically. Copy the link below and send it to the supplier contact yourself.</Notice>
          <label className="label mt-4">Supplier portal invitation link</label>
          <input readOnly className="input" value={link} onFocus={(e) => e.currentTarget.select()} />
          <p className="mt-2 text-xs text-muted">The supplier signs up or logs in through this link and then sees only the data requests addressed to {invite.name}.</p>
          <div className="mt-5 flex justify-end gap-2"><button className="btn-secondary" onClick={() => setInvite(null)}>Close</button>
            <button className="btn-primary" onClick={async () => { await navigator.clipboard.writeText(link).catch(() => {}); await markInvited(invite); toast("success", "Invitation link copied. Supplier marked as invited."); setInvite(null); }}>Copy link</button></div>
        </Modal>
      )}
      {request && <RequestModal initial={request} onClose={() => setRequest(null)} onDone={() => { setRequest(null); setTab("requests"); setTick((t) => t + 1); }} />}
    </>
  );
}

function RequestModal({ initial, onClose, onDone }: { initial: any; onClose: () => void; onDone: () => void }) {
  const { supabase, orgId } = useApp();
  const toast = useToast();
  const refs = useRefs(["suppliers", "products", "production_facilities"]);
  const [v, setV] = useState({ supplier_id: initial.supplier_id || "", product_id: "", facility_id: "", deadline: "", emissions_requested: "Direct emissions, indirect emissions, precursor emissions, production quantity, reporting period, supporting evidence" });
  const [err, setErr] = useState("");
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!v.supplier_id) return setErr("Select a supplier.");
    if (!v.deadline) return setErr("Set a submission deadline.");
    const { error } = await supabase.from("supplier_submissions").insert({ org_id: orgId, supplier_id: v.supplier_id, product_id: v.product_id || null, facility_id: v.facility_id || null, deadline: v.deadline, emissions_requested: v.emissions_requested });
    if (error) return setErr(error.message);
    toast("success", "Data request created. Share the supplier's portal invitation if they have not joined yet."); onDone();
  }
  const sel = (k: "supplier_id" | "product_id" | "facility_id", t: string, l: string) => (
    <div><label className="label">{l}</label><select className="input" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })}><option value="">Not set</option>{(refs[t] || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>);
  return (
    <Modal title="Request emissions data" onClose={onClose}>
      <form onSubmit={go} className="space-y-4">
        {err && <Notice kind="error">{err}</Notice>}
        {sel("supplier_id", "suppliers", "Supplier")}{sel("product_id", "products", "Product")}{sel("facility_id", "production_facilities", "Production facility")}
        <div><label className="label">Submission deadline</label><input type="date" className="input" value={v.deadline} onChange={(e) => setV({ ...v, deadline: e.target.value })} /></div>
        <div><label className="label">Emissions data requested</label><textarea rows={3} className="input" value={v.emissions_requested} onChange={(e) => setV({ ...v, emissions_requested: e.target.value })} /></div>
        <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary">Create request</button></div>
      </form>
    </Modal>
  );
}

function Requests({ onNew }: { onNew: () => void }) {
  const { supabase, orgId, canWrite } = useApp();
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<any | null>(null);
  async function load() {
    setLoading(true);
    const { data } = await supabase.from("supplier_submissions").select("*, suppliers(name), products(name)").eq("org_id", orgId).order("created_at", { ascending: false });
    setRows(data || []); setLoading(false);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (r: any) => ["requested", "correction_requested"].includes(r.status) && r.deadline && r.deadline < today;
  const responded = rows.filter((r) => ["submitted", "approved", "rejected"].includes(r.status)).length;

  async function remind(r: any) {
    const { error } = await supabase.rpc("log_reminder", { p_id: r.id });
    if (error) return toast("error", error.message);
    await supabase.from("notifications").insert({ org_id: orgId, title: `Reminder logged for ${r.suppliers?.name}`, body: "Email delivery is not configured. The supplier was not emailed automatically.", kind: "reminder" });
    toast("success", "Reminder recorded. Email is not configured, so contact the supplier directly."); load();
  }
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Requests" value={rows.length} />
        <Stat label="Response rate" value={rows.length ? `${Math.round((responded / rows.length) * 100)}%` : "No data"} />
        <Stat label="Pending" value={rows.filter((r) => ["requested", "correction_requested"].includes(r.status)).length} tone="warn" />
        <Stat label="Overdue" value={rows.filter(isOverdue).length} tone={rows.some(isOverdue) ? "bad" : undefined} />
      </div>
      <div className="mb-3"><Notice>Automatic reminders need an email sender and a scheduled job, which are not configured here. Overdue requests are flagged below and you can record manual reminders.</Notice></div>
      {canWrite && <div className="mb-4"><button className="btn-primary" onClick={onNew}><Send size={16} />New data request</button></div>}
      {loading ? <Spinner /> : !rows.length ? <EmptyState title="No data requests yet" text="Create a request for a supplier to start collecting emissions data." /> : (
        <Table head={["Supplier", "Product", "Deadline", "Status", "Reminders", "Actions"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="td font-medium">{r.suppliers?.name}</td><td className="td">{r.products?.name || "Not set"}</td>
              <td className="td">{fmtDate(r.deadline)} {isOverdue(r) && <span className="badge ml-1 bg-danger/10 text-danger">Overdue</span>}</td>
              <td className="td"><Status value={r.status} /></td><td className="td">{r.reminder_count}</td>
              <td className="td"><div className="flex gap-1">
                <button className="rounded p-1.5 text-forest hover:bg-mint" aria-label="Review" title="Review" onClick={() => setView(r)}><Eye size={16} /></button>
                {canWrite && ["requested", "correction_requested"].includes(r.status) && <button className="rounded p-1.5 text-forest hover:bg-mint" aria-label="Record reminder" title="Record reminder" onClick={() => remind(r)}><Bell size={16} /></button>}
              </div></td>
            </tr>))}
        </Table>)}
      {view && <ReviewModal r={view} onClose={() => setView(null)} onChanged={() => { setView(null); load(); }} />}
    </div>
  );
}

function ReviewModal({ r, onClose, onChanged }: { r: any; onClose: () => void; onChanged: () => void }) {
  const { supabase, orgId, userId, canWrite } = useApp();
  const toast = useToast();
  const [notes, setNotes] = useState(r.review_notes || "");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const files: { path: string; name: string }[] = r.files || [];
  useEffect(() => { files.forEach(async (f) => { const { data } = await supabase.storage.from("cbam-documents").createSignedUrl(f.path, 600); if (data) setUrls((u) => ({ ...u, [f.path]: data.signedUrl })); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function decide(status: "approved" | "rejected" | "correction_requested") {
    if (status !== "approved" && !notes.trim()) { toast("error", "Add review notes explaining the decision."); return; }
    const { error } = await supabase.from("supplier_submissions").update({ status, review_notes: notes || null, reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq("id", r.id).eq("org_id", orgId);
    if (error) return toast("error", error.message);
    toast("success", `Submission ${status.replace("_", " ")}.`); onChanged();
  }
  async function toRecord() {
    const d = r.data || {};
    const { error } = await supabase.from("emissions_records").insert({
      org_id: orgId, product_id: r.product_id, supplier_id: r.supplier_id, facility_id: r.facility_id, period_start: d.period_start || null, period_end: d.period_end || null,
      direct_emissions: Number(d.direct_emissions) || 0, indirect_emissions: Number(d.indirect_emissions) || 0, precursor_emissions: Number(d.precursor_emissions) || 0,
      production_quantity: d.production_quantity ? Number(d.production_quantity) : null, unit: d.unit || "tonne", value_basis: d.value_basis || "actual",
      status: "pending_verification", source: `Supplier submission ${r.id.slice(0, 8)} (approved by importer)`, submission_id: r.id,
    });
    if (error) return toast("error", error.message);
    toast("success", "Emissions record created with status Pending verification."); setConfirm(null);
  }
  const data = r.data || {};
  return (
    <Modal title={`${r.suppliers?.name}: data request`} onClose={onClose} wide>
      <div className="grid gap-3 text-sm sm:grid-cols-2"><div><span className="text-muted">Status</span><div><Status value={r.status} /></div></div><div><span className="text-muted">Deadline</span><div>{fmtDate(r.deadline)}</div></div>
        <div className="sm:col-span-2"><span className="text-muted">Requested</span><div>{r.emissions_requested || "Not set"}</div></div></div>
      <h3 className="mt-5 text-base font-bold">Submitted data</h3>
      {r.submitted_at ? (
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          {dataFields.map(([k, l]) => <div key={k} className="rounded-lg bg-offwhite p-2"><dt className="text-xs text-muted">{l}</dt><dd className="font-medium">{data[k] !== undefined && data[k] !== "" ? String(data[k]) : "Not provided"}</dd></div>)}
          <div className="rounded-lg bg-offwhite p-2 sm:col-span-2"><dt className="text-xs text-muted">Supplier notes</dt><dd>{r.supplier_notes || "None"}</dd></div>
        </dl>) : <p className="mt-2 text-sm text-muted">Nothing submitted yet.</p>}
      {files.length > 0 && <div className="mt-3 text-sm"><div className="font-semibold">Supporting documents</div>{files.map((f) => <div key={f.path}>{urls[f.path] ? <a className="text-emerald underline" href={urls[f.path]} target="_blank" rel="noreferrer">{f.name}</a> : f.name}</div>)}</div>}
      {canWrite && r.status === "submitted" && (<>
        <label className="label mt-5">Review notes</label><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Required when rejecting or requesting corrections" />
        <div className="mt-4 flex flex-wrap justify-end gap-2"><button className="btn-secondary" onClick={() => decide("correction_requested")}>Request corrections</button><button className="btn-danger" onClick={() => decide("rejected")}>Reject</button><button className="btn-primary" onClick={() => decide("approved")}>Approve</button></div>
      </>)}
      {r.review_notes && r.status !== "submitted" && <p className="mt-4 rounded-lg bg-offwhite p-3 text-sm"><strong>Review notes:</strong> {r.review_notes}</p>}
      {canWrite && r.status === "approved" && <div className="mt-4 flex justify-end"><button className="btn-primary" onClick={() => setConfirm("x")}>Create emissions record from this submission</button></div>}
      {confirm && <Confirm title="Create emissions record" text={`This copies the approved figures (direct ${fmtNum(data.direct_emissions)}, indirect ${fmtNum(data.indirect_emissions)} tCO2e) into Emissions Data with status Pending verification. Supplier data is not altered.`} confirmLabel="Create record" onConfirm={toRecord} onCancel={() => setConfirm(null)} />}
    </Modal>
  );
}
