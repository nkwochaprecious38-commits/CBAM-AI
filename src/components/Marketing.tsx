import Link from "next/link";
import type { ReactNode } from "react";

export function PageHero({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children?: ReactNode }) {
  return (
    <section className="bg-sand/60 border-b border-line">
      <div className="container-x py-16 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{text}</p>
        {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
      </div>
    </section>
  );
}

export function Section({ title, intro, children, tone = "white" }: { title?: string; intro?: string; children: ReactNode; tone?: "white" | "mint" | "off" | "sand" }) {
  const bg = tone === "sand" ? "bg-sand/60" : tone === "mint" ? "bg-mint/50" : tone === "off" ? "bg-offwhite" : "bg-white";
  return (
    <section className={`${bg} border-b border-line`}>
      <div className="container-x py-14 sm:py-16">
        {title && <h2 className="max-w-2xl text-3xl font-extrabold leading-tight">{title}</h2>}
        {intro && <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{intro}</p>}
        <div className={title ? "mt-9" : ""}>{children}</div>
      </div>
    </section>
  );
}

export function Disclaimer() {
  return (
    <div className="container-x pb-10 pt-6">
      <p className="rounded-xl border border-line bg-white p-4 text-xs leading-relaxed text-muted">
        CBAM AI is a compliance management and reporting support platform. It does not replace legal advice, accredited emissions
        verification, customs representation, or official regulatory approval. CBAM AI is not certified or endorsed by the European
        Commission and does not guarantee compliance. Figures shown on this website are demonstration data.
      </p>
    </div>
  );
}

export function CtaBand({ title, button, href = "/signup" }: { title: string; button: string; href?: string }) {
  return (
    <section className="bg-forest">
      <div className="container-x flex flex-col items-start justify-between gap-6 py-14 sm:flex-row sm:items-center">
        <h2 className="max-w-xl text-3xl font-extrabold leading-tight text-white">{title}</h2>
        <Link href={href} className="btn bg-white text-forest hover:bg-mint">{button}</Link>
      </div>
    </section>
  );
}

export function StatusPill({ tone, children }: { tone: "ok" | "warn" | "bad" | "neutral"; children: ReactNode }) {
  const c = { ok: "bg-success/10 text-success", warn: "bg-warn/15 text-[#9a6513]", bad: "bg-danger/10 text-danger", neutral: "bg-mint text-forest" }[tone];
  return <span className={`badge ${c}`}>{children}</span>;
}
