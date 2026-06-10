-- Harden the users-table email invariant at the DB layer. RLS is row-level, so
-- `users_update_own` (0015) lets a client PATCH any of their own columns —
-- including `email`, which is meant to be auth-owned and synced down by the
-- trigger only. saveUser never writes email, but nothing stopped a direct REST
-- call from desyncing users.email from auth.users.email. Two guards:
--
-- 1. Column-level UPDATE: a blanket table-level GRANT UPDATE (Supabase's default
--    for anon/authenticated) implicitly covers every column, so a column-level
--    revoke alone is a no-op. Revoke the table-level UPDATE, then re-grant UPDATE
--    only on the person-editable columns. email is intentionally excluded — the
--    SECURITY DEFINER trigger (handle_auth_user) still writes it as table owner.
-- 2. Scope both policies to `authenticated`, matching every other table (0008).

revoke update on public.users from authenticated, anon;
grant update (first_name, last_name, phone, updated_at) on public.users to authenticated;

drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_update_own" on public.users;

create policy "users_select_own" on public.users
  for select to authenticated using (id = auth.uid());
create policy "users_update_own" on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
