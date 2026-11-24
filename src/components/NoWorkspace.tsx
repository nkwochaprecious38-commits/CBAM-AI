"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function NoWorkspace({ dbError }: { dbError?: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true); setMsg("");
    const { error } = await supabaseBrowser().rpc("ensure_workspace");
    setBusy(false);
    if (error) setMsg(`Could not create the workspace: ${error.message}. Run the latest supabase/schema.sql in the Supabase SQL editor, then try again.`);
    else { router.refresh(); }
  }
  async function logout() { await supabaseBrowser().auth.signOut(); router.replace("/login"); router.refresh(); }
  return (
    <div className="mx-auto max-w-xl p-10">
      <h1 className="text-2xl font-extrabold">No workspace found</h1>
      <p className="mt-3 text-sm text-muted">Your account is not linked to an organization. If you were invited, open your invitation link again. Otherwise create your workspace now.</p>
      {dbError && <p className="mt-3 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">Database message: {dbError}. The schema in <code>supabase/schema.sql</code> may not be applied yet.</p>}
      {msg && <p role="alert" className="mt-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm">{msg}</p>}
      <div className="mt-5 flex gap-2"><button className="btn-primary" onClick={create} disabled={busy}>{busy ? "Creating" : "Create my workspace"}</button><button className="btn-secondary" onClick={logout}>Log out</button></div>
    </div>
  );
}
