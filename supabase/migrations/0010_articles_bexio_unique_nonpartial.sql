-- The partial unique index from 0009 can't act as an ON CONFLICT arbiter for the
-- seed upsert (PostgREST can't supply the index predicate). Replace it with a
-- plain unique index: with NULLS DISTINCT (the default), multiple null
-- bexio_article_id rows per owner are still allowed (future Kobio-created
-- articles), while non-null bexio ids stay unique per owner — so the snapshot
-- seed remains idempotent via onConflict (owner_id, bexio_article_id).
drop index if exists articles_owner_bexio_uniq;
create unique index articles_owner_bexio_uniq on articles (owner_id, bexio_article_id);
