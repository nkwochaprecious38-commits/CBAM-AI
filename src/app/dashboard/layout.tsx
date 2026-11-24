import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { DashboardShell } from "@/components/dash/DashboardShell";
import { NoWorkspace } from "@/components/NoWorkspace";
import type { Role } from "@/components/dash/AppContext";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-xl p-10"><h1 className="text-2xl font-extrabold">Workspace unavailable</h1>
        <p className="mt-3 text-sm text-muted">Supabase is not configured. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, run <code>supabase/schema.sql</code>, and restart.</p>
        <Link href="/" className="btn-secondary mt-5">Back to website</Link></div>
    );
  }
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: profile } = await supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle();
  if (profile?.account_type === "supplier") redirect("/portal");

  const { data: mem, error: memErr } = await supabase.from("memberships").select("org_id, role, organizations(name)").eq("user_id", user.id).order("created_at").limit(1).maybeSingle();
  if (!mem) return <NoWorkspace dbError={memErr?.message} />;
  const org = mem.organizations as unknown as { name: string } | null;
  return (
    <DashboardShell orgId={mem.org_id} orgName={org?.name || "Workspace"} userId={user.id} userEmail={user.email || ""} role={mem.role as Role}>
      {children}
    </DashboardShell>
  );
}
