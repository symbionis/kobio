import { transcribeAudio } from "./client";

/**
 * Shared audio intake for the voice-capture routes (quote + contact). Keeps the
 * mime→format mapping and the STT call in one place so each route adds no
 * duplicated plumbing.
 */

/** "audio/webm;codecs=opus" → "webm"; the format field Whisper expects. */
export function audioFormat(mime: string): string {
  const sub = mime.split(";")[0].trim().split("/")[1] ?? "webm";
  const alias: Record<string, string> = { "x-m4a": "m4a", mp4: "m4a", mpeg: "mp3", "x-wav": "wav" };
  return alias[sub] ?? sub;
}

/** An audio Blob → French transcript via OpenRouter STT. */
export async function audioToTranscript(audio: Blob): Promise<string> {
  const base64 = Buffer.from(await audio.arrayBuffer()).toString("base64");
  return transcribeAudio(base64, audioFormat(audio.type), "fr");
}
