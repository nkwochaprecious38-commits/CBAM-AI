"use client";
import { useEffect, useState } from "react";
import { PageHeader, Tabs, Notice, Spinner, Table, EmptyState, useToast } from "@/components/dash/ui";
import { useApp } from "@/components/dash/AppContext";
import { PasswordInput } from "@/components/PasswordInput";
import { countries, businessTypes } from "@/lib/countries";
import { passwordProblems, authMessage } from "@/lib/validation";
import { fmtDate, label } from "@/lib/format";

export default function Page() {
  const [tab, setTab] = useState("org");
  return (<><PageHeader title="Settings" /><Tabs value={tab} onChange={setTab} tabs={[["org", "Organization"], ["account", "Account"], ["audit", "Audit log"]]} />{tab === "org" && <Org />}{tab === "account" && <Account />}{tab === "audit" && <Audit />}</>);
}
function Org() {
  const { supabase, orgId, isAdmin } = useApp(); const toast = useToast();
  const [o, setO] = useState<any>(null);
  useEffect(() => { supabase.from("organizations").select("*").eq("id", orgId).single().then(({ data }) => setO(data)); }, [supabase, orgId]);
  if (!o) return <Spinner />;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!o.name?.trim()) return toast("error", "Organization name is required.");
    const { error } = await supabase.from("organizations").update({ name: o.name.trim(), country: o.country, business_type: o.business_type, eori_number: o.eori_number }).eq("id", orgId);
    if (error) toast("error", error.message); else toast("success", "Organization updated. Reload to see the new name in the header.");
  }
  const set = (k: string, v: string) => setO({ ...o, [k]: v });
  return (
    <form onSubmit={save} className="card max-w-2xl space-y-4 p-5">
      {!isAdmin && <Notice>Only Organization Admins can edit these details.</Notice>}
      <div><label className="label">Organization name</label><input className="input" disabled={!isAdmin} value={o.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Country</label><select className="input" disabled={!isAdmin} value={o.country || ""} onChange={(e) => set("country", e.target.value)}><option value="">Not set</option>{countries.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="label">Business type</label><select className="input" disabled={!isAdmin} value={o.business_type || ""} onChange={(e) => set("business_type", e.target.value)}><option value="">Not set</option>{businessTypes.map((c) => <option key={c}>{c}</option>)}</select></div></div>
      <div><label className="label">EORI number</label><input className="input" disabled={!isAdmin} value={o.eori_number || ""} onChange={(e) => set("eori_number", e.target.value)} /></div>
      {isAdmin && <button className="btn-primary">Save changes</button>}
    </form>
  );
}
function Account() {
  const { supabase, userEmail } = useApp(); const toast = useToast();
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const pp = passwordProblems(pw); if (pp.length) return toast("error", `Password needs ${pp.join(", ")}.`);
    if (pw !== pw2) return toast("error", "Passwords do not match.");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast("error", authMessage(error.message)); else { toast("success", "Password updated."); setPw(""); setPw2(""); }
  }
  return (<form onSubmit={go} className="card max-w-md space-y-4 p-5"><div><div className="label">Email</div><div className="text-sm">{userEmail}</div></div><div><label className="label">New password</label><PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div><div><label className="label">Confirm new password</label><PasswordInput value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></div><button className="btn-primary">Change password</button></form>);
}
function Audit() {
  const { supabase, orgId } = useApp();
  const [rows, setRows] = useState<any[] | null>(null); const [t, setT] = useState(""); const [open, setOpen] = useState<number | null>(null);
  useEffect(() => { supabase.from("audit_logs").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(300).then(({ data }) => setRows(data || [])); }, [supabase, orgId]);
  if (!rows) return <Spinner />;
  const tables = Array.from(new Set(rows.map((r) => r.table_name)));
  const shown = rows.filter((r) => !t || r.table_name === t);
  return (<div><Notice>Inserts, updates and deletes on business records are written automatically. Entries cannot be edited or deleted by users. Showing the latest 300.</Notice>
    <select className="input mb-4 mt-4 w-auto" value={t} onChange={(e) => setT(e.target.value)} aria-label="Table"><option value="">All records</option>{tables.map((x) => <option key={x} value={x}>{label(x)}</option>)}</select>
    {!shown.length ? <EmptyState title="No audit entries yet" /> : <Table head={["When", "Record type", "Action", "Details"]}>{shown.map((r) => (<tr key={r.id}><td className="td whitespace-nowrap">{fmtDate(r.created_at)} {new Date(r.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</td><td className="td">{label(r.table_name)}</td><td className="td">{r.action}</td><td className="td"><button className="text-sm font-semibold text-emerald" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Hide" : "Show"}</button>{open === r.id && <pre className="mt-2 max-h-48 overflow-auto rounded bg-offwhite p-2 text-xs">{JSON.stringify({ before: r.old_data, after: r.new_data }, null, 2)}</pre>}</td></tr>))}</Table>}</div>);
}
