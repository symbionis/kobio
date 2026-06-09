/**
 * Quote status, derived from line review state — not hand-set (except Sent).
 *
 * A quote is Draft while any line still carries an unresolved `needs_review`
 * flag, Ready once every flag is cleared, and Sent once the builder marks it.
 * Document-level `review_notes` are informational and do not gate Ready.
 *
 * See the foundation-slice plan KTD6.
 */

import type { Line } from "./types";

export type QuoteStatus = "Draft" | "Ready" | "Sent";

/**
 * Derive a quote's status from its lines and the manual `sent` marker. Sent
 * overrides the line state; otherwise any unresolved flag keeps it Draft.
 */
export function deriveStatus(lines: Line[], sent: boolean): QuoteStatus {
  if (sent) return "Sent";
  return lines.some((line) => line.needs_review) ? "Draft" : "Ready";
}
