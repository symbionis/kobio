import { describe, expect, it } from "vitest";
import { applyCrossLineChecks, parseAreaExpression } from "./crossline";
import type { Line, Quote } from "./types";

function area(description: string, expression: string, value: number): Line {
  return {
    raw_text: "",
    description,
    quantity: { kind: "area", expression, value, unit: "m2" },
    rate: 1,
    rate_source: "spoken",
    amount: value,
    catalog_match: { candidates: [], confidence: "none" },
    price_override: "n/a",
    tax_rate: 8.1,
    needs_review: false,
  };
}

function quoteOf(lines: Line[], review_notes: string[] = []): Quote {
  return {
    intent: "create_offer",
    contact: { spoken_name: "x", match: null, action: "match_or_create" },
    title: "t",
    tax_rate_default: 8.1,
    lines,
    review_notes,
  };
}

describe("parseAreaExpression", () => {
  it("parses (sum) * height", () => {
    expect(parseAreaExpression("(5.25 + 2.90 + 7.60) * 2.76")).toEqual({
      terms: [5.25, 2.9, 7.6],
      height: 2.76,
    });
  });

  it("parses height * (sum)", () => {
    expect(parseAreaExpression("2.76 * (5.25 + 2.90)")).toEqual({
      terms: [5.25, 2.9],
      height: 2.76,
    });
  });

  it("returns null for shapes it cannot check (the honest boundary)", () => {
    expect(parseAreaExpression(null)).toBeNull();
    expect(parseAreaExpression("5 * 3")).toBeNull();
    expect(parseAreaExpression("(1 + 2) * (3 + 4)")).toBeNull();
  });
});

describe("applyCrossLineChecks", () => {
  it("flags same-height area lines with differing wall-sets (the Amina case)", () => {
    const quote = quoteOf([
      area("Arrachage", "(5.25 + 2.90 + 7.60) * 2.76", 43.47),
      area("Pose", "(5.25 + 2.90 + 2.16 + 2.42 + 7.60) * 2.76", 56.11),
    ]);
    const result = applyCrossLineChecks(quote);
    expect(result.review_notes).toHaveLength(1);
    const note = result.review_notes[0];
    expect(note).toContain("Arrachage");
    expect(note).toContain("Pose");
    expect(note).toContain("2.16");
    expect(note).toContain("2.42");
  });

  it("does NOT flip needs_review on the involved lines", () => {
    const quote = quoteOf([
      area("Arrachage", "(5.25 + 2.90 + 7.60) * 2.76", 43.47),
      area("Pose", "(5.25 + 2.90 + 2.16 + 2.42 + 7.60) * 2.76", 56.11),
    ]);
    const result = applyCrossLineChecks(quote);
    expect(result.lines.every((l) => l.needs_review === false)).toBe(true);
  });

  it("unions with review_notes the model already raised", () => {
    const quote = quoteOf(
      [
        area("Arrachage", "(5.25 + 2.90 + 7.60) * 2.76", 43.47),
        area("Pose", "(5.25 + 2.90 + 2.16 + 2.42 + 7.60) * 2.76", 56.11),
      ],
      ["A note from the model"],
    );
    const result = applyCrossLineChecks(quote);
    expect(result.review_notes[0]).toBe("A note from the model");
    expect(result.review_notes).toHaveLength(2);
  });

  it("does not flag identical wall-sets at the same height (two coats on the same walls)", () => {
    const quote = quoteOf([
      area("Couche 1", "(5.25 + 2.90) * 2.76", 22.49),
      area("Couche 2", "(5.25 + 2.90) * 2.76", 22.49),
    ]);
    expect(applyCrossLineChecks(quote).review_notes).toHaveLength(0);
  });

  it("does not flag same wall-sets at DIFFERENT heights (different rooms)", () => {
    const quote = quoteOf([
      area("Salon", "(5.25 + 2.90) * 2.76", 22.49),
      area("Couloir", "(5.25 + 2.90) * 2.40", 19.56),
    ]);
    expect(applyCrossLineChecks(quote).review_notes).toHaveLength(0);
  });

  it("stays silent when an expression isn't the canonical shape (LLM-only territory)", () => {
    const quote = quoteOf([
      area("A", "(5.25 + 2.90 + 7.60) * 2.76", 43.47),
      area("B", "42", 42),
    ]);
    expect(applyCrossLineChecks(quote).review_notes).toHaveLength(0);
  });
});
