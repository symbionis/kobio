"use client";

import { Mail, RefreshCw } from "lucide-react";
import posthog from "posthog-js";
import { type FormEvent, useState } from "react";
import { browserClient } from "../../src/db/supabase/browser";

interface AuthOtpProps {
  /** Called once a session is established (sign-in or sign-up). */
  onAuthed?: () => void;
  /** Optional context line shown above the form (e.g. "pour enregistrer ce devis"). */
  reason?: string;
}

type Step = "email" | "code";

/**
 * Email one-time-code sign-in / sign-up. Reused by the /login page and the
 * save-time auth handoff (U5). Entering a code that Supabase emails both creates
 * a new account and signs an existing one in — no password.
 */
export default function AuthOtp({ onAuthed, reason }: AuthOtpProps) {
  const supabase = browserClient();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      setError(
        /rate|too many/i.test(error.message)
          ? "Trop de tentatives — patientez une minute avant de réessayer."
          : "Impossible d'envoyer le code. Vérifiez l'adresse e-mail.",
      );
      return;
    }
    setStep("code");
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const addr = email.trim();
    const token = code.trim();
    // A new email arrives via the "Confirm signup" template (type "signup");
    // a returning email via "Magic Link" (type "email"). Try sign-in first,
    // fall back to signup, so the same code input works for both.
    let { data, error } = await supabase.auth.verifyOtp({ email: addr, token, type: "email" });
    if (error) {
      ({ data, error } = await supabase.auth.verifyOtp({ email: addr, token, type: "signup" }));
    }
    setBusy(false);
    if (error) {
      setError(
        /expired/i.test(error.message)
          ? "Code expiré — demandez-en un nouveau."
          : "Code incorrect. Vérifiez les 6 chiffres reçus par e-mail.",
      );
      return;
    }
    // Tie this browser's events to the signed-in user.
    if (data.user) {
      posthog.identify(data.user.id, { email: addr });
      posthog.capture("user_signed_in");
    }
    onAuthed?.();
  }

  const input =
    "w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-[15px] bg-white outline-none focus:ring-2 focus:ring-[#ffbb94]";

  return (
    <div className="w-full">
      {reason && <p className="text-[13.5px] text-zinc-600 mb-3">{reason}</p>}

      {step === "email" ? (
        <form onSubmit={sendCode} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-[12.5px] text-zinc-500">
            Votre e-mail
            <input
              className={input}
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.ch"
            />
          </label>
          <button
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand text-white py-3 font-[700] hover:bg-brand-dark transition disabled:opacity-50"
          >
            <Mail size={17} /> {busy ? "Envoi…" : "Recevoir un code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-[12.5px] text-zinc-500">
            Code reçu par e-mail
            <input
              className={`${input} tracking-[0.4em] text-center font-mono-label`}
              inputMode="numeric"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••"
            />
          </label>
          <button
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand text-white py-3 font-[700] hover:bg-brand-dark transition disabled:opacity-50"
          >
            {busy ? "Vérification…" : "Valider"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="inline-flex items-center justify-center gap-1.5 text-[13px] text-zinc-500 hover:text-black transition"
          >
            <RefreshCw size={13} /> Changer d'e-mail / renvoyer
          </button>
        </form>
      )}

      {error && (
        <p className="mt-3 text-[13.5px] text-[#b91c1c]">{error}</p>
      )}
    </div>
  );
}
