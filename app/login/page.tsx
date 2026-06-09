import { FileCheck } from "lucide-react";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="max-w-md mx-auto px-4 py-16 sm:py-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-dark text-[#ffefe0] flex items-center justify-center shadow-sm">
          <FileCheck size={20} />
        </div>
        <div className="leading-tight">
          <div className="font-display text-[22px] -mb-[2px] tracking-tight">Kobio</div>
          <div className="text-[11px] text-zinc-500 font-mono-label">voix → devis</div>
        </div>
      </div>

      <div className="rounded-[24px] bg-white border border-line shadow-soft p-6">
        <h1 className="font-display text-[26px] leading-tight tracking-tight mb-1">Connexion</h1>
        <p className="text-[14px] text-zinc-600 mb-5">
          Entrez votre e-mail — un code vous est envoyé. Pas de mot de passe.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
