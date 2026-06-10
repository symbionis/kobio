import { NextResponse } from "next/server";
import { audioToTranscript } from "../../../src/llm/audio";
import { hasOpenRouterKey } from "../../../src/llm/client";
import { extractContact } from "../../../src/llm/contact";
import { clientIp, rateLimit } from "../../../src/llm/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/contact — transcribe a short voice note and extract a client's
 * address block (name, address, postcode, city, country). PUBLIC + rate-limited
 * per IP because it fronts paid STT + LLM calls. Without OPENROUTER_API_KEY it
 * fails loudly (503) so the caller falls back to manual entry — it never
 * fabricates contact data. Code (src/contact.ts) owns the country mapping; the
 * model emits language only.
 */
export async function POST(request: Request): Promise<Response> {
  if (!rateLimit(`contact:${clientIp(request)}`, 12, 60_000)) {
    return NextResponse.json({ error: "Trop de requêtes — réessayez dans une minute." }, { status: 429 });
  }

  if (!hasOpenRouterKey()) {
    return NextResponse.json({ error: "Service de transcription non configuré." }, { status: 503 });
  }

  let audio: Blob | null = null;
  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (file instanceof Blob) audio = file;
  } catch {
    /* not multipart — falls through to the 400 below */
  }
  if (!audio || audio.size === 0) {
    return NextResponse.json({ error: "Aucun audio reçu." }, { status: 400 });
  }

  try {
    const transcript = await audioToTranscript(audio);
    const contact = await extractContact(transcript);
    return NextResponse.json({ contact });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
