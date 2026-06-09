/**
 * Thin OpenRouter client — both the steps the endpoint needs, in one place.
 *
 * OpenRouter is OpenAI-compatible and also exposes a dedicated transcription
 * endpoint, so transcription (Whisper) and the parse call (GPT, strict JSON
 * schema) go through one provider and one key.
 *
 * Env (Next loads .env automatically):
 *  - OPENROUTER_API_KEY   — required to make real calls (.env, gitignored)
 *  - OPENROUTER_MODEL     — chat model for extraction (default openai/gpt-4o)
 *  - OPENROUTER_STT_MODEL — transcription model (default whisper-large-v3-turbo)
 *
 * Errors surface status + OpenRouter's message — never the key. A wrong or
 * empty result throws rather than returning a silently-wrong quote.
 */

const BASE = "https://openrouter.ai/api/v1";
const TIMEOUT_MS = 60_000;

export function hasOpenRouterKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function apiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not set. Add it to .env (see .env.example).");
  }
  return key;
}

export function sttModel(): string {
  // gpt-4o-transcribe over whisper-large-v3-turbo: on Nicolas's real note, turbo
  // dropped "5,25"→"5" (wrong quote); gpt-4o-transcribe got every number right.
  // For a quoting tool, number accuracy beats transcription cost.
  return process.env.OPENROUTER_STT_MODEL ?? "openai/gpt-4o-transcribe";
}

export function chatModel(): string {
  return process.env.OPENROUTER_MODEL ?? "openai/gpt-4o";
}

async function postJSON<T>(pathname: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}${pathname}`, {
      method: "POST",
      headers: {
        // apiKey() is interpolated here only — never log this object.
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        "X-Title": "bati-assist",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`OpenRouter ${pathname} timed out after ${TIMEOUT_MS / 1000}s.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      const parsed = JSON.parse(text);
      detail = parsed.error?.message ?? parsed.error ?? text;
    } catch {
      /* leave detail as raw text */
    }
    throw new Error(`OpenRouter ${pathname} failed: ${res.status} ${detail}`);
  }
  return JSON.parse(text) as T;
}

/** Transcribe base64-encoded audio (raw bytes, not a data URI) via Whisper. */
export async function transcribeAudio(
  base64: string,
  format: string,
  language = "fr",
): Promise<string> {
  const data = await postJSON<{ text?: string }>("/audio/transcriptions", {
    model: sttModel(),
    input_audio: { data: base64, format },
    language,
  });
  const text = (data.text ?? "").trim();
  if (!text) throw new Error("Transcription returned empty text.");
  return text;
}

/**
 * Chat completion constrained to a strict JSON schema. `require_parameters`
 * forces OpenRouter to route only to a provider that honours the schema, so an
 * unsupported model fails loudly instead of returning unconstrained text.
 */
export async function chatJSON<T>(opts: {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  temperature?: number;
}): Promise<T> {
  const data = await postJSON<{ choices?: Array<{ message?: { content?: string } }> }>(
    "/chat/completions",
    {
      model: chatModel(),
      temperature: opts.temperature ?? 0,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: opts.schemaName, strict: true, schema: opts.schema },
      },
      provider: { require_parameters: true },
    },
  );
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Extraction returned no content.");
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error("Extraction returned invalid JSON.");
  }
}
