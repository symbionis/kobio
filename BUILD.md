# Build brief — voice-to-quote prototype

Read `CLAUDE.md` and `refs/quote-schema.md` first. The schema is the fixed
output contract. The hard rules in both files apply.

## Goal

One page. Record a voice note → get a draft quote back → edit it. Prove the
loop on Nicolas's own notes. Nothing more.

## Scope — build exactly this, no more

1. **Page** (`/`) — single screen:
   - A record button (browser `MediaRecorder`).
   - A short reminder list of what to say on-site: surfaces, m², ce qu'on
     arrache / pose, l'accès, et les prix.
   - On stop, POST the audio to the endpoint, show a loading state.

2. **Endpoint** (`POST /api/quote`) — transcribe → extract → compute → return:
   - **Transcribe** the audio (OpenRouter `/audio/transcriptions`,
     GPT-4o-transcribe, French — chosen for number accuracy after Whisper
     large-v3-turbo dropped a digit on a real note).
   - **Extract** — one OpenRouter chat call (GPT, strict `json_schema`): system
     prompt = the quote-schema contract + the worked example as a one-shot;
     context = the catalog from `refs/catalog.json`; input = the transcript;
     low temperature. The model is a *faithful extractor only* — see "Parse
     contract" below.
   - **Compute & check** — code owns all arithmetic and the cross-line safety
     net, not the model. See "Parse contract".
   - **Return** `{ transcript, quote }` to the page, schema-valid.

3. **Render** — display the quote from the JSON:
   - `review_notes` shown at the top.
   - Lines with `needs_review: true` visually highlighted.
   - Every field editable inline (description, quantity, rate, amount).
   - Show `quantity.expression` next to each computed value so he can
     glance-check the maths.
   - A read-only running total (HT, TVA, TTC).

## Parse contract

Settles who is trusted with what. The guiding redefinition: "trusted" does not
mean *correct*, it means *never silently wrong*. The tool drafts ~60%; a
spurious flag costs Nicolas two seconds, a silent reconciliation puts a wrong
number in front of a client. Bias every call toward over-flagging.

**The extraction call (OpenRouter → GPT, strict `json_schema`) is a faithful
extractor — it never does arithmetic.** It emits, per line: `raw_text`,
`description`, `quantity.kind`, `quantity.expression` (the formula *exactly as
spoken*), `quantity.unit`, `rate`, `rate_source`,
`catalog_match.candidates` + `confidence`, `tax_rate`, `needs_review`; plus
document-level `contact`, `title`, `tax_rate_default`, and any `review_notes`
it spots. It does **not** emit `quantity.value`, `amount`, or `price_override`
— code owns those.

**Code owns all the math.** One rule, pinned in tests — round value to 2dp,
*then* multiply; this ordering is what makes the worked example land on
4715.60:
- `forfait` → `value: null`, `amount: rate`
- expression present → `value = round(eval(expr), 2)`, `amount = round(value × rate, 2)`
- expression absent, non-forfait (a bare spoken count, e.g. "cinq radiateurs")
  → `value` = the dictated number, `amount = round(value × rate, 2)`

The expression evaluator handles only `+ - * / ( )` and decimals. Test it hard.

**Code owns the derivable line flags.** `price_override` is a comparison, not a
judgement: `"n/a"` when there are no candidates, `false` when the spoken rate
equals a candidate price, `true` otherwise (reproduces the worked example —
arrachage 13 vs {15, 18} → true; pose 65 vs {65} → false). Code also reinforces
`needs_review`, forcing it true on low confidence or an override against a
high-confidence match, so the over-flag bias does not depend on the model
remembering to set it.

**Code owns the cross-line safety net** for the one nameable failure: two
`area` lines at the **same height** (same multiplier) with **differing
wall-sets**. Code parses each expression into its additive terms (wall lengths)
and the multiplier (height); when two same-height area lines have non-identical
term sets, it writes a document-level `review_notes` entry naming both sets —
and does **not** flip either line's `needs_review` (matches the worked example:
the pose line stays `needs_review: false`). Union these with any `review_notes`
the model raised. Everything outside this exact shape stays LLM-flagged only —
no speculative inconsistency code until a real note shows another shape.

**Residual risk, by design:** code faithfully computes a *mis-transcribed*
expression and can't know. That lands where the human-finishes split expects it
— `expression` and `raw_text` are surfaced on the page so Nicolas glance-checks
the formula against what he said.

## Stack

- Next.js, deployed on Railway. Supabase available but not required for the
  prototype — `refs/catalog.json` is fine as the catalog source for now.
- Reuse `src/bexio/` only for reads if needed. No writes.

## Do NOT build yet

- No Bexio write / no draft-offer creation. Render only.
- No auth, no multi-user, no accounts.
- No conversational clarification loop. Clarifications are surfaced as
  highlighted fields the user edits — a form, not a back-and-forth.
- No pattern/prediction logic.

## Definition of done

Two bars, kept separate because one is deterministic and one is not:

1. **The gate (deterministic).** Feeding the canonical Amina transcript (the
   worked example in `refs/quote-schema.md`) through extract → compute → check
   reproduces that quote exactly: three lines, 56.11 m² on the pose, the
   cross-line review note present, TTC = 4715.60. This is a pass/fail test, not
   a judgement call.
2. **The demo (best-effort).** Nicolas's Amina note, recorded live through the
   page, comes back as a usable draft he can edit field by field. Whisper and
   speech variance make this non-deterministic, so it is the demo of the loop —
   not the pass/fail gate.
