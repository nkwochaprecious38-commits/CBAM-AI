"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import { countries, businessTypes } from "@/lib/countries";
import { emailOk, passwordProblems, authMessage } from "@/lib/validation";
import { PasswordInput } from "@/components/PasswordInput";
import { Alert } from "@/components/AuthShell";

type Errs = Partial<Record<"fullName" | "email" | "company" | "country" | "businessType" | "password" | "confirm" | "terms", string>>;

export function SignupForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const invite = sp.get("invite") || "";
  const supplierInvite = sp.get("supplier_invite") || "";
  const invited = Boolean(invite || supplierInvite);
  const [v, setV] = useState({ fullName: "", email: sp.get("email") || "", company: "", country: "", businessType: "", password: "", confirm: "", terms: false });
  const [errs, setErrs] = useState<Errs>({});
  const [formErr, setFormErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [resent, setResent] = useState("");
  const set = (k: keyof typeof v, val: string | boolean) => setV((p) => ({ ...p, [k]: val }));

  function validate(): Errs {
    const e: Errs = {};
    if (v.fullName.trim().length < 2) e.fullName = "Enter your full name.";
    if (!emailOk(v.email)) e.email = "Enter a valid work email address.";
    if (!invite && v.company.trim().length < 2) e.company = "Enter your company name.";
    if (!v.country) e.country = "Select a country.";
    if (!v.businessType) e.businessType = "Select a business type.";
    const pp = passwordProblems(v.password);
    if (pp.length) e.password = `Password needs ${pp.join(", ")}.`;
    if (v.confirm !== v.password) e.confirm = "Passwords do not match.";
    if (!v.terms) e.terms = "You must accept the terms to continue.";
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormErr("");
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) return;
    if (!isSupabaseConfigured) { setFormErr("Authentication is not configured yet. See the setup notice above."); return; }
    setBusy(true);
    const supabase = supabaseBrowser();
    const next = supplierInvite ? "/portal" : "/dashboard";
    const { data, error } = await supabase.auth.signUp({
      email: v.email.trim(),
      password: v.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}`,
        data: {
          cbam_app: "1", full_name: v.fullName.trim(), company: v.company.trim(), country: v.country, business_type: v.businessType,
          ...(invite ? { invite_token: invite } : {}), ...(supplierInvite ? { supplier_invite_token: supplierInvite } : {}),
        },
      },
    });
    setBusy(false);
    if (error) { setFormErr(authMessage(error.message)); return; }
    // Supabase returns an obfuscated user with no identities when the email is already registered.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setFormErr("An account with this email already exists. Log in instead, or reset your password.");
      return;
    }
    if (data.session) { router.replace(next); router.refresh(); return; }
    setSent(true);
  }

  async function resend() {
    setResent("");
    const { error } = await supabaseBrowser().auth.resend({ type: "signup", email: v.email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` } });
    setResent(error ? authMessage(error.message) : "Verification email sent again.");
  }

  if (sent) {
    return (
      <div className="card p-6 text-center">
        <MailCheck className="mx-auto text-emerald" size={36} />
        <h2 className="mt-3 text-xl font-bold">Check your email</h2>
        <p className="mt-2 text-sm text-muted">We sent a verification link to <strong className="text-charcoal">{v.email}</strong>. Open it to activate your workspace, then log in.</p>
        {resent && <p className="mt-3 text-sm text-forest" role="status">{resent}</p>}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button className="btn-secondary" onClick={resend}>Resend email</button>
          <Link href="/login" className="btn-primary">Go to log in</Link>
        </div>
      </div>
    );
  }

  const F = ({ id, label, err, children }: { id: string; label: string; err?: string; children: React.ReactNode }) => (
    <div><label htmlFor={id} className="label">{label}</label>{children}{err && <p id={`${id}-err`} className="mt-1 text-xs text-danger">{err}</p>}</div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {invited && <Alert kind="info">You were invited to join. Use the email address the invitation was sent to.</Alert>}
      {formErr && <Alert kind="error">{formErr}{formErr.includes("already exists") && <> <Link href="/login" className="font-semibold underline">Log in</Link></>}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <F id="fullName" label="Full name" err={errs.fullName}><input id="fullName" className="input" autoComplete="name" value={v.fullName} onChange={(e) => set("fullName", e.target.value)} aria-describedby="fullName-err" /></F>
        <F id="email" label="Work email" err={errs.email}><input id="email" type="email" className="input" autoComplete="email" value={v.email} onChange={(e) => set("email", e.target.value)} /></F>
      </div>
      {!invite && <F id="company" label={supplierInvite ? "Company name" : "Company name"} err={errs.company}><input id="company" className="input" autoComplete="organization" value={v.company} onChange={(e) => set("company", e.target.value)} /></F>}
      <div className="grid gap-4 sm:grid-cols-2">
        <F id="country" label="Country" err={errs.country}>
          <select id="country" className="input" value={v.country} onChange={(e) => set("country", e.target.value)}><option value="">Select country</option>{countries.map((c) => <option key={c}>{c}</option>)}</select>
        </F>
        <F id="businessType" label="Business type" err={errs.businessType}>
          <select id="businessType" className="input" value={v.businessType} onChange={(e) => set("businessType", e.target.value)}><option value="">Select business type</option>{businessTypes.map((c) => <option key={c}>{c}</option>)}</select>
        </F>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <F id="password" label="Password" err={errs.password}><PasswordInput id="password" autoComplete="new-password" value={v.password} onChange={(e) => set("password", e.target.value)} /></F>
        <F id="confirm" label="Confirm password" err={errs.confirm}><PasswordInput id="confirm" autoComplete="new-password" value={v.confirm} onChange={(e) => set("confirm", e.target.value)} /></F>
      </div>
      <p className="text-xs text-muted">Use at least 10 characters with upper and lower case letters and a number.</p>
      <div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 h-4 w-4 accent-emerald" checked={v.terms} onChange={(e) => set("terms", e.target.checked)} />
          <span>I accept the <Link href="/terms" className="font-semibold text-emerald underline" target="_blank">terms and conditions</Link> and the <Link href="/privacy" className="font-semibold text-emerald underline" target="_blank">privacy notice</Link>.</span></label>
        {errs.terms && <p className="mt-1 text-xs text-danger">{errs.terms}</p>}
      </div>
      <button type="submit" disabled={busy} className="btn-primary w-full">{busy && <Loader2 className="animate-spin" size={16} />}{busy ? "Creating workspace" : "Create account"}</button>
      <p className="text-center text-sm text-muted">Already have an account? <Link href="/login" className="font-semibold text-emerald">Log in</Link></p>
    </form>
  );
}
