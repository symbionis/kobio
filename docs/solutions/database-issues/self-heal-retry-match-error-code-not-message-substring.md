---
title: Self-healing DB save matched a column by error-message substring, silently dropping user data
date: 2026-06-22
category: docs/solutions/database-issues
module: quotes persistence (Supabase / PostgREST column self-heal)
problem_type: database_issue
component: database
symptoms:
  - "`saveQuote` retried on any PostgREST error whose message merely contained `discount` or `transcript`, not only the missing-column case it was meant for"
  - "On retry the save re-upserts a row that omits the `discount` column, so a builder's remise is silently dropped and the save still returns 200 — a higher TTC reaches the client"
  - "Invisible to the user: autosave shows `Enregistré`, and the next read returns `discount = NULL`"
root_cause: logic_error
resolution_type: code_fix
severity: high
tags: [supabase, postgrest, error-handling, silent-failure, self-heal, data-integrity]
---

# Self-healing DB save matched a column by error-message substring, silently dropping user data

## Problem
A persistence "self-heal" retry — meant to let a save succeed against a database
that hasn't had a new column's migration applied yet — was triggered by
substring-matching the error **message**. Because the matched token (`discount`)
is also user-facing column/value data, an unrelated error could trip the retry,
which re-saves a row **without** the discount and returns success. The builder's
remise silently vanishes and a wrong (higher) total reaches the client.

## Symptoms
- The retry condition `/transcript|discount/i.test(error.message)` fires on *any*
  PostgREST error mentioning those words — a check-constraint violation, a jsonb
  coercion error, an RLS message — not just "column does not exist".
- The retry upserts a `base` row that omits `discount`; on an existing row the
  column is left untouched (a just-edited/removed discount fails to persist), and
  the call returns `{ id }` with no throw.
- No log, no error surfaced. Autosave reports success; the discount reads back as
  `NULL` on the next load. The client receives a quote with a higher TTC than the
  builder set — the project's stated worst failure mode (a wrong number reaching
  a client).

## What Didn't Work
The feature's first pass used a message substring match, modeled on an existing
`transcript` self-heal:

```ts
// BEFORE — substring match on free-text error message
let { data, error } = await scope.supabase.from("quotes").upsert(row).select().single();
if (error && /transcript|discount/i.test(error.message)) {
  ({ data, error } = await scope.supabase.from("quotes").upsert(base).select().single());
}
```

It passed every test and worked in the happy path (column genuinely missing
pre-migration). But it is wrong for two compounding reasons:
1. **The trigger is unstable free text.** Error messages are localized and can
   echo user data; the column name `discount` appears in value-level errors and
   constraint names that have nothing to do with a missing column.
2. **Once the migration exists, the intended trigger never fires** — so almost
   any future firing is a false positive that discards real data, and a silent
   one because the function returns success.

## Solution
Branch on the structured error **code**, not the message, and log when the
degraded retry runs so a real firing is discoverable.

```ts
// AFTER — match the missing-column condition by code, and log
let { data, error } = await scope.supabase.from("quotes").upsert(row).select().single();
// PGRST204 = PostgREST schema-cache column-not-found; 42703 = Postgres undefined_column.
// A value-level error mentioning "discount" can't produce these, so it won't trip the retry.
if (error && (error.code === "PGRST204" || error.code === "42703")) {
  console.warn(`saveQuote: optional column missing, retrying without transcript/discount — ${error.message}`);
  ({ data, error } = await scope.supabase.from("quotes").upsert(base).select().single());
}
if (error) throw new Error(`saveQuote failed: ${error.message}`);
```

Two tests pin both directions (`src/db/quotes.test.ts`): the retry **fires** on a
`PGRST204` and still saves (dropping the optional column), and it does **not**
fire on an unrelated `23514` check-constraint error that merely mentions
`discount` — that case throws loudly instead.

## Why This Works
PostgREST/Postgres return a stable, structured `code` alongside the human
message. `PGRST204` (schema cache can't find the column) and `42703`
(`undefined_column`) are *exactly* the missing-column condition the self-heal
targets, and they cannot be produced by a value-level failure. Keying on the code
makes the trigger immune to whatever words happen to be in the message — including
the column name itself. The `console.warn` turns a silent degrade into a visible
event, so the rare legitimate firing (or an unexpected one) is found in logs
rather than via a client's surprised email about the total.

## Prevention
- **Classify DB errors by structured `code`, never by `message` substring.**
  Messages are localized, change across versions, and can contain user data.
- **Be especially wary when the token you'd match is also user data** — a column
  name, a constraint name, a value. Substring matching then has a direct
  silent-data-loss path.
- **A self-heal that degrades the write (drops a column, skips a field) must be
  loud.** Log it. A degrade that returns success silently is indistinguishable
  from a clean save until data goes missing.
- **Test the retry in both directions:** it fires (and still saves) on the
  missing-column code, and it does *not* fire on an unrelated error that mentions
  the column.
- **Sibling fix, same review and theme — validate untrusted values at the
  boundary.** The discount (`{ kind, value }`) was also trusted verbatim from the
  request body into the jsonb column and the totals math; a `NaN` slipped the
  `value <= 0` guard (`NaN <= 0` is false) and poisoned HT/TVA/TTC. Fixed with a
  `normalizeDiscount()` at the PUT route (reject unknown kind / non-finite /
  non-positive, clamp percent 0..100) and a `Number.isFinite` guard in
  `discountAmount`. Validate untrusted input where it enters the persistence path,
  not only where it is displayed.

## Related Issues
- `docs/solutions/database-issues/column-revoke-noop-under-table-grant.md` — another silent no-op in Supabase persistence (a DDL that runs without error but does nothing).
- `docs/solutions/architecture-patterns/code-owns-determinism-llm-owns-language.md` — the project rule this bug violates: a wrong number reaching a client is the worst failure mode.
- PR #2 (`symbionis/kobio`), review-fix commit `660412c`.
