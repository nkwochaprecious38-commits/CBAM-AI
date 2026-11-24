"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>{desc && <p className="mt-1 max-w-2xl text-sm text-muted">{desc}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
export const Spinner = ({ text = "Loading" }: { text?: string }) => (<div className="flex items-center gap-2 py-10 text-sm text-muted" role="status"><Loader2 className="animate-spin" size={18} />{text}</div>);
export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (<div className="rounded-2xl border border-dashed border-sage bg-mint/40 p-10 text-center"><h3 className="text-base font-bold">{title}</h3>{text && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{text}</p>}{action && <div className="mt-4">{action}</div>}</div>);
}
export function Notice({ kind = "info", children }: { kind?: "info" | "warn" | "error" | "success"; children: ReactNode }) {
  const m = { info: ["bg-mint border-sage", Info], warn: ["bg-warn/10 border-warn/40", AlertTriangle], error: ["bg-danger/10 border-danger/40", AlertTriangle], success: ["bg-success/10 border-success/40", CheckCircle2] } as const;
  const [c, I] = m[kind];
  return <div className={`flex gap-3 rounded-xl border p-3 text-sm ${c}`}><I size={18} className="mt-0.5 shrink-0 text-forest" /><div>{children}</div></div>;
}
export const DemoBadge = () => <span className="badge bg-warn/15 text-[#9a6513]">Demonstration data</span>;

const tones: Record<string, string> = {
  verified: "ok", approved: "ok", active: "ok", done: "ok", validated: "ok", authorised: "ok", in_scope: "ok", open: "neutral", closed: "neutral",
  pending_verification: "warn", requires_verification: "warn", submitted: "warn", requested: "warn", in_review: "warn", in_progress: "warn", pending: "warn", needs_review: "warn", draft: "neutral", invited: "neutral", applied: "warn", application_prepared: "warn", correction_requested: "warn",
  rejected: "bad", overdue: "bad", retired: "neutral", out_of_scope: "neutral", not_applied: "bad", exported: "ok", actual: "ok", default: "neutral", estimated: "warn",
};
export function Status({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted">Not set</span>;
  const t = tones[value] || "neutral";
  const c = { ok: "bg-success/10 text-success", warn: "bg-warn/15 text-[#8a5a0f]", bad: "bg-danger/10 text-danger", neutral: "bg-mint text-forest" }[t];
  return <span className={`badge ${c}`}>{value.replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase())}</span>;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-midnight/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6 ${wide ? "sm:max-w-3xl" : "sm:max-w-xl"}`}>
        <div className="mb-4 flex items-start justify-between gap-4"><h2 className="text-xl font-bold">{title}</h2><button onClick={onClose} className="rounded p-1 text-muted hover:bg-mint" aria-label="Close"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}
export function Confirm({ title, text, confirmLabel = "Confirm", danger, onConfirm, onCancel }: { title: string; text: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-muted">{text}</p>
      <div className="mt-5 flex justify-end gap-2"><button className="btn-secondary" onClick={onCancel}>Cancel</button><button className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm}>{confirmLabel}</button></div>
    </Modal>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
      {tabs.map(([k, l]) => (
        <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${value === k ? "border-emerald text-forest" : "border-transparent text-muted hover:text-forest"}`}>{l}</button>
      ))}
    </div>
  );
}
export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "warn" | "bad" | "ok" }) {
  const c = tone === "bad" ? "text-danger" : tone === "warn" ? "text-[#9a6513]" : "text-forest";
  return (<div className="card p-4"><div className="text-xs font-medium text-muted">{label}</div><div className={`mt-1 font-heading text-2xl font-extrabold ${c}`}>{value}</div>{sub && <div className="mt-1 text-xs text-muted">{sub}</div>}</div>);
}
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (<div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead className="border-b border-line bg-offwhite"><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead><tbody className="divide-y divide-line">{children}</tbody></table></div>);
}

type ToastItem = { id: number; kind: "success" | "error"; text: string };
const ToastCtx = createContext<(kind: "success" | "error", text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((kind: "success" | "error", text: string) => {
    const id = Date.now() + Math.random(); setItems((p) => [...p, { id, kind, text }]);
    setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
        {items.map((t) => (<div key={t.id} className={`rounded-xl border bg-white p-3 text-sm shadow-lg ${t.kind === "error" ? "border-danger" : "border-success"}`}>{t.text}</div>))}
      </div>
    </ToastCtx.Provider>
  );
}
