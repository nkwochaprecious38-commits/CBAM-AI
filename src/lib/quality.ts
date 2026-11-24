import { cnFormatOk } from "./modules";

export type Issue = { id: string; severity: "error" | "warning" | "review"; category: string; title: string; why: string; entity: string; area: string };
export interface Data { products: any[]; imports: any[]; suppliers: any[]; records: any[]; documents: any[]; submissions: any[]; tasks: any[]; classes: any[]; auth: any | null; periods: any[]; declarations: any[] }
export type Req = { key: string; label: string; done: boolean; detail: string };

const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const total = (r: any) => Number(r.direct_emissions || 0) + Number(r.indirect_emissions || 0) + Number(r.precursor_emissions || 0);

export function analyze(d: Data): Issue[] {
  const out: Issue[] = [];
  const add = (i: Omit<Issue, "id">) => out.push({ ...i, id: `${i.category}:${i.entity}:${i.title}` });
  const pn = (id?: string | null) => d.products.find((p) => p.id === id)?.name || "Unknown product";
  const sn = (id?: string | null) => d.suppliers.find((p) => p.id === id)?.name || "Unknown supplier";
  const classCodes = new Set(d.classes.map((c) => String(c.cn_code).replace(/\s/g, "")));

  d.suppliers.forEach((s) => {
    const miss = ["email", "country", "contact_person"].filter((k) => !s[k]);
    if (miss.length) add({ severity: "warning", category: "Missing supplier information", title: `Supplier profile incomplete`, why: `${s.name} has no ${miss.map((m) => m.replace("_", " ")).join(", ")}. Requests cannot be routed reliably.`, entity: s.name, area: "Suppliers" });
  });
  d.products.forEach((p) => {
    const miss = [!p.cn_code && "CN code", !p.category && "category", !p.supplier_id && "supplier", !p.facility_id && "production facility"].filter(Boolean);
    if (miss.length) add({ severity: "warning", category: "Incomplete product record", title: "Product record incomplete", why: `${p.name} is missing: ${miss.join(", ")}.`, entity: p.name, area: "Products" });
    if (p.cn_code && !cnFormatOk(p.cn_code)) add({ severity: "error", category: "Invalid product code", title: "CN code has the wrong format", why: `${p.name}: "${p.cn_code}" is not an 8 digit CN code.`, entity: p.name, area: "Products" });
    else if (p.cn_code && classCodes.size && !classCodes.has(String(p.cn_code).replace(/\s/g, ""))) add({ severity: "review", category: "Invalid product code", title: "CN code not in your classification list", why: `${p.name}: ${p.cn_code} is not in your classification list. Confirm against official sources whether it is in CBAM scope.`, entity: p.name, area: "Products" });
    if (p.scope_status === "needs_review") add({ severity: "review", category: "Human review required", title: "Scope not decided", why: `${p.name}: scope status is still "needs review". A person must decide after checking the CN code.`, entity: p.name, area: "Products" });
  });

  // Units
  d.imports.forEach((i) => {
    const p = d.products.find((x) => x.id === i.product_id);
    if (p && i.unit && p.unit && i.unit !== p.unit) add({ severity: "warning", category: "Inconsistent units", title: "Import unit differs from product unit", why: `Import ${i.reference} uses ${i.unit} but ${p.name} is managed in ${p.unit}. No conversion is applied automatically.`, entity: i.reference, area: "Imports" });
    if (!i.product_id || !i.country_of_origin || i.quantity == null || !i.reporting_period_id) add({ severity: "warning", category: "Incomplete import record", title: "Import record incomplete", why: `Import ${i.reference} is missing ${[!i.product_id && "product", !i.country_of_origin && "country of origin", i.quantity == null && "quantity", !i.reporting_period_id && "reporting period"].filter(Boolean).join(", ")}.`, entity: i.reference, area: "Imports" });
  });
  d.records.forEach((r) => {
    const p = d.products.find((x) => x.id === r.product_id);
    if (p && r.unit && p.unit && r.unit !== p.unit) add({ severity: "warning", category: "Inconsistent units", title: "Emissions record unit differs from product unit", why: `Record for ${p.name} uses ${r.unit} but the product uses ${p.unit}.`, entity: `${p.name} ${r.period_start || ""}`, area: "Emissions" });
  });

  // Duplicates
  const seen = new Map<string, string>();
  d.imports.forEach((i) => {
    const keys = [`ref:${String(i.reference).toLowerCase()}`, i.product_id && i.supplier_id && i.import_date && i.quantity != null ? `combo:${i.product_id}|${i.supplier_id}|${i.import_date}|${i.quantity}` : ""].filter(Boolean);
    keys.forEach((k) => { if (seen.has(k)) add({ severity: "warning", category: "Duplicate import", title: "Possible duplicate import", why: `${i.reference} matches ${seen.get(k)} on ${k.startsWith("ref") ? "reference" : "product, supplier, date and quantity"}. Review before reporting.`, entity: i.reference, area: "Imports" }); else seen.set(k, i.reference); });
  });

  // Unusual emissions values (relative to peers of the same category with at least 3 records)
  const intens = d.records.filter((r) => Number(r.production_quantity) > 0).map((r) => ({ r, v: total(r) / Number(r.production_quantity), cat: d.products.find((p) => p.id === r.product_id)?.category || "unknown" }));
  const groups = new Map<string, typeof intens>();
  intens.forEach((x) => groups.set(x.cat, [...(groups.get(x.cat) || []), x]));
  groups.forEach((g, cat) => {
    if (g.length < 3) return;
    const m = median(g.map((x) => x.v));
    g.forEach(({ r, v }) => {
      if (m > 0 && (v > m * 3 || v < m / 3)) add({ severity: "review", category: "Unusual emissions value", title: "Emissions intensity far from peers", why: `${pn(r.product_id)}: ${v.toFixed(3)} tCO2e per unit versus a median of ${m.toFixed(3)} across ${g.length} ${cat} records (more than 3 times apart). This is a statistical flag, not a finding of error.`, entity: `${pn(r.product_id)} ${r.period_start || ""}`, area: "Emissions" });
    });
  });
  d.records.forEach((r) => { if (Number(r.production_quantity) > 0 && total(r) === 0) add({ severity: "review", category: "Unusual emissions value", title: "Zero emissions with positive production", why: `${pn(r.product_id)} reports production but zero emissions. Confirm this is intended.`, entity: `${pn(r.product_id)} ${r.period_start || ""}`, area: "Emissions" }); });

  // Production quantity consistency
  d.records.forEach((r) => {
    if (!r.product_id || !r.supplier_id || !r.production_quantity || !r.period_start || !r.period_end) return;
    const sum = d.imports.filter((i) => i.product_id === r.product_id && i.supplier_id === r.supplier_id && i.import_date && i.import_date >= r.period_start && i.import_date <= r.period_end && i.unit === r.unit).reduce((a, i) => a + Number(i.quantity || 0), 0);
    if (sum > Number(r.production_quantity)) add({ severity: "warning", category: "Inconsistent production quantity", title: "Imports exceed reported production", why: `${pn(r.product_id)} from ${sn(r.supplier_id)}: imports in the period total ${sum} ${r.unit}, above the reported production of ${r.production_quantity}.`, entity: `${pn(r.product_id)} ${r.period_start}`, area: "Emissions" });
  });

  // Missing emissions data and documents
  const withRecord = new Set(d.records.map((r) => r.product_id));
  const importedProducts = Array.from(new Set(d.imports.map((i) => i.product_id).filter(Boolean)));
  importedProducts.forEach((id) => { if (!withRecord.has(id)) add({ severity: "error", category: "Missing emissions data", title: "Imported product has no emissions record", why: `${pn(id)} is imported but has no emissions record.`, entity: pn(id), area: "Emissions" }); });
  const importedSuppliers = Array.from(new Set(d.imports.map((i) => i.supplier_id).filter(Boolean)));
  importedSuppliers.forEach((id) => { if (!d.documents.some((x) => x.supplier_id === id)) add({ severity: "warning", category: "Missing supporting documents", title: "No documents linked to supplier", why: `${sn(id)} supplies imported goods but no document is linked to this supplier.`, entity: sn(id), area: "Documents" }); });
  d.records.filter((r) => r.status === "needs_review").forEach((r) => add({ severity: "review", category: "Human review required", title: "Emissions record marked for review", why: `${pn(r.product_id)} (${r.period_start || "no period"}) is flagged needs review.`, entity: `${pn(r.product_id)} ${r.period_start || ""}`, area: "Emissions" }));
  return out;
}

