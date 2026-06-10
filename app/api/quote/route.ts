import { NextResponse } from "next/server";
import { catalogToPromptText } from "../../../src/catalog";
import { listArticles } from "../../../src/db/articles";
import { getOptionalOwner } from "../../../src/db/auth";
import { audioToTranscript } from "../../../src/llm/audio";
import { hasOpenRouterKey } from "../../../src/llm/client";
import { extractQuote } from "../../../src/llm/extraction";
import { clientIp, rateLimit } from "../../../src/llm/rate-limit";
import { finishQuote } from "../../../src/quote/parse";
import { asTrade } from "../../../src/quote/trades";

// Transcription, the OpenRouter calls, and the deterministic core all run in Node.
export const runtime = "nodejs";

/**
 * POST /api/quote — transcribe → extract → compute → check → return.
 *
 * PUBLIC (anonymous capture): no session required to parse a note. Rate-limited
 * per IP because it fronts paid STT + LLM calls. Catalog candidates are the
 * signed-in owner's articles scoped to the selected trade; anonymous callers get
 * no candidates (the spoken price still wins either way). Without
 * OPENROUTER_API_KEY the route fails loudly (503) — it never fabricates a quote,
 * because a made-up devis is a wrong number reaching a client. Compute +
 * cross-line check are always the real core.
 */

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

  // No transcription backend → fail loudly. We never fabricate a quote; a
  // made-up devis (and its made-up contact) is the exact failure mode the hard
  // rules forbid.
  if (!hasOpenRouterKey()) {
    return NextResponse.json({ error: "Service de transcription non configuré." }, { status: 503 });
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
      const extracted = await extractQuote(transcript, await candidateCatalogText(trade));
      const quote = finishQuote(extracted);
      return NextResponse.json({ transcript, quote });
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
    if (!audio || audio.size === 0) {
      return NextResponse.json({ error: "Aucun audio reçu." }, { status: 400 });
    }
    const transcript = await audioToTranscript(audio);
    const extracted = await extractQuote(transcript, await candidateCatalogText(trade));

    const quote = finishQuote(extracted); // compute + cross-line check (real)
    return NextResponse.json({ transcript, quote });
  } catch (err) {
    // Any failure — OpenRouter error, empty transcript, invalid JSON, a bad
    // expression — is surfaced, never returned as a silently-wrong quote.
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
