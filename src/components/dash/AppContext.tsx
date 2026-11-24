"use client";
import { createContext, useContext } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Role = "org_admin" | "compliance_manager" | "sustainability_manager" | "import_manager" | "procurement_manager" | "analyst" | "team_member";
export interface AppCtx { supabase: SupabaseClient; orgId: string; orgName: string; userId: string; userEmail: string; role: Role; canWrite: boolean; isAdmin: boolean; canApprove: boolean }
export const roleLabels: Record<Role, string> = {
  org_admin: "Organization Admin", compliance_manager: "Compliance Manager", sustainability_manager: "Sustainability Manager",
  import_manager: "Import Manager", procurement_manager: "Procurement Manager", analyst: "Analyst", team_member: "Team Member",
};
const Ctx = createContext<AppCtx | null>(null);
export const AppProvider = Ctx.Provider;
export function useApp() { const c = useContext(Ctx); if (!c) throw new Error("AppProvider missing"); return c; }
