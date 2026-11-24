import type { ResourceConfig } from "@/components/dash/ResourceManager";
import { countries } from "./countries";

export const categories: [string, string][] = [["cement", "Cement"], ["iron_steel", "Iron and steel"], ["aluminium", "Aluminium"], ["fertilisers", "Fertilisers"], ["electricity", "Electricity"], ["hydrogen", "Hydrogen"], ["other", "Other (check scope)"]];
export const units: [string, string][] = [["tonne", "Tonne"], ["kg", "Kilogram"], ["MWh", "MWh"], ["unit", "Unit"]];
export const countryOpts: [string, string][] = countries.map((c) => [c, c]);
export const basisOpts: [string, string][] = [["actual", "Actual"], ["default", "Default"], ["estimated", "Estimated"]];
export const dataStatus: [string, string][] = [["pending_verification", "Pending verification"], ["needs_review", "Needs review"], ["verified", "Verified"]];

/** CN codes have 8 digits. This checks format only; scope must be confirmed against official sources. */
export const cnFormatOk = (c?: string | null) => !!c && /^\d{8}$/.test(c.replace(/\s/g, ""));

export const importsCfg: ResourceConfig = {
  table: "imports", singular: "Import record", plural: "Import records", csv: true, order: "import_date", dupKeys: ["reference"],
  searchKeys: ["reference", "country_of_origin", "customs_reference"],
  description: "Create import records one by one or upload a CSV of shipments.",
  fields: [
    { key: "reference", label: "Reference", required: true },
    { key: "import_date", label: "Import date", type: "date" },
    { key: "product_id", label: "Product", type: "ref", ref: "products" },
    { key: "supplier_id", label: "Supplier", type: "ref", ref: "suppliers" },
    { key: "country_of_origin", label: "Country of origin", type: "select", options: countryOpts },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "unit", label: "Unit", type: "select", options: units, default: "tonne", required: true },
    { key: "customs_reference", label: "Customs reference" },
    { key: "reporting_period_id", label: "Reporting period", type: "ref", ref: "reporting_periods" },
  ],
  validate: (v) => (v.quantity !== null && v.quantity !== "" && v.quantity !== undefined && Number(v.quantity) < 0 ? "Quantity cannot be negative." : null),
};

export const productsCfg: ResourceConfig = {
  table: "products", singular: "Product", csv: true, order: "name", asc: true, dupKeys: ["name", "cn_code"],
  searchKeys: ["name", "cn_code", "description"],
  description: "Add the products you import or produce, with their CN codes.",
  filter: { key: "category", label: "Categories", options: categories },
  fields: [
    { key: "name", label: "Product name", required: true },
    { key: "cn_code", label: "CN code", hint: "8 digit Combined Nomenclature code. Scope is checked against your classification list, never assumed." },
    { key: "category", label: "Category", type: "select", options: categories },
    { key: "unit", label: "Unit", type: "select", options: units, default: "tonne", required: true },
    { key: "supplier_id", label: "Supplier", type: "ref", ref: "suppliers" },
    { key: "facility_id", label: "Production facility", type: "ref", ref: "production_facilities" },
    { key: "scope_status", label: "Scope status", type: "select", options: [["needs_review", "Needs review"], ["in_scope", "In scope"], ["out_of_scope", "Out of scope"]], default: "needs_review", required: true, status: true, hint: "Set by your team after checking the CN code against official sources." },
    { key: "description", label: "Description", type: "textarea", table: false },
  ],
  validate: (v) => (v.cn_code && !cnFormatOk(String(v.cn_code)) ? "CN code must have 8 digits." : null),
};

