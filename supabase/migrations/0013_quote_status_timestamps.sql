-- Capture when a devis was marked Envoyé and Validé, so the dates can be shown
-- in the editor and the lists. Historical rows stay null (no reliable time).
alter table quotes add column if not exists sent_at timestamptz;
alter table quotes add column if not exists accepted_at timestamptz;
