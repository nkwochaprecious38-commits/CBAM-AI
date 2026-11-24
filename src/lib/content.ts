export const featureCards = [
  { t: "CBAM Emissions Calculator", d: "Estimate embedded emissions per product with visible inputs, assumptions, emissions factors and methodology records.", h: "/features#emissions" },
  { t: "Supplier Data Collection", d: "Invite suppliers to a secure portal, track responses, send reminders, and review what they submit.", h: "/features#suppliers" },
  { t: "Import and Product Management", d: "Keep products, CN codes, countries of origin, shipments and customs references in one structured place.", h: "/features#imports" },
  { t: "Embedded Emissions Tracking", d: "See direct, indirect and precursor emissions with a source, period and data status on every value.", h: "/features#emissions" },
  { t: "Compliance Reporting", d: "Prepare declaration data, run it through internal review, and export structured information.", h: "/features#reporting" },
  { t: "Document Management", d: "Store declarations, production records and customs documents with versions and permissions.", h: "/features#documents" },
  { t: "Regulatory Monitoring", d: "Track official sources, guidance and deadlines, with the date each item was last reviewed.", h: "/features#assurance" },
  { t: "AI Compliance Assistant", d: "Ask questions about your own records. Answers label facts, calculations, estimates and suggestions.", h: "/features#assurance" },
];

export const problems = [
  ["Supplier emissions data is hard to collect", "Requests, reminders and files move through email threads and shared drives."],
  ["Import information sits in different systems", "Shipment, product and customs data rarely line up without manual work."],
  ["Manual calculations invite errors", "Spreadsheet formulas drift, and nobody can see how a figure was produced."],
  ["Documentation is difficult to track", "Teams cannot easily tell which evidence is missing for which product."],
  ["Reporting readiness is unclear", "Compliance teams lack a single view of what is complete and what is open."],
  ["Supplier communication is uncoordinated", "Different teams chase the same suppliers with different requests."],
  ["Regulatory requirements can change", "Guidance and methodology updates need to be tracked against current work."],
  ["Emissions data must be traceable", "Reviewers need to see who changed what, when, and on what evidence."],
];

export const steps = [
  ["Import your data", "Add shipments, products and suppliers manually or with CSV files."],
  ["Collect emissions data and evidence", "Request supplier submissions and attach supporting documents."],
  ["Calculate and review embedded emissions", "Review inputs, assumptions and factors for every calculation."],
  ["Prepare reports and monitor obligations", "Run internal approval, export structured data, and follow deadlines."],
];

export const audiences = [
  ["Importers", "Organize imported goods, request supplier data, and see which records are ready for reporting."],
  ["Manufacturers", "Provide structured emissions information and evidence to your EU customers."],
  ["Customs representatives", "Keep client records, documents and reporting workflows organized for authorized clients."],
  ["Procurement teams", "Track supplier response rates and find missing data before it becomes a deadline problem."],
  ["Sustainability professionals", "Connect product and supplier emissions information to wider data management."],
];

export const modules = [
  { t: "Emissions Measurement", d: "Calculate and organize embedded emissions using relevant activity data, product information, supplier submissions, and applicable emissions methodologies.", p: ["Activity data and emissions factors", "Actual, default and estimated values", "Stored calculation records"] },
  { t: "Supplier Data Management", d: "Collect, review, validate, and organize emissions information received from suppliers and production facilities.", p: ["Supplier portal and invitations", "Approve, reject or request corrections", "Response tracking and reminders"] },
  { t: "Import Management", d: "Organize imported goods, quantities, product categories, countries of origin, customs information, and relevant reporting periods.", p: ["CSV upload with validation", "CN code and origin tracking", "Customs reference records"] },
  { t: "Compliance Documentation", d: "Maintain supporting evidence, supplier declarations, emissions information, and import documentation in one secure workspace.", p: ["Folders, categories and search", "Version history", "Access permissions"] },
  { t: "CBAM Reporting", d: "Prepare structured reporting information and organize the data needed for annual CBAM declarations.", p: ["Reporting readiness checks", "Internal review and approval", "Structured export"] },
  { t: "Compliance Intelligence", d: "Monitor outstanding information, missing documents, potential calculation issues, reporting deadlines, and regulatory updates.", p: ["Validation and anomaly checks", "Deadline monitoring", "Regulatory source tracking"] },
];

