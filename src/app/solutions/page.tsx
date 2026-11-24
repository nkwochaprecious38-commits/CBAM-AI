import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { PageHero, Section, CtaBand, Disclaimer } from "@/components/Marketing";
import { solutions } from "@/lib/content";

export const metadata = { title: "Solutions: CBAM AI" };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, "_");

export default function Solutions() {
  return (
    <PublicShell>
      <PageHero eyebrow="Solutions" title="CBAM Compliance Solutions for Global Trade." text="Different roles carry different parts of CBAM. CBAM AI gives each of them a structured way to work with the same underlying records.">
        <Link href="/signup" className="btn-primary">Get Started</Link>
      </PageHero>
      <div className="border-b border-line bg-white">
        <div className="container-x flex flex-wrap gap-2 py-4">
          {solutions.map((s) => <a key={s.t} href={`#${slug(s.t)}`} className="rounded-full border border-line px-3 py-1.5 text-sm text-forest hover:bg-mint">{s.t}</a>)}
        </div>
      </div>
      {solutions.map((s, i) => (
        <section key={s.t} id={slug(s.t)} className={`scroll-mt-20 border-b border-line ${i % 2 ? "bg-offwhite" : "bg-white"}`}>
          <div className="container-x grid gap-8 py-12 lg:grid-cols-5">
            <div className="lg:col-span-2"><h2 className="text-2xl font-extrabold">{s.t}</h2><p className="mt-3 text-base leading-relaxed text-muted">{s.d}</p></div>
            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-3">
              {[["Business challenge", s.c], ["CBAM AI workflow", s.w], ["Practical value", s.v]].map(([h, b]) => (
                <div key={h} className="card p-5"><div className="text-xs font-semibold uppercase tracking-wide text-emerald">{h}</div><p className="mt-2 text-sm leading-relaxed text-charcoal">{b}</p></div>))}
            </div>
          </div>
        </section>
      ))}
      <Section tone="mint"><p className="max-w-3xl text-sm leading-relaxed text-charcoal">Which products and importers fall within CBAM depends on CN codes, the importer's situation and the rules in force. CBAM AI helps you organize that information. It does not make legal determinations. Confirm scope and thresholds against current official sources.</p></Section>
      <CtaBand title="Bring Clarity to Your Carbon Compliance Process." button="Start With CBAM AI" />
      <Disclaimer />
    </PublicShell>
  );
}
