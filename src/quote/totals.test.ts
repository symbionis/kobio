import { describe, expect, it } from "vitest";
import { totalsFromLines } from "./totals";
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

  it("applies a chosen non-standard rate", () => {
    const t = totalsFromLines([line(1000)], 2.6);
    expect(t.ht).toBe(1000);
    expect(t.tva).toBe(26);
    expect(t.ttc).toBe(1026);
  });

  it("is zero for an empty quote", () => {
    expect(totalsFromLines([])).toEqual({ ht: 0, tva: 0, ttc: 0 });
  });
});
