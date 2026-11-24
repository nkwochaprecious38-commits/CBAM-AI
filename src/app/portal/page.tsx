"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import { Notice, Status, Spinner, EmptyState, ToastProvider, useToast } from "@/components/dash/ui";
import { fmtDate } from "@/lib/format";
import { basisOpts, units } from "@/lib/modules";

function Inner() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<any | null>(null);
  async function load() {
    const { data } = await supabase.from("supplier_submissions").select("*, suppliers(name), products(name)").order("created_at", { ascending: false });
    setRows(data || []); setLoading(false);
  }
  useEffect(() => { if (isSupabaseConfigured) load(); else setLoading(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function logout() { await supabase.auth.signOut(); router.replace("/login"); router.refresh(); }
  return (
    <div className="min-h-screen bg-offwhite">
      <header className="border-b border-line bg-white"><div className="container-x flex h-16 items-center justify-between"><Logo /><button className="btn-secondary !py-2" onClick={logout}><LogOut size={16} />Log out</button></div></header>
      <main className="container-x py-8">
        <h1 className="text-3xl font-extrabold">Supplier portal</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">Submit the emissions information requested by your customers. You can only see requests addressed to your company.</p>
        <div className="mt-6">
          {loading ? <Spinner /> : !rows.length ? <EmptyState title="No requests yet" text="When a customer sends you a data request, it appears here. If you just accepted an invitation, ask your customer to create a request." /> : (
            <div className="grid gap-4 md:grid-cols-2">
              {rows.map((r) => (
                <div key={r.id} className="card p-5">
                  <div className="flex items-start justify-between gap-2"><div><div className="text-sm text-muted">{r.suppliers?.name}</div><div className="font-bold text-forest">{r.products?.name || "Product not specified"}</div></div><Status value={r.status} /></div>
                  <p className="mt-3 text-sm text-muted">{r.emissions_requested}</p>
                  <div className="mt-2 text-sm">Deadline: <strong>{fmtDate(r.deadline)}</strong></div>
                  {r.status === "correction_requested" && r.review_notes && <div className="mt-3"><Notice kind="warn"><strong>Correction requested:</strong> {r.review_notes}</Notice></div>}
                  {r.status === "rejected" && r.review_notes && <div className="mt-3"><Notice kind="error"><strong>Rejected:</strong> {r.review_notes}</Notice></div>}
                  {["requested", "correction_requested"].includes(r.status) && <button className="btn-primary mt-4" onClick={() => setOpen(r)}>{r.status === "requested" ? "Submit data" : "Submit corrections"}</button>}
                </div>))}
            </div>)}
        </div>
        {open && <Submit r={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); toast("success", "Submission sent to your customer for review."); load(); }} />}
      </main>
    </div>
  );
}

function Submit({ r, onClose, onDone }: { r: any; onClose: () => void; onDone: () => void }) {
  const supabase = supabaseBrowser();
  const prev = r.data || {};
  const [v, setV] = useState<Record<string, string>>({ unit: "tonne", value_basis: "actual", ...prev });
  const [notes, setNotes] = useState(r.supplier_notes || "");
  const [files, setFiles] = useState<File[]>([]);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));
  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const nums = ["direct_emissions", "indirect_emissions", "precursor_emissions", "production_quantity"];
    for (const k of nums) if (v[k] && (Number.isNaN(Number(v[k])) || Number(v[k]) < 0)) return setErr(`${k.replace(/_/g, " ")} must be a number of zero or more.`);
    if (!v.direct_emissions) return setErr("Direct emissions are required. Enter 0 if none.");
    if (!v.production_quantity) return setErr("Production quantity is required.");
    if (!v.period_start || !v.period_end || v.period_end < v.period_start) return setErr("Enter a valid reporting period.");
    if (files.some((f) => f.size > 15_000_000)) return setErr("Each file must be smaller than 15 MB.");
    setBusy(true);
    const uploaded: { path: string; name: string }[] = [...(r.files || [])];
    for (const f of files) {
      const path = `sub/${r.id}/${Date.now()}_${f.name.replace(/[^\w.]+/g, "_")}`;
      const { error } = await supabase.storage.from("cbam-documents").upload(path, f);
      if (error) { setBusy(false); return setErr(`Upload failed for ${f.name}: ${error.message}`); }
      uploaded.push({ path, name: f.name });
    }
    const { error } = await supabase.rpc("submit_supplier_data", { p_id: r.id, p_data: v, p_notes: notes, p_files: uploaded });
    setBusy(false);
    if (error) return setErr(error.message);
    onDone();
  }
  const num = (k: string, l: string) => (<div><label className="label">{l}</label><input className="input" inputMode="decimal" value={v[k] || ""} onChange={(e) => set(k, e.target.value)} /></div>);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-midnight/50 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <form onSubmit={go} className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-2xl sm:rounded-2xl sm:p-6" noValidate>
        <h2 className="text-xl font-bold">Emissions submission</h2>
        <p className="mt-1 text-sm text-muted">Your customer reviews this data. They may approve it, reject it, or request corrections.</p>
        {err && <div className="mt-3"><Notice kind="error">{err}</Notice></div>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="label">Period start</label><input type="date" className="input" value={v.period_start || ""} onChange={(e) => set("period_start", e.target.value)} /></div>
          <div><label className="label">Period end</label><input type="date" className="input" value={v.period_end || ""} onChange={(e) => set("period_end", e.target.value)} /></div>
          {num("production_quantity", "Production quantity")}
          <div><label className="label">Unit</label><select className="input" value={v.unit} onChange={(e) => set("unit", e.target.value)}>{units.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select></div>
          {num("direct_emissions", "Direct emissions (tCO2e)")}{num("indirect_emissions", "Indirect emissions (tCO2e)")}{num("precursor_emissions", "Precursor emissions (tCO2e)")}
          <div><label className="label">Value basis</label><select className="input" value={v.value_basis} onChange={(e) => set("value_basis", e.target.value)}>{basisOpts.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select></div>
          <div><label className="label">Energy consumption</label><input className="input" value={v.energy_consumption || ""} onChange={(e) => set("energy_consumption", e.target.value)} /></div>
          <div><label className="label">Fuel consumption</label><input className="input" value={v.fuel_consumption || ""} onChange={(e) => set("fuel_consumption", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="label">Production process</label><textarea rows={2} className="input" value={v.process_info || ""} onChange={(e) => set("process_info", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="label">Notes for your customer</label><textarea rows={2} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="label">Supporting documents</label><input type="file" multiple className="input" onChange={(e) => setFiles(Array.from(e.target.files || []))} /></div>
        </div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy}>{busy && <Loader2 className="animate-spin" size={16} />}Submit</button></div>
      </form>
    </div>
  );
}

export default function Page() { return <ToastProvider><Inner /></ToastProvider>; }
