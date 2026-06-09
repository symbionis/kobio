"use client";

import { Check, Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Quote } from "../../../src/quote/types";
import QuoteEditor from "../../components/QuoteEditor";
import TranscriptPanel from "../../components/TranscriptPanel";

interface ClientOption {
  id: string;
  name: string;
}

interface Props {
  id: string;
  initialQuote: Quote;
  initialTranscript: string;
  clientId: string | null;
  sent: boolean;
  tvaApplicable: boolean;
  companyHasVat: boolean;
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
  clientId,
  sent,
  tvaApplicable,
  companyHasVat,
  clients,
}: Props) {
  const [quote, setQuote] = useState<Quote>(initialQuote);
  const [transcript, setTranscript] = useState<string>(initialTranscript);
  const [client, setClient] = useState<string>(clientId ?? "");
  const [isSent, setIsSent] = useState<boolean>(sent);
  const [tva, setTva] = useState<boolean>(tvaApplicable);
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
          tva_applicable: tva,
          transcript,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      setSavedAt(new Date().toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" }));
      setSaveState("saved");
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
  }, [quote, transcript, client, isSent, tva]);

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
        body: JSON.stringify({ transcript: text }),
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
        throw new Error(data.error ?? `Erreur ${res.status}`);
      }
      const url = URL.createObjectURL(await res.blob());
      window.open(url, "_blank", "noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de génération du PDF.");
    } finally {
      setPdfBusy(false);
    }
  }

  const selectInput =
    "w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-[14px] bg-white outline-none focus:ring-2 focus:ring-[#ffbb94]";

  const controls = (
    <>
      <label className="flex flex-col gap-1 text-[12px] font-mono-label text-zinc-500">
        CLIENT
        <select value={client} onChange={(e) => setClient(e.target.value)} className={selectInput}>
          <option value="">— Aucun —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-[14px] text-zinc-700 cursor-pointer">
        <input
          type="checkbox"
          className="accent-brand"
          checked={isSent}
          onChange={(e) => setIsSent(e.target.checked)}
        />
        Marquer comme envoyé
      </label>

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
        <Link className="text-[13.5px] text-zinc-600 hover:text-black transition" href="/quotes">
          ← Bibliothèque
        </Link>
        <span className="text-[13px] min-h-[20px]">
          {saveState === "saving" && (
            <span className="flex items-center gap-1.5 text-zinc-500">
              <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-line border-t-brand spin" />
              Enregistrement…
            </span>
          )}
          {saveState === "saved" && savedAt && (
            <span className="flex items-center gap-1 text-emerald-700">
              <Check size={14} /> Enregistré à {savedAt}
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

      <QuoteEditor
        quote={quote}
        onChange={setQuote}
        vat={{ available: companyHasVat, applicable: tva, onChange: setTva }}
        summaryExtras={controls}
      />

      <div className="mt-5">
        <TranscriptPanel
          transcript={transcript}
          onChange={setTranscript}
          onReprocess={reprocess}
          reprocessing={reprocessing}
        />
      </div>
    </>
  );
}
