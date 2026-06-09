-- Richer company profile and client, aligned to the fields a devis needs and to
-- Bexio's contact / company_profile shapes (domain-named here; the adaptor maps
-- name → name_1, email → mail, phone → phone_fixed, country → country_id, etc.).
alter table clients
  add column postcode text,
  add column city text,
  add column country text,
  add column email text,
  add column phone text;

-- The issuer block on the devis: address, contact, VAT, IBAN. Logo lives in the
-- existing logo_ref column (stored as a base64 data URL for now).
alter table company_profile
  add column postcode text,
  add column city text,
  add column country text,
  add column email text,
  add column phone text,
  add column iban text;
