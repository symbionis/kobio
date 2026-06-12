import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="max-w-md mx-auto px-4 py-16 sm:py-24">
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
