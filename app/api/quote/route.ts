import { NextResponse } from "next/server";
import { catalogToPromptText, loadCatalog } from "../../../src/catalog";
import { hasOpenRouterKey, transcribeAudio } from "../../../src/llm/client";
import { extractQuote } from "../../../src/llm/extraction";
import { AMINA_EXTRACT, AMINA_TRANSCRIPT } from "../../../src/quote/fixture";
import { finishQuote } from "../../../src/quote/parse";
import type { ExtractedQuote } from "../../../src/quote/types";

// Transcription, the OpenRouter calls, and the deterministic core all run in Node.
export const runtime = "nodejs";

/**
 * POST /api/quote — transcribe → extract → compute → check → return.
 *
 * With OPENROUTER_API_KEY set, transcription (Whisper) and extraction (GPT,
 * strict json_schema) run for real through OpenRouter. Without a key, the route
 * falls back to the canonical Amina fixture so the page → render loop still
 * demos keyless. The last two steps (compute, cross-line check) are always the
 * real, tested deterministic core. See BUILD.md "Parse contract".
 */

/** "audio/webm;codecs=opus" → "webm"; the format field Whisper expects. */
function audioFormat(mime: string): string {
  const sub = mime.split(";")[0].trim().split("/")[1] ?? "webm";
  const alias: Record<string, string> = { "x-m4a": "m4a", mp4: "m4a", mpeg: "mp3", "x-wav": "wav" };
  return alias[sub] ?? sub;
}

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";

  // Reprocess path: a JSON body with an (edited) transcript skips STT and
  // re-runs extraction + compute on the text. Lets the user fix what was heard
  // and recalculate without re-recording.
  if (contentType.includes("application/json")) {
    let transcript = "";
    try {
      const body = (await request.json()) as { transcript?: unknown };
      if (typeof body.transcript === "string") transcript = body.transcript.trim();
    } catch {
      /* malformed JSON → empty transcript → 400 below */
    }
    if (!transcript) {
      return NextResponse.json({ error: "Transcription vide." }, { status: 400 });
    }
    try {
      const extracted = hasOpenRouterKey()
        ? await extractQuote(transcript, catalogToPromptText(await loadCatalog()))
        : AMINA_EXTRACT;
      const quote = finishQuote(extracted);
      return NextResponse.json({ transcript, quote, stubbed: !hasOpenRouterKey() });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  let audio: Blob | null = null;
  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (file instanceof Blob) audio = file;
  } catch {
    /* not multipart — handled below per path */
  }

  try {
    let transcript: string;
    let extracted: ExtractedQuote;

    if (hasOpenRouterKey()) {
      if (!audio || audio.size === 0) {
        return NextResponse.json({ error: "Aucun audio reçu." }, { status: 400 });
      }
      const base64 = Buffer.from(await audio.arrayBuffer()).toString("base64");
      transcript = await transcribeAudio(base64, audioFormat(audio.type), "fr");
      const catalogText = catalogToPromptText(await loadCatalog());
      extracted = await extractQuote(transcript, catalogText);
    } else {
      transcript = AMINA_TRANSCRIPT;
      extracted = AMINA_EXTRACT;
    }

    const quote = finishQuote(extracted); // compute + cross-line check (real)
    return NextResponse.json({ transcript, quote, stubbed: !hasOpenRouterKey() });
  } catch (err) {
    // Any failure — OpenRouter error, empty transcript, invalid JSON, a bad
    // expression — is surfaced, never returned as a silently-wrong quote.
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
