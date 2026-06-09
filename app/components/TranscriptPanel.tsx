"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "../lib/cn";

interface TranscriptPanelProps {
  transcript: string;
  onChange: (t: string) => void;
  onReprocess: () => void;
  reprocessing: boolean;
}

/**
 * Editable source transcript + a "Recalculer" action. Shared by the create
 * screen and the saved-quote editor: fix a misheard word or number, then
 * regenerate the lines from the corrected text.
 */
export default function TranscriptPanel({
  transcript,
  onChange,
  onReprocess,
  reprocessing,
}: TranscriptPanelProps) {
  return (
    <section className="rounded-[20px] bg-white border border-line shadow-soft p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[12px] font-mono-label text-zinc-500 uppercase tracking-wide">
          Transcription — modifiable
        </div>
        <button
          onClick={onReprocess}
          disabled={reprocessing || !transcript.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-dark text-white px-4 py-2 text-[13px] font-[650] hover:bg-black transition disabled:opacity-50"
        >
          <RefreshCw size={15} className={cn(reprocessing && "spin")} />
          {reprocessing ? "Recalcul…" : "Recalculer le devis"}
        </button>
      </div>
      <textarea
        value={transcript}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 w-full min-h-[120px] rounded-[14px] border border-[#e2d4c1] bg-paper-3 px-4 py-3 text-[14.5px] leading-relaxed outline-none focus:ring-2 focus:ring-[#ffbb94]"
      />
      <p className="text-[12.3px] text-zinc-500 mt-2">
        Corrigez un mot mal entendu ou un chiffre, puis recalculez — les lignes ci-dessous sont
        régénérées depuis ce texte.
      </p>
    </section>
  );
}
