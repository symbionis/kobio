"use client";

import { FileCheck, Mic } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../lib/cn";

const LINKS = [
  { href: "/quotes", label: "Devis" },
  { href: "/products", label: "Produits" },
  { href: "/clients", label: "Clients" },
  { href: "/settings", label: "Réglages" },
];

export default function TopNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-paper/86 border-b border-line-2">
      <div className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 h-[66px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dark text-[#ffefe0] flex items-center justify-center shadow-sm">
            <FileCheck size={20} />
          </div>
          <div className="leading-tight text-left">
            <div className="font-display text-[22px] -mb-[2px] tracking-tight">Kobio</div>
            <div className="text-[11px] text-zinc-500 font-mono-label">voix → devis</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-[13.8px] text-zinc-600">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "transition hover:text-black",
                isActive(l.href) && "text-black font-semibold",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/new"
          className="inline-flex items-center gap-2 rounded-full bg-brand text-white px-4 py-2.5 text-[13.5px] font-[650] shadow-[0_6px_22px_rgba(255,90,20,.30)] hover:bg-brand-dark transition"
        >
          <Mic size={17} /> Dicter un devis
        </Link>
      </div>
    </header>
  );
}
