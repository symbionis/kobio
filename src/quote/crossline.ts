/**
 * The deterministic cross-line safety net.
 *
 * It owns exactly one nameable failure: two `area` lines at the SAME height
 * (same multiplier) with DIFFERING wall-sets — the arrachage-covers-3-walls /
 * pose-covers-5-walls case from the worked example. Code catches this with
 * certainty where an LLM only catches it probabilistically.
 *
 * Per BUILD.md "Parse contract":
 *  - writes a document-level `review_notes` entry only;
 *  - NEVER flips a line's `needs_review` (the pose line stays needs_review:false);
 *  - unions with any review_notes the model already raised;
 *  - covers only the canonical `(a + b + c) * h` shape — anything it cannot
 *    parse is left to LLM-only flagging, no speculative inconsistency code.
 */

import type { Line, Quote } from "./types";

interface AreaShape {
  /** The additive terms inside the parens — the wall lengths. */
  terms: number[];
  /** The multiplier — the height. */
  height: number;
}

/**
 * Parse the canonical `(a + b + c) * h` shape (either operand order) into its
 * wall lengths and height. Returns null when the expression isn't that shape —
 * the honest boundary of what the net can check.
 */
export function parseAreaExpression(expression: string | null): AreaShape | null {
  if (expression === null) return null;
  const expr = expression.trim();

  // (a + b + c) * h  OR  h * (a + b + c)
  const sumThenHeight = /^\(\s*([^()]+?)\s*\)\s*\*\s*([\d.]+)\s*$/.exec(expr);
  const heightThenSum = /^([\d.]+)\s*\*\s*\(\s*([^()]+?)\s*\)\s*$/.exec(expr);

  let sumPart: string;
  let heightPart: string;
  if (sumThenHeight) {
    [, sumPart, heightPart] = sumThenHeight;
  } else if (heightThenSum) {
    [, heightPart, sumPart] = heightThenSum;
  } else {
    return null;
  }

  const terms = sumPart.split("+").map((t) => Number(t.trim()));
  const height = Number(heightPart);
  if (terms.some((n) => !Number.isFinite(n)) || !Number.isFinite(height)) {
    return null;
  }
  return { terms, height };
}

/** A stable key for grouping by height, tolerant of float noise (2.76). */
function heightKey(height: number): string {
  return height.toFixed(4);
}

/** A stable signature for a wall-set: sorted lengths, so order doesn't matter. */
function termsSignature(terms: number[]): string {
  return [...terms].sort((a, b) => a - b).map((n) => n.toFixed(4)).join("+");
}

/**
 * Inspect computed area lines and append a review note for any same-height
 * group whose wall-sets disagree. Returns a new Quote with notes unioned;
 * needs_review is left untouched.
 */
export function applyCrossLineChecks(quote: Quote): Quote {
  const areaLines: Array<{ line: Line; shape: AreaShape }> = [];
  for (const line of quote.lines) {
    if (line.quantity.kind !== "area") continue;
    const shape = parseAreaExpression(line.quantity.expression);
    if (shape === null) continue; // not the canonical shape — LLM-only flagging
    areaLines.push({ line, shape });
  }

  // Group by height.
  const groups = new Map<string, Array<{ line: Line; shape: AreaShape }>>();
  for (const entry of areaLines) {
    const key = heightKey(entry.shape.height);
    const bucket = groups.get(key);
    if (bucket) bucket.push(entry);
    else groups.set(key, [entry]);
  }

  const notes: string[] = [];
  for (const bucket of groups.values()) {
    if (bucket.length < 2) continue;
    const signatures = new Set(bucket.map((e) => termsSignature(e.shape.terms)));
    if (signatures.size < 2) continue; // all wall-sets identical — nothing to flag

    const height = bucket[0].shape.height;
    const coverage = bucket
      .map((e) => `« ${e.line.description} » porte sur ${e.shape.terms.join(", ")}`)
      .join(" ; ");
    notes.push(
      `À la même hauteur (${height} m), ${coverage}. ` +
        `Les dimensions ne correspondent pas — volontaire ou oubli ? À vérifier.`,
    );
  }

  if (notes.length === 0) return quote;
  return { ...quote, review_notes: [...quote.review_notes, ...notes] };
}
