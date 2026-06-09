---
title: Code owns deterministic facts, the LLM owns language
date: 2026-06-08
category: architecture-patterns
module: voice-to-quote parser
problem_type: architecture_pattern
component: assistant
severity: high
applies_when:
  - An LLM output feeds arithmetic, comparisons, or downstream decisions
  - A wrong output could reach someone who acts on it before a human notices
  - The model could helpfully reconcile inconsistent inputs
  - Faithful transcription is required and corrections must be flagged, not applied
tags: [llm-extraction, deterministic-computation, trust-model, faithful-transcription, cross-line-check, over-flag-for-recall, code-owns-math, never-silently-wrong]
---

# Code owns deterministic facts, the LLM owns language

## Context

The build started from a tempting shortcut: a voice note comes in, an LLM is good at French and good at structure, so *let one strict-schema LLM call emit the whole quote* — descriptions, quantities, line totals, the override flags, the lot. One call, done.

The hidden assumption in that plan is that "the model is reliable enough to trust." But in this product a wrong number is the worst possible output: the draft goes in front of a paying client. So the real question isn't "is the model usually right?" — it's "what happens the one time it isn't, and would anyone notice?" An LLM that silently computes `(5.25 + 2.90 + 7.60) * 2.76` slightly wrong, or silently "fixes" two inconsistent wall measurements to make them agree, produces a confident, plausible, wrong quote. That failure is invisible until the client disputes it.

The friction that forced the rethink: arithmetic and flag-derivation are *deterministic* — there is exactly one correct answer and code can guarantee it — yet the naive design handed them to the one component that can only be *probabilistically* correct. The fix was to redraw the responsibility line.

## Guidance

**The responsibility split: code owns every deterministic fact, the LLM owns language only.** If a value can be computed, compared, or derived by a rule, it belongs to code. The model's job is the thing only a language model can do — turn spoken French into structured text and a formula-as-spoken. It emits the *expression* (`"(5.25 + 2.90 + 7.60) * 2.76"`), never the *result*.

This is enforced structurally, not by hoping. The extraction schema in `src/llm/extraction.ts` simply has no slot for the computed fields — `additionalProperties: false` plus a `required` list that omits `value`, `amount`, and `price_override`:

```ts
// quantity: model emits the formula as spoken — never the result
required: ["kind", "expression", "unit"],   // no "value", no "amount"
```

```ts
// rawToExtracted: the adapter hard-codes the absence
quantity: {
  kind: l.quantity.kind,
  expression: l.quantity.expression,
  value: null, // code computes this from the expression
  unit: l.quantity.unit,
},
```

**Code owns the math, with the ordering rule pinned in one place.** `computeLine` in `src/quote/compute.ts` rounds the evaluated value to 2dp *first*, then multiplies by the rate. Evaluation goes through a hand-written recursive-descent evaluator (`src/quote/evaluate.ts`) that accepts only `+ - * / ( )` and decimals — no JS `eval`, and anything outside that grammar throws loudly rather than silently producing a number:

```ts
if (quantity.expression !== null) {
  value = round2(evaluate(quantity.expression));
}
return { ...line, quantity: { ...quantity, value },
         amount: round2(value * rate), price_override, needs_review };
```

**"Trusted" means "never silently wrong," not "correct."** This reframe is the load-bearing idea. A component is trusted not because it's always right but because when it's wrong, it says so. Hence: **bias every call toward over-flagging — optimize for recall on dangerous errors, not precision.** A spurious flag costs the user two seconds; a missed one ships a wrong quote. Code even *reinforces* the model's flags so recall doesn't depend on the model remembering:

```ts
function reinforceNeedsReview(extracted, catalog_match, priceOverride) {
  if (extracted) return true;
  if (catalog_match.confidence === "low") return true;
  if (priceOverride === true && catalog_match.confidence === "high") return true;
  return false;
}
```

`price_override` is likewise a *comparison, not a judgement* (`derivePriceOverride`): three-state `"n/a" | false | true` from comparing the spoken rate to catalog candidate prices — so it lives in code, not the model.

**A deterministic safety net for each nameable failure.** Where a failure mode can be named, code catches it with certainty instead of leaving it to probabilistic LLM vigilance. `applyCrossLineChecks` in `src/quote/crossline.ts` parses each area expression into wall-lengths + height, groups by height, and flags any same-height group whose wall-sets disagree. Crucially it **writes a document-level review note and never auto-reconciles** ("faithful transcription, never helpful correction") — and it only covers the one canonical `(a + b + c) * h` shape, leaving everything else to LLM-only flagging rather than writing speculative inconsistency code.

**Decouple policy/settings facts too.** A later refinement: VAT applicability shouldn't be dictated in the voice either — it's policy, not language. Same principle generalized — facts that are *derivable or policy-driven* belong to code/settings, not the model.