export const solutions = [
  { t: "EU Importers", d: "Organize imported goods, collect supplier emissions data, calculate embedded emissions, and manage CBAM compliance workflows.", c: "Import data, supplier data and calculations live in separate files, so reporting readiness is hard to judge.", w: "Import records link to products and suppliers. Supplier submissions feed emissions records. The reporting workspace shows what is complete and what is missing.", v: "One reviewable record of how each figure was produced." },
  { t: "Steel and Aluminium Businesses", d: "Manage product information, production facilities, emissions data, supplier documentation, and import records.", c: "Products are made at several facilities, each with its own process data and precursor inputs.", w: "Products link to facilities. Activity data, precursor emissions and evidence are recorded against the facility and period.", v: "Clearer facility level data, with sources and status on every value." },
  { t: "Cement and Fertiliser Importers", d: "Organize product quantities, supplier information, emissions calculations, and reporting documentation.", c: "Many product lines and suppliers make it difficult to see which items still lack emissions data.", w: "Products are checked against your classification list, suppliers are tracked by response status, and calculations are stored per product.", v: "Fewer surprises close to a reporting deadline." },
  { t: "Electricity and Hydrogen Businesses", d: "Manage applicable activity data, emissions information, and regulatory documentation for covered imports.", c: "Activity data and documentation requirements differ from those for other covered goods.", w: "Activity data, methodology records and evidence are held together, with regulatory sources tracked alongside.", v: "A structured record that reviewers can follow." },
  { t: "Manufacturers and Exporters", d: "Provide structured emissions information and supporting documentation to EU customers and importers.", c: "Customers each ask for emissions data in a different format.", w: "Use the supplier portal to answer requests once, attach evidence, and respond to correction requests.", v: "Less repeated work and a clear submission history." },
  { t: "Customs Representatives", d: "Organize client information, import records, supporting documents, and CBAM reporting workflows for authorized clients.", c: "Each client sends data in a different shape, and documents are scattered.", w: "Keep records, documents and review steps organized, with role based access for your team.", v: "Consistent preparation across clients, with an audit trail." },
  { t: "Supply Chain and Procurement Teams", d: "Collect supplier information, monitor response rates, identify missing data, and improve visibility across the supply chain.", c: "It is hard to know which suppliers have responded and whose data is incomplete.", w: "Track requests, deadlines and reminders. Review submissions and request corrections in one place.", v: "A live view of supplier response and data gaps." },
  { t: "Sustainability and ESG Teams", d: "Connect product and supplier emissions information to broader sustainability data management and reporting processes.", c: "CBAM data is handled separately from wider emissions data, so it is hard to reuse.", w: "Emissions records keep source, period and status, and can be exported for use in other reporting.", v: "Consistent, traceable emissions information across reporting needs." },
];

export const featureGroups: { id: string; title: string; items: [string, string][] }[] = [
  { id: "emissions", title: "Emissions", items: [
    ["CBAM Emissions Calculator", "Combine activity data, factors and methodology records to estimate embedded emissions per product. Every result keeps its inputs and assumptions, so reviewers can see how it was produced."],
    ["Embedded Emissions Tracking", "Track direct, indirect and precursor emissions per product, facility and period, each with a source and data status."],
    ["Scope 1 Emissions Data Management", "Record direct emissions from production processes and fuel use, with evidence and measurement periods."],
    ["Scope 2 Emissions Data Management", "Record emissions linked to purchased electricity and heat where they apply to the product, with the factor and source used."],
    ["Relevant Scope 3 Data Management", "Record upstream data that is relevant to embedded emissions, such as precursor materials, and keep it linked to its supplier."],
    ["Emissions Factor Management", "Maintain your own library of emissions factors with source, validity dates and verification status. Nothing is preloaded, so you control which references are used."],
    ["Actual and Default Value Support", "Mark each value as actual, default, estimated or pending verification, so the basis of every figure is visible."],
  ]},
  { id: "suppliers", title: "Suppliers", items: [
    ["Supplier Data Collection", "Request emissions information from suppliers with a deadline, a product and a facility. Track the status of each request."],
    ["Supplier Portal", "Suppliers sign in to a dedicated portal, submit data and files, and respond to correction requests. They see only their own requests."],
    ["Production Facility Management", "Maintain production facilities per supplier, with country, sector and process information."],
  ]},
  { id: "imports", title: "Imports and products", items: [
    ["Product Catalog Management", "Keep products with CN codes, categories, units, suppliers and facilities. Scope status is checked, not assumed."],
    ["Import and Shipment Tracking", "Record imports with quantities, dates, origin and reporting period. Upload many records with CSV and see validation results before saving."],
    ["Customs Data Management", "Store customs references against each import and keep related documents together."],
    ["Country of Origin Tracking", "Record origin for each import and analyze emissions and volumes by country."],
  ]},
  { id: "reporting", title: "Reporting and finance", items: [
    ["Compliance Reporting", "Select a reporting period, review the data, generate a draft and export structured information."],
    ["Reporting Deadline Management", "Keep reporting periods and deadlines as editable records with their source, so they can follow official updates."],
    ["Carbon Price Documentation", "Record evidence of a carbon price paid in the country of origin. A record only counts once it is validated."],
    ["CBAM Certificate Planning", "Build scenarios with a reference price you enter and source. Estimates are labeled as estimates, never as confirmed obligations."],
  ]},
  { id: "documents", title: "Documents", items: [
    ["Document Management", "Upload, organize and search documents. Keep version history and control who can see each file."],
  ]},
  { id: "assurance", title: "Data quality and assurance", items: [
    ["Data Validation", "Check records for missing supplier data, invalid CN codes, unit conflicts and missing documents. Each flag explains why."],
    ["Anomaly Detection", "Highlight unusual emissions intensities and duplicate imports for human review. Submitted data is never changed silently."],
    ["Audit Trails", "Important changes are written to a log that users cannot edit or delete."],
    ["Regulatory Updates", "Track official sources and updates with the date each was last reviewed and a verification status."],
    ["AI Compliance Assistant", "Ask questions about your own records. Answers separate verified facts, calculations, estimates and suggestions, and cite sources. It does not make legal decisions or submit filings."],
  ]},
];
