/**
 * The canonical Amina Bensassi note, as the faithful extractor would emit it.
 *
 * This is the fixture the endpoint falls back to when no OPENROUTER_API_KEY is
 * set, and it is the input to the deterministic gate test. Note what is NOT
 * here: no `amount`, no `price_override`, and `quantity.value` is null on the
 * expression lines — code owns those. The cross-line review note is also
 * absent: the net adds it. Feeding this through computeQuote →
 * applyCrossLineChecks must reproduce the worked example in
 * refs/quote-schema.md exactly (TTC 4715.60).
 */

import type { ExtractedQuote } from "./types";

/** What Whisper (FR) would return for the note — used by the transcribe stub. */
export const AMINA_TRANSCRIPT =
  "Créer une offre pour Amina Bensassi, titre « Offre pour dépose de papier " +
  "peint et pose ». Arrachage de papier peint et préparation des fonds sur les " +
  "murs de 5,25, 2,90 et 7,60 sur une hauteur de 2,76, à 13 francs du mètre " +
  "carré. Repose du papier peint intissé sur 5,25, 2,90, 2,16, 2,42 et 7,60 " +
  "sur 2,76, à 65 francs le mètre carré. Déplacement, tri des déchets et " +
  "nettoyage de chantier à 150 francs forfait. TVA 8,1 pour cent.";

/** The extractor output for the Amina note (no amount; value null on expr lines). */
export const AMINA_EXTRACT: ExtractedQuote = {
  intent: "create_offer",
  contact: { spoken_name: "Amina Bensassi", match: null, action: "match_or_create" },
  title: "Offre pour dépose de papier peint et pose",
  tax_rate_default: 8.1,
  lines: [
    {
      raw_text:
        "arrachage de papier peint et préparation des fonds ... 13 francs du mètre carré",
      description: "Arrachage de papier peint et préparation des fonds",
      quantity: { kind: "area", expression: "(5.25 + 2.90 + 7.60) * 2.76", value: null, unit: "m2" },
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
      raw_text: "repose du papier peint ... 65 francs le mètre carré ... papier peint intissé",
      description: "Pose de papier peint intissé",
      quantity: {
        kind: "area",
        expression: "(5.25 + 2.90 + 2.16 + 2.42 + 7.60) * 2.76",
        value: null,
        unit: "m2",
      },
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
      raw_text: "déplacement à 150 francs. Déplacement, tri des déchets, nettoyage de chantier",
      description: "Déplacement, tri des déchets, nettoyage de chantier",
      quantity: { kind: "forfait", expression: null, value: null, unit: null },
      rate: 150,
      rate_source: "spoken",
      catalog_match: { candidates: [], confidence: "none" },
      tax_rate: 8.1,
      needs_review: false,
    },
  ],
  // The extractor raised no document-level notes here; the cross-line net adds
  // the arrachage/pose wall-set note during finishQuote().
  review_notes: [],
};
