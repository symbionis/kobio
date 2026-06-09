import { describe, expect, it } from "vitest";
import { parseNum } from "./input";

describe("parseNum", () => {
  it("parses plain decimals", () => {
    expect(parseNum("12.5")).toBe(12.5);
    expect(parseNum("65")).toBe(65);
  });

  it("tolerates fr-CH comma decimals", () => {
    expect(parseNum("5,25")).toBe(5.25);
  });

  it("returns 0 for empty input", () => {
    expect(parseNum("")).toBe(0);
  });

  it("returns 0 — never NaN — for non-numeric or partial input", () => {
    expect(parseNum("abc")).toBe(0);
    expect(parseNum(".")).toBe(0);
    expect(Number.isNaN(parseNum("abc"))).toBe(false);
  });
});
