-- IBAN dropped from the company profile (not needed on the devis for now).
alter table company_profile drop column iban;

-- TVA is no longer dictated in the voice note. It's a per-devis toggle, applied
-- at the Swiss standard rate when the issuer is VAT-registered (vat_number set).
alter table quotes add column tva_applicable boolean not null default true;