-- The person operating the account (distinct from the company name). Used to
-- personalise messages — e.g. the feedback confirmation greets by first name.
alter table company_profile add column if not exists first_name text;
alter table company_profile add column if not exists last_name text;
