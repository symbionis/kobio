/**
 * The faithful extraction step: transcript (+ catalog) → ExtractedQuote.
 *
 * The model emits language only — descriptions, the expression *as spoken*,
 * rates, catalog candidates, and liberal flags. It never emits value, amount,
 * or price_override (code owns those). The strict JSON schema below mirrors that
 * reduced shape; `rawToExtracted` adapts it to the ExtractedQuote the
 * deterministic pipeline consumes.
 */

import { chatJSON } from "./client";
import type {
  CatalogCandidate,
  Confidence,
  Contact,
  ExtractedQuote,
  QuantityKind,
  Unit,
} from "../quote/types";

interface RawQuantity {
  kind: QuantityKind;
  expression: string | null;
  unit: Unit;
}

interface RawLine {
  raw_text: string;
  description: string;
  quantity: RawQuantity;
  rate: number;
  rate_source: "spoken" | "catalog_default";
  catalog_match: { candidates: CatalogCandidate[]; confidence: Confidence };
  tax_rate: number;
  needs_review: boolean;
}

export interface RawQuote {
  intent: "create_offer";
  contact: Contact;
  title: string;
  tax_rate_default: number;
  lines: RawLine[];
  review_notes: string[];
}

/**
 * Strict JSON schema for the model's output. Every object sets
 * additionalProperties:false and lists all properties as required — the
 * structure OpenRouter's strict mode demands. Deliberately omits value, amount,
 * and price_override: those are code's.
 */
export const EXTRACTION_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["intent", "contact", "title", "tax_rate_default", "lines", "review_notes"],
  properties: {
    intent: { type: "string", enum: ["create_offer"] },
    contact: {
      type: "object",
      additionalProperties: false,
      required: ["spoken_name", "match", "action"],
      properties: {
        spoken_name: { type: "string" },
        match: { type: ["integer", "null"] },
        action: { type: "string", enum: ["match_or_create", "matched", "create_new"] },
      },
    },
    title: { type: "string" },
    tax_rate_default: { type: "number" },
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "raw_text",
          "description",
          "quantity",
          "rate",
          "rate_source",
          "catalog_match",
          "tax_rate",
          "needs_review",
        ],
        properties: {
          raw_text: { type: "string" },
          description: { type: "string" },
          quantity: {
            type: "object",
            additionalProperties: false,
            required: ["kind", "expression", "unit"],
            properties: {
              kind: { type: "string", enum: ["area", "count", "linear", "hours", "forfait"] },
              expression: { type: ["string", "null"] },
              unit: { type: ["string", "null"], enum: ["m2", "Stk", "h", "ml", null] },
            },
          },
          rate: { type: "number" },
          rate_source: { type: "string", enum: ["spoken", "catalog_default"] },
          catalog_match: {
            type: "object",
            additionalProperties: false,
            required: ["candidates", "confidence"],
            properties: {
              candidates: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["article_id", "name", "catalog_price"],
                  properties: {
                    article_id: { type: "integer" },
                    name: { type: "string" },
                    catalog_price: { type: "number" },
                  },
                },
              },
              confidence: { type: "string", enum: ["high", "low", "none"] },
            },
          },
          tax_rate: { type: "number" },
          needs_review: { type: "boolean" },
        },
      },
    },
    review_notes: { type: "array", items: { type: "string" } },
  },
};

