/**
 * Full real pipeline on an audio FILE — transcribe → extract → compute → check.
 *
 * Feeds an audio file straight to OpenRouter Whisper (no microphone, no quality
 * loss from playing through speakers), then the real GPT extraction and the
 * deterministic core. The definitive end-to-end test on a genuine note.
 *
 *   npm run pipeline /path/to/nicolas-note.m4a
 *
 * Needs OPENROUTER_API_KEY in .env. Whisper accepts wav, mp3, m4a, ogg, webm,
 * flac, aac up to 25 MB.
 */

import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { catalogToPromptText, loadCatalog } from "../src/catalog";
import { transcribeAudio } from "../src/llm/client";
import { extractQuote } from "../src/llm/extraction";
import { finishQuote } from "../src/quote/parse";
import { totals } from "../src/quote/totals";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run pipeline <audio-file>");
  process.exit(1);
}

const buf = await readFile(file);
const ext = path.extname(file).slice(1).toLowerCase();
const format = ext === "mp4" ? "m4a" : ext || "webm";

console.log(`Transcribing ${path.basename(file)} (${(buf.length / 1024).toFixed(0)} KB, format=${format})…`);
const transcript = await transcribeAudio(buf.toString("base64"), format, "fr");
console.log("\n--- transcript ---\n" + transcript);

const catalogText = catalogToPromptText(await loadCatalog());
const quote = finishQuote(await extractQuote(transcript, catalogText));

console.log("\n--- lines ---");
for (const l of quote.lines) {
  const q = l.quantity;
  console.log(
    `${l.description}\n   ${q.expression ?? "(forfait)"} → value=${q.value} × rate=${l.rate} = ${l.amount}` +
      `  [override=${l.price_override}, review=${l.needs_review}, match=${l.catalog_match.confidence}]`,
  );
}
console.log("\n--- review_notes ---");
quote.review_notes.forEach((n) => console.log(`• ${n}`));
console.log("\n--- totals ---");
console.log(totals(quote));
