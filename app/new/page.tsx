"use client";

import { FileText, Mic, Shield, Sparkles, Square, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { VatRate } from "../../src/db/types";
import type { Quote } from "../../src/quote/types";
import { TRADES } from "../../src/quote/trades";
import AuthOtp from "../components/AuthOtp";
import QuoteEditor from "../components/QuoteEditor";
import TranscriptPanel from "../components/TranscriptPanel";

type Status = "idle" | "recording" | "loading" | "done" | "error";

interface QuoteResponse {
  transcript: string;
  quote: Quote;
}

// Trade-agnostic tips for dictating a note that parses cleanly.
const REMINDERS = [
  "Le nom du client et le titre du devis",
  "Chaque prestation, ligne par ligne",
  "Les quantités dictées comme un calcul (ex. « 5,25 plus 2,90 fois 2,76 »)",
  "Le tarif de chaque ligne",
  "Le déplacement, l'accès, l'évacuation si nécessaire",
];

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function NewQuotePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [saving, setSaving] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [needAuth, setNeedAuth] = useState(false);
  const [vatRates, setVatRates] = useState<VatRate[]>([]);
  const [vatRate, setVatRate] = useState<number | null>(null);
  const [trade, setTrade] = useState<string>("");
  const [seconds, setSeconds] = useState(0);

  const router = useRouter();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load the builder's configured VAT rates; default the devis to the first one
  // (typically the standard rate). Also default the trade from the profile.
  useEffect(() => {
    fetch("/api/company")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const rates = (data?.company?.vat_rates ?? []) as VatRate[];
        setVatRates(rates);
        setVatRate(rates.length > 0 ? rates[0].rate : null);
        if (data?.company?.trade) setTrade(data.company.trade as string);
      })
      .catch(() => setVatRates([]));
  }, []);

  // Elapsed-time counter while recording.
  useEffect(() => {
    if (status !== "recording") return;
    setSeconds(0);
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  // Keep the screen awake while recording so a long voice note doesn't get
  // interrupted by the phone dimming/locking. The lock is auto-released by the
  // browser when the tab is hidden, so re-acquire when it becomes visible again.
  useEffect(() => {
    if (status !== "recording") return;
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        /* denied or unsupported — recording still works, screen just may dim */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && !cancelled) void request();
    };
    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [status]);

  // Live waveform from an analyser tapped off the mic stream.
  useEffect(() => {
    if (status !== "recording") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    const data = new Uint8Array(analyserRef.current?.frequencyBinCount ?? 128);
    const draw = () => {
      const analyser = analyserRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (analyser) {
        analyser.getByteFrequencyData(data);
        const barW = (canvas.width / data.length) * 1.8;
        for (let i = 0; i < data.length; i++) {
          const h = (data[i] / 255) * canvas.height * 0.92;
          ctx.fillStyle = "#ff5a14";
          ctx.fillRect(i * barW, canvas.height - h, barW - 1.7, h);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [status]);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);

      // Tap the stream for the live waveform (best-effort; capture still works without it).
      try {
        const audioCtx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const src = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;
      } catch {
        /* waveform is decorative */
      }

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        analyserRef.current = null;
        void audioCtxRef.current?.close().catch(() => {});
        audioCtxRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        void sendAudio(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
      posthog.capture("quote_recording_started", { trade: trade || null });
    } catch {
      setError("Micro inaccessible — autorisez l'accès au microphone et réessayez.");
      setStatus("error");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  async function sendAudio(blob: Blob) {
    setStatus("loading");
    try {
      const form = new FormData();
      form.append("audio", blob, blob instanceof File ? blob.name : "note.webm");
      if (trade) form.append("trade", trade);
      let phId: string | undefined;
      try {
        phId = posthog.get_distinct_id();
      } catch {
        /* posthog not initialised (no key) — send without the header */
      }
      const res = await fetch("/api/quote", {
        method: "POST",
        body: form,
        headers: phId ? { "x-posthog-distinct-id": phId } : undefined,
      });
      const data = (await res.json()) as QuoteResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      setTranscript(data.transcript);
      setQuote(data.quote);
      setStatus("done");
      posthog.capture("quote_parsed", {
        trade: trade || null,
        line_count: data.quote.lines.length,
        review_notes: data.quote.review_notes?.length ?? 0,
      });
    } catch (err) {
      posthog.captureException(err, { context: "quote_parse" });
      setError(err instanceof Error ? err.message : "Échec du traitement de la note.");
      setStatus("error");
    }
  }

  // Re-run extraction on the (edited) transcript — no re-recording needed.
  async function reprocess() {
    const text = transcript.trim();
    if (!text) return;
    setReprocessing(true);
    setError(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, trade: trade || null }),
      });
      const data = (await res.json()) as QuoteResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      setQuote(data.quote);
      toast.success("Devis recalculé depuis la transcription");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Échec du recalcul.";
      setError(msg);
      toast.error(msg);
    } finally {
      setReprocessing(false);
    }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void sendAudio(file);
  }

  function reset() {
    setQuote(null);
    setTranscript("");
    setError(null);
    setStatus("idle");
  }

  // Save the draft to the library, then open its saved page (U4 → U6).
  async function saveToLibrary() {
    if (!quote) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote,
          vat_rate: vatRate,
          transcript,
          trade: trade || null,
        }),
      });
      // Anonymous capture: a save with no session asks for an email code, then
      // resumes (the quote is still in memory). Not an error.
      if (res.status === 401) {
        setNeedAuth(true);
        return;
      }
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? `Erreur ${res.status}`);
      posthog.capture("quote_saved", { quote_id: data.id, trade: trade || null });
      router.push(`/quotes/${data.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Échec de l'enregistrement.";
      setError(msg);
      toast.error(msg);
    } finally {
      // Reset even on the success path: if navigation is interrupted the button
      // must not stay disabled.
      setSaving(false);
    }
  }

  // ---- Result view: the parsed quote ----
  if (status === "done" && quote) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 py-8 sm:py-12">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 className="font-display text-[34px] sm:text-[40px] leading-tight tracking-tight">
              Vérifiez votre devis
            </h1>
            <p className="text-zinc-600 text-[15px] mt-1">
              Kobio a chiffré ~60 %. Ajustez, puis enregistrez.
            </p>
          </div>
          <button
            onClick={reset}
            className="px-4 py-2.5 rounded-full bg-white border border-zinc-300 text-[13.8px] font-[600] hover:bg-zinc-50 transition"
          >
            ↺ Nouvelle dictée
          </button>
        </div>

        <QuoteEditor
          quote={quote}
          onChange={setQuote}
          onSave={saveToLibrary}
          saving={saving}
          vat={{ rates: vatRates, selected: vatRate, onChange: setVatRate }}
        />

        {/* Editable transcript — fix what was heard, then recalculate. */}
        <div className="mt-5">
          <TranscriptPanel
            transcript={transcript}
            onChange={setTranscript}
            onReprocess={reprocess}
            reprocessing={reprocessing}
          />
        </div>

        {needAuth && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-[24px] bg-white border border-line shadow-soft p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display text-[24px] tracking-tight">Enregistrer votre devis</h2>
                <button
                  onClick={() => setNeedAuth(false)}
                  className="text-zinc-400 hover:text-black transition text-[20px] leading-none"
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>
              <AuthOtp
                reason="Entrez votre e-mail pour enregistrer et envoyer ce devis — un code vous est envoyé."
                onAuthed={() => {
                  setNeedAuth(false);
                  void saveToLibrary();
                }}
              />
            </div>
          </div>
        )}
      </main>
    );
  }

  // ---- Capture view ----
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 py-8 sm:py-12">
      <div className="grid lg:grid-cols-[1.11fr_.89fr] gap-8">
        <div>
          <h1 className="font-display text-[40px] sm:text-[52px] leading-[1.02] tracking-tight">
            Dictez votre chantier
          </h1>
          <p className="text-zinc-600 mt-3 text-[16px] max-w-[560px] leading-relaxed">
            Parlez naturellement : qui, où, quoi, surfaces, quantités, prix. Kobio structure le devis
            juste après — vous n'avez plus qu'à vérifier.
          </p>

          <div className="mt-6">
            <div className="text-[11.5px] font-mono-label text-zinc-500 mb-2">MÉTIER</div>
            <div className="flex flex-wrap gap-2">
              {TRADES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTrade(t.value)}
                  className={`px-3 py-1.5 rounded-full border text-[13.5px] transition ${
                    trade === t.value
                      ? "bg-dark text-white border-dark"
                      : "bg-white border-line text-zinc-700 hover:bg-paper-2"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {!trade && (
              <p className="text-[12.5px] text-zinc-500 mt-2">
                Choisissez votre métier pour activer la dictée.
              </p>
            )}
          </div>

          <div className="mt-5 rounded-[26px] bg-white border border-line shadow-soft p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <div className="text-[11.5px] font-mono-label text-zinc-500">MICRO • FR</div>
              {status === "recording" && (
                <div className="text-[12px] text-[#d84200] font-[600] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" /> En écoute ·{" "}
                  {fmtTime(seconds)}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-[18px] dashed-border p-7 sm:p-10 text-center bg-paper-3">
              <div className="flex justify-center">
                {status === "recording" ? (
                  <button
                    onClick={stopRecording}
                    aria-label="Arrêter l'enregistrement"
                    className="w-20 h-20 rounded-full bg-dark text-white flex items-center justify-center shadow-soft hover:opacity-90 transition"
                  >
                    <Square size={26} />
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    disabled={status === "loading" || !trade}
                    aria-label="Démarrer l'enregistrement"
                    className="w-20 h-20 rounded-full bg-brand text-white flex items-center justify-center shadow-[0_12px_30px_rgba(255,90,20,.33)] hover:bg-brand-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mic size={30} />
                  </button>
                )}
              </div>
              <div className="mt-4 text-[14.4px] text-zinc-700 font-[600]">
                {status === "recording"
                  ? "Je vous écoute… touchez pour arrêter"
                  : status === "loading"
                    ? "Traitement en cours…"
                    : "Touchez pour dicter"}
              </div>
              <div className="text-[13.3px] text-zinc-500">
                Ex : « Peinture salon 28 m², 2 couches, rebouchage… »
              </div>
              <canvas
                ref={canvasRef}
                width={640}
                height={52}
                className="w-full h-[52px] mt-4 rounded-xl bg-[#fff7ef] border border-[#f1dfcb]"
              />

              {status === "loading" && (
                <div className="mt-4 flex items-center justify-center gap-2 text-[13.5px] text-zinc-600">
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-line border-t-brand spin" />
                  Transcription et analyse de la note…
                </div>
              )}
            </div>

            {status !== "recording" && status !== "loading" && trade && (
              <label className="mt-4 flex items-center justify-center gap-2 text-[13px] text-zinc-600 cursor-pointer hover:text-black transition">
                <Upload size={15} />
                <span className="underline decoration-dotted">ou choisir un fichier audio</span>
                <input type="file" accept="audio/*" onChange={onFile} className="hidden" />
              </label>
            )}

            <div className="mt-4 text-[12.4px] text-zinc-500 text-center">
              Astuce : dites les quantités comme un calcul (« 5,25 fois 2,76 ») — Kobio les reprend
              telles quelles.
            </div>
          </div>

          {status === "error" && error && (
            <div className="mt-4 rounded-[16px] bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] px-4 py-3 text-[13.8px]">
              {error}
            </div>
          )}
        </div>

        {/* Right helper column */}
        <div className="space-y-5">
          <div className="rounded-[22px] bg-white border border-line shadow-soft p-5">
            <div className="flex items-center gap-2 text-[12.5px] font-mono-label text-zinc-500">
              <Sparkles size={15} className="text-rust" /> À DICTER
            </div>
            <ul className="mt-3 text-[14.2px] text-zinc-700 space-y-2">
              {REMINDERS.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="text-brand mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[22px] bg-paper-2 border border-line p-5">
            <div className="flex items-center gap-2 font-[700] text-[15px]">
              <FileText size={17} className="text-rust" /> Ce que fait Kobio
            </div>
            <p className="text-[13.8px] text-zinc-700 mt-2 leading-relaxed">
              Code calcule chaque ligne <em>exactement</em> comme dictée — jamais de correction
              silencieuse. En cas de doute, la ligne est signalée « à vérifier », pas devinée.
            </p>
          </div>

          <div className="rounded-[22px] bg-white border border-line shadow-soft p-5 text-[13.8px] text-zinc-600">
            <div className="flex items-center gap-2 font-[700] text-zinc-800 mb-1">
              <Shield size={16} className="text-rust" /> Brouillon uniquement
            </div>
            Rien n'est envoyé à Bexio sans votre relecture. Les devis restent des brouillons jusqu'à
            votre validation.
          </div>
        </div>
      </div>
    </main>
  );
}
