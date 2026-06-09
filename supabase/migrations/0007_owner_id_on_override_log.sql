-- override_log gains owner_id so it carries the same uniform RLS policy as every
-- other owner-scoped table (rather than a parent-join subquery). Sourced from the
-- parent quote's owner. Existing rows backfill from quotes; the column is then
-- NOT NULL. (The log was empty at migration time, so the backfill is a no-op.)
alter table override_log add column owner_id uuid;

update override_log o
set owner_id = q.owner_id
from quotes q
where q.id = o.quote_id;

alter table override_log alter column owner_id set not null;
