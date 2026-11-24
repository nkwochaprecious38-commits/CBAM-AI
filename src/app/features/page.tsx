import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { PageHero, CtaBand, Disclaimer, StatusPill } from "@/components/Marketing";
import { featureGroups } from "@/lib/content";

export const metadata = { title: "Features: CBAM AI" };

function Example({ id }: { id: string }) {
  const rows: Record<string, string[][]> = {
    emissions: [["Steel coil, sample", "Actual", "Verified"], ["Aluminium sheet, sample", "Default", "Needs review"], ["Fertiliser, sample", "Estimated", "Pending verification"]],
    suppliers: [["Supplier A, sample", "Submitted", "In review"], ["Supplier B, sample", "Requested", "Due soon"], ["Supplier C, sample", "Correction requested", "Open"]],
    imports: [["IMP, sample 001", "Origin set", "Valid"], ["IMP, sample 002", "CN code missing", "Flagged"], ["IMP, sample 003", "Possible duplicate", "Review"]],
    reporting: [["Draft declaration", "In review", "Awaiting approver"], ["Readiness", "9 of 14", "Open items"], ["Export", "CSV and JSON", "Available"]],
    documents: [["Supplier declaration", "Version 2", "All members"], ["Customs record", "Version 1", "Managers"], ["Verification report", "Version 1", "Managers"]],
    assurance: [["Unit mismatch", "Flagged", "Explained"], ["Unusual intensity", "Review", "Human decision"], ["Audit entry", "Recorded", "Read only"]],
  };
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-offwhite px-4 py-2 text-xs"><span className="font-semibold text-forest">Interface preview</span><span className="text-[#9a6513] font-semibold">Demonstration data</span></div>
      {rows[id].map((r) => (
        <div key={r[0]} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 text-sm last:border-0">
          <span className="font-medium text-charcoal">{r[0]}</span><span className="hidden text-muted sm:inline">{r[1]}</span><StatusPill tone="neutral">{r[2]}</StatusPill>
        </div>))}
    </div>
  );
}

export default function Features() {
  let n = 0;
  return (
    <PublicShell>
      <PageHero eyebrow="Features" title="Everything You Need to Manage CBAM Compliance." text="A directory of what CBAM AI does, grouped by the part of the workflow it supports.">
        <Link href="/signup" className="btn-primary">Get Started</Link>
      </PageHero>
      <div className="border-b border-line bg-white"><div className="container-x flex flex-wrap gap-2 py-4">
        {featureGroups.map((g) => <a key={g.id} href={`#${g.id}`} className="rounded-full border border-line px-3 py-1.5 text-sm text-forest hover:bg-mint">{g.title}</a>)}
      </div></div>
      {featureGroups.map((g, gi) => (
        <section key={g.id} id={g.id} className={`scroll-mt-20 border-b border-line ${gi % 2 ? "bg-offwhite" : "bg-white"}`}>
          <div className="container-x grid gap-10 py-14 lg:grid-cols-5">
            <div className="lg:col-span-2 lg:sticky lg:top-24 lg:self-start">
              <h2 className="text-3xl font-extrabold">{g.title}</h2>
              <div className="mt-6"><Example id={g.id} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3">
              {g.items.map(([t, d]) => { n++; return (
                <article key={t} className="card p-5">
                  <div className="text-xs font-semibold text-emerald">{String(n).padStart(2, "0")}</div>
                  <h3 className="mt-1 text-base font-bold">{t}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
                </article>); })}
            </div>
          </div>
        </section>
      ))}
      <CtaBand title="Bring Clarity to Your Carbon Compliance Process." button="Start With CBAM AI" />
      <Disclaimer />
    </PublicShell>
  );
}
