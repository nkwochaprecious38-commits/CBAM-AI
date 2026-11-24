import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { analyze, readiness, type Data } from "@/lib/quality";

type Section = { kind: "verified" | "calculation" | "estimate" | "suggestion"; title: string; lines: string[] };
const tot = (r: any) => Number(r.direct_emissions || 0) + Number(r.indirect_emissions || 0) + Number(r.precursor_emissions || 0);
const n = (x: number, d = 2) => x.toLocaleString("en-GB", { maximumFractionDigits: d });

export async function POST(req: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const message = String(body.message || "").slice(0, 1000).trim();
  if (!message) return NextResponse.json({ error: "Enter a question." }, { status: 400 });

  const { data: mem } = await supabase.from("memberships").select("org_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!mem) return NextResponse.json({ error: "No organization." }, { status: 403 });
  const orgId = mem.org_id;
  // All reads use the signed in user's session, so row level security keeps this inside their organization.
  const q = (t: string) => supabase.from(t).select("*").eq("org_id", orgId).limit(5000);
  const [products, imports, suppliers, records, documents, submissions, tasks, classes, auth, periods, declarations, calcs, ests, sources] = (await Promise.all(["products", "imports", "suppliers", "emissions_records", "documents", "supplier_submissions", "compliance_tasks", "product_classifications", "authorization_records", "reporting_periods", "cbam_declarations", "calculation_results", "certificate_estimates", "regulatory_sources"].map(q))).map((r) => r.data || []);
  const d: Data = { products, imports, suppliers, records, documents, submissions, tasks, classes, auth: auth[0] || null, periods, declarations };
  const issues = analyze(d);
  const m = message.toLowerCase();
  const sections: Section[] = [];
  const pn = (id: string) => products.find((p: any) => p.id === id)?.name || "Unknown";
  const sn = (id: string) => suppliers.find((p: any) => p.id === id)?.name || "Unknown";
  let intent = "overview";

  if (/not (yet )?submitted|haven.?t submitted|outstanding supplier|pending supplier|supplier.*(missing|not)/.test(m)) {
    intent = "suppliers_pending";
    const open = submissions.filter((s: any) => ["requested", "correction_requested"].includes(s.status));
    const noReq = suppliers.filter((s: any) => !submissions.some((x: any) => x.supplier_id === s.id));
    sections.push({ kind: "verified", title: "Suppliers with open requests", lines: open.length ? open.map((s: any) => `${sn(s.supplier_id)}: ${s.status.replace("_", " ")}, deadline ${s.deadline || "not set"}`) : ["No open supplier requests."] });
    if (noReq.length) sections.push({ kind: "verified", title: "Suppliers with no request created", lines: noReq.map((s: any) => s.name) });
  } else if (/missing emissions|without emissions|lack.*emission|no emissions data|missing.*product/.test(m)) {
    intent = "products_missing";
    const have = new Set(records.map((r: any) => r.product_id));
    const miss = products.filter((p: any) => !have.has(p.id));
    sections.push({ kind: "verified", title: "Products without an emissions record", lines: miss.length ? miss.map((p: any) => `${p.name}${p.cn_code ? ` (${p.cn_code})` : ""}`) : ["Every product has at least one emissions record."] });
  } else if (/summar.*embedded|embedded emissions|total emissions|emissions.*period/.test(m)) {
    intent = "emissions_summary";
    const by = (f: (r: any) => boolean) => records.filter(f).reduce((a: number, r: any) => a + tot(r), 0);
    sections.push({ kind: "calculation", title: "Totals from your emissions records (tCO2e)", lines: [`All records: ${n(by(() => true))} across ${records.length} record(s)`, `Verified: ${n(by((r) => r.status === "verified"))}`, `Not yet verified: ${n(by((r) => r.status !== "verified"))}`, `Actual basis: ${n(by((r) => r.value_basis === "actual"))}; default: ${n(by((r) => r.value_basis === "default"))}; estimated: ${n(by((r) => r.value_basis === "estimated"))}`] });
    sections.push({ kind: "suggestion", title: "Note", lines: ["Totals include unverified records. Treat the unverified portion as an estimate. These totals are record sums, not intensity times imported quantity: use the Reporting workspace for per period figures."] });
  } else if (/require.*review|further review|needs? review|human review/.test(m)) {
    intent = "needs_review";
    const rv = issues.filter((i) => i.severity === "review");
    sections.push({ kind: "verified", title: "Items flagged for human review", lines: rv.length ? rv.map((i) => `${i.entity}: ${i.why}`) : ["Nothing is currently flagged for human review."] });
  } else if (/incomplete documentation|missing document|documentation/.test(m)) {
    intent = "documents";
    const di = issues.filter((i) => i.category === "Missing supporting documents");
    sections.push({ kind: "verified", title: "Documentation gaps", lines: di.length ? di.map((i) => i.why) : ["No documentation gaps are flagged."] });
  } else if (/explain.*calculation|how.*(was|is).*calculat|calculation.*produced/.test(m)) {
    intent = "explain_calc";
    const c = calcs.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))[0];
    if (!c) sections.push({ kind: "verified", title: "No saved calculations", lines: ["Save a calculation in the Emissions Calculator first."] });
    else sections.push({ kind: "calculation", title: `Latest saved calculation for ${c.product_id ? pn(c.product_id) : "an unlinked product"}`, lines: [...(c.inputs?.lines || []).map((l: any, i: number) => { const f = c.factors?.[i]; return `${l.kind}: ${l.quantity} ${l.unit || ""} x ${f?.value} ${f?.unit} (${f?.name}; source ${f?.source}; ${String(f?.status).replace("_", " ")}) = ${n(Number(l.quantity) * Number(f?.value), 4)} tCO2e`; }), `Total: ${n(Number(c.total_emissions), 4)} tCO2e over ${c.quantity} ${c.unit}. Basis: ${c.basis}.`, `Assumptions: ${c.assumptions || "none recorded"}`] });
  } else if (/unusual|anomal|outlier/.test(m)) {
    intent = "anomalies";
    const ai = issues.filter((i) => i.category === "Unusual emissions value");
    sections.push({ kind: "verified", title: "Statistical flags on emissions values", lines: ai.length ? ai.map((i) => i.why) : ["No unusual values were flagged. Flags need at least three records in a category."] });
  } else if (/outstanding.*task|compliance tasks|to.?do|open tasks/.test(m)) {
    intent = "tasks";
    const t = tasks.filter((x: any) => x.status !== "done");
    sections.push({ kind: "verified", title: "Open compliance tasks", lines: t.length ? t.map((x: any) => `${x.title}: ${x.priority} priority, due ${x.due_date || "no date"}, ${x.status.replace("_", " ")}`) : ["No open tasks."] });
    const rq = readiness(d, issues).filter((r) => !r.done);
    sections.push({ kind: "verified", title: "Readiness requirements not yet complete", lines: rq.map((r) => `${r.label} (${r.detail})`) });
  } else if (/draft.*report|prepare.*report/.test(m)) {
    intent = "draft_report";
    const ok = records.filter((r: any) => r.status === "verified");
    sections.push({ kind: "calculation", title: "Draft summary from verified records only", lines: [`${ok.length} verified emissions record(s) totalling ${n(ok.reduce((a: number, r: any) => a + tot(r), 0))} tCO2e`, `${records.length - ok.length} record(s) excluded because they are not verified`] });
    sections.push({ kind: "suggestion", title: "Next step needs a person", lines: ["Open CBAM Reporting, choose the period and generate a draft. A different authorised person must approve it. The assistant does not create, approve or submit reports."] });
  } else if (/actual.*default|default.*actual|difference/.test(m)) {
    intent = "actual_vs_default";
    sections.push({ kind: "suggestion", title: "General explanation (AI generated, not legal advice)", lines: ["Actual values come from measured or monitored data for the specific production facility and period. Default values are reference values published for use where actual data is not available or not permitted to be used, according to the rules. Which one you may use depends on the applicable rules for your product and period."] });
    sections.push({ kind: "verified", title: "Your records", lines: [`Records by basis: actual ${records.filter((r: any) => r.value_basis === "actual").length}, default ${records.filter((r: any) => r.value_basis === "default").length}, estimated ${records.filter((r: any) => r.value_basis === "estimated").length}`] });
  } else if (/certificate|cost|price/.test(m)) {
    intent = "certificates";
    sections.push({ kind: "estimate", title: "Saved estimates (not confirmed obligations)", lines: ests.length ? ests.map((e: any) => `${e.scenario_name}: ${n(Number(e.certificates_required), 3)} certificates, ${n(Number(e.estimated_cost))} ${e.currency}. Price ${e.price_basis === "official_reference" ? `official reference from ${e.price_source}, ${e.price_date}` : "is a scenario assumption"}.`) : ["No estimates saved. Use Certificate Planning."] });
  } else {
    sections.push({ kind: "verified", title: "Your workspace at a glance", lines: [`${imports.length} import record(s), ${products.length} product(s), ${suppliers.length} supplier(s), ${records.length} emissions record(s)`, `${issues.filter((i) => i.severity === "error").length} validation error(s), ${issues.filter((i) => i.severity === "warning").length} warning(s), ${issues.filter((i) => i.severity === "review").length} item(s) for human review`, `Readiness: ${readiness(d, issues).filter((r) => r.done).length} of ${readiness(d, issues).length} requirements complete`] });
    sections.push({ kind: "suggestion", title: "Try asking", lines: ["Which suppliers have not submitted their emissions information?", "Which imported products are missing emissions data?", "Summarize our embedded emissions", "Explain how this emissions calculation was produced", "Summarize our outstanding compliance tasks"] });
  }

  // Optional language model narrative. It receives only the structured findings above, and its output is labeled AI generated.
  let ai: string | null = null;
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", max_tokens: 500,
          system: "You help CBAM compliance teams understand their own records. Use ONLY the findings provided. Do not invent figures, emissions factors, prices or legal requirements. Do not make legal determinations, certify emissions, approve declarations or claim to submit anything. Keep it under 120 words, plain language, no dashes as punctuation. If the findings are insufficient, say what is missing.",
          messages: [{ role: "user", content: `Question: ${message}\n\nFindings from the organization's records:\n${JSON.stringify(sections)}` }] }) });
      if (r.ok) { const j = await r.json(); ai = j.content?.[0]?.text || null; }
    } catch { /* fall back to deterministic answer */ }
  }
  if (ai) sections.push({ kind: "suggestion", title: "AI generated summary", lines: [ai] });

  const refs = sources.map((s: any) => ({ title: s.title, url: s.url, last_reviewed_at: s.last_reviewed_at, verification_status: s.verification_status }));
  return NextResponse.json({ intent, sections, sources: ["actual_vs_default", "certificates", "draft_report"].includes(intent) ? refs : [], llm: Boolean(key), generated_at: new Date().toISOString() });
}
