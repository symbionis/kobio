import { describe, expect, it } from "vitest";
import { finishQuote } from "../quote/parse";
import { totals } from "../quote/totals";
import { EXTRACTION_SCHEMA, rawToExtracted, type RawQuote } from "./extraction";

// What the model is expected to return for the Amina note: language only, no
// value / amount / price_override.
const RAW_AMINA: RawQuote = {
  intent: "create_offer",
  contact: { spoken_name: "Amina Bensassi", match: null, action: "match_or_create" },
  title: "Offre pour dépose de papier peint et pose",
  tax_rate_default: 8.1,
  lines: [
    {
      raw_text: "Arrachage ... 13 francs du mètre carré",
      description: "Arrachage de papier peint et préparation des fonds",
      quantity: { kind: "area", expression: "(5.25 + 2.90 + 7.60) * 2.76", unit: "m2" },
      rate: 13,
      rate_source: "spoken",
      catalog_match: {
        candidates: [
          { article_id: 4, name: "Arrachage du revêtement existant", catalog_price: 15 },
          { article_id: 15, name: "Préparation des fonds", catalog_price: 18 },
        ],
        confidence: "low",
      },
      tax_rate: 8.1,
      needs_review: true,
    },
    {
      raw_text: "Repose ... 65 francs le mètre carré",
      description: "Pose de papier peint intissé",
      quantity: { kind: "area", expression: "(5.25 + 2.90 + 2.16 + 2.42 + 7.60) * 2.76", unit: "m2" },
      rate: 65,
      rate_source: "spoken",
      catalog_match: {
        candidates: [
          { article_id: 1, name: "Pose de papier peint intissé à raccords", catalog_price: 65 },
        ],
        confidence: "high",
      },
      tax_rate: 8.1,
      needs_review: false,
    },
    {
      raw_text: "Déplacement ... 150 francs forfait",
      description: "Déplacement, tri des déchets, nettoyage de chantier",
      quantity: { kind: "forfait", expression: null, unit: null },
      rate: 150,
      rate_source: "spoken",
      catalog_match: { candidates: [], confidence: "none" },
      tax_rate: 8.1,
      needs_review: false,
    },
  ],
  review_notes: [],
};

describe("rawToExtracted → finishQuote", () => {
  it("turns a model response into the worked example (TTC 4715.60)", () => {
    const quote = finishQuote(rawToExtracted(RAW_AMINA));
    expect(quote.lines[0].quantity.value).toBe(43.47);
    expect(quote.lines[0].amount).toBe(565.11);
    expect(quote.lines[1].quantity.value).toBe(56.11);
    expect(quote.lines[1].amount).toBe(3647.15);
    expect(quote.lines[2].amount).toBe(150);
    expect(totals(quote)).toEqual({ ht: 4362.26, tva: 353.34, ttc: 4715.6 });
  });

  it("derives price_override in code from the model's candidates + rate", () => {
    const quote = finishQuote(rawToExtracted(RAW_AMINA));
    expect(quote.lines[0].price_override).toBe(true); // 13 ∉ {15, 18}
    expect(quote.lines[1].price_override).toBe(false); // 65 ∈ {65}
    expect(quote.lines[2].price_override).toBe("n/a"); // no candidates
  });

  it("sets quantity.value to null on adaptation (code computes it later)", () => {
    const extracted = rawToExtracted(RAW_AMINA);
    expect(extracted.lines.every((l) => l.quantity.value === null)).toBe(true);
  });
});

describe("EXTRACTION_SCHEMA is strict everywhere", () => {
  // OpenRouter's strict mode requires every object to set additionalProperties:false
  // and list all of its properties as required. Drift here = a 400 from the API.
  function assertStrict(node: unknown, path: string): void {
    if (Array.isArray(node) || node === null || typeof node !== "object") return;
    const schema = node as Record<string, unknown>;
    if (schema.type === "object") {
      expect(schema.additionalProperties, `${path}.additionalProperties`).toBe(false);
      const props = Object.keys((schema.properties ?? {}) as Record<string, unknown>);
      const required = (schema.required ?? []) as string[];
      expect([...required].sort(), `${path}.required`).toEqual([...props].sort());
    }
    for (const [key, value] of Object.entries(schema)) {
      assertStrict(value, `${path}.${key}`);
    }
  }

  it("every object node is closed and fully required", () => {
    assertStrict(EXTRACTION_SCHEMA, "schema");
  });
});
