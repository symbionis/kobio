"use client";

import { Mic, Square } from "lucide-react";
import { useRef, useState } from "react";
import type { ContactFields } from "../../src/contact";

type Status = "idle" | "recording" | "loading" | "error";

interface Props {
  /** Called with the extracted address block on a successful dictation. */
  onResult: (fields: ContactFields) => void;
}

/**
 * Tap-to-record / tap-to-stop recorder for a client's address. Posts the note to
 * /api/contact and hands the extracted fields back. Deliberately lightweight —
 * no waveform, timer, or screen wake lock (a ~10s note). On any failure it shows
 * a message and leaves the caller's fields untouched (onResult is not called).
 */
export default function AddressDictation({ onResult }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
      setError("Micro inaccessible — autorisez l'accès au microphone.");
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
      form.append("audio", blob, "address.webm");
      const res = await fetch("/api/contact", { method: "POST", body: form });
      const data = (await res.json()) as { contact?: ContactFields; error?: string };
      if (!res.ok || !data.contact) throw new Error(data.error ?? `Erreur ${res.status}`);
      onResult(data.contact);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la dictée.");
      setStatus("error");
    }
  }

  const recording = status === "recording";
  const loading = status === "loading";

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={loading}
        className={`w-full inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-[13.5px] font-[650] transition disabled:opacity-60 ${
          recording
            ? "bg-dark text-white hover:bg-black"
            : "bg-brand text-white hover:bg-brand-dark shadow-[0_6px_18px_rgba(255,90,20,.25)]"
        }`}
      >
        {recording ? (
          <>
            <Square size={15} /> Arrêter
          </>
        ) : loading ? (
          "Analyse…"
        ) : (
          <>
            <Mic size={15} /> Dicter l'adresse
          </>
        )}
      </button>
      <p className="text-[12px] text-zinc-500 text-center">
        {recording
          ? "Je vous écoute… touchez pour arrêter"
          : loading
            ? "Transcription en cours…"
            : "Dictez le nom et l'adresse du client"}
      </p>
      {error && (
        <p className="text-[12px] text-[#b91c1c] text-center">
          {error} Saisissez les détails ci-dessous.
        </p>
      )}
    </div>
  );
}
