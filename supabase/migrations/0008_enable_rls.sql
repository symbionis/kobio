-- Per-owner Row Level Security. RLS was already ENABLED on these tables (migration
-- 0001) with no policies — which denies every non-service-role connection. This
-- adds the policies so the request-scoped user client can read/write only its own
-- rows (owner_id = auth.uid()). The service-role admin client bypasses RLS, so
-- seed/backfill scripts are unaffected. auth.uid() is wrapped in a SELECT so the
-- planner caches it per statement.

-- company_profile
create policy "owner_select" on company_profile for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owner_insert" on company_profile for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "owner_update" on company_profile for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owner_delete" on company_profile for delete to authenticated using ((select auth.uid()) = owner_id);

-- clients
create policy "owner_select" on clients for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owner_insert" on clients for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "owner_update" on clients for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owner_delete" on clients for delete to authenticated using ((select auth.uid()) = owner_id);

-- quotes
create policy "owner_select" on quotes for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owner_insert" on quotes for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "owner_update" on quotes for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owner_delete" on quotes for delete to authenticated using ((select auth.uid()) = owner_id);

-- override_log
create policy "owner_select" on override_log for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owner_insert" on override_log for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "owner_update" on override_log for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owner_delete" on override_log for delete to authenticated using ((select auth.uid()) = owner_id);