export function readiness(d: Data, issues: Issue[]): Req[] {
  const today = new Date().toISOString().slice(0, 10);
  const open = d.submissions.filter((s) => ["requested", "correction_requested"].includes(s.status));
  const importedProducts = Array.from(new Set(d.imports.map((i) => i.product_id).filter(Boolean)));
  const recProducts = new Set(d.records.map((r) => r.product_id));
  const reqs: Req[] = [
    { key: "auth", label: "Authorization status is Authorised", done: d.auth?.status === "authorised", detail: `Current status: ${(d.auth?.status || "not recorded").replace(/_/g, " ")}` },
    { key: "period", label: "A reporting period with a deadline and its source is defined", done: d.periods.some((p) => p.declaration_due && p.deadline_source), detail: `${d.periods.length} period(s) recorded` },
    { key: "imports", label: "Every import has product, origin, quantity and reporting period", done: d.imports.length > 0 && d.imports.every((i) => i.product_id && i.country_of_origin && i.quantity != null && i.reporting_period_id), detail: `${d.imports.length} import record(s)` },
    { key: "scope", label: "Every product has a valid CN code and a scope decision", done: d.products.length > 0 && d.products.every((p) => cnFormatOk(p.cn_code) && p.scope_status !== "needs_review"), detail: `${d.products.filter((p) => !cnFormatOk(p.cn_code) || p.scope_status === "needs_review").length} product(s) outstanding` },
    { key: "emissions", label: "Every imported product has an emissions record", done: importedProducts.length > 0 && importedProducts.every((id) => recProducts.has(id)), detail: `${importedProducts.filter((id) => !recProducts.has(id)).length} without data` },
    { key: "verified", label: "All emissions records are marked verified", done: d.records.length > 0 && d.records.every((r) => r.status === "verified"), detail: `${d.records.filter((r) => r.status !== "verified").length} not verified` },
    { key: "requests", label: "No supplier requests are open", done: d.submissions.length > 0 && open.length === 0, detail: `${open.length} open, ${open.filter((s) => s.deadline && s.deadline < today).length} overdue` },
    { key: "review", label: "No supplier submissions await review", done: !d.submissions.some((s) => s.status === "submitted"), detail: `${d.submissions.filter((s) => s.status === "submitted").length} awaiting review` },
    { key: "docs", label: "No documentation gaps are flagged", done: d.imports.length > 0 && !issues.some((i) => i.category === "Missing supporting documents"), detail: `${issues.filter((i) => i.category === "Missing supporting documents").length} gap(s)` },
    { key: "errors", label: "No validation errors are open", done: !issues.some((i) => i.severity === "error"), detail: `${issues.filter((i) => i.severity === "error").length} error(s)` },
    { key: "decl", label: "A declaration draft has been approved internally", done: d.declarations.some((x) => x.status === "approved" || x.status === "exported"), detail: `${d.declarations.length} draft(s)` },
  ];
  return reqs;
}
