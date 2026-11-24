"use client";
import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { AuthShell, Alert } from "@/components/AuthShell";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import { emailOk, authMessage } from "@/lib/validation";

export default function Page() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!emailOk(email)) { setErr("Enter a valid email address."); return; }
    if (!isSupabaseConfigured) { setErr("Authentication is not configured yet. See the setup notice above."); return; }
    setBusy(true);
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
    setBusy(false);
    if (error) { setErr(authMessage(error.message)); return; }
    setDone(true); // Same message whether or not the account exists, to avoid revealing registered emails.
  }
  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we will send a link to choose a new password.">
      {done ? (
        <div><Alert kind="success">If an account exists for <strong>{email}</strong>, a reset link is on its way. The link expires after a short time.</Alert><Link href="/login" className="btn-secondary w-full">Back to log in</Link></div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {err && <Alert kind="error">{err}</Alert>}
          <div><label htmlFor="email" className="label">Email</label><input id="email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" size={16} />}Send reset link</button>
          <p className="text-center text-sm"><Link href="/login" className="font-semibold text-emerald">Back to log in</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
