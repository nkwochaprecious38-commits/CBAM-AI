"use client";
import { useState } from "react";
import { CheckCheck, ExternalLink } from "lucide-react";
import { PageHeader, Tabs, Notice, Table, Status, Spinner, EmptyState, useToast } from "@/components/dash/ui";
import { ResourceManager } from "@/components/dash/ResourceManager";
import { useApp } from "@/components/dash/AppContext";
import { useRows } from "@/lib/hooks";
import { sourcesCfg, updatesCfg } from "@/lib/modules";
import { fmtDate } from "@/lib/format";

export default function Page() {
  const { supabase, orgId, userId, canWrite } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState("sources");
  const periods = useRows("reporting_periods", { order: "declaration_due", asc: true });
  const factors = useRows("emissions_factors");
  const methods = useRows("methodologies");
  const cfg = {
    ...sourcesCfg,
    rowActions: (r: any, reload: () => void) => (<>
      <a className="rounded p-1.5 text-forest hover:bg-mint" href={r.url} target="_blank" rel="noopener noreferrer" aria-label="Open original source" title="Open original source"><ExternalLink size={16} /></a>
      {canWrite && <button className="rounded p-1.5 text-forest hover:bg-mint" title="Mark as reviewed today" aria-label="Mark reviewed" onClick={async () => { const { error } = await supabase.from("regulatory_sources").update({ verification_status: "verified", last_reviewed_at: new Date().toISOString().slice(0, 10), reviewed_by: userId }).eq("id", r.id).eq("org_id", orgId); if (error) toast("error", error.message); else { toast("success", "Marked as reviewed today."); reload(); } }}><CheckCheck size={16} /></button>}
    </>),
  };
  return (
    <>
      <PageHeader title="Regulatory Intelligence" desc="Official sources, guidance and changes, with verification status and review dates." />
      <div className="mb-5 space-y-3">
        <Notice>The definitive CBAM regime applies from 1 January 2026, and the first annual declaration for 2026 imports falls due in 2027 under the applicable rules. Confirm every date and rule against the original sources below. Guidance written for the transitional period must not be treated as current definitive regime guidance.</Notice>
        <Notice kind="warn">Entries are seeded as &quot;Requires verification&quot;. CBAM AI does not fetch or interpret official text automatically. A person reviews each source, then marks it reviewed.</Notice>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[["sources", "Official sources"], ["updates", "Updates and change history"], ["deadlines", "Deadlines"], ["methods", "Methodologies and factors"]]} />
      {tab === "sources" && <ResourceManager cfg={cfg} />}
      {tab === "updates" && <ResourceManager cfg={updatesCfg} />}
      {tab === "deadlines" && (periods.loading ? <Spinner /> : !periods.rows.length ? <EmptyState title="No deadlines recorded" text="Deadlines are stored on reporting periods with their source. Add them under Compliance Monitoring." /> : (
        <Table head={["Reporting period", "Declaration due", "Deadline source", "Status"]}>{periods.rows.map((p: any) => <tr key={p.id}><td className="td font-medium">{p.label}</td><td className="td">{fmtDate(p.declaration_due)}</td><td className="td">{p.deadline_source || <span className="text-danger">No source recorded: verify</span>}</td><td className="td"><Status value={p.status} /></td></tr>)}</Table>))}
      {tab === "methods" && (<div className="space-y-6">
        <div><h2 className="mb-2 text-lg font-bold">Methodology records</h2>{!methods.rows.length ? <EmptyState title="No methodologies yet" /> : <Table head={["Name", "Version", "Basis", "Source reference", "Status"]}>{methods.rows.map((m: any) => <tr key={m.id}><td className="td font-medium">{m.name}</td><td className="td">{m.version}</td><td className="td"><Status value={m.method_type} /></td><td className="td">{m.source_reference || "Not set"}</td><td className="td"><Status value={m.status} /></td></tr>)}</Table>}</div>
        <div><h2 className="mb-2 text-lg font-bold">Emissions factors</h2>{!factors.rows.length ? <EmptyState title="No factors yet" /> : <Table head={["Name", "Value", "Source", "Valid from", "Valid to", "Status"]}>{factors.rows.map((m: any) => <tr key={m.id}><td className="td font-medium">{m.name}</td><td className="td">{m.value} {m.unit}</td><td className="td">{m.source}</td><td className="td">{fmtDate(m.valid_from)}</td><td className="td">{fmtDate(m.valid_to)}</td><td className="td"><Status value={m.status} /></td></tr>)}</Table>}</div></div>)}
    </>
  );
}