export const SYSTEM_PROMPT = `Tu extrais un devis structuré à partir d'une note vocale en français dictée par un peintre/artisan sur chantier. Tu produis UNIQUEMENT du JSON conforme au schéma imposé.

RÈGLES ABSOLUES
1. Transcription fidèle, jamais de correction « utile ». Reporte chaque ligne exactement comme dictée. Si deux lignes sont incohérentes (ex. l'arrachage couvre 3 murs, la pose 5), NE les réconcilie PAS : laisse-les telles quelles et signale-le dans review_notes. Mettre un mauvais chiffre devant un client est la pire erreur.
2. Tu n'effectues AUCUN calcul. Tu ne produis ni quantity.value, ni amount, ni price_override — le code s'en charge.
3. quantity.expression = la formule exactement comme dictée, en chiffres avec un point décimal. Ex. « cinq virgule vingt-cinq plus deux virgule nonante fois deux virgule septante-six » → "(5.25 + 2.90) * 2.76". Pour un simple nombre dicté (« cinq radiateurs ») → expression = "5". Pour un montant global → kind = "forfait" et expression = null.
4. quantity.kind : "area" (m²), "count" (unités), "linear" (mètres linéaires), "hours" (heures), "forfait" (montant global).
5. rate = le prix unitaire dicté, ou le montant du forfait. En cas de doute sur l'unité ou le prix → needs_review = true.
6. catalog_match : à partir du catalogue fourni, propose 0..n articles candidats (article_id, name, catalog_price) qui pourraient correspondre, et fixe confidence à "high", "low" ou "none". N'impose jamais une correspondance 1↔1 : une ligne peut ne correspondre à aucun article (candidates: [], confidence: "none"). Le catalogue est une mémoire, jamais un moyen de remplacer un prix dicté.
7. needs_review = true dès qu'un élément est ambigu : audio peu clair, unité manquante, prix incertain. Signale largement — un faux signal coûte deux secondes, un signal manqué coûte un devis faux.
8. contact.spoken_name : le nom exactement comme entendu. match = null. action = "match_or_create".
9. review_notes : remarques au niveau du document (notamment les incohérences entre lignes que tu remarques).
10. Conserve le français du contenu (descriptions, titre).

EXEMPLE
Transcription : « Créer une offre pour Amina Bensassi, titre Offre pour dépose de papier peint et pose. Arrachage de papier peint et préparation des fonds sur les murs de 5,25, 2,90 et 7,60 sur 2,76, à 13 francs du mètre carré. Repose du papier peint intissé sur 5,25, 2,90, 2,16, 2,42 et 7,60 sur 2,76, à 65 francs le mètre carré. Déplacement, tri des déchets et nettoyage de chantier à 150 francs forfait. TVA 8,1 %. »

Sortie attendue :
{
  "intent": "create_offer",
  "contact": { "spoken_name": "Amina Bensassi", "match": null, "action": "match_or_create" },
  "title": "Offre pour dépose de papier peint et pose",
  "tax_rate_default": 8.1,
  "lines": [
    {
      "raw_text": "Arrachage de papier peint et préparation des fonds ... 13 francs du mètre carré",
      "description": "Arrachage de papier peint et préparation des fonds",
      "quantity": { "kind": "area", "expression": "(5.25 + 2.90 + 7.60) * 2.76", "unit": "m2" },
      "rate": 13, "rate_source": "spoken",
      "catalog_match": { "candidates": [ { "article_id": 4, "name": "Arrachage du revêtement existant", "catalog_price": 15 }, { "article_id": 15, "name": "Préparation des fonds", "catalog_price": 18 } ], "confidence": "low" },
      "tax_rate": 8.1, "needs_review": true
    },
    {
      "raw_text": "Repose du papier peint intissé ... 65 francs le mètre carré",
      "description": "Pose de papier peint intissé",
      "quantity": { "kind": "area", "expression": "(5.25 + 2.90 + 2.16 + 2.42 + 7.60) * 2.76", "unit": "m2" },
      "rate": 65, "rate_source": "spoken",
      "catalog_match": { "candidates": [ { "article_id": 1, "name": "Pose de papier peint intissé à raccords", "catalog_price": 65 } ], "confidence": "high" },
      "tax_rate": 8.1, "needs_review": false
    },
    {
      "raw_text": "Déplacement, tri des déchets, nettoyage de chantier à 150 francs forfait",
      "description": "Déplacement, tri des déchets, nettoyage de chantier",
      "quantity": { "kind": "forfait", "expression": null, "unit": null },
      "rate": 150, "rate_source": "spoken",
      "catalog_match": { "candidates": [], "confidence": "none" },
      "tax_rate": 8.1, "needs_review": false
    }
  ],
  "review_notes": [ "L'arrachage couvre 3 murs (5.25, 2.90, 7.60) ; la pose en couvre 5 (ajoute 2.16, 2.42). Intentionnel ou oubli ? Signalé, non réconcilié." ]
}`;

export function buildUserMessage(transcript: string, catalogText: string): string {
  return `Catalogue (mémoire, pas source de vérité — ne jamais écraser un prix dicté) :
${catalogText}

---

Transcription de la note vocale :
${transcript}`;
}

/** Adapt the model's reduced output to the ExtractedQuote the pipeline consumes. */
export function rawToExtracted(raw: RawQuote): ExtractedQuote {
  return {
    intent: "create_offer",
    contact: raw.contact,
    title: raw.title,
    tax_rate_default: raw.tax_rate_default,
    review_notes: raw.review_notes,
    lines: raw.lines.map((l) => ({
      raw_text: l.raw_text,
      description: l.description,
      quantity: {
        kind: l.quantity.kind,
        expression: l.quantity.expression,
        value: null, // code computes this from the expression
        unit: l.quantity.unit,
      },
      rate: l.rate,
      rate_source: l.rate_source,
      catalog_match: l.catalog_match,
      tax_rate: l.tax_rate,
      needs_review: l.needs_review,
    })),
  };
}

/** One OpenRouter chat call → faithful ExtractedQuote. */
export async function extractQuote(
  transcript: string,
  catalogText: string,
): Promise<ExtractedQuote> {
  const raw = await chatJSON<RawQuote>({
    system: SYSTEM_PROMPT,
    user: buildUserMessage(transcript, catalogText),
    schemaName: "quote_extraction",
    schema: EXTRACTION_SCHEMA,
    temperature: 0,
  });
  return rawToExtracted(raw);
}
