import Link from "next/link";
import { Logo } from "./Logo";
import { isSupabaseConfigured } from "@/lib/config";
import { AlertTriangle } from "lucide-react";

export function AuthShell({ title, subtitle, children, wide = false }: { title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="hidden flex-col justify-between bg-forest p-10 lg:flex">
        <Link href="/" aria-label="CBAM AI home"><Logo light /></Link>
        <div>
          <h2 className="max-w-md font-heading text-3xl font-extrabold leading-tight text-white">Make CBAM Compliance Clear, Connected, and Manageable.</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-sage">Each organization gets its own isolated workspace for imports, suppliers, emissions records, documents and reporting.</p>
        </div>
        <p className="text-xs text-sage">© 2026 CBAM AI</p>
      </aside>
      <main className="flex items-center justify-center bg-offwhite px-5 py-10">
        <div className={`w-full ${wide ? "max-w-xl" : "max-w-md"}`}>
          <Link href="/" className="mb-8 block lg:hidden" aria-label="CBAM AI home"><Logo /></Link>
          <h1 className="text-3xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          {!isSupabaseConfigured && (
            <div role="alert" className="mt-5 flex gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm text-charcoal">
              <AlertTriangle className="mt-0.5 shrink-0 text-warn" size={18} />
              <div><strong>Authentication is not configured yet.</strong> Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code> and restart the app. See the README for setup.</div>
            </div>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function Alert({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  const c = { error: "border-danger/40 bg-danger/10", success: "border-success/40 bg-success/10", info: "border-line bg-mint" }[kind];
  return <div role={kind === "error" ? "alert" : "status"} className={`mb-4 rounded-xl border p-3 text-sm text-charcoal ${c}`}>{children}</div>;
}
