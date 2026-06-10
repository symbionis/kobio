-- Devis lifecycle gains an "accepted/validé" step after Envoyé: the builder
-- marks that the client validated the offer.
alter table quotes
  add column if not exists accepted boolean not null default false;
