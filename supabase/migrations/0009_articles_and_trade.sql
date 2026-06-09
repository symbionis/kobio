-- Per-owner product catalog. Replaces refs/catalog.json as the runtime store
-- (the snapshot demotes to a seed source). bexio_article_id is reserved for the
-- future Bexio import; the partial unique index makes the seed idempotent.
create table articles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  bexio_article_id integer,
  code text,
  name text not null,
  price numeric,
  unit text,
  trade text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table articles enable row level security;
create policy "owner_select" on articles for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owner_insert" on articles for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "owner_update" on articles for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owner_delete" on articles for delete to authenticated using ((select auth.uid()) = owner_id);

create unique index articles_owner_bexio_uniq on articles (owner_id, bexio_article_id)
  where bexio_article_id is not null;
create index articles_owner_trade_idx on articles (owner_id, trade);

-- One trade per builder (no multi-trade), plus the trade active at dictation.
alter table company_profile add column trade text;
alter table quotes add column trade text;
