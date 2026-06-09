/**
 * The deterministic half of the parse pipeline, in one place.
 *
 * The Claude call produces an `ExtractedQuote` (faithful extraction only). This
 * turns it into a finished `Quote`: code fills value/amount, then the cross-line
 * net appends any review_notes. Pure and side-effect free — fully testable
 * without Whisper or Claude.
 */

import { computeQuote } from "./compute";
import { applyCrossLineChecks } from "./crossline";
import type { ExtractedQuote, Quote } from "./types";

export function finishQuote(extracted: ExtractedQuote): Quote {
  return applyCrossLineChecks(computeQuote(extracted));
}

export type { ExtractedQuote, Quote };
