"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import { emailOk, authMessage } from "@/lib/validation";
import { PasswordInput } from "@/components/PasswordInput";
import { Alert } from "@/components/AuthShell";

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [info, setInfo] = useState("");
  const urlErr = sp.get("error") === "link" ? "That link is invalid or has expired. Request a new one." : sp.get("error") === "setup" ? "Authentication is not configured yet." : "";
  const reset = sp.get("reset") === "1";

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr(""); setInfo(""); setUnverified(false);
    const fe: typeof fieldErr = {};
    if (!emailOk(email)) fe.email = "Enter a valid email address.";
    if (!password) fe.password = "Enter your password.";
    setFieldErr(fe);
    if (Object.keys(fe).length) return;
    if (!isSupabaseConfigured) { setErr("Authentication is not configured yet. See the setup notice above."); return; }
    setBusy(true);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      setErr(authMessage(error.message));
      setUnverified(error.message.toLowerCase().includes("not confirmed"));
      return;
    }
    try {
      // "Remember me" off: the session ends when the browser session ends (enforced on dashboard load).
      if (remember) localStorage.removeItem("cbam-session-only");
      else { localStorage.setItem("cbam-session-only", "1"); sessionStorage.setItem("cbam-session-active", "1"); }
    } catch { /* storage unavailable */ }

    // Accept pending invitations, if the login link carried a token.
    const inv = sp.get("invite"); const sinv = sp.get("supplier_invite");
    if (inv) await supabase.rpc("accept_invitation", { p_token: inv });
    if (sinv) await supabase.rpc("accept_supplier_invite", { p_token: sinv });

    const { data: profile } = await supabase.from("profiles").select("account_type").eq("id", data.user.id).maybeSingle();
    const rawNext = sp.get("next") || "";
    const safeNext = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";
    const dest = profile?.account_type === "supplier" ? "/portal" : safeNext || "/dashboard";
    router.replace(dest);
    router.refresh();
  }

  async function resend() {
    const { error } = await supabaseBrowser().auth.resend({ type: "signup", email: email.trim() });
    setInfo(error ? authMessage(error.message) : "Verification email sent. Check your inbox.");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {reset && <Alert kind="success">Your password was updated. Log in with the new password.</Alert>}
      {urlErr && <Alert kind="error">{urlErr}</Alert>}
      {err && <Alert kind="error">{err}{unverified && <> <button type="button" onClick={resend} className="font-semibold underline">Resend verification email</button></>}</Alert>}
      {info && <Alert kind="success">{info}</Alert>}
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        {fieldErr.email && <p className="mt-1 text-xs text-danger">{fieldErr.email}</p>}
      </div>
      <div>
        <div className="flex items-center justify-between"><label htmlFor="password" className="label">Password</label><Link href="/forgot-password" className="mb-1.5 text-sm font-semibold text-emerald">Forgot password?</Link></div>
        <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {fieldErr.password && <p className="mt-1 text-xs text-danger">{fieldErr.password}</p>}
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-emerald" checked={remember} onChange={(e) => setRemember(e.target.checked)} />Remember me</label>
      <button type="submit" disabled={busy} className="btn-primary w-full">{busy && <Loader2 className="animate-spin" size={16} />}{busy ? "Logging in" : "Log in"}</button>
      <p className="text-center text-sm text-muted">New to CBAM AI? <Link href="/signup" className="font-semibold text-emerald">Create an account</Link></p>
    </form>
  );
}
