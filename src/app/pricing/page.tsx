import { Check } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { PageHero, Disclaimer } from "@/components/Marketing";

export const metadata = { title: "Pricing: CBAM AI" };

// Selar URLs must be preserved exactly. Price and plan detail fields are editable placeholders until verified.
const plans = [
  { name: "Starter", desc: "Designed for smaller importers and businesses beginning their CBAM data management and compliance preparation.", href: "https://selar.com/47plan?currency=USD", cta: "Get Started", featured: false },
  { name: "Professional", desc: "Designed for growing importers and businesses managing multiple suppliers, products, import records, and emissions reporting workflows.", href: "https://selar.com/57plan?currency=USD", cta: "Choose Professional", featured: true },
  { name: "Enterprise", desc: "Designed for larger importers, industrial businesses, customs representatives, and organizations requiring advanced compliance management and multi team collaboration.", href: "https://selar.com/97plan?currency=USD", cta: "Contact Sales", featured: false },
];
const faqs = [
  ["How do I pay?", "Each plan button opens its checkout page on Selar, where current pricing and billing terms are shown."],
  ["Which plan includes which limits?", "Plan limits are shown at checkout. Pricing details on this page are placeholders until they are confirmed."],
  ["Can I change plans later?", "Plan changes are handled through the checkout provider. Contact the CBAM AI team if you need help."],
  ["Does a plan guarantee compliance?", "No. CBAM AI supports data management and reporting preparation. Legal decisions and official submissions remain with authorized people."],
  ["Is my data separated from other customers?", "Yes. Each organization's data is isolated at the database level with row level security."],
  ["Can I create an account before choosing a plan?", "Yes. Sign up creates your workspace. You can choose a plan when you are ready."],
];

export default function Pricing() {
  return (
    <PublicShell>
      <PageHero eyebrow="Pricing" title="Choose the plan that fits your CBAM workload." text="Three plans, from first steps to multi team compliance operations." />
      <section className="border-b border-line bg-offwhite">
        <div className="container-x grid items-stretch gap-6 py-14 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={`card relative flex flex-col p-7 ${p.featured ? "border-2 border-emerald md:-my-3 md:py-10 shadow-[0_18px_44px_rgba(39,134,109,.18)]" : ""}`}>
              {p.featured && <span className="badge absolute -top-3 left-7 bg-emerald text-white">Featured plan</span>}
              <h2 className="text-2xl font-extrabold">{p.name}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{p.desc}</p>
              <div className="my-6 rounded-xl bg-mint p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Price</div>
                <div className="mt-1 font-heading text-lg font-bold text-forest">[Price shown at checkout]</div>
                <div className="mt-1 text-xs text-muted">[Billing interval to be confirmed]</div>
              </div>
              <ul className="mb-7 space-y-2 text-sm">
                {["[Plan inclusions to be confirmed]", "[Usage limits to be confirmed]", "[Support level to be confirmed]"].map((x) => <li key={x} className="flex gap-2 text-muted"><Check size={16} className="mt-0.5 shrink-0 text-emerald" />{x}</li>)}
              </ul>
              <a href={p.href} target="_blank" rel="noopener noreferrer" className={`mt-auto ${p.featured ? "btn-primary" : "btn-secondary"} w-full`}>{p.cta}</a>
            </div>
          ))}
        </div>
      </section>
      <section className="border-b border-line bg-white">
        <div className="container-x max-w-3xl py-14">
          <h2 className="text-3xl font-extrabold">Pricing questions</h2>
          <div className="mt-6 divide-y divide-line rounded-2xl border border-line">
            {faqs.map(([q, a]) => (
              <details key={q} className="group p-5"><summary className="cursor-pointer list-none font-semibold text-forest">{q}</summary><p className="mt-2 text-sm leading-relaxed text-muted">{a}</p></details>
            ))}
          </div>
        </div>
      </section>
      <Disclaimer />
    </PublicShell>
  );
}
