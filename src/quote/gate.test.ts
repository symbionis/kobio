/**
 * The deterministic gate — Definition of Done #1 in BUILD.md.
 *
 * Feeding the canonical Amina extract through the deterministic pipeline
 * (compute → cross-line check) and totals must reproduce the worked example in
 * refs/quote-schema.md EXACTLY: three lines, 56.11 m² on the pose,
 * 565.11 / 3647.15 / 150, the cross-line review note present, TTC 4715.60.
 *
 * This is a pass/fail test, not a judgement call. The live recording (DoD #2)
 * is a best-effort demo and is not asserted here.
 */

import { describe, expect, it } from "vitest";
import { AMINA_EXTRACT } from "./fixture";
import { finishQuote } from "./parse";
import { totals } from "./totals";

describe("deterministic gate: Amina worked example", () => {
  const quote = finishQuote(AMINA_EXTRACT);

  it("produces three lines in spoken order", () => {
    expect(quote.lines.map((l) => l.description)).toEqual([
      "Arrachage de papier peint et préparation des fonds",
      "Pose de papier peint intissé",
      "Déplacement, tri des déchets, nettoyage de chantier",
    ]);
  });

  it("computes the arrachage line (43.47 m² → 565.11)", () => {
    const l = quote.lines[0];
    expect(l.quantity.value).toBe(43.47);
    expect(l.amount).toBe(565.11);
  });

  it("computes the pose line (56.11 m² → 3647.15)", () => {
    const l = quote.lines[1];
    expect(l.quantity.value).toBe(56.11);
    expect(l.amount).toBe(3647.15);
  });

  it("computes the déplacement forfait (value null → 150)", () => {
    const l = quote.lines[2];
    expect(l.quantity.value).toBeNull();
    expect(l.amount).toBe(150);
  });

  it("surfaces the cross-line review note, naming the two extra walls", () => {
    expect(quote.review_notes.length).toBeGreaterThanOrEqual(1);
    const joined = quote.review_notes.join(" ");
    expect(joined).toContain("2.16");
    expect(joined).toContain("2.42");
  });

  it("does NOT flip the pose line's needs_review (cross-line concern is doc-level only)", () => {
    expect(quote.lines[1].needs_review).toBe(false);
  });

  it("preserves the extractor's per-line flags faithfully", () => {
    expect(quote.lines[0].needs_review).toBe(true);
    expect(quote.lines[0].price_override).toBe(true);
    expect(quote.lines[1].price_override).toBe(false);
    expect(quote.lines[2].price_override).toBe("n/a");
  });

  it("totals to TTC 4715.60", () => {
    expect(totals(quote)).toEqual({ ht: 4362.26, tva: 353.34, ttc: 4715.6 });
  });
});
