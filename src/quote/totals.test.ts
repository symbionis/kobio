import { describe, expect, it } from "vitest";
import { discountLabel, normalizeDiscount, totalsFromLines } from "./totals";
import type { Line } from "./types";

function line(amount: number, tax_rate = 8.1): Line {
  return {
    raw_text: "",
    description: "",
    quantity: { kind: "forfait", expression: null, value: null, unit: null },
    rate: amount,
    rate_source: "spoken",
    amount,
    catalog_match: { candidates: [], confidence: "none" },
    price_override: "n/a",
    tax_rate,
    needs_review: false,
  };
}

describe("totalsFromLines", () => {
  it("reproduces the worked-example totals", () => {
    const t = totalsFromLines([line(565.11), line(3647.15), line(150)]);
    expect(t.ht).toBe(4362.26);
    expect(t.tva).toBe(353.34);
    expect(t.ttc).toBe(4715.6);
  });

  it("applies no TVA when the rate is null (HT = TTC)", () => {
    const t = totalsFromLines([line(565.11), line(3647.15), line(150)], null);
    expect(t.ht).toBe(4362.26);
    expect(t.tva).toBe(0);
    expect(t.ttc).toBe(4362.26);
  });

  it("treats a 0% rate as no TVA, same as Aucune (HT = TTC)", () => {
    const t = totalsFromLines([line(1000)], 0);
    expect(t.ht).toBe(1000);
    expect(t.tva).toBe(0);
    expect(t.ttc).toBe(1000);
  });

  it("applies a chosen non-standard rate", () => {
    const t = totalsFromLines([line(1000)], 2.6);
    expect(t.ht).toBe(1000);
    expect(t.tva).toBe(26);
    expect(t.ttc).toBe(1026);
  });

  it("is zero for an empty quote", () => {
    expect(totalsFromLines([])).toEqual({ ht: 0, discount_amount: 0, net: 0, tva: 0, ttc: 0 });
  });

  it("a null discount leaves totals unchanged (net = HT)", () => {
    const t = totalsFromLines([line(1000)], 8.1, null);
    expect(t).toEqual({ ht: 1000, discount_amount: 0, net: 1000, tva: 81, ttc: 1081 });
  });
});

describe("totalsFromLines with a discount (remise)", () => {
  it("applies a percentage to HT before TVA", () => {
    const t = totalsFromLines([line(1000)], 8.1, { kind: "percent", value: 10 });
    expect(t.discount_amount).toBe(100);
    expect(t.net).toBe(900);
    expect(t.tva).toBe(72.9);
    expect(t.ttc).toBe(972.9);
  });

  it("applies a fixed amount to HT before TVA", () => {
    const t = totalsFromLines([line(1000)], 8.1, { kind: "fixed", value: 150 });
    expect(t.discount_amount).toBe(150);
    expect(t.net).toBe(850);
    expect(t.tva).toBe(68.85);
    expect(t.ttc).toBe(918.85);
  });

  it("clamps a fixed discount that exceeds HT so net never goes below 0", () => {
    const t = totalsFromLines([line(100)], 8.1, { kind: "fixed", value: 150 });
    expect(t.discount_amount).toBe(100);
    expect(t.net).toBe(0);
    expect(t.tva).toBe(0);
    expect(t.ttc).toBe(0);
  });

  it("clamps a percentage above 100 to 100 (net 0)", () => {
    const t = totalsFromLines([line(100)], 8.1, { kind: "percent", value: 150 });
    expect(t.net).toBe(0);
    expect(t.ttc).toBe(0);
  });

  it("ignores a non-positive discount", () => {
    expect(totalsFromLines([line(1000)], 8.1, { kind: "percent", value: 0 }).net).toBe(1000);
    expect(totalsFromLines([line(1000)], 8.1, { kind: "fixed", value: -50 }).net).toBe(1000);
  });

  it("applies the discount with 0% VAT (TVA 0, TTC = net)", () => {
    const t = totalsFromLines([line(1000)], 0, { kind: "percent", value: 10 });
    expect(t.net).toBe(900);
    expect(t.tva).toBe(0);
    expect(t.ttc).toBe(900);
  });

  it("rounds the discount amount to 2dp", () => {
    // 333.33 * 33% = 109.9989 → rounds to 110.00
    const t = totalsFromLines([line(333.33)], null, { kind: "percent", value: 33 });
    expect(t.discount_amount).toBe(110);
    expect(t.net).toBe(223.33);
  });

  it("treats a non-finite (NaN) discount value as no discount, not a poisoned total", () => {
    const t = totalsFromLines([line(1000)], 8.1, { kind: "fixed", value: Number.NaN });
    expect(t.discount_amount).toBe(0);
    expect(t.net).toBe(1000);
    expect(t.ttc).toBe(1081);
  });

  it("handles a fixed discount exactly equal to HT (net 0)", () => {
    const t = totalsFromLines([line(500)], 8.1, { kind: "fixed", value: 500 });
    expect(t.net).toBe(0);
    expect(t.ttc).toBe(0);
  });

  it("handles a discount on an empty quote (HT 0 → net 0)", () => {
    const t = totalsFromLines([], 8.1, { kind: "percent", value: 10 });
    expect(t.ht).toBe(0);
    expect(t.discount_amount).toBe(0);
    expect(t.net).toBe(0);
  });
});

describe("normalizeDiscount", () => {
  it("passes a valid percent through", () => {
    expect(normalizeDiscount({ kind: "percent", value: 10 })).toEqual({ kind: "percent", value: 10 });
  });

  it("coerces a numeric string value", () => {
    expect(normalizeDiscount({ kind: "fixed", value: "150" })).toEqual({ kind: "fixed", value: 150 });
  });

  it("clamps a percentage above 100", () => {
    expect(normalizeDiscount({ kind: "percent", value: 150 })).toEqual({ kind: "percent", value: 100 });
  });

  it("rejects an unknown kind", () => {
    expect(normalizeDiscount({ kind: "remise", value: 10 })).toBeNull();
  });

  it("rejects non-finite, non-positive, and non-numeric values", () => {
    expect(normalizeDiscount({ kind: "fixed", value: Number.NaN })).toBeNull();
    expect(normalizeDiscount({ kind: "fixed", value: Number.POSITIVE_INFINITY })).toBeNull();
    expect(normalizeDiscount({ kind: "percent", value: 0 })).toBeNull();
    expect(normalizeDiscount({ kind: "fixed", value: -50 })).toBeNull();
    expect(normalizeDiscount({ kind: "fixed", value: "abc" })).toBeNull();
  });

  it("rejects null / non-objects", () => {
    expect(normalizeDiscount(null)).toBeNull();
    expect(normalizeDiscount(undefined)).toBeNull();
    expect(normalizeDiscount("percent")).toBeNull();
  });
});

describe("discountLabel", () => {
  it("labels a percentage with its value, a fixed amount plainly, and null as 'Remise'", () => {
    expect(discountLabel({ kind: "percent", value: 10 })).toBe("Remise 10%");
    expect(discountLabel({ kind: "fixed", value: 150 })).toBe("Remise");
    expect(discountLabel(null)).toBe("Remise");
  });
});
