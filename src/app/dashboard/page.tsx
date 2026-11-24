"use client";
import Link from "next/link";
import { useMemo } from "react";
import { PageHeader, Notice, Spinner, Stat, DemoBadge, Status } from "@/components/dash/ui";
import { useComplianceData, useRows } from "@/lib/hooks";
import { analyze, readiness } from "@/lib/quality";
import { fmtDate, fmtNum } from "@/lib/format";

const tot = (r: any) => Number(r.direct_emissions || 0) + Number(r.indirect_emissions || 0) + Number(r.precursor_emissions || 0);
export default function Page() {
  const { data, error } = useComplianceData();
  const est = useRows("certificate_estimates", { limit: 1 });
  const m = useMemo(() => {
    if (!data) return null;
    const issues = analyze(data); const reqs = readiness(data, issues);
    const resp = data.submissions.filter((s) => ["submitted", "approved", "rejected"].includes(s.status)).length;
    const today = new Date().toISOString().slice(0, 10);
    return {
      imports: data.imports.length, emissions: data.records.reduce((a, r) => a + tot(r), 0), qty: data.imports.filter((i) => i.unit === "tonne").reduce((a, i) => a + Number(i.quantity || 0), 0),
      rate: data.submissions.length ? Math.round((resp / data.submissions.length) * 100) : null,
      pending: data.submissions.filter((s) => ["requested", "correction_requested"].includes(s.status)).length,
      review: data.products.filter((p) => p.scope_status === "needs_review").length + data.records.filter((r) => r.status === "needs_review").length,
      docs: issues.filter((i) => i.category === "Missing supporting documents").length, done: reqs.filter((r) => r.done).length, total: reqs.length,
      deadlines: data.periods.filter((p) => p.declaration_due && p.declaration_due >= today && p.status === "open").sort((a, b) => a.declaration_due.localeCompare(b.declaration_due)).slice(0, 4),
      empty: !data.imports.length && !data.products.length && !data.records.length && !data.suppliers.length,
    };
  }, [data]);
  if (error) return <Notice kind="error">Could not load your workspace data: {error}. Make sure <code>supabase/schema.sql</code> has been applied.</Notice>;
  if (!data || !m) return <Spinner />;
  const demo = m.empty;
  const e = est.rows[0];
  const v = demo ? { imports: "412", emissions: "36,980 tCO2e", qty: "18,420 t", rate: "72%", pending: "15", review: "9", docs: "14", ready: "9 of 14", cert: "Sample only", deadlines: [["Sample: supplier submissions close", "Sample date"], ["Sample: draft declaration review", "Sample date"]] }
    : { imports: String(m.imports), emissions: `${fmtNum(m.emissions)} tCO2e`, qty: `${fmtNum(m.qty)} t`, rate: m.rate === null ? "No data" : `${m.rate}%`, pending: String(m.pending), review: String(m.review), docs: String(m.docs), ready: `${m.done} of ${m.total}`, cert: e ? `${fmtNum(e.certificates_required, 2)} (estimate)` : "No estimate saved", deadlines: m.deadlines.map((p: any) => [`Declaration: ${p.label}`, fmtDate(p.declaration_due)]) };
  return (
    <>
      <PageHeader title="Overview" desc="Your CBAM workload at a glance." actions={demo && <DemoBadge />} />
      {demo && <div className="mb-5"><Notice kind="warn"><strong>Demonstration data.</strong> The figures below are samples so you can see the layout. Add suppliers, products, imports and emissions records, and this page switches to your own data. <Link href="/dashboard/imports" className="font-semibold underline">Add imports</Link> or <Link href="/dashboard/suppliers" className="font-semibold underline">add suppliers</Link>.</Notice></div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Total imports tracked" value={v.imports} /><Stat label="Total embedded emissions" value={<span className="text-xl">{v.emissions}</span>} sub={demo ? "Sample" : "Includes unverified records"} /><Stat label="Imported product quantity" value={<span className="text-xl">{v.qty}</span>} />
        <Stat label="Supplier response rate" value={v.rate} /><Stat label="Pending supplier submissions" value={v.pending} tone="warn" />
        <Stat label="Products requiring review" value={v.review} tone="warn" /><Stat label="Missing documentation flags" value={v.docs} tone="warn" /><Stat label="Reporting readiness" value={<span className="text-xl">{v.ready}</span>} sub="requirements complete" /><Stat label="Estimated certificate requirements" value={<span className="text-lg">{v.cert}</span>} sub="Estimate, not an obligation" /><Stat label="Upcoming deadlines" value={v.deadlines.length} />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="card p-5"><h2 className="text-lg font-bold">Upcoming compliance deadlines</h2>{!v.deadlines.length ? <p className="mt-2 text-sm text-muted">No upcoming deadlines. Add reporting periods with deadlines under Compliance Monitoring.</p> : <ul className="mt-3 divide-y divide-line">{v.deadlines.map(([a, b]: any) => <li key={a} className="flex justify-between py-2.5 text-sm"><span>{a}</span><span className="font-semibold text-forest">{b}</span></li>)}</ul>}</div>
        <div className="card p-5"><h2 className="text-lg font-bold">Where to start</h2><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm"><li><Link className="text-emerald underline" href="/dashboard/suppliers">Add suppliers</Link> and invite them to the portal.</li><li><Link className="text-emerald underline" href="/dashboard/products">Add products</Link> with CN codes.</li><li><Link className="text-emerald underline" href="/dashboard/imports">Record imports</Link> or upload a CSV.</li><li><Link className="text-emerald underline" href="/dashboard/emissions">Add emissions factors and methodologies</Link>, then calculate.</li><li><Link className="text-emerald underline" href="/dashboard/reporting">Prepare a draft report</Link> and send it for internal approval.</li></ol></div>
      </div>
      <p className="mt-6 text-xs text-muted">CBAM AI supports compliance preparation. It does not replace legal advice, accredited verification, customs representation or official regulatory approval.</p>
    </>
  );
}
