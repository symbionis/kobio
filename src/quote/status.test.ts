import { describe, expect, it } from "vitest";
import { deriveStatus } from "./status";
import type { Line } from "./types";

function line(needs_review: boolean): Line {
  return {
    raw_text: "",
    description: "",
    quantity: { kind: "forfait", expression: null, value: null, unit: null },
    rate: 100,
    rate_source: "spoken",
    amount: 100,
    catalog_match: { candidates: [], confidence: "none" },
    price_override: "n/a",
    tax_rate: 8.1,
    needs_review,
  };
}

describe("deriveStatus", () => {
  it("Draft while any line has an unresolved needs_review flag (AE1)", () => {
    expect(deriveStatus([line(false), line(true)], false)).toBe("Draft");
  });

  it("Ready once every flag is cleared (AE1)", () => {
    expect(deriveStatus([line(false), line(false)], false)).toBe("Ready");
  });

  it("never auto-sets Sent — a cleared quote is Ready, not Sent (AE1)", () => {
    expect(deriveStatus([line(false)], false)).toBe("Ready");
  });

  it("Sent overrides line state once marked", () => {
    expect(deriveStatus([line(true)], true)).toBe("Sent");
    expect(deriveStatus([line(false)], true)).toBe("Sent");
  });

  it("an empty quote is Ready", () => {
    expect(deriveStatus([], false)).toBe("Ready");
  });
});
