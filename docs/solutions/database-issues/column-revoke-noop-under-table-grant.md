---
title: Column-level REVOKE is a silent no-op under a table-level GRANT
date: 2026-06-10
category: docs/solutions/database-issues
module: users table hardening (Supabase Postgres / RLS column privileges)
problem_type: database_issue
component: database
symptoms:
  - "`revoke update (email) on public.users from authenticated, anon;` runs without error but is a silent no-op — `authenticated` keeps UPDATE on `email`"
  - "An RLS row policy (`id = auth.uid()`) still lets a client `UPDATE users SET email=... WHERE id=auth.uid()` — RLS is row-level and cannot restrict a single column"
  - "`information_schema.column_privileges` shows the privilege was never actually removed after the column-level REVOKE"
root_cause: config_error
resolution_type: migration
severity: high
tags: [supabase, postgres, rls, grant, revoke, column-privileges, security, information-schema]
---

# Column-level REVOKE is a silent no-op under a table-level GRANT

## Problem
Hardening a Supabase `users` table so a client can never write the auth-owned
`email` column. RLS was enabled with `users_update_own (id = auth.uid())`, and
`email` is synced from `auth.users` by a `SECURITY DEFINER` trigger. The obvious
guard — a column-level `REVOKE UPDATE (email)` — ran cleanly but did nothing:
the column stayed client-writable.

## Symptoms
- `revoke update (email) on public.users from authenticated, anon;` succeeds
  with no error, yet `authenticated` still holds UPDATE on `email`.
- RLS does not save you: a row policy gates **which rows**, not **which
  columns**. A user passing `id = auth.uid()` can still `PATCH /rest/v1/users`
  with `{ "email": "spoofed@evil.com" }` and desync `users.email` from
  `auth.users.email`.
- `information_schema.column_privileges` confirms the REVOKE removed nothing.

## What Didn't Work
```sql
-- silent no-op: cannot carve a column out of a table-level grant
revoke update (email) on public.users from authenticated, anon;
```
Supabase grants a **table-level** `GRANT UPDATE ON public.users TO anon,
authenticated` by default, and a table-level UPDATE privilege implicitly covers
every column. Postgres keeps table and column privileges as separate grants —
a column-level REVOKE does not subtract from the broader table grant, so the
table grant keeps authorizing writes to `email`. The revoke targeted a
column-grant that was never the thing permitting the write.

## Solution
Revoke the blanket table-level UPDATE, then re-grant column-level UPDATE on only
the editable columns (`email` deliberately excluded):

```sql
-- migration 0016: drop the blanket grant, re-grant only the editable columns
revoke update on public.users from authenticated, anon;
grant update (first_name, last_name, phone, updated_at)
  on public.users to authenticated;
```

Verify — a clean migration run is **not** proof the restriction took effect:

```sql
select grantee, column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'users'
  and grantee in ('authenticated', 'anon')
  and privilege_type = 'UPDATE'
order by grantee, column_name;
```

After the fix this returns only `first_name, last_name, phone, updated_at` for
`authenticated`, and nothing for `anon`. `email`, `id`, and `created_at` are no
longer client-updatable.

## Why This Works
RLS and GRANTs are two independent layers: RLS decides **which rows**, GRANTs
decide **which columns and operations**. Dropping the table-level grant removes
the wildcard that was authorizing every column; the explicit per-column re-grant
then whitelists exactly the editable fields. The `SECURITY DEFINER` trigger
still writes `email` because it runs as the **table owner** (`postgres`), whose
privileges are untouched by client-role grants. Revoking from `anon` as well
(which RLS would already block) is cheap defense-in-depth.

This composes into three independent guards on `email`:
1. **Compile-time** — `SaveUserInput` (`src/db/users.ts`) has no `email` field,
   so the app's `saveUser` cannot express the write.
2. **DB privilege** — clients hold UPDATE only on the four editable columns.
3. **Single writer** — the `SECURITY DEFINER` trigger is the only thing that
   writes `users.email`.

## Prevention
- To restrict columns on a Supabase table, **revoke the table-level privilege
  and re-grant explicit columns** — never expect a column-level `REVOKE` to
  carve a hole out of a table grant.
- **Always verify** with `information_schema.column_privileges` after such a
  migration; the failure mode here is a silent success, not an error.
- Any trigger/function that must still write the locked column has to be
  `SECURITY DEFINER` and owned by a role (e.g. `postgres`) that keeps the
  table-level grant — client-role revokes don't touch it.
- Applies to any column clients must not write: auth-synced mirrors (`email`,
  verified flags), computed/denormalized columns, audit fields (`created_at`),
  and ownership keys (`id`, `owner_id`).

## Related Issues
- `supabase/migrations/0016_users_email_guard.sql` (the fix) and
  `supabase/migrations/0015_users_table.sql` (the table + RLS + trigger it
  hardens). `src/db/users.ts` — `saveUser`, which writes only the four editable
  columns.
- See also `docs/solutions/database-issues/supabase-upsert-onconflict-needs-nonpartial-index.md`
  — another silent-DDL Supabase gotcha fixed at the schema layer via migration.
- Related auth/email surface:
  `docs/solutions/integration-issues/supabase-email-otp-magic-link-not-code.md`
  — how the auth `email` is verified (this doc protects the synced `email`
  column).
