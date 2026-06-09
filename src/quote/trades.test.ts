import { describe, expect, it } from "vitest";
import { TRADES, asTrade, isTrade, tradeLabel } from "./trades";

describe("trades taxonomy", () => {
  it("values are unique and lowercase slugs (round-trip-safe)", () => {
    const values = TRADES.map((t) => t.value);
    expect(new Set(values).size).toBe(values.length);
    for (const v of values) expect(v).toBe(v.toLowerCase());
  });
});

describe("isTrade", () => {
  it("accepts every known value, rejects everything else", () => {
    for (const t of TRADES) expect(isTrade(t.value)).toBe(true);
    expect(isTrade("banana")).toBe(false);
    expect(isTrade("")).toBe(false);
    expect(isTrade(null)).toBe(false);
    expect(isTrade(undefined)).toBe(false);
    expect(isTrade(42)).toBe(false);
    expect(isTrade({})).toBe(false);
    // case-sensitive: stored values are lowercase, labels are not values
    expect(isTrade("Peinture")).toBe(false);
  });
});

describe("asTrade", () => {
  it("returns the value for known trades, null otherwise", () => {
    expect(asTrade("peinture")).toBe("peinture");
    expect(asTrade("electricite")).toBe("electricite");
    expect(asTrade("banana")).toBeNull();
    expect(asTrade("")).toBeNull();
    expect(asTrade(null)).toBeNull();
    expect(asTrade(undefined)).toBeNull();
    expect(asTrade(42)).toBeNull();
    expect(asTrade("Peinture")).toBeNull();
  });
});

describe("tradeLabel", () => {
  it("maps value → display label, null for unknown/null", () => {
    expect(tradeLabel("peinture")).toBe("Peinture");
    expect(tradeLabel("electricite")).toBe("Électricité");
    expect(tradeLabel("banana")).toBeNull();
    expect(tradeLabel(null)).toBeNull();
  });
});
