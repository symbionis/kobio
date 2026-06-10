-- Configurable VAT (TVA) rates.
--
-- Until now the rate was hardcoded (8.1%) and a quote only carried a boolean
-- `tva_applicable`. Builders can have several rates depending on the work
-- (e.g. 8.1% standard, 2.6% réduit, 3.8% hébergement). So:
--   * company_profile gains `vat_rates` — the builder's configurable list,
--     each entry { label, rate }. Empty by default.
--   * quotes gain `vat_rate` — the single rate chosen for that devis, or NULL
--     for "Aucune" (no VAT). Backfilled from the old boolean so existing
--     quotes keep their totals.
--
-- `tva_applicable` is kept (no drop) and stays in sync on save, so any path
-- still reading it keeps working during the transition.

alter table company_profile
  add column vat_rates jsonb not null default '[]'::jsonb;

alter table quotes
  add column vat_rate numeric;

-- Existing quotes: VAT on → the standard 8.1% rate; VAT off → NULL (Aucune).
update quotes set vat_rate = 8.1 where tva_applicable = true;
