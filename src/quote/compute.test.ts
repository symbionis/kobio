import { describe, expect, it } from "vitest";
import { computeLine, derivePriceOverride, round2 } from "./compute";
import type { CatalogMatch, ExtractedLine } from "./types";

function areaLine(
  expression: string,
  rate: number,
  catalog_match: CatalogMatch = { candidates: [], confidence: "none" },
  needs_review = false,
): ExtractedLine {
  return {
    raw_text: "",
    description: "test",
    quantity: { kind: "area", expression, value: null, unit: "m2" },
    rate,
    rate_source: "spoken",
    catalog_match,
    tax_rate: 8.1,
    needs_review,
  };
}

describe("round2", () => {
  it("rounds to two places", () => {
    expect(round2(56.1108)).toBe(56.11);
    expect(round2(353.34306)).toBe(353.34);
  });

  it("rounds half up off float boundaries", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
  });
});

describe("computeLine arithmetic", () => {
  it("rounds value to 2dp THEN multiplies (the ordering that lands on 3647.15)", () => {
    const line = computeLine(areaLine("(5.25 + 2.90 + 2.16 + 2.42 + 7.60) * 2.76", 65));
    expect(line.quantity.value).toBe(56.11);
    expect(line.amount).toBe(3647.15);
    // Multiplying the *unrounded* 56.1108 would give 3647.20 — the wrong number.
    expect(line.amount).not.toBe(round2(56.1108 * 65));
  });

  it("computes the arrachage line", () => {
    const line = computeLine(areaLine("(5.25 + 2.90 + 7.60) * 2.76", 13));
    expect(line.quantity.value).toBe(43.47);
    expect(line.amount).toBe(565.11);
  });

  it("forfait: value null, amount = rate", () => {
    const line = computeLine({
      raw_text: "",
      description: "déplacement",
      quantity: { kind: "forfait", expression: null, value: null, unit: null },
      rate: 150,
      rate_source: "spoken",
      catalog_match: { candidates: [], confidence: "none" },
      tax_rate: 8.1,
      needs_review: false,
    });
    expect(line.quantity.value).toBeNull();
    expect(line.amount).toBe(150);
  });

  it("bare spoken count: passes value through, amount = value × rate", () => {
    const line = computeLine({
      raw_text: "cinq radiateurs",
      description: "Radiateurs",
      quantity: { kind: "count", expression: null, value: 5, unit: "Stk" },
      rate: 80,
      rate_source: "spoken",
      catalog_match: { candidates: [], confidence: "none" },
      tax_rate: 8.1,
      needs_review: false,
    });
    expect(line.quantity.value).toBe(5);
    expect(line.amount).toBe(400);
  });

  it("flags for review (no throw) when a measured line has neither expression nor value", () => {
    const line = computeLine({
      raw_text: "",
      description: "broken",
      quantity: { kind: "linear", expression: null, value: null, unit: "ml" },
      rate: 10,
      rate_source: "spoken",
      catalog_match: { candidates: [], confidence: "none" },
      tax_rate: 8.1,
      needs_review: false,
    });
    expect(line.quantity.value).toBeNull();
    expect(line.amount).toBe(0);
    expect(line.needs_review).toBe(true);
  });

  it("never mutates the input line", () => {
    const input = areaLine("(1 + 1) * 2", 10);
    const before = JSON.stringify(input);
    computeLine(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe("derivePriceOverride", () => {
  it("'n/a' when there are no candidates", () => {
    expect(derivePriceOverride({ candidates: [], confidence: "none" }, 150)).toBe("n/a");
  });

  it("false when the spoken rate equals a candidate price (pose 65 vs {65})", () => {
    expect(
      derivePriceOverride(
        { candidates: [{ article_id: 1, name: "x", catalog_price: 65 }], confidence: "high" },
        65,
      ),
    ).toBe(false);
  });

  it("true when the spoken rate differs from every candidate (arrachage 13 vs {15,18})", () => {
    expect(
      derivePriceOverride(
        {
          candidates: [
            { article_id: 4, name: "a", catalog_price: 15 },
            { article_id: 15, name: "b", catalog_price: 18 },
          ],
          confidence: "low",
        },
        13,
      ),
    ).toBe(true);
  });

  it("tolerates float noise within half a centime", () => {
    expect(
      derivePriceOverride(
        { candidates: [{ article_id: 1, name: "x", catalog_price: 65.0 }], confidence: "high" },
        65.004,
      ),
    ).toBe(false);
  });
});

describe("computeLine flag reinforcement", () => {
  it("forces needs_review on low confidence even if the model said false", () => {
    const line = computeLine(
      areaLine("(5.25 + 2.90 + 7.60) * 2.76", 13, {
        candidates: [{ article_id: 4, name: "a", catalog_price: 15 }],
        confidence: "low",
      }),
    );
    expect(line.needs_review).toBe(true);
    expect(line.price_override).toBe(true);
  });

  it("forces needs_review on an override against a high-confidence match", () => {
    const line = computeLine(
      areaLine("(2 + 2) * 2", 99, {
        candidates: [{ article_id: 1, name: "x", catalog_price: 65 }],
        confidence: "high",
      }),
    );
    expect(line.price_override).toBe(true);
    expect(line.needs_review).toBe(true);
  });

  it("leaves needs_review false when high-confidence price matches", () => {
    const line = computeLine(
      areaLine("(2 + 2) * 2", 65, {
        candidates: [{ article_id: 1, name: "x", catalog_price: 65 }],
        confidence: "high",
      }),
    );
    expect(line.price_override).toBe(false);
    expect(line.needs_review).toBe(false);
  });
});
