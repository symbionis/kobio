# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Quote domain

### Quote
The structured draft a voice note becomes — a titled set of priced lines for one client, with totals. Rendered to the client as a devis (the PDF document).
*Avoid:* using "devis" for the internal object; "Quote" is the internal noun, "devis" is the output document.

A Quote is a draft the tool fills partially and a human finishes; it is never sent or written to an external system without human review.

### Line
One priced item on a Quote. Its quantity is dictated as a formula (e.g. wall lengths times a height) or, for a lump sum, as a Forfait. The spoken price always wins over any stored catalog price.

### Forfait
A Line priced as a single lump sum with no quantity or unit — e.g. a déplacement or site cleanup. Its amount is the rate itself; there is no formula to evaluate.

### Remise
An optional, quote-level discount applied to the pre-tax total before TVA — either a percentage or a fixed amount, never per Line. Tax is computed on the discounted total (the net), and the discount is clamped so the net can never fall below zero.

### Catalog
The builder's stored pricing for his trade, used as *memory, not source of truth*: a spoken price always overrides a catalog price, and the divergence is recorded (see Override log) so stored rates converge on his real ones over time.

## Parse rules and checks

### Parse contract
The division of responsibility when turning a voice note into a Quote: the language model owns language only (descriptions, the formula-as-spoken, catalog candidates, flags), while code owns every deterministic fact (the arithmetic, status, the price-override comparison, and the cross-line check). The model never emits a computed number.

### Faithful transcription
The rule that each Line is reported exactly as dictated and never "helpfully" corrected. When two Lines are mutually inconsistent, the system flags the conflict for review rather than reconciling it — a wrong number reaching a client is the worst failure mode.

### Cross-line check
A deterministic check that flags when two area Lines at the same height cover different sets of wall lengths. It raises a document-level review note for a human to judge ("intentional or omission?") and never edits the Lines to make them agree.

### Override log
The record of every Line whose spoken rate differed from its matched catalog price. It is the learning signal that lets stored catalog rates converge on the builder's real rates over time; no prediction is performed on it yet.
