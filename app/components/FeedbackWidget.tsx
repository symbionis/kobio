"use client";

import { Check, MessageSquare, Mic, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { browserClient, hasBrowserAuthConfig } from "../../src/db/supabase/browser";

type Status = "idle" | "recording" | "loading" | "thanks" | "error";

/**
 * Persistent feedback affordance: a floating button centred at the bottom of
 * every page. Tap → a small panel; record a voice note, stop, and it transcribes
 * + posts to Slack, then thanks the user by name. No transcript shown, no edit.
 *
 * Navy (not brand orange) so it reads as a distinct utility, not a second copy
 * of the primary Dicter action. Only shown to signed-in users — the builders
 * actually using the app are the ones with feedback to give; anonymous visitors
 * on the marketing pages don't see it. Bounces occasionally to stay noticed.
 */
export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [thanksName, setThanksName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Track auth so the button can expand to its label only for signed-in users.
  useEffect(() => {
    if (!hasBrowserAuthConfig()) return;
    const supabase = browserClient();
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(!!session?.user),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

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
  if (!authed) return null; // feedback is for signed-in users only
  const expanded = !open; // labelled pill when closed, X when open

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
      {open && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[280px] rounded-2xl bg-white border border-line shadow-soft p-4">
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
        aria-label={open ? "Fermer" : "Donner un retour"}
        className={`${open ? "" : "feedback-bounce"} inline-flex items-center justify-center gap-2 h-12 rounded-full bg-[#1e3a5f] text-white shadow-[0_8px_22px_rgba(30,58,95,.32)] hover:bg-[#16304d] transition font-[650] text-[14px] ${
          expanded ? "px-4" : "w-12"
        }`}
      >
        {open ? (
          <X size={19} />
        ) : (
          <>
            <MessageSquare size={18} />
            {expanded && <span>Un retour&nbsp;?</span>}
          </>
        )}
      </button>
    </div>
  );
}
