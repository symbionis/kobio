---
title: supabase-js upsert onConflict can't use a partial unique index
date: 2026-06-09
category: docs/solutions/database-issues
module: catalog / articles persistence (Supabase Postgres)
problem_type: database_issue
component: database
symptoms:
  - "supabase-js .upsert(rows, { onConflict: 'owner_id,bexio_article_id' }) errors: no unique or exclusion constraint matching the ON CONFLICT specification (Postgres 42P10)"
  - "An 'idempotent' seed degrades to plain INSERT and duplicates rows on re-run"
root_cause: config_error
resolution_type: migration
severity: medium
tags: [supabase, postgres, upsert, on-conflict, partial-index, unique-index, seed]
---

# supabase-js upsert onConflict can't use a partial unique index

## Problem
A seed used `supabase.from(t).upsert(rows, { onConflict: "owner_id,bexio_article_id" })` to stay idempotent, backed by a **partial** unique index (`… where bexio_article_id is not null`). The upsert can't use that index as its conflict arbiter, so it errors (or silently degrades to an insert that duplicates on re-run).

## Symptoms
- Upsert fails with Postgres `42P10`: *"there is no unique or exclusion constraint matching the ON CONFLICT specification."*
- The seed that was supposed to be idempotent instead inserts duplicate rows when run a second time.

## What Didn't Work
- Passing `onConflict: "owner_id,bexio_article_id"` against the **partial** unique index. Postgres only matches a partial index as an `ON CONFLICT` arbiter when the statement repeats the index's predicate (`ON CONFLICT (cols) WHERE bexio_article_id IS NOT NULL`). PostgREST / supabase-js give you no way to add that `WHERE`, so the arbiter is never matched.

## Solution
Replace the partial unique index with a plain (non-partial) unique index on the same columns:

```sql
-- migration: swap partial → non-partial so onConflict can use it as arbiter
drop index if exists articles_owner_bexio_uniq;
create unique index articles_owner_bexio_uniq on articles (owner_id, bexio_article_id);
```

```ts
// now resolves the arbiter and is genuinely idempotent
await supabase
  .from("articles")
  .upsert(rows, { onConflict: "owner_id,bexio_article_id" });
```

## Why This Works
Postgres infers a partial index as the conflict target **only** if the `INSERT … ON CONFLICT` includes a `WHERE` clause matching the index predicate. supabase-js emits `ON CONFLICT (cols) DO UPDATE` with no predicate, so a partial index can't be inferred → `42P10`. A non-partial unique index needs no predicate and is a valid arbiter. Crucially, with `NULLS DISTINCT` (the Postgres default), a plain unique index on `(owner_id, bexio_article_id)` still allows **multiple NULL** `bexio_article_id` rows per owner — so the original reason for going partial (don't collide future Kobio-created articles that have no Bexio id) is preserved, while non-null Bexio ids stay unique.

## Prevention
- If you rely on supabase-js `upsert({ onConflict })`, back it with a **non-partial** unique constraint/index. Reserve partial indexes for code paths where you write the raw SQL and can supply the predicate.
- Don't reach for a partial index just to "allow NULL duplicates" — the default `NULLS DISTINCT` on a plain unique index already permits many NULLs.
- If null-keyed rows genuinely need de-duplication, key idempotency on an always-present column (a natural key) rather than the nullable one.

## Related Issues
- `supabase/migrations/0009_articles_and_trade.sql` (introduced the partial index) and `0010_articles_bexio_unique_nonpartial.sql` (the fix).
- `src/db/seed.ts` — the idempotent snapshot seed that depends on this arbiter.
