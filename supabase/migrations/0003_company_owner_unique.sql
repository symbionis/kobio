-- One company profile per owner. Lets saveCompany upsert on owner_id directly
-- (no read-then-write race) and prevents a double-insert from a concurrent save.
alter table company_profile add constraint company_profile_owner_unique unique (owner_id);
