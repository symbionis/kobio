-- The editor surfaces the parsed spoken contact; persist it so a reopened quote
-- keeps it. Distinct from the attached client_id (the real, manageable client).
alter table quotes add column contact jsonb not null default '{}'::jsonb;
