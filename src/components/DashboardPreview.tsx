// Static, illustrative preview of the product. All figures are demonstration data.
const cats = [
  { n: "Iron and steel", v: 62, c: "#163D35" },
  { n: "Aluminium", v: 41, c: "#27866D" },
  { n: "Fertilisers", v: 24, c: "#A8C8B5" },
  { n: "Cement", v: 14, c: "#D99A3E" },
];
const kpis = [
  ["Total imported goods", "18,420 t"],
  ["Embedded emissions", "36,980 tCO2e"],
  ["Supplier data completion", "72%"],
  ["Outstanding documents", "14"],
];

export function DashboardPreview() {
  const r = 34, circ = 2 * Math.PI * r;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_rgba(16,44,41,.14)]" role="img" aria-label="Preview of the CBAM AI dashboard with demonstration data">
      <div className="flex items-center justify-between border-b border-line bg-offwhite px-4 py-2.5">
        <div className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-line" /><i className="h-2.5 w-2.5 rounded-full bg-line" /><i className="h-2.5 w-2.5 rounded-full bg-line" /></div>
        <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#9a6513]">Demonstration data</span>
      </div>
      <div className="grid grid-cols-[56px_1fr] sm:grid-cols-[150px_1fr]">
        <div className="bg-forest p-3 text-[11px] text-sage">
          {["Overview", "Imports", "Suppliers", "Emissions", "Reporting", "Compliance"].map((x, i) => (
            <div key={x} className={`mb-1 truncate rounded-md px-2 py-1.5 ${i === 0 ? "bg-emerald text-white" : ""}`}>
              <span className="hidden sm:inline">{x}</span><span className="sm:hidden">{x[0]}</span>
            </div>
          ))}
        </div>
        <div className="space-y-3 bg-offwhite p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {kpis.map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line bg-white p-2.5">
                <div className="text-[10px] text-muted">{k}</div><div className="font-heading text-sm font-bold text-forest sm:text-base">{v}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            <div className="rounded-xl border border-line bg-white p-3 sm:col-span-3">
              <div className="mb-2 text-[11px] font-semibold text-forest">Emissions by product category (ktCO2e)</div>
              {cats.map((c) => (
                <div key={c.n} className="mb-1.5 flex items-center gap-2 text-[10px] text-muted">
                  <span className="w-20 shrink-0">{c.n}</span>
                  <span className="h-3 flex-1 rounded bg-mint"><span className="block h-3 rounded" style={{ width: `${c.v}%`, background: c.c }} /></span>
                  <span className="w-6 text-right text-charcoal">{c.v}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 sm:col-span-2">
              <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
                <circle cx="42" cy="42" r={r} fill="none" stroke="#E5F0E9" strokeWidth="9" />
                <circle cx="42" cy="42" r={r} fill="none" stroke="#27866D" strokeWidth="9" strokeDasharray={`${circ * 0.64} ${circ}`} strokeLinecap="round" transform="rotate(-90 42 42)" />
                <text x="42" y="46" textAnchor="middle" fontSize="15" fontWeight="700" fill="#163D35">64%</text>
              </svg>
              <div className="text-[10px] leading-snug text-muted"><div className="text-[11px] font-semibold text-forest">Reporting readiness</div>9 of 14 requirements complete</div>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-white p-3 text-[11px]">
            <div className="mb-1.5 font-semibold text-forest">Upcoming deadlines</div>
            {[["Supplier submissions close", "Sample date", "warn"], ["Internal review of draft declaration", "Sample date", "ok"]].map(([a, b, t]) => (
              <div key={a} className="flex items-center justify-between border-t border-line py-1.5 text-muted">
                <span>{a}</span><span className={`badge ${t === "warn" ? "bg-warn/15 text-[#9a6513]" : "bg-success/10 text-success"}`}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
