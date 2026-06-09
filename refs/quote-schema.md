# Quote schema — parser output contract

This is the fixed shape the parser produces from one voice note. It is
trade-agnostic by design: the *shape* never changes between trades, only the
*content* (vocabulary, catalog, typical units). Build the parser to target
this contract. Do not invent per-trade schemas.

The worked example at the bottom is the painter note (Amina Bensassi). A
correct parser reproduces it from the transcript.

---

## Top-level object

```jsonc
{
  "intent": "create_offer",          // currently always create_offer
  "contact": {
    "spoken_name": "Amina Bensassi", // exactly as transcribed
    "match": null,                   // resolved Bexio contact_id, or null
    "action": "match_or_create"      // match_or_create | matched | create_new
  },
  "title": "string",                 // the offer title he dictates
  "tax_rate_default": 8.1,           // VAT he states for the whole offer
  "lines": [ /* line objects, in spoken order */ ],
  "review_notes": [ "string" ]       // document-level flags for his eye
}
```

Rules:
- `contact.match` stays null until a Bexio lookup resolves it. Creating a
  contact is a write path with its own confirmation step — never auto-create
  from a transcribed name. Match against existing contacts first.
- `review_notes` is where cross-line concerns go (see hard rules below).

---

## Line object

```jsonc
{
  "raw_text": "string",        // the span of transcript this line came from
  "description": "string",     // cleaned line text for the quote
  "quantity": {
    "kind": "area",            // area | count | linear | hours | forfait
    "expression": "(5.25 + 2.90 + 7.60) * 2.76",  // what he said; null if none
    "value": 43.47,            // computed result; null when kind = forfait
    "unit": "m2"               // m2 | Stk | h | ml | null
  },
  "rate": 13,                  // price per unit, or the forfait lump
  "rate_source": "spoken",     // spoken | catalog_default
  "amount": 565.11,            // value * rate; for forfait = rate
  "catalog_match": {
    "candidates": [            // 0..n; never assume 1:1
      { "article_id": 4, "name": "Arrachage du revêtement existant", "catalog_price": 15 }
    ],
    "confidence": "low"        // high | low | none
  },
  "price_override": true,      // true | false | "n/a"
  "tax_rate": 8.1,             // usually inherits tax_rate_default
  "needs_review": true
}
```

### Field notes

- **`quantity.kind`** is the field that absorbs trade variation. Painting is
  `area`; a plumber's "five radiators" is `count`; skirting is `linear`;
  labour is `hours`; a déplacement is `forfait`. One field, not five schemas.
- **`quantity.expression`** keeps the audit trail. He dictates a formula, not a
  number — store what he said so he can glance-check the maths. Computation is
  deterministic; getting it wrong = a wrong quote, so test it hard.
- **`quantity.value`** is null only for `forfait`.
- **`rate_source`** separates "he said the price" from "we filled the catalog
  default." This is the product's learning signal — see below.
- **`catalog_match.candidates`** is a list, possibly empty. One spoken line can
  blend two articles (arrachage + préparation) or map to none (déplacement).
  Never force 1:1.
- **`price_override`** is three-state:
  - `true`  — spoken rate ≠ a confident catalog match
  - `false` — spoken rate = the catalog match
  - `"n/a"` — nothing to compare against (no confident match)
- **`needs_review`** = true whenever confidence is low, a price is overridden
  against a high-confidence match, or anything was ambiguous in the audio.

---

## How the catalog learns (layers 2, not 1)

The catalog is **memory, not source of truth**. Prices come from his mouth.
When `rate_source = "spoken"` and it differs from a matched article, log the
override. Over time the stored rate converges on his real rate, and future
notes can autofill it as a `catalog_default`. That is the path from 60% → 80%,
and it is trade-agnostic because the rule is just "spoken price beats stored
price, remember the difference."

Do not build pattern/prediction logic now. The override log is the data you'd
need if you ever do.

---

