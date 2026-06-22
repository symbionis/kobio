-- General terms & conditions (conditions générales / CGV).
--
-- The builder stores their terms once on the company profile; they render on
-- every devis PDF. A single free-text blob per owner, alongside the other
-- profile fields (vat_number, vat_rates, …). NULL/empty = no terms shown.
--
-- Additive and nullable — existing profiles are unaffected. RLS already scopes
-- company_profile by owner_id, so no policy change is needed.

alter table company_profile
  add column cgv_text text;
