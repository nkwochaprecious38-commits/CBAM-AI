import Link from "next/link";
import { ArrowRight, Calculator, Users, Ship, Leaf, FileCheck2, FolderLock, Landmark, Bot } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { Section, CtaBand, Disclaimer } from "@/components/Marketing";
import { DashboardPreview } from "@/components/DashboardPreview";
import { featureCards, problems, steps, audiences } from "@/lib/content";

const icons = [Calculator, Users, Ship, Leaf, FileCheck2, FolderLock, Landmark, Bot];
const metrics = [
  ["Total imports tracked", "412 records"], ["Total embedded emissions", "36,980 tCO2e"], ["Supplier submissions received", "38"],
  ["Pending supplier submissions", "15"], ["Products requiring review", "9"], ["Compliance documentation", "81% complete"], ["Upcoming reporting deadlines", "3"],
];

export default function Home() {
  return (
    <PublicShell>
      <section className="border-b border-line bg-sand/60">
        <div className="container-x grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald">Carbon Border Adjustment Mechanism</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] sm:text-5xl">Take Control of Your CBAM Compliance.</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">Collect supplier emissions data, calculate embedded carbon, organize compliance documents, and prepare CBAM reporting with one intelligent platform.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary">Get Started <ArrowRight size={16} /></Link>
              <Link href="/platform" className="btn-secondary">Explore the Platform</Link>
            </div>
            <p className="mt-6 text-sm text-muted">For importers, manufacturers, customs representatives, procurement teams and sustainability professionals.</p>
          </div>
          <DashboardPreview />
        </div>
      </section>

      <Section title="CBAM compliance is a data problem before it is a reporting problem." intro="Most teams start with spreadsheets and email. That works until the volume of suppliers, products and evidence grows." tone="white">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map(([t, d]) => (
            <div key={t} className="card p-5"><h3 className="text-base font-bold">{t}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{d}</p></div>
          ))}
        </div>
        <div className="mt-8 rounded-2xl bg-mint p-6">
          <h3 className="text-lg font-bold">One connected workspace</h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-charcoal">CBAM AI links imports, products, suppliers, emissions records, documents and reporting. Each figure keeps its source, period and status, and each important change is written to an audit log.</p>
        </div>
      </Section>

      <Section title="Core platform features" tone="off">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((f, i) => { const I = icons[i]; return (
            <Link key={f.t} href={f.h} className="card group p-5 transition hover:border-emerald">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-mint text-emerald"><I size={20} /></span>
              <h3 className="mt-4 text-base font-bold">{f.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.d}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald">Learn more <ArrowRight size={14} /></span>
            </Link>); })}
        </div>
      </Section>

      <Section title="How CBAM AI works" tone="white">
        <ol className="grid gap-4 md:grid-cols-4">
          {steps.map(([t, d], i) => (
            <li key={t} className="card p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest font-heading text-sm font-bold text-white">{i + 1}</span>
              <h3 className="mt-4 text-base font-bold">{t}</h3><p className="mt-2 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Who uses CBAM AI" tone="mint">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {audiences.map(([t, d]) => (<div key={t} className="rounded-2xl bg-white p-5 shadow-card"><h3 className="text-base font-bold">{t}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{d}</p></div>))}
        </div>
      </Section>

      <Section title="Dashboard preview" intro="Sample metrics shown below are demonstration data. Your workspace shows your own records once you add or upload them." tone="white">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(([k, v]) => (<div key={k} className="card p-5"><div className="text-sm text-muted">{k}</div><div className="mt-1 font-heading text-2xl font-extrabold text-forest">{v}</div><div className="mt-2 text-xs font-semibold text-[#9a6513]">Demonstration data</div></div>))}
        </div>
      </Section>

      <CtaBand title="Bring Clarity to Your Carbon Compliance Process." button="Start With CBAM AI" />
      <Disclaimer />
    </PublicShell>
  );
}
