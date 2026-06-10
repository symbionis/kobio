"use client";

import { Check, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { browserClient } from "../../src/db/supabase/browser";
import type { UserRow } from "../../src/db/types";
import PhoneInput from "../components/PhoneInput";

/**
 * The "Vous" panel — the person operating the account. Name and phone save to
 * the users table; the e-mail is auth-owned and changed via a one-time code (the
 * same UX as sign-in, but Supabase's email-change flow: updateUser + verifyOtp
 * type "email_change"). Two Supabase config dependencies for this one-step flow:
 *   1. The "Change Email Address" template must render {{ .Token }}, not a magic
 *      link (same class of gotcha as docs/solutions/...supabase-email-otp...,
 *      which documents the sign-in template).
 *   2. "Secure email change" must be OFF — with it ON, Supabase sends a code to
 *      BOTH the old and new address and needs both, which this flow (one code,
 *      to the new address) cannot satisfy.
 */
export default function UserForm({ initial }: { initial: UserRow | null }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial?.first_name ?? "");
  const [lastName, setLastName] = useState(initial?.last_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // E-mail change.
  const [email, setEmail] = useState(initial?.email ?? "");
  const [changing, setChanging] = useState(false);
  const [emailStep, setEmailStep] = useState<"new" | "code">("new");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName || null,
          last_name: lastName || null,
          phone: phone || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  function cancelChange() {
    setChanging(false);
    setEmailStep("new");
    setNewEmail("");
    setCode("");
    setEmailError(null);
  }

  async function sendEmailCode(e: FormEvent) {
    e.preventDefault();
    const addr = newEmail.trim();
    if (!addr) return;
    setEmailBusy(true);
    setEmailError(null);
    const { error } = await browserClient().auth.updateUser({ email: addr });
    setEmailBusy(false);
    if (error) {
      setEmailError(
        /rate|too many/i.test(error.message)
          ? "Trop de tentatives — patientez une minute."
          : "Impossible d'envoyer le code. Vérifiez l'adresse.",
      );
      return;
    }
    setEmailStep("code");
  }

  async function verifyEmailCode(e: FormEvent) {
    e.preventDefault();
    const addr = newEmail.trim();
    setEmailBusy(true);
    setEmailError(null);
    const { error } = await browserClient().auth.verifyOtp({
      email: addr,
      token: code.trim(),
      type: "email_change",
    });
    setEmailBusy(false);
    if (error) {
      setEmailError(/expired/i.test(error.message) ? "Code expiré — recommencez." : "Code incorrect.");
      return;
    }
    // auth.users.email is updated; the DB trigger syncs users.email.
    setEmail(addr);
    cancelChange();
    setEmailMsg("E-mail mis à jour.");
    router.refresh();
  }

  const field = "flex flex-col gap-1 text-[12.5px] text-zinc-500";
  const input =
    "rounded-xl border border-zinc-300 px-3 py-2.5 text-[14.5px] bg-white text-ink outline-none focus:ring-2 focus:ring-[#ffbb94]";

  return (
    <section className="rounded-[24px] bg-white shadow-soft border border-line p-5 sm:p-6 mb-4">
      <h2 className="font-[730] text-[17px] mb-4">Vous</h2>

      <form className="flex flex-col gap-4" onSubmit={save}>
        <div className="grid grid-cols-2 gap-4">
          <label className={field}>
            Prénom
            <input className={input} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className={field}>
            Nom
            <input className={input} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
        </div>
        <div className={field}>
          Téléphone
          <PhoneInput defaultValue={initial?.phone ?? null} onChange={(e164) => setPhone(e164 ?? "")} />
        </div>
        <div className="flex items-center gap-3">
          <button
            className="rounded-full bg-dark text-white px-5 py-2.5 text-[14px] font-[650] hover:bg-black transition disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "…" : "Enregistrer"}
          </button>
          {saved && <span className="text-[13.5px] text-emerald-700">Enregistré</span>}
        </div>
        {error && <p className="text-[13.5px] text-[#b91c1c]">{error}</p>}
      </form>

      <div className="mt-5 pt-5 border-t border-line">
        <div className={field}>E-mail</div>
        {!changing ? (
          <div className="flex items-center justify-between gap-3 mt-1">
            <span className="text-[14.5px] text-ink truncate">{email || "—"}</span>
            <button
              type="button"
              onClick={() => {
                setChanging(true);
                setEmailMsg(null);
              }}
              className="text-[13.5px] font-[600] text-brand hover:text-brand-dark transition shrink-0"
            >
              Modifier
            </button>
          </div>
        ) : emailStep === "new" ? (
          <form onSubmit={sendEmailCode} className="flex flex-col gap-2 mt-1">
            <p className="text-[12.5px] text-zinc-500">
              C'est aussi votre adresse de connexion — vous l'utiliserez pour vous connecter.
            </p>
            <input
              className={input}
              type="email"
              required
              autoFocus
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="nouvelle@adresse.ch"
            />
            <div className="flex gap-2">
              <button
                disabled={emailBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-dark text-white px-4 py-2 text-[13.5px] font-[650] hover:bg-black transition disabled:opacity-50"
              >
                <Mail size={15} /> {emailBusy ? "Envoi…" : "Recevoir un code"}
              </button>
              <button
                type="button"
                onClick={cancelChange}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-[13.5px] hover:bg-zinc-50 transition"
              >
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={verifyEmailCode} className="flex flex-col gap-2 mt-1">
            <p className="text-[12.5px] text-zinc-500">Entrez le code envoyé à {newEmail}.</p>
            <input
              className={`${input} tracking-[0.4em] text-center font-mono-label`}
              inputMode="numeric"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••"
            />
            <div className="flex gap-2">
              <button
                disabled={emailBusy}
                className="rounded-xl bg-dark text-white px-4 py-2 text-[13.5px] font-[650] hover:bg-black transition disabled:opacity-50"
              >
                {emailBusy ? "Vérification…" : "Valider"}
              </button>
              <button
                type="button"
                onClick={cancelChange}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-[13.5px] hover:bg-zinc-50 transition"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
        {emailError && <p className="mt-2 text-[13px] text-[#b91c1c]">{emailError}</p>}
        {emailMsg && (
          <p className="mt-2 text-[13px] text-emerald-700 flex items-center gap-1">
            <Check size={14} /> {emailMsg}
          </p>
        )}
      </div>
    </section>
  );
}
