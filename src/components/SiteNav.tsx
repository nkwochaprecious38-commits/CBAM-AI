"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const links = [
  { href: "/", label: "Home" },
  { href: "/platform", label: "Platform" },
  { href: "/solutions", label: "Solutions" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const cls = (href: string) =>
    `rounded-md px-3 py-2 text-sm font-medium transition ${path === href ? "bg-mint text-forest" : "text-charcoal hover:text-forest hover:bg-mint/60"}`;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-offwhite/90 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between">
        <Link href="/" aria-label="CBAM AI home"><Logo /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {links.map((l) => <Link key={l.href} href={l.href} className={cls(l.href)}>{l.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login" className="btn-ghost">Log In</Link>
          <Link href="/signup" className="btn-primary">Get Started</Link>
        </div>
        <button className="rounded-md p-2 text-forest lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-white lg:hidden">
          <div className="container-x flex flex-col gap-1 py-3">
            {links.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={cls(l.href)}>{l.label}</Link>)}
            <Link href="/login" onClick={() => setOpen(false)} className="btn-secondary mt-2">Log In</Link>
            <Link href="/signup" onClick={() => setOpen(false)} className="btn-primary">Get Started</Link>
          </div>
        </div>
      )}
    </header>
  );
}