export const suppliersCfg: ResourceConfig = {
  table: "suppliers", singular: "Supplier", order: "name", asc: true, dupKeys: ["name"], csv: true,
  searchKeys: ["name", "country", "contact_person", "email"],
  description: "Add the suppliers and producers you import from, then invite them to the supplier portal.",
  fields: [
    { key: "name", label: "Company name", required: true },
    { key: "country", label: "Country", type: "select", options: countryOpts },
    { key: "contact_person", label: "Contact person" },
    { key: "email", label: "Email address", type: "email" },
    { key: "status", label: "Status", type: "select", status: true, options: [["draft", "Draft"], ["invited", "Invited"], ["active", "Active"], ["inactive", "Inactive"]], default: "draft", required: true },
    { key: "notes", label: "Notes", type: "textarea", table: false },
  ],
};

export const facilitiesCfg: ResourceConfig = {
  table: "production_facilities", singular: "Production facility", plural: "Production facilities", order: "name", asc: true, dupKeys: ["name"], csv: true,
  searchKeys: ["name", "country", "sector"],
  description: "Record the facilities where your products are made.",
  fields: [
    { key: "name", label: "Facility name", required: true },
    { key: "supplier_id", label: "Supplier or producer", type: "ref", ref: "suppliers" },
    { key: "country", label: "Country", type: "select", options: countryOpts },
    { key: "sector", label: "Sector", type: "select", options: categories },
    { key: "address", label: "Address", table: false },
    { key: "production_processes", label: "Production processes", type: "textarea", table: false },
  ],
};

export const tasksCfg: ResourceConfig = {
  table: "compliance_tasks", singular: "Task", order: "due_date", asc: true,
  searchKeys: ["title", "description"],
  fields: [
    { key: "title", label: "Task", required: true },
    { key: "due_date", label: "Due date", type: "date" },
    { key: "priority", label: "Priority", type: "select", options: [["low", "Low"], ["medium", "Medium"], ["high", "High"]], default: "medium", required: true },
    { key: "status", label: "Status", type: "select", options: [["open", "Open"], ["in_progress", "In progress"], ["done", "Done"]], default: "open", required: true, status: true },
    { key: "description", label: "Description", type: "textarea", table: false },
  ],
};

export const periodsCfg: ResourceConfig = {
  table: "reporting_periods", singular: "Reporting period", order: "start_date",
  searchKeys: ["label"],
  description: "Create the reporting periods your imports belong to. Deadlines are editable records: confirm them against official sources.",
  fields: [
    { key: "label", label: "Label", required: true },
    { key: "start_date", label: "Start date", type: "date", required: true },
    { key: "end_date", label: "End date", type: "date", required: true },
    { key: "declaration_due", label: "Declaration due date", type: "date", hint: "Enter the date from the official source and note it below." },
    { key: "deadline_source", label: "Deadline source", hint: "For example a link to the official publication." },
    { key: "status", label: "Status", type: "select", options: [["open", "Open"], ["closed", "Closed"]], default: "open", required: true },
  ],
  validate: (v) => (v.start_date && v.end_date && v.end_date < v.start_date ? "End date must be after the start date." : null),
};

export const factorsCfg: ResourceConfig = {
  table: "emissions_factors", singular: "Emissions factor", order: "name", asc: true, csv: true, dupKeys: ["name", "source"],
  searchKeys: ["name", "source"],
  description: "No factors are preloaded. Add factors from verified references and record the source for each.",
  fields: [
    { key: "name", label: "Factor name", required: true },
    { key: "factor_type", label: "Type", type: "select", required: true, default: "fuel", options: [["fuel", "Fuel"], ["electricity", "Electricity"], ["process", "Process"], ["precursor", "Precursor"], ["default_value", "Default value"]] },
    { key: "value", label: "Value", type: "number", required: true },
    { key: "unit", label: "Unit", required: true, hint: "For example tCO2e per tonne of fuel." },
    { key: "source", label: "Source", required: true, hint: "Publication or dataset the value comes from." },
    { key: "source_url", label: "Source link", table: false },
    { key: "valid_from", label: "Valid from", type: "date", table: false },
    { key: "valid_to", label: "Valid to", type: "date", table: false },
    { key: "status", label: "Status", type: "select", status: true, required: true, default: "pending_verification", options: [["pending_verification", "Pending verification"], ["verified", "Verified"], ["retired", "Retired"]] },
  ],
};

