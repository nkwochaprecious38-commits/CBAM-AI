"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthShell, Alert } from "@/components/AuthShell";
import { PasswordInput } from "@/components/PasswordInput";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import { passwordProblems, authMessage } from "@/lib/validation";

export default function Page() {
  const router = useRouter();
  const [ready, setReady] = useState<"loading" | "ok" | "invalid">("loading");
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) { setReady("invalid"); return; }
    supabaseBrowser().auth.getUser().then(({ data }) => setReady(data.user ? "ok" : "invalid"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const pp = passwordProblems(pw);
    if (pp.length) { setErr(`Password needs ${pp.join(", ")}.`); return; }
    if (pw !== pw2) { setErr("Passwords do not match."); return; }
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setBusy(false); setErr(authMessage(error.message)); return; }
    await supabase.auth.signOut();
    router.replace("/login?reset=1");
  }

  return (
    <AuthShell title="Choose a new password">
      {ready === "loading" && <p className="text-sm text-muted">Checking your reset link...</p>}
      {ready === "invalid" && <div><Alert kind="error">This reset link is invalid or has expired.</Alert><Link href="/forgot-password" className="btn-primary w-full">Request a new link</Link></div>}
      {ready === "ok" && (
        <form onSubmit={submit} noValidate className="space-y-4">
          {err && <Alert kind="error">{err}</Alert>}
          <div><label htmlFor="pw" className="label">New password</label><PasswordInput id="pw" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <div><label htmlFor="pw2" className="label">Confirm new password</label><PasswordInput id="pw2" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
          <p className="text-xs text-muted">At least 10 characters with upper and lower case letters and a number.</p>
          <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" size={16} />}Update password</button>
        </form>
      )}
    </AuthShell>
  );
}
