"use client";

import { Check, MessageSquare, Mic, Square, X } from "lucide-react";
import { useRef, useState } from "react";

type Status = "idle" | "recording" | "loading" | "thanks" | "error";

/**
 * Persistent feedback affordance: a floating button bottom-right on every page.
 * Tap → a small panel; record a voice note, stop, and it transcribes + posts to
 * Slack, then thanks the user by name. No transcript shown, no edit. Mirrors the
 * AddressDictation recorder (tap/stop, no waveform/wake lock).
 */
export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [thanksName, setThanksName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function close() {
    setOpen(false);
    setStatus("idle");
    setError(null);
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void send(new Blob(chunksRef.current, { type: mime || "audio/webm" }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
    } catch {
      setError("Micro inaccessible — autorisez le microphone.");
      setStatus("error");
    }
  }

  function stop() {
    recorderRef.current?.stop();
  }

  async function send(blob: Blob) {
    setStatus("loading");
    try {
      const form = new FormData();
      form.append("audio", blob, "feedback.webm");
      form.append("page", window.location.pathname);
      const res = await fetch("/api/feedback", { method: "POST", body: form });
      const data = (await res.json()) as { ok?: boolean; name?: string | null; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      setThanksName(data.name ?? null);
      setStatus("thanks");
      setTimeout(close, 2600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi.");
      setStatus("error");
    }
  }

  const recording = status === "recording";

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open && (
        <div className="absolute bottom-full right-0 mb-3 w-[280px] rounded-2xl bg-white border border-line shadow-soft p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-[700] text-[15px]">Un retour&nbsp;?</span>
            <button
              onClick={close}
              aria-label="Fermer"
              className="text-zinc-400 hover:text-black transition text-[20px] leading-none"
            >
              ×
            </button>
          </div>

          {status === "thanks" ? (
            <div className="flex items-center gap-2 text-emerald-700 text-[14px] py-2">
              <Check size={18} /> Merci{thanksName ? ` ${thanksName}` : ""} !
            </div>
          ) : (
            <>
              <p className="text-[14px] leading-snug text-zinc-600 mb-3">
                Dictez votre retour — il part directement à l'équipe.
              </p>
              <button
                onClick={recording ? stop : start}
                disabled={status === "loading"}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-[13.5px] font-[650] transition disabled:opacity-60 ${
                  recording ? "bg-dark text-white hover:bg-black" : "bg-brand text-white hover:bg-brand-dark"
                }`}
              >
                {recording ? (
                  <>
                    <Square size={15} /> Arrêter
                  </>
                ) : status === "loading" ? (
                  "Envoi…"
                ) : (
                  <>
                    <Mic size={15} /> Dicter un retour
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-[12px] text-zinc-500 min-h-[16px]">
                {recording
                  ? "Je vous écoute… touchez pour arrêter"
                  : status === "loading"
                    ? "Transcription et envoi…"
                    : ""}
              </p>
              {error && <p className="text-[12px] text-[#b91c1c] text-center">{error}</p>}
            </>
          )}
        </div>
      )}

      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-label="Donner un retour"
        className="w-12 h-12 rounded-full bg-brand text-white shadow-[0_8px_22px_rgba(255,90,20,.30)] flex items-center justify-center hover:bg-brand-dark transition"
      >
        {open ? <X size={20} /> : <MessageSquare size={20} />}
      </button>
    </div>
  );
}
