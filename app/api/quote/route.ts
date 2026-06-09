import { NextResponse } from "next/server";
import { catalogToPromptText } from "../../../src/catalog";
import { listArticles } from "../../../src/db/articles";
import { getOptionalOwner } from "../../../src/db/auth";
import { hasOpenRouterKey, transcribeAudio } from "../../../src/llm/client";
import { extractQuote } from "../../../src/llm/extraction";
import { clientIp, rateLimit } from "../../../src/llm/rate-limit";
import { AMINA_EXTRACT, AMINA_TRANSCRIPT } from "../../../src/quote/fixture";
import { finishQuote } from "../../../src/quote/parse";
import { asTrade } from "../../../src/quote/trades";
import type { ExtractedQuote } from "../../../src/quote/types";

// Transcription, the OpenRouter calls, and the deterministic core all run in Node.
export const runtime = "nodejs";

/**
 * POST /api/quote — transcribe → extract → compute → check → return.
 *
 * PUBLIC (anonymous capture): no session required to parse a note. Rate-limited
 * per IP because it fronts paid STT + LLM calls. Catalog candidates are the
 * signed-in owner's articles scoped to the selected trade; anonymous callers get
 * no candidates (the spoken price still wins either way). Without
 * OPENROUTER_API_KEY the route returns the canonical Amina fixture so the loop
 * demos keyless. Compute + cross-line check are always the real core.
 */

/** "audio/webm;codecs=opus" → "webm"; the format field Whisper expects. */
function audioFormat(mime: string): string {
  const sub = mime.split(";")[0].trim().split("/")[1] ?? "webm";
  const alias: Record<string, string> = { "x-m4a": "m4a", mp4: "m4a", mpeg: "mp3", "x-wav": "wav" };
  return alias[sub] ?? sub;
}

/** Candidate catalog text for the prompt: the owner's articles for the selected
 *  trade, or "(catalogue indisponible)" when anonymous. */
async function candidateCatalogText(trade: string | null): Promise<string> {
  const scope = await getOptionalOwner();
  if (!scope) return catalogToPromptText([]);
  const articles = await listArticles(scope, trade);
  return catalogToPromptText(
    articles.map((a) => ({ id: a.bexio_article_id ?? 0, code: a.code ?? "", name: a.name, price: a.price })),
  );
}

export async function POST(request: Request): Promise<Response> {
  // Abuse/cost guard on the public endpoint (12 parses / minute / IP).
  if (!rateLimit(`quote:${clientIp(request)}`, 12, 60_000)) {
    return NextResponse.json({ error: "Trop de requêtes — réessayez dans une minute." }, { status: 429 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  // Reprocess path: a JSON body with an (edited) transcript skips STT and
  // re-runs extraction + compute on the text.
  if (contentType.includes("application/json")) {
    let transcript = "";
    let trade: string | null = null;
    try {
      const body = (await request.json()) as { transcript?: unknown; trade?: unknown };
      if (typeof body.transcript === "string") transcript = body.transcript.trim();
      trade = asTrade(body.trade);
    } catch {
      /* malformed JSON → empty transcript → 400 below */
    }
    if (!transcript) {
      return NextResponse.json({ error: "Transcription vide." }, { status: 400 });
    }
    try {
      const extracted = hasOpenRouterKey()
        ? await extractQuote(transcript, await candidateCatalogText(trade))
        : AMINA_EXTRACT;
      const quote = finishQuote(extracted);
      return NextResponse.json({ transcript, quote, stubbed: !hasOpenRouterKey() });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  let audio: Blob | null = null;
  let trade: string | null = null;
  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (file instanceof Blob) audio = file;
    trade = asTrade(form.get("trade"));
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
      extracted = await extractQuote(transcript, await candidateCatalogText(trade));
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
