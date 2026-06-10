"use client";

import { ArrowLeft, Check, Download, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";
import type { VatRate } from "../../../src/db/types";
import type { Quote } from "../../../src/quote/types";
import ClientFormModal from "../../components/ClientFormModal";
import ClientSelect from "../../components/ClientSelect";
import QuoteEditor from "../../components/QuoteEditor";
import TranscriptPanel from "../../components/TranscriptPanel";
import { fmtDateTime } from "../../lib/dates";

interface ClientOption {
  id: string;
  name: string;
}

interface Props {
  id: string;
  initialQuote: Quote;
  initialTranscript: string;
  /** The quote's trade (métier) — preserved on save and reused on reprocess. */
  trade: string | null;
  clientId: string | null;
  sent: boolean;
  /** Client validated/accepted the devis. */
  accepted: boolean;
  /** Stored VAT rate for this devis (null = Aucune). */
  vatRate: number | null;
  /** The builder's configured VAT rates, offered as a choice. */
  vatRates: VatRate[];
  /** When the devis was created (ISO) — shown in the header and on the PDF. */
  createdAt: string;
  /** Stored Envoyé / Validé timestamps (ISO), or null. */
  sentAt: string | null;
  acceptedAt: string | null;
  clients: ClientOption[];
}

type SaveState = "idle" | "saving" | "saved" | "error";

/** Client wrapper around the shared editor for a saved quote. Edits autosave
 * (debounced PUT) — no explicit save button. The right rail is a single control
 * panel: totals, client, status, PDF. The transcript stays editable + can be
 * reprocessed into fresh lines. */
export default function SavedQuoteEditor({
  id,
  initialQuote,
  initialTranscript,
  trade,
  clientId,
  sent,
  accepted,
  vatRate,
  vatRates,
  createdAt,
  sentAt,
  acceptedAt,
  clients,
}: Props) {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote>(initialQuote);
  const [transcript, setTranscript] = useState<string>(initialTranscript);
  const [client, setClient] = useState<string>(clientId ?? "");
  const [clientList, setClientList] = useState<ClientOption[]>(clients);
  const [creatingClient, setCreatingClient] = useState(false);
  const [createName, setCreateName] = useState("");
  const [isSent, setIsSent] = useState<boolean>(sent);
  const [isAccepted, setIsAccepted] = useState<boolean>(accepted);
  const [sentStamp, setSentStamp] = useState<string | null>(sentAt);
  const [acceptedStamp, setAcceptedStamp] = useState<string | null>(acceptedAt);
  const [selectedRate, setSelectedRate] = useState<number | null>(vatRate);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  const firstRender = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote,
          client_id: client || null,
          sent: isSent,
          accepted: isAccepted,
          vat_rate: selectedRate,
          transcript,
          trade,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      const now = new Date();
      const date = now.toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
      const time = now.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
      setSavedAt(`${date} à ${time}`);
      setSaveState("saved");
      // Invalidate the client Router Cache so the list views (/quotes, /clients)
      // reflect this edit — e.g. a detached client falling back to the dictated
      // contact. router.refresh() preserves this editor's React state.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
      setSaveState("error");
    }
  }

  // Autosave: debounce 900ms after any change. Skip the initial mount so simply
  // opening a quote doesn't write.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), 900);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote, transcript, client, isSent, isAccepted, selectedRate]);

  // Re-run extraction on the edited transcript, then let autosave persist it.
  async function reprocess() {
    const text = transcript.trim();
    if (!text) return;
    setReprocessing(true);
    setError(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, trade }),
      });
      const data = (await res.json()) as { quote?: Quote; error?: string };
      if (!res.ok || !data.quote) throw new Error(data.error ?? `Erreur ${res.status}`);
      setQuote(data.quote);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du recalcul.");
    } finally {
      setReprocessing(false);
    }
  }

  // Fetch the PDF so error responses (no company profile, no client) surface
  // in-app instead of rendering raw JSON in a new browser tab. Flush pending
  // edits first so the PDF reflects exactly what's on screen.
  async function openPdf() {
    setPdfBusy(true);
    setError(null);
    try {
      await save();
      const res = await fetch(`/api/quotes/${id}/pdf`);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const message = data.error ?? `Erreur ${res.status}`;
        // 4xx here is expected user guidance (no company profile, no client) —
        // surface it in-app, but don't log it as an exception. Only 5xx is a
        // genuine failure worth tracking.
        if (res.status >= 500) {
          posthog.captureException(new Error(message), { context: "quote_pdf", quote_id: id });
        }
        setError(message);
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      window.open(url, "_blank", "noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      posthog.capture("quote_pdf_opened", { quote_id: id });
    } catch (err) {
      // Network failure or unexpected throw — always worth capturing.
      posthog.captureException(err, { context: "quote_pdf", quote_id: id });
      setError(err instanceof Error ? err.message : "Échec de génération du PDF.");
    } finally {
      setPdfBusy(false);
    }
  }

  // Open the shared create-client popover, prefilling the name (the dictated contact).
  function openCreate(name: string) {
    setCreateName(name);
    setCreatingClient(true);
  }

  // The modal created a client — add it to the list and attach it to this devis.
  function onClientCreated(created: { id: string; name: string }) {
    setClientList((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name, "fr")));
    setClient(created.id);
  }

  const createdLabel = createdAt
    ? new Date(createdAt).toLocaleDateString("fr-CH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  const controls = (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-col gap-1 text-[12px] font-mono-label text-zinc-500">
          CLIENT
          {isSent ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[14px] text-zinc-700">
              {clientList.find((c) => c.id === client)?.name ?? "— Aucun —"}
            </div>
          ) : (
            <ClientSelect
              value={client}
              options={clientList}
              onChange={setClient}
              onCreateNew={() => openCreate(quote.contact.spoken_name ?? "")}
            />
          )}
        </div>

        {/* Dictated contact → client shortcut. */}
        {!isSent && !client && !creatingClient && quote.contact.spoken_name && (
          <button
            onClick={() => openCreate(quote.contact.spoken_name)}
            className="text-left text-[12.5px] text-brand hover:text-brand-dark transition"
          >
            + Créer « {quote.contact.spoken_name} » comme client
          </button>
        )}
      </div>

      <div>
        <button
          disabled={isAccepted}
          onClick={() =>
            setIsSent((v) => {
              const next = !v;
              if (next) {
                setSentStamp((s) => s ?? new Date().toISOString());
              } else {
                setIsAccepted(false); // un-sending drops the accepted state
                setSentStamp(null);
                setAcceptedStamp(null);
              }
              posthog.capture("quote_status_changed", { quote_id: id, status: next ? "sent" : "draft" });
              return next;
            })
          }
          className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-[650] transition disabled:cursor-not-allowed disabled:opacity-70 ${
            isSent
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          {isSent ? (
            <>
              <Check size={16} /> Envoyé
            </>
          ) : (
            "Marquer comme envoyé"
          )}
        </button>
        {isSent && sentStamp && (
          <p className="mt-1.5 text-center text-[12px] text-zinc-500">
            Envoyé le {fmtDateTime(sentStamp)}
          </p>
        )}
      </div>

      {client ? (
        <button
          onClick={openPdf}
          disabled={pdfBusy}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-dark text-white py-3 text-[14px] font-[650] hover:bg-black transition disabled:opacity-50"
        >
          <Download size={16} /> {pdfBusy ? "Génération…" : "Télécharger le PDF"}
        </button>
      ) : (
        <p className="text-[12.5px] text-zinc-500">
          Choisissez un client pour générer le PDF.
        </p>
      )}
    </>
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Retour"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-black transition"
          >
            <ArrowLeft size={18} />
          </button>
          {createdLabel && (
            <span className="text-[13px] text-zinc-500">Créé le {createdLabel}</span>
          )}
        </div>
        <span className="text-[13px] min-h-[20px]">
          {saveState === "saving" && (
            <span className="flex items-center gap-1.5 text-zinc-500">
              <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-line border-t-brand spin" />
              Enregistrement…
            </span>
          )}
          {saveState === "saved" && savedAt && (
            <span className="flex items-center gap-1 text-emerald-700">
              <Check size={14} /> Enregistré le {savedAt}
            </span>
          )}
          {saveState === "error" && (
            <button onClick={save} className="text-[#b91c1c] hover:underline">
              Échec — réessayer
            </button>
          )}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-[16px] bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] px-4 py-3 text-[13.8px]">
          {error}
        </div>
      )}

      {isAccepted && (
        <div className="mb-4 flex items-center gap-2 rounded-[16px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-[13.8px]">
          <Lock size={15} className="shrink-0" /> Devis validé — lecture seule. Annulez la validation
          pour modifier.
        </div>
      )}

      <QuoteEditor
        quote={quote}
        onChange={setQuote}
        readOnly={isAccepted}
        vat={{ rates: vatRates, selected: selectedRate, onChange: setSelectedRate, locked: isSent }}
        summaryExtras={controls}
        afterTitle={
          isSent ? (
            <div>
              <button
                onClick={() =>
                  setIsAccepted((v) => {
                    const next = !v;
                    setAcceptedStamp(next ? (acceptedStamp ?? new Date().toISOString()) : null);
                    posthog.capture("quote_status_changed", { quote_id: id, status: next ? "accepted" : "sent" });
                    return next;
                  })
                }
                className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-[700] transition ${
                  isAccepted
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_8px_22px_rgba(5,150,105,.25)]"
                    : "bg-white border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                <Check size={18} /> {isAccepted ? "Devis validé" : "Marquer comme validé"}
              </button>
              {isAccepted && acceptedStamp && (
                <p className="mt-1.5 text-center text-[12px] text-zinc-500">
                  Validé le {fmtDateTime(acceptedStamp)}
                </p>
              )}
            </div>
          ) : null
        }
      />

      {!isAccepted && (
        <div className="mt-5">
          <TranscriptPanel
            transcript={transcript}
            onChange={setTranscript}
            onReprocess={reprocess}
            reprocessing={reprocessing}
          />
        </div>
      )}

      <ClientFormModal
        open={creatingClient}
        initialName={createName}
        onClose={() => setCreatingClient(false)}
        onCreated={onClientCreated}
      />
    </>
  );
}
