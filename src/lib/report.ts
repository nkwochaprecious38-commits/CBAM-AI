import type { Data } from "./quality";

const tot = (r: any) => Number(r.direct_emissions || 0) + Number(r.indirect_emissions || 0) + Number(r.precursor_emissions || 0);

export function buildLines(d: Data, periodId: string) {
  return d.imports.filter((i) => i.reporting_period_id === periodId).map((i) => {
    const p = d.products.find((x) => x.id === i.product_id);
    const s = d.suppliers.find((x) => x.id === i.supplier_id);
    const cands = d.records.filter((r) => r.product_id === i.product_id && (!r.supplier_id || r.supplier_id === i.supplier_id));
    const exact = cands.find((r) => r.period_start && r.period_end && i.import_date && i.import_date >= r.period_start && i.import_date <= r.period_end);
    const rec = exact || cands.sort((a, b) => String(b.period_end).localeCompare(String(a.period_end)))[0];
    const usable = rec && Number(rec.production_quantity) > 0 && rec.unit === i.unit && i.quantity != null;
    const embedded = usable ? (tot(rec) / Number(rec.production_quantity)) * Number(i.quantity) : null;
    const note = !rec ? "No emissions record" : !usable ? "Record cannot be applied: missing production quantity or unit mismatch" : !exact ? "Record period does not cover the import date" : "";
    return { import_reference: i.reference, import_date: i.import_date, product: p?.name || "", cn_code: p?.cn_code || "", country_of_origin: i.country_of_origin || "", quantity: i.quantity, unit: i.unit, supplier: s?.name || "", facility_id: rec?.facility_id || null, customs_reference: i.customs_reference || "", embedded_tco2e: embedded, basis: rec?.value_basis || "", data_status: rec?.status || "", source: rec?.source || "", note };
  });
}

