import { NextResponse } from "next/server";
import { getOptionalOwner } from "../../../src/db/auth";
import { getUser } from "../../../src/db/users";
import { buildSlackMessage } from "../../../src/feedback";
import { audioToTranscript } from "../../../src/llm/audio";
import { hasOpenRouterKey } from "../../../src/llm/client";
import { clientIp, rateLimit } from "../../../src/llm/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/feedback — transcribe a short voice note and post it to Slack via an
 * Incoming Webhook. PUBLIC + rate-limited (fronts paid STT). The webhook URL and
 * the user lookup stay server-side; the client sends only audio + the page. When
 * the webhook or STT key is unconfigured it returns 503 so the widget can say so.
 */
export async function POST(request: Request): Promise<Response> {
  if (!rateLimit(`feedback:${clientIp(request)}`, 6, 60_000)) {
    return NextResponse.json({ error: "Trop de requêtes — réessayez dans une minute." }, { status: 429 });
  }

  const webhook = process.env.SLACK_FEEDBACK_WEBHOOK_URL;
  if (!webhook || !hasOpenRouterKey()) {
    return NextResponse.json({ error: "Retours non configurés." }, { status: 503 });
  }

  let audio: Blob | null = null;
  let page: string | null = null;
  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (file instanceof Blob) audio = file;
    const p = form.get("page");
    if (typeof p === "string") page = p;
  } catch {
    /* not multipart — falls through to the 400 below */
  }
  if (!audio || audio.size === 0) {
    return NextResponse.json({ error: "Aucun audio reçu." }, { status: 400 });
  }

  try {
    const transcript = await audioToTranscript(audio);

    // Resolve the sender best-effort — feedback still posts when signed out.
    let greetName: string | null = null; // first name, for the "Merci X" confirmation
    let slackName: string | null = null; // full name (or company), for Slack attribution
    let email: string | null = null;
    const scope = await getOptionalOwner();
    if (scope) {
      const { data } = await scope.supabase.auth.getUser();
      email = data.user?.email ?? null;
      const user = await getUser(scope);
      greetName = user?.first_name ?? null;
      const person = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
      slackName = person || null;
    }

    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSlackMessage(transcript, { name: slackName, email, page })),
    });
    if (!res.ok) throw new Error(`Slack a refusé l'envoi (${res.status}).`);

    return NextResponse.json({ ok: true, name: greetName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
