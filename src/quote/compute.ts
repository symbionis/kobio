/**
 * Code owns the deterministic line fields: the arithmetic (`quantity.value`,
 * `amount`) and the derivable flags (`price_override`, and reinforcement of
 * `needs_review`). The extraction call owns only the language — see BUILD.md
 * "Parse contract".
 *
 * The one arithmetic rule, pinned here and tested hard: round value to 2dp
 * FIRST, then multiply. That ordering is what makes the worked example land on
 * 4715.60 — e.g. pose 56.1108 → 56.11 → ×65 → 3647.15.
 */

import { evaluate } from "./evaluate";
import type {
  CatalogMatch,
  ExtractedLine,
  ExtractedQuote,
  Line,
  PriceOverride,
  Quote,
} from "./types";

/** Round to 2 decimal places, nudged off binary-float boundaries (e.g. 1.005). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Prices compare equal within half a centime — tolerates float noise. */
const PRICE_EPSILON = 0.005;

/**
 * Derive `price_override` by comparing the spoken rate to catalog candidates —
 * a comparison, not a judgement, so it lives in code:
 *  - "n/a"  → no candidates to compare against
 *  - false  → the spoken rate equals a candidate price
 *  - true   → the spoken rate differs from every candidate
 */
export function derivePriceOverride(catalog_match: CatalogMatch, rate: number): PriceOverride {
  if (catalog_match.candidates.length === 0) return "n/a";
  const matches = catalog_match.candidates.some(
    (c) => Math.abs(c.catalog_price - rate) < PRICE_EPSILON,
  );
  return matches ? false : true;
}

/**
 * Reinforce `needs_review` with the derivable over-flag conditions so recall
 * doesn't depend on the model remembering: low confidence, or an override
 * against a high-confidence match. OR-ed with whatever the model already set.
 */
function reinforceNeedsReview(
  extracted: boolean,
  catalog_match: CatalogMatch,
  priceOverride: PriceOverride,
): boolean {
  if (extracted) return true;
  if (catalog_match.confidence === "low") return true;
  if (priceOverride === true && catalog_match.confidence === "high") return true;
  return false;
}

/**
 * Fill `value`/`amount` and derive `price_override`/`needs_review` for one
 * extracted line. Three arithmetic branches:
 *  - forfait              → value null, amount = rate (the lump)
 *  - expression present   → value = round(eval(expr)), amount = round(value × rate)
 *  - no expression, other → value = the dictated bare count, amount = round(value × rate)
 */
export function computeLine(line: ExtractedLine): Line {
  const { quantity, rate, catalog_match } = line;
  const price_override = derivePriceOverride(catalog_match, rate);
  const needs_review = reinforceNeedsReview(line.needs_review, catalog_match, price_override);

  if (quantity.kind === "forfait") {
    return {
      ...line,
      quantity: { ...quantity, value: null },
      amount: round2(rate),
      price_override,
      needs_review,
    };
  }

  let value: number;
  if (quantity.expression !== null) {
    value = round2(evaluate(quantity.expression));
  } else if (quantity.value !== null) {
    // A bare spoken count ("cinq radiateurs") — no formula to evaluate, take it as dictated.
    value = quantity.value;
  } else {
    // A measured line (area/linear/…) reached us with neither a formula nor a
    // dictated count — the quantity never landed in the transcript. Per Hard
    // Rule #3, flag for review rather than throw: crashing here would lose the
    // whole quote. value stays null (empty editable field), amount 0 until the
    // builder fills it in.
    return {
      ...line,
      quantity: { ...quantity, value: null },
      amount: 0,
      price_override,
      needs_review: true,
    };
  }

  return {
    ...line,
    quantity: { ...quantity, value },
    amount: round2(value * rate),
    price_override,
    needs_review,
  };
}

/**
 * Recompute one line from a user-edited calculation expression — the inline
 * formula edit on the prestation row. Code stays the owner of the arithmetic:
 * the same round-then-multiply rule as `computeLine`, the LLM is not involved.
 *
 * The edit is a line-level override and does not touch the transcript (a later
 * transcript "Recalculer" still re-extracts everything, as before).
 *
 * fr-CH decimals: a typed comma ("2,76") is normalised to a dot for evaluation
 * only (fr-CH keyboards); the raw text the builder typed is kept verbatim in
 * `expression`. (Dictated expressions are already stored with dots.)
 *
 * Failure posture (Hard Rule #3 — flag, don't guess): an empty or malformed
 * expression never throws out of here and never substitutes a wrong number — the
 * line keeps its prior value/amount and is flagged `needs_review`. On success the
 * deterministic review floor is recomputed from the catalog match and price
 * override, so a stale formula-error flag clears while a genuine low-confidence
 * or override flag stays.
 */
export function applyExpression(line: Line, expr: string): Line {
  const trimmed = expr.trim();
  if (trimmed === "") {
    return {
      ...line,
      quantity: { ...line.quantity, expression: null },
      needs_review: true,
    };
  }

  try {
    const value = round2(evaluate(trimmed.replace(/,/g, ".")));
    return {
      ...line,
      quantity: { ...line.quantity, expression: trimmed, value },
      amount: round2(value * line.rate),
      needs_review: reinforceNeedsReview(false, line.catalog_match, line.price_override),
    };
  } catch {
    return {
      ...line,
      quantity: { ...line.quantity, expression: trimmed },
      needs_review: true,
    };
  }
}

/**
 * Compute every line of an extracted quote. Pure mapping — does not touch
 * review_notes (the cross-line net owns those; see crossline.ts).
 */
export function computeQuote(extracted: ExtractedQuote): Quote {
  return {
    ...extracted,
    lines: extracted.lines.map(computeLine),
  };
}
