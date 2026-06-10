"use client";

import { FileCheck, LogOut, Menu, Mic, X } from "lucide-react";
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
  { href: "/abonnement", label: "Abonnement" },
];

type AuthState = { status: "loading" | "anon" | "authed"; email?: string };

export default function TopNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const [auth, setAuth] = useState<AuthState>(
    hasBrowserAuthConfig() ? { status: "loading" } : { status: "anon" },
  );
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Close the menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-paper/86 border-b border-line-2">
      <div className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 h-[66px] grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Left: logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0 justify-self-start">
          <div className="w-10 h-10 rounded-xl bg-dark text-[#ffefe0] flex items-center justify-center shadow-sm">
            <FileCheck size={20} />
          </div>
          <div className="font-display text-[22px] tracking-tight leading-none">Kobio</div>
        </Link>

        {/* Center: the one hero action — round on mobile, pill on desktop */}
        <Link
          href="/new"
          aria-label="Dicter un devis"
          className="justify-self-center inline-flex items-center justify-center gap-2 rounded-full bg-brand text-white shadow-[0_6px_22px_rgba(255,90,20,.30)] hover:bg-brand-dark transition h-11 w-11 sm:h-auto sm:w-auto sm:px-4 sm:py-2.5 text-[13.5px] font-[650]"
        >
          <Mic size={17} />
          <span className="hidden sm:inline">Dicter un devis</span>
        </Link>

        {/* Right: menu toggle */}
        <div className="justify-self-end">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            className="inline-flex items-center justify-center h-11 w-11 rounded-full text-zinc-700 hover:bg-zinc-900/5 transition"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-line-2 bg-paper/95 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 py-3 flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "py-2.5 text-[15px] text-zinc-700 transition hover:text-black",
                  isActive(l.href) && "text-black font-semibold",
                )}
              >
                {l.label}
              </Link>
            ))}

            {/* Account row at the bottom of the menu */}
            <div className="mt-2 pt-3 border-t border-line-2 text-[14px]">
              {auth.status === "authed" ? (
                <div className="flex items-center justify-between gap-2 text-zinc-500">
                  <span className="max-w-[240px] truncate">{auth.email}</span>
                  <a
                    href="/auth/signout"
                    className="inline-flex items-center gap-1.5 text-zinc-600 hover:text-black transition"
                  >
                    <LogOut size={15} /> Déconnexion
                  </a>
                </div>
              ) : auth.status === "anon" ? (
                <Link href="/login" className="text-zinc-600 hover:text-black transition">
                  Se connecter
                </Link>
              ) : (
                <span className="block w-[120px] h-[18px] rounded bg-zinc-200/60 animate-pulse" />
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
