/**
 * Test the parse half in isolation — no microphone, no Next server.
 *
 * Runs the REAL OpenRouter extraction call against a transcript (the canonical
 * Amina note by default, or one you pass as args), then the deterministic
 * compute + cross-line check, and prints the finished quote + totals.
 *
 *   npm run extract                       # canonical Amina transcript
 *   npm run extract "Créer une offre ..." # your own transcript
 *
 * Needs OPENROUTER_API_KEY in .env. The gate guarantees TTC 4715.60 IF the
 * model extracts the Amina expressions/rates faithfully — so this is the test
 * of the LLM half.
 */

import "dotenv/config";
import { catalogToPromptText, loadCatalog } from "../src/catalog";
import { extractQuote } from "../src/llm/extraction";
import { finishQuote } from "../src/quote/parse";
import { AMINA_TRANSCRIPT } from "../src/quote/fixture";
import { totals } from "../src/quote/totals";

const transcript = process.argv.slice(2).join(" ").trim() || AMINA_TRANSCRIPT;

const catalogText = catalogToPromptText(await loadCatalog());
const extracted = await extractQuote(transcript, catalogText);
const quote = finishQuote(extracted);

console.log("--- lines ---");
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
