-- Foundation slice: provider-agnostic core (company, clients, quotes) + override log.
--
-- Single-owner for now: every row carries owner_id (a constant today) so
-- multi-tenant can later swap in real per-user ids with no schema change.
--
-- RLS is enabled on every table with NO policies, which denies the anon and
-- authenticated roles by default. The server uses the service-role key, which
-- bypasses RLS — so server-side access works while the keys that could reach a
-- browser cannot. Real per-owner policies arrive with the accounts slice.

create table company_profile (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  address text,
  vat_number text,
  logo_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  client_id uuid references clients (id) on delete set null,
  title text not null,
  tax_rate_default numeric not null,
  -- The frozen parse-contract shape (refs/quote-schema.md) is stored verbatim as
  -- JSON; the adaptor maps it to provider positions at sync time.
  lines jsonb not null,
  review_notes jsonb not null default '[]'::jsonb,
  -- status is derived (deriveStatus) from line flags + this manual marker.
  sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table override_log (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes (id) on delete cascade,
  line_index int not null,
  spoken_rate numeric not null,
  candidate_price numeric not null,
  created_at timestamptz not null default now()
);

create index clients_owner_idx on clients (owner_id);
create index quotes_owner_idx on quotes (owner_id);
create index override_log_quote_idx on override_log (quote_id);

alter table company_profile enable row level security;
alter table clients enable row level security;
alter table quotes enable row level security;
alter table override_log enable row level security;
