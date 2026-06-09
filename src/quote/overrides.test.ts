import { describe, expect, it } from "vitest";
import { overridesFromLines } from "./overrides";
import type { Line } from "./types";

function line(rate: number, override: Line["price_override"], candidatePrices: number[]): Line {
  return {
    raw_text: "",
    description: "",
    quantity: { kind: "area", expression: "(1) * 1", value: 1, unit: "m2" },
    rate,
    rate_source: "spoken",
    amount: rate,
    catalog_match: {
      candidates: candidatePrices.map((p, i) => ({ article_id: i, name: "x", catalog_price: p })),
      confidence: candidatePrices.length ? "low" : "none",
    },
    price_override: override,
    tax_rate: 8.1,
    needs_review: false,
  };
}

describe("overridesFromLines", () => {
  it("logs a line whose rate overrides its candidate (AE2)", () => {
    expect(overridesFromLines([line(13, true, [15])])).toEqual([
      { line_index: 0, spoken_rate: 13, candidate_price: 15 },
    ]);
  });

  it("logs nothing when the rate matches its candidate (AE2)", () => {
    expect(overridesFromLines([line(65, false, [65])])).toEqual([]);
  });

  it("logs nothing for a forfait/no-candidate line (price_override 'n/a')", () => {
    expect(overridesFromLines([line(150, "n/a", [])])).toEqual([]);
  });

  it("records the first candidate when several exist", () => {
    expect(overridesFromLines([line(13, true, [15, 18])])).toEqual([
      { line_index: 0, spoken_rate: 13, candidate_price: 15 },
    ]);
  });

  it("preserves line index across a mixed quote", () => {
    const result = overridesFromLines([
      line(65, false, [65]),
      line(13, true, [15]),
      line(150, "n/a", []),
    ]);
    expect(result).toEqual([{ line_index: 1, spoken_rate: 13, candidate_price: 15 }]);
  });

  it("skips a line flagged price_override:true but with no candidates (the guard)", () => {
    expect(overridesFromLines([line(13, true, [])])).toEqual([]);
  });
});
