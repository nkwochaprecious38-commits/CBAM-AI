"use client";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Notice, Spinner, Table, EmptyState, Status, useToast, Confirm } from "@/components/dash/ui";
import { useApp } from "@/components/dash/AppContext";
import { useRows } from "@/lib/hooks";
import { fmtDate, fmtNum, download, toCsv } from "@/lib/format";
import { Trash2 } from "lucide-react";

export default function Page() {
  const { supabase, orgId, userId, canWrite } = useApp();
  const toast = useToast();
  const est = useRows("certificate_estimates", { select: "*, reporting_periods(label)" });
  const periods = useRows("reporting_periods", { order: "start_date" });
  const evidence = useRows("carbon_price_evidence");
  const records = useRows("emissions_records");
  const [v, setV] = useState({ scenario_name: "", reporting_period_id: "", embedded: "", factor: "100", deduction: "0", price: "", basis: "scenario", source: "", price_date: "", currency: "EUR" });
  const [err, setErr] = useState("");
  const [del, setDel] = useState<any | null>(null);
  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));
  const recTotal = useMemo(() => records.rows.reduce((a: number, r: any) => a + Number(r.direct_emissions || 0) + Number(r.indirect_emissions || 0) + Number(r.precursor_emissions || 0), 0), [records.rows]);
  const validated = useMemo(() => evidence.rows.filter((e: any) => e.validation_status === "validated").reduce((a: number, e: any) => a + Number(e.emissions_covered_t || 0), 0), [evidence.rows]);
  const emb = Number(v.embedded), fac = Number(v.factor), ded = Number(v.deduction), price = Number(v.price);
  const certs = Math.max(0, emb * (fac / 100) - ded);
  const cost = certs * price;
  const valid = v.embedded !== "" && !Number.isNaN(emb) && emb >= 0 && v.price !== "" && price >= 0;

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!v.scenario_name.trim()) return setErr("Name the scenario.");
    if (!valid) return setErr("Enter embedded emissions and a price of zero or more.");
    if (fac < 0 || fac > 100 || Number.isNaN(fac)) return setErr("The adjustment factor must be between 0 and 100 percent.");
    if (ded < 0 || Number.isNaN(ded)) return setErr("The deduction must be zero or more.");
    if (v.basis === "official_reference" && (!v.source.trim() || !v.price_date)) return setErr("An official reference price needs its source and date. Otherwise mark it as a scenario price.");
    const { error } = await supabase.from("certificate_estimates").insert({ org_id: orgId, scenario_name: v.scenario_name.trim(), reporting_period_id: v.reporting_period_id || null, embedded_emissions_t: emb, adjustment_factor_pct: fac, deduction_t: ded, price_per_t: price, price_basis: v.basis, price_source: v.source || null, price_date: v.price_date || null, certificates_required: certs, estimated_cost: cost, currency: v.currency, created_by: userId });
    if (error) return setErr(error.message);
    toast("success", "Estimate saved. It remains an estimate, not a confirmed obligation."); est.reload();
  }
  const chart = est.rows.slice(0, 8).reverse().map((r: any) => ({ name: r.scenario_name, "Estimated cost": Number(r.estimated_cost), "Certificates": Number(r.certificates_required) }));
  return (
    <>
      <PageHeader title="Certificate Planning" desc="Model potential certificate requirements and cost under named scenarios. Everything here is an estimate." />
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Notice kind="warn"><strong>Estimates only.</strong> Results are planning figures, not confirmed liabilities or official calculations.</Notice>
        <Notice><strong>No prices are preloaded.</strong> Enter an EU ETS linked reference price from an official source, with its date. Otherwise label it a scenario price.</Notice>
        <Notice><strong>Confirmed obligations</strong> arise through the official process. CBAM AI does not record or calculate them.</Notice>
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={save} className="card space-y-4 p-5 lg:col-span-3" noValidate>
          <h2 className="text-lg font-bold">New estimate</h2>
          {err && <Notice kind="error">{err}</Notice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Scenario name</label><input className="input" value={v.scenario_name} onChange={(e) => set("scenario_name", e.target.value)} /></div>
            <div><label className="label">Reporting period</label><select className="input" value={v.reporting_period_id} onChange={(e) => set("reporting_period_id", e.target.value)}><option value="">Not linked</option>{periods.rows.map((p: any) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
            <div><label className="label">Embedded emissions (tCO2e)</label><input className="input" inputMode="decimal" value={v.embedded} onChange={(e) => set("embedded", e.target.value)} /><button type="button" className="mt-1 text-xs font-semibold text-emerald" onClick={() => set("embedded", String(recTotal))}>Use total of emissions records: {fmtNum(recTotal, 2)}</button></div>
            <div><label className="label">Adjustment factor (percent)</label><input className="input" inputMode="decimal" value={v.factor} onChange={(e) => set("factor", e.target.value)} /><p className="mt-1 text-xs text-muted">Reflects any applicable free allocation adjustment. Confirm the right value in current rules. 100 means no adjustment.</p></div>
            <div><label className="label">Carbon price deduction (tCO2e equivalent)</label><input className="input" inputMode="decimal" value={v.deduction} onChange={(e) => set("deduction", e.target.value)} /><button type="button" className="mt-1 text-xs font-semibold text-emerald" onClick={() => set("deduction", String(validated))}>Use validated evidence: {fmtNum(validated, 2)} tCO2e covered</button><p className="mt-1 text-xs text-muted">Only validated evidence should be used. Check the conversion against the rules.</p></div>
            <div><label className="label">Price per tonne ({v.currency})</label><input className="input" inputMode="decimal" value={v.price} onChange={(e) => set("price", e.target.value)} /></div>
            <div><label className="label">Price basis</label><select className="input" value={v.basis} onChange={(e) => set("basis", e.target.value)}><option value="scenario">Scenario price (my assumption)</option><option value="official_reference">Official reference price</option></select></div>
            <div><label className="label">Price source{v.basis === "official_reference" ? " (required)" : ""}</label><input className="input" value={v.source} onChange={(e) => set("source", e.target.value)} /></div>
            <div><label className="label">Price date{v.basis === "official_reference" ? " (required)" : ""}</label><input type="date" className="input" value={v.price_date} onChange={(e) => set("price_date", e.target.value)} /></div>
          </div>
          <div className="rounded-xl bg-mint p-4 text-sm"><div className="text-xs font-semibold uppercase tracking-wide text-muted">Estimate preview</div>
            <div className="mt-1 grid grid-cols-2 gap-3"><div>Certificates: <strong className="font-heading text-lg">{valid ? fmtNum(certs, 3) : "Not calculated"}</strong></div><div>Cost: <strong className="font-heading text-lg">{valid ? `${fmtNum(cost, 2)} ${v.currency}` : "Not calculated"}</strong></div></div>
            <p className="mt-2 text-xs text-muted">Planning formula: (embedded emissions x adjustment factor) minus deduction, multiplied by price. It is not a legal calculation.</p></div>
          {canWrite && <button className="btn-primary">Save estimate</button>}
        </form>
        <div className="card p-5 lg:col-span-2"><h2 className="text-lg font-bold">Scenario comparison</h2>
          {!chart.length ? <p className="mt-2 text-sm text-muted">Save two or more estimates to compare them.</p> : <div className="mt-3 h-64"><ResponsiveContainer><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#E0E7E2" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="Estimated cost" fill="#27866D" /><Bar dataKey="Certificates" fill="#A8C8B5" /></BarChart></ResponsiveContainer></div>}</div>
      </div>
      <h2 className="mb-3 mt-10 text-xl font-bold">Saved estimates and history</h2>
      {est.loading ? <Spinner /> : !est.rows.length ? <EmptyState title="No estimates yet" /> : (<>
        <Table head={["Scenario", "Period", "Embedded tCO2e", "Certificates", "Price", "Estimated cost", "Created", ""]}>{est.rows.map((r: any) => (<tr key={r.id}><td className="td font-medium">{r.scenario_name} <span className="badge ml-1 bg-warn/15 text-[#8a5a0f]">Estimate</span></td><td className="td">{r.reporting_periods?.label || "Not linked"}</td><td className="td">{fmtNum(r.embedded_emissions_t, 2)}</td><td className="td">{fmtNum(r.certificates_required, 3)}</td><td className="td">{fmtNum(r.price_per_t)} {r.currency}<div className="text-xs text-muted">{r.price_basis === "official_reference" ? `Official: ${r.price_source}, ${fmtDate(r.price_date)}` : "Scenario price"}</div></td><td className="td">{fmtNum(r.estimated_cost, 2)} {r.currency}</td><td className="td">{fmtDate(r.created_at)}</td><td className="td">{canWrite && <button className="rounded p-1.5 text-danger hover:bg-danger/10" aria-label="Delete estimate" onClick={() => setDel(r)}><Trash2 size={16} /></button>}</td></tr>))}</Table>
        <button className="btn-secondary mt-3" onClick={() => download("certificate_estimates.csv", toCsv(est.rows.map((r: any) => ({ scenario: r.scenario_name, period: r.reporting_periods?.label, embedded_tco2e: r.embedded_emissions_t, adjustment_pct: r.adjustment_factor_pct, deduction_t: r.deduction_t, price: r.price_per_t, price_basis: r.price_basis, price_source: r.price_source, price_date: r.price_date, certificates: r.certificates_required, cost: r.estimated_cost, currency: r.currency, status: "estimate" }))))}>Export CSV</button></>)}
      {del && <Confirm danger title="Delete estimate" text="Delete this saved estimate? This is recorded in the audit log." confirmLabel="Delete" onConfirm={async () => { const { error } = await supabase.from("certificate_estimates").delete().eq("id", del.id).eq("org_id", orgId); setDel(null); if (error) toast("error", error.message); else est.reload(); }} onCancel={() => setDel(null)} />}
    </>
  );
}
