# CLAUDE.md — bati-assist

Working rules for this repo. Read before acting. Then read `BUILD.md` (current
task) and `refs/quote-schema.md` (the output contract).

## What this project does

Turns a builder's on-site voice note into a draft quote. Pilot client is
Nicolas Soufflet (LDT Batiment SARL, painter/decorator) on Bexio, but the tool
is being built as a product for any trade. The schema is trade-agnostic by
design — see `refs/quote-schema.md`.

Auth to Bexio is a full-scope Personal Access Token (developer.bexio.com/pat).
The catalog in his account is his real pricing. Treat everything from his
account as live business data.

## The core insight that drives the design

He speaks the prices in the voice note. The catalog is **memory, not source of
truth** — spoken price always wins, and overrides get logged so stored rates
converge on his real ones over time. The tool drafts ~60%; the human finishes
the rest. That split is the product, not a limitation.

## Hard rules — do not cross these

1. **Faithful transcription, never helpful correction.** Compute each line
   exactly as dictated. If lines are mutually inconsistent, flag in
   `review_notes` — never silently reconcile. A wrong number reaching a client
   is the worst failure mode.
2. **Nothing writes to Bexio without human review.** Offers are DRAFT only.
   Contact creation needs explicit confirmation of spelling — never auto-create
   from a transcribed name.
3. **When unsure, flag — don't guess.** Low-confidence match, unclear audio,
   missing unit → `needs_review: true`, surfaced to the user.
4. **Never log, print, or commit the token.** Lives in `.env` (gitignored).
5. **Never commit `.env` or `refs/catalog.json`.** Client business data.
   `.gitignore` covers both — do not weaken it.

## Current state

- Bexio read client built (`src/bexio/`), smoke test passes, catalog snapshot
  in `refs/catalog.json` (24 articles).
- Schema frozen as the parser output contract (`refs/quote-schema.md`).
- Prototype loop **built and wired** (Next.js, `app/`): record or file-upload →
  `/api/quote` → transcribe → extract → compute → cross-line check → editable
  render with live HT/TVA/TTC. Render only, no Bexio write yet.
  - Transcription + extraction run through **OpenRouter** (one key,
    `OPENROUTER_API_KEY` in `.env`): STT = `gpt-4o-transcribe` (FR), extraction
    = `gpt-4o` with strict `json_schema`. Models are env-overridable; defaults
    in `src/llm/client.ts`. Without a key, `/api/quote` falls back to the Amina
    demo fixture (flagged `stubbed` in the UI).
  - **Code owns the numbers**, the LLM owns language only — see BUILD.md "Parse
    contract". Deterministic core in `src/quote/` (evaluator, compute,
    cross-line net, totals), 52 tests.
  - Validated end-to-end on Nicolas's real Amina note: reproduces the worked
    example exactly (TTC 4715.60). Dev scripts: `npm run pipeline <audio>`,
    `npm run extract "<transcript>"`.

## Build order

1. ✅ Bexio read client + smoke test + catalog snapshot.
2. ✅ Prototype loop (see `BUILD.md`): page, transcribe, parse-to-schema, edit —
   wired through OpenRouter, validated on a real note.
3. ▶ Draft-offer write back to Bexio (uses existing `src/bexio/` client). Next.
4. Catalog learning (override log) and second-builder support — later.

## Do NOT build yet

- No Bexio write / draft-offer creation until the loop is proven.
- No auth, no multi-user.
- No conversational clarification loop — clarifications are highlighted,
  editable fields. A form, not a back-and-forth.
- No pattern/prediction logic.

## Notes

- Stack: TypeScript, ESM. Prototype is Next.js on Railway. Supabase available
  but not required yet.
- Bexio API base `https://api.bexio.com`, resources under `/2.0`.
- The PAT expires 6 months after creation. Set a reminder to regenerate.
- `docs/solutions/` — documented learnings from past work (architecture
  patterns, bug fixes, conventions), organized by category with YAML
  frontmatter (`module`, `tags`, `problem_type`). Relevant when implementing
  or debugging in a documented area.
- `CONCEPTS.md` (repo root) — the shared domain vocabulary (Quote, Line,
  Parse contract, …); relevant when orienting to the codebase.
