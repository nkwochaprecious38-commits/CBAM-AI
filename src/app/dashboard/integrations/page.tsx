"use client";
import { useEffect, useState } from "react";
import { PageHeader, Status } from "@/components/dash/ui";

export default function Page() {
  const [s, setS] = useState<{ supabase: boolean; ai: boolean; email: boolean } | null>(null);
  useEffect(() => { fetch("/api/status").then((r) => r.json()).then(setS).catch(() => setS({ supabase: false, ai: false, email: false })); }, []);
  const items = [
    ["Supabase database, authentication and storage", s?.supabase, "Connected. Powers sign in, data and file storage.", "Not configured. Set the Supabase environment variables."],
    ["Language model for the AI Assistant", s?.ai, "Configured. The assistant adds a short AI generated summary to answers.", "Not configured. Add ANTHROPIC_API_KEY on the server. The assistant still answers from your records."],
    ["Email delivery for invitations and reminders", s?.email, "Configured.", "Not configured. Invitation links are shown for you to send, and reminders are recorded but not emailed."],
    ["CSV import and export", true, "Available in Imports, Products, Suppliers and other modules.", ""],
    ["Official CBAM Registry submission", false, "", "Not integrated. CBAM AI exports structured data. An authorised person submits in the official system."],
    ["EU ETS reference price feed", false, "", "Not integrated. Enter reference prices manually with their source and date in Certificate Planning."],
    ["ERP and customs system connectors", false, "", "Not available yet. Use CSV upload."],
  ] as const;
  return (
    <>
      <PageHeader title="Integrations" desc="What is connected, and what still needs setup. Nothing here is shown as active unless it is." />
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(([t, on, yes, no]) => (<div key={t} className="card p-5"><div className="flex items-start justify-between gap-3"><h2 className="text-base font-bold">{t}</h2>{s === null ? <span className="text-xs text-muted">Checking</span> : <Status value={on ? "active" : "not_applied"} />}</div><p className="mt-2 text-sm text-muted">{on ? yes : no}</p></div>))}
      </div>
    </>
  );
}
