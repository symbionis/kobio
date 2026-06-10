/**
 * Round-trip smoke test against the live Supabase project. Saves the canonical
 * Amina quote, logs its overrides, reads it back, and lists quotes — verifying
 * the data layer works end-to-end. Runs as the sentinel owner via the
 * service-role admin client (bypasses RLS), not a real user session.
 *
 *   npm run db:smoke
 *
 * Leaves one saved quote behind (useful for exercising the library next).
 */

import "dotenv/config";
import { adminClient } from "../src/db/client";
import type { OwnerScope } from "../src/db/auth";
import { OWNER_ID } from "../src/db/owner";
import { saveQuote, getQuote, listQuotes } from "../src/db/quotes";
import { logOverrides, listOverrides } from "../src/db/overrides";
import { AMINA_EXTRACT } from "../src/quote/fixture";
import { finishQuote } from "../src/quote/parse";

// Admin-backed scope: service-role client + the sentinel owner id.
const scope: OwnerScope = { supabase: adminClient(), ownerId: OWNER_ID };

const quote = finishQuote(AMINA_EXTRACT);

const saved = await saveQuote(scope, {
  title: quote.title,
  contact: quote.contact,
  client_id: null,
  tax_rate_default: quote.tax_rate_default,
  lines: quote.lines,
  review_notes: quote.review_notes,
  sent: false,
  accepted: false,
  sent_at: null,
  accepted_at: null,
  vat_rate: 8.1,
});
console.log("saved id:", saved.id);

await logOverrides(scope, saved.id, quote.lines);

const fetched = await getQuote(scope, saved.id);
const pose = fetched?.lines[1]?.quantity;
console.log("round-trip pose:", pose?.value, "× 65 =", fetched?.lines[1]?.amount, "(expect 56.11 / 3647.15)");
console.log("review_notes preserved:", fetched?.review_notes.length);

const overrides = await listOverrides(scope, saved.id);
console.log("overrides:", overrides.map((o) => `line ${o.line_index}: ${o.spoken_rate}→${o.candidate_price}`).join(", "));

console.log("quotes in library:", (await listQuotes(scope)).length);
