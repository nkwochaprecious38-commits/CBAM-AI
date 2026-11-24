"use client";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Notice, Spinner, Stat } from "@/components/dash/ui";
import { useComplianceData } from "@/lib/hooks";
import { analyze, readiness } from "@/lib/quality";
import { fmtNum } from "@/lib/format";

const tot = (r: any) => Number(r.direct_emissions || 0) + Number(r.indirect_emissions || 0) + Number(r.precursor_emissions || 0);
const colors = ["#163D35", "#27866D", "#A8C8B5", "#D99A3E", "#68736D", "#E5F0E9"];
function Chart({ title, data, unit }: { title: string; data: { name: string; value: number }[]; unit: string }) {
  return (<div className="card p-5"><h2 className="text-base font-bold">{title}</h2>{!data.length ? <p className="mt-6 text-sm text-muted">No data yet.</p> : <div className="mt-3 h-60"><ResponsiveContainer><BarChart data={data} layout="vertical" margin={{ left: 10 }}><CartesianGrid strokeDasharray="3 3" stroke="#E0E7E2" horizontal={false} /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => [`${fmtNum(v)} ${unit}`, ""]} /><Bar dataKey="value" fill="#27866D" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>}</div>);
}
export default function Page() {
  const { data, error } = useComplianceData();
  const a = useMemo(() => {
    if (!data) return null;
    const group = (key: (r: any) => string) => { const m = new Map<string, number>(); data.records.forEach((r) => m.set(key(r), (m.get(key(r)) || 0) + tot(r))); return Array.from(m, ([name, value]) => ({ name, value })).sort((x, y) => y.value - x.value).slice(0, 8); };
    const nm = (list: any[], id: string, d = "Unassigned") => list.find((x) => x.id === id)?.name || d;
    const trend = new Map<string, number>(); data.imports.forEach((i) => { if (i.import_date) { const k = i.import_date.slice(0, 7); trend.set(k, (trend.get(k) || 0) + Number(i.quantity || 0)); } });
    const status = ["requested", "submitted", "approved", "rejected", "correction_requested"].map((s) => ({ name: s.replace("_", " "), value: data.submissions.filter((x) => x.status === s).length })).filter((x) => x.value);
    const complete = (f: (p: any) => boolean) => (data.products.length ? Math.round((data.products.filter(f).length / data.products.length) * 100) : 0);
    const have = new Set(data.records.map((r) => r.product_id));
    const issues = analyze(data); const req = readiness(data, issues);
    return {
      byProduct: group((r) => nm(data.products, r.product_id)), bySupplier: group((r) => nm(data.suppliers, r.supplier_id)),
      byCountry: group((r) => { const f = r.facility_id; const s = data.suppliers.find((x) => x.id === r.supplier_id); return s?.country || "Unknown"; }),
      byFacility: group((r) => r.facility_id || "Unassigned"),
      trend: Array.from(trend, ([name, value]) => ({ name, value })).sort((x, y) => x.name.localeCompare(y.name)), status,
      completeness: [{ name: "CN code", value: complete((p) => p.cn_code) }, { name: "Category", value: complete((p) => p.category) }, { name: "Supplier", value: complete((p) => p.supplier_id) }, { name: "Facility", value: complete((p) => p.facility_id) }, { name: "Emissions record", value: complete((p) => have.has(p.id)) }],
      req,
    };
  }, [data]);
  if (error) return <Notice kind="error">Could not load analytics: {error}</Notice>;
  if (!data || !a) return <Spinner />;
  const responded = data.submissions.filter((s) => ["submitted", "approved", "rejected"].includes(s.status)).length;
  return (
    <>
      <PageHeader title="Analytics" desc="Charts are built from your own records. Emissions figures include records that are not yet verified." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Emissions records" value={data.records.length} /><Stat label="Total (tCO2e)" value={fmtNum(data.records.reduce((x, r) => x + tot(r), 0))} /><Stat label="Supplier response rate" value={data.submissions.length ? `${Math.round((responded / data.submissions.length) * 100)}%` : "No data"} /><Stat label="Readiness" value={`${a.req.filter((r) => r.done).length} of ${a.req.length}`} sub="requirements complete" /></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Chart title="Emissions by product (tCO2e)" data={a.byProduct} unit="tCO2e" /><Chart title="Emissions by supplier (tCO2e)" data={a.bySupplier} unit="tCO2e" />
        <Chart title="Emissions by country of supplier (tCO2e)" data={a.byCountry} unit="tCO2e" /><Chart title="Emissions by production facility (tCO2e)" data={a.byFacility.map((x) => ({ ...x, name: data.records.length ? (x.name === "Unassigned" ? x.name : "Facility") : x.name }))} unit="tCO2e" />
        <div className="card p-5"><h2 className="text-base font-bold">Import volume trend (quantity by month)</h2>{!a.trend.length ? <p className="mt-6 text-sm text-muted">No dated imports yet.</p> : <div className="mt-3 h-60"><ResponsiveContainer><LineChart data={a.trend}><CartesianGrid strokeDasharray="3 3" stroke="#E0E7E2" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="value" stroke="#27866D" strokeWidth={2} dot /></LineChart></ResponsiveContainer></div>}</div>
        <div className="card p-5"><h2 className="text-base font-bold">Supplier requests by status</h2>{!a.status.length ? <p className="mt-6 text-sm text-muted">No supplier requests yet.</p> : <div className="mt-3 h-60"><ResponsiveContainer><PieChart><Pie data={a.status} dataKey="value" nameKey="name" outerRadius={85} label>{a.status.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>}</div>
        <div className="card p-5"><h2 className="text-base font-bold">Product data completeness (percent)</h2>{!data.products.length ? <p className="mt-6 text-sm text-muted">No products yet.</p> : <div className="mt-3 h-60"><ResponsiveContainer><BarChart data={a.completeness}><CartesianGrid strokeDasharray="3 3" stroke="#E0E7E2" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#163D35" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>}</div>
        <div className="card p-5"><h2 className="text-base font-bold">Compliance preparation progress</h2><p className="text-sm text-muted">{a.req.filter((r) => r.done).length} of {a.req.length} requirements complete</p><ul className="mt-3 space-y-1.5 text-sm">{a.req.map((r) => <li key={r.key} className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${r.done ? "bg-success" : "bg-line"}`} />{r.label}</li>)}</ul></div>
      </div>
    </>
  );
}
