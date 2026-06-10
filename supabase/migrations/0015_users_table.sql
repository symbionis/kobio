-- The person operating the account: first-class `users`, distinct from the
-- company. 1:1 with the auth user today; a nullable company_id (and the
-- companies table) come in a later slice. Email/phone are person-level — they
-- move off company_profile here.

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Own-row access. Inserts are owned by the trigger (security definer), not
-- clients — so there is no insert policy.
create policy "users_select_own" on public.users
  for select using (id = auth.uid());
create policy "users_update_own" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Auto-provision a users row at signup and keep its email in sync with auth.
-- SECURITY DEFINER so it can write public.users from the auth schema.
create or replace function public.handle_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.users (id, email)
    values (new.id, new.email)
    on conflict (id) do update set email = excluded.email;
  elsif tg_op = 'UPDATE' then
    update public.users set email = new.email, updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user();

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_auth_user();

-- Backfill: a row per existing auth user, email seeded from auth.
insert into public.users (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- Move the person fields off company_profile onto the matching user. Seed the
-- person's phone from the company phone (don't wipe it).
update public.users u
set first_name = c.first_name,
    last_name = c.last_name,
    phone = coalesce(u.phone, c.phone)
from public.company_profile c
where c.owner_id = u.id;

-- first/last name are person-level now (added in 0014, removed here). The
-- company email/phone columns are kept (unused) to avoid a destructive drop.
alter table public.company_profile drop column if exists first_name;
alter table public.company_profile drop column if exists last_name;
