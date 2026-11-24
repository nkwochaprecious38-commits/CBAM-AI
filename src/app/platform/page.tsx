import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { PageHero, Section, CtaBand, Disclaimer } from "@/components/Marketing";
import { modules } from "@/lib/content";

export const metadata = { title: "Platform: CBAM AI" };

export default function Platform() {
  return (
    <PublicShell>
      <PageHero eyebrow="Platform" title="One Platform for Your Entire CBAM Workflow." text="CBAM AI connects data collection, supplier engagement, emissions calculations, documentation, and reporting, so each step builds on records you can inspect.">
        <Link href="/signup" className="btn-primary">Get Started</Link><Link href="/features" className="btn-secondary">View all features</Link>
      </PageHero>
      <Section title="How the modules work together" intro="Data moves from left to right. Each module reads the records of the previous one, and every important change is written to the audit log." tone="off">
        <div className="grid gap-3 md:grid-cols-5">
          {["Imports and products", "Supplier data", "Emissions records", "Documents and evidence", "Reporting and monitoring"].map((s, i) => (
            <div key={s} className="relative card p-4 text-center">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-emerald text-sm font-bold text-white">{i + 1}</div>
              <div className="mt-3 text-sm font-semibold text-forest">{s}</div>
              {i < 4 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-emerald md:block" size={20} />}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-line bg-mint p-4 text-center text-sm font-medium text-forest">Compliance Intelligence runs across all five: validation, anomaly checks, deadlines and regulatory sources</div>
      </Section>
      <Section title="Platform modules" tone="white">
        <div className="grid gap-5 md:grid-cols-2">
          {modules.map((m) => (
            <article key={m.t} className="card p-6">
              <h3 className="text-xl font-bold">{m.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{m.d}</p>
              <ul className="mt-4 space-y-2">{m.p.map((p) => <li key={p} className="flex items-start gap-2 text-sm"><Check size={16} className="mt-0.5 shrink-0 text-emerald" />{p}</li>)}</ul>
            </article>
          ))}
        </div>
      </Section>
      <Section title="Built for review, not black boxes" tone="sand" >
        <div className="grid gap-4 md:grid-cols-3">
          {[["Transparent calculations", "Inputs, factors, assumptions and results are stored with every calculation."], ["Human approval", "Reports move through internal review. Approval needs a different person than the one who submitted."], ["Organization isolation", "Row level security keeps each organization's data separate at the database."]].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-white p-5 shadow-card"><h3 className="font-bold">{t}</h3><p className="mt-2 text-sm text-muted">{d}</p></div>))}
        </div>
      </Section>
      <CtaBand title="See the whole workflow in one workspace." button="Get Started" />
      <Disclaimer />
    </PublicShell>
  );
}
