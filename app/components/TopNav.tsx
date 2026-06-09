"use client";

import { FileCheck, Mic } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { browserClient, hasBrowserAuthConfig } from "../../src/db/supabase/browser";
import { cn } from "../lib/cn";

const LINKS = [
  { href: "/quotes", label: "Devis" },
  { href: "/products", label: "Produits" },
  { href: "/clients", label: "Clients" },
  { href: "/settings", label: "Réglages" },
];

type AuthState = { status: "loading" | "anon" | "authed"; email?: string };

export default function TopNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const [auth, setAuth] = useState<AuthState>(
    hasBrowserAuthConfig() ? { status: "loading" } : { status: "anon" },
  );

  useEffect(() => {
    if (!hasBrowserAuthConfig()) return;
    const supabase = browserClient();
    supabase.auth.getUser().then(({ data }) =>
      setAuth(data.user ? { status: "authed", email: data.user.email ?? undefined } : { status: "anon" }),
    );
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuth(session?.user ? { status: "authed", email: session.user.email ?? undefined } : { status: "anon" }),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

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

        <div className="flex items-center gap-3">
          {auth.status === "authed" ? (
            <span className="hidden sm:flex items-center gap-2 text-[12.5px] text-zinc-500">
              <span className="max-w-[160px] truncate">{auth.email}</span>
              <a href="/auth/signout" className="text-zinc-600 hover:text-black transition underline decoration-dotted">
                Déconnexion
              </a>
            </span>
          ) : auth.status === "anon" ? (
            <Link
              href="/login"
              className="hidden sm:inline text-[13.5px] text-zinc-600 hover:text-black transition"
            >
              Se connecter
            </Link>
          ) : (
            <span className="hidden sm:block w-[120px] h-[18px] rounded bg-zinc-200/60 animate-pulse" />
          )}

          <Link
            href="/new"
            className="inline-flex items-center gap-2 rounded-full bg-brand text-white px-4 py-2.5 text-[13.5px] font-[650] shadow-[0_6px_22px_rgba(255,90,20,.30)] hover:bg-brand-dark transition"
          >
            <Mic size={17} /> Dicter un devis
          </Link>
        </div>
      </div>
    </header>
  );
}
