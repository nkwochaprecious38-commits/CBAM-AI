"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/dash/AppContext";

export function useRows<T = any>(table: string, opts: { select?: string; order?: string; asc?: boolean; limit?: number } = {}) {
  const { supabase, orgId } = useApp();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { select = "*", order = "created_at", asc = false, limit = 1000 } = opts;
  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from(table).select(select).eq("org_id", orgId).order(order, { ascending: asc }).limit(limit);
    if (error) setError(error.message); else { setError(""); setRows((data as unknown as T[]) || []); }
    setLoading(false);
  }, [supabase, orgId, table, select, order, asc, limit]);
  useEffect(() => { reload(); }, [reload]);
  return { rows, loading, error, reload };
}

import type { Data } from "./quality";
export function useComplianceData() {
  const { supabase, orgId } = useApp();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    const q = (t: string) => supabase.from(t).select("*").eq("org_id", orgId).limit(5000);
    const res = await Promise.all(["products", "imports", "suppliers", "emissions_records", "documents", "supplier_submissions", "compliance_tasks", "product_classifications", "authorization_records", "reporting_periods", "cbam_declarations"].map(q));
    const err = res.find((r) => r.error);
    if (err?.error) { setError(err.error.message); return; }
    const [products, imports, suppliers, records, documents, submissions, tasks, classes, auth, periods, declarations] = res.map((r) => r.data || []);
    setData({ products, imports, suppliers, records, documents, submissions, tasks, classes, auth: auth[0] || null, periods, declarations });
  }, [supabase, orgId]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, reload };
}
