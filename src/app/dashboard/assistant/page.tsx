"use client";
import { useRef, useState, useEffect } from "react";
import { Loader2, Send } from "lucide-react";
import { PageHeader, Notice } from "@/components/dash/ui";

type Section = { kind: "verified" | "calculation" | "estimate" | "suggestion"; title: string; lines: string[] };
type Msg = { role: "user" | "assistant"; text?: string; sections?: Section[]; sources?: { title: string; url: string; last_reviewed_at: string | null; verification_status: string }[]; llm?: boolean };
const kindMeta = { verified: ["Verified fact from your records", "bg-success/10 text-success"], calculation: ["Calculation", "bg-mint text-forest"], estimate: ["Estimate", "bg-warn/15 text-[#8a5a0f]"], suggestion: ["AI generated suggestion", "bg-sand text-charcoal"] } as const;
const examples = ["Which suppliers have not submitted their emissions information?", "Which imported products are missing emissions data?", "Summarize our embedded emissions for this reporting period", "Which products require further review?", "Show the suppliers with incomplete documentation", "Explain how this emissions calculation was produced", "Identify unusual emissions values", "Summarize our outstanding compliance tasks", "Prepare a draft report from our approved records", "Explain the difference between actual and default emissions values", "Estimate our potential certificate requirements"];

export default function Page() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState(""); const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text: q }]); setText(""); setBusy(true);
    try {
      const r = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: q }) });
      const j = await r.json();
      setMsgs((m) => [...m, r.ok ? { role: "assistant", sections: j.sections, sources: j.sources, llm: j.llm } : { role: "assistant", text: j.error || "Something went wrong." }]);
    } catch { setMsgs((m) => [...m, { role: "assistant", text: "Network error. Try again." }]); }
    setBusy(false);
  }
  return (
    <>
      <PageHeader title="AI Assistant" desc="Ask questions about your own records. Answers separate verified facts, calculations, estimates and suggestions." />
      <div className="mb-4"><Notice>The assistant reads your organization&apos;s records. It cannot change data, approve supplier declarations, certify emissions, make legal determinations or submit filings. Consequential actions stay with authorised people. Regulatory answers cite sources from your Regulatory Intelligence list and show when each was last reviewed.</Notice></div>
      <div className="card flex min-h-[420px] flex-col">
        <div className="flex-1 space-y-4 p-4 sm:p-5">
          {!msgs.length && <div><p className="text-sm text-muted">Choose a question or type your own.</p><div className="mt-3 flex flex-wrap gap-2">{examples.map((e) => <button key={e} className="rounded-full border border-line px-3 py-1.5 text-left text-sm text-forest hover:bg-mint" onClick={() => ask(e)}>{e}</button>)}</div></div>}
          {msgs.map((m, i) => m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl bg-forest px-4 py-2.5 text-sm text-white">{m.text}</div>
          ) : (
            <div key={i} className="max-w-[95%] space-y-3">
              {m.text && <div className="rounded-2xl border border-line bg-offwhite px-4 py-2.5 text-sm">{m.text}</div>}
              {m.sections?.map((s, j) => (<div key={j} className="rounded-2xl border border-line bg-offwhite p-4"><span className={`badge ${kindMeta[s.kind][1]}`}>{kindMeta[s.kind][0]}</span><div className="mt-2 text-sm font-semibold text-forest">{s.title}</div><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-charcoal">{s.lines.map((l, k) => <li key={k}>{l}</li>)}</ul></div>))}
              {m.sources && m.sources.length > 0 && <div className="rounded-2xl border border-line bg-white p-4 text-sm"><div className="font-semibold text-forest">Sources</div><ul className="mt-1 space-y-1">{m.sources.map((s) => <li key={s.url}><a className="text-emerald underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> <span className="text-muted">Last reviewed: {s.last_reviewed_at || "not reviewed"}; {s.verification_status.replace("_", " ")}</span></li>)}</ul></div>}
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="animate-spin" size={16} />Reading your records</div>}
          <div ref={end} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="flex gap-2 border-t border-line p-3"><input className="input" placeholder="Ask about your CBAM data" value={text} onChange={(e) => setText(e.target.value)} aria-label="Question" maxLength={1000} /><button className="btn-primary" disabled={busy || !text.trim()}><Send size={16} /><span className="hidden sm:inline">Ask</span></button></form>
      </div>
      <p className="mt-3 text-xs text-muted">Language model summaries are optional and need a server side API key. Without one, answers are built directly from your records.</p>
    </>
  );
}