## Hard rules (the parser must obey these)

1. **Faithful transcription, never helpful correction.** Compute each line
   exactly as dictated. If lines are mutually inconsistent (e.g. arrachage
   covers 3 walls, pose covers 5), DO NOT reconcile them. Raise a
   `review_notes` entry and leave both lines as spoken. Silent "fixing" is the
   worst failure mode — it puts a wrong number in front of a client.
2. **Spoken price always wins** over the catalog price.
3. **Nothing writes to Bexio without human review.** Offers are created as
   DRAFT only. Contact creation requires explicit confirmation of the spelling.
4. **When unsure, flag — don't guess.** Low-confidence match, unclear audio,
   missing unit → `needs_review: true` and surface it. The tool drafts ~60%;
   the human finishes the rest. That split is the product, not a limitation.

---

## Worked example — Amina Bensassi note

Transcript (FR, abridged): create offer for contact Amina Bensassi, title
"offre pour dépose de papier peint et pose"; arrachage + préparation des fonds
on walls 5.25 / 2.90 / 7.60 × 2.76 at 13 CHF/m²; repose papier peint intissé on
5.25 / 2.90 / 2.16 / 2.42 / 7.60 × 2.76 at 65 CHF/m²; déplacement + tri déchets
+ nettoyage 150 CHF forfait; TVA 8.1%.

```jsonc
{
  "intent": "create_offer",
  "contact": { "spoken_name": "Amina Bensassi", "match": null, "action": "match_or_create" },
  "title": "Offre pour dépose de papier peint et pose",
  "tax_rate_default": 8.1,
  "lines": [
    {
      "raw_text": "arrachage de papier peint et préparation des fonds ... 13 francs du mètre carré",
      "description": "Arrachage de papier peint et préparation des fonds",
      "quantity": { "kind": "area", "expression": "(5.25 + 2.90 + 7.60) * 2.76", "value": 43.47, "unit": "m2" },
      "rate": 13, "rate_source": "spoken", "amount": 565.11,
      "catalog_match": { "candidates": [
        { "article_id": 4, "name": "Arrachage du revêtement existant", "catalog_price": 15 },
        { "article_id": 15, "name": "Préparation des fonds", "catalog_price": 18 }
      ], "confidence": "low" },
      "price_override": true, "tax_rate": 8.1, "needs_review": true
    },
    {
      "raw_text": "repose du papier peint ... 65 francs le mètre carré ... papier peint intissé",
      "description": "Pose de papier peint intissé",
      "quantity": { "kind": "area", "expression": "(5.25 + 2.90 + 2.16 + 2.42 + 7.60) * 2.76", "value": 56.11, "unit": "m2" },
      "rate": 65, "rate_source": "spoken", "amount": 3647.15,
      "catalog_match": { "candidates": [
        { "article_id": 1, "name": "Pose de papier peint intissé à raccords", "catalog_price": 65 }
      ], "confidence": "high" },
      "price_override": false, "tax_rate": 8.1, "needs_review": false
    },
    {
      "raw_text": "déplacement à 150 francs. Déplacement, tri des déchets, nettoyage de chantier",
      "description": "Déplacement, tri des déchets, nettoyage de chantier",
      "quantity": { "kind": "forfait", "expression": null, "value": null, "unit": null },
      "rate": 150, "rate_source": "spoken", "amount": 150,
      "catalog_match": { "candidates": [], "confidence": "none" },
      "price_override": "n/a", "tax_rate": 8.1, "needs_review": false
    }
  ],
  "review_notes": [
    "Arrachage covers 3 walls (5.25, 2.90, 7.60); pose covers 5 (adds 2.16, 2.42). Intentional or omission? Flagged for review — not reconciled."
  ]
}
```

Totals: HT 4362.26 + TVA 8.1% (353.34) = **TTC 4715.60**. The pose quantity
(56.11) matches the figure in his real Bexio offer — the parse reconstructs his
actual quote.
