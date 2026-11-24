"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Ship, Package, Users, Factory, Calculator, Database, FolderOpen, FileText, Landmark, ShieldCheck, Scale, Bot, BarChart3, Plug, UserCog, Settings, LogOut, Menu, X } from "lucide-react";
import { Logo } from "../Logo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppProvider, roleLabels, type Role } from "./AppContext";
import { ToastProvider } from "./ui";

export const nav = [
  ["/dashboard", "Overview", LayoutDashboard], ["/dashboard/imports", "Imports", Ship], ["/dashboard/products", "Products", Package],
  ["/dashboard/suppliers", "Suppliers", Users], ["/dashboard/facilities", "Production Facilities", Factory], ["/dashboard/calculator", "Emissions Calculator", Calculator],
  ["/dashboard/emissions", "Emissions Data", Database], ["/dashboard/documents", "Documents", FolderOpen], ["/dashboard/reporting", "CBAM Reporting", FileText],
  ["/dashboard/certificates", "Certificate Planning", Landmark], ["/dashboard/compliance", "Compliance Monitoring", ShieldCheck], ["/dashboard/regulatory", "Regulatory Intelligence", Scale],
  ["/dashboard/assistant", "AI Assistant", Bot], ["/dashboard/analytics", "Analytics", BarChart3], ["/dashboard/integrations", "Integrations", Plug],
  ["/dashboard/team", "Team Management", UserCog], ["/dashboard/settings", "Settings", Settings],
] as const;

export function DashboardShell({ orgId, orgName, userId, userEmail, role, children }: { orgId: string; orgName: string; userId: string; userEmail: string; role: Role; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const supabase = supabaseBrowser();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    // "Remember me" unchecked: end the session when a new browser session starts.
    try {
      if (localStorage.getItem("cbam-session-only") && !sessionStorage.getItem("cbam-session-active")) {
        localStorage.removeItem("cbam-session-only");
        supabase.auth.signOut().then(() => { router.replace("/login"); router.refresh(); });
      }
    } catch { /* ignore */ }
  }, [supabase, router]);

  async function logout() {
    await supabase.auth.signOut();
    try { localStorage.removeItem("cbam-session-only"); sessionStorage.removeItem("cbam-session-active"); } catch { /* ignore */ }
    router.replace("/login"); router.refresh();
  }
  const canWrite = role !== "analyst";
  const side = (
    <div className="flex h-full flex-col bg-forest text-sage">
      <div className="flex h-16 items-center justify-between px-4"><Link href="/dashboard"><Logo light /></Link><button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Dashboard">
        {nav.map(([href, name, Icon]) => {
          const active = href === "/dashboard" ? path === href : path.startsWith(href);
          return (<Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-emerald text-white" : "hover:bg-midnight hover:text-white"}`}><Icon size={17} />{name}</Link>);
        })}
      </nav>
      <div className="border-t border-midnight p-4 text-xs"><div className="truncate font-semibold text-white">{userEmail}</div><div>{roleLabels[role]}</div></div>
    </div>
  );
  return (
    <AppProvider value={{ supabase, orgId, orgName, userId, userEmail, role, canWrite, isAdmin: role === "org_admin", canApprove: role === "org_admin" || role === "compliance_manager" }}>
      <ToastProvider>
        <div className="min-h-screen lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
          <aside className="hidden lg:block"><div className="fixed inset-y-0 w-64">{side}</div></aside>
          {open && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-midnight/50" onClick={() => setOpen(false)} /><div className="absolute inset-y-0 left-0 w-72">{side}</div></div>}
          <div className="min-w-0">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
              <div className="flex items-center gap-3"><button className="rounded p-1.5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
                <div><div className="text-sm font-bold text-forest">{orgName}</div><div className="text-xs text-muted">{roleLabels[role]}</div></div></div>
              <button onClick={logout} className="btn-secondary !py-2"><LogOut size={16} /><span className="hidden sm:inline">Log out</span></button>
            </header>
            <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </AppProvider>
  );
}
