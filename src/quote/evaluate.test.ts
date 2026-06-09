import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate";

describe("evaluate", () => {
  it("evaluates the Amina arrachage expression", () => {
    expect(evaluate("(5.25 + 2.90 + 7.60) * 2.76")).toBeCloseTo(43.47, 10);
  });

  it("evaluates the Amina pose expression to its unrounded value", () => {
    // 20.33 * 2.76 = 56.1108 — the rounding to 56.11 is compute.ts's job, not here.
    expect(evaluate("(5.25 + 2.90 + 2.16 + 2.42 + 7.60) * 2.76")).toBeCloseTo(56.1108, 10);
  });

  it("respects operator precedence and parentheses", () => {
    expect(evaluate("2 + 3 * 4")).toBe(14);
    expect(evaluate("(2 + 3) * 4")).toBe(20);
  });

  it("handles division and height-first order", () => {
    expect(evaluate("10 / 4")).toBe(2.5);
    expect(evaluate("2.76 * (5.25 + 2.90 + 7.60)")).toBeCloseTo(43.47, 10);
  });

  it("handles unary minus", () => {
    expect(evaluate("-5 + 8")).toBe(3);
    expect(evaluate("3 * -2")).toBe(-6);
  });

  it("ignores surrounding whitespace", () => {
    expect(evaluate("  1   +   2  ")).toBe(3);
  });

  it.each([
    ["malformed number", "1.2.3"],
    ["unexpected identifier", "5 + abc"],
    ["unbalanced parens", "(1 + 2"],
    ["trailing operator", "1 +"],
    ["empty", ""],
    ["division by zero", "1 / 0"],
    ["injection attempt", "process.exit(1)"],
  ])("throws on %s", (_label, expr) => {
    expect(() => evaluate(expr)).toThrow();
  });
});
