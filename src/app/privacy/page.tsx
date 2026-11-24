import { PublicShell } from "@/components/PublicShell";

export const metadata = { title: "Privacy notice: CBAM AI" };
export default function Page() {
  return (
    <PublicShell>
      <div className="container-x max-w-3xl py-16">
        <h1 className="text-4xl font-extrabold">Privacy notice</h1>
        <p className="mt-4 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm">This is a draft placeholder. Replace this page with the legal text approved by your counsel before launch.</p>
        <p className="mt-6 text-sm leading-relaxed text-muted">CBAM AI is a compliance management and reporting support platform. It does not replace legal advice, accredited emissions verification, customs representation, or official regulatory approval.</p>
      </div>
    </PublicShell>
  );
}
