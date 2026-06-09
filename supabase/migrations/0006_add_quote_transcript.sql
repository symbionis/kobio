-- Persist the source voice transcript with each quote so it can be re-edited
-- and reprocessed from the saved-quote screen (not just in the create session).
-- Nullable + additive: existing rows and older app builds are unaffected.
alter table quotes add column transcript text;
