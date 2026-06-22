-- Per-devis discount (remise).
--
-- A quote can carry an optional discount applied to HT before TVA: either a
-- percentage of HT or a flat CHF amount. Stored as jsonb { kind, value } where
-- kind is 'percent' | 'fixed'; NULL means no discount.
--
-- Additive and nullable — existing quotes keep their totals (NULL = no remise).
-- RLS already scopes the quotes table by owner_id, so no policy change is needed.

alter table quotes
  add column discount jsonb;