export const methodsCfg: ResourceConfig = {
  table: "methodologies", singular: "Methodology", plural: "Methodologies", order: "name", asc: true,
  searchKeys: ["name", "source_reference"],
  description: "Methodology records describe how a calculation is performed. They are configurable and versioned, not hardcoded.",
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "method_type", label: "Basis", type: "select", options: basisOpts, required: true, default: "actual" },
    { key: "version", label: "Version", default: "1" },
    { key: "source_reference", label: "Source reference", hint: "Legal text or guidance this method follows." },
    { key: "status", label: "Status", type: "select", status: true, required: true, default: "pending_verification", options: [["pending_verification", "Pending verification"], ["verified", "Verified"], ["retired", "Retired"]] },
    { key: "description", label: "Description", type: "textarea", table: false },
  ],
};

export const activityCfg: ResourceConfig = {
  table: "activity_data", singular: "Activity data entry", plural: "Activity data", order: "period_start",
  searchKeys: ["description", "source"],
  fields: [
    { key: "activity_type", label: "Type", type: "select", required: true, default: "production_quantity", options: [["production_quantity", "Production quantity"], ["energy_consumption", "Energy consumption"], ["fuel_consumption", "Fuel consumption"], ["process_information", "Process information"]] },
    { key: "description", label: "Description" },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "unit", label: "Unit" },
    { key: "facility_id", label: "Facility", type: "ref", ref: "production_facilities" },
    { key: "product_id", label: "Product", type: "ref", ref: "products" },
    { key: "period_start", label: "Period start", type: "date" },
    { key: "period_end", label: "Period end", type: "date" },
    { key: "source", label: "Source" },
    { key: "status", label: "Status", type: "select", status: true, required: true, default: "pending_verification", options: dataStatus },
  ],
};

export const recordsCfg: ResourceConfig = {
  table: "emissions_records", singular: "Emissions record", order: "period_start", csv: false,
  searchKeys: ["source", "notes"],
  description: "Record direct, indirect and precursor emissions in tCO2e with source, period and status.",
  fields: [
    { key: "product_id", label: "Product", type: "ref", ref: "products" },
    { key: "supplier_id", label: "Supplier", type: "ref", ref: "suppliers" },
    { key: "facility_id", label: "Facility", type: "ref", ref: "production_facilities", table: false },
    { key: "period_start", label: "Period start", type: "date" },
    { key: "period_end", label: "Period end", type: "date" },
    { key: "direct_emissions", label: "Direct (tCO2e)", type: "number" },
    { key: "indirect_emissions", label: "Indirect (tCO2e)", type: "number" },
    { key: "precursor_emissions", label: "Precursor (tCO2e)", type: "number", table: false },
    { key: "production_quantity", label: "Production quantity", type: "number" },
    { key: "unit", label: "Unit", type: "select", options: units, default: "tonne", required: true, table: false },
    { key: "value_basis", label: "Basis", type: "select", options: basisOpts, default: "actual", required: true, status: true },
    { key: "status", label: "Status", type: "select", status: true, required: true, default: "pending_verification", options: dataStatus },
    { key: "source", label: "Source", required: true, hint: "Where the value comes from, for example a supplier declaration reference." },
    { key: "notes", label: "Notes", type: "textarea", table: false },
  ],
  validate: (v) => (["direct_emissions", "indirect_emissions", "precursor_emissions"].some((k) => Number(v[k]) < 0) ? "Emissions values cannot be negative." : v.period_start && v.period_end && v.period_end < v.period_start ? "Period end must be after period start." : null),
};

