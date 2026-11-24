"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Save, Trash2 } from "lucide-react";
import { PageHeader, Notice, Status, Spinner, EmptyState, Table, Modal, useToast, Confirm } from "@/components/dash/ui";
import { useApp } from "@/components/dash/AppContext";
import { useRows } from "@/lib/hooks";
import { basisOpts, units } from "@/lib/modules";
import { download, fmtDate, fmtNum, toCsv } from "@/lib/format";

type Line = { kind: "direct" | "indirect" | "precursor"; description: string; quantity: string; unit: string; factorId: string; manualValue: string; manualUnit: string; manualSource: string };
const newLine = (): Line => ({ kind: "direct", description: "", quantity: "", unit: "", factorId: "", manualValue: "", manualUnit: "", manualSource: "" });

export default function Page() {
  const { supabase, orgId, userId, canWrite } = useApp();
  const toast = useToast();
  const products = useRows("products", { order: "name", asc: true });
  const methods = useRows("methodologies", { order: "name", asc: true });
  const factors = useRows("emissions_factors", { order: "name", asc: true });
  const saved = useRows("calculation_results", { select: "*, products(name), methodologies(name, version)" });
  const [f, setF] = useState({ product_id: "", methodology_id: "", basis: "actual", period_start: "", period_end: "", quantity: "", unit: "tonne", process: "", assumptions: "" });
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [errs, setErrs] = useState<string[]>([]);
  const [result, setResult] = useState<any | null>(null);
  const [view, setView] = useState<any | null>(null);
  const [del, setDel] = useState<any | null>(null);

  const fmap = useMemo(() => Object.fromEntries(factors.rows.map((x: any) => [x.id, x])), [factors.rows]);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const setLine = (i: number, k: keyof Line, v: string) => setLines((p) => p.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  useEffect(() => { const p = products.rows.find((x: any) => x.id === f.product_id); if (p) setF((o) => ({ ...o, unit: p.unit || o.unit })); }, [f.product_id]); // eslint-disable-line react-hooks/exhaustive-deps

  function calculate() {
    const e: string[] = [];
    const qty = Number(f.quantity);
    if (!f.quantity || Number.isNaN(qty) || qty <= 0) e.push("Enter the produced or imported quantity as a number above zero.");
    if (!f.period_start || !f.period_end || f.period_end < f.period_start) e.push("Enter a valid calculation period.");
    if (!f.methodology_id) e.push("Select a methodology record. Create one under Emissions Data if none exists.");
    const out = lines.map((l, i) => {
      const q = Number(l.quantity);
      if (l.quantity === "" || Number.isNaN(q) || q < 0) e.push(`Line ${i + 1}: enter an activity quantity of zero or more.`);
      let factor: any = null;
      if (l.factorId) factor = fmap[l.factorId];
      else if (l.manualValue !== "") {
        if (Number.isNaN(Number(l.manualValue)) || Number(l.manualValue) < 0) e.push(`Line ${i + 1}: the manual factor must be a number.`);
        if (!l.manualSource.trim()) e.push(`Line ${i + 1}: a manual factor needs a source.`);
        factor = { id: null, name: "Manual entry", value: Number(l.manualValue), unit: l.manualUnit || "not stated", source: l.manualSource, status: "pending_verification" };
      } else e.push(`Line ${i + 1}: choose an emissions factor or enter one with its source.`);
      const t = factor ? q * Number(factor.value) : 0;
      return { ...l, quantityNum: q, factor: factor && { id: factor.id, name: factor.name, value: Number(factor.value), unit: factor.unit, source: factor.source, status: factor.status, valid_from: factor.valid_from, valid_to: factor.valid_to }, tco2e: t };
    });
    setErrs(e);
    if (e.length) { setResult(null); return; }
    const sum = (k: string) => out.filter((l) => l.kind === k).reduce((a, l) => a + l.tco2e, 0);
    const direct = sum("direct"), indirect = sum("indirect"), precursor = sum("precursor");
    const total = direct + indirect + precursor;
    const unverified = out.filter((l) => l.factor?.status !== "verified").length;
    const m = methods.rows.find((x: any) => x.id === f.methodology_id);
    setResult({ out, direct, indirect, precursor, total, perUnit: total / qty, qty, unverified, method: m });
  }

  async function save() {
    if (!result) return;
    const { error } = await supabase.from("calculation_results").insert({
      org_id: orgId, product_id: f.product_id || null, methodology_id: f.methodology_id || null, period_start: f.period_start, period_end: f.period_end, basis: f.basis,
      inputs: { quantity: result.qty, unit: f.unit, process: f.process, lines: result.out.map((l: any) => ({ kind: l.kind, description: l.description, quantity: l.quantityNum, unit: l.unit })) },
      factors: result.out.map((l: any) => l.factor), assumptions: f.assumptions || null,
      direct_emissions: result.direct, indirect_emissions: result.indirect, precursor_emissions: result.precursor, quantity: result.qty, unit: f.unit,
      emissions_per_unit: result.perUnit, total_emissions: result.total, created_by: userId,
    });
    if (error) return toast("error", error.message);
    toast("success", "Calculation saved with its inputs, factors and assumptions."); saved.reload();
  }
  const exportOne = (r: any) => download(`calculation_${r.id.slice(0, 8)}.json`, JSON.stringify(r, null, 2), "application/json");

  async function toRecord(r: any) {
    const { error } = await supabase.from("emissions_records").insert({ org_id: orgId, product_id: r.product_id, period_start: r.period_start, period_end: r.period_end, direct_emissions: r.direct_emissions, indirect_emissions: r.indirect_emissions, precursor_emissions: r.precursor_emissions, production_quantity: r.quantity, unit: r.unit, value_basis: r.basis, status: "pending_verification", source: `Calculation ${r.id.slice(0, 8)}` });
    if (error) toast("error", error.message); else toast("success", "Emissions record created with status Pending verification.");
  }

  if (products.loading || methods.loading || factors.loading) return <Spinner />;
  const noFactors = !factors.rows.length;
  return (
    <>
      <PageHeader title="Emissions Calculator" desc="Estimate embedded emissions from activity data and factors you maintain. Every result shows how it was produced." />
      <div className="mb-4 space-y-3">
        <Notice kind="warn">This calculator applies the factors and methodology records in your workspace. It does not contain built in regulatory factors or default values. Add values from verified official sources under Emissions Data, and confirm the method with your compliance team. Results are estimates until verified.</Notice>
        {noFactors && <Notice>No emissions factors yet. You can enter a factor manually with its source, or add a library under Emissions Data, Emissions factors.</Notice>}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="card space-y-4 p-5">
          <h2 className="text-lg font-bold">Inputs</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Product</label><select className="input" value={f.product_id} onChange={(e) => set("product_id", e.target.value)}><option value="">Not linked</option>{products.rows.map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.cn_code ? ` (${p.cn_code})` : ""}</option>)}</select></div>
            <div><label className="label">Calculation methodology</label><select className="input" value={f.methodology_id} onChange={(e) => { set("methodology_id", e.target.value); const m = methods.rows.find((x: any) => x.id === e.target.value); if (m) set("basis", m.method_type); }}><option value="">Select methodology</option>{methods.rows.map((m: any) => <option key={m.id} value={m.id}>{m.name} v{m.version}</option>)}</select></div>
            <div><label className="label">Value basis</label><select className="input" value={f.basis} onChange={(e) => set("basis", e.target.value)}>{basisOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-2"><div><label className="label">Quantity</label><input className="input" inputMode="decimal" value={f.quantity} onChange={(e) => set("quantity", e.target.value)} /></div><div><label className="label">Unit</label><select className="input" value={f.unit} onChange={(e) => set("unit", e.target.value)}>{units.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div></div>
            <div><label className="label">Period start</label><input type="date" className="input" value={f.period_start} onChange={(e) => set("period_start", e.target.value)} /></div>
            <div><label className="label">Period end</label><input type="date" className="input" value={f.period_end} onChange={(e) => set("period_end", e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="label">Production process information</label><textarea rows={2} className="input" value={f.process} onChange={(e) => set("process", e.target.value)} /></div>
          </div>
          <h3 className="pt-2 text-base font-bold">Activity lines</h3>
          {lines.map((l, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-line bg-offwhite p-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <div><label className="label">Emission type</label><select className="input" value={l.kind} onChange={(e) => setLine(i, "kind", e.target.value)}><option value="direct">Direct</option><option value="indirect">Indirect</option><option value="precursor">Precursor</option></select></div>
                <div className="sm:col-span-2"><label className="label">Description</label><input className="input" value={l.description} onChange={(e) => setLine(i, "description", e.target.value)} placeholder="For example natural gas consumed" /></div>
                <div><label className="label">Activity quantity</label><input className="input" inputMode="decimal" value={l.quantity} onChange={(e) => setLine(i, "quantity", e.target.value)} /></div>
                <div><label className="label">Activity unit</label><input className="input" value={l.unit} onChange={(e) => setLine(i, "unit", e.target.value)} placeholder="Unit" /></div>
                <div className="sm:col-span-3"><label className="label">Emissions factor</label><select className="input" value={l.factorId} onChange={(e) => setLine(i, "factorId", e.target.value)}><option value="">Enter manually</option>{factors.rows.filter((x: any) => x.status !== "retired").map((x: any) => <option key={x.id} value={x.id}>{x.name}: {x.value} {x.unit} ({x.status.replace("_", " ")})</option>)}</select></div>
              </div>
              {!l.factorId && <div className="grid gap-3 sm:grid-cols-3"><div><label className="label">Factor value</label><input className="input" inputMode="decimal" value={l.manualValue} onChange={(e) => setLine(i, "manualValue", e.target.value)} /></div><div><label className="label">Factor unit</label><input className="input" value={l.manualUnit} onChange={(e) => setLine(i, "manualUnit", e.target.value)} /></div><div><label className="label">Source of factor</label><input className="input" value={l.manualSource} onChange={(e) => setLine(i, "manualSource", e.target.value)} /></div></div>}
              {lines.length > 1 && <button className="btn-ghost !py-1 text-danger" onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 size={14} />Remove line</button>}
            </div>))}
          <button className="btn-secondary" onClick={() => setLines([...lines, newLine()])}><Plus size={16} />Add line</button>
          <div><label className="label">Assumptions</label><textarea rows={2} className="input" value={f.assumptions} onChange={(e) => set("assumptions", e.target.value)} placeholder="State any assumptions, system boundaries or allocation choices" /></div>
          {errs.length > 0 && <Notice kind="error"><ul className="list-disc pl-4">{errs.map((x) => <li key={x}>{x}</li>)}</ul></Notice>}
          <button className="btn-primary" onClick={calculate}>Calculate embedded emissions</button>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-lg font-bold">Result</h2>
            {!result ? <p className="mt-2 text-sm text-muted">Complete the inputs and calculate to see the result and how it was produced.</p> : (<>
              <div className="mt-3 flex items-center gap-2"><Status value={f.basis} />{result.unverified > 0 ? <span className="badge bg-warn/15 text-[#8a5a0f]">Estimate: {result.unverified} unverified factor(s)</span> : <span className="badge bg-success/10 text-success">All factors verified</span>}</div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[["Direct", result.direct], ["Indirect", result.indirect], ["Precursor", result.precursor], ["Total embedded", result.total]].map(([k, v]) => <div key={k as string} className="rounded-lg bg-mint p-3"><dt className="text-xs text-muted">{k} (tCO2e)</dt><dd className="font-heading text-lg font-extrabold text-forest">{fmtNum(v as number, 4)}</dd></div>)}
                <div className="col-span-2 rounded-lg bg-mint p-3"><dt className="text-xs text-muted">Per {f.unit}</dt><dd className="font-heading text-lg font-extrabold text-forest">{fmtNum(result.perUnit, 6)} tCO2e</dd></div>
              </dl>
              <h3 className="mt-5 text-sm font-bold">How this was calculated</h3>
              <p className="mt-1 text-xs text-muted">Method: {result.method?.name} v{result.method?.version} ({result.method?.status?.replace("_", " ")}). Period {fmtDate(f.period_start)} to {fmtDate(f.period_end)}. Each line is activity quantity multiplied by the factor value.</p>
              <ol className="mt-2 space-y-2 text-xs">{result.out.map((l: any, i: number) => (<li key={i} className="rounded-lg border border-line p-2"><div className="font-semibold text-forest">{l.kind} : {l.description || "No description"}</div><div className="text-muted">{fmtNum(l.quantityNum, 4)} {l.unit} x {fmtNum(l.factor.value, 6)} ({l.factor.unit}) = <strong className="text-charcoal">{fmtNum(l.tco2e, 4)} tCO2e</strong></div><div className="text-muted">Factor: {l.factor.name}. Source: {l.factor.source}. Status: {l.factor.status.replace("_", " ")}</div></li>))}</ol>
              {f.assumptions && <p className="mt-3 text-xs"><strong>Assumptions:</strong> {f.assumptions}</p>}
              {canWrite && <button className="btn-primary mt-4 w-full" onClick={save}><Save size={16} />Save calculation</button>}
            </>)}
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-10 text-xl font-bold">Saved calculations</h2>
      {saved.loading ? <Spinner /> : !saved.rows.length ? <EmptyState title="No saved calculations" text="Saved calculations keep their inputs, factors and assumptions so they can be explained later." /> : (
        <Table head={["Date", "Product", "Basis", "Period", "Total (tCO2e)", "Per unit", "Actions"]}>{saved.rows.map((r: any) => (
          <tr key={r.id}><td className="td">{fmtDate(r.created_at)}</td><td className="td">{r.products?.name || "Not linked"}</td><td className="td"><Status value={r.basis} /></td><td className="td">{fmtDate(r.period_start)} to {fmtDate(r.period_end)}</td><td className="td">{fmtNum(r.total_emissions, 4)}</td><td className="td">{fmtNum(r.emissions_per_unit, 6)}</td>
            <td className="td"><div className="flex gap-1"><button className="btn-ghost !py-1" onClick={() => setView(r)}>Explain</button><button className="rounded p-1.5 hover:bg-mint" aria-label="Export" onClick={() => exportOne(r)}><Download size={16} /></button>
              {canWrite && <button className="btn-ghost !py-1" onClick={() => toRecord(r)}>To record</button>}{canWrite && <button className="rounded p-1.5 text-danger hover:bg-danger/10" aria-label="Delete" onClick={() => setDel(r)}><Trash2 size={16} /></button>}</div></td></tr>))}</Table>)}
      {saved.rows.length > 0 && <button className="btn-secondary mt-3" onClick={() => download("calculations.csv", toCsv(saved.rows.map((r: any) => ({ id: r.id, created_at: r.created_at, product: r.products?.name, basis: r.basis, period_start: r.period_start, period_end: r.period_end, direct_tco2e: r.direct_emissions, indirect_tco2e: r.indirect_emissions, precursor_tco2e: r.precursor_emissions, total_tco2e: r.total_emissions, quantity: r.quantity, unit: r.unit, per_unit: r.emissions_per_unit, methodology: r.methodologies?.name, assumptions: r.assumptions }))))}><Download size={16} />Export all as CSV</button>}
      {view && <Modal title="Calculation record" onClose={() => setView(null)} wide>
        <p className="text-sm text-muted">Method {view.methodologies?.name || "not recorded"} v{view.methodologies?.version}. Basis {view.basis}. Period {fmtDate(view.period_start)} to {fmtDate(view.period_end)}. Quantity {fmtNum(view.quantity)} {view.unit}.</p>
        <ol className="mt-3 space-y-2 text-sm">{(view.inputs?.lines || []).map((l: any, i: number) => { const fx = view.factors?.[i]; return (<li key={i} className="rounded-lg border border-line p-3"><div className="font-semibold">{l.kind}: {l.description || "No description"}</div><div className="text-muted">{fmtNum(l.quantity, 4)} {l.unit} x {fmtNum(fx?.value, 6)} {fx?.unit}</div><div className="text-xs text-muted">Factor {fx?.name}. Source: {fx?.source}. Status: {String(fx?.status).replace("_", " ")}</div></li>); })}</ol>
        <p className="mt-3 text-sm"><strong>Total:</strong> {fmtNum(view.total_emissions, 4)} tCO2e (direct {fmtNum(view.direct_emissions, 4)}, indirect {fmtNum(view.indirect_emissions, 4)}, precursor {fmtNum(view.precursor_emissions, 4)})</p>
        <p className="mt-2 text-sm"><strong>Assumptions:</strong> {view.assumptions || "None recorded"}</p></Modal>}
      {del && <Confirm danger title="Delete calculation" text="Delete this saved calculation? The deletion is recorded in the audit log." confirmLabel="Delete" onConfirm={async () => { const { error } = await supabase.from("calculation_results").delete().eq("id", del.id).eq("org_id", orgId); setDel(null); if (error) toast("error", error.message); else saved.reload(); }} onCancel={() => setDel(null)} />}
    </>
  );
}