**Name the residual risk honestly.** Code faithfully computes a *mis-transcribed* expression and cannot know it was misheard. That risk isn't hidden — it's pushed exactly to the human-finishes seam: `expression` and `raw_text` are surfaced on the page so the user glance-checks the formula against what he said.

## Why This Matters

The economics are asymmetric. The product deliberately drafts ~60% and a human finishes the rest — so flags aren't friction, they're the workflow. Against that backdrop a false positive costs two seconds of a glance; a false negative is a wrong number in a client-facing quote, discovered (if ever) during a dispute. When the downside is that lopsided, you tune for recall and you refuse to spend the model's probabilistic reliability on anything code can make certain.

And that's the deeper point: probabilistic flagging is strictly worse than a deterministic check *wherever code can guarantee the result*. An LLM asked "do these two lines disagree?" catches it most of the time. Parsing both expressions and comparing the term sets catches it every time. Using the model for the deterministic part doesn't just add cost and latency — it converts a guaranteed catch into a statistical one, for no benefit. Reserve the model for the part that has no deterministic solution (natural-language understanding) and let code own the rest.

## When to Apply

Apply this split whenever an LLM sits upstream of a decision or a number someone will act on:

- **Any extraction / parsing feature** where the model's output feeds arithmetic, comparisons, or downstream logic — emit the operands and let code do the operation.
- **Agents and tool-use** where the model could *choose* an irreversible or quantitative action — let it propose, let deterministic code derive status, totals, and side-effect eligibility (here: offers are DRAFT-only, contact creation needs explicit confirmation).
- **RAG / answer-synthesis** where retrieved facts get combined — don't let the model silently reconcile sources that conflict; surface the conflict.
- **Anywhere inconsistent inputs could be "helpfully" smoothed over.** The moment a model *can* reconcile contradictory inputs to look coherent, you need a deterministic net for the nameable conflicts and a faithful-transcription rule for the rest.
- **Faithful-transcription / compliance contexts** (quotes, invoices, medical, legal, financial) where "what was actually said/written" must survive intact and corrections must be flagged, never applied.

It's overkill when outputs are advisory, easily reversible, and not acted on numerically (brainstorming, draft prose a human will rewrite anyway). The test: *if this output were silently wrong, would it reach someone who'd act on it before a human noticed?* If yes, code owns the deterministic part.

## Examples

**1. Round-then-multiply lands the worked example on 4715.60.** The pose line is `(5.25 + 2.90 + 2.16 + 2.42 + 7.60) * 2.76` at 65 CHF/m².

- *Naive (multiply-then-round, or LLM does it):* `20.33 * 2.76 = 56.1108`, carried full-precision into `× 65 = 3647.202` → rounds to `3647.20`. Compounded across lines, the document total drifts off his real Bexio offer.
- *This design (round value first):* `round2(56.1108) = 56.11`, then `round2(56.11 * 65) = 3647.15`. The pose quantity 56.11 matches the figure in his actual Bexio offer, and the document lands on **TTC 4715.60** exactly. The ordering is pinned in `src/quote/compute.ts` and tested hard precisely because it's the difference between reconstructing his quote and quietly diverging from it.

**2. Model emits the expression; code computes the value.** The LLM returns `quantity.expression = "(5.25 + 2.90 + 7.60) * 2.76"` and `value` is absent from its schema entirely. `computeLine` evaluates the string through the safe evaluator and fills `value`/`amount`. The model never touched a number — it only transcribed the formula it heard. If the audio yielded trailing garbage like `"(5.25 + 2.90 + 7.60) * 2.76 ; merci"`, the evaluator throws on the trailing tokens instead of guessing — loud failure over silent wrong number.

**3. Cross-line wall-set mismatch caught deterministically.** Arrachage covers 3 walls `(5.25, 2.90, 7.60)`; pose covers 5 `(5.25, 2.90, 2.16, 2.42, 7.60)` — both at height 2.76. An LLM *might* notice. `applyCrossLineChecks` parses both into term-sets, sees the same height with differing signatures, and appends a document-level `review_notes` entry naming both wall-sets — every time, with certainty. It does **not** flip the pose line's `needs_review` (it stays `false`, matching the worked example) and it does **not** edit either line to make them agree. The discrepancy is surfaced for a human decision — "intentional or omission?" — never silently reconciled.

## Related

- `BUILD.md` — the "Parse contract" section is the canonical statement of who owns what (the LLM emits language; code owns `value`, `amount`, `price_override`, the cross-line net).
- `refs/quote-schema.md` — the frozen output contract, including the `price_override` three-state and `needs_review` rules.
- `docs/brainstorms/2026-06-08-standalone-quoting-mvp-requirements.md` and `docs/plans/2026-06-08-001-feat-quoting-foundation-slice-plan.md` — where this split was decided and built.