export const evidenceCfg: ResourceConfig = {
  table: "carbon_price_evidence", singular: "Carbon price evidence", plural: "Carbon price evidence", order: "created_at",
  searchKeys: ["scheme", "country", "notes"],
  description: "Record evidence of a carbon price paid in the country of origin. A record only counts once a reviewer validates it.",
  fields: [
    { key: "country", label: "Country", type: "select", options: countryOpts },
    { key: "scheme", label: "Carbon pricing scheme" },
    { key: "product_id", label: "Product", type: "ref", ref: "products" },
    { key: "supplier_id", label: "Supplier", type: "ref", ref: "suppliers" },
    { key: "emissions_covered_t", label: "Emissions covered (tCO2e)", type: "number" },
    { key: "amount_paid", label: "Amount paid", type: "number" },
    { key: "currency", label: "Currency", default: "EUR" },
    { key: "validation_status", label: "Validation", type: "select", status: true, required: true, default: "pending", options: [["pending", "Pending"], ["validated", "Validated"], ["rejected", "Rejected"]], hint: "Set to Validated only after checking supporting documents against the applicable rules." },
    { key: "notes", label: "Notes", type: "textarea", table: false },
  ],
};

export const classCfg: ResourceConfig = {
  table: "product_classifications", singular: "Classification entry", plural: "Classification entries", order: "cn_code", asc: true, csv: true, dupKeys: ["cn_code"],
  searchKeys: ["cn_code", "description"],
  description: "Your reference list of CN codes that you have verified against official sources. Products are checked against it. Nothing is preloaded.",
  fields: [
    { key: "cn_code", label: "CN code", required: true, hint: "8 digits" },
    { key: "description", label: "Description" },
    { key: "sector", label: "Sector", type: "select", options: categories },
    { key: "in_scope", label: "In CBAM scope", type: "select", required: true, default: "true", options: [["true", "Yes"], ["false", "No"]] },
    { key: "source_url", label: "Source link", table: false },
    { key: "last_reviewed_at", label: "Last reviewed", type: "date" },
  ],
  validate: (v) => (v.cn_code && !cnFormatOk(String(v.cn_code)) ? "CN code must have 8 digits." : null),
};

export const sourcesCfg: ResourceConfig = {
  table: "regulatory_sources", singular: "Regulatory source", order: "title", asc: true,
  searchKeys: ["title", "publisher", "category"],
  description: "Official publications you rely on. Each source shows when it was last reviewed by your team.",
  fields: [
    { key: "title", label: "Title", required: true },
    { key: "url", label: "Link to original source", required: true },
    { key: "publisher", label: "Publisher" },
    { key: "category", label: "Category" },
    { key: "verification_status", label: "Verification", type: "select", required: true, default: "requires_verification", status: true, options: [["requires_verification", "Requires verification"], ["verified", "Verified"]] },
    { key: "last_reviewed_at", label: "Last reviewed", type: "date" },
    { key: "notes", label: "Notes", type: "textarea", table: false },
  ],
  validate: (v) => (v.url && !/^https?:\/\//i.test(String(v.url)) ? "The link must start with http or https." : null),
};
export const updatesCfg: ResourceConfig = {
  table: "regulatory_updates", singular: "Regulatory update", order: "published_date",
  searchKeys: ["title", "summary", "category"],
  description: "Record changes to guidance, methodologies, factors, prices and deadlines. This list is your regulatory change history.",
  fields: [
    { key: "title", label: "Title", required: true },
    { key: "published_date", label: "Published", type: "date" },
    { key: "category", label: "Type", type: "select", options: [["legislation", "Legislation"], ["guidance", "Reporting guidance"], ["sector", "Sector information"], ["methodology", "Calculation methodology"], ["emissions_factor", "Emissions factor"], ["certificate_price", "Certificate pricing"], ["deadline", "Deadline"], ["publication", "Official publication"]] },
    { key: "url", label: "Link to original source" },
    { key: "review_status", label: "Verification", type: "select", required: true, default: "requires_verification", status: true, options: [["requires_verification", "Requires verification"], ["verified", "Verified"]] },
    { key: "reviewed_at", label: "Reviewed on", type: "date" },
    { key: "summary", label: "Summary", type: "textarea", table: false },
  ],
};
