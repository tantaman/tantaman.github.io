-- Drop the legacy post table. Its rows were backfilled into document by
-- migration 0043, and all code paths now read/write document instead.
DROP TABLE post;
